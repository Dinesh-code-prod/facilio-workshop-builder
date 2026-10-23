// Know Your Contract, Scope and Customer Portal controls: entry, computed dates, watch-outs, and server-side release to the customer.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/';
const { page, customer, ok, nav, done } = await setup(BASE);
const pid = await page.evaluate(() => window.FWB.S.project.id);
await nav(page, 'contract'); await page.waitForSelector('.page-header h1'); ok((await page.textContent('.mf-embed h1')).includes('Know Your Contract'), 'contract page opens');
const edit = async (sec, fill) => { await page.click(`[data-act=kcEdit][data-s=${sec}]`); await page.waitForSelector('#drawer'); await fill(); await page.click('[data-act=kcSave]'); await page.waitForTimeout(700); };
await page.waitForSelector('[data-act=kcEdit][data-s=facts]'); await edit('facts', async () => { await page.fill('#kc_signed', '2026-11-02'); await page.selectOption('#kc_docType', 'Customer paper'); });
await page.click('[data-act=kcEdit][data-s=term]'); await page.fill('#kc_termMonths', '36'); await page.selectOption('#kc_startRule', 'signing'); await page.fill('#kc_startOffset', '30'); await page.fill('#kc_noticeDays', '90'); await page.click('[data-act=kcSave]'); await page.waitForTimeout(700);
const dates = await page.evaluate(() => { const d = window.FWBViews.contractDates; return { s: d.termStart(), e: d.termEnd(), n: d.noticeDeadline() }; });
ok(dates.s === '2026-12-02', 'term start = signed + 30 days (' + dates.s + ')'); ok(dates.e === '2029-12-01', 'term end = start + 36 months − 1 day (' + dates.e + ')'); ok(dates.n === '2029-09-02', 'renewal notice deadline = end − 90 days (' + dates.n + ')');
await page.click('[data-act=kcEdit][data-s=fees]'); await page.fill('#kc_paymentDays', '60'); await page.fill('#kc_milestones', 'Signing | 30 | 30000 | both | signing |\nGo-live | 40 | 40000 | both | golive |\nUAT | 20 | 20000 | both | uat |'); await page.click('[data-act=kcSave]'); await page.waitForTimeout(700);
const w = await page.$$eval('.ev-row', r => r.map(x => x.textContent)).then(a => a.join('||')); ok(/add up to 90%/.test(w), 'milestones that do not total 100% are flagged'); ok(/depend on UAT sign-off or go-live/.test(w), 'payments that depend on UAT/go-live are flagged'); ok(/Payment terms are 60 days/.test(w), 'long payment terms flagged'); ok(/customer\'s paper/.test(w), 'customer paper flagged'); ok(/No rate card/.test(w), 'missing rate card flagged');
const inv = await page.$$eval('.tbl tbody tr', r => r.map(x => x.textContent)).then(a => a.find(t => t.includes('Signing'))); ok(/Nov 02, 2026/.test(inv || '') && /Jan 01, 2027/.test(inv || ''), 'signing invoice date and due date (+60) computed: ' + inv);
// bad input refused
await page.click('[data-act=kcEdit][data-s=fees]'); await page.fill('#kc_milestones', 'X | 100 | 1 | both | whenever |'); await page.click('[data-act=kcSave]'); await page.waitForTimeout(500); ok(!!(await page.$('#kc_milestones')), 'unknown trigger is refused'); await page.click('[data-act=closeDrawer] >> nth=0');
await page.click('[data-act=kcEdit][data-s=rates]'); await page.fill('#kc_rates', 'Consultant | 900 | day'); await page.fill('#kc_currency', 'AED'); await page.click('[data-act=kcSave]'); await page.waitForTimeout(700);
ok(await page.evaluate(() => window.FWBViews.rateFor('consultant').rate) === 900, 'rate card is available to change requests');
// scope
await nav(page, 'scope'); await page.click('[data-act=scEdit]'); await page.fill('#sc_inclusions', 'Work orders\nAssets'); await page.fill('#sc_exclusions', 'Mobile app branding'); await page.fill('#sc_sow', 'Work Order | Create WO; Close WO | Quote approval'); await page.click('[data-act=scSave]'); await page.waitForTimeout(800);
ok((await page.textContent('.page-body')).includes('Mobile app branding') && (await page.textContent('.page-body')).includes('Quote approval'), 'scope and SOW slice saved and shown');
// server-side release to the customer
const api = async (pg, path) => pg.evaluate(async p => { const r = await fetch(p, { headers: { 'x-fwb-csrf': '1' } }); return { s: r.status, j: await r.json().catch(() => ({})) }; }, path);
const c = await customer('Priya Nair'); const cget = k => api(c, `/api/projects/${pid}/items?kinds=${k}`);
ok((await cget('ctrcore')).s === 403 || ((await cget('ctrcore')).j.items || []).length === 0, 'tab off: customer receives nothing from the contract');
await page.click('.sidebar [data-view=portal]'); await page.waitForSelector('[data-change=ptSet][data-k=contract]', { state: 'attached' }); await page.click('[data-change=ptSet][data-k=contract] + span'); await page.waitForTimeout(1200); await page.evaluate(() => window.FWB.flush());
await page.waitForTimeout(800);
const core = await cget('ctrcore'); ok((core.j.items || []).length === 1, 'contract tab on: customer receives the core contract'); const fees = await cget('ctrfees'); ok((fees.j.items || []).length === 0, 'fees stay hidden from the customer');
const wat = await cget('ctrwatch'); ok((wat.j.items || []).length === 0, 'watch-outs never reach the customer');
await page.click('[data-change=ptSet][data-g=show][data-k=fees] + span'); await page.waitForTimeout(1200); await page.evaluate(() => window.FWB.flush()); await page.waitForTimeout(800);
ok(((await cget('ctrfees')).j.items || []).length === 1, 'fees switch on: customer receives the milestones'); ok(((await cget('ctrlegal')).j.items || []).length === 0, 'legal still hidden');
const put = await c.evaluate(async p => { const r = await fetch(p, { method: 'PUT', headers: { 'x-fwb-csrf': '1', 'content-type': 'application/json' }, body: JSON.stringify({ data: { liability: 'x' } }) }); return r.status; }, `/api/projects/${pid}/items/ctrcore/main`); ok(put === 403, 'customer cannot write the contract (' + put + ')');
await done('contract_ui');
