/* Project assistant panel: ONE place, on the right of every project page, where the work Claude does for the project is shown as it happens (roadmap E15). It replaces a chat box on every tab: the tabs keep their results
   (tiles, review checklist, checks) and the questions that need an answer; this panel shows the running record, grouped by job and stage, and opens by itself when Claude picks up a job or asks something.
   Data: the project's jobs (shared list and polling from src/kickoff.js, V.studioJobs). The panel only reads and displays; answers go through the same actions as the tabs (koAns, koSend), and "Open ..." buttons use koOpen.
   Stages are labelled below; a new stage only needs its job kinds in work/server/_jobs.mjs and a line in OPEN here to get a button that opens its tab. Not shown to customers. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews;
  const STAGE = { intake: 'Contract and kick-off', requirements: 'Requirement sessions', brd: 'BRD', configuration: 'Configuration', uat: 'UAT', hypercare: 'Hypercare', other: 'Project' };
  const OPEN = { pull_msa: ['kickoff', 'Review the kick-off'], apply_change: ['kickoff', 'Review the kick-off'], pull_clari: ['rschecks', 'Review the checks'], extract_findings: ['rschecks', 'Review the checks'], check_brd: ['rschecks', 'Review the checks'], check_msa: ['rschecks', 'Review the checks'] };
  const st = () => S.ui.asst || (S.ui.asst = { open: false, seen: {}, init: '', sig: '' });
  const L = () => root.FWBKickoffLogic, W = () => root.FWBWorkChat, J = () => V.studioJobs;
  const team = () => !!(S.user && S.user.kind !== 'customer' && S.project && S.project.id && (!V.isCustomer || !V.isCustomer()));
  let panel = null, tab = null, ticks = 0;
  function ensure() {
    if (panel) return; panel = document.createElement('aside'); panel.id = 'asst'; panel.setAttribute('aria-label', 'Project assistant'); tab = document.createElement('button'); tab.id = 'asstTab'; tab.type = 'button'; tab.setAttribute('data-act', 'asstToggle'); tab.setAttribute('aria-label', 'Open or close the project assistant');
    document.body.appendChild(panel); document.body.appendChild(tab);
  }
  const key = j => j.id + ':' + (j.status === 'needs_input' ? 'q' : 'c') + ':' + (j.claimedAt || '');
  function runMsgs(j, k) {
    const when = J().when, who = String(j.claimedBy || '').split('@')[0], out = []; out.push({ who: 'you', text: 'I asked: ' + j.label + '.', at: when(j.at) });
    if (j.status === 'waiting') out.push({ who: 'sys', text: 'Queued. Claude checks for new work every 5 minutes while your Claude app is open.' });
    if (j.claimedAt) out.push({ who: 'claude', text: 'Claude has started' + (who ? ' (on ' + who + "'s computer)" : '') + '.', at: when(j.claimedAt) });
    const act = j.activity.slice(-12); act.forEach((a, i, all) => out.push({ who: 'claude', text: a.text, at: when(a.at), typing: j.status === 'claimed' && i === all.length - 1 }));
    if (j.status === 'claimed' && !act.length) out.push({ who: 'claude', text: j.progress || 'Working on it…', typing: true });
    if (j.status === 'needs_input') out.push({ who: 'claude', text: 'One question: ' + j.questions.join(' '), at: when(j.finishedAt), reply: { fields: j.questions.map((q, i) => ({ value: ((k.answers[j.id] || [])[i]) || '', attrs: { change: 'koAns', id: j.id, i } })), send: { label: 'Send my answer', act: 'koSend', attrs: { id: j.id, n: j.questions.length } } } });
    if (j.status === 'failed') out.push({ who: 'bad', text: 'This could not be completed: ' + (j.summary || 'unknown reason'), at: when(j.finishedAt) });
    if (j.status === 'done') { const o = OPEN[j.kind]; out.push({ who: 'claude', text: j.summary || 'Done.', at: when(j.finishedAt), actions: o ? [{ label: o[1], act: 'koOpen', attrs: { view: o[0] } }] : [] }); }
    return out;
  }
  function paint() {
    ensure(); const show = team(); panel.hidden = tab.hidden = !show; if (!show) { document.body.classList.remove('asst-open'); return; }
    const k = J() && J().K(); const jobs = k && Array.isArray(k.jobs) && k.pid === S.project.id ? L().jobRows(k.jobs) : []; const open = jobs.filter(j => j.open), ask = jobs.filter(j => j.status === 'needs_input').length;
    const a = st(); if (a.init !== S.project.id) { a.init = S.project.id; a.seen = {}; a.open = false; jobs.forEach(j => { if (j.status !== 'claimed' && j.status !== 'needs_input') a.seen[key(j)] = 1; }); }   // finished work does not pop the panel; work still running when the project opens does
    jobs.forEach(j => { if ((j.status === 'claimed' || j.status === 'needs_input') && !a.seen[key(j)]) { a.seen[key(j)] = 1; a.open = true; } });
    document.body.classList.toggle('asst-open', !!a.open); tab.className = open.length ? 'on' : ''; tab.innerHTML = '<span>Assistant</span>' + (ask ? '<i class="as-b">' + ask + '</i>' : open.length ? '<i class="as-p"></i>' : '');
    const sig = JSON.stringify([S.project.id, a.open, a.q || '', jobs.map(j => [j.id, j.status, j.progressAt, j.activity.length, j.finishedAt])]) + JSON.stringify(k ? k.answers : {}); const typing = document.activeElement && panel.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA';
    if (sig === a.sig || typing) return; a.sig = sig;
    const q = String(a.q || '').trim().toLowerCase(), has = m => String(m.text || '').toLowerCase().includes(q);   // search: a run whose title matches shows whole, otherwise only the lines that match
    const runs = jobs.slice().reverse().map(j => { let m = runMsgs(j, k); if (q && !(j.label + ' ' + (STAGE[j.stage] || '')).toLowerCase().includes(q)) { m = m.filter(has); if (!m.length) return ''; } return '<section class="as-run"><div class="as-topic"><b>' + esc(j.label) + '</b><span>' + esc((STAGE[j.stage] || STAGE.other) + ' · ' + j.statusLabel) + '</span></div><div class="ki-feed as-feed">' + W().feed(m) + '</div></section>'; }).join('');   // ONE thread, oldest at the top and newest at the bottom; each run starts with a heading that says what the chat is about
    const now = jobs.find(j => j.status === 'claimed'), ask1 = jobs.find(j => j.status === 'needs_input'), wait = jobs.find(j => j.status === 'waiting');   // one line at the top that says what is happening right now
    const nowTxt = ask1 ? 'Claude has a question for you: ' + (ask1.questions[0] || '') : now ? 'Claude is working: ' + (((now.activity[now.activity.length - 1] || {}).text) || now.progress || now.label) : wait ? 'Waiting for Claude to pick up: ' + wait.label + '. Claude checks every 5 minutes while the scheduled task is switched on.' : 'Nothing is running.';
    const strip = '<div class="as-now ' + (now ? 'run' : ask1 ? 'ask' : wait ? 'wait' : 'idle') + '"><i></i><span>' + esc(nowTxt) + '</span></div>';
    const body = strip + (runs ||'<p class="as-empty">' + (q ? 'Nothing matches “' + esc(a.q) + '”.' : 'Nothing is running. When you ask for something Claude helps with (reading a contract, pulling transcripts), its progress appears here, whatever tab you are on.') + '</p>'); const bodyEl = panel.querySelector('.as-body');
    if (bodyEl) { const atEnd = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 90; bodyEl.innerHTML = body; if (atEnd) bodyEl.scrollTop = bodyEl.scrollHeight; return; }   // the search box stays as it is while you type; each run shows its newest line
    panel.innerHTML = '<div class="as-head"><div><b>Your project assistant</b><span>Prepared with Claude\'s help, on your own computer. You review and decide.</span></div><button type="button" class="btn sm" data-act="asstToggle" aria-label="Close the assistant">Close</button></div>'
      + '<div class="as-search"><input type="search" id="asQ" placeholder="Search the chat" aria-label="Search the assistant chat" value="' + esc(a.q || '') + '"></div><div class="as-body">' + body + '</div>';
    const b0 = panel.querySelector('.as-body'); if (b0) b0.scrollTop = b0.scrollHeight;   // opens at the newest message
  }
  V.ACT.asstToggle =() => { const a = st(); a.open = !a.open; a.sig = ''; paint(); };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'asQ') { st().q = e.target.value; st().sig = ''; paint(); } });
  V.assistantPaint = paint;
  setInterval(() => {   // every two seconds: keep the panel in step with the project that is open; ask for the jobs list now and then
    try { ticks++; if (team() && J()) { const k = J().K(); if (k.pid !== S.project.id || !k.jobs) J().load(false); else if (ticks % 7 === 0 && (st().open || k.jobs.some(j => ['waiting', 'claimed', 'needs_input'].includes(j.status)))) J().load(true); } paint(); } catch (e) { /* the panel is optional: never break a page */ }
  }, 2000);
})(typeof window !== 'undefined' ? window : globalThis);
