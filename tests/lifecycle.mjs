// Requirements-to-delivery lifecycle (server side): what each AI-drafted deliverable is given, using controlled fixtures.
// Requirements in three states (Confirmed, Draft suggestion, Rejected), an unanswered customer question, and change requests in
// three states (Proposed, Rejected, Approved). Checks that BRD, UAT, FTR and user-guide drafts receive approved information as
// approved, unapproved information only when clearly labelled as not approved, and rejected information not at all; that a change
// request never reaches a draft as approved unless it is approved; and that the draft is saved unapproved.
// Usage: node tests/lifecycle.mjs   (exit code 1 on failure). Uses a mock of the platform; no real model is called.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(); let prompts = [];
const ctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, teams: { async send() { return { delivered: 0, failed: 0 }; } }, fetch: async () => { throw new Error('no'); }, secrets: { async get() { throw new Error('no secret'); } },
  llm: async ({ messages }) => { prompts.push(messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n')); return { model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1].' } }] }; },
  db: { async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r) } : null; }, async put(c, k, v) { if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); }, async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl() { return { url: 'https://x/1', file_id: 'f1' }; }, async url() { return { url: 'https://x/1' }; }, async get() { throw new Error('no'); }, async delete() { } } });
const call = async (email, method, path, body) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body }, ctx(email)); return { status: r.status, data: await r.json() }; };
const sam = 'sam.k@facilio.com'; let n = 0, fails = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ok  ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };

const pid = (await call(sam, 'POST', '/api/projects', { name: 'Lifecycle', customer: 'Acme' })).data.project.id;
const ws = { requirements: [
  { id: 'REQ-001', title: 'Permits need two approval levels', objective: 'Supervisor then HSE manager approve every hot-work permit', status: 'Confirmed', modules: ['permit'] },
  { id: 'REQ-002', title: 'Auto-close permits after 30 days', objective: 'Suggested in passing, not agreed', status: 'Draft', modules: ['permit'] },
  { id: 'REQ-003', title: 'Send SMS alerts to contractors', objective: 'Customer declined SMS', status: 'Rejected', modules: ['permit'] }],
  questions: [{ id: 'Q1', text: 'Does a supervisor sign-off replace the HSE approval at night?', status: 'open', area: 'Permit' }] };
assert.equal((await call(sam, 'PUT', `/api/projects/${pid}/docs/workshop`, { data: ws, baseVersion: 0 })).status, 200);
for (const [id, d] of [['cr1', { n: 1, title: 'Add a visitor module', status: 'Proposed', mod: 'visitor' }], ['cr2', { n: 2, title: 'Remove the asset module', status: 'Rejected', mod: 'asset' }], ['cr3', { n: 3, title: 'Add escalation after 4 hours', status: 'CR Converted', mod: 'permit' }]])
  assert.ok((await call(sam, 'PUT', `/api/projects/${pid}/items/cr/${id}`, { data: d })).status < 300);
await call(sam, 'PUT', `/api/projects/${pid}/items/decision/d1`, { data: { title: 'Two approval levels agreed', status: 'Agreed' } });
const draft = async task => { prompts = []; const r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task }); assert.equal(r.status, 201, JSON.stringify(r.data)); return { item: r.data.item, prompt: prompts.join('\n') }; };
// the text of a requirement or change request, and the 80 characters around it (to see how it is labelled)
const around = (p, s) => { const i = p.indexOf(s); return i < 0 ? '' : p.slice(Math.max(0, i - 220), i + s.length + 80); };

for (const task of ['brd', 'uat', 'ftr', 'guide']) {
  await t(`${task}: the confirmed requirement is given as confirmed`, async () => { const { prompt } = await draft(task); assert.ok(prompt.includes('Permits need two approval levels'), 'confirmed requirement missing'); assert.match(around(prompt, 'Permits need two approval levels'), /CONFIRMED|"Confirmed"/); });
  await t(`${task}: a draft (unagreed) requirement is not given as a requirement`, async () => { const { prompt } = await draft(task); const a = around(prompt, 'Auto-close permits after 30 days'); assert.ok(!a || /NOT (YET )?(CONFIRMED|APPROVED)/.test(a), 'draft requirement present without a not-confirmed label: …' + a.slice(-160)); });
  await t(`${task}: a rejected requirement is left out`, async () => { const { prompt } = await draft(task); assert.ok(!prompt.includes('Send SMS alerts to contractors'), 'rejected requirement was sent'); });
  await t(`${task}: the unanswered question is marked unresolved`, async () => { const { prompt } = await draft(task); const a = around(prompt, 'supervisor sign-off replace'); assert.ok(!a || /UNRESOLVED|"open"/.test(a), 'question present without an open/unresolved label'); });
  await t(`${task}: change requests reach the draft only with their decision; rejected ones are left out`, async () => { const { prompt } = await draft(task); assert.ok(!prompt.includes('Remove the asset module'), 'rejected CR was sent'); const a = around(prompt, 'Add a visitor module'); assert.ok(!a || /NOT APPROVED|"Proposed"/.test(a), 'proposed CR present without its status'); });
}
await t('brd: an approved change request (CR Converted) is given to the BRD draft as agreed scope', async () => { const { prompt } = await draft('brd'); assert.match(around(prompt, 'Add escalation after 4 hours'), /APPROVED change request/); });
await t('uat: an approved change request is given to the UAT draft', async () => { const { prompt } = await draft('uat'); assert.ok(prompt.includes('Add escalation after 4 hours'), 'approved CR is not a UAT source'); });
await t('every AI draft is saved as an unapproved draft', async () => { const { item } = await draft('brd'); assert.equal(item.data.status, 'draft'); });
await t('the gaps check still sees draft requirements and the open question (it exists to find them)', async () => { const { prompt } = await draft('gaps'); assert.ok(prompt.includes('Auto-close permits after 30 days') && prompt.includes('supervisor sign-off replace')); });
await t('UAT guide section: confirmed requirements and approved changes only; drafts labelled; rejected and unapproved changes left out', async () => {
  prompts = []; const r = await call(sam, 'POST', `/api/projects/${pid}/ai/guide-section`, { kind: 'uat', title: 'Test scenarios', sources: { reqs: true, crs: true, usecases: true } }); assert.equal(r.status, 200, JSON.stringify(r.data)); const pr = prompts.join('\n');
  assert.match(pr, /ONE SECTION of a UAT guide/); assert.match(around(pr, 'Permits need two approval levels'), /CONFIRMED REQUIREMENTS/);
  const a = around(pr, 'Auto-close permits after 30 days'); assert.ok(!a || /NOT YET CONFIRMED/.test(a)); assert.ok(!pr.includes('Send SMS alerts to contractors'), 'rejected requirement');
  assert.ok(pr.includes('Add escalation after 4 hours'), 'approved CR is a source'); assert.ok(!pr.includes('Remove the asset module') && !pr.includes('Add a visitor module'), 'rejected or unapproved CR was sent'); });
// change request decisions: who may record them (the statuses the page really writes)
const ed = 'ed.one@facilio.com'; await call(sam, 'POST', `/api/projects/${pid}/members`, { email: ed, role: 'editor' });
await t('an editor cannot approve a change request (CR Converted is a decision)', async () => { const r = await call(ed, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'Add a visitor module', status: 'CR Converted', mod: 'visitor' } }); assert.equal(r.status, 403, String(r.status)); });
await t('an editor cannot decline one either', async () => { const r = await call(ed, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'Add a visitor module', status: 'Rejected', mod: 'visitor' } }); assert.equal(r.status, 403); });
await t('an editor can still edit an undecided change request', async () => { const r = await call(ed, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'Add a visitor module (v2)', status: 'Proposed', mod: 'visitor' } }); assert.ok(r.status < 300); });
await t('the owner approves; an editor may then mark it delivered', async () => { let r = await call(sam, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'Add a visitor module (v2)', status: 'CR Converted', mod: 'visitor' } }); assert.ok(r.status < 300); r = await call(ed, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'Add a visitor module (v2)', status: 'Delivered', mod: 'visitor' } }); assert.ok(r.status < 300, String(r.status)); });
await t('an editor cannot reopen a decided change request', async () => { const r = await call(ed, 'PUT', `/api/projects/${pid}/items/cr/cr1`, { data: { n: 1, title: 'x', status: 'Proposed', mod: 'visitor' } }); assert.equal(r.status, 403); });
console.log(`${n} passed, ${fails} failed`); if (fails) process.exit(1);
