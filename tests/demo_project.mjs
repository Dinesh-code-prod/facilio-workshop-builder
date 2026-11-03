// The shared demo project: set up once by an admin, read-only for everyone else, example data in every section including the project plan, and sample AI drafts.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get(k) { if (k === 'platform_owner') return 'dinesh.r@facilio.com'; throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(n) { return { url: 'https://storage.example/put/' + n, file_id: 'f' + n }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put() { return { file_id: 'p1' }; }, async delete() { } } });
const call = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => call(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const admin = 'dinesh.r@facilio.com', sam = 'sam.k@facilio.com', lee = 'lee.m@facilio.com'; let demoId;

await t('before an admin has set it up, a normal person is told so in plain words', async () => { const r = await call(sam, 'GET', '/api/demo-project'); assert.equal(r.status, 404); assert.match(r.data.error, /has not been set up yet/); });
await t('the first admin to ask sets it up once; nothing stopped part way', async () => {
  const r = await call(admin, 'GET', '/api/demo-project'); assert.equal(r.status, 201); assert.equal(r.data.created, true); assert.equal(r.data.partial, undefined); demoId = r.data.id;
  assert.equal(JSON.parse(store.get('cfg').get('demo')).id, demoId, 'the demo id is remembered'); const again = await call(admin, 'GET', '/api/demo-project'); assert.equal(again.status, 200); assert.equal(again.data.id, demoId);
});
await t('every section has data, including the project plan', async () => {
  const ov = (await tool(admin, 'project_overview', { project: demoId })).data;
  assert.equal(ov.requirements.total, 6); assert.equal(ov.openQuestions, 3); assert.equal(ov.sessions.total, 5); assert.equal(ov.transcripts.statements, 6); assert.equal(ov.progress.tasks.total, 8); assert.ok(ov.progress.tasks.overdue >= 2); assert.equal(ov.progress.risksAndIssues.total, 4); assert.equal(ov.progress.uatTestCases.total, 8); assert.equal(ov.progress.hypercareIssues.total, 3);
  const kinds = (await tool(admin, 'list_record_kinds', { project: demoId })).data.kinds.map(k => k.kind); for (const k of ['action', 'decision', 'minutes', 'pnote', 'res', 'raid', 'cr', 'task', 'utc', 'usecase', 'signoff', 'hc', 'lesson', 'ho', 'checklist', 'rep', 'cal', 'ai']) assert.ok(kinds.includes(k), 'kind ' + k);
  const plan = (await call(admin, 'GET', `/api/projects/${demoId}/docs/plan_struct`)).data.data; assert.equal(plan.rows.length, 22); assert.equal(plan.rows.filter(r => r.isPhase).length, 6); assert.ok(plan.rows.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.start) && /^\d{4}-\d{2}-\d{2}$/.test(r.end)));
});
await t('four sample AI drafts show how AI delivers: unapproved, with sources, and honest that they are samples', async () => {
  const r = (await tool(admin, 'get_records', { project: demoId, kind: 'ai', detail: 'full' })).data; assert.equal(r.total, 4);
  for (const x of r.records) { assert.equal(x.data.status, 'draft'); assert.ok(x.data.sources.length >= 3); assert.match(x.data.notice, /sample draft/); assert.match(x.data.content, /\[S1\]/); }
  assert.deepEqual(r.records.map(x => x.data.task).sort(), ['brd', 'gaps', 'uat', 'wsr']);
});
await t('everyone else gets the same project, can read it, and cannot change it', async () => {
  const g = await call(sam, 'GET', '/api/demo-project'); assert.equal(g.status, 200); assert.equal(g.data.id, demoId); assert.equal((await call(lee, 'GET', '/api/demo-project')).data.id, demoId);
  const p = await call(sam, 'GET', `/api/projects/${demoId}`); assert.equal(p.status, 200); assert.equal(p.data.project.demo, true);
  const read = await call(sam, 'GET', `/api/projects/${demoId}/docs/plan_struct`); assert.equal(read.status, 200);
  const w = await call(sam, 'PUT', `/api/projects/${demoId}/items/task/t_sam`, { data: { title: 'Vandalism', status: 'To Do' } }); assert.equal(w.status, 403); assert.match(w.data.error, /read-only/);
  assert.equal((await call(sam, 'POST', '/api/demo-project', { reset: true })).status, 403);
  assert.equal((await call(sam, 'DELETE', `/api/projects/${demoId}`)).status, 403);
});
await t('the connector can read the demo for everyone but cannot write to it', async () => {
  const f = (await tool(sam, 'find_projects', {})).data.projects; assert.ok(f.some(x => x.id === demoId)); assert.equal((await tool(sam, 'project_overview', { project: demoId })).status, 200);
  const d = await tool(sam, 'save_draft', { project: demoId, task: 'gaps', content: 'x'.repeat(300) }); assert.equal(d.status, 403);
});
await t('only an admin can reset it, and the old copy is archived', async () => {
  const r = await call(admin, 'POST', '/api/demo-project', { reset: true }); assert.equal(r.status, 201); assert.notEqual(r.data.id, demoId); const old = demoId; demoId = r.data.id;
  assert.equal((await call(admin, 'GET', `/api/projects/${old}`)).status, 404); assert.equal((await call(sam, 'GET', '/api/demo-project')).data.id, demoId);
});
console.log(`${n} demo project checks passed`);
