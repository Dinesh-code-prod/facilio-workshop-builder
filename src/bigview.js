/* "Bigger view" for every generated HTML page shown in a frame (kick-off deck, project plan, mockups, onboarding page, UAT pages...): each iframe that carries its page in srcdoc gets an Expand button; it opens the same page
   in a large window, scaled to fit, with the same sandbox as the small one (no scripts unless the small one had them). Esc or Close returns. Frames of other websites (src=) have their own button in src/webframe.js. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let last = null;
  function open(fr) {
    const src = fr.getAttribute('srcdoc'); if (!src) return; last = doc.activeElement; const w = fr.offsetWidth || 1280, h = fr.offsetHeight || 720, title = fr.getAttribute('title') || 'Preview';
    const o = doc.createElement('div'); o.className = 'bv-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', title + ', bigger view');
    const deck = fr.hasAttribute('data-deck'), lab = deck ? ((doc.getElementById('koSlideNo') || {}).textContent || '') : '';   // a slide deck: Previous and Next, arrow keys and a click on the stage move the slides
    o.innerHTML = '<div class="bv-bar"><b>' + esc(title) + '</b>' + (deck ? '<span class="bv-lab xs muted">' + esc(lab) + '</span><span class="bv-nav"><button type="button" class="btn sm" data-bv="prev">Previous</button><button type="button" class="btn sm" data-bv="next">Next</button></span>' : '') + '<button type="button" class="btn sm" data-bv="close">Close</button></div><div class="bv-stage"><iframe title="' + esc(title) + '" sandbox="' + esc(fr.getAttribute('sandbox') || '') + '"></iframe></div>';
    const f = o.querySelector('iframe'); f.srcdoc = src; doc.body.appendChild(o); doc.body.classList.add('bv-lock');
    const fit = () => { const st = o.querySelector('.bv-stage'), k = Math.min(st.clientWidth / w, st.clientHeight / h); f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = 'scale(' + k + ')'; f.style.marginLeft = Math.max(0, (st.clientWidth - w * k) / 2) + 'px'; st.style.setProperty('--bvh', Math.round(h * k) + 'px'); };
    fit(); root.addEventListener('resize', fit); o._fit = fit; o.querySelector('[data-bv=close]').focus();
  }
  function close() { const o = doc.querySelector('.bv-ov'); if (!o) return; root.removeEventListener('resize', o._fit); o.remove(); doc.body.classList.remove('bv-lock'); if (last && last.focus) last.focus(); }
  // a slide deck in the bigger view: Previous and Next, the arrow keys and Page Up and Down move the slides (the page itself has no script, so the Studio swaps the slide)
  function step(d) { const o = doc.querySelector('.bv-ov'), V = root.FWBViews; if (!o || !V || !V.bvStep || !o.querySelector('[data-bv=next]')) return; const r = V.bvStep(d); if (!r) return; o.querySelector('iframe').srcdoc = r.html; const l = o.querySelector('.bv-lab'); if (l) l.textContent = r.label; }
  doc.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bv]'); if (!b) return; const a = b.getAttribute('data-bv'); if (a === 'close') close(); else if (a === 'prev' || a === 'next') step(a === 'next' ? 1 : -1); else { const fr = b.parentNode.querySelector('iframe[srcdoc]'); if (fr) open(fr); } });
  doc.addEventListener('keydown', e => { if (!doc.querySelector('.bv-ov')) return; if (e.key === 'Escape') { e.stopPropagation(); close(); return; } const k = e.key; if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); step(1); } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); step(-1); } }, true);
  function scan() {
    doc.querySelectorAll('iframe[srcdoc]').forEach(fr => { if (fr.closest('.bv-ov')) return; const p = fr.parentNode; if (!p || p.querySelector(':scope > [data-bv=open]')) return;
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'bv-btn'; b.setAttribute('data-bv', 'open'); b.setAttribute('aria-label', 'Open ' + (fr.getAttribute('title') || 'this page') + ' in a bigger view'); b.title = 'Bigger view'; b.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6"/></svg><span>Bigger view</span>'; p.classList.add('bv-host'); p.appendChild(b); });
  }
  new root.MutationObserver(() => { clearTimeout(scan.t); scan.t = setTimeout(scan, 120); }).observe(doc.documentElement, { childList: true, subtree: true }); scan();
})(typeof window !== 'undefined' ? window : globalThis);
