// Lifecycle tracker rules (src/lifelogic.js): nine stages, status from records and authorised decisions, missing information is never success.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const L = require('../src/lifelogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const cp = state => ({ state, name: 'x', detail: '' });

t('there are seven stages (the eight-stage roadmap has no page for 6) in the agreed order, numbered as the menu, each tied to distinct checkpoints', () => {
  assert.deepEqual(L.STAGES.map(s => s.name), ['Project introduction', 'Requirement sessions', 'Solution design & BRD', 'UAT & FTR', 'Training guides', 'Hypercare', 'Project handover']); assert.deepEqual(L.STAGES.map(s => s.n), [1, 2, 3, 4, 5, 7, 8]);
  const all = L.STAGES.flatMap(s => s.cps); assert.equal(new Set(all).size, all.length); assert.deepEqual([...all].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); });
t('nothing completes by itself: only a recorded decision gives Completed, never the records alone', () => { assert.equal(L.status({ cps: [cp('done'), cp('done')], signs: [] }).status, 'ready'); assert.equal(L.status({ cps: [cp('done')], signs: [], decision: { status: 'closed' } }).status, 'completed'); assert.equal(L.STATUS.ready, 'Ready to close'); });
t('no records at all is Upcoming, never Completed', () => { assert.equal(L.status({ cps: [cp('none')], signs: [] }).status, 'upcoming'); assert.equal(L.status({ cps: [], signs: [] }).status, 'upcoming'); });
t('a stage with no checkpoints cannot complete from records alone', () => { assert.equal(L.status({ cps: [], signs: [], cur: true }).status, 'current'); });
t('all records done and every sign-off signed is only Ready to close (a person closes it); one unsigned sign-off is not even that', () => {
  assert.equal(L.status({ cps: [cp('done')], signs: [{ k: 'brd', st: 'signed' }] }).status, 'ready');
  assert.equal(L.status({ cps: [cp('done')], signs: [{ k: 'brd', st: 'requested' }] }).status, 'current'); });
t('work under way is Current; the pointer stage is Current even with no records', () => { assert.equal(L.status({ cps: [cp('progress')], signs: [] }).status, 'current'); assert.equal(L.status({ cps: [cp('none')], signs: [], cur: true }).status, 'current'); });
t('overdue plan rows make an unfinished stage Delayed; blockers beat delays; neither changes a completed stage', () => {
  assert.equal(L.status({ cps: [cp('progress')], signs: [], overdue: 2 }).status, 'delayed');
  assert.equal(L.status({ cps: [cp('progress')], signs: [], overdue: 2, blockers: 1 }).status, 'blocked');
  assert.equal(L.status({ cps: [cp('done')], signs: [], overdue: 2, blockers: 1 }).status, 'ready'); });
t('a blocker on a stage nobody has started does not mark it Blocked', () => { assert.equal(L.status({ cps: [cp('none')], signs: [], blockers: 3 }).status, 'upcoming'); });
t('an authorised closure completes the stage and says when the records disagree; "not applicable" is its own status', () => {
  const r = L.status({ cps: [cp('progress'), cp('none')], signs: [], decision: { status: 'closed' } }); assert.equal(r.status, 'completed'); assert.equal(r.mismatch, true); assert.equal(r.open, 2);
  assert.equal(L.status({ cps: [cp('done')], signs: [], decision: { status: 'closed' } }).mismatch, false);
  assert.equal(L.status({ cps: [cp('none')], signs: [], decision: { status: 'na' } }).status, 'na'); });
t('reopening (empty decision) goes back to what the records say', () => { assert.equal(L.status({ cps: [cp('progress')], signs: [], decision: { status: '' } }).status, 'current'); });
t('current stage is the furthest one in progress, else the first not completed; not-applicable stages are skipped; counts have no percentage', () => {
  const ls = [{ status: 'completed', active: true }, { status: 'na', active: false }, { status: 'current', active: true }, { status: 'upcoming', active: false }];
  assert.equal(L.current(ls), 2); assert.equal(L.current([{ status: 'completed', active: true }, { status: 'na' }, { status: 'upcoming', active: false }]), 2);
  assert.equal(L.current([{ status: 'completed' }, { status: 'completed' }]), 1); assert.deepEqual(L.counts(ls), { done: 1, total: 3, na: 1 }); });
console.log(`\n${n} lifecycle checks passed`);
