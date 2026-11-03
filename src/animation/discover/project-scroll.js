/* "Discover more" tab inside a project (src/explore.js): pinned sideways galleries, in the manner of Apple's card carousels.
   Every solution area becomes one pinned chapter: its number and heading stay put while scrolling down slides the module cards sideways;
   the card in focus grows and sharpens, the others step back, a thin line under the heading shows how far through the chapter you are,
   and the big chapter number drifts the other way. The hero headline assembles word by word and the isometric stack turns as you leave it (CSS, project-scroll.css).
   Chapters whose cards would not fit on screen, or that have fewer than three, stay as the plain grid. */
(function (root) {
  'use strict';
  const D = root.FWBDiscoverFx, V = root.FWBViews, d = root.document; if (!D || !V || !d || !V.explore) return;
  const { clamp } = D; const base = V.explore.mount; let pans = [], dx = null, raf = 0, bound = false, top0 = 72;
  function setup(ch) {
    const head = ch.querySelector('.dx-chh'), grid = ch.querySelector('.dx-grid'); if (!head || !grid || grid.children.length < 3 || grid.closest('.dxp-pan')) return;
    const wrap = d.createElement('div'), pin = d.createElement('div'), vp = d.createElement('div'); wrap.className = 'dxp-pan'; pin.className = 'dxp-pin'; vp.className = 'dxp-vp';
    Array.from(grid.children).forEach(t => { const c = d.createElement('div'); c.className = 'dxp-card'; grid.insertBefore(c, t); c.appendChild(t); });   // cards get the focus effect, so the tile keeps its own hover and reveal
    ch.insertBefore(wrap, head); pin.appendChild(head); vp.appendChild(grid); pin.appendChild(vp); pin.insertAdjacentHTML('beforeend', '<div class="dxp-bar" aria-hidden="true"><i></i></div>'); wrap.appendChild(pin);
    grid.classList.add('dxp-track'); pans.push({ wrap, pin, vp, grid, cards: Array.from(grid.children), max: 0, k: -1 });
  }
  function measure() {
    const nav = d.querySelector('.dx-nav'); top0 = 62 + (nav ? nav.offsetHeight : 0) + 12; if (dx) dx.style.setProperty('--dxp-top', top0 + 'px');
    pans.forEach(p => {
      p.wrap.classList.remove('off'); p.wrap.style.height = ''; p.max = Math.max(0, p.grid.scrollWidth + 2 * parseFloat(root.getComputedStyle(p.vp).paddingLeft) - p.vp.clientWidth);   // the strip's side padding counts, so the last card clears the edge
      if (!p.max || p.pin.offsetHeight > root.innerHeight - top0 + 4) { p.wrap.classList.add('off'); p.grid.style.transform = ''; return; }   // nothing to slide, or the chapter would be cut off
      p.wrap.style.height = Math.round(p.pin.offsetHeight + p.max * 1.15) + 'px'; p.k = -1;
    });
  }
  function frame() {
    raf = 0; const vh = root.innerHeight;
    pans.forEach(p => {
      if (p.wrap.classList.contains('off')) return; const r = p.wrap.getBoundingClientRect(); if (r.bottom < -60 || r.top > vh + 60) return;
      const span = r.height - p.pin.offsetHeight, k = clamp(span > 0 ? (top0 - r.top) / span : 0, 0, 1); if (Math.abs(k - p.k) < .0005) return; p.k = k;
      p.grid.style.transform = 'translate3d(' + (-p.max * k).toFixed(1) + 'px,0,0)'; p.wrap.style.setProperty('--k', k.toFixed(4));
      const vw = p.vp.clientWidth, focus = vw * (.18 + .64 * k);   // the spot where a card is at its biggest moves from the left edge to the right edge as you go
      p.cards.forEach(c => { const mid = c.offsetLeft - p.max * k + c.offsetWidth / 2; c.style.setProperty('--f', clamp(1 - Math.abs(mid - focus) / (c.offsetWidth * 3), 0, 1).toFixed(3)); });
    });
  }
  const tick = () => { if (!raf) raf = root.requestAnimationFrame(frame); };
  V.explore.mount = function () {
    base.apply(this, arguments); pans = []; dx = d.querySelector('.dx'); if (!dx || !D.ok()) return;
    dx.classList.add('dxp-on'); D.words(dx.querySelector('.dx-hero h2'), 0);
    d.querySelectorAll('.dx-ch').forEach(setup); measure(); frame();
    [400, 1200].forEach(ms => setTimeout(() => { if (d.body.contains(dx)) { measure(); frame(); } }, ms));   // fonts and pictures change widths a moment after the first paint
    if (!bound) { bound = true; root.addEventListener('scroll', tick, { passive: true }); root.addEventListener('resize', () => { if (d.body.contains(dx) && pans.length) { measure(); tick(); } }); }
  };
  V.discoverProjectFx = { measure, frame };
})(typeof window !== 'undefined' ? window : globalThis);
