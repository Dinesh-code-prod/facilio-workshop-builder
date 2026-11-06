// The prototype brief for Meteor (src/mockup.js): built only from applied or confirmed design, empty when nothing is applied, plain text, no invented parts.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
globalThis.FWB = { S: { project: { customer: 'Al Moallam', name: 'Rollout' }, ws: { flows: {}, crossLinks: {}, requirements: [] } }, esc, doc: () => ({ items: [] }), allModules: () => [], moduleView: () => ({}), effFields: () => [], formsForModule: () => [], fieldLabel: x => x };
globalThis.FWBViews = { ACT: {}, toast() { }, isCustomer: () => false };
createRequire(import.meta.url)('../src/mockup.js'); const { build } = globalThis.FWBViews.mockupLogic;
const empty = build({ customer: 'Al Moallam', project: 'Rollout', modules: [{ label: 'Asset', flows: [], fields: [], forms: [], requirements: [] }], crosslinks: [], apps: [] });
assert.equal(empty.empty, true, 'a module with nothing applied gives nothing'); assert.equal(empty.counts.modules, 0);
const d = { customer: 'Al Moallam', project: 'Rollout', modules: [
  { label: 'Work Order', requirements: [{ id: 'WO-001', title: 'Weekly report', objective: 'A report every week.' }], flows: [{ name: 'WO flow', states: ['Open', 'Approved', 'Closed'], transitions: [{ name: 'Approve', from: 'Open', to: 'Approved' }, { name: 'Close', from: 'Approved', to: 'Closed' }] }], fields: [{ label: 'Warranty end', type: 'Date', required: true, options: [] }, { label: 'Priority band', type: 'Picklist', required: false, options: ['A', 'B'] }], forms: [{ label: 'Quick add', sections: [{ name: 'Details', fields: ['Name', 'Warranty end'] }] }] },
  { label: 'Asset', requirements: [], flows: [], fields: [], forms: [] }],
  crosslinks: [{ from: 'Service Request', to: 'Work Order', name: 'Create the work order', condition: 'approved' }],
  apps: [{ name: 'Multi-technician view', module: 'Work Order', trigger: 'button', triggerLabel: 'Assign', purpose: 'Assign several technicians at once', shows: 'a calendar', users: ['Dispatcher'] }] };
const r = build(d); assert.equal(r.empty, false); assert.deepEqual(r.counts, { modules: 1, flows: 1, fields: 2, forms: 1, crosslinks: 1, apps: 1, requirements: 1 });
for (const s of ['# Prototype brief: Al Moallam · Rollout', '## Work Order', '- WO-001 Weekly report: A report every week.', 'State flow “WO flow”: Open, Approved, Closed.', '- Approve: Open → Approved', '- Warranty end (Date, required)', '- Priority band (Picklist: A, B)', 'Form “Quick add”:', '- Details: Name, Warranty end', '## Flows across modules', '- Service Request → Work Order: Create the work order (when approved)', '## Connected apps', '- Multi-technician view (Work Order): opens from the Assign button. Assign several technicians at once It shows: a calendar Used by: Dispatcher.'])
  assert.ok(r.text.includes(s), 'the brief has: ' + s);
assert.ok(!r.text.includes('## Asset'), 'a module with nothing applied is left out'); assert.ok(r.text.includes('do not invent'), 'it tells Meteor not to invent'); assert.ok(r.text.endsWith('\n'));
const only = build({ customer: '', project: 'P', modules: [], crosslinks: [], apps: [d.apps[0]] }); assert.equal(only.empty, false, 'a connected app alone is enough'); assert.ok(only.text.startsWith('# Prototype brief: P'));
console.log('4 mockup brief checks passed');
