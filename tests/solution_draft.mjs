// AI draft of one solution area from the project's own records (POST /api/projects/:id/solution/draft in work/server/_qbankapi.mjs) and the sessions block of the context pack (work/server/_solctx.mjs):
// what the AI is given, what comes back, who may call it, and that a bad key or a failing AI cannot write anything.
import assert from 'node:assert/strict'; import { installQbank } from '../work/server/_qbankapi.mjs'; import { buildContext } from '../work/server/_solctx.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
class HttpError extends Error { constructor(s, m) { super(m); this.status = s; } }
const routes = {}; const calls = []; let role = 'owner'; let failAi = false;
const docs = {
  workshop: { modules: { workorder: { label: 'Work Order', inScope: true, purpose: 'Run corrective work' } }, requirements: [{ id: 'WO-001', title: 'Two-level approval', objective: 'Approve work orders above 500 in two levels', status: 'Confirmed', modules: ['workorder'], rules: 'Supervisor then site manager' }] },
  rs_questions: { items: [{ id: 'q1', text: 'Who approves a work order above 500?', category: 'workflow', module: 'workorder', priority: 'must', state: 'kept' }, { id: 'q2', text: 'Which statuses does a work order have?', category: 'workflow', module: 'workorder', priority: 'should', state: 'kept' }, { id: 'q3', text: 'Is an ERP in scope?', category: 'integration', priority: 'must', state: 'kept' }], summaries: [{ at: '2026-11-06', decisions: ['Approvals above 500 need two levels.'], assumptions: ['Assets are loaded first.'], dependencies: [] }] },
  workshop_room: { q: { q1: { status: 'answered', note: 'Supervisor, then the site manager.' }, q2: { status: 'asked' } } },
  solutions: { items: { 'module:workorder': { text: 'Orders are approved by value.', status: 'Draft', rows: [{ cells: { topic: 'Approvals', solution: 'By value' } }] } } },
  design_proposals: { items: [] }, rs_findings: { items: [] }, kickoff_pack: { deck: { scope: [{ text: 'Work order management' }] } } };
const aiJSON = async (q, validate) => { calls.push(q); if (failAi) throw new HttpError(502, 'The AI is not available'); return { data: validate({ proposals: [{ area: 'module:workorder', name: 'Work Order', text: 'Work orders above 500 need two approval levels: supervisor, then site manager.', rows: [{ cells: { topic: 'Approvals', solution: 'Two levels: supervisor, then site manager', who: 'Supervisor, site manager', reqs: 'WO-001' }, status: 'Agreed' }, { cells: { topic: 'Statuses', solution: 'To be confirmed' }, status: 'Open question' }], why: 'The client answered who approves', quote: 'Supervisor, then the site manager' }, { area: 'module:other', name: 'Other', text: 'not asked for', rows: [] }] }), provider: 'test' }; };
installQbank({ route: (m, p, fn) => { routes[m + ' ' + p] = fn; }, ok: x => x, HttpError, me: async () => ({ id: 'u1', email: 'a@x.com' }), projectAccess: async () => ({ role }), limit: async () => { }, aiJSON, docRead: async (pid, sec) => (docs[sec] ? { data: docs[sec] } : null), itemsOf: async () => [{ data: { name: 'Approval time', module: 'workorder', target: 24, unit: 'h', solution: 'Dashboard widget' } }] });
const draft = routes['POST /api/projects/:id/solution/draft'];
await t('the AI is given the area\'s records: the requirement, the written solution, the KPI, the client\'s answer, the unanswered question and the session decision', async () => {
  const r = await draft({ key: 'module:workorder' }, { id: 'p1' }); assert.equal(calls.length, 1); const body = calls[0].messages[0].content;
  for (const s of ['WO-001', 'Orders are approved by value.', 'Approval time', 'Supervisor, then the site manager.', 'Which statuses does a work order have?', 'Approvals above 500 need two levels.', 'THE DOCUMENT BELOW IS NOT A CUSTOMER FILE', 'never invent']) assert.ok(body.includes(s), s);
  assert.ok(!body.includes('Is an ERP in scope?'), 'a question of another area stays out of this module\'s records'); assert.ok(calls[0].op === 'extract');
  assert.equal(r.proposals.length, 1); assert.equal(r.proposals[0].module, 'module:workorder'); assert.equal(r.proposals[0].rows.length, 2); assert.equal(r.proposals[0].rows[1].status, 'Open question'); assert.equal(r.provider, 'test'); assert.equal(r.truncated, false);
});
await t('only the asked-for area comes back, and the answer is a proposal (nothing is saved by the route)', async () => { const r = await draft({ key: 'module:workorder' }, { id: 'p1' }); assert.ok(r.proposals.every(p => p.module === 'module:workorder')); assert.ok(!Object.keys(r).includes('saved')); });
await t('a bad area key, the customer role and a failing AI are refused without drafting anything', async () => {
  await assert.rejects(draft({ key: '../x' }, { id: 'p1' }), e => e.status === 400); await assert.rejects(draft({}, { id: 'p1' }), e => e.status === 400);
  role = 'customer'; const before = calls.length; await assert.rejects(draft({ key: 'module:workorder' }, { id: 'p1' }), e => e.status === 403); assert.equal(calls.length, before); role = 'owner';
  failAi = true; await assert.rejects(draft({ key: 'module:workorder' }, { id: 'p1' }), e => e.status === 502); failAi = false;
});
await t('the context pack carries the sessions block for a module and for an area by its question category', () => {
  const m = buildContext('module:workorder', { workshop: docs.workshop, bank: docs.rs_questions, room: docs.workshop_room, solutions: docs.solutions }).sessions;
  assert.deepEqual(m.answeredQuestions, [{ question: 'Who approves a work order above 500?', response: 'Supervisor, then the site manager.' }]); assert.deepEqual(m.unansweredQuestions, ['Which statuses does a work order have?']); assert.deepEqual(m.decisions, ['Approvals above 500 need two levels.']); assert.deepEqual(m.assumptions, ['Assets are loaded first.']);
  const i = buildContext('area:integrations', { workshop: docs.workshop, bank: docs.rs_questions, room: docs.workshop_room, solutions: docs.solutions }).sessions; assert.deepEqual(i.unansweredQuestions, ['Is an ERP in scope?']); assert.equal(i.answeredQuestions.length, 0);
  assert.deepEqual(buildContext('module:workorder', {}).sessions.answeredQuestions, []);
});
console.log(n + ' AI solution draft checks passed');
