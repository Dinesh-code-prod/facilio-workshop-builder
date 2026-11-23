/* Missed steps (user, 23 Nov 2026; tests: tests/missed.mjs): work the project gave an owner and a due date that is past due and not finished.
   Pure: no database, no sending. The daily sweep in api.mjs tells the person responsible (notify type missed_step: one notice per item, a reminder every REMIND days
   while it stays open, marked Completed when the item is done), and the connector tool missed_steps and PROJECT_INDEX.md read the same list.
   Only records with a due date count: that is what the project's own workflow asked for, so nothing is invented. Work whose owner is not on the team
   (a customer, or nobody) goes to the project owners, who chase it. */
import { dueWords, taskButtons } from './_msgfmt.mjs';
export const REMIND = 2;
/** a plan row the team must hear about: a milestone, or a deliverable (a sign-off, the BRD, UAT, go-live, handover, a guide or training) */
export const DELIVERABLE = /sign-?off|\bbrd\b|\buat\b|\bftr\b|go-?live|hand-?over|deliver|guide|training|acceptance/i;
const planRow = d => !d.isPhase && (d.ms === true || DELIVERABLE.test(String(d.title || '')));
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const one = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 160);
export const MISSED_KINDS = {
  task: { label: 'Task', pre: 'T-', title: d => d.title, owner: d => d.owner, due: d => [d.due, d.eta].map(x => String(x || '').slice(0, 10)).filter(x => DAY.test(x)).sort()[0], done: /^(done|closed|resolved|cancelled|canceled|complete|completed|answered)$/i, go: id => ({ view: 'taskpage', x: { tkPageId: id } }), what: 'Finish it, or set a new due date and say why' },
  action: { label: 'Action', title: d => d.text || d.title, owner: d => d.owner, due: d => d.due, done: /^(done|closed|cancelled)$/i, go: id => ({ view: 'governance', x: { govTab: 'actions', focus: id } }), what: 'Close the action or agree a new date' },
  raid: { label: 'Risk or issue', title: d => d.title, owner: d => d.owner, due: d => d.due, done: /^(closed|resolved|mitigated|accepted)$/i, go: id => ({ view: 'governance', x: { govTab: 'raid', focus: id } }), what: 'Mitigate it, close it or give it a new date' },
  cr: { label: 'Change request', pre: 'CR-', title: d => d.title || d.summary, owner: d => d.owner, due: d => d.due, done: /converted|rejected|closed|implemented|cancel|withdrawn/i, go: id => ({ view: 'changes', x: { focus: id } }), what: 'Decide the change request or move its date' },
  plan: { label: 'Milestone', title: d => d.title, owner: d => d.owner, due: d => [d.end, d.start].find(x => DAY.test(String(x || ''))), done: /^(done|complete|completed|closed|cancelled)$/i, skip: d => !planRow(d) || Number(d.pct) >= 100, owners: true, urgent: true, go: id => ({ view: 'planner', x: { focus: id } }), what: 'Finish it, or move it in the plan with the team and say why' },
  tkt: { label: 'Ticket', pre: 'TKT-', title: d => d.subject, owner: d => d.assignee || d.owner, due: d => d.due, done: /^(resolved|closed|cancelled)$/i, go: id => ({ view: 'tickets', x: { focus: id } }), what: 'Resolve the ticket or update the customer' }
};
export const keyOf = (pid, kind, id) => 'ms|' + pid + '|' + kind + '|' + id;
const daysLate = (due, today) => Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 864e5);
/** the team member an owner field names (an e-mail, a full name or the part before @), or null */
export function ownerOf(text, team) {
  const t = String(text || '').trim().toLowerCase(); if (!t) return null;
  return (team || []).find(m => { const e = String(m.email || '').toLowerCase(); return e === t || e.split('@')[0] === t || String(m.name || '').trim().toLowerCase() === t; }) || null;
}
/** is this one record a missed step today? (used when a record is saved, to mark its notice Completed at once) */
export function isMissed(kind, data, today) {
  const K = MISSED_KINDS[kind], d = data || {}; if (!K || d.superseded === true || K.done.test(String(d.status || '').trim()) || (K.skip && K.skip(d))) return false;
  const due = String(K.due(d) || '').slice(0, 10); return DAY.test(due) && due < today;
}
/** byKind: { task: [{ id, data }], action: [...], ... } of one project; oldest due date first */
export function missedSteps(byKind, project, today) {
  const team = ((project && project.members) || []).filter(m => m.role !== 'customer' && m.email);
  const owners = team.filter(m => m.role === 'owner').map(m => String(m.email).toLowerCase()); const out = [];
  for (const [kind, K] of Object.entries(MISSED_KINDS)) for (const r of (byKind && byKind[kind]) || []) {
    const d = (r && r.data) || {}; if (!r || !r.id || !isMissed(kind, d, today)) continue;
    const due = String(K.due(d)).slice(0, 10); const ownerText = one(K.owner(d)); const m = ownerOf(ownerText, team);
    const to = [...new Set((m ? [String(m.email).toLowerCase()] : []).concat(!m || K.owners ? owners : []))]; if (!to.length) continue; const g = K.go(r.id);
    out.push({ kind, id: r.id, ref: d.n && K.pre ? K.pre + d.n : '', label: K.label, title: one(K.title(d)) || K.label, due, daysLate: daysLate(due, today), status: one(d.status),
      ownerText: m ? (m.name || m.email) : ownerText ? ownerText + (/^(both|facilio|customer|client)$/i.test(ownerText) ? '' : ' (not on the team)') : 'No owner', assigned: !!m, ownerEmail: m ? String(m.email).toLowerCase() : '', n: d.n, to, view: g.view, x: g.x, what: K.what, key: keyOf(project.id, kind, r.id) });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}
/** the notify() event of one missed step: heading = what and how late, one line = owner and due date, the "what to do" once; a task gets Done and new-date buttons
    (they only work for its owner). An overdue item is sent to Teams again on its first reminder (teamsRemind); an overdue milestone skips the daily count (urgent). */
export function missedEvent(m, project, today) {
  const late = m.daysLate + ' day' + (m.daysLate === 1 ? '' : 's') + ' late'; const K = MISSED_KINDS[m.kind] || {}; const t = today || new Date().toISOString().slice(0, 10);
  return { type: 'missed_step', project, to: m.to, actor: '', cat: m.kind === 'plan' ? 'MILESTONE' : 'OVERDUE', title: m.label + ' ' + (m.ref ? m.ref + ' ' : '') + '\u201c' + m.title + '\u201d is ' + late,
    text: 'Owner: ' + m.ownerText + ' \u00b7 ' + dueWords(m.due, t) + (m.status ? ' \u00b7 ' + m.status : ''), detail: m.assigned || m.kind === 'plan' ? '' : 'The owner is not on the project team, so the project owners are told.',
    todo: m.what + '.', due: m.due, view: m.view, x: m.x, ref: { kind: m.kind, id: m.id }, owner: m.ownerText, key: m.key, remind: REMIND, teamsRemind: true, urgent: !!K.urgent,
    buttons: m.kind === 'task' && m.assigned ? taskButtons({ project: project.id, id: m.id, n: m.n, title: m.title }, t) : [], facts: [{ title: 'Owner', value: m.ownerText }, { title: 'Days late', value: String(m.daysLate) }] };
}
/** the project owners' list of work that is 5 or more days late (one message per project; the key changes when the list changes, and repeats at most every 3 days) */
export const ESCALATE_DAYS = 5;
export function escalationEvent(list, project, today) {
  const late = (list || []).filter(m => m.daysLate >= ESCALATE_DAYS).sort((a, b) => b.daysLate - a.daysLate); if (!late.length) return null;
  const owners = ((project && project.members) || []).filter(m => m.role === 'owner' && m.email).map(m => String(m.email).toLowerCase()); if (!owners.length) return null;
  const bucket = Math.floor(Date.parse(today + 'T00:00:00Z') / (3 * 864e5));
  return { type: 'escalation', project, to: owners, actor: '', cat: 'LATE WORK', title: late.length + ' item' + (late.length === 1 ? ' is' : 's are') + ' ' + ESCALATE_DAYS + ' or more days late',
    text: late.slice(0, 3).map(m => (m.ref || m.label) + ' ' + m.title + ' (' + m.daysLate + ' days)').join('; '), intro: ['The owners were told and reminded; it is still not done.'], sections: [{ head: 'Late ' + ESCALATE_DAYS + '+ days', total: late.length, items: late.slice(0, 5).map(m => m.label + ' ' + (m.ref ? m.ref + ' ' : '') + '\u201c' + m.title + '\u201d \u00b7 ' + m.ownerText + ' \u00b7 ' + m.daysLate + ' days late') }],
    view: 'tasks', key: 'esc|' + project.id + '|' + late.map(m => m.key).sort().join(',').slice(0, 400) + '|' + bucket, facts: [{ title: 'Late items', value: String(late.length) }, { title: 'Oldest', value: late[0].daysLate + ' days late' }] };
}
/** plan milestones and deliverables due in the next `days` days and not done: one milestone_due event each, to the named team member (if the owner is one) and the project owners */
export function milestoneEvents(rows, project, today, days = 2) {
  const K = MISSED_KINDS.plan, team = ((project && project.members) || []).filter(m => m.role !== 'customer' && m.email), owners = team.filter(m => m.role === 'owner').map(m => String(m.email).toLowerCase());
  const end = new Date(Date.parse(today + 'T00:00:00Z') + days * 864e5).toISOString().slice(0, 10); const out = [];
  for (const d of Array.isArray(rows) ? rows : []) {
    if (!d || !d.id || K.skip(d) || K.done.test(String(d.status || '').trim())) continue; const due = String(K.due(d) || ''); if (!due || due < today || due > end) continue;
    const m = ownerOf(d.owner, team); const to = [...new Set((m ? [String(m.email).toLowerCase()] : []).concat(owners))]; if (!to.length) continue; const who = m ? (m.name || m.email) : one(d.owner) || 'No owner';
    out.push({ type: 'milestone_due', project, to, actor: '', cat: 'MILESTONE', title: (d.ms ? 'Milestone' : 'Deliverable') + ' “' + one(d.title) + '” — ' + dueWords(due, today), text: 'Owner: ' + who + ' · ' + (Number(d.pct) ? Number(d.pct) + '% done' : one(d.status) || 'Not started'),
      due, view: 'planner', x: { focus: String(d.id).slice(0, 80) }, key: 'md|' + project.id + '|' + d.id + '|' + due, facts: [{ title: 'Owner', value: who }] });
  }
  return out;
}
