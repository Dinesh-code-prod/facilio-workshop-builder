/* Notifications (plan: docs/reference/NOTIFY-MAIL-STAGES-PLAN-2026-11-07.md, section 2; tests: tests/notify.mjs).
   One function, notify(), tells people about an event in three ways, each chosen per person and per event type:
     In-app   a record in the person's list (collection nt), shown in the bell; open pages are told by a content-free push (ctx.broadcast) so they fetch the list;
     Browser  a flag on the record; the open page shows a system pop-up if the person allowed it (nothing reaches a closed browser: the platform has no push);
     Teams    a direct message through Otto (ctx.teams.send), only when the plain secret teams_notify is on, never more than 5 a day per person (muted people are skipped by the platform).
   It never blocks or fails the save that caused it. Only members of the project's team are notified (never customers), and never the person who caused the event.
   The rules (EVENTS, channelsFor, makeRecord, quiet hours, the daily cap) are pure and exported; installNotify() adds the routes and returns notify() for the rest of the server. */
import { createHash } from 'node:crypto';

export const EVENTS = {
  task_assigned: { label: 'A task is assigned to you', def: { inapp: true, browser: false, teams: true } },
  task_new: { label: 'A new task has no owner yet', def: { inapp: true, browser: false, teams: true } },
  task_due: { label: 'A task is due soon or overdue', def: { inapp: true, browser: false, teams: true } },
  approval_requested: { label: 'Something waits for your approval', def: { inapp: true, browser: true, teams: true } },
  stage_ready: { label: 'A stage is ready to close', def: { inapp: true, browser: false, teams: true } },
  stage_closed: { label: 'A stage was closed', def: { inapp: true, browser: false, teams: true } },
  customer_signoff: { label: 'The customer signed off or raised a concern', def: { inapp: true, browser: true, teams: true } },
  proposal_waiting: { label: 'A Claude proposal is waiting for you', def: { inapp: true, browser: true, teams: false } },
  job_done: { label: 'A job you asked for finished or needs input', def: { inapp: true, browser: true, teams: false } },
  mail_arrived: { label: 'Customer mail arrived for a project', def: { inapp: true, browser: true, teams: true } },
  ticket_new: { label: 'A support ticket needs attention', def: { inapp: true, browser: true, teams: false } }
};
export const TEAMS_PER_DAY = 5, KEEP = 100;
/** the label that opens a Teams message and the bell line: what the message is about */
export const CATEGORY = { task_assigned: 'TASK', task_new: 'TASK', task_due: 'TASK', approval_requested: 'APPROVAL', stage_ready: 'STAGE', stage_closed: 'STAGE', customer_signoff: 'SIGN-OFF', proposal_waiting: 'CLAUDE', job_done: 'JOB', mail_arrived: 'MAIL', ticket_new: 'TICKET' };
export const catOf = ev => String((ev && ev.cat) || CATEGORY[ev && ev.type] || 'UPDATE').toUpperCase().slice(0, 20);
/** the Teams card of an event: title = category and project, first line = what happened, then the text; facts carry the core details */
export function teamsCard(ev, rec, actions) { const head = String(rec.title || '').split(' \u00b7 ')[0]; return { title: rec.cat + ' \u00b7 ' + rec.pname, text: head ? head + (rec.text ? '\n' + rec.text : '') : rec.text, facts: [{ title: 'Project', value: rec.pname }, { title: 'About', value: rec.cat }].concat((ev.facts || []).slice(0, 4)), actions }; }
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
  return { id, type: ev.type, pid: cut(ev.project && ev.project.id, 80), pname: cut(ev.project && ev.project.name, 120), cat: catOf(ev), title: cut(ev.title, 140), text: cut(ev.text, 300), view: cut(ev.view, 40) || 'projdash', at, read: false, browser: !!ch.browser, teams: false };
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
        const id = (ev.key ? createHash('sha256').update(ev.type + '|' + ev.key + '|' + h).digest('hex').slice(0, 20) : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); const rec = makeRecord(ev, ch, at, id);
        if (ch.inapp) { const had = await dbGet('nt', h + '.' + id); if (had && had.value && ev.key) continue; await dbPut('nt', h + '.' + id, rec); n++; }   // the same event (same key) is told once
        if (ch.teams && sendTeams) {
          try { const g = teamsGate((await dbGet('tnc', h) || {}).value, day); if (g.allow) { await dbPut('tnc', h, g.rec); await Promise.race([c.teams.send(Object.assign({ to: [email] }, teamsCard(ev, rec, [{ title: 'Open in Delivery Studio', url: (BASE_URL || '') + '#/p/' + rec.pid + '/' + rec.view }]))), new Promise(r => setTimeout(r, 4000))]); } } catch (e) { console.log('notify teams failed: ' + (e && e.message)); }
        }
        if (ch.inapp) { try { if (c.broadcast) await c.broadcast({ type: 'notify', for: h }); } catch (e) { /* over the realtime budget: the page polls */ } }
      }
      return n;
    } catch (e) { console.log('notify failed: ' + (e && e.message)); return 0; }
  }
  const mine = async s => { const h = hashOf(s.email); const rows = (await dbList('nt')).filter(r => r.key && r.key.startsWith(h + '.') && r.value).map(r => r.value).sort((a, b) => String(b.at).localeCompare(String(a.at))); return { h, rows }; };
  route('GET', '/api/notifications', async () => {
    const s = await me(); const { h, rows } = await mine(s); const keep = rows.slice(0, KEEP);
    for (const r of rows.slice(KEEP)) { try { await dbDel('nt', h + '.' + r.id); } catch (e) { } }   // the list keeps the newest 100
    return ok({ h, items: keep, unread: keep.filter(r => !r.read).length, prefs: prefsFor(await prefsOf(s.email)), events: Object.fromEntries(Object.entries(EVENTS).map(([k, e]) => [k, e.label])), teams: await teamsOn() });
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
  return { notify };
}
