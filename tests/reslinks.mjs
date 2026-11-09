// Notes & Links helpers (src/reslinks.js): clickable addresses in notes, type guessing for pasted links, the private-note rule.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('../src/reslinks.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('an address in a note becomes a link that opens in a new tab', () => {
  const h = R.linkify('See https://miro.com/app/board/abc123/ for the flow.');
  assert.match(h, /<a class="rs-a" href="https:\/\/miro\.com\/app\/board\/abc123\/" target="_blank" rel="noopener noreferrer"/); assert.ok(h.endsWith('for the flow.'));
});
t('the full stop or bracket after an address is not part of the link', () => {
  assert.match(R.linkify('Link: https://a.example.com/x.'), /href="https:\/\/a\.example\.com\/x" [^>]*>[^<]*<\/a>\.$/);
  assert.match(R.linkify('(see https://a.example.com/x)'), /href="https:\/\/a\.example\.com\/x"/); assert.match(R.linkify('(see https://a.example.com/x)'), /<\/a>\)$/);
  assert.match(R.linkify('https://en.wikipedia.org/wiki/A_(b)'), /href="https:\/\/en\.wikipedia\.org\/wiki\/A_\(b\)"/);
});
t('note text is escaped: markup is shown as text and only http(s) addresses become links', () => {
  const h = R.linkify('<img src=x onerror=alert(1)> javascript:alert(1) https://ok.example.com/?a=1&b=2');
  assert.ok(!h.includes('<img') && h.includes('&lt;img')); assert.ok(!/href="javascript/i.test(h)); assert.match(h, /href="https:\/\/ok\.example\.com\/\?a=1&amp;b=2"/);
  assert.equal(R.linkify('a"b'), 'a&quot;b');
});
t('a quote or angle bracket ends an address', () => { assert.match(R.linkify('<https://a.example.com/p>'), /href="https:\/\/a\.example\.com\/p"/); assert.match(R.linkify('"https://a.example.com/p"'), /href="https:\/\/a\.example\.com\/p"/); });
t('a preview never cuts an address in half', () => {
  const s = 'Notes about the call. ' + 'https://example.com/' + 'x'.repeat(100); const p = R.preview(s, 40); assert.ok(!p.includes('https://')); assert.ok(p.endsWith('…'));
  assert.equal(R.preview('short', 40), 'short');
});
t('a pasted address is typed from where it lives', () => {
  const g = u => R.guessType(u);
  assert.equal(g('https://miro.com/app/board/x/'), 'Miro board'); assert.equal(g('https://www.figma.com/file/1'), 'Figma'); assert.equal(g('https://app.smartsheet.com/sheets/x'), 'SmartSheet');
  assert.equal(g('https://facilio-my.sharepoint.com/:f:/g/x'), 'SharePoint / OneDrive'); assert.equal(g('https://teams.microsoft.com/l/meetup-join/x'), 'Meeting link'); assert.equal(g('https://zoom.us/j/123'), 'Meeting link');
  assert.equal(g('https://www.loom.com/share/x'), 'Call recording'); assert.equal(g('https://cdn.example.com/rec/kickoff.mp4'), 'Call recording'); assert.equal(g('https://example.com/files/spec.pdf'), 'Document');
  assert.equal(g('https://docs.google.com/document/d/1'), 'Document'); assert.equal(g('https://example.com/'), 'Other'); assert.equal(g('not a url'), 'Other');
});
t('a pasted address gets a readable name', () => {
  assert.equal(R.guessName('https://example.com/files/Kick-off_notes.pdf'), 'Kick off notes'); assert.equal(R.guessName('https://miro.com/'), 'miro.com'); assert.equal(R.guessName('nope'), '');
});
t('a private note is visible only to its writer', () => {
  const note = { private: true, createdByEmail: 'Dinesh.R@facilio.com' };
  assert.equal(R.visibleTo(note, 'dinesh.r@facilio.com'), true); assert.equal(R.visibleTo(note, 'other@facilio.com'), false); assert.equal(R.visibleTo(note, ''), false);
  assert.equal(R.visibleTo({ private: false, createdByEmail: 'a@b.c' }, 'other@facilio.com'), true); assert.equal(R.visibleTo({ title: 'old note' }, 'other@facilio.com'), true);
});
console.log(n + ' reslinks checks passed');
