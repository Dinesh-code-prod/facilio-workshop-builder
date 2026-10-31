// Project Tasks end to end in a browser against the local preview (node tests/ui/devserver.mjs 4173): creating and editing tasks,
// saved sheets (views, never copies), customer questions answered only with a final response, the AI Task Assistant (suggestions are
// applied only on confirmation), AI type suggestions, Excel import with mapping and row checks, multi-sheet Excel export (the file is
// opened and its worksheets, columns, dates and row counts are checked), tasks from a transcript (owners and dates only when stated,
// nothing saved before review), bringing in existing actions, and a viewer's read-only access.
// Usage: node tests/ui/tasks-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs'; import ExcelJS from 'exceljs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const api = (m, u, body) => p.evaluate(async ([m, u, body]) => { const r = await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json() }; }, [m, u, body]);
const pid = (await api('POST', '/projects', { name: 'Tasks check', customer: 'Acme FM' })).data.project.id;
await api('POST', `/projects/${pid}/members`, { email: 'priya.n@facilio.com', role: 'editor' }); await api('POST', `/projects/${pid}/members`, { email: 'tasks.viewer@facilio.com', role: 'viewer' });
await api('PUT', `/projects/${pid}/items/action/a1`, { data: { text: 'Share the asset register template', status: 'Open', side: 'customer', owner: 'Priya N', due: '2026-11-03' } });
const tasks = async () => (await api('GET', `/projects/${pid}/items?kinds=task`)).data.items.map(x => Object.assign({ id: x.id }, x.data));
const open = async () => { await p.goto(BASE + `/#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('.pt-page'); await p.waitForTimeout(500); };
await open();
check('Tasks is in the project menu', await p.$('.sidebar [data-view="tasks"]') !== null);
check('ten default sheets are offered', (await p.$$('.pt-sh')).length === 10, String((await p.$$('.pt-sh')).length));

// bring in an existing governance action (linked, not duplicated)
await p.click('[data-act="tkBringIn"] >> nth=0'); await p.waitForTimeout(300); await p.click('[data-act="tkBringGo"]'); await p.waitForTimeout(800);
let T = await tasks(); const brought = T.find(t => t.key === 'action:a1');
check('an existing action becomes a linked task', brought && brought.links[0].kind === 'action' && brought.type === 'Customer Action Required' && brought.owner === 'priya.n@facilio.com', brought && brought.owner);
await p.click('[data-act="tkBringIn"] >> nth=0').catch(() => { }); await p.waitForTimeout(300); check('it is not offered a second time', !(await p.$('.pt-bi[data-id="a1"]'))); await p.keyboard.press('Escape'); await p.evaluate(() => window.FWBViews.closeDrawer && window.FWBViews.closeDrawer());

// new task in the drawer: a customer question assigned to me
await p.click('.page-header [data-act="tkNew"]'); await p.waitForTimeout(300);
await p.fill('#tkf_t', 'Does the work permit need two approval levels?'); await p.selectOption('#tkf_ty', 'Customer Question'); await p.click('[data-act="tkMe"]'); await p.fill('#tkf_m', 'Work Permits'); await p.fill('#tkf_e', '2026-11-10');
await p.fill('#tkf_qt', 'Does the work permit need two approval levels?'); await p.click('[data-act="tkSave"]'); await p.waitForTimeout(800);
T = await tasks(); const q = T.find(t => /two approval/.test(t.title));
check('a task is created with its type, owner (me), module and ETA', q && q.type === 'Customer Question' && q.owner === 'dinesh.r@facilio.com' && q.eta === '2026-11-10' && q.question.status === 'New', q && JSON.stringify([q.type, q.owner, q.eta]));
await p.click('.pt-sh:has-text("Customer Questions")'); await p.waitForTimeout(300);
check('it shows in the matching sheet', /two approval levels/.test(await p.textContent('.pt-grid')));

// inline edit in the grid
await p.click('.pt-sh:has-text("All Tasks")'); await p.waitForTimeout(300);
const row = `tr[data-id="${q.id}"]`; await p.click(`${row} td[data-c="status"]`); await p.selectOption(`${row} td[data-c="status"] select`, 'In Progress'); await p.waitForTimeout(800);
check('a cell edits in place and is saved', (await tasks()).find(t => t.id === q.id).status === 'In Progress');
await p.fill('#tkAdd', 'Configure PPM schedules for chillers'); await p.press('#tkAdd', 'Enter'); await p.waitForTimeout(800);
check('quick add creates a task from the sheet', (await tasks()).some(t => t.title === 'Configure PPM schedules for chillers'));

// a question is answered only with a final response
await p.click(`${row} .pt-id`); await p.waitForTimeout(300); await p.selectOption('#tkf_qs', 'Answered'); await p.click('[data-act="tkSave"]'); await p.waitForTimeout(800);
check('marking answered without a final response is refused', (await tasks()).find(t => t.id === q.id).question.status !== 'Answered' && /final response/i.test(await p.textContent('body')));
await p.fill('#tkf_qf', 'Yes: supervisor, then FM head.'); await p.click('[data-act="tkSave"]'); await p.waitForTimeout(800);
check('with the final response recorded it is answered', (await tasks()).find(t => t.id === q.id).question.status === 'Answered');

// AI Task Assistant: answers with context, saves only when asked, checklist applied only on confirmation
await p.click(`${row} .pt-id`); await p.waitForTimeout(300); await p.click('#drawer [data-tab="ai"]'); await p.waitForTimeout(300);
await p.click('[data-act="tkAi"][data-a="explain"]'); await p.waitForSelector('.pt-ai-out .md', { timeout: 15000 });
check('the assistant answers through the shared AI service, citing its context', /\[C1\]/.test(await p.textContent('.pt-ai-out')) && /DeepSeek/.test(await p.textContent('.pt-ai-meta')));
check('asking the assistant changes nothing on the task', !(await tasks()).find(t => t.id === q.id).guidance.length);
await p.click('[data-act="tkAiSave"]'); await p.waitForTimeout(800); check('Save to the task keeps the guidance', (await tasks()).find(t => t.id === q.id).guidance.length === 1);
await p.click('[data-act="tkAiChecklist"]'); await p.waitForSelector('.pt-sug', { timeout: 15000 }); const cl0 = (await tasks()).find(t => t.id === q.id).checklist.length;
await p.click('.pt-sug[data-i="1"]'); await p.click('[data-act="tkAiApplyCl"]'); await p.waitForTimeout(900);
check('only the ticked checklist suggestions are added', (await tasks()).find(t => t.id === q.id).checklist.length === cl0 + 2);
await p.screenshot({ path: `${OUT}/tasks-drawer.png` }); await p.evaluate(() => window.FWBViews.closeDrawer());

// AI type suggestions for selected tasks, applied only when ticked
const ppm = (await tasks()).find(t => t.title === 'Configure PPM schedules for chillers'); await p.check(`tr[data-id="${ppm.id}"] .pt-ck input`); await p.click('[data-act="tkClassify"]'); await p.waitForSelector('.pt-cls', { timeout: 15000 });
check('type suggestions are shown for review first', (await tasks()).find(t => t.id === ppm.id).type === 'Other');
await p.click('[data-act="tkClassifyGo"]'); await p.waitForTimeout(800); check('applied suggestions change the type', (await tasks()).find(t => t.id === ppm.id).type === 'Implementation Task');

// sheets: a new view, columns in a chosen order, survives a reload, deleting it deletes no task
await p.click('[data-act="tkSheetNew"]'); await p.fill('#tks_n', 'Permits'); await p.check('input[name="tks_t"][value="Customer Question"]'); await p.click('#tks_cols li[data-c="eta"] [data-d="-1"]'); await p.click('#tks_cols li[data-c="eta"] [data-d="-1"]'); await p.click('[data-act="tkSheetSave"]'); await p.waitForTimeout(800);
const heads = await p.$$eval('.pt-grid thead th[data-col]', e => e.map(x => x.getAttribute('data-col')));
check('a new sheet shows its own filter and column order', heads.indexOf('eta') < heads.indexOf('owner') && (await p.$$('.pt-grid tbody tr')).length === 1, heads.join(','));
await p.waitForTimeout(1500); await open(); check('the sheet is saved', await p.$('.pt-sh:has-text("Permits")') !== null);
const before = (await tasks()).length; await p.click('.pt-sh:has-text("Permits")'); await p.click('[data-act="tkSheetCfg"]'); await p.click('[data-act="tkSheetDel"]'); await p.click('.dialog [data-r="1"]'); await p.waitForTimeout(800);
check('deleting a sheet keeps every task', !(await p.$('.pt-sh:has-text("Permits")')) && (await tasks()).length === before);

// Excel import: recognised columns, an extra column kept, unknown assignee and bad date flagged, duplicate not imported
{ const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Snags'); ws.addRow(['Snag list for Acme FM']); ws.addRow([]); ws.addRow(['Issue / Observation', 'Module / Area', 'Status', 'Assigned To', 'ETA', 'Facilio Comments', 'Site']);
  ws.addRow(['Asset QR labels missing on chillers', 'Assets', 'WIP', 'Priya N', new Date(Date.UTC(2026, 10, 14)), 'Labels ordered', 'Tower A']);
  ws.addRow(['Escalation emails not sent', 'Work Orders', 'Open', 'Somebody Else', 'next week', '', 'Tower B']);
  ws.addRow(['Configure PPM schedules for chillers', 'Maintenance', 'Closed', '', '', '', '']); ws.addRow(['=HYPERLINK("http://x")', 'Portal', 'Pending', '', '05/12/2026', '', '']);
  const ws2 = wb.addWorksheet('Ignore me'); ws2.addRow(['Issue / Observation', 'Status']); ws2.addRow(['Should not import', 'Open']); await wb.xlsx.writeFile(`${OUT}/tasks-import.xlsx`); }
await p.click('[data-act="tkImport"]'); await p.setInputFiles('#tkImpF', `${OUT}/tasks-import.xlsx`); await p.waitForSelector('.pt-map', { timeout: 15000 });
const maps = await p.$$eval('.pt-imps >> nth=0 >> select', e => e.map(x => x.value)).catch(() => []);
check('import recognises the columns and keeps unknown ones as extra', maps.slice(0, 7).join(',') === 'title,module,status,owner,eta,notes,keep', maps.join(','));
await p.uncheck('[data-change="tkImpOn"][data-i="1"]'); await p.click('[data-act="tkImpCheck"]'); await p.waitForSelector('.pt-impr');
const body = await p.textContent('#tkImpB');
check('rows are checked before import (assignee, date, duplicate)', /Unknown assignee/.test(body) && /not a date/.test(body) && /duplicate of T-/i.test(body), body.slice(0, 160));
await p.click('[data-act="tkImpGo"]'); await p.waitForTimeout(2500);
T = await tasks(); const qr = T.find(t => /QR labels/.test(t.title)); const esc = T.find(t => /Escalation emails/.test(t.title)); const hl = T.find(t => /HYPERLINK/.test(t.title));
check('imported rows map status, owner, ETA, comments and extra columns', qr && qr.status === 'In Progress' && qr.owner === 'priya.n@facilio.com' && qr.eta === '2026-11-14' && qr.notes === 'Labels ordered' && qr.extra.Site === 'Tower A', qr && JSON.stringify([qr.status, qr.owner, qr.eta, qr.extra]));
check('an unknown assignee and a non-date are kept as text, not guessed', esc && !esc.owner && esc.extra['Assigned To (as imported)'] === 'Somebody Else' && !esc.eta && esc.extra['ETA (as imported)'] === 'next week');
check('day-first dates are read as written (05/12/2026 = 5 Dec)', hl && hl.eta === '2026-12-05', hl && hl.eta);
check('the duplicate row and the unticked sheet were not imported', T.filter(t => t.title === 'Configure PPM schedules for chillers').length === 1 && !T.some(t => t.title === 'Should not import'));
check('the summary reports what happened', /3 imported/.test(await p.textContent('#tkImpB')), (await p.textContent('#tkImpB')).slice(0, 120));
await p.evaluate(() => window.FWBViews.closeDrawer());

// Excel export: every sheet in one workbook, opened and checked
await open(); await p.click('[data-act="tkExport"]'); await p.check('input[name="tkx"][value="book"]');
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="tkExportGo"]')]); const file = `${OUT}/tasks-export.xlsx`; await dl.saveAs(file);
{ const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file); const names = wb.worksheets.map(w => w.name); const sheetsUI = await p.$$eval('.pt-sh', e => e.map(x => x.childNodes[0].textContent.trim()));
  check('one worksheet per sheet, in the sheet order', JSON.stringify(names) === JSON.stringify(sheetsUI), names.join(' | '));
  const all = wb.getWorksheet('All Tasks'); const n = (await tasks()).length; const hdr = all.getRow(1).values.slice(1);
  check('the All Tasks worksheet holds every task (nothing cut off)', all.rowCount - 1 === n, (all.rowCount - 1) + ' vs ' + n);
  check('columns follow the sheet, starting with the Task ID', hdr[0] === 'ID' && hdr[1] === 'Task' && hdr.includes('ETA'), hdr.slice(0, 6).join(','));
  const etaCol = hdr.indexOf('ETA') + 1; const dates = []; all.eachRow((r, i) => { if (i > 1 && r.getCell(etaCol).value) dates.push(r.getCell(etaCol).value); });
  check('ETAs are real Excel dates', dates.length > 0 && dates.every(d => d instanceof Date), dates.map(d => typeof d).join(','));
  const vals = []; all.eachRow(r => r.eachCell(c => vals.push(String(c.value && c.value.formula ? 'FORMULA' : c.value)))); check('text that looks like a formula is exported as text', !vals.includes('FORMULA') && vals.some(v => v.startsWith("'=HYPERLINK")));
  const cq = wb.getWorksheet('Customer Questions'); check('a filtered sheet exports only its tasks', cq.rowCount - 1 === (await tasks()).filter(t => t.type === 'Customer Question').length); }

// tasks from a transcript: proposed, reviewed, then created; owners and dates only when stated
const before2 = (await tasks()).length;
await p.click('[data-act="tkExtract"]'); await p.fill('#tkx_l', 'Workshop 3'); await p.fill('#tkx_t', 'Priya: We will update the work order form by Friday.\nRavi: I will share the vendor list.\nCustomer: Can you explain how escalations work on weekends?\nWe talked about the weather.');
await p.click('[data-act="tkExtractGo"]'); await p.waitForSelector('.pt-ex', { timeout: 20000 }); const ex = await p.textContent('#tkxOut');
check('extracted items are shown for review, nothing is saved yet', (await tasks()).length === before2 && (await p.$$('.pt-ex tbody tr')).length === 3);
check('a named team member becomes the owner; a stated day that is not a date stays unconfirmed', await p.$eval('.tkx-o[data-i="0"]', e => e.value) === 'priya.n@facilio.com' && await p.$eval('.tkx-e[data-i="0"]', e => e.value) === '' && /Said: Friday/.test(ex));
check('someone who is not a member is not assigned', await p.$eval('.tkx-o[data-i="1"]', e => e.value) === '' && /Said: Ravi/.test(ex));
await p.click('[data-act="tkExCreate"]'); await p.waitForTimeout(1500); T = await tasks();
const fromTr = T.filter(t => t.src && t.src.type === 'transcript');
check('ticked items are created with their source and evidence', fromTr.length === 3 && fromTr.every(t => t.src.label === 'Workshop 3' && t.src.quote) && fromTr.some(t => t.type === 'Customer Question' && t.question));
check('unconfirmed owners and timings are kept as suggestions only', fromTr.some(t => t.sugg && t.sugg.owner === 'Ravi' && !t.owner) && fromTr.some(t => t.sugg && t.sugg.eta === 'Friday' && !t.eta));
await p.screenshot({ path: `${OUT}/tasks-grid.png` });

// a viewer reads the register and cannot change it
const v = await b.newContext({ viewport: { width: 1440, height: 900 } }); await v.addCookies([{ name: 'dev_user', value: 'tasks.viewer@facilio.com', url: BASE }]); const vp = await v.newPage(); vp.on('pageerror', e => errs.push(e.message));
await vp.goto(BASE + `/#/p/${pid}/tasks`); await vp.reload(); await vp.waitForSelector('.pt-page', { timeout: 15000 }); await vp.waitForTimeout(500);
check('a viewer sees the tasks but no editing controls', (await vp.$$('.pt-grid tbody tr')).length > 3 && !(await vp.$('[data-act="tkNew"]')) && !(await vp.$('.pt-c.ed')) && !(await vp.$('#tkAdd')));
await v.close();
const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); await ph.goto(BASE + `/#/p/${pid}/tasks`); await ph.reload(); await ph.waitForSelector('.pt-page', { timeout: 15000 }); await ph.waitForTimeout(500);
check('phone: the page does not scroll sideways (the grid scrolls inside its frame)', await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1)); await ph.screenshot({ path: `${OUT}/tasks-phone.png` }); await ph.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
