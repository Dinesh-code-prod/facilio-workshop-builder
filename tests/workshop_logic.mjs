// Workshop room logic (src/workshoplogic.js): the question list with the person's status and notes, the live merge (never certain, never changes a status),
// and the draft records for the quick-capture buttons (always unapproved, always with their source). Uses the real question rules and the real transcript parser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../work/server/_sessionquestions.mjs';
const require = createRequire(import.meta.url);
const L = require('../src/workshoplogic.js'); const TP = require('../src/transcriptparse.js');
const Q = globalThis.FWBSessionQuestions;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const input = () => ({ modules: [{ name: 'workorder', label: 'Work Order', scopeItems: [{ id: 's1', text: 'Preventive maintenance scheduling for all plants', status: 'confirmed' }, { id: 's2', text: 'Emergency dispatch by SMS', status: 'unclear' }], requirements: [], openQuestions: [{ id: 'q1', text: 'Who approves emergency overtime?', from: 'customer', status: 'open' }] },
  { name: 'inventory', label: 'Inventory', scopeItems: [{ id: 'i1', text: 'Spare part stock levels per store', status: 'confirmed' }], requirements: [], openQuestions: [] }], exclusions: [], sessions: [], statements: [] });
const prepared = () => Q.prepareQuestions(input());
const list0 = () => L.questionList(prepared(), {}, {});
const by = (list, kind) => list.find(q => q.kind === kind && /Preventive|stock/.test(q.sources.map(s => s.quote || '').join(' ')));

t('questionList flattens by module, keeps ids, default status is to ask', () => {
  const l = list0(); assert.ok(l.length >= 3); assert.ok(l.every(q => q.id.startsWith('sq_') && q.status === 'toask' && q.live === null && q.note === ''));
  assert.deepEqual(L.counts(l), Object.assign({ total: l.length, toask: l.length, asked: 0, answered: 0, skipped: 0, possible: 0, likely: 0 }, {}));
  assert.deepEqual(L.questionList(null, null, null), []); assert.deepEqual(L.questionList({ byModule: 'x' }, 5, 5), []);
});
t('status and note come back through the notes document, and unknown statuses are refused', () => {
  const l = list0(); const doc = {}; const id = l[0].id;
  L.setNote(doc, id, { status: 'asked', note: 'Line one\nline two' }, 'Sam', '2026-11-05T10:00:00Z'); L.setNote(doc, l[1].id, { status: 'banana' }, 'Sam', 'x');
  const l2 = L.questionList(prepared(), doc, {}); assert.equal(l2[0].status, 'asked'); assert.equal(l2[0].note, 'Line one\nline two'); assert.equal(l2[1].status, 'toask');
  assert.equal(doc.q[id].by, 'Sam'); assert.equal(L.counts(l2).asked, 1);
  assert.equal(L.setNote(doc, '__proto__', { status: 'asked' }), null); assert.equal(L.setNote(doc, '', { status: 'asked' }), null); assert.equal({}.status, undefined);
  const hostile = JSON.parse('{"q":{"__proto__":{"status":"answered"},"' + id + '":{"status":"answered","note":5,"made":"x"}}}'); const l3 = L.questionList(prepared(), hostile, {}); assert.equal(l3[0].status, 'answered'); assert.equal(l3[0].note, ''); assert.deepEqual(l3[0].made, {});
});
t('the live merge marks only possible or likely, with the quoted words, and never changes a status', () => {
  const l = list0(); const q = by(l, 'scope_no_requirement') || l[0];
  const chunks = TP.parseTranscript('Priya: We run preventive maintenance scheduling every month for all plants, the planner owns it.\nSam: ok');
  const live = Q.liveAsk(prepared(), chunks); const m = L.mergeLive(l, live);
  Object.values(m.byId).forEach(x => assert.ok(['possible', 'likely'].includes(x.confidence)));
  const ids = Object.keys(m.byId); assert.ok(ids.length >= 1, 'expected the scope question to look answered');
  const l2 = L.questionList(prepared(), {}, m.byId); const hit = l2.find(x => x.live); assert.ok(hit.live.quote.includes('preventive maintenance')); assert.equal(hit.live.speaker, 'Priya'); assert.equal(hit.status, 'toask');
  assert.ok(L.counts(l2).possible + L.counts(l2).likely >= 1); assert.ok(m.next.length <= 3); assert.ok(m.next.every(x => !m.byId[x.id]));
  const skipped = L.questionList(prepared(), (() => { const d = {}; l.forEach(x => L.setNote(d, x.id, { status: 'skipped' }, 'a', 'b')); return d; })(), {}); assert.deepEqual(L.mergeLive(skipped, live).next, []);   // only questions still to ask are suggested
  assert.deepEqual(L.mergeLive(l, { answered: [{ id: 'nope', confidence: 'likely' }, { id: l[0].id, confidence: 'certain' }] }).byId, {});
  assert.deepEqual(L.mergeLive(l, null), { byId: {}, next: [] });
});
t('a requirement draft is unapproved, tied to the module, and keeps the question, speaker, time and quote', () => {
  const l = L.questionList(prepared(), {}, { [list0()[0].id]: { confidence: 'likely', evidence: { speaker: 'Priya', at: 83, quote: 'We run it monthly for all plants.' } } });
  const q = l[0]; const d = L.draftRecord('requirement', q, { id: 'WO-001', now: '2026-11-05T10:00:00Z', today: '2026-11-05', by: 'Sam', sessionId: 'ses1', transcript: 'Call 1' });
  assert.equal(d.store, 'requirement'); const r = d.record; assert.equal(r.status, 'Draft'); assert.equal(r.classification, 'confirm'); assert.notEqual(r.status, 'Confirmed'); assert.equal(r.title, 'We run it monthly for all plants.');
  assert.deepEqual(r.modules, q.module ? [q.module] : []); assert.equal(r.source.speaker, 'Priya'); assert.equal(r.source.timestamp, '0:01:23'); assert.equal(r.source.quote, 'We run it monthly for all plants.'); assert.equal(r.source.transcript, 'Call 1');
  assert.equal(r.source.question.id, q.id); assert.equal(r.source.confidence, 'likely'); assert.equal(r.source.basis, 'quote'); assert.equal(r.sessionId, 'ses1'); assert.equal(r.openQuestions, ''); assert.ok(!r.confirmedBy);
  const oq = L.draftRecord('question', q, { id: 'q1', now: 'n' }).record; assert.equal(oq.text, q.text); assert.equal(oq.source.quote, 'We run it monthly for all plants.');   // the quote stays in the source, not in the question
});
t('without a note or a quote the draft is the question, said so, never a statement', () => {
  const q = list0()[0]; const r = L.draftRecord('requirement', q, { id: 'R-1', now: 'n' }).record; assert.equal(r.source.basis, 'question'); assert.equal(r.objective, q.text); assert.equal(r.openQuestions, q.text); assert.ok(!r.source.quote && !r.source.speaker);
  const dec = L.draftRecord('decision', q, { id: 'd1', today: '2026-11-05' }).record; assert.equal(dec.status, 'Proposed'); assert.equal(dec.draft, true); assert.ok(dec.title.startsWith('To decide: ')); assert.deepEqual(dec.reqIds, []); assert.ok(dec.source.includes('Workshop room'));
  const act = L.draftRecord('action', q, { id: 'a1' }).record; assert.equal(act.status, 'Open'); assert.equal(act.owner, ''); assert.ok(act.text.startsWith('Follow up: ')); assert.equal(act.draft, true);
  const oq = L.draftRecord('question', q, { id: 'q9', now: 'n' }); assert.equal(oq.store, 'question'); assert.equal(oq.record.status, 'open'); assert.equal(oq.record.text, q.text); assert.equal(oq.record.draft, true);
});
t('the person\'s note wins over the quote, and is marked as the source basis', () => {
  const l = L.questionList(prepared(), (() => { const d = {}; L.setNote(d, list0()[0].id, { note: 'Customer wants monthly PM, approved by site lead' }, 'Sam', 'n'); return d; })(), {});
  const r = L.draftRecord('requirement', l[0], { id: 'R-2', now: 'n' }).record; assert.equal(r.title, 'Customer wants monthly PM, approved by site lead'); assert.equal(r.source.basis, 'note'); assert.equal(L.draftRecord('action', l[0], { id: 'a' }).record.text, 'Customer wants monthly PM, approved by site lead');
});
t('bad input gives null, long text is cut, and no kind makes an approved record', () => {
  const q = list0()[0]; assert.equal(L.draftRecord('nope', q, { id: 'x' }), null); assert.equal(L.draftRecord('requirement', {}, { id: 'x' }), null); assert.equal(L.draftRecord('requirement', q, {}), null); assert.equal(L.draftRecord('requirement', null, null), null);
  const big = Object.assign({}, q, { note: 'x'.repeat(5000) }); const r = L.draftRecord('requirement', big, { id: 'x', now: 'n' }).record; assert.ok(r.title.length <= 120 && r.objective.length <= 1000);
  L.KINDS.forEach(k => { const d = L.draftRecord(k, q, { id: 'x', now: 'n', today: 't' }).record; assert.ok(!/^(Confirmed|Agreed|approved|signed)$/i.test(d.status || '')); });
});
t('sameQuestion, evidenceLine, agendaOf and fmtClock', () => {
  assert.equal(L.sameQuestion([{ text: 'Who approves overtime?' }], ' who approves   overtime? '), true); assert.equal(L.sameQuestion([], 'x'), false); assert.equal(L.sameQuestion(null, ''), false);
  assert.equal(L.evidenceLine({ speaker: 'Priya', at: '0:01:23', quote: 'monthly' }), 'Said by Priya (0:01:23): "monthly"'); assert.equal(L.evidenceLine(null), '');
  const a = L.agendaOf([{ id: 'b', no: 2, title: 'Inventory', date: '2026-11-12' }, { id: 'a', no: 1, title: 'Work orders', date: '2026-11-10', start: '10:00', minutes: 120, modules: ['workorder'] }, { id: 'c', no: 3, title: 'Undated' }, { title: '' }, null]);
  assert.deepEqual(a.map(x => x.id), ['a', 'b', 'c']); assert.equal(a[0].minutes, 120); assert.deepEqual(L.agendaOf('x'), []);
  assert.equal(L.fmtClock(0), '0:00'); assert.equal(L.fmtClock(65000), '1:05'); assert.equal(L.fmtClock(3725000), '1:02:05'); assert.equal(L.fmtClock(-5), '0:00'); assert.equal(L.fmtClock('x'), '0:00');
});
console.log(n + ' workshop logic checks passed');
