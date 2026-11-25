// SharePoint project folders (work/server/_sharepoint.mjs) against a stand-in Microsoft Graph and storage: folder and subfolder, access for members,
// the copy in 10 MB pieces across 16 MB stored parts, one file per document (same content is not saved again, a new save is a version), and nothing without set-up.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import handler from '../work/server/api.mjs';
import { subfolderOf, safeName, folderName, docKeyOf, FOLDERS, indexMarkdown } from '../work/server/_sharepoint.mjs';
const store = new Map(), fileStore = new Map(); let seq = 0; let SITE = '';
const graphLog = [], puts = [], texts = new Map(); let perm = 0;
const items = new Map(); // "parent|name" -> id
// files in the stand-in library (id -> driveItem), upload sessions (upload link -> what arrived so far) and the bytes each file holds
const driveFiles = new Map(), sessions = new Map(), lastBytes = new Map(); let fseq = 0;
const fileItem = (id, name, size, parentId) => ({ id, name, size, parentReference: { id: parentId }, file: { mimeType: 'application/octet-stream' }, webUrl: 'https://acme.sharepoint.com/sites/DS/' + name, eTag: 'e' + (++fseq), createdDateTime: '2026-11-25T10:00:00Z', lastModifiedDateTime: '2026-11-25T10:0' + (fseq % 10) + ':00Z', createdBy: { user: { displayName: 'SharePoint App' } } });
const nameTaken = (parent, name, but) => [...driveFiles.values()].some(f => f.parentReference.id === parent && f.name === name && f.id !== but);
function landFile(s) {   // the last piece arrived: the file appears in its folder (rename makes "name 1.ext", replace overwrites)
  let name = s.name; const old = [...driveFiles.values()].find(f => f.parentReference.id === s.parent && f.name === name);
  if (old && s.c === 'replace') { old.size = s.total; return old; }
  for (let i = 1; nameTaken(s.parent, name); i++) name = s.name.replace(/(\.[^.]+)?$/, ' ' + i + '$1');
  const it = fileItem('file' + (++fseq), name, s.total, s.parent); driveFiles.set(it.id, it); return it;
}
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get(k) { if (k === 'sharepoint_site' && SITE) return SITE; throw new Error('no secret'); } },
  llm: async () => ({ choices: [{ message: { content: '' } }] }),
  async fetch(cred, url, init) {   // stand-in Microsoft Graph
    assert.equal(cred, 'graph_files'); const isJson = /json/.test((init.headers || {})['content-type'] || ''); const body = init.body && isJson ? JSON.parse(init.body) : init.body || null; graphLog.push([init.method, url.replace('https://graph.microsoft.com/v1.0', ''), body]);
    const res = (status, j) => ({ status, ok: status < 300, json: async () => j, text: async () => JSON.stringify(j) });
    let m;
    if (/\/sites\/acme\.sharepoint\.com:\/sites\/DS$/.test(url)) return res(200, { id: 'site1' });
    if (/\/sites\/site1\/drive$/.test(url)) return res(200, { id: 'drv', webUrl: 'https://acme.sharepoint.com/sites/DS/Shared Documents' });
    if ((m = url.match(/\/drives\/drv\/items\/([^/:?]+)\/children\?/)) && init.method === 'GET') {   // a folder listing: its folders and files
      const folders = [...items.entries()].filter(([k]) => k.startsWith(m[1] + '|')).map(([k, id]) => ({ id, name: k.split('|')[1], folder: {} }));
      return res(200, { value: folders.concat([...driveFiles.values()].filter(f => f.parentReference.id === m[1])) }); }
    if ((m = url.match(/\/drives\/drv\/items\/([^/:?]+)(\?(.*))?$/)) && ['GET', 'PATCH', 'DELETE'].includes(init.method)) {   // one file by id
      const f = driveFiles.get(decodeURIComponent(m[1])); if (!f) return res(404, { error: { message: 'itemNotFound' } });
      if (init.method === 'DELETE') { driveFiles.delete(f.id); return res(204, null); }
      if (init.method === 'PATCH') { const to = (body.parentReference && body.parentReference.id) || f.parentReference.id, nm = body.name || f.name; if (nameTaken(to, nm, f.id)) return res(409, { error: { message: 'nameAlreadyExists' } }); f.name = nm; f.parentReference = { id: to }; f.webUrl = 'https://acme.sharepoint.com/sites/DS/' + nm; return res(200, f); }
      return res(200, /downloadUrl/.test(m[3] || '') ? { id: f.id, '@microsoft.graph.downloadUrl': 'https://acme.sharepoint.com/dl/' + f.id + '?tempauth=x' } : f); }
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+)\/children$/))) { const k = m[1] + '|' + body.name; if (items.has(k)) return res(409, {}); const id = 'it' + items.size; items.set(k, id); return res(201, { id, name: body.name, webUrl: 'https://acme.sharepoint.com/sites/DS/' + encodeURIComponent(body.name) }); }
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+):\/([^:]+)$/)) && init.method === 'GET') return res(200, { id: items.get(m[1] + '|' + decodeURIComponent(m[2])) });
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+):\/([^:]+):\/createUploadSession$/))) { const name = decodeURIComponent(m[2]), c = body.item['@microsoft.graph.conflictBehavior'], u = 'https://acme.sharepoint.com/upload/' + encodeURIComponent(name) + '?c=' + c + '&s=' + (++fseq);
      sessions.set(u, { name, parent: m[1], c, received: 0, chunks: [] }); return res(200, { uploadUrl: u, expirationDateTime: '2026-11-26T10:00:00Z' }); }
    if ((m = url.match(/\/drives\/drv\/items\/([^/:]+):\/PROJECT_INDEX\.md:\/content$/)) && init.method === 'PUT') { assert.ok(!isJson); texts.set(m[1], body); return res(200, { id: 'idx-' + m[1], webUrl: 'https://acme.sharepoint.com/sites/DS/PROJECT_INDEX.md' }); }
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
  if (url.startsWith('https://acme.sharepoint.com/upload/')) {   // a Microsoft upload session: pieces in order, GET says what is next, DELETE cancels, an unknown link is 404
    const s = sessions.get(url); if (!s) return new Response('{"error":{"code":"itemNotFound"}}', { status: 404 }); const m = init.method || 'GET';
    if (m === 'DELETE') { sessions.delete(url); return new Response(null, { status: 204 }); }
    if (m === 'GET') return Response.json({ expirationDateTime: '2026-11-26T10:00:00Z', nextExpectedRanges: [s.received + '-'] });
    assert.ok(!init.headers.authorization && !init.headers.Authorization, 'no Authorization header on an upload piece');
    const cr = init.headers['content-range'] || init.headers['Content-Range']; const [, a, z, total] = /bytes (\d+)-(\d+)\/(\d+)/.exec(cr); const body = Buffer.from(init.body instanceof Blob ? await init.body.arrayBuffer() : init.body);
    if (s.drop && s.drop-- > 0) throw new TypeError('network drop');   // the browser lost the connection while sending
    if (+a !== s.received) return new Response('{"error":{"code":"invalidRange"}}', { status: 416 });
    puts.push({ url, a: +a, z: +z, total: +total, body }); s.chunks.push(body); s.received = +z + 1; s.total = +total;
    if (s.received < s.total) return new Response('{}', { status: 202 });
    sessions.delete(url); s.bytes = Buffer.concat(s.chunks); const it = landFile(s); lastBytes.set(it.id, s.bytes); return Response.json(it, { status: 201 }); }
  throw new Error('unexpected fetch ' + url);
};
const me = 'sam.k@facilio.com';
const call = async (method, path, body, who) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(who || me)); return { status: r.status, data: await r.json() }; };
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

assert.deepEqual(FOLDERS, ['01_Project Governance', '02_Requirements & Design', '03_Project Tracking & Reporting', '04_Testing & UAT', '05_Data Onboarding', '06_Training & Enablement', '07_Handover', '08_Archive']);
assert.equal(subfolderOf('export', { view: 'brd' }), '02_Requirements & Design'); assert.equal(subfolderOf('export', { view: 'guidesList' }), '06_Training & Enablement'); assert.equal(subfolderOf('uat_evidence'), '04_Testing & UAT'); assert.equal(subfolderOf('msa'), '01_Project Governance'); assert.equal(subfolderOf('onboarding_workbook'), '05_Data Onboarding'); assert.equal(subfolderOf('whatever'), '01_Project Governance'); assert.equal(subfolderOf('export', { view: 'xyz' }), '03_Project Tracking & Reporting');
assert.equal(safeName('A/B: "x"?.'), 'A-B- -x--'); assert.equal(folderName({ id: 'p_123456789', name: 'Al Moallam', customer: 'Al Moallam' }), 'Al Moallam');
{ const md = indexMarkdown({ project: { name: 'Al Moallam', id: 'p_1', orgId: '42' }, folder: { url: 'https://x/F' }, documents: [{ name: 'BRD | v2.docx', folder: '02_Requirements & Design', at: '2026-11-23T10:00:00Z', url: 'https://x/F/b' }], tasks: { open: 3, overdue: 1, done: 2 }, missed: [{ label: 'Task', title: 'Send the asset list', ownerText: 'Sam', due: '2026-11-20' }], at: '2026-11-23' });
  assert.match(md, /\| Facilio Organization ID \| 42 \|/); assert.match(md, /BRD \/ v2\.docx/); assert.match(md, /\[08_Archive\]\(https:\/\/x\/F\/08_Archive\)/); assert.match(md, /Open 3 · overdue 1 · finished 2/); assert.match(md, /Task: Send the asset list \| Sam \| 2026-11-20/); }
assert.equal(docKeyOf('uat_evidence', 'a.png'), ''); assert.equal(docKeyOf('export', 'BRD.DOCX', { view: 'brd' }), 'export|brd|brd.docx');
console.log('  ok  subfolders, safe names and document keys');

const pid = (await call('POST', '/api/projects', { name: 'Al Moallam', customer: 'Al Moallam' })).data.project.id;
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
await t('a 25 MB export goes to the project folder, subfolder 02_Requirements & Design, in three pieces that match the file', async () => {
  f1 = (await upload('Al_Moallam_BRD_V10_DRAFT.docx', 'export', big, { view: 'brd', hash: 'h1' })).file;
  const pend = await call('GET', `/api/projects/${pid}/sharepoint`); assert.equal(pend.data.configured, true); assert.deepEqual(pend.data.pending.map(x => x.id), [f1.id]);
  const r = await copy(f1.id); assert.equal(r.parts, 3); assert.equal(r.last.done, true); assert.equal(r.last.folder, '02_Requirements & Design'); assert.match(r.last.url, /Al_Moallam_BRD_V10_DRAFT\.docx$/);
  assert.equal(Buffer.concat(puts.map(p => p.body)).compare(big), 0, 'the pieces put together are the file'); assert.deepEqual(puts.map(p => p.a), [0, 10485760, 20971520]);
  assert.ok(puts[0].url.includes('c=replace'), 'a document overwrites its earlier version');
  const root = items.get('root|Facilio Onboarding'), pf = items.get(root + '|Al Moallam'); assert.ok(root && pf, 'Facilio Onboarding / Al Moallam');
  assert.deepEqual(FOLDERS.filter(n => items.has(pf + '|' + n)), FOLDERS, 'all eight standard folders, not only the one the file needed');
  assert.match(texts.get(pf), /# Project index: Al Moallam/); assert.match(texts.get(pf), /Al_Moallam_BRD_V10_DRAFT\.docx/, 'the index lists the copied document');
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
await t('a new project gets Facilio Onboarding / its name / the eight folders and the index at once; a second project with the same name gets its own folder', async () => {
  const p2 = (await call('POST', '/api/projects', { name: 'Riyadh Towers', customer: 'RT' })).data.project.id; const root = items.get('root|Facilio Onboarding'); const f2 = items.get(root + '|Riyadh Towers');
  assert.ok(f2); assert.deepEqual(FOLDERS.filter(n => items.has(f2 + '|' + n)), FOLDERS); assert.match(texts.get(f2), /Delivery Studio project ID \| p/);
  const p3 = (await call('POST', '/api/projects', { name: 'Riyadh Towers', customer: 'RT2' })).data.project.id; assert.ok(items.has(root + '|Riyadh Towers (' + p3.slice(-6) + ')'), 'no two projects share a folder');
  items.set(root + '|Hand Made', 'manual1'); await call('POST', '/api/projects', { name: 'Hand Made', customer: 'HM' }); assert.ok(items.has('manual1|01_Project Governance'), 'a folder made by hand with that name is adopted, not duplicated');
  const r = await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': 'get_document' }, text: async () => JSON.stringify({ project: p2, section: 'project_index' }) }, mkctx(me));
  const j = await r.json(); assert.equal(j.data.configured, true); assert.equal(j.data.folder.folders.length, 8); assert.match(j.data.index, /Riyadh Towers/);
});
await t('the connector overview names the project folder', async () => {
  const r = await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': 'project_overview' }, text: async () => JSON.stringify({ project: pid }) }, mkctx(me));
  const j = await r.json(); assert.match(j.sharepointFolder.url, /sharepoint\.com/);
});
// ---------- Documents & Files: uploads straight to SharePoint, references kept in the Studio (25 Nov 2026) ----------
const { sendToSession } = createRequire(import.meta.url)('../src/documents.js');
const docs = async (q, who) => (await call('GET', `/api/projects/${pid}/spfiles${q || ''}`, undefined, who)).data;
const fakeFile = (len, seed) => { const b = Buffer.alloc(len); for (let i = 0; i < len; i++) b[i] = (i * 31 + seed) & 255; return new Blob([b]); };
const PIECE = 10 * 1024 * 1024;
let video;
await t('a 25 MB recording goes from the browser straight to SharePoint in 10 MB pieces; the Studio keeps only the reference', async () => {
  const blob = fakeFile(25 * 1024 * 1024, 3);
  const s = await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'Kick-off call recording.mp4', size: blob.size, folder: '06_Training & Enablement' }); assert.equal(s.status, 201, JSON.stringify(s.data));
  assert.match(s.data.uploadUrl, /^https:\/\/acme\.sharepoint\.com\/upload\//); assert.equal(s.data.piece % (320 * 1024), 0, 'pieces are a multiple of 320 KiB');
  assert.ok(!JSON.stringify([...(store.get('spd.' + pid) || new Map()).values()]).includes('/upload/'), 'the upload link is never stored');
  puts.length = 0; const it = await sendToSession(blob, s.data.uploadUrl, { piece: s.data.piece, fetch: globalThis.fetch });
  assert.deepEqual(puts.map(p => p.a), [0, PIECE, 2 * PIECE], 'three pieces, in order'); assert.equal(Buffer.concat(puts.map(p => p.body)).compare(Buffer.from(await blob.arrayBuffer())), 0);
  const fin = await call('POST', `/api/projects/${pid}/spfiles/uploads/${s.data.uploadId}/finish`, { itemId: it.id }); assert.equal(fin.status, 200, JSON.stringify(fin.data)); video = fin.data.file;
  assert.equal(video.folder, '06_Training & Enablement'); assert.equal(video.size, blob.size); assert.equal(video.kind, 'Video'); assert.equal(video.uploadedBy, me); assert.equal(video.source, 'upload');
  const d = await docs(); assert.ok(d.files, JSON.stringify(d)); assert.ok(d.files.some(x => x.id === video.id)); assert.equal(d.uploads.length, 0, 'the finished upload is no longer waiting');
  assert.ok(!(await call('GET', `/api/projects/${pid}/files`)).data.files.some(f => f.name === 'Kick-off call recording.mp4'), 'no copy of the bytes in the Studio');
});
await t('a dropped connection resumes from what Microsoft already has, without sending the file again', async () => {
  const blob = fakeFile(3 * PIECE + 5, 9); const s = await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'Site walk.mov', size: blob.size, folder: '06_Training & Enablement' });
  sessions.get(s.data.uploadUrl).drop = 1; puts.length = 0; let waits = 0;
  const it = await sendToSession(blob, s.data.uploadUrl, { piece: PIECE, fetch: async (u, i) => { if (puts.length === 2 && (i.method === 'PUT') && sessions.get(u).drop) { sessions.get(u).drop = 0; throw new TypeError('network drop'); } return globalThis.fetch(u, i); }, wait: async () => { waits++; } });
  assert.equal(waits, 1); assert.deepEqual(puts.map(p => p.a), [0, PIECE, 2 * PIECE, 3 * PIECE], 'carried on at piece 3, nothing sent twice');
  assert.equal((await call('POST', `/api/projects/${pid}/spfiles/uploads/${s.data.uploadId}/finish`, { itemId: it.id })).status, 200);
});
await t('an expired session says so; a cancelled one is gone; an upload is refused when its size or folder does not match', async () => {
  await assert.rejects(sendToSession(fakeFile(10, 1), 'https://acme.sharepoint.com/upload/none', { fetch: globalThis.fetch }), e => e.expired === true);
  const s = await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'Notes.txt', size: 100, folder: '01_Project Governance' });
  const it = await sendToSession(fakeFile(120, 2), s.data.uploadUrl, { fetch: globalThis.fetch });   // the browser sent another file than it announced
  const fin = await call('POST', `/api/projects/${pid}/spfiles/uploads/${s.data.uploadId}/finish`, { itemId: it.id }); assert.equal(fin.status, 409); assert.ok(!(await docs()).files.some(x => x.id === it.id));
  const c = await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'Gone.zip', size: 10, folder: '05_Data Onboarding' }); assert.equal((await globalThis.fetch(c.data.uploadUrl, { method: 'DELETE' })).status, 204);
  assert.equal((await call('DELETE', `/api/projects/${pid}/spfiles/uploads/${c.data.uploadId}`)).status, 200); assert.ok(!(await docs()).uploads.some(u => u.id === c.data.uploadId));
});
await t('checks before any upload: no programs, no 08_Archive, a size cap, viewers read only', async () => {
  const up = (b, who) => call('POST', `/api/projects/${pid}/spfiles/uploads`, Object.assign({ name: 'a.pdf', size: 10, folder: '02_Requirements & Design' }, b), who);
  assert.equal((await up({ name: 'setup.exe' })).status, 415); assert.equal((await up({ folder: '08_Archive' })).status, 400); assert.equal((await up({ folder: '../x' })).status, 400);
  assert.equal((await up({ size: 11 * 1024 ** 3 })).status, 413); assert.equal((await up({ size: 0 })).status, 400);
  await call('POST', `/api/projects/${pid}/members`, { email: 'vee.r@facilio.com', role: 'viewer' });
  assert.equal((await up({}, 'vee.r@facilio.com')).status, 403); const v = await docs('', 'vee.r@facilio.com'); assert.equal(v.canEdit, false); assert.ok(v.files.length >= 2, 'viewers see the files');
  assert.equal((await call('DELETE', `/api/projects/${pid}/spfiles/${video.id}`, undefined, 'vee.r@facilio.com')).status, 403);
  assert.equal((await call('GET', `/api/projects/${pid}/spfiles`, undefined, 'stranger@facilio.com')).status, 404, 'not on the project: nothing');
});
await t('the same name twice is two files; Refresh brings changes made in SharePoint: added by hand, renamed, deleted, moved away', async () => {
  const one = async () => { const s = await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'Asset list.xlsx', size: 4, folder: '05_Data Onboarding' }); const it = await sendToSession(fakeFile(4, 7), s.data.uploadUrl, { fetch: globalThis.fetch }); return (await call('POST', `/api/projects/${pid}/spfiles/uploads/${s.data.uploadId}/finish`, { itemId: it.id })).data.file; };
  const a = await one(), b = await one(); assert.deepEqual([a.name, b.name], ['Asset list.xlsx', 'Asset list 1.xlsx']);
  const root = items.get('root|Facilio Onboarding'), pf = items.get(root + '|Al Moallam'), req = items.get(pf + '|02_Requirements & Design');
  const hand = fileItem('hand1', 'Al Moallam BRD v3.docx', 2048, req); hand.createdBy = { user: { email: 'nina.p@facilio.com' } }; driveFiles.set('hand1', hand);
  items.set(req + '|Workshops', 'subW'); driveFiles.set('hand2', fileItem('hand2', 'Workshop 1 notes.pdf', 99, 'subW'));
  driveFiles.get(a.id).name = 'Asset list FINAL.xlsx'; driveFiles.delete(b.id); driveFiles.get(video.id).parentReference = { id: 'somewhere-else' };
  const d = await docs('?refresh=1'); const by = id => d.files.find(x => x.id === id);
  assert.equal(by('hand1').uploadedBy, 'nina.p@facilio.com'); assert.equal(by('hand1').folder, '02_Requirements & Design'); assert.equal(by('hand2').path, '02_Requirements & Design/Workshops');
  assert.equal(by(a.id).name, 'Asset list FINAL.xlsx'); assert.equal(by(a.id).uploadedBy, me, 'a rename keeps who added it');
  assert.equal(by(b.id).missing, 'Deleted in SharePoint'); assert.equal(by(video.id).missing, 'Moved out of the project folder');
  driveFiles.get(video.id).parentReference = { id: items.get(pf + '|06_Training & Enablement') }; assert.equal((await docs('?refresh=1')).files.find(x => x.id === video.id).missing, '', 'back in the folder: found again');
});
await t('rename, move (a taken name is refused), download link, delete; every change is in the project audit', async () => {
  const id = 'hand1', P = `/api/projects/${pid}/spfiles/${id}`;
  assert.equal((await call('PATCH', P, { name: 'Al Moallam BRD v4.docx' })).data.file.name, 'Al Moallam BRD v4.docx'); assert.equal(driveFiles.get(id).name, 'Al Moallam BRD v4.docx');
  const mv = await call('PATCH', P, { folder: '08_Archive' }); assert.equal(mv.data.file.folder, '08_Archive'); const root = items.get('root|Facilio Onboarding'), pf = items.get(root + '|Al Moallam'); assert.equal(driveFiles.get(id).parentReference.id, items.get(pf + '|08_Archive'));
  driveFiles.set('clash', fileItem('clash', 'Taken.docx', 1, items.get(pf + '|08_Archive'))); assert.equal((await call('PATCH', P, { name: 'Taken.docx' })).status, 409);
  assert.equal((await call('PATCH', P, { folder: 'Elsewhere' })).status, 400);
  const dl = await call('GET', P + '/download'); assert.match(dl.data.url, /^https:\/\/acme\.sharepoint\.com\/dl\/hand1/);
  assert.equal((await call('DELETE', P)).status, 200); assert.ok(!driveFiles.has(id)); assert.ok(!(await docs()).files.some(x => x.id === id));
  const au = JSON.stringify([...(store.get('au.' + pid) || new Map()).values()]); for (const a of ['doc-uploaded', 'doc-renamed', 'doc-moved', 'doc-deleted']) assert.ok(au.includes(a), 'audit has ' + a);
});
await t('Claude: get_document section documents gives the files, the inventory (missing required documents, latest BRD, duplicates, recordings) and a search', async () => {
  const mcp = async (tool, body) => (await (await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': tool }, text: async () => JSON.stringify(body) }, mkctx(me))).json());
  driveFiles.set('brd5', fileItem('brd5', 'Al Moallam BRD v5.docx', 4096, items.get(items.get(items.get('root|Facilio Onboarding') + '|Al Moallam') + '|02_Requirements & Design')));
  const j = (await mcp('get_document', { project: pid, section: 'documents', part: 'refresh' })).data; assert.equal(j.configured, true);
  assert.ok(j.inventory.missingRequired.some(m => m.document === 'Contract (MSA or SOW)')); assert.ok(!j.inventory.missingRequired.some(m => m.document === 'BRD'));
  assert.equal(j.inventory.latestBrd.name, 'Al Moallam BRD v5.docx'); assert.ok(j.inventory.recordings.some(r => r.name === 'Site walk.mov')); assert.ok(j.inventory.missingFiles.some(f => f.missing === 'Deleted in SharePoint'));
  const v = (await mcp('get_document', { project: pid, section: 'documents', part: 'kind:Video' })).data; assert.ok(v.files.length >= 2 && v.files.every(f => f.kind === 'Video'));
  const q = (await mcp('get_document', { project: pid, section: 'documents', part: 'walk' })).data; assert.deepEqual(q.files.map(f => f.name), ['Site walk.mov']);
  assert.ok(!JSON.stringify(j).includes('/upload/'));
});
await t('Claude saves an approved deliverable straight into a folder (project_jobs file_put_begin with folder, then file_put_done)', async () => {
  const mcp = async body => (await (await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': 'project_jobs' }, text: async () => JSON.stringify(body) }, mkctx(me))).json());
  const b = await mcp({ project: pid, action: 'file_put_begin', fileName: 'Status report W48.pptx', fileSize: 3000, folder: '03_Project Tracking & Reporting' }); assert.match(b.uploadUrl, /\/upload\//, JSON.stringify(b)); assert.match(b.next, /Content-Range: bytes 0-2999\/3000/);
  const it = await (await globalThis.fetch(b.uploadUrl, { method: 'PUT', headers: { 'content-range': 'bytes 0-2999/3000' }, body: Buffer.alloc(3000) })).json();
  const d = await mcp({ project: pid, action: 'file_put_done', fileId: b.fileId, itemId: it.id }); assert.equal(d.folder, '03_Project Tracking & Reporting'); assert.match(d.link, /sharepoint\.com/);
  assert.ok((await docs()).files.some(x => x.name === 'Status report W48.pptx' && x.uploadedBy === me));
  const bad = await mcp({ project: pid, action: 'file_put_begin', fileName: 'big.mp4', fileSize: 20e6, folder: '06_Training & Enablement' }); assert.match(JSON.stringify(bad), /16 MB/);
});
await t('without SharePoint set up the page says so and nothing can be uploaded', async () => {
  SITE = ''; const d = await docs(); assert.equal(d.configured, false); assert.equal((await call('POST', `/api/projects/${pid}/spfiles/uploads`, { name: 'a.pdf', size: 1, folder: '01_Project Governance' })).status, 409); SITE = 'https://acme.sharepoint.com/sites/DS';
});
console.log(n + ' SharePoint checks passed');
