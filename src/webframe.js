/* Facilio tools (roadmap E13): Support Desk, Meteor, Comet, facilio.com and the Facilio Run directory shown INSIDE Delivery Studio, one tab each.
   The allow-list is src/webframelogic.js (it also decides the hosts in the page policy). No project data is sent to these sites; the person signs in there.
   A frame that the site refuses (X-Frame-Options, sign-in pages, blocked third-party cookies) cannot be detected from the page, so "Open in a new tab" is always visible
   and a short hint appears after 6 seconds. Two menu entries share this page: "Support Desk" (view supportdesk, opens on that tab) and "Facilio tools" (view webframe). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const W = root.FWBWebFrame;
  const HELP_MS = 6000; let timer = 0;
  const current = view => (view === 'supportdesk' ? W.siteById('support-desk') : W.siteById(S.ui.wfSite)) || W.SITES[0];

  function page(view) {
    const site = current(view);
    const tabs = `<div class="tabs wf-tabs" role="tablist" aria-label="Facilio tools">${W.SITES.map(s => `<button class="tab${s.id === site.id ? ' active' : ''}" role="tab" aria-selected="${s.id === site.id}" data-act="wfTab" data-v="${esc(s.id)}">${esc(s.title)}</button>`).join('')}</div>`;
    const ok = W.isAllowed(site.url);
    const bar = `<div class="wf-bar"><b class="wf-title">${esc(site.title)}</b><span class="wf-note">${esc(site.note)}</span><span class="wf-actions"><button type="button" class="btn" data-act="wfReload">Reload</button><a class="btn primary" href="${esc(site.url)}" target="_blank" rel="noopener noreferrer">Open in a new tab</a></span></div>`;
    const frame = ok
      ? `<iframe id="wfFrame" class="wf-frame" title="${esc(site.title)}" src="${esc(site.url)}" data-site="${esc(site.id)}" data-view="${esc(view)}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" allow=""></iframe>`
      : '<div class="notice err">This address is not on the allowed list, so it is not shown here.</div>';
    return `<div class="page-header"><div class="t"><h1>${view === 'supportdesk' ? 'Support Desk' : 'Facilio tools'}</h1><p>Facilio sites shown inside Delivery Studio. Nothing from your project is sent to them.</p></div></div>
      <div class="page-body wf">${tabs}${bar}<p class="wf-help" id="wfHelp" role="status" hidden>If the page stays blank, this site does not allow being shown inside Delivery Studio. Use Open in a new tab.</p>${frame}</div>`;
  }
  function mount() { clearTimeout(timer); timer = setTimeout(() => { const h = document.getElementById('wfHelp'); if (h) h.hidden = false; }, HELP_MS); }
  const view = name => ({ html: () => page(name), mount });
  V.webframe = view('webframe'); V.supportdesk = view('supportdesk');

  // the shell rebuilds the whole page on every render, which would reload the frame; the shell skips that while the same site is open (see render in shell.js)
  V.wfKeep = () => { const f = document.getElementById('wfFrame'); return !!f && f.getAttribute('data-view') === S.ui.view && f.getAttribute('data-site') === current(S.ui.view).id; };
  ACT.wfTab = a => { const id = a.getAttribute('data-v'); if (S.ui.view === 'supportdesk') V.go('webframe', { wfSite: id }); else { S.ui.wfSite = id; V.render(); } };
  ACT.wfReload = () => { const f = document.getElementById('wfFrame'); if (!f) return; f.src = f.getAttribute('src'); const h = document.getElementById('wfHelp'); if (h) h.hidden = true; mount(); };
})(typeof window !== 'undefined' ? window : globalThis);
