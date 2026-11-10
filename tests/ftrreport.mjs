// FTR report view (src/ftrreport.js): reads Claude's markdown draft into modules, use cases, test cases and results; shows nothing that was not written.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; const R = createRequire(import.meta.url)('../src/ftrreport.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const MD = `Scope reviewed with the customer.

## Work Orders
### Use case: Create a work order
| ID | Test case | Steps | Expected | Result | Evidence |
|----|-----------|-------|----------|--------|----------|
| TC-1 | Create from request | Open request; click Create | A work order is created | Pass | https://x.test/a.png |
| TC-2 | Create without a site | Leave site empty | A message asks for a site | Fail | screenshot wo-2.png |
| TC-3 | Close | Close it | Status is Closed | |  |

## Assets
### Use case: Add an asset
| ID | Test case | Steps | Expected | Result |
|---|---|---|---|---|
| TC-4 | Add | Add asset | Saved | Blocked |
`;
t('modules, use cases and cases are read, the results as written', () => {
  const r = R.parse(MD); assert.deepEqual(r.modules.map(m => m.name), ['Work Orders', 'Assets']); assert.equal(r.modules[0].useCases[0].title, 'Create a work order'); assert.equal(r.modules[0].useCases[0].cases.length, 3);
  assert.deepEqual(r.modules[0].useCases[0].cases.map(c => c.result), ['pass', 'fail', 'notrun']); assert.equal(r.modules[1].useCases[0].cases[0].result, 'blocked'); assert.equal(r.intro, 'Scope reviewed with the customer.');
  assert.deepEqual(r.counts, { total: 4, pass: 1, fail: 1, blocked: 1, notrun: 1 });
});
t('a table with no heading goes under General, and text with no table gives no cases', () => {
  const r = R.parse('| ID | Test case | Result |\n|---|---|---|\n| A1 | Try | Passed |'); assert.equal(r.modules[0].name, 'General'); assert.equal(r.counts.pass, 1); assert.equal(R.parse('just words').counts.total, 0); assert.equal(R.parse('').modules.length, 0);
});
t('the HTML escapes text, links only http addresses, and blocks outside requests', () => {
  const r = R.parse('## M<script>\n### U\n| ID | Test case | Steps | Expected | Result | Evidence |\n|-|-|-|-|-|-|\n| 1 | <b>x</b> | s | e | Pass | javascript:alert(1) |'); const h = R.html(r, { name: 'P&Q' });
  assert.ok(!h.includes('<script>') && !h.includes('<b>x</b>') && !/href="javascript/.test(h)); assert.ok(h.includes("default-src 'none'") && h.includes('P&amp;Q') && h.includes('fr-pass'));
});
console.log(n + ' FTR report checks passed');
