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
t('a re-read with no contract date keeps the first plan start instead of moving to today', () => {
  const ex = { customer: 'C', projectName: 'P', contract: {}, modules: [{ name: 'Work Order' }] };
  const a = buildKickoffPack(ex, { today: '2026-11-08' }), b = buildKickoffPack(ex, { today: '2026-11-20', prevStart: a.deck.date });
  assert.equal(b.deck.date, a.deck.date); assert.notEqual(buildKickoffPack(ex, { today: '2026-11-20' }).deck.date, a.deck.date);
});
t('the kick-off block becomes the richer deck: dates only from the plan or a contract quote, never from Claude', () => {
  const v = validateExtraction(Object.assign({}, ex(), { kickoff: { promise: 'One platform', outcomes: [{ title: 'Incidents tracked', text: 'end to end', stream: 'CAFM', origin: 'contract' }, { title: '' }], scopeGroups: [{ name: 'Modules', stream: 'CAFM', items: ['Incident'] }],
    gates: [{ id: 'T1', needs: 'BRD review 17-19 Nov' }, { name: 'AI handover', at: 'config', unlocks: 'Early testing' }, { name: 'Made-up date', date: '2026-12-25', origin: 'interpreted' }],
    asks: [{ text: 'Budget structure', team: 'Finance', at: 'workshops', unlocks: 'Budget module' }, { text: 'Contract date', team: 'IT', date: '2026-11-20', origin: 'contract' }, { text: 'Claude date', date: '2026-11-21', origin: 'assumed' }],
    risks: [{ text: 'Late samples', level: 'HIGH', effect: 'moves', mitigation: 'templates' }], holidays: [{ start: '2026-12-02', end: '2026-12-03', label: 'National Day' }, { start: 'soon' }], phases: [{ name: 'Discover', activities: ['Workshops'] }], bogus: 1 } }));
  assert.ok(v.ok); const k = v.extraction.kickoff; assert.equal(k.outcomes.length, 1, 'an outcome with no title is dropped'); assert.equal(k.gates.length, 2, 'a gate dated only by Claude is dropped'); assert.equal(k.holidays.length, 1); assert.equal(k.risks[0].level, 'high'); assert.equal(k.bogus, undefined);
  const p = buildKickoffPack(v.extraction, { today: '2026-11-06' }); const d = p.deck, m = id => p.plan.milestones.find(x => x.id === id);
  assert.equal(d.promise, 'One platform'); assert.deepEqual(d.streams, ['CAFM']); assert.equal(d.deliver.length, 4); assert.equal(d.deliver[0].name, 'Discover'); assert.equal(d.deliver[1].name, 'Build'); assert.equal(d.deliver[3].end, m('handover').end);
  const t1 = d.gates.find(g => g.label === 'T1'); assert.equal(t1.date, m('brd').end); assert.equal(t1.needs, 'BRD review 17-19 Nov'); assert.equal(d.gates.find(g => g.name === 'AI handover').date, m('config').end); assert.ok(!d.gates.some(g => g.name === 'Made-up date'));
  assert.deepEqual(d.asks.map(a => a.due), [m('workshops').start, '2026-11-20', ''], 'due: the plan phase start, or a contract date; a date Claude assumed is dropped'); assert.equal(d.customerAsks.length, 3);
  assert.equal(d.riskTable[0].text, 'Late samples'); assert.ok(d.plan.every(r => ['facilio', 'customer', 'joint'].includes(r.owner))); assert.equal(d.tracks[0].steps.length, 5); assert.ok(d.slipRule);
  const deck = K.build(Object.assign({}, d, { team: [{ name: 'Asha', role: 'PM' }] })); for (const s of ['What changes', 'Scope at a glance', 'Milestones', 'Dependencies', 'What we need from you', 'Risks']) assert.ok(deck.slides.includes(s), s);
});
t('an extraction without the kick-off block still gives the four phases, the gates and the dependency track from the plan', () => {
  const d = buildKickoffPack(ex(), { today: '2026-11-06' }).deck; assert.equal(d.deliver.length, 4); assert.deepEqual(d.gates.map(g => g.name), ['Kick-off', 'BRD sign-off', 'UAT sign-off', 'Go-live', 'Support handover']); assert.equal(d.asks, undefined); assert.equal(d.riskTable, undefined);
});
{ const { draftSessions } = await import('../work/server/_kickoffpack.mjs');
  t('the server drafts the requirement sessions from the pack with the page\'s own rules', () => {
    let i = 0; const p = buildKickoffPack(ex(), { now: '2026-11-06T00:00:00.000Z', today: '2026-11-06' });
    const r = draftSessions(p, 'online', () => 'ses_' + (++i)); assert.ok(r.sessions.length >= 2); assert.ok(r.sessions.every(s => s.fromPack === p.builtAt && /^ses_\d+$/.test(s.id))); assert.ok(r.sessions.some(s => s.items.includes('Work Order')));
  }); }
console.log('\n' + n + ' kick-off pack checks passed');
