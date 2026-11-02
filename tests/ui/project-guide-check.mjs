// Project Settings > Keeping the project: the checklist, habits, the table of outputs and the prompts show, and Copy works.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Guide', customer: 'G' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
await p.locator('button.tab', { hasText: 'Keeping the project' }).click(); await p.waitForTimeout(500); const txt = await p.locator('main').innerText();
check('shows the live checklist', /What is recorded now/.test(txt) && (await p.locator('.keep-row').count()) >= 10, (await p.locator('.keep-row').count()) + ' rows');
check('shows habits, the outputs table and prompts', /Habits that give good outputs/.test(txt) && /What each output needs/.test(txt) && /Questions to try with the connector/.test(txt));
await p.locator('.keep-row', { hasText: 'Modules in scope' }).locator('button', { hasText: 'Open' }).click(); await p.waitForTimeout(800); check('an Open button takes you to the page that fills the gap', !/Keeping the project/.test(await p.locator('main').innerText()));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
