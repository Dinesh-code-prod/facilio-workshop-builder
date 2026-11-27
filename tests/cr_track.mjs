// Change tracks (src/crtracklogic.js, src/crtrack.js; plan docs/plans/CR-AFTER-GOLIVE-2026-11-23.md): a new contract after the kick-off is approved
// becomes a delta that sets up scope lines, sessions, a plan phase and a BRD addendum tagged with the CR number, without touching what exists.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
import { KINDS, cleanRequest } from '../work/server/_jobs.mjs'; import { PERSONAL } from '../work/server/_helper.mjs';
const req = createRequire(import.meta.url); const L = req('../src/crtracklogic.js'); await import('../work/server/_kickofflogic.mjs'); const K = globalThis.FWBKickoffLogic; const C = req('../src/chatcmds.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const DELTA = JSON.stringify({ title: 'Housing portal phase 2', documents: ['CR-2 Order Form.pdf'], start: '2026-12-01', end: '2027-01-10',
  added: [{ text: 'Tenant self-service portal for housing', module: 'Client Portal', document: 'CR-2 Order Form.pdf', page: 2, quote: 'Tenant portal for up to 500 users' }, { text: 'Visitor management', module: 'Visitor Management', page: 3 }],
  changed: [{ text: 'PPM checklists up to 150', was: 'up to 100', module: 'Planned Maintenance', page: 2 }], removed: [{ text: 'Inventory stores', module: 'Inventory', page: 4 }], conflicts: ['Go-live date earlier than the original hypercare end'] });
let id = 0; const uid = p => p + '_' + (++id); const today = '2026-11-23';
const modKey = m => ({ 'client portal': 'tenantportal', 'planned maintenance': 'plannedmaintenance' })[m.toLowerCase()] || '';

t('the delta Claude saved is read and checked', () => {
  const d = L.parseDelta(DELTA); assert.equal(d.title, 'Housing portal phase 2'); assert.equal(d.added.length, 2); assert.equal(d.changed[0].was, 'up to 100'); assert.equal(d.added[0].page, 2);
  assert.deepEqual(d.modules, ['Client Portal', 'Visitor Management', 'Planned Maintenance']); assert.equal(d.conflicts.length, 1);
  for (const bad of ['', 'x', '[]', '{"added":[]}', '{"title":"t"}']) assert.ok(L.parseDelta(bad).error, bad);
});
t('set up adds scope, sessions, a plan phase and a BRD addendum, all tagged with the CR', () => {
  const d = L.parseDelta(DELTA), cr = { id: 'cr1', n: 2, title: 'Housing portal' };
  const r = L.setup(d, { cr, today, scope: [], sessions: [{ id: 's0', title: 'Session 1' }], rows: [{ id: 'r0', title: 'Kick-off' }], brds: [{ id: 'main' }], sessionPlan: K.sessionPlan, uid, modKey });
  assert.equal(r.no, 'CR-002'); assert.equal(r.scope.length, 4); assert.ok(r.scope.every(s => s.cr === 'CR-002' && s.source === 'cr'));
  assert.equal(r.scope.find(s => /Inventory/.test(s.text)).status, 'excluded'); assert.match(r.scope.find(s => /150/.test(s.text)).text, /^Changed by CR-002/);
  assert.ok(r.sessions.length >= 2 && r.sessions.every(s => s.cr === 'CR-002' && /^CR-002 · /.test(s.title))); assert.ok(r.sessions[0].date >= '2026-12-01');
  assert.equal(r.rows[0].isPhase, true); assert.equal(r.rows.length, 6); assert.ok(r.rows.every(x => x.cr === 'CR-002' && x.phase === 'CR-002: Housing portal phase 2')); assert.equal(r.rows[0].start, '2026-12-01');
  assert.equal(r.brd.type, 'addendum'); assert.equal(r.brd.cr, 'CR-002'); assert.deepEqual(r.brd.modules, ['tenantportal', 'plannedmaintenance']);
  assert.ok(r.notes.some(x => /not in this project's module list/.test(x))); assert.ok(r.notes.some(x => /1 conflict/.test(x))); assert.ok(r.notes.some(x => /by 2027-01-10/.test(x)));
});
t('set up again adds nothing that is already there', () => {
  const d = L.parseDelta(DELTA), cr = { id: 'cr1', n: 2 }; const a = L.setup(d, { cr, today, scope: [], sessions: [], rows: [], brds: [], sessionPlan: K.sessionPlan, uid, modKey });
  const b = L.setup(d, { cr, today, scope: a.scope, sessions: a.sessions, rows: a.rows, brds: [a.brd], sessionPlan: K.sessionPlan, uid, modKey });
  assert.equal(b.scope.length + b.sessions.length + b.rows.length, 0); assert.equal(b.brd, null);
});
t('a start date in the past starts the change on the next working day', () => {
  const d = L.parseDelta(JSON.stringify({ start: '2026-01-01', added: [{ text: 'x', module: 'Assets' }] })); const r = L.setup(d, { cr: { n: 3 }, today: '2026-11-27', sessionPlan: K.sessionPlan, uid });
  assert.equal(r.rows[0].start, '2026-11-30'); assert.equal(L.workday('2026-11-28'), '2026-11-30');
});
t('the track steps follow what is linked to the change', () => {
  const cr = { n: 2, status: 'Draft' }; let s = L.steps(cr, {}); assert.equal(s.filter(x => x.done).length, 0); assert.equal(s.length, 7);
  s = L.steps(Object.assign({}, cr, { setupAt: 'x', status: 'Delivered' }), { delta: { approvedVer: 1 }, sessions: [{ cr: 'CR-002', status: 'held' }], brds: [{ id: 'b', cr: 'CR-002' }], brdStatus: { b: 'approved' }, utc: [{ cr: 'CR-002', status: 'Passed' }, { cr: 'CR-009', status: 'Failed' }] });
  assert.equal(s.filter(x => x.done).length, 7);
});
t('the chat sends "pull my new MSA" to the change track after kick-off approval', () => {
  assert.equal(L.chatJob('pull my new MSA from the drive', true).job.kind, 'pull_cr'); assert.equal(L.chatJob('please read the amendment', false).job.kind, 'pull_msa'); assert.equal(L.chatJob('open the contract page', true), null);
  assert.equal(C.match('Pull my new MSA, it is in the drive', { kickoffApproved: true, pages: [] }).job.kind, 'pull_cr'); assert.equal(C.match('fetch the CR order form', { pages: [] }).job.kind, 'pull_msa');
});
t('the pull_cr job: personal, requestable, saves a delta and never redrafts the kick-off', () => {
  const k = KINDS.pull_cr; assert.ok(k && PERSONAL.has('pull_cr')); assert.equal(cleanRequest({ kind: 'pull_cr', ref: 'cr1', note: 'x' }).params.ref, 'cr1');
  assert.match(k.recipe, /kind cr_delta/); assert.match(k.recipe, /EVERY subfolder/); assert.match(k.recipe, /Do NOT call msa_extraction_save/); assert.match(k.recipe, /"added"/);
  assert.match(fs.readFileSync('work/server/_jobsapi.mjs', 'utf8'), /kind === 'pull_cr'/);
  const w = JSON.parse(fs.readFileSync('work/work.json', 'utf8')); assert.equal(w.mcp.tools.length, 32); assert.match(w.mcp.tools.find(x => x.name === 'project_jobs').description, /pull_cr/);
  assert.match(fs.readFileSync('work/server/api.mjs', 'utf8'), /'New contract after the kick-off': '/);
});
t('the pages are wired: Change requests, Contract intake, plan, BRD, UAT, build', () => {
  const r = f => fs.readFileSync(f, 'utf8');
  assert.match(r('src/governance.js'), /V\.crTrackBtn\(c\)/); assert.match(r('src/governance.js'), /V\.crTrackInbox\(\)/); assert.match(r('src/msadocs.js'), /await V\.crTrackStart\(why\)/);
  assert.match(r('src/timeline.js'), /!r\.isPhase && !r\.cr/); assert.match(r('src/brd.js'), /TYPES\.addendum = /); assert.match(r('src/uat.js'), /ACT\.utcCrFilter/); assert.match(r('src/assistant.js'), /kickoffApproved:/);
  assert.match(r('build.mjs'), /'src\/crtracklogic\.js', 'src\/crtrack\.js'/); assert.match(r('src/crtrack.js'), /ACT\.crxSetup = /);
});
console.log(n + ' change track checks passed');
