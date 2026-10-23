// Contracts register: facts are read from document text with page refs, team can add/confirm/edit, BRDs use them, changes flag BRDs and a new version can be issued.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done } = await setup(BASE);
const paper = () => page.$$eval('.paper', e => e.map(x => x.textContent).join(' '));
// extraction from page text
const fx = await page.evaluate(() => window.FWBViews.extractFacts({ pages: [
  { n: 3, text: 'Introduction\n\nThis agreement covers the Facilio platform for the Customer in all respects.', method: 'text' },
  { n: 12, text: '4.2 Integrations. Facilio shall integrate with Zoho Desk so that Service Requests raised in Zoho Desk are received in Facilio as work orders.', method: 'text' },
  { n: 14, text: '6.1 The Services are hosted in the Microsoft Azure cloud in the UAE region and customer data shall not leave that data centre region.', method: 'text' }] }));
ok(fx.some(f => f.kind === 'integration' && f.system === 'Zoho Desk' && f.page === 12 && f.section === '4.2' && f.state === 'review'), 'an integration is read with its system, page and section, starting as "to review"');
ok(fx.find(f => f.system === 'Zoho Desk').serves.includes('Service Request'), 'it notes what the integration serves');
ok(fx.some(f => f.kind === 'region' && /UAE/.test(f.value) && f.page === 14), 'the cloud region is read with its page');
ok(!fx.some(f => f.page === 3), 'unrelated text produces no facts');
await nav(page, 'contracts'); await page.waitForSelector('.page-body');
ok(/Contracts & Integrations/.test(await page.locator('h1').innerText()), 'the register page opens');
await page.click('[data-act=ctAddTeam]'); await page.fill('#cc_title', 'Zoho Desk integration addendum'); await page.selectOption('#cc_type', 'integration'); await page.click('[data-act=ctSave]'); await page.waitForSelector('.ctr-card');
ok(await page.locator('.ctr-card').count() === 1, 'the team can add a contract item');
await page.click('[data-act=ctFactAdd]'); await page.fill('#cf_sys', 'Zoho Desk'); await page.selectOption('#cf_dir', 'both'); await page.fill('#cf_serves', 'Service Request, Work Order'); await page.fill('#cf_ref', 'p.12 §4.2'); await page.click('[data-act=ctFactSave]'); await page.waitForSelector('.ctr-t');
ok(/Added by team/.test(await page.locator('.ctr-t').innerText()), 'a team fact is labelled "Added by team"');
ok(/Zoho Desk/.test(await page.locator('.card', { hasText: 'What the contracts say' }).innerText()), 'confirmed facts appear in the summary');
await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.click('[data-act=brdNew]'); await page.waitForSelector('#bf_name'); await page.selectOption('#bf_type', 'servicedesk');
ok(await page.locator('[data-act=brdFormSys]').count() >= 1, 'the BRD form offers the systems named in the contracts');
await page.click('[data-act=brdFormSys]'); ok(await page.inputValue('#bf_sys') === 'Zoho Desk', 'picking one fills the external system'); await page.click('[data-act=brdFormSave]'); await page.waitForSelector('.paper'); await page.waitForTimeout(600);
ok(/Contract basis/.test(await paper()) && /Added by team/.test(await paper()), 'the BRD cites the contract it is based on');
ok(await page.locator('.brd-flag').count() === 0, 'no flag while the BRD matches the contracts');
await nav(page, 'contracts'); await page.waitForSelector('.ctr-t'); await page.click('[data-act=ctFactEdit]'); await page.fill('#cf_sys', 'Zoho Desk Plus'); await page.click('[data-act=ctFactSave]'); await page.waitForTimeout(300);
await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.click('.brd-tab:nth-child(2)'); await page.waitForTimeout(500);
ok(await page.locator('.brd-flag').count() === 1 && /Changed/.test(await page.locator('.brd-flag').innerText()), 'changing a contract fact flags the BRD');
await page.click('[data-act=brdIssue]'); await page.waitForSelector('.dialog [data-r="1"]'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(500);
ok(await page.locator('.brd-flag').count() === 0, 'issuing an updated BRD clears the flag');
ok(await page.evaluate(() => window.FWB.S.ws.brd.versionHistory.some(v => /contract changes/i.test(v.change))), 'a new version with a change note is recorded');
await page.evaluate(() => window.FWB.flush()); await page.waitForTimeout(1000); await page.reload(); await page.waitForSelector('.shell'); await nav(page, 'contracts'); await page.waitForSelector('.ctr-card');
ok(await page.locator('.ctr-card').count() === 1, 'contracts persist after reload');
await done();
