/* Job queue: storage, routes and connector tools (roadmap E17). The rules are in _jobs.mjs. api.mjs calls installJobs(deps) once, with its own helpers.
   Jobs live in the collection jb.<project> (not a record kind, so a customer can never list them). The team writes jobs with the page; Claude reads them with the connector tool project_jobs
   (actions list, claim, finish), running AS the person with the person's project access. Nothing here calls Claude or Microsoft: the person's own Claude does the work.
   Routes (project edit access, team only): GET and POST /api/projects/:id/jobs, POST .../jobs/:jid/cancel and .../jobs/:jid/answer. */
import { lead } from './_notify.mjs';
import { OPEN, LIMITS, KINDS, cleanRequest, newJob, step, brief, leaseExpired } from './_jobs.mjs';

import { hashOf } from './_notify.mjs';
import { canTake, status as helperStatus, words as helperWords, cleanUsage, mergeUsage, usageDue, cleanSkills } from './_helper.mjs';
export function installJobs(d) {
  const { route, ok, HttpError, me, projectAccess, pickProject, dbGet, dbPut, dbList, withLock, audit, CONNECTOR, rid, CTX } = d; const notify = d.notify || (async () => 0);
  const col = pid => 'jb.' + pid, JID = /^jb_[0-9a-f]{18}$/;
  /** team members with edit access only: customers and viewers are refused */
  async function access(s, pid) { const a = await projectAccess(s, pid, 'edit'); if (a.role === 'customer') throw new HttpError(403, 'The job queue is for the project team'); return a; }
  // every time a Claude checks the queue the server notes who and when (at most once a minute per person): the Studio shows whether a Claude is running, and the morning brief knows a helper is about
  const beat = async (s, b) => { try { const k = hashOf(s.email); const cur = await dbGet('hb', k); const sk = cleanSkills(b && b.skills); const was = (cur && cur.value && cur.value.skills) || []; const changed = sk.length && JSON.stringify(sk) !== JSON.stringify(was); if (cur && cur.value && Date.now() - Date.parse(cur.value.at) < 60000 && !changed) return; await dbPut('hb', k, { at: new Date().toISOString(), email: String(s.email || '').toLowerCase(), name: s.name || '', skills: sk.length ? sk : was }); } catch (e) { /* the check never fails the tool */ } };
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
    async claim(s, pid, id) { await access(s, pid); const j0 = await mine(pid, id); if (!canTake(j0.kind, j0.requestedBy, s.email)) throw new HttpError(403, 'This request reads the personal mailbox or drive of ' + j0.requestedBy + ', so only their own Claude can take it.'); const j = await change(s, pid, id, 'claim', {}, 'job-claimed'); return j; },
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
  // how much the Claude queue was used: jobs per kind per day over the last 14 days, across the projects the caller can read
  // is a Claude running for this project? the team's latest check-ins, for the light in the top bar and the waiting-request line
  route('GET', '/api/projects/:id/helper', async (b, G) => {
    const s = await me(); const { project, role } = await projectAccess(s, G.id, 'read'); if (role === 'customer') throw new HttpError(403, 'Not permitted');
    const team = (project.members || []).filter(m => m.role !== 'customer' && m.email).slice(0, 30); const beats = await Promise.all(team.map(async m => { const r = await dbGet('hb', hashOf(m.email)); return { email: m.email, name: m.name, at: (r && r.value && r.value.at) || '', skills: (r && r.value && r.value.skills) || [] }; }));
    const st = helperStatus(beats, Date.now()); const mine = beats.find(x => String(x.email).toLowerCase() === String(s.email || '').toLowerCase()); let waiting = 0; try { waiting = (await ops.list(s, G.id, 'waiting', '')).jobs.length; } catch (e) { }
    return ok(Object.assign({}, st, helperWords(st), { waiting, mineAt: (mine && mine.at) || '', skills: mine && mine.skills && mine.skills.length ? mine.skills : null }));
  });
  route('GET', '/api/jobs/usage', async () => { const s = await me(); const ps = d.readableProjects ? await d.readableProjects(s) : []; const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10); const byDay = {}, byKind = {}; let total = 0;
    for (const p of ps.slice(0, 50)) { for (const j of await all(p.id)) { const day = String(j.requestedAt || '').slice(0, 10); if (!day || day < since) continue; total++; byKind[j.kind] = (byKind[j.kind] || 0) + 1; (byDay[day] = byDay[day] || {})[j.kind] = ((byDay[day] || {})[j.kind] || 0) + 1; } }
    return ok({ since, total, byKind, byDay }); });
  const tools = {
    // no project given: the waiting jobs of every project the person can open, in ONE call (an idle check costs one tool call); kind narrows it (for example chat)
    /** the person's Claude sends its plan limits (5-hour, weekly, extra usage) so the Studio can show them above the assistant chat; one snapshot per person, replaced each time */
    async jobs_usage(s, b) { const u = cleanUsage(b && b.usage); if (!u) throw new HttpError(400, 'usage needs windows: a list of { label, percentUsed, resetsAt } from your Claude plan limits'); const k = hashOf(s.email), cur = await dbGet('usage', k).then(r => r && r.value).catch(() => null), accounts = mergeUsage(cur && cur.accounts, { ...u, at: new Date().toISOString() }, Date.now()); await dbPut('usage', k, { name: s.name || s.email, accounts }); return { stored: true, accounts: accounts.length, note: 'Saved. The Studio shows it above the assistant chat, one block for each of your Claude accounts.' }; },
    async jobs_list_all(s, b) { await beat(s, b); const ps = d.readableProjects ? await d.readableProjects(s) : []; const out = []; let waiting = 0;
      if (d.briefs) { try { await Promise.race([d.briefs(s), new Promise(r => setTimeout(r, 5000))]); } catch (e) { /* the morning brief never blocks the idle check */ } }
      for (const p of ps.slice(0, 50)) { let r; try { r = await ops.list(s, p.id, 'waiting', String(b.stage || '').toLowerCase()); } catch (e) { continue; }
        const jobs = r.jobs.filter(j => j.status === 'waiting' && (!b.kind || j.kind === String(b.kind)) && canTake(j.kind, j.requestedBy, s.email)); if (jobs.length) { waiting += jobs.length; out.push({ project: p.name, projectId: p.id, jobs }); } }
      const snap = await dbGet('usage', hashOf(s.email)).then(r => r && r.value).catch(() => null); return { waiting, projects: out, usageDue: usageDue(snap && snap.accounts, Date.now()) || !!(snap && snap.want && Date.now() - Date.parse(snap.want) < 15 * 60000), note: waiting ? 'Claim one with action claim, its id and project (the projectId). Chat jobs first.' : 'No waiting jobs.' }; },
    async jobs_list(s, b) { if (!String(b.project || '').trim()) return tools.jobs_list_all(s, b); await beat(s, b); const p = await pickProject(s, b.project); const r = await ops.list(s, p.id, String(b.status || ''), String(b.stage || '').toLowerCase()); return { project: p.name, projectId: p.id, open: r.open, jobs: r.jobs.filter(j => j.status !== 'waiting' || canTake(j.kind, j.requestedBy, s.email)), note: 'Claim one with action claim and its id. Only waiting jobs can be claimed.' }; },
    async jobs_claim(s, b) { await beat(s, b); const p = await pickProject(s, b.project); const j = await ops.claim(s, p.id, String(b.id || '')); return brief(j, { id: p.id, name: p.name, customer: p.customer || '' }); },
    async jobs_file_urls(s, b) {
      const p = await pickProject(s, b.project); await access(s, p.id); const r = await dbGet('fl.' + p.id, String(b.fileId || '')); const f = r && r.value; if (!f || f.deletedAt || f.status !== 'ready') throw new HttpError(404, 'That project file was not found');
      if (f.category !== 'config_package' && f.category !== 'solution_input' && f.category !== 'guide_source' && f.category !== 'handover_source' && f.category !== 'plan_source') throw new HttpError(403, 'Only an org package, a customer solution file or a guide source can be fetched this way'); const parts = []; for (const id of (f.urls || [])) { const u = await CTX.files.url(id, { private: true, expires: 3600 }); parts.push(u.url); }
      await audit(p.id, s.id, 'package-fetched', f.name); return { name: f.name, size: f.size, mime: f.mime, parts, note: 'Download every part in order and join them (cat part1 part2 > package.zip). A file with one part needs no joining. The links last one hour.' };
    },
    /** step 1 of sending a finished document to the project: a one-time link to put the bytes to (docx or pdf, up to 16 MB), nothing passes through this function */
    async jobs_file_put_begin(s, b) {
      const p = await pickProject(s, b.project); await access(s, p.id); const name = String(b.fileName || '').replace(/[^A-Za-z0-9._ ()-]/g, ' ').trim().slice(0, 120); const ext = (name.split('.').pop() || '').toLowerCase(); const size = Number(b.fileSize);
      if (!name || !['docx', 'pdf'].includes(ext)) throw new HttpError(415, 'fileName must be a .docx or .pdf file name'); if (!(size > 0) || size > 16e6) throw new HttpError(413, 'fileSize must be the size in bytes, up to 16 MB');
      const fid = rid('f'); const u = await CTX.files.uploadUrl(fid + '-0.bin', { private: true }); const now = new Date().toISOString();
      await dbPut('fl.' + p.id, fid, { id: fid, category: 'solution_doc', name, mime: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size, chunks: 1, status: 'uploading', meta: { job: String(b.id || '').slice(0, 40), from: 'claude' }, replaces: null, supersededBy: null, createdBy: s.id, createdAt: now, deletedAt: null, urls: [], mint: { 0: u.file_id } });
      return { fileId: fid, uploadUrl: u.url, next: 'PUT the file bytes to uploadUrl (curl -X PUT --upload-file "<path>" "<uploadUrl>"), then call project_jobs with action file_put_done and this fileId.' };
    },
    /** step 2: the bytes are in storage; the file becomes a ready project file, listed on the Handover page */
    async jobs_file_put_done(s, b) {
      const p = await pickProject(s, b.project); await access(s, p.id); const r = await dbGet('fl.' + p.id, String(b.fileId || '')); const f = r && r.value; if (!f || f.category !== 'solution_doc' || f.status !== 'uploading' || f.createdBy !== s.id) throw new HttpError(404, 'No upload in progress for that fileId');
      if (!f.mint || !f.mint[0]) throw new HttpError(400, 'The upload link was never issued'); f.urls = [f.mint[0]]; f.status = 'ready'; f.contentCheck = 'unchecked'; await dbPut('fl.' + p.id, f.id, f); await audit(p.id, s.id, 'file-uploaded', 'solution_doc: ' + f.name);
      return { name: f.name, note: 'Saved to the project. It shows on the Handover page under Solution document.' };
    },
    /** the background Claude asks for the daily mail search; only this kind, and not again within 20 hours (whoever asked, however it ended) */
    async jobs_presence(s) { const rows = await dbList('presence'); const since = Date.now() - 10 * 60 * 1000; const here = rows.filter(r => r.value && Date.parse(r.value.at) > since).length; return { open: here, note: here ? 'Someone has the Studio open: keep working the queue.' : 'Nobody has had the Studio open for 10 minutes: stop now and say the Studio is not open.' }; },
    async jobs_request(s, b) {
      const p = await pickProject(s, b.project); const kind = String(b.kind || 'fetch_mail'); if (kind !== 'fetch_mail') throw new HttpError(400, 'Only fetch_mail can be requested this way.');
      const rows = await all(p.id); const last = rows.filter(j => j.kind === 'fetch_mail').map(j => Date.parse(j.requestedAt)).filter(Boolean).sort((a, c) => c - a)[0];
      if (last && Date.now() - last < 20 * 3600e3) return { project: p.name, requested: false, note: 'A mail search was already requested in the last 20 hours. Do the waiting one, if there is one.' };
      if ((((await dbGet('mlcfg', p.id)) || {}).value || {}).muted) return { project: p.name, requested: false, note: 'Mail is muted for this project (handed over or switched off), so no search was requested.' };
      const r = await ops.create(s, p.id, { kind: 'fetch_mail', note: 'Daily search for customer mail' }); return { project: p.name, requested: !r.duplicate, job: r.job.id, note: 'Queued. Claim it with action list and claim, then follow its instructions.' };
    },
    async jobs_progress(s, b) { const p = await pickProject(s, b.project); const j = await ops.progress(s, p.id, String(b.id || ''), b.summary); return { job: view(j), note: 'Shown to the person in Delivery Studio. Keep going.' }; },
    async jobs_finish(s, b) {   // notices: jobTitle / jobText below
      const jobCat = j => (/brd/.test(j.kind) ? 'BRD' : /msa|contract/.test(j.kind) ? 'CONTRACT' : /transcript|findings|clari/.test(j.kind) ? 'REQUIREMENTS' : /flow|forms|apps/.test(j.kind) ? 'DESIGN' : /kickoff|change|workspace/.test(j.kind) ? 'KICK-OFF' : j.kind === 'chat' ? 'CLAUDE' : 'JOB');
      const label = j => (KINDS[j.kind] ? KINDS[j.kind].label : j.kind); const ask = j => j.status === 'needs_input';
      const jobTitle = (j, p) => (j.kind === 'chat' ? (ask(j) ? 'Claude has a question for you' : 'Claude replied to your message') : (ask(j) ? 'Needs your answer: ' : 'Done: ') + label(j)) + ' · ' + p.name;
      const jobText = (j, summary) => [lead(summary, 220), j.kind === 'chat' ? (ask(j) ? 'Open the assistant to answer.' : 'Open the assistant to read the full reply.') : ask(j) ? 'Open Transfers to answer its questions.' : 'Anything it prepared waits for your approval in Transfers.'].filter(Boolean).join(' ');
      const p = await pickProject(s, b.project); const j = await ops.finish(s, p.id, String(b.id || ''), { status: b.status, summary: b.summary, transferId: b.transferId, questions: b.questions });
      // the chain: once the sessions are read (findings saved), Claude drafts the state flows, the forms and the BRD from them on its next runs; each arrives unapproved, and a job already waiting is not queued twice
      if (j && (j.kind === 'extract_findings' || j.kind === 'pull_clari' || j.kind === 'pull_transcript') && j.status === 'done' && p.autoChain !== false) { for (const kind of ['capture_flows', 'fill_forms', 'draft_brd']) { try { await ops.create(s, p.id, { kind, note: 'Started by itself after the session findings were saved' }); } catch (e) { /* a full queue or a refused kind never fails the finish */ } } }
      if (j && j.kind === 'fetch_mail' && j.status === 'done') { const c0 = ((await dbGet('mlcfg', p.id)) || {}).value || {}; await dbPut('mlcfg', p.id, Object.assign({}, c0, { lastFetchAt: new Date().toISOString() })); }   // the search is over: the next one starts after this moment
      if (j && String(j.requestedBy || '').includes('@')) await notify({ type: 'job_done', project: p, to: [j.requestedBy], actor: '', cat: jobCat(j), title: jobTitle(j, p), text: jobText(j, b.summary), detail: String(b.summary || ''), view: 'transfers', key: 'jd|' + j.id + '|' + j.status });
      return { job: view(j), note: j.status === 'needs_input' ? 'The questions are shown to the person in Delivery Studio; the job waits for their answer.' : 'Recorded. Anything you stored as a transfer waits for a person to approve it in Delivery Studio.' };
    }
  };
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { ops };
}
