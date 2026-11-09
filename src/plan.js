/* Project Plan — imports the customer's project plan workbook (.xlsx/.xlsm) and renders it as close to Excel as the browser
   allows: every sheet, column widths, row heights, merged cells, fonts, fills (incl. theme colours and tints), borders,
   alignment, wrapping, number/date formats, hidden rows/columns, frozen panes, images and formula-driven conditional
   fills (commonly used for Gantt bars). Read-only by default; optional edits are stored separately from the original.
   Separate from the Requirement Session Planner. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog, loading } = V;
  const PD = () => { const d = F.doc('plan'); d.notes = d.notes || {}; d.view = d.view || {}; d.versions = d.versions || []; d.edits = d.edits || {}; return d; };
  const cache = {}; // fileId -> { wb, model }
  const MAX_ROWS = 3000, MAX_COLS = 250;

  V.plan = { html() {
    const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; const ro = S.readonly;
    const head = `<div class="page-header"><div class="t"><h1>Project Plan</h1><p>The customer's implementation project plan, imported from Excel and shown as in the workbook. The original file is kept unchanged; any edits made here are stored separately.</p></div>
      <div class="row">${cur ? `<button class="btn" data-act="dlFile" data-id="${esc(cur.fileId)}" data-name="${esc(cur.name)}">${ico('dl')}Download${d.versions.length > 1 ? ' this version' : ' original'}</button>` : ''}${ro || !cur || /\.xls$/i.test(cur.name) || S.ui.planEditor ? '' : `<button class="btn" data-act="planOpenEditor">${ico('edit')}Edit workbook</button>`}${ro ? '' : `<button class="btn primary" data-act="planUpload">${ico('upl')}${cur ? 'Import new version' : 'Import plan'}</button>`}</div></div>`;
    const pt = S.ui.planTab === 'tl' || S.ui.planTab === 'cal' ? S.ui.planTab : 'wb'; const tabs = `<div class="plan-tabs" role="tablist">${[['wb', 'Workbook'], ['tl', 'Timeline &amp; planning'], ['cal', 'Calendar']].map(([k, l]) => `<button role="tab" class="${pt === k ? 'on' : ''}" aria-selected="${pt === k}" data-act="planTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    if (pt === 'cal' && V.planCalendar) return head + `<div class="page-body pl-page">${tabs}${V.planCalendar.html()}</div>`;
    if (S.ui.planTab === 'tl' && !S.ui.planEditor && V.timelinePanel) { const td = F.doc('plan_struct') || {}; const stale = cur && td.sourceFile && td.sourceFile !== cur.fileId && !ro;
      return head + `<div class="page-body pl-page">${tabs}${stale ? `<div class="notice small" style="margin-bottom:10px"><span>The timeline was built from an earlier plan version. <button class="btn sm" data-act="tlImport">Update from ${esc(cur.name)}</button></span></div>` : ''}${V.timelinePanel(false)}</div>`; }
    if (S.ui.planEditor && cur && !ro) return head + `<div class="page-body"><div class="notice" style="margin-bottom:10px"><span>Editing <b>${esc(cur.name)}</b>. Saving creates a new version; earlier versions stay available in the version list. Formulas recalculate as you edit; conditional formatting, images and print settings in the file are kept.</span></div><div id="xlsedHost" class="xe-host"></div></div>`;
    if (!cur) return head + `<div class="page-body">${tabs}<div class="card empty"><h3>No project plan imported</h3><p>Import the plan as .xlsx or .xlsm. Sheets, formatting, merged cells and Gantt layouts are rendered; the original stays downloadable.</p>${ro ? '' : `<button class="btn primary" data-act="planUpload">${ico('upl')}Import plan</button>`}</div></div>`;
    const c = cache[cur.fileId]; const isXls = /\.xls$/i.test(cur.name);
    const verSel = d.versions.length > 1 ? `<select data-change="planVersion" style="width:auto">${d.versions.map((v, i) => `<option value="${esc(v.fileId)}" ${v.fileId === cur.fileId ? 'selected' : ''}>v${d.versions.length - i} — ${esc(v.name)} (${esc(V.fmtDate(v.uploadedAt))})</option>`).join('')}</select>` : `<span class="small muted">${esc(cur.name)} · ${esc(V.fmtDate(cur.uploadedAt))}</span>`;
    if (isXls) return head + `<div class="page-body"><div class="row" style="margin-bottom:10px">${verSel}</div><div class="notice warn">${esc(cur.name)} is a legacy Excel 97–2003 (.xls) workbook. It is stored and can be downloaded, but it cannot be rendered with its formatting in the browser. Save it as .xlsx in Excel and import that version to view it here.</div></div>`;
    if (!c) return head + `<div class="page-body">${tabs}<div class="row" style="margin-bottom:10px">${verSel}</div><div class="empty" id="planLoading">Loading workbook…</div></div>`;
    if (c.error) return head + `<div class="page-body"><div class="row" style="margin-bottom:10px">${verSel}</div><div class="notice err">The workbook could not be read: ${esc(c.error)}. The original can still be downloaded.</div></div>`;
    const sheets = c.model.sheets; const si = Math.min(d.view.sheet || 0, sheets.length - 1); const sh = sheets[si]; const z = d.view.zoom || 100; const edits = ((d.edits[cur.fileId] || {})[sh.name]) || {}; const nEd = Object.values(d.edits[cur.fileId] || {}).reduce((a, s) => a + Object.keys(s).length, 0);
    const bar = `<div class="row" style="margin-bottom:10px;flex-wrap:wrap">${verSel}<span class="spacer"></span>${nEd ? `<span class="small muted">${nEd} older cell edit(s) are applied when you open the editor</span><label class="chk small"><input type="checkbox" data-change="planShowEdits" ${S.ui.planHideEdits ? '' : 'checked'}> Show edits</label>` : ''}
      <button class="btn sm" data-act="planZoom" data-d="-10" aria-label="Zoom out">${ico('zoomout')}</button><span class="xs" style="min-width:40px;text-align:center">${z}%</span><button class="btn sm" data-act="planZoom" data-d="10" aria-label="Zoom in">${ico('zoomin')}</button><button class="btn sm" data-act="planZoom" data-d="0">100%</button><button class="btn sm" data-act="planFull" aria-label="Full screen">${ico('full')}</button></div>`;
    const notes = d.notes[cur.fileId + '::' + sh.name] || '';
    return head + `<div class="page-body">${tabs}${bar}<div id="planWrap" style="background:#fff"><div class="xls-host" id="planHost"><div id="planGrid" style="zoom:${z / 100}">${renderSheet(sh, S.ui.planHideEdits ? {} : edits)}</div></div>
      <div class="sheet-tabs" role="tablist">${sheets.map((s, i) => `<button role="tab" class="${i === si ? 'on' : ''}" data-act="planSheet" data-i="${i}" ${s.hidden ? 'title="Hidden sheet in the workbook"' : ''} ${s.tabColor ? `style="box-shadow:inset 0 -3px 0 ${esc(s.tabColor)}"` : ''}>${esc(s.name)}${s.hidden ? ' (hidden)' : ''}</button>`).join('')}</div></div>
      <div class="grid g2" style="margin-top:14px"><div class="card"><div class="card-h"><h3>Rendering notes</h3></div><div class="card-b small">${(c.model.unsupported.concat(sh.unsupported)).length ? `<ul style="margin:0;padding-left:18px">${[...new Set(c.model.unsupported.concat(sh.unsupported))].map(u => `<li>${esc(u)}</li>`).join('')}</ul>` : 'Everything in this sheet that the viewer reads was rendered.'}<div class="xs muted" style="margin-top:6px">${sh.rowsShown} of ${sh.rowCount} rows · ${sh.colsShown} of ${sh.colCount} columns${sh.truncated ? ' (large sheet truncated for display — download the original for the rest)' : ''}</div></div></div>
      <div class="card"><div class="card-h"><h3>Notes for this sheet</h3></div><div class="card-b"><textarea rows="4" data-change="planNote" data-k="${esc(cur.fileId + '::' + sh.name)}" ${ro ? 'disabled' : ''} placeholder="Workshop notes about the plan (kept separately from the workbook)">${esc(notes)}</textarea></div></div></div>
</div>`;
  }, mount() {
    const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0];
    // first visit to the timeline tab with a workbook and no dated rows yet: build the timeline from the workbook once
    if (S.ui.planTab === 'tl') { const td = F.doc('plan_struct') || {}; S.ui.tlAuto = S.ui.tlAuto || {}; if (cur && !/\.xls$/i.test(cur.name) && !(td.rows || []).length && !S.readonly && !S.ui.tlAuto[cur.fileId] && ACT.tlImport) { S.ui.tlAuto[cur.fileId] = 1; ACT.tlImport(); } if (V.planGanttMount) V.planGanttMount(); return; }
    if (!cur || /\.xls$/i.test(cur.name)) return;
    if (S.ui.planEditor && !S.readonly) { V.hostLive('xlsed', S.ui.planEdKey, async L => { L.el.innerHTML = '<div class="empty">Opening the workbook…</div>'; const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await (await V.fileBlob(cur.fileId)).arrayBuffer());
        let n = 0; Object.entries(d.edits[cur.fileId] || {}).forEach(([sn, cells]) => { const ws = wb.getWorksheet(sn); if (!ws) return; Object.entries(cells).forEach(([addr, e]) => { const x = Number(e.value); ws.getCell(addr).value = e.value !== '' && !isNaN(x) && /^-?\d+(\.\d+)?$/.test(String(e.value).trim()) ? x : e.value; n++; }); });
        L.el.innerHTML = ''; planEd = new V.XlsEditor(L.el, wb, { sheet: d.view.sheet || 0, actions: `<button class="btn sm primary" data-act="planEdSave">Save as new version</button><button class="btn sm" data-act="planEdDownload">${ico('dl')}Download</button><button class="btn sm" data-act="planEdClose">Close</button>`, savedText: n ? n + ' older cell edit(s) applied — save to keep them in a version' : '' }); if (n) planEd.dirty = true; L.api = planEd; }); return; }
    if (!cache[cur.fileId]) { if (!loadingSet.has(cur.fileId)) load(cur).then(() => V.render()).catch(e => { cache[cur.fileId] = { error: e.message }; V.render(); }); return; }
    const g = document.getElementById('planGrid'); if (g && S.ui.planEdit && !S.readonly) g.addEventListener('click', e => { const td = e.target.closest('td[data-a]'); if (td) editCell(cur, td.getAttribute('data-a')); });
  } };
  let planEd = null;
  ACT.planOpenEditor = () => { S.ui.planEditor = true; S.ui.planEdKey = 'plan:' + Date.now(); V.render(); };
  ACT.planEdClose = async () => { if (planEd && planEd.dirty && !(await confirmDialog('Close the editor', 'You have unsaved changes. Close without saving?', 'Close without saving', true))) return; S.ui.planEditor = false; if (planEd) PD().view.sheet = Math.min(planEd.si, planEd.wb.worksheets.length - 1); planEd = null; V.render(); };
  ACT.planEdDownload = async () => { if (!planEd) return; const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; // unchanged: hand back the stored file itself (re-saving through the editor would drop charts, pivots and macros)
    if (!planEd.dirty && cur.fileId) { V.download(cur.name, await V.fileBlob(cur.fileId)); return; }
    V.download(cur.name.replace(/\.(xlsx|xlsm)$/i, '') + ' (edited).xlsx', new Blob([await planEd.buffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); };
  ACT.planEdSave = async () => { if (!planEd) return; const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; loading(true, 'Saving a new version…');
    try { const buf = await planEd.buffer(); const name = cur.name.replace(/\.xlsm$/i, '.xlsx'); const file = new File([buf], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const rec = await API.uploadFile(S.project.id, file, 'plan', { editedFrom: cur.fileId }, cur.fileId, p => V.loadingMsg('Saving… ' + Math.round(p * 100) + '%'));
      d.versions.unshift({ fileId: rec.id, name, size: file.size, uploadedAt: new Date().toISOString(), by: S.user.name, editedFrom: cur.fileId }); delete d.edits[cur.fileId]; d.current = rec.id;
      cache[rec.id] = { wb: planEd.wb, model: buildModel(planEd.wb) }; planEd.markSaved('Saved as version ' + d.versions.length + ' at ' + new Date().toLocaleTimeString()); F.changed('Project plan edited and saved', name + ' v' + d.versions.length, { section: 'plan', render: false }); toast('Saved as a new version'); } finally { loading(false); } };
  const loadingSet = new Set();
  async function load(v) {
    if (loadingSet.has(v.fileId)) return; loadingSet.add(v.fileId);
    try { const ExcelJS = await V.loadExcelJS(); const blob = await V.fileBlob(v.fileId); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer()); cache[v.fileId] = { wb, model: buildModel(wb) }; }
    finally { loadingSet.delete(v.fileId); }
  }
  ACT.planSheet = a => { PD().view.sheet = Number(a.getAttribute('data-i')); F.changed(null, null, { section: 'plan', render: true }); };
  ACT.planTab = a => { const t = a.getAttribute('data-t'); S.ui.planTab = t === 'tl' || t === 'cal' ? t : 'wb'; V.render(); };
  ACT.planZoom = a => { const d = PD(); const x = Number(a.getAttribute('data-d')); d.view.zoom = x === 0 ? 100 : Math.max(30, Math.min(200, (d.view.zoom || 100) + x)); F.changed(null, null, { section: 'plan' }); };
  ACT.planFull = () => { const w = document.getElementById('planWrap'); if (document.fullscreenElement) document.exitFullscreen(); else if (w && w.requestFullscreen) w.requestFullscreen(); };
  ACT.planVersion = el => { PD().current = el.value; PD().view.sheet = 0; F.changed('Project plan version selected', el.value, { section: 'plan' }); };
  ACT.planEditMode = el => { S.ui.planEdit = el.checked; V.render(); };
  ACT.planShowEdits = el => { S.ui.planHideEdits = !el.checked; V.render(); };
  ACT.planNote = el => { PD().notes[el.getAttribute('data-k')] = el.value; F.changed('Project plan note', '', { section: 'plan', render: false }); };
  ACT.planUpload = async () => { const f = (await V.pickFile('.xlsx,.xlsm,.xls'))[0]; if (!f) return; loading(true, 'Importing the plan…');
    try { const d = PD(); const prev = d.versions[0]; const rec = await API.uploadFile(S.project.id, f, 'plan', {}, prev ? prev.fileId : null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%'));
      d.versions.unshift({ fileId: rec.id, name: f.name, size: f.size, uploadedAt: new Date().toISOString(), by: S.user.name }); d.current = rec.id; d.view.sheet = 0; F.changed(prev ? 'Project plan version imported' : 'Project plan imported', f.name, { section: 'plan' }); } finally { loading(false); }
    // the stages, the phase strip, the dashboards and the customer view are built from the timeline rows, not from the file: offer to update them now instead of leaving them on the old plan
    if (/\.xls[xm]$/i.test(f.name) && ((F.doc('plan_struct') || {}).rows || []).length && !S.readonly && ACT.tlImport && await confirmDialog('Update the timeline from this version?', 'The current stage, the phase strip, the dashboards and the customer view are built from the timeline rows. Update them from ' + f.name + '? Tasks that are still in the plan keep their progress; the earlier rows stay in the version list.', 'Update the timeline', false)) await ACT.tlImport(); };
  function editCell(cur, addr) {
    const d = PD(); const c = cache[cur.fileId]; const sh = c.model.sheets[Math.min(d.view.sheet || 0, c.model.sheets.length - 1)]; const cell = sh.cells[addr] || {}; const ed = ((d.edits[cur.fileId] || {})[sh.name] || {})[addr];
    drawer('Edit cell ' + sh.name + '!' + addr, `<div class="small muted" style="margin-bottom:8px">Original value: <b>${esc(cell.text || '(empty)')}</b>${cell.formula ? ` · formula <span class="mono">=${esc(cell.formula)}</span>` : ''}</div><label class="f">New value</label><input type="text" id="pc_val" value="${esc(ed ? ed.value : cell.text || '')}"><div class="xs muted" style="margin-top:6px">Stored as a workshop edit. The original workbook is not changed.</div>`,
      `${ed ? `<button class="btn danger" data-act="planCellReset" data-a="${esc(addr)}">Remove edit</button>` : ''}<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="planCellSave" data-a="${esc(addr)}">Save</button>`);
  }
  function curSheetKey() { const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; const c = cache[cur.fileId]; return { d, cur, sh: c.model.sheets[Math.min(d.view.sheet || 0, c.model.sheets.length - 1)] }; }
  ACT.planCellSave = a => { const { d, cur, sh } = curSheetKey(); const addr = a.getAttribute('data-a'); const e = d.edits[cur.fileId] = d.edits[cur.fileId] || {}; const s = e[sh.name] = e[sh.name] || {}; s[addr] = { value: document.getElementById('pc_val').value, by: S.user.name, at: new Date().toISOString() }; closeDrawer(); F.changed('Project plan cell edited', sh.name + '!' + addr, { section: 'plan' }); };
  ACT.planCellReset = a => { const { d, cur, sh } = curSheetKey(); delete ((d.edits[cur.fileId] || {})[sh.name] || {})[a.getAttribute('data-a')]; closeDrawer(); F.changed('Project plan edit removed', sh.name + '!' + a.getAttribute('data-a'), { section: 'plan' }); };
  ACT.planExportEdits = async () => { const d = PD(); const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; loading(true, 'Building a copy with edits…');
    try { const ExcelJS = await V.loadExcelJS(); const blob = await V.fileBlob(cur.fileId); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer());
      Object.entries(d.edits[cur.fileId] || {}).forEach(([sn, cells]) => { const ws = wb.getWorksheet(sn); if (!ws) return; Object.entries(cells).forEach(([addr, e]) => { const n = Number(e.value); ws.getCell(addr).value = e.value !== '' && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(e.value.trim()) ? n : e.value; }); });
      const out = await wb.xlsx.writeBuffer(); V.download(cur.name.replace(/\.(xlsx|xlsm)$/i, '') + ' (with workshop edits).xlsx', new Blob([out])); } finally { loading(false); } };

  // ---------- workbook → render model ----------
  const INDEXED = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF', '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99', '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];
  function themePalette(wb) {
    const def = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72'];
    try { const xml = (wb._themes && (wb._themes.theme1 || Object.values(wb._themes)[0])) || ''; if (!xml) return def; const doc = new DOMParser().parseFromString(xml, 'application/xml'); const cs = doc.getElementsByTagNameNS('*', 'clrScheme')[0]; if (!cs) return def;
      const get = n => { const e = cs.getElementsByTagNameNS('*', n)[0]; if (!e) return null; const c = e.firstElementChild; return c ? (c.getAttribute('lastClr') || c.getAttribute('val')) : null; };
      // Excel theme index order: lt1, dk1, lt2, dk2, accent1..6, hlink, folHlink
      return ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((n, i) => get(n) || def[i]); } catch (e) { return def; }
  }
  function tint(hex, t) { if (!t) return hex; let [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); const f = x => Math.round(t < 0 ? x * (1 + t) : x + (255 - x) * t); return [f(r), f(g), f(b)].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join(''); }
  function color(c, pal) { if (!c) return null; let hex = null; if (c.argb) { if (c.argb.length === 8 && c.argb.slice(0, 2) === '00' && c.argb !== '00000000') hex = c.argb.slice(2); else hex = c.argb.slice(-6); } else if (c.theme !== undefined) hex = pal[c.theme] || '000000'; else if (c.indexed !== undefined) { if (c.indexed === 64) return null; hex = INDEXED[c.indexed] || null; } if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return null; return '#' + tint(hex, Number(c.tint) || 0); }
  const BSTYLE = { thin: '1px solid', medium: '2px solid', thick: '3px solid', dotted: '1px dotted', dashed: '1px dashed', double: '3px double', hair: '1px solid', mediumDashed: '2px dashed', dashDot: '1px dashed', mediumDashDot: '2px dashed', dashDotDot: '1px dotted', slantDashDot: '2px dashed' };
  const colName = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const colNum = s => s.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const parseAddr = a => { const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(a); return m ? { c: colNum(m[1]), r: Number(m[2]) } : null; };
  const serial = d => (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 864e5 + (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) / 86400;
  function rawValue(cell) { let v = cell.value; if (v && typeof v === 'object') { if (v instanceof Date) return v; if ('result' in v) { v = v.result; if (v && typeof v === 'object' && !(v instanceof Date) && v.error) return v.error; } else if (v.formula || v.sharedFormula) return undefined; else if (v.richText) v = v.richText.map(x => x.text).join(''); else if (v.text !== undefined) v = v.text; else if (v.error) v = v.error; } return v === undefined ? null : v; }
  function fmtValue(v, numFmt) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return fmtDate(v, numFmt || 'dd-mmm-yy');
    if (typeof v === 'number') { const f = numFmt || 'General'; if (/[dmyhs]/i.test(f.replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/0|#/.test(f.replace(/"[^"]*"/g, ''))) return fmtDate(new Date(Date.UTC(1899, 11, 30) + v * 864e5), f); return fmtNum(v, f); }
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; return String(v);
  }
  function fmtNum(v, f) {
    if (f === 'General' || !f) { const s = Math.abs(v) >= 1e11 || (Math.abs(v) < 1e-4 && v !== 0) ? v.toExponential(5) : String(Math.round(v * 1e10) / 1e10); return s; }
    const sec = f.split(';'); let fmt = sec[0]; if (v < 0 && sec[1]) { fmt = sec[1]; v = -v; } else if (v === 0 && sec[2]) fmt = sec[2];
    fmt = fmt.replace(/\[[^\]]*\]/g, '').replace(/_./g, ' ').replace(/\*./g, '').replace(/\\(.)/g, '$1'); const lit = []; fmt = fmt.replace(/"([^"]*)"/g, (m, t) => { lit.push(t); return '\u0001' + (lit.length - 1) + '\u0002'; });
    const pct = fmt.includes('%'); if (pct) v *= 100; const m = /([#0,]+)(\.([0#]+))?/.exec(fmt); if (!m) return fmt.replace(/\u0001(\d+)\u0002/g, (x, i) => lit[i]);
    const dec = m[3] ? m[3].length : 0; const minDec = m[3] ? (m[3].match(/0/g) || []).length : 0; let s = Math.abs(v).toFixed(dec); if (dec > minDec) s = s.replace(new RegExp('0{0,' + (dec - minDec) + '}$'), '').replace(/\.$/, '');
    if (m[1].includes(',')) { const [i, d] = s.split('.'); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : ''); }
    if (v < 0 && !sec[1]) s = '-' + s; return fmt.replace(m[0], s).replace(/\u0001(\d+)\u0002/g, (x, i) => lit[i]);
  }
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmtDate(d, f) {
    if (isNaN(d)) return ''; f = (f || '').replace(/\[[^\]]*\]/g, '').replace(/\\(.)/g, '$1').replace(/"([^"]*)"/g, '$1'); if (!f || f === 'General') f = 'dd-mmm-yy';
    const Y = d.getUTCFullYear(), M = d.getUTCMonth(), D = d.getUTCDate(), h = d.getUTCHours(), mi = d.getUTCMinutes(), sc = d.getUTCSeconds(), wd = d.getUTCDay(); const ampm = /am\/pm|a\/p/i.test(f);
    const toks = f.match(/(yyyy|yy|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|am\/pm|a\/p|.)/gi) || []; let out = ''; let lastH = false;
    toks.forEach((t, i) => { const lo = t.toLowerCase(); const nextS = toks.slice(i + 1).find(x => /[a-z]/i.test(x)); const isMin = (lo === 'm' || lo === 'mm') && (lastH || (nextS && /^s/i.test(nextS)));
      if (lo === 'yyyy') out += Y; else if (lo === 'yy') out += String(Y).slice(-2); else if (lo === 'mmmmm') out += MON[M][0]; else if (lo === 'mmmm') out += MON[M]; else if (lo === 'mmm') out += MON[M].slice(0, 3);
      else if (lo === 'mm') out += isMin ? String(mi).padStart(2, '0') : String(M + 1).padStart(2, '0'); else if (lo === 'm') out += isMin ? mi : M + 1; else if (lo === 'dddd') out += DAY[wd]; else if (lo === 'ddd') out += DAY[wd].slice(0, 3); else if (lo === 'dd') out += String(D).padStart(2, '0'); else if (lo === 'd') out += D;
      else if (lo === 'hh') out += String(ampm ? (h % 12 || 12) : h).padStart(2, '0'); else if (lo === 'h') out += ampm ? (h % 12 || 12) : h; else if (lo === 'ss') out += String(sc).padStart(2, '0'); else if (lo === 's') out += sc; else if (lo === 'am/pm') out += h < 12 ? 'AM' : 'PM'; else if (lo === 'a/p') out += h < 12 ? 'A' : 'P'; else out += t;
      if (/^h/.test(lo)) lastH = true; else if (/[a-z]/i.test(lo) && !isMin) lastH = false; });
    return out;
  }
  V.xlsFormat = { fmtValue, fmtNum, fmtDate };

  // tiny formula evaluator for conditional-format expressions (Gantt bars): refs, ranges in MIN/MAX, AND/OR/NOT/IF/TODAY/ISBLANK/INT/ABS/WEEKDAY/DATE/YEAR/MONTH/DAY, + - * / & comparisons
  function evalExpr(src, ctx) {
    const s = src.replace(/^=/, ''); let i = 0; const T = [];
    while (i < s.length) { const ch = s[i]; if (/\s/.test(ch)) { i++; continue; } let m;
      if ((m = /^(?:('(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?[A-Z]{1,3}\$?\d+)(:(\$?[A-Z]{1,3}\$?\d+))?/.exec(s.slice(i))) && !/^[A-Z]+\(/.test(s.slice(i))) { T.push({ t: 'ref', sh: m[1] ? m[1].replace(/^'|'$/g, '').replace(/''/g, "'") : null, a: m[2], b: m[4] }); i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(s.slice(i)))) { T.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
      if (ch === '"') { let j = i + 1, v = ''; while (j < s.length && !(s[j] === '"' && s[j + 1] !== '"')) { if (s[j] === '"') j++; v += s[j]; j++; } T.push({ t: 'str', sv: v }); i = j + 1; continue; }
      if ((m = /^(TRUE|FALSE)\b/i.exec(s.slice(i)))) { T.push({ t: 'bool', v: /true/i.test(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[A-Z][A-Z0-9.]*(?=\()/i.exec(s.slice(i)))) { T.push({ t: 'fn', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>|[-+*/^&=<>(),:%])/.exec(s.slice(i)))) { T.push({ t: 'op', v: m[0] }); i += m[0].length; continue; }
      throw new Error('unsupported'); }
    let p = 0; const peek = () => T[p]; const take = v => { const t = T[p]; if (v && (!t || t.v !== v)) throw new Error('syntax'); p++; return t; };
    const num = v => v instanceof Date ? serial(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v === null || v === '' ? 0 : typeof v === 'number' ? v : (isNaN(Number(v)) ? v : Number(v));
    function cmp() { let l = cat(); while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) { const o = take().v; const r = cat(); const a = num(l), b = num(r); l = o === '=' ? a === b || String(a).toLowerCase() === String(b).toLowerCase() : o === '<>' ? a !== b : o === '<' ? a < b : o === '>' ? a > b : o === '<=' ? a <= b : a >= b; } return l; }
    function cat() { let l = add(); while (peek() && peek().v === '&') { take(); l = String(l == null ? '' : l) + String(add() || ''); } return l; }
    function add() { let l = mul(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) { const o = take().v; const r = mul(); l = o === '+' ? num(l) + num(r) : num(l) - num(r); } return l; }
    function mul() { let l = un(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) { const o = take().v; const r = un(); l = o === '*' ? num(l) * num(r) : num(l) / num(r); } return l; }
    function un() { if (peek() && peek().v === '-') { take(); return -num(un()); } if (peek() && peek().v === '+') { take(); return num(un()); } return pow(); }
    function pow() { let l = prim(); while (peek() && peek().v === '^') { take(); l = Math.pow(num(l), num(prim())); } if (peek() && peek().v === '%') { take(); l = num(l) / 100; } return l; }
    function prim() { const t = take(); if (!t) throw new Error('syntax');
      if (t.t === 'str') return t.sv; if (t.t === 'num' || t.t === 'bool') return t.v; if (t.t === 'ref') return t.b ? { range: [t.a, t.b], sh: t.sh } : ctx.ref(t.a, t.sh);
      if (t.v === '(') { const v = cmp(); take(')'); return v; }
      if (t.t === 'fn') { take('('); const args = []; const safe = t.v === 'IFERROR' || t.v === 'ISERROR' || t.v === 'IFNA' || t.v === 'ISNA';
        const arg = () => { if (!safe || args.length) return cmp(); const p0 = p; try { return cmp(); } catch (e) { p = p0; let depth = 0; while (p < T.length) { const x = T[p]; if (x.v === '(') depth++; else if (x.v === ')') { if (!depth) break; depth--; } else if (x.v === ',' && !depth) break; p++; } return e instanceof Error ? e : new Error(String(e)); } };
        if (peek() && peek().v !== ')') { args.push(arg()); while (peek() && peek().v === ',') { take(); args.push(arg()); } } take(')'); if (t.v === 'ISERROR') return args[0] instanceof Error; return fn(t.v, args); }
      throw new Error('syntax'); }
    const flat = args => args.flatMap(a => a && a.range ? ctx.range(a.range[0], a.range[1], a.sh) : [a]);
    const grid = a => { if (!(a && a.range)) return [[a]]; const P1 = parseAddr(a.range[0].replace(/\$/g, '')), P2 = parseAddr(a.range[1].replace(/\$/g, '')); const vals = ctx.range(a.range[0], a.range[1], a.sh); const w = P2.c - P1.c + 1; const out = []; for (let k = 0; k < vals.length; k += w) out.push(vals.slice(k, k + w)); return out; };
    const nums = a => flat(a).filter(x => typeof x === 'number' || x instanceof Date).map(num);
    const crit = (c) => { const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(c)); const op = m[1] || '='; const rv = m[2]; const rn = rv !== '' && !isNaN(Number(rv)) ? Number(rv) : null; return v => { const vv = v instanceof Date ? serial(v) : v; if (rn !== null && typeof vv === 'number') return { '=': vv === rn, '<>': vv !== rn, '<': vv < rn, '>': vv > rn, '<=': vv <= rn, '>=': vv >= rn }[op]; const a = String(vv == null ? '' : vv).toLowerCase(), b = rv.toLowerCase(); if (op === '=' && /[*?]/.test(b)) return new RegExp('^' + b.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(a); return op === '<>' ? a !== b : op === '=' ? a === b : false; }; };
    const str = v => v == null ? '' : v instanceof Date ? fmtDate(v, 'dd-mmm-yyyy') : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
    const dt = v => new Date(Date.UTC(1899, 11, 30) + num(v) * 864e5);
    function fn(n, a) { const b = x => !!(typeof x === 'number' ? x : x === true || (typeof x === 'string' && x !== '' && x.toUpperCase() === 'TRUE'));
      switch (n) { case 'AND': return a.every(b); case 'OR': return a.some(b); case 'NOT': return !b(a[0]); case 'IF': return b(a[0]) ? a[1] : (a.length > 2 ? a[2] : false); case 'TODAY': return Math.floor(serial(new Date())); case 'NOW': return serial(new Date());
        case 'ISBLANK': return a[0] === null || a[0] === ''; case 'INT': return Math.floor(num(a[0])); case 'ABS': return Math.abs(num(a[0])); case 'MIN': return Math.min(...flat(a).map(num).filter(x => typeof x === 'number')); case 'MAX': return Math.max(...flat(a).map(num).filter(x => typeof x === 'number'));
        case 'DATE': return serial(new Date(Date.UTC(num(a[0]), num(a[1]) - 1, num(a[2])))); case 'YEAR': return new Date(Date.UTC(1899, 11, 30) + num(a[0]) * 864e5).getUTCFullYear(); case 'MONTH': return new Date(Date.UTC(1899, 11, 30) + num(a[0]) * 864e5).getUTCMonth() + 1; case 'DAY': return new Date(Date.UTC(1899, 11, 30) + num(a[0]) * 864e5).getUTCDate();
        case 'WEEKDAY': return new Date(Date.UTC(1899, 11, 30) + num(a[0]) * 864e5).getUTCDay() + 1;
        case 'SUM': return nums(a).reduce((x, y) => x + y, 0); case 'PRODUCT': return nums(a).reduce((x, y) => x * y, 1); case 'AVERAGE': { const v = nums(a); if (!v.length) throw new Error('#DIV/0!'); return v.reduce((x, y) => x + y, 0) / v.length; }
        case 'COUNT': return nums(a).length; case 'COUNTA': return flat(a).filter(x => x !== null && x !== undefined && x !== '').length; case 'COUNTBLANK': return flat(a).filter(x => x === null || x === undefined || x === '').length;
        case 'MEDIAN': { const v = nums(a).sort((x, y) => x - y); if (!v.length) return 0; const h = Math.floor(v.length / 2); return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2; }
        case 'COUNTIF': { const f = crit(a[1]); return flat([a[0]]).filter(f).length; } case 'SUMIF': { const r = flat([a[0]]), sr = a[2] ? flat([a[2]]) : r; const f = crit(a[1]); return r.reduce((t, v, k) => t + (f(v) ? num(sr[k]) || 0 : 0), 0); }
        case 'AVERAGEIF': { const r = flat([a[0]]), sr = a[2] ? flat([a[2]]) : r; const f = crit(a[1]); const v = r.map((x, k) => f(x) ? num(sr[k]) : null).filter(x => typeof x === 'number'); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; }
        case 'ROUND': { const p = Math.pow(10, num(a[1] || 0)); return Math.round(num(a[0]) * p) / p; } case 'ROUNDUP': { const p = Math.pow(10, num(a[1] || 0)); return Math.ceil(num(a[0]) * p) / p; } case 'ROUNDDOWN': { const p = Math.pow(10, num(a[1] || 0)); return Math.floor(num(a[0]) * p) / p; }
        case 'MOD': return num(a[0]) % num(a[1]); case 'POWER': return Math.pow(num(a[0]), num(a[1])); case 'SQRT': return Math.sqrt(num(a[0])); case 'CEILING': return Math.ceil(num(a[0]) / num(a[1] || 1)) * num(a[1] || 1); case 'FLOOR': return Math.floor(num(a[0]) / num(a[1] || 1)) * num(a[1] || 1);
        case 'IFERROR': return a[0] instanceof Error || (typeof a[0] === 'number' && !isFinite(a[0])) ? a[1] : a[0]; case 'ISNUMBER': return typeof a[0] === 'number'; case 'ISTEXT': return typeof a[0] === 'string'; case 'TRUE': return true; case 'FALSE': return false;
        case 'CONCATENATE': case 'CONCAT': return flat(a).map(str).join(''); case 'TEXTJOIN': return flat(a.slice(2)).filter(x => !b(a[1]) || (x !== null && x !== '')).map(str).join(str(a[0]));
        case 'LEN': return str(a[0]).length; case 'LEFT': return str(a[0]).slice(0, a.length > 1 ? num(a[1]) : 1); case 'RIGHT': { const t = str(a[0]); const k = a.length > 1 ? num(a[1]) : 1; return k ? t.slice(-k) : ''; } case 'MID': return str(a[0]).substr(num(a[1]) - 1, num(a[2]));
        case 'UPPER': return str(a[0]).toUpperCase(); case 'LOWER': return str(a[0]).toLowerCase(); case 'PROPER': return str(a[0]).toLowerCase().replace(/\b\w/g, x => x.toUpperCase()); case 'TRIM': return str(a[0]).trim().replace(/\s+/g, ' '); case 'TEXT': return fmtValue(typeof a[0] === 'number' || a[0] instanceof Date ? a[0] : num(a[0]), str(a[1])); case 'VALUE': return num(a[0]);
        case 'SUBSTITUTE': return str(a[0]).split(str(a[1])).join(str(a[2])); case 'FIND': case 'SEARCH': { const k = (n === 'SEARCH' ? str(a[1]).toLowerCase().indexOf(str(a[0]).toLowerCase(), a[2] ? num(a[2]) - 1 : 0) : str(a[1]).indexOf(str(a[0]), a[2] ? num(a[2]) - 1 : 0)); if (k < 0) throw new Error('#VALUE!'); return k + 1; }
        case 'VLOOKUP': { const g = grid(a[1]); const k = num(a[2]) - 1; const exact = a.length > 3 && !b(a[3]); const key = a[0]; let hit = null; for (const row of g) { const v = row[0]; if (exact ? (v instanceof Date ? serial(v) : v) == (key instanceof Date ? serial(key) : key) || String(v).toLowerCase() === String(key).toLowerCase() : num(v) <= num(key)) { hit = row; if (exact) break; } } if (!hit) throw new Error('#N/A'); return hit[k] === undefined ? null : hit[k]; }
        case 'HLOOKUP': { const g = grid(a[1]); const k = num(a[2]) - 1; const c = g[0].findIndex(v => String(v).toLowerCase() === String(a[0]).toLowerCase()); if (c < 0 || !g[k]) throw new Error('#N/A'); return g[k][c]; }
        case 'INDEX': { const g = grid(a[0]); const r = num(a[1] || 1), c = a.length > 2 ? num(a[2]) : 1; const row = g.length === 1 && a.length < 3 ? g[0] : g[r - 1]; const v = g.length === 1 && a.length < 3 ? row[r - 1] : row && row[c - 1]; if (v === undefined) throw new Error('#REF!'); return v; }
        case 'MATCH': { const l = flat([a[1]]); const k = l.findIndex(v => String(v instanceof Date ? serial(v) : v).toLowerCase() === String(a[0] instanceof Date ? serial(a[0]) : a[0]).toLowerCase()); if (k < 0) throw new Error('#N/A'); return k + 1; }
        case 'EDATE': { const d = dt(a[0]); return serial(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + num(a[1]), d.getUTCDate()))); } case 'EOMONTH': { const d = dt(a[0]); return serial(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + num(a[1]) + 1, 0))); }
        case 'DAYS': return Math.floor(num(a[0])) - Math.floor(num(a[1])); case 'NETWORKDAYS': return fn('NETWORKDAYS.INTL', [a[0], a[1], 1].concat(a.slice(2)));
        case 'WORKDAY': return fn('WORKDAY.INTL', [a[0], a[1], 1].concat(a.slice(2)));
        // ---- planning functions: dates and times, working days with a weekend pattern and holidays, multi-condition totals, lookups ----
        case 'IFS': { for (let k = 0; k + 1 < a.length; k += 2) if (b(a[k])) return a[k + 1]; throw new Error('#N/A'); }
        case 'SWITCH': { const rest = a.slice(1); for (let k = 0; k + 1 < rest.length; k += 2) if (String(num(a[0])).toLowerCase() === String(num(rest[k])).toLowerCase()) return rest[k + 1]; if (rest.length % 2) return rest[rest.length - 1]; throw new Error('#N/A'); }
        case 'CHOOSE': { const k = num(a[0]); if (!(k >= 1 && k < a.length)) throw new Error('#VALUE!'); return a[k]; }
        case 'IFNA': return a[0] instanceof Error && /#N\/A/.test(a[0].message) ? a[1] : a[0]; case 'ISNA': return a[0] instanceof Error && /#N\/A/.test(a[0].message); case 'N': return typeof a[0] === 'number' ? a[0] : a[0] instanceof Date ? serial(a[0]) : a[0] === true ? 1 : 0;
        case 'ISEVEN': return Math.floor(Math.abs(num(a[0]))) % 2 === 0; case 'ISODD': return Math.floor(Math.abs(num(a[0]))) % 2 === 1;
        case 'PI': return Math.PI; case 'SIGN': return Math.sign(num(a[0])); case 'TRUNC': { const p = Math.pow(10, num(a[1] || 0)); return Math.trunc(num(a[0]) * p) / p; } case 'MROUND': { const m = num(a[1]); return m ? Math.round(num(a[0]) / m) * m : 0; }
        case 'LARGE': { const v = nums([a[0]]).sort((x, y) => y - x); const k = num(a[1]); if (!(k >= 1 && k <= v.length)) throw new Error('#NUM!'); return v[k - 1]; } case 'SMALL': { const v = nums([a[0]]).sort((x, y) => x - y); const k = num(a[1]); if (!(k >= 1 && k <= v.length)) throw new Error('#NUM!'); return v[k - 1]; }
        case 'RANK': { const v = nums([a[1]]); const x = num(a[0]); const asc = a.length > 2 && b(a[2]); if (!v.includes(x)) throw new Error('#N/A'); return 1 + v.filter(y => (asc ? y < x : y > x)).length; }
        case 'ROWS': return grid(a[0]).length; case 'COLUMNS': return grid(a[0])[0].length;
        case 'SUMPRODUCT': { const gs = a.map(x => flat([x]).map(v => (typeof v === 'number' ? v : v instanceof Date ? serial(v) : 0))); const n0 = gs[0].length; if (gs.some(g => g.length !== n0)) throw new Error('#VALUE!'); let t = 0; for (let k = 0; k < n0; k++) t += gs.reduce((p, g) => p * g[k], 1); return t; }
        case 'COUNTIFS': case 'SUMIFS': case 'AVERAGEIFS': case 'MAXIFS': case 'MINIFS': { const sumR = n === 'COUNTIFS' ? null : flat([a[0]]); const pairs = n === 'COUNTIFS' ? a : a.slice(1); const tests = []; for (let k = 0; k + 1 < pairs.length; k += 2) tests.push([flat([pairs[k]]), crit(pairs[k + 1])]); const len = tests[0][0].length; const hit = []; for (let k = 0; k < len; k++) if (tests.every(([r, f]) => f(r[k]))) hit.push(k); if (n === 'COUNTIFS') return hit.length;
          const v = hit.map(k => sumR[k]).filter(x => typeof x === 'number' || x instanceof Date).map(num); if (n === 'SUMIFS') return v.reduce((x, y) => x + y, 0); if (n === 'AVERAGEIFS') { if (!v.length) throw new Error('#DIV/0!'); return v.reduce((x, y) => x + y, 0) / v.length; } if (!v.length) return 0; return n === 'MAXIFS' ? Math.max(...v) : Math.min(...v); }
        case 'XLOOKUP': { const keys = flat([a[1]]); const rets = flat([a[2]]); const key = a[0] instanceof Date ? serial(a[0]) : a[0]; const k = keys.findIndex(v => (v instanceof Date ? serial(v) : v) == key || String(v).toLowerCase() === String(key).toLowerCase()); if (k < 0) { if (a.length > 3) return a[3]; throw new Error('#N/A'); } return rets[k] === undefined ? null : rets[k]; }
        case 'DATEVALUE': { const t = str(a[0]).trim(); let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return serial(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))); m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t); if (m) return serial(new Date(Date.UTC(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]))); const d = Date.parse(t + ' UTC'); if (isNaN(d)) throw new Error('#VALUE!'); return Math.floor(serial(new Date(d))); }
        case 'TIME': return ((num(a[0]) * 3600 + num(a[1]) * 60 + num(a[2])) % 86400) / 86400; case 'TIMEVALUE': { const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i.exec(str(a[0])); if (!m) throw new Error('#VALUE!'); let h = +m[1]; if (m[4]) h = (h % 12) + (/pm/i.test(m[4]) ? 12 : 0); return (h * 3600 + +m[2] * 60 + +(m[3] || 0)) / 86400; }
        case 'HOUR': { const f = num(a[0]); return Math.floor(Math.round((f - Math.floor(f)) * 86400) / 3600) % 24; } case 'MINUTE': { const f = num(a[0]); return Math.floor(Math.round((f - Math.floor(f)) * 86400) / 60) % 60; } case 'SECOND': { const f = num(a[0]); return Math.round((f - Math.floor(f)) * 86400) % 60; }
        case 'DATEDIF': { const s0 = dt(a[0]), e0 = dt(a[1]); if (e0 < s0) throw new Error('#NUM!'); const u = str(a[2]).toUpperCase(); let mo = (e0.getUTCFullYear() - s0.getUTCFullYear()) * 12 + e0.getUTCMonth() - s0.getUTCMonth(); if (e0.getUTCDate() < s0.getUTCDate()) mo--; if (u === 'D') return Math.floor(num(a[1])) - Math.floor(num(a[0])); if (u === 'M') return mo; if (u === 'Y') return Math.floor(mo / 12); if (u === 'YM') return mo % 12; if (u === 'MD') { let d = e0.getUTCDate() - s0.getUTCDate(); if (d < 0) d += new Date(Date.UTC(e0.getUTCFullYear(), e0.getUTCMonth(), 0)).getUTCDate(); return d; } throw new Error('#NUM!'); }
        case 'YEARFRAC': { const s0 = Math.floor(num(a[0])), e0 = Math.floor(num(a[1])); return Math.abs(e0 - s0) / 365; } case 'DAYS360': { const s0 = dt(a[0]), e0 = dt(a[1]); const d1 = Math.min(30, s0.getUTCDate()); let d2 = e0.getUTCDate(); if (d2 === 31 && d1 >= 30) d2 = 30; return (e0.getUTCFullYear() - s0.getUTCFullYear()) * 360 + (e0.getUTCMonth() - s0.getUTCMonth()) * 30 + d2 - d1; }
        case 'WEEKNUM': { const d0 = dt(a[0]); const jan1 = Date.UTC(d0.getUTCFullYear(), 0, 1); const off = (new Date(jan1).getUTCDay() - (num(a[1] || 1) === 2 ? 1 : 0) + 7) % 7; return Math.floor((Math.floor((Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate()) - jan1) / 864e5) + off) / 7) + 1; }
        case 'ISOWEEKNUM': { const d0 = dt(a[0]); const t = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate())); const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); }
        case 'NETWORKDAYS.INTL': case 'WORKDAY.INTL': { const intl = (w) => { const s = new Set(); if (w === undefined || w === null || w === '') { s.add(0); s.add(6); return s; } if (typeof w === 'string' && /^[01]{7}$/.test(w)) { w.split('').forEach((c, k) => { if (c === '1') s.add((k + 1) % 7); }); return s; } const c = num(w); if (c >= 1 && c <= 7) { const first = (c + 5) % 7; s.add(first); s.add((first + 1) % 7); } else if (c >= 11 && c <= 17) s.add(c - 11); else throw new Error('#NUM!'); return s; };
          const wk = intl(a[2]); const hol = new Set(flat(a.slice(3)).filter(x => typeof x === 'number' || x instanceof Date).map(x => Math.floor(num(x)))); const isW = x => !wk.has(dt(x).getUTCDay()) && !hol.has(x);
          if (n === 'NETWORKDAYS.INTL') { let s0 = Math.floor(num(a[0])), e0 = Math.floor(num(a[1])); const sg = s0 <= e0 ? 1 : -1; let c = 0; for (let x = s0; sg > 0 ? x <= e0 : x >= e0; x += sg) if (isW(x)) c++; return c * sg; }
          let d = Math.floor(num(a[0])), k = num(a[1]); const sg = k >= 0 ? 1 : -1; while (k !== 0) { d += sg; if (isW(d)) k -= sg; } return d; }
        case 'REPT': return str(a[0]).repeat(Math.max(0, num(a[1]))); case 'EXACT': return str(a[0]) === str(a[1]); case 'CLEAN': return str(a[0]).replace(/[\u0000-\u001f]/g, '');
        default: throw new Error('unsupported function ' + n); } }
    const v = cmp(); if (p < T.length) throw new Error('syntax'); return v;
  }
  V.xlsEval = evalExpr;

  function buildModel(wb, opt) {
    opt = opt || {};
    const pal = themePalette(wb); const unsupported = []; const sheets = [];
    wb.worksheets.forEach(ws => {
      const sh = { name: ws.name, hidden: ws.state && ws.state !== 'visible', cells: {}, merges: [], cols: [], rows: [], images: [], unsupported: [], tabColor: color(ws.properties && ws.properties.tabColor, pal) };
      const rc = Math.min(Math.max(ws.rowCount || 0, opt.minRows || 0), MAX_ROWS), cc = Math.min(Math.max(ws.columnCount || 0, opt.minCols || 0), MAX_COLS); sh.rowCount = ws.rowCount || 0; sh.colCount = ws.columnCount || 0; sh.truncated = sh.rowCount > MAX_ROWS || sh.colCount > MAX_COLS; sh.rowsShown = rc; sh.colsShown = cc;
      const dw = (ws.properties && ws.properties.defaultColWidth) || 8.43; const dh = (ws.properties && ws.properties.defaultRowHeight) || 15;
      const realR = ws.rowCount || 0, realC = ws.columnCount || 0; // never touch rows/columns beyond the data: ExcelJS creates them on access
      for (let c = 1; c <= cc; c++) { const col = c <= realC ? ws.getColumn(c) : {}; sh.cols[c] = { w: Math.round(((col.width || dw) * 7 + 5)), hidden: !!col.hidden }; }
      const raw = {}; const pending = []; // for formula evaluation
      for (let r = 1; r <= rc; r++) { if (r > realR) { sh.rows[r] = { h: Math.round(dh * 4 / 3), hidden: false }; continue; } const row = ws.getRow(r); sh.rows[r] = { h: Math.round((row.height || dh) * 4 / 3), hidden: !!row.hidden };
        for (let c = 1; c <= Math.min(cc, realC); c++) { const cell = row.getCell(c); const st = cell.style || {}; const v = rawValue(cell); const addr = colName(c) + r; raw[addr] = v;
          const fill = st.fill && st.fill.type === 'pattern' && st.fill.pattern !== 'none' ? color(st.fill.fgColor, pal) || (st.fill.pattern === 'solid' ? null : color(st.fill.bgColor, pal)) : st.fill && st.fill.type === 'gradient' && st.fill.stops ? color(st.fill.stops[0].color, pal) : null;
          if ((v === null || v === undefined) && !fill && !st.border && !cell.formula && cell.type !== 'Merge') continue;
          const font = st.font || {}; const al = st.alignment || {}; const b = st.border || {}; const css = [];
          if (fill) css.push('background:' + fill); if (font.bold) css.push('font-weight:bold'); if (font.italic) css.push('font-style:italic'); if (font.underline) css.push('text-decoration:underline'); if (font.strike) css.push('text-decoration:line-through');
          if (font.size) css.push('font-size:' + font.size + 'pt'); if (font.name) css.push('font-family:"' + String(font.name).replace(/[^\w .,-]/g, '').slice(0, 60) + '",Calibri,Arial,sans-serif'); const fc = color(font.color, pal); if (fc) css.push('color:' + fc);
          const ha = al.horizontal || (typeof v === 'number' || v instanceof Date ? 'right' : ''); if (ha && ha !== 'general') css.push('text-align:' + ({ centerContinuous: 'center', distributed: 'justify', fill: 'left' }[ha] || ha)); if (al.vertical) css.push('vertical-align:' + (al.vertical === 'middle' ? 'middle' : al.vertical === 'top' ? 'top' : 'bottom'));
          if (al.wrapText) css.push('white-space:pre-wrap;word-break:break-word'); if (al.indent) css.push('padding-left:' + (3 + al.indent * 9) + 'px'); if (al.textRotation && al.textRotation !== 0) { css.push('writing-mode:vertical-rl'); if (!sh.unsupported.includes('Rotated text is shown vertically')) sh.unsupported.push('Rotated text is shown vertically'); }
          ['top', 'right', 'bottom', 'left'].forEach(k => { if (b[k] && b[k].style) css.push('border-' + k + ':' + (BSTYLE[b[k].style] || '1px solid') + ' ' + (color(b[k].color, pal) || '#000')); });
          const formula = cell.formula || (cell.value && cell.value.sharedFormula) || null; if (v === undefined) pending.push({ addr, numFmt: st.numFmt, formula: cell.formula });
          sh.cells[addr] = { r, c, v, text: fmtValue(v, st.numFmt), css: css.join(';'), formula, link: cell.hyperlink || null, note: cell.note ? (typeof cell.note === 'string' ? cell.note : (cell.note.texts || []).map(t => t.text).join('')) : null };
        } }
      // formulas without a cached result (e.g. files written by scripts): evaluate simple ones, two passes for dependencies
      const ctxE = { ref: x => { const v = raw[x.replace(/\$/g, '')]; return v === undefined ? null : v; }, range: (x, y) => { const P1 = parseAddr(x), P2 = parseAddr(y); const out = []; for (let rr = P1.r; rr <= P2.r; rr++) for (let c2 = P1.c; c2 <= P2.c; c2++) out.push(raw[colName(c2) + rr]); return out; } };
      let unevaluated = 0; for (let pass = 0; pass < 2; pass++) pending.forEach(pf => { if (pf.done || !pf.formula) return; try { const v = evalExpr(pf.formula, ctxE); if (typeof v === 'number' && !isFinite(v)) return; raw[pf.addr] = v; pf.done = true; if (sh.cells[pf.addr]) sh.cells[pf.addr].text = fmtValue(v, pf.numFmt); } catch (e) { } });
      pending.forEach(pf => { if (!pf.done) { unevaluated++; if (sh.cells[pf.addr]) sh.cells[pf.addr].text = ''; } }); if (unevaluated) sh.unsupported.push(unevaluated + ' formula cell(s) have no saved result in the file and could not be calculated here — they are shown empty (open in Excel to recalculate)');
      const ms = (ws.model && ws.model.merges) || []; ms.forEach(m => { const [a, b] = m.split(':'); const A = parseAddr(a), B = parseAddr(b); if (A && B) sh.merges.push({ r1: A.r, c1: A.c, r2: B.r, c2: B.c }); });
      const view = (ws.views || [])[0] || {}; if (view.state === 'frozen') { sh.freezeRows = view.ySplit || 0; sh.freezeCols = view.xSplit || 0; } sh.gridlines = view.showGridLines !== false;
      // conditional formatting (Gantt bars and highlights)
      const cfs = ws.conditionalFormattings || (ws.model && ws.model.conditionalFormattings) || []; let skipped = 0, applied = 0;
      cfs.forEach(cf => { const ranges = String(cf.ref || '').split(/\s+/).filter(Boolean); (cf.rules || []).slice().sort((x, y) => (x.priority || 0) - (y.priority || 0)).forEach(rule => {
        const fillC = rule.style && rule.style.fill ? color(rule.style.fill.bgColor || rule.style.fill.fgColor, pal) : null; const fontC = rule.style && rule.style.font ? color(rule.style.font.color, pal) : null; const bold = rule.style && rule.style.font && rule.style.font.bold;
        if (!fillC && !fontC && !bold) { if (rule.type !== 'expression' && rule.type !== 'cellIs') skipped++; return; }
        if (rule.type !== 'expression' && rule.type !== 'cellIs') { skipped++; return; }
        ranges.forEach(rg => { const [a, b] = rg.split(':'); const A = parseAddr(a), B = parseAddr(b || a); if (!A || !B) return;
          for (let r = A.r; r <= Math.min(B.r, rc); r++) for (let c = A.c; c <= Math.min(B.c, cc); c++) { const addr = colName(c) + r; let ok = false;
            try { if (rule.type === 'expression') { const f = (rule.formulae || [])[0]; if (!f) continue; const dr = r - A.r, dc = c - A.c;
                const shifted = f.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (m0, d1, col, d2, row) => (d1 ? col : colName(colNum(col) + dc)) + (d2 ? row : String(Number(row) + dr)));
                ok = !!evalExpr(shifted, { ref: x => { const v = raw[x.replace(/\$/g, '')]; return v === undefined ? null : v; }, range: (x, y) => { const P1 = parseAddr(x), P2 = parseAddr(y); const out = []; for (let rr = P1.r; rr <= P2.r; rr++) for (let c2 = P1.c; c2 <= P2.c; c2++) out.push(raw[colName(c2) + rr]); return out; } }); }
              else { const v = raw[addr]; const fs = (rule.formulae || []).map(x => { try { return evalExpr(x, { ref: y => raw[y.replace(/\$/g, '')] }); } catch (e) { return x; } }); const n = x => x instanceof Date ? serial(x) : x; const vv = n(v);
                ok = { equal: vv == n(fs[0]), notEqual: vv != n(fs[0]), greaterThan: vv > n(fs[0]), lessThan: vv < n(fs[0]), greaterThanOrEqual: vv >= n(fs[0]), lessThanOrEqual: vv <= n(fs[0]), between: vv >= n(fs[0]) && vv <= n(fs[1]), notBetween: vv < n(fs[0]) || vv > n(fs[1]) }[rule.operator] || false; }
            } catch (e) { skipped++; return; }
            if (ok) { const x = sh.cells[addr] = sh.cells[addr] || { r, c, v: null, text: '', css: '' }; if (!x.cfDone) { x.css += (x.css ? ';' : '') + (fillC ? 'background:' + fillC : '') + (fontC ? ';color:' + fontC : '') + (bold ? ';font-weight:bold' : ''); if (rule.stopIfTrue) x.cfDone = true; } applied++; } } }); }); });
      if (skipped) sh.unsupported.push(`${skipped} conditional-format rule(s) could not be evaluated (data bars, colour scales, icon sets or unsupported functions) and are not shown`);
      if (applied) sh.cfApplied = applied;
      try { (ws.getImages ? ws.getImages() : []).forEach(img => { const m = wb.getImage(Number(img.imageId)); if (!m || !m.buffer) return; const tl = img.range && img.range.tl; if (!tl) return; let x = 0, y = 0; for (let c = 1; c <= Math.floor(tl.nativeCol !== undefined ? tl.nativeCol : tl.col); c++) x += (sh.cols[c] || { w: 64 }).w; for (let r = 1; r <= Math.floor(tl.nativeRow !== undefined ? tl.nativeRow : tl.row); r++) y += (sh.rows[r] || { h: 20 }).h;
        const br = img.range.br; let w = img.range.ext ? img.range.ext.width : 0, h = img.range.ext ? img.range.ext.height : 0; if (br && !w) { let x2 = 0, y2 = 0; for (let c = 1; c <= Math.floor(br.nativeCol !== undefined ? br.nativeCol : br.col); c++) x2 += (sh.cols[c] || { w: 64 }).w; for (let r = 1; r <= Math.floor(br.nativeRow !== undefined ? br.nativeRow : br.row); r++) y2 += (sh.rows[r] || { h: 20 }).h; w = x2 - x; h = y2 - y; }
        const b64 = btoa(Array.from(new Uint8Array(m.buffer)).map(ch => String.fromCharCode(ch)).join('')); sh.images.push({ x: x + 40, y: y + 22, w: w || 120, h: h || 60, src: 'data:image/' + (m.extension || 'png') + ';base64,' + b64 }); }); } catch (e) { sh.unsupported.push('Some images could not be placed'); }
      if (!opt.editor) sh.unsupported.push('Charts, shapes, text boxes and SmartArt drawn on the sheet are not rendered (download the original to see them)');
      sheets.push(sh);
    });
    if (wb.definedNames && wb.definedNames.model && wb.definedNames.model.length) { /* names are not needed for display */ }
    return { sheets, unsupported };
  }
  V.xlsBuildModel = buildModel;
  V.xlsUtil = { colName, colNum, parseAddr, serial, rawValue, color, themePalette };

  function renderSheet(sh, edits) {
    const cols = []; for (let c = 1; c < sh.cols.length; c++) cols.push(c);
    const cover = {}; const span = {}; sh.merges.forEach(m => { span[m.r1 + ':' + m.c1] = m; for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) cover[r + ':' + c] = true; });
    const top = {}; let acc = 22; for (let r = 1; r <= (sh.freezeRows || 0); r++) { top[r] = acc; if (sh.rows[r] && !sh.rows[r].hidden) acc += sh.rows[r].h; }
    const left = {}; let accL = 40; for (let c = 1; c <= (sh.freezeCols || 0); c++) { left[c] = accL; if (sh.cols[c] && !sh.cols[c].hidden) accL += sh.cols[c].w; }
    const grid = sh.gridlines ? '' : ' border-color:transparent;';
    let h = `<div style="position:relative"><table class="xls-table"><colgroup><col style="width:40px">${cols.map(c => `<col style="width:${sh.cols[c].hidden ? 0 : sh.cols[c].w}px${sh.cols[c].hidden ? ';visibility:collapse' : ''}">`).join('')}</colgroup><thead><tr><th class="rh"></th>${cols.map(c => `<th${sh.cols[c].hidden ? ' style="display:none"' : ''}${left[c] !== undefined ? ` style="position:sticky;left:${left[c]}px;z-index:3"` : ''}>${colName(c)}</th>`).join('')}</tr></thead><tbody>`;
    for (let r = 1; r < sh.rows.length; r++) { const R = sh.rows[r]; if (!R) continue; if (R.hidden) continue; const st = top[r] !== undefined ? `position:sticky;top:${top[r]}px;z-index:2;` : '';
      h += `<tr style="height:${R.h}px"><td class="rh" style="${st}">${r}</td>`;
      cols.forEach(c => { if (cover[r + ':' + c]) return; if (sh.cols[c].hidden) { h += '<td style="display:none"></td>'; return; } const addr = colName(c) + r; const x = sh.cells[addr]; const m = span[r + ':' + c]; const e = edits[addr];
        let rs = 1, cs = 1; if (m) { for (let rr = m.r1; rr <= m.r2; rr++) if (sh.rows[rr] && !sh.rows[rr].hidden) rs += 0; rs = m.r2 - m.r1 + 1 - Array.from({ length: m.r2 - m.r1 + 1 }, (_, k) => m.r1 + k).filter(rr => sh.rows[rr] && sh.rows[rr].hidden).length; cs = m.c2 - m.c1 + 1 - Array.from({ length: m.c2 - m.c1 + 1 }, (_, k) => m.c1 + k).filter(cc => sh.cols[cc] && sh.cols[cc].hidden).length; }
        const sticky = (st && 'background:#fff;') + (left[c] !== undefined ? `position:sticky;left:${left[c]}px;z-index:1;background:#fff;` : '');
        const text = e ? e.value : x ? x.text : ''; const title = [x && x.formula ? '=' + x.formula : '', x && x.note ? 'Note: ' + x.note : '', e ? 'Edited by ' + e.by + ' — original: ' + (x ? x.text : '') : ''].filter(Boolean).join('\n');
        h += `<td data-a="${addr}"${rs > 1 ? ` rowspan="${rs}"` : ''}${cs > 1 ? ` colspan="${cs}"` : ''} style="${grid}${sticky}${x ? esc(x.css) : ''}${e ? ';outline:2px solid #0a7aff;outline-offset:-2px;background-color:#eaf3ff' : ''}"${title ? ` title="${esc(title)}"` : ''}>${x && x.link && !e ? `<a href="${esc(/^(https?:|mailto:)/i.test(x.link) ? x.link : '#')}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : esc(text)}${x && x.note ? '<sup style="color:#d00">▾</sup>' : ''}</td>`; });
      h += '</tr>'; }
    h += `</tbody></table>${sh.images.map(im => `<img src="${im.src}" alt="" style="position:absolute;left:${im.x}px;top:${im.y}px;width:${im.w}px;height:${im.h}px;pointer-events:none">`).join('')}</div>`;
    return h;
  }
  V.xlsRenderSheet = renderSheet;
})(typeof window !== 'undefined' ? window : globalThis);
