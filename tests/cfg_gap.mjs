// Configuration gap table (src/cfggap.js): one row per component kind, missing inputs found and never guessed, setInput leaves the old table alone
// and keeps a change log, generated / imported / manual / validated / deployment-ready stay apart, and generation is blocked until inputs are complete.
// Usage: node tests/cfg_gap.mjs
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const G = require('../src/cfggap.js');
let n = 0, fails = 0; const t = (name, fn) => { try { fn(); n++; console.log('  ok  ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };
const reqs = [{ id: 'REQ-1', status: 'Confirmed' }, { id: 'REQ-2', status: 'Rejected' }, { id: 'REQ-3', status: 'Draft', fields: ['custom_permit.risk'] }];
const input = () => ({
  requirements: reqs,
  packageBaseline: { modules: { workorder: { fields: ['subject'] } } },
  modules: [
    { name: 'custom_permit', label: 'Permit', origin: 'new', requirementIds: ['REQ-1'],
      fields: [{ name: 'risk', label: 'Risk', type: 'Picklist', options: [] }, { name: 'issued', label: 'Issued to', type: 'Lookup', lookup: 'nosuchmodule' }, { name: 'sig', label: 'Signature', type: 'Signature' }, { name: 'ref', label: 'Reference', type: 'Single Line Text', reqs: [{ id: 'REQ-1' }] }, { name: 'untyped', label: 'No type', type: '' }],
      views: [{ id: 'v1', label: 'All Permits', columns: [{ name: 'name' }, { name: 'ref' }], reqs: [{ id: 'REQ-1' }] }, { id: 'v2', label: 'Hot', columns: [{ name: 'name' }], otherFilters: [{ field: 'x', op: 'is', value: '1' }] }, { id: 'v3', label: 'Empty', columns: [] }],
      statuses: [{ label: 'Requested', closed: true }, { label: 'Approved' }],
      workflows: [{ id: 'f1', name: 'Permit Flow', isNew: true, initial: null, states: [{ id: 's1', label: 'Requested', origin: 'proposed' }, { id: 's2', label: 'Approved', origin: 'proposed' }], transitions: [{ id: 't1', name: 'Approve', condition: 'after 30 days', actors: [{ actor: 'tbc:any', status: 'tbc' }] }] }],
      notifications: [{ id: 'n1', name: 'Permit approved', trigger: 'state', state: 'Approved', channels: { email: true }, recipients: [], subject: 'Approved', message: 'Done' }, { id: 'n2', name: 'Push only', trigger: 'created', channels: { push: true }, recipients: ['HSE'] }] },
    { name: 'workorder', label: 'Work Order', origin: 'baseline', fields: [{ name: 'subject', label: 'Subject', type: 'Single Line Text' }, { name: 'permit_ref', label: 'Permit reference', type: 'Single Line Text' }] }],
  relationships: [{ id: 'r1', from: 'Permit', to: 'Work Order', type: 'Reference (lookup)', status: 'Proposed' }, { id: 'r2', from: 'Work Order', to: 'Permit', type: 'Parent and child', status: 'Confirmed' }],
  roles: [{ id: 'role1', label: 'HSE Manager' }],
  scripts: [{ id: 'sc1', name: 'Close permits', type: 'scheduler', module: 'custom_permit', logic: '' }],
  connectedApps: [{ id: 'app1', name: 'Contractor app', integration: 'Reads permits', tabs: [{ name: 'Permits', roles: '' }] }]
});
const T0 = G.buildGapTable(input()); const row = id => T0.rows.find(r => r.id === id); const miss = r => r.missingInputs.filter(m => !m.manual).map(m => m.key);

t('there is one row per component, for every kind, with the fields the roadmap asks for', () => {
  const kinds = new Set(T0.rows.map(r => r.kind)); ['module', 'field', 'view', 'relationship', 'status', 'workflow', 'notification', 'role', 'script', 'connectedApp'].forEach(k => assert.ok(kinds.has(k), 'kind ' + k));
  assert.equal(new Set(T0.rows.map(r => r.id)).size, T0.rows.length, 'ids are unique');
  T0.rows.forEach(r => { ['item', 'kind', 'requirementIds', 'source', 'requiredConfiguration', 'generatedArtifact', 'missingInputs', 'dependencies', 'validationStatus', 'responsible', 'implementationStatus', 'state'].forEach(k => assert.ok(k in r, r.id + ' lacks ' + k)); assert.ok(['supported', 'not supported', 'none'].includes(r.generatedArtifact)); assert.ok(['not validated', 'valid', 'invalid', 'blocked'].includes(r.validationStatus)); assert.ok(G.SOURCES.concat(['unknown']).includes(r.source)); assert.ok(Object.keys(r.state).join() === 'generated,imported,manual,validated,deploymentReady'); });
  assert.equal(T0.version, 'cfggap/1');
});
t('fields: type not confirmed, picklist without options and an unverified lookup are missing inputs; unknown types are not supported', () => {
  assert.deepEqual(miss(row('field:custom_permit.untyped')), ['type']); assert.match(row('field:custom_permit.untyped').missingInputs[0].label, /field type not confirmed/);
  assert.ok(miss(row('field:custom_permit.risk')).includes('options')); assert.ok(miss(row('field:custom_permit.issued')).includes('lookupModule'));
  assert.equal(row('field:custom_permit.sig').generatedArtifact, 'not supported'); assert.equal(row('field:custom_permit.ref').generatedArtifact, 'supported'); assert.deepEqual(miss(row('field:custom_permit.ref')), []);
  assert.equal(row('field:custom_permit.ref').implementationStatus, 'ready to generate');
});
t('views: no columns and a column that is not a field are missing inputs; other filters are not supported; dependencies point at rows that exist', () => {
  assert.ok(miss(row('view:custom_permit.v3')).includes('columns')); assert.equal(row('view:custom_permit.v2').generatedArtifact, 'not supported'); assert.deepEqual(miss(row('view:custom_permit.v1')), []);
  assert.ok(row('view:custom_permit.v1').dependencies.includes('module:custom_permit') && row('view:custom_permit.v1').dependencies.includes('field:custom_permit.ref'));
  T0.rows.forEach(r => r.dependencies.forEach(d => assert.ok(row(d), r.id + ' depends on ' + d)));
});
t('workflow, status, notification, role, script, connected app and relationship gaps use the wording of the roadmap examples', () => {
  const w = row('workflow:custom_permit.f1'); assert.deepEqual(miss(w), ['initialState', 'conditions', 'transitionRoles']); assert.match(w.missingInputs[1].label, /workflow conditions incomplete/);
  assert.ok(row('status:custom_permit.approved') && miss(row('status:custom_permit.approved')).includes('closed')); assert.deepEqual(miss(row('status:custom_permit.requested')), []);
  assert.deepEqual(miss(row('notification:custom_permit.n1')), ['recipients']); assert.match(row('notification:custom_permit.n1').missingInputs[0].label, /notification recipient unknown/); assert.equal(row('notification:custom_permit.n2').generatedArtifact, 'not supported');
  assert.match(row('role:role1').missingInputs[0].label, /role permissions not final/); assert.match(row('script:custom_permit.sc1').missingInputs[0].label, /script logic needs confirmation/);
  assert.deepEqual(miss(row('connectedApp:app1')), ['endpoint', 'tabRoles']); assert.match(row('connectedApp:app1').missingInputs[0].label, /integration endpoint missing/);
  assert.match(row('relationship:r1').missingInputs[0].label, /relationship unverified/); assert.deepEqual(miss(row('relationship:r2')), []);
});
t('source and requirement links: confirmed BRD requirement, requirement matched by field, hub, package, and unknown stays unknown', () => {
  assert.equal(row('field:custom_permit.ref').source, 'brd'); assert.deepEqual(row('field:custom_permit.risk').requirementIds, ['REQ-3']); assert.equal(row('relationship:r1').source, 'hub'); assert.equal(row('role:role1').source, 'unknown'); assert.equal(row('field:custom_permit.untyped').source, 'unknown');
  const imp = row('field:workorder.subject'); assert.equal(imp.source, 'package'); assert.equal(imp.state.imported, true); assert.equal(imp.generatedArtifact, 'none'); assert.equal(imp.implementationStatus, 'unknown');
  assert.equal(row('field:workorder.permit_ref').state.imported, false); assert.equal(row('module:custom_permit').state.imported, false); assert.ok(!T0.rows.some(r => r.id === 'module:workorder'), 'a baseline module has no MODULE row');
});
t('a rejected requirement blocks its row and everything that depends on it', () => {
  const tb = G.buildGapTable(Object.assign(input(), { modules: input().modules.map(m => m.name === 'custom_permit' ? Object.assign({}, m, { requirementIds: ['REQ-2'] }) : m) })); const m = tb.rows.find(r => r.id === 'module:custom_permit'); assert.equal(m.validationStatus, 'blocked'); assert.match(m.blockedBy, /REQ-2 is Rejected/);
  assert.equal(tb.rows.find(r => r.id === 'field:custom_permit.ref').validationStatus, 'blocked'); assert.match(tb.rows.find(r => r.id === 'field:custom_permit.ref').blockedBy, /depends on/); assert.equal(tb.rows.find(r => r.id === 'role:role1').validationStatus, 'not validated');
});
t('setInput returns a new table, leaves the old one untouched, fills the missing input and writes a change log', () => {
  const before = JSON.stringify(T0); const T1 = G.setInput(T0, 'field:custom_permit.untyped', 'type', 'Single Line Text', 'Asha', '2026-11-04T10:00:00Z');
  assert.equal(JSON.stringify(T0), before, 'old table unchanged'); assert.notEqual(T1, T0); assert.notEqual(T1.rows, T0.rows);
  const r = T1.rows.find(x => x.id === 'field:custom_permit.untyped'); assert.deepEqual(r.missingInputs, []); assert.equal(r.implementationStatus, 'ready to generate'); assert.equal(r.inputs.type, 'Single Line Text');
  assert.deepEqual(T1.log, [{ at: '2026-11-04T10:00:00Z', by: 'Asha', rowId: 'field:custom_permit.untyped', field: 'type', from: '', to: 'Single Line Text' }]); assert.equal(T0.log.length, 0);
  const T2 = G.setInput(T1, 'field:custom_permit.untyped', 'type', 'unknown', 'Asha'); assert.deepEqual(T2.rows.find(x => x.id === r.id).missingInputs.map(m => m.key), ['type'], '"unknown" does not count as an answer'); assert.equal(T2.log.length, 2);
  assert.equal(G.setInput(T1, 'field:custom_permit.untyped', 'type', 'Single Line Text', 'Asha'), T1, 'no change, no new table, no log');
  assert.throws(() => G.setInput(T0, 'nope', 'type', 'x', 'a'), /No such row/); assert.throws(() => G.setInput(T0, 'role:role1', 'colour', 'x', 'a'), /not an input/);
});
t('readiness blocks generation until every required input is given, then allows it', () => {
  let tb = T0; let r = G.readiness(tb); assert.equal(r.canGenerate, false); assert.ok(r.blocking.length >= 8 && r.reasons.length); assert.equal(r.total, tb.rows.length); assert.equal(r.byStatus['missing input'] > 0, true);
  // fill every hard missing input, one by one
  for (let guard = 0; guard < 80; guard++) { const next = tb.rows.find(x => x.missingInputs.some(m => !m.manual)); if (!next) break; tb = G.setInput(tb, next.id, next.missingInputs.find(m => !m.manual).key, 'confirmed', 'Asha'); }
  r = G.readiness(tb); assert.equal(r.canGenerate, true, JSON.stringify(r.blocking)); assert.equal(r.blocking.length, 0); assert.equal(r.packageStatus, 'ready to generate'); assert.ok(r.manualPending > 0, 'unsupported items still wait for manual configuration');
  assert.equal(G.readiness(G.buildGapTable({})).canGenerate, false); assert.match(G.readiness(G.buildGapTable({})).reasons[0], /no components/);
  // an invalid row blocks again
  const bad = G.setInput(tb, 'field:custom_permit.ref', 'validationStatus', 'invalid', 'Asha'); assert.equal(G.readiness(bad).canGenerate, false); assert.ok(G.readiness(bad).blocking.some(b => /invalid/.test(b.reason)));
  assert.equal(bad.rows.find(x => x.id === 'view:custom_permit.v1').validationStatus, 'blocked', 'what depends on an invalid row is blocked');
});
t('generated, imported, manual, validated and deployment-ready are separate flags with guards; nothing becomes deployment-ready by itself', () => {
  let tb = G.setInput(T0, 'field:custom_permit.ref', 'generated', true, 'Asha'); let r = tb.rows.find(x => x.id === 'field:custom_permit.ref'); assert.equal(r.implementationStatus, 'generated'); assert.equal(r.state.validated, false); assert.equal(r.validationStatus, 'not validated');
  assert.throws(() => G.setInput(tb, 'field:custom_permit.ref', 'validated', true, 'a'), /validation status to valid/);
  assert.throws(() => G.setInput(T0, 'field:custom_permit.ref', 'validated', true, 'a'), /generated, manually configured or imported/);
  tb = G.setInput(tb, 'field:custom_permit.ref', 'validationStatus', 'valid', 'Asha'); tb = G.setInput(tb, 'field:custom_permit.ref', 'validated', true, 'Asha'); assert.equal(tb.rows.find(x => x.id === 'field:custom_permit.ref').implementationStatus, 'validated');
  assert.throws(() => G.setInput(T0, 'field:custom_permit.ref', 'deploymentReady', true, 'a'), /Deployment-ready needs a validated item/); assert.throws(() => G.setInput(tb, 'field:custom_permit.ref', 'validationStatus', 'blocked', 'a'), /worked out/);
  tb = G.setInput(tb, 'field:custom_permit.ref', 'deploymentReady', true, 'Asha'); assert.equal(tb.rows.find(x => x.id === 'field:custom_permit.ref').implementationStatus, 'deployment-ready');
  const back = G.setInput(tb, 'field:custom_permit.ref', 'validationStatus', 'invalid', 'Asha').rows.find(x => x.id === 'field:custom_permit.ref'); assert.equal(back.state.validated, false); assert.equal(back.state.deploymentReady, false); assert.notEqual(back.implementationStatus, 'deployment-ready');
  // a manual item: the team says it was configured by hand
  const sc = G.setInput(T0, 'role:role1', 'manual', true, 'Asha'); assert.equal(sc.rows.find(x => x.id === 'role:role1').implementationStatus, 'missing input', 'permissions are still not final'); const sc2 = G.setInput(sc, 'role:role1', 'permissions', 'final, signed off by the customer', 'Asha'); assert.equal(sc2.rows.find(x => x.id === 'role:role1').implementationStatus, 'manually configured');
  assert.equal(G.readiness(T0).packageStatus, 'inputs missing or blocked'); assert.ok(!/deployable/i.test(JSON.stringify(G.readiness(T0))));
});
t('the team\'s own entries are saved and re-applied; the rest is worked out again from the project', () => {
  let tb = G.setInput(T0, 'field:custom_permit.untyped', 'type', 'Number', 'Asha'); tb = G.setInput(tb, 'field:custom_permit.untyped', 'responsible', 'Ravi', 'Asha'); tb = G.setInput(tb, 'field:custom_permit.ref', 'generated', true, 'Asha');
  const e = G.edits(tb); assert.deepEqual(Object.keys(e.edits).sort(), ['field:custom_permit.ref', 'field:custom_permit.untyped']); assert.equal(e.log.length, 3);
  const again = G.buildGapTable(input(), { saved: JSON.parse(JSON.stringify(e)) }); const r = again.rows.find(x => x.id === 'field:custom_permit.untyped'); assert.deepEqual(r.missingInputs, []); assert.equal(r.responsible, 'Ravi'); assert.equal(again.rows.find(x => x.id === 'field:custom_permit.ref').state.generated, true); assert.equal(again.log.length, 3);
  assert.equal(G.buildGapTable(input(), { saved: { edits: { 'field:gone': { inputs: { type: 'x' } } } } }).rows.length, T0.rows.length, 'an entry for a row that no longer exists is ignored');
});
console.log(`${n} passed, ${fails} failed`); if (fails) process.exit(1);
