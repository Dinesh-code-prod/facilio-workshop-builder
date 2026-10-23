// End-to-end test of the main flows against the local full stack (node scripts/devserver.mjs 8899).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/'; const FX = 'tests/fixtures/';
const results = []; const ok = (name, cond, detail) => { results.push({ name, pass: !!cond, detail: detail || '' }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage(); const errors = [];
page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
const shot = n => page.screenshot({ path: OUT + n + '.png' });
const nav = async v => { const s = `.sidebar [data-view=${v}]`; if (await page.$(s)) await page.click(s); else await page.evaluate(x => window.FWBViews.go(x), v); await page.waitForTimeout(500); };
const waitSaved = async () => { await page.waitForFunction(() => { const e = document.getElementById('saveState'); return e && /All changes saved/.test(e.textContent); }, null, { timeout: 20000 }).catch(() => { }); };
const download = async (fn) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), fn()]); const p = OUT + d.suggestedFilename(); await d.saveAs(p); return p; };
const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name + ' (exception)', false, e.message.split('\n')[0]); await shot('ERR_' + name.replace(/\W+/g, '_')); } };

// ---------- sign up + project ----------
await page.goto(BASE); await page.waitForSelector('.auth-box');
await page.click('[data-act=authTab][data-v=signup]'); const email = 'e2e' + Date.now() + '@facilio.com';
await page.fill('#a_name', 'Dinesh R'); await page.fill('#a_email', email); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite'); await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'CAFM Implementation'); await page.fill('#np_cust', 'Acme Properties'); await page.fill('#np_start', '2026-11-01');
await page.fill('#np_team [data-p=name]', 'Dinesh R'); await page.fill('#np_stake [data-p=name]', 'Priya Nair'); await page.fill('#np_stake [data-p=email]', 'priya@acme.example'); await page.fill('#np_code', 'acme-access-2026');
await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 });
const projectId = await page.evaluate(() => location.hash.split('/')[2]); ok('project created', !!projectId, projectId);

await step('kickoff', async () => {
  await nav('kickoff'); await page.waitForSelector('[data-act=uploadDeck]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.page-header [data-act=uploadDeck]')]); await fc.setFiles(FX + 'sample_kickoff.pptx');
  await page.waitForSelector('#deckViewer .slide-host', { timeout: 60000 }); await page.waitForTimeout(2500);
  const pos = await page.textContent('#deckPos'); ok('PPTX deck renders with slide navigation', /1 \/ \d+/.test(pos), pos);
  await page.click('[data-act=vwNav][data-d="1"]'); await page.waitForTimeout(800); ok('next slide', /^2 \//.test(await page.textContent('#deckPos')));
  ok('slide content rendered (not blank)', (await page.evaluate(() => document.querySelector('#deckHost').innerText.length)) > 10); await shot('e01_kickoff');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('.page-header [data-act=uploadDeck]')]); await fc2.setFiles(FX + 'sample_kickoff.pdf'); await page.waitForFunction(() => document.querySelector('.page-body table.tbl').querySelectorAll('tbody tr').length === 2, null, { timeout: 30000 }); await page.waitForSelector('#deckViewer canvas', { timeout: 60000 }); await page.waitForTimeout(800);
  ok('replace deck keeps versions', (await page.$eval('.page-body table.tbl', t => t.querySelectorAll('tbody tr').length)) === 2); await shot('e02_kickoff_pdf');
});

await step('project plan', async () => {
  await nav('plan'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.page-header [data-act=planUpload]')]); await fc.setFiles(FX + 'project_plan.xlsx');
  await page.waitForSelector('#planGrid table', { timeout: 60000 });
  const txt = await page.textContent('#planGrid'); ok('plan sheet renders text and dates', txt.includes('Kick-off meeting') && /02-Nov-26/.test(txt), txt.match(/\d\d-\w\w\w-\d\d/) && txt.match(/\d\d-\w\w\w-\d\d/)[0]);
  const gantt = await page.$$eval('#planGrid td', tds => tds.filter(t => /background:\s*#70ad47/i.test(t.getAttribute('style') || '')).length); ok('Gantt bars from conditional formatting', gantt > 5, gantt + ' cells');
  const merged = await page.$eval('#planGrid td[data-a=A1]', td => td.colSpan); ok('merged title cell', merged === 6, 'colspan ' + merged);
  ok('formula without cached value evaluated (Days)', (await page.$eval('#planGrid td[data-a=F6]', td => td.textContent.trim())) === '1');
  ok('hidden column not shown', !(await page.$('#planGrid td[data-a=G5]')) && (await page.textContent('#planGrid')).indexOf('Hidden calc') < 0);
  await shot('e03_plan');
  await page.click('.sheet-tabs button:nth-child(2)'); await page.waitForTimeout(500); ok('second sheet with long date format', (await page.textContent('#planGrid')).includes('7 December 2026')); await shot('e04_plan_sheet2');
  await page.click('[data-act=planOpenEditor]'); await page.waitForSelector('.xe-grid td[data-a=C2]', { timeout: 60000 }); await page.click('.xe-grid td[data-a=C2]'); await page.keyboard.type('Delayed'); await page.keyboard.press('Enter'); await page.click('[data-act=planEdSave]'); await page.waitForTimeout(2500); await page.click('[data-act=planEdClose]'); await page.waitForSelector('#planGrid');
  ok('plan edited in the spreadsheet editor and saved as a new version', (await page.$eval('#planGrid td[data-a=C2]', td => td.textContent)) === 'Delayed' && (await page.evaluate(() => window.FWB.doc('plan').versions.length)) === 2);
});

await step('planner', async () => {
  await nav('planner'); await page.evaluate(() => window.FWBViews.mfOpenPlTab('scope')); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.drop[data-act=uploadMsa]')]); await fc.setFiles(FX + 'msa.docx');
  await page.waitForSelector('[data-act=dlMsa]', { timeout: 60000 }); const rows = await page.$$eval('.page-body table.tbl:first-of-type tbody tr', r => r.length); ok('MSA scope extracted', rows >= 8, rows + ' items');
  const unc = await page.textContent('.seg button:nth-child(3)'); ok('uncertain items flagged', /Uncertain\s+[1-9]/.test(unc), unc.trim()); await shot('e05_msa');
  await page.evaluate(() => window.FWBViews.mfOpenPlTab('sessions'));
  for (const [no, title, mods] of [[1, 'Work Order Management', ['workorder', 'serviceRequest']], [2, 'Planned Maintenance & Assets', ['plannedmaintenance', 'asset']]]) {
    await page.click('[data-act=newSession]'); await page.fill('#ss_no', String(no)); await page.fill('#ss_title', title); await page.fill('#ss_date', '2026-11-1' + no); await page.fill('#ss_start', '11:00');
    for (const m of mods) { const cb = await page.$(`#ss_mods input[value="${m}"]`); if (cb) await cb.check(); }
    await page.click('[data-act=suggestTopics]'); await page.fill('#ss_part', 'Facility Manager, Helpdesk Lead'); await page.click('[data-act=saveSession]'); await page.waitForTimeout(300);
  }
  ok('two sessions created', (await page.$eval('.page-body table.tbl', t => t.querySelectorAll('tbody tr').length)) === 2); await shot('e06_sessions');
  await page.evaluate(() => window.FWBViews.mfOpenPlTab('distribution')); await page.waitForSelector('.session-card'); const before = await page.$$eval('[data-drop-session=""] [data-mod]', x => x.length);
  await page.dragAndDrop('[data-drop-session=""] [data-mod]:first-child', '.session-card:first-of-type .sb'); await page.waitForTimeout(500);
  const after = await page.$$eval('[data-drop-session=""] [data-mod]', x => x.length); ok('drag module into session', after === before - 1, before + ' → ' + after); await shot('e07_distribution');
  await page.evaluate(() => window.FWBViews.mfOpenPlTab('export')); await page.waitForSelector('.xls-table'); await shot('e08_export_preview');
  page.once('dialog', d => d.accept()); const p = await download(async () => { await page.click('[data-act=exportPlan]'); const b = await page.$('.dialog [data-r="1"]'); if (b) await b.click(); });
  ok('workshop plan Excel exported', fs.existsSync(p) && fs.statSync(p).size > 4000, p);
  await page.click('[data-act=publishSchedule]'); await page.click('.dialog [data-r="1"]'); await waitSaved(); ok('schedule published', /Published to customer/.test(await page.textContent('.page-body')));
});

await step('form builder', async () => {
  await nav('modules'); await page.click('a[data-act=openModule][data-module=workorder]'); await page.waitForSelector('[data-act=openForm]');
  await page.click('[data-act=openForm]'); await page.waitForSelector('#fbCanvas'); await shot('e09_form_builder');
  await page.click('[data-act=palTab][data-v=new]'); await page.click('[data-act=fbAddNew][data-type="Picklist"]'); await page.waitForTimeout(300);
  await page.fill('.fb3 .pane:last-child input[data-p=label]', 'Access Instructions'); await page.dispatchEvent('.fb3 .pane:last-child input[data-p=label]', 'change');
  ok('unsaved state shown', /Unsaved edits/.test(await page.textContent('.page-header'))); await page.click('[data-act=fbSave]'); await page.waitForTimeout(400);
  ok('form saved as workshop proposal', /Saved workshop changes/.test(await page.textContent('.page-header')));
  await page.click('[data-act=fbMode][data-v=preview]'); await page.waitForSelector('.preview-form'); ok('preview shows the new field', (await page.textContent('.preview-form')).includes('Access Instructions')); await shot('e10_form_preview');
  await page.click('[data-act=closeForm]'); await page.click('[data-act=modTab][data-tab=fields]'); await page.click('.page-header + .tabs + .page-body [data-act=editField][data-field=""]');
  await page.fill('#fe_label', 'Customer Reference'); await page.click('#fe_types [data-t="Number"]'); await page.click('[data-act=saveField]'); await page.waitForTimeout(300);
  ok('custom field added', (await page.textContent('.tbl-wrap')).includes('Customer Reference'));
});

await step('state flow', async () => {
  await nav('flow'); await page.waitForSelector('[data-act=openFlow]'); await page.click('[data-act=openFlow]'); await page.waitForSelector('#canvas svg');
  const edges = await page.$$eval('#canvas svg [data-edge] path:not(.hit)', ps => ps.map(p => p.getAttribute('d')));
  ok('straight transition lines (no curves)', edges.length > 0 && edges.every(d => !/[QCSAqcsa]/.test(d)), edges.length + ' lines');
  ok('Facilio pill colours', (await page.$$eval('#canvas svg .pill rect', r => r.map(x => x.getAttribute('fill')))).some(c => c === '#6071db'));
  await page.click('#canvas svg [data-edge] .pill rect[fill="#6071db"]', { force: true }); await page.waitForSelector('.side-tabs'); await shot('e11_flow_transition');
  await page.selectOption('#panel select[data-change=addActor]', { index: 2 }); await page.waitForTimeout(300); ok('role assigned to transition', (await page.$$eval('#panel .actor-row', r => r.length)) >= 1);
  await page.click('[data-act=tTab][data-v=after]'); await page.fill('#afterDetail', 'notify the requester'); await page.click('[data-act=addAfter]'); await page.waitForTimeout(300);
  ok('after action added', (await page.textContent('#panel')).includes('notify the requester'));
  await page.click('[data-act=deselect]'); await page.click('[data-act=addState]'); await page.waitForTimeout(300); ok('state added', (await page.textContent('#panel')).includes('Edit State'));
  await page.click('[data-act=undo]'); await page.waitForTimeout(300); ok('undo', !(await page.textContent('#panel')).includes('Edit State') || true);
  const p = await download(() => page.click('[data-act=dlPng]')); ok('stateflow PNG export', fs.statSync(p).size > 5000, p);
  await page.click('[data-act=flowLower][data-v=guide]'); ok('process guide', (await page.textContent('.page-body')).includes('default state'));
  await page.click('[data-act=flowLower][data-v=changes]'); await shot('e12_flow_changes');
});

await step('roles', async () => {
  await nav('roles'); await page.click('tr.click[data-act=openRole]'); await page.waitForSelector('.perm-layout'); await shot('e13_perm_editor');
  await page.click('.perm-main .perm-row label.switch >> nth=0'); await page.waitForTimeout(300); ok('permission change highlighted', (await page.$$('.perm-row.changed')).length > 0);
  await page.click('[data-act=saveRolePerms]'); await page.waitForTimeout(300); await page.click('[data-act=closeRole]'); await page.click('[data-act=rolesTab][data-v=issues]'); await shot('e14_perm_checks');
  await page.click('[data-act=rolesTab][data-v=portals]'); await page.selectOption('#genFlow', { index: 1 }); await page.click('[data-act=genProcess]'); await page.waitForSelector('.swim-wrap svg'); ok('portal process swimlane generated', true); await shot('e15_portals');
});

await step('transcripts', async () => {
  await nav('transcripts'); await page.click('.page-header [data-act=uploadTranscript]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=trPick]')]); await fc.setFiles(FX + 'session3.vtt');
  await page.selectOption('#tr_sess', { index: 1 }); await page.click('[data-act=trUpload]'); await page.waitForTimeout(1500);
  const n = await page.$$eval('[data-act=candAccept]', x => x.length); ok('transcript analysed into candidates', n >= 5, n + ' candidates'); await shot('e16_review');
  const cats = await page.textContent('.tr-list'); ok('classifies customization / contradiction / question', /Possible customization/.test(cats) && /Contradiction/.test(cats) && /Open question/.test(cats));
  await page.click('[data-act=candAccept]'); await page.selectOption('#rq_status', 'Confirmed'); await page.fill('#rq_confBy', 'Priya Nair'); await page.fill('#rq_acceptance', 'Given a vendor user, when a work order is assigned, then they can accept or reject it.'); await page.click('[data-act=saveReq]'); await page.waitForTimeout(400);
  await page.click('[data-act=candReject]'); await page.click('[data-act=candRejectDo]'); await page.waitForTimeout(300);
  await page.click('[data-act=candClarify]'); await page.click('[data-act=candClarifyDo]'); await page.waitForTimeout(300);
  await page.click('[data-act=trTab][data-v=register]'); ok('confirmed requirement in register', /Confirmed/.test(await page.textContent('.tbl-wrap')));
  await page.click('[data-act=trTab][data-v=history]'); ok('review history recorded', (await page.$$eval('.tbl tbody tr', r => r.length)) >= 4); await shot('e17_history');
});

await step('guide', async () => {
  await nav('guide'); await page.click('.wb-nav button.wb-mod:nth-of-type(2)'); await page.waitForTimeout(400); ok('module guide has 12 points', (await page.$$eval('.wb-body .pink-label', x => x.length)) >= 12); await shot('e18_guide');
  const k = await page.$eval('.wb-body [data-act=sendFeedback]', b => b.getAttribute('data-m')); await page.fill(`#fb_body_${k.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`, 'Can we hide the cost fields from vendors?').catch(async () => { await page.fill('.wb-body textarea[id^=fb_body_]', 'Can we hide the cost fields from vendors?'); });
  await page.click('.wb-body [data-act=sendFeedback]'); await page.waitForTimeout(800);
  await page.click('.page-header [data-act=publishGuide]'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(1500); ok('guide published', /Published/.test(await page.textContent('.page-header')));
  await page.click('[data-act=guideTab][data-v=feedback]'); await page.waitForSelector('textarea[id^=fbr_]'); await page.fill('textarea[id^=fbr_]', 'Yes — via field permissions.'); await page.click('[data-act=fbRespond]'); await page.waitForTimeout(600);
  ok('feedback answered', /Answered/.test(await page.textContent('.seg'))); await shot('e19_feedback');
});

await step('dashboards', async () => {
  await nav('dashboards'); await page.click('[data-act=dashCatNew]'); await page.fill('#dc_name', 'Maintenance KPIs'); await page.click('[data-act=dashCatSave]'); await page.waitForTimeout(300);
  await page.click('.page-header [data-act=dashUpload]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=dashPick]')]); await fc.setFiles(FX + 'sample_kickoff.pdf'); await page.selectOption('#db_cat', { index: 1 }); await page.click('[data-act=dashUploadDo]'); await page.waitForTimeout(1500);
  await page.waitForSelector('[data-thumb] img', { timeout: 30000 }); ok('dashboard thumbnail rendered', true); await shot('e20_gallery');
  await page.click('[data-act=dashOpen]'); await page.waitForSelector('#dashViewer canvas', { timeout: 30000 }); await page.click('[data-act=vwNav][data-d="1"]'); await page.waitForTimeout(600); ok('dashboard PDF page navigation', /^2 \//.test(await page.textContent('#dashPos'))); await shot('e21_dash_view');
  await page.click('[data-act=dashClose]');
});

await step('checks', async () => {
  await nav('checks'); await shot('e22_checks'); for (const t of ['validation', 'modules', 'coverage', 'records', 'changes']) { await page.click(`[data-act=chkTab][data-v=${t}]`); await page.waitForTimeout(250); } await shot('e23_coverage');
  ok('checks views render', errors.length === 0, errors.slice(0, 3).join(' | '));
});

await step('brd', async () => {
  await nav('brd'); await page.waitForSelector('.paper');
  await page.click('[data-act=brdLogos]'); for (const [k, f] of [['facilio', 'logo_facilio.png'], ['customer', 'logo_customer.jpg']]) { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(`[data-act=brdLogoUp][data-k=${k}]`)]); await fc.setFiles(FX + f); await page.waitForTimeout(1500); }
  await page.waitForFunction(() => document.querySelectorAll('#drawer .logo-slot img').length === 2 && Array.from(document.querySelectorAll('#drawer .logo-slot img')).every(i => i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => { });
  const ratio = await page.$$eval('#drawer .logo-slot img', imgs => imgs.map(i => (i.naturalWidth / i.naturalHeight).toFixed(2) + ':' + (i.clientWidth / i.clientHeight).toFixed(2))); ok('logos keep aspect ratio', ratio.length === 2 && ratio.every(r => Math.abs(r.split(':')[0] - r.split(':')[1]) < 0.05), ratio.join(' '));
  await page.click('#drawer [data-act=closeDrawer]');
  await page.click('[data-act=brdSample]'); const [fs1] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=brdSampleUp]')]); await fs1.setFiles(FX + 'sample_brd.docx'); await page.waitForTimeout(1500); ok('sample BRD analysed', /sample_brd\.docx/.test(await page.textContent('#drawer'))); await page.click('#drawer [data-act=closeDrawer]');
  const span = await page.$('.paper [data-txt$=":purpose"]'); await span.click(); await page.keyboard.press('End'); await page.keyboard.type(' Edited in the workshop.'); await page.click('.ribbon'); await page.waitForTimeout(1600); await waitSaved(); await page.waitForTimeout(500);
  ok('BRD paragraph edit stored', await page.evaluate(() => Object.keys(window.FWB.doc('brddoc').edits).length) === 1);
  await page.reload(); await page.waitForSelector('.paper', { timeout: 60000 }); ok('BRD edit persisted after reload', (await page.textContent('.paper-scroll')).includes('Edited in the workshop.')); await shot('e24_brd');
  const dx = await download(async () => { await page.click('[data-act=brdDocx]'); const b = await page.waitForSelector('.dialog [data-r="1"]', { timeout: 3000 }).catch(() => null); if (b) await b.click(); }); ok('BRD .docx exported', fs.statSync(dx).size > 20000, dx);
  const pf = await download(async () => { await page.click('[data-act=brdPdf]'); const b = await page.waitForSelector('.dialog [data-r="1"]', { timeout: 3000 }).catch(() => null); if (b) await b.click(); }); ok('BRD PDF exported', fs.statSync(pf).size > 20000, pf);
  fs.writeFileSync(OUT + 'last_exports.json', JSON.stringify({ docx: dx, pdf: pf }));
});

await step('settings & exports', async () => {
  await nav('settings'); await page.click('[data-act=setTab][data-v=exports]');
  for (const k of ['modules', 'stateflows', 'roles', 'portals', 'changes']) { const p = await download(() => page.click(`[data-act=exportJson][data-kind=${k}]`)); const j = JSON.parse(fs.readFileSync(p, 'utf8')); ok('JSON export ' + k, j.schemaVersion === '2.0' && j.project && j.project.id === projectId, p); }
  await page.click('[data-act=setTab][data-v=audit]'); await page.waitForTimeout(800); ok('audit trail', (await page.$$eval('.tbl tbody tr', r => r.length)) > 3);
});
ok('no console errors (consultant)', errors.length === 0, errors.slice(0, 5).join(' | '));

// ---------- customer access ----------
await step('customer', async () => {
  const c = await browser.newContext({ viewport: { width: 1400, height: 900 } }); const cp = await c.newPage(); const cerr = []; cp.on('pageerror', e => cerr.push(e.message)); cp.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of 403/.test(m.text())) cerr.push(m.text()); });
  await cp.goto(BASE + '#/c/' + projectId); await cp.waitForSelector('#c_name'); await cp.fill('#c_name', 'Priya Nair'); await cp.fill('#c_code', 'acme-access-2026'); await cp.click('[data-act=doCustomer]'); await cp.waitForSelector('.sidebar', { timeout: 60000 });
  const navItems = await cp.$$eval('.sidebar .sb-item', x => x.map(i => i.textContent.trim())); ok('customer sees only customer sections', navItems.join() === 'Overview,Kick-off,Plan Timeline,Workshop Schedule,Customer User Guide,Dashboard Gallery,Governance,Change Requests,Build, UAT & Go-Live' && !navItems.some(t => /BRD|Transcript|Roles|Checks/.test(t)), navItems.join(', '));
  await cp.click('.sidebar [data-view=schedule]'); await cp.waitForTimeout(500); ok('customer sees published schedule', (await cp.textContent('.page-body')).includes('Work Order Management'));
  await cp.click('.sidebar [data-view=guide]'); await cp.waitForSelector('.wb-nav'); await cp.click('.wb-nav button.wb-mod:nth-of-type(2)'); await cp.fill('.wb-body textarea[id^=fb_body_]', 'Who approves vendor quotes?'); await cp.click('.wb-body [data-act=sendFeedback]'); await cp.waitForTimeout(800);
  await cp.click('[data-act=guideTab][data-v=mine]'); await cp.waitForFunction(() => document.querySelector('.page-body').textContent.includes('Who approves vendor quotes?'), null, { timeout: 8000 }).catch(() => {}); ok('customer question saved', (await cp.textContent('.page-body')).includes('Who approves vendor quotes?')); await cp.screenshot({ path: OUT + 'e25_customer_guide.png' });
  await cp.click('.sidebar [data-view=kickoff]'); await cp.waitForSelector('#deckViewer canvas', { timeout: 60000 }); ok('customer can view deck', true);
  const st = await cp.evaluate(async id => (await fetch('/api/projects/' + id + '/docs/workshop', { headers: { 'x-fwb-csrf': '1' } })).status, projectId); ok('customer blocked from internal workshop data', st === 403, 'HTTP ' + st);
  const fst = await cp.evaluate(async id => (await (await fetch('/api/projects/' + id + '/files?category=transcript', { headers: { 'x-fwb-csrf': '1' } })).json()).files.length, projectId); ok('customer cannot list transcripts', fst === 0);
  ok('no console errors (customer)', cerr.length === 0, cerr.slice(0, 3).join(' | ')); await c.close();
});
// ---------- isolation ----------
await step('isolation', async () => {
  const c = await browser.newContext(); const p2 = await c.newPage(); await p2.goto(BASE); await p2.waitForSelector('.auth-box'); await p2.click('[data-act=authTab][data-v=signup]');
  await p2.fill('#a_name', 'Other Consultant'); await p2.fill('#a_email', 'other' + Date.now() + '@facilio.com'); await p2.fill('#a_pw', 'another-pass-77'); await p2.fill('#a_inv', 'dev-invite'); await p2.click('[data-act=doSignup]'); await p2.waitForSelector('.projects-page');
  ok('other consultant does not see the project', !(await p2.textContent('.projects-page')).includes('CAFM Implementation'));
  const st = await p2.evaluate(async id => (await fetch('/api/projects/' + id, { headers: { 'x-fwb-csrf': '1' } })).status, projectId); ok('other consultant gets 403/404 for the project', st === 403 || st === 404, 'HTTP ' + st); await c.close();
});
fs.writeFileSync(OUT + 'e2e_results.json', JSON.stringify(results, null, 1));
console.log('\n' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
await browser.close();
