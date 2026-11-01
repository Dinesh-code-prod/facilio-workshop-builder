/* Facilio screens (team): the Facilio demo library kept inside Delivery Studio, for requirement sessions: how the sign-in, a work order, an asset, planned
   maintenance, quotes and invoices, dashboards, reports, the mobile app, Atom, FM Assistant, the Help desk and Vibe look.
   Laid out like the CMMS demo kit: a panel on the left with the screens grouped by area, and the chosen screen shown large on the right, in full 1920 x 1080.
   The pictures and their list are stored in this app (public/demokit/shots); nothing here opens or depends on another site. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  let ITEMS = null, loading = false, failed = false;
  const load = () => { if (ITEMS || loading || failed) return; loading = true; fetch('demokit/shots/items.json').then(r => { if (!r.ok) throw new Error('missing'); return r.json(); }).then(j => { ITEMS = Array.isArray(j) ? j : []; }).catch(() => { failed = true; }).finally(() => { loading = false; V.render(); }); };
  const APPNAME = { cmms: 'CMMS', vibe: 'Vibe', atom: 'Atom', 'fm-assistant': 'FM Assistant', helpdesk: 'Help desk', mobile: 'Mobile' };
  const appName = a => APPNAME[a] || a;
  const ui = () => S.ui;
  const view = () => {
    const app = ui().dkApp || 'all', q = String(ui().dkQ || '').trim().toLowerCase();
    const list = (ITEMS || []).filter(i => (app === 'all' || (i.apps || []).includes(app)) && (!q || (i.label + ' ' + (i.desc || '') + ' ' + i.group + ' ' + (i.tags || []).join(' ')).toLowerCase().includes(q)));
    const sel = list.find(i => i.id === ui().dkSel) || list[0] || null;
    return { list, sel, app, q };
  };
  V.demokit = {
    html() {
      load();
      const head = `<div class="page-header"><div class="t"><h1>Facilio screens</h1><p>The Facilio demo library, kept here for requirement sessions: how the sign-in, work orders, assets, planned maintenance, dashboards, reports, the mobile app, Atom, FM Assistant, the Help desk and Vibe look. Pick a screen on the left to see it full size, or save it as a picture.</p></div><div class="row"><button class="btn primary" data-act="tpStart" data-ci="0">&#9654; Play the guided tour</button></div></div>`;
      if (failed) return head + '<div class="page-body"><div class="empty">The screen library could not be loaded. Reload the page, or try again in a moment.</div></div>';
      if (!ITEMS) return head + `<div class="page-body">${V.ui && V.ui.loading ? V.ui.loading(2) : '<div class="empty">Loading the screens…</div>'}</div>`;
      const { list, sel, app, q } = view(); const closed = ui().dkClosed || {};
      const apps = ['all'].concat([...new Set(ITEMS.flatMap(i => i.apps || []))]);
      const groups = []; list.forEach(i => { let g = groups.find(x => x.n === i.group); if (!g) groups.push(g = { n: i.group, items: [] }); g.items.push(i); });
      const side = `<aside class="dkv-side" aria-label="Screens"><div class="dkv-tools"><div class="tl-search">${V.ico('search')}<input type="search" id="dkQ" placeholder="Search ${ITEMS.length} screens" aria-label="Search the screens" value="${esc(ui().dkQ || '')}"></div>
        <select data-change="dkApp" aria-label="Show screens of one app">${apps.map(a => `<option value="${esc(a)}"${a === app ? ' selected' : ''}>${a === 'all' ? 'All apps (' + ITEMS.length + ')' : esc(appName(a)) + ' (' + ITEMS.filter(i => (i.apps || []).includes(a)).length + ')'}</option>`).join('')}</select></div>
        <nav class="dkv-nav">${groups.length ? groups.map(g => `<div class="dkv-grp"><button type="button" class="dkv-g${closed[g.n] && !q ? ' closed' : ''}" data-act="dkGroup" data-g="${esc(g.n)}" aria-expanded="${!(closed[g.n] && !q)}"><span class="dkv-chev" aria-hidden="true"></span><span class="dkv-gl">${esc(g.n)}</span><span class="dkv-n">${g.items.length}</span></button>${closed[g.n] && !q ? '' : `<div class="dkv-items">${g.items.map(i => `<button type="button" class="dkv-i${sel && sel.id === i.id ? ' on' : ''}" data-act="dkSel" data-id="${esc(i.id)}"${sel && sel.id === i.id ? ' aria-current="true"' : ''}>${esc(i.label)}</button>`).join('')}</div>`}</div>`).join('') : '<p class="dkv-none">No screen matches.</p>'}</nav></aside>`;
      let main;
      if (!sel) main = '<section class="dkv-main"><div class="empty">Nothing to show. Clear the search or choose another app.</div></section>';
      else { const idx = list.indexOf(sel);
        main = `<section class="dkv-main"><header class="dkv-h"><div class="dkv-t"><small>${esc(sel.group)}</small><h2>${esc(sel.label)}</h2>${sel.desc ? `<p>${esc(sel.desc)}</p>` : ''}${(sel.tags || []).length ? `<div class="dkv-tags">${sel.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>
          <div class="dkv-a"><button type="button" class="btn" data-act="dkStep" data-d="-1"${idx <= 0 ? ' disabled' : ''} aria-label="Previous screen">&larr; Previous</button><button type="button" class="btn" data-act="dkStep" data-d="1"${idx >= list.length - 1 ? ' disabled' : ''} aria-label="Next screen">Next &rarr;</button><button type="button" class="btn" data-act="dkPng" data-id="${esc(sel.id)}">Save PNG</button><a class="btn primary" href="demokit/shots/${esc(sel.id)}.png" target="_blank" rel="noopener">Open full size</a></div></header>
          <a class="dkv-frame" href="demokit/shots/${esc(sel.id)}.png" target="_blank" rel="noopener" aria-label="Open ${esc(sel.label)} full size"><img src="demokit/shots/${esc(sel.id)}.png" alt="${esc(sel.label)}" decoding="async"></a><p class="dkv-foot">${idx + 1} of ${list.length}${q || app !== 'all' ? ' in this view' : ''} &middot; use the up and down arrow keys to move between screens</p></section>`; }
      return head + `<div class="page-body"><div class="dkv">${side}${main}</div></div>`;
    },
    mount() {
      const i = document.getElementById('dkQ'); if (i) i.addEventListener('input', () => { ui().dkQ = i.value; const p = i.selectionStart; V.render(); const n = document.getElementById('dkQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } });
      const on = document.querySelector('.dkv-i.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
      if (!root.__dkKeys) { root.__dkKeys = true; document.addEventListener('keydown', e => { if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !document.querySelector('.dkv') || /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); }); }
    }
  };
  function step(d) { if (!ITEMS) return; const { list, sel } = view(); if (!list.length) return; const i = Math.max(0, Math.min(list.length - 1, (sel ? list.indexOf(sel) : 0) + d)); ui().dkSel = list[i].id; V.render(); }
  ACT.dkSel = a => { ui().dkSel = a.getAttribute('data-id'); V.render(); const m = document.querySelector('.dkv-main'); if (m && m.getBoundingClientRect().top < 0 && m.scrollIntoView) m.scrollIntoView({ block: 'start' }); };
  ACT.dkStep = a => step(Number(a.getAttribute('data-d')) || 0);
  ACT.dkApp = el => { ui().dkApp = el.value; ui().dkSel = ''; V.render(); };
  ACT.dkGroup = a => { const g = a.getAttribute('data-g'), c = ui().dkClosed = ui().dkClosed || {}; c[g] = !c[g]; V.render(); };
  // save the screen as a PNG file (the pictures are already PNG)
  ACT.dkPng = a => V.busy(a, async () => { const id = a.getAttribute('data-id'); const it = (ITEMS || []).find(x => x.id === id); if (!it) return; const r = await fetch('demokit/shots/' + id + '.png'); if (!r.ok) throw new Error('The picture could not be loaded.'); const blob = await r.blob(); const name = 'facilio-' + String(it.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png'; V.download(name, blob); V.toast('Saved ' + name); });
})(typeof window !== 'undefined' ? window : globalThis);
