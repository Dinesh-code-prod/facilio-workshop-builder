/* "See how Delivery Studio helps": plays the road-to-go-live journey (src/roadintro.js, V.roadIntro) over the sign-in page.
   The same highlighted button sits on the Facilio team sign-in and on the customer invitation sign-in (#/c/<project>), and #/welcome opens it directly
   (a link that can be shared). On a customer invitation link the address is left alone, so the customer stays on their own sign-in afterwards.
   When the journey ends or is skipped it leaves through the shared liquid reveal and the sign-in page underneath is ready to use.
   Static content only: no project data, no API calls, no sign-in bypass. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {}; const ACT = V.ACT = V.ACT || {};
  let playing = false;
  const isCustomerLink = () => /#\/c\/[A-Za-z0-9_-]+/.test(root.location.hash);
  const setHash = h => { try { root.history.replaceState(null, '', root.location.pathname + root.location.search + h); } catch (e) { } };
  function play() {
    if (playing || !V.roadIntro || doc.querySelector('.ri')) return; playing = true;
    const back = isCustomerLink() ? '' : '#/';   // a customer link keeps its address; the team sign-in returns to #/
    if (back && !/#\/welcome\b/.test(root.location.hash)) setHash('#/welcome');
    const done = () => { playing = false; if (back && /#\/welcome\b/.test(root.location.hash)) setHash(back); const b = doc.querySelector('[data-act="openWelcome"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } };
    V.roadIntro({ logo: 'brand/logo-white.png' }).then(done, done);
  }
  V.welcome = { open: play };
  ACT.openWelcome = () => play();
  const check = () => { if (/#\/welcome\b/.test(root.location.hash)) play(); };
  root.addEventListener('hashchange', check);
  setTimeout(check, 0);
})(typeof window !== 'undefined' ? window : globalThis);
