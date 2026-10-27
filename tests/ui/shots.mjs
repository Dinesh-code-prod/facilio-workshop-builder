// Targeted screenshots for review: node tests/ui/shots.mjs <outDir> <baseUrl> <spec>...
// spec = width:screen[:action]  screen = home | admin[/Section] | <view id>   action = dialog | menu | tab=<label> | click=<selector>
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [out, base, ...specs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const spec of specs) {
  const [w, screen, ...rest] = spec.split(':'); const action = rest.join(':'); const width = +w;
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : width < 1000 ? 1024 : 900 } });
  page.on('pageerror', e => console.log('PAGE ERROR', e.message)); page.on('dialog', d => d.dismiss());
  await page.goto(base + '/'); await page.waitForSelector('[data-act]');
  const pid = await page.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || []).sort((a, b) => b.name.length - a.name.length)[0]?.id);
  if (screen === 'home' || screen.startsWith('admin')) { await page.getByRole('button', { name: /open workspace/i }).first().click(); await page.waitForTimeout(900); }
  if (screen.startsWith('admin')) { await page.evaluate(() => window.FWBViews.ACT.openAdmin()); await page.waitForSelector('.adm-nav .adm-ni', { state: 'attached' }); const sec = screen.split('/')[1]; if (sec) await page.locator('.adm-nav .adm-ni', { hasText: sec }).first().click(); }
  else if (screen !== 'home') { await page.goto(base + `/#/p/${pid}/${screen}`); await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(500); await page.evaluate(v => window.FWBViews.go(v), screen); }
  await page.waitForSelector('#loading', { state: 'detached', timeout: 8000 }).catch(() => { }); await page.waitForTimeout(700);
  if (action.startsWith('tab=')) { await page.locator('.tabs > *, [role=tab], .dtab', { hasText: action.slice(4) }).first().click(); await page.waitForTimeout(600); }
  if (action === 'menu') { await page.click('.navbar .avatar'); await page.waitForTimeout(300); }
  if (action.startsWith('click=')) { await page.click(action.slice(6)); await page.waitForTimeout(700); }
  if (action === 'dialog') { for (const b of await page.$$('.page-header .btn, .page .btn, .adm-hero .btn')) { const t = (await b.innerText().catch(() => '')).trim(); if (/^(\+\s*)?(new|add|create|edit|import|invite|grant)\b/i.test(t) && await b.isVisible()) { await b.click(); break; } } await page.waitForTimeout(700); }
  const f = path.join(out, `${screen.replace(/\W+/g, '_')}_${action.replace(/\W+/g, '_') || 'page'}_${w}.png`); await page.screenshot({ path: f }); console.log(f); await page.close();
}
await browser.close();
