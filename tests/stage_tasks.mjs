// Stage tasks (src/stagetasks.js) and the task engine's stage names: every stage and type written is one the server accepts, owners come from Delivery roles.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; const req = createRequire(import.meta.url); await import('../work/server/_stagetasks.mjs'); req('../src/taskengine.js'); req('../src/stagetasks.js');
const SH = globalThis.FWBStageTasks;
const L = globalThis.FWBViews.stageTaskLogic, E = globalThis.FWBViews.taskEngineLogic;
const api = fs.readFileSync(new URL('../work/server/api.mjs', import.meta.url), 'utf8');
const list = name => JSON.parse(api.match(new RegExp('const ' + name + ' = (\\[[^\\]]*\\])'))[1].replace(/'/g, '"'));
const STAGES = list('TASK_STAGES'), TYPES = list('TASK_TYPES'), SRC = list('TASK_SRC');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('the stage lists of the engine and of stage tasks are the server list', () => { assert.deepEqual(L.STAGES, STAGES); assert.deepEqual(E.STAGES, STAGES); Object.values(E.LIFE_STAGE).forEach(s => assert.ok(STAGES.includes(s), s)); });
t('every stage the task engine writes is accepted by the server', () => {
  const f = { openFindings: [{ transcriptId: 'a', title: 'T', count: 1 }], reviewMissing: [{ part: 'p', label: 'P' }], coverageMissing: [{ module: 'm', label: 'M', count: 1 }], failedCases: [{ id: 'u', tcid: 'TC1', title: 'x' }],
    stagesReady: Object.keys(E.LIFE_STAGE).map((k, i) => ({ k, n: i + 1, name: k })), kpisNoSolution: [{ id: 'k', name: 'K' }], slaOpen: [{ id: 's', label: 'S', missing: 'x' }], handoverOpen: [{ id: 'h', text: 'H' }],
    goliveGaps: [{ id: 'g', label: 'G', detail: 'd' }], crsWaiting: [{ id: 'c', label: 'CR-1' }], brdApproval: true, mailOpen: ['brd', 'solution', 'uat', 'hypercare'].map(a => ({ id: a, title: a, area: a })) };
  E.desired(f).forEach(x => { assert.ok(!x.stage || STAGES.includes(x.stage), x.rule + ': ' + x.stage); assert.ok(TYPES.includes(x.type), x.rule + ': ' + x.type); });
});
t('hypercare issues and the uat and template sources are accepted', () => { assert.ok(TYPES.includes('Hypercare Issue')); assert.ok(SRC.includes('uat') && SRC.includes('template')); });
t('the Facilio standard parses into all seven stages with known roles and types', () => {
  const P = L.parse(L.STANDARD); assert.deepEqual(P.warnings, []); assert.deepEqual(Object.keys(P.stages), STAGES);
  Object.values(P.stages).flat().forEach(x => { assert.ok(L.ROLES.includes(x.role), x.title); assert.ok(TYPES.includes(x.type), x.title); assert.ok(x.days >= 0); });
});
t('a template line with an unknown stage or no heading is reported, not guessed', () => {
  const P = L.parse('Orphan task | Trainer | 2\n# Somewhere else\nLost | Trainer\n# Testing\nRun UAT | uat lead | x | nonsense');
  assert.equal(P.warnings.length, 2); assert.deepEqual(P.stages['Testing & UAT'], [{ title: 'Run UAT', role: 'UAT lead', days: 7, type: 'Internal Action' }]);
});
t('owners come from the Delivery role, then the project manager, and only people with access', () => {
  const team = [{ name: 'Asha', email: 'asha@x.com', drole: 'Project manager' }, { name: 'Ravi', email: 'RAVI@x.com', drole: 'UAT lead' }, { name: 'Cust', email: 'c@y.com', drole: 'Trainer' }];
  const members = [{ email: 'asha@x.com', role: 'owner' }, { email: 'ravi@x.com', role: 'editor' }, { email: 'c@y.com', role: 'customer' }];
  assert.deepEqual(L.ownerFor('UAT lead', team, members), { email: 'ravi@x.com', name: 'Ravi', how: 'role' });
  assert.equal(L.ownerFor('Trainer', team, members).email, 'asha@x.com', 'a customer is never the owner; the project manager takes it');
  assert.equal(L.ownerFor('Trainer', team, members).how, 'lead'); assert.equal(L.ownerFor('Trainer', [], members), null);
});
t('a task key is stable per stage and title, so adding the same stage twice is refused by the server', () => { assert.equal(L.keyOf('Testing & UAT', 'Run UAT!'), 'tpl:4:run-uat'); assert.ok(/data\.key === out\.key\)\) throw new HttpError\(409/.test(api)); });
t('Stage tasks is a template type on the server and in the Templates page', () => { assert.ok(list('TPL_KINDS').includes('tasks')); assert.ok(/tasks: 'Stage tasks'/.test(fs.readFileSync(new URL('../src/templates.js', import.meta.url), 'utf8'))); });
t('the stage a project is in is the first lifecycle stage not closed, mapped like the task engine', () => {
  assert.deepEqual(SH.LIFE_STAGE, E.LIFE_STAGE); assert.equal(SH.stageNow(new Set()), 'Project Setup & Kickoff'); assert.equal(SH.stageNow(new Set(['intro'])), 'Requirements & Workshops');
  assert.equal(SH.stageNow(new Set(['intro', 'sessions', 'design'])), 'Testing & UAT'); assert.equal(SH.stageNow(new Set(SH.LIFE)), 'Closure & Follow-Up');
});
t('the daily run adds only what is missing, with owners by Delivery role and due dates from the run day', () => {
  const team = [{ name: 'Asha', email: 'asha@x.com', drole: 'Project manager' }, { name: 'Ravi', email: 'ravi@x.com', drole: 'UAT lead' }], members = [{ email: 'asha@x.com', role: 'owner' }, { email: 'ravi@x.com', role: 'editor' }];
  const stage = 'Testing & UAT', all = SH.toAdd(SH.STANDARD, stage, team, members, new Set(), '2026-11-24', 'Facilio standard');
  assert.equal(all.length, 4); assert.equal(all[0].owner, 'ravi@x.com'); assert.equal(all[0].due, '2026-11-29'); assert.equal(all[2].owner, 'asha@x.com', 'no implementation consultant: the project manager');
  assert.deepEqual(all[0].src, { type: 'template', label: 'Facilio standard' }); assert.ok(STAGES.includes(all[0].stage) && TYPES.includes(all[0].type));
  const left = SH.toAdd(SH.STANDARD, stage, team, members, new Set([all[0].key, all[1].key]), '2026-11-24'); assert.deepEqual(left.map(x => x.key), [all[2].key, all[3].key]);
});
t('the server runs the task run in the daily sweep, only where it is on, through the normal task save', () => {
  assert.match(api, /import '\.\/_stagetasks\.mjs'/); assert.match(api, /route\('GET', '\/api\/projects\/:id\/task-run'/); assert.match(api, /route\('POST', '\/api\/projects\/:id\/task-run'/);
  assert.match(api, /await taskRun\(s, pj, today\)/); assert.match(api, /!cfg\.on \|\| \(!force && cfg\.last === today\)/); assert.match(api, /viaApp\('PUT', '\/api\/projects\/' \+ pj\.id \+ '\/items\/task\//);
  assert.ok(fs.readFileSync(new URL('../build.mjs', import.meta.url), 'utf8').includes("'work/server/_stagetasks.mjs', 'src/stagetasks.js'"), 'the shared rules are bundled before the page');
});
console.log(`${n} stage task checks passed`);
