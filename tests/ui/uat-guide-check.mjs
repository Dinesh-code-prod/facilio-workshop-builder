// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/uat-guide-check.mjs
// UAT guide preparation (local preview, local stand-in for the model): from Build, UAT & Go-Live › UAT the team prepares the testers' guide
// with the same guided drafting as user guides: UAT-shaped sections and sources, scenarios written from confirmed requirements (a draft
// requirement is never the one tested), the guide listed back on the UAT tab and opened from there, Word export.
// Usage: node tests/ui/uat-guide-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'UAT guide check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/#/p/${pid}/delivery`); await p.reload(); await p.waitForSelector('.sidebar'); await p.waitForTimeout(1200);
await p.evaluate(() => { const S = window.FWB.S; S.ws.requirements.push({ id: 'DRAFT-9', title: 'Maybe auto-close', status: 'Draft', modules: [] }, { id: 'REQ-201', title: 'Permits need two approvals', status: 'Confirmed', modules: [] }); window.FWB.changed('UAT fixtures', '', { section: 'workshop' }); });
await p.waitForTimeout(1800);
await p.click('[data-act="dlTab"][data-v="uat"]'); await p.waitForTimeout(500);
check('the UAT tab offers the testers\' guide', /UAT guide for testers/.test(await p.textContent('.page-body')) && !!(await p.$('[data-act="dlUatGuide"]')));
await p.click('[data-act="dlUatGuide"]'); await p.waitForSelector('#ug_kind', { state: 'attached', timeout: 15000 });
check('it opens the guided set-up as a UAT guide', await p.inputValue('#ug_kind') === 'uat' && await p.inputValue('#ug_t') === 'UAT guide' && /New UAT guide/.test(await p.textContent('#drawer')));
const xs = await p.$$eval('input[name="ug_x"]', e => e.map(x => x.value)); check('UAT sections are offered (scenarios, defects, not in this UAT, sign-off)', ['u_scen', 'u_defects', 'u_out', 'u_signoff'].every(k => xs.includes(k)), xs.join());
const on = await p.$$eval('input[name="ug_s"]:checked', e => e.map(x => x.value)); check('UAT sources are on by default: confirmed requirements, use cases, approved changes, UAT sessions', ['reqs', 'usecases', 'crs', 'uat'].every(k => on.includes(k)), on.join());
for (const k of xs) if (!['u_scen', 'u_out'].includes(k)) await p.uncheck(`input[name="ug_x"][value="${k}"]`);
await p.screenshot({ path: `${OUT}/uat-guide-setup.png` });
await p.click('[data-act="ugWizGo"]');
await p.waitForFunction(() => { const g = window.FWBViews.ugCtx && window.FWBViews.ugCtx.W(); return g && g.sections.length === 2 && g.sections.every(s => (s.blocks || []).some(x => x.text)); }, null, { timeout: 60000 });
const g = await p.evaluate(() => JSON.parse(JSON.stringify(window.FWBViews.ugCtx.W())));
check('the guide is a UAT guide and both sections were written', g.plan.kind === 'uat' && g.sections.every(s => /Local preview UAT text for/.test(s.blocks[0].text)));
check('scenarios are written from the confirmed requirement, not the draft one', /REQ-201/.test(g.sections[0].blocks[0].text) && !/DRAFT-9/.test(g.sections[0].blocks[0].text), g.sections[0].blocks[0].text.slice(0, 200));
check('the set-up line says UAT guide', /UAT guide/.test(await p.textContent('.ug-plan')));
await p.waitForTimeout(1500); await p.evaluate(() => window.FWBViews.go('delivery')); await p.waitForTimeout(800); await p.click('[data-act="dlTab"][data-v="uat"]').catch(() => { }); await p.waitForTimeout(800);
check('the UAT tab lists the guide', !!(await p.$('[data-act="dlUatGuideOpen"]')) && /UAT guide/.test(await p.textContent('.page-body')));
await p.click('[data-act="dlUatGuideOpen"]'); await p.waitForSelector('.ug-top', { timeout: 15000 }); check('Open goes to the guide in the builder', /UAT guide/.test(await p.textContent('.page-header h1')));
await p.click('[data-act="ugTab"][data-v="export"]'); await p.waitForTimeout(300);
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="ugDocx"]')]); check('Word export downloads', /\.docx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await p.evaluate(() => { window.FWB.S.ui.ugOpen = null; window.FWBViews.go('guidebuilder'); }); await p.waitForTimeout(600);
check('the guide list shows the type', /UAT guide/.test(await p.textContent('.tbl')) && !!(await p.$('[data-act="ugNewUat"]')));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
