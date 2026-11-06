// The client mockup (src/mockuphtml.js): one self-contained HTML file; modules grouped like a Facilio organisation; sample records; state moves; the file is safe to open and share.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
globalThis.FWBViews = { ACT: {}, toast() { } };
createRequire(import.meta.url)('../src/mockuphtml.js'); const { toClientHtml, runtime } = globalThis.FWBViews.mockupClient; const R = runtime({}, null);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const data = { customer: 'Al Moallam <b>x</b>', project: 'Rollout', modules: [
  { name: 'workorder', label: 'Work Order', requirements: [{ id: 'WO-1', title: 'Weekly report' }], fields: [{ label: 'Priority', type: 'dropdown', options: ['Low', 'High'], required: true }, { label: 'Cost', type: 'number', options: [] }], forms: [{ label: 'WO', sections: [{ name: 'Basics', fields: ['Priority', 'Cost', 'Notes'] }] }],
    flows: [{ name: 'WO flow', states: ['New', 'Approved', 'Done'], transitions: [{ name: 'Approve', from: 'New', to: 'Approved' }, { name: 'Complete', from: 'Approved', to: 'Done' }] }] },
  { name: 'site', label: 'Site', requirements: [], fields: [], forms: [], flows: [] }, { name: 'asset', label: 'Asset', requirements: [], fields: [], forms: [], flows: [] }],
  crosslinks: [{ from: 'Work Order', to: 'Asset', name: 'Create asset', condition: 'approved' }], apps: [{ name: 'Tool kit', module: 'Work Order', trigger: 'button', purpose: 'Pick tools' }] };
t('modules are grouped like a facility organisation: portfolio first, then assets, then operations', () => {
  assert.equal(R.group('Site'), 'Portfolio'); assert.equal(R.group('Building'), 'Portfolio'); assert.equal(R.group('Asset'), 'Assets'); assert.equal(R.group('Work Order'), 'Operations');
  assert.deepEqual(R.ordered(data.modules).map(m => m.label), ['Site', 'Asset', 'Work Order']);
});
t('sample records: three per module, status from the flow, values by field type, nothing for a module without a flow', () => {
  const s = R.seed(data.modules[0]); assert.equal(s.length, 3); assert.equal(s[0].status, 'New'); assert.equal(s[1].status, 'Approved'); assert.equal(s[0].values.Priority, 'Low'); assert.equal(s[0].values.Cost, '100'); assert.equal(s[0].values.Notes, 'Notes sample 1');
  assert.equal(R.seed(data.modules[1])[0].status, '');
});
t('the buttons on a record are the transitions out of its state; an approval asks first', () => {
  const f = data.modules[0].flows[0]; assert.deepEqual(R.nextMoves(f, 'New').map(x => x.name), ['Approve']); assert.deepEqual(R.nextMoves(f, 'Done'), []); assert.deepEqual(R.nextMoves(null, 'x'), []); assert.equal(R.isApproval({ name: 'Approve' }), true); assert.equal(R.isApproval({ name: 'Complete' }), false);
});
t('the file is one page with the data inside, escaped so it cannot close the script or inject markup', () => {
  const h = toClientHtml(Object.assign({}, data, { project: '</script><img src=x>' })); assert.ok(h.startsWith('<!doctype html>') && h.includes('<div id="app"></div>') && h.includes('Work Order') && h.includes('Create asset'));
  assert.equal(h.split('</script>').length, 2, 'only the one closing script tag'); assert.ok(!h.includes('<img src=x>')); const tt = /<title>([^<]*)<\/title>/.exec(h); assert.ok(tt && !/[>&"]/.test(tt[1]), 'the title has no raw markup');
  assert.ok(!/(src|href)=["']https?:/.test(h), 'nothing is loaded from outside the file');
});
console.log(n + ' client mockup checks passed');
