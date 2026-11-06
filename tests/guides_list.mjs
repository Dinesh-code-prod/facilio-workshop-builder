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
