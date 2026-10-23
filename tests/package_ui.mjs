// Org package ZIP and state flow XML import: build a project from a package, system vs custom modules, every component type read,
// secrets hidden, bad files rejected, and a state flow imported from standalone XML into the State Flow Builder (BRD follows edits).
import { setup } from './lib.mjs';
import { packageZip, notAPackageZip, flowFiles, FLOW, FLOW_IMPORT } from './fixtures/pkgfix.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done, errors } = await setup(BASE);
const file = (name, buf, type) => ({ name, mimeType: type || 'application/octet-stream', buffer: Buffer.isBuffer(buf) ? buf : Buffer.from(buf) });
const cfg = () => page.evaluate(() => { const B = window.FWB.S.baseline, c = window.FWB.doc('config'); return { src: c.source, mods: Object.keys(B.modules), custom: Object.values(B.modules).filter(m => m.custom).map(m => m.name), flows: B.flows.map(f => f.name), cat: Object.keys(B.catalog || {}), trig: (B.triggers || []).length, view: (B.viewCounts || {}).VIEW, json: JSON.stringify(B), gaps: B.gaps.map(g => g.item), impact: c.importImpact }; });
const toast = () => page.$$eval('.toast', l => l.length ? l[l.length - 1].textContent : '').catch(() => '');

// 1. a new project built straight from the package ZIP
await page.click('[data-act=toProjects]'); await page.waitForSelector('.projects-page'); await page.click('.projects-page [data-act=newProject]'); await page.waitForSelector('#np_name');
await page.fill('#np_name', 'From package'); await page.fill('#np_cust', 'Pkg Customer'); await page.fill('#np_team [data-p=name]', 'Dinesh R'); await page.fill('#np_code', 'pkg-access-2026');
const [fc0] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=npZip]')]); await fc0.setFiles(file('pkg1.zip', await packageZip()));
ok(/pkg1\.zip/.test(await page.textContent('#np_zipname')), 'chosen package is shown in the New project form');
await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 }); await page.waitForFunction(() => window.FWB.doc('config').source === 'imported', null, { timeout: 30000 });
let c = await cfg();
ok(c.src === 'imported' && c.mods.includes('workorder') && c.mods.includes('custom_widgetx'), 'project setup is built from the package (modules read)');
ok(c.custom.join() === 'custom_widgetx', 'only the custom module is flagged custom; system modules are not: ' + c.custom);
ok(c.flows.includes('Package Flow'), 'package state flow is read'); ok(c.cat.includes('TICKET_PRIORITY') && c.cat.includes('GLOBAL_VARIABLE'), 'master-data components are read: ' + c.cat); ok(c.trig === 1, 'triggers are read'); ok(c.view && c.view.workorder === 2, 'views are counted per module');
ok(!/SECRET-VALUE-123/.test(c.json) && /\[hidden\]/.test(c.json), 'secret-looking values are hidden'); ok(/https:\/\/app\.example\.test/.test(c.json), 'ordinary variable values are kept');
await nav(page, 'settings'); await page.evaluate(() => window.FWBViews.ACT.setTab({ getAttribute: () => 'config' })); await page.waitForSelector('text=Package contents');
const body = await page.textContent('.page-body'); ok(/TICKET_PRIORITY/.test(body) && /GLOBAL_VARIABLE/.test(body) && /TRIGGER/.test(body) && /Widget Tracker/.test(body), 'Package contents lists every component type and the custom module');
await page.evaluate(() => window.FWBViews.ACT.pkgCat({ value: 'TICKET_PRIORITY' })); ok(/High/.test(await page.textContent('.page-body')) && /Low/.test(await page.textContent('.page-body')), 'a master-data list can be opened');

// 2. not a package, and a package with one broken component
let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=importConfig]')]).catch(() => [null]);
if (fc) { await fc.setFiles(file('nope.zip', await notAPackageZip())); await page.click('.dialog [data-r="1"]').catch(() => { }); await page.waitForTimeout(900); }
ok(/does not look like a Facilio org package/.test(await toast()) && (await cfg()).src === 'imported' && (await cfg()).mods.includes('workorder'), 'a ZIP that is not an org package is refused and the configuration is unchanged: ' + (await toast()).slice(0, 80));
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=importConfig]')]); await fc.setFiles(file('broken.zip', await packageZip({ broken: true }))); await page.click('.dialog [data-r="1"]').catch(() => { }); await page.waitForTimeout(1500);
c = await cfg(); ok(c.mods.includes('workorder') && c.gaps.some(g => /FORM\.xml/.test(g)), 'a package with a broken component still loads and the broken file is reported');

// 3. a workshop proposal on a custom module, then a package from another org with a different custom module
await page.evaluate(() => { const S = window.FWB.S; S.ws.modules['custom_widgetx'] = { priority: 'High', inScope: true }; window.FWB.changed('t', 't', {}); });
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=importConfig]')]); await fc.setFiles(file('org2.zip', await packageZip({ custom: 'custom_gadgety' }))); await page.click('.dialog [data-r="1"]').catch(() => { }); await page.waitForFunction(() => (window.FWB.doc('config').importMeta || window.FWB.doc('config').importedMeta || {}).sourceName === 'org2.zip', null, { timeout: 20000 });
c = await cfg(); ok(c.impact && c.impact.systemKept >= 3 && c.impact.customNow.join() === 'custom_gadgety', 'system modules match by name; the new org has its own custom module'); ok(c.impact.orphans.some(o => o.name === 'custom_widgetx') && c.impact.customGone.includes('custom_widgetx'), 'a workshop proposal on a custom module that is not in the new package is reported, not lost');
ok(/custom_widgetx|Widget Tracker/.test(await page.textContent('.page-body')) || /Workshop proposals refer to/.test(await page.textContent('.page-body')), 'the effect of the import is shown on the page');
ok(await page.evaluate(() => !!window.FWB.S.ws.modules['custom_widgetx']), 'the workshop data itself is kept');

// 4. state flow XML for one module
await nav(page, 'flow'); await page.evaluate(() => window.FWBViews.ACT.flowModule({ value: 'workorder' })); await page.waitForSelector('[data-act=fiOpen]');
const ff = flowFiles(); const files = Object.entries(ff).map(([n, x]) => file(n, x, 'text/xml'));
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=fiOpen]')]); await fc.setFiles(files); await page.waitForSelector('[data-act=fiApply]');
const dr = await page.$eval('.drawer', e => e.innerText); ok(/Imported Test Flow/.test(dr) && /4 transition/.test(dr), 'the import preview lists the flow and its transitions'); 
await page.click('[data-act=fiApply]'); await page.waitForSelector('#sfbCanvas', { timeout: 15000 });
const fl = await page.evaluate(() => { const f = Object.values(window.FWB.S.ws.flows).find(x => x.imported); return f && { module: f.module, origin: f.origin, name: f.name, states: f.states.map(s => [s.label, s.x, s.y, s.origin]), trans: f.transitions.map(t => [t.name, t.from, t.to, t.type, t.commentRequired, (t.actors || []).map(a => window.FWB.actorLabel(a.actor))]), initial: f.initial, roles: window.FWB.S.ws.roles.map(r => r.label) }; });
ok(fl && fl.module === 'workorder' && fl.origin === 'proposed' && fl.states.length === 4 && fl.trans.length === 4, 'the flow is built in the State Flow Builder with every state and transition: ' + JSON.stringify(fl && [fl.states.length, fl.trans.length]));
ok(fl.states.find(s => s[0] === 'Resolved')[1] === 620 && fl.states.find(s => s[0] === 'Resolved')[2] === 120, 'state positions are exactly as the XML defines them'); ok(fl.states.find(s => s[0] === 'Closed'), 'state display names come from the status records');
ok(fl.trans.find(t => t[0] === 'Begin Work' && t[5].join() === 'Supervisor') && fl.trans.find(t => t[0] === 'Finish' && t[5].join() === 'Technician'), 'performers are kept as the XML defines them'); ok(fl.trans.find(t => t[0] === 'Begin Work')[4] === true, 'comment-required flag is kept');
ok(fl.roles.includes('Totally New Role'), 'a role that is not in this project is added as a proposed role so the flow stays faithful');
ok(await page.$('#sfbCanvas .sfb-state, #sfbCanvas [data-state], #sfbCanvas svg') !== null, 'the flow is drawn in the canvas');
// imported flow appears in the list, the BRD and follows edits
await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.waitForTimeout(600);
let txt = await page.$$eval('.paper', es => es.map(e => e.innerText).join('\n')); ok(/Imported Test Flow/.test(txt) && /Begin Work/.test(txt), 'the BRD shows the imported flow and its transitions');
await page.evaluate(() => { const f = Object.values(window.FWB.S.ws.flows).find(x => x.imported); f.transitions.find(t => t.name === 'Begin Work').name = 'Started (renamed)'; window.FWB.changed('Edited', 'transition', {}); });
await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.waitForTimeout(600); txt = await page.$$eval('.paper', es => es.map(e => e.innerText).join('\n')); ok(/Started \(renamed\)/.test(txt) && !/Begin Work/.test(txt), 'editing the imported flow updates the BRD');
const sum = await page.evaluate(() => window.FWB.changeSummary().additions.filter(a => a.area === 'State flow').map(a => a.item)); ok(sum.includes('Imported Test Flow'), 'the change summary lists the imported flow');
// bad inputs
await nav(page, 'flow'); await page.evaluate(() => window.FWBViews.ACT.flowList()); await page.waitForSelector('[data-act=fiOpen]');
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=fiOpen]')]); await fc.setFiles([file('bad.xml', '<Components><STATE_FLOW><name>x</STATE_FLOW>', 'text/xml')]); await page.waitForSelector('.drawer');
ok(/not valid XML/.test(await page.$eval('.drawer', e => e.innerText)) && !(await page.$('[data-act=fiApply]')), 'malformed XML is rejected with a clear message'); await page.click('.drawer [data-act=closeDrawer]').catch(() => { });
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=fiOpen]')]); await fc.setFiles([file('other.xml', '<Components><TAX><name>vat</name></TAX></Components>', 'text/xml')]); await page.waitForSelector('.drawer');
ok(/No state flow or state transition records/.test(await page.$eval('.drawer', e => e.innerText)), 'an XML file with no state flow records is rejected'); await page.click('.drawer [data-act=closeDrawer]').catch(() => { });
// a module name that does not exist in this project must be mapped before import
const odd = { ...FLOW_IMPORT, m: 'custom_unknownmod' }; const of = flowFiles(odd);
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=fiOpen]')]); await fc.setFiles(Object.entries(of).map(([n, x]) => file(n, x, 'text/xml'))); await page.waitForSelector('.drawer');
ok(/custom_unknownmod/.test(await page.$eval('.drawer', e => e.innerText)) && /not in this project/.test(await page.$eval('.drawer', e => e.innerText)), 'a custom module name that is not in the project is flagged and must be checked / mapped');
await page.selectOption('#fi_tgt', 'asset'); await page.waitForSelector('[data-act=fiApply]:not([disabled])'); await page.click('[data-act=fiApply]'); await page.waitForSelector('#sfbCanvas');
ok(await page.evaluate(() => Object.values(window.FWB.S.ws.flows).filter(f => f.imported && f.module === 'asset').length) === 1, 'mapping a custom-named module to a project module imports the flow there');
// a package ZIP can also be used as the source of the flow
const zipBuf = await packageZip(); await nav(page, 'flow'); await page.evaluate(() => window.FWBViews.ACT.flowList()); await page.evaluate(() => window.FWBViews.ACT.flowModule({ value: 'workorder' })); await page.waitForSelector('[data-act=fiOpen]');
[fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=fiOpen]')]); await fc.setFiles([file('pkg.zip', zipBuf)]); await page.waitForSelector('[data-act=fiApply]'); ok(/Package Flow/.test(await page.$eval('.drawer', e => e.innerText)), 'a package ZIP can be used as the flow source');
await done('package_ui');
