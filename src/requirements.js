/* Stage 2, Requirement sessions (roadmap E15): three tabs under one main tab.
   Workshop plan (view rsplan): the session plan drafted from the contract, moved here from Project Plan (src/kickoff.js keeps its builder, V.planSessions).
   Transcripts (view rstrans): the same conversation component as Contract intake (src/workchat.js). Two ways in, both always available: the person adds a transcript (a file, or pasted text), or asks Claude to pull
     the Clari transcripts of the sessions already held and to list what they show (Claude's notes appear as messages, in order).
   Checks & validations (view rschecks): what was promised, asked, used as use cases or custom use cases, requested extra, decided or risky, each with its quote. Claude's findings are PROPOSALS: nothing is a requirement
     until a person confirms it (name and time recorded). The person can also add a check by hand.
   Documents (team only): rs_transcripts and rs_findings; the rules for saving them are in work/server/_rsapi.mjs. The jobs state and polling are shared with src/kickoff.js (V.studioJobs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast, tag } = V;
  (V.extraSections = V.extraSections || []).push('rs_transcripts', 'rs_findings');
  const J = () => V.studioJobs; const L = () => root.FWBKickoffLogic; const TP = () => root.FWBTranscriptParse;
  const KINDS = [['promise', 'Promised by us', 'What Facilio said it would do or provide.'], ['ask', 'Asked by the customer', 'What the customer asked for.'], ['usecase', 'Use cases', 'Business scenarios the customer described.'], ['custom_usecase', 'Custom use cases', 'Scenarios that need something beyond the standard product.'],
    ['additional', 'Additional requests', 'Extra requests, or anything that may be outside the contract.'], ['decision', 'Decisions', 'What was agreed in the session.'], ['risk', 'Risks and concerns', 'Anything that could delay or change the delivery.']];
  const trs = () => { const d = F.doc('rs_transcripts'); return d && Array.isArray(d.items) ? d.items : []; };
  const fds = () => { const d = F.doc('rs_findings'); return d && Array.isArray(d.items) ? d.items : []; };
  const ro = () => !!S.readonly || (S.project && S.project.role === 'viewer');
  const head = (h, p) => '<div class="page-header"><div class="t"><h1>' + esc(h) + '</h1><p>' + esc(p) + '</p></div></div>';
  const jobsOf = () => L().jobRows(J().K().jobs || []).filter(x => (x.kind === 'pull_clari' || x.kind === 'extract_findings') && x.status !== 'cancelled');
  const val = id => (document.getElementById(id) || {}).value || '';

  // ---------- Workshop plan ----------
  V.rsplan = { html() { return V.isCustomer() ? '' : head('Workshop plan', 'The requirement sessions planned from the contract: the modules, the agenda for each, and who needs to attend. It is a draft for you to adjust before it goes to the customer.') + '<div class="page-body ko">' + V.planSessions.html() + '</div>'; }, mount() { /* the sessions are made when the page opens (V.planSessions.html) */ } };

  // ---------- Transcripts ----------
  function chat() {
    const k = J().K(), when = J().when, jobs = jobsOf(), j = jobs[0]; const T = trs(), Fd = fds(); const open = Fd.filter(x => x.status === 'open').length;
    const who = j ? String(j.claimedBy || '').split('@')[0] : ''; const working = !!j && j.status === 'claimed'; const msgs = [];
    if (!j) msgs.push({ who: 'sys', text: T.length ? 'Your transcripts are listed below. Add more yourself, or ask Claude to pull them from Clari.' : "Add a transcript yourself (a file or pasted text), or ask Claude to pull your Clari transcripts. Either way a first list of what was promised and asked can be prepared for you to check; nothing counts until you confirm it." });
    if (j) msgs.push({ who: 'you', text: j.kind === 'pull_clari' ? 'I asked for my Clari transcripts.' : 'I asked for the promises and asks in my transcripts.', at: when(j.at) });
    if (j && j.status === 'waiting') msgs.push({ who: 'sys', text: 'Your request is queued. Claude checks for new work every 5 minutes while your Claude app is open, so it can take up to 5 minutes to start.' });
    if (j && j.claimedAt) msgs.push({ who: 'claude', text: 'Claude has started' + (who ? ' (on ' + who + "'s computer)" : '') + '.', at: when(j.claimedAt) });
    if (j && j.activity.length) j.activity.forEach((a, i, all) => msgs.push({ who: 'claude', text: a.text, at: when(a.at), typing: working && i === all.length - 1 })); else if (working) msgs.push({ who: 'claude', text: j.progress || 'Working on it…', typing: true });
    if (j && j.status === 'needs_input') msgs.push({ who: 'claude', text: 'One question before I can continue: ' + j.questions.join(' '), at: when(j.finishedAt), reply: { fields: j.questions.map((q, i) => ({ value: ((k.answers[j.id] || [])[i]) || '', attrs: { change: 'koAns', id: j.id, i } })), send: { label: 'Send my answer', act: 'koSend', attrs: { id: j.id, n: j.questions.length } } } });
    if (j && j.status === 'failed') msgs.push({ who: 'bad', text: 'This could not be completed: ' + (j.summary || 'unknown reason'), at: when(j.finishedAt) });
    if (j && j.status === 'done') msgs.push({ who: 'claude', text: T.length + ' transcript' + (T.length === 1 ? ' is' : 's are') + ' in and ' + Fd.length + ' proposed finding' + (Fd.length === 1 ? ' is' : 's are') + ' ready for your review. ' + (j.summary || ''), at: when(j.finishedAt), actions: Fd.length ? [{ label: 'Review the checks', act: 'koOpen', attrs: { view: 'rschecks' }, primary: true }] : [] });
    const tiles = [
      { label: 'Transcripts', detail: T.length ? T.length + ' in the project' : '', state: T.length ? 'done' : working ? 'now' : 'todo' },
      { label: 'What was promised and asked', detail: Fd.length ? Fd.length + ' listed, ' + open + ' to review' : '', state: Fd.length ? 'done' : working && T.length ? 'now' : 'todo', open: { label: 'Review', act: 'koOpen', attrs: { view: 'rschecks' } } }
    ];
    const dis = ro() ? ' disabled' : ''; const busy = jobs.some(x => x.open);
    const composer = '<button type="button" class="btn" data-act="rsAddFile"' + dis + '>Add a transcript file</button><button type="button" class="btn" data-act="rsPaste"' + dis + '>Paste a transcript</button><span class="spacer"></span>'
      + (T.length && !busy ? '<button type="button" class="btn" data-act="rsFind"' + dis + '>Find the promises and asks</button>' : '') + '<button type="button" class="btn primary" data-act="rsPull"' + dis + (busy ? ' disabled' : '') + '>' + (busy ? 'Working…' : 'Pull my Clari transcripts') + '</button>';
    return root.FWBWorkChat.html({ lite: true, title: 'Your transcripts', hint: j && j.claimedAt ? "Prepared with Claude's help, on " + (who ? who + "'s" : 'your') + ' computer. ' + (j.progressAt ? 'Last update ' + when(j.progressAt) + '.' : '') : "You can add transcripts yourself, or have them pulled for you with Claude's help. You review and decide.", messages: msgs, tiles, tilesTitle: 'From your transcripts', composer });
  }
  function list() {
    const T = trs(), Fd = fds(), dt = J().dt; if (!T.length) return '';
    const rows = T.map(x => { const n = Fd.filter(f => f.transcriptId === x.id).length; return '<tr><td>' + esc(x.title) + '</td><td>' + esc(dt(x.date) || '') + '</td><td>' + esc(x.source === 'clari' ? 'Clari' : 'Added by you') + '</td><td>' + Math.max(1, Math.round(String(x.text || '').length / 1000)) + ' k characters</td><td>' + n + '</td><td><button type="button" class="btn sm" data-act="rsRead" data-id="' + esc(x.id) + '">Read</button> <button type="button" class="btn sm danger" data-act="rsRemoveT" data-id="' + esc(x.id) + '"' + (ro() ? ' disabled' : '') + '>Remove</button></td></tr>'; }).join('');
    return '<section class="card ko-card"><div class="card-h"><b>Transcripts in this project</b><span class="xs muted">' + T.length + '</span></div><div class="card-b"><div class="tw"><table><thead><tr><th>Session</th><th>Date</th><th>From</th><th>Size</th><th>Findings</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div></section>';
  }
  V.rstrans = { html() { return V.isCustomer() ? '' : head('Transcripts', "Add the transcripts of the requirement sessions already held, yourself or pulled from Clari with Claude's help. A first list of what was promised and asked can be prepared for you; you review it on Checks & validations.") + '<div class="page-body ko">' + chat() + list() + '</div>'; },
    mount() { if (V.isCustomer()) return; J().load(false); J().poll(); } };

  // ---------- actions: Claude's way ----------
  ACT.rsPull = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'pull_clari', note: [S.project.customer, S.project.name].filter(Boolean).join(' / ').slice(0, 200) }); toast(r.duplicate ? 'A request to pull your transcripts is already waiting.' : 'Requested. Claude picks it up at its next check; follow it here.', 6000); });
  ACT.rsFind = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'extract_findings' }); toast(r.duplicate ? 'That request is already waiting.' : 'Requested. Follow it here.', 5000); });

  // ---------- actions: the person's own way ----------
  async function addTranscript(title, text, ref) {
    text = String(text || '').trim().slice(0, 120000); if (text.length < 20) { toast('There is no transcript text to add.', 6000, true); return false; }
    const items = trs().slice(); if (ref && items.some(x => x.ref === ref)) { toast('That transcript is already in the project.', 5000); return false; }
    const id = 'tr_' + (Math.max(0, ...items.map(x => parseInt(String(x.id).slice(3), 10) || 0)) + 1); const prev = F.doc('rs_transcripts');
    J().setDoc('rs_transcripts', { items: items.concat({ id, title: String(title || 'Transcript').slice(0, 200), date: '', source: 'upload', ref: ref || '', text, at: new Date().toISOString() }) }); F.changed(null, null, { section: 'rs_transcripts' });
    if (!(await J().saved('rs_transcripts'))) { J().setDoc('rs_transcripts', prev); S.docs.rs_transcripts.dirty = false; V.render(); toast('Not saved: the server refused it or the connection failed. Nothing was changed.', 7000, true); return false; }
    toast('Transcript added. You can add your own checks from it, or ask for a first list of the promises and asks.', 7000); return true;
  }
  ACT.rsAddFile = async () => {
    if (J().guard()) return; const f = (await V.pickFile('.vtt,.srt,.txt,.json'))[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) { toast('That file is larger than 4 MB.', 5000, true); return; }
    let r; try { r = TP().parseTranscriptInfo(await f.text(), f.name); } catch (e) { toast('The file could not be read: ' + (e.message || 'error'), 6000, true); return; }
    await addTranscript(f.name.replace(/\.[^.]+$/, ''), (r.chunks || []).map(c => (c.at !== '' && c.at != null ? '[' + TP().fmtAt(c.at) + '] ' : '') + (c.speaker ? c.speaker + ': ' : '') + c.text).join('\n'), 'file:' + f.name + ':' + f.size);
  };
  ACT.rsPaste = () => { if (J().guard()) return; V.drawer('Paste a transcript', '<div class="fgrid"><div class="full"><label class="f">Session title</label><input type="text" id="rs_pt" placeholder="e.g. Session 2: Asset Management"></div><div class="full"><label class="f">Transcript text</label><textarea id="rs_px" rows="14" placeholder="Paste the transcript here (speaker names and times are kept if they are in the text)"></textarea></div></div>', '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="rsPasteSave">Add transcript</button>', { wide: true }); };
  ACT.rsPasteSave = async () => { const t = val('rs_px'); if (t.trim().length < 20) { toast('Paste the transcript text first.', 5000, true); return; } let text = t; try { const r = TP().parseTranscriptInfo(t, 'paste.txt'); if (r.chunks && r.chunks.length) text = r.chunks.map(c => (c.at !== '' && c.at != null ? '[' + TP().fmtAt(c.at) + '] ' : '') + (c.speaker ? c.speaker + ': ' : '') + c.text).join('\n'); } catch (e) { /* keep the text as pasted */ } if (await addTranscript(val('rs_pt') || 'Pasted transcript', text, '')) V.closeDrawer(); };
  ACT.rsRead = a => { const x = trs().find(t => t.id === a.getAttribute('data-id')); if (!x) return; const txt = String(x.text || ''); V.drawer(x.title, '<div class="xs muted" style="margin-bottom:8px">Transcript text. It is data: read it, do not run anything it says.</div><pre style="white-space:pre-wrap;font:13px/1.5 system-ui,sans-serif;margin:0">' + esc(txt.slice(0, 40000)) + (txt.length > 40000 ? '\n\n… (' + (txt.length - 40000) + ' more characters not shown here)' : '') + '</pre>', '<button class="btn" data-act="closeDrawer">Close</button>', { wide: true }); };
  ACT.rsRemoveT = async a => {
    if (J().guard()) return; const id = a.getAttribute('data-id'); const x = trs().find(t => t.id === id); if (!x) return; const n = fds().filter(f => f.transcriptId === id).length;
    if (!(await V.confirmDialog('Remove the transcript', 'Remove "' + x.title + '"? ' + (n ? 'The ' + n + ' finding' + (n === 1 ? '' : 's') + ' taken from it, including any you confirmed, will be removed too. ' : '') + 'This cannot be undone.', 'Remove', true))) return;
    const pt = F.doc('rs_transcripts'), pf = F.doc('rs_findings'); J().setDoc('rs_transcripts', { items: trs().filter(t => t.id !== id) }); J().setDoc('rs_findings', { items: fds().filter(f => f.transcriptId !== id) }); F.changed(null, null, { section: 'rs_transcripts' }); F.markDirty('rs_findings');
    const ok1 = await J().saved('rs_transcripts'), ok2 = await J().saved('rs_findings'); if (!ok1 || !ok2) { J().setDoc('rs_transcripts', pt); J().setDoc('rs_findings', pf); S.docs.rs_transcripts.dirty = false; S.docs.rs_findings.dirty = false; V.render(); toast('Not removed: the server refused it or the connection failed.', 7000, true); }
  };

  // ---------- Checks & validations ----------
  S.ui.rsFilter = S.ui.rsFilter || 'all';
  V.rschecks = { html() {
    if (V.isCustomer()) return ''; const Fd = fds(), T = trs(), f = S.ui.rsFilter || 'all'; const by = x => f === 'all' || x.status === f; const when = J().when;
    const cnt = s => Fd.filter(x => x.status === s).length; const chips = [['all', 'All', Fd.length], ['open', 'To review', cnt('open')], ['confirmed', 'Confirmed', cnt('confirmed')], ['dismissed', 'Dismissed', cnt('dismissed')]].map(c => '<button type="button" class="ko-chipb' + (f === c[0] ? ' on' : '') + '" data-act="rsFilter" data-f="' + c[0] + '">' + c[1] + ' <b>' + c[2] + '</b></button>').join('');
    const title = id => id ? ((T.find(t => t.id === id) || {}).title || 'Transcript') : 'Added by you';
    const sections = KINDS.map(([k, label, hint]) => { const items = Fd.filter(x => x.kind === k && by(x)); const all = Fd.filter(x => x.kind === k).length; if (!all) return '';
      return '<section class="card ko-card" aria-label="' + esc(label) + '"><div class="card-h"><b>' + esc(label) + '</b><span class="xs muted">' + esc(hint) + ' ' + all + ' listed</span></div><div class="card-b">' + (items.length ? items.map(x => '<div class="rs-f ' + esc(x.status) + '"><div class="rs-t">' + esc(x.text) + '</div>' + (x.quote ? '<blockquote>' + esc(x.quote) + '</blockquote>' : '') + '<div class="xs muted">' + esc([x.speaker, x.at, title(x.transcriptId)].filter(Boolean).join(' · ')) + '</div>'
        + '<div class="row ko-btns">' + tag(x.status === 'confirmed' ? 'ok' : x.status === 'dismissed' ? 'low' : 'tbc', x.status === 'confirmed' ? 'Confirmed' : x.status === 'dismissed' ? 'Dismissed' : 'To review') + (x.by ? '<span class="xs muted">' + esc(String(x.by).split('@')[0]) + ', ' + esc(when(x.byAt)) + '</span>' : '')
        + (ro() ? '' : (x.status === 'open' ? '<button type="button" class="btn sm primary" data-act="rsDecide" data-id="' + esc(x.id) + '" data-s="confirmed">Confirm</button><button type="button" class="btn sm" data-act="rsDecide" data-id="' + esc(x.id) + '" data-s="dismissed">Dismiss</button>' : '<button type="button" class="btn sm" data-act="rsDecide" data-id="' + esc(x.id) + '" data-s="open">Reopen</button>')) + '</div></div>').join('') : '<p class="xs muted">Nothing in this filter.</p>') + '</div></section>'; }).join('');
    const bar = '<div class="row ko-btns" style="justify-content:space-between;align-items:center"><div class="row ko-chips2">' + (Fd.length ? chips : '') + '</div><button type="button" class="btn sm primary" data-act="rsAddCheck"' + (ro() ? ' disabled' : '') + '>Add a check myself</button></div>';
    const body = bar + (Fd.length ? sections : '<div class="card ko-card"><div class="card-b"><p>Nothing to check yet. Add a transcript, then add your own checks or ask for a first list; what was promised, asked and decided in the sessions will be listed here for you to confirm.</p><div class="row ko-btns"><button type="button" class="btn sm" data-act="nav" data-view="rstrans">Go to Transcripts</button></div></div></div>');
    return head('Checks & validations', 'What the sessions show: what we promised, what the customer asked for, use cases and extra requests. Anything taken from a transcript by Claude is a proposal: nothing is a requirement until you confirm it.') + '<div class="page-body ko">' + body + '</div>'; },
    mount() { if (V.isCustomer()) return; J().load(false); J().poll(); } };
  ACT.rsFilter = a => { S.ui.rsFilter = a.getAttribute('data-f') || 'all'; V.render(); };
  ACT.rsDecide = async a => {
    if (J().guard()) return; const id = a.getAttribute('data-id'), st = a.getAttribute('data-s'); if (!['confirmed', 'dismissed', 'open'].includes(st)) return; const prev = JSON.parse(JSON.stringify(F.doc('rs_findings') || { items: [] }));
    J().setDoc('rs_findings', { items: fds().map(x => (x.id === id ? Object.assign({}, x, { status: st, by: st === 'open' ? '' : S.user.email, byAt: st === 'open' ? '' : new Date().toISOString() }) : x)) }); F.changed(null, null, { section: 'rs_findings' });
    if (!(await J().saved('rs_findings'))) { J().setDoc('rs_findings', prev); S.docs.rs_findings.dirty = false; V.render(); toast('Not saved: the server refused it or someone changed this at the same time. Nothing was changed; try again.', 7000, true); }
  };
  ACT.rsAddCheck = () => { if (J().guard()) return; V.drawer('Add a check myself', '<div class="fgrid"><div class="full"><label class="f">What kind</label><select id="rs_ck">' + KINDS.map(k => '<option value="' + k[0] + '">' + esc(k[1]) + '</option>').join('') + '</select></div><div class="full"><label class="f">What was said or agreed</label><input type="text" id="rs_ct" maxlength="400" placeholder="One plain sentence"></div><div class="full"><label class="f">The words used (optional)</label><textarea id="rs_cq" rows="3" maxlength="500"></textarea></div><div class="full"><label class="f">Who said it (optional)</label><input type="text" id="rs_cs" maxlength="80"></div></div>', '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="rsAddCheckSave">Add check</button>'); };
  ACT.rsAddCheckSave = async () => {
    const text = val('rs_ct').replace(/\s+/g, ' ').trim(); if (!text) { toast('Write what was said or agreed.', 5000, true); return; } const kind = val('rs_ck'); if (!KINDS.some(k => k[0] === kind)) return; const items = fds().slice(); const prev = F.doc('rs_findings'); const now = new Date().toISOString();
    const id = 'fd_' + (Math.max(0, ...items.map(x => parseInt(String(x.id).slice(3), 10) || 0)) + 1); J().setDoc('rs_findings', { items: items.concat({ id, transcriptId: '', kind, text: text.slice(0, 400), quote: val('rs_cq').replace(/\s+/g, ' ').trim().slice(0, 500), speaker: val('rs_cs').trim().slice(0, 80), at: '', status: 'confirmed', by: S.user.email, byAt: now, savedAt: now, manual: true }) }); F.changed(null, null, { section: 'rs_findings' });
    if (!(await J().saved('rs_findings'))) { J().setDoc('rs_findings', prev); S.docs.rs_findings.dirty = false; V.render(); toast('Not saved: the server refused it or the connection failed.', 7000, true); return; } V.closeDrawer(); toast('Check added.', 3000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
