import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
await p.goto(process.argv[2] + '/' + (process.argv[3] || '?intro=1')); const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
const secs = +process.argv[4] || 18; const a = await get(); await p.waitForTimeout(secs * 1000); const c = await get(); const d = k => ((c[k] - a[k]) * 1000).toFixed(0);
console.log(`over ${secs}s: task ${d('TaskDuration')} ms, script ${d('ScriptDuration')} ms, layout ${d('LayoutDuration')} ms (${(c.LayoutCount - a.LayoutCount)} layouts), style ${d('RecalcStyleDuration')} ms (${(c.RecalcStyleCount - a.RecalcStyleCount)} recalcs), JS heap ${(c.JSHeapUsedSize / 1e6).toFixed(0)} MB`); await b.close();
