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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.dat': 'application/octet-stream', '.xlsx': 'application/octet-stream', '.lottie': 'application/json' };
// FAKE_GRAPH=1: a local stand-in for the delivery mailbox (Microsoft Graph) and for Teams, so the project Inbox can be exercised in a browser.
// Never part of the deployed app. Teams notices are kept in memory and listed at /__teams.
const FAKE_GRAPH = process.env.FAKE_GRAPH === '1'; const TEAMS_LOG = [];
const fakeMail = () => { const h = n => new Date(Date.now() - n * 3600e3).toISOString(); const M = (id, from, name, subject, body, o = {}) => ({ id, conversationId: o.conv || id, subject, from: { emailAddress: { name, address: from } }, toRecipients: [{ emailAddress: { name: 'Acme delivery', address: o.to || 'acme-delivery@facilio.com' } }], ccRecipients: o.cc ? [{ emailAddress: { name: 'PM', address: o.cc } }] : [], body: { contentType: 'text', content: body }, bodyPreview: body.slice(0, 200), receivedDateTime: h(o.ago || 1), hasAttachments: !!o.att, isDraft: false, webLink: 'https://outlook.office365.com/owa/?ItemID=' + id });
  return [M('G1', 'priya@acme-facilities.com', 'Priya Nair', 'Kick-off agenda and attendee list', 'Hi team,\n\nPlease find the agenda for Thursday attached. We will have the facilities heads from both sites.\n\n<b>Thanks</b>,\nPriya', { conv: 'CV1', att: true, ago: 30, cc: 'pm@facilio.com' }),
    M('G2', 'dinesh.r@facilio.com', 'Dinesh R', 'Re: Kick-off agenda and attendee list', 'Thanks Priya, confirmed. We will share the workshop plan by Wednesday.', { conv: 'CV1', ago: 28, to: 'priya@acme-facilities.com' }),
    M('G3', 'omar@acme-facilities.com', 'Omar Haddad', 'Asset register: which template should we use?', 'Hello,\nWe have 4,200 assets in our current system. Should we use the onboarding template or send our own export?\n\nRegards,\nOmar', { ago: 5 }),
    M('G4', 'unknown.vendor@example.net', 'Vendor', 'Partnership opportunity', 'Hello, we offer IoT sensors...', { ago: 2, to: 'support@facilio.com' })]; };
const fakeGraph = async (cred, url) => { if (/\/attachments\/[^/]+\/\$value/.test(url)) return { ok: true, status: 200, body: Buffer.from('%PDF-1.4 local test attachment').toString('base64') };
  if (/\/attachments\?/.test(url)) return { ok: true, status: 200, json: async () => ({ value: [{ id: 'AT1', name: 'Kick-off agenda.pdf', size: 48213, contentType: 'application/pdf' }, { id: 'AT2', name: 'Site photos.zip', size: 8.2e6, contentType: 'application/zip' }] }) };
  if (/\/messages\/G1\?/.test(url)) return { ok: true, status: 200, json: async () => ({ id: 'G1', webLink: 'https://outlook.office365.com/owa/?ItemID=G1' }) };
  if (/\/messages\/[^?]+\?/.test(url)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => ({ value: fakeMail() }) }; };
const ctxFor = (email, origin) => ({
  viewer: { email, role: 'viewer' }, app: { name: 'facilio-delivery-studio' },
  secrets: { async get(k) { if (FAKE_CLAUDE && k === 'anthropic_api_key') return 'sk-ant-local-test-double-0000000000'; if (FAKE_GRAPH && k === 'support_mailbox') return 'delivery@facilio.com'; throw new Error('no secret'); } },
  ...(FAKE_GRAPH ? { fetch: fakeGraph, teams: { async send(m) { TEAMS_LOG.push(Object.assign({ at: new Date().toISOString() }, m)); return { delivered: 1, failed: 0 }; } } } : {}),
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
    if (u.pathname === '/__teams' && FAKE_GRAPH) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(TEAMS_LOG)); }
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
