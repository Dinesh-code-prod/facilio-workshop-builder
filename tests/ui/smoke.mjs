// Functional regression after the UI changes: workspace switch, phone menu, keyboard activation of rows,
// a form that validates, saves and persists, drawer Cancel/Close, and sign out. Usage: node tests/ui/smoke.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const res = [];
const check = (name, pass, detail) => { res.push({ name, pass }); console.log((pass ? 'ok   ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); };
const browser = await browser0(); async function browser0() { return chromium.launch(); }
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
const toast = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '));
await page.goto(BASE + '/'); await page.waitForSelector('[data-act]'); await page.getByRole('button', { name: /open workspace/i }).click(); await page.waitForSelector('.projects-page');
// workspace switch
await page.click('.ws-switch a:has-text("Admin")'); await page.waitForSelector('.adm-nav .adm-ni'); check('switch to Admin opens the admin console', true);
check('Admin is marked current', await page.$eval('.ws-switch a[aria-current]', e => e.textContent.trim()) === 'Admin');
await page.click('.ws-switch a:has-text("Projects")'); await page.waitForSelector('.projects-page'); check('switch back to Projects', true);
// open a project with the keyboard (project card is a clickable non-button)
const card = await page.$('.proj-card[data-act], .proj-card [data-act="openProject"]'); if (card) { await card.focus(); await page.keyboard.press('Enter'); } await page.waitForSelector('main.main', { timeout: 15000 }); check('project opens with Enter on its card', !!card);
check('workspace switch shows Projects as current inside a project', await page.$eval('.ws-switch a[aria-current]', e => e.textContent.trim()) === 'Projects');
// table rows: focusable and open with Enter
await page.evaluate(() => window.FWBViews.go('flow')); await page.waitForTimeout(900);
const rowFocusable = await page.evaluate(() => { const r = document.querySelector('tr[data-act]'); return r ? r.tabIndex : -9; }); check('clickable table rows are keyboard-focusable', rowFocusable === 0, 'tabIndex ' + rowFocusable);
// form: validation, Save/Cancel sizes, persistence
await page.evaluate(() => window.FWBViews.go('resources')); await page.waitForTimeout(900); await page.locator('.tabs > *', { hasText: /Notes/ }).first().click(); await page.waitForTimeout(400);
await page.locator('.page .btn', { hasText: /Add note|New note/ }).first().click(); await page.waitForSelector('#drawer .drawer');
const foot = await page.$$eval('#drawer .drawer-f .btn', bs => bs.map(b => Math.round(b.getBoundingClientRect().height))); check('drawer footer buttons share one height', new Set(foot).size === 1, foot.join('/'));
await page.click('#drawer .drawer-f .btn.primary'); await page.waitForTimeout(500); check('empty title is refused and the drawer stays open', !!(await page.$('#drawer .drawer')), await toast());
const title = 'Smoke note ' + Date.now(); await page.fill('#drawer input[type=text], #drawer input:not([type])', title); await page.click('#drawer .drawer-f .btn.primary'); await page.waitForTimeout(900);
check('note saves and the drawer closes', !(await page.$('#drawer .drawer')));
await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(900); await page.evaluate(() => window.FWBViews.go('resources')); await page.waitForTimeout(900); await page.locator('.tabs > *', { hasText: /Notes/ }).first().click(); await page.waitForTimeout(500);
check('note is still there after a reload', (await page.content()).includes(title));
await page.locator('.page .btn', { hasText: /Add note|New note/ }).first().click(); await page.waitForSelector('#drawer .drawer'); await page.click('#drawer .drawer-f .btn:not(.primary)'); await page.waitForTimeout(500); check('Cancel closes the drawer', !(await page.$('#drawer .drawer')));
await page.locator('.page .btn', { hasText: /Add note|New note/ }).first().click(); await page.waitForSelector('#drawer .drawer'); await page.click('#drawer .drawer-h .btn'); await page.waitForTimeout(500); check('Close (X) closes the drawer', !(await page.$('#drawer .drawer')));
// phone: menu opens, navigates, closes
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
check('phone: project menu button visible', await page.isVisible('.nav-menu')); await page.click('.nav-menu'); await page.waitForTimeout(300);
check('phone: menu opens', await page.isVisible('.sidebar .sb-item')); await page.locator('.sidebar .sb-item', { hasText: 'Governance' }).first().click(); await page.waitForTimeout(900);
check('phone: menu item navigates and the menu closes', (await page.$eval('.page-header h1', e => e.textContent)).includes('Governance') && !(await page.evaluate(() => document.body.classList.contains('nav-open'))));
check('phone: no sideways scrolling', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await page.setViewportSize({ width: 1440, height: 900 });
// sign out from the account menu
await page.click('.navbar .avatar'); await page.waitForSelector('#userPop'); const items = await page.$$eval('#userPop .um-i', e => e.map(x => x.textContent.trim())); check('account menu lists Sign out', items.includes('Sign out'), items.join(', '));
await page.click('#userPop .um-out'); await page.waitForTimeout(900); check('Sign out returns to the sign-in page', !!(await page.$('.auth')) && /left the workspace/i.test(await page.content()));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`\n${res.filter(r => r.pass).length}/${res.length} checks passed`); await browser.close();
