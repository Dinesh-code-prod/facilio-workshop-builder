/* Claude setup film (user, 26 Nov 2026: "how this Claude setup has to be created as a guide, which exactly resembles our Delivery Studio UI"; plan
   docs/plans/GUIDE-FILMS-CLAUDE-AND-TEAM-PLAN-2026-11-26.md). Made like a screen recording on the shared kit (public/films/kit.js): the real Help > Claude setup
   page of the demo project (public/films/claude-setup/, WebP, tools/film-shots/claude-setup.mjs; the checklist after a setup report with two pieces missing)
   with the mouse clicking where people click; the Claude app side (the Code tab, the pasted message, Claude's checks and questions) is drawn plainly. What it
   says follows the page as it is today: src/claudesetup.js (10 pieces, the watcher every 15 minutes, the job queue every 30) and src/claudewatch.js. */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, fin, rr, tx, tick, cursor, fade, pulse, label, track } = K;
  const TAB = { connect: [430, 262, 150, 36], jobs: [590, 262, 120, 36], skills: [722, 262, 116, 36], how: [851, 262, 124, 36] };

  // ---- the Claude app, drawn plainly: the Code tab, a new chat, the pasted setup message, Claude checking piece by piece ----
  const CHECKS = [['Windows', 'which computer this is'], ['Python, Node.js, Git', 'the programs the skills need'], ['Facilio Delivery Studio connector', 'https://mcp.facilio.work/facilio-delivery-studio'],
    ['Microsoft 365 connector', 'mail, transcripts, contracts'], ['Facilio skills', 'copied from Bitbucket into your Claude'], ['Instant answers (watcher)', 'a task every 15 minutes'],
    ['Job queue', 'a task every 30 minutes'], ['Report to the Studio', 'your checklist fills in']];
  function app(g, lt) {
    g.fillStyle = '#FAF9F6'; g.fillRect(0, 0, K.W, K.H); g.fillStyle = '#F2F0EA'; g.fillRect(0, 0, 250, K.H); g.fillStyle = C.line; g.fillRect(250, 0, 1, K.H);
    tx(g, 'Claude', 28, 48, 22, C.ink, 700); rr(g, 20, 76, 210, 40, 10, lt > 1.6 && lt < 2.4 ? '#E8E4DA' : '#FFFFFF', C.line); tx(g, '+  New chat', 40, 102, 15, C.ink, 600);
    ['Chat', 'Cowork', 'Code'].forEach((s, i) => { const on = i === 2 && lt > 1; if (on) rr(g, 560 + i * 96, 20, 86, 34, 17, C.ink); tx(g, s, 603 + i * 96, 43, 15, on ? '#fff' : C.text, 600, 'center'); });
    const msg = 'Set up my computer for Facilio Delivery Studio. Check each piece and tell me what is missing...', pasted = lt > 5.2;
    rr(g, 300, 600, 920, 64, 14, '#FFFFFF', C.line); if (!pasted && lt > 3.8) tx(g, 'Pasted: the setup message (2 pages)', 324, 638, 16, C.ink, 500); else if (!pasted) tx(g, 'Reply to Claude...', 324, 638, 16, C.muted);
    if (pasted) { fade(g, fin(lt, 5.2, 0.4), () => { rr(g, 640, 80, 580, 64, 14, '#EFEDE6'); tx(g, msg.slice(0, 62), 660, 108, 15, C.ink, 400); tx(g, '(the setup message, 2 pages)', 660, 130, 14, C.text); }); }
    // Claude checks piece by piece; Node.js is missing, so it asks before installing
    if (lt > 6.4) { K.avatar(g, 318, 186, 'C', C.violet, 14); tx(g, 'I will check each piece on this computer. I never ask for passwords, and I ask before installing anything.', 344, 192, 15, C.ink, 400);
      CHECKS.forEach(([a, b], i) => fade(g, fin(lt, 7 + i * 0.75, 0.35), () => { const y = 232 + i * 38, miss = i === 1 && lt < 15.5; tick(g, 356, y - 5, 10, miss ? 0 : fin(lt, 7.2 + i * 0.75, 0.4), miss ? C.amber : C.ok); tx(g, a, 376, y, 15, C.ink, 600); tx(g, b, 640, y, 14, C.text); if (miss) tx(g, 'Node.js is missing', 900, y, 14, C.amber, 600); })); }
    if (lt > 13) fade(g, fin(lt, 13, 0.4), () => { rr(g, 344, 548, 600, 42, 10, C.amberSoft, '#FCD9A8'); tx(g, 'Node.js is missing. May I install it?', 362, 575, 15, C.ink, 600); rr(g, 760, 553, 76, 32, 8, C.blue); tx(g, 'Yes', 798, 574, 14, '#fff', 600, 'center'); rr(g, 844, 553, 90, 32, 8, '#fff', C.line); tx(g, 'Not now', 889, 574, 14, C.ink, 600, 'center'); });
    const p = track([[0, 900, 400], [0.6, 700, 37], [1.6, 125, 96], [3.0, 125, 96], [3.6, 700, 632], [11.5, 700, 632], [14.4, 798, 569]], lt);
    const press = [[0.6, 1.1], [1.6, 2.1], [3.6, 4.1], [14.4, 14.9]].find(([a, b]) => lt >= a && lt < b);
    [[0.6, 700, 37], [1.6, 125, 96], [14.4, 798, 569]].forEach(([t0, x, y]) => pulse(g, x, y, (lt - t0) / 0.7)); cursor(g, p[0], p[1], press ? (lt - press[0]) / 0.5 : 0);
    const say = lt < 1.6 ? ['Claude app, Code tab', 'The setup runs here, on your computer'] : lt < 3.6 ? ['New chat', ''] : lt < 6.4 ? ['Paste the setup message', 'Ctrl+V: it was copied in the Studio'] : lt < 13 ? ['Claude checks each piece', 'Eight checks, in this order'] : ['It asks before installing', 'Yes, and it carries on'];
    label(g, p[0], p[1], say[0], say[1] || undefined, 1);
  }
  // the connector, when Claude says it is missing: Claude settings > Connectors > Add custom connector
  function connector(g, lt) {
    g.fillStyle = '#FAF9F6'; g.fillRect(0, 0, K.W, K.H); g.fillStyle = 'rgba(15,23,42,.35)'; g.fillRect(0, 0, K.W, K.H);
    rr(g, 340, 110, 600, 440, 16, '#FFFFFF', C.line); tx(g, 'Add custom connector', 372, 160, 22, C.ink, 700); tx(g, 'Claude settings > Connectors', 372, 188, 14, C.text);
    const name = 'Facilio Delivery Studio', url = 'https://mcp.facilio.work/facilio-delivery-studio';
    tx(g, 'Name', 372, 236, 14, C.text, 600); rr(g, 372, 246, 536, 44, 8, '#fff', lt > 1 && lt < 4 ? C.blue : C.line); tx(g, name.slice(0, Math.round(name.length * fin(lt, 1.4, 1.4))), 388, 274, 16, C.ink);
    tx(g, 'Remote MCP server URL', 372, 324, 14, C.text, 600); rr(g, 372, 334, 536, 44, 8, '#fff', lt > 4 && lt < 7.5 ? C.blue : C.line); tx(g, url.slice(0, Math.round(url.length * fin(lt, 4.4, 2.2))), 388, 362, 16, C.ink);
    rr(g, 794, 470, 114, 44, 10, C.blue); tx(g, 'Add', 851, 498, 16, '#fff', 600, 'center');
    if (lt > 9.3) fade(g, fin(lt, 9.3, 0.4), () => { tx(g, 'Then sign in with your Facilio account.', 372, 432, 15, C.ok, 600); });
    const p = track([[0, 900, 600], [0.9, 640, 268], [3.6, 640, 356], [7.6, 640, 356], [8.6, 851, 492]], lt), press = [[0.9, 1.4], [3.6, 4.1], [8.6, 9.1]].find(([a, b]) => lt >= a && lt < b);
    [[0.9, 640, 268], [3.6, 640, 356], [8.6, 851, 492]].forEach(([t0, x, y]) => pulse(g, x, y, (lt - t0) / 0.7)); cursor(g, p[0], p[1], press ? (lt - press[0]) / 0.5 : 0);
    label(g, 960, 200, lt < 3.6 ? 'Name it' : lt < 8.6 ? 'The connector address' : 'Add, then sign in', lt < 3.6 ? 'Facilio Delivery Studio' : lt < 8.6 ? 'It is on the 1. Connect Claude tab, with a Copy button' : 'Claude stops here until it is added', 1);
  }
  function done(g, lt) {
    g.fillStyle = C.bg; g.fillRect(0, 0, K.W, K.H); tx(g, 'You are set', 120, 190, 40, C.ink, 700); tx(g, 'Your Claude works for you on every page', 120, 230, 20, C.text);
    [['Open in Claude', 'On every page: Claude opens on this project and page'], ['The Assistant', 'Bottom right: ask, or hand work to Claude'], ['Transfers', 'Approve what Claude read before it counts']].forEach(([a, b], i) => fade(g, fin(lt, 0.5 + i, 0.5), () => {
      const y = 290 + i * 96; rr(g, 120, y, 760, 76, 16, C.page, C.line); tick(g, 160, y + 38, 16, fin(lt, 0.9 + i, 0.5), C.blue); tx(g, a, 194, y + 34, 20, C.ink, 600); tx(g, b, 194, y + 58, 15, C.text); }));
  }

  const TG = k => 'team-guide/' + k + '.webp';   // screens the Team Guide film already ships
  const beats = [{ card: ['Claude setup', 'Set up Claude for Delivery Studio', 'Once, on your own computer. The mouse shows where to click.'], d: 3.2 },
    { scr: TG('brd'), d: 8, clip: 'cs-why', clipTitle: 'Why Claude', clicks: [{ at: [895, 498, 154, 34], t: 1, look: true, say: ['Claude drafts the heavy parts', 'The BRD, from requirements and transcripts'], cam: [800, 420, 1080] },
      { at: [353, 111, 300, 24], t: 4.2, look: true, say: ['You review and approve', 'Claude cannot approve anything'], cam: [760, 230, 1080] }] },
    { scr: TG('claudesetup'), d: 6.4, clip: 'cs-where', clipTitle: 'Where to find it', clicks: [{ at: [10, 596, 269, 34], t: 1, say: ['Help > Claude setup', 'Start with Start here'] }, { at: [340, 262, 70, 36], t: 3.6, look: true, say: ['Start here', 'Four steps, top to bottom'] }] },
    { card: ['Step 1 and 2', 'Install, then ask for access', 'Windows or Mac'], d: 2.2 },
    { scr: 'install', d: 16, clip: 'cs-install', clipTitle: 'Install these first', clicks: [{ at: [362, 155, 407, 75], t: 1, look: true, say: ['Claude app', 'Sign in with your Facilio account'], cam: [640, 300, 1100] },
      { at: [362, 245, 407, 105], t: 3.8, look: true, say: ['Python 3', 'In the installer, tick Add python.exe to PATH'] }, { at: [362, 368, 407, 72], t: 6.6, look: true, say: ['Node.js (LTS)', 'Instant answers run on it'] },
      { at: [362, 458, 407, 72], t: 9.2, look: true, say: ['Git', 'Copies the Facilio skills'] }, { at: [362, 545, 132, 18], t: 11.6, say: ['On a Mac', 'xcode-select --install brings Python and Git'] },
      { at: [797, 72, 435, 136], t: 14, look: true, say: ['Ask your lead', 'Added to the project; Bitbucket read access'], cam: [900, 200, 1100] }] },
    { card: ['Step 3', 'Paste the setup message in Claude', 'One message sets up everything'], d: 2.2 },
    { scr: 'checklist', d: 4.2, clip: 'cs-message', clipTitle: 'The setup message', clicks: [{ at: [999, 114, 215, 40], t: 1.2, say: ['Copy the setup message', 'Then open the Claude app'], cam: [900, 220, 1040] }] },
    { draw: app, d: 17.5 }, { draw: connector, d: 11.5 },
    { card: ['Step 4', 'Check your list', 'Ten pieces, filled in from what Claude found'], d: 2.2 },
    { scr: 'checklist', d: 4.6, clip: 'cs-checklist', clipTitle: 'Your checklist', clicks: [{ at: [366, 100, 300, 24], t: 1, look: true, say: ['2 pieces missing', 'Claude reported what it found'], cam: [760, 200, 1040] }] },
    { scr: 'checklist2', d: 9.2, clicks: [{ at: [360, 563, 100, 20], t: 1, look: true, say: ['Missing: instant answers', 'The last column says what to do'], cam: [800, 520, 1100] },
      { at: [490, 646, 250, 20], t: 4.6, look: true, say: ['Job queue, every 30 minutes', 'Work the Studio starts by itself'], cam: [800, 520, 1100] }] },
    { scr: 'checklist', d: 5, clicks: [{ at: [999, 114, 215, 40], t: 1.2, say: ['Fixed it? Paste the message again', 'Until all 10 pieces are ready'], cam: [900, 220, 1040] }] },
    { card: ['The tabs', 'Connect, waiting jobs, skills', 'What each tab is for'], d: 2.2 },
    { scr: 'connect', d: 6.4, clip: 'cs-tabs', clipTitle: 'The setup tabs', clicks: [{ at: [347, 636, 812, 36], t: 1, look: true, say: ['1. Connect Claude', 'The connector address, with Copy'], cam: [800, 560, 1100] }] },
    { scr: 'connect', d: 7.4, clicks: [{ at: TAB.jobs, t: 1, then: 'jobs', say: ['2. Waiting jobs', 'Buttons only write a job; your Claude does it'] }, { at: [353, 578, 370, 22], t: 4, look: true, say: ['First aid', 'Say: Do the waiting Delivery Studio jobs'], cam: [800, 520, 1100] }] },
    { scr: 'jobs', d: 5, clicks: [{ at: TAB.skills, t: 1, then: 'skills', say: ['3. Facilio skills', 'FTR, UAT guide and configuration'] }] },
    { scr: 'skills', d: 5, clicks: [{ at: TAB.how, t: 1, then: 'how', say: ['4. How it works', 'What runs where; the safety rules'] }] },
    { scr: 'stuck', d: 8, clip: 'cs-stuck', clipTitle: 'If something does not work', clicks: [{ at: [353, 407, 250, 25], t: 1, look: true, say: ['Stuck?', 'Each problem, with its fix'], cam: [760, 420, 1100] },
      { at: [832, 500, 140, 18], t: 4.4, look: true, say: ['A job stays waiting', 'Say: Do the waiting Delivery Studio jobs'], cam: [900, 520, 1100] }] },
    { scr: TG('assistant'), d: 5.6, clip: 'cs-daily', clipTitle: 'Every day', clicks: [{ at: [588, 509, 646, 52], t: 1, look: true, say: ['Every day: the Assistant', 'Ask, or hand work to Claude'], cam: [900, 380, 1040] }] },
    { scr: TG('transfers'), d: 5.4, clicks: [{ at: [10, 374, 269, 34], t: 1, say: ['Transfers', 'Approve what Claude read before it counts'] }] },
    { draw: done, d: 5 }];
  const FILES = [...new Set(beats.flatMap(b => [b.scr, ...(b.clicks || []).map(c => c.then)]).filter(Boolean))];
  K.recording({ id: 'claude-setup', title: 'Set up Claude for Delivery Studio', sc: K.screens('claude-setup', FILES, 'webp'), FILES, beats });
})(typeof window !== 'undefined' ? window : globalThis);
