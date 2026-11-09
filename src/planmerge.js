/* Importing a new version of the project plan into the Timeline (tests/plan_reimport.mjs). Pure: no browser, no network.
   The timeline rows are what every stage, phase strip, dashboard and report reads. A new plan version must change the dates and tasks, but must not
   throw away what the team already recorded: a row that is still in the plan keeps its id (so the slip against the baseline keeps working) and its
   progress, unless the new sheet states progress itself. Rows: { id, title, phase, start, end, owner, status, pct, isPhase, ms }.
   merge(oldRows, newRows, { sheetHasProgress }) -> { rows, summary: { kept, added, removed, moved, progressKept } } */
(function (root) {
  'use strict';
  const key = r => String(r.title || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
  const withPhase = r => key(r) + '|' + String(r.phase || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
  function merge(oldRows, newRows, opt) {
    const keepProgress = !(opt && opt.sheetHasProgress); const pool = (Array.isArray(oldRows) ? oldRows : []).map(r => ({ r, used: false }));
    const take = test => { const h = pool.find(p => !p.used && test(p.r)); if (h) h.used = true; return h ? h.r : null; };
    const s = { kept: 0, added: 0, removed: 0, moved: 0, progressKept: 0 }; const rows = [];
    for (const n of (Array.isArray(newRows) ? newRows : [])) {
      const o = take(x => !!x.isPhase === !!n.isPhase && withPhase(x) === withPhase(n)) || take(x => !!x.isPhase === !!n.isPhase && key(x) === key(n));
      if (!o) { rows.push(n); if (!n.isPhase) s.added++; continue; }
      const r = Object.assign({}, n, { id: o.id });
      if (!n.isPhase) {
        s.kept++; if (o.start !== n.start || (o.end || o.start) !== (n.end || n.start)) s.moved++;
        if (keepProgress && (o.status !== 'Not started' || Number(o.pct) > 0)) { r.status = o.status; r.pct = o.pct; if (o.actual) r.actual = o.actual; s.progressKept++; }
        else if (!keepProgress && o.status === 'Done' && n.status !== 'Done' && !(Number(n.pct) > 0)) { r.status = 'Done'; r.pct = 100; s.progressKept++; }   // the sheet says nothing about this row yet: a row the team finished stays finished
        if (o.owner && keepProgress) r.owner = o.owner;
      }
      rows.push(r);
    }
    s.removed = pool.filter(p => !p.used && !p.r.isPhase).length;
    return { rows, summary: s };
  }
  /** one sentence for the message after an import */
  function sentence(s, stageBefore, stageAfter) {
    const parts = [s.kept + ' kept' + (s.progressKept ? ' with their progress' : ''), s.moved ? s.moved + ' moved' : '', s.added ? s.added + ' new' : '', s.removed ? s.removed + ' no longer in the plan' : ''].filter(Boolean);
    return 'Plan updated: ' + parts.join(', ') + '.' + (stageBefore !== stageAfter ? ' The current stage is now ' + (stageAfter || 'not started') + ' (was ' + (stageBefore || 'not started') + ').' : '');
  }
  const api = { merge, sentence };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBPlanMerge = api;
})(typeof window !== 'undefined' ? window : globalThis);
