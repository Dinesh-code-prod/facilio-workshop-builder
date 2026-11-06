/* Project assistant panel: ONE place, on the right of every project page, where the work Claude does for the project is shown as it happens (roadmap E15). It replaces a chat box on every tab: the tabs keep their results
   (tiles, review checklist, checks) and the questions that need an answer; this panel shows the running record, grouped by job and stage, and opens by itself when Claude picks up a job or asks something.
   Data: the project's jobs (shared list and polling from src/kickoff.js, V.studioJobs). The panel only reads and displays; answers go through the same actions as the tabs (koAns, koSend), and "Open ..." buttons use koOpen.
   Stages are labelled below; a new stage only needs its job kinds in work/server/_jobs.mjs and a line in OPEN here to get a button that opens its tab. Not shown to customers. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews;
  const STAGE = { intake: 'Contract and kick-off', requirements: 'Requirement sessions', brd: 'BRD', configuration: 'Configuration', uat: 'UAT', hypercare: 'Hypercare', other: 'Project' };
  const OPEN = { pull_msa: ['kickoff', 'Review the kick-off'], apply_change: ['kickoff', 'Review the kick-off'], pull_clari: ['rschecks', 'Review the checks'], extract_findings: ['rschecks', 'Review the checks'], check_brd: ['rschecks', 'Review the checks'], check_msa: ['rschecks', 'Review the checks'], capture_flows: ['whiteboard', 'Review the proposed flows'], fill_forms: ['modules', 'Review the proposed fields and forms'], draft_brd: ['brd', 'Review the proposed BRD content'], capture_apps: ['brd', 'Review the proposed connected apps'] };
  const st = () => S.ui.asst || (S.ui.asst = { open: false, seen: {}, init: '', sig: '' });
  const L = () => root.FWBKickoffLogic, W = () => root.FWBWorkChat, J = () => V.studioJobs;
  const team = () => !!(S.user && S.user.kind !== 'customer' && S.project && S.project.id && (!V.isCustomer || !V.isCustomer()));
  let panel = null, tab = null, ticks = 0;
  function ensure() {
    if (panel) return; panel = document.createElement('aside'); panel.id = 'asst'; panel.setAttribute('aria-label', 'Project assistant'); tab = document.createElement('button'); tab.id = 'asstTab'; tab.type = 'button'; tab.setAttribute('data-act', 'asstToggle'); tab.setAttribute('aria-label', 'Open or close the project assistant');
    document.body.appendChild(panel); document.body.appendChild(tab);
  }
  const key = j => j.id + ':' + (j.status === 'needs_input' ? 'q' : 'c') + ':' + (j.claimedAt || '');
  const nice = e => String(e || '').split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || 'A teammate';
  const ago = ts => { const m = Math.round((Date.now() - Date.parse(ts)) / 6e4); return m < 2 ? 'just now' : m < 60 ? m + ' minutes ago' : m < 1440 ? Math.round(m / 60) + ' hours ago' : Math.round(m / 1440) + ' days ago'; };
  function runMsgs(j, k) {
    const when = J().when, who = String(j.claimedBy || '').split('@')[0], out = []; const mine = !j.by || !S.user || String(j.by).toLowerCase() === String(S.user.email || '').toLowerCase(), nm = nice(j.by); if (j.kind === 'chat') out.push(mine ? { who: 'you', text: j.note, at: when(j.at) } : { who: 'other', name: nm, text: j.note, at: when(j.at) }); else out.push({ who: 'sys', text: (mine ? 'You asked' : nm.split(' ')[0] + ' asked') + ' for this, ' + when(j.at) + '.' });   // a request is a quiet line, not a chat bubble
    if (j.status !== 'needs_input' && j.answers && j.answers.length) { (j.asked || []).forEach(q => out.push({ who: 'claude', text: q })); j.answers.forEach(x => out.push(mine ? { who: 'you', text: x } : { who: 'other', name: nm, text: x })); }   // the earlier question and your answer, above whatever Claude says next
    if (j.status === 'waiting') out.push({ who: 'sys', text: 'Queued. Claude checks for new work every 5 minutes while your Claude app is open.' });
    if (j.claimedAt && j.kind !== 'chat') out.push({ who: 'claude', text: 'Claude has started' + (who ? ' (on ' + who + "'s computer)" : '') + '.', at: when(j.claimedAt) });
    const act = j.activity.slice(-12); act.forEach((a, i, all) => out.push({ who: 'claude', text: a.text, at: when(a.at), typing: j.status === 'claimed' && i === all.length - 1 }));
    if (j.status === 'claimed' && !act.length) out.push({ who: 'claude', text: j.progress || 'Working on it…', typing: true });
    if (j.status === 'needs_input') out.push({ who: 'claude', text: j.questions.join(' ') + '  (Answer in the box below.)', at: when(j.finishedAt) });   // the question is a normal message; the box at the bottom is where you answer
    if (j.status === 'failed') out.push({ who: 'bad', text: 'This could not be completed: ' + (j.summary || 'unknown reason'), at: when(j.finishedAt) });
    if (j.status === 'done') { const o = OPEN[j.kind]; out.push({ who: 'claude', text: j.summary || 'Done.', at: when(j.finishedAt), actions: o ? [{ label: o[1], act: 'koOpen', attrs: { view: o[0] } }] : [] }); }
    return out;
  }
  function paint() {
    ensure(); const show = team(); panel.hidden = tab.hidden = !show; if (!show) { document.body.classList.remove('asst-open'); return; }
    const k = J() && J().K(); const jobs = k && Array.isArray(k.jobs) && k.pid === S.project.id ? L().jobRows(k.jobs).sort((x, y) => Date.parse(y.at || 0) - Date.parse(x.at || 0)) : [];   // newest first here; the thread below reverses it, so the newest chat is at the bottom const open = jobs.filter(j => j.open), ask = jobs.filter(j => j.status === 'needs_input').length;
    const a = st(); if (a.init !== S.project.id) { a.init = S.project.id; a.seen = {}; a.open = false; jobs.forEach(j => { if (j.status !== 'claimed' && j.status !== 'needs_input') a.seen[key(j)] = 1; }); }   // finished work does not pop the panel; work still running when the project opens does
    jobs.forEach(j => { if ((j.status === 'claimed' || j.status === 'needs_input') && !a.seen[key(j)]) { a.seen[key(j)] = 1; a.open = true; } });
    document.body.classList.toggle('asst-open', !!a.open); tab.className = open.length ? 'on' : ''; tab.innerHTML = '<span>Assistant</span>' + (ask ? '<i class="as-b">' + ask + '</i>' : open.length ? '<i class="as-p"></i>' : '');
    const sig = JSON.stringify([S.project.id, a.open, a.q || '', jobs.map(j => [j.id, j.status, j.progressAt, j.activity.length, j.finishedAt])]) ; const typing = document.activeElement && panel.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA' && document.activeElement.id !== 'asM';
    if (sig === a.sig || typing) return; a.sig = sig;
    const q = String(a.q || '').trim().toLowerCase(), has = m => String(m.text || '').toLowerCase().includes(q);   // search: a run whose title matches shows whole, otherwise only the lines that match
    const runs = jobs.slice().reverse().map(j => { let m = runMsgs(j, k); if (q && !(j.label + ' ' + (STAGE[j.stage] || '')).toLowerCase().includes(q)) { m = m.filter(has); if (!m.length) return ''; } return '<section class="as-run">' + (j.kind === 'chat' ? '' : '<div class="as-topic"><span>' + esc(j.label) + '</span></div>') + '<div class="ki-feed as-feed">' + W().feed(m) + '</div></section>'; }).join('');   // ONE thread, oldest at the top and newest at the bottom; each run starts with a heading that says what the chat is about
    const last = jobs.filter(j => j.claimedAt).map(j => ({ t: j.finishedAt || j.claimedAt, by: j.claimedBy })).sort((x, y) => Date.parse(y.t) - Date.parse(x.t))[0];
    const now = jobs.find(j => j.status === 'claimed'), ask1 = jobs.find(j => j.status === 'needs_input'), wait = jobs.find(j => j.status === 'waiting');   // one line at the top that says what is happening right now
    const nowTxt = ask1 ? 'Claude has a question for you: ' + (ask1.questions[0] || '') : now ? 'Claude is working: ' + (((now.activity[now.activity.length - 1] || {}).text) || now.progress || now.label) : wait ? 'Waiting for a Claude to pick this up: ' + wait.label + '. ' + (last ? 'Last Claude activity on this project: ' + ago(last.t) + ' (' + nice(last.by) + "'s computer). " : 'No Claude has worked on this project yet. ') + 'Any teammate whose Claude has the scheduled task switched on can take it.' : 'Nothing is running.';
    const comp = () => { const box = panel.querySelector('#asM'), chip = panel.querySelector('#asAsk'); if (box) box.placeholder = ask1 ? 'Type your answer to Claude here' : 'Message Claude'; if (chip) { chip.hidden = !ask1; chip.innerHTML = ask1 ? '<b>Claude is waiting for your answer</b><span>' + esc(ask1.questions.join(' ')) + '</span>' : ''; } };
    const strip = '<div class="as-now ' + (now ? 'run' : ask1 ? 'ask' : wait ? 'wait' : 'idle') + '"><i></i><span>' + esc(nowTxt) + '</span></div>';
    const body = strip + (runs ||'<p class="as-empty">' + (q ? 'Nothing matches “' + esc(a.q) + '”.' : 'Ask Claude anything about this project. Its replies and progress show here, on every tab.') + '</p>'); const bodyEl = panel.querySelector('.as-body');
    if (bodyEl) { const atEnd = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 90; bodyEl.innerHTML = body; if (atEnd) bodyEl.scrollTop = bodyEl.scrollHeight; comp(); return; }   // the search box stays as it is while you type; each run shows its newest line
    panel.innerHTML = '<div class="as-head"><div class="as-t"><i class="as-logo" aria-hidden="true">C</i><b>Assistant</b></div><div class="as-hb"><button type="button" class="as-ib" data-act="asstSearch" aria-label="Search the chat" title="Search the chat"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5 17 17"/></svg></button><button type="button" class="as-ib" data-act="asstToggle" aria-label="Close the assistant" title="Close"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg></button></div></div>'
      + '<div class="as-search"' + (a.sq || a.q ? '' : ' hidden') + '><input type="search" id="asQ" placeholder="Search the chat" aria-label="Search the assistant chat" value="' + esc(a.q || '') + '"></div><div class="as-body">' + body + '</div><div class="as-comp"><div id="asAsk" class="as-ask" hidden></div><div class="as-crow"><textarea id="asM" rows="1" maxlength="580" aria-label="Message to Claude"></textarea><button type="button" class="as-send" data-act="asstSend" aria-label="Send" title="Send"><svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M3 10l14-7-4 14-3-6z"/></svg></button></div></div>';
    comp();
    const b0 = panel.querySelector('.as-body'); if (b0) b0.scrollTop = b0.scrollHeight;   // opens at the newest message
  }
  V.ACT.asstSend = a => V.busy(a, async () => {
    const box = document.getElementById('asM'), note = box ? box.value.trim() : ''; if (!note) { V.toast('Write your message first.', 3000, true); return; } if (J().guard()) return;
    const k = J().K(), ask = k && Array.isArray(k.jobs) ? L().jobRows(k.jobs).find(j => j.status === 'needs_input') : null;   // when Claude has asked something, this box IS the answer
    if (ask) { await J().post('/jobs/' + encodeURIComponent(ask.id) + '/answer', { answers: [note] }); box.value = ''; const a3 = st(); a3.sig = ''; J().load(true); V.toast('Sent. Claude will continue.', 3500); return; }
    await J().post('/jobs', { kind: 'chat', note, ref: String(Date.now()), section: String(S.view || '') }); box.value = ''; const a2 = st(); a2.open = true; a2.sig = ''; J().load(true); V.toast('Sent. Claude answers here when it picks it up.', 4000);
  });
  document.addEventListener('keydown', e => { if (e.target && e.target.id === 'asM' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const b = document.querySelector('#asst [data-act=asstSend]'); if (b) b.click(); } });
  V.ACT.asstSearch = () => { const a = st(); a.sq = !a.sq; if (!a.sq) a.q = ''; a.sig = ''; const s = document.querySelector('#asst .as-search'); if (s) { s.hidden = !a.sq; const i = document.getElementById('asQ'); if (a.sq && i) i.focus(); else if (i) i.value = ''; } paint(); };
  V.ACT.asstToggle =() => { const a = st(); a.open = !a.open; a.sig = ''; paint(); };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'asM') { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; } });   // the message box grows with the text
  document.addEventListener('input', e => { if (e.target && e.target.id === 'asQ') { st().q = e.target.value; st().sig = ''; paint(); } });
  V.assistantPaint = paint;
  setInterval(() => {   // every two seconds: keep the panel in step with the project that is open; ask for the jobs list now and then
    try { ticks++; if (team() && J()) { const k = J().K(); if (k.pid !== S.project.id || !k.jobs) J().load(false); else if (ticks % 7 === 0 && (st().open || k.jobs.some(j => ['waiting', 'claimed', 'needs_input'].includes(j.status)))) J().load(true); } paint(); } catch (e) { /* the panel is optional: never break a page */ }
  }, 2000);
})(typeof window !== 'undefined' ? window : globalThis);
