// Claude setup (Help group) > Connect: shows this project's id, the connector address, the Claude Code line, and copy buttons work.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Conn settings', customer: 'C' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/claudesetup`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
const txt = await p.locator('main').innerText();
check('shows the project id and the connector address', txt.includes(pid) && txt.includes('https://mcp.facilio.work/facilio-delivery-studio'));
check('shows the Claude Code line', txt.includes('claude mcp add --transport http facilio-delivery-studio'));
await p.locator('[data-act="hoCopyVal"]').nth(1).click(); await p.waitForTimeout(300); check('Copy puts the project id on the clipboard', (await p.evaluate(() => navigator.clipboard.readText())) === pid);
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
