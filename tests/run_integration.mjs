// Facilio Run in Delivery Studio (work/server/_runapi.mjs, src/webframelogic.js): the address check, the directory copy Claude saves, the published link on a project, and the site list.
// Same stand-in platform as tests/connector_skills.mjs, one person.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import handler from '../work/server/api.mjs';
import { runUrl, cleanSites } from '../work/server/_runapi.mjs';
const W = createRequire(import.meta.url)('../src/webframelogic.js');
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const page = keys.slice(0, o.limit || 100); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'x' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const me = 'sam.k@facilio.com';
const callAs = async (who, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(who)); return { status: r.status, data: await r.json() }; };
const call = (...a) => callAs(me, ...a);
const tool = (name, body) => call('POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

await t('only https://<name>.facilio.run addresses pass', async () => {
  assert.equal(runUrl('https://ds-acme-report.facilio.run/'), 'https://ds-acme-report.facilio.run/');
  assert.equal(runUrl('https://DS-Acme.facilio.run/a/b'), 'https://ds-acme.facilio.run/a/b');
  for (const bad of ['http://x.facilio.run/', 'https://x.facilio.run.evil.com/', 'https://user:pw@x.facilio.run/', 'https://x.facilio.run:8443/', 'https://a.b.facilio.run/', 'javascript:alert(1)', 'https://-x.facilio.run/', 'https://x.facilio.work/', '', null]) assert.equal(runUrl(bad), '', String(bad));
});
await t('the directory keeps valid names once, with the kept fields only', async () => {
  const s = cleanSites([{ name: 'impl-ai-hub', description: 'AI tools\nfor implementation', creator: 'a@facilio.com', last_deploy_at: '2026-11-25T10:00:00Z', secret: 'drop me' }, { name: 'impl-ai-hub' }, { name: 'Bad Name!' }, null, 'x']);
  assert.deepEqual(s, [{ name: 'impl-ai-hub', url: 'https://impl-ai-hub.facilio.run/', description: 'AI tools for implementation', by: 'a@facilio.com', updated: '2026-11-25T10:00:00.000Z' }]);
  assert.equal(cleanSites(Array.from({ length: 1200 }, (_, i) => ({ name: 's' + i }))).length, 1000);
});
await t('project_jobs run_directory stores the copy the Facilio tools page reads; someone on no project team can neither read nor replace it', async () => {
  const out = 'not.on.a.team@facilio.com', mcp = { 'x-work-mcp': '1', 'x-work-mcp-tool': 'project_jobs' };
  assert.equal((await callAs(out, 'POST', '/api/', { action: 'run_directory', sites: [{ name: 'x' }] }, mcp)).status, 403);
  await call('POST', '/api/projects', { name: 'Team Project', customer: 'Acme' });   // sam is now on a project team
  assert.equal((await tool('project_jobs', { action: 'run_directory',  sites: [] })).status, 400);
  const r = await tool('project_jobs', { action: 'run_directory',  sites: [{ name: 'run-index', description: 'Live index' }, { name: 'no good' }] }); assert.equal(r.status, 200); assert.equal(r.data.saved, 1); assert.equal(r.data.skipped, 1);
  const g = await call('GET', '/api/run/directory'); assert.equal(g.status, 200); assert.deepEqual(g.data.sites.map(x => x.name), ['run-index']); assert.equal(g.data.by, me); assert.ok(g.data.refreshedAt);
  assert.equal((await callAs(out, 'GET', '/api/run/directory')).status, 403, 'the list names customers\' sites');
});
await t('project_jobs run_link records the published page on the project, newest first, one per address', async () => {
  const pid = (await call('POST', '/api/projects', { name: 'Run Test', customer: 'Acme' })).data.project.id;
  assert.equal((await tool('project_jobs', { action: 'run_link',  project: pid, url: 'https://facilio.run/' })).status, 400, 'the bare directory is not a published page');
  assert.equal((await tool('project_jobs', { action: 'run_link',  project: pid, url: 'https://evil.example/' })).status, 400);
  assert.equal((await tool('project_jobs', { action: 'run_link',  project: pid, url: 'https://ds-run-test-report.facilio.run/', title: 'Old' })).status, 200);
  assert.equal((await tool('project_jobs', { action: 'run_link',  project: pid, url: 'https://ds-run-test-uat.facilio.run/', page: 'UAT' })).status, 200);
  const r = await tool('project_jobs', { action: 'run_link',  project: pid, url: 'https://ds-run-test-report.facilio.run/', title: 'Status' }); assert.match(r.data.message, /Report pack/);
  const g = await call('GET', `/api/projects/${pid}/runlinks`); assert.equal(g.status, 200);
  assert.deepEqual(g.data.links.map(l => [l.url, l.page, l.title]), [['https://ds-run-test-report.facilio.run/', 'Report pack', 'Status'], ['https://ds-run-test-uat.facilio.run/', 'UAT', '']]);
});
await t('connector_help explains both actions; an unknown action is refused', async () => {
  const r = await tool('connector_help', { topic: 'facilio_run' }); assert.equal(r.status, 200); assert.match(r.data.description, /action run_directory/); assert.match(r.data.description, /wait for their OK/);
  assert.equal((await tool('project_jobs', { action: 'nope' })).status, 400);
  const fs = await import('node:fs'); const tools = JSON.parse(fs.readFileSync('work/work.json', 'utf8')).mcp.tools; assert.ok(tools.length <= 40, 'the platform allows 40 tools');
  const pj = tools.find(x => x.name === 'project_jobs'); assert.ok(['run_directory', 'run_link'].every(a => pj.input_schema.properties.action.enum.includes(a))); assert.match(pj.description, /connector_help topic facilio_run/);
});
await t('the Facilio Run tab lists only facilio.run sites, each opening in a new tab', async () => {
  const run = W.siteById('run'); assert.ok(run && run.framed === false);
  const all = W.RUN_GROUPS.flatMap(g => g.sites); assert.ok(all.length >= 10); assert.equal(new Set(all.map(s => s.name)).size, all.length, 'no site twice');
  for (const s of all) assert.equal(runUrl(W.runSiteUrl(s.name)), W.runSiteUrl(s.name), s.name);
});
console.log(n + ' Facilio Run checks passed');
