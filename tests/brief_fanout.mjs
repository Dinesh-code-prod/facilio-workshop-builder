// Scenario: two people work on one project and the BRD milestone is due tomorrow. Only Sam's Claude task runs. Kim never opens the Studio or Claude, and has no task of her own,
// yet she must get the same Teams message about the BRD (work/server/_taskwatch.mjs milestonesDue + digestMessage; the triggers in work/server/api.mjs and _jobsapi.mjs).
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { milestonesDue, pendingFor, digestMessage } from '../work/server/_taskwatch.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const today = '2026-11-09'; const project = { id: 'p1', name: 'Rollout', customer: 'Binghatti' };
const plan = [{ id: 'r1', title: 'Kick-Off', start: '2026-10-01', end: '2026-10-01', status: 'Done', pct: 100, owner: 'Both' }, { id: 'r2', title: 'BRD Sign-Off', start: '2026-11-10', end: '2026-11-10', status: 'In progress', pct: 60, owner: 'Customer' }, { id: 'r3', title: 'Implementation & Testing', start: '2026-11-11', end: '2026-11-12', status: 'Not started', pct: 0, owner: 'Facilio' }, { id: 'r4', title: 'Design', isPhase: true, start: '', end: '' }, { id: 'r5', title: 'Go-Live', start: '2027-01-05', end: '2027-01-05', status: 'Not started', owner: 'Both' }];
const tasks = [{ id: 't1', data: { n: 1, title: 'Send the asset list', owner: 'sam@facilio.com', status: 'To Do', due: '2026-11-10', priority: 'High' } }];
const rows = [{ id: 'p1', name: 'Rollout', tasks }];
const ms = milestonesDue(project, plan, today);
t('the milestones due are the plan rows that are not done, not phase headers, ending within three days or already late', () => { assert.deepEqual(ms.map(m => m.title), ['BRD Sign-Off', 'Implementation & Testing']); assert.equal(ms[0].due, '2026-11-10'); assert.equal(ms[0].pct, 60); assert.equal(milestonesDue(project, [{ title: 'Late', end: '2026-11-01', status: 'In progress' }], today)[0].due, '2026-11-01'); assert.deepEqual(milestonesDue(project, [{ title: 'Done', end: '2026-11-09', status: 'Done' }, { title: 'Far', end: '2026-12-30' }], today), []); });
const forSam = digestMessage(pendingFor('sam@facilio.com', rows, today), today, { name: 'Sam', milestones: ms }), forKim = digestMessage(pendingFor('kim@facilio.com', rows, today), today, { name: 'Kim', milestones: ms });
t('Sam, who has a task, gets the task and the milestones', () => { assert.match(forSam.title, /^TASKS · Rollout · 1 open/); assert.match(forSam.title, /2 milestones due/); assert.match(forSam.text, /PROJECT MILESTONES DUE \(2\)/); assert.match(forSam.text, /T-1 · Send the asset list/); });
t('Kim, who has no task and never opened the Studio, still gets the BRD message with its due date in words and its owner', () => {
  assert.ok(forKim, 'a message is made for her'); assert.match(forKim.title, /^MILESTONES · Rollout · 2 due/); assert.match(forKim.text, /^\*\*Hi Kim, here is what is coming up in Rollout\.\*\*/); assert.match(forKim.text, /\*\*BRD Sign-Off\*\*\nDue tomorrow \(Tue 10 Nov 2026\) · Owner: Customer · 60% done/);
  assert.ok(forKim.facts.some(f => f.title === 'Milestones due' && f.value === '2') && forKim.actions[0].url.endsWith('#/p/p1/tasks'));
});
t('with no task and no milestone due, nobody is messaged', () => assert.equal(digestMessage(pendingFor('kim@facilio.com', rows, today), today, { milestones: [] }), null));
t('the morning brief starts from the Studio sweep and from a running Claude task, once a day, in a morning window, and the digest tool reads the plan', () => {
  const api = fs.readFileSync('work/server/api.mjs', 'utf8'), jobs = fs.readFileSync('work/server/_jobsapi.mjs', 'utf8');
  assert.match(api, /async function morningBriefs\(s, ps, today\)/); assert.match(api, /await morningBriefs\(s, ps, today\);/); assert.match(api, /async function briefsFromClaude\(s\)[^]*h < 4 \|\| h >= 18[^]*dbru/); assert.match(api, /installJobs\(\{ briefs: briefsFromClaude,/);
  assert.match(jobs, /if \(d\.briefs\) \{ try \{ await Promise\.race\(\[d\.briefs\(s\)/); assert.match(api, /docRead\(p\.id, 'plan_struct'\)[^]*milestonesDue\(p,/); assert.match(api, /milestones: ms \}\)/);
});
t('Otto is told how to answer in Teams, and the digest tool text says everyone is messaged', () => {
  assert.match(fs.readFileSync('work/server/api.mjs', 'utf8'), /HOW OTTO ANSWERS: lead with the answer in the first sentence/); const w = JSON.parse(fs.readFileSync('work/work.json', 'utf8')).mcp.tools; assert.match(w.find(x => x.name === 'send_task_digest').description, /EVERY team member/); assert.match(w.find(x => x.name === 'my_tasks').description, /due date in words/);
});
console.log(n + ' brief fan-out checks passed');
