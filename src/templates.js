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
      <label class="f">Versions</label><div class="small">${(t.versions || []).slice().reverse().map(x => `<div><a href="#" data-act="tplOpen" data-id="${esc(t.id)}" data-v="${x.v}">v${x.v}</a> · ${esc(when(x.at))} · ${esc(x.by)}${x.note ? ' · ' + esc(x.note) : ''}${x.v === t.pub ? ' ' + tag('green', 'live') : ''}${x.v > 1 ? ` · <a href="#" data-act="tplCompare" data-id="${esc(t.id)}" data-v="${x.v}">compare with v${x.v - 1}</a>` : ''}</div>`).join('')}</div>`,
      `${can && !t.pub ? `<button class="btn danger" data-act="tplDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span>${can && isText ? `<button class="btn" data-act="tplSaveVer" data-id="${esc(id)}">Save as new version</button>` : ''}${can && t.status !== 'retired' ? `<button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="publish" data-v="${r.v}" ${t.scope === 'org' && !T.isAdmin ? 'disabled title="Only an Admin can publish an organisation template"' : ''}>Publish v${r.v}</button><button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="retire">Retire</button>` : ''}${can && t.status === 'retired' ? `<button class="btn" data-act="tplStatus" data-id="${esc(id)}" data-a="reopen">Reopen</button>` : ''}`, { wide: true });
  });
  // version comparison: line diff of the stored content (pretty-printed JSON or the text body)
  const lines = d => (d && typeof d.body === 'string' ? d.body : JSON.stringify(d, null, 1)).split('\n');
  function diff(a, b) { const n = a.length, m = b.length; if (n * m > 4e6) return null; const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1)); for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0; while (i < n && j < m) { if (a[i] === b[j]) { out.push([' ', a[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', a[i++]]); else out.push(['+', b[j++]]); } while (i < n) out.push(['-', a[i++]]); while (j < m) out.push(['+', b[j++]]); return out; }
  ACT.tplCompare = a => V.busy(a, async () => { const id = a.getAttribute('data-id'); const v = Number(a.getAttribute('data-v')); const t = byId(id); if (!t || v < 2) return;
    let A, B; try { [A, B] = await Promise.all([API.get(`/api/templates/${id}?v=${v - 1}`), API.get(`/api/templates/${id}?v=${v}`)]); } catch (e) { toast(e.message, 5000, true); return; }
    const df = diff(lines(A.data), lines(B.data)); const ch = df ? df.filter(x => x[0] !== ' ').length : 0;
    const rows = df ? df.filter((x, i) => x[0] !== ' ' || df.slice(Math.max(0, i - 2), i + 3).some(y => y[0] !== ' ')) : [];
    drawer(`${t.name}: v${v - 1} to v${v}`, df ? (ch ? `<div class="small muted" style="margin-bottom:8px">${ch} changed line(s). Red was removed, green was added.</div><pre style="font-size:12px;white-space:pre-wrap;margin:0">${rows.map(x => `<div style="background:${x[0] === '+' ? '#D1FADF' : x[0] === '-' ? '#FFE4E8' : 'transparent'}">${esc(x[0] + ' ' + x[1])}</div>`).join('')}</pre>` : '<div class="muted">The two versions have the same content.</div>') : '<div class="muted">These versions are too large to compare line by line here.</div>',
      `<button class="btn" data-act="tplOpen" data-id="${esc(id)}" data-v="${v}">Back</button>`, { wide: true }); });
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

  // ---------- workspace: Tabs & Layouts ----------
  // One layout document per project (section "workspace"): labels, hidden tabs, moves between groups, order, extra groups, custom pages,
  // phone visibility and who may see a tab. It only arranges the menu: every page still checks access on the server.
  const wsNorm = w => ({ hidden: (w && w.hidden) || [], labels: (w && w.labels) || {}, move: (w && w.move) || {}, order: (w && w.order) || {}, groupOrder: (w && w.groupOrder) || [], custom: (w && w.custom) || [],
    groups: (w && Array.isArray(w.groups) && w.groups) || [], mobile: Object.assign({ hidden: [], groupOrder: [] }, (w && w.mobile) || {}), roles: (w && w.roles) || {} });
  const ws = () => { const d = F.doc('workspace') || {}; const n = wsNorm(d); Object.keys(n).forEach(k => { if (d[k] === undefined) d[k] = n[k]; }); if (!d.mobile.hidden) d.mobile.hidden = []; if (!d.mobile.groupOrder) d.mobile.groupOrder = []; return d; };
  const KEEP = ['workspace', 'settings', 'templates'];
  const WHO = { all: 'Everyone in the project', edit: 'Owners and editors', owner: 'Owners only' };
  const roleOk = (need, role) => !need || need === 'all' || (need === 'edit' ? role !== 'viewer' : role === 'owner');
  function compute(groups, w, all, opt) {
    opt = opt || {}; const items = []; groups.forEach((g, gi) => g.items.forEach((it, ii) => items.push({ id: it[0], l: it[1], t: it[2], orig: it[1], g: w.move[it[0]] || g.g, icon: g.icon, o: gi * 100 + ii })));
    w.custom.forEach((c, i) => items.push({ id: 'cx_' + c.id, l: c.label, orig: c.label, g: c.group || 'Project', icon: 'doc', o: 9000 + i, custom: true }));
    const mh = (w.mobile && w.mobile.hidden) || [];
    items.forEach(x => { if (w.labels[x.id] && !x.custom) x.l = w.labels[x.id]; const keep = KEEP.includes(x.id); x.webHidden = !keep && w.hidden.includes(x.id); x.mobHidden = !keep && mh.includes(x.id); x.who = keep ? 'all' : (w.roles[x.id] || 'all');
      x.hidden = x.webHidden || (opt.mobile && x.mobHidden) || (!keep && opt.role && !roleOk(x.who, opt.role)); });
    const names = []; groups.forEach(g => names.push(g.g)); (w.groups || []).forEach(n => { if (!names.includes(n)) names.push(n); }); items.forEach(x => { if (!names.includes(x.g)) names.push(x.g); });
    const go = opt.mobile && w.mobile && w.mobile.groupOrder && w.mobile.groupOrder.length ? w.mobile.groupOrder : (w.groupOrder || []);
    const ord = go.filter(n => names.includes(n)).concat(names.filter(n => !go.includes(n)));
    return ord.map(n => { const arr = (w.order[n] || []); let its = items.filter(x => x.g === n && (all || !x.hidden)); its.sort((a, b) => { const ia = arr.indexOf(a.id), ib = arr.indexOf(b.id); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return a.o - b.o; }); const src = groups.find(g => g.g === n); return { g: n, icon: (src && src.icon) || 'flag', items: its, extra: !src && (w.groups || []).includes(n) }; }).filter(g => g.items.length || all);
  }
  // the menu as shown: on phones the phone layout, and tabs limited to roles the person does not have are left out (the server still decides access)
  V.wsApply = (groups, opt) => { const w = ws(); opt = opt || {}; const o = { mobile: false, role: opt.role !== undefined ? opt.role : (S.project && S.project.role) }; const out = compute(groups, w, false, o); return out.map(g => ({ g: g.g, icon: g.icon, items: g.items.map(x => [x.id, x.l, x.t]) })); };
  V.customPage = {
    html() {
      const id = String(S.ui.view || '').replace(/^cx_/, ''); const c = ws().custom.find(x => x.id === id); if (!c) return '<div class="page-body"><div class="notice err"><span>This page was removed from the workspace.</span></div></div>';
      return `<div class="page-header"><div class="t"><h1>${esc(c.label)}</h1></div><div class="row">${canEdit() ? `<button class="btn" data-act="wsEditPage" data-id="${esc(id)}">${ico('edit') || ''}Edit page</button>` : ''}</div></div><div class="page-body"><div class="card" style="padding:18px">${V.md ? V.md(c.body || '') : esc(c.body || '')}${c.body ? '' : '<span class="muted">This page is empty. Use Edit page to add content.</span>'}</div></div>`;
    }
  };
  const PRESETS = { full: ['Full workspace (everything)', []], lean: ['Lean delivery (hide planning extras)', ['dashreport', 'contracts', 'kickoff', 'dashboards', 'timeline']], report: ['Reporting and handover (hide configuration and requirements)', ['modules', 'flow', 'roles', 'transcripts', 'usecases', 'checks', 'brd']] };
  const FI = root.FWBIcons || { has: () => false, svg: () => '' };
  const GI = { Project: 'g_project', Administration: 'g_admin' };
  const gIcon = g => (FI.has(GI[g.g]) ? FI.svg(GI[g.g]) : ico(g.icon || 'flag'));
  const grip = '<span class="tl-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
  function layout(mobile) { const w = ws(); const gs = compute(V.navBase(), w, true, { mobile }); return gs; }
  V.workspace = {
    html() {
      const base = V.navBase ? V.navBase() : []; const w = ws(); const can = canEdit(); const mobile = false;   // one layout: the web menu
      const gs = compute(base, w, true, { mobile }); const q = (S.ui.wsQ || '').toLowerCase(); const cur = gs.find(g => g.g === S.ui.wsGroup) || gs[0]; if (cur) S.ui.wsGroup = cur.g;
      const head = `<div class="page-header"><div class="t"><h1>Tabs &amp; Layouts</h1><p>Choose which tabs this project's menu shows, how they are grouped and in which order. Hiding a tab only tidies the menu: every page still checks access on the server. Customers keep their own portal menu. This page, Settings and Templates are always shown.</p></div><div class="row">${can ? `<select data-change="wsPreset" style="width:auto" aria-label="Apply a preset"><option value="">Apply a preset…</option>${Object.keys(PRESETS).map(k => `<option value="${k}">${esc(PRESETS[k][0])}</option>`).join('')}</select><button class="btn" data-act="wsSaveTpl">Save as template</button><button class="btn" data-act="wsReset">Reset to default</button>` : ''}</div></div>`;
      const glist = gs.filter(g => !q || g.g.toLowerCase().includes(q) || g.items.some(x => x.l.toLowerCase().includes(q)));
      const left = `<aside class="tl-groups" aria-label="Tab groups"><div class="tl-gh"><h3>Tab Group</h3>${can && !mobile ? `<button class="btn sm" data-act="wsNewGroup">${ico('plus')}New Tab Group</button>` : ''}</div>
        <div class="tl-search">${ico('search')}<input type="search" id="wsQ" placeholder="Search groups" aria-label="Search groups" value="${esc(S.ui.wsQ || '')}"></div>
        <ul class="tl-glist" role="listbox" aria-label="Groups">${glist.map(g => { const shown = g.items.filter(x => !(mobile ? x.mobHidden || x.webHidden : x.webHidden)).length; return `<li class="tl-g${g === cur ? ' on' : ''}" role="option" aria-selected="${g === cur}" tabindex="0" data-act="wsGroup" data-g="${esc(g.g)}" draggable="${can}" data-wsg="${esc(g.g)}">${can ? grip : ''}<span class="tl-gi">${gIcon(g)}</span><span class="tl-gn">${esc(g.g)}</span><span class="tl-gc">${shown}</span></li>`; }).join('') || '<li class="tl-none">No group matches.</li>'}</ul>
        ${can ? `<p class="xs muted tl-tip">Drag groups to reorder them${mobile ? ' for phones' : ''}. Drop a tab on a group to move it there.</p>` : ''}</aside>`;
      const rows = cur ? cur.items : []; const off = x => (mobile ? x.mobHidden || x.webHidden : x.webHidden);
      const right = cur ? `<section class="tl-main" aria-label="${esc(cur.g)} tabs"><div class="tl-mh"><h3>${esc(cur.g)}</h3><span class="xs muted">${rows.filter(x => !off(x)).length} of ${rows.length} shown${mobile ? ' on phones' : ''}</span><span class="spacer"></span>${can ? `<button class="btn sm icon" data-act="wsGroupStep" data-g="${esc(cur.g)}" data-d="-1" aria-label="Move group up${mobile ? ' on phones' : ''}" title="Move group up"${gs.indexOf(cur) === 0 ? ' disabled' : ''}>↑</button><button class="btn sm icon" data-act="wsGroupStep" data-g="${esc(cur.g)}" data-d="1" aria-label="Move group down${mobile ? ' on phones' : ''}" title="Move group down"${gs.indexOf(cur) === gs.length - 1 ? ' disabled' : ''}>↓</button>${cur.extra ? `<button class="btn sm" data-act="wsGroupRename" data-g="${esc(cur.g)}">Rename</button>${cur.items.length ? '' : `<button class="btn sm danger" data-act="wsGroupDel" data-g="${esc(cur.g)}">Delete group</button>`}` : ''}${mobile ? '' : `<button class="btn sm" data-act="wsAddTab" data-g="${esc(cur.g)}">${ico('plus')}Add</button>`}` : ''}</div>
        <ul class="tl-rows" data-wsg="${esc(cur.g)}">${rows.map((x, i) => `<li class="tl-row${off(x) ? ' off' : ''}" draggable="${can && !mobile}" data-wsid="${esc(x.id)}">${can && !mobile ? grip : ''}<span class="tl-rn"><b>${esc(x.l)}</b><small>${x.custom ? 'Custom page' : 'Page'}${x.l !== x.orig ? ' · was ' + esc(x.orig) : ''}${x.who !== 'all' ? ' · ' + esc(WHO[x.who]) : ''}</small></span>
          ${can ? `<span class="tl-rt">${KEEP.includes(x.id) ? '<span class="xs muted">Always shown</span>' : `<label class="switch" title="${mobile ? 'Show on phones' : 'Show in the menu'}"><input type="checkbox" data-change="${mobile ? 'wsHideMob' : 'wsHide'}" data-id="${esc(x.id)}"${off(x) ? '' : ' checked'}${mobile && x.webHidden ? ' disabled' : ''} aria-label="Show ${esc(x.l)}${mobile ? ' on phones' : ''}"><span></span></label>`}${KEEP.includes(x.id) ? '' : `<select class="tl-who" data-change="wsWho" data-id="${esc(x.id)}" aria-label="Who sees ${esc(x.l)} in the menu" title="Who sees this tab in the menu">${Object.keys(WHO).map(k => `<option value="${k}"${x.who === k ? ' selected' : ''}>${WHO[k]}</option>`).join('')}</select>`}${mobile ? '' : `<button class="btn sm icon" data-act="wsUp" data-id="${esc(x.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(x.l)} up">↑</button><button class="btn sm icon" data-act="wsDown" data-id="${esc(x.id)}" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(x.l)} down">↓</button><button class="btn sm" data-act="wsRename" data-id="${esc(x.id)}">${x.custom ? 'Edit' : 'Rename'}</button>`}</span>` : ''}</li>`).join('') || '<li class="tl-none">This group has no tabs yet. Use Add, or drag a tab onto it.</li>'}</ul>
        ${mobile ? '<p class="xs muted tl-tip">A tab hidden on the web is hidden on phones too.</p>' : ''}</section>` : '';
      // preview of the menu as it will look (web: the side menu; mobile: the phone menu)
      const pv = compute(base, w, false, { mobile }); const preview = `<aside class="tl-prev${mobile ? ' phone' : ''}" aria-label="Preview"><p class="tl-pk">Preview · ${mobile ? 'phone menu' : 'side menu'}</p><div class="tl-pbox">${pv.map(g => `<div class="tl-pg"><b>${esc(g.g)}</b>${g.items.map(x => `<span${S.ui.view === x.id ? ' class="on"' : ''}>${esc(x.l)}</span>`).join('')}</div>`).join('')}</div></aside>`;
      return head + `<div class="page-body"><div class="tl-grid">${left}${right}${preview}</div></div>`;
    },
    mount() {
      const q = document.getElementById('wsQ'); if (q) q.addEventListener('input', () => { S.ui.wsQ = q.value; const pos = q.selectionStart; V.render(); const n = document.getElementById('wsQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
      document.querySelectorAll('.tl-g[tabindex]').forEach(li => li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const all = [...document.querySelectorAll('.tl-g[tabindex]')]; const j = all.indexOf(li) + (e.key === 'ArrowDown' ? 1 : -1); if (all[j]) all[j].focus(); } }));
      if (!canEdit()) return; const mobile = S.ui.wsMode === 'mobile'; let drag = null;
      document.querySelectorAll('.tl-row[draggable="true"]').forEach(r => { r.addEventListener('dragstart', e => { drag = { tab: r.getAttribute('data-wsid') }; r.classList.add('drag'); try { e.dataTransfer.setData('text/plain', drag.tab); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } }); r.addEventListener('dragend', () => { r.classList.remove('drag'); document.querySelectorAll('.ws-over').forEach(x => x.classList.remove('ws-over')); });
        r.addEventListener('dragover', e => { if (drag && drag.tab) { e.preventDefault(); r.classList.add('ws-over'); } }); r.addEventListener('dragleave', () => r.classList.remove('ws-over')); r.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); if (drag && drag.tab) dropAt(drag.tab, r.closest('[data-wsg]').getAttribute('data-wsg'), r.getAttribute('data-wsid')); }); });
      document.querySelectorAll('.tl-g[data-wsg]').forEach(g => { g.addEventListener('dragstart', e => { drag = { group: g.getAttribute('data-wsg') }; g.classList.add('drag'); try { e.dataTransfer.setData('text/plain', drag.group); } catch (x) { } }); g.addEventListener('dragend', () => { g.classList.remove('drag'); document.querySelectorAll('.ws-over').forEach(x => x.classList.remove('ws-over')); });
        g.addEventListener('dragover', e => { if (drag) { e.preventDefault(); g.classList.add('ws-over'); } }); g.addEventListener('dragleave', () => g.classList.remove('ws-over'));
        g.addEventListener('drop', e => { e.preventDefault(); g.classList.remove('ws-over'); if (!drag) return; const to = g.getAttribute('data-wsg'); if (drag.tab && !mobile) dropAt(drag.tab, to, null); else if (drag.group) moveGroup(drag.group, to, mobile); drag = null; }); });
      const rl = document.querySelector('.tl-rows'); if (rl) { rl.addEventListener('dragover', e => { if (drag && drag.tab) e.preventDefault(); }); rl.addEventListener('drop', e => { e.preventDefault(); if (drag && drag.tab) dropAt(drag.tab, rl.getAttribute('data-wsg'), null); }); }
    }
  };
  function commit(what) { F.changed(what, '', { section: 'workspace' }); }
  function setOrder(gs) { const w = ws(); w.order = {}; gs.forEach(g => { w.order[g.g] = g.items.map(x => x.id); }); w.groupOrder = gs.map(g => g.g); }
  function dropAt(id, group, before) {
    if (!id || id === before) return; const gs = layout(false); const w = ws(); let item = null; gs.forEach(g => { const i = g.items.findIndex(x => x.id === id); if (i >= 0) item = g.items.splice(i, 1)[0]; }); if (!item) return;
    const tg = gs.find(g => g.g === group); if (!tg) return; const at = before ? tg.items.findIndex(x => x.id === before) : -1; if (at >= 0) tg.items.splice(at, 0, item); else tg.items.push(item);
    setOrder(gs); if (item.custom) { const c = w.custom.find(x => 'cx_' + x.id === id); if (c) c.group = group; } else w.move[id] = group; commit('Menu reordered');
  }
  function moveGroup(from, to, mobile) { if (from === to) return; const w = ws(); const names = layout(mobile).map(g => g.g); const i = names.indexOf(from); if (i < 0) return; names.splice(i, 1); names.splice(names.indexOf(to), 0, from); if (mobile) w.mobile.groupOrder = names; else w.groupOrder = names; commit(mobile ? 'Phone menu groups reordered' : 'Menu groups reordered'); }
  ACT.wsGroupStep = a => { const mobile = S.ui.wsMode === 'mobile'; const g = a.getAttribute('data-g'), d = Number(a.getAttribute('data-d')); const w = ws(); const names = layout(mobile).map(x => x.g); const i = names.indexOf(g), j = i + d; if (i < 0 || j < 0 || j >= names.length) return; names[i] = names[j]; names[j] = g; if (mobile) w.mobile.groupOrder = names; else w.groupOrder = names; commit(mobile ? 'Phone menu groups reordered' : 'Menu groups reordered'); };
  ACT.wsGroup = a => { S.ui.wsGroup = a.getAttribute('data-g'); V.render(); };
  ACT.wsUp = a => step(a.getAttribute('data-id'), -1); ACT.wsDown = a => step(a.getAttribute('data-id'), 1);
  function step(id, d) { const gs = layout(false); const g = gs.find(x => x.items.some(i => i.id === id)); if (!g) return; const i = g.items.findIndex(x => x.id === id), j = i + d; if (j < 0 || j >= g.items.length) return; const t = g.items[i]; g.items[i] = g.items[j]; g.items[j] = t; setOrder(gs); commit('Menu reordered'); }
  ACT.wsHide = el => { const w = ws(); const id = el.getAttribute('data-id'); if (KEEP.includes(id)) return; const s = new Set(w.hidden); el.checked ? s.delete(id) : s.add(id); w.hidden = [...s]; commit(el.checked ? 'Menu item shown' : 'Menu item hidden'); };
  ACT.wsHideMob = el => { const w = ws(); const id = el.getAttribute('data-id'); if (KEEP.includes(id)) return; const s = new Set(w.mobile.hidden); el.checked ? s.delete(id) : s.add(id); w.mobile.hidden = [...s]; commit(el.checked ? 'Shown on phones' : 'Hidden on phones'); };
  ACT.wsWho = el => { const w = ws(); const id = el.getAttribute('data-id'); if (KEEP.includes(id)) return; if (el.value === 'all') delete w.roles[id]; else w.roles[id] = el.value; commit('Menu visibility by role changed'); toast('Saved. This only changes the menu; page access is still checked on the server.', 5000); };
  ACT.wsMove = el => { const id = el.getAttribute('data-id'); dropAt(id, el.value, null); };
  ACT.wsPreset = el => { const p = PRESETS[el.value]; if (!p) return; const w = ws(); w.hidden = p[1].slice(); commit('Workspace preset applied'); toast('Preset applied'); };
  ACT.wsReset = async () => { if (!(await confirmDialog('Reset to default', 'Restore the standard menu? Custom pages and extra groups are removed too.', 'Reset', true))) return; const w = F.doc('workspace'); Object.keys(w).forEach(k => delete w[k]); Object.assign(w, wsNorm({})); commit('Workspace reset'); };
  ACT.wsNewGroup = () => drawer('New tab group', `<label class="f" for="wsg_n">Group name</label><input type="text" id="wsg_n" maxlength="40" placeholder="e.g. Customer reporting">`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsNewGroupGo">Create</button>`);
  ACT.wsNewGroupGo = () => { const n = ((document.getElementById('wsg_n') || {}).value || '').trim(); if (!n) { toast('Name the group'); return; } if (layout(false).some(g => g.g.toLowerCase() === n.toLowerCase())) { toast('A group with that name exists'); return; } const w = ws(); w.groups = (w.groups || []).concat(n); S.ui.wsGroup = n; closeDrawer(); commit('Tab group created'); };
  ACT.wsGroupRename = a => { const g = a.getAttribute('data-g'); drawer('Rename group', `<label class="f" for="wsg_n">Group name</label><input type="text" id="wsg_n" maxlength="40" value="${esc(g)}">`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsGroupRenameGo" data-g="${esc(g)}">Save</button>`); };
  ACT.wsGroupRenameGo = a => { const from = a.getAttribute('data-g'); const to = ((document.getElementById('wsg_n') || {}).value || '').trim(); if (!to || to === from) { closeDrawer(); return; } if (layout(false).some(g => g.g.toLowerCase() === to.toLowerCase())) { toast('A group with that name exists'); return; }
    const w = ws(); w.groups = w.groups.map(x => (x === from ? to : x)); Object.keys(w.move).forEach(k => { if (w.move[k] === from) w.move[k] = to; }); w.custom.forEach(c => { if (c.group === from) c.group = to; }); if (w.order[from]) { w.order[to] = w.order[from]; delete w.order[from]; } w.groupOrder = w.groupOrder.map(x => (x === from ? to : x)); w.mobile.groupOrder = w.mobile.groupOrder.map(x => (x === from ? to : x)); S.ui.wsGroup = to; closeDrawer(); commit('Tab group renamed'); };
  ACT.wsGroupDel = async a => { const g = a.getAttribute('data-g'); if (!(await confirmDialog('Delete group', `Delete the empty group "${g}"?`, 'Delete', true))) return; const w = ws(); w.groups = w.groups.filter(x => x !== g); w.groupOrder = w.groupOrder.filter(x => x !== g); w.mobile.groupOrder = w.mobile.groupOrder.filter(x => x !== g); S.ui.wsGroup = null; commit('Tab group deleted'); };
  // Add: bring an existing tab into this group, show a hidden one, or create a custom page here
  ACT.wsAddTab = a => { const g = a.getAttribute('data-g'); const all = layout(false).flatMap(x => x.items.map(i => Object.assign({ grp: x.g }, i))).filter(i => i.grp !== g || i.webHidden);
    drawer('Add a tab to ' + g, `<p class="small muted" style="margin-top:0">Pick an existing page to move into this group (hidden pages are shown again), or create a custom page.</p><input type="search" id="wsa_q" placeholder="Search tabs" aria-label="Search tabs"><ul class="tl-add" id="wsa_l">${all.map(i => `<li data-q="${esc((i.l + ' ' + i.grp).toLowerCase())}"><button type="button" class="tl-addb" data-act="wsAddTabGo" data-id="${esc(i.id)}" data-g="${esc(g)}"><b>${esc(i.l)}</b><small>${esc(i.grp)}${i.webHidden ? ' · hidden' : ''}</small></button></li>`).join('')}</ul>`,
      `<button class="btn" data-act="wsAddPage">${ico('plus')}Custom page</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`, { wide: true });
    const q = document.getElementById('wsa_q'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll('#wsa_l li').forEach(li => { li.hidden = v && !li.getAttribute('data-q').includes(v); }); }); q.focus(); };
  ACT.wsAddTabGo = a => { const id = a.getAttribute('data-id'), g = a.getAttribute('data-g'); const w = ws(); w.hidden = w.hidden.filter(x => x !== id); closeDrawer(); dropAt(id, g, null); toast('Added to ' + g); };
  ACT.wsRename = a => {
    const id = a.getAttribute('data-id'); const w = ws(); const base = V.navBase().flatMap(g => g.items).find(i => i[0] === id); const c = id.startsWith('cx_') ? w.custom.find(x => 'cx_' + x.id === id) : null;
    if (c) return ACT.wsAddPage({ getAttribute: k => (k === 'data-id' ? c.id : null) });
    drawer('Rename menu item', `<label class="f">Menu label</label><input type="text" id="ws_l" maxlength="40" value="${esc(w.labels[id] || (base ? base[1] : ''))}"><p class="small muted">Original name: ${esc(base ? base[1] : '')}. Leave blank to restore it.</p>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsRenameGo" data-id="${esc(id)}">Save</button>`);
  };
  ACT.wsRenameGo = a => { const w = ws(); const id = a.getAttribute('data-id'); const v = document.getElementById('ws_l').value.trim(); if (v) w.labels[id] = v; else delete w.labels[id]; closeDrawer(); commit('Menu item renamed'); };
  ACT.wsAddPage = a => {
    const id = a && a.getAttribute && a.getAttribute('data-id'); const w = ws(); const c = id ? w.custom.find(x => x.id === id) : null; const names = layout(false).map(g => g.g); const def = c ? c.group : (S.ui.wsGroup || 'Project');
    drawer(c ? 'Edit page' : 'Add a page', `<label class="f">Menu label</label><input type="text" id="cp_l" maxlength="40" value="${esc(c ? c.label : '')}" placeholder="e.g. Customer escalation contacts"><label class="f">Menu group</label><select id="cp_g">${names.map(n => `<option${def === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}<option value="__new">New group…</option></select><input type="text" id="cp_gn" maxlength="30" placeholder="New group name" style="display:none;margin-top:6px"><label class="f">Content (headings with #, lists with -, tables with |)</label><textarea id="cp_b" rows="12">${esc(c ? c.body : '')}</textarea>`,
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
