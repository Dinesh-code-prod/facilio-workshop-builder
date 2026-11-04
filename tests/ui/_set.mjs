import { chromium } from 'playwright'; import fs from 'node:fs';
const OUT = process.argv[2], PRE = process.argv[3] || 's'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4173/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Settings Demo', customer: 'Demo Co' }) })).json()).project.id);
await p.goto(`http://localhost:4173/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('.page-header', { timeout: 30000 }); await p.waitForTimeout(1500);
for (const t of ['project', 'keep', 'access', 'config', 'exports', 'claude', 'audit']) { await p.click(`.tab[data-v="${t}"]`); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${PRE}-${t}.png`, fullPage: false }); const h = await p.evaluate(() => document.querySelector('.page-body').scrollHeight); console.log(t, h); }
console.log('errors', errs.slice(0, 3).join(' | ')); await b.close();
