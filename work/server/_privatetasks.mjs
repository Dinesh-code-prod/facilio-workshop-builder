/* Private tasks (tests: tests/private_tasks.mjs): each team member's own day-to-day list in a project, visible to nobody else.
   They are NOT items of the project. The list lives in its own collection "ptk", one record per person and project, and only the two routes below read or write it, always for the caller's own record
   (the key is made from the caller's e-mail, never from anything the caller sends). So nothing shared can show it: not the task list, search, exports, reports, the connector tools, Claude or another admin.
   Customers are refused. An admin sees only their own list, like everybody else. (The platform's own database tools could still read the raw record; the app never does.) */
export const MAX_ITEMS = 300;
const DAY = /^\d{4}-\d{2}-\d{2}$/; const ID = /^p[a-z0-9]{3,24}$/;
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').slice(0, n);

/** the list as it is kept: known fields only, bounded, no duplicates of an id */
export function cleanList(list, now) {
  const seen = new Set(); const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== 'object' || out.length >= MAX_ITEMS) continue; const id = String(x.id || ''); if (!ID.test(id) || seen.has(id)) continue; const title = clip(x.title, 300).trim(); if (!title) continue; seen.add(id);
    const done = x.status === 'Done';
    out.push({ id, title, notes: clip(x.notes, 2000), due: DAY.test(String(x.due || '')) ? x.due : '', priority: ['Low', 'Medium', 'High'].includes(x.priority) ? x.priority : '', status: done ? 'Done' : 'To Do', at: clip(x.at || now, 30), doneAt: done ? clip(x.doneAt || now, 30) : '' });
  }
  return out;
}

export function installPrivateTasks(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, withLock, hashOf } = d;
  const key = (pid, s) => pid + '.' + hashOf(String(s.email || '').toLowerCase());
  async function team(s, pid) { const a = await projectAccess(s, pid, 'read'); if (a.role === 'customer') throw new HttpError(403, 'Private tasks are for the project team'); return a; }
  route('GET', '/api/projects/:id/private-tasks', async (b, P) => { const s = await me(); await team(s, P.id); const r = await dbGet('ptk', key(P.id, s)); return ok({ items: cleanList(r && r.value && r.value.items, '') }); });
  route('PUT', '/api/projects/:id/private-tasks', async (b, P) => {
    const s = await me(); await team(s, P.id); const k = key(P.id, s); const now = new Date().toISOString();
    if (!b || !Array.isArray(b.items)) throw new HttpError(400, 'items must be a list'); if (b.items.length > MAX_ITEMS) throw new HttpError(413, 'A private list holds at most ' + MAX_ITEMS + ' tasks');
    return withLock('ptk.' + k, async () => { const items = cleanList(b.items, now); await dbPut('ptk', k, { items, at: now }); return ok({ items }); });
  });
}
