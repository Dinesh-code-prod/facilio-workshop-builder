/* Stage 3, Solution (plan: docs/reference/SOLUTION-TAB-PLAN-2026-11-07.md). Where the team writes and keeps the agreed SOLUTION of each module in scope and of the fixed areas
   (connected apps, PDF templates, KPIs, SLA matrix, notifications, approval rules, roles, other commitments), in words. The BRD solution sections are built FROM these records (src/brd.js).
   Data: project document `solutions` (rules in src/sollogic.js, tests/sollogic.mjs). Every save is a new version with who, when and why.
   Ask Claude never applies anything: a job (update_solution, compare_solution) makes Claude write a PROPOSAL (design_proposals, kind solution) that shows here as before/after with its quote;
   a person presses Accept or Dismiss. A dropped customer file is stored (category solution_input) and compared by Claude the same way. Word export: Module | Customer requirement | Solution.
   Below the editor stays the older read-only coverage table (what is recorded per module). The pure rule of that table is V.solutionLogic.status (tests/solution_status.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT || {}; const toast = (...a) => V.toast && V.toast(...a);
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
  function coverage() {
    const rows = status(gather()); const n = rows.length; if (!n) return '';
    const have = id => rows.filter(r => r.done[id]).length;
    const chips = PARTS.filter(p => p[0] !== 'open').map(p => '<span class="sol-c' + (have(p[0]) === n ? ' all' : '') + '"><b>' + have(p[0]) + '/' + n + '</b> ' + esc(p[1]) + '</span>').join('');
    const cell = (r, id) => r.text[id] ? '<td class="sol-y">' + esc(r.text[id]) + '</td>' : '<td class="sol-n">' + (id === 'open' ? '' : '—') + '</td>';
    return '<div class="sol-chips">' + chips + '</div><div class="tbl-wrap"><table class="tbl sol"><thead><tr><th>Module</th>' + PARTS.map(p => '<th>' + esc(p[1]) + '</th>').join('') + '</tr></thead><tbody>'
      + rows.map(r => '<tr><td><a href="#" data-act="openModule" data-module="' + esc(r.name) + '"><b>' + esc(r.label) + '</b></a>' + (r.missing.length ? '<div class="xs muted">' + r.missing.length + ' of 8 parts missing</div>' : '<div class="xs sol-ok">All 8 parts recorded</div>') + '</td>' + PARTS.map(p => cell(r, p[0])).join('') + '</tr>').join('')
      + '</tbody></table></div><p class="xs muted">Standard Facilio behaviour is not counted: a module can be fine with some parts empty. “State flow saved” means the project holds its own copy of the flow. Nothing here is sent anywhere.</p>';
  }

  // ---------- the Solution editor ----------
  const L = () => root.FWBSolutionLogic; const J = () => V.studioJobs;
  (V.extraSections = V.extraSections || []).push('solutions');
  const ro = () => !!S.readonly || (S.project && S.project.role === 'viewer');
  const guard = () => { if (ro()) { toast('This project is read-only for you.', 4000, true); return true; } return false; };
  const ui = () => S.ui.sol || (S.ui.sol = { key: '', draft: null });
  const catalogue = () => (F.allModules() || []).map(m => ({ name: m.name, label: m.label || m.name }));
  /** what the contract documents say about the modules (cached while the documents and the catalogue are the same) */
  const empty = { strong: [], weak: [], excluded: [], docs: 0 };
  function ctr() {
    const docs = V.contractDocs ? V.contractDocs() : []; if (!docs.length || !root.FWBContractMods) return empty; const cat = catalogue(); const fp = docs.map(d => d.name + ':' + d.pages.reduce((n, p) => n + p.text.length, 0)).join('|') + '#' + cat.length; const u = S.ui;
    if (!u.cm || u.cm.fp !== fp) u.cm = { fp, res: Object.assign(root.FWBContractMods.find(cat, docs), { docs: docs.length }) }; return u.cm.res;
  }
  /** the modules that get an area: the ones the contract delivers (strong evidence), the ones a person added from the weaker mentions, and any module that already has a written solution (written work is never hidden);
      with no contract text at all, the modules switched on in the project (the old behaviour) */
  const mods = () => {
    const c = ctr(), cat = catalogue(), by = new Map(cat.map(m => [m.name, m])); const names = new Set(); const d = doc();
    if (c.docs) { c.strong.forEach(x => names.add(x.name)); arr(d.addedModules).forEach(n => names.add(n)); } else (F.allModules() || []).filter(m => m.inScope).forEach(m => names.add(m.name));
    Object.keys(L().itemsOf(d)).forEach(k => { if (/^module:/.test(k) && L().hasContent(d, k)) names.add(k.slice(7)); });
    return [...names].map(n => by.get(n) || { name: n, label: n }).sort((a, b) => a.label.localeCompare(b.label));
  };
  const areas = () => L().areasFor(mods(), doc());
  const doc = () => F.doc('solutions') || { items: {} };
  const props = () => ((F.doc('design_proposals') || {}).items) || [];
  const cur = () => { const as = areas(); return as.find(a => a.key === ui().key) || as[0]; };
  const by = () => (S.user && (S.user.name || S.user.email)) || '';
  const write = (next, msg, detail) => { J().setDoc('solutions', next); F.changed(msg, detail, { section: 'solutions' }); };
  const when = iso => { const t = Date.parse(iso); return isFinite(t) ? new Date(t).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; };
  const chip = s => '<span class="cs-sol-chip" data-s="' + esc(s.replace(/\s+/g, '-').toLowerCase()) + '">' + esc(s) + '</span>';
  const diffHtml = (a, b) => L().diff(a, b).map(x => x.t === 'same' ? esc(x.w) : x.t === 'add' ? '<ins>' + esc(x.w) + '</ins>' : '<del>' + esc(x.w) + '</del>').join('');
  const jobsOpen = kinds => { const k = J() && J().K(); return !!(k && Array.isArray(k.jobs) && k.jobs.some(j => kinds.includes(j.kind) && ['waiting', 'claimed', 'needs_input'].includes(j.status))); };

  function nav() {
    const d = doc(), u = cur(), ps = props();
    return ctrPanel() + L().GROUPS.map(g => { const as = areas().filter(a => a.group === g); if (!as.length) return ''; return '<div class="cs-sol-g"><h3>' + esc(g) + '</h3>' + as.map(a => { const n = L().proposalsFor(ps, a.key).length;
      return '<button type="button" class="cs-sol-i' + (u && a.key === u.key ? ' on' : '') + '" data-act="solPick" data-key="' + esc(a.key) + '"><span>' + esc(a.label) + '</span>' + (n ? '<em>' + n + ' proposed</em>' : chip(L().statusOf(d, a.key))) + '</button>'; }).join('') + '</div>'; }).join('');
  }
  /** one line that tells the person what Claude reads for the area (the same sources as the server context pack, work/server/_solctx.mjs) */
  function reads(a) {
    const m = a.key.startsWith('module:') ? a.key.slice(7) : '', w = S.ws, inM = x => !m || arr(x && x.modules).includes(m) || (x && x.module === m); const n = (c, one, many) => c + ' ' + (c === 1 ? one : many || one + 's');
    const rq = arr(w.requirements).filter(r => r && r.status !== 'Rejected' && (m ? inM(r) : true)), kp = V.items && V.items.ready(['kpi']) ? V.items.list('kpi').filter(k => !m || !k.module || k.module === m).length : 0;
    const parts = [n(rq.length, 'requirement') + ' (' + rq.filter(r => r.status === 'Confirmed').length + ' confirmed)', n(Object.values(w.flows || {}).filter(f => f && f.enabled !== false && (!m || f.module === m)).length, 'state flow'), n(arr(w.notifications).filter(x => !m || x.module === m).length, 'notification'), n(arr(w.slaMatrix).filter(x => !m || !x.module || x.module === m).length, 'SLA row'), n(kp, 'KPI'),
      n(props().filter(p => p.kind === 'connectedapp' && p.status === 'applied' && (!m || String(p.module).toLowerCase() === m.toLowerCase() || String(p.module).toLowerCase() === String((a.label || '')).toLowerCase())).length, 'connected app'), n(arr(w.questions).filter(q => q && q.status !== 'closed' && (!m || arr(q.modules).includes(m))).length, 'open question')];
    return '<p class="xs muted">Claude reads for this area: ' + esc(parts.join(', ')) + ', the fields and forms, access, what was said in the sessions, the contract scope and the solutions of the other areas.</p>';
  }
  const clone = x => JSON.parse(JSON.stringify(x));
  /** the working copy of the open area: what is typed and not yet saved survives a refresh */
  function ensureDraft() { const a = cur(), u = ui(); if (!u.draft || u.draft.key !== a.key || !Array.isArray(u.draft.rows)) { const r = L().recOf(doc(), a.key) || {}; u.draft = { key: a.key, text: r.text || '', rows: clone(arr(r.rows)) }; } return u.draft; }
  const cellDiff = (was, now) => (was === now ? esc(now || '') : diffHtml(was || '', now || ''));
  /** the proposal: the overview as a word diff, the table as rows marked New, Changed or Removed, then the words it rests on */
  function proposalCard(p, rec) {
    const lay = L().layoutOf(doc(), p.module), cols = lay.cols; const dr = p.rows ? L().diffRows(rec.rows, L().cleanRows(p.rows, L().kindOfKey(doc(), p.module))) : [], same = dr.filter(x => x.t === 'same').length;
    const tbl = dr.length ? '<table class="cs-sol-tbl cs-sol-dt"><thead><tr><th></th>' + cols.map(c => '<th>' + esc(c[1]) + '</th>').join('') + '</tr></thead><tbody>' + dr.filter(x => x.t !== 'same').map(x => '<tr class="' + x.t + '"><td><b>' + (x.t === 'add' ? 'New' : x.t === 'chg' ? 'Changed' : 'Removed') + '</b></td>' + cols.map(c => '<td>' + (x.t === 'del' ? '<del>' + esc((x.row.cells || {})[c[0]] || '') + '</del>' : x.t === 'add' ? '<ins>' + esc((x.row.cells || {})[c[0]] || '') + '</ins>' : cellDiff((x.was.cells || {})[c[0]], (x.row.cells || {})[c[0]])) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (same ? '<p class="xs muted">' + same + ' row' + (same === 1 ? '' : 's') + ' stay as they are.</p>' : '') : '';
    return '<article class="cs-sol-p"><div class="cs-sol-ph"><b>' + (p.fromCustomer ? 'Proposed from the customer’s file' : 'Proposed by Claude') + '</b>' + (p.outOfScope ? '<span class="cs-sol-warn">May be beyond the contract scope</span>' : '') + '</div>'
      + (p.why ? '<p class="small">' + esc(p.why) + '</p>' : '') + (p.text && p.text !== rec.text ? '<div class="cs-sol-diff">' + diffHtml(rec.text || '', p.text) + '</div>' : '') + tbl + (p.quote ? '<blockquote class="ds-q">' + esc(p.quote) + (p.source ? '<cite>' + esc(p.source) + '</cite>' : '') + '</blockquote>' : (p.source ? '<p class="xs muted">' + esc(p.source) + '</p>' : ''))
      + (p.outOfScope ? '<p class="small">' + esc(p.scopeNote || 'Check this against the contract before you accept it.') + '</p>' : '')
      + '<div class="cs-cmd"><button type="button" class="btn sm primary" data-act="solAccept" data-id="' + esc(p.id) + '">Accept</button><button type="button" class="btn sm" data-act="solDismiss" data-id="' + esc(p.id) + '">Dismiss</button>' + (p.outOfScope ? '<button type="button" class="btn sm" data-act="solCr" data-id="' + esc(p.id) + '">Raise a change request</button>' : '') + '</div></article>';
  }
  /** the line under the title of an area the team added, and the guide for an integration with no rows yet */
  function about(a, empty) {
    const mm = mods(), lk = (a.custom || a.group === 'Integrations') ? L().linkedModules(a, doc(), mm).map(n => (mm.find(x => x.name === n) || {}).label || n) : [];
    return (a.custom ? '<p class="xs muted">Added by your team' + (a.keywords && a.keywords.length ? '. Keywords: ' + esc(a.keywords.join(', ')) : '') + '.</p>' : '')
      + (lk.length ? '<p class="xs muted">Linked to ' + esc(lk.join(', ')) + (a.group === 'Integrations' ? ': those module sections of the BRD point to this integration.' : ': the BRD shows this solution inside those module sections.') + '</p>' : (a.custom ? '<p class="xs muted">Not linked to a module yet. Name a module in the text or the keywords and the BRD links it.</p>' : ''))
      + (a.group === 'Integrations' && empty ? '<div class="cs-sol-r"><h4>What to cover for an integration</h4><ul>' + L().INT_HINT.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '');
  }
  /** the solution as an editable table: one row per topic or item, columns by the kind of solution */
  function tableHtml(a, dr) {
    const cols = L().layoutOf(doc(), a.key).cols, ro_ = ro(); const kind = L().kindOfKey(doc(), a.key);
    const head = '<tr>' + cols.map(c => '<th>' + esc(c[1]) + '</th>').join('') + '<th>Status</th><th></th></tr>';
    const body = dr.rows.map((r, i) => '<tr>' + cols.map((c, ci) => '<td><textarea data-ri="' + i + '" data-c="' + c[0] + '" rows="2" maxlength="700" aria-label="' + esc(c[1]) + ', row ' + (i + 1) + '"' + (ro_ ? ' readonly' : '') + '>' + esc((r.cells || {})[c[0]] || '') + '</textarea></td>').join('')
      + '<td><select data-ri="' + i + '" data-s="1" aria-label="Status, row ' + (i + 1) + '"' + (ro_ ? ' disabled' : '') + '>' + L().ROW_STATUS.map(x => '<option' + (x === r.status ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></td><td>' + (ro_ ? '' : '<button type="button" class="btn sm" data-act="solRowDel" data-ri="' + i + '" aria-label="Delete row ' + (i + 1) + '">Delete</button>') + '</td></tr>').join('');
    const props_ = props().filter(p => p.kind === 'connectedapp' && p.status === 'applied').length;
    const tot = cols.reduce((n, c) => n + c[2], 0) / 0.84, cg = '<colgroup>' + cols.map(c => '<col style="width:' + (c[2] / tot * 100).toFixed(1) + '%">').join('') + '<col style="width:10%"><col style="width:6%"></colgroup>';
    return '<div class="cs-sol-tw"><table class="cs-sol-tbl">' + cg + '<thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="' + (cols.length + 2) + '" class="cs-none">No rows yet. Add the first one, or start from the list below.</td></tr>') + '</tbody></table></div>'
      + (ro_ ? '' : '<div class="cs-cmd"><button type="button" class="btn sm primary" data-act="solRowAdd">+ Add row</button>' + (kind === 'module' ? '<button type="button" class="btn sm" data-act="solTopics">Add the standard topics</button>' : '') + (kind === 'apps' && props_ ? '<button type="button" class="btn sm" data-act="solFromApps">Fill from the ' + props_ + ' connected app' + (props_ === 1 ? '' : 's') + ' captured in the sessions</button>' : '') + '</div>');
  }
  /** where the contract says it (document, page, the words), or why a module is here without it */
  function evidence(a) {
    if (!a.key.startsWith('module:')) return ''; const c = ctr(); if (!c.docs) return ''; const n = a.key.slice(7), e = c.strong.find(x => x.name === n), w = c.weak.find(x => x.name === n), x = c.excluded.find(y => y.name === n); const hits = (e || w || x || { hits: [] }).hits;
    const li = hits.slice(0, 6).map(h => '<li><b>' + esc(h.doc) + ', page ' + esc(h.page) + '</b>' + (h.excluded ? ' <span class="xs muted">(excluded)</span>' : '') + ': “' + esc(h.quote) + '”</li>').join('');
    if (e) return '<details class="fl-sol-r"><summary>In the contract (' + e.hits.filter(h => h.strong).length + ' place' + (e.hits.filter(h => h.strong).length === 1 ? '' : 's') + ')</summary><ul>' + li + '</ul></details>';
    return '<p class="xs muted">' + (hits.length ? 'The contract only mentions this module in passing or excludes it; it is here because someone added it.' : 'The contract documents do not mention this module; it is here because it was switched on or added by hand.') + '</p>' + (li ? '<details class="fl-sol-r"><summary>What the contract says (' + hits.length + ')</summary><ul>' + li + '</ul></details>' : '');
  }
  /** the panel above the list: how many documents were read, which modules were found, which are only mentioned, which the contract excludes, and the switch-on button */
  function ctrPanel() {
    const c = ctr(); if (!c.docs) return '<div class="fl-sol-g"><h3>From the contract</h3><p class="xs muted">No contract document has text yet, so the list shows the modules switched on in the project. Add the contract on Contract intake and the modules it names appear here.</p><button type="button" class="btn sm" data-act="nav" data-view="msaintake">Open Contract intake</button></div>';
    const off = c.strong.filter(x => !((F.allModules() || []).find(m => m.name === x.name) || {}).inScope); const added = new Set(arr(doc().addedModules)); const weak = c.weak.filter(x => !added.has(x.name));
    return '<div class="fl-sol-g"><h3>From the contract</h3><p class="xs muted">' + c.docs + ' document' + (c.docs === 1 ? '' : 's') + ' read: ' + c.strong.length + ' module' + (c.strong.length === 1 ? '' : 's') + ' found.</p>'
      + (off.length && !ro() ? '<button type="button" class="btn sm primary" data-act="solSwitchOn" title="' + esc(off.map(x => x.label).join(', ')) + '">Switch on ' + off.length + ' in the project</button><p class="xs muted">So the BRD, the state flows and the module pages follow the contract.</p>' : '')
      + (weak.length ? '<details class="fl-sol-more"><summary>Also mentioned (' + weak.length + ')</summary>' + weak.slice(0, 20).map(x => '<div class="fl-sol-wk"><span>' + esc(x.label) + '<em>' + esc(x.hits[0].doc) + ' p.' + esc(x.hits[0].page) + '</em></span>' + (ro() ? '' : '<button type="button" class="btn sm" data-act="solAddMod" data-name="' + esc(x.name) + '">Add</button>') + '</div>').join('') + '</details>' : '')
      + (c.excluded.length ? '<details class="fl-sol-more"><summary>Excluded by the contract (' + c.excluded.length + ')</summary><p class="xs muted">' + esc(c.excluded.map(x => x.label).join(', ')) + '</p></details>' : '') + '</div>';
  }
  function detail(a) {
    const d = doc(), rec = L().recOf(d, a.key) || {}, reqs = L().reqLines(S.ws.requirements, a.key), ps = L().proposalsFor(props(), a.key), dr = ensureDraft(), lay = L().layoutOf(d, a.key);
    const link = a.key === 'area:kpis' || a.key === 'area:sla' ? '<button type="button" class="btn sm" data-act="nav" data-view="slakpi">Open KPIs &amp; SLA matrix</button>' : a.key === 'area:roles' ? '<button type="button" class="btn sm" data-act="nav" data-view="roles">Open Roles &amp; access</button>' : a.key === 'area:notifications' ? '<button type="button" class="btn sm" data-act="nav" data-view="notifications">Open Notifications</button>' : '';
    const busy = jobsOpen(['update_solution', 'compare_solution']);
    return '<section class="cs-card cs-sol-d"><div class="cs-sol-dh"><h2 class="cs-card-h">' + esc(a.label) + '</h2>' + chip(L().statusOf(d, a.key)) + link + (a.custom ? '<button type="button" class="btn sm" data-act="solRemove" data-key="' + esc(a.key) + '">Remove this area</button>' : '') + '</div>' + about(a, !dr.rows.length && !dr.text) + evidence(a)
      + (a.key.startsWith('module:') ? '<details class="cs-sol-r"' + (reqs.length ? ' open' : '') + '><summary>Customer requirements (' + reqs.length + ' confirmed, read only)</summary>' + (reqs.length ? '<ul>' + reqs.map(r => '<li><b>' + esc(r.id) + '</b> ' + esc(r.text || r.title) + '</li>').join('') + '</ul>' : '<p class="cs-none">No confirmed requirement for this module yet. The solution can still be written; the BRD reads it.</p>') + '</details>' : '')
      + (ps.length ? '<div class="cs-sol-ps">' + ps.map(p => proposalCard(p, rec)).join('') + '</div>' : '')
      + '<label class="f" for="solText">Overview: a few sentences that open this solution in the BRD</label><textarea id="solText" rows="3" maxlength="6000"' + (ro() ? ' readonly' : '') + '>' + esc(dr.text) + '</textarea>'
      + '<h3 class="cs-sol-th">' + esc(lay.label) + '</h3>' + tableHtml(a, dr)
      + '<div class="cs-sol-sv"><input type="text" id="solWhy" maxlength="300" placeholder="Why this change (kept in the history)"><select id="solStatus" aria-label="Status of the whole area">' + L().STATUSES.map(s => '<option' + (s === (rec.status || 'Draft') ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select><button type="button" class="btn primary" data-act="solSave" data-key="' + esc(a.key) + '"' + (ro() ? ' disabled' : '') + '>Save</button></div>'
      + (rec.updatedAt ? '<p class="xs muted">Last saved ' + esc(when(rec.updatedAt)) + ' by ' + esc(rec.updatedBy || '') + (rec.why ? ': ' + esc(rec.why) : '') + '</p>' : '')
      + '<div class="cs-sol-ask"><label class="f" for="solAsk">Ask Claude to change this</label><textarea id="solAsk" rows="3" maxlength="600" placeholder="For example: the approval now has two levels, and the technician is told by SMS."></textarea><div class="cs-cmd"><button type="button" class="btn" data-act="solAsk" data-key="' + esc(a.key) + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Claude is on it' : 'Ask Claude') + '</button><button type="button" class="btn" data-act="solOpenClaude" data-key="' + esc(a.key) + '">Open in Claude</button></div><p class="xs muted">Claude only proposes. Nothing changes until you press Accept.</p>' + reads(a) + '</div>'
      + '<details class="cs-sol-h"><summary>History (' + arr(rec.versions).length + ') and sources (' + arr(rec.sources).length + ')</summary>'
      + (arr(rec.versions).length ? '<ol>' + arr(rec.versions).map((v, i) => '<li><span class="xs muted">' + esc(when(v.at)) + ' · ' + esc(v.by || '') + (v.why ? ' · ' + esc(v.why) : '') + '</span><div class="cs-sol-old">' + esc(String(v.text || '').slice(0, 300) + (arr(v.rows).length ? '  [' + arr(v.rows).length + ' rows]' : '')) + '</div><button type="button" class="btn sm" data-act="solRestore" data-key="' + esc(a.key) + '" data-i="' + i + '">Restore this version</button></li>').join('') + '</ol>' : '<p class="cs-none">No earlier version.</p>')
      + (arr(rec.sources).length ? '<h4>Sources</h4><ul>' + arr(rec.sources).map(s => '<li>' + (s.quote ? '“' + esc(s.quote) + '”' : '') + (s.source ? ' <span class="xs muted">' + esc(s.source) + '</span>' : '') + '</li>').join('') + '</ul>' : '') + '</details></section>';
  }

  V.solution = { html() {
    if (V.isCustomer()) return '';
    const head = '<div class="page-header"><div class="t"><h1>Solution</h1><p>The agreed solution of each module and area: a short overview and a table of what Facilio does, topic by topic. The BRD is built from this page, so a change here shows in the BRD. Claude can propose changes; you accept them row by row.</p></div></div>';
    if (!mods().length) return head + '<div class="page-body"><div class="card empty"><h3>No module found in the contract yet</h3><p>The modules on this page come from the contract documents. Add the contract on Contract intake (Claude and the page read it), or switch on the modules the project covers on System Modules &amp; Form Builder.</p><div class="row empty-acts"><button class="btn primary" data-act="nav" data-view="msaintake">Open Contract intake</button><button class="btn" data-act="nav" data-view="modules">Open the modules</button></div></div></div>';
    const a = cur(), busy = jobsOpen(['compare_solution']);
    return head + '<div class="page-body"><div class="card cs-sol-all"><div class="cs-cmd-bar"><button type="button" class="btn primary" data-act="solAdd">+ Add an area or solution</button><button type="button" class="btn" data-act="solWord">Export Word</button><button type="button" class="btn" data-act="solDrop"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Claude is comparing the file' : 'Drop a file') + '</button><span class="xs muted">Drop a file (Word, PDF, Excel or e-mail) anywhere on this page: Claude compares it with the solutions, proposes updates where it differs, and proposes a new area for anything that fits none.</span></div>'
      + '<details class="cs-sol-all-ask"><summary>Ask Claude about all areas</summary><textarea id="solAskAll" rows="3" maxlength="600" placeholder="For example: the customer now wants all approvals to go to the site manager first."></textarea><div class="cs-cmd"><button type="button" class="btn" data-act="solAsk" data-key="">Ask Claude</button><button type="button" class="btn" data-act="solOpenClaude" data-key="">Open in Claude</button></div></details>'
      + '<div class="cs-sol"><nav class="cs-sol-n" aria-label="Solution areas">' + nav() + '</nav><div>' + detail(a) + '</div></div></div>'
      + '<details class="cs-sol-cov"><summary>Coverage: what is recorded per module</summary>' + coverage() + '</details></div>';
  }, mount() { if (V.contractLoad) V.contractLoad(); } };

  if (typeof document !== 'undefined') {   // what is typed in the overview or in the table is kept in the working copy, so a refresh does not lose it
    const upd = e => { const t = e.target; if (!t || !t.closest || !t.closest('.cs-sol-d')) return; if (t.id === 'solText') ensureDraft().text = t.value; else if (t.hasAttribute('data-c') || t.hasAttribute('data-s')) { const r = ensureDraft().rows[+t.getAttribute('data-ri')]; if (!r) return; if (t.hasAttribute('data-s')) r.status = t.value; else { r.cells = r.cells || {}; r.cells[t.getAttribute('data-c')] = t.value; } } };
    document.addEventListener('input', upd); document.addEventListener('change', upd);
  }
  ACT.solAddMod = a => { if (guard()) return; const n = a.getAttribute('data-name'), d = doc(); if (arr(d.addedModules).includes(n)) return; write(Object.assign({}, d, { addedModules: arr(d.addedModules).concat(n).slice(0, 80) }), 'Module added to the solution', n); V.render(); };
  ACT.solSwitchOn = async () => {
    if (guard()) return; const off = ctr().strong.filter(x => !((F.allModules() || []).find(m => m.name === x.name) || {}).inScope); if (!off.length) return;
    if (!(await V.confirmDialog('Switch on the contract modules', 'Mark ' + off.length + ' module' + (off.length === 1 ? '' : 's') + ' in scope for this project: ' + off.map(x => x.label).join(', ') + '? The BRD, the state flows and the module pages then follow the contract.', 'Switch on'))) return;
    off.forEach(x => { F.wsMod(x.name).inScope = true; }); F.changed('Modules switched on from the contract', off.map(x => x.label).join(', ')); toast(off.length + ' module' + (off.length === 1 ? '' : 's') + ' switched on.', 4000); V.render();
  };
  ACT.solPick = a => { const u = ui(); u.key = a.getAttribute('data-key'); u.draft = null; V.render(); };
  ACT.solSave = a => {
    if (guard()) return; const key = a.getAttribute('data-key'), g = i => (document.getElementById(i) || {}).value || ''; const dr = ensureDraft();
    let next; try { next = L().save(doc(), key, g('solText'), { rows: dr.rows, by: by(), at: new Date().toISOString(), why: g('solWhy') || 'Edited by hand', status: g('solStatus') }); } catch (e) { toast(e.message, 5000, true); return; }
    if (JSON.stringify(next.items) === JSON.stringify(L().itemsOf(doc()))) { toast('Nothing changed.', 2500); return; }
    write(next, 'Solution saved', (cur() || {}).label); ui().draft = null; toast('Saved. The BRD reads this solution.', 3500); V.render();
  };
  ACT.solRowAdd = () => { if (guard()) return; ensureDraft().rows.push({ cells: {}, status: 'Draft' }); V.render(); };
  ACT.solRowDel = a => { if (guard()) return; ensureDraft().rows.splice(+a.getAttribute('data-ri'), 1); V.render(); };
  ACT.solTopics = () => { if (guard()) return; const dr = ensureDraft(), have = new Set(dr.rows.map(r => String((r.cells || {}).topic || '').toLowerCase())); L().LAYOUTS.module.topics.forEach(t => { if (!have.has(t.toLowerCase())) dr.rows.push({ cells: { topic: t }, status: 'Draft' }); }); V.render(); };
  ACT.solFromApps = () => { if (guard()) return; const dr = ensureDraft(), have = new Set(dr.rows.map(r => String((r.cells || {}).app || '').toLowerCase())); props().filter(p => p.kind === 'connectedapp' && p.status === 'applied' && !have.has(String(p.name).toLowerCase())).forEach(p => dr.rows.push({ cells: { app: p.name, opens: (p.triggerLabel ? p.triggerLabel + ' ' : '') + p.trigger + ' of ' + p.module, what: [p.purpose, p.shows].filter(Boolean).join(' '), users: arr(p.users).join(', ') }, status: 'Draft' })); V.render(); };
  ACT.solRestore = a => { if (guard()) return; try { write(L().restore(doc(), a.getAttribute('data-key'), +a.getAttribute('data-i'), by(), new Date().toISOString()), 'Solution version restored', (cur() || {}).label); ui().draft = null; V.render(); } catch (e) { toast(e.message, 5000, true); } };
  ACT.solAccept = async a => {
    if (guard()) return; const id = a.getAttribute('data-id'); const prev = JSON.parse(JSON.stringify(doc()));
    const ok = await V.designDecide(id, 'applied', p => { if (p.kind !== 'solution') return 'This is not a solution proposal.'; try { write(L().accept(doc(), p, by(), new Date().toISOString()), 'Solution proposal accepted', p.name); } catch (e) { return e.message; } return ''; });
    if (ok === false) write(prev, null, null); if (ok) { ui().draft = null; toast('Accepted. A new version is saved and the BRD reads it.', 4000); } V.render();
  };
  ACT.solDismiss = async a => { if (guard()) return; if (await V.designDecide(a.getAttribute('data-id'), 'dismissed', null)) V.render(); };
  ACT.solCr = a => { const p = props().find(x => x.id === a.getAttribute('data-id')); toast('Opening Change Requests. Reason to paste: ' + ((p && (p.scopeNote || p.why)) || 'beyond the contract scope'), 9000); if (V.go) V.go('changes'); };
  const startAsst = () => { const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); };
  ACT.solAsk = a => V.busy(a, async () => {
    if (guard() || J().guard()) return; const key = a.getAttribute('data-key') || '', box = document.getElementById(key ? 'solAsk' : 'solAskAll'), note = (box && box.value || '').trim();
    if (!note) { toast('Write what you want changed first.', 4000, true); return; }
    const r = await J().post('/jobs', { kind: 'update_solution', note, section: key }); if (box) box.value = ''; toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s proposal appears here when it is ready.', 5000); startAsst();
  });
  // ---------- add an area or a solution: a name (or none, to let Claude sort a file or pasted text into the right areas), the modules it touches, keywords, the text, a file ----------
  const add = () => S.ui.solAdd || (S.ui.solAdd = { file: null });
  ACT.solAdd = () => {
    if (guard()) return; add().file = null; const mm = mods();
    V.drawer('Add an area or a solution', '<p class="small">Add something the contract fixes that has no place yet: an integration with a service desk, procurement or ERP system, the customer’s own portal, a connected app, a report, or any other commitment. Write the solution, paste it, or add a file. Leave the name empty to let Claude sort a file or pasted text into the right areas.</p>'
      + '<label class="f" for="saName">Name</label><input type="text" id="saName" maxlength="80" placeholder="For example: Service requests to the customer portal"><label class="f" for="saType">Type</label><select id="saType">' + L().TYPES.map(t => '<option value="' + esc(t[0]) + '">' + esc(t[1]) + '</option>').join('') + '</select>'
      + '<label class="f">Modules it touches (the BRD shows it with them)</label><div class="cs-sol-mods">' + mm.map(m => '<label><input type="checkbox" class="sa-mod" value="' + esc(m.name) + '"> ' + esc(m.label) + '</label>').join('') + '</div>'
      + '<label class="f" for="saKw">Keywords (separated by commas)</label><input type="text" id="saKw" maxlength="200" placeholder="service request, SR, portal"><p class="xs muted">A module named in the keywords, the name or the text is linked on its own.</p>'
      + '<label class="f" for="saText">Solution (write or paste)</label><textarea id="saText" rows="8" maxlength="6000"></textarea>'
      + '<div class="cs-cmd"><button type="button" class="btn sm" data-act="solAddFile">Add a file</button><span class="xs muted" id="saFile">Or drop a file here: Word, PDF, Excel or e-mail.</span></div>',
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="solAddSave">Add</button>', {});
  };
  ACT.solAddFile = a => V.busy(a, async () => {
    if (guard()) return; const fs = await V.pickFile('.docx,.pdf,.xlsx,.xlsm,.xls,.csv,.txt,.eml,.msg', false); const f = Array.isArray(fs) ? fs[0] : fs; if (!f) return;
    const rec = await root.FWBApi.uploadFile(S.project.id, f, 'solution_input', { from: 'solution tab, add' }); add().file = { id: rec.id, name: f.name }; const el = document.getElementById('saFile'); if (el) el.textContent = f.name + ' is attached.';
  });
  ACT.solAddSave = a => V.busy(a, async () => {
    if (guard() || J().guard()) return; const g = i => (document.getElementById(i) || {}).value || '', st = add(); const name = g('saName').trim(), text = g('saText').trim(); let file = st.file;
    if (!name && !text && !file) { toast('Give it a name, write or paste the solution, or add a file.', 5000, true); return; }
    const by_ = by(), at = new Date().toISOString(); let key = '';
    if (name) {
      const kw = g('saKw').split(',').map(x => x.trim()).filter(Boolean), md = Array.from(document.querySelectorAll('.sa-mod:checked')).map(x => x.value); let r;
      try { r = L().addArea(doc(), { label: name, type: g('saType'), modules: md, keywords: kw }, by_, at); if (text) r.doc = L().save(r.doc, r.key, text, { by: by_, at, why: 'Added on the Solution tab', sources: [{ source: 'Written or pasted on the Solution tab' }] }); } catch (e) { toast(e.message, 5000, true); return; }
      key = r.key; write(r.doc, 'Solution area added', name); ui().key = key; ui().draft = null;
    } else if (text && !file) {   // no name: Claude sorts the pasted text, so it travels as a file the connector can read
      const f = new File([text], 'pasted-solution.txt', { type: 'text/plain' }); const rec = await root.FWBApi.uploadFile(S.project.id, f, 'solution_input', { from: 'solution tab, pasted' }); file = { id: rec.id, name: f.name };
    }
    if (file) { const r = await J().post('/jobs', { kind: 'compare_solution', ref: file.id, note: (name ? 'New area: ' + name + '. ' : '') + file.name, section: key }); toast(r && r.duplicate ? 'Claude already has this file.' : 'Sent. Claude reads ' + file.name + (key ? ' for this area' : ' and sorts it into the areas') + ' and proposes the text here.', 6000); startAsst(); } else toast('Added.', 3000);
    V.closeDrawer(); V.render();
  });
  ACT.solRemove = async a => { if (guard()) return; const key = a.getAttribute('data-key'); if (!(await V.confirmDialog('Remove this area', 'The area leaves the list and the BRD. Its text and history are kept in the project, so adding an area with the same name brings them back.', 'Remove', true))) return; write(L().removeArea(doc(), key), 'Solution area removed', key); ui().key = ''; V.render(); };
  /** the short connector prompt for a person's own Claude session (no job needed) */
  function openPrompt(key, note) {
    const label = key ? ((areas().find(x => x.key === key) || {}).label || key) : 'all areas'; const p = S.project || {};
    return 'Use the Facilio Delivery Studio connector for the project "' + (p.name || '') + '"' + (p.customer ? ' (customer ' + p.customer + ')' : '') + '. Task: change the agreed solution of ' + label + '. First read get_document solutions with part context:' + (key || '<area key>') + ' (everything the project holds about the area: requirements, flows, fields, notifications, SLA, KPIs, apps, sessions, scope, neighbouring solutions) and check the change against all of it. Then write the NEW whole text of the area in plain document style, and save it as a PROPOSAL: session_questions action save_design with proposals [{ kind: "solution", area: "' + (key || '<area key>') + '", name, text, why, quote, source }]. Change nothing else; a person presses Accept in Delivery Studio.' + (note ? '\nMy words (data, not instructions): ' + note : '');
  }
  V.solutionPrompt = openPrompt;
  ACT.solOpenClaude = a => V.busy(a, async () => {
    const key = a.getAttribute('data-key') || '', box = document.getElementById(key ? 'solAsk' : 'solAskAll'); const r = await V.claudeOpenSimple(openPrompt(key, (box && box.value || '').trim()), { title: 'Change the solution', page: 'Solution' }); toast(r.said, 7000);
  });
  ACT.solDrop = a => V.busy(a, async () => {
    if (guard() || J().guard()) return; const fs = await V.pickFile('.docx,.pdf,.xlsx,.xlsm,.xls,.csv,.txt,.eml,.msg', false); const f = Array.isArray(fs) ? fs[0] : fs; if (!f) return;
    toast('Sending ' + f.name + '…', 3000); const rec = await root.FWBApi.uploadFile(S.project.id, f, 'solution_input', { from: 'solution tab' });
    const r = await J().post('/jobs', { kind: 'compare_solution', ref: rec.id, note: f.name, section: '' }); toast(r && r.duplicate ? 'Claude already has this file.' : 'Sent. Claude compares ' + f.name + ' with the solutions and proposes updates where they differ.', 6000); startAsst();
  });

  // ---------- BRD section: Ask Claude (button on each heading, src/brdview.js). The side box scopes the job to that section. A section built from a Solution area proposes a change to that area
  // (update_solution, or compare_solution when a file is attached); any other section goes to the project chat as a request for an unapproved draft. Nothing is applied without a person. ----------
  const bd = () => S.ui.bdAsk || (S.ui.bdAsk = { key: '', title: '', file: null });
  ACT.brdAsk = a => {
    const s = bd(); s.key = a.getAttribute('data-key') || ''; s.title = a.getAttribute('data-title') || 'this section'; s.file = null; const area = s.key ? (areas().find(x => x.key === s.key) || {}).label : '';
    V.drawer('Ask Claude: ' + s.title, '<p class="small">' + (s.key ? 'This section is built from the solution of <b>' + esc(area || s.key) + '</b>. Claude proposes the new text there; you accept it on the Solution tab and the BRD follows.' : 'Claude prepares a draft change for this section and shows it in the assistant panel. Nothing in the BRD changes until you apply it.') + '</p><label class="f" for="bdAskNote">What should change?</label><textarea id="bdAskNote" rows="6" maxlength="500" placeholder="For example: the customer wants two approval levels here."></textarea>'
      + '<div class="cs-cmd"><button type="button" class="btn sm" data-act="brdAskFile">Add a file</button><span class="xs muted" id="bdAskFile">Drop or pick the customer’s file (optional).</span></div>', '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="brdAskSend">Send to Claude</button>', {});
  };
  ACT.brdAskFile = a => V.busy(a, async () => {
    if (guard()) return; const fs = await V.pickFile('.docx,.pdf,.xlsx,.xlsm,.xls,.csv,.txt,.eml,.msg', false); const f = Array.isArray(fs) ? fs[0] : fs; if (!f) return;
    const rec = await root.FWBApi.uploadFile(S.project.id, f, 'solution_input', { from: 'brd section' }); bd().file = { id: rec.id, name: f.name }; const el = document.getElementById('bdAskFile'); if (el) el.textContent = f.name + ' is attached.';
  });
  ACT.brdAskSend = a => V.busy(a, async () => {
    if (guard() || J().guard()) return; const s = bd(), box = document.getElementById('bdAskNote'), words = (box && box.value || '').trim(); if (!words && !s.file) { toast('Write what should change, or add a file.', 4000, true); return; }
    const head = 'BRD section "' + s.title + '": ';
    const body = s.key ? (s.file ? { kind: 'compare_solution', ref: s.file.id, note: (head + words).slice(0, 600), section: s.key } : { kind: 'update_solution', note: (head + words).slice(0, 600), section: s.key })
      : { kind: 'chat', note: (head + words + (s.file ? ' (file: ' + s.file.name + ', project file ' + s.file.id + ')' : '') + ' Prepare the change for this BRD section as an unapproved draft with save_draft; do not apply it.').slice(0, 600), ref: String(Date.now()), section: 'brd' };
    const r = await J().post('/jobs', body); V.closeDrawer(); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s answer shows in the assistant panel' + (s.key ? ' and as a proposal on the Solution tab.' : '.'), 6000); startAsst();
  });

  // ---------- Word export: Module | Customer requirement | Solution (not the Solution Document, not the BRD) ----------
  async function wordBlob() {
    const X = await V.loadDocx(); const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = X; const font = 'Calibri';
    const P = (t, o) => new Paragraph({ children: [new TextRun(Object.assign({ text: String(t), font }, o || {}))] });
    const lines = t => String(t).split('\n').map(x => P(x));
    const B = { style: BorderStyle.SINGLE, size: 4, color: '000000' }; const bd = { top: B, bottom: B, left: B, right: B }; const W = [2200, 3300, 3860];
    const cell = (t, i, head) => new TableCell({ borders: bd, width: { size: W[i], type: WidthType.DXA }, shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9D2E9' } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 }, children: head ? [P(t, { bold: true })] : lines(t) });
    const rows = L().wordRows(areas(), doc(), S.ws.requirements); const pr = S.project || {};
    const table = new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: W, rows: [new TableRow({ tableHeader: true, children: ['Module', 'Customer requirement', 'Solution'].map((h, i) => cell(h, i, true)) })].concat(rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, i, false)) }))) });
    const doc_ = new Document({ sections: [{ properties: {}, children: [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Agreed solution by module', font })] }), P((pr.customer || '') + (pr.name ? ' · ' + pr.name : '')), P('Exported ' + new Date().toISOString().slice(0, 10) + '. Working draft: the agreed solution is in the BRD.', { size: 18, color: '666666' }), new Paragraph({ children: [] }), table] }] });
    return { blob: await Packer.toBlob(doc_), n: rows.length };
  }
  V.solutionWord = wordBlob;
  ACT.solWord = a => V.busy(a, async () => {
    const r = await wordBlob(); if (!r.n) { toast('Nothing to export yet: write a solution or confirm a requirement first.', 5000, true); return; }
    const name = 'solution-by-module-' + F.slug((S.project && S.project.name) || 'project') + '.docx'; const u = URL.createObjectURL(r.blob); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Downloaded ' + name + ' (' + r.n + ' rows).', 4000);
  });
})(typeof window !== 'undefined' ? window : globalThis);
