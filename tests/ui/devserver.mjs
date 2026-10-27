// Local preview server for UI testing: serves dist/ and runs the real server function (work/server/api.mjs)
// against an in-memory mock of the facilio.work platform (verified viewer, db, private files, llm).
// The signed-in person is taken from the `dev_user` cookie (default: the platform owner).
// Usage: node tests/ui/devserver.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import handler from '../../work/server/api.mjs';
const here = path.dirname(new URL(import.meta.url).pathname); const dist = process.env.DIST || path.join(here, '..', '..', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const store = new Map(), blobs = new Map(); let fileSeq = 0;
// FAKE_CLAUDE=1: a local test double for Anthropic, so the image-to-flow review can be exercised without a key. It returns a fixed answer that
// includes an edge to a missing node and markup in a label, which the server must strip. It is never used by the deployed app.
const FAKE_CLAUDE = process.env.FAKE_CLAUDE === '1';
if (FAKE_CLAUDE) { const real = globalThis.fetch; globalThis.fetch = async (url, o) => { if (String(url).startsWith('https://api.anthropic.com/')) {
  const body = JSON.parse(o.body || '{}'); const hasImage = JSON.stringify(body.messages || []).includes('"type":"image"');
  const graph = { title: 'Work order approval', nodes: [{ id: 'n1', label: 'Submitted', kind: 'start', confidence: 'detected' }, { id: 'n2', label: 'Approval needed?', kind: 'decision', confidence: 'detected' }, { id: 'n3', label: 'Approved <script>alert(1)</script>', kind: 'state', confidence: 'inferred' }, { id: 'n4', label: '', kind: 'state', confidence: 'detected' }, { id: 'n5', label: 'Closed', kind: 'end', confidence: 'detected' }],
    edges: [{ from: 'n1', to: 'n2', label: '', confidence: 'detected' }, { from: 'n2', to: 'n3', label: 'Yes', confidence: 'detected' }, { from: 'n2', to: 'n4', label: 'No', confidence: 'uncertain' }, { from: 'n3', to: 'n5', label: 'Complete', confidence: 'detected' }, { from: 'n4', to: 'n9', label: 'ghost', confidence: 'detected' }], notes: 'One box at the bottom left was too blurry to read.' };
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: (hasImage ? '' : 'NO IMAGE ') + 'Here is the flow: ' + JSON.stringify(graph) }], usage: { input_tokens: 900, output_tokens: 300 } }) }; } return real(url, o); }; }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.dat': 'application/octet-stream', '.xlsx': 'application/octet-stream', '.lottie': 'application/json' };
const ctxFor = (email, origin) => ({
  viewer: { email, role: 'viewer' }, app: { name: 'facilio-delivery-studio' },
  secrets: { async get(k) { if (FAKE_CLAUDE && k === 'anthropic_api_key') return 'sk-ant-local-test-double-0000000000'; throw new Error('no secret'); } },
  llm: async ({ messages }) => ({ model: 'mock', choices: [{ message: { content: '## Draft\n\nLocal preview draft based on [S1].\n\n- Confirmed: sample point\n- Assumption: sample point' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: new Date().toISOString(), updated_by: email } : null; },
    async put(c, k, v) { if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const m = store.get(c) || new Map(); const keys = [...m.keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(m.get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async uploadUrl() { const id = 'f' + (++fileSeq); return { url: origin + '/__files/' + id, file_id: id }; }, async url(id) { return { url: origin + '/__files/' + id }; } }
});
const body = req => new Promise(res => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => res(Buffer.concat(ch))); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost'); const origin = 'http://' + req.headers.host;
  try {
    if (u.pathname.startsWith('/__files/')) { const id = u.pathname.slice(9); if (req.method === 'PUT') { blobs.set(id, await body(req)); res.writeHead(200); return res.end(); } const b = blobs.get(id); res.writeHead(b ? 200 : 404); return res.end(b || ''); }
    if (u.pathname.startsWith('/api/fn/api')) {
      const email = decodeURIComponent((/(?:^|;\s*)dev_user=([^;]+)/.exec(req.headers.cookie || '') || [])[1] || 'dinesh.r@facilio.com');
      const raw = (await body(req)).toString('utf8');
      const r = await handler({ method: req.method, path: u.pathname.replace('/api/fn/api', '') || '/', query: u.search.slice(1), headers: req.headers, text: async () => raw, json: async () => (raw ? JSON.parse(raw) : undefined) }, ctxFor(email, origin));
      res.writeHead(r.status, { 'content-type': 'application/json' }); return res.end(await r.text());
    }
    let p = path.join(dist, decodeURIComponent(u.pathname)); if (u.pathname === '/' || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dist, 'index.html');
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  } catch (e) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
}).listen(port, () => console.log('preview on http://localhost:' + port));
