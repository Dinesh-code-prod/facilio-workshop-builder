// Tests src/runapi.js (the Facilio Run backend) against a mock of Facilio Run's /api/me, /api/db and /api/uploads that enforces
// the documented rules: key format, 128 KB per value, list pages of at most 200 with a cursor, same-origin only.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm';

const EMAIL = process.env.TEST_EMAIL || 'priya.n@facilio.com';
const store = new Map(); // "collection" -> Map(key -> {value, updated_at})
const files = new Map(); let calls = 0, maxValueSeen = 0;
const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
async function mockFetch(input, init = {}) {
  calls++; const u = new URL(String(input), 'https://fwb-test.facilio.run'); const m = (init.method || 'GET').toUpperCase();
  if (u.pathname === '/api/me') return json({ email: EMAIL, site: 'fwb-test', site_url: 'https://fwb-test.facilio.run' });
  if (u.pathname === '/api/uploads' && m === 'POST') { const id = Math.random().toString(36).slice(2); return json({ url: 'https://s3.mock/put/' + id, file_url: '/files/' + id }); }
  if (u.hostname === 's3.mock' && m === 'PUT') { files.set(u.pathname.split('/').pop(), Buffer.from(await new Response(init.body).arrayBuffer())); return new Response('', { status: 200 }); }
  if (u.pathname.startsWith('/files/')) { const b = files.get(u.pathname.split('/').pop()); return b ? new Response(b) : new Response('', { status: 404 }); }
  const mm = /^\/api\/db\/([^/]+)(?:\/(.+))?$/.exec(u.pathname); if (!mm) return json({ error: 'nope' }, 404);
  const col = decodeURIComponent(mm[1]), key = mm[2] ? decodeURIComponent(mm[2]) : null;
  if (!KEY_RE.test(col) || (key && !KEY_RE.test(key))) return json({ error: 'bad key ' + col + '/' + key }, 400);
  const c = store.get(col) || new Map();
  if (key === null && m === 'GET') {
    const limit = Math.min(200, Number(u.searchParams.get('limit') || 50)); const keys = [...c.keys()].sort(); const cur = u.searchParams.get('cursor'); const start = cur ? keys.findIndex(k => k > cur) : 0;
    const page = start < 0 ? [] : keys.slice(start, start + limit); const more = start >= 0 && start + limit < keys.length;
    return json({ items: page.map(k => ({ key: k, value: c.get(k).value, updated_at: c.get(k).updated_at })), cursor: more ? page[page.length - 1] : '' });
  }
  if (key === null) return json({ error: 'method' }, 405);
  if (m === 'GET') return c.has(key) ? json({ key, value: c.get(key).value, updated_at: c.get(key).updated_at, updated_by: EMAIL }) : json({ error: 'not found' }, 404);
  if (m === 'PUT') { const body = JSON.parse(init.body); const sz = Buffer.byteLength(JSON.stringify(body.value)); maxValueSeen = Math.max(maxValueSeen, sz); if (sz > 128 * 1024) return json({ error: 'too large' }, 413); c.set(key, { value: body.value, updated_at: new Date().toISOString() }); store.set(col, c); return json({ ok: true }); }
  if (m === 'DELETE') { c.delete(key); return json({ ok: true }); }
  return json({ error: 'method' }, 405);
}
// load the browser module in a sandbox-like global
globalThis.fetch = mockFetch; globalThis.window = globalThis; globalThis.location = { origin: 'https://fwb-test.facilio.run' };
vm.runInThisContext(fs.readFileSync(new URL('../src/runapi.js', import.meta.url), 'utf8'));
const R = globalThis.FWBRun; const call = async (m, p, b) => R.handle(m, p, b);
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ok  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n      ' + (e && e.stack || e)); process.exitCode = 1; } };

await t('signed-in identity from Facilio Run, no sign-up needed', async () => {
  const r = await call('GET', '/api/auth/me'); assert.equal(r.status, 200); assert.equal(r.data.user.email, EMAIL); assert.equal(r.data.user.name, 'Priya N'); assert.equal(r.data.user.kind, 'consultant'); assert.equal(r.data.user.adminRole, null); assert.equal(r.data.signupEnabled, false);
});
let pid;
await t('create a project, list it, open it', async () => {
  const c = await call('POST', '/api/projects', { name: 'Acme CAFM', customer: 'Acme Ltd', team: [{ name: 'A' }], stakeholders: [] }); assert.equal(c.status, 201); pid = c.data.project.id; assert.equal(c.data.project.role, 'owner');
  const l = await call('GET', '/api/projects'); assert.equal(l.data.projects.length, 1); assert.equal(l.data.projects[0].name, 'Acme CAFM');
  const o = await call('GET', `/api/projects/${pid}/open?sections=people,brd&kinds=all`); assert.equal(o.status, 200); assert.deepEqual(o.data.docs.people.data.team, [{ name: 'A' }]); assert.equal(o.data.docs.brd.version, 0); assert.equal(o.data.members.length, 1);
});
await t('documents: save, version, conflict, list', async () => {
  let r = await call('PUT', `/api/projects/${pid}/docs/brd`, { data: { a: 1 }, baseVersion: 0 }); assert.equal(r.data.version, 1);
  r = await call('PUT', `/api/projects/${pid}/docs/brd`, { data: { a: 2 }, baseVersion: 1 }); assert.equal(r.data.version, 2);
  r = await call('PUT', `/api/projects/${pid}/docs/brd`, { data: { a: 3 }, baseVersion: 1 }); assert.equal(r.status, 409); assert.match(r.data.error, /Conflict/); assert.equal(r.data.current.version, 2);
  r = await call('PUT', `/api/projects/${pid}/docs/brd`, { data: { a: 3 }, baseVersion: 0 }); assert.equal(r.status, 409);
  r = await call('GET', `/api/projects/${pid}/docs/brd`); assert.deepEqual(r.data.data, { a: 2 }); r = await call('GET', `/api/projects/${pid}/docs`); assert.ok(r.data.sections.find(s => s.section === 'brd' && s.version === 2));
  r = await call('PUT', `/api/projects/${pid}/docs/Bad-Name`, { data: {} }); assert.equal(r.status, 400);
});
await t('large documents (over 128 KB) are split, round-trip exactly, and never exceed the platform limit', async () => {
  const big = { rows: Array.from({ length: 6000 }, (_, i) => ({ id: i, text: 'requirement ' + i + ' ' + globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID() })) }; assert.ok(JSON.stringify(big).length > 600000);
  let r = await call('PUT', `/api/projects/${pid}/docs/transcript`, { data: big, baseVersion: 0 }); assert.equal(r.status, 200);
  r = await call('GET', `/api/projects/${pid}/docs/transcript`); assert.deepEqual(r.data.data, big);
  const small = { x: 1 }; r = await call('PUT', `/api/projects/${pid}/docs/transcript`, { data: small, baseVersion: 1 }); assert.equal(r.data.version, 2);
  r = await call('GET', `/api/projects/${pid}/docs/transcript`); assert.deepEqual(r.data.data, small);
  assert.equal([...(store.get('dp.' + pid) || new Map()).keys()].filter(k => k.startsWith('transcript.')).length, 0, 'old parts removed'); assert.ok(maxValueSeen <= 128 * 1024);
});
await t('items: create, edit with history, conflicts, change-request numbering, delete', async () => {
  let r = await call('PUT', `/api/projects/${pid}/items/action/a1`, { data: { text: 'Send BRD', status: 'Open' } }); assert.equal(r.data.item.version, 1); assert.equal(r.data.item.data.hist[0].event, 'Created');
  r = await call('PUT', `/api/projects/${pid}/items/action/a1`, { data: { text: 'Send BRD', status: 'Done' }, baseVersion: 1 }); assert.equal(r.data.item.version, 2); assert.match(r.data.item.data.hist[1].event, /status → Done/);
  r = await call('PUT', `/api/projects/${pid}/items/action/a1`, { data: { text: 'x' }, baseVersion: 1 }); assert.equal(r.status, 409); assert.equal(r.data.current.version, 2);
  const c1 = await call('PUT', `/api/projects/${pid}/items/cr/c1`, { data: { title: 'One' } }); const c2 = await call('PUT', `/api/projects/${pid}/items/cr/c2`, { data: { title: 'Two' } }); assert.equal(c1.data.item.data.n, 1); assert.equal(c2.data.item.data.n, 2);
  r = await call('GET', `/api/projects/${pid}/items?kinds=action,cr`); assert.equal(r.data.items.length, 3); r = await call('GET', `/api/projects/${pid}/items?kinds=nonsense`); assert.equal(r.status, 400);
  r = await call('PUT', `/api/projects/${pid}/items/bogus/x`, { data: {} }); assert.equal(r.status, 400);
  r = await call('DELETE', `/api/projects/${pid}/items/action/a1`); assert.equal(r.status, 200); r = await call('DELETE', `/api/projects/${pid}/items/action/a1`); assert.equal(r.status, 404);
});
await t('onboarding workbook record (about 1 MB) is stored and returned intact', async () => {
  const json1 = JSON.stringify({ v: 2, cells: Array.from({ length: 30000 }, (_, i) => 'cell ' + i + Math.random()) }); const data = { json: json1, rows: {}, stage: 'prepared' };
  let r = await call('PUT', `/api/projects/${pid}/items/onbws/w1`, { data }); assert.equal(r.status, 200); r = await call('GET', `/api/projects/${pid}/items?kinds=onbws`); assert.equal(r.data.items[0].data.json, json1);
});
await t('members: add by Facilio email only, owner rules', async () => {
  let r = await call('POST', `/api/projects/${pid}/members`, { email: 'friend@gmail.com', role: 'editor' }); assert.equal(r.status, 400);
  r = await call('POST', `/api/projects/${pid}/members`, { email: 'sam.k@facilio.com', role: 'viewer' }); assert.equal(r.status, 201); assert.equal(r.data.member.name, 'Sam K');
  r = await call('GET', `/api/projects/${pid}`); assert.equal(r.data.members.length, 2);
  const me = r.data.members.find(m => m.email === EMAIL); r = await call('DELETE', `/api/projects/${pid}/members/${me.id}`); assert.equal(r.status, 400);
});
await t('files: upload in parts, complete, list, download, replace, delete', async () => {
  const bytes = Buffer.from('PK-fake-xlsx-' + 'x'.repeat(5000)); let r = await call('POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'plan.xlsx', mime: 'application/vnd.ms-excel', size: bytes.length, meta: { sheets: 2 } }); assert.equal(r.status, 201); const f = r.data;
  assert.equal(f.chunks, 1); r = await call('POST', `/api/projects/${pid}/files/${f.id}/complete`); assert.equal(r.status, 400);
  r = await call('PUT', `/api/projects/${pid}/files/${f.id}/chunks/0`, new Uint8Array(bytes)); assert.equal(r.status, 200); r = await call('POST', `/api/projects/${pid}/files/${f.id}/complete`); assert.equal(r.data.file.status, 'ready');
  r = await call('GET', `/api/projects/${pid}/files?category=plan`); assert.equal(r.data.files.length, 1); assert.equal(r.data.files[0].name, 'plan.xlsx');
  r = await call('GET', `/api/projects/${pid}/files/${f.id}/chunks/0`); assert.equal(Buffer.from(r.data).toString(), bytes.toString());
  r = await call('POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'plan.exe', mime: 'x', size: 10 }); assert.equal(r.status, 415);
  r = await call('POST', `/api/projects/${pid}/files`, { category: 'plan', name: 'plan2.xlsx', mime: 'x', size: bytes.length, replaces: f.id }); const f2 = r.data; await call('PUT', `/api/projects/${pid}/files/${f2.id}/chunks/0`, new Uint8Array(bytes)); await call('POST', `/api/projects/${pid}/files/${f2.id}/complete`);
  r = await call('GET', `/api/projects/${pid}/files?category=plan`); assert.equal(r.data.files.length, 1); assert.equal(r.data.files[0].name, 'plan2.xlsx'); r = await call('GET', `/api/projects/${pid}/files?category=plan&versions=1`); assert.equal(r.data.files.length, 2);
  r = await call('DELETE', `/api/projects/${pid}/files/${f2.id}`); assert.equal(r.status, 200); r = await call('GET', `/api/projects/${pid}/files?category=plan`); assert.equal(r.data.files.length, 1);
});
await t('guide answers, feedback and audit trail', async () => {
  let r = await call('PUT', `/api/projects/${pid}/guide-responses`, { key: 'wo:a:q1', value: ['x'] }); assert.equal(r.status, 200); r = await call('PUT', `/api/projects/${pid}/guide-responses`, { key: 'bad key', value: 1 }); assert.equal(r.status, 400);
  r = await call('GET', `/api/projects/${pid}/guide-responses`); assert.equal(r.data.responses.length, 1); assert.equal(r.data.responses[0].authorName, 'Priya N'); r = await call('PUT', `/api/projects/${pid}/guide-responses`, { key: 'wo:a:q1', value: '' }); assert.equal(r.data.deleted, true);
  r = await call('POST', `/api/projects/${pid}/feedback`, { module: 'Work Orders', body: 'Question?' }); assert.equal(r.status, 201); const id = r.data.id; await call('PATCH', `/api/projects/${pid}/feedback/${id}`, { status: 'answered', response: 'Yes' });
  r = await call('GET', `/api/projects/${pid}/feedback`); assert.equal(r.data.items[0].status, 'answered'); r = await call('GET', `/api/projects/${pid}/audit`); assert.ok(r.data.entries.length >= 3);
});
await t('access rules: other people only see projects they belong to; admins see everything; sub-admins are read-only', async () => {
  const mk = async email => { // a second person opens the same site
    const code = fs.readFileSync(new URL('../src/runapi.js', import.meta.url), 'utf8'); const ctx = { fetch: async (u, i) => { const x = new URL(String(u), 'https://fwb-test.facilio.run'); if (x.pathname === '/api/me') return json({ email }); return mockFetch(u, i); }, location: globalThis.location, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, crypto: globalThis.crypto, btoa, atob, URL, console };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx); return ctx.FWBRun; };
  const other = await mk('outsider@facilio.com'); let r = await other.handle('GET', '/api/projects'); assert.equal(r.data.projects.length, 0); r = await other.handle('GET', `/api/projects/${pid}`); assert.equal(r.status, 404); r = await other.handle('PUT', `/api/projects/${pid}/docs/brd`, { data: {} }); assert.equal(r.status, 404);
  const viewer = await mk('sam.k@facilio.com'); r = await viewer.handle('GET', '/api/projects'); assert.equal(r.data.projects[0].role, 'viewer'); r = await viewer.handle('PUT', `/api/projects/${pid}/docs/brd`, { data: {}, baseVersion: -1 }); assert.equal(r.status, 403);
  const boss = await mk('dinesh.r@facilio.com'); r = await boss.handle('GET', '/api/auth/me'); assert.equal(r.data.user.adminRole, 'super'); assert.equal(r.data.user.superAdmin, true); r = await boss.handle('GET', '/api/projects'); assert.equal(r.data.projects.length, 1); assert.equal(r.data.projects[0].role, 'owner');
  r = await boss.handle('PUT', `/api/projects/${pid}/docs/brd`, { data: { by: 'admin' }, baseVersion: -1 }); assert.equal(r.status, 200);
  store.set('grant', new Map([['sub.admin:facilio.com', { value: { role: 'sub' }, updated_at: '' }]])); const sub = await mk('sub.admin@facilio.com'); r = await sub.handle('GET', '/api/projects'); assert.equal(r.data.projects[0].role, 'viewer'); r = await sub.handle('PUT', `/api/projects/${pid}/docs/brd`, { data: {}, baseVersion: -1 }); assert.equal(r.status, 403);
});
await t('archive a project: it disappears; sign-in routes explain Microsoft login', async () => {
  let r = await call('DELETE', `/api/projects/${pid}`); assert.equal(r.status, 200); r = await call('GET', '/api/projects'); assert.equal(r.data.projects.length, 0); r = await call('POST', '/api/auth/login', {}); assert.equal(r.status, 403); assert.match(r.data.error, /Microsoft/);
});
console.log(`\n${n} checks passed, ${calls} storage calls, largest stored record ${(maxValueSeen / 1024).toFixed(1)} KB (limit 128 KB)`);
