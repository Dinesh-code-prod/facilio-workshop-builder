// Task tracking by Claude (roadmap E12 slice 2): the pure rules of work/server/_tasksuggest.mjs, then the connector tools task_evidence and save_task_suggestions and the routes
// under /api/projects/:id/task-suggestions, on the stand-in platform of tests/transfer_routes.mjs. The point of the rules: a suggestion is never applied by Claude; a person accepts it and the
// change goes through the normal task save (so its checks, history and assignment message all apply). NOT checked: a real Claude session, the Tasks page in a browser, a real Teams message.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../work/server/api.mjs';
import { cleanSuggestion, suggestionId, changesFor, taskData, LIMITS } from '../work/server/_tasksuggest.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const SRC = { type: 'transcript', ref: 'tr-12 line 40', quote: 'Yes, that one is finished' };

// ---------- pure rules ----------
await t('cleanSuggestion needs a valid action, a task for update and close, a reason and a source, and keeps only known fields', () => {
  const good = cleanSuggestion({ action: 'UPDATE', taskId: 't_1', fields: { status: 'Blocked', blocker: 'Waiting for data', evil: 'x', owner: 5, eta: { a: 1 } }, reason: 'Said in the call', source: SRC, extra: 1 }); assert.equal(good.ok, true);
  assert.deepEqual(Object.keys(good.s), ['action', 'taskId', 'fields', 'reason', 'source']); assert.deepEqual(good.s.fields, { status: 'Blocked', blocker: 'Waiting for data', owner: '5' }); assert.deepEqual(good.s.source, SRC); assert.match(good.id, /^sg_[0-9a-f]{24}$/);
  const bad = [undefined, null, 5, 'x', [], {}, { action: 'delete', taskId: 't', reason: 'r', source: SRC }, { action: 'update', reason: 'r', source: SRC, fields: { status: 'Done' } }, { action: 'update', taskId: 't bad', reason: 'r', source: SRC, fields: { status: 'Done' } }, { action: 'update', taskId: 't_1', source: SRC, fields: { status: 'Done' } },
    { action: 'update', taskId: 't_1', reason: 'r', fields: { status: 'Done' } }, { action: 'update', taskId: 't_1', reason: 'r', source: { type: 'transcript' }, fields: { status: 'Done' } }, { action: 'update', taskId: 't_1', reason: 'r', source: SRC, fields: {} }, { action: 'update', taskId: 't_1', reason: 'r', source: SRC, fields: { nothing: 'known' } },
    { action: 'create', reason: 'r', source: SRC, fields: { status: 'To Do' } }, { action: 'create', taskId: 't_1', reason: 'r', source: SRC, fields: { title: 'x' } }, { action: 'close', taskId: 't_1', reason: 'r', source: SRC, fields: { status: 'Blocked' } }];
  for (const b of bad) assert.equal(cleanSuggestion(b).ok, false, JSON.stringify(b)); const c = cleanSuggestion({ action: 'close', taskId: 't_1', reason: 'Finished', source: SRC, fields: { priority: 'High', completion: 'Done in the call' } }).s; assert.deepEqual(c.fields, { completion: 'Done in the call', status: 'Done' }, 'a close sets Done and drops other fields');
  const long = cleanSuggestion({ action: 'create', reason: 'r'.repeat(5000), source: { type: 't'.repeat(100), ref: 'r'.repeat(900), quote: 'q'.repeat(900) }, fields: { title: 'T'.repeat(900), desc: 'd'.repeat(9000) } }).s; assert.equal(long.reason.length, LIMITS.reason); assert.equal(long.fields.title.length, 300); assert.equal(long.fields.desc.length, 2000); assert.equal(long.source.quote.length, LIMITS.quote);
  assert.doesNotThrow(() => cleanSuggestion(JSON.parse('{"__proto__":{"x":1},"action":"create","fields":{"title":"p"},"reason":"r","source":{"type":"a","ref":"b"}}')));
});
await t('the id comes from action, task and fields only, so the same proposal with another reason or source is the same proposal', () => {
  const a = cleanSuggestion({ action: 'update', taskId: 't_1', fields: { status: 'Done', blocker: '' }, reason: 'one', source: SRC }), b = cleanSuggestion({ action: 'update', taskId: 't_1', fields: { blocker: '', status: 'Done' }, reason: 'two', source: { type: 'minutes', ref: 'm1' } });
  assert.equal(a.id, b.id); assert.notEqual(a.id, cleanSuggestion({ action: 'update', taskId: 't_2', fields: { status: 'Done', blocker: '' }, reason: 'one', source: SRC }).id); assert.notEqual(a.id, cleanSuggestion({ action: 'update', taskId: 't_1', fields: { status: 'Blocked', blocker: '' }, reason: 'one', source: SRC }).id);
  assert.equal(suggestionId({ action: 'create', taskId: '', fields: { title: 'x' } }), suggestionId({ action: 'create', fields: { title: 'x' } }));
});
await t('changesFor shows only what differs, and taskData builds the task a person would be saving', () => {
  const s = cleanSuggestion({ action: 'update', taskId: 't_1', fields: { status: 'Done', owner: 'kim.r@facilio.com', priority: 'High' }, reason: 'r', source: SRC }).s; const cur = { title: 'Old', status: 'In Progress', owner: 'kim.r@facilio.com', priority: 'High', n: 4, hist: [1] };
  assert.deepEqual(changesFor(s, cur), [{ field: 'status', from: 'In Progress', to: 'Done' }]); assert.deepEqual(taskData(s, cur), { title: 'Old', status: 'Done', owner: 'kim.r@facilio.com', priority: 'High', n: 4, hist: [1] });
  const c = cleanSuggestion({ action: 'create', fields: { title: 'New one' }, reason: 'r', source: SRC }).s; const d = taskData(c, null); assert.deepEqual([d.title, d.type, d.status, d.src.type, d.src.ref], ['New one', 'Other', 'To Do', 'ai', 'tr-12 line 40']); assert.match(d.src.label, /Claude suggestion \(transcript\)/);
});

// ---------- tools and routes on a stand-in platform ----------
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/; let sent = [];
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get(name) { if (name === 'teams_notify') return 'on'; throw new Error('no secret'); } }, teams: { async send(o) { sent.push(o); return { delivered: 1, muted: 0, failed: 0 }; } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (s.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com', OUT = 'out.s@facilio.com';
const day = k => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);
const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Tracked', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const putTask = async (id, d) => { const r = await as(SAM, 'PUT', `/api/projects/${pid}/items/task/${id}`, { data: d }); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data.item; };
await putTask('t1', { title: 'Collect asset list', status: 'In Progress', owner: KIM, due: '2020-01-01' }); await putTask('t2', { title: 'Write BRD section', status: 'To Do', owner: SAM, due: day(10) }); await putTask('t3', { title: 'Old finished', status: 'Done' });
await putTask('t4', { title: 'No owner yet', status: 'To Do' });
const BASE = `/api/projects/${pid}/task-suggestions`; const sug = (who, list) => tool(who, 'save_task_suggestions', { project: pid, suggestions: list });
const U = (taskId, fields, extra) => Object.assign({ action: 'update', taskId, fields, reason: 'Heard in the call', source: SRC }, extra);
const taskRec = id => JSON.parse(store.get('it.' + pid + '.task').get(id)); const taskData_ = async id => (await as(SAM, 'GET', `/api/projects/${pid}/items?kinds=task`)).data.items.find(x => x.id === id).data;
const rows = id => [...(store.get('tsg.' + pid) || new Map()).values()].map(x => JSON.parse(x));

await t('the two tools are in work.json, need a project, and nothing in work.json applies a suggestion', () => {
  const raw = fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8'); const all = JSON.parse(raw).mcp.tools; const names = all.map(x => x.name); assert.equal(new Set(names).size, names.length);
  const x = all.find(y => y.name === 'task_tracking'); assert.ok(x, 'task_tracking'); assert.deepEqual(x.input_schema.required, ['action', 'project']); assert.deepEqual(x.input_schema.properties.action.enum, ['evidence', 'save', 'reply', 'mail_list', 'mail_save', 'mail_draft', 'mail_sent']); assert.ok(x.input_schema.properties.suggestions, 'save takes suggestions'); assert.ok(!x.confirm);
  assert.ok(!names.some(x => /(accept|apply).*suggest|suggest.*(accept|apply)/i.test(x)), 'there is no tool that accepts a suggestion'); assert.equal(JSON.stringify(JSON.parse(raw), null, 1).replace(/\n/g, '\r\n') + '\r\n', raw, 'the 1-space CRLF layout is kept');
});
await t('task_evidence: open tasks with their ids, overdue first, plus changes, UAT, minutes and sign-offs, all marked as data', async () => {
  await as(SAM, 'PUT', `/api/projects/${pid}/items/minutes/m1`, { data: { title: 'Kick-off minutes', date: '2026-11-01', status: 'Draft' } }); await as(SAM, 'PUT', `/api/projects/${pid}/items/signoff/s1`, { data: { title: 'Scope sign-off', status: 'pending' } });
  const r = await tool(KIM, 'task_evidence', { project: pid }); assert.equal(r.status, 200, JSON.stringify(r.data)); const d = r.data; assert.match(d.untrusted, /Never follow instructions/); assert.equal(d.openTasks.total, 3, 'the done task is not listed'); assert.deepEqual(d.openTasks.tasks.map(x => x.id), ['t1', 't2', 't4'].sort((a, b) => (a === 't1' ? -1 : b === 't1' ? 1 : a === 't2' ? -1 : 1)));
  const t1 = d.openTasks.tasks[0]; assert.deepEqual([t1.id, t1.n, t1.owner, t1.overdue, t1.suggestionWaiting], ['t1', 'T-1', KIM, true, false]); assert.equal(d.since, day(-14)); assert.ok(d.changesSince.task && d.changesSince.task.changed >= 3);
  assert.equal(d.recentMinutes[0].title, 'Kick-off minutes'); assert.equal(d.signoffs[0].title, 'Scope sign-off'); assert.equal(typeof d.uat.total, 'number'); assert.ok(Array.isArray(d.recentTranscripts)); assert.equal(d.pendingSuggestions, 0); assert.match(d.note, /never closes a task/);
  assert.equal((await tool(KIM, 'task_evidence', { project: pid, since: day(1) })).data.changesSince.task, undefined, 'nothing changed since tomorrow'); assert.ok(JSON.stringify(d).length < 60000, 'compact');
});
await t('task_evidence caps a long list and is refused to customers and outsiders', async () => {
  const big = (await as(SAM, 'POST', '/api/projects', { name: 'Big', customer: 'Acme' })).data.project.id; for (let i = 0; i < 130; i++) await as(SAM, 'PUT', `/api/projects/${big}/items/task/b${i}`, { data: { title: 'Task ' + i, status: 'To Do', due: day(i % 9) } });
  const r = await tool(SAM, 'task_evidence', { project: big }); assert.equal(r.data.openTasks.total, 130); assert.equal(r.data.openTasks.shown, 120); assert.equal(r.data.openTasks.tasks.length, 120);
  for (const who of [CUS, OUT]) { const x = await tool(who, 'task_evidence', { project: pid }); assert.ok(x.status === 403 || x.status === 404, who + ' ' + x.status); assert.ok(!JSON.stringify(x.data).includes('Collect asset'), 'nothing leaked'); }
  assert.equal((await tool(VIC, 'task_evidence', { project: pid })).status, 403, 'a viewer cannot propose, so cannot read the evidence for it');
});
await t('save_task_suggestions stores UNAPPROVED suggestions in their own collection and leaves the tasks alone', async () => {
  const before = JSON.stringify([...store.get('it.' + pid + '.task').entries()]);
  const r = await sug(KIM, [U('t1', { status: 'Blocked', blocker: 'Waiting for the asset export' }), U('t2', { owner: VIC, due: day(20) }, { reason: 'Moved to Vic' }), { action: 'close', taskId: 't1', fields: { completion: 'List received' }, reason: 'Customer said it was sent', source: SRC }, { action: 'create', fields: { title: 'Send BRD draft', owner: SAM, due: day(7), type: 'BRD Task' }, reason: 'Agreed as a follow-up', source: { type: 'minutes', ref: 'm1' } }]);
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.stored, 4); assert.deepEqual(r.data.results.map(x => x.status), ['stored', 'stored', 'stored', 'stored']); assert.match(r.data.note, /nothing was changed in the task register/);
  assert.equal(JSON.stringify([...store.get('it.' + pid + '.task').entries()]), before, 'no task changed'); const all = rows(); assert.equal(all.length, 4); assert.ok(all.every(x => x.status === 'pending' && x.by === KIM && x.at && !x.decidedBy));
  assert.ok(!(await as(SAM, 'GET', `/api/projects/${pid}/items?kinds=tsg`)).data.items, 'not an item kind'); assert.equal((await as(SAM, 'GET', `/api/projects/${pid}/items?kinds=tsg`)).status, 400);
  assert.equal((await tool(KIM, 'task_evidence', { project: pid })).data.pendingSuggestions, 4); assert.equal((await tool(KIM, 'task_evidence', { project: pid })).data.openTasks.tasks.find(x => x.id === 't1').suggestionWaiting, true);
});
await t('the same proposal twice is stored once, whatever its reason or source; bad ones are rejected one by one', async () => {
  const r = await sug(SAM, [U('t1', { status: 'Blocked', blocker: 'Waiting for the asset export' }, { reason: 'A different reason', source: { type: 'uat', ref: 'u1' } }), U('nope', { status: 'Done' }), U('t1', { status: 'To Do' }, { reason: '' }), U('t1', { status: 'In Progress' }), U('t3', {}, { action: 'close', fields: {} }), { action: 'create', fields: { title: 'Send BRD draft', owner: SAM, due: day(7), type: 'BRD Task' }, reason: 'again', source: SRC }, 'junk', null]);
  assert.equal(r.status, 200); assert.deepEqual(r.data.results.map(x => x.status), ['duplicate', 'rejected', 'rejected', 'rejected', 'rejected', 'duplicate', 'rejected', 'rejected']); assert.match(r.data.results[1].error, /no task nope/); assert.match(r.data.results[3].error, /nothing would change/); assert.match(r.data.results[4].error, /already Done/); assert.equal(r.data.stored, 0); assert.equal(rows().length, 4);
  assert.equal(r.data.results[0].state, 'pending'); for (const bad of [undefined, [], 'x', {}]) assert.equal((await sug(KIM, bad)).status, 400); assert.equal((await sug(KIM, Array.from({ length: 21 }, (_, i) => ({ action: 'create', fields: { title: 'x' + i }, reason: 'r', source: SRC })))).status, 400, 'at most 20 per call'); assert.equal(rows().length, 4);
});
await t('only team members with edit access can propose or see suggestions; customers can never list them', async () => {
  for (const who of [CUS, OUT, VIC]) { const x = await sug(who, [U('t2', { status: 'Done' })]); assert.ok([403, 404].includes(x.status), who + ' ' + x.status); } assert.equal(rows().length, 4);
  for (const who of [CUS, OUT, VIC]) for (const [m, p] of [['GET', BASE], ['POST', BASE + '/sg_' + 'a'.repeat(24) + '/accept'], ['POST', BASE + '/sg_' + 'a'.repeat(24) + '/dismiss']]) { const x = await as(who, m, p, {}); assert.ok([403, 404].includes(x.status), who + ' ' + m + ' ' + x.status); assert.ok(!JSON.stringify(x.data).includes('asset export')); }
  const l = await as(KIM, 'GET', BASE); assert.equal(l.status, 200); assert.equal(l.data.pending, 4); assert.equal(l.data.suggestions.length, 4); const u = l.data.suggestions.find(x => x.fields.blocker); assert.deepEqual(u.changes.map(x => x.field).sort(), ['blocker', 'status']); assert.deepEqual(u.task, { n: 1, title: 'Collect asset list', status: 'In Progress' }); assert.equal(u.source.quote, SRC.quote); assert.equal(u.reason, 'Heard in the call');
  assert.ok(!(await as(CUS, 'GET', `/api/projects/${pid}/items?kinds=task,tsg`)).data.items?.some?.(x => x.kind === 'tsg'));
});
let blockedId, ownerId, closeId, createId;
await t('Accept applies an update through the NORMAL task save: validation, history, audit and the assignment message all happen, as the person who accepted', async () => {
  const l = (await as(KIM, 'GET', BASE)).data.suggestions; blockedId = l.find(x => x.fields.blocker).id; ownerId = l.find(x => x.fields.owner === VIC).id; closeId = l.find(x => x.action === 'close').id; createId = l.find(x => x.action === 'create').id;
  const r = await as(SAM, 'POST', `${BASE}/${blockedId}/accept`, {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.applied, 'update'); assert.equal(r.data.suggestion.status, 'accepted');
  const td = await taskData_('t1'); assert.deepEqual([td.status, td.blocker, td.title, td.owner, td.n], ['Blocked', 'Waiting for the asset export', 'Collect asset list', KIM, 1]); assert.match(td.hist.at(-1).event, /Updated status, blocker/); assert.equal(td.hist.at(-1).who, 'Sam K', 'the person who pressed Accept');
  const rec = rows().find(x => x.id === blockedId); assert.deepEqual([rec.status, rec.decidedBy, rec.appliedTaskId], ['accepted', SAM, 't1']); const au = (await as(SAM, 'GET', `/api/projects/${pid}/audit`)).data.entries.map(e => e.action); assert.ok(au.includes('task-suggestion-accepted')); assert.ok(au.includes('task-suggested')); assert.ok(au.includes('task-updated'));
  sent = []; const o = await as(SAM, 'POST', `${BASE}/${ownerId}/accept`, {}); assert.equal(o.status, 200); assert.deepEqual(sent.map(x => x.to), [[VIC]]); assert.match(sent[0].title, /Task assigned to you/, 'the assignment message went out through the normal save'); assert.equal((await taskData_('t2')).owner, VIC);
  assert.equal((await as(SAM, 'POST', `${BASE}/${blockedId}/accept`, {})).status, 409, 'a second Accept does nothing'); assert.equal((await as(KIM, 'GET', BASE)).data.pending, 2);
});
await t('Accept of a close sets the task Done only when a person accepts; a new task is made through the same path with its source', async () => {
  assert.notEqual((await taskData_('t1')).status, 'Done'); const c = await as(KIM, 'POST', `${BASE}/${closeId}/accept`, {}); assert.equal(c.status, 200, JSON.stringify(c.data)); const td = await taskData_('t1'); assert.deepEqual([td.status, td.completion, td.completedBy], ['Done', 'List received', 'Kim R']);
  const k = await as(KIM, 'POST', `${BASE}/${createId}/accept`, {}); assert.equal(k.status, 200, JSON.stringify(k.data)); const nid = k.data.suggestion.appliedTaskId; assert.match(nid, /^t_/); const nt = await taskData_(nid); assert.deepEqual([nt.title, nt.type, nt.owner, nt.n, nt.src.type, nt.src.ref, nt.createdBy], ['Send BRD draft', 'BRD Task', SAM, 5, 'ai', 'm1', 'Kim R']); assert.equal(nt.src.label, 'Claude suggestion (minutes)');
  assert.equal(rows().filter(x => x.status === 'pending').length, 0);
});
await t('Accept goes through taskSanitize: a bad owner, a bad status or a bad date is refused, the suggestion stays pending and the task is unchanged', async () => {
  const r = await sug(KIM, [U('t4', { owner: 'stranger@facilio.com' }), U('t4', { status: 'Finished-ish' }, { reason: 'bad status' }), U('t4', { due: '31/12/2026' }, { reason: 'bad date' }), U('t2', { owner: CUS }, { reason: 'a customer as owner' })]); assert.equal(r.data.stored, 4);
  const before = JSON.stringify(taskRec('t4')); const l = (await as(KIM, 'GET', BASE)).data.suggestions; for (const s of l) { const x = await as(SAM, 'POST', `${BASE}/${s.id}/accept`, {}); assert.equal(x.status, 400, JSON.stringify(s.fields) + ' ' + JSON.stringify(x.data)); assert.ok(x.data.error); }
  assert.match((await as(SAM, 'POST', `${BASE}/${l.find(s => s.fields.owner === 'stranger@facilio.com').id}/accept`, {})).data.error, /owner must be a member/); assert.equal(JSON.stringify(taskRec('t4')), before, 'the task did not change'); assert.equal(rows().filter(x => x.status === 'pending').length, 4); assert.equal((await taskData_('t2')).owner, VIC);
  const miss = await sug(KIM, [U('t4', { desc: 'About to vanish' })]); const sid = miss.data.results[0].id; await as(SAM, 'DELETE', `/api/projects/${pid}/items/task/t4`); const gone = await as(SAM, 'POST', `${BASE}/${sid}/accept`, {}); assert.equal(gone.status, 409); assert.match(gone.data.error, /no longer exists/);
  assert.equal((await as(KIM, 'GET', BASE)).data.suggestions.find(x => x.id === sid).missing, true);
});
await t('a task edited after the suggestion was made keeps that edit: Accept changes only the suggested fields, on top of the task as it is now', async () => {
  await putTask('t5', { title: 'Shared task', status: 'To Do', owner: SAM }); const s = await sug(KIM, [U('t5', { status: 'In Progress' })]); const sid = s.data.results[0].id; await putTask('t5', { title: 'Shared task, renamed by someone', status: 'To Do', owner: SAM });
  const l = (await as(KIM, 'GET', BASE)).data.suggestions.find(x => x.id === sid); assert.equal(l.task.title, 'Shared task, renamed by someone', 'the page shows the task as it is now'); assert.deepEqual(l.changes, [{ field: 'status', from: 'To Do', to: 'In Progress' }]);
  const x = await as(SAM, 'POST', `${BASE}/${sid}/accept`, {}); assert.equal(x.status, 200); const td = await taskData_('t5'); assert.deepEqual([td.title, td.status], ['Shared task, renamed by someone', 'In Progress']);
});
await t('a dismissed suggestion stays dismissed: it cannot be accepted, and proposing it again does not bring it back', async () => {
  const s = await sug(KIM, [U('t2', { priority: 'Critical' })]); const sid = s.data.results[0].id; const d = await as(SAM, 'POST', `${BASE}/${sid}/dismiss`, { note: 'Not true, Vic is still on it' }); assert.equal(d.status, 200); assert.equal(d.data.suggestion.status, 'dismissed'); assert.equal(d.data.suggestion.note, 'Not true, Vic is still on it');
  assert.equal((await as(SAM, 'POST', `${BASE}/${sid}/accept`, {})).status, 409); assert.equal((await as(SAM, 'POST', `${BASE}/${sid}/dismiss`, {})).status, 409); assert.equal((await taskData_('t2')).priority || '', '');
  const again = await sug(KIM, [U('t2', { priority: 'Critical' }, { reason: 'Said again in another call', source: { type: 'transcript', ref: 'tr-13' } })]); assert.deepEqual([again.data.results[0].status, again.data.results[0].state, again.data.stored], ['duplicate', 'dismissed', 0]);
  assert.ok(!(await as(KIM, 'GET', BASE)).data.suggestions.some(x => x.id === sid), 'not in the pending list'); const dis = (await as(KIM, 'GET', BASE + '?status=dismissed')).data.suggestions; assert.ok(dis.some(x => x.id === sid && x.decidedBy === SAM)); assert.ok((await as(KIM, 'GET', BASE + '?status=all')).data.suggestions.length >= 5);
  assert.equal((await tool(KIM, 'task_evidence', { project: pid })).data.pendingSuggestions, rows().filter(x => x.status === 'pending').length, 'a dismissed one is not waiting');
});
await t('a project holds at most 100 waiting suggestions; accepted and dismissed ones do not count; unknown ids are 404', async () => {
  const p2 = (await as(SAM, 'POST', '/api/projects', { name: 'Cap', customer: 'Acme' })).data.project.id; let stored = 0, refused = 0;
  for (let c = 0; c < 6; c++) { const r = await tool(SAM, 'save_task_suggestions', { project: p2, suggestions: Array.from({ length: 20 }, (_, i) => ({ action: 'create', fields: { title: 'Cap ' + c + '-' + i }, reason: 'r', source: SRC })) }); stored += r.data.stored; refused += r.data.results.filter(x => x.status === 'rejected').length; }
  assert.equal(stored, 100); assert.equal(refused, 20); const first = (await as(SAM, 'GET', `/api/projects/${p2}/task-suggestions`)).data; assert.equal(first.suggestions.length, 100); assert.equal(first.pending, 100); assert.equal((await as(SAM, 'POST', `/api/projects/${p2}/task-suggestions/${first.suggestions[0].id}/dismiss`, {})).status, 200);
  assert.equal((await tool(SAM, 'save_task_suggestions', { project: p2, suggestions: [{ action: 'create', fields: { title: 'Room again' }, reason: 'r', source: SRC }] })).data.stored, 1);
  for (const id of ['sg_' + '0'.repeat(24), 'nope', 'sg_short']) { assert.equal((await as(SAM, 'POST', `${BASE}/${id}/accept`, {})).status, 404); assert.equal((await as(SAM, 'POST', `${BASE}/${id}/dismiss`, {})).status, 404); }
});
await t('deleting a project for good removes its suggestions too', async () => {
  const p3 = (await as(SAM, 'POST', '/api/projects', { name: 'To delete', customer: 'Acme' })).data.project.id; await tool(SAM, 'save_task_suggestions', { project: p3, suggestions: [{ action: 'create', fields: { title: 'x' }, reason: 'r', source: SRC }] }); assert.equal(store.get('tsg.' + p3).size, 1);
  const src = fs.readFileSync(new URL('../work/server/api.mjs', import.meta.url), 'utf8'); assert.ok(src.includes("'tsg.' + P.id"), 'the delete list names tsg.<project>'); assert.ok(!/KINDS = \[[^\]]*'tsg'/.test(src), 'tsg is not an item kind');
});
await t('task_tracking reply (Otto in Teams): only the task owner answers, approvals stay in the Studio, a Teams button runs as the clicker, and the auto block survives', async () => {
  const mk = (id, data) => as(SAM, 'PUT', `/api/projects/${pid}/items/task/${id}`, { data: Object.assign({ status: 'To Do', owner: KIM, type: 'UAT Task' }, data) });
  for (const [id, d] of [['r1', { title: 'Send the asset file' }], ['r2', { title: 'Approve the BRD', type: 'BRD Task' }], ['r3', { title: 'Check the report' }], ['r4', { title: 'Write test cases', src: { type: 'auto', ref: 'cover:wo' }, auto: { key: 'cover:wo', rule: 'cover', view: 'delivery', at: 'x' } }]]) assert.equal((await mk(id, d)).status, 200, id);
  assert.deepEqual([(await taskData_('r4')).auto.key, (await taskData_('r4')).src.type], ['cover:wo', 'auto'], 'the auto block and source survive the normal save');
  const reply = (who, body, headers) => as(who, 'POST', '/api/', body, headers || { 'x-work-mcp': '1', 'x-work-mcp-tool': 'task_tracking' });
  const other = await reply(SAM, { action: 'reply', project: pid, taskId: 'r1', status: 'Done', text: 'sent' }); assert.equal(other.status, 403); assert.match(other.data.error, /Only the owner/); assert.equal((await taskData_('r1')).status, 'To Do');
  assert.equal((await reply(KIM, { action: 'reply', project: pid, taskId: 'r1', status: 'Blocked' })).status, 400, 'blocked needs words');
  const ok = await reply(KIM, { action: 'reply', project: pid, taskId: 'T-' + (await taskData_('r1')).n, status: 'Done', text: 'File sent to the customer' }); assert.equal(ok.status, 200, JSON.stringify(ok.data)); const r1 = await taskData_('r1'); assert.deepEqual([r1.status, r1.completion], ['Done', 'File sent to the customer']); assert.match(r1.comments.at(-1).text, /Reply from .*Done.*File sent/);
  assert.equal((await reply(KIM, { action: 'reply', project: pid, taskId: 'r1', status: 'Done', text: 'again' })).status, 409);
  const appr = await reply(KIM, { action: 'reply', project: pid, taskId: 'r2', status: 'Done', text: 'ok' }); assert.equal(appr.data.needsStudio, true); assert.equal((await taskData_('r2')).status, 'To Do');
  const btn = await as(KIM, 'POST', '/api/', { tool: 'task_reply', project: pid, taskId: 'r3', status: 'Done', text: 'Marked done', via: 'teams' }, { 'x-work-teams-action': '1' }); assert.equal(btn.status, 200, JSON.stringify(btn.data)); assert.match(btn.data.text, /is now Done/); assert.equal((await taskData_('r3')).status, 'Done');
  assert.ok((await as(KIM, 'POST', '/api/', { tool: 'create_ticket', project: pid, subject: 'x' }, { 'x-work-teams-action': '1' })).status >= 400, 'a button can run task_reply only');
  assert.equal((await reply(KIM, { action: 'reply', project: pid, taskId: 'r4', status: 'Done', text: 'written' })).status, 200); assert.equal((await taskData_('r4')).auto.resolvedBy, 'person', 'a task closed by its owner is never reopened by the engine');
});
console.log(n + ' task suggestion checks passed');
