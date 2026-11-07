// Training guides overview (src/guideslist.js, rule `summary`): counts what exists and says where each kind is made; nothing invented.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/guideslist.js'); const { summary } = globalThis.FWBViews.guidesLogic;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (s, id) => s.rows.find(r => r.id === id);
t('an empty project lists five kinds with none made, and the UAT guide waits for test cases', () => {
  const s = summary({}); assert.equal(s.rows.length, 5); assert.equal(s.total, 0); assert.equal(row(s, 'uat').count, 0); assert.match(row(s, 'uat').detail, /Needs test cases/); assert.equal(row(s, 'user').view, 'guidebuilder'); assert.equal(row(s, 'uat').act, 'utcGuide');
});
t('counts and names what exists', () => {
  const s = summary({ userGuides: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }], recordings: [{ title: 'R' }], testCases: 12, walkthroughs: 3, mockupVideos: 1 });
  assert.equal(row(s, 'user').count, 4); assert.equal(row(s, 'user').detail, 'A, B, C and 1 more'); assert.equal(row(s, 'uat').count, 1); assert.match(row(s, 'uat').detail, /12 test cases/); assert.equal(row(s, 'wt').detail, '3 scenarios with a video.'); assert.equal(row(s, 'mv').detail, '1 mockup card with a video.'); assert.equal(s.total, 4 + 1 + 1 + 3 + 1);
});
console.log(n + ' guides overview checks passed');
// the request for Claude (make a guide, change a guide)
{ const { askJob } = globalThis.FWBViews.guidesLogic; let m = 0; const u = (name, fn) => { fn(); m++; console.log('  ok  ' + name); };
  u('make: any of the four kinds becomes a make_guide job, and an empty note means everything in scope', () => { const r = askJob('make', 'uat', ''); assert.deepEqual([r.ok, r.job.kind, r.job.section], [true, 'make_guide', 'uat']); assert.match(r.job.note, /Everything in scope/); assert.equal(askJob('make', 'video', 'x'.repeat(900)).job.note.length, 600); });
  u('change: needs the words; a wrong kind is refused', () => { assert.equal(askJob('change', 'user', '  ').ok, false); const r = askJob('change', 'training', 'add a rejection step'); assert.deepEqual([r.job.kind, r.job.section, r.job.note], ['change_guide', 'training', 'add a rejection step']); assert.equal(askJob('make', 'nope', 'x').ok, false); });
  console.log(m + ' guide request checks passed'); }
