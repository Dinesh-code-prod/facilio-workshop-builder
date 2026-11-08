/* Push and pull engine, the pure rules (roadmap E4, design in docs/reference/STEP1-PUSH-PULL-DESIGN.md). No database, no network: run by tests/transfer.mjs
   and used by work/server/_transferapi.mjs. A transfer is one head record per (direction, kind, source, destination, scope); its content lives in immutable
   versions kept elsewhere. Every function returns a new record and leaves its input alone; a refusal is { ok: false, http, code, error }.
   Nothing here can approve on Claude's behalf, and nothing becomes Pushed or Synchronized without the evidence fields. Evidence is what Claude reported;
   the Studio cannot see Microsoft 365 or any destination itself. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const STATUSES = ['Not Retrieved', 'Retrieving', 'Retrieved', 'Draft Generated', 'Awaiting Review', 'Approved', 'Pushed', 'Synchronized', 'Failed', 'Requires Attention'];
export const DIRS = ['pull', 'generate', 'push'];
export const LIMITS = { versions: 30, log: 40, pushes: 10, intentMinutes: 15, content: 2000000 };
export const EVIDENCE_NOTE = 'Reported by Claude. Delivery Studio cannot see the destination itself.';
const KIND_RE = /^[a-z][a-z0-9_]{1,40}$/, SHA_RE = /^[0-9a-f]{64}$/;
const RA = 'Requires Attention', RA_BACK = ['Retrieving', 'Retrieved', 'Draft Generated', 'Awaiting Review'], NEEDS_VERSION = new Set(['Retrieved', 'Draft Generated', 'Awaiting Review', 'Approved']);
const idx = s => STATUSES.indexOf(s);
// who may make each move (the table in the design). Failed and Requires Attention are worked out from the record (see targets)
const TABLE = { 'Not Retrieved': { Retrieving: 'editor' }, Retrieving: { Retrieved: 'editor', Failed: 'editor', [RA]: 'editor' }, Retrieved: { 'Draft Generated': 'editor', 'Awaiting Review': 'editor', [RA]: 'editor' },
  'Draft Generated': { 'Awaiting Review': 'editor', [RA]: 'editor' }, 'Awaiting Review': { Approved: 'owner', 'Draft Generated': 'owner', [RA]: 'editor' },
  Approved: { Pushed: 'editor', 'Draft Generated': 'editor', [RA]: 'editor' }, Pushed: { Synchronized: 'editor', Failed: 'editor', [RA]: 'editor' }, Synchronized: { [RA]: 'editor', Retrieving: 'editor' } };

export const sha256 = text => createHash('sha256').update(String(text), 'utf8').digest('hex');
const iso = n => { const d = n == null ? new Date() : new Date(n); return (isNaN(d) ? new Date() : d).toISOString(); };
const txt = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const fail = (http, code, error) => ({ ok: false, http, code, error });
const clone = r => JSON.parse(JSON.stringify(r));
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

/** Validates the identity of a transfer. Over-long keys are refused, never cut, so two different refs can never collapse into one record. */
function parse(i) {
  i = isObj(i) ? i : {};
  const bad = m => ({ error: m });
  const dir = typeof i.dir === 'string' ? i.dir.trim().toLowerCase() : ''; if (!DIRS.includes(dir)) return bad('dir must be one of ' + DIRS.join(', '));
  const kind = typeof i.kind === 'string' ? i.kind.trim().toLowerCase() : ''; if (!KIND_RE.test(kind)) return bad('kind must be lowercase letters, digits and underscores (for example msa, transcript, brd)');
  const end = (o, name) => { if (!isObj(o)) return bad(name + ' must be an object with a system'); const system = typeof o.system === 'string' ? o.system.trim().toLowerCase() : ''; const ref = o.ref == null ? '' : o.ref;
    if (!system || system.length > 60) return bad(name + '.system is required (up to 60 characters)'); if (typeof ref !== 'string' || ref.trim().length > 500) return bad(name + '.ref must be text up to 500 characters');
    return { system, ref: ref.trim(), label: txt(o.label, 120), etag: txt(o.etag, 100) }; };
  const source = end(i.source, 'source'); if (source.error) return source; const dest = end(i.dest, 'dest'); if (dest.error) return dest;
  if (i.scope != null && typeof i.scope !== 'string') return bad('scope must be text'); const scope = String(i.scope || '').replace(/\s+/g, ' ').trim().toLowerCase(); if (scope.length > 200) return bad('scope is too long (200 characters)');
  return { dir, kind, source, dest, scope };
}
/** dir|kind|source.system|source.ref|dest.system|dest.ref|scope; '' when the input is not valid */
export function canonKey(input) { const p = parse(input); if (p.error) return ''; const c = s => String(s).replace(/%/g, '%25').replace(/\|/g, '%7C'); return [p.dir, p.kind, p.source.system, p.source.ref, p.dest.system, p.dest.ref, p.scope].map(c).join('|'); }
/** the head record's key: x- plus 32 hex of the key's sha256, so a duplicate check is one read; '' when the input is not valid */
export const transferId = input => { const k = canonKey(input); return k ? 'x-' + sha256(k).slice(0, 32) : ''; };

/** Duplicate and overwrite rule for a store. existing = the head record or null; incoming = { sha, baseVersion }.
    create | duplicate (same key, same content as the newest version, or no content given) | newVersion | conflict (baseVersion is not the current version) */
export function decideStore(existing, incoming) {
  if (!existing) return 'create'; const inc = isObj(incoming) ? incoming : {};
  if (inc.baseVersion != null && Number(inc.baseVersion) !== existing.ver) return 'conflict';
  if (!inc.sha) return 'duplicate'; const last = (existing.versions || [])[(existing.versions || []).length - 1]; return last && last.sha === inc.sha ? 'duplicate' : 'newVersion';
}

export function newRecord(input, { by, now } = {}) {
  const p = parse(input); if (p.error) return fail(400, 'bad_input', p.error); const who = txt(by, 100); if (!who) return fail(400, 'bad_input', 'by is required');
  const at = iso(now); const rec = { id: transferId(input), dir: p.dir, kind: p.kind, source: p.source, dest: p.dest, scope: p.scope, by: who, createdAt: at, updatedAt: at, status: 'Not Retrieved', ver: 0,
    approvedVer: null, approvedBy: '', approvedAt: '', versions: [], droppedVersions: 0, error: null, log: [{ at, by: who, from: '', to: 'Not Retrieved', note: 'Created' }], pushes: [], pushIntent: null, failedFrom: '', attnFrom: '' };
  return { ok: true, rec };
}

const cleanList = (v, n, max) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, n).map(x => txt(x, max)).filter(Boolean) : []);
const cleanValidation = v => { if (!isObj(v)) return null; return { ok: typeof v.ok === 'boolean' ? v.ok : null, checked: txt(v.checked, 60), errors: cleanList(v.errors, 2, 80), warnings: cleanList(v.warnings, 2, 60) }; };

/** Adds an immutable version. v = { sha, size, store: 'db'|'file', fileId, validation, sourceEtag, note }. The same sha as the newest version returns the same record (duplicate: true).
    A new version after approval or push sends the record to Requires Attention (the approved version stays readable) and cancels any push intent. Version 1 is never changed. */
export function addVersion(rec, v, { by, now } = {}) {
  v = isObj(v) ? v : {}; const sha = typeof v.sha === 'string' ? v.sha.trim().toLowerCase() : ''; if (!SHA_RE.test(sha)) return fail(400, 'bad_input', 'sha must be 64 hex characters');
  const size = v.size; if (!Number.isInteger(size) || size < 0) return fail(400, 'bad_input', 'size must be a whole number of bytes'); const store = v.store === 'file' ? 'file' : 'db';
  const last = rec.versions[rec.versions.length - 1]; if (last && last.sha === sha) return { ok: true, rec, duplicate: true };
  const at = iso(now), who = txt(by, 100) || 'unknown'; const r = clone(rec); const n = r.ver + 1; r.ver = n;
  const e = { n, at, by: who, sha, size, store }; const fid = txt(v.fileId, 64); if (fid) e.fileId = fid; const val = cleanValidation(v.validation); if (val) e.validation = val; const et = txt(v.sourceEtag, 100); if (et) { e.sourceEtag = et; r.source.etag = et; }
  r.versions.push(e);
  while (r.versions.length > LIMITS.versions) { const k = r.versions.findIndex((x, i) => i > 0 && x.n !== r.approvedVer); if (k < 1) break; r.versions.splice(k, 1); r.droppedVersions++; }   // version 1 and the approved version always stay in the list
  const from = r.status; let note = txt(v.note, 200) || 'Version ' + n + ' stored'; r.pushIntent = null;
  if (from === 'Approved' || from === 'Pushed') { r.status = RA; r.attnFrom = from; note = 'Version ' + n + ' arrived after approval; the approved version ' + r.approvedVer + ' is unchanged. ' + note; }
  log(r, at, who, from, r.status, note); r.updatedAt = at; return { ok: true, rec: r, duplicate: false, version: n };
}
function log(r, at, by, from, to, note, via) { const e = { at, by, from, to, note: txt(note, 200) }; if (via) e.via = via; r.log.push(e); if (r.log.length > LIMITS.log) r.log.splice(0, r.log.length - LIMITS.log); }

/** the moves open from the record's current status, with who may make each */
function targets(rec) {
  if (rec.status === 'Failed') return STATUSES.includes(rec.failedFrom) && rec.failedFrom !== 'Failed' && rec.failedFrom !== RA ? [{ to: rec.failedFrom, who: 'editor' }] : [];
  if (rec.status === RA) { const top = idx(rec.attnFrom); return RA_BACK.filter(s => idx(s) <= top).map(to => ({ to, who: 'owner' })); }
  return Object.entries(TABLE[rec.status] || {}).map(([to, who]) => ({ to, who }));
}
const rank = role => (role === 'owner' ? 2 : role === 'editor' ? 1 : 0);
/** role and table check only (the guards for Pushed and Synchronized are separate); null when the move is open */
function gate(rec, to, o) {
  if (!STATUSES.includes(to)) return fail(400, 'bad_status', 'Unknown status');
  if (!rank(o.role)) return fail(403, 'forbidden', 'Only project editors and owners can change a transfer');
  const hit = targets(rec).find(x => x.to === to); if (!hit) return fail(409, 'not_allowed', 'A transfer cannot go from ' + rec.status + ' to ' + to);
  if (hit.who === 'owner' && (rank(o.role) < 2 || o.via === 'claude')) return fail(403, 'owner_only', 'Only the project owner can do this, and not through Claude' + (to === 'Approved' ? ': Claude can never approve its own work' : ''));
  return null;
}

const cleanEvidence = e => { e = isObj(e) ? e : {}; return { destRef: txt(e.destRef, 200), destEtag: txt(e.destEtag, 100), destEtagBefore: txt(e.destEtagBefore, 100), receipt: txt(e.receipt, 160) }; };
/** A push needs: the approved version is the current one, a live intent for it, the nonce, and the receipt and destination Claude reports. */
export function pushGuard(rec, { nonce, evidence, now } = {}) {
  const i = rec.pushIntent; if (!i) return fail(409, 'no_intent', 'Nothing was confirmed for a push. Record the push intent first (transfer_push_begin) and have the person confirm.');
  if (rec.approvedVer == null || rec.ver !== rec.approvedVer || i.ver !== rec.approvedVer) return fail(409, 'stale_intent', 'The push intent is not for the approved version. Record a new one.');
  if (Date.parse(i.exp) <= Date.parse(iso(now))) return fail(409, 'intent_expired', 'The push intent has expired. Record a new one.');
  if (typeof nonce !== 'string' || !nonce || !safeEq(nonce, i.nonce)) return fail(403, 'bad_nonce', 'The push nonce does not match.');
  const ev = cleanEvidence(evidence); if (!ev.receipt || !ev.destRef) return fail(400, 'no_evidence', 'A push is only recorded with evidence: the receipt and the destination reference Claude saw.');
  if (i.destEtag && ev.destEtagBefore !== i.destEtag) return fail(409, 'dest_changed', 'The destination changed since the push was confirmed.');
  return { ok: true, evidence: ev };
}
/** Synchronized only when the sha read back from the destination equals the sha of the approved version. */
export function syncGuard(rec, sha) {
  const a = rec.versions.find(x => x.n === rec.approvedVer); if (!a) return fail(409, 'no_approved_version', 'There is no approved version to compare with.');
  const s = typeof sha === 'string' ? sha.trim().toLowerCase() : ''; if (!SHA_RE.test(s)) return fail(400, 'no_evidence', 'The read-back sha (64 hex characters) is required.');
  return s === a.sha ? { ok: true } : fail(409, 'sha_mismatch', 'The read-back content is not the approved version.');
}

/** Records that the person confirmed a push of the approved version: a random nonce valid 15 minutes. Needs an editor. */
export function beginPush(rec, { role, by, now, destEtag, nonce } = {}) {
  if (!rank(role)) return fail(403, 'forbidden', 'Only project editors and owners can confirm a push');
  if (!(rec.status === 'Approved' || (rec.status === 'Failed' && rec.failedFrom === 'Pushed'))) return fail(409, 'not_allowed', 'Only an approved transfer can be pushed (status is ' + rec.status + ')');
  if (rec.approvedVer == null || rec.ver !== rec.approvedVer) return fail(409, 'stale_intent', 'The approved version is not the current version');
  const at = iso(now), r = clone(rec); const n = typeof nonce === 'string' && nonce ? nonce : randomBytes(16).toString('hex');
  r.pushIntent = { ver: r.approvedVer, dest: { system: r.dest.system, ref: r.dest.ref }, nonce: n, exp: new Date(Date.parse(at) + LIMITS.intentMinutes * 60000).toISOString(), destEtag: txt(destEtag, 100), by: txt(by, 100) || 'unknown', at };
  log(r, at, txt(by, 100) || 'unknown', r.status, r.status, 'Push confirmed for version ' + r.approvedVer + '; valid ' + LIMITS.intentMinutes + ' minutes'); r.updatedAt = at; return { ok: true, rec: r, nonce: n, exp: r.pushIntent.exp };
}

/** One move. o = { role: owner|editor, via: 'claude'|'app', by, now, note, ver, nonce, evidence, sha, error }. Returns { ok, rec } or a refusal. */
export function transition(rec, to, o = {}) {
  o = isObj(o) ? o : {}; const g = gate(rec, to, o); if (g) return g;
  const at = iso(o.now), by = txt(o.by, 100) || 'unknown', note = txt(o.note, 200), from = rec.status; let ev = null;
  if (from === RA && note.length < 3) return fail(400, 'note_required', 'A note is needed to leave Requires Attention');
  if (NEEDS_VERSION.has(to) && !rec.ver) return fail(409, 'no_version', 'Store a version first');
  if (to === 'Approved' && o.ver != null && Number(o.ver) !== rec.ver) return fail(409, 'stale_version', 'Version ' + o.ver + ' is not the current version (' + rec.ver + ')');
  if (to === 'Pushed') { const p = pushGuard(rec, o); if (!p.ok) return p; ev = p.evidence; }
  if (to === 'Synchronized') { const s = syncGuard(rec, o.sha); if (!s.ok) return s; }
  const r = clone(rec); r.status = to; r.updatedAt = at; const errIn = typeof o.error === 'string' ? { msg: o.error } : isObj(o.error) ? o.error : {};
  if (from === 'Failed' || from === RA) r.error = null; r.failedFrom = to === 'Failed' ? from : ''; r.attnFrom = to === RA ? from : '';
  if (to === 'Failed' || (to === RA && (errIn.msg || errIn.code))) r.error = { code: txt(errIn.code, 40) || (to === 'Failed' ? 'failed' : 'attention'), msg: txt(errIn.msg, 200) || note || (to === 'Failed' ? 'Failed' : ''), at };
  if (idx(to) < idx('Approved')) { r.approvedVer = null; r.approvedBy = ''; r.approvedAt = ''; r.pushIntent = null; }
  if (to === 'Approved') { r.approvedVer = r.ver; r.approvedBy = by; r.approvedAt = at; }
  if (to === 'Pushed') { r.pushes.push({ ver: r.approvedVer, destRef: ev.destRef, destEtag: ev.destEtag, receipt: ev.receipt, at, by, via: o.via === 'claude' ? 'claude' : 'app', evidence: EVIDENCE_NOTE }); if (r.pushes.length > LIMITS.pushes) r.pushes.splice(0, r.pushes.length - LIMITS.pushes); r.pushIntent = null; }
  if (to === 'Synchronized') { const p = r.pushes[r.pushes.length - 1]; if (p) Object.assign(p, { verifiedAt: at, verifiedBy: by, verifiedSha: String(o.sha).trim().toLowerCase() }); }
  log(r, at, by, from, to, note || (r.error && to !== from && (to === 'Failed' || to === RA) ? r.error.msg : ''), o.via); return { ok: true, rec: r };
}

/** the statuses this person may move the record to right now (guards included: Pushed only with a live push intent, Synchronized only from Pushed); the page never copies the rules */
export function allowedNext(rec, role, o = {}) {
  return targets(rec).filter(t => !gate(rec, t.to, { role, via: o.via })).map(t => t.to).filter(to => {
    if (NEEDS_VERSION.has(to) && !rec.ver) return false;
    if (to === 'Pushed') { const i = rec.pushIntent; return !!i && i.ver === rec.approvedVer && rec.ver === rec.approvedVer && Date.parse(i.exp) > Date.parse(iso(o.now)); }
    return true; });
}
/** A transfer added by mistake may be removed by an editor or owner until a person approved a version of it (Approved, Pushed, Synchronized and anything once approved are the record of what was agreed and sent, so they stay). */
export const canRemove = (rec, role) => rank(role) > 0 && !['Approved', 'Pushed', 'Synchronized'].includes(rec.status) && rec.approvedVer == null && !rec.projectId;
/** the record as a person sees it: no nonce, plus next[] for the viewer's role */
export function view(rec, role, o = {}) {
  const r = clone(rec); if (r.pushIntent) r.pushIntent = { ver: r.pushIntent.ver, dest: r.pushIntent.dest, exp: r.pushIntent.exp, live: Date.parse(r.pushIntent.exp) > Date.parse(iso(o.now)) };
  r.next = allowedNext(rec, role, o); r.canRemove = canRemove(rec, role); r.evidenceNote = r.pushes.length ? EVIDENCE_NOTE : ''; return r;
}
/** one list row */
export function summarise(rec, role, o = {}) {
  const e = x => ({ system: x.system, ref: x.ref, label: x.label });
  return { id: rec.id, dir: rec.dir, kind: rec.kind, scope: rec.scope, status: rec.status, ver: rec.ver, approvedVer: rec.approvedVer, source: e(rec.source), dest: e(rec.dest), by: rec.by, createdAt: rec.createdAt, updatedAt: rec.updatedAt,
    error: rec.error ? { code: rec.error.code, msg: rec.error.msg } : null, next: allowedNext(rec, role, o), canRemove: canRemove(rec, role) };
}
