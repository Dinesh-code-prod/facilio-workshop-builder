/* Product roadmap introduction: a short animated story shown right after sign-in (before the home page). Conceptual only: it never reads or shows project data.
   V.roadmap({ replay }) resolves when the person skips, finishes or continues. Persistence: "Don't show again" is a per-browser flag (localStorage);
   otherwise it appears after each fresh sign-in, never on refresh, and can be replayed from the account menu and the projects page. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews; const F = root.FWB; const esc = F.esc;
  const OFF = 'fwb_roadmap_off', SEEN = 'fwb_roadmap_seen';
  const get = (st, k) => { try { return root[st].getItem(k); } catch (e) { return null; } };
  const set = (st, k, v) => { try { root[st].setItem(k, v); } catch (e) { } };
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const automated = () => !!(root.navigator && root.navigator.webdriver) && !/[?&]roadmap=1\b/.test(root.location.search + root.location.hash);
  // should the roadmap run after this sign-in?
  V.roadmapDue = function (opts) {
    if (automated()) return false; if (get('localStorage', OFF) === '1') return false;
    if (opts && opts.once && get('sessionStorage', SEEN) === '1') return false; return true;
  };
  const isClient = () => !!(F.S && F.S.user && F.S.user.kind === 'customer');
  const SCENES_T = [
    { t: 'Bringing Every Project Into Focus.', ms: 3800 },
    { t: 'From scattered information to a connected journey.', ms: 4600 },
    { t: 'One place to organize, plan, and move forward.', ms: 4600 },
    { t: 'Plan with clarity. Collaborate with confidence. Deliver with purpose.', ms: 5000 },
    { t: 'Your journey starts here.', ms: 0 }
  ];
  const SCENES_C = [
    { t: 'Your project, all in one place.', ms: 3800 },
    { t: 'Your contract, scope and plan, clear from day one.', ms: 4600 },
    { t: 'Join the workshops and see what is decided as it happens.', ms: 4600 },
    { t: 'Review and confirm your requirements with confidence.', ms: 5000 },
    { t: 'Welcome to your project.', ms: 0 }
  ];
  const CARDS_T = [['Contract', '#0a7aff'], ['Requirements', '#ed168b'], ['Notes', '#24216f'], ['Project plan', '#0a7aff'], ['Schedule', '#24216f'], ['User guide', '#ed168b']];
  const CARDS_C = [['Your contract', '#0a7aff'], ['Scope', '#ed168b'], ['Workshops', '#24216f'], ['Requirements', '#0a7aff'], ['Project plan', '#24216f'], ['Your guide', '#ed168b']];
  const NODES_T = ['Plan', 'Collaborate', 'Deliver'], NODES_C = ['Understand', 'Review', 'Confirm'];
  const WIDE = { scatter: [[14, 18, -9], [60, 8, 6], [86, 30, -4], [22, 68, 8], [55, 74, -7], [84, 64, 5]], grid: [[17, 12], [50, 9], [83, 12], [17, 60], [50, 63], [83, 60]], hub: [50, 36], ms: [20, 50, 80], msY: 85 };
  const NARROW = { scatter: [[20, 12, -9], [76, 9, 7], [78, 30, -5], [18, 45, 8], [62, 60, -6], [28, 70, 5]], grid: [[27, 9], [73, 9], [27, 24], [73, 24], [27, 58], [73, 58]], hub: [50, 41], ms: [20, 50, 80], msY: 86 };
  // illustrations per scene (files in public/brand/art) with two floating labels each
  const ART_C = [['a1', 'Your project', 'One shared workspace'], ['a6', 'Contract and scope', 'Always up to date', 'frame'], ['a3', 'Progress', 'See where things stand'], ['a5', 'Workshops', 'Your voice counts'], ['a7', 'Requirements', 'Review and confirm']];
  const ART_T = [['a1', 'Customer projects', 'One workspace each'], ['a6', 'Contracts and notes', 'All in one place', 'frame'], ['a3', 'Live dashboards', 'Requirements tracked'], ['a5', 'Workshops', 'Everyone aligned'], ['a7', 'BRD ready', 'AI-assisted']];
  const waitIntro = () => new Promise(res => { (function f() { if (!doc.querySelector('.intro')) res(); else setTimeout(f, 200); })(); });

  V.roadmap = async function (opts) {
    opts = opts || {}; await waitIntro();
    const cl = isClient(); const SCENES = cl ? SCENES_C : SCENES_T, CARDS = cl ? CARDS_C : CARDS_T, ART = cl ? ART_C : ART_T, NODES = cl ? NODES_C : NODES_T;
    return new Promise(resolve => {
      const still = reduce(); let n = 0, done = false, timer = null; const narrow = () => root.innerWidth < 700;
      const o = doc.createElement('div'); o.className = 'rm'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Product introduction');
      o.innerHTML = `<div class="rm-bg" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div><div class="rm-top"><img src="brand/logo-navy.png" alt="Facilio" height="20"><div class="rm-prog" aria-hidden="true">${SCENES.map(() => '<i><b></b></i>').join('')}</div><button type="button" class="rm-skip" data-r="skip">Skip introduction</button></div>
        <div class="rm-body"><div class="rm-stage" aria-hidden="true"><svg class="rm-lines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div class="rm-frame"></div>
          <div class="rm-focus"><img src="brand/logo-navy.png" alt=""><b class="rm-under"></b><span class="rm-shine"></span><u></u><u></u><u></u><u></u><u></u></div>
          <div class="rm-burst">${Array.from({ length: 16 }, (_, i) => `<u style="--a:${i * 22.5}deg;--d:${(i % 4) * .08}s;--c:${['#0a7aff', '#24216f', '#ed168b', '#0057d9'][i % 4]}"></u>`).join('')}</div><div class="rm-hub"><img src="brand/logo-navy.png" alt=""><span>${cl ? 'Your project' : 'Workspace'}</span></div>
          ${CARDS.map(([t, c], i) => `<div class="rm-card" data-i="${i}" style="--c:${c}"><div class="rm-in"><b><i></i>${esc(t)}</b><u></u><u class="s"></u></div></div>`).join('')}
          <div class="rm-ms">${NODES.map((t, i) => `<div class="rm-node" data-k="${i}"><i></i><span>${t}</span></div>`).join('')}</div></div>
          <div class="rm-art" aria-hidden="true">${ART.map(([f, a, b, fr], i) => `<figure data-i="${i}" class="${fr || ''}"><i class="halo"></i><img src="brand/art/${f}.webp" alt="" width="460" decoding="async"><span class="chip c1">${esc(a)}</span><span class="chip c2">${esc(b)}</span></figure>`).join('')}</div></div>
        <div class="rm-cap"><h2 id="rmCap" aria-live="polite"></h2><div class="rm-act"><button type="button" class="btn primary lg rm-go" data-r="go">${cl ? 'Continue to your project' : 'Continue to Workspace'}</button><label class="rm-off"><input type="checkbox" id="rmOff"> ${cl ? 'Do not show this introduction again' : 'Do not show this introduction after sign-in'}</label></div></div>`;
      doc.body.appendChild(o); doc.body.classList.add('rm-on');
      const stage = o.querySelector('.rm-stage'), cards = [...o.querySelectorAll('.rm-card')], lines = o.querySelector('.rm-lines'), cap = o.querySelector('#rmCap'), bars = [...o.querySelectorAll('.rm-prog i')];
      function layout(sc) {
        const T = narrow() ? NARROW : WIDE; stage.classList.toggle('narrow', narrow());
        cards.forEach((c, i) => {
          let x, y, r = 0, s = 1, op = 1;
          if (sc === 0) { x = T.hub[0]; y = T.hub[1]; s = .4; op = 0; } else if (sc === 1) { [x, y, r] = T.scatter[i]; } else { [x, y] = T.grid[i]; }
          c.style.left = x + '%'; c.style.top = y + '%'; c.style.opacity = op; c.style.transform = `translate(-50%,-50%) rotate(${r}deg) scale(${s})`; c.classList.toggle('float', sc === 1 && !still);
        });
        const T2 = T; lines.innerHTML = T2.grid.map(([x, y], i) => `<line x1="${T2.hub[0]}" y1="${T2.hub[1]}" x2="${x}" y2="${y}" pathLength="1" style="--d:${i * .12}s"/>`).join('') + `<line class="ms" x1="${T2.ms[0]}" y1="${T2.msY}" x2="${T2.ms[2]}" y2="${T2.msY}" pathLength="1"/>`;
        if (!still) { const w = stage.clientWidth || 900, h = stage.clientHeight || 500, rx = 4 / w * 100, ry = 4 / h * 100; lines.insertAdjacentHTML('beforeend', '<g class="pulses">' + T2.grid.map(([x, y], i) => `<ellipse rx="${rx}" ry="${ry}" fill="${CARDS[i][1]}"><animateMotion dur="${2.2 + (i % 3) * .5}s" begin="${i * .35}s" repeatCount="indefinite" path="M${T2.hub[0]} ${T2.hub[1]} L${x} ${y}"/></ellipse>`).join('') + '</g>'); }
        const hub = o.querySelector('.rm-hub'); hub.style.left = T.hub[0] + '%'; hub.style.top = T.hub[1] + '%';
        o.querySelectorAll('.rm-node').forEach((nd, k) => { nd.style.left = T.ms[k] + '%'; nd.style.top = T.msY + '%'; });
      }
      function scene(k) {
        n = k; o.setAttribute('data-s', String(k + 1)); layout(k);
        cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = SCENES[k].t; cap.classList.add('in');
        bars.forEach((b, i) => { b.className = i < k ? 'full' : i === k ? 'run' : ''; if (i === k) b.style.setProperty('--ms', (SCENES[k].ms || 0) + 'ms'); });
        if (k === SCENES.length - 1) { o.classList.add('last'); const g = o.querySelector('.rm-go'); setTimeout(() => g && g.focus(), 300); }
      }
      function advance() { if (done) return; if (n >= SCENES.length - 1) return; scene(n + 1); if (n < SCENES.length - 1) timer = setTimeout(advance, SCENES[n].ms); }
      function finish(how) {
        if (done) return; done = true; clearTimeout(timer); const off = o.querySelector('#rmOff'); if (off && off.checked) set('localStorage', OFF, '1'); set('sessionStorage', SEEN, '1');
        o.classList.add('out'); doc.body.classList.remove('rm-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', onResize); setTimeout(() => o.remove(), 500); resolve(how);
      }
      const key = e => { if (e.key === 'Escape') finish('skip'); else if (e.key === 'Enter' && o.classList.contains('last') && doc.activeElement && doc.activeElement.tagName !== 'INPUT') finish('go'); };
      const onResize = () => layout(n);
      o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) finish(b.getAttribute('data-r')); });
      root.addEventListener('keydown', key); root.addEventListener('resize', onResize);
      if (still) { o.classList.add('still'); scene(SCENES.length - 1); bars.forEach(b => { b.className = 'full'; }); return; }
      scene(0); timer = setTimeout(advance, SCENES[0].ms);
      o.querySelector('.rm-skip').focus();
    });
  };
  // replay on request (ignores the "don't show again" flag)
  V.ACT.replayRoadmap = async () => { const p = doc.getElementById('userPop'); if (p) p.remove(); await V.roadmap({ replay: true }); };
})(typeof window !== 'undefined' ? window : globalThis);
