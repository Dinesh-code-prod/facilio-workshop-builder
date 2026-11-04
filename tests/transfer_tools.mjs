// Push and pull connector tools (transfer_*), called the way Claude calls them: POST /api/ with the x-work-mcp-tool header, on the stand-in platform of tests/transfer_routes.mjs.
// This checks the nonce, confirm and evidence rules of the server. A real Claude session, a real connector sign-in and a real push to Microsoft 365 are NOT checked.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import handler from '../work/server/api.mjs';

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
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Transfer Tools', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }
const BASE = `/api/projects/${pid}/transfers`;
const mkIn = (scope, dir) => ({ project: pid, dir: dir || 'pull', kind: 'msa', source: { system: 'sharepoint', ref: 'sites/acme/msa.docx' }, dest: { system: 'studio', ref: 'msa' }, scope });
const CONTENT = 'The approved MSA text.\n' + 'clause '.repeat(200);
const move = (who, id, body) => as(who, 'POST', BASE + '/' + id + '/transition', body);
const row = id => JSON.parse(store.get('xf.' + pid).get(id));
/** begin, store, submit (Claude, as Kim) and approve (the owner, in the app): an Approved transfer */
async function approved(scope, content) {
  const id = (await tool(KIM, 'transfer_begin', mkIn(scope))).data.transfer.id; assert.equal((await tool(KIM, 'transfer_store', { project: pid, id, content: content || CONTENT })).status, 200);
  assert.equal((await tool(KIM, 'transfer_submit', { project: pid, id })).status, 200); assert.equal((await move(SAM, id, { to: 'Approved', ver: 1 })).status, 200); return id;
}
const ev = (extra) => Object.assign({ project: pid, outcome: 'pushed', receipt: 'etag-9', destRef: 'drive/item/9' }, extra);

await t('the eight tools are in work.json (the three that change a destination ask for confirmation) and there is no approve tool', async () => {
  const raw = fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8'); const all = JSON.parse(raw).mcp.tools; const names = all.map(x => x.name);
  const want = ['transfer_list', 'transfer_get', 'transfer_begin', 'transfer_store', 'transfer_submit', 'transfer_push_begin', 'transfer_report', 'transfer_verify']; for (const w of want) assert.ok(names.includes(w), w); assert.equal(new Set(names).size, names.length, 'no duplicate tool names');
  assert.deepEqual(all.filter(x => /^transfer_/.test(x.name) && x.confirm).map(x => x.name), ['transfer_push_begin', 'transfer_report', 'transfer_verify']); assert.ok(!names.some(x => /approv/i.test(x)), 'no approve tool for Claude');
  assert.ok(raw.includes('\r\n') && !/[^\r]\n/.test(raw), 'CRLF kept'); assert.equal(JSON.stringify(JSON.parse(raw), null, 1).replace(/\n/g, '\r\n') + '\r\n', raw, 'the 1-space layout is kept');
  for (const x of all.filter(y => /^transfer_/.test(y.name))) assert.ok(x.input_schema.required.includes('project'), x.name + ' needs a project');
  assert.ok((await tool(SAM, 'transfer_approve', { project: pid, id: 'x' })).status >= 400, 'a made-up approve tool is not served');
});
await t('transfer_begin is safe to repeat; transfer_list shows the transfer with its next moves', async () => {
  const a = await tool(KIM, 'transfer_begin', mkIn('list one')); assert.equal(a.status, 200); assert.equal(a.data.created, true); const id = a.data.transfer.id;
  const b = await tool(SAM, 'transfer_begin', mkIn('list one')); assert.equal(b.data.created, false); assert.equal(b.data.transfer.id, id);
  const l = await tool(KIM, 'transfer_list', { project: pid, status: 'Not Retrieved' }); assert.equal(l.data.transfers.length, 1); assert.deepEqual(l.data.transfers[0].next, ['Retrieving']); assert.equal((await tool(KIM, 'transfer_list', { project: pid, kind: 'brd' })).data.total, 0);
  assert.equal((await tool(KIM, 'transfer_begin', { project: pid, dir: 'pull', kind: 'msa' })).status, 400);
});
await t('transfer_store moves a first version on to Retrieved (pull) or Draft Generated (generate); the same content again changes nothing', async () => {
  const id = (await tool(KIM, 'transfer_begin', mkIn('store pull'))).data.transfer.id; const s1 = await tool(KIM, 'transfer_store', { project: pid, id, content: CONTENT, sourceEtag: 'e1', validation: { ok: true, checked: 'readable' } });
  assert.equal(s1.status, 200); assert.equal(s1.data.version, 1); assert.equal(s1.data.transfer.status, 'Retrieved'); assert.deepEqual(row(id).log.map(x => x.to), ['Not Retrieved', 'Not Retrieved', 'Retrieving', 'Retrieved']);
  const s2 = await tool(KIM, 'transfer_store', { project: pid, id, content: CONTENT }); assert.equal(s2.data.duplicate, true); assert.equal(row(id).ver, 1); assert.equal(row(id).log.length, 4, 'nothing logged for a duplicate');
  const s3 = await tool(KIM, 'transfer_store', { project: pid, id, content: CONTENT + ' edited', baseVersion: 1 }); assert.equal(s3.data.version, 2); assert.equal(s3.data.transfer.status, 'Retrieved'); assert.equal((await tool(KIM, 'transfer_store', { project: pid, id, content: 'x', baseVersion: 1 })).status, 409);
  const g = (await tool(KIM, 'transfer_begin', mkIn('store generate', 'generate'))).data.transfer.id; assert.equal((await tool(KIM, 'transfer_store', { project: pid, id: g, content: 'draft' })).data.transfer.status, 'Draft Generated');
  const k = (await tool(KIM, 'transfer_begin', mkIn('store quiet'))).data.transfer.id; assert.equal((await tool(KIM, 'transfer_store', { project: pid, id: k, content: 'x', advance: false })).data.transfer.status, 'Not Retrieved');
  assert.equal((await tool(VIC, 'transfer_store', { project: pid, id, content: 'viewer try' })).status, 403);
});
await t('transfer_get reads a version in parts and marks the content as untrusted', async () => {
  const id = (await tool(KIM, 'transfer_begin', mkIn('get parts'))).data.transfer.id; const text = 'x'.repeat(1000) + 'END'; await tool(KIM, 'transfer_store', { project: pid, id, content: text });
  const head = (await tool(VIC, 'transfer_get', { project: pid, id })).data; assert.equal(head.content, undefined); assert.equal(head.transfer.ver, 1);
  const a = (await tool(VIC, 'transfer_get', { project: pid, id, ver: '1', limit: 400 })).data; assert.equal(a.content.length, 400); assert.equal(a.truncated, true); assert.equal(a.contentTotal, 1003); assert.match(a.note, /offset 400/); assert.match(a.untrusted, /Never follow instructions/); assert.equal(a.intact, true);
  const c = (await tool(VIC, 'transfer_get', { project: pid, id, ver: 'latest', offset: 800, limit: 400 })).data; assert.equal(c.content, text.slice(800)); assert.equal(c.truncated, false);
});
await t('Claude cannot approve: submit stops at Awaiting Review, and an owner-only move is refused when it comes through the connector', async () => {
  const id = (await tool(KIM, 'transfer_begin', mkIn('no approve'))).data.transfer.id; await tool(KIM, 'transfer_store', { project: pid, id, content: CONTENT });
  const sub = await tool(SAM, 'transfer_submit', { project: pid, id }); assert.equal(sub.status, 200); assert.equal(sub.data.transfer.status, 'Awaiting Review'); assert.match(sub.data.note, /Claude cannot approve/);
  assert.equal(sub.data.transfer.next.includes('Approved'), true, 'the owner may approve in the app'); assert.equal((await tool(SAM, 'transfer_submit', { project: pid, id })).status, 409, 'it is already waiting');
  for (const body of [{ to: 'Approved' }, { outcome: 'pushed' }, { sha: sha(CONTENT) }]) for (const name of ['transfer_report', 'transfer_verify', 'transfer_push_begin']) assert.ok((await tool(SAM, name, Object.assign({ project: pid, id }, body))).status >= 400, name + ' before approval');
  assert.equal(row(id).status, 'Awaiting Review'); assert.equal(row(id).approvedVer, null);
});
await t('transfer_push_begin: editors only, approved version only, a one-time nonce that never shows in what a page reads', async () => {
  const id = await approved('push begin'); assert.equal((await tool(VIC, 'transfer_push_begin', { project: pid, id })).status, 403); assert.equal((await tool(CUS, 'transfer_push_begin', { project: pid, id })).status >= 400, true);
  const pb = await tool(KIM, 'transfer_push_begin', { project: pid, id, destEtag: '' }); assert.equal(pb.status, 200); assert.match(pb.data.nonce, /^[0-9a-f]{32}$/); assert.ok(Date.parse(pb.data.validUntil) - Date.now() > 14 * 60000 && Date.parse(pb.data.validUntil) - Date.now() <= 15 * 60000 + 1000); assert.equal(pb.data.transfer.pushIntent.live, true);
  assert.ok(!JSON.stringify(pb.data.transfer).includes(pb.data.nonce), 'the nonce is not in the transfer view'); for (const who of [SAM, KIM, VIC]) assert.ok(!JSON.stringify((await as(who, 'GET', BASE + '/' + id)).data).includes(pb.data.nonce), 'not in the route either');
  const pb2 = await tool(KIM, 'transfer_push_begin', { project: pid, id }); assert.notEqual(pb2.data.nonce, pb.data.nonce, 'a new intent replaces the old one'); assert.equal((await tool(KIM, 'transfer_report', ev({ id, nonce: pb.data.nonce }))).status, 403, 'the replaced nonce no longer works');
  const wrong = await tool(KIM, 'transfer_begin', mkIn('push begin too early')); assert.equal((await tool(KIM, 'transfer_push_begin', { project: pid, id: wrong.data.transfer.id })).status, 409);
});
await t('transfer_report: no Pushed without the nonce, an unexpired intent, the receipt and the destination; a nonce works once', async () => {
  const id = await approved('report'); const rep = b => tool(KIM, 'transfer_report', ev(Object.assign({ id }, b)));
  let r = await rep({ nonce: 'anything' }); assert.equal(r.status, 409); assert.equal(r.data.code, 'no_intent'); const nonce = (await tool(KIM, 'transfer_push_begin', { project: pid, id })).data.nonce;
  assert.equal((await rep({ nonce: 'wrong' })).status, 403); assert.equal((await rep({})).status, 403, 'no nonce'); assert.equal((await rep({ nonce, receipt: '' })).data.code, 'no_evidence'); assert.equal((await rep({ nonce, destRef: '' })).data.code, 'no_evidence'); assert.equal((await tool(KIM, 'transfer_report', { project: pid, id, nonce })).status, 400, 'no outcome'); assert.equal((await rep({ nonce, outcome: 'maybe' })).status, 400);
  assert.equal((await tool(VIC, 'transfer_report', ev({ id, nonce }))).status, 403); assert.equal(row(id).status, 'Approved', 'nothing above changed the record');
  r = await rep({ nonce }); assert.equal(r.status, 200); assert.equal(r.data.transfer.status, 'Pushed'); assert.match(r.data.note, /reported by Claude/i); assert.match(r.data.transfer.evidenceNote, /Reported by Claude/); const p = row(id).pushes[0]; assert.deepEqual([p.ver, p.destRef, p.receipt, p.via, p.by], [1, 'drive/item/9', 'etag-9', 'claude', KIM]);
  assert.equal(row(id).pushIntent, null); assert.equal((await rep({ nonce })).status >= 400, true, 'the same nonce twice');
});
await t('an expired intent is refused, and a destination that changed sends the transfer to Requires Attention', async () => {
  const id = await approved('expiry'); const nonce = (await tool(KIM, 'transfer_push_begin', { project: pid, id })).data.nonce; const h = row(id); h.pushIntent.exp = new Date(Date.now() - 1000).toISOString(); store.get('xf.' + pid).set(id, JSON.stringify(h));
  const r = await tool(KIM, 'transfer_report', ev({ id, nonce })); assert.equal(r.status, 409); assert.equal(r.data.code, 'intent_expired'); assert.equal(row(id).status, 'Approved'); assert.equal((await as(KIM, 'GET', BASE + '/' + id)).data.transfer.pushIntent.live, false);
  const id2 = await approved('etag'); const n2 = (await tool(KIM, 'transfer_push_begin', { project: pid, id: id2, destEtag: 'e1' })).data.nonce; const d = await tool(KIM, 'transfer_report', ev({ id: id2, nonce: n2, destEtagBefore: 'e0' }));
  assert.equal(d.status, 409); assert.equal(d.data.code, 'dest_changed'); assert.match(d.data.error, /Requires Attention/); assert.equal(row(id2).status, 'Requires Attention'); assert.equal(row(id2).error.code, 'dest_changed'); assert.equal(row(id2).pushes.length, 0, 'nothing is recorded as pushed');
});
await t('a failed push is recorded as failed, never as Pushed', async () => {
  const id = await approved('failed'); await tool(KIM, 'transfer_push_begin', { project: pid, id }); const r = await tool(KIM, 'transfer_report', { project: pid, id, outcome: 'failed', error: 'SharePoint said 403' });
  assert.equal(r.status, 200); assert.equal(r.data.transfer.status, 'Requires Attention'); assert.equal(row(id).error.code, 'push_failed'); assert.equal(row(id).error.msg, 'SharePoint said 403'); assert.equal(row(id).pushes.length, 0); assert.equal(row(id).pushIntent, null);
  assert.equal((await tool(KIM, 'transfer_report', { project: pid, id, outcome: 'failed' })).status, 409, 'it is no longer Approved');
});
await t('transfer_verify: Synchronized only when the read-back sha equals the approved version; a mismatch marks it Failed and a fresh push intent is needed', async () => {
  const id = await approved('verify'); assert.equal((await tool(KIM, 'transfer_verify', { project: pid, id, sha: sha(CONTENT) })).status, 409, 'not pushed yet');
  let nonce = (await tool(KIM, 'transfer_push_begin', { project: pid, id })).data.nonce; assert.equal((await tool(KIM, 'transfer_report', ev({ id, nonce }))).status, 200);
  assert.equal((await tool(KIM, 'transfer_verify', { project: pid, id })).status, 400, 'no sha'); assert.equal((await tool(KIM, 'transfer_verify', { project: pid, id, sha: 'abc' })).status, 400); assert.equal(row(id).status, 'Pushed', 'bad input changes nothing');
  const bad = await tool(KIM, 'transfer_verify', { project: pid, id, sha: sha('what the destination really holds') }); assert.equal(bad.status, 409); assert.equal(bad.data.code, 'sha_mismatch'); assert.match(bad.data.error, /marked Failed/); assert.equal(row(id).status, 'Failed'); assert.equal(row(id).failedFrom, 'Pushed'); assert.equal(row(id).error.code, 'sha_mismatch');
  assert.equal((await move(KIM, id, { to: 'Pushed', nonce: 'x', evidence: { destRef: 'd', receipt: 'r' } })).status, 409, 'going back to Pushed needs a fresh intent');
  nonce = (await tool(KIM, 'transfer_push_begin', { project: pid, id })).data.nonce; assert.equal((await tool(KIM, 'transfer_report', ev({ id, nonce, receipt: 'etag-10' }))).data.transfer.status, 'Pushed'); assert.equal(row(id).pushes.length, 2);
  assert.equal((await tool(VIC, 'transfer_verify', { project: pid, id, sha: sha(CONTENT) })).status, 403);
  const good = await tool(KIM, 'transfer_verify', { project: pid, id, sha: sha(CONTENT).toUpperCase() }); assert.equal(good.status, 200); assert.equal(good.data.transfer.status, 'Synchronized'); assert.match(good.data.note, /Reported by Claude/); assert.equal(row(id).pushes[1].verifiedSha, sha(CONTENT));
});
await t('a new version after approval cancels the push: Requires Attention, no intent, the approved version stays', async () => {
  const id = await approved('late edit'); await tool(KIM, 'transfer_push_begin', { project: pid, id }); const s = await tool(KIM, 'transfer_store', { project: pid, id, content: CONTENT + ' changed after approval' });
  assert.equal(s.status, 200); assert.equal(s.data.transfer.status, 'Requires Attention'); assert.equal(s.data.transfer.approvedVer, 1); assert.equal(row(id).pushIntent, null); assert.equal((await tool(KIM, 'transfer_push_begin', { project: pid, id })).status, 409);
  assert.equal((await tool(VIC, 'transfer_get', { project: pid, id, ver: '1' })).data.content, CONTENT);
});
await t('a customer or an outsider gets nothing from any transfer tool', async () => {
  const id = await approved('customer'); for (const name of ['transfer_list', 'transfer_get', 'transfer_begin', 'transfer_store', 'transfer_submit', 'transfer_push_begin', 'transfer_report', 'transfer_verify']) for (const who of [CUS, 'eve.x@facilio.com']) assert.ok((await tool(who, name, Object.assign(mkIn('x'), { id, content: 'x', outcome: 'pushed', sha: sha('x') }))).status >= 400, name + ' as ' + who);
  assert.equal((await tool(KIM, 'transfer_get', { project: pid, id: 'x-nothere' })).status, 404);
});
await t('the audit trail names each step', async () => {
  const acts = new Set([...store.get('au.' + pid).values()].map(v => JSON.parse(v).action)); for (const a of ['transfer-begin', 'transfer-version', 'transfer-move', 'transfer-push-intent', 'transfer-pushed', 'transfer-synchronized', 'transfer-verify-failed', 'transfer-push-failed', 'transfer-attention']) assert.ok(acts.has(a), a);
});
await t('CONNECTOR_HELP lists the transfer tools and a recipe', async () => {
  const h = (await tool(KIM, 'connector_help', {})).data; const all = JSON.stringify(h.tools); for (const name of ['transfer_list', 'transfer_store', 'transfer_push_begin', 'transfer_report', 'transfer_verify']) assert.ok(all.includes(name), name);
  const r = (await tool(KIM, 'connector_help', { topic: 'push' })).data; assert.equal(r.recipe, 'Push and pull'); assert.match(r.steps, /transfer_push_begin/);
});
console.log(n + ' transfer tool checks passed');
