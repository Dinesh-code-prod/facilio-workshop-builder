// Spreadsheet editor: Project Plan (edit, formulas, formatting, rows, merge, sort, filter, undo, sheets, save as new
// version — conditional formatting kept) and the Session Planner export (edit, save to project).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/'; const FX = 'tests/fixtures/';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true }); const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(BASE); await page.waitForSelector('.auth-box'); await page.click('[data-act=authTab][data-v=signup]');
await page.fill('#a_name', 'D'); await page.fill('#a_email', 'xe' + Date.now() + '@facilio.com'); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite'); await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'Xls'); await page.fill('#np_cust', 'Acme'); await page.fill('#np_start', '2026-11-01'); await page.fill('#np_team [data-p=name]', 'D'); await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 });
await page.click('.sidebar [data-view=plan]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.page-header [data-act=planUpload]')]); await fc.setFiles(FX + 'project_plan.xlsx');
await page.waitForSelector('#planGrid', { timeout: 60000 });
await page.click('[data-act=planOpenEditor]'); await page.waitForSelector('.xe-grid td[data-a]', { timeout: 60000 });
const X = (fn, arg) => page.evaluate(fn, arg); const ws0cf = await X(() => (window.FWBViews.lastXlsEditor.wb.worksheets[0].conditionalFormattings || []).length);
await page.screenshot({ path: OUT + 'xe01_open.png' });
// new sheet for the arithmetic checks
await page.click('.xe-tabacts [data-xs=add]'); await page.waitForTimeout(300);
const cell = a => page.click(`.xe-grid td[data-a="${a}"]`);
const type = async (a, t) => { await cell(a); await page.keyboard.type(t); await page.keyboard.press('Enter'); };
await type('A1', '10'); await type('A2', '20'); await type('A3', '=SUM(A1:A2)*2'); await type('B1', 'Hello'); await type('B2', '=VLOOKUP(20,A1:B2,2,FALSE)'); await type('C1', '=IFERROR(1/0,"div")');
const val = a => X(a2 => { const E = window.FWBViews.lastXlsEditor; return window.FWBViews.xlsUtil.rawValue(E.ws().getCell(a2)); }, a);
ok(await val('A3') === 60, 'SUM formula calculates (A3=' + await val('A3') + ')');
ok(await val('C1') === 'div', 'IFERROR catches #DIV/0!');
ok((await page.textContent('.xe-grid td[data-a="A3"]')).trim() === '60', 'formula result shown in the grid');
await cell('A1'); await page.keyboard.press('Control+b'); ok(await X(() => !!window.FWBViews.lastXlsEditor.ws().getCell('A1').font.bold), 'Ctrl+B bolds');
await page.selectOption('[data-xe-sel=numfmt]', '#,##0.00'); ok(await X(() => window.FWBViews.lastXlsEditor.ws().getCell('A1').numFmt) === '#,##0.00', 'number format applied');
ok((await page.textContent('.xe-grid td[data-a="A1"]')).trim() === '10.00', 'number format displayed');
await page.selectOption('[data-xe-sel=rows]', 'rowAbove'); await page.waitForTimeout(200);
ok(await X(() => window.FWBViews.lastXlsEditor.ws().getCell('A4').formula) === 'SUM(A2:A3)*2' && await val('A4') === 60, 'insert row shifts formula references');
await cell('B2'); await page.keyboard.down('Shift'); await cell('C2'); await page.keyboard.up('Shift'); await page.click('[data-xe=merge]');
ok(await X(() => (window.FWBViews.lastXlsEditor.ws().model.merges || []).includes('B2:C2')), 'merge cells');
await page.keyboard.press('Control+z'); await page.waitForTimeout(200); ok(await X(() => !(window.FWBViews.lastXlsEditor.ws().model.merges || []).length), 'undo removes the merge');
await page.keyboard.press('Control+y'); await page.waitForTimeout(200); ok(await X(() => (window.FWBViews.lastXlsEditor.ws().model.merges || []).length === 1), 'redo restores it');
// sort and filter on another sheet
await page.click('.xe-tabacts [data-xs=add]'); await page.waitForTimeout(300);
for (const [a, t] of [['A1', 'Task'], ['B1', 'Days'], ['A2', 'Configure'], ['B2', '5'], ['A3', 'Analyse'], ['B3', '3'], ['A4', 'Build'], ['B4', '8']]) await type(a, t);
await cell('A1'); await page.click('[data-xe=filter]'); await page.waitForTimeout(200); ok(await page.$('.xe-fbtn'), 'filter buttons on header row');
await cell('A2'); await page.click('[data-xe=sortAsc]'); await page.waitForTimeout(200);
ok(await val('A2') === 'Analyse' && await val('B2') === 3 && await val('A4') === 'Configure', 'sort A→Z moves whole rows');
await page.click('.xe-fbtn[data-c="1"]'); await page.waitForSelector('.xe-menu'); await page.uncheck('.xe-menu [data-fv="Build"]'); await page.click('.xe-menu [data-fm=ok]'); await page.waitForTimeout(200);
ok(await X(() => window.FWBViews.lastXlsEditor.ws().getRow(3).hidden === true), 'filter hides unselected rows');
ok(await X(() => { const ws = window.FWBViews.lastXlsEditor.ws(); return ws.rowCount <= 5 && ws.columnCount <= 3; }), 'rendering does not add empty rows or columns to the workbook');
await page.screenshot({ path: OUT + 'xe02_edit.png' });
// save as a new version and check it round-trips, conditional formatting on the plan sheet kept
await page.click('[data-act=planEdSave]'); await page.waitForTimeout(2500);
const after = await X(async () => { const S = window.FWB.S; const d = window.FWB.doc('plan'); const ExcelJS = await window.FWBViews.loadExcelJS(); const r = await window.FWBApi.downloadFile(S.project.id, d.current); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await r.blob.arrayBuffer()); const n = wb.worksheets.length; const ws = wb.worksheets[n - 2]; return { versions: d.versions.length, sheets: n, a4: ws.getCell('A4').formula, a4v: ws.getCell('A4').result, cf: (wb.worksheets[0].conditionalFormattings || []).length }; });
ok(after.versions === 2, 'saved as version 2'); ok(after.a4 === 'SUM(A2:A3)*2' && after.a4v === 60, 'formula and result saved in the file'); ok(after.cf === ws0cf && ws0cf > 0, `conditional formatting kept (${after.cf}/${ws0cf})`);
await page.click('[data-act=planEdClose]'); await page.waitForSelector('#planGrid'); await page.screenshot({ path: OUT + 'xe03_saved.png' });
// planner export editor
await page.evaluate(() => window.FWBViews.go('planner')); await page.evaluate(() => window.FWBViews.mfOpenPlTab('export')); await page.click('[data-act=plEdOpen][data-from=fresh]'); await page.waitForSelector('.xe-grid td[data-a]', { timeout: 30000 });
await type('A20', 'Extra workshop'); await page.click('[data-act=plEdSave]'); await page.waitForTimeout(1500);
ok(await X(() => !!window.FWB.doc('planner').exportEdit), 'planner edited copy saved to the project'); await page.screenshot({ path: OUT + 'xe04_planner.png' });
ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join('; '));
console.log(`xls editor ui: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
