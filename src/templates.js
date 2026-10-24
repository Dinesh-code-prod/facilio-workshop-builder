/* Templates (organisation-wide and per project, versioned, publish / retire) and the configurable workspace
   (rename, reorder, hide, move menu items, add custom pages, layout presets). Both are stored on the server:
   templates in their own collection, the workspace layout as a project document section. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const KIND = { workspace: 'Workspace layout', ftr: 'FTR workbook', kpi: 'KPI definitions', brd: 'BRD structure', uat: 'UAT plan', guide: 'User guide', golive: 'Go-live review', hypercare: 'Hypercare report', handover: 'Handover pack', closure: 'Closure report', wsr: 'Weekly status report', monthly: 'Monthly report', other: 'Other document' };
  const TEXT = ['brd', 'uat', 'guide', 'golive', 'hypercare', 'handover', 'closure', 'wsr', 'monthly', 'other'];
  const SKEL = {
    brd: '# 1. Purpose and background\n# 2. Scope (in / out)\n# 3. Business processes and requirements\n# 4. Roles and permissions\n# 5. Integrations and data migration\n# 6. Assumptions, risks and open points\n# 7. Sign-off',
    uat: '# 1. Objectives and scope\n# 2. Entry criteria\n# 3. Test scenarios by module\n# 4. Roles and test data\n# 5. Defect handling\n# 6. Exit criteria and sign-off',
    guide: '# 1. Introduction\n# 2. Getting started\n# 3. Module guides (steps, screens, tips)\n# 4. Roles and what each can do\n# 5. Frequently asked questions',
    golive: '# 1. Readiness summary\n# 2. Configuration and data checks\n# 3. UAT and defect status\n# 4. Training and communication\n# 5. Cut-over plan\n# 6. Risks and rollback\n# 7. Go / no-go decision',
    hypercare: '# 1. Period and contacts\n# 2. Issues raised and status\n# 3. Fixes and changes\n# 4. Open items\n# 5. Exit criteria',
    handover: '# 1. Delivered scope\n# 2. Configuration summary\n# 3. Known issues\n# 4. Support model and contacts\n# 5. Documents and access\n# 6. Acceptance',
    closure: '# 1. Objectives and outcome\n# 2. Delivered versus planned\n# 3. Lessons learned\n# 4. Open items and ownership\n# 5. Customer feedback',
    wsr: '# Progress this week\n# Planned next week\n# Risks and issues\n# Decisions needed\n# Dependencies',
    monthly: '# Summary\n# Milestones\n# Progress by workstream\n# Risks, issues and changes\n# Next month', other: '# Section 1\n# Section 2'
  };
  const T = { items: [], loaded: false, loading: false, isAdmin: false, filter: '', scope: '' };
  const pid = () => S.project && S.project.id;
  const when = d => d ? V.fmtDate(d) : '—';
  async function load(force) {
    if (T.loading || (T.loaded && !force)) return; T.loading = true;
    try { const r = await API.get('/api/templates?projectId=' + encodeURIComponent(pid() || '')); T.items = r.items || []; T.isAdmin = !!r.isAdmin; T.loaded = true; } catch (e) { toast(e.message || 'Could not load templates', 5000, true); T.loaded = true; } finally { T.loading = false; }
    V.render();
  }
  V.tplList = async kind => { await load(); return T.items.filter(t => t.kind === kind && t.status === 'published'); };
  const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const stTag = s => tag(s === 'published' ? 'green' : s === 'retired' ? 'red' : 'tbc', s === 'published' ? 'Published' : s === 'retired' ? 'Retired' : 'Draft');
  const byId = id => T.items.find(t => t.id === id);

  // ---------- Templates view ----------
  V.templates = {
    html() {
      if (!T.loaded) { load(); return `<div class="page-header"><div class="t"><h1>Templates</h1></div></div><div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>`; }
      const can = canEdit(); const list = T.items.filter(t => (!T.filter || t.kind === T.filter) && (!T.scope || t.scope === T.scope));
      const kinds = Object.keys(KIND);
      return `<div class="page-header"><div class="t"><h1>Templates</h1><p>Reusable structures for deliverables, workbooks and the workspace. Organisation templates are published by an Admin for every project; project templates stay in this project. Every change is a new version and the published version is what people get.</p></div><div class="row">${can ? `<button class="btn primary" data-act="tplNew">${ico('plus')}New template</button>` : ''}</div></div>
      <div class="page-body"><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><select data-change="tplFilter" style="width:auto"><option value="">All types</option>${kinds.map(k => `<option value="${k}"${T.filter === k ? ' selected' : ''}>${esc(KIND[k])}</option>`).join('')}</select><select data-change="tplScope" style="width:auto"><option value="">All scopes</option><option value="org"${T.scope === 'org' ? ' selected' : ''}>Organisation</option><option value="project"${T.scope === 'project' ? ' selected' : ''}>This project</option></select><span class="small muted" style="align-self:center">${list.length} template${list.length === 1 ? '' : 's'}</span></div>
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Template</th><th>Type</th><th>Scope</th><th>Status</th><th>Version</th><th>Updated</th><th></th></tr></thead><tbody>${list.map(t => `<tr><td><b>${esc(t.name)}</b><div class="xs muted">${esc(t.desc || '')}</div></td><td>${esc(KIND[t.kind] || t.kind)}</td><td>${t.scope === 'org' ? 'Organisation' : 'This project'}</td><td>${stTag(t.status)}</td><td>${t.pub ? 'v' + t.pub + ' live' : '—'}${t.latest !== t.pub ? `<div class="xs muted">v${t.latest} latest</div>` : ''}</td><td class="small">${esc(when(t.ua))}<div class="xs muted">${esc(t.by || '')}</div></td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="tplOpen" data-id="${esc(t.id)}">Open</button>${can && t.status !== 'retired' ? `<button class="btn sm primary" data-act="tplUse" data-id="${esc(t.id)}">Use</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7" class="muted" style="padding:18px">No templates yet. Create one from this project's current work (workspace layout, FTR workbook, KPI definitions) or write a document structure.</td></tr>`}</tbody></table></div></div></div>`;
    }
  };
  ACT.tplFilter = el => { T.filter = el.value; V.render(); }; ACT.tplScope = el => { T.scope = el.value; V.render(); };

  // ---------- create ----------
  ACT.tplNew = a => {
    const pre = (a && a.getAttribute && a.getAttribute('data-kind')) || 'brd';
    drawer('New template', `<label class="f">Name</label><input type="text" id="tp_n" maxlength="120" placeholder="e.g. Standard BRD for CAFM projects">
      <div class="fgrid"><div><label class="f">Type</label><select id="tp_k" data-change="tplKind">${Object.keys(KIND).map(k => `<option value="${k}"${k === pre ? ' selected' : ''}>${esc(KIND[k])}</option>`).join('')}</select></div><div><label class="f">Available to</label><select id="tp_s"><option value="project">This project only</option><option value="org">Whole organisation (an Admin publishes it)</option></select></div></div>
      <label class="f">Description</label><input type="text" id="tp_d" maxlength="500" placeholder="When to use it">
      <div id="tp_body">${bodyField(pre, '')}</div>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tplCreate">Save as draft</button>`, { wide: true });
  };
  function bodyField(kind, cur) {
    if (kind === 'workspace') return `<div class="notice"><span>Captures this project's current menu layout: hidden items, names, order and custom pages.</span></div>`;
    if (kind === 'kpi') return `<div class="notice"><span>Captures the ${I().list('kpi').length} KPI definition(s) in this project.</span></div>`;
    if (kind === 'ftr') return `<div class="notice"><span>Captures this project's current FTR workbook, or choose another .xlsx below. Up to 3 MB.</span></div><input type="file" id="tp_f" accept=".xlsx,.xlsm">`;
    return `<label class="f">Structure (one heading per line, optional notes under each). The AI follows this order and these headings.</label><textarea id="tp_t" rows="14" style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(cur || SKEL[kind] || '')}</textarea>`;
  }
  ACT.tplKind = el => { const b = document.getElementById('tp_body'); if (b) b.innerHTML = bodyField(el.value, ''); };
  async function capture(kind, drawerEdit) {
    if (kind === 'workspace') { const w = ws(); return { workspace: JSON.parse(JSON.stringify(w)) }; }
    if (kind === 'kpi') { return { kpis: I().list('kpi').map(k => { const o = {}; Object.keys(k).forEach(x => { if (x[0] !== '_' && x !== 'id') o[x] = k[x]; }); return o; }) }; }
    if (kind === 'ftr') {
      let f = (document.getElementById('tp_f') || {}).files; f = f && f[0]; let buf, name;
      if (f) { buf = await f.arrayBuffer(); name = f.name; } else { const c = V.ftrCurrent && V.ftrCurrent(); if (!c) throw new Error('This project has no FTR workbook yet. Choose a file instead.'); const r = await API.downloadFile(pid(), c.fileId); buf = await r.blob.arrayBuffer(); name = c.name; }
      if (buf.byteLength > 3 * 1048576) throw new Error('The workbook is over 3 MB. Remove images or data rows and try again.'); return { name, b64: b64(buf) };
    }
    return { body: (document.getElementById('tp_t') || {}).value || '' };
  }
  ACT.tplCreate = a => V.busy(a, async () => {
    const g = i => (document.getElementById(i) || {}).value || ''; const name = g('tp_n').trim(); if (!name) { toast('Enter a name'); return; }
    try { const kind = g('tp_k'); const data = await capture(kind); if (kind === 'brd' || TEXT.includes(kind)) { if (!String(data.body).trim()) { toast('Add the structure'); return; } }
      await API.post('/api/templates', { name, kind, scope: g('tp_s'), projectId: pid(), desc: g('tp_d'), data, note: 'First version' }); closeDrawer(); T.loaded = false; toast('Template saved as a draft'); await load(true);
    } catch (e) { toast(e.message || 'Could not save', 6000, true); }
  });

  // ---------- open / version / publish ----------
  ACT.tplOpen = a => V.busy(a, async () => {
    const id = a.getAttribute('data-id'); const t = byId(id); if (!t) return; const v = Number(a.getAttribute('data-v')) || t.pub || t.latest;
    let r; try { r = await API.get(`/api/templates/${id}?v=${v}`); } catch (e) { toast(e.message, 5000, true); return; }
    const can = canEdit() && (t.scope === 'project' || t.createdBy === (S.user && S.user.id) || T.isAdmin); const d = r.data || {}; const isText = TEXT.includes(t.kind);
    const preview = isText ? `<label class="f">Structure${can ? ' (editing creates a new version)' : ''}</label><textarea id="tp_t" rows="14" ${can ? '' : 'readonly'} style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(d.body || '')}</textarea>`
      : t.kind === 'workspace' ? `<div class="small">Hidden items: <b>${((d.workspace || {}).hidden || []).length}</b> · custom pages: <b>${((d.workspace || {}).custom || []).length}</b> · renamed: <b>${Object.keys((d.workspace || {}).labels || {}).length}</b></div>`
        : t.kind === 'kpi' ? `<div class="small"><b>${(d.kpis || []).length}</b> KPI definitions: ${(d.kpis || []).slice(0, 12).map(k => esc(k.name)).join(', ')}</div>` : `<div class="small">Workbook <b>${esc(d.name || '')}</b>. Use it to start a new FTR version in a project.</div>`;
    drawer(t.name, `<div class="row" style="gap:8px;margin-bottom:8px">${stTag(t.status)}<span class="small muted">${esc(KIND[t.kind])} · ${t.scope === 'org' ? 'Organisation' : 'Project'} · showing v${r.v}${t.pub ? ' · v' + t.pub + ' is live' : ''}</span></div>${t.desc ? `<p class="small">${esc(t.desc)}</p>` : ''}${preview}
      <label class="f">Versions</label><div class="small">${(t.versions || []).slice().reverse().map(x => `<div><a href="#" data-act="tplOpen" data-id="${esc(t.id)}" data-v="${x.v}">v${x.v}</a> · ${esc(when(x.at))} · ${esc(x.by)}${x.note ? ' · ' + esc(x.note) : ''}${x.v === t.pub ? ' ' + tag('green', 'live') : ''}</div>`).join('')}</div>`,
      `${can && !t.pub ? `<button class="btn danger" data-act="tplDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span>${can && isText ? `<button class="btn" data-act="tplSaveVer" data-id="${esc(id)}">Save as new version</button>` : ''}${can && t.status !== 'retired' ? `<button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="publish" data-v="${r.v}" ${t.scope === 'org' && !T.isAdmin ? 'disabled title="Only an Admin can publish an organisation template"' : ''}>Publish v${r.v}</button><button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="retire">Retire</button>` : ''}${can && t.status === 'retired' ? `<button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="reopen">Reopen</button>` : ''}`, { wide: true });
  });
  ACT.tplSaveVer = a => V.busy(a, async () => { try { await API.post(`/api/templates/${a.getAttribute('data-id')}/versions`, { data: { body: document.getElementById('tp_t').value }, note: 'Edited' }); closeDrawer(); toast('New version saved'); await load(true); } catch (e) { toast(e.message, 5000, true); } });
  ACT.tplStatus = a => V.busy(a, async () => {
    const act = a.getAttribute('data-a'); if (act === 'retire' && !(await confirmDialog('Retire template', 'People will no longer be able to use it. Existing documents are not changed.', 'Retire', true))) return;
    try { await API.post(`/api/templates/${a.getAttribute('data-id')}/status`, { action: act, v: Number(a.getAttribute('data-v')) || undefined }); closeDrawer(); toast(act === 'publish' ? 'Published' : act === 'retire' ? 'Retired' : 'Reopened'); await load(true); } catch (e) { toast(e.message, 6000, true); }
  });
  ACT.tplDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete template', 'Delete this unpublished template and its versions?', 'Delete', true))) return; try { await API.del('/api/templates/' + a.getAttribute('data-id')); closeDrawer(); await load(true); } catch (e) { toast(e.message, 5000, true); } });

  // ---------- use ----------
  ACT.tplUse = a => V.busy(a, async () => {
    const id = a.getAttribute('data-id'); const t = byId(id); if (!t) return; let r; try { r = await API.get(`/api/templates/${id}`); } catch (e) { toast(e.message, 5000, true); return; } const d = r.data || {};
    if (TEXT.includes(t.kind)) {
      if (t.kind === 'other') { try { await navigator.clipboard.writeText(d.body || ''); toast('Structure copied'); } catch (e) { toast('Copy failed', 4000, true); } return; }
      if (t.status !== 'published') { toast('Publish the template first so the AI uses a reviewed structure', 5000, true); return; }
      V.aiTplPick = id; ACT.aiRun({ getAttribute: k => (k === 'data-task' ? t.kind : null) }); return;
    }
    if (t.kind === 'workspace') { if (!(await confirmDialog('Apply layout', 'Replace this project\'s menu layout with "' + t.name + '"?', 'Apply', false))) return; const w = F.doc('workspace'); Object.keys(w).forEach(k => delete w[k]); Object.assign(w, wsNorm(d.workspace)); F.changed('Workspace layout applied', t.name, { section: 'workspace' }); toast('Layout applied'); return; }
    if (t.kind === 'kpi') { await I().load(['kpi']); const have = new Set(I().list('kpi').map(k => String(k.name).toLowerCase())); let n = 0; for (const k of d.kpis || []) { if (have.has(String(k.name).toLowerCase())) continue; await I().put('kpi', I().uid('kp'), k); n++; } toast(n + ' KPI definition(s) added' + ((d.kpis || []).length - n ? ', ' + ((d.kpis || []).length - n) + ' already existed' : '')); return; }
    if (t.kind === 'ftr') { if (!V.ftrApply) { toast('Open the FTR page once, then try again', 5000, true); return; } if (!(await confirmDialog('Use FTR template', 'Save "' + d.name + '" as a new version of this project\'s FTR workbook?', 'Use template', false))) return; await V.ftrApply(unb64(d.b64), d.name || 'FTR Report.xlsx', 'From template ' + t.name + ' v' + r.v); toast('Added as a new FTR version'); V.go('ftr'); }
  });

  // ---------- workspace ----------
  const wsNorm = w => ({ hidden: (w && w.hidden) || [], labels: (w && w.labels) || {}, move: (w && w.move) || {}, order: (w && w.order) || {}, groupOrder: (w && w.groupOrder) || [], custom: (w && w.custom) || [] });
  const ws = () => { const d = F.doc('workspace') || {}; Object.keys(wsNorm(d)).forEach(k => { if (d[k] === undefined) d[k] = wsNorm(d)[k]; }); return d; };
  const KEEP = ['workspace', 'settings', 'templates'];
  function compute(groups, w, all) {
    const items = []; groups.forEach((g, gi) => g.items.forEach((it, ii) => items.push({ id: it[0], l: it[1], t: it[2], orig: it[1], g: w.move[it[0]] || g.g, icon: g.icon, o: gi * 100 + ii })));
    w.custom.forEach((c, i) => items.push({ id: 'cx_' + c.id, l: c.label, orig: c.label, g: c.group || 'Project', icon: 'doc', o: 9000 + i, custom: true }));
    items.forEach(x => { if (w.labels[x.id] && !x.custom) x.l = w.labels[x.id]; x.hidden = !KEEP.includes(x.id) && w.hidden.includes(x.id); });
    const names = []; groups.forEach(g => names.push(g.g)); items.forEach(x => { if (!names.includes(x.g)) names.push(x.g); });
    const ord = (w.groupOrder || []).filter(n => names.includes(n)).concat(names.filter(n => !(w.groupOrder || []).includes(n)));
    return ord.map(n => { const arr = (w.order[n] || []); let its = items.filter(x => x.g === n && (all || !x.hidden)); its.sort((a, b) => { const ia = arr.indexOf(a.id), ib = arr.indexOf(b.id); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return a.o - b.o; }); const src = groups.find(g => g.g === n); return { g: n, icon: (src && src.icon) || 'flag', items: its }; }).filter(g => g.items.length || all);
  }
  V.wsApply = groups => { const w = ws(); const out = compute(groups, w, false); return out.map(g => ({ g: g.g, icon: g.icon, items: g.items.map(x => [x.id, x.l, x.t]) })); };
  V.customPage = {
    html() {
      const id = String(S.ui.view || '').replace(/^cx_/, ''); const c = ws().custom.find(x => x.id === id); if (!c) return '<div class="page-body"><div class="notice err"><span>This page was removed from the workspace.</span></div></div>';
      return `<div class="page-header"><div class="t"><h1>${esc(c.label)}</h1></div><div class="row">${canEdit() ? `<button class="btn" data-act="wsEditPage" data-id="${esc(id)}">${ico('edit') || ''}Edit page</button>` : ''}</div></div><div class="page-body"><div class="card" style="padding:18px">${V.md ? V.md(c.body || '') : esc(c.body || '')}${c.body ? '' : '<span class="muted">This page is empty. Use Edit page to add content.</span>'}</div></div>`;
    }
  };
  const PRESETS = { full: ['Full workspace (everything)', []], lean: ['Lean delivery (hide planning extras)', ['dashreport', 'contracts', 'kickoff', 'dashboards', 'timeline']], report: ['Reporting and handover (hide configuration and requirements)', ['modules', 'flow', 'roles', 'transcripts', 'usecases', 'checks', 'brd']] };
  V.workspace = {
    html() {
      const base = V.navBase ? V.navBase() : []; const w = ws(); const gs = compute(base, w, true); const can = canEdit(); const names = gs.map(g => g.g);
      return `<div class="page-header"><div class="t"><h1>Workspace &amp; Layout</h1><p>Arrange this project's menu: rename, hide, reorder (drag, or use the arrows), move items between groups, and add your own pages. Customers keep their own portal menu. This page, Settings and Templates can never be hidden.</p></div><div class="row">${can ? `<select data-change="wsPreset" style="width:auto"><option value="">Apply a preset…</option>${Object.keys(PRESETS).map(k => `<option value="${k}">${esc(PRESETS[k][0])}</option>`).join('')}</select><button class="btn" data-act="wsAddPage">${ico('plus')}Add page</button><button class="btn" data-act="wsSaveTpl">Save as template</button><button class="btn" data-act="wsReset">Reset</button>` : ''}</div></div>
      <div class="page-body"><div class="ws-grid">${gs.map(g => `<div class="card ws-group" data-wsg="${esc(g.g)}"><div class="card-h"><h3>${esc(g.g)}</h3>${can ? `<span class="xs muted">drop items here</span>` : ''}</div><ul class="ws-list">${g.items.map((x, i) => `<li class="ws-row${x.hidden ? ' off' : ''}" draggable="${can}" data-wsid="${esc(x.id)}"><span class="ws-grip" aria-hidden="true">⋮⋮</span><span class="ws-name">${esc(x.l)}${x.l !== x.orig ? `<span class="xs muted"> (was ${esc(x.orig)})</span>` : ''}${x.custom ? ' ' + tag('tbc', 'Custom page') : ''}</span>${can ? `<span class="ws-tools">${KEEP.includes(x.id) ? '' : `<label class="xs"><input type="checkbox" data-change="wsHide" data-id="${esc(x.id)}" ${x.hidden ? '' : 'checked'}> Show</label>`}<button class="btn sm" data-act="wsUp" data-id="${esc(x.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm" data-act="wsDown" data-id="${esc(x.id)}" ${i === g.items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn sm" data-act="wsRename" data-id="${esc(x.id)}">${x.custom ? 'Edit' : 'Rename'}</button><select data-change="wsMove" data-id="${esc(x.id)}" style="width:auto" aria-label="Move to group">${names.map(n => `<option${n === g.g ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></span>` : ''}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
    },
    mount() {
      if (!canEdit()) return; const rows = document.querySelectorAll('.ws-row'); let drag = null;
      rows.forEach(r => { r.addEventListener('dragstart', e => { drag = r.getAttribute('data-wsid'); r.classList.add('drag'); try { e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } }); r.addEventListener('dragend', () => { r.classList.remove('drag'); document.querySelectorAll('.ws-over').forEach(x => x.classList.remove('ws-over')); });
        r.addEventListener('dragover', e => { e.preventDefault(); r.classList.add('ws-over'); }); r.addEventListener('dragleave', () => r.classList.remove('ws-over')); r.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); const g = r.closest('.ws-group').getAttribute('data-wsg'); dropAt(drag, g, r.getAttribute('data-wsid')); }); });
      document.querySelectorAll('.ws-group').forEach(g => { g.addEventListener('dragover', e => e.preventDefault()); g.addEventListener('drop', e => { e.preventDefault(); dropAt(drag, g.getAttribute('data-wsg'), null); }); });
    }
  };
  function layout() { const w = ws(); return compute(V.navBase(), w, true); }
  function commit(what) { F.changed(what, '', { section: 'workspace' }); }
  function setOrder(gs) { const w = ws(); w.order = {}; gs.forEach(g => { w.order[g.g] = g.items.map(x => x.id); }); w.groupOrder = gs.map(g => g.g); }
  function dropAt(id, group, before) {
    if (!id || id === before) return; const gs = layout(); const w = ws(); let item = null; gs.forEach(g => { const i = g.items.findIndex(x => x.id === id); if (i >= 0) item = g.items.splice(i, 1)[0]; }); if (!item) return;
    const tg = gs.find(g => g.g === group); if (!tg) return; const at = before ? tg.items.findIndex(x => x.id === before) : -1; if (at >= 0) tg.items.splice(at, 0, item); else tg.items.push(item);
    setOrder(gs); if (item.custom) { const c = w.custom.find(x => 'cx_' + x.id === id); if (c) c.group = group; } else w.move[id] = group; commit('Workspace reordered');
  }
  ACT.wsUp = a => step(a.getAttribute('data-id'), -1); ACT.wsDown = a => step(a.getAttribute('data-id'), 1);
  function step(id, d) { const gs = layout(); const g = gs.find(x => x.items.some(i => i.id === id)); if (!g) return; const i = g.items.findIndex(x => x.id === id), j = i + d; if (j < 0 || j >= g.items.length) return; const t = g.items[i]; g.items[i] = g.items[j]; g.items[j] = t; setOrder(gs); commit('Workspace reordered'); }
  ACT.wsHide = el => { const w = ws(); const id = el.getAttribute('data-id'); const s = new Set(w.hidden); el.checked ? s.delete(id) : s.add(id); w.hidden = [...s]; commit(el.checked ? 'Menu item shown' : 'Menu item hidden'); };
  ACT.wsMove = el => { const id = el.getAttribute('data-id'); dropAt(id, el.value, null); };
  ACT.wsPreset = el => { const p = PRESETS[el.value]; if (!p) return; const w = ws(); w.hidden = p[1].slice(); commit('Workspace preset applied'); toast('Preset applied'); };
  ACT.wsReset = async () => { if (!(await confirmDialog('Reset workspace', 'Restore the standard menu? Custom pages are removed too.', 'Reset', true))) return; const w = F.doc('workspace'); Object.keys(w).forEach(k => delete w[k]); Object.assign(w, wsNorm({})); commit('Workspace reset'); };
  ACT.wsRename = a => {
    const id = a.getAttribute('data-id'); const w = ws(); const base = V.navBase().flatMap(g => g.items).find(i => i[0] === id); const c = id.startsWith('cx_') ? w.custom.find(x => 'cx_' + x.id === id) : null;
    if (c) return ACT.wsAddPage({ getAttribute: k => (k === 'data-id' ? c.id : null) });
    drawer('Rename menu item', `<label class="f">Menu label</label><input type="text" id="ws_l" maxlength="40" value="${esc(w.labels[id] || (base ? base[1] : ''))}"><p class="small muted">Original name: ${esc(base ? base[1] : '')}. Leave blank to restore it.</p>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsRenameGo" data-id="${esc(id)}">Save</button>`);
  };
  ACT.wsRenameGo = a => { const w = ws(); const id = a.getAttribute('data-id'); const v = document.getElementById('ws_l').value.trim(); if (v) w.labels[id] = v; else delete w.labels[id]; closeDrawer(); commit('Menu item renamed'); };
  ACT.wsAddPage = a => {
    const id = a && a.getAttribute && a.getAttribute('data-id'); const w = ws(); const c = id ? w.custom.find(x => x.id === id) : null; const names = layout().map(g => g.g);
    drawer(c ? 'Edit page' : 'Add a page', `<label class="f">Menu label</label><input type="text" id="cp_l" maxlength="40" value="${esc(c ? c.label : '')}" placeholder="e.g. Customer escalation contacts"><label class="f">Menu group</label><select id="cp_g">${names.map(n => `<option${(c ? c.group : 'Project') === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}<option value="__new">New group…</option></select><input type="text" id="cp_gn" maxlength="30" placeholder="New group name" style="display:none;margin-top:6px"><label class="f">Content (headings with #, lists with -, tables with |)</label><textarea id="cp_b" rows="12">${esc(c ? c.body : '')}</textarea>`,
      `${c ? `<button class="btn danger" data-act="wsDelPage" data-id="${esc(id)}">Delete page</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsPageGo" data-id="${esc(id || '')}">Save</button>`, { wide: true });
    const sel = document.getElementById('cp_g'); if (sel) sel.addEventListener('change', () => { document.getElementById('cp_gn').style.display = sel.value === '__new' ? '' : 'none'; });
  };
  ACT.wsEditPage = a => ACT.wsAddPage(a);
  ACT.wsPageGo = a => {
    const w = ws(); const g = i => (document.getElementById(i) || {}).value || ''; const label = g('cp_l').trim(); if (!label) { toast('Enter a menu label'); return; } let grp = g('cp_g'); if (grp === '__new') grp = g('cp_gn').trim(); if (!grp) { toast('Name the group'); return; }
    const id = a.getAttribute('data-id'); if (id) { const c = w.custom.find(x => x.id === id); if (c) Object.assign(c, { label, group: grp, body: g('cp_b') }); } else { w.custom.push({ id: 'p' + Date.now().toString(36), label, group: grp, body: g('cp_b') }); }
    closeDrawer(); commit('Workspace page saved'); toast('Saved');
  };
  ACT.wsDelPage = async a => { if (!(await confirmDialog('Delete page', 'Remove this page from the workspace?', 'Delete', true))) return; const w = ws(); w.custom = w.custom.filter(x => x.id !== a.getAttribute('data-id')); closeDrawer(); commit('Workspace page removed'); if (/^cx_/.test(S.ui.view || '')) V.go('workspace'); };
  ACT.wsSaveTpl = () => ACT.tplNew({ getAttribute: () => 'workspace' });
})(typeof window !== 'undefined' ? window : globalThis);
