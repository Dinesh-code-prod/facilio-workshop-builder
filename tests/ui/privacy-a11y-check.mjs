// Privacy and data page (policy, retention, terms, download and deletion request) and keyboard access (Tab reaches clickable cards, Enter and Space use them, skip link, images have alt text).
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Privacy', customer: 'P' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/privacy`); await p.reload(); await p.waitForSelector('h1:has-text("Privacy and data")', { timeout: 20000 }); await p.waitForTimeout(800);
const txt = await p.locator('main').innerText();
check('the page shows what is stored, retention, cookies and the terms', /What is stored and who can see it/.test(txt) && /How long data is kept/.test(txt) && /no cookies of its own/.test(txt) && /Terms of use/.test(txt));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('[data-act="dsrDownload"]')]); check('Download my data gives a JSON file', /\.json$/.test(dl.suggestedFilename()));
await p.click('[data-act="dsrRequest"]'); await p.waitForSelector('.dialog [data-r="1"]'); await p.click('.dialog [data-r="1"]'); await p.waitForTimeout(800); check('a deletion request is recorded and shown', /Deletion request/.test(await p.locator('main').innerText()));
// keyboard
await p.goto(BASE + `/?nointro#/p/${pid}/overview`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
check('there is a Skip to content link', (await p.locator('a.skip-link').count()) === 1);
const missing = await p.evaluate(() => [...document.querySelectorAll('[data-act]')].filter(e => !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.tagName) && !e.hasAttribute('tabindex')).length); check('every clickable non-button element can be reached with Tab', missing === 0, missing + ' missing');
const noAlt = await p.evaluate(() => [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length); check('every image has an alt attribute', noAlt === 0, noAlt + ' without');
await p.keyboard.press('Tab'); check('the first Tab stop is the Skip to content link', (await p.evaluate(() => document.activeElement.id)) === 'skipLink');
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
