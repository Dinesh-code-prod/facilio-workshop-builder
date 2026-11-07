// Which modules the contract documents are about (src/contractmods.js): scope part, delivery wording, exclusions, passing mentions, generic words, several documents, evidence kept.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../src/contractmods.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const catalogue = [{ name: 'workorder', label: 'Work Order' }, { name: 'asset', label: 'Asset' }, { name: 'servicerequest', label: 'Service Request' }, { name: 'inventoryrequest', label: 'Inventory Request' }, { name: 'purchaseorder', label: 'Purchase Order' }, { name: 'vendors', label: 'Vendors' },
  { name: 'workpermit', label: 'Work Permit' }, { name: 'site', label: 'Site' }, { name: 'client', label: 'Client' }, { name: 'visitorlog', label: 'Visitor Log' }, { name: 'plannedmaintenance', label: 'Planned Maintenance' }, { name: 'tenant', label: 'Tenant' }];
const msa = { label: 'Master agreement', pages: [
  { n: 1, text: 'MASTER SERVICES AGREEMENT\nThis agreement is between the Client and Facilio for the supply of the Facilio platform at the Site named in the order form.\n1. Definitions\nSite means a location of the Client.' },
  { n: 2, text: '2. Scope of Services\nThe Supplier shall configure and deploy the following modules:\n- Work Orders with approval workflow\n- Asset register and equipment tagging\n- Service Requests through the help desk portal\n- Planned maintenance schedules\n3. Fees and Payment\nThe fee is 10,000 per month. Invoices are paid in 30 days.' },
  { n: 3, text: '4. Exclusions\nThe following are out of scope: Inventory management, Purchase orders and procurement, Visitor management.\n5. Governing law\nThe Vendors of the Client may be contacted in the course of the work.' }] };
const amend = { label: 'Amendment 1', pages: [{ n: 1, text: 'Amendment 1\nThe scope of services is extended. The Supplier shall also implement Work Permit management and train the Client users.\nThe Tenant portal is not included in this amendment.' }] };
const names = l => l.map(x => x.name).sort();
t('modules in the scope part and with delivery wording are strong; the exclusions part and "not included" sentences are excluded, not strong', () => {
  const r = C.find(catalogue, [msa]); assert.deepEqual(names(r.strong), ['asset', 'plannedmaintenance', 'servicerequest', 'workorder']); assert.deepEqual(names(r.excluded), ['inventoryrequest', 'purchaseorder', 'visitorlog']);
  const wo = r.strong.find(x => x.name === 'workorder'); assert.equal(wo.hits[0].doc, 'Master agreement'); assert.equal(wo.hits[0].page, 2); assert.ok(/Work Orders with approval/.test(wo.hits[0].quote), 'the words are kept as evidence');
});
t('a passing mention is weak, and generic words (site, client, tenant) never become strong on their own', () => {
  const r = C.find(catalogue, [msa]); assert.ok(names(r.strong).every(x => !['site', 'client', 'vendors', 'tenant'].includes(x))); assert.ok(!r.weak.some(x => ['site', 'client'].includes(x.name)), 'generic words are not even listed as weak');
  assert.ok(!r.strong.some(x => x.name === 'vendors')); assert.ok(r.excluded.every(x => x.name !== 'vendors'));
});
t('a second document adds its modules and keeps its own label; an amendment can exclude one', () => {
  const r = C.find(catalogue, [msa, amend]); assert.ok(names(r.strong).includes('workpermit')); assert.equal(r.strong.find(x => x.name === 'workpermit').hits[0].doc, 'Amendment 1'); assert.equal(names(r.strong).filter(x => x === 'workorder').length, 1, 'one entry per module'); assert.ok(!names(r.strong).includes('tenant'), 'the tenant portal is not included');
});
t('an exclusion in one place does not hide a module the scope delivers elsewhere', () => {
  const both = { label: 'Contract', pages: [{ n: 1, text: 'Scope of Services\nThe Supplier shall implement Inventory management.' }, { n: 2, text: 'Exclusions\nBulk Inventory migration is out of scope.' }] }; const r = C.find(catalogue, [both]); assert.ok(names(r.strong).includes('inventoryrequest')); assert.ok(r.strong.find(x => x.name === 'inventoryrequest').hits.some(h => h.excluded), 'the exclusion is kept as evidence too');
});
t('empty and strange input gives empty lists; an alias finds a module under another name', () => {
  assert.deepEqual(C.find([], [msa]), { strong: [], weak: [], excluded: [] }); assert.deepEqual(C.find(catalogue, null).strong, []); assert.deepEqual(C.find(catalogue, [{ label: 'x', pages: [{ n: 1, text: '' }, null] }]).strong, []);
  const r = C.find(catalogue, [{ label: 'Order form', pages: [{ n: 1, text: 'Scope of Services\nThe Supplier shall configure a ticketing and help desk process, and stock control.' }] }]); assert.ok(names(r.strong).includes('servicerequest'), 'help desk is the Service Request module'); assert.ok(names(r.strong).includes('inventoryrequest'), 'stock is the Inventory module');
});
console.log(n + ' contract module checks passed');
{   // the real catalogue is large and untidy: generic one-word labels, several modules with the same label, the contract's own party named Supplier
  const big = catalogue.concat([{ name: 'service', label: 'Service' }, { name: 'scopeOfWorkServices', label: 'Services' }, { name: 'sowServiceSchedule', label: 'Schedule' }, { name: 'serviceOrder', label: 'Work Order' }]);
  const r = C.find(big, [msa]); const s = names(r.strong); assert.deepEqual(s, ['asset', 'plannedmaintenance', 'servicerequest', 'workorder'], 'no Service, Services or Schedule, one Work Order'); assert.ok(!s.includes('vendors'), 'the Supplier is the contract party, not the Vendors module'); assert.ok(C.find(big, [{ label: 'x', pages: [{ n: 1, text: 'Scope of Services
The Supplier shall configure preventive maintenance.' }] }]).strong.some(x => x.name === 'plannedmaintenance'), 'preventive maintenance is the Planned Maintenance module');
  console.log('  ok  generic labels, duplicate labels and the contract party do not create modules'); n++;
}
console.log(n + ' contract module checks passed (with the real-catalogue case)');
