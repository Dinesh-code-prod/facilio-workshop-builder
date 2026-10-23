/* SVG diagrams in the Facilio State Flow Builder style (facilio-setup StateFlowsBuilder/elements):
   states 135×30 r3, text/border #3995e2, default state #60a9a6, transitions as straight lines #3995e2 with a start dot and arrowhead,
   pill labels 110×26 r12.5 coloured by type (user #6071db, time #4eb871, condition #45bec4), active #FF6660.
   Presentation attributes are inline so the same SVG rasterises for the BRD. */
(function (root) {
  'use strict';
  const { esc } = root.FWB;
  const C = { line: '#3995e2', text: '#3995e2', initial: '#60a9a6', active: '#FF6660', user: '#6071db', time: '#4eb871', cond: '#45bec4', disabled: '#b5bcc6', proposedFill: '#f3f8fe', tbc: '#f5a623', removed: '#c4c4c4' };
  const FONT = 'Roboto, Helvetica, Arial, sans-serif';
  const PILL_W = 110, PILL_H = 26;

  function boxSize(label, full) { const n = String(label || '').length; return { w: full ? Math.max(135, Math.round(7.4 * n + 24)) : 135, h: 30 }; }
  function shortState(l) { l = String(l || ''); return l.length > 18 ? l.slice(0, 15) + '...' : l; }
  function wrap(text, n, max) { const words = String(text || '').split(/\s+/); const lines = []; let cur = ''; words.forEach(w => { if ((cur + ' ' + w).trim().length > n) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur); if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/.{0,2}$/, '…'); } return lines; }
  // 8 anchors: 0,1,2 top (left→right), 3 right-middle, 4,5,6 bottom (right→left), 7 left-middle — as in facilio-setup.
  function anchors(b) { const { x, y, w, h } = b; return [[x + w * .25, y], [x + w * .5, y], [x + w * .75, y], [x + w, y + h / 2], [x + w * .75, y + h], [x + w * .5, y + h], [x + w * .25, y + h], [x, y + h / 2]]; }
  const typeKind = t => t.type === 'automatic' ? 'cond' : /scheduled/.test(t.type) ? 'time' : 'user';

  function flowGeometry(model, opts) {
    opts = opts || {}; const full = !!opts.full;
    const st = {}; model.states.forEach(s => { const b = boxSize(s.label, full); st[s.id] = Object.assign({}, s, b, { x: s.x || 0, y: s.y || 0 }); });
    const live = model.transitions.filter(t => opts.showRemoved || !t.removed);
    const used = {}; const use = (sid, i) => { used[sid + ':' + i] = (used[sid + ':' + i] || 0) + 1; };
    const pairIdx = {};
    const edges = live.map(t => {
      const a = st[t.from], b = st[t.to]; if (!a || !b) return null;
      const k = [t.from, t.to].sort().join('|'); const pi = pairIdx[k] = (pairIdx[k] || 0) + 1;
      if (t.from === t.to) { // self transition: straight orthogonal loop above the state's right side
        const x1 = a.x + a.w * .75, y1 = a.y, x2 = a.x + a.w, y2 = a.y + a.h / 2; const up = 22 + pi * 10, out = 26 + pi * 10;
        const pts = [[x1, y1], [x1, y1 - up], [x2 + out, y1 - up], [x2 + out, y2], [x2, y2]];
        return { t, pts, lx: x2 + out, ly: y1 - up, kind: typeKind(t) };
      }
      const A = anchors(a), Bn = anchors(b); let best = null;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const d = Math.hypot(A[i][0] - Bn[j][0], A[i][1] - Bn[j][1]) + 45 * ((used[t.from + ':' + i] || 0) + (used[t.to + ':' + j] || 0)); if (!best || d < best.d) best = { d, i, j }; }
      use(t.from, best.i); use(t.to, best.j);
      const p1 = A[best.i], p2 = Bn[best.j]; const tt = pi > 1 ? (pi % 2 ? 0.38 : 0.62) : 0.5;
      return { t, pts: [p1, p2], lx: p1[0] + (p2[0] - p1[0]) * tt, ly: p1[1] + (p2[1] - p1[1]) * tt, kind: typeKind(t) };
    }).filter(Boolean);
    // place pills so they do not overlap each other or states: slide along the line, then nudge sideways
    const boxes = Object.values(st).map(b => ({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 })); const placed = [];
    const hit = (x, y) => { const r = { x: x - PILL_W / 2 - 3, y: y - PILL_H / 2 - 3, w: PILL_W + 6, h: PILL_H + 6 }; const ov = q => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h; return placed.some(ov) || boxes.some(ov); };
    edges.forEach(e => { if (e.pts.length !== 2) { placed.push({ x: e.lx - PILL_W / 2, y: e.ly - PILL_H / 2, w: PILL_W, h: PILL_H }); return; }
      const [p1, p2] = e.pts; const at = t => [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]; let best = null;
      for (const t of [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8]) { const [x, y] = at(t); if (!hit(x, y)) { best = [x, y]; break; } }
      if (!best) { const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1; const nx = -(p2[1] - p1[1]) / len, ny = (p2[0] - p1[0]) / len; const [mx, my] = at(0.5);
        for (const d of [32, -32, 64, -64, 96, -96]) { const x = mx + nx * d, y = my + ny * d; if (!hit(x, y)) { best = [x, y]; e.leader = [mx, my]; break; } } }
      if (best) { e.lx = best[0]; e.ly = best[1]; } placed.push({ x: e.lx - PILL_W / 2, y: e.ly - PILL_H / 2, w: PILL_W, h: PILL_H }); });
    const xs = Object.values(st); const ex = edges.flatMap(e => e.pts.concat([[e.lx + PILL_W / 2, e.ly + PILL_H / 2]]));
    const exL = edges.flatMap(e => e.pts.concat([[e.lx - PILL_W / 2, e.ly - PILL_H / 2]]));
    const ox = Math.max(0, Math.min(...xs.map(s => s.x), ...exL.map(p => p[0])) - 40), oy = Math.max(0, Math.min(...xs.map(s => s.y), ...exL.map(p => p[1])) - 40);
    const W = Math.max(600, ...xs.map(s => s.x + s.w + 80), ...ex.map(p => p[0] + 30)) - ox; const H = Math.max(320, ...xs.map(s => s.y + s.h + 80), ...ex.map(p => p[1] + 30)) - oy;
    return { st, edges, W, H, ox: isFinite(ox) ? ox : 0, oy: isFinite(oy) ? oy : 0 };
  }

  function flowSvg(model, opts) {
    opts = opts || {}; const G = flowGeometry(model, opts); const sel = opts.selected; const sfx = opts.idSuffix || ''; const z = opts.zoom || 1;
    const outgoing = {}; model.transitions.forEach(t => { if (!t.removed) outgoing[t.from] = 1; });
    const tbcIds = new Set(model.transitions.filter(t => t.type === 'user' && (t.actors || []).every(a => a.status === 'tbc' || /^tbc:/.test(a.actor))).map(t => t.id));
    const ox = opts.noCrop ? 0 : G.ox, oy = opts.noCrop ? 0 : G.oy; const W = G.W + (opts.noCrop ? G.ox : 0), H = G.H + (opts.noCrop ? G.oy : 0);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" class="flow" width="${Math.round(W * z)}" height="${Math.round(H * z)}" viewBox="${ox} ${oy} ${W} ${H}" data-ox="${ox}" data-oy="${oy}" font-family="${FONT}">`;
    s += `<defs>${['line', 'active', 'disabled', 'removed'].map(k => `<marker id="ar-${k}${sfx}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C[k]}"/></marker>`).join('')}</defs>`;
    if (!opts.transparent) s += `<rect x="${ox}" y="${oy}" width="${W}" height="${H}" fill="#ffffff"/>`;
    G.edges.forEach(e => {
      const t = e.t; const isSel = sel === t.id; const dis = t.enabled === false; const rem = t.removed;
      const lc = isSel ? C.active : rem ? C.removed : dis ? C.disabled : C.line; const mk = isSel ? 'active' : rem ? 'removed' : dis ? 'disabled' : 'line';
      const dash = rem ? '3 4' : t.origin === 'proposed' ? '6 4' : dis ? '2 4' : '';
      const d = 'M ' + e.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');
      const pill = isSel ? C.active : rem ? C.removed : dis ? C.disabled : C[e.kind];
      const icon = e.kind === 'time' ? '⏱ ' : e.kind === 'cond' ? '◆ ' : '';
      const max = icon ? 14 : 16; const nm = String(t.name || ''); const label = icon + (nm.length > max ? nm.slice(0, max - 1) + '…' : nm);
      s += `<g class="edge${isSel ? ' sel' : ''}${tbcIds.has(t.id) ? ' tbc' : ''}" data-edge="${esc(t.id)}"><title>${esc(nm + (tbcIds.has(t.id) ? ' — role to be confirmed' : '') + (rem ? ' — removal proposed' : '') + (t.origin === 'proposed' ? ' — proposed' : ''))}</title>`;
      if (opts.interactive) s += `<path class="hit" d="${d}" fill="none" stroke="transparent" stroke-width="12"/>`;
      s += `<circle cx="${e.pts[0][0]}" cy="${e.pts[0][1]}" r="2.5" fill="${lc}"/><path d="${d}" fill="none" stroke="${lc}" stroke-width="${isSel ? 2 : 1.4}" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="url(#ar-${mk}${sfx})"/>`;
      if (e.leader) s += `<line x1="${e.leader[0].toFixed(1)}" y1="${e.leader[1].toFixed(1)}" x2="${e.lx.toFixed(1)}" y2="${e.ly.toFixed(1)}" stroke="${lc}" stroke-width="1" stroke-dasharray="2 2"/>`;
      s += `<g class="pill"><rect x="${(e.lx - PILL_W / 2).toFixed(1)}" y="${(e.ly - PILL_H / 2).toFixed(1)}" width="${PILL_W}" height="${PILL_H}" rx="12.5" fill="${pill}" ${tbcIds.has(t.id) && !isSel ? `stroke="${C.tbc}" stroke-width="2.5"` : t.origin === 'proposed' ? 'stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 2"' : ''}/><text x="${e.lx.toFixed(1)}" y="${(e.ly + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" fill="#ffffff" ${rem ? 'text-decoration="line-through"' : ''}>${esc(label)}</text></g></g>`;
    });
    model.states.forEach(st => {
      const g = G.st[st.id]; const initial = model.initial === st.id; const isSel = sel === st.id; const prop = st.origin === 'proposed';
      const col = isSel ? C.active : initial ? C.initial : C.line;
      s += `<g class="state${isSel ? ' sel' : ''}" data-state="${esc(st.id)}" transform="translate(${g.x},${g.y})"><title>${esc(st.label + (initial ? ' — default state' : '') + (!outgoing[st.id] ? ' — no outgoing transitions' : '') + (prop ? ' — proposed' : ''))}</title>`;
      s += `<rect width="${g.w}" height="${g.h}" rx="3" fill="${prop ? C.proposedFill : '#ffffff'}" stroke="${col}" stroke-width="${initial || isSel ? 2 : 1}" ${prop ? 'stroke-dasharray="5 3"' : ''}/>`;
      s += `<text x="${g.w / 2}" y="${g.h / 2 + 4.5}" text-anchor="middle" font-size="13" fill="${isSel ? C.active : initial ? C.initial : C.text}">${esc(opts.full ? st.label : shortState(st.label))}</text>`;
      if (opts.interactive) anchors({ x: 0, y: 0, w: g.w, h: g.h }).forEach((p, i) => { s += `<circle class="anchor" data-handle="${esc(st.id)}" data-anchor="${i}" cx="${p[0]}" cy="${p[1]}" r="4"/>`; });
      s += `</g>`;
    });
    return s + `</svg>`;
  }

  const VER = { verified: { c: '#4eb871', d: '' }, inferred: { c: '#6071db', d: '6 4' }, proposed: { c: '#3995e2', d: '4 3' }, tbc: { c: '#f5a623', d: '2 4' } };
  function swimlaneSvg(proc, actorLabel, actorCat) {
    const lanes = []; proc.steps.forEach(s => { if (lanes.indexOf(s.lane) < 0) lanes.push(s.lane); });
    (proc.lanes || []).forEach(l => { if (lanes.indexOf(l) < 0) lanes.push(l); });
    const laneH = 104, labelW = 170, colW = 190, boxW = 160, boxH = 72;
    const W = labelW + Math.max(1, proc.steps.length) * colW + 30, H = Math.max(1, lanes.length) * laneH + 10;
    const catFill = { internal: '#f3f8fe', vendor: '#fff6f0', client: '#f0feff', tenant: '#f3f0ff', occupant: '#f1fff0', employee: '#fffbfd', system: '#fafafa', tbc: '#fff8e8', proposed: '#f3f8fe', external: '#fafafa' };
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}"><defs>${Object.keys(VER).map(k => `<marker id="sw-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${VER[k].c}"/></marker>`).join('')}</defs><rect width="100%" height="100%" fill="#fff"/>`;
    lanes.forEach((l, i) => {
      const y = 5 + i * laneH; const cat = actorCat(l);
      s += `<rect x="0" y="${y}" width="${W}" height="${laneH}" fill="${i % 2 ? '#ffffff' : '#fcfeff'}" stroke="#eae9e9"/><rect x="0" y="${y}" width="${labelW}" height="${laneH}" fill="${catFill[cat] || '#fafafa'}" stroke="#dbdbdb"/>`;
      wrap(actorLabel(l), 22, 4).forEach((ln, j, arr) => { s += `<text x="10" y="${y + laneH / 2 - (arr.length - 1) * 7 + j * 14 + 4}" font-size="11" font-weight="bold" fill="#324056">${esc(ln)}</text>`; });
    });
    const pos = proc.steps.map((st, i) => ({ x: labelW + 15 + i * colW, y: 5 + lanes.indexOf(st.lane) * laneH + (laneH - boxH) / 2 }));
    proc.steps.forEach((st, i) => {
      if (i > 0) { const a = pos[i - 1], b = pos[i]; const v = VER[st.verification] || VER.verified; const x1 = a.x + boxW, y1 = a.y + boxH / 2, x2 = b.x, y2 = b.y + boxH / 2; const mx = (x1 + x2) / 2;
        s += `<path d="M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2 - 2} ${y2}" fill="none" stroke="${v.c}" stroke-width="1.6" ${v.d ? `stroke-dasharray="${v.d}"` : ''} marker-end="url(#sw-${st.verification || 'verified'})"/>`; }
    });
    proc.steps.forEach((st, i) => {
      const p = pos[i]; const v = VER[st.verification] || VER.verified;
      s += `<rect x="${p.x}" y="${p.y}" width="${boxW}" height="${boxH}" rx="4" fill="#ffffff" stroke="${v.c}" stroke-width="1.5" ${v.d ? `stroke-dasharray="${v.d}"` : ''}/><circle cx="${p.x + 12}" cy="${p.y + 12}" r="8" fill="${v.c}"/><text x="${p.x + 12}" y="${p.y + 16}" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">${i + 1}</text>`;
      wrap(st.action, 24, 3).forEach((ln, j) => { s += `<text x="${p.x + 26}" y="${p.y + 16 + j * 13}" font-size="10.5" fill="#324056">${esc(ln)}</text>`; });
      const sub = [st.interface, st.recordLabel].filter(Boolean).join(' · ');
      if (sub) s += `<text x="${p.x + 8}" y="${p.y + boxH - 8}" font-size="9" fill="#8ca1ad">${esc(sub.length > 34 ? sub.slice(0, 33) + '…' : sub)}</text>`;
    });
    if (!proc.steps.length) s += `<text x="${labelW + 20}" y="40" font-size="12" fill="#8ca1ad">No steps yet</text>`;
    return s + '</svg>';
  }

  async function svgToPng(svg, scale) {
    scale = scale || 2;
    const m = svg.match(/viewBox="-?[\d.]+ -?[\d.]+ (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/); const w = m ? +m[1] : 800, h = m ? +m[2] : 400;
    const fixed = svg.replace(/width="[\d.]+" height="[\d.]+" viewBox/, `width="${w}" height="${h}" viewBox`);
    const blob = new Blob([fixed], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Diagram could not be rendered')); i.src = url; });
      const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const data = await new Promise(res => c.toBlob(res, 'image/png'));
      return { data: new Uint8Array(await data.arrayBuffer()), width: w, height: h, dataUrl: c.toDataURL('image/png') };
    } finally { URL.revokeObjectURL(url); }
  }

  root.FWBDiagrams = { flowSvg, flowGeometry, swimlaneSvg, svgToPng, boxSize, wrap, anchors, COLORS: C };
})(typeof window !== 'undefined' ? window : globalThis);
