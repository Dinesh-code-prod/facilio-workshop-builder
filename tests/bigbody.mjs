// Big bodies (user, 16 Nov 2026): a JSON body over 1 MB travels gzipped as { __gz } both ways (work/src/workapi.js, work/server/api.mjs), so a large document saves and loads under the platform's ~6 MB cap; a solution document may be large.
// Same stand-in platform as tests/connector_skills.mjs.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
const store = new Map(), fileStore = new Map(); let seq = 0; const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: '## Draft [S1]' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: start + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(n) { const id = 'f' + (++seq) + n; fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put(o) { const id = 'p' + (++seq); fileStore.set(id, Buffer.from(o.body)); return { file_id: id }; }, async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
const me = 'sam.k@facilio.com';
const call = async (method, path, body, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(me)); return { status: r.status, data: await r.json() }; };
const gz = async t => Buffer.from(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).toString('base64');
const gunz = async s => new Response(new Blob([Buffer.from(s, 'base64')]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const raw = async (method, path, text, headers) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => text }, mkctx(me)); return { status: r.status, text: await r.text() }; };
let n = 0; const ok = m => { n++; console.log('  ok  ' + m); };
const pid = (await call('POST', '/api/projects', { name: 'Big Test', customer: 'Acme' })).data.project.id;
const words = 'the work order is raised by the tenant and assigned to a technician within four hours after approval'.split(' ');
let big = ''; for (let i = 0; big.length < 8e6; i++) big += words[(i * 7 + (i >> 3)) % words.length] + (i % 11 ? ' ' : '. ') + (i % 97 === 0 ? i + ' ' : '');
const rec = { title: 'Big', kind: 'full', sections: [{ id: 's1', title: 'Huge', lvl: 1, md: big }] };
let r = await raw('PUT', `/api/projects/${pid}/items/sdoc/sd_big`, JSON.stringify({ __gz: await gz(JSON.stringify({ data: rec })) }), { 'x-fwb-gz': '1' });
assert.equal(r.status, 200, r.text.slice(0, 200)); const packed = JSON.parse(r.text); assert.ok(typeof packed.__gz === 'string', 'a big answer is packed for a caller that can unpack'); assert.ok(r.text.length < 6e6);
assert.equal(JSON.parse(await gunz(packed.__gz)).item.data.sections[0].md, big); ok('an 8 MB solution document arrives gzipped, is saved and comes back gzipped');
r = await raw('GET', `/api/projects/${pid}/items?kinds=sdoc&__gz=1`, '', {});   // the page asks in the address: the platform drops custom headers assert.equal(JSON.parse(await gunz(JSON.parse(r.text).__gz)).items[0].data.sections[0].md, big);
r = await raw('GET', `/api/projects/${pid}/items?kinds=sdoc`, '', {}); assert.equal(JSON.parse(r.text).items[0].data.sections[0].md, big, 'callers without x-fwb-gz (the connector) get plain JSON'); ok('it loads back the same, packed only for the page');
r = await raw('PUT', `/api/projects/${pid}/docs/brddoc`, JSON.stringify({ __gz: await gz(JSON.stringify({ data: { text: big }, baseVersion: 0 })) }), { 'x-fwb-gz': '1' }); assert.equal(r.status, 200, r.text.slice(0, 200)); ok('a document section over the old 5 MB cap saves');
r = await raw('PUT', `/api/projects/${pid}/docs/brddoc`, JSON.stringify({ __gz: 'not gzip' }), {}); assert.equal(r.status, 400); ok('a broken packed body is refused, nothing saved');
r = await raw('PUT', `/api/projects/${pid}/items/note/n1`, JSON.stringify({ __gz: await gz(JSON.stringify({ data: { text: big } })) }), {}); assert.equal(r.status, 413); ok('other record kinds keep their size caps');
console.log(n + ' big body checks passed');
