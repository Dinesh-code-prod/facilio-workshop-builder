// A customer's tracker read as tasks (src/trackerlogic.js): header row found under a title, columns matched by name, dates and statuses in the usual forms, nothing in a row lost.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const T = createRequire(import.meta.url)('../src/trackerlogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const actions = [['ACME Phase 1 - Action log', '', '', '', ''], ['', '', '', '', ''], ['S.No', 'Action Item', 'Responsible', 'Target Date', 'Status', 'Remarks'],
  ['1', 'Share asset list with categories', 'Ravi', '05/12/2026', 'Open', 'Needed before data load'], ['2', 'Confirm SLA hours', 'Asha K', '2026-12-08', 'WIP', ''],
  ['3', 'Send logo', 'Ravi', '1-Dec-2026', 'Closed', ''], ['', '', '', '', '', ''], ['4', 'Approve PO workflow', 'Client', 'Dec 15, 2026', 'Pending with customer', 'Two approvers']];
const uat = [['Test Case ID', 'Module', 'Issue Description', 'Severity', 'Assigned To', 'ETA', 'Current Status', 'Build'],
  ['TC-01', 'Work Order', 'Close button missing on mobile', 'Sev 1', 'Jamal', '46000', 'Failed', 'v1.2'], ['TC-02', 'Assets', 'Barcode not scanning', 'Major', 'nilavezhil@facilio.com', '', 'Retest', 'v1.2'],
  ['TC-03', 'Assets', 'Typo on label', 'Cosmetic', '', '', 'Fixed', '']];

t('the header row is found under a title and blank rows', () => { assert.equal(T.findHeaderRow(actions), 2); assert.equal(T.findHeaderRow(uat), 0); assert.equal(T.findHeaderRow([['a', 'b'], ['1', '2']]), -1, 'no task column: not a tracker'); });
t('columns are matched by their names, whatever the tracker calls them', () => {
  assert.deepEqual(T.suggestMap(actions[2]), { title: 1, desc: 5, owner: 2, due: 3, status: 4 });
  assert.deepEqual(T.suggestMap(uat[0]), { title: 2, owner: 4, due: 5, status: 6, priority: 3, module: 1 });
  assert.deepEqual(T.suggestMap(['Description', 'Owner']), { title: 0, owner: 1 }, 'a lone Description column is the task');
});
t('dates in the usual forms', () => {
  assert.equal(T.toDay('05/12/2026'), '2026-12-05', 'day first'); assert.equal(T.toDay('12/25/2026'), '2026-12-25', 'month first when the day cannot be a month');
  assert.equal(T.toDay('1-Dec-2026'), '2026-12-01'); assert.equal(T.toDay('Dec 15, 2026'), '2026-12-15'); assert.equal(T.toDay('46000'), '2025-12-09', 'an Excel day number (45658 is 1 Jan 2025)');
  assert.equal(T.toDay('next week'), ''); assert.equal(T.toDay('2026-13-01'), '');
});
t('statuses and priorities in the usual words', () => {
  assert.equal(T.statusOf('WIP'), 'In Progress'); assert.equal(T.statusOf('Closed'), 'Done'); assert.equal(T.statusOf('Pending with customer'), 'Awaiting Customer'); assert.equal(T.statusOf('Failed'), 'To Do'); assert.equal(T.statusOf('Retest'), 'In Review'); assert.equal(T.statusOf('N/A'), 'Cancelled');
  assert.equal(T.prioOf('Sev 1'), 'Critical'); assert.equal(T.prioOf('Major'), 'High'); assert.equal(T.prioOf('Cosmetic'), 'Low'); assert.equal(T.prioOf('whatever'), '');
});
t('rows become tasks: closed rows counted not imported, blank rows skipped, other columns kept in the details', () => {
  const a = T.toTasks(actions, 2, T.suggestMap(actions[2])); assert.equal(a.closed, 1); assert.deepEqual(a.tasks.map(x => x.title), ['Share asset list with categories', 'Confirm SLA hours', 'Approve PO workflow']);
  assert.deepEqual(a.tasks[0], { title: 'Share asset list with categories', desc: 'Needed before data load\nS.No: 1', owner: 'Ravi', due: '2026-12-05', status: 'To Do', priority: '', module: '', row: 4 });
  const u = T.toTasks(uat, 0, T.suggestMap(uat[0])); assert.equal(u.tasks.length, 2); assert.equal(u.tasks[0].priority, 'Critical'); assert.equal(u.tasks[0].module, 'Work Order'); assert.match(u.tasks[0].desc, /Test Case ID: TC-01\nBuild: v1\.2/);
  assert.equal(T.toTasks(uat, 0, T.suggestMap(uat[0]), { keepClosed: true }).tasks.length, 3);
});
console.log(n + ' tracker checks passed');
