// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/claude-watch-check.mjs
// The optional Claude watcher (src/claudewatch.js) in the real page: switched OFF (the default) a request rings nothing and the Assistant behaves as before;
// switched ON the request rings the local doorbell with its job id and the Assistant says the watcher has it; the Claude setup page shows the section, the switch and the prompt.
// This test plays the watcher itself: a small listener on 127.0.0.1:47615 counts the rings (stop a real watcher first, or this test cannot listen).
import { chromium } from 'playwright'; import http from 'node:http';
const BASE = process.argv[2] || 'http://localhost:4173'; const rings = [];
const srv = http.createServer((q, s) => { const h = { 'access-control-allow-origin': q.headers.origin || 'null', 'access-control-allow-private-network': 'true', 'access-control-allow-methods': 'POST' }; if (q.method === 'POST') rings.push(new URL(q.url, 'http://x').searchParams.get('job')); s.writeHead(204, h); s.end(); });
await new Promise((ok, bad) => srv.once('error', bad).listen(47615, '127.0.0.1', ok));
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? '  ok  ' : '  FAIL ') + n + (d ? ' (' + d + ')' : '')); };
try {
  await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
  const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Watcher', customer: 'Watch Co' }) })).json()).project.id);
  await p.goto(BASE + `/?nointro#/p/${pid}/overview`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
  const send = t => p.evaluate(async t => window.FWBViews.askClaude(t, { title: t }), t);
  await p.evaluate(() => localStorage.removeItem('fwb_claude_watch'));
  check('send works with the watcher off (the default)', await send('Watcher off request')); await p.waitForTimeout(1200);
  check('with the watcher off nothing is rung', rings.length === 0, rings.length + ' rings');
  check('with the watcher off the Assistant shows no watcher message', !(await p.evaluate(() => /Your Claude watcher (has this request|did not answer)/.test((document.querySelector('#asst') || {}).textContent || ''))));
  await p.evaluate(() => localStorage.setItem('fwb_claude_watch', '1'));
  check('send works with the watcher on', await send('Watcher on request')); await p.waitForTimeout(1500);
  const jobs = await p.evaluate(async pid => (await (await fetch('/api/fn/api/projects/' + pid + '/jobs?status=all')).json()).jobs || [], pid);
  const last = jobs.filter(j => j.kind === 'chat').sort((x, y) => Date.parse(y.requestedAt || 0) - Date.parse(x.requestedAt || 0))[0];
  check('with the watcher on the new job is rung once, with its id', rings.length === 1 && last && rings[0] === last.id, rings.join(','));
  check('the Assistant says the watcher has the request', await p.evaluate(() => /Your Claude watcher has this request/.test((document.querySelector('#asst') || {}).textContent || '')));
  await new Promise(r => srv.close(r)); await send('Nobody listening'); await p.waitForTimeout(3500);
  check('when no watcher answers the Assistant says so and the request still waits for the queue', await p.evaluate(() => /did not answer/.test((document.querySelector('#asst') || {}).textContent || '')));
  await p.goto(BASE + `/?nointro#/p/${pid}/claudesetup`); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { const t = document.querySelector('[data-act="clTab"][data-v="jobs"]'); if (t) t.click(); }); await p.waitForTimeout(600);
  const setup = await p.evaluate(() => ({ text: document.body.textContent, sw: !!document.querySelector('[data-act="clWatch"]'), test: !!document.querySelector('[data-act="clWatchTest"]'), prompt: [...document.querySelectorAll('[data-act="hoCopyVal"]')].some(x => /Delivery Studio watcher/.test(x.getAttribute('data-val') || '')) }));
  check('Claude setup shows the optional watcher with its switch, test button and prompt', /Instant answers: the Claude watcher/.test(setup.text) && setup.sw && setup.test && setup.prompt);
  check('no page errors (the refused ring of the nobody-listening step is expected)', !errs.filter(e => !/127\.0\.0\.1:47615|ERR_CONNECTION_REFUSED/.test(e)).length, errs.slice(0, 3).join(' | '));
  await p.evaluate(() => localStorage.removeItem('fwb_claude_watch'));
} finally { await b.close(); try { srv.close(); } catch (e) { /* closed */ } }
const okAll = res.every(Boolean); console.log(`\n${res.filter(Boolean).length}/${res.length} watcher page checks passed`); process.exit(okAll ? 0 : 1);
