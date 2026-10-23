/* Facilio Requirement Workshop Builder — Org package parser
 * Turns a Facilio standalone package (ZIP of components/*.xml) into the immutable baseline model.
 * Decoding tables follow facilio-solution-document-builder/references/decoding-tables.md (verified enums).
 * Works in the browser (DOMParser) and in Node (pass a DOMParser implementation, e.g. @xmldom/xmldom).
 */
(function (root) {
  'use strict';

  const OPS = {1:'is empty',2:'is not empty',3:'is',4:"isn't",5:'contains',6:"doesn't contain",7:'starts with',8:'ends with',
    9:'=',10:'!=',11:'<',12:'<=',13:'>',14:'>=',15:'is',16:'is',17:"isn't",18:'is before',19:'is after',20:'between',
    21:'not between',22:'today',35:'matches lookup',36:'is',37:"isn't",38:'building is',52:'value is',53:"value isn't",
    54:'is',55:"isn't",72:'till now',73:'upcoming',74:'=',75:'!=',87:'role is',88:'related',92:'not related',93:'is',
    94:"isn't",105:'contains',106:'before N days',107:'after N days',109:'contains relation'};
  const FIELD_TYPES = {1:'Single Line Text',2:'Number',3:'Decimal',4:'Boolean',5:'Date',6:'Date Time',7:'Lookup',8:'Picklist',
    9:'File',10:'Counter',11:'Identifier',12:'Picklist (system)',13:'Multi Lookup',14:'Multi Picklist',16:'Line Items',
    17:'Rich Text',18:'Multi Line Text',19:'Picklist (system)',20:'URL',21:'Currency',22:'Multi Currency',
    23:'Inspection Trigger',24:'Auto Number',25:'Lookup (setup)',26:'Sharing',27:'Lookup (extended)'};
  const FORM_RULE_ACTIONS = {1:'Show field',2:'Hide field',3:'Enable field',4:'Disable field (read-only)',5:'Set value',
    6:'Apply filter',7:'Allow create',8:'Execute script',9:'Show section',10:'Hide section',11:'Set mandatory',12:'Remove mandatory'};
  const TRANSITION_TYPES = {1:'user',2:'scheduled',3:'automatic',4:'scheduled-date'};
  const TRANSITION_TYPE_LABEL = {user:'User action (button)',scheduled:'Scheduled',automatic:'Automatic (condition)','scheduled-date':'Scheduled (date field)'};
  const EVENTS = {CREATE:'When a record is created',EDIT:'When a record is updated',CREATE_OR_EDIT:'When a record is created or updated',
    FIELD_CHANGE:'When a specific field changes',STATE_TRANSITION:'When the record moves between statuses',STATE_FLOW:'When the record moves between statuses',
    SCHEDULED:'On a schedule',DATE_FIELD:'Relative to a date field',APPROVAL:'When an approval is requested',APPROVED:'When approved',
    REJECTED:'When rejected',DELETE:'When a record is deleted',SLA:'SLA-driven',CUSTOM:'Custom trigger',ADD_TICKET_NOTE:'When a comment is added',
    MULTI_TRIGGER:'On several events'};

  /* Portal apps: AppLinkName -> actor category (Facilio default link names; DomainType is the authority when present). */
  const DOMAIN_CATEGORY = {1:'internal',2:'occupant',3:'tenant',4:'vendor',5:'client',7:'employee'};
  const CATEGORY_LABEL = {internal:'Internal Facilio User',vendor:'Vendor Portal User',client:'Client Portal User',tenant:'Tenant Portal User',
    occupant:'Occupant Portal User',employee:'Employee Portal User',external:'Other External Participant',system:'System (automatic)',tbc:'User / Role to Be Confirmed',proposed:'Proposed Role'};

  /* Permission bits: Facilio NewPermissionUtil moduleTabType (verified in source). One global bit dictionary for MODULE tabs;
     the label shown depends on the module's permission catalog (see src/roles.js). Permission2 actions are not in Permission_Value. */
  const MODULE_BITS = [[1,'CREATE'],[4,'READ'],[8,'UPDATE'],[16,'DELETE'],[32,'EXPORT'],[64,'READ_TEAM'],[128,'READ_OWN'],[256,'UPDATE_TEAM'],[512,'UPDATE_OWN'],
    [1024,'UPDATE_CHANGE_OWNERSHIP'],[2048,'UPDATE_CLOSE_WORKORDER'],[4096,'UPDATE_TASK'],[8192,'DELETE_TEAM'],[16384,'DELETE_OWN'],[32768,'UPDATE_WORKORDER_TASK'],
    [65536,'CONTROL'],[262144,'MANAGE_INVENTORY'],[524288,'RESERVE_INVENTORY'],['536870912','MANAGE_ACCESS'],['4294967296','UPDATE_REVIEW'],['68719476736','ISSUE_INVENTORY'],
    ['35184372088832','APPROVE_SWMS'],['562949953421312','ASSIGN_STOREROOM'],['72057594037927936','REQUISITE_SUBMISSION']];
  const PERM_MODULE = MODULE_BITS, PERM_WO = MODULE_BITS;

  const PORTFOLIO = ['site','building','floor','space','subspace'];
  const CORE_HIGH = ['site','building','floor','space','asset','workorder','serviceRequest','plannedmaintenance','preventivemaintenance','people','vendors','tenant','client'];
  const LARGE_SKIP = {PAGE_LAYOUT:'Page layout data — counted only (very large; layout widgets do not change business behaviour).',
    VIEW:'List view definitions — counted only (list filters/columns do not change business behaviour).',
    DASHBOARD_WIDGET:'Dashboard widget definitions — counted only.'};

  // ---------- XML helpers ----------
  function kids(e, tag) { const out = []; if (!e) return out; for (let c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!tag || c.nodeName === tag)) out.push(c); return out; }
  function kid(e, tag) { if (!e) return null; for (let c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.nodeName === tag) return c; return null; }
  function txt(e, tag, def) { const k = tag ? kid(e, tag) : e; if (!k) return def === undefined ? '' : def; const v = (k.textContent || '').trim(); return v === '' ? (def === undefined ? '' : def) : v; }
  function all(e, tag) { return e ? Array.from(e.getElementsByTagName(tag)) : []; }
  function deepTxt(e, tag) { const x = all(e, tag)[0]; return x ? (x.textContent || '').trim() : ''; }
  function bool(v) { return String(v).trim().toLowerCase() === 'true'; }
  function num(v, d) { const n = parseInt(v, 10); return isNaN(n) ? (d === undefined ? 0 : d) : n; }
  function attr(e, a) { return e && e.getAttribute ? (e.getAttribute(a) || '') : ''; }
  function humanize(s) { if (!s) return ''; return String(s).replace(/__c$/i, '').replace(/^custom_/, '').replace(/_custom_[a-z0-9]+$/i, '').replace(/[_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase()); }

  function parseCriteria(e, ctx, moduleName) {
    if (!e) return null;
    const conds = [];
    for (const c of all(e, 'Condition')) {
      const opId = num(txt(c, 'Operator'), -1);
      const field = txt(c, 'FieldName');
      const pick = deepTxt(c, 'PickList_Value');
      let value = pick || txt(c, 'Value');
      let resolved = !!pick;
      if (!pick && field === 'moduleState' && /^\d+$/.test(value)) { value = 'status #' + value; resolved = false; }
      conds.push({ seq: txt(c, 'Sequence'), field, fieldLabel: ctx ? ctx.fieldLabel(txt(c,'Criteria_ModuleName') || moduleName, field) : field,
        operatorId: opId, operator: OPS[opId] || ('operator ' + opId), value, valueResolved: resolved || value === '' });
    }
    const pattern = txt(e, 'Pattern');
    return { pattern, conditions: conds, text: criteriaText(pattern, conds) };
  }
  function criteriaText(pattern, conds) {
    if (!conds.length) return '';
    const parts = {}; conds.forEach(c => { parts[c.seq] = (c.fieldLabel || c.field) + ' ' + c.operator + (c.value && !/empty|today/.test(c.operator) ? ' "' + c.value + '"' : ''); });
    if (pattern) { let out = pattern.replace(/\d+/g, d => parts[d] || d); return out.replace(/^\(\s*|\s*\)$/g, '').replace(/\s+/g, ' ').trim(); }
    return conds.map(c => parts[c.seq]).join(' and ');
  }
  function parseSharing(e) {
    const out = [];
    if (!e) return out;
    for (const s of all(e, 'Single_Sharing_Context')) {
      const t = txt(s, 'Sharing_Type');
      if (t === 'ROLE') out.push({ type: 'ROLE', name: txt(s, 'Role_Name') });
      else if (t === 'FIELD') out.push({ type: 'FIELD', name: txt(s, 'Field_Name'), module: txt(s, 'Field_Module_Name') });
      else if (t === 'USER') out.push({ type: 'USER', name: txt(s, 'User_Name') || txt(s, 'Email') || 'specific user' });
      else if (t === 'TEAM' || t === 'GROUP') out.push({ type: 'TEAM', name: txt(s, 'Team_Name') || txt(s, 'Group_Name') });
      else if (t) out.push({ type: t, name: txt(s, 'Role_Name') || txt(s, 'Field_Name') || t });
    }
    return out;
  }
  function recipientLabel(ph) {
    // ${workorder.requestedBy.email:-} -> "Requested By (work order)"
    const p = ph.replace(/^\$\{|\}$|\]$/g, '').replace(/:-.*$/, '');
    if (/^cs\.email/.test(p)) return 'Recipients computed by script — to be confirmed';
    const seg = p.split('.');
    if (seg.length >= 2) {
      const tail = seg.slice(1).filter(s => !/^(email|primaryContactEmail|phone)$/.test(s));
      const who = tail.map(humanize).join(' › ') || humanize(seg[0]);
      return seg.some(s => s === 'primaryContactEmail') ? who + ' primary contact' : who;
    }
    return humanize(p);
  }
  function parseActions(container, ctx, moduleName) {
    const out = { types: [], fieldUpdates: [], scripts: [], recipients: [], templates: [], changeState: [] };
    if (!container) return out;
    for (const a of kids(container, 'Action')) {
      const at = txt(a, 'Action_Type'); if (at && out.types.indexOf(at) < 0) out.types.push(at);
      for (const tn of all(a, 'Template_Name')) { const v = (tn.textContent || '').trim(); if (v && out.templates.indexOf(v) < 0) out.templates.push(v); }
      for (const to of all(a, 'to')) {
        (to.textContent || '').split(',').map(s => s.trim()).filter(Boolean).forEach(ph => { const l = recipientLabel(ph); if (out.recipients.indexOf(l) < 0) out.recipients.push(l); });
      }
      for (const s of all(a, 'workflowV2String').concat(all(a, 'Workflow_String'))) {
        const v = (s.textContent || '').trim(); if (!v) continue; out.scripts.push(v);
        (v.match(/cv\.roles\.([A-Za-z0-9_]+)/g) || []).forEach(r => { const l = 'Role: ' + humanize(r.replace('cv.roles.', '')) + ' (from script)'; if (out.recipients.indexOf(l) < 0) out.recipients.push(l); });
      }
      for (const v of all(a, 'Value_Element')) {
        const f = txt(v, 'Action_Field_Name') || txt(v, 'field'); const val = txt(v, 'Action_Field_Value') || txt(v, 'value');
        if (f) out.fieldUpdates.push({ field: f, fieldLabel: ctx.fieldLabel(moduleName, f), value: val });
      }
      if (at === 'CHANGE_STATE') { const st = deepTxt(a, 'Status_Name') || deepTxt(a, 'status'); if (st) out.changeState.push(st); }
    }
    return out;
  }
  function decodeBits(valueStr, table) {
    let big; try { big = BigInt(String(valueStr).trim() || '0'); } catch (e) { return { granted: [], raw: valueStr, unknownBits: false }; }
    const granted = []; let known = 0n;
    for (const [b, l] of table) { const bb = BigInt(b); known |= bb; if ((big & bb) === bb) granted.push(l); }
    return { granted, raw: String(valueStr), unknownBits: (big & ~known) !== 0n };
  }

  // ---------- main ----------
  function parsePackage(files, opts) {
    opts = opts || {};
    const DOMP = opts.DOMParser || root.DOMParser;
    const log = opts.log || function () {};
    const comp = {}; const inventory = []; const gaps = []; const largeCounts = {};
    let pkgConf = null;
    const names = Object.keys(files);
    for (const n of names) if (/(^|\/)PackageConf\.xml$/i.test(n)) pkgConf = files[n];
    const compFiles = names.filter(n => /\.xml$/i.test(n) && /(^|\/)components\//i.test(n));
    const useFiles = compFiles.length ? compFiles : names.filter(n => /\.xml$/i.test(n) && !/PackageConf\.xml$/i.test(n));
    const declared = [];
    if (pkgConf) { const m = pkgConf.match(/Component Type="([^"]+)"/g) || []; m.forEach(x => declared.push(x.replace(/.*Type="|"/g, ''))); }

    for (const n of useFiles) {
      const type = n.split('/').pop().replace(/\.xml$/i, '');
      const text = files[n];
      const size = text.length;
      if (LARGE_SKIP[type]) {
        const count = (text.match(new RegExp('<' + type + '[\\s>]', 'g')) || []).length;
        const byModule = {}; (text.match(/<(?:moduleName|ModuleName|Module_Name)>[^<]+/g) || []).forEach(x => { const m = x.replace(/^<[^>]+>/, '').trim(); byModule[m] = (byModule[m] || 0) + 1; });
        largeCounts[type] = byModule;
        inventory.push({ type, file: n, records: count, size, parsed: false, note: LARGE_SKIP[type] });
        continue;
      }
      let doc;
      try { doc = new DOMP().parseFromString(text, 'text/xml'); } catch (e) { doc = null; }
      const rootEl = doc && doc.documentElement;
      if (!rootEl || rootEl.nodeName === 'parsererror' || all(doc, 'parsererror').length) {
        inventory.push({ type, file: n, records: 0, size, parsed: false, note: 'XML could not be parsed — content not analysed.' });
        gaps.push({ area: 'Source files', item: n, detail: 'File could not be parsed as XML; its configuration is not represented.', severity: 'high' });
        continue;
      }
      const recs = kids(rootEl);
      comp[type] = recs;
      inventory.push({ type, file: n, records: recs.length, size, parsed: true, note: '' });
      log('parsed ' + type + ' (' + recs.length + ')');
    }
    declared.forEach(d => { if (!inventory.find(i => i.type === d)) { inventory.push({ type: d, file: '(declared in PackageConf.xml)', records: 0, size: 0, parsed: false, note: 'Declared but no file exported.' }); gaps.push({ area: 'Source files', item: d, detail: 'Component type is declared in PackageConf.xml but no XML file was found.', severity: 'medium' }); } });
    const ref = (type, e) => ({ file: 'components/' + type + '.xml', uid: attr(e, 'Unique_Identifier'), parentId: attr(e, 'Parent_Id') });

    // ---- modules
    const modules = {};
    (comp.MODULE || []).forEach(e => {
      const name = txt(e, 'name');
      modules[name] = { name, label: txt(e, 'displayName') || humanize(name), description: txt(e, 'Description'), custom: bool(txt(e, 'IsCustom')),
        moduleType: num(txt(e, 'Module_Type'), 1), stateflowEnabled: bool(txt(e, 'Is_StateFlow_Enabled')), hidden: bool(txt(e, 'isHiddenModule')),
        settings: all(e, 'ModuleSetting').map(s => ({ name: txt(s, 'ConfigurationName'), on: bool(txt(s, 'Status')) })), ref: ref('MODULE', e),
        fields: [], forms: [], flows: [], evidence: [], dependsOn: [], usedBy: [] };
    });
    function ensureModule(name, why) {
      if (!name) return null;
      if (!modules[name]) { modules[name] = { name, label: humanize(name), description: '', custom: /^custom_|__c$/i.test(name), moduleType: 1, stateflowEnabled: false, hidden: false, settings: [], ref: { file: '(referenced only)', uid: '' }, fields: [], forms: [], flows: [], evidence: [], dependsOn: [], usedBy: [], notInModuleXml: true }; gaps.push({ area: 'Modules', item: name, detail: 'Referenced by ' + why + ' but not present in MODULE.xml (system module not exported) — definition unavailable.', severity: 'low' }); }
      return modules[name];
    }

    // ---- fields
    const fieldIndex = {};
    (comp.FIELD || []).forEach(e => {
      const m = txt(e, 'moduleName'); const mod = ensureModule(m, 'a field');
      const dt = num(txt(e, 'DataType'));
      let type = FIELD_TYPES[dt] || ('Type ' + dt);
      const display = txt(e, 'Display_Type');
      if (dt === 1 && display === '2') type = 'Multi Line Text';
      const options = all(e, 'values').length ? all(kid(e, 'values'), 'Value_Element').map(v => ({ value: txt(v, 'value'), index: txt(v, 'index'), visible: txt(v, 'visible') !== 'false' })) : [];
      const f = { module: m, name: txt(e, 'name'), label: txt(e, 'displayName') || humanize(txt(e, 'name')), dataType: dt, type,
        origin: bool(txt(e, 'Is_Default')) ? 'System' : 'Custom', required: bool(txt(e, 'Required')), mainField: bool(txt(e, 'Main_Field')),
        lookup: txt(e, 'lookupModuleName'), options, enumName: txt(e, 'enumName'), trueVal: txt(e, 'trueVal'), falseVal: txt(e, 'falseVal'),
        maxLength: txt(e, 'maxLength'), regex: txt(e, 'regex'), unit: txt(e, 'unit'), minValue: txt(e, 'minValue'), maxValue: txt(e, 'maxValue'),
        locked: bool(txt(e, 'Locked')), ref: ref('FIELD', e), onForms: [] };
      mod.fields.push(f); fieldIndex[m + '.' + f.name] = f;
    });
    const ctx = { fieldLabel: (m, f) => { const x = fieldIndex[m + '.' + f]; return x ? x.label : (f === 'moduleState' ? 'Status' : humanize(f)); } };

    // ---- forms
    const forms = {};
    (comp.FORM || []).forEach(e => {
      const fn = txt(e, 'Form_Name'); const m = txt(e, 'moduleName'); ensureModule(m, 'a form'); const key = m + '::' + fn;
      forms[key] = { key, name: fn, module: m, label: txt(e, 'displayName'), app: txt(e, 'ApplicationName'), showInWeb: txt(e, 'ShowInWeb'), showInMobile: txt(e, 'ShowInMobile'),
        system: bool(txt(e, 'IsSystemForm')), description: txt(e, 'Description'), sections: [], rules: [], ref: ref('FORM', e) };
    });
    (comp.FORM_SECTION || []).forEach(e => {
      const fn = txt(e, 'moduleName') + '::' + txt(e, 'Form_Name'); const f = forms[fn]; if (!f) return;
      f.sections.push({ name: txt(e, 'Section_Name'), link: txt(e, 'Section_Link_Name'), seq: num(txt(e, 'Sequence_Number')), type: txt(e, 'Section_Type'), fields: [] });
    });
    (comp.FORM_FIELDS || []).slice().sort((a, b) => num(txt(a, 'Sequence_Number')) - num(txt(b, 'Sequence_Number'))).forEach(e => {
      const fn = txt(e, 'moduleName') + '::' + txt(e, 'Form_Name'); let f = forms[fn];
      if (!f) { f = forms[fn] = { key: fn, name: txt(e, 'Form_Name'), module: txt(e, 'moduleName'), label: txt(e, 'Form_Name'), app: '', sections: [], rules: [], ref: { file: '(form fields only)' } }; }
      const link = txt(e, 'Section_Link_Name') || 'default';
      let s = f.sections.find(x => x.link === link);
      if (!s) { s = { name: link === 'default' ? 'Details' : humanize(link), link, seq: 999, type: 'FIELDS', fields: [] }; f.sections.push(s); }
      const fieldName = txt(e, 'Facilio_Field_Name') || txt(e, 'Form_Field_Name');
      const ff = { field: fieldName, label: txt(e, 'displayName'), required: bool(txt(e, 'Required')), hidden: bool(txt(e, 'Hide_Field')), disabled: bool(txt(e, 'isDisabled')),
        default: txt(e, 'Default_Value'), widget: txt(e, 'Display_Type'), span: txt(e, 'Span') };
      s.fields.push(ff);
      const fi = fieldIndex[f.module + '.' + fieldName]; if (fi && fi.onForms.indexOf(fn) < 0) fi.onForms.push(fn);
    });
    Object.values(forms).forEach(f => { f.sections.sort((a, b) => a.seq - b.seq); const m = modules[f.module]; if (m) m.forms.push(f.key); });
    // Form fields whose data-model definition is not in FIELD.xml (standard system fields are not exported) → form-only entries.
    const WIDGET_TYPE = { LOOKUP_SIMPLE:'Lookup', MULTI_LOOKUP_SIMPLE:'Multi Lookup', TEXTBOX:'Single Line Text', TEXTAREA:'Multi Line Text', LONG_DESC:'Multi Line Text', DATE:'Date', DATETIME:'Date Time',
      NUMBER:'Number', DECIMAL:'Decimal', SELECTBOX:'Picklist', RADIO:'Picklist', DECISION_BOX:'Boolean', IMAGE:'Image', ATTACHMENT:'File', FILE:'File', SIGNATURE:'Signature', DURATION:'Duration',
      CURRENCY:'Currency', MULTI_CURRENCY:'Multi Currency', EMAIL:'Email', TIME:'Time', ADDRESS:'Address', SADDRESS:'Address', GEO_LOCATION:'Geo Location', SPACECHOOSER:'Space / Asset chooser',
      WOASSETSPACECHOOSER:'Space / Asset chooser', TEAMSTAFFASSIGNMENT:'Team / Staff assignment' };
    const PORTFOLIO_NAMES = { site:'site', building:'building', floor:'floor', space:'space', parentSpace:'space', resource:'resource' };
    Object.values(forms).forEach(f => { const m = modules[f.module]; if (!m) return; f.sections.forEach(s => s.fields.forEach(ff => {
      if (!ff.field || fieldIndex[f.module + '.' + ff.field]) return;
      const nf = { module: f.module, name: ff.field, label: ff.label || humanize(ff.field), dataType: 0, type: WIDGET_TYPE[ff.widget] || humanize(ff.widget || 'Unknown'),
        origin: 'System', formOnly: true, required: ff.required, lookup: (ff.widget === 'LOOKUP_SIMPLE' && PORTFOLIO_NAMES[ff.field]) || '', options: [], ref: { file: 'components/FORM_FIELDS.xml', uid: '' }, onForms: [f.key],
        note: 'Defined by the Facilio platform; data-model attributes are not in the package (seen on form only).' };
      m.fields.push(nf); fieldIndex[f.module + '.' + ff.field] = nf;
    })); });

    // ---- form rules
    const formRules = (comp.FORM_RULE || []).map(e => {
      const m = txt(e, 'moduleName');
      const acts = all(e, 'Form_Rule_Action').map(a => ({ type: FORM_RULE_ACTIONS[num(txt(a, 'Form_Rule_Action_Type'))] || txt(a, 'Form_Rule_Action_Type'),
        fields: all(a, 'Form_Rule_Action_Field').map(f => txt(f, 'Form_Field_Display_Name') || ctx.fieldLabel(m, txt(f, 'Facilio_Field_Name'))).filter(Boolean),
        fieldNames: all(a, 'Form_Rule_Action_Field').map(f => txt(f, 'Facilio_Field_Name')).filter(Boolean),
        hasScript: all(a, 'Workflow_String').length > 0 }));
      const r = { module: m, form: txt(e, 'Form_Name'), name: txt(e, 'name'), description: txt(e, 'Description'), enabled: txt(e, 'Status') !== 'false',
        trigger: txt(e, 'Trigger_Type'), execute: txt(e, 'Execute_Type'), triggerFields: all(e, 'Trigger_Field').map(f => txt(f, 'Form_Field_Display_Name') || txt(f, 'Facilio_Field_Name')),
        criteria: parseCriteria(kid(e, 'Form_Rule_Criteria'), ctx, m), actions: acts, ref: ref('FORM_RULE', e) };
      if (forms[r.module + '::' + r.form]) forms[r.module + '::' + r.form].rules.push(r);
      return r;
    });

    // ---- statuses
    const statuses = {};
    (comp.TICKET_STATUS || []).forEach(e => {
      const m = txt(e, 'parentModuleName') || '(org-level)';
      (statuses[m] = statuses[m] || []).push({ name: txt(e, 'status'), label: txt(e, 'displayName') || txt(e, 'status'), typeCode: num(txt(e, 'typeCode')),
        locked: bool(txt(e, 'recordLocked')), timer: bool(txt(e, 'timerEnabled')), requested: bool(txt(e, 'requestedState')), ref: ref('TICKET_STATUS', e) });
    });
    function statusLabel(m, s) {
      const lists = [statuses[m] || [], statuses['(org-level)'] || []];
      for (const l of lists) { const x = l.find(z => z.name === s) || l.find(z => z.name.toLowerCase() === String(s).toLowerCase()) || l.find(z => z.label.toLowerCase() === String(s).toLowerCase()); if (x) return x.label; }
      return s;
    }

    // ---- apps / tabs
    const apps = (comp.APP || []).map(e => {
      const dt = num(txt(e, 'DomainType'));
      return { link: txt(e, 'AppLinkName'), name: txt(e, 'ApplicationName'), description: txt(e, 'Description'), domainType: dt, category: DOMAIN_CATEGORY[dt] || 'internal', enabled: bool(txt(e, 'Status')), ref: ref('APP', e) };
    });
    const appByLink = {}; apps.forEach(a => appByLink[a.link] = a);
    const webtabs = (comp.WEBTAB || []).map(e => ({ app: txt(e, 'AppLinkName'), name: txt(e, 'name'), route: txt(e, 'Route'), type: txt(e, 'TabType'),
      modules: all(e, 'value').map(v => (v.textContent || '').trim()).filter(Boolean), inMenu: all(e, 'WebTabGroup').length > 0, ref: ref('WEBTAB', e) }));

    // ---- roles
    const roles = (comp.ROLE || []).map(e => {
      const appsOf = all(e, 'AppLinkName').map(a => (a.textContent || '').trim());
      const cats = appsOf.map(a => appByLink[a] ? appByLink[a].category : (/vendor/.test(a) ? 'vendor' : 'internal'));
      const category = cats.find(c => c !== 'internal') || 'internal';
      const perms = all(e, 'Permission').map(p => {
        const app = txt(p, 'Application'); const tab = txt(p, 'Web_Tab_Name');
        const wt = webtabs.find(w => w.app === app && w.route === tab);
        const mods = wt ? wt.modules : [];
        const isWO = mods.indexOf('workorder') >= 0;
        const dec = decodeBits(txt(p, 'Permission_Value'), MODULE_BITS);
        return { app, tab, tabLabel: wt ? wt.name : humanize(tab), tabType: wt ? wt.type : '', modules: mods, raw: dec.raw, granted: wt && wt.type && wt.type !== 'MODULE' ? [] : dec.granted, unknownBits: dec.unknownBits, enumUsed: 'moduleTabType', decoded: !!(wt && (wt.type === 'MODULE' || wt.type === 'MULTI_MODULE')) };
      });
      return { name: txt(e, 'name'), description: txt(e, 'Description'), privileged: bool(txt(e, 'Is_Privileged_Role')), superAdmin: bool(txt(e, 'Is_Super_Admin')),
        apps: appsOf, category, permissions: perms, ref: ref('ROLE', e) };
    });

    // ---- state flows + transitions
    const flows = (comp.STATE_FLOW || []).map(e => {
      const m = txt(e, 'moduleName'); const mod = ensureModule(m, 'a state flow');
      const diag = {};
      all(e, 'State').forEach(s => { diag[attr(s, 'name')] = { x: num(attr(s, 'x')), y: num(attr(s, 'y')) }; });
      const f = { id: m + '::' + (txt(e, 'StateflowLinkName') || txt(e, 'name')), module: m, name: txt(e, 'name'), link: txt(e, 'StateflowLinkName'), description: txt(e, 'Description'),
        isDefault: bool(txt(e, 'defaultStateflow')), enabled: bool(txt(e, 'Status')), draft: bool(txt(e, 'draft')), initialState: txt(e, 'defaultStateName'),
        order: num(txt(e, 'Execution_Order')), criteria: parseCriteria(kid(e, 'Criteria'), ctx, m), layout: diag, transitions: [], ref: ref('STATE_FLOW', e) };
      mod.flows.push(f.id); return f;
    });
    const flowById = {}; flows.forEach(f => flowById[f.id] = f);
    const transitions = (comp.STATE_TRANSITION || []).map(e => {
      const m = txt(e, 'moduleName');
      const fid = m + '::' + (txt(e, 'StateflowLinkName') || txt(e, 'StateflowName'));
      const typ = TRANSITION_TYPES[num(txt(e, 'Type'), 1)] || 'user';
      const performers = parseSharing(kid(e, 'ApproverList'));
      const portals = ['Vendor', 'Tenant', 'Client', 'Occupant'].filter(p => bool(txt(e, 'ShowIn' + p + 'Portal'))).map(p => p.toLowerCase());
      const acts = parseActions(kid(e, 'Actions_List'), ctx, m);
      const t = { id: fid + '::' + (txt(e, 'linkName') || txt(e, 'name')), flowId: fid, module: m, name: txt(e, 'name'), link: txt(e, 'linkName'),
        from: txt(e, 'FromStateName'), to: txt(e, 'ToStateName'), fromLabel: statusLabel(m, txt(e, 'FromStateName')), toLabel: statusLabel(m, txt(e, 'ToStateName')),
        enabled: bool(txt(e, 'Status')), type: typ, typeLabel: TRANSITION_TYPE_LABEL[typ], performers, portals,
        criteria: parseCriteria(kid(e, 'Criteria'), ctx, m), commentRequired: bool(txt(e, 'Comment_Required')), form: txt(e, 'FormName'),
        emailLink: bool(txt(e, 'ShouldExecuteFromPermalink')), allApprovalRequired: bool(txt(e, 'AllApprovalRequired')),
        validations: all(e, 'validation').map(v => ({ message: txt(v, 'errorMessage'), criteria: txt(v, 'namedCriteriaName') })),
        schedule: { type: txt(e, 'ScheduleType'), intervalSeconds: num(txt(e, 'Interval'), 0), dateField: txt(e, 'Date_Field_Name'), dateFieldLabel: ctx.fieldLabel(m, txt(e, 'Date_Field_Name')) },
        actions: acts, isApproval: performers.length > 0 && kid(e, 'AllApprovalRequired') !== null && /approv/i.test(txt(e, 'name')), ref: ref('STATE_TRANSITION', e) };
      const fl = flowById[fid] || flows.find(f => f.module === m && f.name === txt(e, 'StateflowName'));
      if (fl) { t.flowId = fl.id; fl.transitions.push(t.id); } else gaps.push({ area: 'State flows', item: t.name + ' (' + m + ')', detail: 'Transition references flow "' + txt(e, 'StateflowName') + '" which is not in STATE_FLOW.xml.', severity: 'medium' });
      return t;
    });

    // ---- approvals
    const approvals = (comp.APPROVAL_STATE_FLOW || []).map(e => {
      const m = txt(e, 'moduleName');
      return { module: m, name: txt(e, 'name'), link: txt(e, 'linkName'), enabled: bool(txt(e, 'Status')), description: txt(e, 'Description'), event: txt(e, 'Event_Type'),
        allRequired: bool(txt(e, 'Is_All_Approval_Needed')), criteria: parseCriteria(kid(e, 'Criteria'), ctx, m), approvers: parseSharing(kid(e, 'ApproverList')),
        resendApprovers: parseSharing(kid(e, 'Resend_Approver_List')), fieldsWatched: all(e, 'Field_Name').filter(x => x.parentNode && x.parentNode.nodeName === 'Fields_List').map(x => ctx.fieldLabel(m, (x.textContent || '').trim())),
        entry: parseActions(kid(e, 'Approval_Entry_Actions'), ctx, m), onApprove: parseActions(kid(e, 'Approval_Actions'), ctx, m), onReject: parseActions(kid(e, 'Reject_Actions'), ctx, m),
        rejectForm: txt(e, 'Reject_Form'), ref: ref('APPROVAL_STATE_FLOW', e) };
    });

    // ---- workflow rules, notifications, buttons
    function rule(e, type) {
      const m = txt(e, 'moduleName');
      return { module: m, name: txt(e, 'name'), link: txt(e, 'linkName'), description: txt(e, 'Description'), enabled: bool(txt(e, 'Status')), event: txt(e, 'Activity_Type'),
        eventLabel: EVENTS[txt(e, 'Activity_Type')] || humanize(txt(e, 'Activity_Type')), trigger: txt(e, 'TriggerLinkName'),
        fieldsWatched: all(e, 'Change_Field_Name').map(x => ctx.fieldLabel(m, (x.textContent || '').trim())),
        schedule: { type: txt(e, 'Schedule_Type'), intervalSeconds: num(txt(e, 'Time_Interval'), -1), time: txt(e, 'Job_Time') },
        criteria: parseCriteria(kid(e, 'Criteria'), ctx, m), actions: parseActions(kid(e, 'Actions_List'), ctx, m), ref: ref(type, e) };
    }
    const workflowRules = (comp.WORKFLOW_RULE || []).map(e => rule(e, 'WORKFLOW_RULE'));
    const notifications = (comp.NOTIFICATION || []).map(e => rule(e, 'NOTIFICATION'));
    const buttons = (comp.CUSTOM_BUTTON || []).map(e => {
      const m = txt(e, 'moduleName'); const cfg = kid(e, 'config');
      return { module: m, name: txt(e, 'name'), link: txt(e, 'linkName'), enabled: bool(txt(e, 'Status')), buttonType: txt(e, 'Button_Type'), position: txt(e, 'Position_Type'),
        actionType: txt(cfg, 'actionType') || txt(cfg, 'navigateTo') || '', connectedApp: txt(cfg, 'Connected_App_Link_Name'), targetModule: txt(cfg, 'moduleName'),
        criteria: parseCriteria(kid(e, 'Criteria'), ctx, m), performers: parseSharing(kid(e, 'ApproverList')), background: bool(txt(e, 'IsBackgroundActivity')), ref: ref('CUSTOM_BUTTON', e) };
    });

    // ---- SLA
    const sla = (comp.SLA_POLICY || []).map(e => ({ module: txt(e, 'moduleName'), name: txt(e, 'name'), enabled: bool(txt(e, 'Status')), description: txt(e, 'Description'),
      criteria: parseCriteria(kid(e, 'Criteria'), ctx, txt(e, 'moduleName')),
      commitments: all(e, 'Commitment').map(c => ({ name: txt(c, 'name'), entities: all(c, 'Entity').map(x => ({ entity: txt(x, 'SlaEntityName'), seconds: num(txt(x, 'DurationPlaceHolder')) })) })),
      escalations: all(e, 'Escalation').length, ref: ref('SLA_POLICY', e) }));
    const slaEntities = (comp.SLA_ENTITY || []).map(e => ({ name: txt(e, 'name') || txt(e, 'Name'), module: txt(e, 'moduleName') || txt(e, 'Module_Name'), ref: ref('SLA_ENTITY', e) }));

    // ---- relationships
    const relationships = (comp.RELATIONSHIP || []).map(e => ({ name: txt(e, 'Name'), description: txt(e, 'Description'), forward: txt(e, 'Relation_Name'), reverse: txt(e, 'Reverse_Relation_Name'),
      fromModule: txt(e, 'From_Module_Name'), toModule: txt(e, 'To_Module_Name') || txt(e, 'From_Module_Name'), relationType: txt(e, 'Relation_Type'), ref: ref('RELATIONSHIP', e) }));

    // ---- parties / people
    const party = (type) => (comp[type] || []).map(e => ({ name: txt(e, 'Name'), contact: txt(e, 'People_Contact_Name'), deleted: bool(txt(e, 'Is_Deleted')), ref: ref(type, e) }));
    const vendors = party('VENDOR'), tenants = party('TENANT'), clients = party('CLIENT');
    const teams = (comp.TEAM || []).map(e => ({ name: txt(e, 'Name'), members: all(e, 'People').length, active: bool(txt(e, 'Is_Active')), ref: ref('TEAM', e) }));
    const peopleTypes = {}; (comp.PEOPLE || []).forEach(e => { const t = txt(e, 'People_Type') || 'OTHER'; peopleTypes[t] = (peopleTypes[t] || 0) + 1; });
    const userRoleCounts = {}; (comp.USER || []).forEach(e => { if (txt(e, 'Deleted_Time') !== '-1' && txt(e, 'Deleted_Time') !== '') return; all(e, 'Role_App_Scoping').forEach(s => { const r = txt(s, 'Role'); if (r) userRoleCounts[r] = (userRoleCounts[r] || 0) + 1; }); });
    const org = (comp.ORG_INFO || [])[0];
    const meta = { orgId: org ? attr(org, 'Unique_Identifier') : '', currency: txt(org, 'Currency'), timezone: txt(org, 'Timezone'), dateFormat: txt(org, 'Date_Format'),
      packageName: pkgConf ? ((pkgConf.match(/<displayName>([^<]*)</) || [])[1] || (pkgConf.match(/<name>([^<]*)</) || [])[1] || '') : '',
      exportTimestamp: (pkgConf && (pkgConf.match(/_(\d{13})/) || [])[1]) || '', parsedAt: new Date().toISOString(), sourceName: opts.sourceName || '' };

    // ---- module evidence, dependencies, priority
    Object.values(modules).forEach(m => { m.fields.forEach(f => { if (f.lookup && f.lookup !== m.name) { if (m.dependsOn.indexOf(f.lookup) < 0) m.dependsOn.push(f.lookup); const t = modules[f.lookup]; if (t && t.usedBy.indexOf(m.name) < 0) t.usedBy.push(m.name); } }); });
    relationships.forEach(r => { const a = modules[r.fromModule]; if (a) a.evidence.push({ kind: 'relationship', text: 'Relationship "' + r.name + '"' }); });
    const ev = (m, kind, text, w) => { const mod = modules[m]; if (mod) mod.evidence.push({ kind, text, weight: w }); };
    webtabs.forEach(w => w.modules.forEach(m => { const a = appByLink[w.app]; if (!a) return; if (w.inMenu || a.category !== 'internal') ev(m, a.category === 'internal' ? 'menu' : 'portal', (a.category === 'internal' ? 'Menu tab "' : a.name + ' tab "') + w.name + '" in ' + a.name + (a.enabled ? '' : ' (app disabled)'), a.enabled ? 3 : 1); }));
    flows.forEach(f => { if (f.enabled && !f.draft) ev(f.module, 'flow', 'Active state flow "' + f.name + '"', 3); });
    Object.values(modules).forEach(m => { const en = transitions.filter(t => t.module === m.name && t.enabled).length; if (en) m.evidence.push({ kind: 'transitions', text: en + ' enabled transitions', weight: Math.min(en, 5) }); const cf = m.fields.filter(f => f.origin === 'Custom').length; if (cf) m.evidence.push({ kind: 'customFields', text: cf + ' custom fields', weight: Math.min(cf, 5) }); });
    approvals.forEach(a => a.enabled && ev(a.module, 'approval', 'Approval rule "' + a.name + '"', 3));
    workflowRules.forEach(r => r.enabled && ev(r.module, 'rule', 'Workflow rule "' + r.name + '"', 2));
    notifications.forEach(r => r.enabled && ev(r.module, 'notification', 'Notification "' + r.name + '"', 2));
    buttons.forEach(b => b.enabled && ev(b.module, 'button', 'Custom button "' + b.name + '"', 1));
    sla.forEach(s => s.enabled && ev(s.module, 'sla', 'SLA policy "' + s.name + '"', 2));
    Object.values(forms).forEach(f => { const a = appByLink[f.app]; if (a && a.category !== 'internal') ev(f.module, 'portalForm', a.name + ' form "' + f.label + '"', 2); });
    Object.values(modules).forEach(m => {
      const seen = {}; m.evidence = m.evidence.filter(x => (seen[x.text] ? false : (seen[x.text] = true)));
      let score = m.evidence.reduce((s, x) => s + (x.weight || 0), 0);
      const inUseDeps = m.usedBy.filter(u => modules[u] && modules[u].evidence.length).length;
      if (inUseDeps) score += Math.min(Math.ceil(inUseDeps / 3), 4);
      if (m.custom && m.evidence.length) score += 2;
      m.score = score;
      const reasons = [];
      if (PORTFOLIO.indexOf(m.name) >= 0) reasons.push('Part of the portfolio hierarchy (Site → Building → Floor → Space → Subspace)');
      if (CORE_HIGH.indexOf(m.name) >= 0 && m.evidence.length) reasons.push('Core CAFM module with configuration evidence');
      if (inUseDeps) reasons.push('Referenced by ' + inUseDeps + ' in-use module(s) through lookups');
      m.evidence.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 4).forEach(x => reasons.push(x.text));
      let p = 'low';
      if (PORTFOLIO.indexOf(m.name) >= 0 || (CORE_HIGH.indexOf(m.name) >= 0 && m.evidence.length) || score >= 12) p = 'high';
      else if (score >= 5) p = 'medium';
      if (!m.evidence.length && PORTFOLIO.indexOf(m.name) < 0) reasons.push('No configuration evidence of use in this package');
      m.priority = p; m.priorityReasons = reasons; m.inUse = m.evidence.length > 0 || PORTFOLIO.indexOf(m.name) >= 0;
    });

    // ---- portfolio hierarchy
    const portfolio = PORTFOLIO.map((n, i) => { const m = modules[n]; const parent = i ? PORTFOLIO[i - 1] : null;
      const links = m ? m.fields.filter(f => PORTFOLIO.indexOf(f.lookup) >= 0 && f.lookup !== n).map(f => ({ field: f.label, target: f.lookup, source: f.formOnly ? 'form field' : 'data model' })) : [];
      const hasParent = parent && links.some(l => l.target === parent);
      return { module: n, label: m ? m.label : humanize(n), present: !!m, parent, parentLookups: links,
        status: !m ? (n === 'subspace' ? 'Not a separate module in this package — in Facilio a subspace is normally a Space with a parent space. To be confirmed.' : 'Module not in package') : (parent ? (hasParent ? 'Parent link verified from ' + links.find(l => l.target === parent).source : 'Parent link is Facilio standard; not visible in package fields — to be confirmed') : 'Top of hierarchy') }; });
    const assetLinks = modules.asset ? modules.asset.fields.filter(f => f.lookup && (PORTFOLIO.indexOf(f.lookup) >= 0 || /space|resource|site/i.test(f.lookup))).map(f => ({ field: f.label, target: f.lookup })) : [];

    // ---- actors
    const actors = [];
    const addActor = a => { if (!actors.find(x => x.id === a.id)) actors.push(a); return a; };
    roles.forEach(r => addActor({ id: 'role:' + r.name + (r.apps.length ? '@' + r.apps.join(',') : ''), roleName: r.name, label: r.name, category: r.category, source: 'configured', apps: r.apps, privileged: r.privileged, ref: r.ref, description: r.description, activeUsers: userRoleCounts[r.name] || 0 }));
    ['vendor', 'tenant', 'client', 'occupant'].forEach(c => addActor({ id: 'tbc:' + c, label: CATEGORY_LABEL[c] + ' — Role to Be Confirmed', category: c, source: 'tbc' }));
    addActor({ id: 'tbc:any', label: 'User / Role to Be Confirmed', category: 'tbc', source: 'tbc' });
    addActor({ id: 'system', label: 'System (automatic)', category: 'system', source: 'configured' });
    function roleActor(name) { const a = actors.find(x => x.roleName === name && x.category === 'internal') || actors.find(x => x.roleName === name); return a ? a.id : addActor({ id: 'role:' + name, roleName: name, label: name, category: 'internal', source: 'configured', apps: [] }).id; }
    transitions.forEach(t => {
      const res = [];
      if (t.type !== 'user') res.push({ actor: 'system', status: 'configured', note: t.typeLabel });
      t.performers.forEach(p => {
        if (p.type === 'ROLE') res.push({ actor: roleActor(p.name), status: 'configured' });
        else if (p.type === 'FIELD') { const id = 'field:' + t.module + '.' + p.name; addActor({ id, label: 'User in "' + ctx.fieldLabel(p.module || t.module, p.name) + '" field', category: 'internal', source: 'configured', fieldBased: true }); res.push({ actor: id, status: 'configured' }); }
        else res.push({ actor: addActor({ id: 'other:' + p.type + ':' + p.name, label: humanize(p.type) + ': ' + p.name, category: 'internal', source: 'configured' }).id, status: 'configured' });
      });
      if (t.type === 'user' && !t.performers.length) {
        t.portals.forEach(p => res.push({ actor: 'tbc:' + p, status: 'tbc', note: 'Button shown in ' + humanize(p) + ' Portal; role not specified' }));
        res.push({ actor: 'tbc:any', status: 'tbc', note: 'No "Performed By" restriction in the configuration (platform default: any user with update access) — confirm responsible role' });
      }
      t.actorAssignments = res;
    });

    // ---- portal evidence
    const portalEvidence = apps.filter(a => a.category !== 'internal').map(a => {
      const tabs = webtabs.filter(w => w.app === a.link).map(w => ({ name: w.name, type: w.type, modules: w.modules, inMenu: w.inMenu }));
      const pforms = Object.values(forms).filter(f => f.app === a.link).map(f => ({ name: f.name, label: f.label, module: f.module, fields: f.sections.reduce((n, s) => n + s.fields.length, 0) }));
      const proles = roles.filter(r => r.apps.indexOf(a.link) >= 0).map(r => r.name);
      const ptrans = transitions.filter(t => t.portals.indexOf(a.category) >= 0).map(t => t.id);
      return { app: a.link, name: a.name, category: a.category, enabled: a.enabled, tabs, forms: pforms, roles: proles, transitions: ptrans };
    });

    // ---- gaps (what cannot be established from the files)
    const noPerformer = transitions.filter(t => t.enabled && t.type === 'user' && !t.performers.length).length;
    if (noPerformer) gaps.push({ area: 'Roles', item: noPerformer + ' enabled user transitions', detail: 'No "Performed By" list in the XML. The responsible role is shown as "User / Role to Be Confirmed".', severity: 'high' });
    gaps.push({ area: 'Portals', item: 'Portal behaviour', detail: 'Portal tabs, portal forms, portal roles and "Show in portal" flags are read from the XML. Portal-side screen layouts, sharing rules and scoping are not in the package and need confirmation.', severity: 'medium' });
    gaps.push({ area: 'Permissions', item: 'Permission values', detail: 'Role permission values are decoded with the verified Module/Workorder permission bits. Values with additional unrecognised bits are flagged and must be confirmed in Facilio setup.', severity: 'medium' });
    gaps.push({ area: 'Scripts', item: 'Scripts and functions', detail: 'Script bodies are captured but their business effect is not interpreted automatically. Review each script before describing it in the BRD.', severity: 'medium' });
    const unresolvedCrit = transitions.concat(approvals).reduce((n, x) => n + ((x.criteria && x.criteria.conditions.filter(c => !c.valueResolved).length) || 0), 0);
    if (unresolvedCrit) gaps.push({ area: 'Criteria', item: unresolvedCrit + ' criteria values', detail: 'Some criteria compare against record IDs without a display value in the package (e.g. status IDs). They are shown as "#id" and require confirmation.', severity: 'low' });
    if (comp.CONNECTED_APP && comp.CONNECTED_APP.length) gaps.push({ area: 'Integrations', item: comp.CONNECTED_APP.length + ' connected apps', detail: 'Connected app definitions are present; their external integrations and data exchange are not described by the package.', severity: 'medium' });

    const functions = (comp.FUNCTION || []).map(e => ({ name: txt(e, 'name'), namespace: txt(e, 'nameSpace') || txt(e, 'Namespace_Name') || txt(e, 'NameSpace'), ref: ref('FUNCTION', e) }));
    const connectedApps = (comp.CONNECTED_APP || []).map(e => ({ name: txt(e, 'name') || txt(e, 'Name') || txt(e, 'linkName'), ref: ref('CONNECTED_APP', e) }));
    const emailTemplates = (comp.EMAIL_TEMPLATE || []).map(e => ({ module: txt(e, 'moduleName'), name: txt(e, 'Name'), subject: txt(e, 'Subject') }));
    const dashboards = (comp.DASHBOARD || []).map(e => ({ name: txt(e, 'Name') || txt(e, 'name'), module: txt(e, 'ModuleName') }));
    const reports = (comp.REPORT || []).map(e => ({ name: txt(e, 'Name') || txt(e, 'name'), module: txt(e, 'ModuleName') }));

    // ---- everything else in the package: master data, lookups, variables, triggers, layouts. Read generically so no component type is silently ignored.
    const MODELLED = new Set(['MODULE', 'FIELD', 'FORM', 'FORM_FIELDS', 'FORM_SECTION', 'FORM_RULE', 'STATE_FLOW', 'STATE_TRANSITION', 'APPROVAL_STATE_FLOW', 'TICKET_STATUS', 'ROLE', 'APP', 'WEBTAB', 'WORKFLOW_RULE', 'NOTIFICATION',
      'CUSTOM_BUTTON', 'SLA_POLICY', 'SLA_ENTITY', 'RELATIONSHIP', 'VENDOR', 'TENANT', 'CLIENT', 'TEAM', 'PEOPLE', 'USER', 'ORG_INFO', 'FUNCTION', 'CONNECTED_APP', 'EMAIL_TEMPLATE', 'DASHBOARD', 'REPORT']);
    const PERSONAL = /^(email|phone|mobile|password|contact.*|.*email.*|.*phone.*)$/i; const EMAILRX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const catalog = {};
    Object.keys(comp).filter(t => !MODELLED.has(t)).forEach(t => {
      const recs = comp[t]; const items = recs.slice(0, 600).map(e => {
        const SECRET = /(key|secret|token|passw|credential|auth)/i; const hideAll = SECRET.test(kids(e).map(c => c.nodeName === 'name' || c.nodeName === 'Name' || /^Variable_?Name$/i.test(c.nodeName) ? c.textContent : '').join(' '));
        const sc = kids(e).filter(c => !kids(c).length && !PERSONAL.test(c.nodeName) && (c.textContent || '').trim() && !EMAILRX.test(c.textContent)).map(c => [c.nodeName, (SECRET.test(c.nodeName) || (hideAll && /value/i.test(c.nodeName))) ? '[hidden]' : (c.textContent || '').trim().slice(0, 80)]);
        const pick = names => { for (const nm of names) { const f = sc.find(x => x[0].toLowerCase() === nm.toLowerCase()); if (f) return f[1]; } return ''; };
        const name = pick(['displayName', 'name', 'Name', 'Link_Name', 'linkName', 'status', 'Display_Name', 'Label']) || (sc[0] ? sc[0][1] : '(unnamed)');
        const module = pick(['moduleName', 'parentModuleName', 'Module_Name', 'ModuleName', 'parentModule']);
        const detail = sc.filter(x => !/^(name|Name|displayName|moduleName|parentModuleName|Module_Name|ModuleName|Description|Created_Version|Modified_Version|recordLocked|Locked)$/.test(x[0]) && x[1] !== name).slice(0, 4).map(x => humanize(x[0]) + ': ' + x[1]).join(' · ');
        return { name, module, detail, uid: attr(e, 'Unique_Identifier') }; });
      catalog[t] = { records: recs.length, items, truncated: recs.length > items.length };
    });
    const triggers = (comp.TRIGGER || []).map(e => ({ module: txt(e, 'Module_Name'), name: txt(e, 'Name'), link: txt(e, 'Link_Name'), event: txt(e, 'Event_Type'), type: txt(e, 'Trigger_Type'), enabled: bool(txt(e, 'Status')), order: txt(e, 'Execution_Order'), isDefault: bool(txt(e, 'Is_Default')) }));
    delete catalog.TRIGGER;
    const viewCounts = {}; ['VIEW', 'PAGE_LAYOUT', 'DASHBOARD_WIDGET'].forEach(t => { if (largeCounts[t]) viewCounts[t] = largeCounts[t]; });
    (comp.VIEW_GROUP || []).forEach(e => { const m = txt(e, 'moduleName') || txt(e, 'Module_Name'); if (m) { viewCounts.VIEW_GROUP = viewCounts.VIEW_GROUP || {}; viewCounts.VIEW_GROUP[m] = (viewCounts.VIEW_GROUP[m] || 0) + 1; } });
    const moduleSummary = { system: Object.values(modules).filter(m => !m.custom).length, custom: Object.values(modules).filter(m => m.custom).map(m => m.name) };

    return { schema: 'fwb.baseline/1', meta, catalog, triggers, viewCounts, moduleSummary, inventory: inventory.sort((a, b) => a.type.localeCompare(b.type)), gaps, modules, fields: undefined, forms, formRules, statuses,
      apps, webtabs, roles, flows, transitions, approvals, workflowRules, notifications, buttons, sla, slaEntities, relationships,
      vendors, tenants, clients, teams, peopleTypes, userRoleCounts, functions, connectedApps, emailTemplates, dashboards, reports,
      portfolio, assetLinks, actors, portalEvidence, enums: { CATEGORY_LABEL, TRANSITION_TYPE_LABEL } };
  }

  // State flow XML on its own: any mix of STATE_FLOW / STATE_TRANSITION / TICKET_STATUS / APPROVAL_STATE_FLOW records, in one or several files
  // (whatever their file names are). Returns a partial configuration the State Flow Builder can turn into flows, plus problems found.
  function parseFlowFiles(named, opts) {
    opts = opts || {}; const DOMP = opts.DOMParser || root.DOMParser; const errors = [], warnings = []; const WANT = ['STATE_FLOW', 'STATE_TRANSITION', 'TICKET_STATUS', 'APPROVAL_STATE_FLOW']; const recs = {}; const seen = {};
    (named || []).forEach(f => {
      const text = String(f.text || '');
      let doc = null; try { doc = new DOMP().parseFromString(text, 'text/xml'); } catch (e) { doc = null; }
      const rootEl = doc && doc.documentElement;
      if (!text.trim()) { errors.push({ file: f.name, msg: 'The file is empty.' }); return; }
      if (!rootEl || rootEl.nodeName === 'parsererror' || all(doc, 'parsererror').length) { errors.push({ file: f.name, msg: 'The file is not valid XML.' }); return; }
      let used = 0;
      WANT.forEach(t => { const m = text.match(new RegExp('<' + t + '\\b[\\s\\S]*?</' + t + '>', 'g')); if (m && m.length) { (recs[t] = recs[t] || []).push(...m); used += m.length; seen[t] = (seen[t] || []).concat(f.name); } });
      if (!used) warnings.push({ file: f.name, msg: 'No state flow, transition or status records were found in this file (root element <' + rootEl.nodeName + '>). It was ignored.' });
    });
    const files = {}; WANT.forEach(t => { if (recs[t]) files['components/' + t + '.xml'] = '<Components>' + recs[t].join('') + '</Components>'; });
    if (!files['components/STATE_FLOW.xml'] && !files['components/STATE_TRANSITION.xml']) { errors.push({ file: '', msg: 'No state flow or state transition records were found in the uploaded files.' }); return { flows: [], transitions: [], statuses: {}, errors, warnings, mini: null, counts: {}, modules: [] }; }
    const mini = parsePackage(files, { DOMParser: DOMP, sourceName: (named || []).map(f => f.name).join(', ') });
    mini.gaps.filter(g => g.area === 'State flows').forEach(g => warnings.push({ file: '', msg: g.item + ': ' + g.detail }));
    const flows = mini.flows, trans = mini.transitions;
    flows.forEach(f => { if (!f.transitions.length) warnings.push({ file: '', msg: 'Stateflow "' + f.name + '" (' + f.module + ') has no transitions in the uploaded files.' }); });
    const stNames = new Set(); Object.values(mini.statuses).forEach(l => l.forEach(x => { stNames.add(x.name.toLowerCase()); stNames.add(x.label.toLowerCase()); }));
    const unknown = new Set(); trans.forEach(t => [t.from, t.to].forEach(n => { if (n && !stNames.has(String(n).toLowerCase())) unknown.add(n); }));
    if (unknown.size) warnings.push({ file: '', msg: unknown.size + ' state(s) have no TICKET_STATUS record in the files, so their display names are taken from the state name: ' + Array.from(unknown).slice(0, 8).join(', ') + (unknown.size > 8 ? '…' : '') });
    const modules = Array.from(new Set(flows.map(f => f.module).concat(trans.map(t => t.module)))).filter(Boolean);
    return { flows, transitions: trans, statuses: mini.statuses, approvals: mini.approvals, errors, warnings, mini, modules, counts: { flows: flows.length, transitions: trans.length, statuses: Object.values(mini.statuses).reduce((n, l) => n + l.length, 0), approvals: (mini.approvals || []).length }, seen };
  }
  const api = { MODULE_BITS, parsePackage, parseFlowFiles, humanize, OPS, FIELD_TYPES, CATEGORY_LABEL, TRANSITION_TYPE_LABEL, PORTFOLIO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
