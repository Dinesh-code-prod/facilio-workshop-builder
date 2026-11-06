/* Lifecycle tracker rules (pure code, also run by tests/life.mjs).
   Nine stages. A stage's status comes from the project's records and from a person's recorded decision, never from the calendar and never from a
   percentage. Missing information is never success: a stage with no records is "Upcoming" (or "Current" when it is the next one to work on), and
   a stage is "Completed" only when every record under it is complete, or when an authorised person closed it (and then the page says where the
   records disagree). */
(function (root) {
  'use strict';
  // k, name, short label, roadmap checkpoints (indexes into V.roadmapStages), sign-offs that close it, menu pages, words that tie plan rows and actions to it
  const STAGES = [
    { k: 'kickoff', name: 'Project Kickoff', short: 'Kickoff', cps: [0], so: [], views: ['msaflow', 'kickoff', 'plan', 'timeline', 'governance', 'changes'], re: /kick|contract|msa|scope|governance|project plan|mobili[sz]/i, hint: 'Contract and scope, kick-off deck, project plan and governance.' },
    { k: 'workshops', name: 'Workshops & Requirements', short: 'Workshops', cps: [1, 2], so: [], views: ['transcripts', 'usecases', 'checks', 'msafind', 'onboarding'], re: /workshop|requirement|session|discovery|use case|transcript/i, hint: 'Workshop sessions and confirmed requirements.' },
    { k: 'design', name: 'Solution Design & Configuration', short: 'Design', cps: [3], so: ['brd'], views: ['modules', 'flow', 'whiteboard', 'roles', 'cfginputs', 'notifications', 'brd', 'dashboards', 'trace', 'orgpkg'], re: /design|brd|configur|solution|form|state flow|role|dashboard/i, hint: 'BRD and its sign-off, modules, forms, state flows, roles and configuration inputs.' },
    { k: 'impl', name: 'Implementation', short: 'Build', cps: [4], so: [], views: ['contracts'], re: /implement|build|integrat|migrat|data load|develop/i, hint: 'Building each module in scope and the integrations.' },
    { k: 'uat', name: 'UAT & Go-Live', short: 'UAT & Go-Live', cps: [5, 8], so: ['uat'], views: ['delivery'], re: /uat|test|go.?live|cut.?over|acceptance/i, hint: 'UAT cases and issues, the UAT sign-off and the go-live checklist.' },
    { k: 'training', name: 'Training & Documentation', short: 'Training', cps: [6, 7], so: [], views: ['guidebuilder', 'vidguide', 'resources', 'ftr', 'kpi'], re: /train|document|guide|video|ftr|manual/i, hint: 'FTR workbook, user guides and training material.' },
    { k: 'handover', name: 'Go-Live Handover', short: 'Handover', cps: [10], so: ['golive'], views: ['handover'], re: /hand.?over|support|acceptance|sign.?off/i, hint: 'Support handover items and the go-live acceptance.' },
    { k: 'hypercare', name: 'Hypercare', short: 'Hypercare', cps: [9], so: [], views: ['hypercare'], re: /hypercare|stabili[sz]/i, hint: 'Support after go-live until hypercare exit.' },
    { k: 'closure', name: 'Project Closure', short: 'Closure', cps: [11], so: [], views: ['reports'], re: /clos|lesson|final report|wrap/i, hint: 'Closure report, lessons learned and follow-up.' }
  ];
  const STATUS = { completed: 'Completed', current: 'Current', upcoming: 'Upcoming', delayed: 'Delayed', blocked: 'Blocked', na: 'Not applicable' };
  // s: { cps:[{state,name,detail}], signs:[{k,st}], decision:{status:'closed'|'na'|''}, overdue:n, blockers:n, cur:boolean }
  function status(s) {
    const d = (s.decision && s.decision.status) || ''; const parts = s.cps || []; const signs = s.signs || [];
    const open = parts.filter(p => p.state !== 'done').length + signs.filter(x => x.st !== 'signed').length;
    const recordsDone = parts.length > 0 && open === 0;
    const active = parts.some(p => p.state !== 'none') || signs.some(x => x.st !== 'notdue');
    if (d === 'na') return { status: 'na', open, recordsDone, mismatch: false };
    if (d === 'closed') return { status: 'completed', open, recordsDone, mismatch: open > 0 };
    if (recordsDone) return { status: 'completed', open, recordsDone, mismatch: false };
    if ((s.blockers || 0) > 0 && (active || s.cur)) return { status: 'blocked', open, recordsDone, mismatch: false };
    if ((s.overdue || 0) > 0) return { status: 'delayed', open, recordsDone, mismatch: false };
    if (s.cur || active) return { status: 'current', open, recordsDone, mismatch: false };
    return { status: 'upcoming', open, recordsDone, mismatch: false };
  }
  // the current stage: the furthest one with work under way; with none under way, the first one not completed or marked not applicable
  function current(list) { const inProg = list.map(x => x.active && x.status !== 'completed' && x.status !== 'na'); let c = inProg.lastIndexOf(true); if (c < 0) c = list.findIndex(x => x.status !== 'completed' && x.status !== 'na'); return c < 0 ? list.length - 1 : c; }
  // counts for the header: never a percentage, only "n of m"
  function counts(list) { const na = list.filter(x => x.status === 'na').length; return { done: list.filter(x => x.status === 'completed').length, total: list.length - na, na }; }
  const api = { STAGES, STATUS, status, current, counts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBLife = api;
})(typeof window !== 'undefined' ? window : globalThis);
