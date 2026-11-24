/* Task reminders: the pure rules (no database, no Teams call), run by tests/task_watch.mjs and used by work/server/api.mjs.
   Who has what pending, the Teams direct message, the once-a-day guard key and the assignment notice.
   Nothing here sends anything; the server decides whether Teams notices are on and reports what Teams really returned. */
import { createHash } from 'node:crypto';
import { dueWords, personOf, NEXT, card, taskButtons, MY_TASKS_BUTTON } from './_msgfmt.mjs';
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

/** The Teams message for a digest; null when there is nothing pending (no empty DMs). One message for all the person's projects: a section per project and kind
    (overdue, due today, blocked, coming up, other), the milestones due, at most maxLines tasks in all; buttons: Open, Done and My tasks. */
export function digestMessage(pending, today, { maxLines = 6, name = '', team = {}, milestones = [] } = {}) {
  const ms = Array.isArray(milestones) ? milestones : []; const c = pending.counts; if (!c.open && !ms.length) return null; const projects = [...new Set(pending.items.map(x => x.project).concat(ms.map(m => m.project)))];
  const byP = projects.map(id => { const it = pending.items.filter(x => x.project === id); return { id, name: (it[0] && it[0].projectName) || ((ms.find(m => m.project === id) || {}).projectName) || 'Project', items: it, ms: ms.filter(m => m.project === id) }; });
  const line = x => (x.n ? 'T-' + x.n + ' \u00b7 ' : '') + short(x.title, 80) + ' \u2014 ' + [dueWords(x.due, today), x.status, x.priority ? x.priority + ' priority' : '', x.blockerText ? 'blocked: ' + short(x.blockerText, 80) : ''].filter(Boolean).join(' \u00b7 ');
  const msLine = m => short(m.title, 90) + ' \u2014 ' + [dueWords(m.due, today), m.owner ? 'owner ' + m.owner : '', m.pct ? m.pct + '% done' : ''].filter(Boolean).join(' \u00b7 ');
  const SECTIONS = [['Overdue', x => x.overdue], ['Due today', x => x.today && !x.overdue], ['Blocked', x => x.blocked], ['Coming up in 3 days', x => x.soon], ['Other open tasks', () => true]];
  const tline = id => { const k = team[id]; return k ? 'Whole team on ' + (byP.length > 1 ? byP.find(g => g.id === id).name : 'this project') + ': ' + k.open + ' open, ' + k.overdue + ' overdue, ' + k.done + ' finished.' : ''; };
  let room = maxLines; const sections = [];
  for (const g of byP) { const pre = byP.length > 1 ? g.name + ' \u00b7 ' : ''; const used = new Set(); const msLate = g.ms.filter(m => m.due < today), msDue = g.ms.filter(m => m.due >= today); if (msLate.length) sections.push({ head: pre + 'Milestones overdue', total: msLate.length, max: 4, items: msLate.map(msLine), more: 'in the plan' }); if (msDue.length) sections.push({ head: pre + 'Milestones due', total: msDue.length, max: 4, items: msDue.map(msLine), more: 'in the plan' });
    for (const [title, test] of SECTIONS) { const it = g.items.filter(x => !used.has(x) && test(x)); if (!it.length) continue; it.forEach(x => used.add(x)); const show = it.slice(0, Math.max(0, room)); room -= show.length; sections.push({ head: pre + title, total: it.length, items: show.map(line), max: show.length || 1, more: 'in Delivery Studio' }); } }
  const where = byP.length === 1 ? byP[0].name : byP.length + ' projects';
  const tail = c.open ? c.open + ' open' + (c.overdue ? ', ' + c.overdue + ' overdue' : '') + (c.dueToday ? ', ' + c.dueToday + ' due today' : '') + (ms.length ? ', ' + ms.length + ' milestone' + (ms.length === 1 ? '' : 's') + ' due' : '') : ms.length + ' due';
  const top = pending.items.filter(x => (x.overdue || x.soon) && x.id).slice(0, 2);
  const m = card({ cat: c.open ? 'TASKS' : 'MILESTONES', where, tail, heading: (name ? 'Hi ' + name + ', here' : 'Here') + (c.open ? ' is what is open for you' : ' is what is coming up') + (byP.length === 1 ? ' in ' + byP[0].name : ' in ' + byP.length + ' projects') + '.',
    intro: byP.length === 1 ? [tline(byP[0].id)] : byP.map(g => tline(g.id)).filter(Boolean).slice(0, 3), sections, todo: NEXT.daily_digest, reply: '"T-4 done", "T-4 blocked: waiting for the customer", "move T-4 to Friday" or "my tasks".',
    facts: [{ title: 'Open', value: String(c.open) }, { title: 'Overdue', value: String(c.overdue) }, { title: 'Due today', value: String(c.dueToday || 0) }].concat(ms.length ? [{ title: 'Milestones due', value: String(ms.length) }] : []),
    why: c.open ? 'Your morning list of the tasks assigned to you' + (ms.length ? ', and the plan milestones that are due' : '') : 'Plan milestones of your project are due: everyone on the team is told',
    actions: [{ title: 'Open Delivery Studio', url: projects.length === 1 ? BASE_URL + '#/p/' + projects[0] + '/tasks' : BASE_URL }].concat(top.map(x => taskButtons(x, today)[0])).concat([MY_TASKS_BUTTON]) });
  return m;
}

/** Plan rows (the timeline) that the whole team should know about: not done, not a phase header, ending today, in the next soonDays days, or already late (at most `max`, the latest-due last). */
export function milestonesDue(project, rows, today, soonDays = 3, max = 8) {
  const end = addDays(today, soonDays); const out = [];
  for (const r of Array.isArray(rows) ? rows : []) { if (!r || r.isPhase || DONE.test(String(r.status || '').trim()) || Number(r.pct) >= 100) continue; const due = [r.end, r.start].find(x => DAY.test(x || '')) || ''; if (!due || due > end) continue;
    out.push({ project: project && project.id, projectName: project && project.name, title: oneLine(r.title, 160), due, owner: oneLine(r.owner, 20), status: oneLine(r.status, 20), pct: Number(r.pct) || 0 }); }
  return out.sort((a, b) => a.due.localeCompare(b.due)).slice(-max);
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

/** DM for a task that just got a new owner; null when nobody needs telling (no owner, same owner, done task, or the person assigned it to themselves).
    Heading = the task; one line = who gave it, the due date, status and priority; what it is; What to do; buttons Done, two new dates, My tasks and Open. */
export function assignmentNotice(prev, next, actorEmail, projectName, ref) {
  const to = String((next && next.owner) || '').trim().toLowerCase(); if (!to) return null;
  if (to === String((prev && prev.owner) || '').trim().toLowerCase()) return null;
  if (to === String(actorEmail || '').trim().toLowerCase()) return null;
  if (DONE.test(String(next.status || '').trim())) return null;
  const due = dueOf(next); const r = ref || {};
  const by = personOf(r.actorName || actorEmail) || 'the team', today = r.today || new Date().toISOString().slice(0, 10);
  const m = card({ cat: 'TASK', project: { name: projectName, customer: r.customer }, heading: 'New task for you: ' + (next.n ? 'T-' + next.n + ' \u00b7 ' : '') + oneLine(next.title, 160),
    intro: ['Given to you by ' + by + ' \u00b7 ' + dueWords(due, today) + ' \u00b7 ' + [next.status || 'To Do', next.priority ? next.priority + ' priority' : '', next.stage].filter(Boolean).join(' \u00b7 '), next.desc ? 'What it is: ' + short(next.desc, 300) : '', next.blocker ? 'Blocked: ' + short(next.blocker, 160) : ''],
    todo: NEXT.task_assigned, reply: '"done", "blocked: waiting for the customer" or "move to Friday".', due, today, facts: [{ title: 'Assigned by', value: by }, { title: 'Priority', value: next.priority || '\u2014' }],
    why: 'Someone made you the owner of this task',
    actions: taskButtons({ project: r.project, id: r.id, n: next.n, title: next.title }, today).concat([MY_TASKS_BUTTON]).concat(r.project ? [{ title: 'Open the task', url: BASE_URL + '#/p/' + r.project + '/tasks' }] : []) });
  return Object.assign({ to }, m);
}
/** The answer to "my tasks" (Otto's reply and the My tasks button): a heading, then overdue, due today, this week and later, then the milestones due in the next 7 days.
    Ready to send as it is; Otto adds nothing. pending = pendingFor(...), ms = milestonesDue(..., 7). */
export function myTasksMessage(pending, ms, today, name = '') {
  const c = pending.counts, it = pending.items, week = addDays(today, 7); const used = new Set(); const take = test => it.filter(x => !used.has(x) && test(x)).map(x => { used.add(x); return x; });
  const line = x => (x.n ? 'T-' + x.n + ' · ' : '') + short(x.title, 70) + ' — ' + [x.projectName, dueWords(x.due, today), x.status === 'Blocked' ? 'Blocked' : ''].filter(Boolean).join(' · ');
  const sections = [['Overdue', x => x.overdue], ['Due today', x => x.today], ['This week', x => x.due && x.due <= week], ['Later or no date', () => true]].map(([head, test]) => { const l = take(test); return { head, total: l.length, items: l.slice(0, 5).map(line), more: 'in Delivery Studio' }; });
  const msl = (ms || []).filter(m => m.due <= week), msLine = m => short(m.title, 70) + ' \u2014 ' + m.projectName + ' \u00b7 ' + dueWords(m.due, today) + (m.owner ? ' \u00b7 owner ' + m.owner : ''); const msLate = msl.filter(m => m.due < today), msNext = msl.filter(m => m.due >= today);
  if (msLate.length) sections.push({ head: 'Milestones overdue', total: msLate.length, items: msLate.slice(0, 4).map(msLine), max: 4, more: 'in the plan' }); if (msNext.length) sections.push({ head: 'Milestones in the next 7 days', total: msNext.length, items: msNext.slice(0, 4).map(msLine), max: 4, more: 'in the plan' });
  return card({ cat: 'MY TASKS', where: c.open ? c.open + ' open' : 'nothing open', heading: ((name ? name + ', ' : '') + (c.open ? 'you have ' + c.open + ' open task' + (c.open === 1 ? '' : 's') + (c.overdue ? ', ' + c.overdue + ' overdue' : '') + (c.dueToday ? ', ' + c.dueToday + ' due today' : '') : 'you have no open tasks') + '.').replace(/^./, x => x.toUpperCase()),
    sections, todo: c.overdue ? 'Start with the overdue ones: finish them or move the date.' : msLate.length ? 'Agree new dates for the overdue milestones with the project team and update the plan.' : c.open ? 'Keep the dates; say done when each is finished.' : '', reply: c.open ? '"T-4 done", "T-4 blocked: <reason>", "move T-4 to Friday" or "add a task: <what>".' : '"add a task: <what>".' }).text;
}
