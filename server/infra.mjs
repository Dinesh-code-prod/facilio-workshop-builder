// Infrastructure adapters: environment, Postgres (Netlify Database), private file storage (Netlify Blobs).
// In tests, FWB_DB_URL and FWB_FILE_DIR switch to a local Postgres and a local directory.
import fs from 'node:fs/promises';
import path from 'node:path';

export function env(name, fallback) {
  try { if (globalThis.Netlify && globalThis.Netlify.env) { const v = globalThis.Netlify.env.get(name); if (v !== undefined && v !== null && v !== '') return v; } } catch (e) { /* not on Netlify */ }
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

let poolPromise = null;
export async function pool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const local = env('FWB_DB_URL');
      if (local) { const pg = (await import('pg')).default; return new pg.Pool({ connectionString: local, max: 4 }); }
      const { getDatabase } = await import('@netlify/database');
      return getDatabase().pool;
    })();
  }
  return poolPromise;
}
export async function q(text, params) { const p = await pool(); const r = await p.query(text, params || []); return r.rows; }
export async function q1(text, params) { const rows = await q(text, params); return rows[0] || null; }

let storePromise = null;
export async function fileStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const dir = env('FWB_FILE_DIR');
      if (dir) {
        const safe = k => path.join(dir, k.replace(/[^A-Za-z0-9/_.-]/g, '_'));
        return {
          async set(key, bytes) { const f = safe(key); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, Buffer.from(bytes)); },
          async get(key) { try { const b = await fs.readFile(safe(key)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } catch (e) { return null; } },
          async delete(key) { try { await fs.unlink(safe(key)); } catch (e) { /* missing */ } }
        };
      }
      if (env('FWB_FILE_STORE') === 'db') { // files live in the same private Postgres as the data
        return {
          async set(key, bytes) { await q('INSERT INTO fwb_files(key, bytes) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET bytes = EXCLUDED.bytes, updated_at = now()', [key, Buffer.from(bytes)]); },
          async get(key) { const r = await q1('SELECT bytes FROM fwb_files WHERE key = $1', [key]); return r ? r.bytes.buffer.slice(r.bytes.byteOffset, r.bytes.byteOffset + r.bytes.byteLength) : null; },
          async delete(key) { await q('DELETE FROM fwb_files WHERE key = $1', [key]); }
        };
      }
      const { getStore } = await import('@netlify/blobs');
      const s = getStore({ name: 'fwb-project-files', consistency: 'strong' });
      return { set: (k, b) => s.set(k, b), get: k => s.get(k, { type: 'arrayBuffer' }), delete: k => s.delete(k) };
    })();
  }
  return storePromise;
}
