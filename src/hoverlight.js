/* Hover light: tells the CSS where the pointer is inside a box (KPI tile, project card, clickable card) so a soft light can follow it.
   Pure decoration: it only sets two CSS variables, ignores touch, and does nothing when no such box is under the pointer. */
(function (root) {
  'use strict';
  const SEL = '.card.stat,.cmd-m,.pp-stat,.kpi,.proj-card,.card.click'; let raf = 0;
  root.document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || raf) return; const t = e.target.closest && e.target.closest(SEL); if (!t) return;
    raf = root.requestAnimationFrame(() => { raf = 0; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  }, { passive: true });
})(typeof window !== 'undefined' ? window : globalThis);
