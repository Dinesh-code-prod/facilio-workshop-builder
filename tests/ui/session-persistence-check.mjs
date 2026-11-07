// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/session-persistence-check.mjs
// Session expiry and keeping what was typed: a sign-out while a form is open, a save refused because the session ended, an idle sign-out, and a clean restore after signing in again.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Persist', customer: 'P' }) })).json()).project.id);
const open = async () => { await p.goto(BASE + `/?nointro#/p/${pid}/overview`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached', timeout: 30000 }); await p.waitForTimeout(1800); };
await open();
// A. typing in an open form, then the session ends
await p.evaluate(() => { window.FWBViews.drawer('New thing', '<label class="f" for="tt">Notes</label><textarea id="tt" rows="4"></textarea>', '<button class="btn" data-act="closeDrawer">Close</button>'); }); await p.fill('#tt', 'Important text I was typing when the session ended');
await p.evaluate(() => window.FWBShell.sessionExpired()); await p.waitForTimeout(600); check('the app shows the signed-out screen', /session has ended|sign in/i.test(await p.locator('body').innerText()));
await open(); check('the typed text is offered back after signing in again', /Text you had not saved/.test(await p.locator('body').innerText()) && /Important text I was typing/.test(await p.locator('#drawer textarea').first().inputValue().catch(() => '')));
await p.evaluate(() => window.FWBViews.closeDrawer()); await open(); check('and it is offered once, not every time', !/Text you had not saved/.test(await p.locator('body').innerText()));
// B. a save is refused because the session ended
await p.route('**/docs/workshop', r => (r.request().method() === 'PUT' ? r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Sign in"}' }) : r.continue()));
await p.evaluate(() => { window.FWB.S.ws.project.background = 'KEEP ME 4821'; window.FWB.markDirty('workshop'); }); await p.waitForTimeout(3500);
check('the refused save signed the person out', /session has ended|sign in/i.test(await p.locator('body').innerText()));
await p.unroute('**/docs/workshop'); await open();
const bg = await p.evaluate(() => window.FWB.S.ws.project.background); check('the unsaved change is put back after signing in', bg === 'KEEP ME 4821', String(bg));
await p.waitForTimeout(2500); const saved = await p.evaluate(async id => (await (await fetch('/api/fn/api/projects/' + id + '/docs/workshop')).json()).data.project.background, pid); check('and it is saved to the server', saved === 'KEEP ME 4821', String(saved));
// C. idle sign-out
await p.evaluate(() => window.FWBViews.session.check(Date.now() + 31 * 60e3)); await p.waitForTimeout(1500); check('after 30 minutes without activity the app signs the person out with a clear message', /30 minutes without activity/.test(await p.locator('body').innerText()));
check('the idle warning shows two minutes before', await (async () => { await open(); await p.evaluate(() => window.FWBViews.session.check(Date.now() + 29 * 60e3)); await p.waitForTimeout(500); return /signed out in about two minutes/.test(await p.locator('body').innerText()); })());
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
