// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/bell-project-check.mjs [baseUrl]
// Bell pop-ups (src/bell.js popNew, 25 Nov 2026): inside a project only that project's notices pop up; another project's stay in the bell list.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Bell check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForTimeout(2500);
// a stand-in for the server list: one notice of this project, one of another project
await p.evaluate(pid => { sessionStorage.removeItem('fwb_notif_popped'); document.querySelectorAll('.nt-pop').forEach(e => e.remove());
  // a pop-up removes itself after 9 s and the bell checks every 15 s, so record each one as it appears
  window.__pops = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('nt-pop')) window.__pops.push(n.textContent); }))).observe(document.body, { childList: true, subtree: true });
  window.FWBViews.notifyItems = () => [{ id: 'sv-a1', sid: 'a1', srv: true, kind: 'srv', pid, title: 'Done: THIS project job', text: 'Done: THIS project job', at: new Date().toISOString() },
    { id: 'sv-b1', sid: 'b1', srv: true, kind: 'srv', pid: 'p_other_project', pname: 'ZZ other', title: 'Done: OTHER project job', text: 'ZZ other: Done: OTHER project job', at: new Date().toISOString() }]; }, pid);
await p.waitForTimeout(16500);
const pops = await p.evaluate(() => window.__pops);
check("this project's notice pops up", pops.some(t => /THIS project job/.test(t)), pops.join(' | '));
check("another project's notice does not pop up here", !pops.some(t => /OTHER project job/.test(t)), pops.join(' | '));
await p.click('[data-act="bellOpen"]'); await p.waitForTimeout(600);
check("another project's notice is still in the bell list", /OTHER project job/.test(await p.evaluate(() => (document.getElementById('bellPop') || {}).textContent || '')));
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' bell checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
