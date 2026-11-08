/* Facilio Motion Kit integration (vanilla). Source of truth: docs/design/motionkit/animations.json (kit "Facilio Motion Kit", 26 animations).
   Code below is the kit's own vanilla code for: intro (stagger), list (row stagger), modal, drawer. CSS for them is at the end of styles.css.
   Animations play on a route change only, because the shell re-renders on every state change and must not replay on each keystroke. */
(function () {
  'use strict';
  const V = (window.FWBViews = window.FWBViews || {});
  // kit "intro": playStagger
  function playStagger(root, opt) { opt = opt || {}; const step = opt.step != null ? opt.step : 0.06, start = opt.start != null ? opt.start : 0.06; root.querySelectorAll('.si-item').forEach((el, i) => { el.style.animationDelay = (start + Math.min(i, 12) * step) + 's'; }); root.classList.remove('si-play'); void root.offsetWidth; root.classList.add('si-play'); }
  // kit "list": playListStagger
  function playListStagger(list, opt) { opt = opt || {}; const step = opt.step != null ? opt.step : 65, start = opt.start != null ? opt.start : 60; list.querySelectorAll('.ll-row').forEach((el, i) => { el.style.animationDelay = (start + Math.min(i, 12) * step) + 'ms'; }); list.classList.remove('ll-play'); void list.offsetWidth; list.classList.add('ll-play'); }
  let last = null, t0 = 0;
  function route(key) {
    const now = Date.now(); if (key === last && now - t0 > 900) return; if (key !== last) { last = key; t0 = now; } // re-renders right after a route change (data arriving) rebuild the DOM: play again on the new elements
    try {
      const page = document.querySelector('.page') || document.getElementById('app'); if (!page) return;
      const body = page.querySelector('.page-body'); let n = 0;
      if (body) Array.from(body.children).slice(0, 10).forEach(el => { el.classList.add('si-item'); n++; });
      else page.querySelectorAll('.proj-card').forEach(el => { el.classList.add('si-item'); n++; });
      if (n) playStagger(page);
      const rows = page.querySelectorAll('table tbody tr'); if (rows.length && rows.length < 80) { const wrap = rows[0].closest('table').parentElement; rows.forEach(r => r.classList.add('ll-row')); playListStagger(wrap); }
    } catch (e) { /* motion must never break the app */ }
  }
  function reset() { last = null; t0 = 0; }
  // kit "drawer" / "modal": open class toggled after insertion so the transition runs
  function open(scrim) { const on = () => scrim.classList.add('is-open'); requestAnimationFrame(() => requestAnimationFrame(on)); setTimeout(on, 80); /* fallback when frames are throttled */ }
  function close(scrim, done) { if (!scrim) return; scrim.removeAttribute('id'); scrim.classList.remove('is-open'); const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) { scrim.remove(); if (done) done(); } else setTimeout(() => { scrim.remove(); if (done) done(); }, 300); }
  V.motion = { playStagger, playListStagger, route, reset, open, close };
})();
