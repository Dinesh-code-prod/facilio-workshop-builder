/* Customer-facing introduction ("Welcome" page): what Delivery Studio does, the problems it solves, and the 12-stage journey.
   Static content only: no project data, no API calls, so it can be previewed on its own at  #/welcome  without touching a project or bypassing sign-in.
   It is one reusable component (V.welcome) - the same page serves every customer, so nothing has to be built per project.
   The tree-growth animation (V.treeIntro) stays available from it as "Watch the journey". */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {}; const ACT = V.ACT = V.ACT || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // problem -> what Delivery Studio does about it. `bits` are the scattered items that settle into one list.
  const PROBLEMS = [
    ['Information is scattered', 'Contracts, decks, plans, notes and decisions live in different places, so nobody has the full picture.',
      'One workspace per project', 'Everything for your implementation sits in one place, and every number opens the records behind it.', ['Contract', 'Kick-off deck', 'Decisions']],
    ['Progress is hard to see', 'It is unclear what is done, what is blocked and what is waiting on whom.',
      'A live view of all 12 stages', 'Progress, dependencies, risks and pending actions are tracked against the delivery plan, with the current stage always clear.', ['Plan', 'Risks', 'Actions']],
    ['Workshop outcomes get lost', 'Good discussions turn into notes that never become agreed requirements.',
      'From discussion to agreed requirement', 'Workshop transcripts are turned into requirements and use cases. You confirm each one, and they flow into the BRD for sign-off.', ['Transcript', 'Requirement', 'Use case']],
    ['Testing is hard to coordinate', 'Configuration, UAT and defect fixing run in parallel and are tracked in spreadsheets.',
      'Build, UAT and defects in one flow', 'Every test and defect has an owner and a status from raised to resolved, so you can see exactly what stands between you and go-live.', ['Config', 'UAT', 'Defect']],
    ['Documents are prepared by hand', 'Reports, BRDs and user guides take days to assemble and go out of date.',
      'Documents built from the project record', 'The BRD, status reports, FTR and KPI workbooks and customer user guides are generated from what has already been captured.', ['BRD', 'Report', 'User guide']],
    ['Go-live and handover are unclear', 'It is not obvious when you are ready, who supports what afterwards, or when the project is closed.',
      'Clear readiness, handover and closure', 'Readiness checks, hypercare and handover responsibilities are agreed in the open, and closure is recorded when the work is done.', ['Readiness', 'Hypercare', 'Handover']]
  ];
  const STAGES = ['Kick-off & Discovery', 'Workshops', 'Requirements', 'BRD & Sign-off', 'Configuration & Implementation', 'FTR & KPI Validation', 'UAT & Defect Management', 'Customer Training & User Guides', 'Go-Live Readiness', 'Hypercare', 'Support Transition & Handover', 'Project Closure'];
  const ICON = ['M4 5h16M4 12h10M4 19h16', 'M4 19V9m6 10V5m6 14v-7m4 7H2', 'M5 4h14v16H5zM9 9h6M9 13h6', 'M4 12l5 5L20 6', 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18', 'M5 4h10l4 4v12H5zM9 13l2 2 4-4'];

  function html() {
    return `<header class="wl-top"><img src="brand/logo-white.png" alt="Facilio" height="26"><span class="wl-sep"></span><span class="wl-prod">Delivery Studio</span>
      <nav class="wl-nav" aria-label="Sections"><a href="#/welcome" data-act="wlGo" data-to="wl-problems">What it solves</a><a href="#/welcome" data-act="wlGo" data-to="wl-journey">The journey</a></nav>
      <button class="wl-btn ghost" type="button" data-act="wlClose">Sign in</button></header>
    <main class="wl-main" id="wlMain">
      <section class="wl-hero"><div class="wl-sky" aria-hidden="true"></div>
        <div class="wl-hero-in"><p class="wl-kicker">For Facilio customers</p><h1>Your Facilio implementation, <em>in one place</em></h1>
          <p class="wl-lead">Delivery Studio brings every workshop, decision, document and milestone of your project together, so you always know where things stand and what happens next.</p>
          <div class="wl-cta"><button class="wl-btn primary" type="button" data-act="wlGo" data-to="wl-problems">See how it helps</button><button class="wl-btn ghost" type="button" data-act="wlTree"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Watch the journey</button></div></div>
        <ol class="wl-stripe" aria-label="Project journey">${STAGES.map((s, i) => `<li style="--i:${i}"><b>${i + 1}</b><span>${esc(s)}</span></li>`).join('')}</ol>
      </section>
      <section class="wl-sec" id="wl-problems"><h2>Common challenges, and how Delivery Studio helps</h2><p class="wl-sub">Six things that slow down implementations, and what changes when your project runs in one workspace.</p>
        <div class="wl-grid">${PROBLEMS.map((p, i) => `<article class="wl-card" style="--kc:${['#1D1A5E', '#1570EF', '#E5A400', '#E5197F', '#17B3AE', '#6B4EE6'][i]}">
          <div class="wl-viz" aria-hidden="true">${p[4].map((b, j) => `<i style="--j:${j}">${esc(b)}</i>`).join('')}</div>
          <h3><span class="wl-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[i]}"/></svg></span>${esc(p[0])}</h3>
          <p class="wl-prob">${esc(p[1])}</p><div class="wl-sol"><b>${esc(p[2])}</b><p>${esc(p[3])}</p></div></article>`).join('')}</div></section>
      <section class="wl-sec alt" id="wl-journey"><h2>One journey, from kick-off to closure</h2><p class="wl-sub">Every project follows the same twelve stages. This shows how a delivery is structured; it is not the status of any project.</p>
        <ol class="wl-steps">${STAGES.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s)}</span></li>`).join('')}</ol>
        <div class="wl-cta c"><button class="wl-btn primary dark" type="button" data-act="wlTree">Watch the tree grow</button><button class="wl-btn line" type="button" data-act="wlClose">Sign in to your workspace</button></div></section>
      <footer class="wl-foot">Customer data is stored privately per project and is only available to project members.</footer>
    </main>`;
  }
  let el = null, io = null;
  function mount() {
    if (el) return; el = doc.createElement('div'); el.className = 'wl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Introduction to Facilio Delivery Studio'); el.innerHTML = html();
    doc.body.appendChild(el); doc.body.classList.add('wl-on'); doc.title = 'Facilio Delivery Studio - introduction';
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = el.querySelectorAll('.wl-card, .wl-steps, .wl-hero');
    if (reduce || !root.IntersectionObserver) cards.forEach(c => c.classList.add('in'));
    else { io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: el, threshold: .25 }); cards.forEach(c => io.observe(c)); }
    root.requestAnimationFrame(() => el.classList.add('on'));
  }
  function close() {
    if (!el) return; if (io) io.disconnect(); io = null; el.remove(); el = null; doc.body.classList.remove('wl-on'); doc.title = 'Facilio Delivery Studio';
    try { if (/#\/welcome/.test(root.location.hash)) root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { }
  }
  V.welcome = { html, open: mount, close };
  ACT.openWelcome = () => { try { root.history.replaceState(null, '', '#/welcome'); } catch (e) { } mount(); };
  ACT.wlClose = close;
  ACT.wlGo = a => { const t = el && el.querySelector('#' + a.getAttribute('data-to')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  ACT.wlTree = () => { if (V.treeIntro) V.treeIntro({ aud: 'public', cta: 'Back to the overview' }).then(() => { }); };
  const check = () => { if (/#\/welcome\b/.test(root.location.hash)) mount(); else if (el) close(); };
  root.addEventListener('hashchange', check);
  setTimeout(check, 0);
})(typeof window !== 'undefined' ? window : globalThis);
