// The shared Claude conversation (src/workchat.js): messages with actions and reply boxes, tiles with state, escaping.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../src/workchat.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('messages come in order with the sender, typing dots, action buttons and reply boxes', () => {
  const h = W.html({ title: 'T', messages: [{ who: 'you', text: 'Uploaded it' }, { who: 'claude', text: 'Do you want to approve?', actions: [{ label: 'Approve', act: 'koApproveIntake', primary: true }, { label: 'Review first', act: 'nav', attrs: { view: 'kickoff' } }] }, { who: 'claude', text: 'Preparing now', typing: true }, { who: 'claude', text: 'One question', reply: { fields: [{ value: 'x', attrs: { act: 'koAns', id: 'jb_1', i: 0 } }], send: { label: 'Send', act: 'koSend', attrs: { id: 'jb_1', n: 1 } } } }] });
  assert.ok(h.indexOf('Uploaded it') < h.indexOf('Do you want to approve?')); assert.ok(h.includes('ki-row you') && h.includes('ki-row claude')); assert.equal((h.match(/ko-typing/g) || []).length, 1);
  assert.ok(h.includes('data-act="koApproveIntake"') && h.includes('data-view="kickoff"')); assert.ok(h.includes('<textarea') && h.includes('data-act="koSend"') && h.includes('data-n="1"'));
});
t('tiles show their state, the badge, and an Open button only when ready', () => {
  const h = W.html({ tiles: [{ label: 'Project plan', detail: '15 phases', state: 'done', badge: 'Approved', open: { label: 'Open', act: 'koOpen', attrs: { view: 'plan', t: 'wb' } } }, { label: 'Kick-off deck', state: 'now', open: { label: 'Open', act: 'koOpen' } }, { label: 'Sessions', state: 'weird' }] });
  assert.ok(h.includes('ki-tile done') && h.includes('ki-tile now') && h.includes('ki-tile todo')); assert.ok(h.includes('<em>Approved</em>')); assert.equal((h.match(/data-act="koOpen"/g) || []).length, 1); assert.ok(h.includes('Preparing…'));
});
t('unknown senders and states fall back, attribute names are limited, all text is escaped', () => {
  const h = W.html({ title: '<b>x</b>', messages: [{ who: 'evil" onclick="x', text: '<img src=x onerror=alert(1)>', actions: [{ label: '<script>1</script>', act: 'a"b', attrs: { 'x" onclick="y': 'v', ok: '"><i>' } }] }] });
  assert.ok(!h.includes('<img src=x') && !h.includes('<script>1') && !h.includes('onclick="x') && !h.includes('onclick="y') && !h.includes('<i>')); assert.ok(h.includes('ki-row claude'));
});
t('the composer is placed under the feed; an empty chat does not break', () => { assert.ok(W.html({ composer: '<b>c</b>' }).includes('<div class="ki-comp"><b>c</b></div>')); assert.ok(W.html({}).includes('Claude is working')); });
console.log(n + ' work chat checks passed');
