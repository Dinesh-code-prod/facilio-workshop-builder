// Health rules of the Admin Command Center (work/server/_portfolio.mjs) on projects in known states: each project's health,
// the signal behind it, its evidence and the portfolio metrics. Pure functions, no storage.
import assert from 'node:assert/strict';
import { assess, docsOf, workload, planInfo, RULES, MANUAL } from '../work/server/_portfolio.mjs';
const today = '2026-10-28'; const ago = n => new Date(Date.parse(today + 'T12:00:00Z') - n * 864e5).toISOString(); const day = n => ago(-n).slice(0, 10);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const task = (id, d, created = 3, updated = 1) => ({ kind: 'task', id, data: Object.assign({ n: Number(id.replace(/\D/g, '')) || 1, title: 'Task ' + id, status: 'To Do', type: 'Implementation Task' }, d), createdAt: ago(created), updatedAt: ago(updated) });
const plan = rows => ({ rows });
const base = (extra) => Object.assign({ p: { id: 'p1', name: 'P', customer: 'C', createdAt: ago(60), updatedAt: ago(1) }, plan: plan([{ title: 'Kick-off', start: day(-30), end: day(-29), status: 'Done' }, { title: 'Go-live', start: day(90), end: day(95) }]), controls: {}, brd: {}, items: [task('t1', { owner: 'a@facilio.com', eta: day(5) })], au: [{ at: ago(1) }] }, extra || {});
const codes = h => h.signals.map(s => s.code);

t('a project with a dated plan, current tasks and recent activity is on track, and says why', () => {
  const h = assess(base(), today); assert.equal(h.health, 'on_track'); assert.equal(h.signals.length, 0); assert.match(h.why[0], /No warning found/);
  assert.equal(h.metrics.stage, 1); assert.equal(h.metrics.nextMilestone.title, 'Go-Live & Hypercare'); assert.equal(h.metrics.target, day(90)); assert.equal(h.metrics.targetKind, 'go-live (plan)');
});
t('no plan, tasks, actions or RAID: insufficient data, not "healthy"', () => {
  const h = assess(base({ plan: {}, items: [] }), today); assert.equal(h.health, 'insufficient');
});
t('a blocked Critical task makes the project blocked, with the task as evidence', () => {
  const h = assess(base({ items: [task('t1', { status: 'Blocked', priority: 'Critical', blocker: 'Vendor IdP certificate expired' })] }), today);
  assert.equal(h.health, 'blocked'); const s = h.signals.find(x => x.code === 'blocker'); assert.equal(s.sev, 'critical'); assert.equal(s.kind, 'issue');
  assert.match(s.ev[0].label, /T-1 .*certificate/); assert.deepEqual(s.ev[0].x, { tkOpenOnce: 't1' }); assert.equal(s.ev[0].view, 'tasks');
});
t('one Low-priority blocker updated yesterday is a high signal (at risk), not a blocked project', () => {
  const h = assess(base({ items: [task('t1', { status: 'Blocked', priority: 'Low' })] }), today); assert.equal(h.health, 'at_risk'); assert.equal(h.signals[0].sev, 'high');
});
t('a blocker untouched for 14+ days is long-standing and blocks the project', () => {
  const h = assess(base({ items: [task('t1', { status: 'Blocked', priority: 'Low' }, 30, RULES.blockerLongDays + 1)] }), today); assert.equal(h.health, 'blocked');
});
t('a plan step recorded as not done after its end date makes the project overdue', () => {
  const h = assess(base({ plan: plan([{ title: 'Workshops', start: day(-20), end: day(-5), status: 'In progress' }, { title: 'Go-live', start: day(60) }]) }), today);
  assert.equal(h.health, 'overdue'); assert.ok(codes(h).includes('milestone_late'));
});
t('plan rows without a status say nothing about lateness', () => {
  const h = assess(base({ plan: plan([{ title: 'Workshops', start: day(-20), end: day(-5) }, { title: 'Go-live', start: day(60) }]) }), today); assert.ok(!codes(h).includes('milestone_late'));
});
t('the end date passing without go-live acceptance is overdue; with acceptance it is not', () => {
  const p = { id: 'p1', name: 'P', customer: 'C', endDate: day(-3), createdAt: ago(90), updatedAt: ago(1) };
  assert.equal(assess(base({ p }), today).health, 'overdue');
  const h = assess(base({ p, items: [task('t1', {}), { kind: 'signoff', id: 'golive', data: { status: 'signed' }, createdAt: ago(5), updatedAt: ago(4) }] }), today); assert.ok(!codes(h).includes('end_passed')); assert.equal(h.metrics.live, true);
});
t('overdue tasks: High priority is a high issue, others medium; 3+ overdue Critical/High makes the project overdue', () => {
  let h = assess(base({ items: [task('t1', { priority: 'High', eta: day(-2), owner: 'a@x' }), task('t2', { eta: day(-1) })] }), today); assert.equal(h.health, 'at_risk'); assert.deepEqual(codes(h), ['task_overdue_hp', 'task_overdue']);
  h = assess(base({ items: [1, 2, 3].map(i => task('t' + i, { priority: 'High', due: day(-i), owner: 'a@x' })) }), today); assert.equal(h.health, 'overdue'); assert.equal(h.signals[0].n, 3); assert.equal(h.signals[0].since, day(-3));
});
t('a blocked task past its date is counted once, as a blocker, not also as overdue', () => {
  const h = assess(base({ items: [task('t1', { status: 'Blocked', priority: 'High', eta: day(-4), owner: 'a@x' })] }), today); assert.deepEqual(codes(h), ['blocker']); assert.equal(h.metrics.overdueTasks, 1, 'the table still shows it as overdue');
});
t('a customer question waiting for us for 7+ days is a signal; one waiting for the customer is a separate signal', () => {
  const q = (id, st, age) => task(id, { type: 'Customer Question', question: { text: 'x', status: st } }, age);
  const h = assess(base({ items: [q('t1', 'New', 9), q('t2', 'Awaiting Customer', 20), q('t3', 'New', 2)] }), today);
  assert.ok(codes(h).includes('q_internal') && codes(h).includes('q_customer')); assert.equal(h.signals.find(s => s.code === 'q_internal').n, 1); assert.equal(h.metrics.custWaiting, 1);
});
t('two medium signals make a project at risk; one does not', () => {
  const dec = { kind: 'decision', id: 'd1', data: { status: 'Proposed', title: 'Approval levels' }, createdAt: ago(10), updatedAt: ago(10) };
  assert.equal(assess(base({ items: [task('t1', {}), dec] }), today).health, 'on_track');
  assert.equal(assess(base({ items: [task('t1', { eta: day(-1) }), dec] }), today).health, 'at_risk');
});
t('go-live within 21 days with BRD and UAT sign-off missing is a potential risk', () => {
  const h = assess(base({ plan: plan([{ title: 'Kick-off', start: day(-60), end: day(-59), status: 'Done' }, { title: 'Go-live', start: day(10) }]) }), today);
  const s = h.signals.find(x => x.code === 'golive_soon'); assert.equal(s.kind, 'risk'); assert.match(s.title, /BRD sign-off, UAT sign-off/); assert.equal(h.metrics.deadlineSoon, true);
});
t('no activity for 14+ days is a potential risk, not a confirmed issue', () => {
  const h = assess(base({ p: { id: 'p1', name: 'P', customer: 'C', createdAt: ago(60), updatedAt: ago(20) }, items: [task('t1', { eta: day(5) }, 30, 20)], au: [{ at: ago(20) }] }), today);
  const s = h.signals.find(x => x.code === 'idle'); assert.equal(s.kind, 'risk'); assert.equal(s.sev, 'medium');
});
t('a manual status is shown as set and the rules never override it', () => {
  const h = assess(base({ p: { id: 'p1', name: 'P', customer: 'C', deliveryStatus: 'on_hold', deliveryStatusBy: 'Dinesh R', deliveryStatusAt: ago(2), createdAt: ago(60), updatedAt: ago(1) }, items: [task('t1', { status: 'Blocked', priority: 'Critical' })] }), today);
  assert.equal(h.health, 'on_hold'); assert.match(h.why[0], /Dinesh R/); assert.ok(h.signals.length > 0, 'signals are still listed for investigation');
});
t('unassigned Critical/High work and late customer actions are flagged with their records', () => {
  const h = assess(base({ items: [task('t1', { priority: 'Critical' }), task('t2', { type: 'Customer Action Required', due: day(-4) }), { kind: 'action', id: 'a1', data: { text: 'Send asset list', side: 'customer', status: 'Open', due: day(-2) }, createdAt: ago(9), updatedAt: ago(9) }] }), today);
  assert.ok(codes(h).includes('unassigned')); const c = h.signals.find(s => s.code === 'customer_late'); assert.equal(c.n, 2); assert.equal(c.ev[1].view, 'governance');
});
t('BRD sign-off planned in the past and not recorded is a documents issue', () => {
  const h = assess(base({ plan: plan([{ title: 'BRD sign-off', start: day(-10), end: day(-3), status: 'Done' }, { title: 'Go-live', start: day(80) }]) }), today);
  assert.ok(codes(h).includes('brd_late')); assert.ok(!codes(assess(base({ plan: plan([{ title: 'BRD sign-off', start: day(-10), end: day(-3), status: 'Done' }]), brd: { status: 'approved' } }), today)).includes('brd_late'));
});
t('signals are ordered by severity and each carries a project, an id and evidence', () => {
  const h = assess(base({ items: [task('t1', { status: 'Blocked', priority: 'Critical', owner: 'a@x' }), task('t2', { eta: day(-1) })] }), today);
  assert.deepEqual(h.signals.map(s => s.sev), ['critical', 'medium']); h.signals.forEach(s => { assert.equal(s.project, 'p1'); assert.ok(s.id && s.ev.length && s.action && s.why); });
});
t('documentation readiness is read from the records', () => {
  const r = base({ planner: { sessions: [{ date: day(-5) }, { date: day(5) }, { date: day(-1), status: 'cancelled' }] }, workshop: { requirements: [{ status: 'Confirmed' }, { status: 'Draft' }, {}] }, brd: { status: 'in_review', exports: [1] },
    items: [{ kind: 'ai', id: 'a1', data: { task: 'uat', status: 'draft', missingParts: ['Test cases'] }, updatedAt: ago(1) }, { kind: 'ugd', id: 'g1', data: { status: 'approved' } }, { kind: 'cr', id: 'c1', data: { status: 'Requested' } }] });
  const d = docsOf(r, today); assert.deepEqual(d.workshops, { done: 1, total: 2 }); assert.equal(d.requirements.confirmed, 1); assert.equal(d.requirements.draft, 2); assert.equal(d.brd.status, 'in_review'); assert.equal(d.uat.plan, 'incomplete'); assert.equal(d.guide.approved, 1); assert.equal(d.cr.awaiting, 1); assert.equal(d.incomplete, 1);
});
t('workload: per owner, unassigned per project, and concentration of critical work', () => {
  const rows = [{ p: { id: 'p1', name: 'One' }, items: [task('t1', { owner: 'a@x', priority: 'High', eta: day(-1) }), task('t2', { owner: 'a@x', priority: 'Critical' }), task('t3', { owner: 'a@x', priority: 'High', status: 'In Review' }), task('t4', { owner: 'b@x', priority: 'Low' }), task('t5', { priority: 'High' }), task('t6', { owner: 'b@x', status: 'Done' })] }];
  const w = workload(rows, today); const a = w.owners.find(o => o.owner === 'a@x'); assert.deepEqual([a.open, a.overdue, a.high, a.review, a.projects], [3, 1, 3, 1, 1]);
  assert.equal(w.owners.find(o => o.owner === 'b@x').open, 1, 'done work is not counted'); assert.deepEqual(w.unassigned[0], { project: 'p1', name: 'One', n: 1, high: 1 });
  assert.deepEqual(w.concentration[0], { project: 'p1', name: 'One', owner: 'a@x', n: 3, of: 3 });
});
t('plan steps map like the Plan Timeline page, and a forced phase wins', () => {
  const pi = planInfo(plan([{ title: 'UAT sign-off', start: day(-3) }, { title: 'Training', start: day(4) }]), { phase: { step: 4 } }, today); assert.equal(pi.cur, 3); assert.equal(pi.forced, true);
  const pj = planInfo(plan([{ title: 'UAT sign-off', start: day(-3) }, { title: 'Training', start: day(4) }]), {}, today); assert.equal(pj.curTitle, 'UAT Sign-Off'); assert.equal(pj.next.title, 'Training The Wider Team');
});
t('Churned, Not workable and Discontinued are set by a person, shown as set, and are not active', () => { for (const st of ['churned', 'not_workable', 'discontinued']) { const b = base(); b.p.deliveryStatus = st; b.p.deliveryStatusBy = 'Admin'; const h = assess(b, today); assert.equal(h.health, st); assert.equal(h.manual, st); assert.match(h.why[0], /Set by Admin/); } assert.ok(MANUAL.includes('churned') && MANUAL.includes('not_workable') && MANUAL.includes('discontinued')); });
console.log(`\n${n} portfolio health checks passed`);
