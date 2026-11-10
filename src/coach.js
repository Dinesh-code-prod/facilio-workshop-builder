/* Guided start: a game-style walkthrough. A ring pulses on the menu entry to click next, a small card says what it is for, and "Next" or a click on the
   ring moves to the following step, in project order (stage 1 to 8). Opens from the "Guide me" button (team users, inside a project) or once, on its own,
   the first time a team member opens a project. Skip any time. Nothing is saved except "seen" in this browser. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews;
  const doc = root.document;
  // [menu page id, title, what it is for]; steps whose page is not in this person's menu are skipped
  const STEPS = [
    ['msaintake', 'Start with the contract', 'Drop in the signed contract. The Studio reads it and fills the project for you.'],
    ['intro', 'Plan the kick-off', 'The kick-off deck, scope and project plan live here.'],
    ['projdash', 'See where you are', 'Health, deadlines and what needs attention today.'],
    ['tasks', 'Run the project', 'Tasks and the project mailbox in one place.'],
    ['rsquestions', 'Stage 2: prepare the sessions', 'Questions to ask the customer, then run the workshops from here.'],
    ['rstrans', 'Keep what was said', 'Add the recordings; AI turns them into requirements and open questions.'],
    ['whiteboard', 'Draw the customer process', 'Capture each process and its steps.'],
    ['solution', 'Stage 3: design the solution', 'Modules, flows and decisions, agreed module by module.'],
    ['brd', 'Write the BRD', 'Built from everything above. The customer signs it off online.'],
    ['delivery', 'Stage 4: build and test', 'Build status, UAT and test cases linked to requirements.'],
    ['ftr', 'FTR workbook', 'The first-time-right checklist for testers.'],
    ['guides', 'Stage 5: training guides', 'Write the guides the customer team will use.'],
    ['golive', 'Stage 6: go-live', 'Everything that must be true before switching on.'],
    ['hypercare', 'Stage 7: hypercare', 'Close support in the first weeks after go-live.'],
    ['handover', 'Stage 8: hand over', 'Hand the project to support and close it.']
  ];
  let list = [], at = -1, timer = 0, ring, card;
  const team = () => !!(S.user && S.user.kind !== 'customer');
  const seenKey = () => 'fwb_coach_' + ((S.project && S.project.id) || '');
  const lsGet = k => { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = k => { try { root.localStorage.setItem(k, '1'); } catch (e) { /* private window */ } };
  const target = id => doc.querySelector('.sidebar .sb-item[data-view="' + id + '"]');
  const groupOf = id => [...doc.querySelectorAll('.sidebar .sb-title')].find(b => (b.getAttribute('data-views') || '').split(',').includes(id));
  const present = () => STEPS.filter(s => target(s[0]) || groupOf(s[0]));
  function ensureOpen(id) { if (target(id)) return; const b = groupOf(id); if (b && b.getAttribute('data-open') !== 'true') b.click(); }
  function stop(markSeen) {
    clearInterval(timer); timer = 0; at = -1;
    if (ring) ring.remove(); if (card) card.remove(); ring = card = null;
    doc.removeEventListener('click', onClick, true); doc.removeEventListener('keydown', onKey, true);
    if (markSeen) lsSet(seenKey());
  }
  function place() {
    if (at < 0 || !ring) return;
    const id = list[at][0]; ensureOpen(id); const t = target(id);
    if (!t || !t.offsetParent) { ring.style.display = 'none'; return; }
    t.scrollIntoView({ block: 'nearest' });
    const r = t.getBoundingClientRect(); ring.style.display = '';
    Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    const left = Math.min(r.right + 16, root.innerWidth - 302);
    Object.assign(card.style, { left: Math.max(8, left) + 'px', top: Math.max(12, Math.min(r.top - 8, root.innerHeight - card.offsetHeight - 12)) + 'px' });
  }
  function show(i) {
    at = Math.max(0, Math.min(i, list.length - 1)); const s = list[at];
    card.innerHTML = `<p class="co-n">Step ${at + 1} of ${list.length}</p><h3>${esc(s[1])}</h3><p>${esc(s[2])}</p><p class="co-hint">Click the glowing menu entry, or press Next.</p>
      <div class="co-b"><button class="btn sm" data-co="skip">Skip guide</button><span></span>${at ? '<button class="btn sm" data-co="back">Back</button>' : ''}<button class="btn sm primary" data-co="next">${at === list.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    place();
  }
  function advance(d) { const n = at + d; if (n >= list.length) { stop(true); return; } show(Math.max(0, n)); }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-co]');
    if (b) {
      e.preventDefault(); e.stopPropagation(); const k = b.getAttribute('data-co');
      if (k === 'skip') stop(true); else if (k === 'back') advance(-1); else { if (V.go) V.go(list[at][0]); advance(1); }
      return;
    }
    const it = e.target.closest && e.target.closest('.sb-item');
    if (it && at >= 0 && it.getAttribute('data-view') === list[at][0]) setTimeout(() => advance(1), 250);
  }
  const onKey = e => { if (e.key === 'Escape') stop(true); };
  function start() {
    if (!team() || !S.project) return;
    stop(); list = present(); if (!list.length) return;
    ring = doc.createElement('div'); ring.className = 'co-ring'; card = doc.createElement('div'); card.className = 'co-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided start');
    doc.body.appendChild(ring); doc.body.appendChild(card);
    doc.addEventListener('click', onClick, true); doc.addEventListener('keydown', onKey, true);
    timer = setInterval(place, 400); show(0);
  }
  // the "Guide me" pill, and the one-time offer the first time a team member opens a project
  function pill() {
    const old = doc.getElementById('coPill'); const ok = team() && S.project && doc.querySelector('.sidebar .sb-title');
    if (!ok) { if (old) old.remove(); return; }
    if (!old) { const b = doc.createElement('button'); b.id = 'coPill'; b.className = 'co-pill'; b.textContent = 'Guide me'; b.title = 'A short guided walk through the project, step by step'; b.addEventListener('click', start); doc.body.appendChild(b); }
    if (!lsGet(seenKey()) && at < 0) { lsSet(seenKey()); setTimeout(start, 800); }
  }
  setInterval(pill, 1500);
  V.coach = { start, stop };
})(typeof window !== 'undefined' ? window : globalThis);
