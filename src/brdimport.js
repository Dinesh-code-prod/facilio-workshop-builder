/* BRD import: bring a team's own BRD (Word, PDF, text or Markdown, or a blank one) into the BRD Draft page as a new BRD with its own structure.
   The content becomes a chain of added blocks (heading, paragraph, bullet list, table) that the team edits in place like any other BRD. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const R = () => root.FWBBrd;
  const { drawer, closeDrawer, toast, loading } = V;
  const MAX_BLOCKS = 3000;
  const txt = n => (n.textContent || '').replace(/\s+/g, ' ').trim();

  // Word: mammoth turns the file into simple HTML (headings, paragraphs, lists, tables, bold and italic)
  function fromHtml(html) {
    const body = new DOMParser().parseFromString('<body>' + html, 'text/html').body; const out = [];
    Array.from(body.children).forEach(n => { const k = n.nodeName;
      if (/^H[1-6]$/.test(k)) { const t = txt(n); if (t) out.push({ t: 'h', lvl: Math.min(3, +k[1]), text: t }); }
      else if (k === 'P') { const t = txt(n); if (t) { const h = R().cleanHtml(n.innerHTML); out.push(/<(b|i|u)>/.test(h) ? { t: 'p', text: t, html: h } : { t: 'p', text: t }); } }
      else if (k === 'UL' || k === 'OL') { const items = Array.from(n.children).map(txt).filter(Boolean); if (items.length) out.push({ t: 'ul', items }); }
      else if (k === 'TABLE') { const rows = Array.from(n.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(c => Array.from(c.querySelectorAll('p')).map(txt).filter(Boolean).join('\n') || txt(c))); if (rows.length) { const cols = Math.max(...rows.map(r => r.length)); const pad = r => { while (r.length < cols) r.push(''); return r; }; out.push({ t: 'table', headers: pad(rows[0]), rows: rows.slice(1).map(pad) }); } } });
    return out;
  }
  async function fromDocx(file) { await V.loadScript('vendor/mammoth.browser.min.js'); return fromHtml((await root.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value); }
  // text and Markdown: # headings, - bullets, blank line between paragraphs
  function fromText(t) {
    const out = []; let para = [], items = []; const fp = () => { if (para.length) out.push({ t: 'p', text: para.join(' ') }); para = []; }; const fi = () => { if (items.length) out.push({ t: 'ul', items }); items = []; };
    t.split(/\r?\n/).forEach(l => { const s = l.trim(); let m; if (!s) { fp(); fi(); } else if ((m = s.match(/^(#{1,6})\s+(.*)/))) { fp(); fi(); out.push({ t: 'h', lvl: Math.min(3, m[1].length), text: m[2] }); } else if ((m = s.match(/^[-*•–]\s+(.*)/))) { fp(); items.push(m[1]); } else { fi(); para.push(s); } });
    fp(); fi(); return out;
  }
  // PDF: text lines in reading order; a larger gap between lines starts a new paragraph (headings and tables are not detected)
  async function fromPdf(file) {
    const pdfjs = await V.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; const lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 200); p++) { const ls = []; let y = null; (await (await doc.getPage(p)).getTextContent()).items.forEach(it => { const yy = Math.round(it.transform[5]); if (y === null || Math.abs(yy - y) > 2) ls.push({ y: yy, t: '' }); y = yy; ls[ls.length - 1].t += it.str; });
      const gaps = ls.slice(1).map((l, i) => Math.abs(ls[i].y - l.y)).filter(g => g > 0).sort((a, b) => a - b); const med = gaps[gaps.length >> 1] || 12;
      ls.forEach((l, i) => { if (i && Math.abs(ls[i - 1].y - l.y) > med * 1.5) lines.push(''); lines.push(l.t); }); lines.push(''); }
    return fromText(lines.join('\n'));
  }

  function create(name, blocks) {
    const list = R().list(); let nm = (name || 'Our BRD').trim().slice(0, 80) || 'Our BRD'; const base = nm; for (let i = 2; list.some(r => r.name.toLowerCase() === nm.toLowerCase()); i++) nm = base + ' (' + i + ')';
    const rec = { id: F.uid('brd'), name: nm, type: 'import', imported: true, modules: [], system: '', direction: '', notes: '' }; list.push(rec);
    const d = R().state(rec.id); const at = new Date().toISOString();
    d.inserts['imp:title'] = blocks.slice(0, MAX_BLOCKS).map(b => Object.assign({ id: 'ins_' + F.uid('p'), by: S.user.name, at }, b));
    S.ui.brdId = rec.id; closeDrawer(); F.changed('BRD imported', nm, { section: 'brddoc' }); toast(blocks.length > MAX_BLOCKS ? 'Imported the first ' + MAX_BLOCKS + ' blocks' : blocks.length ? 'Imported "' + nm + '". Click in the text to edit it.' : 'Blank BRD created. Use "Add below" to start writing.');
  }
  ACT.brdImport = () => { if (S.readonly) return;
    drawer('Import your own BRD', `<div class="notice small" style="margin-bottom:12px">Bring in a BRD your team already has, or start a blank one. It is added as a new BRD with its own structure; nothing is generated into it. It can be empty or only partly filled, and you edit it on the page afterwards.</div>
      <label class="f">Name</label><input id="bi_name" maxlength="80" placeholder="e.g. Customer BRD (from the client)">
      <ul class="small muted" style="margin:12px 0 0;padding-left:18px"><li>Word (.docx) keeps headings, paragraphs, bold and italic, bullet lists and tables.</li><li>PDF, text and Markdown keep the text (Markdown also headings and bullets). PDF tables and headings come in as plain paragraphs.</li><li>Images and page layout are not imported. Scanned PDFs have no text to read.</li></ul>`,
      '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn" data-act="brdBlank">Start a blank BRD</button><button class="btn primary" data-act="brdImportFile">Choose a file…</button>'); };
  ACT.brdBlank = () => create((document.getElementById('bi_name') || {}).value, []);
  ACT.brdImportFile = async () => {
    const nm = (document.getElementById('bi_name') || {}).value; const f = (await V.pickFile('.docx,.pdf,.txt,.md,.markdown'))[0]; if (!f) return;
    if (f.size > 25e6) { toast('Use a file under 25 MB', 5000, true); return; }
    loading(true, 'Reading ' + f.name + '…');
    try { const ext = (f.name.split('.').pop() || '').toLowerCase(); const blocks = ext === 'docx' ? await fromDocx(f) : ext === 'pdf' ? await fromPdf(f) : (ext === 'txt' || ext === 'md' || ext === 'markdown') ? fromText(await f.text()) : null;
      if (!blocks) { toast('Use a Word (.docx), PDF, text or Markdown file', 5000, true); return; }
      if (!blocks.length && !(await V.confirmDialog('No text found', 'Nothing could be read from this file (a scanned PDF has no text). Create a blank BRD instead?', 'Create blank'))) return;
      create(nm || f.name.replace(/\.[^.]+$/, ''), blocks);
    } catch (e) { toast('Could not read the file: ' + e.message, 6000, true); } finally { loading(false); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
