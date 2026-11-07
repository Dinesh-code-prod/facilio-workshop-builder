// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/security-check.mjs
// Browser checks for the security fixes: hostile values in uploaded spreadsheets, sample Word files, shared whiteboard records and
// stored links never run as script; CSV cells cannot become formulas; ZIP imports are bounded; the server refuses unsafe links and
// malformed boards. Every payload sets window.__pwn if it ever executes. Usage: node tests/ui/security-check.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const res = []; const check = (n, ok, d) => { res.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
let pid = await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0]?.id);
if (!pid) pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'fwb' }, body: JSON.stringify({ name: 'Security check', customer: 'Acme' }) })).json()).project.id);
const PAY = '000"><img src=x onerror="window.__pwn=1">';

// 1. spreadsheet theme colour and font name
const xl = await p.evaluate(async PAY => {
  const V = window.FWBViews; await V.loadExcelJS(); await V.loadScript('vendor/jszip.min.js');
  const wb = new window.ExcelJS.Workbook(); const ws = wb.addWorksheet('Plan'); const c = ws.getCell('B2'); c.value = 'Task'; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 4 } }; c.font = { name: 'Arial";background:url(//evil.example/x);"', color: { theme: 4 } };
  const z = await window.JSZip.loadAsync(await wb.xlsx.writeBuffer()); let th = await z.file('xl/theme/theme1.xml').async('string');
  th = th.replace(/<a:accent1>[\s\S]*?<\/a:accent1>/, '<a:accent1><a:srgbClr val="' + PAY.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"/></a:accent1>'); z.file('xl/theme/theme1.xml', th);
  const w2 = new window.ExcelJS.Workbook(); await w2.xlsx.load(await z.generateAsync({ type: 'arraybuffer' }));
  const m = await V.xlsBuildModel(w2); const host = document.createElement('div'); document.body.appendChild(host); host.innerHTML = V.xlsRenderSheet(m.sheets ? m.sheets[0] : m[0], {});
  await new Promise(r => setTimeout(r, 300)); const td = host.querySelector('td[data-a="B2"]'); const out = { imgs: host.querySelectorAll('img').length, style: td ? td.getAttribute('style') : 'no cell', pwn: !!window.__pwn }; host.remove(); return out; }, PAY);
check('spreadsheet: hostile theme colour does not inject markup', xl.imgs === 0 && !xl.pwn, JSON.stringify(xl).slice(0, 160));
check('spreadsheet: font name cannot add CSS', !/url\(|;\s*background/.test(xl.style || ''), (xl.style || '').slice(0, 120));

// 2. BRD sample profile colours
const brd = await p.evaluate(async PAY => { const B = window.FWBBrd; if (!B) return { skip: true }; const st = B.state(); const keep = st.profile; st.profile = { h1: { color: PAY, size: 32 }, tableHeaderFill: PAY, font: 'Calibri";x:url(//evil)' }; const P = B.profile(); st.profile = keep; return { h1: P.h1.color, fill: P.tableHeaderFill, font: P.font }; }, PAY);
check('BRD format: colours from a sample file must be hex', brd.skip || (/^[0-9A-F]{6}$/i.test(brd.h1) && /^[0-9A-F]{6}$/i.test(brd.fill) && !/[";]/.test(brd.font)), JSON.stringify(brd));

// 3. whiteboard record written straight to the API, then opened in the app
const put = (kind, id, data) => p.evaluate(async ({ pid, kind, id, data }) => { const r = await fetch(`/api/fn/api/projects/${pid}/items/${kind}/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-requested-with': 'fwb' }, body: JSON.stringify({ data }) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, { pid, kind, id, data });
let r = await put('wb', 'wb_sec1', { name: 'Hostile <b>board</b>', nodes: [{ id: 'n1', t: 'rect', x: 40, y: 40, w: 160, h: 60, text: '<img src=x onerror="window.__pwn=1">', fill: '#fff"/><image href="x" onerror="window.__pwn=1"/><rect fill="', conf: '<img src=x onerror=window.__pwn=1>' }, { id: 'n2" onmouseover="window.__pwn=1', t: 'note', x: 300, y: 40, w: 160, h: 100, text: 'x' }, { id: 'n3', t: 'rect', x: '40" onload="window.__pwn=1', y: 200, w: 160, h: 60, text: 'y' }], edges: [{ id: 'e1', from: 'n1', to: 'n3', label: '<script>window.__pwn=1</script>' }] });
check('API stores a board (shape check only on the server)', r.status === 200, 'status ' + r.status);
await p.goto(BASE + `/#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('.wb-host svg', { timeout: 15000 });
await p.evaluate(() => { const s = document.querySelector('select[data-change="wbPick"]'); if (s) { const o = [...s.options].find(o => /Hostile/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } } });
await p.waitForTimeout(800);
const wb = await p.evaluate(() => { const svg = document.querySelector('.wb-host svg'); return { pwn: !!window.__pwn, images: svg ? svg.querySelectorAll('image').length : -1, handlers: svg ? [...svg.querySelectorAll('*')].filter(e => [...e.attributes].some(a => /^on/i.test(a.name))).length : -1, nodes: svg ? svg.querySelectorAll('.wb-n').length : 0, scripts: svg ? svg.querySelectorAll('script').length : -1 }; });
check('whiteboard: hostile record renders without script, handlers or injected elements', !wb.pwn && wb.images === 0 && wb.handlers === 0 && wb.scripts === 0, JSON.stringify(wb));
check('whiteboard: invalid shapes dropped, valid ones kept', wb.nodes === 2, wb.nodes + ' shapes drawn (n1 and n3 with its bad x reset)');
r = await put('wb', 'wb_sec2', { name: 'Broken', nodes: 'nope' }); check('server: board without node/edge lists refused', r.status === 400, 'status ' + r.status);

// 4. links
for (const [kind, field] of [['res', 'url'], ['onb', 'link'], ['minutes', 'link'], ['signoff', 'doc']]) { r = await put(kind, kind + '_sec', { name: 'x', title: 'x', [field]: 'javascript:window.__pwn=1' }); check(`server: javascript: link refused (${kind}.${field})`, r.status === 400, 'status ' + r.status + ' ' + (r.body.error || '').slice(0, 60)); }
const urls = await p.evaluate(() => { const F = window.FWB; return ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'https://ok.example/a', 'mailto:a@b.c', 'java\tscript:x'].map(u => F.safeUrl(u)); });
check('page: only web and mail links are rendered as links', urls.join('|') === '|||https://ok.example/a|mailto:a@b.c|', urls.join('|'));

// 5. CSV formula cells
const csv = await p.evaluate(() => { const F = window.FWB; return ['=HYPERLINK("http://x")', '+1+2', '-2+3', '@SUM(A1)', 'plain', 5, -3].map(F.csvText); });
check('CSV: formula-looking text opens as text, numbers unchanged', csv[0][0] === "'" && csv[1][0] === "'" && csv[2][0] === "'" && csv[3][0] === "'" && csv[4] === 'plain' && csv[5] === 5 && csv[6] === -3, JSON.stringify(csv));

// 6. bounded ZIP reading
const zb = await p.evaluate(async () => { const V = window.FWBViews; await V.loadScript('vendor/jszip.min.js'); const z = new window.JSZip(); z.file('components/big.xml', '<a>' + 'A'.repeat(5e6) + '</a>'); z.file('../evil.xml', '<x/>'); z.file('ok.xml', '<ok/>');
  const blob = await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }); let big = ''; try { await V.zipTexts(blob, n => /\.xml$/.test(n), { maxBytes: 1e6 }); big = 'read'; } catch (e) { big = e.message; }
  const small = await V.zipTexts(blob, n => /ok\.xml$|evil/.test(n)); return { packed: blob.size, big, names: small.map(x => x.name) }; });
check('ZIP: oversized content refused before unpacking', /larger than this screen reads/.test(zb.big), `packed ${zb.packed} bytes: ${zb.big.slice(0, 60)}`);
check('ZIP: no entry name keeps a parent (..) path', zb.names.length >= 1 && zb.names.every(n => !n.includes('..')), zb.names.join());
check('no script ran at any point', !(await p.evaluate(() => !!window.__pwn)));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
