// The chat brief: only the playbooks the message is about, all areas readable, scope not limited to one stage.
import assert from 'node:assert/strict'; import { brief, pickPlaybooks } from '../work/server/_jobs.mjs';
const b = text => brief({ id: 'j1', kind: 'chat', params: { note: text, section: 'brd' }, requestedBy: 'a@b.c' }, 'P');
assert.deepEqual(pickPlaybooks('make the kick off html nicer'), ['kickoff']);
assert.ok(Object.keys(b('Update the kick-off deck from the contract').playbooks).join() === 'kickoff');
assert.deepEqual(b('hello').playbooks, {}); assert.ok(b('hello').playbooksNote);
assert.ok(b('x').allowedDocs.includes('solutions') && /any area/.test(b('x').scope));
assert.ok(JSON.stringify(b('hi')).length < 9000, 'the quiet chat brief stays small');
console.log('4 chat brief checks passed');
import { cleanRequest } from '../work/server/_jobs.mjs';
const c1 = cleanRequest({ kind: 'chat', note: 'revamp the BRD', size: 'heavy' }), c2 = cleanRequest({ kind: 'chat', note: 'revamp the BRD' }), c3 = cleanRequest({ kind: 'fetch_mail', note: 'x', size: 'heavy' });
assert.equal(c1.params.size, 'heavy'); assert.notEqual(c1.key, c2.key); assert.equal(c3.params.size, undefined, 'only chat jobs carry a size');
assert.equal(brief({ id: 'j', kind: 'chat', params: { note: 'x', size: 'small' }, requestedBy: 'a@b.c' }, 'P').size, 'small'); assert.equal(b('x').size, 'none');
console.log('3 chat size checks passed');
// a missing skill, connector or browser in the Claude that took the job: every job's brief says what to do instead of an apology, and the chat is pointed at the skills list
for (const kind of ['chat', 'pull_msa', 'fetch_mail', 'make_guide', 'build_solution_doc']) { const x = brief({ id: 'j', kind, params: { note: 'x' }, requestedBy: 'a@b.c' }, 'P'); assert.match(x.blocked, /needs_input/); assert.match(x.blocked, /SKILL\.md/); assert.match(x.blocked, /which Claude you are/); assert.match(x.blocked, /Never claim a skill or tool was used when it was not/); }
assert.match(b('generate the FTR').instructions, /get_impl_skills first/); assert.match(b('generate the FTR').instructions, /ask first \(skills\.rule\)/);
// a deliverable is never quietly made without its skill (24 Nov 2026): the required skill comes first, marked needed, and the rule says to ask before a plain draft
{ const f = b('generate the FTR').skills, u = b('build the UAT guide for work orders').skills, g = brief({ id: 'j2', kind: 'make_guide', params: { section: 'user' }, requestedBy: 'a@b.c' }, 'P').skills;
  assert.equal(f.plan[0].skill, 'ftr-generator'); assert.equal(f.plan[0].needed, true); assert.equal(u.plan[0].skill, 'facilio-uat-guide'); assert.equal(b('prepare the handover user guide').skills.plan[0].skill, 'guidebook-builder'); assert.equal(u.plan[0].needed, true); assert.equal(g.plan[0].skill, 'guidebook-builder'); assert.equal(g.plan[0].needed, true);
  assert.match(u.rule, /Reply draft anyway/); assert.match(u.rule, /Made without the <skill> skill/); assert.equal(b('what is the status').skills, undefined, 'a plain question carries no skill plan'); }
console.log('2 missing-skill checks passed');
// skill plans: every job kind planned exists, every job carries a plan in order, and a chat job gets the skills of the area it is about
{ const { KINDS, skillPlan } = await import('../work/server/_jobs.mjs'); const { IMPL_SKILLS } = await import('../work/server/_skills.mjs');
  for (const k of Object.keys(IMPL_SKILLS.jobSkills)) assert.ok(KINDS[k], 'a skill plan names a job kind that does not exist: ' + k);
  const ftr = brief({ id: 'j', kind: 'make_ftr', params: {}, requestedBy: 'a@b.c' }, 'P').skills; assert.deepEqual(ftr.plan.map(x => x.skill), ['ftr-generator', 'ftr-executor', 'xlsx']); assert.equal(ftr.plan[0].needed, true); assert.match(ftr.plan[0].where, /facilio-impl-ai-skills\/ftr-generator\/SKILL\.md/); assert.match(ftr.rule, /Skills used:/);
  assert.equal(skillPlan('build_solution_doc').plan[0].from, 'studio'); assert.deepEqual(skillPlan('fetch_mail').plan, []); assert.match(skillPlan('fetch_mail').rule, /No skill fits/);
  assert.ok(skillPlan('chat', 'update the training guide').plan.some(x => x.skill === 'guidebook-builder')); assert.deepEqual(skillPlan('chat', 'hello').plan, []);
  console.log('5 skill plan checks passed'); }
// make it as a Claude item: reports as Slides, the BRD as Docs, FTR and UAT as Sheets; other jobs carry no such step
{ const { makeAs } = await import('../work/server/_jobs.mjs'); const k = kind => brief({ id: 'j', kind, params: {}, requestedBy: 'a@b.c' }, 'P').makeAs;
  assert.match(k('make_wsr'), /Slides/); assert.match(k('draft_brd'), /Docs/); assert.match(k('make_ftr'), /Sheets/); assert.equal(k('fetch_mail'), undefined);
  assert.match(makeAs('uat'), /Sheets/); assert.match(makeAs('monthly'), /skip this step/); assert.equal(makeAs('guide'), '');
  console.log('3 make-as checks passed'); }
