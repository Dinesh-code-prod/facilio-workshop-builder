// The two AI routes of the question bank (work/server/_qbankapi.mjs) with a stand-in AI and fake project documents: what is read, what is returned, who may call them.
import assert from 'node:assert/strict'; import { installQbank } from '../work/server/_qbankapi.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
class HttpError extends Error { constructor(s, m) { super(m); this.status = s; } }
const routes = {}; const calls = []; let role = 'owner'; let limited = 0;
const docs = { msa_text: { pages: [{ n: 4, text: 'The supplier shall configure work orders and integrate with the customer ERP.' }] }, kickoff_pack: { deck: { scope: [{ text: 'Work order management' }], outOfScope: ['IoT sensors'] } },
  workshop: { modules: { workorder: { inScope: true }, asset: { inScope: false } }, requirements: [{ id: 'WO-001', title: 'Approve', objective: 'Approve first', status: 'Confirmed', modules: ['workorder'] }, { id: 'X', status: 'Rejected' }] }, rs_transcripts: { items: [{ title: 'Customer SOW', source: 'document', text: 'Customer wants SMS alerts.' }, { title: 'Call 1', source: 'upload', text: 'not a document' }] } };
const aiJSON = async (q, validate) => { calls.push(q); const body = q.messages[0].content; const data = /LIVE|finished/.test(body) ? { summary: 'They approve above 500.', answered: [{ id: 'qb_1', answer: 'Above 500', quote: 'above 500' }, { id: 'zz', answer: 'x', quote: 'y' }] } : /integration = /.test(body) ? { questions: [{ text: 'Which ERP does the customer use?', category: 'integration', ref: 'MSA p.4', priority: 'must' }] } : /module = /.test(body) ? { questions: [{ text: 'Which approvals apply to work orders?', category: 'workflow', module: 'workorder', ref: 'Contract scope' }] } : (() => { throw new Error('model down'); })(); return { data: validate(data), provider: 'deepseek' }; };
installQbank({ route: (m, p, fn) => { routes[m + ' ' + p] = fn; }, ok: x => x, HttpError, me: async () => ({ id: 'u1', email: 'a@x.com' }), projectAccess: async () => ({ role }), limit: async () => { limited++; }, aiJSON, docRead: async (pid, sec) => (docs[sec] ? { data: docs[sec] } : null) });
const gen = routes['POST /api/projects/:id/qbank/generate'], ana = routes['POST /api/projects/:id/qbank/analyse'];
await t('generate reads the contract, scope, requirements and client documents, runs the three groups, and returns cleaned questions (one group may fail)', async () => {
  const r = await gen({}, { id: 'p1' }); assert.equal(calls.length, 3); assert.equal(r.questions.length, 2); assert.equal(r.groupsFailed, 1); assert.deepEqual(r.read, { msaPages: 1, requirements: 1, documents: 1, scope: 1 }); assert.ok(limited >= 1);
  const text = calls[0].messages[0].content; assert.ok(text.includes('[MSA p.4]') && text.includes('[Contract exclusions]') && text.includes('WO-001') && text.includes('Customer SOW') && !text.includes('not a document') && text.includes('workorder (Workorder)') && !text.includes('asset ('), 'only what the project holds, only modules in scope');
  assert.equal(r.questions.find(q => q.category === 'integration').ref, 'MSA p.4'); assert.equal(r.questions.find(q => q.module === 'workorder').category, 'workflow');
});
await t('generate says what is missing when the project has nothing to read, and refuses a customer', async () => {
  const keep = { ...docs }; for (const k of Object.keys(docs)) delete docs[k]; await assert.rejects(() => gen({}, { id: 'p1' }), e => e.status === 400 && /nothing to read/.test(e.message)); Object.assign(docs, keep);
  role = 'customer'; await assert.rejects(() => gen({}, { id: 'p1' }), e => e.status === 403); await assert.rejects(() => ana({ transcript: 'x'.repeat(80) }, { id: 'p1' }), e => e.status === 403); role = 'owner';
});
await t('analyse needs a real transcript, passes the kept questions, and returns only answers for known questions', async () => {
  await assert.rejects(() => ana({ mode: 'live', transcript: 'hi' }, { id: 'p1' }), e => e.status === 400);
  const tr = 'Customer: we approve work orders above 500 with the site manager first, always.'; const r = await ana({ mode: 'live', transcript: tr, bank: [{ id: 'qb_1', text: 'Which approvals apply?', status: 'toask' }, { text: 'no id' }] }, { id: 'p1' });
  assert.equal(r.mode, 'live'); assert.equal(r.answered.length, 1); assert.equal(r.answered[0].id, 'qb_1'); assert.equal(r.summary, 'They approve above 500.'); assert.equal(r.answered[0].quoted, true); const last = calls.at(-1); assert.equal(last.op, 'extract'); assert.ok(last.messages[0].content.includes('qb_1 | Which approvals apply?') && !last.messages[0].content.includes('no id'));
  const s = await ana({ mode: 'summary', transcript: tr, bank: [] }, { id: 'p1' }); assert.equal(s.mode, 'summary');
});
console.log(n + ' question bank route checks passed');
