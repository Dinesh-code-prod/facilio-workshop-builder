// Delivery: Build & Test, UAT sessions (published vs draft), readiness checklists, rule-based go-live read, customer read-only.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
const { page, projectId, customer, ok, nav, done } = await setup(BASE);
await nav(page, 'delivery'); await page.waitForSelector('[data-change=dlBuild]');
const total = await page.$$eval('[data-change=dlBuild]', x => x.length); ok(total > 3, 'in-scope modules listed: ' + total);
await page.selectOption('[data-change=dlBuild] >> nth=0', 'Completed'); await page.waitForTimeout(700); ok((await page.textContent('.page-body')).includes(`Module 1 of ${total} completed`), 'build progress counts completed modules');
await page.click('[data-act=dlTab][data-v=uat]'); await page.click('[data-act=dlUat]'); await page.fill('#ua_t', 'Work orders demo'); await page.fill('#ua_d', '2026-12-01'); await page.check('#ua_p'); await page.click('[data-act=dlUatSave]'); await page.waitForTimeout(700);
await page.click('[data-act=dlUat] >> nth=0'); await page.fill('#ua_t', 'Internal rehearsal'); await page.fill('#ua_d', '2026-11-28'); await page.click('[data-act=dlUatSave]'); await page.waitForTimeout(700);
ok((await page.textContent('.tbl')).includes('Internal rehearsal') && (await page.textContent('.tbl')).includes('Work orders demo'), 'two sessions saved');
await page.click('[data-act=dlSuggest][data-g=uat]'); await page.waitForTimeout(1500); const n = await page.$$eval('.chk-row input', x => x.length); ok(n >= 5, 'suggested UAT checklist added: ' + n);
await page.check('.chk-row input >> nth=0'); await page.waitForTimeout(700); ok((await page.textContent('.chk-row >> nth=0')).includes('Dinesh'), 'tick records who and when');
await page.click('[data-act=dlTab][data-v=golive]'); await page.click('[data-act=dlSuggest][data-g=golive]'); await page.waitForFunction(() => document.querySelectorAll('.chk-row').length >= 9, null, { timeout: 15000 });
let gl = await page.textContent('.page-body'); ok(/Not ready|At risk/.test(gl) && gl.includes('The BRD is not signed off') && gl.includes('checklist item(s) still open'), 'go-live read lists what is open'); ok(gl.includes('Rule: Ready when nothing is open'), 'rule is stated');
await page.screenshot({ path: OUT + 'dl01_golive.png', fullPage: true });
// customer: only published sessions, no controls
const c = await customer(); await nav(c, 'delivery'); await c.waitForSelector('.ob-tabs'); ok(!(await c.$('[data-change=dlBuild]')), 'customer sees build status read-only'); await c.click('[data-act=dlTab][data-v=uat]'); await c.waitForTimeout(500);
const ct = await c.textContent('.page-body'); ok(ct.includes('Work orders demo') && !ct.includes('Internal rehearsal'), 'customer sees only published sessions'); ok(!(await c.$('[data-act=dlUat]')), 'customer cannot add sessions');
const f = await c.evaluate(async pid => { try { await window.FWBApi.put(`/api/projects/${pid}/items/build/x`, { data: { status: 'Completed' } }); return 'ok'; } catch (e) { return e.status; } }, projectId); ok(f === 403, 'server refuses customer writes to build status: ' + f);
await done('delivery_ui');
