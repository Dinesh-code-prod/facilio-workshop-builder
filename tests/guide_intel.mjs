// Tests the guide intelligence (src/guideintel.js) on real ZIP packages built from Facilio-style XML: parsing, relationship evidence,
// diff against an earlier inventory, targeted guide proposals, manual-edit conflicts, restore-safe apply and pre-publish checks.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const JSZip = require('../vendor/jszip.min.js'); const { DOMParser } = require('@xmldom/xmldom');
const P = require('../src/parser.js'); const G = require('../src/guideintel.js');
const rec = (t, inner) => `<${t} Created_Version="1.0" Modified_Version="1.0" Status="ADDED" Type="1" Unique_Identifier="1" Parent_Id="1">${inner}</${t}>`; const wrap = x => `<Components>${x}</Components>`;
const mod = (n, l, c) => rec('MODULE', `<name>${n}</name><Description>${c ? l + ' requests raised from work orders' : ''}</Description><displayName>${l}</displayName><Module_Type>1</Module_Type><IsCustom>${!!c}</IsCustom><Is_StateFlow_Enabled>false</Is_StateFlow_Enabled><isHiddenModule>false</isHiddenModule>`);
const fld = (m, n, l, dt, o = {}) => rec('FIELD', `<name>${n}</name><moduleName>${m}</moduleName><displayName>${l}</displayName><DataType>${dt}</DataType><Required>${!!o.req}</Required><Is_Default>false</Is_Default>${o.lookup ? `<lookupModuleName>${o.lookup}</lookupModuleName>` : ''}${o.opts ? `<values>${o.opts.map((v, i) => `<Value_Element><value>${v}</value><index>${i}</index><visible>true</visible></Value_Element>`).join('')}</values>` : ''}`);
const act = (type, inner) => `<Actions_List><Action><Action_Type>${type}</Action_Type>${inner}</Action></Actions_List>`;
const btn = (m, n, l, cfg, actions = '') => rec('CUSTOM_BUTTON', `<moduleName>${m}</moduleName><name>${n}</name><linkName>${l}</linkName><Status>true</Status><Button_Type>1</Button_Type><Position_Type>SUMMARY</Position_Type><config>${cfg}</config>${actions}`);
const rule = (t, m, n, l, ev, actions, on = true) => rec(t, `<moduleName>${m}</moduleName><name>${n}</name><linkName>${l}</linkName><Status>${on}</Status><Activity_Type>${ev}</Activity_Type>${actions}`);
async function zip(parts) { const z = new JSZip(); z.file('PackageConf.xml', '<Package/>'); Object.entries(parts).forEach(([k, v]) => z.file('components/' + k + '.xml', wrap(v.join('')))); const buf = await z.generateAsync({ type: 'nodebuffer' }); const back = await JSZip.loadAsync(buf); const files = {}; for (const n of Object.keys(back.files)) if (/\.xml$/i.test(n)) files[n.replace(/^.*?components\//, 'components/')] = await back.files[n].async('string'); return files; }
const parse = files => P.parsePackage(files, { DOMParser, sourceName: 'org.zip' });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

const v1 = { MODULE: [mod('workorder', 'Work Order'), mod('asset', 'Asset'), mod('inventoryrequest', 'Inventory Request', true)],
  FIELD: [fld('inventoryrequest', 'item', 'Item', 7, { lookup: 'asset' }), fld('inventoryrequest', 'qty', 'Quantity', 2, { req: true }), fld('inventoryrequest', 'urgency', 'Urgency', 8, { opts: ['Low', 'High'] }), fld('inventoryrequest', 'wo', 'Work Order', 7, { lookup: 'workorder' })],
  CUSTOM_BUTTON: [btn('workorder', 'Create Inventory Request', 'createInv', '<actionType>CREATE_RECORD</actionType><moduleName>inventoryrequest</moduleName>')],
  NOTIFICATION: [rule('NOTIFICATION', 'inventoryrequest', 'New request alert', 'newReq', 'CREATE', act('EMAIL', '<Template_Name>Request received</Template_Name><to>requester</to>'))],
  EMAIL_TEMPLATE: [rec('EMAIL_TEMPLATE', '<moduleName>inventoryrequest</moduleName><Name>Request received</Name><Subject>We got it</Subject>')] };
const v2 = { MODULE: v1.MODULE, EMAIL_TEMPLATE: v1.EMAIL_TEMPLATE, CONNECTED_APP: [],
  FIELD: [fld('inventoryrequest', 'item', 'Item', 7, { lookup: 'asset' }), fld('inventoryrequest', 'qty', 'Quantity', 2, { req: true }), fld('inventoryrequest', 'urgency', 'Urgency', 8, { opts: ['Low', 'High', 'Critical'] }), fld('inventoryrequest', 'wo', 'Work Order', 7, { lookup: 'workorder' }), fld('inventoryrequest', 'site', 'Site', 7, { lookup: 'ghostmodule' })],
  CUSTOM_BUTTON: [v1.CUSTOM_BUTTON[0], btn('inventoryrequest', 'Approve Request', 'approveReq', '<actionType>SCRIPT</actionType>', act('SCRIPT', '<workflowV2String>x = Module("inventoryrequest"); y = "workorder"; </workflowV2String>')), btn('workorder', 'Open Planner', 'planner', '<Connected_App_Link_Name>planner_app</Connected_App_Link_Name>')],
  WORKFLOW_RULE: [rule('WORKFLOW_RULE', 'inventoryrequest', 'Mark urgent', 'markUrgent', 'CREATE', act('FIELD_CHANGE', '<Value_Element><Action_Field_Name>urgency</Action_Field_Name><Action_Field_Value>High</Action_Field_Value></Value_Element>')), rule('WORKFLOW_RULE', 'inventoryrequest', 'Old rule', 'old', 'CREATE', act('FIELD_CHANGE', ''), false)],
  NOTIFICATION: [rule('NOTIFICATION', 'inventoryrequest', 'Stock alert', 'stock', 'CREATE', act('EMAIL', '<Template_Name>Missing template</Template_Name><to>requester</to>'))] };
let A1, A2;
await t('real ZIP: modules, fields, buttons, rules and notifications are read from the uploaded files', async () => {
  const b1 = parse(await zip(v1)); A1 = G.analyse(b1); const kinds = A1.items.map(i => i.kind).sort().join(',');
  assert.equal(kinds, 'button,module,notification'); assert.equal(A1.stats.fields, 4); assert.equal(A1.stats.buttons, 1);
  const m = A1.items.find(i => i.key === 'module:inventoryrequest'); assert.ok(m.lines.some(l => /Quantity \(number, required\)/.test(l.t))); assert.ok(m.lines.some(l => /Urgency \(list of choices\).*Low, High/.test(l.t)));
});
await t('relationships: the button creates a record in another module (verified), lookups link modules, notification uses its template', async () => {
  const e = A1.graph.edges; const create = e.find(x => x.kind === 'creates'); assert.ok(create && create.level === 'verified'); assert.equal(create.from, 'button:workorder/createInv'); assert.equal(create.to, 'module:inventoryrequest');
  assert.ok(e.some(x => x.kind === 'links to' && x.to === 'module:asset' && x.level === 'verified')); assert.ok(e.some(x => x.kind === 'sends' && x.level === 'verified' && /Request received/.test(x.text)));
  const btnItem = A1.items.find(i => i.kind === 'button'); assert.ok(btnItem.md.includes('Creates a Inventory Request record') || /Creates a Inventory Request/.test(btnItem.md)); assert.ok(btnItem.findings.some(f => f.level === 'uncertain' && /copies into/.test(f.text)), 'transferred values are not invented');
});
await t('customer text hides raw configuration: no XML, identifiers or script code', async () => {
  A1.items.forEach(i => { assert.ok(!/<|Unique_Identifier|workflowV2|CREATE_RECORD|createInv/.test(i.md), i.md); });
});
await t('names alone are not proof: a script that only mentions a module is uncertain, an explicit Module() call is verified', async () => {
  A2 = G.analyse(parse(await zip(v2))); const s = A2.graph.edges.filter(x => x.from.includes('approveReq#script1'));
  assert.ok(s.some(x => x.to === 'module:inventoryrequest' && x.level === 'verified')); assert.ok(s.some(x => x.to === 'module:workorder' && x.level === 'uncertain'), 'a name inside the text stays uncertain');
  assert.ok(!s.some(x => x.to === 'module:workorder' && x.level === 'verified'));
});
await t('validation: missing lookup target, missing connected app and template are flagged, disabled rules are skipped', async () => {
  const f = A2.findings; assert.ok(f.some(x => x.level === 'broken' && /ghostmodule/.test(x.text))); assert.ok(f.some(x => /Missing template/.test(x.text) && x.level === 'uncertain')); assert.equal(A2.stats.disabled.rules, 1);
  assert.ok(!A2.items.some(i => /Old rule/.test(i.title)));
});
let guide, props;
await t('diff: new, changed, removed and unchanged against the earlier inventory', async () => {
  const d = G.diff(A1.items, A2.items); const k = o => o.map(x => x.key).sort();
  assert.deepEqual(k(d.changed), ['module:inventoryrequest']); assert.ok(d.changed[0].addedLines.some(l => /Critical/.test(l.t))); assert.ok(k(d.added).includes('button:inventoryrequest/approveReq') && k(d.added).includes('rule:inventoryrequest/markUrgent'));
  assert.deepEqual(k(d.removed), ['notification:inventoryrequest/newReq']); assert.ok(k(d.unchanged).includes('button:workorder/createInv'));
  assert.equal(G.diff(A1.items, A1.items).changed.length + G.diff(A1.items, A1.items).added.length, 0, 'same package, no changes');
});
await t('proposals touch only affected sections; manual wording is never overwritten silently', async () => {
  guide = { sections: [{ id: 'a', title: 'Getting started', blocks: [{ t: 'md', text: 'Welcome to the guide.' }] }, { id: 'b', title: 'Inventory Request', blocks: [{ t: 'md', text: 'Our own words about requests.' }] }] };
  const d1 = G.diff([], A1.items); const p1 = G.propose(guide, d1, {}); assert.ok(p1.length >= 3);
  p1.forEach(p => G.apply(guide, p, 'proposed')); assert.equal(guide.sections[0].blocks.length, 1, 'unrelated section untouched'); assert.ok(guide.sections[1].blocks.length > 1, 'added to the matching section');
  const gb = G.genBlock(guide, 'module:inventoryrequest'); assert.ok(gb);
  // someone edits the generated text by hand
  gb.block.text += '\nIMPORTANT: always check stock first.';
  const d = G.diff(A1.items, A2.items); props = G.propose(guide, d, {});
  const up = props.find(p => p.key === 'module:inventoryrequest'); assert.equal(up.type, 'update'); assert.equal(up.conflict, true, 'manual edit raises a conflict'); assert.ok(up.added.some(x => /Critical/.test(x)));
  const rm = props.find(p => p.key === 'notification:inventoryrequest/newReq'); assert.equal(rm.type, 'remove');
  G.apply(guide, up, 'mine'); assert.ok(G.genBlock(guide, 'module:inventoryrequest').block.text.includes('IMPORTANT'), 'keep mine retains the manual text');
  assert.equal(G.diff(A1.items, A2.items).changed.length, 1);
});
await t('accepting the proposed wording replaces it; editing before accepting keeps the edit', async () => {
  const up = G.propose({ sections: [{ id: 's', title: 'X', blocks: [{ t: 'md', text: 'old', gen: { key: 'module:inventoryrequest', hash: 'x', base: 'old' } }] }] }, G.diff(A1.items, A2.items), {}).find(p => p.key === 'module:inventoryrequest'); assert.equal(up.conflict, false);
  const g = { sections: [{ id: 's', title: 'X', blocks: [{ t: 'md', text: 'old', gen: { key: 'module:inventoryrequest', hash: 'x', base: 'old' } }] }] }; G.apply(g, up, 'proposed'); assert.ok(/Critical/.test(g.sections[0].blocks[0].text));
  const g2 = { sections: [{ id: 's', title: 'X', blocks: [{ t: 'md', text: 'old', gen: { key: 'module:inventoryrequest', hash: 'x', base: 'old' } }] }] }; G.apply(g2, up, 'edited', 'My rewrite'); assert.equal(g2.sections[0].blocks[0].text, 'My rewrite');
  const rm = G.propose(g, G.diff(A1.items, A2.items), {}).find(p => p.type === 'remove'); assert.equal(rm, undefined, 'nothing to remove when the guide has no generated block for it');
});
await t('pre-publish checks: pending changes, conflicts, markup and code in text, items missing from the configuration', async () => {
  const g = { sections: [{ id: 's', title: 'X', blocks: [{ t: 'md', text: 'Click <Action_Type>x</Action_Type> and id 123e4567-e89b-12d3-a456-426614174000' }, { t: 'md', text: 'Ghost', gen: { key: 'button:workorder/gone', hash: 'h', base: 'Ghost' } }] }] };
  const v = G.validate(g, A2, props.slice(0, 2)); assert.ok(v.some(x => /markup/.test(x.what))); assert.ok(v.some(x => /identifiers/.test(x.what))); assert.ok(v.some(x => /not in the uploaded configuration/.test(x.what))); assert.ok(v.some(x => /not decided/.test(x.what))); assert.ok(v.some(x => x.sev === 'high' && /ghostmodule/.test(x.what)));
});
await t('an unusable ZIP yields no invented content', async () => {
  const b = parse({ 'components/readme.xml': '<x/>' }); const a = G.analyse(b); assert.equal(a.items.length, 0); assert.equal(a.graph.edges.length, 0);
});
console.log(`\n${n} guide-intelligence checks passed`);
