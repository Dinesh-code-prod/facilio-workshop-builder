/* Workshops & Requirements hubs (team only). The menu used to list five pages that overlapped: Transcripts & Requirement Confirmation, Use Cases,
   Checks & Validations, MSA Scope Check and Facilio Screens. They are now three, in the order the work runs:
     Facilio Screens (run the sessions) > Requirements & Use Cases (capture and confirm) > Checks & Validations (check before design).
   "Requirements & Use Cases" holds the transcripts, requirements and use cases pages as two tabs; "Checks & Validations" holds the validation page and the
   MSA scope check as two tabs. Each tab shows the existing page unchanged (the same way as the Project Overview hub), so nothing was rewritten.
   Old links (#/p/<id>/usecases, #/p/<id>/msafind, buttons that go to those pages) land in the right tab through V.hubRoute. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews; const ACT = V.ACT;
  const HUBS = [
    { view: 'transcripts', key: 'reqTab', tabs: [['transcripts', 'Transcripts & requirements'], ['usecases', 'Use cases']] },
    { view: 'checks', key: 'chkHub', tabs: [['checks', 'Validations & readiness'], ['msafind', 'MSA scope check']] }
  ];
  const base = {}; HUBS.forEach(h => h.tabs.forEach(([k]) => { base[k] = V[k]; }));
  const hubOf = view => HUBS.find(h => h.tabs.some(t => t[0] === view));
  const prev = V.hubRoute;
  V.hubRoute = view => { const r = prev ? prev(view) : view; const h = S.user && S.user.kind !== 'customer' && hubOf(r); if (!h || !base[r]) return r; S.ui[h.key] = r; return h.view; };
  const badge = k => { const n = k !== 'checks' && V.navCounts && V.navCounts()[k]; return n && n.n ? `<span class="cnt">${n.n}</span>` : ''; };
  HUBS.forEach(h => {
    const cur = () => (base[S.ui[h.key]] && h.tabs.some(t => t[0] === S.ui[h.key]) ? S.ui[h.key] : h.view);
    V[h.view] = {
      html() {
        const t = cur(); const bar = `<div class="tabs hub-tabs" role="tablist" aria-label="${h.view === 'checks' ? 'Checks' : 'Requirements'}" style="margin-bottom:14px">${h.tabs.filter(([k]) => base[k]).map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="hubTab" data-key="${h.key}" data-v="${k}">${l}${badge(k)}</button>`).join('')}</div>`;
        const html = base[t].html(); const at = ['<div class="tabs"', '<div class="page-body">'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];   // the hub tabs sit above the page's own tabs
        return at === undefined ? bar + html : html.slice(0, at) + bar + html.slice(at);
      },
      mount() { const b = base[cur()]; if (b && b.mount) b.mount(); }
    };
  });
  ACT.hubTab = a => { S.ui[a.getAttribute('data-key')] = a.getAttribute('data-v'); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
