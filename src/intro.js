/* Opening page (before sign-in): the cinematic introduction in src/cinema.js, shown once per browser session.
   Skipped for automated browsers (tests) unless ?intro=1, and for ?nointro. It only covers the app and never blocks it. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  let seen = false; try { seen = sessionStorage.getItem('fwb_intro') === '1'; } catch (e) { }
  const forced = /[?&]intro=1\b/.test(root.location.search); const automated = !!(root.navigator && root.navigator.webdriver);
  if (!forced && (seen || automated || /[?&]nointro\b/.test(root.location.search + root.location.hash))) return;
  try { sessionStorage.setItem('fwb_intro', '1'); } catch (e) { }
  // the rest of the app is bundled after this file, so start on the next tick
  setTimeout(() => { try { const V = root.FWBViews; if (!V || !V.cinema) return; V.cinema({ aud: 'public', cta: 'Get started' }).then(() => { const w = doc.createElement('div'); w.className = 'cn-wipe'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<i></i><i></i><i></i><img src="brand/logo-white.png" alt="" width="132" height="36">'; doc.body.appendChild(w); doc.body.classList.add('login-in'); setTimeout(() => { w.remove(); doc.body.classList.remove('login-in'); }, 1900); }); } catch (e) { } }, 0);
})(typeof window !== 'undefined' ? window : globalThis);
