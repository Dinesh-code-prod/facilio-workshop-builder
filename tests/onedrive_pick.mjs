// New project > OneDrive project folder (src/onedrivelogic.js): the folder list Claude saves, the picker, and the pull_msa job that reads every contract in the folder.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
import { cleanRequest, KINDS } from '../work/server/_jobs.mjs';
const O = createRequire(import.meta.url)('../src/onedrivelogic.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const R = id => 'file:///b!drive/' + id;

t('the saved list is read, cleaned, de-duplicated and sorted', () => {
  const l = O.parseFolders(JSON.stringify([{ name: 'Zeta', ref: R('z') }, { name: ' Al  Moallam ', ref: R('a'), group: '' }, { name: 'Al Moallam', ref: R('a') }, { name: 'No ref', ref: 'https://x' }, { name: '', ref: R('e') }, null, { name: 'Acorn', ref: R('c'), group: 'Yet to start' }]));
  assert.deepEqual(l.map(f => f.name), ['Acorn', 'Al Moallam', 'Zeta']); assert.equal(l[1].ref, R('a'));
  assert.deepEqual(O.parseFolders(JSON.stringify({ folders: [{ name: 'X', ref: R('x') }] })).map(f => f.name), ['X']);
  for (const bad of ['', 'not json', '{"a":1}', 'null']) assert.deepEqual(O.parseFolders(bad), []);
});
t('the picker label keeps two folders of the same name apart, and find matches it exactly', () => {
  const l = O.parseFolders(JSON.stringify([{ name: 'Bagmane', ref: R('1') }, { name: 'Bagmane', ref: R('2'), group: 'Yet to start' }]));
  assert.deepEqual(l.map(O.label), ['Bagmane', 'Bagmane (Yet to start)']);
  assert.equal(O.find(l, 'bagmane (yet to start)').ref, R('2')); assert.equal(O.find(l, 'Bagmane').ref, R('1')); assert.equal(O.find(l, 'Bag'), null); assert.equal(O.find(l, ''), null);
});
t('the job Create project files passes the job queue with the folder reference kept', () => {
  const j = O.pullJob('Al Moallam', 'CAFM', { name: 'Al Moallam', ref: R('a') }); const c = cleanRequest(j);
  assert.equal(c.ok, true); assert.equal(c.kind, 'pull_msa'); assert.equal(c.params.ref, R('a')); assert.match(c.params.note, /OneDrive project folder: Al Moallam/);
});
t('the pull_msa recipe searches every subfolder and combines every contract it finds', () => {
  const r = KINDS.pull_msa.recipe;
  assert.match(r, /job ref is a file:\/\/\/ folder reference/); assert.match(r, /EVERY subfolder/); assert.match(r, /file names are not reliable/); assert.match(r, /ONE combined extraction/); assert.match(r, /change request/);
});
t('the list prompt saves into the person\'s holding space without submitting it', () => {
  const p = O.listPrompt(); assert.match(p, /project "holding"/); assert.match(p, new RegExp('kind "' + O.KIND + '"')); assert.match(p, /action store/); assert.match(p, /Do not submit/); assert.match(p, /startPage/);
});
t('New project is wired to the list, the picker and the job; the build includes the file', () => {
  const s = fs.readFileSync('src/shell.js', 'utf8');
  assert.match(s, /setTimeout\(npOdLoad, 0\)/); assert.match(s, /data-act="npOdList"/); assert.match(s, /'\?kind=' \+ O\.KIND/); assert.match(s, /FWBOneDrive\.pullJob\(body\.customer, body\.name, odF\)/); assert.match(s, /odF\.name[^\n]*go\('msaintake'\)/); assert.match(s, /npOd\.host = drawer\('New project'/);
  assert.match(fs.readFileSync('build.mjs', 'utf8'), /'src\/onedrivelogic\.js'/);
});
console.log(n + ' OneDrive folder picker checks passed');
