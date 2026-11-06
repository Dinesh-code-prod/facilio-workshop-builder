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
t('a UAT issue is a task with a uat part, or an Issue / Blocker linked to a test case; its board column comes from the uat status, else from the task status', () => {
  assert.ok(U.isUatIssue({ uat: { status: 'New' } })); assert.ok(U.isUatIssue({ type: 'Issue / Blocker', links: [{ kind: 'utc', id: 'x' }] })); assert.ok(!U.isUatIssue({ type: 'Issue / Blocker', links: [] })); assert.ok(!U.isUatIssue({ type: 'UAT Task' }));
  assert.equal(U.issueStatus({ uat: { status: 'Retesting' }, status: 'In Review' }), 'Retesting'); assert.equal(U.issueStatus({ status: 'Done' }), 'Closed'); assert.equal(U.issueStatus({ status: 'In Progress' }), 'In Progress'); assert.equal(U.issueStatus({ uat: { status: 'bogus' }, status: 'To Do' }), 'Open');
  U.ISSUE_ST.forEach(s => assert.ok(U.TASK_OF[s], s)); assert.equal(U.TASK_OF.Closed, 'Done'); assert.equal(U.TASK_OF.Deferred, 'Awaiting Internal Input'); });
t('issue filters narrow by module, priority, owner and words (title, description or T-number)', () => {
  const l = [{ n: 1, title: 'Cannot save asset', module: 'Assets', priority: 'High', owner: 'a@x.com' }, { n: 2, title: 'Wrong label', desc: 'on the space form', module: 'Spaces', priority: 'Low', owner: '' }];
  assert.equal(U.issueFilter(l, { mod: 'Assets' }).length, 1); assert.equal(U.issueFilter(l, { pri: 'Low' })[0].n, 2); assert.equal(U.issueFilter(l, { q: 'space form' })[0].n, 2); assert.equal(U.issueFilter(l, { q: 't-1' })[0].n, 1); assert.equal(U.issueFilter(l, { own: 'a@x.com' }).length, 1); assert.equal(U.issueFilter(l, {}).length, 2); });
t('chart data is counted from saved records, empty statuses are left out, and nothing is drawn for no data', () => {
  const cs = [{ mod: 'asset', status: 'Passed' }, { mod: 'asset', status: 'Failed' }, { mod: 'space', status: 'Not Started' }]; const d = U.chartData('status', cs, [], x => x);
  assert.deepEqual(d.rows.map(r => r.label + ':' + r.value), ['Not Started:1', 'Passed:1', 'Failed:1']); const m = U.chartData('module', cs, [], x => x.toUpperCase()); assert.equal(m.rows[0].label, 'ASSET'); assert.equal(m.rows[0].value, 2); assert.equal(m.rows[0].parts.find(p => p[0] === 'Failed')[1], 1);
  const i = U.chartData('issues', [], [{ uat: { status: 'Fixed' } }, { status: 'Done' }, { status: 'To Do' }], x => x); assert.deepEqual(i.rows.map(r => r.label + ':' + r.value), ['Open:1', 'Fixed:1', 'Closed:1']); assert.equal(U.chartData('status', [], [], x => x).rows.length, 0); });
t('test cases start from the solution: one per requirement, changed transition, connected app and flow across modules, once only', () => {
  const data = { modules: [{ name: 'workorder', label: 'Work Order', requirements: [{ id: 'WO-001', title: 'Weekly report', objective: 'A report goes out every week.', rules: 'Sent on Monday', approvals: '', exceptions: '' }], flows: [{ id: 'f1', name: 'WO flow', transitions: [{ id: 't1', name: 'Approve', from: 'Open', to: 'Approved', actors: ['Manager'] }, { id: 't2', name: 'Close', from: 'Approved', to: 'Closed', actors: [] }] }] }, { name: 'asset', label: 'Asset', requirements: [], flows: [] }],
    crosslinks: [{ from: 'Service Request', fromName: 'servicerequest', to: 'Work Order', name: 'Create the work order', condition: 'when approved' }], apps: [{ id: 'dp_1', name: 'Multi-technician view', module: 'Work Order', moduleName: 'workorder', trigger: 'button', triggerLabel: 'Assign', purpose: 'Assign several technicians', shows: 'a calendar' }] };
  const r = U.fromSolution(data, []); assert.equal(r.drafts.length, 5); assert.equal(r.skipped, 0);
  assert.deepEqual(r.drafts.map(d => d.src.key), ['req:WO-001', 'tr:f1:t1', 'tr:f1:t2', 'app:dp_1', 'link:Service Request>Work Order:Create the work order']);
  assert.deepEqual(r.drafts.slice(0, 3).map(d => d.tcid), ['UAT-WORK-001', 'UAT-WORK-002', 'UAT-WORK-003'], 'ids continue in order'); assert.ok(r.drafts.every(d => d.status === 'Not Started' && d.actual === '' && d.tester === '' && d.date === ''), 'nothing is marked run');
  assert.equal(r.drafts[0].req, 'WO-001'); assert.ok(r.drafts[0].steps.includes('1. Sign in') && r.drafts[0].steps.includes('Check the rule: Sent on Monday')); assert.equal(r.drafts[1].expected, 'The record moves to the state "Approved".'); assert.ok(r.drafts[1].steps.includes('As Manager, perform "Approve"'), 'the actor is named'); assert.ok(r.drafts[2].steps.includes('Perform "Close"'));
  assert.ok(r.drafts[3].steps.includes('Use the Assign button') && r.drafts[3].steps.includes('shows: a calendar')); assert.equal(r.drafts[4].mod, 'servicerequest');
  const again = U.fromSolution(data, r.drafts.map(d => ({ tcid: d.tcid, module: d.mod, title: d.title, src: d.src }))); assert.equal(again.drafts.length, 0, 'a second press adds nothing'); assert.equal(again.skipped, 5);
  const typed = U.fromSolution(data, [{ tcid: 'X-1', module: 'workorder', title: 'Requirement WO-001: Weekly report' }]); assert.equal(typed.drafts.length, 4, 'a test case the person already wrote with the same title is left alone'); assert.equal(typed.skipped, 1);
  assert.deepEqual(U.fromSolution({ modules: [], crosslinks: [], apps: [] }, []), { drafts: [], skipped: 0 }); assert.deepEqual(U.fromSolution({}, null), { drafts: [], skipped: 0 });
});
t('coverage: a confirmed requirement is covered when a test case names its ID, by hand or by the Start from the solution button', () => {
  const mods = [{ name: 'workorder', label: 'Work Order', requirements: [{ id: 'WO-001', title: 'Weekly report' }, { id: 'WO-002', title: 'Approval' }, { id: 'WO-003', title: 'Costs' }] }, { name: 'asset', label: 'Asset', requirements: [{ id: 'AS-001', title: 'Tags' }] }, { name: 'site', label: 'Site', requirements: [] }];
  const cs = [{ tcid: 'A', req: 'wo-001' }, { tcid: 'B', req: 'WO-002, AS-001' }, { tcid: 'C', src: { key: 'req:WO-003' } }, { tcid: 'D', req: 'XX-9' }, null];
  const c = U.coverage(mods, cs); assert.equal(c.total, 4); assert.equal(c.covered, 4); assert.deepEqual(c.rows.map(r => r.label + ':' + r.covered + '/' + r.total), ['Work Order:3/3', 'Asset:1/1'], 'a module with no requirement is left out');
  const part = U.coverage(mods, [{ req: 'WO-001' }]); assert.equal(part.covered, 1); assert.deepEqual(part.rows[0].missing.map(x => x.id), ['WO-002', 'WO-003']); assert.deepEqual(part.rows[1].missing, [{ id: 'AS-001', title: 'Tags' }]);
  assert.deepEqual(U.coverage(mods, []).covered, 0); assert.deepEqual(U.coverage(null, null), { rows: [], total: 0, covered: 0 });
});
t('walkthroughs: one per scenario (or per title when there is no scenario), a brief for Comet, and only Comet links are shown inside Studio', () => {
  const cs = [{ tcid: 'A-1', mod: 'workorder', scenario: 'Raise a work order', title: 'Create it', pre: 'A technician exists', steps: '1. Open Work Orders\n2. Click New', expected: 'A work order is created' }, { tcid: 'A-2', mod: 'workorder', scenario: ' raise  a work order ', title: 'Edit it', steps: '1. Open it', expected: 'It saves' }, { tcid: 'B-1', mod: 'asset', title: 'Link an asset', steps: '', expected: '' }, { title: '', scenario: '' }, null];
  const w = U.walkthroughs(cs, m => (m === 'workorder' ? 'Work Order' : m)); assert.equal(w.length, 2, 'the same scenario, spaced or capitalised differently, is one'); assert.deepEqual(w.map(x => x.key), ['raise a work order', 'link an asset']); assert.equal(w[0].count, 2); assert.equal(w[1].count, 1);
  assert.ok(w[0].brief.startsWith('# Walkthrough brief: Raise a work order') && w[0].brief.includes('fictional sample data only') && w[0].brief.includes('Scenario: Raise a work order (Work Order)') && w[0].brief.includes('Test case A-1: Create it') && w[0].brief.includes('Before you start: A technician exists') && w[0].brief.includes('Expected: A work order is created') && w[0].brief.includes('Test case A-2: Edit it'));
  assert.ok(!w[1].brief.includes('Steps:') && !w[1].brief.includes('Expected:'), 'nothing is invented for a case with no steps'); assert.ok(w[0].brief.length <= 6000); assert.deepEqual(U.walkthroughs(null), []);
  assert.equal(U.walkFramable('https://comet.facilio.work/#/v/abc'), true); assert.equal(U.walkFramable('https://meteor.facilio.work/x'), false); assert.equal(U.walkFramable('http://comet.facilio.work/x'), false); assert.equal(U.walkFramable('https://comet.facilio.work.evil.com/'), false); assert.equal(U.walkFramable('javascript:alert(1)'), false); assert.equal(U.walkFramable(''), false);
});
t('statusBoard: per module counts, open issues and walkthrough coverage', () => {
  const mods = [{ name: 'wo', label: 'Work Order' }, { name: 'as', label: 'Asset' }]; const cs = [{ mod: 'wo', status: 'Passed', scenario: 'Raise' }, { mod: 'wo', status: 'Failed', scenario: 'Raise' }, { mod: 'wo', status: 'Not Started', title: 'Close' }, { mod: 'wo', status: 'Blocked', title: 'Close' }];
  const b = U.statusBoard(mods, cs, [{ module: 'Work Order', status: 'Open' }, { module: 'wo', status: 'Closed' }, { module: 'Asset', status: 'New' }], { raise: 'https://x' });
  assert.deepEqual(b.rows[0], { name: 'wo', label: 'Work Order', cases: 4, run: 3, passed: 1, failed: 1, blocked: 1, openIssues: 1, scenarios: 2, videos: 1 }); assert.equal(b.rows[1].openIssues, 1); assert.equal(b.totals.cases, 4);
  assert.equal(U.statusBoard(null, null, null, null).totals.cases, 0);
});
t('recording to test case: a prompt for Claude (also for a silent recording) and numbered steps back into one draft case, once', () => {
  const p = U.videoPrompt('Raise WO', ['00:01 open the menu'], ['Menu']); assert.ok(p.includes('00:01 open the menu') && p.includes('1. Menu') && p.includes('Expected:'));
  assert.ok(U.videoPrompt('Silent', [], []).includes('no speech') && !U.videoPrompt('Silent', [], []).includes('Captions'));
  const r = U.fromSteps({ text: '1. Open Work Orders\n2) Press New\n- Save\nExpected: the order is listed', mod: 'wo', label: 'Work Order', title: 'Raise WO' }, []);
  assert.equal(r.steps, '1. Open Work Orders\n2. Press New\n3. Save'); assert.equal(r.expected, 'the order is listed'); assert.equal(r.status, 'Not Started'); assert.equal(r.src.from, 'recording');
  assert.equal(U.fromSteps({ text: '1. a', mod: 'wo', title: 'raise wo' }, [{ mod: 'wo', title: 'Raise WO' }]), null); assert.equal(U.fromSteps({ text: '', mod: 'wo', title: 'x' }, []), null); assert.equal(U.fromSteps(null, null), null);
});
console.log(`\n${n} UAT checks passed`);
