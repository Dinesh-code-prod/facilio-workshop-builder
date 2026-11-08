// The sidebar and the top bar must not be torn down and redrawn when the user clicks a page or a button (the flicker, 8 Nov 2026): the same elements stay in the page,
// no sidebar element is removed while moving through pages, the open page is still marked, and the sidebar keeps its scroll.
// Usage: node tests/ui/sidebar-stable-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Sidebar stable', customer: 'S' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForSelector('.sidebar .sb-item', { timeout: 20000 }); await p.waitForTimeout(1200);
await p.evaluate(() => { const sb = document.querySelector('.sidebar'), nb = document.querySelector('#app > :first-child'); sb.__mark = 'same'; nb.__mark = 'same'; window.__removed = 0; new MutationObserver(list => { list.forEach(m => m.removedNodes.forEach(n => { if (n.nodeType === 1) window.__removed++; })); }).observe(sb, { childList: true, subtree: true }); });
const views = await p.evaluate(() => [...document.querySelectorAll('.sidebar .sb-item')].filter(x => x.offsetParent !== null).map(x => x.getAttribute('data-view')).filter(v => v && v !== 'lifecycle').slice(0, 8));   // Project cycle opens the Overview, which is not a menu entry, so the menu group closes: not what this checks
let marked = true, activeOk = true, clicked = 0; for (const v of views) { if (!(await p.locator(`.sidebar .sb-item[data-view="${v}"]`).count())) { console.log('     (skipped ' + v + ': not in the sidebar after the earlier clicks)'); continue; } clicked++; await p.click(`.sidebar .sb-item[data-view="${v}"]`); await p.waitForTimeout(450); const st = await p.evaluate(v => { const sb = document.querySelector('.sidebar'), nb = document.querySelector('#app > :first-child'); const it = sb.querySelector(`.sb-item[data-view="${v}"]`); return { same: sb.__mark === 'same' && nb.__mark === 'same', on: !!it && (it.classList.contains('on') || it.classList.contains('active') || it.getAttribute('aria-current') === 'page') }; }, v); marked = marked && st.same; activeOk = activeOk && st.on; }
const removed = await p.evaluate(() => window.__removed);
check('the sidebar and the top bar are the same elements after clicking through ' + clicked + ' pages', marked && clicked >= 4, views.join(', '));
check('no sidebar element is removed and redrawn while clicking through pages', removed === 0, removed + ' removed');
check('the open page is still marked in the sidebar', activeOk);
await p.evaluate(() => { document.querySelector('.sidebar').scrollTop = 120; }); const before = await p.evaluate(() => document.querySelector('.sidebar').scrollTop);
await p.locator('.sidebar .sb-item:visible').nth(1).click(); await p.waitForTimeout(450); const after = await p.evaluate(() => document.querySelector('.sidebar').scrollTop); check('the sidebar scroll stays where it was after a click', Math.abs(after - before) <= 2, before + ' -> ' + after);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
