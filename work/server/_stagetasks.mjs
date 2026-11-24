/* Stage tasks, the shared rules: the seven task stages, the Delivery roles, the Facilio standard list, the template text format, the owner by
   Delivery role and the stage a project is in. Used by the browser (src/stagetasks.js, Tasks > Stage tasks) and by the server's daily task run (api.mjs taskRun). */
(function (root) {
  'use strict';
  const STAGES = ['Project Setup & Kickoff', 'Requirements & Workshops', 'Configuration & Documentation', 'Implementation & Integrations', 'Testing & UAT', 'Go-Live & Handover', 'Closure & Follow-Up'];
  const ROLES = ['Project manager', 'Implementation consultant', 'Solution architect', 'Integration consultant', 'UAT lead', 'Trainer', 'Support lead'];
  const TYPES = ['BRD Task', 'Requirement Task', 'Customer Question', 'Customer Response Required', 'Change Request', 'FTR / Technical Task', 'User Guide Task', 'UAT Task', 'Implementation Task', 'Issue / Blocker', 'Internal Action', 'Customer Action Required', 'Meeting Follow-up', 'Go-Live / Handover Task', 'Hypercare Issue', 'Other'];
  /* the lifecycle stages (src/lifelogic.js) in order, and the task stage each belongs to */
  const LIFE = ['intro', 'sessions', 'design', 'uat', 'training', 'hypercare', 'handover'];
  const LIFE_STAGE = { intro: 'Project Setup & Kickoff', sessions: 'Requirements & Workshops', design: 'Configuration & Documentation', uat: 'Testing & UAT', training: 'Configuration & Documentation', hypercare: 'Go-Live & Handover', handover: 'Closure & Follow-Up' };
  const STANDARD = [
    '# Project Setup & Kickoff',
    'Read the contract (MSA and SOW) and list the scope | Project manager | 2 | Internal Action',
    'Set up the project team, Delivery roles and customer stakeholders | Project manager | 2 | Internal Action',
    'Prepare the kick-off deck and the project plan | Project manager | 5 | Internal Action',
    'Hold the kick-off meeting with the customer | Project manager | 7 | Meeting Follow-up',
    'Send the kick-off minutes and the agreed plan | Project manager | 9 | Meeting Follow-up',
    'Ask the customer for their data and documents | Implementation consultant | 10 | Customer Action Required',
    '# Requirements & Workshops',
    'Plan the requirement workshops and send the invitations | Implementation consultant | 3 | Internal Action',
    'Run the workshops and capture the transcripts | Implementation consultant | 15 | Requirement Task',
    'Review the session findings and open questions | Implementation consultant | 18 | Requirement Task',
    'Draft the BRD | Implementation consultant | 21 | BRD Task',
    'Review the BRD and the solution | Solution architect | 24 | BRD Task',
    'Send the BRD to the customer for sign-off | Project manager | 28 | Customer Response Required',
    '# Configuration & Documentation',
    'Write the solution design for each module | Solution architect | 5 | Implementation Task',
    'Configure the modules, state flows, roles and notifications | Implementation consultant | 20 | Implementation Task',
    'Load the onboarding data (sites, assets, users) | Implementation consultant | 20 | Implementation Task',
    'Write the user guides | Trainer | 25 | User Guide Task',
    '# Implementation & Integrations',
    'Agree the integration specifications with the customer | Integration consultant | 5 | FTR / Technical Task',
    'Build and test the integrations | Integration consultant | 20 | FTR / Technical Task',
    'Run the FTR checks | Implementation consultant | 22 | FTR / Technical Task',
    '# Testing & UAT',
    'Write the UAT test cases from the confirmed requirements | UAT lead | 5 | UAT Task',
    'Run UAT with the customer testers | UAT lead | 15 | UAT Task',
    'Fix and retest the UAT issues | Implementation consultant | 20 | UAT Task',
    'Get the UAT sign-off | Project manager | 22 | Customer Response Required',
    '# Go-Live & Handover',
    'Run the go-live readiness review | Project manager | 3 | Go-Live / Handover Task',
    'Train the customer\'s users | Trainer | 5 | Go-Live / Handover Task',
    'Go live and watch the first days (hypercare) | Support lead | 10 | Go-Live / Handover Task',
    'Prepare the support handover pack | Support lead | 20 | Go-Live / Handover Task',
    '# Closure & Follow-Up',
    'Hand over to support and confirm the support contacts | Support lead | 3 | Go-Live / Handover Task',
    'Get the project closure sign-off | Project manager | 7 | Customer Response Required',
    'Hold the lessons-learned review | Project manager | 10 | Internal Action'
  ].join('\n');

  /* template text → { stages: { stage: [{ title, role, days, type }] }, warnings: [] }. Format: one "# Stage" heading per stage, then Title | Delivery role | Days until due | Task type */
  function parse(text) {
    const stages = {}, warnings = []; let cur = null, bad = false;
    String(text || '').split(/\r?\n/).forEach((ln, i) => {
      const t = ln.trim(); if (!t) return;
      if (t[0] === '#') { const h = t.replace(/^#+\s*/, '').toLowerCase(); cur = STAGES.find(s => s.toLowerCase() === h) || STAGES.find(s => h && s.toLowerCase().split(' ')[0] === h.split(' ')[0]) || null; bad = !cur; if (!cur) warnings.push('Line ' + (i + 1) + ': "' + t + '" is not a task stage, so its tasks were skipped.'); return; }
      if (!cur) { if (!bad) warnings.push('Line ' + (i + 1) + ' has no stage heading above it.'); return; }   /* under an unknown heading: already reported once */
      const p = t.split('|').map(x => x.trim()), days = parseInt(p[2], 10), type = TYPES.find(x => x.toLowerCase() === String(p[3] || '').toLowerCase());
      if (!p[0]) return;
      (stages[cur] = stages[cur] || []).push({ title: p[0].slice(0, 200), role: ROLES.find(r => r.toLowerCase() === String(p[1] || '').toLowerCase()) || (p[1] || ''), days: days >= 0 && days <= 365 ? days : 7, type: type || 'Internal Action' });
    });
    return { stages, warnings };
  }
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const keyOf = (stage, title) => 'tpl:' + STAGES.indexOf(stage) + ':' + slug(title);
  /* owner: the team member with that Delivery role who has access to the project; else the project manager; else nobody */
  function ownerFor(role, team, members) {
    const ok = new Set((members || []).filter(m => m && m.role !== 'customer').map(m => String(m.email || '').toLowerCase()));
    const pick = r => (team || []).find(x => x && r && String(x.drole || '').toLowerCase() === String(r).toLowerCase() && ok.has(String(x.email || '').toLowerCase()));
    const p = pick(role), lead = p ? null : pick('Project manager');
    return p ? { email: String(p.email).toLowerCase(), name: p.name || p.email, how: 'role' } : lead ? { email: String(lead.email).toLowerCase(), name: lead.name || lead.email, how: 'lead' } : null;
  }
  /* YYYY-MM-DD, days after from (YYYY-MM-DD) or after today */
  function dueIn(days, from) { const d = from ? new Date(from + 'T00:00:00Z') : new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  /* plan rows belong to a lifecycle stage by their title or phase, with the same words as src/lifelogic.js (tests/stage_tasks.mjs keeps them in step) */
  const LIFE_RE = { intro: /kick|contract|msa|scope|project plan|plan|mobili[sz]/i, sessions: /workshop|requirement|session|discovery|use case|transcript/i, design: /design|brd|configur|solution|form|mockup|build|integrat|sla|kpi/i,
    uat: /uat|test|go.?live|cut.?over|acceptance|ftr/i, training: /train|document|guide|video|manual/i, hypercare: /hypercare|stabili[sz]/i, handover: /hand.?over|support|acceptance|sign.?off|clos|lesson|final report|wrap/i };
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  /* the dates the project plan gives a task stage: { start, end } (YYYY-MM-DD) from the plan rows of its lifecycle stages, or null */
  function planWindow(rows, stage) {
    const keys = LIFE.filter(k => LIFE_STAGE[k] === stage); let start = '', end = '';
    (rows || []).forEach(r => { if (!r || !keys.some(k => LIFE_RE[k].test(String(r.title || '') + ' ' + String(r.phase || '')))) return;
      const s = ISO.test(r.start || '') ? String(r.start).slice(0, 10) : '', e = ISO.test(r.end || '') ? String(r.end).slice(0, 10) : '';
      if (s && (!start || s < start)) start = s; if (e && (!end || e > end)) end = e; });
    return start ? { start, end: end && end >= start ? end : '' } : null;
  }
  /* a task's due date: days after the stage starts in the plan (not past the stage end, not before today), else days after from or today */
  function dueAt(days, from, win) {
    if (!win || !win.start) return dueIn(days, from);
    let d = dueIn(days, win.start); if (win.end && d > win.end) d = win.end; const today = from || dueIn(0); return d < today ? today : d;
  }
  /* the task stage a project is in: that of the first lifecycle stage not closed (closed: a Set of lifecycle keys) */
  function stageNow(closed) { const k = LIFE.find(x => !(closed && closed.has(x))) || 'handover'; return LIFE_STAGE[k]; }
  /* the task records still to add for a stage, skipping keys already used */
  function toAdd(text, stage, team, members, haveKeys, from, label, win) {
    return (parse(text).stages[stage] || []).filter(x => !(haveKeys && haveKeys.has(keyOf(stage, x.title)))).map(x => {
      const own = ownerFor(x.role, team, members);
      return { title: x.title, type: x.type, stage, status: 'To Do', priority: 'Medium', owner: own ? own.email : '', due: dueAt(x.days, from, win), key: keyOf(stage, x.title), src: { type: 'template', label: label || 'Facilio standard' }, desc: x.role ? 'Delivery role: ' + x.role : '' };
    });
  }
  const api = { STAGES, ROLES, TYPES, LIFE, LIFE_STAGE, LIFE_RE, STANDARD, parse, keyOf, ownerFor, dueIn, planWindow, dueAt, stageNow, toAdd };
  root.FWBStageTasks = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;   // the global is always set: a module import has no other way to hand the rules over
})(typeof window !== 'undefined' ? window : globalThis);
