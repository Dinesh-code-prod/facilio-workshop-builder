// Master design system check (24 Nov 2026): at 1920, 1366 and 1100 px wide, in the staff, customer (Preview as customer) and Admin views and in both
// menu formats (Text 'side', Icons 'top'), clicks every side-menu entry and every page tab of a stage, and checks that the page opens with the
// right entry marked open, that no page error is thrown, that the top bar, the page header and the stage tabs do not overlap, and that the page has no
// sideways scroll. Read-only (uses the first project of the local data). Restores each view's layout setting at the end.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4231; node tests/ui/master-ds-check.mjs [baseUrl] [outDir] [--widths=1920,1366,1100] [--views=staff,customer,admin] [--shots]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = n => (args.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const BASE = pos[0] || 'http://localhost:4231', OUT = pos[1] || 'tests/ui/out/master-ds', SHOTS = args.includes('--shots');
const WIDTHS = (flag('widths') || '1920,1366,1100').split(',').map(Number), VIEWS = (flag('views') || 'staff,customer,admin').split(',');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const fails = [], counts = {}; let errs = [];
const fail = (ctx, what) => { fails.push(ctx + ': ' + what); };

// runs in the page: overlapping controls in the top bar, the page header and the stage tabs, plus sideways scroll
function layoutProblems() {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const name = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20) + '"';
  const hit = (a, c) => { const r = a.getBoundingClientRect(), s = c.getBoundingClientRect(); return Math.min(r.right, s.right) - Math.max(r.left, s.left) > 2 && Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > 2; };
  const out = [];
  const groups = [
    [...document.querySelectorAll('header.navbar :is(.nav-logo, .title, .ws-switch, .nb-tabs, .co-pill, .nb-proj, [data-act="custPreview"], .save-state, .gs-btn, .bell, .avatar, .hp-chip)')],
    [...document.querySelectorAll('.main .page-header > *')],
    [...document.querySelectorAll('nav.mt-bar .mt-t, nav.mt-bar .mt-cap')],
    [...document.querySelectorAll('.adm-main .adm-h > *, .adm-nav .adm-ni')]];
  for (const g of groups) { const v = g.filter(vis); for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (!v[i].contains(v[j]) && !v[j].contains(v[i]) && hit(v[i], v[j])) out.push('overlap ' + name(v[i]) + ' / ' + name(v[j])); }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('sideways scroll ' + document.documentElement.scrollWidth + ' > ' + innerWidth);
  return out.slice(0, 4);
}

for (const W of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } }); const p = await ctx.newPage(); errs = [];
  p.on('pageerror', e => errs.push(e.message)); const settle = ms => p.waitForTimeout(ms);
  const enter = async () => { await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); } };
  await enter();
  const pid = process.env.CHECK_PID || await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0].id);
  const before = await p.evaluate(() => ({ staff: FWBViews.navPref('staff'), customer: FWBViews.navPref('customer'), admin: FWBViews.navPref('admin') }));
  const check = async (c) => { const probs = await p.evaluate(layoutProblems); for (const x of probs) fail(c, x); if (errs.length) { for (const e of errs) fail(c, 'page error ' + e.slice(0, 120)); errs = []; } counts[c.split(' ')[0]] = (counts[c.split(' ')[0]] || 0) + 1; };
  const shot = async n => { if (SHOTS) await p.screenshot({ path: path.join(OUT, `${W}-${n}.png`) }); };

  async function projectNav(view, lay) {
    const tag = `${view}/${lay}@${W}`;
    await p.evaluate(([l, v]) => FWBViews.setNavPref(l, v), [lay, view]); await settle(1200); await p.keyboard.press('Escape');
    if (lay === 'side') {
      const list = await p.evaluate(() => [...new Map(FWBViews.navFor().flatMap(g => g.items.map(i => [i[0], i[1]]))).entries()].filter(([v]) => FWBViews[v]));
      for (const [v, label] of list) {
        if (!await p.$(`nav.sidebar .sb-item[data-view="${v}"]`)) { const t = await p.$(`nav.sidebar .sb-title[data-views*="${v}"]`); if (t) { await t.click(); await settle(400); } }
        const it = await p.$(`nav.sidebar .sb-item[data-view="${v}"]`); if (!it) { if (!await p.$(`nav.sidebar .sb-title[data-views="${v}"]`)) fail(tag, `no menu entry for ${label} (${v})`); continue; }
        await it.click(); await settle(700);
        const ok = await p.evaluate(v => { const a = [...document.querySelectorAll('nav.sidebar .sb-item.active')]; return a.length === 1 && a[0].getAttribute('data-view') === v; }, v);
        if (!ok) fail(tag, `${label} (${v}): the open entry is not marked`); await check(`${tag} ${v}`);
      }
      await shot(`${view}-side`);
    } else {
      const rails = await p.evaluate(() => [...document.querySelectorAll('nav.sidebar .rl-b')].map(x => x.getAttribute('aria-label')));
      if (!rails.length) fail(tag, 'no icon rail');
      for (let i = 0; i < rails.length; i++) {
        await p.evaluate(i => document.querySelectorAll('nav.sidebar .rl-b')[i].click(), i); await settle(700);
        const ok = await p.evaluate(i => { const r = document.querySelectorAll('nav.sidebar .rl-b')[i]; return !!r && r.classList.contains('active') && document.querySelectorAll('nav.sidebar .rl-b.active').length === 1; }, i);
        if (!ok) fail(tag, `rail ${rails[i]}: not marked open`); await check(`${tag} rail:${rails[i]}`);
        const tabs = await p.evaluate(() => [...document.querySelectorAll('nav.mt-bar .mt-t')].filter(e => e.offsetParent).map(t => t.getAttribute('data-view')));
        for (const v of tabs) {
          // a detail page (e.g. Forms & templates under Solution design & BRD) is a stage tab only while it is open; once another tab is open it is gone, which is right
          if (!await p.$(`nav.mt-bar .mt-t[data-view="${v}"]`)) continue;
          if (!(await p.isVisible(`nav.mt-bar .mt-t[data-view="${v}"]`).catch(() => false))) { await p.evaluate(() => { const d = document.querySelector('.mt-more'); if (d) d.open = true; }); await p.click(`.mt-more [data-view="${v}"]`).catch(() => fail(tag, `tab ${v} could not be clicked (not in the top bar or its ⋯ menu)`)); } else await p.click(`nav.mt-bar .mt-t[data-view="${v}"]`).catch(() => fail(tag, `tab ${v} could not be clicked`));   // tabs that do not fit sit in the ⋯ menu (27 Nov 2026) await settle(650);
          const t = await p.evaluate(v => { const a = [...document.querySelectorAll('nav.mt-bar .mt-t.active')]; return { one: a.length === 1 && a[0].getAttribute('data-view') === v, rail: !!document.querySelector('nav.sidebar .rl-b.active') }; }, v);
          if (!t.one) fail(tag, `${rails[i]} > ${v}: the open tab is not marked`); if (!t.rail) fail(tag, `${rails[i]} > ${v}: no rail entry marked open`); await check(`${tag} ${v}`);
        }
      }
      await shot(`${view}-top`);
    }
  }

  if (VIEWS.includes('staff') || VIEWS.includes('customer')) {
    await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(2800); await p.keyboard.press('Escape');
    if (VIEWS.includes('staff')) for (const lay of ['top', 'side']) await projectNav('staff', lay);
    if (VIEWS.includes('customer')) {
      await p.evaluate(() => { location.hash = location.hash.replace(/(#\/p\/[^/]+)\/.*/, '$1/projdash'); }); await settle(1200);
      await p.evaluate(() => { if (!document.querySelector('[data-act="custPreview"]')) window.FWBViews.setNavPref('side'); }); await p.waitForTimeout(600); const cp = await p.$('[data-act="custPreview"]'); if (!cp) fail(`customer@${W}`, 'no Preview as customer button');
      else { await cp.click(); await settle(2500); for (const lay of ['top', 'side']) await projectNav('customer', lay);
        const leak = await p.evaluate(() => [...document.querySelectorAll('[data-act="openAdmin"]:not([hidden]), nav.sidebar [data-view="settings"]')].filter(e => e.offsetParent).length); if (leak) fail(`customer@${W}`, 'Admin or Settings visible in the customer view');
        await p.click('[data-act="custPreviewExit"]').catch(() => {}); await settle(1500); }
    }
  }
  if (VIEWS.includes('admin')) {
    await enter(); await p.click('[data-act="openAdmin"]'); await settle(2500);
    for (const lay of ['side', 'top']) {
      const tag = `admin/${lay}@${W}`; await p.evaluate(l => FWBViews.setNavPref(l, 'admin'), lay); await settle(1200);
      const n = await p.evaluate(() => document.querySelectorAll('.adm-nav .adm-ni').length); if (!n) fail(tag, 'no Admin menu');
      for (let i = 0; i < n; i++) {
        const lab = await p.evaluate(i => { const e = document.querySelectorAll('.adm-nav .adm-ni')[i]; e.click(); return (e.getAttribute('title') || e.textContent).trim().slice(0, 30); }, i); await settle(900);
        const ok = await p.evaluate(i => { const e = document.querySelectorAll('.adm-nav .adm-ni')[i]; return !!e && e.classList.contains('on') && document.querySelectorAll('.adm-nav .adm-ni.on').length === 1; }, i);
        if (!ok) fail(tag, `${lab}: not marked open`); await check(`${tag} ${lab}`);
      }
      await shot(`admin-${lay}`);
    }
  }
  await p.evaluate(bf => { for (const [v, l] of Object.entries(bf)) FWBViews.setNavPref(l, v); }, before).catch(() => {});   // put the layout settings back
  await ctx.close(); console.log(`width ${W} done, problems so far ${fails.length}`);
}
await b.close();
const uniq = [...new Set(fails)]; fs.writeFileSync(path.join(OUT, 'master-ds-check.txt'), uniq.join('\n'));
console.log('checked', JSON.stringify(counts)); console.log(uniq.length ? uniq.length + ' problem(s):\n' + uniq.slice(0, 60).join('\n') : 'no problems');
process.exitCode = uniq.length ? 1 : 0;
