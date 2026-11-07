// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/discover-login-check.mjs
// The sign-in page's Discover more (full-screen story, src/animation/discover/login-scroll.js): every solution area is a pinned scene that zooms in, its words light up with the scroll, then it leaves.
// Usage: node --import ./tests/ui/use-edge.mjs tests/ui/discover-login-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); let p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro#/discover'); await p.waitForSelector('.dx-ov', { timeout: 30000 }); await p.waitForTimeout(2500);
const nScene = await p.locator('.dx-ov .dxl-scene').count(); check('every solution area is a pinned scene', nScene >= 4, nScene + ' scenes');
check('the heading and description words are wrapped to light up one by one', (await p.locator('.dx-ov .dx-lc .dxfx-w').count()) >= 10);
// walk through the first scene: arriving, pinned (words lighting), leaving
const st = f => p.evaluate(async f => { const o = document.querySelector('.dx-ov'), s = document.querySelector('.dxl-scene'), pin = s.firstElementChild, lc = pin.firstElementChild, top = parseFloat(o.style.getPropertyValue('--dxl-top'));
  o.scrollTop = s.getBoundingClientRect().top + o.scrollTop - top + (s.offsetHeight - pin.offsetHeight) * f; await new Promise(r => setTimeout(r, 450));
  const w = [...lc.querySelectorAll('.dxfx-w')].map(x => parseFloat(getComputedStyle(x).opacity)); return { wp: parseFloat(lc.style.getPropertyValue('--wp')), out: parseFloat(lc.style.getPropertyValue('--out')), pinTop: Math.round(pin.getBoundingClientRect().top), top, dim: Math.min(...w), lit: Math.max(...w) }; }, f);
const seen = []; for (const f of [0, .2, .45, .7, .95, 1]) { seen.push(await st(f)); if (OUT) await p.screenshot({ path: `${OUT}/login-${String(Math.round(f * 100)).padStart(3, '0')}.png` }); }
check('the scene stays pinned under the top bar while you scroll through it', seen.slice(0, 5).every(s => Math.abs(s.pinTop - s.top) <= 3), seen.map(s => s.pinTop).join(','));
check('words start dim and are all lit by the end of the scene', seen[0].dim < .3 && seen[3].dim > .95, seen[0].dim.toFixed(2) + ' to ' + seen[3].dim.toFixed(2));
check('the scene dims and shrinks as it leaves', seen[0].out === 0 && seen[5].out > .95, seen[0].out + ' to ' + seen[5].out);
check('chapters alternate between light and dark scenes', await p.evaluate(() => { const l = [...document.querySelectorAll('.dx-ov .dx-lc')]; return l.length >= 4 && getComputedStyle(l[0]).backgroundColor !== getComputedStyle(l[1]).backgroundColor; }));
await p.keyboard.press('Escape'); await p.waitForTimeout(400); check('Escape closes it', (await p.locator('.dx-ov').count()) === 0);
await ctx.close(); ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); p = await ctx.newPage(); await p.goto(BASE + '/?nointro#/discover'); await p.waitForSelector('.dx-ov', { timeout: 30000 }); await p.waitForTimeout(800);
check('reduced motion: the plain page, nothing moves', (await p.locator('.dx-ov .dxfx-w, .dx-ov .dxl-scene').count()) === 0 && !(await p.evaluate(() => document.querySelector('.dx-ov').classList.contains('dxl-on')))); await ctx.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
