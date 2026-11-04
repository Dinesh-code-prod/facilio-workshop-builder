import { chromium } from 'playwright';
const mode = process.argv[3]; const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
await p.addInitScript(m => { const P = CanvasRenderingContext2D.prototype; const fr = P.fillRect;
  if (m === 'nogradfull') P.fillRect = function (x, y, w, h) { const mt = this.getTransform(); const a = Math.abs(w * h * (mt.a * mt.d - mt.b * mt.c)) / (this.canvas.width * this.canvas.height); if (a > .4 && this.fillStyle instanceof CanvasGradient) return; return fr.apply(this, arguments); };
  if (m === 'nobigimg') { const di = P.drawImage; P.drawImage = function (img) { if (img && img.width > 700 && img.height > 400 && img instanceof HTMLCanvasElement) return; return di.apply(this, arguments); }; }
  if (m === 'nostroke') { const s = P.stroke; P.stroke = function () { return; }; }
  if (m === 'nofill') { const f = P.fill; P.fill = function () { return; }; }
  if (m === 'nodraw') { P.drawImage = function () { }; }
}, mode);
await p.goto(process.argv[2] + '/' + (process.argv[4] || '?intro=1')); const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
await p.addInitScript(() => { }); const a = await get(); await p.waitForTimeout(16000); const c = await get(); const d = k => ((c[k] - a[k]) * 1000).toFixed(0);
console.log(mode, 'task', d('TaskDuration'), 'ms, script', d('ScriptDuration')); await b.close();
