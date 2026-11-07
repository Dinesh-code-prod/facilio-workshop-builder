// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/taskboard-check.mjs
// Project Tasks, Board view (src/tasks.js, src/taskboard.css) in a browser against the local preview: the board and the list show the same tasks,
// drag and drop, Alt + Arrow and the status menu each change the status, focus stays on the moved card for keyboard users, a click on the
// status menu does not open the task, a customer question cannot be moved to Done without a final response, a second move after a re-render
// still works, and on a touch phone the status menu is visible and the page itself does not scroll sideways.
// Usage: node tests/ui/taskboard-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d) => (await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: d ? JSON.stringify(d) : undefined })).json();
  const pr = (await api('POST', '/projects', { name: 'Task board', customer: 'Acme' })).project;
  for (const id of ['a', 'b', 'c', 'd']) await api('PUT', `/projects/${pr.id}/items/task/${id}`, { data: { title: 'Task ' + id, type: 'Other', status: 'To Do' } });
  await api('PUT', `/projects/${pr.id}/items/task/q`, { data: { title: 'Question q', type: 'Customer Question', status: 'In Review', question: { text: 'Which site first?', status: 'New' } } });
  return pr.id;
});
const st = id => p.evaluate(id => window.FWBViews.items.get('task', id).status, id);
const drawerOpen = () => p.evaluate(() => !!document.getElementById('drawer'));
const settle = () => p.waitForTimeout(1200);
await p.goto(BASE + `/#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('[data-act="tkView"][data-v="board"]', { timeout: 20000 });
await p.click('[data-act="tkView"][data-v="board"]'); await p.waitForSelector('.kb-card');
const ids = await p.$$eval('.kb-card', c => c.map(x => x.getAttribute('data-id')).sort().join());
check('the board shows every task, one column per status', ids === 'a,b,c,d,q' && (await p.$$('.kb-col')).length === 8, ids);

await p.dragAndDrop('.kb-card[data-id="a"]', '.kb-col[data-status="In Progress"] .kb-drop'); await settle();
check('drag and drop moves a card to another status', (await st('a')) === 'In Progress' && !!(await p.$('.kb-col[data-status="In Progress"] .kb-card[data-id="a"]')));
await p.dragAndDrop('.kb-card[data-id="a"]', '.kb-col[data-status="Blocked"] .kb-drop'); await settle();
check('a second drag after the board is drawn again still works', (await st('a')) === 'Blocked');

await p.focus('.kb-card[data-id="b"]'); await p.keyboard.press('Alt+ArrowRight'); await settle();
const f1 = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-id'));
check('Alt + Arrow moves the focused card and focus stays on it', (await st('b')) === 'In Progress' && f1 === 'b', 'focus on ' + f1);
await p.keyboard.press('Alt+ArrowRight'); await settle();
check('…so the keyboard can keep moving it', (await st('b')) === 'Blocked');
await p.keyboard.press('Escape');

await p.hover('.kb-card[data-id="c"]'); await p.click('.kb-card[data-id="c"] select.kb-mv'); await p.waitForTimeout(300);
check('a click on the status menu does not open the task', !(await drawerOpen()));
await p.keyboard.press('Escape'); await p.selectOption('.kb-card[data-id="c"] select.kb-mv', 'Awaiting Customer'); await settle();
check('the status menu on the card moves it, without opening the task', (await st('c')) === 'Awaiting Customer' && !(await drawerOpen()));

await p.dragAndDrop('.kb-card[data-id="q"]', '.kb-col[data-status="Done"] .kb-drop'); await settle();
check('a customer question is not moved to Done without a final response', (await st('q')) === 'In Review');
await p.click('.kb-card[data-id="d"] .kb-t'); await p.waitForTimeout(400);
check('clicking a card still opens the task', await drawerOpen());
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.click('[data-act="tkView"][data-v="list"]'); await p.waitForTimeout(500);
check('the list shows the same statuses', /Blocked/.test(await p.textContent('.page-body')) && /Awaiting Customer/.test(await p.textContent('.page-body')));
await p.screenshot({ path: `${OUT}/taskboard-desktop.png` });

// touch phone
const t = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const q = await t.newPage(); q.on('pageerror', e => errs.push(e.message));
await q.goto(BASE + `/#/p/${pid}/tasks`); await q.waitForSelector('[data-act="tkView"][data-v="board"]', { timeout: 20000 }); await q.tap('[data-act="tkView"][data-v="board"]'); await q.waitForSelector('.kb-card');
const ph = await q.evaluate(() => ({ menu: getComputedStyle(document.querySelector('.kb-card[data-id="d"] select.kb-mv')).display, page: document.documentElement.scrollWidth, vw: innerWidth, colW: document.querySelector('.kb-col').getBoundingClientRect().width }));
check('on a touch phone the status menu is visible on every card', ph.menu === 'block', ph.menu);
check('on a phone the page does not scroll sideways and a column is most of the screen wide', ph.page <= ph.vw + 1 && ph.colW >= 0.7 * ph.vw, JSON.stringify(ph));
await q.tap('.kb-card[data-id="d"] select.kb-mv'); await q.waitForTimeout(300);
check('tapping the status menu does not open the task', !(await q.evaluate(() => !!document.getElementById('drawer'))));
await q.keyboard.press('Escape'); await q.selectOption('.kb-card[data-id="d"] select.kb-mv', 'In Review'); await q.waitForTimeout(1200);
check('a card can be moved on a phone', (await q.evaluate(() => window.FWBViews.items.get('task', 'd').status)) === 'In Review');
await (await q.$('#kb')).scrollIntoViewIfNeeded(); await q.screenshot({ path: `${OUT}/taskboard-phone.png` });
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
