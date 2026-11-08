/* Lifecycle tracker rules (pure code, also run by tests/life.mjs).
   Nine stages. A stage's status comes from the project's records and from a person's recorded decision, never from the calendar and never from a
   percentage. Missing information is never success: a stage with no records is "Upcoming" (or "Current" when it is the next one to work on), and
   a stage is "Completed" only when every record under it is complete, or when an authorised person closed it (and then the page says where the
   records disagree). */
(function (root) {
  'use strict';
  // k, name, short label, roadmap checkpoints (indexes into V.roadmapStages), sign-offs that close it, menu pages, words that tie plan rows and actions to it
  const STAGES = [
    { k: 'intro', n: 1, name: 'Project introduction', short: 'Intro', cps: [0], so: [], views: ['msaintake', 'kickoff', 'plan', 'timeline', 'governance', 'changes', 'msaflow'], re: /kick|contract|msa|scope|project plan|plan|mobili[sz]/i, hint: 'Contract and scope, the project introduction and the project plan.' },
    { k: 'sessions', n: 2, name: 'Requirement sessions', short: 'Sessions', cps: [1, 2], so: [], views: ['rsplan', 'rstrans', 'whiteboard', 'rschecks', 'transcripts', 'usecases', 'checks', 'msafind', 'onboarding'], re: /workshop|requirement|session|discovery|use case|transcript/i, hint: 'Workshop sessions held, transcripts imported and every requirement confirmed or rejected.' },
    { k: 'design', n: 3, name: 'Solution design & BRD', short: 'Design & BRD', cps: [3, 4], so: ['brd'], views: ['solution', 'modules', 'flow', 'mockup', 'roles', 'notifications', 'cfginputs', 'slakpi', 'brd', 'trace', 'orgpkg', 'dashboards'], re: /design|brd|configur|solution|form|mockup|build|integrat|sla|kpi/i, hint: 'The solution agreed per module, the build, the BRD and its sign-off.' },
    { k: 'uat', n: 4, name: 'UAT & FTR', short: 'UAT & FTR', cps: [5, 6, 8], so: ['uat'], views: ['delivery', 'ftr', 'kpi', 'golive', 'contracts'], re: /uat|test|go.?live|cut.?over|acceptance|ftr/i, hint: 'UAT cases and issues, the FTR workbook, the go-live checklist and the UAT sign-off.' },
    { k: 'training', n: 5, name: 'Training guides', short: 'Training', cps: [7], so: [], views: ['guides', 'guidebuilder', 'vidguide', 'resources'], re: /train|document|guide|video|manual/i, hint: 'User guides and training material written and approved.' },
    { k: 'hypercare', n: 7, name: 'Hypercare', short: 'Hypercare', cps: [9], so: [], views: ['hypercare'], re: /hypercare|stabili[sz]/i, hint: 'Support after go-live until hypercare exit.' },
    { k: 'handover', n: 8, name: 'Project handover', short: 'Handover', cps: [10, 11], so: ['golive'], views: ['handover', 'reports'], re: /hand.?over|support|acceptance|sign.?off|clos|lesson|final report|wrap/i, hint: 'Support handover items, the go-live acceptance, the closure report and lessons learned.' }
  ];
  const STATUS = { completed: 'Completed', ready: 'Ready to close', current: 'Current', upcoming: 'Upcoming', delayed: 'Delayed', blocked: 'Blocked', na: 'Not applicable' };
  // s: { cps:[{state,name,detail}], signs:[{k,st}], decision:{status:'closed'|'na'|''}, overdue:n, blockers:n, cur:boolean }
  function status(s) {
    const d = (s.decision && s.decision.status) || ''; const parts = s.cps || []; const signs = s.signs || [];
    const open = parts.filter(p => p.state !== 'done').length + signs.filter(x => x.st !== 'signed').length;
    const recordsDone = parts.length > 0 && open === 0;
    const active = parts.some(p => p.state !== 'none') || signs.some(x => x.st !== 'notdue');
    if (d === 'na') return { status: 'na', open, recordsDone, mismatch: false };
    if (d === 'closed') return { status: 'completed', open, recordsDone, mismatch: open > 0 };
    if (recordsDone) return { status: 'ready', open, recordsDone, mismatch: false };   // every record is complete: the stage waits for a person to close it (nothing completes by itself)
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
