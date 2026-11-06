/* Kick-off pack (roadmap E15 Stage 1): from an approved MSA extraction, the data of the kick-off deck AND the drafted project plan, built together and kept as the project document
   `kickoff_pack`. Pure (no database, no network); called by _msaapi.mjs when a project is created from an approved extraction and run by tests/kickoff_pack.mjs.
   Nothing is invented. A date that is not contract text is not applied; a missing date, module or responsibility is listed as a gap; a commitment that cannot be met is a conflict.
   The deck shape is the one src/kickoffhtml.js builds (a slide with nothing to show is left out there). The pack is a DRAFT until a person approves it in the Studio. */
import './_planfrommsa.mjs';

const arr = x => (Array.isArray(x) ? x : []);
const src = s => (s && s.page ? 'MSA p.' + s.page + (s.section ? ' §' + s.section : '') : s && s.section ? 'MSA §' + s.section : 'MSA');
const names = a => [...new Set(arr(a).map(x => x.name || x.text).filter(Boolean))];

/** ex: a validated extraction (_msaextract.validateExtraction). o: { now, transferId, version }. Returns the pack object. */
export function buildKickoffPack(ex, o = {}) {
  const P = globalThis.FWBPlanFromMsa; const c = ex.contract || {}; const sure = c.origin === 'contract';
  const input = {
    start: sure ? c.start || '' : '', durationDays: sure && c.durationDays ? c.durationDays : undefined,
    commitments: arr(ex.commitments).map(m => ({ text: m.text, date: m.date || '', origin: m.origin, source: src(m.source) })),
    modules: names(ex.modules), customerResponsibilities: arr(ex.customerResponsibilities).map(x => x.text), exclusions: arr(ex.exclusions).map(x => x.text)
  };
  const plan = P.buildPlan(input, { today: o.today });
  if (!sure && (c.start || c.durationDays)) plan.gaps.unshift('The contract dates or length were interpreted or assumed, not contract text, so they were not used for the plan window. Confirm them with the customer.');
  const rows = P.toPlanStruct(plan.milestones);
  const deck = {
    customer: ex.customer, project: ex.projectName, date: plan.window.start,
    objectives: arr(ex.deliverables).slice(0, 6).map(x => x.text),
    scope: arr(ex.scope).filter(s => s.status === 'confirmed').slice(0, 30).map(s => s.text), keyDates: arr(ex.commitments).filter(m => m.date).map(m => ({ date: m.date, label: m.text })),
    plan: rows.map(r => ({ title: r.title, start: r.start, end: r.end, isPhase: true, ms: false })),
    outOfScope: arr(ex.exclusions).map(x => x.text).filter(Boolean).slice(0, 8),
    customerAsks: arr(ex.customerResponsibilities).filter(x => x && x.text).slice(0, 8).map(x => ({ text: x.text, date: x.origin === 'contract' && x.date ? x.date : '' })),   // a date only when the contract gives it
    governance: arr(ex.supportAndHandover).slice(0, 8).map(x => x.text),
    risks: plan.conflicts.map(x => x.message).concat(arr(ex.dependencies).slice(0, 6).map(x => 'Dependency: ' + x.text)).slice(0, 10),
    nextSteps: plan.gaps.slice(0, 3).map(g => ({ action: 'Resolve: ' + g, owner: 'Facilio' }))
  };
  return {
    version: 1, status: 'draft', builtAt: o.now || new Date().toISOString(), from: { transferId: o.transferId || '', version: o.version == null ? null : o.version },
    plan: { window: plan.window, milestones: plan.milestones, assumptions: plan.assumptions, gaps: plan.gaps, conflicts: plan.conflicts }, rows, deck, changes: []
  };
}
