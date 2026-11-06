/* Core: state, immutable baseline, workshop overlay, selectors, persistence, helpers. */
(function (root) {
  'use strict';
  const P = root.FWBParser;

  // ---------- helpers ----------
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Links people type or import are only rendered as links when they are web or mail addresses (never javascript:, data: and the like).
  // CSV cells: text that a spreadsheet would run as a formula (= + - @ tab CR at the start) is prefixed with ' so it opens as text. Numbers are left alone.
  const csvText = v => { if (typeof v !== 'string') return v; v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' '); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }; // no control characters pasted from Office; no formula injection
  const safeUrl = u => { const t = String(u == null ? '' : u).trim(); return /^(https?:\/\/|mailto:)/i.test(t) && !/[\u0000-\u001f\s]/.test(t) ? t : ''; };
  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const clone = o => JSON.parse(JSON.stringify(o));
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
  const slug = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const humanize = P.humanize;
  const secs = s => { s = Number(s) || 0; if (!s) return ''; if (s % 86400 === 0) return (s / 86400) + ' day' + (s / 86400 > 1 ? 's' : ''); if (s % 3600 === 0) return (s / 3600) + ' hour' + (s / 3600 > 1 ? 's' : ''); if (s % 60 === 0) return (s / 60) + ' minutes'; return s + ' seconds'; };

  const CATEGORY_LABEL = P.CATEGORY_LABEL;
  const CATEGORY_ORDER = ['internal', 'vendor', 'client', 'tenant', 'occupant', 'employee', 'external', 'system', 'tbc', 'proposed'];
  const ACTOR_STATUS = { configured: 'Explicitly configured', inferred: 'Inferred', proposed: 'Proposed in workshop', tbc: 'Requires customer confirmation', confirmed: 'Confirmed in workshop' };
  const VERIFICATION = { verified: 'Verified from configuration', inferred: 'Inferred (not verified)', proposed: 'Proposed in workshop', tbc: 'To be confirmed' };
  const REQ_CLASS = { standard: 'Standard product functionality', existing: 'Existing configuration', change: 'Proposed configuration change', custom: 'Potential customization', confirm: 'Requires customer / product-team confirmation' };
  const FIELD_TYPES_EDIT = ['Single Line Text', 'Multi Line Text', 'Rich Text', 'Number', 'Decimal', 'Currency', 'Boolean', 'Date', 'Date Time', 'Picklist', 'Multi Picklist', 'Lookup', 'Multi Lookup', 'File', 'URL', 'Email', 'Auto Number', 'Signature', 'Geo Location'];

  // ---------- state ----------
  // S.baseline: immutable configuration (bundled reference or a project-imported package).
  // S.docs[section] = { data, version, dirty } — every section is a versioned server document; S.ws is docs.workshop.data.
  const S = { baseline: null, baselineMeta: null, ws: null, user: null, project: null, members: [], docs: {}, readonly: false,
    ui: { view: 'overview', module: null, moduleTab: 'templates', flowId: null, selected: null, filters: { q: '', priority: 'all', scope: 'inuse', kind: 'all' }, processId: null, reqId: null }, listeners: [] };

  function newWorkshop() {
    return { schema: 'fwb.workshop/2', created: new Date().toISOString(), updated: new Date().toISOString(),
      project: { client: '', orgId: '', region: '', consultant: '', pm: '', members: '', version: 'V1.0', date: new Date().toISOString().slice(0, 10), background: '', objective: '', docTitle: 'Business Requirements Document' },
      modules: {}, customModules: [], fieldOps: {}, formOps: {}, flows: {}, roles: [], notifications: [], rolePermOps: {}, processes: [], requirements: [], questions: [], log: [], crossLinks: {},
      brd: { includeTechnical: true, includeFormOnly: true, sections: null, template: null, versionHistory: [{ version: 'V1.0', date: new Date().toISOString().slice(0, 10), author: '', change: 'Initial draft from requirement workshop' }], approvals: [{ name: '', role: 'Customer Sponsor', date: '' }, { name: '', role: 'Facilio Project Manager', date: '' }] },
      attachments: { screenshots: [] } };
  }
  const SECTION_DEFAULTS = {
    workshop: newWorkshop,
    people: () => ({ team: [], stakeholders: [] }),
    planner: () => ({ msa: null, scope: [], sessions: [], settings: { timeLabel: 'UAE', defaultMinutes: 120, mode: 'Virtual Session' }, attendees: {} }),
    reviews: () => ({ modules: {} }),
    transcripts: () => ({ items: [], history: [] }),
    dashboards: () => ({ categories: [] }),
    brddoc: () => ({ edits: {}, status: 'draft', reviewedBy: '', reviewedAt: '', exports: [] }),
    plan: () => ({ notes: {}, view: {} }),
    config: () => ({ source: 'reference', importedFileId: null, importedMeta: null }),
    guide_published: () => null, schedule_published: () => null,
    custintro: () => ({ include: { objectives: true, modules: true, roadmap: true, guides: false }, objectives: '', welcome: '' }),
    portal_controls: () => ({}), portal_published: () => null, onboarding_published: () => null, plan_struct: () => ({ rows: [], versions: [] }), ftr_wb: () => ({ versions: [] }), kpi_wb: () => ({ versions: [] }), config_digest: () => ({}), workspace: () => ({ hidden: [], labels: {}, move: {}, order: {}, groupOrder: [], custom: [] })
  };
  S.ws = newWorkshop();
  function doc(section) { if (!S.docs[section]) S.docs[section] = { data: SECTION_DEFAULTS[section] ? SECTION_DEFAULTS[section]() : {}, version: 0, dirty: false }; return S.docs[section].data; }

  function log(action, detail) { S.ws.log.unshift({ ts: new Date().toISOString(), action, detail, by: S.user && S.user.name }); if (S.ws.log.length > 500) S.ws.log.length = 500; }
  function changed(action, detail, opts) {
    opts = opts || {}; const section = opts.section || 'workshop';
    if (S.readonly) { emit(); return; }
    if (action) log(action, detail);
    if (section === 'workshop') S.ws.updated = new Date().toISOString();
    markDirty(section); if (action && section !== 'workshop') markDirty('workshop');
    if (opts.render !== false) emit();
  }
  function on(fn) { S.listeners.push(fn); }
  function emit() { S.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }

  // ---------- persistence (server, versioned per section) ----------
  let saveTimer = null; const saveState = { status: 'saved', at: null, error: null, conflict: null };
  function markDirty(section) { if (!S.docs[section]) doc(section); S.docs[section].dirty = true; saveState.status = 'dirty'; paintSave(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 1200); }
  function paintSave() { const el = document.getElementById('saveState'); if (!el) return; el.className = 'save-state' + (saveState.status === 'dirty' || saveState.status === 'saving' ? ' dirty' : saveState.status === 'error' ? ' err' : ''); el.textContent = saveState.status === 'dirty' ? 'Unsaved changes' : saveState.status === 'saving' ? 'Saving…' : saveState.status === 'error' ? (saveState.conflict ? 'Conflict — reload to merge' : 'Save failed — retrying') : saveState.at ? 'All changes saved ' + saveState.at.toLocaleTimeString() : 'All changes saved'; el.title = saveState.error || ''; }
  let flushing = null, again = false;
  async function flush() { if (flushing) { again = true; return flushing; } flushing = doFlush(); try { await flushing; } finally { flushing = null; } if (again) { again = false; return flush(); } }
  async function doFlush() {
    if (!S.project || S.readonly) return;
    const dirty = Object.keys(S.docs).filter(k => S.docs[k].dirty);
    if (!dirty.length) { saveState.status = 'saved'; paintSave(); return; }
    saveState.status = 'saving'; paintSave();
    for (const k of dirty) {
      const d = S.docs[k]; d.dirty = false; d.inflight = true;   // inflight: being saved right now (src/session.js keeps it if the save is refused because the session ended)
      try { const r = await root.FWBApi.put(`/api/projects/${S.project.id}/docs/${k}`, { data: k === 'workshop' ? S.ws : d.data, baseVersion: d.version }); d.version = r.version; d.inflight = false; }
      catch (e) { d.inflight = false; d.dirty = true; saveState.status = 'error'; saveState.error = e.message; saveState.conflict = e.status === 409 ? k : null; paintSave(); if (e.status !== 409) { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 5000); } else if (root.FWBShell) root.FWBShell.conflict(k, e.data); return; }
    }
    saveState.status = Object.keys(S.docs).some(k => S.docs[k].dirty) ? 'dirty' : 'saved'; saveState.at = new Date(); saveState.error = null; saveState.conflict = null; paintSave();
  }
  function hasUnsaved() { return Object.keys(S.docs).some(k => S.docs[k].dirty) || saveState.status === 'saving'; }
  async function loadProjectDocs(projectId, sections, pre) {
    S.docs = {};
    if (pre) { // documents already fetched together with the project (one request)
      sections.forEach(k => { const d = pre[k]; S.docs[k] = { data: d && d.data != null ? d.data : (SECTION_DEFAULTS[k] ? SECTION_DEFAULTS[k]() : null), version: d ? d.version || 0 : 0, dirty: false }; });
      if (S.docs.workshop) { const w = S.docs.workshop.data; S.ws = Object.assign(newWorkshop(), w); S.docs.workshop.data = S.ws; }
      saveState.status = 'saved'; saveState.at = null; paintSave(); return;
    }
    // customers: ask which sections they may read first, so tabs switched off in the portal controls are not requested (no 403 noise)
    if (S.user && S.user.kind === 'customer') { try { const l = await root.FWBApi.get(`/api/projects/${projectId}/docs`); const ok = new Set((l.sections || []).map(x => x.section)); sections.filter(k => !ok.has(k)).forEach(k => { S.docs[k] = { data: SECTION_DEFAULTS[k] ? SECTION_DEFAULTS[k]() : null, version: 0, dirty: false }; }); sections = sections.filter(k => ok.has(k)); } catch (e) { /* fall back to per-section reads */ } }
    await Promise.all(sections.map(async k => {
      try { const r = await root.FWBApi.get(`/api/projects/${projectId}/docs/${k}`); S.docs[k] = { data: r.data == null ? (SECTION_DEFAULTS[k] ? SECTION_DEFAULTS[k]() : null) : r.data, version: r.version || 0, dirty: false }; }
      catch (e) { if (e.status === 403) S.docs[k] = { data: SECTION_DEFAULTS[k] ? SECTION_DEFAULTS[k]() : null, version: 0, dirty: false }; else throw e; }
    }));
    if (S.docs.workshop) { const w = S.docs.workshop.data; S.ws = Object.assign(newWorkshop(), w); S.docs.workshop.data = S.ws; }
    saveState.status = 'saved'; saveState.at = null; paintSave();
  }
  async function reloadSection(k) { const r = await root.FWBApi.get(`/api/projects/${S.project.id}/docs/${k}`); S.docs[k] = { data: r.data == null ? SECTION_DEFAULTS[k]() : r.data, version: r.version, dirty: false }; if (k === 'workshop') { S.ws = Object.assign(newWorkshop(), r.data || {}); S.docs.workshop.data = S.ws; } saveState.status = 'saved'; saveState.conflict = null; paintSave(); emit(); }

  function setBaseline(b, meta) {
    S.baseline = deepFreeze(b); S.baselineMeta = meta || null;
    const p = S.ws.project; if (meta && meta.kind === 'imported' && !p.orgId && b.meta && b.meta.orgId) p.orgId = b.meta.orgId;
  }

  // ---------- selectors: modules ----------
  function wsMod(name) { return S.ws.modules[name] || (S.ws.modules[name] = {}); }
  /** Only System modules and Custom modules are Facilio modules. A custom module that has no state flow and (almost) no fields of its own, or that is named like a PDF template or a settings store, is not a business module:
      it only keeps files or settings for something else (for example the Custom PDF Builder connected app). Those are listed apart as 'support'. A person can overrule the guess per module (S.ws.modules[name].kind = 'module' or 'support'). */
  function supportGuess(b) { if (!b || !b.custom) return false; if (b.stateflowEnabled) return false; const own = (b.fields || []).filter(f => !/^System/.test(f.origin || '')).length; return own < 3 || /pdf|template|settings|builder/i.test(b.name + ' ' + (b.label || '')); }
  function isSupportModule(name) { const w = S.ws.modules[name] || {}; if (w.kind === 'module') return false; if (w.kind === 'support') return !S.ws.customModules.some(c => c.name === name); return !S.ws.customModules.some(c => c.name === name) && supportGuess(S.baseline && S.baseline.modules[name]); }
  function allModules() {
    const out = [];
    if (S.baseline) Object.values(S.baseline.modules).forEach(m => { if (!isSupportModule(m.name)) out.push(moduleView(m.name)); });
    S.ws.customModules.forEach(c => out.push(moduleView(c.name)));
    return out;
  }
  function supportModules() { return S.baseline ? Object.values(S.baseline.modules).filter(m => isSupportModule(m.name)).map(m => moduleView(m.name)) : []; }
  function msaMatched(name) { try { return (doc('planner').scope || []).some(x => x.module === name && x.status === 'matched'); } catch (e) { return false; } }
  function moduleView(name) {
    const b = S.baseline && S.baseline.modules[name];
    const c = S.ws.customModules.find(x => x.name === name);
    const w = S.ws.modules[name] || {};
    if (!b && !c) return null;
    const base = b || { name, label: c.label, description: c.description, custom: true, fields: [], forms: [], flows: [], evidence: [], dependsOn: [], usedBy: [], priority: 'medium', priorityReasons: ['Custom module proposed in workshop'], inUse: true, score: 0 };
    const priority = w.priority || base.priority;
    const inScope = w.inScope !== undefined ? w.inScope : msaMatched(name); // scope = modules matched from the MSA, or ones the user adds/toggles; never auto-added by priority
    return { name, label: (c && c.label) || base.label, description: base.description, origin: c ? 'proposed' : 'existing', system: b ? !b.custom : false, custom: base.custom,
      priority, priorityOverridden: !!w.priority && w.priority !== base.priority, basePriority: base.priority, priorityReasons: base.priorityReasons || [], inScope, inUse: base.inUse || !!c,
      evidence: base.evidence || [], dependsOn: base.dependsOn || [], usedBy: base.usedBy || [], forms: base.forms || [], flowIds: flowsForModule(name).map(f => f.id), score: base.score || 0,
      notes: w, ref: base.ref, notInModuleXml: base.notInModuleXml, formBuilder: formBuilderInfo(name, base) };
  }
  function formBuilderInfo(name, base) {
    if (!S.baseline) return { status: 'n/a', text: 'Proposed module (form designed in workshop)' };
    const fs = (base.forms || []).length;
    return fs ? { status: 'verified', text: fs + ' form(s) in the package — module uses the Form Builder' } : { status: 'unknown', text: 'No form in the package — Form Builder availability to be confirmed' };
  }

  // ---------- selectors: fields ----------
  function fops(m) { return S.ws.fieldOps[m] || (S.ws.fieldOps[m] = { add: [], modify: {}, remove: [], desc: {}, req: {} }); }
  function effFields(m) {
    const b = S.baseline && S.baseline.modules[m];
    const ops = S.ws.fieldOps[m] || { add: [], modify: {}, remove: [], desc: {}, req: {} };
    const out = [];
    (b ? b.fields : []).forEach(f => {
      const mod = ops.modify[f.name];
      const v = Object.assign({}, f, mod || {});
      v.status = ops.remove.indexOf(f.name) >= 0 ? 'removed' : (mod ? 'modified' : 'existing');
      v.baseline = f; v.description = (ops.desc[f.name] !== undefined ? ops.desc[f.name] : (mod && mod.description) || '');
      v.requirement = ops.req[f.name] || '';
      out.push(v);
    });
    ops.add.forEach(f => out.push(Object.assign({ status: 'proposed', origin: 'Custom (proposed)', onForms: [] }, f, { description: ops.desc[f.name] !== undefined ? ops.desc[f.name] : f.description || '', requirement: ops.req[f.name] || f.requirement || '' })));
    return out;
  }
  function fieldLabel(m, f) { const x = effFields(m).find(z => z.name === f); return x ? x.label : humanize(f); }

  // ---------- selectors: forms ----------
  function effForm(key) {
    const b = S.baseline && S.baseline.forms[key];
    const o = S.ws.formOps[key];
    if (o) return Object.assign({}, b || {}, o, { proposed: true });
    return b ? Object.assign({}, b, { proposed: false }) : null;
  }
  function formsForModule(m) {
    const out = [];
    if (S.baseline) Object.values(S.baseline.forms).filter(f => f.module === m).forEach(f => out.push(effForm(f.key)));
    Object.keys(S.ws.formOps).forEach(k => { const f = S.ws.formOps[k]; if (f.module === m && !(S.baseline && S.baseline.forms[k])) out.push(effForm(k)); });
    return out;
  }

  // ---------- template catalogue (module -> app -> templates) ----------
  // Source: FORM.xml. A module has one form per app, plus extra forms the package uses for other purposes. Role is derived from the
  // package's own Form_Name, never from display order:
  //   action     = form opened by a state transition, approval, rejection or pause (names "__state_transition_*", "__approval_*", "*_approval_form" ...)
  //   standard   = the app's system default form ("default_*" / "standard_*")
  //   additional = any other form on the module/app (asset-group, alarm, PM, portal-only forms ...)
  //   proposed   = created in this workshop
  const ACTION_FORM = /^__|(approval|rejection|reject|pause)_form$/i;
  function formRole(f) {
    if (f.proposed && !(S.baseline && S.baseline.forms[f.key])) return 'proposed';
    if (ACTION_FORM.test(f.name || '')) return 'action';
    if (/^(default_|standard_)/i.test(f.name || '')) return 'standard';
    return 'additional';
  }
  function formCatalog(m) {
    const all = formsForModule(m).map(f => ({ form: f, role: formRole(f) }));
    const actions = all.filter(x => x.role === 'action');
    const templates = all.filter(x => x.role !== 'action');
    const apps = [...new Set(templates.map(x => x.form.app || ''))];
    // an app whose only form is not named default_* still has exactly one primary form: mark it standard
    apps.forEach(a => { const l = templates.filter(x => (x.form.app || '') === a); if (l.length === 1 && l[0].role === 'additional') l[0].role = 'standard'; });
    // more than one default_* form in one app is a source ambiguity: report, do not choose
    const ambiguous = apps.filter(a => templates.filter(x => (x.form.app || '') === a && x.role === 'standard').length > 1);
    const primary = apps.includes('maintenance') ? 'maintenance' : (apps[0] || '');
    return { templates, actions, apps, primary, ambiguous };
  }

  // ---------- selectors: flows ----------
  function baselineFlowModel(f, BB) { // BB: build the model from another (partial) configuration, used when importing state flow XML
    const B = BB || S.baseline;
    const ts = f.transitions.map(id => B.transitions.find(t => t.id === id)).filter(Boolean);
    const stateNames = [];
    const add = (n, l) => { if (n && !stateNames.find(s => s.key === n.toLowerCase())) stateNames.push({ key: n.toLowerCase(), name: n, label: l || n }); };
    add(f.initialState, statusLabelOf(f.module, f.initialState, B));
    ts.forEach(t => { add(t.from, t.fromLabel); add(t.to, t.toLabel); });
    const layout = f.layout || {};
    const states = stateNames.map(s => { const lay = layout[s.name] || Object.entries(layout).find(([k]) => k.toLowerCase() === s.key); const L = Array.isArray(lay) ? lay[1] : lay; return { id: 's_' + slug(s.name), name: s.name, label: s.label, x: L ? L.x : null, y: L ? L.y : null, origin: 'baseline' }; });
    const sid = n => 's_' + slug(n);
    const trans = ts.map(t => ({ id: t.id, baselineId: t.id, name: t.name, from: sid(t.from), to: sid(t.to), type: t.type, enabled: t.enabled,
      actors: t.actorAssignments.map(a => ({ actor: a.actor, status: a.status, note: a.note || '' })), condition: t.criteria ? t.criteria.text : '',
      conditionFields: t.criteria ? t.criteria.conditions.map(c => c.field) : [], commentRequired: t.commentRequired, form: t.form,
      validations: t.validations.map(v => v.message), schedule: t.schedule, portals: t.portals.slice(), emailLink: t.emailLink,
      approval: { required: t.type === 'user' && t.performers.length > 0 && /approv|reject/i.test(t.name), approvers: [] },
      actions: actionsText(t.actions), fieldUpdates: t.actions.fieldUpdates.map(u => u.fieldLabel + ' = ' + u.value), notifications: t.actions.recipients.slice(),
      notes: '', origin: 'baseline', removed: false, ref: t.ref }));
    autoLayout(states, trans, f.initialState ? sid(f.initialState) : null);
    return { id: f.id, module: f.module, name: f.name, initial: f.initialState ? sid(f.initialState) : (states[0] && states[0].id), states, transitions: trans,
      enabled: f.enabled, isDefault: f.isDefault, criteria: f.criteria ? f.criteria.text : '', origin: 'baseline', baseFlowId: f.id, ref: f.ref };
  }
  function actionsText(a) {
    const out = [];
    if (!a) return out;
    a.types.forEach(t => { if (t === 'FIELD_CHANGE') out.push('Updates fields: ' + (a.fieldUpdates.map(u => u.fieldLabel + ' = ' + u.value).join(', ') || 'see configuration')); else if (t === 'BULK_EMAIL_NOTIFICATION' || t === 'EMAIL_NOTIFICATION') out.push('Sends email' + (a.recipients.length ? ' to ' + a.recipients.join(', ') : '')); else if (t === 'PUSH_NOTIFICATION') out.push('Sends mobile push notification'); else if (t === 'WORKFLOW_ACTION') out.push('Runs a script (business effect to be confirmed)'); else if (t === 'CHANGE_STATE') out.push('Changes status' + (a.changeState.length ? ' to ' + a.changeState.join(', ') : '')); else out.push(humanize(t)); });
    return out;
  }
  function statusLabelOf(m, s, BB) { const B = BB || S.baseline; if (!B || !s) return s; const l = (B.statuses[m] || []).concat(B.statuses['(org-level)'] || []); const x = l.find(z => z.name === s) || l.find(z => z.name.toLowerCase() === String(s).toLowerCase()) || l.find(z => z.label.toLowerCase() === String(s).toLowerCase()); return x ? x.label : s; }
  // Layered layout: each state's level is its distance from the default state; levels run left to right (dir 'h') or
  // top to bottom (dir 'v'). Within a level, states are ordered by their parents' positions to reduce crossings,
  // and every level is centred on the widest one.
  function autoLayout(states, trans, initial, dir) {
    if (states.every(s => s.x !== null && s.y !== null)) return;
    const live = trans.filter(t => !t.removed && t.from !== t.to);
    const level = {}; const q = []; const first = initial && states.some(s => s.id === initial) ? initial : (states[0] && states[0].id); if (first) { level[first] = 0; q.push(first); }
    while (q.length) { const c = q.shift(); live.filter(t => t.from === c).forEach(t => { if (level[t.to] === undefined) { level[t.to] = level[c] + 1; q.push(t.to); } }); }
    let maxL = Math.max(0, ...Object.values(level)); states.forEach(s => { if (level[s.id] === undefined) level[s.id] = ++maxL; });
    const byL = {}; states.forEach(s => { (byL[level[s.id]] = byL[level[s.id]] || []).push(s); });
    const pos = {}; Object.keys(byL).map(Number).sort((a, b) => a - b).forEach(L => {
      const bary = s => { const ps = live.filter(t => t.to === s.id && pos[t.from] !== undefined).map(t => pos[t.from]); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 1e6 + states.indexOf(s); };
      byL[L].sort((a, b) => bary(a) - bary(b)); byL[L].forEach((s, i) => { pos[s.id] = i; });
    });
    const widest = Math.max(1, ...Object.values(byL).map(x => x.length));
    const vert = dir === 'v'; const STEP_L = vert ? 170 : 270, STEP_I = vert ? 290 : 160;
    Object.entries(byL).forEach(([L, list]) => { const off = (widest - list.length) / 2; list.forEach((s, i) => { if (s.x !== null && s.y !== null) return; const a = 60 + Number(L) * STEP_L, b = 60 + (i + off) * STEP_I; s.x = Math.round((vert ? b : a) / 10) * 10; s.y = Math.round((vert ? a : b) / 10) * 10; }); });
  }
  function flowModel(flowId) {
    if (S.ws.flows[flowId]) return S.ws.flows[flowId];
    const f = S.baseline && S.baseline.flows.find(x => x.id === flowId);
    return f ? baselineFlowModel(f) : null;
  }
  function editableFlow(flowId) {
    if (!S.ws.flows[flowId]) { const m = flowModel(flowId); if (!m) return null; S.ws.flows[flowId] = clone(m); S.ws.flows[flowId].workshopCopy = true; }
    return S.ws.flows[flowId];
  }
  function flowsForModule(m) {
    const out = [];
    if (S.baseline) S.baseline.flows.filter(f => f.module === m).forEach(f => out.push({ id: f.id, name: f.name, enabled: f.enabled, isDefault: f.isDefault, origin: 'existing', edited: !!S.ws.flows[f.id] }));
    Object.values(S.ws.flows).filter(f => f.module === m && f.origin === 'proposed').forEach(f => out.push({ id: f.id, name: f.name, enabled: true, origin: 'proposed', edited: true }));
    return out;
  }
  function allFlows() { const ids = new Set(); const out = []; if (S.baseline) S.baseline.flows.forEach(f => { ids.add(f.id); out.push(f.id); }); Object.keys(S.ws.flows).forEach(k => { if (!ids.has(k)) out.push(k); }); return out; }
  function flowDiff(flowId) {
    const cur = S.ws.flows[flowId]; if (!cur) return null;
    if (cur.origin === 'proposed') return { proposedFlow: true, addedStates: cur.states.length, addedTransitions: cur.transitions.length, changes: [] };
    const base = baselineFlowModel(S.baseline.flows.find(f => f.id === flowId));
    const changes = [];
    cur.states.forEach(s => { const b = base.states.find(x => x.id === s.id); if (!b) changes.push({ kind: 'added', what: 'State', name: s.label }); else if (b.label !== s.label) changes.push({ kind: 'modified', what: 'State', name: b.label + ' → ' + s.label }); });
    base.states.forEach(s => { if (!cur.states.find(x => x.id === s.id)) changes.push({ kind: 'removed', what: 'State', name: s.label }); });
    cur.transitions.forEach(t => {
      const b = base.transitions.find(x => x.id === t.id);
      if (!b) changes.push({ kind: 'added', what: 'Transition', name: t.name });
      else if (t.removed) changes.push({ kind: 'removed', what: 'Transition', name: t.name });
      else { const keys = ['name', 'from', 'to', 'type', 'condition', 'commentRequired', 'enabled', 'notes']; const diff = keys.filter(k => JSON.stringify(b[k]) !== JSON.stringify(t[k]));
        if (JSON.stringify(b.actors) !== JSON.stringify(t.actors)) diff.push('actors'); if (JSON.stringify(b.approval) !== JSON.stringify(t.approval)) diff.push('approval'); if (JSON.stringify(b.notifications) !== JSON.stringify(t.notifications)) diff.push('notifications'); if (JSON.stringify(b.actions) !== JSON.stringify(t.actions)) diff.push('actions');
        if (diff.length) changes.push({ kind: 'modified', what: 'Transition', name: t.name, detail: diff.join(', ') }); }
    });
    return { proposedFlow: false, changes };
  }

  // ---------- selectors: actors / roles ----------
  function allActors() {
    const out = [];
    if (S.baseline) S.baseline.actors.forEach(a => out.push(Object.assign({ origin: 'existing' }, a)));
    else { ['vendor', 'tenant', 'client', 'occupant'].forEach(c => out.push({ id: 'tbc:' + c, label: CATEGORY_LABEL[c] + ' — Role to Be Confirmed', category: c, source: 'tbc', origin: 'existing' })); out.push({ id: 'tbc:any', label: 'User / Role to Be Confirmed', category: 'tbc', source: 'tbc' }); out.push({ id: 'system', label: 'System (automatic)', category: 'system', source: 'configured' }); }
    S.ws.roles.forEach(r => out.push({ id: r.id, label: r.label, category: r.category, source: 'proposed', origin: 'proposed', description: r.description, proposedCategory: true }));
    return out;
  }
  function actor(id) { return allActors().find(a => a.id === id) || { id, label: id === 'tbc:any' ? 'User / Role to Be Confirmed' : humanize(String(id).replace(/^[a-z]+:/, '')), category: 'tbc', source: 'unknown' }; }
  function actorLabel(id) { return actor(id).label; }
  function isTbc(a) { return a.status === 'tbc' || /^tbc:/.test(a.actor); }

  // ---------- requirements & questions ----------
  function nextReqId(prefix) { prefix = (prefix || 'REQ').toUpperCase(); const n = S.ws.requirements.filter(r => r.id.indexOf(prefix + '-') === 0).map(r => parseInt(r.id.split('-')[1], 10) || 0); return prefix + '-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0'); }
  function modulePrefix(m) { const mv = moduleView(m); const label = (mv ? mv.label : m).replace(/[^A-Za-z ]/g, ''); const w = label.split(/\s+/).filter(Boolean); return (w.length > 1 ? w.map(x => x[0]).join('') : label.slice(0, 3)).toUpperCase().slice(0, 4) || 'REQ'; }

  // ---------- change summary ----------
  function changeSummary() {
    const out = { additions: [], modifications: [], removals: [], decisions: [] };
    Object.values(S.ws.flows).filter(f => f.removalProposed && f.origin !== 'proposed').forEach(f => out.removals.push({ area: 'Stateflow', module: f.module, item: f.name, detail: 'Proposed removal of the configured stateflow' }));
    Object.entries(S.ws.fieldOps).forEach(([m, o]) => {
      o.add.forEach(f => out.additions.push({ area: 'Field', module: m, item: f.label, detail: f.type + (f.required ? ', mandatory' : '') + (f.lookup ? ', lookup to ' + f.lookup : '') }));
      Object.entries(o.modify).forEach(([n, mod]) => out.modifications.push({ area: 'Field', module: m, item: fieldLabel(m, n), detail: Object.keys(mod).filter(k => k !== 'description').join(', ') }));
      o.remove.forEach(n => out.removals.push({ area: 'Field', module: m, item: fieldLabel(m, n), detail: 'Proposed removal from use' }));
    });
    S.ws.customModules.forEach(c => out.additions.push({ area: 'Module', module: c.name, item: c.label, detail: 'Custom module proposed' }));
    Object.entries(S.ws.formOps).forEach(([k, f]) => (S.baseline && S.baseline.forms[k] ? out.modifications : out.additions).push({ area: 'Form', module: f.module, item: f.label || k, detail: 'Proposed form layout (' + f.sections.length + ' sections)' }));
    Object.keys(S.ws.flows).forEach(id => { const d = flowDiff(id); const f = S.ws.flows[id]; if (!d) return; if (d.proposedFlow) out.additions.push({ area: 'State flow', module: f.module, item: f.name, detail: d.addedStates + ' states, ' + d.addedTransitions + ' transitions' }); else d.changes.forEach(c => out[c.kind === 'added' ? 'additions' : c.kind === 'removed' ? 'removals' : 'modifications'].push({ area: c.what, module: f.module, item: c.name, detail: (c.detail || '') + ' — flow "' + f.name + '"' })); });
    S.ws.roles.forEach(r => out.additions.push({ area: 'Role', module: '', item: r.label, detail: CATEGORY_LABEL[r.category] || r.category }));
    Object.entries(S.ws.rolePermOps).forEach(([r, mods]) => Object.keys(mods).forEach(m => out.modifications.push({ area: 'Permission', module: m, item: actorLabel(r), detail: permText(mods[m]) })));
    S.ws.processes.forEach(p => out.additions.push({ area: 'Process map', module: p.module || '', item: p.name, detail: p.steps.length + ' steps' }));
    Object.entries(S.ws.modules).forEach(([m, w]) => { if (w.priority) out.decisions.push({ area: 'Priority', module: m, item: (moduleView(m) || {}).label || m, detail: 'Set to ' + w.priority }); if (w.inScope !== undefined) out.decisions.push({ area: 'Scope', module: m, item: (moduleView(m) || {}).label || m, detail: w.inScope ? 'In scope' : 'Out of scope' }); });
    return out;
  }
  const CHAIN = ['site', 'building', 'floor', 'space', 'asset', 'serviceRequest', 'workorder', 'plannedmaintenance', 'preventivemaintenance', 'inspectionResponse', 'inspectionTemplate', 'workpermit', 'quote', 'requestForQuotation', 'vendorQuotes', 'inventoryrequest', 'purchaserequest', 'purchaseorder', 'invoice', 'vendors', 'insurance', 'tenant', 'client', 'people', 'employee', 'facilitybooking', 'spacebooking', 'invitevisitor', 'visitorlog'];
  function businessRank(m) { const mv = typeof m === 'string' ? moduleView(m) : m; if (!mv) return 999; const i = CHAIN.indexOf(mv.name); return i < 0 ? 100 + ({ high: 0, medium: 1, low: 2 }[mv.priority] || 0) : i; }
  const PERMS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];
  function permText(p) { return PERMS.filter(k => p[k]).map(k => k[0].toUpperCase() + k.slice(1)).join(', ') || 'No access'; }

  // ---------- validation ----------
  function validate() {
    const F = []; const add = (sev, area, item, msg, nav) => F.push({ sev, area, item, msg, nav });
    if (!S.baseline) add('high', 'Source', 'Configuration', 'The configuration could not be loaded.', { view: 'settings' });
    
    const inScope = allModules().filter(m => m.inScope);
    if (!inScope.length) add('high', 'Scope', 'Modules', 'No module is marked in scope for the BRD.', { view: 'modules' });
    inScope.forEach(m => {
      const w = S.ws.modules[m.name] || {};
      if (!w.purpose && !w.objective) add('medium', 'Business intent', m.label, 'Business purpose / objective has not been captured in the workshop.', { view: 'module', module: m.name });
      effFields(m.name).forEach(f => {
        if (f.status === 'proposed') {
          if (!f.label) add('high', 'Field', m.label, 'A proposed field has no label.', { view: 'module', module: m.name, tab: 'fields' });
          if (/Lookup/.test(f.type) && !f.lookup) add('high', 'Field', m.label + ' › ' + f.label, 'Lookup field has no target module.', { view: 'module', module: m.name, tab: 'fields' });
          if (/Picklist/.test(f.type) && !(f.options || []).length) add('medium', 'Field', m.label + ' › ' + f.label, 'Picklist field has no options.', { view: 'module', module: m.name, tab: 'fields' });
          if (f.lookup && !moduleView(f.lookup)) add('medium', 'Field', m.label + ' › ' + f.label, 'Lookup target "' + f.lookup + '" is not a known module.', { view: 'module', module: m.name, tab: 'fields' });
        }
      });
      const names = effFields(m.name).filter(f => f.status !== 'removed').map(f => f.name); const dup = names.filter((n, i) => names.indexOf(n) !== i);
      [...new Set(dup)].forEach(d => add('high', 'Field', m.label, 'Duplicate field API name "' + d + '".', { view: 'module', module: m.name, tab: 'fields' }));
      if (m.origin === 'proposed' && !effFields(m.name).length) add('medium', 'Module', m.label, 'Custom module has no fields yet.', { view: 'module', module: m.name, tab: 'fields' });
      m.flowIds.forEach(fid => {
        const f = flowModel(fid); if (!f) return;
        const live = f.transitions.filter(t => !t.removed && t.enabled !== false);
        if (f.enabled === false && f.origin !== 'proposed') return;
        if (!f.initial || !f.states.find(s => s.id === f.initial)) add('high', 'State flow', m.label + ' › ' + f.name, 'Flow has no valid initial state.', { view: 'flow', flowId: fid });
        live.forEach(t => {
          if (!f.states.find(s => s.id === t.from) || !f.states.find(s => s.id === t.to)) add('high', 'Transition', f.name + ' › ' + t.name, 'Transition references a state that does not exist.', { view: 'flow', flowId: fid, sel: t.id });
          const tbc = (t.actors || []).filter(isTbc); const resolved = (t.actors || []).filter(a => !isTbc(a));
          if (t.type === 'user' && !resolved.length) add('medium', 'Actor', f.name + ' › "' + t.name + '"', 'Responsible role is not confirmed (' + tbc.map(a => actorLabel(a.actor)).join('; ') + ').', { view: 'flow', flowId: fid, sel: t.id });
          (t.actors || []).forEach(a => { if (!/^tbc:|^system$/.test(a.actor) && !allActors().find(x => x.id === a.actor)) add('high', 'Actor', f.name + ' › "' + t.name + '"', 'Assigned role no longer exists.', { view: 'flow', flowId: fid, sel: t.id }); });
          (t.conditionFields || []).forEach(cf => { if (cf && cf !== 'moduleState' && !effFields(m.name).find(x => x.name === cf && x.status !== 'removed')) add('medium', 'Condition', f.name + ' › "' + t.name + '"', 'Condition uses field "' + cf + '" which is not in the module field list.', { view: 'flow', flowId: fid, sel: t.id }); });
        });
        const reach = new Set([f.initial]); let grew = true; while (grew) { grew = false; live.forEach(t => { if (reach.has(t.from) && !reach.has(t.to)) { reach.add(t.to); grew = true; } }); }
        f.states.forEach(s => { if (!reach.has(s.id)) add('low', 'State flow', m.label + ' › ' + f.name, 'State "' + s.label + '" cannot be reached from the initial state by enabled transitions.', { view: 'flow', flowId: fid, sel: s.id }); });
      });
    });
    S.ws.roles.forEach(r => { const has = Object.values(r.perms || {}).some(p => PERMS.some(k => p[k])); if (!has) add('low', 'Role', r.label, 'Proposed role has no module permissions defined.', { view: 'roles' }); });
    S.ws.processes.forEach(p => {
      if (!p.steps.length) add('medium', 'Process', p.name, 'Process map has no steps.', { view: 'portals', processId: p.id });
      p.steps.forEach((s, i) => { if (s.verification === 'tbc' || s.verification === 'inferred') add('medium', 'Handoff', p.name + ' › step ' + (i + 1), (VERIFICATION[s.verification]) + ': ' + s.action, { view: 'portals', processId: p.id });
        if (s.transitionId) { const ok = allFlows().some(fid => { const f = flowModel(fid); return f && f.transitions.find(t => t.id === s.transitionId && !t.removed); }); if (!ok) add('high', 'Process', p.name + ' › step ' + (i + 1), 'Linked transition no longer exists.', { view: 'portals', processId: p.id }); }
        if (/^tbc:/.test(s.lane)) add('low', 'Process', p.name + ' › step ' + (i + 1), 'Lane actor is "' + actorLabel(s.lane) + '".', { view: 'portals', processId: p.id }); });
    });
    S.ws.requirements.forEach(r => {
      if (!r.modules || !r.modules.length) add('medium', 'Requirement', r.id, 'Not linked to any module.', { view: 'reqs', reqId: r.id });
      if (!r.acceptance) add('low', 'Requirement', r.id, 'No acceptance criteria.', { view: 'reqs', reqId: r.id });
      if (r.openQuestions) add('medium', 'Requirement', r.id, 'Open question: ' + r.openQuestions, { view: 'reqs', reqId: r.id });
      if (r.classification === 'confirm' || r.classification === 'custom') add('medium', 'Requirement', r.id, REQ_CLASS[r.classification] + '.', { view: 'reqs', reqId: r.id });
    });
    S.ws.questions.filter(q => q.status !== 'closed').forEach(q => add('medium', 'Open question', q.area || 'General', q.text, { view: 'changes' }));
    return F;
  }

  root.FWB = { S, P, esc, safeUrl, csvText, uid, clone, slug, humanize, secs, CATEGORY_LABEL, CATEGORY_ORDER, ACTOR_STATUS, VERIFICATION, REQ_CLASS, FIELD_TYPES_EDIT, PERMS, permText,
    newWorkshop, log, changed, on, emit, setBaseline, doc, flush, hasUnsaved, loadProjectDocs, reloadSection, paintSave, markDirty, SECTION_DEFAULTS, deepFreeze,
    wsMod, allModules, supportModules, isSupportModule, supportGuess, moduleView, fops, effFields, fieldLabel, effForm, formsForModule, formCatalog, formRole, flowModel, editableFlow, flowsForModule, allFlows, flowDiff, baselineFlowModel, autoLayout, statusLabelOf, actionsText,
    allActors, actor, actorLabel, isTbc, businessRank, CHAIN, nextReqId, modulePrefix, changeSummary, validate };
})(typeof window !== 'undefined' ? window : globalThis);
