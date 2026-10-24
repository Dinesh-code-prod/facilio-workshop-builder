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
  // After the story settles, the stage keeps moving: a loop of short "AI assist" scenes (each ~5 s) alternates with the finished deliverables view.
  const AI = [
    ['Workshop discussions into requirements', `<div class="ai-c ai-tx"><i></i><i></i><i></i><i></i><b class="ai-sw"></b></div><div class="ai-ar"><b></b></div><div class="ai-ch c1"><u></u>Requirement</div><div class="ai-ch c2"><u></u>Use case</div><div class="ai-ch c3"><u></u>Action item</div>`],
    ['A BRD draft, ready for your review', `<div class="ai-c ai-bd"><i></i><i></i><i></i><i></i><i></i></div><div class="ai-ch d1"><u></u>Draft generated</div><div class="ai-ch d2"><u></u>Awaiting your review</div><div class="ai-ch d3"><u></u>Approved</div>`],
    ['Risks and pending actions flagged early', `<div class="ai-rw r1"><b></b>Key user availability</div><div class="ai-rw r2"><b></b>Pending: confirm sites</div><div class="ai-rw r3"><b></b>Import needed before UAT</div><div class="ai-ch f1"><u></u>3 items need attention</div>`],
    ['User guides drafted from walkthroughs', `<div class="ai-st"><i></i><b>1</b><span>Capture</span></div><div class="ai-st"><i></i><b>2</b><span>Draft steps</span></div><div class="ai-st"><i></i><b>3</b><span>Review</span></div><div class="ai-st"><i></i><b>4</b><span>Publish</span></div>`]
  ];
  const doc = root.document, reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let firstAt = 0, step = -1, timer = 0;
  function tick() {
    const el = doc.querySelector('.ls'); if (!el) { timer = 0; return; }
    if (!doc.hidden) { step = (step + 1) % 5; el.classList.add('live'); el.setAttribute('data-s', step); }
    timer = root.setTimeout(tick, step === 0 ? 4200 : 5200);
  }
  function start(delay) { if (timer || reduce()) return; timer = root.setTimeout(tick, delay); }
  V.isoLogin = () => {
    const now = Date.now(); if (!firstAt) firstAt = now; const run = now - firstAt < 7500;   // play once per page view; a later re-render shows the finished picture
    const plat = V._isoPlatform ? V._isoPlatform() : '';
    start(run ? 8200 : 1500);
    return `<div class="av-iso"><div class="ls${run ? ' run' : ''}" role="img" aria-label="Delivery Studio brings documents, progress and the twelve delivery stages into one workspace, from kick-off to handover, with AI assistance drafting requirements, BRDs, risk flags and user guides for review. Illustrative.">
      <div class="ls-kpis">${KPIS.map(k => `<div class="ls-k ${k[1]}"><span>${k[0]}</span><i class="ls-bar ${k[2]}"></i><em></em></div>`).join('')}</div>
      <div class="ls-plat">${plat}<b class="ls-ready">Ready for handover</b></div>
      <div class="ls-docs">${DOCS.map(d => `<div class="ls-d"><u></u><span>${d}</span><s></s><s></s></div>`).join('')}</div>
      <div class="ls-trk"><i></i></div><div class="ls-nodes">${STAGES.map((s, i) => `<div class="ls-n" title="${i + 1}. ${s}"><b>${i + 1}</b></div>`).join('')}<div class="ls-act"></div></div>
      <div class="ls-nls">${STAGES.map((s) => `<div class="ls-nl">${s}</div>`).join('')}</div>
      <div class="ls-caps">${CAPS.map(c => `<span>${c}</span>`).join('')}</div><div class="ls-ai" aria-hidden="true"><span class="ai-t">AI assist</span>${AI.map(a => `<div class="ai-s">${a[1]}</div>`).join('')}</div>
      <div class="ls-aicap" aria-hidden="true">${AI.map(a => `<span>${a[0]}</span>`).join('')}</div><i class="ls-pulse" aria-hidden="true"></i><b class="ls-aib" aria-hidden="true">AI</b><small class="ls-ill">Illustrative</small></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
