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

  // the real Delivery Studio screens of one film (1280x720 images in public/films/<id>/, taken by tools/film-capture.mjs); a key with a dot is a path
  // under public/films/ (another film's screen, e.g. 'contract-intake/docs.jpg'), so films share screens instead of shipping them twice
  function screens(id, files, ext) {
    const IMG = {}, path = k => k.includes('.') ? k : id + '/' + k + '.' + (ext || 'jpg');
    const load = (base, srcs) => Promise.all(files.map(k => new Promise(res => { if (IMG[k] || typeof Image === 'undefined') return res(); const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => res(); i.src = (srcs && srcs[k]) || (base || '') + path(k); })));
    // a real screen filling the frame, like a screen recording; the camera [cx, cy, w] looks at a point of the screen with a crop w px wide (1280 = all of
    // it); a = opacity (for a cross-fade); returns a mapper from screen pixels to the canvas
    function full(g, key, cam, a) { const w = clamp(cam ? cam[2] : W, 320, W), h = w * H / W, sx = clamp((cam ? cam[0] : W / 2) - w / 2, 0, W - w), sy = clamp((cam ? cam[1] : H / 2) - h / 2, 0, H - h);
      if (a == null || a > 0) fade(g, a == null ? 1 : a, () => { if (IMG[key]) g.drawImage(IMG[key], sx, sy, w, h, 0, 0, W, H); else { g.fillStyle = '#F1F5F9'; g.fillRect(0, 0, W, H); } });
      return (px, py) => [(px - sx) * W / w, (py - sy) * H / h]; }
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
    return { load, shot, walk, full, path, files, IMG };
  }
  // keyframes [[t, v1, v2, ...]] eased between, held before the first and after the last: a camera or a mouse path
  function track(keys, t) { let i = keys.findIndex(k => k[0] > t); if (i === -1) return keys[keys.length - 1].slice(1); if (i === 0) return keys[0].slice(1);
    const a = keys[i - 1], b = keys[i], p = ease((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], p)); }
  // what this click does, in a few words, beside the mouse: a navy pill that keeps inside the frame
  function label(g, x, y, s, sub, a) { fade(g, a == null ? 1 : a, () => { g.font = `600 17px ${FONT}`; const w1 = g.measureText(s).width; g.font = `400 14px ${FONT}`; const w = Math.max(w1, sub ? g.measureText(sub).width : 0) + 32, h = sub ? 62 : 40;
    const bx = clamp(x + 26 + w > W - 16 ? x - w - 18 : x + 26, 16, W - w - 16), by = clamp(y + 18, 16, H - h - 16);
    g.save(); g.shadowColor = 'rgba(15,23,42,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 4; rr(g, bx, by, w, h, 12, C.navy); g.restore();
    tx(g, s, bx + 16, by + 26, 17, '#fff', 600); if (sub) tx(g, sub, bx + 16, by + 48, 14, 'rgba(255,255,255,.82)', 400); }); }
  // a ring that grows and fades where the mouse clicked (p 0..1)
  function pulse(g, x, y, p, col) { if (p <= 0 || p >= 1) return; fade(g, 1 - p, () => { g.beginPath(); g.arc(x, y, 10 + p * 34, 0, Math.PI * 2); g.strokeStyle = col || C.blue; g.lineWidth = 4; g.stroke(); }); }
  // a chapter opener: the part of the Studio, its number and name on the Facilio gradient
  function card(g, part, title, sub, a) { fade(g, a == null ? 1 : a, () => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#201C5B'); gr.addColorStop(0.45, '#262073'); gr.addColorStop(0.8, '#1A4FC4'); gr.addColorStop(1, '#1570EF'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    tx(g, 'facilio', 96, 112, 30, '#fff', 700); g.beginPath(); g.arc(198, 90, 5, 0, Math.PI * 2); g.fillStyle = C.pink; g.fill();
    tx(g, part.toUpperCase(), 96, 330, 16, 'rgba(255,255,255,.7)', 600); tx(g, title, 96, 392, 52, '#fff', 700); if (sub) wrap(g, sub, 96, 440, 900, 22, 'rgba(255,255,255,.86)', 400, 32); }); }

  // the frame around every scene: the Facilio mark and where you are on top, the caption band at the bottom
  function chrome(g, t, s, f) {
    tx(g, 'facilio', 40, 46, 24, C.navy, 700); g.beginPath(); g.arc(122, 28, 4, 0, Math.PI * 2); g.fillStyle = C.pink; g.fill(); tx(g, 'Delivery Studio · ' + f.label, 136, 45, 14, C.text, 500);
    const n = f.SCENES.length, step = Math.min(74, 380 / Math.max(1, n - 1)), x0 = W - 76 - (n - 1) * step;
    f.SCENES.forEach((x, i) => { const on = x === s, done = t >= x.t1; const cx = x0 + i * step; if (i < n - 1) { g.fillStyle = done ? '#93C5FD' : C.line; g.fillRect(cx + 8, 39, step - 16, 2); } g.beginPath(); g.arc(cx, 40, on ? 7 : 5, 0, Math.PI * 2); g.fillStyle = on ? C.blue : done ? '#93C5FD' : C.line; g.fill(); });
    const cap = f.CAPTIONS.filter(c => t >= c[0] && t < c[1]).pop(); if (!cap) return;
    g.font = `500 21px ${FONT}`; const two = g.measureText(cap[2]).width > W - 336;   // a long caption gets a taller band, two lines
    g.globalAlpha = win(t, cap[0], cap[1], 0.35); rr(g, 140, H - (two ? 120 : 96), W - 280, two ? 88 : 64, 14, 'rgba(15,23,42,.88)'); wrap(g, cap[2], 168, H - (two ? 83 : 57), W - 336, 21, '#fff', 500, 26); g.globalAlpha = 1;
  }
  // f: { id, title, label, DUR, SCENES: [{ name, t0, t1 }], CAPTIONS: [[t0, t1, text]], scenes: [fn(g, lt)] one per scene, load, FILES, path, bare }
  // bare: a screen-recording film draws its own frame (no Facilio mark, chapter dots or caption band over the Studio's own screen)
  function register(f) {
    f.W = W; f.H = H; f.CAPTIONS = f.CAPTIONS || [];
    f.draw = (g, t) => { t = clamp(t, 0, f.DUR); g.save(); g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      const i = Math.max(0, f.SCENES.findIndex(x => t >= x.t0 && t < x.t1)), s = t >= f.DUR ? f.SCENES[f.SCENES.length - 1] : f.SCENES[i];
      g.globalAlpha = f.bare ? 1 : win(t, s.t0, s.t1 === f.DUR ? f.DUR + 1 : s.t1, 0.45); f.scenes[f.SCENES.indexOf(s)](g, t - s.t0);
      g.globalAlpha = 1; if (!f.bare) chrome(g, t, s, f); g.restore(); };
    (root.FWBFilms = root.FWBFilms || {})[f.id] = f; return f;
  }
  // a part of a film as a film of its own (one tab's clip of the Team Guide film): same code and screens, seconds t0..t1 of the master
  function slice(m, id, title, t0, t1, sub) { const DUR = +(t1 - t0).toFixed(2);
    return ((root.FWBFilms = root.FWBFilms || {})[id] = { id, title, sub: sub || '', W, H, DUR, SCENES: [{ name: title, t0: 0, t1: DUR }], FILES: m.FILES, load: m.load, path: m.path, file: m.file || m.id, master: m.id, from: t0,
      draw: (g, t) => m.draw(g, t0 + clamp(t, 0, DUR - 0.001)) }); }
  // a film made like a screen recording (user, 26 Nov 2026: "go through the exact location, show mouse animation there, show where they have to click and
  // what it does"): the real Studio screen fills the frame, the mouse moves to the exact spot and clicks, and the screen the click opens fades in. Beats:
  //   { card: [part, title, sub], d }  a chapter opener on the Facilio gradient (the film's chapters)
  //   { scr, d, clicks: [{ at: [x, y, w, h], t, then, say: [title, sub], cam: [cx, cy, w], type: [text, [x, y, w, h]], look }], clip, name }  a real screen; each
  //       click lands on the centre of `at` (screen pixels) at second t, `then` is the screen it opens, `say` the few words beside the mouse
  //   { draw(g, lt, k), d, clip, name }  a drawn scene (what has no Studio screen, e.g. a Teams message)
  // o: { id, title, sc (from screens()), beats, FILES }. Registers the film and, for every beat with a clip id, that beat as a film of its own.
  function recording(o) {
    const sc = o.sc, list = []; let t = 0, at = [900, 520];
    for (const b of o.beats) { const x = Object.assign({ t0: t, from: at }, b); x.t1 = t + b.d; t = x.t1; (b.clicks || []).forEach(c => { at = [c.at[0] + c.at[2] / 2, c.at[1] + c.at[3] / 2]; }); list.push(x); }
    const DUR = +t.toFixed(2);
    function beat(g, b, lt) {
      if (b.card) { card(g, b.card[0], b.card[1], b.card[2]); return; }
      if (b.draw) { b.draw(g, lt); return; }
      const cs = b.clicks || [], ctr = c => [c.at[0] + c.at[2] / 2, c.at[1] + c.at[3] / 2];
      // the camera: all of the screen until the first click lands, then a closer look where the click led
      const ck = [[0, 640, 360, W]]; cs.forEach(c => { const p = ctr(c), cam = c.cam || (c.then ? [900, 380, 1040] : [p[0], p[1], 1020]); ck.push([c.t + 0.35, ck[ck.length - 1][1], ck[ck.length - 1][2], ck[ck.length - 1][3]], [c.t + 1.3, cam[0], cam[1], cam[2]]); });
      const cam = track(ck, lt);
      // the screen: what the last click opened, faded in over a third of a second
      let key = b.scr, prev = null, fa = 1; cs.forEach(c => { if (c.then && lt >= c.t + 0.1) { prev = key; key = c.then; fa = clamp((lt - c.t - 0.1) / 0.35); } });
      if (prev && fa < 1) sc.full(g, prev, cam); const map = sc.full(g, key, cam, prev ? fa : 1);
      cs.forEach(c => { if (c.type && lt > c.t + 0.4) { const [s, bx] = c.type, [x0, y0] = map(bx[0], bx[1]), [x1, y1] = map(bx[0] + bx[2], bx[1] + bx[3]), n = Math.round(s.length * fin(lt, c.t + 0.4, 1.4));
        rr(g, x0, y0, x1 - x0, y1 - y0, 6, '#fff'); tx(g, s.slice(0, n), x0 + 12, y0 + (y1 - y0) * 0.66, Math.round((y1 - y0) * 0.42), C.ink, 500); } });
      // the mouse: from where it was to each click, pressed for half a second
      const mk = [[0, b.from[0], b.from[1]]]; cs.forEach(c => { const p = ctr(c); mk.push([Math.max(mk[mk.length - 1][0] + 0.2, c.t - 0.95), mk[mk.length - 1][1], mk[mk.length - 1][2]], [c.t - 0.05, p[0], p[1]]); });
      const [mx, my] = map(...track(mk, lt)), down = cs.find(c => !c.look && lt >= c.t && lt < c.t + 0.5);   // look: the mouse only moves there, no click
      cs.forEach(c => { if (!c.look && lt >= c.t && lt < c.t + 0.7) { const [px, py] = map(...ctr(c)); pulse(g, px, py, (lt - c.t) / 0.7); } });
      cursor(g, mx, my, down ? (lt - down.t) / 0.5 : 0);
      const say = cs.filter(c => c.say && lt >= c.t + 0.45).pop(); if (say) { const nx = cs[cs.indexOf(say) + 1]; label(g, mx, my, say.say[0], say.say[1], Math.min(fin(lt, say.t + 0.45, 0.35), nx ? 1 - fin(lt, nx.t - 0.6, 0.3) : 1 - fin(lt, b.d - 0.35, 0.3))); }
    }
    const f = { id: o.id, title: o.title, W, H, DUR, FILES: o.FILES, load: sc.load, path: sc.path, bare: true,
      SCENES: list.filter(b => b.card || b.name).map((b, i, a) => ({ name: b.card ? b.card[1] : b.name, t0: b.t0, t1: a[i + 1] ? a[i + 1].t0 : DUR })),
      draw(g, tt) { tt = clamp(tt, 0, DUR); g.save(); g.fillStyle = C.bg; g.fillRect(0, 0, W, H); const b = list.find(x => tt >= x.t0 && tt < x.t1) || list[list.length - 1];
        beat(g, b, tt - b.t0); const lt = tt - b.t0; if (lt < 0.25 && b !== list[0] && (b.card || list[list.indexOf(b) - 1].card)) fade(g, 1 - lt / 0.25, () => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }); g.restore(); } };
    (root.FWBFilms = root.FWBFilms || {})[f.id] = f;
    // a clip runs from its beat to the next clip or chapter card, so one tab's clip can hold several beats
    f.CLIPS = list.map((b, i) => { if (!b.clip) return null; const end = list.slice(i + 1).find(x => x.clip || x.card);
      const say = (b.clicks || []).find(c => c.say);   // the clip's one line: what its first words say
      slice(f, b.clip, b.clipTitle || (say ? say.say[0] : b.name || b.clip), b.t0, end ? end.t0 : DUR, b.clipSub || (say && say.say[1]) || ''); return b.clip; }).filter(Boolean);
    return f;
  }
  root.FWBFilmKit = { W, H, C, FONT, clamp, ease, fin, win, lerp, rr, tx, wrap, tick, windowBox, cursor, avatar, ring, fade, callout, title, track, label, pulse, card, screens, register, slice, recording };
})(typeof window !== 'undefined' ? window : globalThis);
