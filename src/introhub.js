/* Project introduction hub (team only): one menu entry under Contract intake with three sub-tabs, each showing an existing page unchanged:
   Kick-off and agreed scope (view kickoff, src/kickoff.js) · Project plan (view plan, src/plan.js) · Requirement schedule (view rsplan, the workshop plan, src/requirements.js).
   Old links (#/p/<id>/kickoff, /plan, /rsplan and every button that goes there) land in the right tab through V.hubRoute. Customers keep their own pages.
   The pages are read when the hub draws, so it does not matter in which order the files load. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews;
  const TABS = [['kickoff', 'Kick-off and agreed scope'], ['plan', 'Project plan'], ['rsplan', 'Requirement schedule']];
  const is = k => TABS.some(t => t[0] === k);
  const cur = () => (is(S.ui.introTab) ? S.ui.introTab : 'kickoff');
  const team = () => !!S.user && S.user.kind !== 'customer';
  const prev = V.hubRoute;
  V.hubRoute = view => { const r = prev ? prev(view) : view; if (team() && is(r)) { S.ui.introTab = r; return 'intro'; } return r; };
  V.intro = {
    html() {
      const t = cur(), b = V[t]; if (!b || !b.html) return '';
      const bar = `<div class="tabs hub-tabs" role="tablist" aria-label="Project introduction" style="margin-bottom:14px">${TABS.map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="hubTab" data-key="introTab" data-v="${k}">${l}</button>`).join('')}</div>`;
      const html = b.html(); const at = ['<div class="tabs"', '<div class="page-body'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];
      return at === undefined ? bar + html : html.slice(0, at) + bar + html.slice(at);
    },
    mount() { const b = V[cur()]; if (b && b.mount) b.mount(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
