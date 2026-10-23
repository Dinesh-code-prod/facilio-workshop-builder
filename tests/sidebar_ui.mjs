// Sidebar: exact Project order, single Contract entry, scroll stability, parent/child highlight, deep links, group toggle.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done, projectId } = await setup(BASE);
const items = () => page.$$eval('.sidebar .sb-group:nth-of-type(2) .sb-item', x => x.map(i => i.textContent.trim()));
const grp = () => page.$$eval('.sidebar .sb-group', gs => gs.map(g => ({ t: g.querySelector('.sb-title').textContent.trim(), items: [...g.querySelectorAll('.sb-item')].map(i => i.textContent.trim()) })));
let g = await grp(); const proj = g.find(x => x.t === 'Project');
ok(JSON.stringify(proj.items) === JSON.stringify(['Project Overview', 'Contract', 'Kick-off Deck', 'Project Plan', 'Plan Timeline', 'Customer User Guide', 'Data Onboarding', 'Dashboard Gallery']), 'Project order is exact: ' + proj.items.join(' | '));
ok(['Dashboard Report', 'Project', 'Delivery'].every(t => g.some(x => x.t === t)), 'Dashboard Report and Delivery kept');
const all = g.flatMap(x => x.items); ok(new Set(all).size === all.length, 'no duplicate sidebar entries');
ok(!all.some(l => /Session Planner|Know Your Contract|^Scope$/.test(l)), 'no top-level Planner / Know Your Contract / Scope');
// colours
const col = (sel, p) => page.$eval(sel, (e, p) => getComputedStyle(e)[p], p);
await nav(page, 'overview');
ok(await col('.sb-group.has-active > .sb-title', 'backgroundColor') === 'rgb(10, 95, 232)', 'parent is strong blue'); ok(await col('.sb-group.has-active > .sb-title', 'color') === 'rgb(255, 255, 255)', 'parent text is white');
ok(await col('.sb-item.active', 'backgroundColor') === 'rgb(220, 235, 255)', 'active child is light blue'); ok(await col('.sb-item.active', 'color') === 'rgb(10, 95, 232)', 'active child text is blue');
ok((await page.$$('.sb-item.active')).length === 1, 'only one item highlighted');
ok(await page.$eval('.sb-group:not(.has-active) .sb-item', e => getComputedStyle(e).backgroundColor) !== 'rgb(220, 235, 255)', 'inactive items are neutral');
// scroll stability
await page.setViewportSize({ width: 1280, height: 380 });
const sc = await page.$eval('.sidebar', e => { e.scrollTop = 150; return [e.scrollTop, e.scrollHeight > e.clientHeight]; }); ok(sc[1] && sc[0] > 0, 'sidebar scrolls on a short window');
for (const v of ['kickoff', 'plan', 'timeline', 'msaflow', 'guide']) { await page.evaluate(() => { document.querySelector('.sidebar').scrollTop = 150; }); const t0 = await page.$eval('.sidebar', e => e.scrollTop); const el = await page.$(`.sidebar [data-view=${v}]`); await el.click({ force: true, noWaitAfter: true }).catch(() => { }); await page.waitForTimeout(500); const t1 = await page.$eval('.sidebar', e => e.scrollTop); ok(Math.abs(t1 - t0) <= 1 && await page.$eval(`.sidebar [data-view=${v}]`, e => e.classList.contains('active')), `scroll stays at ${t0} after opening ${v} (now ${t1})`); }
// main scrolls independently
await page.$eval('.main', e => { e.scrollTop = 80; }); ok(await page.$eval('.main', e => getComputedStyle(e).overflowY) !== 'visible', 'main is its own scroll container');
await page.setViewportSize({ width: 1280, height: 800 });
// Contract: active, deep links, refresh
await nav(page, 'msaflow'); ok(await page.$eval('.sidebar [data-view=msaflow]', e => e.classList.contains('active')), 'Contract highlighted');
for (const v of ['planner', 'scope', 'contract']) { await page.evaluate(x => window.FWBViews.go(x), v); await page.waitForTimeout(300); ok(await page.$eval('.sidebar [data-view=msaflow]', e => e.classList.contains('active')) && (await page.$$('.sb-item.active')).length === 1, `old route "${v}" lands on Contract with one highlight`); }
await page.goto(BASE + '#/p/' + projectId + '/planner'); await page.reload(); await page.waitForSelector('.sidebar .sb-item', { timeout: 15000 }); await page.waitForTimeout(800);
ok(await page.$eval('.sidebar [data-view=msaflow]', e => e.classList.contains('active')), 'after refresh on a planner deep link, Contract is highlighted and its group open');
ok(await page.$eval('.sb-group.has-active', e => e.classList.contains('open')), 'parent group expanded');
// toggle: a group without the active page collapses and reopens; the active group cannot be collapsed
await page.click('.sb-group:not(.has-active) > .sb-title'); await page.waitForTimeout(200); ok((await page.$$('.sb-group.open')).length < (await page.$$('.sb-group')).length, 'clicking another group collapses it'); const url1 = await page.evaluate(() => location.hash);
await page.click('.sb-group.has-active > .sb-title'); await page.waitForTimeout(200); ok(await page.$eval('.sb-group.has-active', e => e.classList.contains('open')) && await page.evaluate(() => location.hash) === url1, 'active group stays open and clicking the title does not navigate');
await done('sidebar_ui');
