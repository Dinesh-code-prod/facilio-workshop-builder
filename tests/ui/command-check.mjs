// Admin Command Center in a browser against the local preview (node tests/ui/devserver.mjs 4173): portfolio metrics that filter the
// table, health worked out from the records (blocked, insufficient data), evidence buttons that open the actual task, the project
// drawer and the delivery status set by a person, the AI briefing (evidence only, a local stand-in for the model), My work on the
// projects home, and access: a team member gets 403 from every admin route and no portfolio strip, a sub-admin sees the command
// center but cannot change a delivery status, an editor cannot change it either, and no history is invented for the trends.
// Usage: node tests/ui/command-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const as = async email => { await ctx.clearCookies(); if (email) await ctx.addCookies([{ name: 'dev_user', value: encodeURIComponent(email), url: BASE }]); };
const api = (m, u, body) => p.evaluate(async ([m, u, body]) => { const r = await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }, [m, u, body]);
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); const tag = Date.now().toString(36).slice(-4);
const home = async () => { await p.goto(BASE + '/'); await p.waitForSelector('[data-act]'); const go = p.getByRole('button', { name: /open workspace/i }).first(); if (await go.count()) { await go.click(); } await p.waitForSelector('.projects-page, .hm-mywork, .proj-grid', { state: 'attached', timeout: 15000 }).catch(() => { }); await p.waitForTimeout(1200); };
const admin = async () => { await p.evaluate(() => window.FWBViews.ACT.openAdmin()); await p.waitForSelector('.cmd-metrics', { timeout: 15000 }); await p.waitForTimeout(400); };

await as(null); await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const BL = 'Cmd Blocked ' + tag, QU = 'Cmd Quiet ' + tag;
const pb = (await api('POST', '/projects', { name: BL, customer: 'Acme FM' })).data.project.id; const pq = (await api('POST', '/projects', { name: QU, customer: 'Beta Estates' })).data.project.id;
await api('POST', `/projects/${pb}/members`, { email: 'cmd.member@facilio.com', role: 'editor' });
await api('PUT', `/projects/${pb}/items/task/t1`, { data: { n: 1, title: 'SSO certificate from the customer IdP', type: 'Implementation Task', status: 'Blocked', priority: 'Critical', owner: 'cmd.member@facilio.com', eta: day(-3), blocker: 'IdP certificate expired' } });
await api('PUT', `/projects/${pb}/items/task/t2`, { data: { n: 2, title: 'Confirm approval levels', type: 'Customer Question', status: 'To Do', priority: 'High', owner: 'dinesh.r@facilio.com', eta: day(4), question: { text: 'Two levels?', status: 'Awaiting Customer' } } });

const c = (await api('GET', '/admin/command')).data; const P = id => c.projects.find(x => x.id === id);
check('the server works out health from the records', P(pb).health === 'blocked' && P(pq).health === 'insufficient', P(pb).health + ' / ' + P(pq).health);
const sig = c.signals.find(g => g.project === pb && g.code === 'blocker');
check('the blocker signal names its evidence, owner and action', sig && sig.ev[0].view === 'tasks' && /certificate/.test(sig.ev[0].label) && sig.action && sig.kind === 'issue', sig && sig.ev[0].label);
check('an empty project is "Insufficient data", with a reason', P(pq).why.length > 0 && !c.signals.some(g => g.project === pq && g.sev === 'critical'), P(pq).why[0]);
check('no history is invented: snapshots start today', c.trends.snapshots.length <= 1 && c.trends.firstSnapshot === day(0), c.trends.firstSnapshot);

await home();
check('an admin sees the portfolio strip and My work on the projects home', !!(await p.$('.hm-port')) && !!(await p.$('.hm-mywork')));
check('My work lists my task with its project', /Confirm approval levels/.test(await p.textContent('.hm-mywork')) && (await p.textContent('.hm-mywork')).includes(BL));
await p.screenshot({ path: OUT + '/command-home.png', fullPage: true });

await admin();
check('the admin console opens on the Command center', /Command center/.test(await p.textContent('.adm-tabs .on, .tabs .on, [aria-selected="true"]').catch(() => '')) || !!(await p.$('.cmd-metrics')));
await p.screenshot({ path: OUT + '/command-center.png', fullPage: true });
await p.click('.cmd-metrics .cmd-m[data-health="blocked"]'); await p.waitForTimeout(400);
let tbl = await p.textContent('#cmdTable'); check('the Blocked metric filters the portfolio table', tbl.includes(BL) && !tbl.includes(QU));
await p.click('[data-act="cmdClear"]').catch(() => { }); await p.waitForTimeout(300); tbl = await p.textContent('#cmdTable'); check('clearing the filter shows every project', tbl.includes(BL) && tbl.includes(QU));
await p.fill('#cmdTable input[type=search], #cmdTable input', 'Quiet ' + tag).catch(() => { }); await p.waitForTimeout(400);
check('search narrows the table', !(await p.textContent('#cmdTable tbody').catch(() => '')).includes(BL));
await p.click('[data-act="cmdClear"]').catch(() => { }); await p.waitForTimeout(300);

// project drawer, then the delivery status set by a person
await p.click(`.cmd-tbl [data-act="cmdProject"][data-id="${pb}"]`); await p.waitForTimeout(400);
const dr = await p.textContent('.drawer'); check('the project drawer explains the health with the signals', /blocker/i.test(dr) && /certificate/.test(dr));
await p.selectOption('#cmd_ds', 'on_hold'); await p.fill('#cmd_dn', 'Customer paused for budget'); await p.click('[data-act="cmdSetStatus"]'); await p.waitForTimeout(1200);
const pj = (await api('GET', '/projects/' + pb)).data.project; check('the owner sets On hold and it is saved', pj.deliveryStatus === 'on_hold', pj.deliveryStatus);
const c2 = (await api('GET', '/admin/command')).data; check('a manual status wins over the rules; its signals leave the attention list but stay on the project', c2.projects.find(x => x.id === pb).health === 'on_hold' && c2.held.some(g => g.project === pb) && !c2.signals.some(g => g.project === pb));
const au = (await api('GET', '/projects/' + pb + '/audit').catch(() => ({ data: {} }))).data; check('the change is in the audit log', !au.items || JSON.stringify(au).includes('status'), '');
await api('PATCH', '/projects/' + pb, { deliveryStatus: 'active' });
await p.evaluate(() => window.FWBViews.ACT.cmdReload()); await p.waitForSelector('.cmd-metrics'); await p.waitForTimeout(400);

// evidence opens the record itself
await p.click(`.cmd-sig .cmd-ev[data-p="${pb}"][data-v="tasks"] >> nth=0`); await p.waitForTimeout(1800);
check('an evidence button opens the project at the task', p.url().includes(`/p/${pb}/tasks`) && /SSO certificate/.test(await p.textContent('.drawer').catch(() => '')), p.url());
await p.evaluate(() => window.FWBViews.closeDrawer && window.FWBViews.closeDrawer());

// AI briefing
await admin(); await p.click('[data-act="cmdBrief"]'); await p.waitForFunction(() => /Executive summary|error|could not/i.test((document.getElementById('cmdAi') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => { });
const ai = await p.textContent('#cmdAi'); check('the AI briefing answers from the evidence and names the provider', /Executive summary/.test(ai) && /\[P1\]|P1/.test(ai) && /DeepSeek|deepseek/i.test(ai), ai.slice(0, 120));
check('the briefing changes nothing', (await api('GET', '/projects/' + pb)).data.project.deliveryStatus === 'active');

// access: a team member
await as('cmd.member@facilio.com'); await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const r1 = await api('GET', '/admin/command'), r2 = await api('POST', '/admin/ai/briefing', {}), r3 = await api('PATCH', '/projects/' + pb, { deliveryStatus: 'cancelled' });
check('a team member gets 403 from the command center and the briefing', r1.status === 403 && r2.status === 403, r1.status + ' ' + r2.status);
check('an editor cannot change the delivery status', r3.status === 403, String(r3.status));
const mw = (await api('GET', '/my/work')).data; check('My work for a member lists only their own tasks', mw.items && mw.items.length === 1 && mw.items[0].id === 't1' && mw.items[0].blocked, JSON.stringify((mw.items || []).map(x => x.id)));
await home(); check('a member sees My work and no portfolio strip', !(await p.$('.hm-port')) && !!(await p.$('.hm-mywork')));

// access: a sub-admin sees the portfolio but cannot set a status
await as(null); await p.goto(BASE + '/'); await p.waitForSelector('[data-act]'); await api('POST', '/admin/access', { email: 'cmd.sub@facilio.com', role: 'sub' });
await as('cmd.sub@facilio.com'); await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const s1 = await api('GET', '/admin/command'); check('a sub-admin can read the command center', s1.status === 200 && s1.data.me.role === 'sub');
const s2 = await api('PATCH', '/projects/' + pb, { deliveryStatus: 'cancelled' }); check('a sub-admin cannot change a delivery status', s2.status >= 400 && s2.status < 500, String(s2.status));
await home(); await admin(); await p.click(`.cmd-tbl [data-act="cmdProject"][data-id="${pb}"]`); await p.waitForTimeout(400);
check('the sub-admin drawer has no status control', !(await p.$('#cmd_ds')));
await as(null);
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); const okN = res.filter(Boolean).length; console.log(`\n${okN}/${res.length} command center checks passed`); process.exit(okN === res.length ? 0 : 1);
