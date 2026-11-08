/* Module guides: the standard Facilio guide for each business module (work orders, service requests, field service, preventive maintenance, assets,
   inspections, vendors, inventory, budgets), ported from the Facilio Workshop Hub and kept in src/guidelib.js. Each guide has screens, an overview, a
   worked scenario, the standard process, short video clips, the standard fields, the questions we will ask and a preparation checklist.
   The Customer User Guide only shows these once a consultant has published a guide for the project; this page shows the same standard guides to
   the team and to customers at any time, with no project data, using the existing renderer in src/guidelearn.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  // one long scroll was hard to read: the sections of a module are grouped into four tabs (each section keeps its id); a section this list does not know goes under Prepare
  const TABS = [['overview', 'Overview', ['gl-brief', 'gl-screens', 'gl-overview', 'gl-walk']], ['process', 'Process and fields', ['gl-process', 'gl-setup', 'gl-fields']], ['videos', 'Videos', ['gl-videos']], ['prepare', 'Prepare and ask', ['gl-questions', 'gl-prepare', 'gl-feedback']]];
  const tabOf = id => (TABS.find(t => t[2].includes(id)) || TABS[3])[0];
  function tabsOf(lm) {
    const parts = (V.learn.before(lm) + V.learn.after(lm)).split(/(?=<section class="gl-sec")/); const by = {}; TABS.forEach(t => { by[t[0]] = []; });
    parts.forEach(p => { const m = p.match(/^<section class="gl-sec" id="([^"]+)"/); by[m ? tabOf(m[1]) : 'overview'].push(p); });   // text before the first section stays with Overview
    const live = TABS.filter(t => by[t[0]].length); const cur = live.some(t => t[0] === S.ui.llTab) ? S.ui.llTab : live[0][0];
    return `<div class="seg" role="tablist" aria-label="Parts of this guide" style="margin:6px 0 16px">${live.map(t => `<button type="button" role="tab" class="${t[0] === cur ? 'on' : ''}" aria-selected="${t[0] === cur}" data-act="llTab" data-v="${t[0]}">${esc(t[1])}</button>`).join('')}</div>${by[cur].join('')}`;
  }
  V.learnlib = {
    html() {
      const L = root.FWBLearn; if (!L || !V.learn) return '<div class="page-body"><div class="card empty"><h3>Module guides are not available</h3></div></div>';
      const mods = L.MODS; const cur = S.ui.llMod && L.BY[S.ui.llMod] ? S.ui.llMod : mods[0].key; const lm = L.BY[cur];
      const groups = [...new Set(mods.map(m => m.group))];
      const nav = groups.map(g => `<div class="wb-cap">${esc(g)}</div>${mods.filter(m => m.group === g).map(m => `<button class="wb-mod${cur === m.key ? ' on' : ''}" data-act="llMod" data-m="${esc(m.key)}"${cur === m.key ? ' aria-current="page"' : ''}><span>${esc(m.name)}</span></button>`).join('')}`).join('');
      const who = (S.project && S.project.customer) || 'your team';
      return `<div class="page-header"><div class="t"><h1>Module guides</h1><p>${cust() ? `The standard Facilio guide for each module ${esc(who)} will use: what it looks like, how it works, short videos and what to prepare. Read the ones that match your next session.` : 'The standard Facilio guides, the same for every customer. The customer sees this page at any time; their project guide is published separately.'}</p></div></div>
        <div class="page-body"><div class="wb wb-side"><nav class="wb-nav" aria-label="Module guides">${nav}</nav><div class="wb-body" id="wbBody"><h2 style="margin-bottom:10px">${esc(lm.name)}</h2>${V.learn.top(lm)}${tabsOf(lm)}</div></div></div>`;
    },
    mount() { if (V.learn && V.learn.mount) V.learn.mount(); }
  };
  ACT.llTab = a => { S.ui.llTab = a.getAttribute('data-v'); V.render(); };
  ACT.llMod = a => { S.ui.llMod = a.getAttribute('data-m'); V.render(); const b = document.getElementById('wbBody'); if (b) b.scrollTop = 0; const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
})(typeof window !== 'undefined' ? window : globalThis);
