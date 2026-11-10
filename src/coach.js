/* Guided start: a game-style walkthrough of all eight stages. For each stage a ring marks the stage in the menu with a card saying what happens there and
   what you finish with, then the ring walks through every page of that stage ("click here, then here"). "Next" opens the page, a click on the ring does too.
   Opens from the "Guide me" pill (team users, inside a project) or once on its own the first time a team member opens a project. Skip any time.
   Nothing is saved except "seen" in this browser. Page descriptions come from the menu hints (V.NAV_HINT in shell.js). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews;
  const doc = root.document;
  // stage number: [what happens, what you finish with]
  const STAGE = {
    1: ['Read the signed contract, plan the project and run the kick-off.', 'A project plan and the kick-off deck.'],
    2: ['Run the workshops with the customer. AI reads the recordings and drafts the notes.', 'Requirements, use cases and open questions.'],
    3: ['Agree the solution module by module, then write the BRD from it.', 'A BRD the customer has signed off.'],
    4: ['The customer tests. Every test links back to a requirement.', 'Test results and the FTR workbook.'],
    5: ['Write the guides the customer\'s staff will use.', 'User guides and walkthroughs.'],
    6: ['Check that everything is ready, then switch on.', 'A signed go-live checklist.'],
    7: ['Support closely for the first weeks after go-live.', 'Hypercare reports.'],
    8: ['Hand the project to the support team and close it.', 'The handover pack and closure report.']
  };
  let list = [], at = -1, timer = 0, ring, card;
  const team = () => !!(S.user && S.user.kind !== 'customer');
  const seenKey = () => 'fwb_coach_' + ((S.project && S.project.id) || '');
  const lsGet = k => { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = k => { try { root.localStorage.setItem(k, '1'); } catch (e) { /* private window */ } };
  const stageBtns = () => [...doc.querySelectorAll('.sidebar .sb-title')].filter(b => b.querySelector('.sb-no'));
  const stageEl = g => stageBtns().find(b => b.getAttribute('data-g') === g);
  const itemEl = id => doc.querySelector('.sidebar .sb-item[data-view="' + id + '"]');
  const tgt = s => (s.kind === 'stage' ? stageEl(s.g) : itemEl(s.id));
  function build() {
    const out = [];
    stageBtns().forEach(b => {
      const g = b.getAttribute('data-g'); const n = +b.querySelector('.sb-no').textContent; const name = g.replace(/^\d\.\s*/, '');
      out.push({ kind: 'stage', g, n, name });
      (b.getAttribute('data-views') || '').split(',').filter(Boolean).forEach(id => out.push({ kind: 'page', g, id, n }));
    });
    return out;
  }
  function ensureOpen(s) {
    if (s.kind === 'page' && !itemEl(s.id)) { const b = stageEl(s.g); if (b && b.getAttribute('data-open') !== 'true') b.click(); }
  }
  function stop(markSeen) {
    clearInterval(timer); timer = 0; at = -1;
    if (ring) ring.remove(); if (card) card.remove(); ring = card = null;
    doc.removeEventListener('click', onClick, true); doc.removeEventListener('keydown', onKey, true);
    if (markSeen) lsSet(seenKey());
  }
  function place() {
    if (at < 0 || !ring) return;
    const s = list[at]; ensureOpen(s); const t = tgt(s);
    if (!t || !t.offsetParent) { ring.style.display = 'none'; return; }
    t.scrollIntoView({ block: 'nearest' });
    const r = t.getBoundingClientRect(); ring.style.display = '';
    Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    const left = Math.min(r.right + 16, root.innerWidth - 302);
    Object.assign(card.style, { left: Math.max(8, left) + 'px', top: Math.max(12, Math.min(r.top - 8, root.innerHeight - card.offsetHeight - 12)) + 'px' });
  }
  function text(s) {
    if (s.kind === 'stage') { const d = STAGE[s.n] || ['', '']; return [`Stage ${s.n}: ${s.name}`, d[0], d[1] ? 'You finish with: ' + d[1] : '', 'Click the stage to open it, or press Next.']; }
    ensureOpen(s); const t = itemEl(s.id); const lab = t ? (t.querySelector('span') || t).firstChild.textContent.trim() : s.id;
    return [lab, (V.NAV_HINT && V.NAV_HINT[s.id]) || 'A page of this stage.', '', 'Click the glowing page to open it, or press Next.'];
  }
  function show(i) {
    at = Math.max(0, Math.min(i, list.length - 1)); const s = list[at]; const [h, p1, p2, hint] = text(s);
    const stageNo = s.kind === 'page' ? ` · stage ${s.n}` : '';
    card.innerHTML = `<p class="co-n">Step ${at + 1} of ${list.length}${stageNo}</p><h3>${esc(h)}</h3><p>${esc(p1)}</p>${p2 ? `<p><b>${esc(p2)}</b></p>` : ''}<p class="co-hint">${esc(hint)}</p>
      <div class="co-b"><button class="btn sm" data-co="skip">Skip guide</button><span></span>${at ? '<button class="btn sm" data-co="back">Back</button>' : ''}<button class="btn sm primary" data-co="next">${at === list.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    place();
  }
  function advance(d) { const n = at + d; if (n >= list.length) { stop(true); return; } show(Math.max(0, n)); }
  function open(s) { if (s.kind === 'page' && V.go) V.go(s.id); }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-co]');
    if (b) {
      e.preventDefault(); e.stopPropagation(); const k = b.getAttribute('data-co');
      if (k === 'skip') stop(true); else if (k === 'back') advance(-1); else { open(list[at]); advance(1); }
      return;
    }
    const s = list[at]; if (!s) return;
    const hit = s.kind === 'stage' ? e.target.closest('.sb-title') : e.target.closest('.sb-item');
    const key = hit && (s.kind === 'stage' ? hit.getAttribute('data-g') === s.g : hit.getAttribute('data-view') === s.id);
    if (key) setTimeout(() => advance(1), 250);
  }
  const onKey = e => { if (e.key === 'Escape') stop(true); };
  function start() {
    if (!team() || !S.project) return;
    stop(); list = build(); if (!list.length) return;
    ring = doc.createElement('div'); ring.className = 'co-ring'; card = doc.createElement('div'); card.className = 'co-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided start');
    doc.body.appendChild(ring); doc.body.appendChild(card);
    doc.addEventListener('click', onClick, true); doc.addEventListener('keydown', onKey, true);
    timer = setInterval(place, 400); show(0);
  }
  // the "Guide me" pill, and the one-time offer the first time a team member opens a project
  function pill() {
    const old = doc.getElementById('coPill'); const ok = team() && S.project && stageBtns().length;
    if (!ok) { if (old) old.remove(); return; }
    if (!old) { const b = doc.createElement('button'); b.id = 'coPill'; b.className = 'co-pill'; b.textContent = 'Guide me'; b.title = 'A guided walk through all eight stages, step by step'; b.addEventListener('click', start); doc.body.appendChild(b); }
    if (!lsGet(seenKey()) && at < 0) { lsSet(seenKey()); setTimeout(start, 800); }
  }
  setInterval(pill, 1500);
  V.coach = { start, stop };
})(typeof window !== 'undefined' ? window : globalThis);
