// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/road-smooth.mjs
// Steps the road journey at 60 fps and measures the camera: the largest change of speed between two frames (a hitch shows up as a spike).
// Usage: node tests/ui/road-smooth.mjs [base] [width]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173', WID = +(process.argv[3] || 1440);
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: WID, height: WID < 500 ? 844 : 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/#/welcome'); await p.waitForFunction(() => window.__ri && window.__ri.frame, null, { timeout: 15000 });
const r = await p.evaluate(() => { const R = window.__ri, h = 1 / 60, xs = []; for (let t = 0; t <= R.END - .1; t += h) { R.frame(t); const c = R.cam; xs.push([t, c.x, c.z, c.h]); }
  let worst = { dv: 0, at: 0 }; const vmax = [0, 0, 0];
  for (let i = 2; i < xs.length; i++) for (let k = 1; k <= 3; k++) { const v1 = (xs[i - 1][k] - xs[i - 2][k]) / h, v2 = (xs[i][k] - xs[i - 1][k]) / h; vmax[k - 1] = Math.max(vmax[k - 1], Math.abs(v2)); const dv = Math.abs(v2 - v1); if (dv > worst.dv) worst = { dv, at: xs[i][0], axis: 'xzh'[k - 1] }; }
  return { frames: xs.length, worstSpeedChangePerFrame: +worst.dv.toFixed(3), at: +worst.at.toFixed(2), axis: worst.axis, peakSpeed: vmax.map(v => +v.toFixed(1)) }; });
console.log(JSON.stringify(Object.assign({ width: WID }, r)), errs.length ? 'ERRORS ' + errs.join(' | ') : ''); await b.close();
