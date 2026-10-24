// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get(k) { if (k === 'anthropic_api_key' && globalThis.__KEY) return globalThis.__KEY; throw new Error('no secret'); } }, llm: async ({ messages }) => ({ model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + messages[1].content.slice(0, 20) } }] }),
  db: {
    async get(c, k) { calls++; const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { calls++; assert.ok(KEY.test(k), 'bad key ' + k); assert.ok(/^[A-Za-z0-9._-]{1,64}$/.test(c), 'bad collection ' + c); const t = JSON.stringify(v); maxVal = Math.max(maxVal, t.length); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); },
    async delete(c, k) { calls++; (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { calls++; const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async uploadUrl(name) { const id = 'file_' + files.size; files.set(id, null); return { url: 'https://storage.example/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; } } });
const call = async (email, method, path, body) => {
  const [p, q] = path.split('?'); const sub = p.replace(/^\/api/, '');
  const req = { method, path: sub, query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body };
  const r = await handler(req, mkctx(email)); return { status: r.status, data: await r.json() };
};
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
// Scale check: 100 projects with realistic content; reports DB calls, time and payload size for the busiest endpoints.
const sam = 'sam.k@facilio.com', boss = 'dinesh.r@facilio.com'; const N = +process.env.N || 100;
const mark = async (label, fn) => { const c0 = calls, t0 = performance.now(); const r = await fn(); const ms = performance.now() - t0; console.log(label.padEnd(34), String(calls - c0).padStart(6), 'db calls', ms.toFixed(0).padStart(6), 'ms', r && r.size ? ' payload ' + (r.size / 1024).toFixed(0) + ' KB' : ''); return r; };
const ids = [];
await mark(`create ${N} projects with content`, async () => {
  for (let i = 0; i < N; i++) {
    const r = await call(sam, 'POST', '/api/projects', { name: 'Project ' + i, customer: 'Customer ' + (i % 40), description: 'seed' }); const id = r.data.project.id; ids.push(id);
    await call(sam, 'PUT', `/api/projects/${id}/docs/planner`, { data: { scope: Array.from({ length: 29 }, (_, k) => 'mod' + k), sessions: Array.from({ length: 6 }, (_, k) => ({ id: 's' + k, no: k + 1, date: '2026-10-' + String(10 + k), title: 'Session ' + k, modules: ['a', 'b'] })) }, baseVersion: 0 });
    await call(sam, 'PUT', `/api/projects/${id}/docs/workshop`, { data: { requirements: Array.from({ length: 60 }, (_, k) => ({ id: 'r' + k, text: 'Requirement text '.repeat(6), status: 'Draft', created: '2026-10-0' + (1 + k % 9) })), flows: {} }, baseVersion: 0 });
    for (let k = 0; k < 20; k++) await call(sam, 'PUT', `/api/projects/${id}/items/action/a${k}`, { data: { title: 'Action ' + k, status: k % 3 ? 'Open' : 'Done', due: '2026-10-1' + (k % 9) } });
  }
});
const sz = r => ({ size: JSON.stringify(r.data).length });
await mark('home: list my projects (admin)', async () => sz(await call(boss, 'GET', '/api/projects')));
await mark('admin dashboard (cold)', async () => sz(await call(boss, 'GET', '/api/admin/overview')));
await mark('admin dashboard (cached 15s)', async () => sz(await call(boss, 'GET', '/api/admin/overview')));
await mark('admin insights', async () => sz(await call(boss, 'GET', '/api/admin/insights')));
await mark('open one project (planner doc)', async () => sz(await call(sam, 'GET', `/api/projects/${ids[50]}/docs/planner`)));
console.log('largest single record', (maxVal / 1024).toFixed(1), 'KB of 128 KB');
