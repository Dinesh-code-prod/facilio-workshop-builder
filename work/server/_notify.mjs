/* Notifications (plan: docs/plans/NOTIFY-MAIL-STAGES-PLAN-2026-11-07.md, section 2; tests: tests/notify.mjs).
   One function, notify(), tells people about an event in three ways, each chosen per person and per event type:
     In-app   a record in the person's list (collection nt), shown in the bell; open pages are told by a content-free push (ctx.broadcast) so they fetch the list;
     Browser  a flag on the record; the open page shows a system pop-up if the person allowed it (nothing reaches a closed browser: the platform has no push);
     Teams    a direct message through Otto (ctx.teams.send), only when the plain secret teams_notify is on, never more than 5 a day per person (muted people are skipped by the platform).
   It never blocks or fails the save that caused it. Only members of the project's team are notified (never customers), and never the person who caused the event.
   The rules (EVENTS, channelsFor, makeRecord, quiet hours, the daily cap) are pure and exported; installNotify() adds the routes and returns notify() for the rest of the server. */
import { createHash } from 'node:crypto';
import { dueWords, personOf, NEXT, card } from './_msgfmt.mjs';

export const EVENTS = {
  task_assigned: { label: 'A task is assigned to you', def: { inapp: true, browser: false, teams: true } },
  task_new: { label: 'A new task has no owner yet', def: { inapp: true, browser: false, teams: true } },
  task_due: { label: 'A task is due soon', def: { inapp: true, browser: false, teams: true } },
  missed_step: { label: 'A required step of yours is past its due date', def: { inapp: true, browser: true, teams: true } },
  lifecycle_nudge: { label: 'A project you own needs attention', def: { inapp: true, browser: false, teams: true } },
  approval_requested: { label: 'Something waits for your approval', def: { inapp: true, browser: true, teams: true } },
  stage_ready: { label: 'A stage is ready to close', def: { inapp: true, browser: false, teams: true } },
  stage_closed: { label: 'A stage was closed', def: { inapp: true, browser: false, teams: true } },
  customer_signoff: { label: 'The customer signed off or raised a concern', def: { inapp: true, browser: true, teams: true } },
  proposal_waiting: { label: 'A Claude proposal is waiting for you', def: { inapp: true, browser: true, teams: false } },
  job_done: { label: 'A job you asked for finished or needs input', def: { inapp: true, browser: true, teams: false } },
  mail_arrived: { label: 'Customer mail arrived for a project', def: { inapp: true, browser: true, teams: true } },
  ticket_new: { label: 'A support ticket needs attention', def: { inapp: true, browser: true, teams: false } },
  milestone_due: { label: 'A plan milestone or deliverable you are responsible for is due soon', def: { inapp: true, browser: false, teams: true } },
  escalation: { label: 'Work on a project you own is 5 or more days late', def: { inapp: true, browser: true, teams: true } },
  daily_digest: { label: 'Your morning list of tasks and milestones (Teams)', def: { inapp: false, browser: false, teams: true } },
  project_added: { label: 'You were added to a project (Teams welcome)', def: { inapp: false, browser: false, teams: true } }
};
export const TEAMS_PER_DAY = 5, KEEP = 100;
/** the label that opens a Teams message and the bell line: what the message is about */
export const CATEGORY = { task_assigned: 'TASK', task_new: 'TASK', task_due: 'TASK', missed_step: 'MISSED', lifecycle_nudge: 'PROJECT', approval_requested: 'APPROVAL', stage_ready: 'STAGE', stage_closed: 'STAGE', customer_signoff: 'SIGN-OFF', proposal_waiting: 'CLAUDE', job_done: 'JOB', mail_arrived: 'MAIL', ticket_new: 'TICKET', milestone_due: 'MILESTONE', escalation: 'LATE WORK', daily_digest: 'TASKS', project_added: 'PROJECT' };
export const catOf = ev => String((ev && ev.cat) || CATEGORY[ev && ev.type] || 'UPDATE').toUpperCase().slice(0, 20);
/** the Teams card of an event: title = category and project, first line = what happened, then the text; facts carry the core details */
export const WHY = { task_assigned: 'It is assigned to you', task_new: 'Nobody owns it yet, so the whole project team is told', task_due: 'A task of yours is due soon', missed_step: 'You are responsible for it (or own the project) and it is past its due date', lifecycle_nudge: 'You own this project and its records show it needs attention', approval_requested: 'Something waits for your approval', stage_ready: 'Every record of the stage is complete', stage_closed: 'A stage of this project was closed', customer_signoff: 'The customer acted on a sign-off', proposal_waiting: 'Claude prepared something for you to review', job_done: 'A job you asked for finished', mail_arrived: 'New customer mail needs a decision', ticket_new: 'A support ticket needs attention', milestone_due: 'A plan milestone or deliverable of yours (or of your project) is due soon', escalation: 'You own this project and work on it is 5 or more days late', daily_digest: 'Your morning list', project_added: 'A project owner added you to a project' };
export function teamsCard(ev, rec, actions) {
  const dueFact = (ev.facts || []).find(f => f && f.title === 'Due'); const due = /^\d{4}-\d{2}-\d{2}$/.test(rec.due || '') ? rec.due : /^\d{4}-\d{2}-\d{2}$/.test((dueFact && dueFact.value) || '') ? dueFact.value : '';
  const head = String(rec.title || '').split(' \u00b7 ')[0]; const intro = ev.intro || [rec.text].concat(rec.more && rec.more !== rec.text ? [rec.more] : []);
  return card({ cat: rec.cat, project: { name: rec.pname, customer: rec.cust }, heading: (rec.reminders ? 'Reminder: ' : '') + head, intro, sections: ev.sections, todo: ev.todo || NEXT[ev.type], due, today: String(rec.at || '').slice(0, 10),
    facts: (ev.facts || []).filter(f => f && f.title !== 'Due' && f.title !== 'Project').slice(0, 3).concat(rec.by ? [{ title: 'From', value: personOf(rec.by) }] : []), why: WHY[ev.type], actions: (ev.buttons || []).concat(actions || []) });
}
const flat = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const cut = (v, n) => { const s = flat(v); if (s.length <= n) return s; const t = s.slice(0, n - 1); const i = t.lastIndexOf(' '); return (i > n * 0.6 ? t.slice(0, i) : t).replace(/[\s,;:.\-]+$/, '') + '…'; };   // a notice never stops in the middle of a word
/** the first full sentence of a free text (a Claude reply, a note), without the greeting, at most n characters */
export const lead = (v, n = 170) => { let s = flat(v).replace(/^(hi|hello|hey|dear)\b[^,.!:]{0,40}[,:!.]\s*/i, ''); const m = /^(.+?[.!?])(\s|$)/.exec(s); if (m && m[1].length <= n) s = m[1]; s = cut(s, n); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
export const norm = e => String(e || '').trim().toLowerCase();
/** the key of a person in the notification collections (no e-mail address in a key) */
export const hashOf = email => createHash('sha256').update(norm(email)).digest('hex').slice(0, 32);
const flag = (v, d) => (typeof v === 'boolean' ? v : d);
/** a person's saved preferences merged over the defaults: { types: { type: { inapp, browser, teams } }, quiet: { from: 'HH:MM', to: 'HH:MM' } | null, tz: minutes behind UTC (as Date.getTimezoneOffset) } */
export function prefsFor(stored) {
  const s = stored && typeof stored === 'object' ? stored : {}; const types = {};
  for (const [k, e] of Object.entries(EVENTS)) { const p = (s.types && s.types[k]) || {}; types[k] = { inapp: flag(p.inapp, e.def.inapp), browser: flag(p.browser, e.def.browser), teams: flag(p.teams, e.def.teams) }; }
  const q = s.quiet && /^\d{2}:\d{2}$/.test(s.quiet.from || '') && /^\d{2}:\d{2}$/.test(s.quiet.to || '') ? { from: s.quiet.from, to: s.quiet.to } : null;
  return { types, quiet: q, tz: Number.isFinite(Number(s.tz)) ? Math.max(-840, Math.min(840, Math.round(Number(s.tz)))) : 0 };
}
/** true when the person's local time is inside the quiet window (it may wrap midnight) */
export function inQuiet(prefs, date) {
  const q = prefs && prefs.quiet; if (!q) return false; const d = date || new Date(); const local = ((d.getUTCHours() * 60 + d.getUTCMinutes() - (prefs.tz || 0)) % 1440 + 1440) % 1440;
  const m = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)); const a = m(q.from), b = m(q.to); return a === b ? false : a < b ? local >= a && local < b : local >= a || local < b;
}
/** which channels this person gets for this event right now; quiet hours silence the browser pop-up and Teams, never the in-app record */
export function channelsFor(type, stored, date) {
  const e = EVENTS[type]; if (!e) return { inapp: false, browser: false, teams: false }; const p = prefsFor(stored); const c = p.types[type]; const quiet = inQuiet(p, date);
  return { inapp: c.inapp, browser: c.browser && !quiet, teams: c.teams && !quiet };
}
/** at most TEAMS_PER_DAY Teams messages per person per day; rec = what was stored, or null */
export function teamsGate(rec, day, max = TEAMS_PER_DAY) { const n = rec && rec.day === day ? Number(rec.n) || 0 : 0; return n >= max ? { allow: false, rec: { day, n } } : { allow: true, rec: { day, n: n + 1 } }; }
/** the record kept in the person's list */
export function makeRecord(ev, ch, at, id) {
  const rec = { id, type: ev.type, pid: cut(ev.project && ev.project.id, 80), pname: cut(ev.project && ev.project.name, 120), cat: catOf(ev), title: cut(ev.title, 140), text: cut(ev.text, 300), more: cut(ev.detail, 600), cust: cut(ev.project && ev.project.customer, 80), due: cut(ev.due, 10), by: cut(personOf(ev.actorName || ev.actor), 80), view: cut(ev.view, 40) || 'projdash', at, read: false, browser: !!ch.browser, teams: false };
  const x = cleanX(ev.x); if (x) rec.x = x;
  if (ev.ref && ev.ref.kind && ev.ref.id) rec.ref = { kind: cut(ev.ref.kind, 20), id: cut(ev.ref.id, 80) };
  if (ev.owner) rec.owner = cut(ev.owner, 80);
  return rec;
}
/** where on the page a notice opens: only these keys, short strings (the bell passes them to the page, never into HTML unescaped) */
const X_KEYS = ['govTab', 'planTab', 'tkPageId', 'focus'];
export function cleanX(x) { if (!x || typeof x !== 'object') return null; const o = {}; for (const k of X_KEYS) if (typeof x[k] === 'string' && x[k]) o[k] = x[k].slice(0, 80); return Object.keys(o).length ? o : null; }
/** the lifecycle a person sees: completed (the item is done), unread, acknowledged (opened, still to do); overdue is told apart by its due date */
export function stateOf(r, today) { return { state: r.done ? 'completed' : !r.read ? 'unread' : 'acknowledged', overdue: !r.done && /^\d{4}-\d{2}-\d{2}$/.test(r.due || '') && r.due < today }; }
/** the page path of a notice, with the task id for a task page */
export const pathOf = rec => '#/p/' + rec.pid + '/' + rec.view + (rec.view === 'taskpage' && rec.x && rec.x.tkPageId ? '/' + encodeURIComponent(rec.x.tkPageId) : '');
/** an event already told to this person (same key): skip it, bring it back (the item was done and is missed again), or remind (still open REMIND days later) */
export function repeatOf(had, ev, at) {
  if (!had || !ev.key) return null;
  if (had.done) return ev.remind ? { mode: 'revive' } : null;
  if (ev.remind && Date.parse(at) - Date.parse(had.at) >= ev.remind * 864e5) return { mode: 'remind' };
  return null;
}

export function installNotify(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, dbList, dbDel, ctx, now, teamOf, BASE_URL } = d;
  const prefsOf = async email => ((await dbGet('np', hashOf(email))) || {}).value;
  const teamsOn = async () => { const c = ctx(); if (!c.teams || !c.teams.send) return false; try { return String(await c.secrets.get('teams_notify')).toLowerCase() === 'on'; } catch (e) { return false; } };
  /** ev: { type, project: { id, name, members }, to: [emails] | 'team', actor: email, title, text, view, key, skipTeams }. Resolves to the number of in-app records written. */
  async function notify(ev) {
    try {
      if (!EVENTS[ev.type] || !ev.project) return 0; const team = new Set(teamOf(ev.project).map(m => norm(m.email)).filter(Boolean)); const actor = norm(ev.actor);
      const who = [...new Set((ev.to === 'team' ? [...team] : [].concat(ev.to || [])).map(norm))].filter(e => e && team.has(e) && e !== actor).slice(0, 50); if (!who.length) return 0;
      const at = now(); const day = at.slice(0, 10); const sendTeams = !ev.skipTeams && (await teamsOn()); let n = 0; const c = ctx();
      for (const email of who) {
        const h = hashOf(email); const ch = channelsFor(ev.type, await prefsOf(email), new Date()); if (!ch.inapp && !ch.teams) continue;
        const id = idOf(ev.type, ev.key, h) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8); let rec = makeRecord(ev, ch, at, id); let again = null;
        if (ch.inapp) { const had = ev.key ? ((await dbGet('nt', h + '.' + id)) || {}).value : null;   // the same event (same key) is told once, unless it is reminded or comes back
          if (had) { again = repeatOf(had, ev, at); if (!again) continue; rec = Object.assign({}, had, rec, { reminders: again.mode === 'remind' ? (Number(had.reminders) || 0) + 1 : 0, done: false, doneAt: null }); }
          await dbPut('nt', h + '.' + id, rec); n++; }
        if (ch.teams && sendTeams && (!(again && again.mode === 'remind') || (ev.teamsRemind && rec.reminders === 1))) {   // a reminder fills the bell again; Teams hears it the first time, and once more (day 3) for an overdue item
          try { const g = ev.urgent ? { allow: true } : teamsGate((await dbGet('tnc', h) || {}).value, day); if (g.allow) { if (g.rec) await dbPut('tnc', h, g.rec); await Promise.race([c.teams.send(Object.assign({ to: [email] }, teamsCard(ev, rec, [{ title: 'Open in Delivery Studio', url: (BASE_URL || '') + pathOf(rec) }]))), new Promise(r => setTimeout(r, 4000))]); } } catch (e) { console.log('notify teams failed: ' + (e && e.message)); }
        }
        if (ch.inapp) { try { if (c.broadcast) await c.broadcast({ type: 'notify', for: h }); } catch (e) { /* over the realtime budget: the page polls */ } }
      }
      return n;
    } catch (e) { console.log('notify failed: ' + (e && e.message)); return 0; }
  }
  /** a Teams message built elsewhere (the morning digest, a task assignment, a helper alert, added to a project) goes through the same rules as notify(): Teams on, the person's
      setting for that kind and their quiet hours, and 5 a day per person. o.own: the person asked for it themselves (no setting, no quiet hours, no count); o.urgent: no count.
      Resolves to { status: sent | off | setting | daily limit | failed, teams: what Teams answered }. */
  async function teamsTo(email, type, msg, o = {}) {
    const e = norm(email); if (!e || !(await teamsOn())) return { status: 'off' }; const c = ctx(); const h = hashOf(e);
    try { if (!o.own && !channelsFor(type, await prefsOf(e), new Date()).teams) return { status: 'setting' };
      if (!o.own && !o.urgent) { const g = teamsGate(((await dbGet('tnc', h)) || {}).value, now().slice(0, 10)); if (!g.allow) return { status: 'daily limit' }; await dbPut('tnc', h, g.rec); }
      const r = await Promise.race([c.teams.send(Object.assign({}, msg, { to: [e] })), new Promise(res => setTimeout(() => res(null), 4000))]); return { status: 'sent', teams: r || {} };
    } catch (err) { console.log('teams send failed: ' + (err && err.message)); return { status: 'failed', why: String((err && err.message) || err).slice(0, 120) }; }
  }
  const idOf = (type, key, h) => (key ? createHash('sha256').update(type + '|' + key + '|' + h).digest('hex').slice(0, 20) : '');
  /** the thing a notice is about is done: its notice is Completed (and read) for everyone on the team who has it. Resolves to how many changed. */
  async function resolve(project, type, key) {
    let n = 0; try {
      for (const m of teamOf(project)) { const h = hashOf(m.email); if (!m.email) continue; const k = h + '.' + idOf(type, key, h); const r = ((await dbGet('nt', k)) || {}).value; if (!r || r.done) continue;
        await dbPut('nt', k, Object.assign({}, r, { done: true, read: true, doneAt: now() })); n++; try { if (ctx().broadcast) await ctx().broadcast({ type: 'notify', for: h }); } catch (e) { } }
    } catch (e) { console.log('notify resolve failed: ' + (e && e.message)); } return n;
  }
  const mine = async s => { const h = hashOf(s.email); const rows = (await dbList('nt')).filter(r => r.key && r.key.startsWith(h + '.') && r.value).map(r => r.value).sort((a, b) => String(b.at).localeCompare(String(a.at))); return { h, rows }; };
  route('GET', '/api/notifications', async () => {
    const s = await me(); const { h, rows } = await mine(s); const keep = rows.slice(0, KEEP);
    for (const r of rows.slice(KEEP)) { try { await dbDel('nt', h + '.' + r.id); } catch (e) { } }   // the list keeps the newest 100
    const today = now().slice(0, 10);
    return ok({ h, items: keep.map(r => Object.assign({}, r, stateOf(r, today))), unread: keep.filter(r => !r.read).length, prefs: prefsFor(await prefsOf(s.email)), events: Object.fromEntries(Object.entries(EVENTS).map(([k, e]) => [k, e.label])), teams: await teamsOn() });
  });
  route('POST', '/api/notifications/read', async b => {
    const s = await me(); const h = hashOf(s.email); const ids = Array.isArray(b && b.ids) ? b.ids.map(String).slice(0, 200) : null; const pid = b && b.pid ? String(b.pid) : '';
    const { rows } = await mine(s); let n = 0; for (const r of rows) { if (r.read) continue; if (b && b.all ? (!pid || r.pid === pid) : ids && ids.includes(r.id)) { await dbPut('nt', h + '.' + r.id, Object.assign({}, r, { read: true })); n++; } }
    return ok({ read: n });
  });
  route('PUT', '/api/notifications/prefs', async b => {
    const s = await me(); const p = prefsFor(b); await dbPut('np', hashOf(s.email), p); return ok({ prefs: p });
  });
  // the browser tells the server what only the browser knows (a stage whose records are all done): team members only, once a day per stage
  route('POST', '/api/projects/:id/notify-event', async (b, P) => {
    const s = await me(); const { project, role } = await projectAccess(s, P.id, 'edit'); if (role === 'customer') throw new HttpError(403, 'Not permitted');
    if (!b || b.type !== 'stage_ready') throw new HttpError(400, 'Unknown event'); const stage = cut(b.stage, 60), name = cut(b.name, 80); if (!stage) throw new HttpError(400, 'Which stage?');
    const n = await notify({ type: 'stage_ready', project, to: 'team', actor: s.email, title: 'Ready to close: ' + (name || stage), text: 'Every record of this stage is complete. A project owner or admin can close it on the Project cycle page.', view: 'lifecycle', key: stage + '|' + now().slice(0, 10) });
    return ok({ notified: n });
  });
  return { notify, resolve, teamsTo };
}
