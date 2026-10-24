// Six AI "moment" animations, each with its own composition and motion language (not one template).
// Authored in code, Facilio palette, dark gradient stages. Run: node tools/make-motion.mjs -> public/brand/lottie/scene-ai-*.json
import fs from 'node:fs'; import path from 'node:path';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'brand', 'lottie');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const C = { navy: '#1D1A5E', blue: '#1570EF', pink: '#E5197F', teal: '#2EC9C4', sky: '#8DB8FF', white: '#FFFFFF', warm: '#FFD166' };
const EO = { i: { x: [0.18], y: [1] }, o: { x: [0.38], y: [0] } }, IO = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } }, IN = { i: { x: [0.7], y: [1] }, o: { x: [0.88], y: [0] } }, LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const S = v => ({ a: 0, k: v });
const kf = keys => { const ks = []; keys.forEach(k => { if (ks.length && ks[ks.length - 1][0] === k[0]) ks.pop(); ks.push(k); }); if (ks.length === 1) return S(Array.isArray(ks[0][1]) && ks[0][1].length === 1 ? ks[0][1][0] : ks[0][1]); return { a: 1, k: ks.map(([t, v, e], i) => { const k = { t, s: Array.isArray(v) ? v : [v] }; if (i < ks.length - 1) Object.assign(k, e || IO); return k; }) }; };
const paint = o => { const r = []; if (o.g) r.push(o.g); else if (o.fill) r.push({ ty: 'fl', c: S([...hex(o.fill), 1]), o: S(o.fo ?? 100), r: 1 }); if (o.stroke) r.push({ ty: 'st', c: S([...hex(o.stroke), 1]), o: S(o.so ?? 100), w: S(o.sw || 3), lc: 2, lj: 2 }); if (o.draw) r.push({ ty: 'tm', s: S(0), e: kf([[o.t, 0, LIN], [o.t + o.draw, o.to ?? 100]]), o: S(0), m: 1 }); return r; };
const rc = (w, h, r, o = {}) => [{ ty: 'rc', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), r: S(r), d: 1 }, ...paint(o)];
const el = (w, h, o = {}) => [{ ty: 'el', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), d: 1 }, ...paint(o)];
const poly = (pts, closed, o = {}) => [{ ty: 'sh', ks: S({ i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), v: pts, c: !!closed }) }, ...paint(o)];
const star = (R, o = {}) => poly([[0, -R], [R * .24, -R * .24], [R, 0], [R * .24, R * .24], [0, R], [-R * .24, R * .24], [-R, 0], [-R * .24, -R * .24]], true, o);
const gear = (R, o = {}) => { const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? R * .78 : R; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return poly(p, true, o); };
// gradients: linear (c1 -> c2) and radial glow (colour fading to transparent)
const lg = (c1, c2, x0, y0, x1, y1, o = 100) => ({ ty: 'gf', o: S(o), r: 1, t: 1, s: S([x0, y0]), e: S([x1, y1]), g: { p: 2, k: S([0, ...hex(c1), 1, ...hex(c2)]) } });
const glow = (c, R, o = 100) => ({ ty: 'gf', o: S(o), r: 1, t: 2, h: S(0), a: S(0), s: S([0, 0]), e: S([R, 0]), g: { p: 2, k: S([0, ...hex(c), 1, ...hex(c), 0, 1, 1, 0]) } });
const grp = items => ({ ty: 'gr', it: [...items, { ty: 'tr', p: S([0, 0]), a: S([0, 0]), s: S([100, 100]), r: S(0), o: S(100), sk: S(0), sa: S(0) }] });

function build(name, OP, fn) {
  const Ls = [];
  // L(shapes, x, y, t, opts): opts.k pop|up|down|left|right|grow|fade|none, d, r, r0, op, out, mv:[[frame,x,y,ease]], fl: idle float, keep: no fade out, sx/sy base scale
  const L = (shapes, x, y, t = 1, o = {}) => {
    const d = o.d || 16, out = o.out ?? OP - 14, k = o.k || 'pop', op = o.op ?? 100, sx = o.sx ?? 100, sy = o.sy ?? 100, r = o.r || 0, r0 = o.r0 ?? r;
    const off = { up: [0, 26], down: [0, -26], left: [-34, 0], right: [34, 0] }[k] || [0, 0];
    const oKeys = o.keep ? [[0, 100]] : [...(t > 0 ? [[0, 0, LIN]] : []), [t, 0, LIN], [t + 5, op, LIN], [out, op, LIN], [out + 10, 0]];
    let p = S([x, y, 0]);
    if (off[0] || off[1] || o.mv || o.fl) {
      const keys = [[t, [x + off[0], y + off[1], 0], EO], [t + d, [x, y, 0], IO]]; let last = t + d;
      if (o.mv) o.mv.forEach(([f, mx, my, e]) => { keys.push([f, [mx, my, 0], e || EO]); last = f; });
      else if (o.fl) for (let f = last + 40; f < out; f += 40) keys.push([f, [x, y + (keys.length % 2 ? -o.fl : 0), 0], IO]);
      p = kf(keys.length > 2 || o.mv ? keys : keys);
    }
    let s = S([sx, sy, 100]);
    if (k === 'pop') s = kf([[t, [0, 0, 100], EO], [t + d * .55, [sx * 1.15, sy * 1.15, 100], EO], [t + d * .8, [sx * .95, sy * .95, 100], IO], [t + d, [sx, sy, 100]]]);
    if (k === 'grow') s = kf([[t, [sx, 0, 100], EO], [t + d * .7, [sx, sy * 1.06, 100], EO], [t + d, [sx, sy, 100]]]);
    if (k === 'growx') s = kf([[t, [0, sy, 100], EO], [t + d, [sx, sy, 100]]]);
    if (o.sc) s = kf(o.sc);
    const rot = r !== r0 ? kf([[t, r0, EO], [t + d, r]]) : S(r);
    Ls.push({ ddd: 0, ind: 0, ty: 4, nm: o.nm || 'l', sr: 1, ks: { o: kf(oKeys.length > 1 ? oKeys : [[0, 100]]), r: o.rk ? kf(o.rk) : rot, p, a: S([0, 0, 0]), s }, ao: 0, shapes: [grp(shapes)], ip: 0, op: OP, st: 0, bm: 0 });
  };
  const bg = (c1, c2, accent) => {
    L(rc(392, 292, 22, { g: lg(c1, c2, -196, -146, 196, 146), stroke: accent, sw: 1.6, so: 45 }), 200, 150, 0, { k: 'none', keep: true, nm: 'bg' });
    L(el(260, 260, { g: glow(accent, 130, 55) }), 90, 70, 0, { k: 'none', keep: true, mv: [[0, 90, 70, IO], [OP / 2, 130, 110, IO], [OP, 90, 70, IO]], nm: 'glow1' });
    L(el(240, 240, { g: glow(C.pink, 120, 30) }), 320, 240, 0, { k: 'none', keep: true, mv: [[0, 320, 240, IO], [OP / 2, 280, 200, IO], [OP, 320, 240, IO]], nm: 'glow2' });
    [[44, 36, 0], [352, 44, 20], [368, 150, 50], [30, 262, 35], [196, 20, 70]].forEach(([x, y, ph], i) => L(star(4 + (i % 2) * 2, { fill: C.white, fo: 80 }), x, y, 0, { k: 'none', keep: true, sc: [[0, [0, 0, 100], IO], [ph + 1, [0, 0, 100], IO], [ph + 22, [100, 100, 100], IO], [ph + 44, [0, 0, 100], IO], [OP, [0, 0, 100]]], rk: [[0, 0], [OP, 90]], nm: 'tw' }));
  };
  fn({ L, bg, OP });
  Ls.reverse().forEach((l, i) => l.ind = i + 1);
  const j = { v: '5.7.0', fr: 30, ip: 0, op: OP, w: 400, h: 300, nm: name, ddd: 0, assets: [], layers: Ls };
  fs.writeFileSync(path.join(out, 'scene-' + name + '.json'), JSON.stringify(j)); console.log('scene-' + name, (JSON.stringify(j).length / 1024).toFixed(1) + ' KB');
};
const tick = (L, x, y, t, c = C.white, w = 4) => L(poly([[-6, 0], [-1.5, 5], [7, -5]], false, { stroke: c, sw: w, draw: 9, t }), x, y, t, { k: 'none', nm: 'tick' });
const badge = (L, x, y, t, c = C.teal) => { L(el(34, 34, { g: lg(c, C.blue, -17, -17, 17, 17) }), x, y, t, { d: 14, nm: 'badge' }); tick(L, x, y, t + 8); L(el(34, 34, { stroke: c, sw: 2 }), x, y, t + 6, { k: 'none', sc: [[t + 6, [100, 100, 100], EO], [t + 30, [230, 230, 100]]], op: 70, out: t + 18, nm: 'ping' }); };
const burst = (L, x, y, t, cols) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .3, d = 34 + (i % 3) * 10; L(rc(6, 6, 1.5, { fill: cols[i % cols.length] }), x, y, t, { k: 'none', mv: [[t + 1, x, y, EO], [t + 26, x + Math.cos(a) * d, y + Math.sin(a) * d, EO]], sc: [[t, [60, 60, 100], EO], [t + 6, [110, 110, 100], IO], [t + 26, [0, 0, 100]]], rk: [[t, 0], [t + 26, (i % 2 ? 1 : -1) * 200]], out: t + 14, nm: 'sp' }); } };

// ---- 1. notes -> requirements: sticky notes fall in, a scanning beam sweeps, a document types itself ----
build('ai-notes', 200, ({ L, bg }) => {
  bg('#34309F', '#15125A', C.blue);
  const N = [[50, 76, C.pink, -14], [104, 62, C.sky, 9], [64, 126, C.teal, 6], [120, 140, C.blue, -8], [48, 186, C.sky, 12], [104, 204, C.pink, -6]];
  L(rc(132, 204, 14, { g: lg('#3F3BB3', '#2A2790', 0, -100, 0, 100), stroke: C.sky, sw: 1.6, so: 50 }), 306, 150, 64, { k: 'left', d: 20, nm: 'doc' });
  [[0, 96, C.sky, 1], [1, 100, C.white, .55], [2, 80, C.white, .35], [3, 100, C.white, .35], [4, 66, C.white, .35], [5, 92, C.white, .35]].forEach(([i, w, c, op]) => L(rc(w, i ? 6 : 9, 3, { cx: w / 2, fill: c, fo: op * 100 }), 262, 86 + i * 22 + (i ? 4 : 0), 104 + i * 9, { k: 'growx', d: 12, nm: 'line' }));
  N.forEach(([x, y, c, r], i) => { const t = 6 + i * 6; L(rc(34, 34, 6, { fill: c }), x, y, t, { k: 'down', d: 22, r, r0: r + 26, mv: [[t + 40, x, y + 3, IO], [92 + i * 3, 258 + (i % 2) * 8, 120 + i * 12, IN]], sc: [[t, [0, 0, 100], EO], [t + 12, [112, 112, 100], EO], [t + 20, [100, 100, 100], IO], [90 + i * 3, [100, 100, 100], IN], [112 + i * 3, [10, 10, 100]]], out: 114 + i * 3, nm: 'note' }); L(rc(20, 4, 2, { fill: C.white, fo: 70 }), x, y - 6, t + 4, { k: 'none', r, mv: [[t + 40, x, y - 3, IO], [92 + i * 3, 258 + (i % 2) * 8, 114 + i * 12, IN]], sc: [[t + 4, [0, 0, 100], EO], [t + 16, [100, 100, 100], IO], [92 + i * 3, [100, 100, 100], IN], [112 + i * 3, [0, 0, 100]]], out: 112 + i * 3, nm: 'nl' }); });
  L(rc(4, 226, 2, { g: lg(C.pink, '#E5197F', 0, -113, 0, 113) }), 150, 150, 84, { k: 'none', mv: [[84, 150, 150, IO], [140, 372, 150, IO]], op: 100, out: 136, nm: 'beam' });
  L(el(70, 70, { g: glow(C.pink, 35, 80) }), 150, 150, 84, { k: 'none', mv: [[84, 150, 150, IO], [140, 372, 150, IO]], out: 136, nm: 'beamglow' });
  L(star(10, { fill: C.white }), 150, 40, 84, { k: 'none', mv: [[84, 150, 40, IO], [140, 372, 40, IO]], rk: [[84, 0], [140, 240]], out: 136, nm: 'beamstar' });
  badge(L, 352, 262, 150); burst(L, 352, 262, 152, [C.pink, C.teal, C.sky, C.warm]);
});
// ---- 2. configuration -> summary: nodes link to a hub, then collapse into a completed ring ----
build('ai-config', 180, ({ L, bg }) => {
  bg('#0E5A78', '#08233F', C.teal);
  const cx = 200, cy = 140, R = 92;
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .86, t = 8 + i * 5, a2 = a + .6, x2 = cx + Math.cos(a2) * 54, y2 = cy + Math.sin(a2) * 54;
    L(poly([[0, 0], [x - cx, y - cy]], false, { stroke: C.sky, sw: 2, so: 55, draw: 14, t: t + 6 }), cx, cy, t + 6, { k: 'none', out: 96, nm: 'link' });
    L(gear(i % 2 ? 11 : 14, { g: lg([C.sky, C.teal, C.pink][i % 3], C.blue, -14, -14, 14, 14) }), x, y, t, { d: 16, mv: [[96, x, y, IO], [118 + i * 2, x2, y2, EO]], rk: [[t, 0], [118 + i * 2, (i % 2 ? 1 : -1) * 240]], sc: [[t, [0, 0, 100], EO], [t + 9, [118, 118, 100], EO], [t + 16, [100, 100, 100], IO], [118 + i * 2, [100, 100, 100], IN], [132 + i * 2, [0, 0, 100]]], out: 132 + i * 2, nm: 'node' }); }
  [0, 1, 2].forEach(i => L(el(60, 60, { stroke: C.teal, sw: 2 }), cx, cy, 30 + i * 22, { k: 'none', sc: [[30 + i * 22, [40, 40, 100], EO], [30 + i * 22 + 34, [190, 190, 100]]], op: 70, out: 30 + i * 22 + 18, nm: 'pulse' }));
  L(el(104, 104, { stroke: C.sky, sw: 8, so: 18 }), cx, cy, 108, { k: 'none', nm: 'ringbg' });
  L(el(104, 104, { stroke: C.teal, sw: 8, draw: 34, t: 112 }), cx, cy, 112, { k: 'none', r: -90, nm: 'ring' });
  L(el(56, 56, { g: lg('#0A2A52', '#06182E', -28, -28, 28, 28), stroke: C.teal, sw: 2 }), cx, cy, 6, { d: 18, nm: 'hub' }); L(star(15, { fill: C.white }), cx, cy, 14, { d: 14, rk: [[14, 0], [180, 150]], nm: 'hubstar' });
  [[C.teal, 'ok'], [C.sky, 'ok'], [C.pink, 'ok']].forEach(([c], i) => { L(rc(92, 24, 12, { fill: '#FFFFFF', fo: 12, stroke: c, sw: 1.4, so: 80 }), 82 + i * 118, 258, 128 + i * 7, { k: 'up', d: 16, nm: 'pill' }); L(el(8, 8, { fill: c }), 58 + i * 118, 258, 134 + i * 7, { d: 10, nm: 'pd' }); L(rc(46, 5, 2.5, { cx: 23, fill: C.white, fo: 70 }), 70 + i * 118, 258, 138 + i * 7, { k: 'growx', d: 12, nm: 'pl' }); });
  tick(L, cx, cy - 1, 146, C.teal, 3);
});
// ---- 3. training -> guidance: a video scrubs, then step-by-step guidance builds down a timeline ----
build('ai-train', 220, ({ L, bg }) => {
  bg('#1E58C8', '#0C2468', C.sky);
  L(rc(304, 98, 14, { g: lg('#0A173F', '#13286B', 0, -49, 0, 49), stroke: C.sky, sw: 1.6, so: 55 }), 200, 66, 4, { k: 'down', d: 20, nm: 'video' });
  L(el(40, 40, { g: lg(C.pink, '#C0126A', -20, -20, 20, 20) }), 200, 66, 16, { d: 16, sc: [[16, [0, 0, 100], EO], [28, [115, 115, 100], EO], [36, [100, 100, 100], IO], [90, [100, 100, 100], IO], [100, [90, 90, 100], IO], [112, [100, 100, 100], IO]], nm: 'playbtn' });
  L(poly([[-5, -8], [-5, 8], [8, 0]], true, { fill: C.white }), 202, 66, 22, { d: 12, nm: 'tri' });
  L(rc(284, 6, 3, { cx: 142, fill: C.white, fo: 22 }), 58, 130, 26, { k: 'growx', d: 14, nm: 'track' });
  L(rc(284, 6, 3, { cx: 142, g: lg(C.pink, C.sky, 0, 0, 284, 0) }), 58, 130, 34, { k: 'none', sc: [[34, [0, 100, 100], LIN], [150, [100, 100, 100]]], nm: 'prog' });
  L(el(14, 14, { fill: C.white }), 58, 130, 34, { k: 'none', mv: [[34, 58, 130, LIN], [150, 342, 130]], nm: 'head' });
  const rows = [176, 214, 252];
  L(poly([[0, 0], [0, 76]], false, { stroke: C.sky, sw: 2.5, so: 60, draw: 40, t: 62 }), 58, 176, 62, { k: 'none', nm: 'rail' });
  rows.forEach((y, i) => { const t = 60 + i * 16, cc = [C.blue, C.pink, C.teal][i];
    L(rc(262, 30, 10, { fill: '#FFFFFF', fo: 10, stroke: C.sky, sw: 1.2, so: 35 }), 214, y, t, { k: 'right', d: 18, nm: 'row' });
    L(el(22, 22, { g: lg(cc, C.navy, -11, -11, 11, 11) }), 58, y, t, { d: 14, nm: 'dot' });
    L(rc(9, 9, 2, { fill: C.white }), 58, y, t + 6, { d: 10, nm: 'n' });
    L(rc(92, 7, 3.5, { cx: 46, fill: C.white, fo: 92 }), 86, y - 4, t + 6, { k: 'growx', d: 14, nm: 't1' }); L(rc(66, 5, 2.5, { cx: 33, fill: C.sky, fo: 55 }), 86, y + 7, t + 10, { k: 'growx', d: 14, nm: 't2' });
    tick(L, 330, y, 112 + i * 20, C.teal, 3.5); });
  L(el(32, 32, { stroke: C.pink, sw: 2.5 }), 58, 176, 96, { k: 'none', mv: [[96, 58, 176, EO], [118, 58, 214, EO], [138, 58, 252, EO], [168, 58, 252, EO]], sc: [[96, [0, 0, 100], EO], [106, [100, 100, 100], IO], [168, [100, 100, 100], IO], [180, [0, 0, 100]]], nm: 'focus' });
  burst(L, 330, 252, 150, [C.teal, C.sky, C.pink]);
});
// ---- 4. UAT results -> findings: result dots drop into severity columns that fill up ----
build('ai-uat', 210, ({ L, bg }) => {
  bg('#7A1D63', '#26093A', C.pink);
  const cols = [[C.pink, 252], [C.blue, 302], [C.teal, 352]], cnt = [3, 4, 5], H = [74, 104, 134], base = 246;
  const dots = []; const order = [2, 0, 1, 2, 1, 2, 0, 1, 2, 1, 0, 2]; order.forEach((c, j) => dots.push([c, 54 + (j % 6) * 24, 58 + Math.floor(j / 6) * 26]));
  const seen = [0, 0, 0], arrive = [[], [], []];
  dots.forEach(([c, x, y], j) => { const t = 6 + j * 3, drop = 62 + j * 6, tx = cols[c][1], ty = base - 14 - (seen[c]++ % cnt[c]) * 4; arrive[c].push(drop + 20);
    L(el(15, 15, { fill: cols[c][0] }), x, y, t, { d: 12, mv: [[drop, x, y, IO], [drop + 20, tx, ty, IN]], sc: [[t, [0, 0, 100], EO], [t + 8, [115, 115, 100], EO], [t + 12, [100, 100, 100], IO], [drop + 18, [100, 100, 100], IN], [drop + 24, [0, 0, 100]]], out: drop + 24, nm: 'res' }); });
  L(rc(190, 76, 12, { fill: '#FFFFFF', fo: 7, stroke: C.pink, sw: 1.2, so: 35 }), 120, 82, 2, { k: 'down', d: 18, out: 150, nm: 'tray' });
  cols.forEach(([c, x], i) => { const n = cnt[i], keys = [[1, [100, 0, 100]]]; arrive[i].forEach((a, k) => { keys.push([a, [100, (k / n) * 100, 100], EO], [a + 9, [100, ((k + 1) / n) * 100 * (k === n - 1 ? 1.05 : 1), 100], EO]); }); keys.push([arrive[i][n - 1] + 18, [100, 100, 100], IO]);
    L(rc(34, H[i], 7, { g: lg(c, C.navy, 0, -H[i] / 2, 0, H[i] / 2), cy: -H[i] / 2 }), x, base, 1, { k: 'none', sc: keys, nm: 'col' });
    L(rc(34, 4, 2, { fill: C.white, fo: 22 }), x, base + 6, 40 + i * 6, { k: 'growx', d: 14, nm: 'base' });
    L(rc(30, 5, 2.5, { cx: 15, fill: C.white, fo: 65 }), x - 15, base + 20, 52 + i * 6, { k: 'growx', d: 12, nm: 'lbl' }); });
  L(el(26, 26, { g: lg(C.warm, C.pink, -13, -13, 13, 13) }), 252, base - H[0] - 22, 150, { d: 14, sc: [[150, [0, 0, 100], EO], [162, [118, 118, 100], EO], [170, [100, 100, 100], IO], [180, [112, 112, 100], IO], [190, [100, 100, 100], IO]], nm: 'alert' });
  L(rc(4, 10, 2, { fill: C.navy }), 252, base - H[0] - 25, 156, { d: 8, nm: 'bang' }); L(el(4, 4, { fill: C.navy }), 252, base - H[0] - 15, 158, { d: 8, nm: 'bangd' });
  L(el(26, 26, { stroke: C.warm, sw: 2 }), 252, base - H[0] - 22, 160, { k: 'none', sc: [[160, [100, 100, 100], EO], [190, [260, 260, 100]]], op: 70, out: 176, nm: 'ping' });
});
// ---- 5. requirements -> structured: scattered chips fly into three columns, one is picked and approved ----
build('ai-req', 190, ({ L, bg }) => {
  bg('#4F1F92', '#1C0A42', C.pink);
  const colx = [84, 200, 316], cc = [C.blue, C.pink, C.teal];
  colx.forEach((x, i) => { L(rc(104, 218, 14, { fill: '#FFFFFF', fo: 6, stroke: cc[i], sw: 1.4, so: 45 }), x, 160, 3 + i * 5, { k: 'up', d: 20, nm: 'col' }); L(rc(54, 7, 3.5, { cx: 27, fill: cc[i] }), x - 27, 62, 16 + i * 5, { k: 'growx', d: 16, nm: 'hd' }); });
  const sc = [[150, 38, -18], [232, 30, 12], [190, 58, -6], [120, 30, 20], [262, 52, -14], [176, 24, 8], [212, 84, 16], [100, 78, -10], [286, 80, 6]];
  sc.forEach(([x, y, r], i) => { const c = i % 3, row = Math.floor(i / 3), tx = colx[c], ty = 94 + row * 44, t = 12 + i * 3, go = 52 + i * 7;
    L(rc(84, 30, 8, { g: lg(cc[c], '#FFFFFF', -42, 0, 42, 0, 100), fo: 100 }), x, y, t, { d: 16, r, r0: r - 20, mv: [[t + 40, x, y + 4, IO], [go, x, y + 4, IO], [go + 22, tx, ty, EO]], rk: [[t, r - 20, EO], [t + 16, r, IO], [go, r, IO], [go + 22, 0, EO]], nm: 'chip', op: 92 });
    L(rc(52, 5, 2.5, { cx: 26, fill: C.navy, fo: 70 }), x - 26, y - 4, t + 3, { k: 'none', r, mv: [[t + 40, x - 26, y, IO], [go, x - 26, y, IO], [go + 22, tx - 26, ty - 4, EO]], rk: [[go, r], [go + 22, 0]], nm: 'cl' });
    L(rc(34, 4, 2, { cx: 17, fill: C.navy, fo: 40 }), x - 26, y + 6, t + 3, { k: 'none', r, mv: [[t + 40, x - 26, y + 10, IO], [go, x - 26, y + 10, IO], [go + 22, tx - 26, ty + 6, EO]], rk: [[go, r], [go + 22, 0]], nm: 'cl2' }); });
  L(rc(92, 38, 10, { stroke: C.warm, sw: 2.5, draw: 16, t: 126 }), 200, 138, 126, { k: 'none', nm: 'pick' });
  L(poly([[0, 0], [0, 17], [4.5, 12.5], [8, 20], [11, 18.5], [7.5, 11.5], [13, 11.5]], true, { fill: C.white, stroke: C.navy, sw: 1.2 }), 280, 250, 100, { k: 'none', mv: [[100, 280, 250, IO], [124, 214, 144, EO], [160, 214, 144, IO], [176, 300, 260, IN]], sc: [[100, [0, 0, 100], EO], [110, [100, 100, 100], IO], [160, [100, 100, 100], IN], [174, [0, 0, 100]]], nm: 'cursor' });
  badge(L, 246, 128, 138, C.teal);
});
// ---- 6. progress -> summary: a ring gauge sweeps, a trend line draws, a marker travels the milestone track ----
build('ai-progress', 230, ({ L, bg }) => {
  bg('#0F6C78', '#082B49', C.teal);
  const cx = 104, cy = 100;
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r1 = 66, r2 = i % 7 ? 70 : 74; L(poly([[Math.cos(a) * r1, Math.sin(a) * r1], [Math.cos(a) * r2, Math.sin(a) * r2]], false, { stroke: C.sky, sw: 1.6, so: 55 }), cx, cy, 6 + i, { k: 'none', nm: 'tk' }); }
  L(el(104, 104, { stroke: C.sky, sw: 12, so: 18 }), cx, cy, 4, { d: 18, nm: 'ringbg' });
  L(el(104, 104, { g: undefined, stroke: C.teal, sw: 12, draw: 64, t: 24, to: 72 }), cx, cy, 24, { k: 'none', r: -90, nm: 'ring' });
  L(el(70, 70, { stroke: C.pink, sw: 8, draw: 54, t: 40, to: 48 }), cx, cy, 40, { k: 'none', r: -90, nm: 'ring2' });
  L(el(8, 8, { fill: C.white }), cx, cy, 96, { d: 10, sc: [[96, [0, 0, 100], EO], [106, [100, 100, 100], IO], [130, [150, 150, 100], IO], [150, [100, 100, 100], IO]], nm: 'core' });
  const pts = [[196, 130], [226, 112], [256, 120], [288, 84], [320, 98], [354, 52]];
  L(poly([...pts.map(([x, y]) => [x, y]), [354, 150], [196, 150]], true, { g: lg(C.teal, '#082B49', 0, 52, 0, 150, 38) }), 0, 0, 100, { k: 'fade', d: 20, nm: 'area' });
  L(poly(pts, false, { stroke: C.white, sw: 3.2, draw: 56, t: 52 }), 0, 0, 52, { k: 'none', nm: 'trend' });
  pts.forEach(([x, y], i) => L(el(9, 9, { fill: i === 5 ? C.pink : C.white }), x, y, 60 + i * 9, { d: 10, nm: 'pt' }));
  L(el(22, 22, { stroke: C.pink, sw: 2 }), 354, 52, 112, { k: 'none', sc: [[112, [100, 100, 100], EO], [140, [240, 240, 100]]], op: 70, out: 126, nm: 'ping' });
  L(poly([[50, 232], [350, 232]], false, { stroke: C.white, sw: 3, so: 25, draw: 24, t: 90 }), 0, 0, 90, { k: 'none', nm: 'track' });
  [50, 150, 250, 350].forEach((x, i) => { const t = 112 + i * 20; L(el(20, 20, { g: lg(i === 3 ? C.pink : C.teal, C.blue, -10, -10, 10, 10) }), x, 232, t, { d: 14, nm: 'ms' }); L(rc(46, 6, 3, { cx: 23, fill: C.white, fo: 60 }), x - 23, 256, t + 6, { k: 'growx', d: 14, nm: 'ml' }); tick(L, x, 232, t + 8, C.white, 2.6); });
  L(el(12, 12, { fill: C.warm }), 50, 232, 96, { k: 'none', mv: [[96, 50, 232, IO], [118, 150, 232, IO], [136, 150, 232, IO], [158, 250, 232, IO], [176, 250, 232, IO], [198, 350, 232, IO]], sc: [[96, [0, 0, 100], EO], [106, [100, 100, 100], IO], [200, [100, 100, 100], IO], [210, [0, 0, 100]]], nm: 'marker' });
  burst(L, 350, 232, 198, [C.pink, C.teal, C.warm, C.sky]);
});
