/* The task engine: tasks that create themselves and resolve themselves (plan: docs/plans/TASKS-AUTOMATION-PLAN-2026-11-07.md).
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
    arr(f.reviewMissing).forEach(x => out.push({ key: 'brd:' + x.part, rule: 'brd', type: 'BRD Task', title: 'Review the BRD: ' + x.label, stage: 'Solution design & BRD', view: 'brd', reason: 'This part of the BRD review is not ticked' }));
    arr(f.coverageMissing).forEach(x => { if (x && x.count > 0) out.push({ key: 'cover:' + x.module, rule: 'cover', type: 'UAT Task', title: 'Write test cases for ' + x.label + ' (' + x.count + ' requirement' + (x.count === 1 ? '' : 's') + ')', stage: 'UAT & FTR', view: 'delivery', reason: x.count + ' confirmed requirement' + (x.count === 1 ? '' : 's') + ' without a test case' }); });
    arr(f.failedCases).forEach(x => out.push({ key: 'fail:' + x.id, rule: 'fail', type: 'UAT Task', title: 'Fix and retest ' + ((x.tcid ? x.tcid + ' ' : '') + (x.title || '')).trim(), stage: 'UAT & FTR', view: 'delivery', reason: 'The test case failed or is blocked' }));
    arr(f.stagesReady).forEach(x => out.push({ key: 'stage:' + x.k, rule: 'stage', type: 'Internal Action', title: 'Close stage ' + x.n + ': ' + x.name + ' (every check is met)', stage: x.name, view: 'lifecycle', reason: 'Every record of this stage is complete; a project owner or admin closes it on the Project cycle page' }));
    arr(f.kpisNoSolution).forEach(x => out.push({ key: 'kpi:' + x.id, rule: 'kpi', type: 'BRD Task', title: 'Write how Facilio delivers the KPI "' + x.name + '"', stage: 'Solution design & BRD', view: 'slakpi', reason: 'The KPI has no solution written yet' }));
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
  const V = root.FWBViews; if (V) V.taskEngineLogic = { desired, reconcile, idOf };
  const F = root.FWB; if (!F || !F.S || !V) return; const S = F.S; const I = () => V.items; const U = () => root.FWBUat;
  /** gather the facts of the open project */
  function facts() {
    const fds = ((F.doc('rs_findings') || {}).items) || []; const trs = ((F.doc('rs_transcripts') || {}).items) || []; const by = {}; fds.forEach(x => { if (x && x.status === 'open') by[x.transcriptId || 'added'] = (by[x.transcriptId || 'added'] || 0) + 1; });
    const title = id => id === 'msa' ? 'the contract check' : id === 'brd' ? 'the BRD check' : id === 'added' ? 'checks added by hand' : ((trs.find(t => t.id === id) || {}).title || 'a transcript');
    const reqs = (S.ws.requirements || []).filter(r => r.status === 'Confirmed'); const review = (F.doc('brddoc') || {}).review || {};
    const PARTS = [['intro', 'Introduction'], ['requirements', 'Requirements'], ['flows', 'Process flows'], ['fields', 'Fields and forms'], ['apps', 'Connected apps'], ['contract', 'Match with the contract']];
    const cases = I().list('utc'); const mods = F.allModules().filter(m => m.inScope); const data = mods.map(m => ({ name: m.name, label: m.label, requirements: reqs.filter(r => (r.modules || []).includes(m.name)).map(r => ({ id: r.id, title: r.title })) })); data.push({ name: '__general', label: 'General requirements', requirements: reqs.filter(r => !(r.modules && r.modules.length)).map(r => ({ id: r.id, title: r.title })) });
    const cov = U() ? U().coverage(data, cases) : { rows: [] }; const lc = V.lifeStages ? V.lifeStages() : null;   // null while the stage records load
    const MI = V.mailInbox; const mf = MI ? MI.facts() : {}; const MT = root.FWBMailTasks; const recs = MI && MT ? MI.records().filter(r => r.status === 'accepted') : []; const mailOpen = [], mailWhy = {};
    recs.forEach(r => { const why = MT.isDone(r, mf); if (why) mailWhy['mail:' + r.id] = why; else mailOpen.push({ id: r.id, title: r.title, area: (r.route || {}).area, owner: r.acceptedBy, quote: ((r.mail || {}).subject || '').slice(0, 300), desc: 'Customer mail from ' + (((r.mail || {}).from || {}).name || ((r.mail || {}).from || {}).email || 'the customer') + ': ' + ((r.mail || {}).subject || '') + '. Made when you accepted it in the Mail inbox. Done when: ' + ((r.doneWhen || {}).type === 'solution_accepted' ? 'an accepted version on the Solution tab quotes this mail' : (r.doneWhen || {}).type === 'brd_saved' ? 'a BRD version is saved' : 'you close it here or tell Otto in Teams') + '.' }); });
    const crsLoaded = I().ready(['cr']); const jk = V.studioJobs && V.studioJobs.K && V.studioJobs.K(); const jobsLoaded = !!(jk && jk.pid === S.project.id && Array.isArray(jk.jobs));
    const glOk = I().ready(['utc', 'task', 'close', 'ugd']) && !!(V.goliveLogic && V.goliveLogic.rows); const goliveGaps = glOk && I().list('utc').length ? V.goliveLogic.rows().filter(r => ['run', 'issues', 'guides'].includes(r.id) && r.state !== 'ok').map(r => ({ id: r.id, label: r.label, detail: r.detail })) : [];
    const day = V.today ? V.today() : new Date().toISOString().slice(0, 10); const soon = new Date(Date.parse(day) + 7 * 864e5).toISOString().slice(0, 10), floor = new Date(Date.parse(day) - 30 * 864e5).toISOString().slice(0, 10);
    const slaOpen = (S.ws.slaMatrix || []).filter(r => r && r.id && (!String(r.response || '').trim() || !String(r.resolution || '').trim())).map(r => ({ id: r.id, label: (r.module && r.module !== '*' ? ((F.moduleView(r.module) || {}).label || r.module) : 'General') + ' ' + (r.priority || ''), missing: [!String(r.response || '').trim() && 'response time', !String(r.resolution || '').trim() && 'resolution time'].filter(Boolean).join(' and ') }));
    const hoReady = I().ready(['ho', 'close']) && !!(I().get('close', 'golive') || {}).go; const glLabels = new Set((V.goliveLogic && V.goliveLogic.rows ? V.goliveLogic.rows() : []).map(r => r.label).concat(['Go-live decision recorded']));
    const handoverOpen = hoReady ? I().list('ho').filter(h => !h.done && h.text && !glLabels.has(h.text)).map(h => ({ id: h.id, text: String(h.text).slice(0, 120) })) : [];
    const planDue = (((F.doc('plan_struct') || {}).rows) || []).filter(r => r && r.id && !r.isPhase && r.status !== 'Done' && (r.owner === 'Facilio' || r.owner === 'Both') && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(r.end || '')) && r.end <= soon && r.end >= floor).map(r => ({ id: r.id, title: String(r.title || 'Plan task').slice(0, 120), end: r.end }));
    const unknown = (lc ? [] : ['stage']).concat(I().ready(['ho', 'close']) ? [] : ['ho']).concat(F.doc('plan_struct') ? [] : ['plan']).concat(glOk ? [] : ['gl']).concat(crsLoaded ? [] : ['cr']).concat(jobsLoaded ? [] : ['ask']);
    return { slaOpen, handoverOpen, planDue, goliveGaps, crsWaiting: crsLoaded ? I().list('cr').filter(c => c.status === 'Proposed').map(c => ({ id: c.id, label: 'CR-' + String(c.n || '').padStart(3, '0') + ' ' + String(c.title || '').slice(0, 120) })) : [], brdApproval: (F.doc('brddoc') || {}).status === 'review', claudeAsks: jobsLoaded ? jk.jobs.filter(j => j.status === 'needs_input').map(j => ({ id: j.id, q: String(((j.result || {}).questions || [])[0] || j.label || 'a question').slice(0, 120), by: j.requestedBy })) : [], stagesReady: lc ? lc.list.filter(x => x.status === 'ready').map(x => ({ k: x.s.k, n: x.s.n, name: x.s.name })) : [], unknownRules: unknown, mailOpen, mailWhy, openFindings: Object.keys(by).map(k => ({ transcriptId: k, title: title(k), count: by[k] })), reviewMissing: reqs.length ? PARTS.filter(p => !(review[p[0]] && review[p[0]].at)).map(p => ({ part: p[0], label: p[1] })) : [],
      coverageMissing: cov.rows.map(r => ({ module: r.name, label: r.label, count: r.missing.length })), failedCases: cases.filter(c => (c.status === 'Failed' || c.status === 'Blocked') && !c.issue).map(c => ({ id: c.id, tcid: c.tcid, title: c.title })), kpisNoSolution: I().list('kpi').filter(k => !String(k.solution || '').trim()).map(k => ({ id: k.id, name: k.name })) };
  }
  let busy = false;
  /** apply the engine to the open project; quiet unless something changed. force skips the one-minute pause */
  async function run(force) {
    if (busy || V.isCustomer() || S.readonly || !S.project) return 0; if (!force && S.ui.teAt && S.ui.teAt.p === S.project.id && Date.now() - S.ui.teAt.t < 60000) return 0; busy = true;
    try { I().load(['task', 'utc', 'kpi', 'cr', 'close', 'ugd', 'ho']); for (let i = 0; i < 24 && !I().ready(['task', 'utc', 'kpi', 'cr']); i++) await new Promise(r => setTimeout(r, 250)); if (!I().ready(['task', 'utc', 'kpi', 'cr'])) return 0; S.ui.teAt = { p: S.project.id, t: Date.now() }; if (V.mailInbox) await V.mailInbox.ensure();
      const now = new Date().toISOString(); const fx = facts(); (fx.stagesReady || []).forEach(x => { if (V.notifyStageReady) V.notifyStageReady(x); });
      // a stage whose records are all done: the team is told once a day
      const r = reconcile(desired(fx), I().list('task'), now, fx.mailWhy, new Set(fx.unknownRules || [])); let n = 0;
      const batch = async (list, fn) => { for (let i = 0; i < list.length; i += 5) await Promise.all(list.slice(i, i + 5).map(fn)); };   // five saves at a time
      await batch(r.create, async t => { await I().put('task', t.id, t, { silent: true }); n++; });
      for (const x of r.resolve) { const t = I().get('task', x.id); if (t) { await I().put('task', t.id, Object.assign({}, t, { status: 'Done', completion: 'Resolved automatically: ' + x.why + '.', auto: Object.assign({}, t.auto, { resolvedBy: 'engine', resolvedAt: now }) }), { silent: true }); n++; } }
      for (const x of r.reopen) { const t = I().get('task', x.id); if (t) { await I().put('task', t.id, Object.assign({}, t, { status: 'To Do', completion: '', auto: Object.assign({}, t.auto, { resolvedBy: '', resolvedAt: '' }) }), { silent: true }); n++; } }
      if (V.mailInbox) await V.mailInbox.markResolved(I().list('task'));   // a finished mail task (by the engine or by a person) queues the reply draft once
      if (n) { V.render(); } return n;
    } catch (e) { return 0; } finally { busy = false; }
  }
  V.taskEngine = { run, facts };
})(typeof window !== 'undefined' ? window : globalThis);
