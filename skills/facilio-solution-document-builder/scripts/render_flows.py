#!/usr/bin/env python3
"""
render_flows.py - draw process flow diagrams (PNG) for the Solution Document.

Two modes:

1) AUTO DRAFT from the extracted state flow (good first draft, always check it):
     python3 render_flows.py auto <extract_dir> <module> "<state flow name>" <out_dir> [--title "..."] [--lr]
   Uses <extract_dir>/transitions.json (from extract_package.py). Only ENABLED transitions are drawn.
   User-button transitions become yellow action boxes, automatic / scheduled ones become dashed
   pink "automatic step" boxes. Conditions are NOT drawn as text; add decisions in spec mode.

2) SPEC (hand-curated, used for the final document when decisions / cross-module steps matter):
     python3 render_flows.py spec <spec.json> <out_dir>
   spec.json:
     {"name": "wo_reactive", "title": "Work Order - Reactive Flow", "rankdir": "TB",
      "decisions": {"D1": "Within warranty\\nperiod?"},
      "edges": [
        ["Open", "Assign", "Assigned"],                      # status -> user action -> status
        ["Assigned", "Start Work", "In Progress"],
        ["In Progress", "auto: after 3 days", "Closed", "sys"],  # automatic step
        ["Submitted", "", "D:D1"],                           # plain arrow into a decision
        ["D:D1", "", "Approved", "act", "Yes"],               # decision branch with edge label
        ["D:D1", "", "Pending Approval", "act", "No"]
      ]}

Style (matches the document standard): statuses = blue rounded boxes, user actions = yellow boxes,
automatic steps = dashed pink boxes, decisions = green diamonds, legend on every diagram.
Never use '&' or '<' '>' in labels (Graphviz HTML labels break) - write 'and'.
Requires Graphviz 'dot' (apt-get install -y graphviz).
"""
import json, os, subprocess, sys, re, collections

FONT = 'Carlito'  # metric-compatible with Calibri; falls back automatically if missing
STATE = f'shape=box style="rounded,filled" fillcolor="#CFE2F3" color="#3D85C6" fontname="{FONT}" fontsize=11 margin="0.15,0.06"'
ACT = f'shape=box style="filled" fillcolor="#FFF2CC" color="#BF9000" fontname="{FONT}" fontsize=9 margin="0.08,0.03" height=0.25'
SYS = f'shape=box style="filled,dashed" fillcolor="#EAD1DC" color="#741B47" fontname="{FONT}" fontsize=9 margin="0.08,0.03" height=0.25'
DEC = f'shape=diamond style="filled" fillcolor="#D9EAD3" color="#38761D" fontname="{FONT}" fontsize=9 margin="0.02,0.02"'


def clean(s):
    return re.sub(r'[<>&"]', lambda m: {'&': 'and', '<': '', '>': '', '"': "'"}[m.group()], s or '')


def wrap(s, n=22):
    words, lines, cur = clean(s).split(), [], ''
    for wd in words:
        if len(cur) + len(wd) + 1 > n and cur:
            lines.append(cur); cur = wd
        else:
            cur = (cur + ' ' + wd).strip()
    if cur: lines.append(cur)
    return '\\n'.join(lines)


class Flow:
    def __init__(self):
        self.lines, self.n, self.states = [], 0, set()

    def state(self, x):
        if x not in self.states:
            self.states.add(x)
            self.lines.append(f'"{clean(x)}" [label="{wrap(x, 18)}" {STATE}];')

    def edge(self, f, action, t, kind='act', label=None):
        for s in (f, t):
            if not s.startswith('D:'):
                self.state(s)
        fn = f[2:] if f.startswith('D:') else clean(f)
        tn = t[2:] if t.startswith('D:') else clean(t)
        lab = f' label="{clean(label)}"' if label else ''
        if action:
            self.n += 1
            an = f'a{self.n}'
            self.lines.append(f'{an} [label="{wrap(action)}" {SYS if kind == "sys" else ACT}];')
            self.lines.append(f'"{fn}" -> {an} [arrowhead=none{"," + lab if lab else ""}]; {an} -> "{tn}";')
        else:
            self.lines.append(f'"{fn}" -> "{tn}"{" [" + lab + "]" if lab else ""};')

    def decision(self, key, label):
        self.lines.append(f'"{key}" [label="{wrap(label, 16)}" {DEC}];')

    def render(self, out_dir, name, title, rankdir='TB'):
        os.makedirs(out_dir, exist_ok=True)
        g = [f'digraph G {{ rankdir={rankdir}; nodesep=0.35; ranksep=0.33; bgcolor=white; dpi=200;',
             f'labelloc=t; label=<<B>{clean(title)}</B>>; fontname="{FONT}"; fontsize=15; fontcolor="#351C75";',
             f'edge [color="#555555" arrowsize=0.6 fontname="{FONT}" fontsize=9];',
             *self.lines,
             'subgraph cluster_leg { label=<<B>Legend</B>>; fontsize=10; color="#999999"; style=rounded; '
             f'l1 [label="Status" {STATE}]; l2 [label="User action" {ACT}]; l3 [label="Automatic step" {SYS}]; '
             f'l4 [label="Decision" {DEC}]; l1->l2->l3->l4 [style=invis]; }}', '}']
        dot = os.path.join(out_dir, name + '.dot'); png = os.path.join(out_dir, name + '.png')
        open(dot, 'w').write('\n'.join(g))
        subprocess.run(['dot', '-Tpng', dot, '-o', png], check=True)
        print('wrote', png)
        return png


def auto(ext, module, flow_name, out_dir, title=None, lr=False):
    trans = json.load(open(os.path.join(ext, 'transitions.json')))
    sel = [x for x in trans if x['module'] == module and x['flow'] == flow_name and x['enabled']]
    if not sel:
        flows = sorted({(x['module'], x['flow']) for x in trans if x['module'] == module})
        sys.exit(f'No enabled transitions for {module} / {flow_name}. Flows on this module: {flows}')
    f = Flow()
    for x in sel:
        manual = x['type'].startswith('User')
        f.edge(x['from_status'], x['name'] if manual else f"{x['name']} (automatic)",
               x['to_status'], 'act' if manual else 'sys')
    name = re.sub(r'\W+', '_', f'{module}_{flow_name}').strip('_').lower()
    return f.render(out_dir, name, title or f'{flow_name}', 'LR' if lr else 'TB')


def spec(path, out_dir):
    s = json.load(open(path))
    f = Flow()
    for k, v in s.get('decisions', {}).items():
        f.decision(k, v)
    for e in s['edges']:
        e = list(e) + [None] * (5 - len(e))
        f.edge(e[0], e[1], e[2], e[3] or 'act', e[4])
    return f.render(out_dir, s['name'], s.get('title', s['name']), s.get('rankdir', 'TB'))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('auto', 'spec'):
        sys.exit(__doc__)
    if a[0] == 'spec':
        spec(a[1], a[2])
    else:
        title = a[a.index('--title') + 1] if '--title' in a else None
        auto(a[1], a[2], a[3], a[4], title, '--lr' in a)
