/* Claude setup film (user, 25 Nov 2026; plan docs/plans/CLAUDE-SETUP-VIDEO-PLAN-2026-11-25.md). A film written as code on the shared kit (public/films/kit.js):
   draw(g, t) paints second t as a pure function of t, so the Studio's player (src/filmplayer.js) and VideoHub's live preview (D:/VideoHub/films/claude-setup)
   show the same frames. Captions are drawn on the picture; there is no sound. Registers FWBFilms['claude-setup']. */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, clamp, fin, win, lerp, rr, tx, wrap, tick, windowBox, cursor, avatar, ring } = K;
  const DUR = 110;
  const SCENES = [{ name: 'What Claude does for you', t0: 0, t1: 20 }, { name: '1. Install four apps', t0: 20, t1: 40 }, { name: '2. Ask for access', t0: 40, t1: 50 },
    { name: '3. Paste the setup message', t0: 50, t1: 75 }, { name: '4. Your checklist', t0: 75, t1: 95 }, { name: 'You are set', t0: 95, t1: DUR }];
  // the real Delivery Studio screens (1280x720 JPEGs in claude-setup/) and where on them the film points (tools/film-capture.mjs)
  const FILES = ['home', 'setup', 'install'], POS = {"copy":[999,331,216,40],"python":[362,250,407,118],"access":[796,80,437,138]};
  const { shot, load } = K.screens('claude-setup', FILES);

  // the narration, in the team's own words (user, 25 Nov 2026: "more in a Facilio kind of language, and more explanatory")
  const CAPTIONS = [
    [0.4, 5, 'Delivery Studio is where Facilio runs every implementation: contract, workshops, BRD, UAT and handover.'], [5, 10, 'Claude, your AI assistant, does the heavy reading and drafting on your projects.'],
    [10, 15, 'It reads workshop transcripts, drafts the BRD, finds customer mail and builds UAT guides and FTRs.'], [15, 19.8, 'Nothing reaches the customer on its own: every draft waits for you to review and approve.'],
    [20.3, 26, 'Step 1 of 4. Install four apps on your laptop, once. They let Claude work on your projects.'], [26, 32, 'Python runs the Facilio skills (FTR, UAT guides). In its installer, tick "Add python.exe to PATH".'],
    [32, 36, 'Node.js gives you instant answers in the Assistant. Git copies the Facilio skills to your laptop.'], [36, 39.8, 'On a Mac, one Terminal command brings Python and Git: xcode-select --install.'],
    [40.3, 45, 'Step 2 of 4. Ask your project lead for access.'], [45, 49.8, 'They add you to the project in Delivery Studio and give you read access to the Facilio skills on Bitbucket.'],
    [50.3, 57, 'Step 3 of 4. In Delivery Studio, open Claude setup and press "Copy the setup message".'], [57, 65, 'Open the Claude app, choose the Code tab, start a new chat and paste the message.'],
    [65, 74.8, 'Claude checks your laptop piece by piece, and always asks before it installs anything.'],
    [75.3, 82, 'Step 4 of 4. Back in Claude setup, your checklist fills in as Claude reports each piece.'], [82, 88, 'Anything missing shows in red with what to do, for example add the connector in Claude settings, Connectors.'],
    [88, 94.8, 'Fix it, paste the setup message again, and repeat until all nine pieces are ready.'],
    [95.3, 102, 'You are set. Ask the Assistant about your project and Claude answers in seconds.'], [102, 109.6, 'Every page has "Open in Claude". Stuck? See "If something does not work", or ask your project lead.']];

  // ---------- scenes (lt = seconds into the scene) ----------
  function why(g, lt) {
    tx(g, 'Set up Claude for Delivery Studio', 120, 170, 44, C.ink, 700); tx(g, 'Once, on your own computer · about two minutes', 120, 210, 20, C.text);
    shot(g, 'home', 120, 240, 620, 'Delivery Studio · your project');
    const x = lerp(1180, 790, fin(lt, 2, 1.2));
    rr(g, x, 300, 400, 160, 16, C.page, C.line); avatar(g, x + 34, 336, 'C', C.violet, 16); tx(g, 'Claude', x + 60, 332, 15, C.ink, 600); tx(g, 'Draft ready: BRD section', x + 60, 354, 14, C.text);
    rr(g, x + 24, 384, 160, 38, 10, C.soft); tx(g, 'Waiting for you', x + 104, 408, 14, C.blue, 600, 'center');
    [['Reads workshop transcripts, drafts the BRD', 10], ['Finds customer mail and follow-ups', 11.2], ['Builds UAT guides and FTRs with the Facilio skills', 12.4]].forEach(([l, t0], i) => { const a1 = g.globalAlpha; g.globalAlpha = a1 * fin(lt, t0, 0.5); tick(g, 802, 490 + i * 30, 9, fin(lt, t0 + 0.2, 0.5), C.blue); tx(g, l, 820, 496 + i * 30, 15, C.ink, 500); g.globalAlpha = a1; });
    const q = fin(lt, 5.5, 0.6); if (q > 0) { const a = g.globalAlpha; g.globalAlpha = a * q; rr(g, x + 200, 384, 120, 38, 10, C.blue); tx(g, 'Approve', x + 260, 408, 14, '#fff', 600, 'center'); g.globalAlpha = a; tick(g, x + 366, 336, 13, fin(lt, 6.5, 0.6)); }
  }
  function install(g, lt) {
    tx(g, 'Step 1 · Install these four', 120, 150, 36, C.ink, 700);
    const mac = lt > 14.4; rr(g, 900, 118, 240, 40, 20, '#F1F5F9'); rr(g, mac ? 1020 : 904, 122, 116, 32, 16, C.page); tx(g, 'Windows', 962, 144, 15, mac ? C.muted : C.blue, 600, 'center'); tx(g, 'Mac', 1078, 144, 15, mac ? C.blue : C.muted, 600, 'center');
    { const m = shot(g, 'install', 120, 180, 680, 'Delivery Studio · Claude setup · Start here', POS.python, win(lt, 6, 14.2, 1)); if (lt > 6.5 && lt < 14) ring(g, m, POS.python, lt); }
    [['Claude app', 'sign in with your Facilio account'], ['Python 3', 'runs the Facilio skills'], ['Node.js (LTS)', 'gives instant answers'], ['Git', 'copies the Facilio skills']].forEach(([n, why2], i) => { const a1 = g.globalAlpha; g.globalAlpha = a1 * fin(lt, 0.6 + i * 1.2, 0.6); tick(g, 842, 222 + i * 50, 11, fin(lt, 1 + i * 1.2, 0.5)); tx(g, n, 864, 220 + i * 50, 17, C.ink, 600); tx(g, why2, 864, 240 + i * 50, 14, C.text); g.globalAlpha = a1; });
    const a0 = g.globalAlpha; let z = win(lt, 14.6, 20, 0.5); if (z > 0) { g.globalAlpha = a0 * z; windowBox(g, 820, 420, 360, 180, 'Terminal (Mac)'); rr(g, 836, 466, 328, 118, 8, C.ink); tx(g, '$ xcode-select --install', 852, 504, 17, '#E2E8F0', 500); tx(g, 'Python 3 and Git, in one step', 852, 538, 15, C.muted); }
    g.globalAlpha = a0;
  }
  function access(g, lt) {
    tx(g, 'Step 2 · Ask for access', 120, 150, 36, C.ink, 700);
    const person = (x, label, col) => { avatar(g, x, 310, label[0], col, 46); tx(g, label, x, 392, 18, C.ink, 600, 'center'); };
    person(300, 'Your lead', C.navy); person(980, 'You', C.blue);
    g.strokeStyle = C.blue; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(360, 310); g.lineTo(lerp(360, 920, fin(lt, 1, 1.4)), 310); g.stroke(); g.setLineDash([]);
    const a0 = g.globalAlpha;
    [['Added to the project in Delivery Studio', 3], ['Read access to facilio-impl-ai-skills', 5]].forEach(([l, t0], i) => { g.globalAlpha = a0 * fin(lt, t0, 0.5); rr(g, 420, 430 + i * 64, 440, 48, 12, C.okSoft); tick(g, 448, 454 + i * 64, 12, fin(lt, t0 + 0.3, 0.5)); tx(g, l, 470, 460 + i * 64, 17, C.ink, 500); });
    g.globalAlpha = a0;
  }
  function paste(g, lt) {
    tx(g, 'Step 3 · Paste the setup message', 120, 150, 36, C.ink, 700); const a0 = g.globalAlpha;
    if (lt < 7.2) { const m = shot(g, 'setup', 180, 170, 760, 'Delivery Studio · Claude setup', POS.copy, fin(lt, 0.3, 1.4) * 0.55); const [bx, by] = ring(g, m, POS.copy, lt, C.blue);
      const cp = fin(lt, 1, 2); cursor(g, lerp(560, bx, cp), lerp(560, by, cp), lt > 3.2 ? fin(lt, 3.2, 0.6) : 0);
      const ok = win(lt, 4, 7.2, 0.3); if (ok > 0) { g.globalAlpha = a0 * ok; rr(g, 900, 520, 230, 40, 10, C.ink); tx(g, 'Copied', 1015, 546, 15, '#fff', 600, 'center'); g.globalAlpha = a0; }
      return; }
    const l2 = lt - 7.2; windowBox(g, 120, 190, 1040, 380, 'Claude app');
    ['Chat', 'Cowork', 'Code'].forEach((l, i) => { const on = i === 2 && l2 > 1; if (on) rr(g, 520 + i * 90, 206, 80, 28, 14, C.ink); tx(g, l, 560 + i * 90, 225, 14, on ? '#fff' : C.text, 600, 'center'); });
    rr(g, 150, 250, 200, 290, 10, '#F8FAFC'); rr(g, 166, 266, 168, 34, 8, fin(l2, 2, 0.4) > 0.5 ? C.soft : C.page, C.line); tx(g, '+ New chat', 250, 289, 14, C.blue, 600, 'center');
    const msg = 'Set up my computer for Facilio Delivery Studio…'; const typed = fin(l2, 4, 2.5); rr(g, 380, 470, 760, 56, 12, C.page, C.line); if (typed > 0 && l2 < 7) tx(g, msg.slice(0, Math.round(msg.length * typed)), 400, 504, 16, C.ink);
    if (l2 > 7) { g.globalAlpha = a0 * fin(l2, 7, 0.6); rr(g, 380, 270, 700, 70, 12, C.soft); tx(g, msg + ' (2 pages)', 400, 311, 15, C.ink); g.globalAlpha = a0; }
    if (l2 > 9.5) { g.globalAlpha = a0 * fin(l2, 9.5, 0.6); avatar(g, 398, 382, 'C', C.violet, 14); wrap(g, 'I will check nine pieces on this computer. Node.js is missing: may I install it?', 424, 378, 640, 16, C.ink, 400, 22);
      rr(g, 424, 412, 90, 34, 10, C.blue); tx(g, 'Yes', 469, 434, 14, '#fff', 600, 'center'); rr(g, 524, 412, 90, 34, 10, C.page, C.line); tx(g, 'Not now', 569, 434, 14, C.ink, 600, 'center'); g.globalAlpha = a0; }
    if (l2 < 9.5) cursor(g, lerp(250, 700, fin(l2, 4, 2)), lerp(290, 498, fin(l2, 2.5, 1.5)), l2 > 2 && l2 < 2.6 ? fin(l2, 2, 0.6) : 0); else cursor(g, 470, 430, fin(l2, 13, 0.6));
  }
  function checklist(g, lt) {
    tx(g, 'Step 4 · Your checklist', 120, 150, 36, C.ink, 700);
    const P = ['Delivery Studio connector', 'Microsoft 365 connector', 'Facilio skills (toolbox)', 'Facilio skills copy', 'Instant answers (watcher)', 'Job queue (every 30 minutes)', 'Node.js', 'Git', 'Python'];
    const okAt = i => (i === 6 ? 15.5 : 1 + i * 1.1), missing = i => i === 6 && lt > 1 + 6 * 1.1 && lt < 15.5;
    const nOk = P.filter((_, i) => lt >= okAt(i)).length;
    rr(g, 120, 180, 1040, 56, 12, nOk === 9 ? C.okSoft : C.soft); tx(g, nOk === 9 ? 'All nine pieces ready' : nOk + ' of 9 pieces ready', 144, 215, 20, C.ink, 600);
    rr(g, 120, 250, 1040, 330, 12, C.page, C.line);
    P.forEach((l, i) => { const y = 284 + i * 33, ok = lt >= okAt(i), miss = missing(i);
      g.beginPath(); g.arc(150, y - 5, 6, 0, Math.PI * 2); g.fillStyle = ok ? C.ok : miss ? C.bad : C.line; g.fill();
      tx(g, ok ? 'Ready' : miss ? 'Missing' : 'Not checked', 166, y, 15, miss ? C.bad : C.text, 500); tx(g, l, 300, y, 16, C.ink, 600);
      if (miss) tx(g, 'Install Node.js (LTS), then paste the setup message again', 620, y, 15, C.bad, 500); });
  }
  function done(g, lt) {
    tx(g, 'You are set', 120, 150, 40, C.ink, 700); const a0 = g.globalAlpha;
    windowBox(g, 120, 190, 620, 340, 'Assistant'); rr(g, 340, 240, 380, 44, 14, C.soft); tx(g, 'What is waiting on the customer?', 360, 268, 15, C.ink, 500);
    g.globalAlpha = a0 * fin(lt, 1.5, 0.8); avatar(g, 160, 330, 'C', C.violet, 14); rr(g, 186, 306, 520, 100, 14, '#F8FAFC');
    wrap(g, 'Two items: the asset register (due Friday) and the BRD sign-off, requested on 20 Nov.', 204, 336, 480, 16, C.ink, 400, 24); tx(g, 'answered in 4 s', 204, 392, 13, C.muted);
    g.globalAlpha = a0 * fin(lt, 6, 0.6); rr(g, 800, 190, 340, 130, 16, C.page, C.line); tx(g, 'On every page', 824, 226, 15, C.text, 500); rr(g, 824, 248, 180, 40, 10, C.blue); tx(g, 'Open in Claude', 914, 274, 15, '#fff', 600, 'center');
    rr(g, 820, 244, 188, 48, 12, null, `rgba(21,112,239,${0.25 + 0.35 * (Math.sin(lt * 3) + 1) / 2})`);
    g.globalAlpha = a0 * fin(lt, 9, 0.6); rr(g, 800, 340, 340, 160, 16, C.page, C.line); tx(g, 'Stuck?', 824, 376, 18, C.ink, 600); wrap(g, 'Claude setup → "If something does not work", or ask your lead.', 824, 408, 290, 15, C.text, 400, 22);
    g.globalAlpha = a0;
  }

  K.register({ id: 'claude-setup', title: 'Set up Claude for Delivery Studio', label: 'Claude setup', DUR, SCENES, CAPTIONS, scenes: [why, install, access, paste, checklist, done], load, FILES });
})(typeof window !== 'undefined' ? window : globalThis);
