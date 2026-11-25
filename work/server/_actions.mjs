/* Project actions: changes the in-app Assistant and a person's own Claude (connector tool project_changes with an action) make for them. Plan: docs/plans/ASSISTANT-ACTIONS-PLAN-2026-11-25.md.
   Every action is two calls. A dry run returns the plan (what changes, what depends on it, what it means) and a token; nothing is written. The real run needs that token
   (so only a previewed, confirmed plan runs), checks the project did not change since, writes, reads the record back to verify, keeps the old values for Undo and writes an audit line.
   Access is the person's own (edit). The pure parts (plan, apply, verify, snapshot, restore) are tested in tests/project_actions.mjs. */
const arr = v => (Array.isArray(v) ? v : []);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const cut = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sing = s => s.replace(/ies$/, 'y').replace(/(ses|xes)$/, s => s.slice(0, -2)).replace(/s$/, '');
export const ACTIONS = ['scope', 'tasks', 'addtasks', 'undo', 'history', 'check', 'watch'];

/** every module the project knows: workshop modules, custom modules, contract matches, flows, and the list the page sends (it has the imported configuration) */
export function knownModules(ws, planner, extra) {
  const out = new Map(), add = (name, label) => { name = cut(name, 80); if (name && !out.has(name)) out.set(name, { name, label: cut(label || name, 80) }); else if (name && label && out.get(name).label === name) out.get(name).label = cut(label, 80); };
  arr(extra).forEach(m => m && add(m.name, m.label));
  arr(obj(ws).customModules).forEach(c => c && add(c.name, c.label)); Object.entries(obj(obj(ws).modules)).forEach(([k, v]) => add(k, obj(v).label));
  arr(obj(planner).scope).forEach(x => x && x.module && add(x.module, x.label || x.moduleLabel)); Object.values(obj(obj(ws).flows)).forEach(f => f && f.module && add(f.module));
  return [...out.values()];
}
/** module words ("Purchase Order", "quotes", "purchaseorder") to known modules; what does not match is returned, never guessed */
export function resolveModules(words, known) {
  const found = [], unknown = [];
  for (const w of arr(words)) { const n = norm(w); if (!n) continue; const hit = known.find(m => norm(m.name) === n || norm(m.label) === n) || known.find(m => sing(norm(m.name)) === sing(n) || sing(norm(m.label)) === sing(n));
    if (hit) { if (!found.includes(hit)) found.push(hit); } else unknown.push(cut(w, 60)); }
  return { found, unknown };
}
const matchedSet = planner => new Set(arr(obj(planner).scope).filter(x => x && x.module && x.status === 'matched').map(x => x.module));
/** the scope a module has now: the team's switch, else the contract match (the same rule as the module page and the solution package) */
export function scopeOf(ws, planner, name) { const w = obj(obj(obj(ws).modules)[name]); return w.inScope !== undefined ? !!w.inScope : matchedSet(planner).has(name); }

/** b: { modules: [words], inScope: false|true, flows: 'off'|'on'|'keep', known: [{name,label}], extraFlows: [{ id, name, module, enabled, model }] (flows of the imported configuration, from the page) }
    kpis: the project's KPI records. Returns the plan; plan.changes 0 means nothing to do. */
export function planScope(ws, planner, b, kpis) {
  ws = obj(ws); b = obj(b); const inScope = b.inScope !== false && b.inScope !== 'false', flowsMode = ['off', 'on'].includes(b.flows) ? b.flows : 'keep';
  const known = knownModules(ws, planner, b.known), { found, unknown } = resolveModules(b.modules, known);
  const modules = found.map(m => { const from = scopeOf(ws, planner, m.name); return { name: m.name, label: m.label, from, to: inScope, change: from !== inScope }; });
  const names = new Set(found.map(m => m.name)), flows = [], hidden = [], seen = new Set();
  if (flowsMode !== 'keep') {
    Object.entries(obj(ws.flows)).forEach(([id, f]) => { if (!f || !names.has(f.module)) return; seen.add(id); const on = f.enabled !== false, want = flowsMode === 'on';
      if (on !== want) flows.push({ id, name: cut(f.name, 120), module: f.module, from: on ? 'on' : 'off', to: want ? 'on' : 'off', via: 'workshop' }); });
    arr(b.extraFlows).forEach(f => { if (!f || !f.id || seen.has(f.id) || !names.has(f.module)) return; seen.add(f.id); const on = f.enabled !== false, want = flowsMode === 'on'; if (on === want) return;
      const m = obj(f.model); if (m.id !== f.id || m.module !== f.module || JSON.stringify(m).length > 300000) { hidden.push({ id: f.id, name: cut(f.name, 120), module: f.module, why: 'its design was not sent with the request' }); return; }
      flows.push({ id: f.id, name: cut(f.name, 120), module: f.module, from: on ? 'on' : 'off', to: want ? 'on' : 'off', via: 'copy', model: m }); });
  }
  // a caller without the page (Claude through the connector) cannot see the flows of the imported configuration: they are queued and the Studio switches them off when a team member next opens the project
  const pending = flowsMode === 'off' && !b.fromPage ? found.filter(m => !obj(ws.pendingFlowsOff)[m.name]).map(m => ({ module: m.name, label: m.label })) : [];
  const reqs = arr(ws.requirements).filter(r => r && r.status !== 'Rejected'), deps = {};
  // requirements out of scope with their modules (asked for): only those whose every module is out of scope after this change
  const outAfter = n => names.has(n) ? !inScope : !scopeOf(ws, planner, n);
  const reqOut = !inScope && b.requirements === 'out' ? reqs.filter(r => r.status !== 'Out of scope' && arr(r.modules).length && arr(r.modules).some(n => names.has(n)) && arr(r.modules).every(outAfter)).map(r => ({ id: r.id, title: cut(r.title, 120), from: r.status || 'Draft' })) : [];
  for (const n of names) {
    const rq = reqs.filter(r => arr(r.modules).includes(n)), no = arr(ws.notifications).filter(x => x && x.module === n).length, sl = arr(ws.slaMatrix).filter(x => x && x.module === n).length;
    const kp = arr(kpis).filter(k => k && k.module === n).length, fo = Object.values(obj(ws.formOps)).filter(f => f && f.module === n).length, fd = obj(obj(ws.fieldOps)[n]); const fields = arr(fd.add).length + Object.keys(obj(fd.modify)).length + arr(fd.remove).length;
    deps[n] = { requirements: rq.length, titles: rq.slice(0, 5).map(r => cut(r.title, 100)), notifications: no, sla: sl, kpis: kp, forms: fo, fields };
  }
  const label = n => (found.find(m => m.name === n) || {}).label || n, consequences = [], moved = modules.filter(m => m.change);
  moved.forEach(m => {
    consequences.push(inScope ? m.label + ' comes into scope: the BRD, the solution package and the readiness checks include it.' : m.label + ' leaves the scope: the BRD, the solution package and the readiness checks leave it out.');
    const d = deps[m.name], pl = (n, w) => n + ' ' + w + (n > 1 ? 's' : ''), bits = [d.requirements && pl(d.requirements, 'requirement'), d.notifications && pl(d.notifications, 'notification'), d.sla && pl(d.sla, 'SLA row'), d.kpis && pl(d.kpis, 'KPI'), d.forms && pl(d.forms, 'form change'), d.fields && pl(d.fields, 'field change')].filter(Boolean);
    if (!inScope && bits.length) consequences.push(m.label + ' still has ' + bits.join(', ') + '. They are kept as they are, not deleted: review them.');
  });
  flows.forEach(f => consequences.push('The state flow "' + f.name + '" (' + label(f.module) + ') is switched ' + f.to + ' in the design. It is kept, not deleted.'));
  hidden.forEach(f => consequences.push('The state flow "' + f.name + '" could not be changed here (' + f.why + '). Open the Studio and ask again from the Assistant.'));
  pending.forEach(m => consequences.push('State flows of ' + m.label + ' that come from the imported configuration are switched off the next time a team member opens this project in the Studio (only the Studio page can read that configuration).'));
  if (reqOut.length) consequences.push(reqOut.length + ' requirement' + (reqOut.length > 1 ? 's' : '') + ' become "Out of scope" (kept, not deleted): ' + reqOut.slice(0, 5).map(r => r.id + ' ' + r.title).join('; ') + (reqOut.length > 5 ? '; and ' + (reqOut.length - 5) + ' more' : '') + '.');
  modules.filter(m => !m.change).forEach(m => consequences.push(m.label + ' is already ' + (inScope ? 'in' : 'out of') + ' scope.'));
  const changes = moved.length + flows.length + pending.length + reqOut.length;
  const summary = changes ? [moved.length ? (inScope ? 'In scope: ' : 'Out of scope: ') + moved.map(m => m.label).join(', ') : '', flows.length ? flows.length + ' state flow' + (flows.length > 1 ? 's' : '') + ' switched ' + (flowsMode === 'on' ? 'on' : 'off') : '', pending.length ? 'imported flows of ' + pending.map(m => m.label).join(', ') + ' queued to switch off' : '', reqOut.length ? reqOut.length + ' requirement' + (reqOut.length > 1 ? 's' : '') + ' out of scope' : ''].filter(Boolean).join('; ') : 'Nothing to change';
  return { action: 'scope', inScope, flowsMode, modules, flows, pending, reqOut, hidden, unknown, deps, consequences, changes, summary, kind: 'reversible', destructive: false, reversible: true };
}
/** the old values of everything the plan touches, for Undo: only the scope switch and the flow switch, so later edits elsewhere survive an undo */
export function snapshot(ws, plan) {
  ws = obj(ws); const mods = {}, flows = {};
  plan.modules.filter(m => m.change).forEach(m => { const w = obj(ws.modules)[m.name]; mods[m.name] = w && w.inScope !== undefined ? { inScope: !!w.inScope } : { unset: true }; });
  plan.flows.forEach(f => { const x = obj(ws.flows)[f.id]; flows[f.id] = x ? { enabled: x.enabled } : { absent: true }; });
  const pend = {}, reqs = {}; arr(plan.pending).forEach(m => { pend[m.module] = true; }); arr(plan.reqOut).forEach(r => { const x = arr(ws.requirements).find(y => y && y.id === r.id); if (x) reqs[r.id] = { status: x.status }; });
  return { modules: mods, flows, pending: pend, reqs, mark: REQ_NOTE };
}
const REQ_NOTE = 'Out of scope: its modules left the scope (Assistant)';
export function applyScope(ws, plan) {
  const out = JSON.parse(JSON.stringify(obj(ws))); out.modules = obj(out.modules); out.flows = obj(out.flows);
  plan.modules.filter(m => m.change).forEach(m => { out.modules[m.name] = Object.assign(obj(out.modules[m.name]), { inScope: plan.inScope }); });
  plan.flows.forEach(f => { if (!out.flows[f.id]) out.flows[f.id] = Object.assign(JSON.parse(JSON.stringify(f.model)), { workshopCopy: true }); out.flows[f.id].enabled = f.to === 'on'; });
  if (arr(plan.pending).length) { out.pendingFlowsOff = obj(out.pendingFlowsOff); plan.pending.forEach(m => { out.pendingFlowsOff[m.module] = true; }); }
  arr(plan.reqOut).forEach(r => { const x = arr(out.requirements).find(y => y && y.id === r.id); if (x) { x.status = 'Out of scope'; x.history = arr(x.history).concat({ at: plan.at || '', by: plan.by || '', change: REQ_NOTE }); } });
  return out;
}
/** read back: every planned switch holds in the saved record */
export function verifyScope(ws, plan) {
  ws = obj(ws); const checks = [];
  plan.modules.filter(m => m.change).forEach(m => checks.push({ what: m.label + (plan.inScope ? ' in scope' : ' out of scope'), ok: obj(obj(ws.modules)[m.name]).inScope === plan.inScope }));
  plan.flows.forEach(f => { const x = obj(obj(ws.flows)[f.id]); checks.push({ what: 'State flow "' + f.name + '" ' + f.to, ok: !!x.id && (x.enabled !== false) === (f.to === 'on') }); });
  arr(plan.pending).forEach(m => checks.push({ what: 'Imported state flows of ' + m.label + ' queued to switch off', ok: !!obj(ws.pendingFlowsOff)[m.module] }));
  arr(plan.reqOut).forEach(r => checks.push({ what: r.id + ' out of scope', ok: (arr(ws.requirements).find(y => y && y.id === r.id) || {}).status === 'Out of scope' }));
  return { ok: checks.every(c => c.ok), checks };
}
/** undo: the old values come back; a queued flow switch the Studio already applied ({ applied: [ids] }) takes its flow copies away again */
export function restore(ws, snap) {
  const out = JSON.parse(JSON.stringify(obj(ws))); out.modules = obj(out.modules); out.flows = obj(out.flows);
  Object.entries(obj(snap.modules)).forEach(([n, v]) => { const w = obj(out.modules[n]); if (v.unset) delete w.inScope; else w.inScope = v.inScope; out.modules[n] = w; });
  Object.entries(obj(snap.flows)).forEach(([id, v]) => { if (v.absent) delete out.flows[id]; else if (out.flows[id]) { if (v.enabled === undefined) delete out.flows[id].enabled; else out.flows[id].enabled = v.enabled; } });
  Object.keys(obj(snap.pending)).forEach(mod => { const p = obj(out.pendingFlowsOff)[mod]; arr(obj(p).applied).forEach(id => { if (obj(out.flows[id]).offBy === 'pending') delete out.flows[id]; }); if (out.pendingFlowsOff) delete out.pendingFlowsOff[mod]; });
  Object.entries(obj(snap.reqs)).forEach(([id, v]) => { const x = arr(out.requirements).find(y => y && y.id === id); if (!x) return; if (v.status === undefined) delete x.status; else x.status = v.status; x.history = arr(x.history).filter(h => !(h && h.change === snap.mark)); });
  return out;
}
export function verifyRestore(ws, snap) {
  ws = obj(ws); const bad = [];
  Object.entries(obj(snap.modules)).forEach(([n, v]) => { const w = obj(obj(ws.modules)[n]); if (v.unset ? w.inScope !== undefined : w.inScope !== v.inScope) bad.push(n); });
  Object.entries(obj(snap.flows)).forEach(([id, v]) => { const x = obj(obj(ws.flows)[id]); if (v.absent ? !!obj(ws.flows)[id] : x.enabled !== v.enabled) bad.push(id); });
  Object.keys(obj(snap.pending)).forEach(mod => { if (obj(ws.pendingFlowsOff)[mod]) bad.push(mod); });
  Object.entries(obj(snap.reqs)).forEach(([id, v]) => { if ((arr(ws.requirements).find(y => y && y.id === id) || {}).status !== v.status) bad.push(id); });
  return { ok: !bad.length, bad };
}
/** tasks in bulk. b: { filter: { status: 'open'|'overdue'|'all', owner (e-mail or name), module, ids }, set: { status, owner (e-mail or name), due YYYY-MM-DD } }
    tasks: [{ id, version, data }], members: the project's members. Only real changes are listed; a name that matches nobody is reported, never guessed. */
export const TASK_STATUS = ['To Do', 'In Progress', 'Blocked', 'Awaiting Customer', 'Awaiting Internal Input', 'In Review', 'Done', 'Cancelled'];
export function planTasks(tasks, members, b, today) {
  b = obj(b); const f = obj(b.filter), set = obj(b.set), problems = [], low = s => String(s || '').toLowerCase().trim();
  const who = s => { s = low(s); if (s === 'me' && b.me) s = low(b.me); return s ? arr(members).find(m => m && (low(m.email) === s || low(m.name) === s || low(m.name).split(' ')[0] === s || low(m.email).split('@')[0] === s)) || null : null; };
  const fo = f.owner ? who(f.owner) : null, to = set.owner ? who(set.owner) : null;
  if (f.owner && !fo) problems.push('No team member matches "' + cut(f.owner, 40) + '".'); if (set.owner && !to) problems.push('No team member matches "' + cut(set.owner, 40) + '", so nobody can take the tasks.');
  if (set.status && !TASK_STATUS.includes(set.status)) problems.push('Unknown task status "' + cut(set.status, 30) + '".'); if (set.due && !/^\d{4}-\d{2}-\d{2}$/.test(set.due)) problems.push('The new due date must look like 2026-12-05.');
  const mods = [f.module, f.moduleLabel].filter(Boolean).map(norm), ids = arr(f.ids), st = ['open', 'overdue', 'all'].includes(f.status) ? f.status : 'open', open = d => !['Done', 'Cancelled'].includes(d.status);
  const hit = problems.length ? [] : arr(tasks).filter(t => t && t.data && (st === 'all' || open(t.data)) && (st !== 'overdue' || (t.data.due && String(t.data.due).slice(0, 10) < today))
    && (!fo || low(t.data.owner) === low(fo.email)) && (!mods.length || mods.includes(norm(t.data.module))) && (!ids.length || ids.includes(t.id)));
  const items = hit.map(t => { const ch = {}; if (set.status && t.data.status !== set.status) ch.status = set.status; if (to && low(t.data.owner) !== low(to.email)) ch.owner = to.email; if (set.due && String(t.data.due || '') !== set.due) ch.due = set.due;
    return { id: t.id, title: cut(t.data.title, 120), version: t.version, from: Object.fromEntries(Object.keys(ch).map(k => [k, t.data[k] === undefined ? null : t.data[k]])), to: ch }; }).filter(x => Object.keys(x.to).length);
  const what = [set.status && 'status ' + set.status, to && 'owner ' + (to.name || to.email), set.due && 'due ' + set.due].filter(Boolean).join(', ');
  const consequences = items.slice(0, 8).map(x => x.title + ': ' + Object.entries(x.to).map(([k, v]) => k + ' ' + (x.from[k] || 'none') + ' → ' + v).join(', ')).concat(items.length > 8 ? ['and ' + (items.length - 8) + ' more'] : [], items.length && to ? ['The new owner is told as with any task change.'] : [], !items.length && !problems.length ? ['No task matches: ' + st + ' tasks' + (fo ? ' of ' + (fo.name || fo.email) : '') + (mods.length ? ' in ' + (f.moduleLabel || f.module) : '') + '.'] : []);
  return { action: 'tasks', items, problems, unknown: [], consequences: problems.concat(consequences), changes: items.length, summary: items.length ? items.length + ' task' + (items.length > 1 ? 's' : '') + ': ' + what : 'Nothing to change', kind: 'reversible', destructive: false, reversible: true };
}
/** new tasks from a customer's tracker (rows read by src/trackerlogic.js). b: { rows: [{ title, desc, owner, due, status, priority, module, row }], type, source, known: [{name,label}] }.
    A row whose title is already a task (any status) is skipped; an owner who is not on the team is left empty and named; a module label becomes the module's name. */
const NEW_TYPES = ['UAT Task', 'Issue / Blocker', 'Customer Action Required', 'Internal Action', 'Meeting Follow-up', 'Implementation Task'];
export function planAdd(tasks, members, ws, planner, b) {
  b = obj(b); const low = s => String(s || '').toLowerCase().trim(), have = new Set(arr(tasks).map(x => norm(obj(x.data).title))), known = knownModules(ws, planner, b.known);
  const who = s => { s = low(s); return s ? arr(members).find(m => m && m.role !== 'customer' && (low(m.email) === s || low(m.name) === s || low(m.name).split(' ')[0] === s || low(m.email).split('@')[0] === s)) || null : null; };
  const type = NEW_TYPES.includes(b.type) ? b.type : 'Internal Action', dups = [], unknownOwners = new Set(), items = [], seen = new Set();
  arr(b.rows).slice(0, 500).forEach(r => { r = obj(r); const title = cut(r.title, 300), k = norm(title); if (!title) return; if (have.has(k) || seen.has(k)) { dups.push(title); return; } seen.add(k);
    const m = who(r.owner); if (r.owner && !m) unknownOwners.add(cut(r.owner, 60)); const mod = r.module ? (resolveModules([r.module], known).found[0] || {}).name || cut(r.module, 120) : '';
    items.push({ title, desc: String(r.desc || '').slice(0, 7000), owner: m ? m.email : '', ownerText: m ? (m.name || m.email) : cut(r.owner, 60), due: /^\d{4}-\d{2}-\d{2}$/.test(String(r.due || '')) ? r.due : '', status: TASK_STATUS.includes(r.status) ? r.status : 'To Do', priority: ['Critical', 'High', 'Medium', 'Low'].includes(r.priority) ? r.priority : '', module: mod, row: Number(r.row) || 0 }); });
  const consequences = items.slice(0, 6).map(x => x.title + (x.owner ? ' (' + x.ownerText + ')' : '') + (x.due ? ', due ' + x.due : '')).concat(items.length > 6 ? ['and ' + (items.length - 6) + ' more'] : [],
    dups.length ? [dups.length + ' row' + (dups.length > 1 ? 's are' : ' is') + ' already a task and will be skipped' + (dups.length <= 3 ? ': ' + dups.join('; ') : '') + '.'] : [],
    unknownOwners.size ? ['Not on the project team, so left unassigned: ' + [...unknownOwners].slice(0, 8).join(', ') + '. Add them in Settings > Access, or assign later.'] : [], items.length ? ['Each task is saved as ' + type + ' with the tracker as its source, and owners are told as with any new task.'] : []);
  return { action: 'addtasks', type, source: cut(b.source, 120), items, dups, unknownOwners: [...unknownOwners], unknown: [], consequences, changes: items.length, summary: items.length ? items.length + ' new task' + (items.length > 1 ? 's' : '') + ' from ' + (cut(b.source, 80) || 'the tracker') : 'Nothing to add', kind: 'reversible', destructive: false, reversible: true };
}
/** the project check (read only): health signals (assess() in _portfolio.mjs) and missed steps (_missed.mjs), grouped critical, high, medium, low, each with why, what to do and where.
    A missed step 7+ days late counts as high, otherwise medium. key: the finding's identity, so the page can tell what is new since the last check. */
const SEV = ['critical', 'high', 'medium', 'low'];
export function groupFindings(h, missed) {
  h = obj(h); const all = arr(h.signals).filter(g => g && g.kind !== 'info').map(g => ({ key: 's:' + g.code, sev: SEV.includes(g.sev) ? g.sev : 'low', title: cut(g.title, 200), why: cut(g.why, 200), action: cut(g.action, 200), links: arr(g.ev).filter(e => e && e.view).slice(0, 3).map(e => ({ label: cut(e.label, 90), view: e.view })) }))
    .concat(arr(missed).map(m => ({ key: 'm:' + m.kind + ':' + m.id, sev: m.daysLate >= 7 ? 'high' : 'medium', title: cut((m.ref ? m.ref + ' ' : '') + m.title, 160) + ': ' + m.daysLate + ' day' + (m.daysLate === 1 ? '' : 's') + ' late', why: cut(m.label + ', owner ' + m.ownerText + ', due ' + m.due, 200), action: cut(m.what || 'Finish it or set a new date.', 200), links: m.view ? [{ label: cut(m.label, 60), view: m.view }] : [] })));
  const groups = SEV.map(sev => ({ sev, items: all.filter(x => x.sev === sev) })).filter(g => g.items.length);
  return { health: h.health || '', why: cut(String(h.why || '').replace(/,(?=\S)/g, ', '), 300), groups, counts: Object.fromEntries(SEV.map(s => [s, all.filter(x => x.sev === s).length])), total: all.length };
}
const planOut = p => Object.assign({}, p, { flows: p.flows.map(f => ({ id: f.id, name: f.name, module: f.module, from: f.from, to: f.to })) });   // the flow designs stay on the server

/** routes and the connector tool (project_changes with an action); D: helpers from work/server/api.mjs */
export function installActions(D) {
  const { route, ok, me, HttpError, projectAccess, pickProject, docRead, docWrite, itemsOf, dbGet, dbPut, dbDel, dbList, audit, touchProject, rid, now, viaApp, CONNECTOR } = D;
  const TTL = 15 * 60e3;
  async function state(pid) { const [cur, pl, kp] = await Promise.all([docRead(pid, 'workshop'), docRead(pid, 'planner').catch(() => null), itemsOf(pid, 'kpi').catch(() => [])]);
    return { ws: (cur && cur.data) || {}, v: cur ? cur.head.v : 0, planner: (pl && pl.data) || {}, kpis: kp.map(x => x.data || {}) }; }
  async function run(s, pid, name, b) {
    const { role } = await projectAccess(s, pid, 'edit'); if (role === 'customer') throw new HttpError(403, 'Project actions are for the delivery team.');
    if (name === 'undo') return undo(s, pid, b);
    if (name === 'check') { const c = await D.projectCheck(pid); return groupFindings(c.health, c.missed); }
    if (name === 'history') return { actions: (await dbList('acts.' + pid)).map(r => ({ id: r.key, at: r.value.at, by: r.value.by, summary: r.value.summary, undone: !!r.value.undone })).sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, 30) };
    if (name === 'tasks') return tasksRun(s, pid, b);
    if (name === 'addtasks') return addRun(s, pid, b);
    if (name === 'watch') {   // the project check's settings of this person in this project (how often, the day it last ran, the findings already shown), so every browser agrees
      const col = 'awatch.' + pid, cur = ((await dbGet(col, s.id).catch(() => null)) || {}).value || {}; if (!b.set) return cur; const x = obj(b.set), v = Object.assign({}, cur);
      if (['open', 'daily', 'off'].includes(x.freq)) v.freq = x.freq; if (/^\d{4}-\d{2}-\d{2}$/.test(String(x.at || ''))) v.at = x.at; if (Array.isArray(x.seen)) v.seen = x.seen.slice(0, 200).map(k => cut(k, 80));
      await dbPut(col, s.id, v); return v;
    }
    if (name !== 'scope') throw new HttpError(404, 'Unknown action "' + cut(name, 30) + '". Actions: ' + ACTIONS.join(', ') + '.');
    const st = await state(pid);
    if (!b.token) {   // dry run: nothing is written
      const plan = planScope(st.ws, st.planner, b, st.kpis); if (!plan.changes) return { dryRun: true, plan: planOut(plan), token: null };
      const token = rid('t'); await dbPut('actp.' + pid, token, { by: s.id, at: Date.now(), v: st.v, plan }); return { dryRun: true, plan: planOut(plan), token };
    }
    const tk = cut(b.token, 60), r = await dbGet('actp.' + pid, tk), t = r && r.value;
    if (!t || t.by !== s.id || Date.now() - t.at > TTL) throw new HttpError(409, 'This preview has expired or is not yours. Ask again to see the changes first.');
    if (t.v !== st.v) throw new HttpError(409, 'The project changed since the preview. Ask again to see the changes first.');
    const plan = Object.assign(t.plan, { at: now(), by: s.email || s.id }), before = snapshot(st.ws, plan), v = await docWrite(s, pid, 'workshop', applyScope(st.ws, plan), st.v);
    await dbDel('actp.' + pid, tk).catch(() => { });
    const back = await docRead(pid, 'workshop'), check = verifyScope(back && back.data, plan), id = Date.now().toString(36) + rid('a').slice(2, 6);
    await dbPut('acts.' + pid, id, { by: s.id, at: now(), action: 'scope', summary: plan.summary, before, v, undone: false });
    await audit(pid, s.id, 'action-scope', plan.summary + (check.ok ? ' (verified)' : ' (NOT verified: ' + check.checks.filter(c => !c.ok).map(c => c.what).join(', ') + ')')); await touchProject(pid);
    return { done: true, verified: check.ok, checks: check.checks, undoId: id, version: v, summary: plan.summary, plan: planOut(plan) };
  }
  // tasks in bulk go through the normal task save (validation, notices, version check), one task at a time; the read-back compares every field changed
  const taskUrl = (pid, id) => '/api/projects/' + pid + '/items/task/' + encodeURIComponent(id);
  async function tasksRun(s, pid, b) {
    const { project } = await projectAccess(s, pid, 'edit'), tasks = await itemsOf(pid, 'task'), today = now().slice(0, 10);
    if (!b.token) { const plan = planTasks(tasks, project.members, Object.assign({}, b, { me: s.email }), today); if (!plan.changes) return { dryRun: true, plan, token: null };
      const token = rid('t'); await dbPut('actp.' + pid, token, { by: s.id, at: Date.now(), plan }); return { dryRun: true, plan, token }; }
    const tk = cut(b.token, 60), r = await dbGet('actp.' + pid, tk), t = r && r.value;
    if (!t || t.by !== s.id || Date.now() - t.at > TTL || t.plan.action !== 'tasks') throw new HttpError(409, 'This preview has expired or is not yours. Ask again to see the changes first.');
    const cur = new Map(tasks.map(x => [x.id, x])), stale = t.plan.items.filter(x => !cur.has(x.id) || cur.get(x.id).version !== x.version);
    if (stale.length) throw new HttpError(409, 'The project changed since the preview (' + stale.map(x => x.title).slice(0, 3).join(', ') + '). Ask again to see the changes first.');
    await dbDel('actp.' + pid, tk).catch(() => { }); const done = [], failed = [];
    for (const x of t.plan.items) { try { await viaApp('PUT', taskUrl(pid, x.id), '', { data: Object.assign({}, cur.get(x.id).data, x.to), baseVersion: x.version }); done.push(x); } catch (e) { failed.push(x.title + ': ' + cut(e.message, 120)); } }
    const back = new Map((await itemsOf(pid, 'task')).map(y => [y.id, y])), checks = done.map(x => ({ what: x.title, ok: Object.entries(x.to).every(([k, v]) => String(((back.get(x.id) || {}).data || {})[k] || '') === String(v)) })).concat(failed.map(w => ({ what: w, ok: false })));
    const id = Date.now().toString(36) + rid('a').slice(2, 6), summary = done.length + ' task' + (done.length === 1 ? '' : 's') + ' changed' + (failed.length ? ', ' + failed.length + ' not' : '') + ' (' + t.plan.summary.replace(/^[^:]*: /, '') + ')';
    if (done.length) await dbPut('acts.' + pid, id, { by: s.id, at: now(), action: 'tasks', summary, before: done.map(x => ({ id: x.id, from: x.from })), undone: false });
    await audit(pid, s.id, 'action-tasks', summary + (checks.every(c => c.ok) ? ' (verified)' : ' (NOT verified)'));
    return { done: !!done.length, verified: !failed.length && checks.every(c => c.ok), checks, undoId: done.length ? id : null, summary, plan: t.plan };
  }
  async function addRun(s, pid, b) {
    const { project } = await projectAccess(s, pid, 'edit'), tasks = await itemsOf(pid, 'task');
    if (!b.token) { const st = await state(pid), plan = planAdd(tasks, project.members, st.ws, st.planner, b); if (!plan.changes) return { dryRun: true, plan, token: null };
      const token = rid('t'); await dbPut('actp.' + pid, token, { by: s.id, at: Date.now(), plan }); return { dryRun: true, plan, token }; }
    const tk = cut(b.token, 60), r = await dbGet('actp.' + pid, tk), t = r && r.value;
    if (!t || t.by !== s.id || Date.now() - t.at > TTL || t.plan.action !== 'addtasks') throw new HttpError(409, 'This preview has expired or is not yours. Ask again to see the changes first.');
    await dbDel('actp.' + pid, tk).catch(() => { }); const have = new Set(tasks.map(x => norm(obj(x.data).title))), made = [], failed = [];
    for (const x of t.plan.items) { if (have.has(norm(x.title))) { failed.push(x.title + ': added by someone else meanwhile'); continue; } const id = rid('t');
      try { await viaApp('PUT', taskUrl(pid, id), '', { data: { title: x.title, desc: x.desc, type: t.plan.type, status: x.status, priority: x.priority, owner: x.owner, due: x.due, module: x.module, src: { type: 'import', label: (t.plan.source || 'Tracker') + (x.row ? ', row ' + x.row : '') } }, baseVersion: 0 }); made.push({ id, title: x.title }); }
      catch (e) { failed.push(x.title + ': ' + cut(e.message, 120)); } }
    const back = new Map((await itemsOf(pid, 'task')).map(y => [y.id, y])), checks = made.map(x => ({ what: x.title, ok: obj((back.get(x.id) || {}).data).title === x.title })).concat(failed.map(w => ({ what: w, ok: false })));
    const id = Date.now().toString(36) + rid('a').slice(2, 6), summary = made.length + ' new task' + (made.length === 1 ? '' : 's') + ' from ' + (t.plan.source || 'the tracker') + (failed.length ? ' (' + failed.length + ' not added)' : '');
    if (made.length) await dbPut('acts.' + pid, id, { by: s.id, at: now(), action: 'addtasks', summary, made: made.map(x => ({ id: x.id, v: (back.get(x.id) || {}).version || 1 })), undone: false });
    await audit(pid, s.id, 'action-addtasks', summary + (checks.every(c => c.ok) ? ' (verified)' : ' (NOT verified)'));
    return { done: !!made.length, verified: !failed.length && checks.every(c => c.ok), checks, undoId: made.length ? id : null, summary, plan: t.plan };
  }
  // undo of an import: only tasks nobody changed since are removed; an edited one stays and is named
  async function addUndo(s, pid, id, a) {
    const cur = new Map((await itemsOf(pid, 'task')).map(x => [x.id, x])), kept = [];
    for (const x of a.made) { const c = cur.get(x.id); if (!c) continue; if (c.version !== x.v) { kept.push(obj(c.data).title); continue; } try { await viaApp('DELETE', taskUrl(pid, x.id), '', {}); } catch (e) { kept.push(obj(c.data).title); } }
    const back = new Set((await itemsOf(pid, 'task')).map(x => x.id)), left = a.made.filter(x => back.has(x.id)).length;
    await dbPut('acts.' + pid, id, Object.assign(a, { undone: true, undoneBy: s.id, undoneAt: now() })); await audit(pid, s.id, 'action-undo', 'Undone: ' + a.summary + (kept.length ? ' (' + kept.length + ' edited since, kept)' : ' (verified)'));
    return { done: true, verified: left === kept.length, summary: 'Undone: ' + a.summary + (kept.length ? '. Kept ' + kept.length + ' that were changed since: ' + kept.slice(0, 3).join('; ') : '') };
  }
  async function tasksUndo(s, pid, id, a) {
    const cur = new Map((await itemsOf(pid, 'task')).map(x => [x.id, x])), bad = [];
    for (const x of a.before) { const c = cur.get(x.id); if (!c) { bad.push(x.id); continue; } const data = Object.assign({}, c.data); Object.entries(x.from).forEach(([k, v]) => { if (v === null) delete data[k]; else data[k] = v; });
      try { await viaApp('PUT', taskUrl(pid, x.id), '', { data, baseVersion: c.version }); } catch (e) { bad.push(x.id); } }
    const back = new Map((await itemsOf(pid, 'task')).map(x => [x.id, x])); a.before.forEach(x => { const d = (back.get(x.id) || {}).data || {}; if (Object.entries(x.from).some(([k, v]) => String(d[k] == null ? '' : d[k]) !== String(v == null ? '' : v)) && !bad.includes(x.id)) bad.push(x.id); });
    await dbPut('acts.' + pid, id, Object.assign(a, { undone: true, undoneBy: s.id, undoneAt: now() })); await audit(pid, s.id, 'action-undo', 'Undone: ' + a.summary + (bad.length ? ' (NOT verified for ' + bad.length + ')' : ' (verified)'));
    return { done: true, verified: !bad.length, summary: 'Undone: ' + a.summary };
  }
  async function undo(s, pid, b) {
    const id = cut(b.id, 40), r = await dbGet('acts.' + pid, id), a = r && r.value; if (!a) throw new HttpError(404, 'No action with that id.'); if (a.undone) throw new HttpError(409, 'That change was already undone.');
    if (a.action === 'tasks') return tasksUndo(s, pid, id, a);
    if (a.action === 'addtasks') return addUndo(s, pid, id, a);
    const st = await state(pid), v = await docWrite(s, pid, 'workshop', restore(st.ws, a.before), st.v), back = await docRead(pid, 'workshop'), check = verifyRestore(back && back.data, a.before);
    await dbPut('acts.' + pid, id, Object.assign(a, { undone: true, undoneBy: s.id, undoneAt: now() })); await audit(pid, s.id, 'action-undo', 'Undone: ' + a.summary + (check.ok ? ' (verified)' : ' (NOT verified)')); await touchProject(pid);
    return { done: true, verified: check.ok, version: v, summary: 'Undone: ' + a.summary };
  }
  route('POST', '/api/projects/:id/actions/:name', async (b, P) => { const s = await me(); return ok(await run(s, P.id, P.name, b || {})); });
  const changesRead = CONNECTOR.project_changes;   // project_changes without action stays the read of what changed
  CONNECTOR.project_changes = (s, b) => (b && b.action ? actionsTool(s, b) : changesRead(s, b));
  async function actionsTool(s, b) {
    const p = await pickProject(s, b.project), name = cut(b.action || 'scope', 20);
    const token = b.token ? cut(b.token, 60) : undefined;
    const body = name === 'scope' ? { modules: arr(b.modules).slice(0, 30).map(x => cut(x, 80)), inScope: b.inScope, flows: b.flows, requirements: b.requirements === 'out' ? 'out' : undefined, token }
      : name === 'tasks' ? { filter: obj(b.filter), set: obj(b.set), token }
      : name === 'addtasks' ? { rows: arr(b.rows).slice(0, 500), type: b.type, source: b.source, token } : { id: b.id };
    const out = await viaApp('POST', '/api/projects/' + p.id + '/actions/' + encodeURIComponent(name), '', body);
    return Object.assign({ project: p.name }, out, out.dryRun ? { note: out.token ? 'Nothing is changed yet. Show the person the plan (summary, consequences, unknown names) and ask them. Only after a clear yes, call again with the same arguments and this token. Flows of the imported configuration are queued and switched off when a team member next opens the project; say so.' : 'Nothing to change.' } : ['history', 'check'].includes(name) ? {} : { note: out.verified ? 'Saved and read back. Tell the person in one line, with Undo (action undo, id ' + (out.undoId || '') + ').' : 'Saved but the read-back did not match: tell the person and do not claim it is done.' });
  }
}
