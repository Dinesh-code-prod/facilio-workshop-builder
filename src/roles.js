/* Roles & Access Permissions — modelled on facilio-setup Roles/RolesList.vue, RoleDetailsForm.vue and NewWebTabPermission.vue
   (per-tab blocks of switches; Read/Update/Delete groups with All/Team/Own). Permission values are decoded with the verified
   NewPermissionUtil moduleTabType bits. Also: actor categories, transition responsibility, portal workflows, access matrix, permission checks. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const T = root.FWBText; const D = root.FWBDiagrams; const ACT = V.ACT;
  const { tag, sel, drawer, closeDrawer, toast, ico, sw, confirmDialog } = V;

  // ---------- permission catalog (NewPermissionUtil.permissionList, verified bits only) ----------
  const BIT = {}; F.P.MODULE_BITS.forEach(([b, k]) => { BIT[k] = BigInt(b); });
  const G = (label, opts) => ({ group: label, opts }); const A3 = (k, t, o) => [['All', k], ['Team', t], ['Own', o]]; const A2 = (k, o) => [['All', k], ['Own', o]];
  const DEF = [['CREATE', 'Create'], ['READ', 'Read'], ['UPDATE', 'Update'], ['DELETE', 'Delete'], ['EXPORT', 'Export']];
  const WOISH = [['CREATE', 'Create'], G('Read', A3('READ', 'READ_TEAM', 'READ_OWN')), G('Update', A3('UPDATE', 'UPDATE_TEAM', 'UPDATE_OWN')), G('Delete', A3('DELETE', 'DELETE_TEAM', 'DELETE_OWN')), ['EXPORT', 'Export']];
  const CATALOG = {
    '*': DEF,
    workorder: [['CREATE', 'Create'], G('Read', A3('READ', 'READ_TEAM', 'READ_OWN')), G('Update', A3('UPDATE', 'UPDATE_TEAM', 'UPDATE_OWN')), ['UPDATE_CHANGE_OWNERSHIP', 'Change Ownership'], ['UPDATE_CLOSE_WORKORDER', 'Close Workorder'], ['UPDATE_WORKORDER_TASK', 'Execute Task'], ['UPDATE_TASK', 'Manage Task (Add)'], G('Delete', A3('DELETE', 'DELETE_TEAM', 'DELETE_OWN')), ['EXPORT', 'Export'], ['MANAGE_INVENTORY', 'Manage Inventory'], ['APPROVE_SWMS', 'Approve SWMS']],
    workpermit: [['CREATE', 'Create'], ['READ', 'Read'], ['UPDATE', 'Update'], ['UPDATE_REVIEW', 'Review'], ['DELETE', 'Delete'], ['EXPORT', 'Export'], ['REQUISITE_SUBMISSION', 'Requisite Submission']],
    inventoryrequest: [['CREATE', 'Create'], G('Read', A2('READ', 'READ_OWN')), G('Update', A2('UPDATE', 'UPDATE_OWN')), G('Delete', A2('DELETE', 'DELETE_OWN')), ['EXPORT', 'Export'], ['RESERVE_INVENTORY', 'Reserve'], ['ISSUE_INVENTORY', 'Issue'], ['ASSIGN_STOREROOM', 'Assign Storeroom']],
    preventivemaintenance: WOISH, plannedmaintenance: WOISH,
    asset: DEF.concat([['CONTROL', 'Control']]),
    tenantcontact: DEF.concat([['MANAGE_ACCESS', 'Manage Access']]), vendorcontact: DEF.concat([['MANAGE_ACCESS', 'Manage Access']]), clientcontact: DEF.concat([['MANAGE_ACCESS', 'Manage Access']])
  };
  const catalog = m => CATALOG[m] || DEF;
  const has = (bits, k) => BIT[k] !== undefined && (BigInt(bits || 0) & BIT[k]) === BIT[k];
  function labels(m, bits) { const out = []; catalog(m).forEach(r => { if (r.group) { const o = r.opts.find(([, k]) => has(bits, k)); if (o) out.push(r.group + (o[0] === 'All' ? '' : ' (' + o[0] + ')')); } else if (has(bits, r[0])) out.push(r[1]); }); return out; }
  function knownMask(m) { let k = 0n; catalog(m).forEach(r => { (r.group ? r.opts.map(o => o[1]) : [r[0]]).forEach(x => { if (BIT[x] !== undefined) k |= BIT[x]; }); }); return k; }
  function generic(m, bits) { const b = BigInt(bits || 0); const any = ks => ks.some(k => has(b, k)); return { view: any(['READ', 'READ_TEAM', 'READ_OWN']), create: any(['CREATE']), edit: any(['UPDATE', 'UPDATE_TEAM', 'UPDATE_OWN']), delete: any(['DELETE', 'DELETE_TEAM', 'DELETE_OWN']), export: any(['EXPORT']), approve: any(['UPDATE_REVIEW', 'APPROVE_SWMS']) }; }
  V.permLabels = labels;
  // permText understands both the bitmask model and legacy flag objects
  F.permText = function (p, m) { if (p && p.bits !== undefined) return labels(m || p.module || '*', p.bits).join(', ') || 'No access'; return F.PERMS.filter(k => p && p[k]).map(k => k[0].toUpperCase() + k.slice(1)).join(', ') || 'No access'; };

  function roleOfActor(a) { return a.roleName && S.baseline ? S.baseline.roles.find(r => r.name === a.roleName && (a.apps || []).join(',') === r.apps.join(',')) || S.baseline.roles.find(r => r.name === a.roleName) : null; }
  // configured bits for an actor and module (OR across its tabs for that module)
  function baseBits(a, m) { const r = roleOfActor(a); if (!r) return null; if (r.privileged || r.superAdmin) return { full: true }; const ps = r.permissions.filter(p => p.modules.indexOf(m) >= 0 && p.decoded); if (!ps.length) return null; let b = 0n; ps.forEach(p => { try { b |= BigInt(p.raw || 0); } catch (e) { } }); return { bits: b.toString(), tabs: ps, unknown: (b & ~knownMask(m)) !== 0n }; }
  function propBits(aid, m) { const r = S.ws.roles.find(x => x.id === aid); const p = r ? (r.perms || {})[m] : (S.ws.rolePermOps[aid] || {})[m]; if (!p) return null; if (p.bits !== undefined) return p.bits; let b = 0n; if (p.view) b |= BIT.READ; if (p.create) b |= BIT.CREATE; if (p.edit) b |= BIT.UPDATE; if (p.delete) b |= BIT.DELETE; if (p.export) b |= BIT.EXPORT; return b.toString(); }
  function effBits(aid, m) { const p = propBits(aid, m); if (p !== null) return p; const b = baseBits(F.actor(aid), m); return b ? (b.full ? 'full' : b.bits) : '0'; }
  V.existingPerm = (a, m) => { const b = baseBits(a, m); if (!b) return null; if (b.full) return { text: 'Full access (privileged role)', full: true }; return { text: labels(m, b.bits).join(', ') || 'No module actions', unknown: b.unknown, raw: b.tabs.map(p => p.app + '/' + p.tab + '=' + p.raw).join('; ') }; };
  V.proposedPerm = (aid, m) => { const p = propBits(aid, m); return p === null ? null : Object.assign({ bits: p, module: m }, generic(m, p)); };
  V.effBits = effBits;
  function transitionsFor(aid) { const out = []; F.allFlows().forEach(id => { const f = F.flowModel(id); if (!f) return; f.transitions.filter(t => !t.removed && ((t.actors || []).some(a => a.actor === aid) || (t.approval && t.approval.required && (t.approval.approvers || []).indexOf(aid) >= 0))).forEach(t => out.push({ f, t })); }); return out; }
  V.transitionsFor = transitionsFor;

  // ================= VIEW =================
  V.roles = { html() {
    if (S.ui.roleEdit) return permEditor(S.ui.roleEdit);
    const tab = S.ui.rolesTab || 'roles'; const issues = permIssues();
    const tabs = [['roles', 'Roles', F.allActors().filter(a => a.roleName || a.origin === 'proposed').length], ['actors', 'Actors by category'], ['resp', 'Transition responsibility'], ['portals', 'Portal workflows', S.ws.processes.length], ['matrix', 'Access matrix'], ['issues', 'Permission checks', issues.filter(i => i.sev !== 'info').length]];
    return `<div class="page-header"><div class="t"><h1>Roles &amp; Permissions</h1><p>Configured internal and portal roles, actors whose role is not specified, and roles proposed in the workshop. Roles are never invented: when the configuration does not name one, the action is shown as “User / Role to Be Confirmed”.</p></div>
      <div class="row">${V.reviewWidget('_roles', 'roles', 'Review')}<button class="btn" data-act="exportRolesJson">${ico('dl')}Roles JSON</button>${S.readonly ? '' : `<button class="btn primary" data-act="newRole">New Role</button>`}</div></div>
      <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab${tab === k ? ' active' : ''}" data-act="rolesTab" data-v="${k}">${esc(l)}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}</div><div class="page-body">${(RT[tab] || RT.roles)()}</div>`;
  }, mount() { const q = document.getElementById('permq'); if (q) q.addEventListener('input', () => { S.ui.permq = q.value; document.querySelectorAll('[data-permnav]').forEach(x => { x.style.display = !q.value || x.textContent.toLowerCase().includes(q.value.toLowerCase()) ? '' : 'none'; }); }); } };
  ACT.rolesTab = a => { S.ui.rolesTab = a.getAttribute('data-v'); V.render(); };
  const RT = {};
  RT.roles = () => {
    const q = (S.ui.roleq || '').toLowerCase(); const cat = S.ui.roleCat || 'all';
    const rank = a => /super administrator/i.test(a.label) ? 0 : /^administrator$/i.test(a.label) || /\badministrator$/i.test(a.label) && a.privileged ? 1 : 2;
    const list = F.allActors().filter(a => (a.roleName || a.origin === 'proposed') && (cat === 'all' || a.category === cat) && (!q || a.label.toLowerCase().includes(q))).sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
    return `<div class="row" style="margin-bottom:12px"><div class="search" style="width:240px">${ico('search')}<input type="search" placeholder="Search" data-ui="roleq" value="${esc(S.ui.roleq || '')}"></div><div class="seg">${['all', 'internal', 'vendor', 'tenant', 'client', 'occupant', 'employee'].map(c => `<button class="${cat === c ? 'on' : ''}" data-act="roleCat" data-v="${c}">${c === 'all' ? 'All' : esc((F.CATEGORY_LABEL[c] || c).replace(' User', '').replace('Internal Facilio', 'Internal'))}</button>`).join('')}</div><span class="small muted">${list.length} roles</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Description</th><th>App</th><th>Category</th><th class="num">Active users</th><th class="num">Flow actions</th><th>Source</th><th></th></tr></thead><tbody>${list.map(a => { const n = transitionsFor(a.id).length; const changed = Object.keys(S.ws.rolePermOps[a.id] || {}).length;
        return `<tr class="${a.privileged ? '' : 'click'}" ${a.privileged ? '' : `data-act="openRole" data-id="${esc(a.id)}"`}><td>${a.privileged ? `<b>${esc(a.label)}</b>` : `<a href="#"><b>${esc(a.label)}</b></a>`}${a.privileged ? ' ' + tag('system', 'Privileged') : ''}</td><td class="small">${esc(a.description || '') || '<span class="dash">---</span>'}</td><td class="small">${esc((a.apps || []).map(l => (S.baseline && (S.baseline.apps.find(x => x.link === l) || {}).name) || l).join(', ')) || '<span class="dash">---</span>'}</td><td class="small">${esc(F.CATEGORY_LABEL[a.category] || a.category)}</td><td class="num">${a.activeUsers || 0}</td><td class="num">${n}</td>
        <td>${a.origin === 'proposed' ? tag('proposed', 'Proposed') : changed ? tag('modified', changed + ' module change' + (changed > 1 ? 's' : '')) : tag('configured', 'Configured')}</td><td class="acts">${a.origin === 'proposed' && !S.readonly ? `<button class="btn sm" data-act="editRole" data-id="${esc(a.id)}">${ico('edit')}</button><button class="btn sm" data-act="deleteRole" data-id="${esc(a.id)}" aria-label="Delete">${ico('trash')}</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No roles</td></tr>'}</tbody></table></div>
      <div class="xs muted" style="margin-top:8px">Privileged roles (Super Administrator, Administrator) have full access and cannot be edited, as in Facilio setup.</div>`;
  };
  ACT.roleCat = a => { S.ui.roleCat = a.getAttribute('data-v'); V.render(); };
  ACT.openRole = a => { const id = a.getAttribute('data-id'); S.ui.roleEdit = id; S.ui.roleDraft = null; V.render(); };

  // ---------- permission editor (NewWebTabPermission.vue) ----------
  function permModules(aid) {
    const a = F.actor(aid); const r = roleOfActor(a); const set = new Set();
    if (r) r.permissions.filter(p => p.decoded).forEach(p => p.modules.forEach(m => set.add(m)));
    F.allModules().filter(m => m.inScope).forEach(m => set.add(m.name));
    Object.keys(S.ws.rolePermOps[aid] || {}).forEach(m => set.add(m)); const pr = S.ws.roles.find(x => x.id === aid); if (pr) Object.keys(pr.perms || {}).forEach(m => set.add(m));
    return [...set].filter(m => F.moduleView(m)).sort((x, y) => (F.moduleView(x).label).localeCompare(F.moduleView(y).label));
  }
  function draft(aid) { if (!S.ui.roleDraft) { S.ui.roleDraft = {}; permModules(aid).forEach(m => { S.ui.roleDraft[m] = effBits(aid, m); }); } return S.ui.roleDraft; }
  function permEditor(aid) {
    const a = F.actor(aid); const r = roleOfActor(a); const d = draft(aid); const mods = permModules(aid); const ro = S.readonly; const dirty = mods.some(m => d[m] !== effBits(aid, m));
    const ts = transitionsFor(aid);
    const block = m => { const mv = F.moduleView(m); const b = baseBits(a, m); const base = b ? (b.full ? null : b.bits) : '0'; const cur = d[m] || '0'; const on = cur !== '0'; const inTabs = b && b.tabs;
      const rows = catalog(m).map(row => { if (row.group) { const opt = row.opts.find(([, k]) => has(cur, k)); const bopt = row.opts.find(([, k]) => has(base, k)); const ch = (opt || [])[1] !== (bopt || [])[1];
          return `<div class="perm-row${ch ? ' changed' : ''}">${sw('', !!opt, `data-change="permGroup" data-m="${esc(m)}" data-g="${esc(row.group)}" ${ro ? 'disabled' : ''}`)}<span class="l">${esc(row.group)}</span>${opt ? `<span class="radios">${row.opts.map(([l, k]) => `<label><input type="radio" name="${esc(m + row.group)}" ${opt[1] === k ? 'checked' : ''} data-change="permScope" data-m="${esc(m)}" data-g="${esc(row.group)}" data-k="${k}" ${ro ? 'disabled' : ''}>${l}</label>`).join('')}</span>` : ''}</div>`; }
        const v = has(cur, row[0]); const ch = v !== has(base, row[0]); return `<div class="perm-row${ch ? ' changed' : ''}">${sw('', v, `data-change="permBit" data-m="${esc(m)}" data-k="${row[0]}" ${ro ? 'disabled' : ''}`)}<span class="l">${esc(row[1])}</span></div>`; }).join('');
      const unknown = (BigInt(cur || 0) & ~knownMask(m)) !== 0n;
      return `<div class="perm-tab${on ? '' : ' off'}" id="pt_${esc(F.slug(m))}"><div class="hd">${esc(mv.label)}<span class="xs muted" style="font-weight:400">${inTabs ? esc(b.tabs.map(t => t.app + ' › ' + t.tabLabel).join(', ')) : 'Not a tab of this role today'}</span><span class="spacer"></span><span class="xs muted" style="font-weight:400">${on ? 'Enabled' : 'Enable'}</span>${sw('', on, `data-change="permTab" data-m="${esc(m)}" ${ro ? 'disabled' : ''}`)}</div>
        <div class="perm-rows">${rows}</div>${unknown ? `<div class="xs" style="margin-top:6px">${tag('tbc', 'Additional permission bits')} The configured value (${esc(cur)}) contains bits not in this module's verified catalog — confirm in Facilio setup.</div>` : ''}${m === 'workorder' ? '<div class="xs muted" style="margin-top:6px">“Execute Work Order” is stored in a separate permission column and is not part of this value.</div>' : ''}</div>`; };
    return `<div class="page-header"><button class="back-btn" data-act="closeRole" aria-label="Back">${ico('left')}</button><div class="t"><h1>${esc(a.label)}</h1><p>${esc(a.description || (r && r.description) || F.CATEGORY_LABEL[a.category] || '')}${r ? ` · ${esc(r.apps.join(', ') || '—')} · <span class="mono xs">${esc(r.ref.file)} #${esc(r.ref.uid)}</span>` : ''}</p></div>
      <div class="row">${dirty ? tag('orange', 'Unsaved changes') : ''}<button class="btn" data-act="closeRole">Cancel</button>${ro ? '' : `<button class="btn primary" data-act="saveRolePerms" ${dirty ? '' : 'disabled'}>Save</button>`}</div></div>
      <div class="page-body"><div class="notice" style="margin-bottom:12px">Switches show the configured permission for each module tab; changes you make are kept as workshop proposals (highlighted) and never alter the source configuration. Modules in BRD scope are listed even when they are not a tab of this role today.</div>
      <div class="perm-layout"><div class="perm-nav"><div style="padding:10px"><input type="search" id="permq" placeholder="Search tabs"></div>${mods.map(m => { const on = (d[m] || '0') !== '0'; const ch = d[m] !== effBits(aid, m) || propBits(aid, m) !== null; return `<div class="grp" data-permnav="1" data-act="permJump" data-m="${esc(F.slug(m))}"><span class="status-dot" style="background:${on ? '#46ca87' : '#d0d9e2'}"></span>${esc(F.moduleView(m).label)}${ch ? ' ' + tag('proposed', 'changed') : ''}</div>`; }).join('')}</div>
      <div class="perm-main">${mods.map(block).join('') || '<div class="empty">No module tabs.</div>'}
      ${ts.length ? `<div class="pink-label">Stateflow actions assigned to this role (${ts.length})</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>Transition</th><th>Assignment</th><th>Has update access</th></tr></thead><tbody>${ts.map(x => { const as = (x.t.actors || []).find(z => z.actor === aid); const okU = generic(x.f.module, d[x.f.module] || effBits(aid, x.f.module)).edit || (d[x.f.module] || effBits(aid, x.f.module)) === 'full'; return `<tr><td>${esc((F.moduleView(x.f.module) || {}).label || x.f.module)}</td><td><a href="#" data-act="navTo" data-nav="${esc(JSON.stringify({ view: 'flow', flowId: x.f.id, sel: x.t.id }))}">${esc(x.t.name)}</a></td><td>${as ? tag(as.status === 'tbc' ? 'tbc' : as.status, F.ACTOR_STATUS[as.status] || as.status) : tag('blue', 'Approver')}</td><td>${okU ? tag('green', 'Yes') : tag('red', 'No — missing')}</td></tr>`; }).join('')}</tbody></table></div>` : ''}</div></div></div>`;
  }
  ACT.closeRole = async () => { const aid = S.ui.roleEdit; const d = S.ui.roleDraft || {}; if (Object.keys(d).some(m => d[m] !== effBits(aid, m)) && !(await confirmDialog('Unsaved changes', 'Leave without saving the permission changes?', 'Leave', true))) return; S.ui.roleEdit = null; S.ui.roleDraft = null; V.render(); };
  ACT.permJump = a => { const el = document.getElementById('pt_' + a.getAttribute('data-m')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  function setBits(m, fn) { const d = S.ui.roleDraft; let b = BigInt(d[m] === 'full' ? 0 : d[m] || 0); b = fn(b); d[m] = b.toString(); const pm = document.querySelector('.perm-main'); const st = pm ? pm.scrollTop : 0; V.render(); const n = document.querySelector('.perm-main'); if (n) n.scrollTop = st; }
  ACT.permBit = el => { const k = el.getAttribute('data-k'); setBits(el.getAttribute('data-m'), b => el.checked ? b | BIT[k] : b & ~BIT[k]); };
  ACT.permGroup = el => { const m = el.getAttribute('data-m'); const g = catalog(m).find(r => r.group === el.getAttribute('data-g')); setBits(m, b => { g.opts.forEach(([, k]) => { b &= ~BIT[k]; }); return el.checked ? b | BIT[g.opts[0][1]] : b; }); };
  ACT.permScope = el => { const m = el.getAttribute('data-m'); const g = catalog(m).find(r => r.group === el.getAttribute('data-g')); setBits(m, b => { g.opts.forEach(([, k]) => { b &= ~BIT[k]; }); return b | BIT[el.getAttribute('data-k')]; }); };
  ACT.permTab = el => { const m = el.getAttribute('data-m'); setBits(m, b => el.checked ? (b || (BIT.READ)) : 0n); };
  ACT.saveRolePerms = () => {
    const aid = S.ui.roleEdit; const d = S.ui.roleDraft; const prop = S.ws.roles.find(r => r.id === aid); const a = F.actor(aid); let n = 0;
    Object.keys(d).forEach(m => { const b = baseBits(a, m); const base = b ? (b.full ? 'full' : b.bits) : '0'; const store = prop ? (prop.perms = prop.perms || {}) : (S.ws.rolePermOps[aid] = S.ws.rolePermOps[aid] || {});
      if (d[m] === base && !prop) { if (store[m]) { delete store[m]; n++; } return; } if (prop && d[m] === '0') { delete store[m]; return; }
      if (!store[m] || store[m].bits !== d[m]) n++; store[m] = Object.assign({ bits: d[m], base, module: m }, generic(m, d[m])); });
    if (!prop && S.ws.rolePermOps[aid] && !Object.keys(S.ws.rolePermOps[aid]).length) delete S.ws.rolePermOps[aid];
    S.ui.roleDraft = null; F.changed('Role permissions proposed', a.label + (n ? ' — ' + n + ' module(s)' : '')); toast('Permissions saved as workshop proposals');
  };

  // ---------- proposed roles ----------
  ACT.newRole = () => roleDrawer(null);
  ACT.editRole = a => roleDrawer(S.ws.roles.find(r => r.id === a.getAttribute('data-id')));
  function roleDrawer(r) {
    drawer(r ? 'Edit Role' : 'New Role', `<div class="notice" style="margin-bottom:14px">New roles are workshop proposals. Pick the actor category so the role appears in the right portal lane.</div><div class="fgrid"><div class="full"><label class="f">Name <span class="req">*</span></label><input type="text" id="rl_label" value="${esc(r ? r.label : '')}"></div><div class="full"><label class="f">Actor category</label>${sel('', ['internal', 'vendor', 'client', 'tenant', 'occupant', 'employee', 'external'].map(c => ({ v: c, l: F.CATEGORY_LABEL[c] })), r ? r.category : 'internal', 'id="rl_cat"')}</div><div class="full"><label class="f">Description</label><textarea id="rl_desc" rows="4">${esc(r ? r.description : '')}</textarea></div></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="saveRole" data-id="${esc(r ? r.id : '')}">Confirm</button>`);
  }
  ACT.saveRole = a => { const label = document.getElementById('rl_label').value.trim(); if (!label) { V.ui.field('rl_label', 'Please enter a name'); return; } const id = a.getAttribute('data-id'); const data = { label, category: document.getElementById('rl_cat').value, description: document.getElementById('rl_desc').value.trim() }; if (id) Object.assign(S.ws.roles.find(r => r.id === id), data); else S.ws.roles.push(Object.assign({ id: 'prop:' + F.uid('role'), perms: {} }, data)); closeDrawer(); F.changed(id ? 'Proposed role updated' : 'Proposed role added', label); };
  ACT.deleteRole = async a => { const id = a.getAttribute('data-id'); const n = transitionsFor(id).length; if (!(await confirmDialog('Delete role', n ? `This proposed role is assigned to ${n} stateflow action(s). Delete it and unassign it?` : 'Delete this proposed role?', 'Delete', true))) return;
    Object.keys(S.ws.flows).forEach(k => S.ws.flows[k].transitions.forEach(t => { t.actors = (t.actors || []).filter(x => x.actor !== id); if (!t.actors.length && t.type === 'user') t.actors.push({ actor: 'tbc:any', status: 'tbc', note: 'Role removed in workshop' }); if (t.approval) t.approval.approvers = (t.approval.approvers || []).filter(x => x !== id); }));
    S.ws.processes.forEach(p => p.steps.forEach(s => { if (s.lane === id) s.lane = 'tbc:any'; })); const r = S.ws.roles.find(x => x.id === id); S.ws.roles = S.ws.roles.filter(x => x.id !== id); F.changed('Proposed role deleted', r.label); };
  ACT.exportRolesJson = () => { if (V.exportsApi) V.exportsApi.download('roles'); };

  // ---------- actors by category ----------
  RT.actors = () => {
    const acts = F.allActors(); const groups = {}; acts.forEach(a => (groups[a.category] = groups[a.category] || []).push(a));
    const desc = { internal: 'Internal Facilio roles configured in the org.', vendor: 'Users of the Vendor Portal (and FSM vendor portal where configured).', client: 'Users of the Client Portal.', tenant: 'Users of the Tenant Portal.', occupant: 'Occupant / service portal users.', employee: 'Employee portal users.', external: 'Other external participants.', system: 'Automatic and scheduled steps.', tbc: 'Actions whose responsible user is not specified in the configuration.', proposed: 'Roles introduced in the workshop.' };
    return `<div class="grid g2">${F.CATEGORY_ORDER.filter(c => groups[c]).map(c => `<div class="card"><div class="card-h"><h3>${esc(F.CATEGORY_LABEL[c] || c)}</h3><span class="muted small">${groups[c].length}</span></div><div class="card-b small muted" style="padding-bottom:6px">${esc(desc[c] || '')}</div><div class="tbl-wrap" style="border:0;border-radius:0;max-height:330px"><table class="tbl"><thead><tr><th>Actor / role</th><th>Source</th><th class="num">Flow actions</th></tr></thead><tbody>${groups[c].sort((a, b) => a.label.localeCompare(b.label)).map(a => `<tr${a.roleName && !a.privileged || a.origin === 'proposed' ? ` class="click" data-act="openRole" data-id="${esc(a.id)}"` : ''}><td><b>${esc(a.label)}</b>${a.apps && a.apps.length ? `<div class="xs muted">App: ${esc(a.apps.join(', '))}${a.privileged ? ' · privileged' : ''}${a.activeUsers ? ' · ' + a.activeUsers + ' active user(s)' : ''}</div>` : ''}</td><td>${a.source === 'tbc' ? tag('tbc', 'To be confirmed') : a.source === 'proposed' ? tag('proposed', 'Proposed') : tag('configured', 'Configured')}</td><td class="num">${transitionsFor(a.id).length}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`;
  };

  // ---------- transition responsibility ----------
  RT.resp = () => {
    const only = S.ui.respOnly !== false; const rows = [];
    F.allFlows().forEach(id => { const f = F.flowModel(id); if (!f) return; const m = F.moduleView(f.module); if (!m || !m.inScope || f.enabled === false) return; f.transitions.filter(t => !t.removed && t.enabled !== false && t.type === 'user').forEach(t => { const tbc = (t.actors || []).every(F.isTbc); if (!only || tbc) rows.push({ f, m, t, tbc }); }); });
    const st = (f, id) => (f.states.find(x => x.id === id) || {}).label || id;
    return `<div class="row" style="margin-bottom:12px"><label class="chk"><input type="checkbox" ${only ? 'checked' : ''} data-change="respOnly"> Only actions with an unconfirmed role</label><span class="muted small">${rows.length} actions in in-scope modules</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>Action</th><th>From → To</th><th>Portals</th><th>Current actors</th>${S.readonly ? '' : '<th>Assign</th>'}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.m.label)}<div class="xs muted">${esc(r.f.name)}</div></td><td><a href="#" data-act="navTo" data-nav="${esc(JSON.stringify({ view: 'flow', flowId: r.f.id, sel: r.t.id }))}"><b>${esc(r.t.name)}</b></a></td><td class="small">${esc(st(r.f, r.t.from))} → ${esc(st(r.f, r.t.to))}</td><td>${(r.t.portals || []).map(p => tag('blue', humanize(p))).join(' ')}</td><td class="small">${(r.t.actors || []).map(a => `<div>${esc(F.actorLabel(a.actor))} ${tag(a.status === 'tbc' ? 'tbc' : a.status, F.ACTOR_STATUS[a.status] || a.status)}</div>`).join('')}</td>${S.readonly ? '' : `<td><select data-change="quickAssign" data-flow="${esc(r.f.id)}" data-t="${esc(r.t.id)}" style="width:220px">${V.actorOptions(true)}</select></td>`}</tr>`).join('') || '<tr><td colspan="6" class="empty">Every action in scope has a configured or proposed role.</td></tr>'}</tbody></table></div>`;
  };
  ACT.respOnly = el => { S.ui.respOnly = el.checked; V.render(); };
  ACT.quickAssign = el => { if (!el.value) return; const f = F.editableFlow(el.getAttribute('data-flow')); const t = f.transitions.find(x => x.id === el.getAttribute('data-t')); t.actors = (t.actors || []).filter(a => !(a.actor === 'tbc:any')); if (!t.actors.find(a => a.actor === el.value)) t.actors.push({ actor: el.value, status: 'proposed', note: 'Assigned in workshop' }); F.changed('Role assigned', F.actorLabel(el.value) + ' → ' + t.name); };

  // ---------- access matrix ----------
  RT.matrix = () => {
    const mods = F.allModules().filter(m => m.inScope).sort((a, b) => a.label.localeCompare(b.label));
    const cats = S.ui.matrixCats || ['internal', 'vendor', 'tenant', 'client', 'proposed'];
    const acts = F.allActors().filter(a => (a.roleName || a.origin === 'proposed') && cats.indexOf(a.category) >= 0 && !(a.privileged && S.ui.hidePriv !== false));
    if (!mods.length) return '<div class="empty">Mark modules in scope to build the matrix.</div>';
    return `<div class="row" style="margin-bottom:10px">${['internal', 'vendor', 'tenant', 'client', 'occupant', 'employee', 'proposed'].map(c => `<button class="pill-btn${cats.indexOf(c) >= 0 ? ' on' : ''}" data-act="matrixCat" data-c="${c}">${esc(F.CATEGORY_LABEL[c])}</button>`).join('')}<label class="chk small"><input type="checkbox" ${S.ui.hidePriv !== false ? 'checked' : ''} data-change="hidePriv"> Hide privileged roles</label></div>
      <div class="notice small" style="margin-bottom:10px">Each cell shows the configured access decoded from the role's tab permission; <span class="tag proposed">blue</span> shows a workshop proposal. ⚠ = the value has bits that are not in the module's verified catalog. Click a cell to open the role.</div>
      <div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>Module</th>${acts.map(a => `<th title="${esc(a.label)}">${esc(a.label.length > 18 ? a.label.slice(0, 17) + '…' : a.label)}</th>`).join('')}</tr></thead><tbody>${mods.map(m => `<tr><td><b>${esc(m.label)}</b></td>${acts.map(a => { const e = V.existingPerm(a, m.name); const p = propBits(a.id, m.name); return `<td class="click" data-act="openRole" data-id="${esc(a.id)}" style="cursor:pointer">${e ? `<div class="xs">${esc(e.text)}${e.unknown ? ' ⚠' : ''}</div>` : '<span class="muted xs">—</span>'}${p !== null ? `<div>${tag('proposed', labels(m.name, p).join(', ') || 'No access')}</div>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  ACT.matrixCat = a => { const c = a.getAttribute('data-c'); const cats = (S.ui.matrixCats || ['internal', 'vendor', 'tenant', 'client', 'proposed']).slice(); const i = cats.indexOf(c); if (i >= 0) cats.splice(i, 1); else cats.push(c); S.ui.matrixCats = cats; V.render(); };
  ACT.hidePriv = el => { S.ui.hidePriv = el.checked; V.render(); };

  // ---------- permission checks (missing / conflicting) ----------
  function permIssues() {
    const out = []; const add = (sev, item, msg, nav) => out.push({ sev, item, msg, nav, area: 'Permission' });
    F.allFlows().forEach(id => { const f = F.flowModel(id); if (!f || f.enabled === false) return; const m = F.moduleView(f.module); if (!m || !m.inScope) return;
      f.transitions.filter(t => !t.removed && t.enabled !== false && t.type === 'user').forEach(t => {
        (t.actors || []).filter(a => !F.isTbc(a) && a.actor !== 'system').forEach(a => { const b = effBits(a.actor, f.module); if (b === 'full') return; const g = generic(f.module, b);
          if (!g.edit) add('blocking', m.label + ' › ' + t.name, `${F.actorLabel(a.actor)} performs “${t.name}” but has no Update access to ${m.label}.`, { view: 'roles', role: a.actor });
          else if (!g.view) add('warning', m.label + ' › ' + t.name, `${F.actorLabel(a.actor)} can update ${m.label} without Read access.`, { view: 'roles', role: a.actor }); });
        if (t.approval && t.approval.required) (t.approval.approvers || []).forEach(x => { const b = effBits(x, f.module); if (b !== 'full' && !generic(f.module, b).view) add('warning', m.label + ' › ' + t.name, `Approver ${F.actorLabel(x)} has no Read access to ${m.label}.`, { view: 'roles', role: x }); });
        (t.portals || []).forEach(p => { const roles = F.allActors().filter(a => a.category === p && (a.roleName || a.origin === 'proposed')); if (!roles.length) add('warning', m.label + ' › ' + t.name, `“${t.name}” is shown in the ${humanize(p)} Portal but no ${humanize(p)} portal role exists — role to be confirmed.`, { view: 'flow', flowId: f.id, sel: t.id });
          else if (!roles.some(a => { const b = effBits(a.id, f.module); return b === 'full' || generic(f.module, b).view; })) add('warning', m.label + ' › ' + t.name, `“${t.name}” is shown in the ${humanize(p)} Portal but no ${humanize(p)} portal role can read ${m.label}.`, { view: 'roles' }); });
      }); });
    const scan = (aid, store) => Object.entries(store || {}).forEach(([m, p]) => { const g = generic(m, p.bits !== undefined ? p.bits : '0'); const ml = (F.moduleView(m) || {}).label || m;
      if ((g.edit || g.delete || g.export) && !g.view) add('blocking', F.actorLabel(aid) + ' › ' + ml, 'Proposed access grants Update/Delete/Export without Read — conflicting permission.', { view: 'roles', role: aid });
      if (p.base && p.base !== 'full' && p.bits && generic(m, p.base).edit && !g.edit && transitionsFor(aid).some(x => x.f.module === m)) add('warning', F.actorLabel(aid) + ' › ' + ml, 'Proposed change removes Update access, but the role still performs stateflow actions on this module.', { view: 'roles', role: aid }); });
    Object.entries(S.ws.rolePermOps).forEach(([aid, st]) => scan(aid, st)); S.ws.roles.forEach(r => { scan(r.id, r.perms); if (!Object.keys(r.perms || {}).length) add('warning', r.label, 'Proposed role has no module permissions defined.', { view: 'roles', role: r.id }); });
    if (S.baseline) S.baseline.roles.forEach(r => r.permissions.filter(p => p.decoded && p.modules.some(m => (F.moduleView(m) || {}).inScope)).forEach(p => { const m = p.modules[0]; let b = 0n; try { b = BigInt(p.raw); } catch (e) { } if ((b & ~knownMask(m)) !== 0n) add('info', r.name + ' › ' + p.tabLabel, `Permission value ${p.raw} has bits outside the verified catalog for ${(F.moduleView(m) || {}).label || m} — confirm in Facilio setup.`, { view: 'roles' }); }));
    return out;
  }
  V.permIssues = permIssues;
  RT.issues = () => { const is = permIssues(); const sv = { blocking: 'red', warning: 'tbc', info: 'low' };
    return `<div class="notice" style="margin-bottom:12px">Checks compare who performs or approves each stateflow action with the access that role has (configured or proposed), and look for contradictory proposals.</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Severity</th><th>Item</th><th>Finding</th><th></th></tr></thead><tbody>${is.map(i => `<tr><td>${tag(sv[i.sev], humanize(i.sev))}</td><td class="small"><b>${esc(i.item)}</b></td><td class="small">${esc(i.msg)}</td><td>${i.nav ? `<button class="btn sm" data-act="issueGo" data-nav="${esc(JSON.stringify(i.nav))}">Open</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No permission issues found.</td></tr>'}</tbody></table></div>`; };
  ACT.issueGo = a => { const n = JSON.parse(a.getAttribute('data-nav')); if (n.view === 'roles') { S.ui.roleEdit = n.role || null; S.ui.roleDraft = null; V.go('roles'); } else V.go(n.view, { flowId: n.flowId, module: n.module, moduleTab: n.tab, selected: n.sel }); if (n.sel) { S.ui.selected = n.sel; V.render(); } };

  // ---------- portal workflows (process maps / swimlanes) ----------
  const IFACES = ['Facilio web app (Maintenance)', 'Facilio mobile app', 'Tenant Portal', 'Vendor Portal', 'Client Portal', 'Occupant Portal', 'Employee Portal', 'Email link', 'System (automatic)', 'Other / to be confirmed'];
  RT.portals = () => {
    const B = S.baseline; const pe = B ? B.portalEvidence : []; const ro = S.readonly;
    const cur = S.ws.processes.find(p => p.id === S.ui.processId) || S.ws.processes[0];
    const cards = pe.length ? `<div class="grid g3" style="margin-bottom:16px">${pe.map(p => { const ts = p.transitions.map(id => B.transitions.find(t => t.id === id)).filter(Boolean); return `<div class="card"><div class="card-h"><h3>${esc(p.name)}</h3>${p.enabled ? tag('verified', 'Enabled') : tag('low', 'Disabled')}</div><div class="card-b small">
      <div><b>Roles:</b> ${esc(p.roles.join(', ') || 'none configured — to be confirmed')}</div><div style="margin-top:4px"><b>Tabs:</b> ${p.tabs.filter(t => t.modules.length).map(t => esc(t.name)).join(', ') || '—'}</div>
      <div style="margin-top:4px"><b>Portal forms for:</b> ${[...new Set(p.forms.map(f => (F.moduleView(f.module) || {}).label || f.module))].map(esc).join(', ') || '—'}</div>
      <div style="margin-top:4px"><b>Buttons shown in portal:</b> ${ts.length ? ts.slice(0, 12).map(t => `${esc(t.name)} (${esc((F.moduleView(t.module) || {}).label || t.module)})`).join(', ') + (ts.length > 12 ? ` +${ts.length - 12}` : '') : 'none flagged in the configuration'}</div></div></div>`; }).join('')}</div>` : '';
    const list = `<div class="card"><div class="card-h"><h3>Business processes</h3>${ro ? '' : `<button class="btn sm" data-act="newProcess">${ico('plus')}New</button>`}</div>${S.ws.processes.map(p => `<div class="list-item${cur && cur.id === p.id ? ' sel' : ''}" data-act="pickProcess" data-id="${esc(p.id)}"><b>${esc(p.name)}</b><div class="xs muted">${p.steps.length} steps · ${[...new Set(p.steps.map(s => F.actor(s.lane).category))].map(c => F.CATEGORY_LABEL[c] || c).join(', ')}</div></div>`).join('') || '<div class="empty small">No process maps yet. Generate a draft from a stateflow or start a blank one.</div>'}
      ${ro ? '' : `<div class="card-b" style="border-top:1px solid var(--fc-border)"><label class="f">Draft from a stateflow</label><select id="genFlow"><option value="">Choose stateflow…</option>${F.allFlows().map(id => { const f = F.flowModel(id); const m = F.moduleView(f.module); return m && m.inScope && f.enabled !== false ? `<option value="${esc(id)}">${esc(m.label + ' — ' + f.name)}</option>` : ''; }).join('')}</select><button class="btn sm primary" style="margin-top:8px" data-act="genProcess">Generate draft</button><div class="xs muted" style="margin-top:6px">Configured actors are marked verified; everything else is marked inferred or to be confirmed.</div></div>`}</div>`;
    return `<div class="notice" style="margin-bottom:14px">Map how a request moves between the Tenant, Client and Vendor portals and internal Facilio users. Handoffs are only marked verified when the configuration establishes them.</div>${cards}<div class="split">${list}<div>${cur ? procEditor(cur) : '<div class="card empty">Select or create a process.</div>'}</div></div>`;
  };
  ACT.pickProcess = a => { S.ui.processId = a.getAttribute('data-id'); V.render(); };
  ACT.newProcess = () => { const p = { id: F.uid('proc'), name: 'New business process', objective: '', trigger: '', module: '', outcome: '', lanes: [], steps: [] }; S.ws.processes.push(p); S.ui.processId = p.id; F.changed('Process map created', p.name); };
  function pIdx() { return S.ws.processes.findIndex(p => p.id === (S.ui.processId || (S.ws.processes[0] || {}).id)); }
  function procEditor(p) {
    const i = S.ws.processes.indexOf(p); const base = 'processes.' + i + '.'; const ro = S.readonly; const dis = ro ? 'disabled' : '';
    const mods = F.allModules().filter(m => m.inScope || m.inUse).sort((a, b) => a.label.localeCompare(b.label));
    const tOpts = [{ v: '', l: '— none —' }]; F.allFlows().forEach(id => { const f = F.flowModel(id); const m = F.moduleView(f.module); if (!m || !m.inScope) return; f.transitions.filter(t => !t.removed).forEach(t => tOpts.push({ v: t.id, l: m.label + ': ' + t.name })); });
    const handoffs = []; p.steps.forEach((s, k) => { if (k && F.actor(s.lane).category !== F.actor(p.steps[k - 1].lane).category) handoffs.push({ k, from: p.steps[k - 1], to: s }); });
    return `<div class="card"><div class="card-h"><h3>Process definition</h3>${ro ? '' : `<button class="btn sm" data-act="newReqProc">${ico('plus')}Requirement</button><button class="btn sm danger" data-act="deleteProcess">Delete</button>`}</div><div class="card-b fgrid">
      <div><label class="f">Process name</label>${V.inp(base + 'name')}</div><div><label class="f">Primary record / module</label>${sel(base + 'module', [{ v: '', l: '—' }].concat(mods.map(m => ({ v: m.name, l: m.label }))), p.module, dis)}</div>
      <div class="full"><label class="f">Business objective</label>${V.ta(base + 'objective', 'Why this process exists for the customer', 2)}</div>
      <div><label class="f">Trigger / initiation</label>${V.inp(base + 'trigger', 'e.g. a tenant reports an issue')}</div><div><label class="f">Final outcome</label>${V.inp(base + 'outcome', 'e.g. work verified and closed, tenant informed')}</div></div></div>
      <div class="card" style="margin-top:16px"><div class="card-h"><h3>Steps</h3>${ro ? '' : `<button class="btn sm primary" data-act="addStep">${ico('plus')}Step</button>`}</div>
      <div class="step-row head"><div>#</div><div>Actor (lane)</div><div>Action</div><div>Interface</div><div>Record</div><div>Linked transition</div><div>Verification</div><div></div></div>
      ${p.steps.map((s, k) => `<div class="step-row"><div class="small"><b>${k + 1}</b></div><div><select data-change="stepProp" data-k="${k}" data-p="lane" ${dis}>${V.actorOptions(false).replace(`value="${esc(s.lane)}"`, `value="${esc(s.lane)}" selected`)}</select></div>
        <div><textarea data-change="stepProp" data-k="${k}" data-p="action" rows="1" ${dis}>${esc(s.action)}</textarea></div><div>${sel('', IFACES, s.interface, `data-change="stepProp" data-k="${k}" data-p="interface" ${dis}`)}</div>
        <div>${sel('', [{ v: '', l: '—' }].concat(mods.map(m => ({ v: m.name, l: m.label }))), s.record, `data-change="stepProp" data-k="${k}" data-p="record" ${dis}`)}</div><div>${sel('', tOpts, s.transitionId, `data-change="stepProp" data-k="${k}" data-p="transitionId" ${dis}`)}</div>
        <div>${sel('', Object.entries(F.VERIFICATION).map(([v, l]) => ({ v, l })), s.verification, `data-change="stepProp" data-k="${k}" data-p="verification" ${dis}`)}</div>
        <div class="row" style="gap:2px">${ro ? '' : `<button class="btn sm ghost" data-act="moveStep" data-k="${k}" data-d="-1" aria-label="Up">${ico('up')}</button><button class="btn sm ghost" data-act="moveStep" data-k="${k}" data-d="1" aria-label="Down">${ico('down')}</button><button class="btn sm ghost" data-act="rmStep" data-k="${k}" aria-label="Remove">${ico('x')}</button>`}</div></div>`).join('') || '<div class="empty small">No steps.</div>'}</div>
      <div class="card" style="margin-top:16px"><div class="card-h"><h3>Swimlane diagram</h3><span class="legend"><span style="color:#4eb871">━ Verified</span><span style="color:#6071db">╍ Inferred</span><span style="color:#3995e2">╌ Proposed</span><span style="color:#f5a623">┈ To be confirmed</span></span><button class="btn sm" data-act="dlSwim">${ico('dl')}PNG</button></div><div class="swim-wrap">${D.swimlaneSvg(withLabels(p), F.actorLabel, id => F.actor(id).category)}</div></div>
      <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Handoffs between participants</h3></div><div class="card-b small">${handoffs.map(h => `<div style="margin-bottom:6px">Step ${h.k} → ${h.k + 1}: <b>${esc(F.actorLabel(h.from.lane))}</b> → <b>${esc(F.actorLabel(h.to.lane))}</b> ${tag(h.to.verification, F.VERIFICATION[h.to.verification] || '')}</div>`).join('') || '<span class="muted">No handoffs between actor categories.</span>'}</div></div>
      <div class="card"><div class="card-h"><h3>Narrative (BRD)</h3></div><div class="card-b prose small">${T.processNarrative(withLabels(p)).map(x => `<p>${esc(x)}</p>`).join('')}</div></div></div>`;
  }
  function withLabels(p) { return Object.assign({}, p, { steps: p.steps.map(s => Object.assign({}, s, { recordLabel: s.record ? ((F.moduleView(s.record) || {}).label || s.record) : '' })) }); }
  V.withLabels = withLabels;
  ACT.addStep = () => { const p = S.ws.processes[pIdx()]; const last = p.steps[p.steps.length - 1]; p.steps.push({ id: F.uid('st'), lane: last ? last.lane : 'tbc:any', action: 'Describe the action', interface: last ? last.interface : 'Facilio web app (Maintenance)', record: p.module || '', transitionId: '', verification: 'proposed', notes: '' }); F.changed('Process step added', p.name); };
  ACT.stepProp = el => { const p = S.ws.processes[pIdx()]; const s = p.steps[+el.getAttribute('data-k')]; s[el.getAttribute('data-p')] = el.value; F.changed('Process step updated', p.name); };
  ACT.moveStep = a => { const p = S.ws.processes[pIdx()]; const k = +a.getAttribute('data-k'), j = k + +a.getAttribute('data-d'); if (j < 0 || j >= p.steps.length) return; const s = p.steps.splice(k, 1)[0]; p.steps.splice(j, 0, s); F.changed('Process steps reordered', p.name); };
  ACT.rmStep = a => { const p = S.ws.processes[pIdx()]; p.steps.splice(+a.getAttribute('data-k'), 1); F.changed('Process step removed', p.name); };
  ACT.deleteProcess = async () => { if (!(await confirmDialog('Delete process', 'Delete this process map?', 'Delete', true))) return; const i = pIdx(); const p = S.ws.processes.splice(i, 1)[0]; S.ui.processId = null; F.changed('Process map deleted', p.name); };
  ACT.dlSwim = async () => { const p = S.ws.processes[pIdx()]; const png = await D.svgToPng(D.swimlaneSvg(withLabels(p), F.actorLabel, id => F.actor(id).category), 2); V.download(F.slug(p.name) + '_swimlane.png', new Blob([png.data], { type: 'image/png' })); };
  ACT.newReqProc = () => { const p = S.ws.processes[pIdx()]; V.newReqFor({ modules: p.module ? [p.module] : [], title: p.name, process: p.id }); };
  ACT.genProcess = () => {
    const fid = document.getElementById('genFlow').value; if (!fid) { toast('Choose a stateflow'); return; }
    const f = F.flowModel(fid); const m = F.moduleView(f.module); const B = S.baseline;
    const steps = []; const ifaceOf = c => ({ vendor: 'Vendor Portal', tenant: 'Tenant Portal', client: 'Client Portal', occupant: 'Occupant Portal', employee: 'Employee Portal', system: 'System (automatic)' }[c] || 'Facilio web app (Maintenance)');
    const portals = B ? B.portalEvidence.filter(p => p.enabled && p.forms.some(x => x.module === f.module)) : [];
    portals.forEach(p => steps.push({ id: F.uid('st'), lane: 'tbc:' + p.category, action: `Submits a new ${m.label} record`, interface: p.name, record: f.module, transitionId: '', verification: 'inferred', notes: `${p.name} has a create form for this module (configured). Whether this portal starts the process is to be confirmed.` }));
    steps.push({ id: F.uid('st'), lane: 'tbc:any', action: `Creates / registers the ${m.label} record — starts in “${(f.states.find(s => s.id === f.initial) || {}).label || '?'}”`, interface: 'Facilio web app (Maintenance)', record: f.module, transitionId: '', verification: portals.length ? 'tbc' : 'inferred', notes: '' });
    const live = f.transitions.filter(t => !t.removed && t.enabled !== false); const visited = new Set([f.initial]); let cur = f.initial; let guard = 0;
    while (guard++ < 30) {
      const outs = live.filter(t => t.from === cur && !visited.has(t.to)); if (!outs.length) break;
      const t = outs.find(x => !/reject|cancel|hold|pause|reopen|return|revert|decline/i.test(x.name)) || outs[0];
      const conf = (t.actors || []).filter(a => !F.isTbc(a)); const portalTbc = (t.actors || []).find(a => /^tbc:(vendor|tenant|client|occupant)/.test(a.actor));
      const lane = t.type !== 'user' ? 'system' : conf.length ? conf[0].actor : portalTbc ? portalTbc.actor : 'tbc:any'; const toL = (f.states.find(s => s.id === t.to) || {}).label;
      steps.push({ id: F.uid('st'), lane, action: t.type === 'user' ? `Selects “${t.name}” — status becomes “${toL}”` : `Automatically applies “${t.name}” — status becomes “${toL}”`, interface: ifaceOf(F.actor(lane).category), record: f.module, transitionId: t.id, verification: t.type !== 'user' || conf.some(a => a.status === 'configured' || a.status === 'confirmed') ? 'verified' : 'tbc', notes: '' });
      visited.add(t.to); cur = t.to;
    }
    const p = { id: F.uid('proc'), name: m.label + ' — end-to-end process', objective: (S.ws.modules[f.module] || {}).objective || '', trigger: '', module: f.module, outcome: '', lanes: [], steps, sourceFlow: fid };
    S.ws.processes.push(p); S.ui.processId = p.id; F.changed('Process draft generated', p.name + ' from ' + f.name);
  };
  // legacy route
  V.portals = { html() { S.ui.rolesTab = 'portals'; return V.roles.html(); } };
})(typeof window !== 'undefined' ? window : globalThis);
