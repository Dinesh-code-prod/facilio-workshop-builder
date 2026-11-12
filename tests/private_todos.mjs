// Private to-dos through the connector (work/server/_privatetasks.mjs privateTodoTools: Otto in Teams or the person's own Claude): add, list and tick off
// the caller's OWN list; another person never sees it, a customer is refused, bad input is refused.
import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { privateTodoTools } from '../work/server/_privatetasks.mjs';
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const db = new Map(); const P = { id: 'p1', name: 'Alpha' };
const T = privateTodoTools({ HttpError, hashOf: v => createHash('sha256').update(String(v)).digest('hex'),
  projectAccess: async (s) => ({ role: s.role || 'member' }), pickProject: async () => P, memberProjects: async () => [P],
  dbGet: async (c, k) => (db.has(c + '/' + k) ? { value: db.get(c + '/' + k) } : null), dbPut: async (c, k, v) => { db.set(c + '/' + k, v); }, withLock: (k, f) => f() });
const kim = { email: 'kim@facilio.com' }, ravi = { email: 'ravi@facilio.com' }; let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
await t('a person adds to-dos, sees them overdue first, and ticks one off by its words', async () => {
  await T.todo_add(kim, { project: 'p1', title: 'Prepare notes for the workshop', due: '2026-11-30' }); await T.todo_add(kim, { project: 'p1', title: 'Call Sara', due: '2020-01-02' });
  let l = await T.todo_list(kim, {}); assert.equal(l.counts.open, 2); assert.equal(l.todos[0].title, 'Call Sara'); assert.equal(l.counts.overdue, 1);
  const d = await T.todo_done(kim, { project: 'p1', title: 'call sara' }); assert.ok(/Call Sara/.test(d.message)); l = await T.todo_list(kim, {}); assert.equal(l.counts.open, 1);
});
await t('another team member sees only their own list (empty), never the first person\'s', async () => { const l = await T.todo_list(ravi, {}); assert.equal(l.counts.open, 0); await assert.rejects(T.todo_done(ravi, { project: 'p1', title: 'Prepare' }), /no open to-do/); });
await t('a customer is refused, and an empty title or a bad date is refused', async () => {
  await assert.rejects(T.todo_add({ email: 'c@acme.com', role: 'customer' }, { project: 'p1', title: 'x y' }), /project team/);
  await assert.rejects(T.todo_add(kim, { project: 'p1', title: ' ' }), /Say what/); await assert.rejects(T.todo_add(kim, { project: 'p1', title: 'Book room', due: 'next week' }), /YYYY-MM-DD/);
});
console.log(n + ' private to-do tool checks passed');
