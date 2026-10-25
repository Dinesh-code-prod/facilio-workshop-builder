/* Opening page (before sign-in): the cinematic introduction in src/cinema.js, shown once per browser session.
   Skipped for automated browsers (tests) unless ?intro=1, and for ?nointro. It only covers the app and never blocks it. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  let seen = false; try { seen = sessionStorage.getItem('fwb_intro') === '1'; } catch (e) { }
  const forced = /[?&]intro=1\b/.test(root.location.search); const automated = !!(root.navigator && root.navigator.webdriver);
  if (!forced && (seen || automated || /[?&]nointro\b|#\/welcome/.test(root.location.search + root.location.hash))) return;
  try { sessionStorage.setItem('fwb_intro', '1'); } catch (e) { }
  // the rest of the app is bundled after this file, so start on the next tick
  setTimeout(() => { try { const V = root.FWBViews; if (!V || !V.cinema) return; V.cinema({ aud: 'public', cta: 'Get started', liquid: true }).then(() => { }); } catch (e) { } }, 0);
})(typeof window !== 'undefined' ? window : globalThis);
