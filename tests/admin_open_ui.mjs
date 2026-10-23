// Admin panel in the no-login office mode: the Admin button asks for the administrator's sign-in, then shows every project.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8931/'; const b = await chromium.launch(); const errs = []; let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage(); page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE); await page.waitForSelector('.projects-page');
ok(!(await page.textContent('.projects-page')).includes('Sign in'), 'open mode still goes straight to projects');
await page.click('[data-act=openAdmin]'); await page.waitForSelector('#ad_email'); ok(true, 'Admin asks for sign-in');
await page.fill('#ad_pw', 'nope-nope-nope'); await page.click('[data-act=adminSignIn]'); await page.waitForTimeout(800); ok(await page.$('.adm-wrap') === null, 'wrong login refused');
await page.click('[data-act=adminSetup]'); await page.waitForSelector('#ad_code'); await page.fill('#ad_pw', 'long-enough-pw-1'); await page.fill('#ad_code', 'setup-code-xyz'); await page.click('[data-act=adminSignIn]');
await page.waitForSelector('.adm-wrap'); ok(true, 'admin panel opens after setup');
await page.click('[data-act=toProjects]'); await page.waitForSelector('.projects-page'); ok(await page.$('[data-act=openAdmin]') !== null, 'Admin button still there');
ok(!errs.length, 'no page errors ' + errs.join('|')); console.log(`admin_open_ui: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
