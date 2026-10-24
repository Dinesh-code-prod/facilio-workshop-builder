/* Opening screen: plays the Facilio logo wipe video on a white stage, adds a tagline, drifting brand squares and a loading line, then lifts away to reveal the page.
   Shown once per browser session, skipped for reduced-motion users, and never blocks the app (it only covers it). */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  let seen = false; try { seen = sessionStorage.getItem('fwb_intro') === '1'; } catch (e) { }
  const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forced = /[?&]intro=1\b/.test(root.location.search); const automated = !!(root.navigator && root.navigator.webdriver); // automated browsers (tests) skip it unless ?intro=1
  if (!forced && (seen || reduce || automated || /[?&]nointro\b/.test(root.location.search + root.location.hash))) return;
  try { sessionStorage.setItem('fwb_intro', '1'); } catch (e) { }
  const o = doc.createElement('div'); o.className = 'intro v6'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Facilio Delivery Studio');
  o.innerHTML = '<div class="iv6-top"><img src="brand/logo-navy.png" alt="Facilio" height="22"><span class="iv-sep"></span><span class="iv-crumb">Delivery Studio</span></div><div class="iv6-body"><h1>Facilio Delivery Studio</h1><p>One workspace for every customer project, from kick-off and workshops to go-live, hypercare and handover.</p><div class="iv6-fill"></div><button type="button" class="btn primary lg iv-go">Get started</button></div>';
  doc.body.appendChild(o); doc.body.classList.add('intro-on'); let closed = false;
  // the rest of the app is bundled after this file, so fill the animated stage on the next tick
  setTimeout(() => { try { const V = root.FWBViews; const f = o.querySelector('.iv6-fill'); if (!V || !V.ecoStage || !f) return; const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    f.innerHTML = '<ol class="eco-life" aria-label="Delivery lifecycle">' + V._isoLifecycle().map((l, k) => '<li style="--d:' + (k * .07).toFixed(2) + 's"><i>' + (k + 1) + '</i><span>' + esc(l.label) + '</span></li>').join('') + '</ol>' + V.ecoStage({ audience: 'public' }); } catch (e) { } }, 0);
  function close() { if (closed) return; closed = true; o.classList.add('out'); doc.body.classList.remove('intro-on'); doc.body.classList.add('reveal'); setTimeout(() => doc.body.classList.remove('reveal'), 900); setTimeout(() => o.remove(), 600); }
  o.addEventListener('click', e => { if (e.target.closest('.iv-go')) close(); });
  doc.addEventListener('keydown', function k(e) { if (closed) { doc.removeEventListener('keydown', k); return; } if (e.key === 'Escape') close(); });
  const go = o.querySelector('.iv-go'); if (go) setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { } }, 600); // waits here until Get started is pressed
})(typeof window !== 'undefined' ? window : globalThis);
