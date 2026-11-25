/* Tour of Delivery Studio (pilot 1 of the Team Guide films, 25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md). Written as code on the
   shared kit (public/films/kit.js) over seven real Studio screens of the demo project (public/films/tour/, taken by tools/film-capture.mjs with
   tools/film-shots/tour.mjs). Registers FWBFilms.tour; the same file plays in VideoHub's live preview (D:/VideoHub/films/tour). */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, fin, win, lerp, rr, tx, wrap, tick, cursor, fade, callout, title } = K;
  const DUR = 100, FILES = ['projects', 'home', 'stage', 'brd', 'assistant', 'guide', 'customer'];
  const { load, shot, walk } = K.screens('tour', FILES);
  // where the film points, in screen pixels [x, y, w, h] (tools/film-shots/tour.pos.json, checked on the screens)
  const POS = { newProject: [93, 288, 142, 40], demoCard: [452, 617, 380, 103], phase: [328, 134, 924, 52], tiles: [328, 413, 924, 106], doNext: [328, 563, 924, 157],
    menu: [10, 120, 280, 600], stage: [10, 255, 270, 140], pageTitle: [328, 118, 520, 90], mainAct: [1028, 500, 203, 40], checks: [328, 90, 924, 232], update: [895, 498, 154, 34],
    word: [582, 545, 90, 34], askClaude: [1118, 126, 123, 34], message: [574, 503, 668, 108], chips: [328, 372, 924, 111], guideMe: [846, 12, 119, 36],
    asCustomer: [990, 12, 130, 36], badge: [782, 13, 222, 34], exit: [1012, 12, 112, 36], custTabs: [126, 62, 1126, 56] };
  const F = [260, 180, 760];   // where a screen sits on the canvas: x, y, width
  const SCENES = [{ name: 'Your projects', t0: 0, t1: 12 }, { name: 'A project\'s Home', t0: 12, t1: 28 }, { name: 'The menu follows the delivery', t0: 28, t1: 44 },
    { name: 'Claude drafts, you approve', t0: 44, t1: 56 }, { name: 'The Assistant', t0: 56, t1: 66 }, { name: 'What the customer sees', t0: 66, t1: 78 },
    { name: 'Learn as you go', t0: 78, t1: 92 }, { name: 'Your first day', t0: 92, t1: DUR }];
  const CAPTIONS = [
    [0.4, 6, 'Delivery Studio is where Facilio runs every customer implementation, from the signed contract to handover.'],
    [6, 11.8, 'Each customer project lives here. Start one with New project, or practise in Demo: Riverside Towers.'],
    [12.3, 17, 'Open a project and its Home tells you where it stands: the current phase and the next milestone.'],
    [17, 22, 'Three numbers you can act on: how much of the plan is done, what is overdue, and the open risks.'],
    [22, 27.8, 'Do next lists the few things that matter today. Press Open to go straight to the page.'],
    [28.3, 33, 'The menu on the left follows a Facilio implementation in order, stage by stage.'],
    [33, 38, 'Each stage opens into its pages. Here: Requirement sessions, then Transcripts.'],
    [38, 43.8, 'Every page has a title, one line on what it is for, and one main action at the top right.'],
    [44.3, 50, 'Claude, your AI assistant, does the heavy drafting. This BRD is built from the confirmed requirements.'],
    [50, 55.8, 'Nothing is final until you tick each review part and approve it. Claude cannot approve anything.'],
    [56.3, 61, 'The Assistant, bottom right, answers questions about the project at once.'],
    [61, 65.8, 'Bigger work goes to Claude with Ask Claude; its progress shows here, on every page.'],
    [66.3, 72, 'As customer shows the project exactly as the customer sees it: their own menu, read-only.'],
    [72, 77.8, 'Use it before every customer meeting. Exit preview brings you back.'],
    [78.3, 84, 'The Team Guide walks a project in the same order as the menu, with a short film for each part.'],
    [84, 91.8, 'Guide me, at the top of every page, rings each stage and page for you, one click at a time.'],
    [92.3, 99.6, 'Your first day: open the demo project, set up Claude, and watch the film for the stage you are in.']];

  function projects(g, lt) {
    title(g, 'Delivery Studio in a few minutes', 'One place for every Facilio implementation');
    const w = walk(g, lt, 'projects', 'Delivery Studio · Customer projects', F, [[3, 7.5, POS.newProject, 0.8, C.blue], [7.5, 12, POS.demoCard, 0.8]]);
    if (w.at) cursor(g, lerp(1000, w.at[0], fin(lt, w.step[0] + 0.6, 1)), lerp(600, w.at[1], fin(lt, w.step[0] + 0.6, 1)), 0);
  }
  function home(g, lt) {
    title(g, 'A project\'s Home', 'Where it stands, what is due, what to do next');
    const w = walk(g, lt, 'home', 'Demo: Riverside Towers · Home', F, [[0.8, 5, POS.phase, 0.9], [5, 10, POS.tiles, 1], [10, 16, POS.doNext, 1]]);
    if (w.at && w.step[2] === POS.tiles) callout(g, w.at[0] - 120, w.at[1] - 50, 'Click a number to open its list', fin(lt, 6.5, 0.5));
    if (w.at && w.step[2] === POS.doNext) callout(g, w.at[0] - 100, w.at[1] - 60, 'Today\'s top three', fin(lt, 11.5, 0.5));
  }
  function menu(g, lt) {
    title(g, 'The menu follows the delivery', 'Seven stages, in the order you deliver');
    if (lt < 5) { walk(g, lt, 'home', 'Demo: Riverside Towers · Home', F, [[0.5, 5.4, POS.menu, 0.7]]); }
    else { const w = walk(g, lt, 'stage', 'Requirement sessions · Transcripts', F, [[5, 10, POS.stage, 0.85], [10, 16, POS.mainAct, 0.8, C.blue]]);
      if (w.at && w.step[2] === POS.mainAct) callout(g, w.at[0] - 210, w.at[1] - 34, 'One main action per page', fin(lt, 11.2, 0.5)); }
    // the stages, drawn beside the screen
    ['Introduction', 'Sessions', 'Process & design', 'Solution & BRD', 'UAT & FTR', 'Go-live', 'Handover'].forEach((s, i) => fade(g, fin(lt, 0.8 + i * 0.45, 0.5), () => {
      const y = 228 + i * 52; rr(g, 1040, y, 200, 40, 20, i === 1 && lt > 5 ? C.blue : C.page, C.line); tx(g, String(i + 1), 1062, y + 26, 15, i === 1 && lt > 5 ? '#fff' : C.blue, 700, 'center'); tx(g, s, 1080, y + 26, 15, i === 1 && lt > 5 ? '#fff' : C.ink, 600); }));
  }
  function claude(g, lt) {
    title(g, 'Claude drafts, you approve', 'Every draft waits for a person');
    const w = walk(g, lt, 'brd', 'Solution design & BRD · BRD Draft', F, [[0.8, 6, POS.checks, 1, C.ok], [6, 12, POS.update, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.checks) callout(g, w.at[0] - 80, w.at[1] - 80, '4 of 6 review parts ticked', fin(lt, 2, 0.5));
    if (w.at && w.step[2] === POS.update) cursor(g, lerp(1060, w.at[0], fin(lt, 7, 1)), lerp(600, w.at[1], fin(lt, 7, 1)), lt > 8.4 ? fin(lt, 8.4, 0.6) : 0);
  }
  function assistant(g, lt) {
    title(g, 'The Assistant', 'Ask about the project, or hand work to Claude');
    const w = walk(g, lt, 'assistant', 'The Assistant, on every page', F, [[0.6, 5, POS.message, 0.8, C.blue], [5, 10, POS.askClaude, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.message) { const q = 'What is waiting on the customer?', n = Math.round(q.length * fin(lt, 1.4, 2)); fade(g, 1, () => { rr(g, w.at[0] - 200, w.at[1] - 18, 400, 36, 10, 'rgba(255,255,255,.96)', C.blue); tx(g, q.slice(0, n), w.at[0] - 186, w.at[1] + 6, 15, C.ink, 500); }); }
  }
  function customer(g, lt) {
    title(g, 'What the customer sees', 'Preview before every customer meeting');
    if (lt < 4) { const w = walk(g, lt, 'home', 'Demo: Riverside Towers · Home', F, [[0.5, 4.4, POS.asCustomer, 0.8, C.blue]]); if (w.at) cursor(g, lerp(900, w.at[0], fin(lt, 0.8, 1)), lerp(400, w.at[1], fin(lt, 0.8, 1)), lt > 2.4 ? fin(lt, 2.4, 0.6) : 0); }
    else { const w = walk(g, lt, 'customer', 'Customer preview · read-only', F, [[4, 8, POS.custTabs, 1], [8, 12, POS.exit, 0.8]]);
      if (w.at && w.step[2] === POS.custTabs) callout(g, w.at[0] - 150, w.at[1] - 40, 'Only the pages you switch on', fin(lt, 5, 0.5)); }
  }
  function guide(g, lt) {
    title(g, 'Learn as you go', 'The Team Guide, Guide me and these films');
    const w = walk(g, lt, 'guide', 'Help · Team Guide', F, [[0.6, 6, POS.chips, 1], [6, 13.6, POS.guideMe, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.chips) fade(g, fin(lt, 2.2, 0.5), () => { rr(g, w.at[0] - 120, w.at[1] + 70, 240, 44, 22, C.blue); g.beginPath(); g.moveTo(w.at[0] - 92, w.at[1] + 82); g.lineTo(w.at[0] - 92, w.at[1] + 102); g.lineTo(w.at[0] - 76, w.at[1] + 92); g.closePath(); g.fillStyle = '#fff'; g.fill(); tx(g, 'Watch: a short film', w.at[0] - 64, w.at[1] + 98, 16, '#fff', 600); });
  }
  function firstDay(g, lt) {
    tx(g, 'Your first day', 120, 200, 40, C.ink, 700); tx(g, 'Three things, in this order', 120, 240, 20, C.text);
    [['Open Demo: Riverside Towers', 'A safe practice project with data in every stage'], ['Set up Claude', 'Help > Claude setup: about two minutes, once'], ['Watch the film for your stage', 'Each Team Guide section has one']].forEach(([a, b], i) => fade(g, fin(lt, 0.8 + i * 1.4, 0.6), () => {
      const y = 300 + i * 96; rr(g, 120, y, 640, 76, 16, C.page, C.line); tick(g, 160, y + 38, 16, fin(lt, 1.2 + i * 1.4, 0.6), C.blue); tx(g, a, 194, y + 34, 20, C.ink, 600); tx(g, b, 194, y + 58, 15, C.text); }));
    fade(g, fin(lt, 4.5, 0.8), () => { shot(g, 'projects', 820, 300, 340, 'Delivery Studio'); wrap(g, 'Facilio blue marks what to press. Amber rings mark what to look at.', 820, 540, 340, 15, C.text, 400, 22); });
  }

  K.register({ id: 'tour', title: 'A tour of Delivery Studio', label: 'Tour', DUR, SCENES, CAPTIONS, scenes: [projects, home, menu, claude, assistant, customer, guide, firstDay], load, FILES });
})(typeof window !== 'undefined' ? window : globalThis);
