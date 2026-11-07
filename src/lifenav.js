/* Delivery Lifecycle tracker: nine delivery stages from kickoff to closure (rules in src/lifelogic.js), used by the navigation strip and the Delivery Lifecycle page.
   A stage's status comes ONLY from what the project has recorded (the twelve roadmap checkpoints in projroadmap.js, sign-offs, UAT issues, the plan and
   governance records) and from a recorded decision by a project owner or admin (item kind "lcstage": owner, closed / not applicable, note, history).
   Never from the calendar, a percentage or someone opening a page. Missing information is shown as missing, not as success. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const L = () => root.FWBLife;
  const { drawer, closeDrawer, toast } = V;
  const STAGES = L().STAGES;
  const STAGE_OF = {}; STAGES.forEach((s, i) => s.views.forEach(v => { STAGE_OF[v] = i; }));
  V.stageOfView = view => { const i = STAGE_OF[view]; return i == null ? '' : STAGES[i].name; };
  V.LIFE_STAGES = STAGES; V.lifeStageOf = v => (v in STAGE_OF ? STAGE_OF[v] : -1);
  const ST = L().STATUS; const CLS = { completed: 'done', ready: 'progress', current: 'progress', delayed: 'progress', blocked: 'progress', upcoming: 'none', na: 'none' };
  const SO_NAME = { brd: 'BRD Sign-Off', uat: 'UAT Sign-Off', golive: 'Go-Live Acceptance' };
  const team = () => !V.isCustomer(); const canEdit = () => team() && !S.readonly; const canDecide = () => canEdit() && S.project && S.project.role === 'owner';
  const KINDS = ['action', 'raid', 'signoff', 'task'];
  const fd = d => (d ? V.fmtDate(d) : '');

  function ready() { if (!V.roadmapReady || !V.roadmapReady()) return false; const k = team() ? KINDS.concat('lcstage') : KINDS; I().load(k); return I().ready(k); }
  // the nine stages with status and evidence
  function compute() {
    const cps = V.roadmapStages ? V.roadmapStages() : []; const so = k => I().get('signoff', k) || {}; const today = V.today();
    const acts = I().list('action').filter(a => a.status !== 'Done'); const raids = I().list('raid').filter(r => r.status !== 'Closed' && (r.type === 'I' || (r.type === 'R' && r.impact === 'High')));
    const U = root.FWBUat; const uatBad = I().list('task').filter(t => U && U.isUatIssue(t) && !['Closed', 'Deferred'].includes(U.issueStatus(t)) && t.uat && ['Critical', 'Major'].includes(t.uat.severity));
    const msa = V.msaActive ? V.msaActive() : null; const late = V.planOverdue ? V.planOverdue() : []; const rows = V.planRows ? V.planRows() : [];
    const planned = V.planStats ? V.planStats().n : 0;
    const list = STAGES.map((s, i) => {
      const parts = s.cps.map(n => cps[n]).filter(Boolean); const signs = s.so.map(k => ({ k, st: so(k).status || 'notdue', at: so(k).signedAt || '' }));
      const dec = (team() && I().get('lcstage', s.k)) || {};
      const blockers = acts.filter(a => a.status === 'Blocked' && s.re.test(a.text || '')).map(a => ({ t: a.text, d: 'Action blocked' + (a.owner ? ' · ' + a.owner : ''), v: 'governance' }))
        .concat(raids.filter(r => s.re.test(r.title || '')).map(r => ({ t: r.title, d: (r.type === 'I' ? 'Open issue' : 'High risk'), v: 'governance' })))
        .concat(signs.filter(x => x.st === 'concern').map(x => ({ t: SO_NAME[x.k], d: 'Customer raised a concern', v: 'governance' })));
      if (s.k === 'uat') uatBad.forEach(t => blockers.push({ t: t.title || t.text || 'UAT issue', d: 'UAT issue · ' + t.uat.severity, v: 'uatIssues' }));
      if (s.k === 'workshops' && msa && msa.high) blockers.push({ t: msa.high + ' high-severity MSA scope finding(s) need a person', d: 'MSA Scope Check', v: 'msafind' });
      const overdue = late.filter(r => s.re.test(r.title || '')); const upcoming = rows.filter(r => r.s && r.s >= today && s.re.test(r.t || '')).sort((a, b) => a.s.localeCompare(b.s)).slice(0, 3).map(r => ({ t: r.t, d: fd(r.s), v: 'timeline' }));
      const pending = acts.filter(a => a.status !== 'Blocked' && s.re.test(a.text || '')).slice(0, 4).map(a => ({ t: a.text, d: (a.due ? (a.due < today ? 'Overdue since ' : 'Due ') + fd(a.due) : 'No due date') + (a.owner ? ' · ' + a.owner : ''), late: a.due && a.due < today, v: 'governance' }));
      const active = parts.some(p => p.state !== 'none') || signs.some(x => x.st !== 'notdue') || (i === 0 && planned > 0);
      return { s, i, parts, signs, dec, blockers, overdue, upcoming, pending, active };
    });
    // the current pointer needs every stage's status first; the pointer stage then shows as Current even with no records
    const first = list.map(x => Object.assign(x, L().status({ cps: x.parts, signs: x.signs, decision: x.dec, overdue: x.overdue.length, blockers: x.blockers.length })));
    const cur = L().current(first);
    first.forEach(x => { if (x.i === cur && x.status === 'upcoming') x.status = 'current'; });
    return { list: first, cur, counts: L().counts(first) };
  }
  V.lifeStages = () => (ready() ? compute() : null);
  // pure view of a stage for other pages: { name, status }
  V.lifeSummary = () => { const c = V.lifeStages(); return c ? { cur: c.list[c.cur].s.name, status: c.list[c.cur].status, counts: c.counts } : null; };

  function attention() {
    const today = V.today(); const acts = I().list('action').filter(a => a.status !== 'Done');
    const late = a => a.due && a.due < today;
    const blockers = acts.filter(a => a.status === 'Blocked').map(a => ({ t: a.text, d: 'Action blocked' + (a.owner ? ' · ' + a.owner : ''), v: 'governance' }))
      .concat(I().list('raid').filter(r => r.status !== 'Closed' && (r.type === 'I' || (r.type === 'R' && r.impact === 'High'))).map(r => ({ t: r.title, d: (r.type === 'I' ? 'Open issue' : 'High risk') + (r.impact ? ' · ' + r.impact + ' impact' : ''), v: 'governance' })));
    const facilio = acts.filter(a => (a.side || 'facilio') === 'facilio' && a.status !== 'Blocked').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(a => ({ t: a.text, d: (a.due ? (late(a) ? 'Overdue since ' : 'Due ') + fd(a.due) : 'No due date') + (a.owner ? ' · ' + a.owner : ''), late: late(a), v: 'governance' }));
    const customer = acts.filter(a => a.side === 'customer').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map(a => ({ t: a.text, d: (a.due ? (late(a) ? 'Overdue since ' : 'Due ') + fd(a.due) : 'No due date') + (a.owner ? ' · ' + a.owner : ''), late: late(a), v: 'governance' }))
      .concat(I().list('signoff').filter(x => x.status === 'requested').map(x => ({ t: SO_NAME[x.id] || 'Sign-off', d: 'Waiting for the customer' + (x.due ? ' · due ' + fd(x.due) : ''), late: x.due && x.due < today, v: 'governance' })));
    const horizon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const miles = (V.planRows ? V.planRows() : []).filter(r => r.s && r.s >= today && r.s <= horizon && (r.top || /kick|sign|go.?live|uat|hand|clos|training/i.test(r.t))).sort((a, b) => a.s.localeCompare(b.s)).slice(0, 6).map(r => ({ t: r.t, d: fd(r.s), v: 'timeline' }));
    return { blockers, facilio, customer, miles };
  }
  V.lifeAttention = () => (ready() ? attention() : null);

  // compact stage indicator (the eight-stage roadmap)
  V.lifeStrip = () => {
    if (!S.project || V.isCustomer()) return V.phaseStrip ? V.phaseStrip() : '';
    const C = V.lifeStages(); if (!C) return '';
    const p = V.phaseNow ? V.phaseNow() : null; const step = p && p.cur >= 0 ? p.info[p.cur] : null; const mine = V.lifeStageOf(S.ui.view);
    return `<nav class="lc-strip" aria-label="Delivery lifecycle"><ol>${C.list.map(x => `<li class="${CLS[x.status]} ${x.status}${x.i === C.cur ? ' cur' : ''}${x.i === mine ? ' here' : ''}"><button type="button" data-act="lcStage" data-k="${x.i}" title="${esc(x.s.name)}: ${ST[x.status]}"${x.i === C.cur ? ' aria-current="step"' : ''}><i aria-hidden="true">${x.status === 'completed' ? '✓' : x.s.n}</i><span>${esc(x.s.short)}</span></button></li>`).join('')}</ol>${step ? `<span class="lc-plan" title="From the Plan Timeline">Plan: step ${step.i + 1} of 12 · ${esc(step.title)}</span>` : ''}</nav>`;
  };
  ACT.lcStage = a => { S.ui.lcOpen = Number(a.getAttribute('data-k')); V.go('lifecycle'); setTimeout(() => { const el = document.getElementById('lc-s' + S.ui.lcOpen); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); };

  const pages = s => s.views.filter(v => V[v]).map(v => { const it = (V.navFor ? V.navFor() : []).flatMap(g => g.items).find(x => x[0] === v); return it ? [v, it[1]] : null; }).filter(Boolean);
  const list = (rows, empty) => rows.length ? `<ul class="lc-list">${rows.slice(0, 8).map(r => `<li${r.late ? ' class="late"' : ''}><a href="#" data-act="nav" data-view="${r.v}">${esc(r.t || 'Untitled')}</a><span>${esc(r.d)}</span></li>`).join('')}${rows.length > 8 ? `<li class="more"><a href="#" data-act="nav" data-view="${rows[0].v}">${rows.length - 8} more</a></li>` : ''}</ul>` : `<p class="lc-empty">${esc(empty)}</p>`;
  const SIGN_TXT = { signed: 'Signed', requested: 'Requested from the customer', concern: 'Customer raised a concern', notdue: 'Not requested yet' };
  // the date a stage was completed: a person's recorded closure, else the latest signed sign-off; "not recorded" when records say done but carry no date
  function doneOn(x) { if (x.status !== 'completed') return ''; if (x.dec.status === 'closed') return fd(x.dec.at) || 'date not recorded'; const d = x.signs.filter(y => y.st === 'signed' && y.at).map(y => y.at).sort().pop(); return d ? fd(d) : 'Date not recorded'; }

  function card(x, C) {
    const s = x.s; const pg = pages(s); const prog = x.parts.filter(p => p.state === 'done').length + x.signs.filter(y => y.st === 'signed').length; const tot = x.parts.length + x.signs.length;
    const mism = x.dec.status === 'closed' && x.open > 0;
    return `<section class="card lc-stage ${CLS[x.status]} st-${x.status}${x.i === C.cur ? ' cur' : ''}" id="lc-s${x.i}" aria-labelledby="lc-h${x.i}">
      <header><span class="lc-num" aria-hidden="true">${x.status === 'completed' ? '✓' : s.n}</span><div><p class="lc-eyebrow">Stage ${s.n}${x.i === C.cur ? ' · current' : ''}</p><h2 id="lc-h${x.i}">${esc(s.name)}</h2><p class="small muted">${esc(s.hint)}</p></div><span class="lc-badge ${CLS[x.status]} st-${x.status}">${ST[x.status]}</span></header>
      <dl class="lc-meta"><div><dt>Owner</dt><dd>${x.dec.owner ? esc(x.dec.owner) : '<span class="muted">Not assigned</span>'}</dd></div><div><dt>${x.status === 'completed' ? 'Completed on' : 'Completion'}</dt><dd>${x.status === 'completed' ? esc(doneOn(x)) : '<span class="muted">Not completed</span>'}</dd></div><div><dt>Progress</dt><dd>${tot ? prog + ' of ' + tot + ' records complete' : '<span class="muted">No records to count</span>'}</dd></div></dl>
      ${mism ? `<p class="lc-warn">Closed by ${esc(x.dec.by || 'a project owner')}${x.dec.at ? ' on ' + esc(fd(x.dec.at)) : ''} while ${x.open} record${x.open === 1 ? ' is' : 's are'} still open. The decision stands; the records below have not caught up.</p>` : ''}
      ${x.status === 'na' ? `<p class="lc-warn">Marked not applicable by ${esc(x.dec.by || 'a project owner')}${x.dec.note ? ': ' + esc(x.dec.note) : ''}.</p>` : ''}
      <ul class="lc-evid">${x.parts.map(p => `<li class="${p.state}"><b>${esc(p.name)}</b><span>${esc(p.detail)}</span></li>`).join('')}${x.signs.map(y => `<li class="${y.st === 'signed' ? 'done' : y.st === 'notdue' ? 'none' : 'progress'}"><b>${esc(SO_NAME[y.k])}</b><span>${esc(SIGN_TXT[y.st] || y.st)}</span></li>`).join('')}</ul>
      <div class="lc-4"><div><h4>Critical blockers <span class="lc-n${x.blockers.length ? ' bad' : ''}">${x.blockers.length}</span></h4>${list(x.blockers, 'None recorded.')}</div><div><h4>Pending actions <span class="lc-n">${x.pending.length}</span></h4>${list(x.pending, 'None matched to this stage.')}</div><div><h4>Upcoming activities</h4>${list(x.upcoming, 'None dated in the plan.')}</div>${x.overdue.length ? `<div><h4>Behind schedule <span class="lc-n bad">${x.overdue.length}</span></h4>${list(x.overdue.slice(0, 4).map(r => ({ t: r.title, d: 'Due ' + fd(r.end || r.start), late: true, v: 'timeline' })), '')}</div>` : ''}</div>
      <div class="lc-foot">${pg.length ? `<div class="lc-pages">${pg.map(([v, l]) => `<button class="btn sm" data-act="nav" data-view="${v}">${esc(l)}</button>`).join('')}</div>` : '<span></span>'}${canEdit() ? `<button class="btn sm${canDecide() ? ' primary' : ''}" data-act="lcManage" data-k="${esc(s.k)}">${x.status === 'ready' && canDecide() ? 'Review and close this stage' : canDecide() ? 'Owner, decision and history' : 'Owner and history'}</button>` : ''}</div>
      </section>`;
  }
  V.lifecycle = {
    html() {
      const C = V.lifeStages(); if (!C) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const A = attention(); const cur = C.list[C.cur]; const n = C.counts;
      return `<div class="page-header"><div class="t"><h1>Project cycle</h1><p>The eight-stage roadmap. The records decide when a stage is <b>Ready to close</b>; a project owner or admin closes it, and their name and the date are kept. Claude and the Studio never close a stage on their own, and nothing here is a percentage.</p></div></div>
      <div class="page-body">
        <div class="lc-top"><div class="card lc-now"><p class="lc-eyebrow">Current stage</p><h2>${esc(cur.s.name)}</h2><p class="small muted">${n.done} of ${n.total} stages closed${C.list.filter(x => x.status === 'ready').length ? ' · ' + C.list.filter(x => x.status === 'ready').length + ' ready to close' : ''}${n.na ? ' · ' + n.na + ' not applicable' : ''} · ${esc(ST[cur.status])}</p><div class="lc-bar" role="img" aria-label="${n.done} of ${n.total} stages completed">${C.list.map(x => `<i class="${CLS[x.status]} st-${x.status}${x.i === C.cur ? ' cur' : ''}" title="${esc(x.s.name)}: ${ST[x.status]}"></i>`).join('')}</div>${pages(cur.s).length ? `<button class="btn primary" data-act="nav" data-view="${pages(cur.s)[0][0]}">Continue in ${esc(pages(cur.s)[0][1])}</button>` : ''}</div>
          <div class="card lc-att"><h3>Blockers <span class="lc-n${A.blockers.length ? ' bad' : ''}">${A.blockers.length}</span></h3>${list(A.blockers, 'No blocked actions, open issues or high risks.')}</div>
          <div class="card lc-att"><h3>Waiting on the customer <span class="lc-n">${A.customer.length}</span></h3>${list(A.customer, 'No open customer actions or sign-off requests.')}</div>
          <div class="card lc-att"><h3>Our pending actions <span class="lc-n">${A.facilio.length}</span></h3>${list(A.facilio, 'No open actions for the Facilio team.')}</div>
          <div class="card lc-att"><h3>Upcoming milestones <span class="xs muted">next 30 days</span></h3>${list(A.miles, 'No dated milestones in the next 30 days. Add them in the Plan Timeline.')}</div></div>
        <p class="xs muted" style="margin:-6px 0 14px">Actions and plan rows are tied to a stage by the words in their title, so one that uses different wording appears only in the project-wide lists above.</p>
        <div class="lc-stages">${C.list.map(x => card(x, C)).join('')}</div></div>`;
    },
    mount() { if (S.ui.lcOpen != null) { const el = document.getElementById('lc-s' + S.ui.lcOpen); S.ui.lcOpen = null; if (el) el.scrollIntoView({ block: 'start' }); } }
  };

  // ---------- owner, decision and history of one stage ----------
  ACT.lcManage = a => { if (!canEdit()) return; const s = STAGES.find(x => x.k === a.getAttribute('data-k')); if (!s) return; const dec = I().get('lcstage', s.k) || {}; const cur = dec.status || '';
    const log = (dec.log || []).slice().reverse();
    drawer(s.name, `<label class="f" for="lc_o">Responsible owner</label><input id="lc_o" type="text" maxlength="120" value="${esc(dec.owner || '')}" placeholder="Name of the person accountable for this stage">
      ${canDecide() ? `<label class="f" for="lc_d">Decision</label><select id="lc_d"><option value=""${cur === '' ? ' selected' : ''}>No decision: status follows the records</option><option value="closed"${cur === 'closed' ? ' selected' : ''}>Completed / closed by decision</option><option value="na"${cur === 'na' ? ' selected' : ''}>Not applicable to this project</option></select>
      <label class="f" for="lc_n">Note (why, and what was agreed)</label><textarea id="lc_n" rows="4" maxlength="1000">${esc(dec.note || '')}</textarea>
      <div class="xs muted" style="margin-top:8px">Only a project owner or an admin can close a stage, mark it not applicable or reopen it. Your name and the date are kept. Closing a stage whose records are not complete is allowed, and the page then shows that the records disagree.</div>` : '<div class="xs muted" style="margin-top:10px">Only a project owner or an admin can close a stage, mark it not applicable or reopen it.</div>'}
      <h4 style="margin:16px 0 6px">History</h4>${log.length ? `<ul class="lc-hist">${log.map(h => `<li><b>${esc(h.what)}</b><span>${esc(h.by || '')} · ${esc(fd(h.at))}</span>${h.note ? `<div class="xs">${esc(h.note)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="xs muted">No changes recorded yet.</p>'}`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="lcSave" data-k="${esc(s.k)}">Save</button>`, { wide: true }); };
  ACT.lcSave = a => V.busy(a, async () => { const s = STAGES.find(x => x.k === a.getAttribute('data-k')); const dec = I().get('lcstage', s.k) || {}; const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').trim() : null; };
    const owner = (val('lc_o') || '').slice(0, 120); const st = canDecide() ? val('lc_d') : (dec.status || ''); const note = canDecide() ? (val('lc_n') || '').slice(0, 1000) : (dec.note || ''); const was = dec.status || '';
    const who = S.user.name || S.user.email; const now = new Date().toISOString(); const log = (dec.log || []).slice(-19);
    if (st !== was) {
      if (st !== '' && !note) { toast('Add a short note about the decision', 5000, true); return; }
      const msg = st === 'closed' ? `Mark "${s.name}" as completed? This is a recorded decision under your name. Other people will see this stage as Completed, even where its records are not all complete.` : st === 'na' ? `Mark "${s.name}" as not applicable? It will be left out of the stage count.` : `Reopen "${s.name}"? Its status goes back to what the records show.`;
      if (!(await V.confirmDialog('Confirm stage decision', msg, st === '' ? 'Reopen' : 'Confirm', st !== 'closed'))) return;
      log.push({ at: now, by: who, what: st === 'closed' ? 'Marked completed' : st === 'na' ? 'Marked not applicable' : 'Reopened', note });
    } else if (owner !== (dec.owner || '')) log.push({ at: now, by: who, what: owner ? 'Owner set to ' + owner : 'Owner removed', note: '' });
    else if (note === (dec.note || '')) { closeDrawer(); return; }
    await I().put('lcstage', s.k, Object.assign({}, dec, { owner, status: st, note, log }, st !== was ? { by: who, at: now } : {})); closeDrawer(); toast('Stage saved'); });
})(typeof window !== 'undefined' ? window : globalThis);
