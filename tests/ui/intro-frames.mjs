// Frame-pacing check for the opening tree animation (src/animation/treeintro.js), from start until "Get started" shows.
// Records every animation frame: real time, the intro's own timeline position, canvas size changes and long frames,
// then reports what a viewer perceives as stutter: frames over 50 ms, jumps in the timeline, sudden speed changes and canvas
// re-allocations. Usage: node tests/ui/intro-frames.mjs [baseUrl] [cpuSlowdown]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const SLOW = Number(process.argv[3] || 1);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
if (SLOW > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW }); }
await p.addInitScript(() => {
  const rec = window.__frames = []; let lastW = 0;
  const tick = ts => { const ti = window.__ti; const cv = document.querySelector('.cn.ti canvas'); const go = document.querySelector('.cn.ti .brand.on');
    if (ti && cv) { rec.push({ ts, t: ti.T !== undefined ? ti.T : (ti.time ? ti.time() : null), w: cv.width, go: !!go }); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.goto(BASE + '/?intro=1'); await p.waitForSelector('.cn.ti canvas', { timeout: 15000 });
await p.waitForSelector('.cn.ti .brand.on', { timeout: 60000 }).catch(() => console.log('Get started did not appear within 60s'));
await p.waitForTimeout(300);
const r = await p.evaluate(() => { const f = window.__frames; const t0 = f[0].ts; const gi = f.findIndex(x => x.go); const seg = f.slice(0, gi > 0 ? gi : f.length);
  const dts = seg.slice(1).map((x, i) => x.ts - seg[i].ts); const resizes = seg.filter((x, i) => i && x.w !== seg[i - 1].w).length;
  const hasT = seg.every(x => typeof x.t === 'number');
  let jumps = 0, accel = 0; if (hasT) { const v = seg.slice(1).map((x, i) => (x.t - seg[i].t) / Math.max(1, x.ts - seg[i].ts) * 1000); for (let i = 1; i < v.length; i++) { if (v[i] > 0 && v[i - 1] > 0 && (v[i] / v[i - 1] > 1.6 || v[i - 1] / v[i] > 1.6)) accel++; } jumps = seg.slice(1).filter((x, i) => x.t - seg[i].t > .6).length; }
  // growth speed continuity, from the intro's own timeline: the largest change in speed between two consecutive 60 fps frames, as a share of the speed
  let slopeJump = null; const ti = window.__ti; if (ti && ti.warp && ti.wpts) { const W = ti.wpts(), end = W[W.length - 1][0], h = 1 / 60; let prev = null, worst = 0;
    for (let c = h; c < end - h; c += h) { const v = (ti.warp(c + h) - ti.warp(c)) / h; if (prev && Math.max(prev, v) > .5) worst = Math.max(worst, Math.abs(v - prev) / Math.max(prev, v)); prev = v; } slopeJump = (100 * worst).toFixed(1) + '%'; }
  dts.sort((a, b) => a - b); const q = k => dts[Math.floor(dts.length * k)] || 0;
  return { frames: seg.length, seconds: ((seg[seg.length - 1].ts - t0) / 1000).toFixed(1), p50: q(.5).toFixed(1), p95: q(.95).toFixed(1), max: Math.max(...dts).toFixed(0), over50: dts.filter(d => d > 50).length, canvasResizes: resizes, timelineJumps: hasT ? jumps : 'n/a', speedChanges: hasT ? accel : 'n/a', worstSpeedStepPerFrame: slopeJump }; });
console.log(JSON.stringify(r)); await b.close();
