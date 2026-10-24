/* Product roadmap introduction: a short animated story shown right after sign-in (before the home page). Conceptual only: it never reads or shows project data.
   V.roadmap({ replay }) resolves when the person skips, finishes or continues. Persistence: "Don't show again" is a per-browser flag (localStorage);
   otherwise it appears after each fresh sign-in, never on refresh, and can be replayed from the account menu and the projects page. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews; const F = root.FWB; const esc = F.esc;
  const OFF = 'fwb_roadmap_off', SEEN = 'fwb_roadmap_seen';
  const get = (st, k) => { try { return root[st].getItem(k); } catch (e) { return null; } };
  const set = (st, k, v) => { try { root[st].setItem(k, v); } catch (e) { } };
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const automated = () => !!(root.navigator && root.navigator.webdriver) && !/[?&]roadmap=1\b/.test(root.location.search + root.location.hash);
  // should the roadmap run after this sign-in?
  V.roadmapDue = function (opts) {
    if (automated()) return false; if (get('localStorage', OFF) === '1') return false;
    if (opts && opts.once && get('sessionStorage', SEEN) === '1') return false; return true;
  };
  const isClient = () => !!(F.S && F.S.user && F.S.user.kind === 'customer');
  const waitIntro = () => new Promise(res => { (function f() { if (!doc.querySelector('.cn')) res(); else setTimeout(f, 200); })(); });
  V.roadmap = async function (opts) {
    opts = opts || {}; await waitIntro();
    const cl = isClient(); const u = F.S && F.S.user; const nm = u && u.name && !u.guest ? u.name : '';
    const r = await V.cinema({ aud: cl ? 'customer' : 'team', name: nm, off: true, cta: cl ? 'Continue to your project' : 'Continue to Workspace' });
    if (r.off) set('localStorage', OFF, '1'); set('sessionStorage', SEEN, '1'); return r.how;
  };
  // replay on request (ignores the "don't show again" flag)
  V.ACT.replayRoadmap = async () => { const p = doc.getElementById('userPop'); if (p) p.remove(); await V.roadmap({ replay: true }); };
})(typeof window !== 'undefined' ? window : globalThis);
