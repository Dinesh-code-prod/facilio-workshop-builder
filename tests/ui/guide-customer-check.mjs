// Customer User Guide as the customer sees it: publish the guide, preview as the customer, open the guide and one module. Checks the module list, section chips and answers strip use Facilio colours and nothing overlaps.
// Usage: PW_CHANNEL=msedge node tests/ui/guide-customer-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).id);
await p.goto(`${BASE}/?nointro#/p/${id}/guide`); await p.reload(); await p.waitForTimeout(3500);
await p.evaluate(() => { const F = window.FWB; F.allModules().filter(m => /^(service request|work order)$/i.test(m.label)).forEach(m => { F.S.ws.modules[m.name] = Object.assign(F.S.ws.modules[m.name] || {}, { inScope: true }); }); window.FWBViews.render(); });
await p.waitForSelector('[data-act="publishGuide"]'); await p.evaluate(() => document.querySelector('[data-act="publishGuide"]').click()); await p.waitForTimeout(800);
await p.evaluate(() => { const ok = [...document.querySelectorAll('button')].find(x => /^publish$/i.test(x.textContent.trim())); if (ok) ok.click(); }); await p.waitForTimeout(2500);
check('the guide is published', await p.evaluate(() => !!(window.FWB.doc('guide_published') || {}).publishedAt));
await p.evaluate(() => window.FWBViews.ACT.custPreview()); await p.waitForTimeout(3000);
await p.evaluate(() => window.FWBViews.go('guide')); await p.waitForTimeout(2500);
check('the customer sees the guide with the module list', await p.evaluate(() => !!document.querySelector('.wb-nav') && document.querySelectorAll('.wb-mod').length >= 2), await p.evaluate(() => [...document.querySelectorAll('.wb-mod')].map(x => x.textContent.trim()).join(' | ')));
if (OUT) await p.screenshot({ path: OUT + '/customer-guide-1.png' });
await p.evaluate(() => { const m = document.querySelectorAll('.wb-mod')[1]; if (m) m.click(); }); await p.waitForTimeout(2000);
if (OUT) await p.screenshot({ path: OUT + '/customer-guide-2.png' });
const col = await p.evaluate(() => { const on = document.querySelector('.wb-mod.on'); const chip = document.querySelector('.gl-jump button'); const strip = document.querySelector('.gl-strip'); const g = e => e ? getComputedStyle(e).backgroundColor : ''; return { on: g(on), strip: g(strip), chip: g(chip) }; });
const violet = c => /rgb\((10[0-9]|1[0-2][0-9]), ?(5[0-9]|6[0-9]|7[0-9]), ?(2[0-4][0-9])\)/.test(c || '');   // roughly #6a3df0 and the nearby purples
check('no violet on the module list, strip or chips', !violet(col.on) && !violet(col.strip) && !violet(col.chip), JSON.stringify(col));
const over = await p.evaluate(() => [...document.querySelectorAll('.wb-mod')].filter(x => x.scrollWidth > x.clientWidth + 1).length);
check('no module name is cut off or overlapping', over === 0, 'overflowing: ' + over);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); const ok = res.filter(Boolean).length; console.log(`${ok}/${res.length} checks passed`); process.exit(ok === res.length ? 0 : 1);
