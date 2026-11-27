// Deleting a project for good (POST /api/admin/projects/:id/delete) leaves nothing that still acts or shows: no Teams DM, no reminder, no job, no bell notice,
// no mail record or mail routing, no transfer, and the id is refused with 410 by the app and the connector tools. On a stand-in platform like tests/task_watch.mjs.
// NOT checked: the real platform database, real Teams delivery, SharePoint (the folder and its files are left as they are on purpose).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const day = k => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/; let sent = []; let told = [];
const mkctx = (email, role) => ({ viewer: { email, role: role || 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  secrets: { async get(name) { if (name === 'teams_notify') return 'on'; throw new Error('no secret'); } },
  teams: { async send(o) { sent.push(o); return { delivered: 1, muted: 0, failed: 0 }; } },
  broadcast: async m => { told.push(m); },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, role, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email, role)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, 'viewer', { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', ADM = 'adm.a@facilio.com';
const NAME = 'Gone Project', KEEP = 'Kept Project';

const pid = (await as(SAM, 'POST', '/api/projects', { name: NAME, customer: 'Acme' })).data.project.id;
const keep = (await as(SAM, 'POST', '/api/projects', { name: KEEP, customer: 'Beta' })).data.project.id;
for (const p of [pid, keep]) assert.equal((await as(SAM, 'POST', `/api/projects/${p}/members`, { email: KIM, role: 'editor' })).status, 201);
const put = (p, id, data) => as(SAM, 'PUT', `/api/projects/${p}/items/task/${id}`, { data });
assert.equal((await put(pid, 't1', { title: 'Gone overdue task', status: 'To Do', owner: KIM, due: '2020-01-01' })).status, 200);
assert.equal((await put(pid, 't2', { title: 'Gone due task', status: 'To Do', owner: KIM, due: day(1) })).status, 200);
assert.equal((await put(keep, 't3', { title: 'Kept due task', status: 'To Do', owner: KIM, due: day(1) })).status, 200);
const job = await as(SAM, 'POST', `/api/projects/${pid}/jobs`, { kind: 'pull_msa', note: 'Acme MSA' }); assert.equal(job.status, 201, JSON.stringify(job.data));
const xf = await as(KIM, 'POST', `/api/projects/${pid}/transfers`, { dir: 'pull', kind: 'msa', source: { system: 'sharepoint', ref: 'sites/acme/msa.docx', label: 'MSA' }, dest: { system: 'studio', ref: 'msa' }, scope: 'whole file' }); assert.equal(xf.status, 201, JSON.stringify(xf.data));
const ml = await as(SAM, 'POST', `/api/projects/${pid}/mailtasks`, { mails: [{ messageId: '<m1@acme.com>', from: { name: 'Sara', email: 'sara@acme.com' }, to: [SAM], cc: [], subject: 'Process flow change', body: 'The Work Order approval needs two steps.' }] }); assert.equal(ml.status, 201, JSON.stringify(ml.data));
assert.equal((await as(SAM, 'PUT', `/api/projects/${pid}/mail/senders`, { emails: ['sara@acme.com'], domains: [] })).status, 200);
assert.equal((await as(SAM, 'PUT', `/api/projects/${pid}/private-tasks`, { items: [{ id: 'pabc1', title: 'Call Sara' }] })).status, 200);
const scan = () => { const hits = []; for (const [c, m] of store) for (const [k, v] of m) if (c.includes(pid) || k.includes(pid) || v.includes(pid) || v.includes(NAME)) hits.push(c + ' / ' + k); return hits; };

await t('before the delete the project is live: the morning sweep sends Teams DMs and bell notices about it, and its stores exist', async () => {
  sent = []; assert.equal((await as(KIM, 'POST', '/api/notifications/sweep', {})).status, 200);
  assert.ok(sent.some(m => JSON.stringify(m).includes('Gone due task') || JSON.stringify(m).includes(NAME)), 'a Teams message about the project went out');
  const bell = (await as(KIM, 'GET', '/api/notifications')).data.items; assert.ok(bell.some(x => x.pid === pid), 'a bell notice of the project');
  assert.ok(scan().length > 10, 'the project has records');
});

await t('only the platform owner can delete for good, with the name typed back', async () => {
  assert.equal((await as(SAM, 'POST', `/api/admin/projects/${pid}/delete`, { confirm: NAME, direct: true })).status, 403);
  assert.equal((await as(ADM, 'POST', `/api/admin/projects/${pid}/delete`, { confirm: 'wrong', direct: true }, 'owner')).status, 400);
  told = []; const d = await as(ADM, 'POST', `/api/admin/projects/${pid}/delete`, { confirm: NAME, direct: true }, 'owner'); assert.equal(d.status, 200, JSON.stringify(d.data)); assert.ok(d.data.removed > 10);
  assert.ok(told.some(m => m.type === 'notify'), 'open pages are told to refresh their bell');
});

await t('nothing keyed to the project is left except the deleted marker and the platform audit line', async () => {
  const left = scan().filter(x => !/^gone \/ /.test(x) && !/^au\.sys \//.test(x)); assert.deepEqual(left, []);
  const g = JSON.parse(store.get('gone').get(pid)); assert.deepEqual(Object.keys(g), ['at'], 'the marker keeps no name');
});

await t('afterwards nobody is sent or shown anything about it; the other project still works', async () => {
  sent = []; for (const who of [KIM, SAM]) assert.equal((await as(who, 'POST', '/api/notifications/sweep', {})).status, 200);
  assert.ok(!sent.some(m => JSON.stringify(m).includes(pid) || /Gone (due|overdue) task|Gone Project/.test(JSON.stringify(m))), 'no Teams message of the deleted project');
  for (const who of [KIM, SAM]) assert.ok(!(await as(who, 'GET', '/api/notifications')).data.items.some(x => x.pid === pid), 'no bell notice of it for ' + who);
  sent = []; const dg = await tool(KIM, 'send_task_digest', { again: true }); assert.equal(dg.status, 200); assert.ok(!JSON.stringify(sent).includes('Gone'), 'the digest lists only live projects');
  const mine = await tool(KIM, 'my_tasks', {}); assert.deepEqual(mine.data.tasks.map(x => x.title), ['Kept due task']);
  assert.ok(!(await tool(KIM, 'find_projects', {})).data.projects.some(p => p.id === pid));
  assert.equal((await as(KIM, 'GET', `/api/projects/${keep}`)).status, 200);
});

await t('the id is refused with 410 and a plain reason: pages, jobs, transfers, mail and the connector tools', async () => {
  for (const path of [`/api/projects/${pid}`, `/api/projects/${pid}/jobs`, `/api/projects/${pid}/transfers`, `/api/projects/${pid}/mailtasks`, `/api/projects/${pid}/private-tasks`]) {
    const r = await as(KIM, 'GET', path); assert.equal(r.status, 410, path + ' ' + JSON.stringify(r.data)); assert.match(r.data.error, /deleted for good/); }
  assert.equal((await as(KIM, 'POST', `/api/projects/${pid}/jobs`, { kind: 'pull_msa' })).status, 410, 'no new job');
  for (const [name, body] of [['project_overview', { project: pid }], ['project_jobs', { project: pid, action: 'list' }], ['get_records', { project: pid, kind: 'task' }], ['transfer_read', { project: pid, action: 'list' }]]) {
    const r = await tool(KIM, name, body); assert.equal(r.status, 410, name + ' ' + JSON.stringify(r.data)); assert.match(r.data.error, /deleted for good/, name); }
  assert.equal((await as(ADM, 'POST', `/api/admin/projects/${pid}/delete`, { confirm: NAME, direct: true }, 'owner')).status, 404, 'deleting twice is a plain not found');
});

console.log(n + ' project delete checks passed');
