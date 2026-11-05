// Import of an approved transcript transfer (src/transcriptimport.js, the button in src/transferslogic.js): who may import, the second import of the same version, bad content.
// The save itself (file store, transcripts document, analysis) runs in the app and is checked by hand in the Browser pane.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const I = require('../src/transcriptimport.js'); const T = require('../src/transferslogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const tr = over => Object.assign({ id: 'x-' + 'a'.repeat(32), dir: 'pull', kind: 'transcript', scope: '', source: { system: 'teams', ref: 'meetings/abc/transcript.vtt', label: 'Kick-off call' }, dest: { system: 'studio', ref: 'transcripts' }, by: 'sam@facilio.com', status: 'Approved', ver: 3, approvedVer: 2,
  versions: [{ n: 1, size: 10 }, { n: 2, size: 20 }, { n: 3, size: 30 }], log: [], pushes: [], next: [] }, over || {});
const VTT = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<v Priya>We need approvals before closing.</v>\n\n00:00:04.000 --> 00:00:06.000\n<v Sam>Noted.</v>\n';

t('only an approved transcript can be imported, and the button follows the same rule', () => {
  assert.equal(T.canImport(tr()), true); assert.equal(T.canImport(tr({ status: 'Awaiting Review' })), false); assert.equal(T.canImport(tr({ kind: 'msa' })), false); assert.equal(T.canImport(tr({ approvedVer: null })), false); assert.equal(T.canImport(null), false);
  assert.match(T.drawerHtml({ transfer: tr(), tab: 'project' }), /data-act="xfImport"/); assert.doesNotMatch(T.drawerHtml({ transfer: tr(), tab: 'holding' }), /xfImport/);
  assert.doesNotMatch(T.drawerHtml({ transfer: tr({ status: 'Draft Generated' }), tab: 'project' }), /xfImport/); assert.doesNotMatch(T.drawerHtml({ transfer: tr({ kind: 'msa' }), tab: 'project' }), /xfImport/);
  assert.equal(I.check(tr({ status: 'Pushed' }), []).err, 'Only an approved transcript can be imported. Approve it first.'); assert.ok(I.check(tr({ kind: 'brd' }), []).err);
});
t('the source keeps system, ref, transfer id and the APPROVED version', () => {
  const c = I.check(tr(), []); assert.deepEqual(c.source, { system: 'teams', ref: 'meetings/abc/transcript.vtt', transferId: 'x-' + 'a'.repeat(32), version: 2 }); assert.equal(c.existing, undefined);
});
t('a second import of the same transfer version finds the existing record; a new version or another transfer does not', () => {
  const src = I.check(tr(), []).source; const items = [{ id: 'tr_1', source: src }];
  assert.equal(I.check(tr(), items).existing.id, 'tr_1');
  assert.equal(I.check(tr({ approvedVer: 3 }), items).existing, undefined); assert.equal(I.check(tr({ id: 'x-' + 'b'.repeat(32) }), items).existing, undefined);
  assert.equal(I.check(tr(), [{ id: 'tr_1', source: src, removed: true }]).existing, undefined);   // a removed record does not block a new import
  assert.equal(I.findImported(null, src), null);
});
t('build parses the stored content into "Speaker: text" lines and names the file after the transfer', () => {
  const b = I.build(tr(), { version: { n: 2 }, content: VTT, intact: true }); assert.equal(b.text, 'Priya: We need approvals before closing.\nSam: Noted.'); assert.equal(b.info.format, 'vtt'); assert.equal(b.info.chunks[0].at, 1);
  assert.equal(b.name, 'Kick-off call (transfer v2).txt');
  assert.equal(I.build(tr({ source: { system: 'x', ref: 'a/b:c*d?.txt' } }), { version: { n: 2 }, content: 'Priya: hi', intact: true }).name, 'a b c d .txt (transfer v2).txt');
});
t('build refuses a different version, a failed checksum, empty or non-text content', () => {
  assert.match(I.build(tr(), { version: { n: 3 }, content: VTT, intact: true }).err, /approved version could not be read/); assert.match(I.build(tr(), null).err, /approved version/);
  assert.match(I.build(tr(), { version: { n: 2 }, content: VTT, intact: false }).err, /checksum/);
  ['', '   \n', null, 5, { a: 1 }].forEach(c => assert.match(I.build(tr(), { version: { n: 2 }, content: c, intact: true }).err, /No speech/));
});
t('a transfer written by hostile text is only ever data', () => {
  const evil = '<script>alert(1)</script>: <img src=x onerror=alert(1)>\n'.repeat(3); const b = I.build(tr({ source: { system: '<b>', ref: '../../x', label: '<script>' } }), { version: { n: 2 }, content: evil, intact: true });
  assert.ok(b.text.length > 0); assert.ok(!/[\\/:*?"<>|]/.test(b.name.replace(/ \(transfer v2\)\.txt$/, '')));   // no path or markup characters in the file name
});
console.log(n + ' transcript import checks passed');
