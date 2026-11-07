// A1c: every report offers a DeepSeek draft and Open in Claude. Checks the prompt for each report type holds the right project data, a pasted Claude reply fills the report
// as an editable draft (nothing sent, nothing saved as final), and the Word export still works.
// Run: node build.mjs; node tests/ui/devserver.mjs 4190; PW_CHANNEL=msedge node tests/ui/report-ai-check.mjs http://localhost:4190   (PW_CHANNEL=msedge on this PC)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const REPLY = md => '## Overall status\nGreen. ' + md + '\n\n## Progress this week\nWorkshop two finished and the actions were logged by the team, with owners and dates agreed in the room.\n\n## Risks and issues\nNone new this week.';
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'ReportAI', customer: 'RA' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/reports`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1200);
await p.evaluate(() => localStorage.setItem('fwb_claude_conn', '0'));   // the full prompt path, so the pasted reply box shows
await p.evaluate(async () => { await window.FWBViews.items.put('action', 'a_ra1', { text: 'UNIQUE-ACTION-RA1 send the asset list', owner: 'Sam', side: 'customer', status: 'Open', due: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) }); });
// 1. the prompt for each report type holds the sections it needs and this project's own data
const pack = (task, instruction) => p.evaluate(async ([pid, task, instruction]) => (await (await fetch(`/api/fn/api/projects/${pid}/ai/pack`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task, instruction }) })).json()).prompt || '', [pid, task, instruction]);
const w = await pack('wsr', 'Period 2026-11-01 to 2026-11-07.'), m = await pack('monthly', 'Period 2026-11-01 to 2026-11-30.'), g = await pack('govupdate', 'Draft to rewrite: Done this week: one'), d = await pack('dashsummary', 'Reporting period: All time. Figures: Requirements 12');
check('WSR prompt: progress, plan versus actual, risks, next week, and this project\'s action', /Progress this week/.test(w) && /plan versus actual/.test(w) && /Risks and issues/.test(w) && /Planned next week/.test(w) && /UNIQUE-ACTION-RA1/.test(w) && /Period 2026-11-01/.test(w));
check('monthly prompt: summary, milestones, risks, scope changes, decisions needed, next month', /Executive summary/.test(m) && /Milestones achieved/.test(m) && /Risks and issues/.test(m) && /Scope changes/.test(m) && /Decisions and customer actions needed/.test(m) && /Next month focus/.test(m));
check('weekly update prompt carries the draft and never asks to invent', /Draft to rewrite/.test(g) && /UNIQUE-ACTION-RA1/.test(g) && /Do not add any fact/.test(g));
check('dashboard summary prompt carries only the figures given', /Figures: Requirements 12/.test(d) && /never compute or invent a number/.test(d));
check('a report prompt holds no BRD text (only the kinds the report needs)', !/Business Requirements Document \(BRD\)/.test(w));
// 2. status reports: DeepSeek in the report, Ask Claude through the Assistant queue, Word
const jobs = () => p.evaluate(() => (window.FWBViews.studioJobs.K().jobs || []).filter(j => j.kind === 'chat').map(j => (j.params || {}).note || ''));
const waitJob = async re => { for (let i = 0; i < 20; i++) { if ((await jobs()).some(n => re.test(n))) return true; await p.waitForTimeout(500); } return false; };
await p.click('[data-act="repNew"][data-t="WSR"]'); await p.waitForSelector('#rp_c');
check('the status report offers DeepSeek and Ask Claude, and no Open in Claude', (await p.locator('[data-act="repAi"]').count()) === 1 && (await p.locator('[data-act="repClaude"]').count()) === 1 && !/Open in Claude|Add from Claude/.test(await p.innerText('#drawer')));
await p.click('[data-act="repClaude"]');
check('Ask Claude queues a request for the Assistant box (get_task_pack wsr, save_draft) and opens nothing', await waitJob(/get_task_pack with task wsr[\s\S]*save_draft/) && !(await p.locator('#hoR').count()));
const dl = p.waitForEvent('download', { timeout: 8000 }); await p.fill('#rp_c', REPLY('TYPED-WSR-OK')); await p.click('[data-act="repExport"]'); const f = await dl.catch(() => null);
check('Export Word still works on the report', !!f && /\.docx$/.test(f.suggestedFilename()), f && f.suggestedFilename());
await p.click('[data-act="closeDrawer"]').catch(() => { });
// 3. dashboard report
await p.goto(BASE + `/?nointro#/p/${pid}/dashreport`); await p.waitForSelector('[data-act="drAi"]', { timeout: 10000 });
check('the dashboard report offers DeepSeek and Ask Claude', (await p.locator('[data-act="drAi"]').count()) === 1 && (await p.locator('[data-act="drClaude"]').count()) === 1);
await p.click('[data-act="drAi"]'); await p.waitForSelector('#dr_sum', { timeout: 30000 }).catch(() => { });
check('DeepSeek opens the dashboard summary as an editable draft, inside the app', (await p.locator('#dr_sum').count()) === 1 && (await p.inputValue('#dr_sum')).length > 20);
await p.click('#drawer [data-act="closeDrawer"]').catch(() => { });
await p.click('[data-act="drClaude"]'); check('Ask Claude queues the dashboard summary request', await waitJob(/task dashsummary/));
const csv = p.waitForEvent('download', { timeout: 8000 }); await p.click('#drCsv'); const cf = await csv.catch(() => null);
check('the dashboard CSV export still works', !!cf, cf && cf.suggestedFilename());
// 4. weekly update (Governance, Facilio side)
await p.goto(BASE + `/?nointro#/p/${pid}/governance`); await p.waitForSelector('.tabs', { timeout: 10000 }); await p.click('text=Weekly digest'); await p.waitForSelector('#dg_body');
check('the weekly update offers DeepSeek and Ask Claude', (await p.locator('[data-act="dgAi"]').count()) === 1 && (await p.locator('[data-act="dgClaude"]').count()) === 1);
await p.click('[data-act="dgClaude"]'); check('Ask Claude queues the weekly update request and nothing is posted', await waitJob(/task govupdate/) && /Nothing posted yet/.test(await p.innerText('body')));
// 4b. the Assistant box answers with DeepSeek inside, from the page the person is on
await p.waitForSelector('#asM', { state: 'attached' }); if (!(await p.locator('#asst').isVisible())) await p.click('#asstTab');
check('the Assistant box offers DeepSeek (in here) and Claude (queue)', (await p.locator('#asMode option').count()) === 2);
await p.selectOption('#asMode', 'ds'); await p.fill('#asM', 'What should I tell the customer this week?'); await p.click('[data-act="asstSend"]'); await p.waitForFunction(() => /Local preview|DeepSeek could not/.test(document.querySelector('#asst .as-body').innerText), null, { timeout: 30000 }).catch(() => { });
check('DeepSeek answers inside the Assistant box (no job, no Claude)', /Local preview/.test(await p.innerText('#asst .as-body')));
// 5. FTR report
await p.goto(BASE + `/?nointro#/p/${pid}/ftr`); await p.waitForSelector('.aip', { timeout: 10000 }).catch(() => { });
check('the FTR page offers the AI panel for the written FTR report', /FTR report/.test(await p.locator('.aip').first().innerText().catch(() => '')));
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
