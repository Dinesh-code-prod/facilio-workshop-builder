/* Go-live & hypercare (team only): one menu entry in Tasks & mail with two sub-tabs, each showing an existing page unchanged:
   Go-live (view golive, src/golive.js) and Hypercare (view hypercare, src/lifecycle.js). Hypercare issues are tasks of the type "Hypercare Issue", so they are logged, owned, reminded and tracked like every other task.
   Old links (#/p/<id>/golive, /hypercare and every button that goes there) land in the right tab through V.hubRoute. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !V) return; const { S } = F;
  const TABS = [['golive', 'Go-live'], ['hypercare', 'Hypercare']];
  const is = k => TABS.some(t => t[0] === k);
  const cur = () => (is(S.ui.glhTab) ? S.ui.glhTab : 'golive');
  const team = () => !!S.user && S.user.kind !== 'customer';
  const prev = V.hubRoute;
  V.hubRoute = view => { const r = prev ? prev(view) : view; if (team() && is(r)) { S.ui.glhTab = r; return 'golivehc'; } return r; };
  V.golivehc = {
    html() {
      const t = cur(), b = V[t]; if (!b || !b.html) return '';
      const tabs = `<div class="tabs hub-tabs" role="tablist" aria-label="Go-live and hypercare" style="margin-bottom:14px">${TABS.map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="hubTab" data-key="glhTab" data-v="${k}">${l}</button>`).join('')}</div>`;
      const html = b.html(); const at = ['<div class="tabs"', '<div class="page-body'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];
      return at === undefined ? tabs + html : html.slice(0, at) + tabs + html.slice(at);
    },
    mount() { const b = V[cur()]; if (b && b.mount) b.mount(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
