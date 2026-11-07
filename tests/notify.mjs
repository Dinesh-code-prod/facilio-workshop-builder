// Notifications (work/server/_notify.mjs): the pure rules, then the events on a stand-in platform: who is told, who is not (the person who caused it, customers), the preferences, the quiet hours, the daily Teams cap.
// NOT checked: real Teams delivery, the live WebSocket push, the browser pop-up.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { EVENTS, prefsFor, channelsFor, inQuiet, teamsGate, makeRecord, hashOf } from '../work/server/_notify.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

await t('defaults: every event is in-app; browser only where it matters; Teams only for the ones that need a person quickly', () => {
  const p = prefsFor(null); for (const k of Object.keys(EVENTS)) assert.equal(p.types[k].inapp, true, k);
  assert.deepEqual(channelsFor('customer_signoff', null), { inapp: true, browser: true, teams: true }); assert.deepEqual(channelsFor('mail_arrived', null), { inapp: true, browser: false, teams: false }); assert.deepEqual(channelsFor('nope', null), { inapp: false, browser: false, teams: false });
});
await t('a person can turn a channel off; bad values are ignored; quiet hours (also across midnight) silence the pop-up and Teams but never the in-app record', () => {
  const off = { types: { stage_ready: { inapp: true, teams: false }, task_due: { browser: 'yes' } } }; assert.equal(channelsFor('stage_ready', off).teams, false); assert.equal(prefsFor(off).types.task_due.browser, false);
  const q = { quiet: { from: '22:00', to: '07:00' }, tz: -330 };   // India: UTC+5:30 is getTimezoneOffset -330
  const at = (h, m) => new Date(Date.UTC(2026, 10, 7, h, m)); assert.equal(inQuiet(prefsFor(q), at(17, 0)), true, '22:30 local'); assert.equal(inQuiet(prefsFor(q), at(2, 0)), false, '07:30 local'); assert.equal(inQuiet(prefsFor(q), at(20, 0)), true, '01:30 local');
  assert.deepEqual(channelsFor('customer_signoff', q, at(17, 0)), { inapp: true, browser: false, teams: false }); assert.equal(prefsFor({ quiet: { from: 'x', to: '07:00' } }).quiet, null);
});
await t('the Teams cap is 5 a day per person and starts again the next day; records are cut and carry no control characters', () => {
  let rec = null; for (let i = 0; i < 5; i++) { const g = teamsGate(rec, '2026-11-07'); assert.equal(g.allow, true); rec = g.rec; } assert.equal(teamsGate(rec, '2026-11-07').allow, false); assert.equal(teamsGate(rec, '2026-11-08').allow, true);
  const r = makeRecord({ type: 'mail_arrived', project: { id: 'p_1', name: 'A'.repeat(300) }, title: 'T'.repeat(500), text: 'line1\nline2\u0007' + 'x'.repeat(900) }, { browser: true }, '2026-11-07T00:00:00Z', 'id1'); assert.equal(r.pname.length, 120); assert.equal(r.title.length, 140); assert.equal(r.text.length, 300); assert.ok(!/[\n\u0007]/.test(r.text)); assert.equal(r.read, false);
  assert.match(hashOf('Kim.R@Facilio.com'), /^[0-9a-f]{32}$/); assert.equal(hashOf(' KIM.r@facilio.com '), hashOf('kim.r@facilio.com'));
});

// ---------- the events, on a stand-in platform ----------
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/; let sent = [], pushed = [];
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get(name) { if (name === 'teams_notify') return 'on'; throw new Error('no secret'); } }, teams: { async send(o) { sent.push(o); return { delivered: 1, muted: 0, failed: 0 }; } }, broadcast: async d => { pushed.push(d); },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (s.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com';
const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Notified', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'editor'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const list = async who => (await as(who, 'GET', '/api/notifications')).data;

await t('assigning a task tells the new owner in-app (not the person who assigned it, not the customer), and pushes a content-free signal', async () => {
  pushed = []; const r = await as(SAM, 'PUT', `/api/projects/${pid}/items/task/t1`, { data: { title: 'Collect asset list', status: 'To Do', owner: KIM } }); assert.equal(r.status, 200, JSON.stringify(r.data));
  const k = await list(KIM); assert.equal(k.items.length, 1); assert.deepEqual([k.items[0].type, k.items[0].pid, k.items[0].view, k.items[0].read], ['task_assigned', pid, 'tasks', false]); assert.equal(k.unread, 1);
  assert.equal((await list(SAM)).items.length, 0, 'the person who did it is not told'); assert.equal((await list(CUS)).items.length, 0, 'customers are never told'); assert.ok(pushed.some(p => p.type === 'notify' && p.for === hashOf(KIM)) && pushed.every(p => Object.keys(p).sort().join() === 'for,type'), 'the push carries no text');
  await as(SAM, 'PUT', `/api/projects/${pid}/items/task/t1`, { data: { title: 'Collect asset list', status: 'In Progress', owner: KIM } }); assert.equal((await list(KIM)).items.length, 1, 'the same owner is not told again');
});
await t('reading marks it read; another person has their own list', async () => {
  const k = await list(KIM); const r = await as(KIM, 'POST', '/api/notifications/read', { ids: [k.items[0].id] }); assert.equal(r.data.read, 1); assert.equal((await list(KIM)).unread, 0); assert.equal((await list(VIC)).items.length, 0);
});
await t('closing a stage tells the team, not the person who closed it; Claude suggestions tell the person even though Claude acted as them', async () => {
  const r = await as(SAM, 'PUT', `/api/projects/${pid}/items/lcstage/design`, { data: { status: 'closed', note: 'BRD signed', owner: SAM, at: new Date().toISOString() } }); assert.equal(r.status, 200, JSON.stringify(r.data));
  const k = await list(KIM); assert.ok(k.items.some(x => x.type === 'stage_closed' && /Mockup & BRD/.test(x.title)), JSON.stringify(k.items.map(x => x.title))); assert.ok(!(await list(SAM)).items.some(x => x.type === 'stage_closed'));
  const s = await tool(KIM, 'save_task_suggestions', { project: pid, suggestions: [{ action: 'create', fields: { title: 'Ask about the data load' }, reason: 'r', source: { type: 'transcript', ref: 'tr 1', quote: 'q' } }] }); assert.equal(s.status, 200, JSON.stringify(s.data)); assert.ok((await list(KIM)).items.some(x => x.type === 'proposal_waiting'));
});
await t('mail saved by Claude tells the team that mail arrived; the stage-ready push from the browser tells the team once a day and refuses customers and unknown events', async () => {
  const m = await tool(SAM, 'task_tracking', { action: 'mail_save', project: pid, mails: [{ messageId: '<N-1@acme.com>', from: { name: 'Sara', email: 'sara@acme.com' }, to: [SAM], cc: [], subject: 'Acme: Notified project, please add a field', body: 'Could you add a site field for the Notified project?' }] }); assert.equal(m.status, 200, JSON.stringify(m.data));
  assert.ok((await list(VIC)).items.some(x => x.type === 'mail_arrived'), 'the team is told'); assert.equal((await list(CUS)).items.length, 0);
  const a = await as(VIC, 'POST', `/api/projects/${pid}/notify-event`, { type: 'stage_ready', stage: 'uat', name: 'UAT & FTR' }); assert.equal(a.status, 200); assert.equal(a.data.notified, 2, 'Sam and Kim, not Vic');
  assert.equal((await as(VIC, 'POST', `/api/projects/${pid}/notify-event`, { type: 'stage_ready', stage: 'uat', name: 'UAT & FTR' })).data.notified, 0, 'once a day per stage');
  assert.equal((await as(CUS, 'POST', `/api/projects/${pid}/notify-event`, { type: 'stage_ready', stage: 'uat' })).status, 403); assert.equal((await as(VIC, 'POST', `/api/projects/${pid}/notify-event`, { type: 'anything', stage: 'x' })).status, 400);
});
await t('preferences: turning in-app off stops the record; Teams messages go only to people who left it on, within the daily cap', async () => {
  const stageClosed = async who => (await list(who)).items.filter(x => x.type === 'stage_closed').length; const kBefore = await stageClosed(KIM); const p = await as(KIM, 'PUT', '/api/notifications/prefs', { types: { stage_closed: { inapp: false, teams: false } }, tz: -330 }); assert.equal(p.status, 200); assert.equal(p.data.prefs.types.stage_closed.inapp, false); assert.equal(p.data.prefs.types.mail_arrived.inapp, true);
  const r = await as(SAM, 'PUT', `/api/projects/${pid}/items/lcstage/uat`, { data: { status: 'closed', note: 'ok', at: new Date().toISOString() } }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(await stageClosed(KIM), kBefore, 'Kim turned it off'); assert.ok((await list(VIC)).items.some(x => x.title.includes('UAT & FTR') && x.type === 'stage_closed'), 'Vic still gets it');
  await as(VIC, 'PUT', '/api/notifications/prefs', { types: { stage_closed: { inapp: true, teams: true } } }); sent = []; for (let i = 0; i < 8; i++) await as(SAM, 'PUT', `/api/projects/${pid}/items/lcstage/hypercare`, { data: { status: i % 2 ? 'closed' : '', note: i % 2 ? 'n' + i : '', at: new Date(Date.now() + i).toISOString() } }); const toVic = sent.filter(x => x.to && x.to[0] === VIC && /Stage closed/.test(x.title)); assert.ok(toVic.length >= 1 && toVic.length <= 5, 'Teams only for the person who left it on, at most 5 a day: ' + toVic.length); assert.equal(sent.filter(x => x.to && x.to[0] === KIM).length, 0, 'none for Kim');
});
await t('the daily sweep answers for the caller only, never fails, once a day per project', async () => {
  const r = await as(SAM, 'POST', '/api/notifications/sweep', {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(typeof r.data.notified === 'number');
  assert.equal((await as(SAM, 'POST', '/api/notifications/sweep', {})).data.notified, 0, 'once a day per project');
});
console.log(n + ' notification checks passed');
