/* Discover more: Apple-style scroll devices on top of the existing page (pinned product stage, CSS scroll reveals and parallax live in src/explore.js and explore2.css).
   Following the scroll-craft skill, different chapters behave differently instead of repeating one effect:
     kinetic  the hero headline assembles word by word,
     rail     a thin progress line follows how far through the page you are,
     pan      every second solution area becomes a pinned strip: scrolling down slides its modules sideways, then the page carries on,
     reveal   chapter numbers, headings and the closing banner scale and sharpen in as they arrive (CSS, explorefx.css).
   Everything is skipped for people who ask for reduced motion, on phones and tablets, and when the page cannot measure itself; the page then reads as the plain grid. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const d = root.document; if (!d || !V.explore) return;
  const base = V.explore.mount; let pans = [], rail = null, dx = null, raf = 0, bound = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ok = () => !(root.matchMedia && (root.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.matchMedia('(min-width: 900px) and (hover: hover)').matches));
  function kinetic(scope) {
    const h = (scope || d).querySelector('.dx-hero h2'); if (!h || h.getAttribute('data-fx')) return; h.setAttribute('data-fx', '1'); let i = 0;
    const wrap = node => { Array.from(node.childNodes).forEach(c => { if (c.nodeType === 3) { const frag = d.createDocumentFragment(); c.nodeValue.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(d.createTextNode(' ')); else { const s = d.createElement('span'); s.className = 'dxfx-w'; s.style.setProperty('--w', String(i++)); s.textContent = w; frag.appendChild(s); } }); c.replaceWith(frag); } else if (c.nodeType === 1) wrap(c); }); };
    wrap(h);
  }
  function setupPan(ch) {
    const grid = ch.querySelector('.dx-grid'); if (!grid || grid.children.length < 4 || grid.closest('.dxfx-pan')) return;
    const wrap = d.createElement('div'); wrap.className = 'dxfx-pan'; const stick = d.createElement('div'); stick.className = 'dxfx-pan-in';
    grid.parentNode.insertBefore(wrap, grid); stick.appendChild(grid); wrap.appendChild(stick); grid.classList.add('dxfx-track'); pans.push({ wrap, stick, grid, max: 0, top: 0 });
  }
  let top0 = 72;   // where a pinned strip sticks: under the top bar and the page's own sticky filter bar
  function measure() {
    const nav = d.querySelector('.dx-nav'); top0 = 62 + (nav ? nav.offsetHeight : 0) + 12; if (dx) dx.style.setProperty('--dxfx-top', top0 + 'px');
    pans.forEach(p => { p.wrap.style.height = ''; const vw = p.stick.clientWidth; p.max = Math.max(0, p.grid.scrollWidth - vw); if (!p.max) { p.wrap.classList.add('off'); return; } p.wrap.classList.remove('off');
      p.wrap.style.height = Math.round(p.stick.offsetHeight + p.max * 1.1) + 'px'; p.top = p.wrap.getBoundingClientRect().top + root.scrollY; });
  }
  function frame() {
    raf = 0; const y = root.scrollY; if (rail && dx) { const t = dx.getBoundingClientRect().top + y, h = dx.offsetHeight - root.innerHeight; rail.style.setProperty('--k', String(clamp(h > 0 ? (y - t) / h : 0, 0, 1))); }
    pans.forEach(p => { if (p.wrap.classList.contains('off')) return; const span = p.wrap.offsetHeight - p.stick.offsetHeight; const k = clamp(span > 0 ? (y - (p.top - top0)) / span : 0, 0, 1); p.grid.style.transform = 'translate3d(' + (-p.max * k).toFixed(1) + 'px,0,0)'; });
  }
  const tick = () => { if (!raf) raf = root.requestAnimationFrame(frame); };
  V.explore.mount = function () {
    base.apply(this, arguments); pans = []; rail = null; dx = d.querySelector('.dx'); if (!dx || !ok()) return;
    dx.classList.add('dx-fx'); kinetic();
    rail = d.createElement('div'); rail.className = 'dxfx-rail'; rail.setAttribute('aria-hidden', 'true'); rail.innerHTML = '<i></i>'; dx.insertBefore(rail, dx.firstChild);
    d.querySelectorAll('.dx-ch').forEach((ch, i) => { if (i % 2 === 1) setupPan(ch); });
    measure(); frame(); [400, 1200].forEach(ms => setTimeout(() => { if (d.body.contains(dx)) { measure(); frame(); } }, ms));   // pictures and fonts change widths a moment after the first paint
    if (!bound) { bound = true; root.addEventListener('scroll', tick, { passive: true }); root.addEventListener('resize', () => { if (d.body.contains(dx) && pans.length) { measure(); tick(); } }); }
  };
  // the login page's Discover more: a full-screen overlay that scrolls by itself
  V.explorefxOverlay = o => {
    if (!o || !ok()) return; o.classList.add('dx-fx'); kinetic(o);
    const top = o.querySelector('.dx-ov-top'); if (!top) return; const r = d.createElement('div'); r.className = 'dxfx-rail'; r.setAttribute('aria-hidden', 'true'); r.innerHTML = '<i></i>'; top.appendChild(r);
    let q = 0; const upd = () => { q = 0; const h = o.scrollHeight - o.clientHeight; r.style.setProperty('--k', String(clamp(h > 0 ? o.scrollTop / h : 0, 0, 1))); }; o.addEventListener('scroll', () => { if (!q) q = root.requestAnimationFrame(upd); }, { passive: true }); upd();
  };
  V.explorefx = { measure, frame };
})(typeof window !== 'undefined' ? window : globalThis);
