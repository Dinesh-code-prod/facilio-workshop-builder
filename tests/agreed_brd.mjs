// The agreed BRD (user, 25 Nov 2026): a BRD written outside the Studio becomes the source of truth. Claude reads it whole (work/server/_brdtext.mjs through get_document brddoc part brd:<id>),
// compares it with every tab (job sync_brd) and proposes new, changed, take-out (retire) and answered items (work/server/_dsapi.mjs); a person applies them on the BRD tab (src/brdview.js, src/design.js).
// NOT checked here: a real Claude run of sync_brd, the BRD tab in a browser (tests/ui covers the page).
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { brdText, brdList, PAGE } from '../work/server/_brdtext.mjs';
import { cleanProposal, mergeProposals } from '../work/server/_dsapi.mjs';
import { KINDS } from '../work/server/_jobs.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const doc = { status: 'draft', agreed: { id: 'brd_1', by: 'Kim' }, list: [{ id: 'main', name: 'Main BRD', type: 'core' }, { id: 'brd_1', name: 'Customer BRD', type: 'import', imported: true }],
  inserts: { b9: [{ id: 'm1', t: 'p', text: 'A note added to the main BRD' }] },
  docs: { brd_1: { status: 'review', hidden: { x3: true }, edits: { x2: { text: 'Edited   paragraph' } }, inserts: {
    'imp:title': [{ id: 'x1', t: 'h', lvl: 1, text: 'Scope' }, { id: 'x2', t: 'p', text: 'old' }, { id: 'x3', t: 'p', text: 'hidden text' }, { id: 'x4', t: 'ul', items: ['Work orders', { text: 'Assets' }] }, { id: 'x5', t: 'table', headers: ['Area', 'Rule'], rows: [['SLA', '4 hours']] }],
    x1: [{ id: 'x1a', t: 'h', lvl: 2, text: 'Approvals' }] } } } };

await t('an imported BRD reads as text in document order: headings, edits, bullets, tables; hidden blocks left out', () => {
  const r = brdText(doc, 'brd_1'); assert.equal(r.name, 'Customer BRD'); assert.equal(r.agreed, true); assert.equal(r.status, 'review'); assert.equal(r.imported, true);
  assert.equal(r.text, '# Scope\n\n## Approvals\n\nEdited paragraph\n\n- Work orders\n- Assets\n\n| Area | Rule |\n| SLA | 4 hours |'); assert.ok(!r.text.includes('hidden text'));
  assert.equal(brdText(doc, 'main').text, 'A note added to the main BRD', 'the Main BRD gives only the text a person added'); assert.equal(brdText(doc, 'nope'), null);
  assert.deepEqual(brdList(doc).map(x => [x.part, x.agreed, x.status]), [['brd:main', false, 'draft'], ['brd:brd_1', true, 'review']]); assert.ok(PAGE >= 4000);
});
await t('Claude reads it through get_document brddoc (list, then part brd:<id> in pages); the connector text names it', () => {
  const api = src('work/server/api.mjs'); assert.match(api, /import \{ brdText, brdList, PAGE as BRD_PAGE \} from '\.\/_brdtext\.mjs'/); assert.match(api, /if \(sec === 'brddoc'\) \{/); assert.match(api, /next: page < pages \? 'brd:' \+ t\.id/);
  assert.match(api, /part brd:<id> gives the text of one/);
});
await t('the new proposal kinds: retire (requirement or flow) and answer; brd, conflict and replaces are kept; bad ones are dropped', () => {
  assert.deepEqual(cleanProposal({ kind: 'retire', target: 'requirement', ref: 'WO-004', name: 'Night shift rota', why: 'Not in the BRD', brd: 'brd_1' }), { kind: 'retire', why: 'Not in the BRD', quote: '', source: '', brd: 'brd_1', target: 'requirement', ref: 'WO-004', module: '', name: 'Night shift rota' });
  assert.equal(cleanProposal({ kind: 'retire', target: 'module', ref: 'x', name: 'y' }), null); assert.equal(cleanProposal({ kind: 'retire', target: 'flow', name: 'y' }), null);
  const a = cleanProposal({ kind: 'answer', ref: 'q_7', question: 'Who approves?', answer: 'The FM lead', quote: 'Approved by the FM lead', source: '4.2 Approvals', brd: 'brd_1' }); assert.deepEqual([a.ref, a.name, a.answer, a.brd], ['q_7', 'Who approves?', 'The FM lead', 'brd_1']); assert.equal(cleanProposal({ kind: 'answer', ref: 'q_7' }), null);
  const r = cleanProposal({ kind: 'requirement', title: 'Close with signature', objective: 'The technician signs', replaces: 'WO-002', brd: 'brd_1', conflict: 'Session 3 said no signature' }); assert.deepEqual([r.replaces, r.brd, r.conflict], ['WO-002', 'brd_1', 'Session 3 said no signature']);
  const plain = cleanProposal({ kind: 'requirement', title: 'X', objective: 'Y' }); assert.ok(!('replaces' in plain) && !('brd' in plain) && !('conflict' in plain), 'proposals not from a BRD are unchanged'); assert.equal(cleanProposal({ kind: 'field', module: 'workorder', name: 'Z', brd: 'bad id!' }).brd, undefined);
  const m = mergeProposals([], [{ kind: 'retire', target: 'flow', ref: 'f1', name: 'A' }, { kind: 'retire', target: 'flow', ref: 'f1', name: 'A again' }, { kind: 'retire', target: 'requirement', ref: 'f1', name: 'B' }], 'now'); assert.equal(m.added, 2, 'one proposal per target and ref');
});
await t('the job sync_brd reads the BRD whole, compares every tab and names each kind of change; it applies nothing', () => {
  const k = KINDS.sync_brd; assert.ok(k, 'job exists'); assert.equal(k.stage, 'brd'); ['brddoc', 'workshop', 'solutions', 'msa_text', 'rs_findings'].forEach(d => assert.ok(k.docs.includes(d), d));
  ['part brd:<ref>', 'replaces', 'kind retire', 'kind answer', 'conflict', 'outOfScope true', 'Apply nothing', 'EVERY proposal carries brd'].forEach(w => assert.ok(k.recipe.includes(w), w));
  assert.match(src('work/server/_tooldocs.mjs'), /kind: retire, target: requirement\|flow/); assert.match(src('work/work.json'), /requirement\|retire\|answer/);
});
await t('the BRD tab marks the agreed BRD, sends the job and lists the changes by group; applying uses the one apply rule', async () => {
  const v = src('src/brdview.js'); ['ACT.brdAgree', 'ACT.brdSync', 'ACT.brdApplyAll', "kind: 'sync_brd'", 'd.agreed = { id: rc.id', '${agreedBar(rc)}', 'data-act="dsApply"'].forEach(w => assert.ok(v.includes(w), w));
  const d = src('src/design.js'); ["p.kind === 'retire'", "r.status = 'Out of scope'", 'f.enabled = false', "p.kind === 'answer'", "q.status = 'answered'", "p.kind === 'requirement' && p.replaces", "if (p.brd) { rec.status = 'Confirmed'"].forEach(w => assert.ok(d.includes(w), w));
  // the grouping as the tab shows it
  const groupOf = eval(v.match(/const groupOf = (p => [^\r\n]+?);\r?\n/)[1]); const bulk = eval(v.match(/const bulk = (p => [^;]+);/)[1]);
  assert.deepEqual([{ kind: 'requirement' }, { kind: 'requirement', replaces: 'A' }, { kind: 'retire' }, { kind: 'solution', outOfScope: true }, { kind: 'answer' }, { kind: 'flow', conflict: 'x' }, { kind: 'solution' }].map(groupOf), ['New', 'Changed', 'Not in the BRD', 'Not in the BRD', 'Answered by the BRD', 'Conflict', 'Changed']);
  assert.deepEqual([{ kind: 'field' }, { kind: 'flow', conflict: 'x' }, { kind: 'solution' }].map(bulk), [true, false, false], 'Apply all leaves conflicts and Solution areas to a person');
});
await t('Claude setup and the Team Guide mention it', () => { assert.match(src('src/claudesetup.js'), /bring the agreed BRD into the project/); assert.match(src('src/teamguide.js'), /'The agreed BRD'/); });
console.log(n + ' agreed BRD checks passed');
