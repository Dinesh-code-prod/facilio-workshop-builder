// Quick facts (src/quickfacts.js): exact answers from the loaded records with no AI; anything that is not a plain look-up returns null.
import assert from 'node:assert/strict';
import fs from 'node:fs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const today = '2026-11-08';
const tasks = [{ id: 'a', n: 1, title: 'Late one', status: 'To Do', owner: 'me@facilio.com', due: '2026-11-01' }, { id: 'b', n: 2, title: 'Mine today', status: 'In Progress', owner: 'me@facilio.com', due: today }, { id: 'c', n: 3, title: 'Finished', status: 'Done', owner: 'me@facilio.com', due: '2026-10-01' }, { id: 'd', n: 4, title: 'Someone else', status: 'To Do', owner: 'kim@facilio.com', due: '2026-11-02' }];
const so = { brd: { status: 'requested', due: '2026-11-20' }, uat: { status: 'notdue' }, golive: { status: 'signed', signer: 'Bayan' } };
const V = { items: { ready: () => true, load: () => { }, list: k => (k === 'task' ? tasks : k === 'raid' ? [{ status: 'Open', impact: 'High' }, { status: 'Open', impact: 'Low' }, { status: 'Closed', impact: 'High' }] : []), get: (k, id) => (k === 'signoff' ? so[id] : null) },
  today: () => today, daysBetween: (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5), fmtDate: d => d,
  planStats: () => ({ n: 4, actual: 30, planned: 35, goLive: '2026-12-26' }), phaseNow: () => ({ cur: 1, info: [{ i: 0, title: 'Kick-Off', start: '2026-10-07', end: '2026-10-14' }, { i: 1, title: 'BRD Sign-Off', start: '2026-10-21', end: '2026-11-16' }, { i: 2, title: 'UAT & Feedback', start: '2026-12-05', end: '2026-12-20' }] }) };
globalThis.window = undefined; const root = { FWB: { S: { user: { email: 'me@facilio.com' } } }, FWBViews: V };
new Function('window', 'globalThis', fs.readFileSync(new URL('../src/quickfacts.js', import.meta.url), 'utf8').replace(/\}\)\(typeof window[^\n]*$/, '})(window);'))(root, root);
const q = m => V.quickFacts(m);
await t('go-live, stage, progress and next step come straight from the plan', () => {
  assert.match(q('when is the go-live date?').text, /26 Dec|2026-12-26/); assert.match(q('what stage are we in').text, /step 2 of 3: BRD Sign-Off/); assert.match(q('are we on track?').text, /30% is done against 35% planned: 5 points behind/); assert.match(q("what's next?").text, /UAT & Feedback/);
});
await t('a named step gives its dates; sign-offs and risks are counted from the records', () => {
  assert.match(q('what is the BRD timeline').text, /BRD Sign-Off: 2026-10-21 to 2026-11-16/); assert.match(q('sign-off status').text, /BRD sign-off: waiting for the customer \(due 2026-11-20\)[\s\S]*Go-live acceptance: signed by Bayan/); assert.match(q('how many open risks').text, /2 open RAID items, 1 of high impact/);
});
await t('overdue and my tasks list only open tasks, mine only for me', () => {
  assert.match(q('which tasks are overdue').text, /2 tasks are overdue[\s\S]*T-1 Late one[\s\S]*T-4 Someone else/); assert.ok(!/Finished/.test(q('which tasks are overdue').text));
  const m = q('what are my tasks').text; assert.match(m, /You have 2 open tasks/); assert.ok(!/Someone else/.test(m));
});
await t('task counts, workload and due soon are answered from the records, with the page button', () => {
  const c = q('pending tasks'); assert.match(c.text, /[0-9]+ open tasks? of [0-9]+/); assert.equal(c.view, 'tasks'); assert.ok(!/Finished/.test(c.text));
  assert.match(q('how many tasks do we have').text, /open task/); assert.match(q('who has the most tasks').text, /Open tasks by person:/);
  assert.match(q('tasks due this week').text, /due in the next 7 days|No open task is due/);
});
await t('work and explanations are not answered here: they go on to the router', () => {
  for (const s of ['update the BRD', 'write a reply to Sara', 'explain the go-live plan', 'why is the plan behind', 'check the BRD against the sessions', 'how do I add a module', '']) assert.equal(q(s), null, s);
  assert.ok(q('go-live date').text.endsWith('no AI used.'));
});
console.log(n + ' quick-fact checks passed');
await t('a question about whether a document was changed is never answered with a date list ("updated" is not "date", "kick-off" is not every Sign-Off)', () => {
  for (const s of ['is the kickoff deck updated', 'is the kick-off deck updated or not', 'has the BRD been updated', 'did you redesign the kick-off deck', 'are the slides reworded']) assert.equal(q(s), null, s);
  assert.match(q('when does the kick-off start').text, /Kick-Off: 2026-10-07 to 2026-10-14/); assert.ok(!/Sign-Off/.test(q('when does the kick-off start').text));
});
await t('"is it done?" is answered from the Claude request behind it, in plain words with the time, and says nothing when there is no such request', () => {
  const ago = m => new Date(Date.now() - m * 6e4).toISOString(); let jobs = [];
  root.FWB.S.project = { id: 'p1' }; V.studioJobs = { K: () => ({ pid: 'p1', jobs }) }; root.FWBKickoffLogic = { jobRows: x => x };
  jobs = [{ id: '1', kind: 'chat', note: 'Update the whole kick-off deck in a nicer way', label: 'Your message to Claude', status: 'done', at: ago(9), claimedAt: ago(8), finishedAt: ago(4), summary: 'I reworded every deck text field. No date was changed.' }];
  let r = q('is the kickoff deck updated'); assert.match(r.text, /^Yes\. Claude finished "Update the whole kick-off deck in a nicer way" 4 minutes ago: I reworded every deck text field/); assert.equal(r.view, 'kickoff'); assert.ok(!/Sign-Off/.test(r.text));
  jobs = [{ id: '2', kind: 'chat', note: 'Update the kick-off deck', status: 'claimed', at: ago(4), claimedAt: ago(3), size: 'small' }];
  r = q('has the kick-off deck been updated yet'); assert.match(r.text, /^Not yet\. Claude is working on "Update the kick-off deck": started 3 minutes ago\. Requests like this usually take about 2 minutes/); 
  jobs = [{ id: '3', kind: 'chat', note: 'Update the kick-off deck', status: 'waiting', at: ago(6) }]; assert.match(q('is the deck done').text, /^Not yet\. "Update the kick-off deck" is still in the queue \(6 minutes\)/);
  jobs = [{ id: '4', kind: 'chat', note: 'Update the kick-off deck', status: 'needs_input', at: ago(6), questions: ['Which slide first?', '- Cover', '- Scope'] }]; assert.match(q('is the deck ready').text, /^Claude is waiting for your answer on "Update the kick-off deck": Which slide first\?/);
  jobs = [{ id: '5', kind: 'chat', note: 'Update the kick-off deck', status: 'failed', at: ago(6), summary: 'The pack could not be read' }]; assert.match(q('did the deck update work').text, /^That did not work: "Update the kick-off deck" could not be completed \(The pack could not be read\)/);
  jobs = [{ id: '6', kind: 'chat', note: 'Write the BRD', status: 'done', at: ago(9), claimedAt: ago(8), finishedAt: ago(4), summary: 'Done.' }]; assert.equal(q('is the kickoff deck updated'), null);   // a request about something else is not the answer
  jobs = []; assert.equal(q('is the kickoff deck updated'), null);
});
