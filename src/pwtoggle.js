/* Show/hide button on every password field (sign-in, sign-up, admin, drawers). A MutationObserver adds it to fields as screens re-render.
   The field keeps its id and type="password" by default; clicking the eye switches it to plain text and back. No inline handlers (strict CSP). */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function enhance(inp) {
    if (inp.dataset.pwt || inp.type !== 'password') return; inp.dataset.pwt = '1';
    const wrap = doc.createElement('span'); wrap.className = 'pw-wrap';
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.tabIndex = 0; b.setAttribute('aria-label', 'Show password'); b.setAttribute('aria-pressed', 'false'); b.innerHTML = EYE;
    b.addEventListener('mousedown', e => e.preventDefault()); // keep focus and caret in the field
    b.addEventListener('click', () => {
      const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
      b.innerHTML = show ? OFF : EYE; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.setAttribute('aria-pressed', show ? 'true' : 'false'); inp.focus();
    });
    wrap.appendChild(b);
  }
  function scan(n) { if (!n || n.nodeType !== 1) return; if (n.matches && n.matches('input[type="password"]')) enhance(n); n.querySelectorAll && n.querySelectorAll('input[type="password"]').forEach(enhance); }
  function start() {
    scan(doc.body);
    new root.MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan); }).observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
})(typeof window !== 'undefined' ? window : globalThis);
