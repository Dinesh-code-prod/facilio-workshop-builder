// Plan Timeline: import from an uploaded Excel plan, generate, edit with versions, 12-step phase strip, home blocks, bell, customer view.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
const { page, projectId, customer, ok, nav, done } = await setup(BASE);
await nav(page, 'timeline'); await page.waitForSelector('.card.empty');
ok((await page.textContent('.page-body')).includes('No dated plan yet'), 'empty state before any plan');
ok(!(await page.$('.phase-strip')), 'no phase strip before a plan exists');
// upload an Excel plan with grouped rows through the real plan upload, then import it
const fr = await page.evaluate(async () => { const ExcelJS = await window.FWBViews.loadExcelJS(); const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Plan');
  ws.addRow(['Task Name', 'Start', 'End', 'Owner', '% Complete', 'Status']); const d = n => new Date(Date.UTC(2026, 9, 1 + n));
  [['Kick-Off call', 0, 0, 'Facilio, Customer', 100, 'Complete'], ['Requirement workshops', 2, 20, 'Facilio', 60, 'In progress'], ['BRD Sign-Off', 24, 24, 'Customer', 0, ''], ['Implementation and configuration', 25, 70, 'Facilio', 0, ''], ['UAT and feedback', 71, 90, 'Customer', 0, ''], ['Go-Live', 100, 100, 'Both', 0, '']].forEach(r => ws.addRow([r[0], d(r[1]), d(r[2]), r[3], r[4] / 100, r[5]]));
  const buf = await wb.xlsx.writeBuffer(); const f = new File([buf], 'Marina plan.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const rec = await window.FWBApi.uploadFile(window.FWB.S.project.id, f, 'plan', {}, null); const pd = window.FWB.doc('plan'); pd.versions = [{ fileId: rec.id, name: f.name, size: f.size, uploadedAt: new Date().toISOString(), by: 'test' }]; pd.current = rec.id; window.FWB.changed('plan uploaded', f.name, { section: 'plan' }); return rec.id; });
await page.waitForTimeout(1500); await page.reload(); await page.waitForSelector('.sidebar'); await nav(page, 'timeline');
await page.click('[data-act=tlImport]'); await page.waitForFunction(() => document.querySelector('.gantt'), null, { timeout: 30000 });
const info = await page.evaluate(() => ({ rows: window.FWB.doc('plan_struct').rows.map(r => [r.title, r.start, r.end, r.owner, r.status, r.pct]), v: window.FWB.doc('plan_struct').versions.length }));
ok(info.rows.length === 6, 'six tasks imported: ' + info.rows.length); ok(info.rows[0][3] === 'Both' && info.rows[0][4] === 'Done', 'owner and status read from the sheet: ' + JSON.stringify(info.rows[0])); ok(info.rows[1][5] === 60 && info.rows[1][4] === 'In progress', 'percent complete read');
ok(info.rows[0][1] === '2026-10-01' && info.rows[5][1] === '2027-01-09', 'dates read correctly: ' + info.rows[0][1] + ' ' + info.rows[5][1]); ok(info.v >= 1, 'baseline version saved');
const body = await page.textContent('.page-body'); ok(body.includes('The 12-step process') && body.includes('Progress against plan'), '12 steps and progress shown'); ok(!!(await page.$('.g-bar')) && !!(await page.$('.g-ms')), 'gantt shows bars and milestones'); ok(!!(await page.$('.scurve')), 'planned-vs-actual curve drawn');
await page.screenshot({ path: OUT + 'tl01_timeline.png', fullPage: true });
// phase strip on every page
await nav(page, 'overview'); await page.waitForSelector('.phase-strip'); const ps = await page.textContent('.phase-strip'); ok(/Current phase/.test(ps) && /Step \d+ of 12/.test(ps), 'phase strip shown on other pages: ' + ps.slice(0, 80));
ok((await page.textContent('.page-body')).includes('Next 45 days'), 'overview shows next 45 days'); await page.screenshot({ path: OUT + 'tl02_overview.png' });
// edit dates: a version is saved and the move is listed against the baseline
await nav(page, 'timeline'); await page.click('.tbl a[data-act=tlRow] >> text=Implementation and configuration'); await page.fill('#tr_e', '2026-12-30'); await page.click('[data-act=tlSave]'); await page.waitForTimeout(600);
ok((await page.textContent('.page-body')).includes('Plan versions') && /\+\d+ d/.test(await page.textContent('.page-body')), 'date change saved as a version and shown against the baseline');
await page.selectOption('select[data-change=tlStatus] >> nth=2', 'Done'); await page.waitForTimeout(500); ok(await page.evaluate(() => window.FWB.doc('plan_struct').rows[2].pct === 100), 'marking done sets 100%');
// force the phase and rename nothing
await page.click('[data-act=tlPhase]'); await page.selectOption('#ph_s', '5'); await page.fill('#ph_n', 'Build under way'); await page.click('[data-act=tlPhaseSave]'); await page.waitForTimeout(500); await nav(page, 'overview');
ok((await page.textContent('.phase-strip')).includes('Step 5 of 12') && (await page.textContent('.phase-strip')).includes('Build under way'), 'phase can be set by hand with a note');
// bell: overdue action from my side shows as a reminder
await page.evaluate(async pid => { await window.FWBApi.put(`/api/projects/${pid}/items/action/a_test1`, { data: { text: 'Send the asset list', side: 'facilio', owner: 'Dinesh', due: '2026-01-05', status: 'Open', mod: '' } }); window.FWBViews.items.reset(); }, projectId);
await page.reload(); await page.waitForSelector('.sidebar'); await page.waitForSelector('.bell-n', { timeout: 15000 }); await page.click('.bell'); await page.waitForSelector('.notif');
ok((await page.textContent('.drawer, aside, .dr')).includes('Action overdue'), 'bell lists the overdue action'); await page.screenshot({ path: OUT + 'tl03_bell.png' });
await page.click('[data-act=bellRead]'); await page.waitForTimeout(400); ok(!(await page.$('.bell-n')), 'mark all as read clears the count');
// customer sees the plan read-only and the strip
await page.evaluate(async () => { const c = window.FWB.doc('portal_controls'); c.tabs = Object.assign({}, c.tabs, { plan: true }); window.FWB.markDirty('portal_controls'); await window.FWB.flush(); }); await page.waitForTimeout(800);
const c = await customer(); await nav(c, 'timeline'); await c.waitForSelector('.gantt'); ok(!(await c.$('[data-act=tlRow]')) && !(await c.$('[data-act=tlImport]')), 'customer cannot edit the plan'); ok(!!(await c.$('.phase-strip')), 'customer sees the phase strip');
await c.screenshot({ path: OUT + 'tl04_customer.png' });
await done('timeline_ui');
