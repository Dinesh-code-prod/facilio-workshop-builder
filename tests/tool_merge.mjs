// Merged connector tools (27 Nov 2026; the platform allows 40 tools): transcripts (list, read, search, minutes), get_pack (a deliverable or review),
// get_records without kind (the kinds), connector_help topics skills and feedback, find_projects forTickets. The old code keeps its names behind them (api.mjs, after ACTION_TOOLS).
// Same stand-in platform as tests/connector_skills.mjs, one person.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../work/server/api.mjs';
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); return { items: keys.slice(0, o.limit || 100).map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'x' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const call = async (method, path, body, headers) => { const r = await handler({ method, path: path.replace(/^\/api/, ''), query: '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx('sam.k@facilio.com')); return { status: r.status, data: await r.json() }; };
const tool = (name, body) => call('POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const GONE = ['list_projects', 'get_task_pack', 'get_review_pack', 'list_record_kinds', 'get_transcripts', 'get_transcript', 'search_transcripts', 'get_mom_pack', 'get_impl_skills', 'get_feedback'];
const pid = (await call('POST', '/api/projects', { name: 'Merge Test', customer: 'Acme' })).data.project.id;
await call('PUT', `/api/projects/${pid}/items/raid/r1`, { data: { title: 'Risk', status: 'Open' } });

await t('the tool list has the merged tools and none of the ten it replaced', async () => {
  const tools = JSON.parse(fs.readFileSync('work/work.json', 'utf8')).mcp.tools, names = tools.map(x => x.name);
  assert.equal(names.length, 32); assert.ok(names.length <= 40, 'the platform allows 40'); for (const g of GONE) assert.ok(!names.includes(g), g);
  for (const k of ['transcripts', 'get_pack', 'get_records', 'connector_help', 'find_projects']) assert.ok(names.includes(k), k);
  assert.deepEqual(tools.find(x => x.name === 'transcripts').input_schema.properties.action.enum, ['list', 'read', 'search', 'minutes']);
  assert.deepEqual(tools.find(x => x.name === 'get_records').input_schema.required, ['project']);
});
await t('transcripts forwards each action and refuses an unknown one', async () => {
  const l = await tool('transcripts', { action: 'list', project: pid }); assert.equal(l.status, 200);
  assert.equal((await tool('transcripts', { action: 'search', project: pid, query: 'ab' })).status, 400, 'search keeps its own three-character rule');
  assert.equal((await tool('transcripts', { action: 'read', project: pid, id: 'nope' })).status >= 400, true);
  assert.equal((await tool('transcripts', { action: 'nope', project: pid })).status, 400);
});
await t('get_pack gives a deliverable pack, or the review pack with task review', async () => {
  const u = await tool('get_pack', { project: pid, task: 'uat' }); assert.equal(u.status, 200); assert.ok(u.data.prompt || u.data.pack || u.data.note);
  const r = await tool('get_pack', { project: pid, task: 'review' }); assert.equal(r.status, 200); assert.notDeepEqual(Object.keys(r.data).sort(), Object.keys(u.data).sort());
  assert.equal((await tool('get_pack', { project: pid, task: 'nonsense' })).status, 400);
});
await t('get_records without a kind lists the kinds; with a kind it reads them', async () => {
  const k = await tool('get_records', { project: pid }); assert.equal(k.status, 200); assert.ok(k.data.kinds.some(x => x.kind === 'raid' && x.count === 1));
  const r = await tool('get_records', { project: pid, kind: 'raid' }); assert.equal(r.status, 200); assert.equal(r.data.records.length, 1);
});
await t('connector_help: topic skills and feedback run the tools; other topics keep the recipes and tool docs', async () => {
  const s = await tool('connector_help', { topic: 'skills', task: 'uat' }); assert.equal(s.status, 200); assert.ok(Array.isArray(s.data.skills));
  const f = await tool('connector_help', { topic: 'feedback' }); assert.equal(f.status, 200);
  const d = await tool('connector_help', { topic: 'session_questions' }); assert.equal(d.data.tool, 'session_questions');
});
await t('find_projects forTickets lists the projects you can create tickets in', async () => {
  const r = await tool('find_projects', { forTickets: true }); assert.equal(r.status, 200); assert.ok(r.data.projects.some(p => p.name === 'Merge Test' && 'customer' in p));
  const a = await tool('find_projects', {}); assert.ok(a.data.projects[0].id, 'the normal answer still has ids');
});
await t('no prompt, recipe or help text sends Claude to a tool it can no longer see', async () => {
  const re = new RegExp('(?<![\\w."]|async )\\b(' + GONE.join('|') + ')\\b(?![(\'"\\w])');
  const files = [...fs.readdirSync('src').filter(f => f.endsWith('.js') && f !== 'whatsnew.js').map(f => 'src/' + f), ...fs.readdirSync('work/server').filter(f => f.endsWith('.mjs')).map(f => 'work/server/' + f)];
  for (const f of files) { const m = fs.readFileSync(f, 'utf8').match(re); assert.ok(!m, f + ' still names ' + (m && m[0])); }
  assert.ok(!new RegExp('\\b(' + GONE.join('|') + ')\\b').test(JSON.stringify(JSON.parse(fs.readFileSync('work/work.json', 'utf8')).mcp.tools.map(x => [x.description, x.input_schema]))));
});
console.log(n + ' tool merge checks passed');
