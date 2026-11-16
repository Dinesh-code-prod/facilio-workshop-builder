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
  const prepared = () => { const p = Q().prepareQuestions(V.prepqInput ? V.prepqInput() : {}); if (!root.FWBQBank) return p; F.doc('rs_questions'); const b = S.docs.rs_questions && S.docs.rs_questions.data; const kept = b && Array.isArray(b.items) ? Object.assign({}, b, { items: b.items.map(x => x && x.state === 'suggested' ? Object.assign({}, x, { state: 'kept' }) : x) }) : b; return root.FWBQBank.toPrep(kept, p); };
  const questions = prep => L().questionList(prep || prepared(), doc(), U().res ? U().res.byId : {});
  function rerender() { const sc = document.querySelector('.ws-scroll'); const top = sc ? sc.scrollTop : 0; const y = window.scrollY; V.render(); const n = document.querySelector('.ws-scroll'); if (n) n.scrollTop = top; if (FOCUS()) window.scrollTo(0, y); }
  const projUrl = (q, view) => location.pathname + (q || '') + '#/p/' + encodeURIComponent(S.project.id) + '/' + view;

  // ---------- panels ----------
  const evidenceHtml = (q, can) => q.live ? `<div class="ws-ev ws-ev-${q.live.confidence}"><b>${q.live.confidence === 'likely' ? 'Likely answered' : 'Possibly answered'}</b> <span class="xs muted">a guess from matching words; a person decides</span><div>${esc(q.live.speaker || 'Speaker not named')}${q.live.at ? ' (' + esc(q.live.at) + ')' : ''}: &ldquo;${esc(q.live.quote)}&rdquo;</div>${can ? `<button type="button" class="btn sm" data-act="wsAccept" data-id="${esc(q.id)}">Mark answered with this quote</button>` : ''}</div>` : '';
  // quick capture: the answer of the question on screen becomes a draft record (a person approves it later)
  function makeRow(q) {
    const dis = ro() ? ' disabled' : '';
    const mk = (k, label, made) => q.made[k] ? `<span class="ws-made" title="Already made from this question">${esc(made)}${k === 'requirement' ? ' ' + esc(q.made[k]) : ''}</span>` : `<button type="button" class="btn sm" data-act="wsMake" data-id="${esc(q.id)}" data-k="${k}"${dis}>${esc(label)}</button>`;
    return `<details class="ws-help"><summary>Turn this answer into a draft record</summary><p class="xs muted" style="margin:8px 0 6px">A person approves it later; the question and the answer are kept as its source.</p><div class="ws-mk row" style="gap:6px;flex-wrap:wrap">${mk('requirement', 'Make requirement (draft)', 'Requirement draft')}${mk('decision', 'Make decision (draft)', 'Decision draft made')}${mk('action', 'Make action', 'Action made')}${mk('question', 'Make open question', 'Open question added')}</div></details>`;
  }
  // the planned session being run narrows the questions to its modules (src/workshoplogic.js forSession); none picked shows every question
  const RANK = { must: 0, should: 1, could: 2 };
  const curSession = () => { const id = U().sessionId; return id ? sessionList().find(x => x.id === id) || null : null; };
  // the same question worded the same way is asked once (16 Nov 2026: the rules and the question bank could both hold it)
  const visible = all => { const seen = new Set(); return L().forSession(all, curSession(), sessionList()).filter(q => { const k = String(q.text || '').toLowerCase().replace(/\s+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; }); };
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
    const u = U(); const t = u.t;
    return `<div class="ws-bar" role="toolbar" aria-label="Workshop room"><div class="ws-timer"><span class="ws-clock" id="wsClock" role="timer" aria-label="Workshop timer">${esc(L().fmtClock(elapsed()))}</span><button type="button" class="btn sm" data-act="wsTimer">${t.run ? 'Pause' : t.acc ? 'Resume' : 'Start timer'}</button>${t.acc || t.run ? '<button type="button" class="btn sm" data-act="wsTimerReset">Reset</button>' : ''}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn sm primary" data-act="wsPip" title="A small window that stays above Teams, Meet or Zoom with this session's questions">Float the questions</button>${FOCUS() ? '' : `<button type="button" class="btn sm" data-act="wsFull" title="Fill the window with the workshop room (Esc leaves)">${u.full ? 'Exit full screen' : 'Full screen'}</button><button type="button" class="btn sm" data-act="wsNewTab" title="Open the workshop room alone in its own browser tab">Open in a new tab</button>`}</div></div>`;
  }
  // ---------- the roadmap: one chip per planned requirement session, then one workspace for the chosen session ----------
  const sessionList = () => L().agendaOf(V.plannerDoc ? V.plannerDoc().sessions : []);
  const forSession = (all, s) => L().forSession(all, s, sessionList());
  const isOpenQ = q => q.status === 'toask' || q.status === 'asked';
  const byPriority = (a, b) => (RANK[a.priority] == null ? 1 : RANK[a.priority]) - (RANK[b.priority] == null ? 1 : RANK[b.priority]);
  // the next question: not yet asked before asked-and-waiting, then by priority
  const askOrder = (a, b) => (a.status === 'asked') - (b.status === 'asked') || byPriority(a, b);
  // one coloured bar: answered green, asked amber, skipped grey, still to ask the empty track
  function progBar(qs) {
    const c = L().counts(qs); const w = k => qs.length ? (c[k] * 100 / qs.length).toFixed(1) : 0;
    return `<span class="ws-pbar" role="img" aria-label="${c.answered} answered, ${c.asked} asked, ${c.skipped} skipped, ${c.toask} to ask"><i class="a" style="width:${w('answered')}%"></i><i class="k" style="width:${w('asked')}%"></i><i class="s" style="width:${w('skipped')}%"></i></span>`;
  }
  const modNames = s => s.modules.length ? s.modules.slice(0, 2).join(', ') + (s.modules.length > 2 ? ' +' + (s.modules.length - 2) : '') : 'Contract-wide questions';
  function roadmap(all) {
    const u = U(); const ses = sessionList(); const dis = ro() ? ' disabled' : ''; const c = L().counts(all);
    const chips = ses.map((s, i) => { const qs = forSession(all, s); const done = qs.filter(q => !isOpenQ(q)).length; const full = qs.length && done === qs.length; const on = u.sessionId === s.id;
      return `<button type="button" class="ws-chip${on ? ' on' : ''}${full ? ' done' : ''}" data-act="wsPick" data-id="${esc(s.id)}"${on ? ' aria-current="step"' : ''} title="${esc(s.modules.join(', '))}"><span class="ws-n">${full ? '&#10003;' : esc(s.no || i + 1)}</span><span class="ws-chip-t"><b>${esc(s.title)}</b><span class="xs muted ws-chip-m">${esc(modNames(s))}</span>${progBar(qs)}<span class="xs muted">${esc(s.date ? V.fmtDate(s.date) : 'No date')} &middot; ${done} of ${qs.length} done</span></span></button>`; }).join('');
    const allChip = `<button type="button" class="ws-chip${!u.sessionId ? ' on' : ''}" data-act="wsPick" data-id=""><span class="ws-n">&#8734;</span><span class="ws-chip-t"><b>All questions</b><span class="xs muted ws-chip-m">Every session</span>${progBar(all)}<span class="xs muted">${c.total - c.toask - c.asked} of ${c.total} done</span></span></button>`;
    return `<section class="ws-prep" aria-label="Roadmap of the requirement sessions"><div class="ws-prep-h"><b>Your requirement sessions</b><span class="small muted">Pick the session you are running. Its questions are asked one by one; answers are kept as you go.</span>
      <span class="spacer"></span><button type="button" class="btn sm" data-act="wsAddQ"${dis}>Add a question</button><button type="button" class="btn sm" data-act="qbImport" data-mods="${esc(((curSession() || {}).modules || []).join('|'))}"${dis} title="Add questions from an Excel sheet, a Word or PDF document, or a text file. With a session picked, questions that name no module go to its module.">Import questions</button><button type="button" class="btn sm" data-act="qbField"${dis} title="Your Claude writes questions for each module in scope; they appear here">Ask Claude for questions</button></div>
      <div class="ws-road" role="group">${chips}${allChip}</div>${ses.length ? '' : '<p class="small muted" style="margin:8px 0 0">No sessions are planned yet. Plan them under Workshop plan, and they appear here as a roadmap.</p>'}</section>`;
  }
  function briefCard(vis) {
    const u = U(); const s = sessionList().find(x => x.id === u.sessionId); const c = L().counts(vis); const done = c.answered + c.skipped;
    const meta = s ? [s.date ? V.fmtDate(s.date) + (s.start ? ' ' + s.start : '') : '', s.minutes ? s.minutes + ' min' : ''].filter(Boolean).map(esc).join(' &middot; ') : 'Every prepared question, across all sessions';
    const mods = s && s.modules.length ? `<div class="ws-mods">${s.modules.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : '';
    const legend = `<div class="ws-legend xs"><span><i class="a"></i>${c.answered} answered</span><span><i class="k"></i>${c.asked} asked</span><span><i class="s"></i>${c.skipped} skipped</span><span><i></i>${c.toask} to ask</span></div>`;
    return `<div class="ws-brief"><div><h2 class="ws-bt">${esc(s ? s.title : 'All questions')}</h2><div class="small muted">${meta}${s && s.topics ? ' &middot; Topics: ' + esc(s.topics) : ''}</div>${mods}</div><div class="ws-brief-r"><div class="ws-prog"><div class="row" style="justify-content:space-between;gap:8px"><b class="small">${done} of ${vis.length} done</b><span class="xs muted">${vis.length ? Math.round(done * 100 / vis.length) : 0}%</span></div>${progBar(vis)}${legend}</div><button type="button" class="btn primary" data-act="wsPip" title="A small window that stays on top of Teams, Meet or Zoom and shows this session's questions still to ask">Float the questions over Teams or Zoom</button></div></div>`;
  }
  // the question on screen: the one picked in the side list, else the next to ask
  const pickCur = vis => vis.find(q => q.id === U().cur) || vis.filter(isOpenQ).sort(askOrder)[0] || null;
  function sideList(vis, cur) {
    return `<aside class="ws-side" aria-label="Questions of this session by module">${L().byModule(vis).map(g => { const done = g.questions.filter(q => !isOpenQ(q)).length;
      const label = g.module && g.label === g.module ? ((() => { try { return (F.moduleView(g.module) || {}).label; } catch (e) { return ''; } })() || g.label) : g.label;
      return `<div class="ws-sg"><div class="ws-sgh"><b>${esc(label)}</b><span class="xs muted">${done} of ${g.questions.length}</span></div>${g.questions.map(q => `<button type="button" class="ws-si ws-st-${q.status}${cur && cur.id === q.id ? ' on' : ''}" data-act="wsCur" data-id="${esc(q.id)}" aria-label="${esc(L().LABEL[q.status] + ': ' + q.text)}"${cur && cur.id === q.id ? ' aria-current="true"' : ''}><i aria-hidden="true"></i><span>${esc(q.text)}</span></button>`).join('')}</div>`; }).join('')}</aside>`;
  }
  function focusCard(vis) {
    const dis = ro() ? ' disabled' : ''; const q = pickCur(vis);
    if (!vis.length) return `<div class="card ws-card"><div class="card-b"><b>No questions for this session yet.</b><p class="small muted">Create them from the contract, or import your own from Excel or a document, using the buttons above.</p></div></div>`;
    if (!q) return `<div class="card ws-card"><div class="card-b"><b>&#10003; Every question here is asked or answered.</b><p class="small muted">Send the answers to the Solution tab, where each one comes in as a proposal to accept. The call itself is analysed under Transcripts.</p><button type="button" class="btn primary" data-act="wsSolution"${dis}>Send the answers to the Solution tab</button></div></div>`;
    const n = vis.indexOf(q) + 1; const next = vis.filter(x => x !== q && isOpenQ(x)).sort(askOrder).slice(0, 3);
    const btn = (v, label, cls) => `<button type="button" class="btn${cls ? ' ' + cls : ''}" data-act="wsStatus" data-id="${esc(q.id)}" data-v="${v}" aria-pressed="${q.status === v}"${dis}>${label}</button>`;
    const st = isOpenQ(q) ? '' : ` <span class="ws-stchip ws-st-${q.status}">${esc(L().LABEL[q.status])}</span>`;
    return `<div class="card ws-card ws-focus-card"><div class="card-h"><b>Question ${n} of ${vis.length}${st}</b><span class="xs muted">${tag(PC[q.priority] || 'low', esc(q.priority))} ${q.module ? esc(q.moduleLabel) : 'Contract-wide'}${/^bank:/.test(q.kind || '') && !ro() ? ` <button type="button" class="btn sm ghost" data-act="qbEdit" data-id="${esc(q.id)}">Edit</button>` : ''}</span></div><div class="card-b">
      <div class="ws-fq">${esc(q.text)}</div>${q.why ? `<div class="small muted">Why ask: ${esc(q.why)}</div>` : ''}${q.expected ? `<div class="small muted">A good answer: ${esc(q.expected)}</div>` : ''}${evidenceHtml(q, !ro())}
      <label class="f" for="wsAns">What the customer answered</label><textarea id="wsAns" class="ws-note" rows="3" maxlength="2000" placeholder="Type the answer in your own words" data-bind="@workshop_room:q.${esc(q.id)}.note"${dis}>${esc(q.note)}</textarea>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">${btn('answered', 'Answered &#10003;', 'primary')}${btn('asked', q.status === 'asked' ? 'Asked, still waiting' : 'Asked, waiting for the answer')}${btn('skipped', 'Skip')}</div>
      ${makeRow(q)}
      ${next.length ? `<div class="ws-next2"><div class="xs muted">Up next</div>${next.map(x => `<button type="button" class="ws-nx small" data-act="wsCur" data-id="${esc(x.id)}">${esc(x.text)}</button>`).join('')}</div>` : ''}</div></div>`;
  }
  function sessionTabs(vis, tab) {
    const open = vis.filter(isOpenQ).length; const defs = [['ask', 'Ask the questions', open + ' to go'], ['listen', 'Listen to the call', 'Optional'], ['finish', 'Finish the session', 'Summary and answers']];
    return `<nav class="ws-tabs2" role="tablist" aria-label="Parts of a session">${defs.map(d => `<button type="button" role="tab" class="ws-tab2${tab === d[0] ? ' on' : ''}" aria-selected="${tab === d[0]}" data-act="wsTab" data-v="${d[0]}"><b>${d[1]}</b><span class="xs muted">${esc(d[2])}</span></button>`).join('')}</nav>`;
  }
  function toolsRow() {
    const dis = ro() ? ' disabled' : '';
    return `<div class="row ws-endrow" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn sm" data-act="wsSolution"${dis} title="Answered questions with a note become proposals on the Solution tab">Send the answers to the Solution tab</button><button type="button" class="btn sm" data-act="wsClaude"${dis}>Open in Claude</button></div>`;
  }
  V.workshop = { html() {
    if (V.isCustomer()) return '<div class="page-body"><div class="empty">This page is for the project team.</div></div>';
    const u = U(); const prep = prepared(); const all = questions(prep);
    if (!u.picked) { u.picked = true; if (!u.sessionId) { const first = sessionList().find(s => { const qs = forSession(all, s); return qs.length && qs.some(isOpenQ); }); if (first) u.sessionId = first.id; } }
    const vis = visible(all);
    const pane = vis.length ? `<div class="ws-ask">${sideList(vis, pickCur(vis))}<div class="ws-one">${focusCard(vis)}</div></div>` : `<div class="ws-one">${focusCard(vis)}</div>`;
    const main = `${roadmap(all)}${briefCard(vis)}${pane}${toolsRow()}`;
    const lead = 'Go through your requirement sessions one by one: ask the questions and note what the customer answers. The call recording is analysed under Transcripts. Nothing said here becomes an approved requirement: every record made is a draft with its source.';
    if (FOCUS()) return `<div class="wb-focus-page ws-room ws-focus"><div class="wb-focus-bar"><b>Workshop room</b><span class="xs muted">${esc((S.project && S.project.name) || '')}</span></div>${bar()}${main}</div>`;
    return (u.full ? '' : `<div class="page-header"><div class="t"><h1>Workshop room</h1><p>${lead}</p></div></div>`) + `<div class="page-body"><div class="ws-room${u.full ? ' ws-full ws-scroll' : ''}">${u.full ? '<div class="wb-focus-bar"><b>Workshop room</b><span class="xs muted">' + esc((S.project && S.project.name) || '') + '</span></div>' : ''}${bar()}${main}</div></div>`;
  } };
  ACT.wsPick = a => { const u = U(); u.sessionId = a.getAttribute('data-id') || ''; u.tab = 'ask'; u.cur = ''; rerender(); };
  ACT.wsCur = a => { U().cur = a.getAttribute('data-id') || ''; rerender(); const t = document.getElementById('wsAns'); if (t && !t.disabled) t.focus({ preventScroll: true }); };
  ACT.wsTab = a => { U().tab = a.getAttribute('data-v'); rerender(); };
  ACT.wsGoQuestions = () => V.go('workshop');
  // a new question for the session on screen: filed under its first module (the drawer lets the person change it)
  ACT.wsAddQ = a => { const s = curSession(); const nz = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); const m = s ? (F.allModules() || []).find(x => (s.modules || []).some(w => nz(w) === nz(x.name) || nz(w) === nz(x.label))) : null; (S.ui.qb = S.ui.qb || {}).mod = m ? m.name : ''; return ACT.qbEdit(a); };

  // ---------- actions ----------
  const save = (id, patch) => { L().setNote(doc(), id, patch, (S.user && S.user.name) || '', new Date().toISOString()); F.markDirty('workshop_room'); };
  // a status set on the question on screen moves on to the next question to ask
  ACT.wsStatus = a => { if (ro()) return; save(a.getAttribute('data-id'), { status: a.getAttribute('data-v') }); U().cur = ''; rerender(); };
  ACT.wsAccept = a => { if (ro()) return; const q = questions().find(x => x.id === a.getAttribute('data-id')); if (!q || !q.live) return; save(q.id, { status: 'answered', evidence: q.live, note: q.note || L().evidenceLine(q.live) }); toast('Marked answered with the quote kept', 3000); rerender(); };
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
  let pip = null, pipSel = '';   // pipSel: the module tab open in the floating window
  // The floating question window (user, 16 Nov 2026: "neater, module wise, in the session's timing"): the questions still to ask, grouped by module in the
  // order the session takes them, each module with its share of the session's time; Must first inside a module; one tap for Answered, Asked or Skip.
  function pipDraw() {
    if (!pip || pip.closed) { pip = null; return; } const d = pip.document; let all = []; try { all = questions(); } catch (e) { return; }
    const vis = visible(all), open = vis.filter(q => q.status === 'toask' || q.status === 'asked'), done = vis.length - open.length, s = curSession();
    const nz = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); const order = s ? (s.modules || []).map(nz).filter(Boolean) : [];
    const near = (x, m) => x === m || (x.length >= 5 && m.includes(x)) || (m.length >= 5 && x.includes(m));
    const rank = q => { const ks = [q.module, q.moduleLabel].map(nz).filter(Boolean); const i = order.findIndex(m => ks.some(k => near(k, m))); return i < 0 ? 999 : i; };
    const pr = q => (RANK[q.priority] == null ? 1 : RANK[q.priority]);
    const groups = []; open.slice().sort((a, b) => rank(a) - rank(b) || pr(a) - pr(b)).forEach(q => { const label = q.module ? q.moduleLabel : 'Contract-wide'; let g = groups.find(x => x.label === label); if (!g) groups.push(g = { label, qs: [] }); g.qs.push(q); });
    const el = (tag, cls, text) => { const e = d.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const clock = m => { const h = Math.floor(m / 60) % 24, mm = Math.round(m % 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
    const t0 = s && /^\d{1,2}:\d{2}/.test(s.start || '') ? Number(s.start.split(':')[0]) * 60 + Number(s.start.split(':')[1]) : null; const total = s && s.minutes ? s.minutes : 0;
    d.getElementById('pqTitle').textContent = s ? s.title : 'All questions';
    d.getElementById('pqSub').textContent = [s && s.date ? V.fmtDate(s.date) : '', t0 != null ? clock(t0) + (total ? '–' + clock(t0 + total) : '') : '', open.length + ' to go', done + ' done'].filter(Boolean).join(' · ');
    d.getElementById('pqBar').style.width = (vis.length ? Math.round(done / vis.length * 100) : 0) + '%';
    const list = d.getElementById('pqList'); list.textContent = ''; const tabs = d.getElementById('pqTabs'); tabs.textContent = '';
    if (!open.length) { list.appendChild(el('div', 'empty', vis.length ? 'Every question of this session is asked or answered.' : 'No questions for this session yet.')); return; }
    // one tab per module, in the session's order, with its time slot; only the open tab's questions are listed
    let at = t0; const slot = {}; groups.forEach(g => { const share = total ? Math.max(5, Math.round(total * g.qs.length / open.length)) : 0; slot[g.label] = { share, from: at }; if (at != null) at += share; });
    if (!groups.some(g => g.label === pipSel)) pipSel = groups[0].label;
    groups.forEach(g => { const b = el('button', 'tab' + (g.label === pipSel ? ' on' : ''), ''); b.type = 'button'; b.setAttribute('data-g', g.label); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', g.label === pipSel ? 'true' : 'false'); b.appendChild(el('span', '', g.label)); b.appendChild(el('em', '', String(g.qs.length))); tabs.appendChild(b); });
    groups.filter(g => g.label === pipSel).forEach(g => {
      const box = el('section', 'grp'); const gh = el('div', 'gh'); gh.appendChild(el('b', '', g.label));
      const sl = slot[g.label]; gh.appendChild(el('span', '', [sl.share ? (sl.from != null ? clock(sl.from) + '–' + clock(sl.from + sl.share) : '≈ ' + sl.share + ' min') : '', g.qs.length + ' question' + (g.qs.length === 1 ? '' : 's')].filter(Boolean).join(' · ')));
      box.appendChild(gh);
      g.qs.forEach(q => {
        const row = el('div', 'q ' + (q.priority || 'could') + (q.status === 'asked' ? ' asked' : '')); const t = el('div', 't'); t.appendChild(el('i', 'dot')); const tx = el('span', '', q.text); if (q.why) tx.title = 'Why ask: ' + q.why; t.appendChild(tx);
        if (q.priority === 'must') t.appendChild(el('em', 'must-tag', 'Must')); row.appendChild(t);
        const b = el('div', 'b');
        [['answered', 'Answered', 'ans'], ['asked', q.status === 'asked' ? 'Asked, waiting' : 'Asked', q.status === 'asked' ? 'on' : ''], ['skipped', 'Skip', 'skip']].forEach(([v, label, cls]) => { const x = el('button', cls, label); x.type = 'button'; x.setAttribute('data-q', q.id); x.setAttribute('data-s', v); if (ro()) x.disabled = true; b.appendChild(x); });
        row.appendChild(b); box.appendChild(row);
      });
      list.appendChild(box);
    });
  }
  ACT.wsPip = async () => {
    if (!('documentPictureInPicture' in window)) { toast('This browser cannot float a window above the call. Use Chrome or Edge, or put this page in its own window beside the call.', 7000, true); return; }
    if (pip && !pip.closed) { pip.focus(); return; }
    try { pip = await window.documentPictureInPicture.requestWindow({ width: 400, height: 600 }); } catch (e) { toast('The floating window was not opened: ' + (e.message || 'blocked'), 6000, true); return; }
    const d = pip.document; const st = d.createElement('style');
    st.textContent = 'body{margin:0;font:14px/1.45 Inter,system-ui,"Segoe UI",Arial,sans-serif;color:#101828;background:#F2F4F7}'
      + 'header{position:sticky;top:0;z-index:2;background:#fff;padding:12px 14px 10px;border-bottom:1px solid #EAECF0}h1{font-size:15px;line-height:1.3;margin:0;color:#1D1A5E}.sub{font-size:12px;color:#667085;margin-top:2px}'
      + '.bar{height:6px;background:#EAECF0;border-radius:99px;margin-top:8px;overflow:hidden}.bar i{display:block;height:100%;background:#12B76A;border-radius:99px;transition:width .3s}'
      + '#pqList{padding:2px 0 12px}.grp{margin:10px 10px 0;background:#fff;border-radius:14px;box-shadow:0 0 0 1px #EAECF0,0 1px 2px rgba(16,24,40,.04);overflow:hidden}'
      + '.gh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:9px 12px;background:#F5F9FF;border-bottom:1px solid #E4ECF7}.gh b{font-size:13px;color:#1D1A5E}.gh span{font-size:11.5px;color:#475467;white-space:nowrap}'
      + '.q{padding:10px 12px;border-top:1px solid #F2F4F7}.gh+.q{border-top:0}.t{display:flex;gap:8px;align-items:flex-start}.t span{flex:1}.dot{flex:none;width:8px;height:8px;border-radius:50%;margin-top:7px;background:#98A2B3}'
      + '.must .dot{background:#F04438}.should .dot{background:#F79009}.must-tag{flex:none;font-style:normal;font-size:10.5px;font-weight:600;color:#B42318;background:#FEF3F2;border-radius:99px;padding:1px 7px;margin-top:2px}.asked .t span{color:#475467}'
      + '.b{display:flex;gap:6px;margin:8px 0 0 16px;flex-wrap:wrap}button{font:inherit;font-size:12px;font-weight:500;padding:5px 12px;border-radius:999px;border:1px solid #D0D5DD;background:#fff;color:#344054;cursor:pointer}'
      + 'button:hover{border-color:#1570EF;color:#1570EF}button.ans{background:#1570EF;border-color:#1570EF;color:#fff}button.ans:hover{background:#175CD3;color:#fff}button.on{background:#EFF6FF;border-color:#1570EF;color:#1570EF}button.skip{border-color:transparent;color:#667085}button:disabled{opacity:.5;cursor:default}'
      + '.empty{margin:24px 16px;text-align:center;color:#475467}'
      + '.tabs{display:flex;gap:6px;overflow-x:auto;margin:10px -2px 0;padding:2px;scrollbar-width:thin}.tab{flex:none;display:flex;align-items:center;gap:6px;border-radius:999px;padding:5px 12px;font-size:12.5px;background:#F2F4F7;border:1px solid transparent;color:#344054}.tab em{font-style:normal;font-size:11px;background:#fff;border-radius:99px;padding:0 6px;color:#475467}'
      + '.tab:hover{border-color:#B2D2FB;color:#1570EF}.tab.on{background:#1570EF;color:#fff;border-color:#1570EF}.tab.on em{background:rgba(255,255,255,.25);color:#fff}';
    d.head.appendChild(st); d.title = 'Questions for the call';
    const h = d.createElement('header'); h.innerHTML = '<h1 id="pqTitle"></h1><div class="sub" id="pqSub"></div><div class="bar"><i id="pqBar"></i></div><nav class="tabs" id="pqTabs" role="tablist" aria-label="Modules"></nav>'; d.body.appendChild(h); const l = d.createElement('div'); l.id = 'pqList'; d.body.appendChild(l);
    d.addEventListener('click', e => { const t = e.target.closest && e.target.closest('button[data-g]'); if (t) { pipSel = t.getAttribute('data-g'); pipDraw(); d.getElementById('pqList').scrollTop = 0; return; } const b = e.target.closest && e.target.closest('button[data-q]'); if (!b || ro()) return; save(b.getAttribute('data-q'), { status: b.getAttribute('data-s') }); pipDraw(); rerender(); });
    const tm = setInterval(pipDraw, 3000); pip.addEventListener('pagehide', () => { clearInterval(tm); pip = null; }); pipDraw();
  };
  // keep the call text of the live box as a transcript of the project (Requirement sessions > Transcripts: stored, listed, downloadable, analysed like an uploaded file)
  ACT.wsSaveTranscript = a => V.busy(a, async () => {
    if (ro()) return; const u = U(); const text = String(u.live || '').trim(); if (text.length < 40) { toast('There is no call text yet. Listen with the microphone, or paste the transcript first.', 5000, true); return; } if (!V.trSave) return;
    const day = new Date().toISOString().slice(0, 10); const name = 'live-call-' + day + (u.sessionId ? '-' + String(u.sessionId).replace(/[^a-z0-9]+/gi, '-').slice(0, 30) : '') + '.txt';
    await V.trSave(new File([text], name, { type: 'text/plain' }), { sessionId: u.sessionId || '', modules: [], notes: 'Saved from the Workshop room (live call).' }, null); toast('The call is saved as a transcript. Find it or download it in Transcripts; Claude reads it for the findings on Checks & validations.', 8000);
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
    // a question the call likely answered is marked answered with the quote; a person can set it back
    if (!ro()) (Array.isArray(u.res) ? u.res : []).forEach(q => { if (q && q.id && q.live && q.live.confidence === 'likely' && !['answered', 'skipped'].includes(q.status)) save(q.id, { status: 'answered', note: 'Marked answered from the call: ' + String(q.live.quote || q.live.text || '').slice(0, 400), evidence: q.live }); });
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
