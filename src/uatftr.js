/* UAT = the FTR report + the UAT guide, both written by the person's Claude (job make_ftr, and make_guide uat).
   FTR Report page: tab Report (HTML per module, use case, test case and result, read from Claude's saved draft) and tab Excel (the existing workbook editor).
   UAT guide page: ask Claude, read the draft, open it. No form to fill in: the test cases come from the FTR. Loaded after src/pageguide.js, which wraps the same page. */
(function (root) {
  'use strict';
  const F = root.FWB, V = root.FWBViews; if (!F || !V || !V.ftr || !V.ftrReport) return;
  const { S, esc } = F, ACT = V.ACT, I = () => V.items, R = V.ftrReport, arr = x => (Array.isArray(x) ? x : []);
  const ro = () => V.isCustomer() || (S && S.readonly);
  const drafts = task => I().list('ai').filter(d => d.task === task).sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
  const latestFtr = () => { const l = drafts('ftr'); return l.find(d => R.parse(d.content).counts.total) || l[0] || null; };
  const when = s => (s ? String(s).slice(0, 10) : '');

  /** what the go-live check needs: the counts of the latest FTR report, and whether a UAT guide exists */
  V.ftrFacts = () => { const d = latestFtr(); const c = d ? R.parse(d.content).counts : null; return { ftr: c && c.total ? c : null, uatGuide: drafts('uat').length > 0 || I().list('ugd').some(g => /uat/i.test(String(g.title || ''))) }; };

  const send = (a, job, done) => V.busy(a, async () => { const J = V.studioJobs; if (!J || J.guard()) return; const out = await J.post('/jobs', job); V.toast(out && out.duplicate ? 'Claude already has this request.' : done, 6000); });
  const tabs = cur => '<div class="seg fr-seg" role="tablist" aria-label="FTR report views">' + [['report', 'Report (HTML)'], ['excel', 'Excel']].map(x => '<button type="button" role="tab" class="' + (cur === x[0] ? 'on' : '') + '" aria-selected="' + (cur === x[0]) + '" data-act="ftrTabSet" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  const tab = () => (S.ui.ftrTab === 'excel' ? 'excel' : 'report');
  ACT.ftrTabSet = a => { S.ui.ftrTab = a.getAttribute('data-v'); V.render(); };

  ACT.ftrWrite = a => send(a, { kind: 'make_ftr', section: 'write', note: 'Write or refresh the FTR report for every module in scope.' }, 'Sent to Claude. The report shows here when it is ready.');
  ACT.ftrCheck = a => send(a, { kind: 'make_ftr', section: 'check', note: 'Check the organisation configuration against the test cases, test through the Facilio connector and take pictures.' }, 'Sent to Claude. It checks the organisation and adds results and pictures.');
  ACT.ftrChange = () => V.drawer('Change the FTR report', '<label class="f" for="fr_n">What should change?</label><textarea id="fr_n" rows="4" maxlength="500" placeholder="For example: add a test case for approvals in Work Orders, or shorten the steps."></textarea><p class="small muted">Claude changes the report and the HTML view. It keeps results it has not re-tested.</p>', '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ftrChangeGo">Ask Claude</button>');
  ACT.ftrChangeGo = a => { const n = (document.getElementById('fr_n') || {}).value || ''; if (!n.trim()) { V.toast('Write what should change.', 4000, true); return; } V.closeDrawer(); send(a, { kind: 'make_ftr', section: 'change', note: n.replace(/\s+/g, ' ').trim().slice(0, 500) }, 'Sent to Claude.'); };
  // ---------- the FTR report as an editable document, drafted like the BRD (user, 24 Nov 2026) ----------
  // The page edits a working copy of Claude's latest draft (cells, use case titles, results, rows) and saves it back into the same draft as the Markdown Claude reads (src/docpaper.js ftrToMd).
  // An approved report is locked until an owner reopens it. Exports: Word (the draft's own export), PDF (print) and HTML (one self-contained page that looks like this one).
  const DP = () => V.docPaper; let FT = null, ftTimer = null;
  const recount = rep => { const c = { total: 0, pass: 0, fail: 0, blocked: 0, notrun: 0 }; rep.modules.forEach(m => m.useCases.forEach(u => u.cases.forEach(x => { c.total++; c[x.result] = (c[x.result] || 0) + 1; }))); rep.counts = c; return rep; };
  const ftWork = d => { if (!FT || FT.id !== d.id || (!FT.dirty && FT.md !== d.content)) FT = { id: d.id, md: d.content, rep: R.parse(d.content) }; return FT; };
  const ftState = t => { const el = document.getElementById('ftState'); if (el) el.textContent = t; };
  async function ftSaveNow() { clearTimeout(ftTimer); if (!FT || !FT.dirty) return; const d = I().get('ai', FT.id); if (!d) return; const md = V.docPaper.ftrToMd(FT.rep); FT.dirty = false; FT.md = md; ftState('Saving…');
    try { await I().put('ai', FT.id, Object.assign({}, d, { content: md }), { silent: true }); ftState(FT.dirty ? 'Unsaved changes…' : 'All changes saved'); } catch (e) { FT.dirty = true; ftState('Not saved'); V.toast(e.message || 'Could not save the FTR report', 6000, true); } }
  const ftSave = () => { if (!FT) return; FT.dirty = true; ftState('Unsaved changes…'); clearTimeout(ftTimer); ftTimer = setTimeout(ftSaveNow, 900); };
  const ftCase = k => { const [mi, ui, ci] = String(k).split('.').map(Number); const u = FT && FT.rep.modules[mi] && FT.rep.modules[mi].useCases[ui]; return { u, x: u && u.cases[ci], ci }; };
  const meta = d => ({ customer: (S.project && (S.project.customer || S.project.name)) || '', version: d.version || 1, date: when(d._created), status: d.status === 'approved' ? 'Approved' : 'Draft' });
  const fileName = ext => 'FTR report - ' + String((S.project && (S.project.customer || S.project.name)) || 'project').replace(/[^\w -]+/g, '') + ext;
  const exportModel = d => DP().ftrModel(recount(FT && FT.id === d.id ? FT.rep : R.parse(d.content)), meta(d));
  document.addEventListener('input', e => { const t = e.target; if (!FT || !t || !t.getAttribute) return; let k;
    if ((k = t.getAttribute('data-ftc'))) { const p = k.split('.'), c = ftCase(p.slice(0, 3).join('.')); if (c.x && ['id', 'title', 'steps', 'expected', 'evidence', 'comments'].includes(p[3])) { c.x[p[3]] = t.textContent.replace(/\s+/g, ' ').trim(); ftSave(); } return; }
    if ((k = t.getAttribute('data-ftu'))) { const [mi, ui] = k.split('.').map(Number); const u = FT.rep.modules[mi] && FT.rep.modules[mi].useCases[ui]; if (u) { u.title = t.textContent.replace(/\s+/g, ' ').trim(); ftSave(); } return; }
    if ((k = t.getAttribute('data-ftm'))) { const m = FT.rep.modules[Number(k)]; if (m) { m.name = t.textContent.replace(/\s+/g, ' ').trim(); ftSave(); } return; }
    if (t.getAttribute('data-fti')) { FT.rep.intro = t.textContent.replace(/\s+/g, ' ').trim(); ftSave(); } });
  ACT.ftrRes = el => { const c = ftCase(el.getAttribute('data-k')); if (!c.x) return; c.x.result = el.value; recount(FT.rep); ftSave(); V.render(); };
  ACT.ftrRowAdd = a => { const [mi, ui] = String(a.getAttribute('data-k')).split('.').map(Number); const u = FT && FT.rep.modules[mi] && FT.rep.modules[mi].useCases[ui]; if (!u) return; u.cases.push({ id: 'TC-' + (u.cases.length + 1), title: 'New test case', steps: '', expected: '', result: 'notrun', evidence: '', comments: '' }); recount(FT.rep); ftSave(); V.render(); };
  ACT.ftrRowDel = async a => { const c = ftCase(a.getAttribute('data-k')); if (!c.x || !(await V.confirmDialog('Remove this test case', 'The row "' + (c.x.title || c.x.id) + '" is removed from the FTR draft.', 'Remove', true))) return; c.u.cases.splice(c.ci, 1); recount(FT.rep); ftSave(); V.render(); };
  ACT.ftrDlHtml = a => V.busy(a, async () => { const d = latestFtr(); if (!d) return; await ftSaveNow(); V.download(fileName('.html'), new Blob([DP().htmlFile(exportModel(d))], { type: 'text/html' })); V.toast('Saved ' + fileName('.html'), 4000); });
  ACT.ftrPdf = a => V.busy(a, async () => { const d = latestFtr(); if (!d) return; await ftSaveNow(); DP().printHtml(DP().htmlFile(exportModel(d))); V.toast('Choose Save as PDF in the print window.', 5000); });
  ACT.ftrDocx = a => V.busy(a, async () => { const d = latestFtr(); if (!d) return; await ftSaveNow(); if (ACT.aiExport) await ACT.aiExport({ getAttribute: k => (k === 'data-id' ? d.id : null) }); });
  ACT.ftrDecide = a => V.busy(a, async () => { const d = latestFtr(); if (!d) return; await ftSaveNow(); const dec = a.getAttribute('data-d'); try { await root.FWBApi.post('/api/projects/' + S.project.id + '/ai/' + d.id + '/decision', { decision: dec, note: '' }); FT = null; await I().load(['ai'], true); V.toast(dec === 'approve' ? 'Approved' : 'Reopened as a draft', 4000); V.render(); } catch (e) { V.toast(e.message, 5000, true); } });
  const canApprove = () => !V.isCustomer() && S.project && S.project.role === 'owner';

  function reportPage() {
    const d = latestFtr(), rep = d ? R.parse(d.content) : null, can = !ro();
    const asks = can ? '<div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 14px"><button type="button" class="btn' + (d ? '' : ' primary') + '" data-act="ftrWrite">' + (d ? 'Refresh with Claude' : 'Write the report with Claude') + '</button><button type="button" class="btn" data-act="ftrCheck">Check the organisation with Claude</button><button type="button" class="btn" data-act="ftrChange">Change the report</button>' + (d ? '<span class="spacer"></span><a href="#" class="small" data-act="aiOpen" data-id="' + esc(d.id) + '">Open the text</a>' : '') + '</div>' : '';
    if (!rep || !rep.counts.total) return asks + '<div class="card"><div class="card-b"><b>' + (d ? 'The saved draft has no test case table yet.' : 'No FTR report yet.') + '</b><p class="small muted">Claude reads the use cases, the configuration and the test cases, uses the implementation skills (ftr-generator, ftr-executor) and writes one report per module. Nothing needs to be typed here. Results appear only after a test was really run.</p></div></div>';
    const w = ftWork(d); recount(w.rep); const edit = can && d.status !== 'approved', model = DP().ftrModel(w.rep, meta(d), { edit });
    const decide = canApprove() ? (d.status === 'approved' ? '<button class="btn sm" data-act="ftrDecide" data-d="reopen">Reopen to edit</button>' : '<button class="btn sm primary" data-act="ftrDecide" data-d="approve">Approve</button>') : '';
    const note = edit ? 'Click a cell to edit. <span id="ftState">All changes saved</span>' : d.status === 'approved' ? 'Approved and locked.' + (canApprove() ? ' Reopen it to edit.' : '') : 'Read only.';
    const ribbon = '<div class="brd-top">' + (d.status === 'approved' ? '<span class="tag green">Approved</span>' : '<span class="tag tbc">Draft</span>') + '<span class="small muted">v' + esc(d.version || 1) + ' · ' + note + '</span><span class="spacer"></span><button class="btn sm" data-act="ftrDocx">Word</button><button class="btn sm" data-act="ftrPdf">PDF</button><button class="btn sm" data-act="ftrDlHtml">HTML</button>' + decide + '</div>';
    const outline = model.sections.map((x, i) => '<a href="#" data-act="dpJump" data-i="' + i + '">' + esc(x.title) + '</a>').join('');
    return '<style>' + R.CSS + '</style>' + asks + '<div class="word dp-word"><nav class="word-nav" aria-label="FTR report outline"><div class="pink-label" style="margin:6px 16px 8px">Modules</div>' + outline + '</nav><div class="word-main">' + ribbon + '<div class="paper-scroll">' + DP().paper(model, { edit, titleAttr: i => (i ? 'data-ftm="' + (i - 1) + '"' : '') }) + '</div></div></div>';
  }
  const wrapFtr = () => {
    const o = V.ftr; if (o._ut) return; o._ut = 1; const h = o.html, m = o.mount;
    o.html = function () {
      if (V.isCustomer && V.isCustomer() && !latestFtr()) return h.apply(this, arguments);
      I().load(['ai']); const out = h.apply(this, arguments);
      if (tab() === 'excel') return typeof out === 'string' ? out.replace('<div class="page-body">', () => '<div class="page-body">' + tabs('excel')) : out;
      return '<div class="page-header"><div class="t"><h1>FTR Report</h1><p>Every module, its use cases, test cases and results. Claude writes it; you can also keep the Excel version.</p></div></div><div class="page-body">' + tabs('report') + (I().ready(['ai']) ? reportPage() : '<div class="muted" style="padding:20px">Loading…</div>') + '</div>';
    };
    o.mount = function () { if (tab() === 'excel' && m) return m.apply(this, arguments); };
  };
  wrapFtr();

  // ---------- UAT guide ----------
  ACT.uatgMake = a => send(a, { kind: 'make_guide', section: 'uat', note: 'Built from the FTR report test cases: what each tester tries, module by module, in plain words.' }, 'Sent to Claude. The UAT guide shows here when it is ready.');
  ACT.uatgChange = () => V.drawer('Change the UAT guide', '<label class="f" for="ug_n">What should change?</label><textarea id="ug_n" rows="4" maxlength="500" placeholder="For example: add a section for approvers, or make the steps shorter."></textarea>', '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="uatgChangeGo">Ask Claude</button>');
  ACT.uatgChangeGo = a => { const n = (document.getElementById('ug_n') || {}).value || ''; if (!n.trim()) { V.toast('Write what should change.', 4000, true); return; } V.closeDrawer(); send(a, { kind: 'change_guide', section: 'uat', note: n.replace(/\s+/g, ' ').trim().slice(0, 500) }, 'Sent to Claude.'); };
  V.uatguide = { html() {
    if (V.isCustomer()) return '';
    I().load(['ai', 'ugd']); const head = '<div class="page-header"><div class="t"><h1>UAT guide</h1><p>What your testers try, built from the FTR report. UAT is the FTR report plus this guide.</p></div></div>';
    if (!I().ready(['ai', 'ugd'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const d = drafts('uat')[0], f = V.ftrFacts(), can = !ro();
    const asks = can ? '<div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 14px"><button type="button" class="btn primary" data-act="uatgMake">' + (d ? 'Refresh with Claude' : 'Make the UAT guide with Claude') + '</button>' + (d ? '<button type="button" class="btn" data-act="uatgChange">Change it</button>' : '') + '<button type="button" class="btn" data-act="nav" data-view="ftr">Open the FTR report</button><button type="button" class="btn" data-act="nav" data-view="guides">Add reference documents (optional)</button></div>' : '';
    const warn = f.ftr ? '' : '<div class="notice" style="margin:0 0 12px">There is no FTR report yet, so Claude writes the guide from the use cases. <a href="#" data-act="nav" data-view="ftr">Make the FTR report first</a> for better results.</div>';
    const card = d ? '<div class="card"><div class="card-h"><b>' + esc(d.title || 'UAT guide') + '</b><span class="small muted">' + (d.status === 'approved' ? 'Approved' : 'Draft') + ' · v' + esc(d.version || 1) + ' · ' + esc(when(d._created)) + '</span></div><div class="card-b"><p class="small" style="white-space:pre-wrap">' + esc(String(d.content || '').replace(/[#*|`]/g, '').slice(0, 900)) + (String(d.content || '').length > 900 ? '…' : '') + '</p><button type="button" class="btn sm" data-act="aiOpen" data-id="' + esc(d.id) + '">Open and approve</button></div></div>' : '<div class="card"><div class="card-b"><b>No UAT guide yet.</b><p class="small muted">Claude writes it from the FTR report and the project records. Nothing to fill in.</p></div></div>';
    return head + '<div class="page-body">' + asks + warn + card + '</div>';
  } };
})(typeof window !== 'undefined' ? window : globalThis);
