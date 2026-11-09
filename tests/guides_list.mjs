// Training guides overview (src/guideslist.js, rule `summary`): counts what exists and says where each kind is made; nothing invented.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = {}; createRequire(import.meta.url)('../src/guideslist.js'); const { summary } = globalThis.FWBViews.guidesLogic;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const row = (s, id) => s.rows.find(r => r.id === id);
t('an empty project lists five kinds with none made, and the UAT guide waits for test cases', () => {
  const s = summary({}); assert.equal(s.rows.length, 5); assert.equal(s.total, 0); assert.equal(row(s, 'uat').count, 0); assert.match(row(s, 'uat').detail, /Needs test cases/); assert.equal(row(s, 'user').view, 'guidebuilder'); assert.equal(row(s, 'uat').act, 'utcGuide');
});
t('counts and names what exists', () => {
  const s = summary({ userGuides: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }], recordings: [{ title: 'R' }], testCases: 12, walkthroughs: 3, mockupVideos: 1 });
  assert.equal(row(s, 'user').count, 4); assert.equal(row(s, 'user').detail, 'A, B, C and 1 more'); assert.equal(row(s, 'uat').count, 1); assert.match(row(s, 'uat').detail, /12 test cases/); assert.equal(row(s, 'wt').detail, '3 scenarios with a video.'); assert.equal(row(s, 'mv').detail, '1 mockup card with a video.'); assert.equal(s.total, 4 + 1 + 1 + 3 + 1);
});
console.log(n + ' guides overview checks passed');
// the request for Claude (make a guide, change a guide)
{ const { askJob } = globalThis.FWBViews.guidesLogic; let m = 0; const u = (name, fn) => { fn(); m++; console.log('  ok  ' + name); };
  u('make: any of the four kinds becomes a make_guide job, and an empty note means everything in scope', () => { const r = askJob('make', 'uat', ''); assert.deepEqual([r.ok, r.job.kind, r.job.section], [true, 'make_guide', 'uat']); assert.match(r.job.note, /Everything in scope/); assert.equal(askJob('make', 'video', 'x'.repeat(900)).job.note.length, 600); });
  u('change: needs the words; a wrong kind is refused', () => { assert.equal(askJob('change', 'user', '  ').ok, false); const r = askJob('change', 'training', 'add a rejection step'); assert.deepEqual([r.job.kind, r.job.section, r.job.note], ['change_guide', 'training', 'add a rejection step']); assert.equal(askJob('make', 'nope', 'x').ok, false); });
  u('documents the person gave Claude travel as the ref of the job (file ids only, at most 8); no documents means no ref', () => { assert.equal(askJob('make', 'user', '').job.ref, undefined); const r = askJob('make', 'training', 'by role', ['f_a1b2c3', 'bad id!', 'f_d4e5f6']); assert.equal(r.job.ref, 'f_a1b2c3,f_d4e5f6'); assert.equal(askJob('change', 'user', 'x', ['f_1abc']).job.ref, 'f_1abc'); assert.equal(askJob('make', 'user', '', Array.from({ length: 12 }, (_, i) => 'f_id' + i)).job.ref.split(',').length, 8); });
  console.log(m + ' guide request checks passed'); }
{ const J = await import('../work/server/_jobs.mjs'), fs2 = await import('node:fs'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('the guide recipes tell Claude how to read the documents, and the server lets it fetch a guide source', () => { assert.match(J.KINDS.make_guide.recipe, /SOURCES:.*file_urls/); assert.match(J.KINDS.change_guide.recipe, /SOURCES:.*file_urls/); assert.match(J.KINDS.make_guide.recipe, /VIDEOS:.*walkthroughs.*mockups/); assert.match(J.KINDS.change_guide.recipe, /VIDEOS:.*walkthroughs/); assert.match(fs2.readFileSync('work/server/_jobsapi.mjs', 'utf8'), /category !== 'guide_source'/); }); }
{   // Comet lives in Training now: no video box on the Mockup cards, no walkthrough card on the UAT page, one Training entry in the menu, and the Training page holds the video rows
  const fs = await import('node:fs'); const rd = f => fs.readFileSync(f, 'utf8'); const mk = rd('src/mockup.js'), uat = rd('src/uat.js'), shell = rd('src/shell.js'), tr = rd('src/guideslist.js'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('Mockup has no Comet video box and does not ask for videos; UAT does not draw the walkthrough card', () => { assert.ok(!mk.includes('class="mk-vid"') && !mk.includes('data-act="mkComet"')); assert.ok(!/coverageCard\(\) \+ walkthroughCard\(\)/.test(uat)); assert.ok(uat.includes('V.uatWalkthroughs ='));
    assert.ok(tr.includes('class="\' + (v.proto ? \'mk-vid\' : \'wt-url\')') && tr.includes("kind: 'send_video'") && tr.includes("'mkVidSave' : 'utcWtSave'") && tr.includes('data-act="mkComet"')); });
  u('the menu has one Training entry; the builder and Video to Guide are reached from the Training page', () => { assert.ok(shell.includes("items: [['guides', 'Guides & Videos']]")); assert.ok(!/\['guidebuilder', 'User Guide Builder'\]/.test(shell) && !/'guidebuilder', 'vidguide', 'claudesetup'/.test(shell)); assert.ok(tr.includes('data-view="guidebuilder"') && tr.includes('data-view="vidguide"')); assert.ok(shell.includes("['mockup', 'Mockup (Meteor)']")); });
}
{ const fs3 = await import('node:fs'); const J2 = await import('../work/server/_jobs.mjs'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('a draft opens in the guide builder in one click; the handover pack job reads the documents the team gave and the server lets it fetch them', () => { assert.match(fs3.readFileSync('src/guideslist.js', 'utf8'), /data-act="tgToBuilder"/); assert.match(fs3.readFileSync('src/guideslist.js', 'utf8'), /ugSectionsFromMd/);
    assert.match(J2.KINDS.make_handover.recipe, /SOURCES:.*file_urls/); assert.match(J2.KINDS.make_handover.recipe, /task handover/); assert.match(fs3.readFileSync('work/server/_jobsapi.mjs', 'utf8'), /'handover_source'/); assert.match(fs3.readFileSync('work/server/api.mjs', 'utf8'), /handover_source: \{ ext:/); assert.match(fs3.readFileSync('src/lifecycle.js', 'utf8'), /kind: 'make_handover'/); }); }
