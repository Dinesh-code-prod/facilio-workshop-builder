// Original Lottie illustrations (400x300) for the introduction, home page and admin pages. Authored in code in the Facilio palette.
// Run: node tools/make-scenes.mjs  -> public/brand/lottie/scene-*.json
// Each scene builds up element by element, holds, then fades so it can loop.
import fs from 'node:fs'; import path from 'node:path';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'brand', 'lottie'); fs.mkdirSync(out, { recursive: true });
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const K = { navy: '#1D1A5E', blue: '#1570EF', pink: '#E5197F', teal: '#2EC9C4', sky: '#8DB8FF', ice: '#EEF3FB', line: '#CBD6EA', white: '#FFFFFF', ink: '#3A3F63', mid: '#5B6CFF' };

const LIGHT = { panel: K.ice, card: '#FFFFFF', stroke: K.line, cell: K.ice, bar: K.line, navy: K.navy };
const dk = (panel, card, stroke, cell, bar, navy) => ({ dark: true, panel, card, stroke, cell, bar, navy });
const THEMES = { iris: dk('#1F1C70', '#2B2890', '#5A57C9', '#38349F', '#6A67D6', '#0D0B35'), plum: dk('#3A1066', '#4B1B84', '#9055D6', '#5E2AA0', '#9A66DC', '#1A0535'), ocean: dk('#0B3A6B', '#134C88', '#3F88D2', '#1B5A99', '#5496DA', '#06223F'), teal: dk('#0A4A55', '#116272', '#38B5BE', '#18727F', '#52C1C9', '#052A32'), wine: dk('#5A0F40', '#751955', '#D35392', '#8B2363', '#DB6BA5', '#330521') };
let TH = LIGHT;
const EASE = { i: { x: [0.18], y: [1] }, o: { x: [0.42], y: [0] } }, LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const kf = (keys, ease = EASE) => ({ a: 1, k: keys.map(([t, v], i) => { const k = { t, s: Array.isArray(v) ? v : [v] }; if (i < keys.length - 1) Object.assign(k, ease); return k; }) });
const S = v => ({ a: 0, k: v });
const OP = 168; const SOFT = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } };
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
  if (a === 'pop') { ks.s = kf([[t, [0, 0, 100]], [t + d * .55, [122, 122, 100]], [t + d * .8, [94, 94, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]); if (nm !== 'bg' && !move) ks.p = kf([[t, [x, y, 0]], [t + d, [x, y, 0]], [t + d + 34, [x, y - 3, 0]], [t + d + 68, [x, y, 0]], [t + d + 102, [x, y - 3, 0]], [OP - 3, [x, y, 0]]], SOFT); }
  if (a === 'rise') ks.p = kf([[t, [x, y + 16, 0]], [t + d, [x, y, 0]], [OP - 3, [x, y, 0]]]);
  if (a === 'gy') ks.s = kf([[t, [100, 0, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]);
  if (a === 'gx') ks.s = kf([[t, [0, 100, 100]], [t + d, [100, 100, 100]], [OP - 3, [100, 100, 100]]]);
  if (a === 'drop') ks.p = kf([[t, [x, y - 120, 0]], [t + d * .6, [x, y + 6, 0]], [t + d, [x, y, 0]], [OP - 3, [x, y, 0]]]);
  if (spin) ks.r = kf([[0, 0], [OP, spin]], LIN);
  if (move) ks.p = kf(move.map(([tt, px, py]) => [tt, [px, py, 0]]));
  return { ddd: 0, ind: 0, ty: 4, nm, sr: 1, ks, ao: 0, shapes: [{ ty: 'gr', it: [...items, { ty: 'tr', p: S([0, 0]), a: S([0, 0]), s: S([100, 100]), r: S(0), o: S(100), sk: S(0), sa: S(0) }], nm }], ip: 0, op: OP, st: 0, bm: 0 };
}
const scene = (name, fn, th = LIGHT) => { TH = th; const L = []; const add = (items, ks, nm) => L.push(mk(items, ks, nm)); fn(add); L.reverse(); L.forEach((l, i) => l.ind = i + 1); const j = { v: '5.7.0', fr: 30, ip: 0, op: OP, w: 400, h: 300, nm: name, ddd: 0, assets: [], layers: L }; fs.writeFileSync(path.join(out, 'scene-' + name + '.json'), JSON.stringify(j)); console.log('scene-' + name, (JSON.stringify(j).length / 1024).toFixed(1) + ' KB'); };
// panels
const PANEL = add => add(rr(392, 292, 22, { fill: TH.cell }), { x: 200, y: 150, a: 'none', hold: false, t: 0 }, 'bg');
const tick = (x, y, t, c = K.white, w = 4) => [x, y, t, c, w];
const ticker = (add, x, y, t, c) => add(path_([[-7, 0], [-2, 6], [8, -6]], false, { stroke: c, sw: 3.5, draw: 8, t }), { x, y, a: 'none', t }, 'tick');

// 1. workshop: whiteboard fills with notes while people join
const S_workshop = add => {
  PANEL(add);
  add(rr(268, 168, 12, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 200, y: 112, t: 4, d: 14 }, 'board');
  add(rr(240, 10, 5, { cx: 120, fill: K.blue }), { x: 80, y: 46, t: 12, a: 'gx', d: 14 }, 'boardbar');
  const cols = [K.pink, K.teal, K.blue, K.sky, K.pink, K.teal]; [[100, 86], [160, 86], [220, 86], [100, 138], [160, 138], [220, 138]].forEach(([x, y], i) => { add(rr(46, 40, 7, { fill: cols[i] }), { x: x + 24, y: y + 10, t: 22 + i * 9, d: 14, rot: [-3, 2, -2, 3, -1, 2][i] }, 'note' + i); add(rr(28, 4, 2, { fill: K.white, fo: 70 }), { x: x + 24, y: y + 4, t: 30 + i * 9, a: 'gx', d: 10 }, 'nl' + i); });
  add(path_([[0, 0], [28, 0], [42, 14]], false, { stroke: TH.navy, sw: 3, draw: 20, t: 82 }), { x: 262, y: 110, a: 'none', t: 82 }, 'arrow'); add(rr(54, 40, 8, { fill: TH.navy }), { x: 316, y: 142, t: 98, d: 14 }, 'outbox'); ticker(add, 316, 142, 106, K.white);
  [[96, TH.navy, K.pink], [200, K.blue, K.teal], [304, K.pink, TH.navy]].forEach(([x, b, h], i) => { add(rr(48, 44, 22, { fill: b, cy: 22 }), { x, y: 244, t: 40 + i * 10, a: 'rise', d: 16 }, 'body' + i); add(el(26, 26, { fill: h, cy: -2 }), { x, y: 222, t: 44 + i * 10, a: 'rise', d: 16 }, 'head' + i); });

};
scene('workshop', S_workshop, LIGHT); scene('dk-workshop', S_workshop, THEMES.iris);
// 2. brd: a document is written with AI assistance, then approved
const S_brd = add => {
  PANEL(add);
  add(rr(158, 214, 12, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 150, y: 150, t: 4, d: 14 }, 'page');
  add(rr(96, 10, 5, { cx: 48, fill: K.blue }), { x: 98, y: 70, a: 'gx', t: 14, d: 12 }, 'title');
  [[130, 0], [112, 1], [136, 2], [92, 3], [124, 4], [104, 5]].forEach(([w, i]) => add(rr(w, 6, 3, { cx: w / 2, fill: TH.bar }), { x: 98, y: 98 + i * 20, a: 'gx', t: 28 + i * 9, d: 12 }, 'line' + i));
  add(rr(56, 28, 8, { fill: K.pink, fo: 16 }), { x: 190, y: 220, t: 90, d: 12 }, 'stamp'); ticker(add, 190, 220, 98, K.pink);
  add(el(52, 52, { fill: TH.navy }), { x: 300, y: 84, t: 30, d: 16 }, 'orb'); add(star(15, { fill: K.white }), { x: 300, y: 84, t: 36, d: 14, spin: 90 }, 'spark');
  add(path_([[0, 0], [-24, 18], [-48, 26]], false, { stroke: K.sky, sw: 3, draw: 22, t: 52 }), { x: 276, y: 100, a: 'none', t: 52 }, 'link');
  add(rr(78, 28, 14, { fill: K.teal }), { x: 300, y: 140, t: 62, d: 12 }, 'tag'); add(rr(40, 5, 2.5, { fill: K.white }), { x: 300, y: 140, a: 'gx', t: 70, d: 10 }, 'taglbl');
  add(el(46, 46, { fill: K.blue }), { x: 300, y: 214, t: 96, d: 14 }, 'ok'); ticker(add, 300, 214, 104, K.white);
};
scene('brd', S_brd, LIGHT); scene('dk-brd', S_brd, THEMES.plum);
// 3. dashboard: tiles, bars, a ring and a line assemble into one view
const S_dash = add => {
  PANEL(add);
  add(rr(352, 232, 16, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 200, y: 152, t: 4, d: 14 }, 'card');
  [[78, K.blue], [160, K.pink], [242, K.teal]].forEach(([x, c], i) => { add(rr(70, 34, 8, { fill: TH.cell }), { x: x + 4, y: 56, t: 14 + i * 7, d: 12 }, 'kpi' + i); add(rr(26, 6, 3, { cx: 13, fill: c }), { x: x - 18, y: 56, a: 'gx', t: 20 + i * 7, d: 10 }, 'kl' + i); });
  [30, 52, 40, 66, 84].forEach((h, i) => add(rr(20, h, 4, { cy: -h / 2, fill: [K.sky, K.blue, K.sky, K.blue, K.pink][i] }), { x: 66 + i * 30, y: 220, a: 'gy', t: 30 + i * 6, d: 22 }, 'bar' + i));
  add(el(86, 86, { stroke: TH.cell, sw: 14 }), { x: 290, y: 150, t: 28, d: 12 }, 'ringbg');
  add(el(86, 86, { stroke: K.blue, sw: 14, draw: 40, to: 72, t: 34 }), { x: 290, y: 150, a: 'none', t: 34, rot: -90 }, 'ring1'); add(el(58, 58, { stroke: K.teal, sw: 10, draw: 34, to: 55, t: 44 }), { x: 290, y: 150, a: 'none', t: 44, rot: -90 }, 'ring2');
  add(path_([[0, 40], [30, 22], [60, 30], [90, 8], [124, -14]], false, { stroke: K.pink, sw: 3.5, draw: 46, t: 70 }), { x: 66, y: 98, a: 'none', t: 70 }, 'trend'); add(el(10, 10, { fill: K.pink }), { x: 190, y: 84, t: 112, d: 10 }, 'tip');
};
scene('dash', S_dash, LIGHT); scene('dk-dash', S_dash, THEMES.ocean);
// 4. guide: a short training video with steps that tick off
const S_guide = add => {
  PANEL(add);
  add(rr(214, 132, 14, { fill: TH.navy }), { x: 140, y: 112, t: 4, d: 14 }, 'video'); add(path_([[-10, -14], [-10, 14], [14, 0]], true, { fill: K.white }), { x: 144, y: 108, t: 18, d: 12 }, 'play');
  add(rr(214, 8, 4, { cx: 107, fill: TH.bar }), { x: 33, y: 200, a: 'gx', t: 24, d: 10 }, 'track'); add(rr(150, 8, 4, { cx: 75, fill: K.blue }), { x: 33, y: 200, a: 'gx', t: 34, d: 60 }, 'prog');
  [[0, K.teal], [1, K.blue], [2, K.pink]].forEach(([i, c]) => { const y = 78 + i * 52; add(rr(112, 40, 10, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 322, y, t: 40 + i * 14, d: 14 }, 'step' + i); add(el(22, 22, { fill: c }), { x: 284, y, t: 46 + i * 14, d: 12 }, 'sd' + i); ticker(add, 284, y, 54 + i * 14, K.white); add(rr(46, 6, 3, { cx: 23, fill: TH.bar }), { x: 304, y, a: 'gx', t: 50 + i * 14, d: 10 }, 'sl' + i); });
  add(rr(214, 40, 10, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 140, y: 244, t: 70, d: 14 }, 'tipbox'); add(star(10, { fill: K.pink }), { x: 168, y: 244, t: 78, d: 12, spin: 120 }, 'tipspark'); add(rr(84, 6, 3, { cx: 42, fill: TH.bar }), { x: 188, y: 244, a: 'gx', t: 84, d: 12 }, 'tiptext');
};
scene('guide', S_guide, LIGHT); scene('dk-guide', S_guide, THEMES.wine);
// 5. building: a facility rises, windows light up, a pin lands
const S_building = add => {
  PANEL(add);
  add(rr(320, 6, 3, { cx: 160, fill: TH.bar }), { x: 40, y: 246, a: 'gx', t: 2, d: 14 }, 'ground');
  [[88, 108, 112, TH.navy, 0], [166, 92, 150, K.blue, 8], [244, 92, 84, K.pink, 16]].forEach(([x, w, h, c, d], i) => { add(rr(w, h, 6, { cy: -h / 2, fill: c }), { x: x + 24 + (i === 1 ? 0 : 0), y: 246, a: 'gy', t: 8 + d, d: 26 }, 'b' + i); const cols = Math.floor(w / 28), rows = Math.floor(h / 34); for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) add(rr(14, 14, 3, { fill: (r + q) % 3 ? K.sky : K.white }), { x: x + 24 - w / 2 + 22 + q * 26 + (w % 28) / 2 - 4, y: 246 - 22 - r * 34, t: 38 + i * 6 + r * 5 + q * 3, d: 10 }, 'w'); });
  add(gear(18, { fill: K.teal }), { x: 330, y: 70, t: 60, d: 14, spin: 360 }, 'gear'); add(el(14, 14, { fill: TH.cell }), { x: 330, y: 70, t: 62, d: 12, spin: 360 }, 'gearhole');
  add(path_([[0, 0], [-12, -22], [-6, -34], [0, -36], [6, -34], [12, -22]], true, { fill: K.pink }), { x: 166, y: 64, a: 'drop', t: 88, d: 24 }, 'pin'); add(el(8, 8, { fill: K.white }), { x: 166, y: 40, a: 'drop', t: 88, d: 24 }, 'pinhole');
};
scene('building', S_building, LIGHT); scene('dk-building', S_building, THEMES.teal);
// 6. connect: modules around a hub exchange data
const S_connect = add => {
  PANEL(add);
  const sats = [[84, 70, K.blue], [200, 40, K.teal], [316, 70, K.pink], [84, 230, K.pink], [200, 262, K.blue], [316, 230, K.teal]];
  sats.forEach(([x, y, c], i) => { const dx = x - 200, dy = y - 150; add(path_([[0, 0], [dx, dy]], false, { stroke: TH.stroke, sw: 2.5, draw: 16, t: 20 + i * 6 }), { x: 200, y: 150, a: 'none', t: 20 + i * 6 }, 'ln' + i); });
  add(el(78, 78, { fill: TH.navy }), { x: 200, y: 150, t: 6, d: 16 }, 'hub'); add(star(20, { fill: K.white }), { x: 200, y: 150, t: 14, d: 14, spin: 120 }, 'hubspark');
  sats.forEach(([x, y, c], i) => { add(rr(54, 40, 10, { fill: c }), { x, y, t: 14 + i * 6, d: 14 }, 'm' + i); add(rr(28, 5, 2.5, { cx: 14, fill: K.white, fo: 80 }), { x: x - 14, y: y - 4, a: 'gx', t: 24 + i * 6, d: 10 }, 'ml' + i); add(rr(18, 5, 2.5, { cx: 9, fill: K.white, fo: 55 }), { x: x - 14, y: y + 6, a: 'gx', t: 28 + i * 6, d: 10 }, 'ml2' + i); });
  sats.forEach(([x, y, c], i) => add(el(9, 9, { fill: K.white, stroke: c, sw: 2.5 }), { x: 200, y: 150, a: 'none', t: 64 + i * 6, move: [[64 + i * 6, 200, 150], [92 + i * 6, x, y], [96 + i * 6, x, y], [124 + i * 6, 200, 150]] }, 'pk' + i));
};
scene('connect', S_connect, LIGHT); scene('dk-connect', S_connect, THEMES.iris);
// 7. launch: a go-live rocket lifts off
const S_launch = add => {
  PANEL(add);
  [[60, 60], [330, 50], [300, 120], [110, 130], [350, 190]].forEach(([x, y], i) => add(star(7, { fill: i % 2 ? K.pink : K.teal }), { x, y, t: 8 + i * 8, d: 12, spin: 90 }, 'star' + i));
  add(rr(130, 12, 4, { fill: TH.navy }), { x: 200, y: 262, t: 2, d: 14 }, 'pad'); add(rr(6, 70, 3, { cy: -35, fill: TH.bar }), { x: 152, y: 256, a: 'gy', t: 6, d: 16 }, 'tower');
  const up = [[20, 0], [60, -10], [140, -90]]; const rk = (items, nm, ox = 0, oy = 0, t = 22) => add(items, { x: 200 + ox, y: 214 + oy, t, a: 'none', move: [[t, 200 + ox, 214 + oy], [t + 50, 200 + ox, 206 + oy], [t + 120, 200 + ox, 70 + oy], [OP - 3, 200 + ox, 62 + oy]] }, nm);
  rk(path_([[0, -46], [16, -18], [16, 26], [-16, 26], [-16, -18]], true, { fill: TH.card, stroke: TH.stroke, sw: 2 }), 'body'); rk(path_([[0, -46], [16, -18], [-16, -18]], true, { fill: K.pink }), 'nose'); rk(el(14, 14, { fill: K.blue, cy: -2 }), 'window');
  rk(path_([[-16, 8], [-30, 30], [-16, 26]], true, { fill: K.blue }), 'finl'); rk(path_([[16, 8], [30, 30], [16, 26]], true, { fill: K.blue }), 'finr');
  rk(path_([[-10, 28], [0, 58], [10, 28]], true, { fill: K.pink }), 'flame', 0, 0, 40); rk(path_([[-5, 28], [0, 44], [5, 28]], true, { fill: '#FFD166' }), 'flame2', 0, 0, 40);
  [[150, 250], [250, 252], [200, 256]].forEach(([x, y], i) => add(el(34, 18, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x, y, t: 56 + i * 6, a: 'none', move: [[56 + i * 6, x, y], [OP - 4, x + (i - 1) * 16, y + 40]] }, 'cloud' + i));
};
scene('launch', S_launch, LIGHT); scene('dk-launch', S_launch, THEMES.plum);

// ---- AI assistance moments: an input becomes structured output, with a person reviewing at the end ----
// Shared frame: input card (left), AI spark (centre), output card (right), a "review" tick that appears last.
const aiScene = (name, inFn, outFn, accent = K.blue, th = THEMES.iris) => scene(name, add => {
  PANEL(add);
  add(rr(118, 196, 14, { fill: TH.card, stroke: TH.stroke, sw: 2 }), { x: 76, y: 150, t: 2, d: 14 }, 'in-card');
  add(rr(126, 196, 14, { fill: TH.card, stroke: accent, sw: 2.5 }), { x: 322, y: 150, t: 36, d: 14 }, 'out-card');
  inFn(add);
  add(path_([[0, 0], [38, 0]], false, { stroke: K.sky, sw: 3, draw: 14, t: 24 }), { x: 140, y: 150, a: 'none', t: 24 }, 'in-link');
  add(el(56, 56, { fill: TH.navy }), { x: 200, y: 150, t: 20, d: 16 }, 'orb'); add(star(17, { fill: K.white }), { x: 200, y: 150, t: 26, d: 14, spin: 180 }, 'spark');
  add(el(78, 78, { stroke: accent, sw: 2.5 }), { x: 200, y: 150, a: 'pop', t: 30, d: 20 }, 'halo');
  add(path_([[0, 0], [38, 0]], false, { stroke: accent, sw: 3, draw: 14, t: 44 }), { x: 230, y: 150, a: 'none', t: 44 }, 'out-link');
  outFn(add);
  add(el(40, 40, { fill: K.teal }), { x: 322, y: 262, t: 112, d: 14 }, 'review'); ticker(add, 322, 262, 120, K.white);
}, th);
const note = (add, x, y, c, r, t) => add(rr(30, 30, 5, { fill: c }), { x, y, t, d: 12, rot: r }, 'note');
const rows = (add, x, y, widths, t, c = TH.bar, step = 18, h = 7) => widths.forEach((w, i) => add(rr(w, h, h / 2, { cx: w / 2, fill: i === 0 ? K.blue : c }), { x, y: y + i * step, a: 'gx', t: t + i * 8, d: 10 }, 'row'));
// 7. workshop notes become draft requirements
aiScene('ai-notes', add => { [[48, 98, K.pink, -12], [90, 112, K.sky, 8], [60, 148, K.teal, 6], [98, 170, K.blue, -9], [52, 200, K.sky, 12], [92, 214, K.pink, -6]].forEach(([x, y, c, r], i) => note(add, x, y, c, r, 8 + i * 3)); },
  add => { add(rr(70, 10, 5, { cx: 35, fill: K.blue }), { x: 276, y: 82, a: 'gx', t: 50, d: 10 }, 'h'); rows(add, 276, 106, [96, 84, 98, 70], 58); rows(add, 276, 186, [90, 76, 88], 92); }, K.blue, THEMES.iris);

// 8. requirements organised into structured information
aiScene('ai-req', add => { [[40, 96, 34], [86, 106, 26], [52, 140, 40], [100, 152, 28], [44, 186, 30], [92, 200, 36], [60, 226, 28]].forEach(([x, y, w], i) => add(rr(w, 14, 7, { fill: [K.sky, K.pink, K.teal, K.blue][i % 4], fo: 85 }), { x, y, t: 8 + i * 3, d: 12, rot: (i % 2 ? 8 : -8) }, 'chip')); },
  add => { [0, 1, 2, 3].forEach(i => { add(rr(104, 28, 7, { fill: TH.cell }), { x: 322, y: 92 + i * 38, a: 'gx', t: 52 + i * 9, d: 10 }, 'cell'); add(rr(14, 14, 4, { fill: [K.blue, K.pink, K.teal, K.sky][i] }), { x: 288, y: 92 + i * 38, t: 58 + i * 9, d: 10 }, 'dot'); add(rr(52, 6, 3, { cx: 26, fill: TH.bar }), { x: 302, y: 92 + i * 38, a: 'gx', t: 60 + i * 9, d: 10 }, 'ln'); }); }, K.pink, THEMES.plum);

// 9. configuration information becomes a clear summary
aiScene('ai-config', add => { [[50, 100], [98, 124], [52, 156], [100, 182], [58, 214]].forEach(([x, y], i) => add(gear(i % 2 ? 11 : 14, { fill: [K.sky, K.blue, K.teal][i % 3], fo: 90 }), { x, y, t: 8 + i * 4, d: 12, spin: i % 2 ? 90 : -90 }, 'gear')); },
  add => { add(rr(76, 10, 5, { cx: 38, fill: TH.navy }), { x: 276, y: 84, a: 'gx', t: 50, d: 10 }, 'h'); [[88, K.blue], [64, K.teal], [96, K.pink], [52, K.sky]].forEach(([w, c], i) => { add(rr(96, 8, 4, { cx: 48, fill: TH.cell }), { x: 276, y: 114 + i * 26, a: 'none', t: 54 + i * 8 }, 'track'); add(rr(w, 8, 4, { cx: w / 2, fill: c }), { x: 276, y: 114 + i * 26, a: 'gx', t: 58 + i * 8, d: 14 }, 'fill'); }); }, K.teal, THEMES.plum);

// 10. UAT results grouped into actionable findings
aiScene('ai-uat', add => { [[44, 98], [76, 104], [108, 98], [50, 134], [86, 140], [112, 130], [42, 172], [74, 178], [106, 170], [58, 210], [92, 214]].forEach(([x, y], i) => add(el(14, 14, { fill: i % 4 === 1 ? K.pink : i % 7 === 5 ? '#F5A524' : K.teal }), { x, y, t: 6 + i * 2, d: 10 }, 'res')); },
  add => { [[K.pink, 'High', 60], [K.blue, 'Medium', 84], [K.teal, 'Pass', 102]].forEach(([c, _, w], i) => { add(rr(104, 44, 9, { fill: TH.cell }), { x: 322, y: 100 + i * 52, a: 'gx', t: 54 + i * 10, d: 10 }, 'bucket'); add(rr(8, 44, 4, { fill: c }), { x: 273, y: 100 + i * 52, a: 'gy', t: 56 + i * 10, d: 10 }, 'bar'); add(rr(w * .6, 6, 3, { cx: w * .3, fill: TH.bar }), { x: 288, y: 94 + i * 52, a: 'gx', t: 62 + i * 10, d: 10 }, 'l1'); add(rr(w * .4, 6, 3, { cx: w * .2, fill: TH.bar }), { x: 288, y: 108 + i * 52, a: 'gx', t: 66 + i * 10, d: 10 }, 'l2'); }); }, K.pink, THEMES.wine);

// 11. training content becomes step-by-step guidance
aiScene('ai-train', add => { add(rr(86, 62, 8, { fill: K.sky, fo: 55 }), { x: 76, y: 112, t: 8, d: 12 }, 'screen'); add(path_([[-9, -12], [11, 0], [-9, 12]], true, { fill: K.white }), { x: 78, y: 112, t: 14, d: 10 }, 'play'); rows(add, 40, 172, [72, 60, 80, 48], 18, K.line, 16, 6); },
  add => { [0, 1, 2].forEach(i => { add(el(24, 24, { fill: [K.blue, K.pink, K.teal][i] }), { x: 288, y: 96 + i * 48, t: 52 + i * 12, d: 12 }, 'step'); add(rr(8, 8, 2, { fill: K.white }), { x: 288, y: 96 + i * 48, t: 58 + i * 12, d: 8 }, 'n'); add(rr(64, 7, 3.5, { cx: 32, fill: TH.navy }), { x: 304, y: 90 + i * 48, a: 'gx', t: 58 + i * 12, d: 10 }, 't1'); add(rr(52, 6, 3, { cx: 26, fill: TH.bar }), { x: 304, y: 104 + i * 48, a: 'gx', t: 62 + i * 12, d: 10 }, 't2'); }); }, K.blue, THEMES.ocean);

// 12. delivery progress summarised into a clear project view
aiScene('ai-progress', add => { [[44, 190, 30], [70, 170, 50], [96, 200, 20], [50, 130, 36], [90, 118, 28], [60, 224, 18]].forEach(([x, y, h], i) => add(rr(14, h, 4, { fill: [K.sky, K.pink, K.blue][i % 3], fo: 80 }), { x, y, t: 8 + i * 3, d: 12, rot: i % 2 ? 5 : -5 }, 'frag')); },
  add => { add(el(54, 54, { stroke: TH.cell, sw: 10 }), { x: 296, y: 106, a: 'none', t: 50 }, 'ring0'); add(el(54, 54, { stroke: K.blue, sw: 10, draw: 24, t: 54, to: 72 }), { x: 296, y: 106, a: 'none', t: 54, rot: -90 }, 'ring'); [0, 1, 2, 3].forEach(i => add(rr(16, [30, 44, 36, 56][i], 4, { cy: -[15, 22, 18, 28][i], fill: [K.sky, K.blue, K.teal, K.pink][i] }), { x: 272 + i * 24, y: 218, a: 'gy', t: 70 + i * 8, d: 12 }, 'b')); }, K.teal, THEMES.teal);
