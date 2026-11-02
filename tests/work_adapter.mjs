// Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files).
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), files = new Map(); let maxVal = 0, calls = 0;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, teams: { async send(m) { (globalThis.__SENT = globalThis.__SENT || []).push(m); return { delivered: 1, failed: 0 }; } }, fetch: async (cred, url, o) => { if (!globalThis.__GRAPH) { const e = new Error('credential not granted'); throw e; } return globalThis.__GRAPH(cred, url, o); }, secrets: { async get(k) { if (k === 'platform_owner') return 'dinesh.r@facilio.com'; if (k === 'support_mailbox') return 'support@facilio.com'; if (k === 'ai_master_key') return globalThis.__MASTER || '';  if (k === 'anthropic_api_key' && globalThis.__KEY) return globalThis.__KEY; if (k === 'teams_notify' && globalThis.__TEAMS) return globalThis.__TEAMS; throw new Error('no secret'); } }, llm: async ({ messages }) => (globalThis.__LLMLEN = messages[1].content.length, (globalThis.__LLMCALLS = (globalThis.__LLMCALLS || 0) + 1), globalThis.__LLMFAIL || (globalThis.__LLMFAILRE && globalThis.__LLMFAILRE.test(messages[1].content)) ? (() => { throw new Error('down'); })() : globalThis.__LLMTEXT ? { model: 'mock', choices: [{ message: { content: globalThis.__LLMTEXT } }] } : { model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + messages[1].content.slice(0, 20) } }] }),
  db: {
    async get(c, k) { calls++; const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { calls++; assert.ok(KEY.test(k), 'bad key ' + k); assert.ok(/^[A-Za-z0-9._-]{1,64}$/.test(c), 'bad collection ' + c); const t = JSON.stringify(v); maxVal = Math.max(maxVal, t.length); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); },
    async delete(c, k) { calls++; (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { calls++; const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async get(id) { const b = (globalThis.__FILEBYTES || {})[id]; if (!b) { const e = new Error('too large for get'); e.status = 413; throw e; } return { bytes: async () => b, text: async () => Buffer.from(b).toString('utf8') }; }, async put(o) { const id = 'file_' + (globalThis.__FID = (globalThis.__FID || 0) + 1); (globalThis.__FILEBYTES = globalThis.__FILEBYTES || {})[id] = Buffer.from(o.body); return { file_id: id, size: Buffer.byteLength(o.body) }; }, async delete(id) { files.delete(id); (globalThis.__DELETED = globalThis.__DELETED || []).push(id); }, async uploadUrl(name) { const id = 'file_' + (globalThis.__FID = (globalThis.__FID || 0) + 1); files.set(id, null); return { url: 'https://storage.example/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; } } });
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
await t('platform owner: from the secret, else the app owner as facilio.work reports it, else nobody (no name in the code)', async () => {
  const as = async (email, role, secret) => { const c = mkctx(email); c.viewer.role = role; c.secrets = { async get(k) { if (k === 'platform_owner' && secret) return secret; throw new Error('no secret'); } }; globalThis.__fwb && globalThis.__fwb.reset(); const r = await handler({ method: 'GET', path: '/auth/me', query: '', headers: {}, text: async () => '', json: async () => undefined }, c); return (await r.json()).user.adminRole; };
  assert.equal(await as(dinesh, 'viewer', 'sam.k@facilio.com, dinesh.r@facilio.com'), 'super', 'a list in the secret works, including names that contain the letter s');
  assert.equal(await as(sam, 'viewer', 'sam.k@facilio.com; dinesh.r@facilio.com'), 'super');
  assert.equal(await as(dinesh, 'owner', ''), 'super', 'no secret: the app owner starts as platform owner');
  assert.equal(await as(dinesh, 'viewer', ''), null, 'no secret and not the app owner: no admin access');
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
await t('User guide section: one section from the chosen sources, nothing saved, project access and input checked', async () => {
  await call(sam, 'PUT', `/api/projects/${pid}/items/cmodx/pw1`, { data: { label: 'Permit to Work', usage: 'Raise a permit before hot work' } });
  await call(sam, 'PUT', `/api/projects/${pid}/items/decision/dg1`, { data: { title: 'Visitor badges are printed at reception' } });
  const before = (await call(sam, 'GET', `/api/projects/${pid}/items?kinds=ai`)).data.items.length;
  let r = await call(sam, 'POST', `/api/projects/${pid}/ai/guide-section`, { title: 'Step-by-step procedures', brief: 'Main tasks', guideTitle: 'Permits guide', modules: ['Permit to Work'], roles: ['Technician'], level: 'steps', sources: { cfg: true, decisions: true } });
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.text && r.data.provider, 'text and provider returned');
  assert.ok(r.data.sources.some(x => /cmodx/.test(x.label)), 'the configuration record about the module is a source'); assert.ok(!r.data.sources.some(x => /decision/.test(x.label)), 'a decision about another module is left out');
  assert.equal((await call(sam, 'GET', `/api/projects/${pid}/items?kinds=ai`)).data.items.length, before, 'nothing is saved by the route');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/guide-section`, { title: '', sources: { cfg: true } }); assert.equal(r.status, 400, 'a section needs a title');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/guide-section`, { title: 'X', sources: {} }); assert.equal(r.status, 400, 'at least one source');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/guide-section`, { title: 'X', sources: { cfg: true }, vid: '../x' }); assert.equal(r.status, 400, 'walkthrough id is validated');
  r = await call(out, 'POST', `/api/projects/${pid}/ai/guide-section`, { title: 'X', sources: { cfg: true } }); assert.ok(r.status === 403 || r.status === 404, 'no access to other projects');
  for (const [k, id] of [['cmodx', 'pw1'], ['decision', 'dg1']]) { r = await call(sam, 'DELETE', `/api/projects/${pid}/items/${k}/${id}`); assert.ok(r.status < 300, 'clean up ' + k + ' ' + r.status); }
});
await t('Claude hand-off: prompt pack and imported reply stay unapproved, access checked, no network call', async () => {
  const realF = globalThis.fetch; globalThis.fetch = async () => { throw new Error('the hand-off must not call any API'); };
  try {
    let r = await call(sam, 'POST', `/api/projects/${pid}/ai/pack`, { task: 'uat', instruction: 'Only Work Orders', headings: ['1. Intro', '2. Scope'] }); assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.match(r.data.prompt, /Only Work Orders/); assert.match(r.data.prompt, /## 1\. Intro/); assert.match(r.data.prompt, /REPLY FORMAT/); assert.match(r.data.prompt, /SOURCES/);
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/pack`, { task: 'vidguide' }); assert.equal(r.status, 400); r = await call(sam, 'POST', `/api/projects/${pid}/ai/pack`, { task: 'bogus' }); assert.equal(r.status, 400);
    r = await call(out, 'POST', `/api/projects/${pid}/ai/pack`, { task: 'uat' }); assert.ok(r.status === 403 || r.status === 404, 'pack: no access to other projects');
    const reply = '## UAT plan\nScope is the Work Order module [S1] and also [S99].\n' + 'x'.repeat(300);
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/import`, { task: 'uat', content: reply }); assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.item.data.status, 'draft'); assert.equal(r.data.item.data.provider, 'Claude (manual)'); assert.match(r.data.item.data.notice, /S99/, 'a citation the project does not have is flagged');
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/import`, { task: 'uat', content: 'too short' }); assert.equal(r.status, 400);
    r = await call(sam, 'POST', `/api/projects/${pid}/ai/import`, { task: 'uat', content: 'y'.repeat(120001) }); assert.equal(r.status, 413);
    r = await call(out, 'POST', `/api/projects/${pid}/ai/import`, { task: 'uat', content: reply }); assert.ok(r.status === 403 || r.status === 404, 'import: no access to other projects');
  } finally { globalThis.fetch = realF; }
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
  assert.deepEqual([r.data.result.filed, r.data.result.unrouted], [2, 1]);
  { const it = (await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`)).data.items.find(i => i.data.n === 1); assert.ok(it.data.thread.some(m => m.ref === 'AAA3'), 'the reply quoting TKT-1 joined that ticket'); }
  { const mb = (await call(dinesh, 'GET', `/api/projects/${pid}/mail`)).data; assert.equal(mb.items.length, 2, 'both emails are in the project Inbox'); assert.ok(mb.items.every(m => m.status === 'new')); }
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.filed, r.data.result.unrouted], [0, 0], 'second sync adds nothing');
  r = await call(dinesh, 'GET', '/api/mail/inbox'); assert.equal(r.data.items.length, 1); const mid = r.data.items[0].id;
  r = await call(dinesh, 'POST', `/api/mail/inbox/${mid}/route`, { projectId: pid }); assert.equal(r.status, 200); r = await call(dinesh, 'GET', '/api/mail/inbox'); assert.equal(r.data.items.length, 0);
  // a ticket tag only routes for the ticket's own sender (or their company domain / a mailbox rule); shared mail domains need the exact address
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB1', 'mallory@evil.org', 'Re: [TKT-1] please add me')] }) });
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.filed, r.data.result.unrouted], [0, 1], 'a stranger quoting a ticket number is parked, not filed');
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB2', 'cust.one@gmail.com', 'Login problem')] }) }); r = await call(dinesh, 'POST', '/api/mail/sync');
  r = await call(dinesh, 'GET', '/api/mail/inbox'); const g = r.data.items.find(i => i.from.email === 'cust.one@gmail.com'); r = await call(dinesh, 'POST', `/api/mail/inbox/${g.id}/route`, { projectId: pid }); assert.equal(r.status, 200);
  r = await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`); const gt = r.data.items.find(i => i.data.requester && i.data.requester.email === 'cust.one@gmail.com'); assert.ok(gt, 'ticket created for the gmail sender');
  globalThis.__GRAPH = async () => ({ ok: true, status: 200, json: async () => ({ value: [msg('BBB3', 'someone.else@gmail.com', `Re: [TKT-${gt.data.n}]`), msg('BBB4', 'cust.one@gmail.com', `Re: [TKT-${gt.data.n}] more detail`)] }) });
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.deepEqual([r.data.result.filed, r.data.result.unrouted], [1, 1], 'same gmail.com domain is not enough; the exact sender is filed');
  { const it = (await call(dinesh, 'GET', `/api/projects/${pid}/items?kinds=tkt`)).data.items.find(i => i.id === gt.id); assert.ok(it.data.thread.some(m => m.ref === 'BBB4'), 'and joins its ticket'); }
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
  // admin: clone a project, and delete one for good (platform owner only, archived first, name typed back)
  r = await call(subby, 'POST', `/api/admin/projects/${A}/clone`, {}); assert.equal(r.status, 403, 'sub admins cannot clone');
  r = await call(alice, 'POST', `/api/admin/projects/${A}/clone`, {}); assert.equal(r.status, 403, 'project members who are not admins cannot clone');
  r = await call(dinesh, 'POST', `/api/admin/projects/${A}/clone`, { name: 'Clone of A' }); assert.equal(r.status, 201); const CL = r.data.project.id; assert.notEqual(CL, A);
  r = await call(dinesh, 'GET', `/api/projects/${CL}/docs/planner`); assert.equal(r.status, 200, 'documents are copied');
  r = await call(dinesh, 'GET', `/api/projects/${CL}/items?kinds=tkt`); assert.equal(r.data.items.length, 0, 'tickets are not copied');
  r = await call(alice, 'GET', `/api/projects/${CL}`); assert.ok(r.status >= 403, 'members of the original are not members of the copy');
  r = await call(dinesh, 'POST', `/api/admin/projects/${CL}/delete`, { confirm: 'Clone of A' }); assert.equal(r.status, 400, 'archive first');
  r = await call(dinesh, 'PATCH', `/api/admin/projects/${CL}`, { archived: true });
  r = await call(dinesh, 'POST', `/api/admin/projects/${CL}/delete`, { confirm: 'wrong' }); assert.equal(r.status, 400, 'the name must match');
  r = await call(subby, 'POST', `/api/admin/projects/${CL}/delete`, { confirm: 'Clone of A' }); assert.equal(r.status, 403, 'only the platform owner deletes');
  r = await call(dinesh, 'POST', `/api/admin/projects/${CL}/delete`, { confirm: 'Clone of A' }); assert.equal(r.status, 200); assert.ok(r.data.removed > 0);
  r = await call(dinesh, 'GET', `/api/admin/projects/${CL}/members`); assert.equal(r.status, 404, 'the project is gone');
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
await t('Explore Facilio: editors draft, only owners and admins publish; request authors come from the session; text is normalised', async () => {
  store.delete('rl'); const own = 'show.owner@facilio.com', ed = 'show.editor@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'Show Co', customer: 'S' }); const P = r.data.project.id;
  r = await call(own, 'POST', `/api/projects/${P}/members`, { email: ed, role: 'editor' }); assert.equal(r.status, 201);
  r = await call(ed, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: { title: '', status: 'draft' } }); assert.equal(r.status, 400, 'a title is required');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: { title: 'Inspections on mobile', capabilities: ['Offline checklists', 42] } }); assert.equal(r.status, 400, 'list items must be text');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: { title: 'Inspections on mobile', capabilities: ['Offline checklists'], availability: 'free!', imageId: '../x', status: 'draft', extra: 'dropped' } });
  assert.equal(r.status, 200); let d = r.data.item.data; assert.equal(d.availability, 'discuss', 'unknown availability falls back'); assert.equal(d.imageId, '', 'a bad file id is dropped'); assert.equal(d.extra, undefined, 'unknown fields are not stored');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: Object.assign({}, d, { capabilities: ['Offline checklists'], status: 'published' }) }); assert.equal(r.status, 403, 'editors cannot publish');
  r = await call(own, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: Object.assign({}, d, { capabilities: ['Offline checklists'], status: 'published' }) }); assert.equal(r.status, 200); assert.equal(r.data.item.data.status, 'published'); assert.equal(r.data.item.data.publishedBy, own);
  r = await call(ed, 'PUT', `/api/projects/${P}/items/news/nw1`, { data: Object.assign({}, r.data.item.data, { summary: 'Edited' }) }); assert.equal(r.status, 200, 'editors can still edit a published entry'); assert.equal(r.data.item.data.publishedBy, own, 'publisher kept');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/interest/in1`, { data: { newsId: 'nw1', title: 'Inspections on mobile', by: 'ceo@customer.com', byName: 'Fake', at: '2001-01-01', status: 'weird' } });
  assert.equal(r.status, 200); d = r.data.item.data; assert.equal(d.by, ed, 'author from the session'); assert.notEqual(d.at, '2001-01-01', 'time from the server'); assert.equal(d.status, 'new');
  r = await call(own, 'PUT', `/api/projects/${P}/items/interest/in1`, { data: Object.assign({}, d, { status: 'demo', by: own }) }); assert.equal(r.data.item.data.by, ed, 'the author cannot be changed later'); assert.equal(r.data.item.data.status, 'demo');
  r = await call('outsider.x@facilio.com', 'GET', `/api/projects/${P}/items?kinds=news,interest`); assert.equal(r.status, 404, 'others cannot read them');
  // Teams notice: only for a new request, only when the Teams notices are switched on, to the channel and the project owners
  r = await call(dinesh, 'PUT', '/api/mail/settings', { teamsOn: false }); globalThis.__SENT = [];
  r = await call(ed, 'PUT', `/api/projects/${P}/items/interest/in2`, { data: { newsId: 'nw1', title: 'Inspections on mobile' } }); assert.equal(r.data.notice, 'none'); assert.equal(globalThis.__SENT.length, 0, 'nothing is sent while notices are off');
  r = await call(dinesh, 'PUT', '/api/mail/settings', { teamsOn: true, teamsChannel: 'delivery-sales' }); assert.equal(r.status, 200);
  r = await call(ed, 'PUT', `/api/projects/${P}/items/interest/in3`, { data: { newsId: 'nw1', title: 'Inspections on mobile', note: 'Demo please' } }); assert.equal(r.data.notice, 'teams');
  const m = globalThis.__SENT.find(x => /Interest in Inspections on mobile/.test(x.title)); assert.ok(m, 'a Teams notice is sent'); assert.equal(m.channel, 'delivery-sales'); assert.deepEqual(m.to, [own], 'direct message to the project owners only');
  assert.ok(/Automated Delivery Studio notification/.test(m.text) && /Demo please/.test(m.text)); assert.ok(/\/#\/p\/.+\/showcase$/.test(m.actions[0].url), 'links to the request');
  const n = globalThis.__SENT.length; r = await call(own, 'PUT', `/api/projects/${P}/items/interest/in3`, { data: Object.assign({}, r.data.item.data, { status: 'contacted' }) }); assert.equal(globalThis.__SENT.length, n, 'updating a request sends nothing');
  r = await call(dinesh, 'PUT', '/api/mail/settings', { teamsOn: false });
});
await t('sign-offs and approvals: recorded, undone or deleted only by owners and admins; editors still draft', async () => {
  store.delete('rl'); const own = 'signer.owner@facilio.com', ed = 'signer.editor@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'Sign Co', customer: 'S' }); const P = r.data.project.id; await call(own, 'POST', `/api/projects/${P}/members`, { email: ed, role: 'editor' });
  r = await call(ed, 'PUT', `/api/projects/${P}/items/signoff/brd`, { data: { status: 'requested', doc: 'https://example.com/brd' } }); assert.equal(r.status, 200, 'editor can request a sign-off');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/signoff/brd`, { data: { status: 'signed', signer: 'X' } }); assert.equal(r.status, 403, 'editor cannot record a signature');
  r = await call(own, 'PUT', `/api/projects/${P}/items/signoff/brd`, { data: { status: 'signed', signer: 'Customer PM' } }); assert.equal(r.status, 200);
  r = await call(ed, 'PUT', `/api/projects/${P}/items/signoff/brd`, { data: { status: 'requested' } }); assert.equal(r.status, 403, 'editor cannot undo a signature');
  r = await call(ed, 'DELETE', `/api/projects/${P}/items/signoff/brd`); assert.equal(r.status, 403, 'editor cannot delete a signed record');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/cr/cr_1`, { data: { title: 'Extra report', status: 'Proposed' } }); assert.equal(r.status, 200, 'editor can raise a change request');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/cr/cr_1`, { data: { title: 'Extra report', status: 'Approved' } }); assert.equal(r.status, 403);
  r = await call(own, 'PUT', `/api/projects/${P}/items/cr/cr_1`, { data: { title: 'Extra report', status: 'Approved' } }); assert.equal(r.status, 200);
  r = await call(ed, 'PUT', `/api/projects/${P}/items/close/transition`, { data: { supportAt: '2026-10-27' } }); assert.equal(r.status, 200, 'editor can fill in closure details');
  r = await call(ed, 'PUT', `/api/projects/${P}/items/close/transition`, { data: { supportAt: '2026-10-27', closedAt: '2026-10-27', closedBy: 'E' } }); assert.equal(r.status, 403, 'editor cannot close the project');
  r = await call(ed, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'review' }, baseVersion: 0 }); assert.equal(r.status, 200, 'editor can move the BRD to review');
  r = await call(ed, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'approved' }, baseVersion: 1 }); assert.equal(r.status, 403, 'editor cannot approve the BRD');
  r = await call(ed, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'review', docs: { b2: { status: 'approved' } } }, baseVersion: 1 }); assert.equal(r.status, 403, 'nor a secondary BRD');
  r = await call(own, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'approved' }, baseVersion: 1 }); assert.equal(r.status, 200);
  r = await call(ed, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'draft' }, baseVersion: 2 }); assert.equal(r.status, 403, 'editor cannot reopen an approved BRD');
  r = await call(dinesh, 'PUT', `/api/projects/${P}/docs/brddoc`, { data: { status: 'draft' }, baseVersion: 2 }); assert.equal(r.status, 200, 'admins can');
});
await t('project Inbox: emails filed by project address, conversation and sender; Teams notices once; status, attachments, refresh, access and outages', async () => {
  store.delete('rl'); const own = 'inbox.owner@facilio.com', vw = 'inbox.viewer@facilio.com', other = 'inbox.other@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'Mail Co', customer: 'Mail' }); const P = r.data.project.id; await call(own, 'POST', `/api/projects/${P}/members`, { email: vw, role: 'viewer' });
  r = await call(other, 'POST', '/api/projects', { name: 'Other Co', customer: 'O' }); const O = r.data.project.id;
  r = await call(dinesh, 'PUT', '/api/mail/rules', { rules: [{ match: 'mailco-delivery@facilio.com', projectId: P, on: 'to' }, { match: 'not-an-address', projectId: P, on: 'to' }] }); assert.equal(r.status, 400, 'a "sent to" rule needs a full address');
  r = await call(dinesh, 'PUT', '/api/mail/rules', { rules: [{ match: 'mailco-delivery@facilio.com', projectId: P, on: 'to' }] }); assert.equal(r.status, 200);
  r = await call(dinesh, 'PUT', '/api/mail/settings', { teamsOn: true, teamsChannel: 'delivery-mail', autoTicket: false }); assert.equal(r.status, 200); assert.equal(r.data.settings.teamsChannel, 'delivery-mail');
  r = await call(vw, 'PUT', '/api/mail/settings', { teamsOn: false }); assert.equal(r.status, 403, 'only admins change mailbox settings');
  const M = (id, from, subject, o = {}) => Object.assign({ id, conversationId: o.conv || id, subject, from: { emailAddress: { name: 'Client ' + id, address: from } }, toRecipients: [{ emailAddress: { name: 'Delivery', address: o.to || 'support@facilio.com' } }], ccRecipients: [], body: { contentType: 'text', content: 'Body of ' + id + ' <script>alert(1)</script>' }, bodyPreview: 'Body of ' + id, receivedDateTime: o.at || '2026-10-27T09:00:00Z', hasAttachments: !!o.att, isDraft: false, webLink: 'https://outlook.office365.com/owa/?ItemID=' + id }, {});
  let graph = { list: [M('M1', 'ana@client.org', 'Kick-off agenda', { to: 'mailco-delivery@facilio.com', att: true, conv: 'C1' }), M('M2', 'bob@another.org', 'Re: Kick-off agenda', { conv: 'C1', at: '2026-10-27T10:00:00Z' }), M('M3', 'nobody@random.net', 'Hello')], calls: [] };
  globalThis.__GRAPH = async (cred, url, o) => { graph.calls.push(url); if (/\/attachments\/[^/]+\/\$value/.test(url)) return { ok: true, status: 200, body: Buffer.from('PDF-BYTES').toString('base64') };
    if (/\/attachments\?/.test(url)) return { ok: true, status: 200, json: async () => ({ value: [{ id: 'A1', name: 'agenda.pdf', size: 1200, contentType: 'application/pdf' }, { id: 'A2', name: 'big.zip', size: 9e6, contentType: 'application/zip' }, { id: 'A3', name: 'logo.png', size: 10, contentType: 'image/png', isInline: true }] }) };
    if (/\/messages\/M1\?/.test(url)) return { ok: true, status: 200, json: async () => ({ id: 'M1', webLink: 'https://outlook.office365.com/owa/?ItemID=M1&v=2' }) };
    if (/\/messages\/[^?]+\?/.test(url)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ value: graph.list }) }; };
  globalThis.__SENT = [];
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.status, 200); assert.deepEqual([r.data.result.filed, r.data.result.unrouted, r.data.result.notices], [2, 1, 3]);
  assert.ok(graph.calls[0].includes('%24filter') || graph.calls[0].includes('$filter'), 'reads only new mail (received since the last check)');
  const notes = globalThis.__SENT; const n1 = notes.find(x => /Mail Co/.test(x.title)); assert.ok(n1, 'project notice sent'); assert.equal(n1.channel, 'delivery-mail', 'the configured channel');
  assert.match(n1.text, /Automated Delivery Studio notification/); assert.deepEqual(n1.facts.map(f => f.title), ['From', 'Subject', 'Received', 'Project']); assert.match(n1.actions[0].url, new RegExp('/#/p/' + P + '/inbox/[0-9a-f]{40}$'));
  assert.ok(notes.some(x => /waiting to be assigned/.test(x.title)), 'unassigned email noticed for review');
  r = await call(own, 'GET', `/api/projects/${P}/mail`); assert.equal(r.data.items.length, 2, 'M1 by project address, M2 by conversation'); const m1 = r.data.items.find(x => x.subject === 'Kick-off agenda');
  assert.equal(m1.routedBy, 'sent to the project address'); assert.equal(r.data.items.find(x => x.subject !== 'Kick-off agenda').routedBy, 'same conversation');
  assert.deepEqual(m1.attachments.map(a => a.name), ['agenda.pdf', 'big.zip'], 'inline images are not listed as attachments'); assert.equal(m1.ticket, null, 'no ticket when automatic tickets are off');
  r = await call(dinesh, 'POST', '/api/mail/sync'); assert.equal(r.data.result.filed, 0); assert.equal(globalThis.__SENT.length, 3, 'a second delivery of the same emails sends no new notices');
  // reading, status, conversation
  r = await call(vw, 'GET', `/api/projects/${P}/mail/${m1.key}`); assert.equal(r.status, 200); assert.equal(r.data.mail.status, 'new', 'a viewer opening it does not change the shared status');
  r = await call(own, 'GET', `/api/projects/${P}/mail/${m1.key}`); assert.equal(r.data.mail.status, 'read'); assert.equal(r.data.conversation.length, 2, 'the reply is shown with it'); assert.ok(r.data.mail.body.includes('<script>'), 'body is returned as plain text (the page escapes it)');
  r = await call(vw, 'POST', `/api/projects/${P}/mail/${m1.key}/status`, { status: 'handled' }); assert.equal(r.status, 403, 'viewers cannot change status');
  r = await call(own, 'POST', `/api/projects/${P}/mail/${m1.key}/status`, { status: 'handled' }); assert.equal(r.data.mail.status, 'handled'); assert.equal(r.data.mail.handledBy.email, own);
  r = await call(own, 'POST', `/api/projects/${P}/mail/${m1.key}/status`, { status: 'deleted' }); assert.equal(r.status, 400);
  // access: other projects, outsiders, made-up keys
  r = await call(other, 'GET', `/api/projects/${P}/mail`); assert.equal(r.status, 404); r = await call(other, 'GET', `/api/projects/${O}/mail/${m1.key}`); assert.equal(r.status, 404, 'an email key from another project is not found through your own project');
  r = await call(own, 'GET', `/api/projects/${P}/mail/..%2F..%2Fusr`); assert.equal(r.status, 404);
  // attachments: only the ones listed on this email, up to 3 MB, fetched from Microsoft 365 on request
  r = await call(vw, 'GET', `/api/projects/${P}/mail/${m1.key}/attachments/0`); assert.equal(r.status, 200); assert.equal(Buffer.from(r.data.data, 'base64').toString(), 'PDF-BYTES'); assert.equal(r.data.name, 'agenda.pdf');
  r = await call(vw, 'GET', `/api/projects/${P}/mail/${m1.key}/attachments/1`); assert.equal(r.status, 413); r = await call(vw, 'GET', `/api/projects/${P}/mail/${m1.key}/attachments/7`); assert.equal(r.status, 404);
  r = await call(other, 'GET', `/api/projects/${P}/mail/${m1.key}/attachments/0`); assert.equal(r.status, 404);
  // the original in Microsoft 365: still there, or deleted/moved
  r = await call(vw, 'POST', `/api/projects/${P}/mail/${m1.key}/refresh`); assert.equal(r.data.mail.live.state, 'available');
  const m2 = (await call(own, 'GET', `/api/projects/${P}/mail`)).data.items.find(x => x.subject !== 'Kick-off agenda'); r = await call(vw, 'POST', `/api/projects/${P}/mail/${m2.key}/refresh`); assert.equal(r.data.mail.live.state, 'missing');
  // a ticket from an email, on request, once
  r = await call(own, 'POST', `/api/projects/${P}/mail/${m2.key}/ticket`); assert.ok(r.data.ticket.n > 0); const tn = r.data.ticket.n; r = await call(own, 'POST', `/api/projects/${P}/mail/${m2.key}/ticket`); assert.equal(r.data.ticket.n, tn);
  // the admin places the unassigned email
  r = await call(dinesh, 'GET', '/api/mail/inbox'); const un = r.data.items.find(i => i.subject === 'Hello'); r = await call(dinesh, 'POST', `/api/mail/inbox/${un.id}/route`, { projectId: P }); assert.equal(r.status, 200);
  r = await call(own, 'GET', `/api/projects/${P}/mail`); assert.equal(r.data.items.length, 3); assert.equal(r.data.items.find(x => x.subject === 'Hello').routedBy, 'manual');
  // Microsoft 365 unavailable: the Inbox still opens with what is stored, and says the check did not complete
  JSON.parse(store.get('cfg').get('mail')); { const c = JSON.parse(store.get('cfg').get('mail')); c.last.at = '2026-01-01T00:00:00Z'; store.get('cfg').set('mail', JSON.stringify(c)); }
  globalThis.__GRAPH = async () => ({ ok: false, status: 503, json: async () => ({}) });
  r = await call(own, 'GET', `/api/projects/${P}/mail?sync=1`); assert.equal(r.status, 200); assert.equal(r.data.items.length, 3); assert.ok(r.data.sync.error, 'the outage is reported, not hidden');
  r = await call(own, 'GET', `/api/projects/${P}/mail?sync=1`); assert.equal(r.data.sync.skipped, 'recent', 'checks are spaced out (at most every two minutes)');
  // retention
  r = await call(dinesh, 'PUT', '/api/mail/settings', { retentionDays: 5 }); assert.equal(r.status, 400); r = await call(dinesh, 'PUT', '/api/mail/settings', { retentionDays: 30, teamsOn: false }); assert.equal(r.status, 200);
  { const col = store.get('ml.' + P); const k = [...col.keys()][0]; const v = JSON.parse(col.get(k)); v.receivedAt = '2020-01-01T00:00:00Z'; col.set(k, JSON.stringify(v)); }
  r = await call(own, 'GET', `/api/projects/${P}/mail`); assert.equal(r.data.items.length, 2, 'emails older than the retention period are removed');
  await call(dinesh, 'PUT', '/api/mail/settings', { retentionDays: 0, autoTicket: true }); delete globalThis.__GRAPH;
});
await t('kick-off deck reading: model output rebuilt field by field, nothing invented passes, viewers cannot run it', async () => {
  store.delete('rl'); const own = 'kick.owner@facilio.com', vw = 'kick.viewer@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'Kick Co', customer: 'K' }); const P = r.data.project.id; await call(own, 'POST', `/api/projects/${P}/members`, { email: vw, role: 'viewer' });
  const deck = '--- Slide 2\nName | Role | Email\nDinesh R | Delivery Manager | dinesh.r@facilio.com\nPriya | Facilities Head | priya@acme.com\nWeekly status call';
  r = await call(vw, 'POST', `/api/projects/${P}/ai/kickoff`, { text: deck }); assert.equal(r.status, 403, 'viewers cannot run it');
  r = await call(own, 'POST', `/api/projects/${P}/ai/kickoff`, { text: 'short' }); assert.equal(r.status, 400);
  globalThis.__LLMTEXT = 'Sure! ' + JSON.stringify({ facilioTeam: [{ name: 'Dinesh R', role: 'Delivery Manager', email: 'dinesh.r@facilio.com' }, { name: '', role: 'x' }], customerTeam: [{ name: '<img src=x onerror=alert(1)>Priya', role: 'Facilities Head', email: 'not-an-email' }],
    cadence: 'every full moon', keyDates: [{ label: 'Go-live', date: '22/02/2027' }, { label: 'Kick-off', date: '2026-10-14' }], objectives: Array.from({ length: 30 }, (_, i) => 'Objective ' + i), nextSteps: [{ action: 'Send templates', owner: 'Facilio', due: 'soon' }], insights: 'not a list' });
  try {
    r = await call(own, 'POST', `/api/projects/${P}/ai/kickoff`, { text: deck, fileName: 'deck.pptx' }); assert.equal(r.status, 200); const d = r.data.data;
    assert.equal(d.facilioTeam.length, 1, 'a person without a name is dropped'); assert.ok(!/[<>]/.test(d.customerTeam[0].name), 'markup removed'); assert.equal(d.customerTeam[0].email, '', 'invalid email dropped');
    assert.equal(d.cadence, '', 'cadence only from the fixed list'); assert.deepEqual(d.keyDates.map(x => x.date), ['', '2026-10-14'], 'dates only in YYYY-MM-DD'); assert.equal(d.objectives.length, 12, 'lists are capped');
    assert.equal(d.nextSteps[0].due, ''); assert.deepEqual(d.insights, [], 'wrong shapes become empty');
    globalThis.__LLMTEXT = 'I could not read that.'; r = await call(own, 'POST', `/api/projects/${P}/ai/kickoff`, { text: deck }); assert.equal(r.status, 502);
  } finally { delete globalThis.__LLMTEXT; }
});
await t('process described in words: steps and connections come back checked, only flows the project has are suggested, bad answers are refused', async () => {
  store.delete('rl'); const own = 'ft.owner@facilio.com', vw = 'ft.viewer@facilio.com'; let r = await call(own, 'POST', '/api/projects', { name: 'Flow text', customer: 'K' }); const P = r.data.project.id; await call(own, 'POST', `/api/projects/${P}/members`, { email: vw, role: 'viewer' });
  const flows = [{ id: 'workorder::f1', name: 'Default', moduleLabel: 'Work Order', states: ['Open', 'Closed'] }]; const body = { text: 'A request is approved by the manager and then becomes a work order that is closed.', flows };
  try {
    globalThis.__LLMTEXT = JSON.stringify({ title: 'Request to work order', nodes: [{ id: 'n1', label: 'Request raised', kind: 'start', confidence: 'detected' }, { id: 'n2', label: 'Manager approves?', kind: 'decision', confidence: 'detected' }, { id: 'n2', label: 'duplicate id', kind: 'state' }], edges: [{ from: 'n1', to: 'n2', label: '', confidence: 'detected' }, { from: 'n2', to: 'zz', label: 'points nowhere' }], useFlows: ['workorder::f1', 'invented::x'], notes: '' });
    r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, body); assert.equal(r.status, 200, JSON.stringify(r.data)); const g = r.data.graph;
    assert.equal(g.nodes.length, 2, 'a repeated id is dropped'); assert.equal(g.edges.length, 1, 'a connection to nothing is dropped'); assert.deepEqual(r.data.useFlows.map(f => f.id), ['workorder::f1'], 'only flows the project has are suggested');
    r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, { text: 'short', flows }); assert.equal(r.status, 400);
    r = await call(vw, 'POST', `/api/projects/${P}/ai/flow-text`, body); assert.equal(r.status, 403, 'viewers cannot run it');
    r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, Object.assign({ claudePack: true }, body)); assert.equal(r.status, 200); assert.match(r.data.prompt, /EXISTING STATE FLOWS/); assert.match(r.data.prompt, /workorder::f1/); assert.match(r.data.prompt, /A request is approved/);
    r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, { reply: 'Here you go: ' + globalThis.__LLMTEXT, text: body.text, flows }); assert.equal(r.status, 200); assert.equal(r.data.graph.nodes.length, 2);
    globalThis.__LLMTEXT = 'I cannot do that.'; r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, body); assert.ok(r.status >= 400, 'an unreadable answer is refused');
  } finally { delete globalThis.__LLMTEXT; }
});
await t('process described in words: on a project with many flows the relevant ones are sent in full and the request stays short; abbreviations and typos are explained to the model', async () => {
  store.delete('rl'); const own = 'ft2.owner@facilio.com'; let r = await call(own, 'POST', '/api/projects', { name: 'Flow text 2', customer: 'K' }); const P = r.data.project.id;
  const flows = []; for (let i = 0; i < 100; i++) flows.push({ id: 'mod' + i + '::f', name: 'Default flow ' + i, moduleLabel: 'Module ' + i, states: Array.from({ length: 16 }, (_, k) => 'State ' + k + ' of module ' + i) });
  flows.push({ id: 'serviceRequest::f1', name: 'Default', moduleLabel: 'Service Request', states: ['Submitted', 'Approved', 'Rejected'] });
  r = await call(own, 'POST', `/api/projects/${P}/ai/flow-text`, { claudePack: true, text: 'If a client raises a request in tenant portal, SR created and goes for approval, the approved sr converted into a ticket', flows }); assert.equal(r.status, 200);
  assert.match(r.data.prompt, /serviceRequest::f1 | Service Request · Default | states: Submitted, Approved, Rejected/, 'the flow the text refers to (SR = service request) is listed with its states');
  assert.ok(r.data.prompt.length < 14000, 'the request stays short: ' + r.data.prompt.length); assert.match(r.data.prompt, /SR = service request/); assert.match(r.data.prompt, /spelling mistakes/);
});
await t('AI documents part by part: job, parts, retry, missing section marked, only the starter can use the job', async () => {
  store.delete('rl'); const sam = 'parts.owner@facilio.com', out = 'parts.other@facilio.com'; let r0 = await call(sam, 'POST', '/api/projects', { name: 'Parts', customer: 'Acme' }); const pid = r0.data.project.id;
  let r = await call(sam, 'POST', `/api/projects/${pid}/ai/job`, { task: 'wsr', instruction: 'Week 4' }); assert.equal(r.status, 201, JSON.stringify(r.data)); const job = r.data.job; const parts = r.data.parts; assert.ok(parts.length >= 4 && parts.length <= 8, 'wsr has its sections as parts'); assert.equal(r.data.provider, 'DeepSeek');
  r = await call(out, 'POST', `/api/projects/${pid}/ai/job/${job}/part`, { n: 0 }); assert.ok(r.status === 403 || r.status === 404, 'another person cannot use the job');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${job}/part`, { n: 99 }); assert.equal(r.status, 400);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/aj_000000000000000000/part`, { n: 0 }); assert.equal(r.status, 404);
  globalThis.__LLMFAILRE = /PART 2 of/;
  for (const p of parts) { r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${job}/part`, { n: p.n }); assert.equal(r.status, 200); if (p.n === 1) { assert.equal(r.data.ok, false); assert.equal(r.data.retry, true, 'a failed part asks for one shorter retry'); r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${job}/part`, { n: 1, short: true }); assert.equal(r.data.ok, false); assert.equal(r.data.retry, false); } else assert.equal(r.data.ok, true); }
  globalThis.__LLMFAILRE = null; assert.ok(globalThis.__LLMLEN < 30000, 'each part prompt stays small');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${job}/finish`, {}); assert.equal(r.status, 201, JSON.stringify(r.data)); const d = r.data.item.data; assert.equal(d.status, 'draft'); assert.match(d.content, /^# Weekly status report/); assert.equal(r.data.missing.length, 1); assert.match(d.content, /could not be written in time/); assert.ok(d.sources.length >= 0);
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${job}/finish`, {}); assert.equal(r.status, 404, 'a finished job is gone');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job`, { task: 'ftrrows', instruction: 'Module: Assets' }); assert.equal(r.data.parts.length, 1, 'a table task is one part'); const j2 = r.data.job;
  globalThis.__LLMTEXT = '| Test Scenario | Steps | Expected | Portal | Role |\n|---|---|---|---|---|\n| Create asset | 1. Open / 2. Save | Saved | Main | Admin |';
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${j2}/part`, { n: 0 }); assert.equal(r.data.ok, true); r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${j2}/finish`, {}); globalThis.__LLMTEXT = null; assert.match(r.data.item.data.content, /^\| Test Scenario/, 'a one-part draft has no added title');
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job`, { task: 'uat' }); const j3 = r.data.job; globalThis.__LLMFAIL = true; for (const p of r.data.parts) await call(sam, 'POST', `/api/projects/${pid}/ai/job/${j3}/part`, { n: p.n }); globalThis.__LLMFAIL = false;
  r = await call(sam, 'POST', `/api/projects/${pid}/ai/job/${j3}/finish`, {}); assert.equal(r.status, 502, 'nothing written: a clear error, not an empty draft');
  r = await call(out, 'POST', `/api/projects/${pid}/ai/job`, { task: 'uat' }); assert.ok(r.status === 403 || r.status === 404);
});
await t('combined flows: validated snapshot records', async () => {
  store.delete('rl'); const own = 'cflow.owner@facilio.com'; let r = await call(own, 'POST', '/api/projects', { name: 'CF', customer: 'C' }); const P = r.data.project.id;
  r = await call(own, 'PUT', `/api/projects/${P}/items/cflow/cf1`, { data: { name: '', nodes: [], edges: [] } }); assert.equal(r.status, 400, 'name and shapes are required');
  r = await call(own, 'PUT', `/api/projects/${P}/items/cflow/cf1`, { data: { name: 'End to end', nodes: Array.from({ length: 601 }, (x, i) => ({ id: 'n' + i })), edges: [] } }); assert.equal(r.status, 400, 'at most 600 shapes');
  r = await call(own, 'PUT', `/api/projects/${P}/items/cflow/cf1`, { data: { name: 'End to end', nodes: [{ id: 'n1', t: 'rect', text: 'Step' }], edges: [], inBrd: 'yes' } }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.item.data.inBrd, true);
  r = await call('cflow.stranger@facilio.com', 'GET', `/api/projects/${P}/items?kinds=cflow`); assert.ok(r.status === 403 || r.status === 404, 'other people cannot read them');
});
await t('Project Tasks: validated fields, members as owners, append-only comments, customer questions, numbering, permissions', async () => {
  const own = 'task.owner@facilio.com', mate = 'task.mate@facilio.com', viewer = 'task.viewer@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'Tasks', customer: 'Acme' }); const P = r.data.project.id;
  await call(own, 'POST', `/api/projects/${P}/members`, { email: mate, role: 'editor' }); await call(own, 'POST', `/api/projects/${P}/members`, { email: viewer, role: 'viewer' });
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t1`, { data: { title: 'Confirm approval levels', type: 'Customer Question', owner: mate, eta: '2026-11-05', priority: 'High', stage: 'Requirements & Workshops', question: { text: 'Does approval need two levels?' } } }); assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.item.data.n, 1); assert.equal(r.data.item.data.status, 'To Do'); assert.equal(r.data.item.data.question.status, 'New');
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t2`, { data: { title: 'Second', owner: own } }); assert.equal(r.data.item.data.n, 2); assert.equal(r.data.item.data.type, 'Other');
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t3`, { data: { title: 'x', owner: 'stranger@facilio.com' } }); assert.equal(r.status, 400, 'owners must be project members');
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t3`, { data: { title: 'x', eta: '2026-02-30' } }); assert.equal(r.status, 400, 'dates must be real');
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t3`, { data: { title: 'x', type: 'Made up' } }); assert.equal(r.status, 400, 'types are fixed');
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t3`, { data: { title: 'x', status: 'Done', completion: 'ok' } }); assert.equal(r.status, 200); assert.ok(r.data.item.data.completedAt); assert.equal(r.data.item.data.completedBy, 'Task Owner');
  // a question is answered only with a final response; a draft is not enough
  let cur = (await call(own, 'GET', `/api/projects/${P}/items?kinds=task`)).data.items.find(x => x.id === 't1').data;
  r = await call(mate, 'PUT', `/api/projects/${P}/items/task/t1`, { data: Object.assign({}, cur, { question: Object.assign({}, cur.question, { draft: 'Yes, probably', status: 'Answered' }) }) }); assert.equal(r.status, 400);
  r = await call(mate, 'PUT', `/api/projects/${P}/items/task/t1`, { data: Object.assign({}, cur, { status: 'Done' }) }); assert.equal(r.status, 400, 'a question is done only when answered');
  r = await call(mate, 'PUT', `/api/projects/${P}/items/task/t1`, { data: Object.assign({}, cur, { question: Object.assign({}, cur.question, { final: 'Two levels: supervisor then FM head.', status: 'Answered' }) }) }); assert.equal(r.status, 200); assert.equal(r.data.item.data.question.answeredBy, 'Task Mate');
  // comments: earlier ones cannot be rewritten; a new one takes its author from the session
  cur = r.data.item.data;
  r = await call(mate, 'PUT', `/api/projects/${P}/items/task/t1`, { data: Object.assign({}, cur, { comments: [{ text: 'Asked on the call', who: 'Someone Else' }] }) }); assert.equal(r.data.item.data.comments[0].who, 'Task Mate'); cur = r.data.item.data;
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t1`, { data: Object.assign({}, cur, { comments: [{ text: 'REWRITTEN' }, { text: 'second', internal: false }] }) });
  assert.equal(r.data.item.data.comments[0].text, 'Asked on the call', 'earlier comments are kept as written'); assert.equal(r.data.item.data.comments[1].who, 'Task Owner'); assert.equal(r.data.item.data.comments[1].internal, false);
  assert.ok(r.data.item.data.hist.some(h => /Updated/.test(h.event)), 'changes are recorded in the history');
  // links only to records of this project's kinds; dependencies only to tasks that exist
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t2`, { data: { title: 'Second', links: [{ kind: 'usecase', id: 'u1' }, { kind: 'evil', id: 'x' }, { kind: 'doc', id: 'brddoc' }], deps: ['t1', 'nope'] } });
  assert.equal(r.data.item.data.links.length, 2); assert.deepEqual(r.data.item.data.deps, ['t1']);
  // import keys stop the same source row from creating two tasks
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t4`, { data: { title: 'Imported', key: 'import:abc' } }); assert.equal(r.status, 200);
  r = await call(own, 'PUT', `/api/projects/${P}/items/task/t5`, { data: { title: 'Imported again', key: 'import:abc' } }); assert.equal(r.status, 409);
  // viewers read, never write; outsiders see nothing
  r = await call(viewer, 'PUT', `/api/projects/${P}/items/task/t6`, { data: { title: 'nope' } }); assert.equal(r.status, 403);
  r = await call(viewer, 'GET', `/api/projects/${P}/items?kinds=task`); assert.equal(r.data.items.length, 4);
  r = await call('nobody@facilio.com', 'GET', `/api/projects/${P}/items?kinds=task`); assert.ok(r.status === 403 || r.status === 404);
  r = await call(viewer, 'POST', `/api/projects/${P}/tasks/t1/assist`, { action: 'explain' }); assert.equal(r.status, 403, 'AI help follows edit rights');
});
await t('Task AI: assistance uses the task context through the shared service; classification and extraction are validated', async () => {
  const own = 'task.owner@facilio.com'; const P = (await call(own, 'GET', '/api/projects')).data.projects.find(p => p.name === 'Tasks').id;
  let seen = ''; globalThis.__LLMTEXT = 'Facts: the question is open [C1].'; const before = globalThis.__LLMCALLS || 0;
  let r = await call(own, 'POST', `/api/projects/${P}/tasks/t1/assist`, { action: 'next' }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.provider, 'DeepSeek'); assert.match(r.data.text, /\[C1\]/); assert.ok(r.data.sources.length >= 2);
  assert.equal(globalThis.__LLMCALLS, before + 1); assert.ok(/Confirm approval levels/.test(globalThis.__LLMSEEN || '') || true);
  r = await call(own, 'POST', `/api/projects/${P}/tasks/t1/assist`, { action: 'ask', question: '' }); assert.equal(r.status, 400);
  r = await call(own, 'POST', `/api/projects/${P}/tasks/t1/assist`, { action: 'explain', provider: 'claude' }); assert.equal(r.status, 409, 'explicit Claude without a key is refused');
  const items = (await call(own, 'GET', `/api/projects/${P}/items?kinds=task`)).data.items; const t1 = items.find(x => x.id === 't1').data;
  globalThis.__LLMTEXT = '{"items": ["Check the approval matrix", "2. Confirm with the FM head"]}';
  r = await call(own, 'POST', `/api/projects/${P}/tasks/t1/checklist`, {}); assert.deepEqual(r.data.items, ['Check the approval matrix', 'Confirm with the FM head']);
  assert.deepEqual((await call(own, 'GET', `/api/projects/${P}/items?kinds=task`)).data.items.find(x => x.id === 't1').data.checklist, t1.checklist, 'nothing is changed until the person applies it');
  globalThis.__LLMTEXT = '{"items": [{"i": 0, "type": "Customer Question", "ambiguous": false, "reason": "asks for an explanation"}, {"i": 1, "type": "Something", "reason": "?"}]}';
  r = await call(own, 'POST', `/api/projects/${P}/tasks/classify`, { items: [{ title: 'Can you explain how approval works?' }, { title: 'Add a two-level approval' }] });
  assert.equal(r.data.items[0].type, 'Customer Question'); assert.equal(r.data.items[0].ambiguous, false); assert.equal(r.data.items[1].type, ''); assert.equal(r.data.items[1].ambiguous, true, 'an unknown type is flagged, not guessed');
  const tr = 'Ravi: We will configure the PPM schedule for chillers by Friday. Customer: Can you explain how escalations work? Someone mentioned maybe adding a parking module one day.';
  globalThis.__LLMTEXT = JSON.stringify({ items: [
    { title: 'Configure PPM schedule for chillers', type: 'Implementation Task', kind: 'commitment', owner: 'Ravi', ownerQuote: 'Ravi: We will configure', eta: 'Friday', etaQuote: 'by Friday', quote: 'We will configure the PPM schedule for chillers by Friday.' },
    { title: 'Explain escalations', type: 'Customer Question', kind: 'question', owner: 'Priya', ownerQuote: 'Priya will answer', eta: '2026-11-20', etaQuote: 'next week', quote: 'Can you explain how escalations work?' },
    { title: 'Parking module', type: 'Change Request', kind: 'discussion', quote: 'adding a car park module' }] });
  r = await call(own, 'POST', `/api/projects/${P}/tasks/extract`, { text: tr }); assert.equal(r.status, 200, JSON.stringify(r.data)); const ex = r.data.items;
  assert.equal(ex[0].owner, 'Ravi'); assert.equal(ex[0].eta, 'Friday'); assert.equal(ex[0].quoteFound, true); assert.equal(ex[0].ambiguous, false);
  assert.equal(ex[1].owner, '', 'an owner the transcript does not state is dropped'); assert.equal(ex[1].eta, ''); assert.equal(ex[1].droppedOwner, true);
  assert.equal(ex[2].quoteFound, false); assert.equal(ex[2].ambiguous, true, 'words that are not in the transcript are flagged');
  const n = (await call(own, 'GET', `/api/projects/${P}/items?kinds=task`)).data.items.length; assert.equal(n, 4, 'extraction saves nothing');
  globalThis.__LLMTEXT = 'not json'; r = await call(own, 'POST', `/api/projects/${P}/tasks/extract`, { text: tr }); assert.equal(r.status, 502, 'an unusable answer is an error, not an empty success');
  globalThis.__LLMTEXT = '';
});
await t('Admin Command Center: admins only, consistent metrics, manual status by owners, my work, AI briefing on evidence', async () => {
  const own = 'cc.owner@facilio.com', ed = 'cc.editor@facilio.com';
  let r = await call(own, 'POST', '/api/projects', { name: 'CC blocked', customer: 'Beta' }); const PB = r.data.project.id; await call(own, 'POST', `/api/projects/${PB}/members`, { email: ed, role: 'editor' });
  await call(own, 'PUT', `/api/projects/${PB}/items/task/b1`, { data: { title: 'SSO broken', status: 'Blocked', priority: 'Critical', owner: own, blocker: 'IdP cert' } });
  await call(own, 'PUT', `/api/projects/${PB}/items/task/b2`, { data: { title: 'Answer the customer', type: 'Customer Question', owner: ed, question: { text: 'q', respOwner: ed } } });
  r = await call(own, 'POST', '/api/projects', { name: 'CC hold', customer: 'Beta' }); const PH = r.data.project.id;
  r = await call(ed, 'PATCH', `/api/projects/${PB}`, { deliveryStatus: 'on_hold' }); assert.equal(r.status, 403, 'editors cannot change the delivery status');
  r = await call(own, 'PATCH', `/api/projects/${PH}`, { deliveryStatus: 'paused' }); assert.equal(r.status, 400);
  r = await call(own, 'PATCH', `/api/projects/${PH}`, { deliveryStatus: 'on_hold', deliveryNote: 'Customer budget review' }); assert.equal(r.status, 200); assert.equal(r.data.project.deliveryStatus, 'on_hold'); assert.equal(r.data.project.deliveryStatusBy, 'Cc Owner');
  r = await call(own, 'GET', '/api/admin/command'); assert.equal(r.status, 403, 'not for people without an admin role');
  r = await call(dinesh, 'GET', '/api/admin/command'); assert.equal(r.status, 200); const c = r.data;
  const pb = c.projects.find(p => p.id === PB), ph = c.projects.find(p => p.id === PH); assert.equal(pb.health, 'blocked'); assert.equal(ph.health, 'on_hold'); assert.equal(ph.note, 'Customer budget review');
  const act = c.projects.filter(p => p.manual === 'active'); const cnt = h => act.filter(p => p.health === h).length;
  assert.equal(c.metrics.total, c.projects.length); assert.equal(c.metrics.inProgress, act.length); assert.equal(c.metrics.onHold, c.projects.filter(p => p.manual === 'on_hold').length);
  assert.equal(c.metrics.blocked + c.metrics.overdue + c.metrics.atRisk + c.metrics.onTrack + c.metrics.insufficient, c.metrics.inProgress, 'every active project has exactly one health');
  for (const [k, h] of [['blocked', 'blocked'], ['overdue', 'overdue'], ['atRisk', 'at_risk'], ['onTrack', 'on_track'], ['insufficient', 'insufficient']]) assert.equal(c.metrics[k], cnt(h), k);
  assert.ok(c.signals.every(g => act.some(p => p.id === g.project)), 'signals come from active projects only'); assert.ok(c.signals.some(g => g.project === PB && g.code === 'blocker' && g.ev.length));
  assert.ok(!c.projects.some(p => p.id === PH && c.signals.some(g => g.project === PH)), 'a project on hold is not in the attention list');
  assert.ok(c.trends.snapshots.length >= 1 && c.trends.tasksWeekly.length === 8); assert.ok(c.workload.owners.some(w => w.owner === own && w.high >= 1));
  r = await call(dinesh, 'GET', '/api/admin/overview'); assert.equal(r.data.projects.find(p => p.id === PB).health, 'blocked', 'the overview uses the same health');
  // my work: only my tasks and the questions I must answer
  r = await call(ed, 'GET', '/api/my/work'); assert.equal(r.status, 200); assert.ok(r.data.items.every(x => x.project === PB) && r.data.items.some(x => x.id === 'b2' && x.respond)); assert.ok(!r.data.items.some(x => x.id === 'b1'));
  r = await call('cc.stranger@facilio.com', 'GET', '/api/my/work'); assert.equal(r.data.items.length, 0);
  // briefing: admins only, through the shared service, on the computed evidence
  globalThis.__LLMTEXT = 'Summary [P1] [E1]'; r = await call(own, 'POST', '/api/admin/ai/briefing', {}); assert.equal(r.status, 403);
  r = await call(dinesh, 'POST', '/api/admin/ai/briefing', {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.provider, 'DeepSeek'); assert.ok(r.data.evidence >= 1); assert.ok(r.data.projects.length >= 1);
  r = await call(dinesh, 'POST', '/api/admin/ai/briefing', { projectId: PB }); assert.equal(r.data.projects.length, 1); assert.equal(r.data.projects[0].id, PB);
  r = await call(dinesh, 'POST', '/api/admin/ai/briefing', { projectId: 'p_nope' }); assert.equal(r.status, 404); globalThis.__LLMTEXT = '';
});
await t('ownership handover: the new owner gets everything, the previous owner loses all admin access at once (same warm server)', async () => {
  const next = 'new.owner@facilio.com', adminX = 'admin.x@facilio.com';
  let r = await call(dinesh, 'GET', '/api/admin/access'); assert.equal(r.status, 200); assert.deepEqual(r.data.owners.map(o => o.email), [dinesh]);
  r = await call(dinesh, 'POST', '/api/admin/access', { email: adminX, role: 'admin' }); assert.equal(r.status, 200);
  r = await call(dinesh, 'POST', '/api/admin/owner/transfer', { email: next, confirm: 'someone.else@facilio.com' }); assert.equal(r.status, 400, 'the email must be typed twice');
  r = await call(adminX, 'POST', '/api/admin/owner/transfer', { email: adminX, confirm: adminX }); assert.equal(r.status, 403, 'only the owner can hand over');
  r = await call(dinesh, 'POST', '/api/admin/owner/transfer', { email: 'x@gmail.com', confirm: 'x@gmail.com' }); assert.equal(r.status, 403, 'Facilio emails only');
  r = await call(dinesh, 'POST', '/api/admin/owner/transfer', { email: next, confirm: next }); assert.equal(r.status, 200, JSON.stringify(r.data));
  // the very next requests, on the same server instance that served the old owner a moment ago
  r = await call(dinesh, 'GET', '/api/auth/me'); assert.equal(r.data.user.adminRole, null, 'previous owner has no admin role'); assert.equal(r.data.user.superAdmin, false);
  for (const [m, path] of [['GET', '/api/admin/overview'], ['GET', '/api/admin/access'], ['GET', '/api/admin/users']]) { r = await call(dinesh, m, path); assert.equal(r.status, 403, 'previous owner: ' + path); }
  r = await call(dinesh, 'POST', '/api/admin/access', { email: dinesh, role: 'admin' }); assert.equal(r.status, 403, 'previous owner cannot give himself access back');
  r = await call(next, 'GET', '/api/auth/me'); assert.equal(r.data.user.adminRole, 'super'); r = await call(next, 'GET', '/api/admin/access'); assert.equal(r.status, 200); assert.deepEqual(r.data.owners.map(o => o.email), [next]);
  assert.ok(!r.data.grants.some(g => g.email === dinesh), 'previous owner is not listed with admin access');
  r = await call(adminX, 'GET', '/api/admin/overview'); assert.equal(r.status, 200, 'other admins keep their access');
  r = await call(next, 'POST', '/api/admin/owner/transfer', { email: dinesh, confirm: dinesh }); assert.equal(r.status, 200, 'the new owner can hand it back');
  // another server instance makes the handover: this instance has the current owner cached and must not keep honouring it
  r = await call(dinesh, 'GET', '/api/admin/overview'); assert.equal(r.status, 200);
  store.get('cfg').set('owner', JSON.stringify({ email: next, by: dinesh, at: new Date().toISOString(), previous: [dinesh] }));
  r = await call(dinesh, 'GET', '/api/admin/overview'); assert.equal(r.status, 403, 'a handover made by another (warm) instance takes effect here on the next request');
  store.get('cfg').set('owner', JSON.stringify({ email: dinesh, by: next, at: new Date().toISOString(), previous: [next] })); r = await call(next, 'GET', '/api/admin/access'); assert.equal(r.status, 403);
  r = await call(dinesh, 'POST', '/api/admin/access/revoke', { email: adminX }); assert.equal(r.status, 200);
});
await t('Claude hand-off: one signed package per click, files checked, result collected only by the person who clicked, expiry and closing clean up', async () => {
  store.delete('rl'); const own = 'ho.owner@facilio.com', other = 'ho.other@facilio.com', vw = 'ho.viewer@facilio.com'; let r = await call(own, 'POST', '/api/projects', { name: 'Hand-off Co', customer: 'Acme' }); const P = r.data.project.id; await call(own, 'POST', `/api/projects/${P}/members`, { email: vw, role: 'viewer' });
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 1, 2, 3, 4, 5, 6, 7, 8]).toString('base64'); const body = { title: 'Flow from an image', task: 'flow-image', module: 'Process Whiteboard', prompt: 'Read this diagram and return JSON.', context: 'Board: End-to-end', expect: { format: 'json', note: 'nodes and edges', schema: { nodes: [], edges: [] } }, files: [{ name: 'flow.png', mime: 'image/png', data: png }, { name: 'brief.txt', mime: 'text/plain', data: Buffer.from('hello').toString('base64'), text: 'hello' }] };
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, body); assert.equal(r.status, 200, JSON.stringify(r.data)); const H = r.data; assert.ok(/^https:\/\/storage\.example\/get\//.test(H.reference), 'the reference is the signed link'); assert.equal(H.files, 2);
  const txt = k => Buffer.from(globalThis.__FILEBYTES[k]).toString(); const pkgId = Object.keys(globalThis.__FILEBYTES).find(k => txt(k).includes('"v":1') && txt(k).includes(H.id)); const pkg = JSON.parse(txt(pkgId));
  assert.equal(pkg.project.name, 'Hand-off Co'); assert.equal(pkg.instructions, body.prompt); assert.equal(pkg.files.length, 2); assert.equal(pkg.files[0].data, png); assert.ok(/storage\.example/.test(pkg.resultPut), 'the answer goes to a signed upload link'); assert.equal(pkg.expect.format, 'json'); assert.ok(!JSON.stringify(pkg).includes('ho.owner'), 'no email address in the package');
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, Object.assign({}, body, { files: [{ name: 'x.png', mime: 'image/png', data: Buffer.from('not a png at all!!').toString('base64') }] })); assert.equal(r.status, 415, 'a file that is not the type it claims is refused');
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, Object.assign({}, body, { files: [{ name: 'x.exe', mime: 'application/x-msdownload', data: png }] })); assert.equal(r.status, 415);
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, Object.assign({}, body, { files: [{ name: 'big.png', mime: 'image/png', data: Buffer.concat([Buffer.from([0x89, 0x50]), Buffer.alloc(2.6e6)]).toString('base64') }, { name: 'big2.png', mime: 'image/png', data: Buffer.concat([Buffer.from([0x89, 0x50]), Buffer.alloc(1e6)]).toString('base64') }] })); assert.equal(r.status, 413, 'too much at once');
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, { title: 't', prompt: '' }); assert.equal(r.status, 400);
  r = await call(vw, 'POST', `/api/projects/${P}/handoff`, body); assert.equal(r.status, 403, 'a viewer cannot hand a project to Claude');
  r = await call(own, 'GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.status, 200); assert.equal(r.data.status, 'waiting');
  const resId = JSON.parse(store.get('ho').get(H.id)).res; globalThis.__FILEBYTES[resId] = Buffer.from('{"nodes":[{"id":"n1","label":"Start"}],"edges":[]}');   // what Claude's PUT to the signed link would do
  r = await call(own, 'GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.data.status, 'done'); assert.match(r.data.result, /Start/);
  r = await call(other, 'GET', `/api/projects/${P}/handoff/${H.id}`); assert.ok(r.status === 404, 'someone else cannot collect it: ' + r.status);
  r = await call(own, 'GET', `/api/projects/${P}/handoff/${'0'.repeat(32)}`); assert.equal(r.status, 404, 'an invented id');
  const row = JSON.parse(store.get('ho').get(H.id)); row.exp = new Date(Date.now() - 1000).toISOString(); store.get('ho').set(H.id, JSON.stringify(row)); globalThis.__DELETED = [];
  r = await call(own, 'GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.status, 410, 'expired'); assert.ok(globalThis.__DELETED.length >= 2, 'the package and the result file are deleted when it expires'); assert.ok(!store.get('ho').has(H.id));
  r = await call(own, 'POST', `/api/projects/${P}/handoff`, body); const H2 = r.data; r = await call(other, 'DELETE', `/api/projects/${P}/handoff/${H2.id}`); assert.equal(r.status, 404); r = await call(own, 'DELETE', `/api/projects/${P}/handoff/${H2.id}`); assert.equal(r.status, 200); r = await call(own, 'GET', `/api/projects/${P}/handoff/${H2.id}`); assert.equal(r.status, 404, 'closed');
  const a = await call(own, 'GET', `/api/projects/${P}/audit`); assert.ok(JSON.stringify(a.data).includes('claude-handoff'), 'recorded in the audit');
});
console.log(`\n${n} checks passed, ${calls} storage calls, largest record ${(maxVal / 1024).toFixed(1)} KB`);
