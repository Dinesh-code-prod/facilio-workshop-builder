/* Opening page (before sign-in), shown on every fresh load: the customer journey (src/animation/roadintro.js) on customer invite links, the tree intro (src/animation/treeintro.js) for everyone else.
   Skipped for automated browsers (tests) unless ?intro=1, and for ?nointro. It only covers the app and never blocks it. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  // the tree intro plays first on every fresh load of the sign-in screen (not on a deep link into a project, and not for ?nointro); Skip leads to the sign-in page
  const seen = /#\/p\//.test(root.location.hash);
  const forced = /[?&]intro=1\b/.test(root.location.search); const automated = !!(root.navigator && root.navigator.webdriver);
  if (!forced && (seen || automated || /[?&]nointro\b|#\/welcome/.test(root.location.search + root.location.hash))) return;
  // the tree intro plays ONCE per person (user, 23 Nov 2026): remembered on the account (/api/auth/me introSeen), so a new browser or cleared data does not replay it; this browser's flag is the fast path. ?intro=1 still forces it. Customer invite links keep their journey.
  const customer = /#\/c\/[A-Za-z0-9_-]+/.test(root.location.hash);
  const once = !forced && !customer;
  try { if (once && localStorage.getItem('fwb_intro_seen') === '1') return; } catch (e) { /* storage blocked: the account flag still decides */ }
  const mark = () => { try { localStorage.setItem('fwb_intro_seen', '1'); } catch (e) { } fetch('/api/fn/api/me/intro-seen', { method: 'PUT', credentials: 'same-origin' }).catch(() => { }); };
  const play = () => { try { const V = root.FWBViews; if (!V) return; if (customer && V.roadIntro) { V.roadIntro({ logo: 'brand/logo-white.png' }).then(() => { }); return; } if (!V.cinema) return; if (once) mark(); V.cinema({ aud: 'public', cta: 'Get started', liquid: true }).then(() => { }); } catch (e) { } };
  // the rest of the app is bundled after this file, so start on the next tick; for the team, ask the account first (no answer: play, as before)
  if (!once) { setTimeout(play, 0); return; }
  fetch('/api/fn/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null).then(me => {
    if (me && me.user && me.user.introSeen) { try { localStorage.setItem('fwb_intro_seen', '1'); } catch (e) { } return; }
    play();
  });
})(typeof window !== 'undefined' ? window : globalThis);
