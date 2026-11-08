// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/login-flow-check.mjs [baseUrl]
// Sign-in explainer (src/animation/loginflow.js, GSAP + SVG): it loads GSAP from the app's own folder, plays six chapters on one timeline, the caption and the window follow the chapter,
// Replay restarts it, reduced motion shows the last picture, the customer invite page still has its own story, and nothing throws.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const errs = [];
const open = async (ctxOpts, hash) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, ctxOpts)); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE + '/?nointro' + (hash || '')); await p.waitForSelector('[data-act]'); await p.evaluate(() => { window.FWB.S.user = null; window.FWBViews.render(); }); return p; };
let p = await open({});
await p.waitForSelector('.lsf-svg', { timeout: 8000 }); await p.waitForFunction(() => !!(window.gsap && window.FWBViews.loginFlow.timeline()), null, { timeout: 8000 });
check('the explainer draws an SVG stage and loads GSAP from the app folder', (await p.locator('.lsf-svg').count()) === 1 && await p.evaluate(() => [...document.scripts].some(s => /vendor\/gsap\.min\.js/.test(s.src))));
check('no canvas story behind the team sign-in', (await p.locator('.lsx-cv').count()) === 0);
const chs = await p.evaluate(() => window.FWBViews.loginFlow.chapters.map(c => [c[0], c[1]]));
check('six chapters, the first about one studio and the last about the result', chs.length === 6 && /One studio/.test(chs[0][1]) && /Faster/.test(chs[5][1]));
for (let i = 0; i < chs.length; i++) {
  await p.evaluate(t => { const tl = window.FWBViews.loginFlow.timeline(); tl.pause(); tl.time(t); }, chs[i][0] + (i === 5 ? 4.2 : 4.0));
  await p.waitForTimeout(150);
  const st = await p.evaluate(i => ({ cap: document.querySelector('.lsx-cap b').textContent, op: +getComputedStyle(document.querySelector('.ch' + (i + 1))).opacity, others: [...document.querySelectorAll('.lsf .ch')].filter((g, k) => k !== i && +getComputedStyle(g).opacity > .05).length, title: document.querySelector('.wt').textContent }), i);
  check(`chapter ${i + 1} (${chs[i][1]}): caption matches, its scene is shown and no other scene is`, st.cap === chs[i][1] && st.op > .9 && st.others === 0, JSON.stringify(st));
}
check('the stage rail is complete at the end', await p.evaluate(() => Math.abs(window.gsap.getProperty(document.querySelector('.rf'), 'scaleX') - 1) < .02));
await p.evaluate(() => { window.FWBViews.loginFlow.timeline().time(2); }); await p.click('.lsx-rp'); await p.waitForTimeout(400);
check('Replay restarts from the first chapter', await p.evaluate(() => window.FWBViews.loginFlow.timeline().time() < 1.5 && document.querySelector('.lsx-cap b').textContent === window.FWBViews.loginFlow.chapters[0][1]));
check('the sign-in form is still usable beside it', (await p.locator('#a_email').count()) === 1 && await p.locator('#a_email').isVisible());
await p.context().close();
// reduced motion: the last picture at once
p = await open({ reducedMotion: 'reduce' }); await p.waitForFunction(() => !!window.FWBViews.loginFlow.timeline(), null, { timeout: 8000 }); await p.waitForTimeout(300);
check('reduced motion shows the last picture and caption without playing', await p.evaluate(() => { const tl = window.FWBViews.loginFlow.timeline(); return tl.progress() > .99 && !tl.isActive() && /Faster/.test(document.querySelector('.lsx-cap b').textContent); }));
await p.context().close();
// GSAP file missing: the last picture still shows
p = await (async () => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); await pg.route('**/vendor/gsap.min.js', r => r.abort()); await pg.goto(BASE + '/?nointro'); await pg.waitForSelector('[data-act]'); await pg.evaluate(() => { window.FWB.S.user = null; window.FWBViews.render(); }); return pg; })();
await p.waitForSelector('.lsf-svg'); await p.waitForTimeout(1200);
check('without GSAP the explainer shows its last picture, still', await p.evaluate(() => +getComputedStyle(document.querySelector('.ch6')).opacity === 1 && /Faster/.test(document.querySelector('.lsx-cap b').textContent)));
await p.context().close();
// the customer invite page keeps its own city story
p = await open({}, '#/c/abc123'); await p.waitForSelector('.lsx-cv', { timeout: 8000 }).catch(() => { });
check('the customer invite page still has its own story, not the team explainer', (await p.locator('.lsx-cv').count()) === 1 && (await p.locator('.lsf-svg').count()) === 0);
await p.context().close();
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
