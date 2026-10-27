/* FWB backend on facilio.work: one server function (/api/fn/api/...) that serves every /api/* route of the app.
   Identity comes from the platform (ctx.viewer, verified); data lives in ctx.db; file bytes in private ctx.files.
   Roles and project access are enforced HERE, on the server, so pages cannot bypass them. */
let CTX = null, HDR = {};   // set at the start of every request (a Lambda handles one request at a time)
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
    config_evidence: { ext: ['pdf', 'xlsx', 'csv', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'txt'], max: 20e6 },
    guide_media: { ext: ['png', 'jpg', 'jpeg'], max: 8e6 }, flow_image: { ext: ['png', 'jpg', 'jpeg', 'webp'], max: 8e6 }, showcase_image: { ext: ['png', 'jpg', 'jpeg', 'webp'], max: 5e6 },
    ticket_attachment: { ext: ['pdf', 'xlsx', 'xls', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'csv', 'txt', 'msg', 'eml'], max: 20e6 },
    report_attachment: { ext: ['pdf', 'xlsx', 'xls', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'csv', 'txt'], max: 20e6 },
    signoff_evidence: { ext: ['pdf', 'png', 'jpg', 'jpeg', 'msg', 'eml', 'docx'], max: 20e6 }, brd_signed: { ext: ['docx', 'pdf', 'json'], max: MAX_FILE }
  };
  // record kinds the team can store (customer-only rules come with the customer page)
  const KINDS = ['action', 'decision', 'raid', 'signoff', 'cr', 'onb', 'onbsub', 'onbfile', 'onbws', 'owner', 'agreement', 'minutes', 'checklist', 'build', 'uat', 'digest', 'ctrcore', 'ctrfees', 'ctrlegal', 'ctrrates', 'scope', 'modbrief', 'fieldreq', 'note', 'ctrwatch', 'usecase', 'discrepancy', 'brdrev', 'ai', 'hc', 'hcrep', 'ho', 'close', 'rep', 'kpi', 'cmodx', 'cfgrel', 'capp', 'ugd', 'vid', 'lesson', 'tkt', 'res', 'ugv', 'ugu', 'pnote', 'wb', 'news', 'interest', 'cflow'];   // cflow: combined flows saved from a whiteboard (a snapshot the BRD can include); wb: process whiteboards; news: Explore Facilio entries; interest: customer requests for more information
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
  async function dbPut(col, key, value) { try { await CTX.db.put(col, key, value); } catch (e) { throw new HttpError(e && e.status === 413 ? 413 : 502, e && e.status === 413 ? 'Record too large' : 'Could not save the record. Try again.'); } }
  async function dbDel(col, key) { await CTX.db.delete(col, key); }
  // ---------- rate limits ----------
  // Per signed-in person, per action group, fixed 10-minute windows counted in ctx.db so every server instance shares them.
  // Limits sit well above what one person does by hand (they stop scripts, loops and runaway retries, not people) and keep AI spend inside provider quotas.
  // Over the limit: HTTP 429 with a plain message and Retry-After. If the counter store itself fails the request goes ahead (a limiter must never lock people out).
  const LIMITS = { ai: [40, 600], 'ai-part': [240, 600], 'ai-image': [15, 600], 'ai-admin': [15, 600], upload: [200, 600], write: [2000, 600], ticket: [60, 600], teams: [30, 600], create: [30, 600], mail: [20, 600] };
  const LIMIT_LABEL = { ai: 'AI requests', 'ai-part': 'AI document parts', 'ai-image': 'flow image reads', 'ai-admin': 'AI key checks', upload: 'file uploads', write: 'saves', ticket: 'ticket messages', teams: 'tickets from Teams', create: 'new projects and templates', mail: 'mailbox syncs' };
  async function limit(bucket, who) {
    const L = LIMITS[bucket]; if (!L || !who) return; const [max, win] = L; const key = (bucket + '.' + who).slice(0, 127); const t = Math.floor(Date.now() / 1000), w = t - (t % win);
    let cur; try { cur = await CTX.db.get('rl', key); } catch (e) { return; }
    const v = cur && cur.value && cur.value.w === w ? cur.value : { w, n: 0 };
    if (v.n >= max) { const retryAfter = Math.max(1, w + win - t); throw new HttpError(429, 'Too many ' + LIMIT_LABEL[bucket] + ' in a short time. Try again in ' + (retryAfter >= 90 ? Math.ceil(retryAfter / 60) + ' minutes' : retryAfter + ' seconds') + '.', { retryAfter, limit: max, windowSeconds: win }); }
    try { await CTX.db.put('rl', key, { w, n: v.n + 1 }); } catch (e) { }
  }
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
    // Only Facilio accounts use Delivery Studio. The platform already limits sign-in to Facilio employees; this is a second check in the app.
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(403, 'Delivery Studio is for Facilio accounts (name@' + ALLOWED_DOMAIN + ').');
    const m = { id: ekey(email), email, name: nameFromEmail(email), kind: 'consultant', projectId: null, guest: false };
    // The disabled-user check must not be skipped: if the user record cannot be read, the request stops (503) instead of going ahead.
    let u; try { u = await dbGet('usr', m.id); } catch (e) { throw new HttpError(503, 'Delivery Studio could not check your access just now. Try again in a moment.'); }
    if (u && u.value && u.value.disabled) throw new HttpError(403, 'Your access has been switched off. Ask an admin.'); if (u && u.value && u.value.name) m.name = u.value.name;
    const stale = !u || !u.value || !u.value.seen || Date.now() - Date.parse(u.value.seen) > 6 * 3600e3;
    if (stale) { try { await dbPut('usr', m.id, Object.assign({}, u && u.value, { email, name: m.name, seen: now(), created: (u && u.value && u.value.created) || now() })); } catch (e) { } }
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
  // Project records hold the member list and archive flag, so changes re-read the record under a per-project lock and change only
  // what they mean to. A save elsewhere in the project only bumps updatedAt, and never writes back a copy loaded earlier in the request.
  // ---------- sign-off and approval rules ----------
  // Recording a decision (a sign-off signed, a change request approved or declined, hypercare exit or project closure, the BRD approved),
  // undoing one, or deleting a decided record is for project owners and admins. Editors can still draft and edit everything else.
  const decided = (kind, d) => { d = d || {}; if (kind === 'signoff') return d.status === 'signed'; if (kind === 'cr') return d.status === 'Approved' || d.status === 'Rejected';
    if (kind === 'close') return !!(d.closedAt || d.exitAt); return false; };
  const DECISION_MSG = { signoff: 'Only a project owner or an admin can record or undo a sign-off.', cr: 'Only a project owner or an admin can approve or decline a change request.', close: 'Only a project owner or an admin can record hypercare exit or close the project.' };
  function decisionGuard(kind, role, cur, next) {
    if (role === 'owner' || !DECISION_MSG[kind]) return;
    const changed = kind === 'close' ? ['closedAt', 'closedBy', 'exitAt', 'exitBy'].some(f => String((cur || {})[f] || '') !== String((next || {})[f] || '')) : decided(kind, cur) !== decided(kind, next) || (decided(kind, cur) && String((cur || {}).status) !== String((next || {}).status));
    if (changed) throw new HttpError(403, DECISION_MSG[kind]);
  }
  const brdApprovals = d => { d = d || {}; const out = { main: d.status || 'draft' }; for (const [k, v] of Object.entries(d.docs && typeof d.docs === 'object' ? d.docs : {})) out[k] = (v && v.status) || 'draft'; return out; };
  function patchProject(pid, fn) { return withLock('proj.' + pid, async () => { const r = await dbGet('projects', pid); if (!r || !r.value) throw new HttpError(404, 'Project not found'); const p = r.value; await fn(p); await saveProject(p); return p; }); }
  function touchProject(pid) { return withLock('proj.' + pid, async () => { const r = await dbGet('projects', pid); const p = r && r.value; if (!p || Date.now() - Date.parse(p.updatedAt || 0) < 30e3) return; await saveProject(p); }); }
  const audit = (pid, actor, action, detail) => dbPut('au.' + pid, Date.now().toString(36) + '-' + rid('a').slice(2, 8), { actor, action, detail: detail ? String(detail).slice(0, 500) : null, at: now() }).catch(() => { });
  const memberOut = m => ({ id: m.id, email: m.email, name: m.name, role: m.role });

  // ---------- documents (versioned JSON sections) ----------
  async function docHead(pid, section) { const r = await dbGet('doc.' + pid, section); return r ? r.value : null; }
  async function docRead(pid, section) { const h = await docHead(pid, section); if (!h) return null; return { head: h, data: await unpack('dp.' + pid, section, h) }; }
  // Serialises read-check-write for one record inside this server instance, so two saves of the same version cannot both win.
  // The platform database has no conditional write, so two different instances could still race; that limit is documented.
  const LOCKS = new Map();
  function withLock(key, fn) { const prev = LOCKS.get(key) || Promise.resolve(); const run = prev.catch(() => { }).then(fn); const tail = run.catch(() => { }); LOCKS.set(key, tail); tail.then(() => { if (LOCKS.get(key) === tail) LOCKS.delete(key); }); return run; }
  async function docWrite(s, pid, section, data, baseVersion) { return withLock('doc.' + pid + '.' + section, () => docWriteInner(s, pid, section, data, baseVersion)); }
  async function docWriteInner(s, pid, section, data, baseVersion) {
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


  // ---------- tickets: shared rules, numbering, Teams notices, e-mail intake ----------
  const TKT_STATUS = ['New', 'Open', 'In Progress', 'Waiting for Client', 'Resolved', 'Closed'], TKT_PRIO = ['Low', 'Medium', 'High', 'Urgent'];
  async function ticketSanitize(s, pid, cur, data) {
    const subject = str(data.subject, 200, 'Subject', true); const status = data.status || (cur ? cur.status : 'New');
    if (!TKT_STATUS.includes(status)) throw new HttpError(400, 'Unknown ticket status'); const priority = data.priority || 'Medium'; if (!TKT_PRIO.includes(priority)) throw new HttpError(400, 'Unknown priority');
    let n = cur && cur.n; if (!n) { const all = await itemsOf(pid, 'tkt'); n = all.reduce((m, it) => Math.max(m, Number(it.data.n) || 0), 0) + 1; }
    // the conversation is append-only through the message route; an edit can never rewrite or drop earlier messages
    const thread = cur && Array.isArray(cur.thread) ? cur.thread : (Array.isArray(data.thread) && !cur ? data.thread.slice(0, 1) : []);
    const t = now(); const resolvedAt = status === 'Resolved' || status === 'Closed' ? ((cur && cur.resolvedAt) || t) : null;
    return Object.assign({}, data, { n, subject, status, priority, thread, resolvedAt, lastActivity: cur ? t : (data.lastActivity || t), description: str(data.description, 20000, 'Description') });
  }
  async function teamsPing(project, pid, key, tk, title, assigneeEmail) {
    try {
      if (!CTX.teams || !CTX.teams.send) return; let on = ''; try { on = await CTX.secrets.get('teams_notify'); } catch (e) { }
      if (String(on).toLowerCase() !== 'on') return; // off until an owner adds the plain secret teams_notify = on
      const to = assigneeEmail ? [assigneeEmail] : undefined;
      await CTX.teams.send({ to, channel: true, title, text: tk.subject, facts: [{ title: 'Project', value: project.name }, { title: 'Status', value: tk.status }, { title: 'Priority', value: tk.priority }, { title: 'Client', value: tk.org || (tk.requester && tk.requester.name) || '—' }], actions: [{ title: 'Open ticket', url: 'https://facilio-delivery-studio.facilio.work/#/p/' + pid + '/tickets/' + key }] });
    } catch (e) { console.log('teams notice failed: ' + (e && e.message)); }
  }
  // Explore Facilio: a new "I'm interested" request is posted to the Teams channel set under Tickets > Support mailbox (same switch as the
  // client-email notices) and sent as a direct message to the project's owners. Direct messages go to project members only. Email cannot be
  // sent from the platform (the mailbox credential can only read), so Teams is the only push channel; the request also opens a Governance action.
  async function interestNotice(project, key, d) {
    try {
      const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); if (!c.teamsOn || !CTX.teams || !CTX.teams.send) return false;
      const owners = (project.members || []).filter(m => m.role === 'owner' && m.email).map(m => String(m.email).toLowerCase()).slice(0, 20);
      await CTX.teams.send({ to: owners.length ? owners : undefined, channel: c.teamsChannel || true, title: 'Interest in ' + d.title + ' · ' + project.name,
        text: 'Automated Delivery Studio notification: ' + (d.byCustomer ? (project.customer || 'The customer') : (d.byName || 'Someone')) + ' asked to hear more about "' + d.title + '" in Explore Facilio.' + (d.note ? ' Note: ' + d.note : ''),
        facts: [{ title: 'Project', value: project.name }, { title: 'Customer', value: project.customer || '—' }, { title: 'Asked by', value: (d.byName || d.by) + (d.byCustomer ? '' : ' (recorded by Facilio)') }, { title: 'Entry', value: d.title }, { title: 'Asked', value: String(d.at).replace('T', ' ').slice(0, 16) + ' UTC' }],
        actions: [{ title: 'Open the request', url: appUrl() + '/#/p/' + project.id + '/showcase' }] });
      return true;
    } catch (e) { console.log('teams interest notice failed: ' + (e && (e.status || e.message))); return false; }
  }
  async function ticketNotify(project, key, cur, data, s) {
    // Direct Teams messages only go to project members, so an editor cannot make the bot message an arbitrary person.
    const id = 'TKT-' + data.n; const ae0 = String(data.assignee && data.assignee.email || '').toLowerCase(); const ae = ae0 && (project.members || []).some(m => String(m.email || '').toLowerCase() === ae0) ? ae0 : undefined; const was = cur || {};
    if (!cur) return teamsPing(project, project.id, key, data, id + ' created', ae);
    if ((was.assignee && was.assignee.email) !== ae && ae) return teamsPing(project, project.id, key, data, id + ' assigned to ' + (data.assignee.name || ae), ae);
    if (was.status !== data.status) return teamsPing(project, project.id, key, data, id + ' is now ' + data.status, ae);
    if (was.priority !== data.priority) return teamsPing(project, project.id, key, data, id + ' priority is now ' + data.priority, ae);
  }
  async function ticketAppend(s, pid, key, msg, extra) {
    return withLock('it.' + pid + '.tkt.' + key, async () => {
      const col = 'it.' + pid + '.tkt', pcol = 'ip.' + pid + '.tkt'; const row = await dbGet(col, key); if (!row) throw new HttpError(404, 'Ticket not found'); const head = row.value, cur = await unpack(pcol, key, head);
      const m = { id: rid('m'), at: now(), by: msg.by || s.name || s.email, byEmail: msg.byEmail || s.email, type: msg.type, text: str(msg.text, 20000, 'Message', true), attachments: (msg.attachments || []).slice(0, 10).map(a => ({ name: String(a.name || '').slice(0, 200), fileId: a.fileId ? String(a.fileId).slice(0, 80) : undefined, note: a.note ? String(a.note).slice(0, 200) : undefined })), ref: msg.ref ? String(msg.ref).slice(0, 300) : undefined };
      const data = Object.assign({}, cur, extra || {}, { thread: (cur.thread || []).concat([m]).slice(-300), lastActivity: m.at });
      if (cur.status === 'Waiting for Client' && m.type === 'inbound') data.status = 'Open'; // a client reply puts the ticket back in the team's hands
      data.hist = (cur.hist || []).concat([{ at: m.at, who: m.by, side: 'facilio', event: m.type === 'note' ? 'Added an internal note' : m.type === 'inbound' ? 'Client message received' : 'Replied to the client' }]).slice(-40);
      if (JSON.stringify(data).length > 150000) throw new HttpError(413, 'This ticket has reached its size limit. Open a follow-up ticket.');
      const nh = Object.assign({}, head, { v: head.v + 1, ub: s.id, ua: m.at }); await save(col, pcol, key, nh, data, head.z); return itemOut('tkt', key, nh, data);
    });
  }

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
  // knowledge library: lessons marked reusable, from the projects this person can already open (nothing else is exposed)
  route('GET', '/api/knowledge', async () => {
    const s = await me(); const ar = await adminRole(s); const rows = (await dbList('projects')).map(r => r.value).filter(p => p && !p.archived);
    const mine = ar ? rows : rows.filter(p => (p.members || []).some(m => m.id === s.id)); const out = [];
    for (const p of mine.slice(0, 200)) { for (const it of await itemsOf(p.id, 'lesson')) { const d = it.data || {}; if (!d.reusable) continue; out.push({ id: it.id, projectId: p.id, project: p.name, title: String(d.title || '').slice(0, 200), area: d.area || '', impact: d.impact || '', what: String(d.what || '').slice(0, 2000), reco: String(d.reco || '').slice(0, 2000), at: it.updatedAt }); } }
    out.sort((a, b) => String(b.at).localeCompare(String(a.at))); return ok({ items: out.slice(0, 1000) });
  });
  route('POST', '/api/projects', async (b) => {
    const s = await me(); await limit('create', s.id); const id = rid('p'); const t = now(); const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const p = { id, name: str(b.name, 160, 'Project name', true), customer: str(b.customer, 160, 'Customer name', true), description: str(b.description, 4000, 'Description'), startDate: d(b.startDate), endDate: d(b.endDate), customerAccessEnabled: false, archived: false, createdBy: s.id, createdAt: t, updatedAt: t, members: [{ id: s.id, email: s.email, name: s.name, role: 'owner' }] };
    await dbPut('projects', id, p);
    const team = Array.isArray(b.team) ? b.team.slice(0, 50) : [], stakeholders = Array.isArray(b.stakeholders) ? b.stakeholders.slice(0, 100) : [];
    await docWrite(s, id, 'people', { team, stakeholders }, 0);
    await audit(id, s.id, 'project-created', p.name); return ok({ project: projectOut(p, 'owner') }, 201);
  });
  route('GET', '/api/projects/:id', async (b, P) => { const s = await me(); const { project, role } = await projectAccess(s, P.id, 'read'); return ok({ project: projectOut(project, role), members: (project.members || []).map(memberOut) }); });
  route('PATCH', '/api/projects/:id', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const project = await patchProject(P.id, project => { if (b.name !== undefined) project.name = str(b.name, 160, 'Project name', true); if (b.customer !== undefined) project.customer = str(b.customer, 160, 'Customer', true);
    if (b.description !== undefined) project.description = str(b.description, 4000, 'Description'); if (b.startDate !== undefined) project.startDate = d(b.startDate); if (b.endDate !== undefined) project.endDate = d(b.endDate); });
    await audit(P.id, s.id, 'project-updated', null); return ok({ project: projectOut(project, (await projectAccess(s, P.id, 'read')).role) });
  });
  route('DELETE', '/api/projects/:id', async (b, P) => { const s = await me(); await projectAccess(s, P.id, 'owner'); await patchProject(P.id, p => { p.archived = true; }); await audit(P.id, s.id, 'project-archived', null); return ok({ ok: true }); });
  route('POST', '/api/projects/:id/members', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'owner'); const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
    if (!/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(400, 'Use a Facilio office email (name@' + ALLOWED_DOMAIN + ')');
    const id = ekey(email); const u = await dbGet('usr', id); const name = (u && u.value && u.value.name) || nameFromEmail(email); const m = { id, email, name, role };
    await patchProject(P.id, p => { const ow = (p.members || []).filter(x => x.role === 'owner'); if (role !== 'owner' && ow.length === 1 && ow[0].id === id) throw new HttpError(400, 'A project needs at least one owner. Make someone else an owner first.'); p.members = (p.members || []).filter(x => x.id !== id).concat([m]); });
    if (!u) await dbPut('usr', id, { email, name, seen: null }).catch(() => { });
    await audit(P.id, s.id, 'member-added', email + ' as ' + role); return ok({ member: memberOut(m) }, 201);
  });
  route('DELETE', '/api/projects/:id/members/:uid', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'owner');
    await patchProject(P.id, project => { const owners = (project.members || []).filter(m => m.role === 'owner'); if (owners.length === 1 && owners[0].id === P.uid) throw new HttpError(400, 'A project needs at least one owner');
      project.members = (project.members || []).filter(m => m.id !== P.uid); }); await audit(P.id, s.id, 'member-removed', P.uid); return ok({ ok: true });
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
    const s = await me(); const { project, role } = await projectAccess(s, P.id, 'edit'); if (!DOC_SECTIONS.test(P.section)) throw new HttpError(400, 'Invalid section');
    if (!b || b.data === undefined) throw new HttpError(400, 'data is required');
    if (P.section === 'brddoc' && role !== 'owner') { const was = brdApprovals((await docRead(P.id, 'brddoc') || {}).data), now_ = brdApprovals(b.data);
      for (const k of new Set([...Object.keys(was), ...Object.keys(now_)])) if ((was[k] === 'approved') !== (now_[k] === 'approved')) throw new HttpError(403, 'Only a project owner or an admin can approve a BRD or reopen an approved one.'); }
    const v = await docWrite(s, P.id, P.section, b.data, Number.isInteger(b.baseVersion) ? b.baseVersion : -1); await touchProject(P.id); return ok({ version: v });
  });

  // ---------- AI assistant (server-side only; keys never reach the browser) ----------
  const AI_TASKS = {
    brd: { title: 'BRD draft', kinds: ['decision', 'usecase', 'scope', 'raid', 'action'], docs: ['workshop', 'planner', 'brddoc', 'reviews'], ask: 'Draft the requested section(s) of the Business Requirements Document from the approved project information. Use the standard BRD structure (document info, summary, scope and exclusions, stakeholders, processes, functional and non-functional requirements, business rules and acceptance criteria, integrations and data, reports, roles, dependencies/assumptions/constraints, risks and open questions, traceability).' },
    gaps: { title: 'Missing requirements check', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase', 'scope', 'raid', 'action', 'discrepancy'], docs: ['config_digest', 'workshop', 'planner', 'brddoc', 'reviews'], ask: 'Review the information and list missing requirements, contradictions, unanswered questions and risks before BRD sign-off.' },
    uat: { title: 'UAT plan and test cases', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase', 'uat', 'checklist', 'build'], docs: ['config_digest', 'workshop', 'brddoc'], ask: 'Create a UAT plan (objectives, scope, approach, entry and exit criteria, roles, environment, test data, schedule, defect process, sign-off) and a table of test cases (ID, requirement ref, scenario, preconditions, steps, expected result). Leave Actual result, Status, Defect and Tester blank: only a human tester records them. Mark tests with no source requirement as "Suggested additional test".' },
    ftr: { title: 'FTR report', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'uat', 'build', 'raid', 'signoff', 'cr'], docs: ['brddoc', 'plan'], ask: 'Prepare an FTR report skeleton. No definition of FTR is recorded in the sources unless one appears in them: if none does, say "FTR definition unconfirmed" at the top and use a neutral structure (summary, scope reviewed, configuration summary, requirements and traceability, test coverage and results, open defects and limitations, deviations, risks, evidence, next actions, approvals). Quote results only if they exist in the sources.' },
    ftrrows: { title: 'FTR scenarios (suggested)', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase', 'build', 'uat'], docs: ['config_digest', 'brddoc', 'config', 'workshop'], ask: 'Suggest test scenarios for the FTR workbook. Return ONLY a Markdown table with the columns: Test Scenario | Steps to Reproduce | Expected Outcome | Portal | Can be accessed by Role. One row per scenario, numbered steps separated by " / ". Base every row on the sources (use cases, decisions, configuration). Do not include results, pass/fail, screenshots or approvals: those come from a human tester. If the sources do not support a scenario, do not add it.' },
    guide: { title: 'Customer user guide', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase', 'build'], docs: ['config_digest', 'guide_published', 'workshop', 'config'], ask: 'Draft a customer-friendly user guide outline with role-based procedures. Only describe UI controls and steps that appear in the sources; for anything else write "[Screenshot or source needed]". Exclude internal notes, fees and contract detail.' },
    config: { title: 'Configuration documentation', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'build'], docs: ['config_digest', 'config', 'workshop'], ask: 'Document the configuration (modules, forms and fields, workflows, notifications, roles, integrations, import mappings, reports, known limitations). Mark each statement as Confirmed (in the sources) or Needs manual verification.' },
    workshop: { title: 'Workshop intelligence', kinds: ['decision', 'action', 'usecase', 'raid', 'minutes'], docs: ['workshop', 'planner', 'transcripts'], ask: 'From the workshop information: propose agenda items, module-specific discovery questions, decisions, actions, assumptions, risks, candidate requirements, contradictions between sessions and follow-up questions. All findings are proposals for review.' },
    golive: { title: 'Go-live readiness review', kinds: ['checklist', 'uat', 'build', 'raid', 'signoff', 'cr', 'hc'], docs: ['plan'], ask: 'Review the recorded evidence against go-live criteria (approved scope/BRD, configuration verified, data migration, integrations, UAT sign-off, critical defects, training, documentation, access, rollback plan, support ownership, customer approval). List blockers, risks, missing or contradictory evidence and suggested owners. Do not give a confidence score; the decision belongs to authorised people.' },
    hypercare: { title: 'Hypercare status report', kinds: ['hc', 'hcrep', 'raid', 'action'], docs: [], ask: 'Write today\'s hypercare status report from the recorded issues: summary, open issues by severity, recurring patterns, workarounds, customer feedback, and recommended follow-ups. Do not close issues or change severity.' },
    handover: { title: 'Support handover pack', kinds: ['cmodx', 'cfgrel', 'capp', 'lesson', 'ho', 'hc', 'raid', 'signoff', 'build', 'uat'], docs: ['config_digest', 'brddoc', 'config', 'plan'], ask: 'Assemble a support handover pack outline from the recorded artifacts (solution overview, configuration inventory, integrations, known issues and workarounds, outstanding defects, support procedures and contacts, access handover, training, hypercare summary, open actions) and list the missing documents.' },
    wsr: { title: 'Weekly status report (WSR)', kinds: ['action', 'decision', 'raid', 'cr', 'uat', 'build', 'hc'], docs: ['plan'], ask: 'Write a weekly status report with these sections: Overall status (RAG with reason), Progress this week, Planned next week, Milestones and dates, Risks and issues, Decisions and customer actions needed, Change requests, Attachments to include. Use only recorded facts; leave a section as "No information recorded" when the sources have none.' },
    monthly: { title: 'Monthly report', kinds: ['action', 'decision', 'raid', 'cr', 'uat', 'build', 'signoff', 'hc'], docs: ['plan'], ask: 'Write a monthly project report with these sections: Executive summary, Progress against plan, Milestones achieved and upcoming, Deliverables status, Risks and issues, Change requests, Customer actions outstanding, Next month focus. Use only recorded facts and say where information is missing.' },
    pkg: { title: 'Org package analysis', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase'], docs: ['config_digest', 'config', 'workshop'], ask: 'Analyse the organisation configuration digest. Summarise what is configured; for each custom module state its apparent purpose, fields that matter, which app tabs show it and which roles use it; describe how modules relate (relationships, lookups, buttons); list gaps, inconsistencies and questions to confirm with the customer. Use only the digest and records. Do not guess a purpose that is not stated; write Missing instead.' },
    training: { title: 'Training material outline', kinds: ['cmodx', 'cfgrel', 'capp', 'decision', 'usecase'], docs: ['config_digest', 'guide_published', 'workshop'], ask: 'Draft a role-based training outline: for each role, which apps and tabs they use, the modules they work in, the key tasks (steps only where the sources describe them), and how the custom modules and their relationships behave. Mark anything not in the sources as Missing.' },
    vidguide: { title: 'Steps from a recorded walkthrough', kinds: [], docs: [], ask: 'Turn the walkthrough transcript into clear end-user steps. Use a short title, a one-line purpose, then numbered steps in the order shown. Describe only what the transcript or the screenshot captions say: do not invent buttons, menu names or fields. After a step that a screenshot illustrates, write its marker on its own line, for example [F2]. Write Missing for anything unclear and list questions to confirm at the end.' },
    closure: { title: 'Project closure report', kinds: ['ho', 'hc', 'signoff', 'cr', 'raid', 'decision'], docs: ['plan', 'brddoc'], ask: 'Draft a project closure report (outcomes against scope, changes, deliveries, issues, lessons learned, open items and owners). State only what the records show.' }
  };
  const AI_SYSTEM = 'You are an implementation consultant\'s assistant inside Facilio\'s Delivery Studio. Work only from the SOURCES supplied for this one project. Cite sources inline as [S1], [S2]. Label statements as Confirmed (stated in a source), Assumption, Suggestion or Missing information. Never invent customer decisions, approvals, sign-offs, test results, configuration details or completion status. If a source is absent, say so. Your output is a DRAFT for human review; you cannot approve, publish, close or change records. Write clear Markdown.';
  const clip = (v, n) => { let t = typeof v === 'string' ? v : JSON.stringify(v); return t.length > n ? t.slice(0, n) + ' …[truncated]' : t; };
  async function aiContext(pid, task, small) {
    const T = AI_TASKS[task]; const src = []; let text = ''; let n = 0;
    for (const d of T.docs) { const r = await docRead(pid, d).catch(() => null); if (r && r.data && Object.keys(r.data).length) { n++; src.push({ ref: 'S' + n, label: 'Document: ' + d }); text += `\n[S${n}] Document "${d}":\n${clip(r.data, d === 'config_digest' ? (small ? (task === 'pkg' ? 9000 : 4000) : 12000) : (small ? 2000 : 5000))}\n`; } }
    for (const k of T.kinds) { const rows = await itemsOf(pid, k).catch(() => []); const live = rows.filter(r => !(r.data && (r.data.superseded === true || r.data.status === 'superseded'))); rows.length = 0; rows.push(...live); if (rows.length) { n++; src.push({ ref: 'S' + n, label: 'Records: ' + k + ' (' + rows.length + ')' }); text += `\n[S${n}] Records "${k}" (${rows.length}):\n${clip(rows.slice(0, small ? 25 : 40).map(r => Object.assign({ id: r.id }, r.data, { hist: undefined })), small ? 2000 : 3500)}\n`; } }
    return { src, text: text.slice(0, small ? 13000 : 26000) };
  }
  // ---------- AI providers: DeepSeek (default, Facilio-hosted) and Claude (optional, explicit) ----------
  // The Claude key is a PLAIN secret named anthropic_api_key, managed by the app owner at secrets.facilio.work (apps cannot write secrets).
  // It is read only here, on the server, and is never returned, logged or stored in the database.
  const PROVIDERS = ['deepseek', 'claude'];
  const PNAME = { deepseek: 'DeepSeek', claude: 'Claude' };
  // Key sources, in order: the owner's plain secret anthropic_api_key, or a key an admin saved in the app. A saved key is encrypted (AES-256-GCM) with a master key that lives only in the plain secret ai_master_key; the database never holds it readable, and it is never returned, logged or sent to the browser.
  const b64 = u8 => Buffer.from(u8).toString('base64'), unb64 = t => new Uint8Array(Buffer.from(t, 'base64'));
  async function masterKey() { let m = ''; try { m = String(await CTX.secrets.get('ai_master_key') || ''); } catch (e) { } if (m.length < 16) return null; const raw = await crypto.subtle.digest('SHA-256', te.encode(m)); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  async function sealKey(plain) { const k = await masterKey(); if (!k) return null; const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(plain)); return { iv: b64(iv), ct: b64(new Uint8Array(ct)) }; }
  async function openKey(rec) { try { const k = await masterKey(); if (!k || !rec) return ''; return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, k, unb64(rec.ct))); } catch (e) { return ''; } }
  const claudeKey = async () => { let k = ''; try { k = (await CTX.secrets.get('anthropic_api_key')) || ''; } catch (e) { } if (k) return k; const r = await dbGet('ai', 'key').catch(() => null); return r && r.value ? openKey(r.value) : ''; };
  const keySource = async () => { let k = ''; try { k = (await CTX.secrets.get('anthropic_api_key')) || ''; } catch (e) { } if (k) return 'secret'; const r = await dbGet('ai', 'key').catch(() => null); return r && r.value ? 'app' : ''; };
  // checks a key against Anthropic without spending tokens: GET /v1/models lists what the key can use
  async function checkAnthropic(key) {
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000);
    try { const r = await fetch('https://api.anthropic.com/v1/models?limit=20', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, signal: ac.signal }); const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) return { ok: false, message: 'Anthropic rejected this key. Check that it was copied in full and has not been revoked.' };
      if (r.status === 429) return { ok: false, message: 'Anthropic is rate limiting this key right now. The key may be fine; try again shortly.' };
      if (!r.ok) return { ok: false, message: 'Anthropic returned an error (' + r.status + '). Try again later.' };
      const models = (j.data || []).map(m => m.id).filter(Boolean); return { ok: true, models, message: models.includes('claude-sonnet-5-5') ? 'The key works and claude-sonnet-5-5 is available.' : 'The key works, but claude-sonnet-5-5 was not in its model list' + (models.length ? ' (it can use ' + models.slice(0, 3).join(', ') + ').' : '.') };
    } catch (e) { return { ok: false, message: e && e.name === 'AbortError' ? 'Anthropic took too long to answer.' : 'Anthropic could not be reached from the server.' }; } finally { clearTimeout(to); }
  }
  const haveClaude = async () => !!(await claudeKey());
  async function aiCfg() { const r = await dbGet('ai', 'cfg').catch(() => null); const v = (r && r.value) || {}; return { defaultProvider: v.defaultProvider === 'claude' ? 'claude' : 'deepseek', fallback: v.fallback === 'deepseek' ? 'deepseek' : 'none', by: v.by || null, at: v.at || null }; }
  const emptyUse = () => ({ calls: 0, errors: 0, inTok: 0, outTok: 0, last: null, lastError: null });
  async function aiUse() { const r = await dbGet('ai', 'use').catch(() => null); const v = (r && r.value) || {}; const o = {}; for (const p of PROVIDERS) o[p] = Object.assign(emptyUse(), v[p] || {}); return o; }
  // usage is recorded only from what the provider reports; no prompts, keys or response text are stored
  async function aiNote(provider, okay, usage, errCode) {
    try { const u = await aiUse(); const x = u[provider]; x.calls += 1; x.last = now(); if (okay) { if (usage) { x.inTok += Number(usage.in) || 0; x.outTok += Number(usage.out) || 0; } } else { x.errors += 1; x.lastError = { at: now(), code: String(errCode || 'error').slice(0, 60) }; } await dbPut('ai', 'use', u); } catch (e) { /* visibility only; never block the task */ }
  }
  async function callClaude(messages, maxTokens, budget = 21000) {
    const key = await claudeKey(); if (!key) throw new HttpError(409, 'Claude is not configured. The app owner needs to add the Claude API key in the secrets portal.');
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), Math.max(4000, Math.min(21000, budget - 1500)));
    try {
      const model = 'claude-sonnet-5-5'; const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n'); const rest = messages.filter(m => m.role !== 'system');   // user content may be text or [{type:'image'},{type:'text'}] blocks
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: maxTokens, system: sys, messages: rest }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const code = 'http_' + r.status; await aiNote('claude', false, null, code); throw new HttpError(r.status === 429 ? 429 : r.status === 401 || r.status === 403 ? 409 : 502, r.status === 429 ? 'Claude is rate limited right now. Try again shortly.' : r.status === 401 || r.status === 403 ? 'Claude rejected the configured API key. The app owner needs to check it.' : 'Claude returned an error (' + r.status + ').'); }
      const text = (j.content || []).map(c => c.text || '').join(''); if (!text) { await aiNote('claude', false, null, 'empty'); throw new HttpError(502, 'Claude returned no text'); }
      await aiNote('claude', true, j.usage ? { in: j.usage.input_tokens, out: j.usage.output_tokens } : null);
      return { text, provider: 'Claude', model };
    } catch (e) { if (e instanceof HttpError) throw e; await aiNote('claude', false, null, e && e.name === 'AbortError' ? 'timeout' : 'network'); throw new HttpError(e && e.name === 'AbortError' ? 504 : 502, e && e.name === 'AbortError' ? 'Claude took too long. Try a narrower request.' : 'Claude could not be reached. Try again.'); }
    finally { clearTimeout(to); }
  }
  // The server function has 25 s in all (the gateway cuts the round trip at ~29 s), so every model call is time-boxed well inside that,
  // and a long document is written part by part (see /ai/job below) instead of in one long call.
  const timeBox = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => { const e = new Error('time box'); e.name = 'AbortError'; rej(e); }, ms); })]).finally(() => clearTimeout(t)); };
  async function callDeepseek(messages, maxTokens, budget = 21000) {
    const to = null;
    try {
      const r = await timeBox(CTX.llm({ messages, max_tokens: Math.min(maxTokens, 1800), temperature: 0.2 }), Math.max(4000, Math.min(21000, budget)));
      const text = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content; if (!text) { await aiNote('deepseek', false, null, 'empty'); throw new HttpError(502, 'The AI returned no text'); }
      const us = r.usage ? { in: r.usage.prompt_tokens || r.usage.input_tokens, out: r.usage.completion_tokens || r.usage.output_tokens } : null;
      await aiNote('deepseek', true, us);
      return { text, provider: 'DeepSeek', model: r.model || 'default' };
    } catch (e) { if (e instanceof HttpError) throw e; const ab = e && e.name === 'AbortError'; const st = Number(e && (e.status || e.statusCode)) || 0;
      console.error('deepseek call failed', ab ? 'timeout' : (st || '') + ' ' + String(e && e.message || e).slice(0, 160));   // the reason only, never the prompt or the answer
      await aiNote('deepseek', false, null, ab ? 'timeout' : st === 429 ? 'rate' : 'error');
      if (st === 429 || /rate|limit|quota|cap/i.test(String(e && e.message))) throw new HttpError(429, 'The AI service limit for your account was reached (about 20 requests a minute, plus a daily cost cap). Wait a minute and try again.');
      throw new HttpError(ab ? 504 : 502, ab ? 'The AI took too long. Try a narrower request.' : 'The AI service could not be reached. Try again.'); }
  }
  // provider: 'deepseek' | 'claude'. An explicit choice is never changed silently: a fallback happens only when the organisation policy allows it, and the notice says so.
  // smaller(): optional, returns the DeepSeek-sized messages to use when Claude falls back to DeepSeek
  async function callModel(messages, maxTokens, provider, fallback, smaller, budget = 21000) {
    const t0 = Date.now(); const left = () => budget - (Date.now() - t0);
    if (provider !== 'claude') return callDeepseek(messages, maxTokens, budget);
    try { return await callClaude(messages, maxTokens, budget); }
    catch (e) { if (fallback === 'deepseek' && e instanceof HttpError && left() > 6000) { let out; try { out = await callDeepseek(smaller ? await smaller() : messages, maxTokens, left()); } catch (e2) { if (e2 instanceof HttpError) e2.fellBack = true; throw e2; } out.notice = 'Claude was not available (' + e.message + ') so DeepSeek produced this draft, as the organisation fallback setting allows.'; out.fellBack = true; return out; } throw e; }
  }
  const pickProvider = async (asked) => { const cfg = await aiCfg(); const explicit = asked === 'claude' || asked === 'deepseek'; let p = explicit ? asked : cfg.defaultProvider; if (!explicit && p === 'claude' && !(await haveClaude())) p = 'deepseek'; return { provider: p, explicit, cfg }; };
  route('GET', '/api/ai/status', async () => { await me(); const cfg = await aiCfg(); const have = await haveClaude(); const defaultProvider = cfg.defaultProvider === 'claude' && !have ? 'deepseek' : cfg.defaultProvider; return ok({ providers: [{ id: 'deepseek', name: 'DeepSeek', configured: true, isDefault: defaultProvider === 'deepseek' }, { id: 'claude', name: 'Claude', configured: have, isDefault: defaultProvider === 'claude' }], defaultProvider, fallback: cfg.fallback, claude: have, tasks: Object.keys(AI_TASKS), ...(await adminRole(await me()) ? { keySource: await keySource(), canStoreKey: !!(await masterKey()) } : {}) }); });
  route('POST', '/api/admin/ai/config', async (b) => {
    const s = await requireAdmin('admin'); const dp = String(b && b.defaultProvider || 'deepseek'); const fb = String(b && b.fallback || 'none'); if (!PROVIDERS.includes(dp)) throw new HttpError(400, 'Choose DeepSeek or Claude'); if (!['none', 'deepseek'].includes(fb)) throw new HttpError(400, 'Choose a fallback option');
    if (dp === 'claude' && !(await haveClaude())) throw new HttpError(409, 'Claude is not configured yet, so it cannot be the default. Add the key in the secrets portal first.');
    await dbPut('ai', 'cfg', { defaultProvider: dp, fallback: fb, by: s.email, at: now() }); return ok({ defaultProvider: dp, fallback: fb });
  });
  route('POST', '/api/admin/ai/key', async (b) => {
    const s = await requireAdmin('admin'); await limit('ai-admin', s.id); const key = String(b && b.key || '').trim();
    if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(key)) throw new HttpError(400, 'That does not look like an Anthropic API key. Keys start with sk-ant-.');
    if (!(await masterKey())) throw new HttpError(409, 'Saving a key here needs an encryption secret first. The app owner adds a plain secret named ai_master_key (any long random text) at secrets.facilio.work. Or add the key itself as anthropic_api_key there.');
    const chk = await checkAnthropic(key); if (!chk.ok) throw new HttpError(422, chk.message);
    await dbPut('ai', 'key', Object.assign(await sealKey(key), { by: s.email, at: now() })); await audit('ai', s.id, 'ai-key-saved', ''); return ok({ ok: true, message: chk.message, models: chk.models.slice(0, 10) });
  });
  route('DELETE', '/api/admin/ai/key', async () => {
    const s = await requireAdmin('admin'); await dbDel('ai', 'key').catch(() => { }); const cfg = await aiCfg(); if (cfg.defaultProvider === 'claude' && !(await haveClaude())) await dbPut('ai', 'cfg', { defaultProvider: 'deepseek', fallback: cfg.fallback, by: s.email, at: now() });
    await audit('ai', s.id, 'ai-key-removed', ''); const still = await keySource(); return ok({ ok: true, message: still === 'secret' ? 'The saved key was removed. A key set as the anthropic_api_key secret is still in use; only the app owner can remove that.' : 'The key was removed. DeepSeek stays in use.' });
  });
  route('POST', '/api/admin/ai/test', async () => {
    const s = await requireAdmin('admin'); await limit('ai-admin', s.id); if (!(await haveClaude())) return ok({ ok: false, configured: false, message: 'No Claude key is configured. The app owner adds it as anthropic_api_key in the secrets portal.' });
    try { const k = await claudeKey(); const c = await checkAnthropic(k); if (!c.ok) return ok({ ok: false, configured: true, message: c.message }); return ok({ ok: true, configured: true, model: 'claude-sonnet-5-5', models: c.models.slice(0, 10), message: c.message }); }
    catch (e) { return ok({ ok: false, configured: true, message: e instanceof HttpError ? e.message : 'The test failed' }); }
  });
  route('GET', '/api/admin/ai/usage', async () => { await requireAdmin('admin'); const u = await aiUse(); const cfg = await aiCfg(); return ok({ usage: u, cfg, claudeConfigured: await haveClaude() }); });
  route('POST', '/api/projects/:id/ai/run', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const task = String(b && b.task || ''); const T = AI_TASKS[task]; if (!T) throw new HttpError(400, 'Unknown AI task'); await limit('ai', s.id);
    const instruction = str(b.instruction, 1500, 'Instruction'); const pv = await pickProvider(String(b.provider || ''));
    let tplText = ''; if (b.templateId) { const h = await tplHead(String(b.templateId)); if (!(await tplCanRead(s, h)) || h.status === 'retired') throw new HttpError(404, 'Template not available'); if (h.kind && TPL_TASK[h.kind] && TPL_TASK[h.kind] !== task) throw new HttpError(400, 'That template is for a different deliverable'); const td = await tplData(h, h.pub || h.latest); tplText = String(td && td.body || '').slice(0, 6000); }
    let vidId = ''; if (task === 'vidguide') { vidId = String(b.vid || ''); if (!ITEM_ID_RE.test(vidId)) throw new HttpError(400, 'Choose a walkthrough'); }
    // the sources and prompt for one size (DeepSeek takes the smaller context, Claude the larger)
    const build = async small => {
      let { src, text } = await aiContext(P.id, task, small);
      if (task === 'vidguide') { const vr = await dbGet('it.' + P.id + '.vid', vidId); if (!vr || !vr.value) throw new HttpError(404, 'Walkthrough not found'); const vd = await unpack('ip.' + P.id + '.vid', vidId, vr.value); const mm = t => (t == null ? '' : '[' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '] ');
        const tr = (vd.transcript || []).map(x => mm(x.t) + x.text).join('\n').slice(0, small ? 8000 : 18000); const fr = (vd.frames || []).map((f, i) => 'F' + (i + 1) + ' at ' + mm(f.t).trim() + ': ' + (f.caption || '(no caption)')).join('\n').slice(0, 2500);
        src = [{ ref: 'S1', label: 'Walkthrough transcript: ' + (vd.title || 'untitled') }, { ref: 'S2', label: 'Screenshots (' + (vd.frames || []).length + ')' }]; text = `\n[S1] Walkthrough "${vd.title || ''}" transcript:\n${tr}\n\n[S2] Screenshots (place the marker after the step it shows):\n${fr}\n`; }
      const user = `TASK: ${T.ask}\n${instruction ? 'EXTRA INSTRUCTION FROM THE CONSULTANT: ' + instruction + '\n' : ''}${tplText ? 'FOLLOW THIS TEMPLATE STRUCTURE (headings and order; fill only from the sources, leave a heading with "Missing" when no source supports it):\n' + tplText + '\n' : ''}\nSOURCES (the only project information you may use):${text || '\n(No project records were found for this task. Say what is missing.)'}`;
      return { src, text, messages: [{ role: 'system', content: AI_SYSTEM }, { role: 'user', content: user }] };
    };
    const big = await build(pv.provider !== 'claude'); let small = pv.provider !== 'claude'; let used = big; let smallBuilt = null;
    const smaller = async () => { smallBuilt = smallBuilt || await build(true); return smallBuilt.messages; };
    // one time-boxed call (the browser uses the part-by-part /ai/job flow for full documents; this route stays for short tasks and the Teams tools)
    let out = await callModel(big.messages, small ? 900 : 1600, pv.provider, pv.cfg.fallback, smaller, 21000); if (out.fellBack) { used = smallBuilt || big; small = true; }
    const src = used.src;
    const id = rid('ai'); const t = now(); const data = { task, title: T.title, status: 'draft', content: out.text, sources: src, vid: vidId || undefined, provider: out.provider, model: out.model, notice: out.notice || undefined, instruction, by: s.name || s.email, version: 1, hist: [{ at: t, who: s.name || s.email, side: 'facilio', event: 'AI draft generated' }] };
    await save('it.' + P.id + '.ai', 'ip.' + P.id + '.ai', id, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, data, undefined);
    await audit(P.id, s.id, 'ai-draft', task + ' via ' + out.provider + (out.notice ? ' (fallback)' : '')); return ok({ item: itemOut('ai', id, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, data) }, 201);
  });
  /* ---------- flow image -> editable diagram (Process Whiteboard) ----------
     The image is analysed by Claude (the only configured provider that reads images; the platform model is text only). The model's answer is untrusted:
     it is parsed as JSON and rebuilt field by field against a fixed schema, so only known node kinds, short plain-text labels and edges between known nodes survive.
     Nothing is stored here; the page shows the result for review and the person decides what goes on the board. */
  const FLOW_KINDS = ['start', 'end', 'state', 'process', 'decision'], FLOW_CONF = ['detected', 'inferred', 'uncertain'];
  const plain = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  function validFlowGraph(raw) {
    let j = raw; if (typeof j === 'string') { const m = j.match(/\{[\s\S]*\}/); if (!m) throw new HttpError(502, 'The image could not be read as a flow'); try { j = JSON.parse(m[0]); } catch (e) { throw new HttpError(502, 'The image could not be read as a flow'); } }
    if (!j || typeof j !== 'object' || !Array.isArray(j.nodes) || !Array.isArray(j.edges)) throw new HttpError(502, 'The image could not be read as a flow');
    const ids = new Set(), nodes = [], edges = [], dropped = [];
    for (const n of j.nodes.slice(0, 80)) {
      const id = plain(n && n.id, 24).replace(/[^A-Za-z0-9_-]/g, ''); const label = plain(n && n.label, 80);
      if (!id || ids.has(id)) { dropped.push('node with a missing or repeated id'); continue; }
      ids.add(id); nodes.push({ id, label: label || '(unreadable)', kind: FLOW_KINDS.includes(n.kind) ? n.kind : 'state', confidence: !label ? 'uncertain' : FLOW_CONF.includes(n.confidence) ? n.confidence : 'uncertain' });
    }
    for (const e of j.edges.slice(0, 160)) {
      const from = plain(e && e.from, 24), to = plain(e && e.to, 24);
      if (!ids.has(from) || !ids.has(to)) { dropped.push('connection to a node that is not in the diagram'); continue; }
      edges.push({ from, to, label: plain(e.label, 60), confidence: FLOW_CONF.includes(e.confidence) ? e.confidence : 'uncertain' });
    }
    if (j.nodes.length > 80 || j.edges.length > 160) dropped.push('the diagram was larger than 80 steps or 160 connections; the rest was left out');
    return { title: plain(j.title, 80), nodes, edges, dropped: [...new Set(dropped)], notes: plain(j.notes, 400) };
  }
  const FLOW_PROMPT = `You read flowcharts and state flow diagrams from images and return their structure. Answer with JSON only, no prose, in exactly this shape:
{"title": string, "nodes": [{"id": "n1", "label": string, "kind": "start"|"end"|"state"|"process"|"decision", "confidence": "detected"|"inferred"|"uncertain"}],
 "edges": [{"from": "n1", "to": "n2", "label": string, "confidence": "detected"|"inferred"|"uncertain"}], "notes": string}
Rules: copy labels exactly as written; "detected" means you can read it clearly, "inferred" means it is implied (for example an arrowhead you cannot see clearly),
"uncertain" means you are guessing. Never invent a step, state, condition or label you cannot see; if text is unreadable use an empty label with "uncertain".
Use short ids (n1, n2, ...). Put anything you could not place in "notes".`;
  route('POST', '/api/projects/:id/ai/flow-image', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit');
    const mt = String(b && b.mediaType || ''); if (!['image/png', 'image/jpeg', 'image/webp'].includes(mt)) throw new HttpError(415, 'Use a PNG, JPEG or WebP image');
    const data = String(b && b.data || ''); if (!/^[A-Za-z0-9+/]+=*$/.test(data) || data.length > 2.2e6) throw new HttpError(413, 'The image is too large. Use one under about 1.5 MB (the page shrinks large images first).');
    const head = fromB64(data.slice(0, 32)); const sig = mt === 'image/png' ? head[0] === 0x89 && head[1] === 0x50 : mt === 'image/jpeg' ? head[0] === 0xFF && head[1] === 0xD8 : head[0] === 0x52 && head[8] === 0x57;
    if (!sig) throw new HttpError(415, 'The file is not the image type it claims to be');
    await limit('ai-image', s.id);
    if (!(await haveClaude())) throw new HttpError(409, 'Reading diagrams from images needs Claude, which reads images. Ask an admin to add the Claude key under Admin › AI provider. DeepSeek, the default provider here, reads text only.');
    const out = await callClaude([{ role: 'system', content: FLOW_PROMPT }, { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data } }, { type: 'text', text: 'Return the flow in this image as JSON.' + (b.hint ? ' Context from the user: ' + plain(b.hint, 200) : '') }] }], 3000);
    const graph = validFlowGraph(out.text);
    if (!graph.nodes.length) throw new HttpError(422, 'No flow steps could be read from this image');
    await audit(P.id, s.id, 'ai-flow-image', graph.nodes.length + ' steps via Claude');
    return ok({ graph, provider: out.provider, model: out.model });
  });
  // ---------- kick-off deck: read the team and the key facts out of the deck's text ----------
  // The page extracts the slide text (and table rows) from the uploaded .pptx or PDF and sends it here; the model returns JSON that is rebuilt
  // field by field (plain text, valid emails and dates only, capped lists). Nothing is saved here: the page shows a review and the team
  // decides what to keep, which is then saved through the normal document and record routes.
  /* ---------- part-by-part AI documents ----------
     A server function has 25 s, and the open model writes roughly a few hundred words in that time, so a full document cannot come back from one call.
     The browser asks for a job (sources gathered once and kept server-side for an hour), then asks for each part (one or two headings, a short time-boxed call,
     a few in parallel), then for the finished draft. A part that runs out of time is retried once with a shorter prompt; if it still fails, the draft says which
     section is missing instead of failing the whole document. Only the person who started a job can use it. */
  const AI_PARTS = {
    brd: ['Document information and summary', 'Scope and exclusions', 'Stakeholders and roles', 'Business processes', 'Functional requirements', 'Non-functional requirements', 'Business rules and acceptance criteria', 'Integrations and data', 'Reports and dashboards', 'Dependencies, assumptions and constraints', 'Risks and open questions', 'Traceability'],
    gaps: ['Missing requirements', 'Contradictions', 'Unanswered questions', 'Risks before BRD sign-off'],
    uat: ['UAT plan: objectives, scope and approach', 'Entry and exit criteria, roles and environment', 'Test data, schedule, defect process and sign-off', 'Test cases'],
    ftr: ['Summary and scope reviewed', 'Configuration summary', 'Requirements and traceability', 'Test coverage and results', 'Open defects, limitations and deviations', 'Risks, evidence and next actions', 'Approvals'],
    ftrrows: null, vidguide: null,
    guide: ['Introduction and roles', 'Getting started', 'Procedures by role', 'Common tasks', 'Questions and screenshots needed'],
    config: ['Modules', 'Forms and fields', 'Workflows and notifications', 'Roles and permissions', 'Integrations and import mappings', 'Reports', 'Known limitations'],
    workshop: ['Proposed agenda items', 'Discovery questions by module', 'Decisions and actions', 'Assumptions and risks', 'Candidate requirements', 'Contradictions and follow-up questions'],
    golive: ['Evidence against the go-live criteria', 'Blockers', 'Risks', 'Missing or contradictory evidence', 'Suggested owners'],
    hypercare: ['Summary', 'Open issues by severity', 'Recurring patterns and workarounds', 'Customer feedback', 'Recommended follow-ups'],
    handover: ['Solution overview', 'Configuration inventory', 'Integrations', 'Known issues, workarounds and outstanding defects', 'Support procedures, contacts and access handover', 'Training and hypercare summary', 'Open actions and missing documents'],
    wsr: ['Overall status', 'Progress this week', 'Planned next week', 'Milestones and dates', 'Risks and issues', 'Decisions and customer actions needed', 'Change requests', 'Attachments to include'],
    monthly: ['Executive summary', 'Progress against plan', 'Milestones achieved and upcoming', 'Deliverables status', 'Risks and issues', 'Change requests', 'Customer actions outstanding', 'Next month focus'],
    pkg: ['Configuration summary', 'Custom modules and their purpose', 'How the modules relate', 'Gaps, inconsistencies and questions'],
    training: ['Roles and the apps they use', 'Key tasks by role', 'Custom modules and relationships', 'Missing information'],
    closure: ['Outcomes against scope', 'Changes and deliveries', 'Issues', 'Lessons learned', 'Open items and owners']
  };
  const JOB_RE = /^aj_[0-9a-f]{18}$/;
  const tplHeads = t => String(t || '').split('\n').map(l => l.match(/^\s*(?:#{1,3}\s+|\d+(?:\.\d+)*[.)]?\s+)(.{3,90})$/)).filter(Boolean).map(m => m[1].replace(/[#*_`]/g, '').trim()).filter(Boolean).slice(0, 14);
  async function jobGet(s, P, job) { if (!JOB_RE.test(String(job))) throw new HttpError(400, 'Bad job'); const r = await dbGet('aj', P.id + '.' + job); const j = r && r.value; if (!j || j.uid !== s.id || Date.parse(j.ca) < Date.now() - 3600e3) throw new HttpError(404, 'This AI job has expired. Start it again.'); return j; }
  route('POST', '/api/projects/:id/ai/job', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); b = b || {}; const task = String(b.task || ''); const T = AI_TASKS[task]; if (!T) throw new HttpError(400, 'Unknown AI task'); await limit('ai', s.id);
    const instruction = str(b.instruction, 1500, 'Instruction'); const pv = await pickProvider(String(b.provider || ''));
    let tplText = ''; if (b.templateId) { const h = await tplHead(String(b.templateId)); if (!(await tplCanRead(s, h)) || h.status === 'retired') throw new HttpError(404, 'Template not available'); if (h.kind && TPL_TASK[h.kind] && TPL_TASK[h.kind] !== task) throw new HttpError(400, 'That template is for a different deliverable'); const td = await tplData(h, h.pub || h.latest); tplText = String(td && td.body || '').slice(0, 6000); }
    let vidId = '', src, text;
    if (task === 'vidguide') { vidId = String(b.vid || ''); if (!ITEM_ID_RE.test(vidId)) throw new HttpError(400, 'Choose a walkthrough'); const vr = await dbGet('it.' + P.id + '.vid', vidId); if (!vr || !vr.value) throw new HttpError(404, 'Walkthrough not found'); const vd = await unpack('ip.' + P.id + '.vid', vidId, vr.value); const mm = t => (t == null ? '' : '[' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '] ');
      src = [{ ref: 'S1', label: 'Walkthrough transcript: ' + (vd.title || 'untitled') }, { ref: 'S2', label: 'Screenshots (' + (vd.frames || []).length + ')' }]; text = `\n[S1] Walkthrough "${vd.title || ''}" transcript:\n${(vd.transcript || []).map(x => mm(x.t) + x.text).join('\n').slice(0, 12000)}\n\n[S2] Screenshots (place the marker after the step it shows):\n${(vd.frames || []).map((f, i) => 'F' + (i + 1) + ' at ' + mm(f.t).trim() + ': ' + (f.caption || '(no caption)')).join('\n').slice(0, 2500)}\n`; }
    else ({ src, text } = await aiContext(P.id, task, pv.provider !== 'claude'));
    const heads = (tplText && tplHeads(tplText).length >= 2 ? tplHeads(tplText) : AI_PARTS[task]) || [T.title];
    const parts = []; const per = 1; for (let i = 0; i < heads.length; i += per) parts.push(heads.slice(i, i + per));
    const job = 'aj_' + Array.from(crypto.getRandomValues(new Uint8Array(9)), x => x.toString(16).padStart(2, '0')).join('');
    await dbPut('aj', P.id + '.' + job, { uid: s.id, task, provider: pv.provider, fallback: pv.cfg.fallback, instruction, tplText: tplText.slice(0, 3000), vid: vidId || undefined, src, text: String(text || ''), parts, ca: now() });
    return ok({ job, parts: parts.map((h, n) => ({ n, headings: h })), provider: PNAME[pv.provider] }, 201);
  });
  route('POST', '/api/projects/:id/ai/job/:job/part', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const j = await jobGet(s, P, P.job); const n = Number(b && b.n); if (!Number.isInteger(n) || n < 0 || n >= j.parts.length) throw new HttpError(400, 'Bad part'); await limit('ai-part', s.id);
    const T = AI_TASKS[j.task]; const short = !!(b && b.short); const whole = j.parts.length === 1;
    const srcText = short ? j.text.slice(0, 7000) : j.text.slice(0, j.provider === 'claude' ? 26000 : 14000);
    const ask = whole ? `Write the whole document now.${short ? ' Keep it brief.' : ''}`
      : `You are writing PART ${n + 1} of ${j.parts.length} of this document. Write ONLY these section${j.parts[n].length > 1 ? 's' : ''}, each as a "## " heading followed by its content:\n${j.parts[n].map(h => '- ' + h).join('\n')}\nDo not write a document title, an introduction, a conclusion or any other section. ${short ? 'Be brief: about 120 words per section.' : 'About 180 to 260 words per section; use bullet points and tables where they help.'} If the sources say nothing for a section, write the heading and "Missing information: …" saying what is needed.`;
    const user = `TASK: ${T.ask}\n${j.instruction ? 'EXTRA INSTRUCTION FROM THE CONSULTANT: ' + j.instruction + '\n' : ''}${j.tplText ? 'TEMPLATE THE DOCUMENT FOLLOWS (for wording and order):\n' + j.tplText.slice(0, short ? 800 : 3000) + '\n' : ''}\n${ask}\n\nSOURCES (the only project information you may use):${srcText || '\n(No project records were found for this task. Say what is missing.)'}`;
    const maxT = whole ? (short ? 700 : 1100) : (short ? 280 : 460) * j.parts[n].length;
    let out; try { out = await callModel([{ role: 'system', content: AI_SYSTEM }, { role: 'user', content: user }], j.provider === 'claude' ? Math.max(maxT, 900) : maxT, j.provider, j.fallback, null, 20000); }
    catch (e) { if (e instanceof HttpError && (e.status === 504 || e.status === 502)) return ok({ n, ok: false, retry: !short, message: e.message }); throw e; }
    let t = String(out.text || '').trim(); if (!whole) t = t.replace(/^#\s+[^\n]*\n+/, '');
    await dbPut('ajp', P.id + '.' + P.job + '.' + n, { t: t.slice(0, 40000), provider: out.provider, model: out.model, notice: out.notice || undefined });
    return ok({ n, ok: true, chars: t.length, provider: out.provider });
  });
  route('POST', '/api/projects/:id/ai/job/:job/finish', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const j = await jobGet(s, P, P.job); const T = AI_TASKS[j.task];
    const got = await Promise.all(j.parts.map((h, n) => dbGet('ajp', P.id + '.' + P.job + '.' + n).catch(() => null)));
    const done = got.filter(g => g && g.value && g.value.t); if (!done.length) throw new HttpError(502, 'The AI could not write any part of this document. Use "Test DeepSeek" in Admin › AI to check the service, then try again.');
    const missing = []; const body = j.parts.map((h, n) => { const g = got[n] && got[n].value; if (g && g.t) return g.t; missing.push(h.join(', ')); return h.map(x => '## ' + x + '\n\n_This section could not be written in time. Generate again, or write it here._').join('\n\n'); }).join('\n\n');
    const first = done[0].value; const notices = [...new Set(done.map(g => g.value.notice).filter(Boolean))];
    const content = (j.parts.length > 1 ? '# ' + T.title + '\n\n' : '') + body;
    const id = rid('ai'); const t = now(); const data = { task: j.task, title: T.title, status: 'draft', content, sources: j.src, vid: j.vid, provider: first.provider, model: first.model, notice: notices.join(' ') || undefined, missingParts: missing.length ? missing : undefined, instruction: j.instruction, by: s.name || s.email, version: 1, hist: [{ at: t, who: s.name || s.email, side: 'facilio', event: 'AI draft generated' + (missing.length ? ' (' + missing.length + ' section(s) not written)' : '') }] };
    const meta = { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t };
    await save('it.' + P.id + '.ai', 'ip.' + P.id + '.ai', id, meta, data, undefined);
    await Promise.all([dbDel('aj', P.id + '.' + P.job), ...j.parts.map((h, n) => dbDel('ajp', P.id + '.' + P.job + '.' + n))]).catch(() => { });
    await audit(P.id, s.id, 'ai-draft', j.task + ' via ' + first.provider + ' in ' + j.parts.length + ' part(s)' + (missing.length ? ', ' + missing.length + ' missing' : ''));
    return ok({ item: itemOut('ai', id, meta, data), missing }, 201);
  });
  // admin check of the platform model: a tiny call and a short paragraph, timed, so an admin can see whether DeepSeek answers and how fast
  route('POST', '/api/admin/ai/probe', async () => {
    const s = await requireAdmin('admin'); await limit('ai-admin', s.id); const res = { ok: false };
    try { const t0 = Date.now(); const a = await callDeepseek([{ role: 'user', content: 'Reply with the single word OK.' }], 8, 12000); res.pingMs = Date.now() - t0; res.model = a.model;
      const t1 = Date.now(); const r = await callDeepseek([{ role: 'system', content: AI_SYSTEM }, { role: 'user', content: 'TASK: In about 120 words, explain what a Business Requirements Document is for in a Facilio implementation. SOURCES: none; say that no project sources were used.' }], 220, 10000); res.genMs = Date.now() - t1; res.chars = r.text.length;
      res.ok = true; res.message = `DeepSeek answered in ${(res.pingMs / 1000).toFixed(1)} s and wrote ${r.text.length} characters in ${(res.genMs / 1000).toFixed(1)} s. Documents are written part by part, so each part stays inside the 25-second server limit.`; res.sample = r.text.slice(0, 600);
    } catch (e) { res.message = e instanceof HttpError ? e.message : 'The check failed'; }
    return ok(res);
  });
  const KICK_PROMPT = 'You read the text of a Facilio implementation kick-off presentation and return ONLY a JSON object with these keys: '
    + '"facilioTeam": [{"name","role","email"}] (people from Facilio, the implementation vendor), "customerTeam": [{"name","role","email"}] (people from the customer organisation), '
    + '"cadence": one of "weekly","fortnightly","monthly","quarterly" or "" (steering / status meeting rhythm), "meetings": [strings] (governance meetings with their rhythm and attendees), '
    + '"objectives": [strings], "scope": [strings] (modules, sites or services in scope), "keyDates": [{"label","date"}] (date as YYYY-MM-DD when the deck states it), '
    + '"risks": [strings], "nextSteps": [{"action","owner","due"}] (due as YYYY-MM-DD or ""), "insights": [strings] (anything else the delivery team should remember). '
    + 'Use only facts in the text. Leave a field empty rather than guess; never invent names, emails or dates. Keep each string under 200 characters.';
  function validKickoff(raw) {
    let j = raw; if (typeof j === 'string') { const m = j.match(/\{[\s\S]*\}/); if (!m) throw new HttpError(502, 'The deck could not be read'); try { j = JSON.parse(m[0]); } catch (e) { throw new HttpError(502, 'The deck could not be read'); } }
    if (!j || typeof j !== 'object') throw new HttpError(502, 'The deck could not be read');
    const t = (v, n) => plain(v, n || 200), arr = (v, n) => (Array.isArray(v) ? v : []).slice(0, n);
    const em = v => { const e = String(v || '').trim().toLowerCase(); return /^[^@\s<>"']+@[^@\s<>"']+\.[a-z]{2,}$/.test(e) ? e : ''; };
    const dt = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
    const people = v => arr(v, 40).map(x => ({ name: t(x && x.name, 120), role: t(x && x.role, 120), email: em(x && x.email) })).filter(x => x.name);
    return { facilioTeam: people(j.facilioTeam), customerTeam: people(j.customerTeam), cadence: ['weekly', 'fortnightly', 'monthly', 'quarterly'].includes(j.cadence) ? j.cadence : '',
      meetings: arr(j.meetings, 12).map(x => t(x)).filter(Boolean), objectives: arr(j.objectives, 12).map(x => t(x)).filter(Boolean), scope: arr(j.scope, 30).map(x => t(x, 120)).filter(Boolean),
      keyDates: arr(j.keyDates, 20).map(x => ({ label: t(x && x.label, 120), date: dt(x && x.date) })).filter(x => x.label), risks: arr(j.risks, 15).map(x => t(x)).filter(Boolean),
      nextSteps: arr(j.nextSteps, 20).map(x => ({ action: t(x && x.action), owner: t(x && x.owner, 120), due: dt(x && x.due) })).filter(x => x.action), insights: arr(j.insights, 15).map(x => t(x)).filter(Boolean) };
  }
  route('POST', '/api/projects/:id/ai/kickoff', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const text = String(b && b.text || ''); if (text.trim().length < 40) throw new HttpError(400, 'The deck has almost no text to read');
    await limit('ai', s.id); const pv = await pickProvider(String(b.provider || '')); const cut = pv.provider === 'claude' ? 60000 : 24000;
    const out = await callModel([{ role: 'system', content: KICK_PROMPT }, { role: 'user', content: 'Deck: ' + plain(b.fileName || 'kick-off deck', 200) + '\n\n' + text.slice(0, cut) }], 1300, pv.provider, pv.cfg.fallback);
    const data = validKickoff(out.text); await audit(P.id, s.id, 'ai-kickoff', (data.facilioTeam.length + data.customerTeam.length) + ' people via ' + out.provider);
    return ok({ data, provider: out.provider, model: out.model, truncated: text.length > cut, notice: out.notice || '' });
  });
  route('POST', '/api/projects/:id/ai/:item/decision', async (b, P) => {
    const s = await me(); const { role } = await projectAccess(s, P.id, 'owner'); const d = String(b && b.decision || ''); if (!['approve', 'reject', 'reopen'].includes(d)) throw new HttpError(400, 'Choose approve, reject or reopen');
    if (!ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Bad id'); const col = 'it.' + P.id + '.ai', pcol = 'ip.' + P.id + '.ai'; const row = await dbGet(col, P.item); const head = row && row.value; if (!head) throw new HttpError(404, 'Draft not found'); const cur = await unpack(pcol, P.item, head);
    const status = d === 'approve' ? 'approved' : d === 'reject' ? 'rejected' : 'draft'; const t = now(); const note = str(b.note, 500, 'Note');
    const data = Object.assign({}, cur, { status, approvedBy: d === 'approve' ? (s.name || s.email) : null, approvedAt: d === 'approve' ? t : null, decisionNote: note, hist: (cur.hist || []).concat([{ at: t, who: s.name || s.email, side: 'facilio', event: d === 'approve' ? 'Approved' : d === 'reject' ? 'Rejected' : 'Reopened as draft' + (note ? ': ' + note : '') }]) });
    const nh = Object.assign({}, head, { v: head.v + 1, ub: s.id, us: 'facilio', ua: t }); await save(col, pcol, P.item, nh, data, head.z); await audit(P.id, s.id, 'ai-' + d, cur.task); return ok({ item: itemOut('ai', P.item, nh, data) });
  });

  // ---------- templates: org-wide and per-project, versioned, publish / retire ----------
  // template kind -> the AI task it can shape (kinds not listed here, such as workspace or kpi, are not used for AI drafts)
  const TPL_TASK = { brd: 'brd', uat: 'uat', ftr: 'ftr', guide: 'guide', golive: 'golive', hypercare: 'hypercare', handover: 'handover', closure: 'closure', wsr: 'wsr', monthly: 'monthly' };
  const TPL_KINDS = ['workspace', 'ftr', 'kpi', 'brd', 'uat', 'guide', 'golive', 'hypercare', 'handover', 'closure', 'wsr', 'monthly', 'other'];
  const TPL_RE = /^tpl_[a-f0-9]{18}$/;
  const tplOut = h => ({ id: h.id, name: h.name, kind: h.kind, scope: h.scope, projectId: h.projectId || null, desc: h.desc || '', status: h.status, latest: h.latest, pub: h.pub || 0, versions: h.versions || [], by: h.by, createdBy: h.createdBy, at: h.at, ua: h.ua });
  async function tplHead(id) { if (!TPL_RE.test(String(id))) throw new HttpError(400, 'Bad template id'); const r = await dbGet('tpl', id); if (!r || !r.value) throw new HttpError(404, 'Template not found'); return r.value; }
  async function tplCanRead(s, h) {
    if (h.scope === 'project') { try { await projectAccess(s, h.projectId, 'read'); return true; } catch (e) { return false; } }
    return h.status === 'published' || h.createdBy === s.id || !!(await adminRole(s));
  }
  async function tplCanEdit(s, h) {
    if (h.scope === 'project') { try { await projectAccess(s, h.projectId, 'edit'); return true; } catch (e) { return false; } }
    const ar = await adminRole(s); return h.createdBy === s.id || ar === 'admin' || ar === 'super';  // sub-admins are read-only
  }
  async function tplData(h, v) { const key = h.id + '.' + v; const r = await dbGet('tpv', key); if (!r || !r.value) throw new HttpError(404, 'Version not found'); const d = await unpack('tpp', key, r.value); return d; }
  async function tplWrite(h, data, note, s) {
    const text = JSON.stringify(data); if (text.length > 6000000) throw new HttpError(413, 'Template is too large (max about 6 MB)');
    const v = (h.latest || 0) + 1; const prev = await dbGet('tpv', h.id + '.' + v); await save('tpv', 'tpp', h.id + '.' + v, { v }, data, prev && prev.value && prev.value.z);
    h.latest = v; h.versions = (h.versions || []).concat([{ v, at: now(), by: s.name || s.email, note: note || '', size: text.length }]); h.ua = now(); await dbPut('tpl', h.id, h); return v;
  }
  route('GET', '/api/templates', async (b, P, Q) => {
    const s = await me(); const kind = Q.get('kind') || ''; const pid = Q.get('projectId') || ''; const rows = (await dbList('tpl')).map(r => r.value).filter(Boolean);
    const out = []; for (const h of rows) { if (kind && h.kind !== kind) continue; if (h.scope === 'project' && h.projectId !== pid) continue; if (await tplCanRead(s, h)) out.push(tplOut(h)); }
    out.sort((a, c) => String(c.ua).localeCompare(String(a.ua))); const ar = await adminRole(s); return ok({ items: out.slice(0, 500), isAdmin: !!ar, kinds: TPL_KINDS });
  });
  route('POST', '/api/templates', async (b) => {
    const s = await me(); const kind = String(b.kind || ''); if (!TPL_KINDS.includes(kind)) throw new HttpError(400, 'Choose a template type'); await limit('create', s.id);
    const scope = b.scope === 'project' ? 'project' : 'org'; let pid = null; if (scope === 'project') { pid = String(b.projectId || ''); await projectAccess(s, pid, 'edit'); }
    if (b.data === undefined || b.data === null || typeof b.data !== 'object') throw new HttpError(400, 'Template content is missing');
    const h = { id: rid('tpl').slice(0, 22), name: str(b.name, 120, 'Name', true), kind, scope, projectId: pid, desc: str(b.desc, 500, 'Description'), status: 'draft', latest: 0, pub: 0, versions: [], by: s.name || s.email, createdBy: s.id, at: now(), ua: now() };
    await tplWrite(h, b.data, str(b.note, 300, 'Note') || 'First version', s); await audit(pid || 'sys', s.id, 'template-create', h.name); return ok({ item: tplOut(h) }, 201);
  });
  route('GET', '/api/templates/:id', async (b, P, Q) => {
    const s = await me(); const h = await tplHead(P.id); if (!(await tplCanRead(s, h))) throw new HttpError(404, 'Template not found');
    const v = Number(Q.get('v')) || h.pub || h.latest; if (!(h.versions || []).some(x => x.v === v)) throw new HttpError(404, 'Version not found'); if (v !== h.pub && !(await tplCanEdit(s, h))) throw new HttpError(404, 'Version not found'); return ok({ item: tplOut(h), v, data: await tplData(h, v) });
  });
  route('POST', '/api/templates/:id/versions', async (b, P) => {
    const s = await me(); const h = await tplHead(P.id); if (!(await tplCanEdit(s, h))) throw new HttpError(403, 'You cannot change this template');
    if (b.data === undefined || b.data === null || typeof b.data !== 'object') throw new HttpError(400, 'Template content is missing');
    if (b.name) h.name = str(b.name, 120, 'Name', true); if (b.desc !== undefined) h.desc = str(b.desc, 500, 'Description');
    const v = await tplWrite(h, b.data, str(b.note, 300, 'Note'), s); await audit(h.projectId || 'sys', s.id, 'template-version', h.name + ' v' + v); return ok({ item: tplOut(h), v });
  });
  route('POST', '/api/templates/:id/status', async (b, P) => {
    const s = await me(); const h = await tplHead(P.id); if (!(await tplCanEdit(s, h))) throw new HttpError(403, 'You cannot change this template'); const a = String(b.action || '');
    if (a === 'publish') { if (h.scope === 'org' && !['admin', 'super'].includes(await adminRole(s))) throw new HttpError(403, 'Only an Admin can publish an organisation template'); const v = Number(b.v) || h.latest; if (!(h.versions || []).some(x => x.v === v)) throw new HttpError(400, 'Unknown version'); h.pub = v; h.status = 'published'; }
    else if (a === 'retire') { h.status = 'retired'; } else if (a === 'reopen') { h.status = h.pub ? 'published' : 'draft'; } else throw new HttpError(400, 'Choose publish, retire or reopen');
    h.ua = now(); await dbPut('tpl', h.id, h); await audit(h.projectId || 'sys', s.id, 'template-' + a, h.name); return ok({ item: tplOut(h) });
  });
  route('DELETE', '/api/templates/:id', async (b, P) => {
    const s = await me(); const h = await tplHead(P.id); if (!(await tplCanEdit(s, h))) throw new HttpError(403, 'You cannot delete this template'); if (h.pub) throw new HttpError(409, 'A published template cannot be deleted. Retire it instead.');
    for (const x of h.versions || []) { const r = await dbGet('tpv', h.id + '.' + x.v); if (r && r.value) { for (let i = 0; i < (r.value.z || 0); i++) await dbDel('tpp', h.id + '.' + x.v + '.' + i).catch(() => { }); await dbDel('tpv', h.id + '.' + x.v); } }
    await dbDel('tpl', h.id); await audit(h.projectId || 'sys', s.id, 'template-delete', h.name); return ok({ ok: true });
  });

  route('POST', '/api/projects/:id/ugd/:item/decision', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'owner'); const d = String(b && b.decision || ''); if (!['approve', 'reopen'].includes(d)) throw new HttpError(400, 'Choose approve or reopen');
    if (!ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Bad id'); const col = 'it.' + P.id + '.ugd', pcol = 'ip.' + P.id + '.ugd'; const row = await dbGet(col, P.item); const head = row && row.value; if (!head) throw new HttpError(404, 'Guide not found'); const cur = await unpack(pcol, P.item, head);
    const t = now(); const data = Object.assign({}, cur, { status: d === 'approve' ? 'approved' : 'draft', approvedBy: d === 'approve' ? (s.name || s.email) : null, approvedAt: d === 'approve' ? t : null, hist: (cur.hist || []).concat([{ at: t, who: s.name || s.email, side: 'facilio', event: d === 'approve' ? 'Approved' : 'Reopened as draft' }]).slice(-40) });
    const nh = Object.assign({}, head, { v: head.v + 1, ub: s.id, us: 'facilio', ua: t }); await save(col, pcol, P.item, nh, data, head.z); await audit(P.id, s.id, 'ugd-' + d, cur.title); return ok({ item: itemOut('ugd', P.item, nh, data) });
  });

  // items
  const kindList = q => String(q || '').split(',').filter(k => KINDS.includes(k));

  // tickets across every project this person can open (items are per project, so this reads each project's ticket records)
  route('GET', '/api/tickets', async () => {
    const s = await me(); const ar = await adminRole(s); const rows = (await dbList('projects')).map(r => r.value).filter(p => p && !p.archived);
    const mine = ar ? rows : rows.filter(p => (p.members || []).some(m => m.id === s.id)); const out = [];
    const projects = mine.slice(0, 200).map(p => ({ id: p.id, name: p.name, customer: p.customer, canEdit: ar ? ar !== 'sub' : ((p.members || []).find(m => m.id === s.id) || {}).role !== 'viewer', members: (p.members || []).map(m => ({ id: m.id, email: m.email, name: m.name })) }));
    for (const p of mine.slice(0, 200)) for (const it of await itemsOf(p.id, 'tkt')) out.push(Object.assign({ projectId: p.id, project: p.name, customer: p.customer, canEdit: ar ? ar !== 'sub' : ((p.members || []).find(m => m.id === s.id) || {}).role !== 'viewer' }, it));
    return ok({ projects, tickets: out.sort((a, b) => String(b.data.lastActivity || b.updatedAt).localeCompare(String(a.data.lastActivity || a.updatedAt))).slice(0, 3000) });
  });
  // reply / internal note: appended on the server so two people replying at once never overwrite each other
  route('POST', '/api/projects/:id/tickets/:item/message', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); if (!ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Unknown ticket'); await limit('ticket', s.id);
    const type = b && b.type === 'note' ? 'note' : 'reply'; const it = await ticketAppend(s, P.id, P.item, { type, text: b && b.text, attachments: b && b.attachments });
    await audit(P.id, s.id, 'tkt-' + type, P.item); return ok({ item: it }, 201);
  });
  // e-mail intake: one normalised message in (from Power Automate, Graph, a mail rule or a person pasting a mail), one ticket or one more message out. Duplicates are ignored.
  async function ingestMail(s, project, b) {
    b = b || {}; const P = { id: project.id };
    const messageId = str(b.messageId, 300, 'messageId', true), conv = str(b.conversationId || b.messageId, 300, 'conversationId'); const from = b.from || {}; const email = str(from.email, 200, 'Sender e-mail', true).toLowerCase();
    const all = await itemsOf(P.id, 'tkt'); const seen = all.find(t => (t.data.thread || []).some(m => m.ref === messageId)); if (seen) return { _st: 200, duplicate: true, id: seen.id, ticket: seen.data.n };
    const ex = (b._tid && all.find(t => t.id === b._tid)) || all.find(t => t.data.extConv && t.data.extConv === conv && t.data.status !== 'Closed');
    const text = str(b.body, 20000, 'Message', true); const att = Array.isArray(b.attachments) ? b.attachments.slice(0, 10).map(a => ({ name: String(a.name || 'attachment').slice(0, 200), note: 'Listed from the e-mail; the file itself is not copied' })) : [];
    if (ex) { const it = await ticketAppend(s, P.id, ex.id, { type: 'inbound', text, by: from.name || email, byEmail: email, attachments: att, ref: messageId }); return { _st: 200, duplicate: false, appended: true, id: ex.id, ticket: it.data.n, status: it.data.status }; }
    const key = 'tk_' + rid('').slice(1, 13); const subject = str(b.subject || '(no subject)', 200, 'Subject');
    const data = await ticketSanitize(s, P.id, null, { subject, description: text.slice(0, 20000), status: 'New', priority: 'Medium', source: 'email', org: project.customer || '', requester: { name: from.name || email, email }, extConv: conv, extRef: messageId, category: /\bmeet|\bcall\b|catch.?up|schedul/i.test(subject) ? 'Meeting request' : 'Client request', lastActivity: b.receivedAt || now(), thread: [] });
    await withLock('it.' + P.id + '.tkt.' + key, async () => { const t = now(); await save('it.' + P.id + '.tkt', 'ip.' + P.id + '.tkt', key, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, Object.assign(data, { hist: [{ at: t, who: from.name || email, side: 'customer', event: 'Created from e-mail' }] }), 0); });
    const it = await ticketAppend(s, P.id, key, { type: 'inbound', text, by: from.name || email, byEmail: email, attachments: att, ref: messageId });
    if (!b._quiet) await ticketNotify(project, key, null, it.data, s); await audit(P.id, s.id, 'tkt-email', key); return { _st: 201, duplicate: false, created: true, id: key, ticket: it.data.n };
  }
  route('POST', '/api/projects/:id/tickets/ingest', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'edit'); await limit('ticket', s.id); const r = await ingestMail(s, project, b); const st = r._st; delete r._st; return ok(r, st);
  });

  // ---------- support mailbox (Microsoft 365 via Graph) ----------
  // Needs configuration by the app owner: an OAuth2 credential named graph_mail (Mail.Read / Mail.Read.Shared) granted to this app, and optionally the plain secret support_mailbox (shared mailbox address; empty = the owner's own mailbox).
  const MAIL_CRED = 'graph_mail';
  const mailAdmin = async s => { const ar = await adminRole(s); if (!ar || ar === 'sub') throw new HttpError(403, 'Only admins can manage the support mailbox'); return ar; };
  const mailCfg = async () => { const r = await dbGet('cfg', 'mail'); return (r && r.value) || { rules: [], last: null }; };
  // shared mail providers: on these, a matching domain says nothing about who the sender is, so only the exact address counts
  const PUBLIC_MAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.in', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'gmx.com', 'mail.com', 'yandex.com', 'rediffmail.com']);
  const domOf = e => String(e || '').toLowerCase().split('@')[1] || '';
  async function mailboxAddress() { let m = ''; try { m = String(await CTX.secrets.get('support_mailbox') || '').trim(); } catch (e) { } return m; }
  // Mailbox settings (admins): routing rules, Teams notices, ticket creation, how far back the first sync reads, how long emails are kept.
  const MAIL_DEFAULTS = { rules: [], last: null, teamsOn: false, teamsChannel: '', autoTicket: true, firstSyncDays: 7, retentionDays: 0 };
  const mailSettings = c => ({ teamsOn: !!c.teamsOn, teamsChannel: c.teamsChannel || '', autoTicket: c.autoTicket !== false, firstSyncDays: c.firstSyncDays || 7, retentionDays: c.retentionDays || 0 });
  route('GET', '/api/mail/status', async () => {
    const s = await me(); await mailAdmin(s); const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); const box = await mailboxAddress(); const inbox = await dbList('inbox');
    return ok({ credential: MAIL_CRED, mailbox: box || '(the credential owner\'s own mailbox)', rules: c.rules || [], last: c.last || null, watermark: c.watermark || null, unrouted: inbox.length, hasFetch: !!CTX.fetch, hasTeams: !!(CTX.teams && CTX.teams.send), settings: mailSettings(c) });
  });
  route('PUT', '/api/mail/rules', async (b) => {
    const s = await me(); await mailAdmin(s);
    const rules = (Array.isArray(b && b.rules) ? b.rules : []).slice(0, 200).map(r => ({ match: str(String(r.match || '').toLowerCase().trim(), 200, 'Match', true), projectId: str(r.projectId, 80, 'Project', true), on: r.on === 'to' ? 'to' : 'from' }));
    for (const r of rules) { if (!(await dbGet('projects', r.projectId))) throw new HttpError(400, 'Unknown project in a rule'); if (r.on === 'to' && !isEmail(r.match)) throw new HttpError(400, 'A "sent to" rule needs a full email address, such as acme-delivery@facilio.com'); }
    const c = await mailCfg(); c.rules = rules; await dbPut('cfg', 'mail', c); return ok({ rules });
  });
  route('PUT', '/api/mail/settings', async (b) => {
    const s = await me(); await mailAdmin(s); const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); b = b || {};
    if (b.teamsOn !== undefined) c.teamsOn = !!b.teamsOn; if (b.teamsChannel !== undefined) c.teamsChannel = str(b.teamsChannel, 80, 'Teams channel');
    if (b.autoTicket !== undefined) c.autoTicket = !!b.autoTicket;
    if (b.firstSyncDays !== undefined) { const n = Number(b.firstSyncDays); if (!(n >= 1 && n <= 90)) throw new HttpError(400, 'The first sync can read 1 to 90 days back'); c.firstSyncDays = Math.round(n); }
    if (b.retentionDays !== undefined) { const n = Number(b.retentionDays); if (!(n === 0 || (n >= 30 && n <= 3650))) throw new HttpError(400, 'Keep emails for 30 to 3650 days, or 0 to keep them while the project exists'); c.retentionDays = Math.round(n); }
    await dbPut('cfg', 'mail', c); await audit('mailbox', s.id, 'mail-settings', JSON.stringify(mailSettings(c))); return ok({ settings: mailSettings(c) });
  });
  route('GET', '/api/mail/inbox', async () => { const s = await me(); await mailAdmin(s); const rows = (await dbList('inbox')).map(r => r.value); rows.sort((a, c) => String(c.receivedAt).localeCompare(String(a.receivedAt))); return ok({ items: rows.slice(0, 200) }); });
  route('POST', '/api/mail/inbox/:mid/dismiss', async (b, P) => { const s = await me(); await mailAdmin(s); await dbDel('inbox', P.mid); return ok({ ok: true }); });
  route('POST', '/api/mail/inbox/:mid/route', async (b, P) => {
    const s = await me(); await mailAdmin(s); const m = await dbGet('inbox', P.mid); if (!m) throw new HttpError(404, 'Message not found'); const { project } = await projectAccess(s, str(b && b.projectId, 80, 'Project', true), 'edit');
    const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); const r = await fileMail(s, project, m.value.mail, 'manual', c); await dbDel('inbox', P.mid); await audit(project.id, s.id, 'mail-routed', P.mid); return ok({ ticket: r.ticket, mail: r.key, projectId: project.id });
  });

  // ---------- project inbox: client emails kept per project ----------
  // Each email the mailbox sync places in a project is stored once (collection ml.<project>, keyed by a hash of the Microsoft message id),
  // with the plain-text body, sender, recipients, conversation, attachment list and a link to open it in Outlook. Status is shared by the
  // project team: new -> read -> handled. Conversations are remembered (mlconv) so replies land in the same project.
  const mkey = async id => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(id))))).slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('');
  const addrs = list => (Array.isArray(list) ? list : []).slice(0, 50).map(x => ({ name: String(x && x.emailAddress && x.emailAddress.name || '').slice(0, 120), email: String(x && x.emailAddress && x.emailAddress.address || '').toLowerCase().slice(0, 200) })).filter(x => x.email);
  const appUrl = () => 'https://' + ((CTX.app && CTX.app.name) || 'facilio-delivery-studio') + '.facilio.work';
  const mailOut = (r, full) => { const o = { key: r.key, subject: r.subject, from: r.from, to: r.to, cc: r.cc, receivedAt: r.receivedAt, preview: r.preview, status: r.status, readBy: r.readBy || null, handledBy: r.handledBy || null, handledAt: r.handledAt || null, conv: r.convKey, attachments: (r.attachments || []).map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type })), hasAttachments: !!r.hasAttachments, ticket: r.ticket || null, routedBy: r.routedBy, storedAt: r.storedAt, live: r.live || null, outlook: r.webLink || '' };
    if (full) o.body = r.body; return o; };
  async function fileMail(s, project, mail, routedBy, c) {
    const key = await mkey(mail.messageId); const col = 'ml.' + project.id; const had = await dbGet(col, key);
    if (had) return { key, duplicate: true, ticket: had.value.ticket && had.value.ticket.n };
    const convKey = await mkey(mail.conversationId || mail.messageId); const t = now();
    const rec = { key, gid: String(mail.messageId).slice(0, 400), convKey, subject: String(mail.subject || '(no subject)').slice(0, 300), from: mail.from, to: mail.to || [], cc: mail.cc || [], receivedAt: mail.receivedAt || t, preview: String(mail.preview || mail.body || '').replace(/\s+/g, ' ').trim().slice(0, 280), body: String(mail.body || '').slice(0, 30000), webLink: /^https:\/\/outlook\.(office|office365|live)\.com\//i.test(String(mail.webLink || '')) ? String(mail.webLink).slice(0, 1000) : '', hasAttachments: !!mail.hasAttachments, attachments: (mail.attachmentList || []).slice(0, 30), status: 'new', routedBy, storedAt: t, source: 'Microsoft 365 mailbox' };
    let ticket = null;
    if (c.autoTicket !== false) { const r = await ingestMail(s, project, { messageId: mail.messageId, conversationId: mail.conversationId, subject: mail.subject, body: mail.body || '(empty message)', from: mail.from, receivedAt: mail.receivedAt, attachments: (mail.attachmentList || []).map(a => ({ name: a.name })), _tid: mail._tid, _quiet: true }); if (r && r.id) ticket = { id: r.id, n: r.ticket }; }
    rec.ticket = ticket; await dbPut(col, key, rec); await dbPut('mlconv', convKey, { projectId: project.id, at: t }).catch(() => { });
    await audit(project.id, s.id, 'mail-received', key);
    return { key, duplicate: false, created: true, ticket: ticket && ticket.n, rec };
  }
  async function mailNotice(c, project, rec) {
    if (!c.teamsOn || !CTX.teams || !CTX.teams.send) return false;
    try {
      await CTX.teams.send({ channel: c.teamsChannel || true, title: project ? 'New client email · ' + project.name : 'Client email waiting to be assigned',
        text: 'Automated Delivery Studio notification about an email received in the delivery mailbox. ' + (project ? 'Preview: ' + rec.preview : 'It matched no project, so an admin needs to place it.'),
        facts: [{ title: 'From', value: ((rec.from && rec.from.name) ? rec.from.name + ' <' + rec.from.email + '>' : (rec.from && rec.from.email) || '—') }, { title: 'Subject', value: rec.subject }, { title: 'Received', value: String(rec.receivedAt).replace('T', ' ').slice(0, 16) + ' UTC' }, { title: 'Project', value: project ? project.name : 'Not assigned' }],
        actions: [{ title: project ? 'Open in the project Inbox' : 'Open the review inbox', url: project ? appUrl() + '/#/p/' + project.id + '/inbox/' + rec.key : appUrl() + '/#/admin' }] });
      return true;
    } catch (e) { console.log('teams mail notice failed: ' + (e && (e.status || e.message))); return false; }
  }
  // Reads new messages from the delivery mailbox and files them. Runs from the admin "Sync now" and, at most every two minutes, when someone opens a project Inbox.
  async function syncMailbox(s, opts) {
    opts = opts || {}; const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); const t0 = now(); const res = { fetched: 0, filed: 0, tickets: 0, appended: 0, unrouted: 0, duplicates: 0, notices: 0, errors: [] };
    if (!opts.force && c.last && Date.now() - Date.parse(c.last.at) < 120e3) return { skipped: 'recent', last: c.last };
    if (c.lease && Date.now() - Date.parse(c.lease) < 60e3) return { skipped: 'running', last: c.last };
    c.lease = t0; await dbPut('cfg', 'mail', c);
    const fin = async err => { c.lease = null; c.last = { at: t0, by: s.email, ok: !err, error: err || '', stats: res }; await dbPut('cfg', 'mail', c); await audit('mailbox', s.id, 'mail-sync', err ? 'failed' : 'ok'); };
    if (!CTX.fetch) { await fin('This platform build has no credential proxy'); throw new HttpError(503, 'Mailbox sync is not available here'); }
    const box = await mailboxAddress(); const base = box ? 'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(box) : 'https://graph.microsoft.com/v1.0/me';
    const since = new Date(c.watermark ? Date.parse(c.watermark) - 10 * 60e3 : Date.now() - c.firstSyncDays * 864e5).toISOString();
    let url = base + '/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime asc&$filter=' + encodeURIComponent('receivedDateTime ge ' + since) + '&$select=id,conversationId,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments,isDraft,webLink';
    const msgs = [];
    for (let page = 0; url && page < 4; page++) {
      let r; try { r = await CTX.fetch(MAIL_CRED, url, { method: 'GET', headers: { Prefer: 'outlook.body-content-type="text"' } }); } catch (e) { await fin('Credential ' + MAIL_CRED + ' is missing or not granted to this app'); throw new HttpError(424, 'The mailbox credential (' + MAIL_CRED + ') is missing or not granted to this app. The app owner adds it at secrets.facilio.work.'); }
      if (!r.ok) { const why = r.status === 401 || r.status === 403 ? 'Microsoft refused access (' + r.status + '). The credential needs Mail.Read (or Mail.Read.Shared for a shared mailbox) and admin consent.' : r.status === 429 ? 'Microsoft is throttling requests. Try again in a minute.' : 'Microsoft returned ' + r.status; await fin(why); throw new HttpError(r.status === 429 ? 429 : 502, why); }
      const j = await r.json(); msgs.push(...(j.value || [])); url = j['@odata.nextLink'] && /^https:\/\/graph\.microsoft\.com\//.test(j['@odata.nextLink']) ? j['@odata.nextLink'] : null;
    }
    res.fetched = msgs.length; let newest = c.watermark || null;
    const projects = (await dbList('projects')).map(x => x.value).filter(x => x && !x.archived); const byId = Object.fromEntries(projects.map(p => [p.id, p]));
    for (const m of msgs.filter(m => !m.isDraft)) {
      try {
        if (!newest || String(m.receivedDateTime) > newest) newest = m.receivedDateTime;
        const email = String(m.from && m.from.emailAddress && m.from.emailAddress.address || '').toLowerCase(); if (!email) continue; if (box && email === box.toLowerCase()) continue;
        const seenKey = await mkey(m.id); if (await dbGet('mailseen', seenKey)) { res.duplicates++; continue; }
        let attachmentList = [];
        if (m.hasAttachments) { try { const ar = await CTX.fetch(MAIL_CRED, base + '/messages/' + encodeURIComponent(m.id) + '/attachments?$select=id,name,size,contentType,isInline', { method: 'GET' }); if (ar.ok) attachmentList = ((await ar.json()).value || []).filter(a => !a.isInline).slice(0, 30).map(a => ({ id: String(a.id).slice(0, 400), name: String(a.name || 'attachment').replace(/[\u0000-\u001f\/\\]/g, '_').slice(0, 200), size: Number(a.size) || 0, type: /^[\w.+-]+\/[\w.+-]+$/.test(a.contentType || '') ? a.contentType : 'application/octet-stream' })); } catch (e) { } }
        const mail = { messageId: m.id, conversationId: m.conversationId || m.id, subject: m.subject || '(no subject)', body: String(m.body && m.body.content || '').slice(0, 30000) || '(empty message)', preview: m.bodyPreview || '', from: { name: (m.from.emailAddress.name || email).slice(0, 120), email }, to: addrs(m.toRecipients), cc: addrs(m.ccRecipients), receivedAt: m.receivedDateTime, webLink: m.webLink || '', hasAttachments: !!m.hasAttachments, attachmentList };
        // which project: 1) sent to a project's own address, 2) a reply in a conversation already filed, 3) a sender rule, 4) a ticket tag from the ticket's own sender
        let target = null, how = '';
        const toAll = mail.to.concat(mail.cc).map(x => x.email); const toRule = (c.rules || []).find(x => x.on === 'to' && toAll.includes(x.match));
        if (toRule && byId[toRule.projectId]) { target = byId[toRule.projectId]; how = 'sent to the project address'; }
        if (!target) { const cv = await dbGet('mlconv', await mkey(mail.conversationId)); if (cv && byId[cv.value.projectId]) { target = byId[cv.value.projectId]; how = 'same conversation'; } }
        if (!target) { const rule = (c.rules || []).find(x => x.on !== 'to' && (x.match === email || x.match === domOf(email))); if (rule && byId[rule.projectId]) { target = byId[rule.projectId]; how = 'sender rule'; } }
        const tag = /\[TKT-(\d+)\]/i.exec(mail.subject);
        if (target && tag) { const hit = (await itemsOf(target.id, 'tkt')).find(x => String(x.data.n) === tag[1]); const req = hit && String(hit.data.requester && hit.data.requester.email || '').toLowerCase(); if (hit && (req === email || how === 'sender rule' || how === 'sent to the project address' || (req && domOf(req) === domOf(email) && !PUBLIC_MAIL.has(domOf(email))))) mail._tid = hit.id; }   // a reply quoting a ticket joins that ticket
        if (!target && tag) { const dom = domOf(email); const ruled = new Set((c.rules || []).filter(x => x.on !== 'to' && (x.match === email || x.match === dom)).map(x => x.projectId));
          for (const p of projects) { const hit = (await itemsOf(p.id, 'tkt')).find(x => String(x.data.n) === tag[1]); const req = hit && String(hit.data.requester && hit.data.requester.email || '').toLowerCase();
            if (hit && (req === email || (req && domOf(req) === dom && !PUBLIC_MAIL.has(dom)) || ruled.has(p.id))) { target = p; mail._tid = hit.id; how = 'ticket reference'; break; } } }
        if (!target) {
          const ik = seenKey; await dbPut('inbox', ik, { id: ik, receivedAt: m.receivedDateTime, from: mail.from, subject: mail.subject, preview: mail.body.slice(0, 300), mail }); res.unrouted++; await dbPut('mailseen', seenKey, { at: t0 });
          if (res.notices < 20 && await mailNotice(c, null, { from: mail.from, subject: mail.subject, receivedAt: mail.receivedAt, key: ik })) res.notices++; continue; }
        const out = await fileMail(s, target, mail, how, c); await dbPut('mailseen', seenKey, { at: t0, projectId: target.id });
        if (out.duplicate) { res.duplicates++; continue; } res.filed++; if (out.ticket) res.tickets++;
        if (res.notices < 20 && await mailNotice(c, target, out.rec)) res.notices++;
      } catch (e) { res.errors.push(String(e && e.message || e).slice(0, 160)); }
    }
    if (newest) c.watermark = newest; await fin(res.errors.length && !res.filed && !res.unrouted ? res.errors[0] : ''); return { result: res };
  }
  route('POST', '/api/mail/sync', async () => { const s = await me(); await mailAdmin(s); await limit('mail', s.id); const r = await syncMailbox(s, { force: true }); return ok(r); });

  // the project Inbox (project members and admins; never customers)
  async function inboxAccess(s, pid, need) { const a = await projectAccess(s, pid, need); if (a.role === 'customer') throw new HttpError(404, 'Not found'); return a; }
  async function mailRec(pid, key) { if (!/^[0-9a-f]{40}$/.test(String(key))) throw new HttpError(404, 'Email not found'); const r = await dbGet('ml.' + pid, key); if (!r) throw new HttpError(404, 'Email not found'); return r.value; }
  route('GET', '/api/projects/:id/mail', async (b, P, Q) => {
    const s = await me(); await inboxAccess(s, P.id, 'read'); let sync = null;
    if (Q.get('sync') === '1') { try { sync = await syncMailbox(s, {}); } catch (e) { sync = { error: e instanceof HttpError ? e.message : 'The mailbox could not be checked just now' }; } }
    const c = Object.assign({}, MAIL_DEFAULTS, await mailCfg()); let rows = (await dbList('ml.' + P.id)).map(r => r.value).filter(Boolean);
    if (c.retentionDays > 0) { const cut = Date.now() - c.retentionDays * 864e5; for (const r of rows.filter(r => Date.parse(r.receivedAt) < cut)) await dbDel('ml.' + P.id, r.key).catch(() => { }); rows = rows.filter(r => Date.parse(r.receivedAt) >= cut); }
    rows.sort((a, z) => String(z.receivedAt).localeCompare(String(a.receivedAt)));
    return ok({ items: rows.slice(0, 1000).map(r => mailOut(r)), total: rows.length, last: c.last ? { at: c.last.at, ok: c.last.ok, error: c.last.ok ? '' : 'The last mailbox check did not complete. An admin can see the details under Admin.' } : null, sync: sync && (sync.result ? { filed: sync.result.filed } : sync.error ? { error: sync.error } : { skipped: sync.skipped }), retentionDays: c.retentionDays });
  });
  route('GET', '/api/projects/:id/mail/:key', async (b, P) => {
    const s = await me(); const { role } = await inboxAccess(s, P.id, 'read'); const r = await mailRec(P.id, P.key);
    if (r.status === 'new' && role !== 'viewer') { r.status = 'read'; r.readBy = { name: s.name, at: now() }; await dbPut('ml.' + P.id, r.key, r); }
    const conv = (await dbList('ml.' + P.id)).map(x => x.value).filter(x => x && x.convKey === r.convKey).sort((a, z) => String(a.receivedAt).localeCompare(String(z.receivedAt)));
    return ok({ mail: mailOut(r, true), conversation: conv.map(x => mailOut(x, true)) });
  });
  route('POST', '/api/projects/:id/mail/:key/status', async (b, P) => {
    const s = await me(); await inboxAccess(s, P.id, 'edit'); const r = await mailRec(P.id, P.key); const st = String(b && b.status || '');
    if (!['new', 'read', 'handled'].includes(st)) throw new HttpError(400, 'Choose new, read or handled');
    r.status = st; if (st === 'handled') { r.handledBy = { name: s.name, email: s.email }; r.handledAt = now(); } else { r.handledBy = null; r.handledAt = null; if (st === 'new') r.readBy = null; }
    await dbPut('ml.' + P.id, r.key, r); await audit(P.id, s.id, 'mail-' + st, r.key); return ok({ mail: mailOut(r) });
  });
  // checks the original message in Microsoft 365 (it may have been deleted or moved since it was stored)
  route('POST', '/api/projects/:id/mail/:key/refresh', async (b, P) => {
    const s = await me(); await inboxAccess(s, P.id, 'read'); const r = await mailRec(P.id, P.key); if (!CTX.fetch) throw new HttpError(503, 'Not available here');
    const box = await mailboxAddress(); const base = box ? 'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(box) : 'https://graph.microsoft.com/v1.0/me';
    let x; try { x = await CTX.fetch(MAIL_CRED, base + '/messages/' + encodeURIComponent(r.gid) + '?$select=id,subject,webLink,parentFolderId', { method: 'GET' }); } catch (e) { throw new HttpError(424, 'The mailbox credential is not available'); }
    r.live = { checkedAt: now(), state: x.ok ? 'available' : x.status === 404 ? 'missing' : 'unknown' }; if (x.ok) { const j = await x.json(); if (j.webLink && /^https:\/\/outlook\./i.test(j.webLink)) r.webLink = String(j.webLink).slice(0, 1000); }
    await dbPut('ml.' + P.id, r.key, r); return ok({ mail: mailOut(r) });
  });
  // attachments come from Microsoft 365 on request (never stored in the app), only for attachments listed on this email, up to about 3 MB
  route('GET', '/api/projects/:id/mail/:key/attachments/:n', async (b, P) => {
    const s = await me(); await inboxAccess(s, P.id, 'read'); await limit('upload', s.id); const r = await mailRec(P.id, P.key); const a = (r.attachments || [])[Number(P.n)]; if (!a || !/^\d{1,2}$/.test(P.n)) throw new HttpError(404, 'Attachment not found');
    if (a.size > 3e6) throw new HttpError(413, 'This attachment is larger than 3 MB. Open the email in Outlook to get it.');
    const box = await mailboxAddress(); const base = box ? 'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(box) : 'https://graph.microsoft.com/v1.0/me';
    let x; try { x = await CTX.fetch(MAIL_CRED, base + '/messages/' + encodeURIComponent(r.gid) + '/attachments/' + encodeURIComponent(a.id) + '/$value', { method: 'GET', response: 'base64' }); } catch (e) { throw new HttpError(424, 'The mailbox credential is not available'); }
    if (!x.ok) throw new HttpError(x.status === 404 ? 404 : 502, x.status === 404 ? 'The attachment is no longer in the mailbox' : 'Microsoft returned ' + x.status);
    if (x.truncated) throw new HttpError(413, 'This attachment is too large to download here. Open the email in Outlook.');
    await audit(P.id, s.id, 'mail-attachment', r.key + '#' + P.n); return ok({ name: a.name, type: a.type, data: String(x.body || '') });
  });
  route('POST', '/api/projects/:id/mail/:key/ticket', async (b, P) => {
    const s = await me(); const { project } = await inboxAccess(s, P.id, 'edit'); const r = await mailRec(P.id, P.key); if (r.ticket) return ok({ ticket: r.ticket });
    const t = await ingestMail(s, project, { messageId: r.gid, conversationId: r.gid, subject: r.subject, body: r.body || '(empty message)', from: r.from, receivedAt: r.receivedAt, attachments: (r.attachments || []).map(a => ({ name: a.name })) });
    r.ticket = { id: t.id, n: t.ticket }; await dbPut('ml.' + P.id, r.key, r); return ok({ ticket: r.ticket });
  });

  // ---------- Teams: create a ticket through Otto ----------
  // Otto (the facilio.work Teams bot) calls these as MCP tools AS the person who asked, so project permissions are the same as in the app. create_ticket is confirm-gated: Otto shows the fields and the person approves, which is the review step.
  const TEAMS_TYPES = { customer_issue: ['Client request', 'external'], internal_feedback: ['Other', 'internal'], question: ['Question', 'external'], bug: ['Defect', 'internal'], other: ['Other', 'internal'] };
  const guessType = t => /\b(bug|error|broken|crash|fails?|not working|defect|exception)\b/i.test(t) ? 'bug' : /\?|\b(how|why|can we|clarif|question|confirm)\b/i.test(t) ? 'question' : /\b(feedback|suggest|idea|improve|internal)\b/i.test(t) ? 'internal_feedback' : /\b(customer|client|requested|asked us|wants)\b/i.test(t) ? 'customer_issue' : 'other';
  const guessPrio = t => /\b(urgent|asap|critical|blocker|production down|go-?live)\b/i.test(t) ? 'High' : 'Medium';
  async function editableProjects(s) { const ar = await adminRole(s); const rows = (await dbList('projects')).map(r => r.value).filter(p => p && !p.archived); return rows.filter(p => ar ? ar !== 'sub' : ((p.members || []).find(m => m.id === s.id) || {}).role === 'owner' || ((p.members || []).find(m => m.id === s.id) || {}).role === 'editor'); }
  async function resolveProject(s, q) { const ps = await editableProjects(s); const k = String(q || '').trim().toLowerCase(); if (!k) throw new HttpError(400, 'Say which project this ticket belongs to. Projects you can use: ' + ps.slice(0, 15).map(p => p.name).join(', ')); const hit = ps.filter(p => p.id === q || p.name.toLowerCase() === k); const part = hit.length ? hit : ps.filter(p => (p.name + ' ' + (p.customer || '')).toLowerCase().includes(k)); if (part.length === 1) return part[0]; throw new HttpError(part.length ? 409 : 404, part.length ? 'More than one project matches: ' + part.slice(0, 8).map(p => p.name).join(', ') + '. Use the exact name.' : 'No project you can edit matches "' + q + '".'); }
  route('POST', '/api/', async (b) => {
    const tool = String(HDR['x-work-mcp-tool'] || ''); const s = await me(); b = b || {};
    if (tool === 'list_projects') { const ps = await editableProjects(s); return ok({ projects: ps.slice(0, 50).map(p => ({ name: p.name, customer: p.customer || '' })) }); }
    if (tool === 'suggest_ticket') { const text = String(b.text || ''); const ty = guessType(text); const ps = await editableProjects(s); const k = text.toLowerCase(); const cand = ps.filter(p => k.includes(String(p.customer || '').toLowerCase()) && p.customer || k.includes(p.name.toLowerCase())).slice(0, 5);
      return ok({ ticketType: ty, category: TEAMS_TYPES[ty][0], priority: guessPrio(text), subject: text.replace(/\s+/g, ' ').trim().slice(0, 100), projectCandidates: cand.map(p => p.name), note: 'Suggestions only. Check type, priority and project before creating the ticket.' }); }
    if (tool === 'create_ticket') {
      await limit('teams', s.id); const project = await resolveProject(s, b.project); await projectAccess(s, project.id, 'edit');
      const subject = str(b.subject, 200, 'Subject', true); const description = str(b.description || b.subject, 20000, 'Description'); const ty = TEAMS_TYPES[b.ticketType] ? b.ticketType : guessType(subject + ' ' + description); const prio = TKT_PRIO.includes(b.priority) ? b.priority : 'Medium';
      const link = String(b.teamsMessageLink || '').slice(0, 600); if (link && !/^https:\/\/teams\.(microsoft|live)\.com\//i.test(link)) throw new HttpError(400, 'The Teams message link is not a Teams link');
      const ref = String(b.teamsMessageId || link || '').slice(0, 280); const ext = ref ? 'teams:' + ref : ''; const all = await itemsOf(project.id, 'tkt');
      const url = 'https://facilio-delivery-studio.facilio.work/#/p/' + project.id + '/tickets';
      const dup = ext && all.find(t => t.data.extRef === ext); if (dup) return ok({ duplicate: true, ticket: 'TKT-' + dup.data.n, project: project.name, url, message: 'A ticket for this Teams message already exists: TKT-' + dup.data.n });
      const key = 'tk_' + rid('').slice(1, 13); const t = now();
      const data = await ticketSanitize(s, project.id, null, { subject, description, status: 'New', priority: prio, category: TEAMS_TYPES[ty][0], origin: TEAMS_TYPES[ty][1], ticketType: ty, source: 'teams', org: project.customer || '', requester: { name: String(b.requesterName || s.name || s.email).slice(0, 120), email: '' }, reporter: { name: s.name, email: s.email }, extRef: ext, teams: link ? { messageLink: link } : undefined, thread: [] });
      await withLock('it.' + project.id + '.tkt.' + key, async () => { await save('it.' + project.id + '.tkt', 'ip.' + project.id + '.tkt', key, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: t, ua: t }, Object.assign(data, { hist: [{ at: t, who: s.name || s.email, side: 'facilio', event: 'Created from Microsoft Teams' }] })); });
      await ticketNotify(project, key, null, data, s); await audit(project.id, s.id, 'tkt-teams', key);
      return ok({ duplicate: false, ticket: 'TKT-' + data.n, project: project.name, category: data.category, priority: data.priority, url, message: 'Created TKT-' + data.n + ' in ' + project.name }, 201);
    }
    throw new HttpError(404, 'Unknown tool');
  });

  // client items -> tickets: feedback, questions and anything raised on the client side, plus questions open in Delivery Studio. Idempotent: every source is keyed once (extRef) and never rewritten.
  route('POST', '/api/projects/:id/tickets/sync-client', async (b, P) => {
    const s = await me(); const { project } = await projectAccess(s, P.id, 'edit');
    const all = await itemsOf(P.id, 'tkt'); const have = new Set(all.map(t => t.data.extRef).filter(Boolean)); const cand = [];
    const FBC = { question: 'Question', concern: 'Client request', feedback: 'UAT finding', change: 'Change request' }, FBP = { high: 'High', normal: 'Medium', low: 'Low' };
    (await dbList('fb.' + P.id)).map(r => r.value).forEach(f => { if (!f || !f.id) return; cand.push({ ref: 'fb:' + f.id, subject: (f.topic || f.body || 'Feedback').slice(0, 120), body: f.body || '', category: FBC[f.kind] || 'Client request', priority: FBP[f.priority] || 'Medium', status: f.status === 'resolved' ? 'Resolved' : f.status === 'answered' ? 'Waiting for Client' : 'New', source: 'client feedback', by: f.authorName, link: { kind: 'feedback', ref: f.id, label: (f.module ? f.module + ': ' : '') + (f.topic || 'Feedback') }, at: f.createdAt, reply: f.response }); });
    const KC = { raid: 'Defect', action: 'Client request', cr: 'Change request', hc: 'Defect' };
    for (const k of Object.keys(KC)) (await itemsOf(P.id, k)).filter(i => i.createdSide && i.createdSide !== 'facilio').forEach(i => { const d = i.data || {}; const t = String(d.title || d.name || d.summary || d.description || 'Client item').slice(0, 120); cand.push({ ref: k + ':' + i.id, subject: t, body: String(d.description || d.details || d.title || t), category: KC[k], priority: 'Medium', status: 'New', source: 'client portal', by: '', link: { kind: k, ref: i.id, label: t }, at: i.createdAt }); });
    const tr = await docRead(P.id, 'transcripts'); const cs = (tr && tr.data && tr.data.candidates) || [];
    cs.filter(c => c && c.status === 'clarify' && c.id).forEach(c => cand.push({ ref: 'tr:' + c.id, subject: ('Needs clarification: ' + (c.title || c.text || '')).slice(0, 120), body: String(c.text || '') + (c.context ? '\n\nContext: ' + c.context : ''), category: 'Question', priority: 'Medium', status: 'New', source: 'delivery studio', by: c.speaker || '', link: { kind: 'transcript', ref: c.id, label: 'Transcript question' }, at: tr.data.updatedAt || now() }));
    let created = 0; const t = now();
    for (const c of cand) {
      if (have.has(c.ref) || created >= 50) continue;
      const key = 'tk_' + rid('').slice(1, 13);
      const data = await ticketSanitize(s, P.id, null, { subject: c.subject, description: c.body.slice(0, 20000), status: c.status, priority: c.priority, category: c.category, source: c.source, org: project.customer || '', requester: { name: c.by || project.customer || 'Client', email: '' }, link: c.link, extRef: c.ref, thread: [] });
      await withLock('it.' + P.id + '.tkt.' + key, async () => { await save('it.' + P.id + '.tkt', 'ip.' + P.id + '.tkt', key, { v: 1, cb: s.id, cs: 'facilio', ub: s.id, us: 'facilio', ca: c.at || t, ua: t }, Object.assign(data, { hist: [{ at: t, who: 'Delivery Studio', side: 'facilio', event: 'Created from ' + c.source }] })); });
      if (c.reply) { try { await ticketAppend(s, P.id, key, { type: 'reply', text: c.reply, by: 'Facilio team' }); } catch (e) { } }
      have.add(c.ref); created++;
    }
    if (created) await audit(P.id, s.id, 'tkt-sync', String(created)); return ok({ created, scanned: cand.length });
  });

  route('GET', '/api/projects/:id/items', async (b, P, Q) => { const s = await me(); await projectAccess(s, P.id, 'read'); const kinds = kindList(Q.get('kinds')); if (!kinds.length) throw new HttpError(400, 'Name the kinds to load'); return ok({ items: await itemsFor(P.id, kinds) }); });
  route('GET', '/api/projects/:id/open', async (b, P, Q) => {
    const s = await me(); const { project, role } = await projectAccess(s, P.id, 'read');
    const secs = String(Q.get('sections') || '').split(',').filter(k => k && DOC_SECTIONS.test(k)).slice(0, 40); const kq = String(Q.get('kinds') || ''); const kinds = kq === 'all' ? KINDS : kindList(kq);
    const [docRows, items] = await Promise.all([Promise.all(secs.map(k => docRead(P.id, k))), itemsFor(P.id, kinds)]);
    const docs = {}; secs.forEach((k, i) => { docs[k] = docRows[i] ? { data: docRows[i].data, version: docRows[i].head.v } : { data: null, version: 0 }; });
    return ok({ project: projectOut(project, role), members: (project.members || []).map(memberOut), docs, items, kinds });
  });
  route('PUT', '/api/projects/:id/items/:kind/:item', async (b, P) => withLock('it.' + P.id + '.' + P.kind + '.' + P.item, async () => {
    const s = await me(); if (!KINDS.includes(P.kind) || !ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Unknown item type'); const { project, role } = await projectAccess(s, P.id, 'edit');
    if (!b || !b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw new HttpError(400, 'data is required');
    const col = 'it.' + P.id + '.' + P.kind, pcol = 'ip.' + P.id + '.' + P.kind; const curRow = await dbGet(col, P.item); const head = curRow && curRow.value; const cur = head ? await unpack(pcol, P.item, head) : null;
    if (Number.isInteger(b.baseVersion) && (head ? head.v : 0) !== b.baseVersion) throw new HttpError(409, 'Conflict: this record was changed by someone else.', { current: head ? itemOut(P.kind, P.item, head, cur) : null });
    let data = b.data; decisionGuard(P.kind, role, cur, data);
    if (P.kind === 'ai') { // AI drafts: status and approval are set only by the decision route; an edit to approved text reopens it as a draft
      if (!cur) throw new HttpError(403, 'AI drafts are created by the assistant only');
      const edited = typeof data.content === 'string' && data.content !== cur.content;
      data = Object.assign({}, cur, { content: typeof data.content === 'string' ? data.content.slice(0, 60000) : cur.content, status: edited && cur.status === 'approved' ? 'draft' : cur.status, approvedBy: edited && cur.status === 'approved' ? null : cur.approvedBy, approvedAt: edited && cur.status === 'approved' ? null : cur.approvedAt, version: edited ? (cur.version || 1) + 1 : cur.version });
    }
    if (P.kind === 'ugd') { // user guides: approval is set only by the decision route; editing approved content reopens it
      const edited = cur && JSON.stringify([data.title, data.sections, data.customer, data.version]) !== JSON.stringify([cur.title, cur.sections, cur.customer, cur.version]);
      data = Object.assign({}, data, cur ? { status: edited && cur.status === 'approved' ? 'draft' : cur.status, approvedBy: edited && cur.status === 'approved' ? null : cur.approvedBy, approvedAt: edited && cur.status === 'approved' ? null : cur.approvedAt } : { status: 'draft', approvedBy: null, approvedAt: null });
    }
    // extRef/extConv tie a ticket to its source (a mail, a Teams message, client feedback) and are set only by the server; the page cannot set them
    // or seed a ticket with a made-up first message (it can still write a description).
    if (P.kind === 'tkt') { data = Object.assign({}, data, { extRef: cur ? cur.extRef : undefined, extConv: cur ? cur.extConv : undefined, thread: cur ? data.thread : [] }); data = await ticketSanitize(s, P.id, cur, data); }
    for (const f of ['link', 'url', 'doc', 'evidence', 'href', 'miro']) { const u = data[f]; if (typeof u === 'string' && /^\s*[a-z][a-z0-9+.-]*:/i.test(u) && !/^\s*(https?:\/\/|mailto:)/i.test(u)) throw new HttpError(400, 'Links must start with https://, http:// or mailto:'); }
    if (P.kind === 'wb' && (!Array.isArray(data.nodes) || !Array.isArray(data.edges) || data.nodes.length > 3000 || data.edges.length > 6000)) throw new HttpError(400, 'A board needs nodes and edges lists (up to 3000 shapes and 6000 connectors)');
    if (P.kind === 'cflow') { str(data.name, 120, 'Name', true); str(data.desc || '', 1500, 'Description'); if (!Array.isArray(data.nodes) || !Array.isArray(data.edges) || !data.nodes.length || data.nodes.length > 600 || data.edges.length > 1500) throw new HttpError(400, 'A combined flow needs 1 to 600 shapes and up to 1500 connectors'); data = Object.assign({}, data, { inBrd: !!data.inBrd }); }
    if (P.kind === 'res') { const u = String(data.url || '').trim(); if (!/^https?:\/\/[^\s]+$/i.test(u)) throw new HttpError(400, 'Enter a full link starting with http:// or https://'); if (!String(data.name || '').trim()) throw new HttpError(400, 'Name is required'); data = Object.assign({}, data, { url: u, name: String(data.name).trim().slice(0, 200), createdByName: cur ? cur.createdByName : (s.name || s.email) }); }
    if (P.kind === 'pnote') { str(data.title, 200, 'Title', true); str(data.body || '', 20000, 'Note'); }
    // Explore Facilio entries: text only (shown escaped), a fixed status, an uploaded image by file id; publishing is for project owners and admins
    if (P.kind === 'news') {
      const list = (v, n, m) => (Array.isArray(v) ? v : []).slice(0, n).map((x, i) => str(x, m, 'Item ' + (i + 1))).filter(Boolean);
      const st = ['draft', 'published'].includes(data.status) ? data.status : 'draft';
      if (st === 'published' && (!cur || cur.status !== 'published') && role !== 'owner') throw new HttpError(403, 'Only project owners and admins can publish to the customer');   // admins arrive here with role 'owner'
      data = { title: str(data.title, 160, 'Title', true), module: str(data.module || '', 80, 'Module'), problem: str(data.problem || '', 1200, 'Problem'), summary: str(data.summary || '', 2000, 'Summary'),
        capabilities: list(data.capabilities, 12, 300), useCases: list(data.useCases, 8, 300), relation: str(data.relation || '', 1200, 'Relationship to the project'),
        availability: ['enabled', 'optional', 'discuss'].includes(data.availability) ? data.availability : 'discuss', source: str(data.source || '', 300, 'Source'),
        imageId: typeof data.imageId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(data.imageId) ? data.imageId : '', imageAlt: str(data.imageAlt || '', 200, 'Image description'),
        status: st, publishedAt: st === 'published' ? (cur && cur.status === 'published' ? cur.publishedAt : now()) : null, publishedBy: st === 'published' ? (cur && cur.status === 'published' ? cur.publishedBy : s.email) : null, order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0 };
    }
    // interest requests: who asked and when come from the session, never from the page
    if (P.kind === 'interest') {
      data = { newsId: str(data.newsId || '', 80, 'Entry'), title: str(data.title || '', 160, 'Title', true), module: str(data.module || '', 80, 'Module'), note: str(data.note || '', 1000, 'Note'),
        status: ['new', 'contacted', 'demo', 'closed'].includes(data.status) ? data.status : 'new', owner: str(data.owner || '', 120, 'Owner'),
        by: cur ? cur.by : s.email, byName: cur ? cur.byName : (s.name || s.email), byCustomer: cur ? !!cur.byCustomer : role === 'customer', at: cur ? cur.at : now() };
    }
    if (P.kind === 'res' || P.kind === 'pnote') data = Object.assign({}, data, { createdByName: cur ? cur.createdByName : s.name, createdByEmail: cur ? cur.createdByEmail : s.email });
    if (P.kind === 'cr' && !cur) { const all = await itemsOf(P.id, 'cr'); const mx = all.reduce((m, it) => (/^[0-9]+$/.test(String(it.data.n)) ? Math.max(m, Number(it.data.n)) : m), 0); data = Object.assign({}, data, { n: mx + 1 }); }
    else if (P.kind === 'cr' && cur) data = Object.assign({}, data, { n: cur.n });
    const prevHist = cur && Array.isArray(cur.hist) ? cur.hist : [];
    const changed = Object.keys(data).filter(k => k !== 'hist' && JSON.stringify(data[k]) !== JSON.stringify(cur ? cur[k] : undefined));
    data = Object.assign({}, data, { hist: prevHist.concat(changed.length || !cur ? [{ at: now(), who: s.name || 'Implementation team', side: 'facilio', event: cur ? 'Updated ' + changed.slice(0, 6).join(', ') + (data.status && changed.includes('status') ? ' → ' + data.status : '') : 'Created' }] : []).slice(-40) });
    if (JSON.stringify(data).length > (P.kind === 'onbws' ? 2000000 : (P.kind === 'ugd' || P.kind === 'ugv' || P.kind === 'ugu') ? 400000 : P.kind === 'vid' ? 200000 : P.kind === 'tkt' ? 150000 : 60000)) throw new HttpError(413, 'Record too large');
    const t = now(); const nh = { v: head ? head.v + 1 : 1, cb: head ? head.cb : s.id, cs: head ? head.cs : 'facilio', ub: s.id, us: 'facilio', ca: head ? head.ca : t, ua: t };
    await save(col, pcol, P.item, nh, data, head && head.z); await touchProject(P.id);
    if (P.kind === 'tkt') await ticketNotify(project, P.item, cur, data, s);
    let notice; if (P.kind === 'interest' && !cur) { notice = await interestNotice(project, P.item, data) ? 'teams' : 'none'; await audit(P.id, s.id, 'interest-created', P.item + ' ' + data.title); }
    if (['signoff', 'cr', 'raid', 'onb', 'onbsub', 'decision', 'brdrev', 'ai', 'hc', 'ho', 'close', 'cmodx', 'cfgrel', 'capp', 'ugd', 'vid', 'tkt', 'res', 'ugv', 'ugu'].includes(P.kind)) await audit(P.id, s.id, P.kind + (cur ? '-updated' : '-created'), P.item + (data.status ? ' ' + data.status : ''));
    return ok(Object.assign({ item: itemOut(P.kind, P.item, nh, data) }, notice ? { notice } : {}));
  }));
  route('DELETE', '/api/projects/:id/items/:kind/:item', async (b, P) => {
    const s = await me(); if (!KINDS.includes(P.kind)) throw new HttpError(400, 'Unknown item type'); const { role } = await projectAccess(s, P.id, 'edit');
    const r = await dbGet('it.' + P.id + '.' + P.kind, P.item); if (!r) throw new HttpError(404, 'Not found');
    if (role !== 'owner' && DECISION_MSG[P.kind]) { const cur = await unpack('ip.' + P.id + '.' + P.kind, P.item, r.value); if (decided(P.kind, cur)) throw new HttpError(403, 'Only a project owner or an admin can delete a decided record.'); }
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
    const s = await me(); await projectAccess(s, P.id, 'edit'); await limit('ticket', s.id); const id = rid('fb'); const t = now();
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
    const s = await me(); await projectAccess(s, P.id, 'edit'); const rule = FILE_RULES[b.category]; if (!rule) throw new HttpError(400, 'Unknown file category'); await limit('upload', s.id);
    const name = str(b.name, 255, 'File name', true); if (/[\u0000-\u001f\u007f\/\\]/.test(name)) throw new HttpError(400, 'The file name has characters that are not allowed'); const ext = (name.split('.').pop() || '').toLowerCase(); if (!rule.ext.includes(ext)) throw new HttpError(415, 'Unsupported file type .' + ext + ' — allowed: ' + rule.ext.join(', '));
    const size = Number(b.size); if (!(size > 0) || size > rule.max) throw new HttpError(413, 'File is empty or too large (max ' + Math.round(rule.max / 1e6) + ' MB)');
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : {}; if (JSON.stringify(meta).length > 20000) throw new HttpError(400, 'Metadata too large');
    if (b.replaces) { const old = await dbGet('fl.' + P.id, b.replaces); if (!old) throw new HttpError(404, 'File to replace not found'); }
    const chunks = Math.ceil(size / CHUNK), id = rid('f');
    await dbPut('fl.' + P.id, id, { id, category: b.category, name, mime: /^[\w.+-]{1,60}\/[\w.+-]{1,60}$/.test(String(b.mime || '')) ? String(b.mime) : 'application/octet-stream', size, chunks, status: 'uploading', meta, replaces: b.replaces || null, supersededBy: null, createdBy: s.id, createdAt: now(), deletedAt: null, urls: [] });
    return ok({ id, chunkSize: CHUNK, chunks }, 201);
  });
  // bytes never pass through this function: the page asks for a one-time upload link, PUTs the part straight to storage, then tells us it is done
  const chunkOf = async (s, P, need) => { await projectAccess(s, P.id, need); const r = await dbGet('fl.' + P.id, P.fid); if (!r || r.value.status !== 'uploading') throw new HttpError(404, 'Upload not found'); const n = Number(P.n); if (!Number.isInteger(n) || n < 0 || n >= r.value.chunks) throw new HttpError(400, 'Invalid chunk'); return { f: r.value, n }; };
  route('POST', '/api/projects/:id/files/:fid/chunks/:n/url', async (b, P) => {
    const s = await me(); const { n } = await chunkOf(s, P, 'edit'); const u = await CTX.files.uploadUrl(P.fid + '-' + n + '.bin', { private: true }); const cur = (await dbGet('fl.' + P.id, P.fid)).value; cur.mint = Object.assign({}, cur.mint, { [n]: u.file_id }); await dbPut('fl.' + P.id, P.fid, cur); return ok({ url: u.url, fileId: u.file_id });
  });
  route('PUT', '/api/projects/:id/files/:fid/chunks/:n', async (b, P) => {
    const s = await me(); const { n } = await chunkOf(s, P, 'edit'); if (!b || typeof b.fileId !== 'string') throw new HttpError(400, 'fileId missing');
    const fresh = (await dbGet('fl.' + P.id, P.fid)).value; if (!fresh.mint || fresh.mint[n] !== b.fileId) throw new HttpError(400, 'That upload was not issued for this file part'); fresh.urls[n] = b.fileId; await dbPut('fl.' + P.id, P.fid, fresh); return ok({ ok: true });
  });
  route('POST', '/api/projects/:id/files/:fid/complete', async (b, P) => {
    const s = await me(); await projectAccess(s, P.id, 'edit'); const r = await dbGet('fl.' + P.id, P.fid); if (!r) throw new HttpError(404, 'Upload not found'); const f = r.value; if (f.status === 'ready') return ok({ file: fileOut(f) });
    for (let i = 0; i < f.chunks; i++) if (!f.urls[i]) throw new HttpError(400, 'Chunk ' + i + ' missing');
    // the file's first bytes must match its extension (a .pdf must be a PDF, an .xlsx a ZIP package, and so on)
    const head = await headBytes(f.urls[0]); const verdict = head ? contentMatches(f.name, head) : null;
    if (verdict === false) { f.status = 'rejected'; await dbPut('fl.' + P.id, P.fid, f); for (const id of f.urls) { try { await CTX.files.delete(id, { private: true }); } catch (e) { } } await audit(P.id, s.id, 'file-rejected', f.category + ': ' + f.name);
      throw new HttpError(415, 'The file content does not match its type (.' + (f.name.split('.').pop() || '').toLowerCase() + '). Save it again in that format and upload it.'); }
    if (verdict === null) console.log('file content not checked', P.id, P.fid);
    f.contentCheck = verdict === true ? 'ok' : 'unchecked'; f.status = 'ready'; await dbPut('fl.' + P.id, P.fid, f);
    if (f.replaces) { const o = await dbGet('fl.' + P.id, f.replaces); if (o) { o.value.supersededBy = f.id; await dbPut('fl.' + P.id, f.replaces, o.value); } }
    await audit(P.id, s.id, 'file-uploaded', f.category + ': ' + f.name); return ok({ file: fileOut(f) });
  });
  // ---------- upload content check ----------
  // Reads the first 4 KB of the first uploaded part. Returns null when the platform cannot hand the bytes back (the upload then
  // goes ahead as 'unchecked' and is logged), so a storage hiccup never blocks people's uploads.
  async function headBytes(fileId) {
    try { const g = await CTX.files.get(fileId, { private: true }); const b = await g.bytes(); return Buffer.from(b).subarray(0, 4096); } catch (e) { }
    try { const { url } = await CTX.files.url(fileId, { private: true, expires: 60 }); const r = await fetch(url, { headers: { range: 'bytes=0-4095' } }); if (r.ok || r.status === 206) return Buffer.from(await r.arrayBuffer()).subarray(0, 4096); } catch (e) { }
    return null;
  }
  const SIG = { zip: [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], ole: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], png: [[0x89, 0x50, 0x4E, 0x47]], jpg: [[0xFF, 0xD8, 0xFF]], gz: [[0x1F, 0x8B]] };
  const starts = (b, list) => list.some(sig => sig.every((x, i) => b[i] === x));
  function contentMatches(name, b) {
    const ext = (String(name).split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return b.subarray(0, 1024).includes(Buffer.from('%PDF-'));
    if (['docx', 'xlsx', 'xlsm', 'pptx', 'zip'].includes(ext)) return starts(b, SIG.zip);
    if (['xls', 'ppt', 'msg'].includes(ext)) return starts(b, SIG.ole);
    if (ext === 'png') return starts(b, SIG.png);
    if (ext === 'jpg' || ext === 'jpeg') return starts(b, SIG.jpg);
    if (ext === 'webp') return b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
    if (ext === 'gz') return starts(b, SIG.gz);
    if (['txt', 'csv', 'vtt', 'srt', 'json', 'eml'].includes(ext)) return !b.includes(0) && !starts(b, SIG.zip) && !starts(b, SIG.ole);  // text: no NUL bytes, not a binary package
    return null;
  }
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
    // system entries plus the AI-key and mailbox logs, which are written to their own collections
    const sys = []; for (const col of [SYS, 'au.ai', 'au.mailbox']) sys.push(...(await dbList(col)).map(r => Object.assign({ id: r.key, projectId: null }, r.value)));
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
    const A = await loadAll(); for (const r of A.rows) { if ((r.p.members || []).some(m => m.id === P.id)) await patchProject(r.p.id, x => { x.members = (x.members || []).filter(m => m.id !== P.id); }); }
    if (g) await dbDel('grant', P.id); await dbDel('usr', P.id); ADM = null; ROLE = null; await audit('sys', s.id, 'admin_remove_user', u.email); return ok({ ok: true });
  });
  route('PATCH', '/api/admin/projects/:id', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value;
    if (b.archived !== undefined) { await patchProject(p.id, x => { x.archived = !!b.archived; }); await audit(p.id, s.id, b.archived ? 'admin_archive_project' : 'admin_restore_project', p.name); }
    ADM = null; return ok({ ok: true });
  });
  route('GET', '/api/admin/projects/:id/members', async (b, P) => { await requireAdmin('sub'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); return ok({ members: (r.value.members || []).map(m => Object.assign(memberOut(m), { addedAt: null })) }); });
  route('POST', '/api/admin/projects/:id/members', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value;
    const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
    if (!isEmail(email) || !email.endsWith('@' + ALLOWED_DOMAIN)) throw new HttpError(400, 'Use a Facilio office email (name@' + ALLOWED_DOMAIN + ')');
    const id = ekey(email); const u = await dbGet('usr', id); const name = (u && u.value && u.value.name) || nameFromEmail(email); if (!u) await dbPut('usr', id, { email, name, seen: null, created: now() });
    await patchProject(p.id, x => { const ow = (x.members || []).filter(y => y.role === 'owner'); if (role !== 'owner' && ow.length === 1 && ow[0].id === id) throw new HttpError(400, 'A project needs at least one owner. Make someone else an owner first.'); x.members = (x.members || []).filter(y => y.id !== id).concat([{ id, email, name, role }]); }); ADM = null; await audit(p.id, s.id, 'admin_set_member', email + ' as ' + role); return ok({ ok: true });
  });
  route('DELETE', '/api/admin/projects/:id/members/:uid', async (b, P) => {
    const s = await requireAdmin('admin'); const r = await dbGet('projects', P.id); if (!r) throw new HttpError(404, 'Project not found'); const p = r.value; const m = (p.members || []).find(x => x.id === P.uid); if (!m) throw new HttpError(404, 'Member not found');
    await patchProject(p.id, x => { const mm = (x.members || []).find(y => y.id === P.uid); if (mm && mm.role === 'owner' && x.members.filter(y => y.role === 'owner').length <= 1) throw new HttpError(400, 'A project needs at least one owner. Add another owner first.');
      x.members = (x.members || []).filter(y => y.id !== P.uid); }); ADM = null; await audit(p.id, s.id, 'admin_remove_member', P.uid); return ok({ ok: true });
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
      try { if (method !== 'GET') { const s = await me(); await limit('write', s.id); }  // every change, of any kind, counts towards one per-person budget
        const G = {}; for (const k of Object.keys(m.groups || {})) { try { G[k] = decodeURIComponent(m.groups[k]); } catch (e) { G[k] = m.groups[k]; } } return await r.fn(body, G, u.searchParams); }
      catch (e) { if (e instanceof HttpError) return { status: e.status || 500, data: Object.assign({ error: e.message }, e.extra || {}) }; console.error('API error', method, path, e && e.stack || e); return { status: 500, data: { error: 'Something went wrong on the server. Try again; if it keeps happening, tell the Delivery Studio owner.' } }; }
    }
    return { status: 404, data: { error: 'Not found' } };
  }
  globalThis.__fwb = { dispatch, reset() { ME = null; ROLE = null; }, ekey, nameFromEmail };
}

export default async function handler(req, ctx) {
  CTX = ctx; HDR = (req && req.headers) || {}; globalThis.__fwb.reset();
  let query = req.query; if (query && typeof query === 'object') query = new URLSearchParams(query).toString(); query = String(query || '').replace(/^\?/, '');
  let body; if (req.method !== 'GET' && req.method !== 'DELETE') { const t = req.text ? await req.text() : ''; if (t) { try { body = JSON.parse(t); } catch (e) { body = {}; } } else body = {}; }
  const sub = String(req.path || '/').startsWith('/') ? req.path : '/' + req.path;
  const res = (await globalThis.__fwb.dispatch(req.method, '/api' + sub, query, body)) || { status: 500, data: { error: 'Something went wrong on the server.' } };
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  if (res.status === 429 && res.data && res.data.retryAfter) headers['retry-after'] = String(res.data.retryAfter);
  return new Response(JSON.stringify(res.data), { status: res.status, headers });
}
