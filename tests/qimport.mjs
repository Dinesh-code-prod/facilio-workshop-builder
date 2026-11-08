// Questions from a file (src/qimport.js): a sheet of any layout and a document both give clean questions, filed under the project's modules; non-questions are left out.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const { fromRows, fromText } = createRequire(import.meta.url)('../src/qimport.js');
const mods = [{ name: 'workorder', label: 'Work Orders' }, { name: 'asset', label: 'Assets' }];
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('a sheet with a header: columns found by name, priority and module understood', () => {
  const r = fromRows([['Workshop questions list'], ['#', 'Question', 'Module', 'Priority', 'Why'], [1, 'Who approves a work order above the limit?', 'Work Orders', 'High', 'Approval path'], [2, 'How are assets tagged today?', '', 'low', ''], [3, '', '', '', '']], mods);
  assert.equal(r.length, 2); assert.deepEqual([r[0].module, r[0].priority, r[0].why], ['workorder', 'must', 'Approval path']); assert.deepEqual([r[1].module, r[1].priority], ['asset', 'could']); });
t('a sheet with no header uses the widest text column', () => { const r = fromRows([['1', 'What is the escalation time for urgent requests?', 'x'], ['2', 'Which sites use the mobile app?', 'y']], mods); assert.equal(r.length, 2); assert.match(r[0].text, /escalation/); });
t('a document: question lines and numbered asks are taken, other lines are not', () => {
  const r = fromText('Meeting notes\nThe customer is in Dubai.\n1. What reports do the managers need weekly?\n- Confirm the asset hierarchy\n- The weather was hot\nDoes the vendor portal need a login?', mods);
  assert.deepEqual(r.map(x => x.text), ['What reports do the managers need weekly?', 'Confirm the asset hierarchy', 'Does the vendor portal need a login?']); assert.equal(r[1].module, 'asset'); });
t('two questions on one line are split, repeats and tiny lines dropped', () => { const r = fromText('Who owns the budget? What is the go-live date?\nWho owns the budget?\nok?', mods); assert.equal(r.length, 2); });
t('empty and odd input does not throw', () => { assert.deepEqual(fromRows(null, mods), []); assert.deepEqual(fromText(null, mods), []); assert.deepEqual(fromRows([[null, undefined, {}]], mods), []); });
console.log(n + ' question import checks passed');
