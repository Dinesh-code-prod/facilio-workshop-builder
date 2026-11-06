// Requirement session transcripts and findings (work/server/_rsapi.mjs): cleaning, merging, replacing, limits. A decided finding is never overwritten.
import assert from 'node:assert/strict'; import { cleanFinding, mergeFindings, upsertTranscript, KINDS, LIMITS } from '../work/server/_rsapi.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); }; const NOW = '2026-11-06T10:00:00Z';
t('a finding is cleaned; an unknown kind or an empty text is dropped', () => {
  assert.deepEqual(cleanFinding({ kind: ' PROMISE ', text: '  We will\nmigrate  assets ', quote: 'q', speaker: 'Asha', at: '00:12:03' }), { kind: 'promise', text: 'We will migrate assets', quote: 'q', speaker: 'Asha', at: '00:12:03', ref: '' });
  assert.equal(cleanFinding({ kind: 'idea', text: 'x' }), null); assert.equal(cleanFinding({ kind: 'ask', text: '   ' }), null); assert.equal(cleanFinding(null), null); assert.equal(cleanFinding({ kind: 'ask', text: 'x'.repeat(2000) }).text.length, LIMITS.text);
});
t('saving findings again replaces the open ones of that transcript but keeps decided ones and other transcripts', () => {
  const a = mergeFindings([], 'tr_1', [{ kind: 'ask', text: 'Arabic labels' }, { kind: 'promise', text: 'Weekly status call' }, { kind: 'ask', text: 'arabic LABELS' }], NOW); assert.equal(a.added, 2, 'de-duplicated');
  const decided = a.items.map(f => (f.kind === 'promise' ? Object.assign({}, f, { status: 'confirmed', by: 'a@x.com' }) : f)); const other = mergeFindings(decided, 'tr_2', [{ kind: 'risk', text: 'Data late' }], NOW);
  const again = mergeFindings(other.items, 'tr_1', [{ kind: 'usecase', text: 'Check-in flow' }, { kind: 'promise', text: 'Weekly status call' }], NOW);
  assert.deepEqual(again.items.map(f => f.kind + ':' + f.status).sort(), ['promise:confirmed', 'risk:open', 'usecase:open']); assert.equal(again.added, 1, 'the promise already decided is not added again'); assert.equal(again.kept, 1);
  assert.equal(new Set(again.items.map(f => f.id)).size, again.items.length, 'ids are unique');
});
t('findings are capped per call and in total', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({ kind: 'ask', text: 'item ' + i })); assert.equal(mergeFindings([], 'tr_1', many, NOW).added, LIMITS.perCall);
  const full = Array.from({ length: LIMITS.total }, (_, i) => ({ id: 'fd_' + (i + 1), transcriptId: 'tr_9', kind: 'ask', text: 't' + i, status: 'open' })); assert.throws(() => mergeFindings(full, 'tr_1', [{ kind: 'ask', text: 'one more' }], NOW), /findings already/);
});
t('a transcript is stored once per source and reference; pulling it again replaces it', () => {
  const a = upsertTranscript([], { title: 'Session 1', date: '2026-10-26T10:00:00Z', source: 'clari', ref: 'clari:123', text: 'Asha: hello everybody, welcome to the session.' }, NOW); assert.equal(a.id, 'tr_1'); assert.equal(a.items[0].date, '2026-10-26');
  const b = upsertTranscript(a.items, { title: 'Session 1 (new)', source: 'clari', ref: 'clari:123', text: 'Asha: hello everybody, welcome back to the session.' }, NOW); assert.equal(b.items.length, 1); assert.equal(b.replaced, true); assert.equal(b.items[0].title, 'Session 1 (new)');
  const c = upsertTranscript(b.items, { title: 'File', source: 'upload', text: 'Ravi: this is a transcript from a file.' }, NOW); assert.equal(c.id, 'tr_2'); assert.equal(c.items[1].source, 'upload'); assert.equal(c.items[1].ref, '');
});
t('an empty or tiny transcript is refused, a huge one is cut and flagged', () => {
  assert.throws(() => upsertTranscript([], { text: '  ' }, NOW), /too short/); const big = upsertTranscript([], { source: 'upload', text: 'x'.repeat(LIMITS.transcript + 5000) }, NOW); assert.equal(big.truncated, true); assert.equal(big.items[0].text.length, LIMITS.transcript);
  assert.ok(KINDS.includes('custom_usecase') && KINDS.includes('additional'));
});
t('BRD checks: three more kinds, a BRD reference, kept apart from the transcripts\' findings', () => {
  assert.ok(['gap', 'conflict', 'unsupported'].every(k => KINDS.includes(k)));
  const c = cleanFinding({ kind: 'gap', text: 'Weekly status call is not in the BRD', quote: 'we will provide weekly status calls', speaker: 'Asha', at: '00:04:10', ref: ' REQ-014 ' }); assert.equal(c.ref, 'REQ-014'); assert.equal(cleanFinding({ kind: 'ask', text: 'x' }).ref, '');
  const a = mergeFindings([], 'tr_1', [{ kind: 'ask', text: 'Arabic labels' }], NOW); const b = mergeFindings(a.items, 'brd', [{ kind: 'conflict', text: 'BRD says English only', ref: 'REQ-3' }], NOW); assert.equal(b.items.length, 2);
  const again = mergeFindings(b.items, 'brd', [{ kind: 'unsupported', text: 'SMS alerts' }], NOW); assert.deepEqual(again.items.map(f => f.transcriptId + ':' + f.kind).sort(), ['brd:unsupported', 'tr_1:ask'], 'a new BRD check replaces the open BRD checks only');
});
t('contract checks and imported documents: three more kinds, a contract reference, documents are a source of their own', () => {
  assert.ok(['outside_contract', 'contract_conflict', 'not_discussed'].every(k => KINDS.includes(k)));
  const b = mergeFindings([], 'brd', [{ kind: 'gap', text: 'SMS alerts' }], NOW), m = mergeFindings(b.items, 'msa', [{ kind: 'outside_contract', text: 'Arabic support', ref: 'p.4 section 2.1' }], NOW); assert.equal(m.items.length, 2);
  const again = mergeFindings(m.items, 'msa', [{ kind: 'not_discussed', text: 'Dashboards' }], NOW); assert.deepEqual(again.items.map(f => f.transcriptId + ':' + f.kind).sort(), ['brd:gap', 'msa:not_discussed'], 'a new contract check replaces only the open contract checks');
  const d = upsertTranscript([], { title: 'Client requirements', source: 'document', ref: 'doc:req.xlsx:100', text: '[Sheet: Needs]\nPortal | Arabic labels | High' }, NOW); assert.equal(d.items[0].source, 'document'); assert.equal(upsertTranscript(d.items, { source: 'document', ref: 'doc:req.xlsx:100', text: '[Sheet: Needs]\nPortal | Arabic labels | Low' }, NOW).items.length, 1);
});
console.log(n + ' requirement session store checks passed');
