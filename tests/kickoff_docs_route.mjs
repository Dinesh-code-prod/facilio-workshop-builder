import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { holdingId } from '../work/server/_msaextract.mjs';

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
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com';
const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Route Intake', customer: 'Internal' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
// Kick-off documents on the server (work/server/api.mjs PUT/GET docs): approval is the owner's, an approved pack cannot be changed by an editor,
// open change requests block approval, and customers can neither read nor write the drafts. Stand-in platform as in tests/msa_project_route.mjs.
const put = (who, sec, data) => as(who, 'PUT', `/api/projects/${pid}/docs/${sec}`, { data });
const put2 = (who, p, sec, data) => as(who, 'PUT', `/api/projects/${p}/docs/${sec}`, { data });
const REV = { scope: { by: 'a@x.com', at: 'n' }, dates: { by: 'a@x.com', at: 'n' }, gaps: { by: 'a@x.com', at: 'n' }, deck: { by: 'a@x.com', at: 'n' }, sessions: { by: 'a@x.com', at: 'n' } };
const pack = status => ({ status, plan: { milestones: [] }, deck: {}, review: REV });
await t('an editor can save a draft but not approve, discard or forge an approver', async () => {
  assert.equal((await put(SAM, 'kickoff_pack', pack('draft'))).status, 200);
  assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { builtAt: 'x' }))).status, 200);
  assert.equal((await put(KIM, 'kickoff_pack', pack('approved'))).status, 403); assert.equal((await put(KIM, 'kickoff_pack', pack('discarded'))).status, 403);
  assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { approvedBy: 'sam' }))).status, 403);
});
await t('open change requests block the owner\'s approval; closed ones do not', async () => {
  assert.equal((await put(SAM, 'kickoff_cr', { items: [{ id: 'cr_1', text: 'x', status: 'open' }] })).status, 200);
  assert.equal((await put(SAM, 'kickoff_pack', pack('approved'))).status, 409);
  assert.equal((await put(SAM, 'kickoff_cr', { items: [{ id: 'cr_1', text: 'x', status: 'dismissed' }] })).status, 200);
  assert.equal((await put(SAM, 'kickoff_pack', pack('approved'))).status, 200);
});
await t('an approved pack cannot be changed or reopened by an editor, and the owner can reopen it', async () => {
  assert.equal((await put(KIM, 'kickoff_pack', pack('approved'))).status, 403); assert.equal((await put(KIM, 'kickoff_pack', Object.assign(pack('draft'), { x: 1 }))).status, 403);
  assert.equal((await put(SAM, 'kickoff_pack', pack('draft'))).status, 200);
});
await t('customers can neither read nor write the kick-off drafts, and the bundle leaves them out', async () => {
  for (const sec of ['kickoff_pack', 'kickoff_cr']) { assert.equal((await as(CUS, 'GET', `/api/projects/${pid}/docs/${sec}`)).status, 403); assert.equal((await put(CUS, sec, {})).status, 403); }
  const b = await as(CUS, 'GET', `/api/projects/${pid}/open?sections=kickoff_pack,kickoff_cr&kinds=`); const d = JSON.stringify(b.data || {}); assert.ok(!d.includes('"status":"draft"') || !d.includes('kickoff_pack'), 'the draft pack is not in the bundle');
  assert.equal((await as(KIM, 'GET', `/api/projects/${pid}/docs/kickoff_pack`)).status, 200);
});
await t('the MSA text kept at upload is team only and Claude reads it page by page', async () => {
  assert.equal((await put(KIM, 'msa_text', { name: 'a.pdf', at: 'x', pages: [{ n: 1, text: 'First page' }, { n: 2, text: 'Second page' }] })).status, 200);
  assert.equal((await put(KIM, 'msa_text', { name: 'a.pdf', at: 'y', pages: [{ n: 1, text: 'First page v2' }] })).status, 200, 'a second upload replaces it');
  assert.equal((await as(CUS, 'GET', `/api/projects/${pid}/docs/msa_text`)).status, 403); assert.equal((await put(CUS, 'msa_text', {})).status, 403);
  const list = (await tool(SAM, 'get_document', { project: pid, section: 'msa_text' })).data; assert.equal(list.pages, 1); assert.deepEqual(list.parts, ['p1']);
  assert.equal((await tool(SAM, 'get_document', { project: pid, section: 'msa_text', part: 'p1' })).data.text, 'First page v2');
  assert.equal((await tool(SAM, 'get_document', { project: pid, section: 'msa_text', part: 'p9' })).status, 404);
});
await t('an extraction saved for an existing project drafts its kick-off at once, and never replaces an approved one', async () => {
  const pid2 = (await as(SAM, 'POST', '/api/projects', { name: 'Auto Kick', customer: 'Auto Co' })).data.project.id;
  const EXT = { customer: 'Auto Co', projectName: 'Auto Kick', contract: { start: '2026-12-01', end: '2027-02-28', durationDays: 90, term: '24 months', origin: 'contract' }, scope: [{ text: 'Work order management', status: 'confirmed', origin: 'contract', source: { page: 4 } }] };
  const r = (await tool(SAM, 'msa_extraction_save', { project: pid2, source: { system: 'studio', ref: 'uploaded.pdf', label: 'uploaded.pdf' }, extraction: EXT })).data;
  assert.equal(r.kickoffDrafted, true, JSON.stringify(r).slice(0, 300)); const pk = await as(SAM, 'GET', `/api/projects/${pid2}/docs/kickoff_pack`); assert.equal(pk.data.data.status, 'draft'); assert.ok(pk.data.data.plan.milestones.length > 3);
  assert.equal((await put2(SAM, pid2, 'kickoff_pack', Object.assign({}, pk.data.data, { status: 'approved', review: REV }))).status, 200);
  const again = (await tool(SAM, 'msa_extraction_save', { project: pid2, source: { system: 'studio', ref: 'uploaded2.pdf' }, extraction: EXT })).data; assert.equal(again.kickoffDrafted, false); assert.match(again.draftNote, /already approved/);
  assert.equal((await as(SAM, 'GET', `/api/projects/${pid2}/docs/kickoff_pack`)).data.data.status, 'approved');
});
await t('the owner cannot approve a kick-off nobody has reviewed: every section must be ticked off with a name', async () => {
  assert.equal((await put(SAM, 'kickoff_pack', Object.assign(pack('draft'), { review: {} }))).status, 200);
  assert.equal((await put(SAM, 'kickoff_pack', Object.assign(pack('approved'), { review: {} }))).status, 409);
  assert.equal((await put(SAM, 'kickoff_pack', Object.assign(pack('approved'), { review: Object.assign({}, REV, { sessions: undefined }) }))).status, 409);
  assert.equal((await put(SAM, 'kickoff_pack', Object.assign(pack('draft'), { review: REV }))).status, 200); assert.equal((await put(SAM, 'kickoff_pack', pack('approved'))).status, 200);
});
await t('Claude saves transcripts and findings through session_questions; they are team only, readable page by page, and decided findings survive a second save', async () => {
  const sq = (who, body) => tool(who, 'session_questions', Object.assign({ project: pid }, body));
  const r1 = (await sq(KIM, { action: 'save_transcript', title: 'Session 1', date: '2026-10-26', source: 'clari', ref: 'clari:1', text: 'Asha: welcome everybody to the first requirement session. Ravi: we need Arabic labels on the portal.' })).data; assert.equal(r1.transcriptId, 'tr_1');
  assert.equal((await sq(KIM, { action: 'save_transcript', title: 'Session 1', source: 'clari', ref: 'clari:1', text: 'Asha: welcome back everybody to the first session.' })).data.replaced, true, 'the same ref replaces');
  const f1 = (await sq(KIM, { action: 'save_findings', transcriptId: 'tr_1', findings: [{ kind: 'ask', text: 'Arabic labels on the portal', quote: 'we need Arabic labels', speaker: 'Ravi', at: '00:01:10' }, { kind: 'bogus', text: 'x' }, { kind: 'promise', text: 'Weekly status call' }] })).data; assert.equal(f1.added, 2);
  assert.equal((await sq(KIM, { action: 'save_findings', transcriptId: 'tr_9', findings: [] })).status, 404); assert.equal((await sq(KIM, { action: 'save_findings', transcriptId: 'tr_1' })).status, 400);
  const doc = (await as(KIM, 'GET', `/api/projects/${pid}/docs/rs_findings`)).data; const items = doc.data.items; assert.equal(items.length, 2); assert.ok(items.every(x => x.status === 'open'));
  const decided = items.map(x => (x.kind === 'promise' ? Object.assign({}, x, { status: 'confirmed', by: 'kim.r@facilio.com' }) : x)); assert.equal((await as(KIM, 'PUT', `/api/projects/${pid}/docs/rs_findings`, { data: { items: decided }, baseVersion: doc.version })).status, 200);
  const f2 = (await sq(KIM, { action: 'save_findings', transcriptId: 'tr_1', findings: [{ kind: 'usecase', text: 'Check-in flow' }, { kind: 'promise', text: 'Weekly status call' }] })).data; assert.equal(f2.added, 1); assert.equal(f2.keptDecided, 1);
  const after = (await as(KIM, 'GET', `/api/projects/${pid}/docs/rs_findings`)).data.data.items.map(x => x.kind + ':' + x.status).sort(); assert.deepEqual(after, ['promise:confirmed', 'usecase:open']);
  for (const sec of ['rs_transcripts', 'rs_findings']) { assert.equal((await as(CUS, 'GET', `/api/projects/${pid}/docs/${sec}`)).status, 403); assert.equal((await put(CUS, sec, {})).status, 403); }
  assert.ok([403, 404].includes((await sq(CUS, { action: 'save_transcript', text: 'Asha: a customer must not be able to save this.' })).status), 'a customer cannot save a transcript');
  const list = (await tool(SAM, 'get_document', { project: pid, section: 'rs_transcripts' })).data; assert.equal(list.transcripts, 1); assert.equal(list.parts[0].part, 't1');
  const page = (await tool(SAM, 'get_document', { project: pid, section: 'rs_transcripts', part: 't1' })).data; assert.ok(page.text.includes('welcome back everybody')); assert.equal(page.pages, 1); assert.equal((await tool(SAM, 'get_document', { project: pid, section: 'rs_transcripts', part: 't7' })).status, 404);
});
console.log(`${n} kick-off document checks passed`);
