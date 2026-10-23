// Data Onboarding: plan from modules in scope, workbook with dropdowns, browser checker, publish to the customer,
// customer status rules (server-enforced), check + send, walkthrough player.
import fs from 'fs';
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/'; fs.mkdirSync(OUT, { recursive: true });
const { page, projectId, customer, ok, nav, done } = await setup(BASE);
await nav(page, 'onboarding'); await page.waitForSelector('.ob-nav', { timeout: 15000 });
const navText = await page.textContent('.ob-nav'); ok(['Site', 'Building', 'Asset', 'Users'].every(s => navText.includes(s)), 'sheets for in-scope modules listed');
ok((await page.textContent('.ob-main')).includes('We don\'t need'), 'what-we-need table shown');
await page.screenshot({ path: OUT + 'ob01_master.png' });
await page.click('.ob-nav-i[data-v="Site"]'); await page.waitForTimeout(300);
const site = await page.textContent('.ob-main'); ok(site.includes('Site Name') && site.includes('Required') && site.includes('What not to do'), 'sheet guide shows columns, rules and mistakes');
await page.screenshot({ path: OUT + 'ob02_sheet.png' });
// workbook download: sheets, required header colour, dropdown to the Site sheet
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.page-header [data-act=onbDownload]')]);
const file = OUT + 'onboarding.xlsx'; await dl.saveAs(file); const b64 = fs.readFileSync(file).toString('base64');
const wbInfo = await page.evaluate(async b64 => { const ExcelJS = await window.FWBViews.loadExcelJS(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);
  const b = wb.getWorksheet('Building'); const s = wb.getWorksheet('Site'); return { names: wb.worksheets.map(w => w.name), lists: wb.getWorksheet('Lists').state, req: s.getCell('A1').fill.fgColor.argb, hdr: s.getCell('A1').value, dv: (b.getCell('B4').dataValidation || {}).formulae, typeDv: (s.getCell('C4').dataValidation || {}).formulae }; }, b64);
ok(wbInfo.names.includes('Overview') && wbInfo.names.includes('Site') && wbInfo.names.includes('Building') && wbInfo.names.includes('Asset Category Master'), 'workbook has overview, sheets and category master');
ok(wbInfo.lists === 'veryHidden' && wbInfo.req === 'FF0A7AFF' && wbInfo.hdr === 'Site Name*', 'required headers marked, lists hidden');
ok(wbInfo.dv && /'Site'!\$A\$4/.test(wbInfo.dv[0]) && wbInfo.typeDv && /^Lists!/.test(wbInfo.typeDv[0]), 'lookup and list dropdowns: ' + JSON.stringify([wbInfo.dv, wbInfo.typeDv]));
// fill the workbook: one clean version, one with mistakes
const filled = await page.evaluate(async b64 => { const ExcelJS = await window.FWBViews.loadExcelJS(); const mk = async bad => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);
    const s = wb.getWorksheet('Site'); s.getRow(4).values = ['Marina Tower', 12000, null, 1, 'FM team', 'Dubai', bad ? '95°' : 25.08, 55.14]; if (bad) s.getRow(5).values = ['Marina Tower', null, null, 'two'];
    const b = wb.getWorksheet('Building'); b.getRow(4).values = ['Tower A', bad ? 'marina tower' : 'Marina Tower', 5000, 40, 22];
    const buf = await wb.xlsx.writeBuffer(); let s2 = ''; new Uint8Array(buf).forEach(x => { s2 += String.fromCharCode(x); }); return btoa(s2); };
  return { good: await mk(false), bad: await mk(true) }; }, b64);
fs.writeFileSync(OUT + 'ob_good.xlsx', Buffer.from(filled.good, 'base64')); fs.writeFileSync(OUT + 'ob_bad.xlsx', Buffer.from(filled.bad, 'base64'));
const rep = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const r = await window.FWBViews.onbCheckWorkbook(new File([bytes], 'bad.xlsx')); return { rows: r.rows, msgs: Object.values(r.sheets).flat().map(x => x.msg) }; }, filled.bad);
const has = re => rep.msgs.some(m => re.test(m));
ok(rep.rows.Site === 2 && rep.rows.Building === 1, 'description and example rows skipped: ' + JSON.stringify(rep.rows));
ok(has(/Latitude/), 'bad latitude caught'); ok(has(/not a whole number/), 'non-integer caught'); ok(has(/Duplicate/), 'duplicate site caught'); ok(has(/capitals or spaces/), 'lookup near-miss caught');
const repGood = await page.evaluate(async b64 => { const r = await window.FWBViews.onbCheckWorkbook(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'good.xlsx')); return Object.values(r.sheets).flat().filter(x => x.sev === 'error').map(x => x.msg); }, filled.good);
ok(repGood.length === 0, 'clean workbook passes: ' + repGood.slice(0, 3).join(' | '));
// customer cannot see it before publishing
let c = await customer();
ok(!(await c.$('.sidebar [data-view=onboarding]')), 'hidden from the customer until published');
const pre = await c.evaluate(async pid => { try { await window.FWBApi.get(`/api/projects/${pid}/items?kinds=onb`); return 'ok'; } catch (e) { return e.status; } }, projectId);
ok(pre === 'ok' || pre === 403, 'items call answers');
// publish
await page.click('[data-act=onbPublish]'); await page.waitForTimeout(1200); ok((await page.textContent('.page-header')).includes('Shown'), 'published to the customer');
await c.reload(); await c.waitForSelector('.sidebar'); await nav(c, 'onboarding'); await c.waitForSelector('.ob-nav', { timeout: 15000 });
ok((await c.textContent('.ob-nav')).includes('Site'), 'customer sees the published sheets');
await c.click('.ob-nav-i[data-v="Site"]'); await c.waitForTimeout(300);
const opts = await c.$$eval('select[data-change=onbStatus] option', o => o.map(x => x.value)); ok(opts.join() === 'todo,filling,sent', 'customer status choices limited');
await c.selectOption('select[data-change=onbStatus]', 'filling'); await c.waitForTimeout(700);
const forged = await c.evaluate(async pid => { try { await window.FWBApi.put(`/api/projects/${pid}/items/onb/site`, { data: { sheet: 'Site', status: 'loaded' } }); return 'ok'; } catch (e) { return e.status; } }, projectId);
ok(forged === 403, 'server refuses a customer setting Loaded');
// customer checks the bad workbook, then the good one, and sends it
await c.click('.ob-nav-i[data-v="_report"]'); await c.waitForTimeout(200);
let [fc] = await Promise.all([c.waitForEvent('filechooser'), c.click('[data-act=onbCheck]')]); await fc.setFiles(OUT + 'ob_bad.xlsx'); await c.waitForSelector('.ob-main .notice');
ok((await c.textContent('.ob-main .notice')).includes('issue(s) to fix') && !(await c.$('[data-act=onbSend]')), 'workbook with mistakes cannot be sent');
await c.screenshot({ path: OUT + 'ob03_check.png' });
[fc] = await Promise.all([c.waitForEvent('filechooser'), c.click('[data-act=onbCheck]')]); await fc.setFiles(OUT + 'ob_good.xlsx'); await c.waitForFunction(() => document.querySelector('.ob-main .notice') && document.querySelector('.ob-main .notice').textContent.includes('Ready'));
await c.click('[data-act=onbSend]'); await c.waitForFunction(() => document.querySelector('.ob-main').textContent.includes('Sent workbooks'), null, { timeout: 15000 });
ok((await c.textContent('.ob-nav')).includes('Sent to Facilio'), 'sheets marked sent');
// Facilio sees the submission and marks Site validated
await page.reload(); await page.waitForSelector('.sidebar'); await nav(page, 'onboarding'); await page.waitForSelector('.ob-nav'); await page.click('.ob-nav-i[data-v="_report"]'); await page.waitForTimeout(300);
ok((await page.textContent('.ob-main')).includes('ob_good.xlsx'), 'Facilio sees the sent workbook');
await page.click('.ob-nav-i[data-v="Site"]'); await page.selectOption('select[data-change=onbStatus]', 'validated'); await page.waitForTimeout(700);
ok((await page.textContent('.ob-nav')).includes('Validated'), 'Facilio validates a sheet');
// walkthrough
await page.click('.ob-main [data-act=onbWalk]'); await page.waitForSelector('#wkModal .wk-intro'); await page.click('[data-wk=next]'); await page.waitForSelector('#wkModal .wk-xl');
ok((await page.textContent('#wkModal')).includes('Site Name'), 'walkthrough shows the first column');
await page.screenshot({ path: OUT + 'ob04_walk.png' }); await page.keyboard.press('Escape'); ok(!(await page.$('#wkModal')), 'walkthrough closes with Escape');
await done('onboarding_ui');
