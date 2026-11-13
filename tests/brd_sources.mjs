// BRD sources (src/brdsources.js): every input the BRD is built from is counted, and what does not reach the BRD is flagged with the reason.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { counts } = createRequire(import.meta.url)('../src/brdsources.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (g, label) => g.flatMap(x => x.rows).find(r => r.label === label);

t('unconfirmed findings, pending requirements and requirements without a module are held back', () => {
  const g = counts({ findings: [{ status: 'confirmed' }, { status: 'open' }, { status: 'dismissed' }], reqs: [{ status: 'Confirmed', modules: ['workorder'] }, { status: 'Confirmed', modules: [] }, { status: 'Draft' }] });
  assert.equal(row(g, 'Findings from the transcripts').held, 1); assert.match(row(g, 'Findings from the transcripts').why, /1 not confirmed/);
  assert.equal(row(g, 'Requirements').held, 1); assert.equal(row(g, 'Requirements without a module').held, 1);
});
t('a module with no solution text, an unmarked whiteboard flow and an unconfirmed use case are named', () => {
  const g = counts({ mods: [{ label: 'Work Order', sol: true }, { label: 'Asset', sol: false }], cflows: [{ inBrd: true }, {}], usecases: [{ confirmation: 'Customer confirmed' }, {}, { scope: 'Out of scope' }] });
  assert.match(row(g, 'Agreed solution per module').why, /Asset/); assert.equal(row(g, 'Whiteboard flows').held, 1); assert.equal(row(g, 'Use cases').held, 1);
});
t('configuration counts add up across modules and an empty project holds nothing back', () => {
  const g = counts({ mods: [{ label: 'A', sol: true, flowsChanged: 1, fieldsChanged: 3, notes: 2 }, { label: 'B', sol: true, flowsChanged: 2, fieldsChanged: 0, notes: 1 }] });
  assert.match(row(g, 'State flows').have, /^3 /); assert.match(row(g, 'Fields and forms').have, /^3 /); assert.match(row(g, 'Notifications').have, /^3 /);
  assert.equal(counts({}).flatMap(x => x.rows).reduce((a, r) => a + r.held, 0), 0);
});
console.log(n + ' BRD sources checks passed');
