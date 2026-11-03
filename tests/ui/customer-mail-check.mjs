// Project Settings > Project details > Customer emails: addresses are saved and come back after a reload, a shared-provider domain is refused with a plain message,
// the earlier-email search answers in words (here the local server has no mailbox, so it reports that instead of failing), and every Settings tab opens without errors.
// Usage: PW_CHANNEL=msedge node tests/ui/customer-mail-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; const U = Date.now().toString(36);   // unique per run: the dev server keeps its data and an address can belong to one project only
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Mail Demo', customer: 'Mail Co' }) })).json()).project.id);
const open = async () => { await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('#cm_emails', { timeout: 30000 }); await p.waitForTimeout(800); };
await open();
check('the Customer emails card is on the Project details tab', (await p.locator('.card-h h3', { hasText: 'Customer emails' }).count()) === 1);
await p.fill('#cm_emails', 'Priya@mail-co-' + U + '.com\nraj@mail-co-' + U + '.com'); await p.fill('#cm_domain', 'mail-co-' + U + '.com'); await p.click('[data-act="cmSave"]'); await p.waitForTimeout(900);
check('saving says so', /Saved/.test(await p.textContent('#cm_msg')), await p.textContent('#cm_msg'));
await open(); const back = await p.inputValue('#cm_emails');
check('the addresses and the domain are still there after a reload, in lower case', back.split('\n').join() === 'priya@mail-co-' + U + '.com,raj@mail-co-' + U + '.com' && (await p.inputValue('#cm_domain')) === 'mail-co-' + U + '.com', back.split('\n').join());
await p.fill('#cm_domain', 'gmail.com'); await p.click('[data-act="cmSave"]'); await p.waitForTimeout(700);
check('a shared provider domain is refused in plain words', /shared mail provider/i.test(await p.textContent('#cm_msg')), await p.textContent('#cm_msg'));
await p.fill('#cm_domain', 'mail-co-' + U + '.com'); await p.click('[data-act="cmFind"]'); await p.waitForTimeout(1500);
const found = (await p.textContent('#cm_msg')).trim(); check('Find earlier emails answers in words, never a blank or a crash', found.length > 10 && !/undefined|\[object/.test(found), found);
if (OUT) { await p.evaluate(() => document.querySelector('#cm_emails').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/customer-emails.png` }); }
for (const t of ['project', 'keep', 'access', 'config', 'exports', 'audit']) { await p.click(`.tab[data-v="${t}"]`); await p.waitForTimeout(500); check('tab ' + t + ' opens, one width', await p.evaluate(() => { const b = document.querySelector('.page-body.st-page'); return !!b && b.getBoundingClientRect().width <= 1182; })); }
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
