/* PMO overview: the first tab of Governance & RAID. One page for a PMO who oversees delivery but does not implement it:
   overall status (computed, with the reasons), the 12-step lifecycle, what is done, what is pending, the RAID heat map, the sign-offs
   and what needs a decision. Everything is computed from saved records. Sharing opens Outlook (nothing is sent), downloads a report
   file or copies the text. Also here: the sign-off request email to the client. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  if (!V || !V.sd) return;
  const { kpi, widget, table, chipT, grid, none, lifecycle } = V.sd;
  const { drawer, closeDrawer, toast } = V;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const fd = d => (d ? V.fmtDate(d) : '—');
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const custName = () => (S.project && S.project.customer) || 'Customer';
  const L = k => (I().ready([k]) ? I().list(k) : []);
  const SO = [['brd', 'BRD Sign-Off'], ['uat', 'UAT Sign-Off'], ['golive', 'Go-Live Acceptance']];
  const SOS = { notdue: 'Not due', requested: 'Waiting for signature', signed: 'Signed', concern: 'Concern raised' };
  const RT = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Dependency' };
  const tk = r => { const t = String(r.type || 'R'); return RT[t] ? t : (Object.keys(RT).find(k => RT[k].toLowerCase() === t.toLowerCase()) || 'R'); };   // demo and imported items may hold the word, not the letter
  const isOpen = a => a.status !== 'Done'; const openR = r => r.status !== 'Closed';

  // ---------- the numbers ----------
  function facts() {
    const t = V.today(); const acts = L('action'), raid = L('raid'), dec = L('decision'), crs = L('cr'), so = L('signoff');
    const st = V.planStats ? V.planStats() : { n: 0, actual: 0, planned: 0 }; const ph = V.phaseNow ? V.phaseNow() : { cur: -1, info: [] };
    const cur = ph.cur >= 0 ? ph.info[ph.cur] : null; const gv = st.actual - st.planned;
    const sg = id => so.find(x => x.id === id) || { status: 'notdue' };
    const sos = SO.map(([id, label]) => Object.assign({ id, label }, sg(id)));
    const open = acts.filter(isOpen); const late = open.filter(a => a.due && a.due < t);
    const hi = raid.filter(r => openR(r) && r.impact === 'High' && tk(r) !== 'A'); const hiLate = hi.filter(r => r.due && r.due < t);
    const crP = crs.filter(c => c.status === 'Proposed'); const decP = dec.filter(d => (d.status || 'Proposed') === 'Proposed');
    const reasons = []; let rank = 0; const add = (n, s) => { rank = Math.max(rank, n); reasons.push(s); };
    sos.filter(x => x.status === 'concern').forEach(x => add(2, x.label + ': ' + custName() + ' raised a concern'));
    sos.filter(x => x.status === 'requested' && x.due && x.due < t).forEach(x => add(2, x.label + ' is overdue (due ' + fd(x.due) + ')'));
    if (st.n && gv < -10) add(2, 'Progress is ' + -gv + (gv === -1 ? ' point' : ' points') + ' behind plan');
    if (hiLate.length) add(2, hiLate.length + ' high risk/issue past its due date');
    if (st.n && gv < 0 && gv >= -10) add(1, 'Progress is ' + -gv + (gv === -1 ? ' point' : ' points') + ' behind plan');
    if (late.length) add(1, late.length + ' action' + (late.length === 1 ? '' : 's') + ' overdue');
    if (hi.length > hiLate.length) add(1, (hi.length - hiLate.length) + ' high risk/issue open');
    sos.filter(x => x.status === 'requested' && !(x.due && x.due < t)).forEach(x => add(1, x.label + ' waiting for ' + custName()));
    if (crP.length) add(1, crP.length + ' change request' + (crP.length === 1 ? '' : 's') + ' awaiting a decision');
    if (!st.n) reasons.push('No dated plan yet, so progress cannot be compared with plan');
    const rag = rank === 2 ? ['bad', 'Red · needs attention'] : rank === 1 ? ['warn', 'Amber · watch'] : (!st.n && !acts.length && !raid.length && !dec.length && !crs.length && !sos.some(x => x.status && x.status !== 'notdue')) ? ['', 'Grey · not enough recorded yet'] : ['ok', 'Green · on track'];   // nothing recorded is not the same as on track
    const wk = V.addDays ? V.addDays(t, -14) : '';
    const done = []
      .concat(sos.filter(x => x.status === 'signed').map(x => ({ at: (x.signedAt || '').slice(0, 10), what: x.label + ' signed', who: x.signer || '' })))
      .concat(acts.filter(a => a.status === 'Done').map(a => ({ at: (a.doneAt || '').slice(0, 10), what: a.text || a.title || 'Action without a description', who: a.owner || '' })))
      .concat(dec.filter(d => d.status === 'Agreed').map(d => ({ at: d.date || '', what: 'Decision: ' + d.title, who: '' })))
      .concat(raid.filter(r => r.status === 'Closed').map(r => ({ at: '', what: RT[tk(r)] + ' closed: ' + r.title, who: r.owner || '' })))
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const pending = []
      .concat(sos.filter(x => x.status === 'requested' || x.status === 'concern').map(x => ({ due: x.due || '', what: x.label + (x.status === 'concern' ? ' (concern raised)' : ''), who: custName(), kind: 'Sign-off' })))
      .concat(open.map(a => ({ due: a.due || '', what: a.text || a.title || 'Action without a description', who: (a.side === 'customer' ? custName() : 'Facilio') + (a.owner ? ' · ' + a.owner : ''), kind: 'Action' })))
      .concat(crP.map(c => ({ due: '', what: V.crNo(c) + ' ' + c.title, who: custName(), kind: 'Change request' })))
      .concat(decP.map(d => ({ due: '', what: d.title, who: '', kind: 'Decision' })))
      .sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    const heat = Object.keys(RT).map(k => ['High', 'Medium', 'Low'].map(i => raid.filter(r => openR(r) && tk(r) === k && (r.impact || 'Medium') === i).length));
    return { t, st, ph, cur, gv, sos, open, late, hi, crP, decP, rag, reasons, done, pending, heat, raid, wk };
  }

  // ---------- plain-text report (email, copy and the download all use it) ----------
  function text(f) {
    const stage = f.cur ? 'Stage ' + V.stageOfStep(f.cur.i) + ' · ' + V.roadmapName(V.stageOfStep(f.cur.i)) + ' (plan step ' + (f.cur.i + 1) + ' of 12: ' + f.cur.title + ')' : 'Plan not started';
    const li = (h, a) => a.length ? h + '\n' + a.slice(0, 8).map(x => '• ' + x).join('\n') + '\n' : '';
    const gl = f.st.goLive ? 'Go-live: ' + fd(f.st.goLive) : '';
    return [`${S.project.name || 'Project'} · ${custName()} × Facilio`, `Status report · ${fd(f.t)}`, '', `Overall: ${f.rag[1]}`, `Where we are: ${stage}`, f.st.n ? `Progress: ${f.st.actual}% done against ${f.st.planned}% planned` : 'Progress: no dated plan yet', gl, '',
      li('Why this status', f.reasons), li('Sign-offs', f.sos.map(x => x.label + ' — ' + SOS[x.status || 'notdue'] + (x.status === 'signed' ? ' by ' + x.signer + ' on ' + fd((x.signedAt || '').slice(0, 10)) : x.due ? ' (due ' + fd(x.due) + ')' : ''))),
      li('Done', f.done.map(x => (x.at ? fd(x.at) + ': ' : '') + x.what)), li('Pending', f.pending.map(x => (x.due ? fd(x.due) + ': ' : '') + x.kind + ': ' + x.what + (x.who ? ' — ' + x.who : ''))),
      li('Open high risks and issues', f.hi.map(r => r.title + (r.mitigation ? ' — ' + r.mitigation : ''))), 'Kind regards,\nFacilio Implementation Team'].filter(x => x !== undefined && x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  }

  // ---------- the view ----------
  V.pmoView = function () {
    const f = facts(); const fac = !cust() && !S.readonly; const c = '#3b82f6';
    const stage = f.cur ? 'Stage ' + V.stageOfStep(f.cur.i) + ' · ' + V.roadmapName(V.stageOfStep(f.cur.i)) : 'Plan not started';
    const banner = `<section class="pm-rag pm-${f.rag[0]}"><div><span class="pm-dot"></span><b>${esc(f.rag[1])}</b></div><div class="pm-why"><b>${esc(stage)}</b>${f.cur ? ' · step ' + (f.cur.i + 1) + ' of 12 (' + esc(f.cur.title) + ')' : ''}${f.st.n ? ' · ' + f.st.actual + '% done, ' + f.st.planned + '% planned' : ''}${f.st.goLive ? ' · go-live ' + esc(fd(f.st.goLive)) : ''}<ul>${f.reasons.map(r => `<li>${esc(r)}</li>`).join('') || `<li>${f.rag[0] ? 'Nothing is late, blocked or waiting.' : 'No plan, actions, risks, decisions or sign-offs are recorded yet.'}</li>`}</ul></div>${fac ? `<div class="pm-btns"><button class="btn primary" data-act="pmoShare">Share with the PMO</button><button class="btn" data-act="pmoDownload">Download report</button><button class="btn" data-act="pmoCopy">Copy</button></div>` : `<div class="pm-btns"><button class="btn" data-act="pmoDownload">Download report</button><button class="btn" data-act="pmoCopy">Copy</button></div>`}</section>`;
    const kp = `<div class="sd-kpis">${kpi('Sign-offs', f.sos.filter(x => x.status === 'signed').length + ' / 3', f.sos.filter(x => x.status === 'requested').length + ' waiting', c, f.sos.filter(x => x.status === 'signed').length / 3 * 100)}${kpi('Actions open', f.open.length, f.late.length ? f.late.length + ' overdue' : 'none overdue', f.late.length ? '#ef4444' : '#22c55e')}${kpi('High risks and issues', f.hi.length, f.raid.filter(openR).length + ' open in total', f.hi.length ? '#f97316' : '#22c55e')}${kpi('Decisions to make', f.decP.length + f.crP.length, f.crP.length + ' change request' + (f.crP.length === 1 ? '' : 's') + ' · ' + f.decP.length + ' proposed', '#ec4899')}</div>`;
    const hm = `<div class="pm-heat"><span></span>${['High', 'Medium', 'Low'].map(i => `<em>${i}</em>`).join('')}${Object.keys(RT).map((k, r) => `<b>${RT[k]}</b>${f.heat[r].map((n, i) => `<i class="pm-h${n ? ' h' + i : ''}">${n}</i>`).join('')}`).join('')}</div>`;
    const top = f.raid.filter(openR).sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.impact || 'Medium') - ['High', 'Medium', 'Low'].indexOf(b.impact || 'Medium')).slice(0, 5).map(r => [esc(RT[tk(r)]), `<b>${esc(r.title)}</b>`, chipT(r.impact || 'Medium', r.impact === 'High' ? 'bad' : r.impact === 'Low' ? '' : 'warn'), esc(r.owner || '—'), esc(fd(r.due))]);
    const soRows = f.sos.map(x => [`<b>${esc(x.label)}</b>`, chipT(SOS[x.status || 'notdue'], x.status === 'signed' ? 'ok' : x.status === 'concern' ? 'bad' : x.status === 'requested' ? 'warn' : ''), esc(x.status === 'signed' ? (x.signer || '') + ' · ' + fd((x.signedAt || '').slice(0, 10)) : x.due ? 'Due ' + fd(x.due) : '—'), fac && x.status !== 'signed' ? `<button class="btn sm" data-act="soEmail" data-k="${x.id}">Email client</button>` : '']);
    const dn = f.done.slice(0, 6).map(x => [esc(fd(x.at)), esc(x.what), esc(x.who || '—')]);
    const pd = f.pending.slice(0, 8).map(x => [esc(fd(x.due)), esc(x.what), chipT(x.kind, ''), esc(x.who || '—')]);
    return `<div class="sd-admin">${banner}${lifecycle()}${kp}${grid(
      widget('Sign-offs', 'BRD, UAT and go-live', table(['Sign-off', 'Status', 'Detail', ''], soRows, 'No sign-offs.'), 7, '#ec4899') +
      widget('RAID heat map', 'open items by impact', hm, 5, '#f59e0b') +
      widget('Done', 'latest first', table(['When', 'What', 'By'], dn, 'Nothing is done yet.'), 6, '#22c55e') +
      widget('Pending', 'soonest first', table(['Due', 'What', 'Type', 'Who'], pd, 'Nothing pending.'), 6, '#3b82f6') +
      widget('Top open risks and issues', 'highest impact first', table(['Type', 'Item', 'Impact', 'Owner', 'Due'], top, 'No open risks or issues.'), 12, '#f97316'))}</div>`;
  };

  // ---------- sharing ----------
  const pmoPeople = () => ((F.doc('people') || {}).stakeholders || []).concat(((F.doc('people') || {}).team || [])).filter(x => x.email && /pmo|programme|program|portfolio|governance/i.test(x.role || ''));
  ACT.pmoShare = () => drawer('Share with the PMO', `<p class="small" style="margin-top:0">Opens an Outlook draft with the status report. Nothing is sent from here: you review and press Send.</p><div class="fgrid"><div class="full"><label class="f">To</label><input type="text" id="pm_to" value="${esc(pmoPeople().map(x => x.email).join('; '))}" placeholder="pmo@company.com"></div><div class="full"><label class="f">Cc</label><input type="text" id="pm_cc"></div></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="pmoShareGo">Open in Outlook</button>`);
  ACT.pmoShareGo = () => { const f = facts(); const to = val('pm_to'), cc = val('pm_cc'); closeDrawer(); V.outlook.compose({ to, cc, subject: `${custName()} × Facilio · ${S.project.name || 'Project'} · Status report · ${fd(f.t)}`, body: text(f) + '\n\nOpen the live view: ' + link() }); };
  const link = () => root.location.href.split('#')[0] + '#/p/' + S.project.id + '/governance';
  ACT.pmoCopy = async () => { try { await navigator.clipboard.writeText(text(facts())); toast('Report copied'); } catch (e) { toast('Copy is blocked by the browser: use Download report'); } };
  ACT.pmoDownload = () => { const f = facts(); const t = text(f); const h = '<!doctype html><meta charset="utf-8"><title>' + esc((S.project.name || 'Project') + ' status report') + '</title><body style="font:15px/1.6 system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 20px"><pre style="white-space:pre-wrap;font:inherit">' + esc(t) + '</pre>'; V.download((S.project.name || 'project').replace(/[^\w-]+/g, '-') + '-status-' + f.t + '.html', h, 'text/html'); };

  // ---------- ask the client to sign: Outlook draft to the decision makers ----------
  const clientPeople = () => { const sk = ((F.doc('people') || {}).stakeholders || []).filter(x => x.email); const dm = sk.filter(x => x.decisionMaker); return dm.length ? dm : sk; };
  ACT.soEmail = a => { const k = a.getAttribute('data-k'); const x = I().get('signoff', k) || {}; const lab = (SO.find(s => s[0] === k) || [])[1] || k; const who = clientPeople(); const f = facts();
    const subject = `${S.project.name || 'Project'} · ${lab} requested`;
    const body = `Dear ${who.length === 1 ? who[0].name : 'all'},\n\nWe are asking for your ${lab} on the ${S.project.name || 'project'}.\n\n${x.note ? x.note + '\n\n' : ''}${x.doc ? 'Document to review and sign: ' + x.doc + '\n' : ''}${x.due ? 'Please sign by ' + fd(x.due) + '.\n' : ''}You can sign in the project portal (Governance, then Sign-offs): ${link()}\nIf something needs to change first, use "Raise a concern" there and we will update it.\n\nWhere we are: ${f.cur ? 'Stage ' + V.stageOfStep(f.cur.i) + ' · ' + V.roadmapName(V.stageOfStep(f.cur.i)) : 'planning'}.\n\nKind regards,\nFacilio Implementation Team`;
    drawer('Email ' + custName() + ' for ' + lab, `<p class="small" style="margin-top:0">Opens an Outlook draft. Nothing is sent from here. The sign-off is recorded only when ${esc(custName())} signs in the portal or you record the signature with evidence.</p><div class="fgrid"><div class="full"><label class="f">To</label><input type="text" id="so_to" value="${esc(who.map(p => p.email).join('; '))}" placeholder="No stakeholder email yet: type one"></div><div class="full"><label class="f">Cc</label><input type="text" id="so_cc"></div><div class="full"><label class="f">Subject</label><input type="text" id="so_sub" value="${esc(subject)}"></div><div class="full"><label class="f">Message</label><textarea id="so_body" rows="12">${esc(body)}</textarea></div></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="soEmailGo" data-k="${esc(k)}">Open in Outlook</button>`, { wide: true }); };
  ACT.soEmailGo = a => V.busy(a, async () => { const k = a.getAttribute('data-k'); const m = { to: val('so_to'), cc: val('so_cc'), subject: val('so_sub'), body: val('so_body') }; closeDrawer();
    V.outlook.compose(m); });
})(typeof window !== 'undefined' ? window : globalThis);
