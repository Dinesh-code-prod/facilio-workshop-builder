// Static package validation (src/pkgvalidate.js): the real sample fixture (tests/fixtures/orgpkg-sample, as used by tests/orgpkg.mjs) and a package built by
// src/orgpkg.js pass; a missing file, an extra file, a duplicate id, malformed XML, a path-traversal name, an oversized file and a broken reference are caught;
// the report always says what was NOT checked and never says "deployable". Usage: node tests/pkg_validate.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { DOMParser } = require('@xmldom/xmldom'); const V = require('../src/pkgvalidate.js'); const O = require('../src/orgpkg.js');
const FX = fileURLToPath(new URL('./fixtures/orgpkg-sample/', import.meta.url));
let n = 0, fails = 0; const t = (name, fn) => { try { fn(); n++; console.log('  ok  ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n').slice(0, 8).join('\n       ')); } };
const fixture = () => { const f = { 'PackageConf.xml': fs.readFileSync(FX + 'PackageConf.xml', 'utf8') }; fs.readdirSync(FX + 'components').forEach(c => { f['components/' + c] = fs.readFileSync(FX + 'components/' + c, 'utf8'); }); return f; };
// The sample's PackageConf.xml in the fixture folder lists 5 of the 7 component files it ships (VIEW_GROUP.xml and VIEW.xml were added to the fixture later); tests/orgpkg.mjs
// gives the sample's order as MODULE, TICKET_STATUS, FIELD, VIEW_GROUP, VIEW, STATE_FLOW, STATE_TRANSITION. This completes the list in that order.
const complete = () => { const f = fixture(); f['PackageConf.xml'] = f['PackageConf.xml'].replace('<Component Type="FIELD">FIELD.xml</Component>', '<Component Type="FIELD">FIELD.xml</Component>\n      <Component Type="VIEW_GROUP">VIEW_GROUP.xml</Component>\n      <Component Type="VIEW">VIEW.xml</Component>'); return f; };
const run = (f, o) => V.validatePackage(f, Object.assign({ DOMParser }, o || {})); const rules = r => r.errors.map(e => e.rule);
const mini = (T, recs) => '<Components>\n' + recs.map(([id, inner]) => '   <' + T + ' Created_Version="1.0" Modified_Version="1.0" Status="ADDED" Type="1" Unique_Identifier="' + id + '">' + (inner || '') + '</' + T + '>').join('\n') + '\n</Components>\n';
const tiny = () => ({ 'PackageConf.xml': '<Package><name>p</name><Components><Component Type="MODULE">MODULE.xml</Component></Components></Package>', 'components/MODULE.xml': mini('MODULE', [['1', '<name>custom_a</name>'], ['2', '<name>custom_b</name>']]) });

t('the real sample fixture, with its PackageConf.xml completed, passes the static checks with no errors', () => {
  const r = run(complete()); assert.deepEqual(r.errors, []); assert.equal(r.ok, true); assert.equal(r.status, 'passed static checks'); assert.ok(r.checked.length >= 5); assert.ok(r.warnings.every(w => w.rule === 'reference-org'), 'only "assumed to exist in the organisation" notes');
  assert.ok(r.warnings.length > 0, 'modules that are not in the package are reported, not silently accepted');
});
t('the fixture as it stands lists 5 of its 7 component files: exactly VIEW.xml and VIEW_GROUP.xml are reported as unlisted, nothing else is wrong', () => {
  const r = run(fixture()); assert.equal(r.ok, false); assert.deepEqual(r.errors.map(e => e.rule + ' ' + e.file).sort(), ['unlisted-file components/VIEW.xml', 'unlisted-file components/VIEW_GROUP.xml']);
});
t('it passes without an injected parser too (the own XML reader is the only one used), with the same result', () => {
  const a = V.validatePackage(complete(), {}); const b = run(complete()); assert.equal(a.ok, true); assert.deepEqual(a.errors, b.errors); assert.deepEqual(a.warnings, b.warnings);
});
t('a package built by src/orgpkg.js (modules, fields, states, flows, views, notifications) passes', () => {
  const ok = { reqs: [{ id: 'R1', status: 'Confirmed' }] };
  const res = O.build({ orgId: '1', reference: false, brdSigned: true, modules: { workorder: { uid: '109419', label: 'Work Order', fields: [], statuses: [], flows: [] } }, newModules: [{ name: 'custom_inc', label: 'Incident', stateflow: true, src: ok }],
    newFields: [{ module: 'custom_inc', label: 'Reported by', type: 'Single Line Text', src: ok }, { module: 'custom_inc', label: 'Kind', type: 'Picklist', options: ['A', 'B & C'], src: ok }],
    flows: [{ key: 'f', module: 'custom_inc', name: 'Flow', isNew: true, initial: 's1', src: ok, states: [{ id: 's1', label: 'Open' }, { id: 's2', label: 'Done' }], transitions: [{ id: 't', name: 'Finish', from: 's1', to: 's2', type: 'user', src: ok }] }],
    views: [{ module: 'custom_inc', label: 'All', columns: [{ name: 'name', label: 'Name' }], isDefault: true, src: ok }],
    notifications: [{ name: 'Opened', module: 'custom_inc', trigger: 'created', channels: { email: true }, subject: 's', message: 'm', src: ok }] }, { now: 1792200000000 });
  const r = run(res.files); assert.deepEqual(r.errors, []); assert.ok(r.ok); assert.ok(Object.keys(res.files).length >= 7);
});
t('a missing component file is caught', () => { const f = tiny(); delete f['components/MODULE.xml']; const r = run(f); assert.equal(r.ok, false); assert.deepEqual(rules(r), ['missing-file']); assert.match(r.errors[0].message, /lists components\/MODULE.xml/); const g = tiny(); delete g['PackageConf.xml']; assert.ok(rules(run(g)).includes('missing-file')); });
t('an extra component file that PackageConf.xml does not list is caught', () => { const f = tiny(); f['components/FIELD.xml'] = mini('FIELD', [['9', '<moduleName>custom_a</moduleName>']]); const r = run(f); assert.deepEqual(rules(r), ['unlisted-file']); assert.equal(r.errors[0].file, 'components/FIELD.xml'); });
t('a duplicate Unique_Identifier inside one file is caught (the same number in two files is only a warning: the sample does not prove it is wrong)', () => {
  const f = tiny(); f['components/MODULE.xml'] = mini('MODULE', [['1', '<name>custom_a</name>'], ['1', '<name>custom_b</name>']]); assert.deepEqual(rules(run(f)), ['duplicate-id']);
  const g = tiny(); g['PackageConf.xml'] = g['PackageConf.xml'].replace('</Components>', '<Component Type="FIELD">FIELD.xml</Component></Components>'); g['components/FIELD.xml'] = mini('FIELD', [['1', '<moduleName>custom_a</moduleName>']]); const r = run(g); assert.equal(r.ok, true); assert.ok(r.warnings.some(w => w.rule === 'duplicate-id-across-files'));
});
t('malformed XML is caught, in a component file and in PackageConf.xml (several kinds of damage)', () => {
  const bad = ['<Components><MODULE></Components>', '<Components><MODULE Unique_Identifier="1"></MODULE>', '<Components></Components><Components/>', '<Components><a b=1/></Components>', '<Components>&bogus;</Components>', '<!DOCTYPE x [<!ENTITY y "z">]><Components/>', '', 'text only', '<Components><a></b></Components>', '<Components a="1" a="2"/>'];
  bad.forEach(x => { const f = tiny(); f['components/MODULE.xml'] = x; const r = run(f); assert.ok(rules(r).includes('malformed-xml'), JSON.stringify(x) + ' -> ' + rules(r)); assert.equal(r.ok, false); });
  const f = tiny(); f['PackageConf.xml'] = '<Package><name>p</Package>'; assert.ok(run(f).errors.some(e => e.rule === 'malformed-xml' && e.file === 'PackageConf.xml'));
  const g = tiny(); g['components/MODULE.xml'] = mini('MODULE', [['1', '<name>a &amp; b</name><![CDATA[<x>]]>']]).replace('</Components>', '<!-- c --></Components>'); assert.ok(run(g).ok, 'entities, CDATA and comments are fine');
});
t('path traversal, absolute paths, odd characters and backslashes in file names are caught', () => {
  ['../evil.xml', 'components/../../evil.xml', '/etc/passwd', 'C:/x.xml', 'components\\MODULE.xml', 'components/a b;c.xml', 'components/ä.xml', 'a'.repeat(250) + '.xml', 'components//x.xml'].forEach(p => { const f = tiny(); f[p] = '<x/>'; const r = run(f); assert.ok(r.errors.some(e => e.rule === 'unsafe-path' && e.file === p), p + ' -> ' + JSON.stringify(rules(r))); assert.equal(r.ok, false); });
  const f = tiny(); f['metafiles/'] = ''; f['error-log.txt'] = 'x'; assert.ok(run(f).ok, 'metafiles/ and error-log.txt are part of the sample layout');
});
t('a file over 5 MB is caught, and is not read as XML; a size given by the caller (a ZIP entry that was not unpacked) counts too', () => {
  const f = tiny(); f['components/MODULE.xml'] = mini('MODULE', [['1', '<name>' + 'x'.repeat(5 * 1024 * 1024 + 10) + '</name>']]); const r = run(f); assert.deepEqual(rules(r), ['too-large']);
  const g = tiny(); const r2 = run(g, { sizes: { 'components/MODULE.xml': 6 * 1024 * 1024 } }); assert.deepEqual(rules(r2), ['too-large']); assert.deepEqual(rules(run(tiny(), { maxFileBytes: 50 })), ['too-large', 'too-large']);
});
t('reference integrity: a field of a module that is not in the package is a warning unless the organisation\'s modules are given; Parent_Id must match the module in the package', () => {
  const f = tiny(); f['PackageConf.xml'] = f['PackageConf.xml'].replace('</Components>', '<Component Type="FIELD">FIELD.xml</Component></Components>');
  f['components/FIELD.xml'] = mini('FIELD', [['9', '<moduleName>workorder</moduleName>'], ['10', '<moduleName>custom_a</moduleName>']]).replace('Unique_Identifier="10"', 'Parent_Id="1" Unique_Identifier="10"');
  let r = run(f); assert.equal(r.ok, true); assert.ok(r.warnings.some(w => w.rule === 'reference-org' && /workorder/.test(w.message)));
  r = run(f, { knownModules: ['asset'] }); assert.deepEqual(rules(r), ['reference']); assert.ok(run(f, { knownModules: ['workorder'] }).ok);
  const g = Object.assign({}, f, { 'components/FIELD.xml': f['components/FIELD.xml'].replace('Parent_Id="1"', 'Parent_Id="77"') }); assert.deepEqual(rules(run(g)), ['parent-id']);
});
t('reference integrity: a view that names a view group that is not in the package is a warning (error when the organisation\'s groups are given); one in the package is fine', () => {
  const f = complete(); assert.ok(run(f).ok); f['components/VIEW.xml'] = f['components/VIEW.xml'].replace(/<ViewGroupName>allViews</g, '<ViewGroupName>nogroup<'); let r = run(f); assert.ok(r.ok); assert.ok(r.warnings.some(w => /nogroup/.test(w.message)));
  r = run(f, { knownViewGroups: ['site|systemviews'] }); assert.ok(!r.ok); assert.ok(r.errors.every(e => e.rule === 'reference' && /nogroup/.test(e.message)));
});
t('the report always lists what was not checked, never says "deployable", and carries a version', () => {
  [run(complete()), run(fixture()), run({}), V.validatePackage(null)].forEach(r => { assert.ok(r.notChecked.length >= 3); const all = r.notChecked.join(' '); assert.match(all, /Runtime behaviour/); assert.match(all, /Schema validity against Facilio/); assert.match(all, /live organisation/); assert.equal(r.version, 'pkgvalidate/1'); assert.ok(['passed static checks', 'failed static checks'].includes(r.status)); assert.ok(!/deployable/i.test(JSON.stringify(r).replace(/never says "deployable"/g, ''))); assert.ok(Array.isArray(r.checked) && Array.isArray(r.errors) && Array.isArray(r.warnings)); });
  assert.equal(run({}).ok, false); assert.deepEqual(rules(run({})), ['missing-file']);
});
console.log(`${n} passed, ${fails} failed`); if (fails) process.exit(1);
