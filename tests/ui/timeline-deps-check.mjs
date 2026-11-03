// Project Plan > Timeline & planning: dependency lines like Asana's Timeline. The demo plan draws its links; a link is made by dragging the dot of one bar onto another; a loop is refused;
// moving a task moves the tasks that wait for it; a line can be removed; the critical path lights up; the task editor lists what a task waits for.
// Usage: PW_CHANNEL=msedge node tests/ui/timeline-deps-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"reset":true}' })).json()).id);
await p.goto(`${BASE}/?nointro#/p/${id}/plan`); await p.reload(); await p.waitForSelector('[data-act="planTab"][data-t="tl"]', { timeout: 30000 });
await p.evaluate(() => document.querySelector('[data-act="planTab"][data-t="tl"]').click()); await p.waitForSelector('svg.pl-dep .pl-lk-p', { timeout: 20000 }); await p.waitForTimeout(2500);
const links = () => p.locator('svg.pl-dep .pl-lk-p').count(); const dep = tid => p.evaluate(t => (window.FWB.doc('plan_struct').rows.find(r => r.id === t) || {}).dep || [], tid); const start = tid => p.evaluate(t => window.FWB.doc('plan_struct').rows.find(r => r.id === t).start, tid);
const centre = async loc => { const bb = await loc.boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; };
async function dragDot(from, to) { const f = p.locator(`.pl-bar[data-id="${from}"], .pl-ms[data-id="${from}"]`).first(); await f.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await f.hover(); const a = await centre(f.locator('.pl-lk.r')); const tg = p.locator(`.pl-bar[data-id="${to}"], .pl-ms[data-id="${to}"]`).first(); const c = await centre(tg); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x + 30, a.y + 10, { steps: 4 }); await p.mouse.move(c.x, c.y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(1600); }

check('the demo plan draws its 18 links as lines', (await links()) === 18, String(await links()));
check('the table is compact by default: the task and the timeline only', (await p.locator('.pl-wrap.pl-compact .pl-grid th:visible').count()) === 2);
check('every task bar has a dot at each end', (await p.locator('.pl-bar[data-id] .pl-lk').count()) >= 20);
check('dots stay hidden until their bar is hovered or focused', await p.evaluate(() => { const d = document.querySelector('.pl-bar[data-id="pl_9"] .pl-lk.r'); return getComputedStyle(d).opacity === '0'; }));
check('lines and the today marker sit under the sticky task column and the header, so they never cross task names', await p.evaluate(() => { const z = e => Number(getComputedStyle(e).zIndex) || 0; return Math.max(z(document.querySelector('svg.pl-dep')), z(document.querySelector('.pl-today') || document.body)) < z(document.querySelector('td.pl-task')) && z(document.querySelector('td.pl-task')) < z(document.querySelector('.pl-grid thead th')); }));
if (OUT) { await p.evaluate(() => { const w = document.querySelector('.pl-wrap'); w.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/timeline-links.png` }); }

await dragDot('pl_7', 'pl_9');
check('dragging a dot onto another bar links them', (await links()) === 19 && (await dep('pl_9')).includes('pl_7'), (await dep('pl_9')).join());
await dragDot('pl_12', 'pl_7');
check('a link that would make a loop is refused, with a reason', (await links()) === 19 && /would make a loop/.test(await p.evaluate(() => document.body.innerText)), String(await links()));

await p.locator('.pl-bar[data-id="pl_5"], .pl-ms[data-id="pl_5"]').first().evaluate(e => { e.scrollIntoView({ block: 'center', inline: 'center' }); e.focus(); });
await p.keyboard.press('l'); for (let i = 0; i < 25 && (await p.locator('.lk-target').first().getAttribute('data-id').catch(() => '')) !== 'pl_10'; i++) await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(1600);
check('keyboard: focus a bar, press L, choose with the arrows, Enter links the two tasks', (await dep('pl_10')).includes('pl_5'), (await dep('pl_10')).join());
await p.locator('svg.pl-dep .hit').first().focus(); const nk = await links(); await p.keyboard.press('Delete'); await p.waitForTimeout(1200);
check('keyboard: Tab to a line and press Delete removes the link', (await links()) === nk - 1, nk + ' -> ' + (await links()));
await dragDot('pl_3', 'pl_10');
check('a milestone can be linked too, from its own dot', (await dep('pl_10')).includes('pl_3'), (await dep('pl_10')).join());
const before = await start('pl_9'); const bar = p.locator('.pl-bar[data-id="pl_8"]'); await bar.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); const c8 = await centre(bar);
await p.mouse.move(c8.x, c8.y); await p.mouse.down(); await p.mouse.move(c8.x + 40, c8.y, { steps: 6 }); await p.mouse.move(c8.x + 110, c8.y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(1000);
const after = await start('pl_9'); check('moving a task later moves the tasks that wait for it', after > before, before + ' -> ' + after);
check('and no link starts too early afterwards', (await p.locator('svg.pl-dep .pl-lk-p.bad').count()) === 0);

const n0 = await links(); await p.locator('svg.pl-dep .hit').first().focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.pl-lkpop [data-lkdel]', { timeout: 5000 });
check('clicking a line offers to remove it', /waits for/.test(await p.textContent('.pl-lkpop')));
await p.click('.pl-lkpop [data-lkdel]'); await p.waitForTimeout(900); check('removing a link takes its line away', (await links()) === n0 - 1, n0 + ' -> ' + (await links()));

await p.locator('svg.pl-dep .hit').first().focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.pl-lkpop [data-lklag]'); await p.fill('.pl-lkpop [data-lklag]', '3'); await p.locator('.pl-lkpop [data-lklag]').dispatchEvent('change'); await p.waitForSelector('svg.pl-dep .pl-lk-lag', { timeout: 8000 }).catch(() => {});
check('a link can carry lag days, shown on the line', (await p.locator('svg.pl-dep .pl-lk-lag').count()) >= 1 && /\+3d/.test(await p.textContent('svg.pl-dep')));
check('the top bar no longer covers the drawer', await (async () => { await p.evaluate(() => document.querySelector('a[data-act="tlRow"][data-id]').click()); await p.waitForSelector('#drawer .drawer'); await p.waitForTimeout(700); const ok = await p.evaluate(() => { const x = document.querySelector('#drawer .drawer-h .btn'); const r = x.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top === x || x.contains(top); }); await p.evaluate(() => document.querySelector('[data-act="closeDrawer"]').click()); await p.waitForTimeout(500); return ok; })());
await p.evaluate(() => document.querySelector('[data-change="tlCrit"]').click()); await p.waitForTimeout(700);
check('the critical path lights up the longest chain', (await p.locator('svg.pl-dep .pl-lk-p.crit').count()) >= 3 && (await p.locator('.pl-bar.crit, .pl-ms.crit').count()) >= 3);
if (OUT) await p.screenshot({ path: `${OUT}/timeline-critical.png` });

await p.locator('[data-act="tlRow"][data-id="pl_9"]').first().click(); await p.waitForSelector('.tdp', { timeout: 5000 });
check('the task editor lists what the task waits for', (await p.locator('.tdp').count()) >= 10 && (await p.locator('.tdp[value="pl_8"]:checked').count()) === 1);
await p.evaluate(() => document.querySelector('[data-act="closeDrawer"]').click());
await p.evaluate(() => document.querySelector('[data-act="tlCompact"]').click()); await p.waitForTimeout(600);
check('Show all columns brings the full table back', (await p.locator('.pl-wrap:not(.pl-compact) .pl-grid th:visible').count()) >= 9);
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
