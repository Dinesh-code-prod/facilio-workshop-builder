// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/task-suggestions-check.mjs
// Tasks page, "Claude suggestions" panel (src/tasks.js) in a browser against the local preview: pending suggestions are listed with their reason and source, Accept saves the
// task through the normal save and removes the row, a refused Accept (bad owner) keeps the row and the task, Dismiss removes the row, and the panel does not appear when nothing is waiting.
// The same flow was checked by hand in the Browser pane against the local preview (Playwright's browsers were not installed when this was written, so this script itself has not been run).
// Usage: NO_PERSIST=1 node tests/ui/devserver.mjs 4173   then   node tests/ui/task-suggestions-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d, h) => (await fetch('/api/fn/api' + u, { method: m, headers: Object.assign({ 'content-type': 'application/json' }, h || {}), body: d ? JSON.stringify(d) : undefined })).json();
  const pr = (await api('POST', '/projects', { name: 'Suggestions', customer: 'Acme' })).project;
  await api('PUT', `/projects/${pr.id}/items/task/a`, { data: { title: 'Collect asset list', type: 'Other', status: 'In Progress' } });
  await api('PUT', `/projects/${pr.id}/items/task/b`, { data: { title: 'Write BRD section', type: 'Other', status: 'To Do' } });
  const src = { type: 'transcript', ref: 'tr-1 line 4', quote: 'It is finished' };
  await api('POST', '/', { project: pr.id, suggestions: [{ action: 'close', taskId: 'a', fields: { completion: 'Received' }, reason: 'Customer said it was sent', source: src }, { action: 'update', taskId: 'b', fields: { owner: 'stranger@facilio.com' }, reason: 'Moved to a stranger', source: src }, { action: 'create', fields: { title: 'Send the plan' }, reason: 'Agreed in the call', source: { type: 'minutes', ref: 'm1' } }] }, { 'x-work-mcp': '1', 'x-work-mcp-tool': 'save_task_suggestions' });
  return pr.id;
});
await p.goto(BASE + `/#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('.pt-sg .pt-sg-row', { timeout: 20000 });
const rows = () => p.$$eval('.pt-sg .pt-sg-row', r => r.map(x => x.innerText));
let r = await rows(); check('three suggestions are listed under the KPIs', r.length === 3, r.length); check('each shows the reason and the source', r.every(x => /Why: /.test(x) && /Source: /.test(x)) && /Customer said it was sent/.test(r.join()) && /transcript tr-1 line 4/.test(r.join()));
check('nothing changed in the tasks by being listed', await p.evaluate(() => window.FWBViews.items.get('task', 'a').status === 'In Progress'));
await p.screenshot({ path: OUT + '/task-suggestions.png' });
await p.click('.pt-sg-row:has-text("Collect asset list") [data-act="tkSgAccept"]'); await p.waitForFunction(() => window.FWBViews.items.get('task', 'a').status === 'Done', null, { timeout: 15000 });
r = await rows(); check('Accept closes the task through the normal save and removes the row', r.length === 2 && !r.join().includes('Collect asset list'), r.length);
await p.click('.pt-sg-row:has-text("Write BRD section") [data-act="tkSgAccept"]'); await p.waitForTimeout(1500);
r = await rows(); check('an Accept the task rules refuse keeps the row and leaves the task alone', r.length === 2 && (await p.evaluate(() => !window.FWBViews.items.get('task', 'b').owner)));
await p.click('.pt-sg-row:has-text("Write BRD section") [data-act="tkSgDismiss"]'); await p.waitForFunction(() => document.querySelectorAll('.pt-sg .pt-sg-row').length === 1, null, { timeout: 15000 });
check('Dismiss removes the row and changes no task', (await p.evaluate(() => !window.FWBViews.items.get('task', 'b').owner)));
await p.click('.pt-sg-row:has-text("Send the plan") [data-act="tkSgAccept"]'); await p.waitForFunction(() => window.FWBViews.items.list('task').some(t => t.title === 'Send the plan'), null, { timeout: 15000 });
await p.waitForFunction(() => !document.querySelector('.pt-sg'), null, { timeout: 15000 }); check('a new task is made, and the panel disappears when nothing is waiting', true);
check('no script errors', errs.length === 0, errs.join(' | ')); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
