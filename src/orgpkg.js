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
   left out, flagged), view filters other than "state is / is not" on a custom module, transition conditions, actions, approvals and role assignments (no structured source in Delivery Studio: manual steps). */
(function (root) {
  'use strict';
  // ---------- a small, safe XML writer (escaping is done here, never by string concatenation of values) ----------
  const esc = v => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
  function el(tag, attrs, kids) { if (!NAME_RE.test(tag)) throw new Error('Bad element name ' + tag); return { tag, attrs: attrs || null, kids: kids === undefined ? null : kids }; }
  function ser(n, ind) {
    ind = ind || ''; if (n.cdata != null) return ind + '<' + n.tag + '><![CDATA[' + String(n.cdata).split(']]>').join(']]]]><![CDATA[>') + ']]></' + n.tag + '>'; const a = n.attrs ? Object.keys(n.attrs).map(k => { if (!NAME_RE.test(k)) throw new Error('Bad attribute ' + k); return ' ' + k + '="' + esc(n.attrs[k]) + '"'; }).join('') : '';
    if (n.kids == null || n.kids === '') return ind + '<' + n.tag + a + ' />';
    if (!Array.isArray(n.kids)) return ind + '<' + n.tag + a + '>' + esc(n.kids) + '</' + n.tag + '>';
    return ind + '<' + n.tag + a + '>\n' + n.kids.map(k => ser(k, ind + '   ')).join('\n') + '\n' + ind + '</' + n.tag + '>';
  }
  const doc = (rootTag, kids) => ser(el(rootTag, null, kids)) + '\n';
  const cd = (k, v) => { if (!NAME_RE.test(k)) throw new Error('Bad element name ' + k); return { tag: k, attrs: null, kids: null, cdata: v }; };
  const kv = (k, v) => el(k, null, v === '' || v == null ? '' : String(v));

  // ---------- naming rules seen in the sample ----------
  const fieldName = (label, mod) => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + mod;
  const linkName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const statusName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const COMPONENT_TYPE = { MODULE: 1, FIELD: 2, TICKET_STATUS: 24, STATE_FLOW: 40, STATE_TRANSITION: 41, NOTIFICATION: 42, VIEW: 12, VIEW_GROUP: 97 };
  const ORDER = ['MODULE', 'TICKET_STATUS', 'FIELD', 'VIEW_GROUP', 'VIEW', 'STATE_FLOW', 'STATE_TRANSITION', 'NOTIFICATION'];   // the order these types have in the sample's PackageConf.xml

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

    // 4. notifications (from the Notifications tab). Shape copied from the user-made notifications of the sample (NOTIFICATION.xml, 27 records):
    //    a "created" rule (Activity_Type CREATE, TriggerLinkName create) or a state rule (FIELD_CHANGE on moduleState, criteria by the status identifier),
    //    with an email action (BULK_EMAIL_NOTIFICATION: subject, HTML message, ${placeholders}, "to" = the current user or a field's email).
    const statusOf = (mod, label) => {
      const want = String(label || '').trim().toLowerCase(); if (!want) return null; const bm = baseMod(mod);
      const hit = ((bm && bm.statuses) || []).find(x => String(x.label || '').toLowerCase() === want || String(x.name || '').toLowerCase() === want);
      if (hit && hit.uid) return { name: hit.name, uid: hit.uid };
      const own = items.find(i => i.type === 'TICKET_STATUS' && i.module === mod && i.rec && i.name.toLowerCase().startsWith(want + ' ('));
      return own ? { name: own.key.slice(own.key.lastIndexOf('.') + 1), uid: own.rec.attrs.Unique_Identifier, dep: own.key } : null;
    };
    const html = t => String(t || '').split(/\r?\n/).map(l => '<p>' + esc(l) + '</p>').join('');
    const tokens = (...texts) => { const out = []; texts.join(' ').replace(/\$\{([A-Za-z0-9_.]+)(?::-)?\}/g, (m, p) => { if (!out.includes(p)) out.push(p); return m; }); return out; };
    (model.notifications || []).forEach(n => {
      const mod = n.module; const link = linkName(n.name) + '__C'; const key = 'NOTIFICATION:' + mod + '.' + link; const errs = []; let unsupported = ''; const deps = newMods.has(mod) ? ['MODULE:' + mod] : [];
      const ch = n.channels || {}; const email = !!ch.email; const others = ['push', 'sms', 'whatsapp', 'inapp'].filter(k => ch[k]).map(k => ({ push: 'push', sms: 'SMS', whatsapp: 'WhatsApp', inapp: 'in-app' })[k]);
      if (!String(n.name || '').trim()) errs.push('The notification has no name.');
      if (!modExists(mod)) errs.push('Module ' + mod + ' is not in the organisation package and is not a new module of this project.');
      if (items.some(i => i.key === key)) errs.push('Two notifications would get the same link name ' + link + '.');
      if (email && !(String(n.subject || '').trim() && String(n.message || '').trim())) errs.push('An email notification needs a subject and a message.');
      if (!email) unsupported = 'Only the email channel is exported (' + (others.length ? 'this one uses ' + others.join(', ') : 'no channel is chosen') + ').';
      let st = null; const byState = n.trigger === 'state';
      if (byState) { st = statusOf(mod, n.state); if (!st) errs.push('The state "' + (n.state || '') + '" is not a state of ' + mod + ' (in the organisation or in this project\'s new states).'); else if (st.dep) deps.push(st.dep);
        if (!newMods.has(mod)) unsupported = unsupported || 'State rules are exported for new custom modules only: the rule names the module\'s own database column (CustomModuleData.MODULE_STATE in the sample), which is not known for other modules.'; }
      if (others.length && email) manual.push({ area: 'Notification ' + n.name, detail: 'Also meant to go by ' + others.join(', ') + ': those channels are not exported yet. Set them up by hand.' });
      if ((n.recipients || []).length) manual.push({ area: 'Notification ' + n.name, detail: 'Recipients (' + n.recipients.join(', ') + '): the package stores recipients as a script or a field\'s email, not as role names. Choose the recipients when implementing.' });
      let rec = null;
      if (!errs.length && !unsupported) {
        const toExpr = n.toField ? '${' + mod + '.' + n.toField + '.email:-}' : '${cs.email}'; const names = tokens(n.subject, n.message, toExpr);
        const prm = nm => el('parameter', null, [kv('name', nm), kv('typeString', 'String'), kv('workflowFieldType', 'STRING')]);
        const action = el('Action', null, [kv('Action_Type', 'BULK_EMAIL_NOTIFICATION'), el('Serialized_Action', null, [kv('Action_Name', n.name + '_BULK_EMAIL_NOTIFICATION_Action'), kv('Link_Name', ''), kv('Action_Type', 3), kv('Action_Type', 'BULK_EMAIL_NOTIFICATION'), kv('Action_Status', 'true'), kv('Module_Name', mod),
          el('Template', null, [kv('Template_Name', n.name + ' Email Template'), kv('Template_Type', 'EMAIL'), cd('Placeholder', JSON.stringify(names)), kv('is_FTL', 'false'), kv('Is_Attachment_Added', 'false'),
            el('workflow', null, [el('expressions', null, [el('Expression', null, [kv('Constant', '${org.domain}'), kv('Name', 'org.domain'), kv('Criteria', '')])]), el('parameters', null, [prm('org.domain'), prm(mod)])]),
            el('Original_Template', null, [el('Value_Element', null, [kv('emailStructureName', n.name), kv('html', 'true'), cd('message', html(n.message)), kv('sendAsSeparateMail', 'true'), kv('subject', n.subject), kv('to', toExpr)])])])])]);
        const desc = (n.note ? n.note + ' ' : '') + ((n.recipients || []).length ? 'Recipients: ' + n.recipients.join(', ') + '.' : '');
        const head = [kv('name', n.name), kv('linkName', link), kv('Description', desc.trim()), kv('moduleName', mod), kv('Activity_Type', byState ? 'FIELD_CHANGE' : 'CREATE'), kv('Execution_Order', -1), kv('Status', n.status === 'off' ? 'false' : 'true'), kv('Rule_Type', 'MODULE_RULE_NOTIFICATION'), kv('On_Success', 'false'),
          kv('Version_Group_Id', -1), kv('Version_Number', -1), kv('Is_Latest_Version', 'true'), kv('Schedule_info', ''), kv('Schedule_Type', 'AFTER'), kv('Time_Interval', -1), kv('Job_Time', ''), kv('Last_Schedule_Rule_Executed_Time', -1), kv('Locked', 'false'), kv('TriggerLinkName', byState ? 'statuschange__C' : 'create')];
        const crit = byState ? [el('Criteria', null, [kv('Pattern', '( 1 )'), el('Conditions_List', null, [el('Condition', null, [kv('Sequence', 1), kv('Value', st.uid), kv('FieldName', 'moduleState'), kv('Column_Name', 'CustomModuleData.MODULE_STATE'), kv('Json_Value', ''), kv('Operator', 36), kv('Is_Expression_Value', 'false'),
          el('PickList_Element', null, [kv('Parent_Module_Name', mod), kv('moduleName', 'ticketstatus'), kv('PickList_Value', st.name)])])]), kv('Criteria_ModuleName', mod)])] : [];
        rec = el('NOTIFICATION', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(mod), Status: 'ADDED', Type: COMPONENT_TYPE.NOTIFICATION, Unique_Identifier: newId() },
          head.concat(crit, [el('Actions_List', null, [action])], byState ? [el('Field_Change_Fields', null, [kv('Change_Field_Name', 'moduleState')])] : []));
      }
      add({ key, type: 'NOTIFICATION', name: n.name + ' (' + mod + ')', module: mod, src: n.src, errors: errs, unsupported, deps, rec, uidNew: true });
    });
    // 5. views (from the Views tab of a module). VIEW_GROUP is added only when the module has no view group with that name in that app yet.
    //    Shape from the sample: columns (View_Fields_List), sort, an optional state filter (Operator 36 = is, 37 = is not, on the module's state column of a custom module),
    //    sharing by role. Any other filter is kept in the agent brief and listed as a manual step, because its database column is not known.
    const SYS_COLS = ['name', 'siteId', 'sysCreatedTime', 'sysModifiedTime'];
    const APPS = model.apps || null; const groupsDone = new Set();
    const customMod = mod => newMods.has(mod) || !!(baseMod(mod) && baseMod(mod).custom);
    const fieldKnown = (mod, fname) => { if (SYS_COLS.includes(fname) && customMod(mod)) return true; const bm = baseMod(mod); if (bm && (bm.fields || []).includes(fname)) return true; return items.some(i => i.type === 'FIELD' && i.module === mod && i.rec && i.key === 'FIELD:' + mod + '.' + fname); };
    (model.views || []).forEach((v, vi) => {
      const mod = v.module; const link = linkName(v.name || v.label) || ('view' + (vi + 1)); const key = 'VIEW:' + mod + '.' + link; const errs = []; let unsupported = ''; const deps = newMods.has(mod) ? ['MODULE:' + mod] : [];
      const app = v.app || 'maintenance'; const bm = baseMod(mod); const isCustom = newMods.has(mod) || !!(bm && bm.custom);
      if (!String(v.label || '').trim()) errs.push('The view has no name.');
      if (!modExists(mod)) errs.push('Module ' + mod + ' is not in the organisation package and is not a new module of this project.');
      if (APPS && !APPS.includes(app)) errs.push('The app "' + app + '" is not an app of the organisation.');
      if (items.some(i => i.key === key)) errs.push('Two views of this module would get the same name ' + link + '.');
      if (((model.baseViews || {})[mod] || []).some(b => b[0] === link && (!b[2] || b[2] === app))) errs.push('The module already has a view named ' + link + ' in this app.');
      const cols = v.columns || []; if (!cols.length) errs.push('A view needs at least one column.');
      cols.forEach(c => { if (!fieldKnown(mod, c.name)) errs.push('Column "' + (c.label || c.name) + '" (' + c.name + ') is not a field of ' + mod + '.'); else { const dk = 'FIELD:' + mod + '.' + c.name; if (items.some(i => i.key === dk)) deps.push(dk); } });
      if (v.sort && v.sort.field && !fieldKnown(mod, v.sort.field)) errs.push('The sort field ' + v.sort.field + ' is not a field of ' + mod + '.');
      let crit = null; const sf = v.stateFilter;
      if (sf && sf.state) { const st = statusOf(mod, sf.state);
        if (!st) errs.push('The state "' + sf.state + '" is not a state of ' + mod + ' (in the organisation or in this project\'s new states).');
        else if (!isCustom) unsupported = 'A state filter is exported for custom modules only: it names the module\'s own state column (CustomModuleData.MODULE_STATE in the sample), which is not known for other modules.';
        else { if (st.dep) deps.push(st.dep); crit = { st, op: sf.op === 'isnot' ? 37 : 36 }; } }
      const others = (v.otherFilters || []).filter(f => f && f.field);
      if (others.length && !unsupported) unsupported = 'This view has filters other than "state is / is not" (' + others.map(f => f.field + ' ' + f.op + ' ' + (f.value || '')).join('; ') + '). Their database columns are not known, so the view is not in the package: create it from the agent brief.';
      others.forEach(f => manual.push({ area: 'View ' + v.label, detail: 'Filter ' + f.field + ' ' + f.op + (f.value ? ' ' + f.value : '') + '.' }));
      const roles = (v.sharedRoles || []).filter(Boolean); const known = new Set(model.roleNames || []); const okRoles = roles.filter(r => !model.roleNames || known.has(r)); const badRoles = roles.filter(r => !okRoles.includes(r));
      if (badRoles.length) manual.push({ area: 'View ' + v.label, detail: 'Share with role(s) ' + badRoles.join(', ') + ': not roles of the organisation package (proposed roles are not exported). Share the view by hand after creating the role.' });
      let rec = null; const grp = v.group || 'allViews'; const grpLabel = v.groupLabel || (v.group ? v.group : 'All Views');
      if (!errs.length && !unsupported) {
        const gKnown = ((model.viewGroups || {})[mod] || []).some(g => g[0] === grp && (!g[2] || g[2] === app));
        const gKey = 'VIEW_GROUP:' + mod + '.' + app + '.' + grp;
        if (!gKnown && !groupsDone.has(gKey)) { groupsDone.add(gKey); deps.push(gKey);
          add({ key: gKey, type: 'VIEW_GROUP', name: grpLabel + ' (' + mod + ', ' + app + ')', module: mod, src: v.src, errors: [], deps: newMods.has(mod) ? ['MODULE:' + mod] : [], uidNew: true,
            rec: el('VIEW_GROUP', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(mod), Status: 'ADDED', Type: COMPONENT_TYPE.VIEW_GROUP, Unique_Identifier: newId() }, [kv('Name', grp), kv('DisplayName', grpLabel), kv('ModuleName', mod), kv('AppLinkName', app), kv('SequenceNumber', -1), kv('ViewGroupType', 1)]) }); }
        else if (!gKnown) deps.push(gKey);
        const colEl = c => el('View_Field', null, [kv('displayName', c.label || c.name), kv('View_Field_Name', c.name), kv('Customization', ''), kv('moduleName', mod), kv('Facilio_Field_Name', c.name)]);
        const kids = [kv('name', link), kv('moduleName', mod), kv('displayName', v.label), kv('isDefault', v.isDefault ? 'true' : 'false'), kv('View_Type', 1), kv('Is_Locked', 'false'), kv('Package_Locked', 'false'), kv('Status', 'true'), kv('Sequence_Number', v.isDefault ? -1 : 1000 + vi),
          kv('Is_List_View', 'true'), kv('Is_Calendar_View', 'false'), kv('IsTimeLineView', 'false'), kv('Exclude_Module_Criteria', 'false'), kv('Is_Hidden', 'false'), kv('AppLinkName', app), kv('ViewGroupName', grp), el('View_Fields_List', null, cols.map(colEl))];
        if (v.sort && v.sort.field) kids.push(el('View_Sort_Fields_List', null, [el('View_Sort_Field', null, [kv('Sort_Field_Name', v.sort.field), kv('Is_Ascending', v.sort.dir === 'asc' ? 'true' : 'false'), kv('moduleName', mod), kv('Facilio_Field_Name', v.sort.field)])]));
        if (crit) kids.push(el('Criteria', null, [kv('Pattern', '( 1 )'), el('Conditions_List', null, [el('Condition', null, [kv('Sequence', 1), kv('Value', crit.st.uid), kv('FieldName', 'moduleState'), kv('Column_Name', 'CustomModuleData.MODULE_STATE'), kv('Json_Value', ''), kv('Operator', crit.op), kv('Is_Expression_Value', 'false'),
          el('PickList_Element', null, [kv('Parent_Module_Name', mod), kv('moduleName', 'ticketstatus'), kv('PickList_Value', crit.st.name)])])]), kv('Criteria_ModuleName', mod)]));
        if (okRoles.length) kids.push(el('View_Sharing', null, [el('Sharing_Context', null, okRoles.map(r => el('Single_Sharing_Context', null, [kv('Sharing_Type', 'ROLE'), kv('Role_Name', r)])))]));
        rec = el('VIEW', { Created_Version: '1.0', Modified_Version: '1.0', Parent_Id: parentOf(mod), Status: 'ADDED', Type: COMPONENT_TYPE.VIEW, Unique_Identifier: newId() }, kids);
      }
      add({ key, type: 'VIEW', name: v.label + ' (' + mod + ')', module: mod, src: v.src, errors: errs, unsupported, deps, rec, uidNew: true });
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
    if (model.reference) warn.push({ item: 'Configuration', detail: 'This project uses Facilio\'s standard configuration, not the customer\'s own package, so module identifiers may not match their organisation. Load the customer\'s package above before exporting for them.' });
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
    const groups = new Set(); Object.entries((model && model.viewGroups) || {}).forEach(([m, l]) => l.forEach(g => groups.add(m + '|' + g[0]))); (recs.VIEW_GROUP || []).forEach(r => { parentOk(r, t(r, 'ModuleName')); groups.add(t(r, 'ModuleName') + '|' + t(r, 'Name')); });
    const pkgFields = new Set((recs.FIELD || []).map(r => t(r, 'moduleName') + '|' + t(r, 'name')));
    (recs.VIEW || []).forEach(r => { const m = t(r, 'moduleName'); parentOk(r, m); if (t(r, 'ViewGroupName') && !groups.has(m + '|' + t(r, 'ViewGroupName'))) bad('View ' + t(r, 'name') + ': view group ' + t(r, 'ViewGroupName') + ' is neither in the package nor in the organisation');
      if (!r.getElementsByTagName('View_Field').length) bad('View ' + t(r, 'name') + ' has no columns');
      arr(r.getElementsByTagName('View_Field')).forEach(f => { const n = t(f, 'View_Field_Name'); const bmf = (model && model.modules && model.modules[m] && model.modules[m].fields) || []; if (!(['name', 'siteId', 'sysCreatedTime', 'sysModifiedTime'].includes(n) || bmf.includes(n) || pkgFields.has(m + '|' + n))) bad('View ' + t(r, 'name') + ': column ' + n + ' is not a field of ' + m); }); });
    (recs.NOTIFICATION || []).forEach(r => { parentOk(r, t(r, 'moduleName')); if (!r.getElementsByTagName('Action').length) bad('Notification ' + t(r, 'name') + ' has no action'); if (t(r, 'Activity_Type') === 'FIELD_CHANGE' && !t(r, 'Value')) bad('Notification ' + t(r, 'name') + ' names no state'); });
    return out;
  }

  // The supplemental report (a separate download: nothing is added inside the package folders)
  function report(res, model, check) {
    const L = []; const st = { ready: 'Ready', draft: 'Draft (BRD not signed off)', clarify: 'Awaiting clarification (source requirement not confirmed)', blocked: 'Blocked (source requirement rejected or deferred)', unsupported: 'Not exportable yet', error: 'Validation error' };
    L.push('# Organisation package report: ' + res.name, '', 'Generated by Facilio Delivery Studio. This package has passed structural validation only; it has NOT been imported into a Facilio organisation. Delivery Studio does not change any live organisation.', '');
    L.push('- Organisation: ' + (model.orgId || 'unknown') + (model.reference ? ' (bundled reference configuration, not the customer\'s own package)' : ''), '- Source package: ' + (model.packageName || 'unknown'), '- BRD signed off: ' + (model.brdSigned ? 'yes' : 'no'), '- Status: ' + (res.draft ? 'DRAFT: contains components that are not approved' : 'approved components only'), '- Structural check: ' + (check ? (check.ok ? 'passed (' + check.checked + ' records)' : 'FAILED: ' + check.errors.join('; ')) : 'not run'), '');
    const so = model.signoff || {}; const rs = model.reqSummary || null; const crs = model.crs || [];
    L.push('## Where this configuration comes from', '');
    L.push('- BRD sign-off: ' + (so.status === 'signed' ? 'signed' + (so.signer ? ' by ' + so.signer : '') + (so.signedAt ? ' on ' + String(so.signedAt).slice(0, 10) : '') : 'not signed off. Everything below is a draft until it is.'));
    if (rs) L.push('- Requirements: ' + rs.total + ' in the project (' + Object.keys(rs.byStatus).map(k => rs.byStatus[k] + ' ' + k.toLowerCase()).join(', ') + '). Only configuration traced to a Confirmed requirement is marked Ready.');
    L.push('- Notifications: ' + ((model.notifications || []).length) + ' set up in the Notifications tab.', '- Change requests: ' + crs.length + (crs.length ? ' (see below).' : '.'), '');
    if (crs.length) { L.push('### Change requests', '', '| No. | Change | Status | Effect on this configuration |', '|---|---|---|---|'); crs.forEach(c => L.push('| ' + c.n + ' | ' + String(c.title || '').replace(/\|/g, '/') + ' | ' + c.status + ' | ' + (/^(rejected|withdrawn|cancelled|declined)$/i.test(c.status) ? 'None: not agreed.' : /^(draft|requested|proposed)$/i.test(c.status) ? 'Not agreed yet: do not implement.' : 'Agreed: check that the configuration below reflects it.') + ' |')); L.push(''); }
    L.push('## Included components', '', '| Type | Component | Module | Status | Source requirements | Depends on |', '|---|---|---|---|---|---|');
    res.items.filter(i => i.included).forEach(i => L.push('| ' + i.type + ' | ' + i.name + ' | ' + i.module + ' | ' + st[i.readiness] + (i.auto ? ' (added as a dependency)' : '') + ' | ' + (((i.src || {}).reqs || []).map(r => r.id + ' (' + r.status + ')').join(', ') || 'none recorded') + ' | ' + ((i.deps || []).join(', ') || '—') + ' |'));
    L.push('', '## Not included', '', '| Type | Component | Status | Reason |', '|---|---|---|---|');
    res.items.filter(i => !i.included).forEach(i => L.push('| ' + i.type + ' | ' + i.name + ' | ' + st[i.readiness] + ' | ' + ([].concat(i.errors, i.unsupported ? [i.unsupported] : []).join(' ') || (i.readiness === 'ready' ? 'not selected' : st[i.readiness])) + ' |'));
    L.push('', '## Manual implementation steps (not representable in the package)', ''); (res.manual.length ? res.manual : [{ area: '—', detail: 'None' }]).forEach(m => L.push('- ' + (m.area || m.item) + ': ' + m.detail));
    L.push('', '## Warnings', ''); res.warnings.concat(res.missing).forEach(w => L.push('- ' + w.item + ': ' + w.detail));
    L.push('', '## For the Org Builder skill', '', 'The ZIP follows the layout of the sample standalone package (PackageConf.xml, components/<TYPE>.xml, metafiles/). The Org Builder skill\'s own input requirements were not available to Delivery Studio; confirm them before importing. Records are new (Status="ADDED"); changes to existing configuration and removals are listed above as manual steps.');
    return L.join('\n') + '\n';
  }
  /* The agent brief: everything the Org Builder skill / agent needs, in one JSON file, grouped by module, with what is in the package, what is not and why,
     and what must be done by hand after the import. A separate download (nothing is added inside the package). */
  function brief(res, model, opts) {
    opts = opts || {}; const so = model.signoff || {}; const byMod = {}; const lab = n => ((model.modules || {})[n] || {}).label || ((model.newModules || []).find(m => m.name === n) || {}).label || n;
    const M = n => byMod[n] || (byMod[n] = { module: n, label: lab(n), isNew: (model.newModules || []).some(m => m.name === n), description: '', fields: [], flows: [], notifications: [], views: [] });
    const reqIds = s => ((s && s.reqs) || []).map(r => r.id + ' (' + r.status + ')');
    const WHY = { draft: 'The BRD is not signed off yet, so this is a draft.', clarify: 'The requirement behind it is not confirmed yet.', blocked: 'The requirement behind it was rejected or deferred.', error: 'It has errors.', unsupported: 'Not exportable yet.' };
    const st = (type, name) => { const i = res.items.find(x => x.type === type && x.name === name); if (!i) return { status: 'not-exported' }; const why = [].concat(i.errors || [], i.unsupported ? [i.unsupported] : []);
      return i.included ? { status: 'in-package', component: i.key } : { status: i.readiness === 'unsupported' ? 'manual' : i.readiness === 'ready' ? 'not-selected' : i.readiness, component: i.key, reason: why.join(' ') || WHY[i.readiness] || undefined }; };
    (model.newModules || []).forEach(m => { const o = M(m.name); o.description = m.description || ''; Object.assign(o, { moduleComponent: st('MODULE', m.label + ' (' + m.name + ')'), requirements: reqIds(m.src), stateFlowEnabled: !!m.stateflow }); });
    (model.newFields || []).forEach(f => { const nm = (f.mainField && (res.items.some(i => i.key === 'FIELD:' + f.module + '.name')) && /^name$/i.test(f.name || '')) ? 'name' : fieldName(f.label, f.module);
      M(f.module).fields.push(Object.assign({ name: nm, label: f.label, type: f.type, required: !!f.required, mainField: !!f.mainField }, f.options && f.options.length ? { options: f.options } : {}, f.lookup ? { lookupModule: f.lookup } : {}, { requirements: reqIds(f.src) }, st('FIELD', f.label + ' (' + nm + ')'))); });
    (model.flows || []).forEach(fl => { M(fl.module).flows.push({ name: fl.name, isNew: !!fl.isNew, existingLink: fl.isNew ? undefined : fl.link, description: fl.description || '', entryCondition: fl.criteria || undefined,
      states: fl.states.map(s => ({ label: s.label, name: s.name || undefined, initial: s.id === fl.initial, closed: !!(opts.closedStates && opts.closedStates.has(fl.key + '|' + s.id)) })),
      transitions: fl.transitions.map(t => { const from = (fl.states.find(s => s.id === t.from) || {}).label, to = (fl.states.find(s => s.id === t.to) || {}).label; return Object.assign({ name: t.name, from, to, commentRequired: !!t.commentRequired, portals: t.portals || [], condition: t.condition || undefined, instructions: t.extras && t.extras.length ? t.extras : undefined, requirements: reqIds(t.src) }, st('STATE_TRANSITION', t.name + ' (' + fl.name + ')')); }),
      requirements: reqIds(fl.src), flowComponent: fl.isNew ? st('STATE_FLOW', fl.name + ' (' + fl.module + ')') : undefined }); });
    (model.notifications || []).forEach(n => { M(n.module).notifications.push(Object.assign({ name: n.name, when: n.trigger === 'state' ? 'a record moves to "' + n.state + '"' : 'a record is created', channels: Object.keys(n.channels || {}).filter(k => n.channels[k]), recipients: n.recipients || [], sendToField: n.toField || undefined, subject: n.subject || undefined, message: n.message || undefined, on: n.status !== 'off', requirements: reqIds(n.src) }, st('NOTIFICATION', n.name + ' (' + n.module + ')'))); });
    (model.views || []).forEach(v => { M(v.module).views.push(Object.assign({ name: linkName(v.name || v.label), label: v.label, app: v.app || 'maintenance', group: v.group || 'allViews', isDefault: !!v.isDefault, columns: (v.columns || []).map(c => c.name), sort: v.sort && v.sort.field ? v.sort : undefined,
      filters: [].concat(v.stateFilter && v.stateFilter.state ? [{ field: 'state', op: v.stateFilter.op === 'isnot' ? 'is not' : 'is', value: v.stateFilter.state }] : [], (v.otherFilters || []).filter(f => f.field).map(f => ({ field: f.field, op: f.op, value: f.value || '' }))),
      sharedWithRoles: v.sharedRoles || [], requirements: reqIds(v.src) }, st('VIEW', v.label + ' (' + v.module + ')'))); });
    const inc = res.items.filter(i => i.included);
    return { schema: 'facilio.delivery-studio.agent-brief/1', generatedAt: new Date(opts.now || Date.now()).toISOString(), generatedBy: 'Facilio Delivery Studio',
      purpose: 'The approved configuration of one customer project, for the Org Builder skill or agent to implement in a Facilio organisation. Delivery Studio never changes a live organisation.',
      howToUse: ['1. Check "approval" and "organisation". If the BRD is not signed (draft: true) do not deploy; ask the delivery team.', '2. Import the ZIP named in "package.file" (components are in "package.importOrder"). Only records with status "in-package" are inside it.',
        '3. For every item with status "manual", "blocked", "draft" or "not-selected", read "reason": it is NOT in the ZIP. Create it yourself from the details given here, or ask.', '4. Do every step in "manualSteps" and "changesToExisting" after the import. They are changes the package cannot carry.', '5. Names in "modules" are the exact names used in the package (modules, fields, link names): use them as they are.', '6. Report back what was imported and what was done by hand.'],
      project: { name: opts.projectName || '', customer: opts.customer || '' }, organisation: { orgId: model.orgId || '', sourcePackage: model.packageName || '', referenceConfigurationOnly: !!model.reference },
      approval: { brdSigned: !!model.brdSigned, signedBy: so.signer || '', signedAt: so.signedAt || '', draft: !!res.draft },
      package: { file: res.name + '.zip', components: res.counts, importOrder: res.types, recordsInPackage: inc.length },
      modules: Object.values(byMod).sort((a, b) => a.module.localeCompare(b.module)),
      notInPackage: res.items.filter(i => !i.included).map(i => ({ type: i.type, name: i.name, module: i.module, status: i.readiness, reason: [].concat(i.errors || [], i.unsupported ? [i.unsupported] : []).join(' ') || (i.readiness === 'ready' ? 'not selected' : WHY[i.readiness] || i.readiness) })),
      manualSteps: res.manual.map(m => ({ area: m.area || m.item || '', detail: m.detail })), changesToExisting: (model.changes || []).map(c => ({ area: c.area, item: c.item, detail: c.detail })), warnings: res.warnings.concat(res.missing).map(w => ({ item: w.item, detail: w.detail })) };
  }
  const api = { build, verify, report, brief, fieldName, linkName, statusName, FIELD_T, ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOrgPkg = api;
})(typeof window !== 'undefined' ? window : globalThis);
