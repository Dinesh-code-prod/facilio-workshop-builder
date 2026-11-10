/* Page hubs (team only). Overlapping pages became hubs in the 3 Nov 2026 menu restructure; each tab shows an existing page unchanged, so nothing was rewritten:
     Requirements (transcripts, use cases) · Contract (agreement, MSA scope check, terms & integrations) · Reports & quality (status reports, traceability) ·
     Configuration & org package (the Configuration Hub, the package analysis, the org package export).
   Each tab shows the existing page unchanged (the same way as the Project Overview hub), so nothing was rewritten.
   Old links (#/p/<id>/usecases, #/p/<id>/msafind, buttons that go to those pages) land in the right tab through V.hubRoute. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews; const ACT = V.ACT;
  const HUBS = [
    { view: 'transcripts', key: 'reqTab', label: 'Requirements', tabs: [['transcripts', 'Transcripts & requirements'], ['prepq', 'Prepare questions'], ['usecases', 'Use cases']] },
    { view: 'msaflow', key: 'ctrHub', label: 'Contract', tabs: [['msaflow', 'Agreement'], ['msafind', 'Scope check'], ['contracts', 'Terms & integrations']] },
    { view: 'statusrep', key: 'rptHub', label: 'Status report (WSR) & monthly report', tabs: [['statusrep', 'Status report (WSR) & monthly report'], ['trace', 'Traceability & quality']] },
    { view: 'cfginputs', key: 'cfgHub', label: 'Configuration and org package', tabs: [['cfginputs', 'Configuration Hub'], ['pkgan', 'Analysis'], ['orgpkg', 'Export']] }
  ];
  const base = {}; HUBS.forEach(h => h.tabs.forEach(([k]) => { base[k] = V[k]; }));
  const hubOf = view => HUBS.find(h => h.tabs.some(t => t[0] === view));
  const prev = V.hubRoute;
  V.hubRoute = view => { const r0 = prev ? prev(view) : view; const r = r0 === 'reports' ? 'statusrep' : r0; if (V.featureHidden && V.featureHidden(r)) return 'solution'; /* a link to a hidden page lands on Solution */ const h = S.user && S.user.kind !== 'customer' && hubOf(r); if (!h || !base[r] || r === 'onboarding') return r; S.ui[h.key] = r; return h.view; };   // Data onboarding has its own menu entry, so it is not a tab of the hub
  const badge = k => { const n = k !== 'checks' && V.navCounts && V.navCounts()[k]; return n && n.n ? `<span class="cnt">${n.n}</span>` : ''; };
  HUBS.forEach(h => {
    const cur = () => (base[S.ui[h.key]] && h.tabs.some(t => t[0] === S.ui[h.key]) ? S.ui[h.key] : h.view);
    V[h.view] = {
      html() {
        const t = cur(); if (t === 'onboarding' && /ob-focus-page/.test(base[t].html())) return base[t].html();   // the sheet in its own tab has no tabs above it
         const bar = `<div class="tabs hub-tabs" role="tablist" aria-label="${h.label}" style="margin-bottom:14px">${h.tabs.filter(([k]) => base[k] && !(V.featureHidden && V.featureHidden(k))).map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="hubTab" data-key="${h.key}" data-v="${k}">${l}${badge(k)}</button>`).join('')}</div>`;
        const html = base[t].html(); const at = ['<div class="tabs"', '<div class="page-body">'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];   // the hub tabs sit above the page's own tabs
        return at === undefined ? bar + html : html.slice(0, at) + bar + html.slice(at);
      },
      mount() { const b = base[cur()]; if (b && b.mount) b.mount(); }
    };
  });
  ACT.hubTab = a => { S.ui[a.getAttribute('data-key')] = a.getAttribute('data-v'); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
