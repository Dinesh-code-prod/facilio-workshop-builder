// Local preview of the facilio.work build: serves dist/ and runs the real server function (work/server/api.mjs)
// against an in-memory stand-in for the platform (signed-in viewer, app database, file links).
// Data lives only while the process runs. Not used in production.
//   npm run build && node tools/devserver.mjs [--port 8787] [--as someone@facilio.com] [--seed]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../work/server/api.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.join(here, '..', 'dist');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('--port', 8787); let VIEWER = arg('--as', 'dinesh.r@facilio.com');
const store = new Map();
const ctx = () => ({
  viewer: { email: VIEWER, role: 'viewer' }, app: { name: 'fwb' },
  secrets: { async get() { throw new Error('no secret in local preview'); } },
  llm: async ({ messages }) => ({ model: 'local', choices: [{ message: { content: '## Draft (local preview)\nThis text stands in for an AI draft. ' + String(messages[1] && messages[1].content || '').slice(0, 80) } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 50)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async uploadUrl() { return { url: `http://localhost:${PORT}/__blob/` + Date.now(), file_id: 'f' + Date.now() }; }, async url(id) { return { url: `http://localhost:${PORT}/__blob/` + id }; } }
});
const api = async (method, p, body, as) => { const prev = VIEWER; if (as) VIEWER = as; const [sub, q] = p.split('?'); const r = await handler({ method, path: sub.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => body === undefined ? '' : JSON.stringify(body), json: async () => body }, ctx()); VIEWER = prev; return { status: r.status, data: await r.json() }; };

// a small, realistic starting portfolio so every page has something to show
async function seed() {
  const mk = async (b) => (await api('POST', '/api/projects', b)).data.project.id;
  const a = await mk({ name: 'Al Moallam', customer: 'Al Moallam', description: 'CAFM rollout for three commercial towers', startDate: '2026-09-14', endDate: '2027-01-20' });
  await mk({ name: 'ZZ Walkthrough Test', customer: 'ZZ Test Customer', description: 'Throwaway for testing' });
  const put = (doc, data) => api('PUT', `/api/projects/${a}/docs/${doc}`, { data, baseVersion: 0 });
  await put('people', { team: [{ name: 'Dinesh Rana', role: 'Project lead', email: 'dinesh.r@facilio.com' }, { name: 'Asha Kumar', role: 'Implementation consultant', email: 'asha.k@facilio.com' }], stakeholders: [{ name: 'Omar Haddad', role: 'Facilities director', email: 'omar@example.com' }] });
  await put('planner', { scope: ['Work Orders', 'Assets', 'Spaces', 'Preventive Maintenance', 'Inventory'], sessions: [
    { id: 's1', no: 1, title: 'Work orders and service requests', date: '2026-10-28', start: '10:00', status: 'planned', modules: ['Work Orders'] },
    { id: 's2', no: 2, title: 'Assets and spaces', date: '2026-10-30', start: '11:00', status: 'planned', modules: ['Assets', 'Spaces'] },
    { id: 's0', no: 0, title: 'Kick-off', date: '2026-09-16', start: '10:00', status: 'completed', modules: [] }] });
  for (const [k, id, d] of [['action', 'a1', { title: 'Share asset register template', owner: 'Customer', status: 'Open', due: '2026-10-23' }], ['action', 'a2', { title: 'Confirm site list', owner: 'Facilio', status: 'Open', due: '2026-11-02' }], ['raid', 'r1', { title: 'Key user availability in November', type: 'Risk', status: 'Open', severity: 'Medium' }]])
    await api('PUT', `/api/projects/${a}/items/${k}/${id}`, { data: d });
}

const MIME = { js: 'application/javascript', css: 'text/css', html: 'text/html; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', json: 'application/json', dat: 'application/octet-stream', woff2: 'font/woff2', mp4: 'video/mp4' };
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/fn/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks).toString();
      const r = await handler({ method: req.method, path: u.pathname.replace('/api/fn/api', ''), query: u.search.slice(1), headers: req.headers, text: async () => raw, json: async () => (raw ? JSON.parse(raw) : undefined) }, ctx());
      res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(await r.text()); return;
    }
    if (u.pathname.startsWith('/__blob/')) { if (req.method === 'PUT') { for await (const _ of req); res.writeHead(200); res.end(); return; } res.writeHead(404); res.end(); return; }
    let f = path.join(dist, decodeURIComponent(u.pathname)); if (!f.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
    res.writeHead(200, { 'content-type': MIME[f.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
}).listen(PORT, async () => { if (process.argv.includes('--seed')) await seed(); console.log(`Local preview on http://localhost:${PORT} (signed in as ${VIEWER})`); });
