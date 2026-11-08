// project_jobs action list with NO project: the waiting jobs of every project the person can open, in one call (the cheap idle check of the fast chat lane). Run: node tests/jobs_all.mjs
import assert from 'node:assert/strict';
import { newJob, cleanRequest } from '../work/server/_jobs.mjs';
import { installJobs } from '../work/server/_jobsapi.mjs';
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const NOW = new Date().toISOString(); const mk = (id, kind, status) => { const c = cleanRequest({ kind, note: 'hello', ref: id, section: 'tasks' }); assert.ok(c.ok, JSON.stringify(c)); return Object.assign(newJob('jb_' + id.padStart(18, '0'), c, 'a@b.c', NOW), { status }); };
const rows = { p1: [mk('1', 'chat', 'waiting'), mk('2', 'make_wsr', 'waiting'), mk('3', 'chat', 'done')], p2: [mk('4', 'chat', 'waiting')], p3: [] };
const CONNECTOR = {};
installJobs({ route() { }, ok: x => x, HttpError, me: async () => ({}), projectAccess: async () => ({ role: 'edit' }), pickProject: async () => ({ id: 'p1', name: 'One' }), readableProjects: async () => [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }, { id: 'p3', name: 'Three' }, { id: 'p4', name: 'Locked' }],
  dbGet: async () => null, dbPut: async () => { }, dbList: async col => { const id = col.replace('jb.', ''); if (id === 'p4') throw new Error('no access'); return (rows[id] || []).map(v => ({ value: v })); }, withLock: async (k, fn) => fn(), audit: async () => { }, CONNECTOR, rid: () => 'x', CTX: {} });
let n = 0; const t = async (name, fn) => { await fn(); n++; };
await t('no project: every project with waiting jobs, done jobs left out, an unreadable project skipped', async () => { const r = await CONNECTOR.jobs_list({ id: 'u' }, {}); assert.equal(r.waiting, 3); assert.deepEqual(r.projects.map(p => p.project), ['One', 'Two']); assert.deepEqual(r.projects[0].jobs.map(j => j.kind).sort(), ['chat', 'make_wsr']); });
await t('kind chat narrows it to chat jobs', async () => { const r = await CONNECTOR.jobs_list({ id: 'u' }, { kind: 'chat' }); assert.equal(r.waiting, 2); assert.ok(r.projects.every(p => p.jobs.every(j => j.kind === 'chat'))); });
await t('nothing waiting says so in one line', async () => { rows.p1 = []; rows.p2 = []; const r = await CONNECTOR.jobs_list({ id: 'u' }, {}); assert.equal(r.waiting, 0); assert.deepEqual(r.projects, []); assert.match(r.note, /No waiting jobs/); });
await t('with a project it still lists that project as before', async () => { rows.p1 = [mk('5', 'chat', 'waiting')]; const r = await CONNECTOR.jobs_list({ id: 'u' }, { project: 'One' }); assert.equal(r.project, 'One'); assert.equal(r.jobs.length, 1); });
console.log('jobs_all: ' + n + ' checks passed');
