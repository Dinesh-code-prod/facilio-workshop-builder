// The BRD drafts itself from confirmed findings (src/brddraft.js, rule `drafts`): confirmed becomes a Confirmed requirement with the team answer as rules, once; unconfirmed takes it back to Draft; hand edits are kept.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/brddraft.js'); const { drafts } = globalThis.FWBViews.brdDraft;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const mods = [{ name: 'workorder', label: 'Work Order', prefix: 'WO' }, { name: 'asset', label: 'Asset', prefix: 'AS' }];
const f = (id, kind, text, status, extra) => Object.assign({ id, kind, text, status, quote: 'q ' + id, speaker: 'Sam', transcriptId: 'tr_1' }, extra || {});
t('a confirmed promise or ask becomes a Confirmed requirement in the right module, with the team answer as its rules and the quote kept', () => {
  const r = drafts([f('f1', 'ask', 'Technicians raise a material request from the work order', 'confirmed', { solution: 'From the spare-parts list' }), f('f2', 'promise', 'Weekly asset report', 'confirmed')], [], mods, '2026-11-07', 'me');
  assert.equal(r.add.length, 2); const a = r.add[0]; assert.equal(a.id, 'WO-001'); assert.equal(a.status, 'Confirmed'); assert.deepEqual(a.modules, ['workorder']); assert.equal(a.rules, 'From the spare-parts list'); assert.equal(a.source.finding, 'f1'); assert.equal(a.source.quote, 'q f1'); assert.equal(r.add[1].id, 'AS-001');
});
t('open, dismissed, risk and gap items are not requirements; a text naming no module goes in as GEN with no module', () => {
  const r = drafts([f('a', 'ask', 'x module free', 'open'), f('b', 'ask', 'x', 'dismissed'), f('c', 'risk', 'Work Order delay', 'confirmed'), f('d', 'gap', 'Work Order thing', 'confirmed'), f('e', 'decision', 'Use a single login', 'confirmed')], [], mods, 'now', 'me');
  assert.equal(r.add.length, 1); assert.equal(r.add[0].id, 'GEN-001'); assert.deepEqual(r.add[0].modules, []);
});
t('pressing it again adds nothing; ids continue after existing ones', () => {
  const first = drafts([f('f1', 'ask', 'Work Order approval', 'confirmed')], [{ id: 'WO-004' }], mods, 'now', 'me'); assert.equal(first.add[0].id, 'WO-005');
  const again = drafts([f('f1', 'ask', 'Work Order approval', 'confirmed')], first.add, mods, 'now', 'me'); assert.equal(again.n, 0);
});
t('a later team answer updates the rules unless a person edited them; unconfirming takes the requirement back to Draft; reconfirming restores it', () => {
  const base = drafts([f('f1', 'ask', 'Work Order approval', 'confirmed', { solution: 'old' })], [], mods, 'now', 'me').add[0];
  const up = drafts([f('f1', 'ask', 'Work Order approval', 'confirmed', { solution: 'new' })], [base], mods, 'now', 'me'); assert.equal(up.update[0].patch.rules, 'new');
  const edited = Object.assign({}, base, { rules: 'person wrote this' }); assert.equal(drafts([f('f1', 'ask', 'Work Order approval', 'confirmed', { solution: 'new' })], [edited], mods, 'now', 'me').n, 0, 'a hand edit is kept');
  const back = drafts([f('f1', 'ask', 'Work Order approval', 'open')], [base], mods, 'now', 'me'); assert.equal(back.update[0].patch.status, 'Draft');
  const again = drafts([f('f1', 'ask', 'Work Order approval', 'confirmed', { solution: 'old' })], [Object.assign({}, base, { status: 'Draft' })], mods, 'now', 'me'); assert.equal(again.update[0].patch.status, 'Confirmed');
  assert.equal(drafts(null, null, null, 'n', 'm').n, 0);
});
t('module matching: initials such as WO and SR, equipment for asset; a general sentence stays general', () => {
  const mm = [{ name: 'workorder', label: 'Work Order', prefix: 'WO' }, { name: 'serviceRequest', label: 'Service Request', prefix: 'SR' }, { name: 'asset', label: 'Asset', prefix: 'AS' }];
  const r = drafts([f('a', 'ask', 'Every WO needs a supervisor sign-off', 'confirmed'), f('b', 'ask', 'The SR form gets a priority field', 'confirmed'), f('c', 'ask', 'Track equipment warranty', 'confirmed'), f('d', 'decision', 'Single sign-on for all users', 'confirmed')], [], mm, 'now', 'me');
  assert.deepEqual(r.add.map(x => x.modules[0] || ''), ['workorder', 'serviceRequest', 'asset', '']); assert.equal(r.add[3].id, 'GEN-001'); assert.deepEqual(r.add[3].modules, []);
});
console.log(n + ' BRD draft checks passed');
