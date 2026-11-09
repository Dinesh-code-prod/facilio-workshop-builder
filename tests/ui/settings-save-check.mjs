// Project Settings (9 Nov 2026) in a real browser: every section that saves as you type has a Save button, and the team table lets you pick a person's App access in the same row.
// Usage: node tests/ui/settings-save-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('.st-sec', { timeout: 20000 }); await p.waitForTimeout(1500);
const saves = await p.evaluate(() => [...document.querySelectorAll('.st-sec')].map(s => ({ t: s.querySelector('h3') && s.querySelector('h3').textContent, save: !!s.querySelector('[data-act="saveSection"],[data-act="saveProject"],[data-act="cmSave"]') })));
const need = ['Project', 'Customer', 'Implementation team', 'Customer stakeholders', 'Customer emails', 'Background and objectives'];
check('every editable section has its own Save button', need.every(n => (saves.find(s => s.t === n) || {}).save), JSON.stringify(saves.filter(s => !s.save).map(s => s.t)));
check('the autosaving sections say so beside the button', (await p.locator('.st-foot .st-hint').count()) >= 4);
// add a team member row, type an email, and the same row offers the App access picker
await p.click('[data-act="addPerson"][data-k="team"]'); await p.waitForTimeout(400);
const rows = p.locator('.st-sec:has(h3:text-is("Implementation team")) tbody tr'); const last = rows.last();
await last.locator('input').nth(2).fill('new.person@facilio.com'); await last.locator('input').nth(2).blur(); await p.waitForTimeout(600);
const acc = await p.evaluate(() => { const s = [...document.querySelectorAll('select[data-change="teamAccess"]')].find(x => x.getAttribute('data-email') === 'new.person@facilio.com'); return s ? [...s.options].map(o => o.textContent) : null; });
check('the row offers No access / Viewer / Editor / Owner as soon as an email is typed', acc && acc.join(',') === 'No access,Viewer,Editor,Owner', JSON.stringify(acc));
check('the old "Give access" button is gone', (await p.locator('[data-act="grantAccess"]').count()) === 0);
await p.click('.st-sec:has(h3:text-is("Implementation team")) [data-act="saveSection"]'); await p.waitForSelector('.toast', { timeout: 5000 }).catch(() => { });
const toast = await p.evaluate(() => (document.querySelector('.toast') || {}).textContent || ''); check('Save confirms with a message', /Implementation team saved/.test(toast), toast);
await p.click('.st-sec:has(h3:text-is("Implementation team")) tbody tr:last-child [data-act="rmPerson"]'); await p.waitForTimeout(300);   // leave the demo project as it was
// People & access: the add form says what it does
await p.click('[data-act="setTab"][data-v="access"]'); await p.waitForSelector('#mb_email'); const addBtn = await p.evaluate(() => (document.querySelector('[data-act="addMember"]') || {}).textContent);
check('the member form adds and gives access in one button', /Add and give access/.test(addBtn || ''), addBtn);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
