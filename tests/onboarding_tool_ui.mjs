// Excel Data Onboarding (embedded standalone tool): loads from our own origin, no console/CSP errors, second mini-tab,
// first tab still works, data entered is kept on refresh and saved to the project on the server, customer isolation.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
const { page, projectId, customer, ok, nav, done, errors } = await setup(BASE);
await nav(page, 'onboarding'); await page.waitForSelector('.ob-tabs');
ok((await page.textContent('.ob-tabs')).includes('Data Onboarding') && (await page.textContent('.ob-tabs')).includes('Excel Data Onboarding'), 'two mini-tabs');
ok(!!(await page.$('.ob-nav')), 'first tab keeps the existing onboarding');
await page.click('.ob-tabs [data-v=excel]'); await page.waitForSelector('#onbFrame');
const fr = page.frameLocator('#onbFrame'); await fr.locator('#saveState').waitFor({ state: 'attached', timeout: 20000 });
const f = page.frames().find(x => x.url().includes('onboarding-tool')); await f.waitForSelector('.ribbon', { timeout: 20000 });
await page.waitForTimeout(800); await page.screenshot({ path: OUT + 'ot01_tool.png' });
if (await f.$('#dlgWalk[open]')) { await f.click('#wtSkip'); await page.waitForTimeout(400); }
const info = await f.evaluate(() => ({ title: document.title, sheets: document.querySelectorAll('#tabs button, .sheet-tab, [data-sheet]').length, hasExcelJS: typeof ExcelJS !== 'undefined', hasXLSX: typeof XLSX !== 'undefined', body: document.body.innerText.slice(0, 400) }));
ok(info.hasExcelJS && info.hasXLSX, 'tool libraries loaded (ExcelJS, SheetJS)'); ok(/onboarding/i.test(info.title), 'tool title: ' + info.title);
// enter data through the tool's own state/UI: click first data cell of a sheet and type
await f.locator('#tabs [role=tab]', { hasText: /^Site$/ }).first().click(); await page.waitForTimeout(600);
const cell = await f.$('[data-r="3"][data-c="0"]'); ok(!!cell, 'grid cell available');
if (cell) { await cell.click(); await page.keyboard.type('Marina Tower'); await page.keyboard.press('Enter'); }
await page.waitForTimeout(4500);
const local = await f.evaluate(pid => localStorage.getItem('facilio-onboarding-workspace-v2:' + pid), projectId); ok(!!local && local.includes('Marina Tower'), 'entered value kept in project-scoped browser storage');
const unscoped = await f.evaluate(() => Object.keys(localStorage).filter(k => /^facilio-onboarding-workspace-v[12]$/.test(k))); ok(!unscoped.length, 'no un-scoped storage key (projects stay separate)');
const srv = await page.evaluate(async pid => { const r = await window.FWBApi.get(`/api/projects/${pid}/items?kinds=onbws`); return r.items.map(i => ({ id: i.id, stage: i.data.stage, has: i.data.json.includes('Marina Tower'), rows: i.data.rows })); }, projectId);
ok(srv.length === 1 && srv[0].has && srv[0].stage === 'prepared', 'saved to the project on the server as prepared data: ' + JSON.stringify(srv));
// the tool's own export and import still work inside the frame
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), (async () => { await f.click('#btnExport'); await page.waitForTimeout(500); if (await f.$('#dlgConfirm[open]')) await f.click('#cfYes'); })()]); await dl.saveAs(OUT + 'ot_export.xlsx'); ok(/\.xlsx$/.test(dl.suggestedFilename()), 'tool exports a workbook: ' + dl.suggestedFilename());
const exp = await page.evaluate(async () => { const r = await fetch('onboarding-tool/04-rules.js'); return r.ok; }); ok(exp, 'rules file reachable');
await f.setInputFiles('#fileInput', OUT + 'ot_export.xlsx'); await page.waitForTimeout(2500); ok(await f.evaluate(() => (localStorage.getItem('facilio-onboarding-workspace-v2:' + new URLSearchParams(location.search).get('p')) || '').includes('Marina Tower')), 'tool imports its own export and keeps the data');
// tab switching and refresh
await page.click('.ob-tabs [data-v=plan]'); await page.waitForSelector('.ob-nav'); await page.click('.ob-tabs [data-v=excel]'); await page.waitForSelector('#onbFrame');
await page.reload(); await page.waitForSelector('.sidebar'); await nav(page, 'onboarding'); await page.waitForSelector('#onbFrame');
const f2 = page.frames().find(x => x.url().includes('onboarding-tool')); await f2.waitForSelector('.ribbon', { timeout: 20000 });
ok(await f2.evaluate(pid => (localStorage.getItem('facilio-onboarding-workspace-v2:' + pid) || '').includes('Marina Tower'), projectId), 'data survives refresh and tab switch');
// render guard: a state change elsewhere must not reload the frame
await f2.evaluate(() => { window.__alive = 1; }); await page.evaluate(() => window.FWBViews.render()); await page.waitForTimeout(400);
ok(await f2.evaluate(() => window.__alive === 1), 'frame is not reloaded by app re-renders');
// asset paths and security headers
const hdr = await page.evaluate(async () => { const r = await fetch('onboarding-tool/04-rules.js'); return [r.status, r.headers.get('content-type')]; }); ok(hdr[0] === 200, 'tool assets served: ' + hdr.join(' '));
// customer: hidden until onboarding is on; then own copy comes from the server, and cannot write once read-only
const c = await customer(); ok(!(await c.$('.sidebar [data-view=onboarding]')), 'customer does not see the tab before it is switched on');
await nav(page, 'onboarding'); await page.click('.ob-tabs [data-v=plan]'); await page.waitForSelector('[data-act=onbPublish]'); await page.click('[data-act=onbPublish]'); await page.waitForTimeout(1200);
await c.reload(); await c.waitForSelector('.sidebar'); await nav(c, 'onboarding'); await c.waitForSelector('.ob-tabs'); await c.click('.ob-tabs [data-v=excel]'); await c.waitForSelector('#onbFrame');
const cf = c.frames().find(x => x.url().includes('onboarding-tool')); await cf.waitForSelector('.ribbon', { timeout: 20000 });
ok(await cf.evaluate(pid => (localStorage.getItem('facilio-onboarding-workspace-v2:' + pid) || '').includes('Marina Tower'), projectId), 'customer opens the same project data');
const forged = await c.evaluate(async pid => { try { await window.FWBApi.put(`/api/projects/${pid}/items/onbws/main`, { data: { json: '{"v":1}' } }); return 'ok'; } catch (e) { return e.status; } }, projectId); ok(forged === 403, 'server rejects malformed workbook data: ' + forged);
await c.screenshot({ path: OUT + 'ot02_customer.png' });
await done('onboarding_tool_ui');
