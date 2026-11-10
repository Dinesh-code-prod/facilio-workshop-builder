/* Go-live readiness (stage 4, fifth tab): one read-only page that says what stands between the project and go-live, read from what the Studio already holds
   (confirmed requirements and their test cases, test results, open UAT issues, the BRD review ticks, the training guides). Nothing here is typed in except the decision itself,
   which a person records with a name and a date. A gap is shown and linked to where it is fixed; it never stops anyone from recording a decision.
   `readiness` is the pure rule (tests/golive.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const I = () => V.items; const U = () => root.FWBUat;
  const arr = v => (Array.isArray(v) ? v : []);
  const esc = F ? F.esc : (s => String(s == null ? '' : s));
  const REVIEW = ['intro', 'requirements', 'flows', 'fields', 'apps', 'contract'];
  /** in: { reqTotal, reqCovered, cases: [{ status }], issues: [{ status, severity }], review: { intro: {by,at}, ... }, guides }
      out: { rows: [{ id, label, state: 'ok'|'warn'|'gap', detail, view }], open, verdict } */
  function readiness(d) {
    const cases = arr(d.cases), issues = arr(d.issues); const run = cases.filter(c => !['Not Started', 'Ready for Testing', 'Deferred', ''].includes(c.status || '')).length;
    const passed = cases.filter(c => c.status === 'Passed' || c.status === 'Approved').length, bad = cases.filter(c => c.status === 'Failed' || c.status === 'Blocked').length;
    const openIssues = issues.filter(i => i.status !== 'Closed' && i.status !== 'Deferred'); const high = openIssues.filter(i => /high|critical|blocker/i.test(String(i.severity || ''))).length;
    const ticks = REVIEW.filter(k => d.review && d.review[k] && d.review[k].at).length;
    const rows = [
      { id: 'cover', label: 'Every confirmed requirement has a test case', view: 'delivery', state: !d.reqTotal ? 'gap' : d.reqCovered >= d.reqTotal ? 'ok' : 'warn', detail: !d.reqTotal ? 'No confirmed requirement is recorded yet.' : d.reqCovered + ' of ' + d.reqTotal + ' have a test case.' },
      { id: 'run', label: 'Test cases have been run', view: 'delivery', state: !cases.length ? 'gap' : run >= cases.length ? 'ok' : 'warn', detail: !cases.length ? 'No test case exists yet.' : run + ' of ' + cases.length + ' run, ' + passed + ' passed.' },
      { id: 'bad', label: 'No failed or blocked test cases', view: 'delivery', state: !cases.length ? 'gap' : bad ? 'warn' : 'ok', detail: !cases.length ? 'Nothing to judge until test cases are run.' : bad ? bad + ' failed or blocked.' : 'None failed or blocked.' },
      { id: 'issues', label: 'No open UAT issues', view: 'delivery', state: openIssues.length ? (high ? 'gap' : 'warn') : 'ok', detail: openIssues.length ? openIssues.length + ' open' + (high ? ', ' + high + ' high or blocking' : '') + '.' : 'No open UAT issue.' },
      { id: 'brd', label: 'The BRD is reviewed', view: 'brd', state: ticks >= REVIEW.length ? 'ok' : ticks ? 'warn' : 'gap', detail: ticks + ' of ' + REVIEW.length + ' review parts ticked.' },
      { id: 'ftr', label: 'The FTR report is written and passes', view: 'ftr', state: !(d.ftr && d.ftr.total) ? 'gap' : d.ftr.fail || d.ftr.blocked || d.ftr.notrun ? 'warn' : 'ok', detail: !(d.ftr && d.ftr.total) ? 'No FTR report yet.' : d.ftr.pass + ' of ' + d.ftr.total + ' passed' + (d.ftr.fail ? ', ' + d.ftr.fail + ' failed' : '') + (d.ftr.notrun ? ', ' + d.ftr.notrun + ' not run' : '') + '.' },
      { id: 'uatguide', label: 'The UAT guide is made', view: 'uatguide', state: d.uatGuide ? 'ok' : 'gap', detail: d.uatGuide ? 'A UAT guide is in the project.' : 'No UAT guide yet.' },
      { id: 'guides', label: 'Training guides are made', view: 'guidebuilder', state: d.guides ? 'ok' : 'gap', detail: d.guides ? d.guides + ' guide' + (d.guides === 1 ? '' : 's') + ' in the project.' : 'No guide has been made yet.' }
    ];
    const open = rows.filter(r => r.state !== 'ok').length;
    return { rows, open, verdict: open ? open + ' thing' + (open === 1 ? '' : 's') + ' still open' : 'Everything recorded is ready' };
  }
  V.goliveLogic = { readiness };
  if (!F || !F.S) return;   // the page below needs the browser app (tests load only the rule above)
  const dot = s => '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;background:' + (s === 'ok' ? '#1AA34A' : s === 'warn' ? '#F59E0B' : '#E5197F') + '"></span>';
  function gather() {
    const mods = F.allModules().filter(m => m.inScope); const reqs = (F.S.ws.requirements || []).filter(r => r.status === 'Confirmed');
    const cases = I().list('utc'); const data = mods.map(m => ({ name: m.name, label: m.label, requirements: reqs.filter(r => (r.modules || []).includes(m.name)).map(r => ({ id: r.id, title: r.title })) })); data.push({ name: '__general', label: 'General requirements', requirements: reqs.filter(r => !(r.modules && r.modules.length)).map(r => ({ id: r.id, title: r.title })) }); const cov = U().coverage(data, cases);
    const issues = I().list('task').filter(t => U().isUatIssue(t)).map(t => ({ status: U().issueStatus(t), severity: (t.uat && t.uat.severity) || t.priority || '' }));
    const b = F.doc('brddoc') || {}; return { reqTotal: cov.total, reqCovered: cov.covered, cases, issues, review: b.review || {}, guides: I().list('ugd').length, ftr: V.ftrFacts ? V.ftrFacts().ftr : null, uatGuide: V.ftrFacts ? V.ftrFacts().uatGuide : false };
  }
  const rec = () => I().get('close', 'golive') || {};
  const can = () => !V.isCustomer() && !F.S.readonly;
  V.golive = { html() {
    if (V.isCustomer()) return ''; I().load(['utc', 'task', 'close', 'ugd']); const head = '<div class="page-header"><div class="t"><h1>Go-live readiness</h1><p>What stands between this project and go-live, read from what the Studio already holds. Nothing here blocks you: record the decision when the team is ready.</p></div></div>';
    if (!I().ready(['utc', 'task', 'close', 'ugd'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const r = readiness(gather()), d = rec();
    const rows = r.rows.map(x => '<div class="ev-row" style="align-items:center">' + dot(x.state) + '<span class="ev-t"><b>' + esc(x.label) + '</b><div class="xs muted">' + esc(x.detail) + '</div></span><button class="btn sm" data-act="nav" data-view="' + esc(x.view) + '">Open</button></div>').join('');
    const decided = d.at ? '<p class="small"><b>' + (d.go ? 'Go-live approved' : 'Go-live on hold') + '</b> by ' + esc(d.by || '') + ' on ' + esc(V.fmtDate ? V.fmtDate(d.at) : d.at) + (d.note ? '. ' + esc(d.note) : '') + '</p>' : '<p class="small muted">No decision recorded yet.</p>';
    const box = can() ? '<label class="f">Note (optional)</label><textarea id="gl_note" rows="3" placeholder="What the team agreed, any condition">' + esc(d.note || '') + '</textarea><div class="row" style="gap:8px;margin-top:8px"><button class="btn primary" data-act="glDecide" data-go="1">Record: go live</button><button class="btn" data-act="glDecide" data-go="0">Record: hold</button></div>' : '';
    return head + '<div class="page-body"><div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Readiness</h3><span class="small muted">' + esc(r.verdict) + '</span></div><div class="card-b">' + rows + '<p class="xs muted" style="margin:8px 0 0">Green is done, amber is in progress, pink is missing. The FTR report is kept in its own results file and is not counted here.</p></div></div>'
      + '<div class="card"><div class="card-h"><h3>Go-live decision</h3></div><div class="card-b">' + decided + box + '</div></div></div>';
  }, mount() { I().load(['utc', 'task', 'close', 'ugd']); } };
  V.goliveLogic.rows = () => readiness(gather()).rows;
  V.ACT.glDecide = a => V.busy(a, async () => {
    if (!can()) return; const go = a.getAttribute('data-go') === '1'; const note = (document.getElementById('gl_note') || {}).value || '';
    if (!(await V.confirmDialog(go ? 'Record go-live' : 'Record hold', 'This is saved with your name and today' + String.fromCharCode(39) + 's date. You can record a different decision later.', go ? 'Record go-live' : 'Record hold', false))) return;
    await I().put('close', 'golive', Object.assign({}, rec(), { go, note: note.slice(0, 600), by: (F.S.user && (F.S.user.name || F.S.user.email)) || '', at: new Date().toISOString() })); V.toast(go ? 'Go-live recorded.' : 'Hold recorded.', 4000); V.render();
  });
})(typeof window !== 'undefined' ? window : globalThis);
