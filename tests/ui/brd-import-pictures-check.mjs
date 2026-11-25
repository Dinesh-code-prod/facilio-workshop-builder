// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/brd-import-pictures-check.mjs [baseUrl]
// BRD import keeps pictures (src/brdimport.js, 25 Nov 2026): a Word file with a heading, a PNG flow picture (with alt text) and an EMF picture is
// imported; the PNG becomes a figure block drawn on the page with its alt text as the caption, the EMF becomes a note, the text stays.
import { chromium } from 'playwright'; import JSZip from 'jszip'; import zlib from 'node:zlib';
const BASE = process.argv[2] || 'http://localhost:4173';
// a 200 x 120 PNG, drawn here (blue box on white)
const png = (() => { const W = 200, H = 120, raw = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) { const o = y * (W * 3 + 1) + 1 + x * 3, inBox = x > 40 && x < 160 && y > 30 && y < 90; raw[o] = inBox ? 0x15 : 255; raw[o + 1] = inBox ? 0x70 : 255; raw[o + 2] = inBox ? 0xEF : 255; } }
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]); })();
const pic = (rid, id, descr) => `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="1905000" cy="1143000"/><wp:docPr id="${id}" name="Picture ${id}" descr="${descr}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="p${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill><pic:spPr/></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
const z = new JSZip();
z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="emf" ContentType="image/x-emf"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.emf"/></Relationships>');
z.file('word/media/image1.png', png); z.file('word/media/image2.emf', Buffer.from('not really an EMF, a browser cannot draw it'));
z.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'
  + '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Work order process</w:t></w:r></w:p>' + pic('rId5', 1, 'Work order flow QZFLOW') + '<w:p><w:r><w:t>The supervisor closes the job QZTEXT.</w:t></w:r></w:p>' + pic('rId6', 2, 'Visio drawing') + '</w:body></w:document>');
const docx = (await z.generateAsync({ type: 'nodebuffer' })).toString('base64');

const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'BRD pictures check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/brd`); await p.reload(); await p.waitForTimeout(3000);
const blocks = await p.evaluate(async b64 => { const V = window.FWBViews; const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const f = new File([bytes], 'Our BRD.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  V.ACT.brdImport(); await new Promise(r => setTimeout(r, 400)); const orig = V.pickFile; V.pickFile = async () => [f];
  try { await V.ACT.brdImportFile(); } finally { V.pickFile = orig; } await new Promise(r => setTimeout(r, 1500));
  const R = window.FWBBrd, rec = R.list().find(x => x.imported); const ins = rec ? (R.state(rec.id).inserts['imp:title'] || []) : [];
  return ins.map(x => ({ t: x.t, text: x.text || '', caption: x.caption || '', svg: (x.svg || '').slice(0, 120), hasImg: /<image [^>]*href="data:image\/(png|jpeg);base64,/.test(x.svg || '') })); }, docx);
check('the heading and the text are imported', blocks.some(x => x.t === 'h' && /Work order process/.test(x.text)) && blocks.some(x => x.t === 'p' && /QZTEXT/.test(x.text)), JSON.stringify(blocks.map(x => x.t)));
const fig = blocks.find(x => x.t === 'figure');
check('the PNG picture becomes a figure block holding the picture', fig && fig.hasImg, fig && fig.svg);
check('its alt text is the caption', fig && /QZFLOW/.test(fig.caption), fig && fig.caption);
check('the EMF picture becomes a note, not a broken picture', blocks.some(x => x.t === 'p' && /could not be shown here \(EMF\)/.test(x.text)), JSON.stringify(blocks.filter(x => x.t === 'p').map(x => x.text.slice(0, 80))));
await p.waitForTimeout(800);
const drawn = await p.evaluate(() => { const im = document.querySelector('.fig-svg svg image'); return im ? Math.round(im.getBoundingClientRect().width) : 0; });
check('the picture is drawn on the BRD page', drawn > 50, 'width ' + drawn);
// Word and PDF draw a figure through svgToPng: the picture must come through it with its pixels, not blank
const ink = await p.evaluate(async () => { const R = window.FWBBrd, rec = R.list().find(x => x.imported), fig = (R.state(rec.id).inserts['imp:title'] || []).find(x => x.t === 'figure'); const D = window.FWBDiagrams;
  if (!D || !D.svgToPng) return -1; const png = await D.svgToPng(fig.svg, 1); const im = new Image(); im.src = 'data:image/png;base64,' + (typeof png.data === 'string' ? png.data : btoa(String.fromCharCode(...new Uint8Array(png.data)))); await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 60) n++; return n; });
check('the picture survives the Word/PDF export drawing step (blue pixels found)', ink > 500, 'blue pixels ' + ink);
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' BRD picture checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
