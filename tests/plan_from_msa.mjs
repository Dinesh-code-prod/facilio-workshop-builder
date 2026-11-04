// Project plan drafted from the contract (src/planfrommsa.js): 90-day default, weekends skipped, commitments pinned, conflicts reported not hidden,
// dependencies respected, nothing invented, and the rows work with the existing timeline dependency code (src/tldepslogic.js).
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const P = require('../src/planfrommsa.js'); const D = require('../src/tldepslogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const FIELDS = ['id', 'name', 'description', 'start', 'end', 'durationDays', 'dependsOn', 'deliverables', 'responsible', 'outcome', 'completionCriteria', 'origin'];
const NAMES = ['Kick-off', 'Introduction', 'Scope confirmation', 'Customer preparation', 'Data onboarding', 'Requirements workshops', 'Solution design', 'BRD preparation and approval', 'Configuration', 'Internal validation', 'UAT preparation and execution', 'FTR', 'Training', 'Go-live preparation', 'Handover'];
const wd = d => { const x = new Date(d + 'T00:00:00Z').getUTCDay(); return x !== 0 && x !== 6; };
const cal = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const base = { start: '2026-11-02', modules: ['Work Order', 'Asset'], customerResponsibilities: ['Provide a data owner'], exclusions: ['Payroll integration is excluded'], commitments: [] };
const by = (r, id) => r.milestones.find(m => m.id === id);

t('with no end date and no length the plan runs 90 days and says it is an assumption', () => {
  const r = P.buildPlan(base); assert.equal(cal(r.window.start, '2027-01-30'), 90, '2 Nov plus 90 days ends Sat 30 Jan'); assert.equal(r.window.end, '2027-01-29', 'a Saturday end moves back to Friday');
  assert.ok(r.assumptions.some(a => /default of 90 days/.test(a))); assert.ok(r.milestones.every(m => m.end <= r.window.end));
});
t('the 15 phases come in the roadmap order', () => { assert.deepEqual(P.buildPlan(base).milestones.map(m => m.name), NAMES); });
t('an end date or a length replaces the default, and no 90-day assumption is then listed', () => {
  const a = P.buildPlan(Object.assign({}, base, { end: '2027-03-31' })); assert.equal(a.window.end, '2027-03-31'); assert.ok(!a.assumptions.some(x => /default/.test(x)));
  const b = P.buildPlan(Object.assign({}, base, { durationDays: 60 })); assert.equal(b.window.end, '2026-12-31'); assert.ok(b.assumptions.some(x => /60 days/.test(x)));
});
t('every milestone has every field, a valid origin and a responsible party', () => {
  P.buildPlan(base).milestones.forEach(m => { FIELDS.forEach(f => assert.ok(m[f] !== undefined && m[f] !== '' && m[f] !== null, m.id + ' has ' + f)); assert.ok(['Facilio', 'Customer', 'Joint'].includes(m.responsible)); assert.ok(['contract', 'interpreted', 'assumed'].includes(m.origin)); assert.ok(m.deliverables.length && m.completionCriteria.length && m.durationDays >= 1); });
});
t('no milestone starts or ends on a weekend, and durations count working days only', () => {
  P.buildPlan(base).milestones.forEach(m => { assert.ok(wd(m.start) && wd(m.end), m.id + ' ' + m.start + ' ' + m.end); let c = 0; for (let d = m.start; d <= m.end; d = D.addDays(d, 1)) if (wd(d)) c++; assert.equal(c, m.durationDays); });
  const sat = P.buildPlan(Object.assign({}, base, { start: '2026-11-07' })); assert.equal(sat.window.start, '2026-11-09'); assert.ok(sat.assumptions.some(a => /non-working day/.test(a)));
});
t('a Friday and Saturday weekend can be given', () => { const r = P.buildPlan(Object.assign({}, base, { weekend: [5, 6], start: '2026-11-01' })); r.milestones.forEach(m => { const a = new Date(m.start).getUTCDay(), b = new Date(m.end).getUTCDay(); assert.ok(a !== 5 && a !== 6 && b !== 5 && b !== 6); }); });
t('no milestone starts before every task it depends on has ended', () => {
  [base, Object.assign({}, base, { end: '2026-12-18' }), Object.assign({}, base, { durationDays: 200 })].forEach(i => { const r = P.buildPlan(i); r.milestones.forEach(m => m.dependsOn.forEach(d => assert.ok(m.start > by(r, d).end, m.id + ' after ' + d))); });
});
t('a dated commitment pins its milestone, labelled as contract, with no conflict', () => {
  const r = P.buildPlan(Object.assign({}, base, { end: '2027-03-31', commitments: [{ text: 'BRD sign-off by the customer', date: '2027-01-08', source: 'MSA p.4 §3.2' }, { text: 'Kick-off meeting', date: '2026-11-04' }] }));
  assert.equal(by(r, 'brd').end, '2027-01-08'); assert.equal(by(r, 'brd').origin, 'contract'); assert.equal(by(r, 'brd').pinned, true); assert.equal(by(r, 'kickoff').start, '2026-11-04'); assert.equal(r.conflicts.length, 0);
  assert.ok(by(r, 'brd').completionCriteria.some(c => /BRD sign-off by the customer/.test(c) && /MSA p\.4/.test(c)));
  by(r, 'brd'); r.milestones.forEach(m => m.dependsOn.forEach(d => assert.ok(m.start > by(r, d).end)));
});
t('a commitment that is too early is reported as a conflict, not hidden, and the dependency rule still holds', () => {
  const r = P.buildPlan(Object.assign({}, base, { commitments: [{ text: 'BRD approval', date: '2026-11-10' }] }));
  assert.equal(r.conflicts.length, 1); assert.equal(r.conflicts[0].milestone, 'brd'); assert.ok(/BRD approval/.test(r.conflicts[0].message) && /2026-11-10/.test(r.conflicts[0].message));
  assert.equal(by(r, 'brd').pinned, false); assert.ok(by(r, 'brd').start > by(r, 'design').end);
});
t('a commitment date after the end date is reported, and a plan that cannot fit says so', () => {
  const late = P.buildPlan(Object.assign({}, base, { end: '2027-01-29', commitments: [{ text: 'UAT sign-off', date: '2027-03-01' }] })); assert.ok(late.conflicts.some(c => /after the project end date/.test(c.message)));
  const tight = P.buildPlan(Object.assign({}, base, { end: '2026-11-13' })); assert.ok(tight.conflicts.some(c => /cannot fit/.test(c.message)));
});
t('a commitment with no date is attached as interpreted (dates stay assumed); one that matches no phase becomes a gap', () => {
  const r = P.buildPlan(Object.assign({}, base, { commitments: [{ text: 'Facilio will train the super users' }, { text: 'Quarterly business review', date: '2027-02-01' }] }));
  assert.equal(by(r, 'training').origin, 'interpreted'); assert.ok(by(r, 'training').completionCriteria.some(c => /super users/.test(c))); assert.ok(r.gaps.some(g => /Quarterly business review/.test(g)));
});
t('missing information is listed as gaps and assumptions, never filled in', () => {
  const r = P.buildPlan({}, { today: '2026-11-04' }); assert.ok(r.gaps.some(g => /No start date/.test(g))); assert.ok(r.gaps.some(g => /No modules/.test(g))); assert.ok(r.gaps.some(g => /customer responsibilities/.test(g))); assert.ok(r.gaps.some(g => /exclusions/.test(g))); assert.ok(r.gaps.some(g => /no dated commitment/.test(g)));
  assert.ok(r.assumptions.some(a => /default of 90 days/.test(a))); assert.ok(r.milestones.every(m => m.origin === 'assumed')); const all = JSON.stringify(r.milestones); assert.ok(!/Work Order|Payroll/.test(all));
  const w = P.buildPlan(base); assert.ok(by(w, 'config').deliverables.some(x => /Work Order, Asset/.test(x))); assert.ok(by(w, 'custprep').deliverables.some(x => /data owner/.test(x))); assert.ok(by(w, 'scope').completionCriteria.some(x => /Payroll/.test(x)));
});
t('toPlanStruct gives timeline rows with dependency ids that the existing dependency code accepts', () => {
  const r = P.buildPlan(Object.assign({}, base, { commitments: [{ text: 'BRD sign-off', date: '2027-01-05' }], end: '2027-03-31' })); const rows = P.toPlanStruct(r.milestones); assert.equal(rows.length, 15);
  const ids = new Set(rows.map(x => x.id)); assert.equal(ids.size, 15);
  rows.forEach(x => { ['id', 'title', 'start', 'end', 'owner', 'status', 'pct'].forEach(f => assert.ok(x[f] !== undefined, f)); assert.ok(['Facilio', 'Customer', 'Both'].includes(x.owner)); (x.dep || []).forEach(d => assert.ok(ids.has(d))); });
  assert.equal(rows.find(x => x.title === 'Requirements workshops').dep[0], rows.find(x => x.title === 'Customer preparation').id);
  assert.equal(D.conflicts(rows).size, 0, 'no dependency starts before its predecessor ends'); rows.forEach(x => rows.forEach(y => (y.dep || []).forEach(p => assert.equal(D.wouldLoop(rows.map(z => (z.id === y.id ? Object.assign({}, z, { dep: [] }) : z)), p, y.id), false))));
  const before = JSON.stringify(rows.map(x => [x.id, x.start, x.end])); rows.forEach(x => D.reschedule(rows, x.id)); assert.equal(JSON.stringify(rows.map(x => [x.id, x.start, x.end])), before, 'rescheduling moves nothing');
  assert.ok(D.critical(rows).nodes.size > 5 && D.critical(rows).days > 0);
});
t('hostile or broken input does not throw and still returns a plan', () => {
  [null, undefined, 5, 'x', [], { start: {}, end: [], durationDays: 'abc', commitments: 'x', modules: { a: 1 } }, { start: '2026-02-30', end: '9999-99-99' }, { start: '2026-11-02', end: '2020-01-01' }, { start: '2026-11-02', end: '2090-01-01' }, { weekend: [0, 1, 2, 3, 4, 5, 6] }, { weekend: 'x' },
    { commitments: [null, 5, { text: { a: 1 } }, { text: 'x'.repeat(5000), date: '<script>' }, { text: 'kick-off', date: '2026-11-04' }, { text: 'kick-off', date: '2026-11-05' }], modules: [null, { a: 1 }, '<img src=x onerror=1>'], exclusions: [1, {}, 'ok'] }].forEach(i => { const r = P.buildPlan(i, { today: '2026-11-04' }); assert.equal(r.milestones.length, 15); r.milestones.forEach(m => assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(m.start) && m.end >= m.start)); });
  assert.deepEqual(P.toPlanStruct(null), []); assert.deepEqual(P.toPlanStruct([null, { id: 'a' }, { id: 'b', start: 'zz' }]), []);
});
t('the same input always gives the same plan', () => { assert.deepEqual(P.buildPlan(base), P.buildPlan(JSON.parse(JSON.stringify(base)))); });
console.log(`\n${n} plan-from-MSA checks passed`);
