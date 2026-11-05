/* Requirements > Prepare questions (team only): the questions to ask in a workshop, worked out by the rules in work/server/_sessionquestions.mjs from the project's scope,
   requirements, open questions, MSA exclusions, planned sessions and earlier transcript lines. Every question shows why it is asked and what it rests on.
   Nothing is saved here; the list is worked out again each time. Copy gives a plain-text agenda; Send to Claude opens Claude with the agenda to rephrase (the set stays the same). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const Q = () => root.FWBSessionQuestions; const { toast, tag } = V;
  const PC = { must: 'red', should: 'tbc', could: 'low' };
  const KIND = { conflict: 'Possible conflict', scope_unclear: 'Unclear scope', scope_no_requirement: 'Scope without requirement', open_question: 'Open question', decision_pending: 'Decision pending', requirement_gap: 'Requirement gap', dependency: 'Dependency', onboarding_data: 'Onboarding data', no_session: 'No session planned' };
  const label = m => { try { return (F.moduleView(m) || {}).label || m; } catch (e) { return m; } };
  function input() {
    const d = V.plannerDoc ? V.plannerDoc() : {}; const reqs = S.ws.requirements || []; const by = {}; const mod = n => (by[n] = by[n] || { name: n, label: n ? label(n) : '', scopeItems: [], requirements: [], openQuestions: [] });
    (d.scope || []).forEach(x => { if (x.module) mod(x.module).scopeItems.push({ id: x.id || x.text, text: x.text, status: x.status }); });
    reqs.forEach(r => { const text = [r.title, r.objective].filter(Boolean).join('. '); (r.modules && r.modules.length ? r.modules : ['']).forEach(m => mod(m).requirements.push({ id: r.id, text, status: r.status, owner: r.owner || r.users, acceptance: r.acceptance })); });
    (S.ws.questions || []).forEach(q => { const r = reqs.find(x => x.id === q.reqId); const area = String(q.area || '').toLowerCase(); const m = (r && r.modules && r.modules[0]) || Object.keys(by).find(k => k && (area.includes(k.toLowerCase()) || area.includes(label(k).toLowerCase()))) || ''; mod(m).openQuestions.push({ id: q.id, text: q.text, from: q.owner === 'internal' ? 'facilio' : 'customer', status: q.status }); });
    const T = F.doc('transcripts') || {};
    return { modules: Object.values(by), exclusions: ((d.contractX || {}).scopeX || {}).exclusions || [], sessions: (d.sessions || []).map(s => ({ id: s.id, modules: s.modules || [], status: s.status })),
      statements: (T.candidates || []).map(c => ({ speaker: c.speaker, at: c.line ? 'line ' + c.line : '', text: c.text, ref: (c.transcriptId || '') + ':' + (c.line || '') })) };
  }
  V.prepqInput = input;   // the Workshop room (src/workshop.js) asks the same questions from the same data
  const get = () => Q().prepareQuestions(input());
  const title = () => 'Workshop questions: ' + ((S.project && S.project.name) || 'project');
  const row = q => `<div style="padding:10px 0;border-top:1px solid #eef1f7"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">${tag(PC[q.priority], esc(q.priority))}<span class="xs muted">${esc(KIND[q.kind] || q.kind)}</span></div><div style="margin:4px 0;font-weight:600">${esc(q.text)}</div><div class="small muted">Why: ${esc(q.why)}</div>${q.sources.map(s => `<div class="xs muted">${s.type === 'statement' ? 'Said earlier' + (s.speaker ? ' by ' + esc(s.speaker) : '') + (s.at ? ' (' + esc(s.at) + ')' : '') : 'Source: ' + esc(s.type) + ' ' + esc(s.ref)}${s.quote ? ': &ldquo;' + esc(s.quote) + '&rdquo;' : ''}</div>`).join('')}</div>`;
  V.prepq = { html() {
    if (V.isCustomer()) return '<div class="page-body"><div class="empty">This page is for the project team.</div></div>';
    const p = get(); const n = p.byModule.reduce((a, g) => a + g.questions.length, 0);
    const head = `<div class="page-header"><div class="t"><h1>Prepare questions</h1><p>Questions to ask in the workshop, worked out from your scope, requirements, open questions, MSA exclusions and sessions. Each one shows why it is asked. A statement from a call is only shown as context; it never becomes a requirement.</p></div><div class="row"><button class="btn" data-act="sqCopy"${n ? '' : ' disabled'}>Copy agenda</button><button class="btn primary" data-act="sqClaude"${n ? '' : ' disabled'}>Send to Claude</button></div></div>`;
    const body = p.byModule.map(g => `<div class="card" style="margin-bottom:12px"><div class="card-h"><b>${esc(g.label || 'General')}</b> <span class="xs muted">${g.questions.length} question${g.questions.length === 1 ? '' : 's'}</span></div><div class="card-b">${g.questions.map(row).join('')}</div></div>`).join('') || '<div class="empty">No questions yet: add scope items, requirements or open questions first.</div>';
    const gaps = p.gaps.length ? `<div class="notice small"><div><b>Not worked out</b>${p.gaps.map(g => `<div>${esc(g.message)}</div>`).join('')}</div></div>` : '';
    return head + `<div class="page-body">${body}${gaps}</div>`; } };
  ACT.sqCopy = async () => toast((await V.claudeCopy(Q().agendaText(get(), title()))) ? 'Agenda copied' : 'Copy was blocked by the browser', 3000);
  ACT.sqClaude = async () => { const txt = Q().agendaText(get(), title()); const r = await V.claudeOpenSimple('Here are the questions Delivery Studio worked out for a customer workshop, each with its reason and source. Rephrase them as a clear, polite agenda for the customer. Keep every question, reason and source; do not add, drop or invent any question or fact, and do not mark anything as agreed or approved.\n\n' + txt, { title: 'Workshop questions', task: 'task', module: 'Requirements', destination: 'it is shown to you as a draft agenda; nothing is saved in Delivery Studio' }); toast(r.said, 8000); };
})(typeof window !== 'undefined' ? window : globalThis);
