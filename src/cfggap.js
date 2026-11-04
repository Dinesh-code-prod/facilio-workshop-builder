/* Configuration gap table (roadmap E2 item 5, "Implementation and Organisation Export").
   Pure code: no DOM, no network; runs in the browser (window.FWBCfgGap) and in Node tests. One row per configuration component of the project,
   saying what is still needed before Delivery Studio may generate it into an organisation package. Nothing is invented: an input nobody has
   given is "missing", an unknown value stays "unknown", and nothing here calls a package deployable. Generated, imported, manually configured,
   validated and deployment-ready are separate flags (row.state), never one status.

   input = { modules: [{ name, label?, origin: 'new' | 'baseline',            // only origin 'new' modules get a MODULE row
              fields:        [{ name, label, type, required, options, lookup, requirementIds|reqs, source? }],
              views:         [{ id, label, columns:[{name}], otherFilters, sharedRoles, requirementIds|reqs }],
              statuses:      [{ id?, name?, label, closed?, new? }],            // states the project adds (closed is true / false / undefined = not chosen)
              workflows:     [{ id, name, isNew, initial, criteria, states:[{id,label,origin}], transitions:[{ id, name, condition, actors:[{actor,status}] }] }],
              notifications: [{ id, name, trigger, state, channels:{email,..}, recipients:[], toField, subject, message, requirementIds|reqs }],
              relationships, roles, scripts, connectedApps }],                  // these five may also be given at the top level (module '' = organisation level)
            requirements: [{ id, status, modules?, fields?, transitions? }], packageBaseline?: { modules: { name: { fields: [names] } } } }
   Where the shapes come from: Delivery Studio's own stores (S.ws.fieldOps / views / notifications / flows / roles, and the cmodx, cfgrel, capp records of the
   Configuration Hub); the page src/orgpkgview.js maps them. Which components Studio can generate comes from src/orgpkg.js (FIELD_T, and the types its build() writes);
   everything else is "not supported" and becomes a manual step. */
(function (root) {
  'use strict';
  const VERSION = 'cfggap/1';
  const STATUSES = ['missing input', 'ready to generate', 'generated', 'manually configured', 'validated', 'deployment-ready'];
  const STATE_FLAGS = ['generated', 'manual', 'validated', 'deploymentReady'];
  const VALIDATION = ['not validated', 'valid', 'invalid'];   // 'blocked' is derived, never typed in
  const SOURCES = ['brd', 'mockup', 'hub', 'package'];
  const orgpkg = () => root.FWBOrgPkg || (typeof module !== 'undefined' && module.require ? module.require('./orgpkg.js') : null);
  const filled = v => v === true || typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && v.trim().toLowerCase() !== 'unknown') || (Array.isArray(v) && v.length > 0);
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const slug = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unnamed';
  const list = a => (Array.isArray(a) ? a : []);
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- rules: what each kind needs, and whether Studio can generate it ----------
  // A need is { key, label, ok, manual? }: ok = the project data already answers it; a team input under the same key also answers it.
  const need = (key, label, ok, manual) => ({ key, label, ok: !!ok, manual: !!manual });
  function rules(kind, e, ctx) {
    const O = orgpkg(); const T = (O && O.FIELD_T) || {}; const out = { needs: [], supported: 'not supported', config: '', deps: [] };
    const modKnown = n => !!n && (ctx.modNames.has(norm(n)));
    if (kind === 'module') {
      out.supported = 'supported'; out.config = 'Custom module "' + e.label + '" (' + e.name + ')';
      out.needs.push(need('moduleName', 'module link name (custom_ + letters and digits) not confirmed', /^custom_[a-z0-9]+$/.test(e.name || '')));
    } else if (kind === 'field') {
      const t = String(e.type || '').trim(); out.supported = t && !T[t] ? 'not supported' : 'supported';   // no type yet: nothing to say against it (the missing type blocks anyway)
      out.config = (t || 'type unknown') + ' field "' + (e.label || e.name) + '"' + (e.required ? ', required' : '');
      out.needs.push(need('label', 'field display name missing', String(e.label || '').trim()));
      out.needs.push(need('type', 'field type not confirmed', t));
      if (T[t] && T[t].options) out.needs.push(need('options', 'picklist options not given', list(e.options).filter(Boolean).length));
      if (T[t] && T[t].lookup) out.needs.push(need('lookupModule', 'lookup target module not verified', e.lookup && modKnown(e.lookup)));
      if (!(T[t]) && t) out.config += ' (Studio has no format for this type yet)';
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
    } else if (kind === 'view') {
      out.supported = list(e.otherFilters).filter(f => f && f.field).length ? 'not supported' : 'supported';
      out.config = 'View "' + e.label + '" with ' + list(e.columns).length + ' column(s)' + (e.sort && e.sort.field ? ', sorted by ' + e.sort.field : '');
      const known = ctx.fieldsOf[e.module]; const sys = ['name', 'siteid', 'syscreatedtime', 'sysmodifiedtime'];
      out.needs.push(need('columns', 'view columns not chosen or not verified as fields of the module', list(e.columns).length && (!known || list(e.columns).every(c => sys.includes(String(c.name).toLowerCase()) || known.has(norm(c.name))))));
      if (ctx.roleLabels.size && list(e.sharedRoles).some(r => !ctx.roleLabels.has(norm(r)))) out.needs.push(need('sharedRoles', 'role sharing names a role that is not in the roles list', false, true));
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
      list(e.columns).forEach(c => { const id = 'field:' + e.module + '.' + slug(c.name); if (ctx.rowIds.has(id)) out.deps.push(id); });
    } else if (kind === 'relationship') {
      out.config = (e.from || '?') + ' to ' + (e.to || '?') + ' (' + (e.type || 'type not set') + ')';
      out.needs.push(need('modules', 'relationship has no from or to module', e.from && e.to));
      out.needs.push(need('verified', 'relationship unverified', e.status === 'Confirmed'));
      [e.from, e.to].forEach(n => { if (n && ctx.newMods.has(String(n))) out.deps.push('module:' + n); });
    } else if (kind === 'status') {
      out.supported = 'supported'; out.config = 'State "' + (e.label || e.name) + '"' + (e.closed === true ? ', closed' : e.closed === false ? ', open' : '');
      out.needs.push(need('closed', 'state not marked open or closed', e.closed === true || e.closed === false));
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
    } else if (kind === 'workflow') {
      const trs = list(e.transitions); out.supported = 'supported';
      out.config = 'State flow "' + e.name + '": ' + list(e.states).length + ' state(s), ' + trs.length + ' transition(s)';
      out.needs.push(need('initialState', 'default (first) state not chosen', e.initial && list(e.states).some(s => s.id === e.initial)));
      out.needs.push(need('conditions', 'workflow conditions incomplete: a transition has a text-only condition', !trs.some(t => String(t.condition || '').trim())));
      out.needs.push(need('transitionRoles', 'role for a transition not confirmed', !trs.some(t => list(t.actors).some(a => a.status === 'tbc' || /^tbc:/.test(String(a.actor || ''))))));
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
      list(e.states).forEach(s => { const id = 'status:' + e.module + '.' + slug(s.label || s.name); if (ctx.rowIds.has(id)) out.deps.push(id); });
    } else if (kind === 'notification') {
      const email = !!(e.channels && e.channels.email);
      out.supported = email ? 'supported' : 'not supported'; out.config = 'Notification "' + e.name + '" on ' + (e.trigger === 'state' ? 'state "' + (e.state || '?') + '"' : 'create') + (email ? ' by e-mail' : ' (no e-mail channel)');
      out.needs.push(need('recipients', 'notification recipient unknown', list(e.recipients).length || e.toField));
      if (email) out.needs.push(need('content', 'e-mail subject or message missing', String(e.subject || '').trim() && String(e.message || '').trim()));
      if (e.trigger === 'state') out.needs.push(need('state', 'trigger state not chosen', String(e.state || '').trim()));
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
      if (e.trigger === 'state') { const id = 'status:' + e.module + '.' + slug(e.state); if (ctx.rowIds.has(id)) out.deps.push(id); }
    } else if (kind === 'role') {
      out.config = 'Role "' + (e.label || e.name) + '"';
      out.needs.push(need('permissions', 'role permissions not final', e.permissionsFinal === true));
    } else if (kind === 'script') {
      out.config = (e.type === 'scheduler' ? 'Scheduler script "' : 'Script "') + (e.name || e.label) + '"';
      out.needs.push(need('logic', 'script logic needs confirmation', e.confirmed === true && String(e.logic || '').trim()));
      if (ctx.newMods.has(e.module)) out.deps.push('module:' + e.module);
    } else if (kind === 'connectedApp') {
      out.config = 'Connected app "' + e.name + '" with ' + list(e.tabs).length + ' tab(s)';
      if (String(e.integration || '').trim() || e.endpointRequired) out.needs.push(need('endpoint', 'integration endpoint missing', String(e.endpoint || '').trim()));
      out.needs.push(need('tabRoles', 'who can see each tab (roles) not listed', list(e.tabs).every(t => String(t.roles || '').trim())));
    }
    return out;
  }

  // ---------- building the table ----------
  function reqsFor(ent, kind, mod, id, requirements) {
    const ids = new Set([].concat(list(ent.requirementIds), list(ent.reqs).map(r => (r && r.id) || r)).filter(Boolean));
    requirements.forEach(r => {
      if (kind === 'module' && list(r.modules).includes(ent.name)) ids.add(r.id);
      if (kind === 'field' && list(r.fields).includes(mod + '.' + ent.name)) ids.add(r.id);
      if (kind === 'workflow' && list(ent.transitions).some(t => list(r.transitions).includes(t.id))) ids.add(r.id);
    });
    return [...ids];
  }
  function derive(rows) {
    let out = rows.map(r => {
      const needs = r.needs.slice(); const imported = !!r.state.imported; const O = orgpkg();
      if (r.kind === 'field' && !imported && filled(r.inputs.type) && O) r = Object.assign({}, r, { generatedArtifact: O.FIELD_T[r.inputs.type] ? 'supported' : 'not supported' });   // a type the team typed in decides it
      if (r.generatedArtifact !== 'supported' && !imported) needs.push(need('manualConfig', 'configured by hand (Studio does not export this item): not confirmed', r.state.manual, true));
      const missing = needs.filter(n => !n.ok && !filled(r.inputs[n.key])).map(n => ({ key: n.key, label: n.label, manual: !!n.manual }));
      const rejected = r.reqStatuses.filter(q => /^(Rejected|Deferred)$/.test(q.status));
      return Object.assign({}, r, { missingInputs: missing, validationStatus: rejected.length ? 'blocked' : r.validation, blockedBy: rejected.length ? 'requirement ' + rejected.map(q => q.id + ' is ' + q.status).join(', ') : '' });
    });
    for (let pass = 0; pass < out.length; pass++) {   // a row is blocked when something it depends on is invalid or blocked (capped, so a cycle cannot loop)
      const cur = new Map(out.map(r => [r.id, r])); let moved = false;
      out = out.map(r => { if (r.validationStatus === 'blocked') return r; const bad = r.dependencies.map(d => cur.get(d)).filter(d => d && (d.validationStatus === 'invalid' || d.validationStatus === 'blocked')); if (!bad.length) return r; moved = true; return Object.assign({}, r, { validationStatus: 'blocked', blockedBy: 'depends on ' + bad.map(d => d.item).join(', ') + ' (' + bad[0].validationStatus + ')' }); });
      if (!moved) break;
    }
    return out.map(r => {
      const hard = r.missingInputs.some(m => !m.manual); const s = r.state; let st;
      if (hard) st = 'missing input'; else if (s.deploymentReady && s.validated) st = 'deployment-ready'; else if (s.validated) st = 'validated'; else if (s.manual) st = 'manually configured'; else if (s.generated) st = 'generated';
      else if (s.imported) st = 'unknown'; else st = r.generatedArtifact === 'supported' ? 'ready to generate' : 'missing input';
      return Object.assign({}, r, { implementationStatus: st });
    });
  }
  function buildGapTable(input, opts) {
    input = input || {}; opts = opts || {}; const saved = (opts.saved && opts.saved.edits) || {}; const requirements = list(input.requirements); const base = (input.packageBaseline && input.packageBaseline.modules) || {};
    const mods = list(input.modules); const reqStatus = new Map(requirements.map(r => [r.id, r.status || 'Draft']));
    const ctx = { modNames: new Set(), newMods: new Set(), fieldsOf: {}, roleLabels: new Set(), rowIds: new Set() };
    mods.forEach(m => { ctx.modNames.add(norm(m.name)); if (m.label) ctx.modNames.add(norm(m.label)); if (m.origin === 'new') ctx.newMods.add(m.name); if (m.fields || base[m.name]) ctx.fieldsOf[m.name] = new Set([].concat(list(m.fields).map(f => norm(f.name || f)), list((base[m.name] || {}).fields).map(norm))); });
    Object.keys(base).forEach(n => ctx.modNames.add(norm(n)));
    const all = k => [].concat(list(input[k]).map(x => Object.assign({ module: '' }, x)), ...mods.map(m => list(m[k]).map(x => Object.assign({ module: m.name }, x))));
    all('roles').forEach(r => ctx.roleLabels.add(norm(r.label || r.name)));
    const plan = [];   // pass 1: which rows exist (so dependencies can point at them); pass 2: the rows themselves
    const add = (kind, mod, key, ent, extra) => { const id = kind + ':' + (mod ? mod + '.' : '') + key; if (ctx.rowIds.has(id)) return; ctx.rowIds.add(id); plan.push({ id, kind, mod, ent, extra: extra || {} }); };
    mods.filter(m => m.origin === 'new').forEach(m => add('module', '', m.name, Object.assign({ label: m.label || m.name }, m), {}));
    mods.forEach(m => {
      list(m.fields).forEach(f => { const e = typeof f === 'string' ? { name: f } : f; add('field', m.name, slug(e.name), Object.assign({ module: m.name }, e)); });
      list(m.views).forEach(v => add('view', m.name, slug(v.id || v.label), Object.assign({ module: m.name }, v)));
      list(m.statuses).forEach(s => add('status', m.name, slug(s.label || s.name), Object.assign({ module: m.name }, s)));
      list(m.workflows).forEach(w => { add('workflow', m.name, slug(w.id || w.name), Object.assign({ module: m.name }, w)); list(w.states).filter(s => s.origin === 'proposed' || s.new === true).forEach(s => add('status', m.name, slug(s.label || s.name), Object.assign({ module: m.name }, s))); });
      list(m.notifications).forEach(n => add('notification', m.name, slug(n.id || n.name), Object.assign({ module: m.name }, n)));
    });
    all('relationships').forEach(r => add('relationship', r.module, slug(r.id || (r.from + '_' + r.to + '_' + r.type)), r));
    all('roles').forEach(r => add('role', '', slug(r.id || r.label || r.name), r));
    all('scripts').forEach(s => add('script', s.module, slug(s.id || s.name), s));
    all('connectedApps').forEach(a => add('connectedApp', '', slug(a.id || a.name), a));
    list(input.notifications).forEach(n => add('notification', n.module || '', slug(n.id || n.name), n));   // top-level notifications are allowed too
    const rows = plan.map(p => {
      const e = p.ent; const r = rules(p.kind, e, ctx); const mod = p.mod || e.module || ''; const ids = reqsFor(e, p.kind, mod, p.id, requirements);
      const imported = (p.kind === 'field' && list((base[mod] || {}).fields).includes(e.name)) || (p.kind === 'module' && !!base[e.name]);
      const item = p.kind === 'module' ? (e.label || e.name) + ' (module)' : (e.label || e.name || (e.from ? e.from + ' → ' + e.to : p.id)) + (mod ? ' (' + mod + ')' : '');
      const src = SOURCES.includes(e.source) ? e.source : imported ? 'package' : ids.length ? 'brd' : (p.kind === 'relationship' || p.kind === 'connectedApp') ? 'hub' : 'unknown';
      const sv = saved[p.id] || {};
      return { id: p.id, item, kind: p.kind, module: mod, requirementIds: ids, reqStatuses: ids.map(i => ({ id: i, status: reqStatus.get(i) || 'Draft' })), source: src, requiredConfiguration: r.config,
        generatedArtifact: imported ? 'none' : r.supported, needs: r.needs, inputs: Object.assign({}, sv.inputs), dependencies: [...new Set(r.deps)].filter(d => d !== p.id && ctx.rowIds.has(d)),
        validation: VALIDATION.includes(sv.validation) ? sv.validation : 'not validated', responsible: sv.responsible || '',
        state: { generated: !!(sv.state && sv.state.generated), imported, manual: !!(sv.state && sv.state.manual), validated: !!(sv.state && sv.state.validated), deploymentReady: !!(sv.state && sv.state.deploymentReady) } };
    });
    return { version: VERSION, rows: derive(rows), log: list(opts.saved && opts.saved.log).slice() };
  }

  // ---------- the team fills inputs in place ----------
  function setInput(table, rowId, field, value, by, at) {
    const i = table.rows.findIndex(r => r.id === rowId); if (i < 0) throw new Error('No such row: ' + rowId);
    const row = table.rows[i]; const f = String(field).replace(/^state\./, ''); let next = Object.assign({}, row, { inputs: Object.assign({}, row.inputs), state: Object.assign({}, row.state) }); let from, to;
    if (f === 'responsible') { from = row.responsible; to = String(value == null ? '' : value).trim(); next.responsible = to; }
    else if (f === 'validationStatus' || f === 'validation') {
      if (!VALIDATION.includes(value)) throw new Error('validationStatus must be one of: ' + VALIDATION.join(', ') + ' ("blocked" is worked out, not typed)'); from = row.validation; to = value; next.validation = value;
      if (value !== 'valid') { next.state.validated = false; next.state.deploymentReady = false; }
    } else if (STATE_FLAGS.includes(f)) {
      const on = !!value; from = !!row.state[f]; to = on;
      if (on && f === 'validated' && !(row.state.generated || row.state.manual || row.state.imported)) throw new Error('Only a generated, manually configured or imported item can be marked validated.');
      if (on && f === 'validated' && row.validation !== 'valid') throw new Error('Set the validation status to valid (with the evidence) before marking the item validated.');
      if (on && f === 'deploymentReady' && !(row.state.validated && row.implementationStatus !== 'missing input' && row.validationStatus === 'valid')) throw new Error('Deployment-ready needs a validated item with no missing input; Delivery Studio cannot check this against the live organisation.');
      next.state[f] = on; if (!on && f === 'validated') next.state.deploymentReady = false;
    } else if (f === 'manualConfig' || row.needs.some(n => n.key === f)) {
      from = row.inputs[f] == null ? '' : row.inputs[f]; to = typeof value === 'string' ? value.trim() : value == null ? '' : value; if (to === '') delete next.inputs[f]; else next.inputs[f] = to;
    } else throw new Error('"' + field + '" is not an input of ' + rowId + '. Inputs: ' + row.needs.map(n => n.key).concat(['manualConfig', 'responsible', 'validationStatus'].concat(STATE_FLAGS)).join(', '));
    if (JSON.stringify(from) === JSON.stringify(to)) return table;
    const rows = table.rows.slice(); rows[i] = next;
    return { version: table.version, rows: derive(rows), log: table.log.concat([{ at: at || new Date().toISOString(), by: by || 'unknown', rowId, field: f, from, to }]) };
  }
  // what must be saved with the project: only the team's own entries (the rest is worked out again from the project)
  function edits(table) {
    const e = {}; table.rows.forEach(r => { const has = Object.keys(r.inputs).length || r.responsible || r.validation !== 'not validated' || r.state.generated || r.state.manual || r.state.validated || r.state.deploymentReady; if (has) e[r.id] = { inputs: clone(r.inputs), responsible: r.responsible, validation: r.validation, state: { generated: r.state.generated, manual: r.state.manual, validated: r.state.validated, deploymentReady: r.state.deploymentReady } }; });
    return { edits: e, log: table.log.slice(-500) };
  }

  // ---------- readiness: may a package be generated? ----------
  function readiness(table) {
    const rows = table.rows; const byStatus = {}; STATUSES.concat(['unknown']).forEach(s => { byStatus[s] = 0; }); rows.forEach(r => { byStatus[r.implementationStatus] = (byStatus[r.implementationStatus] || 0) + 1; });
    const blocking = []; rows.forEach(r => { r.missingInputs.filter(m => !m.manual).forEach(m => blocking.push({ id: r.id, item: r.item, reason: 'missing input: ' + m.label })); if (r.validationStatus === 'invalid' || r.validationStatus === 'blocked') blocking.push({ id: r.id, item: r.item, reason: r.validationStatus + (r.blockedBy ? ': ' + r.blockedBy : '') }); });
    const supported = rows.filter(r => r.generatedArtifact === 'supported'); const reasons = [];
    if (!rows.length) reasons.push('The gap table has no components.'); else if (!supported.length) reasons.push('Nothing in the table is something Delivery Studio can generate.');
    if (blocking.length) reasons.push(blocking.length + ' blocking point(s): ' + blocking.slice(0, 3).map(b => b.item + ' (' + b.reason + ')').join('; ') + (blocking.length > 3 ? ' and more.' : '.'));
    const canGenerate = !!supported.length && !blocking.length;
    const manualPending = rows.filter(r => r.missingInputs.some(m => m.manual)).length; const done = rows.filter(r => ['generated', 'manually configured', 'validated', 'deployment-ready'].includes(r.implementationStatus)).length;
    const packageStatus = !canGenerate ? 'inputs missing or blocked' : rows.every(r => r.implementationStatus === 'deployment-ready') ? 'every item marked deployment-ready by the team (not checked by Delivery Studio)' : rows.some(r => r.state.generated) ? (rows.every(r => r.state.validated || !r.state.generated) ? 'generated and marked validated' : 'generated, not validated') : 'ready to generate';
    return { total: rows.length, byStatus, blocking, canGenerate, reasons, manualPending, progress: { done, total: rows.length }, packageStatus };
  }
  const api = { VERSION, STATUSES, SOURCES, buildGapTable, setInput, readiness, edits, derive };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBCfgGap = api;
})(typeof window !== 'undefined' ? window : globalThis);
