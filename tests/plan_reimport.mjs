// Scenario: the customer delays the BRD sign-off and the team imports a new version of the project plan (src/planmerge.js, stages from work/server/_portfolio.mjs planInfo).
// What must hold: tasks still in the plan keep their id and progress, the message says what moved and which stage the project is in now, and a hand-set phase is not silently overridden.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
import { planInfo, STAGE_OF_STEP, ROADMAP } from '../work/server/_portfolio.mjs';
const PM = createRequire(import.meta.url)('../src/planmerge.js');
const today = '2026-11-09'; let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (id, title, start, end, over) => Object.assign({ id, title, phase: '', start, end, owner: 'Facilio', status: 'Not started', pct: 0 }, over || {});
const old = [
  row('r1', 'Kick-Off', '2026-10-01', '2026-10-01', { status: 'Done', pct: 100 }),
  row('r2', 'Workshops & Data Templates', '2026-10-05', '2026-10-25', { status: 'Done', pct: 100 }),
  row('r3', 'BRD Sign-Off', '2026-10-26', '2026-11-02', { owner: 'Customer', status: 'In progress', pct: 60 }),
  row('r4', 'Implementation & Testing', '2026-11-03', '2026-12-15', { status: 'In progress', pct: 20 }),
  row('r5', 'UAT & Feedback', '2026-12-16', '2026-12-30', { owner: 'Customer' }),
  row('r6', 'Training The Wider Team', '2027-01-02', '2027-01-04'),
  row('r7', 'Go-Live', '2027-01-05', '2027-01-05', { owner: 'Both' })
];
// the new version: the customer slipped the BRD sign-off by 18 days, implementation follows it, UAT moves, training is dropped and a data task is new; the sheet has no status or % columns
const next = [
  row('x1', 'Kick-Off', '2026-10-01', '2026-10-01'), row('x2', 'Workshops & Data Templates', '2026-10-05', '2026-10-25'), row('x3', 'BRD Sign-Off', '2026-11-20', '2026-11-20', { owner: 'Customer' }),
  row('x4', 'Implementation & Testing', '2026-11-21', '2027-01-08'), row('x5', 'Data clean-up dry run', '2026-12-01', '2026-12-10', { owner: 'Customer' }), row('x6', 'UAT & Feedback', '2027-01-11', '2027-01-25', { owner: 'Customer' }), row('x7', 'Go-Live', '2027-02-01', '2027-02-01', { owner: 'Both' })
];
const stageOf = rows => { const p = planInfo({ rows }, {}, today); return p.cur >= 0 ? 'Stage ' + STAGE_OF_STEP[p.cur] + ' · ' + ROADMAP[STAGE_OF_STEP[p.cur]] : ''; };
t('before: the project is in Solution design & BRD because implementation has started', () => assert.equal(stageOf(old), 'Stage 3 · Solution design & BRD'));
const m = PM.merge(old, next, { sheetHasProgress: false });
t('tasks still in the plan keep their id, so the slip against the baseline keeps working', () => { assert.deepEqual(m.rows.filter(r => !r.isPhase).map(r => r.id), ['r1', 'r2', 'r3', 'r4', 'x5', 'r5', 'r7']); });
t('progress the team recorded is kept when the sheet has no progress columns, and so is the owner', () => { const b = m.rows.find(r => r.id === 'r3'); assert.equal(b.status, 'In progress'); assert.equal(b.pct, 60); assert.equal(b.start, '2026-11-20'); assert.equal(m.rows.find(r => r.id === 'r2').status, 'Done'); assert.equal(m.rows.find(r => r.id === 'r5').owner, 'Customer'); });
t('the summary counts what happened', () => assert.deepEqual(m.summary, { kept: 6, added: 1, removed: 1, moved: 4, progressKept: 4 }));
t('after: the dates decide the stage, so the project moves back to Requirement sessions, and the message says so', () => {
  assert.equal(stageOf(m.rows), 'Stage 2 · Requirement sessions'); const s = PM.sentence(m.summary, stageOf(old), stageOf(m.rows));
  assert.match(s, /6 kept with their progress, 4 moved, 1 new, 1 no longer in the plan/); assert.match(s, /current stage is now Stage 2 · Requirement sessions \(was Stage 3 · Solution design & BRD\)/);
});
t('a phase set by hand keeps the stage where it was, whatever the new dates say (the message tells the person)', () => { const p = planInfo({ rows: m.rows }, { phase: { step: 5 } }, today); assert.equal(p.cur, 4); assert.equal(p.forced, true); });
t('when the sheet does state progress, the sheet wins, except a finished task is not reopened silently', () => {
  const sheet = [row('s1', 'BRD Sign-Off', '2026-11-20', '2026-11-20', { status: 'Not started', pct: 0 }), row('s2', 'Kick-Off', '2026-10-01', '2026-10-01', { status: 'Not started', pct: 0 }), row('s3', 'Implementation & Testing', '2026-11-21', '2027-01-08', { status: 'In progress', pct: 35 })];
  const r = PM.merge(old, sheet, { sheetHasProgress: true }); assert.equal(r.rows.find(x => x.id === 'r3').pct, 0); assert.equal(r.rows.find(x => x.id === 'r1').status, 'Done'); assert.equal(r.rows.find(x => x.id === 'r4').pct, 35);
});
t('a first import has nothing to merge: every task is new', () => { const r = PM.merge([], next, {}); assert.equal(r.rows.length, 7); assert.equal(r.summary.added, 7); assert.equal(r.summary.kept, 0); });
t('phase rows and a repeated task name are matched one to one, not twice', () => {
  const o = [row('p1', 'Design', '', '', { isPhase: true }), row('a1', 'Review', '2026-11-01', '2026-11-02', { phase: 'Design', status: 'Done' }), row('a2', 'Review', '2026-11-05', '2026-11-06', { phase: 'Build' })];
  const nn = [row('n0', 'Design', '', '', { isPhase: true }), row('n1', 'Review', '2026-11-03', '2026-11-04', { phase: 'Design' }), row('n2', 'Review', '2026-11-07', '2026-11-08', { phase: 'Build' })];
  const r = PM.merge(o, nn, { sheetHasProgress: false }); assert.deepEqual(r.rows.map(x => x.id), ['p1', 'a1', 'a2']); assert.equal(r.rows[1].status, 'Done');
});
console.log(n + ' plan re-import checks passed');
