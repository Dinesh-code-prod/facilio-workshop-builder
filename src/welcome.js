/* Customer introduction ("Welcome") page, reachable on its own at  #/welcome.
   Written from the customer's point of view: the challenges they may face, how Delivery Studio helps, what to expect in four phases, and how they know they are ready for go-live.
   Static content only (no project data, no API calls, no sign-in bypass), so the same page serves every customer.
   Four small Lottie animations (brand/lottie/welcome-*.json, made by tools/make-welcome-lottie.mjs) each explain one benefit and play once when their section scrolls into view.
   Every animation slot starts as a static SVG of its finished state, so the page reads fully with motion off, with reduced-motion set, or if Lottie fails to load.
   The tree-growth animation (V.treeIntro) stays available as an optional extra. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {}; const ACT = V.ACT = V.ACT || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Each benefit: the animation that shows it, a heading, and two customer problems paired with the help they get.
  const BENEFITS = [
    { lt: 'welcome-organise', h: 'Keep everything in one place', c: '#1570EF', pairs: [
      ['Information is spread across emails and documents', 'Project information, decisions and deliverables are kept together, so you always know where to look.'],
      ['Requirements get lost after workshops', 'What was agreed in a workshop stays connected to the requirements and documents that follow from it.']] },
    { lt: 'welcome-visibility', h: 'See where you stand', c: '#17B3AE', pairs: [
      ['It is hard to see what is done and what is not', 'A clear overview shows what has been completed and what still needs attention.'],
      ['It is unclear who needs to do what next', 'Next steps and the information you are asked to provide are easier to find and understand.']] },
    { lt: 'welcome-coordinate', h: 'Work through issues together', c: '#E5197F', pairs: [
      ['Testing and fixing issues is difficult to follow', 'Validation activities and open issues are organised, so you can see what is being checked and what is outstanding.'],
      ['It is uncertain whether you are ready to go live', 'Readiness, training, remaining tasks and handover expectations are laid out before launch day.']] }
  ];
  const PHASES = [
    ['Get ready', 'Understand the goals, prepare information, identify stakeholders and align on expectations.', '#E8F0FF', '#2455B7', 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z'],
    ['Shape your solution', 'Discuss requirements, confirm how your teams work, and agree on the solution and expected outcomes.', '#E7F7F3', '#168A79', 'M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5'],
    ['Validate and prepare', 'Review the configured solution, test important workflows, resolve issues and prepare your users.', '#F1EBFF', '#7952C7', 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4'],
    ['Go live with confidence', 'Confirm readiness, launch, receive early support and move into regular operations.', '#FFF0F6', '#C52A78', 'M5 15c-1 3-1 5-1 5s2 0 5-1M14 4c3 0 6 0 6 0s0 3 0 6c-2 4-6 7-9 8l-5-5c1-3 4-7 8-9zM15 9h.01']
  ];
  const svg = (d, c, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const slot = (lt, alt) => `<div class="wl-lt" data-lt="${lt}" role="img" aria-label="${esc(alt)}"><img src="brand/lottie/${lt}.svg" alt="" width="400" height="240" decoding="async"></div>`;

  function html() {
    return `<header class="wl-top"><img src="brand/logo-white.png" alt="Facilio" height="26"><span class="wl-sep"></span><span class="wl-prod">Delivery Studio</span>
      <nav class="wl-nav" aria-label="Sections"><a href="#/welcome" data-act="wlGo" data-to="wl-help">How we help</a><a href="#/welcome" data-act="wlGo" data-to="wl-journey">Your journey</a></nav>
      <button class="wl-btn ghost" type="button" data-act="wlClose">Sign in</button></header>
    <main class="wl-main" id="wlMain">
      <section class="wl-hero"><div class="wl-sky" aria-hidden="true"></div><div class="wl-hero-in">
        <h1>Your Facilio journey, from kick-off to go-live, <em>made simpler</em></h1>
        <p class="wl-lead">Know what to expect, understand what you need to prepare, track your progress, and move confidently toward a successful go-live.</p>
        <div class="wl-cta"><button class="wl-btn primary" type="button" data-act="wlGo" data-to="wl-journey">Explore your journey</button></div></div></section>
      <section class="wl-sec" id="wl-help"><h2>Challenges you may face, and how Delivery Studio helps</h2><p class="wl-sub">Implementations are easier when information, progress and next steps are clear to everyone involved.</p>
        ${BENEFITS.map((b, i) => `<div class="wl-row${i % 2 ? ' flip' : ''}" style="--kc:${b.c}">
          <div class="wl-viz">${slot(b.lt, b.h)}</div>
          <div class="wl-txt"><h3>${esc(b.h)}</h3>${b.pairs.map(p => `<div class="wl-pair"><p class="wl-prob">${esc(p[0])}</p><p class="wl-help"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg><span>${esc(p[1])}</span></p></div>`).join('')}</div></div>`).join('')}</section>
      <section class="wl-sec alt" id="wl-journey"><h2>What to expect along the way</h2><p class="wl-sub">Four phases take you from kick-off to a confident go-live. The activities inside each phase vary by project.</p>
        <div class="wl-jwrap"><ol class="wl-phases">${PHASES.map((p, i) => `<li><span class="wl-pi" style="background:${p[2]}">${svg(p[4], p[3])}</span><div><h3><i>${i + 1}</i>${esc(p[0])}</h3><p>${esc(p[1])}</p></div></li>`).join('')}</ol>
          <div class="wl-viz wl-jviz">${slot('welcome-golive', 'A readiness checklist is completed and the project is ready to go live')}<button class="wl-btn line sm" type="button" data-act="wlTree">Watch the tree-growth animation</button></div></div></section>
      <section class="wl-end"><h2>Ready when you are</h2><p>Sign in to see your own project, your next steps and your progress.</p><button class="wl-btn primary" type="button" data-act="wlClose">Open workspace</button></section>
      <footer class="wl-foot">Customer data is stored privately per project and is only available to project members.</footer>
    </main>`;
  }
  let el = null, io = null; const live = [];
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function run(s) {
    if (s.__r || reduce() || !V.lottiePlay) return; s.__r = 1;
    V.lottiePlay(s, s.getAttribute('data-lt'), { path: 'brand/lottie/' + s.getAttribute('data-lt') + '.json?v=71' }).then(a => { if (!a) return; live.push(a); a.addEventListener('DOMLoaded', () => s.classList.add('on')); /* the animation stops on its finished frame and stays there; nothing runs after it ends */ });
  }
  function mount() {
    if (el) return; el = doc.createElement('div'); el.className = 'wl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Introduction to Facilio Delivery Studio'); el.innerHTML = html();
    doc.body.appendChild(el); doc.body.classList.add('wl-on'); doc.title = 'Facilio Delivery Studio - introduction';
    const items = el.querySelectorAll('.wl-row, .wl-phases, .wl-end, .wl-hero');
    if (reduce() || !root.IntersectionObserver) items.forEach(c => c.classList.add('in'));
    else { io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); e.target.querySelectorAll('.wl-lt').forEach(run); const jz = e.target.classList.contains('wl-phases') && el.querySelector('.wl-jviz .wl-lt'); if (jz) run(jz); io.unobserve(e.target); }), { root: el, threshold: .3 }); items.forEach(c => io.observe(c)); }
    root.requestAnimationFrame(() => el.classList.add('on'));
  }
  function close() {
    if (!el) return; if (io) io.disconnect(); io = null; live.splice(0).forEach(a => { try { a.destroy(); } catch (e) { } });
    el.remove(); el = null; doc.body.classList.remove('wl-on'); doc.title = 'Facilio Delivery Studio';
    try { if (/#\/welcome/.test(root.location.hash)) root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) { }
  }
  V.welcome = { html, open: mount, close };
  ACT.openWelcome = () => { try { root.history.replaceState(null, '', '#/welcome'); } catch (e) { } mount(); };
  ACT.wlClose = close;
  ACT.wlGo = a => { const t = el && el.querySelector('#' + a.getAttribute('data-to')); if (t) t.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); };
  ACT.wlTree = () => { if (V.treeIntro) V.treeIntro({ aud: 'public', cta: 'Get started', liquid: true }).then(() => close()); };   // Get started pours the liquid reveal straight into the sign-in page
  const check = () => { if (/#\/welcome\b/.test(root.location.hash)) mount(); else if (el) close(); };
  root.addEventListener('hashchange', check);
  setTimeout(check, 0);
})(typeof window !== 'undefined' ? window : globalThis);
