/* Sign-in page "Discover more" (src/discoverlogin.js): pinned scenes, in the manner of Apple's product pages.
   Every solution area becomes one scene that stays pinned while you scroll through it:
     it zooms up as it arrives, its art slides in and assembles, the heading and description light up word by word with the scroll,
     the module chips appear one after another, then the scene shrinks and dims as the next one arrives.
   The hero headline and the isometric stack react to the first screen of scrolling; the closing banner scales in.
   The overlay is its own scroll container, so progress is read from its scroll position (one rAF per scroll burst). */
(function (root) {
  'use strict';
  const D = root.FWBDiscoverFx, V = root.FWBViews, d = root.document; if (!D || !V || !d) return;
  const { clamp, ease } = D; const set = (el, k, v) => el.style.setProperty(k, v.toFixed(3));
  V.discoverLoginFx = o => {
    if (!o || !D.ok()) return;
    const bar = o.querySelector('.dx-ov-top'), hero = o.querySelector('.dx-hero'), cta = o.querySelector('.dx-cta'), top = bar ? bar.offsetHeight : 56;
    o.classList.add('dxl-on'); o.style.setProperty('--dxl-top', top + 'px');
    const scenes = Array.from(o.querySelectorAll('.dx-lc')).map(lc => {
      const s = d.createElement('div'), pin = d.createElement('div'); s.className = 'dxl-scene'; pin.className = 'dxl-pin';
      lc.parentNode.insertBefore(s, lc); pin.appendChild(lc); s.appendChild(pin);
      lc.style.setProperty('--n', String(D.words(lc.querySelector('.dx-lc-t p'), D.words(lc.querySelector('.dx-lc-t h3'), 0))));   // heading words first, then the description, one running count
      lc.querySelectorAll('.dx-lc-chips span').forEach((c, i) => c.style.setProperty('--c', String(i)));
      return { s, pin, lc };
    });
    let raf = 0;
    const frame = () => {
      raf = 0; const vh = o.clientHeight;
      if (hero) set(hero, '--hp', clamp(o.scrollTop / Math.max(1, hero.offsetHeight * .9), 0, 1));
      scenes.forEach(c => {
        const r = c.s.getBoundingClientRect(); if (r.bottom < -80 || r.top > vh + 80) return;
        const a = clamp((vh * .96 - r.top) / (vh * .96 - top), 0, 1);                          // arriving: scene top travels from the bottom edge up to the pin line
        const p = clamp((top - r.top) / Math.max(1, r.height - c.pin.offsetHeight), 0, 1);       // pinned: 0 when it sticks, 1 when it lets go
        set(c.lc, '--in', ease(a)); set(c.lc, '--wp', clamp((p - .04) / .6, 0, 1)); set(c.lc, '--out', clamp((p - .84) / .16, 0, 1));
      });
      if (cta) set(cta, '--in', ease(clamp((vh * .98 - cta.getBoundingClientRect().top) / (vh * .5), 0, 1)));
    };
    const tick = () => { if (!raf) raf = root.requestAnimationFrame(frame); };
    const onResize = () => { if (!o.isConnected) root.removeEventListener('resize', onResize); else tick(); };
    o.addEventListener('scroll', tick, { passive: true }); root.addEventListener('resize', onResize); frame();
  };
})(typeof window !== 'undefined' ? window : globalThis);
