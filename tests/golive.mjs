// Go-live readiness (src/golive.js, rule `readiness`): read from recorded data; a gap is shown, never a refusal; green only when it is really done.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/golive.js'); const { readiness } = globalThis.FWBViews.goliveLogic;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (r, id) => r.rows.find(x => x.id === id);
t('an empty project shows gaps, not green', () => {
  const r = readiness({}); assert.ok(r.rows.length >= 6); assert.equal(r.open, r.rows.length - 1, 'no open issue is fine'); assert.equal(row(r, 'cover').state, 'gap'); assert.equal(row(r, 'guides').state, 'gap'); assert.match(r.verdict, /still open/);
});
t('a finished project is all green', () => {
  const full = { ftr: { total: 2, pass: 2, fail: 0, blocked: 0, notrun: 0 }, uatGuide: true, reqTotal: 4, reqCovered: 4, cases: [{ status: 'Passed' }, { status: 'Approved' }], issues: [{ status: 'Closed' }], review: { intro: { at: 1 }, requirements: { at: 1 }, flows: { at: 1 }, fields: { at: 1 }, apps: { at: 1 }, contract: { at: 1 } }, guides: 2 };
  const r = readiness(full); assert.equal(r.open, 0); assert.equal(r.verdict, 'Everything recorded is ready'); assert.ok(r.rows.every(x => x.state === 'ok'));
});
t('partial progress is amber, a high open issue is pink, failed cases are counted', () => {
  const r = readiness({ reqTotal: 4, reqCovered: 2, cases: [{ status: 'Passed' }, { status: 'Failed' }, { status: 'Not Started' }], issues: [{ status: 'Open', severity: 'High' }, { status: 'Closed' }], review: { intro: { at: 1 } }, guides: 0 });
  assert.equal(row(r, 'cover').state, 'warn'); assert.equal(row(r, 'cover').detail, '2 of 4 have a test case.'); assert.equal(row(r, 'run').detail, '2 of 3 run, 1 passed.'); assert.equal(row(r, 'bad').state, 'warn'); assert.equal(row(r, 'issues').state, 'gap'); assert.match(row(r, 'issues').detail, /1 open, 1 high/); assert.equal(row(r, 'brd').state, 'warn'); assert.equal(row(r, 'brd').detail, '1 of 6 review parts ticked.');
});
t('deferred issues and closed ones do not count as open', () => { assert.equal(row(readiness({ issues: [{ status: 'Deferred' }, { status: 'Closed' }] }), 'issues').state, 'ok'); });
console.log(n + ' go-live readiness checks passed');
