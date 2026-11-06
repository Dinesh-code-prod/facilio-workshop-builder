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

  // ---------- data ----------
  async function load(force) {
    const k = K(); if (!pid() || !team()) return;
    if (k.pid !== pid()) Object.assign(k, { pid: pid(), jobs: null, at: 0, err: '', msa: null, answers: {} });
    if (!force && k.loading || (!force && k.at && Date.now() - k.at < FRESH_MS)) return;
    k.loading = true;
    try {
      const [j, x] = await Promise.all([API.get(base() + '/jobs?status=all'), API.get(base() + '/transfers?kind=msa').catch(() => null)]);
      const sig = JSON.stringify(j.jobs.map(a => [a.id, a.status, (a.result || {}).summary])); const changed = sig !== k.sig; k.sig = sig; k.jobs = j.jobs; k.err = '';
      k.msa = x && Array.isArray(x.transfers) ? x.transfers.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null : k.msa; k.at = Date.now(); k.loading = false;
      if (changed || force) repaint();
    } catch (e) { k.err = e.message || 'The job list could not be loaded'; k.at = Date.now(); k.loading = false; k.jobs = k.jobs || []; repaint(); }
  }
  function repaint() { if (S.ui.view !== 'kickoff') return; const a = document.activeElement; if (a && a.tagName === 'TEXTAREA' && a.closest('.ko')) return; V.render(); }
  function poll() {
    if (timer) return;
    timer = setInterval(() => { if (S.ui.view !== 'kickoff' || document.hidden) { if (S.ui.view !== 'kickoff') { clearInterval(timer); timer = 0; } return; } const k = K(); if (k.jobs && k.jobs.some(j => ['waiting', 'claimed', 'needs_input'].includes(j.status))) load(true); }, POLL_MS);
  }

  // ---------- panels ----------
  const STEPS = [['start', 'Find the contract'], ['extract', 'Check the extraction'], ['review', 'Review the kick-off'], ['approved', 'Approved']];
  function strip(st) {
    const i = Math.max(0, STEPS.findIndex(s => s[0] === (st === 'pulling' ? 'start' : st)));
    return `<ol class="ko-steps" aria-label="Progress">${STEPS.map((s, n) => `<li class="${n < i ? 'done' : n === i ? 'on' : ''}"${n === i ? ' aria-current="step"' : ''}><span>${n + 1}</span>${esc(s[1])}</li>`).join('')}</ol>`;
  }
  function msaCard(p, hasFile) {
    const k = K(); const x = k.msa; const dis = ro() ? ' disabled' : ''; const open = L().jobRows(k.jobs).some(j => j.open && j.kind === 'pull_msa');
    const status = p ? `The project was started from the contract${p.transferId ? ' (extraction ' + esc(p.transferId) + ')' : ''}.`
      : x ? `Latest extraction: <b>${esc(x.status)}</b>${x.ver ? ' (version ' + esc(x.ver) + ')' : ''}. ${x.status === 'Approved' ? 'Start the project from it on the Transfers page.' : 'Approve it on the Transfers page to build the kick-off.'}`
      : hasFile ? 'A contract file is uploaded. Read it in the Contract tab.' : 'No contract yet. Ask Claude to find it in your OneDrive or SharePoint, or upload it yourself.';
    return `<section class="card ko-card" aria-label="Contract"><div class="card-h"><b>Contract (MSA)</b></div><div class="card-b"><p>${status}</p>
      <div class="row ko-btns"><button type="button" class="btn sm primary" data-act="koPull"${dis}${open ? ' disabled' : ''}>${open ? 'Waiting for Claude…' : 'Pull MSA from My Drive'}</button>
      <button type="button" class="btn sm" data-act="nav" data-view="msaflow">Upload an MSA myself</button>${x ? '<button type="button" class="btn sm" data-act="nav" data-view="transfers">Open Transfers</button>' : ''}</div></div></section>`;
  }
  function jobsCard() {
    const k = K(); const rows = L().jobRows(k.jobs); const dis = ro() ? ' disabled' : '';
    const list = rows.slice(0, 8).map(j => `<div class="ko-job ko-${esc(j.status)}"><div class="row"><b>${esc(j.label)}</b>${tag(j.status === 'done' ? 'ok' : j.status === 'failed' ? 'red' : j.open ? 'tbc' : 'low', j.statusLabel)}<span class="xs muted">${esc(when(j.at))}</span>
        ${j.open && j.status !== 'needs_input' ? `<button type="button" class="btn sm" data-act="koCancel" data-id="${esc(j.id)}"${dis}>Cancel</button>` : ''}</div>
        ${j.summary ? `<div class="small muted">${esc(j.summary)}</div>` : ''}
        ${j.questions.length ? `<div class="ko-ask">${j.questions.map((q, i) => `<label class="f">${esc(q)}<textarea rows="2" maxlength="600" data-change="koAns" data-id="${esc(j.id)}" data-i="${i}"${dis}>${esc(((k.answers[j.id] || [])[i]) || '')}</textarea></label>`).join('')}
          <button type="button" class="btn sm primary" data-act="koSend" data-id="${esc(j.id)}" data-n="${j.questions.length}"${dis}>Send my answer to Claude</button></div>` : ''}</div>`).join('');
    const hint = rows.some(j => j.open) ? 'Claude picks these up in your own Claude session through the Facilio Delivery Studio connector. Ask Claude there: "check the Studio job queue".' : '';
    return `<section class="card ko-card" aria-label="Claude jobs"><div class="card-h"><b>Claude jobs</b><button type="button" class="btn sm" data-act="koRefresh">Refresh</button></div><div class="card-b">
      ${k.err ? `<div class="notice err small">${esc(k.err)}</div>` : ''}${k.jobs === null ? '<div class="empty">Loading…</div>' : list || '<div class="empty small">No jobs yet. A job appears here when you press a button that needs Claude.</div>'}${hint ? `<p class="xs muted">${esc(hint)}</p>` : ''}</div></section>`;
  }
  const list = (items, cls) => items.length ? `<ul class="ko-list ${cls || ''}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  function packCards(p) {
    const ms = p.milestones.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(dt(m.start))}${m.end && m.end !== m.start ? ' – ' + esc(dt(m.end)) : ''}</td><td>${esc(m.responsible)}</td><td><span class="ko-or ko-or-${esc(m.origin || 'assumed')}">${esc(m.label)}</span></td></tr>`).join('');
    const attn = p.conflicts.length || p.gaps.length || p.assumptions.length;
    return `<section class="card ko-card" aria-label="Scope and modules"><div class="card-h"><b>Scope and modules</b></div><div class="card-b">
        ${p.modules.length ? `<div class="ko-chips">${p.modules.map(m => `<span class="ko-chip">${esc(m)}</span>`).join('')}</div>` : '<p class="muted small">No modules were listed in the contract.</p>'}
        ${list(p.scope) || '<p class="muted small">No confirmed scope items yet.</p>'}</div></section>
      <section class="card ko-card" aria-label="Project plan"><div class="card-h"><b>Drafted plan</b><span class="xs muted">${esc(dt(p.window.start))} to ${esc(dt(p.window.end))}</span></div><div class="card-b"><div class="tw"><table><thead><tr><th>Phase</th><th>Dates</th><th>Who</th><th>Where it comes from</th></tr></thead><tbody>${ms}</tbody></table></div>
        <p class="xs muted">Only dates written in the contract are treated as fixed. Everything else is Facilio's suggestion until a person confirms it.</p></div></section>
      ${attn ? `<section class="card ko-card" aria-label="Needs attention"><div class="card-h"><b>Needs your attention</b></div><div class="card-b">
        ${p.conflicts.length ? `<h4 class="ko-h ko-bad">Conflicts</h4>${list(p.conflicts, 'bad')}` : ''}${p.gaps.length ? `<h4 class="ko-h">Missing from the contract</h4>${list(p.gaps)}` : ''}${p.assumptions.length ? `<h4 class="ko-h">Assumptions made</h4>${list(p.assumptions)}` : ''}</div></section>` : ''}`;
  }
  function crCard() {
    const k = K(); const items = L().itemsOf(crDoc()).slice().reverse(); const dis = ro() ? ' disabled' : '';
    const rows = items.slice(0, 10).map(c => `<div class="ko-cr"><div>${esc(c.text)}</div><div class="row xs muted">${tag(c.status === 'applied' ? 'ok' : c.status === 'open' ? 'tbc' : 'low', c.status)}<span>${esc(c.by)} ${esc(when(c.at))}</span>
        ${c.status === 'open' ? `<button type="button" class="btn sm" data-act="koDismiss" data-id="${esc(c.id)}"${dis}>Dismiss</button>` : ''}</div></div>`).join('');
    return `<section class="card ko-card" aria-label="Change requests"><div class="card-h"><b>Change requests</b><span class="xs muted">Claude reads these and updates the deck and the plan</span></div><div class="card-b">
      <textarea id="koCr" rows="3" maxlength="${L().MAX_TEXT}" placeholder="For example: move the go-live milestone to April, or add the data migration risk." aria-label="Change request for Claude" data-change="koCrText"${dis}>${esc(k.cr)}</textarea>
      <div class="row ko-btns"><button type="button" class="btn sm primary" data-act="koCrSend"${dis}>Send to Claude</button></div>${rows}</div></section>`;
  }
  // The preview shows one slide at a time with no script: the page's policy (script-src 'self') would stop the deck's own inline script, so the slide is chosen here and the file is only styled.
  const deckHtml = (p, n) => { const r = root.FWBKickoffDeck.build(p.deck, { fmt: dt }); const k = Math.max(0, Math.min(r.slides.length - 1, n)) + 1;
    return { n: r.slides.length, k, skipped: r.skipped, html: r.html.replace('</head>', `<style>html,body{overflow:hidden}#stage{transform:none!important;left:0!important;top:0!important}#bar{display:none}.slide{display:none!important}.slide:nth-child(${k}){display:block!important}.slide.cover:nth-child(${k}){display:flex!important}</style></head>`) }; };
  function deckCard(p) {
    if (!root.FWBKickoffDeck) return ''; const k = K(); const d = deckHtml(p, k.slide || 0);
    return `<section class="card ko-card" aria-label="Kick-off deck"><div class="card-h"><b>Kick-off deck preview</b><span class="xs muted">${d.n} slides${d.skipped.length ? '. Left out because nothing to show: ' + esc(d.skipped.join(', ')) : ''}</span></div>
      <div class="card-b"><div class="ko-deck"><iframe title="Kick-off deck preview" sandbox="" srcdoc="${esc(d.html)}"></iframe></div>
      <div class="row ko-btns"><button type="button" class="btn sm" data-act="koSlide" data-d="-1">Previous slide</button><span class="xs muted" id="koSlideNo">Slide ${d.k} of ${d.n}</span><button type="button" class="btn sm" data-act="koSlide" data-d="1">Next slide</button><span class="spacer"></span>
      <button type="button" class="btn sm primary" data-act="koDlDeck">Download kick-off deck (HTML)</button><button type="button" class="btn sm" data-act="koDlPlan">Download project plan (HTML)</button></div>
      <p class="xs muted">The downloaded deck has all slides, arrow keys and full screen, works offline, and is marked draft until approved.</p></div></section>`;
  }
  const fitDeck = () => { const box = document.querySelector('.ko-deck'), fr = box && box.querySelector('iframe'); if (fr && box.clientWidth) fr.style.transform = 'scale(' + (box.clientWidth / 1920) + ')'; };
  let fitBound = false;
  function approveBar(p) {
    const a = L().approvalCheck(p, owner(), crDoc()); const dis = ro() ? ' disabled' : '';
    if (p.status === 'approved') return `<div class="ko-bar"><span>${tag('ok', 'Approved')} by ${esc(p.approvedBy)} ${esc(when(p.approvedAt))}</span></div>`;
    return `<div class="ko-bar"><span class="xs muted">${a.ok || !a.why ? 'Review the contract data, then approve.' : esc(a.why)}</span><span class="spacer"></span>
      <button type="button" class="btn sm" data-act="koSave"${dis}>Save</button><button type="button" class="btn sm" data-act="koDiscard"${dis}${p.status === 'discarded' ? ' disabled' : ''}>Discard draft</button>
      <button type="button" class="btn primary" data-act="koApprove"${a.ok ? '' : ' disabled'}>Approve kick-off</button></div>`;
  }
  function page() {
    const head = `<div class="page-header"><div class="t"><h1>Kick-off</h1><p>The contract, the kick-off deck and the project plan, drafted together by Claude. You review and approve once.</p></div></div>`;
    const k = K(); if (k.pid !== pid()) Object.assign(k, { pid: pid(), jobs: null, at: 0, err: '', msa: null, answers: {} });
    const p = pack(); const hasFile = !!((V.plannerDoc && V.plannerDoc() || {}).msa);
    return `${head}<div class="page-body ko">${strip(L().stage(hasFile || !!k.msa, p, k.jobs))}
      ${p && p.status === 'discarded' ? '<div class="notice small">This draft was discarded. Ask Claude to build it again from the contract with Pull MSA, or approve nothing.</div>' : ''}
      <div class="ko-grid">${msaCard(p, hasFile)}${jobsCard()}</div>
      ${p ? packCards(p) + crCard() + deckCard(p) + approveBar(p) : '<div class="empty">The kick-off pack appears here after Claude has read the contract and you have approved the extraction and started the project from it.</div>'}</div>`;
  }
  // The team gets this page; customers keep the older Kick-off Deck viewer.
  const old = V.kickoff;
  V.kickoff = Object.assign({}, old, { html() { return V.isCustomer() ? old.html.apply(this, arguments) : page(); }, mount() { if (V.isCustomer()) return old.mount && old.mount.apply(this, arguments); load(false); poll(); fitDeck(); if (!fitBound) { fitBound = true; addEventListener('resize', fitDeck); } } });

  // ---------- actions ----------
  const guard = () => { if (ro()) { toast('This project is read-only for you.', 4000, true); return true; } return false; };
  const post = async (path, body) => { const r = await API.post(base() + path, body); K().at = 0; await load(true); return r; };
  const slug = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  const file = kind => `${slug(S.project.customer)}-${slug(S.project.name)}-${kind}${(F.doc('kickoff_pack') || {}).status === 'approved' ? '' : '-draft'}.html`;
  ACT.koDlDeck = () => { const p = pack(); if (!p) return; V.download(file('kickoff'), new Blob([root.FWBKickoffDeck.build(p.deck, { fmt: dt }).html], { type: 'text/html' })); };
  ACT.koDlPlan = () => { const p = pack(); if (!p) return; V.download(file('project-plan'), new Blob([root.FWBPlanHtml.build(F.doc('kickoff_pack'), { customer: S.project.customer, project: S.project.name, fmt: dt })], { type: 'text/html' })); };
  ACT.koSlide = a => { const p = pack(); if (!p) return; const k = K(); const d = deckHtml(p, (k.slide || 0) + (+a.getAttribute('data-d') || 0)); k.slide = d.k - 1; const fr = document.querySelector('.ko-deck iframe'); if (fr) fr.srcdoc = d.html; const no = document.getElementById('koSlideNo'); if (no) no.textContent = 'Slide ' + d.k + ' of ' + d.n; };
  ACT.koRefresh = () => load(true);
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
    setDoc('kickoff_cr', r.doc); k.cr = ''; F.changed(null, null, { section: 'kickoff_cr' }); await F.flush();
    try { await post('/jobs', L().changeRequest()); toast('Saved and sent to Claude.', 4000); } catch (e) { toast('Saved, but the job could not be created: ' + (e.message || 'try again'), 7000, true); }
  });
  ACT.koDismiss = a => { if (guard()) return; setDoc('kickoff_cr', L().dismissChange(crDoc(), a.getAttribute('data-id'))); F.changed(null, null, { section: 'kickoff_cr' }); };
  ACT.koSave = a => V.busy(a, async () => { if (guard()) return; await F.flush(); toast('Saved.', 2500); });
  ACT.koDiscard = async () => {
    if (guard() || !pack()) return; if (!(await V.confirmDialog('Discard draft', 'Mark this kick-off draft as discarded? The contract data stays; Claude can build a new draft from a new Pull MSA.', 'Discard', true))) return;
    setDoc('kickoff_pack', L().setStatus(F.doc('kickoff_pack'), 'discarded', S.user.email, new Date().toISOString())); F.changed('Kick-off draft discarded', null, { section: 'kickoff_pack' }); await F.flush();
  };
  ACT.koApprove = a => V.busy(a, async () => {
    const p = pack(); const c = L().approvalCheck(p, owner(), crDoc()); if (!c.ok) { toast(c.why, 6000, true); return; }
    if (!(await V.confirmDialog('Approve kick-off', 'Approve the kick-off deck and the project plan as they are shown? Open items stay open and are listed in the plan.', 'Approve'))) return;
    setDoc('kickoff_pack', L().setStatus(F.doc('kickoff_pack'), 'approved', S.user.email, new Date().toISOString())); F.changed('Kick-off approved', null, { section: 'kickoff_pack' }); await F.flush();
    toast(S.docs.kickoff_pack.dirty ? 'Approval could not be saved yet. Try Save.' : 'Kick-off approved.', 4000);
  });
})(typeof window !== 'undefined' ? window : globalThis);
