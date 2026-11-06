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
// Kick-off documents on the server (work/server/api.mjs PUT/GET docs): approval is the owner's, an approved pack cannot be changed by an editor,
// open change requests block approval, and customers can neither read nor write the drafts. Stand-in platform as in tests/msa_project_route.mjs.
const put = (who, sec, data) => as(who, 'PUT', `/api/projects/${pid}/docs/${sec}`, { data });
const pack = status => ({ status, plan: { milestones: [] }, deck: {} });
await t('an editor can save a draft but not approve, discard or forge an approver', async () => {
  assert.equal((await put(SAM, 'kickoff_pack', pack('draft'))).status, 200);
  assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { builtAt: 'x' }))).status, 200);
  assert.equal((await put(KIM, 'kickoff_pack', pack('approved'))).status, 403); assert.equal((await put(KIM, 'kickoff_pack', pack('discarded'))).status, 403);
  assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { approvedBy: 'sam' }))).status, 403);
});
await t('open change requests block the owner\'s approval; closed ones do not', async () => {
  assert.equal((await put(SAM, 'kickoff_cr', { items: [{ id: 'cr_1', text: 'x', status: 'open' }] })).status, 200);
  assert.equal((await put(SAM, 'kickoff_pack', pack('approved'))).status, 409);
  assert.equal((await put(SAM, 'kickoff_cr', { items: [{ id: 'cr_1', text: 'x', status: 'dismissed' }] })).status, 200);
  assert.equal((await put(SAM, 'kickoff_pack', pack('approved'))).status, 200);
});
await t('an approved pack cannot be changed or reopened by an editor, and the owner can reopen it', async () => {
  assert.equal((await put(KIM, 'kickoff_pack', pack('approved'))).status, 403); assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { x: 1 }))).status, 403);
  assert.equal((await put(SAM, 'kickoff_pack', pack('draft'))).status, 200);
});
await t('customers can neither read nor write the kick-off drafts, and the bundle leaves them out', async () => {
  for (const sec of ['kickoff_pack', 'kickoff_cr']) { assert.equal((await as(CUS, 'GET', `/api/projects/${pid}/docs/${sec}`)).status, 403); assert.equal((await put(CUS, sec, {})).status, 403); }
  const b = await as(CUS, 'GET', `/api/projects/${pid}/open?sections=kickoff_pack,kickoff_cr&kinds=`); const d = JSON.stringify(b.data || {}); assert.ok(!d.includes('"status":"draft"') || !d.includes('kickoff_pack'), 'the draft pack is not in the bundle');
  assert.equal((await as(KIM, 'GET', `/api/projects/${pid}/docs/kickoff_pack`)).status, 200);
});
console.log(`${n} kick-off document checks passed`);
