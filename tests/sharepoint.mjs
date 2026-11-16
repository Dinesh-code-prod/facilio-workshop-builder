// SharePoint project folders (work/server/_sharepoint.mjs) against a stand-in Microsoft Graph and storage: folder and subfolder, access for members,
// the copy in 10 MB pieces across 16 MB stored parts, one file per document (same content is not saved again, a new save is a version), and nothing without set-up.
import assert from 'node:assert/strict';
import handler from '../work/server/api.mjs';
import { subfolderOf, safeName, folderName, docKeyOf } from '../work/server/_sharepoint.mjs';
const store = new Map(), fileStore = new Map(); let seq = 0; let SITE = '';
const graphLog = [], puts = []; let perm = 0;
const items = new Map(); // "parent|name" -> id
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get(k) { if (k === 'sharepoint_site' && SITE) return SITE; throw new Error('no secret'); } },
  llm: async () => ({ choices: [{ message: { content: '' } }] }),
  async fetch(cred, url, init) {   // stand-in Microsoft Graph
    assert.equal(cred, 'graph_files'); const body = init.body ? JSON.parse(init.body) : null; graphLog.push([init.method, url.replace('https://graph.microsoft.com/v1.0', ''), body]);
    const res = (status, j) => ({ status, ok: status < 300, json: async () => j, text: async () => JSON.stringify(j) });
    let m;
    if (/\/sites\/acme\.sharepoint\.com:\/sites\/DS$/.test(url)) return res(200, { id: 'site1' });
    if (/\/sites\/site1\/drive$/.test(url)) return res(200, { id: 'drv', webUrl: 'https://acme.sharepoint.com/sites/DS/Shared Documents' });
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+)\/children$/))) { const k = m[1] + '|' + body.name; if (items.has(k)) return res(409, {}); const id = 'it' + items.size; items.set(k, id); return res(201, { id, name: body.name, webUrl: 'https://acme.sharepoint.com/sites/DS/' + encodeURIComponent(body.name) }); }
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+):\/([^:]+)$/)) && init.method === 'GET') return res(200, { id: items.get(m[1] + '|' + decodeURIComponent(m[2])) });
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+):\/([^:]+):\/createUploadSession$/))) return res(200, { uploadUrl: 'https://acme.sharepoint.com/upload/' + encodeURIComponent(decodeURIComponent(m[2])) + '?c=' + body.item['@microsoft.graph.conflictBehavior'] });
    if (/\/invite$/.test(url)) return res(200, { value: [{ id: 'perm' + (++perm), roles: body.roles }] });
    if (/\/permissions\//.test(url) && init.method === 'DELETE') return res(204, null);
    return res(404, { error: { message: 'unexpected ' + url } });
  },
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r) } : null; },
    async put(c, k, v) { const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl(n) { const id = 'f' + (++seq); fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; },
    async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { bytes: async () => b, text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
// storage reads (with Range) and SharePoint upload pieces
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.startsWith('https://storage.example/get/')) { const b = fileStore.get(url.split('/').pop()) || Buffer.alloc(0); const m = /bytes=(\d+)-(\d+)/.exec((init.headers || {}).range || ''); const part = m ? b.subarray(+m[1], +m[2] + 1) : b; return new Response(part, { status: m ? 206 : 200 }); }
  if (url.startsWith('https://acme.sharepoint.com/upload/')) { const [, a, z, total] = /bytes (\d+)-(\d+)\/(\d+)/.exec(init.headers['content-range']); puts.push({ url, a: +a, z: +z, total: +total, body: Buffer.from(init.body) });
    return +z + 1 === +total ? new Response(JSON.stringify({ id: 'doc1', webUrl: 'https://acme.sharepoint.com/sites/DS/' + decodeURIComponent(url.split('/upload/')[1].split('?')[0]) }), { status: 201 }) : new Response('{}', { status: 202 }); }
  throw new Error('unexpected fetch ' + url);
};
const me = 'sam.k@facilio.com';
const call = async (method, path, body, who) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(who || me)); return { status: r.status, data: await r.json() }; };
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

assert.equal(subfolderOf('export', { view: 'brd' }), '03 BRD'); assert.equal(subfolderOf('export', { view: 'guidesList' }), '05 Guides and training'); assert.equal(subfolderOf('uat_evidence'), '07 UAT and FTR'); assert.equal(subfolderOf('whatever'), 'Other');
assert.equal(safeName('A/B: "x"?.'), 'A-B- -x--'); assert.equal(folderName({ id: 'p_123456789', name: 'CAFM', customer: 'Al Moallam' }), 'Al Moallam – CAFM (456789)');
assert.equal(docKeyOf('uat_evidence', 'a.png'), ''); assert.equal(docKeyOf('export', 'BRD.DOCX', { view: 'brd' }), 'export|brd|brd.docx');
console.log('  ok  subfolders, safe names and document keys');

const pid = (await call('POST', '/api/projects', { name: 'CAFM', customer: 'Al Moallam' })).data.project.id;
const ravi = (await call('POST', `/api/projects/${pid}/members`, { email: 'ravi.m@facilio.com', role: 'viewer' })).data.member.id;
// an upload the way the page does it: ask, store the parts, complete
async function upload(name, category, bytes, meta) {
  const init = await call('POST', `/api/projects/${pid}/files`, { category, name, mime: 'application/octet-stream', size: bytes.length, meta });
  if (init.data.existing) return init.data;
  for (let i = 0; i < init.data.chunks; i++) { const u = await call('POST', `/api/projects/${pid}/files/${init.data.id}/chunks/${i}/url`, {}); fileStore.set(u.data.fileId, bytes.subarray(i * init.data.chunkSize, (i + 1) * init.data.chunkSize)); await call('PUT', `/api/projects/${pid}/files/${init.data.id}/chunks/${i}`, { fileId: u.data.fileId }); }
  return (await call('POST', `/api/projects/${pid}/files/${init.data.id}/complete`, {})).data;
}
async function copy(fid) { const s = await call('POST', `/api/projects/${pid}/files/${fid}/sharepoint`, {}); assert.equal(s.status, 200, JSON.stringify(s.data)); let last; for (let i = 0; i < s.data.parts; i++) last = await call('POST', `/api/projects/${pid}/files/${fid}/sharepoint`, { part: i }); return { parts: s.data.parts, last: last.data }; }

await t('without set-up nothing is copied and the page is told so', async () => {
  const r = await call('GET', `/api/projects/${pid}/sharepoint`); assert.equal(r.data.configured, false); assert.equal(r.data.pending.length, 0);
});
SITE = 'https://acme.sharepoint.com/sites/DS';
const big = Buffer.alloc(25 * 1024 * 1024); for (let i = 0; i < big.length; i++) big[i] = (i * 7 + (i >> 11)) & 255; big.set([0x50, 0x4B, 3, 4]);   // a .docx starts like a ZIP (the upload checks it)
let f1;
await t('a 25 MB export goes to the project folder, subfolder 03 BRD, in three pieces that match the file', async () => {
  f1 = (await upload('Al_Moallam_BRD_V10_DRAFT.docx', 'export', big, { view: 'brd', hash: 'h1' })).file;
  const pend = await call('GET', `/api/projects/${pid}/sharepoint`); assert.equal(pend.data.configured, true); assert.deepEqual(pend.data.pending.map(x => x.id), [f1.id]);
  const r = await copy(f1.id); assert.equal(r.parts, 3); assert.equal(r.last.done, true); assert.equal(r.last.folder, '03 BRD'); assert.match(r.last.url, /Al_Moallam_BRD_V10_DRAFT\.docx$/);
  assert.equal(Buffer.concat(puts.map(p => p.body)).compare(big), 0, 'the pieces put together are the file'); assert.deepEqual(puts.map(p => p.a), [0, 10485760, 20971520]);
  assert.ok(puts[0].url.includes('c=replace'), 'a document overwrites its earlier version');
  assert.ok(items.has('root|Al Moallam – CAFM (' + pid.slice(-6) + ')') && [...items.keys()].some(k => k.endsWith('|03 BRD')));
  const pend2 = await call('GET', `/api/projects/${pid}/sharepoint`); assert.equal(pend2.data.pending.length, 0); assert.match(pend2.data.folder.url, /sharepoint\.com/);
  const fl = await call('GET', `/api/projects/${pid}/files?category=export`); assert.match(fl.data.files[0].sp.url, /sharepoint\.com/); assert.ok(!JSON.stringify(fl.data).includes('/upload/'), 'the upload link never leaves the server');
});
await t('the folder is shared with the members: owners edit, viewers read; nobody else', async () => {
  const inv = graphLog.filter(g => g[1].endsWith('/invite')).map(g => [g[2].recipients[0].email, g[2].roles[0], g[2].sendInvitation]);
  assert.deepEqual(inv.sort(), [['ravi.m@facilio.com', 'read', false], ['sam.k@facilio.com', 'write', false]]);
});
await t('the same export again is not saved; a changed one is the next version, not a copy', async () => {
  const same = await upload('Al_Moallam_BRD_V10_DRAFT.docx', 'export', big, { view: 'brd', hash: 'h1' }); assert.equal(same.existing, true); assert.equal(same.id, f1.id);
  const v2 = (await upload('Al_Moallam_BRD_V10_DRAFT.docx', 'export', Buffer.from('PK second version'), { view: 'brd', hash: 'h2' })).file;
  const all = await call('GET', `/api/projects/${pid}/files?category=export&versions=1`); const cur = (await call('GET', `/api/projects/${pid}/files?category=export`)).data.files;
  assert.equal(cur.length, 1); assert.equal(cur[0].id, v2.id); assert.equal(all.data.files.length, 2, 'the first one stays as an earlier version');
  puts.length = 0; const r = await copy(v2.id); assert.equal(r.parts, 1); assert.ok(puts[0].url.includes('c=replace') && puts[0].url.includes('Al_Moallam_BRD_V10_DRAFT.docx'));
});
await t('two people saving at the same moment still leave one current file', async () => {
  const a = await call('POST', `/api/projects/${pid}/files`, { category: 'export', name: 'Plan.xlsx', size: 4, meta: { view: 'plan', hash: 'x' } });
  const b = await call('POST', `/api/projects/${pid}/files`, { category: 'export', name: 'Plan.xlsx', size: 4, meta: { view: 'plan', hash: 'y' } });
  for (const id of [a.data.id, b.data.id]) { const u = await call('POST', `/api/projects/${pid}/files/${id}/chunks/0/url`, {}); fileStore.set(u.data.fileId, Buffer.from('PK\u0003\u0004')); await call('PUT', `/api/projects/${pid}/files/${id}/chunks/0`, { fileId: u.data.fileId }); }
  await call('POST', `/api/projects/${pid}/files/${b.data.id}/complete`, {}); await call('POST', `/api/projects/${pid}/files/${a.data.id}/complete`, {});
  const cur = (await call('GET', `/api/projects/${pid}/files?category=export`)).data.files.filter(f => f.name === 'Plan.xlsx'); assert.equal(cur.length, 1);
});
await t('evidence with the same name is two files, never overwritten', async () => {
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 1, 2, 3]);
  const e1 = (await upload('image.png', 'uat_evidence', png, {})).file, e2 = (await upload('image.png', 'uat_evidence', png, {})).file; assert.notEqual(e1.id, e2.id);
  puts.length = 0; await copy(e1.id); await copy(e2.id); assert.ok(puts.every(p => p.url.includes('c=rename')));
});
await t('a member removed from the project loses the folder', async () => {
  const uid = ravi;
  const before = graphLog.length; await call('DELETE', `/api/projects/${pid}/members/${uid}`);
  assert.ok(graphLog.slice(before).some(g => g[0] === 'DELETE' && /\/permissions\/perm/.test(g[1])));
  const r = await call('GET', `/api/projects/${pid}/sharepoint`); assert.equal(r.data.folder.people, 1);
});
await t('the connector overview names the project folder', async () => {
  const r = await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': 'project_overview' }, text: async () => JSON.stringify({ project: pid }) }, mkctx(me));
  const j = await r.json(); assert.match(j.sharepointFolder.url, /sharepoint\.com/);
});
console.log(n + ' SharePoint checks passed');
