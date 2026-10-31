/* Bento dashboards: one tile grid for each point of view, every number computed from saved project records (nothing invented).
   - Team: V.projdash on a team login (plan, tasks, customer waits, requirements, sign-offs, next 14 days, what needs attention; agent projects add agent progress)
   - Customer: V.projdash on a customer login (their own phase and progress, what is waiting on them, sessions, sign-off journey; never internal tasks or fees)
   - Admin: V.adminBento(), the portfolio at a glance, put above the existing Admin dashboard from the portfolio summary the console already loads. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const fd = d => (d ? V.fmtDate(d) : '—');
  const go = (view, inner, cls, extra) => `<button type="button" class="bn-t ${cls || ''}" data-act="nav" data-view="${view}"${extra || ''}>${inner}</button>`;
  const box = (inner, cls) => `<div class="bn-t ${cls || ''}">${inner}</div>`;
  const kpi = (view, label, value, sub, tone, cls) => go(view, `<span class="bn-l">${esc(label)}</span><b class="bn-v${tone ? ' ' + tone : ''}">${value}</b><span class="bn-s">${sub || ''}</span>`, 'bn-k ' + (cls || ''));
  const ring = (pct, size) => { const r = 42, c = 2 * Math.PI * r, o = c * (1 - Math.max(0, Math.min(100, pct)) / 100); return `<svg class="bn-ring" viewBox="0 0 100 100" width="${size || 96}" height="${size || 96}" role="img" aria-label="${pct}% complete"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="#7CF3C6" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${o.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">${pct}%</text></svg>`; };
  const list = (title, rows, empty, more) => box(`<h3 class="bn-h">${esc(title)}</h3>${rows.length ? `<ul class="bn-ul">${rows.join('')}</ul>` : `<p class="bn-none">${esc(empty)}</p>`}${more || ''}`, 'bn-list');
  const row = (view, main, side, tone) => `<li><button type="button" data-act="nav" data-view="${view}"><span>${esc(main)}</span>${side ? `<em class="${tone || ''}">${esc(side)}</em>` : ''}</button></li>`;
  const stack = (parts, total) => `<div class="bn-stack" role="img" aria-label="${parts.map(p => p[0] + ' ' + p[1]).join(', ')}">${parts.filter(p => p[1]).map(p => `<i style="flex:${p[1]};background:${p[2]}" title="${esc(p[0])}: ${p[1]}"></i>`).join('') || '<i style="flex:1;background:#e6e2f2"></i>'}</div><div class="bn-leg">${parts.map(p => `<span><i style="background:${p[2]}"></i>${esc(p[0])} <b>${p[1]}</b></span>`).join('')}</div>`;
  const KINDS = ['action', 'signoff', 'cr', 'onb', 'raid', 'task'];
  function ctx() {
    const k = cust(); const ready = I().ready(['action']); const acts = ready ? I().list('action') : []; const today = V.today();
    const open = acts.filter(a => a.status !== 'Done'); const mineSide = k ? 'customer' : null;
    const custOpen = open.filter(a => a.side === 'customer'), facOpen = open.filter(a => (a.side || 'facilio') === 'facilio');
    const late = a => a.due && a.due < today; const so = I().ready(['signoff']) ? I().list('signoff') : []; const sg = id => so.find(x => x.id === id) || { status: 'notdue' };
    const crs = I().ready(['cr']) ? I().list('cr') : []; const raid = I().ready(['raid']) ? I().list('raid') : []; const tasks = !k && I().ready(['task']) ? I().list('task') : [];
    const st = V.planStats ? V.planStats() : { n: 0, actual: 0, planned: 0 }; const ph = V.phaseNow ? V.phaseNow() : { cur: -1, info: [] };
    return { k, ready, acts, open, custOpen, facOpen, late, so, sg, crs, raid, tasks, st, ph, today, mineSide };
  }
  const SO = { notdue: 'Not due', requested: 'Waiting for signature', signed: 'Signed', concern: 'Concern raised' };
  const soTone = s => (s === 'signed' ? 'ok' : s === 'requested' ? 'warn' : s === 'concern' ? 'bad' : '');
  const goLive = (st) => { if (!st.goLive) return null; const n = V.daysBetween(V.today(), st.goLive); return { date: st.goLive, n }; };

  V.projdash = { html() {
    I().load(KINDS); const c = ctx(); const k = c.k; const p = S.project || {}; const cur = c.ph.cur >= 0 ? c.ph.info[c.ph.cur] : null; const gl = goLive(c.st); const gv = c.st.actual - c.st.planned;
    const head = `<div class="page-header"><div class="t"><h1>${k ? 'Your project dashboard' : 'Project dashboard'}</h1><p>${k ? `Where ${esc(p.name || 'your project')} stands today, what is waiting on you, and what is coming next.` : `The state of ${esc(p.name || 'the project')} at a glance: progress, what is late, what is waiting on the customer and what is next.`}</p></div></div>`;
    const hero = box(`<span class="bn-eye">${k ? 'Your project' : 'Delivery progress'}</span><div class="bn-hero"><div>${ring(c.st.actual, 104)}</div><div class="bn-hd"><b>${cur ? `Step ${cur.i + 1} of 12 · ${esc(cur.title)}` : 'Plan not started'}</b><span>${c.st.n ? `${c.st.actual}% done against ${c.st.planned}% planned` + (gv ? ` · ${gv > 0 ? gv + ' points ahead' : -gv + ' points behind'}` : ' · on plan') : 'No dated plan yet'}</span><span>${gl ? `Go-live ${esc(fd(gl.date))}${gl.n >= 0 ? ` · ${gl.n} day${gl.n === 1 ? '' : 's'} to go` : ' · date has passed'}` : ''}</span></div></div>`, 'bn-dark bn-w5 bn-r2');
    let tiles = [hero];
    if (k) {
      const wait = c.custOpen.length, lateN = c.custOpen.filter(c.late).length, sign = c.so.filter(x => x.status === 'requested').length + c.crs.filter(x => x.status === 'Proposed').length;
      const ev = V.events ? V.events({ days: 14 }) : []; const onb = I().ready(['onb']) ? I().list('onb').filter(o => o.status === 'fix') : [];
      tiles.push(kpi('governance', 'Waiting on you', wait, wait ? (lateN ? `${lateN} overdue` : 'open actions') : 'nothing open', lateN ? 'bad' : '', 'bn-w2'));
      tiles.push(kpi('governance', 'To sign or approve', sign, sign ? 'sign-offs and change requests' : 'nothing waiting', sign ? 'warn' : '', 'bn-w2'));
      tiles.push(kpi('timeline', 'In the next 14 days', ev.length, ev.length ? 'sessions and milestones' : 'nothing scheduled', '', 'bn-w3'));
      tiles.push(list('What we need from you', c.custOpen.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 5).map(a => row('governance', a.text || 'Action', a.due ? fd(a.due) : '', c.late(a) ? 'bad' : '')).concat(onb.slice(0, 2).map(o => row('onboarding', 'Data sheet needs fixes: ' + o.sheet, '', 'bad'))), 'Nothing is waiting on you right now.'));
      tiles.push(list('Coming up', ev.slice(0, 5).map(e => row(e.view === 'planner' ? 'schedule' : e.view, e.title, fd(e.date))), 'No sessions or milestones in the next 14 days.'));
      tiles.push(box(`<h3 class="bn-h">Sign-off journey</h3><div class="bn-so">${[['brd', 'Requirements (BRD)'], ['uat', 'Testing (UAT)'], ['golive', 'Go-live']].map(([id, l]) => `<div><b>${esc(l)}</b><em class="${soTone(c.sg(id).status)}">${esc(SO[c.sg(id).status] || 'Not due')}</em></div>`).join('')}</div>`, 'bn-w4'));
      tiles.push(kpi('governance', 'Facilio is working on', c.facOpen.length, 'open items on our side', '', 'bn-w2'));
    } else {
      const reqs = (S.ws && S.ws.requirements) || []; const conf = reqs.filter(r => r.status === 'Confirmed').length; const tk = c.tasks; const openT = tk.filter(t => !['Done', 'Cancelled'].includes(t.status)); const lateT = openT.filter(t => (t.due && t.due < c.today) || (t.eta && t.eta < c.today)); const blkT = openT.filter(t => t.status === 'Blocked').length + c.raid.filter(r => r.status !== 'Closed' && /high/i.test(r.impact || '')).length;
      const ev = V.events ? V.events({ days: 14 }) : []; const att = (V.attentionItems ? V.attentionItems() : []).slice(0, 5); const lateAct = c.open.filter(c.late).length;
      tiles.push(kpi('tasks', 'Open tasks', openT.length, `${tk.filter(t => String(t.owner).toLowerCase() === String((S.user && S.user.email) || '').toLowerCase() && !['Done', 'Cancelled'].includes(t.status)).length} assigned to me`, '', 'bn-w2'));
      tiles.push(kpi('tasks', 'Overdue', lateT.length + lateAct, 'tasks and actions', lateT.length + lateAct ? 'bad' : '', 'bn-w2'));
      tiles.push(kpi('governance', 'Waiting on customer', c.custOpen.length + c.so.filter(x => x.status === 'requested').length, 'actions and sign-offs', c.custOpen.some(c.late) ? 'warn' : '', 'bn-w3'));
      tiles.push(kpi('governance', 'Blockers', blkT, 'blocked tasks and high risks', blkT ? 'bad' : '', 'bn-w3'));
      tiles.push(box(`<h3 class="bn-h">Requirements</h3><div class="bn-big">${conf}<small> of ${reqs.length} confirmed</small></div><div class="bn-bar"><i style="width:${reqs.length ? Math.round(conf / reqs.length * 100) : 0}%"></i></div><span class="bn-s">${reqs.length - conf} still to confirm with the customer</span>`, 'bn-w4'));
      tiles.push(box(`<h3 class="bn-h">Tasks by status</h3>${stack([['To Do', tk.filter(t => t.status === 'To Do').length, '#c9c4de'], ['In progress', tk.filter(t => t.status === 'In Progress').length, '#6a3df0'], ['Waiting', tk.filter(t => /Awaiting|Review/.test(t.status || '')).length, '#e8a317'], ['Blocked', tk.filter(t => t.status === 'Blocked').length, '#e0457b'], ['Done', tk.filter(t => t.status === 'Done').length, '#2aa889']])}`, 'bn-w4'));
      tiles.push(list('Needs attention', c.open.filter(c.late).slice(0, 3).map(a => row('governance', 'Overdue: ' + (a.text || 'action'), fd(a.due), 'bad')).concat(att.map(a => row(a.view || 'governance', a.t))).concat(lateT.slice(0, 2).map(t => row('tasks', t.title, 'overdue', 'bad'))).slice(0, 6), 'Nothing needs attention right now.'));
      tiles.push(list('Next 14 days', ev.slice(0, 6).map(e => row(e.view === 'overview' ? 'governance' : e.view, e.title, fd(e.date))), 'Nothing scheduled in the next 14 days.'));
      tiles.push(box(`<h3 class="bn-h">Sign-offs</h3><div class="bn-so">${[['brd', 'BRD'], ['uat', 'UAT'], ['golive', 'Go-live']].map(([id, l]) => `<div><b>${esc(l)}</b><em class="${soTone(c.sg(id).status)}">${esc(SO[c.sg(id).status] || 'Not due')}</em></div>`).join('')}</div><span class="bn-s">${c.crs.filter(x => ['Requested', 'Proposed'].includes(x.status)).length} change request(s) waiting</span>`, 'bn-w4'));
      if (V.isAgentProject && V.isAgentProject()) { const d = F.doc('agentscope') || {}; const sel = d.sel || {}; const on = Object.values(sel).filter(x => x && x.on); const tests = on.flatMap(x => x.tests || []); const pass = tests.filter(t => t.result === 'Pass').length;
        tiles.push(go('agents', `<span class="bn-l">AI agents</span><b class="bn-v">${on.length}</b><span class="bn-s">in scope · ${tests.length ? pass + ' of ' + tests.length + ' tests passed' : 'no tests yet'}</span>`, 'bn-k bn-w4')); }
    }
    return head + `<div class="page-body"><div class="bn">${tiles.join('')}</div></div>`; } };

  // ---------- Admin: the portfolio at a glance ----------
  let loading = false;
  V.adminBento = function () {
    const C = V.cmd && V.cmd.get && V.cmd.get(); if (!C) { if (V.cmd && !loading && !V.cmd.ready()) { loading = true; V.cmd.load().finally(() => { loading = false; V.setMode('admin'); }); } return `<div class="bn"><div class="bn-t bn-w12">${V.ui ? V.ui.loading(2) : 'Loading…'}</div></div>`; }
    const m = C.metrics || {}; const ps = (C.projects || []).filter(p => p.manual === 'active'); const H = V.ADM_HEALTH || {}; const hl = h => (H[h] || [h])[0];
    const sum = (f) => ps.reduce((n, p) => n + (Number(f(p)) || 0), 0); const open = sum(p => p.metrics.openTasks), late = sum(p => p.metrics.overdueTasks), wait = sum(p => p.metrics.custWaiting);
    const rank = { blocked: 0, overdue: 1, at_risk: 2, insufficient: 3, on_track: 4 }; const worst = ps.filter(p => rank[p.health] <= 2).sort((a, b) => rank[a.health] - rank[b.health]).slice(0, 5);
    const nxt = ps.filter(p => p.metrics.nextMilestone && p.metrics.nextMilestone.date).sort((a, b) => a.metrics.nextMilestone.date.localeCompare(b.metrics.nextMilestone.date)).slice(0, 5);
    const pr = p => `<li><button type="button" data-act="cmdDrill" data-p="${esc(p.id)}" data-v="overview" data-x="{}"><span>${esc(p.name)}<small>${esc(p.customer || '')}</small></span>`;
    const hb = [['Blocked', ps.filter(p => p.health === 'blocked').length, '#e0457b'], ['Overdue', ps.filter(p => p.health === 'overdue').length, '#f08a24'], ['At risk', ps.filter(p => p.health === 'at_risk').length, '#e8a317'], ['On track', ps.filter(p => p.health === 'on_track').length, '#2aa889'], ['No data', ps.filter(p => p.health === 'insufficient').length, '#c9c4de']];
    const pct = ps.length ? Math.round(100 * ps.filter(p => p.health === 'on_track').length / ps.length) : 0;
    const tK = (label, v, sub, tone, cls) => `<div class="bn-t bn-k ${cls || ''}"><span class="bn-l">${esc(label)}</span><b class="bn-v${tone ? ' ' + tone : ''}">${v}</b><span class="bn-s">${sub}</span></div>`;
    return `<div class="bn">
      <div class="bn-t bn-dark bn-w5 bn-r2"><span class="bn-eye">Portfolio health</span><div class="bn-hero"><div>${ring(pct, 104)}</div><div class="bn-hd"><b>${ps.length} active project${ps.length === 1 ? '' : 's'}</b><span>${pct}% on track</span><span>${m.completed || 0} completed${m.onHold ? ' · ' + m.onHold + ' on hold' : ''}</span></div></div>${stack(hb, ps.length).replace(/class="bn-stack"/, 'class="bn-stack bn-onDark"')}</div>
      ${tK('Blocked', m.blocked || 0, 'critical blockers', m.blocked ? 'bad' : '', 'bn-w2')}${tK('Overdue', m.overdue || 0, 'against plan or end date', m.overdue ? 'bad' : '', 'bn-w2')}${tK('Waiting on customers', m.awaitingCustomer || 0, 'projects', wait ? 'warn' : '', 'bn-w3')}
      ${tK('Open tasks', open, late ? late + ' overdue' : 'none overdue', late ? 'warn' : '', 'bn-w3')}${tK('Deadlines in 14 days', m.deadlines || 0, 'milestone, go-live or end', '', 'bn-w2')}${tK('At risk', m.atRisk || 0, 'warning signals', m.atRisk ? 'warn' : '', 'bn-w2')}
      <div class="bn-t bn-list bn-w6"><h3 class="bn-h">Needs attention first</h3>${worst.length ? `<ul class="bn-ul">${worst.map(p => pr(p) + `<em class="${p.health === 'blocked' || p.health === 'overdue' ? 'bad' : 'warn'}">${esc(hl(p.health))}</em></button></li>`).join('')}</ul>` : '<p class="bn-none">No project is blocked, overdue or at risk.</p>'}</div>
      <div class="bn-t bn-list bn-w6"><h3 class="bn-h">Next milestones</h3>${nxt.length ? `<ul class="bn-ul">${nxt.map(p => pr(p) + `<em>${esc(V.fmtDate(p.metrics.nextMilestone.date))}</em></button></li>`).join('')}</ul>` : '<p class="bn-none">No milestone is dated yet.</p>'}</div>
    </div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
