/* Status reports (weekly WSR and monthly): the pure rules (tests/wsr.mjs). No network, no browser.
   build(snapshot, kind) turns the project records into the report in the shape of the Facilio WSR deck (cover, executive summary, milestone overview,
   completed, ongoing, upcoming, dependencies, risks and issues, closing summary); kind is 'week' or 'month'. html(report) is one self-contained file.
   Nothing is invented: a date the records do not hold shows "Not recorded", an empty table says so, and the overall status always carries its reason.
   snapshot: { project:{name,customer}, date:'YYYY-MM-DD', stages:[{n,name,status}], plan:[{title,phase,start,end,owner,status,pct,ms,actual}],
               tasks:[{title,owner,due,status,_at}], raid:[{type,title,impact,owner,due,mitigation,status}], signoffs:[{title,status,_at}], crs:[{title,status,_at}], weekly:[{date,title}] } */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const tt = x => String((x && (x.title || x.text || x.name || x.desc)) || '').replace(/\s+/g, ' ').trim();
  const D = v => String(v || '').slice(0, 10);
  const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const inR = (d, a, b) => !!d && D(d) >= a && D(d) <= b;
  const fmt = d => (/^\d{4}-\d\d-\d\d$/.test(D(d)) ? D(d).split('-').reverse().join('-') : 'Not recorded');
  const PLAN_ST = { Done: 'Completed', 'In progress': 'In Progress', Blocked: 'Blocked', 'Not started': 'Yet to Start' };
  const OPEN_T = s => !['Done', 'Cancelled'].includes(s);
  const WAIT = ['Awaiting Customer', 'Awaiting Internal Input'];
  const HIGH = r => r.status !== 'Closed' && ['R', 'I', 'Risk', 'Issue'].includes(r.type || 'R') && String(r.impact || '').toLowerCase() === 'high';

  function periodOf(date, kind) {
    if (kind === 'month') { const a = D(date).slice(0, 8) + '01'; const nx = new Date(Date.parse(a + 'T00:00:00Z')); nx.setUTCMonth(nx.getUTCMonth() + 1); const n0 = nx.toISOString().slice(0, 10); return { from: a, to: add(n0, -1), ahead: add(n0, 30), label: new Date(a + 'T00:00:00Z').toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }; }
    return { from: add(date, -6), to: date, ahead: add(date, 14), label: fmt(add(date, -6)) + ' to ' + fmt(date) };
  }
  const planRow = (r, date) => {
    const late = r.status !== 'Done' && r.end && r.end < date; const left = r.end ? days(date, r.end) : 999;
    const risk = r.status === 'Done' ? '' : (r.status === 'Blocked' || late) ? 'High Risk' : (left <= 7 && (r.pct || 0) < 50) ? 'Medium Risk' : 'Low Risk';
    const remark = late ? days(r.end, date) + ' day' + (days(r.end, date) === 1 ? '' : 's') + ' past the planned end' : r.status === 'Blocked' ? 'Blocked' : '';
    return { late: !!late, cells: [tt(r), r.owner || 'Not recorded', fmt(r.start), fmt(r.end), r.status === 'Done' ? fmt(r.actual) : '', PLAN_ST[r.status] || r.status || 'Yet to Start', risk, remark] };
  };

  function overall(stages, rows, raid) {
    const blocked = stages.filter(s => s.status === 'Blocked'), delayed = stages.filter(s => s.status === 'Delayed'), late = rows.filter(r => r.late), high = raid.filter(HIGH);
    const why = [];
    if (blocked.length) why.push('blocked stage: ' + blocked.map(s => s.name).join(', '));
    if (delayed.length) why.push('delayed stage: ' + delayed.map(s => s.name).join(', '));
    if (late.length) why.push(late.length + ' plan task' + (late.length === 1 ? ' is' : 's are') + ' past the planned end');
    if (high.length) why.push(high.length + ' high-impact risk or issue open');
    const rag = blocked.length || late.length >= 3 ? 'Off track' : why.length ? 'At risk' : 'On track';
    return { rag, why: why.length ? why.join('; ') + '.' : 'No stage is delayed or blocked, no plan task is past its end and no high-impact risk is open.' };
  }

  function build(snap, kind) {
    kind = kind === 'month' ? 'month' : 'week'; const date = D(snap.date); const P = periodOf(date, kind); const proj = snap.project || {};
    const stages = arr(snap.stages), plan = arr(snap.plan).slice().sort((a, b) => String(a.start).localeCompare(String(b.start))), tasks = arr(snap.tasks), raid = arr(snap.raid);
    const rows = plan.map(r => planRow(r, date)); const cur = stages.find(s => ['Current', 'Delayed', 'Blocked', 'Ready to close'].includes(s.status));
    const ov = overall(stages, rows, raid); const SEC = [];
    const sec = (id, title, cols, data, empty, note) => SEC.push({ id, title, cols, rows: data, empty, note: note || '' });
    sec('stages', 'Project stages', ['Stage', 'Status'], stages.map(s => [s.n + '. ' + s.name, s.status]), 'No stage information is recorded yet.', 'Taken from the Project cycle page: a stage is complete only when its records are complete or a person closed it.');
    const cap = rows.slice(0, 30); sec('milestones', 'Milestone Overview', ['Task', 'Owner', 'Planned start', 'Planned end', 'Actual end', 'Status', 'Risk category', 'Remarks'], cap.map(r => r.cells), 'The project plan has no tasks yet.', rows.length > 30 ? (rows.length - 30) + ' more tasks are in the project plan.' : '');
    const done = [].concat(plan.filter(r => r.status === 'Done' && inR(r.actual || r.end, P.from, P.to)).map(r => [tt(r), 'Plan task', r.owner || 'Not recorded', 'Completed', 'Ended ' + fmt(r.actual || r.end)]),
      tasks.filter(t => t.status === 'Done' && inR(t._at, P.from, P.to)).map(t => [tt(t), 'Task', t.owner || 'Not recorded', 'Completed', 'Closed ' + fmt(t._at)]),
      arr(snap.signoffs).filter(x => x.status === 'signed' && inR(x._at, P.from, P.to)).map(x => [tt(x), 'Sign-off', 'Customer', 'Signed', 'Signed ' + fmt(x._at)]));
    sec('completed', kind === 'month' ? 'Achieved this month' : 'Completed Activities', ['Task / module', 'Type', 'Owner', 'Status', 'Notes / updates'], done, 'Nothing was recorded as completed in this period.');
    const going = [].concat(plan.filter(r => r.status === 'In progress').map(r => [tt(r), 'Plan task', r.owner || 'Not recorded', 'In Progress', (r.pct || 0) + '% done, planned end ' + fmt(r.end)]),
      tasks.filter(t => ['In Progress', 'In Review'].includes(t.status)).map(t => [tt(t), 'Task', t.owner || 'Not recorded', t.status, t.due ? 'Due ' + fmt(t.due) : 'No due date']));
    sec('ongoing', 'Ongoing Activities', ['Task / module', 'Type', 'Owner', 'Status', 'Notes / updates'], going, 'No work is marked in progress.');
    const next = [].concat(plan.filter(r => r.status === 'Not started' && inR(r.start, add(date, 1), P.ahead)).map(r => [tt(r), r.owner || 'Not recorded', 'Yet to Start', fmt(r.start), 'Planned ' + fmt(r.start) + ' to ' + fmt(r.end)]),
      tasks.filter(t => OPEN_T(t.status) && t.status !== 'In Progress' && inR(t.due, date, P.ahead)).map(t => [tt(t), t.owner || 'Not recorded', t.status || 'To Do', fmt(t.due), 'Task due ' + fmt(t.due)]));
    sec('upcoming', kind === 'month' ? 'Planned for next month' : 'Upcoming Activities', ['Task / module', 'Owner', 'Status', 'ETA', 'Notes / updates'], next, 'Nothing is planned in the coming ' + (kind === 'month' ? 'month' : 'two weeks') + '.');
    const dep = [].concat(raid.filter(r => r.type === 'D' && r.status !== 'Closed').map(r => [tt(r), 'Dependency', r.owner || 'Not recorded', fmt(r.due), r.mitigation || '']),
      tasks.filter(t => WAIT.includes(t.status)).map(t => [tt(t), t.status, t.owner || 'Not recorded', fmt(t.due), '']),
      arr(snap.signoffs).filter(x => x.status === 'requested').map(x => [tt(x), 'Sign-off requested', 'Customer', 'Not recorded', 'Waiting for the signature']));
    sec('dependencies', 'Dependencies / Action Items', ['Item', 'Type', 'Owner', 'ETA', 'Notes / updates'], dep, 'No open dependency or waiting item is recorded.');
    const rk = raid.filter(r => r.type !== 'D' && r.type !== 'A' && r.status !== 'Closed').sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.impact) - ['High', 'Medium', 'Low'].indexOf(b.impact));
    sec('risks', 'Risks & Issues', ['Item', 'Type', 'Owner', 'Impact', 'Mitigation'], rk.map(r => [tt(r), r.type === 'I' ? 'Issue' : 'Risk', r.owner || 'Not recorded', r.impact || 'Not recorded', r.mitigation || 'Not recorded']), 'No open risk or issue is recorded.');
    if (kind === 'month') {
      sec('changes', 'Change requests', ['Change request', 'Status'], arr(snap.crs).filter(c => inR(c._at, P.from, P.to)).map(c => [tt(c), c.status || 'Open']), 'No change request moved this month.');
      sec('weekly', 'Weekly reports of the month', ['Date', 'Report'], arr(snap.weekly).filter(w => inR(w.date, P.from, P.to)).map(w => [fmt(w.date), w.title || 'Weekly status report']), 'No weekly report was recorded this month.');
    }
    const hi = [];
    if (cur) hi.push('The project is in stage ' + cur.n + ': ' + cur.name + ' (' + cur.status + ').');
    hi.push(stages.filter(s => s.status === 'Completed').length + ' of ' + stages.filter(s => s.status !== 'Not applicable').length + ' stages are complete.');
    hi.push(done.length + ' item' + (done.length === 1 ? '' : 's') + ' completed ' + (kind === 'month' ? 'this month' : 'this week') + ', ' + going.length + ' in progress, ' + next.length + ' coming up.');
    if (rk.length) hi.push(rk.length + ' open risk' + (rk.length === 1 ? '' : 's') + ' or issue' + (rk.length === 1 ? '' : 's') + ', ' + rk.filter(HIGH).length + ' high impact.');
    const deviations = rows.filter(r => r.late).slice(0, 8).map(r => [r.cells[0], 'Behind plan: ' + r.cells[7]]);
    const focus = next.slice(0, 5).map(r => r[0]);
    return { kind, period: P, cover: { title: kind === 'month' ? 'MONTHLY STATUS REPORT' : 'WEEKLY STATUS REPORT', client: proj.customer || proj.name || '', project: proj.name || '', date, label: P.label }, summary: { rag: ov.rag, why: ov.why, highlights: hi, deviations },
      sections: SEC, closing: { rag: ov.rag, why: ov.why, risks: rk.slice(0, 5).map(tt), focus } };
  }

  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pill = t => { const x = String(t); const c = /complete|signed|on track/i.test(x) ? 'g' : /high|blocked|off track|delayed|late|behind/i.test(x) ? 'r' : /medium|at risk|yet|pending|requested|await/i.test(x) ? 'a' : /progress|current|ready/i.test(x) ? 'b' : ''; return c ? '<span class="p ' + c + '">' + e(x) + '</span>' : e(x); };
  const PILL_COL = /^(Status|Risk category|Impact)$/;
  const CSS = 'body{margin:0;background:#eef1f6;font:14px/1.5 Geist,"Segoe UI",Arial,sans-serif;color:#1b1f2a}.slide{background:#fff;max-width:1100px;margin:22px auto;padding:36px 44px;border-radius:12px;box-shadow:0 1px 3px rgba(20,30,60,.12);page-break-after:always}h1{margin:0 0 4px;font-size:34px;color:#1D1A5E;letter-spacing:.02em}h2{margin:0 0 14px;font-size:22px;color:#1D1A5E;border-bottom:3px solid #1570EF;padding-bottom:8px}.cover{min-height:380px;display:flex;flex-direction:column;justify-content:center}.cover .sub{font-size:18px;color:#475467}.bar{height:6px;width:90px;background:#E5197F;margin:18px 0}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1D1A5E;color:#fff;text-align:left;padding:8px 10px;font-weight:600}td{padding:7px 10px;border-bottom:1px solid #e4e7ec;vertical-align:top}tr:nth-child(even) td{background:#f7f9fc}.p{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;font-weight:600;background:#eef1f6;color:#344054}.p.g{background:#e3f7ea;color:#0c6b34}.p.r{background:#fde8e8;color:#b42318}.p.a{background:#fff4d6;color:#8a5a00}.p.b{background:#e3eeff;color:#1049a8}.note{color:#667085;font-size:12px;margin-top:8px}.empty{color:#667085;padding:14px 0}li{margin:5px 0}.rag{font-size:20px;font-weight:700}@media print{body{background:#fff}.slide{box-shadow:none;margin:0;border-radius:0}}';
  function html(r) {
    const c = r.cover; const tbl = s => '<h2>' + e(s.title) + '</h2>' + (s.rows.length ? '<table><thead><tr>' + s.cols.map(h => '<th>' + e(h) + '</th>').join('') + '</tr></thead><tbody>' + s.rows.map(row => '<tr>' + row.map((v, i) => '<td>' + (PILL_COL.test(s.cols[i]) || s.id === 'stages' && i === 1 ? pill(v) : e(v)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : '<div class="empty">' + e(s.empty) + '</div>') + (s.note ? '<div class="note">' + e(s.note) + '</div>' : '');
    const list = a => '<ul>' + a.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>';
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(c.title + ' · ' + c.client + ' · ' + c.label) + '</title><style>' + CSS + '</style></head><body>'
      + '<section class="slide cover"><h1>' + e(c.title) + '</h1><div class="bar"></div><div class="sub">Client: <b>' + e(c.client) + '</b></div><div class="sub">' + e(c.project && c.project !== c.client ? 'Project: ' + c.project : '') + '</div><div class="sub">' + (r.kind === 'month' ? 'Month: ' : 'Reporting date: ') + e(r.kind === 'month' ? c.label : fmt(c.date)) + '</div></section>'
      + '<section class="slide"><h2>Executive Summary</h2><p class="rag">Overall status: ' + pill(r.summary.rag) + '</p><p>' + e(r.summary.why) + '</p>' + list(r.summary.highlights) + (r.summary.deviations.length ? '<h3>Deviations from the plan</h3>' + list(r.summary.deviations.map(d => d[0] + ': ' + d[1])) : '') + '</section>'
      + r.sections.map(s => '<section class="slide">' + tbl(s) + '</section>').join('')
      + '<section class="slide"><h2>Closing Summary</h2><p class="rag">Overall status: ' + pill(r.closing.rag) + '</p><p>' + e(r.closing.why) + '</p><h3>Risks</h3>' + (r.closing.risks.length ? list(r.closing.risks) : '<div class="empty">No open risk is recorded.</div>') + '<h3>Key focus for ' + (r.kind === 'month' ? 'next month' : 'next week') + '</h3>' + (r.closing.focus.length ? list(r.closing.focus) : '<div class="empty">Nothing is planned yet.</div>') + '</section></body></html>';
  }
  /** the same report as plain text for the e-mail body and the Word export of the older Reports page */
  function text(r) { const L = ['Overall status: ' + r.summary.rag, r.summary.why, ''].concat(r.summary.highlights.map(x => '- ' + x)); r.sections.forEach(s => { L.push('', '## ' + s.title); if (!s.rows.length) L.push(s.empty); else s.rows.forEach(x => L.push('- ' + x.filter(Boolean).join(' | '))); }); return L.join('\n'); }
  /** the request for Claude: { ok, job } */
  function askJob(kind, date, note) {
    const k = kind === 'month' ? 'make_monthly' : 'make_wsr'; if (!/^\d{4}-\d\d-\d\d$/.test(String(date || ''))) return { ok: false, error: 'Choose the reporting date.' };
    return { ok: true, job: { kind: k, section: kind === 'month' ? D(date).slice(0, 7) : D(date), note: String(note || '').replace(/\s+/g, ' ').trim().slice(0, 600) || (kind === 'month' ? 'Monthly report for ' + D(date).slice(0, 7) : 'Weekly report to ' + D(date)) } };
  }
  const api = { build, html, text, askJob, periodOf, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWsr = api;
})(typeof window !== 'undefined' ? window : globalThis);
