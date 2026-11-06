// UAT guide (src/uatguide.js): built only from the approved modules and the saved test cases (the "utc" records of the UAT page). Nothing is invented: a step, an expected result, a role, test data
// or evidence appears only when the test case states it; a module without a test case is a gap; a cross-module scenario exists only when a test case names more than one module.
import assert from 'node:assert/strict'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url); const G = req('../src/uatguide.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const project = { id: 'p_1', name: 'CAFM roll-out', customer: 'Acme' };
const modules = [{ name: 'workorder', label: 'Work Order' }, { name: 'asset', label: 'Asset' }, { name: 'space', label: 'Space' }, { name: 'inspection', label: 'Inspection' }];
const cases = [
  { tcid: 'UAT-WORK-001', mod: 'workorder', module: 'Work Order', scenario: 'Raise a work order', title: 'Create a work order', pre: 'A technician exists', steps: '1. Open Work Orders\n2) Click New\n- Save', expected: 'The work order is created', req: 'REQ-12', status: 'Failed', extra: { 'Test data': 'Asset A-100', Role: 'Technician', Evidence: 'Screenshot of the saved record', Priority: 'High' } },
  { tcid: 'UAT-WORK-002', mod: 'workorder', module: 'Work Order', title: 'Close a work order', steps: '', expected: '' },
  { tcid: 'UAT-ASSE-001', mod: 'asset', module: 'Asset', scenario: 'Link asset to work order', title: 'Asset and Work Order are linked', module2: 'x', modules: ['Asset', 'Work Order'], steps: 'Open the asset\nOpen its work orders', expected: 'The work order is listed' },
  { tcid: 'UAT-ASSE-002', mod: 'asset', module: 'Asset', title: 'Add an asset', steps: 'Click Add', expected: 'The asset is saved' },
  { tcid: 'UAT-X-001', mod: '', module: 'Finance', title: 'Pay an invoice', steps: 'Pay', expected: 'Paid' },
  { tcid: 'UAT-Y-001', mod: '', module: 'Asset, Space', title: 'Move an asset to a space', steps: 'Move it', expected: 'It is in the space' }];
const g = G.buildUatGuide({ project, modules, testCases: cases, roles: ['Technician', 'Supervisor'] }); const html = G.uatGuideHtml(g);

t('the guide is module by module and built only from the test cases given', () => {
  assert.deepEqual(g.modules.map(m => m.label), ['Work Order', 'Asset', 'Space', 'Inspection']); const wo = g.modules[0]; assert.deepEqual(wo.entries.map(e => e.id), ['UAT-WORK-001', 'UAT-WORK-002']);
  const e = wo.entries[0]; assert.equal(e.scenario, 'Raise a work order'); assert.equal(e.objective, 'Create a work order'); assert.equal(e.preconditions, 'A technician exists'); assert.deepEqual(e.steps, ['Open Work Orders', 'Click New', 'Save']); assert.equal(e.expected, 'The work order is created');
  assert.deepEqual(e.roles, ['Technician']); assert.equal(e.testData, 'Asset A-100'); assert.equal(e.evidence, 'Screenshot of the saved record'); assert.equal(e.requirement, 'REQ-12'); assert.deepEqual(g.roles, ['Technician', 'Supervisor']); });
t('nothing is invented: a test case with no steps, expected result, role, data or evidence gets none, and the gap is named', () => {
  const e = g.modules[0].entries[1]; assert.deepEqual(e.steps, []); assert.equal(e.expected, ''); assert.equal(e.preconditions, ''); assert.deepEqual(e.roles, []); assert.equal(e.testData, ''); assert.equal(e.evidence, ''); assert.equal(e.scenario, 'Close a work order');
  assert.ok(g.gaps.includes('The test case "UAT-WORK-002" has no steps yet.')); assert.ok(g.gaps.includes('The test case "UAT-WORK-002" has no expected result yet.'));
  const card = html.slice(html.indexOf('Close a work order')); const end = card.indexOf('</article>'); const one = card.slice(0, end); ['Steps', 'Expected result', 'Preconditions', 'Roles', 'Test data', 'Evidence expected', 'Requirement'].forEach(k => assert.ok(!one.includes('<dt>' + k + '</dt>'), k)); });
t('every step, expected result, precondition and name in the page comes from the input', () => {
  const li = [...html.matchAll(/<ol>([\s\S]*?)<\/ol>/g)].flatMap(o => [...o[1].matchAll(/<li>([^<]*)<\/li>/g)].map(x => x[1])); assert.ok(li.length >= 6); const stepsIn = new Set(cases.flatMap(c => String(c.steps || '').split('\n').map(s => s.replace(/^\s*(\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean)));
  li.forEach(x => assert.ok(stepsIn.has(x), 'invented step: ' + x));
  assert.ok(!/Lorem|TBD|Unknown|to be confirmed/i.test(html)); });
t('a module with no test case is a gap and is not shown as a section; the others are', () => {
  assert.ok(g.gaps.includes('The module "Inspection" has no test case yet, so it has no UAT scenario.')); assert.ok(!html.includes('<h2>Inspection</h2>')); assert.ok(html.includes('<h2>Work Order</h2>') && html.includes('<h2>Asset</h2>'));
  const none = G.buildUatGuide({ project, modules, testCases: [] }); assert.equal(none.counts.testCases, 0); assert.equal(none.modules.length, 4); assert.ok(none.gaps.includes('There are no test cases yet.')); assert.equal(none.gaps.filter(x => /has no test case yet/.test(x)).length, 4); assert.ok(G.uatGuideHtml(none).includes('Still to be prepared')); });
t('cross-module scenarios exist only when a test case names more than one approved module', () => {
  assert.deepEqual(g.crossModule.map(e => e.id), ['UAT-ASSE-001', 'UAT-Y-001']); assert.deepEqual(g.crossModule[0].modules, ['Asset', 'Work Order']); assert.deepEqual(g.crossModule[1].modules, ['Asset', 'Space']);
  assert.ok(html.includes('id="cross"') && html.includes('Across modules')); const single = G.buildUatGuide({ project, modules, testCases: [cases[0], cases[1]] }); assert.deepEqual(single.crossModule, []); assert.ok(!G.uatGuideHtml(single).includes('id="cross"')); assert.ok(!G.uatGuideHtml(single).includes('Across modules'));
  assert.ok(!g.modules[1].entries.some(e => e.id === 'UAT-ASSE-001')); });
t('a module covered only by a cross-module scenario is not reported as having no test case', () => { const x = G.buildUatGuide({ project, modules, testCases: [{ tcid: 'C1', title: 'A to S', module: 'Asset / Space', steps: 'x', expected: 'y' }] }); assert.ok(!x.gaps.some(s => /"(Asset|Space)" has no test case/.test(s))); assert.ok(x.gaps.some(s => /"Work Order" has no test case/.test(s))); assert.equal(x.crossModule.length, 1); });
t('a module name that contains a separator is matched whole before it is split', () => { const x = G.buildUatGuide({ modules: ['Inventory & Purchasing', 'Asset'], testCases: [{ tcid: 'I1', title: 'Order a part', module: 'Inventory & Purchasing', steps: 'a', expected: 'b' }] }); assert.equal(x.crossModule.length, 0); assert.equal(x.modules[0].entries.length, 1); });
t('test cases for a module that is not approved are listed apart and named in a gap, never dropped', () => {
  assert.deepEqual(g.other.map(e => e.id), ['UAT-X-001']); assert.ok(g.gaps.some(x => /1 test case name a module that is not in the approved modules \(Finance\)/.test(x))); assert.ok(html.includes('id="other"') && html.includes('Pay an invoice')); assert.equal(g.counts.testCases, 6); });
t('a test case with neither title nor scenario is left out and named, and bad input never throws', () => {
  const x = G.buildUatGuide({ modules, testCases: [{ tcid: 'E', module: 'Asset' }, null, 7, 'x', [], {}] }); assert.equal(x.counts.testCases, 0); assert.ok(x.gaps.some(s => /no title or scenario/.test(s)));
  [null, undefined, 5, 'x', {}, { modules: 'x', testCases: 'y' }, { modules: [null, {}, 3], testCases: [{ title: { a: 1 }, steps: { b: 2 } }] }].forEach(i => { assert.doesNotThrow(() => G.uatGuideHtml(G.buildUatGuide(i))); }); assert.doesNotThrow(() => G.uatGuideHtml(null)); });
t('generation is deterministic', () => { assert.deepEqual(G.buildUatGuide({ project, modules, testCases: cases, roles: ['Technician', 'Supervisor'] }), g); assert.equal(G.uatGuideHtml(G.buildUatGuide({ project, modules, testCases: cases, roles: ['Technician', 'Supervisor'] })), html); });
t('the page is shareable: it shows no status, tester, actual result, issue or internal note of the test cases', () => {
  const extra = G.buildUatGuide({ project, modules, testCases: [{ tcid: 'Z-1', mod: 'asset', module: 'Asset', title: 'T', steps: 'S', expected: 'E', status: 'Failed', tester: 'SECRET-TESTER', actual: 'SECRET-ACTUAL', issueRef: 'SECRET-ISSUE', notes: 'SECRET-NOTE', extra: { Priority: 'SECRET-PRIO' } }] });
  const h = G.uatGuideHtml(extra); assert.ok(!/SECRET/.test(h)); assert.ok(!/Failed/.test(h)); assert.ok(!/SECRET/.test(JSON.stringify(extra))); });

t('every project string is escaped (script, quotes, backticks) in titles, steps and module names', () => {
  const evil = '<script>alert(1)</script>"\'`${x}&';
  const x = G.buildUatGuide({ project: { id: evil, name: evil, customer: evil }, roles: [evil], modules: [{ name: evil, label: evil }], testCases: [{ tcid: evil, module: evil, scenario: evil, title: evil, pre: evil, steps: evil + '\n' + evil + '2', expected: evil, req: evil, extra: { 'Test data': evil, Role: evil, Evidence: evil } }, { tcid: 'B', title: 'Both', modules: [evil, evil + 'z'] }] });
  const h = G.uatGuideHtml(x); assert.ok(!h.includes('<script>alert')); assert.ok(!h.includes('alert(1)</script>')); assert.ok(!/<(img|svg|iframe)/i.test(h)); assert.equal((h.match(/<script/g) || []).length, 1, 'only the print script');
  assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&#96;${x}&amp;')); assert.ok(!/`/.test(h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/, ''))); assert.ok(!/ on[a-z]+\s*=/i.test(h)); });
t('the file asks for nothing from outside, uses the shared frame, and keeps to the Facilio colours', () => {
  assert.ok(!/https?:\/\//i.test(html)); assert.ok(!/<(iframe|form|link|img|embed|object)\b/i.test(html)); assert.ok(!/\bsrc=|\bhref="(?!#)/i.test(html)); assert.match(html, /Content-Security-Policy" content="default-src 'none'/); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|eval\(|innerHTML/.test(html));
  assert.ok(!/purple|violet|glow|#7c3aed|#8b5cf6/i.test(html)); ['#1D1A5E', '#1570EF', '#E5197F', '#8DB8FF'].forEach(c => assert.ok(html.includes(c), c)); assert.ok(/name="viewport"/.test(html) && /@media print/.test(html) && /lang="en"/.test(html)); });
t('the print script parses and is the only script', () => { const s = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]); assert.equal(s.length, 1); assert.doesNotThrow(() => new vm.Script(s[0], { filename: 'guide.js' })); });
t('a walkthrough link appears beside its scenario, only when it is an https link', () => {
  const cs = [{ tcid: 'W-1', mod: 'workorder', module: 'Work Order', scenario: 'Raise a work order', title: 'Create a work order', steps: '1. Open', expected: 'Created' }, { tcid: 'W-2', mod: 'asset', module: 'Asset', scenario: 'Tag an asset', title: 'Tag it', steps: '1. Open', expected: 'Tagged' }];
  const g = G.buildUatGuide({ project, modules, testCases: cs, roles: [], walkthroughs: { 'raise a work order': 'https://comet.facilio.work/#/v/abc"x', 'tag an asset': 'javascript:alert(1)' } }); const h = G.uatGuideHtml(g);
  assert.ok(h.includes('Watch the walkthrough') && h.includes('href="https://comet.facilio.work/#/v/abc&quot;x"'), 'the link is there and escaped'); assert.equal((h.match(/Watch the walkthrough/g) || []).length, 1, 'only the https link; the javascript: one is dropped');
  const none = G.uatGuideHtml(G.buildUatGuide({ project, modules, testCases: cs, roles: [] })); assert.ok(!none.includes('Watch the walkthrough'), 'no link, no row');
});
console.log(`\n${n} UAT guide checks passed`);
