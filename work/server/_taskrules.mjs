/* The task engine's rules (plan: docs/plans/TASKS-AUTOMATION-PLAN-2026-11-07.md): desired(facts) lists the tasks that should exist, reconcile(want, tasks) what to
   create, resolve and reopen. Shared by the browser engine (src/taskengine.js, run for the open project) and the server's daily task run (api.mjs engineRun). */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const CLOSED = ['Done', 'Cancelled'];
  /* the task stages the server accepts (work/server/api.mjs TASK_STAGES), and the lifecycle stage (src/lifelogic.js) each one belongs to */
  const STAGES = ['Project Setup & Kickoff', 'Requirements & Workshops', 'Configuration & Documentation', 'Implementation & Integrations', 'Testing & UAT', 'Go-Live & Handover', 'Closure & Follow-Up'];
  const LIFE_STAGE = { intro: 'Project Setup & Kickoff', sessions: 'Requirements & Workshops', design: 'Configuration & Documentation', uat: 'Testing & UAT', training: 'Configuration & Documentation', hypercare: 'Go-Live & Handover', handover: 'Closure & Follow-Up' };
  const idOf = key => { let h = 5381; for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0; let h2 = 52711; for (let i = key.length - 1; i >= 0; i--) h2 = ((h2 * 31) ^ key.charCodeAt(i)) >>> 0; return 'ta_' + h.toString(36) + h2.toString(36); };
  /** facts: { openFindings: [{ transcriptId, title, count }], reviewMissing: [{ part, label }], coverageMissing: [{ module, label, count }], failedCases: [{ id, tcid, title }], kpisNoSolution: [{ id, name }] }
      returns [{ key, rule, type, title, stage, view, reason }] */
  function desired(f) {
    f = f || {}; const out = [];
    arr(f.openFindings).forEach(x => { if (x && x.count > 0) out.push({ key: 'findings:' + x.transcriptId, rule: 'findings', type: 'Requirement Task', title: 'Review ' + x.count + ' item' + (x.count === 1 ? '' : 's') + ' from ' + (x.title || 'the sessions'), stage: 'Requirements & Workshops', view: 'rschecks', reason: x.count + ' to review on Checks & validations' }); });
    arr(f.reviewMissing).forEach(x => out.push({ key: 'brd:' + x.part, rule: 'brd', type: 'BRD Task', title: 'Review the BRD: ' + x.label, stage: 'Requirements & Workshops', view: 'brd', reason: 'This part of the BRD review is not ticked' }));
    arr(f.coverageMissing).forEach(x => { if (x && x.count > 0) out.push({ key: 'cover:' + x.module, rule: 'cover', type: 'UAT Task', title: 'Write test cases for ' + x.label + ' (' + x.count + ' requirement' + (x.count === 1 ? '' : 's') + ')', stage: 'Testing & UAT', view: 'delivery', reason: x.count + ' confirmed requirement' + (x.count === 1 ? '' : 's') + ' without a test case' }); });
    arr(f.failedCases).forEach(x => out.push({ key: 'fail:' + x.id, rule: 'fail', type: 'UAT Task', title: 'Fix and retest ' + ((x.tcid ? x.tcid + ' ' : '') + (x.title || '')).trim(), stage: 'Testing & UAT', view: 'delivery', reason: 'The test case failed or is blocked' }));
    arr(f.stagesReady).forEach(x => out.push({ key: 'stage:' + x.k, rule: 'stage', type: 'Internal Action', title: 'Close stage ' + x.n + ': ' + x.name + ' (every check is met)', stage: LIFE_STAGE[x.k] || '', view: 'lifecycle', reason: 'Every record of this stage is complete; a project owner or admin closes it on the Project cycle page' }));
    arr(f.kpisNoSolution).forEach(x => out.push({ key: 'kpi:' + x.id, rule: 'kpi', type: 'BRD Task', title: 'Write how Facilio delivers the KPI "' + x.name + '"', stage: 'Configuration & Documentation', view: 'slakpi', reason: 'The KPI has no solution written yet' }));
    arr(f.slaOpen).forEach(x => out.push({ key: 'sla:' + x.id, rule: 'sla', type: 'Implementation Task', title: 'Complete the SLA: ' + x.label, stage: 'Configuration & Documentation', view: 'slakpi', reason: 'The SLA row is missing ' + x.missing }));
    arr(f.handoverOpen).forEach(x => out.push({ key: 'ho:' + x.id, rule: 'ho', type: 'Go-Live / Handover Task', title: 'Hand over: ' + x.text, stage: 'Go-Live & Handover', view: 'handover', reason: 'The handover item is not ticked' }));
    arr(f.planDue).forEach(x => out.push({ key: 'plan:' + x.id, rule: 'plan', type: 'Implementation Task', title: x.title + ' (plan, due ' + x.end + ')', stage: '', view: 'timeline', reason: 'A plan task is due within a week and not done', due: x.end }));
    arr(f.goliveGaps).forEach(x => out.push({ key: 'gl:' + x.id, rule: 'gl', type: 'Go-Live / Handover Task', title: 'Go-live: ' + x.label, stage: 'Go-Live & Handover', view: 'golive', reason: x.detail }));
    arr(f.crsWaiting).forEach(x => out.push({ key: 'cr:' + x.id, rule: 'cr', type: 'Change Request', title: 'Decide change request ' + x.label, stage: 'Requirements & Workshops', view: 'governance', reason: 'The change request is proposed and waits for a decision' }));
    if (f.brdApproval) out.push({ key: 'brdapp', rule: 'brdapp', type: 'BRD Task', title: 'Approve the BRD', stage: 'Requirements & Workshops', view: 'brd', reason: 'The BRD is in review and waits for approval' });
    arr(f.claudeAsks).forEach(x => out.push({ key: 'ask:' + x.id, rule: 'ask', type: 'Internal Action', title: 'Answer Claude: ' + x.q, stage: '', view: 'tasks', reason: 'Claude is waiting for your answer', owner: x.by || '' }));
    // accepted customer mail (docs/plans/MAIL-TO-TASKS-PLAN-2026-11-07.md): wanted until its "done when" check is met. mailOpen rows: { id, title, area, owner, desc, quote }
    const MT = { brd: ['BRD Task', 'Requirements & Workshops'], solution: ['Requirement Task', 'Requirements & Workshops'], uat: ['UAT Task', 'Testing & UAT'], hypercare: ['Implementation Task', 'Go-Live & Handover'] };
    arr(f.mailOpen).forEach(x => { const m = MT[x.area] || ['Other', '']; out.push({ key: 'mail:' + x.id, rule: 'mail', type: m[0], title: x.title, stage: m[1], view: 'tasks', reason: 'A customer mail asked for this', owner: x.owner || '', desc: x.desc || '', src: { type: 'email', ref: x.id, quote: x.quote || '', label: 'Customer mail' } }); });
    return out;
  }
  const WHY = { findings: 'nothing is left to review for it', brd: 'the part is ticked', cover: 'every confirmed requirement has a test case', fail: 'the test case no longer fails', kpi: 'the solution is written', stage: 'the stage is closed', mail: 'the check for this mail is met', cr: 'the change request was decided', gl: 'the go-live check turned green', sla: 'the SLA row is complete', ho: 'the handover item was ticked', plan: 'the plan task is done', brdapp: 'the BRD was approved', ask: 'Claude has its answer' };
  /** returns { create: [task], reopen: [{ id }], resolve: [{ id, why }] }. tasks: the existing task records (each automatic one carries auto: { key, rule, by }) */
  function reconcile(want, tasks, now, whyBy, keep) {   // keep: rules whose facts are not known right now; their tasks are left alone
    const have = {}; arr(tasks).forEach(t => { if (t && t.auto && t.auto.key) have[t.auto.key] = t; }); const wantKeys = new Set(arr(want).map(w => w.key)); const out = { create: [], reopen: [], resolve: [] };
    arr(want).forEach(w => { const t = have[w.key];
      if (!t) out.create.push({ id: idOf(w.key), title: w.title, type: w.type, status: 'To Do', stage: w.stage, desc: w.desc || (w.reason + '. Made by the Studio from the project facts; it resolves itself when this is no longer true.'), owner: w.owner || '', due: w.due || '', src: w.src || { type: 'auto', ref: w.key, label: 'Automatic' }, auto: { key: w.key, rule: w.rule, view: w.view, at: now || '' } });
      else if (CLOSED.includes(t.status) && t.auto.resolvedBy === 'engine') out.reopen.push({ id: t.id });   // it was resolved by the engine and the reason is back; a task a person closed stays closed
    });
    Object.keys(have).forEach(k => { const t = have[k]; if (keep && keep.has(t.auto.rule)) return; if (!wantKeys.has(k) && !CLOSED.includes(t.status)) out.resolve.push({ id: t.id, why: (whyBy && whyBy[k]) || WHY[t.auto.rule] || 'the reason is gone' }); });
    return out;
  }
  const api = { desired, reconcile, idOf, STAGES, LIFE_STAGE, CLOSED, WHY };
  root.FWBTaskRules = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;   // the global is always set: a module import has no other way to hand the rules over
})(typeof window !== 'undefined' ? window : globalThis);
