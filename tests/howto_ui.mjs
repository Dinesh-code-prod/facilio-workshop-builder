// How-to guides on Transcripts and Checks, tab hints, accepted-vs-confirmed rule.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/'; const FX = 'tests/fixtures/';
const { page, ok, nav, done } = await setup(BASE);
await nav(page, 'transcripts'); await page.waitForSelector('[data-act=hwOpen][data-id=transcripts]');
ok(true, 'How to use this section button on Transcripts');
await page.click('.page-header [data-act=hwOpen]'); await page.waitForSelector('.hw');
let t = await page.textContent('.hw'); ok(t.includes('Step 1 of 7') && t.includes('.vtt, .srt, .txt, .docx and .json'), 'step 1 names the real file formats'); ok(t.includes('0 transcripts uploaded') || /0 transcript/.test(t), 'live line reads project data');
await page.click('[data-act=hwStep][data-i="1"] >> nth=-1'); t = await page.textContent('.hw'); ok(t.includes('Contradiction') && t.includes('Possible customization') && t.includes('Reject asks for a reason'), 'step 2 uses the real categories and decisions');
await page.screenshot({ path: OUT + 'hw01_transcripts.png' });
await page.click('.hw [data-act=hwGo]'); await page.waitForTimeout(400); ok(!(await page.$('.hw')), 'Open button closes the guide'); ok((await page.textContent('.tabs .tab.active')).includes('Review queue'), 'and opens the Review queue tab');
ok((await page.textContent('.tab-hint')).includes('Accepting creates a Draft requirement'), 'tab hint under the tabs');
await page.click('.page-header [data-act=hwOpen]'); ok((await page.textContent('.hw')).includes('Step 2 of 7'), 'guide reopens where you left it');
await page.click('[data-act=hwStep][data-i="6"] >> nth=-1'); ok((await page.textContent('.hw')).includes('How this connects to Checks'), 'last step shows the confirm-for-BRD guidance'); await page.click('[data-act=closeDrawer] >> nth=0');
// accepted != confirmed: upload a transcript, accept a statement that was "agreed in the session", it must start as Draft
await page.click('[data-act=trTab][data-v=upload]'); await page.click('.page-header [data-act=uploadTranscript]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=trPick]')]); await fc.setFiles(FX + 'session3.vtt'); await page.click('[data-act=trUpload]'); await page.waitForTimeout(1800);
await page.click('[data-act=trTab][data-v=review]'); await page.click('[data-act=candAccept]'); ok((await page.inputValue('#rq_status')) === 'Draft', 'an accepted statement starts as Draft');
await page.selectOption('#rq_status', 'Confirmed'); await page.click('[data-act=saveReq]'); await page.waitForTimeout(400); ok(!!(await page.$('#rq_status')), 'Confirmed is refused without who confirmed it');
await page.fill('#rq_confBy', 'Priya Nair'); await page.click('[data-act=saveReq]'); await page.waitForTimeout(500); ok(!(await page.$('#rq_status')), 'and saved once a name is recorded');
// checks
await nav(page, 'checks'); await page.waitForSelector('[data-act=hwOpen][data-id=checks]'); await page.click('.page-header [data-act=hwOpen]'); await page.waitForSelector('.hw'); t = await page.textContent('.hw');
ok(t.includes('Step 1 of 8') && t.includes('Blocking issues') && /blocking · \d+ warnings/.test(t), 'checks guide step 1 with live counts');
await page.click('[data-act=hwStep][data-i="2"] >> nth=-1'); ok((await page.textContent('.hw')).includes('Reviewed — no changes counts as reviewed'), 'module status guidance'); await page.screenshot({ path: OUT + 'hw02_checks.png' }); await page.click('[data-act=closeDrawer] >> nth=0');
for (const k of ['validation', 'modules', 'coverage', 'records', 'changes', 'log']) { await page.click(`[data-act=chkTab][data-v=${k}]`); ok(!!(await page.$('.tab-hint')), 'hint on ' + k); }
await done('howto_ui');
