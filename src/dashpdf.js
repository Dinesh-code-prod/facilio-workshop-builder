/* Dashboard PDF from the data (25 Nov 2026, docs/plans/DASHBOARD-REBUILD-PLAN-2026-11-25.md), for the project dashboard and the Admin dashboard. Not a screenshot:
   each chosen tab is drawn off-screen with the filters in use, and its figures, tables, lists and SVG charts go into a pdfmake document with selectable text, the scope,
   period and filters on page 1, page numbers and the generation date. A chart pdfmake cannot draw is replaced by its figures (the PDF is never lost for one chart). */
(function (root) {
  'use strict';
  const F = root.FWB, V = root.FWBViews, ACT = V.ACT, S = F.S, esc = F.esc;
  const INK = '#0F172A', MUTED = '#475569', LINE = '#E2E8F0', BLUE = '#1570EF', BAND = '#F8FAFC';
  const ARROWS = /[›→↗»×]/g;   // link arrows and close marks: the PDF font has no glyph for them, and the PDF has no links
  const txt = el => (el ? el.textContent.replace(ARROWS, '').replace(/\s+/g, ' ').trim() : '');
  // a list row's parts (label, count, share, link) joined with a separator, so "To do", "4" and "40%" do not run together as "To do440%"
  const part = el => { const bits = []; const walk = n => { if (n.nodeType === 3) { const t = n.textContent.replace(ARROWS, '').replace(/\s+/g, ' ').trim(); if (t) bits.push(t); } else if (n.nodeType === 1 && !/^(svg|script|style)$/i.test(n.tagName)) n.childNodes.forEach(walk); }; walk(el); return bits.join(' · '); };
  // pdfmake cannot read the page's styles: CSS variables fall back to their default colour, currentColor becomes the body ink
  const svgClean = s => s.replace(/var\(--[\w-]+\s*,\s*([^)]+)\)/g, '$1').replace(/var\(--[\w-]+\)/g, '#64748B').replace(/currentColor/g, '#334155');
  // a ring or donut segment of zero length is drawn with a dash pattern like "0 106.8", which pdfmake refuses: such segments show nothing, so they are left out
  const dashOf = e => String(e.getAttribute('stroke-dasharray') || (e.style && e.style.strokeDasharray) || '').trim();
  const svgSafe = el => { const c = el.cloneNode(true);
    const vb = String(c.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { c.setAttribute('width', vb[2]); c.setAttribute('height', vb[3]); c.removeAttribute('style'); }   // "100%" sizes mean nothing in a PDF: use the drawing's own size
    c.querySelectorAll('*').forEach(e => { const d = dashOf(e); if (!d || d === 'none') return; const n = d.split(/[\s,]+/).map(Number); if (n.some(x => !(x > 0))) { if (!(n[0] > 0)) e.remove(); else { e.removeAttribute('stroke-dasharray'); if (e.style) e.style.strokeDasharray = ''; } } }); return c.outerHTML; };

  // one tab's HTML -> { kpis: [[label, value, note]], widgets: [{ title, sub, table, svg, lines, rest }] }; project tiles (.sd-kpi, .sd-w) and Admin tiles (.adx-stat, .adx-c)
  function readTab(html) {
    const t = document.createElement('template'); t.innerHTML = html; const R = t.content; R.querySelectorAll('.sd-wx').forEach(x => x.remove());   // the Download menu is a control, not content
    const kpis = [...R.querySelectorAll('.sd-kpi, .adx-stat')].map(k => [txt(k.querySelector('.sd-kl, .adx-sl')), txt(k.querySelector('.sd-kv, b')), txt(k.querySelector('.sd-ks, .adx-ss'))]).filter(k => k[0]);
    const widgets = [...R.querySelectorAll('.sd-w, .adx-c')].filter(w => !(w.parentElement && w.parentElement.closest('.sd-w, .adx-c'))).map(w => {
      const h = w.querySelector(':scope > header'); const title = txt(h && h.querySelector('h3')), sub = txt(h && h.querySelector('span'));
      const tb = w.querySelector('table'); let table = null;
      if (tb) { const trs = [...tb.querySelectorAll('tr')].map(tr => [...tr.children].map(txt)); if (trs.length) table = { cols: trs[0], rows: trs.slice(1) }; }
      const svgEl = [...w.querySelectorAll('svg')].filter(s => !s.closest('header') && s.querySelectorAll('*').length > 3).sort((a, b) => b.querySelectorAll('*').length - a.querySelectorAll('*').length)[0];
      const lines = table ? [] : [...w.querySelectorAll('li, .sd-leg > *, .cs-leg > *, .dk-row, .sd-row, .adx-row, .adx-lg > li')].map(part).filter(Boolean).filter((l, i, a) => a.indexOf(l) === i).slice(0, 40);
      const rest = !table && !lines.length ? txt(w).replace(title, '').replace(sub, '').trim().slice(0, 600) : '';
      return { title, sub, table, svg: svgEl ? svgClean(svgSafe(svgEl)) : '', lines, rest };
    }).filter(w => w.title);
    return { kpis, widgets };
  }

  function docFor(meta, tabs, withSvg) {
    const tbl = (cols, rows) => ({ table: { headerRows: 1, widths: cols.map(() => '*'), body: [cols.map(c => ({ text: c, bold: true, fontSize: 8.5, color: INK, fillColor: BAND }))].concat(rows.length ? rows.map(r => cols.map((_, i) => ({ text: String(r[i] == null ? '' : r[i]), fontSize: 8.5, color: INK }))) : [[{ text: 'No rows', colSpan: cols.length, italics: true, fontSize: 8.5, color: MUTED }].concat(cols.slice(1).map(() => ({})))]) }, layout: { hLineColor: () => LINE, vLineColor: () => LINE, hLineWidth: () => 0.6, vLineWidth: () => 0.6 }, margin: [0, 4, 0, 10] });
    const rows = meta.facts.concat([['Tabs included', tabs.map(t => t.name).join(', ')], ['Generated', new Date().toLocaleString()]]);
    const content = [{ text: meta.title, fontSize: 20, bold: true, color: INK }, { text: meta.sub || '', fontSize: 11, color: MUTED, margin: [0, 2, 0, 6] },
      { table: { widths: [100, '*'], body: rows.map(([a, b]) => [{ text: a, bold: true, fontSize: 9, color: MUTED }, { text: b, fontSize: 9, color: INK }]) }, layout: 'noBorders', margin: [0, 0, 0, 14] }];
    tabs.forEach((t, ti) => {
      content.push({ text: t.name, fontSize: 15, bold: true, color: INK, margin: [0, 0, 0, 8], pageBreak: ti ? 'before' : undefined });
      if (t.data.kpis.length) content.push(tbl(['Measure', 'Value', 'Note'], t.data.kpis));
      t.data.widgets.forEach(w => {
        const block = [{ text: w.title, fontSize: 11, bold: true, color: INK, margin: [0, 6, 0, 0] }]; if (w.sub) block.push({ text: w.sub, fontSize: 8.5, color: MUTED, margin: [0, 1, 0, 4] });
        if (withSvg && w.svg) block.push({ svg: w.svg, fit: [460, 170], margin: [0, 2, 0, 4] });
        if (w.table) block.push(tbl(w.table.cols, w.table.rows)); else if (w.lines.length) block.push({ ul: w.lines.map(l => ({ text: l, fontSize: 8.5, color: INK })), margin: [0, 2, 0, 8] }); else if (w.rest) block.push({ text: w.rest, fontSize: 8.5, color: INK, margin: [0, 2, 0, 8] });
        content.push({ stack: block, unbreakable: !w.table || w.table.rows.length < 12 });
      });
      if (!t.data.kpis.length && !t.data.widgets.length) content.push({ text: 'Nothing to show on this tab with these filters.', italics: true, fontSize: 9, color: MUTED });
    });
    return { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [36, 40, 36, 40], defaultStyle: { fontSize: 9, color: INK }, info: { title: meta.title },
      header: () => ({ text: 'Facilio Delivery Studio', fontSize: 8, color: BLUE, bold: true, margin: [36, 18, 36, 0] }),
      footer: (n, of) => ({ columns: [{ text: meta.foot, fontSize: 8, color: MUTED }, { text: 'Page ' + n + ' of ' + of, alignment: 'right', fontSize: 8, color: MUTED }], margin: [36, 10, 36, 0] }), content };
  }

  // the two dashboards: which tabs exist, how one is drawn off-screen, and what page 1 says about scope and filters
  const chipsText = () => [...document.querySelectorAll('.dk-chips .dk-chip')].map(txt).join('; ') || 'None';
  const KINDS = {
    project: {
      tabs: () => [...document.querySelectorAll('.cs-page .sd-tabs [data-act="sdTab"]')].map(b => [b.getAttribute('data-v'), txt(b)]).filter(([id]) => id && id !== 'reports'),
      cur: () => S.ui.sdTab || 'overview', key: 'sdTab',
      draw: () => { const fold = S.ui.pdMore; S.ui.pdMore = true; try { return V.projdash.html(); } finally { S.ui.pdMore = fold; } },   // the overview's charts sit behind a fold on screen; the PDF always includes them
      meta: () => { const p = S.project || {}, k = V.isCustomer && V.isCustomer(); return { title: k ? 'Your project dashboard' : 'Project dashboard', sub: [p.name || '', p.customer || ''].filter(Boolean).join(' · '), foot: (p.name || '') + ' · Dashboard', file: (p.name || 'Project') + ' dashboard',
        facts: [['Scope', 'This project only'], ['Period', V.range ? V.range.label((S.ui && S.ui.dkR) || { period: 'all' }) : 'All time'], ['Filters in use', chipsText()], ['Viewed as', k ? 'Customer' : 'Facilio team']] }; }
    },
    admin: {
      tabs: () => [...document.querySelectorAll('.adm-main [data-act="admTab"]')].map(b => [b.getAttribute('data-v'), txt(b)]).filter(([id], i, a) => id && id !== 'reports' && a.findIndex(x => x[0] === id) === i),
      cur: () => S.ui.admTab || 'overview', key: 'admTab',
      draw: () => V.adminBento(),
      meta: () => { const shown = txt(document.querySelector('.adm-main .dk-fc')); const rg = V.range && V.range.hooks.adm ? V.range.hooks.adm.state() || {} : {}; return { title: 'Portfolio dashboard', sub: 'Admin · every project you can see', foot: 'Portfolio dashboard', file: 'Portfolio dashboard',
        facts: [['Scope', shown || 'All active projects'], ['Period', V.range ? V.range.label(rg.period ? rg : { period: 'all' }) : 'All time'], ['Filters in use', chipsText()]] }; }
    }
  };

  async function build(kind, which) {
    const K = KINDS[kind]; const all = K.tabs(), cur = K.cur(); const pick = which === 'all' ? all : all.filter(([id]) => id === cur);
    if (!pick.length) { V.toast('Open the dashboard first.', 4000, true); return; }
    const meta = K.meta(); const was = S.ui[K.key]; V.loading(true, 'Building the PDF…'); const tabs = [];
    try {
      for (let i = 0; i < pick.length; i++) { const [id, name] = pick[i]; V.loading(true, 'Building the PDF: ' + name + ' (' + (i + 1) + ' of ' + pick.length + ')'); S.ui[K.key] = id; let html = ''; try { html = K.draw(); } catch (e) { console.error(e); } tabs.push({ id, name, data: readTab(html) }); await new Promise(r => setTimeout(r, 0)); }
      S.ui[K.key] = was;
      // pdfmake can fail after it starts drawing (outside this call): a page error or no file within 30 s counts as a failure, so the chart-free fallback still runs
      const pm = await V.loadPdfMake(); const blob = d => new Promise((res, rej) => { let done = false; const fin = (f, v) => { if (done) return; done = true; root.removeEventListener('error', onErr); clearTimeout(tm); f(v); }; const onErr = ev => { ev.preventDefault && ev.preventDefault(); fin(rej, ev.error || new Error(ev.message)); }; const tm = setTimeout(() => fin(rej, new Error('The PDF took too long to draw.')), 30000); root.addEventListener('error', onErr); try { pm.createPdf(d).getBlob(b => fin(res, b)); } catch (e) { fin(rej, e); } });
      let out, note = ''; try { out = await blob(docFor(meta, tabs, true)); } catch (e) { console.error(e); out = await blob(docFor(meta, tabs, false)); note = ' Some charts could not be drawn in the PDF, so their figures are listed instead.'; }
      V.download((meta.file + ' ' + V.today() + '.pdf').replace(/[\\/:*?"<>|]+/g, ' '), out, 'application/pdf');
      V.toast('PDF ready: ' + pick.length + ' tab' + (pick.length === 1 ? '' : 's') + '.' + note, note ? 8000 : 4000);
    } catch (e) { V.toast('The PDF could not be made: ' + (e.message || e), 7000, true); }
    finally { S.ui[K.key] = was; V.loading(false); }
  }

  function open(kind) {
    const K = KINDS[kind], all = K.tabs(), cur = K.cur(); const curName = (all.find(([id]) => id === cur) || [cur, 'This tab'])[1];
    V.drawer('Export the dashboard (PDF)', `<p class="small">Made from the data with the filters in use, not a picture of the screen: figures, tables, charts and lists, with page numbers.</p>
      <label class="f"><input type="radio" name="dpWhich" value="cur" checked> This tab: ${esc(curName)}</label><label class="f"><input type="radio" name="dpWhich" value="all"> All tabs (${all.length}): ${esc(all.map(a => a[1]).join(', '))}</label>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dpGo" data-k="${kind}">Export PDF</button>`, { compact: true });
  }
  ACT.dpOpen = a => open((a && a.getAttribute && a.getAttribute('data-k')) || 'project');
  ACT.dpGo = a => { const v = (document.querySelector('input[name="dpWhich"]:checked') || {}).value || 'cur'; const kind = (a && a.getAttribute('data-k')) || 'project'; V.closeDrawer(); build(kind, v === 'all' ? 'all' : 'cur'); };
  if (V.range && V.range.hooks) { if (V.range.hooks.dk) V.range.hooks.dk.pdf = () => open('project'); if (V.range.hooks.adm) V.range.hooks.adm.pdf = () => open('admin'); }
  // per-widget download (CSV or Excel): the rows of that one widget, read the same way as the PDF (its table, else its list rows, else its figures)
  V.wxMenu = () => '<details class="mnu sd-wx"><summary aria-label="Download this widget" title="Download this widget">Download</summary><div class="mnu-p"><button type="button" data-act="wxDl" data-f="csv">CSV</button><button type="button" data-act="wxDl" data-f="xlsx">Excel</button></div></details>';
  ACT.wxDl = async a => {
    const sec = a.closest('.sd-w, .adx-c'); const det = a.closest('details'); if (det) det.open = false; if (!sec) return;
    const d = readTab(sec.outerHTML); const w = d.widgets[0]; if (!w) { V.toast('Nothing to download in this widget.', 4000, true); return; }
    const rows = w.table ? [w.table.cols].concat(w.table.rows) : w.lines.length ? [['Item']].concat(w.lines.map(l => [l])) : d.kpis.length ? [['Measure', 'Value', 'Note']].concat(d.kpis) : [['Text'], [w.rest || '']];
    const scope = S.project ? S.project.name : 'Portfolio'; const name = (scope + ' ' + w.title + ' ' + V.today()).replace(/[\\/:*?"<>|]+/g, ' ');
    if (a.getAttribute('data-f') === 'xlsx') { try { const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(V.sheetName ? V.sheetName(wb, w.title) : w.title.slice(0, 31)); ws.addRow([w.title + ' · ' + scope + (w.sub ? ' · ' + w.sub : '')]).font = { bold: true }; ws.addRow([]); rows.forEach((r, i) => { const row = ws.addRow(r); if (i === 0) row.font = { bold: true }; }); ws.columns.forEach((c, i) => { c.width = Math.min(60, Math.max(10, ...rows.map(r => String(r[i] == null ? '' : r[i]).length + 2))); }); const buf = await wb.xlsx.writeBuffer(); V.download(name + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); } catch (e) { V.toast('Excel could not be made: ' + (e.message || e), 6000, true); } return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; V.download(name + '.csv', '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  };
  V.dashPdf = { build, readTab };
})(typeof window !== 'undefined' ? window : globalThis);
