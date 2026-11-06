// The Solution Document job (Handover page): Claude builds it from the dropped org package with the facilio-solution-document-builder skill.
// Checks the job kind, the connector action file_urls (package files only, team only, one-hour links) and that the skill ships in the repo and the setup page.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { KINDS, cleanRequest } from '../work/server/_jobs.mjs'; import { installJobs } from '../work/server/_jobsapi.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const files = { f_pkg: { value: { id: 'f_pkg', category: 'config_package', name: 'org.zip', size: 10, mime: 'application/zip', status: 'ready', urls: ['u1', 'u2'] } }, f_pdf: { value: { id: 'f_pdf', category: 'msa', name: 'a.pdf', status: 'ready', urls: ['u3'] } } };
const CONNECTOR = {}; let role = 'edit'; const urlsAsked = [];
installJobs({ route() { }, ok: x => x, HttpError, me: async () => ({}), projectAccess: async () => ({ role }), pickProject: async () => ({ id: 'p1', name: 'Al Moallam' }), dbGet: async (c, id) => files[id] || null, dbPut: async () => { }, dbList: async () => [], withLock: async (k, fn) => fn(), audit: async () => { }, CONNECTOR, rid: () => 'x', CTX: { files: { url: async (id, o) => { urlsAsked.push([id, o.expires]); return { url: 'https://dl/' + id }; } } } });
const rejects = async (p, status) => { try { await p; } catch (e) { assert.equal(e.status, status, e.message); return; } assert.fail('should be refused ' + status); };
await t('the job kind exists, names the skill and the connector action, and a request carries the file id as its ref', () => {
  const k = KINDS.build_solution_doc; assert.ok(k && /facilio-solution-document-builder/.test(k.recipe) && /file_urls/.test(k.recipe) && /outputs\/solution-document/.test(k.recipe)); const c = cleanRequest({ kind: 'build_solution_doc', note: 'org.zip', ref: 'f_pkg' }); assert.ok(c.ok); assert.equal(c.params.ref, 'f_pkg');
});
await t('file_urls returns one-hour links for the parts of an org package, and refuses other files, missing files and customers', async () => {
  const r = await CONNECTOR.jobs_file_urls({ id: 'u' }, { fileId: 'f_pkg' }); assert.deepEqual(r.parts, ['https://dl/u1', 'https://dl/u2']); assert.deepEqual(urlsAsked, [['u1', 3600], ['u2', 3600]]);
  await rejects(CONNECTOR.jobs_file_urls({ id: 'u' }, { fileId: 'f_pdf' }), 403); await rejects(CONNECTOR.jobs_file_urls({ id: 'u' }, { fileId: 'nope' }), 404); role = 'customer'; await rejects(CONNECTOR.jobs_file_urls({ id: 'u' }, { fileId: 'f_pkg' }), 403); role = 'edit';
});
await t('the connector declares the action, the skill ships as a folder and a zip, and the setup page lists it', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8')); const pj = j.mcp.tools.find(x => x.name === 'project_jobs').input_schema.properties; assert.ok(pj.action.enum.includes('file_urls') && pj.fileId); assert.ok(j.mcp.tools.length <= 40);
  assert.ok(fs.existsSync(new URL('../skills/facilio-solution-document-builder/SKILL.md', import.meta.url)) && fs.existsSync(new URL('../skills/facilio-solution-document-builder/scripts/extract_package.py', import.meta.url))); assert.ok(fs.statSync(new URL('../public/skills/facilio-solution-document-builder.zip', import.meta.url)).size > 10000);
  assert.match(fs.readFileSync(new URL('../src/claudeskills.js', import.meta.url), 'utf8'), /'facilio-solution-document-builder'/);
});
console.log(n + ' solution document checks passed');
