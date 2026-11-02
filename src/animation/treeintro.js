/* Tree-growth introduction: one continuous animation. A Facilio seed (the logo's two squares) drops into the ground, roots spread, a tree grows through the twelve
   delivery stages (each label sits beside its marker on the tree), then the Facilio Delivery Studio brand and Get Started appear.
   V.treeIntro(opts) has the same contract as V.cinema (opts: aud, name, cta, off, wipe) and resolves { how: 'go' | 'skip', off }.
   Nothing here reads project data; the stage timing is illustrative only. Canvas 2D, no filters, paused while the tab is hidden, simplified when reduced motion is on.
   V.cinema uses this by default; the earlier five-scene engine is kept as V.cinemaClassic (add ?intro=classic, or set localStorage fwb_intro_classic=1). */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  if (root.CanvasRenderingContext2D && !root.CanvasRenderingContext2D.prototype.__arcSafe) { const P = root.CanvasRenderingContext2D.prototype, arc = P.arc, ell = P.ellipse; P.arc = function (x, y, r, ...a) { return arc.call(this, x, y, r < 0 ? 0 : r, ...a); }; P.ellipse = function (x, y, rx, ry, ...a) { return ell.call(this, x, y, rx < 0 ? 0 : rx, ry < 0 ? 0 : ry, ...a); }; const rg = P.createRadialGradient; P.createRadialGradient = function (x0, y0, r0, x1, y1, r1) { return rg.call(this, x0, y0, r0 < 0 ? 0 : r0, x1, y1, r1 < 0 ? 0 : r1); }; P.__arcSafe = true; }
  const V = root.FWBViews; const F = root.FWB; const esc = F.esc;
  const reduceMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  V.treeIntro = function (opts) {
    opts = opts || {}; const reduce = reduceMotion();
    return new Promise(resolve => {
      const o = doc.createElement('div'); o.className = 'cn ti' + (reduce ? ' still' : '') + (opts.wipe ? ' auto' : ''); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Facilio Delivery Studio introduction');
      const nm = String(opts.name || '').split(' ')[0];
      o.innerHTML = `<canvas aria-hidden="true"></canvas>
        <div class="top"><img src="brand/logo-white.png" alt="Facilio" height="26"><span class="sep"></span><span class="prod">Delivery Studio</span><div class="bars" data-i="bars" role="group" aria-label="Intro progress"></div><button type="button" class="skip" data-i="skip" data-r="skip">Skip</button></div>
        <div class="head" data-i="head"><div class="h1" data-i="lh1"></div><div class="h2" data-i="lh2"></div></div>
        <div data-i="labels" class="labels"></div>
        <div class="sr" data-i="sr" aria-live="polite"></div>
        <div class="brand" data-i="brand">${nm ? `<p class="hello">Welcome, ${esc(nm)}</p>` : ''}<img src="brand/logo-white.png" alt="Facilio" width="320" height="88"><div class="ds">Delivery Studio</div><div class="tagl" aria-label="Capture. Configure. Go live."><span>Capture.</span><span>Configure.</span><span>Go live.</span></div><button type="button" class="go" data-i="go" data-r="go">${esc(opts.cta || 'Get started')}</button>${opts.off ? '<label class="ti-off"><input type="checkbox" id="tiOff"> Do not show this introduction again</label>' : ''}</div>
        <div class="fade"></div>`;

      const AUTO = !!opts.wipe && !opts.liquid;   // liquid: the tree finishes on the brand + Get started screen, and Get started pours the Facilio liquid reveal into the next page   // opening page: the tree's leaves open straight into the sign-in page (no brand screen). Roadmap after sign-in keeps the brand + Get started ending.
      /* ---------- the 12 delivery stages ---------- */
      const STAGES = [
        ['Project Kick-off & Discovery', 'Establish the project vision, scope, stakeholders, and delivery approach.'],
        ['Workshops', 'Capture business processes, expectations, and implementation needs.'],
        ['Requirements', 'Organize business needs into clear, actionable requirements.'],
        ['BRD & Sign-off', 'Review and approve the documented requirements.'],
        ['Configuration & Implementation', 'Configure the solution to match agreed requirements.'],
        ['FTR & KPI Validation', 'Validate functional readiness and agreed performance measures.'],
        ['UAT & Defect Management', 'Validate the solution and resolve identified issues.'],
        ['Customer Training & User Guides', 'Prepare users to work confidently with the solution.'],
        ['Go-Live Readiness', 'Confirm readiness for production launch.'],
        ['Hypercare', 'Provide focused support following go-live.'],
        ['Support Transition & Handover', 'Transfer operational knowledge, documentation, and responsibilities.'],
        ['Project Closure', 'Confirm completion and formally close the implementation.']
      ];
      // when each stage becomes the active one (seconds). Every stage owns one visible growth event:
      // 1 seed drops in · 2 roots spread · 3 trunk rises · 4 trunk thickens/foundation ring · 5 primary branches · 6 secondary branches
      // 7 connection nodes + links · 8 leaves unfold · 9 canopy fills · 10 tree steadies, links pulse · 11 maturity, camera eases back · 12 whole ecosystem lit
      const S = [0.6, 5.0, 8.8, 11.9, 14.4, 17.6, 20.6, 23.6, 26.6, 29.4, 32.2, 35.0];
      const PHASES = [ // start, end, headline, sub
        [0, 5.0, 'Every project starts with a seed', 'Kick-off & Discovery'],
        [5.0, 14.4, 'Strong roots, a steady trunk', 'Workshops · Requirements · BRD sign-off'],
        [14.4, 26.6, 'Branching into the build', 'Configuration · FTR · UAT · Training'],
        [26.6, 38.2, 'Fully grown', 'Go-live · Hypercare · Handover · Closure'],
        [38.2, 44, 'Twelve stages, one connected journey', 'From kick-off to closure']
      ];
      const END = AUTO ? 38 : 44, REVEAL = AUTO ? 1e9 : 38.2;
      // real seconds -> timeline seconds. The whole intro is about 6.8s: growth 5s, then (opening page) the leaves open into the sign-in page in about 1.8s.
      const TK = AUTO ? 4.05 : 2.7, TR = 4.6 * TK; let WPTS = (AUTO ? [[0, 0], [1.1, 5], [2.2, 14.4], [3.4, 26.6], [4.6, 38]] : [[0, 0], [1.2, 5], [2.4, 14.4], [3.7, 26.6], [5.0, 38.2], [6.8, 44]]).map(([c, t]) => [c * TK, t]);
      // real seconds -> timeline: a monotone cubic (Fritsch-Carlson) through the pacing keyframes. A straight line between them made the growth speed
      // change abruptly at every keyframe, which reads as a stutter; this keeps the speed continuous and still passes exactly through each keyframe.
      let WM = [];
      const wslopes = () => { const n = WPTS.length, d = []; for (let i = 0; i < n - 1; i++) d.push((WPTS[i + 1][1] - WPTS[i][1]) / (WPTS[i + 1][0] - WPTS[i][0]));
        WM = WPTS.map((_, i) => i === 0 ? d[0] : i === n - 1 ? d[n - 2] * .35 : d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i])); };
      wslopes();
      const warp = c => { if (c <= 0) return 0; for (let i = 1; i < WPTS.length; i++) if (c <= WPTS[i][0]) { const a = WPTS[i - 1], b = WPTS[i], h = b[0] - a[0], u = (c - a[0]) / h, u2 = u * u, u3 = u2 * u;
          return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * h * WM[i - 1] + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * h * WM[i]; } return WPTS[WPTS.length - 1][1]; };
      const unwarp = t => { let lo = 0, hi = WPTS[WPTS.length - 1][0]; if (t >= WPTS[WPTS.length - 1][1]) return hi; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (warp(m) < t) lo = m; else hi = m; } return (lo + hi) / 2; };   // inverse of the smooth warp (it is monotone)
      let CLK = 0, LO = -1, HOLES = [], LCX = 0, LCY = 0, LSC = 1, HOLD = false;   // CLK real clock, LO leaf-opening clock (-1 until it starts)
      const TAU = Math.PI * 2;
      let EXX = 0, EXT = 0, EXL = null;   // exit: EXX slides the whole scene left, EXT is the exit clock that frees the leaves one by one
      const rm = reduce;

      /* ---------- helpers ---------- */
      const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
      const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
      const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
      const easeIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
      const backOut = x => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
      const lerp = (a, b, t) => a + (b - a) * t;
      function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
      const R = rng(20261024);
      const rr = (a, b) => a + (b - a) * R();

      /* ---------- build the tree (deterministic) ---------- */
      const N = 14; // samples per branch
      const branches = [], roots = [], leaves = [];
      const DUR = [4.4, 5.2, 4.0, 3.2, 2.6, 2.2];
      function mk(list, x, y, ang, len, w, depth, t0, dur, tint, bend) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const px = -dy, py = dx; let b = (bend === undefined ? rr(-.24, .24) : bend) * len;
        if (list === branches && depth >= 1) b = Math.abs(b) * (py > 0 ? -1 : 1);   // lift the middle of every limb, never sag
        const p0 = [x, y], p2 = [x + dx * len, y + dy * len], c = [x + dx * len * .5 + px * b, y + dy * len * .5 + py * b];
        const pts = [], ws = [];
        for (let i = 0; i <= N; i++) {
          const s = i / N, u = 1 - s; let X = u * u * p0[0] + 2 * u * s * c[0] + s * s * p2[0], Y = u * u * p0[1] + 2 * u * s * c[1] + s * s * p2[1];
          if (depth >= 1 && i > 0 && i < N) { const j = (R() - .5) * len * .03; X += px * j; Y += py * j; } // tiny wobble: nothing in nature is a clean curve
          pts.push([X, Y]); ws.push(lerp(w, w * .42, Math.pow(s, .85)));
        }
        const br = { pts, ws, t0, dur, depth, ang, len, w, tint, kids: [], tip: p2 };
        list.push(br); return br;
      }
      const at = (br, f) => { const s = f * N, i = Math.min(N - 1, Math.floor(s)), k = s - i; return [lerp(br.pts[i][0], br.pts[i + 1][0], k), lerp(br.pts[i][1], br.pts[i + 1][1], k), lerp(br.ws[i], br.ws[i + 1], k), Math.atan2(br.pts[i + 1][1] - br.pts[i][1], br.pts[i + 1][0] - br.pts[i][0])]; };
      const tAt = (b, f) => b.t0 + f * b.dur * .85 + .2; // roughly when growth reaches fraction f of a branch
      const UP = -Math.PI / 2;
      function grow(parent, maxDepth) {
        const d = parent.depth + 1; if (d > maxDepth) return;
        let spec; // [fraction, side, angleOffset, lenFactor]
        if (d === 1) spec = [[.5, -1, 52, .8], [.62, 1, 50, .84], [.74, -1, 40, .92], [.85, 1, 38, .96], [1, -1, 26, 1], [1, 1, 24, .98], [.96, -1, 8, .9]];
        else if (d === 2) spec = [[.3, -1, 50, .6], [.52, 1, 46, .58], [.74, -1, 40, .54], [1, 1, 22, .56]];
        else if (d === 3) spec = [[.45, -1, 46, .66], [.75, 1, 40, .62], [1, -1, 24, .66]];
        else if (d === 5) spec = [[1, -1, 30, .7]];
        else spec = [[.55, 1, 44, .66], [1, -1, 26, .7]];
        spec.forEach(([f, side, a, lf], k) => {
          const s = at(parent, f); let ang = s[3] + side * (a + rr(-16, 16)) * Math.PI / 180;
          ang = ang * .8 + UP * .2;
          if (Math.sin(ang) > -(d === 1 ? .1 : .16)) { const el = rr(d === 1 ? .1 : .16, .6); ang = Math.cos(ang) >= 0 ? -el : -(Math.PI - el); }   // keep every branch growing up and out // tropism: lean toward the light
          const len = parent.len * lf * rr(.78, 1.2);
          // primary branches wait for stage 5 and then sprout from the finished trunk, lowest first; everything else starts where its parent has got to
          const t0 = d === 1 ? S[4] + .1 + k * .3 : parent.t0 + f * parent.dur - .12;
          const kid = mk(branches, s[0], s[1], ang, len, Math.max(2.4, s[2] * (d === 1 ? .6 : .8)), d, t0, DUR[d] * rr(.9, 1.1) * (len / 220 > 1 ? 1.1 : 1), 0);
          parent.kids.push(kid); grow(kid, maxDepth);
        });
      }
      const trunk = mk(branches, 0, 0, UP, 300, 84, 0, S[2], DUR[0], 0, .06);
      grow(trunk, 5);
      // roots (stage 2)
      const tap = mk(roots, 0, 12, Math.PI / 2, 190, 22, 0, S[1], 5.2, 1, 0.02);
      (function growRoots(p, depth) {
        if (depth >= 3) return; const spec = depth === 0 ? [[.2, -1, 64, .66], [.3, 1, 60, .66], [.46, -1, 52, .6], [.6, 1, 50, .56], [.8, -1, 40, .5], [1, 1, 28, .5]] : [[.4, -1, 46, .64], [.8, 1, 40, .6], [1, -1, 22, .6]];
        for (const [f, side, a, lf] of spec) { const s = at(p, f); const ang = s[3] + side * (a + rr(-8, 8)) * Math.PI / 180; const len = p.len * lf * rr(.9, 1.1); const k = mk(roots, s[0], s[1], ang, len, Math.max(1.4, s[2] * .62), depth + 1, p.t0 + f * p.dur, DUR[depth + 2] * 1.1, 1); growRoots(k, depth + 1); }
      })(tap, 0);
      // leaves: a fan of separate, outlined leaves on each outer twig (oak, ovate and slender shapes in the logo colours), darker on the underside of the crown.
      // They start to unfold in stage 8 (first wave) and stage 9 (second wave, a fuller canopy)
      const LC = ['#1570EF', '#1570EF', '#2F86FF', '#2F86FF', '#33C9C9', '#33C9C9', '#E5197F', '#8DB8FF', '#EAF2FF'];
      const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), d = [11, 22, 80]; const f = (c, i) => Math.round(c + (d[i] - c) * k); return 'rgb(' + f(n >> 16, 0) + ',' + f((n >> 8) & 255, 1) + ',' + f(n & 255, 2) + ')'; };
      let TOPY = 0; for (const b of branches) for (const q of b.pts) TOPY = Math.min(TOPY, q[1]);
      for (const b of branches) {
        if (b.depth < 3 && !(b.depth === 2 && R() < .5)) continue;
        const n = b.depth >= 5 ? 3 : b.depth === 4 ? 4 : b.depth === 3 ? 4 : 3, spread = 2.4;   // about a fifth fewer leaves than before (smoother); each is a little larger to keep the canopy full
        for (const f of (b.depth >= 4 ? [.6, .92] : [.75])) { const s0 = at(b, f); if (s0[1] > -340) continue;
        for (let i = 0; i < n; i++) {
          const a0 = s0[3] + ((i + .5) / n - .5) * spread + rr(-.22, .22), off = rr(2, 22), x = s0[0] + Math.cos(a0) * off, y = s0[1] + Math.sin(a0) * off;
          const u = clamp((y - TOPY) / (-TOPY + 160)), tone = Math.round(clamp(u * .55 + rr(0, .14)) * 3) / 3 * .5;
          const col = shade(LC[(R() * LC.length) | 0], tone);
          const waveB = b.depth >= 4 ? R() < .7 : R() < .4;
          const base = tAt(b, f) + .3, when = (waveB ? S[8] + .2 : S[7] + .2) + R() * 3.4;
          leaves.push({ x, y, ang: a0 + rr(-.35, .35), size: rr(26, 40) * (b.depth >= 5 ? .9 : 1), col, shp: (R() * 3) | 0, t: Math.max(base, when), ph: R() * TAU, flip: i % 2 ? 1 : -1 });
        } }
      }
      leaves.sort((a, b) => a.t - b.t);
      let GROW_END = 0; for (const b of branches) GROW_END = Math.max(GROW_END, b.t0 + b.dur);

      let YMIN = 0; for (const b of branches) for (const q of b.pts) YMIN = Math.min(YMIN, q[1]);
      // milestone nodes — one per stage, placed where that stage's growth happens
      const nodes = [];
      const pushNode = (x, y, t, i) => nodes[i] = { x, y, t, i };
      pushNode(0, 46, 3.9, 0);                                    // 1 the seed marker, where the seed lies in the soil (lowest of all, so the stages climb the tree in order)
      pushNode(0, 6, S[1] + .6, 1);                                // 2 Workshops: centred under the trunk, at the root crown just above the roots
      { const s = at(trunk, .4); pushNode(s[0], s[1], Math.max(S[2] + .5, tAt(trunk, .4)), 2); }          // 3 the trunk
      { const s = at(trunk, .85); pushNode(s[0], s[1], Math.max(S[3] + .4, tAt(trunk, .85)), 3); }        // 4 the established structure
      for (let i = 4; i < 12; i++) {
        const side = i % 2 ? 1 : -1; let best = null, bs = 1e9;
        const dmin = i === 4 ? 1 : i === 5 ? 2 : i === 6 ? 2 : 3, dmax = i === 4 ? 1 : i === 5 ? 2 : i === 6 ? 3 : 4;
        const nt = S[i] + .5, target = lerp(-340, YMIN + 56, (i - 4) / 7), prevY = nodes[i - 1].y;
        for (const b of branches) {
          if (b.depth < dmin || b.depth > dmax) continue;
          for (const f of [.3, .5, .8, 1]) {
            const s = at(b, f), tn = tAt(b, f); if (Math.sign(s[0]) !== side || s[1] > prevY - 40) continue;   // each stage sits clearly higher than the one before
            let pen = Math.abs(s[1] - target) / 80 + Math.max(0, tn - (nt + .8)) * 6 + Math.max(0, tn - (S[i] + 2.6)) * 3;
            for (const n of nodes) if (n) { const d = Math.hypot(n.x - s[0], n.y - s[1]); if (d < 130) pen += (130 - d) / 10; }
            if (pen < bs) { bs = pen; best = { x: s[0], y: s[1], t: Math.max(nt, tn) }; }
          }
        }
        if (!best) { const yy = lerp(-340, YMIN + 56, (i - 4) / 7); best = { x: side * 70, y: yy, t: nt }; }
        pushNode(best.x, best.y, best.t, i);
      }
      nodes.forEach((n, i) => { n.t = Math.max(n.t, i ? nodes[i - 1].t + .5 : 0); });
      /* Pacing (brand ending): every stage gets the same real-time slot, measured from the moment its node appears on the tree, so each stage's info card
         is on screen long enough to read (stage 5 and 6 used to be skipped because their nodes appeared after the next stage had begun). */
      const SEED_S = 2.9, STEP_S = 1.75, LAST_S = 1.9, BRAND_S = 2.6;
      if (!AUTO) WPTS = [[0, 0]].concat(nodes.map((n, i) => [SEED_S + i * STEP_S, n.t + .15]), [[SEED_S + 11 * STEP_S + LAST_S, REVEAL], [SEED_S + 11 * STEP_S + LAST_S + BRAND_S, END]]); wslopes();

      // extra connection nodes (stage 7) and the links between them
      const links = [], lpts = [];
      {
        const cand = []; for (const b of branches) if (b.depth >= 1 && b.depth <= 3) { const s = at(b, .8); cand.push({ x: s[0], y: s[1], tn: tAt(b, .8) }); }
        for (let i = cand.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
        for (const c of cand) {
          if (c.y > -180 || lpts.length >= 22) continue; let ok = true;
          for (const p of lpts) if (Math.hypot(p.x - c.x, p.y - c.y) < 100) ok = false;
          for (const n of nodes) if (Math.hypot(n.x - c.x, n.y - c.y) < 80) ok = false;
          if (ok) lpts.push(c);
        }
        lpts.sort((a, b) => b.y - a.y);
        lpts.forEach((p, i) => { p.t = Math.max(S[6] + .3 + i * .13, p.tn + .3); p.ph = R() * TAU; });
        const seen = new Set();
        lpts.forEach((p, i) => {
          const near = lpts.map((q, j) => [Math.hypot(p.x - q.x, p.y - q.y), j]).filter(([d, j]) => j !== i && d < 270).sort((a, b) => a[0] - b[0]).slice(0, 2);
          for (const [, j] of near) { const key = Math.min(i, j) + '_' + Math.max(i, j); if (seen.has(key)) continue; seen.add(key); const q = lpts[j]; links.push({ a: p, b: q, t: Math.max(p.t, q.t) + .15, bow: (R() - .5) * .3 }); }
        });
      }

      /* ---------- stage labels: each one is pinned to its milestone node on the tree ---------- */
      const $ = id => o.querySelector('[data-i="' + id + '"]');
      const bars = $('bars'), labelsEl = $('labels');
      const SHORT = ['Kick-off & discovery', 'Workshops', 'Requirements', 'BRD & sign-off', 'Configuration', 'FTR & KPI validation', 'UAT & defects', 'Training & guides', 'Go-live readiness', 'Hypercare', 'Support handover', 'Project closure'];
      const TICK = '<svg viewBox="0 0 12 12"><path d="M2.4 6.4l2.5 2.5 4.7-5.2"/></svg>';
      const labels = STAGES.map(([t, d], i) => {
        const el = document.createElement('div'); el.className = 'lbl'; el.tabIndex = -1; el.setAttribute('role', 'button');
        el.setAttribute('aria-label', 'Stage ' + (i + 1) + ': ' + t);
        el.innerHTML = `<div class="in"><span class="n">${i + 1}</span><div><div class="t" data-no="${i + 1}">${SHORT[i]}</div><div class="d">${d}</div></div></div>`;
        el.addEventListener('click', () => seek(nodes[i].t + .2));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seek(nodes[i].t + .2); } });
        labelsEl.appendChild(el);
        return { el, i, state: '', w: 0, h: 0, x: 0, y: 0, vis: false, placed: false };
      });
      const barEls = PHASES.map((p, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Jump to part ' + (i + 1)); b.innerHTML = '<i></i>'; b.addEventListener('click', () => seek(p[0] + .01)); bars.appendChild(b); return b.firstChild; });

      /* ---------- canvas + layout + camera ---------- */
      const cv = o.querySelector('canvas'), g = cv.getContext('2d');
      const brand = $('brand'), head = $('head');
      const WIND = 120, QT = [1.5, 1, .75, .55], LSTEP = [1, 2, 3, 4], LGK = [1, 1.3, 1.5, 1.7];   // quality tiers: canvas scale, draw every n-th leaf, leaf size to compensate
      leaves.forEach((L, i) => { L.ix = i; });
      let ECOST = 0, EDT = 0; let W = 0, H = 0, DPR = 1, FIT = 1, QCAP = 1.5, QTIER = 0, slow = 0, WIDE = true, LR = 0, RT = 58, RB = 0, BL = 0, IDLE = 0;
      function resize() {
        W = o.clientWidth; H = o.clientHeight; DPR = Math.min(QCAP, window.devicePixelRatio || 1); DPR = Math.max(.6, Math.min(DPR, Math.sqrt(2700000 / Math.max(1, W * H)))); /* pixel budget: a wide screen never draws more than about 2.7M pixels per frame (full resolution at 1080p, so the trees stay sharp); the quality tiers step down if frames run slow */ cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        WIDE = W >= 900 && W / H > 1.15; o.classList.toggle('narrow', !WIDE);
        RT = 58;
        RT = WIDE ? 196 : 170; LR = 0;   // the heading card sits above the tree: the canopy starts below it
        if (WIDE) { RB = H - 10; FIT = Math.min(W / 1500, (RB - RT) / 1060); }
        else { RB = H - 40; FIT = Math.min(W / 900, (RB - RT) / 1060); }
        labels.forEach(L => L.state = '');
        if (WIDE) { const bw = Math.min(W * .4, 640), pad = Math.max(28, Math.min(W * .05, 96)); BL = W - pad - bw; brand.style.cssText = `left:${BL}px;width:${bw}px;top:50%;transform:translateY(-50%);bottom:auto;right:auto`; }
        else { BL = W; brand.style.cssText = 'left:0;right:0;width:auto;top:auto;bottom:7%;transform:none'; }
        measureChrome();
        draw(T);
      }
      root.addEventListener('resize', resize);
      // camera: smooth (monotone Hermite) path through keyframes: time, focus y (world), zoom
      const CAM = [[0, -100, 2.2], [2.8, -40, 2.8], [4.8, 10, 2.5], [6.8, 95, 1.5], [8.8, 80, 1.4], [11.0, -60, 1.12], [13.2, -175, 1.0], [14.4, -215, .98], [20.6, -300, .93], [26.6, -320, .94], [35, -310, .97], [END, -300, 1.0]];
      const CT = CAM.map(k => k[0]), CYv = CAM.map(k => k[1]), CZv = CAM.map(k => Math.log(k[2]));
      const slopes = v => v.map((_, i) => { if (i === 0 || i === v.length - 1) return 0; const a = (v[i] - v[i - 1]) / (CT[i] - CT[i - 1]), b = (v[i + 1] - v[i]) / (CT[i + 1] - CT[i]); return a * b <= 0 ? 0 : 2 * a * b / (a + b); });
      const CYm = slopes(CYv), CZm = slopes(CZv);
      function herm(v, m, t) {
        let i = 0; while (i < CT.length - 2 && t > CT[i + 1]) i++;
        const h = CT[i + 1] - CT[i], u = clamp((t - CT[i]) / h), u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m[i + 1];
      }
      const cam = t => [herm(CYv, CYm, t), Math.exp(herm(CZv, CZm, t))];
      // where the tree sits on screen: centred while it grows, then (reveal 0 -> 1) scaled and slid left of the brand block
      function camAt(t, reveal) {
        const [cy, zm] = cam(t); const RW = W - LR, RH = RB - RT; let sc = FIT * zm, fx = LR + RW / 2, fy = RT + RH * .54;
        if (WIDE) { const free = BL - LR, k = Math.min(1, free * .8 / (2 * 440 * sc)); sc *= lerp(1, k * .9, reveal); fx = lerp(fx, LR + free / 2, reveal); }
        else { sc *= 1 - .2 * reveal; fy -= RH * .17 * reveal; }
        return { ox: fx - EXX, oy: fy - cy * sc, sc };
      }

      /* ---------- Facilio mark: the logo's two squares are the seed ---------- */
      const logoImg = o.querySelector('.top img');
      const LW = 210, LH = 88 / 320 * LW, LX = -LW / 2, LY = -150 - LH / 2, LK = LW / 320;
      const SQ = { pink: [169, 2, 185, 18], teal: [232, 2, 248, 18] }, SQS = 17 * LK;
      const sqc = r => [LX + (r[0] + r[2]) / 2 * LK, LY + (r[1] + r[3]) / 2 * LK];
      let logoClean = null;
      function logoReady() {
        if (logoClean) return logoClean; if (!logoImg.complete || !logoImg.naturalWidth) return null;
        const c = document.createElement('canvas'); c.width = logoImg.naturalWidth; c.height = logoImg.naturalHeight; const x = c.getContext('2d'); x.drawImage(logoImg, 0, 0);
        const k = c.width / 320; for (const r of [SQ.pink, SQ.teal]) x.clearRect((r[0] - 2) * k, (r[1] - 2) * k, (r[2] - r[0] + 5) * k, (r[3] - r[1] + 5) * k);
        return logoClean = c;
      }
      const SEED = { pink: { ts: 1.5, tx: -8, ty: -7, col: '#E5197F', rot: -.5 }, teal: { ts: 1.85, tx: 8, ty: -7, col: '#2EC9C4', rot: .5 } };
      const LAND = 1.3, SINK0 = 3.9;

      const BARK = Array.from({ length: 24 }, () => ({ off: rr(-.94, .94), ph: rr(0, TAU), f: rr(2, 7), amp: rr(.02, .07), dash: rr(6, 22), gap: rr(3, 12), w: rr(1.3, 3.4), lite: R() < .3, a: rr(.25, .6) }));
      const KNOTS = [{ f: .3, off: -.34, r: 15, rot: .3 }, { f: .62, off: .4, r: 12, rot: -.4 }, { f: .85, off: -.1, r: 9, rot: .1 }];
      const BUTT = Array.from({ length: 7 }, (_, i) => ({ x: (i / 6 - .5) * 2 * .92, ph: rr(0, TAU), lite: i % 2 === 0 }));
      let CC = null, CX = null, CCB = null, ccN = 0; const CBS = 1.25;
      function bakeLeaves(t) {
        if (!CC) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const L of leaves) { x0 = Math.min(x0, L.x); x1 = Math.max(x1, L.x); y0 = Math.min(y0, L.y); y1 = Math.max(y1, L.y); } const M = 80; CCB = { x: x0 - M, y: y0 - M, w: x1 - x0 + 2 * M, h: y1 - y0 + 2 * M };
          CC = document.createElement('canvas'); CC.width = Math.ceil(CCB.w * CBS); CC.height = Math.ceil(CCB.h * CBS); CX = CC.getContext('2d'); CX.imageSmoothingEnabled = true; CX.imageSmoothingQuality = 'high'; ccN = 0; }
        if (ccN && t < leaves[ccN - 1].t + 1.8) { CX.setTransform(1, 0, 0, 1, 0, 0); CX.clearRect(0, 0, CC.width, CC.height); ccN = 0; }
        while (ccN < leaves.length && t >= leaves[ccN].t + 1.85) { const L = leaves[ccN++], zs = L.size / 56, cs = Math.cos(L.ang), sn = Math.sin(L.ang);
          CX.setTransform(CBS * cs * zs, CBS * sn * zs, -CBS * sn * zs, CBS * cs * zs, CBS * (L.x - CCB.x), CBS * (L.y - CCB.y)); CX.globalAlpha = .98; CX.drawImage(leafSpr(L.col, L.shp), -2, -20, 64, 40); }
      }
      /* ---------- scene drawing ---------- */
      const dust = Array.from({ length: 60 }, () => ({ x: rr(-1, 1), y: rr(-1, 1), z: rr(.3, 1), s: rr(.6, 1.8), p: rr(0, TAU) }));
      const growth = (b, t) => clamp((t - b.t0) / b.dur);
      function strokeBranch(b, gr, col, rimCol, widthMul, alphaMul) {
        if (gr <= 0) return; const e = easeOut(gr) * .35 + gr * .65;
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (gr >= 1 && b.depth >= 2) {
          const wv = (b.ws[0] + b.ws[N]) / 2 * widthMul; g.beginPath(); g.moveTo(b.pts[0][0], b.pts[0][1]); for (let i = 1; i <= N; i += 2) g.lineTo(b.pts[i][0], b.pts[i][1]); g.lineTo(b.pts[N][0], b.pts[N][1]);
          g.strokeStyle = rimCol; g.lineWidth = wv + 2.6; g.globalAlpha = .55 * alphaMul; g.stroke(); g.strokeStyle = col; g.lineWidth = wv; g.globalAlpha = alphaMul; g.stroke(); g.globalAlpha = 1; return;
        }
        const upto = e * N; const full = Math.floor(upto), part = upto - full;
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = pass ? col : rimCol;
          for (let i = 0; i < Math.min(N, full + 1); i++) {
            const p = b.pts[i]; let q = b.pts[i + 1]; if (!q) break;
            if (i === full) { if (part <= 0) break; q = [lerp(p[0], q[0], part), lerp(p[1], q[1], part)]; }
            const tp = gr < 1 ? .45 * (1 - gr) * clamp((i - (upto - 3.5)) / 3.5) : 0;   // while growing, the last few segments taper to a fine tip instead of a blunt stub
            const w = (b.ws[i] * widthMul * (1 - tp)) + (pass ? 0 : 2.6);
            g.lineWidth = w; g.globalAlpha = (pass ? 1 : .55) * alphaMul;
            g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
      const tipPoint = (b, gr) => at(b, clamp(easeOut(gr) * .35 + gr * .65));
      function sprite(c0) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, c0); r.addColorStop(1, 'rgba(100,160,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); return c; }
      const TIP_B = sprite('rgba(200,225,255,.9)'), TIP_T = sprite('rgba(120,235,230,.85)');
      function tipGlow(b, t, spr) { const gr = growth(b, t); if (gr <= 0 || gr >= 1) return; const p = tipPoint(b, gr), rad = b.depth === 0 ? 16 : 9; g.drawImage(spr, p[0] - rad, p[1] - rad, rad * 2, rad * 2); }
      const LSPR = {}; function leafSpr(col, shp) { const key = col + '|' + (shp | 0); if (LSPR[key]) return LSPR[key]; const c = document.createElement('canvas'); c.width = 128; c.height = 80; const x = c.getContext('2d'); x.scale(2, 2); x.translate(2, 20); const z = 56, T = shp | 0;
        const hw = u => { const sn = Math.pow(Math.sin(Math.PI * u), T === 2 ? .95 : .78); return z * (T === 0 ? .34 : T === 1 ? .3 : .19) * sn * (T === 0 ? 1 + .3 * Math.sin(u * Math.PI * 6 + .6) : 1); };
        const body = () => { x.beginPath(); for (let i = 0; i <= 28; i++) { const u = i / 28; i ? x.lineTo(u * z, -hw(u)) : x.moveTo(0, 0); } for (let i = 28; i >= 0; i--) { const u = i / 28; x.lineTo(u * z, hw(u)); } x.closePath(); };
        body(); x.fillStyle = col; x.fill();
        x.save(); body(); x.clip(); const hl = x.createLinearGradient(0, -z * .3, 0, z * .3); hl.addColorStop(0, 'rgba(255,255,255,.38)'); hl.addColorStop(.55, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,10,60,.18)'); x.fillStyle = hl; x.fillRect(0, -z * .4, z, z * .8); x.restore();
        body(); x.lineJoin = 'round'; x.strokeStyle = 'rgba(6,12,60,.62)'; x.lineWidth = 1.5; x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.62)'; x.lineWidth = 1; x.beginPath(); x.moveTo(1, 0); x.lineTo(z * .93, 0); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = .8; for (let k = 1; k <= 4; k++) { const px = z * (.14 + k * .17), vh = hw((px + z * .13) / z) * .62; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + z * .13, -vh); x.moveTo(px, 0); x.lineTo(px + z * .13, vh); x.stroke(); }
        return LSPR[key] = c; }
      const mixc = (a, b, k) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
      function stageAt(t) { if (t >= REVEAL) return 12; let c = -1; for (let i = 0; i < 12; i++) if (t >= nodes[i].t + .15) c = i; return c; }   // a stage is active from the moment its node is on the tree until the next node appears
      const qb = (a, b, m, u) => { const v = 1 - u; return [v * v * a.x + 2 * v * u * m[0] + u * u * b.x, v * v * a.y + 2 * v * u * m[1] + u * u * b.y]; };
      const lineCtl = (a, b, bow) => [(a.x + b.x) / 2 + (b.y - a.y) * bow, (a.y + b.y) / 2 - (b.x - a.x) * bow];

      /* ---------- background scenery: stars, moon, two parallax forest layers ---------- */
      const STARS = Array.from({ length: 120 }, () => ({ x: R(), y: Math.pow(R(), 1.5) * .6, s: rr(.4, 1.3), p: rr(0, TAU), k: rr(.35, 1) }));
      function forest(seed, n, spread, hMin, hMax, gapC) {
        const r = rng(seed), out = [];
        while (out.length < n) {
          const x = (r() * 2 - 1) * spread; if (Math.abs(x) < gapC) continue;
          out.push({ x, h: hMin + (hMax - hMin) * r(), kind: r() < .42 ? 0 : r() < .7 ? 1 : 2, w: .55 + r() * .45, d: r() * 4, lit: r() < .22, ph: r() * TAU });
        }
        return out.sort((a, b) => a.x - b.x);
      }
      const LAYERS = [
        { trees: forest(7, 70, 2600, 60, 140, 0), p: .3, scale: .55, amp: 70, f1: .0021, f2: .0057, ph: 1.3, lift: 60,
          hill: [[13, 14, 62], [24, 26, 104]], tree: [[17, 19, 74], [30, 33, 120]], rim: .16 },
        { trees: forest(19, 34, 2300, 120, 250, 330), p: .55, scale: .8, amp: 42, f1: .0016, f2: .0049, ph: 4.1, lift: 18,
          hill: [[10, 10, 48], [20, 21, 88]], tree: [[13, 14, 58], [25, 27, 104]], rim: .22 }
      ];
      const ridge = (L, x) => L.amp * (.62 + .25 * Math.sin(x * L.f1 + L.ph) + .13 * Math.sin(x * L.f2 + L.ph * 2.3));
      function treeShape(tr, bx, by, s, k) {
        const h = tr.h * s * k, w = tr.h * s * tr.w * .5;
        g.beginPath();
        if (tr.kind === 0) {            // broadleaf: trunk + three overlapping crowns
          g.rect(bx - w * .07, by - h * .45, w * .14, h * .45);
          g.moveTo(bx + w * .55, by - h * .62); g.arc(bx, by - h * .62, w * .55, 0, TAU);
          g.moveTo(bx - w * .1 + w * .42, by - h * .82); g.arc(bx - w * .1, by - h * .82, w * .42, 0, TAU);
          g.moveTo(bx + w * .28 + w * .36, by - h * .5); g.arc(bx + w * .28, by - h * .5, w * .36, 0, TAU);
        } else if (tr.kind === 1) {     // conifer: stacked tiers
          for (let i = 0; i < 3; i++) { const y0 = by - h * (.2 + i * .26), ww = w * (.62 - i * .14); g.moveTo(bx - ww, y0); g.lineTo(bx, y0 - h * .42); g.lineTo(bx + ww, y0); g.closePath(); }
          g.rect(bx - w * .05, by - h * .22, w * .1, h * .22);
        } else {                        // poplar
          g.ellipse(bx, by - h * .55, w * .32, h * .45, 0, 0, TAU); g.rect(bx - w * .05, by - h * .15, w * .1, h * .15);
        }
      }
      const CLOUDS = Array.from({ length: 6 }, (_, i) => ({ x: R(), y: .08 + R() * .3, w: .16 + R() * .16, v: .004 + R() * .006, a: .1 + R() * .08, ph: R() * TAU }));
      const CITY = (() => { const out = []; let x = 0; while (x < 1.05) { const w = rr(.012, .03), h = rr(.03, .13); const wins = []; const cols = Math.max(1, Math.floor(w / .006)), rows = Math.max(2, Math.floor(h / .012)); for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (R() < .5) wins.push({ c, r, on: rr(4, 36), ph: R() * TAU }); out.push({ x, w, h, cols, rows, wins }); x += w + rr(.002, .012); } return out; })();
      const FLIES = Array.from({ length: 30 }, () => ({ x: R(), y: .62 + R() * .3, ph: R() * TAU, sp: .15 + R() * .35, r: 18 + R() * 40, on: rr(5, 22) }));
      const GX = () => rr(-2700, 2700), GD = x => Math.abs(x) / 900 + R() * 3;   // ground cover spreads across the whole ground, outward from the trunk
      const GRASS = Array.from({ length: 560 }, () => { const x = GX(); return { x, h: rr(14, 46), l: rr(-.5, .5), ph: R() * TAU, d: GD(x), c: R() }; });
      const BUSHES = Array.from({ length: 34 }, () => { const x = GX(); return { x, r: rr(16, 34), ph: R() * TAU, d: GD(x), c: R() }; });
      const SPROUTS = Array.from({ length: 84 }, () => { const x = GX(); return { x, h: rr(16, 34), ph: R() * TAU, d: GD(x), s: R() < .5 ? -1 : 1 }; });
      const FLOWERS = Array.from({ length: 120 }, () => { const x = GX(); return ({ x, h: rr(22, 54), ph: R() * TAU, d: GD(x) + 1, c: R() < .5 ? '#E5197F' : R() < .5 ? '#8DB8FF' : '#ffffff', r: rr(3.2, 5.2) }); });
      const PETALS = Array.from({ length: 38 }, () => ({ x: rr(-380, 380), y0: rr(.35, 1), sp: rr(.025, .06), ph: R() * TAU, c: R() < .35 ? '#E5197F' : R() < .5 ? '#8DB8FF' : '#6AA6FF', r: rr(2.6, 4.6) }));
      function drawScenery(t, ta, ox, oy, zm, mature) {
        const tw = rm ? 1 : 1;
        // stars + moon
        for (const st of STARS) { const a = (.25 + .5 * st.k) * (.65 + .35 * Math.sin(ta * 1.6 * st.k + st.p)) * (1 - .35 * mature); g.fillStyle = `rgba(200,220,255,${a})`; g.beginPath(); g.arc(st.x * W, st.y * H, st.s, 0, TAU); g.fill(); }
        const mx = W * (WIDE ? .86 : .82), my = H * (WIDE ? .2 : .24) + (oy - H * .7) * .02, mr = Math.max(16, Math.min(W, H) * .028);
        const mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 6); mg.addColorStop(0, 'rgba(170,200,255,.22)'); mg.addColorStop(1, 'rgba(120,160,255,0)');
        g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr * 6, 0, TAU); g.fill();
        g.fillStyle = 'rgba(214,228,255,.9)'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        g.fillStyle = 'rgba(160,185,240,.35)'; g.beginPath(); g.arc(mx + mr * .3, my - mr * .15, mr * .22, 0, TAU); g.arc(mx - mr * .35, my + mr * .3, mr * .14, 0, TAU); g.fill();
        // clouds drift slowly across the sky
        for (const c of CLOUDS) { const cx = ((c.x + ta * c.v) % 1.5 - .25) * W, cy = c.y * H + Math.sin(ta * .1 + c.ph) * 6, w = c.w * W; const a = c.a * (.6 + .4 * sm(t / 6));
          for (const [dx, dy, k] of [[0, 0, 1], [-.28, .05, .7], [.3, .06, .75], [.08, -.08, .6]]) { const rg = g.createRadialGradient(cx + dx * w, cy + dy * w * .4, 0, cx + dx * w, cy + dy * w * .4, w * .42 * k); rg.addColorStop(0, 'rgba(140,170,240,' + a + ')'); rg.addColorStop(1, 'rgba(140,170,240,0)'); g.fillStyle = rg; g.save(); g.translate(0, cy * 0); g.fillRect(cx + dx * w - w * .5, cy + dy * w * .4 - w * .3, w, w * .6); g.restore(); } }
        // an occasional shooting star
        { const per = 14, u = ((ta - 3) % per) / per, d = .09; if (ta > 3 && u < d) { const k = u / d, x0 = W * (.15 + ((Math.floor((ta - 3) / per) * 37) % 5) * .12), y0 = H * .09, x1 = x0 + W * .16 * k, y1 = y0 + H * .1 * k, gr = g.createLinearGradient(x1, y1, x1 - W * .07, y1 - H * .045); gr.addColorStop(0, 'rgba(235,245,255,' + (.9 * (1 - k * .6)) + ')'); gr.addColorStop(1, 'rgba(235,245,255,0)'); g.strokeStyle = gr; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - W * .07, y1 - H * .045); g.stroke(); } }
        // the distant city: a facilities skyline whose windows come on, one by one, as the delivery stages are completed
        { const base = H * .73, bh = H, lit = sm(t / 40); g.fillStyle = 'rgba(22,30,96,' + (.55 + .25 * mature) + ')';
          for (const b of CITY) { const bx = b.x * W, bw = b.w * W, bhh = b.h * bh; if (bx > W) break; g.fillRect(bx, base - bhh, bw, bhh + 20);
            const cw = bw / b.cols, rh = bhh / b.rows; for (const w of b.wins) { if (t < w.on) continue; const fl = .55 + .45 * Math.sin(ta * .7 + w.ph), a = Math.min(1, (t - w.on) / 1.5) * (.55 + .45 * fl) * (.6 + .4 * lit); g.fillStyle = w.ph > 4.4 ? 'rgba(51,201,201,' + a + ')' : w.ph < 1 ? 'rgba(255,120,185,' + a + ')' : 'rgba(205,225,255,' + a + ')'; g.fillRect(bx + w.c * cw + cw * .22, base - bhh + w.r * rh + rh * .25, Math.max(1.2, cw * .5), Math.max(1.2, rh * .4)); }
            g.fillStyle = 'rgba(22,30,96,' + (.55 + .25 * mature) + ')'; } }
        // wind turbines turning on the far hills: clean energy, in the logo's colours
        { const sz = Math.min(W, H) * .11, hb = H * .75; [[.07, .8], [.14, 1], [.89, .9], [.95, .72]].forEach(([fx, k], i) => { const bx = fx * W, h = sz * k, sp = (.5 + i * .13) * (rm ? 0 : 1), a0 = ta * sp + i; g.strokeStyle = 'rgba(141,184,255,.55)'; g.lineWidth = Math.max(1.4, sz * .03); g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, hb); g.lineTo(bx, hb - h); g.stroke();
          for (let b = 0; b < 3; b++) { const an = a0 + b * TAU / 3; g.strokeStyle = b === 0 ? 'rgba(229,25,127,.8)' : 'rgba(234,242,255,.8)'; g.lineWidth = Math.max(1.2, sz * .026); g.beginPath(); g.moveTo(bx, hb - h); g.lineTo(bx + Math.cos(an) * sz * .46 * k, hb - h + Math.sin(an) * sz * .46 * k); g.stroke(); }
          g.fillStyle = '#EAF2FF'; g.beginPath(); g.arc(bx, hb - h, Math.max(2, sz * .035), 0, TAU); g.fill(); }); }
        // a paper plane glides across the sky now and then, leaving a dotted trail (white wings, pink fold: Facilio colours, readable on the night sky)
        { const per = 40, u = ((ta - 8) % per) / per; if (ta > 8) { const r = Math.min(W, H) * .028, fade = sm(u / .06) * sm((1 - u) / .06);
          const px = lerp(-W * .08, W * 1.08, u), py = H * (.2 + .06 * Math.sin(u * TAU * 1.1)) - u * H * .04, nx = lerp(-W * .08, W * 1.08, u + .004), ny = H * (.2 + .06 * Math.sin((u + .004) * TAU * 1.1)) - (u + .004) * H * .04, ang = Math.atan2(ny - py, nx - px);
          g.globalAlpha = .9 * fade; g.fillStyle = 'rgba(234,242,255,.7)';
          for (let k = 1; k <= 9; k++) { const uu = u - k * .006; if (uu < 0) break; const tx = lerp(-W * .08, W * 1.08, uu), ty = H * (.2 + .06 * Math.sin(uu * TAU * 1.1)) - uu * H * .04; g.globalAlpha = .6 * fade * (1 - k / 10); g.beginPath(); g.arc(tx, ty, Math.max(1, r * .06), 0, TAU); g.fill(); }
          g.globalAlpha = .95 * fade; g.save(); g.translate(px, py); g.rotate(ang - .12);
          g.fillStyle = '#EAF2FF'; g.beginPath(); g.moveTo(r * 1.6, 0); g.lineTo(-r * 1.1, -r * .75); g.lineTo(-r * .55, -r * .05); g.closePath(); g.fill();
          g.fillStyle = '#8DB8FF'; g.beginPath(); g.moveTo(r * 1.6, 0); g.lineTo(-r * .55, -r * .05); g.lineTo(-r * 1.1, r * .55); g.closePath(); g.fill();
          g.fillStyle = '#E5197F'; g.beginPath(); g.moveTo(r * 1.6, 0); g.lineTo(-r * .55, -r * .05); g.lineTo(-r * .2, r * .22); g.closePath(); g.fill();
          g.restore(); g.globalAlpha = 1; } }
        // far flock in the sky (between the stars and the hills)
        drawFlock(ta, t);
        LAYERS.forEach((L, li) => {
          const s = FIT * L.scale * Math.pow(zm, L.p), lx = W / 2 + (ox - W / 2) * L.p;
          const ly = lerp(H * .74, oy, L.p) - L.lift * s;
          const col = (c) => mixc(c[0], c[1], mature);
          // hills
          g.beginPath(); g.moveTo(-10, H + 10);
          for (let sx = -10; sx <= W + 10; sx += 10) { const wx = (sx - lx) / s; g.lineTo(sx, ly - ridge(L, wx) * s); }
          g.lineTo(W + 10, H + 10); g.closePath();
          const hg = g.createLinearGradient(0, ly - L.amp * s, 0, H); hg.addColorStop(0, col(L.hill)); hg.addColorStop(1, 'rgb(7,6,30)');
          g.fillStyle = hg; g.fill();
          g.strokeStyle = `rgba(141,184,255,${L.rim * (.6 + .4 * mature)})`; g.lineWidth = 1;
          g.beginPath(); for (let sx = -10; sx <= W + 10; sx += 10) { const wx = (sx - lx) / s; const y = ly - ridge(L, wx) * s; sx < 0 ? g.moveTo(sx, y) : g.lineTo(sx, y); } g.stroke();
          // trees: they grow along with the main tree
          g.fillStyle = col(L.tree);
          const lit = [];
          for (const tr of L.trees) {
            const bx = lx + tr.x * s; if (bx < -120 || bx > W + 120) continue;
            const k = .22 + .78 * sm((t - 6 - tr.d - li * 2) / 16);
            const by = ly - ridge(L, tr.x) * s + 3;
            treeShape(tr, bx, by, s, k); g.fill();
            if (tr.lit && t > 20) lit.push([bx, by - tr.h * s * k * .6, tr.ph]);
          }
          // a few trees carry small teal lights, echoing the network on the main tree
          for (const [x, y, ph] of lit) { const a = sm((t - 20) / 6) * (.35 + .3 * Math.sin(ta * 2 + ph)); g.fillStyle = `rgba(46,201,196,${a})`; g.beginPath(); g.arc(x, y, 1.6 + li, 0, TAU); g.fill(); }
          if (li === LAYERS.length - 1) { // low mist rolling between the hills and the tree
            for (let m = 0; m < 3; m++) { const mxp = ((ta * (.006 + m * .004) + m * .37) % 1.6 - .3) * W, myp = ly - (8 + m * 10) * s; const rg = g.createRadialGradient(mxp, myp, 0, mxp, myp, W * .3); rg.addColorStop(0, 'rgba(120,160,240,' + (.07 * sm(t / 8)) + ')'); rg.addColorStop(1, 'rgba(120,160,240,0)'); g.save(); g.translate(mxp, myp); g.scale(1, .16); g.translate(-mxp, -myp); g.fillStyle = rg; g.fillRect(mxp - W * .3, myp - W * .3, W * .6, W * .6); g.restore(); }
            for (const f of FLIES) { if (t < f.on) continue; const fx = f.x * W + Math.sin(ta * f.sp + f.ph) * f.r, fy = f.y * H + Math.cos(ta * f.sp * 1.3 + f.ph) * f.r * .5, a = (.35 + .65 * Math.max(0, Math.sin(ta * 1.6 + f.ph * 3))) * sm((t - f.on) / 2); const rad = 13 + 4 * Math.sin(ta + f.ph); g.globalAlpha = a; g.drawImage(TIP_T, fx - rad, fy - rad, rad * 2, rad * 2); g.fillStyle = 'rgba(235,250,255,' + a + ')'; g.beginPath(); g.arc(fx, fy, 1.3, 0, TAU); g.fill(); g.globalAlpha = 1; }
          }
        });
      }

      /* ---------- birds ---------- */
      function bird(x, y, sz, ph, a, col) {
        const f = Math.sin(ph), tip = -sz * .55 * f, cy = -sz * (.28 + .22 * f);
        g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = Math.max(1.1, sz * .17); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(x - sz, y + tip); g.quadraticCurveTo(x - sz * .45, y + cy, x, y); g.quadraticCurveTo(x + sz * .45, y + cy, x + sz, y + tip); g.stroke();
        g.fillStyle = col; g.beginPath(); g.ellipse(x, y + sz * .06, sz * .16, sz * .1, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      function drawFlock(ta, t) {
        if (t < 6) return;
        const P = 17, k = Math.floor((ta - 6) / P), u = ((ta - 6) % P) / P, dir = k % 2 ? -1 : 1;
        const n = 7, ctr = 3, sz = Math.max(4, Math.min(W, H) * .0075), base = H * (.16 + .08 * ((k * 37) % 3));
        const lead = dir > 0 ? lerp(-W * .15, W * 1.15, u) : lerp(W * 1.15, -W * .15, u);
        const fade = sm(u / .08) * sm((1 - u) / .08);
        for (let j = 0; j < n; j++) {
          const off = Math.abs(j - ctr), side = j < ctr ? -1 : 1;
          const x = lead - dir * off * sz * 4.2, y = base + off * sz * 2.2 * (j === ctr ? 0 : 1) * (side ? 1 : 1) + Math.sin(ta * .9 + j) * sz * .6;
          bird(x, y, sz, ta * 8.5 + j * .9, .7 * fade, '#C9DBFF');
        }
      }
      // birds that circle the canopy once the leaves are out, and one that lands on the tree at the end
      const PERCH = (() => { let best = null; for (const b of branches) if (b.depth >= 3 && b.tip[0] > 60 && (!best || b.tip[1] < best.tip[1])) best = b; return best ? { x: best.tip[0], y: best.tip[1] } : { x: 120, y: -760 }; })();
      function drawTreeBirds(t, ta, SK) {
        const on = sm((t - S[7]) / 2.5); if (on <= 0) return;
        for (let j = 0; j < 3; j++) {
          const th = ta * (.32 + j * .04) + j * 2.1, depth = .78 + .22 * Math.sin(th);
          const x = Math.cos(th) * (600 + j * 40), y = -520 - j * 70 + Math.sin(th) * 150 + Math.sin(ta * 1.2 + j) * 18;
          bird(x + SK * y, y, 17 * depth, ta * (9 + j) + j, .85 * on * (.55 + .45 * depth), '#E4EEFF');
        }
        // the lander
        const t0 = S[11] + .6, u = (t - t0) / 3.2; if (u <= 0) return;
        const px = PERCH.x + SK * PERCH.y, py = PERCH.y - 6;
        if (u < 1) {
          const e = easeIO(u), sx = 980, sy = -1020, cx = 640, cy = -1100;
          const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * px, y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * py;
          bird(x, y, 18, ta * (u > .8 ? 16 : 10), clamp(u * 4), '#FFFFFF');
        } else {
          const hop = Math.max(0, Math.sin(ta * 1.1)) > .985 ? -4 : 0;
          g.fillStyle = '#F2F6FF'; g.beginPath(); g.ellipse(px, py - 7 + hop, 9, 6.5, -.2, 0, TAU); g.fill();
          g.beginPath(); g.arc(px + 7, py - 13 + hop, 4.6, 0, TAU); g.fill();
          g.fillStyle = '#E5197F'; g.beginPath(); g.moveTo(px + 11, py - 14 + hop); g.lineTo(px + 16, py - 12.5 + hop); g.lineTo(px + 11, py - 11 + hop); g.fill();
          g.strokeStyle = '#B9CEF5'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 8, py - 6 + hop); g.lineTo(px - 16, py - 2 + hop); g.stroke();
        }
      }

      let T = 0;
      function draw(t) {
        const ta = t + IDLE;                                      // ambient clock (sway, shimmer) keeps running after the intro ends
        const [cy, zm] = cam(t);
        const mature = sm((t - 20) / 16), reveal = sm((t - REVEAL) / 3.2);
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, mixc([6, 5, 30], [14, 14, 70], mature)); bg.addColorStop(.6, mixc([10, 9, 44], [29, 26, 94], mature)); bg.addColorStop(1, mixc([8, 7, 38], [20, 22, 84], mature));
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // camera / layout: the tree is centred, then slides left of the brand block for the reveal
        const { ox, oy, sc } = camAt(t, reveal); LSC = sc;
        drawScenery(t, ta, ox, oy, zm, mature);
        const toS = (x, y) => [ox + x * sc, oy + y * sc];
        const gl = toS(0, -640), gr = 560 * sc;
        if (mature > 0) { const rg = g.createRadialGradient(gl[0], gl[1], 0, gl[0], gl[1], gr); rg.addColorStop(0, `rgba(60,120,255,${.34 * mature})`); rg.addColorStop(.45, `rgba(46,100,230,${.14 * mature})`); rg.addColorStop(1, 'rgba(21,112,239,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); const tg = toS(0, -900); const rt = g.createRadialGradient(tg[0], tg[1], 0, tg[0], tg[1], 380 * sc); rt.addColorStop(0, `rgba(46,201,196,${.16 * mature})`); rt.addColorStop(1, 'rgba(46,201,196,0)'); g.fillStyle = rt; g.fillRect(0, 0, W, H); }
        const gp = toS(0, 0); g.save(); g.translate(gp[0], gp[1]); g.scale(1, .26); const pool = g.createRadialGradient(0, 0, 0, 0, 0, 460 * sc);
        pool.addColorStop(0, `rgba(80,140,255,${.3 + .12 * mature})`); pool.addColorStop(1, 'rgba(21,112,239,0)'); g.fillStyle = pool; g.fillRect(-W, -H * 4, W * 2, H * 8); g.restore();

        // ---- world (with a gentle sway once the tree is mature)
        const S0 = DPR * sc, EX = DPR * ox, EY = DPR * oy;
        const sw = sm((t - 26) / 6), SK = sw * (.011 * Math.sin(ta * .62) + .005 * Math.sin(ta * 1.27 + 2)) * (rm ? 0 : 1);
        const setW = () => g.setTransform(S0, 0, S0 * SK, S0, EX, EY);
        g.setTransform(S0, 0, 0, S0, EX, EY);
        const ug = g.createLinearGradient(0, 0, 0, 420); ug.addColorStop(0, 'rgba(10,10,46,.84)'); ug.addColorStop(1, 'rgba(6,5,26,1)');
        g.fillStyle = ug; g.fillRect(-6000, 0, 12000, 6000);
        const fr = easeOut((t - .3) / 2.2);
        const gl2 = g.createLinearGradient(-520, 0, 520, 0); gl2.addColorStop(0, 'rgba(141,184,255,0)'); gl2.addColorStop(.5, `rgba(141,184,255,${.5 * fr})`); gl2.addColorStop(1, 'rgba(141,184,255,0)');
        g.strokeStyle = gl2; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-520, 0); g.lineTo(520, 0); g.stroke();
        for (let i = 0; i < 3; i++) { const k = easeOut((t - .5 - i * .35) / 2.2); if (k <= 0) continue; g.strokeStyle = `rgba(141,184,255,${(.3 - i * .08) * k})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 0, (70 + i * 62) * k, (14 + i * 11) * k, 0, 0, TAU); g.stroke(); }
        // stage 4: the foundation settles — one slow ring spreads from the base of the trunk
        { const k = (t - S[3]) / 2.6; if (k > 0 && k < 1) { g.strokeStyle = `rgba(141,184,255,${.55 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 40 + 230 * easeOut(k), 8 + 46 * easeOut(k), 0, 0, TAU); g.stroke(); } }

        // ---- seed: the Facilio mark's pink and teal squares drop out of the wordmark and into the ground
        if (t < 8.8) {
          const lg = logoReady(), la = clamp(t / .8) * (1 - sm((t - 1.9) / 1.2));
          if (lg && la > 0) { g.globalAlpha = la; g.drawImage(lg, LX, LY, LW, LH); g.globalAlpha = 1; }
          const sink = easeIO((t - SINK0) / 1.4), vis = 1 - sm((t - 7.3) / 1.3), sa = clamp(t / .8) * vis;
          // soil ripples as each square lands
          for (const key of ['pink', 'teal']) { const k = (t - SEED[key].ts - LAND) / 1.5; if (k > 0 && k < 1) { g.strokeStyle = `rgba(141,184,255,${.5 * (1 - k)})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(SEED[key].tx * (1 - sink), 0, 12 + 70 * easeOut(k), 3 + 16 * easeOut(k), 0, 0, TAU); g.stroke(); } }
          if (t > SEED.pink.ts + LAND) { // warm glow around the landed seed
            const pulse = (Math.sin(t * 3.2) + 1) / 2, cyg = -7 + 11 * sink, r0 = (26 + pulse * 8) * (1 - .3 * sink);
            const sg = g.createRadialGradient(0, cyg, 0, 0, cyg, r0 * 2.6); sg.addColorStop(0, `rgba(190,215,255,${.55 * sa})`); sg.addColorStop(.4, `rgba(70,140,255,${.28 * sa})`); sg.addColorStop(1, 'rgba(21,112,239,0)');
            g.fillStyle = sg; g.beginPath(); g.arc(0, cyg, r0 * 2.6, 0, TAU); g.fill();
          }
          // the two squares touch down, then melt together into one seed that settles into the soil
          const mg = sm((t - SEED.pink.ts - LAND - .2) / .7);
          for (const key of ['pink', 'teal']) {
            const o = SEED[key], from = sqc(SQ[key]), u = clamp((t - o.ts) / LAND), e = u * u;
            const land = t - o.ts - LAND, bounce = land > 0 ? -Math.abs(Math.sin(land * 7)) * 6 * Math.exp(-land * 4.2) : 0;
            let x = lerp(from[0], o.tx, sm(u)), y = lerp(from[1], o.ty, e) + bounce;
            x *= 1 - mg; y += 11 * sink;
            const rot = (1 - e) * o.rot * 1.6, s0 = SQS * (1 - .5 * mg);
            if (mg < 1) { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = sa * (1 - mg); g.fillStyle = o.col; g.fillRect(-s0 / 2, -s0 / 2, s0, s0); g.restore(); g.globalAlpha = 1; }
          }
          if (mg > 0) { // the seed: an almond-shaped Facilio seed (pink to teal sheen) that cracks open as the first root pushes out
            const sy = -7 + 11 * sink + 2 * (1 - mg), crack = sm((t - 4.4) / .8), sw = 9.5 * (1 + .1 * crack), sh = 15, tilt = (1 - sink) * .25;
            g.save(); g.translate(0, sy); g.rotate(tilt); g.scale(mg, mg); g.globalAlpha = sa;
            const gr = g.createLinearGradient(-sw, -sh, sw, sh); gr.addColorStop(0, '#F0509D'); gr.addColorStop(.5, '#7A4FD0'); gr.addColorStop(1, '#2EC9C4');
            g.beginPath(); g.moveTo(0, -sh); g.bezierCurveTo(sw * 1.25, -sh * .45, sw * 1.15, sh * .55, 0, sh); g.bezierCurveTo(-sw * 1.15, sh * .55, -sw * 1.25, -sh * .45, 0, -sh); g.closePath();
            g.fillStyle = gr; g.fill(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.45)'; g.stroke();
            g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-sw * .38, -sh * .3, sw * .16, sh * .3, .25, 0, TAU); g.fill();   // highlight
            if (crack > 0) { g.strokeStyle = `rgba(210,235,255,${.95 * crack})`; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, sh); g.lineTo(-2, sh * .55); g.lineTo(1.5, sh * .15); g.lineTo(-1, -sh * .25); g.stroke(); }
            g.restore(); g.globalAlpha = 1;
          }
        }

        { const kc = sm((t - S[6]) / 7); if (kc > 0) { const cy = YMIN * .56, gr3 = g.createRadialGradient(0, cy, 0, 0, cy, 460); gr3.addColorStop(0, 'rgba(90,140,255,' + (.2 * kc) + ')'); gr3.addColorStop(.55, 'rgba(60,110,230,' + (.08 * kc) + ')'); gr3.addColorStop(1, 'rgba(60,110,230,0)'); g.fillStyle = gr3; g.fillRect(-640, cy - 520, 1280, 1040); } }
        // roots
        for (const b of roots) { const gr2 = growth(b, t); strokeBranch(b, gr2, b.depth ? '#2E8FD8' : '#3B7BE0', 'rgba(46,201,196,.55)', b.depth ? .8 : 1, .95); }
        setW();
        // trunk + branches
        const thick = 1 + .14 * sm((t - S[3]) / 2.5); // stage 4: the trunk firms up
        for (const b of branches) {
          const gr2 = growth(b, t); if (gr2 <= 0) continue;
          const dcol = ['#56659F', '#5E6DA8', '#6675B0', '#6E7DB8', '#7685C0', '#7E8DC8'][Math.min(5, b.depth)];
          strokeBranch(b, gr2, dcol, `rgba(215,226,255,${.62 + .04 * b.depth})`, b.depth === 0 ? thick : 1, 1);
          if (b.depth === 0) { // the trunk as wood: uneven edges, a rounded body, broken fissures, knots
            const up0 = easeOut(gr2) * .35 + gr2 * .65, uMax = Math.min(1, up0), STEPS = 44, nrm = u => { const a = at(b, Math.max(0, u - .02)), c = at(b, Math.min(1, u + .02)); const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
            const edge = (u, side) => { const p = at(b, u), n = nrm(u), w = p[2] * thick * .5 * (1 + .05 * Math.sin(u * 23 + side) + .035 * Math.sin(u * 51 + 2 * side)); return [p[0] + n[0] * w * side, p[1] + n[1] * w * side]; };
            g.save(); g.beginPath(); for (let i = 0; i <= STEPS; i++) { const q = edge(uMax * i / STEPS, -1); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } for (let i = STEPS; i >= 0; i--) { const q = edge(uMax * i / STEPS, 1); g.lineTo(q[0], q[1]); } g.closePath();
            const wb = b.ws[0] * thick * .56, bg = g.createLinearGradient(-wb, 0, wb, 0); bg.addColorStop(0, '#2B3770'); bg.addColorStop(.18, '#4C5B96'); bg.addColorStop(.45, '#7384BF'); bg.addColorStop(.7, '#55659F'); bg.addColorStop(1, '#27336A'); g.fillStyle = bg; g.fill(); g.clip();
            g.lineCap = 'round'; BARK.forEach((k, gi) => { g.strokeStyle = k.lite ? 'rgba(200,215,255,' + (k.a * .5) + ')' : 'rgba(8,14,64,' + k.a + ')'; g.lineWidth = k.w; g.setLineDash([k.dash, k.gap]); g.lineDashOffset = gi * 7; g.beginPath();
              for (let i = 0; i <= STEPS; i++) { const u = uMax * i / STEPS, p = at(b, u), n = nrm(u), w = p[2] * thick * .5 * (k.off + Math.sin(u * k.f * 6 + k.ph) * k.amp * 4), x = p[0] + n[0] * w, y = p[1] + n[1] * w; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
            g.setLineDash([]); for (const kn of KNOTS) { if (kn.f > uMax) continue; const p = at(b, kn.f), n = nrm(kn.f), x = p[0] + n[0] * p[2] * thick * .5 * kn.off, y = p[1] + n[1] * p[2] * thick * .5 * kn.off;
              for (let r = 1; r <= 3; r++) { g.strokeStyle = r % 2 ? 'rgba(8,14,64,.5)' : 'rgba(200,215,255,.3)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, kn.r * r / 3 * .75, kn.r * r / 3 * 1.25, kn.rot, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(8,14,64,.55)'; g.beginPath(); g.ellipse(x, y, kn.r * .2, kn.r * .38, kn.rot, 0, TAU); g.fill(); }
            g.restore();
            g.lineCap = 'round'; for (const sd of [-1, 1]) { g.strokeStyle = sd < 0 ? 'rgba(215,226,255,.7)' : 'rgba(8,14,64,.55)'; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= STEPS; i++) { const q = edge(uMax * i / STEPS, sd); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); }
          } else if (b.depth === 1 && gr2 >= .15) { // the great limbs carry the same grain
            const up1 = easeOut(gr2) * .35 + gr2 * .65; g.lineCap = 'round'; g.setLineDash([10, 9]);
            for (const [off, c] of [[-.35, 'rgba(8,14,64,.42)'], [.3, 'rgba(8,14,64,.34)'], [-.05, 'rgba(200,215,255,.22)']]) { g.strokeStyle = c; g.lineWidth = 1.8; g.beginPath(); for (let i = 0; i <= 18; i++) { const u = up1 * i / 18, p = at(b, u), w = p[2] * off, x = p[0] - Math.sin(p[3]) * w, y = p[1] + Math.cos(p[3]) * w; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
            g.setLineDash([]);
          }
          if (b.depth <= 1) { // soft light along the lit side: gives the wood some roundness
            g.strokeStyle = b.depth ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.14)'; g.lineWidth = b.depth ? 1.6 : 2.6; g.lineCap = 'round'; g.beginPath();
            const up = easeOut(gr2) * .35 + gr2 * .65; const lim = Math.floor(up * N);
            for (let i = 0; i <= Math.min(N, lim); i++) { const p = b.pts[i]; const w = b.ws[i] * (b.depth ? .2 : .24) * (b.depth ? 1 : thick); const nx = b.depth ? -Math.sin(b.ang) : -1, ny = b.depth ? Math.cos(b.ang) : 0; if (i === 0) g.moveTo(p[0] + nx * w, p[1] + ny * w); else g.lineTo(p[0] + nx * w, p[1] + ny * w); } g.stroke();
          }
        }
        { // root flare: the trunk widens into buttresses at the ground and melts into the roots, so it reads as one growing plant
          const tk = branches[0], fk = sm(growth(tk, t) * 4) * thick; if (fk > 0) {
            const fw = 30 + 52 * fk, fh = 120 * Math.min(1, .35 + fk), fg = g.createLinearGradient(0, -fh, 0, 18);
            fg.addColorStop(0, 'rgba(86,101,159,0)'); fg.addColorStop(.22, '#56659F'); fg.addColorStop(.8, '#56659F'); fg.addColorStop(1, 'rgba(86,101,159,0)');
            g.fillStyle = fg; g.beginPath(); g.moveTo(-26, -fh); g.bezierCurveTo(-28, -fh * .42, -fw * .55, -fh * .08, -fw, 8); g.quadraticCurveTo(0, 26, fw, 8); g.bezierCurveTo(fw * .55, -fh * .08, 28, -fh * .42, 26, -fh); g.closePath(); g.fill();
            g.lineCap = 'round'; for (const bt of BUTT) { g.strokeStyle = bt.lite ? 'rgba(200,215,255,.3)' : 'rgba(8,14,64,.45)'; g.lineWidth = bt.lite ? 2 : 2.8; g.beginPath(); g.moveTo(bt.x * 40, -fh * .55); g.bezierCurveTo(bt.x * 60, -fh * .2, bt.x * fw * .8 + Math.sin(bt.ph) * 6, -fh * .02, bt.x * fw * 1.08, 10); g.stroke(); }
            g.strokeStyle = 'rgba(141,184,255,.30)'; g.lineWidth = 1.6; g.lineCap = 'round'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 26, -fh * .8); g.bezierCurveTo(sd * 28, -fh * .42, sd * fw * .55, -fh * .08, sd * fw * .98, 5); g.stroke(); }
          }
        }
        { // grass tufts and wildflowers sprout around the base once the roots take hold, and sway in the breeze
          for (const bu of BUSHES) { const k = sm((t - S[1] - bu.d) / 4); if (k <= 0) continue; const r = bu.r * k, sw = Math.sin(ta * .9 + bu.ph) * (rm ? 0 : 1.6) * k;
            g.fillStyle = bu.c < .5 ? 'rgba(46,201,196,.34)' : 'rgba(47,123,255,.4)'; g.beginPath(); g.ellipse(bu.x - r * .55 + sw, 1 - r * .38, r * .62, r * .5, 0, 0, TAU); g.ellipse(bu.x + r * .5 + sw, 1 - r * .34, r * .58, r * .46, 0, 0, TAU); g.ellipse(bu.x + sw * 1.4, 1 - r * .72, r * .6, r * .52, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(141,184,255,.28)'; g.beginPath(); g.ellipse(bu.x + sw * 1.4 - r * .1, 1 - r * .86, r * .34, r * .26, 0, 0, TAU); g.fill(); }
          for (const sp of SPROUTS) { const k = sm((t - S[2] - sp.d) / 4); if (k <= 0) continue; const h = sp.h * k, sw = Math.sin(ta * 1.1 + sp.ph) * (rm ? 0 : 2.5) * k, tx = sp.x + sw;
            g.strokeStyle = 'rgba(46,201,196,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sp.x, 2); g.quadraticCurveTo(sp.x + sw * .4, -h * .5, tx, -h); g.stroke();
            g.fillStyle = 'rgba(46,201,196,.6)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(tx + sd * h * .26, -h * .9, h * .3, h * .13, sd * -.55, 0, TAU); g.fill(); } }
          // blades and flowers are drawn in a few batched paths (one stroke per colour), and anything off screen is skipped
          const vx0 = -EX / S0 - 80, vx1 = (cv.width - EX) / S0 + 80;
          g.lineCap = 'round'; g.lineWidth = 1.7;
          for (let cl = 0; cl < 3; cl++) { g.strokeStyle = cl === 0 ? 'rgba(46,201,196,.55)' : cl === 1 ? 'rgba(47,123,255,.6)' : 'rgba(141,184,255,.5)'; g.beginPath(); let any = false;
            for (const bl of GRASS) { if (bl.x < vx0 || bl.x > vx1 || (bl.c < .4 ? 0 : bl.c < .75 ? 1 : 2) !== cl) continue; const k = sm((t - S[1] - bl.d) / 4); if (k <= 0) continue; const h = bl.h * k, sway = Math.sin(ta * 1.4 + bl.ph) * (rm ? 0 : 4) * k; g.moveTo(bl.x, 2); g.quadraticCurveTo(bl.x + bl.l * h * .4, -h * .55, bl.x + bl.l * h + sway, -h); any = true; }
            if (any) g.stroke(); }
          const fls = []; g.strokeStyle = 'rgba(46,201,196,.7)'; g.lineWidth = 1.5; g.beginPath();
          for (const fl of FLOWERS) { if (fl.x < vx0 || fl.x > vx1) continue; const k = sm((t - S[4] - fl.d) / 4); if (k <= 0) continue; const h = fl.h * k, sway = Math.sin(ta * 1.2 + fl.ph) * (rm ? 0 : 3) * k, fx = fl.x + sway; g.moveTo(fl.x, 2); g.quadraticCurveTo(fl.x + sway * .4, -h * .5, fx, -h); fls.push([fl, k, h, fx]); }
          g.stroke();
          for (const col of ['#E5197F', '#8DB8FF', '#ffffff']) { g.fillStyle = col; g.beginPath(); for (const [fl, k, h, fx] of fls) { if (fl.c !== col) continue; for (let q = 0; q < 5; q++) { const an = q / 5 * TAU, px = fx + Math.cos(an) * fl.r * k, py = -h + Math.sin(an) * fl.r * k; g.moveTo(px + fl.r * .62 * k, py); g.arc(px, py, fl.r * .62 * k, 0, TAU); } } g.fill(); }
          g.fillStyle = '#FFE9A8'; g.beginPath(); for (const [fl, k, h, fx] of fls) { g.moveTo(fx + fl.r * .45 * k, -h); g.arc(fx, -h, fl.r * .45 * k, 0, TAU); } g.fill();
        }
        for (const b of branches) tipGlow(b, t, TIP_B);
        for (const b of roots) tipGlow(b, t, TIP_T);
        // leaves unfold
        if (LO < 0 && !EXL && leaves.length) { bakeLeaves(t); if (ccN) { setW(); g.globalAlpha = 1; g.drawImage(CC, CCB.x, CCB.y, CCB.w, CCB.h); } }
        for (const L of leaves) {
          if (LO >= 0) break; if (!EXL && L.ix < ccN) continue; if (L.ix % LSTEP[QTIER]) continue; if (t < L.t) continue; // each leaf unfolds over 1.8 s on curves whose speed starts and ends at zero (no overshoot, no snap at the end), so growth reads as one smooth swell
          const u = (t - L.t) / 1.8; const gu = sm(clamp(u)), k = (1 - Math.pow(1 - clamp(u), 3)) * LGK[QTIER]; if (k <= .01) continue;
          const th = L.ang + Math.sin(ta * 1.3 + L.ph) * .05 * gu + (1 - gu) * .7 * L.flip; const zs = L.size / 56; const kx = k * zs, ky = k * zs * (.55 + .45 * gu); const cs = Math.cos(th), sn = Math.sin(th);
          let lx = L.x + SK * L.y, ly = L.y, al = .98 * sm(clamp(u * 2)), th2 = th;
          if (EXL) { const q = L.q, dk = EXT - q.d; if (dk > 0) { lx += q.vx * dk; ly += q.vy * dk + 520 * dk * dk; th2 += q.sp * dk; al *= clamp(1 - (dk - .5) / .9); if (al <= 0) continue; } }
          const cs2 = Math.cos(th2), sn2 = Math.sin(th2);
          g.setTransform(S0 * cs2 * kx, S0 * sn2 * kx, -S0 * sn2 * ky, S0 * cs2 * ky, EX + S0 * lx, EY + S0 * ly);
          g.globalAlpha = al; g.drawImage(leafSpr(L.col, L.shp), -2, -20, 64, 40);
        }
        setW(); g.globalAlpha = 1;
        if (t > S[8] && LO < 0) { // petals and spare leaves drift down from the full canopy
          const fade = sm((t - S[8]) / 4); for (const p of PETALS) { const u = (p.y0 + ta * p.sp) % 1; const yy = YMIN * .8 * (1 - u), xx = p.x + Math.sin(ta * .8 + p.ph) * 40 + u * 30; g.globalAlpha = .75 * fade * Math.sin(Math.PI * u); g.fillStyle = p.c; g.save(); g.translate(xx, yy); g.rotate(ta * .9 + p.ph); g.scale(1, .55); g.beginPath(); g.arc(0, 0, p.r, 0, TAU); g.fill(); g.restore(); } g.globalAlpha = 1;
        }
        const cs = stageAt(t);
        // stage 7: extra connection nodes + links (thin teal network), stage 10: signals travel along them
        const act10 = sm((t - S[9]) / 1.6), act12 = sm((t - S[11]) / 1.4);
        for (const l of links) {
          const k = clamp((t - l.t) / 1.3); if (k <= 0) continue; const m = lineCtl(l.a, l.b, l.bow); const steps = 14, upto = Math.floor(steps * easeOut(k));
          g.strokeStyle = `rgba(46,201,196,${.38 + .2 * act12})`; g.lineWidth = 1.2; g.beginPath();
          for (let s = 0; s <= upto; s++) { const p = qb(l.a, l.b, m, s / steps); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
        }
        for (const p of lpts) {
          const u = (t - p.t) / .9; if (u <= 0) continue; const k = backOut(u), br = 1 + .25 * act10 * Math.sin(ta * 2.2 + p.ph);
          g.fillStyle = 'rgba(46,201,196,.22)'; g.beginPath(); g.arc(p.x, p.y, 8.5 * k * br, 0, TAU); g.fill();
          g.fillStyle = '#0E0D3E'; g.beginPath(); g.arc(p.x, p.y, 4.6 * k, 0, TAU); g.fill(); g.strokeStyle = '#2EC9C4'; g.lineWidth = 1.6; g.stroke();
        }
        // milestone chain (dashed) between stage markers
        for (let i = 1; i < nodes.length; i++) {
          const a = nodes[i - 1], b = nodes[i], k = clamp((t - b.t) / 1.4); if (k <= 0) continue; const m = lineCtl(a, b, .18 * (i % 2 ? 1 : -1));
          g.strokeStyle = 'rgba(141,184,255,.5)'; g.lineWidth = 1.5; g.setLineDash([6, 7]); g.lineDashOffset = -ta * 14; g.beginPath();
          const steps = 22, upto = Math.floor(steps * easeOut(k));
          for (let s = 0; s <= upto; s++) { const p = qb(a, b, m, s / steps); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
          g.stroke(); g.setLineDash([]);
        }
        // signals (stage 10 on): small lights travelling along links and the chain
        if (act10 > 0) {
          g.fillStyle = `rgba(220,240,255,${.9 * act10})`;
          links.forEach((l, i) => { if (t < l.t + 1.4) return; const u = (ta * .22 + i * .37) % 1, p = qb(l.a, l.b, lineCtl(l.a, l.b, l.bow), u); g.beginPath(); g.arc(p[0], p[1], 2.4, 0, TAU); g.fill(); });
          for (let i = 1; i < nodes.length; i++) { const a = nodes[i - 1], b = nodes[i]; if (t < b.t + 1.4) continue; const u = (ta * .16 + i * .21) % 1, p = qb(a, b, lineCtl(a, b, .18 * (i % 2 ? 1 : -1)), u); g.beginPath(); g.arc(p[0], p[1], 3, 0, TAU); g.fill(); }
        }
        // milestone nodes: upcoming = not drawn on the tree yet (see the banner), active = white + halo, completed = solid blue with a tick
        for (const n of nodes) {
          const u = (t - n.t) / 1.1; if (u <= 0) continue; const k = backOut(u); const act = n.i === cs, rad = 11.5 * k;
          const hr = rad * (act ? 3.2 : 2.2), hg = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, hr); hg.addColorStop(0, `rgba(141,184,255,${act ? .6 + .15 * Math.sin(ta * 4) : .3})`); hg.addColorStop(1, 'rgba(141,184,255,0)');
          g.fillStyle = hg; g.beginPath(); g.arc(n.x, n.y, hr, 0, TAU); g.fill();
          if (u < 1.6) { const rp = u / 1.6; g.strokeStyle = `rgba(141,184,255,${.7 * (1 - rp)})`; g.lineWidth = 2; g.beginPath(); g.arc(n.x, n.y, 10 + rp * 44, 0, TAU); g.stroke(); }
          if (act) { g.fillStyle = '#fff'; g.beginPath(); g.arc(n.x, n.y, rad, 0, TAU); g.fill(); g.fillStyle = '#1D1A5E'; g.font = `700 ${Math.round(rad * 1.05)}px Roboto, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n.i + 1), n.x, n.y + .5); }
          else { g.fillStyle = '#1570EF'; g.beginPath(); g.arc(n.x, n.y, rad, 0, TAU); g.fill(); g.strokeStyle = '#BFD6FF'; g.lineWidth = 1.8; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(n.x - rad * .42, n.y + rad * .04); g.lineTo(n.x - rad * .1, n.y + rad * .36); g.lineTo(n.x + rad * .46, n.y - rad * .32); g.stroke(); }
        }
        g.setTransform(S0, 0, 0, S0, EX, EY); drawTreeBirds(t, ta, SK);
        // dust (screen space, restrained)
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        const dAmt = .25 + .75 * sm(t / 12);
        for (const d of dust) {
          const yy = ((d.y + 1) / 2 - ((ta * .012 * d.z) % 1) + 2) % 1; const x = (d.x + 1) / 2 * W + Math.sin(ta * .4 + d.p) * 14 * d.z, y = (1 - yy) * H;
          g.fillStyle = `rgba(160,200,255,${.18 * d.z * dAmt * (.6 + .4 * Math.sin(ta * 1.3 + d.p))})`; g.beginPath(); g.arc(x, y, d.s * d.z * 1.4, 0, TAU); g.fill();
        }
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(5,4,24,0)'); vg.addColorStop(1, `rgba(5,4,24,${.62 - .22 * mature})`);
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        if (reveal > 0 && !WIDE) { g.fillStyle = `rgba(8,7,38,${.32 * reveal})`; g.fillRect(0, 0, W, H); }
        if (LO >= 0) leafHoles(ox, oy, sc, SK, ta);
        layoutLabels(t, cs, ox, oy, sc, SK, reveal);
      }
      /* The leaves open the page: every leaf swells (rim in its own colour) and erases the night scene inside itself, so the sign-in page shows through the leaves
         and the merged leaves become the whole screen. Subset of leaves + a final widening ring guarantee full coverage. */
      const LDUR = 1.9, LEND = 3.0; let SHS = 1, SHC = 0;
      let cv2 = null, g2 = null;
      function ensureCv2() {
        if (!cv2) { cv2 = doc.createElement('canvas'); cv2.className = 'ti-sh'; cv2.setAttribute('aria-hidden', 'true'); cv.after(cv2); g2 = cv2.getContext('2d'); }
        if (cv2.width !== cv.width || cv2.height !== cv.height) { cv2.width = cv.width; cv2.height = cv.height; }
      }
      /* Leaf shatter: the canopy's own leaves detach one by one, from the middle outwards. Each drifts away, turns and fades as a small single leaf, while the night scene
         (sky, trunk, branches) is cleared behind them by a soft widening dissolve, so the sign-in page is uncovered as the leaves disperse. Particles start exactly where the
         tree's leaves are, so nothing jumps. Leaves are drawn on their own overlay canvas so the clearing never erases them. */
      function leafHoles(ox, oy, sc, SK, ta) {
        const S0 = DPR * sc, EX = DPR * ox, EY = DPR * oy, W2 = cv.width, H2 = cv.height, diag = Math.hypot(W2, H2);
        ensureCv2(); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W2, H2);
        if (LO >= LEND) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W2, H2); return; }
        const cx = DPR * (ox + LCX * sc), cy = DPR * (oy + LCY * sc);
        const rv = easeIO(clamp((LO - .3) / (LEND - .6))), R = rv * diag * 2.4;
        if (R > 1) {
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
          const gr = g.createRadialGradient(cx, cy, R * .42, cx, cy, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore();
        }
        for (const L of leaves) {
          const q = L.sh; if (!q || L.ix % LSTEP[QTIER]) continue; const dk = LO - q.d, p = clamp(dk / LDUR); if (SHS > 1 && p > .4 && L.ix % SHS) continue;   // fading leaves are thinned when frames run slow
          const zs = L.size / 56 * LGK[QTIER]; let th = L.ang + Math.sin(ta * 1.3 + L.ph) * .05, lx = L.x + SK * L.y, ly = L.y, al = .9, kx = zs, ky = zs;
          if (dk > 0) {
            const e = p * p * (3 - 2 * p), w = WIND * Math.pow(dk, 1.25);   // eased in and out: leaves lift gently, glide, then settle; one shared breeze carries them all the same way
            lx += q.vx * e * 1.05 + w + Math.sin(dk * 2.2 + q.ph) * 14 * p; ly += q.vy * e * 1.05 + 70 * p * p - w * .18 + Math.cos(dk * 1.7 + q.ph) * 9 * p;
            th += q.sp * dk * .45 + Math.sin(dk * q.fl + q.ph) * .55 * p; const gk = 1 + q.gr * Math.sin(p * Math.PI * .5); kx *= gk; ky *= gk * (.5 + .5 * Math.abs(Math.cos(dk * q.fl * .7 + q.ph)));
            al *= 1 - clamp((p - .55) / .45); if (al <= .01) continue;
          }
          const cs = Math.cos(th), sn = Math.sin(th);
          g2.setTransform(S0 * cs * kx, S0 * sn * kx, -S0 * sn * ky, S0 * cs * ky, EX + S0 * lx, EY + S0 * ly);
          g2.globalAlpha = al; g2.drawImage(leafSpr(L.col, L.shp), -2, -20, 64, 40);
        }
        g2.globalAlpha = 1;
      }
      function prepLeaf() {
        if (HOLES.length) return; let sx = 0, sy = 0; for (const L of leaves) { sx += L.x; sy += L.y; } LCX = sx / leaves.length; LCY = sy / leaves.length;
        let dm = 1; for (const L of leaves) dm = Math.max(dm, Math.hypot(L.x - LCX, (L.y - LCY) * .9));
        for (const L of leaves) {
          const dx = L.x - LCX, dy = L.y - LCY, d = Math.hypot(dx, dy * .9) / dm, a = Math.atan2(dy, dx) + (Math.random() - .5) * .9, v = 200 + Math.random() * 560 * (.35 + d);
          L.sh = { d: d * (LEND - LDUR - .15) + Math.random() * .25, vx: Math.cos(a) * v + 80, vy: Math.sin(a) * v * .8 - 60, sp: (Math.random() - .5) * 7, ph: Math.random() * TAU, gr: .5 + Math.random() * 1.1, fl: 2 + Math.random() * 3 };
        }
        HOLES = [1];
      }

      /* ---------- label placement: next to its node, pushed apart until nothing overlaps ---------- */
      let OBST = { top: 0, bottom: 0, right: 0 }, lastBoxes = [], lastNodes = [];
      function measureChrome() {
        // layout offsets, not getBoundingClientRect: the heading fades/slides when its text changes, and a moving rect made the top labels (stages 11-12) jitter
        const tp = o.querySelector('.top'); OBST.top = Math.max(tp.offsetTop + tp.offsetHeight, head.offsetTop + head.offsetHeight) + 10;
        OBST.ctl = null; OBST.tag = null;
      }
      const ov = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
      function targets(t, cs, ox, oy, sc, SK, reveal) {
        const final = t >= REVEAL;
        const top = final ? 64 : OBST.top;
        let bottom = H - 12;
        const right = WIDE ? lerp(W - 12, BL - 18, reveal) : W - 12, left = 12, GAP = 6;
        if (!WIDE && final) bottom = Math.min(bottom, brand.getBoundingClientRect().top - 10);
        const items = [], obst = [];
        for (const n of nodes) {
          const L = labels[n.i];
          const appeared = t >= n.t + .15, done = n.i < cs, act = n.i === cs;
          const want = appeared && (act || (done && WIDE));
          const ax = ox + sc * (n.x + SK * n.y), ay = oy + sc * n.y;
          if (appeared) obst.push({ x: ax - 13, y: ay - 13, w: 26, h: 26, node: n.i });
          if (!want) { L.vis = false; continue; }
          const st = act ? 'act' : 'done';
          if (L.state !== st) {
            if (L.state && L.ox !== undefined) L.morph = { t0: t, fx: L.ox, fy: L.oy }; L.state = st; L.el.className = 'lbl ' + st + (L.el.classList.contains('show') ? ' show' : '');   // card -> chip: the label glides to its new spot beside the same node
            L.el.querySelector('.n').innerHTML = act ? String(n.i + 1) : TICK;
            L.w = L.el.offsetWidth; L.h = L.el.offsetHeight;
          }
          const side = Math.abs(n.x) < 30 ? (n.i % 2 ? -1 : 1) : Math.sign(n.x);   // outward from the trunk; nodes on the trunk alternate sides
          items.push({ L, ax, ay, side, w: L.w, h: L.h, pri: act ? 100 : n.i, x: 0, y: ay - L.h / 2 });
        }
        const place = it => { it.x = it.side > 0 ? it.ax + 18 : it.ax - 18 - it.w; it.x = Math.max(left, Math.min(right - it.w, it.x)); };
        const hov = (a, b) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP;
        const ov2 = (a, b) => hov(a, b) && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
        /* Order-preserving layout: every label stays at its own node's height where it can, and labels never swap places, so the column of stages always reads
           1 (bottom) to 12 (top) just like the nodes on the tree. Overlapping labels are pushed apart along that order, never past each other. */
        const seq = items.slice().sort((a, b) => a.ay - b.ay || b.L.i - a.L.i);   // highest node first
        const solve = () => {
          seq.forEach(it => { it.y = it.ay - it.h / 2; });
          for (let k = 0; k < seq.length; k++) { const it = seq[k]; it.y = Math.max(it.y, top); for (let j = 0; j < k; j++) { const p = seq[j]; it.y = Math.max(it.y, hov(p, it) ? p.y + p.h + GAP : p.y + 1); } }
          for (let k = seq.length - 1; k >= 0; k--) { const it = seq[k]; it.y = Math.min(it.y, bottom - it.h); for (let j = k + 1; j < seq.length; j++) { const q = seq[j]; it.y = Math.min(it.y, hov(q, it) ? q.y - it.h - GAP : q.y - 1); } }
        };
        seq.forEach(place); solve();
        // a label that covers another stage's node tries the other side of its own node
        let flipped = false;
        for (const it of seq) { if (!obst.some(o => o.node !== it.L.i && ov(o, it, 2))) continue; const keep = [it.side, it.x]; it.side = -it.side; place(it); if (obst.some(o => o.node !== it.L.i && ov(o, it, 2))) { it.side = keep[0]; it.x = keep[1]; } else flipped = true; }
        if (flipped) solve();
        // final guarantee: a finished-stage chip that still collides is hidden; the current stage's card always shows
        const ok = [];
        for (const it of seq.slice().sort((a, b) => b.pri - a.pri)) {
          const clash = ok.some(o => ov2(o, it)) || it.y < top - .5 || it.y + it.h > bottom + .5;
          if (clash && it.pri !== 100) { it.L.vis = false; continue; }
          it.L.vis = true; ok.push(it);
        }
        return { ok, obst, top, bottom, left, right };
      }
      /* While the tree slides left for the reveal, labels ride with it: each keeps its offset from its own node, and that offset moves smoothly from where the
         label was when the slide began to where it will sit when the slide ends (worked out once, at the start). No per-frame re-solving, so nothing jumps,
         swaps or flickers mid-slide. Outside the slide, labels also follow their node rigidly and only their offset glides when the layout changes. */
      let TRX = null, LT = 0;
      function layoutLabels(t, cs, ox, oy, sc, SK, reveal) {
        const now = performance.now(), fdt = LT ? Math.min(.1, (now - LT) / 1000) : 1 / 60; LT = now; const gk = 1 - Math.exp(-fdt * 14);   // glide rate, the same at any frame rate
        const anchor = n => [ox + sc * (n.x + SK * n.y), oy + sc * n.y];
        if (!(reveal > 0 && reveal < 1)) TRX = null;
        else if (!TRX) {
          const start = {}; labels.forEach(L => { if (L.vis && L.placed) { const [ax, ay] = anchor(nodes[L.i]); start[L.i] = [L.x - ax, L.y - ay]; } });
          const E = camAt(t, 1), end = targets(t, cs, E.ox, E.oy, E.sc, SK, 1), eo = {};
          for (const it of end.ok) eo[it.L.i] = { dx: it.x - it.ax, dy: it.y - it.ay, side: it.side, w: it.w, h: it.h, pri: it.pri };
          TRX = { start, end: eo, r0: reveal };
        }
        let ok, obst, top, bottom, left, right;
        if (TRX) {
          const e = clamp((reveal - TRX.r0) / Math.max(1e-6, 1 - TRX.r0)); ok = []; obst = [];
          for (const n of nodes) { if (t >= n.t + .15) { const [ax, ay] = anchor(n); obst.push({ x: ax - 13, y: ay - 13, w: 26, h: 26, node: n.i }); } }
          labels.forEach(L => {
            const n = nodes[L.i], [ax, ay] = anchor(n), en = TRX.end[L.i], st = TRX.start[L.i];
            if (!en) { L.vis = false; if (st) { L.x = ax + st[0]; L.y = ay + st[1]; L.el.style.transform = `translate(${L.x.toFixed(2)}px,${L.y.toFixed(2)}px)`; } return; }
            const dx = st ? lerp(st[0], en.dx, e) : en.dx, dy = st ? lerp(st[1], en.dy, e) : en.dy;
            L.vis = true; ok.push({ L, ax, ay, side: en.side, w: en.w, h: en.h, pri: en.pri, x: ax + dx, y: ay + dy, rigid: true });
          });
        } else ({ ok, obst, top, bottom, left, right } = targets(t, cs, ox, oy, sc, SK, reveal));
        lastNodes = obst.filter(o => o.node !== undefined);
        // draw leader lines and move the DOM labels (eased so they glide rather than jump)
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        // the route: a faint dotted thread joins the stages in order, root to crown, so the sequence reads along the tree itself
        if (LO < 0) { let px = 0, py = 0, has = false; g.save(); g.setLineDash([2, 6]); g.lineCap = 'round'; g.strokeStyle = 'rgba(141,184,255,.5)'; g.lineWidth = 1.5; g.beginPath();
          for (const n of nodes) { if (t < n.t + .15) break; const qx = ox + sc * (n.x + SK * n.y), qy = oy + sc * n.y; if (!has) g.moveTo(qx, qy); else g.quadraticCurveTo(px + (qx - px) * .1 + (qy - py) * .12, (py + qy) / 2, qx, qy); px = qx; py = qy; has = true; }
          g.stroke(); g.restore(); }
        lastBoxes = [];
        // glide each label toward its spot; if any glide would cross another label, leave the order, or run into the logo, every label goes straight to its spot this frame
        // glide the label's offset from its node (not its screen position), so a label never trails behind a moving node
        const nx = ok.map(it => { const L = it.L; if (it.rigid) return [it.x, it.y]; if (!L.placed || !L.el.classList.contains('show') || L.ox === undefined) return [it.x, it.y];
          const tx = it.x - it.ax, ty = it.y - it.ay;
          if (L.morph) { const q = sm((t - L.morph.t0) / .6), M = L.morph; if (q >= 1) L.morph = null; return [it.ax + lerp(M.fx, tx, q), it.ay + lerp(M.fy, ty, q)]; }   // card -> chip: a 0.6 s ease, no jump
          if (Math.hypot(tx - L.ox, ty - L.oy) > 36) return [it.x, it.y]; return [it.ax + L.ox + (tx - L.ox) * gk, it.ay + L.oy + (ty - L.oy) * gk]; });
        const gb = ok.map((it, k) => ({ x: nx[k][0], y: nx[k][1], w: it.w, h: it.h, i: it.L.i }));
        let crossed = TRX ? false : gb.some(b => b.x + b.w > right + .5 || b.x < left - .5 || b.y < top - .5 || b.y + b.h > bottom + .5);
        for (let a = 0; a < gb.length && !crossed && !TRX; a++) for (let b = a + 1; b < gb.length; b++) { const A = gb[a], B = gb[b]; if (ov(A, B, 1) || (A.i < B.i) !== (A.y + A.h / 2 > B.y + B.h / 2)) { crossed = true; break; } }
        for (let k = 0; k < ok.length; k++) {
          const it = ok[k], L = it.L;
          if (it.rigid || !L.placed || !L.el.classList.contains('show')) { L.x = nx[k][0]; L.y = nx[k][1]; L.placed = true; }
          else if (L.ox !== undefined && !L.morph && Math.hypot((it.x - it.ax) - L.ox, (it.y - it.ay) - L.oy) > 36) { L.x = it.x; L.y = it.y; L.el.classList.remove('swap'); void L.el.offsetWidth; L.el.classList.add('swap'); }   // a different spot (another label took its place): re-appear there, never slide across the tree
          else if (crossed && !L.morph) { L.x = it.x; L.y = it.y; }
          else { L.x = nx[k][0]; L.y = nx[k][1]; }
          const ex = Math.max(L.x, Math.min(L.x + it.w, it.ax)), ey = Math.max(L.y, Math.min(L.y + it.h, it.ay));
          g.strokeStyle = it.pri === 100 ? 'rgba(190,215,255,.85)' : 'rgba(141,184,255,.7)'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(it.ax, it.ay); g.lineTo(ex, ey); g.stroke();
          g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(ex, ey, 2, 0, TAU); g.fill();
          L.ox = L.x - it.ax; L.oy = L.y - it.ay;
          L.el.style.transform = `translate(${L.x.toFixed(2)}px,${L.y.toFixed(2)}px)`;
          L.el.style.setProperty('--ox', it.side > 0 ? '0' : '100%');
          lastBoxes.push({ i: L.i, x: it.x, y: it.y, w: it.w, h: it.h });
        }
        labels.forEach(L => { L.el.classList.toggle('show', L.vis); L.el.tabIndex = L.vis ? 0 : -1; if (!L.vis) L.placed = L.el.classList.contains('show') && L.placed; });
      }


      /* ---------- banner / card / headline updates ---------- */
      const lh1 = $('lh1'), lh2 = $('lh2'), skip = $('skip'), sr = $('sr');
      let lastPhase = -2, lastStage = -3;
      function ui(t) {
        const ph = PHASES.findIndex(p => t >= p[0] && t < p[1]); const phase = ph < 0 ? PHASES.length - 1 : ph;
        barEls.forEach((el, i) => { const v = phase > i ? 1 : phase === i ? clamp((t - PHASES[i][0]) / (PHASES[i][1] - PHASES[i][0])) : 0; if (el._v !== v) { el._v = v; el.style.transform = `scaleX(${v.toFixed(4)})`; } });   // transform, not width: no layout every frame
        if (phase !== lastPhase) {
          const first = lastPhase === -2; lastPhase = phase; const P = PHASES[phase];
          const apply = () => { lh1.textContent = P[2]; lh2.textContent = P[3]; head.classList.remove('sw'); measureChrome(); };
          if (first) apply(); else { head.classList.add('sw'); setTimeout(() => { if (lastPhase === phase) apply(); }, 260); }
        }
        const final = t >= REVEAL; brand.classList.toggle('on', t >= REVEAL + 2.2);   // the logo block appears once the tree has slid aside, so it never sits over the stage labels o.classList.toggle('final', final); if (final && !focused) { focused = true; setTimeout(() => { if (!closed) try { goBtn.focus({ preventScroll: true }); } catch (e) { } }, 2200); } skip.classList.toggle('gone', t >= END - .05 || LO >= 0);
        const cs = stageAt(t);
        if (cs !== lastStage) {
          lastStage = cs;
          sr.textContent = cs >= 12 ? 'All twelve delivery stages shown' : cs >= 0 ? `Stage ${cs + 1} of 12: ${STAGES[cs][0]}. ${STAGES[cs][1]}` : '';
        }
      }

      /* ---------- clock + lifecycle ---------- */
      let last = 0, closed = false, raf = 0, focused = false, fno = 0, LIQ = false;
      const goBtn = $('go');
      function frame(ts) {
        if (closed) return; raf = root.requestAnimationFrame(frame);
        if (doc.hidden) { last = 0; return; }
        if (rm || HOLD || LIQ) return;
        if (!last) last = ts; const dt = Math.min(.1, (ts - last) / 1000); last = ts;   // a long frame (GC, tab switch) slows the clock for that frame instead of jumping the tree forward
        if (LO >= 0) { LO += dt; IDLE += dt; }
        else if (CLK < WPTS[WPTS.length - 1][0]) { CLK += dt; T = warp(CLK); if (AUTO && CLK >= TR) startLeaf(); }
        else { IDLE += dt; if (fno++ & 1) return; }   // after the intro: 30fps is plenty for the sway
        const c0 = performance.now(); draw(T); ui(T); const cost = performance.now() - c0;
        /* Smoothness guard for the whole growth, not just the first second: the canopy gains leaves with every stage, so a device that is fast
           at stage 1 can drop frames at stage 7 (the stutter as stages appear). Both the drawing cost and the real frame interval are tracked as
           running averages; when either stays over budget the next quality tier is used (fewer leaf sprites drawn, slightly larger, then a lower
           canvas scale). Tiers only ever go down during one intro, so the picture never flips back and forth. */
        if (LO >= 0) { SHC = SHC * .85 + cost * .15; SHS = SHC > 12 ? 3 : SHC > 8 ? 2 : 1; }
        if (LO < 0 && T > .3 && QTIER < QT.length - 1) { ECOST = ECOST ? ECOST * .9 + cost * .1 : cost; EDT = EDT ? EDT * .9 + dt * 1000 * .1 : dt * 1000;
          slow = ECOST > 9 || EDT > 21 ? slow + 1 : Math.max(0, slow - 2);
          if (slow > 20) { QTIER++; slow = 0; ECOST = 0; EDT = 0; if (QT[QTIER] < QCAP) { QCAP = QT[QTIER]; resize(); } } }
      }
      let leafTimers = false;
      function startLeaf() {
        if (LO >= 0) return; T = END; CLK = TR; prepLeaf(); LO = 0; IDLE = 0; o.classList.add('leafout'); o.style.background = 'transparent'; leafTimers = true;
        setTimeout(() => { const au = doc.querySelector('.auth'); if (au) { au.classList.remove('auth-in'); void au.offsetWidth; au.classList.add('auth-in'); } resolve({ how: 'go', off: false }); }, 220);   // the page behind plays its entrance as the first leaves open
        setTimeout(() => cleanup(), (LEND + .2) * 1000);
      }
      function cleanup() { if (closed) return; closed = true; root.cancelAnimationFrame(raf); doc.body.classList.remove('cn-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', resize); delete root.__ti; cv.width = 1; cv.height = 1; o.remove(); }
      function seek(t) { T = clamp(t, 0, END); CLK = unwarp(T); IDLE = 0; lastPhase = -2; lastStage = -3; draw(T); ui(T); }
      /* ---------- Liquid reveal (Get started, opts.liquid) ----------
         Three Facilio-coloured liquids (teal, pink, then blue) rise from the bottom and flood the screen; the Facilio wordmark fills up with liquid like a glass,
         "Delivery Studio" settles under it, then the liquid drains downward, blue first with pink and teal trailing, and uncovers the next page (sign-in).
         The promise resolves once the screen is fully covered, so the caller can swap the page underneath before the drain starts. Canvas 2D only. */
      function liquid(how, flag) {   // the shared liquid reveal (src/liquid.js); the road journey leaves the same way
        LIQ = true; o.classList.add('liq'); root.removeEventListener('keydown', key);
        V.liquidReveal({ host: o, logoImg, dpr: DPR,
          onCovered: () => { cv.style.visibility = 'hidden'; if (cv2) cv2.style.visibility = 'hidden'; o.style.background = 'transparent'; resolve({ how, off: flag }); },
          onEntered: () => V.replayAuthEntrance() }).then(teardown);
      }
      function teardown() { if (closed) return; closed = true; root.cancelAnimationFrame(raf); doc.body.classList.remove('cn-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', resize); delete root.__ti; cv.width = 1; cv.height = 1; o.remove(); }
      function finish(how) {
        if (closed) return;
        if (opts.liquid && !rm) { if (LIQ) return; const off = o.querySelector('#tiOff'); liquid(how, !!(off && off.checked)); return; }   // Skip, Esc and Get started all pour the liquid reveal
        if (AUTO && !rm) { if (LO < 0) startLeaf(); return; }   // opening page: Skip / Esc jump straight to the leaves opening into the sign-in page
        closed = true; root.cancelAnimationFrame(raf);
        const off = o.querySelector('#tiOff'), flag = !!(off && off.checked);
        doc.body.classList.remove('cn-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', resize); delete root.__ti;
        const free = () => { cv.width = 1; cv.height = 1; o.remove(); };
        if (!rm) { // leave through the tree: the scene pans left, the leaves are cut loose and blow away, and the page behind opens in their wake
          EXL = true; for (const L of leaves) L.q = { d: Math.random() * .85, vx: 90 + Math.random() * 480, vy: -170 + Math.random() * 190, sp: (Math.random() - .5) * 9 };
          const t0 = performance.now(); o.classList.add('exit');
          const D = 1.5; const run = now => {
            const e = (now - t0) / 1000; EXT = e; EXX = easeIO(clamp((e - .1) / 1.4)) * (W * .95 + 420);
            draw(T); if (e < D + .1) root.requestAnimationFrame(run);
          };
          root.requestAnimationFrame(run);
          setTimeout(() => { const au = doc.querySelector('.auth'); if (au) { au.classList.remove('auth-in'); void au.offsetWidth; au.classList.add('auth-in'); } resolve({ how, off: flag }); }, 380);   // the page behind plays its own entrance as the scene clears
          setTimeout(free, 1800); return;
        }
        o.classList.add('out'); setTimeout(free, rm ? 0 : 600); resolve({ how, off: flag });
      }
      const key = e => { if (e.key === 'Escape') finish('skip'); };
      o.addEventListener('click', e => { if (LIQ) return; const bt = e.target.closest('[data-r]'); if (bt) finish(bt.getAttribute('data-r')); });
      root.addEventListener('keydown', key);
      if (rm) { T = END; if (AUTO) setTimeout(() => finish('go'), 1600); }
      root.__ti = { seek, nodes, S, END, REVEAL, warp, unwarp, TR, wpts: () => WPTS, get liq() { return LIQ; }, boxes: () => lastBoxes, nodeBoxes: () => lastNodes, scrub: (c, lo) => { HOLD = true; CLK = c; T = warp(c); if (lo >= 0) { prepLeaf(); LO = lo; o.classList.add('leafout'); o.style.background = 'transparent'; } else LO = -1; lastPhase = -2; lastStage = -3; draw(T); ui(T); }, get LO() { return LO; }, get T() { return T; }, get tier() { return QTIER; }, holes: () => HOLES.length, nl: () => leaves.length };
      doc.body.appendChild(o); doc.body.classList.add('cn-on');
      resize(); ui(T); if (!logoImg.complete) logoImg.addEventListener('load', () => draw(T));
      raf = root.requestAnimationFrame(frame);
      try { skip.focus({ preventScroll: true }); } catch (e) { }

    });
  };
  const classic = () => /[?&]intro=classic\b/.test(root.location.search + root.location.hash) || (() => { try { return root.localStorage.getItem('fwb_intro_classic') === '1'; } catch (e) { return false; } })();
  if (V.cinema && !V.cinemaClassic) { V.cinemaClassic = V.cinema; V.cinema = function (opts) { return classic() ? V.cinemaClassic(opts) : V.treeIntro(opts); }; }
})(typeof window !== 'undefined' ? window : globalThis);
