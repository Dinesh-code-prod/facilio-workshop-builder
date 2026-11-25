// Dashboard rebuild check (25 Nov 2026, docs/plans/DASHBOARD-REBUILD-PLAN-2026-11-25.md). At one width (default 1366) in Edge against the local dev server:
// every project dashboard tab (team, then Preview as customer) and every Admin tab opens with its tab marked active and no page error; a filter chip appears and
// clears; the Admin period changes the figures; the older Admin report tabs switch; a widget downloads as CSV and Excel; both dashboard PDFs download and are real PDFs.
// Read-only apart from the files it downloads. Usage: node build.mjs; node tests/ui/devserver.mjs 4231; node tests/ui/dashboard-check.mjs [baseUrl] [width]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4231', W = Number(process.argv[3] || 1366), OUT = 'tests/ui/out/dashboard'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' }); const ctx = await b.newContext({ viewport: { width: W, height: 1000 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const settle = ms => p.waitForTimeout(ms); let bad = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  (' + String(info).slice(0, 200) + ')' : '')); if (!ok) bad++; };
const enter = async () => { await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); } };
const download = async (fn, t = 120000) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: t }), fn()]); const f = OUT + '/' + d.suggestedFilename(); await d.saveAs(f); return f; };
await enter(); const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects')).json()).projects[0].id);
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(3500); await p.keyboard.press('Escape');

async function walk(tag, expect) {
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.sd-tabs [data-act="sdTab"]')].map(x => [x.getAttribute('data-v'), x.textContent.trim()]));
  check(`[${tag}] the tabs are ${expect.join(', ')}`, JSON.stringify(tabs.map(t => t[1])) === JSON.stringify(expect), tabs.map(t => t[1]).join(', '));
  for (const [v, name] of tabs) { errs.length = 0; await p.click(`.sd-tabs [data-act="sdTab"][data-v="${v}"]`); await settle(1100);
    const st = await p.evaluate(() => ({ active: (document.querySelector('.sd-tabs .tab.active') || {}).textContent, n: document.querySelectorAll('.cs-page .sd-w, .cs-page .sd-kpi, .cs-page .sdr, .cs-page table').length }));
    check(`[${tag}] ${name} opens, marked active, with content, no page error`, st.active === name && st.n > 0 && !errs.length, JSON.stringify(st) + ' ' + errs.join(' | ')); }
}
await walk('team', ['Overview', 'Delivery', 'Work', 'Quality', 'Customer', 'Reports']);
// a filter chip: Work of = Me shows as a chip, and its x clears it
await p.click('.sd-tabs [data-act="sdTab"][data-v="overview"]'); await settle(900);
await p.evaluate(() => { FWB.S.ui.pdMore = true; FWB.S.ui.dkF = Object.assign({}, FWB.S.ui.dkF || { win: 14, focus: 'all', who: 'all' }, { who: 'me' }); FWBViews.render(); }); await settle(900);   // on Overview the filters sit with the charts behind the fold
const chip = await p.evaluate(() => [...document.querySelectorAll('.dk-chip')].map(x => x.textContent.trim()));
check('a filter in use shows as a chip', chip.some(c => /Work of: Me only/.test(c)), chip.join(' | '));
await p.click('.dk-chip [data-act="dkChip"][data-k="who"]'); await settle(900);
check('its x clears it', (await p.evaluate(() => (FWB.S.ui.dkF || {}).who)) === 'all' && !(await p.$('.dk-chip')));
// one widget as CSV and Excel (Work tab, Overdue work)
await p.click('.sd-tabs [data-act="sdTab"][data-v="work"]'); await settle(1100);
const wsel = '.sd-w:has(h3:text-is("Overdue work"))';
await p.click(wsel + ' .sd-wx > summary'); const csv = await download(() => p.click(wsel + ' [data-act="wxDl"][data-f="csv"]'), 30000);
const csvText = fs.readFileSync(csv, 'utf8'); check('a widget downloads as CSV with its header row', /Item.*Kind.*Owner.*Date/.test(csvText.split('\n')[0]), csvText.split('\n')[0]);
await p.click(wsel + ' .sd-wx > summary'); const xl = await download(() => p.click(wsel + ' [data-act="wxDl"][data-f="xlsx"]'), 60000);
check('and as Excel (a real .xlsx: zip header)', fs.readFileSync(xl).slice(0, 2).toString() === 'PK', xl);
// the project PDF, all tabs
await p.evaluate(() => FWBViews.ACT.dpOpen()); await settle(700); await p.check('input[name="dpWhich"][value="all"]');
const pdf1 = await download(() => p.click('[data-act="dpGo"]')); check('the project dashboard PDF (all tabs) is a real PDF', fs.readFileSync(pdf1).slice(0, 5).toString() === '%PDF-' && fs.statSync(pdf1).size > 20000, pdf1 + ' ' + fs.statSync(pdf1).size + ' bytes');
// customer view
await p.click('.sd-tabs [data-act="sdTab"][data-v="overview"]'); await settle(700);
const cp = await p.$('[data-act="custPreview"]'); if (cp) { await cp.click(); await settle(2500); await p.evaluate(id => { location.hash = '#/p/' + id + '/projdash'; }, pid); await settle(2500);
  await walk('customer', ['Overview', 'Requirements & documents', 'Testing & sign-off', 'Reports']);
  check('the customer view has no Work or team Customer tab, and no My work strip', !(await p.$('.sd-tabs [data-v="work"]')) && !(await p.$('.sd-mywork')));
  await p.click('[data-act="custPreviewExit"]').catch(() => {}); await settle(1500); } else check('Preview as customer is available', false);
// Admin
await enter(); await p.click('[data-act="openAdmin"]'); await settle(3500);
const atabs = await p.evaluate(() => [...document.querySelectorAll('.adm-main [data-act="admTab"]')].map(x => [x.getAttribute('data-v'), x.textContent.trim()]).filter((t, i, a) => a.findIndex(y => y[0] === t[0]) === i));
check('Admin tabs: Portfolio, Stages, Delivery, Risk & exceptions, People, Customers, Reports', JSON.stringify(atabs.map(t => t[1])) === JSON.stringify(['Portfolio', 'Stages', 'Delivery', 'Risk & exceptions', 'People', 'Customers', 'Reports']), atabs.map(t => t[1]).join(', '));
for (const [v, name] of atabs) { errs.length = 0; await p.click(`.adm-main [data-act="admTab"][data-v="${v}"]`); await settle(1500); const on = await p.evaluate(v => !!document.querySelector(`.adm-main [data-act="admTab"][data-v="${v}"][aria-selected="true"], .adm-main [data-act="admTab"][data-v="${v}"].active, .adm-main [data-act="admTab"][data-v="${v}"].on`), v); check(`[admin] ${name} opens, marked active, no page error`, on && !errs.length, errs.join(' | ')); }
const subs = await p.evaluate(() => document.querySelectorAll('[data-act="admDash"]').length); let ok = subs > 0; for (let i = 0; i < subs; i++) { await p.evaluate(i => document.querySelectorAll('[data-act="admDash"]')[i].click(), i); await settle(1200); ok = ok && await p.evaluate(i => document.querySelectorAll('[data-act="admDash"]')[i].classList.contains('on'), i); }
check('the older Admin report tabs switch (' + subs + ')', ok);
await p.click('.adm-main [data-act="admTab"][data-v="overview"]'); await settle(1500);
const t0 = await p.evaluate(() => (document.querySelector('.adx-stats > *') || {}).textContent || '');
await p.evaluate(() => { const h = FWBViews.range.hooks.adm; h.state().period = '7'; h.change(); }); await settle(2000);
const t1 = await p.evaluate(() => (document.querySelector('.adx-stats > *') || {}).textContent || ''); const ch = await p.evaluate(() => [...document.querySelectorAll('.dk-chip')].map(x => x.textContent.trim()));
check('the Admin period changes the figures and shows as a chip', t0 !== t1 && ch.some(c => /^Period/.test(c)), t0.replace(/\s+/g, ' ') + ' -> ' + t1.replace(/\s+/g, ' '));
await p.evaluate(() => FWBViews.ACT.dkAReset()); await settle(1500); check('Reset filters clears the Admin period', (await p.evaluate(() => FWBViews.range.hooks.adm.state().period)) === 'all');
await p.evaluate(() => FWBViews.range.hooks.adm.pdf()); await settle(700); await p.check('input[name="dpWhich"][value="all"]');
const pdf2 = await download(() => p.click('[data-act="dpGo"]')); check('the Admin dashboard PDF (all tabs) is a real PDF', fs.readFileSync(pdf2).slice(0, 5).toString() === '%PDF-' && fs.statSync(pdf2).size > 20000, fs.statSync(pdf2).size + ' bytes');
await b.close(); console.log(bad ? bad + ' failed' : 'all dashboard checks passed'); process.exitCode = bad ? 1 : 0;
