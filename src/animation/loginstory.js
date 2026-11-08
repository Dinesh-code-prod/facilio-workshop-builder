/* Sign-in page, left side: a canvas story that fills the left column of the sign-in page (replaces the earlier CSS story).
   Facilio team: an AI-assisted delivery studio. Inputs flow into one project, AI suggests first drafts, people review and own every deliverable,
   and the project settings are drafted from them for a person to review. Customer (invite links #/c/...): scattered email and files pull together into one lane
   across a city, through kick-off, workshops, approval and testing to go-live.
   Drawn with Canvas 2D in the Facilio colours; the canvas sits behind the page text and never takes clicks. Plays once per page view
   (a re-render, for example after an error message, continues where it was), pauses in a hidden tab, and shows the finished picture for
   reduced motion. Names and numbers are illustrative. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const doc = root.document;
  const RM = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const eBack = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const FONT = 'Geist, Inter, system-ui, sans-serif';
  let cv = null, cx = null, art = null, box = null, W = 0, H = 0, DPR = 1, S = { x: 0, y: 0, w: 0, h: 0 }, NARROW = false;
  let aud = 'cust', last = 0, raf = 0, ro = null, beatIdx = -1, hidAt = 0;
  const T0 = {};
  const BEATS = {
    cust: [[0, 'Projects usually start scattered', 'Email threads, spreadsheet versions and meeting notes pile up in different places.'],
      [3.4, 'Facilio brings it into one lane', 'Everything about your rollout lives in a single project you can open anytime.'],
      [8.0, 'Review and approve in one place', 'See what was captured from your workshops and sign off without long email threads.'],
      [11.2, 'Test with clear scripts', 'Your team tests against the agreed requirements, step by step.'],
      [13.4, 'Go live, with a clear finish line', 'Know where your project stands every day until launch.']]
  };
  const END = { cust: 16.2 };
  let lastT = 0;
  function glow(x, y, r, col, a) {
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function pill(x, y, title, sub, a, opt = {}) {
    if (a <= 0.01) return;
    cx.save(); cx.globalAlpha = a;
    const fs = opt.small ? 11.5 : 13;
    cx.font = `700 ${fs}px ${FONT}`; const tw = cx.measureText(title).width;
    cx.font = `500 ${fs - 1.5}px ${FONT}`; const sw = sub ? cx.measureText(sub).width : 0;
    const pad = 12, w = Math.max(tw, sw) + pad * 2 + (opt.dot ? 14 : 0), h = sub ? fs * 2 + 18 : fs + 16;
    let bx = x - w / 2; bx = clamp(bx, S.x + 8, S.x + S.w - w - 8); const by = y - h;
    const ox = opt.lift ? (1 - opt.lift) * 8 : 0;
    cx.translate(0, ox);
    cx.shadowColor = 'rgba(8,6,40,.35)'; cx.shadowBlur = 14; cx.shadowOffsetY = 4;
    cx.fillStyle = '#fff'; rr(bx, by, w, h, 10); cx.fill(); cx.shadowColor = 'transparent';
    if (opt.stroke) { cx.strokeStyle = opt.stroke; cx.lineWidth = 1.5; cx.stroke(); }
    if (opt.tail !== false) { cx.beginPath(); cx.moveTo(x - 5, by + h); cx.lineTo(x, by + h + 6); cx.lineTo(x + 5, by + h); cx.fillStyle = '#fff'; cx.fill(); }
    let tx = bx + pad;
    if (opt.dot) { cx.fillStyle = opt.dot; cx.beginPath(); cx.arc(tx + 4, by + (sub ? fs * .5 + 9 : h / 2), 4, 0, TAU); cx.fill(); tx += 14; }
    cx.fillStyle = '#1D1A5E'; cx.font = `700 ${fs}px ${FONT}`; cx.textBaseline = 'middle';
    cx.fillText(title, tx, by + (sub ? fs * .5 + 9 : h / 2));
    if (sub) { cx.fillStyle = opt.subCol || '#667085'; cx.font = `500 ${fs - 1.5}px ${FONT}`; cx.fillText(sub, tx, by + fs * 1.5 + 11); }
    cx.restore();
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function ring(x, y, k, col, maxR) { if (k <= 0 || k >= 1) return; cx.strokeStyle = `rgba(${col},${(1 - k) * .9})`; cx.lineWidth = 2 * (1 - k) + .5; cx.beginPath(); cx.arc(x, y, 4 + k * maxR, 0, TAU); cx.stroke(); }

  function arc(a, b, lift, head, tail, col, width) {
    if (head <= tail) return;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - lift;
    const P = u => ({ x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y });
    const n = 36; let prev = P(tail);
    cx.lineCap = 'round';
    for (let k = 1; k <= n; k++) {
      const u = tail + (head - tail) * k / n, p = P(u), f = k / n;
      cx.strokeStyle = `rgba(${col},${.15 + .8 * f})`; cx.lineWidth = width * (.5 + .5 * f);
      cx.beginPath(); cx.moveTo(prev.x, prev.y); cx.lineTo(p.x, p.y); cx.stroke(); prev = p;
    }
    if (head < 1) { glow(prev.x, prev.y, 10, col, .6); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(prev.x, prev.y, 2.6, 0, TAU); cx.fill(); }
  }
  function icon(kind, x, y, s, col) {
    cx.save(); cx.translate(x, y); cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 1.6; cx.lineCap = 'round'; cx.lineJoin = 'round';
    const k = s / 16;
    cx.scale(k, k);
    if (kind === 'rec') { cx.beginPath(); for (let i = 0; i < 5; i++) { const h = [5, 10, 14, 9, 6][i]; cx.moveTo(2 + i * 3, 8 - h / 2); cx.lineTo(2 + i * 3, 8 + h / 2); } cx.stroke(); }
    else if (kind === 'doc') { cx.beginPath(); cx.moveTo(3, 1); cx.lineTo(10, 1); cx.lineTo(13, 4); cx.lineTo(13, 15); cx.lineTo(3, 15); cx.closePath(); cx.stroke(); cx.beginPath(); cx.moveTo(6, 8); cx.lineTo(10, 8); cx.moveTo(6, 11); cx.lineTo(10, 11); cx.stroke(); }
    else if (kind === 'org') { cx.beginPath(); cx.rect(1, 6, 5, 9); cx.rect(7, 2, 8, 13); cx.moveTo(10, 6); cx.lineTo(12, 6); cx.moveTo(10, 9); cx.lineTo(12, 9); cx.stroke(); }
    else if (kind === 'vid') { cx.beginPath(); cx.rect(1, 3, 10, 10); cx.moveTo(11, 7); cx.lineTo(15, 4); cx.lineTo(15, 12); cx.lineTo(11, 9); cx.stroke(); }
    else if (kind === 'ok') { cx.beginPath(); cx.moveTo(3, 8.5); cx.lineTo(6.5, 12); cx.lineTo(13, 4.5); cx.stroke(); }
    cx.restore();
  }
  /* ---------- CUSTOMER: from inbox to go-live ---------- */
  const BEAC = [['Kick-off', 'Meet your Facilio team'], ['Workshops', 'Your needs captured'], ['Approve', 'You sign off in one place'], ['Test', 'Your team tests, step by step'], ['Go live', 'Launched, with hypercare']];
  const BT = [6.3, 7.6, 9.0, 11.5, 13.6];
  const CLUTTER = ['RE: RE: Scope?', 'Requirements_v7_FINAL.xlsx', 'Notes (2).docx', 'Who approved this?', 'Fwd: UAT dates', 'Plan_updated.pptx', 'Call moved again', 'Which version?'];
  let city = null, C = {}, bits = [], custFx = [], cars = [];
  function buildCity() {
    const r = rng(42);
    const groundY = S.y + S.h;
    const mk = (hMin, hMax, wMin, wMax, col, winA) => {
      const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR; const g = c.getContext('2d'); g.scale(DPR, DPR);
      let x = -10;
      while (x < W + 10) {
        const w = wMin + r() * (wMax - wMin), h = hMin + r() * (hMax - hMin);
        g.fillStyle = col; g.fillRect(x, groundY - h, w, h + Math.max(40, H - groundY + 2));
        if (r() < .3) { g.fillRect(x + w * .3, groundY - h - 10, w * .4, 10); }
        if (r() < .15) { g.fillRect(x + w / 2 - 1, groundY - h - 24, 2, 24); }
        // windows
        const cols = Math.max(2, Math.floor(w / 8)), rows = Math.floor(h / 10);
        for (let ry = 1; ry < rows; ry++) for (let cc = 0; cc < cols; cc++) {
          if (r() < winA) { g.fillStyle = r() < .7 ? `rgba(255,214,140,${.35 + r() * .45})` : `rgba(141,184,255,${.3 + r() * .4})`; g.fillRect(x + 3 + cc * ((w - 6) / cols), groundY - h + ry * 10, 2.2, 3.2); }
        }
        x += w + (r() < .3 ? r() * 8 : 0);
      }
      return c;
    };
    const sc = NARROW ? .75 : 1;
    city = [mk(S.h * .2 * sc, S.h * .44 * sc, 26, 60, '#2B2580', .04), mk(S.h * .1 * sc, S.h * .3 * sc, 30, 70, '#211C6C', .08), mk(S.h * .04 * sc, S.h * .12 * sc, 40, 90, '#17134F', .1)];
    // lane path across the city, rising to the go-live tower
    const tx = S.x + S.w * (NARROW ? .84 : .82), tw = Math.max(40, S.w * .07);
    const tH = S.h * (NARROW ? .5 : .7);
    C = { groundY, tower: { x: tx - tw / 2, w: tw, top: groundY - tH, h: tH }, pts: [] };
    const P0 = { x: S.x + S.w * .05, y: groundY - S.h * .24 }, P1 = { x: S.x + S.w * .32, y: groundY - S.h * .1 }, P2 = { x: S.x + S.w * .5, y: groundY - S.h * .5 }, P3 = { x: tx - tw * .9, y: groundY - tH * .62 };
    for (let i = 0; i <= 200; i++) { const u = i / 200, m = 1 - u; C.pts.push({ x: m * m * m * P0.x + 3 * m * m * u * P1.x + 3 * m * u * u * P2.x + u * u * u * P3.x, y: m * m * m * P0.y + 3 * m * m * u * P1.y + 3 * m * u * u * P2.y + u * u * u * P3.y }); }
    // arc length table
    let L = 0; C.len = [0]; for (let i = 1; i < C.pts.length; i++) { L += Math.hypot(C.pts[i].x - C.pts[i - 1].x, C.pts[i].y - C.pts[i - 1].y); C.len.push(L); } C.L = L;
    C.bu = [.04, .27, .5, .74, 1];
    C.vortex = { x: S.x + S.w * .34, y: S.y + S.h * (NARROW ? .4 : .3) };
    // tower windows
    C.win = []; const wc = 5, wr = Math.floor(tH / 14);
    for (let ry = 0; ry < wr; ry++) for (let cc = 0; cc < wc; cc++) C.win.push({ x: C.tower.x + 6 + cc * ((tw - 12) / wc), y: C.tower.top + 18 + ry * 14, f: wr - ry });
    C.wr = wr;
    // clutter
    const rr2 = rng(9); bits = [];
    const bTop = S.y + 6, bBot = groundY - S.h * .42;
    for (let i = 0; i < 30; i++) { const lab = i < CLUTTER.length, bh = Math.max(40, bBot - bTop); bits.push({ x: lab ? S.x + S.w * ((i % 2) * .33 + .04 + (i >> 1) * .05) : S.x + S.w * (.04 + rr2() * .66), y: lab ? bTop + bh * (.06 + (i >> 1) * .28) : bTop + bh * (.2 + Math.floor(rr2() * 3) * .28 + (rr2() - .5) * .08), vx: (rr2() - .5) * 8, vy: (rr2() - .5) * 4, rot: (rr2() - .5) * .6, k: rr2() < .5 ? 'mail' : 'file', txt: i < CLUTTER.length ? CLUTTER[i] : null, d: rr2() * .9, s: .8 + rr2() * .5 }); }
    cars = []; for (let i = 0; i < 14; i++) cars.push({ u: rr2(), v: .04 + rr2() * .05, dir: rr2() < .5 ? 1 : -1, col: rr2() < .5 ? '255,220,160' : '255,90,110' });
  }
  function laneAt(u) { const target = clamp(u, 0, 1) * C.L; let lo = 0, hi = C.len.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (C.len[m] < target) lo = m + 1; else hi = m; } const i = Math.max(1, lo), a = C.pts[i - 1], b = C.pts[i], k = (target - C.len[i - 1]) / ((C.len[i] - C.len[i - 1]) || 1); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; }
  function drawBit(b, x, y, s, a, rotA) {
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.rotate(rotA); cx.scale(s, s);
    if (b.k === 'mail') { cx.fillStyle = 'rgba(230,236,255,.9)'; rr(-11, -7.5, 22, 15, 2.5); cx.fill(); cx.strokeStyle = 'rgba(29,26,94,.7)'; cx.lineWidth = 1.3; cx.beginPath(); cx.moveTo(-10, -6.5); cx.lineTo(0, 1.5); cx.lineTo(10, -6.5); cx.stroke(); }
    else { cx.fillStyle = 'rgba(230,236,255,.9)'; cx.beginPath(); cx.moveTo(-8, -10); cx.lineTo(4, -10); cx.lineTo(8, -6); cx.lineTo(8, 10); cx.lineTo(-8, 10); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(29,26,94,.5)'; cx.fillRect(-5, -3, 10, 1.6); cx.fillRect(-5, 1, 10, 1.6); cx.fillRect(-5, 5, 7, 1.6); }
    if (b.txt && !NARROW) { cx.font = `600 11px ${FONT}`; cx.textBaseline = 'middle'; const w = cx.measureText(b.txt).width + 14; cx.fillStyle = 'rgba(255,255,255,.92)'; rr(16, -10, w, 20, 10); cx.fill(); cx.fillStyle = '#475467'; cx.fillText(b.txt, 23, 0); }
    cx.restore();
  }
  function cust(t, dt) {
    const dawn = sm(13.8, 15.8, t);
    // dawn wash over the sky
    if (dawn > 0) {
      const g = cx.createLinearGradient(0, H * .25, 0, C.groundY);
      g.addColorStop(0, 'rgba(229,25,127,0)'); g.addColorStop(.6, `rgba(229,25,127,${.12 * dawn})`); g.addColorStop(1, `rgba(247,168,207,${.22 * dawn})`);
      cx.fillStyle = g; cx.fillRect(0, 0, W, C.groundY);
      glow(C.tower.x + C.tower.w / 2, C.groundY, S.h * .7, '247,168,207', .16 * dawn);
    }
    // moon
    const mx = S.x + S.w * .66, my = S.y + S.h * .12;
    cx.fillStyle = `rgba(255,255,255,${.9 - dawn * .4})`; cx.beginPath(); cx.arc(mx, my, 16, 0, TAU); cx.fill();
    cx.fillStyle = '#1C1960'; cx.beginPath(); cx.arc(mx + 7, my - 5, 14.5, 0, TAU); cx.fill();
    // far city
    cx.drawImage(city[0], 0, 0, W, H);
    // haze
    const hz = cx.createLinearGradient(0, C.groundY - S.h * .3, 0, C.groundY); hz.addColorStop(0, 'rgba(21,112,239,0)'); hz.addColorStop(1, 'rgba(21,112,239,.08)'); cx.fillStyle = hz; cx.fillRect(0, C.groundY - S.h * .3, W, S.h * .3);
    // go-live tower
    const T = C.tower; const live = sm(BT[4] - .2, BT[4] + 1.8, t);
    cx.fillStyle = '#332C93'; cx.fillRect(T.x, T.top, T.w, T.h + Math.max(40, H - C.groundY + 2));
    cx.fillStyle = '#4038A8'; cx.fillRect(T.x, T.top, T.w * .22, T.h + Math.max(40, H - C.groundY + 2));
    cx.fillStyle = '#332C93'; cx.fillRect(T.x + T.w * .2, T.top - 14, T.w * .6, 14); cx.fillRect(T.x + T.w / 2 - 1.5, T.top - 46, 3, 34);
    C.win.forEach(w => { const on = live * C.wr - w.f > -1 ? clamp(live * C.wr - w.f + 1, 0, 1) : 0; cx.fillStyle = on > 0 ? `rgba(255,255,255,${.3 + on * .65})` : 'rgba(141,184,255,.16)'; cx.fillRect(w.x, w.y, 4, 6); });
    const blink = (Math.sin(t * 4) > .2 ? 1 : .35);
    cx.fillStyle = `rgba(229,25,127,${.6 + .4 * blink})`; cx.beginPath(); cx.arc(T.x + T.w / 2, T.top - 48, 4.5 + live * 2, 0, TAU); cx.fill();
    if (live > 0) glow(T.x + T.w / 2, T.top + T.h * .3, T.w * 2.4, '229,25,127', .12 * live);
    // mid city
    cx.drawImage(city[1], 0, 0, W, H);
    // street traffic
    const sy = C.groundY - 3; cx.save(); cx.globalCompositeOperation = 'lighter';
    cars.forEach(c => { c.u = (c.u + c.v * dt * c.dir + 1) % 1; const x = W * c.u; cx.fillStyle = `rgba(${c.col},.8)`; cx.fillRect(x, sy - (c.dir > 0 ? 0 : 3), 3, 1.6); cx.fillStyle = `rgba(${c.col},.15)`; cx.fillRect(x - 14 * c.dir, sy - (c.dir > 0 ? 0 : 3), 14, 1.6); });
    cx.restore();

    // the clutter, then the vortex
    const vx = C.vortex.x, vy = C.vortex.y;
    const gather = sm(3.2, 5.2, t);
    if (t < 5.6) {
      for (let ii = bits.length - 1; ii >= 0; ii--) { const b = bits[ii], i = ii; {
        const ap = sm(b.d * .8, b.d * .8 + .6, t);
        const fx = b.x + b.vx * t + Math.sin(t * .9 + i) * 8, fy = b.y + b.vy * t + Math.cos(t * .7 + i * 2) * 6;
        const g = eIO(clamp((t - 3.2 - b.d * .4) / 1.8, 0, 1));
        const a0 = Math.atan2(fy - vy, fx - vx), d0 = Math.hypot(fx - vx, fy - vy);
        const ang = a0 + g * 3.2, d = d0 * (1 - g);
        const x = vx + Math.cos(ang) * d, y = vy + Math.sin(ang) * d;
        if (g > .05) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = `rgba(141,184,255,${.25 * (1 - g)})`; cx.lineWidth = 1.2; cx.beginPath(); for (let k = 0; k < 8; k++) { const gg = Math.max(0, g - k * .025), aa = a0 + gg * 3.2, dd = d0 * (1 - gg); const px = vx + Math.cos(aa) * dd, py = vy + Math.sin(aa) * dd; k ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.stroke(); cx.restore(); }
        drawBit(b, x, y, b.txt ? 1 - g * .85 : b.s * (1 - g * .85), ap * (1 - sm(.85, 1, g)), (b.txt ? .4 : 1) * b.rot * Math.sin(t * .6 + i) + g * 4);
      } }
    }
    // vortex core
    const vc = sm(3.4, 5.0, t) * (1 - sm(5.4, 6.0, t));
    if (vc > 0) {
      cx.save(); cx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { cx.strokeStyle = `rgba(${k === 1 ? '229,25,127' : '141,184,255'},${.45 * vc})`; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(vx, vy, (40 + k * 22) * vc, (14 + k * 8) * vc, t * (1.4 + k * .5), 0, TAU); cx.stroke(); }
      glow(vx, vy, 50 * vc + gather * 24, '229,25,127', .4 * vc); cx.restore();
    }
    // condensed orb drops to the lane start
    const L0 = laneAt(0);
    const drop = eIO((t - 5.2) / .7);
    if (t > 5.2 && t < 6.1) { const x = lerp(vx, L0.x, drop), y = lerp(vy, L0.y, drop) - Math.sin(drop * Math.PI) * 40; glow(x, y, 20, '229,25,127', .7); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x, y, 4.5, 0, TAU); cx.fill(); }
    // the lane draws itself
    const draw = eIO((t - 5.8) / 1.2);
    if (draw > 0) {
      cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
      const n = Math.floor(draw * (C.pts.length - 1));
      const path = () => { cx.beginPath(); cx.moveTo(C.pts[0].x, C.pts[0].y); for (let i = 1; i <= n; i++) cx.lineTo(C.pts[i].x, C.pts[i].y); };
      cx.globalCompositeOperation = 'lighter';
      cx.globalCompositeOperation = 'source-over';
      path(); cx.strokeStyle = 'rgba(255,255,255,.07)'; cx.lineWidth = 18; cx.stroke();
      const lg = cx.createLinearGradient(C.pts[0].x, 0, C.pts[C.pts.length - 1].x, 0); lg.addColorStop(0, 'rgba(141,184,255,.55)'); lg.addColorStop(1, 'rgba(229,25,127,.55)');
      path(); cx.strokeStyle = lg; cx.lineWidth = 5; cx.stroke();
      // travelled part glows teal
      const tr = clamp(travel(t), 0, 1), m = Math.floor(Math.min(tr, draw) * (C.pts.length - 1));
      if (m > 0) { cx.beginPath(); cx.moveTo(C.pts[0].x, C.pts[0].y); for (let i = 1; i <= m; i++) cx.lineTo(C.pts[i].x, C.pts[i].y); cx.strokeStyle = '#fff'; cx.lineWidth = 3.5; cx.stroke(); }
      path(); cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 1.2; cx.setLineDash([2, 10]); cx.lineDashOffset = -t * 30; cx.stroke(); cx.setLineDash([]);
      if (draw < 1) { const h = C.pts[n]; glow(h.x, h.y, 18, '229,25,127', .7); }
      cx.restore();
    }
    // near city (in front of the lane's low dip)
    cx.drawImage(city[2], 0, 0, W, H);

    // beacons
    const tr = travel(t);
    BEAC.forEach(([ti, su], i) => {
      const u = C.bu[i], p = laneAt(u), app = sm(5.8 + u * 1.2, 6.1 + u * 1.2, t);
      if (app <= 0) return;
      const on = t >= BT[i];
      const k = (t - BT[i]);
      if (on) {
        // pillar of light
        const ph = eOut(k / .6) * (NARROW ? 40 : 70);
        cx.fillStyle = 'rgba(255,255,255,.5)'; cx.fillRect(p.x - 1, p.y - ph, 2, ph);
        if (k < 1.2) { ring(p.x, p.y, k / 1.2, '229,25,127', 40); ring(p.x, p.y, Math.max(0, (k - .15) / 1.2), '255,255,255', 54); }
      }
      cx.fillStyle = on ? '#E5197F' : '#2B2580'; cx.beginPath(); cx.arc(p.x, p.y, 10 * app, 0, TAU); cx.fill();
      cx.strokeStyle = on ? '#fff' : 'rgba(141,184,255,.7)'; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(p.x, p.y, (on ? 3.2 : 2.4) * app, 0, TAU); cx.fill();
      // label: the current one is full, earlier ones collapse to a title
      const cur = on && (i === 4 || t < BT[i + 1]);
      const la = on ? sm(BT[i], BT[i] + .35, t) : sm(6.4, 7, t) * .55;
      const lift = on ? eOut(k / .5) : 1;
      const py = p.y - (on ? (NARROW ? 50 : 82) : 22);
      if (NARROW && !cur) {}
      else if (cur) pill(p.x, py, `${i + 1} · ${ti}`, su, la, { dot: '#E5197F', lift });
      else pill(p.x, on ? py + 30 : py, ti, null, la * (on ? .9 : .6), { small: true, dot: on ? '#E5197F' : null });
    });
    // the travelling pulse
    if (t > 6.0 && tr < 1.001) { const p = laneAt(tr); cx.save(); glow(p.x, p.y, 22, '229,25,127', .6); for (let k = 1; k < 10; k++) { const q = laneAt(tr - k * .006); cx.fillStyle = `rgba(255,255,255,${.5 * (1 - k / 10)})`; cx.beginPath(); cx.arc(q.x, q.y, 3 * (1 - k / 12), 0, TAU); cx.fill(); } cx.restore(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(p.x, p.y, 4.5, 0, TAU); cx.fill(); }
    // approve: a Facilio-style approval chip rises in beside the beacon (white card, pink check, navy text)
    { const k = t - BT[2], p = laneAt(C.bu[2]);
      if (k > .15) {
        const e = eBack((k - .15) / .5), a = sm(.15, .35, k) * (1 - sm(2.3, 2.8, k) * .3);
        const title = 'Approved', sub = NARROW ? '' : 'Signed off in Delivery Studio';
        cx.save(); cx.font = `700 13px ${FONT}`; const tw = cx.measureText(title).width; cx.font = `500 11px ${FONT}`; const sw = sub ? cx.measureText(sub).width : 0;
        const w = Math.max(tw, sw) + 54, h = sub ? 42 : 30;
        const x = clamp(p.x + 14, S.x + 8, S.x + S.w - w - 8), y = p.y + 22 + (1 - e) * 16;
        cx.globalAlpha = a; cx.translate(x, y); const sc = .92 + .08 * e; cx.scale(sc, sc);
        cx.shadowColor = 'rgba(8,6,40,.4)'; cx.shadowBlur = 16; cx.shadowOffsetY = 5;
        cx.fillStyle = '#fff'; rr(0, 0, w, h, h / 2); cx.fill(); cx.shadowColor = 'transparent';
        cx.fillStyle = '#E5197F'; cx.beginPath(); cx.arc(h / 2, h / 2, 11, 0, TAU); cx.fill();
        icon('ok', h / 2 - 7, h / 2 - 7, 14, '#fff');
        cx.textBaseline = 'middle'; cx.fillStyle = '#1D1A5E'; cx.font = `700 13px ${FONT}`; cx.fillText(title, h / 2 + 18, sub ? h / 2 - 7 : h / 2);
        if (sub) { cx.fillStyle = '#667085'; cx.font = `500 11px ${FONT}`; cx.fillText(sub, h / 2 + 18, h / 2 + 8); }
        cx.restore();
        if (k > .35 && k < 1.3) { const q = (k - .35) / .95; for (let j = 0; j < 10; j++) { const an = j / 10 * TAU + .3, d = 16 + eOut(q) * 30; cx.fillStyle = `rgba(${j % 2 ? '229,25,127' : '141,184,255'},${(1 - q) * .9})`; cx.beginPath(); cx.arc(x + 21 + Math.cos(an) * d, y + h / 2 + Math.sin(an) * d, 1.8, 0, TAU); cx.fill(); } }
      } }
    // test: ticks appear beside the beacon
    { const k = t - BT[3], p = laneAt(C.bu[3]);
      if (k > .2 && !NARROW) {
        const fade = 1 - sm(2.0, 2.5, k) * .5;
        ['Create work order', 'Assign technician', 'Close with photo'].forEach((s, j) => {
          const a = sm(.3 + j * .35, .5 + j * .35, k) * fade; if (a <= 0) return;
          const x = p.x + 26, y = p.y + 30 + j * 22;
          cx.save(); cx.globalAlpha = a; cx.fillStyle = '#0E9384'; cx.beginPath(); cx.arc(x, y, 8, 0, TAU); cx.fill();
          icon('ok', x - 6, y - 6, 12, '#fff');
          cx.fillStyle = '#fff'; cx.font = `600 12px ${FONT}`; cx.textBaseline = 'middle'; cx.fillText(s, x + 14, y); cx.restore();
        });
      } }
    // go-live burst
    { const k = t - BT[4];
      if (k > .1 && k < 3) { const ox = T.x + T.w / 2, oy = T.top - 46; cx.save(); cx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 36; j++) { const r2 = rng(j + 3), an = r2() * TAU, sp = 40 + r2() * 90, q = k / 3; const x = ox + Math.cos(an) * sp * eOut(q * 1.4), y = oy + Math.sin(an) * sp * eOut(q * 1.4) + q * q * 60; cx.fillStyle = `rgba(${['229,25,127', '255,255,255', '141,184,255', '21,112,239'][j % 4]},${(1 - q) * .9})`; cx.beginPath(); cx.arc(x, y, 1.8, 0, TAU); cx.fill(); }
        cx.restore(); }
      if (k > .4) pill(T.x + T.w / 2, T.top - 64, 'You’re live', 'Hypercare starts today', sm(.4, .8, k), { dot: '#E5197F', lift: eOut((k - .4) / .5) });
    }
  }
  function travel(t) { // where the pulse is on the lane (0..1): glides, then pauses at each beacon
    if (t < 6.0) return -1;
    const seg = [[6.0, 0, 6.3, C.bu[0]]];
    for (let i = 0; i < 4; i++) seg.push([BT[i] + .3, C.bu[i], BT[i + 1], C.bu[i + 1]]);
    let u = C.bu[0];
    for (const [a, ua, b, ub] of seg) { if (t >= a) u = t >= b ? ub : lerp(ua, ub, eIO((t - a) / (b - a))); }
    return u;
  }


  /* ---------- page plumbing ---------- */
  function layout() {
    if (!art || !cv) return;
    const ar = art.getBoundingClientRect(); W = Math.max(1, Math.round(art.clientWidth)); H = Math.max(1, Math.round(art.clientHeight));
    DPR = Math.min(1.5, root.devicePixelRatio || 1, Math.sqrt(1200000 / Math.max(1, W * H)));
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const top = box.querySelector('.lsx-top').getBoundingClientRect().bottom - ar.top + 10;
    const note = art.querySelector('.auth-note'); const nr = note && note.offsetHeight ? note.getBoundingClientRect() : null;
    const bottom = nr ? nr.top - ar.top - 12 : H - 16;
    NARROW = W < 560;
    S = { x: 12, y: top, w: W - 24, h: Math.max(220, bottom - top) };
    buildCity();
  }
  function setBeat(t) {
    const B = BEATS[aud]; let i = 0; for (let k = 0; k < B.length; k++) if (t >= B[k][0]) i = k;
    box.querySelectorAll('.lsx-prog i').forEach((el, k) => { const a = B[k][0], b = k + 1 < B.length ? B[k + 1][0] : END[aud]; el.style.setProperty('--p', clamp((t - a) / (b - a), 0, 1).toFixed(3)); });
    if (i === beatIdx) return; beatIdx = i;
    const el = box.querySelector('.lsx-cap'); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
    el.querySelector('b').textContent = B[i][1]; el.querySelector('span').textContent = B[i][2];
  }
  let drawnUnder = false;
  function frame(now) {
    raf = 0;
    if (!cv || !cv.isConnected) { stop(); return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    // hand-over from the opening intros: while the tree (team) or road (customer) intro still covers the page, the story waits;
    // it starts as the intro lifts away (liquid reveal / falling leaves / tractor-beam lift), so the two read as one sequence
    if (!RM.matches && covered()) { T0[aud] = now + 120; lastT = 0; box.classList.remove('go');
      // the intro covers the page: draw the first scene once, then only check back five times a second (no drawing under the intro, which made it stutter)
      if (drawnUnder) { setTimeout(kick, 200); return; } drawnUnder = true; }
    else { drawnUnder = false; box.classList.add('go'); }
    let t = (now - T0[aud]) / 1000; if (RM.matches) t = END[aud] + .5;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
    { const tt = Math.max(0, t); cust(tt, RM.matches ? 0 : dt); } /* draw the first scene at once; no blank wait before the motion starts */
    setBeat(Math.max(0, t));
    if (!RM.matches && !doc.hidden) raf = root.requestAnimationFrame(frame);
  }
  const covered = () => !!doc.querySelector('.cn.ti:not(.liq):not(.leafout):not(.exit):not(.out), .ri:not(.lifting), .dx-ov');
  function kick() { if (!raf) raf = root.requestAnimationFrame(frame); }
  function stop() { if (raf) root.cancelAnimationFrame(raf); raf = 0; if (ro) { ro.disconnect(); ro = null; } cv = cx = art = box = null; }
  function mount() {
    const el = doc.querySelector('.lsx:not([data-on])'); if (!el) return;
    if (raf) root.cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect();
    box = el; el.setAttribute('data-on', '1'); aud = 'cust';
    cv = el.querySelector('canvas'); cx = cv.getContext('2d'); art = el.closest('.auth-art') || el.parentNode;
    if (!T0[aud]) T0[aud] = root.performance.now() + 120;
    const t = (root.performance.now() - T0[aud]) / 1000; lastT = Math.max(0, t); beatIdx = -1; last = root.performance.now();
    layout();
    if (root.ResizeObserver) { ro = new root.ResizeObserver(() => { layout(); kick(); }); ro.observe(art); }
    el.querySelector('.lsx-rp').addEventListener('click', () => { T0[aud] = root.performance.now(); lastT = 0; beatIdx = -1; kick(); });
    kick();
  }
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) hidAt = root.performance.now();
    else if (hidAt) { const d = root.performance.now() - hidAt; Object.keys(T0).forEach(k => { T0[k] += d; }); hidAt = 0; last = root.performance.now(); if (cv) kick(); }
  });
  if (RM.addEventListener) RM.addEventListener('change', () => { if (cv) kick(); });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const DESC = {
    cust: 'Illustration: scattered emails and files come together into one lane across a city, passing kick-off, workshops, your approval and testing, and arriving at go-live with hypercare.'
  };
  V.isoLogin = a => {
    const k = 'cust', B = BEATS[k];
    root.setTimeout(mount, 0);
    return `<div class="lsx" data-aud="${k}"><canvas class="lsx-cv" aria-hidden="true"></canvas><div class="lsx-top"><div class="lsx-cap" aria-live="polite"><b>${esc(B[0][1])}</b><span>${esc(B[0][2])}</span></div><div class="lsx-row"><div class="lsx-prog" aria-hidden="true">${B.map(() => '<i></i>').join('')}</div><button type="button" class="lsx-rp">Replay</button><small>Illustrative</small></div></div><p class="lsx-sr">${esc(DESC[k])}</p></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
