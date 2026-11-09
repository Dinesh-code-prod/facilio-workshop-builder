// Project Settings (9 Nov 2026) in a real browser: three tabs (Project details, People & access, History); People & access holds the team (App access picked in the same row) and the customer side;
// every section that saves as you type has a Save button; no org package, exports or "keeping the project" tab; History is a day-by-day timeline.
// Usage: node tests/ui/settings-save-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('.st-sec', { timeout: 20000 }); await p.waitForTimeout(1500);
const heads = async () => p.evaluate(() => [...document.querySelectorAll('.st-sec')].map(s => ({ t: s.querySelector('h3') && s.querySelector('h3').textContent, save: !!s.querySelector('[data-act="saveSection"],[data-act="saveProject"],[data-act="cmSave"]') })));
const tabs = await p.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map(x => x.textContent.trim()));
check('three tabs: Project details, People & access, History (no org package, exports or keeping tab)', tabs.join('|') === 'Project details|People & access|History', tabs.join('|'));
let h = await heads(); const names = h.map(x => x.t);
check('Project details holds only the project, the customer, the background and archive', ['Project', 'Customer', 'Background and objectives'].every(n => names.includes(n)) && !names.some(n => /team|stakeholder|emails/i.test(n)), names.join(' | '));
check('each of those sections saves with a button', ['Project', 'Customer', 'Background and objectives'].every(n => (h.find(x => x.t === n) || {}).save));
check('no organisation id or package name shows anywhere in settings', !/\b4000000\d+|standalone_package/i.test(await p.evaluate(() => document.body.innerText)));
// People & access: team
await p.click('.tab[data-v="access"]'); await p.waitForSelector('[data-act="accTab"]'); h = await heads(); const t1 = h.map(x => x.t);
check('People & access opens on Team: the team list and Add a person', t1.includes('Implementation team') && t1.includes('Add a person') && (h.find(x => x.t === 'Implementation team') || {}).save, t1.join(' | '));
await p.click('.st-sec:has(h3:text-is("Implementation team")) [data-act="addPerson"]'); await p.waitForTimeout(400);
const last = p.locator('.st-sec:has(h3:text-is("Implementation team")) tbody tr:has(input)').last(); await last.locator('input').nth(2).fill('new.person@facilio.com'); await last.locator('input').nth(2).blur(); await p.waitForTimeout(700);
const acc = await p.evaluate(() => { const s = [...document.querySelectorAll('select[data-change="teamAccess"]')].find(x => x.getAttribute('data-email') === 'new.person@facilio.com'); return s ? [...s.options].map(o => o.textContent) : null; });
check('the row offers No access / Viewer / Editor / Owner as soon as an email is typed', acc && acc.join(',') === 'No access,Viewer,Editor,Owner', JSON.stringify(acc));
check('the add form gives access in one button', /Add and give access/.test(await p.evaluate(() => (document.querySelector('[data-act="addMember"]') || {}).textContent || '')));
await p.click('.st-sec:has(h3:text-is("Implementation team")) [data-act="saveSection"]'); await p.waitForSelector('.toast', { timeout: 5000 }).catch(() => { });
check('Save confirms with a message', /Implementation team saved/.test(await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || '')));
await p.locator('.st-sec:has(h3:text-is("Implementation team")) [data-act="rmPerson"]').last().click(); await p.waitForTimeout(300);   // leave the demo project as it was
// People & access: customer
await p.click('[data-act="accTab"][data-v="customer"]'); await p.waitForSelector('#cm_emails'); h = await heads(); const t2 = h.map(x => x.t);
check('Customer: stakeholders, customer emails, customer access and what the customer sees', ['Customer stakeholders', 'Customer emails', 'Customer access', 'What the customer sees'].every(n => t2.includes(n)), t2.join(' | '));
check('the stakeholder section has a Save button', (h.find(x => x.t === 'Customer stakeholders') || {}).save);
// History
await p.click('.tab[data-v="audit"]'); await p.waitForSelector('.hs-bar', { timeout: 15000 }); await p.waitForTimeout(500);
const hs = await p.evaluate(() => ({ chips: document.querySelectorAll('.hs-bar .rs-chip').length, days: document.querySelectorAll('.hs-day h3').length, rows: document.querySelectorAll('.hs-row').length, empty: !!document.querySelector('.empty') }));
check('History has filter chips and a day-by-day list (or a clear empty message)', hs.chips >= 6 && ((hs.days >= 1 && hs.rows >= 1) || hs.empty), JSON.stringify(hs));
// an old link to a removed tab lands on a real one
await p.evaluate(() => { window.FWB.S.ui.setTab = 'orgx'; window.FWBViews.render(); }); await p.waitForTimeout(500);
check('a saved or linked "orgx" tab still opens Project details', await p.evaluate(() => /Project details/.test(document.querySelector('.tab.active') ? document.querySelector('.tab.active').textContent : '')));
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
