// Task engine (docs/reference/TASKS-AUTOMATION-PLAN-2026-11-07.md): the pure rules in src/taskengine.js, then the server side that lets the owner answer a task (task_reply) and keeps the auto block.
// NOT checked: the Tasks page in a browser, a real Teams message, a real Otto conversation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/taskengine.js');
const { desired, reconcile, idOf } = globalThis.FWBViews.taskEngineLogic;
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const facts = { openFindings: [{ transcriptId: 'tr1', title: 'Kickoff call', count: 3 }, { transcriptId: 'tr2', title: 'Empty', count: 0 }], reviewMissing: [{ part: 'intro', label: 'Introduction' }], coverageMissing: [{ module: 'workorder', label: 'Work Order', count: 2 }], failedCases: [{ id: 'u1', tcid: 'TC-4', title: 'Close a WO' }], kpisNoSolution: [{ id: 'k1', name: 'MTTR' }] };

await t('desired lists one task per fact, with a stable key, and skips empty counts', () => {
  const w = desired(facts); assert.deepEqual(w.map(x => x.key), ['findings:tr1', 'brd:intro', 'cover:workorder', 'fail:u1', 'kpi:k1']);
  assert.match(w[0].title, /Review 3 items from Kickoff call/); assert.deepEqual(desired(null), []); assert.deepEqual(desired({}), []);
});
await t('reconcile creates what is missing; the id comes from the key, so a second run makes nothing', () => {
  const r = reconcile(desired(facts), [], '2026-11-07T00:00:00Z'); assert.equal(r.create.length, 5); assert.equal(r.create[0].id, idOf('findings:tr1')); assert.match(r.create[0].id, /^ta_[a-z0-9]+$/);
  assert.equal(new Set(r.create.map(x => x.id)).size, 5); assert.deepEqual([r.create[0].src.type, r.create[0].status, r.create[0].auto.key], ['auto', 'To Do', 'findings:tr1']);
  const again = reconcile(desired(facts), r.create, 'x'); assert.deepEqual([again.create.length, again.resolve.length, again.reopen.length], [0, 0, 0]);
});
await t('an automatic task whose reason is gone is resolved; a task a person made is never touched', () => {
  const made = reconcile(desired(facts), [], 'x').create; const person = { id: 't_1', title: 'Mine', status: 'To Do' };
  const r = reconcile(desired({ reviewMissing: facts.reviewMissing }), made.concat([person]), 'y'); assert.deepEqual(r.resolve.map(x => x.id).sort(), made.filter(x => x.auto.rule !== 'brd').map(x => x.id).sort()); assert.ok(!r.resolve.some(x => x.id === 't_1'));
  assert.match(r.resolve[0].why, /./);
});
await t('reopen only what the engine itself closed; a task a person closed stays closed', () => {
  const [a, b] = reconcile(desired(facts), [], 'x').create;
  const byEngine = Object.assign({}, a, { status: 'Done', auto: Object.assign({}, a.auto, { resolvedBy: 'engine' }) }), byPerson = Object.assign({}, b, { status: 'Done', auto: Object.assign({}, b.auto, { resolvedBy: 'person' }) });
  const r = reconcile(desired(facts), [byEngine, byPerson], 'z'); assert.deepEqual(r.reopen, [{ id: a.id }]); assert.ok(!r.create.some(x => x.id === b.id), 'no duplicate for the closed one');
  const done = Object.assign({}, a, { status: 'Done' }); assert.equal(reconcile([], [done], 'z').resolve.length, 0, 'closed tasks are not resolved again');
});

// ---------- server side ----------
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
await t('the auto block and the auto source survive the normal task save, and the work.json action is declared', () => {
  const api = src('work/server/api.mjs'); assert.match(api, /TASK_SRC = \[[^\]]*'auto'\]/); assert.match(api, /out\.auto = \{ key: plain\(au\.key, 200\)/); assert.match(api, /reply: 'task_reply'/);
  const wj = JSON.parse(src('work/work.json')); const tt = wj.mcp.tools.find(x => x.name === 'task_tracking'); assert.ok(tt.input_schema.properties.action.enum.includes('reply')); ['taskId', 'status', 'text'].forEach(k => assert.ok(tt.input_schema.properties[k], k)); assert.equal(wj.mcp.tools.length, 39, 'the connector stays at 39 tools');
});
await t('the Teams digest gets a Done button for tasks due soon or overdue, run by the clicker, and only task_reply is allowed from a button', async () => {
  const { digestMessage, pendingFor } = await import('../work/server/_taskwatch.mjs'); const today = '2026-11-07';
  const P = [{ id: 'p1', name: 'Alpha', tasks: [{ id: 't_a', data: { n: 12, title: 'Send data', owner: 'kim@facilio.com', status: 'To Do', due: '2026-11-05' } }, { id: 't_b', data: { n: 13, title: 'Later', owner: 'kim@facilio.com', status: 'To Do', due: '2026-12-30' } }] }];
  const m = digestMessage(pendingFor('kim@facilio.com', P, today), today); assert.equal(m.actions.length, 2); assert.deepEqual(m.actions[1], { title: 'Done: T-12', fn: 'api', data: { tool: 'task_reply', project: 'p1', taskId: 't_a', status: 'Done', text: 'Marked done by the owner from the Teams message.', via: 'teams' } });
  assert.match(src('work/server/api.mjs'), /viaButton \? \(b\.tool === 'task_reply' \? 'task_reply' : ''\)/);
});
console.log(n + ' checks passed');
