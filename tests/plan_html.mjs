// Plan HTML export (src/planhtml.js): complete, self-contained, escaped, labelled by origin, nothing invented.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
import { buildKickoffPack } from '../work/server/_kickoffpack.mjs';
const P = createRequire(import.meta.url)('../src/planhtml.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const ex = { customer: 'Acme <b>', projectName: 'FM & roll-out', contract: { origin: 'contract', start: '2026-12-01', durationDays: 120 }, commitments: [{ text: 'Go-live by 1 Apr 2027', date: '2027-03-26', origin: 'contract', source: { page: 3 } }], modules: [{ name: 'Work Orders' }], scope: [] };
const pack = buildKickoffPack(ex, { now: '2026-11-06T10:00:00Z' });
t('the page has timeline, Gantt, milestones and every phase of the plan', () => {
  const h = P.build(pack, { customer: ex.customer, project: ex.projectName }); for (const s of ['<h2>Timeline</h2>', '<h2>Gantt chart</h2>', '<h2>Milestones</h2>']) assert.ok(h.includes(s), s);
  for (const m of pack.plan.milestones) assert.ok(h.includes(m.name.replace(/&/g, '&amp;')), m.name); assert.equal((h.match(/class="gr"/g) || []).length, pack.plan.milestones.length);
});
t('each date says where it comes from', () => { const h = P.build(pack, {}); assert.ok(h.includes('Facilio assumption')); assert.ok(h.includes('From the contract')); });
t('gaps, assumptions and conflicts are listed; a clean plan has no empty sections', () => {
  const h = P.build(pack, {}); assert.ok(h.includes('<h2>Assumptions</h2>')); const clean = P.build(Object.assign({}, pack, { plan: Object.assign({}, pack.plan, { gaps: [], conflicts: [], assumptions: [] }) }), {});
  assert.ok(!clean.includes('<h2>Conflicts</h2>') && !clean.includes('<h2>Assumptions</h2>'));
  const bad = P.build(Object.assign({}, pack, { plan: Object.assign({}, pack.plan, { conflicts: [{ message: 'Too tight' }] }) }), {}); assert.ok(bad.includes('<h2>Conflicts</h2>') && bad.includes('Too tight'));
});
t('text is escaped and the file asks for nothing from outside', () => {
  const h = P.build(Object.assign({}, pack, { plan: Object.assign({}, pack.plan, { gaps: ['<script>alert(1)</script>'] }) }), { customer: '<img src=x onerror=alert(1)>', project: '"><x>' });
  assert.ok(!h.includes('<script>alert') && !h.includes('<img src=x')); assert.ok(/default-src 'none'/.test(h)); assert.ok(!/https?:\/\//.test(h)); assert.ok(!/<script/.test(h), 'no script is needed');
});
t('draft and approved are told apart; an empty plan does not break', () => {
  assert.ok(P.build(pack, {}).includes('Draft, not yet approved')); assert.ok(P.build(Object.assign({}, pack, { status: 'approved', approvedAt: '2026-11-06T09:00:00Z' }), {}).includes('Approved 2026-11-06'));
  assert.ok(P.build(null, {}).includes('No dated plan')); assert.ok(P.build({ plan: { milestones: [{ name: 'x', start: 'bad' }] } }, {}).includes('No dated plan'));
});
console.log(n + ' plan export checks passed');
