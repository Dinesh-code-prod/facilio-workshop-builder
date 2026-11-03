/* Discover more scroll effects, shared helpers. This folder holds both effects, kept apart on purpose:
     login-scroll.js / .css    the sign-in page's Discover more: vertical pinned scenes, art zooms in, words light up as you scroll
     project-scroll.js / .css  the Discover more tab inside a project: pinned chapters whose cards slide sideways, the focused card grows
   Both are skipped for people who ask for reduced motion, on phones, tablets and short windows; the page then reads as the plain grid. */
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const ok = () => !!root.matchMedia && !root.matchMedia('(prefers-reduced-motion: reduce)').matches && root.matchMedia('(min-width: 900px) and (min-height: 600px) and (hover: hover)').matches;
  // wrap every word under node in <span class="dxfx-w" style="--i:n">; returns the next index so several nodes can share one running count
  function words(node, i) {
    i = i || 0; if (!node || node.getAttribute('data-fx')) return i; node.setAttribute('data-fx', '1');
    const wrap = n => Array.from(n.childNodes).forEach(c => {
      if (c.nodeType === 3) { const frag = d.createDocumentFragment(); c.nodeValue.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(d.createTextNode(' ')); else { const s = d.createElement('span'); s.className = 'dxfx-w'; s.style.setProperty('--i', String(i++)); s.textContent = w; frag.appendChild(s); } }); c.replaceWith(frag); }
      else if (c.nodeType === 1) wrap(c);
    });
    wrap(node); return i;
  }
  root.FWBDiscoverFx = { clamp, ease, ok, words };
})(typeof window !== 'undefined' ? window : globalThis);
