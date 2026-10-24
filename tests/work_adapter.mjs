// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' },
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
const dinesh = 'dinesh.r@facilio.com', sam = 'sam.k@facilio.com', out = 'outsider@facilio.com', lead = 'lead.one@facilio.com';
let pid;
await t('identity comes from the platform, not the page', async () => {
  let r = await call(dinesh, 'GET', '/api/auth/me'); assert.equal(r.data.user.email, dinesh); assert.equal(r.data.user.adminRole, 'super');
  r = await call(sam, 'GET', '/api/auth/me'); assert.equal(r.data.user.adminRole, null); assert.equal(r.data.user.name, 'Sam K');
});
await t('projects: create, list, access', async () => {
  let r = await call(sam, 'POST', '/api/projects', { name: 'Alpha', customer: 'Acme', description: 'x' }); assert.equal(r.status, 201); pid = r.data.project.id;
  r = await call(sam, 'GET', '/api/projects'); assert.equal(r.data.projects.length, 1);
  r = await call(out, 'GET', '/api/projects'); assert.equal(r.data.projects.length, 0); r = await call(out, 'GET', `/api/projects/${pid}`); assert.equal(r.status, 404);
  r = await call(dinesh, 'GET', '/api/projects'); assert.equal(r.data.projects.length, 1, 'super admin sees all');
});
await t('documents: versions, conflicts, large records split and round-trip', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/docs/planner`, { data: { scope: ['a'] }, baseVersion: 0 }); assert.equal(r.status, 200);
  r = await call(sam, 'PUT', `/api/projects/${pid}/docs/planner`, { data: { scope: ['b'] }, baseVersion: 0 }); assert.equal(r.status, 409);
  const big = { rows: Array.from({ length: 4000 }, (_, i) => ({ i, id: crypto.randomUUID(), t: crypto.randomUUID() })) };
  r = await call(sam, 'PUT', `/api/projects/${pid}/docs/workshop`, { data: big, baseVersion: 0 }); assert.equal(r.status, 200);
  r = await call(sam, 'GET', `/api/projects/${pid}/docs/workshop`); assert.deepEqual(r.data.data, big); assert.ok(maxVal <= 128 * 1024);
  r = await call(out, 'GET', `/api/projects/${pid}/docs/workshop`); assert.equal(r.status, 404);
});
await t('items and members', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/items/action/a1`, { data: { title: 'T', status: 'Open' } }); assert.equal(r.status, 200);
  r = await call(sam, 'GET', `/api/projects/${pid}/items?kinds=action`); assert.equal(r.data.items.length, 1);
  r = await call(sam, 'POST', `/api/projects/${pid}/members`, { email: 'x@gmail.com', role: 'viewer' }); assert.equal(r.status, 400);
  r = await call(sam, 'POST', `/api/projects/${pid}/members`, { email: out, role: 'viewer' }); assert.equal(r.status, 201);
  r = await call(out, 'GET', '/api/projects'); assert.equal(r.data.projects[0].role, 'viewer'); r = await call(out, 'PUT', `/api/projects/${pid}/items/action/a2`, { data: { title: 'no' } }); assert.equal(r.status, 403);
});
await t('files: upload link, record part, complete, list, download link', async () => {
  const size = 5;
  let r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'plan.xlsx', mime: 'x', size }); assert.equal(r.status, 201); const fid = r.data.id;
  r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/chunks/0/url`, {}); assert.equal(r.status, 200); const part = r.data.fileId; assert.ok(r.data.url.startsWith('https://'));
  r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}); assert.equal(r.status, 400, 'part not recorded yet');
  r = await call(sam, 'PUT', `/api/projects/${pid}/files/${fid}/chunks/0`, { fileId: part }); assert.equal(r.status, 200);
  r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}); assert.equal(r.status, 200);
  r = await call(sam, 'GET', `/api/projects/${pid}/files?category=plan`); assert.equal(r.data.files.length, 1);
  r = await call(sam, 'GET', `/api/projects/${pid}/files/${fid}/chunks/0`); assert.ok(r.data.url.includes('/get/')); r = await call(dinesh, 'GET', `/api/projects/${pid}/files/${fid}/chunks/0`); assert.equal(r.status, 200);
  r = await call('stranger@facilio.com', 'GET', `/api/projects/${pid}/files/${fid}/chunks/0`); assert.equal(r.status, 404);
  r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'plan.exe', mime: 'x', size }); assert.equal(r.status, 415);
});
await t('admin: only granted people, enforced on the server', async () => {
  let r = await call(sam, 'GET', '/api/admin/overview'); assert.equal(r.status, 403);
  r = await call(dinesh, 'GET', '/api/admin/overview'); assert.equal(r.status, 200); assert.ok(r.data.projects.find(p => p.id === pid));
  r = await call(sam, 'POST', '/api/admin/access', { email: sam, role: 'admin' }); assert.equal(r.status, 403, 'cannot grant yourself');
  r = await call(dinesh, 'POST', '/api/admin/access', { email: lead, role: 'admin' }); assert.equal(r.status, 200);
  r = await call(lead, 'GET', '/api/admin/overview'); assert.equal(r.status, 200); r = await call(lead, 'GET', '/api/admin/access'); assert.equal(r.status, 403);
  r = await call(lead, 'GET', '/api/admin/users'); const u = r.data.users.find(x => x.email === sam); r = await call(lead, 'PATCH', '/api/admin/users/' + encodeURIComponent(u.id), { disabled: true }); assert.equal(r.status, 200);
  r = await call(sam, 'GET', '/api/projects'); assert.equal(r.status, 403, 'disabled people are locked out');
  r = await call(dinesh, 'POST', '/api/admin/access/revoke', { email: lead }); r = await call(lead, 'GET', '/api/admin/overview'); assert.equal(r.status, 403, 'revoked admin loses access at once');
  r = await call(dinesh, 'GET', '/api/admin/insights'); assert.equal(r.status, 200); r = await call(dinesh, 'GET', '/api/admin/audit'); assert.ok(r.data.entries.length > 2);
});
await t('unknown routes and customer sign-in are refused', async () => {
  let r = await call(dinesh, 'GET', '/api/nothing'); assert.equal(r.status, 404); r = await call(dinesh, 'POST', '/api/auth/login', {}); assert.equal(r.status, 403);
});
console.log(`\n${n} checks passed, ${calls} storage calls, largest record ${(maxVal / 1024).toFixed(1)} KB`);
