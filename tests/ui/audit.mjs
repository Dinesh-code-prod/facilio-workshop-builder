// Application-wide UI audit: visits every reachable screen (projects home, account menu, every project view and its tabs,
// the admin console and its sections, the first create/edit dialog on each page) at four viewport sizes, runs the geometry
// and semantics checks in tests/ui/checks.js, and writes a JSON report plus screenshots.
// Usage: node tests/ui/audit.mjs <outDir> [baseUrl]   (start tests/ui/devserver.mjs first)
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));   // not new URL(...).pathname: that gives /D:/... on Windows
const OUT = process.argv[2] || path.join(here, 'out'); const BASE = process.argv[3] || 'http://localhost:4173';
const ONLY = process.env.UI_VIEWPORTS ? process.env.UI_VIEWPORTS.split(',').map(Number) : null;
const VIEWPORTS = [{ n: 'desktop', w: 1440, h: 900 }, { n: 'laptop', w: 1280, h: 800 }, { n: 'tablet', w: 768, h: 1024 }, { n: 'mobile', w: 390, h: 844 }].filter(v => !ONLY || ONLY.includes(v.w));
const SHOTS = process.env.UI_SHOTS !== '0'; const PARTS = (process.env.UI_PARTS || 'home,admin,project').split(',');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const checks = fs.readFileSync(path.join(here, 'checks.js'), 'utf8');
const LONG = 'Emirates National Engineering Consolidated Facilities Management Programme Phase Two (Abu Dhabi & Al Ain)';

async function seed(page) {
  return page.evaluate(async LONG => {
    const api = async (m, p, b) => { const r = await fetch('/api/fn/api' + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return r.json(); };
    const have = (await api('GET', '/projects')).projects || []; if (have.length >= 3) return have.find(p => p.name === LONG)?.id || have[0].id;
    const a = (await api('POST', '/projects', { name: LONG, customer: 'Emirates National Engineering Consolidated LLC', description: 'Long names and many records, for layout testing.' })).project;
    await api('POST', '/projects', { name: 'Alpha Towers', customer: 'Acme', description: 'Short sample' }); await api('POST', '/projects', { name: 'Harbour Mall CAFM', customer: 'Harbour Group', description: '' });
    const long = 'Confirm the preventive maintenance frequency for chillers, AHUs and cooling towers across all twelve sites before the BRD is signed off';
    const kinds = { action: { title: long, owner: 'Dinesh R', due: '2026-11-04', status: 'Open' }, decision: { title: long, status: 'Agreed' }, raid: { type: 'Risk', title: long, severity: 'High', status: 'Open' }, cr: { title: long, status: 'Draft' }, signoff: { title: 'BRD sign-off ' + long, status: 'Pending' }, usecase: { title: long, module: 'Work Orders' }, uat: { title: long, status: 'Not run' }, build: { title: long, status: 'In progress' }, hc: { title: long, status: 'Open' }, rep: { title: 'Weekly status report 14', period: '2026-10-20' }, lesson: { title: long }, cfgrel: { from: 'Inspection', to: 'Work Order', type: 'creates', outcome: long }, capp: { app: 'Tenant Portal', tabs: [{ name: 'Service requests', purpose: long }] } };
    for (const [k, d] of Object.entries(kinds)) for (let i = 0; i < 3; i++) await api('PUT', `/projects/${a.id}/items/${k}/${k}${i}`, { data: Object.assign({}, d, { title: (d.title || k) + (i ? ' #' + i : '') }) });
    return a.id;
  }, LONG);
}
const report = []; const seen = new Set();
async function audit(page, vp, screen, scope) {
  await page.waitForTimeout(250); await page.waitForSelector('#loading', { state: 'detached', timeout: 8000 }).catch(() => { }); await page.waitForTimeout(150);
  const issues = await page.evaluate(s => window.__uiAudit(s), scope || null).catch(e => [{ rule: 'audit-error', sig: '', text: '', detail: e.message }]);
  report.push({ vp: vp.n, screen, issues });
  const file = `${screen.replace(/[^a-z0-9]+/gi, '_')}__${vp.n}.png`;
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'shots', file) }).catch(() => { });
  process.stdout.write(`${vp.n.padEnd(7)} ${screen.padEnd(44)} ${issues.length}\n`);
}
async function closeOverlays(page) {
  for (let i = 0; i < 3; i++) { const open = await page.$('#drawer, .scrim, .popover'); if (!open) return; await page.keyboard.press('Escape'); await page.waitForTimeout(150); const still = await page.$('#drawer, .scrim'); if (still) await page.evaluate(() => { const V = window.FWBViews; if (V && V.closeDrawer) V.closeDrawer(); document.querySelectorAll('.scrim, .popover').forEach(e => e.remove()); }); }
}
async function tabsOf(page) { return page.$$eval('.page .tabs > .tab, .page .tabs > button, .page [role=tablist] > [role=tab], .adm-main .dtabs > .dtab', els => els.filter(e => e.offsetParent).map((e, i) => ({ i, t: (e.innerText || '').trim().slice(0, 30) }))); }
async function walkTabs(page, vp, screen) {
  const tabs = await tabsOf(page); for (const tb of tabs.slice(1, 9)) {
    const els = await page.$$('.page .tabs > .tab, .page .tabs > button, .page [role=tablist] > [role=tab], .adm-main .dtabs > .dtab'); const vis = []; for (const e of els) if (await e.isVisible()) vis.push(e);
    if (!vis[tb.i]) continue; await vis[tb.i].click().catch(() => { }); await page.waitForTimeout(400); await audit(page, vp, `${screen}~${tb.t || tb.i}`);
  }
}
async function tryDialog(page, vp, screen) {
  const btn = await page.$$('.page-header .btn, .page .card-h .btn, .adm-hero .btn, .page .btn');
  for (const b of btn) { const t = ((await b.innerText().catch(() => '')) || '').trim(); if (/^(\+\s*)?(new|add|create|edit|import|invite|grant)\b/i.test(t) && await b.isVisible()) { await b.click().catch(() => { }); await page.waitForTimeout(500); const d = await page.$('#drawer .drawer, .scrim .dialog, .scrim [role=dialog], .modal'); if (d) await audit(page, vp, `${screen}#dialog:${t.slice(0, 24)}`); await closeOverlays(page); return; } }
}
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 }); await ctx.addInitScript(checks);
  const page = await ctx.newPage(); page.on('pageerror', e => { if (!seen.has(e.message)) { seen.add(e.message); console.log('PAGE ERROR', e.message); } });
  page.on('dialog', d => d.dismiss());
  await page.goto(BASE + '/'); await page.waitForSelector('[data-act]', { timeout: 15000 }); await audit(page, vp, 'auth');
  const pid = await seed(page);
  await page.getByRole('button', { name: /open workspace/i }).first().click(); await page.waitForTimeout(800); await audit(page, vp, 'projects');
  // account menu (portal switching and sign out live here)
  const av = await page.$('.navbar .avatar'); if (av && await av.isVisible()) { await av.click(); await page.waitForTimeout(300); await audit(page, vp, 'projects#account-menu'); await closeOverlays(page); }
  await tryDialog(page, vp, 'projects');
  // admin console
  if (PARTS.includes('admin')) { await page.evaluate(() => window.FWBViews.ACT.openAdmin()); await page.waitForSelector('.adm-nav .adm-ni', { state: 'attached', timeout: 15000 }).catch(() => { }); await page.waitForTimeout(600);
  const admNav = await page.$$eval('.adm-nav .adm-ni', els => els.map(e => (e.innerText || '').trim().split('\n')[0]));
  for (let i = 0; i < admNav.length; i++) { const items = await page.$$('.adm-nav .adm-ni'); await items[i].click().catch(() => { }); await page.waitForTimeout(700); const s = 'admin/' + admNav[i]; await audit(page, vp, s); if (vp.w === 1440) { await walkTabs(page, vp, s); await tryDialog(page, vp, s); } }
  const ao = await page.$('.navbar .avatar'); if (ao && await ao.isVisible()) { await ao.click(); await page.waitForTimeout(300); await audit(page, vp, 'admin#account-menu'); await closeOverlays(page); } }
  if (!PARTS.includes('project')) { await ctx.close(); continue; }
  // project workspace: every view in the menu, its tabs, and its first create/edit dialog
  await page.goto(BASE + `/#/p/${pid}/dashreport`); await page.reload(); await page.waitForSelector('main.main', { state: 'attached', timeout: 20000 }); await page.waitForTimeout(800);
  const views = await page.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items.map(([id, l]) => [id, l])));
  if (!fs.existsSync(path.join(OUT, 'routes.json'))) fs.writeFileSync(path.join(OUT, 'routes.json'), JSON.stringify(views, null, 1));
  for (const [id, label] of views) {
    await page.evaluate(id => window.FWBViews.go(id), id).catch(() => { }); await page.waitForTimeout(700);
    const s = `p/${id}`; await audit(page, vp, s);
    if (vp.w >= 1280) { await walkTabs(page, vp, s); }
    if (vp.w === 1440 || vp.w === 390) await tryDialog(page, vp, s);
    await closeOverlays(page);
  }
  // sidebar footer and account menu inside a project
  const av2 = await page.$('.navbar .avatar'); if (av2 && await av2.isVisible()) { await av2.click(); await page.waitForTimeout(300); await audit(page, vp, 'project#account-menu'); await closeOverlays(page); }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const byRule = {}; for (const r of report) for (const i of r.issues) byRule[i.rule] = (byRule[i.rule] || 0) + 1;
console.log('screens', report.length, 'findings', report.reduce((a, r) => a + r.issues.length, 0), byRule);
