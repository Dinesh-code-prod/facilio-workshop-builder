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
    saveBars(); railTiles();
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
