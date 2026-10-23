// UI smoke: sign up, create a project, open every section, collect console errors and screenshots.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage(); const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
const shot = n => page.screenshot({ path: OUT + n + '.png' });
await page.goto(BASE); await page.waitForSelector('.auth-box');
await page.click('[data-act=authTab][data-v=signup]');
const email = 'ui' + Date.now() + '@facilio.com';
await page.fill('#a_name', 'Dinesh R'); await page.fill('#a_email', email); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite');
await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'CAFM Implementation'); await page.fill('#np_cust', 'Acme Properties'); await page.fill('#np_start', '2026-11-01');
await page.fill('#np_team [data-p=name]', 'Dinesh R');
await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 }); await page.waitForTimeout(800);
await shot('u01_overview');
const views = ['kickoff', 'plan', 'planner', 'guide', 'dashboards', 'modules', 'flow', 'roles', 'transcripts', 'checks', 'brd', 'settings'];
for (const v of views) { { const s = `.sidebar [data-view=${v}]`; if (await page.$(s)) await page.click(s); else await page.evaluate(x => window.FWBViews.go(x), v); } await page.waitForTimeout(700); await shot('u_' + v); console.log(v, 'errors so far', errors.length); }
console.log(JSON.stringify(errors.slice(0, 20), null, 1));
await browser.close();
