// The chat's exact answers (src/quickfacts.js + src/qengine.js) in a real browser, on real task records: "pending tasks" and then "tasks on high priority" must give DIFFERENT, correct answers,
// follow-ups reuse the last question, and questions it cannot read are left for the AI. Usage: node tests/ui/chat-understand-check.mjs [baseUrl]   (set PW_CHANNEL=msedge if needed)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
const put = (id, data) => p.evaluate(async ([pid, id, data]) => (await fetch(`/api/fn/api/projects/${pid}/items/task/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) })).status, [pid, id, data]);
const mk = [['tq_a', { title: 'ZQ urgent vendor call', status: 'To Do', priority: 'High', due: '2020-01-02' }], ['tq_b', { title: 'ZQ write minutes', status: 'To Do', priority: 'Low' }], ['tq_c', { title: 'ZQ plain item', status: 'To Do' }], ['tq_d', { title: 'ZQ finished item', status: 'Done', priority: 'High' }]];
for (const [id, d] of mk) { const st = await put(id, d); if (st !== 200) console.log('could not add', id, st); }
await p.goto(BASE + `/?nointro#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('.sidebar', { timeout: 20000 }); await p.waitForTimeout(1500);
const ask = q => p.evaluate(async q => { const V = window.FWBViews; let r = V.quickFacts(q); if (!r) { await new Promise(x => setTimeout(x, 1200)); r = V.quickFacts(q); } return r ? r.text : null; }, q);
const a1 = await ask('what are the pending tasks'); check('"pending tasks" lists the open tasks, not the finished one', a1 && /I read this as: open tasks/.test(a1) && /ZQ urgent vendor call/.test(a1) && /ZQ write minutes/.test(a1) && !/ZQ finished item/.test(a1), (a1 || 'null').split('\n')[1]);
const a2 = await ask('what are the tasks on high priority'); check('"tasks on high priority" is a different answer: only the high-priority open task', a2 && /with high priority/.test(a2) && /ZQ urgent vendor call/.test(a2) && !/ZQ write minutes/.test(a2) && !/ZQ plain item/.test(a2) && a2 !== a1, (a2 || 'null').split('\n').slice(0, 3).join(' | '));
const a3 = await ask('which of those are overdue'); check('a follow-up ("which of those are overdue") keeps high priority and adds overdue', a3 && /overdue/.test(a3) && /ZQ urgent vendor call/.test(a3) && /high priority/.test(a3), (a3 || 'null').split('\n')[0]);
const a4 = await ask('low priority tasks'); check('low priority reads its own level', a4 && /ZQ write minutes/.test(a4) && !/ZQ urgent/.test(a4));
const a5 = await ask('how many tasks are done'); check('a count of finished tasks', a5 && /finished task/.test(a5), (a5 || 'null').split('\n')[1]);
const a6 = await ask('tasks about vendor'); check('a word in the title filters the list', a6 && /ZQ urgent vendor call/.test(a6) && !/ZQ write minutes/.test(a6));
const a7 = await ask('draft a reply to the customer about these tasks'); check('a request to write something is left for the AI (no canned list)', a7 === null);
const a8 = await ask('why are the tasks late'); check('a "why" question is left for the AI', a8 === null);
const h = await p.evaluate(() => window.FWBViews.quickHint('what are the tasks on high priority')); check('the AI gets the same reading as a hint', /open tasks with high priority/.test(h), h);
for (const [id] of mk) await p.evaluate(async ([pid, id]) => fetch(`/api/fn/api/projects/${pid}/items/task/${id}`, { method: 'DELETE' }), [pid, id]);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
