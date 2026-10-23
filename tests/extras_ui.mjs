// Phase 6 extras: session import, completion, schedule link, internal notes, process as text, agreements, module brief, guide park/filter/field review.
import { setup } from './lib.mjs'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/';
const { page, customer, ok, nav, done } = await setup(BASE);
const pid = await page.evaluate(() => window.FWB.S.project.id);
const api = async (pg, path) => pg.evaluate(async p => { const r = await fetch(p, { headers: { 'x-fwb-csrf': '1' } }); return { s: r.status, j: await r.json().catch(() => ({})) }; }, path);
// ---- import sessions from CSV
fs.writeFileSync('/tmp/sessions.csv', 'Module,Date,Time,Trainer,Mode,Title\nWork Order,2026-11-10,10:00,Asha,Onsite,WO deep dive\nInventory Request,12/11/2026,2:30 pm,Ravi,Remote,\nNo Such Thing,2026-11-12,10:00,X,Remote,Bad\n');
await nav(page, 'planner'); await page.evaluate(() => window.FWBViews.mfOpenPlTab('sessions')).catch(() => { }); await page.waitForSelector('[data-act=sesImport]');
const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=sesImport]')]); await fc.setFiles('/tmp/sessions.csv'); await page.waitForSelector('[data-act=sesImportGo]');
const dr = await page.textContent('#drawer'); ok(dr.includes('2 session(s)') && dr.includes('does not match a module'), 'CSV import previews 2 sessions and reports the unmatched row'); ok(dr.includes('2026-11-12') && dr.includes('14:30'), 'dd/mm/yyyy and 2:30 pm are read correctly');
await page.click('[data-act=sesImportGo]'); await page.waitForTimeout(500); const n = await page.evaluate(() => window.FWB.doc('planner').sessions.length); ok(n === 2, 'sessions added (' + n + ')');
const comp = await page.evaluate(() => window.FWB.doc('planner').sessions.map(s => window.FWBViews.sessionCompletion(s))); ok(comp.every(c => c >= 10 && c < 100), 'completion % is computed per session ' + comp.join(','));
ok(await page.evaluate(() => { const s = Object.assign({}, window.FWB.doc('planner').sessions[0], { status: 'completed' }); return window.FWBViews.sessionCompletion(s) === 100; }), 'a Completed session is 100%');
// ---- schedule link
await page.click('[data-act=sesLink]'); await page.fill('#sl_url', 'http://insecure.example'); await page.click('[data-act=sesLinkSave]'); await page.waitForTimeout(300); ok(!!(await page.$('#sl_url')), 'a non-https link is refused');
await page.fill('#sl_url', 'https://example.sharepoint.com/schedule'); await page.click('[data-act=sesLinkSave]'); await page.waitForTimeout(400);
ok(await page.evaluate(() => window.FWB.doc('planner').settings.scheduleLink === 'https://example.sharepoint.com/schedule'), 'https link saved');
// ---- internal notes never reach the customer
await page.evaluate(() => { window.FWBViews.go('module', { module: 'workorder', moduleTab: 'notes' }); }); await page.waitForSelector('#nt_text'); await page.fill('#nt_text', 'Customer wants SLA clock to pause on parts delay'); await page.click('[data-act=noteAdd]'); await page.waitForTimeout(700);
ok((await page.textContent('.page-body')).includes('SLA clock'), 'internal note saved');
const c = await customer('Priya Nair'); ok(((await api(c, `/api/projects/${pid}/items?kinds=note`)).j.items || []).length === 0, 'customer cannot read internal notes');
// ---- process as text
await page.evaluate(() => { window.FWBViews.go('module', { module: 'workorder', moduleTab: 'process' }); }); await page.waitForSelector('[data-act=procNew]'); await page.click('[data-act=procNew]'); await page.waitForSelector('#pt_text');
await page.fill('#pt_text', 'Tenant: Reports a leak [Tenant portal] -> New\nFM coordinator: ? Is it urgent -> Triaged\nFacilio: Creates the work order -> Assigned'); await page.click('[data-act=procTextSave]'); await page.waitForTimeout(600);
const pr = await page.evaluate(() => window.FWB.S.ws.processes.slice(-1)[0]); ok(pr.steps.length === 3 && pr.steps[1].decision === true && pr.steps[0].interface === 'Tenant portal' && pr.steps[0].statusText === 'New', 'process text parsed into 3 steps with decision, channel and status');
await page.click('[data-act=procText]'); ok((await page.inputValue('#pt_text')).includes('? Is it urgent -> Triaged'), 'text round-trips'); await page.click('[data-act=closeDrawer] >> nth=0');
// ---- kick-off agreements
await nav(page, 'kickoff'); await page.waitForSelector('[data-act=agEdit]'); await page.click('.card-h [data-act=agEdit]'); await page.selectOption('#ag_type', 'Phased delivery'); await page.fill('#ag_title', 'Phase 1 go-live: Work Orders'); await page.fill('#ag_date', '2027-02-01'); await page.click('[data-act=agSave]'); await page.waitForTimeout(700);
ok((await page.textContent('.page-body >> nth=-1')).includes('Phase 1 go-live') && (await page.textContent('body')).includes('Phase 1'), 'phased delivery shows as a phase card');
// ---- module brief reaches the customer
await page.evaluate(() => { window.FWBViews.go('guide', { guideModule: 'workorder' }); }); await page.waitForSelector('[data-act=mbEdit]', { timeout: 15000 }); await page.click('[data-act=mbEdit]'); await page.fill('#mb_custom', 'Quote chain | Two-step approval | Approver list'); await page.fill('#mb_notIncluded', 'Mobile app branding'); await page.click('[data-act=mbSave]'); await page.waitForTimeout(800);
ok((await page.textContent('#gl-brief')).includes('Quote chain') && (await page.textContent('#gl-brief')).includes('Mobile app branding'), 'module brief shown');
ok(((await api(c, `/api/projects/${pid}/items?kinds=modbrief`)).j.items || []).length === 1, 'customer receives the module brief');
// ---- guide: park + filter, impact tag
ok((await page.textContent('#gl-questions')).includes('Affects:'), 'questions show what they affect');
await page.click('[data-act=glPark] >> nth=0'); await page.waitForTimeout(900); await page.click('[data-act=glQf][data-v=ws]'); const shown = await page.$$eval('#gl-questions .gl-q', q => q.length); ok(shown === 1, 'For the workshop filter shows only the parked question (' + shown + ')');
await page.click('[data-act=glQf][data-v=all]');
// ---- new-field review -> CR
await page.fill('input[id^=glx-label-]', 'Cost centre'); await page.click('[data-act=glExtraAdd]'); await page.waitForTimeout(1200);
await page.evaluate(() => { window.FWB.S.ui.guideTab = 'answers'; window.FWBViews.go('guide'); }).catch(() => { }); await page.waitForTimeout(800); await page.click('[data-act=glResp]:has-text("Work Orders")'); await page.waitForTimeout(500);
const hasSel = await page.$('select[data-change=glFr]'); if (hasSel) { await page.selectOption('select[data-change=glFr]', 'Custom (CR)'); await page.waitForTimeout(1500); const crs = await api(page, `/api/projects/${pid}/items?kinds=cr`); ok((crs.j.items || []).some(x => /Cost centre/.test(x.data.title)), 'choosing Custom (CR) drafts a change request'); } else ok(false, 'review select not found on the answers view');
// module brief shows the onboarding sheets for the module (V.onboardingSheetsFor)
await nav(page, 'onboarding'); await page.waitForTimeout(1500);
const shs = await page.evaluate(() => ({ wo: window.FWBViews.onboardingSheetsFor('workorder'), asset: window.FWBViews.onboardingSheetsFor('asset'), none: window.FWBViews.onboardingSheetsFor('no_such_module'), all: window.FWBViews.onboardingPlan().sheets.map(s => s.sheet) }));
ok(Array.isArray(shs.none) && shs.none.length === 0, 'unknown module returns no sheets'); ok(shs.asset.length > 0 && shs.wo.length === 0 && [...shs.wo, ...shs.asset].every(x => shs.all.includes(x)), 'sheets for a module come from the onboarding plan: ' + JSON.stringify(shs.wo.concat(shs.asset)).slice(0, 120));
const withSheets = 'plannedmaintenance'; ok(await page.evaluate(() => window.FWBViews.onboardingSheetsFor('plannedmaintenance').includes('Job Plan')), 'planned maintenance maps to the Job Plan sheet'); await page.evaluate(m => { window.FWBViews.go('guide', { guideModule: m, guideTab: 'guide' }); }, withSheets); await page.waitForSelector('#gl-brief', { timeout: 15000 }); ok((await page.textContent('#gl-brief')).includes('Onboarding sheet: '), 'module brief lists "Onboarding sheet: …" instead of an empty line');
await done('extras_ui');
