// The Solution document page (src/soldoc.js) runs the BRD Draft editor on its own store (src/brd.js isSol): Claude's Markdown becomes editor blocks,
// the page says "solution document" for "BRD", and BRDs and solution documents never share a list, selection or settings.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const docs = {}; globalThis.FWB = { S: { user: { kind: 'consultant' }, project: { id: 'p1' }, ws: { project: {}, brd: { versionHistory: [], approvals: [] } }, ui: {} }, esc, doc: k => (docs[k] = docs[k] || {}) };
globalThis.FWBViews = { ACT: {}, isCustomer: () => false };
const req = createRequire(import.meta.url); req('../src/soldoc.js'); const V = globalThis.FWBViews, L = V.soldocLogic; let n = 0; const ok = m => { n++; console.log('  ok  ' + m); };

const b = L.mdToBlocks('# Acme Solution Document\nSolution document id: brd_x\n\n## Project Information\n| Item | Detail |\n|---|---|\n| Customer | Acme |\n\n## Work Orders\n### Use Case\nRepairs are **raised** by tenants.\nThey are assigned.\n\n- One\n- Two\n1. Three');
assert.deepEqual(b.map(x => x.t + (x.lvl || '')), ['h1', 'table', 'h1', 'h2', 'p', 'ul']);
assert.deepEqual(b[1].headers, ['Item', 'Detail']); assert.deepEqual(b[1].rows, [['Customer', 'Acme']]); assert.equal(b[4].text, 'Repairs are raised by tenants. They are assigned.'); assert.deepEqual(b[5].items, ['One', 'Two', 'Three']);
assert.ok(!JSON.stringify(b).includes('brd_x') && !JSON.stringify(b).includes('Acme Solution Document'), 'the title and id lines stay out');
ok('Claude’s Markdown becomes headings, paragraphs, bullets and tables for the editor');

assert.equal(L.swap('Import a BRD (Word, PDF, text)'), 'Import a solution document (Word, PDF, text)'); assert.equal(L.swap('BRD settings'), 'Solution document settings');
assert.equal(L.swap('Another BRD already has that name. Other BRDs are not affected.'), 'Another solution document already has that name. Other solution documents are not affected.');
assert.equal(L.swap('Business Requirement Document For'), 'Solution Document For'); assert.equal(L.swap('data-act="brdNew"'), 'data-act="brdNew"', 'action names stay');
FWB.S.ui.view = 'brd'; assert.equal(V.wordSwap('New BRD'), 'New BRD', 'the BRD page keeps its words'); FWB.S.ui.view = 'soldoc'; assert.equal(V.wordSwap('New BRD'), 'New solution document');
ok('the page and its drawers and messages say solution document; the BRD page is unchanged');

// the engine: two stores, two selections, two settings
globalThis.FWBText = { TBC: '[To be confirmed]' }; globalThis.FWBDiagrams = {}; FWB.allModules = () => []; FWB.humanize = s => s; req('../src/brd.js'); const R = globalThis.FWBBrd;
FWB.S.ui.view = 'brd'; assert.equal(R.store(), 'brddoc'); assert.equal(R.list()[0].name, 'Main BRD'); assert.equal(R.cfg(), FWB.S.ws.brd); assert.equal(R.cfgPath(), 'brd.');
FWB.S.ui.view = 'soldoc'; assert.equal(R.store(), 'soldocs'); assert.equal(R.list()[0].name, 'Solution Document'); assert.notEqual(R.cfg(), FWB.S.ws.brd); assert.equal(R.cfgPath(), '@soldocs:cfg.'); assert.equal(R.selKey(), 'solDocId');
R.list().push({ id: 'brd_int', name: 'SAP integration', type: 'erp', modules: [] }); FWB.S.ui.view = 'brd'; assert.ok(!R.list().some(x => x.id === 'brd_int'), 'a solution document never shows in the BRD list');
assert.ok(docs.soldocs && Array.isArray(docs.soldocs.list) && docs.brddoc && docs.brddoc.list.length === 1); ok('BRDs and solution documents keep their own list, selection and settings');

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
assert.match(read('src/shell.js'), /\['soldoc', 'Solution document'\]/); assert.match(read('build.mjs'), /'src\/soldoc\.js'/); assert.match(read('src/shell.js'), /if \(V\.wordSwap\) msg = V\.wordSwap\(msg\)/);
const api = read('work/server/api.mjs'); assert.match(api, /TEAM_DOCS = new Set\(\['soldocs'/); assert.match(api, /\['soldocs', 'Solution documents/); assert.match(api, /soldoc: \{ title: 'Solution document'/);
const jobs = read('work/server/_jobs.mjs'); assert.match(jobs, /save_draft with task soldoc/); assert.match(jobs, /get_document soldocs/); assert.match(read('src/settings.js'), /project\.facilioRegion/);
ok('page, store, connector document, AI task, Claude job and the Org ID field are wired');
console.log(n + ' solution document page checks passed');
