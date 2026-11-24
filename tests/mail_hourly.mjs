// The hourly customer-mail search (user, 19 Nov 2026): a team member's queue check-in queues a search of THEIR mailbox once an hour; muted projects, customers and people off the team never get one. Run: node tests/mail_hourly.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { installJobs } from '../work/server/_jobsapi.mjs'; import { newJob } from '../work/server/_jobs.mjs';
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const db = {}; const col = c => (db[c] = db[c] || {});
const P = { id: 'p1', name: 'One', members: [{ email: 'Ana@x.com', role: 'owner' }, { email: 'bo@x.com', role: 'member' }, { email: 'cu@cust.com', role: 'customer' }] };
const CONNECTOR = {};
installJobs({ route() { }, ok: x => x, HttpError, me: async () => ({}), projectAccess: async () => ({ role: 'edit', project: P }), pickProject: async () => P, readableProjects: async () => [P],
  dbGet: async (c, k) => (k in col(c) ? { value: col(c)[k] } : null), dbPut: async (c, k, v) => { col(c)[k] = v; }, dbList: async c => Object.values(col(c)).map(v => ({ value: v })),
  withLock: async (k, fn) => fn(), audit: async () => { }, CONNECTOR, rid: () => Math.random().toString(36).slice(2), CTX: {} });
const mailJobs = who => Object.values(col('jb.p1')).filter(j => j.kind === 'fetch_mail' && (!who || String(j.requestedBy).toLowerCase() === who));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const ana = { id: 'u1', email: 'ana@x.com', name: 'Ana' }, bo = { id: 'u2', email: 'bo@x.com', name: 'Bo' };
await t('a team member\'s check-in queues one search of their own mailbox, and names the hourly mail task', async () => {
  const r = await CONNECTOR.jobs_list(ana, {}); assert.equal(mailJobs('ana@x.com').length, 1); assert.equal(r.mailHourly, true); assert.match(r.note, /once an hour per person/); assert.ok(r.note.includes('Delivery Studio mail (hourly)'));
});
await t('a second check-in within the hour adds nothing, and request says so', async () => {
  await CONNECTOR.jobs_list(ana, {}); assert.equal(mailJobs('ana@x.com').length, 1);
  const r = await CONNECTOR.jobs_request(ana, { project: 'One' }); assert.equal(r.requested, false); assert.match(r.note, /last hour/);
});
await t('another member gets their own search (each Claude reads only its own Outlook)', async () => { await CONNECTOR.jobs_list(bo, {}); assert.equal(mailJobs('bo@x.com').length, 1); assert.equal(mailJobs().length, 2); });
await t('after an hour (the last one finished) the next search is queued', async () => {
  for (const j of mailJobs('ana@x.com')) { j.status = 'done'; j.requestedAt = new Date(Date.now() - 61 * 60e3).toISOString(); }
  await CONNECTOR.jobs_list(ana, {}); assert.equal(mailJobs('ana@x.com').length, 2);
});
await t('a customer or someone off the team never gets a search; a muted project gets none', async () => {
  await CONNECTOR.jobs_list({ id: 'u3', email: 'cu@cust.com' }, {}); await CONNECTOR.jobs_list({ id: 'u4', email: 'zz@x.com' }, {}); assert.equal(mailJobs('cu@cust.com').length + mailJobs('zz@x.com').length, 0);
  for (const j of mailJobs('bo@x.com')) { j.status = 'done'; j.requestedAt = new Date(Date.now() - 2 * 3600e3).toISOString(); }
  col('mlcfg').p1 = { muted: true }; await CONNECTOR.jobs_list(bo, {}); assert.equal(mailJobs('bo@x.com').length, 1);
  const r = await CONNECTOR.jobs_request(bo, { project: 'One' }); assert.match(r.note, /muted/);
});
// one home for project mail (user, 24 Nov 2026): the Customer mail page; the Tasks page only links there, and Claude's search uses the saved customer addresses
await t('a claimed mail search carries the customer addresses saved in Project settings, and only when there are some', async () => {
  const job = newJob('jb_0123456789abcdef01', { kind: 'fetch_mail', key: 'mailbox:ana@x.com', params: {} }, 'ana@x.com', new Date().toISOString()); col('jb.p1')[job.id] = job;
  col('cfg').mailsenders = { p1: { emails: ['priya@cust.com'], domains: ['cust.com'] } };
  const b = await CONNECTOR.jobs_claim({ email: String(job.requestedBy), id: 'x' }, { project: 'p1', id: job.id }); assert.deepEqual([b.customerAddresses.emails, b.customerAddresses.domains], [['priya@cust.com'], ['cust.com']]); assert.match(b.customerAddresses.note, /Customer emails/);
});
await t('no duplicate mail screen: the Tasks page has no Email tab and links to Customer mail; the menu says Tasks; the bell opens Customer mail', () => {
  const tasks = fs.readFileSync('src/tasks.js', 'utf8'); assert.ok(!/tk\('mail', 'Email'/.test(tasks), 'no Email tab'); assert.match(tasks, /data-view="mailtab">Open Customer mail</); assert.match(tasks, /if \(v === 'mail'\) \{ V\.go\('mailtab'\)/, 'old Email links open Customer mail');
  assert.match(fs.readFileSync('src/shell.js', 'utf8'), /\['tasks', 'Tasks'\], \['mailtab', 'Customer mail'\]/); assert.match(fs.readFileSync('work/server/_mailapi.mjs', 'utf8'), /view: 'mailtab'/);
  assert.match(fs.readFileSync('work/server/api.mjs', 'utf8'), /filter\(v => v && v\.key && !v\.id\)/, 'the shared-mailbox Inbox never lists Claude-found mail'); assert.ok(fs.existsSync('archive/hidden-tabs/tasks-email-tab.js'), 'the old tab is archived');
});
await t('Claude\'s mail search also covers the customer\'s stakeholders, mail with help@facilio.com on it, and a one-year look back on request', async () => {
  const { KINDS } = await import('../work/server/_jobs.mjs'); const r = KINDS.fetch_mail.recipe; assert.match(r, /get_document people/); assert.match(r, /help@facilio\.com/); assert.match(r, /lookbackDays/); assert.match(r, /NEW person writing from the customer's domain/);
  const job = newJob('jb_0123456789abcdef02', { kind: 'fetch_mail', key: 'lookback', params: { ref: 'lookback:365' } }, 'ana@x.com', new Date().toISOString()); col('jb.p1')[job.id] = job;
  const b = await CONNECTOR.jobs_claim({ email: 'ana@x.com', id: 'x' }, { project: 'p1', id: job.id }); assert.equal(b.lookbackDays, 365);
  assert.match(fs.readFileSync('src/mailinbox.js', 'utf8'), /data-act="mlFindOld"/);
});
console.log('mail_hourly: ' + n + ' checks passed');
