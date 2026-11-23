// The BRD review checklist (src/brdreview.js): which parts are still not ticked, what is still open next to each part, and that the panel shows names and escapes text.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let rec = { review: {} }; let docs = { design_proposals: { items: [] }, rs_findings: { items: [] } };
globalThis.FWB = { S: { user: { kind: 'consultant', name: 'Asha <b>R</b>' }, project: { id: 'p1', role: 'owner' }, ws: { requirements: [] } }, esc, doc: s => docs[s], changed() { } };
let toasted = ''; let statusCalls = 0;
globalThis.FWBViews = { ACT: { brdStatus: async () => { statusCalls++; } }, toast: m => { toasted = m; }, render() { }, isCustomer: () => false, brd: { html: () => '<div>BRD</div>' } }; globalThis.FWBBrd = { state: () => rec };
createRequire(import.meta.url)('../src/brdreview.js'); const V = globalThis.FWBViews; const { missing, facts, ITEMS } = V.brdReviewLogic;
assert.deepEqual(ITEMS.map(x => x[0]), ['intro', 'requirements', 'flows', 'fields', 'apps', 'contract']);
assert.equal(missing({}).length, 6); assert.equal(missing(null).length, 6); assert.deepEqual(missing({ intro: { by: 'a' }, flows: { by: '' }, apps: { by: 'b' } }), ['requirements', 'flows', 'fields', 'contract']); assert.deepEqual(missing(Object.fromEntries(ITEMS.map(x => [x[0], { by: 'a', at: 'x' }]))), []);
const f = facts([{ status: 'Draft' }, { status: 'Confirmed' }, { status: 'Draft' }], [{ kind: 'flow', status: 'open' }, { kind: 'crosslink', status: 'open' }, { kind: 'field', status: 'applied' }, { kind: 'form', status: 'open' }, { kind: 'connectedapp', status: 'open' }, { kind: 'brdintro', status: 'open' }, { kind: 'weird', status: 'open' }], [{ kind: 'gap', status: 'open' }, { kind: 'ask', status: 'open' }, { kind: 'conflict', status: 'dismissed' }, { kind: 'outside_contract', status: 'open' }]);
assert.deepEqual(f, { intro: 1, requirements: 2, flows: 2, fields: 1, apps: 1, contract: 2 });
let h = V.brdReviewPanel(); assert.ok(h.includes('0 of 6 checked') && h.includes('data-act="brdRvTick"') && !h.includes('Checked by'));
rec = { review: { intro: { by: 'Asha <b>R</b>', at: 'x' } } }; h = V.brdReviewPanel(); assert.ok(h.includes('1 of 6 checked') && h.includes('Checked by Asha &lt;b&gt;R&lt;/b&gt;') && !h.includes('<b>R</b>'), 'names are escaped');
rec = { review: Object.fromEntries(ITEMS.map(x => [x[0], { by: 'a', at: 'x' }])) }; assert.ok(V.brdReviewPanel().includes('All checked'));
globalThis.FWB.S.user.kind = 'customer'; assert.equal(V.brdReviewPanel(), '', 'customers never see it'); globalThis.FWB.S.user.kind = 'consultant';
assert.ok(V.brd.html().includes('<div>BRD</div>') && V.brd.html().includes('class="rv"'), 'the BRD tab shows the checklist above the document');
rec = { review: {} }; await V.ACT.brdStatus({ value: 'approved' }); assert.equal(statusCalls, 0, 'approving with parts not ticked is stopped'); assert.ok(toasted.includes('6 left'));
await V.ACT.brdStatus({ value: 'review' }); assert.equal(statusCalls, 1, 'other status changes pass through'); rec = { review: Object.fromEntries(ITEMS.map(x => [x[0], { by: 'a', at: 'x' }])) }; await V.ACT.brdStatus({ value: 'approved' }); assert.equal(statusCalls, 2, 'approving with every part ticked passes through');
{ const { auto } = V.brdReviewLogic; const zero = { intro: 0, requirements: 0, flows: 0, fields: 0, apps: 0, contract: 0 };
  const r1 = auto({}, zero, 3); assert.ok(r1.requirements.auto && r1.contract.auto && !r1.intro, 'provable parts tick themselves, the introduction never');
  assert.equal(auto({}, zero, 0), null, 'a BRD with no requirement proves nothing');
  const r2 = auto(r1, Object.assign({}, zero, { flows: 2 }), 3); assert.equal(r2.flows, undefined, 'an automatic tick goes when something opens');
  assert.equal(auto({ flows: { by: 'Sam' } }, Object.assign({}, zero, { flows: 2 }), 3).flows.by, 'Sam', 'a person’s tick stays'); assert.equal(auto(r1, zero, 3), null, 'nothing to change gives null');
  console.log('  ok  provable parts tick themselves'); }
console.log('8 BRD review checks passed');
