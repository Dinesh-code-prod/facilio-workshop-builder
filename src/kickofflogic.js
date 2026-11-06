/* Kick-off page rules (roadmap E15 Stage 1, E17): pure code, no page, no network; run by tests/kickoff_logic.mjs and used by src/kickoff.js.
   The pack (project document `kickoff_pack`, written by work/server/_kickoffpack.mjs) is a DRAFT until the project owner approves it. Change requests are the project document `kickoff_cr`:
   { items: [{ id, text, by, at, status: open | applied | dismissed }] }. Claude reads them through the job queue (apply_change); a person only writes the text. */
(function (root) {
  'use strict';
  const arr = x => (Array.isArray(x) ? x : []);
  const ORIGIN = { contract: 'From the contract', interpreted: 'Interpreted from the contract', assumed: 'Facilio assumption', confirmed: 'Confirmed by a person' };
  const PACK_STATUS = { draft: 'Draft, waiting for approval', approved: 'Approved', discarded: 'Discarded' };
  const JOB_STATUS = { waiting: 'Waiting for Claude', claimed: 'Claude is working on it', needs_input: 'Claude needs your answer', done: 'Done', failed: 'Failed', cancelled: 'Cancelled' };
  const MAX_TEXT = 600, MAX_ITEMS = 100;
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const originLabel = o => ORIGIN[o] || ORIGIN.assumed;

  /** the stored pack as the page reads it; null when there is none (a document nobody has written reads as {} or null) */
  function packOf(d) {
    if (!d || typeof d !== 'object' || !d.plan || !d.deck) return null;
    const st = ['draft', 'approved', 'discarded'].includes(d.status) ? d.status : 'draft', p = d.plan;
    const mods = [...new Set(arr(p.milestones).flatMap(m => arr(m.deliverables)).map(x => /^Modules in scope:\s*(.+)$/.exec(String(x))).filter(Boolean).flatMap(m => m[1].split(/,\s*/)))];
    return { status: st, statusLabel: PACK_STATUS[st], builtAt: d.builtAt || '', approvedBy: d.approvedBy || '', approvedAt: d.approvedAt || '', transferId: d.from && d.from.transferId || '', window: p.window || {}, deck: d.deck,
      milestones: arr(p.milestones).map(m => ({ id: m.id, name: m.name, start: m.start, end: m.end, origin: m.origin, label: originLabel(m.origin), responsible: m.responsible || '' })),
      review: reviewOf(d), rows: arr(d.rows), assumptions: arr(p.assumptions), gaps: arr(p.gaps), conflicts: arr(p.conflicts).map(c => (c && c.message) || String(c)), scope: arr(d.deck.scope), modules: mods };
  }

  /** The review the consultant does before approving: one line per section. Whoever ticks a line is recorded with the time. */
  const REVIEW = [['scope', 'Scope and modules match the contract'], ['dates', 'Plan dates and assumptions are right'], ['gaps', 'I have looked at the gaps and conflicts'], ['deck', 'The kick-off deck reads correctly'], ['sessions', 'The requirement sessions and attendee roles make sense']];
  const reviewOf = d => { const r = d && d.review && typeof d.review === 'object' ? d.review : {}; return REVIEW.map(([id, label]) => ({ id, label, by: (r[id] && r[id].by) || '', at: (r[id] && r[id].at) || '', done: !!(r[id] && r[id].by) })); };
  const setReview = (stored, id, on, by, now) => { if (!REVIEW.some(x => x[0] === id)) return stored; const r = Object.assign({}, stored.review || {}); if (on) r[id] = { by: clean(by, 120), at: now }; else delete r[id]; return Object.assign({}, stored, { review: r }); };
  const itemsOf = d => arr(d && d.items).filter(x => x && x.id && x.text).map(x => ({ id: String(x.id), text: clean(x.text, MAX_TEXT), by: x.by || '', at: x.at || '', status: ['open', 'applied', 'dismissed'].includes(x.status) ? x.status : 'open' }));
  const openCount = d => itemsOf(d).filter(x => x.status === 'open').length;

  /** a new change request; returns { ok, doc, item } or { ok:false, error }. The document is copied, never changed. */
  function addChange(d, text, by, now) {
    const t = clean(text, MAX_TEXT); if (!t) return { ok: false, error: 'Write the change you want.' };
    const items = itemsOf(d); if (items.length >= MAX_ITEMS) return { ok: false, error: 'There are ' + MAX_ITEMS + ' change requests already; dismiss the old ones first.' };
    if (items.some(x => x.status === 'open' && x.text === t)) return { ok: false, error: 'The same change request is already open.' };
    const item = { id: 'cr_' + (Math.max(0, ...items.map(x => parseInt(String(x.id).slice(3), 10) || 0)) + 1), text: t, by: clean(by, 120), at: now, status: 'open' };
    return { ok: true, item, doc: { items: items.concat(item) } };
  }
  const dismissChange = (d, id) => ({ items: itemsOf(d).map(x => x.id === id && x.status === 'open' ? Object.assign({}, x, { status: 'dismissed' }) : x) });

  /** can this person approve now? Only the project owner; never while change requests are open (Claude has not applied them) or there is no pack. */
  function approvalCheck(pack, isOwner, crDoc, needReview) {
    if (!pack) return { ok: false, why: 'There is no kick-off pack yet.' };
    if (pack.status === 'approved') return { ok: false, why: 'Already approved' + (pack.approvedBy ? ' by ' + pack.approvedBy : '') + '.' };
    if (pack.status === 'discarded') return { ok: false, why: 'This draft was discarded.' };
    if (!isOwner) return { ok: false, why: 'Only the project owner or an admin can approve.' };
    const n = openCount(crDoc); if (n) return { ok: false, why: n + ' change request' + (n === 1 ? ' is' : 's are') + ' still open. Wait until Claude has applied them, or dismiss them.' };
    if (needReview) { const left = pack.review.filter(x => !x.done).length; if (left) return { ok: false, why: 'Go through each section of your review first and tick it off (' + left + ' left). Then you can approve.' }; }
    return { ok: true, why: '' };
  }
  /** the stored pack with the new status; the plan and deck are untouched */
  const setStatus = (stored, status, by, now) => Object.assign({}, stored, { status }, status === 'approved' ? { approvedBy: clean(by, 120), approvedAt: now } : { approvedBy: '', approvedAt: '' });

  /** the job list as the page shows it, with the questions of a job that waits for an answer */
  const jobRows = jobs => arr(jobs).map(j => ({ id: j.id, kind: j.kind, label: j.label || j.kind, status: j.status, statusLabel: JOB_STATUS[j.status] || j.status, at: j.requestedAt || '', by: j.requestedBy || '',
    stage: j.stage || '', activity: Array.isArray(j.activity) ? j.activity : [], progressAt: j.progress && j.progress.at || '', claimedAt: j.claimedAt || '', finishedAt: j.finishedAt || '', claimedBy: j.claimedBy || '', progress: j.progress && j.progress.text || '', summary: j.result && j.result.summary || '', transferId: j.result && j.result.transferId || '', questions: j.status === 'needs_input' ? arr(j.result && j.result.questions) : [], open: ['waiting', 'claimed', 'needs_input'].includes(j.status) }));
  const pullRequest = (customer, project, file) => ({ kind: 'pull_msa', note: clean([customer, project].filter(Boolean).join(' / ') + (file ? ' / uploaded file: ' + file : ''), 300) });
  const changeRequest = () => ({ kind: 'apply_change', section: 'kickoff_cr' });
  /** which step the person is on, for the strip at the top */
  function stage(hasMsa, pack, jobs) {
    if (pack) return pack.status === 'approved' ? 'approved' : 'review';
    if (jobRows(jobs).some(j => j.open && j.kind === 'pull_msa')) return 'pulling';
    return hasMsa ? 'extract' : 'start';
  }
  /** Requirement session plan, in the structure of Facilio's workshop plan sheet: a session groups related modules; each module has a numbered agenda; the customer roles who need to attend; date, time, duration, mode;
      an optional follow-up session; and the planning notes. The agendas are Facilio's standard checklists per module family (the same wording the delivery team uses), not facts from the contract. Modules come from the pack,
      dates are working days (Monday to Friday, as the plan assumes) inside the "Requirements workshops" phase, one session a day. Everything is a suggestion (status proposed); people are never named. */
  const FAM = {
    portfolio: { re: /portfolio|\bsites?\b/i, who: ['Portfolio Administrator'], pts: ['Portfolio/site hierarchy and structure: sites, buildings, floors, spaces and subspaces, as applicable.', 'Site/building details, identifiers, addresses and required portfolio attributes.', 'Hierarchy relationships, naming conventions, ownership and data-import requirements.', 'Portfolio views, access permissions and links to assets, work orders and reporting.'], prep: 'site/building hierarchy' },
    client: { re: /client management|\bclients?\b(?!.*portal)/i, who: ['Client Management Representative'], pts: ['Client records, client hierarchy/relationships, contact details and required fields.', 'Client roles, responsibilities, access and portal-user relationships.', 'Client-related communications, records and reporting requirements.'], prep: 'client records' },
    asset: { re: /asset/i, who: ['Asset Administrator', 'Facilities / Operations Lead', 'Maintenance Lead'], pts: ['Asset register scope, asset categories/types, naming conventions, unique IDs and mandatory fields.', 'Asset hierarchy and relationships to portfolio locations, parent/child assets and components, where applicable.', 'Asset attributes: manufacturer, model, serial number, installation/commissioning details, warranty, criticality and status, as applicable.', 'Asset location mapping, ownership, responsible teams and access permissions.', 'Asset lifecycle/status handling, asset updates, transfers and retirement/disposal requirements.', 'Asset documents, attachments, QR/barcode identification and mobile lookup requirements.', 'Asset history and links to reactive work orders, PPM schedules, inspections and compliance records.', 'Asset data migration/import template, validation, duplicates, missing data, data owners and sign-off.'], prep: 'asset register and categories' },
    helpdesk: { re: /help ?desk|service request/i, who: ['Help Desk Lead', 'Maintenance Lead', 'Facilities Manager'], pts: ['Request channels and intake process; request types/categories, subcategories, problem descriptions and mandatory fields.', 'Priority/urgency rules, requestor details, site/location/asset references and attachments.', 'Triage, review, clarification, rejection, approval and conversion to a work order, where applicable.', 'Assignment/ownership, reassignment, status lifecycle, comments, updates, closure and reopening rules.'], prep: 'request categories and priorities' },
    portal: { re: /portal/i, who: ['Client / Requestor Representative'], pts: ['Portal user types, access provisioning, permissions and client/site visibility.', 'Request submission, required fields, attachments, tracking, comments and status visibility.', 'Portal notifications, user experience expectations and mobile-specific requirements.'], prep: '' },
    reactive: { re: /reactive|corrective/i, who: ['Maintenance Lead'], pts: ['Corrective/reactive work order creation and relationship to service requests.', 'Work order categories, priorities, assignment rules, responsible teams/vendors and dispatch process.', 'Work execution updates, labour/material or completion details if in scope, evidence/attachments, resolution codes and closure checks.', 'On-hold, cancellation, reassignment, escalation, reopening and exception scenarios.', 'Work order history, operational views and reporting needs.'], prep: 'reactive work order lifecycle' },
    ppm: { re: /planned|preventive|\bppm\b/i, who: ['Maintenance Lead'], pts: ['PPM strategy, asset coverage, maintenance plans, frequencies, triggers and scheduling rules.', 'PPM task/job plans, checklists, steps, readings, safety requirements and completion criteria.', 'Work order generation, assignment, planned dates, rescheduling, missed/overdue maintenance and closure.', 'Calendar/planning views, responsible teams/vendors, maintenance history and PPM reporting.'], prep: 'PPM plans, job plans and checklists' },
    inspections: { re: /inspect/i, who: ['Inspection / Compliance Lead'], pts: ['Inspection types, templates, questions, response types, mandatory answers, readings and evidence.', 'Inspection frequency/scheduling, assignment, mobile execution and submission/review process.', 'Scoring/pass-fail rules, non-compliance/deviation handling, corrective work order creation and follow-up.', 'Inspection records, evidence, audit trail and compliance reporting requirements.'], prep: 'inspection templates' },
    sla: { re: /\bsla\b|compliance management/i, who: ['SLA Owner'], pts: ['SLA scope, applicable request/work order types, priorities and response/resolution targets.', 'SLA clock start/stop/pause conditions, business hours/calendars, breach thresholds and escalation rules.', 'SLA notifications, breach ownership, exceptions and performance reports.'], prep: 'the SLA matrix' },
    mobile: { re: /mobile|workstation/i, who: ['Field Team Representative'], pts: ['User access/login, role-based visibility and supported field workflows.', 'Work order/PPM/inspection execution, status updates, checklists/readings, photos/attachments and QR scanning as applicable.', 'Connectivity/offline expectations, sync behaviour and device/platform considerations to confirm.'], prep: '' },
    stateflow: { re: /state ?flow|process automation|workflow/i, who: ['Operations Lead'], pts: ['Statuses and transitions for service requests, work orders, PPM work orders and inspections, as applicable.', 'Entry/exit criteria, mandatory fields, validation, approvals, conditional routing and role-based actions.', 'Automation triggers, assignment/escalation rules, exceptions and audit/history expectations.'], prep: 'user roles' },
    notifications: { re: /notif|alert/i, who: ['Help Desk Lead'], pts: ['Trigger events, recipient rules, role/user groups and channels available in the product.', 'Notification content, timing, reminders, escalations and handling of SLA breaches or overdue activities.'], prep: 'notification needs' },
    dashboards: { re: /dashboard/i, who: ['SLA / Reporting Owner'], pts: ['Audience/roles, KPIs, filters, date ranges, site-level views, drill-down and refresh expectations.', 'Operational views for requests, work orders, PPM compliance, inspections and SLAs.'], prep: 'dashboard KPIs' },
    analytics: { re: /analytic|report/i, who: ['SLA / Reporting Owner'], pts: ['Required reports, data fields, filters, grouping, sorting, charts and cross-module reporting needs.', 'Export formats, scheduling/distribution and access permissions, where supported.'], prep: 'sample reports' }
  };
  const FAM_ORDER = ['inspections', 'sla', 'portal', 'mobile', 'client', 'helpdesk', 'reactive', 'ppm', 'asset', 'stateflow', 'notifications', 'dashboards', 'analytics', 'portfolio'];   // most specific first
  const GROUPS = [['portfolio', 'client'], ['asset'], ['helpdesk', 'portal', 'reactive'], ['ppm', 'inspections', 'sla', 'mobile'], ['stateflow', 'notifications', 'dashboards', 'analytics']];
  const GENERIC = ['Current process, roles and responsibilities.', 'Forms, mandatory fields, data to be loaded and data owners.', 'Workflow, approvals, exceptions and notifications.', 'Reports, dashboards and integrations, where in scope.'];
  const famOf = m => FAM_ORDER.find(k => FAM[k].re.test(m)) || 'other';
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const longDate = ms => { const d = new Date(ms); return WD[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const join = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  /** returns { sessions, notes, planNotes }: notes are warnings (strings); planNotes are the Item / Details rows of the planning notes. No sessions when the plan has no dated workshops phase or the contract names no modules. */
  function sessionPlan(raw) {
    const p = packOf(raw); const out = { sessions: [], notes: [], planNotes: [] }; if (!p) return out; const ph = p.milestones.find(m => m.id === 'workshops');
    if (!ph || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(ph.start || ''))) { out.notes.push('The plan has no dated requirements workshops phase, so no sessions were drafted.'); return out; }
    if (!p.modules.length) { out.notes.push('The contract names no modules, so no sessions were drafted. Add the modules in scope first.'); return out; }
    const by = {}; p.modules.forEach(m => { const k = famOf(m); (by[k] = by[k] || []).push(m); });
    const groups = GROUPS.map(g => g.filter(k => by[k]).map(k => [k, by[k]])).filter(g => g.length); const other = by.other || []; for (let i = 0; i < other.length; i += 3) groups.push(other.slice(i, i + 3).map(m => ['other', [m]]));
    const DAY = 864e5, t = s => Date.parse(s + 'T00:00:00Z'), iso = ms => new Date(ms).toISOString().slice(0, 10); const end = /^[0-9]{4}-/.test(String(ph.end || '')) ? t(ph.end) : t(ph.start);
    const days = []; for (let d = t(ph.start); days.length < 400; d += DAY) { const wd = new Date(d).getUTCDay(); if (wd !== 0 && wd !== 6) days.push(d); }
    const last = groups.length - 1;
    groups.forEach((g, i) => {
      const items = g.flatMap(([, ms]) => ms); const who = ['System Administrator']; g.forEach(([k]) => (FAM[k] ? FAM[k].who : ['Process owner']).forEach(w => { if (!who.includes(w)) who.push(w); })); who.push('Project POC');
      const details = g.flatMap(([k, ms]) => ms.map(m => ({ heading: m.toUpperCase(), points: (FAM[k] ? FAM[k].pts : GENERIC).slice() })));
      details.push({ heading: 'WORKSHOP OUTPUTS', points: ['Confirm the required data templates, mandatory fields, data owners, roles, status definitions, exceptions, reporting needs, open questions and decisions for ' + (items.length === 1 ? 'this module' : 'these modules') + '.'] });
      if (i === last && groups.length > 1) details.push({ heading: 'CROSS-MODULE CLOSEOUT', points: ['Validate dependencies and end-to-end scenarios across the ' + (last + 1) + ' workshops.', 'Record decisions, open questions, assumptions, data owners, action owners and BRD inputs.', 'Confirm any topics requiring a follow-up workshop; do not assume unconfirmed product capability or scope.'] });
      out.sessions.push({ no: i + 1, title: 'Session ' + (i + 1), items, itemsText: join(items), details, stakeholders: who, date: iso(days[i]), time: '10:00', start: '10:00', end: '12:00', minutes: 120, duration: '2 hours (proposed)', mode: 'Virtual session', status: 'proposed', module: items.join(', '), participants: '' });
    });
    out.sessions.push({ no: groups.length + 1, title: 'Additional session (if required)', items: ['Follow-up on outstanding requirements, clarifications and cross-module dependencies'], itemsText: 'Follow-up on outstanding requirements, clarifications and cross-module dependencies',
      details: [{ heading: '', points: ['Address unresolved questions from Sessions 1 to ' + groups.length + '.', 'Confirm process exceptions, approval paths and configuration decisions.', 'Review outstanding data and onboarding dependencies.', 'Clarify reporting, SLA, notification and workflow requirements as needed.', 'Confirm decisions, action owners and inputs required to complete the BRD.'] }],
      stakeholders: ['Relevant process owners and stakeholders based on the outstanding topics', 'System Administrator', 'Facilio Implementation Team'], date: '', time: 'To be confirmed with the client', start: '', end: '', minutes: 120, duration: '2 hours (proposed)', mode: 'Virtual session', status: 'optional', module: '', participants: '' });
    const planned = out.sessions.filter(x => x.status === 'proposed'); const lastIn = iso(end); const over = planned.filter(x => x.date > lastIn).length;
    if (over) out.notes.push(over + ' session' + (over === 1 ? '' : 's') + ' fall after the requirements workshops phase (which ends ' + ph.end + '): there are more session groups than the phase has room for. Ask Claude to move the phase or merge sessions.');
    out.notes.push('Dates are Facilio suggestions: nothing in the contract fixes them. Attendees are roles; names are not known yet.');
    const prep = [...new Set(p.modules.map(m => (FAM[famOf(m)] || {}).prep).filter(Boolean))]; const excl = (p.deck && p.deck.outOfScope) || [];
    out.planNotes = [
      { item: 'Schedule', text: planned.length + ' proposed session' + (planned.length === 1 ? '' : 's') + ' on ' + join(planned.map(x => longDate(t(x.date)))) + '; two hours per session.' },
      { item: 'Timing', text: 'Proposed start time 10:00. Each session is proposed for two hours; confirm the time zone and duration with the client before circulation.' },
      { item: 'Scope basis', text: 'Based on the signed MSA: ' + join(p.modules) + '.' + (excl.length ? ' Excluded in the contract: ' + excl.slice(0, 4).join(' ') : '') },
      { item: 'Scope validation', text: 'Confirm all inclusions, exclusions and licensed quantities against the signed MSA before final approval.' },
      { item: 'Workshop outputs', text: 'Complete module-by-module discovery covering configuration, process flows, roles/permissions, data fields/templates, exceptions, integrations/dependencies, notifications, reporting, migration/onboarding requirements and decisions, where relevant. Record out-of-scope or unconfirmed capabilities instead of assuming them.' },
      { item: 'Preparation requested', text: 'Where available, prepare ' + (prep.length ? join(prep) + ', ' : '') + 'user roles, notification needs and sample reports.' },
      { item: 'Optional follow-up session', text: 'A follow-up session is a contingency only. Schedule it if any module checklist, process exception, dependency or decision remains unresolved after the planned workshops.' }
    ];
    return out;
  }
  const api = { REVIEW, reviewOf, setReview, sessionPlan, originLabel, packOf, itemsOf, openCount, addChange, dismissChange, approvalCheck, setStatus, jobRows, pullRequest, changeRequest, stage, ORIGIN, PACK_STATUS, JOB_STATUS, MAX_TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBKickoffLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
