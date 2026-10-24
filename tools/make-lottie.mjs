// Generates the small Lottie (Bodymovin JSON) animations used by the opening and roadmap introductions.
// Authored in code so they use the Facilio brand colours exactly; played by the vendored lottie-web light player.
// Run: node tools/make-lottie.mjs  (writes public/brand/lottie/*.json)
import fs from 'node:fs'; import path from 'node:path';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'brand', 'lottie'); fs.mkdirSync(out, { recursive: true });
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const C = { navy: '#1D1A5E', blue: '#1570EF', pink: '#E5197F', teal: '#2EC9C4', white: '#FFFFFF', sky: '#8DB8FF' };
const EASE = { i: { x: [0.3], y: [1] }, o: { x: [0.7], y: [0] } }; const LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
// animated or static property. keys: [[frame, value]] value number or array
const P = (keys, ease = EASE) => { if (!Array.isArray(keys[0])) return { a: 0, k: keys }; return { a: 1, k: keys.map(([t, v], i) => { const s = Array.isArray(v) ? v : [v]; const k = { t, s }; if (i < keys.length - 1) Object.assign(k, ease); return k; }) }; };
const S = v => ({ a: 0, k: v });
const tr = (o = {}) => ({ ty: 'tr', p: o.p || S([0, 0]), a: o.a || S([0, 0]), s: o.s || S([100, 100]), r: o.r || S(0), o: o.o || S(100), sk: S(0), sa: S(0) });
const ell = (w, h = w, p = [0, 0]) => ({ ty: 'el', p: S(p), s: S([w, h]), d: 1 });
const rect = (w, h, r = 0, p = [0, 0]) => ({ ty: 'rc', p: S(p), s: S([w, h]), r: S(r), d: 1 });
const fill = (c, o = 100) => ({ ty: 'fl', c: S([...hex(c), 1]), o: typeof o === 'object' ? o : S(o), r: 1 });
const stroke = (c, w, o = 100) => ({ ty: 'st', c: S([...hex(c), 1]), o: typeof o === 'object' ? o : S(o), w: S(w), lc: 2, lj: 2 });
const trim = (s, e, o = 0) => ({ ty: 'tm', s, e, o: S(o), m: 1 });
const grp = (items, t, nm = 'g') => ({ ty: 'gr', it: [...items, t || tr()], nm });
const layer = (ind, shapes, ks = {}, op = 90, nm = 'l') => ({ ddd: 0, ind, ty: 4, nm, sr: 1, ks: { o: ks.o || S(100), r: ks.r || S(0), p: ks.p || S([0, 0, 0]), a: ks.a || S([0, 0, 0]), s: ks.s || S([100, 100, 100]) }, ao: 0, shapes, ip: 0, op, st: 0, bm: 0 });
const comp = (nm, w, h, fr, op, layers) => ({ v: '5.7.0', fr, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers });
const save = (name, j) => { fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(j)); console.log(name, (JSON.stringify(j).length / 1024).toFixed(1) + ' KB'); };
const POS = (x, y) => S([x, y, 0]);

// 1. burst: three rings expand and fade, and 16 brand-coloured squares fly outward (logo reveal)
{
  const W = 400, op = 60, L = []; let n = 1; const cols = [C.pink, C.teal, C.blue, C.white];
  [[C.blue, 0], [C.pink, 4], [C.teal, 8]].forEach(([c, d]) => L.push(layer(n++, [grp([ell(100), stroke(c, 3, P([[d, 90], [d + 40, 0]])), ], tr({ s: P([[d, [20, 20]], [d + 40, [220, 220]]]) }))], { p: POS(200, 200) }, op)));
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, d = 120 + (i % 3) * 40, s = 7 + (i % 4) * 3, c = cols[i % 4], t0 = 2 + (i % 4) * 2;
    L.push(layer(n++, [grp([rect(s, s, 1.5), fill(c, 100)])], { p: P([[t0, [200, 200, 0]], [t0 + 38, [200 + Math.cos(a) * d, 200 + Math.sin(a) * d, 0]]]), r: P([[t0, 0], [t0 + 38, (i % 2 ? 1 : -1) * 160]]), o: P([[t0, 100], [t0 + 24, 100], [t0 + 40, 0]]), s: P([[t0, [30, 30, 100]], [t0 + 10, [100, 100, 100]], [t0 + 40, [40, 40, 100]]]) }, op));
  }
  save('burst', comp('burst', W, W, 30, op, L));
}
// 2. check: ring draws, then a tick draws, ring fills softly
{
  const tick = { ty: 'sh', ks: S({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-13, 1], [-4, 10], [14, -9]], c: false }) };
  const L = [layer(1, [grp([ell(64), fill(C.blue, P([[16, 0], [30, 100]]))])], { p: POS(50, 50), s: P([[0, [60, 60, 100]], [22, [108, 108, 100]], [32, [100, 100, 100]]]) }, 60),
  layer(2, [grp([ell(64), stroke(C.blue, 4), trim(S(0), P([[0, 0], [18, 100]], LIN))])], { p: POS(50, 50), r: S(-90) }, 60),
  layer(3, [grp([tick, stroke(C.white, 5.5), trim(S(0), P([[14, 0], [28, 100]], LIN))])], { p: POS(50, 50) }, 60)];
  L[2].shapes[0].it[1].lc = 2; save('check', comp('check', 100, 100, 30, 60, L));
}
// 3. orbit: a four-point AI spark pulsing at the centre with three brand dots orbiting it (loops)
{
  const op = 120, star = { ty: 'sh', ks: S({ i: Array(8).fill([0, 0]), o: Array(8).fill([0, 0]), v: [[0, -30], [7, -7], [30, 0], [7, 7], [0, 30], [-7, 7], [-30, 0], [-7, -7]], c: true }) };
  const L = [layer(1, [grp([star, fill(C.white)])], { p: POS(100, 100), s: P([[0, [70, 70, 100]], [60, [100, 100, 100]], [120, [70, 70, 100]]]), r: P([[0, 0], [120, 90]], LIN) }, op)];
  [[C.pink, 0, 70, 120], [C.teal, 120, 70, 120], [C.blue, 240, 70, 120]].forEach(([c, a0, rad, dur], i) => L.push(layer(i + 2, [grp([ell(12), fill(c)], tr({ p: S([rad, 0]) })), grp([ell(70, 70, [rad, 0]), fill(c, 0)], tr())], { p: POS(100, 100), r: P([[0, a0], [dur, a0 + 360]], LIN) }, op)));
  L.push(layer(5, [grp([ell(130), stroke(C.sky, 1.2, 35)])], { p: POS(100, 100) }, op));
  save('orbit', comp('orbit', 200, 200, 30, op, L));
}
// 4. pulse: concentric rings radiating (loops), used behind the primary button
{
  const op = 90, L = [0, 30, 60].map((d, i) => layer(i + 1, [grp([ell(100), stroke(C.blue, 2.5, P([[d % 90, 0], [(d % 90) + 8, 70], [(d % 90) + 60, 0]]))], tr({ s: P([[d % 90, [40, 40]], [(d % 90) + 60, [150, 150]]]) }))], { p: POS(100, 100) }, op));
  save('pulse', comp('pulse', 200, 200, 30, op, L));
}
// 5. bars: five bars grow with a rising line (a delivery view assembling)
{
  const op = 80, L = []; const hs = [38, 62, 46, 80, 100];
  hs.forEach((h, i) => L.push(layer(i + 1, [grp([rect(20, 60, 4, [0, -30]), fill([C.sky, C.blue, C.sky, C.blue, C.pink][i], 100)])], { p: POS(34 + i * 30, 160), s: P([[i * 5, [100, 0, 100]], [i * 5 + 26, [100, h * 1.45, 100]]]) }, op)));
  L.push(layer(6, [grp([{ ty: 'sh', ks: S({ i: Array(5).fill([0, 0]), o: Array(5).fill([0, 0]), v: [[34, 120], [64, 92], [94, 108], [124, 68], [154, 34]], c: false }) }, stroke(C.teal, 3.5), trim(S(0), P([[20, 0], [60, 100]], LIN))])], {}, op));
  save('bars', comp('bars', 200, 200, 30, op, L));
}
