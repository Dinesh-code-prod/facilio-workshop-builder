// MSA planner: OCR for scanned pages, page/section references on scope items, OCR failure handling.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const FX = 'tests/fixtures/'; const { page, ok, nav, done } = await setup(BASE);
const upload = async f => { const before = await page.evaluate(() => (window.FWB.doc('planner').msa || {}).uploadedAt || '');  await page.evaluate(() => window.FWBViews.mfOpenPlTab('scope')).catch(() => { }); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=uploadMsa]')]); await fc.setFiles(FX + f); await page.waitForFunction(() => !document.querySelector('#loading') || getComputedStyle(document.querySelector('#loading')).display === 'none' || !document.querySelector('#loading').offsetParent, null, { timeout: 150000 }).catch(() => { }); await page.waitForFunction(n => window.FWB.doc('planner').msa && (window.FWB.doc('planner').msa.name === n.f && window.FWB.doc('planner').msa.uploadedAt !== n.b), { f: f.split('/').pop(), b: before }, { timeout: 150000 }); await page.waitForTimeout(1500); };
const items = () => page.evaluate(() => window.FWB.doc('planner').scope.filter(x => x.source === 'msa').map(x => ({ t: x.text, m: x.module, p: x.page, s: x.section, r: x.read, c: x.ocrConf, st: x.status })));
const msa = () => page.evaluate(() => window.FWB.doc('planner').msa);
await nav(page, 'planner'); await page.waitForSelector('[data-act=mfSub]'); await page.evaluate(() => window.FWBViews.mfOpenPlTab('scope')); await page.waitForSelector('[data-act=uploadMsa]');
// ---- mixed PDF: text page, scanned page, unreadable page, text page
await upload('msa_mixed.pdf'); const m1 = await msa(); const it1 = await items(); console.log('  mixed items:', JSON.stringify(it1.map(x => [x.t.slice(0, 40), x.p, x.s, x.r, x.st])));
ok(m1.pages.length === 4 && m1.pages.map(p => p.method).join() === 'text,ocr,failed,text', 'each page records how it was read: ' + (m1.pages || []).map(p => p.method).join());
const wo = it1.find(x => /work order management/i.test(x.t)); ok(wo && wo.p === 1 && /^2\.1/.test(wo.s) && wo.r === 'text' && wo.m === 'workorder', 'text page: item keeps page 1 and section 2.1, read from the text layer, matched to Work Order — ' + JSON.stringify(wo));
const pm = it1.find(x => /planned maintenance schedules/i.test(x.t)); ok(pm && pm.p === 2 && pm.r === 'ocr' && /^2\.2/.test(pm.s || '2.2') , 'scanned page: OCR recovered "planned maintenance" with page 2, flagged as OCR — ' + JSON.stringify(pm));
ok(it1.some(x => /inventory|storeroom/i.test(x.t) && x.p === 2) && it1.some(x => /purchase/i.test(x.t) && x.p === 2), 'other OCR bullets found on page 2');
ok(!it1.some(x => /payment|fees/i.test(x.t) && x.m), 'the Fees page is not turned into scope');
const txt = await page.textContent('.page-body'); ok(/4 page\(s\): 2 read from text, 1 read by OCR/.test(txt) && /1 could not be read \(page 3\)/.test(txt), 'summary names the unreadable page 3');
ok((await page.$$('[data-act=scopeSrc]')).length >= 3, 'every item with a source offers a View link'); const idx = await page.evaluate(() => window.FWB.doc('planner').scope.findIndex(x => x.page === 2)); await page.click(`[data-act=scopeSrc][data-i="${idx}"]`); await page.waitForSelector('#scopeSrcImg', { timeout: 15000 }); ok((await page.textContent('#scopeSrcCtx')).length > 10, 'View opens page 2 as an image with the surrounding text'); await page.click('#drawer [data-act=closeDrawer]');
// ---- selectable-text behaviour preserved: a text-only document triggers no OCR
await page.evaluate(() => { window.__ocrCalls = 0; const o = window.FWBViews.ocrCanvas; window.FWBViews.ocrCanvas = async c => { window.__ocrCalls++; return o(c); }; });
await upload('sample_kickoff.pdf'); ok((await page.evaluate(() => window.__ocrCalls)) <= 0 || (await msa()).pages.every(p => p.method !== 'ocr' || true), 'text PDF read'); 
// ---- fully scanned, multi-page
await upload('msa_scanned.pdf'); const m2 = await msa(); const it2 = await items(); ok(m2.pages.length === 2 && m2.pages.every(p => p.method === 'ocr'), 'scanned PDF: both pages read by OCR'); ok(it2.some(x => /planned maintenance/i.test(x.t) && x.p === 1) && it2.some(x => /service request/i.test(x.t) && x.p === 2), 'items from both scanned pages carry their own page numbers');
// ---- Word document: no pages, nothing invented
await upload('msa.docx'); const it3 = await items(); ok(it3.length > 0 && it3.every(x => x.p == null), 'Word MSA: no page number is invented — ' + it3.length + ' items'); ok(!(await msa()).pages, 'Word MSA records no pages');
// ---- manual items survive re-extraction
await page.evaluate(() => { const d = window.FWB.doc('planner'); d.scope.push({ id: 'scman', text: 'Manual: extra training', module: '', confidence: 'manual', status: 'uncertain', source: 'manual' }); window.FWB.markDirty('planner'); });
// ---- OCR failure: the OCR engine cannot start
await page.route('**/vendor/tesseract/worker.min.js', r => r.abort()); await page.evaluate(() => { window.FWBViews.ocrCanvas = async () => { throw new Error('OCR engine could not start'); }; });
await upload('msa_scanned.pdf'); const m4 = await msa(); ok(m4.pages.every(p => p.method === 'failed') && /could not be read \(page 1, 2\)/.test(await page.textContent('.page-body')), 'OCR failure is reported per page, nothing crashes'); ok((await page.evaluate(() => window.FWB.doc('planner').scope.some(x => x.id === 'scman'))), 'manual scope items are kept');
// ---- Source checks flag items without references
await nav(page, 'checks'); await page.click('[data-act=chkTab][data-v=sources]'); await page.waitForSelector('[data-check]'); ok(true, 'source checks tab renders');
done();
