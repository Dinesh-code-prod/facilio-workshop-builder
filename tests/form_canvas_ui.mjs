// Form Builder canvas layout: source forms (Facilio span 1 = full width, 2 = half) render without overlapping fields.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE); await page.waitForSelector('.auth-box'); await page.click('[data-act=authTab][data-v=signup]');
await page.fill('#a_name', 'D'); await page.fill('#a_email', 'fc' + Date.now() + '@facilio.com'); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite'); await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'Forms'); await page.fill('#np_cust', 'Acme'); await page.fill('#np_start', '2026-11-01'); await page.fill('#np_team [data-p=name]', 'D'); await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 });
const overlaps = () => page.$$eval('#fbCanvas .fsec-b', secs => { let bad = 0, narrow = 0; secs.forEach(s => { const r = [...s.querySelectorAll('.ff')].map(e => e.getBoundingClientRect()); r.forEach((a, i) => { if (a.width < 150) narrow++; r.slice(i + 1).forEach(b => { if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad++; }); }); }); return { bad, narrow, n: document.querySelectorAll('#fbCanvas .ff').length }; });
for (const [mod, w] of [['invitevisitor', 1600], ['workorder', 1600], ['asset', 1280]]) {
  await page.setViewportSize({ width: w, height: 950 });
  const pid = await page.evaluate(() => window.FWB.S.project.id); await page.goto(BASE + `#/p/${pid}/module/${mod}`); await page.reload(); await page.waitForSelector('[data-act=openForm]', { timeout: 30000 });
  await page.click('[data-act=openForm]'); await page.waitForSelector('#fbCanvas'); await page.waitForTimeout(300);
  const r = await overlaps(); console.log(mod, w, JSON.stringify(r)); ok(r.n > 0 && r.bad === 0 && r.narrow === 0, `${mod} at ${w}px: fields do not overlap or squeeze`);
  await page.screenshot({ path: OUT + `fc_${mod}_${w}.png` });
}
ok(!errors.length, 'no page errors ' + errors.join('; '));
console.log(`form canvas ui: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
