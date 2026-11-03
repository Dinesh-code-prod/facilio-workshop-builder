// The demo project: one per person, example data in every section, created through the app's own routes, and a reset that archives the old copy.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(n) { return { url: 'https://storage.example/put/' + n, file_id: 'f' + n }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put() { return { file_id: 'p1' }; }, async delete() { } } });
const call = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => call(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const sam = 'sam.k@facilio.com', lee = 'lee.m@facilio.com'; let demoId, firstId;

await t('a person gets a demo project with example data, labelled as demo', async () => {
  const r = await call(sam, 'POST', '/api/demo-project', {}); assert.equal(r.status, 201); assert.equal(r.data.created, true); demoId = firstId = r.data.id;
  const p = await call(sam, 'GET', `/api/projects/${demoId}`); assert.equal(p.status, 200); assert.equal(p.data.project.demo, true); assert.match(p.data.project.name, /^Demo: /);
  const audit = [...(store.get('au.' + demoId) || new Map()).values()].join(' '); assert.doesNotMatch(audit, /demo-seed-partial/, 'seeding did not stop part way');
});
await t('every section has data: requirements, questions, sessions, statements, tasks, risks, actions, decisions, change requests, use cases, UAT, minutes, notes, links', async () => {
  const ov = (await tool(sam, 'project_overview', { project: demoId })).data;
  assert.equal(ov.requirements.total, 6); assert.equal(ov.requirements.byStatus.Confirmed, 3); assert.equal(ov.openQuestions, 3); assert.equal(ov.sessions.total, 5); assert.equal(ov.transcripts.uploaded, 2); assert.equal(ov.transcripts.statements, 6); assert.equal(ov.transcripts.toReview, 3);
  assert.equal(ov.useCases.total, 2); assert.equal(ov.progress.tasks.total, 8); assert.ok(ov.progress.tasks.overdue >= 2, 'some tasks are late on purpose'); assert.equal(ov.progress.risksAndIssues.total, 4); assert.equal(ov.progress.risksAndIssues.open, 3); assert.equal(ov.progress.changeRequests.total, 2);
  assert.equal(ov.progress.uatTestCases.total, 8); assert.equal(ov.progress.uatTestCases.byStatus.Failed, 1); assert.ok(ov.progress.stagesRecordedByTeam.some(x => x.stage === 'kickoff'));
  const kinds = (await tool(sam, 'list_record_kinds', { project: demoId })).data.kinds.map(k => k.kind); for (const k of ['action', 'decision', 'minutes', 'pnote', 'res', 'raid', 'cr', 'task', 'utc', 'usecase', 'signoff', 'hc', 'lesson', 'ho', 'checklist', 'rep', 'cal']) assert.ok(kinds.includes(k), 'kind ' + k);
  assert.equal(ov.progress.hypercareIssues.total, 3); assert.equal(ov.progress.hypercareIssues.open, 2);
});
await t('the demo reads like a real project to the connector: overdue items, UAT summary, what the customer said', async () => {
  const od = (await tool(sam, 'list_overdue', { project: demoId })).data; assert.ok(od.total >= 3); const u = (await tool(sam, 'uat_summary', { project: demoId })).data; assert.equal(u.failedOrBlocked.length, 2);
  const sr = (await tool(sam, 'search_transcripts', { project: demoId, query: 'approve' })).data; assert.ok(sr.total >= 1);
});
await t('asking again returns the same demo project instead of making another', async () => { const r = await call(sam, 'POST', '/api/demo-project', {}); assert.equal(r.status, 200); assert.equal(r.data.created, false); assert.equal(r.data.id, demoId); });
await t('reset archives the old copy and makes a clean one', async () => {
  const r = await call(sam, 'POST', '/api/demo-project', { reset: true }); assert.equal(r.status, 201); assert.notEqual(r.data.id, firstId); demoId = r.data.id;
  const old = await call(sam, 'GET', '/api/projects'); assert.ok(!old.data.projects.some(p => p.id === firstId), 'the old copy is gone from the list'); assert.ok(old.data.projects.some(p => p.id === demoId));
});
await t('each person has their own demo, and nobody sees another person\'s', async () => {
  const r = await call(lee, 'POST', '/api/demo-project', {}); assert.equal(r.status, 201); assert.notEqual(r.data.id, demoId);
  const seen = await call(lee, 'GET', '/api/projects'); assert.ok(!seen.data.projects.some(p => p.id === demoId), 'lee does not see the demo of sam');
});
console.log(`${n} demo project checks passed`);
