// Questions from the contract (src/msaquestions.js): the rules that turn the MSA review into module-guide questions and the Learn & Prepare card, and the wiring.
// NOT checked: the pages in a browser, a customer answering and the team seeing it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/msaquestions.js');
const { build, modOf } = globalThis.FWBViews.msaQuestionsLogic;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const pl = { msa: { name: 'MSA.pdf' }, scope: [{ id: 's1', text: 'Planned preventive maintenance schedules for 40 chillers', status: 'matched' }, { id: 's2', text: 'Work orders raised by tenants through the portal', status: 'matched' }, { id: 's3', text: 'Biometric access control integration', status: 'excluded' }, { id: 's4', text: 'short', status: 'matched' }],
  contractX: { scopeX: { responsibilities: [{ text: 'The customer shall provide the asset register in the agreed template' }], exclusions: [{ text: 'Custom mobile app development is not included' }], assumptions: [{ text: 'Inventory stock counts are provided by the customer before go-live' }] } } };

t('modOf picks the module guide: planned maintenance before work orders, nothing for unrelated text', () => {
  assert.equal(modOf('Planned preventive maintenance work orders'), 'ppm'); assert.equal(modOf('Work orders raised by tenants'), 'wo'); assert.equal(modOf('the asset register'), 'asset'); assert.equal(modOf('Inventory stock counts'), 'inv'); assert.equal(modOf('Payment within 30 days'), '');
});
t('build makes questions for the right modules and a prepare list, and skips very short lines', () => {
  const o = build(pl); assert.equal(o.has, true); assert.equal(o.from, 'MSA.pdf'); assert.ok(o.byModule.ppm[0].q.includes('chillers')); assert.ok(o.byModule.wo[0].q.startsWith('Your contract includes:'));
  assert.ok(o.byModule.asset[0].q.includes('responsible')); assert.ok(o.byModule.inv[0].q.includes('assumes')); assert.equal(o.prepare.scope.length, 2, 'short line and excluded line are not scope'); assert.deepEqual(o.prepare.out.map(x => x.text.slice(0, 18)), ['Custom mobile app ', 'Biometric access c']);
  Object.values(o.byModule).flat().forEach(q => assert.match(q.id, /^msa_[a-z0-9]+$/)); assert.match(o.byModule.ppm[0].id,/^[A-Za-z0-9_-]{1,64}$/, 'fits the server answer key rule');
});
t('the same contract gives the same ids; empty or missing data gives nothing', () => {
  assert.deepEqual(build(pl).byModule.ppm.map(x => x.id), build(JSON.parse(JSON.stringify(pl))).byModule.ppm.map(x => x.id)); assert.equal(build(null).has, false); assert.equal(build({ scope: [] }).has, false);
  const many = { scope: Array.from({ length: 20 }, (_, i) => ({ text: 'Work order process number ' + i + ' for the tenants', status: 'matched' })) }; assert.equal(build(many).byModule.wo.length, 6); assert.equal(build(many).prepare.scope.length, 8);
});
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
t('wired in: built, applied by the guide, shown on Learn & Prepare, readable by customers, key fits the server rule', () => {
  assert.match(src('build.mjs'), /'src\/msaquestions\.js'/); assert.match(src('src/guidelearn.js'), /V\.msaQuestions\.apply\(\)/); assert.match(src('src/prepare.js'), /V\.msaQuestions\.card\(\)/);
  assert.match(src('src/shell.js'), /'plan_struct', 'contract_prep'\]/); assert.ok(!/contract_prep/.test((src('work/server/api.mjs').match(/TEAM_DOCS = new Set\(\[[^\]]*\]/) || [''])[0]), 'customers may read it');
  assert.ok(/GR_KEY = \/\^\[a-z\]\{2,8\}:\[afbxw\]:\[A-Za-z0-9_-\]\{1,64\}\$\//.test(src('work/server/api.mjs')));
});
console.log(n + ' checks passed');
