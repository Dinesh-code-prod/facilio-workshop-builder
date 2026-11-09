// Wording of every message the Studio sends (work/server/_msgfmt.mjs, _notify.mjs teamsCard, _taskwatch.mjs assignmentNotice) and the shared AI working standard.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { dueWords, dayWords, personOf, projectLine, NEXT } from '../work/server/_msgfmt.mjs'; import { teamsCard, EVENTS } from '../work/server/_notify.mjs'; import { assignmentNotice } from '../work/server/_taskwatch.mjs'; import { WORK_STANDARD, brief, KINDS } from '../work/server/_jobs.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('a due date is said in words with how far away it is', () => { const d = '2026-11-09'; assert.equal(dayWords('2026-11-13'), 'Fri 13 Nov 2026'); assert.equal(dueWords('2026-11-09', d), 'Due today (Mon 9 Nov 2026)'); assert.equal(dueWords('2026-11-10', d), 'Due tomorrow (Tue 10 Nov 2026)'); assert.equal(dueWords('2026-11-13', d), 'Due Fri 13 Nov 2026 (in 4 days)'); assert.equal(dueWords('2026-11-02', d), 'OVERDUE since Mon 2 Nov 2026 (7 days late)'); assert.equal(dueWords('', d), 'No due date'); assert.equal(dueWords('soon', d), 'No due date'); });
t('names and projects read like a person wrote them', () => { assert.equal(personOf('dinesh.r@facilio.com'), 'Dinesh R'); assert.equal(personOf('Sam Khan'), 'Sam Khan'); assert.equal(personOf(''), ''); assert.equal(projectLine({ name: 'Al Moallam Group', customer: 'Al Moallam' }), 'Al Moallam Group'); assert.equal(projectLine({ name: 'Rollout', customer: 'Binghatti' }), 'Rollout · Binghatti'); });
t('every kind of notification has a what-to-do sentence', () => { for (const k of Object.keys(EVENTS)) assert.ok(NEXT[k] && NEXT[k].length > 20, k); });
t('a Teams card says the project, the customer, what to do, the due date and who sent it', () => {
  const rec = { pname: 'Rollout', cust: 'Binghatti', cat: 'TASK', title: 'Task assigned to you', text: 'T-4 Brand new', more: 'Collect the asset list from the customer.', due: '2026-11-13', by: 'Sam K', at: '2026-11-09T08:00:00Z' };
  const c = teamsCard({ type: 'task_assigned', facts: [{ title: 'Due', value: '2026-11-13' }] }, rec, []);
  assert.match(c.text, /\*\*Project:\*\* Rollout · Binghatti/); assert.match(c.text, /\*\*Due Fri 13 Nov 2026 \(in 4 days\)\*\*/); assert.match(c.text, /\*\*What to do:\*\* Open the task/); assert.match(c.text, /Collect the asset list/);
  assert.ok(c.facts.some(f => f.title === 'Customer' && f.value === 'Binghatti') && c.facts.some(f => f.title === 'From' && f.value === 'Sam K') && c.facts.some(f => f.title === 'Due' && /in 4 days/.test(f.value)));
});
t('the assignment DM names the person, the project, the customer, the due date in words and what to do', () => {
  const m = assignmentNotice({}, { n: 7, title: 'Send the asset list', owner: 'kim@facilio.com', status: 'To Do', priority: 'High', due: '2026-11-13', desc: 'The customer owes us the list of assets per site.', stage: 'Design' }, 'sam.k@facilio.com', 'Rollout', { project: 'p1', id: 't1', customer: 'Binghatti', actorName: 'Sam K', today: '2026-11-09' });
  assert.match(m.text, /^\*\*You have been given a task by Sam K\.\*\*/); assert.match(m.text, /\*\*Project:\*\* Rollout · Binghatti/); assert.match(m.text, /\*\*Due Fri 13 Nov 2026 \(in 4 days\)\*\*/); assert.match(m.text, /\*\*What it is:\*\* The customer owes/); assert.match(m.text, /\*\*What to do:\*\*/);
  assert.deepEqual(m.facts.map(f => f.title), ['Why you got this', 'Assigned by', 'Project', 'Customer', 'Stage', 'Status', 'Priority', 'Due']);
});
t('every Claude job carries the working standard, and the AI system prompt holds it too', () => {
  assert.match(WORK_STANDARD, /senior delivery consultant/); const kind = Object.keys(KINDS)[0]; const b = brief({ id: 'j1', kind, params: {}, requestedBy: 'a@b.c' }, { id: 'p', name: 'P' }); assert.equal(b.standard, WORK_STANDARD);
  assert.match(fs.readFileSync('work/server/api.mjs', 'utf8'), /WORKING STANDARD: read every source before you write/);
});
console.log(n + ' message wording checks passed');
