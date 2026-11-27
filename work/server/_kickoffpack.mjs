/* Kick-off pack (roadmap E15 Stage 1): from an approved MSA extraction, the data of the kick-off deck AND the drafted project plan, built together and kept as the project document
   `kickoff_pack`. Pure (no database, no network); called by _msaapi.mjs when a project is created from an approved extraction and run by tests/kickoff_pack.mjs.
   Nothing is invented. A date that is not contract text is not applied; a missing date, module or responsibility is listed as a gap; a commitment that cannot be met is a conflict.
   The deck shape is the one src/kickoffhtml.js builds (a slide with nothing to show is left out there). The pack is a DRAFT until a person approves it in the Studio. */
import './_planfrommsa.mjs';
import './_kickofflogic.mjs';

const arr = x => (Array.isArray(x) ? x : []);
const src = s => (s && s.page ? 'MSA p.' + s.page + (s.section ? ' §' + s.section : '') : s && s.section ? 'MSA §' + s.section : 'MSA');
const names = a => [...new Set(arr(a).map(x => x.name || x.text).filter(Boolean))];

/** ex: a validated extraction (_msaextract.validateExtraction). o: { now, transferId, version, prevStart (the start of the plan already drafted, kept when the contract has no date) }. Returns the pack object. */
export function buildKickoffPack(ex, o = {}) {
  const P = globalThis.FWBPlanFromMsa; const c = ex.contract || {}; const sure = c.origin === 'contract';
  const input = {
    start: (sure && c.start) || (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(o.prevStart || '')) ? o.prevStart : ''), durationDays: sure && c.durationDays ? c.durationDays : undefined,
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
  Object.assign(deck, kickoffDeck(ex.kickoff || {}, plan, rows));
  if (deck.asks && deck.asks.length) deck.customerAsks = deck.asks.map(a => ({ text: a.text, date: a.due }));   // older readers (change requests, the customer viewer) keep working
  return {
    version: 1, status: 'draft', builtAt: o.now || new Date().toISOString(), from: { transferId: o.transferId || '', version: o.version == null ? null : o.version },
    plan: { window: plan.window, milestones: plan.milestones, assumptions: plan.assumptions, gaps: plan.gaps, conflicts: plan.conflicts }, rows, deck, changes: []
  };
}

// Facilio's four delivery phases, each a group of the plan's own phases (ids of _planfrommsa.mjs); the gate closes the phase. Dates always come from the drafted plan.
const DELIVERY = [
  { name: 'Understand', ids: ['kickoff', 'intro', 'scope', 'custprep', 'data', 'workshops', 'design', 'brd'], show: ['kickoff', 'workshops', 'data', 'brd'], gate: 'T1 · BRD sign-off' },
  { name: 'Build', ids: ['config', 'validation'], show: ['config', 'validation'], gate: 'Ready for testing' },
  { name: 'Prove', ids: ['uat', 'ftr'], show: ['uat', 'ftr'], gate: 'T2 · UAT sign-off' },
  { name: 'Launch', ids: ['training', 'golive', 'handover'], show: ['training', 'golive', 'handover'], gate: 'T3 · Go-live' }
];
// the standard gates: date from the plan (kick-off on its first day, the others on the last day of their phase); "unlocks" is what the plan starts next
const GATES = [
  { id: 'T0', label: 'T0', name: 'Kick-off', at: 'kickoff', edge: 'start', unlocks: 'Requirement workshops and the data templates' },
  { id: 'T1', label: 'T1', name: 'BRD sign-off', at: 'brd', edge: 'end', unlocks: 'Configuration of the modules in scope' },
  { id: 'T2', label: 'T2', name: 'UAT sign-off', at: 'uat', edge: 'end', unlocks: 'Move to production, training and data load' },
  { id: 'T3', label: 'T3', name: 'Go-live', at: 'golive', edge: 'end', unlocks: 'Hypercare and tuning' },
  { id: 'handover', label: '', name: 'Support handover', at: 'handover', edge: 'end', unlocks: 'Business-as-usual support from the Facilio support team' }
];
const OWNER = { Facilio: 'facilio', Customer: 'customer', Both: 'joint' };
/** the richer kick-off deck data (the shape of Facilio's kick-off deck), from the optional `kickoff` block of the extraction and the drafted plan. Nothing is dated except from the plan or the contract. */
function kickoffDeck(K, plan, rows) {
  const by = {}; arr(plan.milestones).forEach(m => { by[m.id] = m; });
  const span = id => (by[id] ? { start: by[id].start, end: by[id].end } : { start: '', end: '' });
  const out = { plan: rows.map(r => ({ title: r.title, start: r.start, end: r.end, isPhase: true, ms: false, owner: OWNER[r.owner] || 'facilio' })) };
  if (K.promise) out.promise = K.promise;
  if (K.meetingRhythm) out.meetingRhythm = K.meetingRhythm;
  if (arr(K.customerRoles).length) out.customerRoles = K.customerRoles.slice();
  out.deliver = DELIVERY.map((d, i) => { const own = arr(K.phases)[i] || {}; const ms = d.ids.map(id => by[id]).filter(Boolean); if (!ms.length) return null;
    return { name: own.name || d.name, start: ms.map(m => m.start).sort()[0], end: ms.map(m => m.end).sort().pop(), activities: arr(own.activities).length ? own.activities.slice() : d.show.map(id => by[id] && by[id].name).filter(Boolean), gate: own.gate || d.gate }; }).filter(Boolean);
  const given = arr(K.gates); const own = id => given.find(g => g.id === id) || {};
  const gates = GATES.map(g => { const k = own(g.id), s = span(g.at); return { label: k.label || g.label, name: k.name || g.name, date: s[g.edge] || '', unlocks: k.unlocks || g.unlocks, needs: k.needs || '' }; })
    .concat(given.filter(g => !g.id).map(g => ({ label: g.label, name: g.name, date: g.date || span(g.at).end || '', unlocks: g.unlocks, needs: g.needs })));
  out.gates = gates.filter(g => g.date).sort((a, b) => a.date.localeCompare(b.date));
  out.tracks = arr(K.tracks).length ? K.tracks.map(tr => ({ name: tr.name, note: tr.note, steps: tr.steps.map(s => Object.assign({ label: s.label }, span(s.at))) }))
    : [{ name: 'Each step waits for the one before it', note: '', steps: [['Workshops and your data', 'workshops'], ['T1 · BRD sign-off', 'brd'], ['Configuration', 'config'], ['UAT', 'uat'], ['T3 · Go-live', 'golive']].map(([label, id]) => Object.assign({ label }, span(id))).filter(s => s.start) }];
  out.slipRule = K.slipRule || 'If an input or a sign-off is late by N working days, every later date moves by N. The plan is updated the same day.';
  if (K.spotlight) out.spotlight = { title: K.spotlight.title, subtitle: K.spotlight.subtitle, note: K.spotlight.note, items: K.spotlight.items.map(x => Object.assign({ name: x.name, points: x.points.slice(), needs: x.needs }, span(x.at))) };
  if (arr(K.outcomes).length) out.outcomes = K.outcomes.map(x => ({ title: x.title, text: x.text, stream: x.stream }));
  if (arr(K.scopeGroups).length) out.scopeGroups = K.scopeGroups.map(x => ({ name: x.name, title: x.title, stream: x.stream, items: x.items.slice() }));
  if (arr(K.scopeAreas).length) out.scopeAreas = K.scopeAreas.map(x => ({ area: x.area, text: x.text }));
  out.streams = [...new Set(arr(out.outcomes).concat(arr(out.scopeGroups)).map(x => x.stream).filter(Boolean))].slice(0, 3);
  if (arr(K.asks).length) out.asks = K.asks.map(a => ({ text: a.text, team: a.team, due: a.date || span(a.at).start || '', unlocks: a.unlocks }));   // due: the contract's date, else the first day of the plan phase it is needed for
  const g = K.governance || {}, e = g.escalation || {};
  if (arr(g.cadence).length || g.changeControl || arr(e.facilio).length || arr(e.customer).length) out.governanceDetail = { cadence: arr(g.cadence).slice(), escalation: { facilio: arr(e.facilio).slice(), customer: arr(e.customer).slice() }, changeControl: g.changeControl || '' };
  if (arr(K.risks).length) out.riskTable = K.risks.map(r => ({ text: r.text, level: r.level, effect: r.effect, mitigation: r.mitigation })).concat(arr(plan.conflicts).slice(0, 3).map(c => ({ text: c.message, level: 'high', effect: 'The drafted plan cannot meet this date', mitigation: 'Agree the date with the customer at kick-off' })));
  if (arr(K.holidays).length) out.holidays = K.holidays.map(h => ({ start: h.start, end: h.end, label: h.label }));
  return out;
}

/** The requirement sessions drafted from a pack, as planner.sessions holds them (the same rules and fields src/kickoff.js syncSessions uses). uid() makes an id. */
export function draftSessions(pack, mode, uid) {
  const r = globalThis.FWBKickoffLogic.sessionPlan(pack);
  return { sessions: r.sessions.map(x => Object.assign({ id: uid(), mode: mode || 'online', notes: '', prep: '', modules: [], fromPack: pack.builtAt }, x)), notes: r.notes, planNotes: r.planNotes };
}
