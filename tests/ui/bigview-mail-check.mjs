// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/bigview-mail-check.mjs [baseUrl]
// Tasks page: the open task has a "Bigger view" button that widens its drawer; the Mail tab has a "Bigger view" that fills the window and Esc closes;
// Reply and Reply all write a ready draft from the mail (greeting, thanks, task state, the questions asked, attachments) and Reply all names the people copied;
// Forward and Open in Outlook build an Outlook link with the draft text and the quoted mail.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await ctx.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(String(u)); return {}; }; });
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d) => (await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: d ? JSON.stringify(d) : undefined })).json();
  const pr = (await api('POST', '/projects', { name: 'Big view', customer: 'Acme' })).project;
  await api('PUT', `/projects/${pr.id}/items/task/a`, { data: { title: 'Task a', type: 'Other', status: 'To Do' } });
  return pr.id;
});
await p.goto(BASE + `/#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('.pt-page', { timeout: 20000 });
// the open task
await p.evaluate(() => { window.FWBViews.ACT.tkOpen && window.FWBViews.ACT.tkOpen({ getAttribute: k => (k === 'data-id' ? 'a' : null) }); });
await p.waitForSelector('#drawer .drawer.wide', { timeout: 8000 }).catch(() => { });
const w0 = await p.evaluate(() => { const d = document.querySelector('#drawer .drawer'); return d ? d.getBoundingClientRect().width : 0; });
check('the open task has a Bigger view button', (await p.locator('#drawer [data-act="drawerFull"]').count()) === 1);
await p.click('#drawer [data-act="drawerFull"]'); await p.waitForTimeout(500);
const w1 = await p.evaluate(() => document.querySelector('#drawer .drawer').getBoundingClientRect().width);
check('it widens the task to nearly the whole window, and a second press goes back', w1 > w0 + 100 && w1 > 1300, w0 + ' -> ' + w1);
await p.click('#drawer [data-act="drawerFull"]'); await p.waitForTimeout(400);
check('Smaller view restores the width', await p.evaluate(w => Math.abs(document.querySelector('#drawer .drawer').getBoundingClientRect().width - w) < 5, w0));
await p.evaluate(() => window.FWBViews.ACT.closeDrawer());
// the Mail tab with two sample messages
await p.evaluate(() => {
  const F = window.FWB, V = window.FWBViews; F.S.ui.tkTab = 'mail';
  const mk = (id, status, extra) => Object.assign({ id, status, scenario: 'to', title: 'Update the SLA rule', route: { label: 'Solution' }, mail: { subject: 'SLA alert wording', from: { name: 'Priya Nair', email: 'priya@acme.test' }, to: [F.S.user.email, 'ravi@acme.test'], cc: ['sam@acme.test'], receivedAt: '2026-11-08T10:00:00Z', body: 'Please send the alert by email too. Can you confirm the weekly report time? Also what about Teams?', attachments: [{ name: 'sla-v2.pdf', type: 'application/pdf', size: 2048 }] } }, extra || {});
  F.S.ui.mlBox = { pid: F.S.project.id, list: [mk('m1', 'pending'), mk('m2', 'accepted', { resolvedAt: '2026-11-09', resolvedWhy: 'the SLA rule is updated' })], at: Date.now() + 1e9 };
  V.render();
});
await p.waitForSelector('.ol-wrap', { timeout: 8000 });
const s0 = await p.evaluate(() => getComputedStyle(document.querySelector('.ol-wrap')).position);
await p.click('[data-act="mlWide"]'); await p.waitForTimeout(300);
check('the Mail tab has a Bigger view that fills the window', s0 !== 'fixed' && await p.evaluate(() => { const r = document.querySelector('.ol-wrap').getBoundingClientRect(); return getComputedStyle(document.querySelector('.ol-wrap')).position === 'fixed' && r.width >= innerWidth - 2 && r.height >= innerHeight - 2; }));
// Reply all
await p.click('.ol-tb [data-act="mlComp"][data-all="1"]'); await p.waitForTimeout(300);
const txt = await p.inputValue('#mlReply');
check('Reply all writes a ready draft: greeting, thanks, attachment, the task state and the questions asked', /^Hi all,/.test(txt) && /sla-v2\.pdf/.test(txt) && /reviewing it|plan as/.test(txt) && /Can you confirm the weekly report time\?/.test(txt) && /\[your answer\]/.test(txt), txt.slice(0, 160));
check('and it names the people who are copied', /Reply all: Priya Nair and 2 more/.test(await p.textContent('.ol-ct b')), await p.textContent('.ol-ct b'));
await p.click('[data-act="mlOpenReply"]'); await p.waitForTimeout(300);
const url = decodeURIComponent((await p.evaluate(() => window.__opened.slice(-1)[0])) || '');
check('Open in Outlook sends the draft, the To, the Cc and the quoted mail to the Outlook link', /to=priya@acme\.test/.test(url) && /cc=ravi@acme\.test;sam@acme\.test/.test(url) && /subject=Re: SLA alert wording/.test(url) && /Hi all,/.test(url), url.slice(0, 220));
// Reply to the second (done) mail: the draft says it is done
await p.click('.ol-row:nth-child(2)'); await p.waitForTimeout(300); await p.click('.ol-tb [data-act="mlComp"]:not([data-all])'); await p.waitForTimeout(300);
const t2 = await p.inputValue('#mlReply');
check('Reply on a finished task says it is done and quotes what was done', /^Hi Priya,/.test(t2) && /This is now done: the SLA rule is updated/.test(t2), t2.slice(0, 140));
// Forward
await p.click('.ol-tb [data-act="mlFwd"]'); await p.waitForTimeout(300);
const f = decodeURIComponent((await p.evaluate(() => window.__opened.slice(-1)[0])) || '');
check('Forward opens Outlook with a short note, the task and the quoted mail', /subject=Fw: SLA alert wording/.test(f) && /Forwarding this mail from Priya Nair/.test(f) && /sla-v2\.pdf/.test(f) && /Original message/.test(f), f.slice(0, 200));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
check('Esc closes the big mail view', await p.evaluate(() => getComputedStyle(document.querySelector('.ol-wrap')).position !== 'fixed'));
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
