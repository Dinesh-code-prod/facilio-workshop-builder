// Where the time goes during the opening animations: samples the JavaScript profiler and prints the functions with the most self time (use an unminified build: FWB_NO_MINIFY=1 node build.mjs).
// Usage: node --import ./tests/ui/use-edge.mjs tests/ui/intro-profile.mjs [baseUrl] [seconds] [urlSuffix]    (urlSuffix: ?intro=1 for the tree, or a road page link)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173', SEC = +process.argv[3] || 20, SUF = process.argv[4] || '?intro=1';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await p.goto(BASE + '/' + SUF); await cdp.send('Profiler.start'); await p.waitForTimeout(SEC * 1000); const { profile } = await cdp.send('Profiler.stop');
const self = {}; const byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const k = (f.functionName || '(anonymous)') + ' ' + f.url.split('/').pop().slice(0, 18) + ':' + f.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0); });
const total = Object.values(self).reduce((a, c) => a + c, 0); Object.entries(self).sort((a, c) => c[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log((v / 1000).toFixed(0).padStart(6) + ' ms ' + (100 * v / total).toFixed(1).padStart(5) + '%  ' + k)); await b.close();
