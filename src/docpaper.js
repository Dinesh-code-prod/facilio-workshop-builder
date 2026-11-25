/* Document paper (user, 24 Nov 2026: "all document guides in BRD-draft style ... the FTR an editable draft like the BRD preview, with HTML export as well"):
   the BRD preview look (white A4 sheets on the grey desk, cover page, headings) for documents that are not BRDs: user guides (src/guidebuilder.js, Document tab)
   and the FTR report (src/uatftr.js). One renderer for the page and for the HTML file, so the download looks like the preview.
   Pure code (also run by tests/guide_docs.mjs): parseMd/mdHtml (the guide Markdown), paper (the sheets, editable or not), htmlFile (one self-contained page:
   no outside request, pictures written in as data), ftrModel/ftrToMd (the FTR report as a document and back to the Markdown Claude reads). domToMd and printHtml
   need a browser. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = t => String(t || '').replace(/\s*\[S\d+\]/g, '');   // the AI source tags never reach a document
  /** guide Markdown -> blocks: { t: 'h', lvl, text } | { t: 'p', text } | { t: 'ul' | 'ol', items } | { t: 'table', rows } */
  function parseMd(src) {
    const L = strip(src).split('\n'); const out = []; let ul = null, ol = null, tb = null, p = [];
    const flush = () => { if (p.length) { out.push({ t: 'p', text: p.join(' ') }); p = []; } if (ul) { out.push({ t: 'ul', items: ul }); ul = null; } if (ol) { out.push({ t: 'ol', items: ol }); ol = null; } if (tb) { out.push({ t: 'table', rows: tb }); tb = null; } };
    L.forEach(ln => { const t = ln.trim(); let m;
      if (!t) { flush(); return; }
      if (/^\|.*\|$/.test(t)) { if (/^\|[\s:|-]+\|$/.test(t)) return; const cells = t.slice(1, -1).split('|').map(c => c.trim()); if (!tb) { flush(); tb = []; } tb.push(cells); return; }
      if ((m = t.match(/^(#{1,3})\s+(.*)/))) { flush(); out.push({ t: 'h', lvl: m[1].length, text: m[2] }); return; }
      if ((m = t.match(/^[-*•]\s+(.*)/))) { if (!ul) { flush(); ul = []; } ul.push(m[1]); return; }
      if ((m = t.match(/^\d+[.)]\s+(.*)/))) { if (!ol) { flush(); ol = []; } ol.push(m[1]); return; }
      if (ul || ol || tb) flush(); p.push(t); });
    flush(); return out;
  }
  const runs = t => String(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(x => /^\*\*[^*]+\*\*$/.test(x) ? { text: x.slice(2, -2), bold: true } : { text: x });
  const rt = t => runs(t).map(x => x.bold ? '<b>' + esc(x.text) + '</b>' : esc(x.text)).join('');
  /** guide Markdown -> HTML (h3/h4, p, lists, tables, bold); everything escaped */
  const mdHtml = text => parseMd(text).map(x => x.t === 'h' ? (x.lvl === 1 ? '<h3>' + rt(x.text) + '</h3>' : '<h4>' + rt(x.text) + '</h4>') : x.t === 'p' ? '<p>' + rt(x.text) + '</p>'
    : x.t === 'table' ? '<table>' + x.rows.map((r, ri) => '<tr>' + r.map(c => ri ? '<td>' + rt(c) + '</td>' : '<th>' + rt(c) + '</th>').join('') + '</tr>').join('') + '</table>'
    : '<' + x.t + '>' + x.items.map(y => '<li>' + rt(y) + '</li>').join('') + '</' + x.t + '>').join('');
  /** edited paper text (a contenteditable box) -> guide Markdown again: headings, paragraphs, lists, tables and bold survive, anything else becomes text */
  function domToMd(el) {
    const inl = n => Array.from(n.childNodes).map(c => c.nodeType === 3 ? c.nodeValue : c.nodeName === 'BR' ? ' ' : /^(B|STRONG)$/.test(c.nodeName) ? (c.textContent.trim() ? '**' + c.textContent.trim() + '** ' : '') : inl(c)).join('').replace(/\s+/g, ' ').trim();
    const out = []; Array.from(el.childNodes).forEach(n => {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(n.nodeValue.trim()); return; } const k = n.nodeName;
      if (k === 'H3' || k === 'H1' || k === 'H2') out.push('# ' + inl(n)); else if (k === 'H4' || k === 'H5') out.push('## ' + inl(n));
      else if (k === 'UL' || k === 'OL') out.push(Array.from(n.querySelectorAll('li')).map((li, i) => (k === 'UL' ? '- ' : (i + 1) + '. ') + inl(li)).filter(x => x.replace(/^(-|\d+\.)\s*/, '')).join('\n'));
      else if (k === 'TABLE') { const rows = Array.from(n.querySelectorAll('tr')).map(tr => '| ' + Array.from(tr.children).map(c => inl(c).replace(/\|/g, '/')).join(' | ') + ' |'); if (rows.length) { const nc = n.querySelector('tr').children.length; rows.splice(1, 0, '|' + ' --- |'.repeat(nc)); out.push(rows.join('\n')); } }
      else if (k !== 'BR') { const t = inl(n); if (t) out.push(t); } });
    return out.filter(Boolean).join('\n\n');
  }
  /** the sheets. model: { title, sub, customer, version, date, status, accent, cover, logo: { src | fileId }, sections: [{ title, blocks: [{ t: 'md', text } | { t: 'img', src | fileId, caption } | { t: 'html', html }] }] }
      o.edit makes the text editable; o.empty: the line an empty section shows (the page only, not the file); o.compact: a short cover on screen, so the first section shows without scrolling; o.titleAttr(i), o.mdAttr(i, j), o.capAttr(i, j), o.tools(i), o.blkTools(i, j) add the page's own hooks (guides use them, the HTML file does not) */
  function paper(m, o) {
    o = o || {}; const ed = !!o.edit, ce = ed ? ' contenteditable="true" spellcheck="true"' : '', acc = /^#[0-9A-Fa-f]{6}$/.test(m.accent || '') ? m.accent : '#1570EF', at = (f, ...a) => (ed && f ? ' ' + f(...a) : '');
    const img = (b, alt) => b.src ? '<img src="' + esc(b.src) + '" alt="' + esc(alt) + '">' : b.fileId ? '<img data-ugimg="' + esc(b.fileId) + '" alt="' + esc(alt) + '">' : '';
    const cover = m.cover === false ? '' : '<div class="paper dp-cover' + (o.compact ? ' dp-short' : '') + '">' + (m.logo ? '<div class="dp-logo">' + img(m.logo, 'Logo') + '</div>' : '') + '<div class="dp-ct" style="color:' + acc + '"' + (ed && o.coverAttr ? ' ' + o.coverAttr('title') + ce : '') + '>' + esc(m.title || 'Untitled') + '</div>'
      + (m.sub ? '<div class="dp-cs">' + esc(m.sub) + '</div>' : '') + (m.customer ? '<div class="dp-cf">for</div><div class="dp-cc">' + esc(m.customer) + '</div>' : '') + '<div class="dp-cm">Version ' + esc(m.version || '1.0') + ' · ' + esc(m.date || '') + ' · ' + esc(m.status || 'Draft') + '</div></div>';
    const secs = (m.sections || []).map((s, i) => { const ta = ed && o.titleAttr ? o.titleAttr(i) : ''; return '<section class="dp-sec" id="dp_s' + i + '">' + (o.tools && ed ? o.tools(i) : '') + '<h1 style="--dp-acc:' + acc + ';color:' + acc + '"' + (ta ? ' ' + ta + ce : '') + '>' + esc(s.title || 'Untitled section') + '</h1>'
      + (s.blocks || []).map((b, j) => {
        const tl = o.blkTools && ed ? o.blkTools(i, j) : '';
        if (b.t === 'img') { const im = img(b, b.caption || 'Screenshot'); return im ? '<figure class="dp-blk">' + tl + im + (b.caption || (ed && o.capAttr) ? '<figcaption' + at(o.capAttr, i, j) + (ed && o.capAttr ? ce + ' data-ph="Caption"' : '') + '>' + esc(b.caption || '') + '</figcaption>' : '') + '</figure>' : ''; }
        if (b.t === 'html') return '<div class="dp-blk">' + b.html + '</div>';
        return '<div class="dp-blk">' + tl + '<div class="dp-md"' + at(o.mdAttr, i, j) + (ed && o.mdAttr ? ce + ' data-ph="Write here. Steps, lists and tables keep their shape."' : '') + '>' + mdHtml(b.text) + '</div></div>';
      }).join('') + (!(s.blocks || []).length && o.empty ? '<p class="dp-none">' + esc(o.empty) + '</p>' : '') + '</section>'; }).join('');
    return cover + '<div class="paper dp-body">' + (secs || '<p class="dp-none">No sections yet.</p>') + '</div>';
  }
  const CSS = 'body{margin:0;background:#e9ebee;color:#111;font:10.5pt/1.45 Calibri,Carlito,Arial,sans-serif}main{padding:24px 0 60px}.paper{width:794px;max-width:calc(100% - 24px);box-sizing:border-box;margin:0 auto 24px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18);padding:64px 76px}'
    + '.dp-cover{min-height:1000px;text-align:center;padding-top:200px}.dp-logo{text-align:right;margin:-150px 0 120px}.dp-logo img{max-height:64px}.dp-ct{font-size:26pt;font-weight:700}.dp-cs{font-size:15pt;margin-top:10px}.dp-cf{color:#607796;margin:6px 0}.dp-cc{font-size:18pt;font-weight:700}.dp-cm{color:#607796;margin-top:60px}'
    + 'h1{font-size:16pt;margin:22px 0 10px}h3{font-size:12.5pt;margin:12px 0 6px}h4{font-size:11pt;margin:10px 0 4px}p{margin:0 0 8px}ul,ol{margin:0 0 8px;padding-left:22px}table{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:9pt}th{background:#E8F1FF;border:1px solid #9aa4b2;padding:4px 6px;text-align:left}td{border:1px solid #9aa4b2;padding:4px 6px;vertical-align:top}'
    + 'figure{margin:10px 0 14px;text-align:center}figure img{max-width:100%;height:auto;border:1px solid #e3e7ed}figcaption{font-size:8.5pt;color:#607796;font-style:italic}.dp-sec+.dp-sec{margin-top:26px}.fr-tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:8.5pt;font-weight:600;background:#f4f4f5}.fr-pass{background:#ecfdf3;color:#067647}.fr-fail{background:#fef3f2;color:#b42318}.fr-blocked{background:#fffaeb;color:#b54708}'
    + '@media print{body{background:#fff}main{padding:0}.paper{box-shadow:none;margin:0;width:auto;max-width:none;padding:0 0 0;page-break-after:always}.dp-cover{min-height:0}}';
  /** one self-contained web page: a policy that blocks every outside request, the styles inside, pictures only as data */
  function htmlFile(m) {
    const clean = Object.assign({}, m, { logo: m.logo && /^data:image\//.test(m.logo.src || '') ? m.logo : null, sections: (m.sections || []).map(s => Object.assign({}, s, { blocks: (s.blocks || []).filter(b => b.t !== 'img' || /^data:image\//.test(b.src || '')) })) });
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:"><title>' + esc(m.title || 'Document') + '</title><style>' + CSS + '</style></head><body><main>' + paper(clean, { edit: false }) + '</main></body></html>';
  }
  /** a user guide (ugd record) -> paper model; src maps a picture's file id to its data URL (the HTML file needs them written in) */
  function guideModel(g, src, date) {
    src = src || {}; const b = g.brand || {}, pic = x => Object.assign({}, x, src[x.fileId] ? { src: src[x.fileId] } : {});
    return { title: g.title, sub: g.audience, customer: g.customer, version: g.version, date: date || '', status: g.status === 'approved' ? 'Approved' : 'Draft', accent: b.accent, cover: b.cover !== false, logo: b.logo ? pic(b.logo) : null,
      sections: (g.sections || []).map(s => ({ title: s.title, blocks: (s.blocks || []).map(x => (x && x.t === 'img' ? pic(x) : x)) })) };
  }
  /** PDF the simple way: the same page in a hidden frame, printed by the browser (Save as PDF) */
  function printHtml(html) { const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } }; f.srcdoc = html; document.body.appendChild(f); }

  // ---------- the FTR report as a document ----------
  const LABEL = { pass: 'Passed', fail: 'Failed', blocked: 'Blocked', notrun: 'Not run' };
  const FIELDS = [['id', 'ID'], ['title', 'Test case'], ['steps', 'Steps'], ['expected', 'Expected'], ['result', 'Result'], ['evidence', 'Evidence'], ['comments', 'Comments']];
  /** rep (src/ftrreport.js parse) -> paper model; o.edit adds the cell hooks (data-ftc="module.usecase.case.field") and the row buttons */
  function ftrModel(rep, meta, o) {
    meta = meta || {}; o = o || {}; const ed = !!o.edit, ce = ed ? ' contenteditable="true"' : '', c = rep.counts || { total: 0, pass: 0, fail: 0, blocked: 0, notrun: 0 };
    const cellOf = (x, k, f) => f === 'result' ? (ed ? '<select data-change="ftrRes" data-k="' + k + '" aria-label="Result">' + Object.keys(LABEL).map(r => '<option value="' + r + '"' + (x.result === r ? ' selected' : '') + '>' + LABEL[r] + '</option>').join('') + '</select>' : '<span class="fr-tag fr-' + esc(x.result) + '">' + esc(LABEL[x.result] || 'Not run') + '</span>')
      : '<div' + (ed ? ' data-ftc="' + k + '.' + f + '"' + ce : '') + '>' + esc(x[f] || '') + '</div>';
    const sum = '<p' + (ed ? ' data-fti="1"' + ce + ' data-ph="A short introduction (optional)."' : '') + '>' + esc(rep.intro || '') + '</p><table><tr><th>Test cases</th><th>Passed</th><th>Failed</th><th>Blocked</th><th>Not run</th></tr><tr><td>' + c.total + '</td><td>' + c.pass + '</td><td>' + c.fail + '</td><td>' + c.blocked + '</td><td>' + c.notrun + '</td></tr></table>';
    const sections = [{ title: 'Summary', blocks: [{ t: 'html', html: sum }] }].concat((rep.modules || []).map((m, mi) => ({ title: m.name, mi, blocks: [{ t: 'html', html: (m.useCases || []).map((u, ui) => '<h3' + (ed ? ' data-ftu="' + mi + '.' + ui + '"' + ce : '') + '>' + esc(u.title) + '</h3><table><tr>' + FIELDS.map(f => '<th>' + f[1] + '</th>').join('') + (ed ? '<th><span class="sr-only">Remove</span></th>' : '') + '</tr>'
      + u.cases.map((x, ci) => '<tr>' + FIELDS.map(f => '<td>' + cellOf(x, mi + '.' + ui + '.' + ci, f[0]) + '</td>').join('') + (ed ? '<td><button type="button" class="dp-rm" data-act="ftrRowDel" data-k="' + mi + '.' + ui + '.' + ci + '" aria-label="Remove this test case" title="Remove this test case">00d7</button></td>' : '') + '</tr>').join('') + '</table>'
      + (ed ? '<button type="button" class="btn sm" data-act="ftrRowAdd" data-k="' + mi + '.' + ui + '">+ Test case</button>' : '')).join('') || '<p>No test case for this module yet.</p>' }] })));
    return { title: 'FTR report', sub: 'Functional test results by module', customer: meta.customer || '', version: meta.version || '1', date: meta.date || '', status: meta.status || 'Draft', accent: '#1570EF', sections };
  }
  /** rep -> the Markdown the FTR draft keeps (the same shape Claude writes and src/ftrreport.js parse reads), so an edited report reads back the same */
  function ftrToMd(rep) {
    const v = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
    const out = [];
    if (rep.intro) out.push(v(rep.intro), '');
    (rep.modules || []).forEach(m => { out.push('## ' + v(m.name), ''); (m.useCases || []).forEach(u => { out.push('### Use case: ' + v(u.title), '', '| ' + FIELDS.map(f => f[1]).join(' | ') + ' |', '|' + ' --- |'.repeat(FIELDS.length));
      u.cases.forEach(x => out.push('| ' + FIELDS.map(f => f[0] === 'result' ? LABEL[x.result] || 'Not run' : v(x[f[0]])).join(' | ') + ' |')); out.push(''); }); });
    return out.join('\n').trim() + '\n';
  }
  const api = { esc, parseMd, runs, mdHtml, domToMd, paper, htmlFile, guideModel, printHtml, ftrModel, ftrToMd, CSS, LABEL };
  root.FWBViews = root.FWBViews || {}; root.FWBViews.docPaper = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
