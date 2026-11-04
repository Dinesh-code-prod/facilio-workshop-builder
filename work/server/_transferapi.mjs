/* Push and pull engine, storage and routes (roadmap E4, design in docs/reference/STEP1-PUSH-PULL-DESIGN.md). The rules are in _transfer.mjs; this file only reads and writes them.
   api.mjs calls installTransfer(deps) once, with its own helpers, so there is one request state and one set of access rules.
   Collections (not in KINDS, so a customer can never list them): xf.<pid> head records, xfd.<pid> and xfdp.<pid> immutable version payloads (key <id>.<n>, saved by save(): gzip and split when large).
   The in-record log is the authoritative trail; audit() mirrors it. There is no delete route. */
import { STATUSES, LIMITS, sha256, transferId, decideStore, newRecord, addVersion, transition, view, summarise } from './_transfer.mjs';

const ID_RE = /^x-[0-9a-f]{32}$/, te = new TextEncoder();

export function installTransfer(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, dbList, save, unpack, withLock, audit } = d;
  const col = pid => 'xf.' + pid, dcol = pid => 'xfd.' + pid, pcol = pid => 'xfdp.' + pid, lock = (pid, id) => 'xf.' + pid + '.' + id;
  /** project access for the team only: customers are refused, viewers and sub admins can read but not write (projectAccess), approval is the owner's (the rules) */
  async function access(s, pid, need) { const a = await projectAccess(s, pid, need); if (a.role === 'customer') throw new HttpError(403, 'Transfers are for the project team'); return a; }
  async function load(pid, id) { if (!ID_RE.test(id)) throw new HttpError(404, 'Transfer not found'); const r = await dbGet(col(pid), id); if (!r || !r.value) throw new HttpError(404, 'Transfer not found'); return r.value; }
  const refuse = r => { throw new HttpError(r.http || 400, r.error, { code: r.code }); };
  const verNum = v => { const n = Number(v); if (v == null || v === '' || !Number.isInteger(n) || n < 0) throw new HttpError(400, 'baseVersion must be a whole number'); return n; };

  const ops = {
    async list(s, pid, q) {
      const { role } = await access(s, pid, 'read'); const status = String(q.status || ''), kind = String(q.kind || '').toLowerCase();
      const rows = (await dbList(col(pid))).map(r => r.value).filter(r => r && r.id && (!status || r.status === status) && (!kind || r.kind === kind)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 200);
      const counts = {}; for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1; return { role, statuses: STATUSES, counts, transfers: rows.map(r => summarise(r, role)) };
    },
    /** one transfer; with ver (a number or "latest") also that version's content, checked against its recorded sha */
    async get(s, pid, id, ver) {
      const { role } = await access(s, pid, 'read'); const rec = await load(pid, id); const out = { transfer: view(rec, role) }; if (ver == null || ver === '') return out;
      const n = ver === 'latest' ? rec.ver : Number(ver); const e = rec.versions.find(x => x.n === n); if (!e) throw new HttpError(404, 'Version ' + ver + ' is not stored for this transfer'); if (e.store !== 'db') throw new HttpError(409, 'That version is a file; reading files is not available yet');
      const key = id + '.' + n; const row = await dbGet(dcol(pid), key); if (!row) throw new HttpError(500, 'Stored data is incomplete'); const obj = await unpack(pcol(pid), key, row.value);
      out.version = e; out.content = obj && typeof obj.content === 'string' ? obj.content : ''; out.intact = sha256(out.content) === e.sha; return out;
    },
    /** idempotent: the same dir, kind, source, destination and scope is the same transfer. Returns { created, transfer } */
    async begin(s, pid, b) {
      const { role } = await access(s, pid, 'edit'); const id = transferId(b); if (!id) refuse(newRecord(b, { by: s.email }) || {});
      return withLock(lock(pid, id), async () => {
        const row = await dbGet(col(pid), id); if (row && row.value) return { created: false, transfer: view(row.value, role) };
        const r = newRecord(b, { by: s.email }); if (!r.ok) refuse(r); await dbPut(col(pid), id, r.rec); await audit(pid, s.id, 'transfer-begin', id + ' ' + r.rec.dir + ' ' + r.rec.kind); return { created: true, transfer: view(r.rec, role) };
      });
    },
    /** stores content as the next immutable version unless it is the same as the newest one; baseVersion guards against a stale writer (409) */
    async addVersion(s, pid, id, b) {
      const { role } = await access(s, pid, 'edit'); b = b || {};
      if (typeof b.content !== 'string' || !b.content) throw new HttpError(400, 'content must be text'); if (b.content.length > LIMITS.content) throw new HttpError(413, 'Content is too large for one version (' + LIMITS.content + ' characters)');
      const base = b.baseVersion == null ? null : verNum(b.baseVersion);
      return withLock(lock(pid, id), async () => {
        const cur = await load(pid, id); const sha = sha256(b.content); const dec = decideStore(cur, { sha, baseVersion: base });
        if (dec === 'conflict') throw new HttpError(409, 'Conflict: this transfer is at version ' + cur.ver + ', not ' + base + '.', { current: { version: cur.ver, status: cur.status } });
        if (dec === 'duplicate') return { created: false, duplicate: true, transfer: view(cur, role) };
        const n = cur.ver + 1, at = new Date().toISOString(); const r = addVersion(cur, { sha, size: te.encode(b.content).length, store: 'db', validation: b.validation, sourceEtag: b.sourceEtag, note: b.note }, { by: s.email, now: at }); if (!r.ok) refuse(r);
        await save(dcol(pid), pcol(pid), id + '.' + n, { v: n, by: s.email, at }, { content: b.content }, 0);   // the payload first: a head that points at a missing payload can never exist
        await dbPut(col(pid), id, r.rec); await audit(pid, s.id, 'transfer-version', id + ' v' + n + (r.rec.status !== cur.status ? ' ' + cur.status + ' to ' + r.rec.status : '')); return { created: true, duplicate: false, version: n, transfer: view(r.rec, role) };
      });
    },
    /** one status move; o = { to, note, ver, baseVersion, nonce, evidence, sha, error }; via is 'app' for the page and 'claude' for the connector (Claude can never take an owner-only move) */
    async move(s, pid, id, o, via, extra) {
      const { role } = await access(s, pid, 'edit'); o = o || {}; const base = o.baseVersion == null ? null : verNum(o.baseVersion);
      return withLock(lock(pid, id), async () => {
        const cur = await load(pid, id); if (base != null && base !== cur.ver) throw new HttpError(409, 'Conflict: this transfer is at version ' + cur.ver + ', not ' + base + '.', { current: { version: cur.ver, status: cur.status } });
        const r = (extra && extra.fn) ? extra.fn(cur, role) : transition(cur, String(o.to || ''), { role, via, by: s.email, now: new Date().toISOString(), note: o.note, ver: o.ver, nonce: o.nonce, evidence: o.evidence, sha: o.sha, error: o.error });
        if (!r.ok) { if (extra && extra.onRefuse) { const alt = await extra.onRefuse(cur, role, r); if (alt) { await dbPut(col(pid), id, alt.rec); await audit(pid, s.id, 'transfer-' + (alt.audit || 'attention'), id + ' ' + cur.status + ' to ' + alt.rec.status); } } refuse(r); }
        await dbPut(col(pid), id, r.rec); await audit(pid, s.id, 'transfer-' + (extra && extra.audit || 'move'), id + ' ' + cur.status + ' to ' + r.rec.status); return { transfer: view(r.rec, role), nonce: r.nonce, exp: r.exp };
      });
    }
  };

  const P = '/api/projects/:id/transfers';
  route('GET', P, async (b, G, q) => { const s = await me(); return ok(await ops.list(s, G.id, { status: q.get('status'), kind: q.get('kind') })); });
  route('GET', P + '/:tid', async (b, G, q) => { const s = await me(); return ok(await ops.get(s, G.id, G.tid, q.get('ver'))); });
  route('POST', P, async (b, G) => { const s = await me(); const r = await ops.begin(s, G.id, b); return ok({ created: r.created, transfer: r.transfer }, r.created ? 201 : 200); });
  route('POST', P + '/:tid/versions', async (b, G) => { const s = await me(); const r = await ops.addVersion(s, G.id, G.tid, b); return ok(r, r.created ? 201 : 200); });
  route('POST', P + '/:tid/transition', async (b, G) => { const s = await me(); const r = await ops.move(s, G.id, G.tid, b, 'app'); return ok({ transfer: r.transfer }); });
  return { ops, load, access };   // the connector tools (added in the next slice) use the same operations
}
