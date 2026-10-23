// Governance & change requests: actions, sign-offs, RAID, minutes → records, owners, digest, CRs with customer approval.
import { setup } from './lib.mjs';
const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
const { page, customer, ok, nav, done } = await setup(BASE);
await nav(page, 'governance'); await page.waitForSelector('.so-card');
await page.screenshot({ path: OUT + 'gv01_signoffs.png' });
// request BRD sign-off
await page.click('[data-act=soRequest][data-k=brd]'); await page.fill('#so_due', '2026-12-01'); await page.fill('#so_doc', 'https://example.com/brd.docx'); await page.click('[data-act=soRequestSave]'); await page.waitForTimeout(600);
ok((await page.textContent('.so-card')).includes('Pending'), 'BRD sign-off requested');
// minutes create decisions, actions, risks
await page.click('[data-act=govTab][data-v=minutes]'); await page.click('[data-act=mmEdit]');
await page.fill('#mm_title', 'Weekly status call'); await page.fill('#mm_dec', 'Use P1–P4 priorities'); await page.fill('#mm_act', 'C: Priya — share the site list ' + soon + '\nF: send the data templates'); await page.fill('#mm_risk', 'Site list may be late\nI: No test users yet');
await page.click('[data-act=mmSave]'); await page.waitForFunction(() => document.querySelector('.page-body').textContent.includes('RAID item(s)'), null, { timeout: 15000 }).catch(() => {});
ok((await page.textContent('.page-body')).includes('Created 1 decision(s), 2 action(s), 2 RAID item(s)'), 'minutes create decisions, actions and RAID items');
await page.click('[data-act=govTab][data-v=actions]'); await page.waitForTimeout(400);
const acts = await page.textContent('.page-body'); ok(acts.includes('share the site list') && acts.includes('Priya') && acts.includes('send the data templates'), 'actions split by side with owner');
await page.click('[data-act=govTab][data-v=raid]'); await page.waitForTimeout(300); ok((await page.$$eval('.raid-t', x => x.map(e => e.textContent).join(''))).includes('I'), 'issue logged as I');
await page.screenshot({ path: OUT + 'gv02_raid.png' });
await page.click('[data-act=govTab][data-v=digest]'); await page.waitForTimeout(300); const dg = await page.inputValue('#dg_body'); ok(dg.includes('Due from Marina Properties') && dg.includes('Waiting on sign-off'), 'digest built from records');
await page.click('[data-act=dgPost]'); await page.waitForTimeout(600);
// change request
await nav(page, 'changes'); await page.click('.page-header [data-act=crEdit]'); await page.fill('#cr_title', 'Extra SLA report'); await page.fill('#cr_desc', 'Monthly SLA report per site'); await page.selectOption('#cr_st', 'Proposed'); await page.fill('#cr_eff', '3'); await page.selectOption('#cr_rate', 'custom'); await page.fill('#cr_rate2', '1200'); await page.dispatchEvent('#cr_rate2', 'change'); await page.fill('#cr_slip', '2'); await page.check('#cr_pub');
ok((await page.inputValue('#cr_price')) === '3600', 'price = effort × rate'); await page.click('[data-act=crSave]'); await page.waitForTimeout(800);
ok((await page.textContent('.tbl')).includes('CR-001'), 'CR numbered by the server');
await page.screenshot({ path: OUT + 'gv03_cr.png' });
// customer
const c = await customer();
await nav(c, 'governance'); await c.waitForSelector('.so-card'); await c.click('[data-act=soSign][data-k=brd]'); await c.fill('#so_title', 'Project Manager'); await c.check('#so_conf'); await c.click('[data-act=soSignSave]'); await c.waitForTimeout(800);
ok((await c.textContent('.so-card')).includes('Signed'), 'customer signs the BRD');
await c.click('[data-act=govTab][data-v=actions]'); await c.waitForTimeout(500);
const sel = await c.$$('select[data-change=actStatus]'); ok(sel.length === 2, 'customer can update both actions\' status'); await sel[1].selectOption('Done'); await c.waitForTimeout(800);
ok(!(await c.$('[data-act=actDel]')), 'customer cannot delete actions');
await nav(c, 'changes'); await c.click('[data-act=crDecide]'); await c.click('[data-act=crDecideSave][data-v="CR Converted"]'); await c.waitForTimeout(800);
ok((await c.textContent('.tbl')).includes('CR Converted'), 'customer approves the CR');
await c.click('.page-header [data-act=crEdit]'); await c.fill('#cr_title', 'Add Arabic labels'); await c.click('[data-act=crSave]'); await c.waitForTimeout(800);
ok((await c.textContent('.tbl')).includes('CR-002'), 'customer request numbered');
await c.screenshot({ path: OUT + 'gv04_cust_cr.png' });
await page.reload(); await page.waitForSelector('.sidebar'); await nav(page, 'governance'); await page.waitForSelector('.so-card');
ok((await page.textContent('.so-card')).includes('in the portal'), 'Facilio sees the customer signature');
await done('governance ui');
