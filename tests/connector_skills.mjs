// Connector add-ons: the Facilio implementation skills tool, the "where are we" block of project_overview, the org id, the connector-seen note, and the hand-off start guidance.
// Same stand-in platform as tests/qa_stress.mjs, one person.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), fileStore = new Map(); let seq = 0; const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: '## Draft [S1]' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(n) { const id = 'f' + (++seq) + n; fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put(o) { const id = 'p' + (++seq); fileStore.set(id, Buffer.from(o.body)); return { file_id: id }; }, async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
const me = 'sam.k@facilio.com';
const call = async (method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(me)); return { status: r.status, data: await r.json() }; };
const tool = (name, body) => call('POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

const pid = (await call('POST', '/api/projects', { name: 'Skills Test', customer: 'Acme Facilities' })).data.project.id;
await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: { project: { orgId: '400000077', region: 'US' }, requirements: [], flows: {} }, baseVersion: 0 });
const put = (kind, id, data) => call('PUT', `/api/projects/${pid}/items/${kind}/${id}`, { data });
await put('task', 't1', { title: 'Late one', status: 'To Do', due: '2020-01-01' }); await put('task', 't2', { title: 'Done one', status: 'Done', due: '2020-01-01' }); await put('task', 't3', { title: 'Open, no date', status: 'In Progress' });
await put('raid', 'r1', { title: 'Risk', status: 'Open' }); await put('raid', 'r2', { title: 'Old risk', status: 'Closed' }); await put('utc', 'u1', { title: 'Case 1', status: 'Passed' }); await put('utc', 'u2', { title: 'Case 2', status: 'Failed' });

await t('the connector has not been seen before the first tool call', async () => { const r = await call('GET', '/api/me/connector'); assert.equal(r.status, 200); assert.equal(r.data.seen, null); });
await t('project_overview says where the project stands', async () => {
  const r = await tool('project_overview', { project: pid }); assert.equal(r.status, 200); const g = r.data.progress;
  assert.equal(g.tasks.total, 3); assert.equal(g.tasks.open, 2); assert.equal(g.tasks.overdue, 1, 'only the open task with a past date is overdue');
  assert.equal(g.risksAndIssues.open, 1); assert.equal(g.uatTestCases.total, 2); assert.equal(g.uatTestCases.byStatus.Failed, 1);
  assert.equal(r.data.projectId, pid); assert.deepEqual([r.data.organisation.orgId, r.data.organisation.region], ['400000077', 'US']);
});
await t('using a tool leaves a note that the connector works', async () => { const r = await call('GET', '/api/me/connector'); assert.ok(r.data.seen && !Number.isNaN(Date.parse(r.data.seen))); });
await t('get_impl_skills lists the toolbox and tells Claude how to start one', async () => {
  const r = await tool('get_impl_skills', {}); assert.equal(r.status, 200); const names = r.data.skills.map(s => s.name);
  assert.ok(names.includes('FTR Generator') && names.includes('UAT Guide Generator') && names.includes('Configuration Builder')); assert.ok(!names.includes('Connected App Deep Review (L2)'), 'hidden skills stay off the list');
  assert.match(r.data.howToUse, /facilio-impl-toolbox/); assert.match(r.data.howToUse, /Claude setup > Facilio skills/);
  assert.ok(r.data.skills.every(s => s.name && s.does && s.runsIn && Array.isArray(s.needs)));
});
await t('get_impl_skills narrows by deliverable and by words', async () => {
  const u = (await tool('get_impl_skills', { task: 'uat' })).data.skills.map(s => s.name); assert.deepEqual(u, ['UAT Guide Generator', 'FTR Executor']);
  const q = (await tool('get_impl_skills', { query: 'dashboard' })).data.skills.map(s => s.name); assert.deepEqual(q, ['Dashboard Builder']);
  const all = (await tool('get_impl_skills', {})).data.skills.length; assert.equal((await tool('get_impl_skills', { task: 'nothing-like-this' })).data.skills.length, all, 'an unknown deliverable returns the whole menu');
});
await t('a hand-off from the UAT page tells Claude to confirm the project and offers the UAT recipes', async () => {
  const h = await call('POST', `/api/projects/${pid}/handoff`, { title: 'UAT plan and test cases', task: 'uat', view: 'delivery', page: 'Delivery', prompt: 'Do the UAT task now please', expect: { format: 'text' } }); assert.equal(h.status, 200);
  const g = await tool('get_handoff', { id: h.data.id }); assert.equal(g.status, 200);
  assert.match(g.data.start, /confirming with the person/); assert.match(g.data.start, /"Skills Test"/); assert.match(g.data.start, /Acme Facilities/); assert.match(g.data.start, /utc/); assert.match(g.data.start, /from the "Delivery" page/);
});
await t('get_task_pack names the skills that carry on from the deliverable', async () => { const r = await tool('get_task_pack', { project: pid, task: 'uat' }); assert.equal(r.status, 200); assert.match(r.data.note, /UAT Guide Generator/); });
console.log(`${n} connector add-on checks passed`);
