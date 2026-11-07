// Status reports (src/wsrlogic.js): the weekly and monthly report built from the project records. Run: node tests/wsr.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../src/wsrlogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; };
const snap = () => ({ project: { name: 'Masaken CAFM', customer: 'Masaken' }, date: '2026-03-26',
  stages: [{ n: 1, name: 'Project introduction', status: 'Completed' }, { n: 2, name: 'Requirement sessions', status: 'Completed' }, { n: 3, name: 'Solution design & BRD', status: 'Delayed' }, { n: 4, name: 'UAT & FTR', status: 'Upcoming' }],
  plan: [{ title: 'BRD submission', owner: 'Facilio', start: '2026-03-01', end: '2026-03-10', status: 'Done', actual: '2026-03-12', pct: 100 },
    { title: 'Phase 1 UAT', owner: 'Facilio', start: '2026-03-15', end: '2026-03-20', status: 'In progress', pct: 40 },
    { title: 'Go live', owner: 'Masaken', start: '2026-04-02', end: '2026-04-02', status: 'Not started', pct: 0 }],
  tasks: [{ title: 'Share item codes', owner: 'Masaken', due: '2026-03-30', status: 'Awaiting Customer' }, { title: 'Fix UAT feedback', owner: 'Facilio', status: 'Done', _at: '2026-03-24T10:00:00Z' }, { title: 'Old task', status: 'Done', _at: '2026-02-01T10:00:00Z' }],
  raid: [{ type: 'R', title: 'BRD sign-off delay', impact: 'High', owner: 'Masaken', mitigation: 'Escalate', status: 'Open' }, { type: 'D', title: 'Sandbox users', owner: 'Masaken', due: '2026-03-31', status: 'Open' }, { type: 'R', title: 'Closed risk', impact: 'High', status: 'Closed' }],
  signoffs: [{ title: 'UAT 1', status: 'requested' }], crs: [{ title: 'Offline scope', status: 'Pending', _at: '2026-03-10' }], weekly: [{ date: '2026-03-19', title: 'WSR 19 Mar' }, { date: '2026-02-26' }] });
const sec = (r, id) => r.sections.find(s => s.id === id);

t('weekly: period is the 7 days to the date, and the cover names the client', () => { const r = W.build(snap(), 'week'); assert.equal(r.period.from, '2026-03-20'); assert.equal(r.cover.title, 'WEEKLY STATUS REPORT'); assert.equal(r.cover.client, 'Masaken'); });
t('milestones: a late task is High Risk with the days late; a done one has the actual end and no risk', () => {
  const rows = sec(W.build(snap(), 'week'), 'milestones').rows; const uat = rows.find(x => x[0] === 'Phase 1 UAT'); assert.deepEqual([uat[5], uat[6], uat[7]], ['In Progress', 'High Risk', '6 days past the planned end']);
  const brd = rows.find(x => x[0] === 'BRD submission'); assert.deepEqual([brd[4], brd[5], brd[6]], ['12-03-2026', 'Completed', '']); const g = rows.find(x => x[0] === 'Go live'); assert.equal(g[5], 'Yet to Start'); });
t('overall status carries its reason: a delayed stage and a late task and an open high risk give At risk', () => { const r = W.build(snap(), 'week'); assert.equal(r.summary.rag, 'At risk'); assert.match(r.summary.why, /delayed stage: Solution design & BRD/); assert.match(r.summary.why, /1 plan task is past/); assert.match(r.summary.why, /1 high-impact/); });
t('three late tasks or a blocked stage give Off track; a clean project gives On track', () => {
  const s = snap(); s.stages[2].status = 'Blocked'; assert.equal(W.build(s, 'week').summary.rag, 'Off track');
  const c = snap(); c.stages[2].status = 'Current'; c.plan[1].end = '2026-04-10'; c.raid = []; const r = W.build(c, 'week'); assert.equal(r.summary.rag, 'On track'); assert.match(r.summary.why, /No stage is delayed/); });
t('completed this week: only items closed inside the period; dependencies: waiting tasks, open dependency and requested sign-off', () => {
  const r = W.build(snap(), 'week'); assert.deepEqual(sec(r, 'completed').rows.map(x => x[0]), ['Fix UAT feedback']); assert.deepEqual(sec(r, 'dependencies').rows.map(x => x[0]).sort(), ['Sandbox users', 'Share item codes', 'UAT 1']); });
t('risks lists open risks only, never dependencies or closed ones', () => assert.deepEqual(sec(W.build(snap(), 'week'), 'risks').rows.map(x => x[0]), ['BRD sign-off delay']));
t('upcoming: planned starts in the next two weeks', () => { const s = snap(); s.plan[2].start = '2026-04-02'; const up = () => sec(W.build(s, 'week'), 'upcoming').rows.map(x => x[0]); assert.deepEqual(up(), ['Go live', 'Share item codes']); s.plan[2].start = '2026-06-01'; assert.deepEqual(up(), ['Share item codes']); });
t('empty records say so and invent nothing', () => { const r = W.build({ project: { name: 'X' }, date: '2026-03-26' }, 'week'); assert.equal(r.summary.rag, 'On track'); assert.equal(sec(r, 'milestones').rows.length, 0); const h = W.html(r); assert.match(h, /The project plan has no tasks yet/); assert.match(h, /No stage information is recorded yet/); });
t('monthly: the period is the calendar month, with change requests and the weekly reports of that month', () => { const r = W.build(snap(), 'month'); assert.deepEqual([r.period.from, r.period.to, r.period.label], ['2026-03-01', '2026-03-31', 'March 2026']); assert.equal(r.cover.title, 'MONTHLY STATUS REPORT'); assert.deepEqual(sec(r, 'changes').rows.map(x => x[0]), ['Offline scope']); assert.deepEqual(sec(r, 'weekly').rows.map(x => x[1]), ['WSR 19 Mar']); assert.ok(sec(r, 'completed').title === 'Achieved this month'); });
t('html: one self-contained file, text escaped, no external request', () => { const s = snap(); s.plan[0].title = '<script>alert(1)</script>'; const h = W.html(W.build(s, 'week')); assert.ok(h.startsWith('<!DOCTYPE html>')); assert.ok(!/<script/i.test(h)); assert.ok(!/(src|href)=["']https?:/i.test(h)); assert.match(h, /Executive Summary/); assert.match(h, /Closing Summary/); assert.match(h, /Milestone Overview/); });
t('askJob: a weekly or monthly job with the date, and a date is required', () => { assert.deepEqual(W.askJob('week', '2026-03-26', '').job, { kind: 'make_wsr', section: '2026-03-26', note: 'Weekly report to 2026-03-26' }); assert.deepEqual(W.askJob('month', '2026-03-26', 'x').job, { kind: 'make_monthly', section: '2026-03', note: 'x' }); assert.equal(W.askJob('week', '', '').ok, false); });
console.log('wsr: ' + n + ' checks passed');
