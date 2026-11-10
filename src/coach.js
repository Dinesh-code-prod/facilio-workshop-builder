/* Guided start: a game-style walkthrough of the whole menu. A ring marks the thing to click next and a small card says what it is for.
   Works with both menu positions and follows the one in use (the Module tabs rail is the default; the side menu is the other choice):
     rail   a ring on each stage icon in the rail (what happens in the stage, what you finish with), then on each page tab across the top of the page
     side   a ring on each stage heading in the side menu, then on each page under it
   "Next" opens the thing, and so does a click on the ring. Opens from the "Guide me" pill (team and customers, inside a project) or once on its own the
   first time someone opens a project. Skip any time. Switching the menu position while it runs ends it. Nothing is saved except "seen" in this browser.
   Page names and descriptions come from the menu itself (the rail's data-pages, V.NAV_HINT in shell.js). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
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
  // groups without a stage number (the team's project-wide groups, and the customer's menu)
  const GROUP = {
    'Home': ['Where the project stands today and what needs you.', ''], 'Tasks & mail': ['Tasks, the project mailbox and hand-offs, all the way through.', ''],
    'Reports': ['Status reports and what the AI drafted.', ''], 'Notes & Links': ['Notes, links and files kept with the project.', ''],
    'Customer View': ['The pages the customer sees. Switch on only what they need.', ''], 'Help': ['Set up Claude, the Team Guide and what changed lately.', ''], 'Settings': ['People, access and the menu itself.', ''],
    'Your project': ['Where your project stands: the dashboard, the contract, the scope and the plan.', 'You know the plan and what is due next.'],
    'Prepare for sessions': ['Get ready for the workshops: the schedule, what to read and the data we need from you.', 'You arrive at each session prepared.'],
    'Learn Facilio': ['See what Facilio can do and read the guides for your modules.', 'You know the product before it is built.'],
    'Review and sign off': ['Review decisions and changes, follow the build and test it.', 'You have signed off what was agreed.'],
    'And more': ['What changed lately, and more to explore.', '']
  };
  const CUST_HINT = { projdash: 'Where the project stands today', cust_home: 'Your welcome page', kickoff: 'The kick-off deck', contract: 'The signed contract', scope: 'What is in the project', plan: 'Dates and milestones', schedule: 'When each workshop runs', onboarding: 'The data we need from you', governance: 'Decisions and sign-offs waiting for you', changes: 'Changes to the agreed scope', delivery: 'Build progress and test results', uatrun: 'Test the system and report what you find' };
  let list = [], at = -1, timer = 0, ring, card, how = '';
  const user = () => !!(S.user && S.project);
  const lsGet = k => { try { return root.localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = k => { try { root.localStorage.setItem(k, '1'); } catch (e) { /* private window */ } };
  // once for each person (not each project): the first project they open starts the guide by itself; "Take the tour" on the projects home replays it in the demo project
  const seenKey = () => 'fwb_coach_u_' + String((S.user && (S.user.email || S.user.id || S.user.name)) || 'me').toLowerCase();
  const mode = () => (doc.querySelector('.rl .rl-b') ? 'rail' : doc.querySelector('.sidebar .sb-title') ? 'side' : '');
  const isCust = () => !!(S.user && S.user.kind === 'customer');
  const pageOf = id => (V.NAV_HINT && V.NAV_HINT[id]) || CUST_HINT[id] || 'A page of this stage.';

  // ---- the stages of the menu in use, with their pages ----
  function railStages() {
    return [...doc.querySelectorAll('.rl .rl-b')].map(b => {
      let pages = []; try { pages = JSON.parse(b.getAttribute('data-pages') || '[]'); } catch (e) { /* none */ }
      const n = b.querySelector('.rl-n'); const tip = b.getAttribute('data-tip') || '';
      return { g: tip, n: n ? +n.textContent : 0, name: tip.replace(/^\d+\s·\s/, ''), first: b.getAttribute('data-view'), pages };
    });
  }
  function sideStages() {
    return [...doc.querySelectorAll('.sidebar .sb-title')].filter(b => isCust() || b.querySelector('.sb-no')).map(b => {
      const no = b.querySelector('.sb-no'); const g = b.getAttribute('data-g');
      const ids = (b.getAttribute('data-views') || '').split(',').filter(Boolean);
      return { g, n: no ? +no.textContent : 0, name: g.replace(/^\d\.\s*/, ''), first: ids[0], pages: ids.map(id => [id, '', '']) };
    });
  }
  function build() {
    how = mode(); const out = []; const seenN = new Set();
    (how === 'rail' ? railStages() : how === 'side' ? sideStages() : []).forEach(g => {
      const lead = g.n && !seenN.has(g.n); if (g.n) seenN.add(g.n);
      out.push({ kind: 'stage', g: g.g, n: g.n, name: g.name, first: g.first, lead });
      g.pages.filter(p => p[0] !== '#').forEach(p => out.push({ kind: 'page', g: g.g, n: g.n, id: p[0], label: p[1], hint: p[2], first: g.first }));
    });
    return out;
  }

  // ---- finding the thing a step points at ----
  const railBtn = g => [...doc.querySelectorAll('.rl .rl-b')].find(b => b.getAttribute('data-tip') === g);
  const sideBtn = g => [...doc.querySelectorAll('.sidebar .sb-title')].find(b => b.getAttribute('data-g') === g);
  function tgt(s) {
    if (s.kind === 'stage') return how === 'rail' ? railBtn(s.g) : sideBtn(s.g);
    return how === 'rail' ? doc.querySelector('.mt-bar .mt-t[data-view="' + s.id + '"]') : doc.querySelector('.sidebar .sb-item[data-view="' + s.id + '"]');
  }
  // a page step needs its stage open: the rail shows a stage's tabs only while you are in it, the side menu only while its group is open
  function ensureOpen(s) {
    if (s.kind !== 'page' || tgt(s) || s.tried) return;
    s.tried = true;
    if (how === 'rail') { if (V.go) V.go(s.id); } else { const b = sideBtn(s.g); if (b && b.getAttribute('data-open') !== 'true') b.click(); }
  }
  function stop(markSeen) {
    clearInterval(timer); timer = 0; at = -1;
    if (ring) ring.remove(); if (card) card.remove(); ring = card = null;
    doc.removeEventListener('click', onClick, true); doc.removeEventListener('keydown', onKey, true);
    if (markSeen) lsSet(seenKey());
  }
  function place() {
    if (at < 0 || !ring) return;
    if (mode() !== how) { stop(false); return; }   // the menu position was switched
    const s = list[at]; ensureOpen(s); const t = tgt(s);
    if (!t || !t.offsetParent) { ring.style.display = 'none'; return; }
    if (how === 'side') t.scrollIntoView({ block: 'nearest' });
    const r = t.getBoundingClientRect(); ring.style.display = '';
    Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    const below = how === 'rail' && s.kind === 'page';   // the page tabs run across the top, so the card goes under them
    card.classList.toggle('co-below', below);
    const left = below ? Math.min(Math.max(8, r.left), root.innerWidth - 302) : Math.max(8, Math.min(r.right + 16, root.innerWidth - 302));
    const top = below ? r.bottom + 14 : Math.max(12, Math.min(r.top - 8, root.innerHeight - card.offsetHeight - 12));
    Object.assign(card.style, { left: left + 'px', top: top + 'px' });
  }
  function text(s) {
    if (s.kind === 'stage') {
      const d = (s.n && s.lead ? STAGE[s.n] : GROUP[s.name]) || (s.n ? ['More of stage ' + s.n + ': ' + s.name + '.', ''] : ['', '']);
      return [s.n ? `Stage ${s.n}: ${s.name}` : s.name, d[0], d[1] ? 'You finish with: ' + d[1] : '', how === 'rail' ? 'Click the glowing icon to open it, or press Next.' : 'Click the stage to open it, or press Next.'];
    }
    ensureOpen(s); const t = tgt(s); const lab = s.label || (t ? t.textContent.trim() : s.id);
    return [lab, s.hint || pageOf(s.id), '', how === 'rail' ? 'Click the glowing tab at the top, or press Next.' : 'Click the glowing page to open it, or press Next.'];
  }
  function show(i) {
    at = Math.max(0, Math.min(i, list.length - 1)); const s = list[at]; const [h, p1, p2, hint] = text(s);
    const pct = list.length > 1 ? Math.round(at / (list.length - 1) * 100) : 100; const badge = s.n ? `<i class="co-no" aria-hidden="true">${s.n}</i>` : '<i class="co-no co-dot" aria-hidden="true"></i>';
    card.innerHTML = `<div class="co-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      <div class="co-top">${badge}<span class="co-n">${s.kind === 'stage' ? 'Stage' : 'Page'} · step ${at + 1} of ${list.length}</span></div>
      <h3>${esc(h)}</h3><p class="co-p">${esc(p1)}</p>${p2 ? `<p class="co-fin"><i aria-hidden="true">&#10003;</i><span>${esc(p2)}</span></p>` : ''}
      <p class="co-hint"><span class="co-click" aria-hidden="true"></span>${esc(hint)}</p>
      <div class="co-b"><button class="co-skip" data-co="skip">Skip guide</button><span></span>${at ? '<button class="co-back" data-co="back" aria-label="Previous step">Back</button>' : ''}<button class="co-next" data-co="next">${at === list.length - 1 ? 'Finish' : 'Next'}<b aria-hidden="true">&rarr;</b></button></div>
      <p class="co-keys"><kbd>&larr;</kbd> <kbd>&rarr;</kbd> to move, <kbd>Esc</kbd> to leave</p>`;
    place();
  }
  function advance(d) { const n = at + d; if (n >= list.length) { stop(true); return; } show(Math.max(0, n)); }
  function open(s) { if (V.go && (s.kind === 'page' || how === 'rail')) V.go(s.kind === 'page' ? s.id : s.first); }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-co]');
    if (b) {
      e.preventDefault(); e.stopPropagation(); const k = b.getAttribute('data-co');
      if (k === 'skip') stop(true); else if (k === 'back') advance(-1); else { open(list[at]); advance(1); }
      return;
    }
    const s = list[at]; if (!s) return;
    let hit = false;
    if (how === 'rail') { const x = e.target.closest(s.kind === 'stage' ? '.rl-b' : '.mt-t'); hit = !!x && (s.kind === 'stage' ? x.getAttribute('data-tip') === s.g : x.getAttribute('data-view') === s.id); }
    else { const x = e.target.closest(s.kind === 'stage' ? '.sb-title' : '.sb-item'); hit = !!x && (s.kind === 'stage' ? x.getAttribute('data-g') === s.g : x.getAttribute('data-view') === s.id); }
    if (hit) setTimeout(() => advance(1), 250);
  }
  const onKey = e => { if (e.key === 'Escape') stop(true); else if (at >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); if (e.key === 'ArrowRight') { open(list[at]); advance(1); } else advance(-1); } };
  function start() {
    if (!user()) return;
    stop(); list = build(); if (!list.length) return;
    ring = doc.createElement('div'); ring.className = 'co-ring'; card = doc.createElement('div'); card.className = 'co-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided start');
    doc.body.appendChild(ring); doc.body.appendChild(card);
    doc.addEventListener('click', onClick, true); doc.addEventListener('keydown', onKey, true);
    timer = setInterval(place, 400); show(0);
  }
  // the "Guide me" pill, and the one-time offer the first time someone opens a project
  function pill() {
    const old = doc.getElementById('coPill'); const ok = user() && mode();
    if (!ok) { if (old) old.remove(); return; }
    if (!old) { const b = doc.createElement('button'); b.id = 'coPill'; b.className = 'co-pill'; b.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>Guide me'; b.title = 'A guided walk through the menu, step by step'; b.addEventListener('click', start); doc.body.appendChild(b); }
    let go = false; try { go = root.sessionStorage.getItem('fwb_coach_go') === '1'; if (go) root.sessionStorage.removeItem('fwb_coach_go'); } catch (e) { /* private window */ }
    if (at < 0 && (go || !lsGet(seenKey()))) { lsSet(seenKey()); setTimeout(start, 800); }
  }
  // the projects home button: open the demo project (Demo: Riverside Towers, with example data in every section) and start the guide there
  ACT.takeTour = a => V.busy(a, async () => { const r = await root.FWBApi.get('/api/demo-project'); try { root.sessionStorage.setItem('fwb_coach_go', '1'); } catch (e) { /* private window */ } ACT.openProject({ getAttribute: () => r.id }); });
  setInterval(pill, 1500);
  V.coach = { start, stop };
})(typeof window !== 'undefined' ? window : globalThis);
