// Project pages only: marks the body with the stage of the open page (colours in src/projfx.css) and plays one short entrance when the page or its tab changes
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  // rail entry -> stage key; each stage has its own colour pair in projfx.css
  const STAGE = { msaintake: 's1', rsquestions: 's2', solution: 's3', ftr: 's4', guides: 's5', tasks: 's6', handover: 's7', projdash: 'home', statusrep: 'rep', resources: 'notes', seefacilio: 'show', teamhelp: 'help', claudesetup: 'claude', settings: 'set' };
  let last = '', timer = 0, fxT = 0;
  function patch() {
    const b = d.body; if (!b) return;
    const m = /^#\/p\/[^/]+\/([^/?]+)/.exec(location.hash); const inProj = !!m && !!d.querySelector('.main');
    b.classList.toggle('in-proj', inProj); if (!inProj) { b.removeAttribute('data-stage'); last = ''; return; }
    d.querySelectorAll('nav.sidebar .rl-b:not([data-stage])').forEach(x => x.setAttribute('data-stage', STAGE[x.getAttribute('data-view')] || 'help'));
    // the open rail entry gives the stage; on a phone the rail is folded away, so the page name is looked up in the lifecycle stages instead
    const act = d.querySelector('nav.sidebar .rl-b.active'), L = root.FWBLife, ST7 = { intro: 's1', sessions: 's2', design: 's3', uat: 's4', training: 's5', hypercare: 's7', handover: 's7' };
    const byView = () => { const lv = L && L.STAGES && L.STAGES.find(x => x.views.includes(m[1])); return STAGE[m[1]] || (lv && ST7[lv.k]) || 'home'; };
    const st = act ? act.getAttribute('data-stage') : byView();
    if (b.getAttribute('data-stage') !== st) b.setAttribute('data-stage', st);
    // entrance only when the page or its selected tab changes, never on a re-render after a tick or a save
    const tab = d.querySelector('.main [role="tab"][aria-selected="true"], .main .seg > button.on, .main .tabs > .on, .main .tabs > .active');
    const key = location.hash.split('?')[0] + '|' + (tab ? tab.textContent.trim().slice(0, 40) : '');
    if (key === last) return; const samePage = last.split('|')[0] === key.split('|')[0]; last = key;
    const el = samePage ? d.querySelector('.main [role="tabpanel"]') || d.querySelector('.main .page-body') : d.querySelector('.main .page') || d.querySelector('.main');
    if (!el || root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.remove('fx-in'); void el.offsetWidth; el.classList.add('fx-in'); clearTimeout(fxT); fxT = setTimeout(() => el.classList.remove('fx-in'), 900);
  }
  const later = () => { if (!timer) timer = setTimeout(() => { timer = 0; patch(); }, 30); };   // throttled, not debounced: a page that keeps changing still gets patched
  function start() { patch(); new MutationObserver(later).observe(d.body, { childList: true, subtree: true }); root.addEventListener('hashchange', later); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
