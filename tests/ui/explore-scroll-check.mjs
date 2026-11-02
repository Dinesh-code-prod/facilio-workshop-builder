// Discover more: the scroll devices work (headline assembles, progress rail grows, a pinned strip slides sideways while the page scrolls), and are off for reduced motion and phone widths.
// Usage: node tests/ui/explore-scroll-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
async function open(ctxOpts) { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, ctxOpts)); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
  const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Discover', customer: 'D Co' }) })).json()).project.id);
  await p.goto(BASE + `/?nointro#/p/${pid}/explore`); await p.reload(); await p.waitForSelector('.dx-hero', { timeout: 30000 }); await p.waitForTimeout(2500); return p; }
const state = p => p.evaluate(() => ({ y: scrollY, rail: getComputedStyle(document.querySelector('.dxfx-rail') || document.body).getPropertyValue('--k'), pan: [...document.querySelectorAll('.dxfx-track')].map(g => g.style.transform || ''), h: document.documentElement.scrollHeight }));
let p = await open({});
check('the headline words assemble one by one', (await p.locator('.dx-hero .dxfx-w').count()) >= 5);
check('the progress rail is there', (await p.locator('.dxfx-rail').count()) === 1);
const nPan = await p.locator('.dxfx-pan').count(); check('solution areas with enough modules become pinned strips', nPan >= 1, nPan + ' strips');
const H = (await state(p)).h; const shots = []; const seen = [];
for (const f of [0, .12, .3, .45, .6, .75, .9, 1]) { await p.evaluate(({ f, H }) => scrollTo(0, (H - innerHeight) * f), { f, H }); await p.waitForTimeout(450); const s = await state(p); seen.push(s); if (OUT) await p.screenshot({ path: `${OUT}/explore-${String(Math.round(f * 100)).padStart(3, '0')}.png` }); }
check('the progress rail grows as you scroll', parseFloat(seen[0].rail || '0') < 0.05 && parseFloat(seen[seen.length - 1].rail) > 0.9, seen[0].rail + ' to ' + seen[seen.length - 1].rail);
const moves = new Set(seen.map(s => s.pan.join('|'))); check('the pinned strip slides sideways while the page scrolls', moves.size >= 3, moves.size + ' positions');
check('no module is cut off: at the end of the strip the last module is fully on screen', await p.evaluate(async () => { const w = document.querySelector('.dxfx-pan'); if (!w) return true; const top = w.getBoundingClientRect().top + scrollY; scrollTo(0, top - parseFloat(getComputedStyle(document.querySelector('.dx')).getPropertyValue('--dxfx-top')) + w.offsetHeight - w.firstElementChild.offsetHeight); await new Promise(r => setTimeout(r, 500)); const last = w.querySelector('.dxfx-track').lastElementChild.getBoundingClientRect(); return last.right <= innerWidth + 2 && last.left >= 0; }));
await p.context().close();
const rm = await open({ reducedMotion: 'reduce' }); check('reduced motion: no scroll devices, the plain grid', (await rm.locator('.dxfx-pan, .dxfx-rail, .dxfx-w').count()) === 0); await rm.context().close();
const ph = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); check('phone: no scroll devices, the plain grid', (await ph.locator('.dxfx-pan, .dxfx-rail, .dxfx-w').count()) === 0); check('phone: nothing wider than the screen', await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await ph.evaluate(() => document.documentElement.scrollWidth + ' of ' + innerWidth)); await ph.context().close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
