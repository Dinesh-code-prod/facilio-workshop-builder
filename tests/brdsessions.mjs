// What the requirement sessions captured, as the BRD and the checks read it (src/brdsessions.js; the BRD wiring is checked in a browser by tests/ui/brd-sessions-check.mjs).
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const S = createRequire(import.meta.url)('../src/brdsessions.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const bank = { items: [
  { id: 'q1', text: 'Who approves a work order above 500?', category: 'workflow', module: 'workorder', priority: 'must', state: 'kept', order: 1 },
  { id: 'q2', text: 'Which SLA applies to critical requests?', category: 'sla', priority: 'must', state: 'kept', order: 2 },
  { id: 'q3', text: 'Do you need a second language?', category: 'technical', priority: 'could', state: 'kept', order: 3 },
  { id: 'q4', text: 'Is the data migrated from Excel?', category: 'data', priority: 'should', state: 'kept', order: 4 },
  { id: 'q5', text: 'An idea nobody kept', category: 'module', priority: 'must', state: 'suggested', order: 5 }],
  summaries: [{ at: '2026-11-06T10:00:00Z', decisions: ['Approvals above 500 need two levels.', 'Critical SLA is 4 hours.'], assumptions: ['Assets are loaded before go-live.'], dependencies: ['The customer supplies the asset list.'], actions: [{ text: 'Send the asset template', owner: 'Dinesh' }] },
    { at: '2026-11-07T10:00:00Z', decisions: ['approvals above 500 need two levels', 'Reports go out weekly.'], assumptions: [], dependencies: [], actions: [] }] };
const room = { q: { q1: { status: 'answered', note: 'Supervisor, then site manager.', by: 'Dinesh', at: '2026-11-06T10:05:00Z', made: { requirement: 'r1' } }, q2: { status: 'asked' }, q3: { status: 'skipped' }, q4: { status: 'answered', note: 'Yes, two Excel files.', made: {} } } };
const r = S.rows({ bank, room, label: m => (m === 'workorder' ? 'Work Order' : m) });
t('only questions kept for the workshop count; skipped ones are left out of the BRD', () => { assert.equal(r.counts.kept, 4); assert.equal(r.counts.skipped, 1); assert.ok(![...r.open, ...r.answered].some(x => x.id === 'q5' || x.id === 'q3')); });
t('answered questions carry the client response and the area (module label, else the category)', () => { assert.equal(r.answered.length, 2); const a = r.answered.find(x => x.id === 'q1'); assert.equal(a.response, 'Supervisor, then site manager.'); assert.equal(a.area, 'Work Order'); assert.equal(r.answered.find(x => x.id === 'q4').area, 'Data migration and onboarding'); });
t('open questions are the ones still to ask or asked without an answer, Must first', () => { assert.deepEqual(r.open.map(x => x.id), ['q2']); assert.equal(r.open[0].area, 'SLA and escalation'); assert.equal(r.open[0].priority, 'must'); });
t('decisions, assumptions, dependencies and actions come from the call summaries once each (a repeat in other words and case is dropped)', () => { assert.deepEqual(r.decisions.map(x => x.text), ['Approvals above 500 need two levels.', 'Critical SLA is 4 hours.', 'Reports go out weekly.']); assert.equal(r.assumptions.length, 1); assert.equal(r.dependencies.length, 1); assert.deepEqual(r.actions.map(x => [x.text, x.owner]), [['Send the asset template', 'Dinesh']]); assert.equal(r.decisions[0].at.slice(0, 10), '2026-11-06'); });
t('counts say how many answers made no requirement, and how many Must questions are open', () => { assert.equal(r.counts.answeredNoRequirement, 1); assert.equal(r.counts.openMust, 1); });
t('the checks warn about an unanswered Must question and note an answer without a requirement', () => { const c = S.checks(r); assert.ok(c.some(x => x.sev === 'warning' && /must-ask question not answered/.test(x.item))); assert.ok(c.some(x => x.sev === 'info' && /without a requirement/.test(x.item))); assert.deepEqual(S.checks(S.rows({ bank: { items: [], summaries: [] }, room: {} })), []); });
t('nothing breaks on empty or odd input, and a model-written text cannot carry control characters', () => { assert.equal(S.rows().open.length, 0); assert.equal(S.rows({ bank: 'x', room: 7 }).counts.kept, 0); const d = S.rows({ bank: { items: [{ id: 'z', text: 'A\u0000B', state: 'kept' }], summaries: [] }, room: {} }); assert.equal(d.open[0].text, 'A B'); });
t('the BRD builder and the checks read the sessions, and the new file is in the bundle before brd.js', () => {
  const brd = fs.readFileSync(new URL('../src/brd.js', import.meta.url), 'utf8'), chk = fs.readFileSync(new URL('../src/checks.js', import.meta.url), 'utf8'), bm = fs.readFileSync(new URL('../build.mjs', import.meta.url), 'utf8');
  for (const s of ['FWBBrdSessions', "sid === 'sessions'", 'Answered in the Requirement Sessions', "['sessions', 'Decisions, assumptions"]) assert.ok(brd.includes(s), s); assert.ok(chk.includes('FWBBrdSessions')); assert.ok(bm.indexOf('src/brdsessions.js') > 0 && bm.indexOf('src/brdsessions.js') < bm.indexOf("'src/brd.js'"));
});
console.log(n + ' session-to-BRD checks passed');
