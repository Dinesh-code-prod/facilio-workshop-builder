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
{ // Meteor mock-ups and Comet links (Training page): ticked mock-ups ride in the note, the recipe reads Meteor, saved links open inside the Studio
  const { askJob } = globalThis.FWBViews.guidesLogic; const fs4 = await import('node:fs'); const J4 = await import('../work/server/_jobs.mjs'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('ticked Meteor mock-ups and "read my Meteor project" travel in the note of the job, and the note stays within 600 characters', () => {
    const r = askJob('make', 'user', 'for technicians', [], { labels: ['Work order list', 'Site summary'], all: true }); assert.match(r.job.note, /^for technicians \[Use Meteor: Work order list; Site summary \(and read my Meteor project\)\]$/);
    assert.equal(askJob('make', 'user', 'x'.repeat(900), [], { labels: ['A'], all: false }).job.note.length <= 600, true); assert.equal(askJob('make', 'user', 'plain', []).job.note, 'plain'); });
  u('the make_guide recipe tells Claude to only read Meteor (project, my_prototypes, get_prototype) and link each prototype', () => { assert.match(J4.KINDS.make_guide.recipe, /METEOR:.*my_prototypes.*get_prototype.*Never change anything in Meteor/); });
  u('the Training page has two tabs (Guides, Videos), the Meteor and Comet panel, and an Open here button on saved links', () => { const g = fs4.readFileSync('src/guideslist.js', 'utf8'), w = fs4.readFileSync('src/webframe.js', 'utf8'); assert.ok(g.includes("['guides', 'Guides'") && g.includes("['videos', 'Videos'") && g.includes('Meteor and Comet: what they bring') && g.includes('data-act="wfDock" data-url='));
    assert.ok(w.includes("a.getAttribute('data-url')") && w.includes('W.isAllowed(u)')); });
}
{ // Training page layout: one maker in three steps, one library, a video filter
  const fs5 = await import('node:fs'); const g = fs5.readFileSync('src/guideslist.js', 'utf8'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('the guide maker has three steps (Type, Sources, Send) with Back and Next, and the library holds drafts, guides made and the tools', () => { assert.ok(g.includes("[['1', 'Type'], ['2', 'Sources'], ['3', 'Send']]") && g.includes('ACT.tgStep') && g.includes('Your library') && g.includes('Guides made') && g.includes('ACT.tgOpenUg')); });
  u('the Videos tab can show all, the ones that need a video, or the ones added', () => { assert.ok(g.includes("['all', 'need', 'added']") && g.includes('ACT.tgVF')); });
}
