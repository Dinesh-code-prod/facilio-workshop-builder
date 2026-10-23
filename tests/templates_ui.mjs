// Form Builder template lists: per module, templates are grouped by app, transition forms are kept apart, nothing leaks between modules.
// Expected counts are computed independently from the org package's FORM.xml (tests/fixtures/form_expect.json).
import { setup } from './lib.mjs'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/';
const { page, ok, done } = await setup(BASE); const E = JSON.parse(fs.readFileSync('tests/fixtures/form_expect.json', 'utf8'));
const pid = await page.evaluate(() => window.FWB.S.project.id);
const cat = () => page.evaluate(() => Object.values(window.FWB.S.baseline.modules).map(m => { const c = window.FWB.formCatalog(m.name); return { m: m.name, t: c.templates.length, a: c.actions.length, keys: c.templates.map(x => x.form.key), std: c.apps.map(ap => [ap, c.templates.filter(x => (x.form.app || '') === ap && x.role === 'standard').length]), amb: c.ambiguous, prim: c.primary }; }));
let C = await cat(); ok(Object.keys(E).every(m => C.find(x => x.m === m)), 'every module with forms in FORM.xml exists in the app'); ok(C.filter(x => !E[x.m]).every(x => x.t === 0 && x.a === 0), 'modules without forms in FORM.xml list no templates');
const bad = C.filter(x => E[x.m] && (E[x.m].templates !== x.t || E[x.m].actions !== x.a)); ok(!bad.length, 'template and transition-form counts equal FORM.xml for every module ' + JSON.stringify(bad.slice(0, 3)));
ok(C.every(x => new Set(x.keys).size === x.keys.length), 'no template key listed twice in any module');
const crossMod = await page.evaluate(() => { const bad = []; Object.values(window.FWB.S.baseline.modules).forEach(m => window.FWB.formCatalog(m.name).templates.forEach(x => { if (x.form.module !== m.name) bad.push(m.name + '>' + x.form.key); })); return bad; }); ok(!crossMod.length, 'no template appears under another module');
ok(C.every(x => x.std.every(([ap, n]) => n >= 1)), 'every app on every module has a default (standard) template'); const amb = C.filter(x => x.amb.length); console.log('apps with >1 default_ form (source ambiguity):', amb.map(x => x.m + ':' + x.amb.join('/')).join(', '));
// UI per key module
const open = async mod => { await page.goto(BASE + `#/p/${pid}/module/${mod}`); await page.reload(); await page.waitForSelector('.tabs .tab.active', { timeout: 30000 }); await page.waitForTimeout(400); };
const rows = () => page.$$eval('.page-body > .tbl-wrap:first-of-type tbody tr.click, .page-body > .tbl-wrap tbody tr.click', r => r.length);
for (const [mod, label] of [['workorder', 'Work Order'], ['serviceRequest', 'Service Request'], ['inspectionTemplate', 'Inspection'], ['quote', 'Quote'], ['purchaserequest', 'Purchase Requisition'], ['purchaseorder', 'Purchase Order'], ['inventoryrequest', 'Inventory Request'], ['invoice', 'Invoice']]) {
  await open(mod); const x = C.find(c => c.m === mod); const shownApp = await page.$eval('select[data-change=formApp]', s => s.value); await page.waitForSelector('#tplList'); const n = await page.$$eval('#tplList tbody tr.click', r => r.length);
  const exp = (E[mod].perApp[shownApp] || 0); ok(shownApp === x.prim, `${label}: opens on the ${x.prim} app`); ok(n === exp, `${label}: ${n} templates listed for ${shownApp} (expected ${exp})`);
  const stdRows = await page.$$eval('#tplList tbody tr.click', r => r.filter(t => /Default/.test(t.children[1].textContent)).length); console.log(label, 'listed', n, 'default tags', stdRows, 'transition forms', x.a);
  if (mod === 'workorder') { await page.screenshot({ path: 'tests/out/tpl_workorder.png' }); ok(await page.$('#tplActions'), 'Work Order: transition forms are in their own section'); ok((await page.textContent('#tplActions summary')).includes('(' + x.a + ')'), 'transition form count matches'); }
}
// switching modules must not carry the app filter over
await open('workorder'); await page.selectOption('select[data-change=formApp]', 'fsm'); ok((await page.$eval('select[data-change=formApp]', s => s.value)) === 'fsm', 'filter switches to fsm');
await page.click('.sidebar [data-view=modules]'); await page.waitForSelector('a[data-act=openModule][data-module=inspectionTemplate]'); await page.click('a[data-act=openModule][data-module=inspectionTemplate]'); await page.waitForSelector('#tplList'); ok((await page.$eval('select[data-change=formApp]', s => s.value)) === 'maintenance', 'switching module resets an app the module does not have');
await page.reload(); await page.waitForSelector('select[data-change=formApp]'); const again = await cat(); ok(JSON.stringify(again.map(x => [x.m, x.t, x.a])) === JSON.stringify(C.map(x => [x.m, x.t, x.a])), 'reload does not change any template count');
await done('templates_ui');
