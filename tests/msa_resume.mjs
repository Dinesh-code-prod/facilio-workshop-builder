// create_project_from_msa after the review of 5 Nov 2026 (findings A and H): a claim before the project is made, a failure after it reports the project id and a retry RESUMES the fill,
// a deleted project is not reported as "already created", the project is shown only to a person who can open it, and the extraction rules do not invent a type or a term.
// Same stand-in platform as tests/msa_project_route.mjs, with a switch that makes one database write fail.
// NOT checked here: a real Claude session, a real Microsoft 365 connector call, a real MSA, the live app.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { holdingId, validateExtraction, planFromExtraction } from '../work/server/_msaextract.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/; let failPut = null;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get() { throw new Error('no secret'); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); if (failPut && failPut(c, k, v)) { failPut = null; throw new Error('injected database failure'); } const s = JSON.stringify(v); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const tool = (email, name, body) => as(email, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com';
const hid = e => holdingId(globalThis.__fwb.ekey(e));
const EXT = name => ({ customer: 'Resume Co', projectName: name, contract: { start: '2026-12-01', end: '2027-02-28', durationDays: 90, term: '24 months', origin: 'contract' }, scope: [{ text: 'Work order management', status: 'confirmed', origin: 'contract', source: { page: 4 } }],
  facilioResponsibilities: [{ text: 'Run workshops', origin: 'contract' }] });
let ref = 0;
const approved = async (who, name, project) => { const sv = await tool(who, 'msa_extraction_save', { project, source: { system: 'sharepoint', ref: 'sites/x/' + (++ref) + '.pdf' }, extraction: EXT(name) }); assert.equal(sv.status, 200, JSON.stringify(sv.data));
  const sp = project || hid(who); assert.equal((await as(SAM, 'POST', `/api/projects/${sp}/transfers/${sv.data.transfer.id}/transition`, { to: 'Approved', ver: 1 })).status, 200); return { id: sv.data.transfer.id, space: project ? project : 'holding' }; };
const create = (who, x) => tool(who, 'create_project_from_msa', { project: x.space, id: x.id, confirm: true });
const rows = name => [...store.get('projects').values()].map(x => JSON.parse(x)).filter(p => p.name === name);
const planner = pid => as(SAM, 'GET', `/api/projects/${pid}/docs/planner`);

await t('a failure while writing the project makes the answer carry the project id, and a retry RESUMES the fill: one project, nothing lost', async () => {
  const x = await approved(SAM, 'Resume A'); failPut = (c, k) => /^doc\.p_/.test(c) && k === 'planner';
  const bad = await create(SAM, x); assert.equal(bad.status, 502); assert.match(bad.data.error, /was created \(id p_/); assert.match(bad.data.projectId, /^p_/); assert.equal(bad.data.resume, true); assert.equal(rows('Resume A').length, 1);
  assert.equal((await planner(bad.data.projectId)).data.data, null, 'the planner is not written yet');
  const rec = JSON.parse(store.get('xf.' + hid(SAM)).get(x.id)); assert.equal(rec.projectId, bad.data.projectId); assert.equal(rec.projectComplete, false);
  const ok = await create(SAM, x); assert.equal(ok.status, 200, JSON.stringify(ok.data)); assert.equal(ok.data.complete, true); assert.equal(ok.data.resumed, true); assert.equal(ok.data.project.id, bad.data.projectId); assert.equal(rows('Resume A').length, 1);
  assert.equal((await planner(bad.data.projectId)).data.data.scope.length, 1); assert.equal(JSON.parse(store.get('xf.' + hid(SAM)).get(x.id)).projectComplete, true);
  const again = await create(SAM, x); assert.equal(again.data.created, false); assert.equal(again.data.complete, true); assert.equal(again.data.project.id, bad.data.projectId);
});
await t('a failure of the later steps (the contract record) is resumed too, and the planner is written once more over itself without a conflict', async () => {
  const x = await approved(SAM, 'Resume B'); failPut = (c, k) => /^it\.p_.*\.ctrcore$/.test(c);
  const bad = await create(SAM, x); assert.equal(bad.status, 502); assert.equal(bad.data.step, 'ctrcore'); const pid = bad.data.projectId; assert.equal((await planner(pid)).data.data.scope.length, 1);
  const ok = await create(SAM, x); assert.equal(ok.status, 200, JSON.stringify(ok.data)); assert.equal(ok.data.project.id, pid); assert.equal(rows('Resume B').length, 1);
  assert.equal((await tool(SAM, 'get_records', { project: pid, kind: 'ctrcore' })).data.records[0].data.termMonths, 24);
});
await t('the link failing right after the project was made loses nothing: the answer names the project and the retry finds it again (one project)', async () => {
  const x = await approved(SAM, 'Resume C'); failPut = (c, k, v) => c === 'xf.' + hid(SAM) && k === x.id && v.projectId;
  const bad = await create(SAM, x); assert.equal(bad.status, 500); assert.match(bad.data.projectId, /^p_/); assert.equal(rows('Resume C').length, 1);
  const ok = await create(SAM, x); assert.equal(ok.status, 200, JSON.stringify(ok.data)); assert.equal(ok.data.project.id, bad.data.projectId); assert.equal(ok.data.complete, true); assert.equal(rows('Resume C').length, 1);
});
await t('a claim is written before the project is made; a fresh claim with no project found refuses a second creation, a stale one is replaced', async () => {
  const x = await approved(SAM, 'Resume D'); const key = 'xf.' + hid(SAM); const rec = JSON.parse(store.get(key).get(x.id)); rec.projectClaim = { at: new Date().toISOString(), by: 'someone', state: 'creating' }; store.get(key).set(x.id, JSON.stringify(rec));
  const r = await create(SAM, x); assert.equal(r.status, 409); assert.match(r.data.error, /being created/); assert.equal(rows('Resume D').length, 0);
  rec.projectClaim.at = new Date(Date.now() - 600000).toISOString(); store.get(key).set(x.id, JSON.stringify(rec)); const ok = await create(SAM, x); assert.equal(ok.status, 200); assert.equal(ok.data.created, true); assert.equal(rows('Resume D').length, 1);
  assert.equal(JSON.parse(store.get(key).get(x.id)).projectClaim, null, 'the claim is cleared once the project is recorded');
});
await t('three simultaneous first calls make one project', async () => {
  const x = await approved(SAM, 'Resume E'); const rs = await Promise.all([create(SAM, x), create(SAM, x), create(SAM, x)]); assert.deepEqual(rs.map(r => r.status), [200, 200, 200]); assert.equal(rs.filter(r => r.data.created).length, 1); assert.equal(rows('Resume E').length, 1);
});
await t('the project made from a transfer was deleted: it is not reported as "already created"; the next call makes a new one and records it', async () => {
  const x = await approved(SAM, 'Resume F'); const first = await create(SAM, x); assert.equal(first.data.created, true); store.get('projects').delete(first.data.project.id);
  const r = await create(SAM, x); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.created, true); assert.notEqual(r.data.project.id, first.data.project.id); assert.equal(rows('Resume F').length, 1);
  assert.equal(JSON.parse(store.get('xf.' + hid(SAM)).get(x.id)).projectId, r.data.project.id); assert.match(JSON.parse(store.get('xf.' + hid(SAM)).get(x.id)).log.map(l => l.note).join('|'), /no longer exists/);
});
await t('the project is shown only to a person who can open it', async () => {
  const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Intake space', customer: 'Internal' })).data.project.id; assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: KIM, role: 'editor' })).status, 201);
  const x = await approved(SAM, 'Resume G', pid); const c = await create(KIM, x); assert.equal(c.data.created, true); assert.equal(c.data.project.id.slice(0, 2), 'p_');
  const sam = await create(SAM, x); assert.equal(sam.status, 200); assert.equal(sam.data.created, false); assert.equal(sam.data.project, null); assert.ok(!JSON.stringify(sam.data).includes(c.data.project.id), 'no id anywhere in the answer'); assert.match(sam.data.note, /no access/);
  const kim = await create(KIM, x); assert.equal(kim.data.project.id, c.data.project.id);
});
await t('the extraction rules: no hard-coded type, a term is read only when the whole text is one number and one unit, dates that are not contract text are uncertain and not applied', () => {
  const plan = (c, extra) => { const v = validateExtraction(Object.assign({ customer: 'A', projectName: 'B', contract: c }, extra)); assert.equal(v.ok, true); return { v, p: planFromExtraction(v.extraction, {}) }; };
  const months = c => { const f = plan(Object.assign({ origin: 'contract' }, c)).p.planner.contractX.fields.termMonths; return f && f.value; };
  assert.equal(months({ term: '24 months' }), 24); assert.equal(months({ term: '2 years' }), 24); assert.equal(months({ term: '24-month' }), 24); assert.equal(months({ term: '2 years 6 months' }), undefined); assert.equal(months({ term: 'initial term of 3 years, renewing' }), undefined); assert.equal(months({ term: 'terminate on 30 days notice' }), undefined);
  const a = plan({ start: '2026-12-01', end: '2027-02-28', term: '12 months', origin: 'contract' }); assert.equal(a.p.project.type, undefined); assert.equal(a.p.project.startDate, '2026-12-01'); assert.equal(a.p.ctrcore.termMonths, 12); assert.equal(a.p.planner.contractX.fields.effective.uncertain, false);
  for (const origin of ['interpreted', 'assumed', 'nonsense', undefined]) { const b = plan({ start: '2026-12-01', end: '2027-02-28', term: '12 months', origin }); const f = b.p.planner.contractX.fields;
    assert.equal(f.effective.uncertain, true); assert.equal(f.termMonths.uncertain, true); assert.equal(f.effective.applied, undefined); assert.equal(f.termMonths.applied, undefined); assert.equal(b.p.ctrcore, null); assert.equal(b.p.project.startDate, undefined); assert.equal(b.p.project.endDate, undefined);
    assert.equal(b.v.extraction.contract.origin, origin === 'interpreted' ? 'interpreted' : 'assumed'); assert.equal(f.effective.value, '2026-12-01', 'the date is kept so a person can review it'); }
  assert.ok(plan({ start: '2026-12-01' }).v.warnings.some(w => /contract: .*no valid origin/.test(w)));
  assert.equal(validateExtraction({ customer: 'A', projectName: 'B' }).extraction.contract.origin, '', 'no contract values, no origin');
});
console.log(n + ' MSA resume checks passed');
