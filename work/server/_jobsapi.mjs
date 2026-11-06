/* Job queue: storage, routes and connector tools (roadmap E17). The rules are in _jobs.mjs. api.mjs calls installJobs(deps) once, with its own helpers.
   Jobs live in the collection jb.<project> (not a record kind, so a customer can never list them). The team writes jobs with the page; Claude reads them with the connector tool project_jobs
   (actions list, claim, finish), running AS the person with the person's project access. Nothing here calls Claude or Microsoft: the person's own Claude does the work.
   Routes (project edit access, team only): GET and POST /api/projects/:id/jobs, POST .../jobs/:jid/cancel and .../jobs/:jid/answer. */
import { OPEN, LIMITS, KINDS, cleanRequest, newJob, step, brief, leaseExpired } from './_jobs.mjs';

export function installJobs(d) {
  const { route, ok, HttpError, me, projectAccess, pickProject, dbGet, dbPut, dbList, withLock, audit, CONNECTOR, rid, CTX } = d;
  const col = pid => 'jb.' + pid, JID = /^jb_[0-9a-f]{18}$/;
  /** team members with edit access only: customers and viewers are refused */
  async function access(s, pid) { const a = await projectAccess(s, pid, 'edit'); if (a.role === 'customer') throw new HttpError(403, 'The job queue is for the project team'); return a; }
  const wrap = fn => { try { return fn(); } catch (e) { if (e && e.status) throw new HttpError(e.status, e.message); throw e; } };
  const all = async pid => (await dbList(col(pid))).map(r => r.value).filter(r => r && r.id);
  /** a claimed job whose lease ran out goes back to waiting (stored, so every reader sees the same) */
  async function fresh(pid, j) { const now = new Date().toISOString(); if (!leaseExpired(j, now)) return j; return withLock(col(pid) + '.' + j.id, async () => { const cur = (await dbGet(col(pid), j.id)).value; const nx = step(cur, 'expire', 'system', now); if (nx !== cur && nx.status !== cur.status) await dbPut(col(pid), j.id, nx); return nx; }); }
  const view = j => ({ id: j.id, kind: j.kind, label: KINDS[j.kind] ? KINDS[j.kind].label : j.kind, params: j.params, status: j.status, requestedBy: j.requestedBy, requestedAt: j.requestedAt, claimedBy: j.claimedBy, leaseUntil: j.leaseUntil, result: j.result, finishedAt: j.finishedAt, claimedAt: j.claimedAt, progress: j.progress || null, activity: j.activity || [], stage: (KINDS[j.kind] || {}).stage || 'other' });
  const mine = async (pid, id) => { if (!JID.test(String(id))) throw new HttpError(404, 'Job not found'); const r = await dbGet(col(pid), id); if (!r || !r.value) throw new HttpError(404, 'Job not found'); return fresh(pid, r.value); };
  const change = (s, pid, id, ev, data, auditText) => withLock(col(pid) + '.' + id, async () => {
    const cur = (await dbGet(col(pid), id)); if (!cur || !cur.value) throw new HttpError(404, 'Job not found'); const now = new Date().toISOString();
    const base = step(cur.value, 'expire', 'system', now); const nx = wrap(() => step(base, ev, s.email, now, data)); await dbPut(col(pid), id, nx); if (auditText) await audit(pid, s.id, auditText, id + ' ' + nx.kind + ' ' + nx.status); return nx;
  });

  const ops = {
    async list(s, pid, status, stage) {
      await access(s, pid); const rows = []; for (const j of await all(pid)) rows.push(await fresh(pid, j)); const want = status === 'all' ? null : status && !OPEN.includes(status) ? [status] : OPEN;
      const out = rows.filter(j => (!stage || (KINDS[j.kind] || {}).stage === stage) && (!want || want.includes(j.status))).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt))).slice(0, 100);
      return { jobs: out.map(view), open: rows.filter(j => OPEN.includes(j.status)).length, kinds: Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.label])) };
    },
    /** one job per identical open request; a second click returns the job already waiting */
    async create(s, pid, raw) {
      await access(s, pid); const c = cleanRequest(raw); if (!c.ok) throw new HttpError(400, c.error);
      return withLock(col(pid) + '.create', async () => {
        const rows = []; for (const j of await all(pid)) rows.push(await fresh(pid, j)); const dup = rows.find(j => OPEN.includes(j.status) && j.key === c.key); if (dup) return { job: view(dup), duplicate: true };
        if (rows.filter(j => OPEN.includes(j.status)).length >= LIMITS.open) throw new HttpError(409, 'This project already has ' + LIMITS.open + ' open jobs. Finish or cancel some first.');
        const j = newJob(rid('jb'), c, s.email, new Date().toISOString()); await dbPut(col(pid), j.id, j); await audit(pid, s.id, 'job-requested', j.id + ' ' + j.kind); return { job: view(j), duplicate: false };
      });
    },
    async claim(s, pid, id) { await access(s, pid); await mine(pid, id); const j = await change(s, pid, id, 'claim', {}, 'job-claimed'); return j; },
    async finish(s, pid, id, data) { await access(s, pid); await mine(pid, id); return change(s, pid, id, 'finish', data || {}, 'job-finished'); },
    async progress(s, pid, id, text) { await access(s, pid); await mine(pid, id); return change(s, pid, id, 'progress', { text }, ''); },   // no audit line: it is only a status note
    async cancel(s, pid, id) { await access(s, pid); await mine(pid, id); return change(s, pid, id, 'cancel', {}, 'job-cancelled'); },
    async answer(s, pid, id, answers) { await access(s, pid); await mine(pid, id); return change(s, pid, id, 'answer', { answers }, 'job-answered'); }
  };

  const P = '/api/projects/:id/jobs';
  route('GET', P, async (b, G, q) => { const s = await me(); return ok(await ops.list(s, G.id, String(q.get('status') || ''), String(q.get('stage') || ''))); });
  route('POST', P, async (b, G) => { const s = await me(); const r = await ops.create(s, G.id, b); return ok(r, r.duplicate ? 200 : 201); });
  route('POST', P + '/:jid/cancel', async (b, G) => { const s = await me(); return ok({ job: view(await ops.cancel(s, G.id, G.jid)) }); });
  route('POST', P + '/:jid/answer', async (b, G) => { const s = await me(); return ok({ job: view(await ops.answer(s, G.id, G.jid, b && b.answers)) }); });

  // ---------- Claude connector tools (public entry: project_jobs, with an action) ----------
  const tools = {
    async jobs_list(s, b) { const p = await pickProject(s, b.project); const r = await ops.list(s, p.id, String(b.status || ''), String(b.stage || '').toLowerCase()); return { project: p.name, projectId: p.id, open: r.open, jobs: r.jobs, note: 'Claim one with action claim and its id. Only waiting jobs can be claimed.' }; },
    async jobs_claim(s, b) { const p = await pickProject(s, b.project); const j = await ops.claim(s, p.id, String(b.id || '')); return brief(j, { id: p.id, name: p.name, customer: p.customer || '' }); },
    async jobs_file_urls(s, b) {
      const p = await pickProject(s, b.project); await access(s, p.id); const r = await dbGet('fl.' + p.id, String(b.fileId || '')); const f = r && r.value; if (!f || f.deletedAt || f.status !== 'ready') throw new HttpError(404, 'That project file was not found');
      if (f.category !== 'config_package') throw new HttpError(403, 'Only an org package file can be fetched this way'); const parts = []; for (const id of (f.urls || [])) { const u = await CTX.files.url(id, { private: true, expires: 3600 }); parts.push(u.url); }
      await audit(p.id, s.id, 'package-fetched', f.name); return { name: f.name, size: f.size, mime: f.mime, parts, note: 'Download every part in order and join them (cat part1 part2 > package.zip). A file with one part needs no joining. The links last one hour.' };
    },
    async jobs_progress(s, b) { const p = await pickProject(s, b.project); const j = await ops.progress(s, p.id, String(b.id || ''), b.summary); return { job: view(j), note: 'Shown to the person in Delivery Studio. Keep going.' }; },
    async jobs_finish(s, b) {
      const p = await pickProject(s, b.project); const j = await ops.finish(s, p.id, String(b.id || ''), { status: b.status, summary: b.summary, transferId: b.transferId, questions: b.questions });
      return { job: view(j), note: j.status === 'needs_input' ? 'The questions are shown to the person in Delivery Studio; the job waits for their answer.' : 'Recorded. Anything you stored as a transfer waits for a person to approve it in Delivery Studio.' };
    }
  };
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { ops };
}
