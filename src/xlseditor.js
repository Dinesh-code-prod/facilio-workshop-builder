/* Spreadsheet editor — edits an ExcelJS workbook in place, so everything the editor does not touch (conditional
   formatting, data validation, images, print setup, defined names) is written back unchanged. Rendering reuses the
   Project Plan renderer (V.xlsBuildModel / V.xlsRenderSheet), so theme colours, merges and Gantt bars look the same
   while editing. Used by Project Plan and the Requirement Session Planner export.
   Features: cell editing with a formula bar, formulas (recalculated on change), copy / cut / paste (also from Excel as
   tab-separated text), undo / redo, font, size, bold / italic / underline / strike, text and fill colour, borders,
   alignment, wrap, number formats, merge, insert / delete rows and columns, column width (drag or set), row height,
   freeze panes, sort, filter, add / rename / delete / hide sheets. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const { toast, ico } = V;
  const U = () => V.xlsUtil;
  const clone = o => JSON.parse(JSON.stringify(o === undefined ? null : o));
  const FONTS = ['Calibri', 'Arial', 'Aptos', 'Cambria', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Verdana', 'Courier New'];
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
  const NUMFMT = [['General', 'General'], ['#,##0', 'Number'], ['#,##0.00', 'Number (2 dp)'], ['0%', 'Percent'], ['0.00%', 'Percent (2 dp)'], ['"AED" #,##0.00', 'Currency (AED)'], ['$#,##0.00', 'Currency ($)'], ['dd-mmm-yyyy', 'Date'], ['dd-mmm-yyyy hh:mm', 'Date and time'], ['hh:mm', 'Time'], ['@', 'Text']];
  const THIN = { style: 'thin', color: { argb: 'FF000000' } };

  function XlsEditor(host, wb, opts) {
    const E = this; opts = opts || {};
    Object.assign(E, { host, wb, opts, si: opts.sheet >= 0 && opts.sheet < wb.worksheets.length ? opts.sheet : Math.max(0, wb.worksheets.findIndex(w => w.state !== 'hidden' && w.state !== 'veryHidden')), sel: { r1: 1, c1: 1, r2: 1, c2: 1 }, act: { r: 1, c: 1 }, undoS: [], redoS: [], clip: null, dirty: false, editing: null, filters: {} });
    host.classList.add('xe');
    host.innerHTML = `<div class="xe-tb" role="toolbar" aria-label="Spreadsheet tools"></div><div class="xe-fx"><span class="xe-addr" id="xeAddr">A1</span><span class="xe-fxl">fx</span><input type="text" class="xe-fxi" aria-label="Cell content or formula" ${opts.readonly ? 'disabled' : ''}></div>
      <div class="xe-grid" tabindex="0" aria-label="Spreadsheet grid"></div><div class="xe-tabs" role="tablist"></div><div class="xe-status"></div>`;
    E.tb = host.querySelector('.xe-tb'); E.fx = host.querySelector('.xe-fxi'); E.grid = host.querySelector('.xe-grid'); E.tabs = host.querySelector('.xe-tabs'); E.status = host.querySelector('.xe-status'); E.addrEl = host.querySelector('.xe-addr');
    E.toolbar(); E.wire(); E.render(); E.sheetTabs(); V.lastXlsEditor = E;
  }
  const P = XlsEditor.prototype;
  P.ws = function () { return this.wb.worksheets[this.si]; };
  // last row / column that hold a value (ExcelJS counts formatted-only rows too)
  P.extent = function () { let R = 0, C = 0; this.ws().eachRow({ includeEmpty: false }, (row, r) => row.eachCell({ includeEmpty: false }, (c, cn) => { if (c.value !== null && c.value !== undefined && c.value !== '') { R = Math.max(R, r); C = Math.max(C, cn); } })); return { r: R, c: C }; };
  P.peek = function (r, c) { const ws = this.ws(); if (r > ws.rowCount || c > ws.columnCount) return null; const row = ws.findRow ? ws.findRow(r) : ws.getRow(r); if (!row) return null; const cell = row.findCell ? row.findCell(c) : row.getCell(c); return cell ? U().rawValue(cell) : null; };

  // ---------------- toolbar ----------------
  P.toolbar = function () {
    const E = this; if (E.opts.readonly) { E.tb.innerHTML = `<span class="xe-ro">View only</span>${E.opts.actions || ''}`; return; }
    const b = (act, label, title, extra) => `<button type="button" class="xe-b" data-xe="${act}" title="${esc(title)}" aria-label="${esc(title)}" ${extra || ''}>${label}</button>`;
    E.tb.innerHTML = `<div class="xe-g">${b('undo', '↶', 'Undo (Ctrl+Z)')}${b('redo', '↷', 'Redo (Ctrl+Y)')}</div>
      <div class="xe-g"><select data-xe-sel="font" title="Font" aria-label="Font">${FONTS.map(f => `<option>${f}</option>`).join('')}</select><select data-xe-sel="size" title="Font size" aria-label="Font size" style="width:58px">${SIZES.map(s => `<option>${s}</option>`).join('')}</select></div>
      <div class="xe-g">${b('bold', '<b>B</b>', 'Bold (Ctrl+B)')}${b('italic', '<i>I</i>', 'Italic (Ctrl+I)')}${b('underline', '<u>U</u>', 'Underline (Ctrl+U)')}${b('strike', '<s>S</s>', 'Strikethrough')}
        <label class="xe-b xe-col" title="Text colour"><span style="border-bottom:3px solid #c00000">A</span><input type="color" data-xe-col="font" value="#c00000" aria-label="Text colour"></label><label class="xe-b xe-col" title="Fill colour"><span class="xe-fill">▣</span><input type="color" data-xe-col="fill" value="#fff2cc" aria-label="Fill colour"></label>${b('nofill', '∅', 'No fill')}</div>
      <div class="xe-g"><select data-xe-sel="border" title="Borders" aria-label="Borders" style="width:104px"><option value="">Borders…</option><option value="all">All borders</option><option value="outer">Outside borders</option><option value="bottom">Bottom border</option><option value="top">Top border</option><option value="thick">Thick outside</option><option value="none">No border</option></select></div>
      <div class="xe-g">${b('left', '⇤', 'Align left')}${b('center', '≡', 'Centre')}${b('right', '⇥', 'Align right')}${b('vtop', '⤒', 'Top')}${b('vmid', '⇕', 'Middle')}${b('wrap', '↵', 'Wrap text')}</div>
      <div class="xe-g"><select data-xe-sel="numfmt" title="Number format" aria-label="Number format" style="width:120px">${NUMFMT.map(([v, l]) => `<option value="${esc(v)}">${l}</option>`).join('')}</select>${b('dec+', '.0+', 'More decimals')}${b('dec-', '.0−', 'Fewer decimals')}</div>
      <div class="xe-g">${b('merge', 'Merge', 'Merge and centre / unmerge')}</div>
      <div class="xe-g"><select data-xe-sel="rows" title="Rows and columns" aria-label="Rows and columns" style="width:132px"><option value="">Rows &amp; columns…</option><option value="rowAbove">Insert row above</option><option value="rowBelow">Insert row below</option><option value="rowDel">Delete row(s)</option><option value="colLeft">Insert column left</option><option value="colRight">Insert column right</option><option value="colDel">Delete column(s)</option><option value="colWidth">Column width…</option><option value="rowHeight">Row height…</option><option value="autofit">Autofit column width</option><option value="hideRows">Hide row(s)</option><option value="hideCols">Hide column(s)</option><option value="unhide">Unhide all rows and columns</option></select></div>
      <div class="xe-g">${b('sortAsc', 'A→Z', 'Sort ascending by this column')}${b('sortDesc', 'Z→A', 'Sort descending by this column')}${b('filter', '⊻ Filter', 'Turn filter on or off for this table')}${b('freeze', '❄ Freeze', 'Freeze rows above and columns left of the selection')}</div>
      <div class="xe-g">${b('clear', 'Clear', 'Clear contents (Delete)')}${b('clearFmt', 'Clear format', 'Clear formatting')}</div>
      <span class="xe-sp"></span>${E.opts.actions || ''}`;
  };

  // ---------------- events ----------------
  P.wire = function () {
    const E = this;
    E.tb.addEventListener('click', e => { const t = e.target.closest('[data-xe]'); if (!t || t.tagName === 'LABEL') return; E.cmd(t.getAttribute('data-xe')); E.grid.focus({ preventScroll: true }); });
    E.tb.addEventListener('mousedown', e => { if (e.target.closest('button[data-xe]')) e.preventDefault(); });
    E.tb.addEventListener('change', e => { const s = e.target; if (s.hasAttribute('data-xe-sel')) { const k = s.getAttribute('data-xe-sel'); const v = s.value; if (k === 'border' || k === 'rows') s.value = ''; if (v !== '') E.cmd(k, v); E.grid.focus(); } if (s.hasAttribute('data-xe-col')) E.cmd(s.getAttribute('data-xe-col') === 'font' ? 'fontColor' : 'fillColor', s.value); });
    E.grid.addEventListener('mousedown', e => {
      if (e.target.closest('.xe-fbtn')) return;
      const th = e.target.closest('th[data-col]'); const rh = e.target.closest('td[data-row]'); const td = e.target.closest('td[data-a]');
      if (th && e.offsetX > th.offsetWidth - 6) { E.startResize(th, e); e.preventDefault(); return; }
      if (E.editing && td && td === E.editing.td) return; E.commitEdit();
      const ext = E.extent(); const last = Math.max(ext.c, 1), lastR = Math.max(ext.r, 1);
      if (th) { const c = +th.getAttribute('data-col'); E.select(e.shiftKey ? { r1: 1, c1: Math.min(E.act.c, c), r2: lastR, c2: Math.max(E.act.c, c) } : { r1: 1, c1: c, r2: lastR, c2: c }, { r: 1, c }); E.grid.focus(); e.preventDefault(); return; }
      if (rh) { const r = +rh.getAttribute('data-row'); E.select(e.shiftKey ? { r1: Math.min(E.act.r, r), c1: 1, r2: Math.max(E.act.r, r), c2: last } : { r1: r, c1: 1, r2: r, c2: last }, { r, c: 1 }); E.grid.focus(); e.preventDefault(); return; }
      if (!td) return; const p = E.pos(td);
      if (e.shiftKey) E.select(E.span(E.act, p), E.act, true); else E.select(E.span(p, p), p);
      E.dragFrom = e.shiftKey ? E.act : p; E.grid.focus(); e.preventDefault();
    });
    E.grid.addEventListener('mouseover', e => { if (!E.dragFrom || !(e.buttons & 1)) { E.dragFrom = null; return; } const td = e.target.closest('td[data-a]'); if (td) E.select(E.span(E.dragFrom, E.pos(td)), E.dragFrom, true); });
    document.addEventListener('mouseup', () => { E.dragFrom = null; });
    E.grid.addEventListener('dblclick', e => { const td = e.target.closest('td[data-a]'); if (td && !E.opts.readonly) E.startEdit(td, null); });
    E.grid.addEventListener('click', e => { const fb = e.target.closest('.xe-fbtn'); if (fb) E.filterMenu(+fb.getAttribute('data-c'), fb); });
    E.grid.addEventListener('keydown', e => E.key(e));
    E.grid.addEventListener('copy', e => { if (E.editing) return; E.copy(e, false); });
    E.grid.addEventListener('cut', e => { if (E.editing || E.opts.readonly) return; E.copy(e, true); });
    E.grid.addEventListener('paste', e => { if (E.editing || E.opts.readonly) return; e.preventDefault(); E.paste((e.clipboardData || root.clipboardData).getData('text/plain')); });
    E.fx.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); E.setInput(E.act, E.fx.value); E.move(1, 0); E.grid.focus(); } else if (e.key === 'Escape') { E.fx.value = E.rawInput(E.act); E.grid.focus(); } });
    E.tabs.addEventListener('click', e => { const t = e.target.closest('[data-sheet]'); if (t) { E.commitEdit(); E.si = +t.getAttribute('data-sheet'); E.sel = { r1: 1, c1: 1, r2: 1, c2: 1 }; E.act = { r: 1, c: 1 }; E.render(); E.sheetTabs(); return; } const a = e.target.closest('[data-xs]'); if (a) E.sheetCmd(a.getAttribute('data-xs')); });
    E.tabs.addEventListener('dblclick', e => { const t = e.target.closest('[data-sheet]'); if (t && !E.opts.readonly) E.sheetCmd('rename'); });
  };
  P.pos = function (td) { const p = U().parseAddr(td.getAttribute('data-a')); return { r: p.r, c: p.c }; };
  P.span = (a, b) => ({ r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) });

  // ---------------- rendering ----------------
  P.model = function () {
    const ws = this.ws(); const shim = { worksheets: [ws], _themes: this.wb._themes, getImage: id => this.wb.getImage(id), definedNames: null };
    return V.xlsBuildModel(shim, { minRows: Math.max(60, (ws.rowCount || 0) + 25), minCols: Math.max(20, (ws.columnCount || 0) + 6), editor: true }).sheets[0];
  };
  P.render = function () {
    const E = this; const y = E.grid.scrollTop, x = E.grid.scrollLeft; const sh = E.model(); E.sh = sh;
    E.grid.innerHTML = V.xlsRenderSheet(sh, {});
    const ths = E.grid.querySelectorAll('thead th'); ths.forEach((th, i) => { if (i) th.setAttribute('data-col', i); });
    E.grid.querySelectorAll('td.rh').forEach(td => { const r = +td.textContent; if (r) td.setAttribute('data-row', r); });
    E.tdMap = {}; E.grid.querySelectorAll('td[data-a]').forEach(td => { E.tdMap[td.getAttribute('data-a')] = td; });
    // merged-cell spans for selection snapping
    E.merges = sh.merges;
    // filter buttons on the filter header row
    const af = E.ws().autoFilter; if (af) { const rg = E.afRange(); if (rg) for (let c = rg.c1; c <= rg.c2; c++) { const td = E.tdMap[U().colName(c) + rg.r1]; if (td) td.insertAdjacentHTML('beforeend', `<button type="button" class="xe-fbtn${E.filters[E.si + ':' + c] ? ' on' : ''}" data-c="${c}" aria-label="Filter ${U().colName(c)}">▾</button>`); } }
    E.grid.scrollTop = y; E.grid.scrollLeft = x; E.paintSel(); E.statusBar();
  };
  P.paintSel = function () {
    const E = this; E.grid.querySelectorAll('.xe-sel,.xe-act').forEach(el => el.classList.remove('xe-sel', 'xe-act')); E.grid.querySelectorAll('.xe-hsel').forEach(el => el.classList.remove('xe-hsel'));
    const s = E.sel; const big = (s.r2 - s.r1 + 1) * (s.c2 - s.c1 + 1) > 20000;
    if (!big) for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) { const td = E.tdMap[U().colName(c) + r]; if (td) td.classList.add('xe-sel'); }
    const at = E.tdMap[U().colName(E.act.c) + E.act.r]; if (at) { at.classList.add('xe-act'); }
    E.grid.querySelectorAll('th[data-col]').forEach(th => { const c = +th.getAttribute('data-col'); if (c >= s.c1 && c <= s.c2) th.classList.add('xe-hsel'); });
    E.grid.querySelectorAll('td[data-row]').forEach(td => { const r = +td.getAttribute('data-row'); if (r >= s.r1 && r <= s.r2) td.classList.add('xe-hsel'); });
    E.addrEl.textContent = U().colName(s.c1) + s.r1 + (s.r2 > s.r1 || s.c2 > s.c1 ? ':' + U().colName(s.c2) + s.r2 : '');
    if (document.activeElement !== E.fx) E.fx.value = E.rawInput(E.act);
    E.syncToolbar(); E.statusBar();
  };
  P.select = function (sel, act, keepAct) { const E = this; E.sel = E.snap(sel); if (!keepAct || act) E.act = act || { r: sel.r1, c: sel.c1 }; E.paintSel(); const td = E.tdMap[U().colName(E.act.c) + E.act.r]; if (td && td.scrollIntoView) td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); };
  P.snap = function (s) { let changed = true; s = Object.assign({}, s); while (changed) { changed = false; (this.merges || []).forEach(m => { if (m.r1 <= s.r2 && m.r2 >= s.r1 && m.c1 <= s.c2 && m.c2 >= s.c1 && (m.r1 < s.r1 || m.r2 > s.r2 || m.c1 < s.c1 || m.c2 > s.c2)) { s.r1 = Math.min(s.r1, m.r1); s.r2 = Math.max(s.r2, m.r2); s.c1 = Math.min(s.c1, m.c1); s.c2 = Math.max(s.c2, m.c2); changed = true; } }); } return s; };
  P.statusBar = function () {
    const E = this; const vals = []; const s = E.sel; if ((s.r2 - s.r1 + 1) * (s.c2 - s.c1 + 1) <= 50000) for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) { const v = E.peek(r, c); if (v !== null && v !== '' && v !== undefined) vals.push(v); }
    const n = vals.filter(v => typeof v === 'number'); E.status.innerHTML = `${vals.length > 1 ? `<span>Count ${vals.length}</span>` : ''}${n.length > 1 ? `<span>Sum ${Math.round(n.reduce((a, b) => a + b, 0) * 1e6) / 1e6}</span><span>Average ${Math.round(n.reduce((a, b) => a + b, 0) / n.length * 1e6) / 1e6}</span>` : ''}<span class="xe-dirty">${E.dirty ? 'Unsaved changes' : E.opts.savedText || ''}</span>`;
  };
  P.syncToolbar = function () {
    const E = this; if (E.opts.readonly) return; const c = E.ws().getCell(E.act.r, E.act.c); const f = c.font || {}; const al = c.alignment || {};
    const on = (k, v) => { const b = E.tb.querySelector(`[data-xe="${k}"]`); if (b) b.classList.toggle('on', !!v); };
    on('bold', f.bold); on('italic', f.italic); on('underline', f.underline); on('strike', f.strike); on('left', al.horizontal === 'left'); on('center', al.horizontal === 'center'); on('right', al.horizontal === 'right'); on('wrap', al.wrapText); on('vtop', al.vertical === 'top'); on('vmid', al.vertical === 'middle'); on('filter', !!E.ws().autoFilter); on('freeze', ((E.ws().views || [])[0] || {}).state === 'frozen');
    const set = (k, v) => { const s = E.tb.querySelector(`[data-xe-sel="${k}"]`); if (s && v !== undefined) { if (![...s.options].some(o => o.value === String(v))) s.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`); s.value = String(v); } };
    set('font', f.name || 'Calibri'); set('size', f.size || 11); set('numfmt', c.numFmt || 'General');
  };
  P.sheetTabs = function () {
    const E = this; E.tabs.innerHTML = E.wb.worksheets.map((w, i) => w.state === 'veryHidden' ? '' : `<button type="button" role="tab" class="${i === E.si ? 'on' : ''}${w.state === 'hidden' ? ' hid' : ''}" data-sheet="${i}" title="${w.state === 'hidden' ? 'Hidden sheet' : 'Double-click to rename'}">${esc(w.name)}</button>`).join('')
      + (E.opts.readonly ? '' : `<span class="xe-tabacts"><button type="button" data-xs="add" title="Add sheet" aria-label="Add sheet">+</button><button type="button" data-xs="rename" title="Rename sheet">Rename</button><button type="button" data-xs="hide" title="Hide or show this sheet">${E.ws().state === 'hidden' ? 'Show' : 'Hide'}</button><button type="button" data-xs="delete" title="Delete sheet">Delete</button></span>`);
  };

  // ---------------- input & values ----------------
  P.rawInput = function (p) {
    const c = this.ws().getCell(p.r, p.c); const v = c.value; if (v === null || v === undefined) return '';
    if (c.formula) return '=' + c.formula; if (v && typeof v === 'object' && v.sharedFormula) return '=' + (c.formula || '');
    const raw = U().rawValue(c); if (raw instanceof Date) return V.xlsFormat.fmtDate(raw, /h/.test(c.numFmt || '') ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd');
    if (typeof raw === 'number' && /%/.test(c.numFmt || '')) return Math.round(raw * 1e8) / 1e6 + '%'; return raw === null ? '' : String(raw);
  };
  P.parse = function (text, cell) {
    const t = String(text); if (t === '') return { value: null };
    if (t[0] === '=' && t.length > 1) return { value: { formula: t.slice(1).replace(/^\+/, '') } };
    if (/^-?\d+(\.\d+)?%$/.test(t.trim())) return { value: Number(t.trim().slice(0, -1)) / 100, numFmt: /%/.test(cell.numFmt || '') ? null : '0%' };
    const n = t.trim().replace(/,(?=\d{3}(\D|$))/g, ''); if (/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(n)) return { value: Number(n) };
    let m; if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(t.trim())) || (m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t.trim()))) { const iso = m[1].length === 4; const d = new Date(Date.UTC(iso ? +m[1] : +m[3], (iso ? +m[2] : +m[2]) - 1, iso ? +m[3] : +m[1], iso && m[4] ? +m[4] : 0, iso && m[5] ? +m[5] : 0)); if (!isNaN(d)) return { value: d, numFmt: cell.numFmt && /[dmy]/i.test(cell.numFmt) ? null : (iso && m[4] ? 'dd-mmm-yyyy hh:mm' : 'dd-mmm-yyyy') }; }
    if (/^(true|false)$/i.test(t.trim())) return { value: /true/i.test(t) };
    return { value: t };
  };
  P.setInput = function (p, text, noUndo) {
    const E = this; if (E.opts.readonly) return; if (!noUndo) E.snapshot(); const cell = E.ws().getCell(p.r, p.c); const r = E.parse(text, cell);
    cell.value = r.value; if (r.numFmt) cell.numFmt = r.numFmt; E.recalc(); E.changed();
  };
  P.startEdit = function (td, initial) {
    const E = this; if (E.opts.readonly) return; const p = E.pos(td); E.act = p; E.paintSel();
    E.editing = { td, p, before: td.innerHTML }; td.querySelectorAll('.xe-fbtn').forEach(b => b.remove()); td.contentEditable = 'true'; td.classList.add('xe-editing'); td.textContent = initial !== null && initial !== undefined ? initial : E.rawInput(p); td.focus();
    const rg = document.createRange(); rg.selectNodeContents(td); rg.collapse(false); const s = root.getSelection(); s.removeAllRanges(); s.addRange(rg);
    td.onkeydown = e => { if (e.key === 'Enter' && !e.altKey) { e.preventDefault(); E.commitEdit(); E.move(e.shiftKey ? -1 : 1, 0); } else if (e.key === 'Tab') { e.preventDefault(); E.commitEdit(); E.move(0, e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); E.cancelEdit(); } e.stopPropagation(); };
    td.oninput = () => { E.fx.value = td.innerText; };
  };
  P.commitEdit = function () { const E = this; const ed = E.editing; if (!ed) return; E.editing = null; ed.td.contentEditable = 'false'; ed.td.onkeydown = null; ed.td.oninput = null; const text = ed.td.innerText.replace(/\n$/, ''); if (text !== E.rawInput(ed.p)) E.setInput(ed.p, text); else E.render(); E.grid.focus(); };
  P.cancelEdit = function () { const E = this; const ed = E.editing; if (!ed) return; E.editing = null; ed.td.contentEditable = 'false'; ed.td.onkeydown = null; E.render(); E.grid.focus(); };

  // ---------------- formulas ----------------
  P.recalc = function () {
    const E = this; const wb = E.wb; const cells = [];
    wb.worksheets.forEach(ws => ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, c => { if (c.formula && !(c.value && c.value.sharedFormula)) cells.push({ ws, c }); })));
    if (!cells.length) return;
    const get = (sheet, addr, here) => { const ws = sheet ? wb.getWorksheet(sheet) : here; if (!ws) throw new Error('#REF!'); const v = U().rawValue(ws.getCell(addr.replace(/\$/g, ''))); return v === undefined ? null : v; };
    for (let pass = 0; pass < 3; pass++) cells.forEach(({ ws, c }) => {
      const ctx = { ref: (a, sh) => get(sh, a, ws), range: (x, y, sh) => { const A = U().parseAddr(x.replace(/\$/g, '')), B = U().parseAddr(y.replace(/\$/g, '')); const out = []; for (let r = A.r; r <= B.r; r++) for (let cc = A.c; cc <= B.c; cc++) out.push(get(sh, U().colName(cc) + r, ws)); return out; } };
      let res; try { res = V.xlsEval(c.formula, ctx); if (res instanceof Error) res = { error: res.message.startsWith('#') ? res.message : '#VALUE!' }; else if (typeof res === 'number' && !isFinite(res)) res = { error: '#DIV/0!' }; } catch (e) { res = { error: /^#/.test(e.message) ? e.message : /unsupported/.test(e.message) ? '#NAME?' : '#VALUE!' }; }
      const f = c.formula; c.value = { formula: f, result: res };
    });
  };

  // ---------------- undo ----------------
  P.snapshot = function (whole) { const E = this; const snap = whole ? { whole: true, si: E.si, sheets: E.wb.worksheets.map(w => ({ name: w.name, state: w.state, model: clone(w.model) })) } : { si: E.si, name: E.ws().name, model: clone(E.ws().model) }; E.undoS.push(snap); if (E.undoS.length > 60) E.undoS.shift(); E.redoS = []; };
  P.restore = function (snap, into) {
    const E = this; const cur = snap.whole ? { whole: true, si: E.si, sheets: E.wb.worksheets.map(w => ({ name: w.name, state: w.state, model: clone(w.model) })) } : { si: snap.si, name: snap.name, model: clone((E.wb.getWorksheet(snap.name) || E.ws()).model) }; into.push(cur);
    if (snap.whole) { E.wb.worksheets.slice().forEach(w => E.wb.removeWorksheet(w.id)); snap.sheets.forEach(s => { const w = E.wb.addWorksheet(s.name); w.model = Object.assign(clone(s.model), { name: s.name }); (s.model.merges || []).forEach(r => { try { w.mergeCells(r); } catch (e) { } }); w.state = s.state; }); E.si = Math.min(snap.si, E.wb.worksheets.length - 1); }
    else { const w = E.wb.getWorksheet(snap.name) || E.ws(); const m = clone(snap.model); (w.model.merges || []).forEach(r => { try { w.unMergeCells(r); } catch (e) { } }); w.model = m; (m.merges || []).forEach(r => { try { w.mergeCells(r); } catch (e) { } }); E.si = Math.max(0, E.wb.worksheets.indexOf(w)); }
    E.recalc(); E.changed(true); E.sheetTabs();
  };
  P.undo = function () { const s = this.undoS.pop(); if (s) this.restore(s, this.redoS); };
  P.redo = function () { const s = this.redoS.pop(); if (s) this.restore(s, this.undoS); };
  P.changed = function (keepSel) { const E = this; E.dirty = true; E.render(); if (E.opts.onChange) E.opts.onChange(E); };

  // ---------------- keyboard ----------------
  P.move = function (dr, dc, extend) {
    const E = this; const r = Math.max(1, E.act.r + dr), c = Math.max(1, E.act.c + dc);
    if (extend) { E.sel = E.snap(E.span(E.anchor || E.act, { r: E.selEnd ? E.selEnd.r + dr : r, c: E.selEnd ? E.selEnd.c + dc : c })); E.selEnd = { r: Math.max(1, (E.selEnd || E.act).r + dr), c: Math.max(1, (E.selEnd || E.act).c + dc) }; E.paintSel(); return; }
    E.selEnd = null; E.select({ r1: r, c1: c, r2: r, c2: c }, { r, c });
  };
  P.key = function (e) {
    const E = this; if (E.editing) return; const k = e.key; const mod = e.ctrlKey || e.metaKey;
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[k]) { e.preventDefault(); if (e.shiftKey) { E.anchor = E.anchor || E.act; E.move(arrows[k][0], arrows[k][1], true); } else { E.anchor = null; E.move(arrows[k][0], arrows[k][1]); } return; }
    if (k === 'Tab') { e.preventDefault(); E.move(0, e.shiftKey ? -1 : 1); return; } if (k === 'Enter') { e.preventDefault(); if (E.opts.readonly) E.move(1, 0); else { const td = E.tdMap[U().colName(E.act.c) + E.act.r]; if (td) E.startEdit(td, null); } return; }
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? E.redo() : E.undo(); return; } if (mod && k.toLowerCase() === 'y') { e.preventDefault(); E.redo(); return; }
    if (mod && k.toLowerCase() === 'a') { e.preventDefault(); { const ext = E.extent(); E.select({ r1: 1, c1: 1, r2: Math.max(1, ext.r), c2: Math.max(1, ext.c) }, { r: 1, c: 1 }); } return; }
    if (E.opts.readonly) return;
    if (mod && ['b', 'i', 'u'].includes(k.toLowerCase())) { e.preventDefault(); E.cmd({ b: 'bold', i: 'italic', u: 'underline' }[k.toLowerCase()]); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); E.cmd('clear'); return; } if (k === 'F2') { e.preventDefault(); const td = E.tdMap[U().colName(E.act.c) + E.act.r]; if (td) E.startEdit(td, null); return; }
    if (!mod && k.length === 1) { const td = E.tdMap[U().colName(E.act.c) + E.act.r]; if (td) { e.preventDefault(); E.startEdit(td, k); } }
  };

  // ---------------- clipboard ----------------
  P.copy = function (e, cut) {
    const E = this; const s = E.sel; const rows = []; const cells = [];
    for (let r = s.r1; r <= s.r2; r++) { const line = []; const crow = []; for (let c = s.c1; c <= s.c2; c++) { const cell = E.ws().getCell(r, c); line.push(cell.text === undefined ? '' : String(V.xlsFormat.fmtValue(U().rawValue(cell), cell.numFmt))); crow.push({ value: clone(cell.value instanceof Date ? null : cell.value), date: cell.value instanceof Date ? cell.value.toISOString() : null, style: clone(cell.style) }); } rows.push(line.join('\t')); cells.push(crow); }
    const text = rows.join('\n'); E.clip = { text, cells, from: { r: s.r1, c: s.c1 }, cut: cut ? { si: E.si, sel: Object.assign({}, s) } : null };
    if (e && e.clipboardData) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
    if (cut) toast('Cut — paste to move'); else toast('Copied');
  };
  const shiftFormula = (f, dr, dc) => f.replace(/(^|[^A-Za-z_!'])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m0, pre, d1, col, d2, row) => pre + (d1 ? '$' + col : U().colName(Math.max(1, U().colNum(col) + dc))) + (d2 ? '$' + row : Math.max(1, Number(row) + dr)));
  P.paste = function (text) {
    const E = this; const at = { r: E.sel.r1, c: E.sel.c1 }; E.snapshot();
    const own = E.clip && (E.clip.text === text || !text);
    if (own) { const dr = at.r - E.clip.from.r, dc = at.c - E.clip.from.c; if (E.clip.cut) { const cs = E.clip.cut.sel; const ws0 = E.wb.worksheets[E.clip.cut.si]; for (let r = cs.r1; r <= cs.r2; r++) for (let c = cs.c1; c <= cs.c2; c++) { const x = ws0.getCell(r, c); x.value = null; x.style = {}; } }
      E.clip.cells.forEach((row, i) => row.forEach((x, j) => { const cell = E.ws().getCell(at.r + i, at.c + j); let v = x.date ? new Date(x.date) : clone(x.value); if (v && typeof v === 'object' && v.formula && !E.clip.cut) v = { formula: shiftFormula(v.formula, dr, dc) }; if (v && typeof v === 'object' && v.sharedFormula) v = U().rawValue({ value: v }); cell.value = v; cell.style = clone(x.style) || {}; }));
      if (E.clip.cut) E.clip = null; E.select({ r1: at.r, c1: at.c, r2: at.r + (own && E.clip ? E.clip.cells.length - 1 : 0), c2: at.c }, at); }
    else { const rows = String(text || '').replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t')); rows.forEach((row, i) => row.forEach((t, j) => { const cell = E.ws().getCell(at.r + i, at.c + j); const p = E.parse(t, cell); cell.value = p.value; if (p.numFmt) cell.numFmt = p.numFmt; })); E.sel = { r1: at.r, c1: at.c, r2: at.r + rows.length - 1, c2: at.c + Math.max(...rows.map(r => r.length)) - 1 }; }
    E.recalc(); E.changed();
  };

  // ---------------- commands ----------------
  P.eachSel = function (fn) { const s = this.sel; for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) fn(this.ws().getCell(r, c), r, c); };
  P.font = function (patch) { this.eachSel(c => { c.font = Object.assign({}, c.font || {}, patch); }); };
  P.align = function (patch) { this.eachSel(c => { c.alignment = Object.assign({}, c.alignment || {}, patch); }); };
  P.cmd = function (k, v) {
    const E = this; if (E.opts.readonly && !['undo', 'redo'].includes(k)) return; E.commitEdit();
    const ws = E.ws(); const s = E.sel; const ac = ws.getCell(E.act.r, E.act.c); const f0 = ac.font || {}; const a0 = ac.alignment || {};
    const simple = { undo: () => E.undo(), redo: () => E.redo() }; if (simple[k]) return simple[k]();
    const whole = ['sheetAdd'].includes(k); E.snapshot(whole);
    switch (k) {
      case 'bold': E.font({ bold: !f0.bold }); break; case 'italic': E.font({ italic: !f0.italic }); break; case 'underline': E.font({ underline: !f0.underline }); break; case 'strike': E.font({ strike: !f0.strike }); break;
      case 'font': E.font({ name: v }); break; case 'size': E.font({ size: Number(v) }); break; case 'fontColor': E.font({ color: { argb: 'FF' + v.slice(1).toUpperCase() } }); break;
      case 'fillColor': E.eachSel(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + v.slice(1).toUpperCase() } }; }); break; case 'nofill': E.eachSel(c => { c.fill = { type: 'pattern', pattern: 'none' }; }); break;
      case 'left': case 'center': case 'right': E.align({ horizontal: a0.horizontal === k ? undefined : k }); break; case 'vtop': E.align({ vertical: 'top' }); break; case 'vmid': E.align({ vertical: 'middle' }); break; case 'wrap': E.align({ wrapText: !a0.wrapText }); break;
      case 'numfmt': E.eachSel(c => { c.numFmt = v; }); break;
      case 'dec+': case 'dec-': E.eachSel(c => { let fm = c.numFmt && c.numFmt !== 'General' ? c.numFmt : '0'; const m = /(0+)(\.(0+))?/.exec(fm); if (!m) return; const d = (m[3] || '').length + (k === 'dec+' ? 1 : -1); if (d < 0) return; c.numFmt = fm.replace(m[0], m[1] + (d ? '.' + '0'.repeat(d) : '')); }); break;
      case 'border': E.border(v); break;
      case 'merge': { const inside = (E.merges || []).find(m => m.r1 <= E.act.r && m.r2 >= E.act.r && m.c1 <= E.act.c && m.c2 >= E.act.c); if (inside) ws.unMergeCells(inside.r1, inside.c1, inside.r2, inside.c2); else if (s.r2 > s.r1 || s.c2 > s.c1) { ws.mergeCells(s.r1, s.c1, s.r2, s.c2); const c = ws.getCell(s.r1, s.c1); c.alignment = Object.assign({}, c.alignment || {}, { horizontal: 'center', vertical: 'middle' }); } else { E.undoS.pop(); toast('Select more than one cell to merge'); return; } break; }
      case 'rows': return E.rowsCols(v);
      case 'sortAsc': case 'sortDesc': if (!E.sort(k === 'sortAsc')) { E.undoS.pop(); return; } break;
      case 'filter': E.toggleFilter(); break;
      case 'freeze': { const vw = (ws.views || [])[0] || {}; if (vw.state === 'frozen') ws.views = [{ state: 'normal', showGridLines: vw.showGridLines !== false }]; else { if (E.act.r === 1 && E.act.c === 1) { E.undoS.pop(); toast('Select the cell below and to the right of the rows and columns to freeze'); return; } ws.views = [{ state: 'frozen', xSplit: E.act.c - 1, ySplit: E.act.r - 1, topLeftCell: U().colName(E.act.c) + E.act.r, showGridLines: vw.showGridLines !== false }]; } break; }
      case 'clear': E.eachSel(c => { if (!c.isMerged || c.master === c) c.value = null; }); break;
      case 'clearFmt': E.eachSel(c => { c.style = {}; }); break;
      default: E.undoS.pop(); return;
    }
    E.recalc(); E.changed();
  };
  P.border = function (kind) {
    const E = this; const s = E.sel; const thick = { style: 'medium', color: { argb: 'FF000000' } };
    E.eachSel((c, r, col) => { const b = Object.assign({}, c.border || {});
      if (kind === 'none') { c.border = {}; return; }
      if (kind === 'all') Object.assign(b, { top: THIN, left: THIN, bottom: THIN, right: THIN });
      if (kind === 'outer' || kind === 'thick') { const st = kind === 'thick' ? thick : THIN; if (r === s.r1) b.top = st; if (r === s.r2) b.bottom = st; if (col === s.c1) b.left = st; if (col === s.c2) b.right = st; }
      if (kind === 'bottom' && r === s.r2) b.bottom = THIN; if (kind === 'top' && r === s.r1) b.top = THIN; c.border = b; });
  };

  // rows & columns: shift formulas, merges and conditional-format ranges so the sheet stays consistent
  P.shiftSheet = function (axis, at, n) {
    const E = this; const ws = E.ws(); const name = ws.name;
    const fix = (f, sameSheet) => f.replace(/((?:'[^']+'|[A-Za-z_][\w.]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m0, sh, d1, col, d2, row) => { const other = sh && sh.replace(/[!']/g, '') !== name; if (other !== !sameSheet && sh) return m0; if (!sh && !sameSheet) return m0; const cn = U().colNum(col), rn = Number(row); if (axis === 'r' && rn >= at) { const nr = rn + n; return nr < at ? '#REF!' : (sh || '') + d1 + col + d2 + nr; } if (axis === 'c' && cn >= at) { const nc = cn + n; return nc < at ? '#REF!' : (sh || '') + d1 + U().colName(nc) + d2 + row; } return m0; });
    E.wb.worksheets.forEach(w => w.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, c => { if (c.formula && !(c.value && c.value.sharedFormula)) { const nf = fix(c.formula, w === ws); if (nf !== c.formula) c.value = { formula: nf, result: c.value.result }; } })));
    const cfs = ws.conditionalFormattings || []; cfs.forEach(cf => { cf.ref = String(cf.ref || '').split(/\s+/).map(rg => rg.split(':').map(a => fix(a, true)).join(':')).join(' '); });
  };
  P.rowsCols = function (v) {
    const E = this; const ws = E.ws(); const s = E.sel; const nR = s.r2 - s.r1 + 1, nC = s.c2 - s.c1 + 1;
    const merges = (ws.model.merges || []).map(m => { const [a, b] = m.split(':'); const A = U().parseAddr(a), B = U().parseAddr(b || a); return { r1: A.r, c1: A.c, r2: B.r, c2: B.c }; });
    const remerge = (axis, at, n) => { merges.forEach(m => { try { ws.unMergeCells(m.r1, m.c1, m.r2, m.c2); } catch (e) { } }); return () => merges.forEach(m => { const k = axis === 'r' ? ['r1', 'r2'] : ['c1', 'c2']; const mm = Object.assign({}, m); k.forEach(x => { if (mm[x] >= at) mm[x] += n; }); if (n < 0 && ((axis === 'r' && m.r1 >= at && m.r2 < at - n) || (axis === 'c' && m.c1 >= at && m.c2 < at - n))) return; if (mm.r2 > mm.r1 || mm.c2 > mm.c1) try { ws.mergeCells(mm.r1, mm.c1, mm.r2, mm.c2); } catch (e) { } }); };
    const ask = (q, d) => { const x = root.prompt(q, d); return x === null ? null : Number(x); };
    switch (v) {
      case 'rowAbove': case 'rowBelow': { const at = v === 'rowAbove' ? s.r1 : s.r2 + 1; const style = ws.getRow(v === 'rowAbove' ? s.r1 : s.r2); const re = remerge('r', at, nR); E.shiftSheet('r', at, nR); ws.spliceRows(at, 0, ...Array.from({ length: nR }, () => [])); for (let i = 0; i < nR; i++) { const nr = ws.getRow(at + i); nr.height = style.height; style.eachCell({ includeEmpty: true }, (c, cn) => { nr.getCell(cn).style = clone(c.style); }); } re(); break; }
      case 'rowDel': { if (!root.confirm(`Delete ${nR} row(s)?`)) { E.undoS.pop(); return; } const re = remerge('r', s.r1 + nR, -nR); E.shiftSheet('r', s.r1 + nR, -nR); ws.spliceRows(s.r1, nR); re(); break; }
      case 'colLeft': case 'colRight': { const at = v === 'colLeft' ? s.c1 : s.c2 + 1; const w = ws.getColumn(v === 'colLeft' ? s.c1 : s.c2).width; const re = remerge('c', at, nC); E.shiftSheet('c', at, nC); ws.spliceColumns(at, 0, ...Array.from({ length: nC }, () => [])); for (let i = 0; i < nC; i++) ws.getColumn(at + i).width = w; re(); break; }
      case 'colDel': { if (!root.confirm(`Delete ${nC} column(s)?`)) { E.undoS.pop(); return; } const re = remerge('c', s.c1 + nC, -nC); E.shiftSheet('c', s.c1 + nC, -nC); ws.spliceColumns(s.c1, nC); re(); break; }
      case 'colWidth': { const w = ask('Column width (characters)', Math.round((ws.getColumn(s.c1).width || 8.43) * 10) / 10); if (!w || w < 0) { E.undoS.pop(); return; } for (let c = s.c1; c <= s.c2; c++) ws.getColumn(c).width = w; break; }
      case 'rowHeight': { const h = ask('Row height (points)', ws.getRow(s.r1).height || 15); if (!h || h < 0) { E.undoS.pop(); return; } for (let r = s.r1; r <= s.r2; r++) ws.getRow(r).height = h; break; }
      case 'autofit': for (let c = s.c1; c <= s.c2; c++) { let mx = 6; ws.getColumn(c).eachCell({ includeEmpty: false }, cell => { const t = V.xlsFormat.fmtValue(U().rawValue(cell), cell.numFmt); const sz = ((cell.font || {}).size || 11) / 11; String(t).split('\n').forEach(l => { mx = Math.max(mx, l.length * sz + 2); }); }); ws.getColumn(c).width = Math.min(80, mx); } break;
      case 'hideRows': for (let r = s.r1; r <= s.r2; r++) ws.getRow(r).hidden = true; break; case 'hideCols': for (let c = s.c1; c <= s.c2; c++) ws.getColumn(c).hidden = true; break;
      case 'unhide': for (let r = 1; r <= ws.rowCount; r++) ws.getRow(r).hidden = false; for (let c = 1; c <= ws.columnCount; c++) ws.getColumn(c).hidden = false; E.filters = {}; break;
      default: E.undoS.pop(); return;
    }
    E.recalc(); E.changed();
  };
  P.startResize = function (th, e) {
    const E = this; if (E.opts.readonly) return; const c = +th.getAttribute('data-col'); const x0 = e.clientX; const w0 = th.offsetWidth; const col = E.grid.querySelectorAll('colgroup col')[c]; let w = w0;
    const mm = ev => { w = Math.max(16, w0 + ev.clientX - x0); if (col) col.style.width = w + 'px'; };
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); if (w !== w0) { E.snapshot(); E.ws().getColumn(c).width = Math.round((w - 5) / 7 * 100) / 100; E.changed(); } };
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  };

  // ---------------- sort & filter ----------------
  P.region = function () {
    // the table around the selection: selection if it spans rows, else the contiguous used block below a header row
    const E = this; const ws = E.ws(); const s = E.sel; const ext = E.extent(); if (s.r2 > s.r1) return { r1: s.r1, r2: Math.min(s.r2, Math.max(s.r1, ext.r)), c1: s.c2 > s.c1 ? s.c1 : 1, c2: s.c2 > s.c1 ? s.c2 : Math.max(1, ext.c), header: false };
    const af = E.afRange(); if (af && E.act.c >= af.c1 && E.act.c <= af.c2) return { r1: af.r1 + 1, r2: Math.max(af.r1 + 1, ext.r), c1: af.c1, c2: af.c2, header: true };
    const fr = ((ws.views || [])[0] || {}).ySplit || 0; let hdr = fr || 1; return { r1: hdr + 1, r2: Math.max(hdr + 1, ext.r), c1: 1, c2: Math.max(1, ext.c), header: true };
  };
  P.sort = function (asc) {
    const E = this; const ws = E.ws(); const g = E.region(); const key = E.act.c; if (g.r2 <= g.r1) { toast('Nothing to sort'); return false; }
    if ((E.merges || []).some(m => m.r1 <= g.r2 && m.r2 >= g.r1 && m.c1 <= g.c2 && m.c2 >= g.c1 && m.r2 > m.r1)) { toast('Unmerge cells that span rows before sorting'); return false; }
    const rows = []; for (let r = g.r1; r <= g.r2; r++) { const cells = []; for (let c = g.c1; c <= g.c2; c++) { const x = ws.getCell(r, c); cells.push({ value: x.value instanceof Date ? new Date(x.value) : clone(x.value), style: clone(x.style) }); } rows.push({ cells, h: ws.getRow(r).height, k: U().rawValue(ws.getCell(r, key)) }); }
    const kv = v => v instanceof Date ? U().serial(v) : v; const empty = v => v === null || v === undefined || v === '';
    rows.sort((a, b) => { const x = kv(a.k), y = kv(b.k); if (empty(x) && empty(y)) return 0; if (empty(x)) return 1; if (empty(y)) return -1; const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }); return asc ? r : -r; });
    rows.forEach((row, i) => { const r = g.r1 + i; row.cells.forEach((x, j) => { const cell = ws.getCell(r, g.c1 + j); let v = x.value; if (v && typeof v === 'object' && v.formula) v = { formula: shiftFormula(v.formula, 0, 0) }; cell.value = v; cell.style = x.style || {}; }); if (row.h) ws.getRow(r).height = row.h; });
    toast(`Sorted ${rows.length} rows by column ${U().colName(key)} ${asc ? 'A→Z' : 'Z→A'}`); return true;
  };
  P.afRange = function () { const af = this.ws().autoFilter; if (!af) return null; if (typeof af === 'string') { const [a, b] = af.split(':'); const A = U().parseAddr(a.replace(/\$/g, '')), B = U().parseAddr((b || a).replace(/\$/g, '')); return A && B ? { r1: A.r, c1: A.c, r2: B.r, c2: B.c } : null; } const fr = af.from, to = af.to; if (!fr || !to) return null; const A = typeof fr === 'string' ? U().parseAddr(fr) : { r: fr.row, c: fr.column }, B = typeof to === 'string' ? U().parseAddr(to) : { r: to.row, c: to.column }; return { r1: A.r, c1: A.c, r2: B.r, c2: B.c }; };
  P.toggleFilter = function () {
    const E = this; const ws = E.ws(); if (ws.autoFilter) { ws.autoFilter = undefined; delete ws.autoFilter; for (let r = 1; r <= ws.rowCount; r++) ws.getRow(r).hidden = false; Object.keys(E.filters).filter(k => k.startsWith(E.si + ':')).forEach(k => delete E.filters[k]); return; }
    const s = E.sel; let hdr = s.r1, c1 = s.c1, c2 = s.c2; if (c2 === c1) { c1 = 1; c2 = Math.max(1, E.extent().c); while (c1 < c2 && U().rawValue(ws.getCell(hdr, c1)) === null) c1++; while (c2 > c1 && U().rawValue(ws.getCell(hdr, c2)) === null) c2--; }
    ws.autoFilter = { from: { row: hdr, column: c1 }, to: { row: hdr, column: c2 } }; toast('Filter on — use ▾ in the header row');
  };
  P.filterMenu = function (c, btn) {
    const E = this; const ws = E.ws(); const g = E.afRange(); if (!g) return; const key = E.si + ':' + c; const cur = E.filters[key];
    const vals = new Map(); const lastR = E.extent().r; for (let r = g.r1 + 1; r <= lastR; r++) { const cell = ws.getCell(r, c); const t = V.xlsFormat.fmtValue(U().rawValue(cell), cell.numFmt) || '(Blanks)'; vals.set(t, (vals.get(t) || 0) + 1); }
    document.querySelectorAll('.xe-menu').forEach(m => m.remove());
    const m = document.createElement('div'); m.className = 'xe-menu'; const sorted = [...vals.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    m.innerHTML = `<div class="xe-mh">Filter column ${U().colName(c)}</div><button type="button" data-fm="asc">Sort A→Z</button><button type="button" data-fm="desc">Sort Z→A</button><div class="xe-ml"><label><input type="checkbox" data-fall ${!cur ? 'checked' : ''}> Select all</label>${sorted.map(v => `<label><input type="checkbox" data-fv="${esc(v)}" ${!cur || cur.includes(v) ? 'checked' : ''}> ${esc(v)} <span>${vals.get(v)}</span></label>`).join('')}</div><div class="xe-mf"><button type="button" data-fm="clear">Clear</button><button type="button" class="pri" data-fm="ok">Apply</button></div>`;
    document.body.appendChild(m); const rc = btn.getBoundingClientRect(); m.style.left = Math.min(root.innerWidth - 260, rc.left) + 'px'; m.style.top = (rc.bottom + 4) + 'px';
    m.addEventListener('change', e => { if (e.target.hasAttribute('data-fall')) m.querySelectorAll('[data-fv]').forEach(x => { x.checked = e.target.checked; }); });
    const close = () => { m.remove(); document.removeEventListener('mousedown', out); }; const out = e => { if (!m.contains(e.target)) close(); }; setTimeout(() => document.addEventListener('mousedown', out), 0);
    m.addEventListener('click', e => { const a = e.target.closest('[data-fm]'); if (!a) return; const k = a.getAttribute('data-fm'); close(); E.act = { r: g.r1, c }; E.sel = { r1: g.r1, c1: c, r2: g.r1, c2: c };
      if (k === 'asc' || k === 'desc') return E.cmd(k === 'asc' ? 'sortAsc' : 'sortDesc');
      E.snapshot(); const keep = k === 'clear' ? null : [...m.querySelectorAll('[data-fv]')].filter(x => x.checked).map(x => x.getAttribute('data-fv')); if (keep && keep.length === sorted.length) delete E.filters[key]; else if (keep) E.filters[key] = keep; else delete E.filters[key];
      const act = Object.entries(E.filters).filter(([kk]) => kk.startsWith(E.si + ':')).map(([kk, list]) => ({ c: +kk.split(':')[1], list }));
      for (let r = g.r1 + 1; r <= lastR; r++) ws.getRow(r).hidden = !act.every(f => { const cell = ws.getCell(r, f.c); return f.list.includes(V.xlsFormat.fmtValue(U().rawValue(cell), cell.numFmt) || '(Blanks)'); });
      E.changed(); });
  };

  // ---------------- sheets ----------------
  P.sheetCmd = function (k) {
    const E = this; const ws = E.ws();
    if (k === 'add') { E.snapshot(true); let n = E.wb.worksheets.length + 1; while (E.wb.getWorksheet('Sheet' + n)) n++; E.wb.addWorksheet('Sheet' + n); E.si = E.wb.worksheets.length - 1; }
    else if (k === 'rename') { const nm = root.prompt('Sheet name', ws.name); if (!nm || nm === ws.name) return; if (/[\\/?*[\]:]/.test(nm) || nm.length > 31) { toast('Sheet names cannot contain \\ / ? * [ ] : and must be 31 characters or fewer'); return; } if (E.wb.getWorksheet(nm)) { toast('A sheet with that name exists'); return; } E.snapshot(true); const old = ws.name; ws.name = nm; E.wb.worksheets.forEach(w => w.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, c => { if (c.formula && c.formula.includes(old)) c.value = { formula: c.formula.split("'" + old + "'!").join("'" + nm + "'!").split(old + '!').join("'" + nm + "'!"), result: c.value.result }; }))); }
    else if (k === 'hide') { if (ws.state !== 'hidden' && E.wb.worksheets.filter(w => w.state !== 'hidden' && w.state !== 'veryHidden').length < 2) { toast('A workbook needs at least one visible sheet'); return; } E.snapshot(true); ws.state = ws.state === 'hidden' ? 'visible' : 'hidden'; }
    else if (k === 'delete') { if (E.wb.worksheets.length < 2) { toast('A workbook needs at least one sheet'); return; } if (!root.confirm(`Delete sheet "${ws.name}"? You can undo this.`)) return; E.snapshot(true); E.wb.removeWorksheet(ws.id); E.si = Math.max(0, E.si - 1); }
    E.recalc(); E.changed(); E.sheetTabs();
  };

  // ---------------- output ----------------
  P.buffer = async function () { this.commitEdit(); return this.wb.xlsx.writeBuffer(); };
  P.markSaved = function (text) { this.dirty = false; this.opts.savedText = text || 'Saved'; this.statusBar(); };
  P.destroy = function () { document.querySelectorAll('.xe-menu').forEach(m => m.remove()); };
  V.XlsEditor = XlsEditor;
})(typeof window !== 'undefined' ? window : globalThis);
