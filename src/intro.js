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
  const o = doc.createElement('div'); o.className = 'intro'; o.setAttribute('role', 'presentation');
  const MODS = ['Work Orders', 'Assets', 'Spaces', 'Energy', 'Sustainability', 'Visitors', 'Inventory', 'Workplace', 'Preventive Maintenance', 'Sensors', 'Dashboards', 'AI Insights'];
  const chips = n => MODS.concat(MODS).map((m, i) => '<span><i></i>' + m + '</span>').join('');
  const STEPS = [['Contract', 'Scope'], ['Workshops', 'Walkthrough'], ['Requirements', 'Capture'], ['BRD', 'Document'], ['UAT', 'Sign-off'], ['Go-live', 'Launch']];
  const CITY = [['Work Orders', 46, 0], ['Assets', 62, 1], ['Spaces', 78, 2], ['Energy', 56, 3], ['Visitors', 88, 4], ['Inventory', 52, 5], ['Workplace', 70, 6]];
  const win = n => Array.from({ length: n }, (_, i) => '<i style="--w:' + i + '"></i>').join('');
  const city = CITY.map((c, i) => i === 2
    ? '<div class="iv-b hi" style="--h:' + c[1] + ';--i:' + i + '"><span class="iv-bt">FACILIO WORKSPACE</span><div class="iv-bx"><small>Requirements captured</small><b>Workshop to BRD</b></div><span class="iv-bn">' + c[0].toUpperCase() + '</span></div>'
    : '<div class="iv-b" style="--h:' + c[1] + ';--i:' + i + '"><div class="iv-w">' + win(6) + '</div><span class="iv-bn">' + c[0].toUpperCase() + '</span></div>').join('');
  o.innerHTML = '<div class="iv-top"><img class="iv-mini" src="brand/logo-navy.png" alt="" aria-hidden="true"><span class="iv-sep"></span><span class="iv-crumb">Delivery Studio</span><span class="iv-pill"><i></i>Your workshop, ready to run</span></div>' +
    '<div class="iv-rail r1"><div class="iv-track">' + chips() + '</div></div><div class="iv-rail r2"><div class="iv-track">' + chips() + '</div></div>' +
    '<i class="iv-glow"></i><i class="iv-cloud k1"></i><i class="iv-cloud k2"></i><i class="iv-cloud k3"></i>' +
    '<div class="iv-hero"><div class="iv-logo"><img class="in-logo" src="brand/logo-navy.png" alt="" aria-hidden="true"></div>' +
    '<div class="iv-title">Delivery Studio</div><div class="iv-sub">Discover. Design. Deliver.</div>' +
    '<div class="iv-steps"><i class="iv-sl"><b></b></i>' + STEPS.map((t, i) => '<div class="iv-st" style="--i:' + i + '"><u></u><strong>' + t[0] + '</strong><small>' + t[1] + '</small><em>Active stage</em></div>').join('') + '</div>' +
    '<div class="iv-note"><span class="iv-pill sm"><i></i>Guided from contract to go-live</span><p>Walk through the Facilio configuration, capture requirements and produce the BRD, together with your customer in one shared session.</p></div></div>' +
    '<div class="iv-card l"><div class="iv-ch"><i class="dot"></i><b>Workshop alignment</b><span class="iv-tag">Sample</span></div>' +
    '<div class="iv-row"><span class="av">FC</span><div><b>Facilio consultant</b><small>Leads the walkthrough</small></div><em>Ready</em></div>' +
    '<div class="iv-row"><span class="av c2">CL</span><div><b>Customer lead</b><small>Joined with a link</small></div><em>Joined</em></div>' +
    '<div class="iv-cov"><div class="iv-cv"><span>Modules reviewed</span><b>9 / 12</b></div><div class="iv-meter"><i></i></div><div class="iv-cf"><small>Work Orders &amp; Assets</small><small class="w">3 to go</small></div></div>' +
    '<div class="iv-foot"><span>Everyone sees the same plan</span><b>Live</b></div></div>' +
    '<div class="iv-card r"><div class="iv-ch"><i class="dot t"></i><b>BRD progress</b><span class="iv-tag">Sample</span></div>' +
    '<div class="iv-chart"><div class="iv-cv"><span>Requirements captured</span><b>rising</b></div><svg viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ivg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2fc9c9" stop-opacity=".45"/><stop offset="1" stop-color="#2fc9c9" stop-opacity="0"/></linearGradient></defs><path class="ar" d="M0 52 C40 50 60 40 90 38 S140 44 170 26 S215 8 240 6 V60 H0Z" fill="url(#ivg)"/><path class="ln" d="M0 52 C40 50 60 40 90 38 S140 44 170 26 S215 8 240 6" fill="none" stroke="#2fc9c9" stroke-width="2.4" stroke-linecap="round" pathLength="1"/></svg></div>' +
    '<div class="iv-two"><div><small>WORKSHOPS</small><b>6 / 6</b><em>All held</em></div><div><small>SIGN-OFFS</small><b>3 / 4</b><em>One to go</em></div></div>' +
    '<div class="iv-foot"><span>Facilio and customer, same view</span><b>BRD</b></div></div>' +
    '<div class="iv-city">' + city + '<svg class="iv-arc" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ivarc" x1="0" x2="1"><stop offset="0" stop-color="#e91e84"/><stop offset=".5" stop-color="#2fc9c9"/><stop offset="1" stop-color="#0a5fe8"/></linearGradient></defs><path id="ivpath" d="M40 100 C200 20 320 10 470 40 S760 90 900 50 S1120 10 1170 60" fill="none" stroke="url(#ivarc)" stroke-width="1.6" stroke-dasharray="7 9" stroke-linecap="round"/><circle r="5" fill="#e91e84"><animateMotion dur="5s" repeatCount="indefinite" rotate="auto"><mpath href="#ivpath"/></animateMotion></circle><circle r="4" fill="#0a5fe8"><animateMotion dur="5s" begin="-2.5s" repeatCount="indefinite"><mpath href="#ivpath"/></animateMotion></circle></svg><i class="iv-base"></i></div>' +
    '<div class="iv-bar"><span class="iv-lab">WORKS FOR</span><div class="iv-pills"><span>Commercial Real Estate</span><span>Healthcare</span><span>Enterprise HQ</span><span>Airports</span></div><span class="iv-ld">Preparing your workspace<b>.</b><b>.</b><b>.</b></span><button type="button" class="iv-go">Get started<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>' +
    '<i class="in-cur c1"></i><i class="in-cur c2"></i><i class="in-cur c3"></i>';
  o.classList.add('v5');
  doc.body.appendChild(o); doc.body.classList.add('intro-on');
  // the logo is the transparent image, wiped in by CSS, so it blends with the page (a video frame always shows its white box)
  const v = doc.createElement('video'); o.classList.add('no-video'); let closed = false; let started = false;
  function close() { if (closed) return; closed = true; clearInterval(tm); o.classList.add('curtain'); setTimeout(() => { o.classList.add('out'); doc.body.classList.remove('intro-on'); doc.body.classList.add('reveal'); setTimeout(() => doc.body.classList.remove('reveal'), 1100); }, 950); setTimeout(() => { o.remove(); }, 1500); } // colour curtains sweep up, then the screen fades to the page
  function fallback() { if (started) return; o.classList.add('no-video'); } // video blocked or missing: animate the still logo instead
  v.addEventListener('playing', () => { started = true; });
  v.addEventListener('error', fallback);
  const p = v.play && v.play(); if (p && p.catch) p.catch(fallback);
  setTimeout(fallback, 900);
  // the clip wipes the logo out from about 2.4s; stop on the finished logo (checked every frame, so it never gets cut)
  v.addEventListener('playing', function tick() { (function f() { if (closed) return; if (v.currentTime >= 2.1) { v.pause(); return; } root.requestAnimationFrame(f); })(); }, { once: true });
  const sts = o.querySelectorAll('.iv-st'); let si = -1; const adv = () => { si++; sts.forEach((e, i) => { e.classList.toggle('done', i < si); e.classList.toggle('on', i === si); }); const ln = o.querySelector('.iv-sl b'); if (ln) ln.style.transform = 'scaleX(' + Math.min(si, 5) / 5 + ')'; if (si >= 5) clearInterval(tm); }; let tm = 0; setTimeout(() => { adv(); tm = setInterval(adv, 850); }, 1300);
  const go = o.querySelector('.iv-go'); if (go) go.addEventListener('click', close);
  if (go) setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { } }, 2600); // the screen waits here until the person presses Get started
})(typeof window !== 'undefined' ? window : globalThis);
