/* Task reminders: the pure rules (no database, no Teams call), run by tests/task_watch.mjs and used by work/server/api.mjs.
   Who has what pending, the Teams direct message, the once-a-day guard key and the assignment notice.
   Nothing here sends anything; the server decides whether Teams notices are on and reports what Teams really returned. */
import { createHash } from 'node:crypto';
const DONE = /^(done|closed|resolved|cancelled|mitigated|accepted|approved|passed|complete|completed)$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const BASE_URL = 'https://facilio-delivery-studio.facilio.work/';

/** the earliest valid date of a task: its due date or its ETA */
export const dueOf = d => [d && d.due, d && d.eta].filter(x => DAY.test(x || '')).sort()[0] || '';
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

/** Pending tasks of one person. projects = [{ id, name, tasks: [{ id, data }] }]; the person is matched by e-mail (an owner is always a project member's e-mail). */
export function pendingFor(email, projects, today, soonDays = 3) {
  const me = String(email || '').trim().toLowerCase(); const soonEnd = addDays(today, soonDays); const items = [];
  if (!me) return { counts: { open: 0, overdue: 0, soon: 0, blocked: 0 }, items };
  for (const p of projects || []) for (const t of p.tasks || []) {
    const d = t.data || {}; if (d.superseded === true || DONE.test(String(d.status || '').trim())) continue;
    if (String(d.owner || '').trim().toLowerCase() !== me) continue;
    const due = dueOf(d);
    items.push({ project: p.id, projectName: p.name, id: t.id, n: d.n, title: oneLine(d.title, 160), status: d.status || '', priority: d.priority || '', due,
      overdue: !!(due && due < today), soon: !!(due && due >= today && due <= soonEnd), blocked: d.status === 'Blocked' || !!String(d.blocker || '').trim() });
  }
  items.sort((a, b) => (b.overdue - a.overdue) || (b.blocked - a.blocked) || String(a.due || '9999').localeCompare(String(b.due || '9999')) || (Number(a.n) || 0) - (Number(b.n) || 0));
  return { counts: { open: items.length, overdue: items.filter(x => x.overdue).length, soon: items.filter(x => x.soon).length, blocked: items.filter(x => x.blocked).length }, items };
}

/** The Teams message for a digest; null when there is nothing pending (no empty DMs). */
export function digestMessage(pending, today, { maxLines = 8 } = {}) {
  const c = pending.counts; if (!c.open) return null; const projects = [...new Set(pending.items.map(x => x.project))];
  const lines = pending.items.slice(0, maxLines).map(x => '• ' + (x.n ? 'T-' + x.n + ' ' : '') + x.title + ' (' + x.projectName + ')' + (x.due ? ' · due ' + x.due : '') + (x.overdue ? ' · OVERDUE' : x.blocked ? ' · blocked' : ''));
  if (pending.items.length > maxLines) lines.push('… and ' + (pending.items.length - maxLines) + ' more');
  return { title: 'Your pending tasks · ' + c.open + ' open' + (c.overdue ? ', ' + c.overdue + ' overdue' : ''), text: lines.join('\n'),
    facts: [{ title: 'Open', value: String(c.open) }, { title: 'Overdue', value: String(c.overdue) }, { title: 'Due in 3 days', value: String(c.soon) }, { title: 'Blocked', value: String(c.blocked) }],
    actions: [{ title: 'Open Delivery Studio', url: projects.length === 1 ? BASE_URL + '#/p/' + projects[0] + '/tasks' : BASE_URL }].concat(pending.items.filter(x => (x.overdue || x.soon) && x.id).slice(0, 3).map(x => ({ title: 'Done: ' + (x.n ? 'T-' + x.n : oneLine(x.title, 20)), fn: 'api', data: { tool: 'task_reply', project: x.project, taskId: x.id, status: 'Done', text: 'Marked done by the owner from the Teams message.', via: 'teams' } }))) };
}

/** The key under which the server remembers a digest (scope = a project id, or 'all' for a person's own digest) or the assignment count of a person.
    Hashed, so two different addresses never share a key and the key is always valid; one record per key is overwritten each day, so nothing piles up. */
export const digestKey = (email, scope) => 'd' + createHash('sha256').update(String(email || '').trim().toLowerCase() + '|' + String(scope || 'all')).digest('hex').slice(0, 40);
export const assignKey = email => 'a' + createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex').slice(0, 40);
/** At most `max` assignment messages per person per day (a bulk owner change must not become a message per task). rec = what was stored, or null. */
export function assignGate(rec, today, max = 3) { const n = rec && rec.day === today ? Number(rec.n) || 0 : 0; return n >= max ? { allow: false, rec: { day: today, n } } : { allow: true, rec: { day: today, n: n + 1 } }; }
const oneLine = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** DM for a task that just got a new owner; null when nobody needs telling (no owner, same owner, done task, or the person assigned it to themselves). */
export function assignmentNotice(prev, next, actorEmail, projectName) {
  const to = String((next && next.owner) || '').trim().toLowerCase(); if (!to) return null;
  if (to === String((prev && prev.owner) || '').trim().toLowerCase()) return null;
  if (to === String(actorEmail || '').trim().toLowerCase()) return null;
  if (DONE.test(String(next.status || '').trim())) return null;
  const due = dueOf(next);
  return { to, title: 'Task assigned to you · ' + projectName, text: oneLine(next.title, 300),
    facts: [{ title: 'Project', value: projectName }, { title: 'Status', value: next.status || 'To Do' }, { title: 'Priority', value: next.priority || '—' }, { title: 'Due', value: due || '—' }] };
}
