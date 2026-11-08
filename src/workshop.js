/* Workshop room (roadmap E2 workspace 3, team only): the page the consultant keeps open during a requirements workshop. #/p/<id>/workshop.
   Prepared questions per module (from work/server/_sessionquestions.mjs, through V.prepqInput in src/sessionquestionsview.js) each with a status (to ask, asked, answered, skipped) and a note,
   saved continuously in the project document `workshop_room` (a project document like the planner's, not a record kind: the existing kinds are customer-visible governance records).
   Quick capture makes DRAFT records through the existing stores: a requirement (Draft, classification "needs confirmation") in the workshop document, a decision (Proposed) and an action
   as project records, an open question in the workshop document; each keeps its source (question, and the speaker, time and quoted words when a transcript backed it).
   Live transcript: paste or load a file, src/transcriptparse.js reads it, liveAsk marks questions possibly or likely answered with the quote (never certain; a person decides).
   Full screen (Esc leaves) and New tab copy the whiteboard's mechanism (the page body carries the wb-focus-page class so the shell shows it alone). All rules are in src/workshoplogic.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const Q = () => root.FWBSessionQuestions; const L = () => root.FWBWorkshopLogic; const TP = () => root.FWBTranscriptParse; const { toast, tag } = V;
  (V.extraSections = V.extraSections || []).push('workshop_room');
  const U = () => S.ui.ws || (S.ui.ws = { full: false, sessionId: '', mod: '', live: '', fileName: '', res: null, info: null, t: { run: false, start: 0, acc: 0 } });
  const FOCUS = () => { try { return new URLSearchParams(location.search).get('focus') === 'workshop'; } catch (e) { return false; } };
  const ro = () => !!S.readonly;
  const doc = () => { let d = F.doc('workshop_room'); if (!d || typeof d !== 'object') { S.docs.workshop_room.data = d = {}; } return L().notesOf(d); };   // a document nobody has saved yet reads as null
  const PC = { must: 'red', should: 'tbc', could: 'low' };
  const elapsed = () => { const t = U().t; return t.acc + (t.run ? Date.now() - t.start : 0); };
  const prepared = () => { const p = Q().prepareQuestions(V.prepqInput ? V.prepqInput() : {}); if (!root.FWBQBank) return p; F.doc('rs_questions'); return root.FWBQBank.toPrep(S.docs.rs_questions && S.docs.rs_questions.data, p); };
  const questions = prep => L().questionList(prep || prepared(), doc(), U().res ? U().res.byId : {});
  function rerender() { const sc = document.querySelector('.ws-scroll'); const top = sc ? sc.scrollTop : 0; const y = window.scrollY; V.render(); const n = document.querySelector('.ws-scroll'); if (n) n.scrollTop = top; if (FOCUS()) window.scrollTo(0, y); }
  const projUrl = (q, view) => location.pathname + (q || '') + '#/p/' + encodeURIComponent(S.project.id) + '/' + view;

  // ---------- panels ----------
  const evidenceHtml = (q, can) => q.live ? `<div class="ws-ev ws-ev-${q.live.confidence}"><b>${q.live.confidence === 'likely' ? 'Likely answered' : 'Possibly answered'}</b> <span class="xs muted">a guess from matching words; a person decides</span><div>${esc(q.live.speaker || 'Speaker not named')}${q.live.at ? ' (' + esc(q.live.at) + ')' : ''}: &ldquo;${esc(q.live.quote)}&rdquo;</div>${can ? `<button type="button" class="btn sm" data-act="wsAccept" data-id="${esc(q.id)}">Mark answered with this quote</button>` : ''}</div>` : '';
  function qRow(q) {
    const dis = ro() ? ' disabled' : '';
    const seg = L().STATUSES.map(s => `<button type="button" class="ws-seg${q.status === s ? ' on' : ''}" data-act="wsStatus" data-id="${esc(q.id)}" data-v="${s}" aria-pressed="${q.status === s}"${dis}>${esc(L().LABEL[s])}</button>`).join('');
    const mk = (k, label, made) => q.made[k] ? `<span class="ws-made" title="Already made from this question">${esc(made)}${k === 'requirement' ? ' ' + esc(q.made[k]) : ''}</span>` : `<button type="button" class="btn sm" data-act="wsMake" data-id="${esc(q.id)}" data-k="${k}"${dis}>${esc(label)}</button>`;
    const src = q.sources.filter(s => s.type !== 'statement').slice(0, 2).map(s => `<div class="xs muted">Source: ${esc(s.type)} ${esc(s.ref)}${s.quote ? ': &ldquo;' + esc(s.quote) + '&rdquo;' : ''}</div>`).join('');
    return `<div class="ws-q ws-st-${q.status}"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">${tag(PC[q.priority] || 'low', esc(q.priority))}<span class="xs muted">${esc(q.kind.replace(/_/g, ' '))}</span></div>
      <div class="ws-qt">${esc(q.text)}</div><div class="small muted">Why: ${esc(q.why)}</div>${src}${evidenceHtml(q, !ro())}
      ${q.evidence ? `<div class="xs muted">Kept: ${esc(L().evidenceLine(q.evidence))}</div>` : ''}
      <div class="ws-segs" role="group" aria-label="Status of this question">${seg}</div>
      <textarea class="ws-note" rows="2" maxlength="2000" placeholder="What was said, in your own words. Quick capture uses this text." aria-label="Note for this question" data-bind="@workshop_room:q.${esc(q.id)}.note"${dis}>${esc(q.note)}</textarea>
      <div class="ws-mk row" style="gap:6px;flex-wrap:wrap">${mk('requirement', 'Make requirement (draft)', 'Requirement draft')}${mk('decision', 'Make decision (draft)', 'Decision draft made')}${mk('action', 'Make action', 'Action made')}${mk('question', 'Make open question', 'Open question added')}</div></div>`;
  }
  function questionsPanel(prep, all) {
    const u = U(); const c = L().counts(all); const groups = prep.byModule.filter(g => !u.mod || g.module === u.mod);
    const byId = new Map(all.map(q => [q.id, q]));
    const strip = `<div class="ws-sum"><b>${c.total}</b> question${c.total === 1 ? '' : 's'}<span>${c.toask} to ask</span><span>${c.asked} asked</span><span>${c.answered} answered</span><span>${c.skipped} skipped</span>${c.likely + c.possible ? `<span class="ws-hint">${c.likely} likely and ${c.possible} possibly answered in the transcript</span>` : ''}</div>`;
    const filter = `<label class="ws-mod xs muted">Module <select data-change="wsMod" aria-label="Show one module"><option value="">All modules</option>${prep.byModule.map(g => `<option value="${esc(g.module)}"${u.mod === g.module ? ' selected' : ''}>${esc(g.label || 'General')}</option>`).join('')}</select></label>`;
    const cards = groups.map(g => { const qs = g.questions.map(x => byId.get(x.id)).filter(Boolean); const done = qs.filter(x => x.status === 'answered' || x.status === 'skipped').length;
      return `<div class="card ws-card"><div class="card-h"><b>${esc(g.label || 'General')}</b> <span class="xs muted">${done} of ${qs.length} done</span></div><div class="card-b">${qs.map(qRow).join('')}</div></div>`; }).join('');
    const gaps = prep.gaps.length ? `<div class="notice small"><div><b>Not worked out</b>${prep.gaps.map(g => `<div>${esc(g.message)}</div>`).join('')}</div></div>` : '';
    return `<section aria-label="Prepared questions"><div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">${strip}${filter}</div>${cards || '<div class="empty">No questions yet: add scope items, requirements or open questions first (Requirements > Prepare questions shows why).</div>'}${gaps}</section>`;
  }
  function livePanel(all) {
    const u = U(); const dis = ro() ? ' disabled' : ''; const r = u.res; const info = u.info;
    const nextRows = r ? r.next.map(x => { const q = all.find(y => y.id === x.id); return q ? `<li><b>${esc(q.text)}</b><div class="xs muted">${esc(q.moduleLabel)}. ${esc(x.why)}</div></li>` : ''; }).join('') : '';
    const infoLine = info ? (info.n ? `Read ${info.n} part${info.n === 1 ? '' : 's'} (${esc({ vtt: 'WebVTT', srt: 'SRT', teams: 'Teams style', speaker: 'Speaker lines', json: 'JSON', plain: 'plain text' }[info.format] || info.format)}).${info.truncated.size ? ' The text was cut at 2 MB.' : ''}${info.truncated.count ? ' Only the first 20,000 parts were kept.' : ''}` : 'No speech found in that text.') : '';
    return `<div class="card ws-card"><div class="card-h"><b>Live transcript</b></div><div class="card-b">
      <p class="small muted">Paste the call so far, or load a file (.vtt, .srt, .txt, .docx, .json). Matching is by words only: a question is marked possibly or likely answered with the quoted words, never certain.</p>
      <textarea id="wsLive" class="ws-live" rows="7" placeholder="Paste transcript text here" aria-label="Live transcript text" data-change="wsLive"${dis}>${esc(u.live)}</textarea>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn sm primary" data-act="wsCheck"${dis}>Check questions</button><button type="button" class="btn sm" data-act="wsLoadFile"${dis}>Load file</button>${u.live ? `<button type="button" class="btn sm" data-act="wsLiveClear"${dis}>Clear</button>` : ''}</div>
      ${infoLine ? `<p class="small muted" role="status" style="margin-top:8px">${infoLine}${u.fileName ? ' File: ' + esc(u.fileName) + '.' : ''}</p>` : ''}
      ${r ? `<h4 class="ws-h">Ask next</h4>${nextRows ? `<ol class="ws-next">${nextRows}</ol>` : '<p class="small muted">Nothing left to suggest.</p>'}` : ''}</div></div>`;
  }
  function agendaPanel() {
    const u = U(); const ag = L().agendaOf(V.plannerDoc ? V.plannerDoc().sessions : []); const label = m => { try { return (F.moduleView(m) || {}).label || m; } catch (e) { return m; } };
    const rows = ag.map(s => `<li class="ws-ag${u.sessionId === s.id ? ' on' : ''}"><div><b>${esc(s.title)}</b> <span class="xs muted">${esc(s.date ? V.fmtDate(s.date) : 'No date')}${s.start ? ' ' + esc(s.start) : ''}${s.minutes ? ', ' + s.minutes + ' min' : ''}${s.status && s.status !== 'planned' ? ', ' + esc(s.status) : ''}</span></div>${s.modules.length ? `<div class="xs muted">${s.modules.map(m => esc(label(m))).join(', ')}</div>` : ''}${u.sessionId === s.id && s.topics ? `<div class="small" style="white-space:pre-line">${esc(s.topics)}</div>` : ''}<button type="button" class="btn sm" data-act="wsSession" data-id="${esc(s.id)}" aria-pressed="${u.sessionId === s.id}">${u.sessionId === s.id ? 'In use for drafts' : 'Use for this workshop'}</button></li>`).join('');
    return `<div class="card ws-card"><div class="card-h"><b>Agenda</b> <span class="xs muted">planned sessions</span></div><div class="card-b">${rows ? `<ul class="ws-aglist">${rows}</ul>` : '<p class="small muted">No sessions planned yet. Plan them in the Contract page, Sessions.</p>'}<p class="xs muted" style="margin-top:8px">The session you pick is written on the requirement drafts you make.</p></div></div>`;
  }
  function bar() {
    const u = U(); const t = u.t; const dis = ro() ? ' disabled' : '';
    return `<div class="ws-bar" role="toolbar" aria-label="Workshop room"><div class="ws-timer"><span class="ws-clock" id="wsClock" role="timer" aria-label="Workshop timer">${esc(L().fmtClock(elapsed()))}</span><button type="button" class="btn sm" data-act="wsTimer">${t.run ? 'Pause' : t.acc ? 'Resume' : 'Start'}</button>${t.acc || t.run ? '<button type="button" class="btn sm" data-act="wsTimerReset">Reset</button>' : ''}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="wsOpenFlow" title="Opens the State Flow Builder for this project in a new tab">Open State Flow Builder</button><button type="button" class="btn sm" data-act="wsOpenWb" title="Opens the Process Whiteboard for this project in a new tab">Open Process Whiteboard</button>
      <button type="button" class="btn sm" data-act="wsClaude"${dis}>Open in Claude</button>${FOCUS() ? '' : `<button type="button" class="btn sm" data-act="wsFull" title="Fill the window with the workshop room (Esc leaves)">${u.full ? 'Exit full screen' : 'Full screen'}</button><button type="button" class="btn sm" data-act="wsNewTab" title="Open the workshop room alone in its own browser tab">New tab</button>`}</div></div>`;
  }

  V.workshop = { html() {
    if (V.isCustomer()) return '<div class="page-body"><div class="empty">This page is for the project team.</div></div>';
    const u = U(); const prep = prepared(); const all = questions(prep);
    const main = `<div class="ws-grid"><div class="ws-left">${questionsPanel(prep, all)}</div><div class="ws-right">${livePanel(all)}${V.wsLiveExtra ? V.wsLiveExtra(all) : ''}${agendaPanel()}</div></div>`;
    const lead = 'Run the workshop from here: the questions to ask, a status and a note on each, quick capture of drafts, a live transcript check and the diagrams. Nothing said here becomes an approved requirement: every record made is a draft with its source.';
    if (FOCUS()) return `<div class="wb-focus-page ws-room ws-focus"><div class="wb-focus-bar"><b>Workshop room</b><span class="xs muted">${esc((S.project && S.project.name) || '')}</span></div>${bar()}${main}</div>`;
    return (u.full ? '' : `<div class="page-header"><div class="t"><h1>Workshop room</h1><p>${lead}</p></div></div>`) + `<div class="page-body"><div class="ws-room${u.full ? ' ws-full ws-scroll' : ''}">${u.full ? '<div class="wb-focus-bar"><b>Workshop room</b><span class="xs muted">' + esc((S.project && S.project.name) || '') + '</span></div>' : ''}${bar()}${main}</div></div>`;
  } };

  // ---------- actions ----------
  const save = (id, patch) => { L().setNote(doc(), id, patch, (S.user && S.user.name) || '', new Date().toISOString()); F.markDirty('workshop_room'); };
  ACT.wsStatus = a => { if (ro()) return; save(a.getAttribute('data-id'), { status: a.getAttribute('data-v') }); rerender(); };
  ACT.wsAccept = a => { if (ro()) return; const q = questions().find(x => x.id === a.getAttribute('data-id')); if (!q || !q.live) return; save(q.id, { status: 'answered', evidence: q.live, note: q.note || L().evidenceLine(q.live) }); toast('Marked answered with the quote kept', 3000); rerender(); };
  ACT.wsMod = el => { U().mod = el.value; rerender(); };
  ACT.wsSession = a => { const u = U(); const id = a.getAttribute('data-id'); u.sessionId = u.sessionId === id ? '' : id; rerender(); };
  ACT.wsMake = a => V.busy(a, async () => {
    if (ro()) return; const kind = a.getAttribute('data-k'); if (!L().KINDS.includes(kind)) return; const q = questions().find(x => x.id === a.getAttribute('data-id')); if (!q || q.made[kind]) return; const u = U(); const iso = new Date().toISOString(); const I = V.items;
    const idFor = { requirement: () => F.nextReqId(q.module ? F.modulePrefix(q.module) : 'GEN'), decision: () => I.uid('d'), action: () => I.uid('a'), question: () => F.uid('q') }[kind]; if (!idFor) return;
    const d = L().draftRecord(kind, q, { id: idFor(), now: iso, today: iso.slice(0, 10), by: (S.user && S.user.name) || '', sessionId: u.sessionId, transcript: u.fileName }); if (!d) return; const r = d.record;
    if (d.store === 'question' && L().sameQuestion(S.ws.questions, r.text)) { toast('That question is already in the open questions', 4000); return; }
    if (d.store === 'requirement') { S.ws.requirements.push(r); F.changed('Requirement drafted from the Workshop room', r.id + ' ' + r.title, { render: false }); }
    else if (d.store === 'question') { S.ws.questions.push(r); F.changed('Open question added from the Workshop room', r.text, { render: false }); }
    else { const data = Object.assign({}, r); delete data.id; await I.put(d.store, r.id, data, { silent: true }); }
    save(q.id, { made: { kind, id: r.id } }); toast({ requirement: 'Requirement draft ' + r.id + ' made. Confirm it in Requirements.', decision: 'Decision draft made (Proposed). Agree it in Governance.', action: 'Action made. Give it an owner and a date in Governance.', question: 'Open question added' }[kind], 5000); rerender();
  });
  // Answered questions of a module go to the Solution tab as ONE proposal per module (the agreed text so far plus the new answers); a person reads each and presses Accept there. Nothing is written into the solution itself.
  ACT.wsSolution = a => V.busy(a, async () => {
    if (ro()) return; /* the questions carry the module's label, the Solution tab its name */ const SL = root.FWBSolutionLogic; if (!SL) return; const nz = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, ''); const scoped = (F.allModules() || []).filter(m => m.inScope); const modOf = x => { const k = nz(x); return k ? scoped.find(m => nz(m.name) === k || nz(m.label) === k) : null; };  const pend = questions().filter(q => q.status === 'answered' && String(q.note || '').trim() && !q.made.solution);
    const by = {}; let skipped = 0; pend.forEach(q => { const m = modOf(q.module); if (!m) { skipped++; return; } (by[m.name] = by[m.name] || []).push(q); });
    const mods = Object.keys(by); if (!mods.length) { toast(pend.length ? 'The answered questions have no module in scope, so they have no place in the Solution tab' : 'No answered question with a note is waiting to go to the Solution tab', 6000, true); return; }
    const sdoc = F.doc('solutions') || { items: {} }; const now = new Date().toISOString(); const incoming = mods.map(m => { const key = 'module:' + m; const cur = SL.textOf(sdoc, key); const add = by[m].map(q => q.text.replace(/\s+/g, ' ').trim() + ' Customer answer: ' + String(q.note).replace(/\s+/g, ' ').trim()); const ev = by[m].map(q => (q.evidence && q.evidence.quote) || '').filter(Boolean)[0] || '';
      return { kind: 'solution', module: key, text: (cur ? cur + '\n\n' : '') + add.join('\n\n'), why: 'Answered in the requirement session (' + by[m].length + ' question' + (by[m].length === 1 ? '' : 's') + ')', quote: ev, source: 'Workshop room' }; });
    const pd = F.doc('design_proposals') || { items: [] }; const r = SL.mergeProposals(pd.items || [], incoming, now); S.docs.design_proposals.data = Object.assign({}, pd, { items: r.items }); F.markDirty('design_proposals');
    mods.forEach(m => by[m].forEach(q => save(q.id, { made: Object.assign({}, q.made, { solution: true }) }))); toast(r.added + ' proposal' + (r.added === 1 ? '' : 's') + ' sent to the Solution tab' + (skipped ? ' (' + skipped + ' answers without a module in scope were left out)' : '') + '. Open Solution to review and accept.', 8000); rerender();
  });
  // A small always-on-top window (the browser's own Document Picture-in-Picture, Chrome and Edge) that stays above Teams, Meet or Zoom while the call runs: the questions still to ask, one tap to mark asked or answered.
  // Nothing leaves the browser and no meeting is joined; where the browser has no such window it says so.
  let pip = null;
  function pipDraw() {
    if (!pip || pip.closed) { pip = null; return; } const d = pip.document; let all = []; try { all = questions(); } catch (e) { return; } const open = all.filter(q => q.status === 'toask' || q.status === 'asked'); const done = all.length - open.length;
    d.getElementById('pqHead').textContent = open.length + ' to go, ' + done + ' done'; const list = d.getElementById('pqList'); list.textContent = '';
    open.slice(0, 40).forEach(q => { const row = d.createElement('div'); row.className = 'q'; const t = d.createElement('div'); t.className = 't'; t.textContent = (q.module ? q.module + ': ' : '') + q.text; row.appendChild(t); const b = d.createElement('div'); b.className = 'b';
      [['asked', q.status === 'asked' ? 'Asked' : 'Mark asked'], ['answered', 'Answered'], ['skipped', 'Skip']].forEach(([s, label]) => { const x = d.createElement('button'); x.type = 'button'; x.textContent = label; x.setAttribute('data-q', q.id); x.setAttribute('data-s', s); if (q.status === s) x.disabled = true; b.appendChild(x); }); row.appendChild(b); list.appendChild(row); });
    if (!open.length) list.textContent = 'Every prepared question has been asked or answered.';
  }
  ACT.wsPip = async () => {
    if (!('documentPictureInPicture' in window)) { toast('This browser cannot float a window above the call. Use Chrome or Edge, or put this page in its own window beside the call.', 7000, true); return; }
    if (pip && !pip.closed) { pip.focus(); return; }
    try { pip = await window.documentPictureInPicture.requestWindow({ width: 380, height: 560 }); } catch (e) { toast('The floating window was not opened: ' + (e.message || 'blocked'), 6000, true); return; }
    const d = pip.document; const st = d.createElement('style'); st.textContent = 'body{margin:0;font:14px/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#1D1A5E;background:#fff}h1{font-size:14px;margin:0;padding:10px 12px;border-bottom:1px solid #DCE4F3;position:sticky;top:0;background:#fff}#pqList{padding:8px 12px}.q{padding:8px 0;border-bottom:1px solid #E3E9F5}.t{margin-bottom:6px}.b{display:flex;gap:6px;flex-wrap:wrap}button{font:inherit;font-size:12px;padding:4px 10px;border:1px solid #8DB8FF;background:#fff;color:#1570EF;border-radius:8px;cursor:pointer}button:disabled{opacity:.5;cursor:default}';
    d.head.appendChild(st); d.title = 'Questions for the call'; const h = d.createElement('h1'); h.id = 'pqHead'; d.body.appendChild(h); const l = d.createElement('div'); l.id = 'pqList'; d.body.appendChild(l);
    d.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-q]'); if (!b || ro()) return; save(b.getAttribute('data-q'), { status: b.getAttribute('data-s') }); pipDraw(); rerender(); });
    const tm = setInterval(pipDraw, 3000); pip.addEventListener('pagehide', () => { clearInterval(tm); pip = null; }); pipDraw();
  };
  // keep the call text of the live box as a transcript of the project (Requirement sessions > Transcripts: stored, listed, downloadable, analysed like an uploaded file)
  ACT.wsSaveTranscript = a => V.busy(a, async () => {
    if (ro()) return; const u = U(); const text = String(u.live || '').trim(); if (text.length < 40) { toast('There is no call text yet. Listen with the microphone, or paste the transcript first.', 5000, true); return; } if (!V.trSave) return;
    const day = new Date().toISOString().slice(0, 10); const name = 'live-call-' + day + (u.sessionId ? '-' + String(u.sessionId).replace(/[^a-z0-9]+/gi, '-').slice(0, 30) : '') + '.txt';
    await V.trSave(new File([text], name, { type: 'text/plain' }), { sessionId: u.sessionId || '', modules: [], notes: 'Saved from the Workshop room (live call).' }, null); toast('The call is saved as a transcript. Find it, download it or review its suggestions in Transcripts.', 8000);
  });
  ACT.wsTimer = () => { const t = U().t; if (t.run) { t.acc += Date.now() - t.start; t.run = false; } else { t.start = Date.now(); t.run = true; } rerender(); };
  ACT.wsTimerReset = () => { U().t = { run: false, start: 0, acc: 0 }; rerender(); };
  ACT.wsFull = () => { U().full = !U().full; rerender(); };
  ACT.wsNewTab = () => { const x = window.open(projUrl('?focus=workshop', 'workshop'), '_blank'); if (!x) toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); else toast('Opened in a new tab. Work in one tab at a time so saves do not overwrite each other.', 5000); };
  ACT.wsOpenFlow = () => { if (!window.open(projUrl('', 'flow'), '_blank')) toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); };
  ACT.wsOpenWb = () => { if (!window.open(projUrl('?focus=whiteboard', 'whiteboard'), '_blank')) toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); };
  // live transcript: the text is kept when the box loses focus (no redraw, so a click on a button still lands); Check questions reads it and marks the questions
  function runLive(hint) {
    const u = U(); const info = TP().parseTranscriptInfo(u.live, hint || ''); u.info = { n: info.chunks.length, format: info.format, truncated: info.truncated };
    if (!info.chunks.length) { u.res = null; return; } const prep = prepared(); const base = L().questionList(prep, doc(), {});
    u.res = L().mergeLive(base, Q().liveAsk(prep, info.chunks.map(c => ({ speaker: c.speaker, at: TP().fmtAt(c.at), text: c.text }))));
  }
  V.wsRerender = rerender; V.wsRunLive = runLive;   // the live assistant (src/workshoplive.js) refreshes the room and re-checks the questions
  ACT.wsLive = el => { U().live = el.value; };
  ACT.wsCheck = () => { const el = document.getElementById('wsLive'); const u = U(); if (el) u.live = el.value; if (!u.live.trim()) { toast('Paste some transcript text first'); return; } runLive(u.fileName); rerender(); };
  ACT.wsLiveClear = () => { const u = U(); u.live = ''; u.fileName = ''; u.res = null; u.info = null; rerender(); };
  ACT.wsLoadFile = async () => {
    const f = (await V.pickFile('.vtt,.srt,.txt,.docx,.json'))[0]; if (!f) return; if (f.size > 20 * 1024 * 1024) { toast('That file is over 20 MB', 5000, true); return; }
    let text; try { text = /\.docx$/i.test(f.name) ? await V.trExtractText(f) : await f.text(); } catch (e) { toast('That file could not be read', 5000, true); return; }
    const u = U(); u.live = String(text || '').slice(0, TP().MAX_CHARS); u.fileName = f.name; runLive(f.name); rerender();
  };
  ACT.wsClaude = async () => {
    const name = (S.project && S.project.name) || 'this project';
    const r = await V.claudeOpenSimple('Use the Facilio Delivery Studio connector for the project "' + name + '". I am in the Workshop room. (1) To bring a call transcript in, store its full text with transfer_write (action begin, dir pull, kind "transcript", source system and ref of the meeting, dest system "studio"), then action store with the text as content, then action submit. You cannot approve: I approve it in Transfers and press Import into Transcripts. (2) For the questions to ask, call session_questions with action "prepare". During the call, call it with action "live" and the transcript chunks so far; it marks questions possibly or likely answered with the quote. Everything you suggest is an unapproved draft with its source (speaker, time, quote). Do not mark anything agreed or confirmed.',
      { title: 'Workshop room', task: 'task', module: 'Requirements', destination: 'Claude reads and stores through the connector; transcripts wait in Transfers for a person to approve and import' }); toast(r.said, 8000);
  };
  // the timer shows time from the clock, so it needs no redraw; Esc leaves full screen (not while a drawer is open)
  setInterval(() => { const el = document.getElementById('wsClock'); if (el && S.ui && S.ui.ws && S.ui.ws.t.run) el.textContent = L().fmtClock(elapsed()); }, 1000);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.ui && S.ui.view === 'workshop' && S.ui.ws && S.ui.ws.full && !document.getElementById('drawer')) { e.preventDefault(); S.ui.ws.full = false; rerender(); } });
})(typeof window !== 'undefined' ? window : globalThis);
