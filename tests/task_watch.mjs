// Task reminders (roadmap E12): the pure rules in work/server/_taskwatch.mjs, then the connector tools my_tasks and send_task_digest and the assignment DM,
// run through the real handler on a stand-in platform with a fake Teams. Nothing here talks to real Teams: a real DM is NOT checked by this file.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { pendingFor, digestMessage, digestKey, assignKey, assignGate, assignmentNotice, dueOf } from '../work/server/_taskwatch.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; { const m = assignmentNotice({ owner: '' }, { owner: 'kim@facilio.com', title: 'Send data', n: 12, status: 'To Do' }, 'lead@facilio.com', 'Alpha', { project: 'p1', id: 't_a' });
  assert.deepEqual(m.done, { title: 'Done: T-12', fn: 'api', data: { tool: 'task_reply', project: 'p1', taskId: 't_a', status: 'Done', text: 'Marked done by the owner from the Teams message.', via: 'teams' } });
  assert.equal(assignmentNotice({ owner: '' }, { owner: 'kim@facilio.com', title: 'x', n: 1, status: 'To Do' }, 'lead@facilio.com', 'Alpha').done, null); console.log('  ok  the assignment message carries a Done button for the owner'); }
console.log('  ok  ' + name); };
const today = new Date().toISOString().slice(0, 10); const day = k => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);

// ---------- pure rules ----------
const P1 = { id: 'p1', name: 'Alpha', tasks: [
  { id: 'a', data: { n: 1, title: 'Late', status: 'To Do', owner: 'Kim@facilio.com', due: '2020-01-01' } },
  { id: 'b', data: { n: 2, title: 'Soon', status: 'In Progress', owner: 'kim@facilio.com', due: day(3) } },
  { id: 'c', data: { n: 3, title: 'Far', status: 'To Do', owner: 'kim@facilio.com', due: day(30) } },
  { id: 'd', data: { n: 4, title: 'Finished', status: 'Done', owner: 'kim@facilio.com', due: '2020-01-01' } },
  { id: 'e', data: { n: 5, title: 'Not mine', status: 'To Do', owner: 'sam@facilio.com', due: '2020-01-01' } },
  { id: 'f', data: { n: 6, title: 'Stuck', status: 'Blocked', owner: 'kim@facilio.com' } },
  { id: 'g', data: { n: 7, title: 'Old copy', status: 'To Do', owner: 'kim@facilio.com', due: '2020-01-01', superseded: true } },
  { id: 'h', data: { n: 8, title: 'Eta only', status: 'To Do', owner: 'kim@facilio.com', eta: '2020-02-02' } }] };
await t('pendingFor lists only the person\'s open tasks, overdue and blocked first, and counts them', () => {
  const r = pendingFor('KIM@facilio.com', [P1], today);
  assert.deepEqual(r.items.map(x => x.id), ['a', 'h', 'f', 'b', 'c'], 'overdue (oldest first), blocked, then by date');
  assert.deepEqual(r.counts, { open: 5, dueToday: 0, overdue: 2, soon: 1, blocked: 1 });
  assert.equal(pendingFor('', [P1], today).counts.open, 0); assert.equal(pendingFor('nobody@facilio.com', [P1], today).items.length, 0);
});
await t('dueOf uses the earlier of due and eta and ignores bad dates', () => { assert.equal(dueOf({ due: '2026-03-01', eta: '2026-02-01' }), '2026-02-01'); assert.equal(dueOf({ due: 'soon', eta: '' }), ''); });
await t('digestMessage is null with nothing pending, and says what is overdue', () => {
  assert.equal(digestMessage(pendingFor('nobody@facilio.com', [P1], today), today), null);
  const m = digestMessage(pendingFor('kim@facilio.com', [P1], today), today); assert.match(m.title, /5 open, 2 overdue/); assert.match(m.text, /\*\*OVERDUE \(2\)\*\*\n\n\*\*T-1 · Late\*\*\nOVERDUE since 2020-01-01 · To Do/); assert.match(m.text, /\*\*BLOCKED/); assert.match(m.text, /^\*\*Here is what is open for you in Alpha\.\*\*/); assert.ok(m.facts.some(f => f.title === 'Why you got this'));
  assert.match(digestMessage(pendingFor('kim@facilio.com', [P1], today), today, { name: 'Kim' }).text, /^\*\*Hi Kim, here is what is open for you in Alpha\.\*\*/);
  assert.equal(m.facts.find(f => f.title === 'Overdue').value, '2'); assert.match(m.actions[0].url, /#\/p\/p1\/tasks$/);
});
await t('a long list is cut and says how many more', () => {
  const many = { id: 'p2', name: 'Big', tasks: Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i, data: { n: i + 1, title: 'T' + i, status: 'To Do', owner: 'kim@facilio.com' } })) };
  const m = digestMessage(pendingFor('kim@facilio.com', [many, P1], today), today); assert.ok(m.text.includes('**Big**')); assert.ok(m.title.startsWith('TASKS · 2 projects')); assert.match(m.text, /\.\.\.and \d+ more in Delivery Studio/); assert.equal(m.text.split('\n').filter(l => l.startsWith('**T-')).length, 6, 'six tasks with their details, the rest counted'); assert.ok(!/#\/p\//.test(m.actions[0].url), 'two projects: link to the app, not one project');
});
await t('digestKey is a valid key per person and scope, and two addresses never share one', () => {
  const k = digestKey('Kim.R@Facilio.com', 'p1'); assert.ok(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(k)); assert.equal(k, digestKey('kim.r@facilio.com', 'p1'));
  assert.notEqual(k, digestKey('kim.r@facilio.com', 'p2'), 'another project, another digest'); assert.notEqual(digestKey('kim+x@facilio.com'), digestKey('kim_x@facilio.com')); assert.notEqual(assignKey('kim.r@facilio.com'), k);
});
await t('assignGate allows three a day, then none, and starts again the next day', () => {
  let rec = null; for (let i = 0; i < 3; i++) { const g = assignGate(rec, '2026-11-04'); assert.equal(g.allow, true); rec = g.rec; }
  assert.equal(assignGate(rec, '2026-11-04').allow, false); assert.equal(assignGate(rec, '2026-11-05').allow, true);
});
await t('a title with line breaks is flattened to one line', () => { const r = pendingFor('kim@facilio.com', [{ id: 'p', name: 'A', tasks: [{ id: 'z', data: { title: 'Line one\n\n[click](http://x)\r\nline two', status: 'To Do', owner: 'kim@facilio.com' } }] }], today); assert.ok(!/\n/.test(r.items[0].title)); assert.equal(assignmentNotice({}, { title: 'a\nb', owner: 'kim@facilio.com', status: 'To Do' }, 'sam@facilio.com', 'A').text.split('\n').length, 3, 'a line break inside a title cannot make extra lines'); });
await t('assignmentNotice only fires for a new owner who is somebody else and the task is open', () => {
  const next = { title: 'Do it', status: 'To Do', owner: 'kim@facilio.com', due: '2026-12-01', priority: 'High' };
  assert.equal(assignmentNotice({ owner: '' }, next, 'sam@facilio.com', 'Alpha').to, 'kim@facilio.com');
  assert.equal(assignmentNotice({ owner: 'kim@facilio.com' }, next, 'sam@facilio.com', 'Alpha'), null, 'same owner');
  assert.equal(assignmentNotice({}, next, 'KIM@facilio.com', 'Alpha'), null, 'assigned to themselves');
  assert.equal(assignmentNotice({}, Object.assign({}, next, { status: 'Done' }), 'sam@facilio.com', 'Alpha'), null, 'done task');
  assert.equal(assignmentNotice({ owner: 'kim@facilio.com' }, Object.assign({}, next, { owner: '' }), 'sam@facilio.com', 'Alpha'), null, 'owner removed');
});

// ---------- connector tools on a stand-in platform ----------
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/; let sent = []; let teamsReply = () => ({ delivered: 1, muted: 0, failed: 0 }); let teamsOn = false;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  secrets: { async get(name) { if (name === 'teams_notify' && teamsOn) return 'on'; throw new Error('no secret'); } },
  teams: { async send(o) { sent.push(o); return teamsReply(o); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com';

const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Reminder Test', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
const pid2 = (await as(SAM, 'POST', '/api/projects', { name: 'Other Project', customer: 'Beta' })).data.project.id;
const put = (who, p, id, data) => as(who, 'PUT', `/api/projects/${p}/items/task/${id}`, { data });
assert.equal((await put(SAM, pid, 't1', { title: 'Kim late task', status: 'To Do', owner: KIM, due: '2020-01-01' })).status, 200);
assert.equal((await put(SAM, pid, 't2', { title: 'Kim done task', status: 'Done', owner: KIM, due: '2020-01-01' })).status, 200);
assert.equal((await put(SAM, pid, 't3', { title: 'Sam task', status: 'To Do', owner: SAM, due: day(2) })).status, 200);
assert.equal((await put(SAM, pid2, 't4', { title: 'Sam other project', status: 'To Do', owner: SAM, due: '2020-03-03' })).status, 200);

await t('my_tasks returns only the caller\'s open tasks across projects', async () => {
  const r = await tool(SAM, 'my_tasks', {}); assert.equal(r.status, 200); assert.deepEqual(r.data.tasks.map(x => x.title).sort(), ['Sam other project', 'Sam task']); assert.equal(r.data.counts.overdue, 1);
  assert.deepEqual((await tool(SAM, 'my_tasks', { project: 'Reminder' })).data.tasks.map(x => x.title), ['Sam task']);
  assert.deepEqual((await tool(KIM, 'my_tasks', {})).data.tasks.map(x => x.title), ['Kim late task']);
});
await t('send_task_digest says so and sends nothing while Teams notices are off', async () => {
  sent = []; const r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.status, 200); assert.equal(r.data.sent, 0); assert.match(r.data.reason, /teams_notify/); assert.equal(sent.length, 0);
});
teamsOn = true;
await t('a digest to yourself goes once a day, and again only when asked', async () => {
  sent = []; let r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.data.sent, 1); assert.equal(sent.length, 1); assert.deepEqual(sent[0].to, [SAM]); assert.match(sent[0].title, /2 open, 1 overdue/);
  r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.data.sent, 0); assert.equal(r.data.results[0].why, 'already sent today'); assert.equal(sent.length, 1);
  r = await tool(SAM, 'send_task_digest', { again: true }); assert.equal(r.data.sent, 1); assert.equal(sent.length, 2);
});
await t('a team digest messages each member who has something pending, in that project only', async () => {
  sent = []; const r = await tool(SAM, 'send_task_digest', { to: 'team', project: pid }); assert.equal(r.status, 200);
  const by = Object.fromEntries(r.data.results.map(x => [x.to, x.status])); assert.equal(by[KIM], 'sent'); assert.equal(by[VIC], 'skipped');
  assert.equal(by[SAM], 'sent', 'Sam\'s own all-projects digest is a different scope from this project\'s team digest'); assert.deepEqual(sent.map(x => x.to[0]).sort(), [KIM, SAM]);
  const kimMsg = sent.find(x => x.to[0] === KIM); assert.match(kimMsg.text, /Kim late task/); assert.ok(!/Sam task|Sam other/.test(kimMsg.text), 'nothing of another person or project');
  const again = await tool(SAM, 'send_task_digest', { to: 'team', project: pid }); assert.equal(again.data.sent, 0, 'nobody is messaged twice in a day for the same project'); assert.equal(sent.length, 2);
});
await t('a viewer cannot send a team digest', async () => { const r = await tool(VIC, 'send_task_digest', { to: 'team', project: pid }); assert.equal(r.status, 403); });
await t('one person in two projects gets a team digest for each, on the same day', async () => {
  assert.equal((await as(SAM, 'POST', `/api/projects/${pid2}/members`, { email: KIM, role: 'editor' })).status, 201);
  assert.equal((await put(SAM, pid2, 't9', { title: 'Kim in project two', status: 'To Do', owner: KIM, due: '2020-04-04' })).status, 200);
  sent = []; const r = await tool(SAM, 'send_task_digest', { to: 'team', project: pid2 }); const by = Object.fromEntries(r.data.results.map(x => [x.to, x.status]));
  assert.equal(by[KIM], 'sent', 'Kim got project one\'s digest today, not this one'); assert.match(sent.find(x => x.to[0] === KIM && /tasks|digest|pending/i.test(x.title)).text, /Kim in project two/);
});
await t('a message Teams did not deliver is not counted and does not block a retry', async () => {
  store.get('twn').clear(); sent = []; teamsReply = () => ({ delivered: 0, muted: 1, failed: 0 });
  let r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.data.sent, 0); assert.equal(r.data.results[0].status, 'not delivered');
  teamsReply = () => ({ delivered: 1, muted: 0, failed: 0 }); r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.data.sent, 1);
  teamsReply = () => { throw new Error('Teams is down'); }; store.get('twn').clear(); r = await tool(SAM, 'send_task_digest', {}); assert.equal(r.data.results[0].status, 'failed'); teamsReply = () => ({ delivered: 1, muted: 0, failed: 0 });
});
await t('saving a task with a new owner sends that person one direct message', async () => {
  sent = []; assert.equal((await put(SAM, pid, 't5', { title: 'Brand new', status: 'To Do', owner: KIM, due: day(5) })).status, 200);
  assert.equal(sent.length, 1); assert.deepEqual(sent[0].to, [KIM]); assert.match(sent[0].title, /^TASK · /); assert.match(sent[0].text, /^\*\*Assigned to you\*\*\nT-4 · Brand new\nDue \d{4}-\d{2}-\d{2} · To Do/); assert.ok(sent[0].facts.some(f => f.title === 'Assigned by' && f.value === 'sam.k')); assert.ok(sent[0].facts.some(f => f.title === 'Why you got this'));
  assert.equal((await put(SAM, pid, 't5', { title: 'Brand new, edited', status: 'To Do', owner: KIM, due: day(5) })).status, 200); assert.equal(sent.length, 1, 'same owner: no second message');
  assert.equal((await put(SAM, pid, 't6', { title: 'Mine', status: 'To Do', owner: SAM })).status, 200); assert.equal(sent.length, 1, 'assigning to yourself: no message');
  teamsOn = false; assert.equal((await put(SAM, pid, 't7', { title: 'Quiet', status: 'To Do', owner: KIM })).status, 200); assert.equal(sent.length, 1, 'Teams notices off: no message');
});
await t('Send to my Teams: one task goes to the caller only; Teams off, a finished task, a customer and an unknown task send nothing', async () => {
  teamsOn = true; store.get('twn').clear(); sent = []; await put(SAM, pid, 'm1', { title: 'Carry me', status: 'To Do', priority: 'High' });
  sent = []; const r = await as(SAM, 'POST', `/api/projects/${pid}/tasks/m1/to-my-teams`, {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.sent, true);
  assert.equal(sent.length, 1); assert.deepEqual(sent[0].to, [SAM]); assert.match(sent[0].title, /^TASK · /); assert.match(sent[0].text, /Carry me/);
  teamsOn = false; assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/tasks/m1/to-my-teams`, {})).data.sent, false); teamsOn = true;
  assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/tasks/nope/to-my-teams`, {})).status, 404);
  await put(SAM, pid, 'm2', { title: 'Finished', status: 'Done' }); assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/tasks/m2/to-my-teams`, {})).data.sent, false); assert.equal(sent.length, 1, 'nothing more was sent');
});
await t('the morning brief: the first sweep of a day sends each owner of the project the digest (stage and DUE TODAY shown), a second sweep the same day sends nothing', async () => {
  teamsOn = true; store.get('twn').clear(); if (store.get('dbr')) store.get('dbr').clear(); sent = [];
  sent = []; await as(SAM, 'POST', '/api/notifications/sweep', {}); assert.equal(sent.filter(x => /^TASKS/.test(x.title)).length, 0, 'off by default: no brief'); if (store.get('dbr')) store.get('dbr').clear();
  assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/daily-brief`, { on: true })).data.on, true); assert.equal((await as(SAM, 'GET', `/api/projects/${pid}/daily-brief`)).data.on, true);
  assert.equal((await put(SAM, pid, 'br1', { title: 'Brief me', status: 'To Do', owner: KIM, due: day(0), stage: 'Testing & UAT' })).status, 200); sent = []; store.get('twn').clear();
  const r = await as(SAM, 'POST', '/api/notifications/sweep', {}); assert.equal(r.status, 200, JSON.stringify(r.data));
  const toKim = sent.filter(x => x.to && x.to[0] === KIM && /^TASKS/.test(x.title) && /due today/.test(x.title)); assert.equal(toKim.length, 1, 'Kim gets one brief that counts what is due today'); assert.equal(toKim[0].facts.find(f => f.title === 'Due today').value, '1'); assert.match(toKim[0].text, /\*\*DUE TODAY \(1\)\*\*\n\n\*\*T-\d+ · Brief me\*\*\nDue today · To Do · Testing & UAT/); assert.match(toKim[0].text, /Whole team on this project: \d+ open/);
  sent = []; await as(SAM, 'POST', '/api/notifications/sweep', {}); assert.equal(sent.filter(x => /^TASKS/.test(x.title)).length, 0, 'once a day');
});
await t('Send my list now: the caller gets their own digest again on request, nobody else is messaged; the brief also posts a summary to the project channel', async () => {
  teamsOn = true; store.get('twn').clear(); sent = []; const r = await as(KIM, 'POST', `/api/projects/${pid}/daily-brief/me`, {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.sent, 1);
  assert.ok(sent.every(x => x.to && x.to[0] === KIM), 'only the caller was messaged'); sent = []; const r2 = await as(KIM, 'POST', `/api/projects/${pid}/daily-brief/me`, {}); assert.equal(r2.data.sent, 1, 'asking again sends again');
  if (store.get('dbr')) store.get('dbr').clear(); sent = []; await as(SAM, 'POST', '/api/notifications/sweep', {}); const ch = sent.filter(x => x.channel); assert.ok(ch.length >= 1 && /^PROJECT · /.test(ch[0].title) && /Open \d+ · overdue \d+ · finished \d+/.test(ch[0].text), 'a channel summary was posted');
});
await t('a bulk owner change sends at most three messages to that person', async () => {
  teamsOn = true; sent = []; for (let i = 0; i < 5; i++) assert.equal((await put(SAM, pid, 'b' + i, { title: 'Bulk ' + i, status: 'To Do', owner: VIC })).status, 200);
  assert.equal(sent.filter(x => x.to[0] === VIC).length, 3, 'the other two are left for the digest');
});
await t('a Teams failure never stops the task from being saved', async () => {
  teamsOn = true; teamsReply = () => { throw new Error('Teams is down'); }; const r = await put(SAM, pid, 't8', { title: 'Saved anyway', status: 'To Do', owner: KIM }); assert.equal(r.status, 200); teamsReply = () => ({ delivered: 1, muted: 0, failed: 0 });
});
await t('the public action tools reach the same code, and a wrong action is refused', async () => {
  const a = await tool(SAM, 'task_tracking', { project: pid, action: 'evidence' }); assert.equal(a.status, 200); assert.equal((await tool(SAM, 'task_tracking', { project: pid, action: 'nope' })).status, 400);
  assert.equal((await tool(SAM, 'transfer_read', { project: pid, action: 'list' })).status, 200); assert.equal((await tool(SAM, 'transfer_read', { project: pid })).status, 400, 'no action given');
});
console.log(n + ' task reminder checks passed');
