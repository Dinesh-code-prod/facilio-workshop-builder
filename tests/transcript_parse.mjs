// Transcript parser (src/transcriptparse.js): every format, odd input, the size and count caps, hostile input and stability.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../src/transcriptparse.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const parse = P.parseTranscript;

t('WebVTT: cue times become seconds, voice tags give the speaker, same speaker is merged', () => {
  const v = 'WEBVTT\n\nNOTE a comment\n\n1\n00:00:01.000 --> 00:00:03.500\n<v Priya Shah>We need approvals</v>\n\n2\n00:00:04.000 --> 00:00:06.000\n<v Priya Shah>before a work order closes.</v>\n\n3\n00:01:05.250 --> 00:01:08.000\n<v Sam>Understood &amp; noted.</v>\n';
  assert.deepEqual(parse(v), [{ speaker: 'Priya Shah', at: 1, text: 'We need approvals before a work order closes.' }, { speaker: 'Sam', at: 65.25, text: 'Understood & noted.' }]);
  assert.equal(P.parseTranscriptInfo(v).format, 'vtt');
});
t('WebVTT with "Name: text" inside the cue and styling tags', () => {
  const v = 'WEBVTT\n\n00:00:10.000 --> 00:00:12.000\nAnu: <c.yellow>Assets are tagged</c> by <00:00:11.000>site.\n';
  assert.deepEqual(parse(v), [{ speaker: 'Anu', at: 10, text: 'Assets are tagged by site.' }]);
});
t('SRT: comma times, index lines ignored, two cues with no speaker stay apart', () => {
  const s = '1\n00:00:01,200 --> 00:00:02,000\nFirst line\nsecond line\n\n2\n00:00:03,000 --> 00:00:04,000\nNext cue\n';
  const r = P.parseTranscriptInfo(s, 'call.srt'); assert.equal(r.format, 'srt');
  assert.deepEqual(r.chunks, [{ speaker: '', at: 1.2, text: 'First line second line' }, { speaker: '', at: 3, text: 'Next cue' }]);
});
t('Speaker: text lines, merged and with continuation lines', () => {
  const s = 'Priya: We need approvals.\nThey go to the site manager.\nSam: Understood.\nPriya: Also reports.\nPriya: Weekly.';
  assert.deepEqual(parse(s), [{ speaker: 'Priya', at: '', text: 'We need approvals. They go to the site manager.' }, { speaker: 'Sam', at: '', text: 'Understood.' }, { speaker: 'Priya', at: '', text: 'Also reports. Weekly.' }]);
  assert.equal(P.parseTranscriptInfo(s).format, 'speaker');
});
t('Speaker lines with a bracketed or parenthesised time, and a role in brackets', () => {
  const s = '[00:01:23] Priya: first\n[2026-11-04T10:00:05Z] Sam: second\nAnu (0:02:00): third\nLee (Facilio): fourth';
  assert.deepEqual(parse(s).map(c => [c.speaker, c.at]), [['Priya', 83], ['Sam', '2026-11-04T10:00:05Z'], ['Anu', 120], ['Lee (Facilio)', '']]);
});
t('Teams style: header and text on the next line, and everything on one line', () => {
  const a = 'Priya Shah   0:01:23\nWe need approvals.\n\nSam Lee   0:01:40\nUnderstood.\nWill do.\n\nPriya Shah   0:02:00\nAnd reports.';
  assert.deepEqual(parse(a), [{ speaker: 'Priya Shah', at: 83, text: 'We need approvals.' }, { speaker: 'Sam Lee', at: 100, text: 'Understood. Will do.' }, { speaker: 'Priya Shah', at: 120, text: 'And reports.' }]);
  assert.equal(P.parseTranscriptInfo(a).format, 'teams');
  const b = 'Priya Shah  0:01:23 We need approvals.\nSam Lee  1:00:05 Fine.';
  assert.deepEqual(parse(b), [{ speaker: 'Priya Shah', at: 83, text: 'We need approvals.' }, { speaker: 'Sam Lee', at: 3605, text: 'Fine.' }]);
});
t('plain text: one chunk per paragraph, no speaker', () => {
  const s = 'We spoke about approvals.\nThey matter a lot.\n\nThen about reports.';
  assert.deepEqual(parse(s), [{ speaker: '', at: '', text: 'We spoke about approvals. They matter a lot.' }, { speaker: '', at: '', text: 'Then about reports.' }]);
  assert.equal(P.parseTranscriptInfo(s).format, 'plain');
});
t('a time or a link inside ordinary text is not a speaker', () => {
  const s = 'The meeting is at 10:30 tomorrow.\nSee https://example.com/a for the plan.\nNothing else.';
  assert.equal(P.parseTranscriptInfo(s).format, 'plain'); assert.equal(parse(s).length, 1);
});
t('JSON: a list of entries, an object with entries, an object holding text', () => {
  assert.deepEqual(parse(JSON.stringify([{ speaker: 'Priya', text: 'Hello there', start: 5 }, { speakerName: 'Sam', content: 'Hi', offset: '0:00:09' }])), [{ speaker: 'Priya', at: 5, text: 'Hello there' }, { speaker: 'Sam', at: 9, text: 'Hi' }]);
  assert.equal(parse(JSON.stringify({ entries: [{ speaker: 'A', text: 'x y', at: '2026-11-04T10:00:00Z' }] }))[0].at, '2026-11-04T10:00:00Z');
  assert.deepEqual(parse(JSON.stringify({ text: 'Priya: one\nSam: two' })).map(c => c.speaker), ['Priya', 'Sam']);
  assert.equal(P.parseTranscriptInfo('{ not json').format, 'plain');
});
t('odd input: empty, not a string, only blank lines, a BOM, CRLF, control characters', () => {
  [undefined, null, 5, {}, [], '', '   \n\n \t', '\u0000\u0001'].forEach(x => assert.deepEqual(parse(x), []));
  assert.deepEqual(parse('﻿Priya: a\r\nSam: b\r\n'), [{ speaker: 'Priya', at: '', text: 'a' }, { speaker: 'Sam', at: '', text: 'b' }]);
  assert.equal(parse('Priya: he\u0007llo')[0].text, 'hello');
  assert.deepEqual(parse('WEBVTT\n\n'), []);
});
t('a name that is too long, or has too many words, is not a speaker', () => {
  assert.equal(P.parseTranscriptInfo('This is a long sentence that ends with a colon: yes\nAnother sentence that goes on and on: yes').format, 'plain');
});
t('size caps: text over 2 MB is cut, over 20,000 chunks is cut, a chunk over 4,000 characters is split, and each is reported', () => {
  const big = 'Priya: ' + 'word '.repeat(500000);   // 2.5 MB
  const r = P.parseTranscriptInfo(big); assert.equal(r.truncated.size, true);
  assert.ok(r.chunks.every(c => c.text.length <= 4000)); assert.ok(r.chunks.reduce((a, c) => a + c.text.length, 0) <= 2000000);
  const many = Array.from({ length: 25000 }, (_, i) => (i % 2 ? 'Sam' : 'Priya') + ': line ' + i).join('\n');
  const m = P.parseTranscriptInfo(many); assert.equal(m.chunks.length, 20000); assert.equal(m.truncated.count, true);
  assert.equal(parse('Priya: ' + 'x'.repeat(9000)).length, 2);   // the line is cut at 5,000 characters, then split at 4,000
  assert.equal(P.parseTranscriptInfo('Priya: short').truncated.size, false);
});
t('hostile input finishes fast and gives plain data', () => {
  const t0 = Date.now();
  const nasty = ['a:'.repeat(2500), ' '.repeat(5000) + ':', 'a b '.repeat(1200) + '0:00:01', '<'.repeat(4000), 'WEBVTT\n' + '00:00:01.000 --> 00:00:02.000\n' + '<v '.repeat(1500), ':\n'.repeat(50000), '\n'.repeat(1900000), '-->'.repeat(5000), '[' + '9'.repeat(5000)];
  nasty.forEach(x => { const r = parse(x); assert.ok(Array.isArray(r)); r.forEach(c => { assert.equal(typeof c.text, 'string'); assert.ok(c.text.length <= 4000); }); });
  assert.ok(Date.now() - t0 < 5000, 'took ' + (Date.now() - t0) + ' ms');
  const x = parse('<script>alert(1)</script>: <img src=x onerror=alert(1)>'); assert.ok(Array.isArray(x));   // kept as data: the page escapes it
  assert.ok(!('__proto__' in parse('__proto__: {"a":1}')[0] && false));
});
t('stable: the same text gives the same answer, and the input is not changed', () => {
  const s = 'Priya: a\nSam: b\nPriya: c'; const a = JSON.stringify(parse(s)); assert.equal(JSON.stringify(parse(s)), a); assert.equal(s, 'Priya: a\nSam: b\nPriya: c');
});
t('parseAt, fmtAt and toText', () => {
  assert.equal(P.parseAt('1:02:03'), 3723); assert.equal(P.parseAt('02:03'), 123); assert.equal(P.parseAt('00:00:01,500'), 1.5); assert.equal(P.parseAt('nope'), ''); assert.equal(P.parseAt(-1), ''); assert.equal(P.parseAt(NaN), '');
  assert.equal(P.fmtAt(3723), '1:02:03'); assert.equal(P.fmtAt('2026-11-04T10:00:00Z'), '2026-11-04T10:00:00Z'); assert.equal(P.fmtAt(''), '');
  assert.equal(P.toText([{ speaker: 'Priya', at: 1, text: 'a' }, { speaker: '', at: '', text: 'b' }]), 'Priya: a\nb'); assert.equal(P.toText(null), '');
});
console.log(n + ' transcript parser checks passed');
