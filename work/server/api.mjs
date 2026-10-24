/* FWB backend on facilio.work: one server function (/api/fn/api/...) that serves every /api/* route of the app.
   Identity comes from the platform (ctx.viewer, verified); data lives in ctx.db; file bytes in private ctx.files.
   Roles and project access are enforced HERE, on the server, so pages cannot bypass them. */
let CTX = null;   // set at the start of every request (a Lambda handles one request at a time)
{
  'use strict';
  const SUPER_ADMINS = ['dinesh.r@facilio.com'];
  const ALLOWED_DOMAIN = 'facilio.com';
  const CHUNK = 16 * 1024 * 1024;            // bytes per uploaded file part (Facilio Run allows 25 MB per upload)
  const MAX_VALUE = 100000;                  // bytes of JSON per stored record (Facilio Run's limit is 128 KB); bigger records are gzipped and split
  const PART_CHARS = 90000;
  const MAX_FILE = 100 * 1024 * 1024;
  const FILE_RULES = {
    kickoff: { ext: ['pptx', 'ppt', 'pdf'], max: MAX_FILE }, msa: { ext: ['pdf', 'docx', 'txt'], max: 30e6 }, dashboard: { ext: ['pdf'], max: 60e6 },
    transcript: { ext: ['vtt', 'srt', 'txt', 'docx', 'json'], max: 20e6 }, plan: { ext: ['xlsx', 'xlsm', 'xls'], max: 40e6 }, schedule: { ext: ['xlsx'], max: 40e6 },
    logo_facilio: { ext: ['png', 'jpg', 'jpeg'], max: 4e6 }, logo_customer: { ext: ['png', 'jpg', 'jpeg'], max: 4e6 }, brd_template: { ext: ['docx'], max: 30e6 },
    config_package: { ext: ['gz', 'json', 'zip'], max: MAX_FILE }, screenshot: { ext: ['png', 'jpg', 'jpeg'], max: 8e6 }, brd_export: { ext: ['docx', 'pdf'], max: MAX_FILE },
    onboarding_workbook: { ext: ['xlsx'], max: 40e6 }, onboarding_files: { ext: ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'zip'], max: 60e6 },
    ftr_workbook: { ext: ['xlsx', 'xlsm'], max: 40e6 }, kpi_workbook: { ext: ['xlsx', 'xlsm'], max: 40e6 },
    report_attachment: { ext: ['pdf', 'xlsx', 'xls', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'csv', 'txt'], max: 20e6 },
    signoff_evidence: { ext: ['pdf', 'png', 'jpg', 'jpeg', 'msg', 'eml', 'docx'], max: 20e6 }, brd_signed: { ext: ['docx', 'pdf', 'json'], max: MAX_FILE }
  };
  // record kinds the team can store (same list as the Netlify server's portal rules; customer-only rules come with the customer page)
  const KINDS = ['action', 'decision', 'raid', 'signoff', 'cr', 'onb', 'onbsub', 'onbfile', 'onbws', 'owner', 'agreement', 'minutes', 'checklist', 'build', 'uat', 'digest', 'ctrcore', 'ctrfees', 'ctrlegal', 'ctrrates', 'scope', 'modbrief', 'fieldreq', 'note', 'ctrwatch', 'usecase', 'discrepancy', 'brdrev', 'ai', 'hc', 'hcrep', 'ho', 'close', 'rep', 'kpi'];
  const DOC_SECTIONS = /^[a-z][a-z0-9_]{1,40}$/, ITEM_ID_RE = /^[A-Za-z0-9_-]{1,80}$/, GR_KEY = /^[a-z]{2,8}:[afbxw]:[A-Za-z0-9_-]{1,64}$/;

  class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
  const enc = encodeURIComponent, te = new TextEncoder();
  const now = () => new Date().toISOString();
  const rid = p => p + '_' + Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(16).padStart(2, '0')).join('');
  const str = (v, max, name, required) => { if (v === undefined || v === null) v = ''; if (typeof v !== 'string') throw new HttpError(400, name + ' must be text'); v = v.trim(); if (required && !v) throw new HttpError(400, name + ' is required'); if (v.length > max) throw new HttpError(400, name + ' is too long'); return v; };
  const ekey = email => String(email).toLowerCase().replace(/[^a-z0-9._-]/g, c => (c === '@' ? ':' : '_' + c.charCodeAt(0).toString(16) + '_')).slice(0, 120);
  const nameFromEmail = email => String(email).split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Facilio user';

  // ---------- storage (ctx.db) ----------
  async function dbGet(col, key) { return (await CTX.db.get(col, key)) || null; }
  async function dbPut(col, key, value) { try { await CTX.db.put(col, key, value); } catch (e) { throw new HttpError(e && e.status === 413 ? 413 : 502, e && e.status === 413 ? 'Record too large' : 'Could not save: ' + (e && e.message)); } }
  async function dbDel(col, key) { await CTX.db.delete(col, key); }
  async function dbList(col) {
    const out = []; let cursor = '', seen = new Set();
    for (let guard = 0; guard < 500; guard++) {
      const j = await CTX.db.list(col, cursor ? { limit: 200, cursor } : { limit: 200 }); const items = (j && j.items) || []; out.push(...items);
      if (!items.length || !j.cursor || seen.has(j.cursor)) break; seen.add(j.cursor); cursor = j.cursor;
    }
    return out;
  }
  // gzip + base64 helpers (records over ~100 KB are stored compressed in several parts)
  const toB64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const fromB64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const gz = async text => toB64(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  const ungz = async b64 => new Response(new Blob([fromB64(b64)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  // save(col, partCol, key, meta, obj): small records inline as {...meta, d}, big ones as {...meta, z: parts}
  async function save(col, pcol, key, meta, obj, prevZ) {
    const text = JSON.stringify(obj); let z = 0;
    if (te.encode(text).length <= MAX_VALUE) await dbPut(col, key, Object.assign({}, meta, { d: obj }));
    else {
      const b64 = await gz(text); const parts = []; for (let i = 0; i < b64.length; i += PART_CHARS) parts.push(b64.slice(i, i + PART_CHARS)); z = parts.length;
      await Promise.all(parts.map((p, i) => dbPut(pcol, key + '.' + i, { p })));
      await dbPut(col, key, Object.assign({}, meta, { z }));
    }
    for (let i = z; i < (prevZ || 0); i++) await dbDel(pcol, key + '.' + i).catch(() => { });
  }
  async function unpack(pcol, key, head) {
    if (!head.z) return head.d;
    const parts = await Promise.all(Array.from({ length: head.z }, (_, i) => dbGet(pcol, key + '.' + i)));
    if (parts.some(p => !p)) throw new HttpError(500, 'Stored data is incomplete');
    return JSON.parse(await ungz(parts.map(p => p.value.p).join('')));
  }

  // ---------- identity and roles ----------
  let ME = null, ROLE = null;
  async function me() {
    if (ME) return ME;
    const email = String((CTX.viewer && CTX.viewer.email) || '').toLowerCase(); if (!email) throw new HttpError(401, 'Sign in required');
    const m = { id: ekey(email), email, name: nameFromEmail(email), kind: 'consultant', projectId: null, guest: false };
    try { const u = await dbGet('usr', m.id); const stale = !u || !u.value || !u.value.seen || Date.now() - Date.parse(u.value.seen) > 6 * 3600e3; if (u && u.value && u.value.disabled) throw new HttpError(403, 'Your access has been switched off. Ask an admin.'); if (u && u.value && u.value.name) m.name = u.value.name; if (stale) await dbPut('usr', m.id, Object.assign({}, u && u.value, { email, name: m.name, seen: now(), created: (u && u.value && u.value.created) || now() })); } catch (e) { if (e instanceof HttpError && e.status === 403) throw e; }
    ME = m; return ME;
  }
  async function adminRole(s) {
    if (ROLE && Date.now() - ROLE.at < 20000) return ROLE.role;
    let role = null; if (SUPER_ADMINS.includes(s.email)) role = 'super';
    else { try { const g = await dbGet('grant', s.id); if (g && g.value) role = g.value.role === 'admin' ? 'admin' : 'sub'; } catch (e) { } }
    ROLE = { role, at: Date.now() }; return role;
  }
  const projectOut = (p, role) => ({ id: p.id, name: p.name, customer: p.customer, description: p.description, startDate: p.startDate || null, endDate: p.endDate || null, customerAccessEnabled: !!p.customerAccessEnabled, createdAt: p.createdAt, updatedAt: p.updatedAt, role });
  async function projectAccess(s, id, need) {
    const r = await dbGet('projects', id); const p = r && r.value; if (!p || p.archived) throw new HttpError(404, 'Project not found');
    const ar = await adminRole(s);
    if (ar === 'super' || ar === 'admin') return { project: p, role: 'owner' };
    if (ar === 'sub') { if (need === 'edit' || need === 'owner') throw new HttpError(403, 'Sub admins have read-only access'); return { project: p, role: 'viewer' }; }
    const m = (p.members || []).find(x => x.id === s.id); if (!m) throw new HttpError(404, 'Project not found');
    if (need === 'edit' && m.role === 'viewer') throw new HttpError(403, 'Read-only access to this project');
    if (need === 'owner' && m.role !== 'owner') throw new HttpError(403, 'Only the project owner can do this');
    return { project: p, role: m.role };
  }
  async function saveProject(p) { p.updatedAt = now(); await dbPut('projects', p.id, p); }
  const audit = (pid, actor, action, detail) => dbPut('au.' + pid, Date.now().toString(36) + '-' + rid('a').slice(2, 8), { actor, action, detail: detail ? String(detail).slice(0, 500) : null, at: now() }).catch(() => { });
  const memberOut = m => ({ id: m.id, email: m.email, name: m.name, role: m.role });

  // ---------- documents (versioned JSON sections) ----------
  async function docHead(pid, section) { const r = await dbGet('doc.' + pid, section); return r ? r.value : null; }
  async function docRead(pid, section) { const h = await docHead(pid, section); if (!h) return null; return { head: h, data: await unpack('dp.' + pid, section, h) }; }
  async function docWrite(s, pid, section, data, baseVersion) {
    const text = JSON.stringify(data); if (text.length > 5000000) throw new HttpError(413, 'Section too large');
    const cur = await docHead(pid, section); const curV = cur ? cur.v : 0;
    if (baseVersion === 0 ? !!cur : (baseVersion >= 0 && curV !== baseVersion)) throw new HttpError(409, 'Conflict: this section was changed by someone else.', { current: cur ? { version: cur.v, updated_by: cur.by, updated_at: cur.at } : null });
    const v = curV + 1; await save('doc.' + pid, 'dp.' + pid, section, { v, by: s.id, at: now() }, data, cur && cur.z);
    return v;
  }

  // ---------- items (one record each, so two people never overwrite each other) ----------
  const itemOut = (kind, id, h, data) => ({ kind, id, data, version: h.v, createdBy: h.cb, createdSide: h.cs, updatedBy: h.ub, updatedSide: h.us, createdAt: h.ca, updatedAt: h.ua });
  async function itemsOf(pid, kind) {
    const rows = await dbList('it.' + pid + '.' + kind); const out = [];
    await Promise.all(rows.map(async r => { out.push(itemOut(kind, r.key, r.value, await unpack('ip.' + pid + '.' + kind, r.key, r.value))); }));
    return out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  async function itemsFor(pid, kinds) { return [].concat(...(await Promise.all(kinds.map(k => itemsOf(pid, k))))); }

  // ---------- route table ----------
  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });
  const ok = (data, status) => ({ status: status || 200, data });

  route('GET', '/api/health', async () => ok({ ok: true, openMode: false, runMode: true, time: now() }));
  route('GET', '/api/auth/me', async () => {
    const s = await me(); const ar = await adminRole(s);
    return ok({ openMode: false, runMode: true, user: { id: s.id, email: s.email, name: s.name, kind: 'consultant', projectId: null, guest: false, superAdmin: ar === 'super', adminRole: ar }, signupEnabled: false, signupNeedsCode: false, domains: [ALLOWED_DOMAIN] });
  });
  route('POST', '/api/auth/logout', async () => ok({ ok: true }));

  // projects
  route('GET', '/api/projects', async () => {
    const s = await me(); const ar = await adminRole(s); const rows = (await dbList('projects')).map(r => r.value).filter(p => p && !p.archived);
    const mine = ar ? rows : rows.filter(p => (p.members || []).some(m => m.id === s.id));
    mine.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return ok({ projects: mine.map(p => projectOut(p, ar ? (ar === 'sub' ? 'viewer' : 'owner') : (p.members.find(m => m.id === s.id) || {}).role)) });
  });
  route('POST', '/api/projects', async (b) => {
    const s = await me(); const id = rid('p'); const t = now(); const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const p = { id, name: str(b.name, 160, 'Project name', true), customer: str(b.customer, 160, 'Customer name', true), description: str(b.description, 4000, 'Description'), startDate: d(b.startDate), endDate: d(b.endDate), customerAccessEnabled: false, archived: false, createdBy: s.id, createdAt: t, updatedAt: t, members: [{ id: s.id, email: s.email, name: s.name, role: 'owner' }] };
    await dbPut('projects', id, p);
    const team = Array.isArray(b.team) ? b.team.slice(0, 50) : [], stakeholders = Array.isArray(b.stakeholders) ? b.stakeholders.slice(0, 100) : [];
    await docWrite(s, id, 'people', { team, stakeholders }, 0);
    await audit(id, s.id, 'project-created', p.name); return ok({ project: projectOut(p, 'owner') }, 201);
  });
  route('GET', '/api/projects/:id', async (b, P) => { const s = await me(); const { project, role } = await projectAccess(s, P.id, 'read'); return ok({ project: projectOut(project, role), members: (project.members || []).map(memberOut) }); });
  route('PATCH', '/api/projects/:id', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'edit'); const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    if (b.name !== undefined) project.name = str(b.name, 160, 'Project name', true); if (b.customer !== undefined) project.customer = str(b.customer, 160, 'Customer', true);
    if (b.description !== undefined) project.description = str(b.description, 4000, 'Description'); if (b.startDate !== undefined) project.startDate = d(b.startDate); if (b.endDate !== undefined) project.endDate = d(b.endDate);
    await saveProject(project); await audit(P.id, s.id, 'project-updated', null); return ok({ project: projectOut(project, (await projectAccess(s, P.id, 'read')).role) });
  });
  route('DELETE', '/api/projects/:id', async (b, P) => { const s = await me(); const { project } = await projectAccess(s, P.id, 'owner'); project.archived = true; await saveProject(project); await audit(P.id, s.id, 'project-archived', null); return ok({ ok: true }); });
  route('POST', '/api/projects/:id/members', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'owner'); const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
    if (!/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(400, 'Use a Facilio office email (name@' + ALLOWED_DOMAIN + ')');
    const id = ekey(email); const u = await dbGet('usr', id); const name = (u && u.value && u.value.name) || nameFromEmail(email); const m = { id, email, name, role };
    project.members = (project.members || []).filter(x => x.id !== id).concat([m]); await saveProject(project);
    if (!u) await dbPut('usr', id, { email, name, seen: null }).catch(() => { });
    await audit(P.id, s.id, 'member-added', email + ' as ' + role); return ok({ member: memberOut(m) }, 201);
  });
  route('DELETE', '/api/projects/:id/members/:uid', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'owner'); const owners = (project.members || []).filter(m => m.role === 'owner');
    if (owners.length === 1 && owners[0].id === P.uid) throw new HttpError(400, 'A project needs at least one owner');
    project.members = (project.members || []).filter(m => m.id !== P.uid); await saveProject(project); await audit(P.id, s.id, 'member-removed', P.uid); return ok({ ok: true });
  });
  route('GET', '/api/projects/:id/audit', async (b, P, Q) => {
    const s = await me(); await projectAccess(s, P.id, 'read'); const rows = (await dbList('au.' + P.id)).map(r => r.value);
    rows.sort((a, c) => String(c.at).localeCompare(String(a.at))); return ok({ entries: rows.slice(0, 200) });
  });
  const noCustomers = () => { throw new HttpError(403, 'Customer access is not available in this version yet'); };
  route('PUT', '/api/projects/:id/customer-access', async () => noCustomers());

  // documents
  route('GET', '/api/projects/:id/docs', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'read'); const rows = await dbList('doc.' + P.id);
    return ok({ sections: rows.map(r => ({ section: r.key, version: r.value.v, updated_at: r.value.at, updated_by: r.value.by })) });
  });
  route('GET', '/api/projects/:id/docs/:section', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'read'); if (!DOC_SECTIONS.test(P.section)) throw new HttpError(403, 'Not permitted');
    const r = await docRead(P.id, P.section); return ok(r ? { data: r.data, version: r.head.v, updatedAt: r.head.at, updatedBy: r.head.by } : { data: null, version: 0 });
  });
  route('PUT', '/api/projects/:id/docs/:section', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'edit'); if (!DOC_SECTIONS.test(P.section)) throw new HttpError(400, 'Invalid section');
    if (!b || b.data === undefined) throw new HttpError(400, 'data is required');
    const v = await docWrite(s, P.id, P.section, b.data, Number.isInteger(b.baseVersion) ? b.baseVersion : -1); await saveProject(project); return ok({ version: v });
  });

  // ---------- AI assistant (server-side only; keys never reach the browser) ----------
  const AI_TASKS = {
    brd: { title: 'BRD draft', kinds: ['decision', 'usecase', 'scope', 'raid', 'action'], docs: ['workshop', 'planner', 'brddoc', 'reviews'], ask: 'Draft the requested section(s) of the Business Requirements Document from the approved project information. Use the standard BRD structure (document info, summary, scope and exclusions, stakeholders, processes, functional and non-functional requirements, business rules and acceptance criteria, integrations and data, reports, roles, dependencies/assumptions/constraints, risks and open questions, traceability).' },
    gaps: { title: 'Missing requirements check', kinds: ['decision', 'usecase', 'scope', 'raid', 'action', 'discrepancy'], docs: ['workshop', 'planner', 'brddoc', 'reviews'], ask: 'Review the information and list missing requirements, contradictions, unanswered questions and risks before BRD sign-off.' },
    uat: { title: 'UAT plan and test cases', kinds: ['decision', 'usecase', 'uat', 'checklist', 'build'], docs: ['workshop', 'brddoc'], ask: 'Create a UAT plan (objectives, scope, approach, entry and exit criteria, roles, environment, test data, schedule, defect process, sign-off) and a table of test cases (ID, requirement ref, scenario, preconditions, steps, expected result). Leave Actual result, Status, Defect and Tester blank: only a human tester records them. Mark tests with no source requirement as "Suggested additional test".' },
    ftr: { title: 'FTR report', kinds: ['decision', 'uat', 'build', 'raid', 'signoff', 'cr'], docs: ['brddoc', 'plan'], ask: 'Prepare an FTR report skeleton. No definition of FTR is recorded in the sources unless one appears in them: if none does, say "FTR definition unconfirmed" at the top and use a neutral structure (summary, scope reviewed, configuration summary, requirements and traceability, test coverage and results, open defects and limitations, deviations, risks, evidence, next actions, approvals). Quote results only if they exist in the sources.' },
    ftrrows: { title: 'FTR scenarios (suggested)', kinds: ['decision', 'usecase', 'build', 'uat'], docs: ['brddoc', 'config', 'workshop'], ask: 'Suggest test scenarios for the FTR workbook. Return ONLY a Markdown table with the columns: Test Scenario | Steps to Reproduce | Expected Outcome | Portal | Can be accessed by Role. One row per scenario, numbered steps separated by " / ". Base every row on the sources (use cases, decisions, configuration). Do not include results, pass/fail, screenshots or approvals: those come from a human tester. If the sources do not support a scenario, do not add it.' },
    guide: { title: 'Customer user guide', kinds: ['decision', 'usecase', 'build'], docs: ['guide_published', 'workshop', 'config'], ask: 'Draft a customer-friendly user guide outline with role-based procedures. Only describe UI controls and steps that appear in the sources; for anything else write "[Screenshot or source needed]". Exclude internal notes, fees and contract detail.' },
    config: { title: 'Configuration documentation', kinds: ['decision', 'build'], docs: ['config', 'workshop'], ask: 'Document the configuration (modules, forms and fields, workflows, notifications, roles, integrations, import mappings, reports, known limitations). Mark each statement as Confirmed (in the sources) or Needs manual verification.' },
    workshop: { title: 'Workshop intelligence', kinds: ['decision', 'action', 'usecase', 'raid', 'minutes'], docs: ['workshop', 'planner', 'transcripts'], ask: 'From the workshop information: propose agenda items, module-specific discovery questions, decisions, actions, assumptions, risks, candidate requirements, contradictions between sessions and follow-up questions. All findings are proposals for review.' },
    golive: { title: 'Go-live readiness review', kinds: ['checklist', 'uat', 'build', 'raid', 'signoff', 'cr', 'hc'], docs: ['plan'], ask: 'Review the recorded evidence against go-live criteria (approved scope/BRD, configuration verified, data migration, integrations, UAT sign-off, critical defects, training, documentation, access, rollback plan, support ownership, customer approval). List blockers, risks, missing or contradictory evidence and suggested owners. Do not give a confidence score; the decision belongs to authorised people.' },
    hypercare: { title: 'Hypercare status report', kinds: ['hc', 'hcrep', 'raid', 'action'], docs: [], ask: 'Write today\'s hypercare status report from the recorded issues: summary, open issues by severity, recurring patterns, workarounds, customer feedback, and recommended follow-ups. Do not close issues or change severity.' },
    handover: { title: 'Support handover pack', kinds: ['ho', 'hc', 'raid', 'signoff', 'build', 'uat'], docs: ['brddoc', 'config', 'plan'], ask: 'Assemble a support handover pack outline from the recorded artifacts (solution overview, configuration inventory, integrations, known issues and workarounds, outstanding defects, support procedures and contacts, access handover, training, hypercare summary, open actions) and list the missing documents.' },
    wsr: { title: 'Weekly status report (WSR)', kinds: ['action', 'decision', 'raid', 'cr', 'uat', 'build', 'hc'], docs: ['plan'], ask: 'Write a weekly status report with these sections: Overall status (RAG with reason), Progress this week, Planned next week, Milestones and dates, Risks and issues, Decisions and customer actions needed, Change requests, Attachments to include. Use only recorded facts; leave a section as "No information recorded" when the sources have none.' },
    monthly: { title: 'Monthly report', kinds: ['action', 'decision', 'raid', 'cr', 'uat', 'build', 'signoff', 'hc'], docs: ['plan'], ask: 'Write a monthly project report with these sections: Executive summary, Progress against plan, Milestones achieved and upcoming, Deliverables status, Risks and issues, Change requests, Customer actions outstanding, Next month focus. Use only recorded facts and say where information is missing.' },
    closure: { title: 'Project closure report', kinds: ['ho', 'hc', 'signoff', 'cr', 'raid', 'decision'], docs: ['plan', 'brddoc'], ask: 'Draft a project closure report (outcomes against scope, changes, deliveries, issues, lessons learned, open items and owners). State only what the records show.' }
  };
  const AI_SYSTEM = 'You are an implementation consultant\'s assistant inside Facilio\'s Delivery Studio. Work only from the SOURCES supplied for this one project. Cite sources inline as [S1], [S2]. Label statements as Confirmed (stated in a source), Assumption, Suggestion or Missing information. Never invent customer decisions, approvals, sign-offs, test results, configuration details or completion status. If a source is absent, say so. Your output is a DRAFT for human review; you cannot approve, publish, close or change records. Write clear Markdown.';
  const clip = (v, n) => { let t = typeof v === 'string' ? v : JSON.stringify(v); return t.length > n ? t.slice(0, n) + ' …[truncated]' : t; };
  async function aiContext(pid, task) {
    const T = AI_TASKS[task]; const src = []; let text = ''; let n = 0;
    for (const d of T.docs) { const r = await docRead(pid, d).catch(() => null); if (r && r.data && Object.keys(r.data).length) { n++; src.push({ ref: 'S' + n, label: 'Document: ' + d }); text += `\n[S${n}] Document "${d}":\n${clip(r.data, 5000)}\n`; } }
    for (const k of T.kinds) { const rows = await itemsOf(pid, k).catch(() => []); if (rows.length) { n++; src.push({ ref: 'S' + n, label: 'Records: ' + k + ' (' + rows.length + ')' }); text += `\n[S${n}] Records "${k}" (${rows.length}):\n${clip(rows.slice(0, 40).map(r => Object.assign({ id: r.id }, r.data, { hist: undefined })), 3500)}\n`; } }
    return { src, text: text.slice(0, 26000) };
  }
  async function callModel(messages, maxTokens) {
    let key = ''; try { key = (await CTX.secrets.get('anthropic_api_key')) || ''; } catch (e) { key = ''; }
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 22000);
    try {
      if (key) {
        const model = 'claude-sonnet-5-5'; const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n'); const rest = messages.filter(m => m.role !== 'system');
        const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: maxTokens, system: sys, messages: rest }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new HttpError(r.status === 429 ? 429 : 502, 'The AI service returned an error (' + r.status + ')');
        return { text: (j.content || []).map(c => c.text || '').join(''), provider: 'Claude', model };
      }
      const r = await CTX.llm({ messages, max_tokens: maxTokens, temperature: 0.2 });
      const text = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content; if (!text) throw new HttpError(502, 'The AI returned no text');
      return { text, provider: 'Facilio-hosted model', model: r.model || 'default' };
    } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(e && e.name === 'AbortError' ? 504 : 502, e && e.name === 'AbortError' ? 'The AI took too long. Try a narrower request.' : 'The AI service could not be reached'); }
    finally { clearTimeout(to); }
  }
  route('GET', '/api/ai/status', async () => { await me(); let key = false; try { key = !!(await CTX.secrets.get('anthropic_api_key')); } catch (e) { } return ok({ provider: key ? 'Claude' : 'Facilio-hosted model', claude: key, tasks: Object.keys(AI_TASKS) }); });
  route('POST', '/api/projects/:id/ai/run', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const task = String(b && b.task || ''); const T = AI_TASKS[task]; if (!T) throw new HttpError(400, 'Unknown AI task');
    const instruction = str(b.instruction, 1500, 'Instruction'); const { src, text } = await aiContext(P.id, task);
    const user = `TASK: ${T.ask}\n${instruction ? 'EXTRA INSTRUCTION FROM THE CONSULTANT: ' + instruction + '\n' : ''}\nSOURCES (the only project information you may use):${text || '\n(No project records were found for this task. Say what is missing.)'}`;
    const out = await callModel([{ role: 'system', content: AI_SYSTEM }, { role: 'user', content: user }], 2600);
    const id = rid('ai'); const t = now(); const data = { task, title: T.title, status: 'draft', content: out.text, sources: src, provider: out.provider, model: out.model, instruction, by: s.name || s.email, version: 1, hist: [{ at: t, who: s.name || s.email, side: 'facilio', event: 'AI draft generated' }] };
    await save('it.' + P.id + '.ai', 'ip.' + P.id + '.ai', id, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, data, undefined);
    await audit(P.id, s.id, 'ai-draft', task + ' via ' + out.provider); return ok({ item: itemOut('ai', id, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, data) }, 201);
  });
  route('POST', '/api/projects/:id/ai/:item/decision', async (b, P) => {
    const s = await me(); const { role } = await projectAccess(s, P.id, 'owner'); const d = String(b && b.decision || ''); if (!['approve', 'reject', 'reopen'].includes(d)) throw new HttpError(400, 'Choose approve, reject or reopen');
    if (!ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Bad id'); const col = 'it.' + P.id + '.ai', pcol = 'ip.' + P.id + '.ai'; const row = await dbGet(col, P.item); const head = row && row.value; if (!head) throw new HttpError(404, 'Draft not found'); const cur = await unpack(pcol, P.item, head);
    const status = d === 'approve' ? 'approved' : d === 'reject' ? 'rejected' : 'draft'; const t = now(); const note = str(b.note, 500, 'Note');
    const data = Object.assign({}, cur, { status, approvedBy: d === 'approve' ? (s.name || s.email) : null, approvedAt: d === 'approve' ? t : null, decisionNote: note, hist: (cur.hist || []).concat([{ at: t, who: s.name || s.email, side: 'facilio', event: d === 'approve' ? 'Approved' : d === 'reject' ? 'Rejected' : 'Reopened as draft' + (note ? ': ' + note : '') }]) });
    const nh = Object.assign({}, head, { v: head.v + 1, ub: s.id, us: 'facilio', ua: t }); await save(col, pcol, P.item, nh, data, head.z); await audit(P.id, s.id, 'ai-' + d, cur.task); return ok({ item: itemOut('ai', P.item, nh, data) });
  });

  // items
  const kindList = q => String(q || '').split(',').filter(k => KINDS.includes(k));
  route('GET', '/api/projects/:id/items', async (b, P, Q) => { const s = await me(); await projectAccess(s, P.id, 'read'); const kinds = kindList(Q.get('kinds')); if (!kinds.length) throw new HttpError(400, 'Name the kinds to load'); return ok({ items: await itemsFor(P.id, kinds) }); });
  route('GET', '/api/projects/:id/open', async (b, P, Q) => {
    const s = await me(); const { project, role } = await projectAccess(s, P.id, 'read');
    const secs = String(Q.get('sections') || '').split(',').filter(k => k && DOC_SECTIONS.test(k)).slice(0, 40); const kq = String(Q.get('kinds') || ''); const kinds = kq === 'all' ? KINDS : kindList(kq);
    const [docRows, items] = await Promise.all([Promise.all(secs.map(k => docRead(P.id, k))), itemsFor(P.id, kinds)]);
    const docs = {}; secs.forEach((k, i) => { docs[k] = docRows[i] ? { data: docRows[i].data, version: docRows[i].head.v } : { data: null, version: 0 }; });
    return ok({ project: projectOut(project, role), members: (project.members || []).map(memberOut), docs, items, kinds });
  });
  route('PUT', '/api/projects/:id/items/:kind/:item', async (b, P) => {
    const s = await me(); if (!KINDS.includes(P.kind) || !ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Unknown item type'); const { project } = await projectAccess(s, P.id, 'edit');
    if (!b || !b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw new HttpError(400, 'data is required');
    const col = 'it.' + P.id + '.' + P.kind, pcol = 'ip.' + P.id + '.' + P.kind; const curRow = await dbGet(col, P.item); const head = curRow && curRow.value; const cur = head ? await unpack(pcol, P.item, head) : null;
    if (Number.isInteger(b.baseVersion) && (head ? head.v : 0) !== b.baseVersion) throw new HttpError(409, 'Conflict: this record was changed by someone else.', { current: head ? itemOut(P.kind, P.item, head, cur) : null });
    let data = b.data;
    if (P.kind === 'ai') { // AI drafts: status and approval are set only by the decision route; an edit to approved text reopens it as a draft
      if (!cur) throw new HttpError(403, 'AI drafts are created by the assistant only');
      const edited = typeof data.content === 'string' && data.content !== cur.content;
      data = Object.assign({}, cur, { content: typeof data.content === 'string' ? data.content.slice(0, 60000) : cur.content, status: edited && cur.status === 'approved' ? 'draft' : cur.status, approvedBy: edited && cur.status === 'approved' ? null : cur.approvedBy, approvedAt: edited && cur.status === 'approved' ? null : cur.approvedAt, version: edited ? (cur.version || 1) + 1 : cur.version });
    }
    if (P.kind === 'cr' && !cur) { const all = await itemsOf(P.id, 'cr'); const mx = all.reduce((m, it) => (/^[0-9]+$/.test(String(it.data.n)) ? Math.max(m, Number(it.data.n)) : m), 0); data = Object.assign({}, data, { n: mx + 1 }); }
    else if (P.kind === 'cr' && cur) data = Object.assign({}, data, { n: cur.n });
    const prevHist = cur && Array.isArray(cur.hist) ? cur.hist : [];
    const changed = Object.keys(data).filter(k => k !== 'hist' && JSON.stringify(data[k]) !== JSON.stringify(cur ? cur[k] : undefined));
    data = Object.assign({}, data, { hist: prevHist.concat(changed.length || !cur ? [{ at: now(), who: s.name || 'Implementation team', side: 'facilio', event: cur ? 'Updated ' + changed.slice(0, 6).join(', ') + (data.status && changed.includes('status') ? ' → ' + data.status : '') : 'Created' }] : []).slice(-40) });
    if (JSON.stringify(data).length > (P.kind === 'onbws' ? 2000000 : 60000)) throw new HttpError(413, 'Record too large');
    const t = now(); const nh = { v: head ? head.v + 1 : 1, cb: head ? head.cb : s.id, cs: head ? head.cs : 'facilio', ub: s.id, us: 'facilio', ca: head ? head.ca : t, ua: t };
    await save(col, pcol, P.item, nh, data, head && head.z); await saveProject(project);
    if (['signoff', 'cr', 'raid', 'onb', 'onbsub', 'decision', 'brdrev', 'ai', 'hc', 'ho', 'close'].includes(P.kind)) await audit(P.id, s.id, P.kind + (cur ? '-updated' : '-created'), P.item + (data.status ? ' ' + data.status : ''));
    return ok({ item: itemOut(P.kind, P.item, nh, data) });
  });
  route('DELETE', '/api/projects/:id/items/:kind/:item', async (b, P) => {
    const s = await me(); if (!KINDS.includes(P.kind)) throw new HttpError(400, 'Unknown item type'); await projectAccess(s, P.id, 'edit');
    const r = await dbGet('it.' + P.id + '.' + P.kind, P.item); if (!r) throw new HttpError(404, 'Not found');
    await dbDel('it.' + P.id + '.' + P.kind, P.item); for (let i = 0; i < (r.value.z || 0); i++) await dbDel('ip.' + P.id + '.' + P.kind, P.item + '.' + i).catch(() => { });
    await audit(P.id, s.id, P.kind + '-deleted', P.item); return ok({ ok: true });
  });

  // guide responses and feedback
  route('GET', '/api/projects/:id/guide-responses', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'read'); const rows = await dbList('gr.' + P.id);
    return ok({ responses: rows.map(r => ({ key: r.key, value: r.value.value, authorName: r.value.authorName, authorKind: r.value.authorKind, updatedAt: r.value.updatedAt })).sort((a, c) => a.key.localeCompare(c.key)).slice(0, 5000) });
  });
  route('PUT', '/api/projects/:id/guide-responses', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const key = String((b && b.key) || ''); if (!GR_KEY.test(key)) throw new HttpError(400, 'Invalid response key');
    if (b.value === null || b.value === undefined || b.value === '' || (Array.isArray(b.value) && !b.value.length)) { await dbDel('gr.' + P.id, key); return ok({ ok: true, deleted: true }); }
    if (JSON.stringify(b.value).length > 20000) throw new HttpError(413, 'Answer too long'); const t = now();
    await dbPut('gr.' + P.id, key, { value: JSON.stringify(b.value), authorName: s.name, authorKind: 'consultant', updatedAt: t }); return ok({ ok: true, authorName: s.name, authorKind: 'consultant', updatedAt: t });
  });
  route('GET', '/api/projects/:id/feedback', async (b, P) => { const s = await me(); await projectAccess(s, P.id, 'read'); const rows = (await dbList('fb.' + P.id)).map(r => r.value); rows.sort((a, c) => String(c.createdAt).localeCompare(String(a.createdAt))); return ok({ items: rows.slice(0, 1000) }); });
  route('POST', '/api/projects/:id/feedback', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const id = rid('fb'); const t = now();
    const kind = ['question', 'concern', 'feedback', 'change'].includes(b.kind) ? b.kind : 'question', pr = ['low', 'normal', 'high'].includes(b.priority) ? b.priority : 'normal';
    await dbPut('fb.' + P.id, id, { id, module: str(b.module, 120, 'Module'), topic: str(b.topic, 200, 'Topic'), kind, priority: pr, body: str(b.body, 5000, 'Question or feedback', true), authorName: str(b.authorName, 120, 'Name') || s.name, authorKind: 'consultant', sessionRef: str(b.sessionRef, 80, 'Session'), status: 'open', response: null, createdAt: t, updatedAt: t });
    await audit(P.id, s.id, 'feedback-added', b.module || ''); return ok({ id }, 201);
  });
  route('PATCH', '/api/projects/:id/feedback/:fid', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const r = await dbGet('fb.' + P.id, P.fid); if (!r) throw new HttpError(404, 'Item not found'); const f = r.value;
    if (['open', 'answered', 'resolved', 'follow-up'].includes(b.status)) f.status = b.status; if (b.response !== undefined) f.response = str(b.response, 5000, 'Response'); if (b.sessionRef !== undefined) f.sessionRef = str(b.sessionRef, 80, 'Session');
    f.updatedAt = now(); await dbPut('fb.' + P.id, P.fid, f); return ok({ ok: true });
  });

  // files: bytes go to the app's private file store in parts of 16 MB; the project keeps the part ids
  const fileOut = f => ({ id: f.id, category: f.category, name: f.name, mime: f.mime, size: f.size, chunks: f.chunks, status: f.status, meta: f.meta, replaces: f.replaces, supersededBy: f.supersededBy, createdBy: f.createdBy, createdAt: f.createdAt });
  route('GET', '/api/projects/:id/files', async (b, P, Q) => {
    const s = await me(); await projectAccess(s, P.id, 'read'); const cat = Q.get('category'), all = Q.get('versions') === '1';
    const rows = (await dbList('fl.' + P.id)).map(r => r.value).filter(f => !f.deletedAt && f.status === 'ready' && (!cat || f.category === cat) && (all || !f.supersededBy));
    rows.sort((a, c) => String(c.createdAt).localeCompare(String(a.createdAt))); return ok({ files: rows.map(fileOut) });
  });
  route('POST', '/api/projects/:id/files', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const rule = FILE_RULES[b.category]; if (!rule) throw new HttpError(400, 'Unknown file category');
    const name = str(b.name, 255, 'File name', true); const ext = (name.split('.').pop() || '').toLowerCase(); if (!rule.ext.includes(ext)) throw new HttpError(415, 'Unsupported file type .' + ext + ' — allowed: ' + rule.ext.join(', '));
    const size = Number(b.size); if (!(size > 0) || size > rule.max) throw new HttpError(413, 'File is empty or too large (max ' + Math.round(rule.max / 1e6) + ' MB)');
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : {}; if (JSON.stringify(meta).length > 20000) throw new HttpError(400, 'Metadata too large');
    if (b.replaces) { const old = await dbGet('fl.' + P.id, b.replaces); if (!old) throw new HttpError(404, 'File to replace not found'); }
    const chunks = Math.ceil(size / CHUNK), id = rid('f');
    await dbPut('fl.' + P.id, id, { id, category: b.category, name, mime: str(b.mime, 120, 'Type') || 'application/octet-stream', size, chunks, status: 'uploading', meta, replaces: b.replaces || null, supersededBy: null, createdBy: s.id, createdAt: now(), deletedAt: null, urls: [] });
    return ok({ id, chunkSize: CHUNK, chunks }, 201);
  });
  // bytes never pass through this function: the page asks for a one-time upload link, PUTs the part straight to storage, then tells us it is done
  const chunkOf = async (s, P, need) => { await projectAccess(s, P.id, need); const r = await dbGet('fl.' + P.id, P.fid); if (!r || r.value.status !== 'uploading') throw new HttpError(404, 'Upload not found'); const n = Number(P.n); if (!Number.isInteger(n) || n < 0 || n >= r.value.chunks) throw new HttpError(400, 'Invalid chunk'); return { f: r.value, n }; };
  route('POST', '/api/projects/:id/files/:fid/chunks/:n/url', async (b, P) => {
    const s = await me(); const { n } = await chunkOf(s, P, 'edit'); const u = await CTX.files.uploadUrl(P.fid + '-' + n + '.bin', { private: true }); return ok({ url: u.url, fileId: u.file_id });
  });
  route('PUT', '/api/projects/:id/files/:fid/chunks/:n', async (b, P) => {
    const s = await me(); const { n } = await chunkOf(s, P, 'edit'); if (!b || typeof b.fileId !== 'string') throw new HttpError(400, 'fileId missing');
    const fresh = (await dbGet('fl.' + P.id, P.fid)).value; fresh.urls[n] = b.fileId; await dbPut('fl.' + P.id, P.fid, fresh); return ok({ ok: true });
  });
  route('POST', '/api/projects/:id/files/:fid/complete', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const r = await dbGet('fl.' + P.id, P.fid); if (!r) throw new HttpError(404, 'Upload not found'); const f = r.value;
    for (let i = 0; i < f.chunks; i++) if (!f.urls[i]) throw new HttpError(400, 'Chunk ' + i + ' missing');
    f.status = 'ready'; await dbPut('fl.' + P.id, P.fid, f);
    if (f.replaces) { const o = await dbGet('fl.' + P.id, f.replaces); if (o) { o.value.supersededBy = f.id; await dbPut('fl.' + P.id, f.replaces, o.value); } }
    await audit(P.id, s.id, 'file-uploaded', f.category + ': ' + f.name); return ok({ file: fileOut(f) });
  });
  const fileForRead = async (s, P) => { await projectAccess(s, P.id, 'read'); const r = await dbGet('fl.' + P.id, P.fid); if (!r || r.value.deletedAt || r.value.status !== 'ready') throw new HttpError(404, 'File not found'); return r.value; };
  route('GET', '/api/projects/:id/files/:fid', async (b, P) => { const s = await me(); return ok({ file: fileOut(await fileForRead(s, P)), chunkSize: CHUNK }); });
  route('GET', '/api/projects/:id/files/:fid/chunks/:n', async (b, P) => {
    const s = await me(); const f = await fileForRead(s, P); const n = Number(P.n); if (!Number.isInteger(n) || n < 0 || n >= f.chunks || !f.urls[n]) throw new HttpError(400, 'Invalid chunk');
    const u = await CTX.files.url(f.urls[n], { private: true, expires: 300 }); return ok({ url: u.url });
  });
  route('PATCH', '/api/projects/:id/files/:fid', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const r = await dbGet('fl.' + P.id, P.fid); if (!r || r.value.deletedAt) throw new HttpError(404, 'File not found'); const f = r.value;
    const meta = Object.assign({}, f.meta, b.meta && typeof b.meta === 'object' ? b.meta : {}); if (JSON.stringify(meta).length > 20000) throw new HttpError(400, 'Metadata too large'); f.meta = meta; await dbPut('fl.' + P.id, P.fid, f); return ok({ file: fileOut(f) });
  });
  route('DELETE', '/api/projects/:id/files/:fid', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const r = await dbGet('fl.' + P.id, P.fid); if (!r || r.value.deletedAt) throw new HttpError(404, 'File not found'); const f = r.value; f.deletedAt = now(); await dbPut('fl.' + P.id, P.fid, f);
    if (f.replaces) { const o = await dbGet('fl.' + P.id, f.replaces); if (o && o.value.supersededBy === f.id) { o.value.supersededBy = null; await dbPut('fl.' + P.id, f.replaces, o.value); } }
    await audit(P.id, s.id, 'file-removed', f.category + ': ' + f.name); return ok({ ok: true });
  });

  // ---------- admin console (platform owner, Admin, Sub admin) ----------
  // Roles: platform owner = SUPER_ADMINS, Admin / Sub admin come from the `grant` collection. Access rules are enforced here in the page (Facilio Run has no server code).
  const SYS = 'au.sys';
  const isEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
  async function requireAdmin(level) {
    const s = await me(); const ar = await adminRole(s); const rank = { sub: 1, admin: 2, super: 3 };
    if (!ar || rank[ar] < rank[level]) throw new HttpError(403, level === 'super' ? 'Only the platform owner can do this' : 'Admin access required');
    return Object.assign({}, s, { adminRole: ar });
  }
  async function pmap(list, n, fn) { const out = new Array(list.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { for (;;) { const k = i++; if (k >= list.length) return; out[k] = await fn(list[k], k); } })); return out; }
  const dayKey = d => new Date(d).toISOString().slice(0, 10);
  const weekStart = d => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const stageOf = x => x.signed.golive ? 6 : (x.signed.uat || x.uat > 0) ? 5 : (x.signed.brd || x.brdStatus === 'approved' || x.brdExports > 0) ? 4 : x.reqs > 0 ? 3 : x.sessions.total > 0 ? 2 : x.scope > 0 ? 1 : 0;
  const daysAgo = d => Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  let ADM = null;   // short cache so the admin screens open fast; cleared after any admin change
  async function loadAll() {
    if (ADM && Date.now() - ADM.at < 15000) return ADM;
    const [projs, usrs, grants] = await Promise.all([dbList('projects'), dbList('usr'), dbList('grant')]);
    const users = usrs.map(r => Object.assign({ id: r.key }, r.value)); const gm = {}; grants.forEach(g => { gm[String(g.value.email || '').toLowerCase()] = g.value; });
    const list = projs.map(r => r.value).filter(Boolean);
    const today = now().slice(0, 10);
    const rows = await pmap(list, 5, async p => {
      const id = p.id; const sg = async f => { try { return await f(); } catch (e) { return null; } };
      const [planner, workshop, brd, items, files, fb, au] = await Promise.all([
        sg(() => docRead(id, 'planner')), sg(() => docRead(id, 'workshop')), sg(() => docRead(id, 'brddoc')),
        sg(() => itemsFor(id, ['action', 'raid', 'uat', 'signoff'])), sg(() => dbList('fl.' + id)), sg(() => dbList('fb.' + id)), sg(() => dbList('au.' + id))]);
      return { p, planner: planner && planner.data || {}, workshop: workshop && workshop.data || {}, brd: brd && brd.data || {}, items: items || [], files: (files || []).map(r => r.value).filter(f => f && !f.deletedAt), fb: (fb || []).map(r => r.value), au: (au || []).map(r => Object.assign({ id: r.key, projectId: id }, r.value)) };
    });
    ADM = { at: Date.now(), rows, users, gm, grants };
    return ADM;
  }
  const who = (A, id) => { const u = A.users.find(x => x.id === id); return u ? u.email : (/^[^_]+:[^_]+$/.test(String(id || '')) ? String(id).replace(':', '@') : String(id || '')); };
  async function adminAuditAll(A) {
    const sys = (await dbList(SYS)).map(r => Object.assign({ id: r.key, projectId: null }, r.value));
    const all = A.rows.reduce((a, r) => a.concat(r.au.map(e => Object.assign({}, e, { project: r.p.name }))), sys.map(e => Object.assign({}, e, { project: '' })));
    return all.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  route('GET', '/api/admin/overview', async () => {
    const s = await requireAdmin('sub'); const A = await loadAll(); const today = now().slice(0, 10);
    const projects = A.rows.map(({ p, planner, workshop, brd, items, files, fb, au }) => {
      const sess = Array.isArray(planner.sessions) ? planner.sessions.filter(x => x && x.status !== 'cancelled') : [];
      const od = items.filter(i => i.kind === 'action' && i.data && i.data.due && i.data.due < today && i.data.status !== 'Done').length;
      const st = i => (i.data && i.data.status) || '';
      const openActions = items.filter(i => i.kind === 'action' && st(i) !== 'Done').length, blocked = items.filter(i => i.kind === 'action' && st(i) === 'Blocked').length;
      const raidOpen = items.filter(i => i.kind === 'raid' && !/closed|resolved|done|mitigated/i.test(st(i))).length;
      const signed = {}; items.filter(i => i.kind === 'signoff' && st(i) === 'signed').forEach(i => { signed[i.id] = true; });
      const last = [p.updatedAt].concat(items.map(i => i.updatedAt), au.map(e => e.at)).filter(Boolean).sort().pop();
      const openFb = fb.filter(f => f && f.status === 'open').length;
      const x = { scope: Array.isArray(planner.scope) ? planner.scope.length : 0, reqs: Array.isArray(workshop.requirements) ? workshop.requirements.length : 0, brdStatus: brd.status || '', brdExports: Array.isArray(brd.exports) ? brd.exports.length : 0, uat: items.filter(i => i.kind === 'uat').length, signed, sessions: { total: sess.length, upcoming: sess.filter(y => (y.date || '') >= today).length, done: sess.filter(y => y.date && y.date < today).length } };
      const stage = stageOf(x); const idle = daysAgo(last || p.createdAt); const reasons = [];
      if (od) reasons.push(od + ' overdue action' + (od > 1 ? 's' : '')); if (blocked) reasons.push(blocked + ' blocked'); if (openFb >= 3) reasons.push(openFb + ' open customer questions'); if (idle > 14) reasons.push('No activity for ' + idle + ' days');
      const health = p.archived ? 'archived' : stage === 6 ? 'live' : idle > 14 ? 'stale' : (od || blocked || openFb >= 3) ? 'attention' : 'healthy';
      return { id: p.id, name: p.name, customer: p.customer, description: p.description, archived: !!p.archived, customerAccessEnabled: !!p.customerAccessEnabled, startDate: p.startDate, endDate: p.endDate, createdAt: p.createdAt, updatedAt: p.updatedAt, lastActivity: last || p.updatedAt,
        members: (p.members || []).length, owners: (p.members || []).filter(m => m.role === 'owner').map(m => m.email).join(', '), files: files.length, bytes: files.reduce((a, f) => a + (f.size || 0), 0), openFeedback: openFb,
        modulesInScope: x.scope, sessions: x.sessions, requirements: x.reqs, flows: workshop.flows && typeof workshop.flows === 'object' ? Object.keys(workshop.flows).length : 0, brdStatus: x.brdStatus || 'draft', brdExports: x.brdExports,
        stage, health, reasons, openActions, overdue: od, blocked, raidOpen, uat: x.uat, signed };
    }).sort((a, b) => (a.archived - b.archived) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const act = projects.filter(p => !p.archived); const sum = f => act.reduce((a, p) => a + f(p), 0);
    const auAll = A.rows.reduce((a, r) => a.concat(r.au), []);
    const weekly = []; for (let k = 7; k >= 0; k--) { const key = weekStart(Date.now() - k * 7 * 864e5); weekly.push({ week: key, n: auAll.filter(e => weekStart(e.at) === key).length }); }
    const monthly = []; for (let k = 5; k >= 0; k--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - k); const key = d.toISOString().slice(0, 7); monthly.push({ month: key, n: projects.filter(p => String(p.createdAt).slice(0, 7) === key).length }); }
    const cat = {}; A.rows.forEach(r => r.files.forEach(f => { const c = cat[f.category] = cat[f.category] || { category: f.category, n: 0, bytes: 0 }; c.n++; c.bytes += f.size || 0; }));
    const health = { healthy: 0, attention: 0, stale: 0, live: 0 }; act.forEach(p => { health[p.health] = (health[p.health] || 0) + 1; });
    const active7 = A.users.filter(u => u.seen && Date.now() - Date.parse(u.seen) < 7 * 864e5).length;
    return ok({ me: { role: s.adminRole, email: s.email, name: s.name }, superAdmins: SUPER_ADMINS, projects,
      kpis: { active: act.length, archived: projects.length - act.length, customers: new Set(act.map(p => String(p.customer).trim().toLowerCase())).size, people: A.users.length, guests: 0, activePeople7d: active7, files: sum(p => p.files), bytes: sum(p => p.bytes), sessions: sum(p => p.sessions.total), upcoming: sum(p => p.sessions.upcoming), requirements: sum(p => p.requirements), flows: sum(p => p.flows), openActions: sum(p => p.openActions), overdue: sum(p => p.overdue), openQuestions: sum(p => p.openFeedback), raidOpen: sum(p => p.raidOpen), customerAccess: 0, brdApproved: act.filter(p => p.brdStatus === 'approved').length, live: act.filter(p => p.stage === 6).length },
      stages: [0, 1, 2, 3, 4, 5, 6].map(n => act.filter(p => p.stage === n).length), health, weekly, monthly, files: Object.values(cat).sort((a, b) => b.bytes - a.bytes),
      attention: act.filter(p => p.reasons.length).sort((a, b) => b.reasons.length - a.reasons.length || b.overdue - a.overdue).slice(0, 8).map(p => ({ id: p.id, name: p.name, customer: p.customer, reasons: p.reasons })),
      recent: act.slice().sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 6).map(p => ({ id: p.id, name: p.name, customer: p.customer, lastActivity: p.lastActivity, stage: p.stage })) });
  });
  route('GET', '/api/admin/insights', async () => {
    await requireAdmin('sub'); const A = await loadAll(); const auAll = await adminAuditAll(A);
    const weeks = n => Array.from({ length: n }, (_, i) => weekStart(Date.now() - (n - 1 - i) * 7 * 864e5)), days = n => Array.from({ length: n }, (_, i) => dayKey(Date.now() - (n - 1 - i) * 864e5));
    const months = n => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7); });
    const heatM = {}; auAll.filter(e => Date.now() - Date.parse(e.at) < 60 * 864e5).forEach(e => { const d = new Date(e.at); const k = d.getUTCDay() + ':' + d.getUTCHours(); heatM[k] = (heatM[k] || 0) + 1; });
    const cnt = (list, f) => { const m = {}; list.forEach(e => { const k = f(e); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const r30 = auAll.filter(e => Date.now() - Date.parse(e.at) < 30 * 864e5);
    const fbs = A.rows.reduce((a, r) => a.concat(r.fb), []); const fbk = {}; fbs.forEach(f => { const k = [f.kind, f.priority, f.status].join('|'); fbk[k] = (fbk[k] || 0) + 1; });
    const itemKinds = {}; A.rows.forEach(r => r.items.forEach(i => { const k = i.kind + '|' + ((i.data && i.data.status) || ''); itemKinds[k] = (itemKinds[k] || 0) + 1; }));
    const fl = A.rows.reduce((a, r) => a.concat(r.files), []);
    return ok({
      signups: weeks(12).map(w => ({ week: w, staff: A.users.filter(u => u.seen && weekStart(u.seen) === w).length, guests: 0 })),
      daily: days(14).map(d => ({ day: d, staff: A.users.filter(u => u.seen && dayKey(u.seen) === d).length, customers: 0 })),
      heat: Object.entries(heatM).map(([k, n]) => { const [d, h] = k.split(':'); return { d: +d, h: +h, n }; }),
      actions: cnt(r30, e => e.action).slice(0, 10).map(([action, n]) => ({ action, n })),
      actors: cnt(r30, e => { const u = A.users.find(x => x.id === e.actor); return (u && u.name) || nameFromEmail(who(A, e.actor)); }).slice(0, 8).map(([w, n]) => ({ who: w, n })),
      feedback: { byKind: Object.entries(fbk).map(([k, n]) => { const [kind, priority, status] = k.split('|'); return { kind, priority, status, n }; }), weekly: weeks(8).map(w => ({ week: w, n: fbs.filter(f => f.createdAt && weekStart(f.createdAt) === w).length })), avgHours: 0, answered: fbs.filter(f => f.status && f.status !== 'open').length },
      items: Object.entries(itemKinds).map(([k, n]) => { const [kind, st] = k.split('|'); return { kind, st, n }; }),
      storage: months(6).map(m => { const f = fl.filter(x => x.createdAt && String(x.createdAt).slice(0, 7) === m); return { month: m, n: f.length, bytes: f.reduce((a, x) => a + (x.size || 0), 0) }; })
    });
  });
  route('GET', '/api/admin/projects/:id/detail', async (b, P) => {
    await requireAdmin('sub'); const A = await loadAll(); const r = A.rows.find(x => x.p.id === P.id); if (!r) throw new HttpError(404, 'Project not found');
    const cat = {}; r.files.forEach(f => { const c = cat[f.category] = cat[f.category] || { category: f.category, n: 0, bytes: 0 }; c.n++; c.bytes += f.size || 0; });
    const k = {}; r.items.forEach(i => { k[i.kind] = (k[i.kind] || 0) + 1; });
    return ok({ members: (r.p.members || []).map(m => Object.assign(memberOut(m), { addedAt: null })), files: Object.values(cat), kinds: Object.entries(k).map(([kind, n]) => ({ kind, n })),
      log: r.au.slice().sort((a, c) => String(c.at).localeCompare(String(a.at))).slice(0, 12).map(l => ({ action: l.action, detail: l.detail || '', at: l.at, who: who(A, l.actor) })) });
  });
  route('GET', '/api/admin/users', async () => {
    await requireAdmin('sub'); const A = await loadAll();
    return ok({ users: A.users.map(u => { const em = String(u.email || '').toLowerCase(); const g = A.gm[em]; return { id: u.id, email: u.email, name: u.name || nameFromEmail(em), guest: false, disabled: !!u.disabled, createdAt: u.created || u.seen, projects: A.rows.filter(r => (r.p.members || []).some(m => m.id === u.id)).length, lastSeen: u.seen, role: SUPER_ADMINS.includes(em) ? 'super' : g ? (g.role === 'admin' ? 'admin' : 'sub') : null }; }).sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))) });
  });
  const guardUser = async (s, id) => {
    const r = await dbGet('usr', id); if (!r) throw new HttpError(404, 'User not found'); const u = r.value; const em = String(u.email).toLowerCase(); const g = await dbGet('grant', id);
    if (id === s.id || SUPER_ADMINS.includes(em)) throw new HttpError(400, 'This account cannot be changed here'); if (g && s.adminRole !== 'super') throw new HttpError(403, 'Only the platform owner can change another admin');
    return { u, em, g };
  };
  route('PATCH', '/api/admin/users/:id', async (b, P) => {
    const s = await requireAdmin('admin'); const { u } = await guardUser(s, P.id); u.disabled = !!b.disabled; await dbPut('usr', P.id, u); ADM = null;
    await audit('sys', s.id, b.disabled ? 'admin_disable_user' : 'admin_enable_user', u.email); return ok({ ok: true });
  });
  route('DELETE', '/api/admin/users/:id', async (b, P) => {
    const s = await requireAdmin('admin'); const { u, g } = await guardUser(s, P.id);
    const A = await loadAll(); for (const r of A.rows) { if ((r.p.members || []).some(m => m.id === P.id)) { r.p.members = r.p.members.filter(m => m.id !== P.id); await dbPut('projects', r.p.id, r.p); } }
    if (g) await dbDel('grant', P.id); await dbDel('usr', P.id); ADM = null; ROLE = null; await audit('sys', s.id, 'admin_remove_user', u.email); return ok({ ok: true });
  });
  route('PATCH', '/api/admin/projects/:id', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value;
    if (b.archived !== undefined) { p.archived = !!b.archived; await saveProject(p); await audit(p.id, s.id, b.archived ? 'admin_archive_project' : 'admin_restore_project', p.name); }
    ADM = null; return ok({ ok: true });
  });
  route('GET', '/api/admin/projects/:id/members', async (b, P) => { await requireAdmin('sub'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); return ok({ members: (r.value.members || []).map(m => Object.assign(memberOut(m), { addedAt: null })) }); });
  route('POST', '/api/admin/projects/:id/members', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value;
    const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
    if (!isEmail(email) || !email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(400, 'Use a Facilio office email (name@' + ALLOWED_DOMAIN + ')');
    const id = ekey(email); const u = await dbGet('usr', id); const name = (u && u.value && u.value.name) || nameFromEmail(email); if (!u) await dbPut('usr', id, { email, name, seen: null, created: now() });
    p.members = (p.members || []).filter(x => x.id !== id).concat([{ id, email, name, role }]); await saveProject(p); ADM = null; await audit(p.id, s.id, 'admin_set_member', email + ' as ' + role); return ok({ ok: true });
  });
  route('DELETE', '/api/admin/projects/:id/members/:uid', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value; const m = (p.members || []).find(x => x.id === P.uid); if (!m) throw new HttpError(404, 'Member not found');
    if (m.role === 'owner' && p.members.filter(x => x.role === 'owner').length <= 1) throw new HttpError(400, 'A project needs at least one owner. Add another owner first.');
    p.members = p.members.filter(x => x.id !== P.uid); await saveProject(p); ADM = null; await audit(p.id, s.id, 'admin_remove_member', P.uid); return ok({ ok: true });
  });
  route('GET', '/api/admin/audit', async () => {
    await requireAdmin('sub'); const A = await loadAll(); const all = (await adminAuditAll(A)).slice(0, 200);
    return ok({ entries: all.map(e => ({ id: e.id, projectId: e.projectId, project: e.project || '', actor: who(A, e.actor), action: e.action, detail: e.detail || '', at: e.at })) });
  });
  route('GET', '/api/admin/access', async () => {
    await requireAdmin('super'); const A = await loadAll();
    return ok({ owners: SUPER_ADMINS.map(e => { const u = A.users.find(x => String(x.email).toLowerCase() === e); return { email: e, name: u ? u.name : '', hasAccount: !!u, lastSeen: u ? u.seen : null }; }),
      grants: A.grants.map(g => { const v = g.value; const u = A.users.find(x => x.id === g.key); return { email: v.email, role: v.role === 'admin' ? 'admin' : 'sub', name: u ? u.name : '', hasAccount: !!u, disabled: !!(u && u.disabled), grantedBy: v.by || '', createdAt: v.at, lastSeen: u ? u.seen : null }; }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  });
  route('POST', '/api/admin/access', async (b) => {
    const s = await requireAdmin('super'); const email = str(b.email, 200, 'Email', true).toLowerCase(); if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address');
    const role = b.role === 'admin' ? 'admin' : b.role === 'sub' ? 'sub' : null; if (!role) throw new HttpError(400, 'Choose Admin or Sub admin'); if (SUPER_ADMINS.includes(email)) throw new HttpError(400, 'That email is already a platform owner');
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(403, 'Use a Facilio office email (name@' + ALLOWED_DOMAIN + ')');
    const id = ekey(email); const old = await dbGet('grant', id); const u = await dbGet('usr', id); if (!u) await dbPut('usr', id, { email, name: str(b.name, 120, 'Name') || nameFromEmail(email), seen: null, created: now() });
    await dbPut('grant', id, { email, role, by: s.email, at: (old && old.value.at) || now() }); ADM = null; ROLE = null; await audit('sys', s.id, 'admin_grant_' + role, email);
    return ok({ ok: true, created: false, tempPassword: null });
  });
  route('POST', '/api/admin/access/reset', async () => { throw new HttpError(400, 'Nobody has a separate password here. Everyone signs in with their Facilio Microsoft account.'); });
  route('POST', '/api/admin/access/revoke', async (b) => {
    const s = await requireAdmin('super'); const email = str(b.email, 200, 'Email', true).toLowerCase(); await dbDel('grant', ekey(email)); ADM = null; ROLE = null; await audit('sys', s.id, 'admin_revoke', email); return ok({ ok: true });
  });

  // customer and password sign-in do not exist in this version
  ['login', 'signup', 'guest', 'guest-login', 'upgrade', 'customer', 'password'].forEach(n => route('POST', '/api/auth/' + n, async () => { throw new HttpError(403, 'Sign-in is handled by your Facilio Microsoft account'); }));

  async function dispatch(method, path, query, body) {
    const u = new URL(path, 'https://app.local'); u.search = query || '';
    for (const r of routes) {
      if (r.method !== method) continue; const m = r.re.exec(u.pathname); if (!m) continue;
      try { const G = {}; for (const k of Object.keys(m.groups || {})) { try { G[k] = decodeURIComponent(m.groups[k]); } catch (e) { G[k] = m.groups[k]; } } return await r.fn(body, G, u.searchParams); }
      catch (e) { if (e instanceof HttpError) return { status: e.status || 500, data: Object.assign({ error: e.message }, e.extra || {}) }; console.error('API error', method, path, e && e.stack || e); return { status: 500, data: { error: 'Unexpected error: ' + (e && e.message) } }; }
    }
    return { status: 404, data: { error: 'Not found' } };
  }
  globalThis.__fwb = { dispatch, reset() { ME = null; ROLE = null; }, ekey, nameFromEmail };
}

export default async function handler(req, ctx) {
  CTX = ctx; globalThis.__fwb.reset();
  let query = req.query; if (query && typeof query === 'object') query = new URLSearchParams(query).toString(); query = String(query || '').replace(/^\?/, '');
  let body; if (req.method !== 'GET' && req.method !== 'DELETE') { const t = req.text ? await req.text() : ''; if (t) { try { body = JSON.parse(t); } catch (e) { body = {}; } } else body = {}; }
  const sub = String(req.path || '/').startsWith('/') ? req.path : '/' + req.path;
  const res = await globalThis.__fwb.dispatch(req.method, '/api' + sub, query, body);
  return new Response(JSON.stringify(res.data), { status: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
