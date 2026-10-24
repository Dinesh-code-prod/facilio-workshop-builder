/* Timeline filter and PDF export shared by the admin dashboard and the project pages.
   V.range.bar(key, state, opts)  -> the filter bar (preset periods + custom from/to + Export PDF)
   V.range.span(state)            -> [from, to] ISO dates ('' = open ended)
   V.range.inRange(date, span)    -> true when the date falls inside the span (undated records are excluded when a period is set)
   V.range.pdf({title, sub, html})-> prints a clean A4 report of the given HTML (use "Save as PDF" in the print dialog) */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const PERIODS = [['all', 'All time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['quarter', 'This quarter'], ['year', 'This year'], ['custom', 'Custom']];
  const iso = d => d.toISOString().slice(0, 10); const today = () => iso(new Date());
  const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  function span(st) {
    const t = today(), d = new Date(), y = d.getUTCFullYear(); st = st || {};
    switch (st.period) {
      case '7': return [add(t, -6), t]; case '30': return [add(t, -29), t]; case '90': return [add(t, -89), t];
      case 'quarter': { const q = Math.floor(d.getUTCMonth() / 3) * 3; return [iso(new Date(Date.UTC(y, q, 1))), iso(new Date(Date.UTC(y, q + 3, 0)))]; }
      case 'year': return [y + '-01-01', y + '-12-31'];
      case 'custom': return [st.from || '', st.to || ''];
      default: return ['', ''];
    }
  }
  const inRange = (d, sp) => { if (!sp || (!sp[0] && !sp[1])) return true; const x = String(d || '').slice(0, 10); if (!x) return false; return (!sp[0] || x >= sp[0]) && (!sp[1] || x <= sp[1]); };
  const label = st => { const sp = span(st); const p = PERIODS.find(x => x[0] === ((st || {}).period || 'all')) || PERIODS[0]; return p[0] === 'all' ? 'All time' : p[1] + (sp[0] || sp[1] ? ` (${sp[0] || '…'} to ${sp[1] || '…'})` : ''); };
  const hooks = {}; // key -> {state, change(), pdf()}
  function bar(key, st, o) {
    o = o || {}; const cur = (st && st.period) || 'all';
    return `<div class="rg" role="group" aria-label="Timeline filter"><span class="rg-l">Timeline</span><div class="rg-p">${PERIODS.map(([p, l]) => `<button type="button" class="rg-b${cur === p ? ' on' : ''}" aria-pressed="${cur === p}" data-act="rgSet" data-k="${key}" data-p="${p}">${l}</button>`).join('')}</div>${cur === 'custom' ? `<span class="rg-c"><label>From <input type="date" value="${esc(st.from || '')}" data-change="rgDate" data-k="${key}" data-w="from" aria-label="From date"></label><label>To <input type="date" value="${esc(st.to || '')}" data-change="rgDate" data-k="${key}" data-w="to" aria-label="To date"></label></span>` : ''}${o.pdf === false ? '' : `<button type="button" class="btn sm rg-pdf" data-act="rgPdf" data-k="${key}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></svg>Export PDF</button>`}${o.note ? `<span class="rg-n">${esc(o.note)}</span>` : ''}</div>`;
  }
  ACT.rgSet = a => { const h = hooks[a.getAttribute('data-k')]; if (!h) return; const s = h.state(); s.period = a.getAttribute('data-p'); if (s.period !== 'custom') { delete s.from; delete s.to; } h.change(); };
  ACT.rgDate = el => { const h = hooks[el.getAttribute('data-k')]; if (!h) return; h.state()[el.getAttribute('data-w')] = el.value; h.change(); };
  ACT.rgPdf = a => { const h = hooks[a.getAttribute('data-k')]; if (h && h.pdf) h.pdf(); };
  // print through a hidden frame: the app's own stylesheet, a report header, and print rules; the browser's "Save as PDF" produces the file
  function pdf(o) {
    const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    const logo = new URL('brand/logo-navy.png', document.baseURI).href; const when = new Date().toLocaleString();
    const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(fr);
    const d = fr.contentDocument; d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.title)}</title>${css}<style>
      @page { size: A4 landscape; margin: 10mm; } html, body { background: #fff !important; } body { padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 13px; }
      .pr-h { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 3px solid #1570EF; } .pr-h img { height: 22px; } .pr-h h1 { margin: 0; font-size: 20px; color: #1D1A5E; } .pr-h p { margin: 2px 0 0; color: #5B6B88; font-size: 12px; } .pr-h .r { margin-left: auto; text-align: right; color: #5B6B88; font-size: 11px; }
      .rg, .dtabs, button, .adm-hero-a, [data-act] .go { display: none !important; } .adm-card, .card, .kpi, .sp-card { break-inside: avoid; } .adm-row, .kpi-grid { break-inside: avoid; }
    </style></head><body><div class="pr-h"><img src="${logo}" alt="Facilio"><div><h1>${esc(o.title)}</h1><p>${esc(o.sub || '')}</p></div><div class="r">Generated ${esc(when)}<br>Facilio Delivery Studio</div></div><div class="pr-body">${o.html}</div></body></html>`); d.close();
    const go = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { V.toast && V.toast('Could not open the print dialog: ' + e.message, 4000, true); } setTimeout(() => fr.remove(), 60000); };
    let fired = false; const once = () => { if (fired) return; fired = true; setTimeout(go, 350); }; fr.onload = once; setTimeout(once, 1800);
  }
  V.range = { PERIODS, span, inRange, label, bar, pdf, hooks };
})(typeof window !== 'undefined' ? window : globalThis);
