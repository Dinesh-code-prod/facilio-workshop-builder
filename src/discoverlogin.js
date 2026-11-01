/* "Discover more with Facilio" on the sign-in pages: a full-screen scroll story in Facilio's art style (same kit as the Discover more tab, src/explore.js).
   Hero, the pinned platform stage with real screens, one chapter per solution area, and a sign-in prompt. Static content only: no project data, no API
   calls, no sign-in bypass. Close with the button or Esc; #/discover opens it directly. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {}; const ACT = V.ACT = V.ACT || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const words = id => String(id).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  const MOTIF = { visitors: 'person', community: 'cards', safety: 'lock', workplace: 'desks', energy: 'gauge', finance: 'coins', maintenance: 'route', workforce: 'clock', contacts: 'person' };
  let el = null, back = null;
  function close() { if (!el) return; el.remove(); el = null; doc.body.style.overflow = ''; root.removeEventListener('keydown', onKey); if (back != null && /#\/discover\b/.test(root.location.hash)) { try { root.history.replaceState(null, '', root.location.pathname + root.location.search + back); } catch (e) { } } const b = doc.querySelector('[data-act="openDiscover"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } }
  const onKey = e => { if (e.key === 'Escape') close(); };
  function build() {
    const K = V.dxKit, E = root.FWBExplore || { AREAS: [] }; if (!K) return;
    const areas = E.AREAS; const n = areas.reduce((t, a) => t + a.mods.length, 0);
    const chapters = areas.map((a, i) => { const c = K.ACC[i % 4];
      return `<section class="dx-lc${i % 2 ? ' flip' : ''}"><div class="dx-lc-t dx-rv"><span class="dx-no">${String(i + 1).padStart(2, '0')}</span><span class="dx-pill dark">${a.mods.length} modules</span><h3>${esc(a.title)}</h3><p>${esc(a.blurb)}</p><div class="dx-lc-chips">${a.mods.slice(0, 7).map(m => `<span>${esc(words(m))}</span>`).join('')}${a.mods.length > 7 ? `<span>+${a.mods.length - 7} more</span>` : ''}</div></div><div class="dx-lc-a dx-rv" aria-hidden="true"><div class="dx-lc-s s1">${V.dxArt(a.id, a.title, c, MOTIF[a.id])}</div></div></section>`; }).join('');
    const o = doc.createElement('div'); o.className = 'dx-ov dx'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Discover more with Facilio');
    o.innerHTML = `<div class="dx-ov-top"><img src="brand/logo-navy.png" alt="Facilio" height="26"><button type="button" class="dx-ov-x" data-dx-close>Close</button></div><div class="dx-ovin">
      <section class="dx-hero"><div class="dx-hero-l"><span class="dx-pill"><i></i>Discover more</span><h2>One platform for <em>every part</em> of running a building</h2><p>See what Facilio can do beyond your project. Scroll to explore the platform and the solution areas, then sign in to open your workspace.</p>${K.arrowBtn('dxOvGo', 'Start exploring')}<div class="dx-stats"><div><b>${areas.length}</b><span>solution areas</span></div><div><b>${n}</b><span>modules</span></div></div></div><div class="dx-hero-r" aria-hidden="true"><div class="dx-stack"><div class="dx-lay l3">${K.slab('#8DB8FF', { cells: 3 })}</div><div class="dx-lay l2">${K.slab('#1570EF', { cells: 3 })}</div><div class="dx-lay l1">${K.slab('#E5197F', { cells: 3 })}</div></div></div></section>
      <div data-dx-stage></div><div class="dx-lcs" id="dx-lcs">${chapters}</div>
      <section class="dx-cta dx-rv"><div class="dx-cta-art" aria-hidden="true">${K.slab('#1570EF', { cells: 3 })}</div><div><h2>Ready to open your workspace?</h2><p>Sign in with your Facilio account, or use your customer invitation, to see your own project.</p>${K.arrowBtn('dxOvClose', 'Back to sign in')}</div></section></div>`;
    o.addEventListener('click', e => { const b = e.target.closest('[data-dx-close],[data-act="dxOvClose"]'); if (b) { close(); return; } if (e.target.closest('[data-act="dxOvGo"]')) { const t = o.querySelector('#dx-lcs'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    doc.body.appendChild(o); doc.body.style.overflow = 'hidden'; root.addEventListener('keydown', onKey); el = o;
    K.stageLoad(() => { const h = o.querySelector('[data-dx-stage]'); if (h && el === o) h.outerHTML = K.stage(); });
    const x = o.querySelector('.dx-ov-x'); if (x) x.focus({ preventScroll: true });
  }
  function open() { if (el) return; back = /#\/discover\b/.test(root.location.hash) ? '#/' : null; if (!/#\/discover\b/.test(root.location.hash) && !/#\/c\//.test(root.location.hash)) { try { root.history.replaceState(null, '', root.location.pathname + root.location.search + '#/discover'); back = '#/'; } catch (e) { } } build(); }
  V.discover = { open, close };
  ACT.openDiscover = () => open();
  const check = () => { if (/#\/discover\b/.test(root.location.hash)) open(); };
  root.addEventListener('hashchange', check); setTimeout(check, 0);
})(typeof window !== 'undefined' ? window : globalThis);
