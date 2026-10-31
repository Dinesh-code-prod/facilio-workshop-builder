/* Module guides: the standard Facilio guide for each business module (work orders, service requests, field service, preventive maintenance, assets,
   inspections, vendors, inventory, budgets), ported from the Facilio Workshop Hub and kept in src/guidelib.js. Each guide has screens, an overview, a
   worked scenario, the standard process, short video clips, the standard fields, the questions we will ask and a preparation checklist.
   The Customer User Guide only shows these once a consultant has published a guide for the project; this page shows the same standard guides to
   the team and to customers at any time, with no project data, using the existing renderer in src/guidelearn.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  V.learnlib = {
    html() {
      const L = root.FWBLearn; if (!L || !V.learn) return '<div class="page-body"><div class="card empty"><h3>Module guides are not available</h3></div></div>';
      const mods = L.MODS; const cur = S.ui.llMod && L.BY[S.ui.llMod] ? S.ui.llMod : mods[0].key; const lm = L.BY[cur];
      const groups = [...new Set(mods.map(m => m.group))];
      const nav = groups.map(g => `<div class="wb-cap">${esc(g)}</div>${mods.filter(m => m.group === g).map(m => `<button class="wb-mod${cur === m.key ? ' on' : ''}" data-act="llMod" data-m="${esc(m.key)}"${cur === m.key ? ' aria-current="page"' : ''}><span>${esc(m.name)}</span></button>`).join('')}`).join('');
      const who = (S.project && S.project.customer) || 'your team';
      return `<div class="page-header"><div class="t"><h1>Module guides</h1><p>${cust() ? `The standard Facilio guide for each module ${esc(who)} will use: what it looks like, how it works, short videos and what to prepare. Read the ones that match your next session.` : 'The standard Facilio guides, the same for every customer. The customer sees this page at any time; their project guide is published separately.'}</p></div></div>
        <div class="page-body"><div class="wb wb-side"><nav class="wb-nav" aria-label="Module guides">${nav}</nav><div class="wb-body" id="wbBody"><h2 style="margin-bottom:10px">${esc(lm.name)}</h2>${V.learn.top(lm)}${V.learn.before(lm)}${V.learn.after(lm)}</div></div></div>`;
    },
    mount() { if (V.learn && V.learn.mount) V.learn.mount(); }
  };
  ACT.llMod = a => { S.ui.llMod = a.getAttribute('data-m'); V.render(); const b = document.getElementById('wbBody'); if (b) b.scrollTop = 0; const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
})(typeof window !== 'undefined' ? window : globalThis);
