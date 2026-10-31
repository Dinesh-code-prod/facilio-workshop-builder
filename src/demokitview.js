/* Facilio screens (team): the real Facilio screens we hold pictures of, kept inside Delivery Studio, for requirement sessions: how a work order, an asset,
   planned maintenance, quotes and invoices, field service, reports, setup and the mobile app look. Search, open full size, save as PNG, or play the guided tour.
   Everything here is stored in this app (public/demokit); nothing opens or depends on another site. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const DK = () => root.FWBDemoKit || { screens: [] };
  const all = () => DK().screens.map((x, i) => [x, i]).filter(([x]) => x[5]);
  const groups = () => (V.sfGroups || []).map(g => ({ g, items: all().filter(([x]) => g.has(x)) })).filter(c => c.items.length);
  const tabId = () => { const g = groups(); const t = Number(S.ui.dkTab); return t >= 0 && t < g.length ? t : 0; };
  V.demokit = {
    html() {
      const gs = groups(); const t = tabId(); const q = String(S.ui.dkQ || '').trim().toLowerCase(); const total = all().length;
      const shown = q ? all().filter(([x]) => (x[0] + ' ' + x[1] + ' ' + x[3]).toLowerCase().includes(q)) : ((gs[t] || { items: [] }).items);
      const head = `<div class="page-header"><div class="t"><h1>Facilio screens</h1><p>The real Facilio screens, kept here for requirement sessions: how a work order, an asset, planned maintenance, quotes, field service, reports, setup and the mobile app look. Open one full size, save it as a picture, or play the guided tour.</p></div><div class="row"><button class="btn primary" data-act="tpStart" data-ci="0">&#9654; Play the guided tour</button></div></div>`;
      const tabs = `<div class="tabs" role="tablist">${gs.map((c, i) => `<button class="tab${!q && t === i ? ' active' : ''}" role="tab" data-act="dkTab" data-v="${i}">${esc(c.g.title)}<span class="cnt">${c.items.length}</span></button>`).join('')}</div>`;
      const card = ([x, i]) => `<article class="dk-card"><button type="button" class="dk-open" data-act="sfView" data-i="${i}" aria-label="Open ${esc(x[0])} full size"><img class="dk-th" loading="lazy" alt="" src="demokit/${esc(x[5])}"></button><div class="dk-b"><small>${esc(x[1])}</small><b>${esc(x[0])}</b><span class="dk-d">${esc(x[3])}</span><div class="dk-a"><button class="btn sm primary" data-act="sfView" data-i="${i}">View full size</button><button class="btn sm" data-act="dkPng" data-i="${i}">Save PNG</button></div></div></article>`;
      return head + `<div class="page-body"><div class="row" style="margin:0 0 12px"><div class="tl-search" style="flex:1;max-width:420px">${V.ico('search')}<input type="search" id="dkQ" placeholder="Search ${total} screens" aria-label="Search the screens" value="${esc(S.ui.dkQ || '')}"></div><span class="xs muted">${shown.length} screen${shown.length === 1 ? '' : 's'}${q ? ' found' : ''}</span></div>
        ${q ? '' : tabs}${shown.length ? `<div class="dk-grid">${shown.map(card).join('')}</div>` : (V.ui ? V.ui.noResults('screens', 'dkClear') : '<div class="empty">No screen matches.</div>')}</div>`;
    },
    mount() { const i = document.getElementById('dkQ'); if (i) i.addEventListener('input', () => { S.ui.dkQ = i.value; const p = i.selectionStart; V.render(); const n = document.getElementById('dkQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } }); }
  };
  ACT.dkTab = a => { S.ui.dkTab = a.getAttribute('data-v'); S.ui.dkQ = ''; V.render(); };
  ACT.dkClear = () => { S.ui.dkQ = ''; V.render(); };
  // save a picture we hold as a PNG file
  ACT.dkPng = a => V.busy(a, async () => { const x = DK().screens[Number(a.getAttribute('data-i'))]; if (!x || !x[5]) return;
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); let im; try { im = await load('demokit/hd/' + x[5]); } catch (e) { im = await load('demokit/' + x[5]); }
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const name = 'facilio-' + String(x[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png'; V.download(name, blob); V.toast('Saved ' + name); });
})(typeof window !== 'undefined' ? window : globalThis);
