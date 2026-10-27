// "See how Delivery Studio helps" on the team sign-in and the customer invitation sign-in: the highlighted button plays the road journey,
// Skip and the natural end both leave through the liquid reveal, and the visitor lands back on the same sign-in page.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const res = []; const check = (n, ok, d) => { res.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
async function run(label, url, skip) {
  await p.goto(BASE + url); await p.reload(); await p.waitForSelector('[data-act="openWelcome"]', { timeout: 10000 }); await p.waitForTimeout(700);
  const box = await p.$eval('[data-act="openWelcome"]', e => { const r = e.getBoundingClientRect(); return { h: Math.round(r.height), bg: getComputedStyle(e).backgroundColor, vis: r.width > 0 }; });
  check(label + ': highlighted button shown', box.vis && box.bg === 'rgb(21, 112, 239)' && box.h >= 44, JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/${label}-signin.png` });
  const t0 = Date.now(); await p.click('[data-act="openWelcome"]');
  const started = await p.waitForFunction(() => window.__ri && document.querySelector('.ri canvas'), null, { timeout: 5000 }).then(() => true, () => false); check(label + ': road journey starts', started);
  if (skip) { await p.waitForTimeout(3500); await p.click('.ri [data-r="skip"]'); }
  const liquid = await p.waitForSelector('.ri .ti-liq', { timeout: skip ? 4000 : 60000 }).then(() => true, () => false); check(label + ': leaves through the liquid reveal', liquid);
  await p.waitForTimeout(skip ? 1200 : 1200); if (liquid) await p.screenshot({ path: `${OUT}/${label}-liquid.png` });
  await p.waitForSelector('.ri', { state: 'detached', timeout: 20000 }).catch(() => { });
  const secs = ((Date.now() - t0) / 1000).toFixed(1); const back = !!(await p.$('.auth [data-act="openWelcome"]')); const hash = await p.evaluate(() => location.hash);
  check(label + ': back on the same sign-in page', back && (url.includes('#/c/') ? hash === url.slice(1) : hash === '#/'), `hash ${hash}, ${secs}s`);
}
await p.goto(BASE + '/'); const pid = await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0]?.id || 'demo');
await run('team', '/#/', true);
await run('customer', `/#/c/${pid}`, true);
await run('team-full', '/#/', false);
await p.goto(BASE + '/#/welcome'); await p.reload(); check('direct #/welcome link plays the journey', await p.waitForSelector('.ri', { timeout: 5000 }).then(() => true, () => false));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
