import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage();
await p.addInitScript(() => { window.__t0 = performance.now(); window.__long = []; let last = performance.now(); const loop = t => { const d = t - last; if (d > 45) __long.push([+((t - __t0) / 1000).toFixed(1), Math.round(d)]); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
await p.goto(process.argv[2] + '/' + (process.argv[3] || '?intro=1')); await p.waitForTimeout((+process.argv[4] || 40) * 1000);
const r = await p.evaluate(() => __long); const by = {}; r.forEach(([t, d]) => { const k = Math.floor(t / 2) * 2; (by[k] = by[k] || []).push(d); });
console.log('long frames (over 45 ms) by 2-second window: ' + r.length); Object.keys(by).forEach(k => console.log(String(k).padStart(3) + '-' + String(+k + 2).padEnd(3) + ' s  ' + by[k].length + ' frames, slowest ' + Math.max(...by[k]) + ' ms')); await b.close();
