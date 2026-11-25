// Project actions (work/server/_actions.mjs): dry run, token, verify, audit, undo, and the connector tool project_actions. Same stand-in platform as tests/connector_skills.mjs.
import * as A from '../work/server/_actions.mjs';
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), fileStore = new Map(); let seq = 0; const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: '## Draft [S1]' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(n) { const id = 'f' + (++seq) + n; fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put(o) { const id = 'p' + (++seq); fileStore.set(id, Buffer.from(o.body)); return { file_id: id }; }, async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
const me = 'sam.k@facilio.com';
const call = async (method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(me)); return { status: r.status, data: await r.json() }; };
const tool = (name, body) => call('POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const st = async () => (await call('GET', `/api/projects/${pid}/docs/workshop`)).data;
const pid = (await call('POST', '/api/projects', { name: 'Actions Test', customer: 'Acme' })).data.project.id;
const flowModel = id => ({ id, module: 'purchaseorder', name: 'PO approval', initial: 's_open', states: [{ id: 's_open', name: 'Open' }], transitions: [] });
await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: { modules: { purchaseorder: { inScope: true, priority: 'high' }, quote: {} }, flows: { pq1: { id: 'pq1', module: 'quote', name: 'Quote flow', origin: 'proposed', states: [], transitions: [] } },
  requirements: [{ id: 'r1', title: 'PO needs two approvals', status: 'Draft', modules: ['purchaseorder'] }], notifications: [{ name: 'PO raised', module: 'purchaseorder' }] }, baseVersion: 0 });
await call('PUT', `/api/projects/${pid}/docs/planner`, { data: { scope: [{ module: 'quote', status: 'matched' }, { module: 'purchaserequest', status: 'matched' }] }, baseVersion: 0 });
const known = [{ name: 'purchaseorder', label: 'Purchase Order' }, { name: 'purchaserequest', label: 'Purchase Request' }, { name: 'quote', label: 'Quote' }];
const extraFlows = [{ id: 'b1', name: 'PO approval', module: 'purchaseorder', enabled: true, model: flowModel('b1') }, { id: 'b2', name: 'PR flow', module: 'purchaserequest', enabled: true }];
const ask = { modules: ['Purchase Order', 'purchase requests', 'Quote', 'Invoice'], inScope: false, flows: 'off', known, extraFlows };

await t('module words resolve to known modules; an unknown name is reported, never guessed', () => {
  const r = A.resolveModules(['Purchase Order', 'quotes', 'PURCHASEREQUEST', 'Invoice'], known); assert.deepEqual(r.found.map(m => m.name), ['purchaseorder', 'quote', 'purchaserequest']); assert.deepEqual(r.unknown, ['Invoice']);
});
let plan;
await t('a dry run plans the change, lists what depends on it and writes nothing', async () => {
  const before = await st(); const r = await call('POST', `/api/projects/${pid}/actions/scope`, ask); assert.equal(r.status, 200, JSON.stringify(r.data)); plan = r.data;
  assert.ok(plan.dryRun && plan.token); assert.deepEqual(plan.plan.modules.map(m => [m.name, m.from, m.change]), [['purchaseorder', true, true], ['purchaserequest', true, true], ['quote', true, true]], 'the contract match counts as in scope');
  assert.deepEqual(plan.plan.flows.map(f => f.id).sort(), ['b1', 'pq1']); assert.deepEqual(plan.plan.hidden.map(f => f.id), ['b2'], 'a flow without its design is reported, not changed');
  assert.deepEqual(plan.plan.unknown, ['Invoice']); assert.equal(plan.plan.deps.purchaseorder.requirements, 1); assert.ok(plan.plan.consequences.some(c => /1 requirement, 1 notification/.test(c)));
  assert.ok(!JSON.stringify(plan.plan).includes('s_open'), 'flow designs stay on the server'); assert.equal((await st()).version, before.version, 'nothing written');
});
await t('the run needs the token of a preview of the same person and an unchanged project', async () => {
  const bad = await call('POST', `/api/projects/${pid}/actions/scope`, Object.assign({}, ask, { token: 't_nope' })); assert.equal(bad.status, 409);
  const cur = await st(); await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: cur.data, baseVersion: cur.version });
  const stale = await call('POST', `/api/projects/${pid}/actions/scope`, Object.assign({}, ask, { token: plan.token })); assert.equal(stale.status, 409); assert.match(stale.data.error, /changed since the preview/);
  plan = (await call('POST', `/api/projects/${pid}/actions/scope`, ask)).data;
});
let undoId;
await t('the run writes, reads back, audits and returns an undo id', async () => {
  const r = await call('POST', `/api/projects/${pid}/actions/scope`, Object.assign({}, ask, { token: plan.token })); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.done && r.data.verified); undoId = r.data.undoId;
  const w = (await st()).data; assert.equal(w.modules.purchaseorder.inScope, false); assert.equal(w.modules.purchaseorder.priority, 'high', 'other settings stay'); assert.equal(w.modules.quote.inScope, false); assert.equal(w.modules.purchaserequest.inScope, false);
  assert.equal(w.flows.pq1.enabled, false); assert.equal(w.flows.b1.enabled, false); assert.equal(w.flows.b1.workshopCopy, true); assert.ok(!w.flows.b2);
  const au = (await call('GET', `/api/projects/${pid}/audit`)).data.entries; assert.ok(au.some(e => e.action === 'action-scope' && /verified/.test(e.detail)));
  const again = await call('POST', `/api/projects/${pid}/actions/scope`, Object.assign({}, ask, { token: plan.token })); assert.equal(again.status, 409, 'a token runs once');
});
await t('undo puts back only what the action changed', async () => {
  const cur = await st(); cur.data.modules.quote.priority = 'low'; await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: cur.data, baseVersion: cur.version });
  const r = await call('POST', `/api/projects/${pid}/actions/undo`, { id: undoId }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.verified);
  const w = (await st()).data; assert.equal(w.modules.purchaseorder.inScope, true); assert.equal(w.modules.quote.inScope, undefined, 'back to the contract default'); assert.equal(w.modules.quote.priority, 'low', 'a later edit survives the undo');
  assert.equal(w.flows.pq1.enabled, undefined); assert.ok(!w.flows.b1, 'the copy made for the switch is removed');
  assert.equal((await call('POST', `/api/projects/${pid}/actions/undo`, { id: undoId })).status, 409); assert.ok((await call('POST', `/api/projects/${pid}/actions/history`, {})).data.actions[0].undone);
});
await t('Claude does the same through project_changes: dry run, then the token', async () => {
  const d = await tool('project_changes', { action: 'scope', project: pid, modules: ['Quote'], inScope: false, flows: 'off' }); assert.equal(d.status, 200, JSON.stringify(d.data)); assert.ok(d.data.token); assert.match(d.data.note, /Nothing is changed yet/);
  const r = await tool('project_changes', { action: 'scope', project: pid, modules: ['Quote'], inScope: false, flows: 'off', token: d.data.token }); assert.ok(r.data.verified); assert.match(r.data.note, /Undo/);
  assert.equal((await st()).data.modules.quote.inScope, false);
});
await t('only people who can edit run actions, and an unknown action is refused', async () => {
  assert.equal((await call('POST', `/api/projects/${pid}/actions/drop_table`, {})).status, 404);
  const src = (await import('node:fs')).readFileSync('work/server/_actions.mjs', 'utf8'); assert.match(src, /projectAccess\(s, pid, 'edit'\)/);
});
await t('the project check groups findings by severity with what to do, and changes nothing', async () => {
  await call('PUT', `/api/projects/${pid}/items/task/late1`, { data: { title: 'Send the SLA draft', status: 'To Do', due: '2020-01-01', owner: me } });
  const v = (await st()).version, r = await call('POST', `/api/projects/${pid}/actions/check`, {}); assert.equal(r.status, 200, JSON.stringify(r.data));
  const all = r.data.groups.flatMap(g => g.items.map(x => Object.assign({ sev: g.sev }, x))), late = all.find(x => /Send the SLA draft/.test(x.title)); assert.ok(late, JSON.stringify(r.data));
  assert.equal(late.sev, 'high', '7+ days late is high'); assert.ok(late.action && late.key);
  assert.deepEqual(r.data.groups.map(g => g.sev), ['critical', 'high', 'medium', 'low'].filter(x => r.data.groups.some(g => g.sev === x)), 'most severe first'); assert.equal((await st()).version, v, 'read only');
  const c = await tool('project_changes', { project: pid, action: 'check' }); assert.equal(c.status, 200); assert.ok(Array.isArray(c.data.groups));
});
console.log(`\n${n} project action checks passed`);
