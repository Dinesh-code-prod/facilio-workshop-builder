/* Status reports (Project menu): the weekly status report (WSR) and the monthly report on one page, as two tabs.
   Each report is a record of the older Reports page (kind rep, type WSR or Monthly) with the finished HTML in its html field, so the e-mail draft, "Mark as sent" and the history stay in one place.
   "Build from the Studio" makes the report at once from the live records (rules: src/wsrlogic.js, tests/wsr.mjs); "Ask Claude" sends a job (make_wsr, make_monthly) and Claude's HTML comes back as a draft
   below, for a person to preview and record. Claude's HTML is shown only in a sandboxed frame (no scripts). */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const W = root.FWBWsr; if (!F || !F.S || !V || !W) return;
  const { S, esc } = F; const I = () => V.items; const ACT = V.ACT;
  const KINDS = ['rep', 'task', 'action', 'raid', 'signoff', 'cr', 'ai'];
  const SO = { brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' };
  const st = () => S.ui.sr || (S.ui.sr = { tab: 'WSR', date: '', month: '', note: '', open: '' });
  const wk = () => st().tab === 'WSR';
  const isHtml = c => /^\s*(<!doctype html|<html)/i.test(String(c || ''));
  const reps = () => I().list('rep').filter(r => r.type === st().tab).sort((a, b) => String(b.periodEnd || '').localeCompare(String(a.periodEnd || '')));
  const drafts = () => I().list('ai').filter(d => d.task === (wk() ? 'wsr' : 'monthly') && isHtml(d.content) && !d.recorded).sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
  /** the date the report is made for: the chosen day (weekly) or the chosen month, never in the future */
  function reportDate() { const s = st(), t = V.today(); if (wk()) return (s.date && s.date <= t) ? s.date : t; const m = s.month || t.slice(0, 7); return m >= t.slice(0, 7) ? t : W.periodOf(m + '-01', 'month').to; }
  function snapshot(date) {
    const L = V.lifeStages ? V.lifeStages() : null; const ST = root.FWBLife.STATUS; const p = S.project || {};
    const acts = I().list('action').map(a => ({ title: a.text, owner: a.owner, due: a.due, status: a.status === 'Done' ? 'Done' : a.status === 'Blocked' ? 'Blocked' : 'To Do', _at: a._at }));
    return { project: { name: p.name, customer: p.customer }, date, stages: L ? L.list.map(x => ({ n: x.s.n, name: x.s.name, status: ST[x.status] || x.status })) : [],
      plan: ((F.doc('plan_struct') || {}).rows || []), tasks: I().list('task').concat(acts), raid: I().list('raid'), crs: I().list('cr'),
      signoffs: I().list('signoff').map(x => Object.assign({}, x, { title: SO[x.id] || x.id, _at: x.signedAt || x._at })), weekly: I().list('rep').filter(r => r.type === 'WSR').map(r => ({ date: r.periodEnd, title: r.title })) };
  }
  const fileName = r => String((S.project && (S.project.customer || S.project.name)) || 'Project').replace(/[^\w-]+/g, '-') + '-' + (r.type === 'WSR' ? 'WSR' : 'Monthly-report') + '-' + (r.periodEnd || 'draft') + '.html';
  const pillOf = r => (r.status === 'sent' ? V.tag('green', 'Sent') : r.status === 'ready' ? V.tag('blue', 'Ready to send') : V.tag('tbc', 'Draft'));
  const sec = (t, d, inner) => '<section class="st-sec"><div class="st-side"><h3>' + t + '</h3>' + (d ? '<p>' + d + '</p>' : '') + '</div><div class="card st-card">' + inner + '</div></section>';
  const seg = (items, cur, act) => '<div class="seg" role="group">' + items.map(x => '<button type="button" class="' + (x[0] === cur ? 'on' : '') + '" aria-pressed="' + (x[0] === cur) + '" data-act="' + act + '" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
  const frame = h => '<iframe sandbox="" title="Report preview" srcdoc="' + esc(h) + '" style="width:100%;height:620px;border:1px solid #e4e7ec;border-radius:10px;background:#fff"></iframe>';

  V.statusrep = { html() {
    if (V.isCustomer()) return '';
    I().load(KINDS); const head = '<div class="page-header"><div class="t"><h1>Status reports</h1><p>The weekly status report (WSR) and the monthly report, made from where the project really is: its stages, plan, tasks, risks and sign-offs.</p></div></div>';
    if (!I().ready(KINDS)) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const s = st(), ro = S.readonly, list = reps(), dr = drafts(), t = V.today();
    const pick = wk() ? '<label class="f">Reporting date</label><input type="date" id="srDate" max="' + t + '" value="' + esc(s.date || t) + '" data-change="srDate">' : '<label class="f">Month</label><input type="month" id="srMonth" max="' + t.slice(0, 7) + '" value="' + esc(s.month || t.slice(0, 7)) + '" data-change="srMonth">';
    const make = '<div class="card-b" style="display:grid;gap:12px">' + seg([['WSR', 'Weekly report (WSR)'], ['Monthly', 'Monthly report']], s.tab, 'srTab') + '<div>' + pick + '</div>'
      + '<textarea id="srNote" rows="2" maxlength="600" placeholder="' + (wk() ? 'Anything Claude must stress this week? For example: the customer has not yet signed the BRD.' : 'Anything Claude must stress this month?') + '"' + (ro ? ' disabled' : '') + '>' + esc(s.note || '') + '</textarea></div>'
      + '<div class="st-foot"><span class="small muted">Build uses the Studio records now. Ask Claude writes the narrative as well and checks the stages; its answer shows below as a draft.</span><button class="btn" data-act="srBuild"' + (ro ? ' disabled' : '') + '>Build from the Studio</button><button class="btn primary" data-act="srAsk"' + (ro ? ' disabled' : '') + '>Ask Claude</button></div>';
    const row = r => '<tr><td><b>' + esc(r.periodStart ? V.fmtDate(r.periodStart) + ' to ' + V.fmtDate(r.periodEnd) : V.fmtDate(r.periodEnd)) + '</b></td><td>' + pillOf(r) + '</td><td class="small">' + esc(r.htmlBy || (r.html ? 'Studio' : 'Text only')) + '</td><td class="acts">'
      + (r.html ? '<button class="btn sm" data-act="srView" data-id="' + esc(r.id) + '">' + (s.open === r.id ? 'Hide' : 'Preview') + '</button><button class="btn sm" data-act="srDl" data-id="' + esc(r.id) + '">Download HTML</button>' : '') + '<button class="btn sm" data-act="repOpen" data-id="' + esc(r.id) + '">E-mail and status</button></td></tr>';
    const open = list.find(r => r.id === s.open && r.html);
    const hist = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Period</th><th>Status</th><th>Made by</th><th></th></tr></thead><tbody>' + (list.map(row).join('') || '<tr><td colspan="4" class="empty">None on record yet.</td></tr>') + '</tbody></table></div>' + (open ? '<div style="margin-top:14px">' + frame(open.html) + '</div>' : '');
    const dsec = dr.length ? sec('From Claude', 'Claude\'s finished HTML, waiting for you. Preview it, then record it as this period\'s report.', '<div class="card-b">' + dr.map(d => '<div class="ev-row" style="align-items:center"><span class="ev-t"><b>' + esc(d.title || 'Report') + '</b> <span class="xs muted">' + esc(V.fmtDate(String(d._created || '').slice(0, 10))) + '</span></span><button class="btn link sm" data-act="srDraftView" data-id="' + esc(d.id) + '">' + (s.open === d.id ? 'Hide' : 'Preview') + '</button><button class="btn sm" data-act="srUse" data-id="' + esc(d.id) + '"' + (ro ? ' disabled' : '') + '>Record as ' + (wk() ? 'this week\'s' : 'this month\'s') + ' report</button></div>').join('') + (dr.find(d => d.id === s.open) ? '<div style="margin-top:12px">' + frame(dr.find(d => d.id === s.open).content) + '</div>' : '') + '</div>') : '';
    return head + '<div class="page-body st-page st-wrap">' + sec(wk() ? 'Make the weekly report' : 'Make the monthly report', wk() ? 'The WSR follows the Facilio format: executive summary, milestones, completed, ongoing and upcoming work, dependencies, risks and the closing summary.' : 'The monthly report gives the overall view of the month: stages, what was achieved, what slipped, risks, change requests and the weekly reports.', make)
      + dsec + sec(wk() ? 'Weekly reports on record' : 'Monthly reports on record', 'Every report stays here with its status, so the history of the project is kept week by week.', '<div class="card-b">' + hist + '</div>') + '</div>';
  }, mount() { I().load(KINDS); } };

  const note = () => (document.getElementById('srNote') || {}).value || '';
  ACT.srTab = a => { st().note = note(); st().tab = a.getAttribute('data-v'); st().open = ''; V.render(); };
  ACT.srDate = a => { st().date = a.value; };
  ACT.srMonth = a => { st().month = a.value; };
  ACT.srView = a => { const id = a.getAttribute('data-id'); st().open = st().open === id ? '' : id; st().note = note(); V.render(); };
  ACT.srDraftView = ACT.srView;
  ACT.srDl = a => { const r = I().get('rep', a.getAttribute('data-id')); if (r && r.html) V.download(fileName(r), r.html, 'text/html'); };
  ACT.srBuild = a => V.busy(a, async () => {
    const s = st(); if (!V.lifeStages || !V.lifeStages()) { V.toast('The project stages are still loading. Try again in a moment.', 5000, true); return; }
    const date = reportDate(); const rep = W.build(snapshot(date), wk() ? 'week' : 'month'); const P = rep.period; const dup = I().list('rep').find(r => r.type === s.tab && r.periodEnd === P.to && r.htmlBy === 'Studio' && r.status === 'draft');
    const rec = { type: s.tab, title: wk() ? 'Weekly status report' : 'Monthly report', periodStart: P.from, periodEnd: P.to, due: P.to, status: 'draft', content: W.text(rep), html: W.html(rep), htmlBy: 'Studio', recipients: '', cc: '', attachments: [] };
    const id = dup ? dup.id : I().uid('rp'); await I().put('rep', id, dup ? Object.assign({}, dup, rec) : rec); s.open = id; V.toast(dup ? 'Report rebuilt from the latest records.' : 'Report built. It is saved as a draft.', 5000); });
  ACT.srAsk = a => V.busy(a, async () => { const J = V.studioJobs; if (!J || J.guard()) return; const r = W.askJob(wk() ? 'week' : 'month', reportDate(), note()); if (!r.ok) { V.toast(r.error, 5000, true); return; }
    const out = await J.post('/jobs', r.job); st().note = ''; V.toast(out && out.duplicate ? 'Claude already has this request.' : 'Sent. Claude\'s report will show on this page and in the Assistant panel when it is ready.', 6000); V.render(); });
  ACT.srUse = a => V.busy(a, async () => {
    const s = st(); const d = I().get('ai', a.getAttribute('data-id')); if (!d) return; const date = reportDate(); const P = W.periodOf(date, wk() ? 'week' : 'month');
    const dup = I().list('rep').find(r => r.type === s.tab && r.periodEnd === P.to);
    if (dup && dup.status === 'sent') { V.toast('The report for this period was already sent. Choose another date or month first.', 6000, true); return; }
    const rec = { type: s.tab, title: wk() ? 'Weekly status report' : 'Monthly report', periodStart: P.from, periodEnd: P.to, due: P.to, status: 'draft', content: String(d.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000), html: d.content, htmlBy: 'Claude', recipients: '', cc: '', attachments: [] };
    const id = dup ? dup.id : I().uid('rp'); await I().put('rep', id, dup ? Object.assign({}, dup, rec) : rec); await I().put('ai', d.id, Object.assign({}, d, { recorded: id })); s.open = id; V.toast('Recorded. It is a draft until you mark it sent.', 5000); });
})(typeof window !== 'undefined' ? window : globalThis);
