// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/moved-tabs-check.mjs [baseUrl] [outDir]
// Duplicate pages hidden (25 Nov 2026): the old Contract page, the old Requirements page, the old Checks page and the old Overview tab no longer open;
// what only they had is a tab of the menu page that replaced them. Every old address lands on a menu page, every moved tab draws, no page errors.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Moved tabs check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForTimeout(2500);
const broken = () => p.evaluate(() => /could not be displayed/.test((document.querySelector('.main') || {}).innerText || ''));
const go = async v => { await p.evaluate(v => window.FWBViews.go(v), v); await p.waitForTimeout(500); return { view: await p.evaluate(() => window.FWB.S.ui.view), h1: await p.evaluate(() => ((document.querySelector('.main h1') || {}).textContent || '').trim()), bad: await broken() }; };
// old addresses land on the menu pages
const LAND = { msaflow: 'msaintake', contract: 'msaintake', scope: 'msaintake', msafind: 'msaintake', contracts: 'msaintake', planner: 'intro', schedule: 'intro', transcripts: 'rstrans', usecases: 'rstrans', prepq: 'rstrans', checks: 'rschecks', overview: 'overview' };
for (const [from, to] of Object.entries(LAND)) { const r = await go(from); check(from + ' lands on ' + to, r.view === to && !r.bad, r.view + ' "' + r.h1 + '"'); }
check('the old Overview tab is gone from Project cycle', !(await p.$('[data-act="ovTab"][data-v="overview"]')));
// every moved tab draws
const tabs = async (view, sel, attr) => { await go(view); const ks = await p.$$eval(sel, (bs, a) => bs.map(x => x.getAttribute(a)), attr); for (const k of ks) { await p.click(sel + '[' + attr + '="' + k + '"]'); await p.waitForTimeout(450); check(view + ' tab ' + k + ' draws', !(await broken())); } return ks; };
const ctr = await tabs('msaintake', '[data-act="hubTab"][data-key="ctrHub"]', 'data-v');
check('Contract intake has the moved tabs', ctr.join(',') === 'msaintake,contract,msascope,msafind,scope,contracts', ctr.join(','));
await p.click('[data-act="hubTab"][data-v="msaintake"]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/moved-contract-intake.png' });
const rs = await tabs('rsplan', '[data-act="rsTab"]', 'data-v');
check('Requirement schedule has the planner tabs', rs.join(',') === 'plan,sessions,distribution,attendees,changes,export', rs.join(','));
await p.click('[data-act="rsTab"][data-v="sessions"]'); await p.waitForTimeout(400);
check('Publish schedule to customer is on Requirement schedule', !!(await p.$('[data-act="publishSchedule"]')));
await p.screenshot({ path: OUT + '/moved-requirement-schedule.png' });
const assign = await p.$('a[data-act="plTab"][data-v="distribution"]');
if (assign) { await assign.click(); await p.waitForTimeout(400); check('Assign now opens Module distribution on Requirement schedule', await p.evaluate(() => window.FWB.S.ui.view === 'intro' && window.FWB.S.ui.rsTab === 'distribution')); }
const tr = await tabs('rstrans', '[data-act="hubTab"][data-key="reqTab"]', 'data-v');
check('Transcripts has Requirements register, Use cases and Prepare questions', tr.join(',') === 'rstrans,transcripts,usecases,prepq', tr.join(','));
await p.click('[data-act="hubTab"][data-v="transcripts"]'); await p.waitForTimeout(400);
check('the register tab has no duplicate Upload transcript or jump-away buttons', !(await p.$('.main [data-act="uploadTranscript"]')) && !(await p.$('.main .page-header [data-view="whiteboard"]')));
const ck = await tabs('rschecks', '[data-act="hubTab"][data-key="chkHub"]', 'data-v');
check('Checks & validations has Readiness & validation', ck.join(',') === 'rschecks,checks', ck.join(','));
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' moved-tab checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
