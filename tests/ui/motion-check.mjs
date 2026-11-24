// Motion while people wait (24 Nov 2026): a page that is still loading shows a skeleton instead of the word "Loading…", the project search shows a moving
// line while it runs and its results rise in one after another, and the Assistant lists what a running Claude job has reported (ticks, then the step in progress).
// With prefers-reduced-motion all of it stands still. Read-only: the API is slowed in the browser and the running job is a stub in the page, nothing is saved.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4231; node tests/ui/motion-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4231', OUT = process.argv[3] || 'tests/ui/out/motion'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' }); let bad = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) bad++; };
for (const motion of ['no-preference', 'reduce']) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: motion }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const settle = ms => p.waitForTimeout(ms); const anim = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).animationName : null; }, sel);
  await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
  const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects')).json()).projects[0].id);
  await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(3000); await p.keyboard.press('Escape');
  // 1. skeleton: projects and Admin open behind the branded veil, so the in-page "Loading…" moments are short and hard to catch; the check adds the app's most
  // common placeholder markup (17 uses: <div class="muted" style="padding:20px">Loading…</div>) to the page and checks the watcher turns it into a skeleton
  await p.evaluate(() => { const x = document.createElement('div'); x.className = 'muted'; x.style.padding = '20px'; x.textContent = 'Loading…'; x.id = 'mcSkel'; Object.assign(x.style, { position: 'fixed', left: '320px', top: '240px', width: '560px', zIndex: 9999 }); document.body.appendChild(x); });   // on the body: page redraws would replace it inside .main
  await settle(400);
  const sk = await p.evaluate(() => { const e = document.querySelector('#mcSkel.ds-skel'); return e ? { busy: e.getAttribute('aria-busy'), text: e.textContent.trim(), color: getComputedStyle(e).color, h: Math.round(e.getBoundingClientRect().height) } : null; });
  if (motion === 'no-preference') await p.locator('#mcSkel').screenshot({ path: OUT + '/skeleton.png' }).catch(() => {});
  check(`[${motion}] a loading block becomes a skeleton, its words kept for screen readers`, !!sk && !sk.none && sk.busy === 'true' && /^Loading/.test(sk.text) && /rgba\(0, 0, 0, 0\)/.test(sk.color), JSON.stringify(sk));
  check(`[${motion}] the shimmer ${motion === 'reduce' ? 'is off' : 'runs'}`, motion === 'reduce' ? (await p.evaluate(() => { const e = document.querySelector('.ds-skel'); return e ? getComputedStyle(e, '::after').display : 'none'; })) === 'none' : (await p.evaluate(() => { const e = document.querySelector('.ds-skel'); return e ? getComputedStyle(e, '::after').animationName : ''; })) === 'dsShimmer');
  await p.evaluate(() => { const x = document.getElementById('mcSkel'); if (x) x.remove(); });
  // 2. search: slow only the search call so the busy line can be seen, then the results
  await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(3000); await p.keyboard.press('Escape');
  await p.route('**/search?**', async r => { await new Promise(t => setTimeout(t, 1800)); await r.continue().catch(() => {}); });
  await p.keyboard.press('Control+k'); await settle(600);
  await p.fill('#gs_q', 'work order'); await settle(700);
  const line = await anim('.gs-busy .ds-line'); const lineAfter = await p.evaluate(() => { const e = document.querySelector('.gs-busy .ds-line'); return e ? getComputedStyle(e, '::after').animationName : null; });
  if (motion === 'no-preference') await p.screenshot({ path: OUT + '/search-busy.png' });
  check(`[${motion}] while the search runs there is a ${motion === 'reduce' ? 'still' : 'moving'} line and the word Searching`, line !== null && (motion === 'reduce' ? lineAfter === 'none' : lineAfter === 'dsLine'), String(lineAfter));
  await settle(2600); const rows = await p.evaluate(() => [...document.querySelectorAll('.gs-r')].slice(0, 3).map(e => [e.style.getPropertyValue('--i'), getComputedStyle(e).animationName]));
  if (motion === 'no-preference') await p.screenshot({ path: OUT + '/search-results.png' });
  check(`[${motion}] results ${motion === 'reduce' ? 'appear without motion' : 'rise in one after another'}`, rows.length > 0 && rows.every(([i, a]) => i !== '' && (motion === 'reduce' ? a === 'none' : a === 'dsRise')), JSON.stringify(rows));
  await p.unroute('**/search?**'); await p.keyboard.press('Escape'); await settle(400); await p.evaluate(() => window.FWBViews.closeDrawer && window.FWBViews.closeDrawer()); await settle(300);
  // 3. Claude working: a stub job with three progress reports (only in this page; nothing is sent)
  const steps = await p.evaluate(async () => {
    const V = window.FWBViews, k = V.studioJobs && V.studioJobs.K(); if (!k) return { err: 'no studioJobs' }; const t = Date.now(), iso = n => new Date(t - n * 60000).toISOString();
    const job = { id: 'jb_motioncheck00000001', kind: 'pull_msa', key: 'k', params: {}, status: 'claimed', requestedBy: 'dinesh.r@facilio.com', requestedAt: iso(6), at: iso(6), claimedBy: 'dinesh.r@facilio.com', claimedAt: iso(5), leaseUntil: iso(-25), result: null, finishedAt: '', log: [], progress: { text: 'Drafting the project plan', at: iso(0) },
      activity: [{ at: iso(4), text: 'Reading 3 contract documents' }, { at: iso(2), text: 'Finding the modules in scope' }, { at: iso(0), text: 'Drafting the project plan' }] };
    k.pid = window.FWB.S.project.id; k.jobs = [job]; const a = window.FWB.S.ui.asst || (window.FWB.S.ui.asst = {}); a.open = true; a.sig = ''; a.init = k.pid; a.seen = { x: 1 };
    await new Promise(r => setTimeout(r, 2600));
    return [...document.querySelectorAll('#asst .as-steps li')].map(li => li.className + ':' + li.textContent.trim());
  });
  if (motion === 'no-preference') { await p.evaluate(() => { const e = document.querySelector('#asst .as-now'); if (e) e.scrollIntoView({ block: 'start' }); }); await settle(300); await p.locator('#asst').screenshot({ path: OUT + '/claude-steps.png' }); }
  check(`[${motion}] the Assistant lists what Claude reported: two ticked, the newest in progress`, Array.isArray(steps) && steps.length === 3 && steps[0].startsWith('done:Reading') && steps[2].startsWith('now:Drafting'), JSON.stringify(steps));
  check(`[${motion}] the step in progress ${motion === 'reduce' ? 'does not pulse' : 'pulses'}`, (await p.evaluate(() => { const e = document.querySelector('#asst .as-steps li.now > i'); return e ? getComputedStyle(e, '::after').animationName : null; })) === (motion === 'reduce' ? 'none' : 'dsPulse'));
  check(`[${motion}] no page errors`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await b.close(); console.log(bad ? bad + ' failed' : 'all motion checks passed'); process.exitCode = bad ? 1 : 0;
