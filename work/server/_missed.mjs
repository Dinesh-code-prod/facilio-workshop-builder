/* Missed steps (user, 23 Nov 2026; tests: tests/missed.mjs): work the project gave an owner and a due date that is past due and not finished.
   Pure: no database, no sending. The daily sweep in api.mjs tells the person responsible (notify type missed_step: one notice per item, a reminder every REMIND days
   while it stays open, marked Completed when the item is done), and the connector tool missed_steps and PROJECT_INDEX.md read the same list.
   Only records with a due date count: that is what the project's own workflow asked for, so nothing is invented. Work whose owner is not on the team
   (a customer, or nobody) goes to the project owners, who chase it. */
export const REMIND = 2;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const one = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 160);
export const MISSED_KINDS = {
  task: { label: 'Task', pre: 'T-', title: d => d.title, owner: d => d.owner, due: d => [d.due, d.eta].map(x => String(x || '').slice(0, 10)).filter(x => DAY.test(x)).sort()[0], done: /^(done|closed|resolved|cancelled|canceled|complete|completed|answered)$/i, go: id => ({ view: 'taskpage', x: { tkPageId: id } }), what: 'Finish it, or set a new due date and say why' },
  action: { label: 'Action', title: d => d.text || d.title, owner: d => d.owner, due: d => d.due, done: /^(done|closed|cancelled)$/i, go: id => ({ view: 'governance', x: { govTab: 'actions', focus: id } }), what: 'Close the action or agree a new date' },
  raid: { label: 'Risk or issue', title: d => d.title, owner: d => d.owner, due: d => d.due, done: /^(closed|resolved|mitigated|accepted)$/i, go: id => ({ view: 'governance', x: { govTab: 'raid', focus: id } }), what: 'Mitigate it, close it or give it a new date' },
  cr: { label: 'Change request', pre: 'CR-', title: d => d.title || d.summary, owner: d => d.owner, due: d => d.due, done: /converted|rejected|closed|implemented|cancel|withdrawn/i, go: id => ({ view: 'changes', x: { focus: id } }), what: 'Decide the change request or move its date' },
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
  const K = MISSED_KINDS[kind], d = data || {}; if (!K || d.superseded === true || K.done.test(String(d.status || '').trim())) return false;
  const due = String(K.due(d) || '').slice(0, 10); return DAY.test(due) && due < today;
}
/** byKind: { task: [{ id, data }], action: [...], ... } of one project; oldest due date first */
export function missedSteps(byKind, project, today) {
  const team = ((project && project.members) || []).filter(m => m.role !== 'customer' && m.email);
  const owners = team.filter(m => m.role === 'owner').map(m => String(m.email).toLowerCase()); const out = [];
  for (const [kind, K] of Object.entries(MISSED_KINDS)) for (const r of (byKind && byKind[kind]) || []) {
    const d = (r && r.data) || {}; if (!r || !r.id || !isMissed(kind, d, today)) continue;
    const due = String(K.due(d)).slice(0, 10); const ownerText = one(K.owner(d)); const m = ownerOf(ownerText, team);
    const to = m ? [String(m.email).toLowerCase()] : owners; if (!to.length) continue; const g = K.go(r.id);
    out.push({ kind, id: r.id, ref: d.n && K.pre ? K.pre + d.n : '', label: K.label, title: one(K.title(d)) || K.label, due, daysLate: daysLate(due, today), status: one(d.status),
      ownerText: m ? (m.name || m.email) : ownerText ? ownerText + ' (not on the team)' : 'No owner', assigned: !!m, to, view: g.view, x: g.x, what: K.what, key: keyOf(project.id, kind, r.id) });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}
/** the notify() event of one missed step */
export function missedEvent(m, project) {
  const late = m.daysLate + ' day' + (m.daysLate === 1 ? '' : 's') + ' late';
  return { type: 'missed_step', project, to: m.to, actor: '', cat: 'MISSED', title: 'Overdue ' + m.label.toLowerCase() + ': ' + (m.ref ? m.ref + ' ' : '') + m.title,
    text: 'Owner: ' + m.ownerText + ' · due ' + m.due + ' (' + late + '). ' + m.what + '.', detail: (m.assigned ? '' : 'The owner is not a member of the project team, so the project owners are told. ') + m.what + '.',
    due: m.due, view: m.view, x: m.x, ref: { kind: m.kind, id: m.id }, owner: m.ownerText, key: m.key, remind: REMIND, facts: [{ title: 'Owner', value: m.ownerText }, { title: 'Due', value: m.due }] };
}
