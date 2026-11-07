// Team feedback: clean record, issue text, the daily sheet rows, the routes on a stand-in platform, and the GitHub fallback.
import assert from 'node:assert/strict'; import { cleanFeedback, issueBody, sheetRows, inRange, installFeedback } from '../work/server/_feedback.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const who = { email: 'sam@facilio.com', name: 'Sam Roy' }, at = new Date('2026-11-07T09:30:00Z');
await t('a record needs a real title; unknown kinds fall back to feature; text is cut and cleaned', () => {
  assert.equal(cleanFeedback({ title: 'hi' }, who, at), null); assert.equal(cleanFeedback(null, who, at), null);
  const r = cleanFeedback({ kind: 'weird', title: '  Export   BRD as Word ', text: 'x'.repeat(5000), project: { id: 'p1', name: 'Acme' } }, who, at);
  assert.equal(r.kind, 'feature'); assert.equal(r.title, 'Export BRD as Word'); assert.equal(r.text.length, 2000); assert.equal(r.day, '2026-11-07'); assert.equal(r.by, 'sam@facilio.com'); assert.equal(r.project.name, 'Acme');
});
await t('the issue text and the sheet rows say who, what and which feature', () => {
  const r = cleanFeedback({ kind: 'bug', title: 'Deck is blank', text: 'On Kick-off', page: 'kickoff' }, who, at); assert.ok(issueBody(r).includes('Sam Roy') && issueBody(r).includes('On Kick-off'));
  const [row] = sheetRows([r]); assert.deepEqual(Object.keys(row), ['Date', 'Time', 'Who', 'Email', 'Type', 'Feedback', 'Details', 'Project', 'Page', 'GitHub']); assert.equal(row.Who, 'Sam Roy'); assert.equal(row.Type, 'Something is wrong'); assert.ok(inRange(r, '2026-11-07', '2026-11-07') && !inRange(r, '2026-11-08', ''));
});
await t('routes: save, list by day, GitHub failure keeps the record, the sync sends it later, the connector tool returns the day', async () => {
  const db = new Map(), routes = {}; let ghOk = false, calls = 0; let tick = Date.parse('2026-11-07T10:00:00Z');
  const ctx = () => ({ fetch: async (cred, url, init) => { calls++; assert.equal(cred, 'github_feedback'); assert.ok(url.endsWith('/issues')); assert.ok(JSON.parse(init.body).labels.includes('feedback')); return ghOk ? { ok: true, json: () => ({ number: 7, html_url: 'https://github.com/x/y/issues/7' }) } : { ok: false, status: 401 }; } });
  const tools = installFeedback({ route: (m, p, fn) => { routes[m + ' ' + p] = fn; }, ok: (d, s) => ({ data: d, status: s || 200 }), HttpError: class extends Error { }, me: async () => ({ ...who }), dbPut: async (c, k, v) => db.set(c + '/' + k, v), dbList: async c => [...db].filter(([k]) => k.startsWith(c + '/')).map(([, v]) => ({ value: v })), ctx, now: () => (tick += 1000) });
  const a = await routes['POST /api/feedback']({ title: 'Export BRD as Word', text: 'please', kind: 'feature' }); assert.equal(a.status, 201); assert.equal(a.data.item.gh.error, 'GitHub answered 401');
  const today = new Date(tick).toISOString().slice(0, 10); const l = await routes['GET /api/feedback']({}, {}, new URLSearchParams('from=' + today + '&to=' + today)); assert.equal(l.data.items.length, 1);
  ghOk = true; const s = await routes['POST /api/feedback/sync'](); assert.equal(s.data.sent, 1); const t2 = await tools.get_feedback({}, { day: today }); assert.equal(t2.count, 1); assert.equal(t2.rows[0].GitHub, 'https://github.com/x/y/issues/7'); assert.equal((await tools.get_feedback({}, { day: '2020-01-01' })).count, 0);
});
console.log(n + ' feedback checks passed');
