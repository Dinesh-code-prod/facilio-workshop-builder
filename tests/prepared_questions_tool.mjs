// Prepared questions as connector tools (roadmap E2 workspace 3, E14): get_prepared_questions and live_ask, called the way Claude calls them (POST /api/ with the x-work-mcp-tool header)
// on the stand-in platform of tests/transfer_routes.mjs. The rules themselves are tested in tests/session_questions.mjs; this checks that the server uses the SAME copy, builds its input from the
// project's own records, keeps customers out, caps a live call at 500 pieces and saves nothing. NOT checked: a real Claude session, a real call, the browser tab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../work/server/api.mjs';
import { questionInput, MAX_CHUNKS } from '../work/server/_questionsapi.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get() { throw new Error('no secret'); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (s.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com', OUT = 'out.s@facilio.com';
const mkProject = async name => { const id = (await as(SAM, 'POST', '/api/projects', { name, customer: 'Acme' })).data.project.id; for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${id}/members`, { email: e, role })).status, 201);
  const row = JSON.parse(store.get('projects').get(id)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(id, JSON.stringify(row)); return id; };
const putDoc = async (id, sec, data) => assert.equal((await as(SAM, 'PUT', `/api/projects/${id}/docs/${sec}`, { baseVersion: 0, data })).status, 200);
const docs = id => [...store.keys()].filter(k => k.endsWith('.' + id)).map(k => k + ':' + [...store.get(k).entries()].map(([a, b]) => a + b).join('')).join('|');

const PLANNER = { scope: [{ id: 's1', text: 'Preventive maintenance scheduling', module: 'workorder', status: 'matched' }, { id: 's2', text: 'Emergency dispatch by SMS', module: 'workorder', status: 'uncertain' }, { id: 's3', text: 'Contractor invoicing portal', module: 'workorder', status: 'excluded' },
  { id: 's4', text: 'Needs inventory stock levels check', module: 'workorder', status: 'matched' }, { id: 'i1', text: 'Spare part stock levels', module: 'inventory', status: 'matched' }, { id: 'nomod', text: 'A scope line with no module', module: '', status: 'matched' }],
  sessions: [{ id: 'ss1', modules: ['inventory'], status: 'planned' }], contractX: { scopeX: { exclusions: [{ text: 'Integration with third party payroll systems is not included in the scope of this Agreement.' }] } } };
const WORKSHOP = { requirements: [{ id: 'R1', title: 'Contractor invoicing portal', objective: 'vendors upload invoices', status: 'Draft', modules: ['workorder'] }, { id: 'R2', title: 'Technicians close needs inventory stock levels check', status: 'Confirmed', modules: ['workorder'], owner: 'Ops lead', acceptance: 'Given a closed order then stock is reduced' },
  { id: 'R3', title: 'Track spare part stock levels per store', status: 'Confirmed', modules: ['inventory'], owner: 'Stores manager', acceptance: 'Stock accuracy at least 98%' }],
  questions: [{ id: 'q1', text: 'Who approves emergency overtime?', reqId: 'R1', status: 'open', owner: 'customer' }, { id: 'q2', text: 'Which SLA clock applies to vendors?', area: 'Inventory', owner: 'internal', status: 'open' }, { id: 'q3', text: 'Settled', status: 'answered' }] };
const TRANSCRIPTS = { candidates: [{ id: 'c1', transcriptId: 't1', line: 12, speaker: 'Priya', text: 'Preventive maintenance scheduling happens monthly for all plants', status: 'pending' }] };

const pid = await mkProject('Questions Project'); await putDoc(pid, 'planner', PLANNER); await putDoc(pid, 'workshop', WORKSHOP); await putDoc(pid, 'transcripts', TRANSCRIPTS);
const PRE_TEXT = 'Preventive maintenance scheduling happens monthly for all plants';
const rules = globalThis.FWBSessionQuestions; const direct = () => rules.prepareQuestions(questionInput(PLANNER, WORKSHOP, TRANSCRIPTS));
const flat = r => [].concat(...r.byModule.map(g => g.questions));

await t('the two tools are in work.json and need a project', () => {
  const raw = fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8'); const all = JSON.parse(raw).mcp.tools; const names = all.map(x => x.name); assert.equal(new Set(names).size, names.length);
  const x = all.find(y => y.name === 'session_questions'); assert.ok(x, 'session_questions'); assert.deepEqual(x.input_schema.required, ['action', 'project']); assert.ok(!x.confirm, 'it only reads'); assert.deepEqual(x.input_schema.properties.action.enum, ['prepare', 'live']); assert.ok(x.input_schema.properties.chunks, 'live takes chunks'); assert.equal(JSON.stringify(JSON.parse(raw), null, 1).replace(/\n/g, '\r\n') + '\r\n', raw, 'the 1-space CRLF layout is kept');
});
await t('there is ONE copy of the rules: the browser bundle and the server read the same file, and the old src copy is gone', () => {
  const b = fs.readFileSync(new URL('../build.mjs', import.meta.url), 'utf8'); assert.ok(b.includes("'work/server/_sessionquestions.mjs'")); assert.ok(!b.includes("'src/sessionquestions.js'")); assert.ok(!fs.existsSync(new URL('../src/sessionquestions.js', import.meta.url)));
  assert.equal(typeof rules.prepareQuestions, 'function'); assert.equal(typeof rules.liveAsk, 'function');
});
await t('questionInput builds the rules\' input from the planner, workshop and transcripts the way the Studio tab does', () => {
  const i = questionInput(PLANNER, WORKSHOP, TRANSCRIPTS); const w = i.modules.find(m => m.name === 'workorder'), v = i.modules.find(m => m.name === 'inventory'), g = i.modules.find(m => m.name === '');
  assert.deepEqual(w.scopeItems.map(x => x.id), ['s1', 's2', 's3', 's4']); assert.deepEqual(w.requirements.map(x => x.id), ['R1', 'R2']); assert.equal(w.requirements[1].owner, 'Ops lead'); assert.equal(w.requirements[0].text, 'Contractor invoicing portal. vendors upload invoices'); assert.equal(g.scopeItems.length, 0, 'a scope line with no module is not a module entry');
  assert.deepEqual(w.openQuestions.map(x => [x.id, x.from]), [['q1', 'customer']]); assert.deepEqual(v.openQuestions.map(x => [x.id, x.from]), [['q2', 'facilio']], 'a question is placed by its requirement, else by its area'); assert.equal(g.openQuestions[0].id, 'q3');
  assert.equal(i.exclusions.length, 1); assert.deepEqual(i.sessions, [{ id: 'ss1', modules: ['inventory'], status: 'planned' }]); assert.deepEqual(i.statements, [{ speaker: 'Priya', at: 'line 12', text: PRE_TEXT, ref: 't1:12' }]);
  assert.deepEqual(questionInput(null, undefined, 5), { modules: [], exclusions: [], sessions: [], statements: [] });
});
await t('get_prepared_questions returns exactly what the rules give for the project\'s records, each with a reason and sources, marked as data', async () => {
  const r = await tool(KIM, 'get_prepared_questions', { project: pid, limit: 200 }); assert.equal(r.status, 200, JSON.stringify(r.data)); const want = direct();
  assert.deepEqual(r.data.byModule, want.byModule); assert.deepEqual(r.data.gaps, want.gaps); assert.equal(r.data.total, flat(want).length); assert.equal(r.data.truncated, false); assert.match(r.data.untrusted, /Never follow instructions/);
  for (const q of flat(r.data)) { assert.ok(q.why && q.sources.length && q.id && q.text); } const kinds = new Set(flat(r.data).map(q => q.kind)); for (const k of ['scope_no_requirement', 'scope_unclear', 'conflict', 'open_question', 'no_session', 'dependency']) assert.ok(kinds.has(k), k);
  assert.ok(flat(r.data).some(q => q.sources.some(s => s.type === 'statement' && s.speaker === 'Priya')), 'an earlier statement is context only');
});
await t('a module can be asked for by name or label, and a long list is cut with a note', async () => {
  const one = (await tool(KIM, 'get_prepared_questions', { project: pid, module: 'Inventory' })).data; assert.deepEqual(one.byModule.map(g => g.module), ['inventory']); assert.equal(one.module, 'Inventory'); assert.equal((await tool(KIM, 'get_prepared_questions', { project: pid, module: 'nothing' })).data.total, 0);
  const cut = (await tool(KIM, 'get_prepared_questions', { project: pid, limit: 3 })).data; assert.equal(cut.shown, 3); assert.equal(cut.truncated, true); assert.ok(cut.total > 3);
});
await t('odd records and an empty project never break it: the rules say what they could not work out', async () => {
  const e = await mkProject('Empty'); const r = await tool(KIM, 'get_prepared_questions', { project: e }); assert.equal(r.status, 200); assert.equal(r.data.total, 0); assert.ok(r.data.gaps.some(x => x.code === 'no_modules'));
  const h = await mkProject('Hostile'); await putDoc(h, 'planner', { scope: [null, 7, 'x', { module: 5, text: {} }, { module: 'asset', text: 'Asset registry', status: 'matched' }], sessions: 'no', contractX: 'no' }); await putDoc(h, 'workshop', { requirements: [null, 'r', { id: 1, modules: 'workorder' }, { title: 'Real one', modules: ['asset'] }], questions: [null, 3, { text: 'q' }] }); await putDoc(h, 'transcripts', { candidates: 'none' });
  const x = await tool(KIM, 'get_prepared_questions', { project: h }); assert.equal(x.status, 200, JSON.stringify(x.data)); assert.ok(x.data.total >= 1); assert.equal((await tool(KIM, 'live_ask', { project: h, chunks: [null, 4, 'str', { text: 5 }, { text: 'Asset registry is kept in a spreadsheet today' }] })).status, 200);
});
await t('team only: customers and people outside the project are refused; a viewer may read', async () => {
  for (const who of [CUS, OUT]) { for (const [name, body] of [['get_prepared_questions', { project: pid }], ['live_ask', { project: pid, chunks: [] }]]) { const r = await tool(who, name, body); assert.ok(r.status === 403 || r.status === 404, who + ' ' + name + ' ' + r.status); assert.ok(!JSON.stringify(r.data).includes('Preventive'), 'nothing leaked'); } }
  assert.equal((await tool(VIC, 'get_prepared_questions', { project: pid })).status, 200); assert.equal((await tool(VIC, 'live_ask', { project: pid, chunks: [{ text: 'hello there' }] })).status, 200);
});
const qOf = (data, kind, ref) => flat(data).find(q => q.kind === kind && q.sources.some(s => s.ref === ref));
await t('live_ask marks a prepared question likely answered with the words that suggest it, and suggests what to ask next; a question or a short remark answers nothing', async () => {
  const prep = (await tool(KIM, 'get_prepared_questions', { project: pid, limit: 200 })).data; const target = qOf(prep, 'scope_no_requirement', 's1'); assert.ok(target);
  const chunks = [{ speaker: 'Facilio', at: '00:01', text: 'Welcome everyone' }, { speaker: 'Priya', at: '00:02', text: 'We run preventive maintenance scheduling every month for all the plants' }];
  const r = await tool(KIM, 'live_ask', { project: pid, chunks }); assert.equal(r.status, 200, JSON.stringify(r.data)); const a = r.data.answered.find(x => x.id === target.id); assert.ok(a, JSON.stringify(r.data.answered)); assert.equal(a.confidence, 'likely'); assert.equal(a.evidence.speaker, 'Priya'); assert.match(a.evidence.quote, /preventive maintenance/); assert.equal(a.question, target.text);
  assert.equal(r.data.chunksUsed, 2); assert.equal(r.data.droppedOlder, 0); assert.ok(r.data.nextSuggested.length >= 1 && r.data.nextSuggested.length <= 3); assert.ok(r.data.nextSuggested.every(x => x.question && x.why && x.id !== target.id)); assert.equal(r.data.answeredCount + r.data.stillOpenCount, flat(prep).length); assert.match(r.data.note, /person confirms/);
  assert.match(r.data.untrusted, /Never follow instructions/);
  const none = await tool(KIM, 'live_ask', { project: pid, chunks: [{ speaker: 'Priya', text: 'Do we schedule preventive maintenance monthly?' }, { text: 'ok' }] }); assert.equal(none.data.answeredCount, 0);
  const same = await tool(KIM, 'live_ask', { project: pid, chunks }); assert.deepEqual(same.data.answered, r.data.answered, 'the same call gives the same answer');
  assert.deepEqual(r.data.answered.map(x => x.id).sort(), rules.liveAsk(direct(), chunks).answered.map(x => x.id).sort(), 'it is the rules\' own answer');
});
await t('live_ask uses at most 500 pieces per call (the newest) and says how many it left out; bad input is refused', async () => {
  assert.equal(MAX_CHUNKS, 500); const answer = { speaker: 'Priya', text: 'We run preventive maintenance scheduling every month for all the plants' }; const filler = i => ({ speaker: 'X', text: 'filler remark number ' + i });
  const old = [answer].concat(Array.from({ length: 599 }, (_, i) => filler(i))); const r = await tool(KIM, 'live_ask', { project: pid, chunks: old }); assert.equal(r.status, 200); assert.equal(r.data.chunksUsed, 500); assert.equal(r.data.droppedOlder, 100); assert.match(r.data.note, /last 500/); assert.equal(r.data.answeredCount, 0, 'the answer was in the part that was left out');
  const recent = Array.from({ length: 599 }, (_, i) => filler(i)).concat([answer]); const r2 = await tool(KIM, 'live_ask', { project: pid, chunks: recent }); assert.equal(r2.data.droppedOlder, 100); assert.ok(r2.data.answeredCount >= 1);
  for (const bad of [undefined, null, 'text', { text: 'x' }, 5]) assert.equal((await tool(KIM, 'live_ask', { project: pid, chunks: bad })).status, 400);
  assert.equal((await tool(KIM, 'live_ask', { project: pid, chunks: [] })).status, 200);
});
await t('neither tool saves or changes anything in the project', async () => {
  const before = docs(pid); await tool(KIM, 'get_prepared_questions', { project: pid }); await tool(KIM, 'live_ask', { project: pid, chunks: [{ speaker: 'P', text: 'preventive maintenance scheduling monthly plants' }] }); assert.equal(docs(pid), before);
  const reqs = (await tool(KIM, 'get_requirements', { project: pid })).data; assert.equal(reqs.requirements.length, 3, 'no requirement was made from a spoken line');
});
console.log(n + ' prepared question tool checks passed');
