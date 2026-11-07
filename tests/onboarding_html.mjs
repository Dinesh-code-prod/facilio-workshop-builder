// Customer onboarding HTML (src/onbhtml.js) and the check of a returned package (src/onbreturn.js): the file is deterministic, asks for nothing from outside, escapes every project string,
// its script parses, and a package built by the page's own code is accepted while hostile or wrong packages are refused without throwing.
import assert from 'node:assert/strict'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url); const H = req('../src/onbhtml.js'), R = req('../src/onbreturn.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const project = { id: 'p_123', name: 'CAFM roll-out', customer: 'Acme' };
const plan = {
  lead: 'We load master data only.', tip: 'Add custom fields as new columns at the end.',
  master: [{ mod: 'Assets', need: 'The asset register', skip: 'Work order history', sheets: ['Asset'] }],
  sheets: [
    { sheet: 'Site', crit: 'Critical', due: '2026-12-01', why: ['Every project'], purpose: 'Your sites.', steps: ['Fill one row per site.'], watch: ['No duplicates.'], before: [], mistakes: ['Site Name: no duplicates.'], cols: [{ ent: 'Site', h: 'Site Name', req: true, doc: 'The site.', rule: 'Required.', ex: 'Alpha Tower' }, { ent: 'Site', h: 'Latitude', req: false, doc: '', rule: 'Latitude, -90 to 90.', ex: '12.5' }] },
    { sheet: 'Asset', crit: 'High', why: ['Assets'], purpose: 'Your assets.', steps: [], watch: [], before: ['Site'], mistakes: [], cols: [{ ent: 'Asset', h: 'Asset Name', req: true, doc: 'The asset, with "quotes", commas, and a, b.', rule: '', ex: 'Chiller 1' }] }],
  files: [{ id: 'insp', name: 'Inspection checklists', ask: 'Your current forms.', mods: ['Inspection Management'] }], auto: [], none: []
};
const opts = { scope: ['Four modules in scope'], modules: ['Assets', 'Portfolio'], plan, upload: { ext: ['xlsx', 'csv'], maxMB: 60 }, fmt: d => d };
const html = H.buildOnboardingHtml(project, opts); const ids = H.idsFor(opts);
const rules = { checklistIds: ids.checklist, answerIds: ids.answers };
const good = () => H.makePackage({ id: project.id, name: project.name }, { checklist: { read_guide: true, sheet_site: true, sheet_asset: false }, answers: { q_contact: 'Priya, 99999', note_asset: 'Two sources' } }, [{ name: 'assets.xlsx', size: 1234, sha256: 'a'.repeat(64) }], '2026-11-10T09:00:00.000Z');
const parse = s => JSON.parse(JSON.stringify(s));

t('generation is deterministic', () => { assert.equal(H.buildOnboardingHtml(project, opts), html); });
t('the file asks for nothing from outside: no web addresses, no frame or form, a policy that blocks every request', () => {
  assert.ok(!/https?:\/\//i.test(html), 'no web address'); assert.ok(!/<(iframe|form|link|img|embed|object)\b/i.test(html)); assert.ok(!/\bsrc=|\bhref="(?!#)/i.test(html));
  assert.match(html, /Content-Security-Policy" content="default-src 'none'/); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html)); });
t('it has the welcome, a card per sheet with fields and a sample row, the files, the questions and the download', () => {
  ['id="welcome"', 'id="sheet-site"', 'id="sheet-asset"', 'Fields and formats', 'A sample row', 'Upload requirements', 'id="files"', 'id="questions"', 'Save workbook', 'Download the answers only', 'role="progressbar"', 'Please send by 2026-12-01'].forEach(s => assert.ok(html.includes(s), s));
  assert.ok(!html.includes('Please send by undefined')); });
t('colours stay in the Facilio palette (no violet or purple, no glow)', () => { assert.ok(!/purple|violet|glow|#7c3aed|#8b5cf6/i.test(html)); ['#1D1A5E', '#1570EF', '#E5197F', '#8DB8FF'].forEach(c => assert.ok(html.includes(c), c)); });
t('every project string is escaped, in the page and in the data block', () => {
  const evil = '<script>alert(1)</script>"\'`${x}&';
  const h = H.buildOnboardingHtml({ id: 'p_<x>', name: evil, customer: evil }, { scope: [evil], modules: [evil], plan: { lead: evil, tip: evil, master: [{ mod: evil, need: evil, skip: evil, sheets: [evil] }], sheets: [{ sheet: evil, crit: evil, due: evil, why: [evil], purpose: evil, steps: [evil], watch: [evil], before: [evil], mistakes: [evil], cols: [{ ent: evil, h: evil, req: true, doc: evil, rule: evil, ex: evil }] }], files: [{ id: evil, name: evil, ask: evil, mods: [evil] }] }, upload: { ext: [evil], maxMB: 1 }, fmt: d => d });
  assert.ok(!h.includes('<script>alert'), 'raw script tag'); assert.ok(!h.includes('alert(1)</script>')); assert.ok(!/<(img|svg|iframe)/i.test(h));
  assert.equal((h.match(/<script/g) || []).length, 3, 'only the three script blocks of the page (spec, saved data holder, script)'); assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;`${x}&amp;'));
  assert.ok(!/ on[a-z]+\s*=/i.test(h.replace(/<script>[\s\S]*<\/script>/, '')), 'no inline handler');
  const m = /<script type="application\/json" id="spec">([\s\S]*?)<\/script>/.exec(h); assert.ok(m && !/[<>&]/.test(m[1])); assert.equal(JSON.parse(m[1]).project.name, evil); });
t('the page script parses, and the data block is valid JSON', () => {
  const blocks = [...html.matchAll(/<script(?: type="application\/json" id="spec")?>([\s\S]*?)<\/script>/g)].map(x => x[1]); assert.equal(blocks.length, 2);
  const spec = JSON.parse(blocks[0]); assert.equal(spec.schema, 'fds-onboarding-return'); assert.deepEqual(spec.ids.checklist, ids.checklist);
  assert.doesNotThrow(() => new vm.Script(blocks[1], { filename: 'page.js' })); assert.doesNotThrow(() => new Function('return ' + H.makePackage.toString())); });
t('the page embeds the very function the tests call to build the package', () => { assert.ok(html.includes(H.makePackage.toString())); });
t('the ids the page defines are unique and stable', () => { assert.equal(new Set(ids.checklist).size, ids.checklist.length); assert.ok(ids.checklist.includes('sheet_site') && ids.checklist.includes('file_f_insp') && ids.checklist.includes('ready_to_send')); assert.ok(ids.answers.includes('note_asset')); });

t('a good package is accepted and the clean copy holds only the checked fields', () => { const r = R.validateReturn(parse(good()), project, rules); assert.deepEqual(r.errors, []); assert.ok(r.ok); assert.equal(r.clean.files[0].sha256, 'a'.repeat(64)); assert.equal(r.clean.answers.q_contact, 'Priya, 99999'); assert.equal(r.clean.checklist.sheet_asset, false); });
t('the same package as text is accepted too', () => { assert.ok(R.validateReturn(JSON.stringify(good()), project, rules).ok); });
t('round trip: the package the page builds is accepted, with nothing lost', () => { const r = R.validateReturn(JSON.stringify(good()), project, rules); assert.deepEqual(Object.keys(r.clean.checklist).sort(), ['read_guide', 'sheet_asset', 'sheet_site']); assert.equal(r.clean.generatedAt, '2026-11-10T09:00:00.000Z'); assert.equal(r.clean.files[0].size, 1234); });
t('a package for another project is refused', () => { const g = good(); g.project.id = 'p_other'; const r = R.validateReturn(g, project, rules); assert.ok(!r.ok && r.clean === null); assert.match(r.errors[0], /different project/); });
t('a file over 2 MB is refused', () => { const g = good(); g.answers.q_contact = 'x'.repeat(2.1e6); const r = R.validateReturn(JSON.stringify(g), project, rules); assert.ok(!r.ok); assert.match(r.errors[0], /larger than 2 MB/); assert.ok(!R.validateReturn(g, project, rules).ok); });
t('the wrong schema or version is refused', () => { const a = good(); a.schema = 'something-else'; assert.ok(!R.validateReturn(a, project, rules).ok); const b = good(); b.version = 2; assert.ok(!R.validateReturn(b, project, rules).ok); assert.ok(!R.validateReturn('not json {', project, rules).ok); });
t('prototype-pollution keys are refused, at any depth, and nothing is polluted', () => {
  const s1 = JSON.stringify(good()).replace('"answers":{', '"answers":{"__proto__":{"polluted":"yes"},'); const r1 = R.validateReturn(s1, project, rules); assert.ok(!r1.ok); assert.match(r1.errors[0], /__proto__/);
  const s2 = JSON.stringify(good()).replace('"files":[', '"files":[{"name":"a.csv","size":1,"constructor":{"prototype":{"x":1}}},'); assert.ok(!R.validateReturn(s2, project, rules).ok); assert.equal({}.polluted, undefined); });
t('a checklist id the page did not define is refused', () => { const g = good(); g.checklist.not_a_step = true; const r = R.validateReturn(g, project, rules); assert.ok(!r.ok); assert.match(r.errors.join(), /Unknown checklist item "not_a_step"/); });
t('unknown keys are dropped with a warning, an answer for an unknown question too', () => { const g = good(); g.extra = { a: 1 }; g.answers.q_unknown = 'hi'; const r = R.validateReturn(g, project, rules); assert.ok(r.ok); assert.ok(!('extra' in r.clean) && !('q_unknown' in r.clean.answers)); assert.equal(r.warnings.length, 2); });
t('wrong types and lengths are refused: text answers, true/false ticks, file names and sizes', () => {
  const bad = f => { const g = good(); f(g); return R.validateReturn(g, project, rules); };
  assert.ok(!bad(g => { g.answers.q_contact = 5; }).ok); assert.ok(!bad(g => { g.answers.q_contact = 'x'.repeat(4001); }).ok); assert.ok(!bad(g => { g.checklist.read_guide = 'yes'; }).ok);
  assert.ok(!bad(g => { g.files[0].name = '../etc/passwd'; }).ok); assert.ok(!bad(g => { g.files[0].size = -1; }).ok); assert.ok(!bad(g => { g.files[0].size = 1.5; }).ok); assert.ok(!bad(g => { g.files = {}; }).ok); assert.ok(!bad(g => { g.files = new Array(201).fill({ name: 'a.csv', size: 1 }); }).ok);
  assert.ok(bad(g => { g.files[0].sha256 = 'zz'; }).warnings.length === 1); assert.ok(bad(g => { g.files[0].name = 'virus.exe'; }).warnings.length === 1); assert.ok(bad(g => { g.generatedAt = 'yesterday'; }).warnings.length === 1); });
t('hostile input never throws', () => { const loop = {}; loop.self = loop; let deep = {}; for (let i = 0; i < 50; i++) deep = { a: deep };
  [null, undefined, 7, true, [], 'null', '[]', '{"schema":', loop, { schema: 'fds-onboarding-return', version: 1, project: { id: 'p_123' }, answers: deep }, { schema: 'fds-onboarding-return', version: 1, project: null }, Object.create(null)].forEach(x => { const r = R.validateReturn(x, project, rules); assert.equal(r.ok, false); assert.ok(r.errors.length && r.clean === null); });
  assert.equal(R.validateReturn(good(), null, null).ok, false); assert.doesNotThrow(() => R.validateReturn(good(), undefined, undefined)); });
console.log(`${n} onboarding html checks passed`);
