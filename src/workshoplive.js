/* Workshop room > Live assistant (plan: docs/plans/REQUIREMENTS-INTELLIGENCE-PLAN-2026-11-08.md, phases 3 and 4). Sits under the live transcript box of src/workshop.js (hook V.wsLiveExtra).
   Capture: the browser's own speech recognition (Chrome and Edge; free; the browser sends the speech to its own service, Delivery Studio never records or stores audio; it hears this computer's microphone only) appends to the same transcript box,
   or the consultant pastes or loads a transcript as before. The rules in src/workshoplogic.js keep marking questions possibly or likely answered, with no network.
   "Analyse the call" and "Summarise the meeting" ask the existing AI layer (route /qbank/analyse) for a summary, the answered questions with their quotes, suggested follow-ups, decisions, assumptions, dependencies, actions and clarifications.
   The assistant never speaks and never changes anything by itself: the consultant presses Mark answered, Add to the questions, or Make draft; every record made is a DRAFT with its source. A saved summary joins the history in rs_questions. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const Q = () => root.FWBQBank; const L = () => root.FWBWorkshopLogic; const API = root.FWBApi; const { toast } = V;
  const W = () => S.ui.wl || (S.ui.wl = { on: false, interim: '', ai: null, sum: null, busy: '' });
  const U = () => S.ui.ws || (S.ui.ws = { full: false, sessionId: '', mod: '', live: '', fileName: '', res: null, info: null, t: { run: false, start: 0, acc: 0 } });
  const ro = () => !!S.readonly; const now = () => new Date().toISOString(); const by = () => (S.user && (S.user.name || S.user.email)) || '';
  const SR = () => (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null);
  const bank = () => { F.doc('rs_questions'); return Q().bankOf(S.docs.rs_questions && S.docs.rs_questions.data); };
  const setBank = b => { F.doc('rs_questions'); S.docs.rs_questions.data = b; F.markDirty('rs_questions'); };
  const notes = () => { let d = F.doc('workshop_room'); if (!d || typeof d !== 'object') { S.docs.workshop_room.data = d = {}; } return L().notesOf(d); };
  let rec = null, lastCheck = 0, timer = 0, all_ = [];

  // ---------- microphone ----------
  const live = text => { const u = U(); u.live = (u.live ? String(u.live).replace(/\s*$/, '') + '\n' : '') + text; const el = document.getElementById('wsLive'); if (el) { el.value = u.live; el.scrollTop = el.scrollHeight; } };
  const paint = () => { const el = document.getElementById('wlInterim'); if (el) el.textContent = W().interim ? '…' + W().interim : ''; };
  function check() {   // the free rules check on the transcript so far; not while the consultant is typing in a box
    clearTimeout(timer); timer = setTimeout(() => { const a = document.activeElement; const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== 'wsLive'; if (typing || Date.now() - lastCheck < 12000 || !W().on) return; lastCheck = Date.now(); try { V.wsRunLive(U().fileName); V.wsRerender(); } catch (e) { /* the transcript is kept; the check runs again on the next words */ } }, 1500);
  }
  function stop() { const w = W(); w.on = false; w.interim = ''; if (rec) { try { rec.onend = null; rec.stop(); } catch (e) { /* already stopped */ } rec = null; } }
  ACT.wlMic = () => {
    const w = W(); if (w.on) { stop(); V.wsRerender(); return; } const R = SR(); if (!R) { toast('This browser cannot turn speech into text. Use Chrome or Edge, or paste the transcript into the box.', 7000, true); return; }
    rec = new R(); rec.continuous = true; rec.interimResults = true; rec.lang = navigator.language || 'en-US';
    rec.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) { const t = String(r[0].transcript || '').trim(); if (t) live(t); } else interim += r[0].transcript; } w.interim = interim; paint(); check(); };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stop(); toast('The microphone is blocked. Allow it in the address bar of the browser, then try again.', 7000, true); V.wsRerender(); } else if (e.error === 'network') { stop(); toast('The browser could not reach its speech service. Check the connection, or paste the transcript instead.', 7000, true); V.wsRerender(); } };
    rec.onend = () => { if (w.on && rec) { try { rec.start(); } catch (e) { /* it restarts on the next press */ } } };   // the browser stops after a silence; keep listening
    w.on = true; try { rec.start(); } catch (e) { stop(); toast('The microphone could not start.', 5000, true); } V.wsRerender();
  };

  // ---------- AI analysis ----------
  const bankFor = all => { const ex = {}; bank().items.forEach(x => { ex[x.id] = x.expected; }); return all.slice(0, 80).map(q => ({ id: q.id, text: q.text, status: q.status, expected: ex[q.id] || '' })); };
  const run = (a, mode) => V.busy(a, async () => {
    if (ro()) return; const u = U(), el = document.getElementById('wsLive'); if (el) u.live = el.value; if (String(u.live || '').trim().length < 40) { toast('There is almost nothing said yet. Listen, paste or load the transcript first.', 5000, true); return; }
    const w = W(); w.busy = mode; V.wsRerender();
    try { const r = await API.post('/api/projects/' + encodeURIComponent(S.project.id) + '/qbank/analyse', { mode, transcript: u.live, bank: bankFor(all_) }); if (mode === 'summary') w.sum = Object.assign(r, { at: now() }); else w.ai = r; if (r.truncated) toast('Only the last part of the call was read (it is long).', 5000); }
    finally { w.busy = ''; V.wsRerender(); }
  });
  ACT.wlAnalyse = a => run(a, 'live'); ACT.wlSummary = a => run(a, 'summary');
  const src = a => W()[a.getAttribute('data-src') === 'sum' ? 'sum' : 'ai'];
  ACT.wlMark = a => { if (ro()) return; const r = src(a), x = r && r.answered[+a.getAttribute('data-i')]; if (!x) return; L().setNote(notes(), x.id, { status: 'answered', note: x.answer, evidence: { quote: x.quote, confidence: x.quoted ? 'likely' : 'possible' } }, by(), now()); F.markDirty('workshop_room'); V.wsRerender(); };
  ACT.wlMarkAll = () => { if (ro()) return; const r = W().sum; if (!r) return; let n = 0; r.answered.filter(x => x.quoted).forEach(x => { L().setNote(notes(), x.id, { status: 'answered', note: x.answer, evidence: { quote: x.quote, confidence: 'likely' } }, by(), now()); n++; }); F.markDirty('workshop_room'); toast(n ? n + ' question' + (n === 1 ? '' : 's') + ' marked answered with the quote kept.' : 'None of the answers has words that are found in the transcript; mark them one by one after checking.', 5000); V.wsRerender(); };
  ACT.wlAddQ = a => {
    if (ro()) return; const r = src(a), f = r && r.followups[+a.getAttribute('data-i')]; if (!f) return; const mods = (F.allModules() || []).filter(m => m.inScope).map(m => m.name);
    const m = Q().merge(bank(), [{ text: f.text, why: f.why, module: mods.includes(f.module) ? f.module : '', category: f.category, priority: 'should' }], now(), by(), 'live'); if (!m.added) { toast('That question is already in the bank.', 4000); return; }
    const id = m.bank.items[m.bank.items.length - 1].id; setBank(Q().setState(m.bank, id, 'kept', now(), by())); toast('Added to the questions.', 3000); V.wsRerender();
  };
  /** a DRAFT record from something said in the call (a decision, an action, an open question), through the same rules as the questions' quick capture */
  ACT.wlMake = a => V.busy(a, async () => {
    if (ro()) return; const kind = a.getAttribute('data-k'), text = a.getAttribute('data-t') || ''; if (!text || !L().KINDS.includes(kind)) return; const u = U(), iso = now(), I = V.items;
    const pseudo = { id: 'live_' + Date.now().toString(36), text, why: 'Said in the call', note: text, module: '', moduleLabel: '', sources: [], priority: 'should', kind: 'live', made: {}, evidence: null };
    const idFor = { requirement: () => F.nextReqId('GEN'), decision: () => I.uid('d'), action: () => I.uid('a'), question: () => F.uid('q') }[kind]; const d = L().draftRecord(kind, pseudo, { id: idFor(), now: iso, today: iso.slice(0, 10), by: by(), sessionId: u.sessionId, transcript: u.fileName }); if (!d) return; const r = d.record;
    if (d.store === 'question' && L().sameQuestion(S.ws.questions, r.text)) { toast('That question is already in the open questions', 4000); return; }
    if (d.store === 'requirement') { S.ws.requirements.push(r); F.changed('Requirement drafted from the live assistant', r.id + ' ' + r.title, { render: false }); } else if (d.store === 'question') { S.ws.questions.push(r); F.changed('Open question added from the live assistant', r.text, { render: false }); } else { const data = Object.assign({}, r); delete data.id; await I.put(d.store, r.id, data, { silent: true }); }
    toast({ requirement: 'Requirement draft made. Confirm it in Requirements.', decision: 'Decision draft made (Proposed). Agree it in Governance.', action: 'Action made. Give it an owner and a date in Governance.', question: 'Open question added' }[kind], 5000); V.wsRerender();
  });
  ACT.wlSaveSum = () => {
    if (ro()) return; const r = W().sum; if (!r) return; const b = bank(); const keep = ['summary', 'decisions', 'assumptions', 'dependencies', 'actions', 'clarifications', 'unresolved'].reduce((o, k) => { o[k] = r[k]; return o; }, {});
    setBank({ items: b.items, summaries: b.summaries.concat(Object.assign({ at: r.at, by: by(), session: U().sessionId || '', answered: r.answered.length, followups: r.followups.map(f => f.text) }, keep)).slice(-30) }); toast('The summary is saved in the question bank history.', 4000); V.wsRerender();
  };

  // ---------- the panel ----------
  const list = (title, items, mk) => (items && items.length ? '<h4 class="ws-h">' + esc(title) + '</h4><ul class="wl-ul">' + items.map(mk).join('') + '</ul>' : '');
  const mkBtn = (k, label, t) => '<button type="button" class="btn sm" data-act="wlMake" data-k="' + k + '" data-t="' + esc(t) + '"' + (ro() ? ' disabled' : '') + '>' + esc(label) + '</button>';
  function results(r, srcName, all) {
    const byId = new Map(all.map(q => [q.id, q])); const dis = ro() ? ' disabled' : '';
    return (r.summary ? '<h4 class="ws-h">' + (srcName === 'sum' ? 'Meeting summary' : 'Conversation so far') + '</h4><p class="small">' + esc(r.summary) + '</p>' : '')
      + list('Suggested questions', r.followups, (f, i) => '<li><b>' + esc(f.text) + '</b>' + (f.why ? '<div class="xs muted">' + esc(f.why) + '</div>' : '') + '<button type="button" class="btn sm" data-act="wlAddQ" data-src="' + srcName + '" data-i="' + i + '"' + dis + '>Add to the questions</button></li>')
      + list('Answered', r.answered, (x, i) => { const q = byId.get(x.id); return '<li><b>' + esc(q ? q.text : x.id) + '</b><div class="small">' + esc(x.answer) + '</div><div class="xs muted">“' + esc(x.quote) + '”' + (x.quoted ? '' : ' (these words were not found in the transcript: check before you accept)') + '</div>' + (q && q.status === 'answered' ? '<span class="xs muted">Already marked answered</span>' : '<button type="button" class="btn sm" data-act="wlMark" data-src="' + srcName + '" data-i="' + i + '"' + dis + '>Mark answered</button>') + '</li>'; })
      + list('Pending clarifications', r.clarifications, c => '<li>' + esc(c.text) + (c.why ? '<div class="xs muted">' + esc(c.why) + '</div>' : '') + mkBtn('question', 'Add as open question', c.text) + '</li>')
      + list('Decisions', r.decisions, t => '<li>' + esc(t) + mkBtn('decision', 'Make decision (draft)', t) + '</li>') + list('Assumptions', r.assumptions, t => '<li>' + esc(t) + mkBtn('question', 'Add as open question', 'To confirm: ' + t) + '</li>') + list('Dependencies', r.dependencies, t => '<li>' + esc(t) + mkBtn('question', 'Add as open question', 'Dependency to confirm: ' + t) + '</li>')
      + list('Action items', r.actions, a => '<li>' + esc(a.text) + (a.owner ? ' <span class="xs muted">(' + esc(a.owner) + ')</span>' : '') + mkBtn('action', 'Make action', a.text) + '</li>')
      + (srcName === 'sum' && r.unresolved.length ? list('Not settled', r.unresolved.map(id => (byId.get(id) || { text: id }).text), t => '<li>' + esc(t) + '</li>') : '');
  }
  // part 'call': what is needed while the call runs. part 'after': what closes the session. The Workshop room (src/workshop.js) shows one part at a time.
  V.wsLiveExtra = (all, part) => {
    all_ = all; const w = W(); const dis = ro() ? ' disabled' : ''; const sup = !!SR(); const gaps = Q().noRequirement(all); const busy = w.busy ? ' disabled' : '';
    if (part === 'call') {
      return '<div class="card ws-card"><div class="card-h"><b>Listen to the call</b></div><div class="card-b"><p class="small muted">Optional. Turn the microphone on and say answers out loud, or paste the call text in the box above. You decide what to keep; nothing is spoken to the customer.</p>'
        + '<div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn sm ' + (w.on ? 'danger' : 'primary') + '" data-act="wlMic"' + dis + (sup ? '' : ' title="This browser has no speech recognition"') + '>' + (w.on ? 'Stop listening' : 'Listen with the microphone') + '</button><button type="button" class="btn sm" data-act="wsPip" title="A small window that stays above Teams, Meet or Zoom with the questions still to ask">Float the questions</button><button type="button" class="btn sm" data-act="wlAnalyse"' + dis + busy + '>' + (w.busy === 'live' ? 'Reading the call…' : 'Check with AI') + '</button></div>'
        + (w.on ? '<p class="small" role="status"><b>Listening.</b> <span id="wlInterim" class="muted">' + (w.interim ? '…' + esc(w.interim) : '') + '</span></p>' : '')
        + '<details class="ws-help"><summary>How the microphone works</summary><p class="xs muted">' + (sup ? 'It uses your browser’s own speech recognition (free; in Chrome and Edge the browser sends the speech to its own service). Delivery Studio never records or stores audio. It hears this computer’s microphone only, so put the call on speaker.' : 'This browser has no speech recognition: paste or load the transcript above. Chrome and Edge can listen.') + ' A recording file cannot be turned into text here: download the transcript Teams, Meet or Zoom made and add it under Transcripts.</p></details>'
        + (w.ai ? '<div class="wl-res">' + results(w.ai, 'ai', all) + '</div>' : '') + '</div></div>';
    }
    const sum = w.sum ? '<div class="wl-res"><div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn sm primary" data-act="wlMarkAll"' + dis + '>Mark the quoted answers as answered</button><button type="button" class="btn sm" data-act="wlSaveSum"' + dis + '>Save the summary</button></div>' + results(w.sum, 'sum', all)
      + (gaps.length ? '<h4 class="ws-h">Answered, but not yet in a requirement</h4><ul class="wl-ul">' + gaps.map(q => '<li><b>' + esc(q.text) + '</b><div class="small">' + esc(q.note) + '</div><button type="button" class="btn sm" data-act="wsMake" data-id="' + esc(q.id) + '" data-k="requirement"' + dis + '>Make requirement (draft)</button></li>').join('') + '</ul>' : '') + '</div>' : '';
    const past = bank().summaries.length ? '<details class="wl-past"><summary>Earlier summaries (' + bank().summaries.length + ')</summary>' + bank().summaries.slice().reverse().map(s => '<div class="small"><b>' + esc(String(s.at || '').slice(0, 16).replace('T', ' ')) + '</b> ' + esc(s.by || '') + ': ' + esc(s.summary || '') + '</div>').join('') + '</details>' : '';
    const step = (n, title, why, btn) => '<li class="ws-fin"><span class="ws-n">' + n + '</span><div><b>' + title + '</b><div class="small muted">' + why + '</div></div>' + btn + '</li>';
    return '<div class="card ws-card"><div class="card-h"><b>Finish the session</b></div><div class="card-b"><ol class="ws-fins">'
      + step(1, 'Write the summary', 'Decisions, assumptions, actions and what is still open, from the call text.', '<button type="button" class="btn sm primary" data-act="wlSummary"' + dis + busy + '>' + (w.busy === 'summary' ? 'Writing the summary…' : 'Summarise the meeting') + '</button>')
      + step(2, 'Keep the call', 'Store the call text under Transcripts, where it can be downloaded.', '<button type="button" class="btn sm" data-act="wsSaveTranscript"' + dis + '>Save call as transcript</button>')
      + step(3, 'Move the answers on', 'Each answered question goes to the Solution tab as a proposal, for you to accept.', '<button type="button" class="btn sm" data-act="wsSolution"' + dis + '>Send answers to Solution</button>')
      + '</ol>' + (w.sum ? '' : '<p class="xs muted">The summary uses the AI provider your administrator configured.</p>') + sum + past + '</div></div>';
  };
  window.addEventListener && window.addEventListener('beforeunload', stop);
})(typeof window !== 'undefined' ? window : globalThis);
