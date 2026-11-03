// Plan timeline dependencies (src/tldepslogic.js): loops are refused, later tasks follow an earlier one that moved, conflicts and the critical path are found.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const D = createRequire(import.meta.url)('../src/tldepslogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (id, s, e, dep) => Object.assign({ id, title: id, start: s, end: e }, dep ? { dep } : {});

t('a task cannot wait for itself, or for something that already waits for it', () => {
  const rows = [row('a', '2026-01-01', '2026-01-03'), row('b', '2026-01-04', '2026-01-05', ['a']), row('c', '2026-01-06', '2026-01-06', ['b'])];
  assert.equal(D.wouldLoop(rows, 'a', 'a'), true); assert.equal(D.wouldLoop(rows, 'c', 'a'), true, 'a would wait for c, which waits for b, which waits for a'); assert.equal(D.wouldLoop(rows, 'a', 'c'), false); assert.equal(D.wouldLoop(rows, 'b', 'c'), false);
});
t('when a task ends later, the tasks that wait for it move later by the same amount, and keep their length', () => {
  const rows = [row('a', '2026-01-01', '2026-01-10'), row('b', '2026-01-04', '2026-01-06', ['a']), row('c', '2026-01-07', '2026-01-09', ['b'])];
  const moved = D.reschedule(rows, 'a'); assert.deepEqual(moved, ['b', 'c']);
  assert.deepEqual([rows[1].start, rows[1].end], ['2026-01-11', '2026-01-13']); assert.deepEqual([rows[2].start, rows[2].end], ['2026-01-14', '2026-01-16']);
});
t('tasks that already start after their predecessor are left alone, and nothing is ever moved earlier', () => {
  const rows = [row('a', '2026-01-01', '2026-01-03'), row('b', '2026-02-01', '2026-02-02', ['a'])]; assert.deepEqual(D.reschedule(rows, 'a'), []); assert.equal(rows[1].start, '2026-02-01');
});
t('a task with two predecessors waits for the later one', () => {
  const rows = [row('a', '2026-01-01', '2026-01-02'), row('b', '2026-01-01', '2026-01-09'), row('c', '2026-01-03', '2026-01-04', ['a', 'b'])]; D.reschedule(rows, 'b'); assert.equal(rows[2].start, '2026-01-10'); assert.equal(rows[2].end, '2026-01-11');
});
t('a milestone (one day) keeps being one day', () => {
  const rows = [row('a', '2026-03-01', '2026-03-05'), row('m', '2026-03-02', '2026-03-02', ['a'])]; D.reschedule(rows, 'a'); assert.deepEqual([rows[1].start, rows[1].end], ['2026-03-06', '2026-03-06']);
});
t('moving across a month end is plain calendar arithmetic', () => { const rows = [row('a', '2026-01-28', '2026-02-02'), row('b', '2026-01-29', '2026-01-30', ['a'])]; D.reschedule(rows, 'a'); assert.deepEqual([rows[1].start, rows[1].end], ['2026-02-03', '2026-02-04']); });
t('a link whose task starts before or on the day its predecessor ends is a conflict', () => {
  const rows = [row('a', '2026-01-01', '2026-01-10'), row('b', '2026-01-10', '2026-01-12', ['a']), row('c', '2026-01-11', '2026-01-12', ['a'])]; assert.deepEqual([...D.conflicts(rows)], ['a>b']);
});
t('the critical path is the longest chain of linked tasks, by days', () => {
  const rows = [row('a', '2026-01-01', '2026-01-02'), row('short', '2026-01-03', '2026-01-03', ['a']), row('long', '2026-01-03', '2026-01-12', ['a']), row('z', '2026-01-13', '2026-01-14', ['short', 'long']), row('alone', '2026-01-01', '2026-02-28')];
  const c = D.critical(rows); assert.deepEqual([...c.nodes].sort(), ['a', 'long', 'z']); assert.deepEqual([...c.links].sort(), ['a>long', 'long>z']); assert.equal(c.days, 2 + 10 + 2); assert.ok(!c.nodes.has('alone'), 'a long task with no links is not on the path');
});
t('nothing linked means no critical path; a bad link to a missing task is ignored', () => { assert.equal(D.critical([row('a', '2026-01-01', '2026-01-02')]).nodes.size, 0); assert.equal(D.critical([row('a', '2026-01-01', '2026-01-02', ['ghost'])]).nodes.size, 0); });
t('a loop that got into the data does not hang the critical path or the rescheduling', () => {
  const rows = [row('a', '2026-01-01', '2026-01-02', ['b']), row('b', '2026-01-03', '2026-01-04', ['a'])]; D.critical(rows); D.reschedule(rows, 'a'); assert.ok(true);
});
console.log(`${n} dependency checks passed`);
