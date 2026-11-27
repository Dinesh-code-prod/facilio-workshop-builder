/* Project search: a button in the top bar (separate from the menu search) that searches what the project has saved: requirements, decisions, actions, risks,
   change requests, UAT and build records, tasks, guides, notes, configuration inputs, the BRD and more. Each result says what it is, where it sits in the lifecycle,
   shows the matching text and opens the page it lives on. Exact phrase matches come first; "related" results contain all the words but not the phrase.
   For the project team only (the server refuses customers). Uploaded files are not indexed.
   Shown as Facilio's search palette (user, 27 Nov 2026: "look at search ui, how nice it is"): a 656 px panel near the top, a grey field, the project's pages as
   "Stage – Page" rows to jump to (recent ones first), the saved records under them once three letters are typed, arrow keys, Enter and Esc, key hints in the footer. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  let T = 0, SEQ = 0; const G = { q: '', res: null, busy: false, err: '', i: 0 };
  const can = () => !!S.project && !!S.user && !V.isCustomer();
  const svg = d => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const GLASS = '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', GO = '<path d="M7 17L17 7M9 7h8v8"/>', CHEV = '<path d="M9 6l6 6-6 6"/>';
  V.gsButton = () => can() ? `<button class="btn sm gs-btn" data-act="gsOpen" title="Search everything saved in this project (Ctrl+K)" aria-label="Search the project">${svg(GLASS)}<span class="gs-t">Search</span></button>` : '';
  const hl = (t, q) => { const s = esc(t); const toks = String(q).split(/\s+/).filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); if (!toks.length) return s; return s.replace(new RegExp('(' + toks.join('|') + ')', 'ig'), '<mark>$1</mark>'); };
  // the project's pages: the menu as "Stage – Page"; the pages visited lately (S.ui.navTrail) come first while nothing is typed
  const pages = () => { const all = []; (V.navFor ? V.navFor() : []).forEach(g => g.items.forEach(([id, l]) => { if (V[id] && !all.some(x => x.v === id)) all.push({ v: id, t: String(g.g || '').replace(/^\d+\.\s*/, '') + ' – ' + l }); })); return all; };
  const pageRows = q => { const all = pages(); if (q) { const w = q.toLowerCase().split(/\s+/).filter(Boolean); return all.filter(p => w.every(x => p.t.toLowerCase().includes(x))).slice(0, 6); }
    const seen = (S.ui.navTrail || []).slice().reverse().map(x => x.view).filter((v, i, a) => v && a.indexOf(v) === i); return seen.map(v => all.find(p => p.v === v)).filter(Boolean).concat(all).filter((p, i, a) => a.indexOf(p) === i).slice(0, 7); };
  const prow = p => `<button type="button" class="gs-r" role="option" data-act="gsGo" data-v="${esc(p.v)}"><i class="gs-ic">${svg(GO)}</i><span class="gs-t1">${hl(p.t, G.q)}</span><i class="gs-ch">${svg(CHEV)}</i></button>`;
  const row = r => { const stage = V.stageOfView ? V.stageOfView(r.view) : ''; return `<button type="button" class="gs-r gs-rec" role="option" data-act="gsGo" data-v="${esc(r.view)}"><i class="gs-ic">${svg(GLASS)}</i><span class="gs-t1"><b>${hl(r.title, G.q)}</b><span class="gs-k">${esc(r.label)}${stage ? ' · ' + esc(stage) : ''}${r.exact ? '' : ' · related'}</span><span class="gs-x">${hl(r.excerpt, G.q)}</span></span><i class="gs-ch">${svg(CHEV)}</i></button>`; };
  function body() {
    const pr = pageRows(G.q); let out = pr.length ? `<div class="gs-h">${G.q ? 'Pages' : 'Pages, recent first'}</div>${pr.map(prow).join('')}` : '';
    if (G.err) return out + `<div class="notice err">${esc(G.err)}</div>`;
    if (G.busy) return out + '<div class="gs-note">Searching the saved records…</div>';
    if (!G.res) return out + `<div class="gs-note">${G.q ? 'Type at least 3 letters to search the saved records too.' : 'Type to search the requirements, decisions, actions, risks, change requests, UAT and build records, tasks, guides, notes, configuration inputs and the BRD. Uploaded files are not searched.'}</div>`;
    const ex = G.res.filter(r => r.exact), rel = G.res.filter(r => !r.exact);
    if (!G.res.length) return out + `<div class="gs-note">Nothing saved in this project matches "${esc(G.q)}".</div>`;
    return out + (ex.length ? `<div class="gs-h">Exact matches (${ex.length})</div>${ex.map(row).join('')}` : '') + (rel.length ? `<div class="gs-h">Related: contains all the words (${rel.length})</div>${rel.map(row).join('')}` : '');
  }
  const rows = () => [...document.querySelectorAll('#gs_out .gs-r')];
  const mark = () => { const r = rows(); G.i = Math.max(0, Math.min(G.i, r.length - 1)); r.forEach((x, k) => { x.classList.toggle('on', k === G.i); x.setAttribute('aria-selected', String(k === G.i)); }); if (r[G.i]) r[G.i].scrollIntoView({ block: 'nearest' }); };
  const paint = () => { const el = document.getElementById('gs_out'); if (el) { el.innerHTML = body(); G.i = 0; mark(); } };
  ACT.gsClose = () => { const p = document.getElementById('gsPal'); if (p) p.remove(); };
  ACT.gsOpen = () => { if (!can()) return; ACT.gsClose(); G.res = null; G.q = ''; G.err = ''; G.i = 0;
    const p = document.createElement('div'); p.id = 'gsPal'; p.className = 'gs-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Search this project');
    p.innerHTML = `<label class="gs-f">${svg(GLASS)}<input type="search" id="gs_q" class="gs-in" placeholder="Search anything in this project" autocomplete="off" aria-label="Search the project" aria-controls="gs_out"></label><div id="gs_out" class="gs-out" role="listbox" aria-label="Results"></div>
      <div class="gs-foot"><span><kbd>↑↓</kbd> to navigate</span><span><kbd>enter</kbd> to select</span><span><kbd>esc</kbd> to close</span></div>`;
    document.body.appendChild(p); paint(); const i = document.getElementById('gs_q'); i.focus(); i.addEventListener('input', () => ACT.gsType(i));
    i.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); G.i += e.key === 'ArrowDown' ? 1 : -1; mark(); } else if (e.key === 'Enter') { e.preventDefault(); const r = rows()[G.i]; if (r) r.click(); } }); };
  ACT.gsType = el => { const q = String(el.value || '').trim(); G.q = q; clearTimeout(T); if (q.length < 3) { G.res = null; G.err = ''; G.busy = false; paint(); return; } const my = ++SEQ; G.busy = true; paint();
    T = setTimeout(async () => { try { const r = await API.get('/api/projects/' + S.project.id + '/search?q=' + encodeURIComponent(q)); if (my !== SEQ) return; G.res = r.results || []; G.err = ''; } catch (e) { if (my !== SEQ) return; G.err = e.message || 'The search could not run'; G.res = null; } G.busy = false; paint(); }, 350); };
  ACT.gsGo = a => { const v = a.getAttribute('data-v'); ACT.gsClose(); V.closeDrawer(); if (v && V.go) V.go(v); };
  root.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && can()) { e.preventDefault(); ACT.gsOpen(); } else if (e.key === 'Escape') ACT.gsClose(); });
  if (root.document) root.document.addEventListener('mousedown', e => { const p = document.getElementById('gsPal'); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('.gs-btn'))) ACT.gsClose(); });   // a click outside closes it, as in Facilio
})(typeof window !== 'undefined' ? window : globalThis);
