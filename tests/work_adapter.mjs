// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async ({ messages }) => ({ model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + messages[1].content.slice(0, 20) } }] }),
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
await t('AI: draft is server-made, unapproved, editor cannot self-approve, owner approves, edit reopens', async () => {
  let r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', instruction: 'x' }); assert.equal(r.status, 201, JSON.stringify(r.data)); const id = r.data.item.id; assert.equal(r.data.item.data.status, 'draft');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/ai/${id}`, { data: { status: 'approved', content: 'hacked' } }); assert.equal(r.data.item.data.status, 'draft', 'status cannot be set through the generic route');
  r = await call(out, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat' }); assert.ok(r.status === 403 || r.status === 404, 'no access to other projects');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/${id}/decision`, { decision: 'approve' }); assert.equal(r.data.item.data.status, 'approved');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/ai/${id}`, { data: { content: 'changed' } }); assert.equal(r.data.item.data.status, 'draft', 'edit reopens approved text');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'bogus' }); assert.equal(r.status, 400);
});
await t('templates: versions, publish needs admin, retire, project scope, AI uses template', async () => {
  let r = await call(sam, 'POST', '/api/templates', { name: 'BRD layout', kind: 'brd', scope: 'org', data: { body: '# Purpose\n# Scope' } }); assert.equal(r.status, 201); const id = r.data.item.id;
  r = await call(out, 'GET', '/api/templates'); assert.equal(r.data.items.length, 0, 'drafts are private to author and admins');
  r = await call(sam, 'POST', `/api/templates/${id}/status`, { action: 'publish' }); assert.equal(r.status, 403, 'consultant cannot publish org template');
  r = await call(dinesh, 'POST', `/api/templates/${id}/status`, { action: 'publish' }); assert.equal(r.data.item.status, 'published'); assert.equal(r.data.item.pub, 1);
  r = await call(sam, 'POST', `/api/templates/${id}/versions`, { data: { body: '# Purpose\n# Scope\n# Risks' }, note: 'added risks' }); assert.equal(r.data.v, 2);
  r = await call(out, 'GET', `/api/templates/${id}`); assert.equal(r.status, 200); assert.match(r.data.data.body, /Scope/); assert.equal(r.data.v, 1, 'readers get the published version');
  r = await call(sam, 'GET', `/api/templates/${id}?v=2`); assert.match(r.data.data.body, /Risks/);
  r = await call(sam, 'DELETE', `/api/templates/${id}`); assert.equal(r.status, 409);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'brd', templateId: id }); assert.equal(r.status, 201);
  r = await call(sam, 'PUT', `/api/projects/${pid}/docs/config_digest`, { data: { counts: { custom: 2 }, checks: ['medium | Custom module | Fleet | Not shown in any app tab'] } }); assert.ok(r.status === 200 || r.status === 201, 'digest saves: ' + r.status);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'pkg' }); assert.equal(r.status, 201); assert.ok(r.data.item.data.sources.some(x => /config_digest/.test(x.label)), 'digest is a cited source');
  r = await call(out, 'POST', '/api/templates', { name: 'x', kind: 'ftr', scope: 'project', projectId: pid, data: {} }); assert.ok(r.status === 404 || r.status === 403, 'outsider cannot add to a project');
  r = await call(sam, 'POST', '/api/templates', { name: 'FTR for Alpha', kind: 'ftr', scope: 'project', projectId: pid, data: { b64: 'AAAA' } }); assert.equal(r.status, 201); const pt = r.data.item.id;
  r = await call(out, 'GET', `/api/templates?projectId=${pid}`); assert.equal(r.data.items.length, 2, 'outsider is a viewer member here: sees project and published org templates');
  r = await call(sam, 'GET', `/api/templates?projectId=${pid}`); assert.equal(r.data.items.length, 2);
  r = await call(dinesh, 'POST', `/api/templates/${id}/status`, { action: 'retire' }); assert.equal(r.data.item.status, 'retired');
  r = await call(sam, 'DELETE', `/api/templates/${pt}`); assert.equal(r.status, 200);
});
await t('configuration inputs: three record kinds, evidence file category, used as AI sources', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/items/cmodx/m_custom_fleet`, { data: { name: 'custom_fleet', purpose: 'Track vehicles', usage: 'Open Fleet tab' } }); assert.ok(r.status === 200 || r.status === 201, 'cmodx ' + r.status);
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/cfgrel/cr_1`, { data: { from: 'Fleet', to: 'Work Order', type: 'Creates a record', outcome: 'WO created on failed inspection' } }); assert.ok(r.status === 200 || r.status === 201, 'cfgrel ' + r.status);
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/capp/ap_1`, { data: { name: 'Driver app', tabs: [{ name: 'Trips', roles: 'Driver' }] } }); assert.ok(r.status === 200 || r.status === 201, 'capp ' + r.status);
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/lesson/ls_1`, { data: { title: 'Confirm roles early', area: 'Workshops', impact: 'High', reusable: true } }); assert.ok(r.status === 200 || r.status === 201, 'lesson ' + r.status);
  r = await call(sam, 'GET', '/api/knowledge'); assert.equal(r.status, 200); assert.ok(r.data.items.some(x => x.title === 'Confirm roles early'), 'knowledge library lists reusable lessons');
  r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'config_evidence', name: 'screen.png', mime: 'image/png', size: 1000, meta: {} }); assert.equal(r.status, 201, 'evidence upload allowed');
  r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'config_evidence', name: 'x.exe', mime: 'application/octet-stream', size: 10, meta: {} }); assert.ok(r.status >= 400, 'executables refused');
  for (const task of ['gaps', 'guide', 'uat', 'training', 'handover']) { r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task }); assert.equal(r.status, 201, task); const lab = r.data.item.data.sources.map(x => x.label).join('|'); assert.match(lab, /cmodx/, task + ' uses module descriptions'); assert.match(lab, /cfgrel/); assert.match(lab, /capp/); }
  r = await call(out, 'PUT', `/api/projects/${pid}/items/cfgrel/cr_2`, { data: { from: 'a', to: 'b' } }); assert.ok(r.status === 403 || r.status === 404, 'viewer cannot write');
});
await t('guides and walkthroughs: approval only by the owner route, edits reopen, AI drafts steps from a walkthrough', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/items/ugd/ug_1`, { data: { title: 'Guide', sections: [{ id: 's1', title: 'A', blocks: [{ t: 'md', text: 'x' }] }], status: 'approved', approvedBy: 'me' } }); assert.equal(r.data.item.data.status, 'draft', 'cannot create as approved');
  assert.equal(r.data.item.data.approvedBy, null);
  r = await call(sam, 'POST', `/api/projects/${pid}/ugd/ug_1/decision`, { decision: 'approve' }); assert.equal(r.status, 200); assert.equal(r.data.item.data.status, 'approved');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/ugd/ug_1`, { data: { title: 'Guide', sections: [{ id: 's1', title: 'A', blocks: [{ t: 'md', text: 'changed' }] }], status: 'approved' } }); assert.equal(r.data.item.data.status, 'draft', 'editing approved content reopens it');
  r = await call(out, 'POST', `/api/projects/${pid}/ugd/ug_1/decision`, { decision: 'approve' }); assert.ok(r.status === 403 || r.status === 404, 'viewer cannot approve');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/vid/vd_1`, { data: { title: 'Raise a WO', transcript: [{ t: 3, text: 'Click New' }, { t: 9, text: 'Type the title' }], frames: [{ t: 3, caption: 'New button', fileId: 'file_0' }] } }); assert.ok(r.status === 200 || r.status === 201);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'vidguide', vid: 'vd_1' }); assert.equal(r.status, 201, JSON.stringify(r.data)); assert.equal(r.data.item.data.vid, 'vd_1'); assert.match(r.data.item.data.sources.map(x => x.label).join('|'), /transcript/);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'vidguide', vid: 'nope' }); assert.equal(r.status, 404);
  r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'guide_media', name: 'f.jpg', mime: 'image/jpeg', size: 1000, meta: {} }); assert.equal(r.status, 201);
  r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'guide_media', name: 'f.svg', mime: 'image/svg+xml', size: 1000, meta: {} }); assert.ok(r.status >= 400, 'svg refused');
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
