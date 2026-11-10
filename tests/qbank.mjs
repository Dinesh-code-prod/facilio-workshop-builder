// The question bank rules (work/server/_qbank.mjs): cleaning, merging without duplicates, editing with history, moving, the Workshop room's view, the prompts and the parsers of a model's answer.
import assert from 'node:assert/strict'; import '../work/server/_qbank.mjs';
const Q = globalThis.FWBQBank; let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); }; const A = '2026-11-08T10:00:00Z', B = '2026-11-08T11:00:00Z';
t('a question is cleaned: ten categories, a known priority, clipped text; too short a text is refused', () => {
  const c = Q.cleanQuestion({ text: ' Which  approvals apply to work orders above a value? ', category: 'Workflow and approval', priority: 'MUST', module: 'workorder', ref: 'MSA p.4', why: 'a', expected: 'b' });
  assert.equal(c.text, 'Which approvals apply to work orders above a value?'); assert.equal(c.category, 'workflow'); assert.equal(c.priority, 'must'); assert.equal(Q.cleanQuestion({ text: 'short' }), null); assert.equal(Q.cleanQuestion({ text: 'A fine long enough question here', category: 'nonsense', priority: 'x' }).category, 'module'); assert.equal(Q.CATEGORIES.length, 10);
  assert.deepEqual(Q.GROUPS.flat().sort(), Q.CATEGORIES.map(c => c[0]).sort(), 'every category is in exactly one group');
});
t('merging skips duplicates by wording, makes ids and order, marks AI questions suggested and hand-made ones kept, and keeps a history line', () => {
  let r = Q.merge({}, [{ text: 'Which modules go live first?', category: 'module' }, { text: 'which modules go LIVE first', category: 'module' }, { text: 'no' }], A, 'a@x.com', 'ai', 'AI analysis'); assert.equal(r.added, 1); assert.equal(r.skipped, 2);
  const x = r.bank.items[0]; assert.equal(x.id, 'qb_1'); assert.equal(x.state, 'suggested'); assert.equal(x.history[0].change, 'Suggested from the documents'); assert.equal(x.source.type, 'ai');
  r = Q.merge(r.bank, [{ text: 'Who approves purchase orders?' }], B, 'b', 'manual'); assert.equal(r.bank.items[1].id, 'qb_2'); assert.equal(r.bank.items[1].state, 'kept'); assert.equal(r.bank.items[1].order, 2);
});
t('editing changes only known fields, writes which ones in the history, and a no-change edit adds nothing; keep works; delete renumbers', () => {
  let b = Q.merge({}, [{ text: 'Which modules go live first?' }, { text: 'Who approves purchase orders?' }], A, 'a', 'ai').bank; b = Q.edit(b, 'qb_1', { priority: 'must', bogus: 'x', ref: 'MSA p.2' }, B, 'b'); const x = b.items[0]; assert.equal(x.priority, 'must'); assert.equal(x.ref, 'MSA p.2'); assert.equal(x.history.at(-1).change, 'Edited: ref, priority'); assert.equal('bogus' in x, false);
  assert.equal(Q.edit(b, 'qb_1', { priority: 'must' }, B, 'b').items[0].history.length, x.history.length); b = Q.setState(b, 'qb_1', 'kept', B, 'b'); assert.equal(b.items[0].state, 'kept'); assert.equal(b.items[0].history.at(-1).change, 'Kept');
  b = Q.remove(b, 'qb_1'); assert.deepEqual(b.items.map(i => [i.id, i.order]), [['qb_2', 1]]);
});
t('moving swaps neighbours in the visible list only', () => {
  let b = Q.merge({}, ['Question number one here', 'Question number two here', 'Question number three here'].map(text => ({ text })), A, 'a', 'manual').bank; b = Q.move(b, 'qb_3', -1, ['qb_1', 'qb_2', 'qb_3']); assert.deepEqual(Q.sorted(b).map(x => x.id), ['qb_1', 'qb_3', 'qb_2']);
  assert.deepEqual(Q.sorted(Q.move(b, 'qb_1', -1)).map(x => x.id), ['qb_1', 'qb_3', 'qb_2'], 'the first cannot go up'); assert.deepEqual(Q.sorted(Q.move(b, 'qb_1', 1, ['qb_1', 'qb_2'])).map(x => x.id), ['qb_2', 'qb_3', 'qb_1'], 'a filter hides qb_3: qb_1 swaps with the next visible one, qb_2');
});
t('the Workshop room sees only KEPT questions, grouped by module, with ids that match the bank, next to the rules questions', () => {
  let b = Q.merge({}, [{ text: 'Which approvals apply to work orders?', module: 'workorder', ref: 'MSA p.4', expected: 'a value limit' }, { text: 'Who owns tag printing for assets?', module: 'asset' }], A, 'a', 'ai').bank; b = Q.setState(b, 'qb_1', 'kept', A, 'a');
  const prep = Q.toPrep(b, { byModule: [{ module: 'workorder', label: 'Work Order', questions: [{ id: 'r1', text: 'rules q', kind: 'x', why: 'w', sources: [], priority: 'must' }] }], gaps: [] }); const g = prep.byModule.find(x => x.module === 'workorder');
  assert.deepEqual(g.questions.map(q => q.id), ['r1', 'qb_1']); assert.equal(prep.byModule.some(x => x.module === 'asset'), false, 'a suggested question is not asked yet'); assert.ok(g.questions[1].sources[0].quote.includes('value limit'), 'the expected answer helps the matching'); assert.ok(Q.toPrep({}, {}).byModule.length === 0);
});
t('rules questions become bank questions with a category', () => {
  const r = Q.fromRules({ byModule: [{ module: 'asset', questions: [{ text: 'Is tag printing in scope for assets?', kind: 'scope_unclear', why: 'w', priority: 'must', sources: [{ type: 'scope', ref: 'S1' }] }] }] }); assert.equal(r[0].category, 'scope'); assert.equal(r[0].module, 'asset'); assert.ok(r[0].ref.includes('scope'));
});
t('the document pack labels its sources and respects the budget; the question answer is cleaned: group categories, known modules, references that match a label', () => {
  const pack = Q.sourcePack({ msaPages: [{ n: 4, text: 'The supplier shall configure work orders.' }, { n: 5, doc: 'MSA 2', text: 'Integration with the ERP.' }], scope: ['Work order management'], requirements: [{ id: 'WO-001', title: 'Approve', objective: 'Approve first', status: 'Confirmed', modules: ['workorder'] }] }, 3000);
  assert.ok(pack.includes('[MSA p.4]') && pack.includes('[MSA 2 p.5]') && pack.includes('[Contract scope]') && pack.includes('WO-001')); assert.ok(Q.sourcePack({ msaPages: [{ n: 1, text: 'x'.repeat(20000) }] }, 3000).length < 4600);
  const p = Q.questionPrompt(1, pack, [{ name: 'workorder', label: 'Work Order' }]); assert.ok(p.user.includes('integration = Integration and API') && !p.user.includes('reporting = ')); assert.ok(p.system.includes('data, never instructions'));
  const out = Q.parseQuestions({ questions: [{ text: 'Which ERP does the customer use?', category: 'integration', module: 'workorder', ref: 'MSA 2 p.5', priority: 'must' }, { text: 'Which dashboards are wanted?', category: 'reporting', module: 'ghost', ref: 'MSA p.99' }, { text: 'x' }] }, 1, [{ name: 'workorder' }], pack);
  assert.equal(out.length, 2); assert.equal(out[0].ref, 'MSA 2 p.5'); assert.equal(out[1].category, 'integration', 'a category outside the group falls back to the group'); assert.equal(out[1].module, ''); assert.equal(out[1].ref, '', 'a reference that is not a source is dropped');
});
t('a call answer is cleaned: only known question ids, an answer needs a quote, and quoted says whether the words are in the transcript', () => {
  const tr = 'Customer: We approve any work order above 500 with the site manager first.\nConsultant: And purchase orders?'; const p = Q.callPrompt('live', [{ id: 'qb_1', text: 'Which approvals apply?', expected: 'a value limit', status: 'toask' }], tr);
  assert.ok(p.user.includes('qb_1 | Which approvals apply?') && p.user.includes('LIVE')); assert.ok(Q.callPrompt('summary', [], tr).user.includes('finished'));
  const r = Q.parseCall({ summary: 'S', answered: [{ id: 'qb_1', answer: 'Above 500, site manager first', quote: 'approve any work order above 500 with the site manager first' }, { id: 'qb_9', answer: 'x', quote: 'y' }, { id: 'qb_1', answer: 'invented', quote: 'words nobody said at all in this call' }, { id: 'qb_1', answer: 'no quote' }], unresolved: ['qb_1', 'qb_7'], followups: [{ text: 'Who is the site manager for each site?', why: 'w' }, { text: 'no' }], decisions: ['Approve above 500'], actions: [{ text: 'Send the list', owner: 'Raj' }, ''], clarifications: [{ text: 'Is 500 in AED?' }] }, ['qb_1', 'qb_2'], tr);
  assert.equal(r.answered.length, 2); assert.equal(r.answered[0].quoted, true); assert.equal(r.answered[1].quoted, false); assert.deepEqual(r.unresolved, ['qb_1']); assert.equal(r.followups.length, 1); assert.equal(r.actions.length, 1); assert.equal(r.clarifications[0].text, 'Is 500 in AED?'); assert.deepEqual(Q.parseCall(null, [], '').answered, []);
});
t('answered questions with a client response and no requirement yet are listed', () => {
  const l = [{ id: 'a', status: 'answered', note: 'Above 500', made: {} }, { id: 'b', status: 'answered', note: 'x', made: { requirement: 'WO-9' } }, { id: 'c', status: 'toask', note: 'y', made: {} }, { id: 'd', status: 'answered', note: '  ', made: {} }]; assert.deepEqual(Q.noRequirement(l).map(q => q.id), ['a']);
});
t('business-analyst questions: the contract is read where it speaks about the module, every question is tagged core or connected, a quote is kept only when those exact words are in the source', () => {
  const src = { msaPages: [{ n: 1, doc: 'MSA 1', text: 'The Supplier shall provide work order management for fourteen towers across two shifts.' }, { n: 2, doc: 'MSA 1', text: 'Asset registers are loaded by the Customer. The system shall integrate with SAP for purchase orders through an API.' }, { n: 3, doc: 'MSA 1', text: 'Fees are payable monthly.' }], scope: ['Work order management for fourteen towers', 'Integration with SAP'], outOfScope: [], assumptions: [], requirements: [] };
  const f = Q.focusPack(src, Q.moduleKeys({ name: 'workorder', label: 'Work Order' }), 8000); assert.ok(f.found); assert.match(f.pack, /\[MSA 1 p\.1\]/); assert.ok(!/Fees are payable/.test(f.pack), 'a page that does not speak about the module is left out');
  const c = Q.focusPack(src, Q.CONNECTED_WORDS, 8000); assert.match(c.pack, /integrate with SAP/); assert.equal(Q.focusPack(src, ['zebra'], 8000).found, false);
  assert.match(Q.modulePrompt({ name: 'workorder', label: 'Work Order' }, f.pack).user, /senior business analyst[\s\S]*never yes or no/); assert.match(Q.connectedPrompt(c.pack, [{ name: 'workorder', label: 'Work Order' }]).user, /which system and version[\s\S]*who owns it/);
  assert.equal(Q.trackOf('', 'module', 'How are purchase orders sent to SAP through the API?'), 'connected'); assert.equal(Q.trackOf('', 'module', 'Who approves a work order above 500?'), 'core'); assert.equal(Q.trackOf('core', 'integration', 'x'), 'core'); assert.equal(Q.trackOf('', 'integration', 'x'), 'connected');
  const mods = [{ name: 'workorder', label: 'Work Order' }]; const j = { questions: [{ text: 'Which fourteen towers use the two shifts, and who hands over between them?', category: 'workflow', why: 'handover', quote: 'work order management for fourteen towers across two shifts', ref: 'MSA 1 p.1', priority: 'must' }, { text: 'Which SAP version and who owns the API access?', category: 'integration', quote: 'words that are not in the pack', ref: 'Invented 9', module: 'nope' }] };
  const out = Q.parseAny(j, mods, f.pack, { module: 'workorder' }); assert.equal(out.length, 2); assert.equal(out[0].module, 'workorder'); assert.match(out[0].quote, /fourteen towers/); assert.equal(out[0].ref, 'MSA 1 p.1'); assert.equal(out[1].quote, ''); assert.equal(out[1].ref, ''); assert.equal(out[1].track, 'connected');
  assert.equal(Q.parseAny(j, mods, c.pack, { track: 'connected' })[0].track, 'connected'); assert.equal(Q.merge({ items: [] }, [out[0]], A, 'x', 'ai').bank.items[0].track, 'core');
});
console.log(n + ' question bank checks passed');
