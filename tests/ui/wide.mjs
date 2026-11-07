// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/wide.mjs
import { chromium } from 'playwright';
const [view, w, tab] = process.argv.slice(2); const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: +w, height: 844 } });
await p.goto('http://localhost:4173/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || []).sort((a, b) => b.name.length - a.name.length)[0]?.id);
if (view.startsWith('admin')) { await p.getByRole('button', { name: /open workspace/i }).first().click(); await p.waitForTimeout(900); await p.evaluate(() => window.FWBViews.ACT.openAdmin()); await p.waitForSelector('.adm-nav .adm-ni', { state: 'attached' }); await p.locator('.adm-nav .adm-ni', { hasText: view.split('/')[1] }).first().click(); await p.waitForTimeout(1500); } else { await p.goto(`http://localhost:4173/#/p/${pid}/${view}`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500); }
if (tab) { await p.locator('.tabs > *', { hasText: tab }).first().click(); await p.waitForTimeout(800); }
console.log(await p.evaluate(() => { const W = document.documentElement.clientWidth; const out = [];
  for (const e of document.querySelectorAll('body *')) { if (e.scrollWidth > W + 1 && getComputedStyle(e).overflowX === 'visible') { const kids = [...e.children].some(k => k.scrollWidth > W + 1 && getComputedStyle(k).overflowX === 'visible'); if (!kids) out.push(e.tagName + '.' + [...e.classList].join('.') + ' sw=' + e.scrollWidth + ' cw=' + e.clientWidth + ' :: ' + (e.innerText || '').slice(0, 60).replace(/\s+/g, ' ')); } }
  return document.documentElement.scrollWidth + '\n' + out.slice(0, 12).join('\n'); }));
await b.close();
