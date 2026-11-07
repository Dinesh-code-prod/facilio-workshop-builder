/* Dashboard Report — the project analytics hub. One model() computes every number from the records already in the project;
   every KPI, bar segment, pivot cell and timeline event registers the rows behind it, so the figure on screen and the drill-down
   list always come from the same array. Nothing here is stored except the customer logo (shared with the BRD: brddoc.logos.customer).
   Filters are offered only for fields that exist on the records. Exports (CSV, Excel, PDF) are built from the same model. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const { toast, loading, confirmDialog, tag } = V;
  const I = () => V.items;
  const TABS = [['overview', 'Overview'], ['workshops', 'Workshops & Timeline'], ['reqs', 'Requirements & Use Cases'], ['questions', 'Questions & Decisions'], ['config', 'Configuration & Readiness'], ['brd', 'BRD & Sign-Off'], ['pivots', 'Analytics & Pivots'], ['existing', 'Existing Reports']];
  const PERIODS = [['all', 'All time'], ['week', 'This week'], ['month', 'This month'], ['quarter', 'This quarter'], ['custom', 'Custom range']];
  const RSTAT = ['Draft', 'Confirmed', 'Deferred', 'Rejected'];
  const BARC = ['var(--fc-primary)', 'var(--fc-success)', 'var(--fc-warning)', 'var(--fc-danger)', 'var(--fc-violet)', 'var(--sf-cond)', 'var(--fc-pink)', 'var(--fc-muted)'];
  const U = () => { S.ui.dr = S.ui.dr || { tab: 'overview', f: { period: 'all' }, at: new Date() }; return S.ui.dr; };
  const day = s => (s || '').slice(0, 10);

  // ---------- reporting period ----------
  function range(f) {
    const t = V.today(); const d = new Date(t + 'T00:00:00Z');
    if (f.period === 'week') { const wd = (d.getUTCDay() + 6) % 7; return [V.addDays(t, -wd), V.addDays(t, 6 - wd)]; }
    if (f.period === 'month') { const a = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), b = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); return [a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)]; }
    if (f.period === 'quarter') { const q = Math.floor(d.getUTCMonth() / 3) * 3; return [new Date(Date.UTC(d.getUTCFullYear(), q, 1)).toISOString().slice(0, 10), new Date(Date.UTC(d.getUTCFullYear(), q + 3, 0)).toISOString().slice(0, 10)]; }
    if (f.period === 'custom') return [f.from || '', f.to || ''];
    return ['', ''];
  }
  const periodLabel = f => { const [a, b] = range(f); return f.period === 'all' ? 'All time' : (PERIODS.find(p => p[0] === f.period) || [])[1] + (a || b ? ` (${a || '…'} to ${b || '…'})` : ''); };

  // ---------- the model ----------
  function model() {
    const u = U(); const f = u.f; const [from, to] = range(f); const drill = {}; const mlabel = V.modLabel;
    const stg = f.stage !== undefined && f.stage !== '' && V.planSteps ? V.planSteps().find(x => String(x.i) === String(f.stage)) : null;
    const inP = d => { const x = day(d); if (stg && !(x && stg.start && x >= stg.start && x <= stg.end)) return false; if (f.period === 'all') return true; if (!x) return false; return (!from || x >= from) && (!to || x <= to); };
    const creator = r => ((r.history || [])[0] || {}).by || ''; const brdState = r => r.status === 'Confirmed' ? 'Included' : r.status === 'Rejected' ? 'Excluded' : 'Awaiting confirmation';
    const reg = (id, title, rows) => { drill[id] = { title, rows }; return rows.length; };
    const ws = S.ws; const sessions = (F.doc('planner').sessions || []);
    const sesName = id => { const s = sessions.find(x => x.id === id); return s ? `Session ${s.no || ''} — ${s.title || ''}` : ''; };
    const modOk = arr => !f.module || (arr || []).includes(f.module);
    const rqs = ws.requirements.filter(r => inP(r.created) && modOk(r.modules) && (!f.session || r.sessionId === f.session) && (!f.reqClass || r.classification === f.reqClass) && (!f.reqStatus || (r.status || 'Draft') === f.reqStatus) && (!f.pm || creator(r) === f.pm) && (!f.brd || brdState(r) === f.brd));
    const ucs = I().list('usecase').filter(x => !f.pm && !f.brd && inP(x._created) && modOk(x.modules) && (!f.conf || (x.confirmation || 'Unconfirmed') === f.conf) && (!f.ucType || x.solution === f.ucType) && (!f.priority || x.priority === f.priority));
    const modName = f.module ? mlabel(f.module) : '';
    const qs = ws.questions.filter(q => !f.pm && !f.brd && inP(q.created) && (!f.session || q.sessionId === f.session) && (!f.module || (q.area || '').toLowerCase().includes(modName.toLowerCase())) && (!f.qStatus || q.status === f.qStatus));
    const ses = sessions.filter(s => !f.pm && !f.brd && inP(s.date) && (!f.session || s.id === f.session) && (!f.module || (s.modules || []).includes(f.module)));
    const rr = r => ({ ref: r.id, title: r.title || r.objective || '', detail: `${F.REQ_CLASS[r.classification] || ''} · ${r.status || 'Draft'}${(r.modules || []).length ? ' · ' + r.modules.map(mlabel).join(', ') : ''}`, view: 'transcripts', go: { trTab: 'register' } });
    const ur = x => ({ ref: 'UC-' + (x.no || ''), title: x.title || '', detail: `${x.solution || 'Pending decision'} · ${x.priority || ''} · ${x.confirmation || 'Unconfirmed'}`, view: 'usecases', go: {} });
    const qr = q => ({ ref: q.id, title: q.text || '', detail: `${q.status}${q.owner === 'internal' ? ' · Internal' : ' · Customer'}${q.area ? ' · ' + q.area : ''}${q.answer && (q.ver || 'Unverified') === 'Unverified' ? ' · answer unverified' : ''}`, view: 'transcripts', go: { trTab: 'questions' } });
    const sr = s => ({ ref: 'Session ' + (s.no || ''), title: s.title || '', detail: `${s.status || 'planned'}${s.date ? ' · ' + s.date : ' · no date'}`, view: 'planner', go: {} });
    const kpis = {}; const K = (id, label, rows, hint) => { kpis[id] = { id, label, n: reg('k:' + id, label, rows), hint }; return kpis[id]; };
    const by = (arr, fn) => { const o = {}; arr.forEach(x => { const k = fn(x); (o[k] = o[k] || []).push(x); }); return o; };
    const bars = (pre, title, groups, order, mapRow) => (order || Object.keys(groups)).map((k, i) => ({ id: `${pre}:${k}`, label: k, n: reg(`${pre}:${k}`, `${title}: ${k}`, (groups[k] || []).map(mapRow)), c: BARC[i % BARC.length] }));

    // requirements and use cases
    const rByS = by(rqs, r => r.status || 'Draft');
    K('req_total', 'Requirements', rqs.map(rr)); RSTAT.forEach(s => K('req_' + s, s, (rByS[s] || []).map(rr)));
    const reqStatusBars = bars('rs', 'Requirements', rByS, RSTAT, rr);
    const classBars = bars('rc', 'Requirements by category', by(rqs, r => F.REQ_CLASS[r.classification] || 'Unclassified'), null, rr);
    K('uc_total', 'Use cases', ucs.map(ur)); K('uc_conf', 'Use cases customer-confirmed', ucs.filter(x => x.confirmation === 'Customer confirmed').map(ur)); K('uc_unconf', 'Use cases awaiting confirmation', ucs.filter(x => x.confirmation !== 'Customer confirmed').map(ur));
    K('uc_verified', 'Use cases verified against configuration', ucs.filter(x => x.impl === 'Verified against configuration').map(ur));
    const ucTypeBars = bars('ut', 'Use cases by solution type', by(ucs, x => x.solution || 'Pending decision'), null, ur);
    const ucPriBars = bars('up', 'Use cases by priority', by(ucs, x => x.priority || 'Not set'), null, ur);

    // questions: ten KPIs
    const qd = I().list('decision');
    K('q_total', 'Total questions', qs.map(qr)); K('q_open', 'Open questions', qs.filter(q => q.status === 'open').map(qr)); K('q_answered', 'Answered questions, not closed', qs.filter(q => q.status === 'answered').map(qr)); K('q_closed', 'Closed questions', qs.filter(q => q.status === 'closed').map(qr));
    K('q_cust', 'Waiting on the customer', qs.filter(q => q.owner !== 'internal' && q.status !== 'closed').map(qr)); K('q_int', 'Internal (Facilio) questions open', qs.filter(q => q.owner === 'internal' && q.status !== 'closed').map(qr));
    K('q_unver', 'Answers not yet verified', qs.filter(q => q.answer && (q.ver || 'Unverified') === 'Unverified').map(qr)); K('q_req', 'Turned into a requirement', qs.filter(q => q.reqId).map(qr));
    K('q_nosess', 'Not linked to a session', qs.filter(q => !q.sessionId).map(qr)); K('q_noans', 'Open with no answer yet', qs.filter(q => q.status !== 'closed' && !q.answer).map(qr));
    const dr = d => ({ ref: d.id, title: d.title || d.text || d.decision || '', detail: d.status || '', view: 'governance', go: {} });
    K('dec_total', 'Decisions logged', qd.filter(d => inP(d._created)).map(dr));
    const qBars = bars('qs', 'Questions', by(qs, q => q.status), ['open', 'answered', 'closed'], qr);

    // sessions and modules
    const sByS = by(ses, s => s.status || 'planned');
    K('ses_total', 'Workshop sessions', ses.map(sr)); K('ses_done', 'Sessions completed', ses.filter(s => s.status === 'completed').map(sr)); K('ses_open', 'Sessions still to run', ses.filter(s => !['completed', 'cancelled'].includes(s.status)).map(sr)); K('ses_nodate', 'Sessions without a date', ses.filter(s => !s.date).map(sr));
    const sesBars = bars('ss', 'Sessions', sByS, null, sr);
    const inScope = F.allModules().filter(m => m.inScope && (!f.module || m.name === f.module)); const mr = m => ({ ref: m.label || m.name, title: m.label || m.name, detail: 'Review status: ' + V.moduleStatus(m.name), view: 'modules', go: {} });
    const reviewed = m => ['completed', 'reviewed_no_change', 'reviewed_changes'].includes(V.moduleStatus(m.name));
    K('mod_scope', 'Modules in scope', inScope.map(mr)); K('mod_rev', 'Modules reviewed', inScope.filter(reviewed).map(mr)); K('mod_norev', 'Modules not yet reviewed', inScope.filter(m => !reviewed(m)).map(mr));
    K('mod_unassigned', 'Modules not assigned to a session', (V.uncoveredModules ? V.uncoveredModules() : []).filter(m => !f.module || (m.name || m) === f.module).map(m => ({ ref: m.label || m.name || m, title: m.label || m.name || String(m), detail: 'Not in any session', view: 'planner', go: {} })));
    const rd = V.brdReadiness ? V.brdReadiness() : { blocking: 0, warning: 0 };
    K('chk_block', 'BRD blocking checks', rd.blocking ? [{ ref: 'Checks', title: rd.blocking + ' blocking validation issue(s)', detail: 'Open Checks & Validations', view: 'checks', go: {} }] : [], rd.blocking);
    K('chk_warn', 'BRD warnings', rd.warning ? [{ ref: 'Checks', title: rd.warning + ' warning(s)', detail: 'Open Checks & Validations', view: 'checks', go: {} }] : []); kpis.chk_block.n = rd.blocking; kpis.chk_warn.n = rd.warning;
    // BRD and sign-off
    const bd = F.doc('brddoc'); const so = I().list('signoff'); const sor = x => ({ ref: x.id, title: x.title || x.kind || 'Sign-off', detail: x.status || '', view: 'governance', go: {} });
    K('so_total', 'Sign-offs', so.map(sor)); K('so_signed', 'Signed', so.filter(x => x.status === 'signed').map(sor)); K('so_wait', 'Waiting for signature', so.filter(x => x.status === 'requested').map(sor)); K('so_conc', 'Concern raised', so.filter(x => x.status === 'concern').map(sor));
    K('brd_in', 'Requirements in the BRD (confirmed)', ws.requirements.filter(r => r.status === 'Confirmed').map(rr)); K('brd_out', 'Requirements not yet in the BRD', ws.requirements.filter(r => r.status !== 'Confirmed' && r.status !== 'Rejected').map(rr));
    K('brd_exp', 'BRD exports', (bd.exports || []).map(e => ({ ref: e.name, title: e.name, detail: `${e.at ? e.at.slice(0, 16).replace('T', ' ') : ''} · ${e.by || ''} · ${e.status || ''}`, view: 'brd', go: {} })));

    // pivots
    const mods = F.allModules().filter(m => m.inScope || ws.requirements.some(r => (r.modules || []).includes(m.name))).filter(m => !f.module || m.name === f.module);
    const piv = mods.map(m => ({ m, cells: RSTAT.map(s => ({ s, id: `pv:${m.name}:${s}`, n: reg(`pv:${m.name}:${s}`, `${mlabel(m.name)} × ${s}`, rqs.filter(r => (r.modules || []).includes(m.name) && (r.status || 'Draft') === s).map(rr)) })) })).filter(p => p.cells.some(c => c.n));
    const pivUc = mods.map(m => ({ m, cells: ['Customer confirmed', 'Unconfirmed'].map(c => ({ s: c, id: `pu:${m.name}:${c}`, n: reg(`pu:${m.name}:${c}`, `${mlabel(m.name)} × use cases ${c}`, ucs.filter(x => (x.modules || []).includes(m.name) && (x.confirmation || 'Unconfirmed') === c).map(ur)) })) })).filter(p => p.cells.some(c => c.n));
    const pivQ = [['customer', 'Customer'], ['internal', 'Internal']].map(([o, l]) => ({ l, cells: ['open', 'answered', 'closed'].map(s => ({ s, id: `pq:${o}:${s}`, n: reg(`pq:${o}:${s}`, `${l} questions × ${s}`, qs.filter(q => (q.owner === 'internal' ? 'internal' : 'customer') === o && q.status === s).map(qr)) })) }));

    // timeline: only events that were recorded
    const ev = []; const add = (at, type, title, detail, view, go, mods2, sid, by) => { if (!at) return; if (f.pm && by !== f.pm) return; if (f.brd && type !== 'Requirement') return; if (f.module && mods2 && mods2.length && !mods2.includes(f.module)) return; if (f.session && sid && sid !== f.session) return; if (!inP(at)) return; ev.push({ at, type, title, detail: detail || '', view, go: go || {} }); };
    (ws.log || []).forEach(l => add(l.ts, 'Activity', l.action, `${l.detail || ''}${l.by ? ' — ' + l.by : ''}`, 'overview', {}, null, null, l.by));
    rqs.forEach(r => add(r.created, 'Requirement', r.id + ' created', r.title, 'transcripts', { trTab: 'register' }, r.modules, r.sessionId, creator(r)));
    ws.questions.forEach(q => add(q.created, 'Question', 'Question raised', q.text, 'transcripts', { trTab: 'questions' }, null, q.sessionId));
    ucs.forEach(x => { if (x.confAt) add(x.confAt, 'Use case', `UC-${x.no} customer-confirmed`, `${x.title} — ${x.confBy || ''}`, 'usecases', {}, x.modules); });
    sessions.forEach(s => { if (s.date && s.date <= V.today() && s.status === 'completed') add(s.date, 'Workshop', `Session ${s.no || ''} held`, s.title, 'planner', {}, s.modules, s.id); });
    (bd.exports || []).forEach(e => add(e.at, 'BRD', 'BRD exported', e.name, 'brd'));
    if (bd.reviewedAt) add(bd.reviewedAt, 'BRD', 'BRD status set to ' + (bd.status || ''), bd.reviewedBy || '', 'brd');
    ev.sort((a, b) => b.at.localeCompare(a.at)); ev.forEach((e, i) => { e.id = 'ev:' + i; reg(e.id, e.title, [{ ref: e.type, title: e.title, detail: `${e.at.slice(0, 16).replace('T', ' ')} · ${e.detail}`, view: e.view, go: e.go }]); });
    const tlTypes = by(ev, e => e.type); const tlBars = bars('tl', 'Timeline', tlTypes, null, e => ({ ref: e.type, title: e.title, detail: `${e.at.slice(0, 16).replace('T', ' ')} · ${e.detail}`, view: e.view, go: e.go }));
    return { f, kpis, drill, rqs, ucs, qs, ses, ev, piv, pivUc, pivQ, reqStatusBars, classBars, ucTypeBars, ucPriBars, qBars, sesBars, tlBars, rd, inScope, bd, so, mods: mods.length };
  }
  V.dashModel = model;

  // ---------- rendering ----------
  const kpi = (M, id, o) => { const k = M.kpis[id]; o = o || {}; return `<button class="card stat click dr-kpi${o.cls ? ' ' + o.cls : ''}" data-act="drDrill" data-id="k:${id}" data-kpi="${id}" title="Show the ${k.n} record(s) behind this number"><div class="v">${k.n}</div><div class="l">${esc(o.label || k.label)}</div></button>`; };
  const barBlock = (title, list) => { const mx = Math.max(1, ...list.map(b => b.n)); return `<div class="card"><div class="card-h"><h3>${esc(title)}</h3></div><div class="card-b">${list.filter(b => true).map(b => `<button class="dr-bar" data-act="drDrill" data-id="${esc(b.id)}" data-seg="${esc(b.id)}"><span class="dr-bl">${esc(b.label)}</span><span class="dr-bt"><i style="width:${Math.round(100 * b.n / mx)}%;background:${b.c}"></i></span><b>${b.n}</b></button>`).join('') || '<div class="muted small">Nothing recorded for the current filters.</div>'}</div></div>`; };
  const pivTable = (rows, head, lab) => `<div class="tbl-wrap"><table class="tbl dr-piv"><thead><tr><th></th>${head.map(h => `<th>${esc(h)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(lab(r))}</th>${r.cells.map(c => `<td>${c.n ? `<button class="linkbtn" data-act="drDrill" data-id="${esc(c.id)}" data-cell="${esc(c.id)}">${c.n}</button>` : '<span class="muted">·</span>'}</td>`).join('')}<td><b>${r.cells.reduce((a, c) => a + c.n, 0)}</b></td></tr>`).join('') || `<tr><td colspan="${head.length + 2}" class="empty">No data for the current filters.</td></tr>`}</tbody></table></div>`;
  const tlList = (M, n) => `<div class="card"><div class="card-h"><h3>Activity timeline</h3><span class="xs muted">${M.ev.length} recorded event(s)</span></div><div class="card-b dr-tl">${M.ev.slice(0, n).map(e => `<button class="dr-ev" data-act="drDrill" data-id="${e.id}" data-ev="${e.id}"><span class="xs muted">${esc(e.at.slice(0, 16).replace('T', ' '))}</span> ${tag('blue', e.type)} <b>${esc(e.title)}</b> <span class="muted small">${esc((e.detail || '').slice(0, 90))}</span></button>`).join('') || '<div class="muted small">No recorded events in this period.</div>'}</div></div>`;
  function tabBody(t, M) {
    const g = (n, ...c) => `<div class="grid g${n}" style="margin-bottom:14px">${c.join('')}</div>`;
    if (t === 'overview') return g(4, kpi(M, 'req_total'), kpi(M, 'req_Confirmed'), kpi(M, 'uc_total'), kpi(M, 'uc_conf')) + g(4, kpi(M, 'q_open'), kpi(M, 'ses_done'), kpi(M, 'mod_rev'), kpi(M, 'chk_block', { cls: M.kpis.chk_block.n ? 'bad' : '' })) + g(2, barBlock('Requirements by status', M.reqStatusBars), barBlock('Questions by status', M.qBars)) + tlList(M, 8);
    if (t === 'workshops') return g(4, kpi(M, 'ses_total'), kpi(M, 'ses_done'), kpi(M, 'ses_open'), kpi(M, 'ses_nodate')) + g(4, kpi(M, 'mod_scope'), kpi(M, 'mod_unassigned')) + g(2, barBlock('Sessions by status', M.sesBars), barBlock('Timeline events by type', M.tlBars)) + tlList(M, 40);
    if (t === 'reqs') return g(4, kpi(M, 'req_total'), kpi(M, 'req_Draft'), kpi(M, 'req_Confirmed'), kpi(M, 'req_Deferred')) + g(4, kpi(M, 'uc_total'), kpi(M, 'uc_conf'), kpi(M, 'uc_unconf'), kpi(M, 'uc_verified')) + g(2, barBlock('Requirements by category', M.classBars), barBlock('Use cases by solution type', M.ucTypeBars)) + g(2, barBlock('Requirements by status', M.reqStatusBars), barBlock('Use cases by priority', M.ucPriBars));
    if (t === 'questions') return g(5, ...['q_total', 'q_open', 'q_answered', 'q_closed', 'q_cust'].map(i => kpi(M, i))) + g(5, ...['q_int', 'q_unver', 'q_req', 'q_nosess', 'q_noans'].map(i => kpi(M, i))) + g(2, barBlock('Questions by status', M.qBars), `<div class="card"><div class="card-h"><h3>Decisions</h3></div><div class="card-b">${kpi(M, 'dec_total')}</div></div>`);
    if (t === 'config') { let glr = null; try { glr = V.goLiveReadiness ? V.goLiveReadiness() : null; } catch (e) { } return g(4, kpi(M, 'mod_scope'), kpi(M, 'mod_rev'), kpi(M, 'mod_norev'), kpi(M, 'mod_unassigned')) + g(2, kpi(M, 'chk_block', { cls: M.kpis.chk_block.n ? 'bad' : '' }), kpi(M, 'chk_warn')) + `<div class="card"><div class="card-h"><h3>Go-live readiness</h3><button class="btn sm" data-act="nav" data-view="delivery">Open</button></div><div class="card-b small">${glr ? `<b>${esc(glr.verdict)}</b> · checklist ${glr.pct}% complete${glr.blockers.length ? '<ul>' + glr.blockers.map(b => `<li>${esc(b)}</li>`).join('') + '</ul>' : ''}` : 'Not available.'}</div></div>`; }
    if (t === 'brd') return g(3, `<div class="card stat"><div class="v">${esc(({ draft: 'Draft', review: 'In review', approved: 'Approved' })[M.bd.status || 'draft'])}</div><div class="l">BRD status${M.bd.reviewedBy ? ' · set by ' + esc(M.bd.reviewedBy) : ''}</div></div>`, kpi(M, 'brd_in'), kpi(M, 'brd_out')) + g(4, kpi(M, 'so_total'), kpi(M, 'so_signed'), kpi(M, 'so_wait'), kpi(M, 'so_conc')) + g(3, kpi(M, 'brd_exp'), kpi(M, 'chk_block'), kpi(M, 'chk_warn'));
    if (t === 'pivots') return `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Module × Requirement status</h3></div>${pivTable(M.piv, RSTAT, r => V.modLabel(r.m.name))}</div><div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Module × Use-case confirmation</h3></div>${pivTable(M.pivUc, ['Customer confirmed', 'Unconfirmed'], r => V.modLabel(r.m.name))}</div><div class="card"><div class="card-h"><h3>Question owner × status</h3></div>${pivTable(M.pivQ, ['open', 'answered', 'closed'], r => r.l)}</div>`;
    return existing();
  }
  // Audit of the reports that existed before this hub. Nothing is removed: each stays where it is and is linked here.
  const AUDIT = [
    ['Project Overview', 'overview', 'Counts of modules, sessions, requirements; upcoming sessions; recent activity', 'Kept — the hub reuses the same sources and adds drill-down', 'Overview tab'],
    ['Plan Timeline', 'timeline', 'Project-plan stats (done / late), next 45 days, needs-attention list', 'Kept — plan dates remain the source; the hub timeline shows recorded activity only', 'Workshops & Timeline'],
    ['Checks & Validations', 'checks', 'BRD readiness: blocking, warnings, scope coverage, change summary', 'Kept — hub shows the counts and links in', 'Configuration & Readiness'],
    ['Governance & RAID', 'governance', 'Actions, decisions, RAID, sign-offs, cadence', 'Kept — hub shows sign-off and decision counts', 'BRD & Sign-Off'],
    ['Build, UAT & Go-Live', 'delivery', 'Build status, UAT, go-live checklist and readiness verdict', 'Kept — verdict shown in the hub', 'Configuration & Readiness'],
    ['Contract → Requirement Session Planner', 'planner', 'Session list, module coverage, MSA coverage', 'Kept — session counts shown in the hub', 'Workshops & Timeline'],
    ['Transcripts & Requirement Confirmation', 'transcripts', 'Review queue, requirements register, open questions', 'Kept — question and requirement KPIs drill into it', 'Requirements & Use Cases / Questions & Decisions'],
    ['Use Cases', 'usecases', 'Use-case register, discrepancy register, traceability', 'Kept — use-case KPIs drill into it', 'Requirements & Use Cases'],
    ['Dashboard Gallery', 'dashboards', 'Customer-facing gallery of Facilio dashboards (not project metrics)', 'Kept — different purpose, linked only', 'Existing Reports'],
    ['Project Settings & Exports', 'settings', 'Project JSON/Excel export of the whole workspace', 'Kept — the hub adds report-style exports of the numbers on screen', 'Existing Reports']
  ];
  function existing() {
    return `<div class="card"><div class="card-h"><h3>Existing reports and where they went</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Report</th><th>What it showed</th><th>Decision</th><th>Shown in the hub</th><th></th></tr></thead><tbody>${AUDIT.filter(a => V[a[1]]).map(a => `<tr><td><b>${esc(a[0])}</b></td><td class="small">${esc(a[2])}</td><td class="small">${esc(a[3])}</td><td class="small">${esc(a[4])}</td><td><button class="btn sm" data-act="nav" data-view="${a[1]}" data-ex="${a[1]}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  // ---------- customer logo (shared with the BRD) ----------
  const logoCache = {};
  function logoUrl() { const l = (F.doc('brddoc').logos || {}).customer; if (!l || !l.fileId) return null; const c = logoCache[l.fileId]; if (c && c !== 'loading') return c; if (!c) { logoCache[l.fileId] = 'loading'; V.fileBlob(l.fileId).then(b => { logoCache[l.fileId] = URL.createObjectURL(b); V.render(); }).catch(() => { delete logoCache[l.fileId]; }); } return null; }
  ACT.drLogoUp = async () => { if (!V.requireEdit()) return; const f = (await V.pickFile('.png,.jpg,.jpeg'))[0]; if (!f) return; if (!/\.(png|jpe?g)$/i.test(f.name)) { toast('Use a PNG or JPG image'); return; } if (f.size > 3 * 1048576) { toast('The logo is larger than 3 MB'); return; }
    loading(true, 'Uploading logo…'); try { const d = F.doc('brddoc'); d.logos = d.logos || {}; const rec = await API.uploadFile(S.project.id, f, 'logo_customer', {}, d.logos.customer ? d.logos.customer.fileId : null); d.logos.customer = { fileId: rec.id, name: f.name }; F.changed('Customer logo uploaded', f.name, { section: 'brddoc' }); } catch (e) { toast(e.message || 'Upload failed', 5000, true); } finally { loading(false); } V.render(); };
  ACT.drLogoDel = async () => { if (!V.requireEdit()) return; if (!(await confirmDialog('Remove customer logo', 'The logo will also be removed from the BRD cover and from exports. Remove it?', 'Remove', true))) return; const d = F.doc('brddoc'); if (d.logos) delete d.logos.customer; F.changed('Customer logo removed', '', { section: 'brddoc' }); V.render(); };

  // ---------- page ----------
  const opt = (arr, all) => [{ v: '', l: all }].concat(arr.map(x => (typeof x === 'object' ? x : { v: x, l: x })));
  V.dashreport = { html() {
    I().load(['usecase', 'decision', 'signoff', 'action', 'raid']); const u = U(); const M = model(); const f = u.f; const p = S.project; const lu = logoUrl();
    const sessions = (F.doc('planner').sessions || []).map(s => ({ v: s.id, l: `Session ${s.no || ''} — ${s.title || ''}` })); const mods = F.allModules().filter(m => m.inScope).sort((a, b) => a.label.localeCompare(b.label)).map(m => ({ v: m.name, l: m.label }));
    const fs = (k, label, list, all) => `<div><label class="f">${label}</label>${V.sel('', opt(list, all), f[k] || '', `data-change="drF" data-k="${k}" id="drf_${k}" style="height:30px"`)}</div>`;
    const pms = [...new Set((F.doc('people').team || []).filter(x => x.name && /project manager|programme manager|program manager|\bpm\b|delivery manager|engagement manager/i.test(x.role || '')).map(x => x.name).concat((S.ws.project && S.ws.project.pm) || []).filter(Boolean))];
    const stages = V.planSteps ? V.planSteps().filter(x => x.start).map(x => ({ v: String(x.i), l: `${x.title} (${V.fmtDate(x.start)} – ${V.fmtDate(x.end)})` })) : [];
    const gated = (k, label, list, all, why) => list.length ? fs(k, label, list, all) : `<div><label class="f">${label}</label><select disabled style="height:30px" title="${esc(why)}"><option>${esc(why)}</option></select></div>`;
    const active = Object.keys(f).filter(k => f[k] && !(k === 'period' && f[k] === 'all')).length;
    return `<div class="page-header"><div class="t"><h1>Dashboard Report</h1><p>${esc(p.name)} · ${esc(p.customer)} — every number opens the records behind it.</p></div>
      <div class="dr-logo" id="drLogo">${lu ? `<img src="${lu}" alt="Customer logo">` : '<span class="xs muted">No customer logo</span>'}<div class="row" style="margin-top:6px;justify-content:flex-end">${S.readonly ? '' : `<button class="btn sm" data-act="drLogoUp" id="drLogoUp">${lu ? 'Replace' : 'Upload logo'}</button>${lu ? '<button class="btn sm danger" data-act="drLogoDel" id="drLogoDel">Remove</button>' : ''}`}</div></div></div>
      <div class="page-body"><div class="card" style="margin-bottom:12px"><div class="card-b dr-head"><div><label class="f">Reporting period</label>${V.sel('', PERIODS.map(x => ({ v: x[0], l: x[1] })), f.period, 'data-change="drF" data-k="period" id="drf_period" style="height:30px"')}</div>${f.period === 'custom' ? `<div><label class="f">From</label><input type="date" id="drf_from" data-change="drF" data-k="from" value="${esc(f.from || '')}" style="height:30px"></div><div><label class="f">To</label><input type="date" id="drf_to" data-change="drF" data-k="to" value="${esc(f.to || '')}" style="height:30px"></div>` : ''}
        <div class="xs muted" id="drRefreshed" style="align-self:end">Last refreshed ${esc(u.at.toLocaleTimeString())}</div><span class="spacer"></span><button class="btn" data-act="drRefresh" id="drRefresh" style="align-self:end">Refresh</button>
        <button class="btn" data-act="drExport" data-fmt="csv" id="drCsv" style="align-self:end">CSV</button><button class="btn" data-act="drExport" data-fmt="png" id="drPng" style="align-self:end">PNG</button><button class="btn" data-act="drExport" data-fmt="xlsx" id="drXlsx" style="align-self:end">Excel</button><button class="btn primary" data-act="drExport" data-fmt="pdf" id="drPdf" style="align-self:end">Export PDF</button></div>
        <div class="card-b dr-filters">${fs('module', 'Module', mods, 'All modules')}${fs('session', 'Session', sessions, 'All sessions')}${fs('reqClass', 'Requirement category', Object.entries(F.REQ_CLASS).map(([v, l]) => ({ v, l })), 'All categories')}${fs('reqStatus', 'Requirement status', RSTAT, 'All statuses')}${fs('conf', 'Use-case confirmation', ['Unconfirmed', 'Customer confirmed'], 'All')}${fs('ucType', 'Use-case type', ['Existing standard functionality', 'Configuration', 'Customisation or development assessment', 'Integration assessment', 'Product capability confirmation required', 'Further investigation required', 'Not supported or not feasible (verified)', 'Out of scope', 'Pending decision'], 'All types')}${fs('priority', 'Priority', ['High', 'Medium', 'Low'], 'All')}${fs('qStatus', 'Question status', [{ v: 'open', l: 'Open' }, { v: 'answered', l: 'Answered' }, { v: 'closed', l: 'Closed' }], 'All')}${gated('pm', 'Project manager', pms, 'All', 'No project manager recorded')}${gated('stage', 'Project stage', stages, 'All stages', 'No dated project plan')}${fs('brd', 'BRD status (requirements)', ['Included', 'Awaiting confirmation', 'Excluded'], 'All')}<div style="align-self:end"><button class="btn" data-act="drClear" id="drClear" ${active ? '' : 'disabled'}>Clear all${active ? ` (${active})` : ''}</button></div></div>
        <div class="card-b xs muted" style="padding-top:0">Filters apply to the records that carry that field (requirement status → requirements; use-case type → use cases; question status → questions). Project manager matches who created the record, so it narrows requirements and activity only (questions, use cases and sessions do not record a creator and show 0 while it is set; BRD status behaves the same way). Project stage uses the dates of that step in the project plan. BRD status (Included = Confirmed, Awaiting = Draft or Deferred, Excluded = Rejected) narrows requirements and requirement activity. The BRD document itself is currently <b>${esc(({ draft: 'Draft', review: 'In review', approved: 'Approved' })[M.bd.status || 'draft'])}</b>. The period applies to the date a record was created, or a session's date.</div></div>
      ${S.readonly || V.isCustomer() ? '' : `<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap"><button class="btn sm ai-btn" data-act="drAi" title="DeepSeek writes a short summary of the figures on screen. A draft only.">✦ Summarise with DeepSeek</button><button class="btn sm" data-act="drClaude" title="Use your own Claude">Open in Claude</button><button class="btn sm" data-act="drClaude" data-add="1" title="Bring back a reply you already have from Claude">Add from Claude</button><span class="xs muted">Sends only the period, the filters and the counts on screen.</span></div>`}
      <div class="tabs" id="drTabs">${TABS.map(([k, l]) => `<button class="tab${u.tab === k ? ' active' : ''}" data-act="drTab" data-v="${k}">${esc(l)}</button>`).join('')}</div><div style="margin-top:14px" id="drBody">${tabBody(u.tab, M)}</div></div>`;
  } };
  // AI summary of the figures on screen: only the period, the filters and the counts are sent; the result opens as an editable draft to copy, nothing is saved or sent
  const drIns = () => { const M = model(), f = U().f; const per = (PERIODS.find(x => x[0] === f.period) || [0, 'All time'])[1] + (f.period === 'custom' ? ' (' + (f.from || '?') + ' to ' + (f.to || '?') + ')' : ''); const on = Object.keys(f).filter(k => f[k] && k !== 'period' && k !== 'from' && k !== 'to').map(k => k + '=' + f[k]).join(', ');
    return ('Reporting period: ' + per + '. Filters: ' + (on || 'none') + '. Figures: ' + Object.values(M.kpis).map(k => k.label + ' ' + k.n).join('; ')).slice(0, 1480); };
  const drShow = t => V.drawer('Dashboard summary (draft)', '<div class="notice" style="margin-bottom:8px">AI draft. Check it against the figures before you use it. Nothing is saved or sent.</div><textarea id="dr_sum" rows="14" style="width:100%">' + esc(t) + '</textarea>', '<span class="spacer"></span><button class="btn" data-act="drSumCopy">Copy</button><button class="btn primary" data-act="closeDrawer">Close</button>', { wide: true });
  ACT.drSumCopy = async () => { try { await navigator.clipboard.writeText((document.getElementById('dr_sum') || {}).value || ''); V.toast('Copied'); } catch (e) { V.toast('Copy is blocked by the browser: select the text and copy it'); } };
  ACT.drAi = a => V.busy(a, async () => { try { await V.reportAi({ task: 'dashsummary', label: 'Dashboard summary', instruction: drIns(), onText: drShow }); } catch (e) { V.toast(e.message || 'The AI could not complete this', 6000, true); } });
  ACT.drClaude = a => V.busy(a, async () => { await V.reportClaude({ task: 'dashsummary', label: 'Dashboard summary', instruction: drIns(), skipPack: a.getAttribute('data-add') === '1', onText: drShow }); });
  ACT.drTab = a => { U().tab = a.getAttribute('data-v'); V.render(); };
  ACT.drF = el => { const f = U().f; const k = el.getAttribute('data-k'); f[k] = el.value; if (k === 'period' && el.value !== 'custom') { delete f.from; delete f.to; } V.render(); };
  ACT.drClear = () => { U().f = { period: 'all' }; V.render(); };
  ACT.drRefresh = async () => { I().reset(); await I().load(['usecase', 'decision', 'signoff', 'action', 'raid'], true); U().at = new Date(); V.render(); };
  ACT.drDrill = a => { const M = model(); const d = M.drill[a.getAttribute('data-id')]; if (!d) { toast('Nothing to show'); return; } window.__drRows = d.rows;
    V.drawer(d.title + ` — ${d.rows.length}`, `<div class="tbl-wrap"><table class="tbl" id="drDrillTbl"><thead><tr><th>Ref</th><th>Record</th><th>Detail</th><th></th></tr></thead><tbody>${d.rows.map((r, i) => `<tr><td class="mono xs">${esc(r.ref)}</td><td class="small">${esc(r.title)}</td><td class="xs muted">${esc(r.detail)}</td><td><button class="btn sm" data-act="drOpen" data-i="${i}">Open</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No records.</td></tr>'}</tbody></table></div>`, '<button class="btn" data-act="closeDrawer">Close</button>', { wide: true }); };
  ACT.drOpen = a => { const r = (window.__drRows || [])[+a.getAttribute('data-i')]; if (!r) return; V.closeDrawer(); V.go(r.view, r.go); };

  // ---------- exports (built from the same model) ----------
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function sheets() {
    const M = model(); const f = M.f; const K = M.kpis; const kr = Object.values(K).map(k => [k.label, k.n]);
    const fl = [['Reporting period', periodLabel(f)]].concat(Object.entries(f).filter(([k, v]) => v && k !== 'period' && k !== 'from' && k !== 'to').map(([k, v]) => [({ module: 'Module', session: 'Session', reqClass: 'Category', reqStatus: 'Requirement status', conf: 'Use-case confirmation', ucType: 'Use-case type', priority: 'Priority', qStatus: 'Question status', pm: 'Project manager', stage: 'Stage', brd: 'BRD status' })[k] || k, k === 'module' ? V.modLabel(v) : k === 'reqClass' ? F.REQ_CLASS[v] || v : k === 'stage' && V.planSteps ? ((V.planSteps().find(x => String(x.i) === String(v)) || {}).title || v) : k === 'session' ? ((F.doc('planner').sessions || []).find(x => x.id === v) ? 'Session ' + (F.doc('planner').sessions.find(x => x.id === v).no || '') : v) : v]));
    return { M, fl, list: [
      ['Summary', ['Measure', 'Count'], kr],
      ['Requirements', ['ID', 'Title', 'Category', 'Status', 'Modules'], M.rqs.map(r => [r.id, r.title || '', F.REQ_CLASS[r.classification] || '', r.status || 'Draft', (r.modules || []).map(V.modLabel).join(', ')])],
      ['Use cases', ['No.', 'Title', 'Solution', 'Priority', 'Confirmation', 'Implementation'], M.ucs.map(x => ['UC-' + x.no, x.title || '', x.solution || '', x.priority || '', x.confirmation || 'Unconfirmed', x.impl || ''])],
      ['Questions', ['Question', 'Area', 'Owner', 'Status', 'Verification'], M.qs.map(q => [q.text || '', q.area || '', q.owner === 'internal' ? 'Internal' : 'Customer', q.status, q.answer ? (q.ver || 'Unverified') : ''])],
      ['Sessions', ['No.', 'Title', 'Date', 'Status'], M.ses.map(s => [s.no || '', s.title || '', s.date || '', s.status || 'planned'])],
      ['Pivot', ['Module'].concat(RSTAT).concat(['Total']), M.piv.map(r => [V.modLabel(r.m.name)].concat(r.cells.map(c => c.n)).concat([r.cells.reduce((a, c) => a + c.n, 0)]))],
      ['Timeline', ['When', 'Type', 'Event', 'Detail'], M.ev.map(e => [e.at.slice(0, 16).replace('T', ' '), e.type, e.title, e.detail])]
    ] };
  }

  // ---------- PNG: the current tab drawn on a canvas from the same model (labels, numbers and the active filters are all in the image) ----------
  function spec(t, M) {
    const K = ids => ids.map(i => M.kpis[i]);
    return { overview: { k: K(['req_total', 'req_Confirmed', 'uc_total', 'uc_conf', 'q_open', 'ses_done', 'mod_rev', 'chk_block']), b: [['Requirements by status', M.reqStatusBars], ['Questions by status', M.qBars]] },
      workshops: { k: K(['ses_total', 'ses_done', 'ses_open', 'ses_nodate', 'mod_scope', 'mod_unassigned']), b: [['Sessions by status', M.sesBars], ['Timeline events by type', M.tlBars]] },
      reqs: { k: K(['req_total', 'req_Draft', 'req_Confirmed', 'req_Deferred', 'uc_total', 'uc_conf', 'uc_unconf', 'uc_verified']), b: [['Requirements by category', M.classBars], ['Use cases by solution type', M.ucTypeBars], ['Requirements by status', M.reqStatusBars], ['Use cases by priority', M.ucPriBars]] },
      questions: { k: K(['q_total', 'q_open', 'q_answered', 'q_closed', 'q_cust', 'q_int', 'q_unver', 'q_req', 'q_nosess', 'q_noans', 'dec_total']), b: [['Questions by status', M.qBars]] },
      config: { k: K(['mod_scope', 'mod_rev', 'mod_norev', 'mod_unassigned', 'chk_block', 'chk_warn']), b: [] },
      brd: { k: K(['brd_in', 'brd_out', 'so_total', 'so_signed', 'so_wait', 'so_conc', 'brd_exp', 'chk_block', 'chk_warn']), b: [] },
      pivots: { k: [], b: [], p: [['Module × Requirement status', M.piv, RSTAT, r => V.modLabel(r.m.name)], ['Module × Use-case confirmation', M.pivUc, ['Customer confirmed', 'Unconfirmed'], r => V.modLabel(r.m.name)], ['Question owner × status', M.pivQ, ['open', 'answered', 'closed'], r => r.l]] },
      existing: { k: [], b: [] } }[t] || { k: [], b: [] };
  }
  async function drawPng(M, tab, fl, logoImg) {
    const W = 1400, PAD = 40, SC = 2; const sp = spec(tab, M); const col = n => css(n) || '#000';
    const render = (ctx, dry) => {
      let y = PAD; const font = (sz, w) => { ctx.font = `${w || 400} ${sz}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; };
      const fit = (t, w) => { t = String(t); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; };
      const wrap = (t, w) => { const out = []; let line = ''; String(t).split(/\s+/).forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (ctx.measureText(tt).width > w && line) { out.push(line); line = wd; } else line = tt; }); if (line) out.push(line); return out; };
      if (!dry) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 4000); }
      ctx.textBaseline = 'top'; font(26, 700); ctx.fillStyle = col('--fc-primary'); if (!dry) ctx.fillText('Dashboard Report — ' + (TABS.find(x => x[0] === tab) || [])[1], PAD, y); y += 36;
      font(14, 400); ctx.fillStyle = col('--fc-text'); if (!dry) ctx.fillText(fit(`${S.project.name} · ${S.project.customer}`, W - 2 * PAD - 220), PAD, y); y += 22;
      font(12, 400); ctx.fillStyle = col('--fc-caption'); wrap(fl.map(r => r.join(': ')).join('  ·  ') + '  ·  Generated ' + new Date().toLocaleString(), W - 2 * PAD - 220).forEach(l => { if (!dry) ctx.fillText(l, PAD, y); y += 17; });
      if (logoImg && !dry) { const r = Math.min(180 / logoImg.width, 60 / logoImg.height); ctx.drawImage(logoImg, W - PAD - logoImg.width * r, PAD, logoImg.width * r, logoImg.height * r); }
      y += 14; const cw = (W - 2 * PAD - 3 * 16) / 4;
      sp.k.forEach((k, i) => { const x = PAD + (i % 4) * (cw + 16), yy = y + Math.floor(i / 4) * 92; if (!dry) { ctx.fillStyle = col('--fc-head-bg'); ctx.fillRect(x, yy, cw, 80); ctx.strokeStyle = col('--fc-border-2'); ctx.strokeRect(x + .5, yy + .5, cw - 1, 80); font(30, 700); ctx.fillStyle = col('--fc-primary'); ctx.fillText(String(k.n), x + 16, yy + 12); font(13, 400); ctx.fillStyle = col('--fc-text'); ctx.fillText(fit(k.label, cw - 32), x + 16, yy + 52); } });
      if (sp.k.length) y += Math.ceil(sp.k.length / 4) * 92 + 8;
      const colors = ['--fc-primary', '--fc-success', '--fc-warning', '--fc-danger', '--fc-violet', '--sf-cond', '--fc-pink', '--fc-muted'];
      for (let bi = 0; bi < sp.b.length; bi += 2) { let rowH = 0; sp.b.slice(bi, bi + 2).forEach(([title, list], j) => { const x = PAD + j * ((W - 2 * PAD) / 2 + 8), bw = (W - 2 * PAD) / 2 - 8; let yy = y; font(15, 700); ctx.fillStyle = col('--fc-text-strong'); if (!dry) ctx.fillText(title, x, yy); yy += 28; const mx = Math.max(1, ...list.map(b => b.n));
          list.forEach((b, i) => { font(13, 400); if (!dry) { ctx.fillStyle = col('--fc-text'); ctx.fillText(fit(b.label, 210), x, yy); ctx.fillStyle = col('--fc-head-bg'); ctx.fillRect(x + 220, yy + 2, bw - 290, 14); ctx.fillStyle = col(colors[i % colors.length]); ctx.fillRect(x + 220, yy + 2, Math.max(b.n ? 3 : 0, (bw - 290) * b.n / mx), 14); font(13, 700); ctx.fillStyle = col('--fc-text'); ctx.fillText(String(b.n), x + bw - 56, yy); } yy += 24; });
          if (!list.length) { font(13, 400); ctx.fillStyle = col('--fc-muted'); if (!dry) ctx.fillText('Nothing recorded for the current filters.', x, yy); yy += 24; } rowH = Math.max(rowH, yy - y + 12); }); y += rowH; }
      (sp.p || []).forEach(([title, rows, head, lab]) => { font(15, 700); ctx.fillStyle = col('--fc-text-strong'); if (!dry) ctx.fillText(title, PAD, y); y += 28; const c0 = 300, cc = Math.min(150, (W - 2 * PAD - c0) / (head.length + 1));
        if (!dry) { ctx.fillStyle = col('--fc-primary'); ctx.fillRect(PAD, y, c0 + cc * (head.length + 1), 26); font(12, 700); ctx.fillStyle = '#ffffff'; ctx.fillText('', PAD + 8, y + 6); head.concat(['Total']).forEach((h, i) => ctx.fillText(fit(h, cc - 12), PAD + c0 + i * cc + 8, y + 6)); } y += 26;
        rows.forEach((r, ri) => { if (!dry) { if (ri % 2) { ctx.fillStyle = col('--fc-head-bg'); ctx.fillRect(PAD, y, c0 + cc * (head.length + 1), 24); } font(12, 400); ctx.fillStyle = col('--fc-text'); ctx.fillText(fit(lab(r), c0 - 16), PAD + 8, y + 5); r.cells.concat([{ n: r.cells.reduce((a, c) => a + c.n, 0) }]).forEach((c, i) => ctx.fillText(String(c.n), PAD + c0 + i * cc + 8, y + 5)); } y += 24; });
        if (!rows.length) { font(12, 400); ctx.fillStyle = col('--fc-muted'); if (!dry) ctx.fillText('No data for the current filters.', PAD, y + 4); y += 24; } y += 18; });
      return y + PAD;
    };
    const probe = document.createElement('canvas').getContext('2d'); const H = Math.ceil(render(probe, true));
    const cv = document.createElement('canvas'); cv.width = W * SC; cv.height = H * SC; const ctx = cv.getContext('2d'); ctx.scale(SC, SC); render(ctx, false);
    return await new Promise(res => cv.toBlob(res, 'image/png'));
  }
  const fname = ext => `${F.slug(S.project.name || 'project')}-dashboard-report-${V.today()}.${ext}`;
  const csvCell = v => { const s = String(v == null ? '' : root.FWB.csvText(v)); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const hexToArgb = h => 'FF' + h.replace('#', '').toUpperCase();
  const toDataUrl = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
  ACT.drExport = a => V.busy(a, async () => {
    const fmt = a.getAttribute('data-fmt'); const { M, fl, list } = sheets(); const prim = css('--fc-primary') || '#0a7aff'; const head = css('--fc-head-bg') || '#f7f9fc'; const txt = css('--fc-text') || '#324056';
    if (fmt === 'png') { loading(true, 'Drawing the image…'); try { const lu = (F.doc('brddoc').logos || {}).customer; let img = null; if (lu && lu.fileId) { try { const u = URL.createObjectURL(await V.fileBlob(lu.fileId)); img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }); } catch (e) { } } V.download(fname('png').replace('.png', '-' + U().tab + '.png'), await drawPng(M, U().tab, fl, img), 'image/png'); } finally { loading(false); } return; }
    if (fmt === 'csv') { const out = [`Dashboard Report — ${S.project.name} (${S.project.customer})`, ...fl.map(r => r.map(csvCell).join(','))]; list.forEach(([n, cols, rows]) => { out.push('', n, cols.map(csvCell).join(',')); rows.forEach(r => out.push(r.map(csvCell).join(','))); }); V.download(fname('csv'), '﻿' + out.join('\r\n'), 'text/csv;charset=utf-8'); return; }
    loading(true, 'Building the report…');
    try {
      if (fmt === 'xlsx') {
        const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); wb.creator = 'Facilio'; const lu = (F.doc('brddoc').logos || {}).customer; let img = null; if (lu && lu.fileId) { try { const im = await V.docImage(await V.fileBlob(lu.fileId)); img = { buf: im.u8.buffer.slice(im.u8.byteOffset, im.u8.byteOffset + im.u8.byteLength), ext: im.ext }; } catch (e) { } }
        list.forEach(([n, cols, rows], si) => { const ws = wb.addWorksheet(V.sheetName(wb, n)); const top = si === 0 ? 4 + fl.length : 1; if (si === 0) { ws.getCell('A1').value = 'Dashboard Report — ' + S.project.name; ws.getCell('A1').font = { bold: true, size: 14, color: { argb: hexToArgb(prim) } }; ws.getCell('A2').value = S.project.customer; fl.forEach((r, i) => { ws.getCell(3 + i, 1).value = r[0]; ws.getCell(3 + i, 2).value = r[1]; }); if (img) { const id = wb.addImage({ buffer: img.buf, extension: img.ext }); ws.addImage(id, { tl: { col: 3, row: 0 }, ext: { width: 120, height: 40 } }); } }
          const hr = ws.getRow(top); cols.forEach((c, i) => { const cell = hr.getCell(i + 1); cell.value = c; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(prim) } }; });
          rows.forEach((r, ri) => { const row = ws.getRow(top + 1 + ri); r.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.font = { color: { argb: hexToArgb(txt) } }; if (ri % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(head) } }; }); });
          cols.forEach((c, i) => { ws.getColumn(i + 1).width = i === 0 && si === 0 ? 38 : Math.min(60, Math.max(12, ...rows.map(r => String(r[i] == null ? '' : r[i]).length), c.length) + 2); }); });
        const buf = await wb.xlsx.writeBuffer(); V.download(fname('xlsx'), new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); return;
      }
      const pm = await V.loadPdfMake(); const lu = (F.doc('brddoc').logos || {}).customer; let logo = null; if (lu && lu.fileId) { try { logo = await toDataUrl(await V.fileBlob(lu.fileId)); } catch (e) { } }
      const tbl = (cols, rows, w) => ({ table: { headerRows: 1, widths: w || cols.map(() => '*'), body: [cols.map(c => ({ text: c, bold: true, color: '#ffffff', fillColor: prim, fontSize: 9 }))].concat(rows.length ? rows.map(r => r.map(v => ({ text: String(v == null ? '' : v), fontSize: 8.5, color: txt }))) : [[{ text: 'No records', colSpan: cols.length, italics: true, fontSize: 8.5 }].concat(cols.slice(1).map(() => ({})))]) }, layout: { hLineColor: () => css('--fc-border') || '#ebeff3', vLineColor: () => css('--fc-border') || '#ebeff3', fillColor: (i) => (i > 0 && i % 2 === 0 ? head : null) }, margin: [0, 0, 0, 10] });
      const secs = {}; list.forEach(([n, c, r]) => { secs[n] = [c, r]; }); const kp = M.kpis; const kcard = ids => ({ columns: ids.map(i => ({ stack: [{ text: String(kp[i].n), fontSize: 18, bold: true, color: prim }, { text: kp[i].label, fontSize: 8, color: txt }], margin: [0, 0, 6, 8] })) });
      const dd = { pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [32, 40, 32, 36], defaultStyle: { color: txt, fontSize: 9 }, footer: (p, n) => ({ text: `${S.project.name} · Dashboard Report · page ${p} of ${n}`, alignment: 'center', fontSize: 8, color: css('--fc-muted') || '#8ca1ad' }),
        content: [{ columns: [{ stack: [{ text: 'Dashboard Report', fontSize: 20, bold: true, color: prim }, { text: `${S.project.name} · ${S.project.customer}`, fontSize: 11, margin: [0, 2, 0, 2] }, { text: fl.map(r => r.join(': ')).join('  ·  ') + `  ·  Generated ${new Date().toLocaleString()}`, fontSize: 8.5, color: css('--fc-muted') || '#8ca1ad' }] }].concat(logo ? [{ image: logo, fit: [130, 50], alignment: 'right', width: 140 }] : []), margin: [0, 0, 0, 12] },
          { text: 'Key figures', fontSize: 12, bold: true, margin: [0, 4, 0, 6] }, kcard(['req_total', 'req_Confirmed', 'uc_total', 'uc_conf', 'q_open', 'ses_done']), kcard(['mod_scope', 'mod_rev', 'chk_block', 'so_signed', 'q_total', 'q_closed']),
          { text: 'Summary of measures', fontSize: 12, bold: true, margin: [0, 6, 0, 6] }, tbl(secs.Summary[0], secs.Summary[1], ['*', 60]),
          { text: 'Module × Requirement status', fontSize: 12, bold: true, pageBreak: 'before', margin: [0, 0, 0, 6] }, tbl(secs.Pivot[0], secs.Pivot[1]),
          { text: 'Questions', fontSize: 12, bold: true, margin: [0, 6, 0, 6] }, tbl(secs.Questions[0], secs.Questions[1].slice(0, 60), ['*', 90, 55, 55, 70]),
          { text: 'Activity timeline (recorded events)', fontSize: 12, bold: true, pageBreak: 'before', margin: [0, 0, 0, 6] }, tbl(secs.Timeline[0], secs.Timeline[1].slice(0, 80), [85, 60, 170, '*'])] };
      const blob = await new Promise((res, rej) => { try { pm.createPdf(dd).getBlob(res); } catch (e) { rej(e); } }); V.download(fname('pdf'), blob, 'application/pdf');
    } finally { loading(false); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
