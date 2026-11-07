/* Stage dashboards: the Dashboard page gets one mini dashboard per stage of the project, as tabs inside it, and a health lifecycle strip.
   - Team and customer (V.projdash): Overview | Kick-off | Requirements | BRD and sign-off | Build and UAT | Go-live and hypercare | Handover (a customer sees the stages that are theirs).
   - Admin (V.stageAdmin, drawn by the Dashboard's Stages tab): the same stages across every active project: how many sit in each, how healthy they are, and who needs attention.
   Every number is computed from saved records; a stage with nothing recorded says so. Read-only: nothing here writes data. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  if (!V || !V.projdash) return;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const fd = d => (d ? V.fmtDate(d) : '—');
  const KINDS = ['action', 'signoff', 'cr', 'task', 'hc', 'ugd', 'vid', 'lesson', 'utc', 'usecase', 'raid'];
  // one accent per stage (coss palette); used for the dot, the bar and the top edge, never for text
  const STG = [
    { id: 'kickoff', label: 'Kick-off', c: '#3b82f6' }, { id: 'req', label: 'Requirements', c: '#14b8a6' }, { id: 'brd', label: 'BRD and sign-off', c: '#ec4899' },
    { id: 'build', label: 'Build and UAT', c: '#f59e0b' }, { id: 'live', label: 'Go-live and hypercare', c: '#22c55e' }, { id: 'handover', label: 'Handover', c: '#0ea5e9' }
  ];
  const CUST_STG = ['req', 'brd', 'build', 'live'];
  const HC = { blocked: '#ef4444', overdue: '#f97316', at_risk: '#f59e0b', on_track: '#22c55e', insufficient: '#a3a3a3' };
  const HL = { blocked: 'Blocked', overdue: 'Overdue', at_risk: 'At risk', on_track: 'On track', insufficient: 'No data' };
  const list = k => (I().ready([k]) ? I().list(k) : []);
  const num = n => (n == null || isNaN(n) ? 0 : n);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const name = x => String(x.title || x.text || x.name || x.label || x.id || '').slice(0, 70);
  const closed = x => /^(done|closed|resolved|fixed|cancelled|complete|completed|signed)$/i.test(String(x.status || ''));

  // ---------- widgets ----------
  const kpi = (label, value, sub, c, p) => `<div class="sd-kpi" style="--c:${c}"><span class="sd-kl">${esc(label)}</span><b class="sd-kv">${value}</b><span class="sd-ks">${sub || ''}</span>${p == null ? '' : `<i class="sd-kb" aria-hidden="true"><u style="width:${Math.max(0, Math.min(100, p))}%"></u></i>`}</div>`;
  const widget = (title, sub, inner, span, c) => `<section class="sd-w sd-s${span || 6}"${c ? ` style="--c:${c}"` : ''}><header><h3>${esc(title)}</h3>${sub ? `<span>${esc(sub)}</span>` : ''}</header><div class="sd-b">${inner}</div></section>`;
  const none = t => `<p class="sd-none">${esc(t)}</p>`;
  const chipT = (t, tn) => `<span class="sd-chip ${tn || ''}">${esc(t)}</span>`;
  const tone = s => (/^(done|closed|resolved|fixed|signed|confirmed|passed|pass|complete|completed)$/i.test(s) ? 'ok' : /^(blocked|failed|fail|concern|overdue)$/i.test(s) ? 'bad' : /^(open|in progress|requested|draft|proposed|to confirm|pending)$/i.test(s) ? 'warn' : '');
  const table = (cols, rows, empty) => (rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : none(empty));
  const bars = rows => { const mx = Math.max(1, ...rows.map(r => r[1])); return `<ul class="sd-bars">${rows.map(([l, n, c]) => `<li><span>${esc(l)}</span><i><u style="width:${n / mx * 100}%;background:${c}"></u></i><b>${n}</b></li>`).join('')}</ul>`; };
  const grid = inner => `<div class="sd-grid">${inner}</div>`;
  const tabsHtml = (cur, items) => `<div class="tabs sd-tabs" role="tablist" aria-label="Dashboard stages">${items.map(([id, l, c]) => `<button type="button" role="tab" aria-selected="${cur === id}" class="tab${cur === id ? ' active' : ''}" data-act="sdTab" data-v="${esc(id)}">${c ? `<i class="sd-dot" style="background:${c}"></i>` : ''}${esc(l)}</button>`).join('')}</div>`;

  // ---------- the health lifecycle: the 12 plan steps as one strip ----------
  function lifecycle() {
    const p = V.phaseNow ? V.phaseNow() : { cur: -1, info: [] }; const today = V.today(); const st = V.planStats ? V.planStats() : { n: 0, actual: 0, planned: 0 };
    if (!p.info || !p.info.length) return '';
    const gv = st.actual - st.planned; const tn = !st.n ? '' : gv < -10 ? 'bad' : gv < 0 ? 'warn' : 'ok';
    const cells = p.info.map(x => {
      const done = x.i < p.cur, cur = x.i === p.cur, late = cur && x.end && x.end < today;
      const state = done ? 'done' : cur ? (late ? 'late' : 'now') : 'next';
      return `<li class="sd-step ${state}"><span class="sd-n">${done ? '✓' : x.i + 1}</span><b>${esc(x.title)}</b><small>${x.start ? esc(fd(x.start)) + (x.end ? ' – ' + esc(fd(x.end)) : '') : 'No dates yet'}</small></li>`;
    }).join('');
    return `<section class="sd-life" aria-label="Project health lifecycle"><header><h3>Project health lifecycle</h3><span class="sd-chip ${tn}">${!st.n ? 'No dated plan yet' : gv >= 0 ? (gv ? gv + ' points ahead of plan' : 'On plan') : -gv + ' points behind plan'}</span><span class="sd-sub">${p.cur >= 0 ? 'Step ' + (p.cur + 1) + ' of 12 · ' + esc(p.info[p.cur].title) : 'Plan not started'}</span></header><ol class="sd-steps">${cells}</ol>${st.n ? `<div class="sd-prog"><span>Done ${st.actual}%</span><i><u style="width:${st.planned}%"></u><em style="width:${st.actual}%"></em></i><span>Planned ${st.planned}%</span></div>` : ''}</section>`;
  }

  // ---------- one builder per stage; each returns the KPI cards and the widgets for that stage ----------
  const reqs = () => (S.ws && S.ws.requirements) || [];
  const B = {};
  B.kickoff = () => {
    const ppl = F.doc('people') || {}; const team = ppl.team || [], sk = ppl.stakeholders || []; const st = V.planStats ? V.planStats() : { n: 0 }; const p = V.phaseNow ? V.phaseNow() : { info: [] };
    const act = list('action').filter(a => !closed(a));
    const rows = team.concat(sk).filter(x => x.name).slice(0, 8).map(x => [esc(x.name), esc(x.role || '—'), esc(x.email || '—'), chipT(team.indexOf(x) >= 0 ? 'Facilio' : 'Customer', team.indexOf(x) >= 0 ? '' : 'pink')]);
    const next = (p.info || []).filter(x => x.start).slice(0, 5).map(x => [esc(x.title), esc(fd(x.start)), esc(fd(x.end))]);
    return { kpis: [kpi('Team members', team.length, 'on the implementation team', STG[0].c), kpi('Customer stakeholders', sk.length, 'named by the customer', STG[0].c), kpi('Plan steps dated', st.n || 0, 'of 12 standard steps', STG[0].c, pct(st.n || 0, 12)), kpi('Open actions', act.length, act.length ? 'to close before workshops' : 'nothing open', STG[0].c)],
      body: widget('People on the project', 'team and stakeholders', table(['Name', 'Role', 'Email', 'Side'], rows, 'No people added yet. Add them in Project settings.'), 7, STG[0].c) + widget('Plan, first steps', 'dates from the plan', table(['Step', 'Start', 'End'], next, 'No dates yet. Generate or import the plan.'), 5, STG[0].c) };
  };
  B.req = () => {
    const R = reqs(); const conf = R.filter(r => r.status === 'Confirmed').length, draft = R.filter(r => !r.status || r.status === 'Draft').length; const pl = F.doc('planner') || {}; const sess = pl.sessions || []; const tr = (F.doc('transcripts') || {}).items || [];
    const qo = ((S.ws && S.ws.questions) || []).filter(q => !q.answer && q.status !== 'Closed').length;
    const rows = R.slice(0, 8).map(r => [esc(r.id || ''), esc(name(r)), chipT(r.status || 'Draft', tone(r.status || 'Draft'))]);
    return { kpis: [kpi('Requirements', R.length, conf + ' confirmed', STG[1].c, pct(conf, R.length)), kpi('Sessions planned', sess.length, sess.filter(s => /complete|held|done/i.test(s.status || '')).length + ' held', STG[1].c), kpi('Transcripts', tr.length, 'added to the project', STG[1].c), kpi('Open questions', qo, qo ? 'waiting for an answer' : 'all answered', STG[1].c)],
      body: widget('Requirements by status', 'confirmed ones reach the BRD', bars([['Confirmed', conf, '#22c55e'], ['Draft', draft, '#f59e0b'], ['Other', Math.max(0, R.length - conf - draft), '#a3a3a3']]), 4, STG[1].c) + widget('Latest requirements', 'first eight', table(['ID', 'Requirement', 'Status'], rows, 'No requirements yet. Read the transcripts and confirm the findings.'), 8, STG[1].c) };
  };
  B.brd = () => {
    const rd = V.brdReadiness ? V.brdReadiness() : { blocking: 0, warning: 0, info: 0 }; const so = list('signoff'); const cr = list('cr'); const uc = list('usecase');
    const sg = id => so.find(x => x.id === id) || { status: 'notdue' }; const L = { notdue: 'Not due', requested: 'Waiting for signature', signed: 'Signed', concern: 'Concern raised' };
    const rowsS = [['brd', 'Requirements (BRD)'], ['uat', 'Testing (UAT)'], ['golive', 'Go-live']].map(([id, l]) => [esc(l), chipT(L[sg(id).status] || 'Not due', sg(id).status === 'signed' ? 'ok' : sg(id).status === 'requested' ? 'warn' : sg(id).status === 'concern' ? 'bad' : '')]);
    const rowsC = cr.slice(0, 6).map(x => [esc(name(x)), chipT(x.status || 'Open', tone(x.status || 'Open'))]);
    return { kpis: [kpi('Blocking checks', rd.blocking, rd.blocking ? 'to fix before sign-off' : 'none', STG[2].c), kpi('Warnings', rd.warning, 'worth a look', STG[2].c), kpi('Change requests', cr.filter(x => !closed(x)).length, cr.length + ' in total', STG[2].c), kpi('Use cases', uc.length, 'written for the BRD', STG[2].c)],
      body: widget('Sign-off journey', 'BRD, UAT and go-live', table(['Sign-off', 'Status'], rowsS, ''), 5, STG[2].c) + widget('Change requests', 'after the BRD is agreed', table(['Change', 'Status'], rowsC, 'No change requests. Changes after sign-off are logged here.'), 7, STG[2].c) };
  };
  B.build = () => {
    const mods = F.allModules ? F.allModules().filter(m => m.inScope) : []; const DONE = ['completed', 'reviewed_no_change', 'reviewed_changes']; const ms = m => (V.moduleStatus ? V.moduleStatus(m.name) : '');
    const reviewed = mods.filter(m => DONE.includes(ms(m))).length; const tc = list('utc'); const pass = tc.filter(x => /^pass/i.test(x.result || x.status || '')).length, fail = tc.filter(x => /^fail/i.test(x.result || x.status || '')).length;
    const tasks = list('task').filter(t => (t.type || (t.data && t.data.type)) === 'UAT Task' && !closed(t));
    const rows = mods.slice(0, 8).map(m => [esc(m.label || m.name), chipT((V.REVIEW && (V.REVIEW.find(x => x[0] === ms(m)) || [0, ms(m)])[1]) || ms(m) || 'Not started', DONE.includes(ms(m)) ? 'ok' : 'warn')]);
    return { kpis: [kpi('Modules in scope', mods.length, reviewed + ' reviewed', STG[3].c, pct(reviewed, mods.length)), kpi('UAT test cases', tc.length, pass + ' passed', STG[3].c, pct(pass, tc.length)), kpi('Failed cases', fail, fail ? 'need a fix and a re-test' : 'none failing', STG[3].c), kpi('Open UAT issues', tasks.length, tasks.length ? 'in the task register' : 'none open', STG[3].c)],
      body: widget('Test results', 'all UAT cases', bars([['Passed', pass, '#22c55e'], ['Failed', fail, '#ef4444'], ['Not run', Math.max(0, tc.length - pass - fail), '#a3a3a3']]), 4, STG[3].c) + widget('Module review', 'modules in scope', table(['Module', 'Review'], rows, 'No modules marked in scope yet.'), 8, STG[3].c) };
  };
  B.live = () => {
    const st = V.planStats ? V.planStats() : {}; const hc = list('hc'); const open = hc.filter(x => !closed(x)); const so = list('signoff'); const g = so.find(x => x.id === 'golive') || { status: 'notdue' }; const les = list('lesson');
    const dd = st.goLive && V.daysBetween ? V.daysBetween(V.today(), st.goLive) : null;
    const rows = hc.slice(0, 8).map(x => [esc(name(x)), esc(x.severity || x.priority || '—'), chipT(x.status || 'Open', tone(x.status || 'Open'))]);
    return { kpis: [kpi('Go-live', dd == null ? '—' : dd >= 0 ? dd + ' days' : 'Passed', st.goLive ? esc(fd(st.goLive)) : 'no date set', STG[4].c), kpi('Go-live sign-off', g.status === 'signed' ? 'Signed' : g.status === 'requested' ? 'Waiting' : 'Not due', 'customer approval', STG[4].c), kpi('Hypercare issues', open.length, hc.length + ' logged in total', STG[4].c, pct(hc.length - open.length, hc.length)), kpi('Lessons learned', les.length, 'kept for the next project', STG[4].c)],
      body: widget('Hypercare issues', 'after go-live', table(['Issue', 'Severity', 'Status'], rows, 'No hypercare issues logged. They appear here after go-live.'), 8, STG[4].c) + widget('Issue status', 'open and closed', bars([['Open', open.length, '#f59e0b'], ['Closed', hc.length - open.length, '#22c55e']]), 4, STG[4].c) };
  };
  B.handover = () => {
    const ug = list('ugd'), vd = list('vid'), les = list('lesson'); const so = list('signoff'); const signed = so.filter(x => x.status === 'signed').length;
    const rows = ug.concat(vd).slice(0, 8).map(x => [esc(name(x)), esc(vd.indexOf(x) >= 0 ? 'Video' : 'User guide'), chipT(x.status || 'Draft', tone(x.status || 'Draft'))]);
    return { kpis: [kpi('User guides', ug.length, 'for the customer team', STG[5].c), kpi('Videos', vd.length, 'walkthroughs', STG[5].c), kpi('Sign-offs done', signed + ' of 3', 'BRD, UAT, go-live', STG[5].c, pct(signed, 3)), kpi('Lessons learned', les.length, 'recorded', STG[5].c)],
      body: widget('Handover pack', 'guides and videos', table(['Item', 'Type', 'Status'], rows, 'The pack builds from the user guides and videos.'), 8, STG[5].c) + widget('What is ready', 'by type', bars([['User guides', ug.length, '#0ea5e9'], ['Videos', vd.length, '#14b8a6'], ['Lessons', les.length, '#f59e0b']]), 4, STG[5].c) };
  };
  function stagePage(id) { try { const r = B[id](); const s = STG.find(x => x.id === id); return `<div class="sd-stage" style="--c:${s.c}"><div class="sd-kpis">${r.kpis.join('')}</div>${grid(r.body)}</div>`; } catch (e) { console.error(e); return `<div class="sd-stage">${none('This stage could not be drawn.')}</div>`; } }

  // ---------- wire into the project dashboard ----------
  const base = V.projdash.html;
  V.projdash.html = function () {
    I().load(KINDS); const items = cust() ? STG.filter(s => CUST_STG.includes(s.id)) : STG; const all = [['overview', 'Overview']].concat(items.map(s => [s.id, s.label, s.c]));
    let cur = S.ui.sdTab || 'overview'; if (!all.some(x => x[0] === cur)) cur = 'overview';
    const html = base.call(this); const mark = '<div class="cs-page">';
    if (cur === 'overview') return html.replace(mark, () => mark + tabsHtml(cur, all) + lifecycle());
    const i = html.indexOf(mark); return (i < 0 ? html : html.slice(0, i)) + mark + tabsHtml(cur, all) + stagePage(cur) + '</div>';
  };
  ACT.sdTab = a => { S.ui.sdTab = a.getAttribute('data-v'); V.render(); };

  // ---------- admin: the stages across every active project ----------
  const RSTG = [[0, 'All stages'], [1, 'Project introduction'], [2, 'Requirement sessions'], [3, 'Mockup and BRD'], [4, 'UAT and FTR'], [5, 'Training guides'], [7, 'Hypercare'], [8, 'Handover']];
  const RC = { 1: '#3b82f6', 2: '#14b8a6', 3: '#ec4899', 4: '#f59e0b', 5: '#22c55e', 7: '#0ea5e9', 8: '#64748b' };
  const ORDER = ['blocked', 'overdue', 'at_risk', 'on_track', 'insufficient'];
  V.stageAdmin = function (ps) {
    const cur = RSTG.some(x => String(x[0]) === String(S.ui.sdAdm)) ? Number(S.ui.sdAdm) : 0; const rstage = p => { const st = p.metrics && p.metrics.stage; return st > 0 && V.stageOfStep ? V.stageOfStep(st - 1) : 0; }; const inStage = n => ps.filter(p => rstage(p) === n);
    const sub = cur ? inStage(cur) : ps; const m = p => p.metrics || {}; const sum = f => sub.reduce((n, p) => n + num(f(p)), 0);
    const health = h => sub.filter(p => p.health === h).length;
    const tabs = `<div class="tabs sd-tabs" role="tablist" aria-label="Stages across projects">${RSTG.map(([id, l]) => `<button type="button" role="tab" aria-selected="${cur === id}" class="tab${cur === id ? ' active' : ''}" data-act="sdAdm" data-v="${id}">${RC[id] ? `<i class="sd-dot" style="background:${RC[id]}"></i>` : ''}${esc(l)}<span class="cnt">${id ? inStage(id).length : ps.length}</span></button>`).join('')}</div>`;
    const kp = `<div class="sd-kpis">${kpi(cur ? 'Projects in this stage' : 'Active projects', sub.length, cur ? 'of ' + ps.length + ' active' : ps.filter(p => !rstage(p)).length + ' have no dated plan yet', RC[cur] || '#3b82f6', cur ? pct(sub.length, ps.length) : null)}${kpi('Blocked or overdue', health('blocked') + health('overdue'), health('blocked') + ' blocked · ' + health('overdue') + ' overdue', '#ef4444')}${kpi('Open tasks', sum(p => m(p).openTasks), sum(p => m(p).overdueTasks) + ' overdue', '#f59e0b')}${kpi('Waiting on customers', sum(p => m(p).custWaiting), 'actions and sign-offs', '#14b8a6')}${kpi('On track', health('on_track'), pct(health('on_track'), sub.length) + '% of these projects', '#22c55e', pct(health('on_track'), sub.length))}</div>`;
    const pipe = widget('Pipeline', 'projects per stage, coloured by health', `<ul class="sd-pipe">${RSTG.slice(1).map(([id, l]) => { const g = inStage(id); return `<li><button type="button" data-act="sdAdm" data-v="${id}"><span>${esc(l)}</span><i>${ORDER.map(h => { const n = g.filter(p => p.health === h).length; return n ? `<u style="flex:${n};background:${HC[h]}" title="${HL[h]}: ${n}"></u>` : ''; }).join('') || '<u style="flex:1;background:rgba(0,0,0,.06)"></u>'}</i><b>${g.length}</b></button></li>`; }).join('')}</ul>`, 5);
    const rows = sub.slice().sort((a, b) => ORDER.indexOf(a.health) - ORDER.indexOf(b.health)).slice(0, 14).map(p => [`<button type="button" class="sd-link" data-act="cmdDrill" data-p="${esc(p.id)}" data-v="overview" data-x="{}">${esc(p.name)}</button><small>${esc(p.customer || '')}</small>`, `<span class="sd-hd" style="--c:${HC[p.health] || '#a3a3a3'}">${esc(HL[p.health] || p.health || '—')}</span>`, esc(m(p).stageTitle || '—'), esc(m(p).nextMilestone ? m(p).nextMilestone.title : '—'), esc(fd(m(p).target || m(p).goLive)), num(m(p).openTasks) + (num(m(p).overdueTasks) ? ` <em class="sd-late">${num(m(p).overdueTasks)} late</em>` : ''), num(m(p).custWaiting)]);
    const tbl = widget(cur ? RSTG.find(x => x[0] === cur)[1] : 'All active projects', 'worst health first', table(['Project', 'Health', 'Plan step', 'Next milestone', 'Target', 'Open tasks', 'Waiting'], rows, 'No active project is in this stage.'), cur ? 12 : 7, RC[cur]);
    return `<div class="sd-admin">${tabs}${kp}${grid(cur ? tbl : pipe + tbl)}</div>`;
  };
  ACT.sdAdm = a => { S.ui.sdAdm = Number(a.getAttribute('data-v')); V.setMode('admin'); };
})(typeof window !== 'undefined' ? window : globalThis);
