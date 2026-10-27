/* Timeline filter and PDF export shared by the admin dashboard and the project pages.
   V.range.bar(key, state, opts)  -> the filter bar (preset periods + custom from/to + Export PDF)
   V.range.span(state)            -> [from, to] ISO dates ('' = open ended)
   V.range.inRange(date, span)    -> true when the date falls inside the span (undated records are excluded when a period is set)
   V.range.pdf({title, sub, html})-> prints a clean A4 report of the given HTML (use "Save as PDF" in the print dialog) */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const PERIODS = [['all', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['month', 'This month'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['quarter', 'This quarter'], ['year', 'This year'], ['custom', 'Custom range']];
  const iso = d => d.toISOString().slice(0, 10); const today = () => iso(new Date());
  const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  function span(st) {
    const t = today(), d = new Date(), y = d.getUTCFullYear(); st = st || {};
    switch (st.period) {
      case 'today': return [t, t]; case 'yesterday': return [add(t, -1), add(t, -1)];
      case 'week': { const wd = (d.getUTCDay() + 6) % 7; return [add(t, -wd), t]; }
      case 'month': return [iso(new Date(Date.UTC(y, d.getUTCMonth(), 1))), iso(new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)))];
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
  let openKey = null;
  const fmt = x => { if (!x) return '…'; const d = new Date(x + 'T00:00:00Z'); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const short = st => { const cur = (st && st.period) || 'all'; const p = PERIODS.find(x => x[0] === cur) || PERIODS[0]; const sp = span(st); if (cur === 'all') return ['All time', '']; return [cur === 'custom' ? 'Custom range' : p[1], (sp[0] === sp[1] ? fmt(sp[0]) : fmt(sp[0]) + ' – ' + fmt(sp[1]))]; };
  function bar(key, st, o) {
    o = o || {}; const cur = (st && st.period) || 'all'; const [l1, l2] = short(st); const open = openKey === key;
    const cal = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>';
    const pop = open ? `<div class="rgdd-pop" role="dialog" aria-label="Choose a time range"><ul class="rgdd-list" role="listbox">${PERIODS.map(([p, l]) => `<li><button type="button" role="option" aria-selected="${cur === p}" class="rgdd-i${cur === p ? ' on' : ''}" data-act="rgSet" data-k="${key}" data-p="${p}">${l}</button></li>`).join('')}</ul>${cur === 'custom' ? `<div class="rgdd-c"><label>From<input type="date" value="${esc(st.from || '')}" data-change="rgDate" data-k="${key}" data-w="from" aria-label="From date"></label><label>To<input type="date" value="${esc(st.to || '')}" data-change="rgDate" data-k="${key}" data-w="to" aria-label="To date"></label><button type="button" class="btn sm primary" data-act="rgClose" data-k="${key}">Apply</button></div>` : ''}</div>` : '';
    return `<div class="rgbar" role="group" aria-label="Timeline filter">${o.note ? `<span class="rg-n">${esc(o.note)}</span>` : ''}<div class="rgdd"><button type="button" class="rgdd-btn${cur !== 'all' ? ' set' : ''}" aria-haspopup="dialog" aria-expanded="${open}" data-act="rgOpen" data-k="${key}">${cal}<span class="rgdd-t"><b>${esc(l1)}</b>${l2 ? `<i>${esc(l2)}</i>` : ''}</span><svg class="rgdd-ch" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>${pop}</div>${cur !== 'all' ? `<button type="button" class="rg-clear" data-act="rgSet" data-k="${key}" data-p="all" aria-label="Clear time range">Clear</button>` : ''}${o.pdf === false ? '' : `<button type="button" class="btn sm rg-pdf" data-act="rgPdf" data-k="${key}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>Export PDF</button>`}</div>`;
  }
  ACT.rgOpen = a => { const h = hooks[a.getAttribute('data-k')]; if (!h) return; const k = a.getAttribute('data-k'); openKey = openKey === k ? null : k; h.change(); };
  ACT.rgClose = a => { const h = hooks[a.getAttribute('data-k')]; openKey = null; if (h) h.change(); };
  document.addEventListener('click', e => { if (openKey && !e.target.closest('.rgdd')) { const h = hooks[openKey]; openKey = null; if (h) h.change(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openKey) { const h = hooks[openKey]; openKey = null; if (h) h.change(); } });
  ACT.rgSet = a => { const h = hooks[a.getAttribute('data-k')]; if (!h) return; const s = h.state(); s.period = a.getAttribute('data-p'); if (s.period !== 'custom') { delete s.from; delete s.to; openKey = null; } h.change(); };
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
      *, *::before, *::after { animation: none !important; transition: none !important; } .si-item, .ll-row { opacity: 1 !important; transform: none !important; } /* the copied page keeps its enter-animation classes but not the parent that plays them, so they would print invisible */
      .rgbar, .dtabs, button, .adm-hero-a, [data-act] .go { display: none !important; } .adm-card, .card, .kpi, .sp-card { break-inside: avoid; } .adm-row, .kpi-grid { break-inside: avoid; }
    </style></head><body><div class="pr-h"><img src="${logo}" alt="Facilio"><div><h1>${esc(o.title)}</h1><p>${esc(o.sub || '')}</p></div><div class="r">Generated ${esc(when)}<br>Facilio Delivery Studio</div></div><div class="pr-body">${o.html}</div></body></html>`); d.close();
    const go = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { V.toast && V.toast('Could not open the print dialog: ' + e.message, 4000, true); } setTimeout(() => fr.remove(), 60000); };
    let fired = false; const once = () => { if (fired) return; fired = true; setTimeout(go, 350); }; fr.onload = once; setTimeout(once, 1800);
  }
  V.range = { PERIODS, span, inRange, label, bar, pdf, hooks };
})(typeof window !== 'undefined' ? window : globalThis);
