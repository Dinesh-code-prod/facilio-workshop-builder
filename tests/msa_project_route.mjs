// Start project from MSA, the routes the Transfers page calls (work/server/_msaapi.mjs): GET /api/me/holding and
// POST /api/projects/:id/transfers/:tid/start-project, on the stand-in platform of tests/msa_extract.mjs.
// NOT checked here: a real Claude session, a real Microsoft 365 connector call, a real MSA, the live app.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { holdingId } from '../work/server/_msaextract.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get() { throw new Error('no secret'); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (s.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com';
const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Route Intake', customer: 'Internal' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const hid = e => holdingId(globalThis.__fwb.ekey(e));
const EXT = name => ({ customer: 'Route Co', projectName: name, contract: { start: '2026-12-01', end: '2027-02-28', durationDays: 90, term: '24 months', origin: 'contract' }, scope: [{ text: 'Work order management', status: 'confirmed', origin: 'contract', source: { page: 4 } }] });
const save = (who, ref, name, body) => tool(who, 'msa_extraction_save', Object.assign({ source: { system: 'sharepoint', ref, label: 'x.pdf' }, extraction: EXT(name) }, body));
const mv = (space, who, id, body) => as(who, 'POST', `/api/projects/${space}/transfers/${id}/transition`, body);
const start = (who, space, id) => as(who, 'POST', `/api/projects/${space}/transfers/${id}/start-project`, {});
const projects = () => [...store.get('projects').values()].map(x => JSON.parse(x));

await t('GET /api/me/holding returns the caller\'s own holding id, different for each person', async () => {
  const a = await as(SAM, 'GET', '/api/me/holding'), b = await as(KIM, 'GET', '/api/me/holding'); assert.equal(a.status, 200); assert.equal(a.data.id, hid(SAM)); assert.equal(b.data.id, hid(KIM)); assert.notEqual(a.data.id, b.data.id);
});
const id = (await save(SAM, 'sites/acme/a.pdf', 'Route project')).data.transfer.id;
await t('the holding list through the ordinary route shows next[] and approval is allowed for its owner only', async () => {
  const l = (await as(SAM, 'GET', `/api/projects/${hid(SAM)}/transfers?kind=msa`)).data; assert.equal(l.transfers.length, 1); assert.ok(l.transfers[0].next.includes('Approved'));
  assert.equal((await as(KIM, 'GET', `/api/projects/${hid(SAM)}/transfers`)).status, 404);
});
await t('start-project is refused before approval (409), for another person (404) and makes nothing', async () => {
  const before = projects().length; const r = await start(SAM, hid(SAM), id); assert.equal(r.status, 409); assert.match(r.data.error, /approve it in Delivery Studio/);
  assert.equal((await start(KIM, hid(SAM), id)).status, 404); assert.equal((await start(SAM, hid(SAM), 'x-' + 'a'.repeat(32))).status, 404); assert.equal(projects().length, before);
});
let made;
await t('after approval start-project makes a NEW project and answers with its id and url', async () => {
  assert.equal((await mv(hid(SAM), SAM, id, { to: 'Approved', ver: 1, baseVersion: 1 })).status, 200);
  const r = await start(SAM, hid(SAM), id); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.created, true); assert.equal(r.data.complete, true); made = r.data.project.id; assert.match(made, /^p_/); assert.notEqual(made, pid); assert.match(r.data.project.url, /#\/p\/p_/);
  assert.equal((await as(SAM, 'GET', '/api/projects/' + made)).data.project.name, 'Route project');
  const kp = (await as(SAM, 'GET', '/api/projects/' + made + '/docs/kickoff_pack')).data.data; assert.ok(kp && kp.status === 'draft' && kp.from.transferId === id && kp.rows.length === 15, 'the kick-off pack is written as a draft');
});
await t('a second call (and two at once) return the same project, created: false, nothing new', async () => {
  const before = projects().length; const rs = [await start(SAM, hid(SAM), id), ...(await Promise.all([start(SAM, hid(SAM), id), start(SAM, hid(SAM), id)]))];
  for (const r of rs) { assert.equal(r.status, 200); assert.equal(r.data.created, false); assert.equal(r.data.project.id, made); } assert.equal(projects().length, before);
  assert.equal((await as(SAM, 'GET', `/api/projects/${hid(SAM)}/transfers/${id}`)).data.transfer.projectId, made);
});
await t('in a project: the owner approves, a viewer and a customer are refused, an editor may start and never overwrites', async () => {
  const pr = (await save(SAM, 'sites/acme/b.pdf', 'In project', { project: pid })).data.transfer.id;
  assert.equal((await start(KIM, pid, pr)).status, 409); assert.equal((await mv(pid, SAM, pr, { to: 'Approved', ver: 1 })).status, 200);
  assert.equal((await start(VIC, pid, pr)).status, 403); assert.ok([403, 404].includes((await start(CUS, pid, pr)).status));
  const c = await start(KIM, pid, pr); assert.equal(c.status, 200); assert.equal(c.data.created, true); const again = await start(SAM, pid, pr); assert.equal(again.data.created, false); assert.equal(again.data.project, null, 'Sam owns the intake project but is not a member of the new one: its id is not shown to him');
  assert.equal((await as(SAM, 'GET', '/api/projects/' + pid)).data.project.name, 'Route Intake', 'the existing project is untouched');
});
await t('a transfer that is not an MSA extraction is refused (400)', async () => {
  const b = (await tool(SAM, 'transfer_begin', { project: 'holding', dir: 'generate', kind: 'brd', source: { system: 'studio', ref: 'a' }, dest: { system: 'sharepoint', ref: 'b' } })).data.transfer.id; assert.equal((await start(SAM, hid(SAM), b)).status, 400);
});
console.log(n + ' start-project route checks passed');
