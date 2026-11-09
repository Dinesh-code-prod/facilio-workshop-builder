// The question engine (src/qengine.js): a question about the project's records is read for WHAT, WHICH ones and HOW, and answered exactly. Run: node tests/qengine.mjs
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const Q = createRequire(import.meta.url)('../src/qengine.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const TODAY = '2026-11-09';
// the project from the real chat: six open tasks, none with a priority, one overdue; plus a few of every other kind
const tasks = [
  { id: 'a', n: 1, title: 'Kick-off', status: 'To Do', owner: 'dinesh.r@facilio.com', due: '2026-11-06' }, { id: 'b', n: 2, title: 'Introduction', status: 'To Do', owner: 'dinesh.r@facilio.com', due: '2026-11-10' },
  { id: 'c', n: 3, title: 'Scope confirmation', status: 'To Do', owner: 'sam.k@facilio.com', due: '2026-11-13' }, { id: 'd', n: 4, title: 'Customer mail: Al Moallam requirement workshop MOM', status: 'To Do', owner: 'dinesh.r@facilio.com' },
  { id: 'e', n: 5, title: 'Old finished thing', status: 'Done', owner: 'dinesh.r@facilio.com', priority: 'High' }, { id: 'f', n: 6, title: 'Answer Claude: which transcript', status: 'To Do', owner: 'dinesh.r@facilio.com' }, { id: 'g', n: 7, title: 'Answer Claude: which mockup card', status: 'To Do', owner: 'dinesh.r@facilio.com' }];
const withPrio = tasks.map(x => x.n === 3 ? Object.assign({}, x, { priority: 'High' }) : x.n === 4 ? Object.assign({}, x, { priority: 'Medium' }) : x.n === 6 ? Object.assign({}, x, { status: 'Blocked', priority: 'High' }) : x);
const raid = [{ type: 'R', title: 'Vendor delay', impact: 'High', status: 'Open', owner: 'sam.k@facilio.com' }, { type: 'I', title: 'Login fails on mobile', impact: 'Medium', status: 'Open' }, { type: 'R', title: 'Old risk', impact: 'Low', status: 'Closed' }, { type: 'A', title: 'Customer supplies data', impact: 'Medium', status: 'Open' }];
const cr = [{ n: 1, title: 'Add second approval', status: 'Proposed' }, { n: 2, title: 'Drop kiosk', status: 'Rejected' }, { n: 3, title: 'Extra report', status: 'Under review' }];
const utc = [{ title: 'Create work order', result: 'Passed' }, { title: 'Close work order', result: 'Failed' }, { title: 'Approve request', result: 'Pending' }];
const requirement = [{ id: 'WO-1', title: 'Approval before work order close', status: 'Confirmed', modules: ['workorder'] }, { id: 'WO-2', title: 'Vendor SLA reminder', status: 'Draft', modules: ['workorder'], priority: 'High' }, { id: 'AS-1', title: 'Asset QR labels', status: 'Draft', modules: ['asset'] }, { id: 'AS-2', title: 'Dropped idea', status: 'Rejected', modules: ['asset'] }];
const question = [{ id: 'q1', text: 'Who approves above 500?', status: 'open', area: 'workorder', owner: 'sam.k@facilio.com' }, { id: 'q2', text: 'Which SLA applies?', status: 'closed', area: 'sla' }, { id: 'q3', text: 'Is the kiosk in scope?', status: 'open', area: 'asset' }];
const ctx = tk => ({ today: TODAY, me: 'dinesh.r@facilio.com', members: [{ name: 'Dinesh R', email: 'dinesh.r@facilio.com' }, { name: 'Sam K', email: 'sam.k@facilio.com' }], fmtDate: d => d, rowsFor: k => ({ task: tk, raid, cr, utc, requirement, question, decision: [], action: [], tkt: [] })[k] || [] });
const ask = (q, tk, last) => Q.answer(q, ctx(tk || tasks), last);
t('"what are the pending tasks" lists the six open tasks', () => { const r = ask('What are the pending tasks'); assert.match(r.text, /I read this as: open tasks\./); assert.match(r.text, /6 open tasks:/); assert.ok(!/Old finished thing/.test(r.text)); });
t('"what are the tasks on high priority" no longer repeats the list: it says none, and why', () => { const r = ask('What are the tasks on high priority'); assert.match(r.text, /I read this as: open tasks with high priority\./); assert.match(r.text, /None: no open tasks with high priority\./); assert.match(r.text, /6 open tasks in all, and none of them has a priority set/); assert.ok(!/T-1 Kick-off/.test(r.text)); });
t('with priorities set, "high priority tasks" lists exactly those', () => { const r = ask('what are the high priority tasks', withPrio); assert.match(r.text, /2 open tasks with high priority:/); assert.match(r.text, /Scope confirmation/); assert.match(r.text, /Answer Claude: which transcript/); assert.ok(!/Kick-off/.test(r.text) && !/Old finished/.test(r.text)); });
t('"high priority" also reads "urgent", "critical" and "top"; "medium" and "low" read their own', () => { for (const w of ['urgent', 'critical', 'top priority']) assert.equal(Q.parse('show ' + w + ' tasks', ctx(withPrio)).f.prio, 'high'); assert.equal(Q.parse('medium priority tasks', ctx(withPrio)).f.prio, 'medium'); assert.equal(Q.parse('low priority tasks', ctx(withPrio)).f.prio, 'low'); assert.equal(Q.parse('tasks with no priority', ctx(withPrio)).f.prio, 'none'); });
t('overdue, mine and due dates', () => {
  assert.match(ask('which tasks are overdue').text, /1 open task that is overdue:\n- T-1 Kick-off/); assert.match(ask('my overdue tasks').text, /assigned to you that are overdue/); assert.match(ask('tasks due this week').text, /due in the next 7 days:/);
  assert.match(ask('tasks assigned to sam').text, /assigned to Sam K:\n- T-3 Scope confirmation/); assert.match(ask("sam's tasks").text, /Scope confirmation/); assert.match(ask('unassigned tasks').text, /None: no open tasks with no owner/);
});
t('status words: done, blocked', () => { assert.match(ask('which tasks are done').text, /1 finished task:/); assert.match(ask('blocked tasks', withPrio).text, /blocked or waiting task:\n- T-6/); });
t('counts and "the next one"', () => { assert.match(ask('how many tasks are open').text, /6 open tasks\./); assert.match(ask('how many tasks are done').text, /1 finished task\./); assert.match(ask('what is the next task due').text, /The next one due:\n- T-1 Kick-off/); });
t('risks, issues and assumptions are told apart and use impact', () => { assert.match(ask('what are the high impact risks').text, /1 open risk with high impact:\n- Vendor delay/); assert.match(ask('open issues').text, /Login fails on mobile/); assert.match(ask('any assumptions').text, /Customer supplies data/); assert.match(ask('show closed risks').text, /Old risk/); });
t('change requests and test cases', () => { assert.match(ask('open change requests').text, /2 open change requests:/); assert.match(ask('which test cases failed').text, /failed test case:\n- Close work order/); assert.match(ask('how many tests are pending').text, /1 open test case\./); });
t('requirements and open questions (kept in the project document) are read the same way', () => {
  assert.match(ask('which requirements are confirmed').text, /1 confirmed requirement:\n- WO-1 Approval before work order close/); assert.match(ask('which requirements are still draft').text, /2 draft requirements:/); assert.ok(!/Dropped idea|Approval before/.test(ask('which requirements are still draft').text)); assert.equal(ask('draft requirements'), null);
  assert.match(ask('show the high priority requirements').text, /1 open requirement with high priority:\n- WO-2/); assert.match(ask('how many requirements are open').text, /3 open requirements\./); assert.match(ask('requirements for asset').text, /mentioning "asset"/);
  assert.match(ask('what are the open questions').text, /2 open questions:/); assert.match(ask('unanswered questions for sam').text, /1 open question assigned to Sam K:\n- Who approves above 500\?/s);
  assert.equal(ask('draft the requirements for the work order module'), null);   // a request to write is still left for the AI
});
t('a word that names something specific filters the title; an unknown word with no match goes to the AI', () => { assert.match(ask('tasks about mockup').text, /mentioning "mockup":\n- T-7/); assert.equal(ask('tasks about zebra'), null); });
t('follow-ups reuse the last question', () => {
  const first = ask('what are the pending tasks'); const f2 = ask('only mine', tasks, first.intent); assert.match(f2.text, /open tasks assigned to you/);
  const f3 = ask('which of those are overdue', tasks, first.intent); assert.match(f3.text, /open tasks that are overdue/); assert.equal(f3.intent.f.due, 'overdue');
  const f4 = ask('and the high priority ones', withPrio, ask('my tasks', withPrio).intent); assert.equal(f4.intent.f.owner.me, true); assert.equal(f4.intent.f.prio, 'high');
});
t('things that are not a records question are left to the AI: changes, drafts, explanations, who-has-most, many unknown words', () => {
  for (const q of ['update the project plan', 'draft a reply to Sara about the tasks', 'explain the risks to me', 'who has the most tasks', 'why is the BRD late', 'how do I add a task', 'write the summary of the decisions', 'tasks regarding the elevator escalation matrix vendor contract renewal'])
    assert.equal(Q.answer(q, ctx(tasks), null), null, q);
});
t('a very short message with no subject and no filter is not treated as a follow-up', () => { assert.equal(ask('ok thanks', tasks, { kind: 'task', f: {} }), null); assert.equal(ask('hello', tasks, { kind: 'task', f: {} }), null); });
console.log(n + ' question engine checks passed');
