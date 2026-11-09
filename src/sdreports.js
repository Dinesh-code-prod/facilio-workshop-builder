/* Reports tab of the dashboards (V.sdReports): a status report, a stage report, and for admin a portfolio report.
   Each report is built once as a small model (sections of text, key figures and tables) from saved records only, then drawn as a printable page
   (the print stylesheet in src/ui.css shows only the report) and exported as CSV from the same model, so the page and the file always agree.
   A customer's reports leave out internal tasks, fees and notes (V.isCustomer, V.custShow). Read-only. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  if (!V || !V.sdd || !V.sdc) return;
  const D = V.sdd; const C = V.sdc; const fd = D.fd;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const list = k => (I().ready([k]) ? I().list(k) : []);
  const pct = D.pct;
  let LAST = null;   // the model on screen, for the CSV button

  // ---------- model -> page and CSV ----------
  function draw(m) {
    const sec = s => `<section class="sd-rs"><h2>${esc(s.h)}</h2>${(s.p || []).map(t => `<p>${esc(t)}</p>`).join('')}${s.kv ? `<dl class="sd-kv2">${s.kv.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${s.cols ? (s.rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${s.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : C.none(s.empty || 'Nothing recorded.')) : ''}</section>`;
    return `<article class="sd-report" id="sd-report"><header><span class="sd-rk">${esc(m.kind)}</span><h1>${esc(m.title)}</h1><p>${esc(m.sub)}</p></header>${m.sections.map(sec).join('')}<footer>Generated from the saved project records on ${esc(fd(V.today()))}. Nothing here is estimated.</footer></article>`;
  }
  function toCsv(m) {
    const q = v => '"' + String(F.csvText(v == null ? '' : String(v))).replace(/"/g, '""') + '"'; const out = [[m.kind], [m.title], [m.sub], []];
    m.sections.forEach(s => { out.push([s.h]); (s.p || []).forEach(t => out.push([t])); (s.kv || []).forEach(r => out.push(r)); if (s.cols) { out.push(s.cols); s.rows.forEach(r => out.push(r)); if (!s.rows.length) out.push([s.empty || 'Nothing recorded.']); } out.push([]); });
    return '﻿' + out.map(r => r.map(q).join(',')).join('\r\n');
  }
  const bar = (modes, cur, extra) => `<div class="sd-rbar no-print"><div class="tabs" role="tablist" aria-label="Report">${modes.map(([id, l]) => `<button type="button" role="tab" aria-selected="${cur === id}" class="tab${cur === id ? ' active' : ''}" data-act="sdRepMode" data-v="${id}">${esc(l)}</button>`).join('')}</div>${extra || ''}<span class="sd-rsp"></span><button type="button" class="btn sm" data-act="sdCsv">Download CSV</button><button type="button" class="btn sm primary" data-act="sdPrint">Print or save as PDF</button></div>`;
  const selHtml = (act, opts, cur, label) => `<label class="sd-rsel">${esc(label)}<select data-change="${act}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;

  // ---------- status report (team and customer) ----------
  function statusModel(c) {
    const A = D.areas(c), ov = D.overall(A); const p = S.project || {}; const k = c.k; const cur = c.ph.cur >= 0 ? c.ph.info[c.ph.cur] : null; const ad = c.due.length ? pct(c.hit.length, c.due.length) : null;
    const conf = c.R.filter(r => r.status === 'Confirmed').length; const upcoming = (c.ph.info || []).filter(x => x.start && x.start >= c.today).slice(0, 5);
    const sum = ['Overall status: ' + D.OV[ov] + (A.filter(x => x.s === 'r').length ? ' (' + A.filter(x => x.s === 'r').map(x => x.l).join(', ') + ' red)' : A.filter(x => x.s === 'a').length ? ' (' + A.filter(x => x.s === 'a').map(x => x.l).join(', ') + ' amber)' : '') + '.',
      cur ? 'The project is at plan step ' + (cur.i + 1) + ' of 12, ' + cur.title + (V.stageOfStep ? ', in stage ' + V.stageOfStep(cur.i) + ' (' + V.roadmapName(V.stageOfStep(cur.i)) + ')' : '') + '.' : 'The plan has not started or has no dates yet.',
      c.spi == null ? 'There is no dated plan, so schedule progress cannot be measured yet.' : 'Delivery is ' + c.st.actual + '% done against ' + c.st.planned + '% planned (schedule performance index ' + c.spi.toFixed(2) + ').',
      'Scope: ' + c.R.length + ' requirements, ' + conf + ' confirmed; ' + c.crOpen.length + ' change request' + (c.crOpen.length === 1 ? '' : 's') + ' open.',
      c.st.goLive ? 'Go-live is planned for ' + fd(c.st.goLive) + (c.goDays == null ? '' : c.goDays >= 0 ? ' (' + c.goDays + ' days from today).' : ' (date has passed).') : 'No go-live date is set in the plan.'];
    const S2 = [{ h: 'Executive summary', p: sum },
      { h: 'Status by area', cols: ['Area', 'Status', 'Why'], rows: A.map(x => [x.l, C.RAG[x.s][0], x.d]) },
      { h: 'Schedule', kv: [['Done', c.spi == null ? 'No dated plan' : c.st.actual + '%'], ['Planned', c.spi == null ? 'No dated plan' : c.st.planned + '%'], ['Schedule performance index', c.spi == null ? '—' : c.spi.toFixed(2)], ['Milestone adherence', ad == null ? 'No plan step due yet' : ad + '% (' + c.hit.length + ' of ' + c.due.length + ' due steps Done)'], ['Go-live', c.st.goLive ? fd(c.st.goLive) : 'Not set']], cols: ['Next plan steps', 'Start', 'End'], rows: upcoming.map(x => [x.title, fd(x.start), fd(x.end)]), empty: 'No later plan steps have dates.' },
      { h: 'Scope', kv: [['Requirements', String(c.R.length)], ['Confirmed', c.R.length ? conf + ' (' + pct(conf, c.R.length) + '%)' : '0'], ['Open change requests', String(c.crOpen.length)], ['Test cases', c.tcs.length ? c.tcs.length + ', ' + c.passed + ' passed, ' + c.failed + ' failed or blocked' : 'None yet']] }];
    if (!k) S2.push({ h: 'Delivery', kv: (() => { const t = list('task'), o = t.filter(x => !['Done', 'Cancelled'].includes(x.status)); const late = o.filter(x => (x.due && x.due < c.today) || (x.eta && x.eta < c.today)); return [['Open tasks', String(o.length)], ['Overdue tasks', String(late.length)], ['Blocked tasks', String(o.filter(x => x.status === 'Blocked').length)], ['Open UAT defects', c.iOpen.length + ' (' + c.openBy('Critical') + ' critical, ' + c.openBy('Major') + ' major)']]; })() });
    if (!k || V.custShow('risks')) S2.push({ h: 'Risks and issues', cols: ['Item', 'Type', 'Impact', 'Owner', 'Due'], rows: c.raidOpen.sort((a, b) => (b.impact === 'High') - (a.impact === 'High')).slice(0, 8).map(x => [x.title || '—', x.type || '—', x.impact || '—', x.owner || '—', x.due ? fd(x.due) : '—']), empty: 'No open items in the RAID log.' });
    if (!k && V.dk && V.dk.pains) S2.push({ h: 'Pain points and pending', cols: ['Pain point', 'Severity', 'Where to fix it'], rows: V.dk.pains(c).map(x => [x.text, x.sev === 'bad' ? 'Needs action now' : 'Needs a nudge', x.go]), empty: 'Nothing is late, blocked or waiting.' });
    const acts = c.actsOpen.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 8);
    S2.push({ h: 'Next steps', cols: ['Action', 'Side', 'Due'], rows: acts.map(a => [String(a.text || 'Action').slice(0, 90), V.sideLabel ? V.sideLabel(a.side || 'facilio') : (a.side || 'facilio'), a.due ? fd(a.due) + (a.due < c.today ? ' (late)' : '') : '—']), empty: 'No open actions.' });
    return { kind: 'Status report', title: (p.name || 'Project') + ' · status report', sub: (p.customer ? p.customer + ' · ' : '') + 'as of ' + fd(c.today), sections: S2, file: 'status-report' };
  }
  const SMAP = { 1: 'kickoff', 2: 'req', 3: 'brd', 4: 'build', 5: 'build', 7: 'live', 8: 'handover' };
  function stageModel(c) {
    const allowed = D.STG.filter(s => !c.k || ['req', 'brd', 'build', 'live'].includes(s.id)); const def = (allowed.find(s => s.id === SMAP[c.ph.cur >= 0 && V.stageOfStep ? V.stageOfStep(c.ph.cur) : 0]) || allowed[0]);
    const sel = allowed.find(s => s.id === S.ui.sdRepStage) || def; const d = D.stageData(sel.id); const p = S.project || {};
    const kv = d.r.kpis.map(a => [a[0], String(a[1]).replace(/<[^>]*>/g, '') + (a[2] ? ' · ' + String(a[2]).replace(/<[^>]*>/g, '') : '')]);
    return { kind: 'Stage report', title: (p.name || 'Project') + ' · ' + sel.label, sub: (p.customer ? p.customer + ' · ' : '') + 'as of ' + fd(c.today), sections: [{ h: 'Key figures', kv }].concat(d.tables.map(t => ({ h: t.title, cols: t.cols, rows: t.rows.map(r => r.map(x => (x == null ? '' : String(x)))), empty: 'Nothing recorded for this yet.' }))), file: 'stage-report-' + sel.id, stages: allowed, sel: sel.id };
  }
  function page() {
    const c = D.X(); const mode = S.ui.sdRepMode === 'stage' ? 'stage' : 'status';
    let m, extra = '';
    if (mode === 'stage') { m = stageModel(c); extra = selHtml('sdRepStageSel', m.stages.map(s => [s.id, s.label]), m.sel, 'Stage'); } else m = statusModel(c);
    const wsr = V.isCustomer() ? '' : '<p class="small muted" style="margin:0 0 10px">The weekly and monthly status reports (WSR) are made on their own page. <button type="button" class="btn link sm" data-act="nav" data-view="statusrep">Open Status reports</button></p>';
    LAST = m; return `<div class="sd-reports">${bar([['status', 'Status report'], ['stage', 'Stage report']], mode, extra)}${wsr}${draw(m)}</div>`;
  }
  ACT.sdRepMode = a => { S.ui.sdRepMode = a.getAttribute('data-v'); V.render(); };
  ACT.sdRepStageSel = el => { S.ui.sdRepStage = el.value; V.render(); };

  // ---------- portfolio report (admin) ----------
  const fmt = n => Math.round(n || 0).toLocaleString('en-US');
  function money(sub) { const g = {}; sub.forEach(p => { const mo = p.metrics && p.metrics.money; if (!mo) return; const c = mo.currency || 'No currency'; (g[c] = g[c] || []).push(p); });
    return Object.keys(g).map(c => { const f = k => g[c].reduce((n, p) => n + p.metrics.money[k], 0); const risk = g[c].filter(p => ['at_risk', 'overdue', 'blocked'].includes(p.health)).reduce((n, p) => n + p.metrics.money.contract, 0); return [c, String(g[c].length), fmt(f('contract')), fmt(f('billed')), fmt(f('next60')), fmt(f('crConverted')), fmt(f('crPending')), fmt(risk)]; }); }
  function portfolio(ps) {
    const flt = 0; const sub = ps; const m = p => p.metrics || {}; const today = V.today(); const sum = f => sub.reduce((n, p) => n + D.num(f(p)), 0);
    const H = h => sub.filter(p => p.health === h).length; const stageName = n => (D.RSTG.find(x => x[0] === n) || [0, 'No stage yet'])[1];
    const gl = sub.filter(p => m(p).target && m(p).target >= today).sort((a, b) => m(a).target.localeCompare(m(b).target))[0];
    const Cm = V.cmd && V.cmd.get && V.cmd.get(); const sigs = (Cm && Cm.signals) || []; const own = (Cm && Cm.workload && Cm.workload.owners) || [];
    const secs = [{ h: 'Executive summary', p: [sub.length + ' active project' + (sub.length === 1 ? '' : 's') + (flt ? ' in the stage ' + stageName(flt) : '') + ': ' + H('on_track') + ' on track (' + pct(H('on_track'), sub.length) + '%), ' + H('at_risk') + ' at risk, ' + H('overdue') + ' overdue, ' + H('blocked') + ' blocked, ' + H('insufficient') + ' without enough data.',
        sum(p => m(p).openTasks) + ' open tasks, ' + sum(p => m(p).overdueTasks) + ' of them overdue; ' + sum(p => m(p).custWaiting) + ' items are waiting on customers.', gl ? 'Next target date: ' + gl.name + ' on ' + fd(m(gl).target) + '.' : 'No project in view has a future target date.'] },
      { h: 'Health mix', cols: ['Health', 'Projects', 'Share'], rows: D.ORDER.map(h => [D.HL[h], String(H(h)), pct(H(h), sub.length) + '%']) },
      { h: 'Projects by stage', cols: ['Stage', 'Projects', 'On track', 'At risk', 'Overdue or blocked'], rows: D.RSTG.slice(1).map(([id, l]) => { const g = ps.filter(p => D.rstageOf(p) === id); return [l, String(g.length), String(g.filter(p => p.health === 'on_track').length), String(g.filter(p => p.health === 'at_risk').length), String(g.filter(p => p.health === 'overdue' || p.health === 'blocked').length)]; }) },
      { h: 'Projects', cols: ['Project', 'Customer', 'Health', 'Plan step', 'Next milestone', 'Target', 'Open tasks', 'Overdue', 'Waiting on customer', 'Days since activity'], rows: sub.slice().sort((a, b) => D.ORDER.indexOf(a.health) - D.ORDER.indexOf(b.health)).map(p => [p.name, p.customer || '—', D.HL[p.health] || p.health || '—', m(p).stageTitle || '—', m(p).nextMilestone ? m(p).nextMilestone.title + ' (' + fd(m(p).nextMilestone.date) + ')' : '—', fd(m(p).target), String(D.num(m(p).openTasks)), String(D.num(m(p).overdueTasks)), String(D.num(m(p).custWaiting)), m(p).idleDays == null ? '—' : String(m(p).idleDays)]), empty: 'No active project in view.' },
      { h: 'Finance by currency', cols: ['Currency', 'Projects', 'Contract value', 'Billable to date', 'Billable in 60 days', 'Change orders converted', 'Change orders pending', 'Value at risk'], rows: money(sub), empty: 'No contract fees or change-order prices are recorded. Currencies are never added together; delivery cost and margin are not tracked.' },
      { h: 'Warning signals', cols: ['Severity', 'Area', 'Project', 'Signal'], rows: sigs.filter(g => !flt || sub.some(p => p.name === g.project)).slice(0, 12).map(g => [g.sev || '—', g.cat || '—', g.project || '—', g.title || '—']), empty: 'No warning signals.' }];
    const model = { kind: 'Portfolio report', title: 'Delivery portfolio · status report', sub: (flt ? stageName(flt) + ' · ' : 'All stages · ') + 'as of ' + fd(today), sections: secs, file: 'portfolio-report' }; LAST = model;
    return `<div class="sd-reports">${bar([['portfolio', 'Portfolio report']], 'portfolio', '')}${draw(model)}</div>`;
  }
  ACT.sdRepFilterSel = el => { S.ui.sdRepFilter = Number(el.value) || 0; V.setMode('admin'); };

  // ---------- print and CSV ----------
  ACT.sdPrint = () => { if (!LAST) return; const b = document.body; const done = () => { b.classList.remove('sd-printing'); root.removeEventListener('afterprint', done); }; b.classList.add('sd-printing'); root.addEventListener('afterprint', done); setTimeout(() => root.print(), 50); };
  ACT.sdCsv = () => { if (!LAST) return; try { V.download(LAST.file + '-' + V.today() + '.csv', toCsv(LAST), 'text/csv;charset=utf-8'); } catch (e) { V.toast(e.message || 'Could not make the file', 5000, true); } };

  V.sdReports = { page, portfolio, statusModel, toCsv };
})(typeof window !== 'undefined' ? window : globalThis);
