/* Process Whiteboard, Miro-style helpers (builds on the V.wbx helpers exported by whiteboard.js):
   - arrow handles on a hovered or selected box: click one, then click the box to connect to (or empty space for a new box), or drag it onto a box
   - a dot in the middle of a connector: click it to insert a step, button, decision, oval, note, text or input/output right on the line
   - Create menu: table, timeline, kanban, matrix, swimlanes and a process starter, placed in the middle of the view as a group
   - neat layout: flows are laid out top to bottom by default (left to right on request) with as few crossings as the shape allows; used for imported flows,
     the preview, and Tidy up. The direction is kept on the board (dir: 'v' or 'h').
   Nothing here changes a state flow; it only edits the board. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT; const X = V.wbx; if (!X) return;
  const { W, node, uid, snapV, pushUndo, changed, draw, centre, startEdit, edgePts, ro } = X;
  const NO_HANDLE = ['frame', 'image', 'ink', 'text'];
  const dirOf = () => (W.B && W.B.dir === 'h' ? 'h' : 'v');

  // ---------- neat layout: layers from the flow's direction, then ordering to keep lines from crossing ----------
  /** nodes: [{id,w,h}], edges: [{from,to}]. Returns { id: {x,y} } with the top left of the block at 0,0. dir 'v' = top to bottom, 'h' = left to right. */
  function layoutPositions(nodes, edges, dir) {
    const v = dir !== 'h'; const ids = nodes.map(n => n.id), by = {}; nodes.forEach(n => { by[n.id] = n; });
    const adj = {}; ids.forEach(i => { adj[i] = []; });
    edges.forEach(e => { if (e.from !== e.to && by[e.from] && by[e.to] && !adj[e.from].includes(e.to)) adj[e.from].push(e.to); });
    const hasIn = new Set(); ids.forEach(u => adj[u].forEach(t => hasIn.add(t)));
    const st = {}, fw = {}, pred = {}; ids.forEach(i => { fw[i] = []; pred[i] = []; });
    const dfs = u => { st[u] = 1; adj[u].forEach(t => { if (st[t] === 1) return; fw[u].push(t); pred[t].push(u); if (!st[t]) dfs(t); }); st[u] = 2; };   // an edge that returns to an ancestor (a loop back) is left out of the layering
    ids.filter(i => !hasIn.has(i)).concat(ids).forEach(i => { if (!st[i]) dfs(i); });
    const indeg = {}; ids.forEach(i => { indeg[i] = pred[i].length; }); const layer = {}; ids.forEach(i => { layer[i] = 0; });
    const q = ids.filter(i => !indeg[i]); while (q.length) { const u = q.shift(); fw[u].forEach(t => { layer[t] = Math.max(layer[t], layer[u] + 1); if (--indeg[t] === 0) q.push(t); }); }
    const L = []; ids.forEach(i => { (L[layer[i]] = L[layer[i]] || []).push(i); }); const layers = L.filter(Boolean);
    const idx = {}; const reindex = () => layers.forEach(l => l.forEach((i, k) => { idx[i] = k; })); reindex();
    const bary = (i, nb) => nb[i].length ? nb[i].reduce((s, j) => s + idx[j], 0) / nb[i].length : idx[i];
    for (let it = 0; it < 4; it++) {
      for (let k = 1; k < layers.length; k++) { layers[k].sort((a, b) => bary(a, pred) - bary(b, pred) || idx[a] - idx[b]); reindex(); }
      for (let k = layers.length - 2; k >= 0; k--) { layers[k].sort((a, b) => bary(a, fw) - bary(b, fw) || idx[a] - idx[b]); reindex(); }
    }
    const fa = n => (v ? n.h : n.w), ca = n => (v ? n.w : n.h), gapC = 56, gapL = 84;
    const tot = layers.map(l => l.reduce((s, i) => s + ca(by[i]), 0) + gapC * (l.length - 1)), widest = Math.max(0, ...tot); const pos = {}; let off = 0;
    layers.forEach((l, k) => { const mf = Math.max(...l.map(i => fa(by[i]))); let c = (widest - tot[k]) / 2;
      l.forEach(i => { const n = by[i], a = off + (mf - fa(n)) / 2; pos[i] = v ? { x: c, y: a } : { x: a, y: c }; c += ca(n) + gapC; }); off += mf + gapL; });
    return pos;
  }
  /** moves the nodes into the neat layout with its top left at (ox, oy), and gives the connectors right-angle routes */
  X.layoutNodes = function (nodes, edges, ox, oy) {
    if (!nodes.length) return; const pos = layoutPositions(nodes, edges, dirOf());
    nodes.forEach(n => { const p = pos[n.id]; if (p) { n.x = snapV(ox + p.x); n.y = snapV(oy + p.y); } }); edges.forEach(e => { e.route = 'elbow'; delete e.lo; });
  };
  ACT.wbTidy = () => {
    if (ro()) return; const pick = n => n.t !== 'frame' && n.t !== 'image' && n.t !== 'ink' && !n.hidden && !n.lock;
    let ns = W.B.nodes.filter(pick); if (W.sel.size) ns = ns.filter(n => W.sel.has(n.id) || (n.fr && W.sel.has(n.fr)));
    if (ns.length < 2) { V.toast('Select two or more shapes (or a flow frame) to tidy, or clear the selection to tidy the whole board.', 4500); return; }
    pushUndo(); const groups = {}; ns.forEach(n => { (groups[n.fr || '_'] = groups[n.fr || '_'] || []).push(n); });
    Object.keys(groups).forEach(k => { const list = groups[k], ids = new Set(list.map(n => n.id)), es = W.B.edges.filter(e => ids.has(e.from) && ids.has(e.to)), fr = k === '_' ? null : node(k);
      const ox = fr ? fr.x + 30 : Math.min(...list.map(n => n.x)), oy = fr ? fr.y + 70 : Math.min(...list.map(n => n.y));
      X.layoutNodes(list, es, ox, oy);
      if (fr) { fr.w = snapV(Math.max(...list.map(n => n.x + n.w)) - fr.x + 50); fr.h = snapV(Math.max(...list.map(n => n.y + n.h)) - fr.y + 40); } });
    changed(); draw(); V.toast('Tidied: ' + (dirOf() === 'v' ? 'top to bottom' : 'left to right') + '. Ctrl+Z undoes it.', 3500);
  };
  ACT.wbDirT = () => { if (ro()) return; W.B.dir = dirOf() === 'v' ? 'h' : 'v'; changed(); const b = document.getElementById('wbDirB'); if (b) b.textContent = dirOf() === 'v' ? 'Top to bottom' : 'Left to right'; ACT.wbTidy(); };
  ACT.wbDirSet = a => { if (ro()) return; W.B.dir = a.getAttribute('data-v') === 'h' ? 'h' : 'v'; changed(); document.querySelectorAll('[data-act="wbDirSet"]').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === dirOf())); const last = [...(W.pick || [])].pop(), pv = document.getElementById('wbPrev'); if (last && pv) pv.innerHTML = X.previewHtml(last); };

  // ---------- preview of a state flow, in the same neat layout ----------
  X.dirSeg = () => `<div class="seg wb-dirseg" role="group" aria-label="Flow direction"><button type="button" data-act="wbDirSet" data-v="v" class="${dirOf() === 'v' ? 'on' : ''}">Top to bottom</button><button type="button" data-act="wbDirSet" data-v="h" class="${dirOf() === 'h' ? 'on' : ''}">Left to right</button></div>`;
  X.previewHtml = function (fid) {
    const f = F.flowModel(fid); if (!f) return '<p class="xs muted">No preview for this flow.</p>';
    const nodes = (f.states || []).map(s => { const text = s.label || s.name || 'State'; return { id: s.id, text, w: Math.max(120, Math.min(220, 28 + text.length * 7.2)), h: 40 }; }), by = {}; nodes.forEach(n => { by[n.id] = n; });
    const edges = (f.transitions || []).filter(t => !t.removed && by[t.from] && by[t.to]).map(t => ({ from: t.from, to: t.to, label: t.name || '' }));
    const pos = layoutPositions(nodes, edges, dirOf()), v = dirOf() === 'v'; nodes.forEach(n => { n.x = pos[n.id].x; n.y = pos[n.id].y; });
    const x1 = Math.max(...nodes.map(n => n.x + n.w)), y1 = Math.max(...nodes.map(n => n.y + n.h)), pad = 24, W0 = x1 + pad * 2, H0 = y1 + pad * 2;
    const path = e => { const a = by[e.from], b = by[e.to]; let d, lx, ly;
      if (v) { const ax = a.x + a.w / 2, bx = b.x + b.w / 2; if (b.y > a.y + a.h) { const ay = a.y + a.h, by2 = b.y, my = (ay + by2) / 2; d = ax === bx ? `M${ax} ${ay} V${by2}` : `M${ax} ${ay} V${my} H${bx} V${by2}`; lx = (ax + bx) / 2; ly = my; } else { const sx = Math.max(a.x + a.w, b.x + b.w) + 26; d = `M${a.x + a.w} ${a.y + a.h / 2} H${sx} V${b.y + b.h / 2} H${b.x + b.w}`; lx = sx; ly = (a.y + b.y) / 2 + 20; } }
      else { const ay = a.y + a.h / 2, by2 = b.y + b.h / 2; if (b.x > a.x + a.w) { const ax = a.x + a.w, bx = b.x, mx = (ax + bx) / 2; d = ay === by2 ? `M${ax} ${ay} H${bx}` : `M${ax} ${ay} H${mx} V${by2} H${bx}`; lx = mx; ly = (ay + by2) / 2; } else { const sy = Math.max(a.y + a.h, b.y + b.h) + 26; d = `M${a.x + a.w / 2} ${a.y + a.h} V${sy} H${b.x + b.w / 2} V${b.y + b.h}`; lx = (a.x + b.x) / 2 + 60; ly = sy; } }
      const lab = e.label ? (e.label.length > 22 ? e.label.slice(0, 21) + '…' : e.label) : ''; const pw = Math.max(40, lab.length * 6.6 + 14);
      return `<path d="${d}" fill="none" stroke="#7aa7f0" stroke-width="1.4" stroke-linejoin="round" marker-end="url(#pvA)"/>${lab ? `<rect x="${lx - pw / 2}" y="${ly - 10}" width="${pw}" height="20" rx="10" fill="#fff" stroke="#cfe0fb"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="10.5" fill="#1570EF" font-family="Inter, Roboto, Arial, sans-serif">${esc(lab)}</text>` : ''}`; };
    const box = n => { const st = (f.states || []).find(s => s.id === n.id) || {}; const fill = st.typeCode === 2 ? '#DDF4E4' : st.typeCode === 6 ? '#F2F4F7' : '#fff';
      return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${fill}" stroke="#b8cdf2"/><text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 4.5}" text-anchor="middle" font-size="12.5" font-weight="500" fill="#101828" font-family="Inter, Roboto, Arial, sans-serif">${esc(n.text.length > 30 ? n.text.slice(0, 29) + '…' : n.text)}</text>`; };
    return `<div class="xs muted" style="margin-bottom:6px">Preview: ${esc(f.name || '')} · ${nodes.length} states</div><div class="wb-prev-svg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${W0} ${H0}" width="${Math.min(W0, 560)}" style="max-width:100%;height:auto"><defs><marker id="pvA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7aa7f0"/></marker></defs>${edges.map(path).join('')}${nodes.map(box).join('')}</svg></div>`;
  };

  // ---------- arrow handles and the midpoint dot ----------
  const SIDES = [['e', 0], ['s', 90], ['w', 180], ['n', 270]];
  X.overlay = function () {
    if (ro() || W.dragging || W.edit || W.tool !== 'select' || !W.B) return '';
    const k = 1 / Math.max(.2, W.B.view.z); let s = '';
    if (W.pend) { const n = node(W.pend.from); return n ? `<rect class="wb-pend" x="${n.x - 5}" y="${n.y - 5}" width="${n.w + 10}" height="${n.h + 10}" rx="10" fill="none" stroke="#1570EF" stroke-width="${2 * k}" stroke-dasharray="${6 * k} ${4 * k}" pointer-events="none"/>` : ''; }
    const hid = W.hover || (W.sel.size === 1 ? [...W.sel][0] : null); if (!hid) return '';
    const n = node(hid);
    if (n && !n.hidden && !n.lock && !NO_HANDLE.includes(n.t)) {
      const o = 22 * k, cx = n.x + n.w / 2, cy = n.y + n.h / 2, pts = { e: [n.x + n.w + o, cy], s: [cx, n.y + n.h + o], w: [n.x - o, cy], n: [cx, n.y - o] };
      s += SIDES.map(([d, r]) => `<g class="wb-ah" data-ah="${esc(n.id)}" data-side="${d}" transform="translate(${pts[d][0].toFixed(1)} ${pts[d][1].toFixed(1)}) scale(${k.toFixed(4)})" role="button" aria-label="Connect from here"><circle r="11" fill="#fff" stroke="#1570EF" stroke-width="1.5"/><g transform="rotate(${r})"><path d="M-4 0H4M1 -3.2L4.2 0L1 3.2" fill="none" stroke="#1570EF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g><title>Click, then click the box to connect to. Or drag to a box.</title></g>`).join('');
    }
    const e = W.B.edges.find(q => q.id === hid);
    if (e) { const p = edgePts(e); if (p && !p.self) { const lo = e.lo || { x: 0, y: 0 }; const mx = p.lx - lo.x, my = p.ly - lo.y;
      s += `<g class="wb-mid" data-mid="${esc(e.id)}" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) scale(${k.toFixed(4)})" role="button" aria-label="Insert a shape on this connector"><circle r="8" fill="#1570EF" stroke="#fff" stroke-width="2"/><path d="M-3.2 0H3.2M0 -3.2V3.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><title>Insert a step, button or shape here</title></g>`; } }
    return s;
  };
  X.link = function (from, to) {
    const a = node(from), b = node(to); if (!a || !b || a.t === 'frame' || b.t === 'frame') return;
    if (W.B.edges.some(e => e.from === from && e.to === to)) { V.toast('Those two are already connected'); return; }
    pushUndo(); const ne = { id: uid('e'), from, to, label: '' }; W.B.edges.push(ne); W.sel = new Set([ne.id]); changed(); draw();
  };
  X.linkNew = function (from, p) {
    const a = node(from); if (!a) return; pushUndo(); const v = dirOf() === 'v'; const n = { id: uid('n'), t: 'rect', x: snapV(p.x - 80), y: snapV(p.y - 32), w: 160, h: 64, text: 'Step' };
    W.B.nodes.push(n); W.B.edges.push({ id: uid('e'), from, to: n.id, label: '', route: v ? 'elbow' : undefined }); W.sel = new Set([n.id]); changed(); draw(); setTimeout(() => startEdit(n), 30);
  };

  // ---------- insert on a connector ----------
  const KINDS = { rect: ['Step', 'Step', { t: 'rect', w: 160, h: 64 }], button: ['Button', 'Button', { t: 'rect', w: 140, h: 44, fill: '#1570EF', tc: '#FFFFFF', b: true, rx: 22, bc: '#1570EF' }], diamond: ['Decision', 'Decision?', { t: 'diamond', w: 150, h: 96 }], oval: ['Start / end', 'Start', { t: 'ellipse', w: 150, h: 70 }], para: ['Input / output', 'Input / output', { t: 'para', w: 170, h: 70 }], note: ['Note', '', { t: 'note', w: 160, h: 110 }], text: ['Text', 'Text', { t: 'text', w: 220, h: 40 }] };
  function pop(html, x, y) {
    const host = document.getElementById('wbHost'); if (!host) return; const old = document.getElementById('wbCtx'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'wbCtx'; d.className = 'wb-pop wb-insmenu'; d.innerHTML = html; host.appendChild(d);
    const r = host.getBoundingClientRect(); d.style.left = Math.max(8, Math.min(x - r.left, r.width - d.offsetWidth - 8)) + 'px'; d.style.top = Math.max(8, Math.min(y - r.top, r.height - d.offsetHeight - 8)) + 'px';
  }
  X.midMenu = function (edgeId, ev) {
    pop(`<div class="wb-pop-h">Insert on this line</div><div class="wb-insgrid">${Object.keys(KINDS).map(k => `<button type="button" data-act="wbIns" data-k="${k}" data-e="${esc(edgeId)}"><b>${esc(KINDS[k][0])}</b></button>`).join('')}</div>`, ev.clientX + 10, ev.clientY + 10);
  };
  ACT.wbIns = a => {
    const m = document.getElementById('wbCtx'); if (m) m.remove(); if (ro()) return;
    const e = W.B.edges.find(x => x.id === a.getAttribute('data-e')), def = KINDS[a.getAttribute('data-k')]; if (!e || !def) return; const p = edgePts(e); if (!p) return;
    const lo = e.lo || { x: 0, y: 0 }, x = p.lx - lo.x, y = p.ly - lo.y, base = def[2];
    pushUndo(); const n = Object.assign({ id: uid('n'), x: snapV(x - base.w / 2), y: snapV(y - base.h / 2), text: def[1] }, base); const oldTo = e.to;
    if (e.ref) { delete e.ref; V.toast('This connector was a copied transition; it is now a drawing only. The state flow itself is unchanged.', 5000); }
    e.to = n.id; const ne = { id: uid('e'), from: n.id, to: oldTo, label: '' }; if (e.route) ne.route = e.route; if (e.ah) ne.ah = e.ah;
    W.B.nodes.push(n); W.B.edges.push(ne); W.sel = new Set([n.id]); changed(); draw(); setTimeout(() => startEdit(n), 30);
  };

  // ---------- Create menu: ready-made structures ----------
  const box = (t, x, y, w, h, text, more) => Object.assign({ id: uid('n'), t, x, y, w, h, text: text || '' }, more || {});
  const HEAD = { fill: '#E8F1FD', b: true };
  const TPL = {
    table() { const nodes = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) nodes.push(box('rect', c * 170, r * 48, 170, 48, r ? '' : 'Column ' + (c + 1), r ? { rx: 0 } : Object.assign({ rx: 0 }, HEAD))); return { nodes, group: true }; },
    timeline() { const nodes = [box('rect', 0, 58, 880, 4, '', { fill: '#1570EF', bc: '#1570EF', rx: 2 })]; for (let i = 0; i < 5; i++) { const x = 20 + i * 200; nodes.push(box('ellipse', x, 46, 28, 28, '', { fill: '#1570EF', bc: '#fff' })); nodes.push(box('text', x - 70, i % 2 ? 84 : -8, 168, 40, 'Milestone ' + (i + 1), { size: 14 })); } return { nodes, group: true }; },
    kanban() { const nodes = []; ['To do', 'In progress', 'Done'].forEach((name, i) => { const x = i * 280; nodes.push(box('frame', x, 0, 260, 380, name)); nodes.push(box('note', x + 50, 70, 160, 90, 'Card')); nodes.push(box('note', x + 50, 180, 160, 90, 'Card')); }); return { nodes, group: false }; },
    matrix() { const nodes = [box('rect', 0, 0, 240, 160, 'Quick wins', { fill: '#DDF4E4' }), box('rect', 240, 0, 240, 160, 'Big bets', { fill: '#E3EDFF' }), box('rect', 0, 160, 240, 160, 'Fill-ins', { fill: '#F2F4F7' }), box('rect', 240, 160, 240, 160, 'Reconsider', { fill: '#FFE8D1' }), box('text', 0, 330, 480, 30, 'Effort  →', { size: 13, tc: '#667085' }), box('text', -150, 150, 140, 30, 'Impact  ↑', { size: 13, tc: '#667085' })]; return { nodes, group: true }; },
    swim() { const nodes = ['Customer', 'Facilio', 'System'].map((name, i) => box('frame', 0, i * 170, 900, 150, name)); return { nodes, group: false }; },
    process() { const a = box('ellipse', 0, 0, 140, 60, 'Start'), b = box('rect', 0, 140, 160, 64, 'Step'), c = box('diamond', 0, 280, 160, 100, 'Decision?'), d = box('ellipse', 0, 460, 140, 60, 'End'); const ed = (f, t, label) => ({ id: uid('e'), from: f.id, to: t.id, label: label || '', route: 'elbow' }); return { nodes: [a, b, c, d], edges: [ed(a, b), ed(b, c), ed(c, d, 'Yes')], group: false, tidy: true }; }
  };
  function place(key) {
    if (ro() || !TPL[key]) return; const t = TPL[key](); if (t.tidy) X.layoutNodes(t.nodes, t.edges, 0, 0);
    const xs = t.nodes.map(n => n.x), ys = t.nodes.map(n => n.y), x1 = Math.max(...t.nodes.map(n => n.x + n.w)), y1 = Math.max(...t.nodes.map(n => n.y + n.h));
    const c = centre(), dx = snapV(c.x - (Math.min(...xs) + x1) / 2), dy = snapV(c.y - (Math.min(...ys) + y1) / 2), g = t.group ? uid('g') : null;
    pushUndo(); t.nodes.forEach(n => { n.x += dx; n.y += dy; if (g) n.g = g; W.B.nodes.push(n); }); (t.edges || []).forEach(e => W.B.edges.push(e));
    W.sel = new Set(t.nodes.map(n => n.id)); changed(); draw();
  }
  const MENU = [['diagram', 'Diagram', 'Describe a process and Claude draws it'], ['process', 'Process starter', 'Start, step, decision, end'], ['table', 'Table', '4 rows, 3 columns'], ['timeline', 'Timeline', 'Five milestones on a line'], ['kanban', 'Kanban', 'To do, in progress, done'], ['matrix', 'Matrix', 'Impact against effort'], ['swim', 'Swimlanes', 'Customer, Facilio, System']];
  ACT.wbCreate = a => { const r = a.getBoundingClientRect(); pop(`<div class="wb-pop-h">Create</div><div class="wb-crlist">${MENU.map(([k, l, d]) => `<button type="button" data-act="wbTpl" data-k="${k}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`).join('')}</div>`, r.left, r.bottom + 6); };
  ACT.wbTpl = a => { const k = a.getAttribute('data-k'); const m = document.getElementById('wbCtx'); if (m) m.remove(); if (k === 'diagram') { ACT.wbAiText(); return; } place(k); };

  // ---------- combined flows in the Add State Flow list: ready-made chains of this project's flows, and the ones the team saved ----------
  const CHAINS = [
    { id: 'request-to-procurement', name: 'Service request to work order, inventory, quotation and procurement', steps: [['service request'], ['work order'], ['inventory request', 'material request', 'inventory'], ['quotation', 'quote'], ['purchase order', 'purchase request', 'procurement']] },
    { id: 'work-order-parts', name: 'Work order with spare parts and purchasing', steps: [['work order'], ['inventory request', 'material request', 'inventory'], ['purchase request', 'purchase order'], ['receipt', 'goods']] },
    { id: 'planned-maintenance', name: 'Planned maintenance to work order', steps: [['planned maintenance', 'preventive maintenance', 'ppm'], ['work order']] },
    { id: 'quote-to-invoice', name: 'Vendor quotation to purchase order and invoice', steps: [['quotation', 'quote'], ['purchase order'], ['invoice']] }
  ];
  const lc = t => String(t || '').toLowerCase();
  function chainFlows(ch) {
    const cat = X.flowCatalogue(), used = new Set(), out = [];
    ch.steps.forEach(keys => { const hit = cat.filter(c => !used.has(c.id) && keys.some(k => lc(c.moduleLabel + ' ' + c.module).includes(k))).sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0) || b.states - a.states)[0]; if (hit) { used.add(hit.id); out.push(hit); } });
    return out;
  }
  const row = (v, title, sub, q) => `<label class="wb-fi" data-q="${esc(lc(q))}"><input type="checkbox" value="${esc(v)}" data-change="wbFlowTick"><span><b>${esc(title)}</b><br><span class="xs muted">${esc(sub)}</span></span></label>`;
  const prebuilt = () => CHAINS.map(ch => ({ ch, fl: chainFlows(ch) })).filter(x => x.fl.length >= 2);
  X.combinedList = function () {
    const pre = prebuilt(), saved = X.cflows(); if (!pre.length && !saved.length) return '';
    return `<div class="wb-fgroup">Ready-made combined flows</div>${pre.map(x => row('pre:' + x.ch.id, x.ch.name, x.fl.map(c => c.moduleLabel).join(' → ') + ' · ' + x.fl.length + ' flows from this project', x.ch.name + ' ' + x.fl.map(c => c.moduleLabel).join(' '))).join('')}${saved.length ? `<div class="wb-fgroup">Saved combined flows</div>${saved.map(c => row('cf:' + c.id, c.name || 'Combined flow', (c.nodes || []).length + ' shapes' + (c.boardName ? ' · from ' + c.boardName : ''), c.name)).join('')}` : ''}<div class="wb-fgroup">State flows</div>`;
  };
  X.previewAny = function (id) {
    if (id.startsWith('pre:')) { const ch = CHAINS.find(c => c.id === id.slice(4)); if (!ch) return ''; const fl = chainFlows(ch); const gap = dirOf() === 'v' ? 'then' : 'then →';
      return `<div class="xs muted" style="margin-bottom:6px">Preview: ${esc(ch.name)}</div>${fl.map((c, i) => (i ? `<div class="wb-then">${gap}</div>` : '') + `<div class="wb-pvbox"><b class="small">${esc(c.moduleLabel)} · ${esc(c.name)}</b>${X.previewHtml(c.id)}</div>`).join('')}`; }
    if (id.startsWith('cf:')) { const c = X.cflows().find(q => q.id === id.slice(3)); return c ? `<div class="xs muted" style="margin-bottom:6px">Preview: ${esc(c.name || '')}</div><div class="wb-prev-svg">${V.cflowSvg(c, 560)}</div>` : ''; }
    return X.previewHtml(id);
  };
  X.placeCombined = function (id, x, y) {
    if (id.startsWith('pre:')) { const ch = CHAINS.find(c => c.id === id.slice(4)); if (!ch) return null; const v = dirOf() === 'v'; let ox = x, oy = y, prev = null; const nodes = [], edges = [], ids = [];
      chainFlows(ch).forEach(c => { const p = X.placeFlow(c.id, ox, oy); if (!p) return; nodes.push(...p.nodes); edges.push(...p.edges); ids.push(p.frame.id);
        const st = p.nodes.filter(n => n.t === 'state'), hasIn = new Set(p.edges.map(e => e.to)), first = st.find(n => !hasIn.has(n.id)) || st[0], last = st.filter(n => n.stype === 'closed').sort((a, b) => b.y - a.y)[0] || st.slice().sort((a, b) => b.y - a.y)[0];
        if (prev && first) edges.push({ id: uid('e'), from: prev.id, to: first.id, label: '', route: 'elbow' }); prev = last;   // the end of one flow leads to the start of the next
        if (v) oy = snapV(p.frame.y + p.frame.h + 90); else ox = snapV(p.frame.x + p.frame.w + 90); });
      return nodes.length ? { nodes, edges, ids, bottom: Math.max(...nodes.map(n => n.y + n.h)) } : null; }
    if (id.startsWith('cf:')) { const c = X.cflows().find(q => q.id === id.slice(3)); if (!c || !(c.nodes || []).length) return null; const map = {}; (c.nodes || []).forEach(n => { map[n.id] = uid('n'); });
      const b = X.bbox(c.nodes), dx = snapV(x - b.x), dy = snapV(y - b.y); const nodes = c.nodes.map(n => Object.assign(JSON.parse(JSON.stringify(n)), { id: map[n.id], x: n.x + dx, y: n.y + dy, fr: n.fr && map[n.fr] ? map[n.fr] : undefined, g: undefined }));
      const edges = (c.edges || []).filter(e => map[e.from] && map[e.to]).map(e => Object.assign(JSON.parse(JSON.stringify(e)), { id: uid('e'), from: map[e.from], to: map[e.to], fr: e.fr && map[e.fr] ? map[e.fr] : undefined, g: undefined }));
      return { nodes, edges, ids: nodes.filter(n => !n.fr).map(n => n.id), bottom: Math.max(...nodes.map(n => n.y + n.h)) }; }
    return null;
  };

  // ---------- long processes go to Claude; its drawing comes back as a draft that the team reviews and adds ----------
  const API = root.FWBApi;
  X.isBig = t => String(t).length > 1500 || String(t).split(/\n+/).filter(l => l.trim()).length > 14;   // the app's own AI answers in about 25 seconds with a short reply, so a long description would be cut off
  const jobsOf = () => { const J = V.studioJobs, k = J && J.K && J.K(); return k && Array.isArray(k.jobs) ? k.jobs.filter(j => j.kind === 'draw_flow') : []; };
  X.sendToClaude = async function (text, out, why) {
    const J = V.studioJobs; if (!J || J.guard()) return;
    try { const r = await J.post('/jobs', { kind: 'draw_flow', note: text, ref: (W.B && W.B.id) || '' });
      out.innerHTML = '<div class="notice">' + (why === 'fallback' ? 'The app\'s AI could not finish this one, so it was sent to Claude. ' : 'This is a long process, so it was sent to Claude. ') + (r && r.duplicate ? 'Claude already has this request. ' : '') + 'Claude draws it when it works through the queue (open your Claude with the Delivery Studio connector if it is not running). The drawing then appears at the top of this page for you to review and add. Nothing is added to the board without you.</div>'; V.render(); }
    catch (e) { out.innerHTML = '<div class="notice err">' + esc(e.message || 'Could not send it to Claude') + '</div>'; }
  };
  ACT.wbAiQueue = a => V.busy(a, async () => { const t = String((document.getElementById('wbAiT') || {}).value || '').trim(); if (t.length < 10) { V.toast('Describe the process first', 4000, true); return; } await X.sendToClaude(t, document.getElementById('wbAiOut') || { innerHTML: '' }, 'ask'); });
  X.claudeBar = function () {
    if (ro() || !W.B || !V.items) return '';
    if (!V.items.ready(['ai'])) { if (!W.aiAsked) { W.aiAsked = true; V.items.load(['ai']).then(() => V.render()).catch(() => { }); } return ''; }
    const ds = V.items.list('ai').filter(d => d.task === 'wbflow' && d.status !== 'approved' && d.status !== 'dismissed'), pend = jobsOf().filter(j => ['waiting', 'claimed', 'needs_input'].includes(j.status));
    if (!ds.length && !pend.length) return '';
    const title = d => { try { return JSON.parse(d.content).title || 'Process from Claude'; } catch (e) { return 'Process from Claude'; } };
    return '<div class="wb-claude" role="status">' + (pend.length ? '<div class="wb-cl-row"><span class="wb-dot"></span><b>Claude is drawing ' + (pend.length === 1 ? 'a flow' : pend.length + ' flows') + '</b><span class="xs muted">' + (pend.some(j => j.status === 'needs_input') ? 'Claude has a question: see the Assistant.' : 'It appears here when ready.') + '</span></div>' : '')
      + ds.map(d => '<div class="wb-cl-row"><b>' + esc(title(d)) + '</b><span class="xs muted">Drawn by Claude · waiting for your review</span><button class="btn sm primary" data-act="wbCdOpen" data-id="' + esc(d.id) + '">Review and add</button><button class="btn sm" data-act="wbCdDismiss" data-id="' + esc(d.id) + '">Dismiss</button></div>').join('') + '</div>';
  };
  ACT.wbCdOpen = a => V.busy(a, async () => {
    const d = V.items.get('ai', a.getAttribute('data-id')); if (!d) return;
    const r = await API.post(X.aiUrl(), { reply: d.content, flows: X.flowIdx() });   // the same check the app applies to any Claude reply: the draft is rebuilt field by field
    ACT.wbAiText(); const out = document.getElementById('wbAiOut'), t = document.getElementById('wbAiT'); if (t) t.value = ''; if (out) out.innerHTML = X.aiReview(r, 'Claude'); X.aiReady(); W.cdFrom = d.id;
  });
  ACT.wbCdDismiss = a => V.busy(a, async () => { const id = a.getAttribute('data-id'), d = V.items.get('ai', id); if (!d) return; await V.items.put('ai', id, Object.assign({}, d, { status: 'dismissed' })); V.render(); });
  { const orig = ACT.wbAiAdd; ACT.wbAiAdd = async function (a) { const n0 = W.B ? W.B.nodes.length : 0; const r = await orig(a); if (W.cdFrom && W.B && W.B.nodes.length > n0) { const id = W.cdFrom, d = V.items.get('ai', id); W.cdFrom = null; if (d) { await V.items.put('ai', id, Object.assign({}, d, { status: 'approved' })); V.render(); } } return r; }; }
})(typeof window !== 'undefined' ? window : globalThis);
