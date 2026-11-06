// Kick-off pack (roadmap E15 Stage 1): work/server/_kickoffpack.mjs builds the kick-off deck data and the drafted plan together from an approved MSA extraction.
// The rules checked: nothing invented, dates that are not contract text are not applied, gaps and conflicts are listed, the deck data renders with src/kickoffhtml.js.
// NOT checked: the Kick-off page in a browser, a real MSA.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildKickoffPack } from '../work/server/_kickoffpack.mjs';
import { validateExtraction } from '../work/server/_msaextract.mjs';

const require = createRequire(import.meta.url); const K = require('../src/kickoffhtml.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const ex = o => { const v = validateExtraction(Object.assign({ customer: 'Acme', projectName: 'Acme Facilities', contract: { start: '2026-11-09', durationDays: 120, origin: 'contract', source: { page: 2 } },
  modules: [{ name: 'Work Order', origin: 'contract' }, { name: 'Asset', origin: 'contract' }], scope: [{ text: 'Work order management', status: 'confirmed', origin: 'contract', source: { page: 3 } }, { text: 'Payroll integration', status: 'excluded', origin: 'contract' }],
  deliverables: [{ text: 'Configured work order module', origin: 'contract' }], commitments: [{ text: 'Go-live preparation', date: '2027-02-26', origin: 'contract', source: { page: 5 } }],
  customerResponsibilities: [{ text: 'Provide a data owner', origin: 'contract' }], exclusions: [{ text: 'Payroll integration is excluded', origin: 'contract' }], supportAndHandover: [{ text: 'Two weeks of hypercare', origin: 'contract' }] }, o)); assert.ok(v.ok, JSON.stringify(v.errors)); return v.extraction; };

t('the pack holds the deck data, the plan and its gaps, and is a draft', () => {
  const p = buildKickoffPack(ex(), { now: '2026-11-06T00:00:00.000Z', transferId: 'xf_1', version: 2, today: '2026-11-06' });
  assert.equal(p.status, 'draft'); assert.deepEqual(p.from, { transferId: 'xf_1', version: 2 }); assert.equal(p.plan.window.start, '2026-11-09'); assert.equal(p.rows.length, 15); assert.equal(p.deck.customer, 'Acme');
  assert.deepEqual(p.deck.scope, ['Work order management']); assert.deepEqual(p.deck.governance, ['Two weeks of hypercare']); assert.ok(p.deck.keyDates.some(k => k.date === '2027-02-26'));
  assert.ok(p.deck.plan.every(r => r.isPhase && r.start)); assert.ok(p.rows.every(r => /^tr_msa_/.test(r.id)));
});
t('dates that are not contract text are not applied and the pack says so', () => {
  const p = buildKickoffPack(ex({ contract: { start: '2026-12-01', durationDays: 60, origin: 'interpreted' } }), { today: '2026-11-06' });
  assert.equal(p.plan.window.start, '2026-11-06', 'falls back to the drafting date'); assert.ok(p.plan.gaps.some(g => /not contract text/.test(g))); assert.ok(p.plan.gaps.some(g => /No start date/.test(g)));
});
t('missing information is a gap, never filled in; an impossible commitment is a conflict shown as a risk', () => {
  const p = buildKickoffPack(ex({ modules: [], customerResponsibilities: [], exclusions: [], commitments: [{ text: 'Go-live preparation', date: '2026-12-01', origin: 'contract' }] }), { today: '2026-11-06' });
  assert.ok(p.plan.gaps.some(g => /No modules/.test(g))); assert.ok(p.plan.conflicts.length >= 1); assert.ok(p.deck.risks.some(r => /fixes/.test(r))); assert.ok(p.deck.nextSteps.length >= 1 && p.deck.nextSteps.length <= 3);
});
t('an extraction with almost nothing still gives a pack that renders; empty slides are left out', () => {
  const p = buildKickoffPack(ex({ scope: [], deliverables: [], commitments: [], supportAndHandover: [], dependencies: [] }), { today: '2026-11-06' }); const d = K.build(p.deck);
  assert.ok(d.html.includes('Project Kick-off')); assert.ok(d.skipped.includes('Goals of the meeting') && d.skipped.includes('Scope') && d.skipped.includes('Governance'));
  const full = K.build(buildKickoffPack(ex(), { today: '2026-11-06' }).deck); assert.ok(full.slides.includes('Scope') && full.slides.includes('The plan on one page'));
});
t('hostile text in the extraction stays escaped in the deck HTML', () => {
  const h = K.build(buildKickoffPack(ex({ customer: '<img src=x onerror=alert(1)>', scope: [{ text: '<script>alert(1)</script>', status: 'confirmed', origin: 'contract', source: { page: 1 } }] }), { today: '2026-11-06' }).deck).html;
  assert.ok(!/<script>alert|<img src=x/.test(h));
});
console.log('\n' + n + ' kick-off pack checks passed');
