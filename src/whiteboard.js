/* Process Whiteboard: a pannable, zoomable board per project for composing individual processes into one end-to-end process.
   Sticky notes, shapes, text, connectors with labels, grouping, alignment, grid and snap, undo/redo, several named boards, PNG export (whole board or selection).
   "Add State Flow" places the project's real state flows (the org package baseline plus workshop edits, F.flowModel) on the board as editable copies;
   the originals are never changed from here. Changing a flow itself stays in the State Flow Builder, which keeps workshop proposals separate from the
   configuration in Facilio (Delivery Studio never writes to a live Facilio org).
   "Import from image" sends a flowchart picture to the server, where Claude reads it (src: work/server/api.mjs, /ai/flow-image); the answer is checked
   against a fixed shape, shown for review with unsure parts marked, and only what the person accepts becomes board elements. The picture can stay as a
   reference layer that can be hidden or removed.
   Boards are records of kind "wb" (one per board) saved through the items API, so the server's project permissions apply. Rendering is SVG. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const D = root.FWBDiagrams;
  const I = () => V.items;
  const GRID = 20, MAXZ = 3, MINZ = .15;
  const COLORS = { note: ['#FFF4B8', '#FFE1EC', '#DDF4E4', '#E3EDFF', '#E8F1FD'], shape: '#FFFFFF' };
  const C = D.COLORS; const FONT = 'Roboto, Helvetica, Arial, sans-serif';   // the State Flow Builder look: white boxes with a thin blue line, arrows in the same blue, coloured pill labels
  const uid = p => p + Math.random().toString(36).slice(2, 9);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // ---------- state ----------
  const W = { boardId: null, B: null, sel: new Set(), tool: 'select', undo: [], redo: [], dirty: false, saveT: 0, saving: false, lastSaved: null, edit: null, imgUrl: {} };
  const ro = () => !!S.readonly;
  const boards = () => I().list('wb').sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const blank = name => ({ name: name || 'Process board', miro: '', nodes: [], edges: [], grid: true, snap: true, route: 'straight', view: { x: 40, y: 40, z: 1 } });
  // Boards are shared project records that any editor (or a direct API call) can write, so everything that reaches the SVG markup is
  // normalised on load: known shape types, finite numbers, hex colours, plain ids and fixed confidence words. Text is escaped when drawn.
  const ID = /^[A-Za-z0-9_-]{1,48}$/, HEXC = /^#[0-9A-Fa-f]{3,8}$/, NT = ['note', 'rect', 'ellipse', 'diamond', 'text', 'state', 'frame', 'image', 'tri', 'para', 'hex', 'ink'];
  const num = (v, d, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
  function clean(B) {
    const seen = new Set(); const str = (v, m) => String(v == null ? '' : v).slice(0, m);
    B.name = str(B.name, 120) || 'Process board'; B.miro = typeof B.miro === 'string' && /^https:\/\/(?:www\.)?miro\.com\//.test(B.miro) ? B.miro.slice(0, 400) : '';
    B.grid = B.grid !== false; B.snap = B.snap !== false; const v = B.view && typeof B.view === 'object' ? B.view : {}; B.view = { x: num(v.x, 40, -1e6, 1e6), y: num(v.y, 40, -1e6, 1e6), z: num(v.z, 1, .1, 4) };
    B.nodes = (Array.isArray(B.nodes) ? B.nodes : []).filter(n => n && typeof n === 'object' && ID.test(n.id) && NT.includes(n.t) && !seen.has(n.id) && seen.add(n.id)).slice(0, 3000).map(n => Object.assign(n, {
      x: num(n.x, 0, -1e6, 1e6), y: num(n.y, 0, -1e6, 1e6), w: num(n.w, 160, 8, 2e4), h: num(n.h, 64, 8, 2e4), text: str(n.text, 4000),
      fill: HEXC.test(n.fill) ? n.fill : undefined, size: n.size === undefined ? undefined : num(n.size, 18, 8, 96), stype: ['open', 'closed', 'skipped'].includes(n.stype) ? n.stype : 'open',
      conf: ['inferred', 'uncertain'].includes(n.conf) ? n.conf : undefined, g: ID.test(n.g) ? n.g : undefined, fileId: ID.test(n.fileId) ? n.fileId : undefined, hidden: !!n.hidden,
      b: n.b ? true : undefined, al: ['l', 'r'].includes(n.al) ? n.al : undefined, tc: HEXC.test(n.tc) ? n.tc : undefined, lock: n.lock ? true : undefined,
      pts: n.t === 'ink' ? (Array.isArray(n.pts) ? n.pts : []).slice(0, 4000).map(q => Array.isArray(q) ? [num(q[0], 0, -1e5, 1e5), num(q[1], 0, -1e5, 1e5)] : [0, 0]) : undefined, pw: n.t === 'ink' ? num(n.pw, n.w, 1, 2e4) : undefined, ph: n.t === 'ink' ? num(n.ph, n.h, 1, 2e4) : undefined, sw: n.t === 'ink' ? num(n.sw, 3, 1, 24) : undefined }));
    B.edges = (Array.isArray(B.edges) ? B.edges : []).filter(e => e && typeof e === 'object' && ID.test(e.id) && seen.has(e.from) && seen.has(e.to)).slice(0, 6000).map(e => Object.assign(e, {
      label: str(e.label, 200), conf: ['inferred', 'uncertain'].includes(e.conf) ? e.conf : undefined, g: ID.test(e.g) ? e.g : undefined,
      route: ['straight', 'elbow'].includes(e.route) ? e.route : undefined, fr: ID.test(e.fr) ? e.fr : undefined, ah: ['both', 'none'].includes(e.ah) ? e.ah : undefined,
      lo: e.lo && typeof e.lo === 'object' ? { x: num(e.lo.x, 0, -4000, 4000), y: num(e.lo.y, 0, -4000, 4000) } : undefined,
      ref: refClean(e.ref) }));
    B.nodes.forEach(n => { n.fr = ID.test(n.fr) ? n.fr : undefined; n.ref = refClean(n.ref); if (n.src && typeof n.src === 'object') n.src = { kind: n.src.kind === 'image' ? 'image' : 'flow', flowId: str(n.src.flowId, 80), module: str(n.src.module, 80), origin: n.src.origin === 'proposed' ? 'proposed' : 'existing', sig: str(n.src.sig, 64) }; else delete n.src; });
    B.route = B.route === 'elbow' ? 'elbow' : 'straight';
    // Boards saved before 27 Oct grouped an imported flow (frame + every state) under one group id, so a click on any state selected and
    // moved the whole diagram. The frame now carries its contents on its own, so that automatic group is turned into frame membership.
    B.nodes.filter(n => n.t === 'frame' && n.src && n.g).forEach(fr => { const g = fr.g; B.nodes.forEach(m => { if (m.g === g) { if (m !== fr) m.fr = m.fr || fr.id; delete m.g; } }); B.edges.forEach(e => { if (e.g === g) { e.fr = e.fr || fr.id; delete e.g; } }); });
    return B;
  }
  function refClean(r) { if (!r || typeof r !== 'object') return undefined; const o = {}; ['flow', 'state', 'transition'].forEach(k => { if (r[k] != null) o[k] = String(r[k]).slice(0, 80); }); return o.flow ? o : undefined; }
  function current() {
    const list = boards(); if (!W.boardId || !list.find(b => b.id === W.boardId)) W.boardId = (list[0] && list[0].id) || null;
    if (!W.boardId) return null;
    if (!W.B || W.B.id !== W.boardId) { const r = I().get('wb', W.boardId); W.B = clean(Object.assign(blank(), JSON.parse(JSON.stringify(r)), { id: W.boardId })); W.sel.clear(); W.undo = []; W.redo = []; }
    return W.B;
  }
  const node = id => W.B.nodes.find(n => n.id === id);
  const snapV = v => (W.B.snap ? Math.round(v / GRID) * GRID : Math.round(v));

  // ---------- persistence ----------
  function snapshot() { return JSON.stringify({ nodes: W.B.nodes, edges: W.B.edges }); }
  function pushUndo() { W.undo.push(snapshot()); if (W.undo.length > 60) W.undo.shift(); W.redo = []; }
  function changed() { W.dirty = true; paintState(); clearTimeout(W.saveT); W.saveT = setTimeout(save, 700); }
  async function save() {
    if (!W.B || !W.dirty || ro()) return; if (W.saving) { W.saveT = setTimeout(save, 400); return; }
    W.saving = true; W.dirty = false; paintState();
    const data = { name: W.B.name, miro: W.B.miro || '', nodes: W.B.nodes, edges: W.B.edges, grid: W.B.grid, snap: W.B.snap, route: W.B.route, view: W.B.view };
    try { await I().put('wb', W.B.id, data, { silent: true }); W.lastSaved = new Date(); } catch (e) { W.dirty = true; V.toast('The board could not be saved: ' + (e.message || 'try again'), 6000, true); }
    finally { W.saving = false; paintState(); }
  }
  function paintState() { const el = document.getElementById('wbSave'); if (!el) return; el.textContent = ro() ? 'Read-only' : W.saving ? 'Saving…' : W.dirty ? 'Unsaved changes' : W.lastSaved ? 'Saved' : 'All changes saved'; el.className = 'wb-save' + (W.dirty ? ' dirty' : ''); }

  // ---------- geometry ----------
  function bbox(list) {
    if (!list.length) return { x: 0, y: 0, w: 0, h: 0 };
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; list.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // where a line from the centre of n towards (tx, ty) leaves n's outline
  function border(n, tx, ty) {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy; if (!dx && !dy) return [cx, cy];
    if (n.t === 'ellipse') { const a = n.w / 2, b = n.h / 2, k = 1 / Math.sqrt(dx * dx / (a * a) + dy * dy / (b * b)); return [cx + dx * k, cy + dy * k]; }
    if (n.t === 'diamond') { const k = 1 / (Math.abs(dx) / (n.w / 2) + Math.abs(dy) / (n.h / 2)); return [cx + dx * k, cy + dy * k]; }
    const k = Math.min(Math.abs((n.w / 2) / (dx || 1e-9)), Math.abs((n.h / 2) / (dy || 1e-9))); return [cx + dx * k, cy + dy * k];
  }
  function edgePts(e) {
    const a = node(e.from), b = node(e.to); if (!a || !b || a.hidden || b.hidden) return null;
    if (a === b) { const x = a.x + a.w, y = a.y + a.h / 2; return { self: true, d: `M${x} ${y - 8} C ${x + 46} ${y - 40}, ${x + 46} ${y + 40}, ${x} ${y + 8}`, lx: x + 40, ly: y }; }
    const lo = e.lo || { x: 0, y: 0 }; let out;
    if ((e.route || W.B.route) === 'elbow') {
      // right-angle route: leave from the side facing the other box, turn once half way
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2, dx = bx - ax, dy = by - ay; let p0, p1, d;
      if (Math.abs(dx) >= Math.abs(dy)) { const sx = dx >= 0 ? a.x + a.w : a.x, ex = dx >= 0 ? b.x : b.x + b.w, mx = (sx + ex) / 2; p0 = [sx, ay]; p1 = [ex, by]; d = `M${sx} ${ay} H${mx} V${by} H${ex}`; out = { d, lx: mx, ly: (ay + by) / 2, p0, p1 }; }
      else { const sy = dy >= 0 ? a.y + a.h : a.y, ey = dy >= 0 ? b.y : b.y + b.h, my = (sy + ey) / 2; p0 = [ax, sy]; p1 = [bx, ey]; d = `M${ax} ${sy} V${my} H${bx} V${ey}`; out = { d, lx: (ax + bx) / 2, ly: my, p0, p1 }; }
    } else {
      const p = border(a, b.x + b.w / 2, b.y + b.h / 2), q = border(b, a.x + a.w / 2, a.y + a.h / 2);
      out = { d: `M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}`, lx: (p[0] + q[0]) / 2, ly: (p[1] + q[1]) / 2, p0: p, p1: q };
    }
    out.lx += lo.x; out.ly += lo.y; return out;
  }
  function lines(text, w, size) { const per = Math.max(4, Math.floor((w - 16) / (size * .56))); return D && D.wrap ? D.wrap(text, per, 12) : [String(text || '')]; }

  // ---------- rendering ----------
  const STATE_FILL = { open: '#E3EDFF', closed: '#DDF4E4', skipped: '#F2F4F7' };
  function nodeSvg(n, forExport) {
    if (n.hidden) return '';
    const sel = !forExport && W.sel.has(n.id), id = esc(n.id), conf = n.conf && n.conf !== 'detected' ? n.conf : '';
    const start = n.t === 'ellipse'; const stroke = sel ? C.active : conf === 'uncertain' ? '#E5197F' : conf === 'inferred' ? C.tbc : n.t === 'note' ? 'rgba(16,24,40,.12)' : n.stype === 'skipped' ? C.disabled : start ? C.initial : C.line;
    const sw = sel ? 2 : start ? 2 : 1, dash = conf ? ' stroke-dasharray="6 4"' : '';
    let shape = '';
    if (n.t === 'frame') shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14" fill="rgba(239,245,255,.55)" stroke="${sel ? C.active : '#B2CCFF'}" stroke-width="${sel ? 2.5 : 1.5}" stroke-dasharray="8 6"/><text x="${n.x + 16}" y="${n.y + 26}" font-size="15" font-weight="700" fill="#1D1A5E">${esc(n.text || '')}</text>${n.src && n.src.kind === 'flow' ? `<text x="${n.x + 16}" y="${n.y + 44}" font-size="11.5" fill="${stale(n) ? '#B54708' : '#667085'}">${stale(n) ? 'The original flow has changed since this copy was made · right-click the frame to refresh it' : `Copy of the ${esc(n.src.origin === 'proposed' ? 'proposed' : 'configured')} state flow · changes here stay on this board`}</text>` : n.src && n.src.kind === 'image' ? `<text x="${n.x + 16}" y="${n.y + 44}" font-size="11.5" fill="#667085">Read from an image by AI · check the dashed parts</text>` : ''}`;
    else if (n.t === 'image') {
      const href = forExport ? (W.imgData && W.imgData[n.fileId]) : W.imgUrl[n.fileId];
      shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#F8F9FC" stroke="${sel ? C.active : '#D0D5DD'}" stroke-width="${sel ? 2.5 : 1}"/>${href ? `<image href="${esc(href)}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" preserveAspectRatio="xMidYMid meet" opacity="${n.dim ? .45 : 1}"/>` : `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2}" text-anchor="middle" font-size="13" fill="#667085">Reference image</text>`}<text x="${n.x}" y="${n.y - 8}" font-size="11.5" fill="#667085">Reference image (original upload)</text>`;
      return `<g class="wb-n" data-id="${id}">${shape}${!forExport && sel && !ro() ? handle(n) : ''}</g>`;
    }
    else if (n.t === 'ellipse') shape = `<ellipse cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" rx="${n.w / 2}" ry="${n.h / 2}" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
    else if (n.t === 'diamond') shape = `<path d="M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w / 2} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
    else if (n.t === 'tri') shape = `<path d="M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h} L${n.x} ${n.y + n.h} Z" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${dash}/>`;
    else if (n.t === 'para') { const k = Math.min(n.w * .18, 28); shape = `<path d="M${n.x + k} ${n.y} L${n.x + n.w} ${n.y} L${n.x + n.w - k} ${n.y + n.h} L${n.x} ${n.y + n.h} Z" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${dash}/>`; }
    else if (n.t === 'hex') { const k = Math.min(n.w * .2, 30); shape = `<path d="M${n.x + k} ${n.y} L${n.x + n.w - k} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w - k} ${n.y + n.h} L${n.x + k} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${dash}/>`; }
    else if (n.t === 'ink') { const kx = n.w / (n.pw || n.w), ky = n.h / (n.ph || n.h); const d = (n.pts || []).map((q, i) => (i ? 'L' : 'M') + (n.x + q[0] * kx).toFixed(1) + ' ' + (n.y + q[1] * ky).toFixed(1)).join(' ');
      return `<g class="wb-n" data-id="${id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="transparent" stroke="${sel ? C.active : 'none'}" stroke-dasharray="4 3"/><path d="${d}" fill="none" stroke="${n.tc || '#1D1F3D'}" stroke-width="${n.sw || 3}" stroke-linecap="round" stroke-linejoin="round"/>${!forExport && sel && !ro() && !n.lock ? handle(n) : ''}</g>`; }
    else if (n.t === 'text') shape = sel ? `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="${C.active}" stroke-width="1.5" stroke-dasharray="4 3"/>` : '';
    else if (n.t === 'note') shape = `<rect x="${n.x + 3}" y="${n.y + 4}" width="${n.w}" height="${n.h}" rx="4" fill="rgba(16,24,40,.08)"/><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" fill="${n.fill || COLORS.note[0]}" stroke="${stroke}" stroke-width="${sw}"/>`;
    else { const rx = 3, fill = n.fill || COLORS.shape;
      shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`; }
    let label = '';
    if (n.t !== 'frame') {
      const size = n.size || (n.t === 'text' ? 18 : n.t === 'text' ? 18 : 13), L = lines(n.text, n.w, size), lh = size * 1.3, top = n.y + n.h / 2 - (L.length - 1) * lh / 2 + (n.t === 'tri' ? n.h * .14 : 0);
      const weight = n.b ? 700 : n.t === 'text' ? 700 : n.t === 'note' ? 500 : 400; const ink = n.tc || (n.t === 'note' || n.t === 'text' ? '#101828' : sel ? C.active : start ? C.initial : C.text); const tx = n.al === 'l' ? n.x + 10 : n.al === 'r' ? n.x + n.w - 10 : n.x + n.w / 2, anc = n.al === 'l' ? 'start' : n.al === 'r' ? 'end' : 'middle';
      label = `<text x="${tx}" text-anchor="${anc}" font-size="${size}" font-weight="${weight}" font-family="${FONT}" fill="${ink}">${L.map((t, i) => `<tspan x="${tx}" y="${(top + i * lh + size * .35).toFixed(1)}">${esc(t)}</tspan>`).join('')}</text>`;
      if (conf && !forExport) label += `<text x="${n.x + n.w - 6}" y="${n.y - 5}" text-anchor="end" font-size="10.5" font-weight="600" fill="${conf === 'uncertain' ? '#C11574' : '#B54708'}">${conf}</text>`;
    }
    const lockIc = n.lock && !forExport ? `<g transform="translate(${n.x + n.w - 14} ${n.y + 4})" pointer-events="none"><rect width="11" height="8" y="5" rx="2" fill="#667085"/><path d="M2.5 5 V3.5 a3 3 0 0 1 6 0 V5" fill="none" stroke="#667085" stroke-width="1.6"/></g>` : '';
    return `<g class="wb-n${n.lock ? ' locked' : ''}" data-id="${id}">${shape}${label}${lockIc}${!forExport && sel && !ro() && !n.lock ? handle(n) : ''}</g>`;
  }
  function stale(n) { if (!n.src || n.src.kind !== 'flow' || !n.src.sig) return false; const f = F.flowModel && F.flowModel(n.src.flowId); return !!f && flowSig(f) !== n.src.sig; }
  const handle = n => `<rect class="wb-h" data-h="${esc(n.id)}" x="${n.x + n.w - 6}" y="${n.y + n.h - 6}" width="12" height="12" rx="3" fill="#fff" stroke="${C.active}" stroke-width="2"/>`;
  // What a connector stands for. Transitions copied from a flow are configuration-backed. A line the person draws between two different
  // flows is only a drawing unless the project's relationship register (Configuration Inputs) records that link between the two modules.
  const norm = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function flowOf(n) { if (!n) return null; if (n.ref && n.ref.flow) return n.ref.flow; const fr = n.fr && node(n.fr); return fr && fr.src && fr.src.kind === 'flow' ? fr.src.flowId : null; }
  function moduleNames(fid) { const f = F.flowModel && F.flowModel(fid); if (!f) return []; const mv = F.moduleView ? F.moduleView(f.module) : null; return [f.module, mv && mv.label, mv && mv.displayName].filter(Boolean).map(norm); }
  function edgeKind(e) {
    if (e.ref && e.ref.transition) return { k: 'config', t: 'Transition copied from the state flow configuration' };
    const fa = flowOf(node(e.from)), fb = flowOf(node(e.to)); if (!fa || !fb || fa === fb) return { k: 'drawn', t: '' };
    const ma = moduleNames(fa), mb = moduleNames(fb); let rels = []; try { rels = I().list('cfgrel') || []; } catch (x) { }
    const hit = rels.filter(r => { const f = norm(r.from), t = norm(r.to); return (ma.includes(f) && mb.includes(t)) || (ma.includes(t) && mb.includes(f)); });
    const conf = hit.find(r => r.status === 'Confirmed');
    if (conf) return { k: 'confirmed', t: 'Confirmed in the relationship register: ' + (conf.type || 'link') + (conf.trigger ? ' · ' + conf.trigger : '') };
    if (hit.length) return { k: 'proposed', t: 'Proposed in the relationship register (not confirmed yet)' };
    return { k: 'manual', t: 'Drawn by hand: no relationship between these modules is recorded in Configuration Inputs' };
  }
  const KCOL = { confirmed: C.time, proposed: C.tbc, manual: '#8393ab' };   // links between flows: green when confirmed in the relationship register, orange when only proposed, grey when drawn by hand
  function edgeSvg(e, forExport) {
    const p = edgePts(e); if (!p) return ''; const sel = !forExport && W.sel.has(e.id), conf = e.conf && e.conf !== 'detected', K = edgeKind(e), kc = KCOL[K.k];
    const col = sel ? C.active : conf ? (e.conf === 'uncertain' ? '#E5197F' : C.tbc) : kc || C.line, dashed = conf || K.k === 'manual' || K.k === 'proposed';
    const mk = sel ? 'S' : kc ? K.k : '';
    let s = `<g class="wb-e wb-k-${K.k}" data-e="${esc(e.id)}">${K.t && !forExport ? `<title>${esc(K.t)}</title>` : ''}<path d="${p.d}" fill="none" stroke="transparent" stroke-width="14"/><circle cx="${p.p0[0]}" cy="${p.p0[1]}" r="2.5" fill="${col}"/><path d="${p.d}" fill="none" stroke="${col}" stroke-width="${sel ? 2 : 1.4}"${dashed ? ' stroke-dasharray="6 4"' : ''} stroke-linejoin="round"${e.ah === 'none' ? '' : ` marker-end="url(#wbArr${mk})"`}${e.ah === 'both' ? ` marker-start="url(#wbArr${mk})"` : ''}/>`;
    const tagTxt = kc ? (K.k === 'confirmed' ? 'Confirmed link' : K.k === 'proposed' ? 'Proposed link' : 'Not verified') : '';
    if (e.label || tagTxt) { const fromN = node(e.from); const pill = sel ? C.active : conf ? (e.conf === 'uncertain' ? '#E5197F' : C.tbc) : fromN && fromN.t === 'diamond' ? C.cond : C.user; const txt = e.label ? (e.label.length > 28 ? e.label.slice(0, 27) + '…' : e.label) : ''; const w = Math.min(220, Math.max(60, 22 + txt.length * 7));
      s += `<g class="wb-el" data-el="${esc(e.id)}">${txt ? `<rect x="${p.lx - w / 2}" y="${p.ly - 13}" width="${w}" height="26" rx="12.5" fill="${pill}"/><text x="${p.lx}" y="${p.ly + 4.5}" text-anchor="middle" font-size="12" font-family="${FONT}" fill="#fff">${esc(txt)}</text>` : ''}${tagTxt ? `<text x="${p.lx}" y="${p.ly + (txt ? 26 : 4)}" text-anchor="middle" font-size="10" font-weight="700" font-family="${FONT}" fill="${kc}">${tagTxt}</text>` : ''}</g>`; }
    return s + '</g>';
  }
  const DEFS = `<defs><marker id="wbArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.line}"/></marker><marker id="wbArrS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.active}"/></marker>${Object.keys(KCOL).map(k => `<marker id="wbArr${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${KCOL[k]}"/></marker>`).join('')}
    <pattern id="wbGrid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#dde3ea"/></pattern></defs>`;
  function worldSvg(forExport) {
    const ns = W.B.nodes, frames = ns.filter(n => n.t === 'frame'), imgs = ns.filter(n => n.t === 'image'), rest = ns.filter(n => n.t !== 'frame' && n.t !== 'image');
    return imgs.map(n => nodeSvg(n, forExport)).join('') + frames.map(n => nodeSvg(n, forExport)).join('') + W.B.edges.map(e => edgeSvg(e, forExport)).join('') + rest.map(n => nodeSvg(n, forExport)).join('') + (forExport ? '' : endHandles() + delChip());
  }
  // the two ends of a single selected connector, drawn above the shapes so they can always be grabbed
  function endHandles() {
    if (ro() || W.sel.size !== 1) return ''; const e = W.B.edges.find(x => W.sel.has(x.id)); if (!e) return ''; const p = edgePts(e); if (!p || !p.p0) return ''; const r = 6 / Math.max(.5, W.B.view.z);
    return ['from', 'to'].map((end, i) => { const q = i ? p.p1 : p.p0; return `<circle class="wb-eh" data-eh="${end}" data-e="${esc(e.id)}" cx="${q[0]}" cy="${q[1]}" r="${r}" fill="#fff" stroke="#1570EF" stroke-width="2"><title>Drag to attach this end to another shape</title></circle>`; }).join('');
  }
  // Miro-style delete chip: hovering an element (or selecting just one) shows a small delete button at its corner. Hovering never
  // deletes; the click does, and it is undoable (Ctrl+Z). Drawn at a constant screen size whatever the zoom.
  function delChip() {
    if (ro() || W.dragging || W.edit || W.tool !== 'select') return ''; let id = W.hover; if (!id && W.sel.size === 1) id = [...W.sel][0]; if (!id) return '';
    const z = Math.max(.2, W.B.view.z); let x, y; const n = node(id);
    if (n) { if (n.lock || n.hidden) return ''; x = n.x + n.w; y = n.y; }
    else { const e = W.B.edges.find(q => q.id === id); const p = e && edgePts(e); if (!p) return ''; const lo = e.lo || { x: 0, y: 0 }; x = (p.lx != null ? p.lx : (p.p0[0] + p.p1[0]) / 2) + lo.x + 14 / z; y = (p.ly != null ? p.ly : (p.p0[1] + p.p1[1]) / 2) + lo.y - 14 / z; }
    return `<g class="wb-hdel" data-del="${esc(id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 / z).toFixed(4)})" role="button" aria-label="Delete"><circle r="11" fill="#fff" stroke="#D92D20" stroke-width="1.5"/><path d="M-4 -4L4 4M4 -4L-4 4" stroke="#D92D20" stroke-width="2" stroke-linecap="round"/><title>Delete (Del) · Ctrl+Z to undo</title></g>`;
  }
  function delOne(id) {
    const n = node(id); if (n && n.lock) { V.toast('Unlock it first to delete it'); return; }
    pushUndo(); W.B.nodes = W.B.nodes.filter(q => q.id !== id); W.B.edges = W.B.edges.filter(e => e.id !== id && e.from !== id && e.to !== id); W.sel.delete(id); W.hover = null; changed(); draw(); V.toast('Deleted. Press Ctrl+Z to undo.', 3000);
  }
  function draw() {
    const svg = document.getElementById('wbSvg'); if (!svg || !W.B) return;
    const v = W.B.view; const wr = svg.querySelector('#wbWorld'); const gr = svg.querySelector('#wbGridR');
    wr.setAttribute('transform', `translate(${v.x.toFixed(1)} ${v.y.toFixed(1)}) scale(${v.z.toFixed(4)})`);
    gr.setAttribute('visibility', W.B.grid ? 'visible' : 'hidden'); gr.setAttribute('transform', `translate(${v.x % (GRID * v.z)} ${v.y % (GRID * v.z)}) scale(${v.z})`);
    wr.innerHTML = worldSvg(false) + (W.marquee ? `<rect x="${Math.min(W.marquee.x0, W.marquee.x1)}" y="${Math.min(W.marquee.y0, W.marquee.y1)}" width="${Math.abs(W.marquee.x1 - W.marquee.x0)}" height="${Math.abs(W.marquee.y1 - W.marquee.y0)}" fill="rgba(21,112,239,.08)" stroke="#1570EF" stroke-dasharray="4 3" pointer-events="none"/>` : '') + (W.ink && W.ink.length > 1 ? `<path d="${W.ink.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ')}" fill="none" stroke="${W.inkCol || '#1D1F3D'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>` : '') + (W.link ? `<path d="M${W.link.x0} ${W.link.y0} L${W.link.x1} ${W.link.y1}" stroke="#1570EF" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#wbArrS)" pointer-events="none"/>` : '') + (W.guides || []).map(g => g.x != null ? `<line class="wb-guide" x1="${g.x}" x2="${g.x}" y1="${g.a}" y2="${g.b}" stroke="#F04438" stroke-width="${1 / v.z}" stroke-dasharray="${4 / v.z} ${3 / v.z}" pointer-events="none"/>` : `<line class="wb-guide" y1="${g.y}" y2="${g.y}" x1="${g.a}" x2="${g.b}" stroke="#F04438" stroke-width="${1 / v.z}" stroke-dasharray="${4 / v.z} ${3 / v.z}" pointer-events="none"/>`).join('');
    const z = document.getElementById('wbZoom'); if (z) z.textContent = Math.round(v.z * 100) + '%';
    const sc = document.getElementById('wbSelInfo'); if (sc) sc.textContent = W.sel.size ? W.sel.size + ' selected' : '';
    document.querySelectorAll('[data-wbneed]').forEach(b => { const need = +b.getAttribute('data-wbneed'); b.disabled = ro() || W.sel.size < need; });
    const u = document.getElementById('wbUndo'), r = document.getElementById('wbRedo'); if (u) u.disabled = ro() || !W.undo.length; if (r) r.disabled = ro() || !W.redo.length;
    document.querySelectorAll('[data-wbtool]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-wbtool') === W.tool)));
    const host = document.getElementById('wbHost'); if (host) { host.classList.toggle('connecting', /^connect/.test(W.tool)); host.setAttribute('data-tool', W.tool); }
    const shB = document.getElementById('wbShapesB'); if (shB) shB.setAttribute('aria-pressed', String(SHAPE_TOOLS.includes(W.tool) || /^connect-/.test(W.tool)));
    ctxBar();
  }
  // during a drag the board is redrawn at most once per frame, which keeps large boards responsive
  let raf = 0; function paint() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
  // alignment guides: while dragging, edges and centres of the moving selection snap to those of other shapes within a few pixels
  function moveWithGuides(drag, dx, dy) {
    const tol = 6 / W.B.view.z; const mv = drag.start.map(([n, x, y]) => ({ x: x + dx, y: y + dy, w: n.w, h: n.h })); const b = bbox(mv);
    let gx = null, gy = null, bx = tol, by = tol;
    const xs = [b.x, b.x + b.w / 2, b.x + b.w], ys = [b.y, b.y + b.h / 2, b.y + b.h];
    drag.others.forEach(o => { if (o.t === 'frame' && b.x >= o.x && b.x + b.w <= o.x + o.w && b.y >= o.y && b.y + b.h <= o.y + o.h) return;   // the frame around you is not a guide
      [o.x, o.x + o.w / 2, o.x + o.w].forEach(t => xs.forEach(m => { const d = Math.abs(t - m); if (d < bx) { bx = d; gx = { off: t - m, x: t, o }; } }));
      [o.y, o.y + o.h / 2, o.y + o.h].forEach(t => ys.forEach(m => { const d = Math.abs(t - m); if (d < by) { by = d; gy = { off: t - m, y: t, o }; } })); });
    drag.start.forEach(([n, x, y]) => { n.x = gx ? Math.round((x + dx + gx.off) * 2) / 2 : snapV(x + dx); n.y = gy ? Math.round((y + dy + gy.off) * 2) / 2 : snapV(y + dy); });
    const nb = bbox(drag.start.map(([n]) => n)); W.guides = [];
    if (gx) W.guides.push({ x: gx.x, a: Math.min(nb.y, gx.o.y) - 20, b: Math.max(nb.y + nb.h, gx.o.y + gx.o.h) + 20 });
    if (gy) W.guides.push({ y: gy.y, a: Math.min(nb.x, gy.o.x) - 20, b: Math.max(nb.x + nb.w, gy.o.x + gy.o.w) + 20 });
  }
  // images on the board load through the project's file store
  function loadImages() { W.B.nodes.filter(n => n.t === 'image' && n.fileId && !W.imgUrl[n.fileId]).forEach(n => { W.imgUrl[n.fileId] = ''; V.fileBlob(n.fileId).then(b => { W.imgUrl[n.fileId] = URL.createObjectURL(b); draw(); }).catch(() => { }); }); }

  // ---------- page ----------
  const tb = (act, label, icon, extra) => `<button class="btn sm${icon && !label ? ' icon' : ''}" type="button" data-act="${act}"${extra || ''}${!label ? ` aria-label="${esc(icon[1])}" title="${esc(icon[1])}"` : ''}>${icon ? V.ico(icon[0]) : ''}${label ? esc(label) : ''}</button>`;
  function html() {
    if (I().ready(['wb']) && !I().ready(['cflow'])) I().load(['cflow']);
    if (!I().ready(['wb'])) { I().load(['wb', 'cflow']).then(() => V.render()); return `<div class="page-header"><div class="t"><h1>Process Whiteboard</h1></div></div><div class="page-body"><div class="empty">Loading boards…</div></div>`; }
    const B = current(); const list = boards();
    const head = `<div class="page-header"><div class="t"><h1>Process Whiteboard</h1><p>Lay out individual processes and the project's state flows side by side, connect them into one end-to-end process, and export it. Flows placed here are copies: the State Flow Builder stays the place to change a flow.</p></div>
      <div class="row">${list.length ? `<select data-change="wbPick" aria-label="Board">${list.map(b => `<option value="${esc(b.id)}"${b.id === W.boardId ? ' selected' : ''}>${esc(b.name || 'Untitled board')}</option>`).join('')}</select>` : ''}${ro() ? '' : '<button class="btn" data-act="wbNew">New board</button>'}${B && !ro() ? '<button class="btn" data-act="wbRename">Rename</button>' : ''}${B ? '<button class="btn" data-act="wbExport" data-scope="board" data-fmt="jpg">Export JPG</button><button class="btn primary" data-act="wbExport" data-scope="board">Export PNG</button>' : ''}</div></div>`;
    if (!B) return head + `<div class="page-body"><div class="card empty"><h3>No boards yet</h3><p>Create a board, then add notes and shapes, or place your project's state flows on it.</p>${ro() ? '' : '<div class="row empty-acts"><button class="btn primary" data-act="wbNew">Create a board</button></div>'}</div></div>`;
    const dis = ro() ? ' disabled' : ''; const nCf = cflows().length;
    const RB = (tool, icon, label, keyH) => `<button class="wb-rb" type="button" data-act="wbTool" data-wbtool="${tool}" aria-pressed="false" title="${esc(label)}${keyH ? ' (' + keyH + ')' : ''}" aria-label="${esc(label)}"${tool !== 'select' && tool !== 'hand' ? dis : ''}>${icon}</button>`;
    const shapesMenu = `<div class="wb-pop wb-shapes" id="wbShapes" hidden role="menu" aria-label="Shapes and lines"><div class="wb-pop-h">Lines</div><div class="wb-pop-g">${[['connect', IC.arrow, 'Arrow'], ['connect-elbow', IC.elbow, 'Elbow arrow'], ['connect-both', IC.both, 'Two-way arrow'], ['connect-line', IC.line, 'Line']].map(([t, ic, l]) => `<button type="button" role="menuitem" data-act="wbTool" data-wbtool="${t}" title="${l}" aria-label="${l}">${ic}</button>`).join('')}</div>
      <div class="wb-pop-h">Shapes</div><div class="wb-pop-g">${[['rect', IC.rect, 'Rectangle'], ['ellipse', IC.oval, 'Oval'], ['diamond', IC.rhombus, 'Decision (rhombus)'], ['tri', IC.tri, 'Triangle'], ['para', IC.para, 'Input / output'], ['hex', IC.hex, 'Hexagon'], ['frame', IC.frame, 'Frame']].map(([t, ic, l]) => `<button type="button" role="menuitem" data-act="wbTool" data-wbtool="${t}" title="${l}" aria-label="${l}">${ic}</button>`).join('')}</div></div>`;
    return head + `<div class="page-body wb-page">
      <div class="wb-tb wb-tb-slim" role="toolbar" aria-label="Board">
        <div class="wb-grp" role="group" aria-label="Processes"><button class="btn sm" type="button" data-act="wbFlows"${dis}>${V.ico('plus')}Add State Flow</button><button class="btn sm" type="button" data-act="wbAiText"${dis} title="Describe a process in words and the AI draws it">Describe with AI</button><button class="btn sm" type="button" data-act="wbImg"${dis}>Import from image</button><button class="btn sm" type="button" data-act="wbSaveFlow"${dis} title="Save the selected flow (or the whole board) as a State Flow">Save as state flow</button><button class="btn sm" type="button" data-act="wbNewFlow"${dis}>New state flow</button></div>
        <span class="spacer"></span><span class="xs muted" id="wbSelInfo"></span><span class="wb-save" id="wbSave"></span>
        <div class="wb-grp" role="group" aria-label="Combined flows"><button class="btn sm" type="button" data-act="wbCflows">Combined flows${nCf ? ` <span class="wb-cnt">${nCf}</span>` : ''}</button>${ro() ? '' : '<button class="btn sm primary" type="button" data-act="wbCflowSave">Save as combined flow</button>'}</div>
      </div>
      <div class="wb-host" id="wbHost" tabindex="0" aria-label="Whiteboard canvas. Pick a tool on the left, drag to pan, Ctrl and scroll to zoom, double-click to add or edit text.">
        <svg id="wbSvg" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Roboto, Arial, sans-serif">${DEFS}<rect id="wbGridR" x="-10000" y="-10000" width="20000" height="20000" fill="url(#wbGrid)" pointer-events="none"/><g id="wbWorld"></g></svg>
        <div class="wb-rail" role="toolbar" aria-orientation="vertical" aria-label="Tools">
          ${RB('select', IC.cursor, 'Select', 'V')}${RB('hand', IC.hand, 'Hand: move the board', 'H')}${RB('note', IC.note, 'Sticky note', 'N')}
          <button class="wb-rb" type="button" data-act="wbShapesT" id="wbShapesB" aria-haspopup="menu" aria-expanded="false" title="Shapes and lines (S)" aria-label="Shapes and lines"${dis}>${IC.shapes}</button>
          ${RB('text', IC.text, 'Text', 'T')}${RB('connect', IC.arrow, 'Connector', 'L')}${RB('pen', IC.pen, 'Pen', 'P')}${RB('frame', IC.frame, 'Frame', 'F')}
          <span class="wb-rsep"></span>
          <button class="wb-rb" type="button" data-act="wbUndo" id="wbUndo" title="Undo (Ctrl+Z)" aria-label="Undo">${IC.undo}</button><button class="wb-rb" type="button" data-act="wbRedo" id="wbRedo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${IC.redo}</button>
          ${shapesMenu}
        </div>
        <div class="wb-ctxbar" id="wbCtxBar" hidden role="toolbar" aria-label="Selection"></div>
        <div class="wb-zoombar" role="group" aria-label="View">
          <button class="wb-zb" type="button" data-act="wbViewMenu" title="Grid, snap and images" aria-label="Board settings">${IC.grid}</button><span class="wb-zsep"></span>
          <button class="wb-zb" type="button" data-act="wbFit" title="Fit to screen (Shift+F)" aria-label="Fit to screen">${IC.fit}</button>
          <button class="wb-zb" type="button" data-act="wbZoomBy" data-k="0.8" title="Zoom out" aria-label="Zoom out">−</button><button class="wb-zp" type="button" data-act="wbReset" id="wbZoom" title="Back to 100%">100%</button><button class="wb-zb" type="button" data-act="wbZoomBy" data-k="1.25" title="Zoom in" aria-label="Zoom in">+</button>
          <div class="wb-pop wb-viewpop" id="wbViewPop" hidden><label class="chk"><input type="checkbox" data-change="wbGridT"${B.grid ? ' checked' : ''}> Grid</label><label class="chk"><input type="checkbox" data-change="wbSnapT"${B.snap ? ' checked' : ''}> Snap to grid</label>${B.nodes.some(n => n.t === 'image') ? `<label class="chk"><input type="checkbox" data-change="wbImgT"${B.nodes.some(n => n.t === 'image' && !n.hidden) ? ' checked' : ''}> Reference images</label>` : ''}<label class="f" style="margin-top:6px">New connectors</label><select data-change="wbRoute" aria-label="Connector style"${dis}><option value="straight"${B.route !== 'elbow' ? ' selected' : ''}>Straight</option><option value="elbow"${B.route === 'elbow' ? ' selected' : ''}>Right-angle</option></select></div>
        </div>
        <div class="wb-legend xs" aria-label="Connector legend"><span class="wb-mode" title="Moving, grouping or connecting here never changes a state flow. Right-click a flow and choose Edit the original state flow to change it.">Composition mode · originals unchanged</span><span><i class="lg cfg"></i>Copied transition</span><span><i class="lg ok"></i>Confirmed link</span><span><i class="lg pr"></i>Proposed link</span><span><i class="lg mn"></i>Not verified</span></div>
      </div></div>`;
  }
  const svgI = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = { cursor: svgI('<path d="M5 3l14 7-6 2-2 6z"/>'), hand: svgI('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 15a1.5 1.5 0 0 1 2.5-1.7L8 15"/>'), note: svgI('<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/>'),
    shapes: svgI('<rect x="3" y="12" width="9" height="9" rx="1.5"/><circle cx="16.5" cy="7.5" r="4.5"/>'), text: svgI('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'), arrow: svgI('<path d="M5 19L19 5M10 5h9v9"/>'), elbow: svgI('<path d="M4 18h8V6h8M16 2l4 4-4 4"/>'), both: svgI('<path d="M6 18L18 6M12 6h6v6M6 12v6h6"/>'), line: svgI('<path d="M5 19L19 5"/>'),
    pen: svgI('<path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/>'), frame: svgI('<path d="M7 3v18M17 3v18M3 7h18M3 17h18"/>'), undo: svgI('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'), redo: svgI('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    rect: svgI('<rect x="3" y="6" width="18" height="12" rx="1.5"/>'), oval: svgI('<ellipse cx="12" cy="12" rx="9" ry="6.5"/>'), rhombus: svgI('<path d="M12 3l9 9-9 9-9-9z"/>'), tri: svgI('<path d="M12 4l9 16H3z"/>'), para: svgI('<path d="M7 6h14l-4 12H3z"/>'), hex: svgI('<path d="M7 4h10l5 8-5 8H7l-5-8z"/>'),
    grid: svgI('<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>'), fit: svgI('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), bold: svgI('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>'), lock: svgI('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'), unlock: svgI('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    dup: svgI('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'), trash: svgI('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), more: svgI('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
    al: svgI('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), ac: svgI('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'), ar: svgI('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'), group: svgI('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4v4M13 17H9v-4"/>'), dl: svgI('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>') };
  const FILLS = ['#FFFFFF', '#FFF4B8', '#FFE1EC', '#DDF4E4', '#E3EDFF', '#E8F1FD', '#FFE8D1', '#E4E7EC', '#1D1F3D'];
  const TCOLS = ['#101828', '#6071DB', '#3995E2', '#079455', '#DC6803', '#D92D20', '#667085', '#FFFFFF'];

  // ---------- coordinates & hit testing ----------
  function toWorld(ev) { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view; return { x: (ev.clientX - r.left - v.x) / v.z, y: (ev.clientY - r.top - v.y) / v.z }; }
  const groupOf = id => { const n = node(id); return n && n.g ? W.B.nodes.filter(m => m.g === n.g).map(m => m.id) : [id]; };
  function selectWithGroups(ids) { ids.forEach(id => groupOf(id).forEach(x => W.sel.add(x))); }

  function mount() {
    const svg = document.getElementById('wbSvg'); if (!svg || !current()) { paintState(); return; }
    fitHost(); loadImages(); draw(); paintState();
    let drag = null;
    svg.addEventListener('pointerdown', ev => {
      if (W.edit) commitEdit(); ctxClose(); if (ev.button === 2) return;   // right button: the context menu handles it
      const host = document.getElementById('wbHost'); host.focus({ preventScroll: true });
      const dEl = ev.target.closest('[data-del]'); if (dEl && !ro()) { ev.preventDefault(); ev.stopPropagation(); delOne(dEl.getAttribute('data-del')); return; }   // the chip never starts a drag
      const p = toWorld(ev), hEl = ev.target.closest('[data-h]'), nEl = ev.target.closest('[data-id]'), eEl = ev.target.closest('[data-e]'), ehEl = ev.target.closest('[data-eh]'), elEl = ev.target.closest('[data-el]');
      svg.setPointerCapture(ev.pointerId);
      if (W.tool === 'hand' || ev.button === 1) { drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: W.B.view.x, vy: W.B.view.y }; host.classList.add('panning'); W.dragging = true; return; }
      if (PLACE_TOOLS.includes(W.tool) && !ro()) { ev.preventDefault(); const t = W.tool, [w, h] = SIZES[t]; if (!ev.shiftKey) W.tool = 'select'; svg.releasePointerCapture && svg.releasePointerCapture(ev.pointerId); addNode(t, p.x - w / 2, p.y - h / 2, false); const n = W.B.nodes[W.B.nodes.length - 1]; if (t === 'note' || t === 'text') setTimeout(() => { if (W.edit) return; startEdit(n); }, 30); return; }
      if (W.tool === 'pen' && !ro()) { W.ink = [[p.x, p.y]]; drag = { kind: 'ink' }; W.dragging = true; return; }
      if (hEl && !ro() && !(node(hEl.getAttribute('data-h')) || {}).lock) { const n = node(hEl.getAttribute('data-h')); pushUndo(); drag = { kind: 'resize', n, x: p.x, y: p.y, w: n.w, h: n.h }; return; }
      if (ehEl && !ro()) { const e = W.B.edges.find(x => x.id === ehEl.getAttribute('data-e')); const end = ehEl.getAttribute('data-eh'); const fixed = node(end === 'from' ? e.to : e.from);
        drag = { kind: 'relink', e, end }; W.link = end === 'to' ? { x0: fixed.x + fixed.w / 2, y0: fixed.y + fixed.h / 2, x1: p.x, y1: p.y } : { x0: p.x, y0: p.y, x1: fixed.x + fixed.w / 2, y1: fixed.y + fixed.h / 2, rev: true }; draw(); return; }
      if (elEl && !ro() && W.sel.has(elEl.getAttribute('data-el'))) { const e = W.B.edges.find(x => x.id === elEl.getAttribute('data-el')); const lo = e.lo || { x: 0, y: 0 }; drag = { kind: 'label', e, x: p.x, y: p.y, lx: lo.x, ly: lo.y, moved: false }; return; }
      if (nEl) {
        const id = nEl.getAttribute('data-id');
        if (/^connect/.test(W.tool) && !ro()) { const n = node(id); drag = { kind: 'link', from: id }; W.link = { x0: n.x + n.w / 2, y0: n.y + n.h / 2, x1: p.x, y1: p.y }; return; }
        // Miro-style groups: the first click selects the group; clicking a member of the already-selected group (without dragging) selects just that member
        const grp = groupOf(id); let drill = null;
        if (ev.shiftKey) { if (W.sel.has(id)) grp.forEach(x => W.sel.delete(x)); else selectWithGroups([id]); }
        else if (!W.sel.has(id)) { W.sel.clear(); selectWithGroups([id]); }
        else if (grp.length > 1 && W.sel.size === grp.length && grp.every(x => W.sel.has(x))) drill = id;
        draw(); if (ro()) return;
        const moving = [...W.sel].map(node).filter(n => n && !n.lock);
        // a frame carries what sits inside it
        moving.filter(n => n.t === 'frame').forEach(fr => W.B.nodes.forEach(m => { if (m !== fr && !W.sel.has(m.id) && m.x >= fr.x && m.y >= fr.y && m.x + m.w <= fr.x + fr.w && m.y + m.h <= fr.y + fr.h) moving.push(m); }));
        const ids = new Set(moving.map(n => n.id)); drag = { kind: 'move', x: p.x, y: p.y, start: moving.map(n => [n, n.x, n.y]), moved: false, drill, others: W.B.nodes.filter(n => !ids.has(n.id) && !n.hidden && n.t !== 'image').slice(0, 1500) }; return;
      }
      if (eEl) { const id = eEl.getAttribute('data-e'); if (!ev.shiftKey) W.sel.clear(); W.sel.add(id); draw(); return; }
      if (ev.shiftKey) { W.marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; drag = { kind: 'marquee' }; return; }
      if (!ev.ctrlKey && !ev.metaKey) { W.sel.clear(); }
      drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: W.B.view.x, vy: W.B.view.y }; host.classList.add('panning'); draw();
    });
    svg.addEventListener('pointermove', ev => {
      if (!drag) { const t = ev.target.closest && ev.target.closest('[data-del],[data-id],[data-e]'); const h = t ? (t.getAttribute('data-del') || t.getAttribute('data-id') || t.getAttribute('data-e')) : null; if (h !== W.hover) { W.hover = h; paint(); } return; }
      const p = toWorld(ev);
      if (drag.kind === 'ink') { const l = W.ink[W.ink.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) * W.B.view.z >= 2 && W.ink.length < 4000) { W.ink.push([p.x, p.y]); paint(); } return; }
      if (drag.kind === 'move' || drag.kind === 'resize') W.dragging = true;
      if (drag.kind === 'pan') { W.B.view.x = drag.vx + ev.clientX - drag.sx; W.B.view.y = drag.vy + ev.clientY - drag.sy; paint(); }
      else if (drag.kind === 'move') { const dx = p.x - drag.x, dy = p.y - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 3) return; if (!drag.moved) { pushUndo(); drag.moved = true; }
        moveWithGuides(drag, dx, dy); paint(); }
      else if (drag.kind === 'label') { if (!drag.moved) { pushUndo(); drag.moved = true; } drag.e.lo = { x: Math.round(drag.lx + p.x - drag.x), y: Math.round(drag.ly + p.y - drag.y) }; paint(); }
      else if (drag.kind === 'relink') { if (W.link.rev) { W.link.x0 = p.x; W.link.y0 = p.y; } else { W.link.x1 = p.x; W.link.y1 = p.y; } paint(); }
      else if (drag.kind === 'resize') { drag.n.w = Math.max(40, snapV(drag.w + p.x - drag.x)); drag.n.h = Math.max(24, snapV(drag.h + p.y - drag.y)); paint(); }
      else if (drag.kind === 'marquee') { W.marquee.x1 = p.x; W.marquee.y1 = p.y; paint(); }
      else if (drag.kind === 'link') { W.link.x1 = p.x; W.link.y1 = p.y; paint(); }
    });
    const end = ev => {
      if (!drag) return; const d = drag; drag = null; W.dragging = false; document.getElementById('wbHost').classList.remove('panning');
      if (d.kind === 'ink') { const pts = W.ink || []; W.ink = null; if (pts.length > 1) { const b = pts.reduce((m, q) => ({ x0: Math.min(m.x0, q[0]), y0: Math.min(m.y0, q[1]), x1: Math.max(m.x1, q[0]), y1: Math.max(m.y1, q[1]) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }); const w = Math.max(8, b.x1 - b.x0), h = Math.max(8, b.y1 - b.y0);
          pushUndo(); const n = { id: uid('n'), t: 'ink', x: b.x0, y: b.y0, w, h, pw: w, ph: h, sw: 3, tc: W.inkCol || undefined, text: '', pts: pts.map(q => [Math.round((q[0] - b.x0) * 10) / 10, Math.round((q[1] - b.y0) * 10) / 10]) }; W.B.nodes.push(n); changed(); } draw(); return; }
      if (d.kind === 'pan') { changedView(); draw(); }
      else if (d.kind === 'move' && d.moved) { W.guides = null; changed(); draw(); }
      else if (d.kind === 'move' && d.drill) { W.sel = new Set([d.drill]); draw(); }
      else if (d.kind === 'label') { if (d.moved) changed(); draw(); }
      else if (d.kind === 'relink') { const hit = document.elementFromPoint(ev.clientX, ev.clientY), t = hit && hit.closest && hit.closest('#wbSvg [data-id]'); W.link = null;
        if (t && t.getAttribute('data-id') !== d.e[d.end]) { const to = node(t.getAttribute('data-id')); if (to && to.t !== 'frame') { pushUndo(); d.e[d.end] = to.id; if (d.e.ref) { delete d.e.ref; V.toast('This connector was a copied transition; it is now a drawing only. The state flow itself is unchanged.', 5000); } changed(); } }
        draw(); }
      else if (d.kind === 'resize') changed();
      else if (d.kind === 'marquee') { const m = W.marquee, x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1), y0 = Math.min(m.y0, m.y1), y1 = Math.max(m.y0, m.y1);
        selectWithGroups(W.B.nodes.filter(n => !n.hidden && n.t !== 'image' && n.x >= x0 && n.y >= y0 && n.x + n.w <= x1 && n.y + n.h <= y1).map(n => n.id)); W.marquee = null; draw(); }
      else if (d.kind === 'link') { const hit = document.elementFromPoint(ev.clientX, ev.clientY), t = hit && hit.closest && hit.closest('#wbSvg [data-id]'); W.link = null;   // pointer capture makes ev.target the canvas, so look up what is under the pointer
        if (t) { const to = t.getAttribute('data-id'); if (!W.B.edges.some(e => e.from === d.from && e.to === to)) { pushUndo(); const ne = { id: uid('e'), from: d.from, to, label: '' }; if (W.tool === 'connect-elbow') ne.route = 'elbow'; if (W.tool === 'connect-both') ne.ah = 'both'; if (W.tool === 'connect-line') ne.ah = 'none'; W.B.edges.push(ne); W.sel = new Set([ne.id]); changed(); const k = edgeKind(ne).k; if (k === 'manual') V.toast('Connected. This link between two flows is a drawing only: it is not recorded in Configuration Inputs.', 5000); else if (k === 'confirmed') V.toast('Connected. The relationship register confirms this link.'); } }
        draw(); }
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('pointerleave', () => { if (!drag && W.hover) { W.hover = null; paint(); } });
    svg.addEventListener('dblclick', ev => {
      if (ro()) return; const nEl = ev.target.closest('[data-id]'), eEl = ev.target.closest('[data-e]');
      if (nEl) { const n = node(nEl.getAttribute('data-id')); if (n.t !== 'image' && n.t !== 'ink' && !n.lock) startEdit(n); return; }
      if (eEl) { startEdit(W.B.edges.find(e => e.id === eEl.getAttribute('data-e')), true); return; }
      const p = toWorld(ev); addNode('note', p.x - 80, p.y - 50, true);
    });
    svg.addEventListener('wheel', ev => {
      ev.preventDefault(); const v = W.B.view;
      if (ev.ctrlKey || ev.metaKey) { const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, z = clamp(v.z * Math.exp(-ev.deltaY * .0015), MINZ, MAXZ); v.x = mx - (mx - v.x) * z / v.z; v.y = my - (my - v.y) * z / v.z; v.z = z; }
      else { v.x -= ev.deltaX; v.y -= ev.deltaY; }
      draw(); changedView();
    }, { passive: false });
    svg.addEventListener('contextmenu', ev => { ev.preventDefault(); ctxOpen(ev); });
    document.getElementById('wbHost').addEventListener('keydown', key);
  }
  // the canvas fills the rest of the window, whatever the toolbar wraps to, so the whole board is visible without scrolling the page
  function fitHost() { const h = document.getElementById('wbHost'); if (!h) return; const top = h.getBoundingClientRect().top + (document.querySelector('.main') || { scrollTop: 0 }).scrollTop; h.style.height = Math.max(420, Math.round(window.innerHeight - top - 16)) + 'px'; }
  if (typeof window !== 'undefined') window.addEventListener('resize', () => { if (document.getElementById('wbHost')) { fitHost(); draw(); } });
  let viewT = 0; function changedView() { clearTimeout(viewT); viewT = setTimeout(() => { if (!ro()) { W.dirty = true; save(); } }, 1500); }
  function key(ev) {
    if (W.edit || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && ev.target.id !== 'wbHost') return;
    const mod = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
    if (mod && k === 'z') { ev.preventDefault(); ev.shiftKey ? ACT.wbRedo() : ACT.wbUndo(); return; }
    if (mod && k === 'y') { ev.preventDefault(); ACT.wbRedo(); return; }
    if (mod && k === 'a') { ev.preventDefault(); W.B.nodes.forEach(n => { if (!n.hidden) W.sel.add(n.id); }); draw(); return; }
    if (mod && k === 'g') { ev.preventDefault(); ev.shiftKey ? ACT.wbUngroup() : ACT.wbGroup(); return; }
    if (mod && k === 'd') { ev.preventDefault(); duplicate(); return; }
    if (mod && k === 'c') { ev.preventDefault(); copySel(); return; }
    if (mod && k === 'x') { ev.preventDefault(); if (copySel()) ACT.wbDel(); return; }
    if (mod && k === 'v') { ev.preventDefault(); paste(); return; }
    if (k === 'f' && !mod && ev.shiftKey) { ev.preventDefault(); fit(); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && W.sel.size) { ev.preventDefault(); ACT.wbDel(); return; }
    if (ev.key === 'Escape') { ctxClose(); popsClose(); W.sel.clear(); W.tool = 'select'; W.link = null; draw(); return; }
    if (!mod && !ev.altKey) { const T = { v: 'select', h: 'hand', n: 'note', t: 'text', l: 'connect', p: 'pen', r: 'rect', o: 'ellipse', f: ev.shiftKey ? null : 'frame' }[k]; if (T) { ev.preventDefault(); W.tool = T; popsClose(); draw(); return; } if (k === 's') { ev.preventDefault(); ACT.wbShapesT(); return; } }
    const step = ev.shiftKey ? GRID : (W.B.snap ? GRID : 2), dir = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[k];
    if (dir && W.sel.size && !ro()) { ev.preventDefault(); pushUndo(); W.sel.forEach(id => { const n = node(id); if (n) { n.x += dir[0]; n.y += dir[1]; } }); changed(); draw(); }
  }

  // ---------- text editing (a plain textarea over the element: no HTML is ever interpreted) ----------
  function startEdit(target, isEdge) {
    const host = document.getElementById('wbHost'); if (!host || !target) return; const v = W.B.view;
    let x, y, w, h; if (isEdge) { const p = edgePts(target); if (!p) return; x = p.lx - 90; y = p.ly - 16; w = 180; h = 32; } else { x = target.x; y = target.y; w = target.w; h = Math.max(32, target.h); }
    const ta = document.createElement('textarea'); ta.className = 'wb-edit'; ta.value = (isEdge ? target.label : target.text) || ''; ta.maxLength = isEdge ? 80 : 600; ta.setAttribute('aria-label', isEdge ? 'Connector label' : 'Text');
    Object.assign(ta.style, { left: (v.x + x * v.z) + 'px', top: (v.y + y * v.z) + 'px', width: Math.max(120, w * v.z) + 'px', height: Math.max(32, h * v.z) + 'px', fontSize: Math.max(12, 14 * v.z) + 'px' });
    host.appendChild(ta); ta.focus(); ta.select(); W.edit = { ta, target, isEdge, before: snapshot() };
    ta.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); ta.value = (isEdge ? target.label : target.text) || ''; commitEdit(); } else if (ev.key === 'Enter' && (isEdge || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); commitEdit(); } ev.stopPropagation(); });
    ta.addEventListener('blur', () => commitEdit());
  }
  function commitEdit() {
    const e = W.edit; if (!e) return; W.edit = null; const val = e.ta.value.replace(/\s+$/g, ''); e.ta.remove();
    const old = e.isEdge ? e.target.label : e.target.text; if (val !== (old || '')) { W.undo.push(e.before); W.redo = []; if (e.isEdge) e.target.label = val.slice(0, 80); else e.target.text = val.slice(0, 600); changed(); }
    draw();
  }

  // ---------- adding and arranging ----------
  const SIZES = { note: [160, 110], rect: [160, 64], ellipse: [150, 70], diamond: [150, 96], text: [220, 40], tri: [130, 110], para: [170, 70], hex: [160, 80], frame: [640, 420] };
  function centre() { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view; return { x: (r.width / 2 - v.x) / v.z, y: (r.height / 2 - v.y) / v.z }; }
  function addNode(t, x, y, edit) {
    if (ro()) return; pushUndo(); const [w, h] = SIZES[t]; const n = { id: uid('n'), t, x: snapV(x), y: snapV(y), w, h, text: t === 'text' ? 'Heading' : t === 'note' ? '' : t === 'diamond' ? 'Decision?' : t === 'frame' ? 'Frame' : t === 'para' ? 'Input / output' : 'Step' };
    if (t === 'note') n.fill = COLORS.note[W.B.nodes.filter(m => m.t === 'note').length % COLORS.note.length];
    W.B.nodes.push(n); W.sel.clear(); W.sel.add(n.id); changed(); draw(); if (edit || (t === 'note' && edit !== false)) startEdit(n);
  }
  function duplicate() { if (ro() || !W.sel.size) return; pushUndo(); const map = {}; const gmap = {};
    [...W.sel].map(node).filter(Boolean).forEach(n => { const c = JSON.parse(JSON.stringify(n)); c.id = uid('n'); c.x += GRID * 2; c.y += GRID * 2; if (c.g) c.g = gmap[c.g] = gmap[c.g] || uid('g'); map[n.id] = c.id; W.B.nodes.push(c); });
    W.B.edges.filter(e => map[e.from] && map[e.to]).forEach(e => W.B.edges.push(Object.assign({}, e, { id: uid('e'), from: map[e.from], to: map[e.to] })));
    W.sel = new Set(Object.values(map)); changed(); draw(); }
  function fit() {
    const svg = document.getElementById('wbSvg'); if (!svg) return; const list = W.B.nodes.filter(n => !n.hidden), b = bbox(list), r = svg.getBoundingClientRect();
    if (!list.length) { W.B.view = { x: 40, y: 40, z: 1 }; draw(); return; }
    const z = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), MINZ, 1.5); W.B.view = { z, x: (r.width - b.w * z) / 2 - b.x * z, y: (r.height - b.h * z) / 2 - b.y * z }; draw(); changedView();
  }

  // ---------- clipboard (inside the app; copies between boards of the same session) ----------
  function withFrameContents(ids) { const out = new Set(ids); [...ids].map(node).filter(n => n && n.t === 'frame').forEach(fr => W.B.nodes.forEach(m => { if (m.x >= fr.x && m.y >= fr.y && m.x + m.w <= fr.x + fr.w && m.y + m.h <= fr.y + fr.h) out.add(m.id); })); return out; }
  function copySel() { const ids = withFrameContents([...W.sel].filter(id => node(id))); if (!ids.size) return false;
    W.clip = JSON.stringify({ nodes: W.B.nodes.filter(n => ids.has(n.id)), edges: W.B.edges.filter(e => ids.has(e.from) && ids.has(e.to)) }); W.pasteN = 0; V.toast(ids.size + ' item' + (ids.size === 1 ? '' : 's') + ' copied'); return true; }
  function paste(at) { if (ro() || !W.clip) return; const c = JSON.parse(W.clip); if (!c.nodes.length) return; pushUndo(); W.pasteN = (W.pasteN || 0) + 1;
    const b = bbox(c.nodes), off = at ? { x: snapV(at.x - b.x), y: snapV(at.y - b.y) } : { x: GRID * 2 * W.pasteN, y: GRID * 2 * W.pasteN }; const map = {}, gmap = {};
    c.nodes.forEach(n => { map[n.id] = n.t === 'frame' ? uid('n') : uid('n'); });
    c.nodes.forEach(n => { const m = Object.assign({}, n, { id: map[n.id], x: n.x + off.x, y: n.y + off.y }); if (m.g) m.g = gmap[m.g] = gmap[m.g] || uid('g'); if (m.fr) m.fr = map[m.fr]; W.B.nodes.push(m); });
    c.edges.forEach(e => W.B.edges.push(Object.assign({}, e, { id: uid('e'), from: map[e.from], to: map[e.to], fr: e.fr ? map[e.fr] : undefined })));
    W.sel = new Set(c.nodes.map(n => map[n.id])); changed(); draw(); }

  // ---------- context menu ----------
  if (typeof document !== 'undefined') document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('#wbCtx')) { const m = document.getElementById('wbCtx'); if (m) m.remove(); } }, true);
  function ctxClose() { const m = document.getElementById('wbCtx'); if (m) m.remove(); }
  function ctxOpen(ev) {
    ctxClose(); const host = document.getElementById('wbHost'); if (!host) return; const p = toWorld(ev); W.ctxAt = p;
    const nEl = ev.target.closest('[data-id]'), eEl = ev.target.closest('[data-e]'); const items = [];
    if (nEl) { const id = nEl.getAttribute('data-id'); if (!W.sel.has(id)) { W.sel.clear(); selectWithGroups([id]); draw(); } }
    else if (eEl) { const id = eEl.getAttribute('data-e'); if (!W.sel.has(id)) { W.sel = new Set([id]); draw(); } }
    const selN = [...W.sel].map(node).filter(Boolean), selE = W.B.edges.filter(e => W.sel.has(e.id)), one = selN.length === 1 ? selN[0] : null, w = !ro();
    if (selN.length) {
      if (one && one.t !== 'image' && w) items.push(['edit', 'Edit text', 'Enter']);
      items.push(['copy', 'Copy', 'Ctrl+C']); if (w) items.push(['dup', 'Duplicate', 'Ctrl+D']);
      if (w && selN.length > 1) items.push(['group', 'Group', 'Ctrl+G']); if (w && selN.some(n => n.g)) items.push(['ungroup', 'Ungroup', 'Ctrl+Shift+G']);
      if (w) { items.push(['front', 'Bring to front', '']); items.push(['back', 'Send to back', '']); }
      const fid = one ? (one.t === 'frame' && one.src && one.src.kind === 'flow' ? one.src.flowId : one.ref && one.ref.flow) : null;
      if (fid && F.flowModel(fid)) { items.push(['-']); items.push(['orig', 'Edit the original state flow…', '']); if (one.t === 'frame' && w) items.push(['refresh', stale(one) ? 'Refresh this copy (the flow changed)' : 'Refresh this copy from the flow', '']); }
      if (w) { items.push(['-']); items.push(['del', 'Delete', 'Del']); }
    } else if (selE.length) {
      if (w && selE.length === 1) items.push(['label', 'Edit label', '']);
      if (w) { items.push(['straight', 'Straight line', '']); items.push(['elbow', 'Right-angle line', '']); if (selE.some(e => e.lo)) items.push(['relabel', 'Put the label back in the middle', '']); }
      const e1 = selE[0], K = e1 ? edgeKind(e1) : null; if (K && K.t) items.push(['info', K.t, '', true]);
      if (w) { items.push(['-']); items.push(['del', 'Delete', 'Del']); }
    } else {
      if (w && W.clip) items.push(['pasteHere', 'Paste here', 'Ctrl+V']);
      if (w) { items.push(['note', 'Add a sticky note here', '']); items.push(['flows', 'Add State Flow…', '']); }
      items.push(['fit', 'Fit to screen', 'Shift+F']); items.push(['all', 'Select all', 'Ctrl+A']);
    }
    if (!items.length) return;
    const r = host.getBoundingClientRect(); const m = document.createElement('div'); m.id = 'wbCtx'; m.className = 'wb-ctx'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map(([k, l, sc, info]) => k === '-' ? '<hr>' : info ? `<div class="wb-ctx-info">${esc(l)}</div>` : `<button type="button" role="menuitem" data-act="wbCtx" data-k="${k}"><span>${esc(l)}</span>${sc ? `<kbd>${esc(sc)}</kbd>` : ''}</button>`).join('');
    host.appendChild(m); const x = Math.min(ev.clientX - r.left, r.width - m.offsetWidth - 6), y = Math.min(ev.clientY - r.top, r.height - m.offsetHeight - 6); m.style.left = Math.max(4, x) + 'px'; m.style.top = Math.max(4, y) + 'px';
    const first = m.querySelector('button'); if (first) first.focus();
    m.addEventListener('keydown', e2 => { const bs = [...m.querySelectorAll('button')], i = bs.indexOf(document.activeElement); if (e2.key === 'ArrowDown') { e2.preventDefault(); (bs[i + 1] || bs[0]).focus(); } else if (e2.key === 'ArrowUp') { e2.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); } else if (e2.key === 'Escape') { e2.preventDefault(); ctxClose(); host.focus(); } e2.stopPropagation(); });
  }
  ACT.wbCtx = a => { const k = a.getAttribute('data-k'); ctxClose(); const selN = [...W.sel].map(node).filter(Boolean), selE = W.B.edges.filter(e => W.sel.has(e.id));
    if (k === 'edit' && selN[0]) startEdit(selN[0]); else if (k === 'label' && selE[0]) startEdit(selE[0], true);
    else if (k === 'copy') copySel(); else if (k === 'dup') duplicate(); else if (k === 'group') ACT.wbGroup(); else if (k === 'ungroup') ACT.wbUngroup(); else if (k === 'del') ACT.wbDel();
    else if (k === 'front' || k === 'back') { pushUndo(); const ids = W.sel; const mv = W.B.nodes.filter(n => ids.has(n.id)), rest = W.B.nodes.filter(n => !ids.has(n.id)); W.B.nodes = k === 'front' ? rest.concat(mv) : mv.concat(rest); changed(); draw(); }
    else if (k === 'straight' || k === 'elbow') { pushUndo(); selE.forEach(e => { e.route = k; }); W.B.route = k; changed(); draw(); }
    else if (k === 'relabel') { pushUndo(); selE.forEach(e => { delete e.lo; }); changed(); draw(); }
    else if (k === 'pasteHere') paste(W.ctxAt); else if (k === 'note') addNode('note', W.ctxAt.x - 80, W.ctxAt.y - 55, true); else if (k === 'flows') ACT.wbFlows();
    else if (k === 'fit') fit(); else if (k === 'all') { W.B.nodes.forEach(n => { if (!n.hidden) W.sel.add(n.id); }); draw(); }
    else if (k === 'orig') openOriginal(selN[0]); else if (k === 'refresh') refreshCopy(selN[0]);
    const h = document.getElementById('wbHost'); if (h) h.focus({ preventScroll: true }); };
  // Operational editing stays in the State Flow Builder: it is permission-checked, records workshop proposals and keeps their history.
  async function openOriginal(n) {
    const fid = n.t === 'frame' ? n.src.flowId : n.ref.flow; const f = F.flowModel(fid); if (!f) return;
    if (S.readonly) { V.toast('You have read-only access: the original flow can be viewed but not changed.', 5000); }
    const ok = await V.confirmDialog('Edit the original state flow', `This leaves the whiteboard and opens "${f.name || 'the flow'}" in the State Flow Builder. Changes made there are workshop proposals for this project, saved with its change history; they do not change the live Facilio configuration. Nothing on this board changes the flow.`, 'Open State Flow Builder');
    if (!ok) return; await save(); S.ui.flowZoom = null; V.go('flow', { flowId: fid, selected: n.ref && (n.ref.state || n.ref.transition) || null });
  }
  // Bring a copy up to date with its flow: states that still exist keep the place you gave them; new ones are added; ones that were removed go,
  // together with their copied transitions. Lines, notes and shapes you drew stay where both ends still exist.
  function refreshCopy(fr) {
    if (ro() || !fr || !fr.src || fr.src.kind !== 'flow') return; const f = F.flowModel(fr.src.flowId); if (!f) return; pushUndo();
    const p = placeFlow(fr.src.flowId, fr.x, fr.y); const old = W.B.nodes.filter(n => n.t === 'state' && n.ref && n.ref.flow === fr.src.flowId && (n.fr === fr.id || (n.x >= fr.x && n.y >= fr.y && n.x + n.w <= fr.x + fr.w && n.y + n.h <= fr.y + fr.h)));
    const byState = {}; old.forEach(n => { byState[n.ref.state] = n; }); const idMap = {}; let added = 0, kept = 0;
    p.nodes.filter(n => n.t === 'state').forEach(nn => { const o = byState[nn.ref.state]; if (o) { o.text = nn.text; o.stype = nn.stype; o.fr = fr.id; idMap[nn.id] = o.id; delete byState[nn.ref.state]; kept++; } else { nn.fr = fr.id; W.B.nodes.push(nn); idMap[nn.id] = nn.id; added++; } });
    const gone = new Set(Object.values(byState).map(n => n.id));
    W.B.nodes = W.B.nodes.filter(n => !gone.has(n.id));
    const keptIds = new Set(Object.values(idMap)); W.B.edges = W.B.edges.filter(e => !(e.ref && e.ref.transition && e.ref.flow === fr.src.flowId && keptIds.has(e.from) && keptIds.has(e.to)) && !gone.has(e.from) && !gone.has(e.to));
    p.edges.forEach(e => W.B.edges.push(Object.assign(e, { from: idMap[e.from], to: idMap[e.to], fr: fr.id })));
    const inside = W.B.nodes.filter(n => n.fr === fr.id); if (inside.length) { const b = bbox(inside); fr.w = Math.max(fr.w, snapV(b.x + b.w - fr.x + 50)); fr.h = Math.max(fr.h, snapV(b.y + b.h - fr.y + 40)); }
    fr.src.sig = flowSig(f); changed(); draw(); V.toast(`Copy refreshed: ${kept} state${kept === 1 ? '' : 's'} kept in place, ${added} added, ${gone.size} removed`, 5000);
  }

  // ---------- state flows from the project ----------
  function flowCatalogue() {
    const out = []; (F.allFlows ? F.allFlows() : []).forEach(fid => { const f = F.flowModel(fid); if (!f || !f.states || !f.states.length) return; const mv = F.moduleView ? F.moduleView(f.module) : null;
      out.push({ id: fid, name: f.name || fid, module: f.module, moduleLabel: (mv && (mv.label || mv.displayName)) || f.module, states: f.states.length, transitions: (f.transitions || []).filter(t => !t.removed).length, enabled: f.enabled !== false, origin: f.origin || 'existing' }); });
    return out.sort((a, b) => String(a.moduleLabel).localeCompare(String(b.moduleLabel)) || String(a.name).localeCompare(String(b.name)));
  }
  // a short fingerprint of a flow's states and transitions, to tell when the original changed after it was copied to the board
  function flowSig(f) { const t = (f.states || []).map(x => x.id + ':' + (x.label || x.name || '')).join('|') + '#' + (f.transitions || []).filter(x => !x.removed).map(x => x.id + ':' + x.from + '>' + x.to + ':' + (x.name || '')).join('|'); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(36) + '.' + (f.states || []).length; }
  // a flow becomes a frame with its states and transitions inside; positions come from the flow's own layout
  function placeFlow(fid, ox, oy) {
    const f = F.flowModel(fid); if (!f) return null; const G = D.flowGeometry(f, { full: true }), fr = uid('n');
    const xs = f.states.map(s => G && G.st && G.st[s.id] ? G.st[s.id].x : s.x || 0), ys = f.states.map(s => s.y || 0);
    const minx = Math.min(...f.states.map(s => s.x || 0)), miny = Math.min(...ys); void xs;
    const ids = {}; const nodes = f.states.map(s => { const b = D.boxSize(s.label, true); const id = uid('n'); ids[s.id] = id;
      const typ = s.typeCode === 2 ? 'closed' : s.typeCode === 6 ? 'skipped' : 'open'; return { id, t: 'state', stype: typ, fr, x: snapV(ox + 30 + ((s.x || 0) - minx) * .9), y: snapV(oy + 70 + ((s.y || 0) - miny) * .9), w: Math.max(120, b.w), h: 40, text: s.label || s.name || 'State', ref: { flow: fid, state: s.id } }; });
    const edges = (f.transitions || []).filter(t => !t.removed && ids[t.from] && ids[t.to]).map(t => ({ id: uid('e'), from: ids[t.from], to: ids[t.to], label: t.name || '', fr, route: 'elbow', ref: { flow: fid, transition: t.id } }));
    const bb = bbox(nodes); const mv = F.moduleView ? F.moduleView(f.module) : null;
    const frame = { id: fr, t: 'frame', x: snapV(ox), y: snapV(oy), w: snapV(bb.x + bb.w - ox + 50), h: snapV(bb.y + bb.h - oy + 40), text: `${(mv && (mv.label || mv.displayName)) || f.module} · ${f.name || 'State flow'}`, src: { kind: 'flow', flowId: fid, module: f.module, origin: f.origin || 'existing', sig: flowSig(f) } };
    return { nodes: [frame].concat(nodes), edges, frame };
  }
  ACT.wbFlows = () => {
    const cat = flowCatalogue(); W.pick = new Set();
    if (!cat.length) { V.toast('This project has no state flows yet. Load the configuration under Project Settings, or create one in the State Flow Builder.', 6000, true); return; }
    V.drawer('Add state flows to the board', `<p class="small muted" style="margin-top:0">Pick one or more flows from this project. Each is placed as an editable copy inside a frame; the flow itself is not changed.</p>
      <input type="search" id="wbFq" placeholder="Search modules or flows" aria-label="Search modules or flows">
      <div class="wb-flist" id="wbFlist" role="listbox" aria-multiselectable="true">${cat.map(c => `<label class="wb-fi" data-q="${esc((c.moduleLabel + ' ' + c.name + ' ' + c.module).toLowerCase())}"><input type="checkbox" value="${esc(c.id)}" data-change="wbFlowTick"><span><b>${esc(c.moduleLabel)}</b> · ${esc(c.name)}<br><span class="xs muted">${c.states} states · ${c.transitions} transitions${c.enabled ? '' : ' · disabled in the org'}${c.origin === 'proposed' ? ' · proposed in workshops' : ''}</span></span></label>`).join('')}</div>
      <div class="wb-prev" id="wbPrev"><p class="xs muted">Tick a flow to preview it here.</p></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wbFlowsGo" id="wbFlowsGo" disabled>Add to board</button>`, { wide: true });
    const q = document.getElementById('wbFq'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll('#wbFlist .wb-fi').forEach(l => { l.hidden = v && !l.getAttribute('data-q').includes(v); }); }); q.focus();
  };
  ACT.wbFlowTick = el => { el.checked ? W.pick.add(el.value) : W.pick.delete(el.value); const go = document.getElementById('wbFlowsGo'); if (go) { go.disabled = !W.pick.size; go.textContent = W.pick.size > 1 ? `Add ${W.pick.size} flows to the board` : 'Add to board'; }
    const pv = document.getElementById('wbPrev'); if (!pv) return; const last = [...W.pick].pop(); if (!last) { pv.innerHTML = '<p class="xs muted">Tick a flow to preview it here.</p>'; return; }
    try { pv.innerHTML = `<div class="xs muted" style="margin-bottom:6px">Preview: ${esc(F.flowModel(last).name || '')}</div><div class="wb-prev-svg">${D.flowSvg(F.flowModel(last), { full: true, zoom: .6 })}</div>`; } catch (e) { pv.innerHTML = '<p class="xs muted">No preview for this flow.</p>'; } };
  ACT.wbFlowsGo = () => {
    if (!W.pick || !W.pick.size) return; pushUndo(); const c = centre(); let x = snapV(c.x - 200), y = snapV(c.y - 150); const added = [];
    const right = W.B.nodes.length ? bbox(W.B.nodes.filter(n => !n.hidden)) : null; if (right && right.w) { x = snapV(right.x + right.w + 80); y = snapV(right.y); }
    [...W.pick].forEach(fid => { const p = placeFlow(fid, x, y); if (!p) return; W.B.nodes.push(...p.nodes); W.B.edges.push(...p.edges); added.push(p.frame.id); y = snapV(p.frame.y + p.frame.h + 60); });
    V.closeDrawer(); W.sel = new Set(added); changed(); fit(); V.toast(added.length + ' flow' + (added.length === 1 ? '' : 's') + ' added as editable copies');
  };
  ACT.wbNewFlow = () => { if (V.ACT.newFlowDlg) { V.go('flow'); setTimeout(() => V.ACT.newFlowDlg({ getAttribute: () => null }), 150); } else V.go('flow'); };

  // ---------- describe a process in words: the AI builds it (the Miro-style AI box) ----------
  const flowIdx = () => flowCatalogue().map(c => { const f = F.flowModel(c.id) || {}; return { id: c.id, name: c.name, moduleLabel: c.moduleLabel, states: (f.states || []).map(x => x.label).slice(0, 16) }; });
  const aiUrl = () => `/api/projects/${S.project.id}/ai/flow-text`;
  function aiReview(r, provider) { const g = r.graph || r; W.imp = { graph: g, text: true }; const fl = r.useFlows || g.useFlows || [];
    const flows = fl.length ? `<h3 class="wb-rv-h">Existing state flows it suggests adding</h3><p class="xs muted">These are this project's own flows. Each is added as an editable copy in a frame; the flow itself is not changed. Untick any you do not want.</p><div class="wb-flist">${fl.map(f => `<label class="wb-fi"><input type="checkbox" data-wbf value="${esc(f.id)}" checked><span><b>${esc(f.module)}</b> · ${esc(f.name)}</span></label>`).join('')}</div>` : '';
    return (g.nodes && g.nodes.length ? reviewHtml(g, provider) : '<p class="xs muted">The AI only suggested existing flows, no extra steps.</p>') + flows; }
  function aiReady() { const go = document.querySelector('#drawer .drawer-f .btn.primary'); if (go) { go.textContent = 'Add to board'; go.setAttribute('data-act', 'wbAiAdd'); go.disabled = false; } }
  ACT.wbAiText = () => { W.imp = null;
    V.drawer('Describe a process, the AI draws it', `<p class="small muted" style="margin-top:0">Type what the process is, in plain words. The AI turns it into steps and connections, and points at your project's existing state flows that belong in it. You check the result before anything is added to the board.</p>
      <label class="f" for="wbAiT">The process</label><textarea id="wbAiT" rows="6" maxlength="4000" placeholder="e.g. A tenant raises a request. If it is urgent it becomes a work order straight away, otherwise the manager approves it first. The work order is assigned, worked, and closed after the tenant confirms. Link the asset to the work order."></textarea>
      <div class="xs muted" style="margin-top:4px">Use as much detail as you have. The AI uses only what you write.</div><div id="wbAiOut"></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn" data-act="wbAiClaude" title="Send the description and a ready-made prompt to your own Claude (your subscription, no API key)">Open in Claude</button><button class="btn" data-act="wbAiClaude" data-add="1" title="Bring back the JSON Claude wrote">Add from Claude</button><button class="btn primary" data-act="wbAiBuild">Build with AI</button>`, { wide: true });
    const t = document.getElementById('wbAiT'); if (t) t.focus(); };
  const aiText = () => String((document.getElementById('wbAiT') || {}).value || '').trim();
  ACT.wbAiBuild = a => V.busy(a, async () => { const text = aiText(); if (text.length < 10) { V.toast('Describe the process in a sentence or two first', 4000, true); return; }
    const out = document.getElementById('wbAiOut'); out.innerHTML = '<p class="small muted">The AI is reading your description… this can take up to half a minute.</p>';
    try { const r = await API.post(aiUrl(), { text, flows: flowIdx() }); out.innerHTML = aiReview(r, r.provider); aiReady(); }
    catch (e) { out.innerHTML = `<div class="notice err">${esc(e.message || 'The description could not be turned into a flow')}</div>`; } });
  ACT.wbAiClaude = a => { const out = document.getElementById('wbAiOut'); if (!out) return; const add = !!(a && a.getAttribute && a.getAttribute('data-add') === '1'); const text = aiText();
    if (!add && text.length < 10) { V.toast('Describe the process first, so Claude gets it', 4000, true); return; }
    V.claudeHandoff({ skipPack: add, title: 'Process from a description', url: aiUrl(), body: { text, flows: flowIdx() }, extra: 'Claude can reply with JSON (best), or draw a flowchart picture: save the picture and use Import from image.', into: 'wbAiOut', onReply: r => { out.innerHTML = aiReview(r, r.provider); aiReady(); } }); };
  ACT.wbAiAdd = a => V.busy(a, async () => { const ids = [...document.querySelectorAll('[data-wbf]:checked')].map(x => x.value); const steps = document.querySelectorAll('[data-wbn]:checked').length;
    if (!steps && !ids.length) { V.toast('Nothing is ticked', 4000, true); return; }
    if (steps) await ACT.wbImgAdd(null); if (ids.length) { W.pick = new Set(ids); ACT.wbFlowsGo(); } else if (!steps) V.closeDrawer(); });

  // ---------- save the selected flow (or the whole board) as a State Flow: replace an existing one, or add a new one ----------
  const FLOWISH = ['state', 'rect', 'ellipse', 'diamond', 'hex', 'para'];
  function pickFlowParts() { const sel = selNodes(); const frames = sel.filter(n => n.t === 'frame'); let ns = sel.filter(n => FLOWISH.includes(n.t) && !n.hidden);
    frames.forEach(f => W.B.nodes.filter(n => n.fr === f.id && FLOWISH.includes(n.t) && !ns.includes(n)).forEach(n => ns.push(n)));
    if (!ns.length) ns = W.B.nodes.filter(n => FLOWISH.includes(n.t) && !n.hidden);   // nothing selected: the whole board
    const ids = new Set(ns.map(n => n.id)); return { ns, es: W.B.edges.filter(e => ids.has(e.from) && ids.has(e.to)), whole: !sel.length || !(sel.some(n => FLOWISH.includes(n.t)) || frames.length) }; }
  function toFlowModel(ns, es, label) { const used = new Set(); const sid = n => { let b = 's_' + (F.slug(n.text || 'state') || 'state'), id = b, i = 2; while (used.has(id)) id = b + '_' + i++; used.add(id); return id; };
    const ids = {}; ns.forEach(n => { ids[n.id] = sid(n); }); const minX = Math.min(...ns.map(n => n.x)), minY = Math.min(...ns.map(n => n.y)); const lab = n => String(n.text || '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'State';
    const states = ns.map(n => ({ id: ids[n.id], name: F.slug(lab(n)) || ids[n.id], label: lab(n), x: Math.round((n.x - minX) / 10) * 10 + 60, y: Math.round((n.y - minY) / 10) * 10 + 60, origin: 'proposed' }));
    const trans = es.map(e => ({ id: F.uid('t'), name: String(e.label || '').trim().slice(0, 80) || 'Move to ' + states.find(x => x.id === ids[e.to]).label, from: ids[e.from], to: ids[e.to], type: 'user', buttonType: 0, enabled: true, actors: [{ actor: 'tbc:any', status: 'tbc', note: '' }], condition: '', conditionFields: [], commentRequired: false, approval: { required: false, approvers: [] }, actions: [], notifications: [], portals: [], notes: '', origin: 'proposed', removed: false }));
    const first = ns.find(n => n.t === 'ellipse' && !es.some(e => e.to === n.id)) || ns.find(n => !es.some(e => e.to === n.id)) || ns[0]; return { states, transitions: trans, initial: ids[first.id] }; }
  ACT.wbSaveFlow = () => { if (ro()) return; const { ns, es, whole } = pickFlowParts(); if (!ns.length) { V.toast('There are no states or steps on the board to save', 5000, true); return; }
    const mods = F.allModules().filter(x => x.inUse || x.origin === 'proposed' || x.inScope).sort((p, q) => String(p.label).localeCompare(String(q.label))); W.sv = { ns, es };
    const opt = (m) => mods.map(x => `<option value="${esc(x.name)}"${x.name === m ? ' selected' : ''}>${esc(x.label)}</option>`).join(''); const first = (flowCatalogue()[0] || {}).module || (mods[0] || {}).name || '';
    V.drawer('Save as a state flow', `<p class="small muted" style="margin-top:0">${whole ? 'Nothing is selected, so the whole board' : 'The selected flow'} (${ns.length} step${ns.length === 1 ? '' : 's'}, ${es.length} connection${es.length === 1 ? '' : 's'}) becomes a State Flow in the State Flow Builder. Each step becomes a state and each arrow a transition (roles are marked "to be confirmed").</p>
      <label class="f" for="sv_m">Module</label><select id="sv_m" data-change="wbSvMod">${opt(first)}</select>
      <div class="wb-svmode" role="radiogroup" aria-label="How to save it"><label class="chk"><input type="radio" name="sv_mode" value="add" checked data-change="wbSvMode"> <span><b>Add as a separate flow</b><br><span class="xs muted">A new proposed flow; the existing flows stay as they are.</span></span></label>
        <label class="chk"><input type="radio" name="sv_mode" value="replace" data-change="wbSvMode"> <span><b>Replace an existing flow</b><br><span class="xs muted">The chosen flow takes this drawing's states and transitions. Its name, criteria and default setting are kept. The State Flow Builder shows the difference from the configured flow.</span></span></label></div>
      <div id="sv_add"><label class="f" for="sv_n">Name of the new flow</label><input type="text" id="sv_n" maxlength="120" value="${esc(W.B.name || 'Flow from the whiteboard')}"></div>
      <div id="sv_rep" hidden><label class="f" for="sv_f">Flow to replace</label><select id="sv_f"></select><p class="xs muted" id="sv_w"></p></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wbSaveFlowGo">Save</button>`, { wide: true }); ACT.wbSvMod(document.getElementById('sv_m')); };
  ACT.wbSvMod = el => { const m = el.value; const fs = flowCatalogue().filter(c => c.module === m); const sel = document.getElementById('sv_f'); if (sel) sel.innerHTML = fs.length ? fs.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${c.states} states)${c.origin === 'proposed' ? ' · proposed' : ''}</option>`).join('') : '<option value="">This module has no flow to replace</option>'; };
  ACT.wbSvMode = () => { const rep = (document.querySelector('input[name=sv_mode]:checked') || {}).value === 'replace'; const a = document.getElementById('sv_add'), r = document.getElementById('sv_rep'); if (a) a.hidden = rep; if (r) { r.hidden = !rep; const w = document.getElementById('sv_w'); if (w) w.textContent = 'The flow you choose is overwritten with this drawing. You can undo it with Reset to source if it is a configured flow, or delete it if it is a proposed one.'; } };
  ACT.wbSaveFlowGo = a => V.busy(a, async () => { const mode = (document.querySelector('input[name=sv_mode]:checked') || {}).value; const m = document.getElementById('sv_m').value; const { ns, es } = W.sv || {}; if (!ns || !ns.length || !m) return;
    const model = toFlowModel(ns, es);
    if (mode === 'replace') { const id = document.getElementById('sv_f').value; const cur = id && F.flowModel(id); if (!cur) { V.toast('Choose the flow to replace', 4000, true); return; }
      if (!(await V.confirmDialog('Replace flow', 'Replace "' + (cur.name || id) + '" with this drawing (' + model.states.length + ' states, ' + model.transitions.length + ' transitions)? Its current states and transitions are overwritten.', 'Replace', true))) return;
      const keep = F.clone(cur); const next = Object.assign({}, keep, { states: model.states, transitions: model.transitions, initial: model.initial, workshopCopy: true, layoutDir: keep.layoutDir || 'h' }); S.ws.flows[id] = next; V.closeDrawer(); F.changed('Stateflow replaced from the whiteboard', (cur.name || id)); V.toast('"' + (cur.name || id) + '" now follows this drawing'); return; }
    const name = String((document.getElementById('sv_n') || {}).value || '').trim(); if (!name) { V.toast('Give the flow a name', 4000, true); return; }
    const id = m + '::proposed_' + Math.random().toString(36).slice(2, 7); S.ws.flows[id] = Object.assign(model, { id, module: m, name, description: 'Drawn on the Process Whiteboard "' + (W.B.name || '') + '"', criteria: '', origin: 'proposed', enabled: true, workshopCopy: true, isDefault: false });
    V.closeDrawer(); F.changed('Stateflow created from the whiteboard', name); V.toast('Saved as a new state flow: ' + name); });

  // ---------- import from image ----------
  ACT.wbImg = () => {
    W.imp = null;
    V.drawer('Import a flow from an image', `<p class="small muted" style="margin-top:0">Upload a picture of a flowchart or state flow (PNG, JPEG or WebP, up to 8 MB). The AI reads the steps and arrows (or, if it cannot read images here, your own Claude does it: Use my Claude); you review the result before anything is added. Parts it is unsure about are marked and drawn dashed.</p>
      <div class="row"><button class="btn" data-act="wbImgPick">Choose an image</button><span class="xs muted" id="wbImgName">No file chosen</span></div>
      <div class="wb-imgprev" id="wbImgPrev" hidden></div>
      <label class="f" for="wbImgHint" style="margin-top:14px">What does it show? (optional)</label><input type="text" id="wbImgHint" maxlength="200" placeholder="e.g. Work order approval in the maintenance app">
      <label class="chk" style="margin-top:12px"><input type="checkbox" id="wbImgKeep" checked> Keep the original image on the board as a reference layer</label>
      <div id="wbImgOut"></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn" data-act="wbImgClaude" title="Send this picture and a ready-made prompt to your own Claude (your subscription, no API key)">Use My Claude</button><button class="btn" data-act="wbImgClaude" data-add="1" title="Bring back the flow Claude read from the picture">Add from Claude</button><button class="btn primary" data-act="wbImgRead" id="wbImgRead" disabled>Read the diagram</button>`, { wide: true });
  };
  async function sniff(file) { const b = new Uint8Array(await file.slice(0, 12).arrayBuffer()); if (b[0] === 0x89 && b[1] === 0x50) return 'image/png'; if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg'; if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'; return ''; }
  ACT.wbImgPick = async () => {
    const f = (await V.pickFile('image/png,image/jpeg,image/webp'))[0]; if (!f) return;
    if (f.size > 8e6) { V.toast('That image is larger than 8 MB', 5000, true); return; }
    const type = await sniff(f); if (!type) { V.toast('That file is not a PNG, JPEG or WebP image', 5000, true); return; }
    W.imp = { file: f, type }; document.getElementById('wbImgName').textContent = f.name;
    const pv = document.getElementById('wbImgPrev'); pv.hidden = false; const url = URL.createObjectURL(f); pv.innerHTML = ''; const img = new Image(); img.alt = 'Preview of ' + f.name; img.src = url; pv.appendChild(img);
    document.getElementById('wbImgRead').disabled = false; document.getElementById('wbImgOut').innerHTML = '';
    // ready for a one-click hand-off to Claude: the picture as a PNG and the prompt, prepared now so the click itself can open Claude
    const mine = W.imp; mine.png = null; mine.pack = '';
    pngBlob(f).then(b => { mine.png = b; }).catch(() => { });
    API.post(`/api/projects/${S.project.id}/ai/flow-image`, { claudePack: true }).then(r => { mine.pack = r.prompt || ''; }).catch(() => { });
  };
  // the picture as a PNG (at most 2000 px on the long side), which is the one image type browsers let a page put on the clipboard
  async function pngBlob(file) { const bm = await createImageBitmap(file); const k = Math.min(1, 2000 / Math.max(bm.width, bm.height)); const c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height); bm.close && bm.close(); return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png')); }
  // shrink to at most 1600 px on the long side (smaller upload, same legibility for the model)
  async function shrink(file) {
    const bm = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(bm.width, bm.height)); const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height); bm.close && bm.close();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { data: btoa(bin), mediaType: 'image/jpeg', w: c.width, h: c.height };
  }
  ACT.wbImgClaude = a => { const out = document.getElementById('wbImgOut'); if (!out) return; const add = !!(a && a.getAttribute && a.getAttribute('data-add') === '1'); const hint = ((document.getElementById('wbImgHint') || {}).value || '').slice(0, 200);
    if (!add && !(W.imp && W.imp.file)) { V.toast('Choose the picture first, so it goes to Claude together with the prompt', 5000, true); return; }
    if (!add && !(W.imp.png && W.imp.pack)) { V.toast('The picture is still being prepared. Try again in a second.', 4000); return; }
    const o = { skipPack: add, title: 'Flow from an image', url: `/api/projects/${S.project.id}/ai/flow-image`, body: { hint }, extra: 'Attach the flow picture to the chat too.', into: 'wbImgOut',
      onReply: r => { W.imp = W.imp || {}; W.imp.graph = r.graph; out.innerHTML = reviewHtml(r.graph, r.provider); const keep = document.getElementById('wbImgKeep'); if (keep && !W.imp.file) { keep.checked = false; keep.disabled = true; } const go = document.querySelector('#drawer .drawer-f .btn.primary'); if (go) { go.textContent = 'Add to board'; go.setAttribute('data-act', 'wbImgAdd'); go.disabled = false; } } };
    if (!add) Object.assign(o, { prompt: W.imp.pack + (hint ? '\n\nContext from the user: ' + hint : ''), image: W.imp.png, autoOpen: true });
    V.claudeHandoff(o); };
  ACT.wbImgRead = a => V.busy(a, async () => {
    if (!W.imp) return; const out = document.getElementById('wbImgOut'); out.innerHTML = '<p class="small muted">Reading the diagram… this can take up to half a minute.</p>';
    try {
      const img = await shrink(W.imp.file); W.imp.w = img.w; W.imp.h = img.h;
      const r = await API.post(`/api/projects/${S.project.id}/ai/flow-image`, { mediaType: img.mediaType, data: img.data, hint: (document.getElementById('wbImgHint').value || '').slice(0, 200) });
      W.imp.graph = r.graph; out.innerHTML = reviewHtml(r.graph, r.provider);
      const go = document.querySelector('#drawer .drawer-f .btn.primary'); if (go) { go.textContent = 'Add to board'; go.setAttribute('data-act', 'wbImgAdd'); go.disabled = false; }
    } catch (e) { out.innerHTML = `<div class="notice err">${esc(e.message || 'The image could not be read')}</div>`; }
  });
  function reviewHtml(g, provider) {
    const badge = c => `<span class="tag ${c === 'detected' ? 'green' : c === 'inferred' ? 'orange' : 'red'}">${esc(c)}</span>`;
    const opts = ['start', 'end', 'state', 'process', 'decision'];
    return `<h3 class="wb-rv-h">Check what was read${g.title ? ': ' + esc(g.title) : ''}</h3><p class="xs muted">Read by ${esc(provider || 'Claude')}. Untick anything that is wrong, correct labels, then add. "Uncertain" means the model could not read it clearly; nothing missing has been filled in.</p>
      ${g.dropped && g.dropped.length ? `<div class="notice warn small">Left out because they did not fit the diagram: ${g.dropped.map(esc).join('; ')}</div>` : ''}${g.notes ? `<div class="notice small">Notes from the model: ${esc(g.notes)}</div>` : ''}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Use</th><th>Step</th><th>Kind</th><th>How sure</th></tr></thead><tbody>${g.nodes.map((n, i) => `<tr><td><input type="checkbox" data-wbn="${i}" checked aria-label="Use this step"></td><td><input type="text" data-wbl="${i}" value="${esc(n.label)}" maxlength="80" aria-label="Step label"></td><td><select data-wbk="${i}" aria-label="Kind">${opts.map(o => `<option${o === n.kind ? ' selected' : ''}>${o}</option>`).join('')}</select></td><td>${badge(n.confidence)}</td></tr>`).join('')}</tbody></table></div>
      <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Use</th><th>From</th><th>To</th><th>Label</th><th>How sure</th></tr></thead><tbody>${g.edges.map((e, i) => { const f = g.nodes.find(n => n.id === e.from), t = g.nodes.find(n => n.id === e.to); return `<tr><td><input type="checkbox" data-wbe="${i}" checked aria-label="Use this connection"></td><td>${esc(f ? f.label : e.from)}</td><td>${esc(t ? t.label : e.to)}</td><td><input type="text" data-wbel="${i}" value="${esc(e.label)}" maxlength="60" aria-label="Connection label"></td><td>${badge(e.confidence)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">No connections were read.</td></tr>'}</tbody></table></div>`;
  }
  ACT.wbImgAdd = a => V.busy(a, async () => {
    const g = W.imp && W.imp.graph; if (!g) return; const kEl = document.getElementById('wbImgKeep'); const keep = !!(kEl && kEl.checked && W.imp && W.imp.file);
    const nodes = g.nodes.map((n, i) => Object.assign({}, n, { use: document.querySelector(`[data-wbn="${i}"]`).checked, label: document.querySelector(`[data-wbl="${i}"]`).value.trim().slice(0, 80) || n.label, kind: document.querySelector(`[data-wbk="${i}"]`).value })).filter(n => n.use);
    const ok = new Set(nodes.map(n => n.id)); const edges = g.edges.map((e, i) => Object.assign({}, e, { use: document.querySelector(`[data-wbe="${i}"]`).checked, label: document.querySelector(`[data-wbel="${i}"]`).value.trim().slice(0, 60) })).filter(e => e.use && ok.has(e.from) && ok.has(e.to));
    if (!nodes.length) { V.toast('Nothing is ticked', 4000, true); return; }
    // layered layout: each step one column right of the step that leads to it
    const lvl = {}; const roots = nodes.filter(n => !edges.some(e => e.to === n.id)).map(n => n.id); const q = (roots.length ? roots : [nodes[0].id]).slice(); q.forEach(id => { lvl[id] = 0; });
    while (q.length) { const c = q.shift(); edges.filter(e => e.from === c).forEach(e => { if (lvl[e.to] === undefined) { lvl[e.to] = lvl[c] + 1; q.push(e.to); } }); }
    let mx = Math.max(0, ...Object.values(lvl)); nodes.forEach(n => { if (lvl[n.id] === undefined) lvl[n.id] = ++mx; });
    const rows = {}; pushUndo(); const c0 = centre(); const right = W.B.nodes.length ? bbox(W.B.nodes.filter(n => !n.hidden)) : null;
    let ox = right && right.w ? snapV(right.x + right.w + 80) : snapV(c0.x - 300), oy = right && right.w ? snapV(right.y) : snapV(c0.y - 160);
    const grp = uid('n'), map = {}, added = [];
    let imgW = 0;
    if (keep) { try { const rec = await API.uploadFile(S.project.id, W.imp.file, 'flow_image', { board: W.B.id }); const s = Math.min(1, 420 / W.imp.w); imgW = Math.round(W.imp.w * s);
      W.B.nodes.push({ id: uid('n'), t: 'image', fileId: rec.id, x: ox, y: oy + 60, w: imgW, h: Math.round(W.imp.h * s), dim: false }); } catch (e) { V.toast('The diagram was added, but the original image could not be kept: ' + e.message, 6000, true); } }
    const fx = ox + (imgW ? imgW + 60 : 0);
    nodes.forEach(n => { const L = lvl[n.id]; const r = rows[L] = (rows[L] || 0) + 1; const t = n.kind === 'decision' ? 'diamond' : n.kind === 'start' || n.kind === 'end' ? 'ellipse' : n.kind === 'process' ? 'rect' : 'state';
      const id = uid('n'); map[n.id] = id; const w = t === 'diamond' ? 160 : Math.max(130, Math.min(240, 18 + n.label.length * 7.4));
      W.B.nodes.push({ id, t, stype: 'open', fr: grp, x: snapV(fx + 30 + L * 240), y: snapV(oy + 70 + (r - 1) * 110), w, h: t === 'diamond' ? 90 : t === 'ellipse' ? 56 : 44, text: n.label, conf: n.confidence }); added.push(id); });
    edges.forEach(e => W.B.edges.push({ id: uid('e'), from: map[e.from], to: map[e.to], label: e.label, conf: e.confidence }));
    const bb = bbox(added.map(node)); const frame = { id: grp, t: 'frame', x: snapV(fx), y: snapV(oy), w: snapV(bb.x + bb.w - fx + 50), h: snapV(bb.y + bb.h - oy + 40), text: g.title || 'Imported flow', src: { kind: 'image' } };
    W.B.nodes.push(frame); W.sel = new Set([frame.id]); V.closeDrawer(); changed(); fit(); loadImages();
    V.toast(`${nodes.length} steps and ${edges.length} connections added. Dashed outlines mark parts to double-check.`, 6000);
  });

  // ---------- export ----------
  async function exportPng(scope, fmt) {
    const list = (scope === 'sel' ? [...W.sel].map(node).filter(Boolean) : W.B.nodes).filter(n => !n.hidden);
    if (!list.length) { V.toast(scope === 'sel' ? 'Select something to export' : 'The board is empty', 4000, true); return; }
    // a selected frame exports with everything inside it
    const ids = new Set(list.map(n => n.id)); list.filter(n => n.t === 'frame').forEach(fr => W.B.nodes.forEach(m => { if (!m.hidden && m.x >= fr.x && m.y >= fr.y && m.x + m.w <= fr.x + fr.w && m.y + m.h <= fr.y + fr.h) ids.add(m.id); }));
    const keep = W.B.nodes.filter(n => ids.has(n.id)), b = bbox(keep), pad = 40;
    W.imgData = {}; for (const n of keep.filter(n => n.t === 'image' && n.fileId)) { try { const bl = await V.fileBlob(n.fileId); W.imgData[n.fileId] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); } catch (e) { } }
    const saved = W.B; const sub = Object.assign({}, saved, { nodes: keep, edges: saved.edges.filter(e => ids.has(e.from) && ids.has(e.to)) });
    W.B = sub; let body; try { body = worldSvg(true); } finally { W.B = saved; }
    const w = Math.ceil(b.w + pad * 2), h = Math.ceil(b.h + pad * 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x - pad} ${b.y - pad} ${w} ${h}" font-family="Inter, Roboto, Arial, sans-serif">${DEFS.replace(/<pattern[\s\S]*?<\/pattern>/, '')}<rect x="${b.x - pad}" y="${b.y - pad}" width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
    // high resolution, kept inside what browsers can draw (about 16k pixels a side, 64M pixels in all)
    const scale = Math.max(.5, Math.min(2, 15000 / Math.max(w, h), Math.sqrt(6.4e7 / (w * h))));
    const png = await D.svgToPng(svg, scale); W.imgData = null;
    const jpg = fmt === 'jpg'; const base = (W.B.name || 'process-board').replace(/[^\w-]+/g, '_') + (scope === 'sel' ? '_selection' : ''); const name = base + (jpg ? '.jpg' : '.png'); let out = new Blob([png.data], { type: 'image/png' });
    if (jpg) { const bm = await createImageBitmap(out); const cv = document.createElement('canvas'); cv.width = bm.width; cv.width = bm.width; cv.height = bm.height; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bm, 0, 0); out = await new Promise(r => cv.toBlob(r, 'image/jpeg', .92)); }
    V.download(name, out); V.toast(`Exported ${name} (${Math.round(w * scale)} × ${Math.round(h * scale)} px)`);
  }
  root.__wbExportSvg = () => { const b = bbox(W.B.nodes); return { bbox: b, nodes: W.B.nodes.length, edges: W.B.edges.length }; };

  // ---------- Miro-style tools: placing shapes, the floating bar over a selection, popovers ----------
  const PLACE_TOOLS = ['note', 'rect', 'ellipse', 'diamond', 'tri', 'para', 'hex', 'text', 'frame'], SHAPE_TOOLS = ['rect', 'ellipse', 'diamond', 'tri', 'para', 'hex', 'frame'];
  function popsClose(except) { document.querySelectorAll('#wbHost .wb-pop').forEach(p => { if (p.id !== except) p.hidden = true; }); const b = document.getElementById('wbShapesB'); if (b && except !== 'wbShapes') b.setAttribute('aria-expanded', 'false'); }
  ACT.wbShapesT = () => { const m = document.getElementById('wbShapes'); if (!m) return; const open = m.hidden; popsClose(); m.hidden = !open; const b = document.getElementById('wbShapesB'); if (b) b.setAttribute('aria-expanded', String(open)); if (open) { const f = m.querySelector('button'); if (f) f.focus(); } };
  ACT.wbViewMenu = () => { const m = document.getElementById('wbViewPop'); if (!m) return; const open = m.hidden; popsClose(); m.hidden = !open; };
  ACT.wbPopT = a => { const id = 'wbPop_' + a.getAttribute('data-p'); const m = document.getElementById(id); if (!m) return; const open = m.hidden; popsClose(); m.hidden = !open; };
  if (typeof document !== 'undefined') document.addEventListener('pointerdown', ev => { if (!document.getElementById('wbHost')) return; if (ev.target.closest && ev.target.closest('.wb-pop, [data-act="wbShapesT"], [data-act="wbViewMenu"], [data-act="wbPopT"]')) return; popsClose(); }, true);
  const selNodes = () => [...W.sel].map(node).filter(Boolean), selEdges = () => W.B.edges.filter(e => W.sel.has(e.id));
  function ctxBar() {
    const bar = document.getElementById('wbCtxBar'); if (!bar || !W.B) return;
    const ns = selNodes(), es = selEdges();
    if (ro() || (!ns.length && !es.length) || W.dragging || W.edit || W.link) { bar.hidden = true; return; }
    const sig = [...W.sel].sort().join(',') + JSON.stringify(ns.map(n => [n.fill, n.size, n.b, n.al, n.tc, n.lock, n.g, n.t])) + JSON.stringify(es.map(e => [e.route, e.ah]));
    if (bar._sig !== sig) { bar._sig = sig; bar.innerHTML = ctxBarHtml(ns, es); }
    bar.hidden = false; const host = document.getElementById('wbHost'), v = W.B.view; let b = ns.length ? bbox(ns) : null;
    if (!b) { const p = edgePts(es[0]); if (!p) { bar.hidden = true; return; } b = { x: p.lx - 20, y: p.ly - 12, w: 40, h: 24 }; }
    const bw = bar.offsetWidth, bh = bar.offsetHeight, W0 = host.clientWidth, H0 = host.clientHeight;
    let left = v.x + (b.x + b.w / 2) * v.z - bw / 2, top = v.y + b.y * v.z - bh - 14; if (top < 8) top = v.y + (b.y + b.h) * v.z + 14;
    left = clamp(left, 64, Math.max(64, W0 - bw - 8)); top = clamp(top, 8, Math.max(8, H0 - bh - 56)); bar.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
  function ctxBarHtml(ns, es) {
    const B = (act, ic, label, extra, on) => `<button type="button" class="wb-cb${on ? ' on' : ''}" data-act="${act}" title="${esc(label)}" aria-label="${esc(label)}"${on !== undefined ? ` aria-pressed="${!!on}"` : ''}${extra || ''}>${ic}</button>`;
    const sep = '<span class="wb-csep"></span>'; let h = '';
    if (ns.length) { const n = ns[0], txt = ns.some(x => !['image', 'ink'].includes(x.t)), fillable = ns.some(x => !['image', 'ink', 'text', 'frame', 'state'].includes(x.t));
      const locked = ns.every(x => x.lock), size = n.size || (n.t === 'text' ? 18 : 14), al = n.al || 'c';
      if (fillable) h += `<div class="wb-cwrap"><button type="button" class="wb-cb wb-sw" data-act="wbPopT" data-p="fill" title="Fill colour" aria-label="Fill colour"><i style="background:${esc(n.fill || '#FFFFFF')}"></i></button><div class="wb-pop wb-swatches" id="wbPop_fill" hidden>${FILLS.map(c => `<button type="button" data-act="wbFill" data-c="${c}" style="background:${c}" aria-label="Fill ${c}"></button>`).join('')}</div></div>`;
      if (txt) h += `<select class="wb-csel" data-change="wbFont" aria-label="Font size" title="Font size">${[[11, 'XS'], [12, 'S'], [14, 'M'], [18, 'L'], [24, 'XL'], [32, '2XL'], [44, '3XL']].map(([v, l]) => `<option value="${v}"${size === v ? ' selected' : ''}>${l} · ${v}</option>`).join('')}${[11, 12, 14, 18, 24, 32, 44].includes(size) ? '' : `<option selected value="${size}">${size}</option>`}</select>`
        + B('wbBold', IC.bold, 'Bold', '', ns.every(x => x.b)) + B('wbAlignT', al === 'l' ? IC.al : al === 'r' ? IC.ar : IC.ac, 'Text alignment')
        + `<div class="wb-cwrap"><button type="button" class="wb-cb wb-tcol" data-act="wbPopT" data-p="tcol" title="Text colour" aria-label="Text colour"><b>A</b><i style="background:${esc(n.tc || '#101828')}"></i></button><div class="wb-pop wb-swatches" id="wbPop_tcol" hidden>${TCOLS.map(c => `<button type="button" data-act="wbTColor" data-c="${c}" style="background:${c}" aria-label="Text ${c}"></button>`).join('')}</div></div>`;
      if (!txt && ns.some(x => x.t === 'ink')) h += `<div class="wb-cwrap"><button type="button" class="wb-cb wb-tcol" data-act="wbPopT" data-p="tcol" title="Pen colour" aria-label="Pen colour"><i style="background:${esc(n.tc || '#1D1F3D')}"></i></button><div class="wb-pop wb-swatches" id="wbPop_tcol" hidden>${TCOLS.map(c => `<button type="button" data-act="wbTColor" data-c="${c}" style="background:${c}" aria-label="Pen ${c}"></button>`).join('')}</div></div>`;
      h += sep;
      if (ns.length > 1) h += `<select class="wb-csel" data-change="wbAlign" aria-label="Align selected"><option value="">Align</option><option value="l">Left edges</option><option value="c">Centres</option><option value="r">Right edges</option><option value="t">Top edges</option><option value="m">Middles</option><option value="b">Bottom edges</option><option value="dh">Distribute across</option><option value="dv">Distribute down</option></select>` + B('wbGroup', IC.group, 'Group (Ctrl+G)');
      else if (n.g) h += B('wbUngroup', IC.group, 'Ungroup (Ctrl+Shift+G)', '', true);
      h += B('wbLock', locked ? IC.lock : IC.unlock, locked ? 'Unlock' : 'Lock in place', '', locked) + B('wbDupB', IC.dup, 'Duplicate (Ctrl+D)') + B('wbExport', IC.dl, 'Export the selection as PNG', ' data-scope="sel"') + B('wbDel', IC.trash, 'Delete (Del)') + B('wbMore', IC.more, 'More');
    } else { const e = es[0], r = e.route || W.B.route || 'straight', ah = e.ah || 'end';
      h += `<div class="wb-cseg" role="group" aria-label="Connector style"><button type="button" class="${r !== 'elbow' ? 'on' : ''}" data-act="wbEdgeRoute" data-v="straight" title="Straight">${IC.line}</button><button type="button" class="${r === 'elbow' ? 'on' : ''}" data-act="wbEdgeRoute" data-v="elbow" title="Right-angle">${IC.elbow}</button></div>`
        + `<select class="wb-csel" data-change="wbArrow" aria-label="Arrowheads"><option value="end"${ah === 'end' ? ' selected' : ''}>→ End arrow</option><option value="both"${ah === 'both' ? ' selected' : ''}>↔ Both ends</option><option value="none"${ah === 'none' ? ' selected' : ''}>— No arrow</option></select>`
        + sep + B('wbEdgeLabel', IC.text, 'Label') + B('wbDel', IC.trash, 'Delete (Del)') + B('wbMore', IC.more, 'More'); }
    return h;
  }
  const edit = (label, fn) => { if (ro()) return; pushUndo(); fn(); changed(); popsClose(); draw(); };
  ACT.wbFill = a => edit('fill', () => selNodes().forEach(n => { if (!['image', 'ink', 'text'].includes(n.t)) n.fill = a.getAttribute('data-c'); }));
  ACT.wbTColor = a => edit('tc', () => selNodes().forEach(n => { n.tc = a.getAttribute('data-c'); }));
  ACT.wbFont = el => edit('size', () => selNodes().forEach(n => { n.size = clamp(Number(el.value) || 14, 8, 96); }));
  ACT.wbBold = () => { const on = !selNodes().every(n => n.b); edit('b', () => selNodes().forEach(n => { if (on) n.b = true; else delete n.b; })); };
  ACT.wbAlignT = () => { const cur = (selNodes()[0] || {}).al || 'c'; const nx = cur === 'c' ? 'l' : cur === 'l' ? 'r' : 'c'; edit('al', () => selNodes().forEach(n => { if (nx === 'c') delete n.al; else n.al = nx; })); };
  ACT.wbLock = () => { const on = !selNodes().every(n => n.lock); edit('lock', () => selNodes().forEach(n => { if (on) n.lock = true; else delete n.lock; })); V.toast(on ? 'Locked: it stays in place until unlocked' : 'Unlocked'); };
  ACT.wbDupB = () => duplicate();
  ACT.wbEdgeRoute = a => edit('route', () => selEdges().forEach(e => { e.route = a.getAttribute('data-v'); }));
  ACT.wbArrow = el => edit('ah', () => selEdges().forEach(e => { if (el.value === 'end') delete e.ah; else e.ah = el.value; }));
  ACT.wbEdgeLabel = () => { const e = selEdges()[0]; if (e) startEdit(e, true); };
  ACT.wbMore = a => { const r = a.getBoundingClientRect(); ctxOpen({ clientX: r.left, clientY: r.bottom + 4, target: document.querySelector(`#wbSvg [data-id="${CSS.escape([...W.sel][0] || '')}"]`) || document.getElementById('wbSvg'), preventDefault() { } }); };

  // ---------- combined flows: a saved, named snapshot of the board (or a selection) that the BRD can include ----------
  const cflows = () => { try { return I().ready(['cflow']) ? I().list('cflow').sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || ''))) : []; } catch (e) { return []; } };
  // reading order: follow the connectors from the shapes nothing points to; anything left over in top-to-bottom, left-to-right order
  function cflowOrder(data) {
    const ns = data.nodes.filter(n => !['frame', 'image', 'ink'].includes(n.t) && String(n.text || '').trim()); const ids = new Set(ns.map(n => n.id)); const es = data.edges.filter(e => ids.has(e.from) && ids.has(e.to));
    const inc = {}; es.forEach(e => { inc[e.to] = (inc[e.to] || 0) + 1; }); const pos = (a, b) => a.y - b.y || a.x - b.x; const out = [], seen = new Set();
    const q = ns.filter(n => !inc[n.id]).sort(pos); const visit = n => { if (seen.has(n.id)) return; seen.add(n.id); out.push(n); es.filter(e => e.from === n.id).map(e => ns.find(m => m.id === e.to)).filter(Boolean).sort(pos).forEach(visit); };
    q.forEach(visit); ns.slice().sort(pos).forEach(visit); return { steps: out, links: es };
  }
  V.cflowNarrative = data => { const d = clean({ nodes: JSON.parse(JSON.stringify(data.nodes || [])), edges: JSON.parse(JSON.stringify(data.edges || [])) }); const { steps, links } = cflowOrder(d); const txt = id => { const n = d.nodes.find(x => x.id === id); return n ? String(n.text || '').replace(/\s+/g, ' ').trim() : ''; };
    return { steps: steps.map(n => ({ text: String(n.text || '').replace(/\s+/g, ' ').trim(), kind: n.t === 'diamond' ? 'Decision' : n.t === 'state' ? 'State' : n.t === 'note' ? 'Note' : n.t === 'para' ? 'Input / output' : 'Step' })), links: links.map(e => ({ from: txt(e.from), to: txt(e.to), label: e.label || '' })).filter(l => l.from && l.to) }; };
  // the drawing of a combined flow, rebuilt from its cleaned shapes (text is escaped when drawn, so stored data never becomes markup)
  V.cflowSvg = (data, maxW) => {
    const d = clean({ name: data.name, nodes: JSON.parse(JSON.stringify(data.nodes || [])), edges: JSON.parse(JSON.stringify(data.edges || [])), route: data.route }); const keep = d.nodes.filter(n => !n.hidden && n.t !== 'image'); if (!keep.length) return '';
    const saved = W.B, savedSel = W.sel; W.B = Object.assign(blank(), d, { nodes: keep }); W.sel = new Set(); let body; try { body = worldSvg(true); } finally { W.B = saved; W.sel = savedSel; }
    const b = bbox(keep), pad = 30, w = Math.ceil(b.w + pad * 2), h = Math.ceil(b.h + pad * 2), sc = maxW && w > maxW ? maxW / w : 1;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * sc)}" height="${Math.round(h * sc)}" viewBox="${b.x - pad} ${b.y - pad} ${w} ${h}" font-family="Inter, Roboto, Arial, sans-serif">${DEFS.replace(/<pattern[\s\S]*?<\/pattern>/, '')}<rect x="${b.x - pad}" y="${b.y - pad}" width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
  };
  ACT.wbCflowSave = () => { if (ro()) return; const selN = selNodes().filter(n => n.t !== 'image');
    V.drawer('Save as combined flow', `<p class="small muted">A combined flow is a named snapshot of this board that you can add to the BRD. Later changes on the board do not change a saved flow; save it again to update it.</p>
      <label class="f">Name</label><input type="text" id="cf_n" maxlength="120" value="${esc(W.B.name || 'End-to-end process')}"><label class="f" style="margin-top:10px">What it shows (optional, appears in the BRD)</label><textarea id="cf_d" rows="3" maxlength="1500" placeholder="e.g. How a tenant complaint becomes a work order, gets approved and is closed"></textarea>
      <label class="f" style="margin-top:10px">Include</label><div class="row small"><label class="chk"><input type="radio" name="cf_s" value="board" ${selN.length ? '' : 'checked'}> The whole board</label><label class="chk"><input type="radio" name="cf_s" value="sel" ${selN.length ? 'checked' : 'disabled'}> Only the selection${selN.length ? ' (' + selN.length + ')' : ''}</label></div>
      <label class="chk" style="margin-top:12px"><input type="checkbox" id="cf_brd" checked> Add it to the BRD (End-to-End Business Processes)</label>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wbCflowGo">Save combined flow</button>`); };
  ACT.wbCflowGo = a => V.busy(a, async () => {
    const name = (document.getElementById('cf_n').value || '').trim(); if (!name) { V.toast('Give the combined flow a name', 4000, true); return; }
    const scope = (document.querySelector('input[name="cf_s"]:checked') || {}).value; let ns = (scope === 'sel' ? selNodes() : W.B.nodes).filter(n => !n.hidden && n.t !== 'image'); ns = [...withFrameContents(ns.map(n => n.id))].map(node).filter(n => n && !n.hidden && n.t !== 'image');
    if (!ns.length) { V.toast('There is nothing on the board to save yet', 4000, true); return; } if (ns.length > 600) { V.toast('A combined flow can hold up to 600 shapes. Select part of the board.', 6000, true); return; }
    const ids = new Set(ns.map(n => n.id)); const data = { name: name.slice(0, 120), desc: (document.getElementById('cf_d').value || '').trim().slice(0, 1500), boardId: W.B.id, boardName: W.B.name, route: W.B.route, nodes: JSON.parse(JSON.stringify(ns)), edges: JSON.parse(JSON.stringify(W.B.edges.filter(e => ids.has(e.from) && ids.has(e.to)))), inBrd: document.getElementById('cf_brd').checked, savedBy: (S.user && (S.user.name || S.user.email)) || '', savedAt: new Date().toISOString() };
    await save(); await I().put('cflow', uid('cf'), data); V.closeDrawer(); V.toast(data.inBrd ? 'Saved. It is in the BRD under End-to-End Business Processes.' : 'Combined flow saved'); V.render(); });
  ACT.wbCflows = () => { I().load(['cflow']).then(() => { const list = cflows(); V.drawer('Combined flows', list.length ? `<p class="small muted">Saved snapshots of the project's boards. Tick "In the BRD" to include one under End-to-End Business Processes.</p>${list.map(c => `<div class="cf-row"><div class="cf-pv">${V.cflowSvg(c, 220)}</div><div class="cf-t"><b>${esc(c.name)}</b><div class="xs muted">${esc(c.boardName || '')} · ${(c.nodes || []).length} shapes · saved ${esc(V.fmtDate ? V.fmtDate(String(c.savedAt || '').slice(0, 10)) : c.savedAt)}${c.savedBy ? ' by ' + esc(c.savedBy) : ''}</div>${c.desc ? `<div class="small">${esc(c.desc)}</div>` : ''}<div class="row small" style="margin-top:6px"><label class="chk"><input type="checkbox" data-change="wbCfBrd" data-id="${esc(c.id)}" ${c.inBrd ? 'checked' : ''} ${ro() ? 'disabled' : ''}> In the BRD</label>${ro() ? '' : `<button class="btn sm ghost" data-act="wbCfDel" data-id="${esc(c.id)}">Delete</button>`}</div></div></div>`).join('')}` : '<div class="empty"><p>No combined flows yet. Arrange the board, then use "Save as combined flow".</p></div>', `<button class="btn" data-act="closeDrawer">Close</button>`); }); };
  ACT.wbCfBrd = el => V.busy(null, async () => { const id = el.getAttribute('data-id'); const c = I().get('cflow', id); if (!c) return; await I().put('cflow', id, Object.assign({}, c, { inBrd: el.checked })); V.toast(el.checked ? 'Added to the BRD' : 'Removed from the BRD'); });
  ACT.wbCfDel = a => V.busy(a, async () => { if (!(await V.confirmDialog('Delete combined flow', 'Delete this saved combined flow? It is also removed from the BRD. The board is not changed.', 'Delete', true))) return; await I().del('cflow', a.getAttribute('data-id')); ACT.wbCflows(); });

  // ---------- actions ----------
  ACT.wbExport = a => V.busy(a, () => exportPng(a.getAttribute('data-scope'), a.getAttribute('data-fmt')));
  ACT.wbPick = el => { save(); W.boardId = el.value; W.B = null; V.render(); };
  function askName(title, value, act) {
    V.drawer(title, `<label class="f" for="wbName">Board name</label><input type="text" id="wbName" maxlength="80" value="${esc(value)}">`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="${act}">Save</button>`);
    const i = document.getElementById('wbName'); i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT[act](); } });
  }
  const nameVal = () => { const v = (document.getElementById('wbName') || {}).value || ''; return v.trim().slice(0, 80); };
  ACT.wbNew = () => askName('New board', 'End-to-end process', 'wbNewGo');
  ACT.wbNewGo = async () => { const name = nameVal(); if (!name) { V.toast('Give the board a name', 4000, true); return; } V.closeDrawer(); if (W.B) await save(); const id = I().uid('wb'); await I().put('wb', id, blank(name), { silent: true }); W.boardId = id; W.B = null; V.render(); };
  ACT.wbRename = () => askName('Rename the board', W.B.name, 'wbRenameGo');
  ACT.wbRenameGo = async () => { const name = nameVal(); if (!name) { V.toast('Give the board a name', 4000, true); return; } V.closeDrawer(); W.B.name = name; W.dirty = true; await save(); V.render(); };
  ACT.wbTool = a => { W.tool = a.getAttribute('data-wbtool'); popsClose(); draw(); const h = document.getElementById('wbHost'); if (h) h.focus({ preventScroll: true }); };
  ACT.wbAdd = a => { const c = centre(), t = a.getAttribute('data-t'), [w, h] = SIZES[t]; addNode(t, c.x - w / 2 + (W.B.nodes.length % 5) * 12, c.y - h / 2 + (W.B.nodes.length % 5) * 12); };
  ACT.wbDel = async () => { if (ro() || !W.sel.size) return; const many = [...W.sel].filter(id => node(id)).length; if (many >= 8 && !(await V.confirmDialog('Delete ' + many + ' elements', 'Delete the ' + many + ' selected elements and their connectors? You can undo this with Ctrl+Z.', 'Delete', true))) return; if ([...W.sel].some(id => (node(id) || {}).lock)) { W.sel = new Set([...W.sel].filter(id => !(node(id) || {}).lock)); if (!W.sel.size) { V.toast('Unlock it first to delete it'); draw(); return; } } pushUndo(); const ids = W.sel; W.B.nodes = W.B.nodes.filter(n => !ids.has(n.id)); W.B.edges = W.B.edges.filter(e => !ids.has(e.id) && !ids.has(e.from) && !ids.has(e.to)); W.sel = new Set(); changed(); draw(); };
  ACT.wbUndo = () => { if (ro() || !W.undo.length) return; W.redo.push(snapshot()); const s = JSON.parse(W.undo.pop()); W.B.nodes = s.nodes; W.B.edges = s.edges; W.sel = new Set(); changed(); draw(); };
  ACT.wbRedo = () => { if (ro() || !W.redo.length) return; W.undo.push(snapshot()); const s = JSON.parse(W.redo.pop()); W.B.nodes = s.nodes; W.B.edges = s.edges; W.sel = new Set(); changed(); draw(); };
  ACT.wbGroup = () => { const ns = [...W.sel].map(node).filter(Boolean); if (ns.length < 2 || ro()) return; pushUndo(); const g = uid('g'); ns.forEach(n => { n.g = g; }); changed(); draw(); V.toast('Grouped: they move together'); };
  ACT.wbUngroup = () => { const ns = [...W.sel].map(node).filter(Boolean); if (!ns.length || ro()) return; pushUndo(); ns.forEach(n => { delete n.g; }); changed(); draw(); };
  ACT.wbAlign = el => { const how = el.value; el.value = ''; const ns = [...W.sel].map(node).filter(n => n && n.t !== 'frame'); if (ns.length < 2 || ro()) return; pushUndo(); const b = bbox(ns);
    if (how === 'l') ns.forEach(n => { n.x = b.x; }); if (how === 'r') ns.forEach(n => { n.x = b.x + b.w - n.w; }); if (how === 'c') ns.forEach(n => { n.x = Math.round(b.x + b.w / 2 - n.w / 2); });
    if (how === 't') ns.forEach(n => { n.y = b.y; }); if (how === 'b') ns.forEach(n => { n.y = b.y + b.h - n.h; }); if (how === 'm') ns.forEach(n => { n.y = Math.round(b.y + b.h / 2 - n.h / 2); });
    if (how === 'dh' && ns.length > 2) { ns.sort((p, q) => p.x - q.x); const gap = (b.w - ns.reduce((a, n) => a + n.w, 0)) / (ns.length - 1); let x = b.x; ns.forEach(n => { n.x = Math.round(x); x += n.w + gap; }); }
    if (how === 'dv' && ns.length > 2) { ns.sort((p, q) => p.y - q.y); const gap = (b.h - ns.reduce((a, n) => a + n.h, 0)) / (ns.length - 1); let y = b.y; ns.forEach(n => { n.y = Math.round(y); y += n.h + gap; }); }
    changed(); draw(); };
  ACT.wbGridT = el => { W.B.grid = el.checked; W.dirty = true; draw(); save(); };
  ACT.wbImgT = el => { W.B.nodes.forEach(n => { if (n.t === 'image') n.hidden = !el.checked; }); W.sel = new Set([...W.sel].filter(id => { const n = node(id); return n && !n.hidden; })); changed(); draw(); };   // the reference layer can be hidden without deleting it
  ACT.wbRoute = el => { if (ro()) return; pushUndo(); W.B.route = el.value === 'elbow' ? 'elbow' : 'straight'; W.B.edges.forEach(e => { if (W.sel.has(e.id)) e.route = W.B.route; }); changed(); draw(); };
  ACT.wbSnapT = el => { W.B.snap = el.checked; W.dirty = true; save(); };
  ACT.wbZoomBy = a => { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view, z = clamp(v.z * Number(a.getAttribute('data-k')), MINZ, MAXZ), mx = r.width / 2, my = r.height / 2; v.x = mx - (mx - v.x) * z / v.z; v.y = my - (my - v.y) * z / v.z; v.z = z; draw(); changedView(); };
  ACT.wbFit = () => fit();
  ACT.wbReset = () => { const v = W.B.view, svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2; v.x = mx - (mx - v.x) / v.z; v.y = my - (my - v.y) / v.z; v.z = 1; draw(); changedView(); };

  V.whiteboard = { html, mount };
  V.whiteboardState = W;
})(typeof window !== 'undefined' ? window : globalThis);
