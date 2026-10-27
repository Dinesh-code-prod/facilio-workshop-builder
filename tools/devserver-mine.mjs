// Local development server: serves dist/ and runs the real server function (work/server/api.mjs) against an in-memory store.
// The signed-in person is set by DEV_USER (default dinesh.r@facilio.com). This exists only for local testing and screenshots:
// it is not part of the deployed app and does not touch production data or access rules.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import handler from '../work/server/api.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'); const port = Number(process.env.PORT || 8141);
const store = new Map(), blobs = new Map(); const user = () => process.env.DEV_USER || 'dinesh.r@facilio.com';
globalThis.__sent = [];
const ctx = () => ({ viewer: { email: user(), role: 'owner' }, app: { name: 'fwb-dev' }, teams: { async send(m) { globalThis.__sent.push(m); return { delivered: 1, failed: 0 }; } },
  secrets: { async get(k) { if (k === 'teams_notify' && process.env.DEV_TEAMS) return 'on'; throw new Error('no secret'); } }, llm: async () => { throw Object.assign(new Error('AI is not available in the local test server'), { status: 503 }); },
  db: { async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r) } : null; }, async put(c, k, v) { if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); }, async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const s = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (s < 0) return { items: [] }; const page = keys.slice(s, s + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: s + page.length < keys.length ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl() { const id = 'f' + blobs.size + Date.now(); blobs.set(id, null); return { url: `http://localhost:${port}/__blob/${id}`, file_id: id }; }, async url(id) { return { url: `http://localhost:${port}/__blob/${id}` }; } } });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.dat': 'application/octet-stream', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);
  if (u.pathname.startsWith('/__blob/')) { const id = u.pathname.slice(8); if (req.method === 'PUT') { blobs.set(id, body); res.writeHead(200); return res.end(); } const b = blobs.get(id); if (!b) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(b); }
  if (u.pathname === '/__dev/sent') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(globalThis.__sent)); }
  if (u.pathname === '/__dev/user') { process.env.DEV_USER = u.searchParams.get('email') || 'dinesh.r@facilio.com'; res.writeHead(200); return res.end('ok'); }
  if (u.pathname.startsWith('/api/fn/api')) {
    const text = body.toString(); const r = await handler({ method: req.method, path: u.pathname.slice('/api/fn/api'.length) || '/', query: u.search.slice(1), headers: {}, text: async () => text, json: async () => (text ? JSON.parse(text) : undefined) }, ctx());
    res.writeHead(r.status, { 'content-type': 'application/json' }); return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('dev server http://localhost:' + port));
