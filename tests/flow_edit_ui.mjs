// State Flow Builder editing: auto-align left-to-right and top-to-bottom without overlaps, add/delete state from the
// toolbar, Delete key on a transition (configured => proposed removal), Ctrl+Z restores.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE); await page.waitForSelector('.auth-box'); await page.click('[data-act=authTab][data-v=signup]');
await page.fill('#a_name', 'D'); await page.fill('#a_email', 'sf' + Date.now() + '@facilio.com'); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite'); await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'Flows'); await page.fill('#np_cust', 'Acme'); await page.fill('#np_start', '2026-11-01'); await page.fill('#np_team [data-p=name]', 'D'); await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 });
await page.evaluate(() => { const id = window.FWB.flowsForModule('workorder').find(x => x.enabled !== false).id; window.FWBViews.go('flow', { flowId: id }); }); await page.waitForSelector('#canvas svg');
const model = () => page.evaluate(() => { const f = window.FWB.flowModel(window.FWB.S.ui.flowId); return { initial: f.initial, dir: f.layoutDir, states: f.states.map(s => ({ id: s.id, x: s.x, y: s.y })), live: f.transitions.filter(t => !t.removed).length }; });
const boxesOverlap = () => page.$$eval('#canvas svg [data-state]', gs => { const r = gs.map(g => g.getBoundingClientRect()); let n = 0; r.forEach((a, i) => r.slice(i + 1).forEach(b => { if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) n++; })); return n; });
for (const dir of ['v', 'h']) {
  await page.click(`[data-act=relayout][data-dir=${dir}]`); await page.waitForTimeout(500);
  const m = await model(); const xs = m.states.map(s => s.x), ys = m.states.map(s => s.y); const ini = m.states.find(s => s.id === m.initial);
  const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
  ok(m.dir === dir, `${dir}: direction remembered`);
  ok(dir === 'v' ? ini.y === Math.min(...ys) && spanY > spanX : ini.x === Math.min(...xs) && spanX > spanY, `${dir}: default state first and flow runs ${dir === 'v' ? 'downwards' : 'rightwards'} (${spanX}x${spanY})`);
  ok((await boxesOverlap()) === 0, `${dir}: no overlapping states`);
  await page.screenshot({ path: OUT + `sf_align_${dir}.png` });
}
const n0 = (await model()).states.length;
await page.click('.sfb-toolbar [data-act=addState]'); await page.waitForTimeout(300); ok((await model()).states.length === n0 + 1, 'toolbar Add State');
ok(!(await page.$eval('.sfb-toolbar [data-act=deleteSel]', b => b.disabled)), 'Delete enabled with a selection');
await page.keyboard.press('Delete'); await page.waitForTimeout(400);
ok((await model()).states.length === n0, 'Delete key removes the new state');
const t0 = (await model()).live;
await page.click('#canvas svg [data-edge] .pill rect', { force: true }); await page.waitForSelector('.side-tabs');
await page.keyboard.press('Delete'); await page.waitForTimeout(400); ok((await model()).live === t0 - 1, 'Delete key removes the selected transition');
await page.keyboard.press('Control+z'); await page.waitForTimeout(400); ok((await model()).live === t0, 'Ctrl+Z restores it');
await page.screenshot({ path: OUT + 'sf_after_edit.png' });
ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join('; '));
console.log(`flow edit ui: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
