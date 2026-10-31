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
  // One layout document per project (section "workspace"), modelled on Facilio's Setup > Tabs and Layout:
  //   groups   – extra groups added in this project (their keys); gl / gi – a label and an icon for any group, standard or added;
  //   gdel     – standard groups deleted here, each with the group its tabs went to;
  //   labels, hidden, roles – per tab: menu label, left out of the menu, who sees it; move / order / groupOrder – where tabs and groups sit;
  //   sub      – per tab, the sub-heading it sits under inside its group ('' = none; absent = the standard one);
  //   custom   – pages written in the workspace itself; mobile – kept from the earlier phone layout.
  // It only arranges the menu: every page still checks access on the server.
  const wsNorm = w => ({ hidden: (w && w.hidden) || [], labels: (w && w.labels) || {}, move: (w && w.move) || {}, order: (w && w.order) || {}, groupOrder: (w && w.groupOrder) || [], custom: (w && w.custom) || [],
    groups: (w && Array.isArray(w.groups) && w.groups) || [], mobile: Object.assign({ hidden: [], groupOrder: [] }, (w && w.mobile) || {}), roles: (w && w.roles) || {}, sub: (w && w.sub) || {},
    gl: (w && w.gl) || {}, gi: (w && w.gi) || {}, gdel: (w && w.gdel) || {}, v: (w && w.v) || 0 });
  // layouts saved before the menu was regrouped (28 Oct 2026) name the old groups; point them at the new ones once
  function migrate(d) {
    if (d.v >= 3) return; const A = V.NAV_ALIAS || {}; const m = n => A[n] || n; const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
    Object.keys(d.move).forEach(k => { d.move[k] = m(d.move[k]); });
    const ord = {}; Object.keys(d.order).forEach(k => { const nk = m(k); ord[nk] = uniq((ord[nk] || []).concat(d.order[k] || [])); }); d.order = ord;
    d.groupOrder = uniq(d.groupOrder.map(m)); d.mobile.groupOrder = uniq((d.mobile.groupOrder || []).map(m));
    const base = (V.navBase ? V.navBase() : []).map(g => g.g); d.groups = uniq(d.groups.map(m)).filter(n => !base.includes(n));
    d.custom.forEach(c => { if (c.group) c.group = m(c.group); }); d.v = 3;
  }
  const ws = () => { const d = F.doc('workspace') || {}; const n = wsNorm(d); Object.keys(n).forEach(k => { if (d[k] === undefined) d[k] = n[k]; }); if (!d.mobile.hidden) d.mobile.hidden = []; if (!d.mobile.groupOrder) d.mobile.groupOrder = []; migrate(d); return d; };
  const KEEP = ['workspace', 'settings', 'templates'];
  const WHO = { all: 'Everyone in the project', edit: 'Owners and editors', owner: 'Owners only' };
  const roleOk = (need, role) => !need || need === 'all' || (need === 'edit' ? role !== 'viewer' : role === 'owner');
  function compute(groups, w, all, opt) {
    opt = opt || {}; const del = w.gdel || {}; const baseKeys = groups.map(g => g.g);
    // a tab whose group was deleted follows that group's tabs to where they went (or to the first remaining standard group)
    const live = n => !del[n]; const first = baseKeys.find(live) || (w.groups || []).find(live) || 'Project';
    const res = n => { for (let i = 0; i < 6 && n && del[n]; i++) n = del[n]; return n && live(n) ? n : first; };
    const items = []; groups.forEach((g, gi) => g.items.forEach((it, ii) => items.push({ id: it[0], l: it[1], t: it[2], dsub: it[3] || '', orig: it[1], home: g.g, g: res(w.move[it[0]] || g.g), o: gi * 100 + ii })));
    w.custom.forEach((c, i) => items.push({ id: 'cx_' + c.id, l: c.label, orig: c.label, g: res(c.group || first), o: 9000 + i, custom: true }));
    const mh = (w.mobile && w.mobile.hidden) || [];
    items.forEach(x => { if (w.labels[x.id] && !x.custom) x.l = w.labels[x.id]; const keep = KEEP.includes(x.id); x.webHidden = !keep && w.hidden.includes(x.id); x.mobHidden = !keep && mh.includes(x.id); x.who = keep ? 'all' : (w.roles[x.id] || 'all'); const sb = w.sub || {}; x.sub = Object.prototype.hasOwnProperty.call(sb, x.id) ? String(sb[x.id] || '') : (x.g === x.home ? x.dsub || '' : '');
      x.hidden = x.webHidden || (opt.mobile && x.mobHidden) || (!keep && opt.role && !roleOk(x.who, opt.role)); });
    const names = []; const add = n => { if (n && live(n) && !names.includes(n)) names.push(n); }; baseKeys.forEach(add); (w.groups || []).forEach(add); items.forEach(x => add(x.g));
    const go = opt.mobile && w.mobile && w.mobile.groupOrder && w.mobile.groupOrder.length ? w.mobile.groupOrder : (w.groupOrder || []);
    const ord = go.filter(n => names.includes(n)).concat(names.filter(n => !go.includes(n)));
    return ord.map(n => { const arr = (w.order[n] || []); let its = items.filter(x => x.g === n && (all || !x.hidden)); its.sort((a, b) => { const ia = arr.indexOf(a.id), ib = arr.indexOf(b.id); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return a.o - b.o; }); { const so = ['']; its.forEach(x => { if (!so.includes(x.sub)) so.push(x.sub); }); /* tabs without a sub-heading first, so they never look as if they sit under one */ its = so.flatMap(k => its.filter(x => x.sub === k)); }
      const src = groups.find(g => g.g === n); const ik = (w.gi || {})[n] || (src && src.fi ? 'f:' + src.fi : 'l:' + ((src && src.icon) || 'flag'));
      return { key: n, g: (w.gl || {})[n] || n, sec: (src && src.sec) || '', ik, icon: (src && src.icon) || 'flag', items: its, extra: !src, builtin: !!src }; }).filter(g => g.items.length || all);
  }
  // the menu as shown: tabs limited to roles the person does not have are left out (the server still decides access)
  V.wsApply = (groups, opt) => { const w = ws(); opt = opt || {}; const o = { mobile: false, role: opt.role !== undefined ? opt.role : (S.project && S.project.role) }; const out = compute(groups, w, false, o); return out.map(g => ({ g: g.g, key: g.key, sec: g.sec, ik: g.ik, icon: g.icon, items: g.items.map(x => [x.id, x.l, x.t, x.sub]) })); };
  V.customPage = {
    html() {
      const id = String(S.ui.view || '').replace(/^cx_/, ''); const c = ws().custom.find(x => x.id === id); if (!c) return '<div class="page-body"><div class="notice err"><span>This page was removed from the workspace.</span></div></div>';
      return `<div class="page-header"><div class="t"><h1>${esc(c.label)}</h1></div><div class="row">${canEdit() ? `<button class="btn" data-act="wsEditPage" data-id="${esc(id)}">${ico('edit') || ''}Edit page</button>` : ''}</div></div><div class="page-body"><div class="card" style="padding:18px">${V.md ? V.md(c.body || '') : esc(c.body || '')}${c.body ? '' : '<span class="muted">This page is empty. Use Edit page to add content.</span>'}</div></div>`;
    }
  };
  const PRESETS = { full: ['Full workspace (everything)', []], lean: ['Lean delivery (hide planning extras)', ['dashreport', 'contracts', 'kickoff', 'dashboards', 'timeline']], report: ['Reporting and handover (hide configuration and requirements)', ['modules', 'flow', 'roles', 'transcripts', 'usecases', 'checks', 'brd']] };
  const gIcon = g => (V.navIcon ? V.navIcon(g.ik) : ico(g.icon || 'flag'));
  const grip = '<span class="tl-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
  function layout() { return compute(V.navBase(), ws(), true, { mobile: false }); }
  const gByKey = k => layout().find(g => g.key === k);
  const typeOf = x => (KEEP.includes(x.id) ? 'Always shown' : x.custom ? 'Custom page' : 'Page');
  V.workspace = {
    html() {
      const base = V.navBase ? V.navBase() : []; const w = ws(); const can = canEdit();
      const gs = compute(base, w, true, {}); const q = (S.ui.wsQ || '').toLowerCase(); const cur = gs.find(g => g.key === S.ui.wsGroup) || gs[0]; if (cur) S.ui.wsGroup = cur.key;
      const head = `<div class="page-header"><div class="t"><h1>Tabs &amp; Layouts</h1><p>Arrange this project's menu the way the work flows: rename any group or tab, give groups an icon, create and delete groups, and drag tabs and groups into order. Hiding a tab only tidies the menu; every page still checks access on the server. Customers keep their own portal menu.</p></div><div class="row">${can ? `<select data-change="wsPreset" style="width:auto" aria-label="Apply a preset"><option value="">Apply a preset…</option>${Object.keys(PRESETS).map(k => `<option value="${k}">${esc(PRESETS[k][0])}</option>`).join('')}</select><button class="btn" data-act="wsSaveTpl">Save as template</button><button class="btn" data-act="wsReset">Reset to default</button>` : ''}</div></div>`;
      const glist = gs.filter(g => !q || g.g.toLowerCase().includes(q) || g.items.some(x => x.l.toLowerCase().includes(q)));
      const left = `<aside class="tl-groups" aria-label="Tab groups"><div class="tl-gh"><h3>Tab groups</h3>${can ? `<button class="btn sm" data-act="wsNewGroup">${ico('plus')}New Tab Group</button>` : ''}</div>
        <div class="tl-search">${ico('search')}<input type="search" id="wsQ" placeholder="Search groups" aria-label="Search groups" value="${esc(S.ui.wsQ || '')}"></div>
        <ul class="tl-glist" aria-label="Groups">${glist.map(g => { const shown = g.items.filter(x => !x.webHidden).length; return `<li class="tl-g${g === cur ? ' on' : ''}" draggable="${can}" data-g="${esc(g.key)}" data-wsg="${esc(g.key)}">${can ? grip : ''}<button type="button" class="tl-gsel" data-act="wsGroup" data-g="${esc(g.key)}"${g === cur ? ' aria-current="true"' : ''}><span class="tl-gi">${gIcon(g)}</span><span class="tl-gn">${esc(g.g)}</span><span class="tl-gc" title="${shown} shown in the menu">${shown}</span></button>${can ? `<span class="tl-gact"><button type="button" class="btn sm icon ghost" data-act="wsGroupEdit" data-g="${esc(g.key)}" aria-label="Edit group ${esc(g.g)}" title="Edit name and icon">${ico('edit')}</button><button type="button" class="btn sm icon ghost" data-act="wsGroupDel" data-g="${esc(g.key)}" aria-label="Delete group ${esc(g.g)}" title="Delete group"${gs.length < 2 ? ' disabled' : ''}>${ico('trash')}</button></span>` : ''}</li>`; }).join('') || '<li class="tl-none">No group matches.</li>'}</ul>
        ${can ? '<p class="xs muted tl-tip">Drag groups to reorder them. Drop a tab on a group to move it there.</p>' : ''}</aside>`;
      const rows = cur ? cur.items : []; const at = cur ? gs.indexOf(cur) : -1;
      const right = cur ? `<section class="tl-main" aria-label="${esc(cur.g)} tabs"><div class="tl-mh"><span class="tl-mi" aria-hidden="true">${gIcon(cur)}</span><div class="tl-mt"><h3>${esc(cur.g)}</h3><span class="xs muted">${rows.filter(x => !x.webHidden).length} of ${rows.length} shown${cur.g !== cur.key && cur.builtin ? ' · standard group “' + esc(cur.key) + '”' : cur.extra ? ' · added in this project' : ''}</span></div><span class="spacer"></span>${can ? `<span class="tl-mact"><button class="btn sm icon" data-act="wsGroupStep" data-g="${esc(cur.key)}" data-d="-1" aria-label="Move group up" title="Move group up"${at === 0 ? ' disabled' : ''}>${ico('up')}</button><button class="btn sm icon" data-act="wsGroupStep" data-g="${esc(cur.key)}" data-d="1" aria-label="Move group down" title="Move group down"${at === gs.length - 1 ? ' disabled' : ''}>${ico('down')}</button><button class="btn sm" data-act="wsGroupEdit" data-g="${esc(cur.key)}">${ico('edit')}Edit group</button><button class="btn sm primary" data-act="wsAddTab" data-g="${esc(cur.key)}">${ico('plus')}Add tabs</button></span>` : ''}</div>
        <ul class="tl-rows" data-wsg="${esc(cur.key)}">${rows.map((x, i) => `${x.sub && (!i || rows[i - 1].sub !== x.sub) ? `<li class="tl-sub" aria-hidden="true">${esc(x.sub)}</li>` : ''}<li class="tl-row${x.webHidden ? ' off' : ''}" draggable="${can}" data-wsid="${esc(x.id)}">${can ? grip : ''}<span class="tl-rn"><b>${esc(x.l)}</b><small>${typeOf(x)}${x.l !== x.orig ? ' · renamed from ' + esc(x.orig) : ''}${x.webHidden ? ' · hidden from the menu' : ''}${x.who !== 'all' ? ' · ' + esc(WHO[x.who]) : ''}</small></span>
          ${can ? `<span class="tl-rt"><button class="btn sm icon ghost" data-act="wsUp" data-id="${esc(x.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(x.l)} up" title="Move up">${ico('up')}</button><button class="btn sm icon ghost" data-act="wsDown" data-id="${esc(x.id)}" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(x.l)} down" title="Move down">${ico('down')}</button><button class="btn sm icon ghost" data-act="wsRename" data-id="${esc(x.id)}" aria-label="Edit ${esc(x.l)}" title="Edit tab">${ico('edit')}</button>${KEEP.includes(x.id) ? '' : x.webHidden ? `<button class="btn sm icon ghost tl-show" data-act="wsShowTab" data-id="${esc(x.id)}" aria-label="Show ${esc(x.l)} in the menu again" title="Show in the menu">${ico('plus')}</button>` : `<button class="btn sm icon ghost tl-rm" data-act="wsHideTab" data-id="${esc(x.id)}" aria-label="Remove ${esc(x.l)} from the menu" title="Remove from the menu (the page is kept)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg></button>`}</span>` : ''}</li>`).join('') || '<li class="tl-none">This group has no tabs yet. Use Add tabs, or drag a tab onto it.</li>'}</ul></section>` : '';
      // preview of the menu as it will look
      const pv = compute(base, w, false, {}); const preview = `<aside class="tl-prev" aria-label="Preview"><p class="tl-pk">Preview · side menu</p><div class="tl-pbox">${pv.map(g => `<div class="tl-pg"><b><i aria-hidden="true">${gIcon(g)}</i>${esc(g.g)}</b>${g.items.map(x => `<span${S.ui.view === x.id ? ' class="on"' : ''}>${esc(x.l)}</span>`).join('')}</div>`).join('')}</div></aside>`;
      return head + `<div class="page-body"><div class="tl-grid">${left}${right}${preview}</div></div>`;
    },
    mount() {
      const q = document.getElementById('wsQ'); if (q) q.addEventListener('input', () => { S.ui.wsQ = q.value; const pos = q.selectionStart; V.render(); const n = document.getElementById('wsQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
      document.querySelectorAll('.tl-gsel').forEach(b => b.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const all = [...document.querySelectorAll('.tl-gsel')]; const j = all.indexOf(b) + (e.key === 'ArrowDown' ? 1 : -1); if (all[j]) all[j].focus(); } }));
      if (!canEdit()) return; let drag = null;
      document.querySelectorAll('.tl-row[draggable="true"]').forEach(r => { r.addEventListener('dragstart', e => { drag = { tab: r.getAttribute('data-wsid') }; r.classList.add('drag'); try { e.dataTransfer.setData('text/plain', drag.tab); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } }); r.addEventListener('dragend', () => { r.classList.remove('drag'); document.querySelectorAll('.ws-over').forEach(x => x.classList.remove('ws-over')); });
        r.addEventListener('dragover', e => { if (drag && drag.tab) { e.preventDefault(); r.classList.add('ws-over'); } }); r.addEventListener('dragleave', () => r.classList.remove('ws-over')); r.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); if (drag && drag.tab) dropAt(drag.tab, r.closest('[data-wsg]').getAttribute('data-wsg'), r.getAttribute('data-wsid')); }); });
      document.querySelectorAll('.tl-g[data-wsg]').forEach(g => { g.addEventListener('dragstart', e => { drag = { group: g.getAttribute('data-wsg') }; g.classList.add('drag'); try { e.dataTransfer.setData('text/plain', drag.group); } catch (x) { } }); g.addEventListener('dragend', () => { g.classList.remove('drag'); document.querySelectorAll('.ws-over').forEach(x => x.classList.remove('ws-over')); });
        g.addEventListener('dragover', e => { if (drag) { e.preventDefault(); g.classList.add('ws-over'); } }); g.addEventListener('dragleave', () => g.classList.remove('ws-over'));
        g.addEventListener('drop', e => { e.preventDefault(); g.classList.remove('ws-over'); if (!drag) return; const to = g.getAttribute('data-wsg'); if (drag.tab) dropAt(drag.tab, to, null); else if (drag.group) moveGroup(drag.group, to); drag = null; }); });
      const rl = document.querySelector('.tl-rows'); if (rl) { rl.addEventListener('dragover', e => { if (drag && drag.tab) e.preventDefault(); }); rl.addEventListener('drop', e => { e.preventDefault(); if (drag && drag.tab) dropAt(drag.tab, rl.getAttribute('data-wsg'), null); }); }
    }
  };
  function commit(what) { F.changed(what, '', { section: 'workspace' }); }
  function setOrder(gs) { const w = ws(); w.order = {}; gs.forEach(g => { w.order[g.key] = g.items.map(x => x.id); }); w.groupOrder = gs.map(g => g.key); }
  // put a tab in a group (before another tab, or at the end); no commit, so several changes can be saved as one
  function place(id, group, before) {
    const gs = layout(); const w = ws(); let item = null; gs.forEach(g => { const i = g.items.findIndex(x => x.id === id); if (i >= 0) item = g.items.splice(i, 1)[0]; }); if (!item) return false;
    const tg = gs.find(g => g.key === group); if (!tg) return false; const at = before ? tg.items.findIndex(x => x.id === before) : -1; if (at >= 0) tg.items.splice(at, 0, item); else tg.items.push(item);
    // dropped among the tabs of a sub-heading: it joins that sub-heading
    if (at >= 0) { const ts = tg.items[at + 1].sub || ''; const dflt = group === item.home ? item.dsub || '' : ''; if (!w.sub) w.sub = {}; if (ts === dflt) delete w.sub[id]; else w.sub[id] = ts; } else if (group !== (layout().find(g => g.items.some(i => i.id === id)) || {}).key && w.sub) delete w.sub[id];
    setOrder(gs); if (item.custom) { const c = w.custom.find(x => 'cx_' + x.id === id); if (c) c.group = group; } else if (group === item.home) delete w.move[id]; else w.move[id] = group; return true;
  }
  function dropAt(id, group, before) { if (!id || id === before) return; if (place(id, group, before)) commit('Menu reordered'); }
  function moveGroup(from, to) { if (from === to) return; const w = ws(); const names = layout().map(g => g.key); const i = names.indexOf(from); if (i < 0) return; names.splice(i, 1); names.splice(names.indexOf(to), 0, from); w.groupOrder = names; commit('Menu groups reordered'); }
  ACT.wsGroupStep = a => { const g = a.getAttribute('data-g'), d = Number(a.getAttribute('data-d')); const w = ws(); const names = layout().map(x => x.key); const i = names.indexOf(g), j = i + d; if (i < 0 || j < 0 || j >= names.length) return; names[i] = names[j]; names[j] = g; w.groupOrder = names; commit('Menu groups reordered'); };
  ACT.wsGroup = a => { S.ui.wsGroup = a.getAttribute('data-g'); V.render(); const b = document.querySelector('.tl-g.on .tl-gsel'); if (b) b.focus(); };
  ACT.wsUp = a => step(a.getAttribute('data-id'), -1); ACT.wsDown = a => step(a.getAttribute('data-id'), 1);
  function step(id, d) { const gs = layout(); const g = gs.find(x => x.items.some(i => i.id === id)); if (!g) return; const i = g.items.findIndex(x => x.id === id), j = i + d; if (j < 0 || j >= g.items.length) return; const t = g.items[i]; g.items[i] = g.items[j]; g.items[j] = t; setOrder(gs); commit('Menu reordered'); }
  ACT.wsHide = el => { const w = ws(); const id = el.getAttribute('data-id'); if (KEEP.includes(id)) return; const s = new Set(w.hidden); el.checked ? s.delete(id) : s.add(id); w.hidden = [...s]; commit(el.checked ? 'Menu item shown' : 'Menu item hidden'); };
  ACT.wsHideTab = a => { const w = ws(); const id = a.getAttribute('data-id'); if (KEEP.includes(id)) return; if (!w.hidden.includes(id)) w.hidden = w.hidden.concat(id); commit('Menu item hidden'); toast('Removed from the menu. The page itself is kept; use + to show it again.', 4500); };
  ACT.wsShowTab = a => { const w = ws(); const id = a.getAttribute('data-id'); w.hidden = w.hidden.filter(x => x !== id); commit('Menu item shown'); };
  ACT.wsWho = el => { const w = ws(); const id = el.getAttribute('data-id'); if (KEEP.includes(id)) return; if (el.value === 'all') delete w.roles[id]; else w.roles[id] = el.value; commit('Menu visibility by role changed'); toast('Saved. This only changes the menu; page access is still checked on the server.', 5000); };
  ACT.wsMove = el => { const id = el.getAttribute('data-id'); dropAt(id, el.value, null); };
  ACT.wsPreset = el => { const p = PRESETS[el.value]; if (!p) return; const w = ws(); w.hidden = p[1].slice(); commit('Workspace preset applied'); toast('Preset applied'); };
  ACT.wsReset = async () => { if (!(await confirmDialog('Reset to default', 'Restore the standard menu? Renamed and deleted groups, group icons, custom pages and extra groups are reset too.', 'Reset', true))) return; const w = F.doc('workspace'); Object.keys(w).forEach(k => delete w[k]); Object.assign(w, wsNorm({ v: 3 })); S.ui.wsGroup = null; commit('Workspace reset'); };
  // new or edited group: a name and an icon (the icon grid follows Facilio's "New Tab Group" dialog)
  function groupForm(key) {
    const g = key ? gByKey(key) : null; const cur = g ? g.ik : 'l:flag'; const icons = (V.NAV_ICONS || []).slice(); if (cur && !icons.includes(cur)) icons.unshift(cur);
    const std = g && g.builtin ? `<p class="small muted" style="margin:6px 0 0">Standard group: <b>${esc(g.key)}</b>. Clear the name to restore it.</p>` : '';
    drawer(g ? 'Edit tab group' : 'New tab group', `<label class="f" for="wsg_n">Tab group name</label><input type="text" id="wsg_n" maxlength="40" placeholder="Enter group name" value="${esc(g ? g.g : '')}">${std}
      <fieldset class="tl-icons"><legend class="f">Choose icon<span class="xs muted"> Select an icon for this tab group</span></legend><input type="hidden" id="wsg_i" value="${esc(cur)}"><div class="tl-igrid" role="radiogroup" aria-label="Group icon">${icons.map(k => `<button type="button" class="tl-ic${k === cur ? ' on' : ''}" role="radio" aria-checked="${k === cur}" aria-label="${esc(k.slice(2).replace(/^g_/, '').replace(/_/g, ' '))}" title="${esc(k.slice(2).replace(/^g_/, '').replace(/_/g, ' '))}" data-act="wsPickIcon" data-k="${esc(k)}">${V.navIcon(k)}</button>`).join('')}</div></fieldset>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsGroupSave" data-g="${esc(key || '')}">${g ? 'Save' : 'Create'}</button>`);
    const n = document.getElementById('wsg_n'); if (n) n.focus();
  }
  ACT.wsPickIcon = a => { const k = a.getAttribute('data-k'); const h = document.getElementById('wsg_i'); if (h) h.value = k; document.querySelectorAll('.tl-ic').forEach(b => { const on = b === a; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); };
  ACT.wsNewGroup = () => groupForm(null);
  ACT.wsGroupEdit = a => groupForm(a.getAttribute('data-g'));
  ACT.wsGroupRename = ACT.wsGroupEdit;
  ACT.wsGroupSave = a => {
    const key = a.getAttribute('data-g'); const w = ws(); const val = i => ((document.getElementById(i) || {}).value || '').trim(); let name = val('wsg_n'); const icon = val('wsg_i');
    const gs = layout(); const g = key ? gs.find(x => x.key === key) : null; if (!name && g && g.builtin) name = g.key; if (!name) { toast('Name the group'); return; }
    if (gs.some(x => x.key !== key && (x.g.toLowerCase() === name.toLowerCase() || x.key.toLowerCase() === name.toLowerCase()))) { toast('A group with that name exists'); return; }
    if (!g) { const taken = n => gs.some(x => x.key === n) || (w.gdel || {})[n] !== undefined || (V.navBase() || []).some(b => b.g === n); let k = name; for (let i = 2; taken(k); i++) k = name + ' ' + i; w.groups = (w.groups || []).concat(k); if (k !== name) w.gl[k] = name; if (icon) w.gi[k] = icon; S.ui.wsGroup = k; closeDrawer(); commit('Tab group created'); return; }
    if (name === g.key) delete w.gl[key]; else w.gl[key] = name;
    const std = (V.navBase() || []).find(b => b.g === key); const dflt = std ? (std.fi ? 'f:' + std.fi : 'l:' + (std.icon || 'flag')) : ''; if (icon && icon !== dflt) w.gi[key] = icon; else delete w.gi[key];
    closeDrawer(); commit('Tab group updated');
  };
  // delete any group; its tabs move to the group chosen here (a standard group is remembered as deleted, Reset brings it back)
  ACT.wsGroupDel = a => {
    const key = a.getAttribute('data-g'); const gs = layout(); const g = gs.find(x => x.key === key); if (!g) return; if (gs.length < 2) { toast('Keep at least one group'); return; }
    const others = gs.filter(x => x.key !== key); const n = g.items.length;
    drawer('Delete tab group', `<p style="margin-top:0">Delete <b>${esc(g.g)}</b>?${g.builtin ? ' It is a standard group; Reset to default brings it back.' : ''}</p>${n ? `<label class="f" for="wsg_to">Move its ${n} tab${n === 1 ? '' : 's'} to</label><select id="wsg_to">${others.map(x => `<option value="${esc(x.key)}">${esc(x.g)}</option>`).join('')}</select><p class="small muted">Tabs are never deleted with a group; they keep their names and settings.</p>` : '<p class="small muted">The group is empty.</p>'}`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn danger" data-act="wsGroupDelGo" data-g="${esc(key)}">Delete group</button>`);
  };
  ACT.wsGroupDelGo = a => {
    const key = a.getAttribute('data-g'); const w = ws(); const gs = layout(); const g = gs.find(x => x.key === key); if (!g) { closeDrawer(); return; }
    const to = ((document.getElementById('wsg_to') || {}).value) || (gs.find(x => x.key !== key) || {}).key; if (!to) { closeDrawer(); return; }
    g.items.slice().forEach(x => place(x.id, to, null));
    if (g.builtin) w.gdel[key] = to; else w.groups = (w.groups || []).filter(x => x !== key);
    Object.keys(w.move).forEach(k => { if (w.move[k] === key) w.move[k] = to; }); delete w.gl[key]; delete w.gi[key]; delete w.order[key]; w.groupOrder = w.groupOrder.filter(x => x !== key); w.mobile.groupOrder = (w.mobile.groupOrder || []).filter(x => x !== key);
    S.ui.wsGroup = to; closeDrawer(); commit('Tab group deleted'); toast(g.items.length ? 'Group deleted; its tabs moved' : 'Group deleted');
  };
  // Add tabs: bring an existing tab into this group, show a hidden one, or create a custom page here
  ACT.wsAddTab = a => { const g = a.getAttribute('data-g'); const gs = layout(); const gl = (gs.find(x => x.key === g) || {}).g || g; const all = gs.flatMap(x => x.items.map(i => Object.assign({ grp: x.key, grpl: x.g }, i))).filter(i => i.grp !== g || i.webHidden);
    drawer('Add tabs to ' + gl, `<p class="small muted" style="margin-top:0">Pick a page to move into this group (hidden pages are shown again), or create a custom page.</p><input type="search" id="wsa_q" placeholder="Search tabs" aria-label="Search tabs"><ul class="tl-add" id="wsa_l">${all.map(i => `<li data-q="${esc((i.l + ' ' + i.grpl).toLowerCase())}"><button type="button" class="tl-addb" data-act="wsAddTabGo" data-id="${esc(i.id)}" data-g="${esc(g)}"><b>${esc(i.l)}</b><small>${esc(i.grpl)}${i.webHidden ? ' · hidden' : ''}</small></button></li>`).join('')}</ul>`,
      `<button class="btn" data-act="wsAddPage">${ico('plus')}Custom page</button><span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`, { wide: true });
    const q = document.getElementById('wsa_q'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll('#wsa_l li').forEach(li => { li.hidden = v && !li.getAttribute('data-q').includes(v); }); }); q.focus(); };
  ACT.wsAddTabGo = a => { const id = a.getAttribute('data-id'), g = a.getAttribute('data-g'); const w = ws(); w.hidden = w.hidden.filter(x => x !== id); closeDrawer(); dropAt(id, g, null); toast('Added to ' + ((gByKey(g) || {}).g || g)); };
  // edit a tab: label, group, shown in the menu, who sees it — all in one place
  ACT.wsRename = a => {
    const id = a.getAttribute('data-id'); const w = ws(); const c = id.startsWith('cx_') ? w.custom.find(x => 'cx_' + x.id === id) : null;
    if (c) return ACT.wsAddPage({ getAttribute: k => (k === 'data-id' ? c.id : null) });
    const gs = layout(); const g = gs.find(x => x.items.some(i => i.id === id)); const x = g && g.items.find(i => i.id === id); if (!x) return; const keep = KEEP.includes(id);
    drawer('Edit tab', `<label class="f" for="ws_l">Menu label</label><input type="text" id="ws_l" maxlength="40" value="${esc(w.labels[id] || x.orig)}"><p class="small muted" style="margin:6px 0 0">Original name: ${esc(x.orig)}. Leave blank to restore it.</p>
      <label class="f" for="ws_g">Tab group</label><select id="ws_g">${gs.map(o => `<option value="${esc(o.key)}"${o === g ? ' selected' : ''}>${esc(o.g)}</option>`).join('')}</select>
      <label class="f" for="ws_sub">Sub-heading <span class="xs muted">optional, groups tabs inside the group</span></label><input type="text" id="ws_sub" maxlength="40" list="ws_subs" value="${esc(x.sub)}" placeholder="e.g. Requirements & Design"><datalist id="ws_subs">${[...new Set(gs.flatMap(o => o.items.map(i => i.sub)).filter(Boolean))].map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      ${keep ? '<p class="small muted">This tab is always shown so the menu can always be changed back.</p>' : `<label class="f" for="ws_w">Who sees it in the menu</label><select id="ws_w">${Object.keys(WHO).map(k => `<option value="${k}"${x.who === k ? ' selected' : ''}>${WHO[k]}</option>`).join('')}</select>
      <label class="tl-chk"><input type="checkbox" id="ws_s"${x.webHidden ? '' : ' checked'}> Show in the menu</label><p class="small muted" style="margin:4px 0 0">The menu only; page access is still checked on the server.</p>`}`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsRenameGo" data-id="${esc(id)}">Save</button>`);
    const l = document.getElementById('ws_l'); if (l) l.focus();
  };
  ACT.wsRenameGo = a => {
    const w = ws(); const id = a.getAttribute('data-id'); const v = ((document.getElementById('ws_l') || {}).value || '').trim(); const base = V.navBase().flatMap(g => g.items).find(i => i[0] === id);
    if (v && (!base || v !== base[1])) w.labels[id] = v; else delete w.labels[id];
    if (!KEEP.includes(id)) { const s = document.getElementById('ws_s'); if (s) { const h = new Set(w.hidden); s.checked ? h.delete(id) : h.add(id); w.hidden = [...h]; } const who = document.getElementById('ws_w'); if (who) { if (who.value === 'all') delete w.roles[id]; else w.roles[id] = who.value; } }
    const to = (document.getElementById('ws_g') || {}).value; const g = layout().find(x => x.items.some(i => i.id === id)); const was = g && (g.items.find(i => i.id === id) || {}).sub; const moved = !!(to && g && g.key !== to); if (moved) place(id, to, null);
    const se = document.getElementById('ws_sub'); if (se) { let sv = se.value.trim(); if (moved && sv === was) sv = ''; const it = layout().flatMap(o => o.items).find(i => i.id === id); const dflt = it && it.g === it.home ? it.dsub || '' : ''; if (!w.sub) w.sub = {}; if (sv === dflt) delete w.sub[id]; else w.sub[id] = sv; }
    closeDrawer(); commit('Menu item updated'); toast('Saved');
  };
  ACT.wsAddPage = a => {
    const id = a && a.getAttribute && a.getAttribute('data-id'); const w = ws(); const c = id ? w.custom.find(x => x.id === id) : null; const gs = layout(); const def = c ? c.group : (S.ui.wsGroup || (gs[0] || {}).key);
    drawer(c ? 'Edit page' : 'Add a page', `<label class="f">Menu label</label><input type="text" id="cp_l" maxlength="40" value="${esc(c ? c.label : '')}" placeholder="e.g. Customer escalation contacts"><label class="f">Tab group</label><select id="cp_g">${gs.map(g => `<option value="${esc(g.key)}"${def === g.key ? ' selected' : ''}>${esc(g.g)}</option>`).join('')}<option value="__new">New group…</option></select><input type="text" id="cp_gn" maxlength="30" placeholder="New group name" style="display:none;margin-top:6px"><label class="f">Content (headings with #, lists with -, tables with |)</label><textarea id="cp_b" rows="12">${esc(c ? c.body : '')}</textarea>`,
      `${c ? `<button class="btn danger" data-act="wsDelPage" data-id="${esc(id)}">Delete page</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="wsPageGo" data-id="${esc(id || '')}">Save</button>`, { wide: true });
    const sel = document.getElementById('cp_g'); if (sel) sel.addEventListener('change', () => { document.getElementById('cp_gn').style.display = sel.value === '__new' ? '' : 'none'; });
  };
  ACT.wsEditPage = a => ACT.wsAddPage(a);
  ACT.wsPageGo = a => {
    const w = ws(); const g = i => (document.getElementById(i) || {}).value || ''; const label = g('cp_l').trim(); if (!label) { toast('Enter a menu label'); return; } let grp = g('cp_g'); if (grp === '__new') { grp = g('cp_gn').trim(); if (grp && !layout().some(x => x.key === grp)) w.groups = (w.groups || []).concat(grp); } if (!grp) { toast('Name the group'); return; }
    const id = a.getAttribute('data-id'); if (id) { const c = w.custom.find(x => x.id === id); if (c) Object.assign(c, { label, group: grp, body: g('cp_b') }); } else { w.custom.push({ id: 'p' + Date.now().toString(36), label, group: grp, body: g('cp_b') }); }
    closeDrawer(); commit('Workspace page saved'); toast('Saved');
  };
  ACT.wsDelPage = async a => { if (!(await confirmDialog('Delete page', 'Remove this page from the workspace?', 'Delete', true))) return; const w = ws(); w.custom = w.custom.filter(x => x.id !== a.getAttribute('data-id')); closeDrawer(); commit('Workspace page removed'); if (/^cx_/.test(S.ui.view || '')) V.go('workspace'); };
  ACT.wsSaveTpl = () => ACT.tplNew({ getAttribute: () => 'workspace' });
})(typeof window !== 'undefined' ? window : globalThis);
