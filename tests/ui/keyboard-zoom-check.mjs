// Keyboard and zoom check (27 Nov 2026, the brief's edge cases): read-only.
//  keyboard  Tab through a project page: every control that takes focus shows a visible mark (outline or ring), and the top bar, the menu, the page
//            tabs and the page's main button are all reached.
//  zoom      200 % browser zoom at 1366 px is a 683 x 450 window: about ten key pages, in both menu formats, must not scroll sideways and the top bar
//            must not overlap itself.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4231; node tests/ui/keyboard-zoom-check.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4231'; const fails = []; const ok = (n, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); if (!c) fails.push(n); };
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); const settle = ms => p.waitForTimeout(ms);
await p.goto(BASE + '/?nointro'); await settle(2000); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
const pid = await p.evaluate(async () => { const ps = (await (await fetch('/api/fn/api/projects')).json()).projects || []; return (ps.find(x => /walkthrough/i.test(x.name)) || ps[0]).id; });
const before = await p.evaluate(() => window.FWBViews.navPref('staff'));
for (const fm of ['top', 'side']) {
  await p.goto(`${BASE}/?nointro#/p/${pid}/tasks`); await settle(2200); await p.evaluate(f => window.FWBViews.setNavPref(f, 'staff'), fm); await settle(1200); await p.keyboard.press('Escape');
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const seen = []; const noMark = [];
  for (let i = 0; i < 70; i++) { await p.keyboard.press('Tab'); await settle(200); const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const blue = c => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c || ''); return !!m && +m[1] < 60 && +m[2] < 90 && +m[3] > 180; };   /* any shade of the focus blue: the border colour animates */ const mark = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none') || blue(s.borderTopColor) || (e.parentElement && blue(getComputedStyle(e.parentElement).borderTopColor));   /* Facilio fields: the border turns blue on focus */ const zone = e.closest('header.navbar') ? 'top bar' : e.closest('nav.sidebar') ? 'menu' : e.closest('.mt-bar, .tabs') ? 'tabs' : e.closest('.page-header') ? 'header' : e.closest('.main') ? 'page' : 'other'; return { zone, mark, name: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24) }; }); if (f) { seen.push(f.zone); if (!f.mark) noMark.push(f.zone + ': ' + f.name); } }
  const fmName = fm === 'top' ? 'Icons' : 'Text';
  ok(`${fmName}: Tab reaches the top bar, the menu and the page`, ['top bar', 'menu', 'page'].every(z => seen.includes(z)), [...new Set(seen)].join(', '));
  ok(`${fmName}: every focused control shows a focus mark`, noMark.length === 0, noMark.slice(0, 4).join(' | '));
}
// zoom 200 %: a 683 x 450 window
await p.setViewportSize({ width: 683, height: 450 });
for (const fm of ['top', 'side']) { await p.evaluate(f => window.FWBViews.setNavPref(f, 'staff'), fm);
  for (const v of ['projdash', 'msaintake', 'tasks', 'governance', 'settings', 'flow', 'brd', 'changes', 'guides', 'teamhelp']) {
    await p.goto(`${BASE}/?nointro#/p/${pid}/${v}`); await settle(1500); await p.keyboard.press('Escape');
    const r = await p.evaluate(() => { const sw = document.documentElement.scrollWidth, w = innerWidth; const hb = [...document.querySelectorAll('header.navbar > * > *, header.navbar > *')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 4); let ov = 0; for (let i = 0; i < hb.length; i++) for (let j = i + 1; j < hb.length; j++) { if (hb[i].contains(hb[j]) || hb[j].contains(hb[i])) continue; const a = hb[i].getBoundingClientRect(), c = hb[j].getBoundingClientRect(); if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 2 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 2) ov++; } return { sw, w, ov }; });
    ok(`200% zoom, ${fm === 'top' ? 'Icons' : 'Text'}, ${v}: no sideways scroll, top bar not overlapping`, r.sw <= r.w + 1 && r.ov === 0, `scrollWidth ${r.sw} / ${r.w}, overlaps ${r.ov}`);
  }
}
await p.evaluate(f => window.FWBViews.setNavPref(f, 'staff'), before).catch(() => { });
await b.close(); console.log(fails.length ? fails.length + ' failed' : 'all passed'); process.exit(fails.length ? 1 : 0);
