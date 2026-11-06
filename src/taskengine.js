/* The task engine: tasks that create themselves and resolve themselves (plan: docs/reference/TASKS-AUTOMATION-PLAN-2026-11-07.md).
   `desired(facts)` lists the tasks that SHOULD exist right now, from facts the Studio already holds. `reconcile(want, tasks)` compares that with the tasks that do exist:
   it creates what is missing, moves an automatic task to Done when its reason is gone (with the note "Resolved automatically: <why>"), and reopens one it resolved itself if the reason comes back.
   It never edits a task a person made and never reopens a task a person closed. An automatic task has a stable key and an id made from that key, so running it twice cannot make a duplicate.
   `run` gathers the facts of the open project and applies the result. The rules are in tests/task_engine.mjs. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const CLOSED = ['Done', 'Cancelled'];
  const idOf = key => { let h = 5381; for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0; let h2 = 52711; for (let i = key.length - 1; i >= 0; i--) h2 = ((h2 * 31) ^ key.charCodeAt(i)) >>> 0; return 'ta_' + h.toString(36) + h2.toString(36); };
  /** facts: { openFindings: [{ transcriptId, title, count }], reviewMissing: [{ part, label }], coverageMissing: [{ module, label, count }], failedCases: [{ id, tcid, title }], kpisNoSolution: [{ id, name }] }
      returns [{ key, rule, type, title, stage, view, reason }] */
  function desired(f) {
    f = f || {}; const out = [];
    arr(f.openFindings).forEach(x => { if (x && x.count > 0) out.push({ key: 'findings:' + x.transcriptId, rule: 'findings', type: 'Requirement Task', title: 'Review ' + x.count + ' item' + (x.count === 1 ? '' : 's') + ' from ' + (x.title || 'the sessions'), stage: 'Requirement sessions', view: 'rschecks', reason: x.count + ' to review on Checks & validations' }); });
    arr(f.reviewMissing).forEach(x => out.push({ key: 'brd:' + x.part, rule: 'brd', type: 'BRD Task', title: 'Review the BRD: ' + x.label, stage: 'Mockup & BRD', view: 'brd', reason: 'This part of the BRD review is not ticked' }));
    arr(f.coverageMissing).forEach(x => { if (x && x.count > 0) out.push({ key: 'cover:' + x.module, rule: 'cover', type: 'UAT Task', title: 'Write test cases for ' + x.label + ' (' + x.count + ' requirement' + (x.count === 1 ? '' : 's') + ')', stage: 'UAT & FTR', view: 'delivery', reason: x.count + ' confirmed requirement' + (x.count === 1 ? '' : 's') + ' without a test case' }); });
    arr(f.failedCases).forEach(x => out.push({ key: 'fail:' + x.id, rule: 'fail', type: 'UAT Task', title: 'Fix and retest ' + ((x.tcid ? x.tcid + ' ' : '') + (x.title || '')).trim(), stage: 'UAT & FTR', view: 'delivery', reason: 'The test case failed or is blocked' }));
    arr(f.kpisNoSolution).forEach(x => out.push({ key: 'kpi:' + x.id, rule: 'kpi', type: 'BRD Task', title: 'Write how Facilio delivers the KPI "' + x.name + '"', stage: 'Mockup & BRD', view: 'slakpi', reason: 'The KPI has no solution written yet' }));
    return out;
  }
  const WHY = { findings: 'nothing is left to review for it', brd: 'the part is ticked', cover: 'every confirmed requirement has a test case', fail: 'the test case no longer fails', kpi: 'the solution is written' };
  /** returns { create: [task], reopen: [{ id }], resolve: [{ id, why }] }. tasks: the existing task records (each automatic one carries auto: { key, rule, by }) */
  function reconcile(want, tasks, now) {
    const have = {}; arr(tasks).forEach(t => { if (t && t.auto && t.auto.key) have[t.auto.key] = t; }); const wantKeys = new Set(arr(want).map(w => w.key)); const out = { create: [], reopen: [], resolve: [] };
    arr(want).forEach(w => { const t = have[w.key];
      if (!t) out.create.push({ id: idOf(w.key), title: w.title, type: w.type, status: 'To Do', stage: w.stage, desc: w.reason + '. Made by the Studio from the project facts; it resolves itself when this is no longer true.', owner: '', due: '', src: { type: 'auto', ref: w.key, label: 'Automatic' }, auto: { key: w.key, rule: w.rule, view: w.view, at: now || '' } });
      else if (CLOSED.includes(t.status) && t.auto.resolvedBy === 'engine') out.reopen.push({ id: t.id });   // it was resolved by the engine and the reason is back; a task a person closed stays closed
    });
    Object.keys(have).forEach(k => { const t = have[k]; if (!wantKeys.has(k) && !CLOSED.includes(t.status)) out.resolve.push({ id: t.id, why: WHY[t.auto.rule] || 'the reason is gone' }); });
    return out;
  }
  const V = root.FWBViews; if (V) V.taskEngineLogic = { desired, reconcile, idOf };
  const F = root.FWB; if (!F || !F.S || !V) return; const S = F.S; const I = () => V.items; const U = () => root.FWBUat;
  /** gather the facts of the open project */
  function facts() {
    const fds = ((F.doc('rs_findings') || {}).items) || []; const trs = ((F.doc('rs_transcripts') || {}).items) || []; const by = {}; fds.forEach(x => { if (x && x.status === 'open') by[x.transcriptId || 'added'] = (by[x.transcriptId || 'added'] || 0) + 1; });
    const title = id => id === 'msa' ? 'the contract check' : id === 'brd' ? 'the BRD check' : id === 'added' ? 'checks added by hand' : ((trs.find(t => t.id === id) || {}).title || 'a transcript');
    const reqs = (S.ws.requirements || []).filter(r => r.status === 'Confirmed'); const review = (F.doc('brddoc') || {}).review || {};
    const PARTS = [['intro', 'Introduction'], ['requirements', 'Requirements'], ['flows', 'Process flows'], ['fields', 'Fields and forms'], ['apps', 'Connected apps'], ['contract', 'Match with the contract']];
    const cases = I().list('utc'); const mods = F.allModules().filter(m => m.inScope); const data = mods.map(m => ({ name: m.name, label: m.label, requirements: reqs.filter(r => (r.modules || []).includes(m.name)).map(r => ({ id: r.id, title: r.title })) })); data.push({ name: '__general', label: 'General requirements', requirements: reqs.filter(r => !(r.modules && r.modules.length)).map(r => ({ id: r.id, title: r.title })) });
    const cov = U() ? U().coverage(data, cases) : { rows: [] };
    return { openFindings: Object.keys(by).map(k => ({ transcriptId: k, title: title(k), count: by[k] })), reviewMissing: reqs.length ? PARTS.filter(p => !(review[p[0]] && review[p[0]].at)).map(p => ({ part: p[0], label: p[1] })) : [],
      coverageMissing: cov.rows.map(r => ({ module: r.name, label: r.label, count: r.missing.length })), failedCases: cases.filter(c => (c.status === 'Failed' || c.status === 'Blocked') && !c.issue).map(c => ({ id: c.id, tcid: c.tcid, title: c.title })), kpisNoSolution: I().list('kpi').filter(k => !String(k.solution || '').trim()).map(k => ({ id: k.id, name: k.name })) };
  }
  let busy = false;
  /** apply the engine to the open project; quiet unless something changed. force skips the one-minute pause */
  async function run(force) {
    if (busy || V.isCustomer() || S.readonly || !S.project) return 0; if (!force && S.ui.teAt && S.ui.teAt.p === S.project.id && Date.now() - S.ui.teAt.t < 60000) return 0; busy = true;
    try { I().load(['task', 'utc', 'kpi']); for (let i = 0; i < 24 && !I().ready(['task', 'utc', 'kpi']); i++) await new Promise(r => setTimeout(r, 250)); if (!I().ready(['task', 'utc', 'kpi'])) return 0; S.ui.teAt = { p: S.project.id, t: Date.now() };
      const now = new Date().toISOString(); const r = reconcile(desired(facts()), I().list('task'), now); let n = 0;
      for (const t of r.create) { await I().put('task', t.id, t); n++; }
      for (const x of r.resolve) { const t = I().get('task', x.id); if (t) { await I().put('task', t.id, Object.assign({}, t, { status: 'Done', completion: 'Resolved automatically: ' + x.why + '.', auto: Object.assign({}, t.auto, { resolvedBy: 'engine', resolvedAt: now }) })); n++; } }
      for (const x of r.reopen) { const t = I().get('task', x.id); if (t) { await I().put('task', t.id, Object.assign({}, t, { status: 'To Do', completion: '', auto: Object.assign({}, t.auto, { resolvedBy: '', resolvedAt: '' }) })); n++; } }
      if (n) { V.render(); } return n;
    } catch (e) { return 0; } finally { busy = false; }
  }
  V.taskEngine = { run, facts };
})(typeof window !== 'undefined' ? window : globalThis);
