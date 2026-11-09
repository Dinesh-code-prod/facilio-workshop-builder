// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/guide-draft-check.mjs
// User Guide Builder, guided drafting (src/guidedraft.js) in a browser against the local preview (local stand-in for the model):
// set-up wizard (modules, readers, sources, sections), every section written one at a time from the chosen module's records, progress and
// status, a person's edit is never overwritten (regeneration comes back as a proposal: add below / replace after saving a version),
// an unedited AI section is regenerated in place, changed sources flag the section, [Missing] markers and stale sections appear in
// the quality checks, the guide survives a reload, and the Word export carries the text.
// Usage: node tests/ui/guide-draft-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs'; import JSZip from 'jszip';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d) => (await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: d ? JSON.stringify(d) : undefined })).json();
  const pr = (await api('POST', '/projects', { name: 'Guide drafting', customer: 'Acme' })).project;
  await api('PUT', `/projects/${pr.id}/items/cmodx/pw1`, { data: { label: 'Permit to Work', name: 'permit_to_work', purpose: 'Control hot work', usage: 'Raise a permit before hot work' } });
  await api('PUT', `/projects/${pr.id}/items/cmodx/vs1`, { data: { label: 'Visitor Log', name: 'visitor_log', purpose: 'Record visitors' } });
  return pr.id;
});
const G = () => p.evaluate(() => { const c = window.FWBViews.ugCtx; const g = c && c.W(); return g ? JSON.parse(JSON.stringify(g)) : null; });
await p.goto(BASE + `/#/p/${pid}/guidebuilder`); await p.reload(); await p.waitForSelector('[data-act="ugNew"]'); await p.waitForTimeout(600);
await p.click('[data-act="ugNew"]'); await p.waitForSelector('#ug_t');
check('the set-up shows the steps, modules from Configuration Inputs, readers, sources and sections', (await p.$$('#drawer .ug-steps li')).length === 5 && !!(await p.$('input[name="ug_m"][value="Permit to Work"]')) && (await p.$$('input[name="ug_s"]')).length === 9 && (await p.$$('input[name="ug_x"]')).length === 11);
await p.fill('#ug_t', 'Permit to Work guide'); await p.check('input[name="ug_m"][value="Permit to Work"]'); await p.fill('#ug_rx', 'Technician, Supervisor');
for (const k of ['fields', 'status', 'actions', 'rules', 'related', 'faq', 'nav', 'before']) await p.uncheck(`input[name="ug_x"][value="${k}"]`);   // three sections keep the test short
await p.screenshot({ path: `${OUT}/guide-draft-setup.png` });
await p.click('[data-act="ugWizGo"]');
await p.waitForFunction(() => { const g = window.FWBViews.ugCtx && window.FWBViews.ugCtx.W(); return g && g.sections.length && g.sections.every(s => (s.blocks || []).some(x => x.text)); }, null, { timeout: 60000 });
await p.waitForTimeout(600); let g = await G();
check('the guide records its set-up', g.plan.modules.join() === 'Permit to Work' && g.plan.roles.join() === 'Technician,Supervisor' && g.plan.level === 'steps' && g.plan.sources.cfg && !g.plan.sources.published);
check('three sections, each written separately by the AI', g.sections.length === 3 && g.sections.every(s => s.ai && s.ai.provider && /Local preview text for/.test(s.blocks[0].text)), g.sections.map(s => s.title).join(' | '));
check('each section was written for its own title', g.sections.every(s => s.blocks[0].text.includes('Local preview text for ' + s.title)));
check('the AI was given the chosen module\'s records', g.sections.every(s => s.blocks[0].text.includes('**Permit to Work**')) && g.sections[0].ai.srcs.some(x => /cmodx/.test(x)));
check('sections show their AI status, the set-up line and progress', (await p.$$('.ug-sbar')).length === 3 && /Permit to Work/.test(await p.textContent('.ug-plan')) && /Review and edit/.test(await p.textContent('.ug-steps li[aria-current="step"]')));
await p.screenshot({ path: `${OUT}/guide-draft-sections.png`, fullPage: false });

// a person's edit is kept: regeneration becomes a proposal
const ta = p.locator('textarea[data-ugm="1.0"]'); await ta.click(); await ta.press('End'); await ta.type('\nMy own verified note.'); await p.waitForTimeout(1500);
g = await G(); check('editing marks the section as edited by a person', g.sections[1].edited === true && /My own verified note/.test(g.sections[1].blocks[0].text));
await p.click('[data-act="ugGen"][data-i="1"]'); await p.waitForSelector('.ug-cmp', { timeout: 30000 }); g = await G();
check('regenerating an edited section does not change it; it shows a proposal to compare', /My own verified note/.test(g.sections[1].blocks[0].text) && !!g.sections[1].proposal && /My own verified note/.test(await p.textContent('.ug-cmp')));
await p.click('[data-act="ugPropGo"][data-k="append"]'); await p.waitForTimeout(800); g = await G();
check('"Add below my text" keeps the edit and adds the AI text after it', g.sections[1].blocks.length === 2 && /My own verified note/.test(g.sections[1].blocks[0].text) && /Local preview text/.test(g.sections[1].blocks[1].text) && !g.sections[1].proposal);
const v0 = await p.evaluate(() => window.FWBViews.items.list('ugv').length);
await p.click('[data-act="ugGen"][data-i="1"]'); await p.waitForSelector('.ug-cmp', { timeout: 30000 }); await p.click('[data-act="ugPropGo"][data-k="replace"]'); await p.waitForTimeout(1200); g = await G();
const v1 = await p.evaluate(() => window.FWBViews.items.list('ugv').length);
check('"Replace my text" saves a version first, then replaces', v1 === v0 + 1 && g.sections[1].blocks.length === 1 && !/My own verified note/.test(g.sections[1].blocks[0].text) && g.sections[1].edited === false, `${v0} -> ${v1}`);
const ver = await p.evaluate(() => window.FWBViews.items.list('ugv').slice(-1)[0]); check('the saved version still has the edited text', JSON.stringify(ver.sections).includes('My own verified note'));
// an AI section nobody edited is regenerated in place
const at0 = g.sections[0].ai.at; await p.waitForTimeout(20); await p.click('[data-act="ugGen"][data-i="0"]'); await p.waitForFunction(at => { const g = window.FWBViews.ugCtx.W(); return g.sections[0].ai.at !== at; }, at0, { timeout: 30000 }); g = await G();
check('an unedited AI section is regenerated in place, no proposal', !g.sections[0].proposal && !(await p.$('.ug-cmp')));

// sources change → the sections are flagged; the quality checks list it and the [Missing] markers
await p.evaluate(async pid => { await fetch(`/api/fn/api/projects/${pid}/items/decision/d9`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { title: 'Permit to Work needs two approvals' } }) }); }, pid);
await p.waitForTimeout(2000); await p.reload(); await p.waitForSelector('[data-act="ugOpen"]', { timeout: 20000 }); await p.click('[data-act="ugOpen"]'); await p.waitForSelector('.ug-top', { timeout: 20000 }); await p.waitForTimeout(800);
const flagged = await p.$$eval('.ug-sbar', e => e.filter(x => /Sources changed/.test(x.textContent)).length);
check('after a reload the guide is back, and sections written before the new decision are flagged "Sources changed"', flagged === 3 && /Permit to Work guide/.test(await p.textContent('.page-header h1')), String(flagged));
await p.click('[data-act="ugTab"][data-v="checks"]'); await p.waitForTimeout(400); const ckt = await p.textContent('.page-body');
check('quality checks list the changed sources and the [Missing] markers', /records this section was written from have changed/.test(ckt) && /Missing/.test(ckt));
await p.click('[data-act="ugTab"][data-v="content"]'); await p.waitForTimeout(300);
await p.click('[data-act="ugGen"][data-i="2"]'); await p.waitForTimeout(2500); check('regenerating clears the flag for that section', !(/Sources changed/.test(await p.textContent('.card:has([data-ugt="2"]) .ug-sbar'))));

// export
await p.click('[data-act="ugTab"][data-v="checks"]'); await p.waitForTimeout(300);
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="ugDocx"]')]); const fp = `${OUT}/guide-draft.docx`; await dl.saveAs(fp);
const xml = await (await JSZip.loadAsync(fs.readFileSync(fp))).file('word/document.xml').async('string'); const txt = xml.replace(/<[^>]+>/g, ' ');
check('the Word export carries every section and its AI text', ['Purpose and scope', 'Module overview', 'Step-by-step procedures'].every(t => txt.includes(t)) && /Permit to Work/.test(txt));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
