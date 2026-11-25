/* Film kit (25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md): what every Delivery Studio guide film shares. A film is written as code:
   draw(g, t) paints second t on a 1280x720 canvas as a pure function of t, so the Studio's player (src/filmplayer.js) and VideoHub's live preview show the
   same frames. The kit gives the house colours, easing, drawing helpers, the real Studio screens (shot, ring, zoom) and the frame around every scene
   (the Facilio mark, the chapter dots and the caption band). A film calls FWBFilmKit.screens(id, files) for its screens, then FWBFilmKit.register({...}). */
(function (root) {
  'use strict';
  const W = 1280, H = 720;
  const C = { bg: '#F8FAFC', page: '#FFFFFF', ink: '#0F172A', text: '#475569', muted: '#94A3B8', line: '#E2E8F0', blue: '#1570EF', soft: '#EFF5FF', navy: '#1D1A5E', pink: '#E5197F', ok: '#16A34A', okSoft: '#ECFDF3', bad: '#DC2626', badSoft: '#FEF2F2', amber: '#D97706', amberSoft: '#FFF7E6', violet: '#6D4AFF' };
  const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const fin = (t, t0, d = 0.6) => ease((t - t0) / d);                                   // 0 -> 1 from t0 over d seconds
  const win = (t, t0, t1, d = 0.5) => Math.min(fin(t, t0, d), 1 - fin(t, t1 - d, d));   // in at t0, out by t1
  const lerp = (a, b, p) => a + (b - a) * p;

  function rr(g, x, y, w, h, r, fill, stroke) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } }
  function tx(g, s, x, y, size, color, weight, align) { g.font = `${weight || 400} ${size}px ${FONT}`; g.fillStyle = color || C.ink; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function wrap(g, s, x, y, w, size, color, weight, lh) { g.font = `${weight || 400} ${size}px ${FONT}`; let line = '', yy = y; for (const wd of String(s).split(' ')) { const test = line ? line + ' ' + wd : wd; if (g.measureText(test).width > w && line) { tx(g, line, x, yy, size, color, weight); line = wd; yy += lh || size * 1.4; } else line = test; } if (line) tx(g, line, x, yy, size, color, weight); return yy; }
  function tick(g, x, y, r, p, col) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col || C.ok; g.fill(); if (p <= 0) return; g.strokeStyle = '#fff'; g.lineWidth = r / 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * 0.45, y); const p1 = clamp(p * 2); g.lineTo(x - r * 0.45 + r * 0.3 * p1, y + r * 0.35 * p1); if (p > 0.5) { const p2 = clamp(p * 2 - 1); g.lineTo(x - r * 0.15 + r * 0.6 * p2, y + r * 0.35 - r * 0.75 * p2); } g.stroke(); }
  function windowBox(g, x, y, w, h, title) { rr(g, x + 3, y + 6, w, h, 14, 'rgba(15,23,42,.06)'); rr(g, x, y, w, h, 14, C.page, C.line); rr(g, x, y, w, 38, 14, '#F1F5F9'); g.fillStyle = '#F1F5F9'; g.fillRect(x, y + 24, w, 14); ['#F87171', '#FBBF24', '#34D399'].forEach((c, i) => { g.beginPath(); g.arc(x + 20 + i * 16, y + 19, 5, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }); tx(g, title, x + w / 2, y + 24, 13, C.text, 500, 'center'); }
  function cursor(g, x, y, press) { g.save(); g.translate(x, y); g.fillStyle = C.ink; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 20); g.lineTo(5, 15); g.lineTo(9, 24); g.lineTo(12, 22); g.lineTo(8, 14); g.lineTo(15, 14); g.closePath(); g.fill(); g.stroke(); if (press > 0 && press < 1) { g.globalAlpha *= 1 - press; g.beginPath(); g.arc(2, 2, 8 + press * 22, 0, Math.PI * 2); g.strokeStyle = C.blue; g.lineWidth = 3; g.stroke(); } g.restore(); }
  const avatar = (g, x, y, letter, col, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); tx(g, letter, x, y + r * 0.4, r * 1.1, '#fff', 700, 'center'); };
  // a pulsing ring around r (screen pixels, mapped by a shot); returns its centre on the canvas, for the cursor
  function ring(g, map, r, lt, col) { const [x0, y0] = map(r[0], r[1]), [x1, y1] = map(r[0] + r[2], r[1] + r[3]); const k = 4 + 3 * (Math.sin(lt * 4) + 1) / 2; g.save(); g.lineWidth = 4; g.strokeStyle = col || C.amber; rr(g, x0 - k, y0 - k, x1 - x0 + 2 * k, y1 - y0 + 2 * k, 12, null, null); g.stroke(); g.restore(); return [(x0 + x1) / 2, (y0 + y1) / 2]; }
  // draw fn at opacity a (0..1) on top of whatever opacity the scene already has
  function fade(g, a, fn) { if (a <= 0) return; const a0 = g.globalAlpha; g.globalAlpha = a0 * clamp(a); fn(); g.globalAlpha = a0; }
  // a short label in a navy pill (why this matters), its tip at (x, y)
  function callout(g, x, y, s, a) { fade(g, a == null ? 1 : a, () => { g.font = `600 15px ${FONT}`; const w = g.measureText(s).width + 28; rr(g, x, y - 40, w, 34, 10, C.navy); g.beginPath(); g.moveTo(x + 14, y - 7); g.lineTo(x + 26, y - 7); g.lineTo(x + 14, y + 4); g.closePath(); g.fillStyle = C.navy; g.fill(); tx(g, s, x + 14, y - 18, 15, '#fff', 600); }); }
  // the scene title, top left
  function title(g, s, sub) { tx(g, s, 120, 132, 34, C.ink, 700); if (sub) tx(g, sub, 120, 162, 18, C.text); }

  // the real Delivery Studio screens of one film (1280x720 JPEGs in public/films/<id>/, taken by tools/film-capture.mjs)
  function screens(id, files) {
    const IMG = {};
    const load = (base, srcs) => Promise.all(files.map(k => new Promise(res => { if (IMG[k] || typeof Image === 'undefined') return res(); const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => res(); i.src = (srcs && srcs[k]) || (base || '') + id + '/' + k + '.jpg'; })));
    // a real screen in a window frame; z (0..1) zooms toward focus [x, y, w, h]; returns a mapper from screen pixels to the canvas
    function shot(g, key, x, y, w, ttl, focus, z) { const ch = Math.round(w * 9 / 16), h = ch + 38; windowBox(g, x, y, w, h, ttl); const cx = x, cy = y + 38;
      let sx = 0, sy = 0, sw = 1280, sh = 720; if (focus && z > 0) { const tw = Math.min(1280, Math.max(focus[2] * 2.2 <= 1280 ? focus[2] * 2.2 : focus[2] * 1.15, focus[3] * 2.05, 480)); sw = lerp(1280, tw, z); sh = sw * 9 / 16; sx = clamp(focus[0] + focus[2] / 2 - sw / 2, 0, 1280 - sw); sy = clamp(focus[1] + focus[3] / 2 - sh / 2, 0, 720 - sh); }
      g.save(); g.beginPath(); g.rect(cx, cy, w, ch); g.clip(); if (IMG[key]) g.drawImage(IMG[key], sx, sy, sw, sh, cx, cy, w, ch); else { g.fillStyle = '#F1F5F9'; g.fillRect(cx, cy, w, ch); } g.restore();
      return (px, py) => [cx + (px - sx) / sw * w, cy + (py - sy) / sh * ch]; }
    // one screen that zooms to each step's box in turn and rings it: steps [[t0, t1, box, zoom 0..1, ring colour]], frame [x, y, w];
    // returns { map, step, at } (at: the ring's centre, for the cursor)
    function walk(g, lt, key, ttl, frame, steps) {
      const s = steps.find(x => lt >= x[0] && lt < x[1]), z = s ? win(lt, s[0], s[1], 0.9) * (s[3] == null ? 0.6 : s[3]) : 0;
      const map = shot(g, key, frame[0], frame[1], frame[2], ttl, s && s[2], z);
      return { map, step: s, at: s && lt > s[0] + 0.7 && lt < s[1] - 0.5 ? ring(g, map, s[2], lt, s[4]) : null };
    }
    return { load, shot, walk, files, IMG };
  }

  // the frame around every scene: the Facilio mark and where you are on top, the caption band at the bottom
  function chrome(g, t, s, f) {
    tx(g, 'facilio', 40, 46, 24, C.navy, 700); g.beginPath(); g.arc(122, 28, 4, 0, Math.PI * 2); g.fillStyle = C.pink; g.fill(); tx(g, 'Delivery Studio · ' + f.label, 136, 45, 14, C.text, 500);
    const n = f.SCENES.length, step = Math.min(74, 380 / Math.max(1, n - 1)), x0 = W - 76 - (n - 1) * step;
    f.SCENES.forEach((x, i) => { const on = x === s, done = t >= x.t1; const cx = x0 + i * step; if (i < n - 1) { g.fillStyle = done ? '#93C5FD' : C.line; g.fillRect(cx + 8, 39, step - 16, 2); } g.beginPath(); g.arc(cx, 40, on ? 7 : 5, 0, Math.PI * 2); g.fillStyle = on ? C.blue : done ? '#93C5FD' : C.line; g.fill(); });
    const cap = f.CAPTIONS.filter(c => t >= c[0] && t < c[1]).pop(); if (!cap) return;
    g.font = `500 21px ${FONT}`; const two = g.measureText(cap[2]).width > W - 336;   // a long caption gets a taller band, two lines
    g.globalAlpha = win(t, cap[0], cap[1], 0.35); rr(g, 140, H - (two ? 120 : 96), W - 280, two ? 88 : 64, 14, 'rgba(15,23,42,.88)'); wrap(g, cap[2], 168, H - (two ? 83 : 57), W - 336, 21, '#fff', 500, 26); g.globalAlpha = 1;
  }
  // f: { id, title, label, DUR, SCENES: [{ name, t0, t1 }], CAPTIONS: [[t0, t1, text]], scenes: [fn(g, lt)] one per scene, load, FILES }
  function register(f) {
    f.W = W; f.H = H;
    f.draw = (g, t) => { t = clamp(t, 0, f.DUR); g.save(); g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      const i = Math.max(0, f.SCENES.findIndex(x => t >= x.t0 && t < x.t1)), s = t >= f.DUR ? f.SCENES[f.SCENES.length - 1] : f.SCENES[i];
      g.globalAlpha = win(t, s.t0, s.t1 === f.DUR ? f.DUR + 1 : s.t1, 0.45); f.scenes[f.SCENES.indexOf(s)](g, t - s.t0);
      g.globalAlpha = 1; chrome(g, t, s, f); g.restore(); };
    (root.FWBFilms = root.FWBFilms || {})[f.id] = f; return f;
  }
  root.FWBFilmKit = { W, H, C, FONT, clamp, ease, fin, win, lerp, rr, tx, wrap, tick, windowBox, cursor, avatar, ring, fade, callout, title, screens, register };
})(typeof window !== 'undefined' ? window : globalThis);
