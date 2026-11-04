// Push and pull engine, storage and routes (work/server/_transferapi.mjs through work/server/api.mjs), on a stand-in platform like tests/task_watch.mjs.
// Nothing here talks to Microsoft 365 or any real destination: a real push or read-back is NOT checked by this file.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import handler from '../work/server/api.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const store = new Map(); const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = (email, role) => ({ viewer: { email, role: role || 'viewer' }, app: { name: 'fwb' }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }), secrets: { async get() { throw new Error('no secret'); } },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const s = JSON.stringify(v); if (s.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, s); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl() { return { url: 'https://storage.example/put/x', file_id: 'f1' }; }, async url() { return { url: 'https://storage.example/get/x' }; }, async put() { return { file_id: 'p1' }; }, async get() { return { text: async () => '' }; }, async delete() { } } });
const as = async (email, method, path, body, role) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email, role)); return { status: r.status, data: await r.json() }; };
const SAM = 'sam.k@facilio.com', KIM = 'kim.r@facilio.com', VIC = 'vic.t@facilio.com', CUS = 'cus.c@facilio.com', EVE = 'eve.x@facilio.com', SUB = 'sub.s@facilio.com', ADM = 'adm.a@facilio.com';
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

const pid = (await as(SAM, 'POST', '/api/projects', { name: 'Transfer Test', customer: 'Acme' })).data.project.id;
for (const [e, role] of [[KIM, 'editor'], [VIC, 'viewer'], [CUS, 'viewer']]) assert.equal((await as(SAM, 'POST', `/api/projects/${pid}/members`, { email: e, role })).status, 201);
{ const row = JSON.parse(store.get('projects').get(pid)); row.members.find(m => m.email === CUS).role = 'customer'; store.get('projects').set(pid, JSON.stringify(row)); }   // customers cannot be added through the API in this version; make one directly
if (!store.has('grant')) store.set('grant', new Map()); store.get('grant').set('sub.s:facilio.com', JSON.stringify({ role: 'sub', email: SUB }));
const BASE = `/api/projects/${pid}/transfers`;
const IN = { dir: 'pull', kind: 'msa', source: { system: 'sharepoint', ref: 'sites/acme/msa.docx', label: 'Acme MSA.docx' }, dest: { system: 'studio', ref: 'msa' }, scope: 'whole file' };
const begin = (who, body) => as(who, 'POST', BASE, body || IN);

await t('a customer is refused everywhere (403), and someone outside the project sees nothing (404)', async () => {
  assert.equal((await as(CUS, 'GET', BASE)).status, 403); assert.equal((await as(CUS, 'GET', BASE + '/x-' + '0'.repeat(32))).status, 403); assert.equal((await begin(CUS)).status, 403); assert.equal((await as(CUS, 'POST', BASE + '/x-' + '0'.repeat(32) + '/transition', { to: 'Retrieving' })).status, 403);
  assert.equal((await as(EVE, 'GET', BASE)).status, 404); assert.equal((await begin(EVE)).status, 404);
});
const made = await begin(KIM); const id = made.data.transfer && made.data.transfer.id;
await t('begin is idempotent: 201 for a new transfer, 200 and the same id for a duplicate', async () => {
  assert.equal(made.status, 201); assert.equal(made.data.created, true); assert.match(id, /^x-[0-9a-f]{32}$/); assert.equal(made.data.transfer.status, 'Not Retrieved'); assert.equal(made.data.transfer.by, KIM);
  const again = await begin(SAM); assert.equal(again.status, 200); assert.equal(again.data.created, false); assert.equal(again.data.transfer.id, id); assert.equal(again.data.transfer.by, KIM, 'the duplicate does not change the record');
  const other = await begin(KIM, Object.assign({}, IN, { scope: 'page 2' })); assert.equal(other.status, 201); assert.notEqual(other.data.transfer.id, id);
  assert.equal((await begin(KIM, Object.assign({}, IN, { dir: 'sideways' }))).status, 400); assert.equal((await begin(KIM, { dir: 'pull' })).status, 400); assert.equal((await begin(KIM, Object.assign({}, IN, { source: { system: 'a', ref: 'r'.repeat(501) } }))).status, 400);
});
await t('a viewer and a sub admin can read but not write; a customer cannot do either', async () => {
  for (const who of [VIC, SUB]) { const l = await as(who, 'GET', BASE); assert.equal(l.status, 200, who); assert.ok(l.data.transfers.length >= 1); assert.deepEqual(l.data.transfers.find(x => x.id === id).next, [], 'no moves for ' + who);
    assert.equal((await begin(who, Object.assign({}, IN, { scope: 'viewer try' }))).status, 403, who); assert.equal((await as(who, 'POST', BASE + '/' + id + '/versions', { content: 'x' })).status, 403, who); assert.equal((await as(who, 'POST', BASE + '/' + id + '/transition', { to: 'Retrieving' })).status, 403, who); }
  assert.equal((await as(VIC, 'GET', BASE + '/' + id)).status, 200);
});
await t('five parallel begins of the same transfer make one record', async () => {
  const body = Object.assign({}, IN, { kind: 'transcript', scope: 'parallel' }); const rs = await Promise.all([1, 2, 3, 4, 5].map(i => begin(i % 2 ? KIM : SAM, body)));
  assert.equal(rs.filter(r => r.status === 201).length, 1); assert.equal(rs.filter(r => r.status === 200).length, 4); assert.equal(new Set(rs.map(r => r.data.transfer.id)).size, 1);
  assert.equal((await as(SAM, 'GET', BASE + '?kind=transcript')).data.transfers.length, 1, 'one record, not five');
});

const V1 = 'first content of the MSA, line one\nline two', V2 = V1 + '\nand a change';
await t('versions are immutable: same content is a duplicate, new content is version 2, version 1 is intact and readable', async () => {
  const a = await as(KIM, 'POST', BASE + '/' + id + '/versions', { content: V1, sourceEtag: 'etag-1', validation: { ok: true, checked: 'text readable' } }); assert.equal(a.status, 201); assert.equal(a.data.version, 1); assert.equal(a.data.transfer.ver, 1);
  const head1 = (await as(SAM, 'GET', BASE + '/' + id)).data.transfer; const v1entry = JSON.stringify(head1.versions[0]); assert.equal(head1.versions[0].sha, sha(V1)); assert.equal(head1.source.etag, 'etag-1');
  const dup = await as(SAM, 'POST', BASE + '/' + id + '/versions', { content: V1 }); assert.equal(dup.status, 200); assert.equal(dup.data.duplicate, true); assert.equal(dup.data.transfer.ver, 1);
  const b = await as(SAM, 'POST', BASE + '/' + id + '/versions', { content: V2, baseVersion: 1 }); assert.equal(b.status, 201); assert.equal(b.data.version, 2);
  const head2 = (await as(SAM, 'GET', BASE + '/' + id)).data.transfer; assert.equal(JSON.stringify(head2.versions[0]), v1entry, 'version 1 entry unchanged'); assert.equal(head2.versions.length, 2);
  const r1 = (await as(SAM, 'GET', BASE + '/' + id + '?ver=1')).data; assert.equal(r1.content, V1); assert.equal(r1.intact, true); assert.equal((await as(SAM, 'GET', BASE + '/' + id + '?ver=2')).data.content, V2); assert.equal((await as(SAM, 'GET', BASE + '/' + id + '?ver=latest')).data.content, V2);
  assert.equal((await as(SAM, 'GET', BASE + '/' + id + '?ver=3')).status, 404); assert.equal((await as(VIC, 'GET', BASE + '/' + id + '?ver=1')).data.content, V1);
});
await t('a stale baseVersion is a 409 and writes nothing; bad content is refused', async () => {
  const c = await as(KIM, 'POST', BASE + '/' + id + '/versions', { content: 'later', baseVersion: 1 }); assert.equal(c.status, 409); assert.equal(c.data.current.version, 2); assert.equal((await as(SAM, 'GET', BASE + '/' + id)).data.transfer.ver, 2);
  for (const content of [undefined, '', 5, { a: 1 }, null]) assert.equal((await as(KIM, 'POST', BASE + '/' + id + '/versions', { content })).status, 400); assert.equal((await as(KIM, 'POST', BASE + '/' + id + '/versions', { content: 'x', baseVersion: 'two' })).status, 400);
  assert.equal((await as(KIM, 'POST', BASE + '/' + id + '/versions', { content: 'x'.repeat(2000001) })).status, 413); assert.equal((await as(KIM, 'POST', BASE + '/x-' + 'a'.repeat(32) + '/versions', { content: 'x' })).status, 404); assert.equal((await as(KIM, 'POST', BASE + '/nope/versions', { content: 'x' })).status, 404);
});
await t('a payload over 100 KB is stored whole (compressed and split) and read back identical', async () => {
  const bigId = (await begin(KIM, Object.assign({}, IN, { kind: 'brd', scope: 'big' }))).data.transfer.id; const content = randomBytes(150000).toString('base64') + '\nend';
  const r = await as(KIM, 'POST', BASE + '/' + bigId + '/versions', { content }); assert.equal(r.status, 201); assert.ok(content.length > 100000);
  assert.ok([...store.get('xfdp.' + pid).keys()].some(k => k.startsWith(bigId + '.1.')), 'the payload was split into parts'); assert.ok(!JSON.parse(store.get('xfd.' + pid).get(bigId + '.1')).d, 'the head of the payload holds no inline copy');
  const back = (await as(SAM, 'GET', BASE + '/' + bigId + '?ver=1')).data; assert.equal(back.content, content); assert.equal(back.intact, true); assert.equal(back.version.size, Buffer.byteLength(content));
  assert.ok(store.get('xf.' + pid).get(bigId).length < 60000, 'the head record stays small');
});
await t('the status moves follow the rules by role, and the list shows next[] per role', async () => {
  const mv = (who, to, extra) => as(who, 'POST', BASE + '/' + id + '/transition', Object.assign({ to }, extra));
  assert.equal((await mv(KIM, 'Approved')).status, 409, 'not a legal move yet'); assert.equal((await mv(KIM, 'Nonsense')).status, 400);
  for (const to of ['Retrieving', 'Retrieved', 'Awaiting Review']) assert.equal((await mv(KIM, to)).status, 200, to);
  const next = who => as(who, 'GET', BASE).then(r => r.data.transfers.find(x => x.id === id).next);
  assert.deepEqual(await next(SAM), ['Approved', 'Draft Generated', 'Requires Attention']); assert.deepEqual(await next(KIM), ['Requires Attention']); assert.deepEqual(await next(VIC), []);
  const no = await mv(KIM, 'Approved', { ver: 2 }); assert.equal(no.status, 403); assert.match(no.data.error, /owner/i); assert.equal(no.data.code, 'owner_only');
  assert.equal((await mv(SAM, 'Approved', { ver: 1 })).status, 409, 'version 1 is not the current version'); assert.equal((await mv(SAM, 'Approved', { baseVersion: 1 })).status, 409, 'stale baseVersion');
  const ap = await mv(SAM, 'Approved', { ver: 2, baseVersion: 2 }); assert.equal(ap.status, 200); assert.equal(ap.data.transfer.status, 'Approved'); assert.equal(ap.data.transfer.approvedVer, 2); assert.equal(ap.data.transfer.approvedBy, SAM);
  assert.equal((await mv(KIM, 'Pushed', { nonce: 'guess', evidence: { destRef: 'd', receipt: 'r' } })).status, 409, 'no Pushed without a push intent'); assert.equal((await mv(KIM, 'Pushed', { nonce: 'guess', evidence: { destRef: 'd', receipt: 'r' } })).data.code, 'no_intent');
  assert.equal((await mv(KIM, 'Synchronized', { sha: sha(V2) })).status, 409);
});
await t('a new version after approval moves the record to Requires Attention and keeps the approved version', async () => {
  const r = await as(KIM, 'POST', BASE + '/' + id + '/versions', { content: V2 + '\nanother edit' }); assert.equal(r.status, 201); const h = r.data.transfer; assert.equal(h.status, 'Requires Attention'); assert.equal(h.approvedVer, 2); assert.equal(h.ver, 3);
  assert.equal((await as(SAM, 'GET', BASE + '/' + id + '?ver=2')).data.content, V2, 'the approved version is still readable'); assert.deepEqual((await as(SAM, 'GET', BASE)).data.transfers.find(x => x.id === id).next, ['Retrieving', 'Retrieved', 'Draft Generated', 'Awaiting Review'], 'the owner may send it back to any earlier status'); assert.deepEqual(h.next, [], 'an editor has no move out of it');
  assert.equal((await as(KIM, 'POST', BASE + '/' + id + '/transition', { to: 'Awaiting Review', note: 'checked' })).status, 403, 'an editor cannot resolve it');
  assert.equal((await as(SAM, 'POST', BASE + '/' + id + '/transition', { to: 'Awaiting Review' })).status, 400, 'the owner needs a note'); assert.equal((await as(SAM, 'POST', BASE + '/' + id + '/transition', { to: 'Awaiting Review', note: 'new version reviewed' })).status, 200);
});
await t('the in-record log and the audit rows both record what happened', async () => {
  const h = (await as(SAM, 'GET', BASE + '/' + id)).data.transfer; const tos = h.log.map(x => x.to); for (const s of ['Retrieving', 'Retrieved', 'Awaiting Review', 'Approved', 'Requires Attention']) assert.ok(tos.includes(s), s);
  assert.ok(h.log.every(x => x.at && x.by), 'every entry has a time and a person'); assert.equal(h.log.find(x => x.to === 'Approved').by, SAM);
  const acts = [...store.get('au.' + pid).values()].map(v => JSON.parse(v).action); for (const a of ['transfer-begin', 'transfer-version', 'transfer-move']) assert.ok(acts.includes(a), 'audit ' + a);
  assert.ok([...store.get('au.' + pid).values()].some(v => JSON.parse(v).detail.includes(id)), 'the audit row names the transfer');
});
await t('transfers are in their own collections: not in the items store a customer can list, and there is no delete route', async () => {
  for (const c of [...store.keys()]) assert.ok(!/^it\.[^.]+\.(xf|transfer)/.test(c), c); assert.ok(store.has('xf.' + pid) && store.has('xfd.' + pid));
  assert.equal((await as(CUS, 'GET', `/api/projects/${pid}/items/xf`)).status >= 400, true); assert.equal((await as(SAM, 'DELETE', BASE + '/' + id)).status, 404); assert.equal((await as(SAM, 'PUT', BASE + '/' + id, { status: 'Approved' })).status, 404);
  assert.equal(JSON.parse(store.get('xf.' + pid).get(id)).status, 'Awaiting Review');
});
await t('deleting a project for good removes its transfers too', async () => {
  assert.equal((await as(SAM, 'DELETE', `/api/projects/${pid}`)).status, 200);   // archive
  const d = await as(ADM, 'POST', `/api/admin/projects/${pid}/delete`, { confirm: 'Transfer Test' }, 'owner'); assert.equal(d.status, 200, JSON.stringify(d.data));
  for (const c of ['xf.', 'xfd.', 'xfdp.']) assert.equal((store.get(c + pid) || new Map()).size, 0, c + ' emptied');
});
console.log(n + ' transfer route checks passed');
