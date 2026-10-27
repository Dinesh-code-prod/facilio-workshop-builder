// Pages outside the workspace: the welcome page, the customer invitation sign-in, and the customer preview of a project.
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname); const checks = fs.readFileSync(path.join(here, 'checks.js'), 'utf8'); const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch(); let total = 0;
for (const w of [1440, 1280, 768, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } }); await ctx.addInitScript(checks); const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto(BASE + '/'); await p.waitForSelector('[data-act]'); const pid = await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0]?.id);
  const run = async name => { await p.waitForTimeout(1200); const r = await p.evaluate(() => window.__uiAudit()); total += r.length; console.log(String(w).padEnd(5), name.padEnd(24), r.length, r.slice(0, 3).map(x => x.rule + ' ' + x.sig.split(' > ').pop() + ' ' + x.detail).join(' | ')); };
  await p.goto(BASE + '/#/welcome'); await p.reload(); await run('welcome');
  await p.goto(BASE + `/#/c/${pid}`); await p.reload(); await run('customer invitation');
  await p.goto(BASE + `/#/p/${pid}/overview`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(800);
  const cp = await p.$('[data-act="custPreview"]'); if (cp && await cp.isVisible()) { await cp.click(); await run('customer preview'); } else { await p.evaluate(() => window.FWBViews.ACT.custPreview && window.FWBViews.ACT.custPreview()); await run('customer preview'); }
  await ctx.close();
}
console.log('findings', total); await b.close();
