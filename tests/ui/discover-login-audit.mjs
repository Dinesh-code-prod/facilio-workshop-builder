// Marketing page (sign-in Discover more) audit: screenshots at scroll positions, WCAG contrast on every text, reduced-motion and mobile checks.
// Usage: node --import ./tests/ui/use-edge.mjs tests/ui/discover-login-audit.mjs [baseUrl] [shotsDir]   (PW_CHANNEL=msedge on this PC)
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const snippet = fs.readFileSync(new URL('./contrast-snippet.js', import.meta.url), 'utf8');
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = [];
const modes = [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['reduced', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }]];
let bad = 0;
for (const [name, opt] of modes) {
  const ctx = await b.newContext(opt), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/?nointro#/discover'); await p.waitForSelector('.dx-ov', { timeout: 30000 }); await p.waitForTimeout(2500);
  // only the overlay is audited: hide the sign-in page behind it; outlined chapter numbers (transparent fill, accent stroke 4.3:1 or better on their cards) are decorative and aria-hidden
  await p.evaluate(() => { document.querySelectorAll('body > *:not(.dx-ov)').forEach(e => { e.hidden = true; }); });
  const total = await p.evaluate(() => { const o = document.querySelector('.dx-ov'); return o.scrollHeight - o.clientHeight; });
  const steps = name === 'mobile' ? 8 : 12; const fails = new Map(); let checked = 0;
  for (let i = 0; i <= steps; i++) {
    await p.evaluate(y => { document.querySelector('.dx-ov').scrollTop = y; }, total * i / steps); await p.waitForTimeout(500);
    if (OUT) await p.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png` });
    const tog = v => p.evaluate(v => document.querySelectorAll('.dx-no').forEach(e => { e.style.visibility = v; }), v); await tog('hidden'); const r = await p.evaluate(snippet); await tog(''); checked += r.checked; r.fails.filter(f => !/dx-no/.test(f.sel)).forEach(f => fails.set(f.sel + '|' + f.text, f));
  }
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector('.dx-ov').scrollWidth > document.querySelector('.dx-ov').clientWidth + 1);
  console.log(`${name}: ${checked} text checks, ${fails.size} contrast failures, horizontal overflow: ${wide}`); fails.forEach(f => console.log('  ', f.ratio + '<' + f.need, JSON.stringify(f.text), f.fg, 'on', f.bg, f.sel)); bad += fails.size + (wide ? 1 : 0);
  await ctx.close();
}
console.log(errs.length ? 'page errors: ' + errs.slice(0, 3).join(' | ') : 'no page errors'); await b.close(); process.exit(bad || errs.length ? 1 : 0);
