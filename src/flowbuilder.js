/* State Flow Builder — modelled on facilio-setup StateFlowList.vue, StateFlowBuilder.vue (toolbar / canvas / sidebar),
   NewStateTransition.vue (Before | During | After), NewState.vue. Workshop edits are kept as a copy of the source flow. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const T = root.FWBText; const D = root.FWBDiagrams; const ACT = V.ACT;
  const { tag, sel, drawer, closeDrawer, toast, ico, sw, confirmDialog } = V;
  const ASTATUS = Object.entries(F.ACTOR_STATUS).map(([v, l]) => ({ v, l }));
  const STATE_TYPES = [[1, 'Open'], [2, 'Closed'], [6, 'Skipped']];
  const AFTER_ACTIONS = ['Send Email', 'Send SMS', 'Send Mobile Notification', 'Field Update', 'Execute Script', 'Change Status', 'Invoke Trigger'];

  function actorOptions(includeBlank, blankText) {
    const groups = {}; F.allActors().forEach(a => { (groups[a.category] = groups[a.category] || []).push(a); });
    let h = includeBlank ? `<option value="">${esc(blankText || 'Add user / role…')}</option>` : '';
    F.CATEGORY_ORDER.forEach(c => { if (!groups[c]) return; h += `<optgroup label="${esc(F.CATEGORY_LABEL[c] || c)}">${groups[c].sort((a, b) => a.label.localeCompare(b.label)).map(a => `<option value="${esc(a.id)}">${esc(a.label)}${a.origin === 'proposed' ? ' (proposed)' : ''}${a.apps && a.apps.length ? ' — ' + esc(a.apps.join(', ')) : ''}</option>`).join('')}</optgroup>`; });
    return h;
  }
  V.actorOptions = actorOptions;
  function statusInfo(m, name) { const B = S.baseline; if (!B) return null; const l = (B.statuses[m] || []); return l.find(x => x.name === name) || l.find(x => x.name.toLowerCase() === String(name).toLowerCase()) || l.find(x => x.label.toLowerCase() === String(name).toLowerCase()) || null; }
  function stateProps(f, s) { const b = statusInfo(f.module, s.name) || statusInfo(f.module, s.label) || {}; return { typeCode: s.typeCode != null ? s.typeCode : (b.typeCode || 1), locked: s.locked != null ? s.locked : !!b.locked, pauseTimer: s.pauseTimer != null ? s.pauseTimer : (b.timer === undefined ? false : !b.timer), pauseSla: !!s.pauseSla, fromConfig: !!b.name }; }

  // ---------- cross-module links & custom actions ----------
  const REQUESTED = [
    { key: 'wo_quote', from: 'workorder', to: 'quote', name: 'Create Quote' },
    { key: 'wo_ir', from: 'workorder', to: 'inventoryrequest', name: 'Raise Material Request (Inventory Request)' },
    { key: 'wo_child', from: 'workorder', to: 'workorder', name: 'Create Child Work Order' },
    { key: 'wo_bdm', from: 'workorder', to: null, name: 'BDM Request', toLabel: 'BDM Request' },
    { key: 'quote_override', from: 'quote', to: null, name: 'Override Payment Process', kind: 'process' },
    { key: 'ir_quote', from: 'inventoryrequest', to: 'quote', name: 'Create Quote (expected disabled)', expectDisabled: true }
  ];
  // Buttons in the org package that look like a requested action but do not link two modules (e.g. a widget button). Shown as a hint, never as verification.
  const NEAR = { wo_quote: [/quote/i], wo_ir: [/material|inventory/i], wo_child: [/child|corrective/i, 'workorder'], wo_bdm: [/bdm/i], quote_override: [/override|payment/i], ir_quote: [/quote/i, 'inventoryrequest'] };
  function nearButtons(r) { const B = S.baseline; if (!B || !NEAR[r.key]) return ''; const [re, mod] = NEAR[r.key]; const hits = B.buttons.filter(b => re.test(b.name) && (mod ? b.module === mod : true) && !/^print/i.test(b.name)); return hits.length ? 'Closest buttons in the package: ' + hits.map(b => `${b.name} on ${modLabel(b.module)} (${b.buttonType || 'button'}${b.actionType ? ', ' + b.actionType : ''}, ${b.enabled === false ? 'disabled' : 'enabled'})`).join('; ') + '. These do not create the requested linked record, so the action is still not verified.' : 'No similar button exists in the package.'; }
  function crossLinks(m) {
    const B = S.baseline; const out = [];
    const cfg = B ? B.buttons.filter(b => b.targetModule || /redirect/i.test(b.actionType || '')) : [];
    cfg.filter(b => b.module === m || b.targetModule === m).forEach(b => out.push({ id: 'cfg:' + b.module + ':' + b.link, name: b.name, from: b.module, to: b.targetModule || '', toLabel: b.targetModule ? null : 'External page (redirect)', kind: b.targetModule ? 'create_record' : 'process', source: 'configuration', verified: true, enabled: b.enabled, condition: b.criteria ? b.criteria.text : '', criteria: b.criteria, who: b.performers.map(p => p.type === 'VENDOR' ? 'Vendor portal user' : p.name), ref: b.ref }));
    REQUESTED.filter(r => r.from === m || r.to === m).forEach(r => { const hit = cfg.find(b => b.module === r.from && r.to && b.targetModule === r.to); if (hit) return; const prop = (S.ws.crossLinks[r.from] || []).find(x => x.requestedKey === r.key);
      if (!prop) out.push({ id: 'req:' + r.key, near: nearButtons(r), requestedKey: r.key, name: r.name, from: r.from, to: r.to || '', toLabel: r.toLabel || (r.kind === 'process' ? 'Process (no target module)' : null), kind: r.kind || 'create_record', source: 'requested', verified: false, enabled: !r.expectDisabled, condition: '', who: [] }); });
    Object.entries(S.ws.crossLinks).forEach(([from, list]) => list.forEach(x => { if (from === m || x.to === m) out.push(Object.assign({ from, source: 'proposed', verified: false }, x)); }));
    return out;
  }
  V.crossLinks = crossLinks;
  const modLabel = n => n ? ((F.moduleView(n) || {}).label || humanize(n)) : '';
  V.crossLinkTable = m => {
    const rows = crossLinks(m);
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Action</th><th>From → To</th><th>Type</th><th>Shown when</th><th>Who</th><th>Verification</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b>${r.near ? `<div class="xs muted">${esc(r.near)}</div>` : ''}${r.ref ? `<div class="xs muted mono">${esc(r.ref.file)} #${esc(r.ref.uid)}</div>` : ''}${r.notes ? `<div class="xs muted">${esc(r.notes)}</div>` : ''}</td>
      <td class="small">${esc(modLabel(r.from))} → ${esc(r.toLabel || modLabel(r.to) || 'To be confirmed')}</td><td class="small">${r.kind === 'process' ? 'Custom action / process' : 'Creates a linked record'}</td><td class="small">${esc(r.condition || '') || '<span class="dash">---</span>'}</td>
      <td class="small">${esc((r.who || []).map(w => w.indexOf(':') > 0 ? F.actorLabel(w) : w).join(', ')) || tag('tbc', 'User / Role to Be Confirmed')}</td>
      <td>${r.source === 'configuration' ? tag('verified', 'Verified in configuration') : r.source === 'requested' ? tag('tbc', 'Not found in configuration') : tag('proposed', humanize(r.status || 'proposed'))}</td>
      <td>${r.enabled === false ? tag('low', 'Disabled') : tag('green', 'Enabled')}</td>
      <td class="acts">${S.readonly ? '' : r.source === 'requested' ? `<button class="btn sm" data-act="editCross" data-from="${esc(r.from)}" data-req="${esc(r.requestedKey)}">Capture as proposal</button>` : r.source === 'proposed' ? `<button class="btn sm" data-act="editCross" data-from="${esc(r.from)}" data-id="${esc(r.id)}">Edit</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No cross-module actions for this module.</td></tr>'}</tbody></table></div>
      ${S.readonly ? '' : `<button class="btn sm" style="margin-top:8px" data-act="editCross" data-from="${esc(m)}">${ico('plus')}Cross-module action</button>`}`;
  };
  ACT.editCross = a => {
    const from = a.getAttribute('data-from'); const id = a.getAttribute('data-id'); const rk = a.getAttribute('data-req'); const req = REQUESTED.find(r => r.key === rk);
    const x = id ? (S.ws.crossLinks[from] || []).find(z => z.id === id) : { id: '', name: req ? req.name.replace(/ \(expected disabled\)/, '') : '', to: req ? (req.to || '') : '', kind: req ? (req.kind || 'create_record') : 'create_record', condition: '', who: [], status: 'tbc', enabled: req ? !req.expectDisabled : true, notes: req ? 'Requested in the workshop brief; not present in the reference configuration.' : '', requestedKey: rk || '' };
    const mods = F.allModules().filter(z => z.inUse).sort((p, q) => p.label.localeCompare(q.label));
    drawer(id ? 'Edit cross-module action' : 'New cross-module action', `<div class="fgrid"><div class="full"><label class="f">Action / button name</label><input type="text" id="cx_name" value="${esc(x.name)}"></div>
      <div><label class="f">From module</label><input type="text" disabled value="${esc(modLabel(from))}"></div><div><label class="f">Type</label>${sel('', [{ v: 'create_record', l: 'Creates a linked record' }, { v: 'process', l: 'Custom action / process' }], x.kind, 'id="cx_kind"')}</div>
      <div class="full"><label class="f">Target module</label>${sel('', [{ v: '', l: '— none / to be confirmed —' }].concat(mods.map(z => ({ v: z.name, l: z.label }))), x.to, 'id="cx_to"')}</div>
      <div class="full"><label class="f">Shown when (status / condition)</label><input type="text" id="cx_cond" value="${esc(x.condition || '')}" placeholder="e.g. Status is Work in Progress"></div>
      <div class="full"><label class="f">Who can use it</label><select id="cx_who" multiple size="6">${actorOptions(false)}</select><div class="xs muted">Leave empty if not yet known — it is documented as "User / Role to Be Confirmed".</div></div>
      <div><label class="f">Status</label>${sel('', [{ v: 'tbc', l: 'To be confirmed' }, { v: 'proposed', l: 'Proposed in workshop' }, { v: 'confirmed', l: 'Confirmed in workshop' }], x.status, 'id="cx_status"')}</div><div style="padding-top:22px"><label class="chk"><input type="checkbox" id="cx_en" ${x.enabled !== false ? 'checked' : ''}> Enabled</label></div>
      <div class="full"><label class="f">Notes</label><textarea id="cx_notes" rows="3">${esc(x.notes || '')}</textarea></div></div>`,
      `${id ? `<button class="btn danger" data-act="delCross" data-from="${esc(from)}" data-id="${esc(id)}">Delete</button>` : ''}<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="saveCross" data-from="${esc(from)}" data-id="${esc(id || '')}" data-req="${esc(x.requestedKey || '')}">Save</button>`);
    const w = document.getElementById('cx_who'); Array.from(w.options).forEach(o => { o.selected = (x.who || []).indexOf(o.value) >= 0; });
  };
  ACT.saveCross = a => { const from = a.getAttribute('data-from'); const id = a.getAttribute('data-id'); const v = i => document.getElementById(i).value.trim(); if (!v('cx_name')) { toast('Enter the action name'); return; }
    const list = S.ws.crossLinks[from] = S.ws.crossLinks[from] || []; const rec = { id: id || F.uid('cx'), name: v('cx_name'), to: v('cx_to'), kind: v('cx_kind'), condition: v('cx_cond'), who: Array.from(document.getElementById('cx_who').selectedOptions).map(o => o.value), status: v('cx_status'), enabled: document.getElementById('cx_en').checked, notes: v('cx_notes'), requestedKey: a.getAttribute('data-req') || '' };
    const i = list.findIndex(z => z.id === id); if (i >= 0) list[i] = rec; else list.push(rec); closeDrawer(); F.changed(id ? 'Cross-module action updated' : 'Cross-module action proposed', modLabel(from) + ' › ' + rec.name); };
  ACT.delCross = a => { const from = a.getAttribute('data-from'); S.ws.crossLinks[from] = (S.ws.crossLinks[from] || []).filter(z => z.id !== a.getAttribute('data-id')); closeDrawer(); F.changed('Cross-module action deleted', modLabel(from)); };
  function externalsFor(f) {
    return crossLinks(f.module).filter(r => r.from === f.module).map(r => { let st = null; const conds = r.criteria ? r.criteria.conditions.filter(c => c.field === 'moduleState') : [];
      conds.forEach(c => { const s = f.states.find(x => x.name.toLowerCase() === String(c.value).toLowerCase() || x.label.toLowerCase() === String(c.value).toLowerCase() || slugEq(x.label, c.value)); if (s) st = s.id; });
      if (!st && r.condition) { const s = f.states.find(x => new RegExp('\\b' + x.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(r.condition)); if (s) st = s.id; }
      return { state: st, label: r.name, target: r.toLabel || modLabel(r.to) || 'To be confirmed', disabled: r.enabled === false, verified: r.source === 'configuration', source: r.source }; });
  }
  const slugEq = (a, b) => F.slug(a).replace(/_/g, '') === F.slug(b).replace(/_/g, '');
  V.flowExternals = externalsFor;

  // ================= LIST PAGE (StateFlowList.vue) =================
  V.flow = { html() {
    if (!S.baseline && !Object.keys(S.ws.flows).length) return '<div class="page-body"><div class="empty">Configuration not loaded.</div></div>';
    const f = S.ui.flowId && F.flowModel(S.ui.flowId);
    return f ? editor(f) : list();
  }, mount() { if (!S.ui.flowId) return; if (S.ui.flowZoom == null) { const f = F.flowModel(S.ui.flowId); const c = document.getElementById('sfbCanvas'); if (f && c) { const G = D.flowGeometry(f, {}); const zz = Math.max(0.5, Math.min(1, Math.floor(Math.min((c.clientWidth - 20) / G.W, (c.clientHeight - 20) / G.H) * 10) / 10)); S.ui.flowZoom = zz; if (zz !== 1) { V.render(); return; } } } mountCanvas(); } };

  function defaultModule() { const ms = F.allModules().filter(m => m.flowIds.length); return (ms.find(m => m.name === 'workorder') || ms.find(m => m.inScope) || ms[0] || {}).name; }
  function list() {
    const m = S.ui.flowModule || defaultModule(); const tab = S.ui.flowTab || 'flows';
    const mods = F.allModules().filter(x => x.flowIds.length || x.origin === 'proposed' || x.inScope).sort((a, b) => (b.inScope - a.inScope) || a.label.localeCompare(b.label));
    const head = `<div class="page-header"><div class="t"><h1>Stateflow</h1><p>List of configured stateflows and states. Review existing flows with the customer and design proposed flows — including flows for new custom modules. Edits are kept as workshop proposals; the source configuration is never changed.</p></div></div>
      <div class="tabs"><button class="tab${tab === 'flows' ? ' active' : ''}" data-act="flowTab" data-v="flows">Stateflows</button><button class="tab${tab === 'states' ? ' active' : ''}" data-act="flowTab" data-v="states">States</button><button class="tab${tab === 'overview' ? ' active' : ''}" data-act="flowTab" data-v="overview">All modules</button></div>`;
    if (tab === 'overview') return head + `<div class="page-body">${overviewTable()}</div>`;
    const bar = `<div class="row" style="margin-bottom:12px"><span class="small muted">Module</span><select data-change="flowModule" style="width:260px" aria-label="Module">${mods.map(x => `<option value="${esc(x.name)}" ${x.name === m ? 'selected' : ''}>${esc(x.label)}${x.inScope ? '' : ' (not in scope)'}</option>`).join('')}</select><span class="spacer"></span>${m ? V.reviewWidget(m, 'flow', 'Flow review') : ''}${S.readonly || tab !== 'flows' ? '' : `<button class="btn" data-act="fiOpen" data-module="${esc(m || '')}">${ico('upl')}Import from XML</button><button class="btn primary" data-act="newFlowDlg" data-module="${esc(m || '')}">Add Stateflow</button>`}</div>`;
    if (!m) return head + `<div class="page-body">${bar}<div class="empty">No module selected.</div></div>`;
    if (tab === 'states') return head + `<div class="page-body">${bar}${statesTable(m)}</div>`;
    const flows = F.flowsForModule(m).map(x => Object.assign(x, { model: F.flowModel(x.id) })).sort((a, b) => (a.isDefault ? 1 : 0) - (b.isDefault ? 1 : 0));
    const base = id => S.baseline && S.baseline.flows.find(z => z.id === id);
    return head + `<div class="page-body">${bar}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Description</th><th>Applies when</th><th>Source</th><th>Status</th><th>Roles to confirm</th><th></th></tr></thead><tbody>${flows.map(x => { const fm = x.model; const b = base(x.id); const live = fm.transitions.filter(t => !t.removed && t.enabled !== false); const tbc = live.filter(t => t.type === 'user' && (t.actors || []).every(F.isTbc)).length;
      return `<tr class="click" data-act="openFlow" data-flow="${esc(x.id)}" ${x.isDefault ? 'style="background:#eff5f9"' : ''}><td><b>${esc(fm.name)}</b>${x.isDefault ? ' ' + tag('blue', 'Default') : ''}</td><td class="small">${esc((b && b.description) || fm.description || '') || '<span class="dash">---</span>'}</td><td class="small" style="max-width:280px">${esc(fm.criteria || (x.isDefault ? 'Records not matched by other stateflows' : '')) || '<span class="dash">---</span>'}</td>
        <td>${x.origin === 'proposed' ? tag('proposed', 'Proposed') : x.edited ? tag('modified', 'Workshop changes') : tag('system', 'Configured')}</td><td>${sw('', fm.enabled !== false, `disabled aria-label="Status"`)}</td><td>${tbc ? tag('tbc', tbc + ' actions') : tag('verified', 'None')}</td><td class="acts"><button class="btn sm">${ico('edit')}Edit</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No stateflows for this module. Use Add Stateflow to design one.</td></tr>'}</tbody></table></div>
      <div class="pink-label">Cross-module actions</div>${V.crossLinkTable(m)}</div>`;
  }
  function statesTable(m) {
    const B = S.baseline; const base = (B && B.statuses[m]) || []; const prop = [];
    Object.values(S.ws.flows).filter(f => f.module === m).forEach(f => f.states.filter(s => s.origin === 'proposed').forEach(s => { if (!prop.find(p => p.label === s.label)) prop.push({ s, f }); }));
    const tc = c => (STATE_TYPES.find(x => x[0] === c) || [0, { 3: 'Pre-Open', 4: 'Requested', 5: 'Rejected', 7: 'Exit' }[c] || 'Open'])[1];
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Display name</th><th>Name</th><th>Type</th><th>Locked</th><th>Pauses work duration</th><th>Used in</th><th>Source</th></tr></thead><tbody>${base.map(s => { const used = F.flowsForModule(m).filter(x => F.flowModel(x.id).states.some(z => z.name.toLowerCase() === s.name.toLowerCase())).map(x => F.flowModel(x.id).name);
      return `<tr><td><b>${esc(s.label)}</b></td><td class="mono xs">${esc(s.name)}</td><td>${esc(tc(s.typeCode))}</td><td>${s.locked ? tag('orange', 'Locked') : '<span class="dash">No</span>'}</td><td>${s.timer === false ? 'Yes' : '<span class="dash">No</span>'}</td><td class="small">${esc(used.join(', ')) || '<span class="muted">Not used</span>'}</td><td>${tag('system', 'Configured')}</td></tr>`; }).join('')}
      ${prop.map(({ s, f }) => { const p = stateProps(f, s); return `<tr><td><b>${esc(s.label)}</b></td><td class="mono xs">${esc(s.name)}</td><td>${esc(tc(p.typeCode))}</td><td>${p.locked ? tag('orange', 'Locked') : '<span class="dash">No</span>'}</td><td>${p.pauseTimer ? 'Yes' : '<span class="dash">No</span>'}</td><td class="small">${esc(f.name)}</td><td>${tag('proposed', 'Proposed')}</td></tr>`; }).join('')}
      ${!base.length && !prop.length ? '<tr><td colspan="7" class="empty">No states for this module.</td></tr>' : ''}</tbody></table></div>`;
  }
  function overviewTable() {
    const rows = F.allFlows().map(id => { const f = F.flowModel(id); const m = F.moduleView(f.module); if (!m) return null; const live = f.transitions.filter(t => !t.removed && t.enabled !== false); return { f, m, live, tbc: live.filter(t => t.type === 'user' && (t.actors || []).every(F.isTbc)).length }; }).filter(Boolean);
    const sc = S.ui.flowScope || 'scope'; const list = rows.filter(r => sc === 'all' || (sc === 'scope' ? r.m.inScope : r.m.inUse)).sort((a, b) => (b.m.inScope - a.m.inScope) || a.m.label.localeCompare(b.m.label));
    return `<div class="row" style="margin-bottom:12px"><div class="seg">${[['scope', 'In scope'], ['inuse', 'Modules in use'], ['all', 'All']].map(([v, l]) => `<button class="${sc === v ? 'on' : ''}" data-act="flowScope" data-v="${v}">${l}</button>`).join('')}</div><span class="muted small">${list.length} stateflows</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>Stateflow</th><th>Status</th><th class="num">States</th><th class="num">Active transitions</th><th>Roles to confirm</th><th>Workshop</th><th>Review</th><th></th></tr></thead><tbody>${list.map(r => { const rv = V.rv(r.m.name, 'flow'); return `<tr class="click" data-act="openFlow" data-flow="${esc(r.f.id)}"><td><b>${esc(r.m.label)}</b>${r.m.inScope ? '' : ' ' + tag('low', 'not in scope')}</td><td>${esc(r.f.name)}</td><td>${r.f.enabled === false ? tag('low', 'Disabled') : tag('verified', 'Active')}</td><td class="num">${r.f.states.length}</td><td class="num">${r.live.length}</td><td>${r.tbc ? tag('tbc', r.tbc + ' actions') : tag('verified', 'None')}</td><td>${r.f.origin === 'proposed' ? tag('proposed', 'Proposed') : S.ws.flows[r.f.id] ? tag('modified', 'Edited') : ''}${r.f.removalProposed ? ' ' + tag('orange', 'Removal proposed') : ''}</td><td>${tag(V.reviewCls(rv.status), (V.REVIEW.find(x => x[0] === rv.status) || [0, 'Not started'])[1])}</td><td>${S.readonly ? '' : r.f.origin === 'proposed' ? `<button class="btn sm danger" data-act="flowRowDel" data-flow="${esc(r.f.id)}" aria-label="Delete ${esc(r.f.name)}">Delete</button>` : `<button class="btn sm" data-act="flowRowDel" data-flow="${esc(r.f.id)}" aria-label="${r.f.removalProposed ? 'Keep' : 'Propose removal of'} ${esc(r.f.name)}">${r.f.removalProposed ? 'Keep it' : 'Propose removal'}</button>`}</td></tr>`; }).join('') || '<tr><td colspan="9" class="empty">No stateflows match.</td></tr>'}</tbody></table></div>`;
  }
  ACT.flowTab = a => { S.ui.flowTab = a.getAttribute('data-v'); V.render(); };
  ACT.flowModule = el => { S.ui.flowModule = el.value; V.render(); };
  ACT.flowScope = a => { S.ui.flowScope = a.getAttribute('data-v'); V.render(); };
  ACT.openFlow = a => { S.ui.flowZoom = null; V.go('flow', { flowId: a.getAttribute('data-flow'), selected: null }); };
  ACT.flowList = () => { S.ui.flowModule = (F.flowModel(S.ui.flowId) || {}).module || S.ui.flowModule; V.go('flow', { flowId: null }); };
  ACT.newFlowDlg = a => {
    const m = a.getAttribute('data-module'); const mods = F.allModules().filter(x => x.inUse || x.origin === 'proposed').sort((p, q) => p.label.localeCompare(q.label));
    const states = (S.baseline && S.baseline.statuses[m]) || [];
    drawer('New Stateflow', `<div class="fgrid"><div class="full"><label class="f">Module</label>${sel('', mods.map(x => ({ v: x.name, l: x.label })), m, 'id="nf_mod" data-change="nfModChange"')}</div>
      <div class="full"><label class="f">Name <span class="req">*</span></label><input type="text" id="nf_name" placeholder="Enter state flow name"></div>
      <div class="full"><label class="f">Default State <span class="req">*</span></label><input type="text" id="nf_state" list="nf_states" placeholder="Select the default state" value="${esc(states[0] ? states[0].label : 'Open')}"><datalist id="nf_states">${states.map(s => `<option value="${esc(s.label)}">`).join('')}</datalist></div>
      <div class="full"><label class="f">Description</label><textarea id="nf_desc" rows="3" placeholder="Enter state flow description"></textarea></div>
      <div class="full"><div class="pink-label">Criteria</div><div class="xs muted" style="margin-bottom:6px">Define the criteria for this state flow</div><textarea id="nf_crit" rows="2" placeholder="e.g. Category is Electrical"></textarea></div>
      <div class="full"><label class="chk"><input type="checkbox" id="nf_copy"> Start from a copy of the module's default stateflow</label></div></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="createFlow">Save</button>`);
  };
  ACT.nfModChange = el => { const st = (S.baseline && S.baseline.statuses[el.value]) || []; document.getElementById('nf_states').innerHTML = st.map(s => `<option value="${esc(s.label)}">`).join(''); };
  ACT.createFlow = () => {
    const m = document.getElementById('nf_mod').value; const name = document.getElementById('nf_name').value.trim(); const ds = document.getElementById('nf_state').value.trim();
    if (!name) { toast('Please enter a name'); return; } if (!ds) { toast('Please select the default state'); return; }
    const id = m + '::proposed_' + Math.random().toString(36).slice(2, 7); let flow;
    const def = document.getElementById('nf_copy').checked && F.flowsForModule(m).find(x => x.isDefault) ;
    if (def) { flow = F.clone(F.flowModel(def.id)); flow.transitions.forEach(t => { t.origin = 'proposed'; t.baselineId = null; t.id = F.uid('t'); }); flow.states.forEach(s => s.origin = 'proposed'); }
    else { const sid = 's_' + F.slug(ds); const b = statusInfo(m, ds); flow = { states: [{ id: sid, name: b ? b.name : F.slug(ds), label: b ? b.label : ds, x: 80, y: 80, origin: b ? 'baseline' : 'proposed' }], transitions: [], initial: sid }; }
    Object.assign(flow, { id, module: m, name, description: document.getElementById('nf_desc').value.trim(), criteria: document.getElementById('nf_crit').value.trim(), origin: 'proposed', enabled: true, workshopCopy: true, isDefault: false });
    const init = flow.states.find(s => s.label.toLowerCase() === ds.toLowerCase()); if (init) flow.initial = init.id;
    S.ws.flows[id] = flow; closeDrawer(); F.changed('Stateflow created', modLabel(m) + ' › ' + name); V.go('flow', { flowId: id, selected: null });
  };

  // ================= EDITOR (StateFlowBuilder.vue) =================
  const hist = {}; // undo/redo stacks per flow (session only)
  function ef() { return F.editableFlow(S.ui.flowId); }
  function mut(action, detail, fn) { const f = ef(); const h = hist[f.id] = hist[f.id] || { u: [], r: [] }; h.u.push(JSON.stringify(f)); if (h.u.length > 60) h.u.shift(); h.r = []; fn(f); F.changed(action, detail); }
  function selT(f) { return f.transitions.find(t => t.id === S.ui.selected); }
  const selKind = f => !S.ui.selected ? '' : f.states.some(s => s.id === S.ui.selected) ? 'state' : f.transitions.some(t => t.id === S.ui.selected) ? 'transition' : '';
  // one Delete for whatever is selected: proposed items are deleted outright; configured ones are recorded as a
  // removal against the source (shown with "Show proposed removals", reversible with Undo) so the BRD can list it
  ACT.deleteSel = async () => { const f = F.flowModel(S.ui.flowId); const k = selKind(f); if (!k || S.readonly) return;
    if (k === 'state') return ACT.removeState();
    const t = selT(f); if (t.removed) return; await ACT.removeT(); toast(t.origin === 'proposed' ? 'Transition deleted' : 'Transition removed — kept as a proposed removal against the source. Undo with ↶'); };
  document.addEventListener('keydown', e => { if (S.ui.view !== 'flow' || !S.ui.flowId || S.readonly) return; const tg = e.target; if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.ui.selected) { e.preventDefault(); ACT.deleteSel(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? ACT.redo() : ACT.undo(); }
    // arrow keys move the selected state or transition button (Shift = 1 px, otherwise 10 px)
    else if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && S.ui.selected) { const f = F.flowModel(S.ui.flowId); const st = f.states.find(x => x.id === S.ui.selected); const tr = !st && f.transitions.find(x => x.id === S.ui.selected); if (!st && !tr) return; e.preventDefault();
      const d = e.shiftKey ? 1 : 10; const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      let base = null; if (tr && !tr.lp) { const ge = D.flowGeometry(f, { showRemoved: !!S.ui.flowRemoved }).edges.find(x => x.t.id === tr.id); if (!ge) return; base = { x: ge.lx, y: ge.ly }; }
      mut(st ? 'State moved' : 'Transition button moved', S.ui.selected, g => { if (st) { const s = g.states.find(x => x.id === st.id); s.x = Math.max(0, (s.x || 0) + dx); s.y = Math.max(0, (s.y || 0) + dy); } else { const t = g.transitions.find(x => x.id === tr.id); const b = t.lp || base; t.lp = { x: Math.max(0, Math.round(b.x + dx)), y: Math.max(0, Math.round(b.y + dy)) }; } }); } });
  function selS(f) { return f.states.find(s => s.id === S.ui.selected); }
  const stLabel = (f, id) => (f.states.find(x => x.id === id) || {}).label || id;

  function editor(f) {
    const m = F.moduleView(f.module) || { label: f.module }; const d = F.flowDiff(f.id); const nCh = d ? (d.proposedFlow ? 0 : d.changes.length) : 0; const z = S.ui.flowZoom || 1; const h = hist[f.id] || { u: [], r: [] };
    const flowsHere = F.flowsForModule(f.module); const lower = S.ui.flowLower || 'table';
    const head = `<div class="page-header"><button class="back-btn" data-act="flowList" aria-label="Back to stateflows">${ico('left')}</button><div class="t"><div class="crumbs">${esc(m.label)} › Stateflow</div><h1>${esc(f.name)}</h1><div class="row" style="margin-top:6px">${f.origin === 'proposed' ? tag('proposed', 'Proposed stateflow') : nCh ? tag('modified', nCh + ' workshop change' + (nCh > 1 ? 's' : '')) : tag('system', 'Configured — no changes')} ${f.enabled === false ? tag('low', 'Disabled in configuration') : tag('verified', 'Active')}${f.removalProposed ? ' ' + tag('orange', 'Removal proposed') : ''}${f.isDefault ? ' ' + tag('blue', 'Default stateflow') : ''}${f.criteria ? `<span class="small muted">Applies when: ${esc(f.criteria)}</span>` : ''}</div></div>
      <div class="row">${flowsHere.length > 1 ? `<select data-change="switchFlow" style="width:230px" aria-label="Switch stateflow">${flowsHere.map(x => `<option value="${esc(x.id)}" ${x.id === f.id ? 'selected' : ''}>${esc(F.flowModel(x.id).name)}${x.enabled ? '' : ' (disabled)'}</option>`).join('')}</select>` : ''}${V.reviewWidget(f.module, 'flow', 'Review')}</div></div>`;
    const ro = S.readonly;
    const tb = `<div class="sfb-toolbar"><button class="btn sm" data-act="flowList">${ico('left')}Go Back</button><span class="sep"></span>
      ${ro ? tag('low', 'View only') : `<button class="btn sm ${S.ui.connect ? 'primary' : ''}" data-act="toggleConnect" title="Click, then drag from a state to another state">${ico('plus')}Add Transition</button><button class="btn sm" data-act="addState" title="Add a new state to the canvas">${ico('plus')}Add State</button><button class="btn sm danger" data-act="deleteSel" ${selKind(f) ? '' : 'disabled'} title="${selKind(f) ? 'Delete the selected ' + selKind(f) + ' (Delete key)' : 'Select a state or transition to delete it'}">${ico('trash')}Delete${selKind(f) ? ' ' + selKind(f) : ''}</button><span class="sep"></span><span class="xs muted">Auto-Align</span><div class="seg sm" role="group" aria-label="Auto-Align direction"><button class="${(f.layoutDir || 'h') === 'h' ? 'on' : ''}" data-act="relayout" data-dir="h" title="Align left to right">→ Horizontal</button><button class="${f.layoutDir === 'v' ? 'on' : ''}" data-act="relayout" data-dir="v" title="Align top to bottom">↓ Vertical</button></div><button class="btn sm" data-act="undo" ${h.u.length ? '' : 'disabled'} aria-label="Undo">↶</button><button class="btn sm" data-act="redo" ${h.r.length ? '' : 'disabled'} aria-label="Redo">↷</button><span class="sep"></span>`}
      <button class="btn sm" data-act="fitFlow">Fit To Screen</button><button class="btn sm" data-act="zoom" data-d="0.1" aria-label="Zoom in">${ico('zoomin')}</button><button class="btn sm" data-act="zoom" data-d="-0.1" aria-label="Zoom out">${ico('zoomout')}</button><span class="xs muted">${Math.round(z * 100)}%</span><span class="sep"></span>
      <label class="chk small"><input type="checkbox" data-ui="flowExt" ${S.ui.flowExt !== false ? 'checked' : ''}> Cross-module actions</label><label class="chk small"><input type="checkbox" data-ui="flowRemoved" ${S.ui.flowRemoved ? 'checked' : ''}> Show proposed removals</label>
      <span class="spacer"></span><button class="btn sm" data-act="dlPng">${ico('dl')}PNG</button>${!ro && f.workshopCopy && f.origin !== 'proposed' ? `<button class="btn sm danger" data-act="resetFlow">Reset to source</button>` : ''}${!ro && f.origin === 'proposed' ? `<button class="btn sm danger" data-act="deleteFlow">Delete</button>` : ''}${!ro && f.origin !== 'proposed' ? `<button class="btn sm${f.removalProposed ? '' : ' danger'}" data-act="flowRowDel" data-flow="${esc(f.id)}">${f.removalProposed ? 'Keep this flow' : 'Propose removal'}</button>` : ''}</div>`;
    const legend = `<div class="legend" style="padding:6px 12px;border-top:1px solid var(--fc-border)"><span><i class="pill" style="background:#6071db"></i>User</span><span><i class="pill" style="background:#45bec4"></i>Condition</span><span><i class="pill" style="background:#4eb871"></i>Time</span><span><i class="pill" style="background:#b5bcc6"></i>Disabled</span><span><i class="pill" style="background:#6071db;outline:2px solid #f5a623"></i>Role to be confirmed</span><span>Dashed = proposed</span><span><i class="pill" style="background:#fff;border:2px solid #60a9a6"></i>Default state</span></div>`;
    const canvas = `<div style="min-width:0"><div class="sfb-canvas${S.ui.connect ? ' connect' : ''}" id="sfbCanvas"><div id="canvas">${svgFor(f)}</div></div>${legend}</div>`;
    const lowerTabs = [['table', 'Transition table'], ['guide', 'Process guide'], ['changes', 'Changes vs source' + (nCh ? ` (${nCh})` : '')], ['cross', 'Cross-module actions']];
    return head + `<div class="page-body"><div class="sfb">${tb}${canvas}<aside class="sfb-side" id="panel">${panel(f)}</aside></div>
      <div class="tabs inline" style="margin-top:16px">${lowerTabs.map(([k, l]) => `<button class="tab${lower === k ? ' active' : ''}" data-act="flowLower" data-v="${k}">${esc(l)}</button>`).join('')}</div><div style="margin-top:12px">${lower === 'guide' ? processGuide(f) : lower === 'changes' ? changes(f) : lower === 'cross' ? V.crossLinkTable(f.module) : table(f)}</div></div>`;
  }
  function svgFor(f) {
    const html = D.flowSvg(Object.assign({}, f, { transitions: f.transitions }), { interactive: !S.readonly, selected: S.ui.selected, zoom: S.ui.flowZoom || 1, showRemoved: !!S.ui.flowRemoved, transparent: true });
    if (S.ui.flowExt === false) return html;
    const ex = externalsFor(f).filter(x => x.state); if (!ex.length) return html;
    const G = D.flowGeometry(f, {}); const count = {}; let add = '';
    ex.forEach(x => { const s = G.st[x.state]; if (!s) return; const i = count[x.state] = (count[x.state] || 0) + 1; const bx = s.x + s.w + 50, by = s.y - 18 + (i - 1) * 40; const col = x.disabled ? '#b5bcc6' : x.verified ? '#8e6bd6' : '#f5a623';
      add += `<g><title>${esc(x.label + ' → ' + x.target + (x.verified ? ' (verified in configuration)' : ' (to be confirmed)') + (x.disabled ? ' — disabled' : ''))}</title><path d="M ${s.x + s.w} ${s.y + s.h / 2} L ${bx} ${by + 15}" stroke="${col}" stroke-width="1.2" stroke-dasharray="4 3" fill="none"/><rect x="${bx}" y="${by}" width="150" height="30" rx="15" fill="#fff" stroke="${col}" stroke-dasharray="4 3"/><text x="${bx + 75}" y="${by + 13}" text-anchor="middle" font-size="10" fill="${col}">${esc(x.label.length > 24 ? x.label.slice(0, 23) + '…' : x.label)}</text><text x="${bx + 75}" y="${by + 25}" text-anchor="middle" font-size="9.5" fill="#6b7e91">→ ${esc(x.target.length > 24 ? x.target.slice(0, 23) + '…' : x.target)}</text></g>`; });
    return html.replace('</svg>', add + '</svg>');
  }
  ACT.flowLower = a => { S.ui.flowLower = a.getAttribute('data-v'); V.render(); };
  ACT.switchFlow = el => { S.ui.flowZoom = null; V.go('flow', { flowId: el.value, selected: null }); };
  ACT.toggleConnect = () => { S.ui.connect = !S.ui.connect; V.render(); if (S.ui.connect) toast('Drag from a state to another state to add a transition'); };
  ACT.zoom = a => { S.ui.flowZoom = Math.max(0.4, Math.min(2, Math.round(((S.ui.flowZoom || 1) + Number(a.getAttribute('data-d'))) * 10) / 10)); V.render(); };
  ACT.fitFlow = () => { const f = F.flowModel(S.ui.flowId); const G = D.flowGeometry(f, {}); const c = document.getElementById('sfbCanvas'); const w = c ? c.clientWidth - 20 : 900, h = c ? c.clientHeight - 20 : 600; S.ui.flowZoom = Math.max(0.4, Math.min(1.5, Math.floor(Math.min(w / G.W, h / G.H) * 10) / 10)); V.render(); };
  ACT.undo = () => { const f = ef(); const h = hist[f.id]; if (!h || !h.u.length) return; h.r.push(JSON.stringify(f)); S.ws.flows[f.id] = JSON.parse(h.u.pop()); F.changed('Undo', f.name); };
  ACT.redo = () => { const f = ef(); const h = hist[f.id]; if (!h || !h.r.length) return; h.u.push(JSON.stringify(f)); S.ws.flows[f.id] = JSON.parse(h.r.pop()); F.changed('Redo', f.name); };
  // the whole diagram (every state and transition, not the visible part), at high resolution, named after the module and the flow
  ACT.dlPng = a => V.busy(a, async () => {
    const f = F.flowModel(S.ui.flowId); if (!f) { V.toast('Open a state flow first', 4000, true); return; }
    const png = await D.svgToPng(D.flowSvg(f, { full: true }), 2); const mv = F.moduleView(f.module);
    const name = F.slug(((mv && mv.label) || f.module) + '-' + (f.name || 'state-flow')) + '.png';
    V.download(name, new Blob([png.data], { type: 'image/png' })); V.toast(`Exported ${name} (${Math.round(png.width)} × ${Math.round(png.height)} diagram units)`);
  });
  ACT.deleteFlow = async () => { if (!(await confirmDialog('Delete stateflow', 'Delete this proposed stateflow?', 'Delete', true))) return; const f = S.ws.flows[S.ui.flowId]; delete S.ws.flows[S.ui.flowId]; S.ui.flowModule = f.module; F.changed('Proposed stateflow deleted', f.name); V.go('flow', { flowId: null }); };
  // Delete from the list or the editor. A flow proposed in the workshops is deleted. A flow that is configured in the organisation cannot be deleted from here (the
  // configuration is the customer's), so the workshop records a proposed removal that shows on the flow, in the change summary and in the BRD, and can be taken back.
  ACT.flowRowDel = async a => { const id = a.getAttribute('data-flow') || S.ui.flowId; const f = F.flowModel(id); if (!f || S.readonly) return;
    if (f.origin === 'proposed') { if (!(await confirmDialog('Delete stateflow', 'Delete "' + f.name + '"? This proposed stateflow and its transitions are removed from the workshop. This cannot be undone.', 'Delete', true))) return; delete S.ws.flows[id]; delete hist[id]; if (S.ui.flowId === id) S.ui.flowId = null; F.changed('Proposed stateflow deleted', f.name); V.go('flow', { flowId: null }); toast('Stateflow deleted'); return; }
    if (f.removalProposed) { const e = F.editableFlow(id); delete e.removalProposed; F.changed('Stateflow removal withdrawn', f.name); V.render(); toast('Removal withdrawn'); return; }
    if (!(await confirmDialog('Propose removal', 'The configured stateflow "' + f.name + '" belongs to the organisation, so it is not deleted here. Mark it as proposed for removal? It is listed in the change summary and the BRD, and you can take this back.', 'Propose removal', true))) return;
    const e = F.editableFlow(id); e.removalProposed = true; F.changed('Stateflow removal proposed', f.name); V.render(); toast('Removal proposed'); };
  ACT.resetFlow = async () => { if (!(await confirmDialog('Reset to source', 'Discard all workshop changes to this stateflow and show it as configured?', 'Reset', true))) return; delete S.ws.flows[S.ui.flowId]; delete hist[S.ui.flowId]; S.ui.selected = null; F.changed('Stateflow reset to source', S.ui.flowId); };
  ACT.relayout = a => { const dir = (a && a.getAttribute('data-dir')) || F.flowModel(S.ui.flowId).layoutDir || 'h'; mut(dir === 'v' ? 'Stateflow aligned top to bottom' : 'Stateflow aligned left to right', S.ui.flowId, f => { f.layoutDir = dir; f.states.forEach(s => { s.x = null; s.y = null; }); f.transitions.forEach(t => { delete t.lp; }); F.autoLayout(f.states, f.transitions, f.initial, dir); }); setTimeout(() => ACT.fitFlow(), 0); };

  // ---------- sidebar ----------
  function panel(f) {
    const t = selT(f), s = selS(f); const ro = S.readonly;
    if (t) return transitionPanel(f, t, ro);
    if (s) return statePanel(f, s, ro);
    const q = (S.ui.stq || '').toLowerCase(); const B = S.baseline;
    const avail = ((B && B.statuses[f.module]) || []).filter(b => !f.states.some(x => x.name.toLowerCase() === b.name.toLowerCase() || x.label.toLowerCase() === b.label.toLowerCase())).filter(b => !q || b.label.toLowerCase().includes(q));
    const live = f.transitions.filter(x => !x.removed && x.enabled !== false); const tbc = live.filter(x => x.type === 'user' && (x.actors || []).every(F.isTbc));
    return `<div class="side-h"><h3>${esc(f.name)}</h3><div class="xs muted">${esc(modLabel(f.module))}</div></div>
      <div class="side-sec"><div class="pink-label" style="margin-top:0">Available states</div><div class="xs muted" style="margin-bottom:8px">Drag and drop existing states into the stateflow or create a new state</div>
      <div class="search" style="margin-bottom:8px">${ico('search')}<input type="search" id="stq" placeholder="Search" value="${esc(S.ui.stq || '')}"></div>
      ${ro ? '' : `<button class="add-state-pill" data-act="addState" style="margin-bottom:10px">+ Add State</button>`}<div>${avail.map(b => `<span class="state-chip" draggable="${!ro}" data-chip="${esc(b.name)}" data-act="${ro ? '' : 'chipAdd'}" data-name="${esc(b.name)}" title="Drag onto the canvas, or click to add">${esc(b.label)}</span>`).join('') || '<span class="xs muted">All module states are in this stateflow.</span>'}</div></div>
      <div class="side-sec"><label class="f">Name</label><input type="text" value="${esc(f.name)}" data-change="flowProp" data-prop="name" ${ro ? 'disabled' : ''}>
      <label class="f" style="margin-top:8px">Description</label><textarea rows="2" data-change="flowProp" data-prop="description" ${ro ? 'disabled' : ''}>${esc(f.description || '')}</textarea>
      <label class="f" style="margin-top:8px">Default state</label>${sel('', f.states.map(x => ({ v: x.id, l: x.label })), f.initial, `data-change="flowInitial" ${ro ? 'disabled' : ''}`)}
      ${f.isDefault ? '<div class="xs muted" style="margin-top:8px">Default stateflow — applies to records not matched by another stateflow, so it has no criteria.</div>' : `<div class="pink-label">Criteria</div><textarea rows="2" data-change="flowProp" data-prop="criteria" placeholder="Define the criteria for this state flow" ${ro ? 'disabled' : ''}>${esc(f.criteria || '')}</textarea>`}</div>
      <div class="side-sec"><dl class="kv small"><dt>States</dt><dd>${f.states.length}</dd><dt>Active transitions</dt><dd>${live.length}</dd><dt>Automated</dt><dd>${live.filter(x => x.type !== 'user').length}</dd><dt>Shown in portals</dt><dd>${live.filter(x => (x.portals || []).length).length}</dd><dt>Roles to confirm</dt><dd>${tbc.length ? tag('tbc', tbc.length) : tag('verified', '0')}</dd></dl>
      ${tbc.length ? `<div class="pink-label">Transitions needing a responsible role</div>${tbc.map(x => `<div class="list-item small" data-act="selectEl" data-id="${esc(x.id)}">${esc(x.name)} <span class="muted">${esc(stLabel(f, x.from))} → ${esc(stLabel(f, x.to))}</span></div>`).join('')}` : ''}</div>`;
  }
  function transitionPanel(f, t, ro) {
    const B = S.baseline; const bt = t.baselineId && B && B.transitions.find(x => x.id === t.baselineId);
    const fields = F.effFields(f.module).filter(x => x.status !== 'removed'); const stateOpts = f.states.map(x => ({ v: x.id, l: x.label })); const dis = ro ? 'disabled' : '';
    const tab = S.ui.tTab || 'before'; const kind = t.type === 'automatic' ? 'cond' : /scheduled/.test(t.type) ? 'time' : 'user';
    const portals = [['occupant', 'Occupant Portal'], ['vendor', 'Vendor Portal'], ['tenant', 'Tenant Portal'], ['client', 'Client Portal']];
    let body = '';
    if (tab === 'before') {
      body = `<div class="tp-h">Who can perform this transition?</div><div class="tp-seg tp-seg3" role="radiogroup" aria-label="Who performs it">${[['user', 'User'], ['time', 'By time'], ['cond', 'By condition']].map(([v, l]) => `<label class="${kind === v ? 'on' : ''}"><input type="radio" name="tkind" value="${v}" ${kind === v ? 'checked' : ''} data-change="tKind" ${dis}>${l}</label>`).join('')}</div>`;
      if (kind === 'user') body += `<div class="xs muted" style="margin-bottom:6px">Specify users, roles or groups who can perform this transition</div>${(t.actors || []).map((a, i) => { const ac = F.actor(a.actor); return `<div class="actor-row"><div class="nm"><div class="small"><b>${esc(ac.label)}</b></div><div class="xs muted">${esc(F.CATEGORY_LABEL[ac.category] || ac.category)}${a.note ? ' · ' + esc(a.note) : ''}</div></div>${sel('', ASTATUS, a.status, `data-change="actorStatus" data-i="${i}" style="width:140px;height:28px" ${dis}`)}${ro ? '' : `<button class="btn sm ghost" data-act="removeActor" data-i="${i}" aria-label="Remove">${ico('x')}</button>`}</div>`; }).join('') || `<div class="notice warn small" style="margin-bottom:6px">No user or role configured — documented as “User / Role to Be Confirmed”.</div>`}
        ${ro ? '' : `<select data-change="addActor">${actorOptions(true)}</select>`}${(t.actors || []).filter(a => !/^system$/.test(a.actor)).length > 1 ? `<div class="row small" style="margin-top:8px"><span>To be performed by</span><label class="chk"><input type="radio" name="tall" ${t.allRequired ? '' : 'checked'} data-change="tAll" value="0" ${dis}> Any one</label><label class="chk"><input type="radio" name="tall" ${t.allRequired ? 'checked' : ''} data-change="tAll" value="1" ${dis}> All</label></div>` : ''}
        <div class="xs muted" style="margin-top:6px">A role picked here is “Proposed in workshop” until set to “Confirmed in workshop”. Roles are never invented — use the to-be-confirmed entries when the role is unknown.</div>`;
      if (kind === 'time') { const sc = t.schedule || {}; body += `<div class="xs muted" style="margin-bottom:6px">Specify the time after which the transition is performed</div><div class="fgrid"><div class="full row small"><label class="chk"><input type="radio" name="tsch" value="scheduled" ${t.type === 'scheduled' ? 'checked' : ''} data-change="tf" data-prop="type" ${dis}> On Time</label><label class="chk"><input type="radio" name="tsch" value="scheduled-date" ${t.type === 'scheduled-date' ? 'checked' : ''} data-change="tf" data-prop="type" ${dis}> On Date</label></div>
        ${t.type === 'scheduled-date' ? `<div><label class="f">Date field</label>${sel('', [{ v: '', l: '—' }].concat(fields.filter(x => /Date/.test(x.type)).map(x => ({ v: x.name, l: x.label }))), sc.dateField, `data-change="tf" data-prop="dateField" ${dis}`)}</div><div><label class="f">Schedule type</label>${sel('', [{ v: 1, l: 'Before' }, { v: 2, l: 'On' }, { v: 3, l: 'After' }], sc.scheduleType || 3, `data-change="tf" data-prop="scheduleType" ${dis}`)}</div>` : ''}
        <div><label class="f">Days</label><input type="number" min="0" max="90" value="${Math.floor((sc.intervalSeconds || 0) / 86400)}" data-change="tf" data-prop="days" ${dis}></div><div><label class="f">Hours</label><input type="number" min="0" max="23" value="${Math.floor(((sc.intervalSeconds || 0) % 86400) / 3600)}" data-change="tf" data-prop="hours" ${dis}></div></div>`; }
      body += `<div class="pink-label">Conditions</div><div class="xs muted" style="margin-bottom:6px">Specify conditions for this transition</div><textarea rows="2" data-change="tf" data-prop="condition" placeholder="Business wording, e.g. Vendor is not empty" ${dis}>${esc(t.condition || '')}</textarea>
        <div class="chips" style="margin-top:6px">${(t.conditionFields || []).map((cf, i) => { const fx = fields.find(x => x.name === cf); return `<span class="chip">${esc(fx ? fx.label : cf + ' (missing)')}${ro ? '' : `<button data-act="rmCondField" data-i="${i}" aria-label="Remove">×</button>`}</span>`; }).join('')}</div>${ro ? '' : `<select data-change="addCondField" style="margin-top:6px"><option value="">Fields used by the condition…</option>${fields.map(x => `<option value="${esc(x.name)}">${esc(x.label)} (${esc(x.type)})</option>`).join('')}</select>`}`;
    } else if (tab === 'during') {
      body = kind !== 'user' ? '<div class="notice small">During actions apply to user transitions only.</div>' : `<div class="cfg-line"><span class="t">Update fields while performing this transition</span></div><textarea rows="2" data-change="tf" data-prop="fieldUpdates" placeholder="One per line, e.g. Resolution Notes" ${dis}>${esc((t.fieldUpdates || []).join('\n'))}</textarea>
        <div class="cfg-line"><span class="t">Create a record while performing this transition</span></div>${sel('', [{ v: '', l: '— none —' }].concat(F.allModules().filter(x => x.inUse).sort((a, b) => a.label.localeCompare(b.label)).map(x => ({ v: x.name, l: x.label }))), (t.createRecord || {}).module || '', `data-change="tf" data-prop="createRecord" ${dis}`)}
        <div class="cfg-line"><span class="t">Update comment (mandatory comment)</span>${sw('', t.commentRequired, `data-change="tf" data-prop="commentRequired"`)}</div>
        <div class="pink-label">Approval</div><div class="cfg-line"><span class="t">Requires approval</span>${sw('', t.approval && t.approval.required, `data-change="tf" data-prop="approvalRequired"`)}</div>
        ${t.approval && t.approval.required ? `<div class="chips" style="margin:6px 0">${(t.approval.approvers || []).map((x, i) => `<span class="chip">${esc(F.actorLabel(x))}${ro ? '' : `<button data-act="rmApprover" data-i="${i}" aria-label="Remove">×</button>`}</span>`).join('') || '<span class="xs muted">Approver to be confirmed</span>'}</div>${ro ? '' : `<select data-change="addApprover">${actorOptions(true, 'Add approver…')}</select>`}
          <div class="fgrid" style="margin-top:8px"><div><label class="f">Approvers</label>${sel('', [{ v: 'any', l: 'Any one' }, { v: 'all', l: 'All' }], t.approval.all ? 'all' : 'any', `data-change="tf" data-prop="approvalAll" ${dis}`)}</div><div><label class="f">On rejection go to</label>${sel('', [{ v: '', l: '— stay / to be confirmed —' }].concat(stateOpts), t.approval.rejectTo || '', `data-change="tf" data-prop="rejectTo" ${dis}`)}</div></div>` : ''}
        <div class="pink-label">Confirmations</div><textarea rows="2" data-change="tf" data-prop="confirmations" placeholder="One per line — message shown before the transition runs" ${dis}>${esc((t.confirmations || []).join('\n'))}</textarea>
        <div class="pink-label">Validations</div><textarea rows="2" data-change="tf" data-prop="validations" placeholder="One per line — error message when the condition fails" ${dis}>${esc((t.validations || []).join('\n'))}</textarea>`;
    } else {
      body = `<div class="xs muted" style="margin-bottom:8px">Configure actions to execute when this transition occurs.</div>${(t.actions || []).map((x, i) => `<div class="actor-row"><div class="nm small">${esc(x)}</div>${ro ? '' : `<button class="btn sm ghost" data-act="rmAfter" data-i="${i}" aria-label="Remove">${ico('x')}</button>`}</div>`).join('') || '<div class="xs muted">No actions.</div>'}
        ${ro ? '' : `<div class="row" style="margin-top:6px"><select id="afterType" style="width:180px">${AFTER_ACTIONS.map(a => `<option>${a}</option>`).join('')}</select><input type="text" id="afterDetail" placeholder="Details" style="flex:1"><button class="btn sm" data-act="addAfter">Add</button></div>`}
        <div class="pink-label">Notification recipients</div><textarea rows="2" data-change="tf" data-prop="notifications" placeholder="One per line" ${dis}>${esc((t.notifications || []).join('\n'))}</textarea>
        <div class="pink-label">Workshop notes</div><textarea rows="3" data-change="tf" data-prop="notes" ${dis}>${esc(t.notes || '')}</textarea>`;
    }
    const kindLbl = kind === 'cond' ? 'Automated by condition' : kind === 'time' ? 'Automated by time' : 'User action';
    return `<div class="side-h tp-head"><div class="tp-t"><span class="tp-eyebrow">${ro ? 'View' : 'Edit'} state transition</span><h3 title="${esc(t.name)}">${esc(t.name || 'Untitled transition')}</h3><div class="tp-route"><span>${esc(stLabel(f, t.from))}</span>${ico('right')}<span>${esc(stLabel(f, t.to))}</span></div><div class="tp-badges">${t.origin === 'proposed' ? tag('proposed', 'Proposed') : t.removed ? tag('removed', 'Removal proposed') : tag('system', 'Configured')}<span class="tp-kind k-${kind}">${kindLbl}</span></div></div><div class="tp-acts">${ro || t.removed ? '' : `<button class="btn sm ghost icon" data-act="deleteSel" title="${t.origin === 'proposed' ? 'Delete transition' : 'Propose removal'} (Delete key)" aria-label="Delete transition">${ico('trash')}</button>`}<button class="btn sm ghost icon" data-act="deselect" aria-label="Close">${ico('x')}</button></div></div>
      ${bt ? `<div class="tp-src xs"><b>Configured as</b> “${esc(bt.name)}” · ${esc(bt.fromLabel)} → ${esc(bt.toLabel)} · ${esc(bt.typeLabel)} · ${bt.enabled ? 'enabled' : 'disabled'}<span class="mono">${esc(bt.ref.file)} #${esc(bt.ref.uid)}</span></div>` : ''}
      <div class="side-sec tp-sec"><div class="tp-h">Basics</div><label class="f">Name</label><input type="text" value="${esc(t.name)}" data-change="tf" data-prop="name" placeholder="Enter transition name" ${dis}>
      <div class="tp-ft"><div><label class="f">From state</label>${sel('', stateOpts, t.from, `data-change="tf" data-prop="from" ${dis}`)}</div><span class="tp-arrow" aria-hidden="true">${ico('right')}</span><div><label class="f">To state</label>${sel('', stateOpts, t.to, `data-change="tf" data-prop="to" ${dis}`)}</div></div></div>
      <div class="side-sec tp-sec"><div class="tp-h">Button</div><div class="tp-seg" role="radiogroup" aria-label="Button priority">${[[1, 'Primary'], [2, 'Secondary'], [0, 'Not specified']].map(([v, l]) => `<label class="${Number(t.buttonType || 0) === v ? 'on' : ''}"><input type="radio" name="bprio" value="${v}" ${Number(t.buttonType || 0) === v ? 'checked' : ''} data-change="tf" data-prop="buttonType" ${dis}>${l}</label>`).join('')}</div>
      <div class="tp-toggles"><div class="cfg-line"><span class="t">Show in other apps (portals)</span>${sw('', (t.portals || []).length > 0, 'data-change="tPortalsToggle"')}</div>
      ${(t.portals || []).length || S.ui.portalsOpen ? `<div class="tp-portals">${portals.map(([p, l]) => `<label class="chk small"><input type="checkbox" ${(t.portals || []).indexOf(p) >= 0 ? 'checked' : ''} data-change="tfPortal" data-p="${p}" ${dis}> ${l}</label>`).join('')}</div>` : ''}
      <div class="cfg-line"><span class="t">Allow permalinks in emails</span>${sw('', !!t.emailLink, 'data-change="tf" data-prop="emailLink"')}</div><div class="cfg-line"><span class="t">Enabled</span>${sw('', t.enabled !== false, 'data-change="tf" data-prop="enabled"')}</div></div></div>
      <div class="side-tabs tp-tabs" role="tablist">${[['before', 'Before'], ['during', 'During'], ['after', 'After']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="tTab" data-v="${k}">${l}</button>`).join('')}</div><div class="side-sec tp-body" style="border-bottom:0">${body}</div>
      ${ro ? '' : `<div class="side-sec row tp-foot">${t.removed ? `<button class="btn sm" data-act="restoreT">Undo removal</button>` : `<button class="btn sm danger" data-act="removeT">${t.origin === 'proposed' ? 'Delete transition' : 'Propose removal'}</button>`}<span class="spacer"></span><button class="btn sm" data-act="linkReq">Link requirement</button></div>`}`;
  }
  function statePanel(f, s, ro) {
    const p = stateProps(f, s); const ins = f.transitions.filter(x => x.to === s.id && !x.removed).length, outs = f.transitions.filter(x => x.from === s.id && !x.removed).length; const dis = ro ? 'disabled' : '';
    return `<div class="side-h row"><h3 style="flex:1">${ro ? 'State' : 'Edit State'}</h3>${ro ? '' : `<button class="btn sm ghost" data-act="deleteSel" title="Delete state (Delete key)" aria-label="Delete state">${ico('trash')}</button>`}${s.origin === 'proposed' ? tag('proposed', 'Proposed') : tag('system', 'Configured')}<button class="btn sm ghost" data-act="deselect" aria-label="Close">${ico('x')}</button></div>
      <div class="side-sec"><label class="f">Name</label><input type="text" value="${esc(s.label)}" data-change="sf" data-prop="label" placeholder="Enter state name" ${dis}>
      <label class="f" style="margin-top:10px">Type</label><div class="row small">${STATE_TYPES.map(([v, l]) => `<label class="chk"><input type="radio" name="stype" value="${v}" ${p.typeCode === v ? 'checked' : ''} data-change="sf" data-prop="typeCode" ${dis}> ${l}</label>`).join('')}${STATE_TYPES.some(x => x[0] === p.typeCode) ? '' : `<span class="xs muted">Configured type code ${p.typeCode}</span>`}</div>
      <div class="cfg-line"><span class="t">Locked<div class="xs muted">Record cannot be edited in this state</div></span>${sw('', p.locked, 'data-change="sf" data-prop="locked"')}</div>
      <div class="cfg-line"><span class="t">Pause work duration<div class="xs muted">Freezes the timer for record duration</div></span>${sw('', p.pauseTimer, 'data-change="sf" data-prop="pauseTimer"')}</div>
      <div class="cfg-line"><span class="t">Pause SLA<div class="xs muted">Pauses the SLA timer while in this state</div></span>${sw('', p.pauseSla, 'data-change="sf" data-prop="pauseSla"')}</div>
      ${p.fromConfig ? '<div class="xs muted">Type, lock and timer values are read from the configured status.</div>' : ''}</div>
      <div class="side-sec small">${f.initial === s.id ? tag('green', 'Default state') : ro ? '' : `<button class="btn sm" data-act="setInitial">Set as default state</button>`} <span class="muted">${ins} incoming · ${outs} outgoing</span>${!outs ? '<div class="xs muted" style="margin-top:6px">No outgoing transitions — the record stays in this state.</div>' : ''}</div>
      ${ro ? '' : `<div class="side-sec row"><button class="btn sm" data-act="addTransitionFrom">${ico('plus')}Transition from here</button><span class="spacer"></span><button class="btn sm danger" data-act="removeState">Delete state</button></div>`}`;
  }
  ACT.tTab = a => { S.ui.tTab = a.getAttribute('data-v'); V.render(); };
  ACT.deselect = () => { S.ui.selected = null; V.render(); };
  ACT.selectEl = a => { S.ui.selected = a.getAttribute('data-id'); V.render(); const p = document.getElementById('panel'); if (p) p.scrollTop = 0; };
  ACT.flowProp = el => mut('Stateflow updated', S.ui.flowId, f => { f[el.getAttribute('data-prop')] = el.value; });
  ACT.flowInitial = el => mut('Default state set', S.ui.flowId, f => { f.initial = el.value; });
  const lines = v => v.split('\n').map(x => x.trim()).filter(Boolean);
  ACT.tf = el => {
    const p = el.getAttribute('data-prop');
    mut('Transition updated', p + ' — ' + S.ui.flowId, f => { const t = selT(f); if (!t) return;
      if (['enabled', 'commentRequired', 'emailLink'].includes(p)) t[p] = el.checked;
      else if (p === 'approvalRequired') { t.approval = t.approval || { required: false, approvers: [] }; t.approval.required = el.checked; }
      else if (p === 'approvalAll') t.approval.all = el.value === 'all';
      else if (p === 'rejectTo') t.approval.rejectTo = el.value;
      else if (['actions', 'notifications', 'fieldUpdates', 'confirmations', 'validations'].includes(p)) t[p] = lines(el.value);
      else if (p === 'days' || p === 'hours') { t.schedule = t.schedule || {}; const cur = t.schedule.intervalSeconds || 0; const d = p === 'days' ? Number(el.value || 0) : Math.floor(cur / 86400); const h = p === 'hours' ? Number(el.value || 0) : Math.floor((cur % 86400) / 3600); t.schedule.intervalSeconds = d * 86400 + h * 3600; }
      else if (p === 'dateField') { t.schedule = t.schedule || {}; t.schedule.dateField = el.value; t.schedule.dateFieldLabel = F.fieldLabel(f.module, el.value); }
      else if (p === 'scheduleType') { t.schedule = t.schedule || {}; t.schedule.scheduleType = Number(el.value); }
      else if (p === 'createRecord') t.createRecord = el.value ? { module: el.value } : null;
      else if (p === 'buttonType') t.buttonType = Number(el.value);
      else t[p] = el.value; });
  };
  ACT.tKind = el => mut('Transition type changed', S.ui.flowId, f => { const t = selT(f); t.type = el.value === 'cond' ? 'automatic' : el.value === 'time' ? 'scheduled' : 'user';
    if (t.type !== 'user') { t.actors = [{ actor: 'system', status: 'proposed', note: 'Automated' }]; } else t.actors = (t.actors || []).filter(a => a.actor !== 'system'); });
  ACT.tAll = el => mut('Performed-by rule set', S.ui.flowId, f => { selT(f).allRequired = el.value === '1'; });
  ACT.tPortalsToggle = el => { if (el.checked) { S.ui.portalsOpen = true; V.render(); } else mut('Portal visibility reset', S.ui.flowId, f => { selT(f).portals = []; S.ui.portalsOpen = false; }); };
  ACT.tfPortal = el => { const p = el.getAttribute('data-p'); mut('Portal visibility changed', p, f => { const t = selT(f); t.portals = (t.portals || []).filter(x => x !== p); if (el.checked) { t.portals.push(p); if (!(t.actors || []).some(a => a.actor === 'tbc:' + p || F.actor(a.actor).category === p)) (t.actors = t.actors || []).push({ actor: 'tbc:' + p, status: 'tbc', note: 'Shown in ' + humanize(p) + ' Portal — role to be confirmed' }); } }); };
  ACT.addActor = el => { if (!el.value) return; const v = el.value; mut('Role assigned', F.actorLabel(v), f => { const t = selT(f); t.actors = (t.actors || []).filter(a => !(a.actor === 'tbc:any' && !/^tbc:/.test(v))); if (!t.actors.find(a => a.actor === v)) t.actors.push({ actor: v, status: /^tbc:/.test(v) ? 'tbc' : 'proposed', note: '' }); }); };
  ACT.removeActor = a => mut('Role removed', S.ui.flowId, f => { selT(f).actors.splice(+a.getAttribute('data-i'), 1); });
  ACT.actorStatus = el => mut('Role status set', el.value, f => { selT(f).actors[+el.getAttribute('data-i')].status = el.value; });
  ACT.addCondField = el => { if (!el.value) return; mut('Condition field linked', el.value, f => { const t = selT(f); t.conditionFields = t.conditionFields || []; if (t.conditionFields.indexOf(el.value) < 0) t.conditionFields.push(el.value); }); };
  ACT.rmCondField = a => mut('Condition field unlinked', S.ui.flowId, f => { selT(f).conditionFields.splice(+a.getAttribute('data-i'), 1); });
  ACT.addApprover = el => { if (!el.value) return; mut('Approver added', F.actorLabel(el.value), f => { const t = selT(f); t.approval.approvers = t.approval.approvers || []; if (t.approval.approvers.indexOf(el.value) < 0) t.approval.approvers.push(el.value); }); };
  ACT.rmApprover = a => mut('Approver removed', S.ui.flowId, f => { selT(f).approval.approvers.splice(+a.getAttribute('data-i'), 1); });
  ACT.addAfter = () => { const ty = document.getElementById('afterType').value, d = document.getElementById('afterDetail').value.trim(); mut('After action added', ty, f => { const t = selT(f); (t.actions = t.actions || []).push(ty + (d ? ': ' + d : '')); }); };
  ACT.rmAfter = a => mut('After action removed', S.ui.flowId, f => { selT(f).actions.splice(+a.getAttribute('data-i'), 1); });
  ACT.removeT = () => mut('Transition removed', S.ui.flowId, f => { const t = selT(f); if (t.origin === 'proposed') { f.transitions = f.transitions.filter(x => x !== t); S.ui.selected = null; } else t.removed = true; });
  ACT.restoreT = () => mut('Transition restored', S.ui.flowId, f => { selT(f).removed = false; });
  ACT.sf = el => { const p = el.getAttribute('data-prop'); mut('State updated', p, f => { const s = selS(f); if (p === 'label') s.label = el.value; else if (p === 'typeCode') s.typeCode = Number(el.value); else s[p] = el.checked; }); };
  ACT.setInitial = () => mut('Default state set', S.ui.selected, f => { f.initial = S.ui.selected; });
  ACT.removeState = async () => { const f = F.flowModel(S.ui.flowId); const s = selS(f); const used = f.transitions.filter(t => (t.from === s.id || t.to === s.id) && !t.removed);
    if (used.length && !(await confirmDialog('Remove state', `${used.length} transition(s) use "${s.label}". Remove the state and those transitions?`, 'Remove', true))) return;
    mut('State removed', s.label, f2 => { const s2 = selS(f2); f2.transitions = f2.transitions.filter(t => { if (t.from === s2.id || t.to === s2.id) { if (t.origin === 'proposed') return false; t.removed = true; } return true; }); f2.states = f2.states.filter(x => x !== s2); if (f2.initial === s2.id) f2.initial = f2.states[0] && f2.states[0].id; S.ui.selected = null; }); };
  function placeState(f, name, label, x, y, origin) { const id = 's_' + F.slug(name || label) + (f.states.some(s => s.id === 's_' + F.slug(name || label)) ? '_' + Math.random().toString(36).slice(2, 5) : ''); f.states.push({ id, name: name || F.slug(label), label, x: Math.max(0, Math.round(x / 10) * 10), y: Math.max(0, Math.round(y / 10) * 10), origin }); if (!f.initial) f.initial = id; S.ui.selected = id; }
  function freeSpot() { const c = document.getElementById('sfbCanvas'); const z = S.ui.flowZoom || 1; const sv = c && c.querySelector('svg'); const ox = sv ? Number(sv.getAttribute('data-ox') || 0) : 0, oy = sv ? Number(sv.getAttribute('data-oy') || 0) : 0; return { x: ((c ? c.scrollLeft : 0) + 60) / z + ox, y: ((c ? c.scrollTop : 0) + 60) / z + oy }; }
  ACT.addState = () => { const p = freeSpot(); mut('State added', S.ui.flowId, f => placeState(f, '', 'New State ' + (f.states.length + 1), p.x + (f.states.length % 5) * 20, p.y + (f.states.length % 5) * 20, 'proposed')); };
  ACT.chipAdd = a => { const b = statusInfo(F.flowModel(S.ui.flowId).module, a.getAttribute('data-name')); const p = freeSpot(); mut('State added', b.label, f => placeState(f, b.name, b.label, p.x, p.y, 'baseline')); };
  function newTransition(f, from, to) { const t = { id: F.uid('t'), name: 'Move to ' + stLabel(f, to), from, to, type: 'user', buttonType: 0, enabled: true, actors: [{ actor: 'tbc:any', status: 'tbc', note: '' }], condition: '', conditionFields: [], commentRequired: false, approval: { required: false, approvers: [] }, actions: [], notifications: [], portals: [], notes: '', origin: 'proposed', removed: false }; f.transitions.push(t); S.ui.selected = t.id; S.ui.tTab = 'before'; }
  ACT.addTransitionFrom = () => mut('Transition added', S.ui.flowId, f => { const s = selS(f); newTransition(f, s.id, (f.states.find(x => x.id !== s.id) || s).id); });
  ACT.linkReq = () => { const f = F.flowModel(S.ui.flowId); const t = selT(f); V.newReqFor({ modules: [f.module], transitions: [f.id + '|' + t.id], title: 'Transition “' + t.name + '”' }); };

  // ---------- canvas interactions ----------
  function mountCanvas() {
    const host = document.getElementById('canvas'); const cv = document.getElementById('sfbCanvas'); if (!host) return;
    const stq = document.getElementById('stq'); if (stq) stq.addEventListener('input', () => { S.ui.stq = stq.value; const p = document.getElementById('panel'); p.innerHTML = panel(F.flowModel(S.ui.flowId)); const n = document.getElementById('stq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); bindChips(); mountCanvasSearch(); });
    function mountCanvasSearch() { const n = document.getElementById('stq'); if (n && !n._b) { n._b = 1; n.addEventListener('input', () => { S.ui.stq = n.value; const p = document.getElementById('panel'); p.innerHTML = panel(F.flowModel(S.ui.flowId)); const m = document.getElementById('stq'); m.focus(); m.setSelectionRange(m.value.length, m.value.length); bindChips(); mountCanvasSearch(); }); } }
    if (S.readonly) { host.addEventListener('click', e => { const ed = e.target.closest('[data-edge]'), st = e.target.closest('[data-state]'); S.ui.selected = ed ? ed.getAttribute('data-edge') : st ? st.getAttribute('data-state') : null; V.render(); }); return; }
    // Pointer interaction (mouse, pen and touch): a state and a transition button each move on their own; a short press without moving selects it.
    // Moves are drawn on the next animation frame, so dragging stays smooth on large flows.
    const z = () => S.ui.flowZoom || 1; let drag = null, link = null, moved = false, suppress = 0, raf = 0;
    const svg = () => host.querySelector('svg');
    const pt = e => { const sv = svg(); const r = sv.getBoundingClientRect(); return { x: (e.clientX - r.left) / z() + Number(sv.getAttribute('data-ox') || 0), y: (e.clientY - r.top) / z() + Number(sv.getAttribute('data-oy') || 0) }; };
    const cur = () => F.flowModel(S.ui.flowId);
    const paint = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const keep = host.parentElement; const sl = keep ? keep.scrollLeft : 0, stp = keep ? keep.scrollTop : 0; host.innerHTML = svgFor(ef()); if (drag && drag.kind === 'pill') { const g = host.querySelector(`[data-edge="${CSS.escape(drag.id)}"]`); if (g) g.classList.add('dragging'); } if (keep) { keep.scrollLeft = sl; keep.scrollTop = stp; } }); };
    const snapshot = () => { const f = ef(); const h = hist[f.id] = hist[f.id] || { u: [], r: [] }; h.u.push(JSON.stringify(f)); if (h.u.length > 60) h.u.shift(); h.r = []; };
    host.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; const h = e.target.closest('[data-handle]'); const st = e.target.closest('[data-state]'); const pill = e.target.closest('.pill'); const edge = pill && pill.closest('[data-edge]');
      if (h || (st && S.ui.connect)) { e.preventDefault(); const sid = (h || st).getAttribute(h ? 'data-handle' : 'data-state'); const s = cur().states.find(x => x.id === sid); const g = D.boxSize(s.label); const p = pt(e);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('x1', h ? p.x : s.x + g.w / 2); line.setAttribute('y1', h ? p.y : s.y + g.h / 2); line.setAttribute('x2', p.x); line.setAttribute('y2', p.y); line.setAttribute('stroke', '#FF6660'); line.setAttribute('stroke-width', '1.6'); line.setAttribute('stroke-dasharray', '5 3'); line.setAttribute('pointer-events', 'none'); svg().appendChild(line);
        svg().classList.add('connect'); link = { from: sid, line }; listen(e); return; }
      if (edge) { e.preventDefault(); const id = edge.getAttribute('data-edge'); const G = D.flowGeometry(cur(), { showRemoved: !!S.ui.flowRemoved }); const ge = G.edges.find(x => x.t.id === id); if (!ge || ge.pts.length > 3 && !ge.t.lp) { S.ui.selected = id; V.render(); return; } const p = pt(e); drag = { kind: 'pill', id, dx: p.x - ge.lx, dy: p.y - ge.ly, sx: ge.lx, sy: ge.ly }; moved = false; listen(e); return; }
      if (st) { e.preventDefault(); const id = st.getAttribute('data-state'); const s = cur().states.find(x => x.id === id); const p = pt(e); drag = { kind: 'state', id, dx: p.x - s.x, dy: p.y - s.y, sx: s.x, sy: s.y }; moved = false; listen(e); }
    });
    function listen(e) { try { host.setPointerCapture(e.pointerId); } catch (er) { } document.addEventListener('pointermove', mm); document.addEventListener('pointerup', mu); document.addEventListener('pointercancel', mu); }
    function cleanup() { document.removeEventListener('pointermove', mm); document.removeEventListener('pointerup', mu); document.removeEventListener('pointercancel', mu); host.classList.remove('dragging-st'); }
    function mm(e) {
      if (link) { const p = pt(e); link.line.setAttribute('x2', p.x); link.line.setAttribute('y2', p.y); return; }
      if (!drag) return; const p = pt(e); const nx = Math.max(0, Math.round(p.x - drag.dx)), ny = Math.max(0, Math.round(p.y - drag.dy));
      if (!moved && Math.abs(nx - drag.sx) + Math.abs(ny - drag.sy) < 5) return;
      if (!moved) { snapshot(); if (drag.kind === 'state') host.classList.add('dragging-st'); } moved = true; const f = ef();
      if (drag.kind === 'state') { const s = f.states.find(x => x.id === drag.id); s.x = nx; s.y = ny; } else { const t = f.transitions.find(x => x.id === drag.id); if (t) t.lp = { x: nx, y: ny }; }
      paint();
    }
    function mu(e) {
      cleanup(); suppress = Date.now();
      if (link) { const tgt = document.elementFromPoint(e.clientX, e.clientY); const st = tgt && tgt.closest && tgt.closest('[data-state]'); const from = link.from; link.line.remove(); link = null; const sv = svg(); if (sv) sv.classList.remove('connect');
        if (st) { S.ui.connect = false; mut('Transition added', S.ui.flowId, f => newTransition(f, from, st.getAttribute('data-state'))); } return; }
      if (drag) { const d = drag; drag = null; if (raf) { cancelAnimationFrame(raf); raf = 0; } if (moved) { F.changed(d.kind === 'state' ? 'State moved' : 'Transition button moved', null); } else { S.ui.selected = d.id; if (d.kind === 'pill') S.ui.tTab = S.ui.tTab || 'before'; V.render(); const pn = document.getElementById('panel'); if (pn) pn.scrollTop = 0; } }
    }
    host.addEventListener('click', e => { if (Date.now() - suppress < 300) return; if (e.target.closest('[data-state]')) return; const ed = e.target.closest('[data-edge]'); if (ed) { S.ui.selected = ed.getAttribute('data-edge'); S.ui.tTab = S.ui.tTab || 'before'; V.render(); return; } if (S.ui.selected) { S.ui.selected = null; V.render(); } });
    host.addEventListener('dblclick', e => { const pill = e.target.closest('.pill'); const ed = pill && pill.closest('[data-edge]'); if (!ed) return; const id = ed.getAttribute('data-edge'); if ((cur().transitions.find(x => x.id === id) || {}).lp) mut('Transition button re-centred', id, f => { delete f.transitions.find(x => x.id === id).lp; }); });
    // drag a state chip from the sidebar onto the canvas
    cv.addEventListener('dragover', e => { if (V._chip) { e.preventDefault(); cv.classList.add('dragover'); } });
    cv.addEventListener('dragleave', () => cv.classList.remove('dragover'));
    cv.addEventListener('drop', e => { cv.classList.remove('dragover'); const name = V._chip; V._chip = null; if (!name) return; e.preventDefault(); const p = pt(e); const b = statusInfo(cur().module, name); if (b) mut('State added', b.label, f => placeState(f, b.name, b.label, p.x - 67, p.y - 15, 'baseline')); });
    bindChips();
  }
  function bindChips() { document.querySelectorAll('[data-chip]').forEach(c => c.addEventListener('dragstart', e => { V._chip = c.getAttribute('data-chip'); e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', V._chip); } catch (er) { } })); }

  // ---------- lower panels ----------
  function table(f) {
    const rows = f.transitions.slice().sort((a, b) => stLabel(f, a.from).localeCompare(stLabel(f, b.from)));
    const tl = t => t.type === 'automatic' ? 'Automated by condition' : t.type === 'scheduled' ? 'Automated by time' : t.type === 'scheduled-date' ? 'Automated by date field' : 'User';
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Transition</th><th>From</th><th>To</th><th>Performed by</th><th>Conditions / inputs</th><th>Approval</th><th>Actions &amp; notifications</th><th>Portals</th><th>Status</th></tr></thead><tbody>
      ${rows.map(t => `<tr class="click ${t.removed ? 'removed' : ''} ${S.ui.selected === t.id ? 'sel' : ''}" data-act="selectEl" data-id="${esc(t.id)}"><td><b>${esc(t.name)}</b><div class="xs muted">${tl(t)}</div></td><td>${esc(stLabel(f, t.from))}</td><td>${esc(stLabel(f, t.to))}</td>
        <td class="small">${(t.actors || []).map(a => `<div>${esc(F.actorLabel(a.actor))} ${tag(a.status === 'tbc' ? 'tbc' : a.status, F.ACTOR_STATUS[a.status] || a.status)}</div>`).join('') || tag('tbc', 'User / Role to Be Confirmed')}</td>
        <td class="small">${esc(T.transitionConditions(t).join('; '))}</td><td class="small">${t.approval && t.approval.required ? esc((t.approval.approvers || []).map(F.actorLabel).join(', ') || 'Approver to be confirmed') + (t.approval.rejectTo ? '; rejected → ' + esc(stLabel(f, t.approval.rejectTo)) : '') : '<span class="dash">---</span>'}</td>
        <td class="small">${esc((t.actions || []).concat(t.createRecord ? ['Creates ' + modLabel(t.createRecord.module)] : []).concat((t.notifications || []).length ? ['Notifies: ' + t.notifications.join(', ')] : []).join('; ')) || '<span class="dash">---</span>'}</td>
        <td class="small">${esc((t.portals || []).map(humanize).join(', ')) || '<span class="dash">---</span>'}</td>
        <td>${t.removed ? tag('removed', 'Removal proposed') : t.origin === 'proposed' ? tag('proposed', 'Proposed') : t.enabled === false ? tag('low', 'Disabled') : tag('verified', 'Configured')}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No transitions yet.</td></tr>'}</tbody></table></div>`;
  }
  function changes(f) {
    const d = F.flowDiff(f.id);
    if (!d) return '<div class="empty">No workshop changes — the stateflow is shown as configured.</div>';
    const base = d.proposedFlow ? null : F.baselineFlowModel(S.baseline.flows.find(x => x.id === f.id));
    return `${d.proposedFlow ? '<div class="notice">This is a proposed stateflow; everything in it is new.</div>' : `<div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl"><thead><tr><th>Change</th><th>Item</th><th>Name</th><th>Detail</th></tr></thead><tbody>${d.changes.map(c => `<tr><td>${tag(c.kind === 'added' ? 'proposed' : c.kind === 'removed' ? 'removed' : 'modified', humanize(c.kind))}</td><td>${esc(c.what)}</td><td>${esc(c.name)}</td><td class="small">${esc(c.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No differences.</td></tr>'}</tbody></table></div>`}
      ${base ? `<div class="grid g2"><div class="card"><div class="card-h"><h3>Existing (configured)</h3></div><div class="card-b" style="overflow:auto;max-height:420px">${D.flowSvg(base, { idSuffix: 'b', zoom: .8 })}</div></div><div class="card"><div class="card-h"><h3>Proposed</h3></div><div class="card-b" style="overflow:auto;max-height:420px">${D.flowSvg(f, { idSuffix: 'p', zoom: .8, showRemoved: true })}</div></div></div>` : ''}`;
  }
  function processGuide(f) {
    const order = []; const seen = new Set(); const q = [f.initial]; while (q.length) { const c = q.shift(); if (!c || seen.has(c)) continue; seen.add(c); order.push(c); f.transitions.filter(t => t.from === c && !t.removed).forEach(t => q.push(t.to)); }
    f.states.forEach(s => { if (!seen.has(s.id)) order.push(s.id); });
    return `<div class="card"><div class="card-h"><h3>Process guide</h3><span class="muted small">What happens at each state — generated from the stateflow; used in the user guide and BRD</span></div><div class="card-b prose small">${T.flowNarrative(f).map(p => `<p>${esc(p)}</p>`).join('')}
      <ol>${order.map(sid => { const s = f.states.find(x => x.id === sid); const outs = f.transitions.filter(t => t.from === sid && !t.removed && t.enabled !== false); const ex = externalsFor(f).filter(x => x.state === sid);
        return `<li style="margin-bottom:10px"><b>${esc(s.label)}</b>${f.initial === sid ? ' (default state — every new record starts here)' : ''}${outs.length ? `<ul>${outs.map(t => `<li>${t.type === 'user' ? `<b>${esc(t.name)}</b> button — ${esc(T.actorsText(t))}` : `Automatically (${esc(t.type === 'automatic' ? 'when ' + (t.condition || 'the condition is met') : 'after ' + (F.secs((t.schedule || {}).intervalSeconds) || 'the configured time'))})`} moves the record to <b>${esc(stLabel(f, t.to))}</b>${t.condition && t.type === 'user' ? '; only when ' + esc(t.condition) : ''}${t.commentRequired ? '; a comment is required' : ''}${t.approval && t.approval.required ? '; requires approval' : ''}${(t.actions || []).length ? '. Then: ' + esc(t.actions.join('; ')) : ''}${(t.portals || []).length ? ' (also in ' + esc(t.portals.map(humanize).join(', ')) + ' portal)' : ''}.</li>`).join('')}${ex.map(x => `<li>Linked action <b>${esc(x.label)}</b> → ${esc(x.target)}${x.verified ? '' : ' (to be confirmed)'}${x.disabled ? ' — disabled' : ''}.</li>`).join('')}</ul>` : '<div class="muted">No further actions — the record stays in this state.</div>'}</li>`; }).join('')}</ol></div></div>`;
  }
})(typeof window !== 'undefined' ? window : globalThis);
