#!/usr/bin/env python3
"""
extract_package.py - Turn a Facilio org package (ZIP or folder) into JSON indexes
and a coverage checklist for the Solution Document Builder skill.

Usage:
  python3 extract_package.py <package.zip | org_folder> <out_dir>

<org_folder> may be a facilio-config-data org folder (<region>/<orgid>-<Name>),
a folder that contains components/, or a folder of component XML files.

Outputs (in <out_dir>):
  package.json         package name, component types, record counts
  raw/<TYPE>.json      every component file as a list of flattened records
  fields.json          module -> fields (label, name, system/custom, type, required, lookup, options)
  forms.json           module -> form -> [sections -> fields (required/hidden/default)]
  statuses.json        module -> internal status -> display name
  stateflows.json      module -> flows (name, link, default, enabled, initial state, priority, criteria)
  transitions.json     every transition (flow, from, to, type, roles, criteria, forms, field updates, scripts, schedule, portals)
  approvals.json       approval rules (module, name, enabled, criteria, approvers, outcome statuses, scripts)
  workflow_rules.json  workflow rules (module, name, enabled, event, criteria, field changes, scripts, schedule)
  functions.json       functions (namespace, name, full body)
  buttons.json         custom buttons (module, name, enabled, position, criteria, roles, action, form, scripts)
  notifications.json   notifications (module, name, enabled, event, criteria, channels, schedule, recipient hints)
  sla.json             SLA policies and SLA entities
  form_rules.json      form rules (show/hide, mandatory, set value, filters) per module/form
  email_templates.json email templates (subject, placeholders)
  masters.json         every other component type (categories, priorities, teams, PM frequencies, vendors, connected apps, ...)
  roles.json           roles (privileged, apps, tab permissions)
  apps.json, webtabs.json, webtab_groups.json, dashboards.json, reports.json, report_folders.json
  modules_in_use.json  module -> evidence list (menu tab, custom fields, flows, rules, ...)
  COVERAGE.md          checklist of every component type and every module in use, to tick off while writing
"""
import json, os, re, sys, zipfile, shutil, collections
import xml.etree.ElementTree as ET

OPS = {1: 'is empty', 2: 'is not empty', 3: 'is', 4: "isn't", 5: 'contains', 6: "doesn't contain",
       7: 'starts with', 8: 'ends with', 9: '=', 10: '!=', 11: '<', 12: '<=', 13: '>', 14: '>=',
       15: 'is', 16: 'is', 17: "isn't", 18: 'is before', 19: 'is after', 20: 'between', 21: 'not between',
       22: 'today', 35: 'lookup', 36: 'is', 37: "isn't", 38: 'building is', 52: 'value is', 53: "value isn't",
       54: 'is', 55: "isn't", 72: 'till now', 73: 'upcoming', 74: '=', 75: '!=', 87: 'role is',
       88: 'related', 92: 'not related', 93: 'is', 94: "isn't", 105: 'contains', 106: 'before N days',
       107: 'after N days', 109: 'contains relation'}
FIELD_TYPES = {1: 'Single Line Text', 2: 'Number', 3: 'Decimal', 4: 'Boolean', 5: 'Date', 6: 'Date Time',
               7: 'Lookup', 8: 'Picklist', 9: 'File', 10: 'Counter', 11: 'Identifier', 12: 'Picklist (system)',
               13: 'Multi Lookup', 14: 'Multi Picklist', 16: 'Line Items', 17: 'Rich Text', 18: 'Multi Line Text',
               19: 'Picklist (system)', 20: 'URL', 21: 'Currency', 22: 'Multi Currency', 23: 'Inspection Trigger',
               24: 'Auto Number', 25: 'Lookup (setup)', 26: 'Sharing', 27: 'Lookup (extended)'}  # FieldType enum
FORM_RULE_ACTIONS = {'1': 'Show field', '2': 'Hide field', '3': 'Enable field', '4': 'Disable field',
                     '5': 'Set value', '6': 'Apply filter', '7': 'Allow create', '8': 'Execute script',
                     '9': 'Show section', '10': 'Hide section', '11': 'Set mandatory', '12': 'Remove mandatory'}  # FormActionType enum
TRANSITION_TYPES = {1: 'User action (button)', 2: 'Scheduled', 3: 'Automatic (condition)', 4: 'Scheduled (date field)'}


def t(e, tag, default=''):
    v = e.findtext(tag)
    return v.strip() if v and v.strip() else default


def flatten(e):
    """Flatten an element to {tag: text or [texts]} one level deep; nested blocks become compact strings."""
    d = dict(e.attrib)
    for c in e:
        if len(c):
            val = re.sub(r'\s+', ' ', ET.tostring(c, encoding='unicode'))[:4000]
        else:
            val = (c.text or '').strip()
        if c.tag in d:
            if not isinstance(d[c.tag], list):
                d[c.tag] = [d[c.tag]]
            d[c.tag].append(val)
        else:
            d[c.tag] = val
    return d


def criteria(e):
    if e is None:
        return ''
    conds = []
    for c in e.iter('Condition'):
        try:
            op = OPS.get(int(t(c, 'Operator', '0')), 'op' + t(c, 'Operator'))
        except ValueError:
            op = t(c, 'Operator')
        val = t(c, './/PickList_Value') or t(c, 'Value')
        conds.append(f"{t(c, 'Sequence')}: {t(c, 'FieldName')} {op} {val}".strip())
    pat = t(e, 'Pattern')
    return (pat + ' :: ' if pat else '') + ' ; '.join(conds)


def sharing(e):
    out = []
    if e is None:
        return out
    for s in e.iter('Single_Sharing_Context'):
        st = t(s, 'Sharing_Type')
        if st == 'ROLE':
            out.append('ROLE:' + t(s, 'Role_Name'))
        elif st == 'FIELD':
            out.append('FIELD:' + t(s, 'Field_Name'))
        elif st:
            out.append(st + ':' + (t(s, 'User_Name') or t(s, 'Team_Name') or t(s, 'Field_Name')))
    return out


def actions(e):
    fc, scripts, types = [], [], []
    for a in e.iter('Action'):
        at = t(a, 'Action_Type')
        if at:
            types.append(at)
    for v in e.iter('Value_Element'):
        fc.append(f"{t(v, 'Action_Field_Name')}={t(v, 'Action_Field_Value')}")
    for w in e.iter('Workflow_String'):
        if w.text and w.text.strip():
            scripts.append(w.text.strip())
    return sorted(set(types)), fc, scripts


def load_root(path):
    try:
        return ET.parse(path).getroot()
    except ET.ParseError as ex:
        print('WARN cannot parse', path, ex)
        return None


def locate(src, work):
    if zipfile.is_zipfile(src):
        dest = os.path.join(work, '_unzipped')
        if os.path.exists(dest):
            shutil.rmtree(dest)
        with zipfile.ZipFile(src) as z:
            z.extractall(dest)
        src = dest
    for root, dirs, files in os.walk(src):
        if 'components' in dirs and any(f.endswith('.xml') for f in os.listdir(os.path.join(root, 'components'))):
            return root, os.path.join(root, 'components')
    for root, dirs, files in os.walk(src):
        if 'MODULE.xml' in files or 'FIELD.xml' in files:
            return root, root
    sys.exit('No components/*.xml found under ' + src)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'raw'), exist_ok=True)
    base, comp = locate(src, out)
    files = sorted(f for f in os.listdir(comp) if f.endswith('.xml'))
    roots, counts = {}, {}
    pkg = {'source': os.path.abspath(src), 'base': base, 'components_dir': comp}
    pc = os.path.join(base, 'PackageConf.xml')
    if os.path.exists(pc):
        r = load_root(pc)
        if r is not None:
            pkg['package_name'] = t(r, 'displayName') or t(r, 'name')
            pkg['declared_components'] = [c.get('Type') for c in r.iter('Component')]
    for f in files:
        typ = f[:-4]
        if os.path.getsize(os.path.join(comp, f)) > 15_000_000 and typ in ('PAGE_LAYOUT',):
            counts[typ] = 'skipped (very large layout data)'
            continue
        r = load_root(os.path.join(comp, f))
        if r is None:
            continue
        roots[typ] = r
        counts[typ] = len(r)
        json.dump([flatten(x) for x in r], open(os.path.join(out, 'raw', typ + '.json'), 'w'), indent=1)
    pkg['counts'] = counts
    json.dump(pkg, open(os.path.join(out, 'package.json'), 'w'), indent=1)

    def dump(name, obj):
        json.dump(obj, open(os.path.join(out, name), 'w'), indent=1, ensure_ascii=False)

    # ---- fields
    fields = collections.defaultdict(list)
    if 'FIELD' in roots:
        for f in roots['FIELD']:
            dt = t(f, 'DataType', '0')
            typ = FIELD_TYPES.get(int(dt) if dt.lstrip('-').isdigit() else 0, 'Other')
            if dt == '1' and t(f, 'Display_Type') == '2':
                typ = 'Multi Line Text'
            opts = [v.text.strip() for v in f.iter() if v.tag in ('value', 'Value') and v.text and v.text.strip()]
            fields[t(f, 'moduleName')].append(dict(
                label=t(f, 'displayName'), name=t(f, 'name'),
                origin='System' if t(f, 'Is_Default') == 'true' else 'Custom',
                type=typ, required=t(f, 'Required') == 'true', lookup=t(f, 'lookupModuleName'),
                options=opts if typ in ('Picklist', 'Multi Picklist') else []))
    dump('fields.json', fields)

    # ---- forms
    forms = collections.defaultdict(lambda: collections.defaultdict(list))
    form_meta = {}
    if 'FORM' in roots:
        for f in roots['FORM']:
            form_meta[t(f, 'Form_Name')] = dict(module=t(f, 'moduleName'), display=t(f, 'displayName'),
                                                app=t(f, 'ApplicationName'), web=t(f, 'ShowInWeb'), mobile=t(f, 'ShowInMobile'))
    if 'FORM_FIELDS' in roots:
        for ff in sorted(roots['FORM_FIELDS'], key=lambda x: int(t(x, 'Sequence_Number', '0') or 0)):
            forms[t(ff, 'moduleName')][t(ff, 'Form_Name')].append(dict(
                section=t(ff, 'Section_Link_Name'), label=t(ff, 'displayName'), field=t(ff, 'Facilio_Field_Name'),
                required=t(ff, 'Required') == 'true', hidden=t(ff, 'Hide_Field') == 'true',
                default=t(ff, 'Default_Value'), widget=t(ff, 'Display_Type')))
    dump('forms.json', {'forms': forms, 'form_meta': form_meta})

    # ---- statuses
    statuses = collections.defaultdict(dict)
    if 'TICKET_STATUS' in roots:
        for s in roots['TICKET_STATUS']:
            statuses[t(s, 'parentModuleName') or '(org-level)'][t(s, 'status')] = t(s, 'displayName')
    dump('statuses.json', statuses)

    def disp(module, st):
        return statuses.get(module, {}).get(st) or statuses.get('(org-level)', {}).get(st) or st

    # ---- state flows
    flows = collections.defaultdict(list)
    if 'STATE_FLOW' in roots:
        for f in roots['STATE_FLOW']:
            m = t(f, 'moduleName') or t(f, 'ModuleName')
            flows[m].append(dict(name=t(f, 'name') or t(f, 'Name'), link=t(f, 'linkName'),
                                 default=t(f, 'defaultStateflow') or t(f, 'Default_State_Flow') or t(f, 'isDefault'),
                                 enabled=t(f, 'Status'), initial=disp(m, t(f, 'defaultStateName') or t(f, 'Default_State_Name') or t(f, 'DefaultStateName')),
                                 priority=t(f, 'Execution_Order'), criteria=criteria(f.find('Criteria')),
                                 raw=flatten(f)))
    dump('stateflows.json', flows)

    # ---- transitions
    trans = []
    if 'STATE_TRANSITION' in roots:
        for x in roots['STATE_TRANSITION']:
            m = t(x, 'moduleName')
            at, fc, scr = actions(x)
            ty = t(x, 'Type', '1')
            sched = {k: t(x, './/' + k) for k in ('ScheduleType', 'Interval', 'Date_Field_Name') if t(x, './/' + k)}
            trans.append(dict(
                module=m, flow=t(x, 'StateflowName'), flow_link=t(x, 'StateflowLinkName'), name=t(x, 'name'),
                link=t(x, 'linkName'), from_status=disp(m, t(x, 'FromStateName')), to_status=disp(m, t(x, 'ToStateName')),
                enabled=t(x, 'Status') == 'true',
                type=TRANSITION_TYPES.get(int(ty) if ty.isdigit() else 1, ty),
                performed_by=sharing(x.find('ApproverList')), criteria=criteria(x.find('Criteria')),
                comment_required=t(x, 'Comment_Required') == 'true', form=t(x, 'FormName'),
                field_updates=fc, actions=at, scripts=scr, schedule=sched,
                portals=[p for p in ('Vendor', 'Tenant', 'Client', 'Occupant') if t(x, f'ShowIn{p}Portal') == 'true'],
                email_link=t(x, 'ShouldExecuteFromPermalink') == 'true',
                confirmation=[t(c, 'message') for c in x.iter('confirmationDialog')]))
    dump('transitions.json', trans)

    # ---- approvals
    appr = []
    if 'APPROVAL_STATE_FLOW' in roots:
        for a in roots['APPROVAL_STATE_FLOW']:
            outcomes = {}
            for tag in ('Approval_Actions', 'Reject_Actions'):
                e = a.find(tag)
                if e is not None:
                    outcomes[tag] = [s.text for s in e.iter('Status_Name')]
            _, fc, scr = actions(a)
            appr.append(dict(module=t(a, 'Parent_Module_Name') or t(a, 'moduleName'), name=t(a, 'name'),
                             enabled=t(a, 'Status'), all_required=t(a, 'Is_All_Approval_Needed'),
                             criteria=criteria(a.find('Criteria')), approvers=sharing(a.find('ApproverList')),
                             approve_form=t(a, './/Approval_Form/Form_Name') or t(a, 'Approval_Form'),
                             outcomes=outcomes, field_updates=fc, scripts=scr))
    dump('approvals.json', appr)

    # ---- workflow rules
    wfr = []
    if 'WORKFLOW_RULE' in roots:
        for w in roots['WORKFLOW_RULE']:
            at, fc, scr = actions(w)
            wfr.append(dict(module=t(w, 'moduleName'), name=t(w, 'name'), description=t(w, 'Description'),
                            enabled=t(w, 'Status'), event=t(w, 'Activity_Type'), trigger=t(w, 'TriggerLinkName'),
                            schedule=dict(type=t(w, 'Schedule_Type'), interval=t(w, 'Time_Interval'), time=t(w, 'Job_Time')),
                            criteria=criteria(w.find('Criteria')), actions=at, field_updates=fc, scripts=scr))
    dump('workflow_rules.json', wfr)

    # ---- functions
    fns = []
    if 'FUNCTION' in roots:
        for f in roots['FUNCTION']:
            body = ''.join((x.text or '') for x in f.iter() if x.tag in ('Workflow_String', 'workflowString', 'Workflow_V2_String', 'workflowV2String'))
            fns.append(dict(name=t(f, 'name'), namespace=t(f, 'nameSpace') or t(f, 'Namespace_Name') or t(f, 'NameSpace'), body=body))
    dump('functions.json', fns)

    # ---- buttons
    btn = []
    if 'CUSTOM_BUTTON' in roots:
        for b in roots['CUSTOM_BUTTON']:
            at, fc, scr = actions(b)
            btn.append(dict(module=t(b, 'moduleName'), name=t(b, 'name'), enabled=t(b, 'Status'),
                            button_type=t(b, 'Button_Type'), position=t(b, 'Position_Type'),
                            criteria=criteria(b.find('Criteria')), roles=sharing(b.find('ApproverList')),
                            form=t(b, 'Form_Name'), actions=at, field_updates=fc, scripts=scr, raw=flatten(b)))
    dump('buttons.json', btn)

    # ---- notifications
    nts = []
    if 'NOTIFICATION' in roots:
        for n in roots['NOTIFICATION']:
            s = ET.tostring(n, encoding='unicode')
            at, _, _ = actions(n)
            hints = sorted(set(re.findall(r'(assignedTo|assignedBy|requester\w*|cs\.emails|approval_authorities\w*|'
                                          r'request_approved\w*|contact|sysCreatedBy|vendor|tenant|client)', s)))
            nts.append(dict(module=t(n, 'moduleName'), name=t(n, 'name'), enabled=t(n, 'Status'),
                            event=t(n, 'Activity_Type'), criteria=criteria(n.find('Criteria')), channels=at,
                            schedule=dict(type=t(n, 'Schedule_Type'), interval_seconds=t(n, 'Time_Interval')),
                            recipient_hints=hints))
    dump('notifications.json', nts)

    # ---- SLA
    sla = {}
    for k in ('SLA_POLICY', 'SLA_ENTITY'):
        if k in roots:
            sla[k] = [flatten(x) for x in roots[k]]
    dump('sla.json', sla)

    # ---- roles
    roles = []
    if 'ROLE' in roots:
        for r in roots['ROLE']:
            perms = collections.defaultdict(dict)
            for p in r.iter('Permission'):
                perms[t(p, 'Application')][t(p, 'Web_Tab_Name')] = t(p, 'Permission_Value')
            roles.append(dict(name=t(r, 'name'), privileged=t(r, 'Is_Privileged_Role'), super_admin=t(r, 'Is_Super_Admin'),
                              apps=[a.text for a in r.iter('AppLinkName')], permissions=perms))
    dump('roles.json', roles)

    # ---- apps / tabs / dashboards / reports
    if 'APP' in roots:
        dump('apps.json', [dict(link=t(a, 'AppLinkName'), name=t(a, 'ApplicationName'), enabled=t(a, 'Status')) for a in roots['APP']])
    tabs = []
    if 'WEBTAB' in roots:
        for w in roots['WEBTAB']:
            groups = [(t(g, 'Route'), t(g, './/LayoutDeviceType')) for g in w.iter('WebTabGroup')]
            tabs.append(dict(app=t(w, 'AppLinkName'), name=t(w, 'name'), route=t(w, 'Route'), type=t(w, 'TabType'),
                             modules=[v.text for v in w.iter('value')], menu_groups=groups, in_menu=bool(groups)))
    dump('webtabs.json', tabs)
    if 'WEBTAB_GROUP' in roots:
        dump('webtab_groups.json', [dict(name=t(g, 'name'), route=t(g, 'Route'), order=t(g, 'TabGroupOrder'),
                                         app=t(g, './/AppLinkName'), device=t(g, './/LayoutDeviceType')) for g in roots['WEBTAB_GROUP']])
    if 'DASHBOARD' in roots:
        dump('dashboards.json', [dict(name=t(d, 'Name'), module=t(d, 'ModuleName'), folder=t(d, 'folderLinkName'),
                                      tabs=[t(x, 'Name') for x in d.iter('DASHBOARD_TAB')], mobile=t(d, 'showHideMobile'),
                                      shared_with=sharing(d)) for d in roots['DASHBOARD']])
    if 'REPORT' in roots:
        dump('reports.json', [dict(name=t(r, 'Name'), module=t(r, 'ModuleName'), folder=t(r, 'folderLinkName')) for r in roots['REPORT']])
    if 'REPORT_FOLDER' in roots:
        dump('report_folders.json', [dict(name=t(f, 'Name'), link=t(f, 'linkName'), hidden=t(f, 'is_hidden')) for f in roots['REPORT_FOLDER']])

    # ---- form rules (show/hide, mandatory, set value, filters)
    if 'FORM_RULE' in roots:
        frs = []
        for r in roots['FORM_RULE']:
            acts = []
            for a in r.iter('Form_Rule_Action'):
                acts.append(dict(type=FORM_RULE_ACTIONS.get(t(a, 'Form_Rule_Action_Type'), t(a, 'Form_Rule_Action_Type')),
                                 fields=[t(f, 'Form_Field_Display_Name') or t(f, 'Facilio_Field_Name') for f in a.iter('Form_Rule_Action_Field')],
                                 value=t(a, './/Value') or t(a, './/Action_Meta')))
            frs.append(dict(module=t(r, 'moduleName'), form=t(r, 'Form_Name'), name=t(r, 'name'),
                            description=t(r, 'Description'), enabled=t(r, 'Status') != 'false',
                            trigger=t(r, 'Trigger_Type'), execute=t(r, 'Execute_Type'),
                            trigger_fields=[t(f, 'Form_Field_Display_Name') or t(f, 'Facilio_Field_Name') for f in r.iter('Trigger_Field')],
                            criteria=criteria(r.find('Form_Rule_Criteria')), actions=acts))
        dump('form_rules.json', frs)

    # ---- email templates (subject + placeholders used)
    if 'EMAIL_TEMPLATE' in roots:
        dump('email_templates.json', [dict(module=t(e, 'moduleName'), name=t(e, 'Name'), subject=t(e, 'Subject'),
                                           placeholders=sorted(set(re.findall(r'\$\{([^}]+)\}', (t(e, 'Message') + t(e, 'Subject')))))[:40])
                                      for e in roots['EMAIL_TEMPLATE']])

    # ---- master data and other lists (names only; used for Key Terms, classification and setup sections)
    MASTER_NAME_TAGS = ('Display_Name', 'Ticket_Display_Name', 'Display_name', 'displayName', 'widgetName', 'Name', 'name',
                        'Space_Category_Name', 'Asset_Category_Name', 'Ticket_Category_Name', 'Priority', 'linkName')
    known = {'MODULE', 'FIELD', 'FORM', 'FORM_FIELDS', 'FORM_SECTION', 'FORM_RULE', 'STATE_FLOW', 'STATE_TRANSITION',
             'TICKET_STATUS', 'APPROVAL_STATE_FLOW', 'WORKFLOW_RULE', 'FUNCTION', 'CUSTOM_BUTTON', 'NOTIFICATION',
             'EMAIL_TEMPLATE', 'SLA_POLICY', 'SLA_ENTITY', 'ROLE', 'APP', 'WEBTAB', 'WEBTAB_GROUP', 'DASHBOARD',
             'REPORT', 'REPORT_FOLDER'}
    masters = {}
    for typ, recs in roots.items():
        if typ in known:
            continue
        names = []
        for r in recs:
            nm = next((t(r, k) for k in MASTER_NAME_TAGS if t(r, k)), '')
            if not nm and r.get('Type'):
                nm = r.get('Type')
            if nm:
                names.append(nm)
        masters[typ] = dict(count=len(recs), names=names[:300])
    dump('masters.json', masters)

    # ---- modules in use (evidence)
    ev = collections.defaultdict(set)
    main_apps = {a for a in ('maintenance',)}
    for tb in tabs:
        for m in tb['modules']:
            if tb['in_menu'] and (tb['app'] in main_apps or tb['app'] in ('vendor', 'tenant', 'client', 'service')):
                ev[m].add(f"menu tab '{tb['name']}' in {tb['app']}")
            elif not tb['in_menu']:
                ev[m].add(f"tab '{tb['name']}' in {tb['app']} (not in a menu group)")
    for m, fl in fields.items():
        n = sum(1 for f in fl if f['origin'] == 'Custom')
        if n:
            ev[m].add(f'{n} custom fields')
    for m, fl in flows.items():
        for f in fl:
            if not (f['link'] or '').startswith('default') or f['link'].endswith('__C'):
                ev[m].add(f"custom state flow '{f['name']}'")
    for tr in trans:
        if tr['link'].endswith('__C') and tr['enabled']:
            ev[tr['module']].add('custom transitions')
    for x in wfr:
        ev[x['module']].add('workflow rules')
    for x in appr:
        ev[x['module']].add('approval rules')
    for x in btn:
        ev[x['module']].add('custom buttons')
    for x in nts:
        ev[x['module']].add('notifications')
    if 'MODULE' in roots:
        for m in roots['MODULE']:
            nm = t(m, 'name') or t(m, 'moduleName')
            if nm.startswith('custom_'):
                ev[nm].add('custom module')
    mods = {m: sorted(v) for m, v in sorted(ev.items()) if m}
    dump('modules_in_use.json', mods)

    # ---- coverage checklist
    L = ['# Coverage Checklist', '', f"Package: {pkg.get('package_name', '?')}", '',
         '## Component types', '', '| Component | Records | Extracted | Reviewed | Used in document |', '|---|---|---|---|---|']
    for k in sorted(counts):
        L.append(f'| {k} | {counts[k]} | yes | [ ] | [ ] |')
    missing = [c for c in pkg.get('declared_components', []) if c not in counts]
    if missing:
        L += ['', 'Declared in PackageConf.xml but no XML found: ' + ', '.join(missing)]
    L += ['', '## Modules with evidence of use', '', '| Module | Evidence | Section written | Left out (reason) |', '|---|---|---|---|']
    for m, e in mods.items():
        L.append(f"| {m} | {'; '.join(e)} | [ ] | |")
    L += ['', '## Counts to reconcile against the document', '',
          f"- Enabled transitions: {sum(1 for x in trans if x['enabled'])} (disabled: {sum(1 for x in trans if not x['enabled'])})",
          f"- Workflow rules: {len(wfr)} (enabled: {sum(1 for x in wfr if x['enabled'] == 'true')})",
          f"- Approval rules: {len(appr)} (enabled: {sum(1 for x in appr if x['enabled'] == 'true')})",
          f"- Custom buttons: {len(btn)} (enabled: {sum(1 for x in btn if x['enabled'] == 'true')})",
          f"- Notifications: {len(nts)} (enabled: {sum(1 for x in nts if x['enabled'] == 'true')})",
          f"- Functions: {len(fns)}", f"- Roles: {len(roles)}",
          f"- Dashboards: {len(json.load(open(os.path.join(out, 'dashboards.json')))) if os.path.exists(os.path.join(out, 'dashboards.json')) else 0}",
          f"- Reports: {len(json.load(open(os.path.join(out, 'reports.json')))) if os.path.exists(os.path.join(out, 'reports.json')) else 0}"]
    open(os.path.join(out, 'COVERAGE.md'), 'w').write('\n'.join(L) + '\n')
    print('Extracted', len(counts), 'component types to', out)
    print('Modules with evidence of use:', len(mods))
    print('See', os.path.join(out, 'COVERAGE.md'))


if __name__ == '__main__':
    main()
