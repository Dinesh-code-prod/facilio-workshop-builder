// MSA extraction (roadmap E2 workspace 1, E11 step 2): the pure rules of work/server/_msaextract.mjs, then the connector tools msa_extraction_save and create_project_from_msa,
// called the way Claude calls them (POST /api/ with the x-work-mcp-tool header) on the stand-in platform of tests/transfer_routes.mjs.
// NOT checked here: a real Claude session, a real Microsoft 365 connector call, a real MSA, and the approval page (the approval below uses the transfer route a page would call).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../work/server/api.mjs';
import { validateExtraction, planFromExtraction, holdingId, LIMITS } from '../work/server/_msaextract.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

// ---------- pure rules ----------
const GOOD = () => ({
  customer: 'Acme Facilities', projectName: 'Acme CMMS rollout', contract: { start: '2026-12-01', end: '2027-02-28', durationDays: 90, term: '24 months' },
  scope: [{ text: 'Work order management', status: 'confirmed', origin: 'contract', source: { page: 4, section: '2.1', quote: 'Supplier shall provide Work Order management' } },
    { text: 'Mobile app for technicians', status: 'unclear', origin: 'interpreted', source: { page: 5 } }, { text: 'Payroll integration', status: 'excluded', origin: 'contract', source: { section: '9.2' } }, { text: 'Visitor management', status: 'confirmed', origin: 'assumed' }],
  modules: [{ name: 'Work Orders', origin: 'contract', source: { page: 4 } }], commitments: [{ text: 'Go-live within 90 days of kick-off', date: '2027-02-28', origin: 'contract', source: { page: 6, section: '3.4' } }],
  deliverables: [{ text: 'Configured Work Order module', origin: 'contract', source: { page: 7 } }], customerResponsibilities: [{ text: 'Provide asset list within 10 days', origin: 'contract', source: { page: 8 } }],
  facilioResponsibilities: [{ text: 'Run requirement workshops', origin: 'contract', source: { page: 8 } }], exclusions: [{ text: 'Third party licences', origin: 'contract', source: { page: 9 } }],
  dependencies: [{ text: 'Customer SSO ready', origin: 'interpreted' }], commercialConstraints: [{ text: 'Change requests priced per day', origin: 'contract' }], training: [{ text: 'Two admin training sessions', origin: 'contract' }],
  supportAndHandover: [{ text: '30 days hypercare', origin: 'contract' }], attachments: [{ name: 'Schedule A.pdf', ref: 'sites/acme/Schedule A.pdf', note: 'Fee schedule' }] });
const KEYS = ['customer', 'projectName', 'contract', 'scope', 'modules', 'commitments', 'deliverables', 'customerResponsibilities', 'facilioResponsibilities', 'exclusions', 'dependencies', 'commercialConstraints', 'training', 'supportAndHandover', 'attachments'];

await t('a good extraction keeps its labels, its sources and a fixed key order', () => {
  const v = validateExtraction(GOOD()); assert.equal(v.ok, true); assert.deepEqual(Object.keys(v.extraction), KEYS); const x = v.extraction;
  assert.deepEqual(x.scope.map(s => [s.status, s.origin]), [['confirmed', 'contract'], ['unclear', 'interpreted'], ['excluded', 'contract'], ['confirmed', 'assumed']]);
  assert.deepEqual(x.scope[0].source, { page: 4, section: '2.1', quote: 'Supplier shall provide Work Order management' }); assert.deepEqual(x.contract, { start: '2026-12-01', end: '2027-02-28', durationDays: 90, term: '24 months' });
  assert.equal(x.commitments[0].date, '2027-02-28'); assert.equal(JSON.stringify(validateExtraction(JSON.parse(JSON.stringify(x))).extraction), JSON.stringify(x), 'cleaning twice changes nothing, so the same content has the same hash');
});
await t('hostile input: wrong types, unknown keys, huge text and lists, odd values and polluted keys are cleaned and never throw', () => {
  for (const bad of [undefined, null, 5, 'text', [], true]) { const v = validateExtraction(bad); assert.equal(v.ok, false); assert.equal(v.extraction, null); }
  assert.equal(validateExtraction({}).ok, false, 'empty'); assert.equal(validateExtraction({ scope: [], modules: 'x' }).ok, false);
  const hostile = JSON.parse('{"__proto__":{"polluted":1},"constructor":{"x":1},"customer":"  Acme\\u0000\\n Co  ","projectName":' + JSON.stringify('P'.repeat(900)) + ',"evil":"drop me","contract":{"start":"2026-13-45","end":"1850-01-01","durationDays":"abc","term":{"a":1},"extra":1},'
    + '"scope":[null,5,"a bare string",{"text":{}},{"text":"' + 'x'.repeat(5000) + '","status":"CONFIRMED","origin":"Contract","evil":1,"source":{"page":"abc","section":"' + 'z'.repeat(500) + '","quote":["no"],"__proto__":{"p":1}}},{"text":"ok","status":"maybe","origin":"guess"}],'
    + '"modules":[{"name":""},{"name":"Assets","origin":"x"}],"commitments":[{"text":"c","date":"tomorrow"}],"attachments":[{"name":"","ref":""},{"ref":"r"}],"training":"not a list"}');
  const v = validateExtraction(hostile); assert.equal(v.ok, true); const x = v.extraction; assert.deepEqual(Object.keys(x), KEYS); assert.equal(({}).polluted, undefined); assert.equal(Object.prototype.hasOwnProperty.call(x, 'evil'), false);
  assert.equal(x.customer, 'Acme Co'); assert.equal(x.projectName.length, LIMITS.name); assert.deepEqual(x.contract, { start: '', end: '', durationDays: null, term: '' });
  assert.equal(x.scope.length, 3, 'null, 5 and {text:{}} are dropped; the bare string is kept as assumed'); assert.deepEqual(x.scope.map(s => s.origin), ['assumed', 'contract', 'assumed']); assert.equal(x.scope[0].status, 'unclear');
  assert.equal(x.scope[1].text.length, LIMITS.text); assert.equal(x.scope[1].status, 'confirmed'); assert.deepEqual(Object.keys(x.scope[1]).sort(), ['origin', 'source', 'status', 'text']); assert.equal(x.scope[1].source.page, undefined); assert.equal(x.scope[1].source.section.length, 60); assert.equal(x.scope[1].source.quote, undefined);
  assert.equal(x.scope[2].status, 'unclear'); assert.equal(x.scope[2].origin, 'assumed'); assert.deepEqual(x.modules, [{ name: 'Assets', origin: 'assumed', source: {} }]); assert.equal(x.commitments[0].date, ''); assert.deepEqual(x.attachments, [{ name: 'r', ref: 'r', note: '' }]); assert.deepEqual(x.training, []);
  assert.ok(v.warnings.some(w => /no valid origin/.test(w))); assert.ok(v.warnings.some(w => /not a real date/.test(w)));
  const many = validateExtraction({ customer: 'A', scope: Array.from({ length: 5000 }, (_, i) => ({ text: 'item ' + i, status: 'confirmed', origin: 'contract' })) }); assert.equal(many.extraction.scope.length, LIMITS.scope); assert.ok(many.warnings.some(w => /beyond the limit/.test(w)));
  const big = validateExtraction({ customer: 'A', deliverables: Array.from({ length: 200 }, (_, i) => ({ text: String(i) + 'y'.repeat(590), origin: 'contract' })), exclusions: Array.from({ length: 200 }, (_, i) => ({ text: String(i) + 'y'.repeat(590), origin: 'contract' })), training: Array.from({ length: 200 }, (_, i) => ({ text: String(i) + 'y'.repeat(590), origin: 'contract' })), dependencies: Array.from({ length: 200 }, (_, i) => ({ text: String(i) + 'y'.repeat(590), origin: 'contract' })) }); assert.equal(big.ok, false); assert.match(big.errors[0], /too large/);
  const cyc = { customer: 'Cyc' }; cyc.self = cyc; cyc.scope = [cyc]; assert.doesNotThrow(() => validateExtraction(cyc));
});
await t('end before start is left out, duplicates collapse, a contract item with no source is flagged', () => {
  const v = validateExtraction({ customer: 'A', contract: { start: '2026-05-01', end: '2026-04-01' }, scope: [{ text: 'Same', status: 'confirmed', origin: 'contract' }, { text: 'same', status: 'confirmed', origin: 'contract' }, { text: 'Same', status: 'excluded', origin: 'contract' }] });
  assert.equal(v.extraction.contract.end, ''); assert.equal(v.extraction.scope.length, 2); assert.ok(v.warnings.some(w => /before the start/.test(w))); assert.ok(v.warnings.some(w => /no page, section or quote/.test(w)));
  assert.ok(validateExtraction({ scope: [{ text: 'x', status: 'confirmed', origin: 'contract', source: { page: 1 } }] }).warnings.some(w => /No customer name/.test(w)), 'no customer is a warning here, a refusal when the project is created');
});
await t('holdingId is the same for one person, different for two, and safe in a collection name', () => {
  assert.equal(holdingId('sam.k:facilio.com'), holdingId('sam.k:facilio.com')); assert.notEqual(holdingId('sam.k:facilio.com'), holdingId('kim.r:facilio.com')); assert.match(holdingId('x'), /^h_[0-9a-f]{24}$/);
});
await t('planFromExtraction only uses what was given, labels what is not contract text, and keeps the records within their size limits', () => {
  const x = validateExtraction(GOOD()).extraction; const p = planFromExtraction(x, { now: '2026-11-05T00:00:00.000Z', source: { system: 'sharepoint', ref: 'sites/acme/MSA signed.pdf' }, transferId: 'x-abc', version: 2 });
  assert.deepEqual(p.project, { name: 'Acme CMMS rollout', customer: 'Acme Facilities', description: p.project.description, startDate: '2026-12-01', endDate: '2027-02-28', type: 'cmms' }); assert.match(p.project.description, /x-abc/);
  assert.deepEqual(p.planner.scope.map(s => [s.status, s.origin, s.source]), [['matched', 'contract', 'msa'], ['uncertain', 'interpreted', 'msa'], ['excluded', 'contract', 'msa'], ['uncertain', 'assumed', 'msa']]); assert.equal(p.planner.scope[0].page, 4); assert.equal(p.planner.scope[0].section, '2.1'); assert.match(p.planner.scope[0].ctx, /Work Order/);
  assert.equal(p.planner.msa.name, 'MSA signed.pdf'); assert.equal(p.planner.msa.fileId, undefined, 'no file is claimed'); assert.deepEqual(p.planner.msa.external, { system: 'sharepoint', ref: 'sites/acme/MSA signed.pdf', transferId: 'x-abc', version: 2 });
  const f = p.planner.contractX.fields; assert.deepEqual(Object.keys(f).sort(), ['effective', 'endDate', 'obligations', 'termMonths']); assert.equal(f.effective.value, '2026-12-01'); assert.equal(f.termMonths.value, 24); assert.equal(f.effective.status, 'extracted'); assert.equal(f.obligations.value.length, 2);
  assert.deepEqual(p.ctrcore, { startDate: '2026-12-01', startRule: 'date', termMonths: 24, obligations: [{ side: 'Facilio', text: 'Run requirement workshops', by: '' }, { side: 'Customer', text: 'Provide asset list within 10 days', by: '' }] });
  assert.deepEqual(p.scope.inclusions, ['Work order management (MSA p.4 §2.1)']); assert.ok(p.scope.exclusions.includes('Third party licences (MSA p.9)') && p.scope.exclusions.includes('Payroll integration (MSA §9.2)')); assert.deepEqual(p.scope.assumptions, ['Visitor management (MSA) [assumed]']);
  assert.deepEqual(planFromExtraction(validateExtraction({ customer: 'A', projectName: 'B', scope: [{ text: 'x', status: 'unclear', origin: 'assumed' }] }).extraction, {}).ctrcore, null, 'no dates, no obligations: nothing is written to Know Your Contract');
  const many = validateExtraction({ customer: 'A', projectName: 'B', deliverables: Array.from({ length: 200 }, (_, i) => ({ text: 'd' + i + 'z'.repeat(500), origin: 'contract', source: { page: i + 1, section: '1.1' } })) }).extraction; const q = planFromExtraction(many, {}); assert.ok(q.scope.deliverables.length <= LIMITS.lines); assert.ok(JSON.stringify(q.scope).length < 50000, 'the Scope page record stays under its 60,000 character limit');
});

// ---------- tools on a stand-in platform ----------
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
const pid = (await as(SAM, 'POST', '/api/projects', { name: 'MSA Intake', customer: 'Internal' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const hid = e => holdingId(globalThis.__fwb.ekey(e));
const SRC = (ref) => ({ system: 'sharepoint', ref: ref || 'sites/acme/Shared Documents/MSA signed.pdf', label: 'MSA signed.pdf', etag: '"{ABC},3"' });
const save = (who, body) => tool(who, 'msa_extraction_save', Object.assign({ source: SRC(), extraction: GOOD() }, body));
const mv = (space, who, id, body) => as(who, 'POST', `/api/projects/${space}/transfers/${id}/transition`, body);
const create = (who, body) => tool(who, 'create_project_from_msa', Object.assign({ confirm: true }, body));
const projectRows = () => [...store.get('projects').values()].map(x => JSON.parse(x));

await t('the two tools are in work.json (create asks for confirmation), no duplicates, layout kept', () => {
  const raw = fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8'); const all = JSON.parse(raw).mcp.tools; const names = all.map(x => x.name);
  for (const w of ['msa_extraction_save', 'create_project_from_msa']) assert.ok(names.includes(w), w); assert.equal(new Set(names).size, names.length);
  assert.deepEqual(all.filter(x => /msa/.test(x.name) && x.confirm).map(x => x.name), ['create_project_from_msa']); assert.deepEqual(all.find(x => x.name === 'msa_extraction_save').input_schema.required, ['source', 'extraction']);
  assert.equal(JSON.stringify(JSON.parse(raw), null, 1).replace(/\n/g, '\r\n') + '\r\n', raw, 'the 1-space CRLF layout is kept');
});
let holdId;
await t('msa_extraction_save with no project keeps it in the person\'s own holding space, unapproved, in Awaiting Review, with the file reference as given', async () => {
  const r = await save(SAM); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.space, 'holding'); holdId = r.data.transfer.id; assert.equal(r.data.transfer.status, 'Awaiting Review'); assert.equal(r.data.transfer.ver, 1); assert.deepEqual(r.data.transfer.next.sort(), ['Approved', 'Draft Generated', 'Requires Attention'].sort());
  assert.match(r.data.note, /Claude cannot approve/); const rec = JSON.parse(store.get('xf.' + hid(SAM)).get(holdId)); assert.deepEqual([rec.dir, rec.kind, rec.source.system, rec.source.ref, rec.dest.system, rec.approvedVer, rec.by], ['pull', 'msa', 'sharepoint', 'sites/acme/Shared Documents/MSA signed.pdf', 'studio', null, SAM]);
  assert.equal(rec.versions[0].validation.ok, true); assert.equal(rec.log.at(-1).via, 'claude'); assert.ok(!store.has('xf.' + pid) || store.get('xf.' + pid).size === 0, 'nothing went into a project');
  const l = await tool(SAM, 'transfer_list', { project: 'holding', kind: 'msa' }); assert.equal(l.data.total, 1); const g = await tool(SAM, 'transfer_get', { project: 'holding', id: holdId, ver: 'latest' }); assert.equal(g.data.intact, true); assert.equal(JSON.parse(g.data.content).customer, 'Acme Facilities');
});
await t('nobody else can see or use a holding space, and a project name cannot reach it', async () => {
  assert.equal((await tool(KIM, 'transfer_list', { project: 'holding' })).data.total, 0, 'Kim\'s holding space is empty');
  for (const who of [KIM, VIC, CUS]) { assert.equal((await as(who, 'GET', `/api/projects/${hid(SAM)}/transfers`)).status, 404); assert.equal((await as(who, 'GET', `/api/projects/${hid(SAM)}/transfers/${holdId}`)).status, 404); }
  assert.equal((await create(KIM, { id: holdId })).status, 404, 'Kim cannot create from Sam\'s extraction'); assert.equal((await as(KIM, 'POST', `/api/projects/${hid(SAM)}/transfers/${holdId}/transition`, { to: 'Approved' })).status, 404);
  assert.equal((await tool(KIM, 'get_records', { project: hid(SAM), kind: 'scope' })).status >= 400, true);
});
await t('the same extraction again changes nothing; changed content is version 2 and stays in review', async () => {
  const again = await save(SAM); assert.equal(again.status, 200); assert.equal(again.data.duplicate, true); assert.equal(again.data.transfer.id, holdId); assert.equal(again.data.transfer.ver, 1);
  const x = GOOD(); x.scope.push({ text: 'Asset tagging', status: 'confirmed', origin: 'contract', source: { page: 10 } }); const v2 = await save(SAM, { extraction: x, baseVersion: 1 }); assert.equal(v2.data.transfer.ver, 2); assert.equal(v2.data.transfer.status, 'Awaiting Review'); assert.equal((await save(SAM, { extraction: x, baseVersion: 1 })).status < 500, true);
  assert.equal((await save(SAM, { extraction: Object.assign(GOOD(), { customer: 'Acme Two' }), baseVersion: 1 })).status, 409, 'a stale base version is refused');
});
await t('what is not a valid extraction or source is refused and nothing is stored', async () => {
  const before = store.get('xf.' + hid(SAM)).size;
  for (const body of [{ extraction: 'text' }, { extraction: {} }, { extraction: { scope: 5, modules: 'x' } }, { source: { system: 'email', ref: 'x' } }, { source: { system: 'sharepoint', ref: '' } }, { source: { system: 'sharepoint', ref: 'r'.repeat(501) } }, { source: undefined }]) { const r = await save(SAM, body); assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80)); }
  const bad = await save(SAM, { extraction: {} }); assert.ok(Array.isArray(bad.data.errors) && bad.data.errors.length); assert.equal(store.get('xf.' + hid(SAM)).size, before);
  const sp = await save(SAM, { source: SRC('sites/other/other MSA.docx'), extraction: { customer: '  Other  ', scope: [{ text: 'x', origin: 'bogus' }] } }); assert.equal(sp.status, 200); assert.ok(sp.data.warnings.some(w => /no valid origin/.test(w)));
});
await t('create_project_from_msa: refused without confirm, and refused unless the transfer is Approved (Awaiting Review, Requires Attention, unknown id)', async () => {
  assert.equal((await tool(SAM, 'create_project_from_msa', { id: holdId })).status, 400); assert.equal((await tool(SAM, 'create_project_from_msa', { id: holdId, confirm: 'yes' })).status, 400);
  const r = await create(SAM, { id: holdId }); assert.equal(r.status, 409); assert.match(r.data.error, /approve it in Delivery Studio/); assert.equal(projectRows().filter(p => p.name === 'Acme CMMS rollout').length, 0);
  assert.equal((await create(SAM, { id: 'x-' + 'a'.repeat(32) })).status, 404); assert.equal((await create(SAM, { id: 'nope' })).status, 404);
  const blank = (await tool(SAM, 'transfer_begin', { project: 'holding', dir: 'generate', kind: 'brd', source: { system: 'studio', ref: 'a' }, dest: { system: 'sharepoint', ref: 'b' } })).data.transfer.id; assert.equal((await create(SAM, { id: blank })).status, 400, 'a transfer of another kind is not an MSA extraction');
});
let made;
await t('after a person approves, create_project_from_msa makes a NEW project with the contract fields and scope in the records the Contract flow uses', async () => {
  assert.equal((await mv(hid(SAM), SAM, holdId, { to: 'Approved', ver: 2 })).status, 200);
  const r = await create(SAM, { id: holdId }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.created, true); assert.equal(r.data.complete, true); made = r.data.project.id; assert.match(made, /^p_/); assert.notEqual(made, pid);
  assert.deepEqual(r.data.written, { scopeItems: 5, contractFields: 4, obligations: 2, scopeLines: r.data.written.scopeLines }); assert.ok(r.data.written.scopeLines > 5);
  const p = (await as(SAM, 'GET', '/api/projects/' + made)).data; assert.deepEqual([p.project.name, p.project.customer, p.project.startDate, p.project.endDate, p.project.role], ['Acme CMMS rollout', 'Acme Facilities', '2026-12-01', '2027-02-28', 'owner']); assert.deepEqual(p.members.map(m => [m.email, m.role]), [[SAM, 'owner']]);
  const doc = (await tool(SAM, 'get_document', { project: made, section: 'planner', part: 'scope' })).data; assert.equal(doc.data.length, 5); assert.equal(doc.data[0].text, 'Work order management'); assert.equal(doc.data[0].status, 'matched'); assert.equal(doc.data[0].page, 4); assert.equal(doc.data[1].status, 'uncertain'); assert.equal(doc.data[2].status, 'excluded'); assert.equal(doc.data[3].origin, 'assumed');
  const cx = (await tool(SAM, 'get_document', { project: made, section: 'planner', part: 'contractX' })).data.data; assert.equal(cx.fields.effective.value, '2026-12-01'); assert.equal(cx.fields.termMonths.value, 24); assert.equal(cx.fields.effective.status, 'extracted'); assert.equal(cx.from, 'MSA signed.pdf');
  const kinds = (await tool(SAM, 'list_record_kinds', { project: made })).data.kinds.map(k => k.kind); assert.ok(kinds.includes('ctrcore') && kinds.includes('scope'));
  const core = (await tool(SAM, 'get_records', { project: made, kind: 'ctrcore' })).data.records[0]; assert.deepEqual([core.id, core.data.startDate, core.data.startRule, core.data.termMonths], ['main', '2026-12-01', 'date', 24]);
  const sc = (await tool(SAM, 'get_records', { project: made, kind: 'scope', detail: 'full' })).data.records[0].data; assert.ok(sc.inclusions.some(l => /^Work order management \(MSA p\.4 §2\.1\)$/.test(l))); assert.ok(sc.exclusions.some(l => /Third party licences/.test(l))); assert.ok(sc.assumptions.some(l => /\[assumed\]/.test(l)));
  const planner = (await as(SAM, 'GET', `/api/projects/${made}/docs/planner`)).data.data; assert.equal(planner.msa.external.transferId, holdId); assert.equal(planner.msa.external.version, 2); assert.equal(planner.msa.fileId, undefined);
  const rec = JSON.parse(store.get('xf.' + hid(SAM)).get(holdId)); assert.equal(rec.projectId, made); assert.equal(rec.projectComplete, true); assert.equal(rec.status, 'Approved'); assert.match(rec.log.at(-1).note, new RegExp(made));
  const au = (await as(SAM, 'GET', `/api/projects/${made}/audit`)).data.entries.map(e => e.action); assert.ok(au.includes('project-from-msa')); assert.ok(au.includes('project-created'));
  const hau = [...store.get('au.' + hid(SAM)).values()].map(x => JSON.parse(x).action); assert.ok(hau.includes('transfer-project')); assert.ok(hau.includes('transfer-version'));
});
await t('a second call is safe: it returns the project already made and creates nothing', async () => {
  const before = projectRows().length; for (let i = 0; i < 2; i++) { const r = await create(SAM, { id: holdId }); assert.equal(r.status, 200); assert.equal(r.data.created, false); assert.equal(r.data.project.id, made); assert.equal(r.data.complete, true); }
  const both = await Promise.all([create(SAM, { id: holdId }), create(SAM, { id: holdId })]); assert.deepEqual(both.map(x => x.data.project.id), [made, made]); assert.equal(projectRows().length, before);
  assert.equal((await as(SAM, 'GET', `/api/projects/${made}/docs/planner`)).data.version, 1, 'the new project\'s planner was written once');
});
await t('two simultaneous first calls make one project', async () => {
  const id = (await save(SAM, { source: SRC('sites/acme/second.pdf'), extraction: Object.assign(GOOD(), { projectName: 'Race project' }) })).data.transfer.id; assert.equal((await mv(hid(SAM), SAM, id, { to: 'Approved', ver: 1 })).status, 200);
  const rs = await Promise.all([create(SAM, { id }), create(SAM, { id })]); assert.deepEqual(rs.map(x => x.status), [200, 200]); assert.equal(rs[0].data.project.id, rs[1].data.project.id); assert.equal(rs.filter(x => x.data.created).length, 1); assert.equal(projectRows().filter(p => p.name === 'Race project').length, 1);
});
await t('a project that already exists is never overwritten: a same-named project is left alone and a new one is made', async () => {
  const mine = (await as(SAM, 'POST', '/api/projects', { name: 'Third project', customer: 'Acme Facilities' })).data.project.id; assert.equal((await as(SAM, 'PUT', `/api/projects/${mine}/docs/planner`, { baseVersion: 0, data: { scope: [{ id: 'mine', text: 'My own scope', status: 'matched', source: 'manual' }] } })).status, 200);
  const id = (await save(SAM, { source: SRC('sites/acme/third.pdf'), extraction: Object.assign(GOOD(), { projectName: 'Third project' }) })).data.transfer.id; await mv(hid(SAM), SAM, id, { to: 'Approved', ver: 1 });
  const r = await create(SAM, { id }); assert.equal(r.data.created, true); assert.notEqual(r.data.project.id, mine); assert.equal(projectRows().filter(p => p.name === 'Third project').length, 2);
  const kept = (await as(SAM, 'GET', `/api/projects/${mine}/docs/planner`)).data; assert.equal(kept.version, 1); assert.equal(kept.data.scope[0].text, 'My own scope'); assert.equal((await tool(SAM, 'get_records', { project: mine, kind: 'ctrcore' })).data.total, 0);
});
await t('an approved extraction without a customer or project name is refused until a corrected version is approved', async () => {
  const id = (await save(SAM, { source: SRC('sites/acme/fourth.pdf'), extraction: { scope: [{ text: 'Only scope', status: 'confirmed', origin: 'contract', source: { page: 1 } }] } })).data.transfer.id; await mv(hid(SAM), SAM, id, { to: 'Approved', ver: 1 });
  const before = projectRows().length; let r = await create(SAM, { id }); assert.equal(r.status, 422); assert.match(r.data.error, /no customer/); assert.equal(projectRows().length, before);
  const v2 = await save(SAM, { source: SRC('sites/acme/fourth.pdf'), extraction: { customer: 'Fourth Co', projectName: 'Fourth', scope: [{ text: 'Only scope', status: 'confirmed', origin: 'contract', source: { page: 1 } }] } }); assert.equal(v2.data.transfer.status, 'Requires Attention', 'a new version after approval needs a new approval');
  assert.equal((await create(SAM, { id })).status, 409); assert.equal((await mv(hid(SAM), SAM, id, { to: 'Awaiting Review', note: 'checked again' })).status, 200); assert.equal((await mv(hid(SAM), SAM, id, { to: 'Approved', ver: 2 })).status, 200);
  r = await create(SAM, { id }); assert.equal(r.status, 200); assert.equal(r.data.created, true); assert.equal((await as(SAM, 'GET', '/api/projects/' + r.data.project.id)).data.project.customer, 'Fourth Co');
});
await t('in a project: editors save, approval is the owner\'s in the app and never Claude\'s, viewers and customers are refused', async () => {
  const r = await save(KIM, { project: pid }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.space, 'project'); const id = r.data.transfer.id; assert.equal(r.data.transfer.status, 'Awaiting Review'); assert.ok(store.get('xf.' + pid).has(id));
  assert.equal((await mv(pid, KIM, id, { to: 'Approved', ver: 1 })).status, 403, 'an editor cannot approve'); assert.equal((await create(KIM, { project: pid, id })).status, 409);
  assert.equal((await save(VIC, { project: pid })).status, 403, 'a viewer cannot save'); assert.equal((await create(VIC, { project: pid, id })).status, 403, 'a viewer cannot create');
  for (const r of [await save(CUS, { project: pid }), await create(CUS, { project: pid, id }), await tool(CUS, 'transfer_get', { project: pid, id })]) assert.ok(r.status === 403 || r.status === 404, 'a customer gets nothing: ' + r.status);
  assert.equal((await save(SAM, { project: 'no such project' })).status >= 400, true); assert.equal((await mv(pid, SAM, id, { to: 'Approved', ver: 1 })).status, 200);
  const c = await create(KIM, { project: pid, id }); assert.equal(c.status, 200); assert.equal(c.data.created, true); const again = await create(SAM, { project: pid, id }); assert.equal(again.data.project.id, c.data.project.id); assert.equal(again.data.created, false);
  assert.deepEqual((await as(KIM, 'GET', '/api/projects/' + c.data.project.id)).data.members.map(m => [m.email, m.role]), [[KIM, 'owner']], 'the person who created it owns it');
  const rec = JSON.parse(store.get('xf.' + pid).get(id)); assert.equal(rec.projectId, c.data.project.id);
});
await t('the transfer routes still work for the project\'s own transfers and no tool approves', async () => {
  const names = JSON.parse(fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8')).mcp.tools.map(x => x.name); assert.ok(!names.some(x => /approv/i.test(x)));
  assert.equal((await tool(SAM, 'transfer_list', { project: pid })).data.total, 1);
});
console.log(n + ' MSA extraction checks passed');
