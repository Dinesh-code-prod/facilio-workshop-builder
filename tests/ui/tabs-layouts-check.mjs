// Tabs & Layouts in a browser against the local preview, modelled on Facilio Setup > Tabs and Layout:
// the standard menu follows the delivery workflow (forms, state flows, whiteboard, roles and the BRD draft sit together),
// any group can be renamed, given an icon, reordered or deleted (its tabs move, never vanish), tabs are edited in one dialog
// (label, group, shown, who sees it), layouts saved with the old group names are migrated, hiding a tab never removes access
// to the page itself (the server decides), the layout survives a reload, and Reset restores the standard menu.
// Usage: node tests/ui/tabs-layouts-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const newProject = name => p.evaluate(async name => { const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, customer: 'Acme' }) }); return (await r.json()).project.id; }, name);
const pid = await newProject('Layouts test');
await p.evaluate(async pid => { await fetch(`/api/fn/api/projects/${pid}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'viewer.person@facilio.com', role: 'viewer' }) }); }, pid);
await p.goto(BASE + `/#/p/${pid}/workspace`); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(600);
const menu = () => p.evaluate(() => [...document.querySelectorAll('.sidebar .sb-item')].map(x => x.getAttribute('data-view')));
const groups = () => p.evaluate(() => window.FWBViews.navFor().map(g => [g.g, g.items.map(i => i[0])]));
const allIds = () => p.evaluate(() => [...new Set(window.FWBViews.wsApply(window.FWBViews.navBase(), { role: 'owner' }).flatMap(g => g.items.map(i => i[0])).concat(window.FWB.doc('workspace').hidden || []))].sort().join(',')); // shown plus deliberately hidden
const drag = async (src, dst) => { await p.locator(dst).scrollIntoViewIfNeeded(); await p.locator(src).scrollIntoViewIfNeeded(); const a = await p.locator(src).boundingBox(), t = await p.locator(dst).boundingBox(); await p.mouse.move(a.x + 30, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 50, a.y + a.height / 2 + 8, { steps: 5 }); await p.mouse.move(t.x + 40, t.y + t.height / 2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(500); };
const navIds = (o) => p.evaluate(o => window.FWBViews.wsApply(window.FWBViews.navBase(), o).flatMap(g => g.items.map(i => i[0])), o);
const pick = async g => { await p.click(`.tl-g[data-g="${g}"] .tl-gsel`); await p.waitForTimeout(250); };
const allBefore = await allIds();

check('menu item is called Tabs & Layouts', /Tabs & Layouts/.test(await p.textContent('.sidebar')));
let grps = await groups(); const brd = grps.find(g => g[0] === '3. Solution Design & Configuration');
check('BRD, forms, state flows, whiteboard, configuration, roles and traceability sit under one parent group', brd && ['brd', 'modules', 'flow', 'whiteboard', 'cfginputs', 'roles', 'dashboards'].every(v => brd[1].includes(v)) && brd[1].includes('trace'), JSON.stringify(brd));
const subs = await p.evaluate(() => { const g = window.FWBViews.navFor().find(x => x.g === '3. Solution Design & Configuration'); return g.items.map(i => i[3] || ''); });
check('the parent group has sub-headings in order: Requirements & Design, Configuration & Access, Validation & Traceability', [...new Set(subs)].join(' | ') === 'Requirements & Design | Configuration & Access | Validation & Traceability', [...new Set(subs)].join(' | '));
check('the side menu draws the sub-headings under the parent group', (await p.$$eval('.sidebar .sb-sub', e => e.map(x => x.textContent))).join('|').includes('Configuration & Access'));
check('groups follow the delivery order', grps.map(g => g[0]).slice(0, 6).join(' > ') === 'Project > 1. Kick-off & Planning > 2. Workshops & Requirements > 3. Solution Design & Configuration > 4. UAT & Go-Live > 5. Hypercare & Handover', grps.map(g => g[0]).slice(0, 6).join(' > '));
check('the side menu draws a section heading above each part', (await p.$$eval('.sidebar .sb-sec', e => e.map(x => x.textContent))).length >= 4);
check('groups list with search, and the tabs of the selected group as cards', (await p.$$('.tl-g')).length > 8 && (await p.$$('.tl-row')).length > 0);
await p.fill('#wsQ', 'hyper'); await p.waitForTimeout(300); const found = await p.$$eval('.tl-g .tl-gn', e => e.map(x => x.textContent)); check('group search finds groups by tab name', found.length >= 1 && found.length < 6, found.join(', ')); await p.fill('#wsQ', ''); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/tabs-layouts-web.png` });

// hide on the web
await pick('Project'); check('tab actions are hidden until the card is hovered (Facilio style)', await p.$eval('.tl-row[data-wsid="dashreport"] .tl-rt', e => getComputedStyle(e).opacity) === '0');
await p.hover('.tl-row[data-wsid="dashreport"]'); await p.waitForTimeout(250); check('hovering a card shows edit and remove', await p.$eval('.tl-row[data-wsid="dashreport"] .tl-rt', e => getComputedStyle(e).opacity) === '1' && !!(await p.$('.tl-row[data-wsid="dashreport"] [data-act="wsHideTab"]')));
await p.click('.tl-row[data-wsid="dashreport"] [data-act="wsHideTab"]'); await p.waitForTimeout(500);
check('remove takes the tab out of the menu but keeps it listed (greyed) so it can be shown again', !(await menu()).includes('dashreport') && !!(await p.$('.tl-row.off[data-wsid="dashreport"] [data-act="wsShowTab"]')));

// new group with a name and an icon
await p.click('[data-act="wsNewGroup"]'); await p.fill('#wsg_n', 'Customer reporting'); await p.click('.tl-ic[data-k="l:mail"]'); await p.screenshot({ path: `${OUT}/tabs-layouts-new-group.png` }); await p.click('[data-act="wsGroupSave"]'); await p.waitForTimeout(400);
check('a new empty tab group appears and is selected', await p.$eval('.tl-g.on .tl-gn', e => e.textContent) === 'Customer reporting');
check('the chosen icon is kept for the new group', await p.evaluate(() => window.FWB.doc('workspace').gi['Customer reporting'] === 'l:mail'));
await pick('5. Hypercare & Handover');
await drag('.tl-row[data-wsid="reports"] .tl-rn', '.tl-g[data-g="Customer reporting"]');
grps = await groups();
check('dragging a tab onto a group moves it there', (grps.find(g => g[0] === 'Customer reporting') || [0, []])[1].includes('reports'), JSON.stringify(grps.find(g => g[0] === 'Customer reporting')));
await p.evaluate(() => window.scrollTo(0, 0)); await drag('.tl-g[data-g="Project"] .tl-gn', '.tl-g[data-g="2. Workshops & Requirements"] .tl-gn'); let order = await p.evaluate(() => window.FWBViews.navFor().map(g => g.g));
check('dragging a group onto another reorders them', order.indexOf('1. Kick-off & Planning') < order.indexOf('Project'), order.slice(0, 3).join(' > '));
await pick('Customer reporting'); const at0 = order.indexOf('Customer reporting'); await p.click('[data-act="wsGroupStep"][data-d="-1"]'); await p.waitForTimeout(400); order = await p.evaluate(() => window.FWBViews.navFor().map(g => g.g));
check('Move group up (keyboard-friendly) moves the group one place', order.indexOf('Customer reporting') === at0 - 1, at0 + ' -> ' + order.indexOf('Customer reporting'));

// rename a standard group and change its icon
await pick('3. Solution Design & Configuration'); await p.click('.tl-mh [data-act="wsGroupEdit"]'); await p.fill('#wsg_n', 'Design & BRD'); await p.click('.tl-ic[data-k="l:doc"]'); await p.click('[data-act="wsGroupSave"]'); await p.waitForTimeout(500);
check('a standard group can be renamed; the side menu shows the new heading', /Design & BRD/.test(await p.textContent('.sidebar')) && !/3\. Solution Design & Configuration/.test(await p.textContent('.sidebar')));
check('a renamed group keeps its tabs, sub-headings and its new icon', await p.evaluate(() => { const g = window.FWBViews.navFor().find(x => x.g === 'Design & BRD'); return !!g && g.items.length >= 9 && g.ik === 'l:doc' && g.items.some(i => i[3] === 'Configuration & Access'); }));
// sub-heading of one tab changed in the edit dialog
await p.click('.tl-row[data-wsid="pkgan"] [data-act="wsRename"]', { force: true }); await p.waitForTimeout(250); await p.fill('#ws_sub', 'Validation & Traceability'); await p.click('[data-act="wsRenameGo"]'); await p.waitForTimeout(400);
check('edit tab: changing its sub-heading moves it under that heading', await p.evaluate(() => { const g = window.FWBViews.navFor().find(x => x.g === 'Design & BRD'); const i = g.items.findIndex(t => t[0] === 'pkgan'); return g.items[i][3] === 'Validation & Traceability' && g.items[i - 1][3] === 'Validation & Traceability' || g.items[i + 1] && g.items[i + 1][3] === 'Validation & Traceability'; }));
await p.screenshot({ path: `${OUT}/tabs-layouts-renamed.png` });

// edit a tab in one dialog: label, group and who sees it
await pick('1. Kick-off & Planning'); await p.click('.tl-row[data-wsid="governance"] [data-act="wsRename"]'); await p.waitForTimeout(250);
await p.fill('#ws_l', 'Governance'); await p.selectOption('#ws_w', 'owner'); await p.selectOption('#ws_g', 'Customer reporting'); await p.click('[data-act="wsRenameGo"]'); await p.waitForTimeout(500);
grps = await groups(); const cr = grps.find(g => g[0] === 'Customer reporting');
check('edit tab: renamed and moved to the chosen group', cr && cr[1].includes('governance') && await p.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items).find(i => i[0] === 'governance')[1] === 'Governance'));
check('owner-only tab: still in the owner menu, not in a viewer menu', (await navIds({ role: 'owner' })).includes('governance') && !(await navIds({ role: 'viewer' })).includes('governance'));

// delete a standard group: its tabs move to the chosen group, nothing is lost
await pick('2. Workshops & Requirements'); await p.click('.tl-g[data-g="2. Workshops & Requirements"]'); await p.hover('.tl-g[data-g="2. Workshops & Requirements"]'); await p.click('.tl-g[data-g="2. Workshops & Requirements"] [data-act="wsGroupDel"]'); await p.waitForTimeout(250);
await p.selectOption('#wsg_to', '1. Kick-off & Planning'); await p.click('[data-act="wsGroupDelGo"]'); await p.waitForTimeout(500);
grps = await groups(); const ko = grps.find(g => g[0] === '1. Kick-off & Planning');
check('deleting a group removes it from the menu', !grps.some(g => g[0] === '2. Workshops & Requirements'));
check('its tabs moved to the chosen group', ko && ['transcripts', 'usecases', 'checks'].every(v => ko[1].includes(v)), JSON.stringify(ko));
check('no tab was lost by moving, renaming or deleting', (await allIds()) === allBefore);

// reload: the layout persists
await p.waitForTimeout(1500); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(800);
check('the layout survives a reload', !(await menu()).includes('dashreport') && (await p.evaluate(() => window.FWBViews.navFor().some(g => g.g === 'Customer reporting') && window.FWBViews.navFor().some(g => g.g === 'Design & BRD') && !window.FWBViews.navFor().some(g => g.g === '2. Workshops & Requirements'))));

// the viewer: menu without the owner-only tab, but the page itself still opens (the menu is not access control)
const v = await b.newContext({ viewport: { width: 1440, height: 900 } }); await v.addCookies([{ name: 'dev_user', value: 'viewer.person@facilio.com', url: BASE }]); const vp = await v.newPage(); vp.on('pageerror', e => errs.push(e.message));
await vp.goto(BASE + `/#/p/${pid}/overview`); await vp.reload(); await vp.waitForSelector('.sidebar', { timeout: 15000 }); await vp.waitForTimeout(800);
const vmenu = await vp.evaluate(() => [...document.querySelectorAll('.sidebar .sb-item')].map(x => x.getAttribute('data-view')));
check('a viewer does not see the owner-only tab in the menu', !vmenu.includes('governance') && vmenu.length > 5);
check('a viewer sees the renamed group but cannot edit the layout', /Design & BRD/.test(await vp.textContent('.sidebar')) && await vp.evaluate(async () => { window.FWBViews.go('workspace'); await new Promise(r => setTimeout(r, 600)); return !document.querySelector('[data-act="wsNewGroup"]') && !document.querySelector('[data-act="wsGroupDel"]'); }));
await vp.evaluate(() => window.FWBViews.go('governance')); await vp.waitForTimeout(800); check('the page itself still opens read-only for the viewer (server rules decide access)', /Governance/.test(await vp.textContent('.page-header h1').catch(() => '')));
await v.close();

// reset
await p.click('[data-act="wsReset"]'); await p.click('.dialog .btn.danger, [role="dialog"] .btn.danger, .confirm .btn.danger, .dialog .btn.primary').catch(() => { }); await p.waitForTimeout(600);
check('Reset restores the standard menu (deleted and renamed groups come back)', (await menu()).includes('dashreport') && (await p.evaluate(() => { const n = window.FWBViews.navFor().map(g => g.g); return !n.includes('Customer reporting') && n.includes('2. Workshops & Requirements') && n.includes('3. Solution Design & Configuration'); })));

// a layout saved with the group names used before the regrouping lands in the matching new groups
const pid2 = await newProject('Old layout');
await p.goto(BASE + `/#/p/${pid2}/workspace`); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(600);
await p.evaluate(() => { const w = window.FWB.doc('workspace'); Object.keys(w).forEach(k => delete w[k]); Object.assign(w, { hidden: ['kpi'], labels: { brd: 'BRD' }, move: { reports: '7. FTR & KPI Documentation', resources: 'Process & State Flows' }, order: { '2. Workshops': ['transcripts'], '3. Requirements': ['checks', 'usecases'] }, groupOrder: ['Project', '10. Hypercare', '1. Kick-off & Discovery'], groups: ['My extras'], custom: [{ id: 'p1', label: 'Escalations', group: '11. Support Handover & 12. Closure', body: '# Hi' }], mobile: { hidden: [], groupOrder: [] }, roles: {} }); window.FWB.changed('Old layout', '', { section: 'workspace' }); });
await p.waitForTimeout(1500); await p.reload(); await p.waitForSelector('.tl-grid'); await p.waitForTimeout(800);
grps = await groups(); const names = grps.map(g => g[0]); const gOf = id => (grps.find(g => g[1].includes(id)) || [''])[0];
check('old layout: no old group names remain', !names.some(n => /^(2\. Workshops|3\. Requirements|4\. BRD & Approvals|5\. Configuration & Implementation|7\. FTR|10\. Hypercare|Process & State Flows)$/.test(n)), names.join(' | '));
check('old layout: moved tabs land in the matching new groups', gOf('reports') === '4. UAT & Go-Live' && gOf('resources') === '3. Solution Design & Configuration' && gOf('cx_p1') === '5. Hypercare & Handover', [gOf('reports'), gOf('resources'), gOf('cx_p1')].join(', '));
check('old layout: saved group order and the order inside merged groups are kept', names.indexOf('5. Hypercare & Handover') < names.indexOf('1. Kick-off & Planning') && (grps.find(g => g[0] === '2. Workshops & Requirements') || [0, []])[1].slice(0, 3).join(',') === 'transcripts,checks,usecases', JSON.stringify(grps.find(g => g[0] === '2. Workshops & Requirements')));
check('old layout: labels, hidden tabs and an extra (empty) group are kept', !(await menu()).includes('kpi') && await p.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items).find(i => i[0] === 'brd')[1] === 'BRD') && !!(await p.$('.tl-g[data-g="My extras"]')));

const pp = await b.newPage({ viewport: { width: 390, height: 844 } }); await pp.goto(BASE + `/#/p/${pid}/workspace`); await pp.reload(); await pp.waitForSelector('.tl-grid', { timeout: 15000 }).catch(() => { });
check('phone: no sideways scrolling on Tabs & Layouts', await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1)); await pp.screenshot({ path: `${OUT}/tabs-layouts-phone.png` }); await pp.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
