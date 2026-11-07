// Customer mail becomes tasks: routing, scenarios, dedupe, done-when, reply state, and the engine rule for mail tasks.
// NOT checked: a real Claude run, a real Outlook draft, the Tasks page in a browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../work/server/_mailtasks.mjs';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/taskengine.js');
const M = globalThis.FWBMailTasks; const { desired, reconcile } = globalThis.FWBViews.taskEngineLogic;
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const ctx = { me: 'me@facilio.com', team: ['me@facilio.com', 'ravi@facilio.com'], customer: 'Al Mujama Group', project: 'Al Mujama FM Rollout', modules: ['Work Order', 'Inventory'], keywords: ['snag list'] };
const raw = (o) => Object.assign({ messageId: '<ABC-1@mail.customer.com>', from: { name: 'Sara', email: 'Sara@customer.com' }, to: ['me@facilio.com'], cc: [], subject: 'RE: change to the BRD', body: 'Please update the BRD section 4.' }, o || {});
const mk = (o) => M.clean(raw(o)).mail;

await t('clean needs a message id, lower-cases addresses, cuts long text and strips angle brackets', () => {
  assert.equal(M.clean(raw({ messageId: '' })).ok, false); assert.equal(M.clean(null).ok, false); assert.equal(M.clean(raw({ subject: '', body: '' })).ok, false);
  const c = M.clean(raw({ to: 'A@x.com; Bob <b@x.com>, bad', body: 'x'.repeat(20000) })).mail; assert.deepEqual(c.to, ['a@x.com', 'b@x.com']); assert.equal(c.body.length, 8000); assert.equal(c.messageId, 'ABC-1@mail.customer.com'); assert.equal(c.from.email, 'sara@customer.com');
});
await t('dedupe: the same message id in any spelling gives the same record id; another mail differs', () => {
  assert.equal(M.idOf('<ABC-1@mail.customer.com>'), M.idOf(' abc-1@MAIL.customer.com ')); assert.notEqual(M.idOf('a@b.c'), M.idOf('a2@b.c')); assert.match(M.idOf('x'), /^ml_[0-9a-f]{16}$/);
});
await t('scenario (a) to, (b) cc, (d) team member only, (c) mention without any team recipient', () => {
  assert.equal(M.scenario(mk(), ctx).scenario, 'to');
  assert.equal(M.scenario(mk({ to: ['x@customer.com'], cc: ['me@facilio.com'] }), ctx).scenario, 'cc');
  assert.equal(M.scenario(mk({ to: ['ravi@facilio.com'] }), ctx).scenario, 'team');
  const m = mk({ to: ['x@customer.com'], subject: 'Question', body: 'About the Inventory counts please.' }); assert.deepEqual([M.scenario(m, ctx).scenario, M.scenario(m, ctx).hit], ['mention', 'inventory']);
  assert.equal(M.scenario(mk({ to: ['x@customer.com'], subject: 'Hello', body: 'Lunch?' }), ctx), null);
  assert.equal(M.scenario(mk({ to: ['x@customer.com'], body: 'the snag list is ready' }), ctx).scenario, 'mention');
});
await t('mention matches whole words only and ignores generic or short project words', () => {
  assert.equal(M.scenario(mk({ to: [], body: 'Inventories are fine' }), ctx), null); assert.equal(M.scenario(mk({ to: [], body: 'the project is new' }), ctx), null);
  assert.equal(M.scenario(mk({ to: [], body: 'Hi Mujama team' }), ctx).scenario, 'mention');
});
await t('route by words: BRD -> BRD, process flow / solution -> Solution (+ compare job), the more specific wins', () => {
  assert.equal(M.route(mk(), ctx).area, 'brd');
  const s = M.route(mk({ subject: 'Process flow change', body: 'The Work Order approval flow must have two steps. Also update the BRD.' }), ctx); assert.deepEqual([s.area, s.job, s.module, s.areaKey], ['solution', 'compare_solution', 'Work Order', 'module:Work Order']);
  assert.equal(M.route(mk({ subject: 'Issue', body: 'We have a defect in UAT' }), ctx).area, 'uat'); assert.equal(M.route(mk({ subject: 'Hypercare issue', body: 'broken after go live' }), ctx).area, 'hypercare');
  const o = M.route(mk({ subject: 'Thanks', body: 'Meeting next week' }), ctx); assert.deepEqual([o.area, o.job], ['other', '']);
  assert.equal(M.route(mk({ subject: 'the solution', body: 'no module' }), ctx).areaKey, 'area:other');
});
await t('makeRecord stores pending with a title, and nothing for a mail that matters to nobody', () => {
  const r = M.makeRecord(mk(), ctx, '2026-11-07T10:00:00Z'); assert.deepEqual([r.status, r.scenario, r.route.area, r.reply, r.doneWhen], ['pending', 'to', 'brd', null, null]); assert.match(r.title, /^BRD change: change to the BRD$/);
  assert.equal(M.makeRecord(mk({ to: ['x@y.com'], subject: 'Hi', body: 'x' }), ctx, 'n'), null);
});
await t('done-when: a Solution area is done only by an accepted version after the task that quotes the mail', () => {
  const rec = { id: 'ml_1', doneWhen: M.doneWhen({ area: 'solution', areaKey: 'module:Work Order' }, '2026-11-07T10:00:00Z', 'ml_1') };
  const f = (u, src) => ({ solutions: { items: { 'module:Work Order': { updatedAt: u, sources: src } } } });
  assert.equal(M.isDone(rec, f('2026-11-07T09:00:00Z', [{ source: 'mail:ml_1 Re: flow' }])), '');   // older than the task
  assert.equal(M.isDone(rec, f('2026-11-07T11:00:00Z', [{ source: 'other file' }])), '');   // does not quote this mail
  assert.match(M.isDone(rec, f('2026-11-07T11:00:00Z', [{ quote: 'x', source: 'mail:ml_1 Re: flow' }])), /Work Order was accepted/); assert.equal(M.isDone(rec, {}), '');
});
await t('done-when: BRD saved on or after the task day; change request decided; none never resolves', () => {
  const b = { doneWhen: { type: 'brd_saved', since: '2026-11-07T10:00:00Z' } }; assert.equal(M.isDone(b, { brdDates: ['2026-11-06'] }), ''); assert.match(M.isDone(b, { brdDates: ['2026-11-06', '2026-11-07'] }), /BRD version/);
  const c = { doneWhen: { type: 'cr_decided', since: 'x', crId: 'cr1' } }; assert.equal(M.isDone(c, { crs: [{ id: 'cr1', status: 'Open' }] }), ''); assert.match(M.isDone(c, { crs: [{ id: 'cr1', status: 'Approved' }] }), /decided/);
  assert.equal(M.isDone({ doneWhen: { type: 'none', since: 'x' } }, { brdDates: ['2030-01-01'] }), ''); assert.equal(M.isDone({ doneWhen: null }, {}), '');
});
await t('reply: drafted -> approved -> sent; sent needs approval and a place in Sent Items; an edit drops the approval', () => {
  const now = '2026-11-07T12:00:00Z'; let r = M.replyStep(null, 'draft', { subject: 'Re: BRD', body: 'Done.', to: 'sara@customer.com' }, 'claude@x.com', now); assert.deepEqual([r.state, r.to], ['drafted', ['sara@customer.com']]);
  assert.throws(() => M.replyStep(r, 'confirm_sent', { sentRef: 'x' }, 'c', now), /approved it/); assert.throws(() => M.replyStep(null, 'approve', {}, 'p', now), /no reply/);
  r = M.replyStep(r, 'approve', {}, 'me@facilio.com', now); assert.equal(r.approvedBy, 'me@facilio.com'); assert.throws(() => M.replyStep(r, 'approve', {}, 'p', now), /Only a drafted/);
  const e = M.replyStep(r, 'edit', { body: 'Changed.' }, 'me@facilio.com', now); assert.deepEqual([e.state, e.approvedBy], ['drafted', '']);
  assert.throws(() => M.replyStep(r, 'confirm_sent', { sentRef: '' }, 'c', now), /Sent Items/); r = M.replyStep(r, 'confirm_sent', { sentRef: 'Re: BRD to Sara 12:01' }, 'c', now); assert.equal(r.state, 'sent');
  assert.throws(() => M.replyStep(r, 'draft', { body: 'again' }, 'c', now), /already sent/); assert.throws(() => M.replyStep(r, 'discard', {}, 'c', now), /already sent/); assert.throws(() => M.replyStep({ state: 'drafted' }, 'draft', { body: '' }, 'c', now), /needs text/);
});
await t('engine: an accepted mail task is wanted until its check is met; then it resolves with the reason; a person-closed one stays closed', () => {
  const want = desired({ mailOpen: [{ id: 'ml_1', title: 'BRD change: x', area: 'brd', owner: 'me@facilio.com', desc: 'Customer asked.' }] }); assert.deepEqual(want.map(x => [x.key, x.rule, x.type]), [['mail:ml_1', 'mail', 'BRD Task']]);
  const made = reconcile(want, [], 'n').create; assert.deepEqual([made.length, made[0].owner, made[0].src.type], [1, 'me@facilio.com', 'email']); assert.equal(reconcile(want, made, 'n').create.length, 0);
  const r = reconcile(desired({}), made, 'n', { 'mail:ml_1': 'a BRD version was saved after this task was made' }); assert.equal(r.resolve.length, 1); assert.equal(r.resolve[0].why, 'a BRD version was saved after this task was made');
  const byPerson = [Object.assign({}, made[0], { status: 'Done' })]; assert.deepEqual(reconcile(want, byPerson, 'n').reopen, []); assert.deepEqual(reconcile(desired({}), byPerson, 'n').resolve, []);
});
console.log('\nmail_tasks: ' + n + ' passed');
