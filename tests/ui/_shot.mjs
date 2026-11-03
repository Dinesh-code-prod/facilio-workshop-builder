import { chromium } from 'playwright'; const [,, BASE, route, out, w] = process.argv;
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: Number(w) || 1500, height: 950 } })).newPage();
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).id);
await p.goto(`${BASE}/?nointro#/p/${id}/${route}`); await p.reload(); await p.waitForTimeout(4000); if (process.argv[6]) { await p.evaluate(process.argv[6]); await p.waitForTimeout(1500); } await p.screenshot({ path: out }); await b.close();
