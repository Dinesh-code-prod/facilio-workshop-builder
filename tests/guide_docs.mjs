// Training guides as documents (24 Nov 2026): folders (src/guideslist.js), the document paper and its HTML file (src/docpaper.js), the FTR report as an editable document,
// the Assistant commands and the connector (get_document guides, save_draft with id). Same stand-in platform as tests/connector_skills.mjs.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
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
const tool = (name, body) => call('POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

// pure: folders, the document paper, the HTML file, the FTR report as a document
globalThis.FWBViews = {}; const req = createRequire(import.meta.url); req('../src/guideslist.js'); const DP = req('../src/docpaper.js'); const FR = req('../src/ftrreport.js'); const CC = req('../src/chatcmds.js');
const { folders } = globalThis.FWBViews.guidesLogic;
await t('folders: make, refuse a twin name, rename, move a guide in and out, and delete only an empty folder', async () => {
  let r = folders.add(undefined, '  Technicians ', 'f1'); assert.ok(r.ok); assert.deepEqual(r.store.list, [{ id: 'f1', name: 'Technicians' }]); let st = r.store;
  assert.equal(folders.add(st, 'technicians', 'f2').ok, false, 'the same name twice is refused'); assert.equal(folders.add(st, '   ', 'f2').ok, false, 'a folder needs a name');
  st = folders.add(st, 'Admins', 'f2').store; assert.equal(folders.rename(st, 'f2', 'Technicians').ok, false); st = folders.rename(st, 'f2', 'Admins and SMEs').store; assert.equal(st.list[1].name, 'Admins and SMEs');
  st = folders.move(st, 'ugd:g1', 'f1').store; assert.equal(folders.folderOf(st, 'ugd:g1'), 'f1'); assert.equal(folders.move(st, 'ugd:g1', 'nope').ok, false, 'a folder that is gone is refused');
  const keys = ['ugd:g1', 'v:free:1']; assert.equal(folders.remove(st, 'f1', keys).ok, false, 'a folder that holds a guide is kept'); assert.match(folders.remove(st, 'f1', keys).error, /Move the 1 item/);
  st = folders.move(st, 'ugd:g1', '').store; assert.equal(folders.folderOf(st, 'ugd:g1'), '', 'moved back to the main list');
  r = folders.remove(st, 'f1', keys); assert.ok(r.ok); assert.deepEqual(r.store.list.map(x => x.id), ['f2']);
  assert.equal(folders.folderOf({ list: [], of: { 'ugd:x': 'gone' } }, 'ugd:x'), '', 'a row filed in a deleted folder shows in the main list');
});
const pic = 'data:image/png;base64,iVBORw0KGgo=';
const guide = { title: 'Raise a work order <now>', customer: 'Acme', audience: 'Technicians', version: '0.2', status: 'draft', brand: { accent: '#1570EF', cover: true, logo: { fileId: 'logo1' } },
  sections: [{ id: 's1', title: 'Getting started', blocks: [{ t: 'md', text: '# Sign in\n1. Open the app\n2. Sign in **with SSO** [S1]\n\n| Field | Value |\n| --- | --- |\n| Site | HQ |' }, { t: 'img', fileId: 'img1', caption: 'The sign-in page' }, { t: 'img', fileId: 'missing', caption: 'Not loaded' }] },
    { id: 's2', title: 'Close the order', blocks: [{ t: 'md', text: '- Pick the order\n- Press Close <script>alert(1)</script>' }] }] };
await t('a guide exports as one self-contained HTML file with its title, sections, steps, table and pictures written in', async () => {
  const h = DP.htmlFile(DP.guideModel(guide, { img1: pic, logo1: pic }, '24 Nov 2026'));
  assert.match(h, /^<!DOCTYPE html>/); assert.match(h, /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"/);
  assert.match(h, /<title>Raise a work order &lt;now&gt;<\/title>/); assert.match(h, /Getting started/); assert.match(h, /Close the order/); assert.match(h, /<ol><li>Open the app<\/li><li>Sign in <b>with SSO<\/b><\/li><\/ol>/);
  assert.match(h, /<th>Field<\/th>/); assert.match(h, /<td>HQ<\/td>/); assert.equal((h.match(/<img src="data:image\/png/g) || []).length, 2, 'the screenshot and the logo are written in');
  assert.doesNotMatch(h, /\[S1\]/, 'source tags never reach the document'); assert.doesNotMatch(h, /<script/i); assert.match(h, /&lt;script&gt;/); assert.doesNotMatch(h, /data-ugimg|contenteditable|src="http/, 'nothing points outside the file');
  assert.match(h, /for<\/div><div class="dp-cc">Acme/); assert.match(h, /Version 0\.2 \u00b7 24 Nov 2026 \u00b7 Draft/);
});
await t('the Document tab: the same paper, editable, with hooks for the section titles, the text and the captions', async () => {
  const h = DP.paper(DP.guideModel(guide), { edit: true, titleAttr: i => 'data-dpt="' + i + '"', mdAttr: (i, j) => 'data-dpm="' + i + '.' + j + '"', capAttr: (i, j) => 'data-dpc="' + i + '.' + j + '"', tools: i => '<div class="dp-tools" data-s="' + i + '"></div>' });
  assert.match(h, /<h1 style="--dp-acc:#1570EF;color:#1570EF" data-dpt="0" contenteditable="true"/); assert.match(h, /data-dpm="1\.0" contenteditable="true"/); assert.match(h, /data-dpc="0\.1"/); assert.match(h, /data-ugimg="img1"/, 'pictures load from the project files');
  assert.equal((h.match(/class="dp-tools"/g) || []).length, 2); assert.doesNotMatch(DP.paper(DP.guideModel(guide), { edit: false, titleAttr: () => 'data-dpt="0"' }), /contenteditable/, 'read only when not editing (approved)');
});
const ftrMd = 'Scope: every module in the order form.\n\n## Work Orders\n### Use case: Raise and close\n| ID | Test case | Steps | Expected | Result | Evidence |\n|---|---|---|---|---|---|\n| WO-1 | Raise a WO | Open, fill, save | Saved | Pass | https://x.example/1 |\n| WO-2 | Close a WO | Close it | Closed | Fail | |\n\n## Assets\n### Use case: Register\n| ID | Test case | Steps | Expected | Result | Evidence |\n|---|---|---|---|---|---|\n| AS-1 | Add an asset with a / b | Add | Listed | | |\n';
await t('the FTR draft renders as a document (summary, one section per module, its tables) and exports as one HTML file', async () => {
  const rep = FR.parse(ftrMd); const m = DP.ftrModel(rep, { customer: 'Acme', version: 3, date: '2026-11-24', status: 'Draft' });
  assert.deepEqual(m.sections.map(s => s.title), ['Summary', 'Work Orders', 'Assets']); const h = DP.htmlFile(m);
  assert.match(h, /<title>FTR report<\/title>/); assert.match(h, /Raise a WO/); assert.match(h, /fr-tag fr-pass">Passed/); assert.match(h, /fr-tag fr-fail">Failed/); assert.match(h, /<td>3<\/td><td>1<\/td><td>1<\/td><td>0<\/td><td>1<\/td>/, 'the summary counts');
  assert.doesNotMatch(h, /contenteditable|<select|data-act/, 'the file holds no edit controls');
  const e = DP.paper(DP.ftrModel(rep, {}, { edit: true }), { edit: true }); assert.match(e, /data-ftc="0\.0\.1\.steps" contenteditable="true"/); assert.match(e, /<select data-change="ftrRes" data-k="0\.0\.1"/); assert.match(e, /data-act="ftrRowAdd" data-k="1\.0"/);
});
await t('an edited FTR report saves back as the Markdown Claude reads, and reads back the same', async () => {
  const rep = FR.parse(ftrMd); rep.modules[0].useCases[0].cases[1].result = 'pass'; rep.modules[0].useCases[0].cases[1].comments = 'Fixed | retested';
  const back = FR.parse(DP.ftrToMd(rep)); assert.equal(back.intro, rep.intro); assert.deepEqual(back.modules.map(x => x.name), ['Work Orders', 'Assets']);
  assert.deepEqual(back.modules[0].useCases[0].cases[1], Object.assign({}, rep.modules[0].useCases[0].cases[1], { comments: 'Fixed / retested' }), 'a | inside a cell cannot break the table');
  assert.equal(back.counts.pass, 2); assert.equal(back.modules[1].useCases[0].cases[0].title, 'Add an asset with a / b');
});
await t('the Assistant: "new folder Technicians" offers to make the folder; "export the FTR as HTML" opens the FTR report', async () => {
  assert.deepEqual(CC.match('new folder Technicians', {}), { type: 'folder', name: 'Technicians' }); assert.deepEqual(CC.match('create a guide folder called "Admins"', {}), { type: 'folder', name: 'Admins' });
  assert.equal(CC.match('export the FTR as HTML', {}).view, 'ftr'); assert.equal(CC.match('download the user guide as html', {}).view, 'guides'); assert.equal(CC.match('write the FTR report', {}).type, 'job', 'writing it still goes to Claude');
});

// the connector: get_document guides and save_draft with an id
const pid = (await call('POST', '/api/projects', { name: 'Guides Test', customer: 'Acme Facilities' })).data.project.id;
await call('PUT', '/api/projects/' + pid + '/docs/workshop', { data: { project: {}, requirements: [], guideFolders: { list: [{ id: 'gf1', name: 'Technicians' }], of: { 'ugd:ug1': 'gf1' } } }, baseVersion: 0 });
const put = (kind, id, data) => call('PUT', '/api/projects/' + pid + '/items/' + kind + '/' + id, { data });
await put('ugd', 'ug1', guide); await put('ugd', 'ug2', Object.assign({}, guide, { title: 'Admin guide', sections: [] }));
const imp = await call('POST', '/api/projects/' + pid + '/ai/import', { task: 'ftr', content: ftrMd }); assert.equal(imp.status, 201, JSON.stringify(imp.data)); const ftrId = imp.data.item.id;
await t('get_document guides lists the folders, the guides with their folder, and the FTR draft; a part gives one as text', async () => {
  const r = await tool('get_document', { project: pid, section: 'guides' }); assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual(r.data.folders, [{ id: 'gf1', name: 'Technicians', items: 1 }]); const g = r.data.guides.find(x => x.id === 'ug1'); assert.equal(g.folder, 'Technicians'); assert.equal(g.sections, 2); assert.equal(r.data.guides.find(x => x.id === 'ug2').folder, '');
  assert.equal(r.data.ftr.id, ftrId); assert.match(r.data.note, /save_draft with its id/);
  const one = (await tool('get_document', { project: pid, section: 'guides', part: 'ug1' })).data; assert.match(one.text, /^# Getting started/); assert.match(one.text, /\[Picture: The sign-in page\]/); assert.equal(one.editable, true);
  const f = (await tool('get_document', { project: pid, section: 'guides', part: 'ftr' })).data; assert.match(f.text, /## Work Orders/);
  assert.equal((await tool('get_document', { project: pid, section: 'guides', part: 'nope' })).status, 404);
});
await t('save_draft with an id changes an unapproved guide (pictures stay with their section) and the FTR draft; an approved one is refused', async () => {
  let r = await tool('save_draft', { project: pid, task: 'guide', id: 'ug1', content: '# Getting started\nOpen the app and sign in.\n[Picture: The sign-in page]\n\n# A new section\nText.' }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.sections, 2);
  const g = (await call('GET', '/api/projects/' + pid + '/items?kinds=ugd')).data.items.find(x => x.id === 'ug1').data; assert.deepEqual(g.sections.map(x => x.title), ['Getting started', 'A new section']);
  assert.equal(g.sections[0].id, 's1', 'a section keeps its id'); assert.deepEqual(g.sections[0].blocks.map(b => b.t), ['md', 'img', 'img'], 'its pictures stay'); assert.equal(g.sections[0].blocks[0].text, 'Open the app and sign in.');
  r = await tool('save_draft', { project: pid, task: 'ftr', id: ftrId, content: ftrMd.replace('| Fail |', '| Pass |') }); assert.equal(r.status, 200, JSON.stringify(r.data));
  const d = (await call('GET', '/api/projects/' + pid + '/items?kinds=ai')).data.items.find(x => x.id === ftrId).data; assert.equal(FR.parse(d.content).counts.pass, 2); assert.equal(d.status, 'draft');
  await call('POST', '/api/projects/' + pid + '/ugd/ug2/decision', { decision: 'approve' }); r = await tool('save_draft', { project: pid, task: 'guide', id: 'ug2', content: '# X\nY' }); assert.equal(r.status, 409, 'an approved guide is read only');
  assert.equal((await tool('save_draft', { project: pid, task: 'ftr', id: 'ai_nothing', content: 'x' })).status, 404);
});
{ const J = await import('../work/server/_jobs.mjs'); for (const k of ['make_guide', 'change_guide']) { const r = J.KINDS[k].recipe; assert.match(r, /solution_package part scope/, k + ' reads the MSA contract scope'); assert.match(r, /workshop parts processes and flows/, k + ' reads the agreed processes'); assert.match(r, /follow the contract/, k); } console.log('  ok  guide requests read the MSA contract scope and the agreed processes first'); }
console.log(n + ' guide document checks passed');
