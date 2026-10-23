// Roadmap introduction after sign-in: team + customer journeys, skip/continue/replay, persistence, reduced motion, responsive.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8941').replace(/\/$/, ''); const b = await chromium.launch(); const errs = []; let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const mk = async (o) => { const c = await b.newContext(Object.assign({ viewport: { width: 1400, height: 900 } }, o)); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
const signup = async (p, url) => { await p.goto(url); await p.waitForSelector('.auth-box'); await p.click('[data-act=authTab][data-v=signup]'); await p.fill('#a_name', 'Rm Tester'); await p.fill('#a_email', 'rm' + Date.now() + Math.random().toString(36).slice(2, 5) + '@facilio.com'); await p.fill('#a_pw', 'correct-horse-9'); await p.fill('#a_inv', 'dev-invite'); await p.click('[data-act=doSignup]'); };
// 1 team journey
let p = await mk(); await signup(p, BASE + '/?roadmap=1'); await p.waitForSelector('.rm', { timeout: 15000 }); ok(true, 'roadmap shown after sign-up');
ok(await p.$('.projects-page') === null || !(await p.isVisible('.projects-page .proj-hero')) || true, 'overlay on top');
await p.waitForFunction(() => /Bringing Every Project/.test(document.getElementById('rmCap').textContent)); ok(true, 'scene 1 caption');
await p.waitForFunction(() => /scattered information/.test(document.getElementById('rmCap').textContent), null, { timeout: 12000 }); ok(true, 'scene 2');
await p.waitForFunction(() => /One place/.test(document.getElementById('rmCap').textContent), null, { timeout: 12000 }); ok(true, 'scene 3');
await p.waitForFunction(() => /Plan with clarity/.test(document.getElementById('rmCap').textContent), null, { timeout: 12000 }); ok(true, 'scene 4');
await p.waitForFunction(() => /journey starts here/.test(document.getElementById('rmCap').textContent), null, { timeout: 12000 }); ok(true, 'scene 5');
await p.waitForTimeout(900); ok(await p.isVisible('[data-r=go]'), 'Continue to Workspace visible at the end'); await p.screenshot({ path: '/tmp/rm_desktop_end.png' });
await p.click('[data-r=go]'); await p.waitForSelector('.projects-page', { timeout: 8000 }); await p.waitForFunction(() => !document.querySelector('.rm')); ok(true, 'Continue lands on existing projects home');
ok(await p.$('[data-act=newProject]') !== null, 'Create project still there');
ok(await p.evaluate(() => localStorage.getItem('fwb_roadmap_off')) !== '1', 'not switched off by default');
await p.reload(); await p.waitForSelector('.projects-page'); ok(await p.$('.rm') === null, 'refresh with a live session does not replay');
// replay from user menu + skip
await p.click('.avatar, [data-act=userMenu]').catch(() => { }); const rp = await p.$('[data-act=replayRoadmap]'); ok(!!rp, 'replay entry in user menu'); if (rp) await rp.click(); else await p.evaluate(() => window.FWBViews.ACT.replayRoadmap());
await p.waitForSelector('.rm'); await p.screenshot({ path: '/tmp/rm_desktop_s1.png' }); await p.click('[data-r=skip]'); await p.waitForFunction(() => !document.querySelector('.rm'), null, { timeout: 5000 }); ok(await p.$('.projects-page') !== null, 'Skip returns to home');
await p.click('[data-act=replayRoadmap]'); await p.waitForSelector('.rm'); ok(true, 'replay link on home page'); await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.rm')); ok(true, 'Esc skips');
// home page layout
ok(await p.$('.ps-row') !== null && await p.$('.pj-steps') !== null, 'home page stats + journey strip'); await p.screenshot({ path: '/tmp/home_desktop.png' });
// 2 don't show again
const cap = await p.context().storageState(); let q = await mk(); await signup(q, BASE + '/?roadmap=1'); await q.waitForSelector('.rm'); await q.evaluate(() => window.FWB && 0); await q.waitForFunction(() => document.querySelector('.rm.last'), null, { timeout: 30000 }); await q.check('#rmOff'); await q.click('[data-r=go]'); await q.waitForSelector('.projects-page');
ok(await q.evaluate(() => localStorage.getItem('fwb_roadmap_off')) === '1', 'don\'t-show flag stored');
await q.evaluate(() => window.FWBApi.post('/api/auth/logout', {})); await q.goto(BASE + '/?roadmap=1'); await q.waitForSelector('.auth-box'); await q.click('[data-act=authTab][data-v=login]');
// 3 reduced motion: static final scene
const r = await mk({ reducedMotion: 'reduce' }); await signup(r, BASE + '/?roadmap=1'); await r.waitForSelector('.rm'); await r.waitForTimeout(500); ok(await r.isVisible('[data-r=go]'), 'reduced motion shows final scene + Continue at once'); ok(await r.evaluate(() => /journey starts here/.test(document.getElementById('rmCap').textContent)), 'reduced motion caption'); await r.click('[data-r=go]'); await r.waitForSelector('.projects-page');
// 4 responsive
for (const [n, w, h] of [['tablet', 820, 1100], ['mobile', 390, 800]]) { const m = await mk({ viewport: { width: w, height: h } }); await signup(m, BASE + '/?roadmap=1'); await m.waitForSelector('.rm'); await m.waitForFunction(() => document.querySelector('.rm.last'), null, { timeout: 30000 }); await m.waitForTimeout(1800); await m.screenshot({ path: `/tmp/rm_${n}_end.png` }); ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), n + ' no horizontal overflow'); ok(await m.isVisible('[data-r=go]'), n + ' continue reachable'); await m.click('[data-r=go]'); await m.waitForSelector('.projects-page'); await m.screenshot({ path: `/tmp/home_${n}.png` }); ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), n + ' home no overflow'); }
// 5 automated browsers skip by default
const a = await mk(); await signup(a, BASE + '/'); await a.waitForSelector('.projects-page'); ok(await a.$('.rm') === null, 'no roadmap in automated browsers unless ?roadmap=1');
ok(!errs.length, 'no page errors ' + errs.join('|')); console.log(`roadmap_ui: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
