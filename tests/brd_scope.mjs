// The BRD follows the modules in scope (src/brd.js): roles, role matrix, portals and the location hierarchy show only what touches a module in scope, and the appendices are off by default.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import zlib from 'node:zlib'; import { REFERENCE_GZ_B64 } from '../data/reference-data.mjs';
const req = createRequire(import.meta.url); globalThis.FWBParser = req('../src/parser.js'); req('../src/core.js'); const F = globalThis.FWB; const S = F.S;
globalThis.FWBViews = { ACT: {}, toast() { }, isCustomer: () => false, ui: {}, extraSections: [], loadingMsg() { }, ico: () => '', crossLinks: () => [] };
req('../src/textgen.js'); req('../src/diagrams.js'); req('../src/roles.js'); req('../src/brd.js');
S.baseline = JSON.parse(zlib.gunzipSync(Buffer.from(REFERENCE_GZ_B64, 'base64')).toString()); S.project = { id: 'p1', name: 'T', customer: 'C' }; S.user = { name: 'A', email: 'a@x.com' };
const build = scope => { S.ws = F.newWorkshop(); scope.forEach(m => { S.ws.modules[m] = { inScope: true }; }); return globalThis.FWBBrd.buildBlocks().blocks; };
const table = (bl, first) => bl.find(b => b.rows && b.headers && b.headers[0] === first);
const V = globalThis.FWBViews;
let bl = build(['workorder', 'asset']);
const portals = table(bl, 'Portal'), want = S.baseline.portalEvidence.filter(p => p.tabs.some(t => (t.modules || []).some(x => ['workorder', 'asset'].includes(x))));
assert.equal(portals ? portals.rows.length : 0, want.length, 'only the portals that reach a module in scope'); assert.ok(want.length < S.baseline.portalEvidence.length, 'the reference has portals that do not (so the filter does something)');
assert.ok(!table(bl, 'Level'), 'no location hierarchy when no location module is in scope'); assert.ok(!bl.some(b => b.t === 'h' && /^Appendix/.test(b.text || '')), 'the appendices are off by default');
const rows = table(bl, 'Role / Actor'); const names = new Set((rows ? rows.rows : []).map(r => String((r[0] && r[0].text) || r[0])));
const noAccess = F.allActors().filter(a => a.roleName && !a.privileged && a.origin !== 'proposed' && !V.existingPerm(a, 'workorder') && !V.existingPerm(a, 'asset') && !V.proposedPerm(a.id, 'workorder') && !V.proposedPerm(a.id, 'asset'));
assert.ok(noAccess.length > 0, 'the reference has roles with no access to these two modules'); const uniq = noAccess.filter(a => F.allActors().filter(x => x.label === a.label).length === 1); const rowOf = l => (rows.rows.find(r => ((r[0] && r[0].text) || r[0]) === l) || []);
assert.ok(uniq.every(a => !names.has(a.label) || /Actions:/.test(JSON.stringify(rowOf(a.label)))), 'a role with no access in these modules is listed only when it acts in a flow of these modules');
assert.ok([...rows.rows].every(r => /Actions:|No stateflow action/.test(JSON.stringify(r))), 'sanity: every row says what the role does here');
const matrix = bl.filter(b => b.rows && b.headers && b.headers[0] === 'Module').flatMap(b => b.headers.slice(1)); assert.ok(uniq.every(a => !matrix.includes(a.label)), 'the role matrix leaves those roles out');
bl = build(['workorder', 'asset', 'site', 'building']); assert.ok(table(bl, 'Level'), 'the location hierarchy appears when a location module is in scope');
bl = build([]); assert.ok(!table(bl, 'Portal') || table(bl, 'Portal').rows.length === 0, 'nothing in scope, no portals');
S.ws = F.newWorkshop(); S.ws.modules.workorder = { inScope: true, agreedAutomation: 'A Reject button after approval' }; bl = globalThis.FWBBrd.buildBlocks().blocks;
assert.ok(bl.some(b => b.t === 'h' && /Agreed Buttons, Automation, SLA and Form Rules/.test(b.text || '')) && bl.some(b => /A Reject button after approval/.test(b.text || '')), 'what the team agreed for buttons and automation is printed in the module section');
S.ws.modules.workorder.agreedAutomation = '   '; bl = globalThis.FWBBrd.buildBlocks().blocks; assert.ok(!bl.some(b => /Agreed Buttons, Automation/.test(b.text || '')), 'an empty box prints nothing');
{ // the module section lists only what is agreed or changed, unless the full standard configuration is switched on or the BRD already has edits
  const heads = b => b.filter(x => x.t === 'h').map(x => x.text || ''); const fresh = () => { S.ws = F.newWorkshop(); S.ws.modules.workorder = { inScope: true }; const d = F.doc('brddoc'); d.edits = {}; d.inserts = {}; return d; };
  fresh(); let b2 = globalThis.FWBBrd.buildBlocks().blocks, h = heads(b2); const sizeAgreed = b2.length;
  assert.ok(h.includes('What Stays Standard') && !h.includes('Field List') && !h.includes('Workflows, Automations & Notifications') && !h.includes('Approval Routing'), 'a new BRD lists nothing standard in the module section');
  S.ws.brd.includeStandard = true; b2 = globalThis.FWBBrd.buildBlocks().blocks; h = heads(b2); assert.ok(h.includes('Field List') && h.includes('Workflows, Automations & Notifications') && !h.includes('What Stays Standard') && b2.length > sizeAgreed, 'the switch brings the full standard configuration back');
  fresh(); F.doc('brddoc').edits = { x: 'y' }; h = heads(globalThis.FWBBrd.buildBlocks().blocks); assert.ok(h.includes('Field List'), 'a BRD that already has edits keeps its full content'); fresh(); S.ws.brd.includeStandard = false; F.doc('brddoc').edits = { x: 'y' }; assert.ok(!heads(globalThis.FWBBrd.buildBlocks().blocks).includes('Field List'), 'an explicit choice wins over the edits rule');
  fresh(); F.fops('workorder').add.push({ name: 'warranty_end', label: 'Warranty end', type: 'Date', required: false, options: [], status: 'proposed', origin: 'Custom (proposed)', onForms: [] });
  S.ws.notifications = [{ id: 'n1', name: 'Tell the manager', module: 'workorder', trigger: 'created', channels: ['email'], recipients: ['Manager'] }]; S.ws.crossLinks.workorder = [{ id: 'c1', name: 'Reserve parts', to: 'inventory', kind: 'create_record', condition: 'when approved' }];
  S.ws.modules.workorder.agreedAutomation = 'A Reject button after approval'; b2 = globalThis.FWBBrd.buildBlocks().blocks; h = heads(b2);
  assert.ok(h.includes('Fields Added, Changed or Removed') && !h.includes('Field List') && JSON.stringify(b2.find(x => x.headers && x.headers[0] === 'Field Name').rows).includes('Warranty end'), 'only the added field is listed');
  assert.ok(h.includes('Notifications Agreed') && h.includes('Actions Across Modules') && h.includes('Agreed Buttons, Automation, SLA and Form Rules'), 'what was recorded in Studio for the module is printed');
  fresh(); }
{ // the module sections follow the Osus sample: six parts, Use Case | Requirement ID | Functional Requirements, REQ- ids, General requirements apart, cover lines
  S.ws = F.newWorkshop(); S.ws.modules.workorder = { inScope: true };
  S.ws.requirements = [{ id: 'WO-001', title: 'Material request', objective: 'Technicians raise a material request from the work order', rules: 'The request is raised from the spare-parts list and the cost is booked to the job', approvals: '', exceptions: 'Only for open work orders', modules: ['workorder'], status: 'Confirmed', source: { quote: 'they can raise it from the spare parts list' } },
    { id: 'GEN-001', title: 'Single sign-on', objective: 'Users sign in once for every portal', rules: 'Facilio SSO', modules: [], status: 'Confirmed' }];
  const b3 = globalThis.FWBBrd.buildBlocks().blocks; const hd = b3.filter(b => b.t === 'h').map(b => b.text);
  for (const h of ['1) Functional Requirements -', '2) Confirmations -', '3) Solution Proposal -', '5) Constraints -']) assert.ok(hd.includes(h), 'module part: ' + h); assert.ok(hd.some(x => x.indexOf('4) Facilio') === 0 && x.indexOf('Modules/Functionality Involved -') > 0) && hd.some(x => x.indexOf('6) Process State flow - ') === 0), 'the other two parts');
  const fr = table(b3, 'Use Case'); assert.ok(fr && fr.headers.join('|') === 'Use Case|Requirement ID|Functional Requirements' && JSON.stringify(fr.rows).includes('REQ-WO-001'), 'the requirement table');
  const uls = b3.filter(b => b.t === 'ul').flatMap(b => b.items); assert.ok(uls.some(x => x.indexOf('REQ-WO-001 – The request is raised from the spare-parts list') === 0), 'the solution proposal carries the answer the team gave'); assert.ok(uls.some(x => x.indexOf('REQ-WO-001 – Only for open work orders') === 0), 'constraints come from the exceptions');
  assert.ok(hd.some(x => /General Requirements/.test(x)) && JSON.stringify(b3.filter(b => b.rows).map(b => b.rows)).includes('REQ-GEN-001'), 'a general requirement has its own section');
  const cv = b3.find(b => b.t === 'cover'); assert.equal(cv.title, 'Facilio CAFM'); assert.equal(cv.subtitle, 'Business Requirement Document For');
}
{ // a style saved earlier that is only the old built-in look does not override the new default; a real custom style does
  S.ws = F.newWorkshop(); S.ws.modules.workorder = { inScope: true }; const B = globalThis.FWBBrd; assert.equal(B.profile().font, 'Cambria'); assert.equal(B.profile().tableHeaderFill, 'D9D2E9');
  S.ws.brd.template = { font: 'Calibri', tableHeaderFill: '8DB3E2', h1: { color: '351C75', size: 32, font: '' } }; assert.equal(B.profile().font, 'Cambria', 'the old defaults saved in a project are ignored');
  S.ws.brd.template = { font: 'Arial', tableHeaderFill: 'FFFFFF', h1: { color: '123456', size: 30, font: '' } }; assert.equal(B.profile().font, 'Arial', 'a custom style is kept'); S.ws.brd.template = null;
}
{ // the SLA matrix and the KPIs are BRD sections of their own
  S.ws = F.newWorkshop(); S.ws.modules.workorder = { inScope: true }; S.ws.slaMatrix = [{ id: 's1', module: 'workorder', priority: 'Critical', response: '30 minutes', resolution: '4 hours', hours: '24x7', esc: [{ after: '30 min', to: 'Supervisor' }, { after: '1 hour', to: 'Manager' }] }];
  globalThis.FWBViews.items = { ready: () => true, load() { }, get: () => null, list: k => (k === 'kpi' ? [{ id: 'k1', name: 'Closed on time', module: 'workorder', description: 'Share closed within SLA', source: 'Work orders', freq: 'Monthly', target: '90', unit: '%', solution: 'A dashboard widget' }] : []) };
  const b4 = globalThis.FWBBrd.buildBlocks().blocks; const hd = b4.filter(x => x.t === 'h').map(x => x.text); assert.ok(hd.some(x => x.indexOf('SLA Matrix') > 0) && hd.includes('Escalation Matrix') && hd.some(x => x.indexOf('KPIs and Reporting') > 0), 'both sections');
  const sm = b4.find(x => x.headers && x.headers[1] === 'Priority'); assert.ok(sm && sm.rows.length === 1 && sm.rows[0][1] === 'Critical' && sm.rows[0][3] === '4 hours'); const em = table(b4, 'Module / priority'); assert.ok(em && em.rows.length === 2 && em.rows[1][1] === 'Level 2'); const kp = table(b4, 'KPI'); assert.ok(kp && JSON.stringify(kp.rows).includes('A dashboard widget'));
  S.ws.slaMatrix = []; globalThis.FWBViews.items = { ready: () => true, load() { }, get: () => null, list: () => [] }; const b5 = globalThis.FWBBrd.buildBlocks().blocks; assert.ok(!b5.some(x => x.t === 'h' && /SLA Matrix|KPIs and Reporting/.test(x.text || '')), 'nothing recorded, no section');
}
console.log('11 BRD scope and format checks passed');
