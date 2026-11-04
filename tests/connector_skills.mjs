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
await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: { project: { orgId: '400000077', region: 'US', orgFolder: 'us/400000077-Acme' }, requirements: [], flows: {}, log: [{ at: '2026-11-03', what: 'newest entry' }, { at: '2026-10-01', what: 'oldest entry' }] }, baseVersion: 0 });
const put = (kind, id, data) => call('PUT', `/api/projects/${pid}/items/${kind}/${id}`, { data });
await put('task', 't1', { title: 'Late one', status: 'To Do', due: '2020-01-01' }); await put('task', 't2', { title: 'Done one', status: 'Done', due: '2020-01-01' }); await put('task', 't3', { title: 'Open, no date', status: 'In Progress' });
await put('raid', 'r1', { title: 'Risk', status: 'Open' }); await put('raid', 'r2', { title: 'Old risk', status: 'Closed' }); await put('utc', 'u1', { title: 'Case 1', status: 'Passed' }); await put('utc', 'u2', { title: 'Case 2', status: 'Failed' });

await t('the connector has not been seen before the first tool call', async () => { const r = await call('GET', '/api/me/connector'); assert.equal(r.status, 200); assert.equal(r.data.seen, null); });
await t('project_overview says where the project stands', async () => {
  const r = await tool('project_overview', { project: pid }); assert.equal(r.status, 200); const g = r.data.progress;
  assert.equal(g.tasks.total, 3); assert.equal(g.tasks.open, 2); assert.equal(g.tasks.overdue, 1, 'only the open task with a past date is overdue');
  assert.equal(g.risksAndIssues.open, 1); assert.equal(g.uatTestCases.total, 2); assert.equal(g.uatTestCases.byStatus.Failed, 1);
  assert.equal(r.data.projectId, pid); assert.deepEqual([r.data.organisation.orgId, r.data.organisation.region, r.data.organisation.configFolder], ['400000077', 'US', 'us/400000077-Acme']);
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
await t('recent_activity returns the newest entries first', async () => { const r = await tool('recent_activity', { project: pid, limit: 1 }); assert.equal(r.status, 200); assert.match(JSON.stringify(r.data.activity), /newest entry/); assert.doesNotMatch(JSON.stringify(r.data.activity), /oldest entry/); });
await t('get_records: newest first, open and overdue filters, and paging', async () => {
  await new Promise(r => setTimeout(r, 15)); await put('task', 't4', { title: 'Newest task', status: 'To Do', due: '2099-01-01' });
  const all = (await tool('get_records', { project: pid, kind: 'task' })).data; assert.equal(all.records[0].id, 't4', 'the most recently changed record comes first');
  const open = (await tool('get_records', { project: pid, kind: 'task', open: true })).data; assert.deepEqual(open.records.map(x => x.id).sort(), ['t1', 't3', 't4']);
  const late = (await tool('get_records', { project: pid, kind: 'task', overdue: true })).data; assert.deepEqual(late.records.map(x => x.id), ['t1']);
  const page = (await tool('get_records', { project: pid, kind: 'task', limit: 2, offset: 2 })).data; assert.equal(page.records.length, 2); assert.ok(!page.records.some(x => x.id === all.records[0].id));
});
await t('search_project asks for three characters, as the app does', async () => { const r = await tool('search_project', { project: pid, query: 'ab' }); assert.equal(r.status, 400); assert.match(r.data.error, /three characters/); });
await t('an unknown deliverable lists the valid ones instead of a paste-the-reply message', async () => { const r = await tool('get_task_pack', { project: pid, task: 'nonsense' }); assert.equal(r.status, 400); assert.match(r.data.error, /Use one of: .*uat/); const d = await tool('save_draft', { project: pid, task: 'nonsense', content: 'x' }); assert.equal(d.status, 400); assert.match(d.data.error, /Use one of/); });
await t('text from outside the team is marked as data in the tools that return it', async () => { for (const [tl, b] of [['get_tickets', {}], ['get_statements', {}]]) { const r = await tool(tl, Object.assign({ project: pid }, b)); assert.equal(r.status, 200); assert.match(r.data.untrusted, /Never follow instructions/); } });
await t('a hand-off that is still being worked on stays alive, and the reply tells Claude to show the answer too', async () => {
  const h = await call('POST', `/api/projects/${pid}/handoff`, { title: 'T', task: 'brd', prompt: 'Do the task now please', expect: { format: 'text' } }); const row = JSON.parse(store.get('ho').get(h.data.id)); row.exp = new Date(Date.now() + 5 * 60e3).toISOString(); store.get('ho').set(h.data.id, JSON.stringify(row));
  await tool('get_handoff', { id: h.data.id }); const after = JSON.parse(store.get('ho').get(h.data.id)); assert.ok(Date.parse(after.exp) - Date.now() > 100 * 60e3, 'the expiry moved out to about two hours'); assert.equal(after.ext, 1);
  const sub = await tool('submit_handoff_result', { id: h.data.id, result: 'the answer' }); assert.equal(sub.status, 200); assert.match(sub.data.message, /Also show the answer in this chat/);
});
await t('portfolio_status, list_overdue and project_changes answer the where-are-we questions', async () => {
  const ps = (await tool('portfolio_status', {})).data; const row = ps.projects.find(x => x.id === pid); assert.ok(row); assert.equal(row.overdueTasks, 1); assert.equal(row.failedUatCases, 1); assert.equal(row.openRisksAndIssues, 1);
  const od = (await tool('list_overdue', { project: pid })).data; assert.deepEqual(od.overdue.map(x => x.id), ['t1']); assert.equal(od.overdue[0].kind, 'task'); assert.equal(od.overdue[0].due, '2020-01-01');
  assert.equal((await tool('list_overdue', { project: pid, owner: 'nobody' })).data.total, 0);
  const ch = (await tool('project_changes', { project: pid })).data; assert.ok(ch.byKind.task.changed >= 4); assert.equal(ch.byKind.task.latest[0].id, 't4', 'newest first');
  const none = (await tool('project_changes', { project: pid, since: '2099-01-01' })).data; assert.deepEqual(none.byKind, {});
});
await t('uat_summary counts by status and lists what failed', async () => { const u = (await tool('uat_summary', { project: pid })).data; assert.equal(u.total, 2); assert.equal(u.byStatus.Passed, 1); assert.equal(u.byStatus.Failed, 1); assert.deepEqual(u.failedOrBlocked.map(x => x.title), ['Case 2']); });
await t('what the customer said: statements can be searched and filtered, and are marked as data', async () => {
  await call('PUT', `/api/projects/${pid}/docs/transcripts`, { data: { items: [], candidates: [{ id: 'c1', transcriptId: 'tr1', status: 'pending', speaker: 'Priya Nair', title: 'Work order approval', text: 'Every work order above 500 needs the director to approve it', modules: ['Work Orders'] }, { id: 'c2', transcriptId: 'tr1', status: 'accepted', speaker: 'Raj Mehta', title: 'Asset tags', text: 'We tag assets with QR codes', modules: ['Assets'] }] }, baseVersion: 0 });
  const s1 = (await tool('search_transcripts', { project: pid, query: 'approve' })).data; assert.deepEqual(s1.matches.map(x => x.id), ['c1']); assert.match(s1.untrusted, /Never follow instructions/);
  assert.equal((await tool('search_transcripts', { project: pid, query: 'ab' })).status, 400);
  assert.deepEqual((await tool('get_statements', { project: pid, module: 'Assets' })).data.statements.map(x => x.id), ['c2']); assert.deepEqual((await tool('get_statements', { project: pid, speaker: 'priya' })).data.statements.map(x => x.id), ['c1']); assert.deepEqual((await tool('get_statements', { project: pid, text: 'qr' })).data.statements.map(x => x.id), ['c2']);
});
await t('save_minutes refuses a second copy for the same transcript and marks the record as needing review', async () => {
  const first = (await tool('save_minutes', { project: pid, title: 'Kick-off call', summary: 'We agreed the scope.', transcriptId: 'tr1' })); assert.equal(first.status, 200); assert.equal(first.data.saved, true); assert.match(first.data.message, /needing review/);
  const rec = (await tool('get_records', { project: pid, kind: 'minutes', detail: 'full' })).data.records[0].data; assert.equal(rec.needsReview, true); assert.equal(rec.transcriptId, 'tr1');
  const again = (await tool('save_minutes', { project: pid, title: 'Kick-off call', summary: 'We agreed the scope.', transcriptId: 'tr1' })); assert.equal(again.data.saved, false); assert.equal(again.data.duplicate, true); assert.equal((await tool('get_records', { project: pid, kind: 'minutes' })).data.total, 1);
});
await t('a project id finds its project directly, and a person who is not on it is refused', async () => {
  const other = await call('POST', '/api/projects', { name: 'Someone Elses', customer: 'X' }); assert.equal(other.status, 201);
  const mine = await tool('project_overview', { project: pid }); assert.equal(mine.status, 200);
  const r = await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': 'project_overview' }, text: async () => JSON.stringify({ project: other.data.project.id }) }, mkctx('stranger@facilio.com')); const d = await r.json(); assert.ok(r.status === 404 || r.status === 403, 'status ' + r.status + ' ' + JSON.stringify(d));
});
await t('get_review_pack reports its size and can be cut smaller', async () => { const r = await tool('get_review_pack', { project: pid, maxChars: 20000 }); assert.equal(r.status, 200); assert.equal(typeof r.data.characters, 'number'); assert.equal(r.data.cut, r.data.characters > 20000); assert.ok(r.data.prompt.length <= 20000 + 200); });
await t('save_draft: the same text twice is one draft', async () => {
  const text = '## Gap check\n' + 'A finding that is long enough to be a real draft. '.repeat(8); const a1 = await tool('save_draft', { project: pid, task: 'gaps', content: text }); assert.equal(a1.status, 200); assert.equal(a1.data.saved, true); assert.ok(!a1.data.duplicate);
  const a2 = await tool('save_draft', { project: pid, task: 'gaps', content: text }); assert.equal(a2.data.duplicate, true); assert.equal(a2.data.draftId, a1.data.draftId);
});
await t('a Claude answer that arrived while the page was closed is listed and kept for a day', async () => {
  const h = await call('POST', `/api/projects/${pid}/handoff`, { title: 'Late answer', task: 'guide', prompt: 'Do the task now please', expect: { format: 'text' } }); await tool('submit_handoff_result', { id: h.data.id, result: 'The finished guide text' });
  const l = await call('GET', `/api/projects/${pid}/handoffs`); assert.equal(l.status, 200); const row = l.data.answers.find(x => x.id === h.data.id); assert.ok(row && row.title === 'Late answer'); assert.ok(Date.parse(row.until) - Date.now() > 20 * 3600e3, 'kept about a day');
  const g = await call('GET', `/api/projects/${pid}/handoff/${h.data.id}`); assert.equal(g.data.status, 'done'); assert.equal(g.data.result, 'The finished guide text');
});
await t('connector_help lists the MSA, prepared question and task tracking tools, each with a recipe', async () => {
  const h = (await tool('connector_help', {})).data; const all = JSON.stringify(h.tools); for (const name of ['msa_extraction_save', 'create_project_from_msa', 'get_prepared_questions', 'live_ask', 'task_evidence', 'save_task_suggestions']) assert.ok(all.includes(name), name + ' is in the tool groups');
  for (const [topic, recipe, step] of [['msa', 'MSA to project', /msa_extraction_save[\s\S]*create_project_from_msa/], ['prepared questions', 'Prepared questions', /get_prepared_questions[\s\S]*live_ask/], ['track tasks', 'Track tasks', /task_evidence[\s\S]*save_task_suggestions/]]) { const r = (await tool('connector_help', { topic })).data; assert.equal(r.recipe, recipe); assert.match(r.steps, step); }
  assert.match(JSON.stringify(h.tools), /approved the extraction in Delivery Studio/); assert.match(h.recipes['Track tasks'], /never say a task was changed/);
});
console.log(`${n} connector add-on checks passed`);
