/* Portfolio health for the Admin Command Center: pure functions over one project's real records (no storage access, no AI).
   Each warning is a SIGNAL built from evidence that exists in the project: what triggered it, the records behind it (with a page
   to open), why it matters, a recommended next action (a fixed rule, not AI), the owner when one is recorded, and dates.
   A signal is an "issue" when the records state the problem (overdue, blocked, refused) and a "risk" when it is a warning sign
   (no recent activity, go-live close with prerequisites open, an open RAID risk).

   Health is rule-based and explained by its signals; there is no numeric score, because the records are uneven across projects
   and a number would suggest a precision they do not have. Rules, in order (the first that applies wins):
     manual status   Completed, On hold or Cancelled, set by a project owner or an admin, is shown as set (never changed by these rules)
     Blocked         a critical blocker: blocked work that is Critical/High priority or has been blocked for 14+ days, or 3+ open blockers
     Overdue         a plan step recorded as not done after its end date, the project end date passed before go-live, or 3+ overdue Critical/High tasks
     At risk         any other critical or high signal, or 2+ medium signals
     Insufficient data   no dated plan, no tasks, no governance actions and no RAID items: nothing to judge by
     On track        none of the above. It means "no warning found in the records", not a guarantee.
   Thresholds are in RULES below. Nothing here changes a record. */

export const RULES = { idleDays: 14, questionDays: 7, questionLongDays: 14, decisionDays: 7, crDays: 14, blockerLongDays: 14, goLiveSoonDays: 21, deadlineDays: 14, concentration: 0.6, concentrationMin: 3 };
export const HEALTH = ['blocked', 'overdue', 'at_risk', 'on_track', 'insufficient', 'on_hold', 'completed', 'cancelled', 'churned', 'not_workable', 'discontinued'];
export const HEALTH_LABEL = { blocked: 'Blocked', overdue: 'Overdue', at_risk: 'At risk', on_track: 'On track', insufficient: 'Insufficient data', on_hold: 'On hold', completed: 'Completed', cancelled: 'Cancelled', churned: 'Churned', not_workable: 'Not workable', discontinued: 'Discontinued' };
export const MANUAL = ['active', 'on_hold', 'completed', 'cancelled', 'churned', 'not_workable', 'discontinued'];   // set by a person; anything but 'active' leaves the active delivery figures and stays in the history
export const STEPS = ['Kick-Off', 'Workshops & Data Templates', 'BRD Sign-Off', 'Final Implementation Timeline', 'Implementation & Testing', 'Demo To UAT Users', 'UAT & Feedback', 'Feedback Incorporated', 'UAT Sign-Off', 'Training The Wider Team', 'Data Clean-Up', 'Go-Live & Hypercare'];
// the eight-stage roadmap of the Studio menu (1 to 5, 7, 8; go-live readiness sits inside 4); each of the 12 plan steps belongs to one stage (keep in step with src/timeline.js)
export const ROADMAP = { 1: 'Project introduction', 2: 'Requirement sessions', 3: 'Mockup & BRD', 4: 'UAT & FTR', 5: 'Training guides', 7: 'Hypercare', 8: 'Project handover' };
export const STAGE_OF_STEP = [1, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 7];
// the same mapping of plan rows to the 12 standard steps as the Plan Timeline page (src/timeline.js)
const STEP_RE = [/kick.?off|project start/i, /workshop|data template|requirement (session|gathering)|discovery/i, /\bbrd\b|requirement.*sign/i, /final.*(timeline|plan)|implementation timeline|project plan/i, /implementation|configur|build|set.?up|internal test/i, /demo|handover|hand over/i, /\buat\b|user acceptance|feedback/i, /incorporat|feedback.*(fix|resol|appl)/i, /uat.*sign|sign.?off.*uat/i, /train/i, /clean.?up|migrat|data load|cut.?over/i, /go.?live|hyper.?care/i];
const STEP_ORDER = [8, 2, 11, 3, 10, 9, 5, 0, 7, 1, 6, 4];
const stepOfRow = t => { for (const i of STEP_ORDER) if (STEP_RE[i].test(t)) return i; return -1; };
const D = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const dayOf = iso => String(iso || '').slice(0, 10);
const SEV_RANK = { critical: 0, high: 1, medium: 2 };
const TASK_CLOSED = ['Done', 'Cancelled'];
const HP = ['Critical', 'High'];

export function planInfo(plan, controls, today) {
  const rows = (plan && Array.isArray(plan.rows) ? plan.rows : []).filter(r => r && !r.isPhase);
  const info = STEPS.map((t, i) => ({ i, title: t, start: '', end: '', n: 0 }));
  rows.forEach(r => { const i = stepOfRow((r.title || '') + ' ' + (r.phase || '')); if (i < 0 || !D(r.start)) return; const x = info[i]; x.n++; if (!x.start || r.start < x.start) x.start = r.start; const e = D(r.end) || r.start; if (!x.end || e > x.end) x.end = e; });
  const ph = (controls && controls.phase) || {}; let cur = -1;
  if (ph.step >= 1 && ph.step <= 12) cur = ph.step - 1; else info.forEach(x => { if (x.start && x.start <= today) cur = Math.max(cur, x.i); });
  const next = info.find(x => x.i > cur && x.start && x.start >= today) || null;
  const goLive = info[11].start || '';
  // rows recorded as not done after their end date (rows without a status say nothing either way)
  const late = rows.filter(r => D(r.end) && r.end < today && ['Not started', 'In progress', 'Blocked'].includes(r.status));
  return { dated: info.filter(x => x.start).length, rows: rows.length, withStatus: rows.filter(r => r.status).length, cur, curTitle: cur >= 0 ? STEPS[cur] : '', forced: !!(ph.step >= 1), next, goLive, late };
}


/* money per project, from the contract records only (fee milestones, the rate card's currency) and change-request prices; null when nothing is recorded.
   A milestone counts as billable on its own date, or on the signing or go-live date when it is tied to one of those events; the rest is reported as undated, never guessed. */
function moneyOf(items, pl, today, p) {
  const get = k => ((items.find(i => i.kind === k && i.id === 'main') || {}).data) || {}; const fees = get('ctrfees'), core = get('ctrcore'), rates = get('ctrrates');
  const n = v => { const x = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')); return isNaN(x) ? 0 : x; };
  const ms = (Array.isArray(fees.milestones) ? fees.milestones : []).map(m => { const d = D(m.date) ? m.date : m.event === 'signing' && D(core.signed) ? core.signed : m.event === 'golive' && pl.goLive ? pl.goLive : ''; return { amount: n(m.amount), date: d }; });
  const contract = ms.reduce((a, m) => a + m.amount, 0); const crs = items.filter(i => i.kind === 'cr' && i.data);
  const crSum = list => crs.filter(c => list.includes(c.data.status)).reduce((a, c) => a + n(c.data.price), 0);
  const converted = crSum(['CR Converted', 'Delivered']), pending = crSum(['Requested', 'Draft', 'Proposed']);
  if (!contract && !converted && !pending) return null;
  const dated = ms.filter(m => m.date), soon = dated.filter(m => m.date > today && days(today, m.date) <= 60);
  return { currency: String(p.currency || rates.currency || '').trim().slice(0, 8), contract, billed: dated.filter(m => m.date <= today).reduce((a, m) => a + m.amount, 0), next60: soon.reduce((a, m) => a + m.amount, 0), undated: ms.filter(m => !m.date).reduce((a, m) => a + m.amount, 0), crConverted: converted, crPending: pending };
}

/* one project -> { health, manual, signals, metrics }.
   r: { p, plan, controls, brd, planner, workshop, items: [{ kind, id, data, createdAt, updatedAt }], fb: [], au: [] } */
export function assess(r, today, opts) {
  opts = opts || {}; const p = r.p || {}; const items = r.items || []; const of = k => items.filter(i => i.kind === k && i.data);
  const T = of('task'), act = of('action'), raid = of('raid'), so = of('signoff'), dec = of('decision'), cr = of('cr'), hc = of('hc'), ai = of('ai');
  const pl = planInfo(r.plan, r.controls, today); const sig = []; const add = s => sig.push(s);
  const open = T.filter(t => !TASK_CLOSED.includes(t.data.status));
  const lateDate = t => { const d = t.data; const x = [D(d.due), D(d.eta)].filter(Boolean).sort()[0]; return x && x < today ? x : ''; };
  const tLink = t => ({ label: 'T-' + t.data.n + ' ' + String(t.data.title || '').slice(0, 80), view: 'tasks', x: { tkOpenOnce: t.id } });
  const signed = k => so.some(s => (s.id === k || s.data.kind === k) && s.data.status === 'signed');
  const soOf = k => so.find(s => s.id === k || s.data.kind === k);
  const owners = list => [...new Set(list.map(t => t.data.owner).filter(Boolean))].slice(0, 3).join(', ');

  // ---- schedule ----
  if (pl.late.length) add({ code: 'milestone_late', cat: 'Schedule', kind: 'issue', sev: 'high', title: pl.late.length + ' plan step' + (pl.late.length > 1 ? 's' : '') + ' recorded as not done after the end date', why: 'The project plan shows work that should have finished.', action: 'Review the plan with the owner and record a new date or the reason.', since: pl.late.map(x => x.end).sort()[0], ev: pl.late.slice(0, 6).map(x => ({ label: (x.title || 'Plan row') + ' · ended ' + x.end + ' · ' + x.status, view: 'timeline' })), n: pl.late.length });
  const end = D(p.endDate); const live = signed('golive');
  if (end && end < today && !live) add({ code: 'end_passed', cat: 'Schedule', kind: 'issue', sev: 'high', title: 'Planned end date ' + end + ' has passed without go-live acceptance', why: 'The agreed end date is behind the project.', action: 'Agree a revised end date with the customer and record it in the project settings and plan.', since: end, ev: [{ label: 'Project end date ' + end, view: 'settings' }, { label: 'Go-Live Acceptance sign-off', view: 'governance', x: { govTab: 'signoffs' } }] });
  if (pl.goLive && pl.goLive >= today && days(today, pl.goLive) <= RULES.goLiveSoonDays && !live) {
    const pre = []; if (!signed('brd')) pre.push('BRD sign-off'); if (!signed('uat')) pre.push('UAT sign-off');
    const crit = open.filter(t => t.data.priority === 'Critical').length + hc.filter(h => ['Critical', 'High'].includes(h.data.severity) && h.data.status === 'Open').length; if (crit) pre.push(crit + ' open critical item' + (crit > 1 ? 's' : ''));
    if (pre.length) add({ code: 'golive_soon', cat: 'Schedule', kind: 'risk', sev: 'high', title: 'Go-live in ' + days(today, pl.goLive) + ' days with ' + pre.join(', ') + ' outstanding', why: 'Prerequisites for go-live are not complete.', action: 'Confirm a go-live readiness review and owners for each open prerequisite.', since: today, ev: [{ label: 'Go-live planned ' + pl.goLive, view: 'timeline' }, { label: 'Sign-offs', view: 'governance', x: { govTab: 'signoffs' } }, { label: 'Build, UAT & Go-Live', view: 'delivery' }] });
  }
  // ---- tasks ----
  // a blocked task is reported once, as a blocker, even when it is also past its date (no double counting)
  const isBlk = t => t.data.status === 'Blocked' || !!String(t.data.blocker || '').trim();
  const odHP = open.filter(t => lateDate(t) && !isBlk(t) && HP.includes(t.data.priority)), odOther = open.filter(t => lateDate(t) && !isBlk(t) && !HP.includes(t.data.priority));
  if (odHP.length) add({ code: 'task_overdue_hp', cat: 'Tasks', kind: 'issue', sev: odHP.some(t => t.data.priority === 'Critical') ? 'critical' : 'high', title: odHP.length + ' overdue Critical/High task' + (odHP.length > 1 ? 's' : ''), why: 'Important work is past its ETA or due date.', action: 'Agree new dates or remove blockers with the owners.', owner: owners(odHP), since: odHP.map(lateDate).sort()[0], ev: odHP.slice(0, 6).map(tLink), n: odHP.length });
  if (odOther.length) add({ code: 'task_overdue', cat: 'Tasks', kind: 'issue', sev: 'medium', title: odOther.length + ' other overdue task' + (odOther.length > 1 ? 's' : ''), why: 'Work is past its ETA or due date.', action: 'Ask owners to update the dates or close what is done.', owner: owners(odOther), since: odOther.map(lateDate).sort()[0], ev: odOther.slice(0, 6).map(tLink), n: odOther.length });
  const blockedT = open.filter(t => t.data.status === 'Blocked' || String(t.data.blocker || '').trim()); const blockedA = act.filter(a => a.data.status === 'Blocked');
  const bAge = t => days(dayOf(t.updatedAt || t.createdAt) || today, today);
  const critB = blockedT.filter(t => HP.includes(t.data.priority) || bAge(t) >= RULES.blockerLongDays);
  if (blockedT.length || blockedA.length) add({ code: 'blocker', cat: 'Blockers', kind: 'issue', sev: critB.length || blockedT.length + blockedA.length >= 3 ? 'critical' : 'high', critical: critB.length > 0 || blockedT.length + blockedA.length >= 3, title: (blockedT.length + blockedA.length) + ' open blocker' + (blockedT.length + blockedA.length > 1 ? 's' : '') + (critB.length ? ' (' + critB.length + ' on important or long-standing work)' : ''), why: 'Work cannot progress until these are cleared.', action: 'Find who can clear each blocker and escalate the ones older than ' + RULES.blockerLongDays + ' days.', owner: owners(blockedT), since: blockedT.map(t => dayOf(t.updatedAt)).concat(blockedA.map(a => dayOf(a.updatedAt))).filter(Boolean).sort()[0], ev: blockedT.slice(0, 5).map(t => Object.assign(tLink(t), { label: tLink(t).label + (t.data.blocker ? ' — ' + String(t.data.blocker).slice(0, 60) : '') })).concat(blockedA.slice(0, 3).map(a => ({ label: 'Action: ' + String(a.data.text || '').slice(0, 80), view: 'governance', x: { govTab: 'actions' } }))), n: blockedT.length + blockedA.length });
  const unassigned = open.filter(t => HP.includes(t.data.priority) && !t.data.owner);
  if (unassigned.length) add({ code: 'unassigned', cat: 'Ownership', kind: 'issue', sev: 'high', title: unassigned.length + ' Critical/High task' + (unassigned.length > 1 ? 's have' : ' has') + ' no owner', why: 'Nobody is accountable for important work.', action: 'Assign an owner to each.', since: unassigned.map(t => dayOf(t.createdAt)).sort()[0], ev: unassigned.slice(0, 6).map(tLink), n: unassigned.length });
  // ---- customer ----
  const qOpen = T.filter(t => t.data.question && !['Answered', 'Closed'].includes(t.data.question.status) && !TASK_CLOSED.includes(t.data.status));
  const qAge = t => days(dayOf(t.createdAt) || today, today); const qLong = qOpen.filter(t => qAge(t) >= RULES.questionDays);
  const qCust = qLong.filter(t => t.data.question.status === 'Awaiting Customer' || t.data.status === 'Awaiting Customer'), qInt = qLong.filter(t => !qCust.includes(t));
  if (qInt.length) add({ code: 'q_internal', cat: 'Customer', kind: 'issue', sev: qInt.some(t => qAge(t) >= RULES.questionLongDays) ? 'high' : 'medium', title: qInt.length + ' customer question' + (qInt.length > 1 ? 's' : '') + ' waiting for our answer for ' + RULES.questionDays + '+ days', why: 'The customer is waiting on Facilio.', action: 'Assign a response owner and a response date to each.', owner: owners(qInt), since: qInt.map(t => dayOf(t.createdAt)).sort()[0], ev: qInt.slice(0, 6).map(t => Object.assign(tLink(t), { label: tLink(t).label + ' · ' + qAge(t) + ' days' })), n: qInt.length });
  if (qCust.length) add({ code: 'q_customer', cat: 'Customer', kind: 'issue', sev: 'medium', title: qCust.length + ' question' + (qCust.length > 1 ? 's' : '') + ' waiting for the customer for ' + RULES.questionDays + '+ days', why: 'Delivery may be waiting on customer answers.', action: 'Follow up with the customer; raise it in the next status meeting.', since: qCust.map(t => dayOf(t.createdAt)).sort()[0], ev: qCust.slice(0, 6).map(tLink), n: qCust.length });
  const custLate = open.filter(t => t.data.type === 'Customer Action Required' && lateDate(t)).map(tLink).concat(act.filter(a => a.data.side === 'customer' && a.data.status !== 'Done' && D(a.data.due) && a.data.due < today).map(a => ({ label: 'Action: ' + String(a.data.text || '').slice(0, 80) + ' · due ' + a.data.due, view: 'governance', x: { govTab: 'actions' } })));
  if (custLate.length) add({ code: 'customer_late', cat: 'Customer', kind: 'issue', sev: 'high', title: custLate.length + ' customer action' + (custLate.length > 1 ? 's' : '') + ' past the expected date', why: 'Customer inputs the plan depends on are late.', action: 'Escalate through the customer project manager with the impact on the plan.', ev: custLate.slice(0, 6), n: custLate.length });
  const decP = dec.filter(d => d.data.status === 'Proposed' && days(dayOf(d.createdAt) || today, today) >= RULES.decisionDays);
  if (decP.length) add({ code: 'decision_pending', cat: 'Customer', kind: 'issue', sev: 'medium', title: decP.length + ' decision' + (decP.length > 1 ? 's' : '') + ' proposed but not agreed for ' + RULES.decisionDays + '+ days', why: 'Delivery choices are not confirmed.', action: 'Get each decision agreed or rejected in the next governance meeting.', since: decP.map(d => dayOf(d.createdAt)).sort()[0], ev: decP.slice(0, 6).map(d => ({ label: 'Decision: ' + String(d.data.title || d.data.text || d.id).slice(0, 80), view: 'governance', x: { govTab: 'decisions' } })), n: decP.length });
  const soReq = so.filter(s => s.data.status === 'requested'), soCon = so.filter(s => s.data.status === 'concern');
  if (soCon.length) add({ code: 'signoff_concern', cat: 'Customer', kind: 'issue', sev: 'high', title: 'The customer raised a concern on ' + soCon.map(s => s.data.title || s.id).join(', '), why: 'A sign-off is disputed.', action: 'Review the concern with the customer and agree what changes before re-requesting.', ev: soCon.map(s => ({ label: (s.data.title || s.id) + ' sign-off', view: 'governance', x: { govTab: 'signoffs' } })) });
  // ---- scope ----
  const crW = cr.filter(c => ['Requested', 'Draft', 'Proposed'].includes(c.data.status) && days(dayOf(c.createdAt) || today, today) >= RULES.crDays);
  if (crW.length) add({ code: 'cr_waiting', cat: 'Scope', kind: 'issue', sev: 'medium', title: crW.length + ' change request' + (crW.length > 1 ? 's' : '') + ' awaiting assessment or approval for ' + RULES.crDays + '+ days', why: 'Scope changes are not settled.', action: 'Complete the impact assessment and get a decision.', since: crW.map(c => dayOf(c.createdAt)).sort()[0], ev: crW.slice(0, 6).map(c => ({ label: 'CR-' + (c.data.n || '?') + ' ' + String(c.data.title || '').slice(0, 70) + ' · ' + c.data.status, view: 'changes' })), n: crW.length });
  // ---- RAID and hypercare ----
  const rHigh = raid.filter(x => x.data.impact === 'High' && x.data.status !== 'Closed' && ['R', 'I'].includes(x.data.type));
  const rIss = rHigh.filter(x => x.data.type === 'I'), rRisk = rHigh.filter(x => x.data.type === 'R');
  if (rIss.length) add({ code: 'raid_issue', cat: 'RAID', kind: 'issue', sev: 'high', title: rIss.length + ' open high-impact issue' + (rIss.length > 1 ? 's' : '') + ' in the RAID log', why: 'Recorded issues with high impact are open.', action: 'Confirm owners and mitigation dates for each.', ev: rIss.slice(0, 6).map(x => ({ label: 'Issue: ' + String(x.data.title || '').slice(0, 80) + ' · ' + x.data.status, view: 'governance', x: { govTab: 'raid' } })), n: rIss.length });
  if (rRisk.length) add({ code: 'raid_risk', cat: 'RAID', kind: 'risk', sev: 'high', title: rRisk.length + ' open high-impact risk' + (rRisk.length > 1 ? 's' : '') + ' in the RAID log', why: 'Recorded risks could affect delivery.', action: 'Check each mitigation is in progress.', ev: rRisk.slice(0, 6).map(x => ({ label: 'Risk: ' + String(x.data.title || '').slice(0, 80) + ' · ' + x.data.status, view: 'governance', x: { govTab: 'raid' } })), n: rRisk.length });
  const hcC = hc.filter(h => ['Critical', 'High'].includes(h.data.severity) && h.data.status === 'Open');
  if (hcC.length) add({ code: 'hypercare', cat: 'Quality', kind: 'issue', sev: hcC.some(h => h.data.severity === 'Critical') ? 'critical' : 'high', title: hcC.length + ' open Critical/High hypercare issue' + (hcC.length > 1 ? 's' : ''), why: 'Live users are affected.', action: 'Confirm a fix or workaround and a date for each.', ev: hcC.slice(0, 6).map(h => ({ label: String(h.data.title || h.data.summary || h.id).slice(0, 80) + ' · ' + h.data.severity, view: 'hypercare' })), n: hcC.length });
  // ---- documents ----
  const brdDue = (() => { const rows = (r.plan && r.plan.rows || []).filter(x => x && !x.isPhase && stepOfRow((x.title || '') + ' ' + (x.phase || '')) === 2 && D(x.end)); return rows.map(x => x.end).sort().pop() || ''; })();
  const brdApproved = (r.brd && r.brd.status === 'approved') || signed('brd');
  if (brdDue && brdDue < today && !brdApproved) add({ code: 'brd_late', cat: 'Documents', kind: 'issue', sev: 'high', title: 'BRD sign-off was planned for ' + brdDue + ' and is not recorded', why: 'Build should not run ahead of approved requirements.', action: 'Check what blocks BRD approval and agree a sign-off date.', since: brdDue, ev: [{ label: 'BRD Draft', view: 'brd' }, { label: 'BRD Sign-Off', view: 'governance', x: { govTab: 'signoffs' } }] });
  const gen = ai.filter(a => Array.isArray(a.data.missingParts) && a.data.missingParts.length && a.data.status === 'draft');
  if (gen.length) add({ code: 'doc_incomplete', cat: 'Documents', kind: 'issue', sev: 'medium', title: gen.length + ' AI draft' + (gen.length > 1 ? 's have' : ' has') + ' sections that were not written', why: 'Generated documents are incomplete.', action: 'Regenerate the missing sections or write them before review.', ev: gen.slice(0, 6).map(a => ({ label: (a.data.title || a.data.task) + ' · missing ' + a.data.missingParts.length + ' section(s)', view: 'aiwork' })), n: gen.length });
  // ---- activity ----
  const lastAt = [p.updatedAt].concat(items.map(i => i.updatedAt), (r.au || []).map(e => e.at)).filter(Boolean).sort().pop() || p.createdAt || '';
  const idle = lastAt ? days(dayOf(lastAt), today) : 0;
  if (idle >= RULES.idleDays) add({ code: 'idle', cat: 'Activity', kind: 'risk', sev: 'medium', title: 'No recorded activity for ' + idle + ' days', why: 'Delivery may have stalled (or work is happening outside Delivery Studio).', action: 'Check in with the project owner.', since: dayOf(lastAt), ev: [{ label: 'Activity log', view: 'settings', x: { setTab: 'audit' } }] });

  sig.forEach(s => { s.project = p.id; s.updated = s.updated || today; s.id = p.id + ':' + s.code; });
  sig.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || (a.kind === b.kind ? 0 : a.kind === 'issue' ? -1 : 1));
  // ---- health ----
  const manual = MANUAL.includes(p.deliveryStatus) ? p.deliveryStatus : 'active';
  const has = c => sig.some(s => s.code === c); const odHPn = odHP.length;
  const evidenceBase = pl.dated > 0 || T.length > 0 || act.length > 0 || raid.length > 0;
  let health, why = [];
  if (manual !== 'active') { health = manual; why = ['Set by ' + (p.deliveryStatusBy || 'a project owner') + (p.deliveryStatusAt ? ' on ' + dayOf(p.deliveryStatusAt) : '')]; }
  else if (sig.some(s => s.code === 'blocker' && s.critical)) { health = 'blocked'; why = sig.filter(s => s.code === 'blocker').map(s => s.title); }
  else if (has('milestone_late') || has('end_passed') || odHPn >= 3) { health = 'overdue'; why = sig.filter(s => ['milestone_late', 'end_passed', 'task_overdue_hp'].includes(s.code)).map(s => s.title); }
  else if (sig.some(s => s.sev === 'critical' || s.sev === 'high') || sig.filter(s => s.sev === 'medium').length >= 2) { health = 'at_risk'; why = sig.slice(0, 4).map(s => s.title); }
  else if (!evidenceBase) { health = 'insufficient'; why = ['No dated plan, tasks, actions or RAID items to judge by']; }
  else { health = 'on_track'; why = sig.length ? ['Only minor signals: ' + sig.map(s => s.title).join('; ')] : ['No warning found in the plan, tasks, actions, RAID, decisions, change requests or sign-offs']; }

  // ---- metrics for the portfolio table ----
  const custWait = qOpen.filter(t => t.data.question.status === 'Awaiting Customer' || t.data.status === 'Awaiting Customer').length + soReq.length + decP.length + open.filter(t => t.data.type === 'Customer Action Required').length;
  const deadlines = [pl.next && pl.next.start, pl.goLive, end].filter(x => x && x >= today).sort();
  const m = { roadmapStage: pl.cur >= 0 ? STAGE_OF_STEP[pl.cur] : 0, roadmapTitle: pl.cur >= 0 ? ROADMAP[STAGE_OF_STEP[pl.cur]] : '', stage: pl.cur >= 0 ? pl.cur + 1 : 0, stageTitle: pl.curTitle || (live ? 'Live' : ''), stageForced: pl.forced, planRows: pl.rows, planStatusRows: pl.withStatus,
    openTasks: open.length, overdueTasks: open.filter(lateDate).length, blockers: blockedT.length + blockedA.length, custWaiting: custWait, questionsOpen: qOpen.length,
    nextMilestone: pl.next ? { title: pl.next.title, date: pl.next.start } : null, goLive: pl.goLive || '', endDate: end || '', target: pl.goLive || end || '', targetKind: pl.goLive ? 'go-live (plan)' : end ? 'end date (settings)' : '',
    deadlineSoon: !!(deadlines[0] && days(today, deadlines[0]) <= RULES.deadlineDays), nextDeadline: deadlines[0] || '', lastActivity: lastAt, idleDays: idle, live,
    crOpen: cr.filter(c => ['Requested', 'Draft', 'Proposed'].includes(c.data.status)).length, raidHigh: rHigh.length, money: moneyOf(items, pl, today, p) };
  return { health, why, manual, signals: sig, metrics: m };
}

/* documentation readiness from the real document lifecycle (no hard-coded counts) */
export function docsOf(r, today) {
  const items = r.items || []; const of = k => items.filter(i => i.kind === k && i.data);
  const sess = Array.isArray(r.planner && r.planner.sessions) ? r.planner.sessions.filter(x => x && x.status !== 'cancelled') : [];
  const reqs = Array.isArray(r.workshop && r.workshop.requirements) ? r.workshop.requirements : [];
  const ai = of('ai'); const latest = task => ai.filter(a => a.data.task === task).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  const st = a => (a ? (a.data.status === 'approved' ? 'approved' : a.data.missingParts && a.data.missingParts.length ? 'incomplete' : 'draft') : 'none');
  const ug = of('ugd'); const so = of('signoff'); const signed = k => so.some(s => (s.id === k || s.data.kind === k) && s.data.status === 'signed');
  const T = of('task');
  return { workshops: { done: sess.filter(x => x.date && x.date < today).length, total: sess.length },
    requirements: { confirmed: reqs.filter(x => x && x.status === 'Confirmed').length, total: reqs.length, draft: reqs.filter(x => x && (!x.status || x.status === 'Draft')).length },
    brd: { status: (r.brd && r.brd.status) || (reqs.length ? 'draft' : 'none'), signed: signed('brd'), exports: Array.isArray(r.brd && r.brd.exports) ? r.brd.exports.length : 0 },
    cr: { awaiting: of('cr').filter(c => ['Requested', 'Draft', 'Proposed'].includes(c.data.status)).length, total: of('cr').length },
    ftr: { draft: st(latest('ftr')), workbook: !!(r.ftr && (Array.isArray(r.ftr.versions) ? r.ftr.versions.length : r.ftr.fileId)) },
    guide: { approved: ug.filter(g => g.data.status === 'approved').length, total: ug.length },
    uat: { plan: st(latest('uat')), sessions: of('uat').length, signed: signed('uat'), openTasks: T.filter(t => t.data.type === 'UAT Task' && !TASK_CLOSED.includes(t.data.status)).length },
    incomplete: ai.filter(a => a.data.status === 'draft' && a.data.missingParts && a.data.missingParts.length).length };
}

/* workload across the projects an admin can see: open, overdue, Critical/High and in-review tasks per owner; unassigned per project;
   concentration (one person holding most of a project's open Critical/High work) */
export function workload(rows, today) {
  const by = {}; const unassigned = []; const conc = [];
  rows.forEach(r => { const open = (r.items || []).filter(i => i.kind === 'task' && i.data && !TASK_CLOSED.includes(i.data.status)); const late = t => [D(t.data.due), D(t.data.eta)].some(x => x && x < today);
    open.forEach(t => { const o = t.data.owner || ''; if (!o) return; const w = by[o] = by[o] || { owner: o, open: 0, overdue: 0, high: 0, review: 0, projects: new Set() }; w.open++; if (late(t)) w.overdue++; if (HP.includes(t.data.priority)) w.high++; if (t.data.status === 'In Review') w.review++; w.projects.add(r.p.id); });
    const un = open.filter(t => !t.data.owner); if (un.length) unassigned.push({ project: r.p.id, name: r.p.name, n: un.length, high: un.filter(t => HP.includes(t.data.priority)).length });
    const hp = open.filter(t => HP.includes(t.data.priority) && t.data.owner); if (hp.length >= RULES.concentrationMin) { const c = {}; hp.forEach(t => { c[t.data.owner] = (c[t.data.owner] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (top[1] / hp.length >= RULES.concentration) conc.push({ project: r.p.id, name: r.p.name, owner: top[0], n: top[1], of: hp.length }); } });
  return { owners: Object.values(by).map(w => Object.assign(w, { projects: w.projects.size })).sort((a, b) => b.overdue - a.overdue || b.high - a.high || b.open - a.open), unassigned: unassigned.sort((a, b) => b.high - a.high || b.n - a.n), concentration: conc };
}
