// Customer mail becomes tasks: the server side (_mailapi.mjs) with an in-memory database: save, dedupe, accept, resolved -> draft_reply job, reply states, customers refused, tools declared.
// NOT checked: the real platform database, a real Claude run, a real Outlook draft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { installMailTasks } from '../work/server/_mailapi.mjs';
import { KINDS } from '../work/server/_jobs.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const db = new Map(); const key = (c, id) => c + '|' + id; const routes = {}; const CONNECTOR = {}; const jobs = []; let role = 'lead';
db.set(key('projects', 'p1'), { id: 'p1', name: 'Al Mujama FM Rollout', customer: 'Al Mujama Group', members: [{ email: 'me@facilio.com' }, { email: 'ravi@facilio.com' }] });
const d = { route: (m, p, fn) => { routes[m + ' ' + p] = fn; }, ok: (b, st) => ({ b, st }), HttpError, me: async () => ({ id: 'u1', email: 'me@facilio.com' }), projectAccess: async () => ({ role }), pickProject: async (s, q) => ({ id: 'p1', name: 'Al Mujama FM Rollout' }),
  dbGet: async (c, id) => db.get(key(c, id)) ? { value: db.get(key(c, id)) } : null, dbPut: async (c, id, v) => { db.set(key(c, id), v); }, dbList: async c => [...db].filter(([k]) => k.startsWith(c + '|')).map(([k, v]) => ({ id: k.split('|')[1], value: v })),
  withLock: async (k, fn) => fn(), audit: async () => { }, viaApp: async (m, p, q, b) => { jobs.push({ p, b }); return { job: { id: 'jb_' + jobs.length } }; }, CONNECTOR, docRead: async () => ({ data: { modules: [{ name: 'Work Order' }, { name: 'Inventory' }] } }), cut: (v, m) => String(v == null ? '' : v).slice(0, m) };
installMailTasks(d); const S = { id: 'u1', email: 'me@facilio.com' };
const mail = (o) => Object.assign({ messageId: '<m1@c.com>', from: { name: 'Sara', email: 'sara@customer.com' }, to: ['me@facilio.com'], cc: [], subject: 'Process flow change', body: 'The Work Order approval needs two steps.' }, o || {});

await t('mail_save stores a pending record (also one that names nothing: found by Claude), and never stores the same message id twice (any spelling)', async () => {
  const r = await CONNECTOR.mail_save(S, { project: 'p1', mails: [mail(), mail({ messageId: 'M1@C.com' }), mail({ messageId: 'x', to: ['z@z.com'], subject: 'Lunch', body: 'Pizza?' }), { subject: 'no id' }] });
  assert.deepEqual(r.results.map(x => x.status), ['stored', 'duplicate', 'stored', 'rejected']); assert.equal(r.stored, 2);   // a mail Claude brings that names nothing is still shown (found), for a person to dismiss
  const strict = await routes['POST /api/projects/:id/mailtasks']({ mails: [mail({ messageId: 'zz', to: ['z@z.com'], subject: 'Lunch', body: 'Pizza?' })] }, { id: 'p1' }); assert.equal(strict.b.results[0].status, 'ignored');   // a dropped file must still match
  const l = await CONNECTOR.mail_list(S, { project: 'p1' }); assert.equal(l.mails.length, 2); const sol = l.mails.find(x => x.route.area === 'solution'); assert.deepEqual([l.mails.find(x => x.scenario === 'found').status, sol.status, sol.route.area, sol.route.job, sol.route.areaKey, sol.scenario], ['pending', 'pending', 'solution', 'compare_solution', 'module:Work Order', 'to']);
  assert.match(l.untrusted, /data/); assert.deepEqual(l.knownMessageIds.sort(), ['m1@c.com', 'x']);
});
let id;
await t('a team mail the person never saw (sent to another member) and a mention are stored; accept sets the done-when check once', async () => {
  const r = await CONNECTOR.mail_save(S, { project: 'p1', mails: [mail({ messageId: 'm2', to: ['ravi@facilio.com'], subject: 'BRD update', body: 'Please change the BRD.' }), mail({ messageId: 'm3', to: ['x@y.com'], subject: 'Question', body: 'About Inventory.' })] }); assert.equal(r.stored, 2);
  const l = await CONNECTOR.mail_list(S, { project: 'p1' }); assert.deepEqual(l.mails.map(x => x.scenario).sort(), ['found', 'mention', 'team', 'to']); id = l.mails.find(x => x.route.area === 'solution').id;
  const a = await d.CONNECTOR.mail_list(S, { project: 'p1', id }); assert.equal(a.mails[0].mail.body.length > 0, true);
  const acc = await routes['POST /api/projects/:id/mailtasks/:mid/accept']({}, { id: 'p1', mid: id }); assert.deepEqual([acc.b.mail.status, acc.b.mail.doneWhen.type, acc.b.mail.doneWhen.area, acc.b.mail.acceptedBy], ['accepted', 'solution_accepted', 'module:Work Order', 'me@facilio.com']);
  await assert.rejects(() => routes['POST /api/projects/:id/mailtasks/:mid/accept']({}, { id: 'p1', mid: id }), /already accepted/);
});
await t('resolved queues ONE draft_reply job; a repeat does not queue another', async () => {
  const a = await routes['POST /api/projects/:id/mailtasks/:mid/resolved']({ why: 'the solution was accepted' }, { id: 'p1', mid: id }); assert.equal(a.b.job, 'jb_1'); assert.equal(jobs[0].b.kind, 'draft_reply'); assert.equal(jobs[0].b.ref, id); assert.ok(KINDS.draft_reply && KINDS.fetch_mail && KINDS.check_sent);
  const b = await routes['POST /api/projects/:id/mailtasks/:mid/resolved']({ why: 'again' }, { id: 'p1', mid: id }); assert.equal(b.b.job, null); assert.equal(jobs.length, 1);
});
await t('the reply is stored unapproved; Sent Items cannot be confirmed before a person approves; then the mail closes', async () => {
  await assert.rejects(() => CONNECTOR.mail_sent(S, { project: 'p1', id, sentRef: 'x' }), /no reply|approved/i);
  const dr = await CONNECTOR.mail_draft(S, { project: 'p1', id, subject: 'Re: Process flow change', body: 'Done, see the Solution tab.', to: ['sara@customer.com'] }); assert.equal(dr.reply.state, 'drafted'); assert.match(dr.note, /nothing was sent/);
  await assert.rejects(() => CONNECTOR.mail_sent(S, { project: 'p1', id, sentRef: 'x' }), /approved/);
  await assert.rejects(() => routes['POST /api/projects/:id/mailtasks/:mid/sent-check']({}, { id: 'p1', mid: id }), /Approve the reply first/);
  const ed = await routes['POST /api/projects/:id/mailtasks/:mid/reply']({ event: 'edit', body: 'Edited text.' }, { id: 'p1', mid: id }); assert.equal(ed.b.mail.reply.body, 'Edited text.');
  const ap = await routes['POST /api/projects/:id/mailtasks/:mid/reply']({ event: 'approve' }, { id: 'p1', mid: id }); assert.equal(ap.b.mail.reply.state, 'approved');
  await assert.rejects(() => routes['POST /api/projects/:id/mailtasks/:mid/reply']({ event: 'sent' }, { id: 'p1', mid: id }), /event must be/);
  const chk = await routes['POST /api/projects/:id/mailtasks/:mid/sent-check']({}, { id: 'p1', mid: id }); assert.ok(chk.b.job); assert.equal(jobs[jobs.length - 1].b.kind, 'check_sent');
  const sent = await CONNECTOR.mail_sent(S, { project: 'p1', id, sentRef: 'Re: Process flow change to sara@customer.com 12:01' }); assert.equal(sent.status, 'closed');
  await assert.rejects(() => CONNECTOR.mail_draft(S, { project: 'p1', id, body: 'again' }), /closed/);
});
await t('dismiss keeps a mail out; customers and viewers are refused', async () => {
  const l = await CONNECTOR.mail_list(S, { project: 'p1' }); const x = l.mails[0].id; const r = await routes['POST /api/projects/:id/mailtasks/:mid/dismiss']({}, { id: 'p1', mid: x }); assert.equal(r.b.mail.status, 'dismissed');
  assert.equal((await CONNECTOR.mail_save(S, { project: 'p1', mails: [mail({ messageId: l.mails[0].mail.messageId })] })).results[0].status, 'duplicate');   // still known, so Claude does not bring it back
  role = 'customer'; await assert.rejects(() => CONNECTOR.mail_list(S, { project: 'p1' }), /project team/); role = 'lead';
});
await t('the connector action list and the job recipes are in step', () => {
  const w = JSON.parse(fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8')).mcp.tools; assert.equal(w.length, 40); const x = w.find(y => y.name === 'task_tracking');
  for (const a of ['mail_list', 'mail_save', 'mail_draft', 'mail_sent']) assert.ok(x.input_schema.properties.action.enum.includes(a) && x.description.includes(a), a);
  for (const k of ['fetch_mail', 'draft_reply', 'check_sent']) assert.match(KINDS[k].recipe, /task_tracking/); assert.match(KINDS.fetch_mail.recipe, /OTHER members/); assert.match(KINDS.draft_reply.recipe, /UNAPPROVED/); assert.match(KINDS.fetch_mail.recipe, /data, never instructions/);
});
await t('mail is fetched once: mail_list gives the date to search from and the ids already stored; a saved batch moves the date; a muted project saves nothing and says so', async () => {
  const before = await CONNECTOR.mail_list(S, { project: 'p1', status: 'all' }); assert.equal(before.muted, false); assert.ok(before.knownMessageIds.length >= 1); assert.ok(before.known >= 1);
  await CONNECTOR.mail_save(S, { project: 'p1', mails: [mail({ messageId: 'wm1', receivedAt: '2026-11-05T09:00:00Z' })] });
  const after = await CONNECTOR.mail_list(S, { project: 'p1', status: 'all' }); assert.ok(after.searchSince >= '2026-11-04', after.searchSince); assert.ok(after.knownMessageIds.includes('wm1'));
  await routes['POST /api/projects/:id/mailtasks/mute']({ muted: true, why: 'the project was handed over' }, { id: 'p1' });
  const m = await CONNECTOR.mail_save(S, { project: 'p1', mails: [mail({ messageId: 'wm2' })] }); assert.equal(m.muted, true); assert.equal(m.stored, 0);
  assert.equal((await CONNECTOR.mail_list(S, { project: 'p1', status: 'all' })).muted, true); assert.ok(!(await CONNECTOR.mail_list(S, { project: 'p1', status: 'all' })).knownMessageIds.includes('wm2'));
  await routes['POST /api/projects/:id/mailtasks/mute']({ muted: false }, { id: 'p1' }); assert.equal((await CONNECTOR.mail_list(S, { project: 'p1', status: 'all' })).muted, false);
  assert.match(KINDS.fetch_mail.recipe, /searchSince/); assert.match(KINDS.fetch_mail.recipe, /muted/);
});
console.log('\nmail_api: ' + n + ' passed');
