/* Opening page (before sign-in), shown on every fresh load: the customer journey (src/roadintro.js) on customer invite links, the tree intro (src/treeintro.js) for everyone else.
   Skipped for automated browsers (tests) unless ?intro=1, and for ?nointro. It only covers the app and never blocks it. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  // the tree intro plays first on every fresh load of the sign-in screen (not on a deep link into a project, and not for ?nointro); Skip leads to the sign-in page
  const seen = /#\/p\//.test(root.location.hash);
  const forced = /[?&]intro=1\b/.test(root.location.search); const automated = !!(root.navigator && root.navigator.webdriver);
  if (!forced && (seen || automated || /[?&]nointro\b|#\/welcome/.test(root.location.search + root.location.hash))) return;
  try { sessionStorage.setItem('fwb_intro', '1'); } catch (e) { }
  // the rest of the app is bundled after this file, so start on the next tick
  // customer invite links (#/c/<project>) open on the customer journey (src/roadintro.js), which rises away to reveal the customer sign-in;
  // every other visit (the Facilio team) keeps the tree intro and its liquid reveal
  const customer = /#\/c\/[A-Za-z0-9_-]+/.test(root.location.hash);
  setTimeout(() => { try { const V = root.FWBViews; if (!V) return; if (customer && V.roadIntro) { V.roadIntro({ logo: 'brand/logo-white.png' }).then(() => { }); return; } if (!V.cinema) return; V.cinema({ aud: 'public', cta: 'Get started', liquid: true }).then(() => { }); } catch (e) { } }, 0);
})(typeof window !== 'undefined' ? window : globalThis);
