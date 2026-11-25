/* Project actions: changes the in-app Assistant and a person's own Claude (connector tool project_changes with an action) make for them. Plan: docs/plans/ASSISTANT-ACTIONS-PLAN-2026-11-25.md.
   Every action is two calls. A dry run returns the plan (what changes, what depends on it, what it means) and a token; nothing is written. The real run needs that token
   (so only a previewed, confirmed plan runs), checks the project did not change since, writes, reads the record back to verify, keeps the old values for Undo and writes an audit line.
   Access is the person's own (edit). The pure parts (plan, apply, verify, snapshot, restore) are tested in tests/project_actions.mjs. */
const arr = v => (Array.isArray(v) ? v : []);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const cut = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sing = s => s.replace(/ies$/, 'y').replace(/(ses|xes)$/, s => s.slice(0, -2)).replace(/s$/, '');
export const ACTIONS = ['scope', 'undo', 'history', 'check'];

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
  const reqs = arr(ws.requirements).filter(r => r && r.status !== 'Rejected'), deps = {};
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
  modules.filter(m => !m.change).forEach(m => consequences.push(m.label + ' is already ' + (inScope ? 'in' : 'out of') + ' scope.'));
  const changes = moved.length + flows.length;
  const summary = changes ? [moved.length ? (inScope ? 'In scope: ' : 'Out of scope: ') + moved.map(m => m.label).join(', ') : '', flows.length ? flows.length + ' state flow' + (flows.length > 1 ? 's' : '') + ' switched ' + (flowsMode === 'on' ? 'on' : 'off') : ''].filter(Boolean).join('; ') : 'Nothing to change';
  return { action: 'scope', inScope, flowsMode, modules, flows, hidden, unknown, deps, consequences, changes, summary, kind: 'reversible', destructive: false, reversible: true };
}
/** the old values of everything the plan touches, for Undo: only the scope switch and the flow switch, so later edits elsewhere survive an undo */
export function snapshot(ws, plan) {
  ws = obj(ws); const mods = {}, flows = {};
  plan.modules.filter(m => m.change).forEach(m => { const w = obj(ws.modules)[m.name]; mods[m.name] = w && w.inScope !== undefined ? { inScope: !!w.inScope } : { unset: true }; });
  plan.flows.forEach(f => { const x = obj(ws.flows)[f.id]; flows[f.id] = x ? { enabled: x.enabled } : { absent: true }; });
  return { modules: mods, flows };
}
export function applyScope(ws, plan) {
  const out = JSON.parse(JSON.stringify(obj(ws))); out.modules = obj(out.modules); out.flows = obj(out.flows);
  plan.modules.filter(m => m.change).forEach(m => { out.modules[m.name] = Object.assign(obj(out.modules[m.name]), { inScope: plan.inScope }); });
  plan.flows.forEach(f => { if (!out.flows[f.id]) out.flows[f.id] = Object.assign(JSON.parse(JSON.stringify(f.model)), { workshopCopy: true }); out.flows[f.id].enabled = f.to === 'on'; });
  return out;
}
/** read back: every planned switch holds in the saved record */
export function verifyScope(ws, plan) {
  ws = obj(ws); const checks = [];
  plan.modules.filter(m => m.change).forEach(m => checks.push({ what: m.label + (plan.inScope ? ' in scope' : ' out of scope'), ok: obj(obj(ws.modules)[m.name]).inScope === plan.inScope }));
  plan.flows.forEach(f => { const x = obj(obj(ws.flows)[f.id]); checks.push({ what: 'State flow "' + f.name + '" ' + f.to, ok: !!x.id && (x.enabled !== false) === (f.to === 'on') }); });
  return { ok: checks.every(c => c.ok), checks };
}
export function restore(ws, snap) {
  const out = JSON.parse(JSON.stringify(obj(ws))); out.modules = obj(out.modules); out.flows = obj(out.flows);
  Object.entries(obj(snap.modules)).forEach(([n, v]) => { const w = obj(out.modules[n]); if (v.unset) delete w.inScope; else w.inScope = v.inScope; out.modules[n] = w; });
  Object.entries(obj(snap.flows)).forEach(([id, v]) => { if (v.absent) delete out.flows[id]; else if (out.flows[id]) { if (v.enabled === undefined) delete out.flows[id].enabled; else out.flows[id].enabled = v.enabled; } });
  return out;
}
export function verifyRestore(ws, snap) {
  ws = obj(ws); const bad = [];
  Object.entries(obj(snap.modules)).forEach(([n, v]) => { const w = obj(obj(ws.modules)[n]); if (v.unset ? w.inScope !== undefined : w.inScope !== v.inScope) bad.push(n); });
  Object.entries(obj(snap.flows)).forEach(([id, v]) => { const x = obj(obj(ws.flows)[id]); if (v.absent ? !!obj(ws.flows)[id] : x.enabled !== v.enabled) bad.push(id); });
  return { ok: !bad.length, bad };
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
    if (name !== 'scope') throw new HttpError(404, 'Unknown action "' + cut(name, 30) + '". Actions: ' + ACTIONS.join(', ') + '.');
    const st = await state(pid);
    if (!b.token) {   // dry run: nothing is written
      const plan = planScope(st.ws, st.planner, b, st.kpis); if (!plan.changes) return { dryRun: true, plan: planOut(plan), token: null };
      const token = rid('t'); await dbPut('actp.' + pid, token, { by: s.id, at: Date.now(), v: st.v, plan }); return { dryRun: true, plan: planOut(plan), token };
    }
    const tk = cut(b.token, 60), r = await dbGet('actp.' + pid, tk), t = r && r.value;
    if (!t || t.by !== s.id || Date.now() - t.at > TTL) throw new HttpError(409, 'This preview has expired or is not yours. Ask again to see the changes first.');
    if (t.v !== st.v) throw new HttpError(409, 'The project changed since the preview. Ask again to see the changes first.');
    const plan = t.plan, before = snapshot(st.ws, plan), v = await docWrite(s, pid, 'workshop', applyScope(st.ws, plan), st.v);
    await dbDel('actp.' + pid, tk).catch(() => { });
    const back = await docRead(pid, 'workshop'), check = verifyScope(back && back.data, plan), id = Date.now().toString(36) + rid('a').slice(2, 6);
    await dbPut('acts.' + pid, id, { by: s.id, at: now(), action: 'scope', summary: plan.summary, before, v, undone: false });
    await audit(pid, s.id, 'action-scope', plan.summary + (check.ok ? ' (verified)' : ' (NOT verified: ' + check.checks.filter(c => !c.ok).map(c => c.what).join(', ') + ')')); await touchProject(pid);
    return { done: true, verified: check.ok, checks: check.checks, undoId: id, version: v, summary: plan.summary, plan: planOut(plan) };
  }
  async function undo(s, pid, b) {
    const id = cut(b.id, 40), r = await dbGet('acts.' + pid, id), a = r && r.value; if (!a) throw new HttpError(404, 'No action with that id.'); if (a.undone) throw new HttpError(409, 'That change was already undone.');
    const st = await state(pid), v = await docWrite(s, pid, 'workshop', restore(st.ws, a.before), st.v), back = await docRead(pid, 'workshop'), check = verifyRestore(back && back.data, a.before);
    await dbPut('acts.' + pid, id, Object.assign(a, { undone: true, undoneBy: s.id, undoneAt: now() })); await audit(pid, s.id, 'action-undo', 'Undone: ' + a.summary + (check.ok ? ' (verified)' : ' (NOT verified)')); await touchProject(pid);
    return { done: true, verified: check.ok, version: v, summary: 'Undone: ' + a.summary };
  }
  route('POST', '/api/projects/:id/actions/:name', async (b, P) => { const s = await me(); return ok(await run(s, P.id, P.name, b || {})); });
  const changesRead = CONNECTOR.project_changes;   // project_changes without action stays the read of what changed
  CONNECTOR.project_changes = (s, b) => (b && b.action ? actionsTool(s, b) : changesRead(s, b));
  async function actionsTool(s, b) {
    const p = await pickProject(s, b.project), name = cut(b.action || 'scope', 20);
    const body = name === 'scope' ? { modules: arr(b.modules).slice(0, 30).map(x => cut(x, 80)), inScope: b.inScope, flows: b.flows, token: b.token ? cut(b.token, 60) : undefined } : { id: b.id };
    const out = await viaApp('POST', '/api/projects/' + p.id + '/actions/' + encodeURIComponent(name), '', body);
    return Object.assign({ project: p.name }, out, out.dryRun ? { note: out.token ? 'Nothing is changed yet. Show the person the plan (summary, consequences, unknown names) and ask them. Only after a clear yes, call again with the same arguments and this token. A flow that is only in the imported configuration can be switched off from the Assistant inside the Studio.' : 'Nothing to change.' } : ['history', 'check'].includes(name) ? {} : { note: out.verified ? 'Saved and read back. Tell the person in one line, with Undo (action undo, id ' + (out.undoId || '') + ').' : 'Saved but the read-back did not match: tell the person and do not claim it is done.' });
  }
}
