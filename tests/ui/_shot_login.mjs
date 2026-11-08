// scratch: screenshots of the sign-in story at several times (deleted after use)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4192'; const OUT = process.argv[3] || 'tests/ui/out/login'; import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
await p.evaluate(() => { window.FWB.S.user = null; window.FWBViews.render(); });
await p.waitForSelector('.lsx', { timeout: 8000 });
for (const t of [1.5, 3.5, 5.5, 8.5, 12, 15.5, 19, 23]) { await p.waitForTimeout(t === 1.5 ? 1500 : 2200); await p.screenshot({ path: `${OUT}/t${String(t).replace('.', '_')}.png` }); }
await b.close();
