// Tabs & Layouts in a browser against the local preview (one web layout): hiding a tab,
// a new tab group, moving a tab into it by drag and drop, reordering groups, who sees a tab in the menu (a viewer does not), hiding a tab
// never removes access to the page itself (the server decides), the layout survives a reload, and Reset restores the standard menu.
// Usage: node tests/ui/tabs-layouts-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Layouts test', customer: 'Acme' }) }); return (await r.json()).project.id; });
await p.evaluate(async pid => { await fetch(`/api/fn/api/projects/${pid}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'viewer.person@facilio.com', role: 'viewer' }) }); }, pid);
await p.goto(BASE + `/#/p/${pid}/workspace`); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(600);
const menu = () => p.evaluate(() => [...document.querySelectorAll('.sidebar .sb-item')].map(x => x.getAttribute('data-view')));
const drag = async (src, dst) => { await p.locator(dst).scrollIntoViewIfNeeded(); await p.locator(src).scrollIntoViewIfNeeded(); const a = await p.locator(src).boundingBox(), t = await p.locator(dst).boundingBox(); await p.mouse.move(a.x + 30, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 50, a.y + a.height / 2 + 8, { steps: 5 }); await p.mouse.move(t.x + 40, t.y + t.height / 2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(500); };
const navIds = (o) => p.evaluate(o => window.FWBViews.wsApply(window.FWBViews.navBase(), o).flatMap(g => g.items.map(i => i[0])), o);
check('menu item is called Tabs & Layouts', /Tabs & Layouts/.test(await p.textContent('.sidebar')));
check('one web layout, no Tabs / Web / Mobile switch', !(await p.$('.tl-modes')));
check('web view lists groups with search, and the tabs of the selected group', (await p.$$('.tl-g')).length > 5 && (await p.$$('.tl-row')).length > 0);
await p.fill('#wsQ', 'hyper'); await p.waitForTimeout(300); const found = await p.$$eval('.tl-g .tl-gn', e => e.map(x => x.textContent)); check('group search finds groups by tab name', found.length >= 1 && found.length < 6, found.join(', ')); await p.fill('#wsQ', ''); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/tabs-layouts-web.png` });
// hide on the web
await p.click('.tl-g[data-g="Project"]'); await p.waitForTimeout(200); await p.click('.tl-row[data-wsid="dashreport"] .switch'); await p.waitForTimeout(500);
check('a tab hidden on the web leaves the menu', !(await menu()).includes('dashreport'));
// new group and drag a tab into it
await p.click('[data-act="wsNewGroup"]'); await p.fill('#wsg_n', 'Customer reporting'); await p.click('[data-act="wsNewGroupGo"]'); await p.waitForTimeout(400);
check('a new empty tab group appears and is selected', await p.$eval('.tl-g.on .tl-gn', e => e.textContent) === 'Customer reporting');
await p.click('.tl-g[data-g="7. FTR & KPI Documentation"]'); await p.waitForTimeout(200);
await drag('.tl-row[data-wsid="reports"] .tl-rn', '.tl-g[data-g="Customer reporting"]');
let grps = await p.evaluate(() => window.FWBViews.navFor().map(g => [g.g, g.items.map(i => i[0])]));
check('dragging a tab onto a group moves it there', (grps.find(g => g[0] === 'Customer reporting') || [0, []])[1].includes('reports'), JSON.stringify(grps.find(g => g[0] === 'Customer reporting')));
await p.evaluate(() => window.scrollTo(0, 0)); await drag('.tl-g[data-g="Project"] .tl-gn', '.tl-g[data-g="2. Workshops"] .tl-gn'); let order = await p.evaluate(() => window.FWBViews.navFor().map(g => g.g));
check('dragging a group onto another reorders them', order.indexOf('1. Kick-off & Discovery') < order.indexOf('Project'), order.slice(0, 3).join(' > '));
await p.click('.tl-g[data-g="Customer reporting"]'); await p.waitForTimeout(200); const at0 = order.indexOf('Customer reporting'); await p.click('[data-act="wsGroupStep"][data-d="-1"]'); await p.waitForTimeout(400); order = await p.evaluate(() => window.FWBViews.navFor().map(g => g.g));
check('Move group up (keyboard-friendly) moves the group one place', order.indexOf('Customer reporting') === at0 - 1, at0 + ' -> ' + order.indexOf('Customer reporting'));
// who sees it
await p.click('.tl-g[data-g="1. Kick-off & Discovery"]'); await p.waitForTimeout(200); await p.selectOption('[data-change="wsWho"][data-id="governance"]', 'owner'); await p.waitForTimeout(500);
check('owner-only tab: still in the owner menu, not in a viewer menu', (await navIds({ role: 'owner' })).includes('governance') && !(await navIds({ role: 'viewer' })).includes('governance'));
// reload: the layout persists
await p.waitForTimeout(1500); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(800);
check('the layout survives a reload', !(await menu()).includes('dashreport') && (await p.evaluate(() => window.FWBViews.navFor().some(g => g.g === 'Customer reporting'))));
// the viewer: menu without the owner-only tab, but the page itself still opens (the menu is not access control)
const v = await b.newContext({ viewport: { width: 1440, height: 900 } }); await v.addCookies([{ name: 'dev_user', value: 'viewer.person@facilio.com', url: BASE }]); const vp = await v.newPage(); vp.on('pageerror', e => errs.push(e.message));
await vp.goto(BASE + `/#/p/${pid}/overview`); await vp.reload(); await vp.waitForSelector('.sidebar', { timeout: 15000 }); await vp.waitForTimeout(800);
const vmenu = await vp.evaluate(() => [...document.querySelectorAll('.sidebar .sb-item')].map(x => x.getAttribute('data-view')));
check('a viewer does not see the owner-only tab in the menu', !vmenu.includes('governance') && vmenu.length > 5);
await vp.evaluate(() => window.FWBViews.go('governance')); await vp.waitForTimeout(800); check('the page itself still opens read-only for the viewer (server rules decide access)', /Governance/.test(await vp.textContent('.page-header h1').catch(() => '')));
const ph = await v.newPage({ viewport: { width: 390, height: 844 } }); await ph.goto(BASE + `/#/p/${pid}/overview`); await ph.reload(); await ph.waitForTimeout(1500); await v.close();
// reset
await p.click('[data-act="wsReset"]'); await p.click('.dialog .btn.danger, [role="dialog"] .btn.danger, .confirm .btn.danger, .dialog .btn.primary').catch(() => { }); await p.waitForTimeout(600);
check('Reset restores the standard menu', (await menu()).includes('dashreport') && !(await p.evaluate(() => window.FWBViews.navFor().some(g => g.g === 'Customer reporting'))));
const pp = await b.newPage({ viewport: { width: 390, height: 844 } }); await pp.goto(BASE + `/#/p/${pid}/workspace`); await pp.reload(); await pp.waitForSelector('.tl-grid', { timeout: 15000 }).catch(() => { });
check('phone: no sideways scrolling on Tabs & Layouts', await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1)); await pp.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
