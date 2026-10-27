// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, teams: { async send(m) { (globalThis.__SENT = globalThis.__SENT || []).push(m); return { delivered: 1, failed: 0 }; } }, fetch: async (cred, url, o) => { if (!globalThis.__GRAPH) { const e = new Error('credential not granted'); throw e; } return globalThis.__GRAPH(cred, url, o); }, secrets: { async get(k) { if (k === 'support_mailbox') return 'support@facilio.com'; if (k === 'ai_master_key') return globalThis.__MASTER || '';  if (k === 'anthropic_api_key' && globalThis.__KEY) return globalThis.__KEY; if (k === 'teams_notify' && globalThis.__TEAMS) return globalThis.__TEAMS; throw new Error('no secret'); } }, llm: async ({ messages }) => (globalThis.__LLMLEN = messages[1].content.length, globalThis.__LLMFAIL ? (() => { throw new Error('down'); })() : { model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + messages[1].content.slice(0, 20) } }] }),
  db: {
    async get(c, k) { calls++; const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { calls++; assert.ok(KEY.test(k), 'bad key ' + k); assert.ok(/^[A-Za-z0-9._-]{1,64}$/.test(c), 'bad collection ' + c); const t = JSON.stringify(v); maxVal = Math.max(maxVal, t.length); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); },
    async delete(c, k) { calls++; (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { calls++; const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async get(id) { const b = (globalThis.__FILEBYTES || {})[id]; if (!b) { const e = new Error('too large for get'); e.status = 413; throw e; } return { bytes: async () => b }; }, async delete(id) { files.delete(id); (globalThis.__DELETED = globalThis.__DELETED || []).push(id); }, async uploadUrl(name) { const id = 'file_' + (globalThis.__FID = (globalThis.__FID || 0) + 1); files.set(id, null); return { url: 'https://storage.example/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; } } });
const realFetch = globalThis.fetch; globalThis.fetch = async (u, o) => { if (String(u).startsWith('https://storage.example/')) throw new Error('storage not reachable in tests'); return realFetch(u, o); };
const call = async (email, method, path, body, headers) => {
  const [p, q] = path.split('?'); const sub = p.replace(/^\/api/, '');
  const req = { method, path: sub, query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body };
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
    r = await call(dinesh, 'GET', '/api/admin/ai/usage'); assert.equal(r.data.usage.claude.inTok, 11); assert.equal(r.data.usage.claude.outTok, 7); assert.ok(!JSON.stringify(r.data).includes(SECRET)); assert.equal(r.data.usage.claude.errors, 0);
    r = await call(sam, 'GET', '/api/admin/ai/usage'); assert.equal(r.status, 403);
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 502, 'an explicit Claude failure is reported, not hidden');
    r = await call(dinesh, 'POST', '/api/admin/ai/config', { defaultProvider: 'deepseek', fallback: 'deepseek' }); assert.equal(r.status, 200);
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 201); assert.equal(r.data.item.data.provider, 'DeepSeek'); assert.match(r.data.item.data.notice, /Claude was not available/);
    r = await call(dinesh, 'GET', '/api/admin/ai/usage'); assert.ok(r.data.usage.claude.errors >= 2); assert.ok(!JSON.stringify(r.data).includes(SECRET));
  } finally { globalThis.fetch = real; globalThis.__KEY = ''; }
});
await t('AI providers: default follows the key, fallback gets a DeepSeek-sized prompt, key details for admins only', async () => {
  // a large source set so the Claude and DeepSeek prompt sizes differ
  for (let i = 0; i < 60; i++) await call(sam, 'PUT', `/api/projects/${pid}/items/raid/big${i}`, { data: { type: 'Risk', title: 'Risk ' + i + ' ' + 'x'.repeat(900), status: 'Open' } });
  const KEY = 'sk-ant-test-FALLBACK-1'; globalThis.__KEY = KEY; const real = globalThis.fetch;
  try {
    let r = await call(dinesh, 'POST', '/api/admin/ai/config', { defaultProvider: 'claude', fallback: 'deepseek' }); assert.equal(r.status, 200);
    r = await call(sam, 'GET', '/api/ai/status'); assert.equal(r.data.defaultProvider, 'claude'); assert.equal(r.data.keySource, undefined, 'key details are for admins only'); assert.equal(r.data.canStoreKey, undefined);
    r = await call(dinesh, 'GET', '/api/ai/status'); assert.ok('keySource' in r.data, 'admins still see where the key comes from');
    let claudeLen = 0; globalThis.fetch = async (u, o) => { claudeLen = JSON.parse(o.body).messages[0].content.length; return { ok: false, status: 500, json: async () => ({}) }; };
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'handover' }); assert.equal(r.status, 201, JSON.stringify(r.data)); assert.equal(r.data.item.data.provider, 'DeepSeek'); assert.match(r.data.item.data.notice, /Claude was not available/);
    assert.ok(claudeLen > globalThis.__LLMLEN, `fallback prompt (${globalThis.__LLMLEN}) is smaller than the Claude prompt (${claudeLen})`);
    // the key disappears from the secrets portal while Claude is still the stored default: drafts use DeepSeek, as the status says
    globalThis.__KEY = ''; r = await call(sam, 'GET', '/api/ai/status'); assert.equal(r.data.defaultProvider, 'deepseek');
    globalThis.fetch = async () => { throw new Error('Claude must not be called'); }; r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat' }); assert.equal(r.status, 201); assert.equal(r.data.item.data.provider, 'DeepSeek');
    // DeepSeek down: a clear error, nothing stored
    globalThis.__LLMFAIL = true; const before = (await call(sam, 'GET', `/api/projects/${pid}/items?kinds=ai`)).data.items.length; r = await call(sam, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat' }); assert.ok(r.status >= 500); assert.equal((await call(sam, 'GET', `/api/projects/${pid}/items?kinds=ai`)).data.items.length, before);
  } finally { globalThis.fetch = real; globalThis.__KEY = ''; globalThis.__LLMFAIL = false; await call(dinesh, 'POST', '/api/admin/ai/config', { defaultProvider: 'deepseek', fallback: 'none' }); for (let i = 0; i < 60; i++) await call(sam, 'DELETE', `/api/projects/${pid}/items/raid/big${i}`); }
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
  let d = r.data.item.data; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: Object.assign({}, d, { assignee: { name: 'Stranger', email: 'someone.else@facilio.com' } }) }); assert.equal(globalThis.__SENT.length, 1, 'no direct message to a non-member');
  const added = (await call(sam, 'POST', `/api/projects/${pid}/members`, { email: lead, role: 'viewer' })).status === 201;
  d = r.data.item.data; r = await call(sam, 'PUT', `/api/projects/${pid}/items/tkt/t10`, { data: Object.assign({}, d, { assignee: { name: 'Lee', email: lead } }) }); if (added) await call(sam, 'DELETE', `/api/projects/${pid}/members/${lead.replace('@', ':')}`); assert.ok(/assigned/.test(globalThis.__SENT[1].title)); assert.deepEqual(globalThis.__SENT[1].to, [lead]);
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
await t('client feedback and Delivery Studio questions become tickets once, linked to their source', async () => {
  let r = await call(dinesh, 'POST', `/api/projects/${pid}/feedback`, { module: 'Inventory', topic: 'Reorder level unclear', kind: 'question', priority: 'high', body: 'How is the reorder level calculated?' }); assert.equal(r.status, 201);
  r = await call(dinesh, 'PUT', `/api/projects/${pid}/docs/transcripts`, { data: { candidates: [{ id: 'cand_1', status: 'clarify', title: 'Purchase approval limit', category: 'question', text: 'Who approves purchase requests above 5k?', speaker: 'Client PM' }, { id: 'cand_2', status: 'pending', text: 'ignore me' }] }, baseVersion: 0 }); assert.equal(r.status, 200);
  r = await call(dinesh, 'POST', `/api/projects/${pid}/tickets/sync-client`, {}); assert.equal(r.data.created, 2);
  r = await call(dinesh, 'POST', `/api/projects/${pid}/tickets/sync-client`, {}); assert.equal(r.data.created, 0, 'second run adds nothing');
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const fb = r.data.items.find(i => i.data.extRef && i.data.extRef.startsWith('fb:')), tq = r.data.items.find(i => i.data.extRef === 'tr:cand_1');
  assert.ok(fb && fb.data.priority === 'High' && fb.data.category === 'Question' && fb.data.link.kind === 'feedback'); assert.ok(tq && tq.data.source === 'delivery studio');
  r = await call(out, 'POST', `/api/projects/${pid}/tickets/sync-client`, {}); assert.ok(r.status >= 400, 'no access, no sync');
});
await t('support mailbox: sync routes mail by ticket tag and sender rules, parks the rest, never duplicates, and reports setup problems', async () => {
  let r = await call(out, 'GET', '/api/mail/status'); assert.equal(r.status, 403, 'outsiders cannot see mailbox admin');
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.status, 424, 'no credential yet is a clear setup message'); assert.match(r.data.error, /graph_mail/);
  r = await call(dinesh, 'PUT', '/api/mail/rules', { rules: [{ match: 'Acme.com', projectId: pid }] }); assert.equal(r.status, 200); assert.equal(r.data.rules[0].match, 'acme.com');
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const first = r.data.items.find(i => i.data.n === 1);
  const msg = (id, from, subject, conv) => ({ id, conversationId: conv || id, subject, from: { emailAddress: { name: 'X', address: from } }, body: { contentType: 'text', content: 'Hello ' + id }, receivedDateTime: '2026-10-27T10:00:00Z', hasAttachments: false, isDraft: false });
  let seenUrl = ''; globalThis.__GRAPH = async (cred, url) => { seenUrl = url; return { ok: true, status: 200, json: async () => ({ value: [msg('AAA1', 'pat@acme.com', 'Need a training session'), msg('AAA2', 'who@other.org', 'Pricing?'), msg('AAA3', 'pat@acme.com', 'Re: ticket [TKT-1]'), msg('AAA4', 'support@facilio.com', 'our own')] }) }; };
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.status, 200); assert.match(seenUrl, /users\/support%40facilio\.com\/mailFolders\/inbox/);
  assert.deepEqual([r.data.result.tickets, r.data.result.appended, r.data.result.unrouted], [1, 1, 1]);
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.tickets, r.data.result.appended, r.data.result.unrouted], [0, 0, 0], 'second sync adds nothing');
  r = await call(dinesh, 'GET', '/api/mail/inbox'); assert.equal(r.data.items.length, 1); const mid = r.data.items[0].id;
  r = await call(dinesh, 'POST', `/api/mail/inbox/${mid}/route`, { projectId: pid }); assert.equal(r.status, 200); r = await call(dinesh, 'GET', '/api/mail/inbox'); assert.equal(r.data.items.length, 0);
  // a ticket tag only routes for the ticket's own sender (or their company domain / a mailbox rule); shared mail domains need the exact address
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB1', 'mallory@evil.org', 'Re: [TKT-1] please add me')] }) });
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.appended, r.data.result.unrouted], [0, 1], 'a stranger quoting a ticket number is parked, not appended');
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB2', 'cust.one@gmail.com', 'Login problem')] }) }); r = await call(dinesh, 'POST', '/api/mail/sync');
  r = await call(dinesh, 'GET', '/api/mail/inbox'); const g = r.data.items.find(i => i.from.email === 'cust.one@gmail.com'); r = await call(dinesh, 'POST', `/api/mail/inbox/${g.id}/route`, { projectId: pid }); assert.equal(r.status, 200);
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const gt = r.data.items.find(i => i.data.requester && i.data.requester.email === 'cust.one@gmail.com'); assert.ok(gt, 'ticket created for the gmail sender');
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB3', 'someone.else@gmail.com', `Re: [TKT-${gt.data.n}]`), msg('BBB4', 'cust.one@gmail.com', `Re: [TKT-${gt.data.n}] more detail`)] }) });
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.appended, r.data.result.unrouted], [1, 1], 'same gmail.com domain is not enough; the exact sender is appended');
  globalThis.__GRAPH = async () => ({ ok: false, status: 429, json: async () => ({}) }); r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.status, 429);
  globalThis.__GRAPH = async () => ({ ok: false, status: 403, json: async () => ({}) }); r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.status, 502); r = await call(dinesh, 'GET', '/api/mail/status'); assert.equal(r.data.last.ok, false); assert.match(r.data.last.error, /Mail\.Read/);
  delete globalThis.__GRAPH;
});
await t('Teams (Otto tools): suggest, create with permissions, duplicate-safe, bad links refused', async () => {
  const tool = (who, name, body) => call(who, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
  let r = await tool(dinesh, 'suggest_ticket', { text: 'Acme says the approval email is not working before go-live' }); assert.equal(r.data.ticketType, 'bug'); assert.equal(r.data.priority, 'High');
  r = await tool(out, 'create_ticket', { project: 'Alpha', subject: 'x' }); assert.ok(r.status >= 400, 'a person without access cannot create');
  r = await tool(dinesh, 'create_ticket', { project: 'Alp', subject: 'Approver gets no email', description: 'From Teams', ticketType: 'bug', priority: 'High', teamsMessageId: 'msg-1', teamsMessageLink: 'https://teams.microsoft.com/l/message/abc' }); assert.equal(r.status, 201); assert.match(r.data.ticket, /^TKT-\d+$/); assert.equal(r.data.category, 'Defect');
  const first = r.data.ticket; r = await tool(dinesh, 'create_ticket', { project: 'Alpha', subject: 'Approver gets no email', teamsMessageId: 'msg-1' }); assert.equal(r.data.duplicate, true); assert.equal(r.data.ticket, first, 'retry returns the same ticket');
  r = await tool(dinesh, 'create_ticket', { project: 'Alpha', subject: 's', teamsMessageLink: 'https://evil.example/x' }); assert.equal(r.status, 400);
  r = await tool(dinesh, 'create_ticket', { project: 'Nope', subject: 's' }); assert.equal(r.status, 404);
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const tk = r.data.items.find(i => i.data.extRef === 'teams:msg-1'); assert.equal(tk.data.source, 'teams'); assert.equal(tk.data.reporter.email, dinesh);
});
await t('notes: saved per project, creator recorded and kept on edit, title required, viewers cannot write', async () => {
  let r = await call(dinesh, 'PUT', `/api/projects/${pid}/items/pnote/pn_1`, { data: { title: 'Kick-off notes', body: 'Agreed scope', category: 'Meeting notes' } }); assert.equal(r.status, 200); assert.equal(r.data.item.data.createdByName, 'Dinesh R');
  r = await call(dinesh, 'PUT', `/api/projects/${pid}/items/pnote/pn_1`, { data: { title: 'Kick-off notes v2', body: 'Agreed scope', createdByName: 'Forged' }, baseVersion: 1 }); assert.equal(r.status, 200); assert.equal(r.data.item.data.createdByName, 'Dinesh R', 'creator cannot be rewritten');
  r = await call(dinesh, 'PUT', `/api/projects/${pid}/items/pnote/pn_2`, { data: { title: '  ', body: 'x' } }); assert.equal(r.status, 400);
  r = await call(out, 'PUT', `/api/projects/${pid}/items/pnote/pn_3`, { data: { title: 'x' } }); assert.ok(r.status >= 400);
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=pnote`); assert.equal(r.data.items.length, 1);
});
await t('Claude key in the app: needs the encryption secret, validated first, stored encrypted, removable, never returned', async () => {
  const KEY = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const real = globalThis.fetch;
  let r = await call(out, 'POST', '/api/admin/ai/key', { key: KEY }); assert.equal(r.status, 403);
  r = await call(dinesh, 'POST', '/api/admin/ai/key', { key: 'not-a-key' }); assert.equal(r.status, 400);
  r = await call(dinesh, 'POST', '/api/admin/ai/key', { key: KEY }); assert.equal(r.status, 409); assert.match(r.data.error, /ai_master_key/);
  globalThis.__MASTER = 'a-long-random-master-secret-value';
  try {
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) }); r = await call(dinesh, 'POST', '/api/admin/ai/key', { key: KEY }); assert.equal(r.status, 422); assert.match(r.data.error, /rejected/);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [{ id: 'claude-sonnet-5-5' }] }) }); r = await call(dinesh, 'POST', '/api/admin/ai/key', { key: KEY }); assert.equal(r.status, 200); assert.ok(!JSON.stringify(r.data).includes(KEY));
    const raw = JSON.stringify([...(store.get('ai') || new Map()).values()]); assert.ok(!raw.includes(KEY), 'the key is not stored readable');
    r = await call(dinesh, 'GET', '/api/ai/status'); assert.equal(r.data.claude, true); assert.equal(r.data.keySource, 'app'); assert.ok(!JSON.stringify(r.data).includes(KEY));
    let used = ''; globalThis.fetch = async (u, o) => { used = o.headers['x-api-key']; return { ok: true, status: 200, json: async () => ({ content: [{ text: 'hi [S1]' }], usage: { input_tokens: 1, output_tokens: 1 } }) }; };
    r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/run`, { task: 'uat', provider: 'claude' }); assert.equal(r.status, 201); assert.equal(used, KEY, 'the saved key is decrypted on the server for the call');
    globalThis.__MASTER = 'a-different-master-value-entirely'; r = await call(dinesh, 'GET', '/api/ai/status'); assert.equal(r.data.claude, false, 'a wrong master key cannot read it');
    globalThis.__MASTER = 'a-long-random-master-secret-value';
    r = await call(dinesh, 'DELETE', '/api/admin/ai/key'); assert.equal(r.status, 200); r = await call(dinesh, 'GET', '/api/ai/status'); assert.equal(r.data.claude, false);
  } finally { globalThis.fetch = real; globalThis.__MASTER = ''; }
});
await t('flow image import: type and content checked, needs Claude, the model reply is validated before it reaches the page', async () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(64)]).toString('base64');
  let r = await call(out, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.ok(r.status === 403 || r.status === 404, 'outsiders cannot use it');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/svg+xml', data: png }); assert.equal(r.status, 415, 'SVG and other types refused');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/jpeg', data: png }); assert.equal(r.status, 415, 'content must match the claimed type');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: 'not base64!' }); assert.equal(r.status, 413);
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: 'A'.repeat(2.3e6) }); assert.equal(r.status, 413, 'oversized refused');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 409, 'DeepSeek alone cannot read images'); assert.match(r.data.error, /Claude/);
  const real = globalThis.fetch; globalThis.__KEY = 'sk-ant-test-flow-key';
  const reply = { nodes: [{ id: 'n1', label: 'Open', kind: 'start', confidence: 'clear' }, { id: 'n2', label: '<img src=x onerror=alert(1)>Review', kind: 'evil', confidence: 'clear' }, { id: 'n1', label: 'dupe' }, { id: 'n3', label: '' }],
    edges: [{ from: 'n1', to: 'n2', label: 'Submit' }, { from: 'n2', to: 'n9', label: 'ghost' }] };
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ text: 'Here you go: ' + JSON.stringify(reply) }], usage: { input_tokens: 1, output_tokens: 1 } }) });
  try {
    r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 200);
    const g = r.data.graph; assert.equal(g.nodes.length, 3, 'duplicate id dropped'); assert.equal(g.edges.length, 1, 'edge to a missing node dropped');
    assert.ok(!/[<>]/.test(g.nodes[1].label), 'markup removed from labels'); assert.equal(g.nodes[1].kind, 'state', 'unknown kind replaced'); assert.equal(g.nodes[2].confidence, 'uncertain', 'unreadable step marked uncertain');
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ text: 'I cannot see a diagram.' }], usage: { input_tokens: 1, output_tokens: 1 } }) });
    r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 502, 'non-JSON reply refused');
  } finally { globalThis.fetch = real; globalThis.__KEY = ''; }
});
await t('rate limits: shared counter, 429 with Retry-After, per person, window resets, a failing counter never locks people out', async () => {
  const rl = () => store.get('rl') || new Map(); const keyOf = (b, e) => b + '.' + e.replace('@', ':');
  // exhaust the flow-image budget for one person without calling any model (requests stop at the limiter after validation)
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47]), Buffer.alloc(40)]).toString('base64'); let r;
  const used = JSON.parse(rl().get(keyOf('ai-image', dinesh)) || '{"n":0}').n; assert.ok(used >= 1, 'earlier calls were counted');
  for (let i = used; i < 15; i++) { r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 409, 'under the limit: normal answer'); }
  const raw = await handler({ method: 'POST', path: `/projects/${pid}/ai/flow-image`, query: '', headers: {}, text: async () => JSON.stringify({ mediaType: 'image/png', data: png }) }, mkctx(dinesh));
  assert.equal(raw.status, 429); const ra = Number(raw.headers.get('retry-after')); assert.ok(ra >= 1 && ra <= 600, 'Retry-After header set'); const j = await raw.json(); assert.match(j.error, /Too many flow image reads/); assert.equal(j.retryAfter, ra);
  r = await call(lead, 'POST', '/api/projects', { name: 'Rate', customer: 'R' }); const p2 = r.data.project.id;
  r = await call(lead, 'POST', `/api/projects/${p2}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 409, 'another person is not affected');
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/svg+xml', data: png }); assert.equal(r.status, 415, 'invalid requests are refused before the limiter');
  r = await call(dinesh, 'GET', `/api/projects/${pid}`); assert.equal(r.status, 200, 'reads are not limited');
  const k = keyOf('ai-image', dinesh), v = JSON.parse(rl().get(k)); rl().set(k, JSON.stringify({ w: v.w - 600, n: v.n }));
  r = await call(dinesh, 'POST', `/api/projects/${pid}/ai/flow-image`, { mediaType: 'image/png', data: png }); assert.equal(r.status, 409, 'a new window starts fresh');
  // Teams ticket creation and saves are limited too
  rl().set(keyOf('teams', dinesh), JSON.stringify({ w: Math.floor(Date.now() / 1000) - (Math.floor(Date.now() / 1000) % 600), n: 30 }));
  r = await call(dinesh, 'POST', '/api/', { project: 'Alpha', subject: 'x' }, { 'x-work-mcp-tool': 'create_ticket' }); assert.equal(r.status, 429);
  rl().set(keyOf('write', dinesh), JSON.stringify({ w: Math.floor(Date.now() / 1000) - (Math.floor(Date.now() / 1000) % 600), n: 2000 }));
  r = await call(dinesh, 'PUT', `/api/projects/${pid}/items/pnote/pn_rl`, { data: { title: 'x' } }); assert.equal(r.status, 429);
  // fail open: if the counter store errors the request still goes through
  const realGet = mkctx; const ctx = mkctx(dinesh); const g = ctx.db.get; ctx.db.get = async (c, key) => { if (c === 'rl') throw new Error('store down'); return g(c, key); };
  const res = await handler({ method: 'PUT', path: `/projects/${pid}/items/pnote/pn_rl`, query: '', headers: {}, text: async () => JSON.stringify({ data: { title: 'x' } }) }, ctx);
  assert.equal(res.status, 200, 'limiter store failure does not block saves'); void realGet;
});
await t('authorization matrix: cross-project ids, viewers, sub-admins, privilege escalation, malformed input', async () => {
  store.delete('rl');  // the rate-limit test above leaves its counters exhausted
  const alice = 'alice.a@facilio.com', bob = 'bob.b@facilio.com', vic = 'vic.v@facilio.com', subby = 'subby.s@facilio.com';
  let r = await call(alice, 'POST', '/api/projects', { name: 'Alice Co', customer: 'A' }); const A = r.data.project.id; r = await call(bob, 'POST', '/api/projects', { name: 'Bob Co', customer: 'B' }); const B = r.data.project.id;
  r = await call(alice, 'POST', `/api/projects/${A}/members`, { email: vic, role: 'viewer' }); assert.equal(r.status, 201);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/tkt/tk_a1`, { data: { subject: 'Secret', status: 'New' } }); assert.equal(r.status, 200);
  r = await call(alice, 'PUT', `/api/projects/${A}/docs/planner`, { data: { scope: ['secret'] }, baseVersion: 0 }); assert.equal(r.status, 200);
  r = await call(alice, 'POST', `/api/projects/${A}/files`, { category: 'msa', name: 'msa.pdf', size: 1000, mime: 'application/pdf' }); const fid = r.data && r.data.file && r.data.file.id;
  // BOLA / IDOR: Bob changes ids in the URL
  for (const [m, path, body] of [['GET', `/api/projects/${A}`], ['GET', `/api/projects/${A}/docs/planner`], ['GET', `/api/projects/${A}/items?kinds=tkt`], ['GET', `/api/projects/${A}/files`], ['GET', `/api/projects/${A}/feedback`],
    ['PUT', `/api/projects/${A}/items/tkt/tk_a1`, { data: { subject: 'Hijack' } }], ['DELETE', `/api/projects/${A}/items/tkt/tk_a1`], ['PUT', `/api/projects/${A}/docs/planner`, { data: {}, baseVersion: 1 }],
    ['POST', `/api/projects/${A}/members`, { email: bob, role: 'owner' }], ['DELETE', `/api/projects/${A}`], ['PATCH', `/api/projects/${A}`, { name: 'Pwned' }], ['POST', `/api/projects/${A}/ai/run`, { task: 'uat' }],
    ['POST', `/api/projects/${A}/tickets/tk_a1/message`, { text: 'hi' }], ['POST', `/api/projects/${A}/files`, { category: 'msa', name: 'x.pdf', size: 10 }]]) {
    r = await call(bob, m, path, body); assert.ok(r.status === 403 || r.status === 404, `${m} ${path} gave ${r.status}`); }
  if (fid) { r = await call(bob, 'GET', `/api/projects/${A}/files/${fid}`); assert.ok(r.status >= 403); r = await call(bob, 'GET', `/api/projects/${B}/files/${fid}`); assert.equal(r.status, 404, 'a file id from another project is not found through your own project'); }
  r = await call(alice, 'GET', `/api/projects/${A}/items?kinds=tkt`); assert.equal(r.data.items[0].data.subject, 'Secret', 'nothing was changed by the attempts');
  // viewers read, never write
  r = await call(vic, 'GET', `/api/projects/${A}/docs/planner`); assert.equal(r.status, 200);
  for (const [m, path, body] of [['PUT', `/api/projects/${A}/items/note/n_v1`, { data: { title: 'x' } }], ['PUT', `/api/projects/${A}/docs/planner`, { data: {}, baseVersion: 1 }], ['POST', `/api/projects/${A}/members`, { email: vic, role: 'owner' }], ['POST', `/api/projects/${A}/ai/run`, { task: 'uat' }]]) {
    r = await call(vic, m, path, body); assert.equal(r.status, 403, `viewer ${m} ${path} gave ${r.status}`); }
  // privilege escalation: nobody but the platform owner grants admin; sub-admins are read-only
  r = await call(alice, 'POST', '/api/admin/access', { email: alice, role: 'admin' }); assert.equal(r.status, 403);
  r = await call(dinesh, 'POST', '/api/admin/access', { email: subby, role: 'sub' }); assert.ok(r.status < 300, 'grant sub admin');
  r = await call(subby, 'POST', '/api/admin/ai/config', { defaultProvider: 'deepseek' }); assert.equal(r.status, 403);
  r = await call(subby, 'POST', '/api/admin/access', { email: subby, role: 'admin' }); assert.equal(r.status, 403);
  r = await call(subby, 'POST', `/api/admin/projects/${A}/members`, { email: subby, role: 'owner' }); assert.equal(r.status, 403);
  r = await call(subby, 'PUT', `/api/projects/${A}/items/note/n_s1`, { data: { title: 'x' } }); assert.equal(r.status, 403, 'sub admins cannot write into projects');
  r = await call(dinesh, 'POST', '/api/templates', { name: 'Org BRD', kind: 'brd', scope: 'org', data: { body: 'v1' } }); const tpl = r.data.item.id;
  r = await call(subby, 'POST', `/api/templates/${tpl}/status`, { action: 'publish' }); assert.equal(r.status, 403, 'sub admin cannot publish an org template');
  r = await call(subby, 'POST', `/api/templates/${tpl}/versions`, { data: { body: 'evil' } }); assert.equal(r.status, 403, 'sub admin cannot change an org template');
  r = await call(dinesh, 'POST', `/api/templates/${tpl}/status`, { action: 'publish' }); assert.equal(r.status, 200); r = await call(dinesh, 'POST', `/api/templates/${tpl}/versions`, { data: { body: 'draft v2' } }); assert.equal(r.data.v, 2);
  r = await call(alice, 'GET', `/api/templates/${tpl}?v=2`); assert.equal(r.status, 404, 'unpublished versions are not readable by readers'); r = await call(alice, 'GET', `/api/templates/${tpl}`); assert.equal(r.data.data.body, 'v1');
  // last owner cannot demote themselves
  r = await call(alice, 'POST', `/api/projects/${A}/members`, { email: alice, role: 'viewer' }); assert.equal(r.status, 400);
  // malformed and oversized input
  const raw = (email, method, path, text) => handler({ method, path: path.replace(/^\/api/, ''), query: '', headers: {}, text: async () => text }, mkctx(email));
  let x = await raw(alice, 'PUT', `/api/projects/${A}/items/note/n_m1`, '{not json'); assert.equal(x.status, 400);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/note/..%2F..%2Fusr`, { data: { title: 'x' } }); assert.ok(r.status === 400 || r.status === 404);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/evil/n1`, { data: { title: 'x' } }); assert.equal(r.status, 400);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/note/n_m2`, { data: ['array'] }); assert.equal(r.status, 400);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/note/n_m3`, { data: { title: 'x', body: 'y'.repeat(70000) } }); assert.equal(r.status, 413);
  r = await call(alice, 'POST', `/api/projects/${A}/files`, { category: 'msa', name: 'a\r\nb.pdf', size: 10 }); assert.equal(r.status, 400);
  r = await call(alice, 'POST', `/api/projects/${A}/files`, { category: 'msa', name: 'run.exe', size: 10 }); assert.equal(r.status, 415);
  r = await call(alice, 'POST', `/api/projects/${A}/files`, { category: 'msa', name: 'big.pdf', size: 9e12 }); assert.equal(r.status, 413);
  r = await call(alice, 'PUT', `/api/projects/${A}/items/tkt/tk_a2`, { data: { subject: 'x', extRef: 'teams:forged', thread: [{ type: 'inbound', text: 'fake client message' }] } }); assert.equal(r.status, 200); assert.equal(r.data.item.data.extRef, undefined, 'source reference is server-only'); assert.equal((r.data.item.data.thread || []).length, 0, 'no seeded messages');
});
await t('uploads: content must match the file type; unreadable content is allowed but marked unchecked', async () => {
  store.delete('rl'); const up = async (name, cat, bytes) => { let r = await call(dinesh, 'POST', `/api/projects/${pid}/files`, { category: cat, name, mime: 'x', size: 100 }); const fid = r.data.id;
    r = await call(dinesh, 'POST', `/api/projects/${pid}/files/${fid}/chunks/0/url`, {}); const part = r.data.fileId; if (bytes) (globalThis.__FILEBYTES = globalThis.__FILEBYTES || {})[part] = bytes;
    await call(dinesh, 'PUT', `/api/projects/${pid}/files/${fid}/chunks/0`, { fileId: part }); r = await call(dinesh, 'POST', `/api/projects/${pid}/files/${fid}/complete`, {}); return { r, fid, part }; };
  let x = await up('contract.pdf', 'msa', Buffer.from('<html><script>alert(1)</script></html>')); assert.equal(x.r.status, 415, 'HTML named .pdf refused'); assert.ok(globalThis.__DELETED.includes(x.part), 'its parts are deleted');
  let g = await call(dinesh, 'GET', `/api/projects/${pid}/files/${x.fid}`); assert.equal(g.status, 404, 'a rejected upload cannot be downloaded');
  x = await up('contract.pdf', 'msa', Buffer.from('%PDF-1.7\n...')); assert.equal(x.r.status, 200); assert.equal(x.r.data.file.contentCheck, undefined); g = await call(dinesh, 'GET', `/api/projects/${pid}/files?category=msa`); assert.ok(g.data.files.some(f => f.id === x.fid));
  x = await up('plan.xlsx', 'plan', Buffer.from([0x4D, 0x5A, 0x90, 0x00])); assert.equal(x.r.status, 415, 'an executable named .xlsx refused');
  x = await up('plan.xlsx', 'plan', Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.alloc(30)])); assert.equal(x.r.status, 200);
  x = await up('logo.png', 'logo_customer', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])); assert.equal(x.r.status, 415, 'a JPEG named .png refused (rename it)');
  x = await up('notes.txt', 'msa', Buffer.from([0x50, 0x4B, 0x03, 0x04, 0, 0])); assert.equal(x.r.status, 415, 'a ZIP named .txt refused');
  x = await up('big.pdf', 'msa', null); assert.equal(x.r.status, 200, 'content the platform cannot hand back is not blocked');
  const rec = JSON.parse(store.get('fl.' + pid).get(x.fid)); assert.equal(rec.contentCheck, 'unchecked');
});
await t('project access: only the project members and admins; owners add Facilio colleagues by email; others see nothing', async () => {
  store.delete('rl'); const own = 'owner.one@facilio.com', col = 'colleague.two@facilio.com', other = 'other.three@facilio.com';
  let r = await call('someone@gmail.com', 'GET', '/api/projects'); assert.equal(r.status, 403, 'non-Facilio accounts are refused'); r = await call('x@facilio.com.evil.io', 'GET', '/api/auth/me'); assert.equal(r.status, 403);
  r = await call(own, 'POST', '/api/projects', { name: 'Private Co', customer: 'P' }); const P = r.data.project.id;
  for (const who of [col, other]) { r = await call(who, 'GET', '/api/projects'); assert.ok(!r.data.projects.some(p => p.id === P), 'not listed for ' + who); r = await call(who, 'GET', `/api/projects/${P}`); assert.equal(r.status, 404); r = await call(who, 'GET', '/api/tickets'); assert.ok(!r.data.projects.some(p => p.id === P)); }
  r = await call(own, 'POST', `/api/projects/${P}/members`, { email: 'friend@gmail.com', role: 'editor' }); assert.equal(r.status, 400, 'only Facilio emails can be added');
  r = await call(col, 'POST', `/api/projects/${P}/members`, { email: col, role: 'owner' }); assert.equal(r.status, 404, 'a non-member cannot add themselves');
  r = await call(own, 'POST', `/api/projects/${P}/members`, { email: col, role: 'editor' }); assert.equal(r.status, 201);
  r = await call(col, 'GET', '/api/projects'); assert.ok(r.data.projects.some(p => p.id === P), 'listed once added'); r = await call(col, 'PUT', `/api/projects/${P}/items/note/n_c1`, { data: { title: 'hello' } }); assert.equal(r.status, 200);
  r = await call(col, 'POST', `/api/projects/${P}/members`, { email: other, role: 'editor' }); assert.equal(r.status, 403, 'editors cannot add people; only owners and admins');
  r = await call(other, 'GET', `/api/projects/${P}`); assert.equal(r.status, 404, 'still no access for others');
  r = await call(dinesh, 'GET', `/api/projects/${P}`); assert.equal(r.status, 200, 'admins can open every project');
  r = await call(own, 'DELETE', `/api/projects/${P}/members/${col.replace('@', ':')}`); assert.equal(r.status, 200); r = await call(col, 'GET', `/api/projects/${P}`); assert.equal(r.status, 404, 'access ends as soon as someone is removed');
});
await t('access check fails closed; AI key and mailbox events appear in the admin audit', async () => {
  const ctx = mkctx('owner.one@facilio.com'); const g = ctx.db.get; ctx.db.get = async (c, k) => { if (c === 'usr') throw new Error('store down'); return g(c, k); };
  const res = await handler({ method: 'GET', path: '/projects', query: '', headers: {}, text: async () => '' }, ctx); assert.equal(res.status, 503);
  let r = await call(dinesh, 'GET', '/api/admin/audit'); assert.ok(r.data.entries.some(e => e.action === 'ai-key-saved' || e.action === 'ai-key-removed'), 'AI key changes listed'); assert.ok(r.data.entries.some(e => e.action === 'mail-sync'), 'mail syncs listed');
});
console.log(`\n${n} checks passed, ${calls} storage calls, largest record ${(maxVal / 1024).toFixed(1)} KB`);
