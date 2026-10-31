/* Facilio organisation package export (pure code: no DOM, no network; runs in the browser and in Node tests).
   Delivery Studio never changes a live Facilio organisation. This builds a ZIP in the shape of a Facilio standalone package, from the project's
   approved configuration, for the office Claude + Org Builder skill (or a person) to implement and validate separately.

   What the format is based on (all from the sample package standalone_package_400000077_1792134301142.zip, inspected 28 Oct 2026):
   - layout: PackageConf.xml (name, displayName, version 1.0, type 1, <Components><Component Type="X">X.xml</Component>…, Feature_License_List),
     components/<TYPE>.xml (root <Components>, one element per record, named after the type), an empty metafiles/ folder, error-log.txt;
   - every record: attributes Created_Version="1.0" Modified_Version="1.0" [Parent_Id] Status="ADDED" Type="<n>" Unique_Identifier, child elements;
   - Parent_Id of FIELD, STATE_FLOW, STATE_TRANSITION and TICKET_STATUS is the module's Unique_Identifier (FIELD: 6396 of 6396);
   - references between records are by name: moduleName, StateflowLinkName, FromStateName / ToStateName = TICKET_STATUS.status of that module (173 of 173);
   - a user-made field is named "<display name, lower case, other characters as _>_<module name>" (40 of 40 user-made fields);
   - child elements and their order per field type are copied from user-made fields of that type in the sample (see FIELD_T).
   Not known from the sample, so not invented: whether import accepts new Unique_Identifier values (new records get new numbers, flagged), whether
   Status="MODIFIED"/removals exist (only ADDED is in the sample: changes and removals are listed as manual steps), Feature_License_List (org specific:
   left out, flagged), transition conditions, actions, approvals and role assignments (no structured source in Delivery Studio: manual steps). */
(function (root) {
  'use strict';
  // ---------- a small, safe XML writer (escaping is done here, never by string concatenation of values) ----------
  const esc = v => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
  function el(tag, attrs, kids) { if (!NAME_RE.test(tag)) throw new Error('Bad element name ' + tag); return { tag, attrs: attrs || null, kids: kids === undefined ? null : kids }; }
  function ser(n, ind) {
    ind = ind || ''; const a = n.attrs ? Object.keys(n.attrs).map(k => { if (!NAME_RE.test(k)) throw new Error('Bad attribute ' + k); return ' ' + k + '="' + esc(n.attrs[k]) + '"'; }).join('') : '';
    if (n.kids == null || n.kids === '') return ind + '<' + n.tag + a + ' />';
    if (!Array.isArray(n.kids)) return ind + '<' + n.tag + a + '>' + esc(n.kids) + '</' + n.tag + '>';
    return ind + '<' + n.tag + a + '>\n' + n.kids.map(k => ser(k, ind + '   ')).join('\n') + '\n' + ind + '</' + n.tag + '>';
  }
  const doc = (rootTag, kids) => ser(el(rootTag, null, kids)) + '\n';
  const kv = (k, v) => el(k, null, v === '' || v == null ? '' : String(v));

  // ---------- naming rules seen in the sample ----------
  const fieldName = (label, mod) => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + mod;
  const linkName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const statusName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const COMPONENT_TYPE = { MODULE: 1, FIELD: 2, TICKET_STATUS: 24, STATE_FLOW: 40, STATE_TRANSITION: 41 };
  const ORDER = ['MODULE', 'TICKET_STATUS', 'FIELD', 'STATE_FLOW', 'STATE_TRANSITION'];   // the order these types have in the sample's PackageConf.xml

  // field types: DataType / Display_Type and the type-specific children, as in user-made fields of the sample
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const values = opts => el('values', null, opts.map((o, i) => el('Value_Element', null, [kv('sequence', i + 1), kv('visible', 'true'), kv('index', i + 1), kv('value', o)])));
  const num = () => [kv('unit', ''), kv('minValue', ''), kv('metric', -1), kv('maxValue', ''), kv('counterField', ''), kv('unitId', -1)];
  const FIELD_T = {
    'Single Line Text': { dt: 1, dp: 1, extra: () => [kv('regex', ''), kv('maxLength', -1)] },
    'Multi Line Text': { dt: 18, dp: 2, extra: () => [kv('regex', ''), kv('maxLength', -1)] },
    'Rich Text': { dt: 17, dp: 2, extra: () => [kv('skipSizeCheck', 'false')] },
    'Number': { dt: 2, dp: 9, extra: num },
    'Decimal': { dt: 3, dp: 9, extra: num },
    'Boolean': { dt: 4, dp: 5, extra: () => [kv('trueVal', ''), kv('falseVal', '')] },
    'Date': { dt: 5, dp: 6, extra: () => [el('allowedDays', null, DAYS.map(d => el('Value_Element', null, [kv('value', d)])))] },
    'Date Time': { dt: 6, dp: 7, extra: () => [kv('allowedDays', '')] },
    'Lookup': { dt: 7, dp: 10, lookup: true },
    'Picklist': { dt: 8, dp: 3, options: true },
    'Multi Picklist': { dt: 14, dp: 3, options: true }
  };

  /* model (made by collect() in the browser, or by a test):
     { orgId, packageName, reference: bool, brdSigned: bool,
       modules: { name: { uid, label, fields: [names], statuses: [{ name, label, typeCode }], flows: [{ name, link }] } },   // the baseline org
       newModules: [{ name, label, description, stateflow: bool, src }],
       newFields: [{ module, label, type, required, mainField, options: [..], lookup, src: { reqs: [{ id, status }] } }],
       flows: [{ key, module, name, description, criteria, initial (state id), isNew, states: [{ id, label, name?, closed?, existing? }], transitions: [{ id, name, from, to, type, condition, commentRequired, buttonType, portals, extras: [..] }], src }],
       changes: [ { area, item, detail } ]   // modifications and removals: manual steps }
     opts: { includeDrafts, selected: Set of component keys or null (all eligible), closedStates: Set of 'flowKey|stateId', now (ms) } */
  function build(model, opts) {
    opts = opts || {}; const now = opts.now || Date.now(); const items = []; const manual = []; const warn = [];
    let nextId = 9000000000 + (now % 1000000) * 100;   // new records need identifiers; these are far above the sample's range and are flagged for confirmation
    const newId = () => String(nextId++);
    const baseMod = n => (model.modules || {})[n];
    const newMods = new Map((model.newModules || []).map(m => [m.name, m]));
    const modExists = n => !!baseMod(n) || newMods.has(n);
    const readiness = src => { const reqs = (src && src.reqs) || []; if (reqs.some(r => /^(Rejected|Deferred)$/.test(r.status))) return 'blocked'; if (!model.brdSigned) return 'draft'; if (reqs.length && !reqs.some(r => r.status === 'Confirmed')) return 'clarify'; return 'ready'; };
    const add = it => { it.readiness = it.errors.length ? 'error' : it.unsupported ? 'unsupported' : readiness(it.src); items.push(it); return it; };
    const modUid = {};
    // 1. new custom modules (+ their main "name" field, which every custom module in the sample has)
    (model.newModules || []).forEach(m => {
      const errs = []; if (!/^custom_[a-z0-9]+$/.test(m.name)) errs.push('The module name must look like custom_<letters and digits> (as in the sample).'); if (baseMod(m.name)) errs.push('A module with this name already exists in the organisation.');
      const uid = newId(); modUid[m.name] = uid;
      add({ key: 'MODULE:' + m.name, type: 'MODULE', name: m.label + ' (' + m.name + ')', module: m.name, src: m.src, errors: errs, deps: [], uidNew: true,
        rec: el('MODULE', { Created_Version: '1.0', Modified_Version: '1.0', Status: 'ADDED', Type: COMPONENT_TYPE.MODULE, Unique_Identifier: uid }, [kv('name', m.name), kv('Description', m.description || ''), kv('displayName', m.label), kv('Module_Type', 1), kv('IsCustom', 'true'), kv('Is_StateFlow_Enabled', m.stateflow ? 'true' : 'false'), kv('isHiddenModule', 'false')]) });
    });
    const parentOf = mod => modUid[mod] || (baseMod(mod) && baseMod(mod).uid) || '';
    // 2. new fields
    const seen = new Set();
    (model.newFields || []).forEach(f => {
      const t = FIELD_T[f.type]; const isMain = f.mainField && newMods.has(f.module) && /^name$/i.test(f.name || '');
      const name = isMain ? 'name' : fieldName(f.label, f.module); const key = 'FIELD:' + f.module + '.' + name; const errs = []; let unsupported = '';
      if (!modExists(f.module)) errs.push('Module ' + f.module + ' is not in the organisation package and is not a new module of this project.');
      if (!t) unsupported = 'Field type "' + f.type + '" is not exported yet: no user-made field of this type in the sample package to copy the format from.';
      if (!String(f.label || '').trim()) errs.push('The field has no display name.');
      if (seen.has(key)) errs.push('Two new fields would get the same name ' + name + '.'); seen.add(key);
      const bm = baseMod(f.module); if (bm && (bm.fields || []).includes(name)) errs.push('The module already has a field named ' + name + '.');
      if (t && t.options && !(f.options || []).filter(Boolean).length) errs.push('A picklist needs at least one option.');
      if (t && t.lookup && !modExists(f.lookup)) errs.push('The lookup points to "' + (f.lookup || '(none)') + '", which is not a known module.');
      const deps = newMods.has(f.module) ? ['MODULE:' + f.module] : [];
      let rec = null;
      if (t && !errs.length) {
        const base = [kv('name', name), kv('displayName', f.label), kv('moduleName', f.module), kv('Locked', 'false'), kv('Required', f.required ? 'true' : 'false'), kv('Is_Default', isMain ? 'true' : 'false'), kv('DataType', isMain ? 1 : t.dt), kv('Main_Field', isMain ? 'true' : 'false'), kv('Display_Type', isMain ? 1 : t.dp)];
        let extra = isMain ? FIELD_T['Single Line Text'].extra() : t.extra ? t.extra() : [];
        if (!isMain && t.options) extra = [values((f.options || []).filter(Boolean))];
        if (!isMain && t.lookup) extra = [kv('specialType', ''), kv('relatedListDisplayName', (newMods.get(f.module) || baseMod(f.module) || {}).label || f.module), kv('lookupModuleName', f.lookup)];
        rec = el('FIELD', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(f.module), Status: 'ADDED', Type: COMPONENT_TYPE.FIELD, Unique_Identifier: newId() }, base.concat(extra));
      }
      add({ key, type: 'FIELD', name: f.label + ' (' + name + ')', module: f.module, src: f.src, errors: errs, unsupported, deps, rec, uidNew: true });
    });
    // 3. state flows: new flows, and new states / transitions added to existing flows
    (model.flows || []).forEach(fl => {
      const bm = baseMod(fl.module); const baseStatus = new Map(((bm && bm.statuses) || []).map(s => [s.name.toLowerCase(), s]));
      const flowLink = fl.isNew ? linkName(fl.name) : fl.link; const flowKey = 'STATE_FLOW:' + fl.module + '.' + flowLink; const errs0 = [];
      if (!modExists(fl.module)) errs0.push('Module ' + fl.module + ' is not known.');
      if (fl.isNew && bm && (bm.flows || []).some(x => x.link === flowLink)) errs0.push('The module already has a state flow with the link name ' + flowLink + '.');
      // statuses: a state that is not a status of the module yet becomes a new TICKET_STATUS
      const stName = {}; const newStates = [];
      fl.states.forEach(s => { const n = s.name && baseStatus.has(String(s.name).toLowerCase()) ? baseStatus.get(String(s.name).toLowerCase()).name : (baseStatus.has(statusName(s.label)) ? baseStatus.get(statusName(s.label)).name : null); stName[s.id] = n || statusName(s.label); if (!n) newStates.push(s); });
      const statusKeys = {};
      if (!modExists(fl.module)) newStates.length = 0;   // no statuses for a module that is not known (the flow and its transitions carry the error)
      newStates.forEach(s => {
        const name = stName[s.id]; const key = 'TICKET_STATUS:' + fl.module + '.' + name; statusKeys[s.id] = key; if (items.some(i => i.key === key)) return;
        const closed = opts.closedStates && opts.closedStates.has(fl.key + '|' + s.id); const errs = [];
        if (!name) errs.push('The state has no name.');
        add({ key, type: 'TICKET_STATUS', name: s.label + ' (' + name + ')', module: fl.module, src: fl.src, errors: errs, deps: newMods.has(fl.module) ? ['MODULE:' + fl.module] : [], uidNew: true, needsChoice: { flow: fl.key, state: s.id, closed },
          rec: errs.length ? null : el('TICKET_STATUS', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(fl.module), Status: 'ADDED', Type: COMPONENT_TYPE.TICKET_STATUS, Unique_Identifier: newId() }, [kv('parentModuleName', fl.module), kv('displayName', s.label), kv('recordLocked', 'false'), kv('requestedState', 'false'), kv('status', name), kv('timerEnabled', 'false'), kv('typeCode', closed ? 2 : 1)]) });
      });
      if (fl.isNew) {
        const init = fl.states.find(s => s.id === fl.initial); const errs = errs0.slice(); if (!init) errs.push('The state flow has no default (first) state.');
        if (String(fl.criteria || '').trim()) warn.push({ item: fl.name, detail: 'The flow\'s entry condition ("' + fl.criteria + '") is text only in Delivery Studio; add it as criteria when implementing.' });
        const order = ((bm && bm.flows) || []).length + 1;
        add({ key: flowKey, type: 'STATE_FLOW', name: fl.name + ' (' + fl.module + ')', module: fl.module, src: fl.src, errors: errs, deps: (newMods.has(fl.module) ? ['MODULE:' + fl.module] : []).concat(init && statusKeys[init.id] ? [statusKeys[init.id]] : []), uidNew: true,
          rec: errs.length ? null : el('STATE_FLOW', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(fl.module), Status: 'ADDED', Type: COMPONENT_TYPE.STATE_FLOW, Unique_Identifier: newId() }, [kv('name', fl.name), kv('Description', fl.description || ''), kv('moduleName', fl.module), kv('StateflowLinkName', flowLink), kv('Activity_Type', 'CREATE'), kv('defaultStateflow', 'false'), kv('defaultStateName', init ? stName[init.id] : ''), kv('Rule_Type', 'STATE_FLOW'), kv('draft', 'false'), kv('draftParentId', -1), kv('Execution_Order', order), kv('Status', 'true'), kv('On_Success', 'false'), kv('Locked', 'false')]) });
      }
      fl.transitions.forEach(t => {
        const link = linkName(t.name); const key = 'STATE_TRANSITION:' + fl.module + '.' + flowLink + '.' + link + '.' + t.id; const errs = []; let unsupported = '';
        if (!stName[t.from] || !stName[t.to]) errs.push('The transition starts or ends at a state that is not in the flow.');
        if (!link) errs.push('The transition has no name.');
        if (String(t.condition || '').trim()) unsupported = 'The transition has a condition ("' + t.condition + '"), which is text only in Delivery Studio; the sample stores conditions as structured criteria. Implement it by hand.';
        if (t.type && t.type !== 'user') unsupported = unsupported || 'Only buttons a user presses (type 1 in the sample) are exported; this transition is "' + t.type + '".';
        (t.extras || []).forEach(x => manual.push({ area: 'Transition ' + t.name, detail: x }));
        const deps = (fl.isNew ? [flowKey] : []).concat([statusKeys[t.from], statusKeys[t.to]].filter(Boolean)).concat(newMods.has(fl.module) ? ['MODULE:' + fl.module] : []);
        const P = t.portals || []; const show = p => P.includes(p) ? 'true' : 'false';
        add({ key, type: 'STATE_TRANSITION', name: t.name + ' (' + fl.name + ')', module: fl.module, src: t.src || fl.src, errors: errs0.concat(errs), unsupported, deps, uidNew: true,
          rec: errs0.length || errs.length || unsupported ? null : el('STATE_TRANSITION', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(fl.module), Status: 'ADDED', Type: COMPONENT_TYPE.STATE_TRANSITION, Unique_Identifier: newId() }, [kv('moduleName', fl.module), kv('FromStateName', stName[t.from]), kv('ToStateName', stName[t.to]), kv('StateflowName', fl.name), kv('StateflowLinkName', flowLink), kv('Type', 1), kv('name', t.name), kv('linkName', link), kv('Status', t.enabled === false ? 'false' : 'true'), kv('Activity_Type', 'STATE_TRANSITION'), kv('Rule_Type', 'STATE_RULE'), kv('ShouldExecuteFromPermalink', 'false'), kv('ShowInClientPortal', show('client')), kv('ShowInOccupantPortal', show('occupant')), kv('ShowInTenantPortal', show('tenant')), kv('ShowInVendorPortal', show('vendor')), kv('Comment_Required', t.commentRequired ? 'true' : 'false'), kv('ButtonType', Number(t.buttonType) || 0), kv('ValidationList', '')]) });
      });
    });
    (model.changes || []).forEach(c => manual.push(c));
    // selection: what is eligible, what was picked, and the dependencies that come with it
    const byKey = new Map(items.map(i => [i.key, i]));
    const eligible = i => !!i.rec && (i.readiness === 'ready' || (opts.includeDrafts && (i.readiness === 'draft' || i.readiness === 'clarify')));
    const want = new Set(items.filter(i => eligible(i) && (!opts.selected || opts.selected.has(i.key))).map(i => i.key));
    let grew = true; while (grew) { grew = false; [...want].forEach(k => (byKey.get(k).deps || []).forEach(d => { if (!want.has(d)) { want.add(d); grew = true; } })); }
    const missing = []; want.forEach(k => { const i = byKey.get(k); (i.deps || []).forEach(d => { const di = byKey.get(d); if (!di || !eligible(di)) missing.push({ item: i.name, detail: 'needs ' + (di ? di.name + ' (' + di.readiness + ')' : d) }); }); });
    items.forEach(i => { i.included = want.has(i.key) && !missing.some(m => m.item === i.name); i.auto = i.included && !!opts.selected && !opts.selected.has(i.key); });
    // the package files: only types that have records, in the sample's order
    const files = {}; const types = ORDER.filter(T => items.some(i => i.included && i.type === T));
    types.forEach(T => { files['components/' + T + '.xml'] = doc('Components', items.filter(i => i.included && i.type === T).map(i => i.rec)); });
    const name = 'delivery_studio_package_' + (model.orgId || 'org') + '_' + now;
    files['PackageConf.xml'] = doc('Package', [kv('name', name), kv('displayName', name), kv('version', '1.0'), kv('type', 1), el('Components', null, types.map(T => el('Component', { Type: T }, T + '.xml')))]);
    const draft = items.some(i => i.included && i.readiness !== 'ready');
    if (items.some(i => i.included && i.uidNew)) warn.push({ item: 'Identifiers', detail: 'New records carry new Unique_Identifier numbers (from ' + (9000000000 + (now % 1000000) * 100) + '). The sample only shows identifiers the organisation gave; confirm with the Org Builder skill how new records must be numbered.' });
    if (model.reference) warn.push({ item: 'Organisation', detail: 'The project uses the bundled Facilio reference configuration (org ' + model.orgId + '), not the customer\'s own organisation package: Parent_Id values point to modules in that org. Import the customer\'s package in Configuration Inputs before exporting for their org.' });
    warn.push({ item: 'PackageConf.xml', detail: 'The sample ends with a Feature_License_List (licence values of that organisation). It is left out because it belongs to the target org; confirm whether the import needs it.' });
    return { name: (draft ? 'DRAFT_' : '') + name, files, items, manual, warnings: warn, missing, draft, types, counts: types.reduce((o, T) => (o[T] = items.filter(i => i.included && i.type === T).length, o), {}) };
  }

  /* Structural check of a built (or re-opened) package: every file parses, PackageConf lists exactly the component files, records carry the
     attributes of the sample, Parent_Id and name references resolve inside the package or to the organisation, identifiers are unique. */
  const arr = nl => Array.from({ length: nl ? nl.length : 0 }, (_, i) => nl.item ? nl.item(i) : nl[i]);   // NodeLists from browsers and from @xmldom/xmldom
  function verify(files, model, DOMParser) {
    const out = { ok: true, errors: [], checked: 0 }; const bad = m => { out.ok = false; out.errors.push(m); };
    const P = new DOMParser(); const parse = (n, t) => { const d = P.parseFromString(t, 'text/xml'); const pe = d.getElementsByTagName('parsererror'); if (!d.documentElement || pe.length) { bad(n + ' is not valid XML'); return null; } return d; };
    const conf = files['PackageConf.xml'] ? parse('PackageConf.xml', files['PackageConf.xml']) : null; if (!conf) { bad('PackageConf.xml is missing'); return out; }
    const listed = arr(conf.getElementsByTagName('Component')).map(c => 'components/' + c.textContent);
    const comps = Object.keys(files).filter(f => /^components\//.test(f));
    listed.forEach(f => { if (!files[f]) bad('PackageConf.xml lists ' + f + ' but the file is missing'); }); comps.forEach(f => { if (!listed.includes(f)) bad(f + ' is not listed in PackageConf.xml'); });
    const uids = new Set(), mods = new Map(), statuses = new Map(), flows = new Set();
    Object.entries((model && model.modules) || {}).forEach(([n, m]) => { mods.set(n, m.uid); (m.statuses || []).forEach(s => statuses.set(n + '|' + s.name, 1)); (m.flows || []).forEach(f => flows.add(n + '|' + f.link)); });
    const recs = {}; comps.forEach(f => { const d = parse(f, files[f]); if (!d) return; const T = f.slice(11, -4); recs[T] = arr(d.documentElement.childNodes).filter(n => n.nodeType === 1);
      recs[T].forEach(r => { out.checked++; if (r.nodeName !== T) bad(f + ': record <' + r.nodeName + '> in the ' + T + ' file');
        ['Created_Version', 'Modified_Version', 'Status', 'Type', 'Unique_Identifier'].forEach(a => { if (!r.getAttribute(a)) bad(f + ': a record has no ' + a); });
        const u = r.getAttribute('Unique_Identifier'); if (uids.has(u)) bad('Unique_Identifier ' + u + ' is used twice'); uids.add(u); }); });
    const t = (r, k) => { const e = r.getElementsByTagName(k)[0]; return e ? e.textContent : ''; };
    (recs.MODULE || []).forEach(r => mods.set(t(r, 'name'), r.getAttribute('Unique_Identifier')));
    (recs.TICKET_STATUS || []).forEach(r => statuses.set(t(r, 'parentModuleName') + '|' + t(r, 'status'), 1));
    (recs.STATE_FLOW || []).forEach(r => flows.add(t(r, 'moduleName') + '|' + t(r, 'StateflowLinkName')));
    const parentOk = (r, m) => { if (!mods.has(m)) bad(r.nodeName + ' refers to module ' + m + ', which is neither in the package nor in the organisation'); else if (r.getAttribute('Parent_Id') !== mods.get(m)) bad(r.nodeName + ' ' + (t(r, 'name') || t(r, 'status')) + ': Parent_Id does not match module ' + m); };
    (recs.FIELD || []).forEach(r => { parentOk(r, t(r, 'moduleName')); if (t(r, 'DataType') === '7' && !mods.has(t(r, 'lookupModuleName'))) bad('Lookup ' + t(r, 'name') + ' points to an unknown module'); });
    (recs.TICKET_STATUS || []).forEach(r => parentOk(r, t(r, 'parentModuleName')));
    (recs.STATE_FLOW || []).forEach(r => { parentOk(r, t(r, 'moduleName')); if (!statuses.has(t(r, 'moduleName') + '|' + t(r, 'defaultStateName'))) bad('State flow ' + t(r, 'name') + ': default state ' + t(r, 'defaultStateName') + ' is not a status of the module'); });
    (recs.STATE_TRANSITION || []).forEach(r => { const m = t(r, 'moduleName'); parentOk(r, m); ['FromStateName', 'ToStateName'].forEach(k => { if (!statuses.has(m + '|' + t(r, k))) bad('Transition ' + t(r, 'name') + ': ' + k + ' ' + t(r, k) + ' is not a status of ' + m); }); if (!flows.has(m + '|' + t(r, 'StateflowLinkName'))) bad('Transition ' + t(r, 'name') + ': state flow ' + t(r, 'StateflowLinkName') + ' is not in the package or the organisation'); });
    return out;
  }

  // The supplemental report (a separate download: nothing is added inside the package folders)
  function report(res, model, check) {
    const L = []; const st = { ready: 'Ready', draft: 'Draft (BRD not signed off)', clarify: 'Awaiting clarification (source requirement not confirmed)', blocked: 'Blocked (source requirement rejected or deferred)', unsupported: 'Not exportable yet', error: 'Validation error' };
    L.push('# Organisation package report: ' + res.name, '', 'Generated by Facilio Delivery Studio. This package has passed structural validation only; it has NOT been imported into a Facilio organisation. Delivery Studio does not change any live organisation.', '');
    L.push('- Organisation: ' + (model.orgId || 'unknown') + (model.reference ? ' (bundled reference configuration, not the customer\'s own package)' : ''), '- Source package: ' + (model.packageName || 'unknown'), '- BRD signed off: ' + (model.brdSigned ? 'yes' : 'no'), '- Status: ' + (res.draft ? 'DRAFT: contains components that are not approved' : 'approved components only'), '- Structural check: ' + (check ? (check.ok ? 'passed (' + check.checked + ' records)' : 'FAILED: ' + check.errors.join('; ')) : 'not run'), '');
    L.push('## Included components', '', '| Type | Component | Module | Status | Source requirements | Depends on |', '|---|---|---|---|---|---|');
    res.items.filter(i => i.included).forEach(i => L.push('| ' + i.type + ' | ' + i.name + ' | ' + i.module + ' | ' + st[i.readiness] + (i.auto ? ' (added as a dependency)' : '') + ' | ' + (((i.src || {}).reqs || []).map(r => r.id + ' (' + r.status + ')').join(', ') || 'none recorded') + ' | ' + ((i.deps || []).join(', ') || '—') + ' |'));
    L.push('', '## Not included', '', '| Type | Component | Status | Reason |', '|---|---|---|---|');
    res.items.filter(i => !i.included).forEach(i => L.push('| ' + i.type + ' | ' + i.name + ' | ' + st[i.readiness] + ' | ' + ([].concat(i.errors, i.unsupported ? [i.unsupported] : []).join(' ') || (i.readiness === 'ready' ? 'not selected' : st[i.readiness])) + ' |'));
    L.push('', '## Manual implementation steps (not representable in the package)', ''); (res.manual.length ? res.manual : [{ area: '—', detail: 'None' }]).forEach(m => L.push('- ' + (m.area || m.item) + ': ' + m.detail));
    L.push('', '## Warnings', ''); res.warnings.concat(res.missing).forEach(w => L.push('- ' + w.item + ': ' + w.detail));
    L.push('', '## For the Org Builder skill', '', 'The ZIP follows the layout of the sample standalone package (PackageConf.xml, components/<TYPE>.xml, metafiles/). The Org Builder skill\'s own input requirements were not available to Delivery Studio; confirm them before importing. Records are new (Status="ADDED"); changes to existing configuration and removals are listed above as manual steps.');
    return L.join('\n') + '\n';
  }
  const api = { build, verify, report, fieldName, linkName, statusName, FIELD_T, ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOrgPkg = api;
})(typeof window !== 'undefined' ? window : globalThis);
