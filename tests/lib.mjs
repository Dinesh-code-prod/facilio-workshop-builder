// Shared browser-test helpers: consultant sign-up + project, customer login, error capture, checks.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
export async function setup(BASE, opts) {
  opts = opts || {};
  const browser = await chromium.launch(); const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); p.on('dialog', d => d.accept()); };
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1500, height: 1000 }, acceptDownloads: true }); const page = await ctx.newPage(); watch(page);
  await page.goto(BASE); await page.waitForSelector('.auth-box'); await page.click('[data-act=authTab][data-v=signup]');
  await page.fill('#a_name', 'Dinesh R'); await page.fill('#a_email', 't' + Date.now() + Math.random().toString(36).slice(2, 6) + '@facilio.com'); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite');
  await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
  await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', opts.name || 'Marina CAFM'); await page.fill('#np_cust', opts.customer || 'Marina Properties'); await page.fill('#np_start', '2026-11-01');
  await page.fill('#np_team [data-p=name]', 'Dinesh R'); await page.fill('#np_code', 'marina-access-2026');
  await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 }); await page.waitForTimeout(600);
  const projectId = await page.evaluate(() => window.FWB.S.project.id);
  async function customer(name) {
    const c = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage(); watch(c);
    await c.goto(BASE + '#/c/' + projectId); await c.waitForSelector('#c_name'); await c.fill('#c_name', name || 'Priya Nair'); await c.fill('#c_code', 'marina-access-2026'); await c.click('[data-act=doCustomer]'); await c.waitForSelector('.sidebar', { timeout: 30000 }); return c;
  }
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  const nav = async (p, v) => { const sel = `.sidebar [data-view=${v}]`; if (await p.$(sel)) await p.click(sel); else await p.evaluate(x => window.FWBViews.go(x), v); await p.waitForTimeout(700); };
  const done = async label => { ok(!errors.length, 'no page errors: ' + errors.slice(0, 3).join(' | ')); console.log(`${label}: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0); };
  return { browser, page, projectId, customer, ok, nav, done, errors };
}
