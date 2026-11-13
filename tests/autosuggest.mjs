// Suggestions from the state flows (src/autosuggest.js): who works on a module, and who is told when a record moves.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const AS = createRequire(import.meta.url)('../src/autosuggest.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const flow = { module: 'workorder', name: 'WO flow', states: [{ id: 's1', label: 'Open' }, { id: 's2', label: 'Assigned' }, { id: 's3', label: 'Closed' }],
  transitions: [{ name: 'Assign', from: 's1', to: 's2', type: 'user', actors: [{ actor: 'sup' }] }, { name: 'Close', from: 's2', to: 's3', type: 'user', actors: [{ actor: 'tech' }], approval: { required: true, approvers: ['mgr'] } },
    { name: 'Old', from: 's1', to: 's3', removed: true, actors: [{ actor: 'gone' }] }, { name: 'Who', from: 's1', to: 's2', actors: [{ actor: 'tbc:any' }] }] };
t('a role that moves or approves a record gets Create & edit on that module; removed transitions and unknown roles are left out', () => {
  assert.deepEqual(AS.roleLevels([flow]), { sup: { workorder: 'edit' }, tech: { workorder: 'edit' }, mgr: { workorder: 'edit' } });
});
t('notifications: a new record tells who acts first, each state tells who acts next, and what is already recorded is not suggested again', () => {
  const s = AS.notifications([flow], a => a.toUpperCase(), []);
  assert.deepEqual(s.map(x => [x.trigger, x.state, x.recipients.join(',')]), [['created', '', 'SUP'], ['state', 'Assigned', 'TECH,MGR']]);
  assert.equal(AS.notifications([flow], a => a, [{ module: 'workorder', trigger: 'state', state: 'Assigned' }]).length, 1);
  assert.deepEqual(AS.notifications([], null, []), []);
});
console.log(n + ' state-flow suggestion checks passed');
