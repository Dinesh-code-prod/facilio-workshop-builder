// Customer emails (Project Settings): saving them, refusing shared domains and clashes, and the mailbox search that files what those customers already sent.
// The Microsoft mailbox is a mock that hands back three messages: one from a listed customer, one from a stranger, one from another customer's domain.
// Usage: node tests/customer_mail.mjs   (exit code 1 on failure). No network, no real credential.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(); const asked = [];
const msg = (id, from, subject) => ({ id, conversationId: 'c-' + id, subject, from: { emailAddress: { name: from.split('@')[0], address: from } }, toRecipients: [{ emailAddress: { address: 'support@facilio.com' } }], ccRecipients: [], body: { content: 'Hello, the visitor kiosk is stuck.' }, bodyPreview: 'Hello', receivedDateTime: new Date(Date.now() - 864e5).toISOString(), hasAttachments: false, isDraft: false, webLink: 'https://outlook.example/' + id });
const MAIL = [msg('m1', 'priya@acme.com', 'Kiosk stuck'), msg('m2', 'stranger@elsewhere.org', 'Hi there'), msg('m3', 'raj@globex.com', 'Globex question')];
const ctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, teams: { async send() { return { delivered: 0, failed: 0 }; } },
  fetch: async (cred, url) => { asked.push(url); assert.equal(cred, 'graph_mail'); return { ok: true, status: 200, json: async () => ({ value: MAIL }) }; },
  secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: { async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r) } : null; }, async put(c, k, v) { if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); }, async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: page.length === (o.limit || 50) ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl() { return { url: 'https://x/1', file_id: 'f1' }; }, async url() { return { url: 'https://x/1' }; }, async get() { throw new Error('no'); }, async delete() { } } });
const call = async (email, method, path, body) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body }, ctx(email)); return { status: r.status, data: await r.json() }; };
const sam = 'sam.k@facilio.com'; let n = 0, fails = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ok  ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };

const acme = (await call(sam, 'POST', '/api/projects', { name: 'Acme rollout', customer: 'Acme' })).data.project.id;
const globex = (await call(sam, 'POST', '/api/projects', { name: 'Globex rollout', customer: 'Globex' })).data.project.id;
await t('a customer address and a company domain are saved, in lower case', async () => { const r = await call(sam, 'PUT', `/api/projects/${acme}/mail/senders`, { emails: ['Priya@Acme.com', 'priya@acme.com'], domains: ['@Acme.com'] }); assert.equal(r.status, 200); assert.deepEqual(r.data.emails, ['priya@acme.com']); assert.deepEqual(r.data.domains, ['acme.com']); });
await t('what was saved can be read back', async () => { const r = await call(sam, 'GET', `/api/projects/${acme}/mail/senders`); assert.deepEqual(r.data.emails, ['priya@acme.com']); });
await t('a shared provider domain is refused (it would match strangers)', async () => { const r = await call(sam, 'PUT', `/api/projects/${acme}/mail/senders`, { emails: [], domains: ['gmail.com'] }); assert.equal(r.status, 400); });
await t('a malformed address is refused', async () => { const r = await call(sam, 'PUT', `/api/projects/${acme}/mail/senders`, { emails: ["x'y@acme.com"], domains: [] }); assert.equal(r.status, 400); });
await t('an address already used by another project is refused, naming that project', async () => { const r = await call(sam, 'PUT', `/api/projects/${globex}/mail/senders`, { emails: ['priya@acme.com'], domains: [] }); assert.equal(r.status, 409); assert.match(JSON.stringify(r.data), /Acme rollout/); });
await t('the search needs at least one customer address', async () => { const r = await call(sam, 'POST', `/api/projects/${globex}/mail/backfill`, { days: 30 }); assert.equal(r.status, 400); });
await call(sam, 'PUT', `/api/projects/${globex}/mail/senders`, { emails: [], domains: ['globex.com'] });
await t('the mailbox search asks Microsoft only for the listed address and the chosen number of days', async () => { const r = await call(sam, 'POST', `/api/projects/${acme}/mail/backfill`, { days: 30 }); assert.equal(r.status, 200, JSON.stringify(r.data)); const u = decodeURIComponent(asked[asked.length - 1]); assert.match(u, /from\/emailAddress\/address eq 'priya@acme\.com'/); assert.ok(!/stranger/.test(u)); });
await t('the listed customer\'s email is filed in their project; the stranger and the other customer\'s mail are not', async () => {
  const inbox = (await call(sam, 'GET', `/api/projects/${acme}/mail`)).data; assert.deepEqual((inbox.items || []).map(x => x.subject), ['Kiosk stuck']);
  const gx = (await call(sam, 'GET', `/api/projects/${globex}/mail`)).data; assert.deepEqual((gx.items || []).map(x => x.subject), ['Globex question']); });
await t('searching again does not file the same email twice', async () => { await call(sam, 'POST', `/api/projects/${acme}/mail/backfill`, { days: 30 }); const inbox = (await call(sam, 'GET', `/api/projects/${acme}/mail`)).data; assert.equal(inbox.items.length, 1); });
await t('removing every address clears the project\'s list', async () => { const r = await call(sam, 'PUT', `/api/projects/${acme}/mail/senders`, { emails: [], domains: [] }); assert.deepEqual(r.data.emails, []); });
console.log(`${n} passed, ${fails} failed`); if (fails) process.exit(1);
