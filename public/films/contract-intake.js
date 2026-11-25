/* Contract intake (pilot 2 of the Team Guide films, 25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md). Written as code on the shared kit
   (public/films/kit.js) over five real Studio screens of the demo project with a made-up contract (public/films/contract-intake/, taken by
   tools/film-capture.mjs with tools/film-shots/contract-intake.mjs). Registers FWBFilms['contract-intake']; VideoHub: D:/VideoHub/films/contract-intake. */
(function (root) {
  'use strict';
  const K = root.FWBFilmKit, { C, fin, lerp, rr, tx, tick, cursor, fade, callout, title } = K;
  const DUR = 80, FILES = ['empty', 'docs', 'analysed', 'disagree', 'asked'];
  const { load, walk } = K.screens('contract-intake', FILES);
  // where the film points, in screen pixels [x, y, w, h] (tools/film-shots/contract-intake.pos.json, checked on the screens)
  const POS = { upload: [1101, 164, 151, 40], emptySteps: [347, 415, 886, 70], table: [347, 338, 886, 170], verified: [786, 398, 130, 24], mark: [941, 458, 118, 34],
    analyse: [1086, 164, 166, 40], notYet: [347, 639, 886, 71], steps: [347, 540, 886, 66], done: [347, 639, 886, 71], conflict: [347, 160, 886, 155], gaps: [347, 410, 886, 110],
    list: [334, 203, 307, 120], upNext: [683, 170, 560, 130] };
  const F = [260, 180, 760];
  const SCENES = [{ name: 'Why the contract comes first', t0: 0, t1: 10 }, { name: 'Add every document', t0: 10, t1: 24 }, { name: 'Analyse contracts', t0: 24, t1: 38 },
    { name: 'Where the documents disagree', t0: 38, t1: 54 }, { name: 'Questions for the sessions', t0: 54, t1: 68 }, { name: 'Done when', t0: 68, t1: DUR }];
  const CAPTIONS = [
    [0.4, 5, 'Every Facilio implementation starts from the signed contract: it fixes the scope, the dates and what the customer owns.'],
    [5, 9.8, 'Open Contract intake, the first page of Project introduction, and press Upload the MSA. PDF, Word or text all work.'],
    [10.3, 15, 'Add the master agreement first, then every amendment and order form. They are read together, as one contract.'],
    [15, 19.5, 'Mark each one verified once you have checked it against the signed copy.'],
    [19.5, 23.8, 'Nothing is analysed yet: the Studio waits until every document is in.'],
    [24.3, 29, 'Press Analyse contracts. Claude reads all the pages together, on your own computer.'],
    [29, 33.5, 'It drafts the kick-off deck, the project plan and the questions for the sessions. You review each one.'],
    [33.5, 37.8, 'The steps fill in as each part is ready. Analyse again only when a document changes.'],
    [38.3, 43, 'Check the documents together shows where they disagree, quoting both word for word.'],
    [43, 48.5, 'Here the MSA says 30 days of hypercare and the later order form says 60. Confirm it with the customer at the kick-off.'],
    [48.5, 53.8, 'Gaps and recommendations are what to settle before the first workshop.'],
    [54.3, 60, 'The contract becomes questions for your requirement sessions, grouped by module.'],
    [60, 67.8, 'In the Workshop room you ask them one by one during the call. Must marks what you cannot leave without.'],
    [68.3, 73.5, 'Done when every document is in and verified, the analysis is current and the kick-off draft is reviewed.'],
    [73.5, 79.6, 'A new contract after the kick-off is approved opens a change request: nothing approved is overwritten.']];

  function why(g, lt) {
    title(g, 'Contract intake', 'Stage 1 · Project introduction');
    const w = walk(g, lt, 'empty', 'Project introduction · Contract intake', F, [[1, 4.6, POS.emptySteps, 1], [4.6, 10, POS.upload, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.emptySteps) callout(g, w.at[0] - 160, w.at[1] - 40, 'Four steps, one page', fin(lt, 1.8, 0.5));
    if (w.at && w.step[2] === POS.upload) cursor(g, lerp(900, w.at[0], fin(lt, 5.4, 1)), lerp(560, w.at[1], fin(lt, 5.4, 1)), lt > 6.8 ? fin(lt, 6.8, 0.6) : 0);
  }
  function add(g, lt) {
    title(g, 'Add every document', 'The master agreement, then amendments and order forms');
    const w = walk(g, lt, 'docs', 'Project introduction · Contract intake', F, [[0.6, 5, POS.table, 1], [5, 9.5, POS.mark, 0.8, C.blue], [9.5, 14, POS.notYet, 1]]);
    if (w.at && w.step[2] === POS.table) callout(g, w.at[0] - 140, w.at[1] - 70, '2 documents, 3 pages', fin(lt, 1.8, 0.5));
    if (w.at && w.step[2] === POS.mark) callout(g, w.at[0] - 210, w.at[1] - 26, 'Checked against the signed copy?', fin(lt, 6, 0.5));
  }
  function analyse(g, lt) {
    title(g, 'Analyse contracts', 'Claude drafts; you review');
    if (lt < 5) { const w = walk(g, lt, 'docs', 'Project introduction · Contract intake', F, [[0.4, 5.4, POS.analyse, 0.8, C.blue]]); if (w.at) cursor(g, lerp(820, w.at[0], fin(lt, 0.8, 1)), lerp(560, w.at[1], fin(lt, 0.8, 1)), lt > 2.4 ? fin(lt, 2.4, 0.6) : 0); }
    else { const w = walk(g, lt, 'analysed', 'Project introduction · Contract intake', F, [[5, 9.5, POS.steps, 1, C.ok], [9.5, 14, POS.done, 1, C.ok]]);
      if (w.at && w.step[2] === POS.steps) callout(g, w.at[0] - 180, w.at[1] - 40, 'Kick-off draft and 3 questions ready', fin(lt, 6, 0.5)); }
    // what Claude drafts, beside the screen
    [['Kick-off deck', 5.5], ['Project plan', 6.3], ['Questions for the sessions', 7.1]].forEach(([s, t0], i) => fade(g, fin(lt, t0, 0.5), () => {
      const y = 260 + i * 60; rr(g, 1040, y, 210, 46, 12, C.page, C.line); tick(g, 1064, y + 23, 11, fin(lt, t0 + 0.3, 0.5), C.blue); tx(g, s, 1084, y + 29, 14, C.ink, 600); }));
    fade(g, fin(lt, 8, 0.5), () => tx(g, 'Drafts wait for you', 1040, 460, 14, C.text, 500));
  }
  function disagree(g, lt) {
    title(g, 'Where the documents disagree', 'Both sides quoted, word for word');
    const w = walk(g, lt, 'disagree', 'Contract intake · Check the documents together', F, [[0.6, 10.5, POS.conflict, 1, C.bad], [10.5, 16, POS.gaps, 1]]);
    if (w.at && w.step[2] === POS.conflict) { callout(g, w.at[0] - 260, w.at[1] - 100, 'MSA: 30 days', fin(lt, 5, 0.5)); callout(g, w.at[0] + 40, w.at[1] - 100, 'Order form: 60 days', fin(lt, 5.8, 0.5)); }
  }
  function questions(g, lt) {
    title(g, 'Questions for the sessions', 'From the contract to the Workshop room');
    const w = walk(g, lt, 'asked', 'Requirement sessions · Workshop room', F, [[0.6, 6.5, POS.list, 0.8], [6.5, 14, POS.upNext, 0.8, C.blue]]);
    if (w.at && w.step[2] === POS.list) callout(g, w.at[0] - 60, w.at[1] - 70, 'From the MSA, page 1 and 2', fin(lt, 2, 0.5));
  }
  function doneWhen(g, lt) {
    tx(g, 'Done when', 120, 190, 40, C.ink, 700); tx(g, 'Then open Review the kick-off', 120, 230, 20, C.text);
    ['Every contract document added and verified', 'Analysed, and the analysis is current', 'Every disagreement has an answer from the customer', 'Kick-off draft and questions reviewed'].forEach((s, i) => fade(g, fin(lt, 0.6 + i * 0.9, 0.5), () => {
      const y = 270 + i * 70; rr(g, 120, y, 640, 56, 14, C.page, C.line); tick(g, 152, y + 28, 13, fin(lt, 1 + i * 0.9, 0.5)); tx(g, s, 178, y + 34, 18, C.ink, 600); }));
    fade(g, fin(lt, 5.6, 0.6), () => { rr(g, 820, 270, 340, 196, 16, C.amberSoft, '#FCD9A8'); tx(g, 'A new contract later?', 844, 308, 18, C.ink, 700);
      ['After the kick-off is approved, a new', 'amendment or renewal opens a change', 'request. Nothing approved is overwritten.'].forEach((s, i) => tx(g, s, 844, 342 + i * 26, 15, C.text)); });
  }

  K.register({ id: 'contract-intake', title: 'Contract intake: from signed contract to kick-off', label: 'Contract intake', DUR, SCENES, CAPTIONS, scenes: [why, add, analyse, disagree, questions, doneWhen], load, FILES });
})(typeof window !== 'undefined' ? window : globalThis);
