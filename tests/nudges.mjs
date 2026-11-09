// Lifecycle nudges (work/server/_nudges.mjs): the owners' message is worded from the health signals, only critical and high ones count, and the key lets the same worry through at most every three days.
import assert from 'node:assert/strict';
import { lifecycleMessage } from '../work/server/_nudges.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const P = { id: 'p_1', name: 'Riverside Towers', customer: 'Riverside' };
const sig = (code, sev, title, action) => ({ code, sev, title, action });
const H = (signals, health) => ({ health: health || 'at_risk', signals });

t('nothing critical or high: no message', () => { assert.equal(lifecycleMessage(P, H([]), '2026-11-09'), null); assert.equal(lifecycleMessage(P, H([sig('idle', 'medium', 'No activity for 14 days', 'Check in')]), '2026-11-09'), null); assert.equal(lifecycleMessage(P, null, '2026-11-09'), null); });
t('critical and high signals are worded, critical first, with the next step and the health', () => {
  const m = lifecycleMessage(P, H([sig('milestone_late', 'high', '2 plan steps recorded as not done after the end date', 'Review the plan with the owner.'), sig('blocked', 'critical', 'A critical task is blocked', 'Unblock it today.'), sig('idle', 'medium', 'quiet', 'x')], 'blocked'), '2026-11-09');
  assert.equal(m.title, '2 things need attention · Riverside Towers'); assert.match(m.text, /^A critical task is blocked; 2 plan steps/); assert.match(m.detail, /Next step: Unblock it today\./); assert.ok(!/quiet/.test(m.detail), 'medium signals are left out');
  assert.deepEqual(m.facts.map(f => f.value), ['Blocked', '1', '1']);
});
t('one signal reads in the singular, and a long list is cut to five with a count', () => {
  assert.equal(lifecycleMessage(P, H([sig('a', 'high', 'One', 'Do it')]), '2026-11-09').title, '1 thing needs attention · Riverside Towers');
  const many = Array.from({ length: 8 }, (_, i) => sig('c' + i, 'high', 'Signal ' + i, 'Act')); const m = lifecycleMessage(P, H(many), '2026-11-09'); assert.match(m.detail, /and 3 more$/); assert.equal(m.detail.split('Next step').length - 1, 5);
});
t('the key is the same for the same signals within three days and changes with the signals or after three days', () => {
  const a = lifecycleMessage(P, H([sig('x', 'high', 'X', 'a')]), '2026-11-09').key; const b = lifecycleMessage(P, H([sig('x', 'high', 'X', 'a')]), '2026-11-10').key;
  assert.equal(a.split('|')[2], b.split('|')[2]); assert.ok(a === b || a.split('|')[3] !== b.split('|')[3], 'consecutive days share a window except across its edge');
  assert.notEqual(lifecycleMessage(P, H([sig('x', 'high', 'X', 'a'), sig('y', 'high', 'Y', 'b')]), '2026-11-09').key, a, 'a new signal is sent at once');
  assert.notEqual(lifecycleMessage(P, H([sig('x', 'high', 'X', 'a')]), '2026-11-20').key, a, 'after three days it is sent again');
});
console.log(n + ' lifecycle nudge checks passed');
