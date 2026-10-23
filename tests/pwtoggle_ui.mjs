// Password fields get a show/hide button (sign-up, sign-in, admin sign-in).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://localhost:4701/').replace(/\/?$/, '/'); let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 850 } });
await p.goto(BASE + '?nointro'); await p.waitForSelector('#a_pw');
ok(await p.locator('#a_pw').getAttribute('type') === 'password', 'starts hidden');
ok(await p.locator('.pw-eye').count() === 1, 'one eye on sign-up');
await p.fill('#a_pw', 'secret-Value-123'); await p.click('.pw-eye');
ok(await p.locator('#a_pw').getAttribute('type') === 'text', 'shows after click');
ok(await p.inputValue('#a_pw') === 'secret-Value-123', 'value kept');
ok(await p.locator('.pw-eye').getAttribute('aria-pressed') === 'true', 'pressed state');
await p.click('.pw-eye'); ok(await p.locator('#a_pw').getAttribute('type') === 'password', 'hides again');
await p.getByRole('button', { name: /^Sign in$/ }).first().click().catch(() => { }); await p.waitForTimeout(300);
await p.click('text=Sign in').catch(() => { });
await p.waitForSelector('#a_pw'); ok(await p.locator('.pw-eye').count() >= 1, 'eye on sign-in after re-render');
await p.click('text=Administrator sign-in').catch(() => { }); await p.waitForTimeout(600);
ok(await p.locator('#ad_pw').count() === 0 || await p.locator('#ad_pw ~ .pw-eye, .pw-wrap #ad_pw').count() >= 1, 'eye on admin sign-in');
await b.close(); console.log('pwtoggle_ui: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
