/* Tree-growth introduction: one continuous animation. A Facilio seed (the logo's two squares) drops into the ground, a tree grows under a lightening
   sky with drifting clouds, light rays and a few birds, then the twelve delivery stages light up from the crown (Kick-off) down to the roots (Closure),
   each with its label beside its marker. It ends on the Facilio Delivery Studio brand with Get Started.
   V.treeIntro(opts) has the same contract as V.cinema (opts: aud, name, cta, off, wipe) and resolves { how: 'go' | 'skip', off }.
   Nothing here reads project data; stage times are illustrative only. Canvas 2D, pre-baked sprites and layers, no filters, paused while the tab is hidden.
   V.cinema now uses this by default; the earlier five-scene engine is kept as V.cinemaClassic (add ?intro=classic, or set localStorage fwb_intro_classic=1, to get it back). */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews; const F = root.FWB; const esc = F.esc;
  const reduceMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  V.treeIntro = function (opts) {
    opts = opts || {}; const reduce = reduceMotion();
    return new Promise(resolve => {
      const o = doc.createElement('div'); o.className = 'cn ti' + (reduce ? ' still' : ''); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Facilio Delivery Studio introduction');
      const nm = String(opts.name || '').split(' ')[0];
      o.innerHTML = `<canvas aria-hidden="true"></canvas>
        <div class="ti-top"><img src="brand/logo-white.png" alt="Facilio" height="26"><span class="ti-sep"></span><span class="ti-prod">Delivery Studio</span><div class="ti-bars" aria-hidden="true"></div><button type="button" class="ti-skip" data-r="skip">Skip</button></div>
        <div class="ti-lbls"></div>
        <div class="ti-cap"><div class="sw"><div class="ti-c0"></div><div class="ti-c1"></div><div class="ti-c2"></div></div></div>
        <div class="ti-sr" aria-live="polite"></div>
        <div class="ti-brand">${nm ? `<p class="ti-hello">Welcome, ${esc(nm)}</p>` : ''}<img src="brand/logo-white.png" alt="Facilio" width="320" height="88"><div class="ti-ds">Delivery Studio</div><div class="ti-tagl" aria-label="Discover. Design. Deliver."><span>Discover.</span><span>Design.</span><span>Deliver.</span></div><button type="button" class="ti-go" data-r="go">${esc(opts.cta || 'Get started')}</button>${opts.off ? '<label class="ti-off"><input type="checkbox" id="tiOff"> Do not show this introduction again</label>' : ''}</div>
        <div class="ti-fade"></div>`;

      /* ---------- the 12 delivery stages: Kick-off at the crown, Closure at the roots ---------- */
      const STAGES = [
        ['Project Kick-off & Discovery', 'Establish the project vision, scope, stakeholders, and delivery approach.'],
        ['Workshops', 'Capture business processes, expectations, and implementation needs.'],
        ['Requirements', 'Organize business needs into actionable requirements.'],
        ['BRD & Sign-off', 'Review and approve documented requirements.'],
        ['Configuration & Implementation', 'Configure the solution to meet agreed requirements.'],
        ['UAT & Defect Management', 'Validate the solution and resolve identified issues.'],
        ['FTR & KPI Validation', 'Validate functional readiness and agreed performance measures.'],
        ['Customer Training & User Guides', 'Prepare users to work confidently with the solution.'],
        ['Go-Live Readiness', 'Confirm readiness for production launch.'],
        ['Hypercare', 'Provide focused support following go-live.'],
        ['Support Transition & Handover', 'Transfer operational knowledge, documentation, and responsibilities.'],
        ['Project Closure', 'Confirm completion and formally close the implementation.']
      ];
      // 0–17s the tree grows (seed, roots, trunk, branches, leaves). 17s on, the roadmap lights up from the crown down to the roots.
      const S = Array.from({ length: 12 }, (_, i) => 17 + i * 2.3);
      const REVEAL = 44.8, END = 50;
      const CAPS = [[0, 5, 'Every project starts with a seed'], [5, 12.2, 'Strong roots, a steady trunk'], [12.2, 14.2, 'Branching into the build']];
      const PHASES = [[0, 5], [5, 17], [17, 31], [31, REVEAL], [REVEAL, END]];
      const TAU = Math.PI * 2;
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
      const N = 14;
      const branches = [], roots = [], leaves = [];
      const DUR = [4.2, 3.6, 3.0, 2.5, 2.1, 1.8];
      function mk(list, x, y, ang, len, w, depth, t0, dur, tint, bend) {
        const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx; const b = (bend === undefined ? rr(-.15, .15) : bend) * len;
        const p0 = [x, y], p2 = [x + dx * len, y + dy * len], c = [x + dx * len * .5 + px * b, y + dy * len * .5 + py * b];
        const pts = [], ws = [];
        for (let i = 0; i <= N; i++) {
          const s = i / N, u = 1 - s; let X = u * u * p0[0] + 2 * u * s * c[0] + s * s * p2[0], Y = u * u * p0[1] + 2 * u * s * c[1] + s * s * p2[1];
          if (depth >= 1 && i > 0 && i < N) { const j = (R() - .5) * len * .018; X += px * j; Y += py * j; }
          pts.push([X, Y]); ws.push(lerp(w, w * .42, Math.pow(s, .85)));
        }
        const br = { pts, ws, t0, dur, depth, ang, len, w, tint, kids: [], tip: p2 }; list.push(br); return br;
      }
      const at = (br, f) => { const s = f * N, i = Math.min(N - 1, Math.floor(s)), k = s - i; return [lerp(br.pts[i][0], br.pts[i + 1][0], k), lerp(br.pts[i][1], br.pts[i + 1][1], k), lerp(br.ws[i], br.ws[i + 1], k), Math.atan2(br.pts[i + 1][1] - br.pts[i][1], br.pts[i + 1][0] - br.pts[i][0])]; };
      const tAt = (b, f) => b.t0 + f * b.dur * .85 + .2;
      const UP = -Math.PI / 2;
      function grow(parent, maxDepth) {
        const d = parent.depth + 1; if (d > maxDepth) return;
        let spec;
        if (d === 1) spec = [[.30, -1, 62, .78], [.42, 1, 58, .8], [.54, -1, 50, .74], [.64, 1, 48, .72], [.76, -1, 42, .62], [.84, 1, 40, .6], [1, -1, 24, .72], [1, 1, 22, .7]];
        else if (d === 2) spec = [[.34, -1, 50, .66], [.55, 1, 46, .62], [.78, -1, 40, .58], [1, 1, 22, .62]];
        else if (d === 3) spec = [[.45, -1, 46, .66], [.75, 1, 40, .62], [1, -1, 24, .66]];
        else spec = [[.55, 1, 44, .66], [1, -1, 26, .7]];
        spec.forEach(([f, side, a, lf], k) => {
          const s = at(parent, f); let ang = s[3] + side * (a + rr(-8, 8)) * Math.PI / 180;
          ang = ang * .86 + UP * .14;
          const len = parent.len * lf * rr(.9, 1.08);
          const t0 = d === 1 ? 9.8 + k * .28 : parent.t0 + f * parent.dur * .75 - .1;
          const kid = mk(branches, s[0], s[1], ang, len, Math.max(1.6, s[2] * .7), d, t0, DUR[d] * rr(.9, 1.1) * (len / 220 > 1 ? 1.1 : 1), 0);
          parent.kids.push(kid); grow(kid, maxDepth);
        });
      }
      const trunk = mk(branches, 0, 0, UP, 330, 34, 0, 7.0, DUR[0], 0, .035);
      grow(trunk, 4);
      const tap = mk(roots, 0, 0, Math.PI / 2, 190, 13, 0, 4.6, 4.6, 1, 0.02);
      (function growRoots(p, depth) {
        if (depth >= 3) return; const spec = depth === 0 ? [[.2, -1, 64, .66], [.3, 1, 60, .66], [.46, -1, 52, .6], [.6, 1, 50, .56], [.8, -1, 40, .5], [1, 1, 28, .5]] : [[.4, -1, 46, .64], [.8, 1, 40, .6], [1, -1, 22, .6]];
        for (const [f, side, a, lf] of spec) { const s = at(p, f); const ang = s[3] + side * (a + rr(-8, 8)) * Math.PI / 180; const len = p.len * lf * rr(.9, 1.1); const k = mk(roots, s[0], s[1], ang, len, Math.max(1.4, s[2] * .62), depth + 1, p.t0 + f * p.dur * .8, DUR[depth + 2] * 1.3, 1); growRoots(k, depth + 1); }
      })(tap, 0);
      // leaves: first wave 12.5s+, second wave 15.5s+ (so the canopy is already full when the roadmap starts)
      const LCOL = ['#2F7BFF', '#4C8FFF', '#6AA6FF', '#8DB8FF', '#3E86FF', '#2EC9C4', '#E5197F', '#6B4EE6'];
      for (const b of branches) {
        if (b.depth < 2 || (b.depth === 2 && R() < .5)) continue;
        const n = b.depth >= 4 ? 4 : b.depth === 3 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const f = b.depth >= 3 ? .4 + .6 * (i + 1) / n : .7 + .3 * R();
          const s = at(b, Math.min(1, f)); const side = i % 2 ? 1 : -1;
          const roll = R(); const ci = roll < .12 ? 5 : roll < .17 ? 6 : roll < .22 ? 7 : (R() * 5) | 0;
          const waveB = b.depth >= 4 ? R() < .75 : R() < .4;
          leaves.push({ x: s[0], y: s[1], ang: s[3] + side * rr(.5, 1.2), size: rr(19, 32) * (b.depth >= 4 ? .9 : 1) * (waveB ? 1.06 : 1), ci, t: Math.max(tAt(b, f) + .3, (waveB ? 15.5 : 12.5) + R() * 3.4), ph: R() * TAU, flip: side, wf: .6 + R() * .8, grp: (R() * 2) | 0 });
        }
      }
      leaves.sort((a, b) => a.t - b.t);

      // canopy edge per height (labels sit just outside it)
      const EB = 30, EY0 = -940, edge = new Array(40).fill(0).map(() => [120, 120]); // [left, right] half-widths
      const eat = (x, y, pad) => { const k = Math.round((y - EY0) / EB); for (let j = k - 2; j <= k + 2; j++) if (j >= 0 && j < 40) { if (x < 0) edge[j][0] = Math.max(edge[j][0], -x + pad); else edge[j][1] = Math.max(edge[j][1], x + pad); } };
      for (const b of branches) for (const p of b.pts) eat(p[0], p[1], 14);
      for (const L of leaves) eat(L.x, L.y, 26);
      const edgeAt = (y, side) => edge[clamp(Math.round((y - EY0) / EB), 0, 39)][side < 0 ? 0 : 1];

      // the 12 markers: stage 1 in the crown, then down through the branches and trunk to the roots
      let crown = 0; for (const b of branches) for (const p of b.pts) crown = Math.min(crown, p[1]); crown += 34;
      const YT = Array.from({ length: 12 }, (_, i) => i < 10 ? lerp(crown, -100, i / 9) : i === 10 ? -24 : 78);
      const nodes = [];
      YT.forEach((ty, i) => {
        const side = i % 2 ? -1 : 1; let best = null;
        if (i === 11) { const s = at(tap, .4); best = { x: s[0], y: s[1] }; }
        else if (i >= 7) { const f = clamp(-ty / 330, .05, .99), s = at(trunk, f); best = { x: s[0], y: s[1] }; }
        else {
          let bs = 1e9;
          for (const b of branches) {
            if (b.depth < 1 || b.depth > 4) continue;
            for (const f of [.4, .6, .8, 1]) {
              const s = at(b, f); if (Math.sign(s[0]) !== side || Math.abs(s[0]) < 50) continue;
              if (i && s[1] < nodes[i - 1].y + 45) continue; let clash = false; for (const n of nodes) if (n && n.side === side && Math.abs(n.y - s[1]) < 100) clash = true; if (clash) continue;
              let pen = Math.abs(s[1] - ty) / 28 + Math.max(0, tAt(b, f) - (S[i] - .3)) * 3 + (b.depth > 3 ? .8 : 0);
              for (const n of nodes) if (n) { const d = Math.hypot(n.x - s[0], n.y - s[1]); if (d < 90) pen += (90 - d) / 8; }
              if (pen < bs) { bs = pen; best = { x: s[0], y: s[1] }; }
            }
          }
        }
        nodes[i] = { x: best.x, y: best.y, t: S[i], i, side, ax: 0 };
      });
      nodes.forEach(n => { const e = edgeAt(n.y, n.side); n.ax = n.side * Math.max(e + 12, Math.abs(n.x) + 40); });

      /* ---------- DOM: labels + caption ---------- */
      const $ = c => o.querySelector('.ti-' + c);
      const escT = s => s.replace(/&/g, '&amp;');
      const bars = $('bars'), lbls = $('lbls');
      const labs = STAGES.map(([t, d], i) => {
        const el = document.createElement('div'); el.className = 'lb ' + (nodes[i].side > 0 ? 'r' : 'l');
        el.innerHTML = `<div class="in"><div class="lt"><i>${String(i + 1).padStart(2, '0')}</i>${escT(t)}</div><div class="ld">${d}</div></div>`;
        lbls.appendChild(el); return el;
      });
      const barEls = PHASES.map((p, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Jump to part ' + (i + 1)); b.innerHTML = '<i></i>'; b.addEventListener('click', () => seek(p[0] + .01)); bars.appendChild(b); return b.firstChild; });

      /* ---------- canvas, layout, camera ---------- */
      const cv = o.querySelector('canvas'), brand = $('brand'); let g = cv.getContext('2d');
      let W = 0, H = 0, DPR = 1, FIT = 1, QCAP = 1.5, slow = 0, WIDE = true, RT = 58, RB = 0, BL = 0, LWpx = 220, IDLE = 0, T = 0;
      let raysCv = null;
      // settled leaves are baked into three offscreen layers (world x -600..600, y -950..150) that sway slightly out of step: ~1100 leaves cost 3 blits per frame
      let bx0 = 0, bx1 = 0, by0 = 0; for (const b of branches) for (const p of b.pts) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); } for (const L of leaves) { bx0 = Math.min(bx0, L.x); bx1 = Math.max(bx1, L.x); by0 = Math.min(by0, L.y); }
      const LYX = Math.floor(bx0 - 50), LYY = Math.floor(by0 - 50), LYW = Math.ceil(bx1 - bx0 + 100), LYH = -LYY - 40, NG = 2, layers = Array.from({ length: NG }, () => document.createElement('canvas')), lctx = layers.map(c => c.getContext('2d'));
      const WH = -LYY + 10, WOOD = document.createElement('canvas'), wctx = WOOD.getContext('2d'); let wbaked = [], woodMax = -1;
      let LS = 1, settled = 0;
      function buildLayers() { LS = clamp(DPR * FIT * 1.15, .5, 1.6); layers.forEach(c => { c.width = Math.round(LYW * LS); c.height = Math.round(LYH * LS); }); settled = 0; WOOD.width = Math.round(LYW * LS); WOOD.height = Math.round(WH * LS); wbaked = []; woodMax = -1; }
      function bakeLeaf(L) { const x = lctx[L.grp], ab = ((Math.round(L.ang / TAU * LA) % LA) + LA) % LA, half = 32 * L.size / 56; x.globalAlpha = .9; x.drawImage(leafSpr(L.ci, ab), (L.x + Math.cos(L.ang) * L.size * .5 - half - LYX) * LS, (L.y + Math.sin(L.ang) * L.size * .5 - half - LYY) * LS, half * 2 * LS, half * 2 * LS); }
      function bakeUpTo(t) {
        if (settled > 0 && leaves[settled - 1].t + 1.8 > t) { lctx.forEach((x, i) => x.clearRect(0, 0, layers[i].width, layers[i].height)); settled = 0; }
        while (settled < leaves.length && leaves[settled].t + 1.8 <= t) bakeLeaf(leaves[settled++]);
      }
      function bakeWood(t) {
        if (t < woodMax) { wctx.clearRect(0, 0, WOOD.width, WOOD.height); wbaked = []; woodMax = -1; }
        const keep = g; g = wctx; wctx.setTransform(LS, 0, 0, LS, -LYX * LS, -LYY * LS);
        for (let i = 0; i < branches.length; i++) { const b = branches[i], end = b.t0 + b.dur; if (wbaked[i] || t < end) continue; drawBranch(b, 1); wbaked[i] = true; woodMax = Math.max(woodMax, end); }
        g = keep;
      }

      function buildRays() {
        const w = Math.max(2, W >> 2), h = Math.max(2, H >> 2); raysCv = document.createElement('canvas'); raysCv.width = w; raysCv.height = h; const x = raysCv.getContext('2d');
        [[.18, .12, .5], [.34, .09, .36], [.52, .1, .42], [.7, .07, .3]].forEach(([c, wd, a]) => {
          const gr = x.createLinearGradient(0, 0, w * .25, h); gr.addColorStop(0, `rgba(190,215,255,${a})`); gr.addColorStop(1, 'rgba(190,215,255,0)'); x.fillStyle = gr;
          x.beginPath(); x.moveTo(w * (c - wd * .25), -2); x.lineTo(w * (c + wd * .25), -2); x.lineTo(w * (c + wd * 1.8 + .22), h); x.lineTo(w * (c - wd * 1.8 + .22), h); x.closePath(); x.fill();
        });
      }
      function resize() {
        DPR = Math.min(QCAP, window.devicePixelRatio || 1); W = o.clientWidth; H = o.clientHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        WIDE = W >= 1000 && W / H > 1.2; o.classList.toggle('narrow', !WIDE); o.style.setProperty('--lw', clamp(.155 * W, 180, 250) + 'px');
        RT = 58; LWpx = clamp(.155 * W, 180, 250);
        if (WIDE) { RB = H; FIT = Math.min(W / 980, (RB - RT) / 1100); }
        else { RB = H - 200; FIT = Math.min(W / 760, (RB - RT) / 1100); }
        if (WIDE) { const bw = Math.min(W * .36, 600), pad = Math.max(28, Math.min(W * .05, 96)); BL = W - pad - bw; brand.style.cssText = `left:${BL}px;width:${bw}px;top:50%;transform:translateY(-50%);bottom:auto;right:auto`; }
        else { BL = W; brand.style.cssText = 'left:0;right:0;width:auto;top:auto;bottom:7%;transform:none'; }
        buildRays(); buildLayers(); draw(T);
      }
      root.addEventListener('resize', resize);
      const CAM = [[0, -100, 2.2], [2.8, -40, 2.8], [4.6, 10, 2.5], [6.6, 95, 1.5], [8.6, 60, 1.3], [11.4, -120, 1.12], [14.5, -270, 1.12], [17, -350, 1.1], [31, -355, 1.09], [REVEAL, -355, 1.05], [END, -355, 1.03]];
      const CT = CAM.map(k => k[0]), CYv = CAM.map(k => k[1]), CZv = CAM.map(k => Math.log(k[2]));
      const slopes = v => v.map((_, i) => { if (i === 0 || i === v.length - 1) return 0; const a = (v[i] - v[i - 1]) / (CT[i] - CT[i - 1]), b = (v[i + 1] - v[i]) / (CT[i + 1] - CT[i]); return a * b <= 0 ? 0 : 2 * a * b / (a + b); });
      const CYm = slopes(CYv), CZm = slopes(CZv);
      function herm(v, m, t) { let i = 0; while (i < CT.length - 2 && t > CT[i + 1]) i++; const h = CT[i + 1] - CT[i], u = clamp((t - CT[i]) / h), u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m[i + 1]; }
      const cam = t => [herm(CYv, CYm, t), Math.exp(herm(CZv, CZm, t))];

      /* ---------- Facilio mark: the logo's two squares are the seed ---------- */
      const logoImg = o.querySelector('.ti-top img');
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

      /* ---------- environment: clouds, birds, hills (all pre-baked sprites, no filters) ---------- */
      function cloudSprite(seed) {
        const r = rng(seed), c = document.createElement('canvas'); c.width = 360; c.height = 130; const x = c.getContext('2d');
        for (let i = 0; i < 9; i++) { const cx = 60 + r() * 240, cy = 70 + (r() - .5) * 34, rad = 30 + r() * 42, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rad); gr.addColorStop(0, 'rgba(205,222,255,.55)'); gr.addColorStop(1, 'rgba(205,222,255,0)'); x.fillStyle = gr; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
        return c;
      }
      const cloudSprs = [11, 23, 37, 41].map(cloudSprite);
      const clouds = Array.from({ length: 7 }, (_, i) => { const z = R(); return { spr: cloudSprs[i % 4], y: .07 + R() * .36, sp: 5 + z * 12, sc: .8 + z * 1.2, a: .1 + z * .16, x0: R(), z }; });
      const birds = Array.from({ length: 7 }, (_, i) => ({ y: .12 + R() * .38, sp: 22 + R() * 38, sz: .55 + R() * .7, dir: i % 3 === 2 ? -1 : 1, off: R(), ph: R() * TAU, fl: 5 + R() * 3, gap: 2.2 + R() * 2.5 }));
      const dust = Array.from({ length: 26 }, () => ({ x: rr(-1, 1), y: rr(-1, 1), z: rr(.3, 1), s: rr(.6, 1.6), p: rr(0, TAU) }));

      /* ---------- drawing ---------- */
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
            g.lineWidth = (b.ws[i] * widthMul) + (pass ? 0 : 2.6); g.globalAlpha = (pass ? 1 : .55) * alphaMul;
            g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
      function drawBranch(b, gr2) {
        strokeBranch(b, gr2, ['#24399A', '#2A47B3', '#2F58CF', '#3A6BE8', '#4D80F4', '#6A98FF'][Math.min(5, b.depth)], `rgba(141,184,255,${.34 + .06 * b.depth})`, 1, 1);
        if (b.depth <= 1) {
          g.strokeStyle = b.depth ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.14)'; g.lineWidth = b.depth ? 1.6 : 2.6; g.lineCap = 'round'; g.beginPath();
          const up = easeOut(gr2) * .35 + gr2 * .65, lim = Math.floor(up * N);
          for (let i = 0; i <= Math.min(N, lim); i++) { const p = b.pts[i], w = b.ws[i] * (b.depth ? .2 : .24), nx = b.depth ? -Math.sin(b.ang) : -1, ny = b.depth ? Math.cos(b.ang) : 0; if (i === 0) g.moveTo(p[0] + nx * w, p[1] + ny * w); else g.lineTo(p[0] + nx * w, p[1] + ny * w); } g.stroke();
        }
      }
      const tipPoint = (b, gr) => at(b, clamp(easeOut(gr) * .35 + gr * .65));
      function sprite(c0) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, c0); r.addColorStop(1, 'rgba(100,160,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); return c; }
      const TIP_B = sprite('rgba(200,225,255,.9)'), TIP_T = sprite('rgba(120,235,230,.85)');
      function tipGlow(b, t, spr) { const gr = growth(b, t); if (gr <= 0 || gr >= 1) return; const p = tipPoint(b, gr), rad = b.depth === 0 ? 16 : 9; g.drawImage(spr, p[0] - rad, p[1] - rad, rad * 2, rad * 2); }
      // leaf sprites: 8 colours x 24 angles, drawn with plain drawImage (no per-leaf matrix changes)
      const LA = 24, LSP = {};
      function leafSpr(ci, ab) {
        const key = ci * LA + ab; if (LSP[key]) return LSP[key];
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.translate(32, 32); x.rotate(ab / LA * TAU); x.translate(-28, 0); const z = 56;
        x.fillStyle = LCOL[ci]; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(z * .45, -z * .32, z * .95, -z * .22, z, 0); x.bezierCurveTo(z * .95, z * .22, z * .45, z * .32, 0, 0); x.fill();
        return LSP[key] = c;
      }
      const mixc = (a, b, k) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
      function stageAt(t) { if (t >= REVEAL) return 12; let c = -1; for (let i = 0; i < 12; i++) if (t >= S[i]) c = i; return c; }
      const ctl = (a, b, bow) => [(a.x + b.x) / 2 + (b.y - a.y) * bow, (a.y + b.y) / 2 - (b.x - a.x) * bow];
      const qb = (a, b, m, u) => { const v = 1 - u; return [v * v * a.x + 2 * v * u * m[0] + u * u * b.x, v * v * a.y + 2 * v * u * m[1] + u * u * b.y]; };
      const view = { ox: 0, oy: 0, sc: 1, SK: 0, labels: true };

      function draw(t) {
        const ta = t + IDLE, [cy, zm] = cam(t);
        const lite = sm((t - 2) / 40), reveal = sm((t - REVEAL) / 2.6), wind = .55 + .45 * Math.sin(ta * .31) * Math.sin(ta * .13 + 1);
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        // sky: pre-dawn navy -> bright optimistic blue with a faint warm horizon
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, mixc([6, 5, 30], [16, 30, 104], lite)); bg.addColorStop(.55, mixc([10, 9, 44], [34, 56, 150], lite)); bg.addColorStop(1, mixc([8, 7, 38], [52, 58, 160], lite));
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // layout / camera
        const RH = RB - RT; let sc = FIT * zm * (WIDE ? 1 : .8), fx = W / 2, fy = RT + RH * .5; view.labels = WIDE;
        if (WIDE) {
          const half = 440 * sc, kL = ((BL - 40) / 2 - 14 - LWpx) / half; let k, cx;
          if (kL >= .8) { k = Math.min(1, kL); view.labels = true; } else { k = Math.min(1, (BL - 40) / (2 * half)); view.labels = false; }
          cx = BL / 2; sc *= lerp(1, k, reveal); fx = lerp(W / 2, cx, reveal);
        } else { sc *= 1 - .2 * reveal; fy -= RH * .17 * reveal; }
        const ox = fx, oy = fy - cy * sc, gY = oy; // gY = ground line on screen
        // light rays + horizon glow
        if (lite > .02) {
          g.globalAlpha = .55 * lite * (.8 + .2 * Math.sin(ta * .21)); g.drawImage(raysCv, Math.sin(ta * .07) * 18 - 12, 0, W + 24, H); g.globalAlpha = 1;
          const hg = g.createRadialGradient(W * .5, gY, 0, W * .5, gY, W * .55); hg.addColorStop(0, `rgba(229,25,127,${.13 * lite})`); hg.addColorStop(.5, `rgba(120,80,220,${.07 * lite})`); hg.addColorStop(1, 'rgba(60,60,200,0)');
          g.save(); g.translate(0, gY); g.scale(1, .45); g.translate(0, -gY); g.fillStyle = hg; g.fillRect(W * .5 - W * .55, gY - W * .55, W * 1.1, W * 1.1); g.restore();
        }
        // clouds: three depth layers drifting at different speeds
        const cIn = clamp(t / 2.5);
        for (const c of clouds) {
          const w = 360 * c.sc, x = ((c.x0 * (W + w) + ta * c.sp) % (W + w)) - w; g.globalAlpha = c.a * cIn * (.8 + .5 * lite); g.drawImage(c.spr, x, H * c.y, w, 130 * c.sc);
        }
        g.globalAlpha = 1;
        // distant hills (two layers) sitting on the ground line
        for (let L = 0; L < 2; L++) {
          const amp = (L ? 34 : 56) * (sc / .8), base = gY - (L ? 4 : 10) * sc; g.fillStyle = L ? mixc([10, 12, 56], [22, 34, 110], lite) : mixc([13, 15, 64], [30, 44, 130], lite);
          g.beginPath(); g.moveTo(0, H); g.lineTo(0, base);
          for (let x = 0; x <= W; x += W / 24) g.lineTo(x, base - amp * (.5 + .5 * Math.sin(x * (L ? .0058 : .0036) + L * 2.1)) * (.6 + .4 * Math.sin(x * .0017 + 1 + L)));
          g.lineTo(W, H); g.closePath(); g.fill();
        }
        // canopy glow + ground light
        const mature = sm((t - 14) / 16), gl = [ox, oy - 640 * sc], gr = 560 * sc;
        if (mature > 0) { const rg = g.createRadialGradient(gl[0], gl[1], 0, gl[0], gl[1], gr); rg.addColorStop(0, `rgba(60,120,255,${.3 * mature})`); rg.addColorStop(.45, `rgba(46,100,230,${.12 * mature})`); rg.addColorStop(1, 'rgba(21,112,239,0)'); g.fillStyle = rg; g.fillRect(gl[0] - gr, gl[1] - gr, gr * 2, gr * 2); }
        g.save(); g.translate(ox, gY); g.scale(1, .26); const pool = g.createRadialGradient(0, 0, 0, 0, 0, 460 * sc); pool.addColorStop(0, `rgba(80,140,255,${.3 + .12 * mature})`); pool.addColorStop(1, 'rgba(21,112,239,0)'); g.fillStyle = pool; g.fillRect(-460 * sc, -460 * sc, 920 * sc, 920 * sc); g.restore();

        // ---- world
        const S0 = DPR * sc, EX = DPR * ox, EY = DPR * oy;
        const sw = sm((t - 14) / 6), SK = sw * wind * (.011 * Math.sin(ta * .62) + .005 * Math.sin(ta * 1.27 + 2)) * (rm ? 0 : 1);
        const setW = () => g.setTransform(S0, 0, S0 * SK, S0, EX, EY);
        g.setTransform(S0, 0, 0, S0, EX, EY);
        view.ox = ox; view.oy = oy; view.sc = sc; view.SK = SK;
        const ug = g.createLinearGradient(0, 0, 0, 300); ug.addColorStop(0, 'rgba(4,4,24,.35)'); ug.addColorStop(1, 'rgba(4,4,24,0)'); g.fillStyle = ug; g.fillRect(-3000, 0, 6000, 300);
        const fr = easeOut((t - .3) / 2.2), gl2 = g.createLinearGradient(-520, 0, 520, 0); gl2.addColorStop(0, 'rgba(141,184,255,0)'); gl2.addColorStop(.5, `rgba(141,184,255,${.5 * fr})`); gl2.addColorStop(1, 'rgba(141,184,255,0)');
        g.strokeStyle = gl2; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-520, 0); g.lineTo(520, 0); g.stroke();
        for (let i = 0; i < 3; i++) { const k = easeOut((t - .5 - i * .35) / 2.2); if (k <= 0) continue; g.strokeStyle = `rgba(141,184,255,${(.3 - i * .08) * k})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 0, (70 + i * 62) * k, (14 + i * 11) * k, 0, 0, TAU); g.stroke(); }

        // seed: the Facilio squares drop out of the wordmark into the ground
        if (t < 6.4) {
          const lg = logoReady(), la = clamp(t / .8) * (1 - sm((t - 1.9) / 1.2));
          if (lg && la > 0) { g.globalAlpha = la; g.drawImage(lg, LX, LY, LW, LH); g.globalAlpha = 1; }
          const sink = easeIO((t - SINK0) / 1.4), vis = 1 - sm((t - 4.9) / 1.3), sa = clamp(t / .8) * vis;
          for (const key of ['pink', 'teal']) { const k = (t - SEED[key].ts - LAND) / 1.5; if (k > 0 && k < 1) { g.strokeStyle = `rgba(141,184,255,${.5 * (1 - k)})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(SEED[key].tx * (1 - sink), 0, 12 + 70 * easeOut(k), 3 + 16 * easeOut(k), 0, 0, TAU); g.stroke(); } }
          if (t > SEED.pink.ts + LAND) { const pulse = (Math.sin(t * 3.2) + 1) / 2, cyg = -7 + 26 * sink, r0 = (26 + pulse * 8) * (1 - .3 * sink); const sg = g.createRadialGradient(0, cyg, 0, 0, cyg, r0 * 2.6); sg.addColorStop(0, `rgba(190,215,255,${.55 * sa})`); sg.addColorStop(.4, `rgba(70,140,255,${.28 * sa})`); sg.addColorStop(1, 'rgba(21,112,239,0)'); g.fillStyle = sg; g.beginPath(); g.arc(0, cyg, r0 * 2.6, 0, TAU); g.fill(); }
          for (const key of ['pink', 'teal']) {
            const o = SEED[key], from = sqc(SQ[key]), u = clamp((t - o.ts) / LAND), e = u * u, land = t - o.ts - LAND, bounce = land > 0 ? -Math.abs(Math.sin(land * 7)) * 6 * Math.exp(-land * 4.2) : 0;
            let x = lerp(from[0], o.tx, sm(u)), y = lerp(from[1], o.ty, e) + bounce; x *= 1 - .45 * sink; y += 26 * sink;
            const s = SQS * (1 - .3 * sink); g.save(); g.translate(x, y); g.rotate((1 - e) * o.rot * 1.6); g.globalAlpha = sa; g.fillStyle = o.col; g.fillRect(-s / 2, -s / 2, s, s); g.restore(); g.globalAlpha = 1;
          }
        }
        // roots (a touch brighter once the roadmap reaches them)
        const rootGlow = sm((t - S[10]) / 3);
        for (const b of roots) strokeBranch(b, growth(b, t), b.depth ? '#2E8FD8' : '#3B7BE0', `rgba(46,201,196,${.55 + .3 * rootGlow})`, b.depth ? .8 : 1, .95);
        setW();
        bakeWood(t); g.drawImage(WOOD, LYX, LYY, LYW, WH);
        for (let i = 0; i < branches.length; i++) { if (wbaked[i]) continue; const b = branches[i], gr2 = growth(b, t); if (gr2 > 0) drawBranch(b, gr2); }
        for (const b of branches) tipGlow(b, t, TIP_B);
        for (const b of roots) tipGlow(b, t, TIP_T);
        // leaves: settled ones come from the baked layers (swaying a little, out of step); the few still unfolding are drawn directly
        bakeUpTo(t);
        for (let gi = 0; gi < NG; gi++) g.drawImage(layers[gi], LYX + wind * Math.sin(ta * 1.1 + gi * 2.1) * 1.6, LYY + wind * Math.cos(ta * .9 + gi * 1.7) * .8, LYW, LYH);
        let ga = -1;
        for (let li = settled; li < leaves.length; li++) {
          const L = leaves[li]; if (t < L.t) break; const u = (t - L.t) / 1.8, k = backOut(u); if (k <= .02) continue;
          const th = L.ang + (1 - clamp(u)) * 1.1 * L.flip, ab = ((Math.round(th / TAU * LA) % LA) + LA) % LA, half = 32 * L.size / 56 * k;
          const cx = L.x + Math.cos(th) * L.size * .5 * k, cyy = L.y + Math.sin(th) * L.size * .5 * k;
          const al = .9 * clamp(u * 2.2); if (al !== ga) { g.globalAlpha = al; ga = al; }
          g.drawImage(leafSpr(L.ci, ab), cx - half, cyy - half, half * 2, half * 2);
        }
        g.globalAlpha = 1;
        // roadmap: the journey line down the tree, then the markers (upcoming = faint, active = white, done = solid blue)
        const cs = stageAt(t), ready = t > S[0] - 1.6;
        if (ready) {
          for (let i = 1; i < 12; i++) {
            const a = nodes[i - 1], b = nodes[i], k = clamp((t - b.t) / 1.5); if (k <= 0) continue; const m = ctl(a, b, .16 * (i % 2 ? 1 : -1));
            g.strokeStyle = `rgba(160,200,255,${.62})`; g.lineWidth = 1.7; g.beginPath(); const steps = 18, upto = Math.floor(steps * easeOut(k));
            for (let s = 0; s <= upto; s++) { const p = qb(a, b, m, s / steps); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
          }
          const fa = clamp((t - (S[0] - 1.6)) / 1.2), pulse = .5 + .5 * Math.sin(ta * 3.4);
          for (const n of nodes) {
            const u = (t - n.t) / 1.0;
            if (u <= 0) { g.fillStyle = `rgba(141,184,255,${.35 * fa})`; g.beginPath(); g.arc(n.x, n.y, 4.2, 0, TAU); g.fill(); g.strokeStyle = `rgba(14,13,62,${.7 * fa})`; g.lineWidth = 1.4; g.stroke(); continue; }
            const k = backOut(u), act = n.i === cs, rad = 12.5 * k;
            // leader line out to the label
            const lk = clamp((t - n.t - .15) / .7); if (lk > 0 && view.labels && WIDE) { const x1 = lerp(n.x, n.ax - n.side * 4, easeOut(lk)); const gl3 = g.createLinearGradient(n.x, 0, x1, 0); gl3.addColorStop(0, `rgba(190,215,255,${act ? .75 : .45})`); gl3.addColorStop(1, `rgba(190,215,255,${act ? .5 : .22})`); g.strokeStyle = gl3; g.lineWidth = 1.3; g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(x1, n.y); g.stroke(); }
            const hr = rad * (act ? 3.3 : 2.2), hg = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, hr); hg.addColorStop(0, `rgba(141,184,255,${act ? .5 + .15 * pulse : .26})`); hg.addColorStop(1, 'rgba(141,184,255,0)'); g.fillStyle = hg; g.beginPath(); g.arc(n.x, n.y, hr, 0, TAU); g.fill();
            if (u < 1.7) { const rp = u / 1.7; g.strokeStyle = `rgba(141,184,255,${.7 * (1 - rp)})`; g.lineWidth = 2; g.beginPath(); g.arc(n.x, n.y, 10 + rp * 46, 0, TAU); g.stroke(); }
            if (act) { g.fillStyle = '#fff'; g.beginPath(); g.arc(n.x, n.y, rad, 0, TAU); g.fill(); g.fillStyle = '#1D1A5E'; g.font = `700 ${Math.round(rad * 1.05)}px Roboto, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n.i + 1), n.x, n.y + .5); }
            else { g.fillStyle = '#1570EF'; g.beginPath(); g.arc(n.x, n.y, rad, 0, TAU); g.fill(); g.strokeStyle = '#BFD6FF'; g.lineWidth = 1.8; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(n.x - rad * .42, n.y + rad * .04); g.lineTo(n.x - rad * .1, n.y + rad * .36); g.lineTo(n.x + rad * .46, n.y - rad * .32); g.stroke(); }
          }
        }
        // screen space: birds, a few motes, vignette
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        const bIn = sm((t - 8) / 3) * (rm ? 0 : 1);
        if (bIn > 0) {
          g.lineCap = 'round'; g.lineJoin = 'round';
          for (let i = 0; i < (WIDE ? 7 : 4); i++) {
            const b = birds[i], P = (W + 160) / b.sp + b.gap, ph = ((ta + b.off * P) % P) / P * P; const run = ph * b.sp; if (run > W + 160) continue;
            const x = b.dir > 0 ? run - 80 : W + 80 - run, y = H * b.y + Math.sin(ta * .7 + b.ph) * 10 + (run / (W + 160)) * -18, s = 7 * b.sz * (WIDE ? 1 : .8);
            const f = Math.sin(ta * b.fl + b.ph), wy = f * s * .8, al = .5 * b.sz * bIn * clamp(Math.min(run, W + 160 - run) / 120);
            g.strokeStyle = `rgba(215,228,255,${al})`; g.lineWidth = 1.3 * b.sz + .3; g.beginPath(); g.moveTo(x - s, y - wy * .6); g.quadraticCurveTo(x - s * .4, y - wy - s * .25, x, y); g.quadraticCurveTo(x + s * .4, y - wy - s * .25, x + s, y - wy * .6); g.stroke();
          }
        }
        const dAmt = .25 + .75 * sm(t / 12);
        for (const d of dust) { const yy = ((d.y + 1) / 2 - ((ta * .012 * d.z) % 1) + 2) % 1, x = (d.x + 1) / 2 * W + Math.sin(ta * .4 + d.p) * 14 * d.z, y = (1 - yy) * H; g.fillStyle = `rgba(190,215,255,${.2 * d.z * dAmt * (.6 + .4 * Math.sin(ta * 1.3 + d.p))})`; g.beginPath(); g.arc(x, y, d.s * d.z * 1.3, 0, TAU); g.fill(); }
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(5,4,24,0)'); vg.addColorStop(1, `rgba(5,4,24,${.55 - .25 * lite})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        if (reveal > 0 && !WIDE) { g.fillStyle = `rgba(8,7,38,${.3 * reveal})`; g.fillRect(0, 0, W, H); }
      }

      /* ---------- labels follow their markers (transform only) ---------- */
      const lastPos = labs.map(() => [-1e9, -1e9]);
      function placeLabels() {
        if (!WIDE) return; const { ox, oy, sc, SK } = view;
        nodes.forEach((n, i) => {
          const x = ox + (n.ax + SK * n.y) * sc + n.side * 4, y = oy + n.y * sc, lp = lastPos[i]; if (Math.abs(lp[0] - x) < .4 && Math.abs(lp[1] - y) < .4) return; lp[0] = x; lp[1] = y;
          labs[i].style.transform = n.side > 0 ? `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translateY(-50%)` : `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-100%,-50%)`;
        });
      }

      /* ---------- UI state ---------- */
      const cap = $('cap'), c0 = $('c0'), c1 = $('c1'), c2 = $('c2'), skip = $('skip'), sr = $('sr'), goBtn = $('go');
      let lastStage = -3, lastCap = '', capTimer = 0;
      function setCap(a, b, c) { const key = a + b + c; if (key === lastCap) return; const first = lastCap === ''; lastCap = key; clearTimeout(capTimer); const apply = () => { c0.textContent = a; c1.textContent = b; c2.textContent = c; cap.classList.remove('chg'); }; if (first) apply(); else { cap.classList.add('chg'); capTimer = setTimeout(apply, 280); } }
      function ui(t) {
        const ph = PHASES.findIndex(p => t >= p[0] && t < p[1]), phase = ph < 0 ? PHASES.length - 1 : ph;
        barEls.forEach((el, i) => { el.style.width = (phase > i ? 100 : phase === i ? clamp((t - PHASES[i][0]) / (PHASES[i][1] - PHASES[i][0])) * 100 : 0) + '%'; });
        const final = t >= REVEAL, bOn = t >= REVEAL + 1.5; brand.classList.toggle('on', bOn); skip.classList.toggle('gone', t >= END - .05);
        if (bOn && !focused) { focused = true; setTimeout(() => { if (!closed) try { goBtn.focus({ preventScroll: true }); } catch (e) { } }, 700); }
        lbls.classList.toggle('hide', final && !view.labels);
        const cs = stageAt(t);
        if (cs !== lastStage) {
          lastStage = cs;
          labs.forEach((el, i) => { el.classList.toggle('act', i === cs); el.classList.toggle('on', i < cs); });
          sr.textContent = cs >= 12 ? 'All twelve delivery stages shown, from kick-off at the crown to closure at the roots' : cs >= 0 ? `Stage ${cs + 1} of 12: ${STAGES[cs][0]}. ${STAGES[cs][1]}` : '';
        }
        // caption: growth phases (wide + narrow), then the active stage on narrow screens only
        const cp = CAPS.find(c => t >= c[0] && t < c[1]);
        if (cp) { cap.classList.remove('off'); setCap('', cp[2], ''); }
        else if (!WIDE && cs >= 0 && cs < 12 && !final) { cap.classList.remove('off'); setCap(`STAGE ${cs + 1} OF 12`, STAGES[cs][0], STAGES[cs][1]); }
        else cap.classList.add('off');
      }

      /* ---------- clock + lifecycle ---------- */
      let playing = !rm, last = 0, frameNo = 0, closed = false, raf = 0, focused = false;
      function frame(ts) {
        if (closed) return; raf = root.requestAnimationFrame(frame);
        if (doc.hidden) { last = 0; return; }
        if (rm) return;
        if (!last) last = ts; const dt = Math.min(.1, (ts - last) / 1000); last = ts;
        if (playing && T < END) T = Math.min(END, T + dt);
        if (T >= END) { IDLE += dt; if (frameNo++ & 1) return; }  // idle after the intro: 30fps is plenty for the sway
        const c = performance.now(); draw(T); ui(T); placeLabels(); const cost = performance.now() - c;
        if (QCAP > .6 && T > 4) { slow = cost > 24 ? slow + 1 : Math.max(0, slow - 1); if (slow > 25) { QCAP = Math.max(.6, Math.min(QCAP, DPR) * .8); slow = 0; resize(); } }
      }
      function seek(t) { T = clamp(t, 0, END); IDLE = 0; lastStage = -3; lastCap = ''; draw(T); ui(T); placeLabels(); }
      function finish(how) {
        if (closed) return; closed = true; root.cancelAnimationFrame(raf); clearTimeout(capTimer);
        const off = o.querySelector('#tiOff'), flag = !!(off && off.checked);
        doc.body.classList.remove('cn-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', resize); delete root.__ti;
        const free = () => { cv.width = 1; cv.height = 1; layers.forEach(c => { c.width = 1; c.height = 1; }); WOOD.width = 1; WOOD.height = 1; o.remove(); };
        if (opts.wipe && !rm) { // same "drone" fly-through into the sign-in page as the classic intro
          const fx = doc.createElement('div'); fx.className = 'cn-warp'; fx.setAttribute('aria-hidden', 'true'); let u = ''; for (let n = 0; n < 26; n++) u += `<u style="--a:${(n * 360 / 26 + (n % 3) * 3).toFixed(1)}deg;--d:${((n % 5) * 0.035).toFixed(3)}s;--l:${(10 + (n * 7) % 9)}vmax"></u>`; fx.innerHTML = u + '<i></i>'; doc.body.appendChild(fx);
          doc.body.classList.add('login-in'); o.classList.add('fly');
          setTimeout(() => resolve({ how, off: flag }), 560); setTimeout(free, 1000); setTimeout(() => { fx.remove(); doc.body.classList.remove('login-in'); }, 2100); return;
        }
        o.classList.add('out'); setTimeout(free, rm ? 0 : 600); resolve({ how, off: flag });
      }
      const key = e => { if (e.key === 'Escape') finish('skip'); else if (e.key === 'Enter' && T >= REVEAL + 1.5 && doc.activeElement && doc.activeElement.tagName !== 'INPUT') finish('go'); };
      o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) finish(b.getAttribute('data-r')); });
      root.addEventListener('keydown', key);
      if (rm) T = END;
      root.__ti = { seek, S, END, REVEAL, nodes };
      doc.body.appendChild(o); doc.body.classList.add('cn-on');
      resize(); ui(T); placeLabels(); if (!logoImg.complete) logoImg.addEventListener('load', () => draw(T));
      raf = root.requestAnimationFrame(frame);
      const sk = $('skip'); if (sk) sk.focus({ preventScroll: true });

    });
  };
  // the tree intro replaces the five-scene intro everywhere V.cinema is used (opening page and the roadmap after sign-in)
  const classic = () => /[?&]intro=classic\b/.test(root.location.search + root.location.hash) || (() => { try { return root.localStorage.getItem('fwb_intro_classic') === '1'; } catch (e) { return false; } })();
  if (V.cinema) { V.cinemaClassic = V.cinema; V.cinema = function (opts) { return classic() ? V.cinemaClassic(opts) : V.treeIntro(opts); }; }
})(typeof window !== 'undefined' ? window : globalThis);
