// Switched-off parts of the app (src/features.js) in a real browser: with the org package switch off, none of its pages can be reached from the menu, the page tabs, a direct link or a button,
// and the Team Guide does not mention them; the other pages around them still work. With the switch on, the pages are back.
// Usage: node tests/ui/hidden-features-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
await p.goto(BASE + `/?nointro#/p/${pid}/solution`); await p.reload(); await p.waitForSelector('.sidebar', { timeout: 20000 }); await p.waitForTimeout(1500);
const menu = () => p.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items.map(i => i[0])));
const go = v => p.evaluate(x => { location.hash = '#/p/' + location.hash.split('/')[2] + '/' + x; }, v);
check('the switch is off by default', await p.evaluate(() => window.FWBViews.FEATURES.orgPackage === false));
const ids = await menu(); check('the menu has no configuration or org package entry', !ids.includes('cfginputs') && !ids.includes('orgpkg') && !ids.includes('pkgan') && ids.includes('solution') && ids.includes('brd'), ids.filter(x => /cfg|org|pkg/.test(x)).join(','));
check('no menu text mentions the org package', !/org package/i.test(await p.evaluate(() => document.querySelector('.sidebar').innerText)));
for (const v of ['orgpkg', 'cfginputs', 'pkgan']) { await go(v); await p.waitForTimeout(900); const h1 = await p.evaluate(() => (document.querySelector('.page-header h1') || {}).textContent || ''); check('a direct link to ' + v + ' does not open the hidden page', !/Org Package Export|Configuration Hub|Package analysis/i.test(h1), h1); }
await go('notifications'); await p.waitForSelector('.page-header', { timeout: 10000 }); await p.waitForTimeout(600);
check('the Notifications page has no button to the org package export', (await p.locator('[data-view="orgpkg"]').count()) === 0 && !/Org Package Export/.test(await p.evaluate(() => document.body.innerText)));
await go('settings'); await p.waitForSelector('.st-sec', { timeout: 10000 }); await p.waitForTimeout(800);
check('Project settings shows no org package folder or package wording', !/Org package folder|org package/i.test(await p.evaluate(() => document.body.innerText)));
await go('teamhelp'); await p.waitForTimeout(1200);
check('the Team Guide does not list the configuration and org package page', !/Configuration & org package|Link the org package folder/.test(await p.evaluate(() => document.body.innerText)));
await go('handover'); await p.waitForTimeout(1500);
check('Handover has no Solution and configuration tab and no org package helper', !/Solution and configuration|Org package analysis|org package/i.test(await p.evaluate(() => document.body.innerText)));
await go('guidebuilder'); await p.waitForTimeout(1500);
check('the User Guide Builder has no Update from configuration tab', !/Update from configuration/.test(await p.evaluate(() => document.body.innerText)));
check('no page errors while hidden', errs.length === 0, errs.slice(0, 2).join(' | '));
// switched on: the pages are back (for the person who unhides them)
await p.evaluate(() => { window.FWBViews.FEATURES.orgPackage = true; });
const on = await menu(); check('with the switch on, the configuration and org package page is back in the menu', on.includes('cfginputs'));
await go('orgpkg'); await p.waitForTimeout(1500);
check('with the switch on, the org package export opens', /Org Package Export|Configuration/i.test(await p.evaluate(() => (document.querySelector('.page-header h1') || {}).textContent || '')));
await go('handover'); await p.waitForTimeout(1500);
check('with the switch on, Handover has its Solution and configuration tab again', /Solution and configuration/.test(await p.evaluate(() => document.body.innerText)));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
