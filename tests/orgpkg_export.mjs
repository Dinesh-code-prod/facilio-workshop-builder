// Org package export: a sample project (new module, field, state flow, notifications) is exported, checked structurally, and read back with the same
// parser the State Flow Builder's importer uses. Run: node tests/orgpkg_export.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const O = require('../src/orgpkg.js'); const P = require('../src/parser.js'); const { DOMParser } = require('@xmldom/xmldom');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const reqs = [{ id: 'R1', status: 'Confirmed' }];
const model = (over) => Object.assign({
  orgId: '400000077', packageName: 'std', reference: false, brdSigned: true,
  signoff: { status: 'signed', signer: 'Priya Nair', signedAt: '2026-10-30T12:00:00.000Z' }, reqSummary: { total: 3, byStatus: { Confirmed: 2, Draft: 1 } },
  crs: [{ n: 1, title: 'Add a second approval', status: 'CR Converted' }, { n: 2, title: 'Drop the kiosk', status: 'Rejected' }, { n: 3, title: 'Extra report', status: 'Proposed' }],
  modules: { workorder: { uid: '109419', label: 'Work Order', fields: ['subject'], statuses: [{ name: 'open', label: 'Open', typeCode: 1, uid: '162001' }], flows: [{ name: 'Default Stateflow', link: 'defaultstateflow' }] } },
  newModules: [{ name: 'custom_incident', label: 'Incident', description: 'Incidents on site', stateflow: true, src: { reqs } }],
  newFields: [{ module: 'custom_incident', label: 'Reported by', type: 'Single Line Text', required: false, mainField: false, options: [], lookup: '', src: { reqs } }],
  flows: [{ key: 'f1', module: 'custom_incident', name: 'Incident Flow', link: '', description: '', criteria: '', initial: 's1', isNew: true,
    states: [{ id: 's1', name: '', label: 'Open' }, { id: 's2', name: '', label: 'Assigned' }, { id: 's3', name: '', label: 'Closed' }],
    transitions: [{ id: 't1', name: 'Assign', from: 's1', to: 's2', type: 'user', condition: '', commentRequired: false, buttonType: 2, portals: [], extras: [], src: { reqs } }, { id: 't2', name: 'Close', from: 's2', to: 's3', type: 'user', condition: '', commentRequired: false, buttonType: 2, portals: [], extras: [], src: { reqs } }], src: { reqs } }],
  notifications: [
    { name: 'Incident reported', module: 'custom_incident', trigger: 'created', channels: { email: true }, recipients: ['Supervisor'], toField: '', subject: 'New incident ${custom_incident.id}', message: 'An incident was reported.\nName: ${custom_incident.name}', status: 'on', note: '', src: { reqs } },
    { name: 'Incident assigned', module: 'custom_incident', trigger: 'state', state: 'Assigned', channels: { email: true, push: true }, recipients: [], toField: '', subject: 'Incident assigned', message: 'Assigned to a technician.', status: 'on', note: '', src: { reqs } },
    { name: 'Push only', module: 'custom_incident', trigger: 'created', channels: { push: true }, recipients: [], subject: '', message: '', status: 'on', note: '', src: { reqs } },
    { name: 'WO closed', module: 'workorder', trigger: 'state', state: 'Open', channels: { email: true }, recipients: [], subject: 's', message: 'm', status: 'on', note: '', src: { reqs } },
    { name: 'No subject', module: 'custom_incident', trigger: 'created', channels: { email: true }, recipients: [], subject: '', message: '', status: 'on', note: '', src: { reqs } }],
  changes: []
}, over || {});
const res = O.build(model(), { now: 1750000000000 });
const byName = n => res.items.find(i => i.name.startsWith(n));

t('notifications become NOTIFICATION records; unsupported and invalid ones are named, not silently dropped', () => {
  assert.equal(res.counts.NOTIFICATION, 2, JSON.stringify(res.counts));
  assert.ok(byName('Incident reported').included && byName('Incident assigned').included);
  assert.ok(!byName('Push only').included && /Only the email channel/.test(byName('Push only').unsupported));
  assert.ok(!byName('WO closed').included && /custom modules only/.test(byName('WO closed').unsupported));
  assert.ok(byName('No subject').errors.some(e => /subject and a message/.test(e)));
  assert.ok(res.manual.some(m => /Recipients \(Supervisor\)/.test(m.detail)), 'recipients are a manual step');
  assert.ok(res.manual.some(m => /push/.test(m.detail)), 'the push channel is a manual step');
});
t('the package lists NOTIFICATION and its file parses', () => {
  assert.match(res.files['PackageConf.xml'], /<Component Type="NOTIFICATION">NOTIFICATION.xml<\/Component>/);
  const d = new DOMParser().parseFromString(res.files['components/NOTIFICATION.xml'], 'text/xml'); assert.equal(d.getElementsByTagName('parsererror').length, 0);
});
t('a created rule has the sample shape; a state rule names the new status by its identifier', () => {
  const x = res.files['components/NOTIFICATION.xml'];
  assert.match(x, /<Activity_Type>CREATE<\/Activity_Type>/); assert.match(x, /<TriggerLinkName>create<\/TriggerLinkName>/);
  assert.match(x, /<Action_Type>BULK_EMAIL_NOTIFICATION<\/Action_Type>/); assert.match(x, /<to>\$\{cs\.email\}<\/to>/); assert.match(x, /<subject>New incident \$\{custom_incident\.id\}<\/subject>/);
  assert.match(x, /<Placeholder><!\[CDATA\[\["custom_incident\.id","custom_incident\.name","cs\.email"\]\]\]><\/Placeholder>/);
  assert.match(x, /<message><!\[CDATA\[<p>An incident was reported\.<\/p><p>Name: \$\{custom_incident\.name\}<\/p>\]\]><\/message>/);
  const st = res.items.find(i => i.type === 'TICKET_STATUS' && /^Assigned/.test(i.name)); const uid = st.rec.attrs.Unique_Identifier;
  assert.match(x, new RegExp('<Value>' + uid + '</Value>')); assert.match(x, /<FieldName>moduleState<\/FieldName>/); assert.match(x, /<PickList_Value>assigned<\/PickList_Value>/); assert.match(x, /<Change_Field_Name>moduleState<\/Change_Field_Name>/);
});
t('the structural check passes and catches a notification for an unknown module', () => {
  const ok = O.verify(res.files, model(), DOMParser); assert.deepEqual(ok.errors, []); assert.ok(ok.checked >= 8, "records checked: " + ok.checked);
  const broken = Object.assign({}, res.files, { 'components/NOTIFICATION.xml': res.files['components/NOTIFICATION.xml'].split('custom_incident').join('custom_nowhere') });
  assert.ok(O.verify(broken, model(), DOMParser).errors.some(e => /custom_nowhere/.test(e)));
});
t('read back: the importer\'s parser finds the module, the flow, its states and transitions and the notifications', () => {
  const pkg = P.parsePackage(res.files, { DOMParser }); assert.ok(pkg && pkg.modules && pkg.modules.custom_incident, 'the new module is read');
  const flows = (pkg.flows || []).filter(f => f.module === 'custom_incident'); assert.equal(flows.length, 1);
  const named = Object.keys(res.files).filter(f => /STATE_FLOW|STATE_TRANSITION|TICKET_STATUS/.test(f)).map(f => ({ name: f, text: res.files[f] }));
  const r = P.parseFlowFiles(named, { DOMParser }); assert.equal(r.errors.length, 0, JSON.stringify(r.errors)); const fl = r.flows.find(f => f.module === 'custom_incident');
  assert.ok(fl, 'flow found'); assert.equal(fl.initialState, 'open'); assert.equal(fl.transitions.length, 2);
  const trs = r.transitions.filter(x => x.module === 'custom_incident'); assert.deepEqual(trs.map(x => x.name + ':' + x.fromLabel + '>' + x.toLabel).sort(), ['Assign:Open>Assigned', 'Close:Assigned>Closed']);
  assert.ok(/Assigned/.test(JSON.stringify(r.statuses)) && /Closed/.test(JSON.stringify(r.statuses)), 'the new states are read as statuses');
  assert.equal((pkg.notifications || []).length, 2, 'the parser reads both notifications');
});
t('the report shows sign-off, requirements and change requests with their effect', () => {
  const rep = O.report(res, model(), O.verify(res.files, model(), DOMParser));
  assert.match(rep, /BRD sign-off: signed by Priya Nair on 2026-10-30/); assert.match(rep, /Requirements: 3 in the project/); assert.match(rep, /### Change requests/);
  assert.match(rep, /\| 2 \| Drop the kiosk \| Rejected \| None: not agreed\./); assert.match(rep, /\| 3 \| Extra report \| Proposed \| Not agreed yet: do not implement\./); assert.match(rep, /\| NOTIFICATION \| Incident reported/);
});
t('before the BRD is signed off everything is a draft and nothing is exported by default', () => {
  const d = O.build(model({ brdSigned: false, signoff: { status: 'notdue' } }), { now: 1750000000000 }); assert.equal(Object.keys(d.counts).length, 0); assert.ok(d.items.every(i => !i.included));
  const withDrafts = O.build(model({ brdSigned: false }), { now: 1750000000000, includeDrafts: true }); assert.equal(withDrafts.counts.NOTIFICATION, 2); assert.ok(withDrafts.draft);
});
console.log(n + ' org package checks passed');
