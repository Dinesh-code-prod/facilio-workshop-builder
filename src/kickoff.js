/* Kick-off (roadmap E15 Stage 1, E17): the team's one big tab for the start of a project. View id `kickoff`, #/p/<id>/kickoff. Customers keep the older Kick-off Deck viewer (src/viewers.js).
   Shows the contract (MSA) status, the draft kick-off pack Claude built from the approved extraction (scope, modules, plan with where each date comes from, gaps, assumptions, conflicts), the job
   list (a job is a request Claude picks up in the person's own session through the Studio connector; the page never calls Claude), change requests, the deck preview, and one Approve.
   Project documents: `kickoff_pack` (written by the server when the project is created from an approved MSA extraction) and `kickoff_cr` (change requests). All rules: src/kickofflogic.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const L = () => root.FWBKickoffLogic; const { toast, tag } = V;
  (V.extraSections = V.extraSections || []).push('kickoff_pack', 'kickoff_cr');
  const FRESH_MS = 20000, POLL_MS = 15000;
  const K = () => S.ui.ko || (S.ui.ko = { pid: '', jobs: null, at: 0, err: '', msa: null, answers: {}, cr: '', busy: '' });
  const ours = () => ['kickoff', 'msaintake', 'rstrans', 'rschecks'].includes(S.ui.view);
  const pid = () => (S.project && S.project.id) || '';
  const team = () => !V.isCustomer();
  const ro = () => !!S.readonly || (S.project && S.project.role === 'viewer');
  const owner = () => !!(S.project && S.project.role === 'owner') && !S.readonly;
  const pack = () => L().packOf(F.doc('kickoff_pack'));
  const crDoc = () => { const d = F.doc('kickoff_cr'); return d && typeof d === 'object' ? d : { items: [] }; };
  const dt = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const when = iso => { const t = Date.parse(iso); return isFinite(t) ? new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
  const setDoc = (section, data) => { F.doc(section); S.docs[section].data = data; };   // the document may not exist yet
  const base = () => `/api/projects/${encodeURIComponent(pid())}`;
  let timer = 0;
  const reset = k => Object.assign(k, { pid: pid(), jobs: null, at: 0, err: '', msa: null, answers: {}, cr: '', slide: 0, sig: '', loading: false });

  // ---------- data ----------
  async function load(force, paint) {
    const k = K(); if (!pid() || !team()) return;
    if (k.pid !== pid()) reset(k);
    if (!force && k.loading || (!force && k.at && Date.now() - k.at < FRESH_MS)) return;
    k.loading = true; const mine = pid();
    try {
      const [j, x] = await Promise.all([API.get(base() + '/jobs?status=all'), API.get(base() + '/transfers?kind=msa').catch(() => null)]);
      if (mine !== pid()) return;
      const sig = JSON.stringify(j.jobs.map(a => [a.id, a.status, (a.result || {}).summary, (a.progress || {}).text])); const changed = sig !== k.sig; k.sig = sig; k.jobs = j.jobs; k.err = '';
      k.msa = x && Array.isArray(x.transfers) ? x.transfers.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null : k.msa; k.at = Date.now(); k.loading = false;
      if (changed) for (const sec of ['kickoff_cr', 'kickoff_pack', 'rs_transcripts', 'rs_findings']) if (S.docs[sec] && !S.docs[sec].dirty && !S.docs[sec].inflight) { try { await F.reloadSection(sec); } catch (e) { /* the page keeps the copy it has; Refresh tries again */ } }
      if (mine !== pid()) return;
      if (V.assistantPaint) V.assistantPaint();
      if (changed || paint) repaint();
    } catch (e) { if (mine !== pid()) return; k.err = e.message || 'The job list could not be loaded'; k.at = Date.now(); k.loading = false; k.jobs = k.jobs || []; repaint(); }
  }
  function repaint() { if (!ours()) return; const a = document.activeElement; if (a && a.tagName === 'TEXTAREA' && a.closest('.ko')) { K().sig = ''; return; } V.render(); }   // skipped while typing: the next poll paints it

  function poll() {
    if (timer) return;
    timer = setInterval(() => { if (!ours() || document.hidden) { if (!ours()) { clearInterval(timer); timer = 0; } return; } const k = K(); if (k.jobs && k.jobs.some(j => ['waiting', 'claimed', 'needs_input'].includes(j.status))) load(true); }, POLL_MS);
  }

  // ---------- panels ----------
  // ---------- Contract intake: one conversation (Studio, Claude and the person) and the four things Claude prepares ----------
  const msaFile = () => { const m = (V.plannerDoc && V.plannerDoc() || {}).msa; return m && m.name ? m.name : ''; };
  function chatCard(p) {
    const k = K(); const j = L().jobRows(k.jobs).filter(x => x.kind === 'pull_msa' && x.status !== 'cancelled')[0]; const raw = j ? (k.jobs || []).find(x => x.id === j.id) || {} : {};
    const file = (j && (/uploaded file: (.+?)(?: \(text kept|$)/.exec((raw.params || {}).note || '') || [])[1]) || msaFile() || ''; const who = j ? String(j.claimedBy || '').split('@')[0] : '';
    const pk = F.doc('kickoff_pack'); const built = p && pk ? pk.builtAt : ''; const pl = F.doc('planner') || {}; const nSess = (pl.sessions || []).filter(x => x.fromPack === built && x.status !== 'optional').length; const sessNote = !nSess && p && Array.isArray(pl.sessionNotes) && pl.sessionNotes.length ? pl.sessionNotes[0] : '';
    const pv = ((F.doc('plan') || {}).versions || [])[0]; const book = !!(pv && pv.source === 'kickoff' && pv.fromPack === built); const bookFailed = !!p && !book && S.ui.koPlanTried === built && !planBusy;
    const slides = p && root.FWBKickoffDeck ? root.FWBKickoffDeck.build(p.deck, { fmt: dt }).slides.length : 0;
    const extracted = !!p || (!!j && j.status === 'done'); const reading = !!j && j.status === 'claimed' && !extracted; const sessDone = nSess > 0 || !!sessNote; const approved = !!p && p.status === 'approved';
    const st = (done, now) => done ? 'done' : now ? 'now' : 'todo'; const badge = approved ? 'Approved' : p ? 'Draft' : '';
    const tiles = [
      { label: 'Project plan', detail: p ? p.milestones.length + ' phases, ' + dt(p.window.start) + ' to ' + dt(p.window.end) : '', state: st(!!p, extracted && !p), badge, open: { label: 'Open', act: 'koOpen', attrs: { view: 'plan', t: 'wb' } } },
      { label: 'Kick-off deck', detail: p ? slides + ' slides with speaker notes' : '', state: st(!!p, extracted && !p), badge, open: { label: 'Open', act: 'koOpen', attrs: { view: 'kickoff' } } },
      { label: 'Requirement sessions', detail: nSess ? nSess + ' session' + (nSess === 1 ? '' : 's') + ', grouped by module' : sessNote, state: st(sessDone, !!p && !sessDone), badge: sessDone ? badge : '', open: { label: 'Open', act: 'koOpen', attrs: { view: 'plan', t: 'rs' } } },
      { label: 'Plan workbook and timeline', detail: book ? 'in the Project Plan tab' : bookFailed ? 'could not be made, open Project Plan to retry' : '', state: book ? 'done' : bookFailed ? 'bad' : st(false, !!p), badge: book ? badge : '', open: { label: 'Open', act: 'koOpen', attrs: { view: 'plan', t: 'wb' } } }
    ];
    const msgs = []; const sw = L().jobRows(k.jobs).filter(x => x.kind === 'setup_workspace' && x.status !== 'cancelled')[0];
    if (sw) { msgs.push({ who: 'sys', text: 'A project folder and a chat are being set up for this project in your Claude app.', at: when(sw.at) }); if (sw.status === 'done') msgs.push({ who: 'claude', text: 'Your project workspace is ready. ' + (sw.summary || ''), at: when(sw.finishedAt) }); else if (sw.status === 'failed') msgs.push({ who: 'bad', text: 'I could not set up the workspace: ' + (sw.summary || 'unknown reason') }); else if (sw.status === 'claimed') msgs.push({ who: 'claude', text: sw.progress || 'Setting up the folder…', typing: true }); }
    if (!j && !p && !file) msgs.push({ who: 'sys', text: "Welcome. Upload the signed MSA below. A first draft of the project plan, the kick-off deck and the requirement sessions is prepared for you, with Claude's help. You check it, correct it and approve it." });
    if (file) msgs.push({ who: 'you', text: 'I uploaded ' + file + '.', at: j ? when(j.at) : '' });
    if (j && j.status === 'waiting') msgs.push({ who: 'sys', text: 'Your request is queued. Claude checks for new work every 5 minutes while your Claude app is open, so the draft can take up to 5 minutes to start.' });
    if (j && j.claimedAt) msgs.push({ who: 'claude', text: 'Claude has started reading your contract' + (who ? ' (on ' + who + "'s computer)" : '') + ', page by page.', at: when(j.claimedAt) });
    if (j && j.activity.length) j.activity.forEach((a, i, all) => msgs.push({ who: 'claude', text: a.text, at: when(a.at), typing: reading && i === all.length - 1 })); else if (reading) msgs.push({ who: 'claude', text: j.progress || 'Reading the contract…', typing: true });
    if (j && j.status === 'needs_input') { const kk = K(); msgs.push({ who: 'claude', text: 'One question before the draft can continue: ' + j.questions.join(' '), at: when(j.finishedAt), reply: { fields: j.questions.map((q, i) => ({ value: ((kk.answers[j.id] || [])[i]) || '', attrs: { change: 'koAns', id: j.id, i } })), send: { label: 'Send my answer', act: 'koSend', attrs: { id: j.id, n: j.questions.length } } } }); }
    if (j && j.status === 'failed') msgs.push({ who: 'bad', text: 'The draft could not be completed: ' + (j.summary || 'unknown reason') + ' Replace the MSA or upload it again to retry.', at: when(j.finishedAt) });
    if (j && j.status === 'done' && !p) msgs.push({ who: 'claude', text: 'The contract has been read. The project plan, the kick-off deck and the requirement sessions are being drafted for you…', typing: true });
    if (p) {
      msgs.push({ who: 'claude', text: 'The contract has been read.', at: j ? when(j.finishedAt) : '' });
      msgs.push({ who: 'claude', text: 'A draft project plan is ready for your review: ' + tiles[0].detail + '.' });
      msgs.push({ who: 'claude', text: 'A draft kick-off deck is ready for your review: ' + tiles[1].detail + '.' });
      if (sessDone) msgs.push({ who: 'claude', text: nSess ? 'A draft requirement session plan is ready for your review: ' + tiles[2].detail + '.' : 'No requirement sessions could be drafted: ' + sessNote }); else msgs.push({ who: 'claude', text: 'The requirement sessions are being drafted…', typing: true });
      if (book) msgs.push({ who: 'claude', text: 'The plan workbook and the timeline are filled in on the Project Plan tab, for you to adjust.' }); else if (bookFailed) msgs.push({ who: 'bad', text: 'The project plan workbook could not be made. Open the Project Plan tab to try again.' }); else if (sessDone) msgs.push({ who: 'claude', text: 'The plan workbook and the timeline are being filled in…', typing: true });
      if (approved) { msgs.push({ who: 'you', text: 'I approve the kick-off.', at: when(p.approvedAt) }); msgs.push({ who: 'claude', text: 'Approved' + (p.approvedBy ? ' by ' + String(p.approvedBy).split('@')[0] : '') + '. The kick-off and the plan are final. You can open and download them any time.', actions: [{ label: 'Open the kick-off', act: 'koOpen', attrs: { view: 'kickoff' } }, { label: 'Open the project plan', act: 'koOpen', attrs: { view: 'plan', t: 'wb' } }] }); }
      else if (p.status === 'draft' && sessDone && book) { const c = L().approvalCheck(p, owner(), crDoc(), true);
        msgs.push({ who: 'claude', text: c.ok ? 'The drafts are ready and your review is complete. Do you want to approve the kick-off and the plan now?' : 'The drafts are ready for your review. ' + c.why, actions: c.ok ? [{ label: 'Yes, approve', act: 'koApproveIntake', primary: true }, { label: 'Not yet, let me review', act: 'koOpen', attrs: { view: 'kickoff' } }] : [{ label: 'Review the kick-off', act: 'koOpen', attrs: { view: 'kickoff' } }] }); }
    }
    const dis = ro() ? ' disabled' : '';
    const composer = file || j || p ? '<span class="ki-file" title="' + esc(file) + '">' + esc(file || 'MSA') + '</span><span class="spacer"></span><button type="button" class="btn sm" data-act="koReplaceMsa"' + dis + '>Replace MSA</button><button type="button" class="btn sm danger" data-act="koRemoveMsa"' + dis + '>Remove MSA</button>'
      : '<button type="button" class="btn primary" data-act="uploadMsa"' + dis + '>Upload the MSA</button><span class="xs muted">PDF, Word or text</span>';
    return root.FWBWorkChat.html({ lite: true, title: 'Your drafts', hint: j && j.claimedAt ? "Prepared with Claude's help, on " + (who ? who + "'s" : 'your') + ' computer (scheduled task "Delivery Studio job queue"). ' + (j.progressAt ? 'Last update ' + when(j.progressAt) + '.' : '') : "Drafts are prepared for you with Claude's help, on your own computer. You can leave this page; you review and decide.", messages: msgs, tiles, tilesTitle: 'Draft documents for your review', composer });
  }
  const list = (items, cls) => items.length ? `<ul class="ko-list ${cls || ''}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  function packCards(p) {
    const ms = p.milestones.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(dt(m.start))}${m.end && m.end !== m.start ? ' – ' + esc(dt(m.end)) : ''}</td><td>${esc(m.responsible)}</td><td><span class="ko-or ko-or-${esc(m.origin || 'assumed')}">${esc(m.label)}</span></td></tr>`).join('');
    const attn = p.conflicts.length || p.gaps.length || p.assumptions.length;
    return `<section class="card ko-card" aria-label="Scope and modules"><div class="card-h"><b>Scope and modules</b></div><div class="card-b">
        ${p.modules.length ? `<div class="ko-chips">${p.modules.map(m => `<span class="ko-chip">${esc(m)}</span>`).join('')}</div>` : '<p class="muted small">No modules were listed in the contract.</p>'}
        ${list(p.scope) || '<p class="muted small">No confirmed scope items yet.</p>'}</div></section>
      ${attn ? `<section class="card ko-card" aria-label="Needs attention"><div class="card-h"><b>Needs your attention</b></div><div class="card-b">
        ${p.conflicts.length ? `<h4 class="ko-h ko-bad">Conflicts</h4>${list(p.conflicts, 'bad')}` : ''}${p.gaps.length ? `<h4 class="ko-h">Missing from the contract</h4>${list(p.gaps)}` : ''}${p.assumptions.length ? `<h4 class="ko-h">Assumptions made</h4>${list(p.assumptions)}` : ''}</div></section>` : ''}`;
  }
  function crCard() {
    const k = K(); const items = L().itemsOf(crDoc()).slice().reverse(); const dis = ro() ? ' disabled' : '';
    const rows = items.slice(0, 10).map(c => `<div class="ko-cr"><div>${esc(c.text)}</div><div class="row xs muted">${tag(c.status === 'applied' ? 'ok' : c.status === 'open' ? 'tbc' : 'low', c.status)}<span>${esc(c.by)} ${esc(when(c.at))}</span>
        ${c.status === 'open' ? `<button type="button" class="btn sm" data-act="koDismiss" data-id="${esc(c.id)}"${dis}>Dismiss</button>` : ''}</div></div>`).join('');
    return `<section class="card ko-card" aria-label="Change requests"><div class="card-h"><b>Change requests</b><span class="xs muted">Ask for changes: the draft is updated with Claude\'s help</span></div><div class="card-b">
      <textarea id="koCr" rows="3" maxlength="${L().MAX_TEXT}" placeholder="For example: move the go-live milestone to April, or add the data migration risk." aria-label="Change request for Claude" data-change="koCrText"${dis}>${esc(k.cr)}</textarea>
      <div class="row ko-btns"><button type="button" class="btn sm primary" data-act="koCrSend"${dis}>Send to Claude</button></div>${rows}</div></section>`;
  }
  // The preview shows one slide at a time with no script: the page's policy (script-src 'self') would stop the deck's own inline script, so the slide is chosen here and the file is only styled.
  const deckHtml = (p, n) => { const r = root.FWBKickoffDeck.build(p.deck, { fmt: dt }); const k = Math.max(0, Math.min(r.slides.length - 1, n)) + 1;
    return { n: r.slides.length, k, names: r.slides, skipped: r.skipped, html: r.html.replace('</head>', `<style>html,body{overflow:hidden}#stage{transform:none!important;left:0!important;top:0!important}#bar{display:none}.slide{display:none!important}.slide:nth-child(${k}){display:block!important}.slide.cover:nth-child(${k}){display:flex!important}</style></head>`) }; };
  function deckCard(p) {
    if (!root.FWBKickoffDeck) return ''; const k = K(); const d = deckHtml(p, k.slide || 0);
    return `<section class="card ko-card" aria-label="Kick-off deck"><div class="card-h"><b>Kick-off deck preview</b><span class="xs muted">${d.n} slides${d.skipped.length ? '. Left out because nothing to show: ' + esc(d.skipped.join(', ')) : ''}</span></div>
      <div class="card-b"><div class="ko-deck"><iframe title="Kick-off deck preview" sandbox="" srcdoc="${esc(d.html)}"></iframe></div>
      <div class="row ko-btns"><button type="button" class="btn sm" data-act="koSlide" data-d="-1">Previous slide</button><span class="xs muted" id="koSlideNo">Slide ${d.k} of ${d.n}: ${esc(d.names[d.k - 1] || '')}</span><button type="button" class="btn sm" data-act="koSlide" data-d="1">Next slide</button><button type="button" class="btn sm" data-act="koSlideAi" title="Ask Claude to change what this slide says"${ro() ? ' disabled' : ''}>Change this slide with AI</button><span class="spacer"></span>
      <button type="button" class="btn sm primary" data-act="koDlDeck">Download kick-off deck (HTML)</button><button type="button" class="btn sm" data-act="koDlPlan">Download project plan (HTML)</button></div>
      <p class="xs muted">The downloaded deck has all slides, arrow keys and full screen, works offline, and is marked draft until approved.</p></div></section>`;
  }
  const fitDeck = () => { const box = document.querySelector('.ko-deck'), fr = box && box.querySelector('iframe'); if (fr && box.clientWidth) fr.style.transform = 'scale(' + (box.clientWidth / 1920) + ')'; };
  let fitBound = false;
  const safeDeck = p => { try { return deckCard(p); } catch (e) { return '<div class="notice err small">The deck preview could not be built: ' + esc(e.message || 'unknown error') + '</div>'; } };
  // The consultant's own review: each section is ticked off by a person, with their name and the time, before the kick-off can be approved.
  function reviewCard(p) {
    const dis = ro() || p.status !== 'draft' ? ' disabled' : ''; const left = p.review.filter(x => !x.done).length;
    return '<section class="card ko-card" aria-label="Your review"><div class="card-h"><b>Your review</b><span class="xs muted">' + (p.status === 'approved' ? 'Reviewed and approved' : left ? left + ' of ' + p.review.length + ' sections left to check' : 'All sections checked') + '</span></div><div class="card-b ko-review">'
      + p.review.map(x => '<label class="ko-rv' + (x.done ? ' on' : '') + '"><input type="checkbox" data-change="koReview" data-id="' + esc(x.id) + '"' + (x.done ? ' checked' : '') + dis + '><span>' + esc(x.label) + '</span>' + (x.done ? '<em class="xs muted">' + esc(String(x.by).split('@')[0]) + ', ' + esc(when(x.at)) + '</em>' : '') + '</label>').join('')
      + '<p class="xs muted">These drafts are a starting point. Check them against the contract and with the customer before you approve; correct anything that is wrong.</p></div></section>';
  }
  function approveBar(p) {
    const a = L().approvalCheck(p, owner(), crDoc(), true); const dis = ro() ? ' disabled' : '';
    if (p.status === 'approved') return `<div class="ko-bar"><span>${tag('ok', 'Approved')} by ${esc(p.approvedBy)} ${esc(when(p.approvedAt))}</span></div>`;
    return `<div class="ko-bar"><span class="xs muted">${a.ok || !a.why ? 'Review the contract data, then approve.' : esc(a.why)}</span><span class="spacer"></span>
      <button type="button" class="btn primary" data-act="koApprove"${a.ok ? '' : ' disabled'}>Approve kick-off</button></div>`;
  }
  // Two tabs: Contract intake (upload, Claude's progress, the jobs) and Kick-off (only the output: scope, deck, change requests, approval).
  function intakePage() {
    const head = '<div class="page-header"><div class="t"><h1>Contract intake</h1><p>Upload the signed MSA. A first draft of the project plan, the requirement sessions and the kick-off deck is prepared for you, with Claude\'s help. You review, correct and approve it.</p></div></div>';
    const k = K(); if (k.pid !== pid()) reset(k); return head + '<div class="page-body ko">' + chatCard(pack()) + '</div>';
  }
  function page() {
    const head = '<div class="page-header"><div class="t"><h1>Project introduction</h1><p>The kick-off prepared from the contract: scope, the deck and your change requests. Review it, correct it and approve it.</p></div></div>';
    const k = K(); if (k.pid !== pid()) reset(k); const p = pack();
    if (!p) return head + '<div class="page-body ko"><div class="card ko-card"><div class="card-b"><p>Nothing to show yet. Upload the MSA on the Contract intake tab; Claude drafts the kick-off from it.</p><div class="row ko-btns"><button type="button" class="btn sm primary" data-act="nav" data-view="msaintake">Go to Contract intake</button></div></div></div></div>';
    return head + '<div class="page-body ko">' + (p.status === 'discarded' ? '<div class="notice small">This draft was discarded. Upload the MSA again on the Contract intake tab.</div>' : '') + packCards(p) + crCard() + safeDeck(p) + reviewCard(p) + approveBar(p) + '</div>';
  }
  V.msaintake = { html() { return V.isCustomer() ? '' : intakePage(); }, mount() { if (V.isCustomer()) return; load(false); poll(); syncStruct(); syncSessions(); syncWorkbook(); } };
  // The team gets this page; customers keep the older Kick-off Deck viewer.
  const old = V.kickoff;
  V.kickoff = Object.assign({}, old, { html() { return V.isCustomer() ? old.html.apply(this, arguments) : page(); }, mount() { if (V.isCustomer()) return old.mount && old.mount.apply(this, arguments); load(false); poll(); fitDeck(); if (!fitBound) { fitBound = true; addEventListener('resize', fitDeck); } } });

  // ---------- actions ----------
  const guard = () => { if (ro()) { toast('This project is read-only for you.', 4000, true); return true; } return false; };
  const post = async (path, body) => { const r = await API.post(base() + path, body); K().at = 0; await load(true, true); return r; };
  // F.flush never throws: a failed save only leaves the document dirty. So look at the document after the flush, before saying it was saved.
  const saved = async sec => { for (let i = 0; i < 3 && S.docs[sec] && (S.docs[sec].dirty || S.docs[sec].inflight); i++) await F.flush(); return !!S.docs[sec] && !S.docs[sec].dirty && !S.docs[sec].inflight; };
  const NOT_SAVED = 'Not saved: the server refused it or the connection failed. Nothing was changed. See the save indicator at the top.';
  const undo = (sec, prev) => { setDoc(sec, prev); S.docs[sec].dirty = false; V.render(); };
  const slug = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  const file = kind => `${slug(S.project.customer)}-${slug(S.project.name)}-${kind}${(F.doc('kickoff_pack') || {}).status === 'approved' ? '' : '-draft'}.html`;
  ACT.koDlDeck = () => { const p = pack(); if (!p) return; try { V.download(file('kickoff'), new Blob([root.FWBKickoffDeck.build(p.deck, { fmt: dt }).html], { type: 'text/html' })); } catch (e) { toast('The deck could not be built: ' + (e.message || 'unknown error'), 6000, true); } };
  ACT.koDlPlan = () => { const p = pack(); if (!p) return; try { V.download(file('project-plan'), new Blob([root.FWBPlanHtml.build(F.doc('kickoff_pack'), { customer: S.project.customer, project: S.project.name, fmt: dt })], { type: 'text/html' })); } catch (e) { toast('The plan could not be built: ' + (e.message || 'unknown error'), 6000, true); } };
  ACT.koSlide = a => { const p = pack(); if (!p) return; const k = K(); const d = deckHtml(p, (k.slide || 0) + (+a.getAttribute('data-d') || 0)); k.slide = d.k - 1; const fr = document.querySelector('.ko-deck iframe'); if (fr) fr.srcdoc = d.html; const no = document.getElementById('koSlideNo'); if (no) no.textContent = 'Slide ' + d.k + ' of ' + d.n + ': ' + (d.names[d.k - 1] || ''); };
  // one slide, one request: the change-request box opens with the slide named, the person says what should change, and Claude applies it to the data that slide shows
  ACT.koSlideAi = () => { const p = pack(); if (!p || ro()) return; const k = K(), d = deckHtml(p, k.slide || 0), ta = document.getElementById('koCr'); k.cr = 'Slide ' + d.k + ' (' + (d.names[d.k - 1] || '') + '): '; if (ta) { ta.value = k.cr; ta.scrollIntoView({ block: 'center' }); ta.focus(); ta.setSelectionRange(k.cr.length, k.cr.length); } V.toast('Say what should change on this slide, then press Send to Claude.', 5000); };
  // Called after an MSA file is stored (Bring in, Contract tab): asks Claude to read it, so the kick-off is drafted without another click. The same request twice is one job.
  V.koAutoPull = async (fileName, file, x) => {
    if (!team() || ro()) return; let kept = false;
    try {
      if (!x && file && V.extractDocPages) x = await V.extractDocPages(file);   // Bring in has not read the file yet
      const pages = x ? (x.pages ? x.pages.map(p => ({ n: p.n, text: String(p.text || '').slice(0, 20000) })) : [{ n: 1, text: String(x.text || '').slice(0, 20000) }]) : [];
      if (pages.some(p => p.text.trim())) { await API.put(base() + '/docs/msa_text', { data: { name: fileName, at: new Date().toISOString(), pages }, baseVersion: -1 }); kept = true; }
    } catch (e) { /* not kept: the job below then asks Claude to look in Microsoft 365 */ }
    try { await API.post(base() + '/jobs', L().pullRequest(S.project.customer, S.project.name, fileName + (kept ? ' (text kept in the Studio: get_document msa_text)' : ''))); K().at = 0; load(true, true); toast(kept ? 'MSA stored and read. A job for Claude was created; the scheduled Claude task picks it up. Follow it on the Kick-off page.' : 'MSA stored, but its text could not be read here, so Claude will look for it in OneDrive or SharePoint. Follow it on the Kick-off page.', 9000); }
    catch (e) { toast('MSA stored, but the Claude job could not be created: ' + (e.message || 'open Kick-off and press Pull MSA'), 8000, true); }
  };
  ACT.koReview = el => { if (guard()) return; const p = pack(); if (!p || p.status !== 'draft') return; setDoc('kickoff_pack', L().setReview(F.doc('kickoff_pack'), el.getAttribute('data-id'), !!el.checked, S.user.email, new Date().toISOString())); F.changed(null, null, { section: 'kickoff_pack' }); };
  ACT.koRefresh = () => load(true, true);
  ACT.koPull = a => V.busy(a, async () => {
    if (guard()) return; const r = await post('/jobs', L().pullRequest(S.project.customer, S.project.name));
    toast(r.duplicate ? 'A request to pull the MSA is already waiting for Claude.' : 'Requested. Ask Claude in your own session: "check the Studio job queue".', 6000);
  });
  ACT.koCancel = a => V.busy(a, async () => { if (guard()) return; await post('/jobs/' + encodeURIComponent(a.getAttribute('data-id')) + '/cancel', {}); });
  ACT.koAns = el => { const k = K(), id = el.getAttribute('data-id'); (k.answers[id] = k.answers[id] || [])[+el.getAttribute('data-i')] = el.value; };
  ACT.koSend = a => V.busy(a, async () => {
    if (guard()) return; const id = a.getAttribute('data-id'); const n = +a.getAttribute('data-n') || 0; const k = K(); const ans = Array.from({ length: n }, (_, i) => String((k.answers[id] || [])[i] || '').trim());
    if (!ans.some(Boolean)) { toast('Write an answer first.', 4000, true); return; }
    await post('/jobs/' + encodeURIComponent(id) + '/answer', { answers: ans.filter(Boolean) }); delete k.answers[id]; toast('Sent. Claude will continue in your session.', 4000);
  });
  ACT.koCrText = el => { K().cr = el.value; };
  ACT.koCrSend = a => V.busy(a, async () => {
    if (guard()) return; const k = K(); k.cr = (document.getElementById('koCr') || {}).value || k.cr; const r = L().addChange(crDoc(), k.cr, S.user.email, new Date().toISOString());
    if (!r.ok) { toast(r.error, 5000, true); return; }
    const prev = crDoc(), text = k.cr; setDoc('kickoff_cr', r.doc); k.cr = ''; F.changed(null, null, { section: 'kickoff_cr' });
    if (!(await saved('kickoff_cr'))) { undo('kickoff_cr', prev); k.cr = text; V.render(); toast(NOT_SAVED + ' Your text is kept.', 8000, true); return; }   // no job is made for a request the server does not have
    try { const j = await post('/jobs', L().changeRequest()); toast(j.duplicate && j.job && j.job.status === 'claimed' ? 'Saved. Claude is already working on the last request; send another request when it has finished so it is not missed.' : 'Saved and sent to Claude.', 6000); } catch (e) { toast('Saved, but the job could not be created: ' + (e.message || 'try again'), 7000, true); }
  });
  ACT.koDismiss = a => { if (guard()) return; setDoc('kickoff_cr', L().dismissChange(crDoc(), a.getAttribute('data-id'))); F.changed(null, null, { section: 'kickoff_cr' }); };
  ACT.koSave = a => V.busy(a, async () => { if (guard()) return; await saved('kickoff_pack'); await saved('kickoff_cr'); const ok = !(S.docs.kickoff_pack && S.docs.kickoff_pack.dirty) && !(S.docs.kickoff_cr && S.docs.kickoff_cr.dirty); toast(ok ? 'Saved.' : 'Not saved yet. The server refused it or the connection failed. See the save indicator at the top.', ok ? 2500 : 7000, !ok); });
  ACT.koDiscard = async () => {
    if (guard() || !pack()) return; if (!owner()) { toast('Only the project owner or an admin can discard the kick-off.', 5000, true); return; } if (!(await V.confirmDialog('Discard draft', 'Mark this kick-off draft as discarded? The contract data stays; Claude can build a new draft from a new Pull MSA.', 'Discard', true))) return;
    const prev = F.doc('kickoff_pack'); setDoc('kickoff_pack', L().setStatus(prev, 'discarded', S.user.email, new Date().toISOString())); F.changed('Kick-off draft discarded', null, { section: 'kickoff_pack' });
    if (!(await saved('kickoff_pack'))) { undo('kickoff_pack', prev); toast(NOT_SAVED, 8000, true); }
  };
  ACT.koOpen = a => { const t = a.getAttribute('data-t'); if (t) S.ui.planTab = t; ACT.nav(a); };
  ACT.koApproveIntake = a => V.busy(a, async () => {
    const p = pack(); const c = L().approvalCheck(p, owner(), crDoc(), true); if (!c.ok) { toast(c.why, 6000, true); return; }
    const prev = F.doc('kickoff_pack'); setDoc('kickoff_pack', L().setStatus(prev, 'approved', S.user.email, new Date().toISOString())); F.changed('Kick-off approved', null, { section: 'kickoff_pack' });
    if (!(await saved('kickoff_pack'))) { undo('kickoff_pack', prev); toast(NOT_SAVED, 8000, true); return; } toast('Kick-off approved.', 4000);
  });
  // Remove or replace the MSA: everything drafted from it is wiped, so nothing wrong is left behind anywhere
  async function wipeMsa() {
    const b = base(), problems = []; const put = async (sec, data) => { const r = await API.put(b + '/docs/' + sec, { data, baseVersion: -1 }); S.docs[sec] = { data, version: (r && r.version) || 0, dirty: false }; };
    const run = async (what, fn) => { try { await fn(); } catch (e) { problems.push(what + ' (' + (e.message || 'failed') + ')'); } };
    const extracted = !!(((F.doc('planner') || {}).msa || {}).external); await load(true);
    for (const j of (K().jobs || []).filter(x => x.kind === 'pull_msa' && ['waiting', 'claimed', 'needs_input'].includes(x.status))) await run('a waiting Claude job', () => API.post(b + '/jobs/' + encodeURIComponent(j.id) + '/cancel', {}));
    await run('the contract text', () => put('msa_text', null)); await run('the kick-off', () => put('kickoff_pack', null)); await run('the change requests', () => put('kickoff_cr', null));
    await run('the project plan rows', async () => { const d = F.doc('plan_struct') || {}; if (d.fromPack) await put('plan_struct', { rows: [], versions: d.versions || [] }); });
    await run('the requirement sessions', async () => { F.doc('planner'); const d = S.docs.planner.data = S.docs.planner.data || {}; d.sessions = (d.sessions || []).filter(x => !x.fromPack); delete d.sessionNotes; delete d.sessionPlanNotes;
      if (d.msa) { d.msa = null; d.contractX = null; delete d.msaFail; d.scope = (d.scope || []).filter(x => !/^sc_m[0-9]/.test(String(x.id))); } F.changed(null, null, { section: 'planner', render: false }); await saved('planner'); });
    await run('the plan workbook', async () => { const d = (S.docs.plan && S.docs.plan.data) || null; if (!d || !Array.isArray(d.versions)) return; const mine = d.versions.filter(v => v.source === 'kickoff');
      for (const v of mine) { try { await API.del(b + '/files/' + encodeURIComponent(v.fileId)); } catch (e) { /* already gone */ } } d.versions = d.versions.filter(v => v.source !== 'kickoff'); if (mine.some(v => v.fileId === d.current)) d.current = (d.versions[0] || {}).fileId || ''; F.changed(null, null, { section: 'plan', render: false }); await saved('plan'); });
    await run('the contract file', async () => { const r = await API.get(b + '/files?category=msa'); for (const f of (r.files || [])) await API.del(b + '/files/' + encodeURIComponent(f.id)); });
    if (extracted) await run('the contract records', async () => { for (const kind of ['ctrcore', 'scope']) { try { await API.del(b + '/items/' + kind + '/main'); } catch (e) { if (e.status !== 404) throw e; } } });
    S.ui.koPlanTried = ''; K().at = 0; K().sig = ''; V.invalidateFiles && V.invalidateFiles('msa'); await load(true, true); return problems;
  }
  const blocked = () => { const p = pack(); if (p && p.status === 'approved' && !owner()) { toast('This kick-off is approved. Only the project owner can remove or replace the MSA.', 6000, true); return true; } return false; };
  ACT.koRemoveMsa = async () => {
    if (guard() || blocked()) return; const name = msaFile() || 'the MSA';
    if (!(await V.confirmDialog('Remove the MSA', 'Are you sure you want to remove ' + name + '? Everything Claude drafted from it will be wiped for good: the project plan, the kick-off deck, the requirement sessions, the plan workbook, your change requests and the stored contract text. Nothing is kept. You can upload the correct MSA afterwards.', 'Remove MSA and wipe everything', true))) return;
    V.loading(true, 'Removing the MSA and everything drafted from it…'); try { const pr = await wipeMsa(); toast(pr.length ? 'Removed, but some parts could not be cleared: ' + pr.join('; ') + '. Try again.' : 'The MSA and everything drafted from it were removed.', pr.length ? 9000 : 5000, !!pr.length); } finally { V.loading(false); }
  };
  ACT.koReplaceMsa = async () => {
    if (guard() || blocked()) return; const f = (await V.pickFile('.pdf,.docx,.txt'))[0]; if (!f) return;
    if (!(await V.confirmDialog('Replace the MSA', 'Replace ' + (msaFile() || 'the current MSA') + ' with ' + f.name + '? Everything Claude drafted from the current MSA (project plan, kick-off deck, requirement sessions, plan workbook, change requests) will be wiped, and Claude will draft it again from the new one.', 'Replace and wipe', true))) return;
    V.loading(true, 'Clearing what was drafted from the old MSA…'); let pr = []; try { pr = await wipeMsa(); } finally { V.loading(false); }
    if (pr.length) { toast('The old MSA could not be fully cleared (' + pr.join('; ') + '), so the new one was not uploaded. Try again.', 9000, true); return; }
    await V.msaIngest(f);
  };
  ACT.koApprove = a => V.busy(a, async () => {
    const p = pack(); const c = L().approvalCheck(p, owner(), crDoc(), true); if (!c.ok) { toast(c.why, 6000, true); return; }
    if (!(await V.confirmDialog('Approve kick-off', 'Approve the kick-off deck and the project plan as they are shown? Open items stay open and are listed in the plan.', 'Approve'))) return;
    const prev = F.doc('kickoff_pack'); setDoc('kickoff_pack', L().setStatus(prev, 'approved', S.user.email, new Date().toISOString())); F.changed('Kick-off approved', null, { section: 'kickoff_pack' });
    if (!(await saved('kickoff_pack'))) { undo('kickoff_pack', prev); toast(NOT_SAVED, 8000, true); return; }
    toast('Kick-off approved.', 4000);
  });

  // ---------- the Project Plan tab (Workbook, Timeline and planning, Calendar) is filled from the same pack ----------
  // Timeline and Calendar read the document plan_struct (rows); the Workbook tab shows an Excel file. Both are made from the pack's rows, but only
  // when the project has no plan of its own: a plan someone imported or edited is never replaced. A new pack (after change requests) refreshes only what was made from the pack.
  let planBusy = false;
  const planName = () => 'Project plan - ' + [S.project.customer, S.project.name].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, ' ') + '.xlsx';
  const packRaw = () => { const r = F.doc('kickoff_pack'); return r && Array.isArray(r.rows) && r.rows.length && r.status !== 'discarded' && !ro() && !V.isCustomer() ? r : null; };
  function syncStruct() {
    const raw = packRaw(); if (!raw) return; const d = F.doc('plan_struct') || {}; const own = d.fromPack;
    if ((d.rows || []).length && (!own || own === raw.builtAt)) return;
    setDoc('plan_struct', { rows: raw.rows.map(r => Object.assign({}, r)), versions: d.versions || [], fromPack: raw.builtAt }); F.changed(null, null, { section: 'plan_struct', render: false });
  }
  async function planBook(raw) {
    const E = await V.loadExcelJS(); const wb = new E.Workbook(); const ws = wb.addWorksheet('Project plan', { views: [{ state: 'frozen', xSplit: 5, ySplit: 3 }] });
    const rows = raw.rows.slice().sort((a, b) => String(a.start).localeCompare(String(b.start))); const day = x => new Date(x + 'T00:00:00Z'); const DAY = 864e5;
    const t0 = day(rows[0].start); const t1 = rows.reduce((m, r) => { const e = day(r.end || r.start); return e > m ? e : m; }, t0); const weeks = Math.max(1, Math.min(60, Math.ceil(((t1 - t0) / DAY + 1) / 7)));
    ws.addRow([(S.project.customer || '') + ' × Facilio: ' + (S.project.name || '') + ' - Project plan']).font = { bold: true, size: 14, color: { argb: 'FF1D1A5E' } };
    ws.addRow(['Status: ' + (raw.status === 'approved' ? 'Approved' : 'Draft, not yet approved') + '. Dates that are not written in the contract are Facilio suggestions.']).font = { italic: true, color: { argb: 'FF4A5784' } };
    const head = ['Phase', 'Start', 'End', 'Owner', 'Where it comes from']; for (let w = 0; w < weeks; w++) head.push(new Date(t0.getTime() + w * 7 * DAY));
    ws.addRow(head).eachCell((c, n) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1A5E' } }; c.alignment = { horizontal: 'center' }; if (n > 5) c.numFmt = 'dd/mm'; });
    rows.forEach(r => { const a0 = day(r.start), e0 = day(r.end || r.start); const row = ws.addRow([r.title, a0, e0, r.owner || '', L().originLabel(r.origin)]); row.getCell(2).numFmt = 'dd/mm/yyyy'; row.getCell(3).numFmt = 'dd/mm/yyyy';
      for (let w = 0; w < weeks; w++) { const a = t0.getTime() + w * 7 * DAY, b = a + 7 * DAY; if (a0.getTime() < b && e0.getTime() + DAY > a) row.getCell(6 + w).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.origin === 'contract' ? 'FF1D1A5E' : 'FF1570EF' } }; } });
    [34, 12, 12, 11, 28].forEach((w, n) => { ws.getColumn(n + 1).width = w; }); for (let w = 0; w < weeks; w++) ws.getColumn(6 + w).width = 6;
    const n2 = wb.addWorksheet('Assumptions and gaps'); n2.getColumn(1).width = 22; n2.getColumn(2).width = 120; n2.addRow(['Type', 'Note']).font = { bold: true };
    const pl = raw.plan || {}; (pl.conflicts || []).forEach(x => n2.addRow(['Conflict', (x && x.message) || String(x)])); (pl.gaps || []).forEach(x => n2.addRow(['Missing from the contract', x])); (pl.assumptions || []).forEach(x => n2.addRow(['Assumption', x]));
    return wb.xlsx.writeBuffer();
  }
  async function syncWorkbook() {
    const raw = packRaw(); if (planBusy || !raw || !V.loadExcelJS || S.ui.koPlanTried === raw.builtAt) return;
    F.doc('plan'); let d = S.docs.plan.data; if (!d || typeof d !== 'object') d = S.docs.plan.data = {}; d.versions = d.versions || [];
    const cur = d.versions.find(v => v.fileId === d.current) || d.versions[0]; if (cur && !(cur.source === 'kickoff' && cur.fromPack !== raw.builtAt)) return;
    planBusy = true; S.ui.koPlanTried = raw.builtAt;   // one try per version of the pack in this session: a failure does not repeat on every render
    try {
      const f = new File([await planBook(raw)], planName(), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const rec = await API.uploadFile(S.project.id, f, 'plan', { source: 'kickoff' }, cur ? cur.fileId : null);
      d.versions.unshift({ fileId: rec.id, name: f.name, size: f.size, uploadedAt: new Date().toISOString(), by: (S.user && S.user.name) || 'Consultant', source: 'kickoff', fromPack: raw.builtAt }); d.current = rec.id; d.view = d.view || {}; d.view.sheet = 0; F.changed('Project plan workbook made from the kick-off', f.name, { section: 'plan' });
    } catch (e) { toast('The project plan workbook could not be made: ' + (e.message || 'error'), 7000, true); } finally { planBusy = false; }
  }
  // Requirement sessions: made from the pack into planner.sessions (the Requirement Session Planner's own list), only while there are none that a person made.
  function syncSessions() {
    const raw = packRaw(); if (!raw) return; F.doc('planner'); let d = S.docs.planner.data; if (!d || typeof d !== 'object') d = S.docs.planner.data = {}; if (!Array.isArray(d.sessions)) d.sessions = [];
    const mine = d.sessions.some(x => !x.fromPack); if (mine) return; if (d.sessions.length && d.sessions[0].fromPack === raw.builtAt) return;
    const r = L().sessionPlan(raw); d.sessions = r.sessions.map(x => Object.assign({ id: F.uid('ses'), mode: (d.settings || {}).mode || 'online', notes: '', prep: '', modules: [], fromPack: raw.builtAt }, x)); d.sessionNotes = r.notes; d.sessionPlanNotes = r.planNotes; F.changed(null, null, { section: 'planner', render: false });
  }
  const sessData = () => { const d = F.doc('planner') || {}; const p = L().packOf(F.doc('kickoff_pack')); return { customer: S.project.customer, project: S.project.name, status: p ? p.status : 'draft', sessions: d.sessions || [], planNotes: d.sessionPlanNotes || [], notes: Array.isArray(d.sessionNotes) ? d.sessionNotes : [], fmt: dt, edit: !S.readonly && !V.isCustomer(), fmtTime: t => (V.fmt12 ? V.fmt12(t) : t), durText: n => (V.durText ? V.durText(n) : n + ' min'), modLabel: m => ((F.allModules ? F.allModules().find(x => x.name === m) : null) || {}).label || m }; };
  V.planSessionData = sessData;
  ACT.koSessView = () => { try { const w = window.open(URL.createObjectURL(new Blob([root.FWBSessionHtml.build(Object.assign(sessData(), { edit: false }))], { type: 'text/html' })), '_blank'); if (!w) toast('The browser blocked the new tab. Allow pop-ups for this site, or use Download.', 6000, true); } catch (e) { toast('The plan could not be opened: ' + (e.message || 'error'), 6000, true); } };
  ACT.koSessDl = () => { try { V.download('requirement-session-plan-' + slug(S.project.customer) + '-' + slug(S.project.name) + '.html', new Blob([root.FWBSessionHtml.build(Object.assign(sessData(), { edit: false }))], { type: 'text/html' })); } catch (e) { toast('The plan could not be built: ' + (e.message || 'error'), 6000, true); } };
  V.planSessions = { html() {
    syncSessions(); const d = sessData(); const W = V.wsplan; const tools = W ? W.bar(d) + W.draftsCard() + W.guide() : '';
    if (!d.sessions.length) return tools + '<div class="card empty"><h3>No requirement sessions yet</h3><p>' + esc(d.notes[0] || 'They are drafted from the approved kick-off: sessions that group the modules in scope, inside the requirements workshops phase.') + ' You can also add a session yourself, or import a plan you already have.</p></div>';
    return tools + '<style>' + root.FWBSessionHtml.css + '</style>' + root.FWBSessionHtml.body(d);
  } };
  const oldPlan = V.plan; if (oldPlan) V.plan = Object.assign({}, oldPlan, { html() { syncStruct(); syncSessions(); return oldPlan.html.apply(this, arguments); }, mount() { syncWorkbook(); return oldPlan.mount && oldPlan.mount.apply(this, arguments); } });
  const kickMount = V.kickoff.mount; V.kickoff.mount = function () { if (!V.isCustomer()) { syncStruct(); syncSessions(); syncWorkbook(); } return kickMount && kickMount.apply(this, arguments); };
  // shared with the Requirement sessions tabs (src/requirements.js): the jobs list, its polling and the save helpers
  V.studioJobs = { K, load, poll, post, guard, saved, setDoc, when, dt };
})(typeof window !== 'undefined' ? window : globalThis);
