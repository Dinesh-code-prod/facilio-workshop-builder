// The Solution document page (src/soldoc.js): Markdown <-> sections, BRD blocks -> Markdown, the studio draft, and that a person's edits are never overwritten.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
globalThis.FWB = { S: { user: { kind: 'consultant' }, project: { id: 'p1' }, ws: { project: {} }, ui: {} }, esc, doc: () => ({}) };
globalThis.FWBViews = { ACT: {}, isCustomer: () => false };
createRequire(import.meta.url)('../src/soldoc.js'); const L = globalThis.FWBViews.soldocLogic; let n = 0; const ok = m => { n++; console.log('  ok  ' + m); };

// Markdown -> sections: a single "# Title" on top shifts ## to sections and ### to sub-sections; the id line is dropped
let s = L.toSections('# Acme Solution\nSolution document id: sd_abc\n\n## 1. Project Information\n| a | b |\n\n## Work Orders\n### Use Case\nText\n### Field List\n[To be confirmed]');
assert.deepEqual(s.map(x => [x.title, x.lvl]), [['Project Information', 1], ['Work Orders', 1], ['Use Case', 2], ['Field List', 2]]); assert.equal(s[2].md, 'Text'); assert.ok(!s.some(x => /sd_abc/.test(x.md)));
ok('Claude’s Markdown splits into sections and sub-sections');
s = L.toSections('Opening words\n# One\nA\n## Two\nB\n# Three\nC', 'import'); assert.deepEqual(s.map(x => [x.title, x.lvl, x.src]), [['Introduction', 1, 'import'], ['One', 1, 'import'], ['Two', 2, 'import'], ['Three', 1, 'import']]);
ok('an imported file with several # headings splits at # and ##');
const back = L.toSections(L.toMd('Doc', s)); assert.deepEqual(back.map(x => [x.title, x.lvl, x.md]), s.map(x => [x.title, x.lvl, x.md])); ok('toMd and toSections round-trip');
assert.equal(L.open([{ md: '[To be confirmed] x' }, { md: 'done' }, { md: '[To be confirmed (roles)]' }]), 2); ok('open counts sections still to be confirmed');

// BRD blocks -> Markdown, and the part of one module
const md = L.blocksToMd([{ t: 'cover' }, { t: 'h', lvl: 1, text: '3. WORK ORDERS' }, { t: 'h', lvl: 2, text: 'Module Purpose' }, { t: 'p', text: 'Track repairs.' }, { t: 'ul', items: ['a', 'b'] }, { t: 'table', headers: ['X', 'Y'], rows: [['1', '2'], { sub: 'Group' }] }, { t: 'figure', caption: 'Flow' }, { t: 'h', lvl: 1, text: '4. ASSETS' }, { t: 'p', text: 'Other', hiddenBlock: true }]);
assert.match(md, /^# 3\. WORK ORDERS/); assert.match(md, /\| X \| Y \|/); assert.match(md, /_Diagram: Flow_/); assert.ok(!md.includes('Other'));
assert.match(L.partFor(md, 'Work Orders'), /Track repairs/); assert.ok(!L.partFor(md, 'Work Orders').includes('ASSETS')); ok('BRD blocks become Markdown and a module part is found');

// the studio draft
const ctx = { kind: 'full', modules: [{ name: 'workorder', label: 'Work Orders' }], project: { client: 'Acme', orgId: '123', facilioRegion: 'AE', name: 'P' }, brdMd: md, reqs: [{ id: 'WO-1', title: 'Assign by trade', status: 'Confirmed', modules: ['workorder'] }, { id: 'WO-2', title: 'Old', status: 'Rejected', modules: ['workorder'] }], sla: [{ module: 'workorder', priority: 'High', response: '1 h', resolution: '4 h' }], kpis: [], apps: [{ app: 'SAP', purpose: 'Costs' }] };
const f = L.fromStudio(ctx); const t = f.map(x => x.title);
assert.ok(t.includes('Project Information') && t.includes('Work Orders') && t.includes('SLA & Notifications') && t.includes('Integrations') && t.includes('Role Matrix – Module Access'));
assert.match(f.find(x => x.title === 'Project Information').md, /\| Facilio org ID \| 123 \|/); assert.match(f.find(x => x.title === 'Use Case').md, /Track repairs/);
const fr = f.find(x => x.title === 'Functional Requirements').md; assert.ok(fr.includes('WO-1') && !fr.includes('WO-2'), 'rejected requirements stay out'); assert.match(f.find(x => x.title === 'SLA & Notifications').md, /Work Orders \| High/);
ok('the studio draft fills project information, use case, requirements, SLA and integrations');
const mods = L.fromStudio(Object.assign({}, ctx, { kind: 'modules' })); assert.ok(!mods.some(x => x.title === 'SLA & Notifications')); ok('a module document has no closing sections');
const integ = L.fromStudio({ kind: 'integration', app: { app: 'SAP', purpose: 'Send costs', dataOut: 'Work order cost' }, project: {} }); assert.deepEqual(integ.map(x => x.title).slice(0, 3), ['Project Information', 'Overview', 'Systems and Direction']); assert.match(integ.find(x => x.title === 'Data Exchanged').md, /Work order cost/); ok('an integration document has its own sections');

// merge: a person's edit stays and the new text waits as a proposal
const cur = [{ id: 'a', title: 'Background', lvl: 1, md: 'Mine', edited: true }, { id: 'b', title: 'Key Terms', lvl: 1, md: '[To be confirmed]' }];
const m = L.merge(cur, [{ title: 'Background', lvl: 1, md: 'Claude', src: 'claude' }, { title: 'Key Terms', lvl: 1, md: 'PPM: planned maintenance', src: 'claude' }, { title: 'Glossary note', lvl: 2, md: 'x', src: 'claude' }]);
assert.equal(m[0].md, 'Mine'); assert.equal(m[0].proposal.md, 'Claude'); assert.equal(m[1].md, 'PPM: planned maintenance'); assert.equal(m[2].title, 'Glossary note'); assert.equal(cur[0].proposal, undefined, 'the input is not changed');
assert.equal(L.merge(cur, [{ title: 'Background', lvl: 1, md: 'Mine' }])[0].proposal, undefined, 'the same text is no proposal'); ok('a person’s edit is kept and Claude’s text waits as a proposal');
// two modules: each keeps its own sub-sections (found live on Al Moallam: the second module's Use Case overwrote the first one's)
const two = L.fromStudio(Object.assign({}, ctx, { kind: 'modules', modules: [{ name: 'workorder', label: 'Work Orders' }, { name: 'client', label: 'Clients' }] }));
const m2 = L.merge([], two); assert.equal(m2.length, two.length); assert.deepEqual(m2.map(x => x.title), two.map(x => x.title));
const uc = m2.filter(x => x.title === 'Use Case'); assert.equal(uc.length, 2); assert.match(uc[0].md, /Track repairs/); assert.match(uc[1].md, /To be confirmed/);
const again = L.merge(m2, two); assert.equal(again.length, two.length, 'drafting twice adds nothing'); ok('two modules keep their own sub-sections and a second draft adds nothing');

// wiring: the page is on the menu, built, a team-only record kind, a Claude task and the job writes it back
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
assert.match(read('src/shell.js'), /\['soldoc', 'Solution document'\]/); assert.match(read('build.mjs'), /'src\/soldoc\.js'/);
const api = read('work/server/api.mjs'); assert.match(api, /'trtext', 'sdoc'\]/); assert.match(api, /TEAM_KINDS = new Set\(\[[^\]]*'sdoc'/); assert.match(api, /soldoc: \{ title: 'Solution document'/);
const jobs = read('work/server/_jobs.mjs'); assert.match(jobs, /save_draft with task soldoc/); assert.match(jobs, /Org ID and region/); assert.match(read('src/settings.js'), /project\.facilioRegion/);
ok('the page, record kind, AI task, Claude job and the Org ID field are wired');
console.log(n + ' solution document page checks passed');
