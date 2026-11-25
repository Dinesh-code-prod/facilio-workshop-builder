/* Claude setup film (user, 25 Nov 2026; plan docs/plans/CLAUDE-SETUP-VIDEO-PLAN-2026-11-25.md). A film written as code: draw(g, t) paints second t on a
   1280x720 canvas as a pure function of t (no clock, no state between frames), so the Studio's player (src/filmplayer.js) and VideoHub's live preview
   (D:\VideoHub\films\claude-setup, which loads a copy of this file) show the same frames. Captions are drawn on the picture; there is no sound.
   Registers FWBFilms['claude-setup'] = { title, W, H, DUR, SCENES, draw }. Screens are simplified drawings in the house look, not screenshots. */
(function (root) {
  'use strict';
  const W = 1280, H = 720, DUR = 110;
  const SCENES = [{ name: 'What Claude does for you', t0: 0, t1: 20 }, { name: '1. Install four apps', t0: 20, t1: 40 }, { name: '2. Ask for access', t0: 40, t1: 50 },
    { name: '3. Paste the setup message', t0: 50, t1: 75 }, { name: '4. Your checklist', t0: 75, t1: 95 }, { name: 'You are set', t0: 95, t1: DUR }];
  const C = { bg: '#F8FAFC', page: '#FFFFFF', ink: '#0F172A', text: '#475569', muted: '#94A3B8', line: '#E2E8F0', blue: '#1570EF', soft: '#EFF5FF', navy: '#1D1A5E', ok: '#16A34A', okSoft: '#ECFDF3', bad: '#DC2626', amber: '#D97706', violet: '#6D4AFF' };
  const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const fin = (t, t0, d = 0.6) => ease((t - t0) / d);                                   // 0 -> 1 from t0 over d seconds
  const win = (t, t0, t1, d = 0.5) => Math.min(fin(t, t0, d), 1 - fin(t, t1 - d, d));   // in at t0, out by t1
  const lerp = (a, b, p) => a + (b - a) * p;
  // the real Delivery Studio screens (1280x720 JPEGs next to this file) and where on them the film points (captured by the screens' own layout)
  const IMG = {}, FILES = ['home', 'setup', 'install'], POS = {"copy":[999,331,216,40],"python":[362,250,407,118],"access":[796,80,437,138]};
  function load(base, srcs) { return Promise.all(FILES.map(k => new Promise(res => { if (IMG[k] || typeof Image === 'undefined') return res(); const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => res(); i.src = (srcs && srcs[k]) || (base || '') + 'claude-setup/' + k + '.jpg'; }))); }
  // a real screen in a window frame; z (0..1) zooms toward focus; returns a mapper from screen pixels to the canvas
  function shot(g, key, x, y, w, title, focus, z) { const ch = Math.round(w * 9 / 16), h = ch + 38; windowBox(g, x, y, w, h, title); const cx = x, cy = y + 38;
    let sx = 0, sy = 0, sw = 1280, sh = 720; if (focus && z > 0) { sw = lerp(1280, Math.max(focus[2] * 2.2, 480), z); sh = sw * 9 / 16; sx = clamp(focus[0] + focus[2] / 2 - sw / 2, 0, 1280 - sw); sy = clamp(focus[1] + focus[3] / 2 - sh / 2, 0, 720 - sh); }
    g.save(); g.beginPath(); g.rect(cx, cy, w, ch); g.clip(); if (IMG[key]) g.drawImage(IMG[key], sx, sy, sw, sh, cx, cy, w, ch); else { g.fillStyle = '#F1F5F9'; g.fillRect(cx, cy, w, ch); } g.restore();
    return (px, py) => [cx + (px - sx) / sw * w, cy + (py - sy) / sh * ch]; }
  function ring(g, map, r, lt, col) { const [x0, y0] = map(r[0], r[1]), [x1, y1] = map(r[0] + r[2], r[1] + r[3]); const k = 4 + 3 * (Math.sin(lt * 4) + 1) / 2; g.save(); g.lineWidth = 4; g.strokeStyle = col || C.amber; rr(g, x0 - k, y0 - k, x1 - x0 + 2 * k, y1 - y0 + 2 * k, 12, null, null); g.stroke(); g.restore(); return [(x0 + x1) / 2, (y0 + y1) / 2]; }

  function draw(g, t) {
    t = clamp(t, 0, DUR);
    g.save(); g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    const i = Math.max(0, SCENES.findIndex(x => t >= x.t0 && t < x.t1)), s = t >= DUR ? SCENES[SCENES.length - 1] : SCENES[i];
    g.globalAlpha = win(t, s.t0, s.t1 === DUR ? DUR + 1 : s.t1, 0.45);
    [why, install, access, paste, checklist, done][SCENES.indexOf(s)](g, t - s.t0);
    g.globalAlpha = 1; chrome(g, t, s); g.restore();
  }

  // ---------- drawing helpers ----------
  function rr(g, x, y, w, h, r, fill, stroke) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } }
  function tx(g, s, x, y, size, color, weight, align) { g.font = `${weight || 400} ${size}px ${FONT}`; g.fillStyle = color || C.ink; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function wrap(g, s, x, y, w, size, color, weight, lh) { g.font = `${weight || 400} ${size}px ${FONT}`; let line = '', yy = y; for (const wd of String(s).split(' ')) { const test = line ? line + ' ' + wd : wd; if (g.measureText(test).width > w && line) { tx(g, line, x, yy, size, color, weight); line = wd; yy += lh || size * 1.4; } else line = test; } if (line) tx(g, line, x, yy, size, color, weight); return yy; }
  function tick(g, x, y, r, p, col) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col || C.ok; g.fill(); if (p <= 0) return; g.strokeStyle = '#fff'; g.lineWidth = r / 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * 0.45, y); const p1 = clamp(p * 2); g.lineTo(x - r * 0.45 + r * 0.3 * p1, y + r * 0.35 * p1); if (p > 0.5) { const p2 = clamp(p * 2 - 1); g.lineTo(x - r * 0.15 + r * 0.6 * p2, y + r * 0.35 - r * 0.75 * p2); } g.stroke(); }
  function windowBox(g, x, y, w, h, title) { rr(g, x + 3, y + 6, w, h, 14, 'rgba(15,23,42,.06)'); rr(g, x, y, w, h, 14, C.page, C.line); rr(g, x, y, w, 38, 14, '#F1F5F9'); g.fillStyle = '#F1F5F9'; g.fillRect(x, y + 24, w, 14); ['#F87171', '#FBBF24', '#34D399'].forEach((c, i) => { g.beginPath(); g.arc(x + 20 + i * 16, y + 19, 5, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }); tx(g, title, x + w / 2, y + 24, 13, C.text, 500, 'center'); }
  function cursor(g, x, y, press) { g.save(); g.translate(x, y); g.fillStyle = C.ink; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 20); g.lineTo(5, 15); g.lineTo(9, 24); g.lineTo(12, 22); g.lineTo(8, 14); g.lineTo(15, 14); g.closePath(); g.fill(); g.stroke(); if (press > 0 && press < 1) { g.globalAlpha *= 1 - press; g.beginPath(); g.arc(2, 2, 8 + press * 22, 0, Math.PI * 2); g.strokeStyle = C.blue; g.lineWidth = 3; g.stroke(); } g.restore(); }
  const avatar = (g, x, y, letter, col, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); tx(g, letter, x, y + r * 0.4, r * 1.1, '#fff', 700, 'center'); };

  // the frame around every scene: the steps on top, the caption band at the bottom
  // the narration, in the team's own words (user, 25 Nov 2026: "more in a Facilio kind of language, and more explanatory")
  const CAPTIONS = [
    [0.4, 5, 'Delivery Studio is where Facilio runs every implementation: contract, workshops, BRD, UAT and handover.'], [5, 10, 'Claude, your AI assistant, does the heavy reading and drafting on your projects.'],
    [10, 15, 'It reads workshop transcripts, drafts the BRD, finds customer mail and builds UAT guides and FTRs.'], [15, 19.8, 'Nothing reaches the customer on its own: every draft waits for you to review and approve.'],
    [20.3, 26, 'Step 1 of 4. Install four apps on your laptop, once. They let Claude work on your projects.'], [26, 32, 'Python runs the Facilio skills (FTR, UAT guides). In its installer, tick "Add python.exe to PATH".'],
    [32, 36, 'Node.js gives you instant answers in the Assistant. Git copies the Facilio skills to your laptop.'], [36, 39.8, 'On a Mac, one Terminal command brings Python and Git: xcode-select --install.'],
    [40.3, 45, 'Step 2 of 4. Ask your project lead for access.'], [45, 49.8, 'They add you to the project in Delivery Studio and give you read access to the Facilio skills on Bitbucket.'],
    [50.3, 57, 'Step 3 of 4. In Delivery Studio, open Claude setup and press "Copy the setup message".'], [57, 65, 'Open the Claude app, choose the Code tab, start a new chat and paste the message.'],
    [65, 74.8, 'Claude checks your laptop piece by piece, and always asks before it installs anything.'],
    [75.3, 82, 'Step 4 of 4. Back in Claude setup, your checklist fills in as Claude reports each piece.'], [82, 88, 'Anything missing shows in red with what to do, for example add the connector in Claude settings, Connectors.'],
    [88, 94.8, 'Fix it, paste the setup message again, and repeat until all nine pieces are ready.'],
    [95.3, 102, 'You are set. Ask the Assistant about your project and Claude answers in seconds.'], [102, 109.6, 'Every page has "Open in Claude". Stuck? See "If something does not work", or ask your project lead.']];
  function chrome(g, t, s) {
    tx(g, 'facilio', 40, 46, 24, C.navy, 700); g.beginPath(); g.arc(122, 28, 4, 0, Math.PI * 2); g.fillStyle = '#E5197F'; g.fill(); tx(g, 'Delivery Studio · Claude setup', 136, 45, 14, C.text, 500);
    SCENES.forEach((x, i) => { const on = x === s, done = t >= x.t1; const cx = 830 + i * 74; if (i < SCENES.length - 1) { g.fillStyle = done ? '#93C5FD' : C.line; g.fillRect(cx + 8, 39, 58, 2); } g.beginPath(); g.arc(cx, 40, on ? 7 : 5, 0, Math.PI * 2); g.fillStyle = on ? C.blue : done ? '#93C5FD' : C.line; g.fill(); });
    const cap = CAPTIONS.filter(c => t >= c[0] && t < c[1]).pop(); if (!cap) return;
    g.globalAlpha = win(t, cap[0], cap[1], 0.35); rr(g, 140, H - 96, W - 280, 64, 14, 'rgba(15,23,42,.88)'); wrap(g, cap[2], 168, H - 57, W - 336, 21, '#fff', 500, 26); g.globalAlpha = 1;
  }

  // ---------- scenes (lt = seconds into the scene) ----------
  function why(g, lt) {
    tx(g, 'Set up Claude for Delivery Studio', 120, 170, 44, C.ink, 700); tx(g, 'Once, on your own computer · about two minutes', 120, 210, 20, C.text);
    shot(g, 'home', 120, 240, 620, 'Delivery Studio · your project');
    const x = lerp(1180, 790, fin(lt, 2, 1.2));
    rr(g, x, 300, 400, 160, 16, C.page, C.line); avatar(g, x + 34, 336, 'C', C.violet, 16); tx(g, 'Claude', x + 60, 332, 15, C.ink, 600); tx(g, 'Draft ready: BRD section', x + 60, 354, 14, C.text);
    rr(g, x + 24, 384, 160, 38, 10, C.soft); tx(g, 'Waiting for you', x + 104, 408, 14, C.blue, 600, 'center');
    [['Reads workshop transcripts, drafts the BRD', 10], ['Finds customer mail and follow-ups', 11.2], ['Builds UAT guides and FTRs with the Facilio skills', 12.4]].forEach(([l, t0], i) => { const a1 = g.globalAlpha; g.globalAlpha = a1 * fin(lt, t0, 0.5); tick(g, 802, 490 + i * 30, 9, fin(lt, t0 + 0.2, 0.5), C.blue); tx(g, l, 820, 496 + i * 30, 15, C.ink, 500); g.globalAlpha = a1; });
    const q = fin(lt, 5.5, 0.6); if (q > 0) { const a = g.globalAlpha; g.globalAlpha = a * q; rr(g, x + 200, 384, 120, 38, 10, C.blue); tx(g, 'Approve', x + 260, 408, 14, '#fff', 600, 'center'); g.globalAlpha = a; tick(g, x + 366, 336, 13, fin(lt, 6.5, 0.6)); }
  }
  function install(g, lt) {
    tx(g, 'Step 1 · Install these four', 120, 150, 36, C.ink, 700);
    const mac = lt > 14.4; rr(g, 900, 118, 240, 40, 20, '#F1F5F9'); rr(g, mac ? 1020 : 904, 122, 116, 32, 16, C.page); tx(g, 'Windows', 962, 144, 15, mac ? C.muted : C.blue, 600, 'center'); tx(g, 'Mac', 1078, 144, 15, mac ? C.blue : C.muted, 600, 'center');
    { const m = shot(g, 'install', 120, 180, 680, 'Delivery Studio · Claude setup · Start here', POS.python, win(lt, 6, 14.2, 1)); if (lt > 6.5 && lt < 14) ring(g, m, POS.python, lt); }
    [['Claude app', 'sign in with your Facilio account'], ['Python 3', 'runs the Facilio skills'], ['Node.js (LTS)', 'gives instant answers'], ['Git', 'copies the Facilio skills']].forEach(([n, why2], i) => { const a1 = g.globalAlpha; g.globalAlpha = a1 * fin(lt, 0.6 + i * 1.2, 0.6); tick(g, 842, 222 + i * 50, 11, fin(lt, 1 + i * 1.2, 0.5)); tx(g, n, 864, 220 + i * 50, 17, C.ink, 600); tx(g, why2, 864, 240 + i * 50, 14, C.text); g.globalAlpha = a1; });
    const a0 = g.globalAlpha; let z = win(lt, 14.6, 20, 0.5); if (z > 0) { g.globalAlpha = a0 * z; windowBox(g, 820, 420, 360, 180, 'Terminal (Mac)'); rr(g, 836, 466, 328, 118, 8, C.ink); tx(g, '$ xcode-select --install', 852, 504, 17, '#E2E8F0', 500); tx(g, 'Python 3 and Git, in one step', 852, 538, 15, C.muted); }
    g.globalAlpha = a0;
  }
  function access(g, lt) {
    tx(g, 'Step 2 · Ask for access', 120, 150, 36, C.ink, 700);
    const person = (x, label, col) => { avatar(g, x, 310, label[0], col, 46); tx(g, label, x, 392, 18, C.ink, 600, 'center'); };
    person(300, 'Your lead', C.navy); person(980, 'You', C.blue);
    g.strokeStyle = C.blue; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(360, 310); g.lineTo(lerp(360, 920, fin(lt, 1, 1.4)), 310); g.stroke(); g.setLineDash([]);
    const a0 = g.globalAlpha;
    [['Added to the project in Delivery Studio', 3], ['Read access to facilio-impl-ai-skills', 5]].forEach(([l, t0], i) => { g.globalAlpha = a0 * fin(lt, t0, 0.5); rr(g, 420, 430 + i * 64, 440, 48, 12, C.okSoft); tick(g, 448, 454 + i * 64, 12, fin(lt, t0 + 0.3, 0.5)); tx(g, l, 470, 460 + i * 64, 17, C.ink, 500); });
    g.globalAlpha = a0;
  }
  function paste(g, lt) {
    tx(g, 'Step 3 · Paste the setup message', 120, 150, 36, C.ink, 700); const a0 = g.globalAlpha;
    if (lt < 7.2) { const m = shot(g, 'setup', 180, 170, 760, 'Delivery Studio · Claude setup', POS.copy, fin(lt, 0.3, 1.4) * 0.55); const [bx, by] = ring(g, m, POS.copy, lt, C.blue);
      const cp = fin(lt, 1, 2); cursor(g, lerp(560, bx, cp), lerp(560, by, cp), lt > 3.2 ? fin(lt, 3.2, 0.6) : 0);
      const ok = win(lt, 4, 7.2, 0.3); if (ok > 0) { g.globalAlpha = a0 * ok; rr(g, 900, 520, 230, 40, 10, C.ink); tx(g, 'Copied', 1015, 546, 15, '#fff', 600, 'center'); g.globalAlpha = a0; }
      return; }
    const l2 = lt - 7.2; windowBox(g, 120, 190, 1040, 380, 'Claude app');
    ['Chat', 'Cowork', 'Code'].forEach((l, i) => { const on = i === 2 && l2 > 1; if (on) rr(g, 520 + i * 90, 206, 80, 28, 14, C.ink); tx(g, l, 560 + i * 90, 225, 14, on ? '#fff' : C.text, 600, 'center'); });
    rr(g, 150, 250, 200, 290, 10, '#F8FAFC'); rr(g, 166, 266, 168, 34, 8, fin(l2, 2, 0.4) > 0.5 ? C.soft : C.page, C.line); tx(g, '+ New chat', 250, 289, 14, C.blue, 600, 'center');
    const msg = 'Set up my computer for Facilio Delivery Studio…'; const typed = fin(l2, 4, 2.5); rr(g, 380, 470, 760, 56, 12, C.page, C.line); if (typed > 0 && l2 < 7) tx(g, msg.slice(0, Math.round(msg.length * typed)), 400, 504, 16, C.ink);
    if (l2 > 7) { g.globalAlpha = a0 * fin(l2, 7, 0.6); rr(g, 380, 270, 700, 70, 12, C.soft); tx(g, msg + ' (2 pages)', 400, 311, 15, C.ink); g.globalAlpha = a0; }
    if (l2 > 9.5) { g.globalAlpha = a0 * fin(l2, 9.5, 0.6); avatar(g, 398, 382, 'C', C.violet, 14); wrap(g, 'I will check nine pieces on this computer. Node.js is missing: may I install it?', 424, 378, 640, 16, C.ink, 400, 22);
      rr(g, 424, 412, 90, 34, 10, C.blue); tx(g, 'Yes', 469, 434, 14, '#fff', 600, 'center'); rr(g, 524, 412, 90, 34, 10, C.page, C.line); tx(g, 'Not now', 569, 434, 14, C.ink, 600, 'center'); g.globalAlpha = a0; }
    if (l2 < 9.5) cursor(g, lerp(250, 700, fin(l2, 4, 2)), lerp(290, 498, fin(l2, 2.5, 1.5)), l2 > 2 && l2 < 2.6 ? fin(l2, 2, 0.6) : 0); else cursor(g, 470, 430, fin(l2, 13, 0.6));
  }
  function checklist(g, lt) {
    tx(g, 'Step 4 · Your checklist', 120, 150, 36, C.ink, 700);
    const P = ['Delivery Studio connector', 'Microsoft 365 connector', 'Facilio skills (toolbox)', 'Facilio skills copy', 'Instant answers (watcher)', 'Job queue (every 30 minutes)', 'Node.js', 'Git', 'Python'];
    const okAt = i => (i === 6 ? 15.5 : 1 + i * 1.1), missing = i => i === 6 && lt > 1 + 6 * 1.1 && lt < 15.5;
    const nOk = P.filter((_, i) => lt >= okAt(i)).length;
    rr(g, 120, 180, 1040, 56, 12, nOk === 9 ? C.okSoft : C.soft); tx(g, nOk === 9 ? 'All nine pieces ready' : nOk + ' of 9 pieces ready', 144, 215, 20, C.ink, 600);
    rr(g, 120, 250, 1040, 330, 12, C.page, C.line);
    P.forEach((l, i) => { const y = 284 + i * 33, ok = lt >= okAt(i), miss = missing(i);
      g.beginPath(); g.arc(150, y - 5, 6, 0, Math.PI * 2); g.fillStyle = ok ? C.ok : miss ? C.bad : C.line; g.fill();
      tx(g, ok ? 'Ready' : miss ? 'Missing' : 'Not checked', 166, y, 15, miss ? C.bad : C.text, 500); tx(g, l, 300, y, 16, C.ink, 600);
      if (miss) tx(g, 'Install Node.js (LTS), then paste the setup message again', 620, y, 15, C.bad, 500); });
  }
  function done(g, lt) {
    tx(g, 'You are set', 120, 150, 40, C.ink, 700); const a0 = g.globalAlpha;
    windowBox(g, 120, 190, 620, 340, 'Assistant'); rr(g, 340, 240, 380, 44, 14, C.soft); tx(g, 'What is waiting on the customer?', 360, 268, 15, C.ink, 500);
    g.globalAlpha = a0 * fin(lt, 1.5, 0.8); avatar(g, 160, 330, 'C', C.violet, 14); rr(g, 186, 306, 520, 100, 14, '#F8FAFC');
    wrap(g, 'Two items: the asset register (due Friday) and the BRD sign-off, requested on 20 Nov.', 204, 336, 480, 16, C.ink, 400, 24); tx(g, 'answered in 4 s', 204, 392, 13, C.muted);
    g.globalAlpha = a0 * fin(lt, 6, 0.6); rr(g, 800, 190, 340, 130, 16, C.page, C.line); tx(g, 'On every page', 824, 226, 15, C.text, 500); rr(g, 824, 248, 180, 40, 10, C.blue); tx(g, 'Open in Claude', 914, 274, 15, '#fff', 600, 'center');
    rr(g, 820, 244, 188, 48, 12, null, `rgba(21,112,239,${0.25 + 0.35 * (Math.sin(lt * 3) + 1) / 2})`);
    g.globalAlpha = a0 * fin(lt, 9, 0.6); rr(g, 800, 340, 340, 160, 16, C.page, C.line); tx(g, 'Stuck?', 824, 376, 18, C.ink, 600); wrap(g, 'Claude setup → "If something does not work", or ask your lead.', 824, 408, 290, 15, C.text, 400, 22);
    g.globalAlpha = a0;
  }

  const FILM = { id: 'claude-setup', title: 'Set up Claude for Delivery Studio', W, H, DUR, SCENES, draw, load, FILES };
  (root.FWBFilms = root.FWBFilms || {})[FILM.id] = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
