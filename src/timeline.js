/* Plan Timeline: a structured project plan (rows with dates, owner, status, % done) that can be imported from the uploaded
   Excel plan, generated from the project dates, or edited by hand; Gantt chart, planned-vs-actual curve, plan versions,
   the 12-step process with a "current phase" strip on every page, an events list (next 45 days), and the notifications bell.
   Everything is computed from saved data; nothing is stored about history that was not recorded. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog, loading } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly;
  const TD = () => { const d = F.doc('plan_struct'); d.rows = d.rows || []; d.versions = d.versions || []; return d; };
  const OWN = ['Facilio', 'Customer', 'Both']; const ST = ['Not started', 'In progress', 'Blocked', 'Done'];
  const selId = (id, opts, val) => `<select id="${id}">${opts.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const D = s => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');

  // ---------- the 12 standard steps ----------
  const STD = ['Kick-Off', 'Workshops & Data Templates', 'BRD Sign-Off', 'Final Implementation Timeline', 'Implementation & Testing', 'Demo To UAT Users', 'UAT & Feedback', 'Feedback Incorporated', 'UAT Sign-Off', 'Training The Wider Team', 'Data Clean-Up', 'Go-Live & Hypercare'];
  const STEP_RE = [/kick.?off|project start/i, /workshop|data template|requirement (session|gathering)|discovery/i, /\bbrd\b|requirement.*sign/i, /final.*(timeline|plan)|implementation timeline|project plan/i, /implementation|configur|build|set.?up|internal test/i, /demo|handover|hand over/i, /\buat\b|user acceptance|feedback/i, /incorporat|feedback.*(fix|resol|appl)/i, /uat.*sign|sign.?off.*uat/i, /train/i, /clean.?up|migrat|data load|cut.?over/i, /go.?live|hyper.?care/i];
  const STEP_ORDER = [8, 2, 11, 3, 10, 9, 5, 0, 7, 1, 6, 4]; // most specific first
  const stepOfRow = t => { for (const i of STEP_ORDER) if (STEP_RE[i].test(t)) return i; return -1; };
  const titles = () => { const c = V.controls().steps; return Array.isArray(c) && c.length === 12 ? c : STD; };
  function stepInfo() {
    const rows = TD().rows.filter(r => !r.isPhase); const info = STD.map((t, i) => ({ i, title: titles()[i], start: '', end: '', n: 0 }));
    rows.forEach(r => { const i = stepOfRow(r.title + ' ' + (r.phase || '')); if (i < 0 || !D(r.start)) return; const x = info[i]; x.n++; if (!x.start || r.start < x.start) x.start = r.start; const e = D(r.end) || r.start; if (!x.end || e > x.end) x.end = e; });
    return info;
  }
  V.planSteps = stepInfo;
  function phaseNow() {
    const ph = V.controls().phase || {}; const info = stepInfo(); const today = V.today(); let cur = -1;
    if (ph.step >= 1 && ph.step <= 12) cur = ph.step - 1; else info.forEach(x => { if (x.start && x.start <= today) cur = Math.max(cur, x.i); });
    const dated = info.filter(x => x.start); const next = info.find(x => x.i > cur && x.start);
    return { cur, info, note: ph.note || '', forced: !!ph.step, next, hasPlan: dated.length > 0 };
  }
  V.phaseNow = phaseNow; V.STD_STEPS = STD;
  V.phaseStrip = () => { if (!S.project) return ''; const p = phaseNow(); if (!p.hasPlan && !p.forced) return '';
    const x = p.cur >= 0 ? p.info[p.cur] : null; const fd = d => (d ? V.fmtDate(d) : '');
    return `<div class="phase-strip" role="status"><span class="ps-l">Current phase</span>${x ? `<b>Step ${x.i + 1} of 12 · ${esc(x.title)}</b>${x.start ? `<span class="muted">${fd(x.start)}${x.end && x.end !== x.start ? ' – ' + fd(x.end) : ''}</span>` : ''}` : '<b>Not started</b>'}${p.next ? `<span class="muted">Next: ${esc(p.next.title)} · ${fd(p.next.start)}</span>` : ''}${p.note ? `<span class="ps-n">${esc(p.note)}</span>` : ''}<a href="#" data-act="nav" data-view="timeline" class="ps-a">Timeline</a></div>`; };

  // ---------- helpers ----------
  const days = (a, b) => V.daysBetween(a, b);
  const rowsAll = () => TD().rows.slice().sort((x, y) => (x.start || '9').localeCompare(y.start || '9') || 0);
  const wt = r => Math.max(1, (D(r.end) && D(r.start) ? days(r.start, r.end) : 0) + 1);
  const pctOf = r => (r.status === 'Done' ? 100 : Math.max(0, Math.min(100, Number(r.pct) || 0)));
  function stats() {
    const rows = TD().rows.filter(r => !r.isPhase && D(r.start)); const today = V.today(); let W = 0, A = 0, P = 0;
    rows.forEach(r => { const w = wt(r), e = D(r.end) || r.start; const f = today < r.start ? 0 : today >= e ? 1 : (days(r.start, today) + 1) / (days(r.start, e) + 1); W += w; A += w * pctOf(r) / 100; P += w * f; });
    const last = rows.reduce((m, r) => ((D(r.end) || r.start) > m ? (D(r.end) || r.start) : m), ''); const first = rows.reduce((m, r) => (!m || r.start < m ? r.start : m), '');
    const gl = rows.filter(r => /go.?live/i.test(r.title)).sort((a, b) => (a.start).localeCompare(b.start)).pop();
    return { n: rows.length, actual: W ? Math.round(100 * A / W) : 0, planned: W ? Math.round(100 * P / W) : 0, first, last, goLive: gl ? gl.start : last, late: rows.filter(r => r.status !== 'Done' && (D(r.end) || r.start) < today).length };
  }
  V.planStats = stats;
  V.planRows = () => TD().rows.map(r => ({ t: r.title, s: r.start, e: D(r.end) || r.start, top: !!r.isPhase }));

  // ---------- versions ----------
  function snapshot(label) { const d = TD(); d.versions.push({ at: new Date().toISOString(), label, by: (S.user && S.user.name) || '', rows: d.rows.map(r => ({ id: r.id, title: r.title, start: r.start, end: r.end })) }); if (d.versions.length > 30) d.versions.shift(); }
  const moved = () => { const d = TD(); const base = d.versions[0]; if (!base) return []; return d.rows.map(r => { const b = base.rows.find(x => x.id === r.id); if (!b || !D(r.start) || !D(b.start)) return null; const ds = days(b.start, r.start), de = D(r.end) && D(b.end) ? days(b.end, r.end) : ds; return ds || de ? { r, ds, de } : null; }).filter(Boolean); };
  function saveRows(rows, label) { const d = TD(); const first = !d.versions.length; if (first && d.rows.length) snapshot('Before ' + label); d.rows = rows; snapshot(label); F.changed('Plan updated', label, { section: 'plan_struct' }); }

  // ---------- import from the uploaded Excel plan, generate, edit ----------
  async function importFromFile() {
    const pd = F.doc('plan'); const cur = (pd.versions || []).find(v => v.fileId === pd.current) || (pd.versions || [])[0]; if (!cur) { toast('Upload the project plan on the Project Plan page first'); return; }
    if (/\.xls$/i.test(cur.name)) { toast('Only .xlsx and .xlsm plans can be read. Save the file as .xlsx first.'); return; }
    loading(true, 'Reading the plan…'); try {
      const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await (await V.fileBlob(cur.fileId)).arrayBuffer());
      const norm = v => String(v == null ? '' : (v.result !== undefined ? v.result : v.text !== undefined ? v.text : v.richText ? v.richText.map(x => x.text).join('') : v)).trim().toLowerCase();
      const toD = v => { if (v && v.result !== undefined) v = v.result; if (v instanceof Date) return v.toISOString().slice(0, 10); if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); const t = String(v || '').trim(); let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3]; m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); } const dd = Date.parse(t); return isNaN(dd) || !/[a-z]/i.test(t) ? '' : new Date(dd).toISOString().slice(0, 10); };
      let best = null;
      wb.worksheets.forEach(ws => { for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) { const map = {}; ws.getRow(r).eachCell({ includeEmpty: false }, (c, n) => { const t = norm(c.value); if (/^(task|task name|activity|name|milestone|description)\b/.test(t) && !map.t) map.t = n; else if (/^(start|start date|planned start|begin)/.test(t) && !map.s) map.s = n; else if (/^(end|end date|finish|planned end|due|due date)/.test(t) && !map.e) map.e = n; else if (/^(%|percent|% complete|progress|complete)/.test(t)) map.p = n; else if (/^status/.test(t)) map.st = n; else if (/^(owner|assigned|resource|responsible|assigned to|team)/.test(t)) map.o = n; });
        if (map.t && map.s && (!best || Object.keys(map).length > Object.keys(best.map).length)) best = { ws, hr: r, map }; } });
      if (!best) { toast('No task and start-date columns were found in the plan. Add rows by hand or check the header names.', 6000, true); return; }
      const { ws, hr, map } = best; const out = []; let phase = ''; const cname = String((S.project && S.project.customer) || '').toLowerCase().split(/\s+/)[0] || '';
      const level = row => (row.outlineLevel || 0) * 20 + Number((row.getCell(map.t).alignment || {}).indent || 0); const nextRow = r => { for (let k = r + 1; k <= Math.min(ws.rowCount, r + 6); k++) { const x = ws.getRow(k); if (String(x.getCell(map.t).text || '').trim()) return x; } return null; };
      for (let r = hr + 1; r <= ws.rowCount; r++) { const row = ws.getRow(r); const title = String(norm(row.getCell(map.t).value) ? (row.getCell(map.t).text || '').trim() : ''); if (!title) continue; const s = toD(row.getCell(map.s).value), e = map.e ? toD(row.getCell(map.e).value) : '';
        const ownRaw = map.o ? norm(row.getCell(map.o).value) : ''; const isC = /customer|client/.test(ownRaw) || (cname.length > 2 && ownRaw.includes(cname)); const owner = isC && /facilio/.test(ownRaw) ? 'Both' : isC ? 'Customer' : /facilio|implementation|consult/.test(ownRaw) ? 'Facilio' : ownRaw.includes(',') || ownRaw.includes('/') ? 'Both' : 'Facilio';
        let pc = map.p ? Number(String(row.getCell(map.p).value && row.getCell(map.p).value.result !== undefined ? row.getCell(map.p).value.result : row.getCell(map.p).value).replace('%', '')) : 0; if (!isNaN(pc) && pc > 0 && pc <= 1) pc = Math.round(pc * 100); if (isNaN(pc)) pc = 0;
        const stRaw = map.st ? norm(row.getCell(map.st).value) : ''; const status = /done|complete|closed/.test(stRaw) || pc >= 100 ? 'Done' : /block|hold|delay/.test(stRaw) ? 'Blocked' : /progress|started|ongoing|work/.test(stRaw) || pc > 0 ? 'In progress' : 'Not started';
        // a phase is a row whose next row sits deeper (Excel outline level or the task cell's indent)
        const nx = nextRow(r); const isPhase = !!nx && level(nx) > level(row); if (isPhase) { phase = title; out.push({ id: F.uid('tr'), title, phase: '', start: '', end: '', owner: 'Both', status: 'Not started', pct: 0, isPhase: true }); continue; }
        if (!s) continue; out.push({ id: F.uid('tr'), title: title.slice(0, 200), phase, start: s, end: e && e >= s ? e : s, owner, status, pct: status === 'Done' ? 100 : pc, ms: !e || e === s });
      }
      if (!out.length) { toast('No dated tasks were found in the plan', 6000, true); return; }
      saveRows(out, 'Imported from ' + cur.name); TD().sourceFile = cur.fileId; toast(out.filter(r => !r.isPhase).length + ' tasks imported'); V.render();
    } finally { loading(false); }
  }
  function generate() {
    const p = S.project; const start = D(p.startDate) || V.today(); const end = D(p.endDate) || V.addDays(start, 120); const span = Math.max(30, days(start, end)); const at = f => V.addDays(start, Math.round(span * f));
    const spec = [['Kick-Off', 0, 0.03, 'Both', true], ['Workshops & Data Templates', 0.03, 0.2, 'Both'], ['BRD draft and review', 0.2, 0.3, 'Facilio'], ['BRD Sign-Off', 0.3, 0.3, 'Customer', true], ['Final Implementation Timeline', 0.3, 0.33, 'Facilio'], ['Implementation & Testing', 0.33, 0.65, 'Facilio'], ['Demo To UAT Users', 0.65, 0.68, 'Facilio'], ['UAT & Feedback', 0.68, 0.8, 'Customer'], ['Feedback Incorporated', 0.8, 0.86, 'Facilio'], ['UAT Sign-Off', 0.86, 0.86, 'Customer', true], ['Training The Wider Team', 0.86, 0.92, 'Both'], ['Data Clean-Up', 0.88, 0.94, 'Customer'], ['Go-Live', 1, 1, 'Both', true]];
    saveRows(spec.map(([title, a, b, owner, ms]) => ({ id: F.uid('tr'), title, phase: '', start: at(a), end: at(b), owner, status: 'Not started', pct: 0, ms: !!ms })), 'Generated from project dates'); toast('A starting plan was generated from the project dates. Adjust the dates to match the real plan.', 6000); V.render();
  }
  ACT.tlImport = () => importFromFile().catch(e => toast(e.message || 'The plan could not be read', 6000, true));
  ACT.tlGen = async () => { if (TD().rows.length && !(await confirmDialog('Replace the plan rows', 'The current rows are replaced by a generated plan. The previous rows stay in the version list.', 'Replace'))) return; generate(); };
  ACT.tlRow = a => { const id = a.getAttribute('data-id'); const r = id ? TD().rows.find(x => x.id === id) : { title: '', phase: '', start: V.today(), end: V.today(), owner: 'Facilio', status: 'Not started', pct: 0 };
    drawer(id ? 'Edit task' : 'Add task', `<label class="f">Task</label><input type="text" id="tr_t" value="${esc(r.title)}"><div class="fgrid" style="margin-top:8px"><div><label class="f">Start</label><input type="date" id="tr_s" value="${esc(r.start)}"></div><div><label class="f">End</label><input type="date" id="tr_e" value="${esc(r.end)}"></div><div><label class="f">Owner</label>${selId('tr_o', OWN, r.owner)}</div><div><label class="f">Status</label>${selId('tr_st', ST, r.status)}</div><div><label class="f">% done</label><input type="number" id="tr_p" min="0" max="100" value="${esc(r.pct || 0)}"></div><div><label class="f">Group</label><input type="text" id="tr_g" value="${esc(r.phase || '')}"></div></div>`,
      `${id ? `<button class="btn danger" data-act="tlDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tlSave" data-id="${esc(id || '')}">Save</button>`); };
  ACT.tlSave = a => { const id = a.getAttribute('data-id'); const t = document.getElementById('tr_t').value.trim(); const s = document.getElementById('tr_s').value, e = document.getElementById('tr_e').value || s; if (!t || !s) { toast('Enter the task and a start date'); return; } if (e < s) { toast('The end date is before the start date'); return; }
    const d = TD(); const rec = { title: t, start: s, end: e, owner: document.getElementById('tr_o').value, status: document.getElementById('tr_st').value, pct: Number(document.getElementById('tr_p').value) || 0, phase: document.getElementById('tr_g').value.trim() }; if (rec.status === 'Done') rec.pct = 100; rec.ms = s === e;
    const rows = d.rows.map(r => Object.assign({}, r)); const cur = id && rows.find(r => r.id === id); if (cur) Object.assign(cur, rec); else rows.push(Object.assign({ id: F.uid('tr') }, rec));
    const dateChanged = !cur || cur.start !== s || cur.end !== e; if (dateChanged) saveRows(rows, (cur ? 'Dates changed: ' : 'Added: ') + t); else { d.rows = rows; F.changed('Plan task updated', t, { section: 'plan_struct' }); } closeDrawer(); V.render(); };
  ACT.tlDel = async a => { if (!(await confirmDialog('Delete task', 'Remove this task from the plan?', 'Delete', true))) return; const id = a.getAttribute('data-id'); saveRows(TD().rows.filter(r => r.id !== id), 'Task removed'); closeDrawer(); V.render(); };
  ACT.tlStatus = el => { const r = TD().rows.find(x => x.id === el.getAttribute('data-id')); if (!r) return; r.status = el.value; if (r.status === 'Done') r.pct = 100; F.changed('Plan task status', r.title + ' → ' + r.status, { section: 'plan_struct' }); V.render(); };
  ACT.tlVer = el => { S.ui.tlVer = el.value; V.render(); };
  ACT.tlPhase = a => { const c = F.doc('portal_controls'); c.phase = Object.assign({}, c.phase || {}); const cur = c.phase;
    drawer('Current phase', `<label class="f">Current step</label><select id="ph_s"><option value="0">Automatic, from the plan dates</option>${STD.map((t, i) => `<option value="${i + 1}" ${cur.step === i + 1 ? 'selected' : ''}>Step ${i + 1} · ${esc(t)}</option>`).join('')}</select><label class="f" style="margin-top:8px">Note shown on the strip (optional)</label><input type="text" id="ph_n" value="${esc(cur.note || '')}" maxlength="160"><label class="f" style="margin-top:8px">Step names (exactly 12 lines; leave as is for the standard names)</label><textarea id="ph_t" rows="12">${esc(titles().join('\n'))}</textarea>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tlPhaseSave">Save</button>`); };
  ACT.tlPhaseSave = () => { const c = F.doc('portal_controls'); const t = document.getElementById('ph_t').value.split('\n').map(x => x.trim()).filter(Boolean); if (t.length !== 12) { toast('Enter exactly 12 step names, one per line'); return; }
    c.phase = { step: Number(document.getElementById('ph_s').value) || 0, note: document.getElementById('ph_n').value.trim().slice(0, 160) }; if (!c.phase.step) delete c.phase.step; c.steps = t.join('|') === STD.join('|') ? null : t; if (!c.steps) delete c.steps; F.changed('Current phase updated', c.phase.step ? 'Step ' + c.phase.step : 'Automatic', { section: 'portal_controls' }); closeDrawer(); V.render(); };

  // ---------- the view ----------
  const ownCls = o => ({ Facilio: 'g-f', Customer: 'g-c', Both: 'g-b' }[o] || 'g-f');
  function gantt(rows) {
    const dated = rows.filter(r => D(r.start)); if (!dated.length) return ''; const min = dated.reduce((m, r) => (r.start < m ? r.start : m), '9'), max = dated.reduce((m, r) => ((D(r.end) || r.start) > m ? (D(r.end) || r.start) : m), ''); const span = Math.max(1, days(min, max) + 1); const today = V.today(); const pos = d => Math.max(0, Math.min(100, 100 * days(min, d) / span));
    const months = []; let c = min.slice(0, 7) + '-01'; while (c <= max) { months.push(c); const x = new Date(c + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 1); c = x.toISOString().slice(0, 10); }
    return `<div class="gantt"><div class="g-head"><div class="g-name"></div><div class="g-track">${months.map(m => `<span style="left:${pos(m < min ? min : m)}%">${new Date(m + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })}</span>`).join('')}</div></div>
      ${rows.map(r => { if (r.isPhase) return `<div class="g-row g-ph"><div class="g-name">${esc(r.title)}</div><div class="g-track"></div></div>`; if (!D(r.start)) return ''; const e = D(r.end) || r.start; const l = pos(r.start), w = Math.max(0.8, 100 * (days(r.start, e) + 1) / span); const late = r.status !== 'Done' && e < today;
        return `<div class="g-row" ${canEdit() ? `data-act="tlRow" data-id="${esc(r.id)}"` : ''}><div class="g-name" title="${esc(r.title)}">${esc(r.title)}</div><div class="g-track">${r.ms || r.start === e ? `<i class="g-ms ${ownCls(r.owner)}${late ? ' late' : ''}" style="left:${l}%" title="${esc(r.title)} · ${V.fmtDate(r.start)}"></i>` : `<i class="g-bar ${ownCls(r.owner)}${late ? ' late' : ''}" style="left:${l}%;width:${w}%" title="${esc(r.title)} · ${V.fmtDate(r.start)} – ${V.fmtDate(e)} · ${pctOf(r)}%"><b style="width:${pctOf(r)}%"></b></i>`}${today >= min && today <= max ? `<s class="g-today" style="left:${pos(today)}%"></s>` : ''}</div></div>`; }).join('')}</div>
      <div class="xs muted" style="margin-top:6px"><i class="lg g-f"></i>Facilio <i class="lg g-c"></i>Customer <i class="lg g-b"></i>Both <i class="lg late"></i>Late · the line is today</div>`;
  }
  function scurve(rows) {
    const rs = rows.filter(r => !r.isPhase && D(r.start)); if (rs.length < 2) return ''; const min = rs.reduce((m, r) => (r.start < m ? r.start : m), '9'), max = rs.reduce((m, r) => ((D(r.end) || r.start) > m ? (D(r.end) || r.start) : m), ''); const span = Math.max(1, days(min, max)); const W = rs.reduce((a, r) => a + wt(r), 0); const today = V.today();
    const planned = d => rs.reduce((a, r) => { const e = D(r.end) || r.start; const f = d < r.start ? 0 : d >= e ? 1 : (days(r.start, d) + 1) / (days(r.start, e) + 1); return a + wt(r) * f; }, 0) / W;
    const pts = []; for (let i = 0; i <= 40; i++) { const d = V.addDays(min, Math.round(span * i / 40)); pts.push([i / 40 * 560 + 30, 150 - planned(d) * 130]); }
    const st = stats(); const tx = today >= min && today <= max ? 30 + 560 * days(min, today) / span : null;
    const area = `M30,150 L${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L')} L590,150 Z`; const pNow = tx != null ? 150 - planned(today) * 130 : null; const aNow = 150 - st.actual * 1.3;
    const mo = []; { let c = min.slice(0, 7) + '-01'; while (c <= max) { if (c > min) mo.push(c); const x = new Date(c + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 1); c = x.toISOString().slice(0, 10); } }
    return `<svg viewBox="0 0 600 182" class="scurve" role="img" aria-label="Planned progress over time; today ${st.planned}% planned and ${st.actual}% actual">${[0, 25, 50, 75, 100].map(p => `<line x1="30" x2="590" y1="${150 - p * 1.3}" y2="${150 - p * 1.3}" stroke="#E7E5F0"/><text x="2" y="${153 - p * 1.3}" font-size="8.5" fill="#9A97AE" font-family="IBM Plex Mono, monospace">${p}%</text>`).join('')}
      <path d="${area}" fill="rgba(98,60,246,.07)"/><polyline fill="none" stroke="#623CF6" stroke-width="2.2" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>
      ${mo.map(m => `<text x="${(30 + 560 * days(min, m) / span).toFixed(1)}" y="166" font-size="8.5" fill="#6B6785" text-anchor="middle" font-family="IBM Plex Mono, monospace">${new Date(m + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</text>`).join('')}
      ${tx != null ? `<line x1="${tx}" x2="${tx}" y1="12" y2="150" stroke="#F26B1D" stroke-dasharray="3 3"/><text x="${tx + 4}" y="12" font-size="8.5" fill="#F26B1D" font-family="IBM Plex Mono, monospace">${esc(V.fmtDate(today))}</text><circle cx="${tx}" cy="${pNow}" r="4" fill="#fff" stroke="#623CF6" stroke-width="2"/><circle cx="${tx}" cy="${aNow}" r="4.5" fill="#12A35B"/><text x="${tx > 470 ? tx - 8 : tx + 8}" y="${pNow - 5}" font-size="10" font-weight="600" fill="#4B23E0" text-anchor="${tx > 470 ? 'end' : 'start'}">${st.planned}% planned</text><text x="${tx > 470 ? tx - 8 : tx + 8}" y="${aNow + (Math.abs(aNow - pNow) < 14 ? 14 : 4)}" font-size="10" font-weight="600" fill="#12A35B" text-anchor="${tx > 470 ? 'end' : 'start'}">${st.actual}% actual</text>` : ''}
      <text x="30" y="178" font-size="8.5" fill="#6B6785" font-family="IBM Plex Mono, monospace">${V.fmtDate(min)}</text><text x="590" y="178" font-size="8.5" fill="#6B6785" text-anchor="end" font-family="IBM Plex Mono, monospace">${V.fmtDate(max)}</text></svg><div class="pl-legend sm"><span><i class="pl-l-plan"></i>Planned progress (from the plan, duration-weighted)</span><span><i class="pl-l-act"></i>Actual progress (today only; earlier actuals are not recorded)</span></div>`;
  }
  // ---------- plan grid (layout from the delivery lead's artifact: one table with dates, status, plan / actual / variance and the bars) ----------
  const plannedPct = r => { const today = V.today(), e = D(r.end) || r.start; if (!D(r.start)) return 0; return Math.round(100 * (today < r.start ? 0 : today >= e ? 1 : (days(r.start, today) + 1) / (days(r.start, e) + 1))); };
  const isLate = r => r.status !== 'Done' && (D(r.end) || r.start) < V.today();
  function rollup(list) {   // dates, duration-weighted plan and actual for a set of tasks
    const ds = list.filter(r => D(r.start)); if (!ds.length) return null; const W = ds.reduce((a, r) => a + wt(r), 0);
    return { start: ds.reduce((m, r) => (r.start < m ? r.start : m), '9'), end: ds.reduce((m, r) => ((D(r.end) || r.start) > m ? (D(r.end) || r.start) : m), ''), plan: Math.round(ds.reduce((a, r) => a + wt(r) * plannedPct(r), 0) / W), actual: Math.round(ds.reduce((a, r) => a + wt(r) * pctOf(r), 0) / W),
      status: ds.every(r => r.status === 'Done') ? 'Done' : ds.some(r => r.status === 'Blocked') ? 'Blocked' : ds.some(r => r.status !== 'Not started' || pctOf(r) > 0) ? 'In progress' : 'Not started', late: ds.some(isLate), n: ds.length };
  }
  const ST_CHIP = { 'Done': ['Completed', 'g'], 'In progress': ['In progress', 'o'], 'Blocked': ['Blocked', 'r'], 'Not started': ['Not started', 'n'] };
  const chip = st => { const c = ST_CHIP[st] || ST_CHIP['Not started']; return `<span class="pl-chip ${c[1]}">${c[0]}</span>`; };
  const varTxt = (a, p) => { const v = a - p; return `<span class="pl-var${v < 0 ? ' neg' : v > 0 ? ' pos' : ''}">${v > 0 ? '+' : ''}${v}</span>`; };
  function planGrid(rows) {
    const tasks = rows.filter(r => !r.isPhase && D(r.start)); if (!tasks.length) return '';
    const all = rollup(tasks); const min = all.start, max = all.end, span = Math.max(1, days(min, max) + 1), today = V.today(); const pos = d => Math.max(0, Math.min(100, 100 * days(min, d) / span));
    const months = []; let c = min.slice(0, 7) + '-01'; while (c <= max) { months.push(c); const x = new Date(c + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 1); c = x.toISOString().slice(0, 10); }
    const todayMark = today >= min && today <= max ? `<s class="pl-today" style="left:${pos(today)}%"></s>` : '';
    const bar = (r, cls) => { const e = D(r.end) || r.start; if (r.ms || r.start === e) return `<i class="pl-ms${r.status === 'Done' ? ' done' : ''}" style="left:${pos(r.start)}%" title="${esc(r.title)} · ${V.fmtDate(r.start)}"></i>`; return `<i class="pl-bar ${cls}" style="left:${pos(r.start)}%;width:${Math.max(.8, 100 * (days(r.start, e) + 1) / span)}%" title="${esc(r.title || '')} · ${V.fmtDate(r.start)} – ${V.fmtDate(e)} · ${pctOf(r)}% done"><b style="width:${pctOf(r)}%"></b></i>`; };
    const cells = (x, name, sub, cls, extra) => `<tr class="${cls || ''}${x.late ? ' late' : ''}"${extra || ''}><td class="pl-task">${name}${sub ? `<small>${sub}</small>` : ''}</td><td class="num">${days(x.start, x.end) + 1}d</td><td class="num">${fmtS(x.start)}</td><td class="num">${fmtS(x.end)}</td><td>${x.chip || chip(x.status)}</td><td class="num">${x.plan}%</td><td class="num">${x.actual}%</td><td class="num">${varTxt(x.actual, x.plan)}</td><td class="pl-tl">${todayMark}${x.bar || ''}</td></tr>`;
    // tasks grouped under their phase, in plan order; tasks without a phase stay at the top level
    const groups = []; const byName = {}; rows.forEach(r => { if (r.isPhase) { if (!byName[r.title]) { byName[r.title] = { name: r.title, kids: [] }; groups.push(byName[r.title]); } } else if (D(r.start)) { const g = r.phase && (byName[r.phase] || (byName[r.phase] = (groups.push({ name: r.phase, kids: [] }), groups[groups.length - 1]))); if (g) g.kids.push(r); else groups.push({ task: r }); } });
    const open = S.ui.tlOpen || (S.ui.tlOpen = tasks.length <= 30 ? 'all' : {});
    let body = cells(Object.assign({}, all, { bar: `<i class="pl-bar sum" style="left:0;width:100%"><b style="width:${all.actual}%"></b></i>` }), `<b>${esc((S.project && S.project.name) || 'Project plan')}</b>`, `${groups.filter(g => !g.task).length} phases · ${tasks.length} tasks`, 'pl-sum');
    groups.forEach((g, gi) => {
      if (g.task) { const r = g.task; body += taskRow(r, false); return; }
      const ru = rollup(g.kids); if (!ru) return; const isOpen = open === 'all' || open[gi];
      body += cells(Object.assign({}, ru, { bar: `<i class="pl-bar ph" style="left:${pos(ru.start)}%;width:${Math.max(.8, 100 * (days(ru.start, ru.end) + 1) / span)}%"><b style="width:${ru.actual}%"></b></i>` }), `<button type="button" class="pl-tg" data-act="tlTog" data-k="${gi}" aria-expanded="${!!isOpen}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${esc(g.name)}">${ico('right')}</button><b>${esc(g.name)}</b>`, `${ru.n} task${ru.n === 1 ? '' : 's'}`, 'pl-ph');
      if (isOpen) g.kids.forEach(r => { body += taskRow(r, true); });
    });
    function taskRow(r, kid) { const x = { start: r.start, end: D(r.end) || r.start, status: r.status, plan: plannedPct(r), actual: pctOf(r), late: isLate(r), bar: bar(r, ownCls(r.owner)) };
      if (canEdit()) x.chip = `<label class="pl-sel ${(ST_CHIP[r.status] || ST_CHIP['Not started'])[1]}"><span class="sr-only">Status of ${esc(r.title)}</span><select data-change="tlStatus" data-id="${esc(r.id)}">${ST.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${(ST_CHIP[s] || [s])[0]}</option>`).join('')}</select></label>`;
      return cells(x, canEdit() ? `<a href="#" data-act="tlRow" data-id="${esc(r.id)}">${esc(r.title)}</a>` : `<span>${esc(r.title)}</span>`, esc(r.owner || ''), kid ? 'pl-kid' : ''); }
    return `<div class="pl-wrap"><table class="pl-grid"><thead><tr><th>Task</th><th>Days</th><th>Start</th><th>End</th><th>Status</th><th>Plan</th><th>Actual</th><th>Var</th><th class="pl-tl">${months.map(m => `<span style="left:${pos(m < min ? min : m)}%">${new Date(m + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })}</span>`).join('')}${todayMark ? `<em class="pl-tlab" style="left:${pos(today)}%">${esc(new Date(today + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }))}</em>` : ''}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  const fmtS = d => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
  ACT.tlTog = a => { const k = a.getAttribute('data-k'); let o = S.ui.tlOpen; if (o === 'all') { o = {}; document.querySelectorAll('[data-act="tlTog"]').forEach(b => { o[b.getAttribute('data-k')] = true; }); } o[k] = !o[k]; S.ui.tlOpen = o; V.render(); };
  ACT.tlAll = () => { const o = S.ui.tlOpen; S.ui.tlOpen = o === 'all' ? {} : 'all'; V.render(); };
  // three findings computed from the plan (wording only states what the data shows)
  function insights(rows, st) {
    const ts = rows.filter(r => !r.isPhase && D(r.start)); const done = ts.filter(r => r.status === 'Done').length, prog = ts.filter(r => r.status === 'In progress').length, blocked = ts.filter(r => r.status === 'Blocked').length;
    const gaps = ts.map(r => ({ r, g: plannedPct(r) - pctOf(r) })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 3); const late = ts.filter(isLate);
    const gv = st.actual - st.planned;
    return [
      ['ok', 'Status · ' + V.fmtDate(V.today()), `${st.actual}% actual against ${st.planned}% planned`, `${done} done, ${prog} in progress${blocked ? ', ' + blocked + ' blocked' : ''}, ${ts.length - done - prog - blocked} not started. ${gv < 0 ? 'The plan is ' + (-gv) + ' points behind.' : gv > 0 ? 'The plan is ' + gv + ' points ahead.' : 'The plan is on track.'}`],
      [gaps.length ? 'warn' : 'ok', 'Biggest gaps', gaps.length ? '' : 'No task is behind its plan.', gaps.map(x => `${x.r.title}: ${pctOf(x.r)}% done, ${plannedPct(x.r)}% planned`).join(' · ')],
      [late.length ? 'bad' : 'ok', 'Overdue', late.length ? `${late.length} task${late.length === 1 ? ' is' : 's are'} past the end date and not done` : 'Nothing is past its end date.', late.length ? late.slice(0, 4).map(r => r.title + ' (ended ' + V.fmtDate(D(r.end) || r.start) + ')').join(' · ') : (st.goLive ? 'Go-live is planned for ' + V.fmtDate(st.goLive) + '.' : '')]
    ].map(([k, t, b, d], i) => `<div class="pl-ins ${k}"><span class="pl-ins-n" aria-hidden="true">${i + 1}</span><h3>${esc(t)}</h3>${b ? `<b>${esc(b)}</b>` : ''}${d ? `<p>${esc(d)}</p>` : ''}</div>`).join('');
  }
  V.timeline = { html() {
    const d = TD(); const rows = d.rows; const p = phaseNow(); const st = stats(); const ver = d.versions; const mv = moved();
    const lead = rows.length ? `Status as of <b>${esc(V.fmtDate(V.today()))}</b> · ${st.n} dated tasks${ver.length ? ' · baseline saved ' + esc(V.fmtDate(ver[0].at.slice(0, 10))) : ''}.` : 'The project plan as dated tasks.';
    const head = `<div class="page-header"><div class="t"><h1>Plan vs actual</h1><p>${lead} ${cust() ? '' : 'Import it from the uploaded Excel plan, generate a starting plan, or add tasks by hand.'}</p></div><div class="row">${canEdit() ? `<button class="btn" data-act="tlPhase">Current phase</button><button class="btn" data-act="tlImport">${ico('upl')}Import from the uploaded plan</button><button class="btn" data-act="tlGen">Generate a starting plan</button><button class="btn primary" data-act="tlRow">${ico('plus')}Add task</button>` : ''}</div></div>`;
    if (!rows.length) return head + `<div class="page-body"><div class="card empty"><h3>No dated plan yet</h3><p>${cust() ? 'Your implementation team will publish the plan here.' : 'Upload the customer plan on Project Plan, then import it here, or generate a starting plan from the project dates.'}</p></div></div>`;
    const gv = st.actual - st.planned; const noStatus = rows.filter(r => !r.isPhase && D(r.start) && r.status === 'Not started' && !Number(r.pct)).length;
    const kpis = `<div class="pl-kpis"><div><span>Planned by today</span><b>${st.planned}%</b></div><div><span>Actual</span><b>${st.actual}%</b></div><div><span>Variance</span><b class="${gv < 0 ? 'neg' : gv > 0 ? 'pos' : ''}">${gv > 0 ? '+' : ''}${gv} pts</b></div><div><span>Go-live</span><b>${st.goLive ? esc(V.fmtDate(st.goLive)) : '—'}</b><small>${st.late ? st.late + ' task' + (st.late === 1 ? '' : 's') + ' late' : 'Nothing late'}</small></div></div>`;
    const steps = `<section class="card"><div class="card-h"><h3>The 12-step process</h3></div><div class="card-b"><ol class="steps12">${p.info.map(x => `<li class="${x.i === p.cur ? 'now' : x.i < p.cur ? 'past' : ''}"><span class="n">${x.i + 1}</span><span class="t">${esc(x.title)}</span><span class="d">${x.start ? V.fmtDate(x.start) + (x.end && x.end !== x.start ? ' – ' + V.fmtDate(x.end) : '') : 'No dates yet'}</span>${x.i === p.cur ? '<b class="here">We are here</b>' : ''}</li>`).join('')}</ol></div></section>`;
    const sel = S.ui.tlVer && ver[+S.ui.tlVer] ? ver[+S.ui.tlVer] : ver[0];
    const compare = ver.length ? `<section class="card"><div class="card-h"><h3>Plan versions</h3>${ver.length > 1 ? `<select data-change="tlVer" style="width:260px" aria-label="Compare with version">${ver.map((v, i) => `<option value="${i}" ${v === sel ? 'selected' : ''}>${esc(new Date(v.at).toLocaleDateString())} · ${esc(v.label)}</option>`).join('')}</select>` : ''}</div><div class="card-b small">Baseline: ${esc(new Date(ver[0].at).toLocaleString())} · ${esc(ver[0].label)}. ${ver.length} version(s) saved; one is saved whenever dates change.
      ${mv.length ? `<div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>Task</th><th>Baseline</th><th>Now</th><th>Moved</th></tr></thead><tbody>${mv.slice(0, 40).map(m => { const b = ver[0].rows.find(x => x.id === m.r.id); return `<tr><td><b>${esc(m.r.title)}</b></td><td class="small">${V.fmtDate(b.start)} – ${V.fmtDate(b.end)}</td><td class="small">${V.fmtDate(m.r.start)} – ${V.fmtDate(m.r.end)}</td><td>${m.de ? tag(m.de > 0 ? 'red' : 'green', (m.de > 0 ? '+' : '') + m.de + ' d') : tag('tbc', (m.ds > 0 ? '+' : '') + m.ds + ' d')}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="muted" style="margin-top:6px">No task has moved from the baseline.</div>'}</div></section>` : '';
    return head + `<div class="page-body pl-page">${kpis}
      ${noStatus ? `<div class="notice warn small">${noStatus} of ${st.n} tasks have no status or % complete yet, so they count as not started and pull the actual figure down. Update them in the table below.</div>` : ''}
      <section class="pl-sec"><div class="pl-sec-h"><div><p class="pl-eyebrow">Timeline</p><h2>Timeline &amp; planning</h2></div><div class="pl-legend"><span><i class="g-f"></i>Facilio</span><span><i class="g-c"></i>Customer</span><span><i class="g-b"></i>Both</span><span><i class="ms"></i>Milestone</span><span><i class="lt"></i>Late</span><span><i class="td"></i>Today</span><button class="btn sm" data-act="tlAll">${S.ui.tlOpen === 'all' ? 'Collapse all' : 'Expand all'}</button></div></div>${planGrid(rowsAll())}</section>
      <section class="card pl-curve"><div class="card-h"><h3>Progress S-curve</h3></div><div class="card-b">${scurve(rowsAll())}</div></section>
      <div class="pl-insights">${insights(rowsAll(), st)}</div>
      ${steps}${compare}</div>`;
  }, mount() { } };

  // ---------- events engine (next days, from saved data only) ----------
  V.events = function (opts) {
    opts = opts || {}; const from = opts.from || V.today(), to = V.addDays(from, opts.days || 45); const out = []; const show = V.custShow;
    TD().rows.filter(r => !r.isPhase && D(r.start) && r.status !== 'Done').forEach(r => { const mile = r.ms || /sign.?off|go.?live|kick.?off|demo|handover|training|uat|workshop/i.test(r.title); if (mile && r.start >= from && r.start <= to) out.push({ date: r.start, type: /demo|training|uat|workshop|kick/i.test(r.title) ? 'meeting' : 'milestone', title: r.title, side: r.owner, view: 'timeline' }); });
    ((F.doc('planner').sessions) || []).forEach(s => { if (s.date && s.date >= from && s.date <= to && !['cancelled', 'completed'].includes(s.status)) out.push({ date: s.date, type: 'meeting', title: 'Workshop: ' + (s.title || 'Session ' + (s.no || '')), side: 'Both', view: 'planner' }); });
    const sch = F.doc('schedule_published'); ((sch && sch.sessions) || []).forEach(s => { if (cust() && s.date && s.date >= from && s.date <= to) out.push({ date: s.date, type: 'meeting', title: 'Workshop: ' + (s.title || 'Session ' + (s.no || '')), side: 'Both', view: 'schedule' }); });
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status !== 'Done' && a.due && a.due >= from && a.due <= to) out.push({ date: a.due, type: 'action', title: a.text, side: a.side === 'customer' ? 'Customer' : 'Facilio', view: 'overview' }); });
    const cad = (V.controls().cadence || ''); const kick = (stepInfo()[0] || {}).start; if (cad && kick) { const gap = { weekly: 7, fortnightly: 14, monthly: 30, quarterly: 91 }[cad]; if (gap) for (let d = V.addDays(kick, gap); d <= to; d = V.addDays(d, gap)) if (d >= from) out.push({ date: d, type: 'meeting', title: 'Governance meeting', side: 'Both', view: 'governance' }); }
    if (V.contractEvents && show('fees')) out.push(...V.contractEvents(from, to));
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };

  // ---------- home blocks: open items by side, next 45 days, needs attention ----------
  function itemCounts(side) { const today = V.today(); const l = I().list('action').filter(a => (a.side || 'facilio') === side); const o = { open: 0, delayed: 0, closed: 0, late: 0 }; l.forEach(a => { if (a.status === 'Done') { o.closed++; if (a.due && a.doneAt && a.doneAt.slice(0, 10) > a.due) o.late++; } else { o.open++; if (a.due && a.due < today) o.delayed++; } }); return o; }
  function attention() {
    const out = []; const c = cust();
    if (I().ready(['signoff'])) I().list('signoff').forEach(s => { if (c && s.status === 'requested') out.push({ t: 'Sign-off waiting for your signature: ' + (s.title || s.kind || 'document'), view: 'governance' }); if (!c && s.status === 'concern') out.push({ t: 'Concern raised on ' + (s.title || s.kind || 'a sign-off'), view: 'governance' }); });
    if (I().ready(['cr'])) I().list('cr').forEach(r => { if (c && r.status === 'Proposed') out.push({ t: `Change request CR-${String(r.n || '').padStart(3, '0')} needs your approval`, view: 'changes' }); if (!c && r.status === 'Requested') out.push({ t: `Change request CR-${String(r.n || '').padStart(3, '0')} needs an estimate`, view: 'changes' }); });
    if (I().ready(['onb'])) I().list('onb').forEach(o => { if (c && o.status === 'fix') out.push({ t: 'Data sheet needs fixes: ' + o.sheet, view: 'onboarding' }); if (!c && o.status === 'sent') out.push({ t: 'Data sheet sent for validation: ' + o.sheet, view: 'onboarding' }); });
    if (I().ready(['raid'])) I().list('raid').filter(r => r.status !== 'Closed' && /high/i.test(r.impact || '')).slice(0, 3).forEach(r => out.push({ t: 'Open high-impact ' + (r.type === 'I' ? 'issue' : 'risk') + ': ' + r.title, view: 'governance' }));
    return out;
  }
  V.attentionItems = attention;
  // the plan rows of one delivery stage (artifact UAT / Go-live tabs): KPI strip and the matching tasks from the Plan Timeline
  const STAGE_STEPS = { build: [4], uat: [5, 6, 7, 8], golive: [9, 10, 11] };
  V.planStage = kind => {
    const want = STAGE_STEPS[kind]; if (!want) return ''; const label = { build: 'build and internal testing', uat: 'UAT', golive: 'go-live, training and hypercare' }[kind];
    const rows = TD().rows.filter(r => !r.isPhase && D(r.start) && want.includes(stepOfRow(r.title) >= 0 ? stepOfRow(r.title) : stepOfRow(r.phase || ''))   /* the task's own title decides first; its phase only when the title says nothing */).sort((a, b) => a.start.localeCompare(b.start));
    if (!rows.length) return `<div class="notice small" style="margin-bottom:14px">The Plan Timeline has no ${esc(label)} tasks yet. ${canEdit() ? '<a href="#" data-act="nav" data-view="timeline">Add them on the Plan Timeline</a> to see their dates and progress here.' : ''}</div>`;
    const ru = rollup(rows); const ver = TD().versions; const gv = ru.actual - ru.plan;
    return `<section class="pl-stage"><div class="sec-k" style="margin-top:0"><p>From the project plan</p><h2>${esc({ build: 'Build in the plan', uat: 'UAT in the plan', golive: 'Go-live in the plan' }[kind])}</h2></div>
      <div class="pl-kpis"><div><span>Planned</span><b>${ru.plan}%</b></div><div><span>Actual</span><b>${ru.actual}%</b></div><div><span>Variance</span><b class="${gv < 0 ? 'neg' : gv > 0 ? 'pos' : ''}">${gv > 0 ? '+' : ''}${gv} pts</b></div><div><span>Source</span><b class="sm">${ver.length ? 'Plan Timeline' : 'Plan Timeline (no baseline yet)'}</b><small>${esc(V.fmtDate(ru.start))} – ${esc(V.fmtDate(ru.end))}</small></div></div>
      <div class="card" style="margin-top:12px"><div class="tbl-wrap"><table class="tbl pl-st"><thead><tr><th>Task</th><th>Owner</th><th>Start</th><th>End</th><th>Status</th><th>Plan</th><th>Actual</th><th>Var</th><th>Progress</th></tr></thead><tbody>${rows.map(r => { const pl = plannedPct(r), ac = pctOf(r); return `<tr class="${isLate(r) ? 'late' : ''}"><td><b>${esc(r.title)}</b></td><td>${esc(r.owner || '')}</td><td class="num">${fmtS(r.start)}</td><td class="num">${fmtS(D(r.end) || r.start)}</td><td>${chip(r.status)}</td><td class="num">${pl}%</td><td class="num">${ac}%</td><td class="num">${varTxt(ac, pl)}</td><td><span class="pl-pb"><i style="width:${ac}%"></i></span></td></tr>`; }).join('')}</tbody></table></div></div></section>`;
  };
  // calendar tile (artifact pattern): coloured month band over the day number
  const dTile = (d, cls) => { if (!D(d)) return `<span class="dtile tbd${cls ? ' ' + cls : ''}" aria-hidden="true"><i>TBD</i><b>–</b></span>`; const x = new Date(d + 'T00:00:00Z'); return `<span class="dtile${cls ? ' ' + cls : ''}" aria-hidden="true"><i>${x.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</i><b>${x.getUTCDate()}</b></span>`; };
  V.dTile = dTile;
  const inDays = d => { const n = days(V.today(), d); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? 'in ' + n + ' days' : -n + ' days ago'; };
  V.homeExtra = () => {
    I().load(['action', 'signoff', 'cr', 'onb', 'raid']); if (!I().ready(['action'])) return '';
    const today = V.today(); const sc = (S.project && S.project.customer) || 'Customer';
    // who owes what: open actions per side, soonest first, with the existing counts underneath
    const owes = (side, label, icon) => { const c = itemCounts(side); const open = I().list('action').filter(a => a.status !== 'Done' && (a.side || 'facilio') === side).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
      return `<section class="card owes ${side}"><header><span class="owes-ic" aria-hidden="true">${ico(icon)}</span><h3>${esc(label)}</h3><span class="owes-n">${c.open} open</span></header>
        ${open.length ? `<ul class="owes-l">${open.slice(0, 5).map(a => { const late = a.due && a.due < today; return `<li><span class="owes-box${a.status === 'Blocked' ? ' blk' : ''}" aria-hidden="true"></span><a href="#" data-act="nav" data-view="governance">${esc(a.text || 'Untitled action')}<small>${esc([a.owner, a.status !== 'Open' ? a.status : ''].filter(Boolean).join(' · '))}</small></a><span class="owes-due${late ? ' late' : ''}">${a.due ? esc(new Date(a.due + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })) : 'No date'}</span></li>`; }).join('')}</ul>${open.length > 5 ? `<a class="owes-more" href="#" data-act="nav" data-view="governance">${open.length - 5} more in Governance</a>` : ''}` : '<p class="owes-none">Nothing open.</p>'}
        <div class="owes-c"><span><b>${c.delayed}</b> delayed</span><span><b>${c.closed}</b> closed</span><span><b>${c.late}</b> closed late</span></div></section>`; };
    const ev = V.events({ days: 45 }).slice(0, 8); const at = attention(); const up = ev.slice(0, 3);
    const kind = e => (e.type === 'milestone' ? 'Milestone' : e.type === 'action' ? 'Action' : 'Meeting');
    return `${up.length ? `<section class="upnext" aria-labelledby="upnextH"><div><p class="upnext-k">Up next</p><h2 id="upnextH">The next ${up.length === 1 ? 'thing' : up.length + ' things'}</h2></div><div class="upnext-l">${up.map(e => `<button type="button" class="upnext-i" data-act="nav" data-view="${e.view}">${dTile(e.date, e.type)}<span><small>${esc(kind(e))} · ${esc(inDays(e.date))}</small><b>${esc(e.title)}</b>${e.side ? `<em>${esc(e.side === 'Customer' ? sc : e.side)}</em>` : ''}</span></button>`).join('')}</div></section>` : ''}
      <div class="sec-k"><p>Action items</p><h2>Who owes what</h2><span>Open actions for each side, soonest first.</span></div>
      <div class="grid g2" style="margin-bottom:16px">${owes('customer', sc, 'home')}${owes('facilio', 'Facilio', 'flag')}</div>
      ${at.length ? `<div class="card attention" style="margin-bottom:16px"><div class="card-h"><h3>Needs attention</h3></div><div class="card-b">${at.slice(0, 8).map(x => `<div class="list-item" data-act="nav" data-view="${x.view}">${esc(x.t)}</div>`).join('')}</div></div>` : ''}
      <div class="sec-k"><p>Calendar</p><h2>Upcoming activities</h2><span>Next 45 days: milestones, workshops and actions from the plan and governance records.</span></div>
      <div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Next 45 days</h3><button class="btn sm" data-act="nav" data-view="timeline">Timeline</button></div>${ev.length ? `<ul class="cal-l">${ev.map(e => `<li data-act="nav" data-view="${e.view}" tabindex="0" role="link">${dTile(e.date, e.type)}<span><b>${esc(e.title)}</b><small>${esc(kind(e))}${e.side ? ' · ' + esc(e.side === 'Customer' ? sc : e.side) : ''} · ${esc(inDays(e.date))}</small></span></li>`).join('')}</ul>` : '<div class="card-b small muted">Nothing scheduled in the next 45 days.</div>'}</div>`;
  };

  // ---------- notifications bell (computed from saved data; read state is per browser) ----------
  const rk = () => 'fwb_notif_read_' + (S.project && S.project.id) + '_' + ((S.user && S.user.id) || '');
  const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(rk()) || '[]')); } catch (e) { return new Set(); } };
  function notifications() {
    const out = []; const mine = V.side(); const today = V.today(); const c = cust(); const mk = (id, kind, text, view, tone) => out.push({ id, kind, text, view, tone: tone || '' });
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status === 'Done' || !a.due || (a.side || 'facilio') !== mine) return; const dd = days(today, a.due); if (dd < 0) mk('act-od-' + a.id, 'rem', `Action overdue (${-dd} d): ${a.text}`, 'overview', 'late'); else if (dd <= 3) mk('act-soon-' + a.id, 'rem', `Action due ${dd === 0 ? 'today' : 'in ' + dd + ' d'}: ${a.text}`, 'overview'); });
    attention().forEach((x, i) => mk('att-' + x.t, 'rem', x.t, x.view));
    V.events({ days: 2 }).forEach(e => mk('ev-' + e.date + e.title, 'rem', `${V.fmtDate(e.date)} · ${e.title}`, e.view));
    if (V.contractKeyDates) V.contractKeyDates(30).forEach(k => mk('kd-' + k.id, 'rem', k.text, 'contract', k.late ? 'late' : ''));
    const cut = Date.now() - 14 * 864e5; const kinds = { action: 'Action', raid: 'RAID item', signoff: 'Sign-off', cr: 'Change request', decision: 'Decision', minutes: 'Meeting minutes', onbsub: 'Data workbook' };
    Object.keys(kinds).forEach(k => { if (!I().ready([k])) return; I().list(k).forEach(it => { if (!it._at || new Date(it._at).getTime() < cut || it._side === mine) return; mk('act-' + k + it.id + it._v, 'act', `${kinds[k]} updated by ${it._side === 'customer' ? (S.project.customer || 'the customer') : 'Facilio'}: ${it.title || it.text || it.fileName || it.kind || ''}`.trim(), { action: 'overview', raid: 'governance', signoff: 'governance', cr: 'changes', decision: 'governance', minutes: 'governance', onbsub: 'onboarding' }[k]); }); });
    return out;
  }
  V.notifications = notifications;
  V.bellHtml = () => { if (!S.project || !S.user) return ''; I().load(['action', 'signoff', 'cr', 'onb', 'raid', 'decision', 'minutes', 'onbsub']); const rs = readSet(); const n = notifications().filter(x => !rs.has(x.id)).length; return `<button class="bell" data-act="bellOpen" aria-label="Notifications${n ? ', ' + n + ' unread' : ''}">${ico('bell')}${n ? `<span class="bell-n">${n > 9 ? '9+' : n}</span>` : ''}</button>`; };
  ACT.bellOpen = () => { const all = notifications(); const rs = readSet(); const tab = S.ui.bellTab || 'all'; const list = all.filter(x => tab === 'all' || x.kind === tab);
    const body = `<div class="ob-tabs" style="margin-bottom:8px">${[['all', 'All'], ['rem', 'Reminders'], ['act', 'Activity']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="bellTab" data-v="${k}">${l}</button>`).join('')}</div>${list.length ? list.map(x => `<div class="list-item notif ${rs.has(x.id) ? 'read' : ''} ${x.tone}" data-act="bellGo" data-v="${esc(x.view)}" data-id="${esc(x.id)}">${rs.has(x.id) ? '' : '<i class="dot"></i>'}${esc(x.text)}</div>`).join('') : '<div class="muted">Nothing new.</div>'}`;
    drawer('Notifications', body, `<button class="btn" data-act="bellRead">Mark all as read</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`); };
  ACT.bellTab = a => { S.ui.bellTab = a.getAttribute('data-v'); ACT.bellOpen(); };
  ACT.bellGo = a => { const rs = readSet(); rs.add(a.getAttribute('data-id')); try { localStorage.setItem(rk(), JSON.stringify([...rs].slice(-400))); } catch (e) { } closeDrawer(); V.go ? V.go(a.getAttribute('data-v')) : ACT.nav(a); };
  ACT.bellRead = () => { const rs = readSet(); notifications().forEach(x => rs.add(x.id)); try { localStorage.setItem(rk(), JSON.stringify([...rs].slice(-400))); } catch (e) { } closeDrawer(); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
