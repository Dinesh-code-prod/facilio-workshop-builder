/* Views (module tab, team only; Solution Design & Configuration › System Modules & Form Builder › a module › Views): the list views the customer will see for a module:
   which app shows them, which group they sit in, which columns in which order, how they are sorted, a filter, who may use them. Kept in the project's workshop data
   (S.ws.views) and exported by the Org Package Export as VIEW (+ VIEW_GROUP) records. A state filter ("state is / is not") is exported for custom modules; any other filter
   is recorded here and handed to the Org Builder agent in the agent brief and the report. Nothing is changed in a live organisation. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { drawer, closeDrawer, toast, tag, confirmDialog } = V;
  const can = () => !V.isCustomer() && !S.readonly;
  const list = () => (S.ws.views = S.ws.views || []);
  const OPS = ['is', 'is not', 'contains', 'is empty', 'is not empty', 'greater than', 'less than'];
  const SYS = [['name', 'Name'], ['siteId', 'Site'], ['sysCreatedTime', 'Created Time'], ['sysModifiedTime', 'Modified Time']];
  const isCustom = mod => { try { const m = F.moduleView(mod) || {}; return !!(m.custom || m.origin === 'proposed'); } catch (e) { return false; } };
  const apps = () => { const a = (S.baseline && S.baseline.apps) || []; const out = a.filter(x => x.link).map(x => ({ link: x.link, name: x.name || x.link })).sort((p, q) => (q.link === 'maintenance') - (p.link === 'maintenance')); return out.length ? out : [{ link: 'maintenance', name: 'Maintenance' }]; };   // the main app first
  const appLabel = l => (apps().find(a => a.link === l) || {}).name || l;
  function columnsOf(mod) {
    const out = []; const seen = new Set(); const push = (name, label) => { if (name && !seen.has(name)) { seen.add(name); out.push({ name, label: label || name }); } };
    try { (F.effFields(mod) || []).forEach(f => push(f.name, f.label || f.name)); } catch (e) { }
    if (isCustom(mod)) SYS.forEach(([n, l]) => push(n, l));
    return out;
  }
  function statesOf(mod) {
    const out = []; const add = l => { if (l && !out.includes(l)) out.push(l); };
    try { Object.values(S.ws.flows || {}).filter(f => f.module === mod).forEach(f => (f.states || []).forEach(s => add(s.label || s.name))); } catch (e) { }
    try { (S.baseline.flows || []).filter(f => f.module === mod).forEach(f => { const m = F.baselineFlowModel(f); (m && m.states || []).forEach(s => add(s.label || s.name)); }); } catch (e) { }
    return out;
  }
  const groupsOf = (mod, app) => (((S.baseline && S.baseline.viewGroups) || {})[mod] || []).filter(g => !g[2] || g[2] === app).map(g => ({ name: g[0], label: g[1] || g[0] }));
  const roleNames = () => { const out = []; ((S.baseline && S.baseline.roles) || []).forEach(r => { const n = r.name || r.label; if (n && !out.includes(n)) out.push(n); }); return out; };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  V.viewsCount = mod => list().filter(v => v.module === mod).length;
  const filterText = v => [].concat(v.stateFilter && v.stateFilter.state ? ['State ' + (v.stateFilter.op === 'isnot' ? 'is not' : 'is') + ' ' + v.stateFilter.state] : [], (v.otherFilters || []).filter(f => f.field).map(f => f.field + ' ' + f.op + (f.value ? ' ' + f.value : ''))).join('; ') || 'None';

  V.modTabBody = V.modTabBody || {};
  V.modTabBody.views = m => {
    const mine = list().filter(v => v.module === m.name); const B = S.baseline || {}; const base = (B.views || {})[m.name] || []; const nBase = base.length || ((B.viewCounts || {}).VIEW || {})[m.name] || 0;
    const note = `<div class="notice" style="margin-bottom:12px"><span>Views decide what a list shows for this module: the columns, the order and which records. ${(V.featureHidden && V.featureHidden('orgpkg')) ? 'They are saved with the project.' : 'They go into the Org Package Export (a state filter is packaged for custom modules; any other filter is passed to the Org Builder agent in the agent brief). Nothing is changed in a live organisation.'}</span></div>`;
    const rows = mine.map(v => `<tr><td><b>${esc(v.label)}</b>${v.isDefault ? ' ' + tag('green', 'Default') : ''}<div class="mono xs muted">${esc(slug(v.label))}</div></td><td>${esc(appLabel(v.app))}</td><td class="small">${esc((v.columns || []).map(c => c.label || c.name).join(', '))}</td><td class="small">${esc(v.sort && v.sort.field ? v.sort.field + (v.sort.dir === 'asc' ? ' (A to Z)' : ' (newest first)') : 'Default order')}</td><td class="small">${esc(filterText(v))}</td>
      <td>${can() ? `<button class="btn sm" data-act="vwEdit" data-id="${esc(v.id)}">Edit</button> <button class="btn sm danger" data-act="vwDel" data-id="${esc(v.id)}">Delete</button>` : ''}</td></tr>`).join('');
    const proposed = mine.length ? `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Views for this project (${mine.length})</h3>${can() ? '<button class="btn sm primary" data-act="vwEdit" data-m="' + esc(m.name) + '">New view</button>' : ''}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>View</th><th>App</th><th>Columns</th><th>Sort</th><th>Filter</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`
      : `<div class="card empty" style="margin-bottom:14px"><h3>No new views for ${esc(m.label)} yet</h3><p>Add the views agreed in the workshops, for example "Open permits, newest first".</p>${can() ? '<button class="btn primary" data-act="vwEdit" data-m="' + esc(m.name) + '">New view</button>' : ''}</div>`;
    const existing = base.length ? `<div class="card"><div class="card-h"><h3>Views the organisation already has (${nBase}${nBase > base.length ? ', first ' + base.length + ' shown' : ''})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>View</th><th>App</th><th>Group</th></tr></thead><tbody>${base.map(b => `<tr><td><b>${esc(b[1] || b[0])}</b>${b[4] ? ' ' + tag('green', 'Default') : ''}<div class="mono xs muted">${esc(b[0])}</div></td><td>${esc(appLabel(b[2]))}</td><td class="small mono">${esc(b[3])}</td></tr>`).join('')}</tbody></table></div></div>`
      : (nBase && !(V.featureHidden && V.featureHidden('orgpkg')) ? `<div class="notice"><span>The organisation already has ${nBase} view(s) for this module. Their names are listed when the customer's own organisation package is loaded.</span></div>` : '');
    return note + proposed + existing;
  };

  // ---------- the editor ----------
  const opt = (v, cur, l) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
  function formHtml(d) {
    const mod = d.module; const cols = columnsOf(mod); const chosen = d.columns || []; const free = cols.filter(c => !chosen.some(x => x.name === c.name)); const st = statesOf(mod); const gs = groupsOf(mod, d.app); const roles = roleNames(); const reqs = S.ws.requirements || [];
    const colRows = chosen.map((c, i) => `<div class="row" style="gap:6px;margin-bottom:4px"><span class="mono xs muted" style="width:22px">${i + 1}</span><span style="flex:1">${esc(c.label || c.name)} <span class="mono xs muted">${esc(c.name)}</span></span><button type="button" class="btn sm" data-act="vwColMove" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Move up">&uarr;</button><button type="button" class="btn sm" data-act="vwColMove" data-i="${i}" data-d="1" ${i < chosen.length - 1 ? '' : 'disabled'} aria-label="Move down">&darr;</button><button type="button" class="btn sm danger" data-act="vwColDel" data-i="${i}" aria-label="Remove column">&times;</button></div>`).join('') || '<div class="small muted">No columns yet. Add at least one.</div>';
    const flt = (d.otherFilters || []).map((f, i) => `<div class="row" style="gap:6px;margin-bottom:4px"><select id="vw_ff${i}" aria-label="Field"><option value="">Field…</option>${cols.map(c => opt(c.name, f.field, c.label)).join('')}</select><select id="vw_fo${i}" aria-label="Condition">${OPS.map(o => opt(o, f.op, o)).join('')}</select><input id="vw_fv${i}" type="text" value="${esc(f.value || '')}" placeholder="Value" aria-label="Value"><button type="button" class="btn sm danger" data-act="vwFilterDel" data-i="${i}" aria-label="Remove filter">&times;</button></div>`).join('');
    return `<label class="f" for="vw_name">View name *</label><input id="vw_name" type="text" maxlength="100" value="${esc(d.label || '')}" placeholder="e.g. Open permits">
      <label class="f" for="vw_app">Shown in app</label><select id="vw_app" data-change="vwRedraw">${apps().map(a => opt(a.link, d.app, a.name)).join('')}</select>
      <label class="f" for="vw_group">View group</label><select id="vw_group" data-change="vwRedraw">${opt('', d.group || '', gs.length ? 'New group (below)' : 'All Views (new group)')}${gs.map(g => opt(g.name, d.group, g.label)).join('')}</select>
      ${d.group ? '' : `<input id="vw_gname" type="text" maxlength="60" value="${esc(d.groupLabel || '')}" placeholder="Group name (default: All Views)" aria-label="New group name">`}
      <label class="row" style="gap:6px;margin-top:8px"><input type="checkbox" id="vw_def"${d.isDefault ? ' checked' : ''}> Make this the default view of the module</label>
      <label class="f">Columns, in order *</label>${colRows}<select id="vw_addcol" data-change="vwColAdd" aria-label="Add a column"><option value="">Add a column…</option>${free.map(c => opt(c.name, '', c.label)).join('')}</select>
      <label class="f" for="vw_sort">Sort by</label><div class="row" style="gap:6px"><select id="vw_sort"><option value="">Default order</option>${cols.map(c => opt(c.name, d.sort && d.sort.field, c.label)).join('')}</select><select id="vw_dir" aria-label="Direction">${opt('desc', d.sort && d.sort.dir || 'desc', 'Newest / highest first')}${opt('asc', d.sort && d.sort.dir, 'Oldest / lowest first')}</select></div>
      <label class="f">Show only records…</label>
      ${st.length ? `<div class="row" style="gap:6px"><select id="vw_sop" aria-label="State condition">${opt('is', d.stateFilter && d.stateFilter.op, 'whose state is')}${opt('isnot', d.stateFilter && d.stateFilter.op, 'whose state is not')}</select><select id="vw_sst"><option value="">Any state</option>${st.map(x => opt(x, d.stateFilter && d.stateFilter.state, x)).join('')}</select></div>` : '<div class="small muted">This module has no state flow, so there is no state filter.</div>'}
      ${flt}<button type="button" class="btn sm" data-act="vwFilterAdd" style="margin-top:6px">Add another filter</button><div class="xs muted">A state filter is packaged for custom modules. Other filters go to the Org Builder agent in the agent brief, because the package needs their database columns.</div>
      <details class="adv"${(d.sharedRoles || []).length || (d.reqs || []).length || d.note ? ' open' : ''} style="margin:10px 0"><summary>More options: sharing, requirements, note</summary>
      ${roles.length ? `<label class="f">Share with roles (leave empty for the default)</label><div class="row" style="gap:12px;flex-wrap:wrap;max-height:120px;overflow:auto">${roles.slice(0, 60).map((r, i) => `<label class="row" style="gap:5px"><input type="checkbox" class="vw_role" value="${esc(r)}"${(d.sharedRoles || []).includes(r) ? ' checked' : ''}> ${esc(r)}</label>`).join('')}</div>` : ''}
      <label class="f" for="vw_reqs">Comes from requirement(s)</label><select id="vw_reqs" multiple size="4">${reqs.map(r => `<option value="${esc(r.id)}"${(d.reqs || []).includes(r.id) ? ' selected' : ''}>${esc(r.id)} ${esc(String(r.title || '').slice(0, 70))}</option>`).join('')}</select>
      <label class="f" for="vw_note">Note (optional)</label><input id="vw_note" type="text" maxlength="300" value="${esc(d.note || '')}"></details>`;
  }
  const footer = `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="vwSave">Save view</button>`;
  const $ = id => document.getElementById(id);
  function read() {
    const d = Object.assign({}, S.ui.vwDraft || {}); const v = id => ($(id) || {}).value;
    if (!$('vw_name')) return d;
    d.label = String(v('vw_name') || '').trim(); d.app = v('vw_app') || d.app; d.group = v('vw_group') || ''; d.groupLabel = $('vw_gname') ? String(v('vw_gname') || '').trim() : ''; d.isDefault = !!($('vw_def') || {}).checked;
    d.sort = v('vw_sort') ? { field: v('vw_sort'), dir: v('vw_dir') || 'desc' } : null; d.stateFilter = v('vw_sst') ? { op: v('vw_sop') || 'is', state: v('vw_sst') } : null;
    d.otherFilters = (d.otherFilters || []).map((f, i) => $('vw_ff' + i) ? { field: v('vw_ff' + i), op: v('vw_fo' + i) || 'is', value: String(v('vw_fv' + i) || '').trim() } : f);
    d.sharedRoles = [...document.querySelectorAll('.vw_role')].filter(x => x.checked).map(x => x.value); d.reqs = [...(($('vw_reqs') || { selectedOptions: [] }).selectedOptions)].map(o => o.value); d.note = String(v('vw_note') || '').trim();
    return d;
  }
  const redraw = d => { S.ui.vwDraft = d; drawer(d.id ? 'Edit view' : 'New view', formHtml(d), footer, { wide: true }); };
  ACT.vwEdit = a => { if (!can()) return; const id = a && a.getAttribute && a.getAttribute('data-id'); const mod = (a && a.getAttribute && a.getAttribute('data-m')) || S.ui.module;
    const d = id ? JSON.parse(JSON.stringify(list().find(x => x.id === id) || {})) : { module: mod, app: apps()[0].link, group: '', columns: [], otherFilters: [], sharedRoles: [], reqs: [] }; if (!d.module) d.module = mod;
    if (!id) { const cs = columnsOf(d.module); d.columns = cs.filter(c => /^(name|subject|title)$/i.test(c.name)).slice(0, 1).concat(cs.filter(c => /^(sysCreatedTime|createdTime)$/.test(c.name)).slice(0, 1)); if (!d.columns.length) d.columns = cs.slice(0, 3); }
    redraw(d); };
  ACT.vwRedraw = () => redraw(read());
  ACT.vwColAdd = el => { const d = read(); const n = el && el.value; const c = columnsOf(d.module).find(x => x.name === n); if (c) d.columns = (d.columns || []).concat([c]); redraw(d); };
  ACT.vwColDel = a => { const d = read(); d.columns.splice(Number(a.getAttribute('data-i')), 1); redraw(d); };
  ACT.vwColMove = a => { const d = read(); const i = Number(a.getAttribute('data-i')), j = i + Number(a.getAttribute('data-d')); if (j >= 0 && j < d.columns.length) { const t = d.columns[i]; d.columns[i] = d.columns[j]; d.columns[j] = t; } redraw(d); };
  ACT.vwFilterAdd = () => { const d = read(); d.otherFilters = (d.otherFilters || []).concat([{ field: '', op: 'is', value: '' }]); redraw(d); };
  ACT.vwFilterDel = a => { const d = read(); d.otherFilters.splice(Number(a.getAttribute('data-i')), 1); redraw(d); };
  ACT.vwSave = () => { if (!can()) return; const d = read(); const bad = m => { toast(m, 5000, true); return true; };
    if (!d.label) { bad('Please give the view a name'); return; } if (!(d.columns || []).length) { bad('Add at least one column'); return; }
    d.otherFilters = (d.otherFilters || []).filter(f => f.field); if (!d.group && !d.groupLabel) d.groupLabel = 'All Views'; if (!d.group) d.group = 'allViews';
    const L = list(); if (L.some(x => x.module === d.module && x.id !== d.id && slug(x.label) === slug(d.label) && x.app === d.app)) { bad('This module already has a view with that name in this app'); return; }
    if (d.isDefault) L.forEach(x => { if (x.module === d.module && x.app === d.app && x.id !== d.id) x.isDefault = false; });
    const i = d.id ? L.findIndex(x => x.id === d.id) : -1; if (i >= 0) L[i] = d; else L.push(Object.assign({}, d, { id: 'vw_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }));
    S.ui.vwDraft = null; F.changed(i >= 0 ? 'View updated' : 'View added', d.label); closeDrawer(); toast('View saved'); };
  ACT.vwDel = a => { if (!can()) return; const id = a.getAttribute('data-id'); const v = list().find(x => x.id === id); if (!v) return; confirmDialog('Delete view', 'Delete "' + v.label + '"? It will no longer be in the package.', 'Delete', true).then(ok => { if (!ok) return; S.ws.views = list().filter(x => x.id !== id); F.changed('View deleted', v.label); }); };
})(typeof window !== 'undefined' ? window : globalThis);
