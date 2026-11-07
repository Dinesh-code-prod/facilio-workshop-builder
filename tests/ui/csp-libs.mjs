// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/csp-libs.mjs
// Loads every bundled library under the page's Content-Security-Policy and runs one small real operation with each
// (PDF make + read, OCR, Excel write + read, Word write + read, ZIP, PowerPoint renderer import). Run with the CSP watch preload.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const r = await p.evaluate(async () => {
  const V = window.FWBViews, out = {}; const t = async (k, fn) => { try { out[k] = await fn(); } catch (e) { out[k] = 'ERROR ' + (e && e.message || e); } };
  await t('pdfmake+pdfjs', async () => { await V.loadScript('vendor/pdfmake.min.js'); await V.loadScript('vendor/vfs_fonts.js'); const blob = await new Promise(res => window.pdfMake.createPdf({ content: ['CSP check page'] }).getBlob(res));
    const pdfjs = await V.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; const tc = await (await doc.getPage(1)).getTextContent(); return doc.numPages + ' page: ' + tc.items.map(i => i.str).join(''); });
  await t('exceljs', async () => { await V.loadExcelJS(); const wb = new window.ExcelJS.Workbook(); wb.addWorksheet('S').getCell('A1').value = 'ok'; const buf = await wb.xlsx.writeBuffer(); const w2 = new window.ExcelJS.Workbook(); await w2.xlsx.load(buf); return w2.worksheets[0].getCell('A1').value; });
  await t('docx+mammoth', async () => { await V.loadScript('vendor/docx.iife.js'); const D = window.docx; const blob = await D.Packer.toBlob(new D.Document({ sections: [{ children: [new D.Paragraph('Word check')] }] }));
    await V.loadScript('vendor/mammoth.browser.min.js'); return (await window.mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() })).value.trim(); });
  await t('jszip', async () => { await V.loadScript('vendor/jszip.min.js'); const z = new window.JSZip(); z.file('a.txt', 'zip ok'); const z2 = await window.JSZip.loadAsync(await z.generateAsync({ type: 'uint8array' })); return z2.file('a.txt').async('string'); });
  await t('pptx-renderer import', async () => { const m = await import(new URL('vendor/pptx-renderer.es.js', document.baseURI).href); return Object.keys(m).length + ' exports'; });
  await t('tesseract OCR', async () => { const c = document.createElement('canvas'); c.width = 420; c.height = 120; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 420, 120); g.fillStyle = '#000'; g.font = 'bold 56px Arial'; g.fillText('HELLO 42', 20, 85);
    const res = await Promise.race([V.ocrCanvas(c), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000))]); return res.text.trim() + ' (' + res.conf + '%)'; });
  return out; });
console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('page errors:', errs.slice(0, 3)); await b.close();
