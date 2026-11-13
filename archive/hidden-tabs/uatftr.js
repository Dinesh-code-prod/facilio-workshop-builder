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
  ACT.ftrDlHtml = () => { const d = latestFtr(); if (!d) return; V.download('FTR report - ' + String((S.project && (S.project.customer || S.project.name)) || 'project').replace(/[^\w -]+/g, '') + '.html', new Blob([R.html(R.parse(d.content), S.project)], { type: 'text/html' })); };

  function reportPage() {
    const d = latestFtr(), rep = d ? R.parse(d.content) : null, can = !ro();
    const asks = can ? '<div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 14px"><button type="button" class="btn primary" data-act="ftrWrite">' + (d ? 'Refresh with Claude' : 'Write the report with Claude') + '</button><button type="button" class="btn" data-act="ftrCheck">Check the organisation with Claude</button><button type="button" class="btn" data-act="ftrChange">Change the report</button>' + (d ? '<span class="spacer"></span><button type="button" class="btn" data-act="ftrDlHtml">Download HTML</button>' : '') + '</div>' : '';
    const meta = d ? '<p class="small muted" style="margin:0 0 12px">' + (d.status === 'approved' ? 'Approved' : 'Draft') + ' · v' + esc(d.version || 1) + ' · ' + esc(when(d._created)) + ' · <a href="#" data-act="aiOpen" data-id="' + esc(d.id) + '">Open the text</a></p>' : '';
    const bodyHtml = rep && rep.counts.total ? R.body(rep) : '<div class="card"><div class="card-b"><b>' + (d ? 'The saved draft has no test case table yet.' : 'No FTR report yet.') + '</b><p class="small muted">Claude reads the use cases, the configuration and the test cases, uses the implementation skills (ftr-generator, ftr-executor) and writes one report per module. Nothing needs to be typed here. Results appear only after a test was really run.</p></div></div>';
    return '<style>' + R.CSS + '</style>' + asks + meta + bodyHtml;
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
