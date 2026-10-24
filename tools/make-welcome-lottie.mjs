// Custom Lottie animations for the customer introduction page (#/welcome). Run: node tools/make-welcome-lottie.mjs
// One animation per customer benefit: organise information, see progress, coordinate activities, be ready to go live.
// Brand colours only. Each plays once, when its section scrolls into view, and rests on a complete final frame.
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
const W = 400, H = 240, FR = 30, OP = 120, LINE = '#D0D5DD', INK = '#1D1A5E', MUT = '#98A2B3';
// Bodymovin paints the first item on top, so shapes and layers are written bottom-to-top and reversed here.
const BASE = (ind, nm, shapes, ks) => layer(ind, shapes.slice().reverse(), ks, OP, nm);
const compR = (nm, w, h, fr, op, L) => comp(nm, w, h, fr, op, L.slice().reverse());
const pop = (t, y0 = 0) => P([[t, [70, 70, 100]], [t + 10, [108, 108, 100]], [t + 16, [100, 100, 100]]]);
const fade = t => P([[t, 0], [t + 8, 100]]);
const tick = (s = 1) => ({ ty: 'sh', ks: S({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-5 * s, 0], [-1.5 * s, 4 * s], [5.5 * s, -4 * s]], c: false }) });
const line = (x1, y1, x2, y2) => ({ ty: 'sh', ks: S({ i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], v: [[x1, y1], [x2, y2]], c: false }) });
const docShapes = (col, w = 74, h = 48) => [
  grp([rect(w, h, 6), fill('#FFFFFF'), stroke(LINE, 1.5)]),
  grp([rect(5, h, 2.5, [-w / 2 + 2.5, 0]), fill(col)]),
  grp([rect(36, 4, 2, [-w / 2 + 28, -6]), fill('#CDD7EC')]),
  grp([rect(24, 4, 2, [-w / 2 + 22, 5]), fill('#E4E7EC')])
];

// 1. organise: six scattered documents slide into a tidy workspace, then a tick confirms it
{
  const cols = [C.pink, C.blue, C.teal, '#6B4EE6', C.blue, C.pink], L = []; let n = 1;
  const scat = [[48, 52, -18], [350, 40, 14], [40, 188, 12], [356, 192, -12], [205, 28, 8], [200, 214, -9]];
  const dest = [[120, 96], [200, 96], [280, 96], [120, 158], [200, 158], [280, 158]];
  L.push(BASE(n++, 'frame', [grp([rect(280, 150, 12), stroke(C.blue, 2.5, P([[8, 0], [30, 100]]))]),], { p: POS(200, 127), s: P([[8, [90, 90, 100]], [30, [100, 100, 100]]]) }));
  cols.forEach((c, i) => { const t0 = 4 + i * 4, [sx, sy, sr] = scat[i], [dx, dy] = dest[i];
    L.push(BASE(n++, 'doc' + i, docShapes(c), { p: P([[0, [sx, sy, 0]], [t0 + 14, [sx, sy, 0]], [t0 + 52, [dx, dy, 0]]]), r: P([[0, sr], [t0 + 14, sr], [t0 + 52, 0]]), o: P([[0, 0], [t0 + 6, 100]]), s: P([[0, [80, 80, 100]], [t0 + 14, [92, 92, 100]], [t0 + 52, [100, 100, 100]]]) })); });
  L.push(BASE(n++, 'ok', [grp([ell(34), fill(C.blue)]), grp([tick(1.4), stroke(C.white, 3.2), trim(S(0), P([[88, 0], [100, 100]], LIN))])], { p: POS(318, 52), s: pop(84) , o: P([[0, 0], [84, 0], [85, 100]]) }));
  save('welcome-organise', compR('organise', W, H, FR, OP, L));
}
// 2. visibility: three KPI cards assemble and their progress bars fill
{
  const L = []; let n = 1; const rows = [[C.blue, 'Delivery progress', 74], [C.teal, 'Pending activities', 38], [C.pink, 'Go-live readiness', 88]];
  rows.forEach(([c, nm, pct], i) => { const t0 = 6 + i * 14, y = 52 + i * 62, bw = 190;
    L.push(BASE(n++, 'k' + i, [
      grp([rect(320, 50, 8), fill('#FFFFFF'), stroke(LINE, 1.5)]), grp([rect(4, 50, 2, [-158, 0]), fill(c)]),
      grp([rect(86, 5, 2.5, [-100, -10]), fill('#667085')]),
      grp([rect(bw, 8, 4, [bw / 2 - 150, 10]), fill('#EAECF0')]),
      grp([rect(bw * pct / 100, 8, 4, [bw * pct / 200, 0]), fill(c)], tr({ p: S([-150, 10]), s: P([[t0 + 8, [0, 100]], [t0 + 40, [100, 100]]]) })),
      grp([rect(34, 8, 4, [128, 6]), fill(INK)], tr({ o: P([[t0 + 30, 0], [t0 + 40, 100]]) }))
    ], { p: P([[t0, [200, y + 20, 0]], [t0 + 16, [200, y, 0]]]), o: P([[t0, 0], [t0 + 12, 100]]) })); });
  L.push(BASE(n++, 'badge', [grp([rect(112, 24, 12), fill(C.blue)]), grp([rect(64, 5, 2.5), fill('#FFFFFF')])], { p: POS(200, 222), s: pop(78), o: P([[0, 0], [78, 0], [79, 100]]) }));
  save('welcome-visibility', compR('visibility', W, H, FR, OP, L));
}
// 3. coordinate: workflow nodes connect, a task travels along the line and each node is completed in turn
{
  const L = []; let n = 1; const xs = [56, 152, 248, 344], y = 120, cols = [C.blue, C.pink, C.teal, '#6B4EE6'], gap = 24;
  xs.slice(0, 3).forEach((x, i) => { const t0 = 14 + i * 22;
    L.push(BASE(n++, 'ln' + i, [grp([line(x + gap, 0, xs[i + 1] - gap, 0), stroke(LINE, 4), trim(S(0), P([[t0, 0], [t0 + 14, 100]], LIN))]), grp([line(x + gap, 0, xs[i + 1] - gap, 0), stroke(C.blue, 4), trim(S(0), P([[t0 + 14, 0], [t0 + 30, 100]], LIN))])], { p: POS(0, y) })); });
  L.push(BASE(n++, 'task', [grp([ell(22), fill(C.pink, 22)]), grp([ell(12), fill(C.pink)])], { p: P([[14, [xs[0] + 20, y, 0]], [36, [xs[1] - 20, y, 0]], [58, [xs[2] - 20, y, 0]], [80, [xs[3] - 20, y, 0]], [88, [xs[3] - 20, y, 0]]]), o: P([[0, 0], [14, 0], [16, 100], [86, 100], [90, 0]]) }));
  xs.forEach((x, i) => { const t0 = 4 + i * 22;
    L.push(BASE(n++, 'nd' + i, [grp([ell(40), fill('#FFFFFF'), stroke(i === 3 ? LINE : cols[i], 3)]), grp([ell(22), fill(cols[i])], tr({ o: P([[t0 + 28, 0], [t0 + 38, i === 3 ? 0 : 100]]) })), grp([tick(1.2), stroke(C.white, 3), trim(S(0), P([[t0 + 34, 0], [t0 + 46, i === 3 ? 0 : 100]], LIN))])], { p: POS(x, y), s: pop(t0), o: fade(t0) }));
    L.push(BASE(n++, 'lb' + i, [grp([rect(46 + (i % 2) * 10, 5, 2.5), fill('#98A2B3')])], { p: POS(x, y + 42), o: fade(t0 + 6) })); });
  L.push(BASE(n++, 'goal', [grp([ell(52), stroke(C.blue, 2.5, P([[84, 0], [92, 70]]))], tr({ s: P([[84, [80, 80]], [96, [118, 118]]]), o: P([[84, 100], [100, 0]]) }))], { p: POS(xs[3], y) }));
  save('welcome-coordinate', compR('coordinate', W, H, FR, OP, L));
}
// 4. go live: readiness checklist ticks off, the readiness ring completes, "Ready" confirms
{
  const L = []; let n = 1; const rows = [C.blue, C.teal, '#6B4EE6', C.pink];
  rows.forEach((c, i) => { const t0 = 6 + i * 16, y = 56 + i * 42;
    L.push(BASE(n++, 'r' + i, [grp([rect(196, 32, 8), fill('#FFFFFF'), stroke(LINE, 1.5)]), grp([ell(18), fill(c)], tr({ p: S([-80, 0]), o: P([[t0 + 10, 0], [t0 + 18, 100]]) })), grp([ell(18), stroke(LINE, 2)], tr({ p: S([-80, 0]), o: P([[t0 + 10, 100], [t0 + 18, 0]]) })), grp([tick(0.9), stroke(C.white, 2.6), trim(S(0), P([[t0 + 14, 0], [t0 + 24, 100]], LIN))], tr({ p: S([-80, 0]) })), grp([rect(86, 5, 2.5, [-6, 0]), fill('#CDD7EC')])], { p: P([[t0, [110, y + 12, 0]], [t0 + 12, [110, y, 0]]]), o: P([[t0, 0], [t0 + 10, 100]]) })); });
  L.push(BASE(n++, 'ring0', [grp([ell(110), stroke('#EAECF0', 10)])], { p: POS(310, 100) }));
  L.push(BASE(n++, 'ring', [grp([ell(110), stroke(C.blue, 10), trim(S(0), P([[16, 0], [84, 100]]))])], { p: POS(310, 100), r: S(-90) }));
  L.push(BASE(n++, 'tickbig', [grp([tick(3.2), stroke(C.blue, 7), trim(S(0), P([[84, 0], [98, 100]], LIN))])], { p: POS(310, 100) }));
  L.push(BASE(n++, 'pill', [grp([rect(104, 26, 13), fill(C.pink)]), grp([rect(58, 5, 2.5), fill('#FFFFFF')])], { p: POS(310, 184), s: pop(94), o: P([[0, 0], [94, 0], [95, 100]]) }));
  save('welcome-golive', compR('golive', W, H, FR, OP, L));
}
