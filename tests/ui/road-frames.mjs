// Stills of the road journey at chosen moments (seconds), via the intro's test hook (window.__ri.frame).
// Usage: node tests/ui/road-frames.mjs <outDir> <width> <t1,t2,...> [baseUrl]
import { chromium } from 'playwright'; import fs from 'node:fs';
const [out, w, ts, base = 'http://localhost:4173'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +w < 500 ? 844 : +w < 1000 ? 1024 : 900 } }); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGE ERROR', e.message); });
await p.goto(base + '/#/welcome'); await p.waitForSelector('.ri canvas'); await p.waitForTimeout(400);
for (const t of ts.split(',').map(Number)) { await p.evaluate(t => window.__ri.frame(t), t); await p.waitForTimeout(750); await p.screenshot({ path: `${out}/road_${w}_${String(t).replace('.', '_')}.png` }); }
console.log(JSON.stringify({ errors: errs, info: await p.evaluate(() => window.__ri.info ? window.__ri.info() : null) })); await b.close();
