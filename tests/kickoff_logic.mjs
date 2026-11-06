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
t('requirement sessions follow the workshop plan sheet: related modules share a session, agenda per module, roles, one session a day inside the phase, optional follow-up, planning notes', () => {
  const MODS = ['Portfolio Management', 'Client Management', 'Asset Management', 'Reactive Maintenance', 'Centralised Help Desk (Service Requests)', 'Client Portal (Web & Mobile)', 'Planned Maintenance', 'Building Inspections and Compliance', 'Process Automation - State flows', 'Dashboards', 'Inventory Management and Requests'];
  const mk = (names, days) => buildKickoffPack(Object.assign({}, ex, { commitments: [], contract: Object.assign({}, ex.contract, { durationDays: days || 400 }), modules: names.map(name => ({ name })) }), { now: '2026-11-06T10:00:00Z' });
  const r = L.sessionPlan(mk(MODS)); const planned = r.sessions.filter(x => x.status === 'proposed'); const opt = r.sessions.filter(x => x.status === 'optional');
  assert.deepEqual(planned.slice(0, 5).map(x => x.items), [['Portfolio Management', 'Client Management'], ['Asset Management'], ['Centralised Help Desk (Service Requests)', 'Client Portal (Web & Mobile)', 'Reactive Maintenance'], ['Planned Maintenance', 'Building Inspections and Compliance'], ['Process Automation - State flows', 'Dashboards']]);
  assert.equal(planned.length, 6, 'an unknown module (inventory) gets its own session'); assert.equal(opt.length, 1); assert.equal(opt[0].date, '');
  const ph = L.packOf(mk(MODS)).milestones.find(m => m.id === 'workshops'); for (const x of planned) { const wd = new Date(x.date + 'T00:00:00Z').getUTCDay(); assert.ok(wd !== 0 && wd !== 6, x.date + ' is a weekend'); assert.ok(x.date >= ph.start && x.date <= ph.end, x.date + ' outside the phase'); assert.equal(x.duration, '2 hours (proposed)'); assert.equal(x.participants, ''); assert.ok(x.stakeholders.includes('System Administrator') && x.stakeholders.includes('Project POC')); }
  assert.equal(new Set(planned.map(x => x.date)).size, planned.length, 'one a day');
  const s1 = planned[0]; assert.deepEqual(s1.details.map(g => g.heading), ['PORTFOLIO MANAGEMENT', 'CLIENT MANAGEMENT', 'WORKSHOP OUTPUTS']); assert.ok(s1.details[0].points.length >= 4); assert.ok(planned[5].details[0].points.length === 4, 'generic agenda for an unknown module');
  assert.ok(planned[planned.length - 1].details.some(g => g.heading === 'CROSS-MODULE CLOSEOUT'));
  assert.deepEqual(r.planNotes.map(n => n.item), ['Schedule', 'Timing', 'Scope basis', 'Scope validation', 'Workshop outputs', 'Preparation requested', 'Optional follow-up session']); assert.ok(r.planNotes[0].text.includes('6 proposed sessions')); assert.ok(r.notes.some(n => /suggestions/.test(n)));
  const many = L.sessionPlan(mk(Array.from({ length: 40 }, (_, k) => 'Module ' + (k + 1)), 120)); assert.ok(many.sessions.length > 10); assert.ok(many.notes.some(n => /fall after the requirements workshops phase/.test(n)), JSON.stringify(many.notes));
  assert.deepEqual(L.sessionPlan(null), { sessions: [], notes: [], planNotes: [] }); assert.match(L.sessionPlan(mk([])).notes[0], /no modules/);
});
t('review checklist: ticked sections record who and when, approval waits for all of them, unticking works, unknown ids are ignored', () => {
  let d = JSON.parse(JSON.stringify(stored)); let p = L.packOf(d); assert.equal(p.review.length, 5); assert.ok(p.review.every(x => !x.done));
  assert.equal(L.approvalCheck(p, true, null).ok, true, 'without the review rule (old callers) approval is unchanged'); assert.match(L.approvalCheck(p, true, null, true).why, /5 left/);
  for (const id of ['scope', 'dates', 'gaps', 'deck']) d = L.setReview(d, id, true, ' Asha@x.com ', '2026-11-06T10:00:00Z'); p = L.packOf(d); assert.match(L.approvalCheck(p, true, null, true).why, /1 left/); assert.equal(p.review[0].by, 'Asha@x.com'); assert.equal(p.review[0].at, '2026-11-06T10:00:00Z');
  d = L.setReview(d, 'sessions', true, 'asha@x.com', 'n'); assert.equal(L.approvalCheck(L.packOf(d), true, null, true).ok, true); assert.equal(L.approvalCheck(L.packOf(d), false, null, true).ok, false, 'still the owner only');
  d = L.setReview(d, 'deck', false, 'x', 'n'); assert.match(L.approvalCheck(L.packOf(d), true, null, true).why, /1 left/); assert.deepEqual(L.setReview(d, 'nope', true, 'x', 'n'), d); assert.equal(L.packOf(L.setStatus(d, 'approved', 'o', 'n')).review[0].done, true, 'the record stays after approval');
});
t('job rows keep the questions Claude asked and the answers given, so the chat can show them in order', () => {
  const r = L.jobRows([{ id: 'j1', kind: 'chat', status: 'waiting', requestedAt: '2026-11-07T10:00:00Z', result: { questions: ['Which file?'], answers: ['The Clari one'] } }, { id: 'j2', kind: 'chat', status: 'needs_input', result: { questions: ['Which?'] } }])
  assert.deepEqual(r[0].asked, ['Which file?']); assert.deepEqual(r[0].answers, ['The Clari one']); assert.deepEqual(r[0].questions, []); assert.deepEqual(r[1].questions, ['Which?']); assert.deepEqual(L.jobRows([{ id: 'x' }])[0].answers, []);
});
t('bulk decision: only the named findings change, already-decided ones are skipped, open clears who and when', () => {
  const items = [{ id: 'a', status: 'open' }, { id: 'b', status: 'open' }, { id: 'c', status: 'confirmed', by: 'x' }]; const r = L.decideMany(items, ['a', 'c'], 'confirmed', 'me@x.com', '2026-11-07');
  assert.equal(r.n, 1); assert.deepEqual(r.items[0], { id: 'a', status: 'confirmed', by: 'me@x.com', byAt: '2026-11-07' }); assert.equal(r.items[1].status, 'open'); assert.equal(r.items[2].by, 'x');
  assert.equal(L.decideMany(r.items, ['a'], 'open', 'me', 't').items[0].by, ''); assert.equal(L.decideMany(items, ['a'], 'bogus', 'm', 't').n, 0); assert.equal(L.decideMany(null, null, 'confirmed').n, 0);
});
console.log(n + ' kick-off page rule checks passed');
