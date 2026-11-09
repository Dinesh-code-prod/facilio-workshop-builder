/* Stage dashboards: the Dashboard page gets one mini dashboard per stage of the project, as tabs inside it, a health lifecycle strip, and a Reports tab.
   - Team and customer (V.projdash): Overview | Kick-off | Requirements | BRD and sign-off | Build and UAT | Go-live and hypercare | Handover | Reports (a customer sees the stages that are theirs, and never internal tasks, fees or notes).
   - Admin (V.stageAdmin, drawn by the Dashboard's Stages tab): the same stages across every active project: pipeline, RAG heat map, funnel, ageing, workload, and a portfolio Reports tab.
   Every number is computed from saved records; a stage with nothing recorded says so. Read-only: nothing here writes data. Charts come from V.sdc (src/sdcharts.js); reports from V.sdReports (src/sdreports.js). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  if (!V || !V.projdash || !V.sdc) return;
  const C = V.sdc;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const fd = d => (d ? V.fmtDate(d) : '—');
  const KINDS = ['action', 'signoff', 'cr', 'task', 'hc', 'ugd', 'vid', 'lesson', 'utc', 'usecase', 'raid', 'ho', 'close', 'uat', 'build'];
  // one accent per stage (coss palette); used for the dot, the bar and the top edge, never for text
  const STG = [
    { id: 'kickoff', label: 'Kick-off', c: '#1d4ed8' }, { id: 'req', label: 'Requirements', c: '#1e40af' }, { id: 'brd', label: 'BRD and sign-off', c: '#0369a1' },
    { id: 'build', label: 'Build and UAT', c: '#334155' }, { id: 'live', label: 'Go-live and hypercare', c: '#475569' }, { id: 'handover', label: 'Handover', c: '#1e3a8a' }
  ];
  const CUST_STG = ['req', 'brd', 'build', 'live'];
  const HC = { blocked: '#ef4444', overdue: '#f97316', at_risk: '#f59e0b', on_track: '#22c55e', insufficient: '#a3a3a3' };
  const HL = { blocked: 'Blocked', overdue: 'Overdue', at_risk: 'At risk', on_track: 'On track', insufficient: 'No data' };
  const OK = '#22c55e', WARN = '#f59e0b', BAD = '#ef4444', GREY = '#a3a3a3';
  const list = k => (I().ready([k]) ? I().list(k) : []);
  const num = n => (n == null || isNaN(n) ? 0 : n);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const name = x => String(x.title || x.text || x.name || x.label || x.id || '').slice(0, 70);
  const closed = x => /^(done|closed|resolved|fixed|cancelled|complete|completed|signed|accepted)$/i.test(String(x.status || ''));
  const dayOf = s => String(s || '').slice(0, 10);
  const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const ageOf = (x, today) => (x._created ? Math.max(0, V.daysBetween(dayOf(x._created), today)) : null);
  const BUCKETS = [['0 to 7 days', 0, 7, OK], ['8 to 14 days', 8, 14, WARN], ['15 to 30 days', 15, 30, '#f97316'], ['Over 30 days', 31, 1e9, BAD]];
  const buckets = (arr, today) => BUCKETS.map(([l, lo, hi, c]) => [l, arr.filter(x => { const a = ageOf(x, today); return a != null && a >= lo && a <= hi; }).length, c]);

  // ---------- widgets ----------
  // click-throughs (team only): a KPI card opens the page behind the number, a widget header opens its page, a check opens where it is fixed. shortcut: matched by title, so a renamed widget loses its link until the table is updated.
  const KGO = {"Team members":"settings","Customer stakeholders":"settings","Plan steps dated":"plan","Kick-off readiness":"kickoff","Open actions":"governance","Requirements":"brd","Sessions held":"rsplan","Transcripts":"rstrans","Open questions":"rsquestions","Blocking checks":"brd","Warnings":"brd","Use cases":"brd","Sign-offs done":"governance","Change requests":"changes","Modules in scope":"modules","Test cases":"delivery","Failed cases":"delivery","Open defects":"delivery","Go-live":"golive","Go-live sign-off":"golive","Hypercare issues open":"hypercare","Mean time to resolve":"hypercare","User guides":"guides","Videos":"guides","Handover complete":"handover","Overall status":"lifecycle","Schedule performance":"plan","Milestone adherence":"plan","Overdue":"governance"};
  const WGO = {"Kick-off readiness":["kickoff","Open kick-off"],"People on the project":["settings","Project settings"],"Who is on the project":["settings","Project settings"],"Plan, first steps":["plan","Open plan"],"Customer and Facilio actions":["governance","Open actions"],"Action ageing":["governance","Open actions"],"Requirement status":["brd","Open the BRD"],"Traceability coverage":["rschecks","Open checks"],"Sessions held against planned":["rsplan","Workshop plan"],"Session timeline":["rsplan","Workshop plan"],"Latest requirements":["brd","Open the BRD"],"Questions waiting":["rsquestions","Open questions"],"Sign-off timeline":["governance","Open sign-offs"],"BRD readiness checks":["brd","Open the BRD"],"Change request ageing":["changes","Change requests"],"Change requests by status":["changes","Change requests"],"Change requests":["changes","Change requests"],"Test pass rate":["delivery","Open UAT"],"UAT exit criteria":["delivery","Open UAT"],"Failed and blocked cases":["delivery","Open UAT"],"Defects by severity":["delivery","Open UAT"],"Defect age":["delivery","Open UAT"],"Defect removal efficiency":["delivery","Open UAT"],"Module review":["modules","Open modules"],"Go-live countdown":["golive","Go-live readiness"],"Go-live readiness":["golive","Go-live readiness"],"Still open before go-live":["governance","Open actions"],"Hypercare burn-down":["hypercare","Open hypercare"],"Issues by severity":["hypercare","Open hypercare"],"Hypercare issues":["hypercare","Open hypercare"],"Handover completeness":["handover","Open handover"],"Handover checklist":["handover","Open handover"],"Open handover items":["handover","Open handover"],"What is ready":["guides","Open guides"],"Handover pack":["guides","Open guides"],"Delivery progress":["plan","Open the plan"],"Who owes what":["governance","Open actions"],"Work by status":["tasks","Open tasks"],"Health by area":["lifecycle","Project cycle"],"Sign-off journey":["governance","Open sign-offs"],"Test cases":["delivery","Open UAT"],"Open RAID items":["governance","Open RAID log"],"Needs attention":["tasks","Open tasks"]};
  const CKGO = [[/team|stakeholder|people/i, 'settings'], [/plan|go-live date/i, 'plan'], [/session/i, 'rsplan'], [/action/i, 'governance'], [/brd/i, 'brd'], [/test case|pass rate|executed|defect/i, 'delivery'], [/module/i, 'modules'], [/sign-?off|signed/i, 'governance'], [/guide|video|training/i, 'guides'], [/hypercare|lesson|handover/i, 'handover']];
  const kview = label => (cust() ? '' : KGO[label] || '');
  const wgo = title => (cust() ? null : WGO[title] || (/^Next \d+ days$/.test(title) ? ['plan', 'Open the plan'] : null));
  const kpi = (label, value, sub, c, p) => { const v = kview(label), inner = `<span class="sd-kl">${esc(label)}</span><b class="sd-kv">${value}</b><span class="sd-ks">${sub || ''}</span>${p == null ? '' : `<i class="sd-kb" aria-hidden="true"><u style="width:${Math.max(0, Math.min(100, p))}%"></u></i>`}`;
    return v ? `<button type="button" class="sd-kpi sd-click" style="--c:${c}" data-act="nav" data-view="${v}" title="Open the page behind this number">${inner}</button>` : `<div class="sd-kpi" style="--c:${c}">${inner}</div>`; };
  const widget = (title, sub, inner, span, c) => { const g = wgo(title); return `<section class="sd-w sd-s${span || 6}"${c ? ` style="--c:${c}"` : ''}${g ? ` data-go="${g[0]}" title="Click to open ${esc(g[1].replace(/^Open (the )?/, ''))}"` : ''}><header><h3>${esc(title)}</h3>${sub ? `<span>${esc(sub)}</span>` : ''}${g ? `<button type="button" class="sd-go" data-act="nav" data-view="${g[0]}">${esc(g[1])} <i aria-hidden="true">\u2192</i></button>` : ''}</header><div class="sd-b">${inner}</div></section>`; };
  const none = C.none;
  const chipT = (t, tn) => ({ h: `<span class="sd-chip ${tn || ''}">${esc(t)}</span>`, t });
  const tone = s => (/^(done|closed|resolved|fixed|signed|confirmed|passed|pass|complete|completed|approved|accepted)$/i.test(s) ? 'ok' : /^(blocked|failed|fail|concern|overdue|rejected)$/i.test(s) ? 'bad' : /^(open|in progress|requested|draft|proposed|to confirm|pending|new)$/i.test(s) ? 'warn' : '');
  let COL = [];   // the tables drawn since the last reset; the reports export them as CSV
  const cell = c => (c && typeof c === 'object' ? c.h : esc(c));
  const table = (title, cols, rows, empty) => { COL.push({ title, cols, rows: rows.map(r => r.map(c => (c && typeof c === 'object' ? c.t : c))) });
    return rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : none(empty); };
  const bars = (rows, empty) => { if (!rows.some(r => r[1])) return none(empty || 'Nothing recorded yet.'); const mx = Math.max(1, ...rows.map(r => r[1])); return `<ul class="sd-bars">${rows.map(([l, n, c]) => `<li><span>${esc(l)}</span><i><u style="width:${n / mx * 100}%;background:${c}"></u></i><b>${n}</b></li>`).join('')}</ul>`; };
  const ckv = l => { const m = CKGO.find(x => x[0].test(l)); return m ? m[1] : ''; };
  const check = (title, items, empty) => { if (!cust()) items = items.map(x => (x.v ? x : Object.assign({ v: ckv(x.l) }, x))); COL.push({ title, cols: ['Check', 'Status', 'Detail'], rows: items.map(x => [x.l, C.RAG[x.s][0], x.d || '']) }); return C.checklist(items, empty); };
  const grid = inner => `<div class="sd-grid">${inner}</div>`;
  const kp = (arr, c) => arr.map(a => kpi(a[0], a[1], a[2], c, a[3])).join('');
  const tabsHtml = (cur, items) => `<div class="tabs sd-tabs" role="tablist" aria-label="Dashboard stages">${items.map(([id, l, c]) => `<button type="button" role="tab" aria-selected="${cur === id}" class="tab${cur === id ? ' active' : ''}" data-act="sdTab" data-v="${esc(id)}">${c ? `<i class="sd-dot" style="background:${c}"></i>` : ''}${esc(l)}</button>`).join('')}</div>`;

  // ---------- the numbers every widget and report shares, computed once per draw ----------
  const reqs = () => (S.ws && S.ws.requirements) || [];
  const planRows = () => ((F.doc('plan_struct') || {}).rows || []).filter(r => !r.isPhase && /^\d{4}-\d{2}-\d{2}$/.test(String(r.start || '')));
  const CR_ENDED = /^(approved|rejected|implemented|withdrawn|closed|done|cancelled|declined)$/i;
  function X() {
    const k = cust(), today = V.today(), U = root.FWBUat; const st = V.planStats ? V.planStats() : { n: 0, actual: 0, planned: 0 }; const ph = V.phaseNow ? V.phaseNow() : { cur: -1, info: [] };
    const R = reqs(), tcs = list('utc'), sstat = c => String(c.status || '');
    const passed = tcs.filter(c => /^(passed|approved)$/i.test(sstat(c))).length, failed = tcs.filter(c => /^(failed|blocked)$/i.test(sstat(c))).length, run = tcs.filter(c => !/^(not started|ready for testing|deferred|)$/i.test(sstat(c))).length;
    const issues = !k && U ? list('task').filter(t => U.isUatIssue(t)) : []; const iOpen = issues.filter(t => !['Closed', 'Deferred'].includes(U.issueStatus(t))); const sev = t => (t.uat && t.uat.severity) || 'Minor';
    const so = list('signoff'), sg = id => so.find(x => x.id === id) || { status: 'notdue' }; const cr = list('cr'), crOpen = cr.filter(x => !closed(x) && !CR_ENDED.test(String(x.status || '')));
    const acts = list('action'), actsOpen = acts.filter(a => !closed(a)), custLate = actsOpen.filter(a => a.side === 'customer' && a.due && a.due < today), anyLate = actsOpen.filter(a => a.due && a.due < today);
    const raid = list('raid'), raidOpen = raid.filter(x => !closed(x)), raidHigh = raidOpen.filter(x => x.impact === 'High'); const hc = list('hc'), hcOpen = hc.filter(x => !closed(x));
    const spi = st.n && st.planned > 0 ? st.actual / st.planned : null; const pr = planRows(); const due = pr.filter(r => (r.end || r.start) <= today); const hit = due.filter(r => r.status === 'Done');
    const trace = V.traceSummary ? V.traceSummary() : null; const mods = F.allModules ? F.allModules().filter(m => m.inScope) : []; const DONE = ['completed', 'reviewed_no_change', 'reviewed_changes']; const ms = m => (V.moduleStatus ? V.moduleStatus(m.name) : '');
    return { k, today, U, st, ph, R, tcs, passed, failed, run, issues, iOpen, sev, so, sg, cr, crOpen, acts, actsOpen, custLate, anyLate, raid, raidOpen, raidHigh, hc, hcOpen, spi, pr, due, hit, trace, mods, ms, reviewed: mods.filter(m => DONE.includes(ms(m))).length,
      openBy: s => iOpen.filter(t => sev(t) === s).length, goDays: st.goLive && V.daysBetween ? V.daysBetween(today, st.goLive) : null };
  }
  // RAG per area, with the rule that gave it (shown in the sub line, so nobody has to guess)
  function areas(c) {
    const a = [];
    a.push({ id: 'schedule', l: 'Schedule', s: c.spi == null ? 'n' : c.spi >= .95 ? 'g' : c.spi >= .85 ? 'a' : 'r', d: c.spi == null ? 'No dated plan yet.' : 'Schedule performance index ' + c.spi.toFixed(2) + ': ' + c.st.actual + '% done against ' + c.st.planned + '% planned.' });
    const oldCr = c.crOpen.filter(x => (ageOf(x, c.today) || 0) > 14).length; a.push({ id: 'scope', l: c.k ? 'Scope' : 'Scope and change', s: !c.cr.length && !c.R.length ? 'n' : oldCr ? 'r' : c.crOpen.length ? 'a' : 'g', d: !c.cr.length && !c.R.length ? 'No requirements or change requests yet.' : c.crOpen.length + ' open change request' + (c.crOpen.length === 1 ? '' : 's') + (oldCr ? ', ' + oldCr + ' open over 14 days' : '') + '.' });
    const crit = c.openBy('Critical'), maj = c.openBy('Major'); a.push({ id: 'quality', l: 'Quality', s: !c.tcs.length ? 'n' : crit ? 'r' : (maj || c.failed) ? 'a' : 'g', d: !c.tcs.length ? 'No test cases yet.' : c.passed + ' of ' + c.tcs.length + ' test cases passed' + (c.k ? '' : ', ' + crit + ' critical and ' + maj + ' major defects open') + '.' });
    a.push({ id: 'customer', l: c.k ? 'Your actions' : 'Customer actions', s: !c.acts.some(x => x.side === 'customer') ? 'n' : c.custLate.length > 2 ? 'r' : c.custLate.length ? 'a' : 'g', d: !c.acts.some(x => x.side === 'customer') ? 'No customer actions recorded.' : c.custLate.length + ' customer action' + (c.custLate.length === 1 ? '' : 's') + ' past the date.' });
    if (!c.k || V.custShow('risks')) a.push({ id: 'risk', l: 'Risk', s: !c.raid.length ? 'n' : c.raidHigh.length > 2 ? 'r' : c.raidHigh.length ? 'a' : 'g', d: !c.raid.length ? 'Nothing in the RAID log.' : c.raidHigh.length + ' high-impact item' + (c.raidHigh.length === 1 ? '' : 's') + ' open, ' + c.raidOpen.length + ' open in total.' });
    return a;
  }
  const overall = list => C.worst(list.map(x => x.s));
  const OV = { g: 'On track', a: 'Needs attention', r: 'Off track', n: 'Not enough data' };

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

  // ---------- Overview extras: RAG by area, schedule index, milestone adherence ----------
  function overviewExtra() {
    COL = []; const c = X(), A = areas(c), ov = overall(A); const sc = c.spi == null ? null : Math.round(c.spi * 100), ad = c.due.length ? pct(c.hit.length, c.due.length) : null;
    const kpis = [['Overall status', C.rag(ov, OV[ov]), A.filter(x => x.s === 'r').length + ' red · ' + A.filter(x => x.s === 'a').length + ' amber · ' + A.filter(x => x.s === 'g').length + ' green'], ['Schedule performance', c.spi == null ? '—' : c.spi.toFixed(2), c.spi == null ? 'needs a dated plan' : c.spi >= 1 ? 'on or ahead of plan' : 'below 1.00 means behind plan', sc == null ? null : Math.min(100, sc)],
      ['Milestone adherence', ad == null ? '—' : ad + '%', c.due.length ? c.hit.length + ' of ' + c.due.length + ' due plan steps are Done' : 'no plan step has come due yet', ad], [c.k ? 'Waiting on you' : 'Overdue actions', c.k ? c.actsOpen.filter(a => a.side === 'customer').length : c.anyLate.length, c.k ? 'open actions on your side' : 'actions past their date']];
    const w = widget('Health by area', 'red, amber or green, with the rule behind each', C.checklist(A.map(x => ({ l: x.l, s: x.s, d: x.d })), 'No data yet.'), 7) +
      widget('Schedule index', 'actual progress over planned progress', C.gauge(sc == null ? null : Math.min(100, sc), c.spi == null ? '' : c.spi.toFixed(2), 'SPI: 1.00 is exactly on plan', c.spi >= .95 ? OK : c.spi >= .85 ? WARN : BAD, 'No dated plan yet. Add or import the plan to see this.'), 5);
    return `<div class="sd-kpis">${kp(kpis, '#3b82f6')}</div>${grid(w)}`;
  }

  // ---------- one builder per stage; each returns the KPI cards and the widgets for that stage ----------
  const B = {};
  const burn = (hc, today) => {   // open hypercare issues per day; an issue stops counting on the day it was last updated as closed
    const d = hc.filter(x => x._created).map(x => dayOf(x._created)).sort(); if (!d.length) return null; const n = Math.min(29, Math.max(1, V.daysBetween(d[0], today))); const out = [];
    for (let i = n; i >= 0; i--) { const day = add(today, -i); out.push(hc.filter(x => x._created && dayOf(x._created) <= day && !(closed(x) && dayOf(x._at) <= day)).length); }
    return { vals: out, from: add(today, -n) };
  };
  B.kickoff = c => {
    const ppl = F.doc('people') || {}; const team = ppl.team || [], sk = ppl.stakeholders || []; const pl = F.doc('planner') || {}; const p = c.ph;
    const rows = team.concat(sk).filter(x => x.name).slice(0, 8).map(x => [x.name, x.role || '—', x.email || '—', chipT(team.indexOf(x) >= 0 ? 'Facilio' : 'Customer', team.indexOf(x) >= 0 ? '' : 'pink')]);
    const next = (p.info || []).filter(x => x.start).slice(0, 6).map(x => [x.title, fd(x.start), fd(x.end), c.today >= x.start ? 'Started' : V.daysBetween(c.today, x.start) + ' days to go']);
    const chk = [{ l: 'Implementation team named', s: team.length ? 'g' : 'r', d: team.length + ' on the team.' }, { l: 'Customer stakeholders named', s: sk.length ? 'g' : 'r', d: sk.length + ' named by the customer.' }, { l: 'Project plan has dates', s: c.st.n ? 'g' : 'r', d: c.st.n ? c.st.n + ' dated plan rows.' : 'No dated plan rows.' },
      { l: 'Go-live date set', s: c.st.goLive ? 'g' : 'a', d: c.st.goLive ? fd(c.st.goLive) : 'No go-live row in the plan yet.' }, { l: 'Requirement sessions planned', s: (pl.sessions || []).length ? 'g' : 'a', d: (pl.sessions || []).length + ' sessions in the planner.' }, { l: 'No action past its date', s: c.anyLate.length ? 'a' : 'g', d: c.anyLate.length ? c.anyLate.length + ' open actions are late.' : 'Nothing late.' }];
    const good = chk.filter(x => x.s === 'g').length;
    const aSide = s => c.acts.filter(a => (a.side || 'facilio') === s), aOpen = s => aSide(s).filter(a => !closed(a)), aLate = s => aOpen(s).filter(a => a.due && a.due < c.today);
    const actW = widget('Customer and Facilio actions', 'open, late and done', C.donut([['Facilio open', aOpen('facilio').length - aLate('facilio').length, '#3b82f6'], ['Customer open', aOpen('customer').length - aLate('customer').length, '#94a3b8'], ['Late', aLate('facilio').length + aLate('customer').length, BAD], ['Done', c.acts.length - c.actsOpen.length, OK]], c.actsOpen.length, 'open', 'No actions recorded yet.'), 4, STG[0].c) + widget('Action ageing', 'open actions by days since raised', c.actsOpen.length ? C.stack(buckets(c.actsOpen, c.today).concat([['No date', c.actsOpen.filter(x => ageOf(x, c.today) == null).length, GREY]])) : none('No open actions.'), 4, STG[0].c);
    return { kpis: [['Team members', team.length, 'on the implementation team'], ['Customer stakeholders', sk.length, 'named by the customer'], ['Plan steps dated', c.st.n || 0, 'dated plan rows', pct(Math.min(12, (p.info || []).filter(x => x.start).length), 12)], ['Kick-off readiness', good + ' of ' + chk.length, 'checks green', pct(good, chk.length)]],
      body: widget('Kick-off readiness', 'what must be true before the workshops', check('Kick-off readiness', chk), 5) + widget('People on the project', 'team and stakeholders', table('People', ['Name', 'Role', 'Email', 'Side'], rows, 'No people added yet. Add them in Project settings.'), 7) +
        widget('Who is on the project', 'Facilio and customer', C.donut([['Facilio', team.length, '#3b82f6'], ['Customer', sk.length, '#94a3b8']], team.length + sk.length, 'people', 'Nobody added yet.'), 4) + widget('Plan, first steps', 'dates from the plan', table('Plan first steps', ['Step', 'Start', 'End', 'When'], next, 'No dates yet. Generate or import the plan.'), 8) + actW };
  };
  B.req = c => {
    const R = c.R; const conf = R.filter(r => r.status === 'Confirmed').length, rej = R.filter(r => r.status === 'Rejected').length, draft = R.filter(r => !r.status || r.status === 'Draft').length, oth = Math.max(0, R.length - conf - draft - rej);
    const pl = F.doc('planner') || {}; const sess = pl.sessions || []; const held = sess.filter(s => /complete|held|done/i.test(s.status || '')).length; const tr = (F.doc('transcripts') || {}).items || []; const Q = ((S.ws && S.ws.questions) || []).filter(q => !q.answer && q.status !== 'Closed');
    const rows = R.slice(0, 8).map(r => [r.id || '', name(r), chipT(r.status || 'Draft', tone(r.status || 'Draft'))]); const tcov = c.trace && c.trace.total ? pct(c.trace.traced, c.trace.total) : null;
    const qrows = Q.slice(0, 5).map(q => [String(q.q || q.question || q.text || q.id || '').slice(0, 80), q.owner || q.side || '—']);
    return { kpis: [['Requirements', R.length, conf + ' confirmed', pct(conf, R.length)], ['Sessions held', held + ' of ' + sess.length, sess.length ? 'planned sessions completed' : 'no sessions planned yet', pct(held, sess.length)], ['Transcripts', tr.length, 'added to the project'], ['Open questions', Q.length, Q.length ? 'waiting for an answer' : 'all answered']],
      body: widget('Requirement status', 'confirmed ones reach the BRD', C.donut([['Confirmed', conf, OK], ['Draft', draft, WARN], ['Rejected', rej, BAD], ['Other', oth, GREY]], pct(conf, R.length) + '%', 'confirmed', 'No requirements yet. Read the transcripts and confirm the findings.'), 4, STG[1].c) +
        widget(c.k ? 'Confirmed share' : 'Traceability coverage', c.k ? 'requirements the customer has confirmed' : 'requirement to use case to module to test', c.k ? C.gauge(R.length ? pct(conf, R.length) : null, pct(conf, R.length) + '%', conf + ' of ' + R.length + ' confirmed', STG[1].c, 'No requirements yet.') : C.gauge(tcov, tcov == null ? '' : tcov + '%', c.trace ? c.trace.traced + ' of ' + c.trace.total + ' requirements fully traced · ' + c.trace.gaps + ' gaps' : '', tcov >= 80 ? OK : tcov >= 50 ? WARN : BAD, 'Needs requirements, use cases and test cases first.'), 4, STG[1].c) +
        widget('Sessions held against planned', 'requirement workshops', C.stack([['Held', held, OK], ['Still to hold', Math.max(0, sess.length - held), '#d4d4d4']], 'No sessions planned yet. Plan them in the session planner.'), 4, STG[1].c) +
        widget('Session timeline', 'planned requirement sessions, soonest first', table('Session timeline', ['Session', 'Date', 'Status'], sess.slice().sort((a, b) => String(a.date || a.start || '9').localeCompare(String(b.date || b.start || '9'))).slice(0, 6).map(s => [String(s.title || s.name || s.module || 'Session').slice(0, 60), s.date || s.start ? fd(dayOf(s.date || s.start)) : '—', chipT(s.status || 'Planned', tone(s.status || 'Planned'))]), 'No sessions planned yet. Plan them in the workshop plan.'), 6, STG[1].c) +
        widget('Latest requirements', 'first eight', table('Requirements', ['ID', 'Requirement', 'Status'], rows, 'No requirements yet.'), 8, STG[1].c) + widget('Questions waiting', 'no answer recorded', table('Open questions', ['Question', 'Owner'], qrows, 'No open questions.'), 4, STG[1].c) };
  };
  B.brd = c => {
    const rd = !c.k && V.brdReadiness ? V.brdReadiness() : { blocking: 0, warning: 0, info: 0 }; const uc = list('usecase'); const L = { notdue: 'Not due', requested: 'Waiting for signature', signed: 'Signed', concern: 'Concern raised' };
    const SO3 = [['brd', 'Requirements (BRD)'], ['uat', 'Testing (UAT)'], ['golive', 'Go-live']]; const stt = id => c.sg(id).status;
    const tl = SO3.map(([id, l]) => { const s = c.sg(id); return [l, chipT(L[s.status] || 'Not due', s.status === 'signed' ? 'ok' : s.status === 'requested' ? 'warn' : s.status === 'concern' ? 'bad' : ''), s.requestedAt ? fd(dayOf(s.requestedAt)) : '—', s.signedAt ? fd(dayOf(s.signedAt)) : s.due ? 'due ' + fd(s.due) : '—', s.signer || '—']; });
    const crRows = c.cr.slice(0, 6).map(x => [name(x), chipT(x.status || 'Open', tone(x.status || 'Open')), ageOf(x, c.today) == null ? '—' : ageOf(x, c.today) + ' days']); const signed = SO3.filter(([id]) => stt(id) === 'signed').length;
    const stat = {}; c.cr.forEach(x => { const s = x.status || 'Open'; stat[s] = (stat[s] || 0) + 1; });
    return { kpis: [c.k ? ['Waiting for your signature', SO3.filter(([id]) => stt(id) === 'requested').length, 'sign-offs sent to you'] : ['Blocking checks', rd.blocking, rd.blocking ? 'to fix before sign-off' : 'none'], c.k ? ['Change requests', c.crOpen.length, c.cr.length + ' in total'] : ['Warnings', rd.warning, 'worth a look'], ['Sign-offs done', signed + ' of 3', 'BRD, UAT, go-live', pct(signed, 3)], ['Use cases', uc.length, 'written for the BRD']],
      body: widget('Sign-off timeline', 'requested, due and signed', table('Sign-off timeline', ['Sign-off', 'Status', 'Requested', 'Signed or due', 'Signer'], tl, ''), 7, STG[2].c) +
        widget('Change request ageing', 'open requests by days since raised', c.cr.length ? C.stack(buckets(c.crOpen, c.today).concat([['No date', c.crOpen.filter(x => ageOf(x, c.today) == null).length, GREY]]), 'No open change requests.') : none('No change requests. Changes after sign-off are logged here.'), 5, STG[2].c) +
        widget('Change requests by status', 'after the BRD is agreed', C.donut(Object.entries(stat).map(([s, n]) => [s, n, tone(s) === 'ok' ? OK : tone(s) === 'bad' ? BAD : tone(s) === 'warn' ? WARN : GREY]), c.cr.length, 'requests', 'No change requests yet.'), 4, STG[2].c) +
        widget('Change requests', 'newest six', table('Change requests', ['Change', 'Status', 'Age'], crRows, 'No change requests yet.'), 8, STG[2].c) + (c.k ? '' : widget('BRD readiness checks', 'what the BRD still needs before sign-off', C.stack([['Blocking', rd.blocking, BAD], ['Warnings', rd.warning, WARN], ['Notes', rd.info, GREY]], 'The BRD has no open checks.'), 4, STG[2].c)) };
  };
  B.build = c => {
    const tc = c.tcs, notRun = Math.max(0, tc.length - c.passed - c.failed); const SV = [['Critical', BAD], ['Major', '#f97316'], ['Minor', WARN], ['Trivial', GREY]];
    const found = c.issues.length, post = c.hc.length; const dre = found + post ? pct(found, found + post) : null; const passRate = c.run ? pct(c.passed, c.run) : null;
    const exit = [{ l: 'Every test case executed', s: !tc.length ? 'n' : c.run >= tc.length ? 'g' : c.run ? 'a' : 'r', d: tc.length ? c.run + ' of ' + tc.length + ' executed.' : 'No test cases yet.' }, { l: 'Pass rate of executed cases at least 90%', s: passRate == null ? 'n' : passRate >= 90 ? 'g' : passRate >= 75 ? 'a' : 'r', d: passRate == null ? 'Nothing executed yet.' : passRate + '% passed (' + c.passed + ' of ' + c.run + ').' }];
    if (!c.k) exit.push({ l: 'No open critical defects', s: !c.issues.length && !tc.length ? 'n' : c.openBy('Critical') ? 'r' : 'g', d: c.openBy('Critical') + ' open.' }, { l: 'No open major defects', s: !c.issues.length && !tc.length ? 'n' : c.openBy('Major') > 2 ? 'r' : c.openBy('Major') ? 'a' : 'g', d: c.openBy('Major') + ' open.' });
    exit.push({ l: 'Modules in scope reviewed', s: !c.mods.length ? 'n' : c.reviewed >= c.mods.length ? 'g' : c.reviewed ? 'a' : 'r', d: c.reviewed + ' of ' + c.mods.length + ' reviewed.' }, { l: 'UAT sign-off signed', s: c.sg('uat').status === 'signed' ? 'g' : c.sg('uat').status === 'requested' ? 'a' : 'n', d: c.sg('uat').status === 'signed' ? 'Signed.' : c.sg('uat').status === 'requested' ? 'Waiting for the customer to sign.' : 'Not requested yet.' });
    const rows = c.mods.slice(0, 8).map(m => [m.label || m.name, chipT((V.REVIEW && (V.REVIEW.find(x => x[0] === c.ms(m)) || [0, c.ms(m)])[1]) || c.ms(m) || 'Not started', ['completed', 'reviewed_no_change', 'reviewed_changes'].includes(c.ms(m)) ? 'ok' : 'warn')]);
    const body = widget('Test pass rate', 'all UAT test cases', C.donut([['Passed', c.passed, OK], ['Failed or blocked', c.failed, BAD], ['Not run', notRun, GREY]], passRate == null ? '—' : passRate + '%', 'pass rate', 'No test cases yet. Add them in UAT.'), 4, STG[3].c) +
      widget('UAT exit criteria', 'red, amber or green against each', check('UAT exit criteria', exit), 8, STG[3].c);
    const team = c.k ? '' : widget('Defects by severity', 'open now', bars(SV.map(([l, col]) => [l, c.openBy(l), col]), 'No UAT defects logged.'), 4, STG[3].c) + widget('Defect age', 'open defects by days since logged', c.iOpen.length ? C.stack(buckets(c.iOpen, c.today).concat([['No date', c.iOpen.filter(x => ageOf(x, c.today) == null).length, GREY]])) : none('No open defects.'), 4, STG[3].c) +
      widget('Defect removal efficiency', 'found before go-live over all found', C.gauge(dre, dre == null ? '' : dre + '%', found + ' found in UAT · ' + post + ' found in hypercare', dre >= 90 ? OK : dre >= 75 ? WARN : BAD, 'Needs defects logged in UAT or hypercare.'), 4, STG[3].c);
    return { kpis: [['Modules in scope', c.mods.length, c.reviewed + ' reviewed', pct(c.reviewed, c.mods.length)], ['Test cases', tc.length, c.passed + ' passed, ' + c.run + ' run', pct(c.passed, tc.length)], ['Failed cases', c.failed, c.failed ? 'need a fix and a re-test' : 'none failing'], c.k ? ['Not yet run', notRun, 'test cases waiting'] : ['Open defects', c.iOpen.length, c.openBy('Critical') + ' critical · ' + c.openBy('Major') + ' major']],
      body: body + team + (c.k ? '' : widget('Failed and blocked cases', 'each needs a fix and a re-test', table('Failed and blocked cases', ['Test case', 'Status'], tc.filter(t => /^(failed|blocked)$/i.test(String(t.status || ''))).slice(0, 6).map(t => [name(t), chipT(t.status, 'bad')]), 'No failed or blocked test cases.'), 6, STG[3].c)) + widget('Module review', 'modules in scope', table('Module review', ['Module', 'Review'], rows, 'No modules marked in scope yet.'), c.k ? 12 : 6, STG[3].c) };
  };
  B.live = c => {
    const g = c.sg('golive'); const hc = c.hc; const open = c.hcOpen; const dd = c.goDays; const rs = hc.filter(x => closed(x) && x._created && x._at).map(x => Math.max(0, V.daysBetween(dayOf(x._created), dayOf(x._at)))); const mttr = rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 10) / 10 : null;
    const b = burn(hc, c.today); const SEVS = [['Critical', BAD], ['High', '#f97316'], ['Medium', WARN], ['Low', GREY]];
    const elapsed = c.st.first && c.st.goLive ? pct(Math.max(0, V.daysBetween(c.st.first, c.today)), Math.max(1, V.daysBetween(c.st.first, c.st.goLive))) : null;
    const rd = [{ l: 'Test cases executed', s: !c.tcs.length ? 'n' : c.run >= c.tcs.length ? 'g' : c.run ? 'a' : 'r', d: c.run + ' of ' + c.tcs.length + ' executed.' }, { l: 'No failed or blocked test cases', s: !c.tcs.length ? 'n' : c.failed ? 'r' : 'g', d: c.failed + ' failed or blocked.' }];
    if (!c.k) rd.push({ l: 'No open critical or major defects', s: !c.tcs.length && !c.issues.length ? 'n' : c.openBy('Critical') ? 'r' : c.openBy('Major') ? 'a' : 'g', d: c.openBy('Critical') + ' critical, ' + c.openBy('Major') + ' major open.' });
    rd.push({ l: 'BRD signed', s: c.sg('brd').status === 'signed' ? 'g' : c.sg('brd').status === 'requested' ? 'a' : 'r', d: c.sg('brd').status === 'signed' ? 'Signed.' : 'Not signed yet.' }, { l: 'UAT signed', s: c.sg('uat').status === 'signed' ? 'g' : c.sg('uat').status === 'requested' ? 'a' : 'r', d: c.sg('uat').status === 'signed' ? 'Signed.' : 'Not signed yet.' }, { l: 'Training guides made', s: list('ugd').length ? 'g' : 'a', d: list('ugd').length + ' user guides.' }, { l: 'Go-live sign-off', s: g.status === 'signed' ? 'g' : g.status === 'requested' ? 'a' : 'n', d: g.status === 'signed' ? 'Signed.' : g.status === 'requested' ? 'Waiting for the customer.' : 'Not requested yet.' });
    const rows = hc.slice(0, 8).map(x => [name(x), x.severity || '—', chipT(x.status || 'Open', tone(x.status || 'Open')), ageOf(x, c.today) == null ? '—' : ageOf(x, c.today) + ' days']);
    return { kpis: [['Go-live', dd == null ? '—' : dd >= 0 ? dd + ' days' : 'Passed', c.st.goLive ? esc(fd(c.st.goLive)) : 'no date set'], ['Go-live sign-off', g.status === 'signed' ? 'Signed' : g.status === 'requested' ? 'Waiting' : 'Not due', 'customer approval'], ['Hypercare issues open', open.length, hc.length + ' logged in total', pct(hc.length - open.length, hc.length)], ['Mean time to resolve', mttr == null ? '—' : mttr + ' days', rs.length ? rs.length + ' resolved issues' : 'needs resolved issues with dates']],
      body: widget('Go-live countdown', 'time used between plan start and go-live', C.gauge(elapsed, dd == null ? '' : dd >= 0 ? dd + 'd' : 'live', c.st.goLive ? 'Go-live ' + fd(c.st.goLive) : '', dd != null && dd >= 0 && dd <= 14 ? WARN : STG[4].c, 'No go-live date in the plan yet.'), 4, STG[4].c) + widget('Go-live readiness', 'checked from the records', check('Go-live readiness', rd), 8, STG[4].c) +
        widget('Hypercare burn-down', b ? 'open issues per day, last ' + (b.vals.length - 1) + ' days' : 'open issues per day', b ? C.spark(b.vals, STG[4].c, [fd(b.from), 'today'], 'open') : none('No hypercare issues with dates yet. The line draws after the first one is logged.'), 5, STG[4].c) +
        widget('Still open before go-live', 'open actions, soonest first', table('Still open before go-live', ['Action', 'Side', 'Due'], c.actsOpen.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 6).map(a => [String(a.text || 'Action').slice(0, 70), a.side === 'customer' ? 'Customer' : 'Facilio', a.due ? fd(a.due) + (a.due < c.today ? ' (late)' : '') : '—']), 'No open actions.'), 6, STG[4].c) +
        widget('Issues by severity', 'open now', bars(SEVS.map(([l, col]) => [l, open.filter(x => x.severity === l).length, col]), 'No hypercare issues logged.'), 3, STG[4].c) + widget('Hypercare issues', 'newest first', table('Hypercare issues', ['Issue', 'Severity', 'Status', 'Age'], rows, 'No hypercare issues logged. They appear here after go-live.'), 4, STG[4].c) };
  };
  B.handover = c => {
    const ug = list('ugd'), vd = list('vid'), les = list('lesson'), ho = list('ho'); const hoDone = ho.filter(x => x.done).length; const exit = (I().get('close', 'hypercare') || {}).exitAt; const signed = ['brd', 'uat', 'golive'].filter(id => c.sg(id).status === 'signed').length;
    const chk = [{ l: 'User guides made', s: ug.length ? 'g' : 'r', d: ug.length + ' guides.' }, { l: 'Walkthrough videos', s: vd.length ? 'g' : 'a', d: vd.length + ' videos.' }, { l: 'Three sign-offs signed', s: signed === 3 ? 'g' : signed ? 'a' : 'r', d: signed + ' of 3.' }, { l: 'Handover checklist done', s: !ho.length ? 'n' : hoDone === ho.length ? 'g' : 'a', d: ho.length ? hoDone + ' of ' + ho.length + ' ticked.' : 'The checklist has not been started.' },
      { l: 'Hypercare exit recorded', s: exit ? 'g' : 'a', d: exit ? 'Recorded ' + fd(dayOf(exit)) : 'Not recorded yet.' }, { l: 'Lessons learned recorded', s: les.length ? 'g' : 'a', d: les.length + ' lessons.' }];
    const good = chk.filter(x => x.s === 'g').length; const rows = ug.concat(vd).slice(0, 8).map(x => [name(x), vd.indexOf(x) >= 0 ? 'Video' : 'User guide', chipT(x.status || 'Draft', tone(x.status || 'Draft'))]);
    return { kpis: [['User guides', ug.length, 'for the customer team'], ['Videos', vd.length, 'walkthroughs'], ['Sign-offs done', signed + ' of 3', 'BRD, UAT, go-live', pct(signed, 3)], ['Handover complete', pct(good, chk.length) + '%', good + ' of ' + chk.length + ' checks green', pct(good, chk.length)]],
      body: widget('Handover completeness', 'share of checks that are green', C.gauge(pct(good, chk.length), pct(good, chk.length) + '%', good + ' of ' + chk.length + ' checks green', good === chk.length ? OK : good >= 3 ? WARN : BAD), 4, STG[5].c) + widget('Handover checklist', 'checked from the records', check('Handover checklist', chk), 8, STG[5].c) +
        widget('Open handover items', 'ticked off on the handover page', table('Open handover items', ['Item'], ho.filter(x => !x.done).slice(0, 6).map(x => [String(x.text || x.title || 'Item').slice(0, 90)]), ho.length ? 'Every handover item is ticked.' : 'The handover checklist has not been started.'), 4, STG[5].c) + widget('What is ready', 'by type', bars([['User guides', ug.length, '#1d4ed8'], ['Videos', vd.length, '#475569'], ['Lessons', les.length, WARN]], 'Nothing in the pack yet.'), 4, STG[5].c) + widget('Handover pack', 'guides and videos', table('Handover pack', ['Item', 'Type', 'Status'], rows, 'The pack builds from the user guides and videos.'), 8, STG[5].c) };
  };
  function stageData(id) { COL = []; const c = X(); const r = B[id](c); return { c, r, tables: COL.slice(), s: STG.find(x => x.id === id) }; }
  function stagePage(id) { try { const d = stageData(id); return `<div class="sd-stage" style="--c:${d.s.c}"><div class="sd-kpis">${kp(d.r.kpis, d.s.c)}</div>${grid(d.r.body)}</div>`; } catch (e) { console.error(e); return `<div class="sd-stage">${none('This stage could not be drawn.')}</div>`; } }

  // ---------- wire into the project dashboard ----------
  const base = V.projdash.html;
  V.projdash.html = function () {
    I().load(KINDS); const items = cust() ? STG.filter(s => CUST_STG.includes(s.id)) : STG; const all = [['overview', 'Overview']].concat(items.map(s => [s.id, s.label, s.c]), [['reports', 'Reports']]);
    let cur = S.ui.sdTab || 'overview'; if (!all.some(x => x[0] === cur)) cur = 'overview';
    const html = base.call(this); const mark = '<div class="cs-page">';
    if (cur === 'overview') { const i0 = html.indexOf(mark); if (V.dk && i0 >= 0) { try { return html.slice(0, i0) + mark + tabsHtml(cur, all) + lifecycle() + V.dk.overview() + '</div>'; } catch (e) { console.error(e); } }   // the widget Overview (src/dashkit.js); the older bento below is the fallback
      let ex = ''; try { ex = overviewExtra(); } catch (e) { console.error(e); } return html.replace(mark, () => mark + tabsHtml(cur, all) + lifecycle() + ex); }
    const i = html.indexOf(mark); let body; try { body = cur === 'reports' ? (V.sdReports ? V.sdReports.page() : none('Reports are not available.')) : stagePage(cur); } catch (e) { console.error(e); body = none('This tab could not be drawn.'); }
    return (i < 0 ? html : html.slice(0, i)) + mark + tabsHtml(cur, all) + (V.dk && cur !== 'reports' ? '<div class="dk-fbar">' + V.dk.exportBar('dk', true) + '</div>' : '') + body + '</div>';
  };
  ACT.sdTab = a => { S.ui.sdTab = a.getAttribute('data-v'); V.render(); };

  // ---------- admin: the stages across every active project ----------
  const RSTG = [[0, 'All stages'], [1, 'Project introduction'], [2, 'Requirement sessions'], [3, 'Solution design and BRD'], [4, 'UAT and FTR'], [5, 'Training guides'], [7, 'Hypercare'], [8, 'Handover']];
  const RC = { 1: '#1d4ed8', 2: '#1e40af', 3: '#0369a1', 4: '#334155', 5: '#475569', 7: '#1e3a8a', 8: '#64748b' };
  const ORDER = ['blocked', 'overdue', 'at_risk', 'on_track', 'insufficient'];
  const rstageOf = p => { const st = p.metrics && p.metrics.stage; return st > 0 && V.stageOfStep ? V.stageOfStep(st - 1) : 0; };
  V.sdd = { STG, RSTG, RC, ORDER, HC, HL, X, areas, overall, OV, stageData, fd, dayOf, ageOf, pct, num, rstageOf, buckets };
  // the older shared API (cells are already-escaped HTML), used by the PMO overview in src/pmo.js
  const rawTable = (cols, rows, empty) => (rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : none(empty));
  V.sd = { kpi, widget, table: rawTable, chipT: (t, tn) => chipT(t, tn).h, grid, none, lifecycle };
  // ---------- admin: the portfolio as a CEO and a finance lead read it: health, lifecycle, top risks, go-lives, and money per currency ----------
  const money = (n, c) => (c && c !== 'No currency' ? c + ' ' : '') + Math.round(n || 0).toLocaleString('en-US');
  function finance(ps) {
    const m = p => p.metrics || {}; const groups = {}; ps.forEach(p => { const mo = m(p).money; if (!mo) return; const c = mo.currency || 'No currency'; (groups[c] = groups[c] || []).push(p); });
    const codes = Object.keys(groups).sort((a, b) => groups[b].reduce((n, p) => n + m(p).money.contract, 0) - groups[a].reduce((n, p) => n + m(p).money.contract, 0));
    const noMoney = ps.filter(p => !m(p).money).length; if (!codes.length) return widget('Finance', 'contract value, billing and change orders', none('No contract fees or change-request prices are recorded yet. Add fee milestones on each project\'s Contract page and set the project currency; this view totals them per currency.'), 12);
    const note = `<p class="sd-fnote">${noMoney ? noMoney + ' active project' + (noMoney === 1 ? ' has' : 's have') + ' no contract fees or change-order prices recorded. ' : ''}Currencies are never added together. Delivery cost and margin are not tracked in the studio, so they are not shown; billing dates come from the fee milestones.</p>`;
    const sections = codes.slice(0, 4).map(c => {
      const g = groups[c], sum = f => g.reduce((n, p) => n + f(m(p).money), 0); const contract = sum(x => x.contract), billed = sum(x => x.billed), nx = sum(x => x.next60), conv = sum(x => x.crConverted), pend = sum(x => x.crPending); const risk = g.filter(p => ['at_risk', 'overdue', 'blocked'].includes(p.health)); const riskV = risk.reduce((n, p) => n + m(p).money.contract, 0);
      const kps = [['Contract value', money(contract, c), g.length + ' project' + (g.length === 1 ? '' : 's'), null], ['Billable to date', money(billed, c), contract ? pct(billed, contract) + '% of contract has a date on or before today' : 'no milestones', contract ? pct(billed, contract) : null], ['Billable in 60 days', money(nx, c), 'milestones dated in the next 60 days'], ['Change orders', money(conv, c), (contract ? pct(conv, contract) + '% of contract · ' : '') + money(pend, c) + ' still pending'], ['Value at risk', money(riskV, c), risk.length + ' project' + (risk.length === 1 ? '' : 's') + ' at risk, overdue or blocked', contract ? pct(riskV, contract) : null]];
      const byH = ORDER.map(h => [HL[h], g.filter(p => p.health === h).reduce((n, p) => n + m(p).money.contract, 0), HC[h]]);
      const rows = g.slice().sort((a, b) => m(b).money.contract - m(a).money.contract).slice(0, 6).map(p => [{ h: `<button type="button" class="sd-link" data-act="cmdDrill" data-p="${esc(p.id)}" data-v="contract" data-x="{}">${esc(p.name)}</button><small>${esc(p.customer || '')}</small>`, t: p.name }, money(m(p).money.contract), money(m(p).money.billed), money(m(p).money.next60), money(m(p).money.crConverted + m(p).money.crPending), { h: `<span class="sd-hd" style="--c:${HC[p.health] || GREY}">${esc(HL[p.health] || '—')}</span>`, t: HL[p.health] || '' }]);
      return `<h3 class="sd-cur">${esc(c === 'No currency' ? 'Projects with no currency set' : c + ' projects')}</h3><div class="sd-kpis">${kps.map((a, i) => kpi(a[0], a[1], a[2], i === 4 ? (riskV ? BAD : OK) : '#3b82f6', a[3])).join('')}</div>${grid(widget('Contract value by health', c, C.stack(byH.map(x => [x[0], Math.round(x[1]), x[2]]), 'No contract value.'), 5) + widget('Largest contracts', 'value, billing and change orders', table('Largest contracts ' + c, ['Project', 'Contract', 'Billable to date', 'Next 60 days', 'Change orders', 'Health'], rows, 'None.'), 7))}`;
    }).join('');
    return `<section class="sd-fin"><h2 class="sd-h2">Finance</h2>${sections}${note}</section>`;
  }
  V.sdFinance = finance;
  V.stageAdmin = function (ps) {
    COL = []; const rep = S.ui.sdAdm === 'rep'; const m = p => p.metrics || {}; const today = V.today(); const H = h => ps.filter(p => p.health === h).length;
    const tabs = `<div class="tabs sd-tabs" role="tablist" aria-label="Portfolio view"><button type="button" role="tab" aria-selected="${!rep}" class="tab${rep ? '' : ' active'}" data-act="sdAdm" data-v="0">Overview</button><button type="button" role="tab" aria-selected="${rep}" class="tab${rep ? ' active' : ''}" data-act="sdAdm" data-v="rep">Report</button></div>`;
    if (rep) return `<div class="sd-admin">${tabs}${V.sdReports ? V.sdReports.portfolio(ps) : none('Reports are not available.')}</div>`;
    const days = p => (m(p).target ? V.daysBetween(today, m(p).target) : null); const soon = ps.filter(p => { const d = days(p); return d != null && d >= 0 && d <= 60; }).sort((a, b) => days(a) - days(b));
    const attn = H('at_risk') + H('overdue') + H('blocked');
    const kps = [['Active projects', ps.length, ps.filter(p => !rstageOf(p)).length + ' have no dated plan yet'], ['On track', pct(H('on_track'), ps.length) + '%', H('on_track') + ' of ' + ps.length + ' projects', pct(H('on_track'), ps.length)], ['Need attention', attn, H('blocked') + ' blocked · ' + H('overdue') + ' overdue · ' + H('at_risk') + ' at risk'], ['Go-live in 60 days', soon.length, soon.length ? 'next: ' + esc(soon[0].name) : 'none dated in this window']];
    const kpiH = `<div class="sd-kpis">${kps.map((a, i) => kpi(a[0], a[1], a[2], i === 2 ? (attn ? BAD : OK) : i === 1 ? OK : '#3b82f6', a[3])).join('')}</div>`;
    const health = widget('Portfolio health', 'all active projects', C.donut(ORDER.map(h => [HL[h], H(h), HC[h]]), pct(H('on_track'), ps.length) + '%', 'on track', 'No active projects.'), 5);
    const pipe = widget('Where projects are in the lifecycle', 'projects per stage, coloured by health', `<ul class="sd-pipe">${RSTG.slice(1).map(([id, l]) => { const g = ps.filter(p => rstageOf(p) === id); return `<li><div class="sd-pr"><span>${esc(l)}</span><i>${ORDER.map(h => { const n = g.filter(p => p.health === h).length; return n ? `<u style="flex:${n};background:${HC[h]}" title="${HL[h]}: ${n}"></u>` : ''; }).join('') || '<u style="flex:1;background:rgba(0,0,0,.06)"></u>'}</i><b>${g.length}</b></div></li>`; }).join('')}</ul>`, 7);
    const sigs = ((V.cmd && V.cmd.get && V.cmd.get()) || {}).signals || []; const SEVO = ['critical', 'high', 'medium', 'low']; const why = p => { const s = sigs.filter(g => g.project === p.name).sort((a, b) => SEVO.indexOf(a.sev) - SEVO.indexOf(b.sev))[0]; return s ? s.title : '—'; };
    const risky = ps.filter(p => p.health !== 'on_track' && p.health !== 'insufficient').sort((a, b) => ORDER.indexOf(a.health) - ORDER.indexOf(b.health)).slice(0, 5);
    const link = p => ({ h: `<button type="button" class="sd-link" data-act="cmdDrill" data-p="${esc(p.id)}" data-v="overview" data-x="{}">${esc(p.name)}</button><small>${esc(p.customer || '')}</small>`, t: p.name });
    const hd = p => ({ h: `<span class="sd-hd" style="--c:${HC[p.health] || GREY}">${esc(HL[p.health] || '—')}</span>`, t: HL[p.health] || '' });
    const riskW = widget('Top risks', 'worst health first, with the main reason', table('Top risks', ['Project', 'Health', 'Main reason', 'Target'], risky.map(p => [link(p), hd(p), why(p), fd(m(p).target)]), 'No project is at risk. Everything dated is on track.'), 7);
    const nextW = widget('Go-lives coming up', 'next 60 days', table('Go-lives coming up', ['Project', 'Date', 'In', 'Health'], soon.slice(0, 5).map(p => [link(p), fd(m(p).target), days(p) + ' days', hd(p)]), 'No target date falls in the next 60 days.'), 5);
    return `<div class="sd-admin">${tabs}${kpiH}${grid(health + pipe + riskW + nextW)}${finance(ps)}</div>`;
  };
  ACT.sdAdm = a => { const v = a.getAttribute('data-v'); S.ui.sdAdm = v === 'rep' ? 'rep' : 0; V.setMode('admin'); };
})(typeof window !== 'undefined' ? window : globalThis);
