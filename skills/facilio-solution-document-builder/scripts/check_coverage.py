#!/usr/bin/env python3
"""
check_coverage.py - the "nothing missed" gate. Compares the finished document against the
extracted org package and lists every configured item that the document does not mention.

  python3 check_coverage.py <extract_dir> <document.docx> [left_out.txt]

left_out.txt (optional): one item per line, "<kind>|<name>|<reason>", e.g.
  workflow|Update Asset Location|internal data-sync rule, no user-visible effect
  module|agentMeta|platform/system module, no business process
Items listed there count as consciously left out and must also appear in the chat summary.

Checks (enabled items only unless stated):
  transitions (by action name per module), approval rules, workflow rules, custom buttons,
  notifications, SLA policies, roles, dashboards, report folders, state flows (active and
  inactive - inactive ones must at least be mentioned as inactive), modules with evidence of use.
Matching is case-insensitive and ignores punctuation, so reword freely but keep the configured
name visible somewhere (table cell, bold label or sentence).
Add --draft <file> to write every unaccounted item as a left_out.txt template ("kind|name|REASON?")
so each one gets a conscious decision: document it, or give a reason.
Exit code 1 when anything is unaccounted for.
"""
import json, os, re, sys, zipfile


def norm(s):
    s = (s or '').lower().replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def doc_text(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf8')
    xml = re.sub(r'</w:p>', '\n', xml)
    return norm(re.sub(r'<[^>]+>', '', xml))


def load(ext, name, default):
    p = os.path.join(ext, name)
    return json.load(open(p)) if os.path.exists(p) else default


def on(v):
    return v is True or str(v).lower() == 'true'


def main():
    ext, docx = sys.argv[1], sys.argv[2]
    left = {}
    if len(sys.argv) > 3 and sys.argv[3] != '--draft' and os.path.exists(sys.argv[3]):
        for ln in open(sys.argv[3]):
            parts = [p.strip() for p in ln.split('|')]
            if len(parts) >= 2 and parts[0]:
                left[(parts[0].lower(), norm(parts[1]))] = parts[2] if len(parts) > 2 else ''
    text = doc_text(docx)
    items = []  # (kind, module, name)
    for x in load(ext, 'transitions.json', []):
        if x.get('enabled'):
            items.append(('transition', x['module'], x['name']))
    for m, fl in load(ext, 'stateflows.json', {}).items():
        for f in fl:
            if f['link'] and not f['link'].startswith('default') or not on(f.get('default')) or not on(f.get('enabled')):
                items.append(('stateflow', m, f['name']))
    for kind, fname in (('approval', 'approvals.json'), ('workflow', 'workflow_rules.json'),
                        ('button', 'buttons.json'), ('notification', 'notifications.json'),
                        ('sla', 'sla.json')):
        data = load(ext, fname, [])
        if isinstance(data, dict):
            data = data.get('policies', []) or [v for vs in data.values() for v in (vs if isinstance(vs, list) else [])]
        for x in data:
            if on(x.get('enabled', True)):
                items.append((kind, x.get('module', ''), x.get('name', '')))
    for r in load(ext, 'roles.json', []):
        items.append(('role', '', r.get('name', '') if isinstance(r, dict) else r))
    for d in load(ext, 'dashboards.json', []):
        items.append(('dashboard', d.get('module', ''), d.get('name', '')))
    for f in load(ext, 'report_folders.json', []):
        items.append(('report folder', f.get('module', ''), f.get('name', '')))
    mod_names = {}
    for mm in load(ext, os.path.join('raw', 'MODULE.json'), []):
        nm = mm.get('name') or mm.get('moduleName') or ''
        mod_names[nm] = mm.get('displayName') or mm.get('Display_Name') or nm
    for m in load(ext, 'modules_in_use.json', {}):
        items.append(('module', m, mod_names.get(m, m)))

    seen, missing, excused = set(), [], []
    for kind, mod, name in items:
        key = (kind, mod, norm(name))
        if not name or key in seen:
            continue
        seen.add(key)
        if norm(name) in text or (kind == 'module' and norm(mod) in text):
            continue
        if (kind, norm(name)) in left or (kind, norm(mod)) in left:
            excused.append((kind, mod, name, left[(kind, norm(name))]))
        else:
            missing.append((kind, mod, name))

    print(f'Checked {len(seen)} configured items against {os.path.basename(docx)}')
    print(f'  mentioned: {len(seen) - len(missing) - len(excused)}   left out with reason: {len(excused)}   UNACCOUNTED: {len(missing)}')
    if missing:
        print('\nUNACCOUNTED (document it, or add to left_out.txt with a reason):')
        cur = None
        for kind, mod, name in sorted(missing):
            if kind != cur:
                print(f'\n  [{kind}]'); cur = kind
            print(f'    - {name}' + (f'   (module: {mod})' if mod and mod != name else ''))
    if excused:
        print('\nLEFT OUT (must be listed in the delivery summary):')
        for kind, mod, name, why in sorted(excused):
            print(f'  - {kind}: {name} - {why}')
    if '--draft' in sys.argv:
        out = sys.argv[sys.argv.index('--draft') + 1]
        with open(out, 'w') as fh:
            for kind, mod, name in sorted(missing):
                fh.write(f'{kind}|{name}|REASON? (module: {mod})\n')
        print(f'\nDraft left-out list written to {out} - fill every REASON? or document the item.')
    sys.exit(1 if missing else 0)


if __name__ == '__main__':
    main()
