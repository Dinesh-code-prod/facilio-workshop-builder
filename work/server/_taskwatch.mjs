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
    items.push({ project: p.id, projectName: p.name, id: t.id, n: d.n, title: oneLine(d.title, 160), status: d.status || '', priority: d.priority || '', due, stage: oneLine(d.stage, 40), type: oneLine(d.type, 40), desc: oneLine(d.desc, 300), blockerText: oneLine(d.blocker, 200), today: due === today,
      overdue: !!(due && due < today), soon: !!(due && due >= today && due <= soonEnd), blocked: d.status === 'Blocked' || !!String(d.blocker || '').trim() });
  }
  items.sort((a, b) => (b.overdue - a.overdue) || (b.blocked - a.blocked) || String(a.due || '9999').localeCompare(String(b.due || '9999')) || (Number(a.n) || 0) - (Number(b.n) || 0));
  return { counts: { open: items.length, dueToday: items.filter(x => x.today).length, overdue: items.filter(x => x.overdue).length, soon: items.filter(x => x.soon).length, blocked: items.filter(x => x.blocked).length }, items };
}

/** open, overdue and finished tasks of each project (everybody's), for the one-line team summary of a digest */
export function teamCounts(projects, today) { const out = {}; for (const p of projects || []) { const c = { open: 0, overdue: 0, done: 0 }; for (const k of p.tasks || []) { const d = k.data || {}; if (d.superseded === true) continue; if (DONE.test(String(d.status || '').trim())) { c.done++; continue; } c.open++; const due = dueOf(d); if (due && due < today) c.overdue++; } out[p.id] = c; } return out; }

/** The Teams message for a digest; null when there is nothing pending (no empty DMs). */
export function digestMessage(pending, today, { maxLines = 6, name = '', team = {} } = {}) {
  const c = pending.counts; if (!c.open) return null; const projects = [...new Set(pending.items.map(x => x.project))];
  const byP = projects.map(id => { const it = pending.items.filter(x => x.project === id); return { id, name: it[0].projectName, items: it }; });
  const when = x => (x.overdue ? 'OVERDUE since ' + x.due : x.today ? 'Due today' : x.due ? 'Due ' + x.due : 'No due date');
  const block = x => ['**' + (x.n ? 'T-' + x.n + ' \u00b7 ' : '') + short(x.title, 80) + '**', [when(x), x.status, x.priority ? x.priority + ' priority' : '', x.type !== 'Other' ? x.type : '', x.stage].filter(Boolean).join(' \u00b7 '), x.desc ? short(x.desc, 140) : '', x.blockerText ? 'Blocked: ' + short(x.blockerText, 120) : ''].filter(Boolean).join('\n');
  const SECTIONS = [['Overdue', x => x.overdue], ['Due today', x => x.today && !x.overdue], ['Blocked', x => x.blocked], ['Coming up in the next 3 days', x => x.soon], ['Other open tasks', () => true]];
  const tline = id => { const k = team[id]; return k ? 'Whole team on this project: ' + k.open + ' open, ' + k.overdue + ' overdue, ' + k.done + ' finished.' : ''; };
  let room = maxLines; const out = ['**' + (name ? 'Hi ' + name + ', here' : 'Here') + ' is what is open for you' + (byP.length === 1 ? ' in ' + byP[0].name : '') + '.**'];
  if (byP.length === 1 && tline(byP[0].id)) out.push(tline(byP[0].id));
  for (const g of byP) { if (byP.length > 1) { out.push('', '**' + g.name + '**'); if (tline(g.id)) out.push(tline(g.id)); } const used = new Set();
    for (const [title, test] of SECTIONS) { const it = g.items.filter(x => !used.has(x) && test(x)); if (!it.length) continue; it.forEach(x => used.add(x)); out.push('', '**' + title.toUpperCase() + ' (' + it.length + ')**'); for (const x of it) { if (room <= 0) break; room--; out.push('', block(x)); } } }
  const shown = maxLines - room; if (pending.items.length > shown) out.push('', '...and ' + (pending.items.length - shown) + ' more in Delivery Studio.');
  out.push('', 'Open Delivery Studio to update them. A Done button below marks that task finished.');
  const where = byP.length === 1 ? byP[0].name : byP.length + ' projects';
  return { title: 'TASKS \u00b7 ' + where + ' \u00b7 ' + c.open + ' open' + (c.overdue ? ', ' + c.overdue + ' overdue' : '') + (c.dueToday ? ', ' + c.dueToday + ' due today' : ''), text: out.join('\n'),
    facts: [{ title: 'Why you got this', value: 'Your morning list of tasks that are assigned to you' }, { title: 'Open', value: String(c.open) }, { title: 'Due today', value: String(c.dueToday || 0) }, { title: 'Overdue', value: String(c.overdue) }, { title: 'Blocked', value: String(c.blocked) }],
    actions: [{ title: 'Open Delivery Studio', url: projects.length === 1 ? BASE_URL + '#/p/' + projects[0] + '/tasks' : BASE_URL }].concat(pending.items.filter(x => (x.overdue || x.soon) && x.id).slice(0, 3).map(x => ({ title: 'Done: ' + (x.n ? 'T-' + x.n : oneLine(x.title, 20)), fn: 'api', data: { tool: 'task_reply', project: x.project, taskId: x.id, status: 'Done', text: 'Marked done by the owner from the Teams message.', via: 'teams' } }))) };
}

/** The key under which the server remembers a digest (scope = a project id, or 'all' for a person's own digest) or the assignment count of a person.
    Hashed, so two different addresses never share a key and the key is always valid; one record per key is overwritten each day, so nothing piles up. */
export const digestKey = (email, scope) => 'd' + createHash('sha256').update(String(email || '').trim().toLowerCase() + '|' + String(scope || 'all')).digest('hex').slice(0, 40);
export const assignKey = email => 'a' + createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex').slice(0, 40);
/** At most `max` assignment messages per person per day (a bulk owner change must not become a message per task). rec = what was stored, or null. */
export function assignGate(rec, today, max = 3) { const n = rec && rec.day === today ? Number(rec.n) || 0 : 0; return n >= max ? { allow: false, rec: { day: today, n } } : { allow: true, rec: { day: today, n: n + 1 } }; }
/** a task title cut at a word with an ellipsis, so a line never stops in the middle of a word */
const short = (v, n) => { const t = String(v || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n - 1); const i = c.lastIndexOf(' '); return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.\-]+$/, '') + '…'; };
const oneLine = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** DM for a task that just got a new owner; null when nobody needs telling (no owner, same owner, done task, or the person assigned it to themselves). */
export function assignmentNotice(prev, next, actorEmail, projectName, ref) {
  const to = String((next && next.owner) || '').trim().toLowerCase(); if (!to) return null;
  if (to === String((prev && prev.owner) || '').trim().toLowerCase()) return null;
  if (to === String(actorEmail || '').trim().toLowerCase()) return null;
  if (DONE.test(String(next.status || '').trim())) return null;
  const due = dueOf(next);
  return { to, title: 'TASK \u00b7 ' + projectName, text: ['**Assigned to you**', (next.n ? 'T-' + next.n + ' \u00b7 ' : '') + oneLine(next.title, 200), [due ? 'Due ' + due : 'No due date', next.status || 'To Do', next.priority ? next.priority + ' priority' : '', next.type !== 'Other' ? next.type : '', next.stage].filter(Boolean).join(' \u00b7 '), next.desc ? short(next.desc, 220) : '', next.blocker ? 'Blocked: ' + short(next.blocker, 140) : ''].filter(Boolean).join('\n'),
    facts: [{ title: 'Why you got this', value: 'Someone made you the owner of this task' }, { title: 'Assigned by', value: String(actorEmail || '').split('@')[0] || 'the team' }, { title: 'Project', value: projectName }, { title: 'Status', value: next.status || 'To Do' }, { title: 'Priority', value: next.priority || '—' }, { title: 'Due', value: due || '—' }],
    // the owner can finish it from the message: the button runs task_reply as the person who presses it, so only the owner can (the same button the daily digest has)
    done: ref && ref.project && ref.id ? { title: 'Done: ' + (next.n ? 'T-' + next.n : oneLine(next.title, 20)), fn: 'api', data: { tool: 'task_reply', project: ref.project, taskId: ref.id, status: 'Done', text: 'Marked done by the owner from the Teams message.', via: 'teams' } } : null };
}
