/* Workshop plan page tools (view rsplan; the cards are drawn by src/sessionhtml.js, the sessions live in the planner document and are edited with the Requirement Session Planner drawer, src/planner.js):
   the bar (Add a session, Import a plan, Export to Excel, HTML or PDF), the guide on how to fill a session, and the drafts Claude made from an imported plan (apply to the plan, or replace it).
   Import: the person gives Claude a plan in any layout; the file is stored as a project file (category plan_source, team only) and a job import_workshop_plan asks Claude to read it
   and save a draft with the sessions (rules and checks: src/wsplanlogic.js, tests/workshop_plan.mjs). Nothing changes in the plan until a person applies the draft. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const SH = () => root.FWBSessionHtml; const LG = () => root.FWBWsPlan; const API = () => root.FWBApi;
  const ro = () => S.readonly || V.isCustomer();
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';
  const drafts = () => (I().list('ai') || []).filter(x => x.task === 'workshop' && x.content && !((F.doc('planner') || {}).appliedDrafts || []).includes(x.id)).map(x => ({ rec: x, plan: LG().parseDraft(x.content) })).filter(x => x.plan).sort((a, b) => String(b.rec._created || '').localeCompare(String(a.rec._created || ''))).slice(0, 3);
  const guide = () => '<details class="card wp-guide"><summary><b>How to fill a session</b><span class="small muted"> Each field and what it becomes in the plan</span></summary><div class="card-b"><ul class="wp-g">'
    + '<li><b>Title and workshop items</b> The session name and the modules it covers, for example "Work Order Management and Planned Maintenance".</li>'
    + '<li><b>Modules covered</b> Tick the modules in scope. They show as the session subtitle, and a module in no session is flagged.</li>'
    + '<li><b>Date, start time and duration</b> The date the customer should block. Leave the date empty for a session that only happens if needed.</li>'
    + '<li><b>Workshop details</b> One agenda point per line. Start a new group with the module name on its own line; the points under it are numbered through the whole session.</li>'
    + '<li><b>Required stakeholders</b> The roles you need in the room (not names): Head of Facilities, Technicians lead, Customer IT.</li>'
    + '<li><b>Preparation required</b> What the customer should bring or decide before the session, such as asset lists or approval rules.</li></ul>'
    + '<p class="small muted" style="margin:8px 0 0">The plan is a draft until you share it. Add a session with the button above; edit or copy one from its card. Export the plan to Excel, HTML or PDF, or import a plan you already have.</p></div></details>';
  /** the bar above the plan; d is the plan data (kickoff.js sessData) */
  function bar(d) {
    const ss = d.sessions || []; const pts = SH().rows(d).agenda.length; const w = ro();
    return '<div class="wp-bar"><div class="wp-l"><b>' + ss.length + ' session' + (ss.length === 1 ? '' : 's') + '</b><span class="muted small">' + pts + ' agenda point' + (pts === 1 ? '' : 's') + '</span></div><div class="wp-r">'
      + (w ? '' : '<button type="button" class="btn primary" data-act="newSession">+ Add a session</button><button type="button" class="btn" data-act="wpImport" title="Give Claude a plan in any layout: it builds the sessions for you to review">Import a plan</button>')
      + (ss.length ? '<span class="seg wp-exp" role="group" aria-label="Export the plan"><button type="button" data-act="wpXlsx">Excel</button><button type="button" data-act="koSessDl">HTML</button><button type="button" data-act="wpPdf">PDF</button></span><button type="button" class="btn ghost" data-act="koSessView">View</button>' : '') + '</div></div>';
  }
  function draftsCard() {
    const l = ro() ? [] : drafts(); if (!l.length) return '';
    return '<div class="card wp-drafts"><div class="card-h"><b>Plans Claude built from your files</b><span class="small muted">Review them, then add them to the plan</span></div><div class="card-b">' + l.map(x => '<div class="ev-row" style="align-items:center;gap:8px"><span class="ev-t"><b>' + esc(x.rec.title || 'Imported plan') + '</b> <span class="xs muted">' + x.plan.sessions.length + ' session' + (x.plan.sessions.length === 1 ? '' : 's') + ' · ' + esc(V.fmtDate(String(x.rec._created || '').slice(0, 10))) + '</span><div class="xs muted">' + esc(x.plan.sessions.slice(0, 3).map(s => s.title).join(' · ')) + (x.plan.sessions.length > 3 ? ' …' : '') + '</div></span><button type="button" class="btn sm primary" data-act="wpApply" data-id="' + esc(x.rec.id) + '" data-m="add">Add to the plan</button><button type="button" class="btn sm" data-act="wpApply" data-id="' + esc(x.rec.id) + '" data-m="replace">Replace the plan</button></div>').join('') + '</div></div>';
  }
  V.wsplan = { bar, guide, draftsCard, mount() { I().load(['ai']); } };
  const download = (name, blob) => V.download(name, blob);
  ACT.wpXlsx = () => V.busy(null, async () => {
    const d = V.planSessionData(); const R = SH().rows(d); const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook();
    const sheet = (name, head, data, widths) => { const ws = wb.addWorksheet(name); const h = ws.addRow(head); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1A5E' } }; data.forEach(r => ws.addRow(r)); widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; }); ws.eachRow(r => { r.alignment = { vertical: 'top', wrapText: true }; }); ws.views = [{ state: 'frozen', ySplit: 1 }]; return ws; };
    sheet('Workshop sessions', ['No', 'Session', 'Modules', 'Date', 'Time', 'Duration', 'Mode', 'Status', 'Required stakeholders', 'Preparation required'], R.sessions, [6, 40, 36, 13, 12, 14, 12, 12, 40, 40]);
    sheet('Agenda', ['Session no', 'Session', 'Heading', '#', 'Agenda point'], R.agenda, [11, 40, 28, 6, 80]);
    if (R.notes.length) sheet('Planning notes', ['Item', 'Details'], R.notes, [26, 100]);
    const buf = await wb.xlsx.writeBuffer(); download('workshop-plan-' + slug(S.project.customer) + '-' + slug(S.project.name) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });
  // PDF: the HTML plan opens in its own tab, ready to print; the print dialog saves it as a PDF (the page hides the buttons and keeps each session on one page)
  ACT.wpPdf = () => { try { const w = window.open(URL.createObjectURL(new Blob([SH().build(Object.assign(V.planSessionData(), { edit: false }))], { type: 'text/html' })), '_blank'); if (!w) { V.toast('The browser blocked the new tab. Allow pop-ups for this site and try again.', 6000, true); return; } w.addEventListener('load', () => setTimeout(() => { try { w.print(); } catch (e) { /* the person can print the tab by hand */ } }, 400)); V.toast('In the print window choose "Save as PDF".', 6000); } catch (e) { V.toast('The PDF could not be prepared: ' + (e.message || 'error'), 6000, true); } };
  ACT.wpImport = () => V.busy(null, async () => {
    const J = V.studioJobs; if (ro() || !J || J.guard()) return; const f = (await V.pickFile('.xlsx,.xlsm,.xls,.csv,.docx,.pdf,.txt,.md,.html,.htm,.eml,.png,.jpg,.jpeg'))[0]; if (!f) return;
    try { V.loading(true, 'Uploading ' + f.name + '…'); const rec = await API().uploadFile(S.project.id, f, 'plan_source', { from: 'workshop-plan' }); V.loading(false);
      const r = await J.post('/jobs', { kind: 'import_workshop_plan', section: 'rsplan', note: f.name, ref: rec.id }); V.toast(r.duplicate ? 'That request is already waiting.' : 'Sent to Claude. The plan it builds shows here as a draft for you to review.', 7000); J.load(true); }
    catch (e) { V.loading(false); V.toast(e.message || 'The file could not be sent', 7000, true); }
  });
  ACT.wpApply = a => V.busy(a, async () => {
    const rec = I().get('ai', a.getAttribute('data-id')); const plan = rec && LG().parseDraft(rec.content); const mode = a.getAttribute('data-m') === 'replace' ? 'replace' : 'add'; if (!plan) { V.toast('That draft could not be read as a plan.', 5000, true); return; }
    if (mode === 'replace' && !(await V.confirmDialog('Replace the plan', 'All ' + (F.doc('planner').sessions || []).length + ' sessions now in the plan are replaced by the ' + plan.sessions.length + ' in this draft. Sessions are not kept anywhere else.', 'Replace', true))) return;
    const d = F.doc('planner'); const r = LG().apply(d.sessions || [], plan, mode, F.uid); d.sessions = r.sessions; if (plan.planNotes.length) d.sessionPlanNotes = (mode === 'replace' ? [] : (d.sessionPlanNotes || [])).concat(plan.planNotes);
    d.appliedDrafts = (d.appliedDrafts || []).concat(rec.id); F.changed('Workshop plan imported', r.added + ' session' + (r.added === 1 ? '' : 's') + (mode === 'replace' ? ' (plan replaced)' : ' added'), { section: 'planner' }); V.toast(r.added + ' session' + (r.added === 1 ? '' : 's') + (mode === 'replace' ? ' now make up the plan.' : ' added to the plan.'), 5000);
  });
})(typeof window !== 'undefined' ? window : globalThis);
