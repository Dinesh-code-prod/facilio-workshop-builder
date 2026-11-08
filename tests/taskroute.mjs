// Where a task belongs (src/taskroute.js): the stage and type come from the words, the first matching rule wins, nothing fits an empty row.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const { route } = createRequire(import.meta.url)('../src/taskroute.js');
const cases = [
  ['Fix the work order bug reported in hypercare week 2', 'Issue / Blocker', 'Go-Live & Handover'],
  ['Production issue: meter readings missing after go-live', 'Issue / Blocker', 'Go-Live & Handover'],
  ['Run UAT cycle 1 and log defects', 'UAT Task', 'Testing & UAT'],
  ['Prepare the cutover plan and end-user training', 'Go-Live / Handover Task', 'Go-Live & Handover'],
  ['Write the tester guide', 'UAT Task', 'Testing & UAT'],
  ['SSO integration with Azure AD', 'Implementation Task', 'Implementation & Integrations'],
  ['Data migration of the asset register', 'Implementation Task', 'Implementation & Integrations'],
  ['Configure the approval state flow for work orders', 'Implementation Task', 'Configuration & Documentation'],
  ['Send the BRD draft for sign-off', 'BRD Task', 'Requirements & Workshops'],
  ['Clarify the requirements for visitor management', 'Requirement Task', 'Requirements & Workshops'],
  ['Request access to the customer environment for kick-off', 'Internal Action', 'Project Setup & Kickoff'],
  ['Collect lessons learned and close the project', 'Internal Action', 'Closure & Follow-Up']
];
let n = 0; for (const [title, type, stage] of cases) { const r = route({ title }); assert.deepEqual([r.type, r.stage], [type, stage], title); n++; }
assert.deepEqual(route({ title: 'Please confirm the shift timings' }), { type: 'Customer Question', stage: '', why: 'question' });
assert.equal(route({ title: 'Please confirm the BRD scope?' }).type, 'Customer Question', 'a question about the BRD is a customer question'); assert.equal(route({ title: 'Please confirm the BRD scope?' }).stage, 'Requirements & Workshops');
assert.equal(route({ title: 'Is the UAT date confirmed?' }).type, 'UAT Task', 'a testing question stays a testing task');
assert.equal(route({ title: 'Roof leak', module: 'Maintenance' }).stage, '', 'no guess without a reason');
assert.deepEqual(route({}), { type: '', stage: '', why: '' }); assert.deepEqual(route(null), { type: '', stage: '', why: '' });
assert.equal(route({ title: 'Check', sheet: 'Hypercare issues' }).stage, 'Go-Live & Handover', 'the sheet name counts');
console.log((n + 6) + ' task routing checks passed');
