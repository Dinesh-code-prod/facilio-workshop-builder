// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/workshops-hubs-check.mjs
// Workshops & Requirements menu: three pages in order, Use Cases and MSA Scope Check are tabs, old links land in the right tab, no page errors.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Hubs', customer: 'H' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/transcripts`); await p.reload(); await p.waitForSelector('.hub-tabs', { timeout: 20000 });
const grp = await p.evaluate(() => { const n = (window.FWBViews.navFor() || []).find(g => /Workshops/.test(g.g)); return n ? n.items.map(i => i[1]) : []; });
check('the group has two pages, in working order', JSON.stringify(grp) === JSON.stringify(['Requirements & Data Onboarding', 'Checks & Validations']), grp.join(' > '));
check('hub tabs: transcripts and use cases', (await p.locator('.hub-tabs .tab').allInnerTexts()).join('|').replace(/\d+/g, '').includes('Transcripts & requirements|Use cases'));
await p.click('.hub-tabs [data-v="usecases"]'); await p.waitForSelector('h1:has-text("Use Cases")'); check('Use cases tab shows the use cases page with its own tabs under the hub tabs', (await p.locator('.hub-tabs + .tabs, .hub-tabs ~ .tabs').count()) >= 1);
await p.evaluate(() => window.FWBViews.go('msafind')); await p.waitForSelector('h1:has-text("MSA Scope Check")'); check('old link to MSA Scope Check lands in the Contract hub', (await p.locator('.hub-tabs [data-v="msafind"].active').count()) === 1 && /msaflow$/.test(await p.evaluate(() => location.hash)));
await p.evaluate(id => { location.hash = '#/p/' + id + '/usecases'; }, pid); await p.waitForSelector('.hub-tabs [data-v="usecases"].active', { timeout: 20000 }); check('a link to #/usecases opens the Use cases tab', true);
await p.click('.hub-tabs [data-v="transcripts"]'); await p.waitForTimeout(300); await p.evaluate(() => window.FWBViews.go('checks')); await p.waitForSelector('h1:has-text("Checks")'); check('Checks & Validations is one page again, without hub tabs', (await p.locator('.hub-tabs .tab').count()) === 0);
check('no page errors', !errs.length, errs.slice(0, 3).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
