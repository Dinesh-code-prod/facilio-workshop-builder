/* Keyboard access, the part the shell does not do: a "Skip to content" link and an id on the main area for it to jump to.
   (Making clickable cards, rows and tiles reachable with Tab and usable with Enter or Space is done in src/shell.js, enhanceActions.) */
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  let timer = 0;
  function patch() {
    const main = d.querySelector('main.main, main'); if (main && !main.id) { main.id = 'main-content'; main.setAttribute('tabindex', '-1'); }
    if (!d.getElementById('skipLink') && d.body) { const a = d.createElement('a'); a.id = 'skipLink'; a.className = 'skip-link'; a.href = '#main-content'; a.textContent = 'Skip to content'; a.addEventListener('click', e => { const m = d.getElementById('main-content'); if (m) { e.preventDefault(); m.focus(); } }); d.body.insertBefore(a, d.body.firstChild); }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(patch, 80); };
  function start() { patch(); new MutationObserver(later).observe(d.body, { childList: true, subtree: true }); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
