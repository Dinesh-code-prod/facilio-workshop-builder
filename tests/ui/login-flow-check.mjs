// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/login-flow-check.mjs [baseUrl]
// Sign-in explainer (src/animation/loginflow.js, GSAP + HTML in one product window): seven scenes on one timeline, the caption, window crumb and rail follow the scene,
// the rail jumps between scenes, Replay restarts, a hidden tab pauses, reduced motion shows the last picture, the window fits a phone, the customer invite page keeps its own story.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const errs = [];
const open = async (ctxOpts, hash) => {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, ctxOpts)); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + '/?nointro' + (hash || '')); await p.waitForSelector('[data-act]'); await p.evaluate(() => { window.FWB.S.user = null; window.FWBViews.render(); }); return p;
};
const seek = (p, t) => p.evaluate(t => { const tl = window.FWBViews.loginFlow.timeline(); tl.pause(); tl.time(t); }, t);
let p = await open({});
await p.waitForSelector('.lsn-win', { timeout: 8000 }); await p.waitForFunction(() => !!(window.gsap && window.FWBViews.loginFlow.timeline()), null, { timeout: 8000 });
check('the explainer is one product window and loads GSAP from the app folder', (await p.locator('.lsn-win').count()) === 1 && await p.evaluate(() => [...document.scripts].some(s => /vendor\/gsap\.min\.js/.test(s.src))));
check('no canvas story and no old SVG stage behind the team sign-in', (await p.locator('.lsx-cv, .lsf-svg').count()) === 0);
const chs = await p.evaluate(() => window.FWBViews.loginFlow.chapters.map(c => [c[0], c[2]]));
const end = await p.evaluate(() => window.FWBViews.loginFlow.end);
check('seven scenes, 60 to 90 seconds in all', chs.length === 7 && end >= 60 && end <= 90, 'end ' + end);
const txt = await p.evaluate(() => document.querySelector('.lsn').textContent + window.FWBViews.loginFlow.chapters.join(' '));
check('no AI vendor or model name in the words', !/claude|anthropic|openai|gpt|gemini/i.test(txt));
for (let i = 0; i < chs.length; i++) {
  await seek(p, chs[i][0] + (i === 6 ? 9.5 : 8.8)); await p.waitForTimeout(150);
  const st = await p.evaluate(() => ({ cap: document.querySelector('.lsx-cap b').textContent, shown: [...document.querySelectorAll('.lsn .lz-sc')].map((s, k) => +getComputedStyle(s).opacity > .9 ? k : -1).filter(k => k >= 0), cur: document.querySelector('.lsn-rail button.on')?.dataset.i }));
  check(`scene ${i + 1} (${chs[i][1]}): caption, rail and window agree and only this scene shows`, st.cap === chs[i][1] && st.shown.length === 1 && st.shown[0] === i && +st.cur === i, JSON.stringify(st));
  const clip = await p.evaluate(() => { const w = document.querySelector('.lsn-win').getBoundingClientRect(); return [...document.querySelectorAll('.lsn .lz-sc *')].filter(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width && +s.opacity > .5 && s.visibility !== 'hidden' && (r.right > w.right + 1 || r.bottom > w.bottom + 1) && !e.closest('.lz-cur'); }).length; });
  check(`scene ${i + 1}: nothing spills out of the window`, clip === 0, 'spilled ' + clip);
}
await seek(p, 71); await p.waitForTimeout(100);
check('the rail is full at the end', await p.evaluate(() => [...document.querySelectorAll('.lsn-rail button')].every(b => +b.style.getPropertyValue('--p') > .99)));
await p.click('.lsn-rail button[data-i="4"]'); await p.waitForTimeout(600);
check('the rail jumps to a scene', await p.evaluate(() => window.FWBViews.loginFlow.timeline().time() >= 40 && document.querySelector('.lsx-cap b').textContent === window.FWBViews.loginFlow.chapters[4][2]));
await p.evaluate(() => { window.FWBViews.loginFlow.timeline().time(30); }); await p.click('.lsx-rp'); await p.waitForTimeout(400);
check('Replay restarts from the first scene', await p.evaluate(() => window.FWBViews.loginFlow.timeline().time() < 1.5 && document.querySelector('.lsx-cap b').textContent === window.FWBViews.loginFlow.chapters[0][2]));
check('caption, rail labels, Replay and "Illustrative" have contrast of at least 4.5:1 on the night background', await p.evaluate(() => {
  const lum = c => { const [r, g, bl] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * bl; };
  const bgc = [17, 16, 74], bg = lum(bgc);
  return ['.lsx-row small', '.lsx-rp', '.lsn-rail span', '.lsx-cap span', '.lsx-cap b'].every(s => { const m = getComputedStyle(document.querySelector('.lsn ' + s)).color.match(/[\d.]+/g).map(Number); const a = m[3] === undefined ? 1 : m[3]; const f = lum(m.slice(0, 3).map((v, k) => v * a + bgc[k] * (1 - a))); return (Math.max(f, bg) + .05) / (Math.min(f, bg) + .05) >= 4.5; }); }));
check('the sign-in form is still usable beside it', (await p.locator('#a_email').count()) === 1 && await p.locator('#a_email').isVisible());
// a hidden tab pauses the timeline
await p.evaluate(() => { window.FWBViews.loginFlow.timeline().time(5).play(); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
check('a hidden tab pauses the timeline', await p.evaluate(() => window.FWBViews.loginFlow.timeline().paused()));
await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
check('and it resumes when the tab is back', await p.evaluate(() => !window.FWBViews.loginFlow.timeline().paused()));
await p.context().close();
// phone width: the window is scaled to the column, nothing scrolls sideways
p = await open({ viewport: { width: 390, height: 844 } }); await p.waitForSelector('.lsn-win'); await p.waitForTimeout(300);
check('on a phone the window fits the column and the page does not scroll sideways', await p.evaluate(() => { const w = document.querySelector('.lsn-win').getBoundingClientRect(); return w.right <= innerWidth && w.width > 250 && document.documentElement.scrollWidth <= innerWidth + 1; }));
await p.context().close();
// reduced motion: the last picture at once
p = await open({ reducedMotion: 'reduce' }); await p.waitForFunction(() => !!window.FWBViews.loginFlow.timeline(), null, { timeout: 8000 }); await p.waitForTimeout(300);
check('reduced motion shows the last picture and caption without playing', await p.evaluate(() => { const tl = window.FWBViews.loginFlow.timeline(); return tl.progress() > .99 && !tl.isActive() && /Go live/.test(document.querySelector('.lsx-cap b').textContent); }));
await p.click('.lsn-rail button[data-i="2"]'); await p.waitForTimeout(200);
check('with reduced motion the rail still moves between scenes, without playing', await p.evaluate(() => { const tl = window.FWBViews.loginFlow.timeline(); return !tl.isActive() && /People review/.test(document.querySelector('.lsx-cap b').textContent); }));
await p.context().close();
// GSAP file missing: the last picture still shows
p = await (async () => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); await pg.route('**/vendor/gsap.min.js', r => r.abort()); await pg.goto(BASE + '/?nointro'); await pg.waitForSelector('[data-act]'); await pg.evaluate(() => { window.FWB.S.user = null; window.FWBViews.render(); }); return pg; })();
await p.waitForSelector('.lsn-win'); await p.waitForTimeout(1200);
check('without GSAP the explainer shows its last picture, still', await p.evaluate(() => +getComputedStyle(document.querySelector('.lzs7')).opacity === 1 && /Go live/.test(document.querySelector('.lsx-cap b').textContent)));
await p.context().close();
// the customer invite page keeps its own city story
p = await open({}, '#/c/abc123'); await p.waitForSelector('.lsx-cv', { timeout: 8000 }).catch(() => { });
check('the customer invite page still has its own story, not the team explainer', (await p.locator('.lsx-cv').count()) === 1 && (await p.locator('.lsn-win').count()) === 0);
await p.context().close();
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
