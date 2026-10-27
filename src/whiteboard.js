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
  const COLORS = { note: ['#FFF4B8', '#FFE1EC', '#DDF4E4', '#E3EDFF', '#F0E6FF'], shape: '#FFFFFF' };
  const uid = p => p + Math.random().toString(36).slice(2, 9);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // ---------- state ----------
  const W = { boardId: null, B: null, sel: new Set(), tool: 'select', undo: [], redo: [], dirty: false, saveT: 0, saving: false, lastSaved: null, edit: null, imgUrl: {} };
  const ro = () => !!S.readonly;
  const boards = () => I().list('wb').sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const blank = name => ({ name: name || 'Process board', miro: '', nodes: [], edges: [], grid: true, snap: true, view: { x: 40, y: 40, z: 1 } });
  function current() {
    const list = boards(); if (!W.boardId || !list.find(b => b.id === W.boardId)) W.boardId = (list[0] && list[0].id) || null;
    if (!W.boardId) return null;
    if (!W.B || W.B.id !== W.boardId) { const r = I().get('wb', W.boardId); W.B = Object.assign(blank(), JSON.parse(JSON.stringify(r)), { id: W.boardId }); W.sel.clear(); W.undo = []; W.redo = []; }
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
    const data = { name: W.B.name, miro: W.B.miro || '', nodes: W.B.nodes, edges: W.B.edges, grid: W.B.grid, snap: W.B.snap, view: W.B.view };
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
    const p = border(a, b.x + b.w / 2, b.y + b.h / 2), q = border(b, a.x + a.w / 2, a.y + a.h / 2);
    return { d: `M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)}`, lx: (p[0] + q[0]) / 2, ly: (p[1] + q[1]) / 2 };
  }
  function lines(text, w, size) { const per = Math.max(4, Math.floor((w - 16) / (size * .56))); return D && D.wrap ? D.wrap(text, per, 12) : [String(text || '')]; }

  // ---------- rendering ----------
  const STATE_FILL = { open: '#E3EDFF', closed: '#DDF4E4', skipped: '#F2F4F7' };
  function nodeSvg(n, forExport) {
    if (n.hidden) return '';
    const sel = !forExport && W.sel.has(n.id), id = esc(n.id), conf = n.conf && n.conf !== 'detected' ? n.conf : '';
    const stroke = sel ? '#1570EF' : conf === 'uncertain' ? '#E5197F' : conf === 'inferred' ? '#F5A524' : n.t === 'note' ? 'rgba(16,24,40,.12)' : '#98A2B3';
    const sw = sel ? 2.5 : 1.3, dash = conf ? ' stroke-dasharray="6 4"' : '';
    let shape = '';
    if (n.t === 'frame') shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14" fill="rgba(239,245,255,.55)" stroke="${sel ? '#1570EF' : '#B2CCFF'}" stroke-width="${sel ? 2.5 : 1.5}" stroke-dasharray="8 6"/><text x="${n.x + 16}" y="${n.y + 26}" font-size="15" font-weight="700" fill="#1D1A5E">${esc(n.text || '')}</text>${n.src && n.src.kind === 'flow' ? `<text x="${n.x + 16}" y="${n.y + 44}" font-size="11.5" fill="#667085">Copy of the ${esc(n.src.origin === 'proposed' ? 'proposed' : 'configured')} state flow · changes here stay on this board</text>` : n.src && n.src.kind === 'image' ? `<text x="${n.x + 16}" y="${n.y + 44}" font-size="11.5" fill="#667085">Read from an image by AI · check the dashed parts</text>` : ''}`;
    else if (n.t === 'image') {
      const href = forExport ? (W.imgData && W.imgData[n.fileId]) : W.imgUrl[n.fileId];
      shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="#F8F9FC" stroke="${sel ? '#1570EF' : '#D0D5DD'}" stroke-width="${sel ? 2.5 : 1}"/>${href ? `<image href="${esc(href)}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" preserveAspectRatio="xMidYMid meet" opacity="${n.dim ? .45 : 1}"/>` : `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2}" text-anchor="middle" font-size="13" fill="#667085">Reference image</text>`}<text x="${n.x}" y="${n.y - 8}" font-size="11.5" fill="#667085">Reference image (original upload)</text>`;
      return `<g class="wb-n" data-id="${id}">${shape}${!forExport && sel && !ro() ? handle(n) : ''}</g>`;
    }
    else if (n.t === 'ellipse') shape = `<ellipse cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" rx="${n.w / 2}" ry="${n.h / 2}" fill="${n.fill || '#fff'}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
    else if (n.t === 'diamond') shape = `<path d="M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w / 2} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z" fill="${n.fill || '#FFF8E6'}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
    else if (n.t === 'text') shape = sel ? `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="#1570EF" stroke-width="1.5" stroke-dasharray="4 3"/>` : '';
    else if (n.t === 'note') shape = `<rect x="${n.x + 3}" y="${n.y + 4}" width="${n.w}" height="${n.h}" rx="4" fill="rgba(16,24,40,.08)"/><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" fill="${n.fill || COLORS.note[0]}" stroke="${stroke}" stroke-width="${sw}"/>`;
    else { const rx = n.t === 'state' ? n.h / 2 : 8, fill = n.t === 'state' ? STATE_FILL[n.stype] || STATE_FILL.open : n.fill || COLORS.shape;
      shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx}" fill="${fill}" stroke="${n.t === 'state' && !sel && !conf ? '#84ADFF' : stroke}" stroke-width="${sw}"${dash}/>`; }
    let label = '';
    if (n.t !== 'frame') {
      const size = n.t === 'text' ? (n.size || 18) : n.t === 'state' ? 13 : 14, L = lines(n.text, n.w, size), lh = size * 1.3, top = n.y + n.h / 2 - (L.length - 1) * lh / 2;
      const weight = n.t === 'text' ? 700 : n.t === 'state' ? 600 : 500;
      label = `<text x="${n.x + n.w / 2}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="#101828">${L.map((t, i) => `<tspan x="${n.x + n.w / 2}" y="${(top + i * lh + size * .35).toFixed(1)}">${esc(t)}</tspan>`).join('')}</text>`;
      if (conf && !forExport) label += `<text x="${n.x + n.w - 6}" y="${n.y - 5}" text-anchor="end" font-size="10.5" font-weight="600" fill="${conf === 'uncertain' ? '#C11574' : '#B54708'}">${conf}</text>`;
    }
    return `<g class="wb-n" data-id="${id}">${shape}${label}${!forExport && sel && !ro() ? handle(n) : ''}</g>`;
  }
  const handle = n => `<rect class="wb-h" data-h="${esc(n.id)}" x="${n.x + n.w - 6}" y="${n.y + n.h - 6}" width="12" height="12" rx="3" fill="#fff" stroke="#1570EF" stroke-width="2"/>`;
  function edgeSvg(e, forExport) {
    const p = edgePts(e); if (!p) return ''; const sel = !forExport && W.sel.has(e.id), conf = e.conf && e.conf !== 'detected';
    const col = sel ? '#1570EF' : conf ? (e.conf === 'uncertain' ? '#E5197F' : '#F5A524') : '#475467';
    let s = `<g class="wb-e" data-e="${esc(e.id)}"><path d="${p.d}" fill="none" stroke="transparent" stroke-width="14"/><path d="${p.d}" fill="none" stroke="${col}" stroke-width="${sel ? 2.4 : 1.6}"${conf ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#wbArr${sel ? 'S' : ''})"/>`;
    if (e.label) { const w = Math.min(220, 12 + e.label.length * 6.6); s += `<rect x="${p.lx - w / 2}" y="${p.ly - 10}" width="${w}" height="20" rx="6" fill="#fff" stroke="${sel ? '#1570EF' : '#EAECF0'}"/><text x="${p.lx}" y="${p.ly + 4}" text-anchor="middle" font-size="11.5" fill="#344054">${esc(e.label.length > 32 ? e.label.slice(0, 31) + '…' : e.label)}</text>`; }
    return s + '</g>';
  }
  const DEFS = `<defs><marker id="wbArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475467"/></marker><marker id="wbArrS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#1570EF"/></marker>
    <pattern id="wbGrid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#D0D5DD"/></pattern></defs>`;
  function worldSvg(forExport) {
    const ns = W.B.nodes, frames = ns.filter(n => n.t === 'frame'), imgs = ns.filter(n => n.t === 'image'), rest = ns.filter(n => n.t !== 'frame' && n.t !== 'image');
    return imgs.map(n => nodeSvg(n, forExport)).join('') + frames.map(n => nodeSvg(n, forExport)).join('') + W.B.edges.map(e => edgeSvg(e, forExport)).join('') + rest.map(n => nodeSvg(n, forExport)).join('');
  }
  function draw() {
    const svg = document.getElementById('wbSvg'); if (!svg || !W.B) return;
    const v = W.B.view; const wr = svg.querySelector('#wbWorld'); const gr = svg.querySelector('#wbGridR');
    wr.setAttribute('transform', `translate(${v.x.toFixed(1)} ${v.y.toFixed(1)}) scale(${v.z.toFixed(4)})`);
    gr.setAttribute('visibility', W.B.grid ? 'visible' : 'hidden'); gr.setAttribute('transform', `translate(${v.x % (GRID * v.z)} ${v.y % (GRID * v.z)}) scale(${v.z})`);
    wr.innerHTML = worldSvg(false) + (W.marquee ? `<rect x="${Math.min(W.marquee.x0, W.marquee.x1)}" y="${Math.min(W.marquee.y0, W.marquee.y1)}" width="${Math.abs(W.marquee.x1 - W.marquee.x0)}" height="${Math.abs(W.marquee.y1 - W.marquee.y0)}" fill="rgba(21,112,239,.08)" stroke="#1570EF" stroke-dasharray="4 3" pointer-events="none"/>` : '') + (W.link ? `<path d="M${W.link.x0} ${W.link.y0} L${W.link.x1} ${W.link.y1}" stroke="#1570EF" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#wbArrS)" pointer-events="none"/>` : '');
    const z = document.getElementById('wbZoom'); if (z) z.textContent = Math.round(v.z * 100) + '%';
    const sc = document.getElementById('wbSelInfo'); if (sc) sc.textContent = W.sel.size ? W.sel.size + ' selected' : '';
    document.querySelectorAll('[data-wbneed]').forEach(b => { const need = +b.getAttribute('data-wbneed'); b.disabled = ro() || W.sel.size < need; });
    const u = document.getElementById('wbUndo'), r = document.getElementById('wbRedo'); if (u) u.disabled = ro() || !W.undo.length; if (r) r.disabled = ro() || !W.redo.length;
    document.querySelectorAll('[data-wbtool]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-wbtool') === W.tool)));
    const host = document.getElementById('wbHost'); if (host) host.classList.toggle('connecting', W.tool === 'connect');
  }
  // images on the board load through the project's file store
  function loadImages() { W.B.nodes.filter(n => n.t === 'image' && n.fileId && !W.imgUrl[n.fileId]).forEach(n => { W.imgUrl[n.fileId] = ''; V.fileBlob(n.fileId).then(b => { W.imgUrl[n.fileId] = URL.createObjectURL(b); draw(); }).catch(() => { }); }); }

  // ---------- page ----------
  const tb = (act, label, icon, extra) => `<button class="btn sm${icon && !label ? ' icon' : ''}" type="button" data-act="${act}"${extra || ''}${!label ? ` aria-label="${esc(icon[1])}" title="${esc(icon[1])}"` : ''}>${icon ? V.ico(icon[0]) : ''}${label ? esc(label) : ''}</button>`;
  function html() {
    if (!I().ready(['wb'])) { I().load(['wb']).then(() => V.render()); return `<div class="page-header"><div class="t"><h1>Process Whiteboard</h1></div></div><div class="page-body"><div class="empty">Loading boards…</div></div>`; }
    const B = current(); const list = boards();
    const head = `<div class="page-header"><div class="t"><h1>Process Whiteboard</h1><p>Lay out individual processes and the project's state flows side by side, connect them into one end-to-end process, and export it. Flows placed here are copies: the State Flow Builder stays the place to change a flow.</p></div>
      <div class="row">${list.length ? `<select data-change="wbPick" aria-label="Board">${list.map(b => `<option value="${esc(b.id)}"${b.id === W.boardId ? ' selected' : ''}>${esc(b.name || 'Untitled board')}</option>`).join('')}</select>` : ''}${ro() ? '' : '<button class="btn" data-act="wbNew">New board</button>'}${B && !ro() ? '<button class="btn" data-act="wbRename">Rename</button>' : ''}${B ? '<button class="btn" data-act="wbMiro">Miro</button><button class="btn primary" data-act="wbExport" data-scope="board">Export PNG</button>' : ''}</div></div>`;
    if (!B) return head + `<div class="page-body"><div class="card empty"><h3>No boards yet</h3><p>Create a board, then add notes and shapes, or place your project's state flows on it.</p>${ro() ? '' : '<div class="row empty-acts"><button class="btn primary" data-act="wbNew">Create a board</button></div>'}</div></div>`;
    const dis = ro() ? ' disabled' : '';
    return head + `<div class="page-body wb-page">
      <div class="wb-tb" role="toolbar" aria-label="Board tools">
        <div class="wb-grp" role="group" aria-label="Tool"><button class="btn sm" type="button" data-act="wbTool" data-wbtool="select" aria-pressed="true">Select</button><button class="btn sm" type="button" data-act="wbTool" data-wbtool="connect" aria-pressed="false"${dis}>Connect</button></div>
        <div class="wb-grp" role="group" aria-label="Add">${['note:Sticky note', 'rect:Box', 'ellipse:Oval', 'diamond:Decision', 'text:Text'].map(x => { const [t, l] = x.split(':'); return `<button class="btn sm" type="button" data-act="wbAdd" data-t="${t}"${dis}>${l}</button>`; }).join('')}</div>
        <div class="wb-grp" role="group" aria-label="Processes"><button class="btn sm primary" type="button" data-act="wbFlows"${dis}>Add State Flow</button><button class="btn sm" type="button" data-act="wbImg"${dis}>Import from image</button><button class="btn sm" type="button" data-act="wbNewFlow"${dis}>New state flow</button></div>
        <div class="wb-grp" role="group" aria-label="Arrange"><select data-change="wbAlign" aria-label="Align selected" data-wbneed="2"${dis}><option value="">Align…</option><option value="l">Left edges</option><option value="c">Centres (vertical line)</option><option value="r">Right edges</option><option value="t">Top edges</option><option value="m">Middles (horizontal line)</option><option value="b">Bottom edges</option><option value="dh">Distribute horizontally</option><option value="dv">Distribute vertically</option></select>
          <button class="btn sm" type="button" data-act="wbGroup" data-wbneed="2"${dis}>Group</button><button class="btn sm" type="button" data-act="wbUngroup" data-wbneed="1"${dis}>Ungroup</button><button class="btn sm" type="button" data-act="wbDel" data-wbneed="1"${dis}>Delete</button></div>
        <div class="wb-grp" role="group" aria-label="History">${tb('wbUndo', '', ['left', 'Undo (Ctrl+Z)'], ' id="wbUndo"')}${tb('wbRedo', '', ['right', 'Redo (Ctrl+Shift+Z)'], ' id="wbRedo"')}</div>
        <div class="wb-grp" role="group" aria-label="View"><label class="chk"><input type="checkbox" data-change="wbGridT"${B.grid ? ' checked' : ''}> Grid</label>${B.nodes.some(n => n.t === 'image') ? `<label class="chk"><input type="checkbox" data-change="wbImgT"${B.nodes.some(n => n.t === 'image' && !n.hidden) ? ' checked' : ''}> Reference images</label>` : ''}<label class="chk"><input type="checkbox" data-change="wbSnapT"${B.snap ? ' checked' : ''}> Snap</label>
          <button class="btn sm icon" type="button" data-act="wbZoomBy" data-k="0.8" aria-label="Zoom out" title="Zoom out">−</button><span class="wb-zoom" id="wbZoom">100%</span><button class="btn sm icon" type="button" data-act="wbZoomBy" data-k="1.25" aria-label="Zoom in" title="Zoom in">+</button><button class="btn sm" type="button" data-act="wbFit">Fit</button><button class="btn sm" type="button" data-act="wbReset">100%</button></div>
        <span class="spacer"></span><span class="xs muted" id="wbSelInfo"></span><button class="btn sm" type="button" data-act="wbExport" data-scope="sel" data-wbneed="1">Export selection</button><span class="wb-save" id="wbSave"></span>
      </div>
      <div class="wb-host" id="wbHost" tabindex="0" aria-label="Whiteboard canvas. Drag to pan, Ctrl and scroll to zoom, double-click to add or edit text.">
        <svg id="wbSvg" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Roboto, Arial, sans-serif">${DEFS}<rect id="wbGridR" x="-10000" y="-10000" width="20000" height="20000" fill="url(#wbGrid)" pointer-events="none"/><g id="wbWorld"></g></svg>
        <div class="wb-hint xs muted">Drag empty space to pan · Ctrl + scroll to zoom · Shift + drag to select an area · double-click to edit · Delete removes the selection</div>
      </div></div>`;
  }

  // ---------- coordinates & hit testing ----------
  function toWorld(ev) { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view; return { x: (ev.clientX - r.left - v.x) / v.z, y: (ev.clientY - r.top - v.y) / v.z }; }
  const groupOf = id => { const n = node(id); return n && n.g ? W.B.nodes.filter(m => m.g === n.g).map(m => m.id) : [id]; };
  function selectWithGroups(ids) { ids.forEach(id => groupOf(id).forEach(x => W.sel.add(x))); }

  function mount() {
    const svg = document.getElementById('wbSvg'); if (!svg || !current()) { paintState(); return; }
    loadImages(); draw(); paintState();
    let drag = null;
    svg.addEventListener('pointerdown', ev => {
      if (W.edit) commitEdit();
      const host = document.getElementById('wbHost'); host.focus({ preventScroll: true });
      const p = toWorld(ev), hEl = ev.target.closest('[data-h]'), nEl = ev.target.closest('[data-id]'), eEl = ev.target.closest('[data-e]');
      svg.setPointerCapture(ev.pointerId);
      if (hEl && !ro()) { const n = node(hEl.getAttribute('data-h')); pushUndo(); drag = { kind: 'resize', n, x: p.x, y: p.y, w: n.w, h: n.h }; return; }
      if (nEl) {
        const id = nEl.getAttribute('data-id');
        if (W.tool === 'connect' && !ro()) { const n = node(id); drag = { kind: 'link', from: id }; W.link = { x0: n.x + n.w / 2, y0: n.y + n.h / 2, x1: p.x, y1: p.y }; return; }
        if (ev.shiftKey) { if (W.sel.has(id)) groupOf(id).forEach(x => W.sel.delete(x)); else selectWithGroups([id]); }
        else if (!W.sel.has(id)) { W.sel.clear(); selectWithGroups([id]); }
        draw(); if (ro()) return;
        const moving = [...W.sel].map(node).filter(Boolean);
        // a frame carries what sits inside it
        moving.filter(n => n.t === 'frame').forEach(fr => W.B.nodes.forEach(m => { if (m !== fr && !W.sel.has(m.id) && m.x >= fr.x && m.y >= fr.y && m.x + m.w <= fr.x + fr.w && m.y + m.h <= fr.y + fr.h) moving.push(m); }));
        drag = { kind: 'move', x: p.x, y: p.y, start: moving.map(n => [n, n.x, n.y]), moved: false }; return;
      }
      if (eEl) { const id = eEl.getAttribute('data-e'); if (!ev.shiftKey) W.sel.clear(); W.sel.add(id); draw(); return; }
      if (ev.shiftKey) { W.marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; drag = { kind: 'marquee' }; return; }
      if (!ev.ctrlKey && !ev.metaKey) { W.sel.clear(); }
      drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: W.B.view.x, vy: W.B.view.y }; host.classList.add('panning'); draw();
    });
    svg.addEventListener('pointermove', ev => {
      if (!drag) return; const p = toWorld(ev);
      if (drag.kind === 'pan') { W.B.view.x = drag.vx + ev.clientX - drag.sx; W.B.view.y = drag.vy + ev.clientY - drag.sy; draw(); }
      else if (drag.kind === 'move') { const dx = p.x - drag.x, dy = p.y - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 3) return; if (!drag.moved) { pushUndo(); drag.moved = true; }
        drag.start.forEach(([n, x, y]) => { n.x = snapV(x + dx); n.y = snapV(y + dy); }); draw(); }
      else if (drag.kind === 'resize') { drag.n.w = Math.max(40, snapV(drag.w + p.x - drag.x)); drag.n.h = Math.max(24, snapV(drag.h + p.y - drag.y)); draw(); }
      else if (drag.kind === 'marquee') { W.marquee.x1 = p.x; W.marquee.y1 = p.y; draw(); }
      else if (drag.kind === 'link') { W.link.x1 = p.x; W.link.y1 = p.y; draw(); }
    });
    const end = ev => {
      if (!drag) return; const d = drag; drag = null; document.getElementById('wbHost').classList.remove('panning');
      if (d.kind === 'pan') { changedView(); }
      else if (d.kind === 'move' && d.moved) changed();
      else if (d.kind === 'resize') changed();
      else if (d.kind === 'marquee') { const m = W.marquee, x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1), y0 = Math.min(m.y0, m.y1), y1 = Math.max(m.y0, m.y1);
        selectWithGroups(W.B.nodes.filter(n => !n.hidden && n.x >= x0 && n.y >= y0 && n.x + n.w <= x1 && n.y + n.h <= y1).map(n => n.id)); W.marquee = null; draw(); }
      else if (d.kind === 'link') { const hit = document.elementFromPoint(ev.clientX, ev.clientY), t = hit && hit.closest && hit.closest('#wbSvg [data-id]'); W.link = null;   // pointer capture makes ev.target the canvas, so look up what is under the pointer
        if (t) { const to = t.getAttribute('data-id'); if (!W.B.edges.some(e => e.from === d.from && e.to === to)) { pushUndo(); W.B.edges.push({ id: uid('e'), from: d.from, to, label: '' }); changed(); } }
        draw(); }
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('dblclick', ev => {
      if (ro()) return; const nEl = ev.target.closest('[data-id]'), eEl = ev.target.closest('[data-e]');
      if (nEl) { const n = node(nEl.getAttribute('data-id')); if (n.t !== 'image') startEdit(n); return; }
      if (eEl) { startEdit(W.B.edges.find(e => e.id === eEl.getAttribute('data-e')), true); return; }
      const p = toWorld(ev); addNode('note', p.x - 80, p.y - 50, true);
    });
    svg.addEventListener('wheel', ev => {
      ev.preventDefault(); const v = W.B.view;
      if (ev.ctrlKey || ev.metaKey) { const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, z = clamp(v.z * Math.exp(-ev.deltaY * .0015), MINZ, MAXZ); v.x = mx - (mx - v.x) * z / v.z; v.y = my - (my - v.y) * z / v.z; v.z = z; }
      else { v.x -= ev.deltaX; v.y -= ev.deltaY; }
      draw(); changedView();
    }, { passive: false });
    document.getElementById('wbHost').addEventListener('keydown', key);
  }
  let viewT = 0; function changedView() { clearTimeout(viewT); viewT = setTimeout(() => { if (!ro()) { W.dirty = true; save(); } }, 1500); }
  function key(ev) {
    if (W.edit || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && ev.target.id !== 'wbHost') return;
    const mod = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
    if (mod && k === 'z') { ev.preventDefault(); ev.shiftKey ? ACT.wbRedo() : ACT.wbUndo(); return; }
    if (mod && k === 'y') { ev.preventDefault(); ACT.wbRedo(); return; }
    if (mod && k === 'a') { ev.preventDefault(); W.B.nodes.forEach(n => { if (!n.hidden) W.sel.add(n.id); }); draw(); return; }
    if (mod && k === 'g') { ev.preventDefault(); ev.shiftKey ? ACT.wbUngroup() : ACT.wbGroup(); return; }
    if (mod && k === 'd') { ev.preventDefault(); duplicate(); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && W.sel.size) { ev.preventDefault(); ACT.wbDel(); return; }
    if (ev.key === 'Escape') { W.sel.clear(); W.tool = 'select'; W.link = null; draw(); return; }
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
  const SIZES = { note: [160, 110], rect: [160, 64], ellipse: [150, 70], diamond: [150, 96], text: [220, 40] };
  function centre() { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view; return { x: (r.width / 2 - v.x) / v.z, y: (r.height / 2 - v.y) / v.z }; }
  function addNode(t, x, y, edit) {
    if (ro()) return; pushUndo(); const [w, h] = SIZES[t]; const n = { id: uid('n'), t, x: snapV(x), y: snapV(y), w, h, text: t === 'text' ? 'Heading' : t === 'note' ? '' : t === 'diamond' ? 'Decision?' : 'Step' };
    if (t === 'note') n.fill = COLORS.note[W.B.nodes.filter(m => m.t === 'note').length % COLORS.note.length];
    W.B.nodes.push(n); W.sel.clear(); W.sel.add(n.id); changed(); draw(); if (edit || t === 'note') startEdit(n);
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

  // ---------- state flows from the project ----------
  function flowCatalogue() {
    const out = []; (F.allFlows ? F.allFlows() : []).forEach(fid => { const f = F.flowModel(fid); if (!f || !f.states || !f.states.length) return; const mv = F.moduleView ? F.moduleView(f.module) : null;
      out.push({ id: fid, name: f.name || fid, module: f.module, moduleLabel: (mv && (mv.label || mv.displayName)) || f.module, states: f.states.length, transitions: (f.transitions || []).filter(t => !t.removed).length, enabled: f.enabled !== false, origin: f.origin || 'existing' }); });
    return out.sort((a, b) => String(a.moduleLabel).localeCompare(String(b.moduleLabel)) || String(a.name).localeCompare(String(b.name)));
  }
  // a flow becomes a frame with its states and transitions inside; positions come from the flow's own layout
  function placeFlow(fid, ox, oy) {
    const f = F.flowModel(fid); if (!f) return null; const G = D.flowGeometry(f, { full: true }), g = uid('g');
    const xs = f.states.map(s => G && G.st && G.st[s.id] ? G.st[s.id].x : s.x || 0), ys = f.states.map(s => s.y || 0);
    const minx = Math.min(...f.states.map(s => s.x || 0)), miny = Math.min(...ys); void xs;
    const ids = {}; const nodes = f.states.map(s => { const b = D.boxSize(s.label, true); const id = uid('n'); ids[s.id] = id;
      const typ = s.typeCode === 2 ? 'closed' : s.typeCode === 6 ? 'skipped' : 'open'; return { id, t: 'state', stype: typ, g, x: snapV(ox + 30 + ((s.x || 0) - minx) * .9), y: snapV(oy + 70 + ((s.y || 0) - miny) * .9), w: Math.max(120, b.w), h: 40, text: s.label || s.name || 'State', ref: { flow: fid, state: s.id } }; });
    const edges = (f.transitions || []).filter(t => !t.removed && ids[t.from] && ids[t.to]).map(t => ({ id: uid('e'), from: ids[t.from], to: ids[t.to], label: t.name || '', ref: { flow: fid, transition: t.id } }));
    const bb = bbox(nodes); const mv = F.moduleView ? F.moduleView(f.module) : null;
    const frame = { id: uid('n'), t: 'frame', g, x: snapV(ox), y: snapV(oy), w: snapV(bb.x + bb.w - ox + 50), h: snapV(bb.y + bb.h - oy + 40), text: `${(mv && (mv.label || mv.displayName)) || f.module} · ${f.name || 'State flow'}`, src: { kind: 'flow', flowId: fid, module: f.module, origin: f.origin || 'existing' } };
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
    V.closeDrawer(); W.sel = new Set(); selectWithGroups(added); changed(); fit(); V.toast(added.length + ' flow' + (added.length === 1 ? '' : 's') + ' added as editable copies');
  };
  ACT.wbNewFlow = () => { if (V.ACT.newFlowDlg) { V.go('flow'); setTimeout(() => V.ACT.newFlowDlg({ getAttribute: () => null }), 150); } else V.go('flow'); };

  // ---------- import from image ----------
  ACT.wbImg = () => {
    W.imp = null;
    V.drawer('Import a flow from an image', `<p class="small muted" style="margin-top:0">Upload a picture of a flowchart or state flow (PNG, JPEG or WebP, up to 8 MB). Claude reads the steps and arrows; you review the result before anything is added. Parts it is unsure about are marked and drawn dashed.</p>
      <div class="row"><button class="btn" data-act="wbImgPick">Choose an image</button><span class="xs muted" id="wbImgName">No file chosen</span></div>
      <div class="wb-imgprev" id="wbImgPrev" hidden></div>
      <label class="f" for="wbImgHint" style="margin-top:14px">What does it show? (optional)</label><input type="text" id="wbImgHint" maxlength="200" placeholder="e.g. Work order approval in the maintenance app">
      <label class="chk" style="margin-top:12px"><input type="checkbox" id="wbImgKeep" checked> Keep the original image on the board as a reference layer</label>
      <div id="wbImgOut"></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wbImgRead" id="wbImgRead" disabled>Read the diagram</button>`, { wide: true });
  };
  async function sniff(file) { const b = new Uint8Array(await file.slice(0, 12).arrayBuffer()); if (b[0] === 0x89 && b[1] === 0x50) return 'image/png'; if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg'; if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'; return ''; }
  ACT.wbImgPick = async () => {
    const f = (await V.pickFile('image/png,image/jpeg,image/webp'))[0]; if (!f) return;
    if (f.size > 8e6) { V.toast('That image is larger than 8 MB', 5000, true); return; }
    const type = await sniff(f); if (!type) { V.toast('That file is not a PNG, JPEG or WebP image', 5000, true); return; }
    W.imp = { file: f, type }; document.getElementById('wbImgName').textContent = f.name;
    const pv = document.getElementById('wbImgPrev'); pv.hidden = false; const url = URL.createObjectURL(f); pv.innerHTML = ''; const img = new Image(); img.alt = 'Preview of ' + f.name; img.src = url; pv.appendChild(img);
    document.getElementById('wbImgRead').disabled = false; document.getElementById('wbImgOut').innerHTML = '';
  };
  // shrink to at most 1600 px on the long side (smaller upload, same legibility for the model)
  async function shrink(file) {
    const bm = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(bm.width, bm.height)); const c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height); bm.close && bm.close();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { data: btoa(bin), mediaType: 'image/jpeg', w: c.width, h: c.height };
  }
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
    const g = W.imp && W.imp.graph; if (!g) return; const keep = document.getElementById('wbImgKeep').checked;
    const nodes = g.nodes.map((n, i) => Object.assign({}, n, { use: document.querySelector(`[data-wbn="${i}"]`).checked, label: document.querySelector(`[data-wbl="${i}"]`).value.trim().slice(0, 80) || n.label, kind: document.querySelector(`[data-wbk="${i}"]`).value })).filter(n => n.use);
    const ok = new Set(nodes.map(n => n.id)); const edges = g.edges.map((e, i) => Object.assign({}, e, { use: document.querySelector(`[data-wbe="${i}"]`).checked, label: document.querySelector(`[data-wbel="${i}"]`).value.trim().slice(0, 60) })).filter(e => e.use && ok.has(e.from) && ok.has(e.to));
    if (!nodes.length) { V.toast('Nothing is ticked', 4000, true); return; }
    // layered layout: each step one column right of the step that leads to it
    const lvl = {}; const roots = nodes.filter(n => !edges.some(e => e.to === n.id)).map(n => n.id); const q = (roots.length ? roots : [nodes[0].id]).slice(); q.forEach(id => { lvl[id] = 0; });
    while (q.length) { const c = q.shift(); edges.filter(e => e.from === c).forEach(e => { if (lvl[e.to] === undefined) { lvl[e.to] = lvl[c] + 1; q.push(e.to); } }); }
    let mx = Math.max(0, ...Object.values(lvl)); nodes.forEach(n => { if (lvl[n.id] === undefined) lvl[n.id] = ++mx; });
    const rows = {}; pushUndo(); const c0 = centre(); const right = W.B.nodes.length ? bbox(W.B.nodes.filter(n => !n.hidden)) : null;
    let ox = right && right.w ? snapV(right.x + right.w + 80) : snapV(c0.x - 300), oy = right && right.w ? snapV(right.y) : snapV(c0.y - 160);
    const grp = uid('g'), map = {}, added = [];
    let imgW = 0;
    if (keep) { try { const rec = await API.uploadFile(S.project.id, W.imp.file, 'flow_image', { board: W.B.id }); const s = Math.min(1, 420 / W.imp.w); imgW = Math.round(W.imp.w * s);
      W.B.nodes.push({ id: uid('n'), t: 'image', fileId: rec.id, x: ox, y: oy + 60, w: imgW, h: Math.round(W.imp.h * s), dim: false }); } catch (e) { V.toast('The diagram was added, but the original image could not be kept: ' + e.message, 6000, true); } }
    const fx = ox + (imgW ? imgW + 60 : 0);
    nodes.forEach(n => { const L = lvl[n.id]; const r = rows[L] = (rows[L] || 0) + 1; const t = n.kind === 'decision' ? 'diamond' : n.kind === 'start' || n.kind === 'end' ? 'ellipse' : n.kind === 'process' ? 'rect' : 'state';
      const id = uid('n'); map[n.id] = id; const w = t === 'diamond' ? 160 : Math.max(130, Math.min(240, 18 + n.label.length * 7.4));
      W.B.nodes.push({ id, t, stype: 'open', g: grp, x: snapV(fx + 30 + L * 240), y: snapV(oy + 70 + (r - 1) * 110), w, h: t === 'diamond' ? 90 : t === 'ellipse' ? 56 : 44, text: n.label, conf: n.confidence }); added.push(id); });
    edges.forEach(e => W.B.edges.push({ id: uid('e'), from: map[e.from], to: map[e.to], label: e.label, conf: e.confidence }));
    const bb = bbox(added.map(node)); const frame = { id: uid('n'), t: 'frame', g: grp, x: snapV(fx), y: snapV(oy), w: snapV(bb.x + bb.w - fx + 50), h: snapV(bb.y + bb.h - oy + 40), text: g.title || 'Imported flow', src: { kind: 'image' } };
    W.B.nodes.push(frame); W.sel = new Set(); selectWithGroups([frame.id]); V.closeDrawer(); changed(); fit(); loadImages();
    V.toast(`${nodes.length} steps and ${edges.length} connections added. Dashed outlines mark parts to double-check.`, 6000);
  });

  // ---------- export ----------
  async function exportPng(scope) {
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
    const name = (W.B.name || 'process-board').replace(/[^\w-]+/g, '_') + (scope === 'sel' ? '_selection' : '') + '.png';
    V.download(name, new Blob([png.data], { type: 'image/png' })); V.toast(`Exported ${name} (${Math.round(w * scale)} × ${Math.round(h * scale)} px)`);
  }
  root.__wbExportSvg = () => { const b = bbox(W.B.nodes); return { bbox: b, nodes: W.B.nodes.length, edges: W.B.edges.length }; };

  // ---------- actions ----------
  ACT.wbExport = a => V.busy(a, () => exportPng(a.getAttribute('data-scope')));
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
  ACT.wbTool = a => { W.tool = a.getAttribute('data-wbtool'); draw(); };
  ACT.wbAdd = a => { const c = centre(), t = a.getAttribute('data-t'), [w, h] = SIZES[t]; addNode(t, c.x - w / 2 + (W.B.nodes.length % 5) * 12, c.y - h / 2 + (W.B.nodes.length % 5) * 12); };
  ACT.wbDel = () => { if (ro() || !W.sel.size) return; pushUndo(); const ids = W.sel; W.B.nodes = W.B.nodes.filter(n => !ids.has(n.id)); W.B.edges = W.B.edges.filter(e => !ids.has(e.id) && !ids.has(e.from) && !ids.has(e.to)); W.sel = new Set(); changed(); draw(); };
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
  ACT.wbSnapT = el => { W.B.snap = el.checked; W.dirty = true; save(); };
  ACT.wbZoomBy = a => { const svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), v = W.B.view, z = clamp(v.z * Number(a.getAttribute('data-k')), MINZ, MAXZ), mx = r.width / 2, my = r.height / 2; v.x = mx - (mx - v.x) * z / v.z; v.y = my - (my - v.y) * z / v.z; v.z = z; draw(); changedView(); };
  ACT.wbFit = () => fit();
  ACT.wbReset = () => { const v = W.B.view, svg = document.getElementById('wbSvg'), r = svg.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2; v.x = mx - (mx - v.x) / v.z; v.y = my - (my - v.y) / v.z; v.z = 1; draw(); changedView(); };
  // Miro: open an authorised board alongside; there is no sync (see the note in the dialog)
  ACT.wbMiro = () => {
    V.drawer('Miro', `<p class="small" style="margin-top:0">You can keep a link to the customer's or team's Miro board with this whiteboard and open it from here.</p>
      <label class="f" for="wbMiroUrl">Miro board link</label><input type="url" id="wbMiroUrl" maxlength="200" placeholder="https://miro.com/app/board/…" value="${esc(W.B.miro || '')}"${ro() ? ' disabled' : ''}>
      <div class="notice small" style="margin-top:14px"><b>What is and is not connected.</b> Delivery Studio does not sync with Miro and does not create anything in Miro. To move this process into Miro, use Export PNG and drop the image on the Miro board, or rebuild it there. Creating editable Miro shapes and connectors automatically would need a Miro developer app with an OAuth access token for the Miro REST API (board items: shapes, sticky notes, connectors); that is not set up. The whiteboard here works without any Miro account.</div>`,
      `${W.B.miro ? `<a class="btn" href="${esc(W.B.miro)}" target="_blank" rel="noopener noreferrer">Open in Miro</a>` : ''}<button class="btn" data-act="closeDrawer">Close</button>${ro() ? '' : '<button class="btn primary" data-act="wbMiroSave">Save link</button>'}`);
  };
  ACT.wbMiroSave = () => { const v = (document.getElementById('wbMiroUrl').value || '').trim(); if (v && !/^https:\/\/(?:www\.)?miro\.com\/app\/board\/[A-Za-z0-9_=-]+\/?(?:\?[\w=&%.-]*)?$/.test(v)) { V.toast('Use a Miro board link that starts with https://miro.com/app/board/', 6000, true); return; } W.B.miro = v; W.dirty = true; save(); V.closeDrawer(); V.toast(v ? 'Miro link saved' : 'Miro link removed'); };

  V.whiteboard = { html, mount };
  V.whiteboardState = W;
})(typeof window !== 'undefined' ? window : globalThis);
