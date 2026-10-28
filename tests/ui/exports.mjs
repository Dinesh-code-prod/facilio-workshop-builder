// Export audit: triggers every generated export from the real UI (button clicks in a browser, against the local preview
// server and its mock platform), saves each downloaded file and checks its CONTENT, not just that a file arrived:
// Excel is opened with ExcelJS (sheets, headers, rows), Word with mammoth (text, headings), PDF with pdf.js (pages, text),
// CSV/JSON/HTML are parsed. Usage: node tests/ui/exports.mjs <outDir> [baseUrl]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
import ExcelJS from 'exceljs'; import mammoth from 'mammoth';
const OUT = process.argv[2] || 'tests/ui/out-exports'; const BASE = process.argv[3] || 'http://localhost:4173'; fs.mkdirSync(OUT, { recursive: true });
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const results = [];
const ok = (name, file, checks) => { const failed = checks.filter(c => !c[1]); results.push({ name, file: file && path.basename(file), pass: !failed.length, detail: checks.map(c => (c[1] ? 'ok ' : 'FAIL ') + c[0]).join('; ') }); console.log((failed.length ? 'FAIL ' : 'ok   ') + name.padEnd(46) + ' ' + (failed.length ? failed.map(c => c[0]).join('; ') : (file ? path.basename(file) : ''))); };
async function xlsx(f) { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f); return wb; }
async function docx(f) { try { return (await mammoth.extractRawText({ path: f })).value; } catch (e) { return 'NOT A WORD (.docx) FILE: ' + e.message.slice(0, 60); } }
async function pdf(f) { try { return await pdf0(f); } catch (e) { return { pages: 0, text: 'NOT A PDF: ' + e.message }; } }
async function pdf0(f) { const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), useSystemFonts: true, disableFontFace: true }).promise; let text = ''; for (let i = 1; i <= doc.numPages; i++) { const c = await (await doc.getPage(i)).getTextContent(); text += c.items.map(x => x.str).join(' ') + '\n'; } return { pages: doc.numPages, text: text.replace(/\s+/g, ' ') }; }
const sheetRows = ws => { let n = 0; ws.eachRow({ includeEmpty: false }, () => n++); return n; };

const browser = await chromium.launch(); const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(BASE + '/'); await page.waitForSelector('[data-act]');
const pid = await page.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || []).sort((a, b) => b.name.length - a.name.length)[0]?.id);
const NAME = await page.evaluate(async pid => (await (await fetch('/api/fn/api/projects/' + pid)).json()).project.name, pid);
await page.goto(BASE + `/#/p/${pid}/dashreport`); await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1200);
const go = async v => { await page.evaluate(() => { document.querySelectorAll('.scrim').forEach(e => e.remove()); }); await page.evaluate(v => window.FWBViews.go(v), v); await page.waitForTimeout(900); await page.waitForSelector('#loading', { state: 'detached', timeout: 10000 }).catch(() => { }); };
const lastToast = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '));
async function dl(name, trigger) {
  await page.waitForSelector('#loading', { state: 'detached', timeout: 30000 }).catch(() => { }); await page.waitForTimeout(300);
  try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 45000 }), (async () => { await trigger(); for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); const c = await page.$('.scrim .dialog [data-r="1"]'); if (c) { await c.click(); break; } } })()]); const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; }
  catch (e) { ok(name, null, [['download arrived (' + (await lastToast()) + ')', false]]); return null; }
}
const click = sel => page.locator(sel).first().click();

// --- BRD: Word and PDF
await go('brd');
let f = await dl('BRD Word (.docx)', () => click('[data-act="brdDocx"]')); if (f) { const t = await docx(f); ok('BRD Word (.docx)', f, [['.docx extension', f.endsWith('.docx')], ['has the document title', /Business Requirements Document/i.test(t)], ['has the customer', t.includes('Emirates National Engineering')], ['has sections (> 2000 chars)', t.length > 2000]]); }
f = await dl('BRD PDF', () => click('[data-act="brdPdf"]')); if (f) { const p = await pdf(f); ok('BRD PDF', f, [['opens, ' + p.pages + ' pages', p.pages >= 2], ['has the title', /Business Requirements Document/i.test(p.text)], ['has the customer', p.text.includes('Emirates National Engineering')]]); }

// --- Dashboard Report: Excel, PDF, CSV, PNG
await go('dashreport');
f = await dl('Dashboard report Excel', () => click('[data-act="drExport"][data-fmt="xlsx"]')); if (f) { const wb = await xlsx(f); const ws = wb.worksheets[0]; ok('Dashboard report Excel', f, [['sheets: ' + wb.worksheets.map(w => w.name).join(', '), wb.worksheets.length >= 1], ['title row names the project', String(ws.getCell('A1').value || '').includes(NAME.slice(0, 20))], ['data rows present', wb.worksheets.some(w => sheetRows(w) > 4)]]); }
f = await dl('Dashboard report PDF', () => click('[data-act="drExport"][data-fmt="pdf"]')); if (f) { const p = await pdf(f); ok('Dashboard report PDF', f, [['opens, ' + p.pages + ' page(s)', p.pages >= 1], ['names the project', p.text.includes(NAME.slice(0, 20))]]); }
f = await dl('Dashboard report CSV', () => click('[data-act="drExport"][data-fmt="csv"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Dashboard report CSV', f, [['UTF-8 BOM', t.charCodeAt(0) === 0xfeff], ['has rows', t.split('\n').length > 3]]); }
f = await dl('Dashboard report PNG', () => click('[data-act="drExport"][data-fmt="png"]')); if (f) { const b = fs.readFileSync(f); ok('Dashboard report PNG', f, [['PNG signature', b[0] === 0x89 && b[1] === 0x50], ['not tiny', b.length > 5000]]); }

// --- Data Onboarding workbook
await go('onboarding');
f = await dl('Data onboarding workbook', () => click('[data-act="onbDownload"]')); if (f) { const wb = await xlsx(f); const names = wb.worksheets.map(w => w.name); const uniq = new Set(names.map(n => n.toLowerCase())).size === names.length; ok('Data onboarding workbook', f, [[names.length + ' sheets', names.length > 3], ['sheet names unique', uniq], ['Overview lists the sheets', sheetRows(wb.getWorksheet('Overview')) > 5], ['template sheets have header rows', wb.worksheets.filter(w => !['Overview', 'Lists'].includes(w.name)).every(w => sheetRows(w) >= 1)]]); }

// --- Workshop plan (Contract → schedule) from the template
await go('msaflow');
await page.locator('.mf-steps > *', { hasText: /Finalise/ }).first().click().catch(() => { }); await page.waitForTimeout(900);
f = await dl('Workshop plan Excel', () => click('[data-act="exportPlan"]')); if (f) { const wb = await xlsx(f); const ws = wb.getWorksheet('Tentative Workshop Sessions') || wb.worksheets[0]; ok('Workshop plan Excel', f, [['template sheet present', !!ws], ['header row present', sheetRows(ws) >= 1], ['customer name written', JSON.stringify(ws.getSheetValues()).includes('Emirates National Engineering')]]); }

// --- FTR and KPI workbooks: start from the default template, then download
for (const v of ['ftr', 'kpi']) {
  await go(v); const st = await page.$(`[data-act="${v}Start"]`); if (st) { await st.click(); await page.waitForTimeout(2500); await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 }).catch(() => { }); }
  f = await dl(`${v.toUpperCase()} workbook`, () => click(`[data-act="${v}Dl"]`)); if (f) { const wb = await xlsx(f); ok(`${v.toUpperCase()} workbook`, f, [['sheets: ' + wb.worksheets.map(w => w.name).slice(0, 6).join(', '), wb.worksheets.length >= 1], ['header row styled and filled', wb.worksheets.every(w => sheetRows(w) >= 1)], ['unique sheet names', new Set(wb.worksheets.map(w => w.name.toLowerCase())).size === wb.worksheets.length]]); }
}

// --- AI draft → Word (real .docx, includes unsaved edits)
await page.evaluate(async pid => { await fetch(`/api/fn/api/projects/${pid}/ai/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'uat', instruction: 'export test' }) }); }, pid);
await go('aiwork'); await page.evaluate(() => window.FWBViews.items.load(['ai'], true)); await page.waitForTimeout(800); await go('aiwork');
const aid = await page.evaluate(() => (window.FWBViews.items.list('ai')[0] || {}).id);
await page.evaluate(id => window.FWBViews.ACT.aiOpen({ getAttribute: k => (k === 'data-id' ? id : null) }), aid); await page.waitForTimeout(700);
await page.evaluate(() => { const t = document.getElementById('ai_c'); if (t) t.value += '\n\n## Unsaved heading\n\n| Step | Expected |\n|---|---|\n| Raise a request | Ticket created |\n\n- **Bold** point [S1]'; });
f = await dl('AI draft Word (.docx)', () => click('[data-act="aiExport"]')); if (f) { const t = await docx(f); const zip = fs.readFileSync(f).slice(0, 2).toString(); ok('AI draft Word (.docx)', f, [['.docx extension', f.endsWith('.docx')], ['is a real Office file (zip)', zip === 'PK'], ['has the draft text', /Draft|Based on/.test(t)], ['includes unsaved edits', t.includes('Unsaved heading')], ['table text kept', t.includes('Ticket created')]]); }
await page.keyboard.press('Escape');

// --- Status report → Word
await go('reports'); await click('[data-act="repNew"]'); await page.waitForTimeout(1200);
f = await dl('Status report Word (.docx)', () => click('#drawer [data-act="repExport"]')); if (f) { const t = await docx(f); ok('Status report Word (.docx)', f, [['.docx extension', f.endsWith('.docx')], ['is a real Office file (zip)', fs.readFileSync(f).slice(0, 2).toString() === 'PK'], ['has the report title', /status report|Monthly report/i.test(t)], ['has body text', t.length > 120]]); }
f = await dl('Status report e-mail (.eml)', () => click('#drawer [data-act="repEml"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Status report e-mail (.eml)', f, [['MIME headers', /Subject:/i.test(t) && /Content-Type:/i.test(t)]]); }
await page.keyboard.press('Escape');

// --- User Guide Builder: Word and PDF
await go('guidebuilder'); const nb = await page.$('[data-act="ugNew"]'); if (nb) { await nb.click(); await page.waitForTimeout(600); await page.selectOption('#ug_start', 'empty').catch(() => { }); await page.locator('#drawer .drawer-f .btn.primary').first().click(); await page.waitForTimeout(1500); }
await page.locator('.tabs > *, [role=tab]', { hasText: /export/i }).first().click().catch(() => { }); await page.waitForTimeout(800);
const emptyRefused = await page.evaluate(async () => { const n0 = document.querySelectorAll('a[download]').length; const b = document.querySelector('[data-act="ugDocx"]'); if (!b) return 'no button'; b.click(); await new Promise(r => setTimeout(r, 900)); return [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' '); });
  ok('User guide: empty guide is not exported blank', null, [['refused with a message (' + String(emptyRefused).slice(0, 60) + ')', /nothing to export/i.test(emptyRefused)]]);
  await page.evaluate(async () => { const V = window.FWBViews; const g = V.items.list('ugd')[0]; if (!g) return; const d = Object.assign({}, g); delete d.id; d.sections = [{ id: 's1', title: 'Raising a service request', blocks: [{ t: 'md', text: '## Before you start\nYou need the **Requester** role.\n\n1. Open Service Requests\n2. Select New\n3. Fill the form and Save\n\n| Field | What to enter |\n|---|---|\n| Site | Your building |\n| Category | HVAC |' }] }, { id: 's2', title: 'Approving work orders', blocks: [{ t: 'md', text: 'Supervisors approve work orders from the **Approvals** tab.' }] }]; await V.items.put('ugd', g.id, d); V.render(); });
  await page.waitForTimeout(900); await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1200); await go('guidebuilder'); await page.waitForTimeout(800); const og = await page.$('[data-act="ugOpen"]'); if (og) { await og.click(); await page.waitForTimeout(900); } await page.locator('.tabs > *, [role=tab]', { hasText: /export/i }).first().click().catch(() => { }); await page.waitForTimeout(800);
f = await dl('User guide Word (.docx)', () => click('[data-act="ugDocx"]')); if (f) { const t = await docx(f); ok('User guide Word (.docx)', f, [['has the guide title', /User guide/i.test(t)], ['has the customer', t.includes('Emirates National Engineering')], ['has section headings', t.includes('Raising a service request') && t.includes('Approving work orders')], ['has steps and table text', t.includes('Fill the form and Save') && t.includes('Your building')]]); }
f = await dl('User guide PDF', () => click('[data-act="ugPdf"]')); if (f) { const p = await pdf(f); ok('User guide PDF', f, [['opens, ' + p.pages + ' pages', p.pages >= 2], ['has the guide title', /User guide/i.test(p.text)], ['has section content', p.text.includes('Raising a service request') && p.text.includes('Your building')]]); }

// --- smaller exports
await go('custintro'); f = await dl('Customer introduction HTML', () => click('[data-act="ciExport"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Customer introduction HTML', f, [['HTML document', /<html/i.test(t)], ['names the customer', t.includes('Emirates National Engineering')]]); }
await go('settings'); await page.locator('.tabs > *', { hasText: /JSON/ }).first().click().catch(() => { }); await page.waitForTimeout(500);
for (const k of ['modules', 'stateflows', 'roles']) { f = await dl('JSON export ' + k, () => click(`[data-act="exportJson"][data-k="${k}"], [data-act="exportJson"][data-kind="${k}"], [data-act="exportJson"][data-v="${k}"]`)); if (f) { let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { } ok('JSON export ' + k, f, [['valid JSON', !!j], ['not empty', j && JSON.stringify(j).length > 200]]); } }
await go('trace'); f = await dl('Traceability CSV', () => click('[data-act="trCsv"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Traceability CSV', f, [['BOM', t.charCodeAt(0) === 0xfeff], ['header row (no requirements recorded yet, so no data rows)', /Requirement/.test(t.split('\n')[0])]]); }
await go('pkgan'); f = await dl('Package findings CSV', () => click('[data-act="pkgCsv"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Package findings CSV', f, [['BOM', t.charCodeAt(0) === 0xfeff], ['header + findings', t.trim().split('\n').length >= 2]]); }
await go('flow'); await click('[data-act="openFlow"]'); await page.waitForTimeout(1500); f = await dl('State flow PNG', () => click('[data-act="dlPng"]')); if (f) { const b = fs.readFileSync(f);
  // decode it and compare with the full diagram: every state's label must fit in the picture, not only the part on screen
  const chk = await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const V = window.FWBViews, F = window.FWB, D = window.FWBDiagrams; const f = F.flowModel(window.FWB.S.ui.flowId); const svg = D.flowSvg(f, { full: true }); const m = svg.match(/viewBox="-?[\d.]+ -?[\d.]+ ([\d.]+) ([\d.]+)"/); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 200) ink++; return { w: im.width, h: im.height, vw: +m[1], vh: +m[2], states: f.states.length, ink }; }, b.toString('base64'));
  ok('State flow PNG', f, [['PNG signature', b[0] === 0x89], [`whole diagram at 2x (${chk.w}×${chk.h} for a ${chk.vw}×${chk.vh} diagram, ${chk.states} states)`, Math.abs(chk.w - chk.vw * 2) < 4 && Math.abs(chk.h - chk.vh * 2) < 4], ['has drawn content', chk.ink > 500], ['named after module and flow (' + path.basename(f) + ')', /^[a-z0-9]+([_-][a-z0-9]+)+\.png$/i.test(path.basename(f)) && path.basename(f) !== 'state-flow.png']]); }
// print-to-PDF (browser print): the print frame must hold the page content
await go('overview'); const printed = await page.evaluate(async () => { let html = ''; const orig = HTMLIFrameElement.prototype; const real = window.print; const obs = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.tagName === 'IFRAME') { try { n.contentWindow.print = () => { html = n.contentDocument.body.innerHTML; }; } catch (e) { } } }))); obs.observe(document.body, { childList: true }); const b = document.querySelector('[data-act="rgPdf"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 2500)); obs.disconnect(); return { found: !!b, len: html.length }; });
ok('Overview print to PDF', null, [['button present', printed.found], ['print frame holds the page (' + printed.len + ' chars)', printed.len > 500]]);

// shared helpers behind several exports: unsafe sheet names and non-PNG/JPEG images
const helpers = await page.evaluate(async () => { const V = window.FWBViews; if (!V.sheetName || !V.docImage) return { missing: true }; const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); const names = ['Summary', 'summary', 'Definitions', 'Asset/Category: [Main]?', 'A very long KPI group name that goes past thirty one characters', 'A very long KPI group name that goes past thirty one characters'].map(n => wb.addWorksheet(V.sheetName(wb, n)).name); const buf = await wb.xlsx.writeBuffer();
  const c = document.createElement('canvas'); c.width = 40; c.height = 20; c.getContext('2d').fillRect(0, 0, 40, 20); const webp = await new Promise(r => c.toBlob(r, 'image/webp')); const im = await V.docImage(webp); return { names, bytes: buf.byteLength, imgType: im.type, imgSig: im.u8[0], w: im.w }; });
ok('Sheet names: duplicates, case and invalid characters', null, [['workbook writes (' + helpers.bytes + ' bytes)', helpers.bytes > 1000], ['names unique and valid: ' + (helpers.names || []).join(' | '), helpers.names && new Set(helpers.names.map(n => n.toLowerCase())).size === helpers.names.length && helpers.names.every(n => n.length <= 31 && !/[\\/?*[\]:]/.test(n))]]);
ok('Images for Word/Excel: WebP converted to PNG', null, [['type ' + helpers.imgType, helpers.imgType === 'png' && helpers.imgSig === 0x89 && helpers.w === 40]]);
fs.writeFileSync(path.join(OUT, 'exports.json'), JSON.stringify({ results, pageErrors: [...new Set(errors)] }, null, 1));
console.log(`\n${results.filter(r => r.pass).length}/${results.length} exports passed content checks`); if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
await browser.close();
