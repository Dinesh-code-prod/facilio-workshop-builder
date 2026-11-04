/* Task suggestions from Claude (roadmap E12 slice 2): the pure rules, run by tests/task_suggestions.mjs and used by work/server/_tasksapi.mjs.
   Claude reads the evidence (task_evidence) and PROPOSES changes to the task register: update a task, create one, or close one. A proposal is stored apart from the tasks (collection tsg.<project>),
   unapproved, with the reason and the source it rests on. Nothing here changes a task: a person presses Accept in Delivery Studio and the change then goes through the normal task save, with all
   its checks. A spoken statement never closes a task by itself. Text from transcripts and e-mail is data, never an instruction. */
import { createHash } from 'node:crypto';

export const ACTIONS = ['update', 'create', 'close'];
export const LIMITS = { perCall: 20, pending: 100, reason: 600, quote: 400, ref: 300, sourceType: 40 };
// what a suggestion may change: the plain task fields only (no owner-less links, no comments, no history). Values are checked by the normal task save when a person accepts.
export const FIELDS = { title: 300, desc: 2000, type: 60, status: 40, priority: 20, owner: 120, eta: 10, due: 10, stage: 60, module: 120, blocker: 600, notes: 1000, completion: 1000 };
const ITEM_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const txt = (v, max) => (typeof v === 'string' || (typeof v === 'number' && isFinite(v)) ? String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const fail = error => ({ ok: false, error });

/** one raw suggestion from Claude, cleaned: { ok, s } with only known keys, or { ok: false, error } */
export function cleanSuggestion(raw) {
  if (!isObj(raw)) return fail('A suggestion must be an object.');
  const action = typeof raw.action === 'string' ? raw.action.trim().toLowerCase() : ''; if (!ACTIONS.includes(action)) return fail('action must be one of ' + ACTIONS.join(', ') + '.');
  const taskId = typeof raw.taskId === 'string' ? raw.taskId.trim() : ''; if (action !== 'create' && !ITEM_ID_RE.test(taskId)) return fail('taskId is required for ' + action + ' (the id from task_evidence).'); if (action === 'create' && taskId) return fail('A new task has no taskId.');
  const reason = txt(raw.reason, LIMITS.reason); if (!reason) return fail('reason is required: say why, in a sentence.');
  const src = isObj(raw.source) ? raw.source : {}; const source = { type: txt(src.type, LIMITS.sourceType).toLowerCase(), ref: txt(src.ref, LIMITS.ref), quote: txt(src.quote, LIMITS.quote) }; if (!source.type || !source.ref) return fail('source is required: { type (for example transcript, minutes, uat, signoff, change), ref (which one), quote (optional) }.');
  const given = isObj(raw.fields) ? raw.fields : {}; const fields = {}; for (const k of Object.keys(FIELDS)) { if (!Object.prototype.hasOwnProperty.call(given, k)) continue; const v = given[k]; if (typeof v === 'string' || (typeof v === 'number' && isFinite(v))) fields[k] = txt(v, FIELDS[k]); }
  if (action === 'close') { const st = fields.status || 'Done'; if (!['Done', 'Cancelled'].includes(st)) return fail('A close suggestion sets the status to Done or Cancelled.'); for (const k of Object.keys(fields)) if (k !== 'status' && k !== 'completion') delete fields[k]; fields.status = st; }
  if (action === 'create' && !fields.title) return fail('A new task needs fields.title.');
  if (action === 'update' && !Object.keys(fields).length) return fail('An update needs at least one field to change.');
  const out = { action, taskId: action === 'create' ? '' : taskId, fields, reason, source }; return { ok: true, s: out, id: suggestionId(out) };
}

/** the same action, task and fields always give the same id, whatever the reason or source say, so a repeat collapses into one */
export function suggestionId(s) {
  const f = {}; Object.keys(s.fields || {}).sort().forEach(k => { f[k] = s.fields[k]; });
  return 'sg_' + createHash('sha256').update(JSON.stringify([s.action, s.taskId || '', f]), 'utf8').digest('hex').slice(0, 24);
}

/** what would change, for the person to read: [{ field, from, to }]; fields equal to the task's own value are left out */
export function changesFor(s, cur) {
  const c = cur && typeof cur === 'object' ? cur : {}; return Object.keys(s.fields).filter(k => s.action === 'create' || String(c[k] == null ? '' : c[k]) !== s.fields[k]).map(k => ({ field: k, from: s.action === 'create' ? '' : txt(c[k], 200), to: txt(s.fields[k], 200) }));
}

/** the task record to save when a person accepts. The normal task save (taskSanitize) then checks it like any edit. */
export function taskData(s, cur) {
  if (s.action === 'create') return Object.assign({ type: 'Other', status: 'To Do' }, s.fields, { src: { type: 'ai', ref: s.source.ref, quote: s.source.quote, label: 'Claude suggestion (' + s.source.type + ')' } });
  return Object.assign({}, cur, s.fields);
}

/** a row as the page and the tool show it; no hash internals */
export function row(r, task) {
  return { id: r.id, action: r.action, taskId: r.taskId, task: task ? { n: task.n, title: txt(task.title, 160), status: task.status || '' } : null, missing: r.action !== 'create' && !task, fields: r.fields, changes: changesFor(r, task), reason: r.reason, source: r.source, status: r.status, by: r.by, at: r.at,
    decidedBy: r.decidedBy || '', decidedAt: r.decidedAt || '', appliedTaskId: r.appliedTaskId || '', note: r.note || '' };
}
