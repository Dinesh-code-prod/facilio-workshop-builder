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
/** the "what to do" sentence per kind of message, so no message leaves the reader guessing */
export const NEXT = {
  task_assigned: 'Open the task, read the description, set the status as you go, and press Done when it is finished. If the date cannot hold, change it and say why.',
  task_new: 'Someone on the team should take it: open Tasks and set an owner.',
  task_due: 'Open each task and update its status, or move the date and say why it slipped.',
  lifecycle_nudge: 'Open the project, start with the first item and deal with each next step; the page shows the records behind every item.',
  approval_requested: 'Open it, check it against the records, and approve it or send it back with a reason.',
  stage_ready: 'A project owner or admin can close the stage on the Project cycle page.',
  stage_closed: 'Nothing to do. The next stage is now the current one.',
  customer_signoff: 'Read it under Governance, then reply to the customer or follow up on the concern.',
  proposal_waiting: 'Review what Claude prepared. Nothing is final until a person approves it.',
  job_done: 'Open the result in the assistant and check it before you use it.',
  mail_arrived: 'Open the inbox, assign the mail to the right person and decide the reply.',
  ticket_new: 'Open the ticket, then assign it or answer the customer.'
};
