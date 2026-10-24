/* Sign-in page, left side: a ~6.5 s four-scene story (documents spiral into one workspace > KPI cards and progress > connected delivery stages > organised, ready handover).
   Replaces the old static module cards (V.isoLogin). Everything lives in one isolated, fixed-size stage: transform/opacity animations only, no layout changes outside it.
   The resting (final) state is plain CSS, so reduced-motion, a re-render, or a failed animation still shows the finished picture. Values are illustrative, never customer data.
   Stage order follows the configured delivery sequence (see STAGES in treeintro.js / roadmap). */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const DOCS = ['Workshop notes', 'Project plan', 'Requirements', 'BRD', 'Status reports', 'User guides'];
  const STAGES = ['Kick-off', 'Workshops', 'Requirements', 'BRD & sign-off', 'Configuration', 'FTR & KPI', 'UAT & defects', 'Training & guides', 'Go-live readiness', 'Hypercare', 'Handover', 'Closure'];
  const KPIS = [['Delivery progress', 'b', 'p1'], ['Pending activities', 't', 'p2'], ['Go-live readiness', 'k', 'p3']];
  const CAPS = ['Everything in one workspace', 'Progress you can see', 'Every stage connected', 'Ready for go-live and handover'];
  let firstAt = 0;
  V.isoLogin = () => {
    const now = Date.now(); if (!firstAt) firstAt = now; const run = now - firstAt < 7500;   // play once per page view; a later re-render shows the finished picture
    const plat = V._isoPlatform ? V._isoPlatform() : '';
    return `<div class="av-iso"><div class="ls${run ? ' run' : ''}" role="img" aria-label="Delivery Studio brings documents, progress and the twelve delivery stages into one workspace, from kick-off to handover. Illustrative.">
      <div class="ls-kpis">${KPIS.map(k => `<div class="ls-k ${k[1]}"><span>${k[0]}</span><i class="ls-bar ${k[2]}"></i><em></em></div>`).join('')}</div>
      <div class="ls-plat">${plat}<b class="ls-ready">Ready for handover</b></div>
      <div class="ls-docs">${DOCS.map(d => `<div class="ls-d"><u></u><span>${d}</span><s></s><s></s></div>`).join('')}</div>
      <div class="ls-trk"><i></i></div><div class="ls-nodes">${STAGES.map((s, i) => `<div class="ls-n" title="${i + 1}. ${s}"><b>${i + 1}</b></div>`).join('')}<div class="ls-act"></div></div>
      <div class="ls-nls">${STAGES.map((s) => `<div class="ls-nl">${s}</div>`).join('')}</div>
      <div class="ls-caps">${CAPS.map(c => `<span>${c}</span>`).join('')}</div><small class="ls-ill">Illustrative</small></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
