// Local full-stack server for development and tests: local Postgres (Netlify Database dev engine) + local file store + static dist.
// Usage: node scripts/devserver.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { NetlifyDB } from '@netlify/database-dev';
const port = Number(process.argv[2] || 8899);
const root = path.resolve(new URL('..', import.meta.url).pathname);
const dataDir = process.env.FWB_DEV_DATA || fs.mkdtempSync(path.join(os.tmpdir(), 'fwb-dev-'));
const db = new NetlifyDB({ directory: path.join(dataDir, 'pg') });
const cs = await db.start();
await db.applyMigrations(path.join(root, 'netlify/database/migrations'));
Object.assign(process.env, { FWB_DB_URL: cs, FWB_FILE_DIR: path.join(dataDir, 'files'), FWB_DEV: '1' });
const { handle } = await import('../server/api.mjs');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.xlsx': 'application/octet-stream', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const headersFile = fs.existsSync(path.join(root, 'public/_headers')) ? fs.readFileSync(path.join(root, 'public/_headers'), 'utf8') : '';
const staticHeaders = Object.fromEntries(((headersFile.split(/^\/(?!\*)/m)[0]).match(/^\s{2}[A-Za-z-]+: .*$/gm) || []).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c); const buf = Buffer.concat(chunks);
      const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : buf }));
      const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let f = path.join(root, 'dist', decodeURIComponent(url.pathname)); if (!f.startsWith(path.join(root, 'dist'))) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'dist/index.html');
    res.writeHead(200, Object.assign({ 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }, staticHeaders)); fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); res.writeHead(500); res.end('dev server error'); }
}).listen(port, '127.0.0.1', () => console.log(`FWB dev server http://127.0.0.1:${port} (data: ${dataDir})`));
process.on('SIGTERM', async () => { await db.stop(); process.exit(0); });
