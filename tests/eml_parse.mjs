// Reading an .eml in the browser: sender, subject, date, plain text, quoted-printable, base64, HTML-only and attachments. Run: node tests/eml_parse.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { parseEml } = createRequire(import.meta.url)('../src/emlimport.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('a plain message', () => { const m = parseEml('From: "Priya Nair" <priya@acme.com>\r\nSubject: Site list\r\nDate: Fri, 31 Oct 2026 10:00:00 +0000\r\nMessage-ID: <a1@acme>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nHello team,\r\nSee the list.'); assert.equal(m.from.email, 'priya@acme.com'); assert.equal(m.from.name, 'Priya Nair'); assert.equal(m.subject, 'Site list'); assert.equal(m.messageId, 'a1@acme'); assert.match(m.body, /See the list/); assert.equal(m.receivedAt, '2026-10-31T10:00:00.000Z'); });
t('encoded subject and quoted-printable body', () => { const m = parseEml('From: a@b.co\nSubject: =?UTF-8?B?Q2Fmw6k=?=\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\nCaf=C3=A9 is =\nopen'); assert.equal(m.subject, 'Café'); assert.equal(m.body, 'Café is open'); });
t('multipart: prefers text, lists attachments, falls back to HTML', () => { const mp = (parts) => 'From: x@y.com\nSubject: s\nContent-Type: multipart/mixed; boundary="B"\n\n' + parts.map(p => '--B\n' + p).join('\n') + '\n--B--'; 
  const a = parseEml(mp(['Content-Type: text/plain\n\nPlain words', 'Content-Type: text/html\n\n<b>Html words</b>', 'Content-Type: application/pdf; name="plan.pdf"\nContent-Disposition: attachment; filename="plan.pdf"\n\nJVBER'])); assert.equal(a.body, 'Plain words'); assert.deepEqual(a.attachments, [{ name: 'plan.pdf' }]);
  const b = parseEml(mp(['Content-Type: text/html\n\n<p>Only <b>html</b></p>'])); assert.equal(b.body, 'Only html'); });
t('no readable sender gives an empty address so the importer can refuse it', () => assert.equal(parseEml('Subject: x\n\nbody').from.email, ''));
console.log(n + ' eml checks passed');
