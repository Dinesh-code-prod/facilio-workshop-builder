/* Project Overview hub (team only): the five pages that all answered "where are we?" now sit under one menu item as tabs: Overview, Delivery
   lifecycle, Roadmap, Plan vs actual and Reports. Each tab shows the existing page unchanged, so nothing was rewritten. Old links to the four
   pages (buttons, bookmarks, #/p/<id>/proadmap) still work: shell.js go() sends them here with the right tab open. Customers are unaffected. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews; const ACT = V.ACT;
  // the old Overview tab repeated the Dashboard and is hidden (user, 25 Nov 2026); the hub, opened from the menu's Project cycle, starts on Stages.
  // Stages and Roadmap showed the same records, so the roadmap's checkpoints and counts are inside Stages; Plan vs actual lives in
  // Project introduction > Project plan > Timeline & planning (user, 24 Nov 2026). Old links: proadmap opens Stages, timeline opens that plan tab.
  const TABS = [['lifecycle', 'Stages'], ['dashreport', 'Report pack']];
  const MOVED = { proadmap: 'lifecycle' };
  const base = {}; TABS.forEach(([k]) => { base[k] = V[k]; });
  const cur = () => (base[S.ui.ovTab] ? S.ui.ovTab : 'lifecycle');
  V.hubRoute = view => { const team = S.user && S.user.kind !== 'customer'; if (team && MOVED[view]) view = MOVED[view]; if (team && view === 'timeline') { S.ui.introTab = 'plan'; S.ui.planTab = 'tl'; return 'intro'; } if (team && base[view]) { S.ui.ovTab = view; return 'overview'; } if (view === 'overview') S.ui.ovTab = S.ui.ovTab && base[S.ui.ovTab] ? S.ui.ovTab : 'lifecycle'; return view; };
  V.overview = {
    html() {
      const t = cur(); const tabs = `<div class="tabs" role="tablist" style="margin-bottom:14px">${TABS.filter(([k]) => base[k]).map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="ovTab" data-v="${k}">${l}</button>`).join('')}</div>`;
      const h = base[t].html(); const mark = '<div class="page-body">';
      return h.includes(mark) ? h.replace(mark, mark + tabs) : tabs + h;
    },
    mount() { const b = base[cur()]; if (b && b.mount) b.mount(); }
  };
  ACT.ovTab = a => { S.ui.ovTab = a.getAttribute('data-v'); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
