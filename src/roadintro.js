/* Customer introduction: "The road to go-live". A car drives through a mountain valley at dawn. At each of five milestones the camera settles beside the
   roadside post while the car drives past, and the post carries its own sign: the customer's challenge at that stage and how Facilio helps.
   When the journey ends (or Skip / Esc), a tractor-beam levitation lifts the scene away: every element (sky, ranges, valley, road, trees, posts, car,
   text and branding) is pulled upward with its own slight delay, tilt and acceleration, with fine upward light trails, uncovering the customer sign-in
   that sits still underneath. V.roadIntro(opts) resolves { how: 'end' | 'skip' } once the layer is gone. Illustrative only: no project data, no API calls.
   Canvas 2D; paused while the tab is hidden; reduced motion shows the finished picture with the steps written out and leaves with a short fade. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {};

  /* ---------------- the customer's journey: the challenge at each stage, and how Facilio helps ---------------- */
  const STEPS = [
    { h: 'Start with clarity', c: 'Unclear goals and owners slow the start.', f: 'Together we agree goals, people and what to prepare.' },
    { h: 'Bring requirements together', c: 'Decisions get lost in emails and files.', f: 'Workshop outcomes and requirements sit in one shared place.' },
    { h: 'Turn requirements into a solution', c: 'Software that does not match how you work.', f: 'Facilio is configured around your workflows, step by step with you.' },
    { h: 'Validate and prepare', c: 'Issues found late, users not ready.', f: 'You test key workflows, see issues resolved and get users trained.' },
    { h: 'Go live with confidence', c: 'Launch day feels uncertain.', f: 'Readiness, training, early support and handover are planned together.' }
  ];
  // timing: a short opening, then each milestone gets a settled view (the sign is read here) followed by a brief pan to the next
  const T0 = 2.0, STEP = 3.8, PAN = .75;
  const AT = STEPS.map((_, i) => T0 + i * STEP);            // the camera arrives at milestone i
  const DWE = AT.map(a => a + STEP - PAN);                  // ... and leaves it
  const MID = AT.map((a, i) => (a + DWE[i]) / 2);            // the car passes the post here
  const CRANE = DWE[4], END = CRANE + 3.1;                   // the camera lifts to show the whole road, the closing title holds, then the lift-off

  /* ---------------- helpers ---------------- */
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
  const ridged = (x, oct) => { let a = 0, amp = .5, fr = 1, s = 0; for (let o = 0; o < oct; o++) { const n = 1 - Math.abs(vnoise(x * fr) * 2 - 1); a += n * n * amp; s += amp; amp *= .5; fr *= 2.03; } return a / s; };

  /* ---------------- world: x along the valley, z away from the camera, y up ---------------- */
  const roadZ = u => 52 + 20 * Math.sin(u * .0175 + .6) + 7 * Math.sin(u * .043 + 1.3);
  const roadY = u => 1.4 * Math.sin(u * .012) + .7 * Math.sin(u * .031 + 2);
  const RW = 7.6, U0 = -200, U1 = 760;

  // car: a steady, unhurried drive that rolls to a stop at the destination
  const VC = 15, DT = 1 / 120, CAR = [];
  { let u = -VC * (MID[0] - .2); for (let t = 0; t <= END + .01; t += DT) { CAR.push(u); u += VC * (1 - sm((t - CRANE + .4) / 2.4)) * DT; } }
  const carU = t => { const k = clamp(t, 0, END) / DT, i = Math.min(CAR.length - 2, Math.floor(k)); return lerp(CAR[i], CAR[i + 1], k - i); };
  const MS = MID.map(t => carU(t));                          // each post stands where the car is halfway through that milestone's view
  const U_END = carU(END), DEST = Math.max(U_END + 30, MS[4] + 34);
  const LAKE = { u: (MS[1] + MS[2]) / 2 + 30, z: 190, rx: 120, rz: 34 };
  const inLake = (x, z) => Math.pow((x - LAKE.u) / (LAKE.rx + 8), 2) + Math.pow((z - LAKE.z) / (LAKE.rz + 6), 2) < 1;

  const R = rng(20261025), rr = (a, b) => a + (b - a) * R();
  const LAYERS = [
    { z: 2100, h: 430, sc: 1 / 900, oct: 5, c0: [38, 40, 104], c1: [122, 152, 222], rim: .30 },
    { z: 1450, h: 340, sc: 1 / 620, oct: 5, c0: [30, 30, 88], c1: [94, 120, 202], rim: .34 },
    { z: 980, h: 250, sc: 1 / 420, oct: 4, c0: [24, 23, 74], c1: [72, 94, 180], rim: .38 },
    { z: 560, h: 120, sc: 1 / 260, oct: 4, c0: [18, 20, 62], c1: [50, 76, 152], rim: .30 },
    { z: 330, h: 46, sc: 1 / 150, oct: 3, c0: [14, 22, 56], c1: [40, 76, 130], rim: .22 }
  ];
  const ridgeH = (L, i, x) => L.h * (.18 + .82 * ridged(x * L.sc + i * 17.3, L.oct));

  const PROPS = [];
  const clearOfPosts = (u, z) => !MS.some(m => Math.abs(m - u) < 11 && Math.abs(roadZ(m) + RW / 2 + 3 - z) < 14) && !(Math.abs(u - DEST) < 40 && z > roadZ(u));
  for (let u = U0; u < U1 + 160; u += rr(2.2, 5.2)) for (const side of [-1, 1]) {
    if (R() < (side < 0 ? .8 : .36)) continue;
    const z = roadZ(u) + side * (RW * .5 + (side > 0 ? rr(4, 36) : rr(10, 24)));
    if (!clearOfPosts(u, z) || inLake(u, z)) continue;
    PROPS.push({ t: 'tree', x: u, z, h: side < 0 ? rr(3.5, 6.5) : rr(4.5, 10.5), k: R() < .6 ? 0 : 1, ph: R() * TAU, s: rr(.85, 1.15) });
  }
  for (let i = 0; i < 230; i++) { const x = rr(U0 - 300, U1 + 400), z = rr(110, 330); if (inLake(x, z)) continue; PROPS.push({ t: 'tree', x, z, h: rr(6, 15), k: R() < .7 ? 0 : 1, ph: R() * TAU, s: 1 }); }
  for (let c = 0; c < 9; c++) { const cx = rr(U0, U1 + 200), cz = rr(240, 320); for (let i = 0; i < 26; i++) { const x = cx + rr(-40, 40), z = cz + rr(-14, 14); if (!inLake(x, z)) PROPS.push({ t: 'tree', x, z, h: rr(9, 16), k: 0, ph: R() * TAU, s: 1 }); } }
  for (let i = 0; i < 170; i++) PROPS.push({ t: 'tree', x: rr(U0 - 200, U1 + 300), z: rr(-190, -40), h: rr(6, 12), k: R() < .6 ? 0 : 1, ph: R() * TAU, s: 1 });
  for (let i = 0; i < 11; i++) { const x = rr(U0, U1 + 100), z = rr(150, 300); if (!inLake(x, z)) PROPS.push({ t: 'house', x, z, w: rr(5, 8), h: rr(3, 4.5), r: R(), lit: R() < .8 }); }
  for (let u = U0; u < U1; u += 13) for (const side of [-1, 1]) { const x = u + (side > 0 ? 6 : 0), z = roadZ(x) + side * (RW * .5 + 1.1); if (clearOfPosts(x, z)) PROPS.push({ t: 'marker', x, z }); }
  for (const [a, b] of [[MS[0] + 18, MS[1] - 14], [MS[2] + 18, MS[3] - 16]]) for (let u = a; u < b; u += 3.2) PROPS.push({ t: 'fence', x: u, z: roadZ(u) + RW * .5 + 5.2 });
  for (let i = 0; i < 360; i++) { const u = rr(U0, U1), side = R() < .5 ? -1 : 1, z = roadZ(u) + side * (RW * .5 + rr(1.6, 7)); if (clearOfPosts(u, z)) PROPS.push({ t: 'flower', x: u, z, c: R() < .45 ? 0 : R() < .6 ? 1 : 2, n: 3 + (R() * 4 | 0), sd: R() * 1000 }); }
  PROPS.forEach(p => { p.lift = hash(p.x * 3.1 + p.z * 1.7); });
  const MEADOWS = Array.from({ length: 46 }, () => ({ x: rr(U0 - 100, U1 + 200), z: rr(64, 330), rx: rr(14, 46), rz: rr(5, 14), d: R() < .5 ? -1 : 1 }));
  const STARS = Array.from({ length: 160 }, () => ({ x: R(), y: Math.pow(R(), 1.4) * .55, s: rr(.4, 1.4), p: R() * TAU }));
  const CLOUDS = Array.from({ length: 8 }, () => ({ x: R(), y: rr(.07, .3), w: rr(.16, .32), h: rr(.022, .05), v: rr(.003, .009) }));
  const MIST = Array.from({ length: 6 }, (_, i) => ({ z: [420, 620, 820, 300, 520, 760][i], x: R() * 2000, w: rr(500, 900), v: rr(6, 14) }));
  const GRASS = Array.from({ length: 220 }, () => ({ x: R(), h: rr(.035, .085), w: rr(.004, .01), lean: rr(-.5, .5), ph: R() * TAU, d: R() }));
  const TRAILS = Array.from({ length: 90 }, () => ({ x: R(), y: rr(.3, 1.15), sp: rr(.7, 1.4), len: rr(.05, .16), w: rr(.6, 1.8), c: R() < .08 ? 3 : R() < .3 ? 2 : R() < .55 ? 1 : 0, d: rr(0, .35) }));

  V.roadIntro = function (opts) {
    opts = opts || {};
    const reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) || !!opts.reduce;
    const logo = opts.logo || 'brand/logo-white.png';
    return new Promise(resolve => {
      const o = doc.createElement('div'); o.className = 'ri'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Your road to go-live with Facilio');
      o.innerHTML = `<canvas aria-hidden="true"></canvas>
        <div class="ri-bar"><img src="${logo}" alt="Facilio" width="87" height="24"><span class="ri-sep"></span><span class="ri-prod">Delivery Studio</span><span class="ri-sp"></span><button class="ri-btn" type="button" data-r="skip">Skip</button></div>
        <div class="ri-open"><h1>Your road to go-live</h1><p>What Facilio solves for you at each step, from kick-off to everyday operations</p></div>
        <div class="ri-caps">${STEPS.map((s, i) => `<div class="ri-cap"><div class="ri-k">Step ${i + 1} of 5</div><h2>${s.h}</h2><dl><div class="ri-c"><dt>Your challenge</dt><dd>${s.c}</dd></div><div class="ri-f"><dt>How Facilio helps</dt><dd>${s.f}</dd></div></dl></div>`).join('')}</div>
        <div class="ri-chips">${STEPS.map((s, i) => `<div class="ri-chip"><b>${i + 1}</b>${s.h}</div>`).join('')}</div>
        <div class="ri-end"><img src="${logo}" alt="Facilio" width="220" height="61"><div class="ri-ds">Delivery Studio</div><h2>One clear road from kick-off to go-live</h2></div>
        <div class="ri-route" aria-hidden="true"><i></i><span></span><span></span><span></span><span></span><span></span></div>
        <div class="ri-still" hidden><ol>${STEPS.map((s, i) => `<li><b><i>${i + 1}</i>${s.h}</b><p>${s.c} ${s.f}</p></li>`).join('')}</ol><button class="ri-btn solid" type="button" data-r="end">Continue</button></div>
        <div class="ri-note">Illustrative</div><div class="ri-sr" aria-live="polite"></div>`;
      const $ = s => o.querySelector(s);
      const cv = $('canvas'), g = cv.getContext('2d');
      const CAPS = [...o.querySelectorAll('.ri-cap')], CHIPS = [...o.querySelectorAll('.ri-chip')];
      const barEl = $('.ri-bar'), openEl = $('.ri-open'), endEl = $('.ri-end'), routeEl = $('.ri-route'), noteEl = $('.ri-note');
      const dots = [...o.querySelectorAll('.ri-route span')], fillEl = $('.ri-route i'), sr = $('.ri-sr'), skipBtn = $('[data-r="skip"]');
      let W = 0, H = 0, DPR = 1, F = 1, HOR = 0, NARROW = false, PORT = false, T = 0, cam = { x: 0, z: 0, h: 30 };
      let LT = -1;   // seconds into the lift-off, -1 before it starts

      function resize() {
        DPR = Math.min(2, root.devicePixelRatio || 1); W = o.clientWidth; H = o.clientHeight;
        cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        NARROW = W < 760; PORT = H > W;
        F = PORT ? .7 * W : .42 * Math.min(W, H * 1.75);
        HOR = H * (PORT ? .5 : NARROW ? .42 : .4);
        o.classList.toggle('narrow', NARROW); measured = false; draw(T);
      }
      /* camera: settles beside each post (drifting gently with the car), pans between posts, and cranes up at the end */
      const postZ = i => roadZ(MS[i]) + RW * .5 + 3.4;
      const camZat = u => (roadZ(u) - 52) * .72;
      function dwell(i, t) {
        const want = NARROW ? .58 : .6, cz = camZat(MS[i]), zr = postZ(i) - cz;
        return { x: MS[i] - (want - .5) * W * zr / F + (t - MID[i]) * VC * .22, z: cz };
      }
      function camera(t) {
        let c;
        if (t < AT[0]) {   // opening: follow the car in, then settle at the first post
          const u = carU(t), zc = roadZ(u), fol = { x: lerp(u, carU(t + .6), .35) + (.5 - (NARROW ? .5 : .4)) * W * (zc + 4) / F, z: camZat(u) }, d0 = dwell(0, AT[0]), k = ease((t - (AT[0] - PAN - .5)) / (PAN + .5));
          c = { x: lerp(fol.x, d0.x, k), z: lerp(fol.z, d0.z, k) };
        } else if (t <= DWE[0]) c = dwell(0, t);
        else if (t >= CRANE) c = dwell(4, CRANE);
        else { let i = 0; while (i < 4 && t > DWE[i]) i++; i--;   // i = the milestone we are leaving
          if (t < AT[i + 1]) { const a = dwell(i, DWE[i]), b = dwell(i + 1, AT[i + 1]), k = ease((t - DWE[i]) / PAN); c = { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) }; }
          else c = dwell(i + 1, t); }
        const k = ease((t - CRANE) / 2.4), mid = (MS[0] + DEST) / 2 + (NARROW ? 40 : 0);
        cam = { x: lerp(c.x, mid, k), z: lerp(c.z, PORT ? -560 : NARROW ? -320 : -150, k), h: lerp(31 + 2.5 * Math.sin(t * .3), PORT ? 120 : 52, k) };
      }
      const P = (x, y, z) => { const zr = z - cam.z; if (zr < 1) return null; const s = F / zr; return [W / 2 + (x - cam.x) * s, HOR + (cam.h - y) * s, s]; };
      const day = t => sm((t - 3) / (CRANE - 1));
      const fogMix = (c, z, dl) => mix(c, mix([44, 42, 110], [170, 196, 230], dl), clamp((z - cam.z - 40) / 300) * .75);

      /* ---- lift-off: every element is pulled up with its own small delay, accelerating as it goes ---- */
      const LDUR = 1.05;
      const liftU = d => LT < 0 ? 0 : clamp((LT - d) / LDUR);
      const lift = d => { if (LT < 0) return 0; const u = liftU(d), settle = u < .16 ? Math.sin(Math.PI * u / .16) * 5 : 0; return Math.pow(u, 2.3) * H * 1.3 - settle; };   // a tiny settle, then an accelerating pull
      const LEND = .48 + LDUR + .05;   // the last element (the foreground) starts at .48 s
      function liftAt(px, py, d, tilt) { const y = lift(d); if (!y) return false; g.save(); const u = liftU(d); g.translate(px + (W / 2 - px) * .05 * u * u, py - y); if (tilt) g.rotate(tilt * u); g.translate(-px, -py); return true; }

      /* sky, sun, clouds, birds */
      function bird(x, y, sz, ph, a, col) {
        const f = Math.sin(ph), tip = -sz * .55 * f, cy = -sz * (.28 + .22 * f);
        g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = Math.max(1.1, sz * .17); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(x - sz, y + tip); g.quadraticCurveTo(x - sz * .45, y + cy, x, y); g.quadraticCurveTo(x + sz * .45, y + cy, x + sz, y + tip); g.stroke();
        g.fillStyle = col; g.beginPath(); g.ellipse(x, y + sz * .06, sz * .16, sz * .1, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.lineCap = 'butt';
      }
      function flock(t, P0, off, base, n, sz, col, a) {
        const k = Math.floor((t + off) / P0), u = ((t + off) % P0) / P0, dir = k % 2 ? -1 : 1, fade = sm(u / .07) * sm((1 - u) / .07);
        const lead = dir > 0 ? lerp(-W * .2, W * 1.2, u) : lerp(W * 1.2, -W * .2, u), ctr = (n - 1) / 2;
        for (let j = 0; j < n; j++) { const offj = Math.abs(j - ctr); bird(lead - dir * offj * sz * 4.2, base + offj * sz * 2.2 + Math.sin(t * .9 + j) * sz * .6, sz, t * 8 + j * .9, a * fade, col); }
      }
      function sky(t, dl) {
        const top = mix([7, 6, 32], [40, 94, 206], dl), mid = mix([20, 17, 72], [106, 152, 236], dl), low = mix([52, 38, 112], [255, 214, 196], dl);
        const gr = g.createLinearGradient(0, 0, 0, HOR + 40); gr.addColorStop(0, rgb(top)); gr.addColorStop(.62, rgb(mid)); gr.addColorStop(1, rgb(low));
        g.fillStyle = gr; g.fillRect(0, 0, W, HOR + 80);
        const sa = 1 - sm(dl / .55);
        if (sa > 0) for (const s of STARS) { g.fillStyle = `rgba(210,225,255,${(.45 + .3 * Math.sin(t * 1.7 + s.p)) * sa})`; g.beginPath(); g.arc(s.x * W, s.y * H, s.s, 0, TAU); g.fill(); }
        const sx = W * (NARROW ? .86 : .74), sy = lerp(HOR + 40, HOR - H * .2, sm((t - 8) / 10));
        const glow = g.createRadialGradient(sx, sy, 0, sx, sy, H * .7);
        glow.addColorStop(0, `rgba(255,224,200,${.55 * dl})`); glow.addColorStop(.25, `rgba(255,170,190,${.22 * dl})`); glow.addColorStop(1, 'rgba(255,160,190,0)');
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        g.fillStyle = `rgba(255,244,232,${.95 * sm((t - 10) / 3)})`; g.beginPath(); g.arc(sx, sy, Math.max(12, H * .028), 0, TAU); g.fill();
        for (const c of CLOUDS) {
          const x = ((c.x + t * c.v) % 1.4 - .2) * W, y = c.y * H, w = c.w * W, h = c.h * H, col = mix([70, 62, 140], [255, 222, 232], dl);
          const cg = g.createRadialGradient(x, y, 0, x, y, w * .5); cg.addColorStop(0, rgb(col, .3 + .25 * dl)); cg.addColorStop(1, rgb(col, 0));
          g.save(); g.translate(x, y); g.scale(1, h / w); g.translate(-x, -y); g.fillStyle = cg; g.beginPath(); g.arc(x, y, w * .5, 0, TAU); g.fill(); g.restore();
        }
        const bc = rgb(mix([190, 205, 255], [40, 44, 96], dl), 1), s0 = Math.max(3.5, Math.min(W, H) * .0072);
        flock(t, 15, 2, H * .2, 7, s0, bc, .8); flock(t, 21, 11, H * .13, 5, s0 * .75, bc, .6);
      }
      function ranges(t, dl) {
        const haze = mix([60, 48, 130], [214, 222, 250], dl);
        LAYERS.forEach((L, i) => {
          const lifted = liftAt(W / 2, HOR, .05 + .04 * i, 0);
          const s = F / (L.z - cam.z), base = HOR + cam.h * s;
          const col = mix(mix(L.c0, L.c1, dl * (.55 + .45 * (i / LAYERS.length))), haze, .38 * (1 - i / LAYERS.length)), pts = [];
          g.beginPath(); g.moveTo(-10, H + 10);
          for (let sx = -10; sx <= W + 10; sx += 6) { const y = base - ridgeH(L, i, cam.x + (sx - W / 2) / s) * s; pts.push(sx, y); g.lineTo(sx, y); }
          g.lineTo(W + 10, H + 10); g.closePath();
          const gr = g.createLinearGradient(0, base - L.h * s, 0, base + 40); gr.addColorStop(0, rgb(col)); gr.addColorStop(1, rgb(mix(col, [10, 9, 40], .35 * (1 - dl))));
          g.fillStyle = gr; g.fill();
          g.beginPath(); for (let k = 0; k < pts.length; k += 2) k ? g.lineTo(pts[k], pts[k + 1]) : g.moveTo(pts[k], pts[k + 1]);
          g.strokeStyle = `rgba(255,214,220,${L.rim * (.25 + .75 * dl)})`; g.lineWidth = 1; g.stroke();
          for (const m of MIST) {
            if (Math.abs(m.z - L.z) > 260 || m.z > L.z) continue;
            const ms = F / (m.z - cam.z), my = HOR + (cam.h - 6) * ms, mx = W / 2 + (((m.x + t * m.v) % 2400) - 1200 - (cam.x * .4) % 2400) * ms, mw = m.w * ms;
            const mc = mix([90, 90, 170], [235, 240, 255], dl), mg = g.createRadialGradient(mx, my, 0, mx, my, mw); mg.addColorStop(0, rgb(mc, .2 + .1 * dl)); mg.addColorStop(1, rgb(mc, 0));
            g.save(); g.translate(mx, my); g.scale(1, .14); g.translate(-mx, -my); g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mw, 0, TAU); g.fill(); g.restore();
          }
          if (lifted) g.restore();
        });
      }
      function flatEllipse(cx, cz, rx, rz, n) { const pts = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, p = P(cx + Math.cos(a) * rx, 0, cz + Math.sin(a) * rz); if (!p) return null; pts.push(p); } return pts; }
      function ground(t, dl) {
        const lifted = liftAt(W / 2, H * .7, .24, 0);
        const p = P(cam.x, 0, 330) || [0, HOR, 0], y0 = p[1];
        const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, rgb(mix([24, 30, 82], [86, 112, 190], dl))); gr.addColorStop(1, rgb(mix([10, 12, 42], [40, 58, 130], dl)));
        g.fillStyle = gr; g.fillRect(0, y0, W, H - y0 + 12);
        for (const m of MEADOWS) {
          const sx = W / 2 + (m.x - cam.x) * F / (m.z - cam.z); if (sx < -W * .6 || sx > W * 1.6) continue;
          const pts = flatEllipse(m.x, m.z, m.rx, m.rz, 18); if (!pts) continue;
          const c = fogMix(m.d > 0 ? mix([30, 40, 96], [104, 132, 206], dl) : mix([16, 22, 62], [58, 84, 160], dl), m.z, dl);
          g.fillStyle = rgb(c, .55); g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill();
        }
        const lk = flatEllipse(LAKE.u, LAKE.z, LAKE.rx, LAKE.rz, 48);
        if (lk) {
          let ymin = 1e9, ymax = -1e9; for (const q of lk) { ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); }
          const lg = g.createLinearGradient(0, ymin, 0, ymax);
          lg.addColorStop(0, rgb(mix([52, 38, 112], [255, 220, 205], dl))); lg.addColorStop(.5, rgb(mix([24, 20, 78], [120, 160, 236], dl))); lg.addColorStop(1, rgb(mix([12, 12, 48], [56, 100, 200], dl)));
          g.fillStyle = lg; g.beginPath(); lk.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill();
          g.save(); g.clip();
          for (let k = 0; k < 16; k++) {
            const zz = LAKE.z - LAKE.rz + (k + .5) / 16 * LAKE.rz * 2, xx = LAKE.u + Math.sin(k * 3.7 + t * .5) * LAKE.rx * .55, q = P(xx, 0, zz); if (!q) continue;
            g.strokeStyle = `rgba(255,236,226,${(.12 + .2 * dl) * (.6 + .4 * Math.sin(t * 2 + k))})`; g.lineWidth = 1; g.beginPath(); g.moveTo(q[0] - 14 * q[2], q[1]); g.lineTo(q[0] + 14 * q[2], q[1]); g.stroke();
          }
          g.restore();
          g.strokeStyle = rgb(mix([60, 70, 150], [200, 220, 250], dl), .5); g.lineWidth = 1; g.beginPath(); lk.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke();
        }
        if (lifted) g.restore();
      }
      function road(t, dl) {
        const lifted = liftAt(W / 2, H * .7, .3, 0);
        const du = 1.2, span = W * .6 / F * (90 - cam.z), L0 = Math.max(U0, cam.x - span), L1 = Math.min(U1, cam.x + span);
        const pts = []; for (let u = L0; u <= L1; u += du) pts.push(u);
        const side = off => { const out = []; for (const u of pts) { const p = P(u, roadY(u), roadZ(u) + off); if (p) out.push(p); } return out; };
        const ribbon = (a, b, col) => { const A = side(a), B = side(b); if (A.length < 2 || B.length < 2) return; g.fillStyle = col; g.beginPath(); A.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); for (let k = B.length - 1; k >= 0; k--) g.lineTo(B[k][0], B[k][1]); g.closePath(); g.fill(); };
        const sh = rgb(mix([40, 40, 82], [150, 150, 170], dl)), asph = mix([28, 30, 66], [86, 96, 132], dl);
        ribbon(-RW / 2 - 1.3, RW / 2 + 1.3, sh);
        const Lp = side(-RW / 2), Rp = side(RW / 2); if (Lp.length < 2) { if (lifted) g.restore(); return; }
        let ymin = 1e9, ymax = -1e9; for (const p of Rp) ymin = Math.min(ymin, p[1]); for (const p of Lp) ymax = Math.max(ymax, p[1]);
        const ag = g.createLinearGradient(0, ymin, 0, Math.max(ymin + 1, ymax)); ag.addColorStop(0, rgb(fogMix(asph, 92, dl))); ag.addColorStop(1, rgb(asph));
        ribbon(-RW / 2, RW / 2, ag);
        for (const tr of [-2.6, -1.1, 1.1, 2.6]) ribbon(tr - .35, tr + .35, `rgba(10,10,30,${.18 - .06 * dl})`);
        const paint = rgb(mix([150, 165, 220], [245, 247, 255], dl), .8);
        ribbon(-RW / 2 + .25, -RW / 2 + .5, paint); ribbon(RW / 2 - .5, RW / 2 - .25, paint);
        g.fillStyle = paint; g.beginPath();
        for (let u = Math.ceil(L0 / 6) * 6; u < L1; u += 6) {
          const a = P(u, roadY(u), roadZ(u) - .13), b = P(u + 3, roadY(u + 3), roadZ(u + 3) - .13), c = P(u + 3, roadY(u + 3), roadZ(u + 3) + .13), d = P(u, roadY(u), roadZ(u) + .13);
          if (a && b && c && d) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
        }
        g.fill();
        const cu = carU(t), tr = []; for (let u = Math.max(U0, cu - 260); u <= cu; u += 3) { const p = P(u, roadY(u), roadZ(u)); if (p) tr.push(p); }
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 6; k++) { const i0 = Math.floor(tr.length * k / 6), i1 = Math.min(tr.length - 1, Math.floor(tr.length * (k + 1) / 6)); if (i1 <= i0) continue;
          g.strokeStyle = `rgba(74,140,255,${.34 * (k + 1) / 6})`; g.lineWidth = Math.max(1, tr[i1][2] * .55); g.beginPath(); g.moveTo(tr[i0][0], tr[i0][1]); for (let i = i0 + 1; i <= i1; i++) g.lineTo(tr[i][0], tr[i][1]); g.stroke(); }
        g.lineCap = 'butt'; g.lineJoin = 'miter';
        if (lifted) g.restore();
      }
      function drawProp(pr, t, dl) {
        const onRoad = pr.z < 95, p = P(pr.x, onRoad ? roadY(pr.x) : 0, pr.z); if (!p) return;
        const [x, y, s] = p; if (x < -200 || x > W + 200) return;
        const lifted = LT >= 0 && liftAt(x, y, .26 + .16 * clamp(1 - (pr.z - cam.z) / 320) + .07 * pr.lift, (pr.lift - .5) * .14);
        if (pr.t === 'tree') {
          const h = pr.h * s * pr.s;
          if (h >= .8) {
            const col = fogMix(mix([11, 22, 58], [30, 54, 122], dl), pr.z, dl), sway = Math.sin(t * 1.3 + pr.ph) * h * .015;
            g.fillStyle = rgb(col); g.beginPath();
            if (pr.k === 0) { for (let i = 0; i < 3; i++) { const y0 = y - h * (.12 + i * .25), w = h * (.3 - i * .07); g.moveTo(x - w, y0); g.lineTo(x + sway * (i + 1), y0 - h * .44); g.lineTo(x + w, y0); } g.fill(); g.fillRect(x - h * .03, y - h * .14, h * .06, h * .14); }
            else { g.fillRect(x - h * .035, y - h * .38, h * .07, h * .38); g.arc(x + sway, y - h * .62, h * .3, 0, TAU); g.moveTo(x - h * .16 + sway, y - h * .5); g.arc(x - h * .16 + sway, y - h * .5, h * .22, 0, TAU); g.moveTo(x + h * .18 + sway, y - h * .48); g.arc(x + h * .18 + sway, y - h * .48, h * .2, 0, TAU); g.fill(); }
            if (dl > .1) { g.fillStyle = `rgba(255,220,210,${.12 * dl})`; g.beginPath(); g.arc(x + h * .06, y - h * .7, h * .12, 0, TAU); g.fill(); }
            g.fillStyle = 'rgba(4,4,24,.18)'; g.beginPath(); g.ellipse(x, y, h * .26, h * .05, 0, 0, TAU); g.fill();
          }
        } else if (pr.t === 'house') {
          const w = pr.w * s, h = pr.h * s, col = fogMix(mix([26, 30, 80], [200, 206, 232], dl), pr.z, dl), roof = fogMix(mix([40, 30, 90], [110, 96, 170], dl), pr.z, dl);
          g.fillStyle = rgb(col); g.fillRect(x - w / 2, y - h, w, h);
          g.fillStyle = rgb(roof); g.beginPath(); g.moveTo(x - w * .6, y - h); g.lineTo(x, y - h * 1.7); g.lineTo(x + w * .6, y - h); g.closePath(); g.fill();
          const lit = pr.lit ? (1 - sm((t - 7 - pr.r * 5) / 2)) : 0;
          g.fillStyle = lit > .02 ? `rgba(255,214,150,${.4 + .55 * lit})` : rgb(mix(col, [10, 10, 40], .35));
          g.fillRect(x - w * .3, y - h * .66, w * .2, h * .26); g.fillRect(x + w * .1, y - h * .66, w * .2, h * .26);
        } else if (pr.t === 'marker') {
          const h = 1.1 * s;
          if (h >= 1.2) { g.fillStyle = rgb(mix([150, 160, 210], [240, 244, 255], dl), .9); g.fillRect(x - h * .07, y - h, h * .14, h); g.fillStyle = `rgba(255,236,190,${.95 - .5 * dl})`; g.fillRect(x - h * .07, y - h, h * .14, h * .22); }
        } else if (pr.t === 'fence') {
          const h = 1.3 * s;
          if (h >= 1) { const nx = P(pr.x + 3.2, roadY(pr.x + 3.2), roadZ(pr.x + 3.2) + RW * .5 + 5.2), col = rgb(fogMix(mix([60, 56, 110], [190, 190, 214], dl), pr.z, dl));
            g.fillStyle = col; g.fillRect(x - h * .06, y - h, h * .12, h);
            if (nx) { g.strokeStyle = col; g.lineWidth = Math.max(.6, h * .08); g.beginPath(); g.moveTo(x, y - h * .8); g.lineTo(nx[0], nx[1] - h * .8); g.moveTo(x, y - h * .45); g.lineTo(nx[0], nx[1] - h * .45); g.stroke(); } }
        } else if (pr.t === 'flower') {
          if (s >= 2) { const r = Math.max(.7, .16 * s), cols = ['#E5197F', '#2EC9C4', '#F4F7FF'];
            for (let k = 0; k < pr.n; k++) { const ox = (hash(pr.sd + k) - .5) * 1.6 * s, oy = (hash(pr.sd + k * 3.1) - .5) * .5 * s; g.fillStyle = cols[pr.c]; g.globalAlpha = .55 + .35 * dl; g.beginPath(); g.arc(x + ox, y + oy - r, r, 0, TAU); g.fill(); }
            g.globalAlpha = 1; }
        }
        if (lifted) g.restore();
      }
      /* the car: a modern compact SUV in pearl white, wheels turning */
      function drawCar(t, dl) {
        const u = carU(t), z = roadZ(u) - RW * .2, p = P(u, roadY(u), z), q = P(u + 2, roadY(u + 2), roadZ(u + 2) - RW * .2); if (!p || !q) return;
        const lifted = LT >= 0 && liftAt(p[0], p[1], .4, .06);
        const ang = clamp(Math.atan2(q[1] - p[1], q[0] - p[0]), -.2, .2), s = p[2], L = 5.1 * s, Hh = 1.75 * s, night = 1 - sm(dl / .7);
        const bob = Math.sin(u * 1.7) * Hh * .012, wr = Hh * .27, spin = u / .34;
        g.save(); g.translate(p[0], p[1]); g.rotate(ang);
        if (night > 0) { const bg = g.createLinearGradient(L * .5, 0, L * 4.4, 0); bg.addColorStop(0, `rgba(225,236,255,${.4 * night})`); bg.addColorStop(1, 'rgba(225,236,255,0)'); g.fillStyle = bg; g.beginPath(); g.moveTo(L * .48, -Hh * .52); g.lineTo(L * 4.4, -Hh * 1.3); g.lineTo(L * 4.4, Hh * .45); g.lineTo(L * .48, -Hh * .3); g.closePath(); g.fill(); }
        const shd = g.createRadialGradient(0, 0, 0, 0, 0, L * .62); shd.addColorStop(0, 'rgba(4,4,20,.5)'); shd.addColorStop(1, 'rgba(4,4,20,0)');
        g.save(); g.scale(1, .22); g.fillStyle = shd; g.beginPath(); g.arc(0, 0, L * .62, 0, TAU); g.fill(); g.restore();
        g.translate(0, bob);
        const body = g.createLinearGradient(0, -Hh * 1.32, 0, -Hh * .12); body.addColorStop(0, '#FFFFFF'); body.addColorStop(.45, '#E4EAF8'); body.addColorStop(1, '#9AA7CC');
        g.fillStyle = body; g.beginPath();
        g.moveTo(-L * .5, -Hh * .3); g.lineTo(-L * .5, -Hh * .62); g.quadraticCurveTo(-L * .49, -Hh * .78, -L * .4, -Hh * .82);
        g.lineTo(-L * .3, -Hh * 1.22); g.quadraticCurveTo(-L * .27, -Hh * 1.32, -L * .14, -Hh * 1.32); g.lineTo(L * .14, -Hh * 1.3);
        g.quadraticCurveTo(L * .2, -Hh * 1.29, L * .26, -Hh * 1.16); g.lineTo(L * .33, -Hh * .86); g.quadraticCurveTo(L * .48, -Hh * .8, L * .51, -Hh * .64); g.lineTo(L * .52, -Hh * .3);
        g.quadraticCurveTo(L * .5, -Hh * .2, L * .44, -Hh * .2); g.lineTo(-L * .44, -Hh * .2); g.quadraticCurveTo(-L * .5, -Hh * .2, -L * .5, -Hh * .3); g.closePath(); g.fill();
        g.fillStyle = 'rgba(40,44,90,.55)'; g.fillRect(-L * .48, -Hh * .34, L * .98, Hh * .1);
        g.fillStyle = '#151638'; for (const wx of [-L * .3, L * .31]) { g.beginPath(); g.arc(wx, -Hh * .2, wr * 1.22, Math.PI, 0); g.fill(); }
        const gl = g.createLinearGradient(-L * .3, -Hh * 1.2, L * .2, -Hh * .85); gl.addColorStop(0, '#2B3A8C'); gl.addColorStop(.55, '#1D2565'); gl.addColorStop(1, '#3F5BB8');
        g.fillStyle = gl; g.beginPath(); g.moveTo(-L * .37, -Hh * .86); g.lineTo(-L * .28, -Hh * 1.18); g.lineTo(L * .13, -Hh * 1.2); g.lineTo(L * .23, -Hh * .86); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(-L * .2, -Hh * 1.18); g.lineTo(-L * .12, -Hh * 1.18); g.lineTo(-L * .24, -Hh * .86); g.lineTo(-L * .32, -Hh * .86); g.closePath(); g.fill();
        g.fillStyle = '#EEF2FF'; g.fillRect(-L * .07, -Hh * 1.2, L * .035, Hh * .34); g.fillRect(L * .12, -Hh * 1.2, L * .025, Hh * .34);
        g.strokeStyle = 'rgba(80,90,140,.55)'; g.lineWidth = Math.max(.5, s * .05); g.beginPath(); g.moveTo(-L * .06, -Hh * .86); g.lineTo(-L * .07, -Hh * .3); g.moveTo(L * .2, -Hh * .86); g.lineTo(L * .19, -Hh * .36); g.stroke();
        g.fillStyle = 'rgba(80,90,140,.7)'; g.fillRect(-L * .02, -Hh * .72, L * .05, Hh * .04); g.fillRect(L * .23, -Hh * .72, L * .05, Hh * .04);
        g.fillStyle = '#E4EAF8'; g.beginPath(); g.ellipse(L * .25, -Hh * .9, L * .03, Hh * .05, 0, 0, TAU); g.fill();
        g.fillStyle = '#3A3F7A'; g.fillRect(-L * .24, -Hh * 1.37, L * .34, Hh * .045);
        g.fillStyle = '#1570EF'; g.fillRect(-L * .46, -Hh * .56, L * .86, Hh * .055); g.fillStyle = '#2EC9C4'; g.fillRect(L * .4, -Hh * .56, L * .08, Hh * .055);
        g.fillStyle = `rgba(255,250,232,${.75 + .25 * night})`; g.beginPath(); g.moveTo(L * .5, -Hh * .66); g.lineTo(L * .44, -Hh * .66); g.lineTo(L * .47, -Hh * .58); g.lineTo(L * .515, -Hh * .58); g.closePath(); g.fill();
        g.fillStyle = '#E5197F'; g.fillRect(-L * .505, -Hh * .66, L * .03, Hh * .12);
        if (night > .2) { const tg = g.createRadialGradient(-L * .5, -Hh * .6, 0, -L * .5, -Hh * .6, L * .18); tg.addColorStop(0, `rgba(229,25,127,${.45 * night})`); tg.addColorStop(1, 'rgba(229,25,127,0)'); g.fillStyle = tg; g.fillRect(-L * .7, -Hh, L * .4, Hh); }
        for (const wx of [-L * .3, L * .31]) {
          g.fillStyle = '#0E0F2A'; g.beginPath(); g.arc(wx, -Hh * .2, wr, 0, TAU); g.fill();
          g.fillStyle = '#B8C2E2'; g.beginPath(); g.arc(wx, -Hh * .2, wr * .62, 0, TAU); g.fill();
          g.strokeStyle = '#5A6496'; g.lineWidth = Math.max(.6, wr * .14); g.beginPath();
          for (let k = 0; k < 5; k++) { const a = spin + k * TAU / 5; g.moveTo(wx, -Hh * .2); g.lineTo(wx + Math.cos(a) * wr * .58, -Hh * .2 + Math.sin(a) * wr * .58); } g.stroke();
          g.fillStyle = '#2A2F60'; g.beginPath(); g.arc(wx, -Hh * .2, wr * .14, 0, TAU); g.fill();
        }
        g.restore();
        if (lifted) g.restore();
      }
      /* milestone posts */
      const postBase = i => ({ x: MS[i], y: roadY(MS[i]), z: postZ(i) });
      function drawPost(i, t) {
        const b = postBase(i), p = P(b.x, b.y, b.z); if (!p) return null;
        const appear = t >= CRANE ? 1 : sm((t - AT[i] + PAN + .1) / .7); if (appear <= 0) return null;
        const s = p[2], top = P(b.x, b.y + 7.5 * appear, b.z), pass = clamp((t - MID[i] + .4) / 1.4);
        const lifted = LT >= 0 && liftAt(p[0], p[1], .34 + .03 * i, (i % 2 ? 1 : -1) * .05);
        g.save(); g.translate(p[0], p[1]); g.scale(1, .3);
        g.strokeStyle = `rgba(141,184,255,${.7 * appear * (1 - pass * .6)})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * (2.2 + 4 * pass), 0, TAU); g.stroke();
        g.fillStyle = `rgba(21,112,239,${.35 * appear})`; g.beginPath(); g.arc(0, 0, s * 1.6, 0, TAU); g.fill(); g.restore();
        g.strokeStyle = `rgba(230,238,255,${.85 * appear})`; g.lineWidth = Math.max(1.2, s * .2); g.lineCap = 'round'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(top[0], top[1]); g.stroke(); g.lineCap = 'butt';
        const done = t > MID[i] + .3 || t >= CRANE;
        g.fillStyle = done ? '#1570EF' : '#fff'; g.beginPath(); g.arc(top[0], top[1], Math.max(3.5, s * .7), 0, TAU); g.fill(); g.strokeStyle = 'rgba(141,184,255,.8)'; g.lineWidth = 1.5; g.stroke();
        if (lifted) g.restore();
        return { x: top[0], y: top[1], gx: p[0], gy: p[1], s };
      }
      function paper(x, y, w, h, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(8,8,40,.25)'; g.beginPath(); g.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, w * .08); g.fill(); g.fillStyle = '#F2F5FF'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, w * .08); g.fill(); g.fillStyle = '#B9C6E8'; for (let k = 0; k < 4; k++) g.fillRect(-w * .32, -h * .3 + k * h * .16, w * (k === 3 ? .4 : .64), h * .05); g.restore(); }
      function tick(x, y, r, col, k) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (k <= 0) return; g.strokeStyle = '#fff'; g.lineWidth = r * .32; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - r * .45, y); const m = Math.min(1, k * 2); g.lineTo(x - r * .45 + r * .3 * m, y + r * .32 * m); if (k > .5) { const n = (k - .5) * 2; g.lineTo(x - r * .15 + r * .62 * n, y + r * .32 - r * .72 * n); } g.stroke(); g.lineCap = 'butt'; g.lineJoin = 'miter'; }
      const panel = (x, y, w, h, k) => { g.fillStyle = 'rgba(14,13,62,.92)'; g.strokeStyle = 'rgba(141,184,255,.5)'; g.lineWidth = 1; g.beginPath(); g.roundRect(x, y, w, h, 9 * k); g.fill(); g.stroke(); };
      /* the small scene at each post: what that step produces */
      function scene(i, t, a, cx, cy, k) {
        const e = t - AT[i] - .2, on = j => clamp((e - [.1, .8, 1.5][j]) / .5);
        g.save(); g.globalAlpha = a;
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, 80 * k); glow.addColorStop(0, 'rgba(141,184,255,.26)'); glow.addColorStop(1, 'rgba(141,184,255,0)');
        g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, 80 * k, 0, TAU); g.fill();
        if (i === 0) {
          const SP = [[-50, -24, -.5], [46, -30, .45], [-34, 28, .3], [40, 26, -.35]];
          SP.forEach((s0, j) => { const u = ease((e - .1 - j * .2) / 1); paper(cx + s0[0] * k * (1 - u), cy + s0[1] * k * (1 - u) - j * 2.4 * k * u, 32 * k, 42 * k, s0[2] * (1 - u) + (j - 1.5) * .04 * u); });
          tick(cx + 16 * k, cy - 25 * k, 8.5 * k, '#2EC9C4', clamp((e - 1.8) / .5));
        } else if (i === 1) {
          const nodes = [[-56, -28], [52, -30], [-52, 30], [56, 26]], cols = ['#8DB8FF', '#2EC9C4', '#8DB8FF', '#E5197F'];
          nodes.forEach((n, j) => {
            const u = ease((e - .1 - j * .4) / .6), x = cx + n[0] * k, y = cy + n[1] * k; if (u <= 0) return;
            g.strokeStyle = 'rgba(141,184,255,.85)'; g.lineWidth = 1.7 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(x, cx, u), lerp(y, cy, u)); g.stroke();
            g.fillStyle = cols[j]; g.beginPath(); g.roundRect(x - 17 * k, y - 6.5 * k, 34 * k, 13 * k, 6.5 * k); g.fill();
            g.fillStyle = 'rgba(14,13,62,.55)'; g.fillRect(x - 11 * k, y - 1 * k, 22 * k, 2 * k);
            if (u >= 1) { const pu = (t * .8 + j * .25) % 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(lerp(x, cx, pu), lerp(y, cy, pu), 2 * k, 0, TAU); g.fill(); }
          });
          paper(cx, cy, 30 * k, 38 * k, 0);
        } else if (i === 2) {
          panel(cx - 48 * k, cy - 35 * k, 96 * k, 70 * k, k);
          for (let j = 0; j < 3; j++) {
            const y = cy - 18 * k + j * 18 * k, v = ease(on(j));
            g.fillStyle = 'rgba(185,198,232,.75)'; g.fillRect(cx - 37 * k, y - 2 * k, 34 * k, 4 * k);
            g.fillStyle = v > .5 ? '#1570EF' : 'rgba(255,255,255,.25)'; g.beginPath(); g.roundRect(cx + 10 * k, y - 6 * k, 24 * k, 12 * k, 6 * k); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + lerp(16, 28, v) * k, y, 4.3 * k, 0, TAU); g.fill();
          }
          g.save(); g.translate(cx + 52 * k, cy - 35 * k); g.rotate(t * 1.2); g.fillStyle = '#2EC9C4';
          for (let j = 0; j < 8; j++) { g.rotate(TAU / 8); g.fillRect(-2.4 * k, -12 * k, 4.8 * k, 5.6 * k); }
          g.beginPath(); g.arc(0, 0, 8.4 * k, 0, TAU); g.fill(); g.fillStyle = 'rgba(14,13,62,1)'; g.beginPath(); g.arc(0, 0, 3.4 * k, 0, TAU); g.fill(); g.restore();
        } else if (i === 3) {
          panel(cx - 50 * k, cy - 40 * k, 100 * k, 82 * k, k);
          for (let j = 0; j < 4; j++) {
            const y = cy - 26 * k + j * 15 * k, issue = j === 2, kk = clamp((e - .1 - j * .35) / .4), fix = clamp((e - 1.6) / .4);
            tick(cx - 35 * k, y, 5.2 * k, issue ? (fix > 0 ? '#2EC9C4' : '#E5197F') : '#2EC9C4', issue ? fix : kk);
            if (issue && fix <= 0 && kk > 0) { g.fillStyle = '#fff'; g.fillRect(cx - 35.8 * k, y - 3 * k, 1.6 * k, 3.6 * k); g.fillRect(cx - 35.8 * k, y + 1.5 * k, 1.6 * k, 1.6 * k); }
            g.fillStyle = 'rgba(185,198,232,.75)'; g.fillRect(cx - 24 * k, y - 2 * k, (issue ? 46 : 60) * k, 4 * k);
          }
          const pr = ease(clamp((e - 1.7) / 1)); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(cx - 39 * k, cy + 30 * k, 78 * k, 6 * k, 3 * k); g.fill();
          const pg = g.createLinearGradient(cx - 39 * k, 0, cx + 39 * k, 0); pg.addColorStop(0, '#1570EF'); pg.addColorStop(1, '#8DB8FF'); g.fillStyle = pg; g.beginPath(); g.roundRect(cx - 39 * k, cy + 30 * k, 78 * k * Math.max(.02, pr), 6 * k, 3 * k); g.fill();
        } else {
          const v0 = ease(on(0)), v1 = ease(on(1)), v2 = ease(on(2));
          if (v0 > 0) { g.globalAlpha = a * v0; tick(cx, cy - 40 * k, 10 * k, '#2EC9C4', clamp((e - .4) / .5)); g.globalAlpha = a; }
          if (v1 > 0) { g.save(); g.globalAlpha = a * v1; g.translate(cx - 28 * k, cy + 8 * k * (1 - v1));
            g.fillStyle = '#F2F5FF'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -16 * k); g.quadraticCurveTo(sd * 14 * k, -21 * k, sd * 27 * k, -17 * k); g.lineTo(sd * 27 * k, 16 * k); g.quadraticCurveTo(sd * 14 * k, 12 * k, 0, 17 * k); g.closePath(); g.fill(); }
            g.fillStyle = '#B9C6E8'; for (let j = 0; j < 3; j++) { g.fillRect(-22 * k, -8 * k + j * 7.5 * k, 17 * k, 2.2 * k); g.fillRect(5 * k, -8 * k + j * 7.5 * k, 17 * k, 2.2 * k); } g.restore(); }
          if (v2 > 0) { g.save(); g.globalAlpha = a * v2; g.translate(cx + 30 * k, cy + 4 * k + 8 * k * (1 - v2));
            g.fillStyle = '#1570EF'; g.beginPath(); g.roundRect(-22 * k, -16 * k, 18 * k, 8 * k, 2 * k); g.fill(); g.beginPath(); g.roundRect(-22 * k, -11 * k, 44 * k, 32 * k, 3 * k); g.fill();
            tick(0, 5 * k, 7.5 * k, '#2EC9C4', clamp((e - 2.1) / .5)); g.restore(); }
        }
        g.restore();
      }
      function destination(t, dl) {
        const z = roadZ(DEST) + RW * .5 + 30, b = P(DEST, roadY(DEST), z); if (!b) return;
        const lifted = LT >= 0 && liftAt(b[0], b[1], .3, .03);
        const s = b[2], w = 19 * s, h = 11 * s, x = b[0] - w / 2, y = b[1], col = fogMix(mix([30, 34, 92], [210, 222, 248], dl), z, dl);
        g.fillStyle = rgb(col); g.beginPath(); g.roundRect(x, y - h, w * .62, h, 2 * s); g.fill(); g.beginPath(); g.roundRect(x + w * .55, y - h * 1.45, w * .45, h * 1.45, 2 * s); g.fill();
        const t0 = AT[4] + .4, lit = sm((t - t0) / 1.4);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
          const on = lit * (hash(r * 7 + c * 13) < .75 ? 1 : 0) * sm((t - t0 - hash(r * 3 + c) * 1.2) / .4);
          g.fillStyle = on > 0 ? `rgba(255,236,190,${.35 + .6 * on})` : rgb(mix(col, [10, 10, 40], .3));
          if (c < 3) g.fillRect(x + w * (.06 + c * .17), y - h * (.86 - r * .2), w * .1, h * .1); else g.fillRect(x + w * (.6 + (c - 3) * .2), y - h * (1.3 - r * .26), w * .12, h * .12);
        }
        const fx = x + w * .9, fy = y - h * 1.45, raise = sm((t - t0 - .3) / 1);
        g.strokeStyle = 'rgba(240,244,255,.9)'; g.lineWidth = Math.max(1, s * .2); g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 10 * s); g.stroke();
        if (raise > 0) { const wv = Math.sin(t * 5) * s * .6, fh = 3.4 * s, fw = 6 * s, top = fy - 10 * s + (1 - raise) * 6 * s;
          g.fillStyle = '#E5197F'; g.beginPath(); g.moveTo(fx, top); g.quadraticCurveTo(fx + fw * .5, top + wv, fx + fw, top); g.lineTo(fx + fw, top + fh / 2); g.quadraticCurveTo(fx + fw * .5, top + fh / 2 + wv, fx, top + fh / 2); g.fill();
          g.fillStyle = '#2EC9C4'; g.beginPath(); g.moveTo(fx, top + fh / 2); g.quadraticCurveTo(fx + fw * .5, top + fh / 2 + wv, fx + fw, top + fh / 2); g.lineTo(fx + fw, top + fh); g.quadraticCurveTo(fx + fw * .5, top + fh + wv, fx, top + fh); g.fill(); }
        if (lit > 0) { const lg = g.createRadialGradient(b[0], y - h * .6, 0, b[0], y - h * .6, w * 1.4); lg.addColorStop(0, `rgba(255,230,200,${.25 * lit})`); lg.addColorStop(1, 'rgba(255,230,200,0)'); g.fillStyle = lg; g.fillRect(b[0] - w * 1.5, y - h * 2.2, w * 3, h * 3); }
        if (lifted) g.restore();
      }
      function grass(t, dl) {
        const lower = 1 - ease((t - CRANE) / 2.2); if (lower <= 0) return;
        const lifted = liftAt(W / 2, H, .48, 0);
        const col = rgb(mix([6, 8, 30], [22, 36, 92], dl)), base = H + 2, shift = (cam.x * 3) % W;
        g.fillStyle = col; g.beginPath();
        for (const b of GRASS) {
          const x = ((b.x * W * 1.2 - shift) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1, h = b.h * H * lower * (.7 + .3 * b.d), w = b.w * W, sway = Math.sin(t * 1.4 + b.ph) * h * .08 + b.lean * h * .3;
          g.moveTo(x - w, base); g.quadraticCurveTo(x + sway * .4, base - h * .6, x + sway, base - h); g.quadraticCurveTo(x + sway * .4 + w * .3, base - h * .5, x + w, base);
        }
        g.fill();
        if (lifted) g.restore();
      }
      /* the pull: a soft column of light from above and fine upward trails in Facilio colours */
      const SPR = [];
      function trailSprite(c) {
        if (SPR[c]) return SPR[c]; const cols = ['141,184,255', '46,201,196', '244,247,255', '229,25,127'], sc = doc.createElement('canvas'); sc.width = 4; sc.height = 128;
        const x = sc.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, `rgba(${cols[c]},1)`); gr.addColorStop(1, `rgba(${cols[c]},0)`); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); return SPR[c] = sc;
      }
      function beam() {
        if (LT < 0) return;
        const bell = Math.sin(Math.PI * clamp(LT / LEND));
        g.save(); g.globalCompositeOperation = 'lighter';
        g.save(); g.translate(W / 2, -H * .08); g.scale(W * .42 / H, 1);   // a soft elliptical column of light from above, no hard edges
        const bg = g.createRadialGradient(0, 0, 0, 0, 0, H * 1.15); bg.addColorStop(0, `rgba(180,206,255,${.26 * bell})`); bg.addColorStop(.55, `rgba(141,184,255,${.08 * bell})`); bg.addColorStop(1, 'rgba(141,184,255,0)');
        g.fillStyle = bg; g.beginPath(); g.arc(0, 0, H * 1.15, 0, TAU); g.fill(); g.restore();
        for (const p of TRAILS) {
          const k = clamp((LT - p.d) / (LEND - p.d)); if (k <= 0 || k >= 1) continue;
          const y = (p.y - k * k * 1.9 * p.sp) * H, len = p.len * H * (1 + 2.2 * k), x = (p.x + (.5 - p.x) * .06 * k) * W;
          if (y + len < 0) continue;
          g.globalAlpha = .55 * Math.sin(Math.PI * k); g.drawImage(trailSprite(p.c), x - p.w / 2, y, p.w, len);   // bright head, fading tail
        }
        g.restore();
      }

      /* each step's sign sits on top of its post, with the challenge and how Facilio helps */
      let measured = false, CW = [], CH = [], KW = [], KH = [], SCENEBOX = null, CAPBOX = null;
      const measure = () => { CW = CAPS.map(e => e.offsetWidth); CH = CAPS.map(e => e.offsetHeight); KW = CHIPS.map(e => e.offsetWidth); KH = CHIPS.map(e => e.offsetHeight); measured = true; };
      const active = t => { for (let i = 0; i < 5; i++) if (t >= AT[i] - .15 && t < DWE[i] - .1) return i; return -1; };
      function carRect() { const u = carU(T), p = P(u, roadY(u), roadZ(u)); return p && { x: p[0] - 2.8 * p[2], y: p[1] - 2.6 * p[2], w: 5.6 * p[2], h: 2.8 * p[2] }; }
      function signBox(i, p) {
        const top = NARROW ? 62 : 74, y = clamp(p.y - CH[i] - 16, top, H - CH[i] - 60);
        const c = carRect(), fits = x => !c || !(x < c.x + c.w + 10 && c.x < x + CW[i] + 10 && y < c.y + c.h + 10 && c.y < y + CH[i] + 10);
        // centred over its post; on short screens, where the sign can reach down to the road, it steps aside to stay clear of the car
        const xs = [p.x - CW[i] / 2, p.x - CW[i] + 18, p.x - 18, 14, W - CW[i] - 14].map(x => clamp(x, 14, W - CW[i] - 14));
        const x = xs.find(fits); return { x: x == null ? xs[0] : x, y, w: CW[i], h: CH[i] };
      }
      function place(t, posts) {
        if (!measured) measure();
        const a = active(t); CAPBOX = null;
        CAPS.forEach((el, i) => {
          const on = i === a && !!posts[i] && LT < 0;
          el.classList.toggle('on', on);
          if (!posts[i]) return;
          const b = signBox(i, posts[i]); el.style.transform = `translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px)`;
          if (on) { CAPBOX = b; const p = posts[i], ax = clamp(p.x, b.x + 16, b.x + b.w - 16), ay = b.y + b.h;
            g.setTransform(DPR, 0, 0, DPR, 0, 0); g.strokeStyle = 'rgba(214,226,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(p.x, p.y - 5); g.stroke(); }
        });
        const show = t >= CRANE + 1.3 && H >= 520 && !NARROW, boxes = [];
        CHIPS.forEach((el, i) => {
          el.classList.toggle('on', show && !!posts[i]); if (!posts[i]) return;
          const p = posts[i]; let x = clamp(p.x - KW[i] / 2, 12, W - KW[i] - 12), y = i % 2 ? p.gy + 12 : p.y - KH[i] - 8;
          for (const b of boxes) if (x < b.x + b.w + 6 && b.x < x + KW[i] + 6 && y < b.y + b.h + 4 && b.y < y + KH[i] + 4) y = i % 2 ? b.y + b.h + 6 : b.y - KH[i] - 6;
          boxes.push({ x, y, w: KW[i], h: KH[i] });
          const ly = lift(.36 + .03 * i), u = liftU(.36 + .03 * i);
          el.style.transform = `translate(${(x + (W / 2 - x - KW[i] / 2) * .05 * u * u).toFixed(1)}px,${(y - ly).toFixed(1)}px) rotate(${((i % 2 ? 1 : -1) * 4 * u).toFixed(2)}deg)`;
        });
        // branding and controls are lifted too, each on its own beat
        const tf = (el, d, base) => { const y = lift(d); el.style.transform = y ? `${base || ''} translate3d(0,${(-y).toFixed(1)}px,0)` : (base || ''); };
        tf(barEl, .02); tf(endEl, .12); tf(routeEl, .42, 'translateX(-50%)'); tf(noteEl, .44);
      }

      let lastA = -2;
      const lastDone = t => { let d = -1; for (let i = 0; i < 5; i++) if (t >= DWE[i]) d = i; return d; };
      function draw(t) {
        if (!W) return;
        camera(t); const dl = day(t);
        g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
        { const lifted = liftAt(W / 2, 0, 0, 0); sky(t, dl); if (lifted) g.restore(); }
        ranges(t, dl); ground(t, dl); road(t, dl);
        const items = [];
        for (const pr of PROPS) { const zr = pr.z - cam.z; if (zr < 2) continue; const sx = W / 2 + (pr.x - cam.x) * F / zr; if (sx < -120 || sx > W + 120) continue; items.push({ z: pr.z, f: () => drawProp(pr, t, dl) }); }
        const posts = [];
        for (let i = 0; i < 5; i++) items.push({ z: postZ(i), f: () => { posts[i] = drawPost(i, t); } });
        items.push({ z: roadZ(DEST) + RW * .5 + 30, f: () => destination(t, dl) });
        items.push({ z: roadZ(carU(t)) - RW * .2, f: () => drawCar(t, dl) });
        items.sort((p, q) => q.z - p.z); for (const it of items) it.f();
        const nb = rgb(mix([210, 222, 255], [30, 34, 80], dl)), sz = Math.max(5, Math.min(W, H) * .012);
        { const u = ((t + 4) % 13) / 13; if (u < .55 && LT < 0) { const k = u / .55, x = lerp(W * 1.1, -W * .1, k), y = H * (.3 + .06 * Math.sin(k * 5)); bird(x, y, sz, t * 7, .75 * sm(k / .1) * sm((1 - k) / .1), nb); bird(x + sz * 5, y + sz * 2, sz * .85, t * 7 + 1.3, .7 * sm(k / .1) * sm((1 - k) / .1), nb); } }
        // the current step's scene floats beside its post, below the sign
        const a = active(t); SCENEBOX = null;
        if (!measured) measure();
        if (a >= 0 && posts[a] && H >= 520 && !NARROW && LT < 0) {   // phones: the sign carries the step on its own
          const i = a, p = posts[i], vis = sm((t - AT[i] + .1) / .5) * (1 - sm((t - (DWE[i] - .5)) / .4));
          if (vis > .01) {
            const k = clamp(p.s / 8, .85, 1.2), sb = signBox(i, p), hw = 64 * k, hh = 48 * k;
            // beside the sign, above the road: right of it when there is room, otherwise left
            let cx = sb.x + sb.w + 26 + hw; if (cx + hw > W - 12) cx = sb.x - 26 - hw;
            let cy = clamp(sb.y + sb.h * .55, 90 + hh, H - 70 - hh);
            cx = clamp(cx, hw + 10, W - hw - 10);
            const box = { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 }, c = carRect();
            const clash = (A, B) => A && B && A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h;
            if (!clash(box, sb) && !clash(box, c)) { scene(i, t, vis, cx, cy, k); SCENEBOX = box; }
          }
        }
        grass(t, dl);
        const vgA = (.55 - .35 * dl) * (LT < 0 ? 1 : 1 - clamp(LT / .5));
        if (vgA > 0) { const vg = g.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .3, W / 2, H * .55, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(5,4,30,0)'); vg.addColorStop(1, `rgba(5,4,30,${vgA})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
        const fin = sm(t / .8); if (fin < 1 && LT < 0) { g.fillStyle = `rgba(10,9,48,${1 - fin})`; g.fillRect(0, 0, W, H); }
        beam();
        place(t, posts);
        openEl.classList.toggle('on', t > .3 && t < AT[0] - .35 && LT < 0);
        endEl.classList.toggle('on', t >= CRANE + 1.5);
        const done = lastDone(t);
        fillEl.style.width = (80 * (t >= CRANE ? 1 : Math.max(0, Math.max(a, done) / 4))) + '%';
        dots.forEach((d, i) => { d.className = t >= CRANE || i <= done && i !== a ? 'done' : i === a ? 'now' : i < a ? 'done' : ''; });
        if (a !== lastA && a >= 0) { lastA = a; sr.textContent = `Step ${a + 1} of 5: ${STEPS[a].h}. Your challenge: ${STEPS[a].c} How Facilio helps: ${STEPS[a].f}`; }
        if (t >= CRANE && lastA !== 9) { lastA = 9; sr.textContent = 'The journey is complete.'; }
      }

      /* playback, then the lift-off that uncovers the page underneath */
      let raf = 0, start = 0, playing = false, leaving = false, held = 0;
      function loop(now) {
        if (!playing) return; if (!start) start = now - T * 1000;
        T = Math.min(END, (now - start) / 1000); draw(T);
        if (T >= END) { playing = false; if (opts.auto !== false) leave('end'); return; }
        raf = root.requestAnimationFrame(loop);
      }
      function finish(how) { if (!o.isConnected) return; o.remove(); doc.removeEventListener('keydown', key); root.removeEventListener('resize', resize); doc.removeEventListener('visibilitychange', vis); resolve({ how }); }
      function leave(how) {
        if (leaving) return; leaving = true; playing = false; root.cancelAnimationFrame(raf);
        o.querySelectorAll('button').forEach(b => { b.disabled = true; });
        if (reduce) { o.addEventListener('transitionend', e => { if (e.target === o) finish(how); }); setTimeout(() => finish(how), 600); root.requestAnimationFrame(() => o.classList.add('fade')); return; }
        if (how === 'skip') T = Math.max(T, CRANE + 1.8);   // skipping lands on the finished view first, so the lift-off reads as one movement
        o.classList.add('lifting');   // the layer's own background goes; from here only what is drawn covers the page beneath
        let t0 = 0;
        const step = now => {
          if (!t0) t0 = now; LT = (now - t0) / 1000;
          draw(T);
          if (LT >= LEND) { finish(how); return; }
          root.requestAnimationFrame(step);
        };
        root.requestAnimationFrame(step);
      }
      const key = e => { if (e.key === 'Escape' && !leaving) leave('skip'); };
      const vis = () => { if (doc.hidden) { if (playing) { playing = false; root.cancelAnimationFrame(raf); held = 1; } } else if (held && !leaving) { held = 0; playing = true; start = 0; raf = root.requestAnimationFrame(loop); } };
      o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) leave(b.getAttribute('data-r')); });
      o.addEventListener('wheel', e => e.preventDefault(), { passive: false }); o.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
      doc.addEventListener('keydown', key); root.addEventListener('resize', resize); doc.addEventListener('visibilitychange', vis);
      doc.body.appendChild(o); resize();
      root.__ri = { frame: t => { playing = false; root.cancelAnimationFrame(raf); T = t; draw(t); }, liftAt: (t, lt) => { playing = false; root.cancelAnimationFrame(raf); T = t; LT = lt; o.classList.toggle('lifting', lt >= 0); draw(t); }, AT, DWE, END, CRANE, LEND,
        sceneBox: () => SCENEBOX, capBox: () => CAPBOX, carBox: () => carRect(), leave };
      try { skipBtn.focus({ preventScroll: true }); } catch (e) { }
      if (reduce) { T = END; draw(END); CHIPS.forEach(c => c.classList.remove('on')); $('.ri-still').hidden = false; skipBtn.hidden = true; try { $('[data-r="end"]').focus({ preventScroll: true }); } catch (e) { } return; }
      playing = true; raf = root.requestAnimationFrame(loop);
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
