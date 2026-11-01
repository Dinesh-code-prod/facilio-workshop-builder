/* Facilio screens (team): the Facilio demo library kept inside Delivery Studio, for requirement sessions: how the sign-in, a work order, an asset, planned
   maintenance, quotes and invoices, dashboards, reports, the mobile app, Atom, FM Assistant, the Help desk and Vibe look. Search, open full size, save as PNG.
   The pictures are stored in this app (public/demokit/kit, listed in src/demokit-pages.js); nothing here opens or depends on another site. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const PAGES = () => root.FWBKitPages || [];
  const SECS = [['Login', 'Sign-in'], ['CMMS', 'CMMS'], ['Mobile', 'Mobile app'], ['Atom', 'Atom'], ['FM Assistant', 'FM Assistant'], ['Help desk', 'Help desk'], ['Vibe', 'Vibe']];
  const sec = p => (SECS.find(s => String(p.group).startsWith(s[0])) || [p.group, p.group])[0];
  const tab = () => { const t = S.ui.dkTab; return SECS.some(s => s[0] === t) ? t : (V.isAgentProject && V.isAgentProject() ? 'FM Assistant' : 'CMMS'); };
  V.demokit = {
    html() {
      const all = PAGES(); const t = tab(); const q = String(S.ui.dkQ || '').trim().toLowerCase();
      const shown = q ? all.filter(p => (p.label + ' ' + p.desc + ' ' + p.group).toLowerCase().includes(q)) : all.filter(p => sec(p) === t);
      const head = `<div class="page-header"><div class="t"><h1>Facilio screens</h1><p>The Facilio demo library, kept here for requirement sessions: how the sign-in, work orders, assets, planned maintenance, dashboards, reports, the mobile app, Atom, FM Assistant, the Help desk and Vibe look. Open one full size or save it as a picture.</p></div><div class="row"><button class="btn primary" data-act="tpStart" data-ci="0">&#9654; Play the guided tour</button></div></div>`;
      const tabs = `<div class="tabs" role="tablist">${SECS.map(([id, l]) => `<button class="tab${!q && t === id ? ' active' : ''}" role="tab" data-act="dkTab" data-v="${esc(id)}">${esc(l)}<span class="cnt">${all.filter(p => sec(p) === id).length}</span></button>`).join('')}</div>`;
      const card = p => `<article class="dk-card"><button type="button" class="dk-open" data-act="dkView" data-f="${esc(p.file)}" aria-label="Open ${esc(p.label)} full size"><img class="dk-th" loading="lazy" decoding="async" alt="" src="demokit/kit/hd/${esc(p.file)}"></button><div class="dk-b"><small>${esc(p.group)}</small><b>${esc(p.label)}</b><span class="dk-d">${esc(p.desc)}</span><div class="dk-a"><button class="btn sm primary" data-act="dkView" data-f="${esc(p.file)}">View full size</button><button class="btn sm" data-act="dkPng" data-f="${esc(p.file)}">Save PNG</button></div></div></article>`;
      return head + `<div class="page-body"><div class="row" style="margin:0 0 12px"><div class="tl-search" style="flex:1;max-width:420px">${V.ico('search')}<input type="search" id="dkQ" placeholder="Search ${all.length} screens" aria-label="Search the screens" value="${esc(S.ui.dkQ || '')}"></div><span class="xs muted">${shown.length} screen${shown.length === 1 ? '' : 's'}${q ? ' found' : ''}</span></div>
        ${q ? '' : tabs}${shown.length ? `<div class="dk-grid">${shown.map(card).join('')}</div>` : (V.ui ? V.ui.noResults('screens', 'dkClear') : '<div class="empty">No screen matches.</div>')}</div>`;
    },
    mount() { const i = document.getElementById('dkQ'); if (i) i.addEventListener('input', () => { S.ui.dkQ = i.value; const p = i.selectionStart; V.render(); const n = document.getElementById('dkQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } }); }
  };
  ACT.dkTab = a => { S.ui.dkTab = a.getAttribute('data-v'); S.ui.dkQ = ''; V.render(); };
  ACT.dkClear = () => { S.ui.dkQ = ''; V.render(); };
  const byFile = f => PAGES().find(p => p.file === f);
  ACT.dkView = a => { const p = byFile(a.getAttribute('data-f')); if (!p) return; const all = PAGES(); const i = all.indexOf(p);
    V.drawer(p.label, `<p class="small muted">${esc(p.group)}</p><p class="small">${esc(p.desc)}</p><img src="demokit/kit/hd/${esc(p.file)}" alt="${esc(p.label)}" style="width:100%;border:1px solid var(--fc-border);border-radius:6px">`,
      `<button class="btn" data-act="dkPng" data-f="${esc(p.file)}">Save PNG</button><span class="spacer"></span><a class="btn" href="demokit/kit/hd/${esc(p.file)}" target="_blank" rel="noopener">Open the picture in a new tab</a><button class="btn" data-act="closeDrawer">Close</button>`, { wide: true }); };
  // save a picture we hold as a PNG file
  ACT.dkPng = a => V.busy(a, async () => { const p = byFile(a.getAttribute('data-f')); if (!p) return;
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'demokit/kit/hd/' + p.file; });
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const name = 'facilio-' + String(p.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png'; V.download(name, blob); V.toast('Saved ' + name); });
})(typeof window !== 'undefined' ? window : globalThis);
