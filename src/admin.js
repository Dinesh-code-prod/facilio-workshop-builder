/* Admin console: dashboard (portfolio KPIs and insights), projects, users, access (who may use the console) and activity.
   Server routes under /api/admin enforce the role: platform owner (everything), Admin (manage projects and users), Sub admin (read-only).
   This file only draws the screens. Opened from the "Admin" button; in the no-login office mode it first asks the administrator to sign in. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT;
  const { drawer, closeDrawer, toast, confirmDialog } = V;
  const A = { sec: 'dashboard', dash: 'command', ins: null, q: '', filter: 'all', stage: 'all', data: null, users: null, audit: null, access: null, detail: null };
  const STAGES = ['Not started', '1 Project introduction', '2 Requirement sessions', '2 Requirements confirmed', '3 Solution design & BRD', '4 UAT & FTR', '4 Go-live ready'];   // the stages of the menu; the number is the stage, the words say how far into it
  // one health vocabulary for the whole console (work/server/_portfolio.mjs decides it; see the Command center's "How health is worked out")
  const HEALTH = { blocked: ['Blocked', 'h-bad'], overdue: ['Overdue', 'h-bad'], at_risk: ['At risk', 'h-attention'], on_track: ['On track', 'h-healthy'], insufficient: ['Insufficient data', 'h-stale'], on_hold: ['On hold', 'h-stale'], completed: ['Completed', 'h-live'], cancelled: ['Cancelled', 'h-stale'], churned: ['Churned', 'h-stale'], not_workable: ['Not workable', 'h-stale'], discontinued: ['Discontinued', 'h-stale'], archived: ['Archived', 'h-stale'] };
  V.ADM_HEALTH = HEALTH;
  const ROLE = { super: ['Platform owner', 'r-super'], admin: ['Admin', 'r-admin'], sub: ['Sub admin', 'r-sub'] };
  const can = lvl => { const r = A.data && A.data.me.role; return lvl === 'super' ? r === 'super' : lvl === 'admin' ? r === 'super' || r === 'admin' : !!r; };
  const val = id => (document.getElementById(id) || {}).value || '';
  const fmt = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtT = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  const ago = d => { if (!d) return 'never'; const m = Math.floor((Date.now() - new Date(d).getTime()) / 6e4); if (m < 2) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.floor(m / 60); if (h < 24) return h + ' h ago'; const dd = Math.floor(h / 24); return dd < 31 ? dd + (dd === 1 ? ' day ago' : ' days ago') : fmt(d); };
  const size = b => b > 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b > 1e3 ? Math.round(b / 1e3) + ' KB' : b + ' B';
  const chip = (cls, t) => `<span class="hchip ${cls}">${esc(t)}</span>`;
  const hchip = h => { const x = HEALTH[h] || HEALTH.insufficient; return chip(x[1], x[0]); };
  const rchip = r => { const x = ROLE[r]; return x ? chip(x[1], x[0]) : ''; };
  const ownerName = o => { const x = String(o || '').split(',')[0].trim(); return !x ? '—' : /guest\.local$/.test(x) ? 'Office team' : x; };
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const TONE = ['#1570EF', '#e91e84', '#14a8a8', '#6b4ee6', '#e08a00'];
  const tone = s => TONE[Math.abs([...String(s)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % TONE.length];

  // the other sections are fetched quietly once the first screen is up, so clicking one opens at once
  let pf = 0; const prefetch = () => { if (pf) return; pf = 1; const g = u => API.get(u, { noAuthRedirect: true }).catch(() => null);
    g('/api/admin/users').then(r => { if (r && !A.users) A.users = r.users; }); g('/api/admin/audit').then(r => { if (r && !A.audit) A.audit = r.entries; });
    if (can('super')) g('/api/admin/access').then(r => { if (r && !A.access) A.access = r; });
    Promise.all([g('/api/ai/status'), g('/api/admin/ai/usage'), g('/api/admin/ai-routing')]).then(([st, us, rt]) => { if (st && us && !A.ai) A.ai = { st, us, rt }; }); g('/api/mail/status').then(r => { if (r && !A.integ) A.integ = r; }); g('/api/admin/insights').then(r => { if (r && !A.ins) A.ins = r; }); };
  async function load() { A.raw = A.data = await API.get('/api/admin/overview', { noAuthRedirect: true }); setTimeout(prefetch, 400); }
  // timeline filter: projects with activity, or created, inside the period; every figure is recomputed from those projects (no estimates)
  A.rg = { period: 'all' };
  // how the assistant routed requests and how each engine did, over the last 30 days (counts only, no message text); Claude's own work runs in each person's Claude and is not timed here
  function routingCard(rt) {
    const days = (rt && rt.days) || []; const tot = {}; days.forEach(d => Object.entries(d.engines || {}).forEach(([k, v]) => { const t = tot[k] = tot[k] || { n: 0, fail: 0, ms: 0, tiers: {} }; t.n += v.n || 0; t.fail += v.fail || 0; t.ms += v.ms || 0; Object.entries(v.tiers || {}).forEach(([l, c]) => { t.tiers[l] = (t.tiers[l] || 0) + c; }); }));
    const LBL = { 'route:project': 'Routed to Project AI', 'route:deepseek': 'Routed to DeepSeek', 'route:claude': 'Routed to Claude', deepseek: 'DeepSeek routine work', delegate: 'Claude handed to DeepSeek' };
    const rows = Object.keys(LBL).filter(k => tot[k]).map(k => { const t = tot[k], timed = !/^route:/.test(k); return '<tr><td>' + esc(LBL[k]) + '</td><td>' + t.n + '</td><td>' + (timed ? t.fail + (t.n ? ' (' + Math.round(t.fail * 100 / t.n) + '%)' : '') : '') + '</td><td>' + (timed && t.n ? (t.ms / t.n / 1000).toFixed(1) + ' s' : '') + '</td><td class="xs muted">' + esc(['simple', 'standard', 'advanced', 'complex', 'critical'].filter(l => t.tiers[l]).map(l => l + ' ' + t.tiers[l]).join(', ')) + '</td></tr>'; }).join('');
    return '<div class="adm-card"><div class="adm-h"><h3>Assistant routing, last 30 days</h3><span class="muted xs">Which engine took each request and how it did</span></div>' + (rows ? '<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>What</th><th>Requests</th><th>Failed</th><th>Average time</th><th>Levels</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="small muted" style="margin:0">Nothing routed yet. Counts start when people use the Assistant box.</p>') + '<p class="xs muted" style="margin:8px 0 0">Counts only: no message text is kept. Claude works in each person\'s own Claude, so its time is not measured here. The expected engine for typical requests is checked by tests/route_eval.mjs.</p></div>';
  }
  function applyRange(raw) {
    const R = V.range, sp = R.span(A.rg); if (!raw || (!sp[0] && !sp[1])) return raw;
    const ps = raw.projects.filter(p => R.inRange(p.lastActivity, sp) || R.inRange(p.createdAt, sp)), act = ps.filter(p => !p.archived); const sum = f => act.reduce((a, p) => a + (f(p) || 0), 0);
    const kpis = Object.assign({}, raw.kpis, { active: act.length, archived: ps.length - act.length, customers: new Set(act.map(p => String(p.customer).trim().toLowerCase())).size, files: sum(p => p.files), bytes: sum(p => p.bytes), sessions: sum(p => p.sessions.total), upcoming: sum(p => p.sessions.upcoming), requirements: sum(p => p.requirements), flows: sum(p => p.flows), openActions: sum(p => p.openActions), overdue: sum(p => p.overdue), openQuestions: sum(p => p.openFeedback), raidOpen: sum(p => p.raidOpen), brdApproved: act.filter(p => p.brdStatus === 'approved').length, live: act.filter(p => p.stage === 6).length });
    const health = {}; Object.keys(HEALTH).forEach(k => { health[k] = 0; }); act.forEach(p => { health[p.health] = (health[p.health] || 0) + 1; });
    const weekly = (raw.weekly || []).filter(w => (!sp[1] || w.week <= sp[1]) && (!sp[0] || add7(w.week) >= sp[0])); const monthly = (raw.monthly || []).filter(m => (!sp[0] || m.month >= sp[0].slice(0, 7)) && (!sp[1] || m.month <= sp[1].slice(0, 7)));
    return Object.assign({}, raw, { projects: ps, kpis, health, weekly, monthly, stages: [0, 1, 2, 3, 4, 5, 6].map(n => act.filter(p => p.stage === n).length),
      attention: act.filter(p => p.reasons.length).sort((a, b) => b.reasons.length - a.reasons.length || b.overdue - a.overdue).slice(0, 8).map(p => ({ id: p.id, name: p.name, customer: p.customer, reasons: p.reasons })),
      recent: act.slice().sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 6).map(p => ({ id: p.id, name: p.name, customer: p.customer, lastActivity: p.lastActivity, stage: p.stage })) });
  }
  const add7 = w => { const d = new Date(w + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };
  V.range.hooks.adm = { state: () => A.rg, change: () => { show(); }, pdf: () => { const live = document.querySelector('.adm-main'); if (live) { V.range.printLive(live, 'Delivery Studio · Admin dashboard'); return; } const body = dashBody(); V.range.pdf({ title: 'Delivery Studio · Admin dashboard', sub: (DTABS.find(t => t[0] === A.dash) || [, ''])[1] + ' · Timeline: ' + V.range.label(A.rg) + ' · ' + applyRange(A.raw || A.data).kpis.active + ' active project(s)', html: body }); } };
  const show = () => V.setMode('admin'); V.adminShow = show;
  V.admRefresh = () => show(); V.admData = () => A.data; V.adminIsSuper = () => can('super');
  const stageDots = n => `<span class="adm-dots" title="${esc(STAGES[n])}">${[1, 2, 3, 4, 5, 6].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

  // ---------- dashboard ----------
  function kpi(label, value, sub, cls, go) { return `<div class="kpi ${cls || ''}${go ? ' click' : ''}"${go ? ` data-act="admGo" data-go="${go}" role="button" tabindex="0"` : ''}><div class="kpi-v">${value}</div><div class="kpi-l">${esc(label)}</div><div class="kpi-s">${sub}</div></div>`; }
  function bars(rows, fmtLabel, cls) { const mx = Math.max(1, ...rows.map(r => r.v)); return `<div class="bchart ${cls || ''}">${rows.map(r => `<div class="bcol" title="${esc(r.tip || '')}"><span class="bval">${r.v}</span><div class="bbar" style="--h:${Math.round(r.v / mx * 100)}%"></div><span class="blab">${esc(r.l)}</span></div>`).join('')}</div>`; }
  function overviewDash() {
    const d = A.data, k = d.kpis; const tot = Math.max(1, k.active);
    const h = d.health; const seg = [['blocked', '#D92D20'], ['overdue', '#B42318'], ['at_risk', '#E8690B'], ['on_track', '#12A35B'], ['insufficient', '#9A9AA6'], ['on_hold', '#6B6B78'], ['completed', '#1570EF']]; let acc = 0;
    const conic = seg.map(([key, c]) => { const a = acc / tot * 360; acc += (h[key] || 0); return `${c} ${a}deg ${acc / tot * 360}deg`; }).join(', ');
    const mx = Math.max(1, ...d.stages.slice(1)); const wk = d.weekly.map(w => ({ v: w.n, l: w.week.slice(5), tip: 'Week of ' + w.week })); const mo = d.monthly.map(m => ({ v: m.n, l: new Date(m.month + '-01T00:00:00Z').toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), tip: m.month }));
    const fmx = Math.max(1, ...d.files.map(f => f.bytes));
    return `<div class="kpi-grid">
      ${kpi('Active projects', k.active, `${k.archived} archived · ${k.customers} customer${k.customers === 1 ? '' : 's'}`, 'k-blue', 'projects')}
      ${kpi('Workshop sessions', k.sessions, `${k.upcoming} upcoming`, 'k-pink')}
      ${kpi('Requirements captured', k.requirements, `${k.flows} state flows proposed`, 'k-teal')}
      ${kpi('Open actions', k.openActions, k.overdue ? `<b class="bad">${k.overdue} overdue</b>` : 'None overdue', k.overdue ? 'k-warn' : '', 'attention')}
      ${kpi('Open customer questions', k.openQuestions, `${k.customerAccess} project${k.customerAccess === 1 ? '' : 's'} open to customers`, '')}
      ${kpi('BRDs approved', k.brdApproved, `${k.live} live`, 'k-blue')}
      ${kpi('People', k.people, `${k.activePeople7d} active in 7 days${k.guests ? ' · ' + k.guests + ' guest' + (k.guests === 1 ? '' : 's') : ''}`, '', 'users')}
      ${kpi('Stored files', k.files, size(k.bytes), '')}
    </div>
    <div class="adm-row two">
      <div class="adm-card"><div class="adm-h"><h3>Delivery pipeline</h3><span class="muted xs">Where each active project is today</span></div><div class="funnel">${d.stages.map((n, i) => `<div class="fn-row click" data-act="admStage" data-s="${i}" role="button" tabindex="0"><span class="fn-l">${esc(STAGES[i])}</span><div class="fn-t"><i style="width:${Math.max(n ? 4 : 0, Math.round(n / Math.max(1, i ? mx : Math.max(...d.stages)) * 100))}%" class="s${i}"></i></div><b>${n}</b></div>`).join('')}</div></div>
      <div class="adm-card"><div class="adm-h"><h3>Project health</h3><span class="muted xs">${k.active} active</span></div><div class="donut-wrap"><div class="donut" style="background:conic-gradient(${k.active ? conic : '#e3e9f5 0 360deg'})"><div><b>${k.active}</b><span>projects</span></div></div><ul class="legend">${seg.map(([key, c]) => `<li class="click" data-act="admFilter" data-f="${key}" role="button" tabindex="0"><i style="background:${c}"></i>${esc(HEALTH[key][0])}<b>${h[key] || 0}</b></li>`).join('')}</ul></div></div>
    </div>
    <div class="adm-row two">
      <div class="adm-card"><div class="adm-h"><h3>New projects</h3><span class="muted xs">Last 6 months</span></div>${bars(mo, null, 'pink')}</div>
      <div class="adm-card"><div class="adm-h"><h3>Platform activity</h3><span class="muted xs">Recorded actions per week</span></div>${bars(wk, null, 'blue')}</div>
    </div>
    <div class="adm-row three">
      <div class="adm-card"><div class="adm-h"><h3>Needs attention</h3><span class="muted xs">${d.attention.length} project${d.attention.length === 1 ? '' : 's'}</span></div>${d.attention.length ? `<ul class="alist">${d.attention.map(p => `<li class="click" data-act="admDetail" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="pav" style="background:${tone(p.name)}">${esc(initials(p.customer || p.name))}</div><div><b>${esc(p.name)}</b><div class="xs muted">${esc(p.reasons.join(' · '))}</div></div></li>`).join('')}</ul>` : '<div class="adm-empty">Nothing needs attention. Every active project is moving.</div>'}</div>
      <div class="adm-card"><div class="adm-h"><h3>Recently active</h3></div>${d.recent.length ? `<ul class="alist">${d.recent.map(p => `<li class="click" data-act="admDetail" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="pav" style="background:${tone(p.name)}">${esc(initials(p.customer || p.name))}</div><div><b>${esc(p.name)}</b><div class="xs muted">${esc(STAGES[p.stage])} · ${ago(p.lastActivity)}</div></div></li>`).join('')}</ul>` : '<div class="adm-empty">No projects yet.</div>'}</div>
      <div class="adm-card"><div class="adm-h"><h3>Files by type</h3><span class="muted xs">${size(k.bytes)} total</span></div>${d.files.length ? `<ul class="flist">${d.files.slice(0, 8).map(f => `<li><span>${esc(String(f.category).replace(/_/g, ' '))}</span><div class="fn-t"><i style="width:${Math.max(3, Math.round(f.bytes / fmx * 100))}%"></i></div><em>${f.n} · ${size(f.bytes)}</em></li>`).join('')}</ul>` : '<div class="adm-empty">No files uploaded yet.</div>'}</div>
    </div>`;
  }


  // ---------- dashboard tabs: Overview, Delivery, Customers, Team & usage, Quality & records ----------
  const DTABS = [['command', 'Command center'], ['overview', 'Activity overview'], ['delivery', 'Delivery'], ['customers', 'Customers'], ['usage', 'Team & usage'], ['quality', 'Quality & records']];
  const HC = { blocked: '#D92D20', overdue: '#B42318', at_risk: '#E8690B', on_track: '#12A35B', insufficient: '#9A9AA6', on_hold: '#6B6B78', completed: '#1570EF', cancelled: '#9A9AA6', churned: '#9A9AA6', not_workable: '#9A9AA6', discontinued: '#9A9AA6', archived: '#98A2B3' };
  const cap = t => { t = String(t || '').replace(/_/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : '—'; };
  const dcard = (t, sub, body, cls) => `<div class="adm-card ${cls || ''}"><div class="adm-h"><h3>${esc(t)}</h3>${sub ? `<span class="muted xs">${sub}</span>` : ''}</div>${body}</div>`;
  const empty = t => `<div class="adm-empty">${esc(t)}</div>`;
  function hbars(rows, unit) { if (!rows.length) return empty('Nothing to show yet.'); const mx = Math.max(1, ...rows.map(r => r.v)); return `<ul class="hb">${rows.map(r => `<li${r.go ? ` class="click" data-act="${r.go[0]}" data-id="${esc(r.go[1])}" role="button" tabindex="0"` : ''}><span class="hb-l" title="${esc(r.l)}">${esc(r.l)}</span><div class="hb-t"><i style="width:${Math.max(r.v ? 3 : 0, Math.round(r.v / mx * 100))}%;background:${r.c || '#1570EF'}"></i></div><em>${r.sub !== undefined ? r.sub : r.v + (unit || '')}</em></li>`).join('')}</ul>`; }
  function stackBars(rows, keys, cols, names) { const mx = Math.max(1, ...rows.map(r => keys.reduce((a, k) => a + (r[k] || 0), 0))); return `<div class="stk">${rows.map(r => { const t = keys.reduce((a, k) => a + (r[k] || 0), 0); return `<div class="stk-c" title="${esc(r.l + ': ' + keys.map((k, i) => (r[k] || 0) + ' ' + names[i]).join(', '))}"><span class="bval">${t || ''}</span><div class="stk-b" style="height:${Math.round(t / mx * 100)}%">${keys.map((k, i) => r[k] ? `<i style="flex:${r[k]};background:${cols[i]}"></i>` : '').join('')}</div><span class="blab">${esc(r.l)}</span></div>`; }).join('')}</div><div class="lg2 inl">${names.map((n, i) => `<span><i style="background:${cols[i]}"></i>${esc(n)}</span>`).join('')}</div>`; }
  function donutOf(parts, label) { const tot = parts.reduce((a, x) => a + x.v, 0); if (!tot) return empty('Nothing to show yet.'); let acc = 0; const conic = parts.filter(x => x.v).map(x => { const a = acc / tot * 360; acc += x.v; return `${x.c} ${a}deg ${acc / tot * 360}deg`; }).join(', '); return `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${conic})"><div><b>${tot}</b><span>${esc(label)}</span></div></div><ul class="lg2">${parts.map(x => `<li><i style="background:${x.c}"></i>${esc(x.l)}<b>${x.v}</b></li>`).join('')}</ul></div>`; }
  function heatmap(cells) { const g = {}; let mx = 1; cells.forEach(c => { g[c.d + '_' + c.h] = c.n; mx = Math.max(mx, c.n); }); const order = [1, 2, 3, 4, 5, 6, 0], nm = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `<div class="heat"><div></div>${Array.from({ length: 24 }, (_, h) => `<span class="htime">${h % 6 === 0 ? String(h).padStart(2, '0') : ''}</span>`).join('')}${order.map(d => `<span class="hday">${nm[d]}</span>${Array.from({ length: 24 }, (_, h) => { const n = g[d + '_' + h] || 0; return `<i title="${nm[d]} ${String(h).padStart(2, '0')}:00 UTC: ${n} action${n === 1 ? '' : 's'}" style="--o:${(n / mx).toFixed(2)}"></i>`; }).join('')}`).join('')}</div><div class="xs muted" style="margin-top:8px">Recorded actions in the last 60 days, by weekday and hour (UTC). Darker means busier.</div>`; }
  const idleOf = p => Math.max(0, Math.floor((Date.now() - new Date(p.lastActivity || p.updatedAt).getTime()) / 864e5));
  const daysLeft = p => p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 864e5) : null;
  const projGo = p => ['admDetail', p.id];

  function dashBody() {
    const keep = A.data; A.data = applyRange(A.raw || keep);
    try { if (A.dash === 'command') return V.cmd ? V.cmd.html() : ''; return (A.dash === 'delivery' ? deliveryDash() : A.dash === 'customers' ? customersDash() : A.dash === 'usage' ? usageDash() : A.dash === 'quality' ? qualityDash() : overviewDash()) + (V.admViz ? V.admViz.extra(A.dash, { A, STAGES, ownerName }) : ''); } finally { A.data = keep; }
  }
  function dashboard() {
    const bar = V.range.bar('adm', A.rg, { note: A.rg.period === 'all' ? '' : 'Projects with activity or created in this period' });
    const tabs = `<div class="dtabs" role="tablist" aria-label="Dashboard views">${DTABS.map(([k, l]) => `<button role="tab" aria-selected="${A.dash === k}" class="dtab${A.dash === k ? ' on' : ''}" data-act="admTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    return tabs + dashBody();
  }

  function deliveryDash() {
    const act = A.data.projects.filter(p => !p.archived); if (!act.length) return dcard('Delivery', '', empty('No active projects yet.'));
    const prog = p => Math.round(p.stage / 6 * 100); const avg = Math.round(act.reduce((a, p) => a + prog(p), 0) / act.length);
    const open = act.filter(p => p.stage < 6 && p.endDate); const past = open.filter(p => daysLeft(p) < 0), soon = open.filter(p => daysLeft(p) >= 0 && daysLeft(p) <= 30);
    const idleAvg = Math.round(act.reduce((a, p) => a + idleOf(p), 0) / act.length); const live = act.filter(p => p.stage === 6).length;
    const byStage = [0, 1, 2, 3, 4, 5, 6].map(i => { const g = act.filter(p => p.stage === i); return { v: g.length ? Math.round(g.reduce((a, p) => a + idleOf(p), 0) / g.length) : 0, l: STAGES[i].replace('Not started', 'New'), tip: g.length + ' project' + (g.length === 1 ? '' : 's') }; });
    const brd = {}; act.forEach(p => { const k = p.brdStatus || 'draft'; brd[k] = (brd[k] || 0) + 1; }); const BC = ['#98A2B3', '#F79009', '#1570EF', '#079455', '#1D1A5E'];
    const sorted = act.slice().sort((a, b) => b.stage - a.stage || a.name.localeCompare(b.name));
    const tl = open.slice().sort((a, b) => daysLeft(a) - daysLeft(b)).slice(0, 8);
    return `<div class="kpi-grid k5">
      ${kpi('Average progress', avg + '%', `across ${act.length} active project${act.length === 1 ? '' : 's'}`, 'k-blue')}
      ${kpi('Live', live, `${act.length - live} still in delivery`, 'k-teal')}
      ${kpi('Past planned end date', past.length, past.length ? '<b class="bad">Needs a new date or a push</b>' : 'None', past.length ? 'k-warn' : '')}
      ${kpi('Due in 30 days', soon.length, 'Planned end date coming up', '')}
      ${kpi('Average days idle', idleAvg, 'Since last activity', idleAvg > 14 ? 'k-warn' : 'k-pink')}
    </div>
    <div class="adm-row two">
      ${dcard('Progress by project', 'Stage reached, out of 6', hbars(sorted.slice(0, 12).map(p => ({ l: p.name, v: prog(p), sub: STAGES[p.stage], c: HC[p.health] || '#1570EF', go: projGo(p) }))))}
      ${dcard('Planned end dates', 'Soonest first', tl.length ? `<ul class="alist">${tl.map(p => { const dl = daysLeft(p); return `<li class="click" data-act="admDetail" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="pav" style="background:${tone(p.name)}">${esc(initials(p.customer || p.name))}</div><div><b>${esc(p.name)}</b><div class="xs muted">${esc(p.customer)} · ends ${esc(fmt(p.endDate))} · ${esc(STAGES[p.stage])}</div></div><span class="spacer"></span>${chip(dl < 0 ? 'h-attention' : dl <= 14 ? 'h-stale' : 'h-healthy', dl < 0 ? Math.abs(dl) + ' d over' : dl + ' d left')}</li>`; }).join('')}</ul>` : empty('No planned end dates set on active projects.'))}
    </div>
    <div class="adm-row three">
      ${dcard('Idle days by stage', 'Average since last activity', bars(byStage, null, 'pink'))}
      ${dcard('Requirements per project', 'Top 8', hbars(act.slice().sort((a, b) => b.requirements - a.requirements).slice(0, 8).map(p => ({ l: p.name, v: p.requirements, c: '#14a8a8', go: projGo(p) }))))}
      ${dcard('BRD status', 'Active projects', donutOf(Object.keys(brd).map((k, i) => ({ l: cap(k), v: brd[k], c: BC[i % BC.length] })), 'projects'))}
    </div>
    <div class="adm-row two">
      ${dcard('Workshop sessions', 'Held vs planned, top 8', hbars(act.slice().sort((a, b) => b.sessions.total - a.sessions.total).slice(0, 8).map(p => ({ l: p.name, v: p.sessions.total, sub: p.sessions.done + ' held · ' + p.sessions.upcoming + ' upcoming', c: '#e91e84', go: projGo(p) }))))}
      ${dcard('Open work by project', 'Open actions, red when overdue', hbars(act.filter(p => p.openActions).sort((a, b) => b.openActions - a.openActions).slice(0, 8).map(p => ({ l: p.name, v: p.openActions, sub: p.openActions + (p.overdue ? ' · ' + p.overdue + ' overdue' : ''), c: p.overdue ? '#d81b60' : '#1570EF', go: projGo(p) }))))}
    </div>`;
  }

  function customersDash() {
    const act = A.data.projects.filter(p => !p.archived); const m = {};
    act.forEach(p => { const k = (p.customer || '—').trim() || '—'; const c = m[k] = m[k] || { name: k, n: 0, prog: 0, req: 0, act: 0, od: 0, q: 0, acc: 0, last: 0 }; c.n++; c.prog += p.stage / 6 * 100; c.req += p.requirements; c.act += p.openActions; c.od += p.overdue; c.q += p.openFeedback; c.acc += p.customerAccessEnabled ? 1 : 0; c.last = Math.max(c.last, new Date(p.lastActivity || p.updatedAt).getTime()); });
    const rows = Object.values(m).sort((a, b) => b.n - a.n || b.req - a.req); if (!rows.length) return dcard('Customers', '', empty('No active projects yet.'));
    const on = act.filter(p => p.customerAccessEnabled).length;
    return `<div class="kpi-grid">
      ${kpi('Customers', rows.length, `${act.length} active project${act.length === 1 ? '' : 's'}`, 'k-blue')}
      ${kpi('Largest portfolio', rows[0].n, esc(rows[0].name), 'k-pink')}
      ${kpi('Open customer questions', rows.reduce((a, c) => a + c.q, 0), `${rows.filter(c => c.q).length} customer${rows.filter(c => c.q).length === 1 ? '' : 's'} waiting`, 'k-teal')}
      ${kpi('Customer access on', on, `of ${act.length} project${act.length === 1 ? '' : 's'}`, '')}
    </div>
    ${dcard('Customer roll-up', 'Click a customer to see their projects', `<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>Customer</th><th>Projects</th><th>Average progress</th><th>Requirements</th><th>Open actions</th><th>Overdue</th><th>Open questions</th><th>Customer access</th><th>Last activity</th></tr></thead><tbody>${rows.map(c => `<tr class="click" data-act="admCust" data-name="${esc(c.name)}" role="button" tabindex="0"><td><div class="pcell"><div class="pav" style="background:${tone(c.name)}">${esc(initials(c.name))}</div><b>${esc(c.name)}</b></div></td><td>${c.n}</td><td><div class="fn-t" style="min-width:90px"><i style="width:${Math.round(c.prog / c.n)}%"></i></div><span class="xs muted">${Math.round(c.prog / c.n)}%</span></td><td>${c.req}</td><td>${c.act}</td><td>${c.od ? `<b class="bad">${c.od}</b>` : '0'}</td><td>${c.q}</td><td>${c.acc}/${c.n}</td><td class="xs">${ago(c.last)}</td></tr>`).join('')}</tbody></table></div>`)}
    <div class="adm-row three">
      ${dcard('Projects per customer', 'Top 8', hbars(rows.slice(0, 8).map(c => ({ l: c.name, v: c.n, c: '#1570EF' }))))}
      ${dcard('Requirements per customer', 'Top 8', hbars(rows.slice().sort((a, b) => b.req - a.req).slice(0, 8).map(c => ({ l: c.name, v: c.req, c: '#14a8a8' }))))}
      ${dcard('Customer access', 'Active projects', donutOf([{ l: 'Open to customer', v: on, c: '#1570EF' }, { l: 'Team only', v: act.length - on, c: '#cbd3e6' }], 'projects'))}
    </div>`;
  }

  function usageDash() {
    const i = A.ins; if (!i) return dcard('Team & usage', '', '<div class="adm-empty">Loading…</div>');
    const k = A.data.kpis; const su = i.signups.reduce((a, w) => a + w.staff + w.guests, 0); const last = i.daily[i.daily.length - 1] || { staff: 0, customers: 0 };
    const cust14 = i.daily.reduce((a, d) => a + d.customers, 0); const peak = i.daily.reduce((a, d) => d.staff > a.staff ? d : a, { staff: 0, day: '' });
    const own = {}; A.data.projects.filter(p => !p.archived).forEach(p => { const o = ownerName(p.owners); const x = own[o] = own[o] || { n: 0, act: 0, od: 0, req: 0 }; x.n++; x.act += p.openActions; x.od += p.overdue; x.req += p.requirements; });
    const ow = Object.keys(own).map(name => ({ name, ...own[name] })).sort((a, b) => b.n - a.n).slice(0, 10);
    return `<div class="kpi-grid k5">
      ${kpi('New accounts', su, 'Last 12 weeks', 'k-blue')}
      ${kpi('Active today', last.staff, 'Staff signed in today', 'k-teal')}
      ${kpi('Active in 7 days', k.activePeople7d, 'Staff accounts', '')}
      ${kpi('Customer visits', cust14, 'Last 14 days', 'k-pink')}
      ${kpi('Busiest day', peak.staff, peak.day ? fmt(peak.day) : 'No data yet', '')}
    </div>
    <div class="adm-row two">
      ${dcard('Sign-ups per week', 'Staff and guests, 12 weeks', stackBars(i.signups.map(w => ({ l: w.week.slice(5), staff: w.staff, guests: w.guests })), ['staff', 'guests'], ['#1570EF', '#e91e84'], ['Staff', 'Guests']))}
      ${dcard('Daily activity', 'People signed in, 14 days', stackBars(i.daily.map(d => ({ l: d.day.slice(8), staff: d.staff, customers: d.customers })), ['staff', 'customers'], ['#14a8a8', '#6b4ee6'], ['Staff', 'Customer visits']))}
    </div>
    ${dcard('When the team works', 'Weekday by hour', heatmap(i.heat))}
    <div class="adm-row two">
      ${dcard('Most common actions', 'Last 30 days', hbars(i.actions.map(a => ({ l: cap(a.action), v: a.n, c: '#1570EF' }))))}
      ${dcard('Most active people', 'Last 30 days', hbars(i.actors.map(a => ({ l: a.who, v: a.n, c: '#e91e84' }))))}
    </div>
    ${dcard('Workload by project owner', 'Active projects', ow.length ? `<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>Owner</th><th>Projects</th><th>Requirements</th><th>Open actions</th><th>Overdue</th></tr></thead><tbody>${ow.map(o => `<tr><td><b>${esc(o.name)}</b></td><td>${o.n}</td><td>${o.req}</td><td>${o.act}</td><td>${o.od ? `<b class="bad">${o.od}</b>` : '0'}</td></tr>`).join('')}</tbody></table></div>` : empty('No owners yet.'))}`;
  }

  function qualityDash() {
    const i = A.ins; if (!i) return dcard('Quality & records', '', '<div class="adm-empty">Loading…</div>');
    const act = A.data.projects.filter(p => !p.archived); const n = Math.max(1, act.length);
    const st = {}, pr = {}; i.feedback.byKind.forEach(r => { st[r.status] = (st[r.status] || 0) + r.n; pr[r.priority] = (pr[r.priority] || 0) + r.n; });
    const SC = { open: '#F79009', answered: '#1570EF', resolved: '#079455', closed: '#98A2B3' }; const PC = { urgent: '#D92D20', high: '#F79009', normal: '#1570EF', low: '#98A2B3' };
    const kindRows = k => { const m = {}; i.items.filter(r => r.kind === k).forEach(r => { m[r.st || 'No status'] = (m[r.st || 'No status'] || 0) + r.n; }); return Object.keys(m).map(x => ({ l: cap(x), v: m[x], c: /done|closed|signed|resolved|passed|mitigated/i.test(x) ? '#14a8a8' : /block|fail|open|risk/i.test(x) ? '#e08a00' : '#1570EF' })).sort((a, b) => b.v - a.v); };
    const tot = f => act.filter(f).length; const pct = c => Math.round(c / n * 100);
    const comp = [['Modules in scope', tot(p => p.modulesInScope > 0)], ['Workshop sessions planned', tot(p => p.sessions.total > 0)], ['Requirements captured', tot(p => p.requirements > 0)], ['State flows proposed', tot(p => p.flows > 0)], ['BRD exported', tot(p => p.brdExports > 0)], ['Customer access on', tot(p => p.customerAccessEnabled)]].map(([l, c]) => ({ l, v: pct(c), sub: c + ' of ' + act.length, c: '#6b4ee6' }));
    const totQ = Object.values(st).reduce((a, b) => a + b, 0);
    return `<div class="kpi-grid">
      ${kpi('Customer questions', totQ, `${st.open || 0} open`, 'k-pink')}
      ${kpi('Average response time', i.feedback.avgHours ? (i.feedback.avgHours < 48 ? i.feedback.avgHours + ' h' : Math.round(i.feedback.avgHours / 24) + ' d') : '—', `${i.feedback.answered} answered`, i.feedback.avgHours > 72 ? 'k-warn' : 'k-teal')}
      ${kpi('Sign-offs signed', i.items.filter(r => r.kind === 'signoff' && r.st === 'signed').reduce((a, r) => a + r.n, 0), 'BRD, UAT and go-live', 'k-blue')}
      ${kpi('Open risks and issues', i.items.filter(r => r.kind === 'raid' && !/closed|resolved|done|mitigated/i.test(r.st)).reduce((a, r) => a + r.n, 0), 'Across active and archived projects', '')}
    </div>
    <div class="adm-row three">
      ${dcard('Customer questions by status', '', donutOf(Object.keys(st).map(k => ({ l: cap(k), v: st[k], c: SC[k] || '#6b4ee6' })), 'questions'))}
      ${dcard('Questions by priority', '', hbars(Object.keys(pr).map(k => ({ l: cap(k), v: pr[k], c: PC[k] || '#1570EF' })).sort((a, b) => b.v - a.v)))}
      ${dcard('New questions per week', 'Last 8 weeks', bars(i.feedback.weekly.map(w => ({ v: w.n, l: w.week.slice(5), tip: 'Week of ' + w.week })), null, 'pink'))}
    </div>
    <div class="adm-row three">
      ${dcard('Actions by status', '', hbars(kindRows('action')))}
      ${dcard('Risks and issues by status', '', hbars(kindRows('raid')))}
      ${dcard('UAT cases by status', '', hbars(kindRows('uat')))}
    </div>
    <div class="adm-row two">
      ${dcard('How complete are active projects', 'Share of projects that have each piece', hbars(comp, ''))}
      ${dcard('Storage growth', 'Files added per month, last 6 months', bars(i.storage.map(m => ({ v: Math.round(m.bytes / 1e6 * 10) / 10, l: new Date(m.month + '-01T00:00:00Z').toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), tip: m.n + ' files, ' + size(m.bytes) })), null, 'blue') + '<div class="xs muted" style="margin-top:8px">Bar values are megabytes added that month.</div>')}
    </div>`;
  }
  ACT.admTab = async a => { A.dash = a.getAttribute('data-t'); show(); await lazy(); };
  ACT.admCust = a => { A.q = a.getAttribute('data-name') || ''; A.sec = 'projects'; A.filter = 'all'; A.stage = 'all'; show(); };

  // ---------- projects ----------
  function filtered() {
    const q = A.q.toLowerCase(); return A.data.projects.filter(p => {
      if (q && !(p.name + ' ' + p.customer + ' ' + p.owners).toLowerCase().includes(q)) return false;
      if (A.stage !== 'all' && (p.archived || p.stage !== Number(A.stage))) return false;
      if (A.filter === 'archived') return p.archived; if (p.archived) return false;
      if (A.filter === 'all') return true; if (A.filter === 'attention') return p.health === 'attention' || p.reasons.length > 0; return p.health === A.filter;
    });
  }
  function projects() {
    const rows = filtered(); const d = A.data; const cnt = f => d.projects.filter(p => f === 'archived' ? p.archived : !p.archived && (f === 'all' || (f === 'attention' ? p.reasons.length : p.health === f))).length;
    const chips = [['all', 'All'], ['attention', 'Needs attention'], ['blocked', 'Blocked'], ['overdue', 'Overdue'], ['at_risk', 'At risk'], ['on_track', 'On track'], ['insufficient', 'Insufficient data'], ['on_hold', 'On hold'], ['completed', 'Completed'], ['churned', 'Churned'], ['not_workable', 'Not workable'], ['discontinued', 'Discontinued'], ['cancelled', 'Cancelled'], ['archived', 'Archived']].map(([k, l]) => `<button class="fchip${A.filter === k ? ' on' : ''}" data-act="admFilter" data-f="${k}">${l}<b>${cnt(k)}</b></button>`).join('');
    return `<div class="adm-tools"><input type="search" id="admQ" placeholder="Search project, customer or owner" value="${esc(A.q)}" aria-label="Search projects"><select id="admStage" data-change="admStageSel" aria-label="Stage"><option value="all">Any stage</option>${STAGES.map((s, i) => `<option value="${i}"${String(A.stage) === String(i) ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select><span class="spacer"></span><button class="btn" data-act="admExport">Export CSV</button></div>
      <div class="fchips">${chips}</div>
      ${rows.length ? `<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>Project</th><th>Stage</th><th>Health</th><th>Sessions</th><th>Requirements</th><th>Actions</th><th>Questions</th><th>Last activity</th><th>Owner</th></tr></thead><tbody>${rows.map(p => `<tr class="click${p.archived ? ' arch' : ''}" data-act="admDetail" data-id="${esc(p.id)}" tabindex="0"><td><div class="pcell"><div class="pav" style="background:${tone(p.name)}">${esc(initials(p.customer || p.name))}</div><div><b>${esc(p.name)}</b><div class="xs muted">${esc(p.customer)}</div></div></div></td><td>${stageDots(p.stage)}<div class="xs muted">${esc(STAGES[p.stage])}</div></td><td>${hchip(p.health)}</td><td>${p.sessions.done}/${p.sessions.total}</td><td>${p.requirements}</td><td>${p.openActions}${p.overdue ? ` <b class="bad xs">${p.overdue} late</b>` : ''}</td><td>${p.openFeedback}</td><td class="xs">${ago(p.lastActivity)}</td><td class="xs">${esc(ownerName(p.owners))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="adm-card adm-empty">No project matches these filters.</div>'}`;
  }
  function csv() {
    const head = ['Project', 'Customer', 'Stage', 'Health', 'Sessions done', 'Sessions total', 'Requirements', 'Open actions', 'Overdue', 'Open questions', 'Files', 'Storage bytes', 'Owners', 'Created', 'Last activity', 'Archived'];
    const q = v => '"' + String(v === undefined || v === null ? '' : root.FWB.csvText(v)).replace(/"/g, '""') + '"';
    return [head.map(q).join(',')].concat(filtered().map(p => [p.name, p.customer, STAGES[p.stage], p.archived ? 'archived' : p.health, p.sessions.done, p.sessions.total, p.requirements, p.openActions, p.overdue, p.openFeedback, p.files, p.bytes, p.owners, fmt(p.createdAt), fmt(p.lastActivity), p.archived ? 'yes' : 'no'].map(q).join(','))).join('\r\n');
  }

  // ---------- users, access, activity ----------
  function users() {
    if (!A.users) return '<div class="adm-card adm-empty">Loading…</div>';
    return `<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>Person</th><th>Email</th><th>Admin role</th><th>Projects</th><th>Last active</th><th>Status</th><th></th></tr></thead><tbody>${A.users.map(u => `<tr><td><div class="pcell"><div class="pav" style="background:${tone(u.email)}">${esc(initials(u.name))}</div><b>${esc(u.name)}</b>${u.guest ? ' ' + chip('h-stale', 'Guest') : ''}</div></td><td class="xs">${esc(u.guest ? '—' : u.email)}</td><td>${u.role ? rchip(u.role) : '<span class="muted xs">—</span>'}</td><td>${u.projects}</td><td class="xs">${ago(u.lastSeen)}</td><td>${u.disabled ? chip('h-attention', 'Disabled') : chip('h-healthy', 'Active')}</td><td>${can('admin') && u.role !== 'super' && (!u.role || can('super')) ? `<button class="btn sm" data-act="admUserToggle" data-id="${esc(u.id)}" data-to="${u.disabled ? '0' : '1'}">${u.disabled ? 'Enable' : 'Disable'}</button> <button class="btn sm danger" data-act="admUserRemove" data-id="${esc(u.id)}">Remove</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No accounts yet.</td></tr>'}</tbody></table></div>`;
  }
  function access() {
    if (!can('super')) return '<div class="adm-card adm-empty">Only the platform owner manages access.</div>';
    const a = A.access; if (!a) return '<div class="adm-card adm-empty">Loading…</div>';
    return `<div class="role-cards"><div class="rc"><div>${rchip('super')}</div><p>Everything, including who has access. There is one owner; the owner can hand the role to another Facilio email and then has no admin access at all.</p></div><div class="rc"><div>${rchip('admin')}</div><p>Sees every project and insight, opens any project, archives and restores, manages members and accounts. Cannot grant access.</p></div><div class="rc"><div>${rchip('sub')}</div><p>Read-only. Sees the dashboard, projects, users and activity, and can open any project to look, but cannot change anything.</p></div></div>
      <div class="adm-card"><div class="adm-h"><h3>Give someone access</h3><span class="muted xs">Enter their Facilio email. They sign in with their Facilio Microsoft account; there are no separate passwords.</span></div>
        <div class="grant-form"><label class="afld">Email<input id="gr_email" type="email" placeholder="name@facilio.com" autocomplete="off"></label><label class="afld">Name (optional)<input id="gr_name" type="text" autocomplete="off"></label><label class="afld">Role<select id="gr_role"><option value="admin">Admin: manage everything</option><option value="sub">Sub admin: view only</option></select></label><button class="btn primary" data-act="admGrant">Grant access</button></div></div>
      <div class="adm-card"><div class="adm-h"><h3>People with admin access</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th>Role</th><th>Account</th><th>Last active</th><th>Added</th><th></th></tr></thead><tbody>
        ${a.owners.map(o => `<tr><td><b>${esc(o.name || o.email)}</b><div class="xs muted">${esc(o.email)}</div></td><td>${rchip('super')}</td><td>${o.hasAccount ? chip('h-healthy', 'Active') : chip('h-attention', 'Not created')}</td><td class="xs">${ago(o.lastSeen)}</td><td class="xs">—</td><td>${o.email === (A.data && A.data.me && A.data.me.email) ? '<button class="btn sm" data-act="admOwnerHand">Hand over ownership</button>' : ''}</td></tr>`).join('')}
        ${a.grants.map(g => `<tr><td><b>${esc(g.name || g.email)}</b><div class="xs muted">${esc(g.email)}</div></td><td><select data-change="admRole" data-email="${esc(g.email)}" aria-label="Role"><option value="admin"${g.role === 'admin' ? ' selected' : ''}>Admin</option><option value="sub"${g.role === 'sub' ? ' selected' : ''}>Sub admin</option></select></td><td>${g.disabled ? chip('h-attention', 'Disabled') : g.hasAccount ? chip('h-healthy', 'Active') : chip('h-attention', 'No account')}</td><td class="xs">${ago(g.lastSeen)}</td><td class="xs">${fmt(g.createdAt)}</td><td style="white-space:nowrap"><button class="btn sm" data-act="admRevoke" data-email="${esc(g.email)}">Remove access</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  function activity() {
    if (!A.audit) return '<div class="adm-card adm-empty">Loading…</div>';
    return `<div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Project</th><th>Detail</th></tr></thead><tbody>${A.audit.map(e => `<tr><td class="xs">${fmtT(e.at)}</td><td class="xs">${esc(e.actor || '—')}</td><td>${esc(e.action.replace(/[_-]/g, ' '))}</td><td class="xs">${esc(e.project || '—')}</td><td class="xs">${esc(e.detail)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No activity recorded.</td></tr>'}</tbody></table></div>`;
  }

  V.adminHtml = function () {
    const d = A.data; if (!d) return '<div class="adm-wrap"><div class="muted" style="padding:40px">Loading…</div></div>';
    const nav = [['dashboard', 'Dashboard', 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z'], ['assistant', 'Assistant', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'], ['projects', 'Projects', 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'], ['users', 'Users', 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0z'], ['access', 'Access', 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'super'], ['ai', 'AI provider', 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z', 'admin'], ['integrations', 'Integrations', 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', 'admin'], ['discover', 'Discover more', 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z', 'admin'], ['activity', 'Activity', 'M3 12h4l3-8 4 16 3-8h4']].filter(n => !n[3] || can(n[3]));
    const title = { assistant: 'Assistant', dashboard: 'Dashboard', projects: 'Projects', users: 'Users', access: 'Access', ai: 'AI provider', integrations: 'Integrations', discover: 'Discover more', activity: 'Activity' }[A.sec];
    const sub = { assistant: 'Ask about every project you oversee, see what needs attention now, and remind owners through Otto', dashboard: 'Portfolio health, what needs attention and why, across every project', projects: `${d.kpis.active} active · ${d.kpis.archived} archived. Click a project for its insights.`, integrations: 'Every connection this app uses: what it is for, who needs it, and whether it works', discover: 'Product highlights shown to customers on their Explore Facilio page', users: 'Accounts on this platform', access: 'Who can use this admin console', ai: 'Choose the AI provider and see how Outlook works here', activity: 'Latest recorded actions across all projects' }[A.sec];
    const body = A.sec === 'assistant' ? (V.adminAssist ? V.adminAssist.html() : '') : A.sec === 'dashboard' ? (V.adminBento ? V.adminBento(dashboard) : dashboard()) : A.sec === 'projects' ? projects() : A.sec === 'users' ? users() : A.sec === 'access' ? access() : A.sec === 'ai' ? aiPanel() : A.sec === 'integrations' ? integrationsPanel() : A.sec === 'discover' ? (V.admDiscover ? V.admDiscover.html() : '') : activity();
    return `<div class="adm-wrap"><aside class="adm-nav" aria-label="Admin sections"><div class="adm-me"><div class="pav lg" style="background:${tone(d.me.email || 'x')}">${esc(initials(d.me.name || d.me.email))}</div><div><b>${esc(d.me.name || 'Admin')}</b><div class="xs muted">${esc(d.me.email || '')}</div>${rchip(d.me.role)}</div></div>
      ${nav.map(([k, l, p]) => `<button class="adm-ni${A.sec === k ? ' on' : ''}" data-act="admSec" data-s="${k}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg><span>${l}</span>${k === 'projects' ? `<em>${d.kpis.active}</em>` : ''}</button>`).join('')}
      <div class="adm-nav-foot">${root.FWBRun ? '' : '<button class="sb-out" data-act="admPw">Change my password</button>'}<button class="sb-out" data-act="logout" title="Sign out and return to the sign-in page"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</button></div></aside>
      <main class="adm-main"><div class="adm-hero"><div class="adm-hero-t"><p class="adm-crumb">Admin console</p><h1>${title}</h1><p class="adm-sub">${esc(sub)}</p><div class="adm-hero-a">${d.me.role === 'sub' ? chip('r-sub', 'Read-only access') : ''}${A.sec === 'dashboard' ? V.range.bar('adm', A.rg, {}) : ''}<button class="hm-btn ghost" type="button" data-act="admRefresh"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>Refresh</button></div></div><div class="adm-hero-art" aria-hidden="true"><div class="hm-lt" data-lottie="${{ dashboard: 'scene-dash', projects: 'scene-building', users: 'scene-workshop', access: 'scene-connect', ai: 'scene-dash', activity: 'scene-guide' }[A.sec] || 'scene-dash'}"></div></div></div>${body}</main></div>`;
  };

  // ---------- AI providers and Outlook ----------
  // Every connection the app uses, in plain words: what it is for, who needs it, whether it works, where it is set up.
  function integrationsPanel() {
    const m = A.integ; const l = m && m.last; const ai = A.ai && A.ai.st;
    const mailOk = !!(l && l.ok); const mailTxt = !m ? 'Checking…' : m.error ? m.error : !l ? 'Needs configuration. No sync has run yet.' : l.ok ? 'Working. Last sync ' + fmt(l.at) + '.' : 'Last sync failed: ' + l.error;
    const go = (sec, l2) => '<button class="btn sm" data-act="admSec" data-s="' + sec + '">' + l2 + '</button>';
    // [group, icon, name, tone (ok or warn), status, what it is for, who needs it, set up, more]
    const L = [
      ['Platform', 'l:gear', 'facilio.work platform', 'ok', 'Always on', 'Hosts the app, its database, its file storage and the Facilio sign-in. The Teams bot (Otto) and the Claude connector also run on it.', 'Everyone', 'Nothing to do. Deploys go through the facilio work connector (see docs/operations/DEPLOY.md). While the app is in review, only the owner and collaborators can open it.', ''],
      ['Platform', 'l:lock', 'Facilio sign-in (Microsoft)', 'ok', 'Always on', 'People sign in with their Facilio Microsoft account. There are no separate passwords. Customer sign-in is not available yet.', 'Team members and admins', 'Access section: give someone a Facilio email. Platform owner: the secret platform_owner, or the app owner.', ''],
      ['AI', 'l:spark', 'AI: DeepSeek', ai ? (ai.defaultProvider === 'deepseek' ? 'ok' : 'warn') : 'warn', ai ? 'Default provider' : 'See AI provider', 'Writes first drafts: BRD sections, guides, test plans, reports, task help, flows from a description.', 'Every team member who presses a Generate button', go('ai', 'Open AI provider') + ' Test DeepSeek and set models there.', 'No key needed: DeepSeek runs through the platform.'],
      ['AI', 'l:eye', 'AI: reading pictures', 'warn', 'Check it', 'Reads a picture of a process and turns it into a flow (Process Whiteboard, image import). Uses the platform image model.', 'Team members importing from an image', go('ai', 'Open AI provider') + ' Use Check image reading once. If it fails, the Open in Claude route still works.', ''],
      ['AI', 'l:lock', 'Claude API key (optional)', ai && ai.claude ? 'ok' : 'warn', ai && ai.claude ? 'Configured' : 'Not set', 'Lets a type of work run on the Claude API from inside the app. Not needed: DeepSeek and Open in Claude cover everything.', 'Admins only', go('ai', 'Open AI provider'), 'Billed separately to the key owner.'],
      ['Claude', 'l:link', 'Open in Claude (your own Claude)', 'ok', 'On', "Every Open in Claude and Add from Claude button. Sends a ready prompt to the person's own Claude. No API key, no Anthropic billing.", 'Team members with a Claude account', 'Nothing to configure here. Each person installs the Claude Desktop extension (Project Settings, Claude Desktop extension) if they want pictures and documents passed across. On a Team or Enterprise Claude plan an owner may need to allow desktop extensions.', 'Hand-off packages live in platform file storage for one hour and are deleted when closed.'],
      ['Claude', 'l:spark', 'Claude connector (facilio work)', 'ok', 'On', "Lets each person's Claude read and write the project records through the connector tools: requirements, tasks, minutes, transfers, tickets and more. Access follows the person's own project role.", 'Team members who use Claude', 'Add the facilio work connector in Claude (Claude setup page). Nothing to set here.', 'The tool list and the skills text are kept in step with the app; see the Claude setup and Team Guide pages.'],
      ['Microsoft 365 and Teams', 'l:bell', 'Notifications', 'ok', 'In the app', 'The bell, a live pop-up, and per-person settings (bell, pop-up, Teams, quiet hours). Events: task assigned, customer sign-off, stage closed, Claude suggestions, mail from Claude, job finished.', 'Everyone', 'Each person sets their own choices in the bell menu. Teams stays off until it is switched on, and sends at most 5 a day.', ''],
      ['Microsoft 365 and Teams', 'l:link', 'Microsoft Teams (Otto)', 'warn', 'Not verified live', 'Otto is the facilio.work Teams bot. It calls the Studio tools as the person who wrote to it: ask for your tasks, raise a ticket, and reply Done, Blocked or In Progress to a task you own (only the owner can; approvals stay in the Studio).', 'Team members who work from Teams', "Open the app in Teams through Otto. Messages from the Studio to Teams stay off until the owner adds the plain secret teams_notify = on. The platform has no scheduler, so a message is sent only when someone presses the button or a person's Claude runs it.", ''],
      ['Microsoft 365 and Teams', 'l:mail', 'Support mailbox (Microsoft 365)', mailOk ? 'ok' : 'warn', mailOk ? 'Working' : 'Needs setup', "Used by the older ticket feature, which is no longer in the menu. Customer mail for tasks now comes through each person's own Claude and Outlook (Tasks, Mail inbox); the Studio does not read a shared mailbox for that.", 'The support team', esc(mailTxt) + ' Managed from Tickets, Support mailbox. Needs the graph_mail credential with Mail.Read for this app.', ''],
      ['Microsoft 365 and Teams', 'l:mail', 'Outlook', 'ok', 'Open and compose only', 'Compose in Outlook and Open Outlook open a draft in Outlook on the web for the person to review and send.', 'Anyone sending a message from the app', 'Nothing to set up. Nothing is sent from Delivery Studio.', ''],
      ['Inside the app', 'l:spark', 'Discover more with Facilio', 'ok', 'On', 'Product highlights shown to customers on their Explore Facilio page and to the team in the bell menu.', 'Customers and team', go('discover', 'Open Discover more'), ''],
      ['Inside the app', 'l:cal', 'Calendar and reminders', 'warn', 'In the app only', 'The project calendar and its reminders show in the app and the bell. They cannot send email, Teams or phone notices because the platform has no scheduler.', 'Team members', 'Nothing to set up.', '']
    ];
    const SUB = { 'Platform': 'where the app runs and who can sign in', 'AI': 'drafting and reading', 'Claude': 'your own Claude, no key', 'Microsoft 365 and Teams': 'mail, Teams and the bell', 'Inside the app': 'shown to people in the studio' };
    const okN = L.filter(x => x[3] === 'ok').length, warnN = L.length - okN;
    const card = x => '<article class="ig-card ' + x[3] + '"><header><i class="ig-ic" aria-hidden="true">' + V.navIcon(x[1]) + '</i><h3>' + esc(x[2]) + '</h3><span class="ig-st ' + x[3] + '"><u></u>' + esc(x[4]) + '</span></header><dl><div><dt>What it is for</dt><dd>' + x[5] + '</dd></div><div><dt>Who needs it</dt><dd>' + x[6] + '</dd></div><div><dt>Set up</dt><dd>' + x[7] + '</dd></div></dl>' + (x[8] ? '<details><summary>More</summary><p class="small muted">' + x[8] + '</p></details>' : '') + '</article>';
    const groups = [...new Set(L.map(x => x[0]))].map(g => '<section class="ig-grp"><header><h2>' + esc(g) + '</h2><span>' + esc(SUB[g] || '') + '</span></header><div class="ig-grid">' + L.filter(x => x[0] === g).map(card).join('') + '</div></section>').join('');
    return '<div class="ig-sum"><div><b>' + okN + '</b><span>working or on</span></div><div class="warn"><b>' + warnN + '</b><span>need a look or are not verified</span></div><p>Every connection this app uses. Green means it works; amber means it needs setup or has not been checked. Only the platform owner can change the secrets named here.</p></div>' + groups;
  }
  function aiPanel() {
    const x = A.ai; if (!x) return '<div class="muted" style="padding:30px">Loading…</div>'; const cl = x.st.claude, u = x.us.usage, cfg = x.us.cfg; const n = v => (v || 0).toLocaleString();
    const row = (id, name, note) => { const q = u[id]; const has = q.inTok || q.outTok; return `<tr><td><b>${name}</b>${x.st.defaultProvider === id ? ' <span class="chip">Default</span>' : ''}<div class="xs muted">${note}</div></td><td>${n(q.calls)}</td><td>${n(q.errors)}${q.lastError ? `<div class="xs muted">Last: ${esc(q.lastError.code)}</div>` : ''}${q.retries ? `<div class="xs muted">${n(q.retries)} retried</div>` : ''}</td><td>${has ? n(q.inTok) + ' in / ' + n(q.outTok) + ' out' : '<span class="muted">Not reported</span>'}</td></tr>`; };
    return `<div class="adm-card"><div class="adm-h"><h3>AI provider</h3><span class="muted xs">Applies to every project</span></div>
      <p class="small muted" style="margin:0 0 12px">DeepSeek stays the default. Claude is optional and is used only when someone picks it for a task, when you make it the default, or when you send a type of work to it below.</p>
      <div class="fgrid"><label class="afld">Default provider<select id="ai_def"><option value="deepseek"${x.st.defaultProvider === 'deepseek' ? ' selected' : ''}>DeepSeek (default)</option><option value="claude"${x.st.defaultProvider === 'claude' ? ' selected' : ''}${cl ? '' : ' disabled'}>Claude${cl ? '' : ' (not configured)'}</option></select></label>
      <label class="afld">If the default AI is not available<select id="ai_fb"><option value="none"${cfg.fallback === 'none' ? ' selected' : ''}>Show an error (do not switch)</option><option value="deepseek"${cfg.fallback === 'deepseek' ? ' selected' : ''}>Use DeepSeek and say so on the draft</option><option value="claude"${cfg.fallback === 'claude' ? ' selected' : ''}>Use Claude when DeepSeek is down (needs the Claude key) and say so on the draft</option></select></label></div>
      <details class="ai-adv"${Object.values(x.st.routes || {}).some(v => v !== 'default') || (cfg.models && (cfg.models.deepseek || cfg.models.claude)) ? ' open' : ''}><summary>Models and routing by type of work</summary>
        <p class="xs muted" style="margin:6px 0 10px">Every AI feature asks the shared AI service for a type of work; it never calls a provider itself. Send one type of work to a provider without changing the default, for example task assistance to Claude. A type sent to Claude uses DeepSeek whenever no Claude key is set. Image reading always needs a provider that reads images.</p>
        <div class="fgrid">${Object.keys(x.st.groups || {}).map(g => { const v = (x.st.routes || {})[g] || 'default'; return `<label class="afld">${esc(x.st.groups[g])}<select data-ai-route="${esc(g)}"><option value="default"${v === 'default' ? ' selected' : ''}>Use the default provider</option>${g === 'vision' ? '' : `<option value="deepseek"${v === 'deepseek' ? ' selected' : ''}>DeepSeek</option>`}<option value="claude"${v === 'claude' ? ' selected' : ''}${cl ? '' : ' disabled'}>Claude${cl ? '' : ' (not configured)'}</option></select></label>`; }).join('')}
        ${(x.st.providers || []).map(pv => `<label class="afld">${esc(pv.name)} model<input type="text" data-ai-model="${esc(pv.id)}" value="${esc((cfg.models || {})[pv.id] || '')}" placeholder="${esc(pv.defaultModel || '')} (default)" spellcheck="false" autocomplete="off"></label>`).join('')}</div>
        <p class="xs muted" style="margin:6px 0 0">Leave a model blank to use the default shown. A new name is checked before it is saved: DeepSeek against the platform's model list, Claude against the models the key can use.</p></details>
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" data-act="aiCfgSave">Save</button><button class="btn" data-act="aiProbe">Test DeepSeek</button><button class="btn" data-act="aiProbeVision" title="Sends a small test picture to the platform image model">Check image reading</button><button class="btn" data-act="aiTest">Test Claude connection</button><span id="ai_res" class="small muted"></span></div></div>
    <div class="adm-card"><div class="adm-h"><h3>Claude API key</h3>${cl ? '<span class="chip">Configured</span>' : '<span class="chip">Not configured</span>'}</div>
      <p class="small" style="margin:0 0 8px">${cl ? (x.st.keySource === 'secret' ? 'A key is set as the <code>anthropic_api_key</code> secret. Only the app owner can replace or remove it, at secrets.facilio.work.' : 'A key saved in the app is in use. It is stored encrypted and never shown again, sent to the browser or written to logs.') : 'No key is set. DeepSeek handles every AI task.'}</p>
      ${x.st.canStoreKey ? `<div class="row" style="gap:8px;flex-wrap:wrap"><input type="password" id="ai_key" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" aria-label="Anthropic API key" style="flex:1;min-width:240px"><button class="btn primary" data-act="aiKeySave">${cl && x.st.keySource === 'app' ? 'Replace and check' : 'Save and check'}</button>${cl && x.st.keySource === 'app' ? '<button class="btn" data-act="aiKeyRemove">Remove key</button>' : ''}</div><p class="xs muted" style="margin:6px 0 0">The key is checked with Anthropic before it is saved. If it is rejected, nothing is stored.</p>` : `<p class="small notice" style="margin:0">To save a key here, the app owner first adds a plain secret named <code>ai_master_key</code> (any long random text) at secrets.facilio.work. It encrypts saved keys. Alternatively the owner can add the key itself as <code>anthropic_api_key</code>.</p>`}
      <p class="small muted" style="margin:10px 0 0"><b>Billing:</b> Anthropic API usage is billed to the account that owns the key, separately from any Claude subscription. A Claude Pro, Max or Team plan does not include API credits. Delivery Studio never uses Claude Code or subscription sign-ins, only an API key from console.anthropic.com. A Claude API key gives access to Claude only: it does not give Claude Code skills, local files or MCP tools.</p></div>
    <div class="adm-card"><div class="adm-h"><h3>Usage since tracking began</h3><span class="muted xs">Only what the providers report</span></div>
      <div class="tbl-wrap adm-tbl"><table class="tbl"><thead><tr><th>Provider</th><th>Requests</th><th>Errors</th><th>Tokens</th></tr></thead><tbody>${row('deepseek', 'DeepSeek', 'Facilio-hosted model')}${row('claude', 'Claude', 'Anthropic API')}</tbody></table></div>
      <p class="xs muted" style="margin:8px 0 0">Costs are not estimated because no price list is configured. Prompts and responses are never stored here.</p></div>${routingCard(x.rt)}`;
  }

  // ---------- project detail ----------
  async function detail(id) {
    const p = A.data.projects.find(x => x.id === id); if (!p) return;
    let dd = { members: [], files: [], kinds: [], log: [] }; try { dd = await API.get(`/api/admin/projects/${id}/detail`, { noAuthRedirect: true }); } catch (e) { toast(e.message, 4000, true); }
    const stat = (l, v, s) => `<div class="mini"><b>${v}</b><span>${esc(l)}</span>${s ? `<em>${s}</em>` : ''}</div>`;
    const html = `<div class="dt-top"><div class="pav lg" style="background:${tone(p.name)}">${esc(initials(p.customer || p.name))}</div><div style="flex:1"><h2 style="margin:0">${esc(p.name)}</h2><div class="muted small">${esc(p.customer)}${p.startDate ? ' · starts ' + esc(fmt(p.startDate)) : ''}${p.endDate ? ' · ends ' + esc(fmt(p.endDate)) : ''}</div></div>${hchip(p.health)}</div>
      ${p.reasons.length ? `<div class="notice" style="margin:12px 0"><b>Watch:</b> ${esc(p.reasons.join(' · '))}</div>` : ''}
      <div class="dt-stage"><div class="xs muted" style="margin-bottom:6px">Delivery stage</div><div class="stepper">${STAGES.slice(1).map((s, i) => `<div class="st${i + 1 <= p.stage ? ' on' : ''}${i + 1 === p.stage ? ' cur' : ''}"><i>${i + 1}</i><span>${esc(s)}</span></div>`).join('')}</div></div>
      <div class="mini-grid">${stat('Modules in scope', p.modulesInScope)}${stat('Sessions', p.sessions.done + '/' + p.sessions.total, p.sessions.upcoming + ' upcoming')}${stat('Requirements', p.requirements)}${stat('State flows', p.flows)}${stat('Open actions', p.openActions, p.overdue ? '<b class="bad">' + p.overdue + ' overdue</b>' : '')}${stat('RAID open', p.raidOpen)}${stat('Customer questions', p.openFeedback)}${stat('BRD', esc(p.brdStatus), p.brdExports ? p.brdExports + ' export' + (p.brdExports > 1 ? 's' : '') : '')}</div>
      <div class="dt-cols"><div><h4>Team (${dd.members.length})</h4><ul class="plain">${dd.members.map(m => `<li><b>${esc(m.name)}</b> <span class="xs muted">${esc(m.email)}</span> ${chip(m.role === 'owner' ? 'r-super' : m.role === 'viewer' ? 'h-stale' : 'h-healthy', m.role)}</li>`).join('') || '<li class="muted">No members</li>'}</ul>
        <h4>Files (${p.files} · ${size(p.bytes)})</h4><ul class="plain">${dd.files.map(f => `<li>${esc(String(f.category).replace(/_/g, ' '))} <span class="xs muted">${f.n} · ${size(f.bytes)}</span></li>`).join('') || '<li class="muted">No files</li>'}</ul></div>
        <div><h4>Recent activity</h4><ul class="plain">${dd.log.map(l => `<li><b>${esc(String(l.action).replace(/[_-]/g, ' '))}</b> <span class="xs muted">${esc(l.who)} · ${ago(l.at)}</span>${l.detail ? `<div class="xs muted">${esc(l.detail)}</div>` : ''}</li>`).join('') || '<li class="muted">No recorded activity</li>'}</ul>
        <div class="xs muted" style="margin-top:10px">Created ${fmt(p.createdAt)} · last activity ${ago(p.lastActivity)} · customer access ${p.customerAccessEnabled ? 'on' : 'off'}</div></div></div>`;
    const foot = `<button class="btn" data-act="closeDrawer">Close</button>${can('admin') ? `<button class="btn" data-act="admMembers" data-id="${esc(id)}">Manage members</button><button class="btn" data-act="admArchive" data-id="${esc(id)}" data-to="${p.archived ? '0' : '1'}">${p.archived ? 'Restore' : 'Archive'}</button><button class="btn" data-act="admClone" data-id="${esc(id)}" title="Make a copy of this project">Clone</button>${p.archived && can('super') ? `<button class="btn danger" data-act="admDelete" data-id="${esc(id)}">Delete for good</button>` : ''}` : ''}${p.archived ? '' : `<button class="btn primary" data-act="admOpen" data-id="${esc(id)}">${can('admin') ? 'Open project' : 'Open (read-only)'}</button>`}`;
    drawer('Project insights', html, foot, { wide: true });
  }

  // ---------- sign-in gate ----------
  async function enter() {
    V.loading(true, 'Switching to Admin…');
    try { await load(); A.users = A.audit = A.access = null; if (V.cmd) V.cmd.reset(); show(); lazy(); }
    catch (e) {
      if (e.status === 401) return signIn();
      if (e.status === 403) { toast('Your account does not have admin access. Ask the platform owner to add your email.', 6000, true); return; }
      toast(e.message, 5000, true);
    } finally { V.loading(false); }
  }
  ACT.openAdmin = () => enter();
  function signIn(setup) {
    drawer('Admin sign-in', `<p class="small muted">Sign in with your admin email and password.</p>
      <label class="afld">Email<input id="ad_email" type="email" autocomplete="username" value="${esc(val('ad_email') || '')}"></label>
      <label class="afld">Password<input id="ad_pw" type="password" autocomplete="current-password"></label>
      ${setup ? `<div class="notice" style="margin:10px 0">One-time owner setup: enter the owner setup code and choose a password (10+ characters). After this you only need your email and password.</div><label class="afld">Owner setup code<input id="ad_code" type="password" autocomplete="off"></label><label class="afld">Your name<input id="ad_name" type="text" value="Dinesh R"></label>`
        : `<a href="#" data-act="adminSetup" class="small">First time or forgot password?</a>`}`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="adminSignIn" data-setup="${setup ? '1' : '0'}">${setup ? 'Set password & sign in' : 'Sign in'}</button>`);
    setTimeout(() => { const i = document.getElementById(val('ad_email') ? 'ad_pw' : 'ad_email'); if (i) i.focus(); }, 60);
  }
  ACT.adminSetup = () => signIn(true);
  ACT.adminSignIn = async a => {
    const setup = a.getAttribute('data-setup') === '1';
    try {
      if (setup) await API.post('/api/admin/setup', { email: val('ad_email'), password: val('ad_pw'), setupCode: val('ad_code'), name: val('ad_name') }, { noAuthRedirect: true });
      else await API.post('/api/auth/login', { email: val('ad_email'), password: val('ad_pw') }, { noAuthRedirect: true });
      const me = await API.get('/api/auth/me', { noAuthRedirect: true }); S.user = me.user; closeDrawer(); await enter();
    } catch (e) { toast(e.message, 5000, true); }
  };

  // ---------- actions ----------
  ACT.aiCfgSave = async () => { try { const routes = {}, models = {}; document.querySelectorAll('[data-ai-route]').forEach(el => { routes[el.getAttribute('data-ai-route')] = el.value; }); document.querySelectorAll('[data-ai-model]').forEach(el => { models[el.getAttribute('data-ai-model')] = el.value.trim(); });
    await API.post('/api/admin/ai/config', { defaultProvider: document.getElementById('ai_def').value, fallback: document.getElementById('ai_fb').value, routes, models }); A.ai = null; toast('AI settings saved'); await lazy(); } catch (e) { toast(e.message, 5000, true); } };
  ACT.aiKeySave = a => V.busy(a, async () => { const el = document.getElementById('ai_key'); const k = el ? el.value.trim() : ''; if (!k) { toast('Paste the API key first', 4000, true); return; } try { const r = await API.post('/api/admin/ai/key', { key: k }); if (el) el.value = ''; toast(r.message, 6000); } catch (e) { toast(e.message, 8000, true); } A.ai = null; show(); await lazy(); });
  ACT.aiKeyRemove = async a => { if (!(await V.confirmDialog('Remove Claude key', 'Remove the saved key? AI tasks keep working with DeepSeek.', 'Remove'))) return; try { const r = await API.del('/api/admin/ai/key'); toast(r.message, 6000); } catch (e) { toast(e.message, 6000, true); } A.ai = null; show(); await lazy(); };
  ACT.aiProbeVision = async a => V.busy(a, async () => { const el = document.getElementById('ai_res'); if (el) el.textContent = 'Checking image reading…'; try { const r = await API.post('/api/admin/ai/probe-vision', {}); if (el) { el.textContent = r.message; el.style.color = r.ok ? '#027A48' : '#B54708'; } toast(r.message, 7000, !r.ok); } catch (e) { toast(e.message, 5000, true); } });
  ACT.aiProbe = async a => V.busy(a, async () => { const el = document.getElementById('ai_res'); if (el) el.textContent = 'Checking DeepSeek…'; try { const r = await API.post('/api/admin/ai/probe', {}); if (el) { el.textContent = r.message; el.style.color = r.ok ? 'var(--th-green, #1a7f4b)' : 'var(--th-pink, #c0392b)'; } } catch (e) { if (el) el.textContent = e.message || 'The check failed'; } });
  ACT.aiTest = async a => V.busy(a, async () => { const el = document.getElementById('ai_res'); try { const r = await API.post('/api/admin/ai/test', {}); if (el) el.textContent = r.message; toast(r.message, 5000, !r.ok); A.ai = null; await lazy(); const el2 = document.getElementById('ai_res'); if (el2) el2.textContent = r.message; } catch (e) { toast(e.message, 5000, true); } });
  ACT.admSec = async a => { A.sec = a.getAttribute('data-s'); show(); await lazy(); };
  async function lazy() {
    try {
      if (A.sec === 'dashboard' && A.dash === 'command' && V.cmd && !V.cmd.ready()) { await V.cmd.load(); show(); }
      if (A.sec === 'dashboard' && (A.dash === 'usage' || A.dash === 'quality') && !A.ins) { A.ins = await API.get('/api/admin/insights', { noAuthRedirect: true }); show(); }
      if (A.sec === 'discover' && V.admDiscover && !V.admDiscover.ready()) { await V.admDiscover.load(); show(); }
      if (A.sec === 'assistant' && V.adminAssist && !V.adminAssist.ready()) await V.adminAssist.load();
      if (A.sec === 'users' && !A.users) { A.users = (await API.get('/api/admin/users', { noAuthRedirect: true })).users; show(); }
      if (A.sec === 'activity' && !A.audit) { A.audit = (await API.get('/api/admin/audit', { noAuthRedirect: true })).entries; show(); }
      if (A.sec === 'ai' && !A.ai) { const [st, us, rt] = await Promise.all([API.get('/api/ai/status', { noAuthRedirect: true }), API.get('/api/admin/ai/usage', { noAuthRedirect: true }), API.get('/api/admin/ai-routing', { noAuthRedirect: true }).catch(() => null)]); A.ai = { st, us, rt }; show(); }
      if (A.sec === 'integrations' && !A.integ) { try { A.integ = await API.get('/api/mail/status', { noAuthRedirect: true }); } catch (e) { A.integ = { error: e.message }; } show(); }
      if (A.sec === 'access' && !A.access) { A.access = await API.get('/api/admin/access', { noAuthRedirect: true }); show(); }
    } catch (e) { toast(e.message, 4000, true); }
  }
  ACT.admRefresh = async () => { try { pf = 0; await load(); A.users = A.audit = A.access = A.ins = A.ai = A.integ = null; if (V.cmd) V.cmd.reset(); show(); await lazy(); toast('Refreshed'); } catch (e) { toast(e.message, 4000, true); } };
  ACT.admGo = async a => { const g = a.getAttribute('data-go'); if (g === 'attention') { A.sec = 'projects'; A.filter = 'attention'; A.stage = 'all'; } else if (g === 'projects') { A.sec = 'projects'; A.filter = 'all'; A.stage = 'all'; } else A.sec = g; show(); await lazy(); };
  ACT.admStage = a => { A.sec = 'projects'; A.stage = a.getAttribute('data-s'); A.filter = 'all'; show(); };
  ACT.admFilter = a => { A.sec = 'projects'; A.filter = a.getAttribute('data-f'); A.stage = 'all'; show(); };
  ACT.admStageSel = el => { A.stage = el.value; show(); };
  ACT.admExport = async () => { if (!A.data) await load(); V.download('facilio-projects-' + new Date().toISOString().slice(0, 10) + '.csv', '﻿' + csv(), 'text/csv'); };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'admQ') { A.q = e.target.value; const pos = e.target.selectionStart; show(); const i = document.getElementById('admQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { } } } });
  ACT.admDetail = a => detail(a.getAttribute('data-id'));
  ACT.admOpen = a => { closeDrawer(); V.openProject(a.getAttribute('data-id')); };
  // clone and delete for good (the platform owner deletes, and only an archived project)
  const projOf = id => A.data.projects.find(x => x.id === id) || {};
  ACT.admClone = a => { const id = a.getAttribute('data-id'); const p = projOf(id); drawer('Clone project', `<p class="small" style="margin-top:0">Makes a new project from <b>${esc(p.name)}</b>: its setup, documents and records (requirements, use cases, plan, BRD, whiteboards and so on). It does <b>not</b> copy tickets, uploaded files, feedback or the activity log. You become the only member; customer access is off.</p><label class="afld">Name of the copy<input id="cl_name" type="text" maxlength="160" value="Copy of ${esc(p.name)}"></label>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="admCloneGo" data-id="${esc(id)}">Clone project</button>`); };
  ACT.admCloneGo = async a => { try { const r = await API.post('/api/admin/projects/' + a.getAttribute('data-id') + '/clone', { name: val('cl_name').trim() }); closeDrawer(); await load(); show(); toast('Project cloned (' + (r.copied || 0) + ' records copied). It is in the project list, owned by you.', 7000); } catch (e) { toast(e.message, 5000, true); } };
  ACT.admDelete = a => { const id = a.getAttribute('data-id'); const p = projOf(id); drawer('Delete project for good', `<div class="notice warn" style="margin:0 0 12px"><span>This cannot be undone. All of <b>${esc(p.name)}</b> is removed: documents, records, tickets, files list and activity. Restore from archive stays possible only until you do this.</span></div><label class="afld">Type the project name to confirm<input id="dl_name" type="text" autocomplete="off" placeholder="${esc(p.name)}"></label>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn danger" data-act="admDeleteGo" data-id="${esc(id)}">Delete for good</button>`); };
  ACT.admDeleteGo = async a => { try { await API.post('/api/admin/projects/' + a.getAttribute('data-id') + '/delete', { confirm: val('dl_name') }); closeDrawer(); await load(); show(); toast('Project deleted'); } catch (e) { toast(e.message, 5000, true); } };
  ACT.admArchive = async a => {
    const id = a.getAttribute('data-id'), to = a.getAttribute('data-to') === '1'; const p = A.data.projects.find(x => x.id === id);
    if (to && !(await confirmDialog('Archive project', `Archive "${p.name}"? Nobody can open it until it is restored. Nothing is deleted.`, 'Archive', true))) return;
    try { await API.patch('/api/admin/projects/' + id, { archived: to }); closeDrawer(); await load(); show(); toast(to ? 'Project archived' : 'Project restored'); } catch (e) { toast(e.message, 4000, true); }
  };
  ACT.admUserToggle = async a => {
    const id = a.getAttribute('data-id'), to = a.getAttribute('data-to') === '1'; const u = A.users.find(x => x.id === id);
    if (to && !(await confirmDialog('Disable account', `Disable ${u.name}? They are signed out and cannot sign in until enabled again.`, 'Disable', true))) return;
    try { await API.patch('/api/admin/users/' + id, { disabled: to }); A.users = (await API.get('/api/admin/users')).users; show(); toast(to ? 'Account disabled' : 'Account enabled'); } catch (e) { toast(e.message, 4000, true); }
  };
  ACT.admUserRemove = async a => {
    const id = a.getAttribute('data-id'); const u = A.users.find(x => x.id === id); if (!u) return;
    if (!(await confirmDialog('Remove user', `Remove ${u.name}${u.guest ? '' : ' (' + u.email + ')'} completely? They lose all access and are signed out right away. Projects they created stay. To get back in, they have to sign up again.`, 'Remove', true))) return;
    try { await API.del('/api/admin/users/' + id); A.users = (await API.get('/api/admin/users')).users; show(); toast('User removed'); } catch (e) { toast(e.message, 4000, true); }
  };
  async function membersDrawer(id) {
    const p = A.data.projects.find(x => x.id === id); let list = [];
    try { list = (await API.get(`/api/admin/projects/${id}/members`, { noAuthRedirect: true })).members; } catch (e) { return toast(e.message, 4000, true); }
    drawer('Members — ' + p.name, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th>Role</th><th></th></tr></thead><tbody>${list.map(m => `<tr><td><b>${esc(m.name)}</b><div class="xs muted">${esc(m.email)}</div></td><td>${chip(m.role === 'owner' ? 'r-super' : m.role === 'viewer' ? 'h-stale' : 'h-healthy', m.role)}</td><td><button class="btn sm" data-act="adminRemoveMember" data-id="${esc(id)}" data-uid="${esc(m.id)}">Remove</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">No members. Add an owner below.</td></tr>'}</tbody></table></div>
      <h3 style="margin:18px 0 6px">Add or change a member</h3><label class="afld">Email of an existing account<input id="am_email" type="email"></label>
      <label class="afld">Role<select id="am_role"><option value="owner">Owner (full control)</option><option value="editor" selected>Editor</option><option value="viewer">Viewer (read-only)</option></select></label>`,
      `<button class="btn" data-act="closeDrawer">Close</button><button class="btn primary" data-act="adminAddMember" data-id="${esc(id)}">Save member</button>`);
  }
  ACT.admMembers = a => membersDrawer(a.getAttribute('data-id')); ACT.adminMembers = ACT.admMembers;
  ACT.adminAddMember = async a => { const id = a.getAttribute('data-id'); try { await API.post(`/api/admin/projects/${id}/members`, { email: val('am_email'), role: val('am_role') }); await load(); toast('Member saved'); await membersDrawer(id); show(); } catch (e) { toast(e.message, 5000, true); } };
  ACT.adminRemoveMember = async a => { const id = a.getAttribute('data-id'); try { await API.del(`/api/admin/projects/${id}/members/${a.getAttribute('data-uid')}`); await load(); toast('Member removed'); await membersDrawer(id); show(); } catch (e) { toast(e.message, 5000, true); } };
  // access
  function creds(title, email, temp, note) {
    drawer(title, `<p class="small">${esc(note)}</p><div class="cred"><div><span class="xs muted">Email</span><b>${esc(email)}</b></div><div><span class="xs muted">Temporary password</span><b class="mono" id="cr_pw">${esc(temp)}</b></div></div><p class="xs muted">This password is shown only once. Share it privately. They sign in from the Admin button and should change it right away from "Change my password".</p>`,
      `<button class="btn" data-act="closeDrawer">Done</button><button class="btn primary" data-act="admCopy" data-v="${esc(temp)}">Copy password</button>`);
  }
  ACT.admCopy = async a => { try { await navigator.clipboard.writeText(a.getAttribute('data-v')); toast('Copied'); } catch (e) { toast('Select and copy the password manually'); } };
  ACT.admGrant = async () => {
    const email = val('gr_email').trim(); if (!email) { toast('Enter an email address', 3000, true); return; }
    try { const r = await API.post('/api/admin/access', { email, name: val('gr_name'), role: val('gr_role') }); A.access = await API.get('/api/admin/access'); show();
      if (r.tempPassword) creds('Access granted', email.toLowerCase(), r.tempPassword, 'A new account was created for this person.'); else toast('Access granted. They sign in with their Facilio account as usual.'); } catch (e) { toast(e.message, 5000, true); }
  };
  // hand the platform owner role to another Facilio email: the new owner gets everything and the current owner loses all admin access at once
  ACT.admOwnerHand = () => drawer('Hand over ownership', `<div class="notice warn" style="margin:0 0 12px"><span><b>You will lose all admin access</b> as soon as this is saved: the admin console, other people's projects and access management. Projects where you are a member stay as they are.</span></div>
      <label class="afld">New owner's Facilio email<input id="ow_email" type="email" placeholder="name@facilio.com" autocomplete="off"></label><label class="afld">Type the email again to confirm<input id="ow_confirm" type="email" autocomplete="off"></label>`,
    `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn danger" data-act="admOwnerHandGo">Hand over and remove my access</button>`);
  ACT.admOwnerHandGo = async () => { const email = val('ow_email').trim().toLowerCase(); if (!email) { toast('Enter the new owner\'s email'); return; } if (val('ow_confirm').trim().toLowerCase() !== email) { toast('The two emails do not match'); return; }
    try { await API.post('/api/admin/owner/transfer', { email, confirm: val('ow_confirm') }); closeDrawer(); toast(email + ' is now the platform owner. Your admin access has been removed.', 7000); setTimeout(() => { location.hash = '#/projects'; location.reload(); }, 1200); } catch (e) { toast(e.message, 6000, true); } };
  ACT.admRole = async el => { try { await API.post('/api/admin/access', { email: el.getAttribute('data-email'), role: el.value }); A.access = await API.get('/api/admin/access'); show(); toast('Role updated'); } catch (e) { toast(e.message, 5000, true); } };
  ACT.admReset = async a => {
    const email = a.getAttribute('data-email'); if (!(await confirmDialog('Reset password', `Create a new temporary password for ${email}? Their current password stops working and they are signed out.`, 'Reset'))) return;
    try { const r = await API.post('/api/admin/access/reset', { email }); creds('New temporary password', email, r.tempPassword, 'The old password no longer works.'); } catch (e) { toast(e.message, 5000, true); }
  };
  ACT.admRevoke = async a => {
    const email = a.getAttribute('data-email'); if (!(await confirmDialog('Remove admin access', `Remove ${email} from the admin console? Their account and project access stay as they are.`, 'Remove access', true))) return;
    try { await API.post('/api/admin/access/revoke', { email }); A.access = await API.get('/api/admin/access'); show(); toast('Access removed'); } catch (e) { toast(e.message, 5000, true); }
  };
  ACT.admPw = () => drawer('Change my password', `<label class="afld">Current password<input id="pw_cur" type="password" autocomplete="current-password"></label><label class="afld">New password (at least 10 characters)<input id="pw_new" type="password" autocomplete="new-password"></label>`,
    `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="admPwSave">Save password</button>`);
  ACT.admPwSave = async () => { try { await API.post('/api/auth/password', { current: val('pw_cur'), next: val('pw_new') }); closeDrawer(); toast('Password changed'); } catch (e) { toast(e.message, 5000, true); } };
})(typeof window !== 'undefined' ? window : globalThis);
