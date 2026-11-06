/* Stage 3, Solution status (roadmap E21, step 2): for each module in scope, what the team has recorded so far, in the order the BRD needs it:
   requirements, fields, forms, state flow, actions across modules, notifications, access (permissions), connected apps, open points.
   READ ONLY: it never writes and never asks Claude for anything; it only answers "where are we?". A dash means nothing is recorded yet. The pure rule is V.solutionLogic.status (tests/solution_status.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews;
  const arr = v => (Array.isArray(v) ? v : []);
  const PARTS = [['requirements', 'Requirements'], ['fields', 'Fields'], ['forms', 'Forms'], ['flows', 'State flow'], ['actions', 'Across modules'], ['notifications', 'Notifications'], ['access', 'Access'], ['apps', 'Connected apps'], ['open', 'Open points']];

  /** pure: one line per module from plain counts: { requirements: {confirmed, draft}, fields, forms, flows, actions, notifications, access, apps, open } */
  function status(modules) {
    return arr(modules).map(m => {
      const done = { requirements: m.requirements.confirmed > 0, fields: m.fields > 0, forms: m.forms > 0, flows: m.flows > 0, actions: m.actions > 0, notifications: m.notifications > 0, access: m.access > 0, apps: m.apps > 0 };
      const text = {
        requirements: m.requirements.confirmed || m.requirements.draft ? [m.requirements.confirmed ? m.requirements.confirmed + ' confirmed' : '', m.requirements.draft ? m.requirements.draft + ' draft' : ''].filter(Boolean).join(', ') : '',
        fields: m.fields ? m.fields + ' changed or added' : '', forms: m.forms ? m.forms + ' proposed' : '', flows: m.flows ? m.flows + ' saved' : '', actions: m.actions ? String(m.actions) : '', notifications: m.notifications ? String(m.notifications) : '', access: m.access ? m.access + ' role' + (m.access === 1 ? '' : 's') : '', apps: m.apps ? String(m.apps) : '', open: m.open ? m.open + ' open' : ''
      };
      return { name: m.name, label: m.label, text, done, missing: PARTS.filter(p => p[0] !== 'open' && !done[p[0]]).map(p => p[0]), open: m.open };
    });
  }
  V.solutionLogic = { status, PARTS };

  /** the project's recorded solution as plain counts, per module in scope */
  function gather() {
    const props = (F.doc('design_proposals') || {}).items || []; const norm = x => String(x || '').trim().toLowerCase();
    return (F.allModules() || []).filter(m => m.inScope).map(m => {
      const reqs = arr(S.ws.requirements).filter(r => arr(r.modules).includes(m.name));
      const perms = new Set(); Object.entries(S.ws.rolePermOps || {}).forEach(([rid, o]) => { if (o && o[m.name]) perms.add(rid); }); arr(S.ws.roles).forEach(r => { if (r && r.perms && r.perms[m.name]) perms.add(r.id); });
      return { name: m.name, label: m.label || m.name,
        requirements: { confirmed: reqs.filter(r => r.status === 'Confirmed').length, draft: reqs.filter(r => r.status !== 'Confirmed').length },
        fields: F.effFields(m.name).filter(x => x.status === 'proposed' || x.status === 'modified' || x.status === 'removed').length, forms: F.formsForModule(m.name).filter(f => f && f.proposed).length,
        flows: Object.values(S.ws.flows || {}).filter(f => f.module === m.name && f.enabled !== false).length, actions: arr((S.ws.crossLinks || {})[m.name]).length,
        notifications: arr(S.ws.notifications).filter(n => n.module === m.name).length, access: perms.size,
        apps: props.filter(p => p.kind === 'connectedapp' && p.status === 'applied' && (norm(p.module) === norm(m.name) || norm(p.module) === norm(m.label))).length,
        open: arr(S.ws.questions).filter(q => q.status !== 'closed' && (arr(q.modules).includes(m.name) || norm(q.area) === norm(m.label))).length };
    });
  }

  V.solution = { html() {
    if (V.isCustomer()) return '';
    const rows = status(gather()); const n = rows.length;
    const head = '<div class="page-header"><div class="t"><h1>Solution status</h1><p>For each module in scope, what your team has recorded so far, in the order the BRD needs it. A dash means nothing is recorded yet. This page only reads: change things on the tabs below it.</p></div></div>';
    if (!n) return head + '<div class="page-body"><div class="card empty"><h3>No module is in scope yet</h3><p>Switch on the modules the project covers on System Modules &amp; Form Builder. The BRD and this page follow that list.</p><div class="row empty-acts"><button class="btn primary" data-act="nav" data-view="modules">Open the modules</button></div></div></div>';
    const have = id => rows.filter(r => r.done[id]).length;
    const chips = PARTS.filter(p => p[0] !== 'open').map(p => '<span class="sol-c' + (have(p[0]) === n ? ' all' : '') + '"><b>' + have(p[0]) + '/' + n + '</b> ' + esc(p[1]) + '</span>').join('');
    const cell = (r, id) => r.text[id] ? '<td class="sol-y">' + esc(r.text[id]) + '</td>' : '<td class="sol-n">' + (id === 'open' ? '' : '—') + '</td>';
    return head + '<div class="page-body"><div class="sol-chips">' + chips + '</div><div class="tbl-wrap"><table class="tbl sol"><thead><tr><th>Module</th>' + PARTS.map(p => '<th>' + esc(p[1]) + '</th>').join('') + '</tr></thead><tbody>'
      + rows.map(r => '<tr><td><a href="#" data-act="openModule" data-module="' + esc(r.name) + '"><b>' + esc(r.label) + '</b></a>' + (r.missing.length ? '<div class="xs muted">' + r.missing.length + ' of 8 parts missing</div>' : '<div class="xs sol-ok">All 8 parts recorded</div>') + '</td>' + PARTS.map(p => cell(r, p[0])).join('') + '</tr>').join('')
      + '</tbody></table></div><p class="xs muted">Standard Facilio behaviour is not counted: a module can be fine with some parts empty. “State flow saved” means the project holds its own copy of the flow. Nothing here is sent anywhere.</p></div>';
  }, mount() { } };
})(typeof window !== 'undefined' ? window : globalThis);
