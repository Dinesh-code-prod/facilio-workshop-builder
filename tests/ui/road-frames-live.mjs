// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/road-frames-live.mjs
// Plays the road journey in real time (not stepped) and records every frame: frame-to-frame time, how long draw() took, long frames, and a
// CPU profile of where the time goes. Usage: node tests/ui/road-frames-live.mjs [base] [width] [seconds]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', WID = +(process.argv[3] || 1440), SECS = +(process.argv[4] || 12);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: WID, height: WID < 500 ? 844 : 900 } });
const cdp = await p.context().newCDPSession(p);
await p.addInitScript(() => { const f = window.__rf = []; let last = 0; const tick = ts => { if (last) f.push(ts - last); last = ts; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await p.goto(BASE + '/#/welcome'); await p.waitForFunction(() => window.__ri, null, { timeout: 15000 });
await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); await p.evaluate(() => { window.__rf.length = 0; });
await p.waitForTimeout(SECS * 1000);
const prof = (await cdp.send('Profiler.stop')).profile;
const r = await p.evaluate(() => { const d = window.__rf.slice().sort((a, b) => a - b); const q = k => d[Math.floor(d.length * k)]; return { frames: d.length, p50: +q(.5).toFixed(1), p90: +q(.9).toFixed(1), p99: +q(.99).toFixed(1), max: +d[d.length - 1].toFixed(1), over25: d.filter(x => x > 25).length, over40: d.filter(x => x > 40).length }; });
// self time per function
const self = {}; const byId = Object.fromEntries(prof.nodes.map(n => [n.id, n])); const dt = prof.timeDeltas; prof.samples.forEach((id, i) => { const n = byId[id]; const k = n.callFrame.functionName + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0); });
const tot = Object.values(self).reduce((a, b) => a + b, 0); const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => (100 * v / tot).toFixed(1) + '% ' + k);
console.log(JSON.stringify(Object.assign({ width: WID }, r))); console.log(top.join('\n')); await b.close();
