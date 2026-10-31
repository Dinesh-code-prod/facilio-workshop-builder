/* Facilio Demo Kit browser (team): every page in the CMMS Demo Kit (sign-in, CMMS, mobile, Atom, FM Assistant, Help desk, Vibe) in one searchable list,
   each opening in the kit itself in a new tab so a requirement session can show the real page in full. Pages we hold a picture of can also be saved as a PNG here;
   the kit's own viewer has a PNG button for every page. The kit needs Facilio sign-in in this browser; nothing from it is copied. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const KIT = () => root.FWBKitIndex || { base: '', sections: [], items: [] };
  const DK = () => root.FWBDemoKit || { screens: [] };
  const pic = label => DK().screens.find(x => x[0] === label && x[5]);
  const tab = () => { const k = KIT(); const t = S.ui.dkTab; return k.sections.some(s => s[0] === t) ? t : (V.isAgentProject && V.isAgentProject() ? 'fma' : 'cmms'); };
  const link = (id) => KIT().base + id;
  V.demokit = {
    html() {
      const k = KIT(); const t = tab(); const q = String(S.ui.dkQ || '').trim().toLowerCase(); const all = k.items;
      const inTab = all.filter(x => x[0] === t); const shown = (q ? all : inTab).filter(x => !q || x[1].toLowerCase().includes(q) || x[2].toLowerCase().includes(q));
      const head = `<div class="page-header"><div class="t"><h1>Facilio Demo Kit</h1><p>Every page of the Facilio demo kit, to open in full during a requirement session: how a portfolio, a work order, the mobile app and the sign-in look. Each page opens in the kit in a new tab.</p></div><div class="row"><a class="btn primary" href="${esc(k.base.replace(/#$/, ''))}" target="_blank" rel="noopener noreferrer">Open the full kit in a new tab</a><button class="btn" data-act="tpStart" data-ci="0">Play the guided tour</button></div></div>`;
      const tabs = `<div class="tabs" role="tablist">${k.sections.map(([id, l]) => `<button class="tab${!q && t === id ? ' active' : ''}" role="tab" data-act="dkTab" data-v="${id}">${esc(l)}<span class="cnt">${all.filter(x => x[0] === id).length}</span></button>`).join('')}</div>`;
      const card = x => { const p = pic(x[1]); const sec = (k.sections.find(s => s[0] === x[0]) || [])[1] || '';
        return `<article class="dk-card">${p ? `<img class="dk-th" loading="lazy" alt="" src="demokit/${esc(p[5])}">` : '<div class="dk-th none" aria-hidden="true"></div>'}<div class="dk-b"><small>${esc(sec)}</small><b>${esc(x[1])}</b><div class="dk-a"><a class="btn sm primary" href="${esc(link(x[2]))}" target="_blank" rel="noopener noreferrer">Open in new tab</a>${p ? `<button class="btn sm" data-act="dkPng" data-l="${esc(x[1])}">Save PNG</button>` : ''}</div></div></article>`; };
      return head + `<div class="page-body"><div class="notice"><span>These open in the Comet demo kit, so you need to be signed in to Facilio in this browser. The kit's own page has a <b>PNG</b> button and a <b>Copy URL</b> button for every page. Screens shown with a picture here can also be saved as PNG without opening the kit.</span></div>
        <div class="row" style="margin:12px 0"><div class="tl-search" style="flex:1;max-width:420px">${V.ico('search')}<input type="search" id="dkQ" placeholder="Search all ${all.length} pages" aria-label="Search the demo kit" value="${esc(S.ui.dkQ || '')}"></div><span class="xs muted">${shown.length} page${shown.length === 1 ? '' : 's'}${q ? ' across the whole kit' : ''}</span></div>
        ${q ? '' : tabs}${shown.length ? `<div class="dk-grid">${shown.map(card).join('')}</div>` : (V.ui ? V.ui.noResults('pages', 'dkClear') : '<div class="empty">No page matches.</div>')}</div>`;
    },
    mount() { const i = document.getElementById('dkQ'); if (i) i.addEventListener('input', () => { S.ui.dkQ = i.value; const p = i.selectionStart; V.render(); const n = document.getElementById('dkQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } }); }
  };
  ACT.dkTab = a => { S.ui.dkTab = a.getAttribute('data-v'); S.ui.dkQ = ''; V.render(); };
  ACT.dkClear = () => { S.ui.dkQ = ''; V.render(); };
  // save a picture we hold as a PNG file
  ACT.dkPng = a => V.busy(a, async () => { const x = pic(a.getAttribute('data-l')); if (!x) return;
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); let im; try { im = await load('demokit/hd/' + x[5]); } catch (e) { im = await load('demokit/' + x[5]); }
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const name = 'facilio-' + String(x[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png'; V.download(name, blob); V.toast('Saved ' + name); });
})(typeof window !== 'undefined' ? window : globalThis);
