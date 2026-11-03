import { chromium } from 'playwright'; const [,, BASE, route, outPrefix, tabs] = process.argv;
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).id);
await p.goto(`${BASE}/?nointro#/p/${id}/${route}`); await p.reload(); await p.waitForTimeout(3500);
await p.evaluate(() => { const F = window.FWB; F.allModules().filter(m => /^(service request|work order)$/i.test(m.label)).forEach(m => { F.S.ws.modules[m.name] = Object.assign(F.S.ws.modules[m.name] || {}, { inScope: true }); }); window.FWBViews.render(); });
for (const t of tabs.split(',')) { await p.evaluate(t => { const e = document.querySelector(`[data-act="guideTab"][data-v="${t}"]`); if (e) e.click(); }, t); await p.waitForTimeout(1200); await p.screenshot({ path: `${outPrefix}-${t}.png`, fullPage: false }); }
await b.close();
