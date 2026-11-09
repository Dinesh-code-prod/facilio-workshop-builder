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
  V.planSteps = stepInfo; V.planStepOf = r => stepOfRow((r.title || '') + ' ' + (r.phase || ''));
  function phaseNow() {
    const ph = V.controls().phase || {}; const info = stepInfo(); const today = V.today(); let cur = -1;
    if (ph.step >= 1 && ph.step <= 12) cur = ph.step - 1; else info.forEach(x => { if (x.start && x.start <= today) cur = Math.max(cur, x.i); });
    const dated = info.filter(x => x.start); const next = info.find(x => x.i > cur && x.start);
    return { cur, info, note: ph.note || '', forced: !!ph.step, next, hasPlan: dated.length > 0 };
  }
  V.phaseNow = phaseNow; V.STD_STEPS = STD;
  // the eight-stage roadmap of the menu; each of the 12 plan steps belongs to one stage (keep in step with work/server/_portfolio.mjs)
  const ROADMAP = { 1: 'Project introduction', 2: 'Requirement sessions', 3: 'Solution design & BRD', 4: 'UAT & FTR', 5: 'Training guides', 7: 'Hypercare', 8: 'Project handover' }; const STAGE_OF_STEP = [1, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 7]; V.stageOfStep = i => STAGE_OF_STEP[i] || 0; V.roadmapName = n => ROADMAP[n] || '';
  V.phaseStrip = () => { if (!S.project) return ''; const p = phaseNow(); if (!p.hasPlan && !p.forced) return '';
    const x = p.cur >= 0 ? p.info[p.cur] : null; const fd = d => (d ? V.fmtDate(d) : '');
    return `<div class="phase-strip" role="status"><span class="ps-l">Current phase</span>${x ? `<b>Stage ${STAGE_OF_STEP[x.i]} · ${esc(ROADMAP[STAGE_OF_STEP[x.i]])}</b><span class="muted">Plan step ${x.i + 1} of 12 · ${esc(x.title)}</span>${x.start ? `<span class="muted">${fd(x.start)}${x.end && x.end !== x.start ? ' – ' + fd(x.end) : ''}</span>` : ''}` : '<b>Not started</b>'}${p.next ? `<span class="muted">Next: ${esc(p.next.title)} · ${fd(p.next.start)}</span>` : ''}${p.note ? `<span class="ps-n">${esc(p.note)}</span>` : ''}<a href="#" data-act="nav" data-view="timeline" class="ps-a">Timeline</a></div>`; };

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
      const { ws, hr, map } = best; const out = []; let phase = ''; const cwords = String((S.project && S.project.customer) || '').toLowerCase().split(/[^a-z0-9\u0600-\u06ff]+/).filter(w => w.length > 3 && !/^(group|company|holding|holdings|limited|llc|facilities|services|international|the)$/.test(w));
      const level = row => (row.outlineLevel || 0) * 20 + Number((row.getCell(map.t).alignment || {}).indent || 0); const nextRow = r => { for (let k = r + 1; k <= Math.min(ws.rowCount, r + 6); k++) { const x = ws.getRow(k); if (String(x.getCell(map.t).text || '').trim()) return x; } return null; };
      for (let r = hr + 1; r <= ws.rowCount; r++) { const row = ws.getRow(r); const title = String(norm(row.getCell(map.t).value) ? (row.getCell(map.t).text || '').trim() : ''); if (!title) continue; const s = toD(row.getCell(map.s).value), e = map.e ? toD(row.getCell(map.e).value) : '';
        const ownRaw = map.o ? norm(row.getCell(map.o).value) : ''; const isC = /customer|client/.test(ownRaw) || cwords.some(w => ownRaw.includes(w)); const owner = isC && /facilio/.test(ownRaw) ? 'Both' : isC ? 'Customer' : /facilio|implementation|consult/.test(ownRaw) ? 'Facilio' : ownRaw.includes(',') || ownRaw.includes('/') ? 'Both' : 'Facilio';
        let pc = map.p ? Number(String(row.getCell(map.p).value && row.getCell(map.p).value.result !== undefined ? row.getCell(map.p).value.result : row.getCell(map.p).value).replace('%', '')) : 0; if (!isNaN(pc) && pc > 0 && pc <= 1) pc = Math.round(pc * 100); if (isNaN(pc)) pc = 0;
        const stRaw = map.st ? norm(row.getCell(map.st).value) : ''; const status = /done|complete|closed/.test(stRaw) || pc >= 100 ? 'Done' : /block|hold|delay/.test(stRaw) ? 'Blocked' : /progress|started|ongoing|work/.test(stRaw) || pc > 0 ? 'In progress' : 'Not started';
        // a phase is a row whose next row sits deeper (Excel outline level or the task cell's indent)
        const nx = nextRow(r); const isPhase = !!nx && level(nx) > level(row); if (isPhase) { phase = title; out.push({ id: F.uid('tr'), title, phase: '', start: '', end: '', owner: 'Both', status: 'Not started', pct: 0, isPhase: true }); continue; }
        if (!s) continue; out.push({ id: F.uid('tr'), title: title.slice(0, 200), phase, start: s, end: e && e >= s ? e : s, owner, status, pct: status === 'Done' ? 100 : pc, ms: !e || e === s });
      }
      if (!out.length) { toast('No dated tasks were found in the plan', 6000, true); return; }
      // a new version of a plan that is already on the timeline is merged, not replaced: tasks still in the plan keep their id and their progress, and the message says what changed, including the current stage
      const stageNow = () => { const p = phaseNow(); return p.cur >= 0 ? 'Stage ' + STAGE_OF_STEP[p.cur] + ' · ' + ROADMAP[STAGE_OF_STEP[p.cur]] : ''; }; const before = stageNow(); const PM = root.FWBPlanMerge; const had = TD().rows.length;
      const m = had && PM ? PM.merge(TD().rows, out, { sheetHasProgress: !!(map.p || map.st) }) : null; saveRows(m ? m.rows : out, 'Imported from ' + cur.name); TD().sourceFile = cur.fileId;
      toast((m ? PM.sentence(m.summary, before, stageNow()) : out.filter(r => !r.isPhase).length + ' tasks imported') + (phaseNow().forced ? ' The current phase is fixed by hand, so the stage did not follow the new dates: clear it in the phase strip to follow the plan.' : ''), 9000); V.render();
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
    drawer(id ? 'Edit task' : 'Add task', `<label class="f">Task</label><input type="text" id="tr_t" value="${esc(r.title)}"><div class="fgrid" style="margin-top:8px"><div><label class="f">Start</label><input type="date" id="tr_s" value="${esc(r.start)}"></div><div><label class="f">End</label><input type="date" id="tr_e" value="${esc(r.end)}"></div><div><label class="f">Owner</label>${selId('tr_o', OWN, r.owner)}</div><div><label class="f">Status</label>${selId('tr_st', ST, r.status)}</div><div><label class="f">% done</label><input type="number" id="tr_p" min="0" max="100" value="${esc(r.pct || 0)}"></div><div><label class="f">Group</label><input type="text" id="tr_g" value="${esc(r.phase || '')}"></div></div>${V.tlDeps ? V.tlDeps.field(r, id) : ''}`,
      `${id ? `<button class="btn danger" data-act="tlDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tlSave" data-id="${esc(id || '')}">Save</button>`); };
  ACT.tlSave = a => { const id = a.getAttribute('data-id'); const t = document.getElementById('tr_t').value.trim(); const s = document.getElementById('tr_s').value, e = document.getElementById('tr_e').value || s; if (!t || !s) { toast('Enter the task and a start date'); return; } if (e < s) { toast('The end date is before the start date'); return; }
    const d = TD(); const rec = { title: t, start: s, end: e, owner: document.getElementById('tr_o').value, status: document.getElementById('tr_st').value, pct: Number(document.getElementById('tr_p').value) || 0, phase: document.getElementById('tr_g').value.trim() }; if (rec.status === 'Done') rec.pct = 100; rec.actual = rec.status === 'Done' ? ((d.rows.find(x => x.id === id) || {}).actual || V.today()) : undefined; rec.ms = s === e; if (V.tlDeps && V.tlDeps.has()) rec.dep = V.tlDeps.read();
    const rows = d.rows.map(r => Object.assign({}, r)); const cur = id && rows.find(r => r.id === id); if (cur) Object.assign(cur, rec); else rows.push(Object.assign({ id: F.uid('tr') }, rec));
    if (rec.dep) { const me = cur || rows[rows.length - 1]; if (!rec.dep.length) delete me.dep; const test = rows.map(x => (x.id === me.id ? Object.assign({}, x, { dep: [] }) : x)); if (rec.dep.some(p => V.tlDeps.wouldLoop(test, p, me.id))) { toast('A link would make a loop. Untick the task that already waits for this one.', 6000, true); return; } if (S.ui.tlFollow !== false) rec.dep.forEach(p => V.tlDeps.reschedule(rows, p)); }
    const dateChanged = !cur || cur.start !== s || cur.end !== e; if (dateChanged) saveRows(rows, (cur ? 'Dates changed: ' : 'Added: ') + t); else { d.rows = rows; F.changed('Plan task updated', t, { section: 'plan_struct' }); } closeDrawer(); V.render(); };
  ACT.tlDel = async a => { if (!(await confirmDialog('Delete task', 'Remove this task from the plan?', 'Delete', true))) return; const id = a.getAttribute('data-id'); saveRows(TD().rows.filter(r => r.id !== id), 'Task removed'); closeDrawer(); V.render(); };
  ACT.tlStatus = el => { const r = TD().rows.find(x => x.id === el.getAttribute('data-id')); if (!r) return; r.status = el.value; if (r.status === 'Done') { r.pct = 100; if (!r.actual) r.actual = V.today(); } else delete r.actual; F.changed('Plan task status', r.title + ' → ' + r.status, { section: 'plan_struct' }); V.render(); };
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
  // ---------- working calendar: the weekend pattern and holidays used for work days, shifting and the Days column ----------
  const WKEND = { sat: ['Saturday and Sunday', [6, 0]], fri: ['Friday and Saturday', [5, 6]], sun: ['Sunday only', [0]], fri1: ['Friday only', [5]] };
  const cal = () => { const d = TD(); d.cal = d.cal || {}; return d.cal; };
  const dowOf = s => new Date(s + 'T00:00:00Z').getUTCDay();
  const isWork = s => { const c = cal(); const we = (WKEND[c.weekend] || WKEND.sat)[1]; return !we.includes(dowOf(s)) && !(c.holidays || []).some(h => h.d === s); };
  const workDays = (a, b) => { let n = 0; if (!D(a) || !D(b) || b < a || days(a, b) > 3660) return 0; for (let x = a; x <= b; x = V.addDays(x, 1)) if (isWork(x)) n++; return n; };
  const addWork = (s, n) => { let x = s, k = Math.abs(n); const sg = n < 0 ? -1 : 1; while (k > 0) { x = V.addDays(x, sg); if (isWork(x)) k--; } return x; };
  const PX = { day: 28, week: 10, month: 3.4 };
  const scaleOf = () => (PX[S.ui.tlScale] ? S.ui.tlScale : 'week');
  const baseOf = id => { const b = (TD().versions || [])[0]; const x = b && b.rows.find(r => r.id === id); return x && D(x.start) ? x : null; };
  function planGrid(rows) {
    const tasks = rows.filter(r => !r.isPhase && D(r.start)); if (!tasks.length) return '';
    const all = rollup(tasks); const min = V.addDays(all.start, -2), max = V.addDays(all.end, 3), span = Math.max(1, days(min, max) + 1), today = V.today(); const px = PX[scaleOf()]; const TW = Math.round(span * px); const pos = d => Math.round(days(min, d) * px * 10) / 10;
    const months = []; let c = min.slice(0, 7) + '-01'; while (c <= max) { months.push(c); const x = new Date(c + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + 1); c = x.toISOString().slice(0, 10); }
    const todayMark = today >= min && today <= max ? `<s class="pl-today" style="left:${pos(today)}px"></s>` : '';
    const edit = canEdit();
    const bar = (r, cls) => { const e = D(r.end) || r.start; if (r.ms || r.start === e) return `<i class="pl-ms${r.status === 'Done' ? ' done' : ''}" data-id="${esc(r.id)}" style="left:${pos(r.start) + px / 2}px" title="${esc(r.title)} · ${V.fmtDate(r.start)}"></i>`; return `<i class="pl-bar ${cls}" data-id="${esc(r.id)}" style="left:${pos(r.start)}px;width:${Math.max(px, (days(r.start, e) + 1) * px)}px" title="${esc(r.title || '')} · ${V.fmtDate(r.start)} – ${V.fmtDate(e)} · ${pctOf(r)}% done"><b style="width:${pctOf(r)}%"></b>${edit ? '<u class="pl-h" aria-hidden="true"></u>' : ''}</i>`; };
    const ghost = r => { if (!S.ui.tlBase) return ''; const b = baseOf(r.id); if (!b) return ''; const be = D(b.end) || b.start; const e = D(r.end) || r.start; if (b.start === r.start && be === e) return ''; return `<i class="pl-base" style="left:${pos(b.start)}px;width:${Math.max(px / 2, (days(b.start, be) + 1) * px)}px" title="Baseline: ${V.fmtDate(b.start)} – ${V.fmtDate(be)}"></i>`; };
    const cells = (x, name, sub, cls, extra) => `<tr class="${cls || ''}${x.late ? ' late' : ''}"${extra || ''}><td class="pl-task">${name}${sub ? `<small>${sub}</small>` : ''}</td><td class="num" title="${days(x.start, x.end) + 1} calendar days">${workDays(x.start, x.end)}d</td><td class="num">${fmtS(x.start)}</td><td class="num">${fmtS(x.end)}</td><td>${x.chip || chip(x.status)}</td><td class="num">${x.plan}%</td><td class="num">${x.actual}%</td><td class="num">${varTxt(x.actual, x.plan)}</td><td class="pl-tl">${todayMark}${x.ghost || ''}${x.bar || ''}</td></tr>`;
    const groups = []; const byName = {}; rows.forEach(r => { if (r.isPhase) { if (!byName[r.title]) { byName[r.title] = { name: r.title, kids: [] }; groups.push(byName[r.title]); } } else if (D(r.start)) { const g = r.phase && (byName[r.phase] || (byName[r.phase] = (groups.push({ name: r.phase, kids: [] }), groups[groups.length - 1]))); if (g) g.kids.push(r); else groups.push({ task: r }); } });
    const open = S.ui.tlOpen || (S.ui.tlOpen = tasks.length <= 30 ? 'all' : {});
    let body = cells(Object.assign({}, all, { bar: `<i class="pl-bar sum" style="left:${pos(all.start)}px;width:${Math.max(px, (days(all.start, all.end) + 1) * px)}px"><b style="width:${all.actual}%"></b></i>` }), `<b>${esc((S.project && S.project.name) || 'Project plan')}</b>`, `${groups.filter(g => !g.task).length} phases · ${tasks.length} tasks`, 'pl-sum');
    groups.forEach((g, gi) => {
      if (g.task) { body += taskRow(g.task, false); return; }
      const ru = rollup(g.kids); if (!ru) return; const isOpen = open === 'all' || open[gi];
      body += cells(Object.assign({}, ru, { bar: `<i class="pl-bar ph" style="left:${pos(ru.start)}px;width:${Math.max(px, (days(ru.start, ru.end) + 1) * px)}px"><b style="width:${ru.actual}%"></b></i>` }), `<button type="button" class="pl-tg" data-act="tlTog" data-k="${gi}" aria-expanded="${!!isOpen}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${esc(g.name)}">${ico('right')}</button><b>${esc(g.name)}</b>`, `${ru.n} task${ru.n === 1 ? '' : 's'}`, 'pl-ph');
      if (isOpen) g.kids.forEach(r => { body += taskRow(r, true); });
    });
    function taskRow(r, kid) { const x = { start: r.start, end: D(r.end) || r.start, status: r.status, plan: plannedPct(r), actual: pctOf(r), late: isLate(r), bar: bar(r, ownCls(r.owner)), ghost: ghost(r) };
      if (edit) x.chip = `<label class="pl-sel ${(ST_CHIP[r.status] || ST_CHIP['Not started'])[1]}"><span class="sr-only">Status of ${esc(r.title)}</span><select data-change="tlStatus" data-id="${esc(r.id)}">${ST.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${(ST_CHIP[s] || [s])[0]}</option>`).join('')}</select></label>`;
      return cells(x, edit ? `<a href="#" data-act="tlRow" data-id="${esc(r.id)}">${esc(r.title)}</a>` : `<span>${esc(r.title)}</span>`, esc(r.owner || ''), kid ? 'pl-kid' : ''); }
    const dayTicks = scaleOf() === 'day' ? Array.from({ length: Math.min(span, 700) }, (_, i) => { const d = V.addDays(min, i); return `<em class="pl-dt${isWork(d) ? '' : ' we'}" style="left:${pos(d)}px;width:${px}px">${Number(d.slice(8))}</em>`; }).join('') : '';
    return `<div class="pl-wrap${edit ? ' pl-edit' : ''}"><table class="pl-grid" data-min="${min}" data-px="${px}" style="--pl-w:${TW}px;--pl-wk:${px * 7}px"><thead><tr><th>Task</th><th>Work days</th><th>Start</th><th>End</th><th>Status</th><th>Plan</th><th>Actual</th><th>Var</th><th class="pl-tl">${months.map(m => `<span style="left:${pos(m < min ? min : m)}px">${new Date(m + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })}</span>`).join('')}${dayTicks}${todayMark ? `<em class="pl-tlab" style="left:${pos(today)}px">${esc(new Date(today + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }))}</em>` : ''}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  // ----- drag a bar to move it, drag its right edge to change the end; Shift also moves every later task -----
  function applyDrag(id, mode, dd, cascade) {
    const rows = TD().rows.map(r => Object.assign({}, r)); const r = rows.find(x => x.id === id); if (!r) return; const s0 = r.start, e0 = D(r.end) || r.start;
    if (mode === 'resize') { let e1 = V.addDays(e0, dd); if (e1 < s0) e1 = s0; r.end = e1; r.ms = r.start === r.end; }
    else { const mv = x => { const xs = x.start, xe = D(x.end) || x.start; x.start = V.addDays(xs, dd); x.end = V.addDays(xe, dd); }; mv(r); if (cascade) rows.forEach(x => { if (x !== r && !x.isPhase && D(x.start) && x.start > s0) mv(x); }); }
    if (V.tlDeps) V.tlDeps.follow(rows, id);   // tasks that wait for this one move with it
    saveRows(rows, 'Dates changed: ' + r.title + (cascade && mode === 'move' ? ' and later tasks' : '')); V.render();
  }
  V.tlApi = { TD, saveRows, canEdit: () => canEdit() };   // for src/tldeps.js (dependency lines)
  V.planGanttMount = function () {
    const wrap = document.querySelector('.pl-wrap'); const t = document.querySelector('.pl-grid'); if (!wrap || !t) return; const min = t.dataset.min, px = Number(t.dataset.px);
    const toToday = () => { const x = days(min, V.today()) * px; wrap.scrollLeft = Math.max(0, x - wrap.clientWidth * 0.45); };
    if (S.ui.tlScroll == null) toToday(); else wrap.scrollLeft = S.ui.tlScroll; wrap.addEventListener('scroll', () => { S.ui.tlScroll = wrap.scrollLeft; }); S.ui.tlGoToday = toToday;
    if (!canEdit()) return;
    t.addEventListener('pointerdown', e => { const el = e.target.closest('.pl-bar[data-id], .pl-ms[data-id]'); if (!el || e.button) return; const r = TD().rows.find(x => x.id === el.dataset.id); if (!r) return; e.preventDefault();
      const resize = !!e.target.closest('.pl-h'); const x0 = e.clientX; const l0 = parseFloat(el.style.left), w0 = parseFloat(el.style.width) || 0; let dd = 0; try { el.setPointerCapture(e.pointerId); } catch (x) { } el.classList.add('drag');
      const tip = document.createElement('div'); tip.className = 'pl-tip'; document.body.appendChild(tip); const e0 = D(r.end) || r.start;
      const move = ev => { dd = Math.round((ev.clientX - x0) / px); if (resize) el.style.width = Math.max(px, w0 + dd * px) + 'px'; else el.style.left = (l0 + dd * px) + 'px';
        const s1 = resize ? r.start : V.addDays(r.start, dd); let e1 = V.addDays(e0, dd); if (resize && e1 < s1) e1 = s1; tip.textContent = (s1 === e1 ? V.fmtDate(s1) : V.fmtDate(s1) + ' – ' + V.fmtDate(e1)) + (dd ? ' (' + (dd > 0 ? '+' : '') + dd + ' d)' : '') + (ev.shiftKey && !resize ? ' · later tasks move too' : ''); tip.style.left = ev.clientX + 14 + 'px'; tip.style.top = ev.clientY - 34 + 'px'; };
      const up = ev => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); tip.remove(); el.classList.remove('drag'); if (dd) applyDrag(r.id, resize ? 'resize' : 'move', dd, ev.shiftKey); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); move(e); });
  };
  ACT.tlScale = a => { S.ui.tlScale = a.getAttribute('data-v'); S.ui.tlScroll = null; V.render(); };
  ACT.tlToday = () => { if (S.ui.tlGoToday) S.ui.tlGoToday(); };
  ACT.tlBase = el => { S.ui.tlBase = el.checked; V.render(); };
  ACT.tlShift = () => drawer('Shift tasks', `<p class="small muted" style="margin-top:0">Moves every dated task that starts on or after the date below. The old dates stay in the plan versions and the baseline.</p><div class="fgrid"><div><label class="f">From this date</label><input type="date" id="sh_f" value="${esc(V.today())}"></div><div><label class="f">Move by (days, negative to go earlier)</label><input type="number" id="sh_n" value="1" step="1"></div><div class="full"><label class="f">Count</label><select id="sh_u"><option value="w">Working days (uses the working calendar)</option><option value="c">Calendar days</option></select></div></div><div class="small muted" id="sh_p" style="margin-top:10px"></div>`,
    `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tlShiftGo">Shift</button>`);
  ACT.tlShiftGo = () => { const f = document.getElementById('sh_f').value, n = Math.trunc(Number(document.getElementById('sh_n').value) || 0), u = document.getElementById('sh_u').value; if (!D(f)) { V.ui ? V.ui.field('sh_f', 'Choose a date') : toast('Choose a date'); return; } if (!n) { V.ui ? V.ui.field('sh_n', 'Enter a number other than zero') : toast('Enter a number'); return; }
    const mv = d => (u === 'w' ? addWork(d, n) : V.addDays(d, n)); let k = 0; const rows = TD().rows.map(r => { const x = Object.assign({}, r); if (!x.isPhase && D(x.start) && x.start >= f) { const e = D(x.end) || x.start; x.start = mv(x.start); x.end = mv(e); k++; } return x; });
    if (!k) { toast('No task starts on or after that date'); return; } saveRows(rows, `Shifted ${k} task${k === 1 ? '' : 's'} by ${n} ${u === 'w' ? 'working ' : ''}day${Math.abs(n) === 1 ? '' : 's'} from ${f}`); closeDrawer(); toast(k + ' task' + (k === 1 ? '' : 's') + ' shifted'); V.render(); };
  ACT.tlCal = () => { const c = cal(); drawer('Working calendar', `<p class="small muted" style="margin-top:0">Used for the Work days column and for shifting by working days.</p><label class="f">Weekend</label><select id="cl_w">${Object.entries(WKEND).map(([k, v]) => `<option value="${k}"${(c.weekend || 'sat') === k ? ' selected' : ''}>${v[0]}</option>`).join('')}</select><label class="f" style="margin-top:10px">Holidays (one per line: date, then an optional name, for example 2026-12-02 National Day)</label><textarea id="cl_h" rows="8">${esc((c.holidays || []).map(h => h.d + (h.n ? ' ' + h.n : '')).join('\n'))}</textarea>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tlCalSave">Save</button>`); };
  ACT.tlCalSave = () => { const hol = []; const bad = []; document.getElementById('cl_h').value.split('\n').map(x => x.trim()).filter(Boolean).forEach(l => { const m = /^(\d{4}-\d{2}-\d{2})\s*(.*)$/.exec(l); if (m) hol.push({ d: m[1], n: m[2].slice(0, 60) }); else bad.push(l); }); if (bad.length) { V.ui ? V.ui.field('cl_h', 'Start each line with a date like 2026-12-02: ' + bad[0].slice(0, 30)) : toast('Check the holiday dates'); return; }
    const c = cal(); c.weekend = document.getElementById('cl_w').value; c.holidays = hol.sort((a, b) => a.d.localeCompare(b.d)); F.changed('Working calendar updated', '', { section: 'plan_struct' }); closeDrawer(); V.render(); };
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
  // the Timeline & planning grid with its KPIs, shared by Plan Timeline and the Project Plan tab
  const custName = () => { const c = String((S.project && S.project.customer) || '').trim(); return c ? c.split(/\s+/).slice(0, 2).join(' ') : 'Customer'; };
  V.timelinePanel = inPlanPage => {
    const rows = TD().rows; const st = stats();
    if (!rows.length) return `<div class="card empty"><h3>No dated plan yet</h3><p>${cust() ? 'Your implementation team will publish the plan here.' : 'Build the timeline from the uploaded Excel plan, or generate a starting plan from the project dates.'}</p>${canEdit() && !cust() ? `<div class="row" style="justify-content:center"><button class="btn primary" data-act="tlImport">${ico('upl')}Build from the uploaded plan</button><button class="btn" data-act="tlGen">Generate a starting plan</button><button class="btn" data-act="tlRow">${ico('plus')}Add task</button></div>` : ''}</div>`;
    const sc = scaleOf(); const tools = `<div class="pl-tools"><div class="kb-seg" role="group" aria-label="Timeline scale">${[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([v, l]) => `<button type="button" class="${sc === v ? 'on' : ''}" data-act="tlScale" data-v="${v}" aria-pressed="${sc === v}">${l}</button>`).join('')}</div><button class="btn sm" data-act="tlToday">Go to today</button>${TD().versions.length ? `<label class="chk small"><input type="checkbox" data-change="tlBase"${S.ui.tlBase ? ' checked' : ''}> Show baseline</label>` : ''}${canEdit() ? `<button class="btn sm" data-act="tlShift">Shift tasks…</button><button class="btn sm" data-act="tlCal">Working calendar</button><span class="xs muted">Drag a bar to move it, drag its right end to change the end date. Hold Shift to move every later task too.</span>` : ''}</div>`;
    const gv = st.actual - st.planned; const noStatus = rows.filter(r => !r.isPhase && D(r.start) && r.status === 'Not started' && !Number(r.pct)).length;
    const kpis = `<div class="pl-kpis"><div><span>Planned by today</span><b>${st.planned}%</b></div><div><span>Actual</span><b>${st.actual}%</b></div><div><span>Variance</span><b class="${gv < 0 ? 'neg' : gv > 0 ? 'pos' : ''}">${gv > 0 ? '+' : ''}${gv} pts</b></div><div><span>Go-live</span><b>${st.goLive ? esc(V.fmtDate(st.goLive)) : '—'}</b><small>${st.late ? st.late + ' task' + (st.late === 1 ? '' : 's') + ' late' : 'Nothing late'}</small></div></div>`;
    return `${kpis}${noStatus ? `<div class="notice warn small">${noStatus} of ${st.n} tasks have no status or % complete yet, so they count as not started and pull the actual figure down. Update them in the table below.</div>` : ''}
      <section class="pl-sec"><div class="pl-sec-h"><div><p class="pl-eyebrow">${inPlanPage ? 'Timeline' : 'Project plan'}</p><h2>Timeline &amp; planning</h2></div><div class="pl-legend"><span><i class="g-f"></i>Facilio</span><span><i class="g-c"></i>${esc(custName())}</span><span><i class="g-b"></i>Both</span><span><i class="ap"></i>Actual progress</span><span><i class="td"></i>Status date</span><span><i class="ms"></i>Milestone</span><span><i class="lt"></i>Critical (late)</span>${canEdit() ? `<button class="btn sm" data-act="tlRow">${ico('plus')}Task</button>` : ''}<button class="btn sm" data-act="tlAll">${S.ui.tlOpen === 'all' ? 'Collapse all' : 'Expand all'}</button></div></div>${tools}${planGrid(rowsAll())}</section>`;
  };
  V.timeline = { html() {
    const d = TD(); const rows = d.rows; const p = phaseNow(); const st = stats(); const ver = d.versions; const mv = moved();
    const lead = rows.length ? `Status as of <b>${esc(V.fmtDate(V.today()))}</b> · ${st.n} dated tasks${ver.length ? ' · baseline saved ' + esc(V.fmtDate(ver[0].at.slice(0, 10))) : ''}.` : 'The project plan as dated tasks.';
    const head = `<div class="page-header"><div class="t"><h1>Plan vs actual</h1><p>${lead} ${cust() ? '' : 'Import it from the uploaded Excel plan, generate a starting plan, or add tasks by hand.'}</p></div><div class="row">${canEdit() ? `<button class="btn" data-act="tlPhase">Current phase</button><button class="btn" data-act="tlImport">${ico('upl')}Import from the uploaded plan</button><button class="btn" data-act="tlGen">Generate a starting plan</button><button class="btn primary" data-act="tlRow">${ico('plus')}Add task</button>` : ''}</div></div>`;
    if (!rows.length) return head + `<div class="page-body"><div class="card empty"><h3>No dated plan yet</h3><p>${cust() ? 'Your implementation team will publish the plan here.' : 'Upload the customer plan on Project Plan, then import it here, or generate a starting plan from the project dates.'}</p></div></div>`;
    const noStatus = rows.filter(r => !r.isPhase && D(r.start) && r.status === 'Not started' && !Number(r.pct)).length;
    const fd = x => (x ? V.fmtDate(x) : '—'); const steps = `<section class="card pl-curve"><div class="card-h"><h3>The 12 standard steps</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Step</th><th>Start</th><th>End</th><th class="num">Tasks</th></tr></thead><tbody>${p.info.map(x => `<tr${x.i === p.cur ? ' class="sel"' : ''}><td>${x.i + 1}</td><td>${esc(x.title)}${x.i === p.cur ? ' <span class="tag blue">Current</span>' : ''}</td><td>${fd(x.start)}</td><td>${fd(x.end)}</td><td class="num">${x.n}</td></tr>`).join('')}</tbody></table></div></section>`;
    const compare = mv.length ? `<section class="card pl-curve"><div class="card-h"><h3>Moved since the baseline (${mv.length})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Task</th><th>Start moved</th><th>End moved</th></tr></thead><tbody>${mv.slice(0, 40).map(m => `<tr><td>${esc(m.r.title)}</td><td class="num">${m.ds > 0 ? '+' : ''}${m.ds} d</td><td class="num">${m.de > 0 ? '+' : ''}${m.de} d</td></tr>`).join('')}</tbody></table></div></section>` : '';
    return head + `<div class="page-body pl-page">${V.timelinePanel(true)}
      <section class="card pl-curve"><div class="card-h"><h3>Progress S-curve</h3></div><div class="card-b">${scurve(rowsAll())}</div></section>
      <div class="pl-insights">${insights(rowsAll(), st)}</div>
      ${steps}${compare}</div>`;
  }, mount() { if (V.planGanttMount) V.planGanttMount(); } };

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
    if (I().ready(['signoff'])) I().list('signoff').forEach(s => { if (c && s.status === 'requested') out.push({ t: 'Sign-off waiting for your signature: ' + (s.title || s.kind || 'document'), view: 'governance', x: { govTab: 'signoffs' } }); if (!c && s.status === 'concern') out.push({ t: 'Concern raised on ' + (s.title || s.kind || 'a sign-off'), view: 'governance', x: { govTab: 'signoffs' } }); });
    if (I().ready(['cr'])) I().list('cr').forEach(r => { if (c && r.status === 'Proposed') out.push({ t: `Change request CR-${String(r.n || '').padStart(3, '0')} needs your approval`, view: 'changes' }); if (!c && r.status === 'Requested') out.push({ t: `Change request CR-${String(r.n || '').padStart(3, '0')} needs an estimate`, view: 'changes' }); });
    if (I().ready(['onb'])) I().list('onb').forEach(o => { if (c && o.status === 'fix') out.push({ t: 'Data sheet needs fixes: ' + o.sheet, view: 'onboarding' }); if (!c && o.status === 'sent') out.push({ t: 'Data sheet sent for validation: ' + o.sheet, view: 'onboarding' }); });
    if (I().ready(['raid'])) I().list('raid').filter(r => r.status !== 'Closed' && /high/i.test(r.impact || '')).slice(0, 3).forEach(r => out.push({ t: 'Open high-impact ' + (r.type === 'I' ? 'issue' : 'risk') + ': ' + r.title, view: 'governance', x: { govTab: 'raid' } }));
    return out;
  }
  V.attentionItems = attention;
  V.planOverdue = () => TD().rows.filter(r => !r.isPhase && isLate(r));
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
    const out = []; const mine = V.side(); const today = V.today(); const c = cust(); const mk = (id, kind, text, view, tone, x) => out.push({ id, kind, text, view, tone: tone || '', x: x || null });
    const GA = { govTab: 'actions' };
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status === 'Done' || !a.due || (a.side || 'facilio') !== mine) return; const dd = days(today, a.due); if (dd < 0) mk('act-od-' + a.id, 'rem', `Action overdue (${-dd} d): ${a.text}`, 'governance', 'late', GA); else if (dd <= 3) mk('act-soon-' + a.id, 'rem', `Action due ${dd === 0 ? 'today' : 'in ' + dd + ' d'}: ${a.text}`, 'governance', '', GA); });
    attention().forEach((x, i) => mk('att-' + x.t, 'rem', x.t, x.view, '', x.x));
    V.events({ days: 2 }).forEach(e => mk('ev-' + e.date + e.title, 'rem', `${V.fmtDate(e.date)} · ${e.title}`, e.view === 'overview' ? 'governance' : e.view, '', e.view === 'overview' ? GA : null));
    if (V.contractKeyDates) V.contractKeyDates(30).forEach(k => mk('kd-' + k.id, 'rem', k.text, 'contract', k.late ? 'late' : ''));
    const cut = Date.now() - 14 * 864e5; const kinds = { action: 'Action', raid: 'RAID item', signoff: 'Sign-off', cr: 'Change request', decision: 'Decision', minutes: 'Meeting minutes', onbsub: 'Data workbook' };
    Object.keys(kinds).forEach(k => { if (!I().ready([k])) return; I().list(k).forEach(it => { if (!it._at || new Date(it._at).getTime() < cut || it._side === mine) return; mk('act-' + k + it.id + it._v, 'act', `${kinds[k]} updated by ${it._side === 'customer' ? (S.project.customer || 'the customer') : 'Facilio'}: ${it.title || it.text || it.fileName || it.kind || ''}`.trim(), { action: 'governance', raid: 'governance', signoff: 'governance', cr: 'changes', decision: 'governance', minutes: 'governance', onbsub: 'onboarding' }[k], '', { action: GA, raid: { govTab: 'raid' }, signoff: { govTab: 'signoffs' }, decision: { govTab: 'decisions' }, minutes: { govTab: 'minutes' } }[k] || null); }); });
    return out;
  }
  V.bellItems = notifications;
  V.bellHtml = () => { if (!S.project || !S.user) return ''; I().load(['action', 'signoff', 'cr', 'onb', 'raid', 'decision', 'minutes', 'onbsub']); const rs = readSet(); const n = notifications().filter(x => !rs.has(x.id)).length; return `<button class="bell" data-act="bellOpen" aria-label="Notifications${n ? ', ' + n + ' unread' : ''}">${ico('bell')}${n ? `<span class="bell-n">${n > 9 ? '9+' : n}</span>` : ''}</button>`; };
  ACT.bellOpen = () => { const all = notifications(); const rs = readSet(); const tab = S.ui.bellTab || 'all'; const list = all.filter(x => tab === 'all' || x.kind === tab);
    const body = `<div class="ob-tabs" style="margin-bottom:8px">${[['all', 'All'], ['rem', 'Reminders'], ['act', 'Activity']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="bellTab" data-v="${k}">${l}</button>`).join('')}</div>${list.length ? list.map(x => `<div class="list-item notif ${rs.has(x.id) ? 'read' : ''} ${x.tone}" data-act="bellGo" data-v="${esc(x.view)}" data-id="${esc(x.id)}">${rs.has(x.id) ? '' : '<i class="dot"></i>'}${esc(x.text)}</div>`).join('') : '<div class="muted">Nothing new.</div>'}`;
    drawer('Notifications', body, `<button class="btn" data-act="bellRead">Mark all as read</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`); };
  ACT.bellTab = a => { S.ui.bellTab = a.getAttribute('data-v'); ACT.bellOpen(); };
  ACT.bellGo = a => { const rs = readSet(); rs.add(a.getAttribute('data-id')); try { localStorage.setItem(rk(), JSON.stringify([...rs].slice(-400))); } catch (e) { } closeDrawer(); V.go ? V.go(a.getAttribute('data-v')) : ACT.nav(a); };
  ACT.bellRead = () => { const rs = readSet(); notifications().forEach(x => rs.add(x.id)); try { localStorage.setItem(rk(), JSON.stringify([...rs].slice(-400))); } catch (e) { } closeDrawer(); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
