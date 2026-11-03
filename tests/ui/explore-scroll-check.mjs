// Discover more inside a project: pinned sideways galleries (src/animation/discover/project-scroll.js). The headline assembles, a chapter stays pinned while its cards slide sideways,
// the card in focus grows, and it is all off for reduced motion and phone widths.
// Usage: node tests/ui/explore-scroll-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
async function open(ctxOpts) { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, ctxOpts)); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
  const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Discover', customer: 'D Co' }) })).json()).project.id);
  await p.goto(BASE + `/?nointro#/p/${pid}/explore`); await p.reload(); await p.waitForSelector('.dx-hero', { timeout: 30000 }); await p.waitForTimeout(2500); return p; }
// scroll so the first pinned chapter is at progress f (0 to 1), then read what the page shows
const at = (p, f) => p.evaluate(async f => { const w = document.querySelector('.dxp-pan:not(.off)'); const top0 = parseFloat(getComputedStyle(document.querySelector('.dx')).getPropertyValue('--dxp-top'));
  scrollTo(0, w.getBoundingClientRect().top + scrollY - top0 + (w.offsetHeight - w.firstElementChild.offsetHeight) * f); await new Promise(r => setTimeout(r, 450));
  const g = w.querySelector('.dxp-track'), pin = w.firstElementChild, vp = w.querySelector('.dxp-vp').getBoundingClientRect(), cards = [...g.children];
  return { tr: g.style.transform, k: w.style.getPropertyValue('--k'), pinTop: Math.round(pin.getBoundingClientRect().top), top0, fs: cards.map(c => parseFloat(c.style.getPropertyValue('--f') || '1')), last: cards[cards.length - 1].getBoundingClientRect().right, vpRight: vp.right }; }, f);
let p = await open({});
check('the headline words assemble one by one', (await p.locator('.dx-hero .dxfx-w').count()) >= 5);
const nPan = await p.locator('.dxp-pan:not(.off)').count(); check('solution areas with enough modules become pinned chapters', nPan >= 1, nPan + ' pinned');
const seen = []; for (const f of [0, .25, .5, .75, 1]) { const s = await at(p, f); seen.push(s); if (OUT) await p.screenshot({ path: `${OUT}/project-${String(Math.round(f * 100)).padStart(3, '0')}.png` }); }
check('the chapter stays pinned under the top bar while the cards slide', seen.every(s => Math.abs(s.pinTop - s.top0) <= 3), seen.map(s => s.pinTop).join(','));
check('the cards slide sideways as you scroll', new Set(seen.map(s => s.tr)).size >= 4, new Set(seen.map(s => s.tr)).size + ' positions');
check('the chapter line grows from nothing to full', parseFloat(seen[0].k) < .05 && parseFloat(seen[4].k) > .95, seen[0].k + ' to ' + seen[4].k);
check('the focused card is bigger than the ones stepping back', seen.every(s => Math.max(...s.fs) - Math.min(...s.fs) > .3), seen.map(s => Math.min(...s.fs).toFixed(2)).join(','));
check('no module is cut off: at the end the last card is fully on screen', seen[4].last <= seen[4].vpRight + 2, Math.round(seen[4].last) + ' of ' + Math.round(seen[4].vpRight));
await p.context().close();
const rm = await open({ reducedMotion: 'reduce' }); check('reduced motion: no scroll effects, the plain grid', (await rm.locator('.dxp-pan, .dxp-card, .dxfx-w').count()) === 0); await rm.context().close();
const ph = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); check('phone: no scroll effects, the plain grid', (await ph.locator('.dxp-pan, .dxp-card, .dxfx-w').count()) === 0); check('phone: nothing wider than the screen', await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await ph.evaluate(() => document.documentElement.scrollWidth + ' of ' + innerWidth)); await ph.context().close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
