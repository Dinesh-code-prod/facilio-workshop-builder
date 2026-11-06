// Design proposals (work/server/_dsapi.mjs): cleaning, merging, never overwriting a decided one, limits.
import assert from 'node:assert/strict'; import { cleanProposal, mergeProposals, KINDS, LIMITS } from '../work/server/_dsapi.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); }; const NOW = '2026-11-06T10:00:00Z';
const flow = (o = {}) => Object.assign({ kind: 'flow', module: 'Work Order', name: 'Work order flow', basedOn: 'changed', states: ['Open', 'Approved', 'In Progress', 'Closed'], transitions: [{ from: 'Open', to: 'Approved', name: 'Approve' }, { from: 'Approved', to: 'In Progress', name: 'Start' }, { from: 'In Progress', to: 'Closed', name: 'Close' }], why: 'Session 3 added an approval step', quote: 'every work order needs a manager approval' }, o);
t('a flow is cleaned: states and transitions must match, duplicates and bad transitions are dropped', () => {
  const c = cleanProposal(flow({ states: ['Open', 'open', 'Approved', 'Closed'], transitions: [{ from: 'OPEN', to: 'approved', name: 'Approve' }, { from: 'Open', to: 'Nowhere', name: 'x' }, { from: 'Open', to: 'Open', name: 'self' }, { from: 'Approved', to: 'Closed' }] }));
  assert.deepEqual(c.states, ['Open', 'Approved', 'Closed']); assert.deepEqual(c.transitions.map(x => x.from + '>' + x.to), ['Open>Approved', 'Approved>Closed']); assert.equal(c.transitions[1].name, 'Approved to Closed'); assert.equal(c.basedOn, 'changed');
  assert.equal(cleanProposal(flow({ states: ['Open'] })), null); assert.equal(cleanProposal(flow({ transitions: [] })), null); assert.equal(cleanProposal(flow({ module: '' })), null); assert.equal(cleanProposal({ kind: 'idea' }), null); assert.equal(cleanProposal(null), null); assert.equal(cleanProposal(flow({ basedOn: 'anything' })).basedOn, 'new');
});
t('a cross-module action needs two different modules and a name', () => {
  const c = cleanProposal({ kind: 'crosslink', from: 'Service Request', to: 'Work Order', name: 'Create the work order', linkKind: 'bad', condition: 'when approved' }); assert.equal(c.linkKind, 'create_record'); assert.equal(c.condition, 'when approved');
  assert.equal(cleanProposal({ kind: 'crosslink', from: 'Work Order', to: 'work order', name: 'x' }), null); assert.equal(cleanProposal({ kind: 'crosslink', from: 'A', to: 'B' }), null); assert.ok(KINDS.includes('flow') && KINDS.includes('crosslink'));
});
t('saving again replaces the same open proposal, keeps other open ones and never touches a decided one', () => {
  const a = mergeProposals([], [flow(), { kind: 'crosslink', from: 'Service Request', to: 'Work Order', name: 'Create the work order' }], NOW); assert.equal(a.added, 2);
  const applied = a.items.map(p => (p.kind === 'flow' ? Object.assign({}, p, { status: 'applied', by: 'a@x.com' }) : p));
  const again = mergeProposals(applied, [flow({ description: 'new text' }), { kind: 'crosslink', from: 'Work Order', to: 'Inventory', name: 'Reserve parts' }, { kind: 'crosslink', from: 'Service Request', to: 'Work Order', name: 'Create the work order', condition: 'v2' }], NOW);
  assert.equal(again.added, 2, 'the applied flow is not added again; the crosslink v2 and the new one are'); assert.equal(again.items.filter(p => p.kind === 'flow').length, 1); assert.equal(again.items.find(p => p.kind === 'flow').status, 'applied');
  assert.equal(again.items.filter(p => p.kind === 'crosslink' && p.name === 'Create the work order').length, 1, 'replaced, not doubled'); assert.equal(again.items.find(p => p.name === 'Create the work order').condition, 'v2'); assert.equal(new Set(again.items.map(p => p.id)).size, again.items.length);
});
t('limits: per call and in total', () => {
  const many = Array.from({ length: 100 }, (_, i) => flow({ name: 'F' + i })); assert.equal(mergeProposals([], many, NOW).added, LIMITS.perCall);
  const full = Array.from({ length: LIMITS.total }, (_, i) => ({ id: 'dp_' + (i + 1), kind: 'flow', module: 'M', name: 'n' + i, status: 'applied' })); assert.throws(() => mergeProposals(full, [flow()], NOW), /design proposals already/);
});
t('a field and a form are cleaned: type must be a known one, a form needs sections with fields', () => {
  const f = cleanProposal({ kind: 'field', module: 'Asset', label: ' Warranty end ', fieldType: 'date', required: true, options: ['a', ''], why: 'asked' }); assert.equal(f.name, 'Warranty end'); assert.equal(f.fieldType, 'Date'); assert.equal(f.required, true); assert.deepEqual(f.options, ['a']);
  assert.equal(cleanProposal({ kind: 'field', module: 'Asset', label: 'X', fieldType: 'weird' }).fieldType, 'Single Line Text'); assert.equal(cleanProposal({ kind: 'field', module: '', label: 'X' }), null);
  const o = cleanProposal({ kind: 'form', module: 'Asset', name: 'Quick add', sections: [{ name: 'Details', fields: ['Name', { field: 'Warranty end', required: true }, ''] }, { name: 'Empty', fields: [] }] }); assert.equal(o.sections.length, 1); assert.deepEqual(o.sections[0].fields.map(x => x.field), ['Name', 'Warranty end']); assert.equal(o.sections[0].fields[1].required, true);
  assert.equal(cleanProposal({ kind: 'form', module: 'Asset', name: 'F', sections: [] }), null);
  const a = mergeProposals([], [{ kind: 'field', module: 'Asset', label: 'Warranty end' }, { kind: 'form', module: 'Asset', name: 'Quick add', sections: [{ name: 'D', fields: ['Name'] }] }], NOW); assert.equal(a.added, 2);
});
t('a requirement and the BRD introduction are cleaned', () => {
  const r = cleanProposal({ kind: 'requirement', title: 'Weekly status report', objective: 'The customer gets a status report every week.', modules: ['Work Order', ''], classification: 'weird', rules: 'Sent on Monday' }); assert.equal(r.name, 'Weekly status report'); assert.equal(r.classification, 'change'); assert.deepEqual(r.modules, ['Work Order']); assert.equal(r.module, 'Work Order');
  assert.equal(cleanProposal({ kind: 'requirement', title: 'No objective' }), null); assert.equal(cleanProposal({ kind: 'requirement', objective: 'No title' }), null);
  const i = cleanProposal({ kind: 'brdintro', background: 'Al Moallam runs hotels.' }); assert.equal(i.name, 'BRD introduction'); assert.equal(cleanProposal({ kind: 'brdintro' }), null);
  const a = mergeProposals([], [{ kind: 'requirement', title: 'A', objective: 'o' }, { kind: 'requirement', title: 'A', objective: 'o2' }, i], NOW); assert.equal(a.added, 2, 'the same requirement twice is one');
});
t('a connected app needs a module, a name and a purpose; the trigger must be a known one', () => {
  const a = cleanProposal({ kind: 'connectedapp', module: 'Work Order', name: 'Multi-technician view', trigger: 'button', triggerLabel: 'Assign', purpose: 'Assign several technicians at once', shows: 'Calendar of technicians', users: ['Dispatcher', ''] }); assert.equal(a.trigger, 'button'); assert.equal(a.triggerLabel, 'Assign'); assert.deepEqual(a.users, ['Dispatcher']);
  assert.equal(cleanProposal({ kind: 'connectedapp', module: 'Work Order', name: 'X', trigger: 'weird', purpose: 'p' }).trigger, 'button'); assert.equal(cleanProposal({ kind: 'connectedapp', module: 'Work Order', name: 'X' }), null); assert.equal(cleanProposal({ kind: 'connectedapp', name: 'X', purpose: 'p' }), null);
});
console.log(n + ' design proposal checks passed');
