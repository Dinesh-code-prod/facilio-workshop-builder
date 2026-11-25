// Redirect map (user, 25 Nov 2026: "how can a user understand what each tab and button points to"): opens every page of the team menu and each tab
// of it in a browser, and lists every control on the page that leads to ANOTHER page (data-view, a #/p/ link, or a nav button),
// with its label and where it lands. Read-only: it clicks only tab controls, never the listed buttons.
// Usage: PW_CHANNEL=msedge node tools/redirect-map.mjs <baseUrl> <projectId> <out.json>
import { chromium } from 'playwright'; import fs from 'node:fs';
const [BASE, PID, OUT] = process.argv.slice(2);
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + '/?nointro#/p/' + PID + '/projdash'); await p.waitForTimeout(3000);
const enter = await p.$('[data-act="runEnter"]'); if (enter) { await enter.click(); await p.waitForTimeout(3000); }
const menu = await p.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items.map(i => ({ group: g.g, view: i[0], label: i[1] }))));
// tab controls inside a page: clicking them changes the page's own state, not the page
const TAB_SEL = '.main .tabs .tab[data-act], .main .hub-tabs .tab, .main .seg[role="tablist"] button[data-act], .main [role="tablist"] [role="tab"][data-act]';
const grab = () => p.evaluate(() => {
  const vis = el => el.offsetParent && el.getBoundingClientRect().width > 0;
  const label = el => (el.getAttribute('aria-label') || el.textContent || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const where = el => { const sec = el.closest('section, .card, details, .page-header'); const h = sec && sec.querySelector('h2, h3, .card-h b, summary b, h1'); return sec ? (sec.classList.contains('page-header') ? 'page header' : (h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : sec.className.split(' ')[0])) : ''; };
  const out = [];
  document.querySelectorAll('.main [data-view], .main a[href*="#/p/"], .main [data-act="nav"]').forEach(el => {
    if (!vis(el) || el.closest('.tabs, .hub-tabs, [role="tablist"]')) return;
    const to = el.getAttribute('data-view') || ((el.getAttribute('href') || '').match(/#\/p\/[^/]+\/([a-z0-9_]+)/) || [])[1] || '';
    if (!to) return; out.push({ label: label(el), to, act: el.getAttribute('data-act') || 'link', where: where(el) });
  });
  return out;
});
const rows = []; const done = new Set();
for (const m of menu) {
  await p.evaluate(v => window.FWBViews.go(v), m.view); await p.waitForTimeout(900);
  const view = await p.evaluate(() => window.FWB.S.ui.view);
  const tabs = await p.$$eval(TAB_SEL, els => els.filter(e => e.offsetParent).map(e => ({ t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), act: e.getAttribute('data-act'), v: e.getAttribute('data-v') || e.getAttribute('data-t') || e.getAttribute('data-s') || '' })));
  const visit = async tab => { const key = m.view + '|' + (tab ? tab.act + ':' + tab.v : ''); if (done.has(key)) return; done.add(key);
    for (const r of await grab()) rows.push({ group: m.group, page: m.label, view: m.view, tab: tab ? tab.t : '', ...r }); };
  await visit(null);
  for (const t of tabs.slice(0, 12)) { if (!t.act || !t.v) continue; const el = await p.$(`.main [data-act="${t.act}"][data-v="${t.v}"]`); if (!el) continue; await el.click().catch(() => { }); await p.waitForTimeout(500);
    if (await p.evaluate(v => window.FWB.S.ui.view !== v, view)) { await p.evaluate(v => window.FWBViews.go(v), m.view); await p.waitForTimeout(600); continue; }
    await visit(t); }
}
fs.writeFileSync(OUT, JSON.stringify({ menu, rows }, null, 1)); console.log(rows.length + ' redirect controls on ' + menu.length + ' menu pages');
await b.close();
