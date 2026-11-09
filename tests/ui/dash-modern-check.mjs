// The modern dashboards (9 Nov 2026) in a real browser: the team overview, the customer's preview of it, and the admin dashboard share one look (soft canvas, KPI tiles with an icon, donut legends with
// shares, a stacked-column chart and a gauge). Figures come from saved records only. Usage: node tests/ui/dash-modern-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
await p.goto(BASE + `/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForSelector('.mdb', { timeout: 20000 }); await p.addStyleTag({ content: '*{animation:none !important;transition:none !important}' }); await p.waitForTimeout(800);
const team = await p.evaluate(() => { const g = s => document.querySelectorAll(s).length, m = document.querySelector('.mdb'), cs = m && getComputedStyle(m); return { canvas: cs && cs.backgroundColor, radius: cs && cs.borderTopLeftRadius, icons: g('.mdb .sd-ki svg'), kpis: g('.mdb .sd-kpi'), lines: g('.mdb .sd-ln svg polyline'), gantt: g('.mdb .sd-gr'), spark: g('.mdb .sd-ksp rect'), gauge: g('.mdb .sd-gz svg'), pct: g('.mdb .sd-lg li em'), widgets: [...document.querySelectorAll('.mdb .sd-w h3')].map(h => h.textContent), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
check('the team overview sits on a soft canvas (not white) with rounded corners', /^rgb\(24[0-9], 24[0-9], 25[0-9]\)$/.test(team.canvas || '') && parseFloat(team.radius) >= 16, team.canvas + ' ' + team.radius);
check('every KPI tile has an icon', team.kpis >= 3 && team.icons === team.kpis, team.icons + ' icons on ' + team.kpis + ' tiles');
check('the team overview has the plan-vs-actual line, the plan timeline, the activity lines, the workload bars and the gauge', team.lines >= 2 && team.gantt >= 3 && team.gauge >= 1 && ['Plan vs actual', 'Plan timeline', 'Activity', 'Workload', 'Test pass rate'].every(w => team.widgets.includes(w)), 'lines ' + team.lines + ', gantt rows ' + team.gantt + ': ' + team.widgets.slice(0, 5).join(' | '));
check('five KPI tiles, two of them with a small trend', team.kpis === 5 && team.spark >= 10, team.kpis + ' tiles, ' + team.spark + ' trend bars');
check('donut and bar legends show each part\'s share', team.pct >= 3, team.pct + ' shares');
check('no sideways scrolling', !team.overflow);
// the customer sees the same look without the internal work chart
await p.locator('[data-act]').filter({ hasText: /Preview as customer/ }).first().click().catch(() => { }); await p.waitForTimeout(2500); await p.evaluate(() => window.FWBViews.go('projdash')); await p.waitForSelector('.mdb', { timeout: 15000 }).catch(() => { }); await p.addStyleTag({ content: '*{animation:none !important}' }); await p.waitForTimeout(600);
const cust = await p.evaluate(() => ({ mdb: document.querySelectorAll('.mdb').length, icons: document.querySelectorAll('.mdb .sd-ki svg').length, widgets: [...document.querySelectorAll('.mdb .sd-w h3')].map(h => h.textContent) }));
check('the customer\'s overview uses the same look without the internal timeline, activity and workload', cust.mdb >= 1 && cust.icons >= 3 && !cust.widgets.includes('Activity') && !cust.widgets.includes('Plan timeline') && !cust.widgets.includes('Workload') && cust.widgets.includes('Test pass rate') && cust.widgets.includes('Plan vs actual'), cust.widgets.slice(0, 4).join(' | '));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]'); await p.waitForTimeout(2500);
await p.click('[data-act="runEnter"]').catch(() => { }); await p.waitForTimeout(3500); await p.locator('[data-act]').filter({ hasText: /^Admin$/ }).first().click().catch(() => { }); await p.waitForTimeout(3500); await p.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });
const adm = await p.evaluate(() => { const a = document.querySelector('.adx'); return { has: !!a, canvas: a && getComputedStyle(a).backgroundColor, kpis: document.querySelectorAll('.adx .sd-kpi').length }; });
check('the admin dashboard sits on the same canvas', adm.has && /^rgb\(24[0-9], 24[0-9], 25[0-9]\)$/.test(adm.canvas || ''), JSON.stringify(adm));
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
