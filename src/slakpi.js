/* KPIs & SLA matrix (stage 3, Solution design & BRD): where the team records what has to be tracked and how Facilio delivers it.
   Two mini tabs: SLA matrix (S.ws.slaMatrix: per module and priority, the response and resolution times, the business hours and up to three escalation levels)
   and KPI matrix (records of kind kpi: the definitions of the KPI workbooks, with the module and the solution, i.e. how Facilio delivers it).
   Import: a contract, SLA schedule or KPI sheet (docx, pdf, txt, csv, xlsx) or pasted text is read by the existing AI layer (route /slakpi/read, rules in work/server/_slakpi.mjs);
   it only SUGGESTS rows, a person ticks the ones to keep. Export: Excel (both sheets) or CSV of the open tab. Ask Claude opens Claude with the connector prompt.
   Both go into the Solution tab (area KPIs and SLA), the BRD (SLA matrix and KPIs sections), the draft UAT test cases, the FTR checklist and the Solution Document. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !F.S) return; const { S, esc } = F; const ACT = V.ACT; const I = () => V.items; const { drawer, closeDrawer, toast, confirmDialog } = V;
  const can = () => !V.isCustomer() && !S.readonly;
  const ui = () => S.ui.slk || (S.ui.slk = { tab: 'sla', found: null });
  const sla = () => (Array.isArray(S.ws.slaMatrix) ? S.ws.slaMatrix : []);
  const mods = () => F.allModules().filter(m => m.inScope).sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const modLabel = n => (!n || n === '*' ? 'General (all modules)' : ((F.moduleView(n) || {}).label || n));
  const escTxt = r => (r.esc || []).filter(e => e && (e.after || e.to)).map((e, i) => 'L' + (i + 1) + ' after ' + (e.after || '?') + ' to ' + (e.to || '?')).join('; ');
  const th = a => '<thead><tr>' + a.map(x => '<th>' + x + '</th>').join('') + '</tr></thead>';
  const slaRows = () => sla().slice().sort((a, b) => String(modLabel(a.module)).localeCompare(modLabel(b.module)) || String(a.priority).localeCompare(String(b.priority)));
  const kpiRows = () => I().list('kpi').sort((a, b) => String(a.group || '').localeCompare(b.group || '') || String(a.name || '').localeCompare(b.name || ''));
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const AGG0 = 'Ratio (numerator / denominator)';

  // ---------- what the matrix gives the solution and the BRD: which in-scope modules have an SLA row and a KPI ----------
  function coverage() {
    const ms = mods(), s = sla(), k = I().list('kpi'); const general = s.some(r => !r.module || r.module === '*');
    const noSla = general ? [] : ms.filter(m => !s.some(r => r.module === m.name)); const noKpi = ms.filter(m => !k.some(x => x.module === m.name));
    const noSol = k.filter(x => !String(x.solution || '').trim()); return { ms, noSla, noKpi, noSol, general };
  }
  function linkCard() {
    const c = coverage(); const k0 = I().list('kpi').length; const chip = (n, ok, bad) => '<span class="md-chip"' + (n ? '' : ' data-s="verified"') + '>' + (n ? n + ' ' + bad : ok) + '</span>';
    const names = a => a.length ? '<div class="xs muted" style="margin-top:4px">' + a.slice(0, 8).map(m => esc(m.label)).join(', ') + (a.length > 8 ? ' and ' + (a.length - 8) + ' more' : '') + '</div>' : '';
    return '<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>How this shapes the solution and the BRD</h3></div><div class="card-b"><p class="small" style="margin:0 0 10px">Each SLA row and KPI is the agreed promise. It flows into the Solution tab (area KPIs and SLA), the BRD sections SLA matrix and KPIs, the draft UAT test cases and the FTR checklist, so the team builds and tests exactly what was agreed.</p>'
      + '<div class="cs-cmd" style="margin-bottom:6px">' + chip(c.noSla.length, 'Every module has an SLA row', 'module' + (c.noSla.length === 1 ? '' : 's') + ' without an SLA row') + chip(c.noKpi.length, 'Every module has a KPI', 'module' + (c.noKpi.length === 1 ? '' : 's') + ' without a KPI') + (k0 ? chip(c.noSol.length, 'Every KPI has a solution', 'KPI' + (c.noSol.length === 1 ? '' : 's') + ' without how Facilio delivers it') : '<span class="md-chip">No KPI yet</span>') + '</div>'
      + (c.noSla.length ? '<div class="xs muted">No SLA row: ' + names(c.noSla).replace(/^<div[^>]*>|<\/div>$/g, '') + '</div>' : '')
      + '<div class="cs-cmd" style="margin-top:10px"><button type="button" class="btn sm" data-act="nav" data-view="solution">Open Solution</button><button type="button" class="btn sm" data-act="nav" data-view="brd">Open BRD</button><button type="button" class="btn sm" data-act="nav" data-view="ftr">Open FTR Report</button></div></div></div>';
  }

  // ---------- the two tabs ----------
  function slaCard() {
    const rows = slaRows();
    return '<div class="card"><div class="card-h"><h3>SLA matrix</h3><span class="small muted">' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + '</span>' + tools('sla') + '</div><div class="card-b">'
      + (rows.length ? '<div class="tbl-wrap"><table class="tbl">' + th(['Module', 'Priority', 'Response within', 'Resolution within', 'Business hours', 'Escalation', '']) + '<tbody>' + rows.map(r => '<tr><td><b>' + esc(modLabel(r.module)) + '</b></td><td>' + esc(r.priority) + '</td><td>' + esc(r.response) + '</td><td>' + esc(r.resolution) + '</td><td>' + esc(r.hours || '') + '</td><td class="small">' + esc(escTxt(r)) + '</td><td>' + (can() ? '<button class="btn sm" data-act="slaEdit" data-id="' + esc(r.id) + '">Edit</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="small muted" style="margin:0">No SLA row yet. Add one per module and priority, or press Import and choose the contract or SLA schedule: the AI reads it and suggests the rows for you to check.</p>') + '</div></div>';
  }
  function kpiCard() {
    const l = kpiRows();
    return '<div class="card"><div class="card-h"><h3>KPI matrix</h3><span class="small muted">' + l.length + ' KPI' + (l.length === 1 ? '' : 's') + '</span>' + tools('kpi') + '</div><div class="card-b">'
      + (l.length ? '<div class="tbl-wrap"><table class="tbl">' + th(['KPI', 'Module', 'Source data', 'Frequency', 'Target', 'How Facilio delivers it', '']) + '<tbody>' + l.map(k => '<tr><td><b>' + esc(k.name) + '</b><div class="xs muted">' + esc(k.group || '') + '</div></td><td>' + esc(modLabel(k.module)) + '</td><td class="small">' + esc(k.source || '') + '</td><td>' + esc(k.freq || '') + '</td><td>' + esc(k.target === undefined || k.target === null ? '' : k.target + (k.unit ? ' ' + k.unit : '')) + '</td><td class="small">' + (k.solution ? esc(k.solution) : '<span class="muted">Not written yet</span>') + '</td><td>' + (can() ? '<button class="btn sm" data-act="kpiEdit" data-id="' + esc(k.id) + '">Edit</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="small muted" style="margin:0">No KPI yet. Add the KPIs the customer wants to track, or press Import and choose the contract or KPI sheet. For each KPI write how Facilio delivers it (a dashboard, a report, a field or a formula).</p>') + '</div></div>';
  }
  function tools(which) {
    const add = which === 'sla' ? 'slaEdit' : 'kpiEdit';
    return '<span class="spacer"></span>' + (can() ? '<button class="btn sm primary" data-act="' + add + '">+ Add ' + (which === 'sla' ? 'SLA row' : 'KPI') + '</button><button class="btn sm" data-act="slkImport" data-want="' + which + '">Import</button>' : '')
      + '<button class="btn sm" data-act="slkExport" data-fmt="xlsx">Export Excel</button><button class="btn sm" data-act="slkExport" data-fmt="csv" data-want="' + which + '">Export CSV</button>'
      + (can() ? '<button class="btn sm" data-act="slkAsk" data-want="' + which + '">Ask Claude</button>' : '') + (which === 'kpi' ? '<button class="btn sm" data-act="nav" data-view="kpi">KPI workbooks</button>' : '');
  }
  V.slakpi = { html() {
    if (V.isCustomer()) return ''; I().load(['kpi']); const head = '<div class="page-header"><div class="t"><h1>KPIs &amp; SLA matrix</h1><p>What has to be tracked, and how Facilio delivers it. Written once here, it flows into the Solution tab, the BRD, the UAT test cases and the FTR checklist.</p></div></div>';
    if (!I().ready(['kpi'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const t = ui().tab === 'kpi' ? 'kpi' : 'sla'; const tk = (id, l, n) => '<button type="button" role="tab" class="tab' + (t === id ? ' active' : '') + '" aria-selected="' + (t === id) + '" data-act="slkTab" data-v="' + id + '">' + l + ' <span class="pt-shn">' + n + '</span></button>';
    return head + '<div class="page-body">' + linkCard() + '<div class="tabs pt-tabs" role="tablist" aria-label="Matrix">' + tk('sla', 'SLA matrix', sla().length) + tk('kpi', 'KPI matrix', I().list('kpi').length) + '</div>' + (t === 'kpi' ? kpiCard() : slaCard()) + '</div>';
  }, mount() { I().load(['kpi']); } };
  ACT.slkTab = a => { ui().tab = a.getAttribute('data-v') === 'kpi' ? 'kpi' : 'sla'; V.render(); };

  // ---------- export ----------
  const SLA_COLS = ['Module', 'Priority', 'Response within', 'Resolution within', 'Business hours', 'Escalation', 'Notes'], KPI_COLS = ['KPI', 'Group', 'Module', 'Description', 'Source data', 'Frequency', 'Unit', 'Target', 'How Facilio delivers it'];
  const slaTable = () => slaRows().map(r => [modLabel(r.module), r.priority, r.response, r.resolution, r.hours || '', escTxt(r), r.notes || '']);
  const kpiTable = () => kpiRows().map(k => [k.name, k.group || '', modLabel(k.module), k.description || '', k.source || '', k.freq || '', k.unit || '', k.target === undefined || k.target === null ? '' : k.target, k.solution || '']);
  const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const stamp = () => ((S.project && S.project.name) || 'project').replace(/[^\w-]+/g, '_').slice(0, 40) + '_' + new Date().toISOString().slice(0, 10);
  ACT.slkExport = a => V.busy(a, async () => {
    const fmt = a.getAttribute('data-fmt');
    if (fmt === 'csv') { const w = a.getAttribute('data-want') === 'kpi' ? 'kpi' : 'sla'; const cols = w === 'kpi' ? KPI_COLS : SLA_COLS, rows = w === 'kpi' ? kpiTable() : slaTable(); V.download((w === 'kpi' ? 'KPI_matrix_' : 'SLA_matrix_') + stamp() + '.csv', new Blob(['﻿' + [cols].concat(rows).map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' })); toast('Exported ' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + '.'); return; }
    const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); wb.creator = 'Facilio Delivery Studio';
    [['SLA matrix', SLA_COLS, slaTable(), [22, 14, 18, 18, 26, 36, 36]], ['KPI matrix', KPI_COLS, kpiTable(), [30, 18, 22, 40, 30, 12, 10, 10, 44]]].forEach(([n, cols, rows, w]) => { const ws = wb.addWorksheet(n); ws.columns = cols.map((h, i) => ({ header: h, key: h, width: w[i] })); rows.forEach(r => ws.addRow(r)); const h = ws.getRow(1); h.height = 24; h.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF24216F' } }; }); ws.eachRow(r => r.eachCell(c => { c.alignment = { vertical: 'top', wrapText: true }; })); ws.views = [{ state: 'frozen', ySplit: 1 }]; });
    V.download('KPI_and_SLA_matrix_' + stamp() + '.xlsx', new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); toast('Exported the SLA and KPI matrix.');
  });

  // ---------- import: a file or pasted text is read by the AI, the person ticks what to keep ----------
  const cellText = v => (v == null ? '' : typeof v === 'object' ? (v.result != null ? v.result : v.text != null ? v.text : (v.richText || []).map(t => t.text).join('')) : String(v));
  async function fileText(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xlsm') { const E = await V.loadExcelJS(); const wb = new E.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); return wb.worksheets.map(ws => { const l = ['Sheet: ' + ws.name]; ws.eachRow(r => l.push(r.values.slice(1).map(cellText).join(' | '))); return l.join('\n'); }).join('\n\n'); }
    const x = await V.extractDocPages(f, V.loadingMsg); return x.pages ? x.pages.map(p => p.text).join('\n') : String(x.text || '');
  }
  async function readText(text, fileName, want) {
    const r = await root.FWBApi.post('/api/projects/' + encodeURIComponent(S.project.id) + '/slakpi/read', { text, fileName, want, modules: mods().map(m => ({ name: m.name, label: m.label })) });
    ui().found = { sla: r.sla || [], kpis: r.kpis || [], file: fileName, want, truncated: !!r.truncated }; showFound();
  }
  ACT.slkImport = a => {
    if (!can()) return; const want = a.getAttribute('data-want') === 'kpi' ? 'kpi' : 'sla'; const what = want === 'kpi' ? 'KPIs' : 'SLA rows';
    drawer('Import ' + what, '<p class="small">Choose the contract, an SLA schedule, a KPI sheet or an e-mail (Word, PDF, Excel, CSV or text), or paste text, for example the answer Claude gave you. The AI reads it and <b>suggests</b> ' + what + '. Nothing is added until you tick the rows and press Add.</p>'
      + '<div class="cs-cmd"><button type="button" class="btn primary" data-act="slkPick" data-want="' + want + '">Choose a file</button></div><label class="f" for="slkPaste" style="margin-top:14px">Or paste text</label><textarea id="slkPaste" rows="7" maxlength="40000" placeholder="Paste a table or the clause here"></textarea>',
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="slkPasteGo" data-want="' + want + '">Read the pasted text</button>', {});
  };
  ACT.slkPick = a => V.busy(a, async () => {
    const fs = await V.pickFile('.docx,.pdf,.txt,.csv,.xlsx,.xlsm,.eml', false); const f = Array.isArray(fs) ? fs[0] : fs; if (!f) return; const want = a.getAttribute('data-want');
    V.loading(true, 'Reading ' + f.name + '…'); try { const t = await fileText(f); V.loadingMsg('The AI is reading it…'); await readText(t, f.name, want); } catch (e) { toast('Could not read it: ' + (e.message || 'error'), 8000, true); } finally { V.loading(false); }
  });
  ACT.slkPasteGo = a => V.busy(a, async () => { const t = ((document.getElementById('slkPaste') || {}).value || '').trim(); if (t.length < 40) { toast('Paste a little more text first.', 4000, true); return; } try { await readText(t, 'pasted text', a.getAttribute('data-want')); } catch (e) { toast('Could not read it: ' + (e.message || 'error'), 8000, true); } });
  function showFound() {
    const f = ui().found; if (!f) return; const n = f.sla.length + f.kpis.length;
    const body = !n ? '<p>The AI found no ' + (f.want === 'kpi' ? 'KPIs' : f.want === 'sla' ? 'SLA rows' : 'SLA rows or KPIs') + ' in ' + esc(f.file) + '. Try another file, or paste the clause.</p>'
      : '<p class="small muted">From ' + esc(f.file) + '. Untick what you do not want. A row with a note could not be matched to the document: check it first. An SLA row for a module and priority that exists is replaced; a KPI with the same name is skipped.' + (f.truncated ? ' Only the first part of a long file was read.' : '') + '</p>'
        + (f.sla.length ? '<h4 style="margin:12px 0 4px">SLA rows</h4><div class="tbl-wrap"><table class="tbl">' + th(['', 'Module', 'Priority', 'Response', 'Resolution', 'Hours / escalation']) + '<tbody>' + f.sla.map((r, i) => '<tr><td><input type="checkbox" checked data-slk-s="' + i + '" aria-label="Keep this row"></td><td>' + esc(modLabel(r.module)) + '</td><td>' + esc(r.priority) + '</td><td>' + esc(r.response) + '</td><td>' + esc(r.resolution) + '</td><td class="small">' + esc([r.hours, escTxt(r)].filter(Boolean).join('; ')) + (r.notes ? '<div class="xs md-warn">' + esc(r.notes) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '')
        + (f.kpis.length ? '<h4 style="margin:12px 0 4px">KPIs</h4><div class="tbl-wrap"><table class="tbl">' + th(['', 'KPI', 'Module', 'Source data', 'Frequency', 'Target', 'How Facilio delivers it']) + '<tbody>' + f.kpis.map((k, i) => '<tr><td><input type="checkbox" checked data-slk-k="' + i + '" aria-label="Keep this KPI"></td><td><b>' + esc(k.name) + '</b>' + (k.notes ? '<div class="xs md-warn">' + esc(k.notes) + '</div>' : '') + '</td><td>' + esc(modLabel(k.module)) + '</td><td class="small">' + esc(k.source) + '</td><td>' + esc(k.freq) + '</td><td>' + esc(k.target + (k.target !== '' && k.unit ? ' ' + k.unit : '')) + '</td><td class="small">' + esc(k.solution) + '</td></tr>').join('') + '</tbody></table></div>' : '');
    drawer('Suggested from the document', body, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button>' + (n ? '<button class="btn primary" data-act="slkAdd">Add the ticked rows</button>' : ''), { wide: true });
  }
  ACT.slkAdd = a => V.busy(a, async () => {
    const f = ui().found; if (!f || !can()) return; const on = k => [...document.querySelectorAll('[data-slk-' + k + ']')].filter(c => c.checked).map(c => Number(c.getAttribute('data-slk-' + k)));
    const sRows = on('s').map(i => f.sla[i]).filter(Boolean), kRows = on('k').map(i => f.kpis[i]).filter(Boolean); if (!sRows.length && !kRows.length) { toast('Nothing is ticked.'); return; }
    let cur = sla().slice(), repl = 0; sRows.forEach((r, i) => { const x = cur.findIndex(y => (y.module || '') === (r.module || '') && norm(y.priority) === norm(r.priority)); const row = Object.assign({}, r, { id: x >= 0 ? cur[x].id : 'sla_' + Date.now().toString(36) + i }); if (x >= 0) { cur[x] = row; repl++; } else cur.push(row); });
    if (sRows.length) { S.ws.slaMatrix = cur; F.changed('SLA rows imported', sRows.length + ' from ' + f.file); }
    const have = new Set(I().list('kpi').map(k => norm(k.name))); let addedK = 0; for (const k of kRows) { if (have.has(norm(k.name))) continue; have.add(norm(k.name)); await I().put('kpi', I().uid('kp'), { name: k.name, group: k.group, owner: '', freq: k.freq, agg: AGG0, target: k.target, unit: k.unit, description: k.description, source: k.source, formula: '', threshold: '', notes: k.notes ? k.notes : 'Imported from ' + f.file, module: k.module, solution: k.solution }); addedK++; }
    ui().found = null; closeDrawer(); toast(sRows.length + ' SLA row' + (sRows.length === 1 ? '' : 's') + (repl ? ' (' + repl + ' replaced)' : '') + ' and ' + addedK + ' KPI' + (addedK === 1 ? '' : 's') + ' added. Check them, then write how Facilio delivers each KPI.', 8000); V.render();
  });

  // ---------- Ask Claude: opens Claude with the connector prompt; the answer is pasted back through Import ----------
  ACT.slkAsk = a => V.busy(a, async () => {
    const want = a.getAttribute('data-want') === 'kpi' ? 'kpi' : 'sla'; const p = S.project || {}; const ms = mods().map(m => m.label).join(', ') || 'none marked in scope yet';
    const have = want === 'kpi' ? kpiRows().map(k => k.name + (k.target ? ' (target ' + k.target + (k.unit ? ' ' + k.unit : '') + ')' : '')).join('; ') : slaRows().map(r => modLabel(r.module) + ' ' + r.priority + ': respond ' + r.response + ', resolve ' + r.resolution).join('; ');
    const prompt = 'Use the Facilio Delivery Studio connector for the project "' + (p.name || '') + '"' + (p.customer ? ' (customer ' + p.customer + ')' : '') + '. Task: help me build the ' + (want === 'kpi' ? 'KPI matrix' : 'SLA matrix') + '. First read the contract (get_document msa_text), the agreed solution (get_document solutions) and the open requirements (get_requirements). In-scope modules: ' + ms + '. Already recorded: ' + (have || 'nothing') + '. '
      + (want === 'kpi' ? 'Propose the KPIs the customer asked for or the contract implies: name, group, module, source data, calculation, frequency, unit, target, and how Facilio delivers each (dashboard, report, field or formula). ' : 'Propose SLA rows per module and priority: response time, resolution time, business hours and up to three escalation levels. ')
      + 'Use only what the contract and the customer said; mark every assumption and every module with nothing written. Say which in-scope modules still have no ' + (want === 'kpi' ? 'KPI' : 'SLA row') + ' and what that means for the solution and the BRD. Reply with one table with these columns so I can paste it into the page with Import: ' + (want === 'kpi' ? KPI_COLS.join(' | ') : SLA_COLS.join(' | ')) + '.';
    const r = await V.claudeOpenSimple(prompt, { title: want === 'kpi' ? 'KPI matrix' : 'SLA matrix', page: 'KPIs & SLA matrix' }); toast(r.said, 7000);
  });

  // ---------- add and edit an SLA row ----------
  ACT.slaEdit = a => {
    if (!can()) return; const id = a.getAttribute('data-id'); const r = id ? sla().find(x => x.id === id) : { module: '', priority: '', response: '', resolution: '', hours: '', esc: [], notes: '' }; if (!r) return; const e = i => (r.esc || [])[i] || {};
    const lvl = i => '<div><label class="f">Level ' + (i + 1) + ': after</label><input type="text" id="sl_ea' + i + '" maxlength="40" value="' + esc(e(i).after || '') + '" placeholder="e.g. 30 min"></div><div><label class="f">Level ' + (i + 1) + ': goes to</label><input type="text" id="sl_er' + i + '" maxlength="80" value="' + esc(e(i).to || '') + '" placeholder="e.g. Supervisor"></div>';
    drawer(id ? 'Edit SLA row' : 'Add SLA row', '<div class="fgrid"><div><label class="f">Module</label><select id="sl_m"><option value="">General (all modules)</option>' + mods().map(m => '<option value="' + esc(m.name) + '"' + (r.module === m.name ? ' selected' : '') + '>' + esc(m.label) + '</option>').join('') + '</select></div><div><label class="f">Priority</label><input type="text" id="sl_p" maxlength="40" value="' + esc(r.priority) + '" placeholder="e.g. Critical"></div>'
      + '<div><label class="f">Response within</label><input type="text" id="sl_r" maxlength="60" value="' + esc(r.response) + '" placeholder="e.g. 30 minutes"></div><div><label class="f">Resolution within</label><input type="text" id="sl_s" maxlength="60" value="' + esc(r.resolution) + '" placeholder="e.g. 4 hours"></div><div class="full"><label class="f">Business hours</label><input type="text" id="sl_h" maxlength="120" value="' + esc(r.hours || '') + '" placeholder="e.g. 24x7, or Sun to Thu 8:00 to 17:00"></div></div>'
      + '<h4 style="margin:12px 0 4px">Escalation (optional)</h4><div class="fgrid">' + lvl(0) + lvl(1) + lvl(2) + '</div><label class="f">Notes</label><textarea id="sl_n" rows="2" maxlength="400">' + esc(r.notes || '') + '</textarea>',
      (id ? '<button class="btn danger" data-act="slaDel" data-id="' + esc(id) + '">Delete</button>' : '') + '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="slaSave" data-id="' + esc(id || '') + '">Save</button>', { wide: true });
  };
  ACT.slaSave = a => { if (!can()) return; const g = i => (document.getElementById(i) || {}).value || ''; if (!g('sl_p').trim() || !g('sl_r').trim() || !g('sl_s').trim()) { toast('Fill the priority, the response time and the resolution time.', 5000, true); return; }
    const id = a.getAttribute('data-id') || ('sla_' + Date.now().toString(36)); const row = { id, module: g('sl_m'), priority: g('sl_p').trim(), response: g('sl_r').trim(), resolution: g('sl_s').trim(), hours: g('sl_h').trim(), esc: [0, 1, 2].map(i => ({ after: g('sl_ea' + i).trim(), to: g('sl_er' + i).trim() })).filter(x => x.after || x.to), notes: g('sl_n').trim() };
    const list = sla().filter(x => x.id !== id).concat(row); S.ws.slaMatrix = list; F.changed('SLA row saved', modLabel(row.module) + ' ' + row.priority); closeDrawer(); V.render(); };
  ACT.slaDel = async a => { if (!can()) return; if (!(await confirmDialog('Delete SLA row', 'Remove this row from the matrix?', 'Delete', true))) return; S.ws.slaMatrix = sla().filter(x => x.id !== a.getAttribute('data-id')); F.changed('SLA row removed', ''); closeDrawer(); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
