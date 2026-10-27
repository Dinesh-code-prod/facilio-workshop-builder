// Project Inbox in the browser, against the preview server started with FAKE_GRAPH=1 (a local stand-in mailbox and Teams).
// Checks filing by project address and conversation, the unassigned path, Teams notices and their deep link, search and filters,
// plain-text bodies, attachments, status, the "check original" path, access from outside the project, and phone layout.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4175'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const api = (m, path, body) => p.evaluate(async ({ m, path, body }) => { const r = await fetch('/api/fn/api' + path, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }, { m, path, body });
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
let r = await api('POST', '/projects', { name: 'Acme Facilities rollout', customer: 'Acme Facilities' }); const pid = r.data.project.id;
await api('PUT', '/mail/rules', { rules: [{ match: 'acme-delivery@facilio.com', projectId: pid, on: 'to' }] }); await api('PUT', '/mail/settings', { teamsOn: true, teamsChannel: 'delivery-mail', autoTicket: true });
await p.goto(BASE + `/#/p/${pid}/inbox`); await p.reload(); await p.waitForSelector('.ib-row', { timeout: 20000 }).catch(() => { });
let rows = await p.$$eval('.ib-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
check('opening the Inbox checks the mailbox and files the project emails', rows.length === 3, rows.length + ' emails');
check('new emails show as unread', (await p.$$('.ib-row.unread')).length === 3);
const teams = await (await fetch(BASE + '/__teams')).json();
const pn = teams.filter(t => /Acme Facilities rollout/.test(t.title)), un = teams.filter(t => /waiting to be assigned/.test(t.title));
check('a Teams notice for each project email, to the configured channel', pn.length === 3 && pn.every(t => t.channel === 'delivery-mail'), pn.length + ' notices');
check('notices say they are automated and carry sender, subject, time, project', pn.every(t => /Automated Delivery Studio notification/.test(t.text) && t.facts.map(f => f.title).join() === 'From,Subject,Received,Project'));
check('the unmatched vendor email is parked for review and noticed', un.length === 1);
// search and filter
await p.fill('#ibQ', 'asset'); await p.waitForTimeout(200); check('search by text', (await p.$$('.ib-row')).length === 1); await p.fill('#ibQ', ''); await p.waitForTimeout(200);
// read G1 with its reply
await p.locator('.ib-row', { has: p.locator('.ib-l2', { hasText: /^Kick-off agenda/ }) }).click(); await p.waitForSelector('.ib-thread .ib-msg');
const th = await p.$$eval('.ib-thread .ib-msg', els => els.length); check('the conversation shows the reply with it', th === 2, th + ' messages');
const bodyHtml = await p.$eval('.ib-msg.cur .ib-body', e => ({ b: e.querySelectorAll('b').length, text: e.textContent }));
check('email bodies are plain text (markup shown, not run)', bodyHtml.b === 0 && bodyHtml.text.includes('<b>Thanks</b>'));
await p.screenshot({ path: `${OUT}/inbox-desktop.png` });
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('.ib-msg.cur .ib-att >> nth=0')]);
let bytes = ''; if (dl) { const f = await dl.path(); bytes = fs.readFileSync(f).toString().slice(0, 8); } check('a listed attachment downloads as a file', bytes.startsWith('%PDF'), dl ? dl.suggestedFilename() : 'no download');
await p.click('.ib-msg.cur .ib-att >> nth=1'); const big = await p.waitForSelector('.toast.err', { timeout: 5000 }).then(e => e.textContent(), () => ''); check('an attachment over 3 MB points to Outlook instead', /3 MB/.test(big), big.slice(0, 60));
await p.click('[data-act="ibStatus"][data-v="handled"]'); await p.waitForTimeout(400);
check('mark handled updates the email and the list', (await p.textContent('.ib-meta')).includes('Handled') && (await p.$$('.ib-row .ib-h')).length === 1);
await p.click('[data-act="ibRefresh"]'); await p.waitForTimeout(400); check('check original: still in the mailbox', (await p.textContent('.ib-meta')).includes('Still in the mailbox'));
check('Open in Outlook links to Outlook only', await p.$eval('.ib-acts a.btn', a => /^https:\/\/outlook\./.test(a.href) && a.rel.includes('noopener')));
await p.click('.ib-row:has-text("Asset register")'); await p.waitForSelector('.ib-thread .ib-msg'); await p.click('[data-act="ibRefresh"]'); await p.waitForTimeout(400);
check('check original: deleted or moved is shown, the stored copy stays', (await p.textContent('.ib-meta')).includes('Not in the mailbox'));
check('emails became tickets (automatic tickets on)', (await p.$$eval('.ib-meta a.tag', e => e.length)) === 1);
// the Teams deep link opens that email
const link = pn.find(t => /Asset register/.test(t.facts[1].value)).actions[0].url; const path = link.replace(/^https:\/\/[^/]+/, '');
const p2 = await ctx.newPage(); await p2.goto(BASE + path); await p2.reload(); await p2.waitForSelector('.ib-head h2', { timeout: 15000 }).catch(() => { });
check('the Teams link opens that email in the project Inbox', ((await p2.textContent('.ib-head h2').catch(() => '')) || '').includes('Asset register'), path.slice(0, 60)); await p2.close();
// someone outside the project
await ctx.addCookies([{ name: 'dev_user', value: 'someone.else@facilio.com', url: BASE }]);
r = await api('GET', `/projects/${pid}/mail`); check('someone outside the project cannot read its Inbox', r.status === 404, 'status ' + r.status);
await ctx.clearCookies();
// phone
const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); await ph.goto(BASE + `/#/p/${pid}/inbox`); await ph.reload(); await ph.waitForSelector('.ib-row', { timeout: 15000 }).catch(() => { });
const over = await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check('phone: no sideways scrolling', over <= 1, over + 'px'); await ph.screenshot({ path: `${OUT}/inbox-phone.png`, fullPage: false }); await ph.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
