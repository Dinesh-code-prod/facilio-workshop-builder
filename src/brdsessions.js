/* What the requirement sessions captured, in the shape the BRD and the checks need (user, 9 Nov 2026: whatever is answered in the sessions must show in the BRD draft).
   Sources, both project documents: rs_questions (the Questions tab: items with state suggested|kept, and the saved call summaries with decisions, assumptions, dependencies and actions)
   and workshop_room (the answer status and the client's response of each question: { q: { [id]: { status, note, evidence, made, at, by } } }).
   Pure code: no DOM, no network. Run by tests/brdsessions.mjs; used by src/brd.js (Open questions, Answered in the sessions, Decisions assumptions and dependencies) and src/checks.js (readiness). */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []); const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 600);
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const CAT = { module: 'Module', usecase: 'Business use case', workflow: 'Workflow and approval', integration: 'Integration and API', data: 'Data migration and onboarding', technical: 'Technical configuration', roles: 'User roles and permissions', reporting: 'Reporting and dashboards', sla: 'SLA and escalation', scope: 'Contract scope clarification' };
  const PRI = { must: 0, should: 1, could: 2 };
  const STATUSES = ['toask', 'asked', 'answered', 'skipped'];

  /** o: { bank, room, label } bank = the rs_questions document, room = the workshop_room document, label(moduleName) = the module's label.
      Returns the open and answered questions of the sessions, the lists the calls produced, and counts. A question counts only when it is in the workshop (state kept). */
  function rows(o) {
    o = obj(o); const bank = obj(o.bank), q = obj(obj(o.room).q), label = typeof o.label === 'function' ? o.label : x => x;
    const items = arr(bank.items).filter(x => x && x.id && x.text && x.state === 'kept').slice().sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3) || (a.order || 0) - (b.order || 0));
    const area = x => (x.module ? label(x.module) : '') || CAT[x.category] || 'General';
    const open = [], answered = []; let skipped = 0;
    items.forEach(x => {
      const e = obj(q[x.id]); const st = STATUSES.includes(e.status) ? e.status : 'toask';
      if (st === 'skipped') { skipped++; return; }
      if (st === 'answered') { const response = str(e.note, 800) || str(obj(e.evidence).answer, 800); answered.push({ id: x.id, area: area(x), text: str(x.text, 400), response, by: str(e.by, 80), at: str(e.at, 40), hasRequirement: !!obj(e.made).requirement, priority: x.priority || 'should' }); return; }
      open.push({ id: x.id, area: area(x), text: str(x.text, 400), priority: x.priority || 'should', status: st });
    });
    const seen = {}; const collect = (key, map) => { const out = []; arr(bank.summaries).forEach(s => arr(obj(s)[key]).forEach(v => { const t = str(typeof v === 'string' ? v : obj(v).text, 400); if (!t || seen[key + '|' + norm(t)]) return; seen[key + '|' + norm(t)] = 1; out.push(map(t, v, obj(s))); })); return out; };
    const decisions = collect('decisions', (t, v, s) => ({ text: t, at: str(s.at, 40) })), assumptions = collect('assumptions', (t, v, s) => ({ text: t, at: str(s.at, 40) })), dependencies = collect('dependencies', (t, v, s) => ({ text: t, at: str(s.at, 40) }));
    const actions = collect('actions', (t, v, s) => ({ text: t, owner: str(obj(v).owner, 80), at: str(s.at, 40) }));
    const counts = { kept: items.length, open: open.length, openMust: open.filter(x => x.priority === 'must').length, answered: answered.length, answeredNoRequirement: answered.filter(x => x.response && !x.hasRequirement).length, skipped, decisions: decisions.length, assumptions: assumptions.length, dependencies: dependencies.length, actions: actions.length };
    return { open, answered, decisions, assumptions, dependencies, actions, counts };
  }
  /** the checks the sessions add to Checks & validations: [{ sev, item, msg }] (sev: blocking | warning | info) */
  function checks(r) {
    const c = obj(obj(r).counts), out = [];
    if (c.openMust) out.push({ sev: 'warning', item: c.openMust + ' must-ask question' + (c.openMust === 1 ? '' : 's') + ' not answered', msg: 'Questions marked Must in the Questions tab are still to ask or asked without an answer. The BRD lists them under Open Questions.' });
    if (c.answeredNoRequirement) out.push({ sev: 'info', item: c.answeredNoRequirement + ' answer' + (c.answeredNoRequirement === 1 ? '' : 's') + ' without a requirement', msg: 'The client answered these in the sessions but no requirement was made from them yet. The BRD shows them under Answered in the Sessions; make a requirement so the detail reaches the module section.' });
    if (c.kept && !c.answered) out.push({ sev: 'info', item: 'No session question is answered yet', msg: 'Questions are prepared in the Questions tab but none is marked answered, so the BRD has no session answers to show.' });
    return out;
  }
  const api = { rows, checks, CAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; root.FWBBrdSessions = api;
})(typeof window !== 'undefined' ? window : globalThis);
