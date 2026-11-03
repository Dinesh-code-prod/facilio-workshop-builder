// Org folder link (src/orglogic.js), file classification for "Bring your project in" (src/transitionlogic.js), and the file-space limits on uploads (work/server/api.mjs).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import handler from '../work/server/api.mjs';
const require = createRequire(import.meta.url); const O = require('../src/orglogic.js'), T = require('../src/transitionlogic.js');
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

// ---- org folder link ----
const index = { US: ['400000077-FacilioDashboardRepo', '400000099-Acme Facilities'], AE: ['400000039-MajidAlFuttaim', 'bad-name'], AZURE: ['5-Acme'] };
await t('the index is read into org entries and lines that are not "<id>-<name>" are skipped', () => { const e = O.entries(index); assert.equal(e.length, 4); assert.deepEqual(e[0], { region: 'US', id: '400000077', name: 'FacilioDashboardRepo', folder: 'us/400000077-FacilioDashboardRepo' }); assert.deepEqual(O.entries(null), []); assert.deepEqual(O.entries({ US: 'x' }), []); });
await t('an org id finds exactly its folder', () => assert.deepEqual(O.findOrgs(index, { orgId: '400000039' }).map(x => x.folder), ['ae/400000039-MajidAlFuttaim']));
await t('without an org id the customer name finds candidates, ignoring spaces and case', () => assert.deepEqual(O.findOrgs(index, { customer: 'ACME facilities' }).map(x => x.folder), ['us/400000099-Acme Facilities', 'azure/5-Acme']));
await t('a very short or unknown customer finds nothing instead of everything', () => { assert.deepEqual(O.findOrgs(index, { customer: 'ac' }), []); assert.deepEqual(O.findOrgs(index, { customer: 'Nobody Ltd' }), []); });
await t('compare: nothing linked, agreeing sources, and a mismatch that names each source', () => {
  assert.equal(O.compare({}).state, 'none'); assert.equal(O.compare({ orgId: '400000077', packageOrgId: '400000077', folder: 'us/400000077-X' }).state, 'ok');
  const m = O.compare({ orgId: '400000077', packageOrgId: '400000039' }); assert.equal(m.state, 'mismatch'); assert.match(m.text, /Project details says 400000077/); assert.match(m.text, /imported org package says 400000039/);
});

// ---- classification ----
const c = (name, peek) => T.classify(name, 1000, peek);
await t('contracts, plans, UAT, FTR, KPI, kick-off and BRD are told apart from name and sheets', () => {
  assert.equal(c('Acme MSA signed.pdf').category, 'msa'); assert.equal(c('Master Services Agreement.docx').category, 'msa'); assert.equal(c('Acme project plan v3.xlsx').category, 'plan'); assert.equal(c('book1.xlsx', { sheets: ['Gantt', 'Tasks'] }).category, 'plan');
  assert.equal(c('UAT tracker.xlsx').category, 'uat_source'); assert.equal(c('x.xlsx', { sheets: ['Test Cases'] }).category, 'uat_source'); assert.equal(c('FTR report.xlsx').category, 'ftr_workbook'); assert.equal(c('KPI sheet.xlsx').category, 'kpi_workbook');
  assert.equal(c('Kickoff deck.pptx').category, 'kickoff'); assert.equal(c('Business Requirements BRD v2.docx').category, 'brd_export');
});
await t('transcripts: caption files, names, and time stamps with speakers', () => {
  assert.equal(c('workshop1.vtt').category, 'transcript'); assert.equal(c('Meeting notes 12 Oct.docx').category, 'transcript');
  const body = 'Priya: hello\n00:01 Raj: yes\n00:02 Priya: ok\n00:03 Raj: fine\n00:04 Priya: good\n00:05 Raj: done\n'; assert.equal(c('call.txt', { text: body }).category, 'transcript');
});
await t('an org package zip is found by what is inside, and a plain zip is only data', () => { assert.equal(c('export.zip', { entries: ['PackageConf.xml', 'components/a.xml'] }).category, 'config_package'); const z = c('misc.zip', { entries: ['a.txt'] }); assert.equal(z.category, 'onboarding_files'); assert.equal(z.confidence, 'low'); });
await t('e-mails go to Inbox, pictures to screenshots, and a type that cannot be stored says so', () => { assert.equal(c('re quote.eml').view, 'inbox'); assert.equal(c('re quote.eml').category, 'email'); assert.equal(c('shot.PNG').category, 'screenshot'); const x = c('setup.exe'); assert.equal(x.category, ''); assert.match(x.reason, /cannot be stored/); });
await t('a guess is marked low so the page asks the person to check it', () => { assert.equal(c('stuff.xlsx').confidence, 'low'); assert.equal(c('stuff.pptx').confidence, 'low'); assert.equal(c('notes.pdf').category, 'config_evidence'); });
await t('every category a file is sent to accepts that file type', () => { for (const f of ['a.vtt', 'a.srt', 'a.docx', 'plan.xlsx', 'plan.xls', 'MSA.pdf', 'MSA.txt', 'kickoff.ppt', 'kickoff.pdf', 'BRD.pdf', 'FTR.xlsm', 'UAT.csv', 'data.csv', 'a.png', 'a.jpeg', 'x.pdf']) { const r = c(f); if (r.category && r.category !== 'email') assert.ok(T.ALLOWED[r.category].split(' ').includes(f.split('.').pop().toLowerCase()), f + ' -> ' + r.category); } });
await t('sizes are written in plain units', () => { assert.equal(T.size(2500), '3 KB'); assert.equal(T.size(20e6), '20.0 MB'); assert.equal(T.size(250e6), '250 MB'); });

// ---- upload limits (stand-in platform as in tests/connector_skills.mjs) ----
const store = new Map(), fileStore = new Map(); let seq = 0; const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: 'x' } }] }),
  db: { async get(c, k) { const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; }, async put(c, k, v) { assert.ok(KEY.test(k)); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, JSON.stringify(v)); return { key: k }; }, async delete(c, k) { (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { const keys = [...(store.get(c) || new Map()).keys()].sort(); const s = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (s < 0) return { items: [] }; const page = keys.slice(s, s + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: s + page.length < keys.length ? page[page.length - 1] : null }; } },
  files: { async uploadUrl(nm) { const id = 'f' + (++seq) + nm; fileStore.set(id, 1); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; }, async put(o) { const id = 'p' + (++seq); fileStore.set(id, 1); return { file_id: id }; }, async delete(id) { fileStore.delete(id); } } });
const call = async (email, method, path, body) => { const [p, q] = path.split('?'); const r = await handler({ method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }, mkctx(email)); return { status: r.status, data: await r.json() }; };
const me = 'sam.k@facilio.com'; const pid = (await call(me, 'POST', '/api/projects', { name: 'Space Test', customer: 'Acme' })).data.project.id;
const start = (name, size, cat) => call(me, 'POST', `/api/projects/${pid}/files`, { name, size, category: cat || 'kickoff', mime: 'application/pdf' });
await t('a person can have six uploads in progress; the seventh waits, with a plain message', async () => {
  for (let i = 0; i < 6; i++) assert.equal((await start('d' + i + '.pdf', 1e6)).status, 201); const r = await start('d6.pdf', 1e6); assert.equal(r.status, 429); assert.match(r.data.error, /6 uploads in progress/);
});
await t('an upload left unfinished for over a day is cleaned up and frees its place', async () => {
  const col = store.get('fl.' + pid); for (const [k, v] of col) { const f = JSON.parse(v); f.createdAt = new Date(Date.now() - 2 * 864e5).toISOString(); f.urls = ['dead' + k]; fileStore.set('dead' + k, 1); col.set(k, JSON.stringify(f)); }
  const r = await start('fresh.pdf', 1e6); assert.equal(r.status, 201); assert.equal(store.get('fl.' + pid).size, 1, 'the six old records are gone'); assert.equal([...fileStore.keys()].filter(k => k.startsWith('dead')).length, 0, 'their stored parts are deleted');
});
await t('the project file space is limited, and the message says how much is used', async () => {
  const col = store.get('fl.' + pid); for (let i = 0; i < 9; i++) col.set('f_ready' + i, JSON.stringify({ id: 'f_ready' + i, status: 'ready', size: 100e6, createdBy: 'x', createdAt: new Date().toISOString(), deletedAt: null }));   // 900 MB kept + 1 MB in progress
  const ok = await start('a.pdf', 90e6); assert.equal(ok.status, 201); const r = await start('b.pdf', 20e6); assert.equal(r.status, 413); assert.match(r.data.error, /already holds \d+ MB of files \(the limit is 1000 MB\)/);
});
console.log(`${n} org link, classification and upload limit checks passed`);
