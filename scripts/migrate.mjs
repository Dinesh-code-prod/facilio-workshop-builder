// Apply the SQL migrations to an external Postgres (Neon, Supabase, ...) named by FWB_DB_URL.
// Usage: FWB_DB_URL='postgres://…?sslmode=require' node scripts/migrate.mjs
// Safe to re-run: applied files are recorded in fwb_migrations and skipped.
import fs from 'node:fs'; import path from 'node:path'; import pg from 'pg';
const url = process.env.FWB_DB_URL; if (!url) { console.error('Set FWB_DB_URL to the database connection string.'); process.exit(1); }
const dir = path.resolve(new URL('..', import.meta.url).pathname, 'netlify/database/migrations');
const c = new pg.Client({ connectionString: url }); await c.connect();
try {
  await c.query('CREATE TABLE IF NOT EXISTS fwb_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await c.query('SELECT name FROM fwb_migrations')).rows.map(r => r.name));
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.sql')).sort()) {
    if (done.has(f)) { console.log('skip   ', f); continue; }
    await c.query('BEGIN'); try { await c.query(fs.readFileSync(path.join(dir, f), 'utf8')); await c.query('INSERT INTO fwb_migrations(name) VALUES ($1)', [f]); await c.query('COMMIT'); console.log('applied', f); } catch (e) { await c.query('ROLLBACK'); throw new Error(f + ': ' + e.message); }
  }
} finally { await c.end(); }
