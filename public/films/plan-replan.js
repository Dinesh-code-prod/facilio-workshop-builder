/* Plan timeline: re-planning (pilot 3 of the Team Guide films, 25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md). Written as code on the
   shared kit (public/films/kit.js) over five real Studio screens of the demo project's plan (public/films/plan-replan/, taken by tools/film-capture.mjs
   with tools/film-shots/plan-replan.mjs). Registers FWBFilms['plan-replan']; VideoHub: D:/VideoHub/films/plan-replan. */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, fin, lerp, rr, tx, tick, cursor, fade, callout, title } = K;
  const DUR = 86, FILES = ['plan', 'grid', 'why', 'log', 'export'];
  const { load, walk } = K.screens('plan-replan', FILES);
  // where the film points, in screen pixels [x, y, w, h] (tools/film-shots/plan-replan.pos.json, checked on the screens)
  const POS = { kpis: [328, 88, 660, 30], chart: [328, 472, 924, 248], end: [924, 484, 132, 30], chain: [328, 584, 924, 110], bar: [328, 160, 924, 104],
    reason: [700, 171, 291, 40], save: [341, 219, 138, 34], undo: [328, 61, 81, 34], log: [328, 330, 924, 390], exportBtn: [1034, 301, 98, 34], menu: [893, 342, 238, 82] };
  const F = [260, 180, 760];
  const SCENES = [{ name: 'The plan, live', t0: 0, t1: 12 }, { name: 'Edit dates in the grid', t0: 12, t1: 28 }, { name: 'Say why', t0: 28, t1: 42 },
    { name: 'Undo', t0: 42, t1: 50 }, { name: 'The reason log', t0: 50, t1: 64 }, { name: 'Export', t0: 64, t1: 76 }, { name: 'Done when', t0: 76, t1: DUR }];
  const CAPTIONS = [
    [0.4, 6, 'The project plan is the customer\'s timeline: imported from the plan workbook and kept live in Delivery Studio.'],
    [6, 11.8, 'At the top: planned by today, actual, the variance and the go-live date. Nothing is late, for now.'],
    [12.3, 17, 'Show all columns (under Options) opens the grid. Change a date right in its row, like a spreadsheet.'],
    [17, 22, 'The customer needs a week more for UAT: move its end from 17 to 24 January.'],
    [22, 27.8, 'Tasks that depend on it move with it: training, go-live and hypercare follow.'],
    [28.3, 34, 'Every date change asks once: why? Pick the reason, add a short note, and save.'],
    [34, 41.8, 'Customer delay, Facilio delay, scope change, a re-plan agreed with the customer. The reasons stay with the team.'],
    [42.3, 46, 'Moved the wrong task? Undo, or Ctrl+Z, puts the last change back.'],
    [46, 49.8, 'The baseline keeps the plan you agreed, so slip is always counted against it.'],
    [50.3, 57, 'Date changes and reasons, under the timeline, lists every move: when, from, to, how far the end moved, why and who.'],
    [57, 63.8, 'That is your answer when the customer asks why go-live moved.'],
    [64.3, 70, 'Export gives the customer the plan as an Excel workbook or an HTML page.'],
    [70, 75.8, 'Share it after each re-plan, so everyone works from the same dates.'],
    [76.3, 85.6, 'Done when every date change has a reason, the baseline is agreed and the customer has the latest plan.']];

  function live(g, lt) {
    title(g, 'Plan timeline', 'Stage 1 · Kick-off, plan and schedule');
    const w = walk(g, lt, 'plan', 'Kick-off, plan and schedule · Project plan', F, [[0.8, 6, POS.kpis, 1, C.blue], [6, 12, POS.chart, 0.8]]);
    if (w.at && w.step[2] === POS.kpis) callout(g, w.at[0] - 120, w.at[1] - 34, 'Go-live 22 Jan 2027', fin(lt, 2.4, 0.5));
  }
  function edit(g, lt) {
    title(g, 'Edit dates in the grid', 'Like a spreadsheet, with the chart beside it');
    const w = walk(g, lt, 'grid', 'Project plan · Timeline & planning', F, [[0.6, 10, POS.end, 0.8, C.blue], [10, 16, POS.chain, 0.8]]);
    if (w.step && w.step[2] === POS.end && lt < 6.4) {   // the screen shows the date after the change: cover it with the old one until it is typed
      const [x0, y0] = w.map(POS.end[0] + 6, POS.end[1] + 4), [x1, y1] = w.map(POS.end[0] + 100, POS.end[1] + 26); const typed = fin(lt, 4.6, 1.6);
      rr(g, x0, y0, x1 - x0, y1 - y0, 4, '#fff'); const s = typed > 0 ? '24-01-2027'.slice(0, Math.max(3, Math.round(10 * typed))) : '17-01-2027';
      tx(g, s, x0 + 4, y0 + (y1 - y0) * 0.72, Math.round((y1 - y0) * 0.62), C.ink, 500); }
    if (w.at && w.step[2] === POS.end) { cursor(g, lerp(1000, w.at[0], fin(lt, 1.6, 1)), lerp(600, w.at[1], fin(lt, 1.6, 1)), lt > 3 && lt < 3.7 ? fin(lt, 3, 0.6) : 0); callout(g, w.at[0] - 90, w.at[1] - 40, '+7 days', fin(lt, 6.6, 0.5)); }
    if (w.at && w.step[2] === POS.chain) callout(g, w.at[0] - 160, w.at[1] - 64, 'Dependent tasks follow', fin(lt, 11, 0.5));
  }
  function why(g, lt) {
    title(g, 'Say why', 'Asked once, after every date change');
    const w = walk(g, lt, 'why', 'Project plan · Timeline & planning', F, [[0.6, 5, POS.bar, 1, C.amber], [5, 9.5, POS.reason, 0.8, C.blue], [9.5, 14, POS.save, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.save) cursor(g, lerp(700, w.at[0], fin(lt, 10, 1)), lerp(560, w.at[1], fin(lt, 10, 1)), lt > 11.4 ? fin(lt, 11.4, 0.6) : 0);
    ['Customer delay', 'Facilio delay', 'Scope change', 'Re-plan agreed with the customer'].forEach((s, i) => fade(g, fin(lt, 5.4 + i * 0.4, 0.4), () => {
      const y = 250 + i * 50; rr(g, 1040, y, 210, 38, 10, i === 0 ? C.soft : C.page, i === 0 ? C.blue : C.line); tx(g, s.length > 24 ? s.slice(0, 22) + '…' : s, 1056, y + 24, 14, i === 0 ? C.blue : C.ink, 600); }));
    fade(g, fin(lt, 8, 0.5), () => tx(g, 'Team only, never shown', 1040, 470, 14, C.text, 500));
  }
  function undo(g, lt) {
    title(g, 'Undo', 'The last change, back in one press');
    const w = walk(g, lt, 'why', 'Project plan · Timeline & planning', F, [[0.4, 8.4, POS.undo, 0.8, C.blue]]);
    if (w.at) cursor(g, lerp(800, w.at[0], fin(lt, 1, 1)), lerp(500, w.at[1], fin(lt, 1, 1)), lt > 2.4 && lt < 3.1 ? fin(lt, 2.4, 0.6) : 0);
    fade(g, fin(lt, 3, 0.5), () => { rr(g, 1040, 260, 200, 44, 12, C.ink); tx(g, 'Ctrl + Z', 1140, 288, 17, '#fff', 600, 'center'); });
  }
  function log(g, lt) {
    title(g, 'The reason log', 'Every move, with who and why');
    const w = walk(g, lt, 'log', 'Project plan · Date changes and reasons', F, [[0.6, 13.6, POS.log, 1]]);
    if (w.at) { callout(g, w.at[0] + 40, w.at[1] - 150, '+7 d on each task', fin(lt, 3, 0.5)); callout(g, w.at[0] + 170, w.at[1] - 60, 'Customer delay: asset list late', fin(lt, 5, 0.5)); }
  }
  function exp(g, lt) {
    title(g, 'Export', 'Excel workbook or an HTML page');
    const w = walk(g, lt, 'export', 'Project plan · Export', F, [[0.6, 5, POS.exportBtn, 0.8, C.blue], [5, 12, POS.menu, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.exportBtn) cursor(g, lerp(800, w.at[0], fin(lt, 1, 1)), lerp(560, w.at[1], fin(lt, 1, 1)), lt > 2.4 ? fin(lt, 2.4, 0.6) : 0);
  }
  function doneWhen(g, lt) {
    tx(g, 'Done when', 120, 190, 40, C.ink, 700); tx(g, 'Every re-plan, every time', 120, 230, 20, C.text);
    ['Every date change has a reason', 'The baseline is set and agreed with the customer', 'Slip is visible against the baseline', 'The customer has the latest export'].forEach((s, i) => fade(g, fin(lt, 0.6 + i * 0.9, 0.5), () => {
      const y = 270 + i * 70; rr(g, 120, y, 640, 56, 14, C.page, C.line); tick(g, 152, y + 28, 13, fin(lt, 1 + i * 0.9, 0.5)); tx(g, s, 178, y + 34, 18, C.ink, 600); }));
    fade(g, fin(lt, 4.6, 0.6), () => { rr(g, 820, 270, 340, 170, 16, C.soft, '#C7DBFB'); tx(g, 'Changing the baseline?', 844, 308, 18, C.ink, 700);
      ['Options > Set the baseline asks', 'for a reason too. The old ones', 'are kept, ten deep.'].forEach((s, i) => tx(g, s, 844, 342 + i * 26, 15, C.text)); });
  }

  K.register({ id: 'plan-replan', title: 'Plan timeline: re-planning with reasons', label: 'Plan timeline', DUR, SCENES, CAPTIONS, scenes: [live, edit, why, undo, log, exp, doneWhen], load, FILES });
})(typeof window !== 'undefined' ? window : globalThis);
