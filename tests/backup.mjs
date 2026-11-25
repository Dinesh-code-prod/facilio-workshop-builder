// Project backup ZIP (work/server/_backup.mjs): what lives only inside the Studio comes out readable without it (README, records as CSV for Excel, sections as HTML,
// project files, full data as JSON), private notes stay out, Excel formulas are defused, the previous ZIP is removed, the connector action hands Claude the link and the folder rules.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import handler from '../work/server/api.mjs';
import { zip, toCsv, fileName, FILE_CAP } from '../work/server/_backup.mjs';
const JSZip = createRequire(import.meta.url)('jszip');
const store = new Map(), fileStore = new Map(); let seq = 0;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ choices: [{ message: { content: '' } }] }),
  db: {
    async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r) } : null; },
    async put(c, k, v) { const t = JSON.stringify(v); if (t.length > 128 * 1024) { const e = new Error('too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; } },
  files: { async uploadUrl() { const id = 'f' + (++seq); fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id, o) { return { url: 'https://storage.example/get/' + id + (o && o.download ? '?dl=' + encodeURIComponent(o.download) : '') }; },
    async put(o) { assert.ok(Buffer.byteLength(o.body) <= 4e6, 'ctx.files.put holds at most 4 MB'); const id = 'f' + (++seq); fileStore.set(id, Buffer.from(o.body)); return { file_id: id }; },
    async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { bytes: async () => b, text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const id = url.split('/').pop().split('?')[0];
  if (url.startsWith('https://storage.example/get/')) return fileStore.has(id) ? new Response(fileStore.get(id)) : new Response('gone', { status: 404 });
  if (url.startsWith('https://storage.example/put/')) { fileStore.set(id, Buffer.from(init.body)); return new Response('', { status: 200 }); }
  throw new Error('unexpected fetch ' + url);
};
const me = 'sam.k@facilio.com';
const call = async (method, path, body, who) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(who || me)); return { status: r.status, data: await r.json() }; };
const mcp = async (tool, body) => (await (await handler({ method: 'POST', path: '/', query: '', headers: { 'x-work-mcp': '1', 'x-work-mcp-tool': tool }, text: async () => JSON.stringify(body) }, mkctx(me))).json());
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const unzip = async url => { const r = await fetch(url); assert.equal(r.status, 200); return JSZip.loadAsync(Buffer.from(await r.arrayBuffer())); };

await t('the ZIP writer makes a file JSZip (and so Windows and Excel) can open, with UTF-8 names', async () => {
  const z = await JSZip.loadAsync(zip([{ name: 'a/ü.txt', data: 'héllo' }, { name: 'b.bin', data: Buffer.from([0, 1, 2, 255]) }]));
  assert.equal(await z.file('a/ü.txt').async('string'), 'héllo'); assert.deepEqual([...(await z.file('b.bin').async('uint8array'))], [0, 1, 2, 255]);
  assert.equal(fileName('a/b: c?.'), 'a-b- c-');
  const csv = toCsv([{ id: 'x', createdAt: 'c', updatedAt: 'u', data: { title: '=HYPERLINK("http://bad")', n: 2, list: [1, 2] } }]);
  assert.ok(csv.startsWith('\ufeff'), 'Excel reads it as UTF-8'); assert.match(csv, /"'=HYPERLINK\(""http:\/\/bad""\)"/, 'a formula is kept as text'); assert.match(csv, /"\[1,2\]"/);
});

const pid = (await call('POST', '/api/projects', { name: 'Al Moallam', customer: 'Al Moallam' })).data.project.id;
await call('POST', `/api/projects/${pid}/members`, { email: 'vee.r@facilio.com', role: 'viewer' });
const put = (kind, id, data) => call('PUT', `/api/projects/${pid}/items/${kind}/${id}`, { data });
assert.ok((await put('decision', 'd1', { title: 'Use one asset register', status: 'Agreed' })).status < 300);
await put('action', 'a1', { title: '=cmd|calc', owner: 'Sam', due: '2026-12-01' });
await put('pnote', 'n1', { title: 'My private thought', body: 'not for the team', private: true, createdByEmail: me });
await put('pnote', 'n2', { title: 'Shared note', body: 'for the team' });
assert.ok((await call('PUT', `/api/projects/${pid}/docs/workshop`, { data: { sessions: [{ title: 'Assets', notes: 'Line one\nLine two' }] }, baseVersion: 0 })).status < 300);
async function upload(name, category, bytes) {
  const init = await call('POST', `/api/projects/${pid}/files`, { category, name, mime: 'application/octet-stream', size: bytes.length, meta: {} }); assert.equal(init.status, 201, JSON.stringify(init.data));
  for (let i = 0; i < init.data.chunks; i++) { const u = await call('POST', `/api/projects/${pid}/files/${init.data.id}/chunks/${i}/url`, {}); fileStore.set(u.data.fileId, bytes.subarray(i * init.data.chunkSize, (i + 1) * init.data.chunkSize)); await call('PUT', `/api/projects/${pid}/files/${init.data.id}/chunks/${i}`, { fileId: u.data.fileId }); }
  return (await call('POST', `/api/projects/${pid}/files/${init.data.id}/complete`, {})).data.file;
}
const pdf = Buffer.concat([Buffer.from('%PDF-1.4 '), Buffer.alloc(2000, 7)]); await upload('Signed MSA.pdf', 'msa', pdf);
let first;
await t('Download backup: README, records for Excel, sections as web pages, the project files and the full data; no private notes', async () => {
  const r = await call('POST', `/api/projects/${pid}/backup`, {}); assert.equal(r.status, 200, JSON.stringify(r.data)); first = r.data;
  assert.match(r.data.fileName, /^Al Moallam backup \d{4}-\d{2}-\d{2}\.zip$/); assert.equal(r.data.folder, 'Al Moallam'); assert.match(r.data.url, /dl=Al%20Moallam%20backup/);
  const z = await unzip(r.data.url), names = Object.keys(z.files);
  for (const want of ['README.html', 'Records/Decisions.csv', 'Records/Actions.csv', 'Records/Project notes.csv', 'Sections/workshop.html', 'data/items-decision.json', 'data/section-workshop.json', 'data/project.json', 'Files/files.csv']) assert.ok(names.includes(want), want + ' in ' + names.join(', '));
  const msa = names.find(x => /^Files\/msa\/.+ Signed MSA\.pdf$/.test(x)); assert.ok(msa, 'the uploaded MSA is in the backup'); assert.equal(Buffer.compare(Buffer.from(await z.file(msa).async('uint8array')), pdf), 0);
  const notes = await z.file('Records/Project notes.csv').async('string'); assert.match(notes, /Shared note/);
  const all = await Promise.all(names.filter(x => !z.files[x].dir).map(x => z.file(x).async('string'))); assert.ok(!all.some(x => /private thought/.test(x)), 'a private note never leaves the Studio');
  assert.match(await z.file('Records/Actions.csv').async('string'), /'=cmd\|calc/, 'a value Excel would run is kept as text');
  assert.match(await z.file('Sections/workshop.html').async('string'), /Line one<br>Line two/);
  const readme = await z.file('README.html').async('string'); assert.match(readme, /Al Moallam/); assert.match(readme, /Decisions\.csv/);
  assert.deepEqual(JSON.parse(await z.file('data/project.json').async('string')).members.map(m => m.role).sort(), ['owner', 'viewer']);
  assert.equal(r.data.contents.records, 3); assert.ok(r.data.contents.sections >= 1); assert.equal(r.data.contents.files, 1); assert.equal(r.data.contents.filesNotIncluded, 0);   // a new project also has its people section
  assert.equal((await call('GET', `/api/projects/${pid}/backup`)).data.last.by, me);
});
await t('a new backup replaces the stored one; a big one goes through an upload link (over 4 MB)', async () => {
  const noise = randomBytes(6 * 1024 * 1024); noise.set([0x50, 0x4B, 3, 4]);   // does not compress, like a real workbook full of pictures
  await upload('Asset register.xlsx', 'onboarding_workbook', noise);
  const r = await call('POST', `/api/projects/${pid}/backup`, {}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.size > 4e6, 'bigger than ctx.files.put takes');
  const oldId = first.url.split('/get/')[1].split('?')[0]; assert.ok(!fileStore.has(oldId), 'the previous backup is removed'); assert.equal(r.data.contents.files, 2);
  assert.ok(FILE_CAP >= 40 * 1024 * 1024);
});
await t('viewers can take a backup; people outside the project cannot', async () => {
  assert.equal((await call('POST', `/api/projects/${pid}/backup`, {}, 'vee.r@facilio.com')).status, 200);
  assert.equal((await call('POST', `/api/projects/${pid}/backup`, {}, 'stranger@facilio.com')).status, 404);
});
await t('Claude: project_jobs action backup gives the link, the folder and how to keep it (D: on Windows, home folder on a Mac, 7 days)', async () => {
  const r = await mcp('project_jobs', { project: pid, action: 'backup' }); assert.match(String(r.url), /storage\.example/, JSON.stringify(r)); assert.equal(r.folder, 'Al Moallam');
  assert.match(r.next, /D:\\Delivery Studio backups/); assert.match(r.next, /~\/Delivery Studio backups on a Mac/); assert.match(r.next, /7 newest/); assert.match(r.next, /Never show, save or log the url/);
});
console.log(n + ' backup checks passed');
