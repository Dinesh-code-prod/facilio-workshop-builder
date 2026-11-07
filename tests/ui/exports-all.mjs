// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/exports-all.mjs
// Export content audit with realistic data. Creates a fresh project, seeds it through the app's own API and state
// (requirements, use cases, decisions, RAID, actions, UAT, lessons, status reports, AI drafts, user guide, workshop sessions,
// processes, Arabic text, control characters pasted from Office, markdown tables, long text) and then triggers every export
// from the UI, opening each file and checking that the SEEDED data is in it, not only that a file arrived:
//   .docx: unzipped, word/document.xml parsed as strict XML (Word refuses invalid XML), text checked
//   .xlsx: loaded with ExcelJS, rows and cell text checked, sheet XML checked for invalid characters
//   .pdf : pdf.js page count and text (and pdftotext when installed)
//   .csv / .json / .html / .eml / .png: parsed or signature-checked
// Some exports are started from a page that was never opened in this session (lazy loading). Usage:
//   node tests/ui/devserver.mjs 4191 &  node tests/ui/exports-all.mjs [outDir] [baseUrl]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import ExcelJS from 'exceljs'; import JSZip from 'jszip'; import { DOMParser } from '@xmldom/xmldom';
const OUT = process.argv[2] || 'tests/ui/out-exports-all'; const BASE = process.argv[3] || 'http://localhost:4173'; fs.mkdirSync(OUT, { recursive: true });
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const AR = 'طلب صيانة عاجل للمكيف'; const CTRL = 'Pasted from Word\u000bsecond line\u0007 end'; const CUST = 'Al Noor Facilities LLC'; const NAME = 'Al Noor Towers CAFM Rollout';
const results = [];
const ok = (name, file, checks) => { const failed = checks.filter(c => !c[1]); results.push({ name, file: file && path.basename(file), pass: !failed.length, detail: checks.map(c => (c[1] ? 'ok ' : 'FAIL ') + c[0]).join('; ') }); console.log((failed.length ? 'FAIL ' : 'ok   ') + name.padEnd(44) + ' ' + (failed.length ? failed.map(c => c[0]).join('; ') : (file ? path.basename(file) : ''))); };
const BAD_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/;
async function zipXml(f, re) { const z = await JSZip.loadAsync(fs.readFileSync(f)); const out = {}; for (const n of Object.keys(z.files).filter(n => re.test(n))) out[n] = await z.file(n).async('string'); return out; }
function strictXml(s) { const errs = []; new DOMParser({ errorHandler: { warning: () => { }, error: e => errs.push(e), fatalError: e => errs.push(e) } }).parseFromString(s, 'text/xml'); return errs.length === 0 && !BAD_XML.test(s); }
async function docx(f) { try { const x = await zipXml(f, /^word\/(document|header\d*|footer\d*)\.xml$/); const d = x['word/document.xml'] || ''; const valid = Object.values(x).every(strictXml); const media = Object.keys((await JSZip.loadAsync(fs.readFileSync(f))).files).filter(n => /^word\/media\//.test(n)).length; const text = d.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'"); return { valid, text, ok: !!d, media }; } catch (e) { return { valid: false, text: 'NOT A DOCX: ' + e.message, ok: false }; } }
async function xlsx(f) { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f); const x = await zipXml(f, /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/); const valid = Object.values(x).every(strictXml); const all = []; wb.worksheets.forEach(ws => ws.eachRow({ includeEmpty: false }, r => r.eachCell({ includeEmpty: false }, c => all.push(cellText(c.value))))); return { wb, valid, text: all.join(' | ') }; }
const cellText = v => v == null ? '' : typeof v === 'object' ? (v.richText ? v.richText.map(r => r.text).join('') : v.text != null ? String(v.text) : v.result != null ? String(v.result) : v instanceof Date ? v.toISOString() : JSON.stringify(v)) : String(v);
async function pdf(f) { try { const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise; let text = ''; for (let i = 1; i <= doc.numPages; i++) { const c = await (await doc.getPage(i)).getTextContent(); text += c.items.map(x => x.str).join(' ') + '\n'; } let pt = ''; try { pt = execFileSync('pdftotext', ['-q', f, '-'], { encoding: 'utf8' }); } catch (e) { } return { pages: doc.numPages, text: (text + ' ' + pt).replace(/\s+/g, ' ') }; } catch (e) { return { pages: 0, text: 'NOT A PDF: ' + e.message }; } }
const rows = ws => { let n = 0; ws.eachRow({ includeEmpty: false }, () => n++); return n; };
const has = (t, s) => String(t).includes(s);
// Arabic in a PDF is stored in visual order; accept each word either as written or with its letters reversed
const arIn = t => AR.split(' ').every(w => has(t, w) || has(t, [...w].reverse().join('')));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(BASE + '/'); await page.waitForSelector('[data-act]');
const api = (m, p, b) => page.evaluate(async ([m, p, b]) => { const r = await fetch('/api/fn/api' + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { raw: t }; } }, [m, p, b]);

// ---------- seed records through the API ----------
const pid = (await api('POST', '/projects', { name: NAME, customer: CUST, description: 'Export audit project ' + AR })).project.id;
const put = (k, id, data) => api('PUT', `/projects/${pid}/items/${k}/${id}`, { data });
const longTxt = 'The chiller plant at Tower B needs a quarterly service window agreed with the tenant association. '.repeat(30);
await put('decision', 'dc1', { title: 'Use one helpdesk for both towers QZDEC', status: 'Agreed', owner: 'Omar Haddad', date: '2026-10-20', detail: longTxt });
await put('decision', 'dc2', { title: 'قرار: اعتماد نموذج طلب الخدمة الموحد', status: 'Agreed' });
await put('raid', 'rd1', { type: 'Risk', title: 'Asset register incomplete QZRISK', severity: 'High', status: 'Open', owner: 'Priya Nair' });
await put('action', 'ac1', { text: 'Send asset template QZACT', title: 'Send asset template QZACT', owner: 'Dinesh R', due: '2026-11-04', status: 'Open' });
await put('lesson', 'ls1', { title: 'Collect asset data early QZLESSON', area: 'Data', impact: 'High', what: 'Late data ' + CTRL, reco: 'Ask in kick-off, ' + AR, reusable: true });
await put('lesson', 'ls2', { title: 'Comma, "quotes" and\nnew lines', area: 'CSV', impact: 'Low', what: 'x', reco: 'y' });
await put('uat', 'ua1', { type: 'demo', title: 'UAT demo work orders QZUAT', date: '2026-11-10', mod: 'Work Orders', audience: 'Technicians', topics: 'Raise, assign, close', published: true });
await put('build', 'workorder', { status: 'In progress' });
await put('usecase', 'uc1', { no: 1, title: 'Tenant raises AC complaint QZUC', modules: ['workorder'], reqIds: ['WO-001'], solution: 'Configuration', priority: 'High', scope: 'In scope', impl: 'Not started', confirmation: 'Customer confirmed', confBy: 'Omar', steps: ['Open portal', AR], acceptance: 'Given a complaint when raised then a WO is created' });
await put('signoff', 'so1', { title: 'BRD sign-off QZSIGN', status: 'Pending' });
await put('checklist', 'ck1', { group: 'uat', text: 'UAT environment ready QZCHK', done: false });
const repMd = `## Overall status (RAG and reason)\n\nAmber: data migration is late QZREP. ${AR}\n\n## Progress this week\n\n- Configured **work order** flow\n- ${CTRL}\n1. Numbered item one\n2. Numbered item two\n\n## Risks and issues\n\n| Risk | Owner | Status |\n|---|---|---|\n| Asset data QZTBL | Priya | Open |\n| ${AR} | عمر | مفتوح |\n\n##### Deep heading QZH5\n\n` + Array.from({ length: 300 }, (_, i) => `Line ${i} of a long report body.`).join('\n');
await put('rep', 'rp1', { type: 'WSR', title: 'Weekly status report', periodStart: '2026-10-19', periodEnd: '2026-10-23', due: '2026-10-23', status: 'draft', content: repMd, recipients: 'omar@alnoor.example', cc: '', attachments: [] });
await api('POST', `/projects/${pid}/ai/run`, { task: 'uat', instruction: 'export test' });
const aiItems = (await api('GET', `/projects/${pid}/items?kinds=ai`)); const aiList = (aiItems.items || []).filter(x => x.kind === 'ai' || x.data);
const aiId = (aiList[0] || {}).id || (aiList[0] || {}).item;
const bigTable = '| # | Test step | Expected result |\n|---|---|---|\n' + Array.from({ length: 400 }, (_, i) => `| ${i + 1} | Step ${i + 1} raise request | Ticket ${i + 1} created |`).join('\n');
const aiContent = `# UAT plan QZAI\n\nScope ${AR}.\n\n${CTRL}\n\n## Test cases\n\n${bigTable}\n\n- **Bold** point [S1]\n#### Level four QZH4`;
const guideMd = `## Before you start\nYou need the **Requester** role QZGUIDE.\n\n1. Open Service Requests\n2. Select New\n3. Fill the form and Save\n\n| Field | What to enter |\n|---|---|\n| Site | Your building |\n| ${AR} | نعم |\n\n${CTRL}\n\n#### Small heading QZGH4`;
await put('ugd', 'ug1', { title: 'Requester guide QZUG', customer: CUST, audience: 'Tenants', version: '0.1', status: 'draft', brand: { accent: '#1570EF', footer: 'Al Noor', cover: true, logo: null }, sections: [{ id: 's1', title: 'Raising a service request', blocks: [{ t: 'md', text: guideMd }, { t: 'img', fileId: 'missing-file-id', caption: 'Missing screenshot' }] }, { id: 's2', title: 'Approving work orders ' + AR, blocks: [{ t: 'md', text: 'Supervisors approve from the **Approvals** tab QZAPPROVE.' }] }] });
await api('PUT', `/projects/${pid}/guide-responses`, { key: 'wo:a:channels', value: ['Phone', 'WhatsApp'] });
await put('wb', 'wb1', { name: 'Complaint board QZWB', miro: '', grid: true, snap: true, route: 'straight', view: { x: 40, y: 40, z: 1 }, edges: [{ id: 'e1', from: 'n1', to: 'n2' }], nodes: [{ id: 'n1', t: 'rect', x: 0, y: 0, w: 160, h: 64, text: 'R&D <review> step' }, { id: 'n2', t: 'note', x: 260, y: 0, w: 160, h: 110, text: AR, fill: '#FFF3B0' }] });
fs.writeFileSync(path.join(OUT, 'seed.json'), JSON.stringify({ pid, aiId }, null, 1));

// ---------- open the project and seed the workshop documents through the app (as a consultant would) ----------
await page.goto(BASE + `/#/p/${pid}/overview`); await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1500);
await page.evaluate(async ([AR, CTRL]) => { const F = window.FWB, S = F.S; const p = S.ws.project; p.background = 'Al Noor operates two towers QZBG. ' + AR + '\n' + CTRL; p.objective = 'One CAFM for both towers QZOBJ';
  S.ws.requirements.push({ id: 'WO-001', title: 'Chiller PPM every 90 days QZREQ', objective: 'Keep chillers within warranty ' + AR, modules: ['workorder'], classification: 'change', status: 'Confirmed', confirmedBy: 'Omar', confirmedAt: '2026-10-20', fields: [], transitions: [], acceptance: 'PPM generated quarterly' + CTRL });
  S.ws.requirements.push({ id: 'WO-002', title: 'Draft requirement QZDRAFT', modules: ['workorder'], status: 'Draft', fields: [], transitions: [] });
  S.ws.questions.push({ id: 'q1', text: 'Who approves emergency work QZQ? ' + AR, area: 'Work Orders', status: 'open', owner: 'customer' });
  S.ws.processes.push({ id: 'proc_qz', name: 'Complaint to closure QZPROC', objective: 'Close complaints fast', trigger: 'Tenant call', module: 'workorder', outcome: 'Closed WO', lanes: [], steps: [{ id: 'st1', lane: 'tbc:any', action: 'Logs the complaint QZSTEP', interface: 'Facilio web app (Maintenance)', record: 'workorder', transitionId: '', verification: 'proposed', notes: '' }, { id: 'st3', lane: 'tbc:any', action: 'Checks & approves <urgent> jobs QZAMP', interface: 'Facilio web app (Maintenance)', record: 'workorder', transitionId: '', verification: 'tbc', notes: 'R&D "quoted"' }, { id: 'st2', lane: 'system', action: AR, interface: 'System (automatic)', record: 'workorder', transitionId: '', verification: 'inferred', notes: '' }] });
  const pl = F.doc('planner'); pl.sessions.push({ id: 'ses1', no: 1, title: 'Work order workshop QZSES', topics: 'Flows, SLAs ' + AR, participants: 'FM team', date: '2026-11-02', start: '10:00', minutes: 120, mode: 'Virtual Session', modules: ['workorder'], status: 'planned' });
  const ci = F.doc('custintro'); ci.objectives = 'Go live in Q1 QZCI ' + AR; ci.welcome = 'Welcome to the programme QZWEL';
  F.changed('seed', 'export audit'); F.markDirty('planner'); F.markDirty('custintro'); await F.flush(); }, [AR, CTRL]);
await page.waitForTimeout(800);
// reload so every later export starts from data read back from the server
await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1500);

const go = async (v, extra) => { await page.evaluate(() => { document.querySelectorAll('.scrim').forEach(e => e.remove()); if (window.FWBViews.closeDrawer) window.FWBViews.closeDrawer(); }); await page.evaluate(([v, x]) => window.FWBViews.go(v, x), [v, extra || null]); await page.waitForTimeout(900); await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 }).catch(() => { }); };
const toasts = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '));
async function dl(name, trigger, timeout) {
  await page.waitForSelector('#loading', { state: 'detached', timeout: 30000 }).catch(() => { }); await page.waitForTimeout(200);
  try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: timeout || 45000 }), (async () => { await trigger(); for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); const c = await page.$('.scrim .dialog [data-r="1"]'); if (c) { await c.click(); break; } } })()]); const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; }
  catch (e) { ok(name, null, [['download arrived (' + (await toasts()).slice(0, 160) + ' ' + e.message.slice(0, 80) + ')', false]]); return null; }
}
const click = sel => page.locator(sel).first().click({ timeout: 10000 });
// starts an action through the app's own click handler (as a button would), without waiting for it, so confirm dialogs can be answered
const act = (a, attrs) => page.evaluate(([a, attrs]) => { const el = document.createElement('button'); Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v)); el.setAttribute('data-act', a); el.style.cssText = 'position:fixed;left:-99px;top:0'; document.body.appendChild(el); el.click(); setTimeout(() => el.remove(), 60000); }, [a, attrs]);
const noCtl = t => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(t);

// ---------- Word: BRD ----------
await go('brd');
let f = await dl('BRD Word (.docx)', () => click('[data-act="brdDocx"]'), 90000); if (f) { const d = await docx(f); ok('BRD Word (.docx)', f, [['valid Word XML', d.valid], ['customer', has(d.text, CUST)], ['background text', has(d.text, 'QZBG')], ['confirmed requirement', has(d.text, 'QZREQ')], ['draft requirement left out', !has(d.text, 'QZDRAFT')], ['Arabic text kept', has(d.text, AR)], ['process QZPROC', has(d.text, 'QZPROC')], ['open question', has(d.text, 'QZQ')], ['step with & and < kept', has(d.text, 'Checks & approves <urgent> jobs')], ['diagrams embedded (' + d.media + ' images)', d.media >= 1], ['no "[Diagram could not be rendered]"', !has(d.text, 'could not be rendered')]]); }
f = await dl('BRD PDF', () => click('[data-act="brdPdf"]'), 90000); if (f) { const p = await pdf(f); ok('BRD PDF', f, [['pages ' + p.pages, p.pages >= 3], ['customer', has(p.text, CUST)], ['requirement QZREQ', has(p.text, 'QZREQ')], ['background QZBG', has(p.text, 'QZBG')], ['Arabic text drawn', arIn(p.text)]]); }

// ---------- Dashboard report ----------
await go('dashreport');
f = await dl('Dashboard report Excel', () => click('[data-act="drExport"][data-fmt="xlsx"]')); if (f) { const x = await xlsx(f); ok('Dashboard report Excel', f, [['valid sheet XML', x.valid], ['project name', has(x.text, NAME)], ['requirement row QZREQ', has(x.text, 'QZREQ') || has(x.text, 'WO-001')], ['question row', has(x.text, 'QZQ')], ['Arabic kept', has(x.text, AR)]]); }
f = await dl('Dashboard report PDF', () => click('[data-act="drExport"][data-fmt="pdf"]')); if (f) { const p = await pdf(f); ok('Dashboard report PDF', f, [['pages ' + p.pages, p.pages >= 1], ['project name', has(p.text, NAME)], ['question QZQ', has(p.text, 'QZQ')], ['Arabic text drawn', arIn(p.text)]]); }
f = await dl('Dashboard report CSV', () => click('[data-act="drExport"][data-fmt="csv"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Dashboard report CSV', f, [['BOM', t.charCodeAt(0) === 0xfeff], ['question QZQ', has(t, 'QZQ')], ['Arabic', has(t, AR)], ['no control characters', noCtl(t)]]); }
f = await dl('Dashboard report PNG', () => click('[data-act="drExport"][data-fmt="png"]')); if (f) { const b = fs.readFileSync(f); ok('Dashboard report PNG', f, [['PNG', b[0] === 0x89 && b[1] === 0x50], ['not tiny (' + b.length + ')', b.length > 20000]]); }

// ---------- Status report (WSR) Word and .eml, opened straight from the list ----------
await go('reports'); await page.evaluate(() => window.FWBViews.ACT.repOpen({ getAttribute: () => 'rp1' })); await page.waitForTimeout(700);
f = await dl('Status report Word (.docx)', () => click('#drawer [data-act="repExport"]')); if (f) { const d = await docx(f); ok('Status report Word (.docx)', f, [['valid Word XML (control characters removed)', d.valid], ['report text QZREP', has(d.text, 'QZREP')], ['table cell QZTBL', has(d.text, 'QZTBL')], ['Arabic', has(d.text, AR)], ['numbered items', has(d.text, 'Numbered item two')], ['long body kept (line 299)', has(d.text, 'Line 299 of')], ['deep heading text', has(d.text, 'QZH5')]]); }
f = await dl('Status report e-mail (.eml)', () => click('#drawer [data-act="repEml"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); const m = /base64\r\n\r\n([\s\S]*?)\r\n--/.exec(t); const body = m ? Buffer.from(m[1].replace(/\r\n/g, ''), 'base64').toString('utf8') : ''; ok('Status report e-mail (.eml)', f, [['MIME headers', /Subject:/.test(t) && /multipart\/mixed/.test(t)], ['body has report text', has(body, 'QZREP')], ['body has Arabic', has(body, AR)]]); }
await page.keyboard.press('Escape');

// ---------- AI draft Word (large table, Arabic, control characters) ----------
await page.evaluate(async ([aiId, c]) => { const I = window.FWBViews.items; await I.load(['ai'], true); const id = aiId || (I.list('ai')[0] || {}).id; const d = I.get('ai', id); await I.put('ai', id, Object.assign({}, d, { content: c })); }, [aiId, aiContent]);
await go('aiwork'); const aid = await page.evaluate(() => (window.FWBViews.items.list('ai')[0] || {}).id);
await page.evaluate(id => window.FWBViews.ACT.aiOpen({ getAttribute: k => (k === 'data-id' ? id : null) }), aid); await page.waitForTimeout(700);
f = await dl('AI draft Word (.docx)', () => click('#drawer [data-act="aiExport"]'), 90000); if (f) { const d = await docx(f); ok('AI draft Word (.docx)', f, [['valid Word XML', d.valid], ['title QZAI', has(d.text, 'QZAI')], ['400-row table (last row)', has(d.text, 'Ticket 400 created')], ['Arabic', has(d.text, AR)], ['level-4 heading', has(d.text, 'QZH4')]]); }
await page.keyboard.press('Escape');

// ---------- User guide Word and PDF (missing screenshot, Arabic, control characters) ----------
await go('guidebuilder'); await page.evaluate(() => { window.FWB.S.ui.ugOpen = 'ug1'; window.FWB.S.ui.ugTab = 'export'; window.FWBViews.render(); }); await page.waitForTimeout(1200);
f = await dl('User guide Word (.docx)', () => act('ugDocx')); if (f) { const d = await docx(f); ok('User guide Word (.docx)', f, [['valid Word XML', d.valid], ['title QZUG', has(d.text, 'QZUG')], ['customer', has(d.text, CUST)], ['steps', has(d.text, 'Fill the form and Save')], ['table text', has(d.text, 'Your building')], ['Arabic', has(d.text, AR)], ['second section', has(d.text, 'QZAPPROVE')], ['missing screenshot noted', has(d.text, 'Screenshot not available')]]); }
f = await dl('User guide PDF', () => act('ugPdf')); if (f) { const p = await pdf(f); ok('User guide PDF', f, [['pages ' + p.pages, p.pages >= 3], ['title QZUG', has(p.text, 'QZUG')], ['content QZGUIDE', has(p.text, 'QZGUIDE')], ['second section', has(p.text, 'QZAPPROVE')], ['table text', has(p.text, 'Your building')], ['Arabic text drawn', arIn(p.text)]]); }

// ---------- Workshop plan Excel (from sessions) ----------
await go('planner', { plTab: 'export' }); await page.evaluate(() => { window.FWB.S.ui.mfStep = 'final'; window.FWBViews.render(); }); await page.waitForTimeout(800);
f = await dl('Workshop plan Excel', () => act('exportPlan'), 60000); if (f) { const x = await xlsx(f); ok('Workshop plan Excel', f, [['valid sheet XML', x.valid], ['customer', has(x.text, CUST)], ['session row QZSES', has(x.text, 'QZSES')], ['Arabic topics', has(x.text, AR)]]); }

// ---------- CSV exports ----------
await go('trace'); f = await dl('Traceability CSV', () => act('trCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Traceability CSV', f, [['BOM', t.charCodeAt(0) === 0xfeff], ['requirement row QZREQ', has(t, 'QZREQ')], ['use case linked', has(t, 'UC-1')]]); }
f = await dl('Lessons learned CSV', () => act('trLessonCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Lessons learned CSV', f, [['lesson QZLESSON', has(t, 'QZLESSON')], ['quotes escaped', has(t, '"Comma, ""quotes"" and')], ['Arabic', has(t, AR)], ['no control characters', noCtl(t)]]); }
await go('pkgan'); f = await dl('Package findings CSV', () => act('pkgCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Package findings CSV', f, [['header + findings', t.trim().split('\n').length >= 2]]); }

// ---------- exports started from pages never opened in this session (records loaded lazily) ----------
await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1500);
f = await dl('Lessons CSV before Traceability is opened', () => act('trLessonCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Lessons CSV before Traceability is opened', f, [['lesson QZLESSON', has(t, 'QZLESSON')]]); }
f = await dl('Traceability CSV before the page is opened', () => act('trCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Traceability CSV before the page is opened', f, [['use case linked (UC-1)', has(t, 'UC-1')]]); }
f = await dl('Dashboard CSV before the page is opened', () => act('drExport', { 'data-fmt': 'csv' })); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Dashboard CSV before the page is opened', f, [['use case QZUC', has(t, 'QZUC')], ['requirement QZREQ', has(t, 'QZREQ')], ['session QZSES', has(t, 'QZSES')]]); }

// ---------- customer introduction, JSON, onboarding, FTR/KPI ----------
await go('custintro'); f = await dl('Customer introduction HTML', () => act('ciExport')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Customer introduction HTML', f, [['HTML', /<html/i.test(t)], ['customer', has(t, CUST)], ['objectives QZCI', has(t, 'QZCI')]]); }
await go('settings'); for (const k of ['modules', 'stateflows', 'roles']) { f = await dl('JSON export ' + k, () => page.evaluate(k => window.FWBViews.exportsApi.download(k), k)); if (f) { let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { } ok('JSON export ' + k, f, [['valid JSON', !!j], ['not empty', j && JSON.stringify(j).length > 200]]); } }
await go('onboarding'); f = await dl('Data onboarding workbook', () => click('[data-act="onbDownload"]'), 60000); if (f) { const x = await xlsx(f); ok('Data onboarding workbook', f, [['valid sheet XML', x.valid], [x.wb.worksheets.length + ' sheets', x.wb.worksheets.length > 3], ['template sheets have headers', x.wb.worksheets.every(w => rows(w) >= 1)]]); }
for (const v of ['ftr', 'kpi']) { await go(v); const st = await page.$(`[data-act="${v}Start"]`); if (st) { await st.click(); await page.waitForTimeout(2500); await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 }).catch(() => { }); }
  f = await dl(v.toUpperCase() + ' workbook', () => click(`[data-act="${v}Dl"]`)); if (f) { const x = await xlsx(f); ok(v.toUpperCase() + ' workbook', f, [['valid sheet XML', x.valid], ['sheets have rows', x.wb.worksheets.every(w => rows(w) >= 1)]]); } }

// ---------- images: swimlane, state flow ----------
await go('roles'); await page.evaluate(() => { const S = window.FWB.S; S.ui.rolesTab = 'process'; S.ui.processId = 'proc_qz'; window.FWBViews.render(); }); await page.waitForTimeout(800);
f = await dl('Process swimlane PNG', () => page.evaluate(() => window.FWBViews.ACT.dlSwim())); if (f) { const b = fs.readFileSync(f); ok('Process swimlane PNG', f, [['PNG', b[0] === 0x89], ['not tiny (' + b.length + ')', b.length > 5000]]); }

// ---------- admin CSV ----------
f = await dl('Admin projects CSV (before the console has loaded)', () => act('admExport')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Admin projects CSV (before the console has loaded)', f, [['project row', has(t, NAME)]]); }
await page.evaluate(() => window.FWBViews.ACT.openAdmin()); await page.waitForTimeout(2500); await page.evaluate(() => window.FWBViews.ACT.admGo({ getAttribute: () => 'projects' })); await page.waitForTimeout(1200);
f = await dl('Admin projects CSV', () => click('[data-act="admExport"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Admin projects CSV', f, [['BOM', t.charCodeAt(0) === 0xfeff], ['project row', has(t, NAME)]]); }

// ---------- guide answers CSV, started on a freshly opened project (answers not fetched yet) ----------
await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(1500);
f = await dl('Guide answers CSV (answers not loaded yet)', () => act('glCsv')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Guide answers CSV (answers not loaded yet)', f, [['answer row', has(t, 'How do requests reach you') && has(t, 'WhatsApp')]]); }

// ---------- status report with an attachment: .eml carries it, the attachment downloads intact ----------
const att = await page.evaluate(async () => { const S = window.FWB.S, V = window.FWBViews; const bytes = new TextEncoder().encode('Attachment body QZATT ' + 'x'.repeat(5000)); const rec = await window.FWBApi.uploadFile(S.project.id, new File([bytes], 'site-photos QZ.txt', { type: 'text/plain' }), 'report_attachment', { report: 'rp1' }); const r = V.items.get('rep', 'rp1'); await V.items.put('rep', 'rp1', Object.assign({}, r, { attachments: [{ id: rec.id, name: 'site-photos QZ.txt' }] })); return rec.id; });
await go('reports'); await page.evaluate(() => window.FWBViews.ACT.repOpen({ getAttribute: () => 'rp1' })); await page.waitForTimeout(700);
f = await dl('Status report .eml with attachment', () => click('#drawer [data-act="repEml"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); const parts = [...t.matchAll(/filename="([^"]+)"[\s\S]*?base64\r\n\r\n([\s\S]*?)\r\n--/g)]; const body = parts[0] ? Buffer.from(parts[0][2].replace(/\r\n/g, ''), 'base64').toString('utf8') : ''; ok('Status report .eml with attachment', f, [['attachment part present', parts.length === 1], ['attachment bytes intact', has(body, 'Attachment body QZATT') && body.length > 5000]]); }
f = await dl('Report attachment download', () => click('#drawer [data-act="repAttDl"]')); if (f) { const t = fs.readFileSync(f, 'utf8'); ok('Report attachment download', f, [['same content', has(t, 'Attachment body QZATT') && t.length > 5000]]); }
await page.keyboard.press('Escape');

// ---------- workshop plan: edit in spreadsheet, then download ----------
await go('planner', { plTab: 'export' }); await click('[data-act="plEdOpen"][data-from="fresh"]').catch(e => console.log('no editor button', e.message.slice(0, 80))); await page.waitForTimeout(3000);
f = await dl('Workshop plan (edited in the spreadsheet)', () => click('[data-act="plEdDownload"]'), 60000); if (f) { const x = await xlsx(f); ok('Workshop plan (edited in the spreadsheet)', f, [['valid sheet XML', x.valid], ['session row QZSES', has(x.text, 'QZSES')]]); }
await page.evaluate(() => { window.FWB.S.ui.plEditor = false; });

// ---------- Contract flow, step 5: the live schedule sheet downloads as Excel ----------
await go('msaflow'); await page.evaluate(() => window.FWBViews.ACT.mfSub({ getAttribute: k => (k === 'data-s' ? 'schedule' : 'live') })); await page.waitForTimeout(3500);
f = await dl('Workshop plan (live schedule sheet)', () => click('[data-act="mfSheetDownload"]'), 60000); if (f) { const x = await xlsx(f); ok('Workshop plan (live schedule sheet)', f, [['valid sheet XML', x.valid], ['session row QZSES', has(x.text, 'QZSES')], ['hidden session IDs not exported', !has(x.text, 'ses1')]]); }

// ---------- diagrams: state flow PNG, whiteboard PNG (labels with & and <, Arabic note) ----------
const ink = b64 => page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 200) n++; return { w: im.width, h: im.height, n }; }, b64);
await go('flow'); await click('[data-act="openFlow"]'); await page.waitForTimeout(1500); f = await dl('State flow PNG', () => click('[data-act="dlPng"]')); if (f) { const b = fs.readFileSync(f); const k = await ink(b.toString('base64')); ok('State flow PNG', f, [['PNG', b[0] === 0x89], ['drawn content (' + k.w + 'x' + k.h + ', ink ' + k.n + ')', k.n > 500]]); }
await go('whiteboard'); await page.evaluate(() => { window.FWBViews.render(); }); await page.waitForTimeout(1500);
f = await dl('Whiteboard PNG', () => click('.page-header [data-act="wbExport"]')); if (f) { const b = fs.readFileSync(f); const k = await ink(b.toString('base64')); ok('Whiteboard PNG', f, [['PNG', b[0] === 0x89], ['drawn content (' + k.w + 'x' + k.h + ', ink ' + k.n + ')', k.n > 200]]); }

// ---------- print to PDF (overview, admin dashboard): the print frame is rendered to a real PDF, which must show the page content ----------
async function printCheck(name, file, must) {
  const printed = await page.evaluate(async () => { let html = ''; const obs = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.tagName === 'IFRAME') { try { n.contentWindow.print = () => { html = n.contentDocument.documentElement.outerHTML; }; } catch (e) { } } }))); obs.observe(document.body, { childList: true }); const b = document.querySelector('[data-act="rgPdf"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 2800)); obs.disconnect(); return { found: !!b, html }; });
  if (!printed.html) { ok(name, null, [['print frame captured (button ' + printed.found + ')', false]]); return; }
  const p2 = await ctx.newPage(); await p2.goto(BASE + '/'); await p2.setContent(printed.html, { waitUntil: 'load' }); await p2.waitForTimeout(1500); const pf = path.join(OUT, file); await p2.pdf({ path: pf, format: 'A4', landscape: true, printBackground: true }); await p2.close();
  const p = await pdf(pf); ok(name, pf, [['pages ' + p.pages, p.pages >= 1]].concat(must.map(m => ['shows "' + m + '"', has(p.text, m)])));
}
await page.goto(BASE + `/#/p/${pid}/overview`); await page.reload(); await page.waitForSelector('main.main', { state: 'attached' }); await page.waitForTimeout(2000);
await printCheck('Overview print to PDF', 'overview-print.pdf', [NAME.slice(0, 20), 'Delivery progress', 'QZSES']);
await page.evaluate(() => window.FWBViews.ACT.openAdmin()); await page.waitForTimeout(2500);
await printCheck('Admin dashboard print to PDF', 'admin-print.pdf', ['Admin dashboard', NAME.slice(0, 20)]);

fs.writeFileSync(path.join(OUT, 'exports-all.json'), JSON.stringify({ results, pageErrors: [...new Set(errors)] }, null, 1));
console.log(`\n${results.filter(r => r.pass).length}/${results.length} exports passed content checks`); if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 8));
await browser.close(); process.exit(results.every(r => r.pass) ? 0 : 1);
