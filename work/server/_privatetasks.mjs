/* Private tasks (tests: tests/private_tasks.mjs): each team member's own day-to-day list in a project, visible to nobody else.
   They are NOT items of the project. The list lives in its own collection "ptk", one record per person and project, and only the two routes below read or write it, always for the caller's own record
   (the key is made from the caller's e-mail, never from anything the caller sends). So nothing shared can show it: not the task list, search, exports, reports, the connector tools, Claude or another admin.
   Customers are refused. An admin sees only their own list, like everybody else. (The platform's own database tools could still read the raw record; the app never does.)
   The person's OWN list can also be read and changed through the connector (todo_list, todo_add, todo_done: Otto in Teams or their own Claude, signed in as them, user decision 12 Nov 2026); the key is still made from the caller's e-mail, so nobody reaches another person's list. */
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

/** the connector side: the caller's own list only (Otto or their own Claude act as the signed-in person) */
export function privateTodoTools(d) {
  const { HttpError, projectAccess, pickProject, memberProjects, dbGet, dbPut, withLock, hashOf } = d;
  const key = (pid, s) => pid + '.' + hashOf(String(s.email || '').toLowerCase()), today = () => new Date().toISOString().slice(0, 10);
  async function mine(s, pid) { const a = await projectAccess(s, pid, 'read'); if (a.role === 'customer') throw new HttpError(403, 'Private to-dos are for the project team'); const r = await dbGet('ptk', key(pid, s)); return cleanList(r && r.value && r.value.items, ''); }
  const save = (s, pid, items) => withLock('ptk.' + key(pid, s), async () => { const now = new Date().toISOString(); const clean = cleanList(items, now); await dbPut('ptk', key(pid, s), { items: clean, at: now }); return clean; });
  const open = (items, p) => items.filter(x => x.status !== 'Done').map(x => ({ id: x.id, title: x.title, due: x.due, priority: x.priority, overdue: !!(x.due && x.due < today()), project: p.name, projectId: p.id }));
  return {
    async todo_list(s, b) { const ps = b.project ? [await pickProject(s, b.project)] : (await memberProjects(s)).slice(0, 30); const out = []; for (const p of ps) { try { out.push(...open(await mine(s, p.id), p)); } catch (e) { /* not on this project's team */ } }
      out.sort((x, y) => (y.overdue - x.overdue) || String(x.due || '9999').localeCompare(String(y.due || '9999'))); return { todos: out.slice(0, 60), counts: { open: out.length, overdue: out.filter(x => x.overdue).length }, note: 'Your own private to-do list (nobody else sees it). Mark one done with action todo_done and its id, or add one with todo_add.' }; },
    async todo_add(s, b) { const p = await pickProject(s, b.project); const title = String(b.title || b.text || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (title.length < 2) throw new HttpError(400, 'Say what the to-do is.');
      const due = String(b.due || '').trim(); if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new HttpError(400, 'due must be a date written YYYY-MM-DD.');
      const items = await mine(s, p.id); const id = 'p' + hashOf(title + '|' + Date.now()).toLowerCase().replace(/[^a-z0-9]/g, 'x').slice(0, 12);
      await save(s, p.id, items.concat([{ id, title, due, priority: ['Low', 'Medium', 'High'].includes(b.priority) ? b.priority : '', status: 'To Do' }])); return { id, project: p.name, message: 'Added to your private to-do list in ' + p.name + ': \u201c' + title + '\u201d' + (due ? ', due ' + due : '') + '. Only you see it.' }; },
    async todo_done(s, b) { const p = await pickProject(s, b.project); const items = await mine(s, p.id); const want = String(b.id || b.title || '').trim().toLowerCase(); if (!want) throw new HttpError(400, 'Give the id or the words of the to-do.');
      const hit = items.find(x => x.id === want) || items.filter(x => x.status !== 'Done').find(x => x.title.toLowerCase().includes(want)); if (!hit) throw new HttpError(404, 'There is no open to-do like that in ' + p.name + '.');
      await save(s, p.id, items.map(x => x === hit ? Object.assign({}, x, { status: 'Done' }) : x)); return { id: hit.id, project: p.name, message: 'Done: \u201c' + hit.title + '\u201d is ticked off your list in ' + p.name + '.' }; }
  };
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
