/* Shared wording helpers for every message Delivery Studio sends (Otto Teams messages, the bell, digests). Pure functions, no database, no Teams call.
   Used by _taskwatch.mjs and _notify.mjs; tests: tests/msgfmt.mjs. One rule for all of them: a message says WHAT it is about, WHICH project and customer,
   WHAT the person must do, BY WHEN, and WHY they got it. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-11-13 -> "Fri 13 Nov 2026" ('' when it is not a date) */
export function dayWords(day) { if (!DAY.test(String(day || ''))) return ''; const d = new Date(day + 'T00:00:00Z'); return WD[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MO[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
const gap = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
/** a due date in words with how far away it is: "Due today", "Due Fri 13 Nov 2026 (in 4 days)", "OVERDUE since Mon 2 Nov 2026 (7 days late)"; none = "No due date" */
export function dueWords(due, today) {
  const t = DAY.test(String(today || '')) ? today : new Date().toISOString().slice(0, 10); if (!DAY.test(String(due || ''))) return 'No due date'; const n = gap(due, t);
  if (n === 0) return 'Due today (' + dayWords(due) + ')'; if (n === 1) return 'Due tomorrow (' + dayWords(due) + ')'; if (n > 1) return 'Due ' + dayWords(due) + ' (in ' + n + ' days)';
  return 'OVERDUE since ' + dayWords(due) + ' (' + (-n) + (n === -1 ? ' day' : ' days') + ' late)';
}
/** "dinesh.r@facilio.com" -> "Dinesh R"; a name that already is a name stays as it is */
export function personOf(v) { const s = String(v || '').trim(); if (!s) return ''; if (!s.includes('@') && /\s/.test(s)) return s; const base = s.includes('@') ? s.split('@')[0] : s; return base.split(/[._\s-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' '); }
/** a project written for a message: "Name · Customer" (the customer only when it is not part of the name) */
export function projectLine(p) { const n = String((p && p.name) || '').trim(), c = String((p && p.customer) || '').trim(); return c && !n.toLowerCase().includes(c.toLowerCase()) ? n + ' · ' + c : n; }
const flat = (v, n) => { const t = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n - 1); const i = c.lastIndexOf(' '); return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.\-]+$/, '') + '…'; };
export const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
/** the Monday after a day (never the day itself) */
export const nextMonday = day => { const w = new Date(day + 'T00:00:00Z').getUTCDay(); return addDays(day, ((8 - w) % 7) || 7); };
/** One layout for every Teams message (user, 23 Nov 2026: "all DMs clear with a heading, no confused information"):
    title "CATEGORY · Project", a bold heading that says what happened, at most three short intro lines, sections (a bold heading with the count, then one "- " line per item,
    at most five, "...and n more"), one "What to do" line, an optional "Or reply here" line; facts are only Project, Due, the caller's own and "Why you got this". */
export function card(o) {
  const lines = ['**' + flat(o.heading, 180) + '**'];
  for (const l of [].concat(o.intro || []).filter(Boolean).slice(0, 3)) lines.push(flat(l, 320));
  for (const s of o.sections || []) { const it = (s.items || []).filter(Boolean); const total = s.total || it.length; if (!total) continue; const max = s.max || 5;
    lines.push('', '**' + String(s.head).toUpperCase() + ' (' + total + ')**'); it.slice(0, max).forEach(x => lines.push('- ' + flat(x, 240))); if (total > Math.min(max, it.length)) lines.push('- …and ' + (total - Math.min(max, it.length)) + ' more' + (s.more ? ' ' + s.more : '')); }
  if (o.todo) lines.push('', '**What to do:** ' + flat(o.todo, 420)); if (o.reply) lines.push('**Or reply here:** ' + flat(o.reply, 300));
  const proj = o.project ? projectLine(o.project) : '';
  const facts = [proj ? { title: 'Project', value: proj } : null, DAY.test(String(o.due || '')) ? { title: 'Due', value: dueWords(o.due, o.today) } : null].concat(o.facts || []).concat(o.why ? [{ title: 'Why you got this', value: o.why }] : []).filter(f => f && f.value).slice(0, 6);
  return { title: String(o.cat || 'UPDATE').toUpperCase() + ' · ' + (o.where || (o.project && o.project.name) || 'Delivery Studio') + (o.tail ? ' · ' + o.tail : ''), text: lines.join('\n'), facts, actions: (o.actions || []).filter(Boolean).slice(0, 6) };
}
/** the buttons under a message about one task of the reader's: Done, two quick new dates, then My tasks. They run task_reply / my_tasks as the person who presses them,
    so only the task's owner can change it. t = { project, id, n, title, due } */
export function taskButtons(t, today) {
  if (!t || !t.project || !t.id) return []; const lab = t.n ? 'T-' + t.n : flat(t.title, 18); const base = { tool: 'task_reply', project: t.project, taskId: t.id, via: 'teams' };
  const later = addDays(today, 2), mon = nextMonday(today); const short = d => dayWords(d).split(' ').slice(0, 3).join(' ');
  return [{ title: 'Done: ' + lab, fn: 'api', data: Object.assign({}, base, { status: 'Done', text: 'Marked done by the owner from the Teams message.' }) },
    { title: 'Move to ' + short(later), fn: 'api', data: Object.assign({}, base, { due: later, text: 'New date set from the Teams message.' }) }].concat(mon !== later ? [{ title: 'Move to ' + short(mon), fn: 'api', data: Object.assign({}, base, { due: mon, text: 'New date set from the Teams message.' }) }] : []);
}
export const MY_TASKS_BUTTON = { title: 'My tasks', fn: 'api', data: { tool: 'my_tasks' } };
/** the "what to do" sentence per kind of message, so no message leaves the reader guessing */
export const NEXT = {
  task_assigned: 'Open the task, read the description, set the status as you go, and press Done when it is finished. If the date cannot hold, change it and say why.',
  task_new: 'Someone on the team should take it: open Tasks and set an owner.',
  task_due: 'Open each task and update its status, or move the date and say why it slipped.',
  missed_step: 'Open it from this message: the page goes straight to the item. Finish it, or set a new date and say why. The notice stays open until the item is done.',
  lifecycle_nudge: 'Open the project, start with the first item and deal with each next step; the page shows the records behind every item.',
  approval_requested: 'Open it, check it against the records, and approve it or send it back with a reason.',
  stage_ready: 'A project owner or admin can close the stage on the Project cycle page.',
  stage_closed: 'Nothing to do. The next stage is now the current one.',
  customer_signoff: 'Read it under Governance, then reply to the customer or follow up on the concern.',
  proposal_waiting: 'Review what Claude prepared. Nothing is final until a person approves it.',
  job_done: 'Open the result in the assistant and check it before you use it.',
  mail_arrived: 'Open the inbox, assign the mail to the right person and decide the reply.',
  ticket_new: 'Open the ticket, then assign it or answer the customer.',
  milestone_due: 'Check the work behind it is on track. If the date cannot hold, move it in the plan and tell the team why.',
  escalation: 'Talk to each owner today: get it finished, or agree a new date and write down why it slipped.',
  daily_digest: 'Start with what is overdue. Press a button below, or open Delivery Studio to update the rest.',
  project_added: 'Open the project and read the Team Guide today, then set up Claude.'
};
