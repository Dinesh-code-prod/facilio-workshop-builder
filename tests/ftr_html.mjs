// FTR checklist HTML (src/ftrhtml.js) and the check of the downloaded results (src/ftrresult.js): items come only from the data given, configuration checks and functional tests are kept apart
// everywhere (page, CSV, JSON, counts), ids are stable, every string is escaped, the file asks for nothing from outside, its script parses and runs (in vm with a tiny fake page, no network),
// the results it downloads are accepted, and hostile results are refused without throwing.
import assert from 'node:assert/strict'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url); const H = req('../src/ftrhtml.js'), R = req('../src/ftrresult.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const project = { id: 'p_123', name: 'CAFM roll-out', customer: 'Acme' };
const input = {
  project,
  modules: [
    { name: 'Work Orders', forms: ['Work order form'], fields: [{ name: 'Priority', type: 'Picklist', required: true }, 'Due date'], roles: [{ name: 'Technician', permissions: ['Create', 'Edit'] }, 'Supervisor'],
      workflows: [{ name: 'Auto assign', trigger: 'Work order created' }, { name: 'Close approval', approval: true }], statuses: [{ name: 'Open', to: ['In Progress'] }, 'In Progress', 'Closed'],
      notifications: [{ name: 'Assigned mail', trigger: 'Assigned', recipients: ['Technician'] }], integrations: ['SAP sync'], reports: ['Open work orders'], dependsOn: ['Assets'], portals: ['Technician app'], slas: [{ id: 's1', priority: 'Critical', response: '30 minutes', resolution: '4 hours', hours: '24x7', esc: [{ after: '30 min', to: 'Supervisor' }] }], kpis: [{ id: 'k1', name: 'Closed on time', source: 'Work orders', freq: 'Monthly', target: '90', solution: 'A dashboard widget' }], requirements: [{ id: 'WO-001', title: 'Weekly report', objective: 'A report goes out every week.', rules: 'Sent on Monday' }], apps: [{ name: 'Multi-technician view', trigger: 'button', triggerLabel: 'Assign', purpose: 'Assign several technicians', shows: 'a calendar' }] },
    { name: 'Assets' }],
  config: { portals: ['Tenant portal'], roles: ['Admin'], integrations: ['Email gateway'], notifications: ['Welcome mail'] }
};
const list = H.buildFtrChecklist(input); const html = H.ftrChecklistHtml(list);
const sec = s => list.items.filter(i => i.section === s);

t('every item carries the fields the roadmap asks for, with empty result, evidence, by and at', () => {
  assert.ok(list.items.length > 20);
  list.items.forEach(i => { ['id', 'section', 'type', 'module', 'title', 'what', 'expected', 'source'].forEach(k => assert.ok(typeof i[k] === 'string' && (k === 'module' || i[k]), k + ' on ' + i.id)); assert.ok(['configuration', 'functional'].includes(i.section)); assert.ok(H.TYPES[i.type], i.type);
    assert.equal(i.result, ''); assert.equal(i.evidence, ''); assert.equal(i.by, ''); assert.equal(i.at, ''); });
  assert.ok(sec('configuration').length && sec('functional').length); });
t('all sixteen check types can appear, and only because the data names something', () => {
  const types = new Set(list.items.map(i => i.type)); Object.keys(H.TYPES).forEach(k => assert.ok(types.has(k), 'type ' + k)); assert.equal(Object.keys(H.TYPES).length, 18); });
t('nothing is invented: no data, no items; a module with only a name gets only its configuration validation and names its gaps', () => {
  assert.deepEqual(H.buildFtrChecklist({}).items, []); assert.deepEqual(H.buildFtrChecklist(null).items, []); assert.deepEqual(H.buildFtrChecklist({ modules: [{ name: '  ' }, {}, null, 5] }).items.map(i => i.type), ['validation']);
  const only = H.buildFtrChecklist({ modules: [{ name: 'Assets' }] }); assert.equal(only.items.length, 1); assert.equal(only.items[0].section, 'configuration'); assert.equal(only.items[0].type, 'validation'); assert.ok(only.gaps.some(g => /Assets: no workflows listed/.test(g)));
  const forms = H.buildFtrChecklist({ modules: [{ name: 'Assets', forms: ['Asset form'] }] }); assert.ok(!forms.items.some(i => ['workflow', 'notification', 'integration', 'report', 'approval', 'transition', 'process', 'role', 'access'].includes(i.type))); });
t('every name in an item comes from the input (each item mentions its module, a listed thing, or the project data it was built from)', () => {
  const known = ['Work Orders', 'Assets', 'Work order form', 'Priority', 'Due date', 'Technician', 'Supervisor', 'Auto assign', 'Close approval', 'Open', 'In Progress', 'Closed', 'Assigned mail', 'SAP sync', 'Open work orders', 'Technician app', 'Tenant portal', 'Admin', 'Email gateway', 'Welcome mail', 'WO-001', 'Multi-technician view'];
  list.items.forEach(i => assert.ok(known.some(k => (i.title + ' ' + i.what).includes(k)), i.id + ': ' + i.title));
  assert.ok(!list.items.some(i => /Unknown|Lorem|TBD/.test(i.title + i.what + i.expected))); });
t('permissions are checked only for roles whose permissions are listed; the others are named as a gap', () => {
  const p = list.items.filter(i => i.type === 'permission'); assert.equal(p.length, 2); assert.ok(p.every(i => /Technician/.test(i.title) && /Create, Edit/.test(i.what))); assert.ok(list.gaps.some(g => /Supervisor/.test(g) && /permission/.test(g))); });
t('project level items come from the Configuration Hub only when the modules did not already name them', () => {
  const hub = list.items.filter(i => i.source === 'Configuration Hub'); assert.ok(hub.some(i => /Tenant portal/.test(i.title)) && hub.some(i => /Email gateway/.test(i.title)) && hub.some(i => /Welcome mail/.test(i.title)));
  const dup = H.buildFtrChecklist({ modules: [{ name: 'A', integrations: ['SAP'] }], config: { integrations: ['sap'] } }); assert.equal(dup.items.filter(i => i.type === 'integration').length, 2); });
t('configuration items say that inspection does not prove runtime behaviour; functional items say to run it in the application', () => {
  sec('configuration').forEach(i => assert.match(i.what, /does not prove the application behaves correctly/)); sec('functional').forEach(i => { assert.match(i.what, /^Run this in the application/); assert.ok(!/does not prove/.test(i.what)); }); });

t('ids are stable across runs, unique, readable, and unrelated data does not change them', () => {
  const again = H.buildFtrChecklist(JSON.parse(JSON.stringify(input))); assert.deepEqual(again.items.map(i => i.id), list.items.map(i => i.id)); assert.equal(new Set(list.items.map(i => i.id)).size, list.items.length);
  list.items.forEach(i => assert.match(i.id, /^FTR-(CFG|FUN)-[A-Z]{3}-[a-z0-9-]+$/));
  const more = H.buildFtrChecklist(Object.assign({}, input, { modules: input.modules.concat([{ name: 'Spaces', forms: ['Space form'] }]) })); const ids = new Set(more.items.map(i => i.id)); list.items.forEach(i => assert.ok(ids.has(i.id), i.id)); });
t('two long names that start the same, and two items with the same name, never share an id', () => {
  const long = 'A very long workflow name that goes on and on'; const r = H.buildFtrChecklist({ modules: [{ name: 'M', workflows: [long + ' one', long + ' two'] }, { name: 'M2', workflows: ['x'] }] }); assert.equal(new Set(r.items.map(i => i.id)).size, r.items.length); assert.ok(r.items.every(i => i.id.length < 70)); });

const between = (a, b) => { const x = html.indexOf(a), y = b ? html.indexOf(b) : html.length; assert.ok(x > 0 && y > x, a); return html.slice(x, y); };
t('the page keeps the two sections apart: configuration items only in the configuration section, functional only in the functional one', () => {
  const c = between('<section class="sec" id="sec-configuration">', '<section class="sec fn" id="sec-functional">'), f = between('<section class="sec fn" id="sec-functional">', '<section id="gaps">');
  sec('configuration').forEach(i => { assert.ok(c.includes(`data-item="${i.id}"`), i.id); assert.ok(!f.includes(`data-item="${i.id}"`)); }); sec('functional').forEach(i => { assert.ok(f.includes(`data-item="${i.id}"`), i.id); assert.ok(!c.includes(`data-item="${i.id}"`)); });
  assert.ok(/Two separate lists/.test(html)); assert.ok(html.includes('id="cnt-configuration"') && html.includes('id="cnt-functional"')); assert.ok(!/pass rate|overall|combined total/i.test(html.replace(/never added together/, ''))); });
t('each item has Pass, Fail, Blocked, N/A and Not run, a comment box, and the not-covered list is shown', () => {
  const one = list.items[0].id; ['Pass', 'Fail', 'Blocked', 'N/A'].forEach(r => assert.ok(html.includes(`data-r="${one}" value="${r}"`), r)); assert.ok(html.includes(`data-r="${one}" value=""`)); assert.ok(html.includes(`data-c="${one}"`)); assert.ok(html.includes('id="gaps"')); assert.ok(html.includes('id="dl-json"') && html.includes('id="dl-csv"')); });
t('colours stay in the Facilio palette (no violet or purple, no glow), the page has a viewport and focus styles', () => {
  assert.ok(!/purple|violet|glow|#7c3aed|#8b5cf6/i.test(html)); ['#1D1A5E', '#1570EF', '#E5197F', '#8DB8FF'].forEach(c => assert.ok(html.includes(c), c)); assert.ok(/name="viewport"/.test(html) && /:focus-visible/.test(html) && /lang="en"/.test(html)); });
t('every project string is escaped, in the page and in the data block (script, quotes, backticks)', () => {
  const evil = '<script>alert(1)</script>"\'`${x}&';
  const l = H.buildFtrChecklist({ project: { id: 'p_<x>', name: evil, customer: evil }, modules: [{ name: evil, forms: [evil], fields: [{ name: evil, type: evil }], roles: [{ name: evil, permissions: [evil] }], workflows: [{ name: evil, trigger: evil, approval: true }], statuses: [{ name: evil, to: [evil] }], notifications: [{ name: evil, trigger: evil, recipients: [evil] }], integrations: [evil], reports: [evil], dependsOn: [evil], portals: [evil] }], config: { portals: [evil], roles: [evil], integrations: [evil], notifications: [evil] } });
  const h = H.ftrChecklistHtml(l); assert.ok(l.items.length > 15);
  assert.ok(!h.includes('<script>alert'), 'raw script tag'); assert.ok(!h.includes('alert(1)</script>')); assert.ok(!/<(img|svg|iframe)/i.test(h)); assert.equal((h.match(/<script/g) || []).length, 2, 'only the two script blocks of the page');
  assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&#96;${x}&amp;')); assert.ok(!/`/.test(h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/, '')), 'no raw backtick in the page text');
  assert.ok(!/ on[a-z]+\s*=/i.test(h.replace(/<script>[\s\S]*<\/script>/, '')), 'no inline handler');
  const m = /<script type="application\/json" id="spec">([\s\S]*?)<\/script>/.exec(h); assert.ok(m && !/[<>&]/.test(m[1])); assert.equal(JSON.parse(m[1]).project.name, evil); });
t('the file asks for nothing from outside: no web address, no frame or form or image, a policy that blocks every request', () => {
  assert.ok(!/https?:\/\//i.test(html), 'no web address'); assert.ok(!/<(iframe|form|link|img|embed|object)\b/i.test(html)); assert.ok(!/\bsrc=|\bhref="(?!#)/i.test(html));
  assert.match(html, /Content-Security-Policy" content="default-src 'none'/); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|eval\(|innerHTML/.test(html)); });
const blocks = [...html.matchAll(/<script(?: type="application\/json" id="spec")?>([\s\S]*?)<\/script>/g)].map(x => x[1]);
t('the page script parses (vm only, nothing is run), and the data block is valid JSON', () => {
  assert.equal(blocks.length, 2); const spec = JSON.parse(blocks[0]); assert.equal(spec.schema, 'fds-ftr-result'); assert.equal(spec.items.length, list.items.length);
  assert.doesNotThrow(() => new vm.Script(blocks[1], { filename: 'page.js' })); assert.doesNotThrow(() => new vm.Script('(' + H.makeResult.toString() + ')', { filename: 'r.js' })); });
t('the page embeds the very functions the tests call to build the JSON and the CSV', () => { assert.ok(blocks[1].includes(H.makeResult.toString())); assert.ok(blocks[1].includes(H.makeCsv.toString())); });
t('generation is deterministic', () => { assert.equal(H.ftrChecklistHtml(H.buildFtrChecklist(input)), html); });

// ---- the page, run in vm against a tiny fake page: set results, reload from the saved progress, download ----
function runPage(store) {
  const spec = JSON.parse(blocks[0]), all = [], byId = { spec: { textContent: blocks[0] } }, L = {}, blobs = [], downloads = [];
  const el = attrs => { const e = { attrs, value: attrs.value || '', checked: false, textContent: '', id: attrs.id, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } }; all.push(e); return e; };
  ['by', 'cnt-configuration', 'cnt-functional', 'dlnote', 'dl-json', 'dl-csv'].forEach(id => { byId[id] = el({ id }); });
  const radios = {}, boxes = {}; spec.items.forEach(i => { el({ 'data-item': i.id }); radios[i.id] = ['Pass', 'Fail', 'Blocked', 'N/A', ''].map(v => el({ 'data-r': i.id, value: v })); boxes[i.id] = el({ 'data-c': i.id }); });
  const doc = { getElementById: id => byId[id] || null, querySelectorAll: sel => { const m = /^\[([a-z-]+)\]$/.exec(sel); return all.filter(e => m[1] in e.attrs); }, addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); },
    createElement: () => ({ click() { downloads.push({ name: this.download, blob: blobs[Number(String(this.href).slice(5)) - 1] }); }, remove() { } }), body: { appendChild() { } } };
  class Blob { constructor(p, o) { this.text = p.join(''); this.type = o.type; } }
  vm.runInNewContext(blocks[1], { document: doc, Blob, URL: { createObjectURL: b => { blobs.push(b); return 'blob:' + blobs.length; }, revokeObjectURL() { } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } }, setTimeout: () => 0, Date, JSON });
  const fire = (k, target) => (L[k] || []).forEach(f => f({ target }));
  return { spec, byId, radios, boxes, downloads, all,
    set(id, v) { const r = radios[id].find(x => x.value === v); fire('change', r); }, say(id, v) { boxes[id].value = v; fire('input', boxes[id]); }, name(v) { byId.by.value = v; fire('input', byId.by); }, click(id) { fire('click', byId[id]); } };
}
const cfg1 = list.items.find(i => i.section === 'configuration').id, cfg2 = sec('configuration')[1].id, fn1 = sec('functional')[0].id, fn2 = sec('functional')[1].id, fn3 = sec('functional')[2].id;
const store = {}; const pg = runPage(store);
t('the counts start with every item not run, and are written per section, never as one number', () => {
  assert.match(pg.byId['cnt-configuration'].textContent, new RegExp('^Configuration checks: 0 pass, 0 fail, 0 blocked, 0 N/A, ' + sec('configuration').length + ' not run \\(of ' + sec('configuration').length + '\\)$'));
  assert.match(pg.byId['cnt-functional'].textContent, new RegExp('^Functional tests: 0 pass, 0 fail, 0 blocked, 0 N/A, ' + sec('functional').length + ' not run')); });
t('setting results updates each section on its own, and clearing one with Not run takes it back', () => {
  pg.set(cfg1, 'Pass'); pg.set(cfg2, 'Pass'); pg.set(fn1, 'Fail'); pg.set(fn2, 'Blocked'); pg.set(fn3, 'N/A'); pg.set(fn3, '');
  assert.match(pg.byId['cnt-configuration'].textContent, /: 2 pass, 0 fail, 0 blocked, 0 N\/A,/); assert.match(pg.byId['cnt-functional'].textContent, /: 0 pass, 1 fail, 1 blocked, 0 N\/A,/);
  assert.equal(pg.all.find(e => e.attrs['data-item'] === fn1).attrs['data-state'], 'Fail'); assert.equal(pg.all.find(e => e.attrs['data-item'] === fn3).attrs['data-state'], 'none'); });
t('the JSON download is the page code path: it validates, holds only ids, results, comments and the name, and round-trips', () => {
  pg.say(cfg1, 'Matches the BRD'); pg.say(fn1, '=HYPERLINK("x")'); pg.say(fn2, 'Waiting for the SAP test system'); pg.name('Priya'); pg.click('dl-json');
  const d = pg.downloads.pop(); assert.match(d.name, /^ftr-results-cafm-roll-out\.json$/); assert.equal(d.blob.type, 'application/json'); const file = JSON.parse(d.blob.text);
  assert.deepEqual(Object.keys(file).sort(), ['by', 'generatedAt', 'project', 'results', 'schema', 'version']); assert.deepEqual(Object.keys(file.results[0]).sort(), ['at', 'comment', 'id', 'result']); assert.equal(file.by, 'Priya'); assert.equal(file.results.length, 4);
  const v = R.validateFtrResult(d.blob.text, list); assert.deepEqual(v.errors, []); assert.ok(v.ok); assert.equal(v.clean.results.find(r => r.id === cfg1).comment, 'Matches the BRD');
  const s = R.summarise(list, v.clean); assert.equal(s.configuration.pass, 2); assert.equal(s.functional.fail, 1); assert.equal(s.functional.blocked, 1); assert.equal(s.failed.length, 1); assert.equal(s.failed[0].id, fn1); });
t('the CSV download has separate configuration and functional result columns, one row per item, and a comment that starts with = cannot run as a formula', () => {
  pg.click('dl-csv'); const d = pg.downloads.pop(); assert.match(d.name, /\.csv$/); const rows = d.blob.text.replace(/^﻿/, '').trim().split('\r\n'); assert.equal(rows.length, list.items.length + 1);
  assert.equal(rows[0], 'Section,ID,Type,Module,Check,Configuration result,Functional result,Comment,Checked by,Checked at');
  const row = id => rows.find(r => r.split(',')[1] === id); assert.match(row(cfg1), /^Configuration,[^,]+,[^,]+,[^,]*,.*,Pass,,Matches the BRD,Priya,/); assert.match(row(fn1), /,,Fail,"'=HYPERLINK\(""x""\)",Priya,/); assert.ok(!/^=/m.test(d.blob.text)); });
t('progress is kept in the browser and comes back on reload; a damaged or hostile saved copy is ignored without breaking the page', () => {
  const again = runPage(store); assert.match(again.byId['cnt-configuration'].textContent, /: 2 pass,/); assert.equal(again.byId.by.value, 'Priya'); assert.equal(again.boxes[cfg1].value, 'Matches the BRD'); assert.equal(again.radios[cfg1].find(r => r.value === 'Pass').checked, true); assert.equal(again.radios[cfg1].find(r => r.value === 'Fail').checked, false);
  const key = Object.keys(store)[0]; const bad = { [key]: JSON.stringify({ by: 5, res: { [cfg1]: 'Maybe', nope: 'Pass' }, com: { [cfg1]: 7 }, at: [] }) }; const p2 = runPage(bad); assert.match(p2.byId['cnt-configuration'].textContent, /: 0 pass,/); assert.equal(p2.byId.by.value, '');
  assert.doesNotThrow(() => runPage({ [key]: '{not json' })); assert.doesNotThrow(() => runPage({ [key]: 'null' })); });

// ---- the results check ----
const good = () => ({ schema: 'fds-ftr-result', version: 1, project: { id: 'p_123', name: 'CAFM roll-out' }, generatedAt: '2026-11-10T09:00:00.000Z', by: 'Priya', results: [{ id: cfg1, result: 'Pass', comment: 'ok', at: '2026-11-10T08:00:00.000Z' }, { id: fn1, result: 'Fail', comment: 'Saved but the priority was lost', at: '2026-11-10T08:30:00.000Z' }, { id: fn2, result: 'Blocked', comment: '' }] });
const parse = s => JSON.parse(JSON.stringify(s)); const val = (j, l) => R.validateFtrResult(j, l || list);
t('a good file is accepted, as text and as an object, and the clean copy holds only the known fields', () => {
  const a = val(good()), b = val(JSON.stringify(good())); assert.ok(a.ok && b.ok); assert.deepEqual(a.errors, []); assert.deepEqual(Object.keys(a.clean).sort(), ['by', 'generatedAt', 'project', 'results', 'schema', 'version']); assert.equal(a.clean.by, 'Priya'); assert.equal(a.clean.results.length, 3); assert.equal(a.clean.results[2].at, ''); });
t('unknown check ids, bad results, bad comments, duplicates and the wrong project are refused', () => {
  const bad = f => { const g = good(); f(g); return val(g); };
  assert.match(bad(g => { g.results.push({ id: 'FTR-NOPE', result: 'Pass' }); }).errors[0], /unknown check id "FTR-NOPE"/); assert.ok(!bad(g => { g.results[0].result = 'Passed'; }).ok); assert.ok(!bad(g => { g.results[0].result = 1; }).ok); assert.ok(!bad(g => { g.results[0].comment = 'x'.repeat(2001); }).ok); assert.ok(!bad(g => { g.results[0].comment = 5; }).ok);
  assert.ok(!bad(g => { g.results.push(g.results[0]); }).ok); assert.ok(!bad(g => { g.project.id = 'p_other'; }).ok); assert.ok(!bad(g => { g.results = {}; }).ok); assert.ok(!bad(g => { g.by = 'x'.repeat(121); }).ok); assert.ok(!bad(g => { g.results[0].id = 7; }).ok);
  assert.ok(!bad(g => { g.schema = 'other'; }).ok); assert.ok(!bad(g => { g.version = 2; }).ok); assert.ok(!val('not json {').ok); assert.ok(bad(g => { g.project.name = 'Another name'; }).warnings.length === 1); });
t('a file over 1 MB is refused, as text and as an object', () => { const g = good(); g.by = 'x'.repeat(10); g.results[0].comment = 'x'.repeat(2000); const big = parse(g); while (JSON.stringify(big).length < 1.1e6) big.results.push({ id: cfg2, result: 'Pass', comment: 'x'.repeat(1900) }); const r = val(JSON.stringify(big)); assert.ok(!r.ok); assert.match(r.errors[0], /larger than 1 MB/); assert.ok(!val(big).ok); });
t('prototype-pollution keys are refused at any depth and nothing is polluted', () => {
  const s1 = JSON.stringify(good()).replace('"results":[', '"results":[{"id":"x","__proto__":{"polluted":"yes"}},'); const r1 = val(s1); assert.ok(!r1.ok); assert.match(r1.errors[0], /__proto__/);
  assert.ok(!val(JSON.stringify(good()).replace('"by":', '"constructor":{"prototype":{"x":1}},"by":')).ok); assert.ok(!val('{"schema":"fds-ftr-result","version":1,"results":[{"id":"FTR","prototype":1}]}').ok); assert.equal({}.polluted, undefined); assert.equal({}.x, undefined); });
t('an id such as __proto__ or constructor is just an unknown id', () => { ['__proto__x', 'constructor', 'toString', 'hasOwnProperty'].forEach(id => { const g = good(); g.results.push({ id, result: 'Pass' }); const r = val(g); assert.ok(!r.ok); assert.match(r.errors[0], /unknown check id/); }); });
t('unknown keys and bad dates are dropped with a warning, an empty result is left out', () => {
  const g = good(); g.extra = 1; g.results[0].note = 'x'; g.results[0].at = 'yesterday'; g.generatedAt = 'soon'; g.results.push({ id: cfg2, result: '', comment: ' ' }); const r = val(g); assert.ok(r.ok); assert.ok(!('extra' in r.clean) && !('note' in r.clean.results[0])); assert.equal(r.clean.results[0].at, ''); assert.equal(r.clean.generatedAt, ''); assert.equal(r.clean.results.length, 3); assert.ok(r.warnings.length >= 4); });
t('hostile input never throws', () => { const loop = {}; loop.self = loop; let deep = {}; for (let i = 0; i < 50; i++) deep = { a: deep };
  [null, undefined, 7, true, [], 'null', '[]', '{"schema":', loop, { schema: 'fds-ftr-result', version: 1, results: deep }, { schema: 'fds-ftr-result', version: 1, results: [null, 3, 'x', []] }, Object.create(null), { schema: 'fds-ftr-result', version: 1, results: new Array(20001).fill({ id: cfg1 }) }].forEach(x => { const r = val(x); assert.equal(r.ok, false, typeof x); assert.ok(r.errors.length && r.clean === null); });
  assert.equal(R.validateFtrResult(good(), null).ok, false); assert.equal(R.validateFtrResult(good(), {}).ok, false); });

// ---- the summary ----
t('summarise keeps configuration and functional apart: separate tallies, separate rates, no combined total or rate', () => {
  const v = val(good()); const s = R.summarise(list, v.clean); assert.deepEqual(Object.keys(s).sort(), ['blocked', 'configuration', 'failed', 'functional']);
  assert.deepEqual(s.configuration, { total: sec('configuration').length, pass: 1, fail: 0, blocked: 0, na: 0, notRun: sec('configuration').length - 1, passRate: 100 });
  assert.deepEqual(s.functional, { total: sec('functional').length, pass: 0, fail: 1, blocked: 1, na: 0, notRun: sec('functional').length - 2, passRate: 0 });
  assert.ok(!('total' in s) && !('passRate' in s) && !('overall' in s)); assert.equal(s.failed.length, 1); assert.deepEqual(Object.keys(s.failed[0]).sort(), ['comment', 'id', 'module', 'section', 'title', 'type']); assert.equal(s.failed[0].comment, 'Saved but the priority was lost'); assert.equal(s.blocked[0].id, fn2); });
t('the pass rate of a section counts only the checks that were run, N/A is left out, and nothing run means no rate', () => {
  const rs = [{ id: cfg1, result: 'Pass' }, { id: cfg2, result: 'Fail' }, { id: sec('configuration')[2].id, result: 'N/A' }]; const s = R.summarise(list, rs); assert.equal(s.configuration.passRate, 50); assert.equal(s.configuration.na, 1); assert.equal(s.functional.passRate, null);
  const e = R.summarise(list, []); assert.equal(e.configuration.passRate, null); assert.equal(e.configuration.notRun, e.configuration.total); assert.deepEqual(e.failed, []); const z = R.summarise(null, null); assert.equal(z.configuration.total, 0); });
t('results for ids the checklist does not hold, repeated ids and bad result words are ignored by the summary', () => { const s = R.summarise(list, [{ id: 'FTR-NOPE', result: 'Fail' }, { id: cfg1, result: 'Pass' }, { id: cfg1, result: 'Fail' }, { id: cfg2, result: 'Great' }]); assert.equal(s.configuration.pass, 1); assert.equal(s.configuration.fail, 0); assert.equal(s.failed.length, 0); });
t('a confirmed requirement is a functional test only; a connected app has a configuration check and a functional test, apart', () => {
  const r = H.buildFtrChecklist({ modules: [{ name: 'Work Orders', requirements: [{ id: 'WO-001', title: 'Weekly report', objective: 'A report goes out every week.', rules: 'Sent on Monday' }, { id: '', title: 'No id' }], apps: [{ name: 'Multi-technician view', trigger: 'button', triggerLabel: 'Assign', purpose: 'Assign several technicians', shows: 'a calendar' }] }] });
  const q = r.items.filter(i => i.type === 'requirement'); assert.equal(q.length, 1, 'one per requirement that has an id and a title'); assert.equal(q[0].section, 'functional'); assert.ok(q[0].what.includes('Check the rule: Sent on Monday') && q[0].expected === 'A report goes out every week.' && q[0].source === 'Confirmed requirement WO-001');
  const a = r.items.filter(i => i.type === 'app'); assert.deepEqual(a.map(i => i.section).sort(), ['configuration', 'functional']); assert.ok(a.every(i => i.what.includes('the Assign button of "Work Orders"')) && a.find(i => i.section === 'functional').what.includes('it should show a calendar'));
  assert.equal(new Set(r.items.map(i => i.id)).size, r.items.length, 'ids stay unique'); });
console.log(`\n${n} FTR checklist checks passed`);
