// Solution tab rules (src/sollogic.js): areas, requirement lines, versions, restore, accepting a proposal, word diff, BRD text and Word rows,
// plus the server side: a solution proposal is cleaned, kept per area, never touched once decided.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
import { cleanProposal, mergeProposals } from '../work/server/_dsapi.mjs';
const L = createRequire(import.meta.url)('../src/sollogic.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const A = '2026-11-07T10:00:00Z', B = '2026-11-07T11:00:00Z';
t('areas: modules in scope first, then the fixed areas', () => { const a = L.areasFor([{ name: 'workorder', label: 'Work Order' }]); assert.equal(a[0].key, 'module:workorder'); assert.equal(a[0].group, 'Modules'); assert.ok(a.some(x => x.key === 'area:sla')); assert.ok(a.every(x => L.GROUPS.includes(x.group))); });
t('requirement lines: only confirmed ones of that module, read live', () => {
  const reqs = [{ id: 'WO-001', status: 'Confirmed', modules: ['workorder'], objective: 'Approve before work' }, { id: 'WO-002', status: 'Draft', modules: ['workorder'] }, { id: 'AS-001', status: 'Confirmed', modules: ['asset'] }];
  assert.deepEqual(L.reqLines(reqs, 'module:workorder').map(r => r.id), ['WO-001']); assert.deepEqual(L.reqLines(reqs, 'area:sla'), []);
});
t('saving keeps the previous text as a version with who, when and why; restore adds a new version', () => {
  let d = L.save({}, 'module:workorder', 'First text', { by: 'a@x.com', at: A, why: 'first' }); assert.equal(L.textOf(d, 'module:workorder'), 'First text'); assert.equal(L.recOf(d, 'module:workorder').versions.length, 0);
  d = L.save(d, 'module:workorder', 'Second text', { by: 'b@x.com', at: B, why: 'customer call' }); const r = L.recOf(d, 'module:workorder'); assert.equal(r.versions.length, 1); assert.deepEqual([r.versions[0].text, r.versions[0].by, r.versions[0].at, r.versions[0].why], ['First text', 'a@x.com', A, 'first']);
  const back = L.restore(d, 'module:workorder', 0, 'c@x.com', B); assert.equal(L.textOf(back, 'module:workorder'), 'First text'); assert.equal(L.recOf(back, 'module:workorder').versions[0].text, 'Second text'); assert.throws(() => L.restore(d, 'module:workorder', 5, 'c', B));
});
t('the same text saved again adds no version; a bad key is refused; text is cleaned and capped; history is capped', () => {
  let d = L.save({}, 'area:apps', 'Same', { at: A }); d = L.save(d, 'area:apps', 'Same', { at: B }); assert.equal(L.recOf(d, 'area:apps').versions.length, 0); assert.equal(L.recOf(d, 'area:apps').updatedAt, A);
  assert.throws(() => L.save({}, '../x', 'a')); assert.equal(L.textOf(L.save({}, 'area:apps', 'a\u0000b'), 'area:apps'), 'a b'); assert.equal(L.recOf(L.save({}, 'area:apps', 'x'.repeat(9000)), 'area:apps').text.length, 6000);
  for (let i = 0; i < 40; i++) d = L.save(d, 'area:apps', 'v' + i, { at: A }); assert.equal(L.recOf(d, 'area:apps').versions.length, 30);
});
t('status: Not written, Draft, Agreed, and Changed by customer when a customer proposal is accepted (quote kept as a source)', () => {
  assert.equal(L.statusOf({}, 'area:sla'), 'Not written'); let d = L.save({}, 'area:sla', 'Text', { at: A }); assert.equal(L.statusOf(d, 'area:sla'), 'Draft'); d = L.save(d, 'area:sla', 'Text', { status: 'Agreed', at: B }); assert.equal(L.statusOf(d, 'area:sla'), 'Agreed');
  const p = { kind: 'solution', module: 'area:sla', text: 'New text', why: 'differs', quote: 'two levels', source: 'cust.docx p2', fromCustomer: true }; const e = L.accept(d, p, 'a@x.com', B); const r = L.recOf(e, 'area:sla');
  assert.equal(r.status, 'Changed by customer'); assert.equal(r.text, 'New text'); assert.equal(r.sources[0].quote, 'two levels'); assert.equal(r.versions[0].text, 'Text'); assert.throws(() => L.accept(d, { kind: 'flow' }, 'a', B));
});
t('the word diff marks removed and added words and rebuilds both texts', () => {
  const d = L.diff('the approval has one level', 'the approval has two levels'); assert.ok(d.some(x => x.t === 'del') && d.some(x => x.t === 'add'));
  assert.equal(d.filter(x => x.t !== 'add').map(x => x.w).join(''), 'the approval has one level'); assert.equal(d.filter(x => x.t !== 'del').map(x => x.w).join(''), 'the approval has two levels'); assert.deepEqual(L.diff('same', 'same'), [{ t: 'same', w: 'same' }]);
});
t('the BRD reads the solution: paragraphs per blank line, and only the fixed areas that have text', () => {
  const d = L.save(L.save({}, 'module:workorder', 'One.\nstill one.\n\nTwo.', { at: A }), 'area:kpis', 'KPI text', { at: A });
  assert.deepEqual(L.paras(L.textOf(d, 'module:workorder')), ['One. still one.', 'Two.']); assert.deepEqual(L.paras(''), []); assert.deepEqual(L.otherAreas(d).map(a => a.key), ['area:kpis']); assert.equal(L.otherAreas({}).length, 0);
});
t('Word rows: Module | Customer requirement | Solution, only areas with something, and a missing solution says so', () => {
  const areas = L.areasFor([{ name: 'workorder', label: 'Work Order' }, { name: 'asset', label: 'Asset' }]); const reqs = [{ id: 'WO-001', status: 'Confirmed', modules: ['workorder'], objective: 'Approve first' }, { id: 'AS-001', status: 'Confirmed', modules: ['asset'], objective: 'Tag assets' }];
  const d = L.save({}, 'module:workorder', 'Two-level approval', { at: A }); const rows = L.wordRows(areas, d, reqs);
  assert.deepEqual(rows[0], ['Work Order', 'WO-001 Approve first', 'Two-level approval']); assert.deepEqual(rows[1], ['Asset', 'AS-001 Tag assets', 'To be written']); assert.equal(rows.length, 2);
});
t('open proposals of one area', () => { const ps = [{ kind: 'solution', status: 'open', module: 'area:sla' }, { kind: 'solution', status: 'applied', module: 'area:sla' }, { kind: 'flow', status: 'open' }]; assert.equal(L.proposalsFor(ps, 'area:sla').length, 1); assert.equal(L.proposalsFor(ps).length, 1); });
t('server: a solution proposal needs a valid area, a text and evidence; paragraphs survive', () => {
  const ok = cleanProposal({ kind: 'solution', area: 'module:workorder', name: 'Work Order', text: 'A.\n\n\n\nB   c', why: 'asked', quote: 'q', fromCustomer: true, outOfScope: true, scopeNote: 'p4' });
  assert.equal(ok.module, 'module:workorder'); assert.equal(ok.text, 'A.\n\nB c'); assert.equal(ok.fromCustomer, true); assert.equal(ok.outOfScope, true);
  assert.equal(cleanProposal({ kind: 'solution', area: 'bad key', text: 'x', why: 'y' }), null); assert.equal(cleanProposal({ kind: 'solution', area: 'area:sla', text: '', why: 'y' }), null); assert.equal(cleanProposal({ kind: 'solution', area: 'area:sla', text: 'x' }), null, 'no why and no quote');
});
t('server: a new proposal replaces the open one of that area; a decided one stays; the same text is not proposed again', () => {
  const p = (text, extra) => Object.assign({ kind: 'solution', area: 'area:sla', name: 'SLA', text, why: 'w' }, extra || {});
  const a = mergeProposals([], [p('v1'), p('other', { area: 'area:kpis', name: 'K' })], A); assert.equal(a.added, 2);
  const b = mergeProposals(a.items, [p('v2')], B); assert.equal(b.items.filter(x => x.module === 'area:sla').length, 1); assert.equal(b.items.find(x => x.module === 'area:sla').text, 'v2'); assert.equal(b.items.filter(x => x.module === 'area:kpis').length, 1);
  const done = b.items.map(x => (x.module === 'area:sla' ? Object.assign({}, x, { status: 'dismissed' }) : x)); const c = mergeProposals(done, [p('v2'), p('v3')], B); assert.equal(c.added, 1); assert.equal(c.items.filter(x => x.module === 'area:sla').length, 2);
});
console.log(n + ' solution checks passed');
{   // areas the team adds: integrations, custom areas, keyword and module links, what reaches the BRD
  const mods = [{ name: 'servicerequest', label: 'Service Request' }, { name: 'asset', label: 'Asset' }]; const t2 = (name, fn) => { fn(); console.log('  ok  ' + name); };
  t2('an added area keeps its type, group, keywords and modules, gets a unique key, and saving text does not lose it', () => {
    let r = L.addArea({}, { label: 'SR to customer portal', type: 'int_portal', modules: [], keywords: ['SR'] }, 'a@x.com', A); assert.equal(r.key, 'custom:sr-to-customer-portal'); assert.equal(L.customOf(r.doc)[0].group, 'Integrations');
    const r2 = L.addArea(r.doc, { label: 'SR to customer portal', type: 'int_portal' }, 'a', A); assert.equal(r2.key, 'custom:sr-to-customer-portal-2'); assert.throws(() => L.addArea({}, { label: ' ' }, 'a', A));
    const d = L.save(r.doc, r.key, 'Service requests created in Facilio are sent back to their portal.', { at: A }); assert.equal(L.customOf(d).length, 1); assert.ok(L.areasFor(mods, d).some(x => x.key === r.key && x.custom));
    assert.equal(L.customOf(L.removeArea(d, r.key)).length, 0); assert.equal(L.textOf(L.removeArea(d, r.key), r.key).length > 0, true, 'the text is kept');
  });
  t2('a module is linked by pick, by keyword, by the name or by the text', () => {
    let r = L.addArea({}, { label: 'Procurement feed', type: 'int_proc', modules: ['asset'], keywords: [] }, 'a', A); let d = L.save(r.doc, r.key, 'Purchase orders flow to the ERP when a Service Request needs parts.', { at: A });
    const area = L.areasFor(mods, d).find(x => x.key === r.key); assert.deepEqual(L.linkedModules(area, d, mods).sort(), ['asset', 'servicerequest']);
    const k = L.addArea({}, { label: 'Notes', type: 'other', keywords: ['service requests'] }, 'a', A); assert.deepEqual(L.linkedModules(L.areasFor(mods, k.doc).pop(), k.doc, mods), ['servicerequest']); assert.deepEqual(L.linkedModules({ key: 'module:asset' }, d, mods), []);
  });
  t2('BRD: a linked area is shown inside its module, an integration is only referred to there and has its own place, an unlinked area goes to other areas, integrations first', () => {
    let d = L.addArea({}, { label: 'Portal return', type: 'int_portal', modules: ['servicerequest'] }, 'a', A); const ik = d.key; d = L.save(d.doc, ik, 'Sent back to the portal.', { at: A });
    let r = L.addArea(d, { label: 'Asset labels', type: 'other', modules: ['asset'] }, 'a', A); const lk = r.key; d = L.save(r.doc, lk, 'Labels are printed.', { at: A });
    r = L.addArea(d, { label: 'Training pack', type: 'other' }, 'a', A); const uk = r.key; d = L.save(r.doc, uk, 'Delivered at go-live.', { at: A }); d = L.save(d, 'area:sla', 'SLA wording', { at: A });
    assert.deepEqual(L.relatedFor(d, 'asset', mods).map(x => x.key), [lk]); assert.deepEqual(L.relatedFor(d, 'servicerequest', mods), []); assert.deepEqual(L.integrationsFor(d, 'servicerequest', mods), ['Portal return']);
    assert.deepEqual(L.otherAreas(d, mods).map(x => x.key), [ik, 'area:sla', uk]);
  });
  t2('accepting a proposal for a new area registers it with the name and group Claude gave', () => {
    const p = { kind: 'solution', module: 'custom:procurement-erp', name: 'Procurement and ERP', group: 'Integrations', text: 'POs go to the ERP.', why: 'file', quote: 'PO export', source: 'cust.docx', fromCustomer: true }; const d = L.accept({}, p, 'a', B);
    const c = L.customOf(d)[0]; assert.equal(c.label, 'Procurement and ERP'); assert.equal(c.group, 'Integrations'); assert.equal(L.textOf(d, 'custom:procurement-erp'), 'POs go to the ERP.'); assert.equal(L.statusOf(d, 'custom:procurement-erp'), 'Changed by customer');
    assert.equal(cleanProposal({ kind: 'solution', area: 'custom:procurement-erp', name: 'Procurement and ERP', group: 'Integrations', text: 'x', why: 'y' }).group, 'Integrations'); assert.equal(cleanProposal({ kind: 'solution', area: 'custom:Bad Key', text: 'x', why: 'y' }), null);
  });
}
{   // the solution as a table: rows by kind of area, versions that keep rows, row-level diff, what reaches the BRD and Word
  const t3 = (name, fn) => { fn(); console.log('  ok  ' + name); }; const mods = [{ name: 'workorder', label: 'Work Order' }];
  t3('every kind of area has its own columns; the kind follows the key and the type of an added area', () => {
    assert.equal(L.kindOfKey({}, 'module:workorder'), 'module'); assert.equal(L.kindOfKey({}, 'area:integrations'), 'integration'); assert.equal(L.kindOfKey({}, 'area:sla'), 'sla'); assert.equal(L.layoutOf({}, 'area:apps').cols[0][0], 'app');
    const d = L.addArea({}, { label: 'Portal', type: 'int_portal' }, 'a', A); assert.equal(L.kindOfKey(d.doc, d.key), 'integration'); assert.ok(L.LAYOUTS.integration.cols.length >= 6);
  });
  t3('rows are cleaned to the layout: unknown columns dropped, empty rows dropped, status checked, ids made', () => {
    const r = L.cleanRows([{ cells: { topic: 'Approvals', solution: ' Two levels ', bogus: 'x' }, status: 'Agreed' }, { cells: {} }, { cells: { topic: 'Notifications' }, status: 'weird' }], 'module');
    assert.equal(r.length, 2); assert.deepEqual(r[0].cells, { topic: 'Approvals', solution: 'Two levels' }); assert.equal(r[1].status, 'Draft'); assert.ok(r[0].id && r[1].id && r[0].id !== r[1].id); assert.equal(L.cleanRows(Array.from({ length: 60 }, (_, i) => ({ cells: { topic: 't' + i } })), 'module').length, 40);
  });
  t3('saving rows is a version that keeps the old rows; restore brings them back; a rows-only change counts as a change', () => {
    let d = L.save({}, 'module:workorder', 'Overview', { rows: [{ cells: { topic: 'Approvals', solution: 'One level' } }], at: A }); assert.equal(L.recOf(d, 'module:workorder').rows.length, 1); assert.equal(L.statusOf(d, 'module:workorder'), 'Draft');
    d = L.save(d, 'module:workorder', 'Overview', { rows: [{ cells: { topic: 'Approvals', solution: 'Two levels' } }], at: B, by: 'b' }); const r = L.recOf(d, 'module:workorder'); assert.equal(r.versions.length, 1); assert.equal(r.versions[0].rows[0].cells.solution, 'One level');
    d = L.save(d, 'module:workorder', 'Overview', { at: B }); assert.equal(L.recOf(d, 'module:workorder').rows[0].cells.solution, 'Two levels', 'rows are kept when not given');
    const back = L.restore(d, 'module:workorder', 0, 'c', B); assert.equal(L.recOf(back, 'module:workorder').rows[0].cells.solution, 'One level');
    assert.equal(L.statusOf(L.save({}, 'module:workorder', '', { rows: [{ cells: { topic: 'Approvals' } }], at: A }), 'module:workorder'), 'Not written', 'a row with only a name is not a solution yet');
  });
  t3('the row diff matches by the first column: new, changed, removed, same', () => {
    const o = [{ cells: { topic: 'Approvals', solution: 'One' }, status: 'Draft' }, { cells: { topic: 'Notifications', solution: 'SMS' }, status: 'Draft' }, { cells: { topic: 'Access', solution: 'x' }, status: 'Draft' }]; const n = [{ cells: { topic: 'approvals', solution: 'Two' }, status: 'Draft' }, { cells: { topic: 'Notifications', solution: 'SMS' }, status: 'Draft' }, { cells: { topic: 'Reports', solution: 'new' }, status: 'Draft' }];
    assert.deepEqual(L.diffRows(o, n).map(x => x.t), ['chg', 'same', 'add', 'del']);
  });
  t3('accepting a proposal with rows sets the rows; one without rows keeps them; the BRD table and the Word text come from the rows', () => {
    let d = L.save({}, 'module:workorder', 'Old overview', { rows: [{ cells: { topic: 'Process', solution: 'Keep me' } }], at: A });
    const keep = L.accept(d, { kind: 'solution', module: 'module:workorder', text: 'New overview', why: 'w' }, 'a', B); assert.equal(L.recOf(keep, 'module:workorder').rows[0].cells.solution, 'Keep me'); assert.equal(L.textOf(keep, 'module:workorder'), 'New overview');
    const set = L.accept(d, { kind: 'solution', module: 'module:workorder', rows: [{ cells: { topic: 'Approvals', solution: 'Two levels', reqs: 'WO-001' }, status: 'Open question' }], why: 'w' }, 'a', B); assert.equal(L.textOf(set, 'module:workorder'), 'Old overview'); const t = L.table(set, 'module:workorder');
    assert.deepEqual(t.headers, ['Topic', 'What Facilio does', 'Who is involved', 'Requirements', 'Status']); assert.deepEqual(t.rows[0], ['Approvals', 'Two levels', '', 'WO-001', 'To be confirmed']); assert.equal(L.table(d, 'module:workorder').headers.length, 5, 'a draft row shows its status'); assert.equal(L.table({}, 'area:sla'), null);
    const ag = L.save(set, 'module:workorder', 'Old overview', { rows: [{ cells: { topic: 'Approvals', solution: 'Two levels' }, status: 'Agreed' }], at: B }); assert.equal(L.table(ag, 'module:workorder').headers.length, 4, 'no Status column when every row is agreed');
    assert.ok(L.flatText(ag, 'module:workorder').includes('Approvals: Two levels')); assert.equal(L.wordRows(L.areasFor(mods, ag), ag, [])[0][2].includes('Approvals: Two levels'), true);
  });
}
