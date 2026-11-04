// Push and pull engine, the pure rules in work/server/_transfer.mjs (roadmap E4, design STEP1-PUSH-PULL-DESIGN.md). No database, no network.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { STATUSES, DIRS, LIMITS, canonKey, transferId, decideStore, newRecord, addVersion, transition, allowedNext, pushGuard, beginPush, view, summarise } from '../work/server/_transfer.mjs';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');
const T0 = Date.parse('2026-11-04T10:00:00Z'), MIN = 60000;
const IN = { dir: 'pull', kind: 'msa', source: { system: 'sharepoint', ref: 'sites/x/msa.docx', label: 'MSA.docx' }, dest: { system: 'studio', ref: 'msa' }, scope: 'whole file' };
const ver = (text, extra) => Object.assign({ sha: sha(text), size: text.length, store: 'db' }, extra);
const base = () => { let r = newRecord(IN, { by: 'kim', now: T0 }).rec; return addVersion(r, ver('v1'), { by: 'kim', now: T0 }).rec; };
const at = (status, patch) => Object.assign(base(), { status }, patch);
const EV = { destRef: 'drive/item/9', receipt: 'etag-77', destEtag: 'e2', destEtagBefore: '' };
/** an Approved record with a live push intent whose nonce is N1 */
const approvedWithIntent = () => beginPush(at('Approved', { approvedVer: 1 }), { role: 'editor', by: 'kim', now: T0, nonce: 'N1' }).rec;

// ---------- the table, written out separately from the code ----------
const E = { 'Not Retrieved': { Retrieving: 'editor' }, Retrieving: { Retrieved: 'editor', Failed: 'editor', 'Requires Attention': 'editor' }, Retrieved: { 'Draft Generated': 'editor', 'Awaiting Review': 'editor', 'Requires Attention': 'editor' },
  'Draft Generated': { 'Awaiting Review': 'editor', 'Requires Attention': 'editor' }, 'Awaiting Review': { Approved: 'owner', 'Draft Generated': 'owner', 'Requires Attention': 'editor' },
  Approved: { Pushed: 'editor', 'Draft Generated': 'editor', 'Requires Attention': 'editor' }, Pushed: { Synchronized: 'editor', Failed: 'editor', 'Requires Attention': 'editor' },
  Synchronized: { 'Requires Attention': 'editor', Retrieving: 'editor' } };
const expect = (table, to, role) => { const who = table[to]; return who === 'editor' ? role === 'owner' || role === 'editor' : who === 'owner' ? role === 'owner' : false; };
const full = { role: null, via: 'app', by: 'sam', now: T0 + MIN, note: 'a note for the log', nonce: 'N1', evidence: EV, sha: sha('v1'), ver: 1 };

await t('there are exactly the ten statuses of E4 and three directions', () => {
  assert.deepEqual(STATUSES, ['Not Retrieved', 'Retrieving', 'Retrieved', 'Draft Generated', 'Awaiting Review', 'Approved', 'Pushed', 'Synchronized', 'Failed', 'Requires Attention']); assert.deepEqual(DIRS, ['pull', 'generate', 'push']);
});
await t('every (from, to, role) pair is allowed or refused exactly as the design table says', () => {
  let checked = 0;
  const cases = [...Object.keys(E).map(from => ({ from, rec: from === 'Approved' ? approvedWithIntent() : from === 'Pushed' ? at('Pushed', { approvedVer: 1 }) : at(from), table: E[from] })),
    ...['Retrieving', 'Pushed'].map(ff => ({ from: 'Failed(' + ff + ')', rec: ff === 'Pushed' ? beginPush(at('Failed', { failedFrom: 'Pushed', approvedVer: 1 }), { role: 'editor', by: 'kim', now: T0, nonce: 'N1' }).rec : at('Failed', { failedFrom: ff }), table: { [ff]: 'editor' } })),
    ...[['Synchronized', ['Retrieving', 'Retrieved', 'Draft Generated', 'Awaiting Review']], ['Retrieved', ['Retrieving', 'Retrieved']], ['Retrieving', ['Retrieving']]].map(([af, back]) => ({ from: 'Requires Attention(' + af + ')', rec: at('Requires Attention', { attnFrom: af, approvedVer: 1 }), table: Object.fromEntries(back.map(b => [b, 'owner'])) }))];
  for (const c of cases) for (const to of STATUSES) for (const role of ['owner', 'editor', 'viewer', 'customer', undefined]) {
    const r = transition(c.rec, to, Object.assign({}, full, { role })); const want = expect(c.table, to, role);
    assert.equal(r.ok, want, c.from + ' -> ' + to + ' as ' + role + ' should be ' + (want ? 'allowed' : 'refused') + (r.ok ? '' : ' (' + r.code + ')')); checked++;
    if (!want && !r.ok) assert.ok([400, 403, 409].includes(r.http), 'a refusal carries a status'); if (r.ok) assert.equal(r.rec.status, to);
  }
  assert.equal(checked, 13 * 10 * 5);
});
await t('allowedNext follows the same table per role, and Pushed shows only with a live push intent', () => {
  assert.deepEqual(allowedNext(at('Awaiting Review'), 'owner'), ['Approved', 'Draft Generated', 'Requires Attention']); assert.deepEqual(allowedNext(at('Awaiting Review'), 'editor'), ['Requires Attention']); assert.deepEqual(allowedNext(at('Awaiting Review'), 'viewer'), []);
  assert.ok(!allowedNext(at('Approved', { approvedVer: 1 }), 'editor').includes('Pushed')); assert.ok(allowedNext(approvedWithIntent(), 'editor', { now: T0 + MIN }).includes('Pushed')); assert.ok(!allowedNext(approvedWithIntent(), 'editor', { now: T0 + 16 * MIN }).includes('Pushed'));
  assert.deepEqual(allowedNext(at('Awaiting Review'), 'owner', { via: 'claude' }), ['Requires Attention'], 'through Claude an owner gets no owner-only move');
});

await t('approval is owner only: an editor, a viewer, a customer and Claude (even as owner) can never approve', () => {
  const r = at('Awaiting Review'); for (const role of ['editor', 'viewer', 'customer']) assert.equal(transition(r, 'Approved', { role, by: 'x', ver: 1 }).ok, false);
  const c = transition(r, 'Approved', { role: 'owner', via: 'claude', by: 'x', ver: 1 }); assert.equal(c.ok, false); assert.equal(c.code, 'owner_only'); assert.match(c.error, /never approve/);
  const ok = transition(r, 'Approved', { role: 'owner', via: 'app', by: 'sam', now: T0, ver: 1 }); assert.equal(ok.ok, true); assert.equal(ok.rec.approvedVer, 1); assert.equal(ok.rec.approvedBy, 'sam');
  assert.equal(transition(r, 'Approved', { role: 'owner', by: 'sam', ver: 2 }).code, 'stale_version', 'approving a version that is not the current one is refused');
  assert.equal(r.status, 'Awaiting Review', 'the input record is never changed');
});
await t('a version must exist before Retrieved, Draft Generated, Awaiting Review or Approved', () => {
  const empty = newRecord(IN, { by: 'kim' }).rec; const r = transition(Object.assign({}, empty, { status: 'Retrieving' }), 'Retrieved', { role: 'editor', by: 'kim' }); assert.equal(r.code, 'no_version');
});

await t('no Pushed without a matching nonce, an unexpired intent and evidence', () => {
  const approved = at('Approved', { approvedVer: 1 }); const go = (rec, o) => transition(rec, 'Pushed', Object.assign({ role: 'editor', by: 'kim', now: T0 + MIN, nonce: 'N1', evidence: EV }, o));
  assert.equal(go(approved).code, 'no_intent', 'no intent recorded');
  const b = beginPush(approved, { role: 'editor', by: 'kim', now: T0, nonce: 'N1' }); assert.equal(b.ok, true); assert.equal(b.rec.pushIntent.exp, new Date(T0 + 15 * MIN).toISOString()); const live = b.rec;
  assert.equal(go(live, { nonce: 'N2' }).code, 'bad_nonce'); assert.equal(go(live, { nonce: '' }).code, 'bad_nonce'); assert.equal(go(live, { nonce: 12345 }).code, 'bad_nonce'); assert.equal(go(live, { nonce: undefined }).code, 'bad_nonce');
  assert.equal(go(live, { now: T0 + 15 * MIN }).code, 'intent_expired'); assert.equal(go(live, { now: T0 + 16 * MIN }).code, 'intent_expired');
  assert.equal(go(live, { evidence: undefined }).code, 'no_evidence'); assert.equal(go(live, { evidence: { destRef: 'x' } }).code, 'no_evidence'); assert.equal(go(live, { evidence: { receipt: 'x' } }).code, 'no_evidence'); assert.equal(go(live, { evidence: 'receipt' }).code, 'no_evidence');
  assert.equal(pushGuard(live, { nonce: 'N1', evidence: EV, now: T0 + MIN }).ok, true);
  const done = go(live); assert.equal(done.ok, true); assert.equal(done.rec.status, 'Pushed'); assert.equal(done.rec.pushIntent, null, 'the nonce works once');
  assert.deepEqual([done.rec.pushes[0].ver, done.rec.pushes[0].destRef, done.rec.pushes[0].receipt, done.rec.pushes[0].via], [1, 'drive/item/9', 'etag-77', 'app']); assert.match(done.rec.pushes[0].evidence, /Reported by Claude/);
  assert.equal(go(done.rec).ok, false, 'a second use of the same nonce');
});
await t('the destination etag Claude read must still match; a push cannot target a newer version than the approved one', () => {
  const live = beginPush(at('Approved', { approvedVer: 1 }), { role: 'editor', by: 'kim', now: T0, nonce: 'N1', destEtag: 'e1' }).rec;
  assert.equal(transition(live, 'Pushed', { role: 'editor', now: T0, nonce: 'N1', evidence: EV }).code, 'dest_changed'); assert.equal(transition(live, 'Pushed', { role: 'editor', now: T0, nonce: 'N1', evidence: Object.assign({}, EV, { destEtagBefore: 'e1' }) }).ok, true);
  const v2 = addVersion(live, ver('v2'), { by: 'kim', now: T0 }).rec; assert.equal(v2.pushIntent, null, 'a new version cancels the intent'); assert.equal(beginPush(v2, { role: 'editor' }).ok, false);
  assert.equal(beginPush(at('Awaiting Review'), { role: 'editor' }).code, 'not_allowed'); assert.equal(beginPush(at('Approved', { approvedVer: 1 }), { role: 'viewer' }).code, 'forbidden');
});
await t('no Synchronized unless the read-back sha equals the approved version\'s sha', () => {
  const pushed = at('Pushed', { approvedVer: 1, pushes: [{ ver: 1, destRef: 'd', receipt: 'r', at: 'x' }] }); const go = s => transition(pushed, 'Synchronized', { role: 'editor', by: 'kim', now: T0, sha: s });
  assert.equal(go(sha('other')).code, 'sha_mismatch'); assert.equal(go(undefined).code, 'no_evidence'); assert.equal(go('abc').code, 'no_evidence'); assert.equal(go(sha('v1').slice(0, 63)).code, 'no_evidence');
  const ok = go(sha('v1').toUpperCase()); assert.equal(ok.ok, true); assert.equal(ok.rec.status, 'Synchronized'); assert.equal(ok.rec.pushes[0].verifiedSha, sha('v1'));
  const v2 = addVersion(Object.assign(base(), { status: 'Awaiting Review' }), ver('v2'), { by: 'a', now: T0 }).rec; const a2 = transition(v2, 'Approved', { role: 'owner', by: 'sam', ver: 2 }).rec; assert.equal(a2.approvedVer, 2);
  const p2 = Object.assign({}, a2, { status: 'Pushed' }); assert.equal(transition(p2, 'Synchronized', { role: 'editor', sha: sha('v1') }).code, 'sha_mismatch', 'the first version\'s sha does not count when version 2 was approved'); assert.equal(transition(p2, 'Synchronized', { role: 'editor', sha: sha('v2') }).ok, true);
});
await t('Failed returns to the status it came from; a failed push needs a fresh intent and evidence again', () => {
  const f = transition(at('Retrieving'), 'Failed', { role: 'editor', by: 'kim', now: T0, error: { code: 'auth', msg: 'sign-in expired' } }); assert.equal(f.ok, true); assert.equal(f.rec.failedFrom, 'Retrieving'); assert.deepEqual([f.rec.error.code, f.rec.error.msg], ['auth', 'sign-in expired']);
  assert.deepEqual(allowedNext(f.rec, 'editor'), ['Retrieving']); const back = transition(f.rec, 'Retrieving', { role: 'editor', by: 'kim' }); assert.equal(back.ok, true); assert.equal(back.rec.error, null); assert.equal(back.rec.failedFrom, '');
  const pf = transition(at('Pushed', { approvedVer: 1 }), 'Failed', { role: 'editor', by: 'kim', note: 'read-back did not match' }); assert.equal(pf.rec.failedFrom, 'Pushed'); assert.equal(pf.rec.error.msg, 'read-back did not match');
  assert.equal(transition(pf.rec, 'Pushed', { role: 'editor', nonce: 'N1', evidence: EV }).code, 'no_intent', 'going back to Pushed still needs the guard');
  const again = beginPush(pf.rec, { role: 'editor', by: 'kim', now: T0, nonce: 'N3' }); assert.equal(again.ok, true); assert.equal(transition(again.rec, 'Pushed', { role: 'editor', now: T0, nonce: 'N3', evidence: EV }).ok, true);
});
await t('Requires Attention needs a note and an owner to leave, and only goes to an earlier status', () => {
  const ra = transition(at('Approved', { approvedVer: 1 }), 'Requires Attention', { role: 'editor', by: 'kim', now: T0, note: 'the customer changed the scope' }); assert.equal(ra.ok, true); assert.equal(ra.rec.attnFrom, 'Approved');
  assert.equal(transition(ra.rec, 'Awaiting Review', { role: 'owner', by: 'sam' }).code, 'note_required'); assert.equal(transition(ra.rec, 'Awaiting Review', { role: 'owner', by: 'sam', note: ' ' }).code, 'note_required');
  assert.equal(transition(ra.rec, 'Awaiting Review', { role: 'editor', by: 'kim', note: 'fine now' }).code, 'owner_only'); assert.equal(transition(ra.rec, 'Awaiting Review', { role: 'owner', via: 'claude', by: 'sam', note: 'fine now' }).code, 'owner_only');
  for (const to of ['Approved', 'Pushed', 'Synchronized', 'Failed', 'Not Retrieved']) assert.equal(transition(ra.rec, to, Object.assign({}, full, { role: 'owner' })).ok, false, 'not ' + to);
  const out = transition(ra.rec, 'Awaiting Review', { role: 'owner', by: 'sam', now: T0, note: 'scope change reviewed' }); assert.equal(out.ok, true); assert.equal(out.rec.approvedVer, null, 'going back before Approved clears the approval'); assert.equal(out.rec.error, null);
});

await t('canonKey and the id: same transfer, same id; case-insensitive system, case-sensitive ref; bad input gives no key', () => {
  assert.equal(canonKey(IN), 'pull|msa|sharepoint|sites/x/msa.docx|studio|msa|whole file'); const id = transferId(IN); assert.match(id, /^x-[0-9a-f]{32}$/); assert.match(id, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
  assert.equal(transferId(Object.assign({}, IN, { dir: 'PULL', source: { system: 'SharePoint', ref: ' sites/x/msa.docx ' }, scope: ' Whole  FILE ' })), id);
  assert.notEqual(transferId(Object.assign({}, IN, { source: { system: 'sharepoint', ref: 'sites/x/MSA.docx' } })), id, 'refs keep their case'); assert.notEqual(transferId(Object.assign({}, IN, { scope: 'page 2' })), id); assert.notEqual(transferId(Object.assign({}, IN, { dir: 'push' })), id);
  assert.notEqual(canonKey(Object.assign({}, IN, { source: { system: 'a', ref: 'b|c' } })), canonKey(Object.assign({}, IN, { source: { system: 'a', ref: 'b/c' } })), 'a pipe in a ref cannot blur two keys'); assert.equal(canonKey({}), ''); assert.equal(transferId(null), '');
});
await t('decideStore: create, duplicate, new version, conflict', () => {
  assert.equal(decideStore(null, { sha: sha('v1') }), 'create'); const r = base(); assert.equal(decideStore(r, { sha: sha('v1') }), 'duplicate'); assert.equal(decideStore(r, {}), 'duplicate', 'begin again with no content');
  assert.equal(decideStore(r, { sha: sha('v2') }), 'newVersion'); assert.equal(decideStore(r, { sha: sha('v2'), baseVersion: 1 }), 'newVersion'); assert.equal(decideStore(r, { sha: sha('v2'), baseVersion: 0 }), 'conflict'); assert.equal(decideStore(r, { sha: sha('v1'), baseVersion: 3 }), 'conflict');
  assert.equal(decideStore(newRecord(IN, { by: 'k' }).rec, { sha: sha('v1'), baseVersion: 0 }), 'newVersion', 'the first version of an empty record'); assert.equal(decideStore(r, null), 'duplicate');
});
await t('the same content returns the same record; new content makes version n+1; version 1 is never touched', () => {
  const r1 = base(); const v1 = JSON.stringify(r1.versions[0]); const dup = addVersion(r1, ver('v1'), { by: 'x' }); assert.equal(dup.duplicate, true); assert.strictEqual(dup.rec, r1);
  const r2 = addVersion(r1, ver('v2', { sourceEtag: 'src-2', validation: { ok: false, errors: ['clause 4 missing'] } }), { by: 'lee', now: T0 + MIN }); assert.equal(r2.ok, true); assert.equal(r2.rec.ver, 2); assert.equal(r2.rec.versions.length, 2);
  assert.equal(JSON.stringify(r2.rec.versions[0]), v1, 'version 1 is byte for byte the same'); assert.equal(r2.rec.source.etag, 'src-2'); assert.deepEqual(r2.rec.versions[1].validation.errors, ['clause 4 missing']); assert.equal(r1.ver, 1, 'the input is untouched');
  assert.equal(addVersion(r2.rec, ver('v1'), { by: 'x' }).rec.ver, 3, 'going back to old content is a new version, not a duplicate');
});
await t('a new version after approval or push sends the record to Requires Attention; the approved version stays', () => {
  for (const st of ['Approved', 'Pushed']) { const r = addVersion(at(st, { approvedVer: 1 }), ver('v2'), { by: 'lee', now: T0 }).rec; assert.equal(r.status, 'Requires Attention'); assert.equal(r.attnFrom, st); assert.equal(r.approvedVer, 1); assert.ok(r.versions.some(x => x.n === 1)); assert.match(r.log.at(-1).note, /approved version 1 is unchanged/); }
  for (const st of ['Retrieved', 'Draft Generated', 'Awaiting Review', 'Synchronized']) assert.equal(addVersion(at(st), ver('v2'), { by: 'lee' }).rec.status, st, st + ' stays');
});

const big = c => c.repeat(50000);
await t('a head record stays under 60 KB with 30 versions and 40 log entries, even when every field is stuffed', () => {
  const stuff = { dir: 'push', kind: 'x'.repeat(41).slice(1) + 'y', source: { system: 's'.repeat(60), ref: 'r'.repeat(500), label: big('l'), etag: big('e') }, dest: { system: 'd'.repeat(60), ref: 'q'.repeat(500), label: big('m'), etag: big('f') }, scope: 'z'.repeat(200) };
  let r = newRecord(stuff, { by: big('b'), now: T0 }); assert.equal(r.ok, true, r.error); r = r.rec;
  for (let i = 1; i <= 80; i++) r = addVersion(r, { sha: sha('c' + i), size: 123456789, store: 'file', fileId: big('f'), sourceEtag: big('e'), note: big('n'), validation: { ok: false, checked: big('c'), errors: Array(50).fill(big('E')), warnings: Array(50).fill(big('W')) } }, { by: big('b'), now: T0 + i }).rec;
  r = Object.assign(r, { status: 'Awaiting Review' }); r = transition(r, 'Approved', { role: 'owner', by: big('o'), note: big('n') }).rec;
  for (let i = 0; i < 25; i++) { r = beginPush(r, { role: 'editor', by: big('b'), now: T0, nonce: 'n'.repeat(32), destEtag: big('e') }).rec; r = transition(r, 'Pushed', { role: 'editor', by: big('b'), now: T0, nonce: 'n'.repeat(32), evidence: { destRef: big('d'), receipt: big('r'), destEtag: big('t'), destEtagBefore: 'e'.repeat(100) }, note: big('n') }).rec; r = Object.assign(r, { status: 'Approved' }); }
  assert.ok(r.versions.length <= LIMITS.versions && r.versions.length === 30, 'versions capped at 30, not ' + r.versions.length); assert.equal(r.ver, 80, 'the counter keeps counting'); assert.equal(r.droppedVersions, 50); assert.equal(r.versions[0].n, 1, 'version 1 is kept'); assert.ok(r.versions.some(x => x.n === r.approvedVer), 'the approved version is kept');
  assert.equal(r.log.length, LIMITS.log); assert.ok(r.pushes.length <= LIMITS.pushes); const size = Buffer.byteLength(JSON.stringify(r)); assert.ok(size < 60000, 'head record is ' + size + ' bytes');
  assert.ok(Buffer.byteLength(JSON.stringify(view(r, 'owner'))) < 62000);
});
await t('hostile input is refused or trimmed, never stored raw', () => {
  const bad = [null, 7, 'x', [], {}, Object.assign({}, IN, { dir: 'sideways' }), Object.assign({}, IN, { kind: 'Bad Kind!' }), Object.assign({}, IN, { kind: 5 }), Object.assign({}, IN, { source: 'sharepoint' }), Object.assign({}, IN, { source: { system: '' } }), Object.assign({}, IN, { source: { system: 7, ref: 'a' } }),
    Object.assign({}, IN, { source: { system: 'a', ref: 'r'.repeat(501) } }), Object.assign({}, IN, { dest: { system: 'a', ref: {} } }), Object.assign({}, IN, { scope: 'z'.repeat(201) }), Object.assign({}, IN, { scope: {} })];
  for (const b of bad) { const r = newRecord(b, { by: 'kim' }); assert.equal(r.ok, false); assert.equal(r.http, 400); assert.equal(canonKey(b), ''); }
  assert.equal(newRecord(IN, { by: { x: 1 } }).ok, false); assert.equal(newRecord(IN, {}).ok, false); assert.equal(newRecord(IN).ok, false);
  const r = base(); for (const v of [null, 'x', {}, { sha: 'zz', size: 1 }, { sha: sha('a') }, { sha: sha('a'), size: -1 }, { sha: sha('a'), size: 1.5 }, { sha: sha('a'), size: '9' }, { sha: 5, size: 1 }]) assert.equal(addVersion(r, v, { by: 'x' }).ok, false);
  const t1 = addVersion(r, { sha: sha('q'), size: 1, validation: ['x'], fileId: { a: 1 }, sourceEtag: 5, note: 'line\nbreak\u0000' + big('n') }, { by: 'x', now: 'not a date' }); assert.equal(t1.ok, true); assert.equal(t1.rec.versions[1].validation, undefined); assert.equal(t1.rec.versions[1].fileId, undefined); assert.ok(t1.rec.log.at(-1).note.length <= 300); assert.ok(!/[\u0000\n]/.test(t1.rec.log.at(-1).note));
  assert.equal(transition(r, 'nonsense', { role: 'editor' }).code, 'bad_status'); assert.equal(transition(r, 'Retrieving', null).ok, false); assert.equal(transition(r, 'Retrieving', 'owner').ok, false); assert.equal(transition(at('Not Retrieved'), 'Retrieving', { role: 'editor', by: { a: 1 }, note: { b: 2 } }).ok, true);
  assert.equal(transition(at('Retrieving'), 'Failed', { role: 'editor', error: { msg: big('m'), code: big('c') } }).rec.error.msg.length, 200);
});
await t('view hides the nonce and adds next[] for the role; summarise gives a small list row', () => {
  const live = approvedWithIntent(); const v = view(live, 'editor', { now: T0 + MIN }); assert.ok(!JSON.stringify(v).includes('N1'), 'no nonce in what a page sees'); assert.equal(v.pushIntent.live, true); assert.ok(v.next.includes('Pushed')); assert.deepEqual(view(live, 'viewer', { now: T0 + MIN }).next, []);
  assert.equal(view(live, 'editor', { now: T0 + 20 * MIN }).pushIntent.live, false); assert.equal(live.pushIntent.nonce, 'N1', 'view works on a copy');
  const row = summarise(at('Awaiting Review'), 'owner'); assert.deepEqual(Object.keys(row).sort(), ['approvedVer', 'by', 'createdAt', 'dest', 'dir', 'error', 'id', 'kind', 'next', 'scope', 'source', 'status', 'updatedAt', 'ver']); assert.deepEqual(row.next, ['Approved', 'Draft Generated', 'Requires Attention']);
  assert.ok(Buffer.byteLength(JSON.stringify(row)) < 1500);
});
console.log(n + ' transfer rule checks passed');
