// Original Lottie illustrations (400x300) for the introduction, home page and admin pages. Authored in code in the Facilio palette.
// Run: node tools/make-scenes.mjs  -> public/brand/lottie/scene-*.json
// Each scene builds up element by element, holds, then fades so it can loop.
import fs from 'node:fs'; import path from 'node:path';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'brand', 'lottie'); fs.mkdirSync(out, { recursive: true });
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const K = { navy: '#1D1A5E', blue: '#1570EF', pink: '#E5197F', teal: '#2EC9C4', sky: '#8DB8FF', ice: '#EEF3FB', line: '#CBD6EA', white: '#FFFFFF', ink: '#3A3F63', mid: '#5B6CFF' };
const EASE = { i: { x: [0.25], y: [1] }, o: { x: [0.75], y: [0] } }, LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const kf = (keys, ease = EASE) => ({ a: 1, k: keys.map(([t, v], i) => { const k = { t, s: Array.isArray(v) ? v : [v] }; if (i < keys.length - 1) Object.assign(k, ease); return k; }) });
const S = v => ({ a: 0, k: v });
const OP = 168;
// shape builders (return group items without transform)
const rr = (w, h, r, o = {}) => [{ ty: 'rc', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), r: S(r), d: 1 }, ...paint(o)];
const el = (w, h, o = {}) => [{ ty: 'el', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), d: 1 }, ...paint(o)];
const path_ = (pts, closed, o = {}) => [{ ty: 'sh', ks: S({ i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), v: pts, c: !!closed }) }, ...paint(o)];
const paint = o => { const r = []; if (o.fill) r.push({ ty: 'fl', c: S([...hex(o.fill), 1]), o: S(o.fo == null ? 100 : o.fo), r: 1 }); if (o.stroke) r.push({ ty: 'st', c: S([...hex(o.stroke), 1]), o: S(100), w: S(o.sw || 3), lc: 2, lj: 2 }); if (o.draw) r.push({ ty: 'tm', s: S(0), e: kf([[o.t, 0], [o.t + o.draw, o.to || 100]], LIN), o: S(0), m: 1 }); return r; };
const star = (R, o = {}) => path_([[0, -R], [R * .24, -R * .24], [R, 0], [R * .24, R * .24], [0, R], [-R * .24, R * .24], [-R, 0], [-R * .24, -R * .24]], true, o);
const gear = (R, o = {}) => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? R * .78 : R; const a2 = a; pts.push([Math.cos(a2) * r, Math.sin(a2) * r]); } return path_(pts, true, o); };

// layer factory. a: entrance type. keeps all layers fading out at the end so the scene can loop.
function mk(items, ks0, nm = 'l') {
  const { x, y, t = 0, d = 14, a = 'pop', rot, spin, move, hold = true } = ks0; const op = [[t, 0], [t + 5, 100]]; if (hold) op.push([OP - 16, 100], [OP - 3, 0]);
  const ks = { o: kf(op, LIN), r: S(rot || 0), p: S([x, y, 0]), a: S([0, 0, 0]), s: S([100, 100, 100]) };
  if (a === 'pop') ks.s = kf([[t, [0, 0, 100]], [t + d * .6, [116, 116, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]);
  if (a === 'rise') ks.p = kf([[t, [x, y + 16, 0]], [t + d, [x, y, 0]], [OP - 3, [x, y, 0]]]);
  if (a === 'gy') ks.s = kf([[t, [100, 0, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]);
  if (a === 'gx') ks.s = kf([[t, [0, 100, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]);
  if (a === 'drop') ks.p = kf([[t, [x, y - 120, 0]], [t + d * .6, [x, y + 6, 0]], [t + d, [x, y, 0]], [OP - 3, [x, y, 0]]]);
  if (spin) ks.r = kf([[0, 0], [OP, spin]], LIN);
  if (move) ks.p = kf(move.map(([tt, px, py]) => [tt, [px, py, 0]]));
  return { ddd: 0, ind: 0, ty: 4, nm, sr: 1, ks, ao: 0, shapes: [{ ty: 'gr', it: [...items, { ty: 'tr', p: S([0, 0]), a: S([0, 0]), s: S([100, 100]), r: S(0), o: S(100), sk: S(0), sa: S(0) }], nm }], ip: 0, op: OP, st: 0, bm: 0 };
}
const scene = (name, fn) => { const L = []; const add = (items, ks, nm) => L.push(mk(items, ks, nm)); fn(add); L.reverse(); L.forEach((l, i) => l.ind = i + 1); const j = { v: '5.7.0', fr: 30, ip: 0, op: OP, w: 400, h: 300, nm: name, ddd: 0, assets: [], layers: L }; fs.writeFileSync(path.join(out, 'scene-' + name + '.json'), JSON.stringify(j)); console.log('scene-' + name, (JSON.stringify(j).length / 1024).toFixed(1) + ' KB'); };
// panels
const PANEL = add => add(rr(392, 292, 22, { fill: K.ice }), { x: 200, y: 150, a: 'none', hold: false, t: 0 }, 'bg');
const tick = (x, y, t, c = K.white, w = 4) => [x, y, t, c, w];
const ticker = (add, x, y, t, c) => add(path_([[-7, 0], [-2, 6], [8, -6]], false, { stroke: c, sw: 3.5, draw: 8, t }), { x, y, a: 'none', t }, 'tick');

// 1. workshop: whiteboard fills with notes while people join
scene('workshop', add => {
  PANEL(add);
  add(rr(268, 168, 12, { fill: K.white, stroke: K.line, sw: 2 }), { x: 200, y: 112, t: 4, d: 14 }, 'board');
  add(rr(240, 10, 5, { cx: 120, fill: K.blue }), { x: 80, y: 46, t: 12, a: 'gx', d: 14 }, 'boardbar');
  const cols = [K.pink, K.teal, K.blue, K.sky, K.pink, K.teal]; [[100, 86], [160, 86], [220, 86], [100, 138], [160, 138], [220, 138]].forEach(([x, y], i) => { add(rr(46, 40, 7, { fill: cols[i] }), { x: x + 24, y: y + 10, t: 22 + i * 9, d: 14, rot: [-3, 2, -2, 3, -1, 2][i] }, 'note' + i); add(rr(28, 4, 2, { fill: K.white, fo: 70 }), { x: x + 24, y: y + 4, t: 30 + i * 9, a: 'gx', d: 10 }, 'nl' + i); });
  add(path_([[0, 0], [28, 0], [42, 14]], false, { stroke: K.navy, sw: 3, draw: 20, t: 82 }), { x: 262, y: 110, a: 'none', t: 82 }, 'arrow'); add(rr(54, 40, 8, { fill: K.navy }), { x: 316, y: 142, t: 98, d: 14 }, 'outbox'); ticker(add, 316, 142, 106, K.white);
  [[96, K.navy, K.pink], [200, K.blue, K.teal], [304, K.pink, K.navy]].forEach(([x, b, h], i) => { add(rr(48, 44, 22, { fill: b, cy: 22 }), { x, y: 244, t: 40 + i * 10, a: 'rise', d: 16 }, 'body' + i); add(el(26, 26, { fill: h, cy: -2 }), { x, y: 222, t: 44 + i * 10, a: 'rise', d: 16 }, 'head' + i); });

});
// 2. brd: a document is written with AI assistance, then approved
scene('brd', add => {
  PANEL(add);
  add(rr(158, 214, 12, { fill: K.white, stroke: K.line, sw: 2 }), { x: 150, y: 150, t: 4, d: 14 }, 'page');
  add(rr(96, 10, 5, { cx: 48, fill: K.blue }), { x: 98, y: 70, a: 'gx', t: 14, d: 12 }, 'title');
  [[130, 0], [112, 1], [136, 2], [92, 3], [124, 4], [104, 5]].forEach(([w, i]) => add(rr(w, 6, 3, { cx: w / 2, fill: K.line }), { x: 98, y: 98 + i * 20, a: 'gx', t: 28 + i * 9, d: 12 }, 'line' + i));
  add(rr(56, 28, 8, { fill: K.pink, fo: 16 }), { x: 190, y: 220, t: 90, d: 12 }, 'stamp'); ticker(add, 190, 220, 98, K.pink);
  add(el(52, 52, { fill: K.navy }), { x: 300, y: 84, t: 30, d: 16 }, 'orb'); add(star(15, { fill: K.white }), { x: 300, y: 84, t: 36, d: 14, spin: 90 }, 'spark');
  add(path_([[0, 0], [-24, 18], [-48, 26]], false, { stroke: K.sky, sw: 3, draw: 22, t: 52 }), { x: 276, y: 100, a: 'none', t: 52 }, 'link');
  add(rr(78, 28, 14, { fill: K.teal }), { x: 300, y: 140, t: 62, d: 12 }, 'tag'); add(rr(40, 5, 2.5, { fill: K.white }), { x: 300, y: 140, a: 'gx', t: 70, d: 10 }, 'taglbl');
  add(el(46, 46, { fill: K.blue }), { x: 300, y: 214, t: 96, d: 14 }, 'ok'); ticker(add, 300, 214, 104, K.white);
});
// 3. dashboard: tiles, bars, a ring and a line assemble into one view
scene('dash', add => {
  PANEL(add);
  add(rr(352, 232, 16, { fill: K.white, stroke: K.line, sw: 2 }), { x: 200, y: 152, t: 4, d: 14 }, 'card');
  [[78, K.blue], [160, K.pink], [242, K.teal]].forEach(([x, c], i) => { add(rr(70, 34, 8, { fill: K.ice }), { x: x + 4, y: 56, t: 14 + i * 7, d: 12 }, 'kpi' + i); add(rr(26, 6, 3, { cx: 13, fill: c }), { x: x - 18, y: 56, a: 'gx', t: 20 + i * 7, d: 10 }, 'kl' + i); });
  [30, 52, 40, 66, 84].forEach((h, i) => add(rr(20, h, 4, { cy: -h / 2, fill: [K.sky, K.blue, K.sky, K.blue, K.pink][i] }), { x: 66 + i * 30, y: 220, a: 'gy', t: 30 + i * 6, d: 22 }, 'bar' + i));
  add(el(86, 86, { stroke: K.ice, sw: 14 }), { x: 290, y: 150, t: 28, d: 12 }, 'ringbg');
  add(el(86, 86, { stroke: K.blue, sw: 14, draw: 40, to: 72, t: 34 }), { x: 290, y: 150, a: 'none', t: 34, rot: -90 }, 'ring1'); add(el(58, 58, { stroke: K.teal, sw: 10, draw: 34, to: 55, t: 44 }), { x: 290, y: 150, a: 'none', t: 44, rot: -90 }, 'ring2');
  add(path_([[0, 40], [30, 22], [60, 30], [90, 8], [124, -14]], false, { stroke: K.pink, sw: 3.5, draw: 46, t: 70 }), { x: 66, y: 98, a: 'none', t: 70 }, 'trend'); add(el(10, 10, { fill: K.pink }), { x: 190, y: 84, t: 112, d: 10 }, 'tip');
});
// 4. guide: a short training video with steps that tick off
scene('guide', add => {
  PANEL(add);
  add(rr(214, 132, 14, { fill: K.navy }), { x: 140, y: 112, t: 4, d: 14 }, 'video'); add(path_([[-10, -14], [-10, 14], [14, 0]], true, { fill: K.white }), { x: 144, y: 108, t: 18, d: 12 }, 'play');
  add(rr(214, 8, 4, { cx: 107, fill: K.line }), { x: 33, y: 200, a: 'gx', t: 24, d: 10 }, 'track'); add(rr(150, 8, 4, { cx: 75, fill: K.blue }), { x: 33, y: 200, a: 'gx', t: 34, d: 60 }, 'prog');
  [[0, K.teal], [1, K.blue], [2, K.pink]].forEach(([i, c]) => { const y = 78 + i * 52; add(rr(112, 40, 10, { fill: K.white, stroke: K.line, sw: 2 }), { x: 322, y, t: 40 + i * 14, d: 14 }, 'step' + i); add(el(22, 22, { fill: c }), { x: 284, y, t: 46 + i * 14, d: 12 }, 'sd' + i); ticker(add, 284, y, 54 + i * 14, K.white); add(rr(46, 6, 3, { cx: 23, fill: K.line }), { x: 304, y, a: 'gx', t: 50 + i * 14, d: 10 }, 'sl' + i); });
  add(rr(214, 40, 10, { fill: K.white, stroke: K.line, sw: 2 }), { x: 140, y: 244, t: 70, d: 14 }, 'tipbox'); add(star(10, { fill: K.pink }), { x: 168, y: 244, t: 78, d: 12, spin: 120 }, 'tipspark'); add(rr(84, 6, 3, { cx: 42, fill: K.line }), { x: 188, y: 244, a: 'gx', t: 84, d: 12 }, 'tiptext');
});
// 5. building: a facility rises, windows light up, a pin lands
scene('building', add => {
  PANEL(add);
  add(rr(320, 6, 3, { cx: 160, fill: K.line }), { x: 40, y: 246, a: 'gx', t: 2, d: 14 }, 'ground');
  [[88, 108, 112, K.navy, 0], [166, 92, 150, K.blue, 8], [244, 92, 84, K.pink, 16]].forEach(([x, w, h, c, d], i) => { add(rr(w, h, 6, { cy: -h / 2, fill: c }), { x: x + 24 + (i === 1 ? 0 : 0), y: 246, a: 'gy', t: 8 + d, d: 26 }, 'b' + i); const cols = Math.floor(w / 28), rows = Math.floor(h / 34); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) add(rr(14, 14, 3, { fill: (r + q) % 3 ? K.sky : K.white }), { x: x + 24 - w / 2 + 22 + q * 26 + (w % 28) / 2 - 4, y: 246 - 22 - r * 34, t: 38 + i * 6 + r * 5 + q * 3, d: 10 }, 'w'); });
  add(gear(18, { fill: K.teal }), { x: 330, y: 70, t: 60, d: 14, spin: 360 }, 'gear'); add(el(14, 14, { fill: K.ice }), { x: 330, y: 70, t: 62, d: 12, spin: 360 }, 'gearhole');
  add(path_([[0, 0], [-12, -22], [-6, -34], [0, -36], [6, -34], [12, -22]], true, { fill: K.pink }), { x: 166, y: 64, a: 'drop', t: 88, d: 24 }, 'pin'); add(el(8, 8, { fill: K.white }), { x: 166, y: 40, a: 'drop', t: 88, d: 24 }, 'pinhole');
});
// 6. connect: modules around a hub exchange data
scene('connect', add => {
  PANEL(add);
  const sats = [[84, 70, K.blue], [200, 40, K.teal], [316, 70, K.pink], [84, 230, K.pink], [200, 262, K.blue], [316, 230, K.teal]];
  sats.forEach(([x, y, c], i) => { const dx = x - 200, dy = y - 150; add(path_([[0, 0], [dx, dy]], false, { stroke: K.line, sw: 2.5, draw: 16, t: 20 + i * 6 }), { x: 200, y: 150, a: 'none', t: 20 + i * 6 }, 'ln' + i); });
  add(el(78, 78, { fill: K.navy }), { x: 200, y: 150, t: 6, d: 16 }, 'hub'); add(star(20, { fill: K.white }), { x: 200, y: 150, t: 14, d: 14, spin: 120 }, 'hubspark');
  sats.forEach(([x, y, c], i) => { add(rr(54, 40, 10, { fill: c }), { x, y, t: 14 + i * 6, d: 14 }, 'm' + i); add(rr(28, 5, 2.5, { cx: 14, fill: K.white, fo: 80 }), { x: x - 14, y: y - 4, a: 'gx', t: 24 + i * 6, d: 10 }, 'ml' + i); add(rr(18, 5, 2.5, { cx: 9, fill: K.white, fo: 55 }), { x: x - 14, y: y + 6, a: 'gx', t: 28 + i * 6, d: 10 }, 'ml2' + i); });
  sats.forEach(([x, y, c], i) => add(el(9, 9, { fill: K.white, stroke: c, sw: 2.5 }), { x: 200, y: 150, a: 'none', t: 64 + i * 6, move: [[64 + i * 6, 200, 150], [92 + i * 6, x, y], [96 + i * 6, x, y], [124 + i * 6, 200, 150]] }, 'pk' + i));
});
// 7. launch: a go-live rocket lifts off
scene('launch', add => {
  PANEL(add);
  [[60, 60], [330, 50], [300, 120], [110, 130], [350, 190]].forEach(([x, y], i) => add(star(7, { fill: i % 2 ? K.pink : K.teal }), { x, y, t: 8 + i * 8, d: 12, spin: 90 }, 'star' + i));
  add(rr(130, 12, 4, { fill: K.navy }), { x: 200, y: 262, t: 2, d: 14 }, 'pad'); add(rr(6, 70, 3, { cy: -35, fill: K.line }), { x: 152, y: 256, a: 'gy', t: 6, d: 16 }, 'tower');
  const up = [[20, 0], [60, -10], [140, -90]]; const rk = (items, nm, ox = 0, oy = 0, t = 22) => add(items, { x: 200 + ox, y: 214 + oy, t, a: 'none', move: [[t, 200 + ox, 214 + oy], [t + 50, 200 + ox, 206 + oy], [t + 120, 200 + ox, 70 + oy], [OP - 3, 200 + ox, 62 + oy]] }, nm);
  rk(path_([[0, -46], [16, -18], [16, 26], [-16, 26], [-16, -18]], true, { fill: K.white, stroke: K.line, sw: 2 }), 'body'); rk(path_([[0, -46], [16, -18], [-16, -18]], true, { fill: K.pink }), 'nose'); rk(el(14, 14, { fill: K.blue, cy: -2 }), 'window');
  rk(path_([[-16, 8], [-30, 30], [-16, 26]], true, { fill: K.blue }), 'finl'); rk(path_([[16, 8], [30, 30], [16, 26]], true, { fill: K.blue }), 'finr');
  rk(path_([[-10, 28], [0, 58], [10, 28]], true, { fill: K.pink }), 'flame', 0, 0, 40); rk(path_([[-5, 28], [0, 44], [5, 28]], true, { fill: '#FFD166' }), 'flame2', 0, 0, 40);
  [[150, 250], [250, 252], [200, 256]].forEach(([x, y], i) => add(el(34, 18, { fill: K.white, stroke: K.line, sw: 2 }), { x, y, t: 56 + i * 6, a: 'none', move: [[56 + i * 6, x, y], [OP - 4, x + (i - 1) * 16, y + 40]] }, 'cloud' + i));
});
