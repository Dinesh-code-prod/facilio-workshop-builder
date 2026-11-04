// Questions-to-ask engine (work/server/_sessionquestions.mjs): each rule fires on crafted input and cites its sources, nothing is made up, ids are stable, liveAsk is careful.
import assert from 'node:assert/strict'; import '../work/server/_sessionquestions.mjs';
const Q = globalThis.FWBSessionQuestions;   // the one copy of the rules; it sets this global when it is loaded as a module
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const all = p => [].concat(...p.byModule.map(g => g.questions));
const kind = (p, k) => all(p).filter(q => q.kind === k);
const hasSrc = (q, type, ref) => q.sources.some(s => s.type === type && (ref === undefined || s.ref === ref));
const input = () => ({
  modules: [
    { name: 'workorder', label: 'Work Order', scopeItems: [{ id: 's1', text: 'Preventive maintenance scheduling', status: 'confirmed' }, { id: 's2', text: 'Emergency dispatch by SMS', status: 'unclear' }, { id: 's3', text: 'Contractor invoicing portal', status: 'excluded' }, { id: 's4', text: 'Needs Inventory stock levels before closing', status: 'confirmed' }],
      requirements: [{ id: 'R1', text: 'Contractor invoicing portal for vendors to upload invoices', status: 'Draft' }, { id: 'R2', text: 'Technicians close needs inventory stock levels check', status: 'Confirmed', owner: 'Ops lead', acceptance: 'Given a closed order then stock is reduced' }, { id: 'R9', text: 'Dropped idea about invoicing portal', status: 'Rejected' }],
      openQuestions: [{ id: 'q1', text: 'Who approves emergency overtime?', from: 'customer', status: 'open' }, { id: 'q2', text: 'Which SLA clock applies to vendors?', from: 'facilio', status: 'open' }, { id: 'q3', text: 'Old settled question', from: 'customer', status: 'answered' }],
      decisions: [{ id: 'd1', text: 'Single or multi-site approval chain', status: 'pending' }], onboardingData: [{ id: 'o1', text: 'List of technicians with skills', status: 'requested' }, { id: 'o2', text: 'Site list', status: 'confirmed' }] },
    { name: 'inventory', label: 'Inventory', scopeItems: [{ id: 'i1', text: 'Spare part stock levels', status: 'confirmed' }], requirements: [{ id: 'R3', text: 'Track spare part stock levels per store', status: 'Confirmed', owner: 'Stores manager', acceptance: 'Stock accuracy at least 98%' }], openQuestions: [] }
  ],
  exclusions: ['Integration with third party payroll systems is not included in the scope of this Agreement.'],
  sessions: [{ id: 'ss1', module: 'inventory', date: '2026-11-10', done: false }],
  statements: [{ speaker: 'Priya', at: '00:12:30', text: 'Preventive maintenance scheduling happens monthly for all plants', ref: 'tr1' }]
});

t('empty or missing input gives nothing and a gaps list, never an invented question', () => {
  [undefined, null, {}, { modules: [] }, { modules: 'x' }, 5, []].forEach(i => { const p = Q.prepareQuestions(i); assert.deepEqual(p.byModule, []); assert.ok(p.gaps.some(g => g.code === 'no_modules')); });
  const p = Q.prepareQuestions({ modules: [{ name: 'asset' }] }); assert.equal(all(p).length, 0); assert.ok(p.gaps.some(g => g.code === 'no_scope_items')); });
t('a confirmed scope item with no requirement raises a must-ask that cites the scope item', () => {
  const q = kind(Q.prepareQuestions(input()), 'scope_no_requirement').find(x => hasSrc(x, 'scope', 's1')); assert.ok(q); assert.equal(q.priority, 'must'); assert.equal(q.sources[0].quote, 'Preventive maintenance scheduling'); assert.ok(q.why.includes('Preventive maintenance')); });
t('an unclear scope item is clarified; a confirmed item that has a requirement is not asked about', () => {
  const p = Q.prepareQuestions(input()); assert.ok(kind(p, 'scope_unclear').some(x => hasSrc(x, 'scope', 's2')));
  assert.ok(!kind(p, 'scope_no_requirement').some(x => hasSrc(x, 'scope', 'i1'))); });
t('an excluded scope item that a requirement mentions is a conflict citing both, ignoring rejected requirements', () => {
  const c = kind(Q.prepareQuestions(input()), 'conflict').filter(q => hasSrc(q, 'scope', 's3')); assert.equal(c.length, 1); assert.ok(hasSrc(c[0], 'requirement', 'R1')); assert.ok(!hasSrc(c[0], 'requirement', 'R9')); assert.equal(c[0].priority, 'must'); });
t('an MSA exclusion sentence that a requirement matches is a conflict citing the clause', () => {
  const inp = input(); inp.modules[1].requirements.push({ id: 'R4', text: 'Payroll systems integration for technician overtime', status: 'Draft' });
  const c = kind(Q.prepareQuestions(inp), 'conflict').filter(q => hasSrc(q, 'exclusion')); assert.equal(c.length, 1); assert.ok(hasSrc(c[0], 'requirement', 'R4')); assert.ok(/payroll/i.test(c[0].sources.find(s => s.type === 'exclusion').quote)); assert.ok(/not a contract decision/.test(c[0].why)); });
t('unanswered open questions are asked for both sides with who owes the answer; answered ones are not', () => {
  const o = kind(Q.prepareQuestions(input()), 'open_question'); assert.equal(o.length, 2); assert.ok(o.find(q => hasSrc(q, 'openQuestion', 'q1')).text.startsWith('Customer to answer')); assert.ok(o.find(q => hasSrc(q, 'openQuestion', 'q2')).text.startsWith('Facilio to answer')); assert.ok(!o.some(q => hasSrc(q, 'openQuestion', 'q3'))); });
t('a requirement without an owner or acceptance wording is asked about; a complete one is not', () => {
  const g = kind(Q.prepareQuestions(input()), 'requirement_gap'); const r1 = g.find(q => hasSrc(q, 'requirement', 'R1')); assert.ok(r1 && /owner/.test(r1.why) && /acceptance/.test(r1.why)); assert.ok(!g.some(q => hasSrc(q, 'requirement', 'R2') || hasSrc(q, 'requirement', 'R3'))); });
t('a module in scope with no planned session is asked about; none is claimed when sessions were not supplied', () => {
  const p = Q.prepareQuestions(input()); const s = kind(p, 'no_session'); assert.equal(s.length, 1); assert.ok(hasSrc(s[0], 'module', 'workorder'));
  const inp = input(); delete inp.sessions; const p2 = Q.prepareQuestions(inp); assert.equal(kind(p2, 'no_session').length, 0); assert.ok(p2.gaps.some(g => g.code === 'sessions_not_supplied'));
  const inp3 = input(); inp3.sessions = [{ module: 'workorder', status: 'cancelled' }, { modules: ['inventory'], status: 'planned' }]; assert.equal(kind(Q.prepareQuestions(inp3), 'no_session').length, 1); });
t('a pending decision and unconfirmed onboarding data are asked about, confirmed data is not', () => {
  const p = Q.prepareQuestions(input()); assert.ok(kind(p, 'decision_pending').some(q => hasSrc(q, 'decision', 'd1'))); const o = kind(p, 'onboarding_data'); assert.equal(o.length, 1); assert.ok(hasSrc(o[0], 'onboardingData', 'o1')); });
t('a dependency is found only when a module name appears in another module\'s scope text', () => {
  const d = kind(Q.prepareQuestions(input()), 'dependency'); assert.equal(d.length, 1); assert.ok(hasSrc(d[0], 'scope', 's4') && hasSrc(d[0], 'module', 'inventory'));
  const inp = input(); inp.modules[0].scopeItems = inp.modules[0].scopeItems.filter(x => x.id !== 's4'); assert.equal(kind(Q.prepareQuestions(inp), 'dependency').length, 0); });
t('an earlier spoken statement is quoted as context with speaker and time, and never creates a question or requirement', () => {
  const p = Q.prepareQuestions(input()); const q = kind(p, 'scope_no_requirement').find(x => hasSrc(x, 'scope', 's1')); const st = q.sources.find(s => s.type === 'statement'); assert.equal(st.speaker, 'Priya'); assert.equal(st.at, '00:12:30'); assert.ok(st.quote.includes('monthly'));
  const only = Q.prepareQuestions({ modules: [{ name: 'asset' }], statements: [{ speaker: 'A', text: 'We need a full asset hierarchy with parent child relations' }] }); assert.equal(all(only).length, 0); });
t('every question has an id, text, kind, a reason, priority and at least one source', () => {
  const qs = all(Q.prepareQuestions(input())); assert.ok(qs.length >= 9); qs.forEach(q => { assert.match(q.id, /^sq_/); assert.ok(q.text && q.why && q.sources.length); assert.ok(['must', 'should', 'could'].includes(q.priority)); }); assert.equal(new Set(qs.map(q => q.id)).size, qs.length); });
t('ids and order are stable across runs and input order; the same trigger twice gives one question', () => {
  const a = Q.prepareQuestions(input()); const b = Q.prepareQuestions(input()); assert.deepEqual(a, b);
  const r = input(); r.modules.reverse(); r.modules[1].scopeItems.reverse(); r.modules[1].openQuestions.reverse(); assert.deepEqual(all(Q.prepareQuestions(r)).map(q => q.id).sort(), all(a).map(q => q.id).sort()); assert.deepEqual(Q.prepareQuestions(r).byModule.map(g => g.module), a.byModule.map(g => g.module));
  const d = input(); d.modules[0].openQuestions.push({ id: 'q1', text: 'Who approves emergency overtime?', from: 'customer', status: 'open' }); assert.equal(kind(Q.prepareQuestions(d), 'open_question').length, 2);
  a.byModule.forEach(g => { const rank = g.questions.map(q => ({ must: 0, should: 1, could: 2 })[q.priority]); assert.deepEqual(rank, rank.slice().sort((x, y) => x - y)); }); });
t('hostile input (wrong types, huge strings, missing arrays, nulls) does not throw', () => {
  const big = 'x'.repeat(2e6); const bad = [{ modules: [null, 1, 'a', [], { name: 5, scopeItems: 'no', requirements: {}, openQuestions: [null, 7, { text: big }], exclusions: [1, null, { text: big }] }, { name: big, scopeItems: [{ text: big, status: 5 }], requirements: [{ id: {}, text: big }], sessions: 9 }], sessions: 'x', statements: [null, 3, { text: big }], exclusions: 4 }, { modules: [{ name: 'a', scopeItems: [{ text: 'alpha beta gamma', status: 'confirmed' }], requirements: [{ text: [1, 2] }] }], sessions: {}, statements: {} }];
  bad.forEach(i => { const p = Q.prepareQuestions(i); assert.ok(Array.isArray(p.byModule) && Array.isArray(p.gaps)); JSON.stringify(p); });
  const p = Q.prepareQuestions(bad[0]); all(p).forEach(q => assert.ok(q.text.length < 2000 && q.sources.every(s => !s.quote || s.quote.length <= 240)));
  [undefined, null, 'x', 5, {}, { byModule: 'x' }, { byModule: [null, { questions: 3 }] }].forEach(pp => [undefined, null, 'a\nb', 5, [null, 1, { text: big }], {}].forEach(tr => { const r = Q.liveAsk(pp, tr, null); assert.ok(Array.isArray(r.answered) && Array.isArray(r.stillOpen) && Array.isArray(r.nextSuggested)); })); });

const prepared = Q.prepareQuestions(input());
t('liveAsk marks a question answered with evidence (speaker, time, quote) and never above "likely"', () => {
  const tr = [{ speaker: 'Rahul', at: '00:01:10', text: 'Hello everyone, shall we begin?' }, { speaker: 'Priya', at: '00:14:02', text: 'For preventive maintenance scheduling we run it monthly per plant, and the planner owns the schedule.' }];
  const r = Q.liveAsk(prepared, tr); const id = all(prepared).find(q => q.kind === 'scope_no_requirement' && hasSrc(q, 'scope', 's1')).id; const a = r.answered.find(x => x.id === id); assert.ok(a); assert.equal(a.confidence, 'likely'); assert.equal(a.evidence.speaker, 'Priya'); assert.equal(a.evidence.at, '00:14:02'); assert.ok(a.evidence.quote.includes('monthly')); assert.ok(!r.stillOpen.includes(id)); assert.ok(r.answered.every(x => ['possible', 'likely'].includes(x.confidence))); });
t('liveAsk does not answer from chunks with no overlap, from the question being asked, or from a single shared word', () => {
  const none = Q.liveAsk(prepared, [{ speaker: 'A', at: '1', text: 'The weather in Chennai is lovely and the lunch was great today' }]); assert.equal(none.answered.length, 0); assert.equal(none.stillOpen.length, all(prepared).length);
  const asked = Q.liveAsk(prepared, [{ speaker: 'Rahul', at: '2', text: 'Can we confirm preventive maintenance scheduling for all plants?' }]); assert.ok(!asked.answered.some(x => hasSrc(all(prepared).find(q => q.id === x.id), 'scope', 's1')));
  const one = Q.liveAsk(prepared, [{ speaker: 'A', at: '3', text: 'Scheduling is hard to get right in practice for everybody involved' }]); assert.equal(one.answered.length, 0);
  assert.equal(Q.liveAsk({ byModule: [] }, [{ text: 'anything at all here' }]).answered.length, 0); });
t('liveAsk gives a weaker "possible" for partial overlap and suggests at most 3 open questions with a reason, must-asks first', () => {
  const r = Q.liveAsk(prepared, [{ speaker: 'Priya', at: '9', text: 'Maintenance happens on Mondays for the plants in the north region' }]); assert.ok(r.nextSuggested.length <= 3 && r.nextSuggested.length > 0); r.nextSuggested.forEach(s => { assert.ok(r.stillOpen.includes(s.id)); assert.ok(s.why); });
  const byId = new Map(all(prepared).map(q => [q.id, q])); assert.equal(byId.get(r.nextSuggested[0].id).priority, 'must'); r.answered.forEach(a => assert.ok(a.confidence === 'possible' || a.confidence === 'likely')); });
t('liveAsk runs 2,000 chunks in under 500 ms', () => {
  const words = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu maintenance scheduling stock levels invoices'.split(' '); const tr = []; for (let i = 0; i < 2000; i++) tr.push({ speaker: 'S' + (i % 3), at: String(i), text: Array.from({ length: 25 }, (_, k) => words[(i * 7 + k * 3) % words.length]).join(' ') + '.' });
  const t0 = process.hrtime.bigint(); const r = Q.liveAsk(prepared, tr); const ms = Number(process.hrtime.bigint() - t0) / 1e6; assert.ok(Array.isArray(r.answered)); assert.ok(ms < 500, 'took ' + ms.toFixed(0) + ' ms'); });
t('the plain-text agenda lists every question with its reason and sources', () => {
  const txt = Q.agendaText(prepared, 'Workshop'); all(prepared).forEach(q => assert.ok(txt.includes(q.text) && txt.includes(q.why))); assert.ok(/Source: scope s1/.test(txt)); assert.equal(Q.agendaText(null).length > 0, true); });
console.log(`\n${n} session question checks passed`);
