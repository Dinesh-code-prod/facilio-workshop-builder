// Kick-off page rules (src/kickofflogic.js): the pack as the page reads it, change requests, who may approve and when, the job rows.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
import { buildKickoffPack } from '../work/server/_kickoffpack.mjs';
const L = createRequire(import.meta.url)('../src/kickofflogic.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const ex = { customer: 'Acme', projectName: 'FM roll-out', contract: { origin: 'contract', start: '2026-12-01', durationDays: 120 }, commitments: [], modules: [{ name: 'Work Orders' }, { name: 'Assets' }], scope: [{ text: 'Work order management', status: 'confirmed' }] };
const stored = buildKickoffPack(ex, { now: '2026-11-06T10:00:00Z' });
t('a pack nobody wrote reads as none', () => { assert.equal(L.packOf(null), null); assert.equal(L.packOf({}), null); assert.equal(L.packOf('x'), null); });
t('the stored pack is read with origin labels, modules, gaps and status', () => {
  const p = L.packOf(stored); assert.equal(p.status, 'draft'); assert.ok(p.milestones.length > 3); assert.ok(p.milestones.every(m => m.label)); assert.deepEqual(p.modules.sort(), ['Assets', 'Work Orders']);
  assert.equal(p.milestones[0].label, L.ORIGIN.assumed); assert.equal(L.originLabel('contract'), 'From the contract'); assert.equal(L.originLabel('weird'), L.ORIGIN.assumed);
});
t('an unknown status reads as draft', () => assert.equal(L.packOf(Object.assign({}, stored, { status: 'x' })).status, 'draft'));
t('a change request is added to a copy, with a counted id', () => {
  const a = L.addChange(null, '  Move go-live  to   April ', 'a@x.com', '2026-11-06T10:00:00Z'); assert.ok(a.ok); assert.equal(a.item.text, 'Move go-live to April'); assert.equal(a.item.id, 'cr_1'); assert.equal(a.item.status, 'open');
  const b = L.addChange(a.doc, 'Add a risk slide', 'a@x.com', 'now'); assert.equal(b.item.id, 'cr_2'); assert.equal(L.itemsOf(a.doc).length, 1, 'the first document is not changed');
});
t('empty, repeated and too many requests are refused', () => {
  assert.equal(L.addChange(null, '   ', 'a', 'n').ok, false); const a = L.addChange(null, 'x1', 'a', 'n'); assert.equal(L.addChange(a.doc, 'x1', 'a', 'n').ok, false);
  const many = { items: Array.from({ length: 100 }, (_, i) => ({ id: 'cr_' + i, text: 't' + i, status: 'applied' })) }; assert.equal(L.addChange(many, 'new', 'a', 'n').ok, false);
});
t('text is cut and control characters removed', () => { const a = L.addChange(null, 'a\u0000b\n' + 'z'.repeat(2000), 'a', 'n'); assert.ok(a.item.text.length <= L.MAX_TEXT); assert.ok(!/[\u0000\n]/.test(a.item.text)); });
t('only an open request can be dismissed', () => {
  const a = L.addChange(null, 'x', 'a', 'n'); const d = L.dismissChange(a.doc, 'cr_1'); assert.equal(d.items[0].status, 'dismissed'); assert.equal(L.openCount(d), 0);
  const ap = { items: [{ id: 'cr_1', text: 'x', status: 'applied' }] }; assert.equal(L.dismissChange(ap, 'cr_1').items[0].status, 'applied');
});
t('approval: owner only, never twice, never with open change requests', () => {
  const p = L.packOf(stored); assert.equal(L.approvalCheck(p, true, null).ok, true); assert.equal(L.approvalCheck(p, false, null).ok, false);
  assert.equal(L.approvalCheck(null, true, null).ok, false);
  const open = L.addChange(null, 'x', 'a', 'n').doc; assert.match(L.approvalCheck(p, true, open).why, /still open/); assert.equal(L.approvalCheck(p, true, L.dismissChange(open, 'cr_1')).ok, true);
  const done = L.packOf(L.setStatus(stored, 'approved', 'o@x.com', '2026-11-06')); assert.equal(done.status, 'approved'); assert.match(L.approvalCheck(done, true, null).why, /Already approved by o@x.com/);
  assert.equal(L.approvalCheck(L.packOf(L.setStatus(stored, 'discarded', 'o', 'n')), true, null).ok, false);
});
t('setStatus keeps the plan and deck and records who approved', () => {
  const s = L.setStatus(stored, 'approved', 'o@x.com', '2026-11-06'); assert.deepEqual(s.plan, stored.plan); assert.deepEqual(s.deck, stored.deck); assert.equal(s.approvedBy, 'o@x.com'); assert.equal(stored.status, 'draft');
  assert.equal(L.setStatus(s, 'draft', 'o', 'n').approvedBy, '');
});
t('job rows show a plain status and the questions only while Claude waits for an answer', () => {
  const r = L.jobRows([{ id: 'jb_1', kind: 'pull_msa', label: 'Pull MSA from My Drive', status: 'needs_input', result: { summary: 's', questions: ['Which file?'] } }, { id: 'jb_2', kind: 'apply_change', status: 'done', result: { summary: 'ok', questions: ['old'] } }]);
  assert.deepEqual(r[0].questions, ['Which file?']); assert.equal(r[0].statusLabel, 'Claude needs your answer'); assert.equal(r[0].open, true); assert.deepEqual(r[1].questions, []); assert.equal(r[1].open, false); assert.equal(r[1].label, 'apply_change');
  assert.deepEqual(L.jobRows(null), []);
});
t('requests are shaped for the job queue', () => { assert.deepEqual(L.pullRequest('Acme', 'FM'), { kind: 'pull_msa', note: 'Acme / FM' }); assert.equal(L.pullRequest('Acme', 'FM', 'A MSA.pdf').note, 'Acme / FM / uploaded file: A MSA.pdf'); assert.deepEqual(L.changeRequest(), { kind: 'apply_change', section: 'kickoff_cr' }); });
t('the step strip', () => {
  const p = L.packOf(stored); assert.equal(L.stage(false, null, []), 'start'); assert.equal(L.stage(true, null, []), 'extract'); assert.equal(L.stage(false, null, [{ kind: 'pull_msa', status: 'waiting' }]), 'pulling');
  assert.equal(L.stage(true, p, []), 'review'); assert.equal(L.stage(true, L.packOf(L.setStatus(stored, 'approved', 'o', 'n')), []), 'approved');
});
console.log(n + ' kick-off page rule checks passed');
