// Skyline: buildings rise out of the ground in a wave, dip and rise again (up and down), windows light in sequence,
// sun rises behind them, a crane works, a car passes, clouds drift. Loops cleanly. Run: node tools/make-skyline.mjs
import fs from 'node:fs'; import path from 'node:path';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'brand', 'lottie');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const K = { navy: '#1D1A5E', blue: '#1570EF', pink: '#E5197F', teal: '#2EC9C4', sky: '#8DB8FF', cloud: '#E3ECFA', line: '#C5D2E8', warm: '#FFD166', white: '#FFFFFF' };
const W = 480, H = 250, G = 206, OP = 180;
const SP = { i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } };            // springy out
const IO = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } };           // smooth in-out
const IN = { i: { x: [0.7], y: [1] }, o: { x: [0.9], y: [0] } };             // accelerate (sinking)
const LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const S = v => ({ a: 0, k: v });
// keys: [frame, value, easeForSegmentStartingHere]
const kf = keys => ({ a: 1, k: keys.map(([t, v, e], i) => { const k = { t, s: Array.isArray(v) ? v : [v] }; if (i < keys.length - 1) Object.assign(k, e || IO); return k; }) });
const paint = o => { const r = []; if (o.fill) r.push({ ty: 'fl', c: S([...hex(o.fill), 1]), o: S(o.fo ?? 100), r: 1 }); if (o.stroke) r.push({ ty: 'st', c: S([...hex(o.stroke), 1]), o: S(100), w: S(o.sw || 3), lc: 2, lj: 2 }); return r; };
const rc = (w, h, r, o = {}) => [{ ty: 'rc', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), r: S(r), d: 1 }, ...paint(o)];
const el = (w, h, o = {}) => [{ ty: 'el', p: S([o.cx || 0, o.cy || 0]), s: S([w, h]), d: 1 }, ...paint(o)];
const ln = (pts, o = {}) => [{ ty: 'sh', ks: S({ i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), v: pts, c: false }) }, ...paint(o)];
const tr = (o = {}) => ({ ty: 'tr', p: o.p || S([0, 0]), a: S([0, 0]), s: o.s || S([100, 100]), r: o.r || S(0), o: o.o || S(100), sk: S(0), sa: S(0) });
const gr = (items, t) => ({ ty: 'gr', it: [...items, t || tr()] });
const layer = (shapes, ks) => ({ ddd: 0, ind: 0, ty: 4, sr: 1, ks: { o: ks.o || S(100), r: ks.r || S(0), p: ks.p || S([0, 0, 0]), a: ks.a || S([0, 0, 0]), s: ks.s || S([100, 100, 100]) }, ao: 0, shapes: [...shapes].reverse(), ip: 0, op: OP, st: 0, bm: 0 });
const L = []; // bottom -> top

// sky glow behind everything (soft disc that breathes)
L.push(layer([gr([...el(220, 220, { fill: K.cloud, fo: 55 })])], { p: S([240, 150, 0]), s: kf([[0, [96, 96, 100]], [90, [106, 106, 100]], [180, [96, 96, 100]]]) }));
// clouds drift (linear, wrap) behind buildings
[[70, 56, 54, 0], [300, 36, 40, 60], [420, 84, 34, 120]].forEach(([x, y, w, d]) => {
  const c = [gr([...rc(w, w * .38, w * .19, { fill: K.cloud })]), gr([...el(w * .5, w * .5, { fill: K.cloud, cx: -w * .12, cy: -w * .12 })]), gr([...el(w * .36, w * .36, { fill: K.cloud, cx: w * .14, cy: -w * .08 })])];
  L.push(layer(c, { p: kf([[0, [x - 30, y, 0], LIN], [OP, [x + 30, y, 0]]]) }));
});

// ---- everything below sits in a precomp so a single static mask (the ground line) hides what is "underground" ----
const P = []; // precomp layers bottom -> top
// sun: rises from the ground behind the buildings, then sets, so the loop reads as one breath
P.push(layer([gr([...el(70, 70, { fill: K.warm })]), gr([...el(98, 98, { stroke: K.warm, sw: 2.5 })], tr({ o: kf([[0, 0], [50, 70, SP], [150, 70], [170, 0]]) }))], { p: kf([[0, [372, G + 60, 0], SP], [42, [372, 96, 0], IO], [100, [372, 88, 0], IN], [172, [372, G + 60, 0]]]) }));
const B = [ // cx, w, h, fill, cols, rows, extra
  [58, 50, 70, K.blue, 2, 3], [112, 44, 104, K.navy, 2, 5, 'ant'], [168, 56, 82, K.pink, 3, 4], [232, 50, 138, K.blue, 2, 6, 'crane'],
  [292, 56, 96, K.navy, 3, 5], [350, 44, 64, K.teal, 2, 3, 'tank'], [404, 52, 112, K.pink, 2, 5, 'ant'], [452, 40, 76, K.blue, 2, 4]];
B.forEach(([cx, w, h, c, cols, rows, extra], i) => {
  const t0 = 6 + i * 6, t1 = t0 + 30;                 // rise with overshoot
  const dip = 84 + i * 5;                              // second beat: dip and rise again
  const hid = G + h + 14, over = G - 7;                // hidden (below ground) and overshoot positions
  const items = [gr([...rc(w, h, 4, { fill: c, cy: -h / 2 })]), gr([...rc(w + 8, 6, 2, { fill: c, cy: -h - 3 })], tr({ o: S(100) })), gr([...rc(w - 10, 6, 2, { fill: K.white, fo: 22, cy: -h + 14 })])];
  if (extra === 'ant') items.push(gr([...ln([[0, -h - 6], [0, -h - 26]], { stroke: c, sw: 3 })]), gr([...el(8, 8, { fill: K.pink, cy: -h - 28 })], tr({ o: kf([[0, 100, LIN], [20, 20, LIN], [40, 100, LIN], [60, 20, LIN], [80, 100, LIN], [100, 20, LIN], [120, 100, LIN], [140, 20, LIN], [160, 100, LIN], [180, 20]]) })));
  if (extra === 'tank') items.push(gr([...rc(22, 14, 3, { fill: K.navy, cy: -h - 16 })]), gr([...ln([[-6, -h - 8], [-6, -h - 2], [6, -h - 8], [6, -h - 2]], { stroke: K.navy, sw: 2 })]));
  // windows light in a diagonal sweep once the building is up, and go dark as it sinks
  const gx = (w - 14) / cols, gy = (h - 34) / rows;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const on = t1 + 2 + (r + q) * 4 + (i % 3) * 2, lit = (r * 7 + q * 3 + i) % 4 !== 0;
    const o = kf([[0, 0, LIN], [on, 0, LIN], [on + 5, lit ? 100 : 40, LIN], [dip + 6, lit ? 100 : 40, LIN], [dip + 10, 30, LIN], [dip + 24, lit ? 100 : 40, LIN], [150 + i * 3, lit ? 100 : 40, LIN], [158 + i * 3, 0]]);
    items.push(gr([...rc(Math.min(gx * .55, 12), Math.min(gy * .5, 12), 2, { fill: lit ? K.warm : K.white, cx: -w / 2 + 7 + gx * q + gx / 2, cy: -h + 28 + gy * r + gy / 2 })], tr({ o })));
  }
  if (extra === 'crane') { // tower crane: arm sways, hook line pays out
    items.push(gr([...ln([[0, -h - 4], [0, -h - 46]], { stroke: K.navy, sw: 3 })]));
    items.push(gr([...ln([[-34, -h - 46], [44, -h - 46]], { stroke: K.pink, sw: 3.5 }), ...ln([[40, -h - 46], [40, -h - 30]], { stroke: K.navy, sw: 1.5 })], tr({ r: kf([[0, 0], [60, -2, SP], [120, 2.5], [180, 0]]), p: S([0, 0]) })));
  }
  const ks = { p: kf([[0, [cx, hid, 0], SP], [t0, [cx, hid, 0], SP], [t1, [cx, over, 0], IO], [t1 + 8, [cx, G, 0], IO], [dip, [cx, G, 0], IN], [dip + 14, [cx, G + 26 + (i % 3) * 10, 0], SP], [dip + 36, [cx, G - 4, 0], IO], [dip + 44, [cx, G, 0], IN], [148 + i * 3, [cx, G, 0], IN], [172, [cx, hid, 0]]]) };
  P.push(layer(items, ks));
});
// ground details inside precomp (above buildings so bases are clean)
P.push(layer([gr([...ln([[0, G + 1], [W, G + 1]], { stroke: K.line, sw: 3 })])], {}));
// car passes along the ground
P.push(layer([gr([...rc(26, 9, 4, { fill: K.navy, cy: -5 })]), gr([...rc(14, 7, 3, { fill: K.sky, cy: -11 })]), gr([...el(6, 6, { fill: K.white, cx: -7, cy: -2 }), ...el(6, 6, { fill: K.white, cx: 7, cy: -2 })])], { p: kf([[0, [-40, G - 1, 0], LIN], [OP, [W + 40, G - 1, 0]]]) }));
P.reverse(); P.forEach((l, i) => l.ind = i + 1);

const mask = { inv: false, mode: 'a', pt: { a: 0, k: { i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[0, 0], [W, 0], [W, G + 3], [0, G + 3]], c: true } }, o: S(100), x: S(0), nm: 'ground' };
const pre = { ddd: 0, ind: 0, ty: 0, refId: 'city', sr: 1, ks: { o: S(100), r: S(0), p: S([0, 0, 0]), a: S([0, 0, 0]), s: S([100, 100, 100]) }, ao: 0, w: W, h: H, ip: 0, op: OP, st: 0, bm: 0, hasMask: true, masksProperties: [mask] };
L.reverse(); L.unshift(pre); // clouds/glow stay behind: put precomp on top of them
const main = [...L.slice(1), pre].map((l, i) => (l.ind = i + 1, l));
// order for lottie: index 1 is the topmost. glow+clouds must be below the precomp, so precomp first.
const layers = [pre, ...L.slice(1)].map((l, i) => (l.ind = i + 1, l));
const j = { v: '5.7.0', fr: 30, ip: 0, op: OP, w: W, h: H, nm: 'skyline', ddd: 0, assets: [{ id: 'city', layers: P }], layers };
fs.writeFileSync(path.join(out, 'scene-skyline.json'), JSON.stringify(j)); console.log('scene-skyline', (JSON.stringify(j).length / 1024).toFixed(1) + ' KB');
