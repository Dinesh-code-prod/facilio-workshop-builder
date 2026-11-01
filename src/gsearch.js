/* Project search: a button in the top bar (separate from the menu search) that searches what the project has saved: requirements, decisions, actions, risks,
   change requests, UAT and build records, tasks, guides, notes, configuration inputs, the BRD and more. Each result says what it is, where it sits in the lifecycle,
   shows the matching text and opens the page it lives on. Exact phrase matches come first; "related" results contain all the words but not the phrase.
   For the project team only (the server refuses customers). Uploaded files are not indexed. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  let T = 0, SEQ = 0; const G = { q: '', res: null, busy: false, err: '' };
  const can = () => !!S.project && !!S.user && !V.isCustomer();
  V.gsButton = () => can() ? '<button class="btn sm gs-btn" data-act="gsOpen" title="Search everything saved in this project (Ctrl+K)" aria-label="Search the project"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="gs-t">Search</span></button>' : '';
  const hl = (t, q) => { const s = esc(t); const toks = String(q).split(/\s+/).filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); if (!toks.length) return s; return s.replace(new RegExp('(' + toks.join('|') + ')', 'ig'), '<mark>$1</mark>'); };
  const row = r => { const stage = V.stageOfView ? V.stageOfView(r.view) : ''; return `<button type="button" class="gs-r" data-act="gsGo" data-v="${esc(r.view)}"><span class="gs-k">${esc(r.label)}</span><b>${hl(r.title, G.q)}</b><span class="gs-x">${hl(r.excerpt, G.q)}</span><span class="gs-w">${stage ? esc(stage) + ' · ' : ''}${esc(r.view)}${r.exact ? '' : ' · related'}</span></button>`; };
  function body() {
    if (G.err) return `<div class="notice err">${esc(G.err)}</div>`;
    if (G.busy) return '<div class="muted small" style="padding:14px 4px">Searching…</div>';
    if (!G.res) return '<div class="muted small" style="padding:14px 4px">Type at least 3 letters. Searches requirements, decisions, actions, risks, change requests, UAT and build records, tasks, guides, notes, configuration inputs and the BRD. Uploaded files are not searched.</div>';
    const ex = G.res.filter(r => r.exact), rel = G.res.filter(r => !r.exact);
    if (!G.res.length) return `<div class="muted small" style="padding:14px 4px">Nothing saved in this project matches "${esc(G.q)}".</div>`;
    return (ex.length ? `<div class="gs-h">Exact matches (${ex.length})</div>${ex.map(row).join('')}` : '') + (rel.length ? `<div class="gs-h">Related: contains all the words (${rel.length})</div>${rel.map(row).join('')}` : '');
  }
  const paint = () => { const el = document.getElementById('gs_out'); if (el) el.innerHTML = body(); };
  ACT.gsOpen = () => { if (!can()) return; G.res = null; G.q = ''; G.err = '';
    V.drawer('Search this project', '<input type="search" id="gs_q" class="gs-in" placeholder="e.g. Work Order UAT completed" autocomplete="off" aria-label="Search the project" data-change="gsType"><div id="gs_out" class="gs-out"></div>', '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true });
    paint(); setTimeout(() => { const i = document.getElementById('gs_q'); if (i) { i.focus(); i.addEventListener('input', () => ACT.gsType(i)); } }, 60); };
  ACT.gsType = el => { const q = String(el.value || '').trim(); G.q = q; clearTimeout(T); if (q.length < 3) { G.res = null; G.err = ''; G.busy = false; paint(); return; } const my = ++SEQ; G.busy = true; paint();
    T = setTimeout(async () => { try { const r = await API.get('/api/projects/' + S.project.id + '/search?q=' + encodeURIComponent(q)); if (my !== SEQ) return; G.res = r.results || []; G.err = ''; } catch (e) { if (my !== SEQ) return; G.err = e.message || 'The search could not run'; G.res = null; } G.busy = false; paint(); }, 350); };
  ACT.gsGo = a => { const v = a.getAttribute('data-v'); V.closeDrawer(); if (v && V.go) V.go(v); };
  root.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && can()) { e.preventDefault(); ACT.gsOpen(); } });
})(typeof window !== 'undefined' ? window : globalThis);
