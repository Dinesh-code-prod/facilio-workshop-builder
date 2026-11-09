// Private tasks (work/server/_privatetasks.mjs through work/server/api.mjs), on a stand-in platform like tests/transfer_routes.mjs.
// The point under test is privacy: one person's list is never visible to another member, an admin, a customer or an outsider, and nothing shared (the task list, the connector tools) lists it.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { cleanList, MAX_ITEMS } from '../work/server/_privatetasks.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = (email, role) => ({ viewer: { email, role: role || 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get() { throw new Error('no secret'); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k, updated_at: '' }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), next_cursor: null }; }
  },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } }, teams: null, log: () => { } });
const as = async (email, method, path, body, role) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email, role)); return { status: r.status, data: await r.json() }; };
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', CUS = 'cus.c@facilio.com', EVE = 'eve.x@facilio.com', ADM = 'adm.a@facilio.com';

const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Private Test', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const URL_ = `/api/projects/${pid}/private-tasks`;
const item = (id, title, extra) => Object.assign({ id, title, notes: '', due: '', priority: '', status: 'To Do' }, extra);

await t('the list is cleaned: known fields only, bad ids and empty titles dropped, dates and priority checked, no duplicates, bounded', () => {
  const out = cleanList([item('pa1b', ' Call the vendor '), item('pa1b', 'again'), item('bad id', 'x'), item('pc2d', ''), { id: 'pe3f', title: 'T', due: '12/11/2026', priority: 'Urgent', status: 'Done', evil: '<script>' }, null, 'x'], '2026-11-09T00:00:00Z');
  assert.deepEqual(out.map(x => x.id), ['pa1b', 'pe3f']); assert.equal(out[0].title, 'Call the vendor'); assert.deepEqual([out[1].due, out[1].priority, out[1].status], ['', '', 'Done']); assert.ok(!('evil' in out[1])); assert.ok(out[1].doneAt);
  assert.equal(cleanList(Array.from({ length: MAX_ITEMS + 50 }, (_, i) => item('p' + (100000 + i).toString(36), 'T' + i)), '').length, MAX_ITEMS);
});
await t('a person saves a private list and reads it back', async () => {
  const w = await as(SAM, 'PUT', URL_, { items: [item('pa1b', 'Prepare my notes for the workshop', { due: '2026-11-10', priority: 'High', notes: 'ask Priya' }), item('pc2d', 'Book a room')] }); assert.equal(w.status, 200, JSON.stringify(w.data));
  const r = await as(SAM, 'GET', URL_); assert.equal(r.status, 200); assert.deepEqual(r.data.items.map(x => x.title), ['Prepare my notes for the workshop', 'Book a room']); assert.equal(r.data.items[0].priority, 'High');
});
await t('another team member sees only their own list, which is empty: never the first person\'s', async () => {
  const r = await as(KIM, 'GET', URL_); assert.equal(r.status, 200); assert.deepEqual(r.data.items, []);
  assert.equal((await as(KIM, 'PUT', URL_, { items: [item('pk9z', 'Kim only')] })).status, 200);
  assert.deepEqual((await as(SAM, 'GET', URL_)).data.items.map(x => x.title), ['Prepare my notes for the workshop', 'Book a room'], 'Sam\'s list is untouched by Kim\'s save'); assert.deepEqual((await as(KIM, 'GET', URL_)).data.items.map(x => x.title), ['Kim only']);
});
await t('an admin of the platform gets their own list too, not anyone else\'s', async () => {
  const r = await as(ADM, 'GET', URL_, undefined, 'admin'); assert.ok(r.status === 200 || r.status === 404, 'status ' + r.status); if (r.status === 200) assert.deepEqual(r.data.items, []);
});
await t('a customer is refused (403) and someone outside the project sees nothing (404)', async () => {
  assert.equal((await as(CUS, 'GET', URL_)).status, 403); assert.equal((await as(CUS, 'PUT', URL_, { items: [] })).status, 403); assert.equal((await as(EVE, 'GET', URL_)).status, 404); assert.equal((await as(EVE, 'PUT', URL_, { items: [] })).status, 404);
});
await t('nothing shared lists them: no other collection of the store holds a private title', async () => {
  for (const [coll, m] of store) { if (coll === 'ptk') continue; for (const [, v] of m) assert.ok(!/Prepare my notes for the workshop|Kim only/.test(v), 'collection ' + coll + ' holds a private title'); }
  const items = await as(SAM, 'GET', `/api/projects/${pid}/items?kinds=task,action`); assert.ok(!/Prepare my notes|Book a room|Kim only/.test(JSON.stringify(items.data)), 'the shared items do not show them');
});
await t('bad input is refused (400) and an over-long list is refused (413)', async () => {
  assert.equal((await as(SAM, 'PUT', URL_, { items: 'x' })).status, 400); assert.equal((await as(SAM, 'PUT', URL_, {})).status, 400);
  assert.equal((await as(SAM, 'PUT', URL_, { items: Array.from({ length: MAX_ITEMS + 1 }, (_, i) => item('p' + (100000 + i).toString(36), 'T')) })).status, 413);
});
console.log(n + ' private task checks passed');
