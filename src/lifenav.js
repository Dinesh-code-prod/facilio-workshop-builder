/* Delivery Lifecycle: the seven delivery stages, from project setup to closure, used by the navigation and the Delivery Lifecycle page.
   Stage status is derived ONLY from what the project has recorded (the twelve roadmap checkpoints in projroadmap.js, sign-offs and the
   plan), never from the calendar or from someone opening a page. A stage is "Complete" only when every checkpoint under it is complete,
   for example a signed sign-off or a recorded closure. Pending work, blockers, milestones and customer actions come from the
   governance records (actions, RAID, sign-offs) and the Plan Timeline. Stages a project does not use simply show "No activity". */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;

  // key, name, short label, the roadmap checkpoints it rolls up (indexes into V.roadmapStages), the menu pages worked on in it, sign-offs that close it
  const STAGES = [
    { k: 'setup', name: 'Project Setup & Kickoff', short: 'Setup', cps: [0], views: ['msaflow', 'kickoff', 'plan', 'timeline', 'governance', 'changes'], so: [], hint: 'Contract and scope, kick-off deck, project plan and governance.' },
    { k: 'req', name: 'Requirements & Workshops', short: 'Requirements', cps: [1, 2, 3], views: ['transcripts', 'usecases', 'checks', 'msafind', 'brd', 'onboarding'], so: ['brd'], hint: 'Workshop sessions, confirmed requirements, BRD and its sign-off.' },
    { k: 'config', name: 'Configuration & Documentation', short: 'Configuration', cps: [6, 7], views: ['modules', 'flow', 'roles', 'cfginputs', 'dashboards', 'trace'], so: [], hint: 'Modules, forms, state flows, roles, configuration inputs, FTR workbook and guides.' },
    { k: 'impl', name: 'Implementation & Integrations', short: 'Implementation', cps: [4], views: ['contracts'], so: [], hint: 'Building each module in scope and the integrations register.' },
    { k: 'uat', name: 'Testing & UAT', short: 'Testing & UAT', cps: [5], views: ['delivery'], so: ['uat'], hint: 'UAT sessions, defects and the UAT sign-off.' },
    { k: 'golive', name: 'Go-Live & Handover', short: 'Go-Live', cps: [8, 10], views: ['ftr', 'kpi', 'handover'], so: ['golive'], hint: 'Go-live checklist, acceptance and support handover.' },
    { k: 'close', name: 'Closure & Follow-Up', short: 'Closure', cps: [9, 11], views: ['hypercare'], so: [], hint: 'Hypercare, project closure and follow-up.' }
  ];
  const STAGE_OF = {}; STAGES.forEach((s, i) => s.views.forEach(v => { STAGE_OF[v] = i; }));
  V.stageOfView = view => { const i = STAGE_OF[view]; return i == null ? '' : STAGES[i].name; };
  V.LIFE_STAGES = STAGES; V.lifeStageOf = v => (v in STAGE_OF ? STAGE_OF[v] : -1);
  const ST = { none: ['No activity yet', 'none'], progress: ['In progress', 'progress'], done: ['Complete', 'done'] };
  const KINDS = ['action', 'raid', 'signoff'];

  function ready() { if (!V.roadmapReady || !V.roadmapReady()) return false; I().load(KINDS); return I().ready(KINDS); }
  // the seven stages with status and evidence
  function compute() {
    const cps = V.roadmapStages ? V.roadmapStages() : []; const so = k => I().get('signoff', k) || {};
    const out = STAGES.map((s, i) => {
      const parts = s.cps.map(n => cps[n]).filter(Boolean);
      const signs = s.so.map(k => ({ k, st: so(k).status || 'notdue' }));
      let state = parts.length && parts.every(p => p.state === 'done') && signs.every(x => x.st === 'signed') ? 'done' : parts.some(p => p.state !== 'none') || signs.some(x => x.st !== 'notdue') ? 'progress' : 'none';
      // the setup stage counts a dated plan as evidence of a kick-off
      if (i === 0 && state === 'none' && V.planStats && V.planStats().n) state = 'progress';
      return Object.assign({}, s, { i, state, parts, signs });
    });
    // current stage: the furthest stage with work in progress; with none in progress, the first stage that is not complete
    let cur = out.map(s => s.state === 'progress').lastIndexOf(true); if (cur < 0) cur = out.findIndex(s => s.state !== 'done'); if (cur < 0) cur = out.length - 1;
    return { list: out, cur };
  }
  V.lifeStages = () => (ready() ? compute() : null);

  const fd = d => (d ? V.fmtDate(d) : '');
  function attention() {
    const today = V.today(); const acts = I().list('action').filter(a => a.status !== 'Done');
    const late = a => a.due && a.due < today;
    const blockers = acts.filter(a => a.status === 'Blocked').map(a => ({ t: a.text, d: 'Action blocked' + (a.owner ? ' · ' + a.owner : ''), v: 'governance' }))
      .concat(I().list('raid').filter(r => r.status !== 'Closed' && (r.type === 'I' || (r.type === 'R' && r.impact === 'High'))).map(r => ({ t: r.title, d: (r.type === 'I' ? 'Open issue' : 'High risk') + (r.impact ? ' · ' + r.impact + ' impact' : ''), v: 'governance' })));
    const facilio = acts.filter(a => (a.side || 'facilio') === 'facilio' && a.status !== 'Blocked').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(a => ({ t: a.text, d: (a.due ? (late(a) ? 'Overdue since ' : 'Due ') + fd(a.due) : 'No due date') + (a.owner ? ' · ' + a.owner : ''), late: late(a), v: 'governance' }));
    const customer = acts.filter(a => a.side === 'customer').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(a => ({ t: a.text, d: (a.due ? (late(a) ? 'Overdue since ' : 'Due ') + fd(a.due) : 'No due date') + (a.owner ? ' · ' + a.owner : ''), late: late(a), v: 'governance' }))
      .concat(I().list('signoff').filter(x => x.status === 'requested').map(x => ({ t: ({ brd: 'BRD Sign-Off', uat: 'UAT Sign-Off', golive: 'Go-Live Acceptance' })[x.id] || 'Sign-off', d: 'Waiting for the customer' + (x.due ? ' · due ' + fd(x.due) : ''), late: x.due && x.due < today, v: 'governance' })));
    const horizon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const miles = (V.planRows ? V.planRows() : []).filter(r => r.s && r.s >= today && r.s <= horizon && (r.top || /kick|sign|go.?live|uat|hand|clos|training/i.test(r.t))).sort((a, b) => a.s.localeCompare(b.s)).slice(0, 6).map(r => ({ t: r.t, d: fd(r.s), v: 'timeline' }));
    return { blockers, facilio, customer, miles };
  }
  V.lifeAttention = () => (ready() ? attention() : null);

  // compact stage indicator shown above pages of the Overview and Delivery Lifecycle modules
  V.lifeStrip = () => {
    if (!S.project || V.isCustomer()) return V.phaseStrip ? V.phaseStrip() : '';
    const L = V.lifeStages(); if (!L) return '';
    const p = V.phaseNow ? V.phaseNow() : null; const step = p && p.cur >= 0 ? p.info[p.cur] : null; const mine = V.lifeStageOf(S.ui.view);
    return `<nav class="lc-strip" aria-label="Delivery lifecycle"><ol>${L.list.map(s => `<li class="${s.state}${s.i === L.cur ? ' cur' : ''}${s.i === mine ? ' here' : ''}"><button type="button" data-act="lcStage" data-k="${s.i}" title="${esc(s.name)}: ${ST[s.state][0]}"${s.i === L.cur ? ' aria-current="step"' : ''}><i aria-hidden="true">${s.state === 'done' ? '✓' : s.i + 1}</i><span>${esc(s.short)}</span></button></li>`).join('')}</ol>${step ? `<span class="lc-plan" title="From the Plan Timeline">Plan: step ${step.i + 1} of 12 · ${esc(step.title)}</span>` : ''}</nav>`;
  };
  ACT.lcStage = a => { S.ui.lcOpen = Number(a.getAttribute('data-k')); V.go('lifecycle'); setTimeout(() => { const el = document.getElementById('lc-s' + S.ui.lcOpen); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); };

  const pages = s => s.views.filter(v => V[v]).map(v => { const it = (V.navFor ? V.navFor() : []).flatMap(g => g.items).find(x => x[0] === v); return it ? [v, it[1]] : null; }).filter(Boolean);
  const list = (rows, empty) => rows.length ? `<ul class="lc-list">${rows.slice(0, 8).map(r => `<li${r.late ? ' class="late"' : ''}><a href="#" data-act="nav" data-view="${r.v}">${esc(r.t || 'Untitled')}</a><span>${esc(r.d)}</span></li>`).join('')}${rows.length > 8 ? `<li class="more"><a href="#" data-act="nav" data-view="${rows[0].v}">${rows.length - 8} more</a></li>` : ''}</ul>` : `<p class="lc-empty">${esc(empty)}</p>`;
  V.lifecycle = {
    html() {
      const L = V.lifeStages(); if (!L) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const A = attention(); const done = L.list.filter(s => s.state === 'done').length; const cur = L.list[L.cur];
      const stageCard = s => { const pg = pages(s); return `<section class="card lc-stage ${s.state}${s.i === L.cur ? ' cur' : ''}" id="lc-s${s.i}" aria-labelledby="lc-h${s.i}">
        <header><span class="lc-num" aria-hidden="true">${s.state === 'done' ? '✓' : s.i + 1}</span><div><p class="lc-eyebrow">Stage ${String(s.i + 1).padStart(2, '0')} / 07${s.i === L.cur ? ' · current' : ''}</p><h2 id="lc-h${s.i}">${esc(s.name)}</h2><p class="small muted">${esc(s.hint)}</p></div><span class="lc-badge ${s.state}">${ST[s.state][0]}</span></header>
        <ul class="lc-evid">${s.parts.map(p => `<li class="${p.state}"><b>${esc(p.name)}</b><span>${esc(p.detail)}</span></li>`).join('')}${s.signs.map(x => `<li class="${x.st === 'signed' ? 'done' : x.st === 'notdue' ? 'none' : 'progress'}"><b>${esc(({ brd: 'BRD Sign-Off', uat: 'UAT Sign-Off', golive: 'Go-Live Acceptance' })[x.k])}</b><span>${esc(({ signed: 'Signed', requested: 'Requested from the customer', concern: 'Customer raised a concern', notdue: 'Not requested yet' })[x.st] || x.st)}</span></li>`).join('')}</ul>
        ${pg.length ? `<div class="lc-pages">${pg.map(([v, l]) => `<button class="btn sm" data-act="nav" data-view="${v}">${esc(l)}</button>`).join('')}</div>` : ''}</section>`; };
      return `<div class="page-header"><div class="t"><h1>Delivery Lifecycle</h1><p>From kick-off to closure. Each stage's status comes only from what this project has recorded: sessions, requirements, sign-offs, build and UAT records, checklists and closure. Nothing is marked complete automatically.</p></div></div>
      <div class="page-body">
        <div class="lc-top"><div class="card lc-now"><p class="lc-eyebrow">Current stage</p><h2>${esc(cur.name)}</h2><p class="small muted">${done} of 7 stages complete · ${esc(ST[cur.state][0])}</p><div class="lc-bar" role="img" aria-label="${done} of 7 stages complete">${L.list.map(s => `<i class="${s.state}${s.i === L.cur ? ' cur' : ''}"></i>`).join('')}</div>${pages(cur).length ? `<button class="btn primary" data-act="nav" data-view="${pages(cur)[0][0]}">Continue in ${esc(pages(cur)[0][1])}</button>` : ''}</div>
          <div class="card lc-att"><h3>Blockers <span class="lc-n${A.blockers.length ? ' bad' : ''}">${A.blockers.length}</span></h3>${list(A.blockers, 'No blocked actions, open issues or high risks.')}</div>
          <div class="card lc-att"><h3>Waiting on the customer <span class="lc-n">${A.customer.length}</span></h3>${list(A.customer, 'No open customer actions or sign-off requests.')}</div>
          <div class="card lc-att"><h3>Our pending actions <span class="lc-n">${A.facilio.length}</span></h3>${list(A.facilio, 'No open actions for the Facilio team.')}</div>
          <div class="card lc-att"><h3>Upcoming milestones <span class="xs muted">next 30 days</span></h3>${list(A.miles, 'No dated milestones in the next 30 days. Add them in the Plan Timeline.')}</div></div>
        <div class="lc-stages">${L.list.map(stageCard).join('')}</div></div>`;
    },
    mount() { if (S.ui.lcOpen != null) { const el = document.getElementById('lc-s' + S.ui.lcOpen); S.ui.lcOpen = null; if (el) el.scrollIntoView({ block: 'start' }); } }
  };
})(typeof window !== 'undefined' ? window : globalThis);
