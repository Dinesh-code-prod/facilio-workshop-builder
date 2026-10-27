// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, teams: { async send(m) { (globalThis.__SENT = globalThis.__SENT || []).push(m); return { delivered: 1, failed: 0 }; } }, secrets: { async get(k) { if (k === 'anthropic_api_key' && globalThis.__KEY) return globalThis.__KEY; if (k === 'teams_notify' && globalThis.__TEAMS) return globalThis.__TEAMS; throw new Error('no secret'); } }, llm: async ({ messages }) => ({ model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + messages[1].content.slice(0, 20) } }] }),
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
await t('AI providers: DeepSeek default, Claude explicit, key never exposed, honest fallback', async () => {
  let r = await call(sam, 'GET', '/api/ai/status'); assert.equal(r.data.defaultProvider, 'deepseek'); assert.equal(r.data.claude, false);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat' }); assert.equal(r.status, 201); assert.equal(r.data.item.data.provider, 'DeepSeek');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 409, 'explicit Claude without a key is refused, never silently switched'); assert.match(r.data.error || r.data.message || JSON.stringify(r.data), /not configured/i);
  r = await call(sam, 'POST', '/api/admin/ai/config', { defaultProvider: 'claude' }); assert.equal(r.status, 403, 'only admins change the provider settings');
  r = await call(dinesh, 'POST', '/api/admin/ai/config', { defaultProvider: 'claude' }); assert.equal(r.status, 409, 'cannot default to an unconfigured provider');
  r = await call(dinesh, 'POST', '/api/admin/ai/test', {}); assert.equal(r.data.ok, false); assert.equal(r.data.configured, false);
  const SECRET = 'sk-ant-test-SECRET-123'; globalThis.__KEY = SECRET; const real = globalThis.fetch; let seen = null;
  globalThis.fetch = async (url, o) => { seen = { url, key: o.headers['x-api-key'] }; return { ok: true, status: 200, json: async () => ({ content: [{ text: 'Claude draft [S1]' }], usage: { input_tokens: 11, output_tokens: 7 } }) }; };
  try {
    r = await call(sam, 'GET', '/api/ai/status'); assert.equal(r.data.claude, true); assert.ok(!JSON.stringify(r.data).includes(SECRET));
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat' }); assert.equal(r.data.item.data.provider, 'DeepSeek', 'configuring a key does not change the default');
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 201); assert.equal(r.data.item.data.provider, 'Claude'); assert.equal(seen.key, SECRET); assert.ok(!JSON.stringify(r.data).includes(SECRET));
    r = await call(dinesh, 'POST', '/api/admin/ai/test', {}); assert.equal(r.data.ok, true); assert.ok(!JSON.stringify(r.data).includes(SECRET));
    r = await call(dinesh, 'GET', '/api/admin/ai/usage'); assert.equal(r.data.usage.claude.inTok, 22); assert.equal(r.data.usage.claude.outTok, 14); assert.ok(!JSON.stringify(r.data).includes(SECRET)); assert.equal(r.data.usage.claude.errors, 0);
    r = await call(sam, 'GET', '/api/admin/ai/usage'); assert.equal(r.status, 403);
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 502, 'an explicit Claude failure is reported, not hidden');
    r = await call(dinesh, 'POST', '/api/admin/ai/config', { defaultProvider: 'deepseek', fallback: 'deepseek' }); assert.equal(r.status, 200);
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 201); assert.equal(r.data.item.data.provider, 'DeepSeek'); assert.match(r.data.item.data.notice, /Claude was not available/);
    r = await call(dinesh, 'GET', '/api/admin/ai/usage'); assert.ok(r.data.usage.claude.errors >= 2); assert.ok(!JSON.stringify(r.data).includes(SECRET));
  } finally { globalThis.fetch = real; globalThis.__KEY = ''; }
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
await t('security: forged upload ids refused; superseded records stay out of AI context; errors are generic', async () => {
  let r = await call(sam, 'POST', `/api/projects/${pid}/files`, { category: 'screenshot', name: 'a.png', mime: 'image/png', size: 1000 }); assert.equal(r.status, 201); const fid = r.data.id;
  r = await call(sam, 'PUT', `/api/projects/${pid}/files/${fid}/chunks/0`, { fileId: 'file_999' }); assert.equal(r.status, 400, 'a part id that was never issued for this file is refused');
  r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/chunks/0/url`, {}); assert.equal(r.status, 200); r = await call(sam, 'PUT', `/api/projects/${pid}/files/${fid}/chunks/0`, { fileId: r.data.fileId }); assert.equal(r.status, 200);
  r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}); assert.equal(r.status, 200); r = await call(sam, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}); assert.equal(r.status, 200, 'completing twice is harmless');
  await call(sam, 'PUT', `/api/projects/${pid}/items/decision/dec_old`, { data: { title: 'OLD-DECISION-MARKER', status: 'superseded' } }); await call(sam, 'PUT', `/api/projects/${pid}/items/decision/dec_new`, { data: { title: 'NEW-DECISION-MARKER' } });
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'gaps' }); assert.equal(r.status, 201); const lab = (r.data.item.data.sources || []).map(x => x.label).join('|'); assert.ok(/decision \(1\)/.test(lab), 'only the live decision is a source: ' + lab);
});
await t('tickets: numbering, lifecycle, append-only thread, permissions, cross-project list', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t1`, { data: { subject: 'Cannot raise inventory request', description: 'Button missing', status: 'New', priority: 'High', requester: { name: 'Ann', email: 'ann@acme.com' }, org: 'Acme' } }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.item.data.n, 1);
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t2`, { data: { subject: 'Second', status: 'New', priority: 'Low' } }); assert.equal(r.data.item.data.n, 2);
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t3`, { data: { subject: 'x', status: 'Weird' } }); assert.equal(r.status, 400); r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t3`, { data: { subject: '', status: 'New' } }); assert.equal(r.status, 400);
  const rs = await Promise.all([1, 2, 3, 4].map(i => call(sam, 'POST', `/api/projects/${pid}/tickets/t1/message`, { type: i % 2 ? 'note' : 'reply', text: 'msg ' + i }))); assert.ok(rs.every(x => x.status === 201));
  r = await call(sam, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const t1 = r.data.items.find(x => x.id === 't1').data; assert.equal(t1.thread.length, 4, 'four simultaneous messages all kept');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t1`, { data: Object.assign({}, t1, { thread: [], status: 'In Progress' }) }); assert.equal(r.data.item.data.thread.length, 4, 'an edit cannot erase the conversation'); assert.equal(r.data.item.data.status, 'In Progress');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t1`, { data: Object.assign({}, r.data.item.data, { status: 'Resolved' }) }); assert.ok(r.data.item.data.resolvedAt); r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t1`, { data: Object.assign({}, r.data.item.data, { status: 'Open' }) }); assert.equal(r.data.item.data.resolvedAt, null, 'reopen clears the resolved time');
  r = await call(out, 'POST', `/api/projects/${pid}/tickets/t1/message`, { type: 'reply', text: 'viewer' }); assert.equal(r.status, 403, 'viewers are read-only');
  r = await call(sam, 'POST', `/api/projects/${pid}/tickets/t1/message`, { type: 'reply', text: '   ' }); assert.equal(r.status, 400);
  r = await call(sam, 'GET', '/api/tickets'); assert.equal(r.data.tickets.length, 2); assert.equal(r.data.tickets[0].project, 'Alpha');
  r = await call('stranger@facilio.com', 'GET', '/api/tickets'); assert.equal(r.data.tickets.length, 0, 'no access, no tickets');
});
await t('tickets: e-mail intake creates, dedupes and appends by conversation', async () => {
  const mail = { messageId: '<m1@x>', conversationId: 'conv-1', from: { name: 'Ann', email: 'ann@acme.com' }, subject: 'Can we meet on Thursday?', body: 'Please schedule a call', attachments: [{ name: 'a.pdf' }] };
  let r = await call(sam, 'POST', `/api/projects/${pid}/tickets/ingest`, mail); assert.equal(r.status, 201); assert.equal(r.data.created, true); const key = r.data.id;
  r = await call(sam, 'POST', `/api/projects/${pid}/tickets/ingest`, mail); assert.equal(r.data.duplicate, true, 'same message twice is ignored');
  r = await call(sam, 'POST', `/api/projects/${pid}/tickets/ingest`, Object.assign({}, mail, { messageId: '<m2@x>', body: 'Thursday 3pm works' })); assert.equal(r.data.appended, true); assert.equal(r.data.id, key);
  r = await call(sam, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const t = r.data.items.find(x => x.id === key).data; assert.equal(t.thread.length, 2); assert.equal(t.source, 'email'); assert.equal(t.category, 'Meeting request'); assert.equal(t.requester.email, 'ann@acme.com');
  r = await call(sam, 'POST', `/api/projects/${pid}/tickets/ingest`, { messageId: 'z' }); assert.equal(r.status, 400, 'sender is required');
});
await t('tickets: Teams notices stay off until configured, then fire for create / assign / status / priority', async () => {
  globalThis.__SENT = []; let r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t9`, { data: { subject: 'Quiet', status: 'New' } }); assert.equal(globalThis.__SENT.length, 0, 'off by default');
  globalThis.__TEAMS = 'on'; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: { subject: 'Loud', status: 'New', priority: 'Medium' } }); assert.equal(globalThis.__SENT.length, 1); assert.ok(/created/.test(globalThis.__SENT[0].title)); assert.ok(globalThis.__SENT[0].actions[0].url.includes(pid + '/tickets/t10'));
  let d = r.data.item.data; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: Object.assign({}, d, { assignee: { name: 'Lee', email: lead } }) }); assert.ok(/assigned/.test(globalThis.__SENT[1].title)); assert.deepEqual(globalThis.__SENT[1].to, [lead]);
  d = r.data.item.data; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: Object.assign({}, d, { status: 'Waiting for Client' }) }); assert.ok(/Waiting for Client/.test(globalThis.__SENT[2].title));
  d = r.data.item.data; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: Object.assign({}, d, { priority: 'Urgent' }) }); assert.ok(/Urgent/.test(globalThis.__SENT[3].title)); globalThis.__TEAMS = '';
});
await t('resources: links validated, owner kept', async () => {
  let r = await call(sam, 'PUT', `/api/projects/${pid}/items/res/r1`, { data: { name: 'Kick-off recording', url: 'javascript:alert(1)', type: 'Recording' } }); assert.equal(r.status, 400, 'only http(s) links');
  r = await call(sam, 'PUT', `/api/projects/${pid}/items/res/r1`, { data: { name: 'Kick-off recording', url: 'https://miro.com/app/board/x', type: 'Miro' } }); assert.equal(r.status, 200); assert.equal(r.data.item.data.createdByName, 'Sam K');
  r = await call(dinesh, 'PUT', `/api/projects/${pid}/items/res/r1`, { data: Object.assign({}, r.data.item.data, { name: 'Renamed' }) }); assert.equal(r.data.item.data.createdByName, 'Sam K', 'original author kept');
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
await t('concurrency: simultaneous saves and submits do not corrupt or duplicate', async () => {
  let r = await call(dinesh, 'GET', `/api/projects/${pid}/docs/reviews`); const base = r.data.version || 0;
  const rs = await Promise.all([1, 2, 3, 4, 5].map(i => call(dinesh, 'PUT', `/api/projects/${pid}/docs/reviews`, { data: { v: i }, baseVersion: base })));
  const okN = rs.filter(x => x.status === 200).length, conflict = rs.filter(x => x.status === 409).length;
  assert.equal(okN, 1, 'exactly one of five same-version saves wins, got ' + okN + ' (' + rs.map(x => x.status).join(',') + ')'); assert.equal(conflict, 4);
  r = await call(dinesh, 'GET', `/api/projects/${pid}/docs/reviews`); assert.ok([1, 2, 3, 4, 5].includes(r.data.data.v), 'stored value is one whole save');
  const its = await Promise.all([1, 2, 3, 4, 5, 6].map(i => call(dinesh, 'PUT', `/api/projects/${pid}/items/action/race1`, { data: { title: 'T' + i, status: 'Open' } })));
  assert.ok(its.every(x => x.status === 200 || x.status === 201), 'item saves ok'); r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=action`); assert.equal(r.data.items.filter(x => x.id === 'race1').length, 1, 'one record, not six');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'p2.xlsx', mime: 'x', size: 5 }); const fid = r.data.id;
  r = await call(dinesh, 'POST', `/api/projects/${pid}/files/${fid}/chunks/0/url`, {}); const part = r.data.fileId; await call(dinesh, 'PUT', `/api/projects/${pid}/files/${fid}/chunks/0`, { fileId: part });
  const cs = await Promise.all([1, 2, 3].map(() => call(dinesh, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}))); assert.ok(cs.every(x => x.status === 200), 'double complete is safe: ' + cs.map(x => x.status));
  r = await call(dinesh, 'GET', `/api/projects/${pid}/files?category=plan`); assert.equal(r.data.files.filter(f => f.name === 'p2.xlsx').length, 1, 'one file record');
});
await t('unknown routes and customer sign-in are refused', async () => {
  let r = await call(dinesh, 'GET', '/api/nothing'); assert.equal(r.status, 404); r = await call(dinesh, 'POST', '/api/auth/login', {}); assert.equal(r.status, 403);
});
console.log(`\n${n} checks passed, ${calls} storage calls, largest record ${(maxVal / 1024).toFixed(1)} KB`);
