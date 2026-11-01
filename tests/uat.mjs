// UAT test case rules (src/uatlogic.js): the column mapping for an Excel/CSV tracker, the status words, duplicates and the summary per module.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const U = require('../src/uatlogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const headers = ['S.No', 'Module', 'Scenario', 'Test Case Description', 'Pre-conditions', 'Test Steps', 'Expected Result', 'Actual Result', 'Status', 'Tested By', 'Remarks', 'Priority'];
t('a tracker\'s headers are mapped to the right fields, each column once, unknown columns left unmapped', () => {
  const m = U.suggestMap(headers); assert.equal(m.module, 1); assert.equal(m.scenario, 2); assert.equal(m.title, 3); assert.equal(m.pre, 4); assert.equal(m.steps, 5); assert.equal(m.expected, 6); assert.equal(m.actual, 7); assert.equal(m.status, 8); assert.equal(m.tester, 9); assert.equal(m.notes, 10); assert.equal(m.tcid, undefined);   // a serial number is not a test case ID
  assert.ok(!Object.values(m).includes(11), 'Priority is not a test case field'); assert.equal(new Set(Object.values(m)).size, Object.values(m).length); });
t('the header row is found below a title block, and not in a plain data row', () => {
  const rows = [['UAT tracker for Acme'], [], ['Prepared by', 'Dinesh'], headers, ['1', 'Work Order', 'Create', 'Create a WO', '', '', '', '', 'Pass']]; assert.equal(U.findHeaderRow(rows), 3); assert.equal(U.findHeaderRow([['a', 'b'], ['1', '2', '3']]), -1); });
t('status words from trackers become the canonical statuses; unknown words are not guessed', () => {
  assert.equal(U.normStatus('PASS'), 'Passed'); assert.equal(U.normStatus('Failed'), 'Failed'); assert.equal(U.normStatus('blocked by data'), 'Blocked'); assert.equal(U.normStatus(''), 'Not Started'); assert.equal(U.normStatus('Pending'), 'Not Started'); assert.equal(U.normStatus('Signed off'), 'Approved'); assert.equal(U.normStatus('Retest'), 'Retesting'); assert.equal(U.normStatus('maybe later'), null); assert.ok(U.STATUS.includes('Ready for Testing')); });
const resolve = txt => ({ 'work order': 'workorder', 'asset': 'asset' })[String(txt).trim().toLowerCase()] || '';
const rows = [['1', 'Work Order', 'Create', 'Create a work order', '', 'Open WO; Save', 'WO is created', '', 'Pass', 'Priya', '', 'High'], ['2', 'Work Order', 'Create', 'Create a work order', '', '', '', '', 'Fail', '', '', ''], ['3', 'Asset', 'Add', 'Add an asset', '', '', '', '', 'Maybe', '', 'needs data', 'Low'], ['', '', '', '', '', '', '', '', '', '', '', ''], ['4', 'Space', '', '', '', '', '', '', '', '', '', '']];
t('rows are read with a report: duplicates inside the file, unknown status, unknown module, empty rows and rows with no text; unmapped columns are kept, not dropped', () => {
  const map = U.suggestMap(headers); const r = U.readRows(rows, headers, map, [], resolve);
  assert.equal(r.ok.length, 2); assert.equal(r.dups.length, 1); assert.equal(r.dups[0].row, 2); assert.equal(r.errors.length, 1); assert.equal(r.errors[0].row, 5);
  assert.equal(r.ok[0].status, 'Passed'); assert.equal(r.ok[0].mod, 'workorder'); assert.equal(r.ok[1].status, 'Not Started'); assert.ok(r.warnings.some(w => /Maybe/.test(w.msg))); assert.equal(r.ok[0].extra.Priority, 'High'); assert.equal(r.ok[0].srcRow, 1); });
t('records that are already saved are reported as duplicates, by test case ID or by module and title', () => {
  const map = U.suggestMap(headers); const r = U.readRows(rows.slice(0, 1), headers, map, [{ tcid: '', module: 'Work Order', title: 'create a work order' }], resolve); assert.equal(r.ok.length, 0); assert.equal(r.dups.length, 1);
  const r2 = U.readRows([['UAT-WO-001', 'Work Order', '', 'Anything']], ['Test case ID', 'Module', 'Scenario', 'Test case'], U.suggestMap(['Test case ID', 'Module', 'Scenario', 'Test case']), [{ tcid: 'uat-wo-001', title: 'other' }], resolve); assert.equal(r2.dups.length, 1); });
t('the next test case ID continues the module\'s own numbering', () => {
  assert.equal(U.nextId('Work Order', []), 'UAT-WORK-001'); assert.equal(U.nextId('Work Order', [{ tcid: 'UAT-WORK-001' }, { tcid: 'UAT-WORK-007' }, { tcid: 'UAT-ASSE-009' }]), 'UAT-WORK-008'); });
t('the summary counts saved test cases only: passed includes Approved, not run includes Ready for Testing, and nothing is invented for an empty list', () => {
  const cases = [{ mod: 'workorder', status: 'Passed' }, { mod: 'workorder', status: 'Approved' }, { mod: 'workorder', status: 'Failed' }, { mod: 'workorder', status: 'Blocked' }, { mod: 'asset', status: 'Ready for Testing' }, { mod: 'asset', status: 'Retesting' }, { mod: 'asset', status: 'Not Started' }];
  const s = U.summarize(cases, ['workorder', 'asset', 'space']); assert.equal(s.total, 7); assert.equal(s.passed, 2); assert.equal(s.failed, 1); assert.equal(s.blocked, 1); assert.equal(s.notRun, 2); assert.equal(s.passRate, 29);
  assert.deepEqual(s.perModule.workorder, { total: 4, passed: 2, failed: 1, blocked: 1, notRun: 0, open: 0 }); assert.deepEqual(s.perModule.asset, { total: 3, passed: 0, failed: 0, blocked: 0, notRun: 2, open: 1 }); assert.equal(s.perModule.space.total, 0);
  const e = U.summarize([], ['workorder']); assert.equal(e.total, 0); assert.equal(e.passRate, null); });
console.log(`\n${n} UAT checks passed`);
