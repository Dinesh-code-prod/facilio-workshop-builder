// Project pages only: marks the body with the stage of the open page (colours in src/projfx.css) and plays one short entrance when the page or its tab changes
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  // rail entry -> stage key; each stage has its own colour pair in projfx.css
  const STAGE = { msaintake: 's1', rsquestions: 's2', solution: 's3', ftr: 's4', guides: 's5', tasks: 's6', handover: 's7', projdash: 'home', statusrep: 'rep', resources: 'notes', seefacilio: 'show', teamhelp: 'help', claudesetup: 'claude', settings: 'set' };
  let last = '', timer = 0, fxT = 0;
  function patch() {
    const b = d.body; if (!b) return;
    const m = /^#\/p\/[^/]+\/([^/?]+)/.exec(location.hash); const inProj = !!m && !!d.querySelector('.main');
    b.classList.toggle('in-proj', inProj); if (!inProj) { b.removeAttribute('data-stage'); last = ''; return; }
    d.querySelectorAll('nav.sidebar .rl-b:not([data-stage])').forEach(x => x.setAttribute('data-stage', STAGE[x.getAttribute('data-view')] || 'help'));
    // the open rail entry gives the stage; on a phone the rail is folded away, so the page name is looked up in the lifecycle stages instead
    const act = d.querySelector('nav.sidebar .rl-b.active'), L = root.FWBLife, ST7 = { intro: 's1', sessions: 's2', design: 's3', uat: 's4', training: 's5', hypercare: 's7', handover: 's7' };
    const byView = () => { const lv = L && L.STAGES && L.STAGES.find(x => x.views.includes(m[1])); return STAGE[m[1]] || (lv && ST7[lv.k]) || (m[1] === 'portals' ? 's3' : 'help'); };   // Home only for the dashboard itself
    const st = act ? act.getAttribute('data-stage') : byView();
    if (b.getAttribute('data-stage') !== st) b.setAttribute('data-stage', st);
    saveBars(); railTiles(); searchFields();
    // entrance only when the page or its selected tab changes, never on a re-render after a tick or a save
    const tab = d.querySelector('.main [role="tab"][aria-selected="true"], .main .seg > button.on, .main .tabs > .on, .main .tabs > .active');
    const key = location.hash.split('?')[0] + '|' + (tab ? tab.textContent.trim().slice(0, 40) : '');
    if (key === last) return; const samePage = last.split('|')[0] === key.split('|')[0]; last = key;
    const el = samePage ? d.querySelector('.main [role="tabpanel"]') || d.querySelector('.main .page-body') : d.querySelector('.main .page') || d.querySelector('.main');
    if (!el || root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.remove('fx-in'); void el.offsetWidth; el.classList.add('fx-in'); clearTimeout(fxT); fxT = setTimeout(() => el.classList.remove('fx-in'), 900);
  }
  // Save bars: a Save button that ends a form, card or side panel (its row holds only buttons) becomes a bar across the bottom of that form,
  // kept in view while the form scrolls, with a status on the left: no unsaved changes / unsaved changes / saving. Inline saves next to one field are left alone.
  const SAVE = /^save( changes| and close| draft| as draft| settings| details| version| workbook)?$/i;
  const FORM = '.card, form, .drawer, .dlg, .modal, [role="dialog"], .side-panel, .sd-w';
  // Search fields: one component (the wrapper draws nothing, the field is the Apple search field) and a live preview of what matches on the page
  const isSearch = i => i.type === 'search' || /search|find a|filter/i.test(i.placeholder || '');
  function searchFields() {
    d.querySelectorAll('.main input:not(.fx-q)').forEach(i => { if (!isSearch(i)) return; i.classList.add('fx-q'); i.setAttribute('autocomplete', 'off');
      const p = i.parentElement; if (p && p.querySelector(':scope > svg, :scope > i, :scope > .ico') && p.querySelectorAll('input').length === 1) p.classList.add('fx-qw'); else i.classList.add('fx-qi'); });
  }
  let pop = null, popFor = null, popItems = [];
  const ROWS = 'tbody tr, .ho-it, .ev-row, .chk-row, .kb-card, .cs-sol-g :is(a, button), .rs-q, .card > .card-h h3, li';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const closePop = () => { if (pop) pop.remove(); pop = null; popFor = null; popItems = []; };
  function preview(inp) {
    if (!inp.isConnected) { const a = d.activeElement; inp = a && a.classList && a.classList.contains('fx-q') ? a : null; if (!inp) return closePop(); }   // the page may have redrawn the field while typing
    const q = inp.value.trim().toLowerCase(); if (q.length < 1) return closePop();
    const scope = inp.closest('.page-body, .page, .main') || d.body; const seen = new Set(); popItems = [];
    for (const el of scope.querySelectorAll(ROWS)) {
      if (el.closest('.fx-qpop, .mt-bar, nav, .rl-fly') || !el.offsetParent) continue;
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim(); if (!t || t.length > 400 || !t.toLowerCase().includes(q)) continue;
      // a clean result: the part that matches as the title, a few short other parts as a grey line (table cells, or the item's lines)
      const parts = (el.matches('tr') ? [...el.cells].map(c => (c.innerText || '').replace(/\s+/g, ' ').trim()) : (el.innerText || '').split('\n').map(s => s.replace(/\s+/g, ' ').trim())).filter(s => s && !/@/.test(s) && s.length > 1);
      const title = parts.slice().sort((a, b) => b.length - a.length)[0] || t;   // the item's main text (its longest part)
      const rest = parts.filter(s => s !== title && s.length < 40), sub = rest.filter(s => s.toLowerCase().includes(q)).concat(rest.filter(s => !s.toLowerCase().includes(q))).slice(0, 3).join(' · ');   // the matching detail first
      const key = title + '|' + sub; if (seen.has(key)) continue; seen.add(key); popItems.push({ el, t: title, s: sub }); if (popItems.length >= 8) break;
    }
    if (!pop) { pop = d.createElement('div'); pop.className = 'fx-qpop'; pop.setAttribute('role', 'listbox'); d.body.appendChild(pop);
      pop.addEventListener('mousedown', e => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); go(+b.getAttribute('data-i')); }); }
    popFor = inp; const r = inp.getBoundingClientRect(); pop.style.left = Math.round(r.left) + 'px'; pop.style.top = Math.round(r.bottom + 6) + 'px'; pop.style.width = Math.max(320, Math.round(r.width)) + 'px';
    const hl = s => { const k = s.toLowerCase().indexOf(q); return k < 0 ? esc(s) : esc(s.slice(0, k)) + '<mark>' + esc(s.slice(k, k + q.length)) + '</mark>' + esc(s.slice(k + q.length)); };
    pop.innerHTML = popItems.length ? '<div class="fx-qh">' + popItems.length + (popItems.length >= 8 ? '+' : '') + ' on this page</div>' + popItems.map((x, n) => '<button type="button" role="option" data-i="' + n + '"><b>' + hl(x.t.length > 90 ? x.t.slice(0, 89) + '…' : x.t) + '</b>' + (x.s ? '<small>' + hl(x.s) + '</small>' : '') + '</button>').join('') : '<div class="fx-qh">Nothing on this page matches “' + esc(inp.value.trim()) + '”</div>';
  }
  function go(n) { const x = popItems[n]; closePop(); if (!x || !x.el.isConnected) return; x.el.scrollIntoView({ block: 'center', behavior: root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); x.el.classList.add('fx-flash'); setTimeout(() => x.el.classList.remove('fx-flash'), 1600); }
  d.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('fx-q') && d.body.classList.contains('in-proj')) setTimeout(() => preview(e.target), 120); }, true);
  d.addEventListener('keydown', e => { if (!pop || e.target !== popFor) return; if (e.key === 'Escape') closePop(); else if (e.key === 'Enter' && popItems.length) { e.preventDefault(); go(0); } }, true);
  d.addEventListener('focusout', e => { if (e.target === popFor) setTimeout(() => { if (d.activeElement !== popFor) closePop(); }, 150); }, true);
  root.addEventListener('hashchange', closePop); root.addEventListener('resize', closePop); d.addEventListener('scroll', e => { if (!pop || (e.target.closest && e.target.closest('.fx-qpop'))) return; const f = popFor && popFor.isConnected ? popFor : (d.activeElement && d.activeElement.classList && d.activeElement.classList.contains('fx-q') ? d.activeElement : null); if (!f) return closePop(); popFor = f; const r = f.getBoundingClientRect(); pop.style.left = Math.round(r.left) + 'px'; pop.style.top = Math.round(r.bottom + 6) + 'px'; }, true);   // the panel follows its field (a list that filters as you type may scroll the page)
  // rail entries as macOS System Settings: each its own colour tile (from its label), entries of one group on one panel (first/last marked)
  const TILE = { intro: '#0a84ff', sessions: '#ff9500', solution: '#30b0c7', uat: '#34c759', training: '#a2845e', tasks: '#ff453a', handover: '#00a99d', home: '#1D1A5E', reports: '#32ade6', notes: '#f2a900', showcase: '#E5197F', help: '#64748b', claude: '#cc785c', settings: '#8e8e93' };
  function railTiles() {
    const rl = d.querySelector('nav.sidebar .rl'); if (!rl || rl.getAttribute('data-tiled') === String(rl.children.length)) return; rl.setAttribute('data-tiled', String(rl.children.length));
    let prev = null;
    [...rl.children].forEach(x => {
      if (x.classList.contains('rl-sep')) { if (prev) prev.setAttribute('data-glast', ''); prev = null; return; }
      if (!x.classList.contains('rl-b')) return;
      const lab = ((x.querySelector('.rl-l') || x).textContent || '').trim().toLowerCase();
      x.style.setProperty('--tile', TILE[lab] || '#8e8e93'); x.removeAttribute('data-gfirst'); x.removeAttribute('data-glast');
      if (!prev) x.setAttribute('data-gfirst', ''); prev = x;
    });
    if (prev) prev.setAttribute('data-glast', '');
  }
  function saveBars() {
    d.querySelectorAll('.main button.btn, [role="dialog"] button.btn, .drawer button.btn').forEach(btn => {
      const row = btn.parentElement; if (!row || row.classList.contains('fx-savebar') || !SAVE.test(btn.textContent.trim())) return;
      if ([...row.children].some(c => !/^(BUTTON|A|SPAN|SMALL|I)$/.test(c.tagName)) || row.querySelector('input, select, textarea')) return;
      const form = row.closest(FORM); if (!form || !form.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea')) return;
      if (row.nextElementSibling && row.nextElementSibling.offsetHeight > 0) return;   // only the last row of the form
      row.classList.add('fx-savebar'); const st = d.createElement('span'); st.className = 'fx-sv-st'; st.setAttribute('role', 'status'); st.textContent = btn.disabled ? 'Read only' : 'No unsaved changes'; row.insertBefore(st, row.firstChild);
    });
  }
  const barOf = el => { const f = el.closest && el.closest(FORM); return f && f.querySelector(':scope .fx-savebar'); };
  const mark = (bar, state, text) => { if (!bar) return; bar.setAttribute('data-state', state); const s = bar.querySelector('.fx-sv-st'); if (s) s.textContent = text; };
  d.addEventListener('input', e => { if (d.body.classList.contains('in-proj')) mark(barOf(e.target), 'dirty', 'Unsaved changes'); }, true);
  d.addEventListener('change', e => { if (d.body.classList.contains('in-proj')) mark(barOf(e.target), 'dirty', 'Unsaved changes'); }, true);
  // after Save: an error message means "Not saved"; otherwise "Saved" once the request has had time to finish (a re-render replaces the bar anyway)
  d.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.fx-savebar button.btn'); if (!b || !SAVE.test(b.textContent.trim()) || b.disabled) return;
    const bar = b.parentElement, errsBefore = d.querySelectorAll('.toast.err').length; mark(bar, 'saving', 'Saving…'); let n = 0;
    const tick = setInterval(() => { n++; if (!bar.isConnected) return clearInterval(tick);
      if (d.querySelectorAll('.toast.err').length > errsBefore) { clearInterval(tick); return mark(bar, 'error', 'Not saved. See the message and try again.'); }
      if (n >= 8 && !b.disabled && !b.classList.contains('busy')) { clearInterval(tick); mark(bar, 'saved', 'Saved'); } }, 300); }, true);
  const later = () => { if (!timer) timer = setTimeout(() => { timer = 0; patch(); }, 30); };   // throttled, not debounced: a page that keeps changing still gets patched
  function start() { patch(); new MutationObserver(later).observe(d.body, { childList: true, subtree: true }); root.addEventListener('hashchange', later); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
