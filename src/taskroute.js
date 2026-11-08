/* Where does a task belong? Reads the words of a task (title, description, module, sheet name) and says which type and project stage fit, so an imported row or an item found in a document
   lands in the right place even when the file has no Stage or Type column. Pure code, no AI, no network (tested by tests/taskroute.mjs). The first rule that matches wins, so the order is the priority:
   after go-live and hypercare first, then testing, go-live, closure, integrations, configuration, the BRD, requirements and set-up. It only suggests: a stage or type that the file states itself is never overruled,
   and a person can change either in the register. Hypercare tasks use the stage "Go-Live & Handover", the same as the task engine does (src/taskengine.js). */
(function (root) {
  'use strict';
  const RULES = [
    [/\b(hyper-?care|post[- ]?go[- ]?live|after go[- ]?live|stabili[sz]ation|production (issue|bug|incident)|live (issue|bug)|support ticket|sla breach|hot ?fix)\b/i, 'Issue / Blocker', 'Go-Live & Handover', 'hypercare'],
    [/\b(lessons? learn(ed|t)|project closure|close[- ]?out|closure report|final (report|invoice)|csat|customer survey|retrospective|project sign[- ]?off)\b/i, 'Internal Action', 'Closure & Follow-Up', 'closure'],
    [/\b(uat|user acceptance|test (case|script|plan|run|cycle)|regression|sit|defects?|retest|acceptance test|tester|bug)\b/i, 'UAT Task', 'Testing & UAT', 'testing'],
    [/\b(go[- ]?live|cut[- ]?over|hand[- ]?over|end[- ]?user training|train(ing)? (session|the)|readiness|rollout|roll-out|deployment plan)\b/i, 'Go-Live / Handover Task', 'Go-Live & Handover', 'go-live'],
    [/\b(user guide|tester guide|training (material|deck|video)|how[- ]to guide|manual)\b/i, 'User Guide Task', 'Testing & UAT', 'guide'],
    [/\b(integrat\w*|api|sso|single sign|webhook|data migration|migrate|data (load|import|onboarding)|onboarding sheet|interface|connector|sap|erp|bms|iot)\b/i, 'Implementation Task', 'Implementation & Integrations', 'integration'],
    [/\b(ftr|first time right)\b/i, 'FTR / Technical Task', 'Configuration & Documentation', 'ftr'],
    [/\b(configur\w*|state ?flow|workflow|custom field|form layout|role|permission|dashboard|report template|pdf template|notification|sla rule|set ?up (the )?module)\b/i, 'Implementation Task', 'Configuration & Documentation', 'configuration'],
    [/\b(brd|business requirements?|solution (document|design)|sign[- ]?off of (the )?brd|functional (spec|design))\b/i, 'BRD Task', 'Requirements & Workshops', 'BRD'],
    [/\b(change request|cr[- ]?\d*|additional scope|out of scope|scope change)\b/i, 'Change Request', 'Requirements & Workshops', 'change request'],
    [/\b(requirements?|workshops?|use case|process (map|flow)|as-?is|to-?be|gap|clarif\w*|session|scope)\b/i, 'Requirement Task', 'Requirements & Workshops', 'requirements'],
    [/\b(kick-?off|msa|contract|project plan|team onboarding|licen[cs]e|access to|project charter|stakeholder|raci|environment (request|setup))\b/i, 'Internal Action', 'Project Setup & Kickoff', 'set-up']
  ];
  const ASKS = /\b(please (confirm|share|provide|send|clarify)|can you (confirm|share|provide)|customer (to|must|needs to) (confirm|provide|share|send)|awaiting (customer|client)|pending from (customer|client))\b|\?\s*$/i;
  /** parts: { title, desc, module, sheet } (or just the title text). Returns { type, stage, why }; all empty when nothing fits. */
  function route(parts) {
    const p = parts && typeof parts === 'object' ? parts : { title: parts };
    const text = [p.title, p.desc, p.module, p.sheet].filter(Boolean).map(String).join(' . ').slice(0, 2000);
    if (!text.trim()) return { type: '', stage: '', why: '' };
    const hit = RULES.find(r => r[0].test(text));
    if (hit) { const q = ASKS.test(String(p.title || '')) && !/hypercare|testing|go-live/.test(hit[3]); return { type: q ? 'Customer Question' : hit[1], stage: hit[2], why: hit[3] }; }
    if (ASKS.test(text)) return { type: 'Customer Question', stage: '', why: 'question' };
    return { type: '', stage: '', why: '' };
  }
  const api = { route, RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBTaskRoute = api;
})(typeof window !== 'undefined' ? window : globalThis);
