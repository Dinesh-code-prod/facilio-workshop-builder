/* Import state flow XML (one or more STATE_FLOW / STATE_TRANSITION / TICKET_STATUS files, or a package ZIP) for a module.
   The flow is rebuilt in the State Flow Builder exactly as the XML defines it: same states and positions, same transitions,
   performers, conditions, actions and portal flags. It is added as a proposed stateflow, so the team can edit it, and the
   BRD (built from the workshop changes) follows every edit. The source configuration is never changed. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const ACT = V.ACT; const P = root.FWBParser;
  const { tag, sel, drawer, closeDrawer, toast, confirmDialog, loading } = V; const modLabel = n => n ? ((F.moduleView(n) || {}).label || humanize(n)) : '';
  let pending = null; // parsed upload awaiting confirmation

  async function readFiles(files) {
    const named = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) { for (const x of await V.zipTexts(f, n => /\.xml$/i.test(n) && !/PackageConf\.xml$/i.test(n))) named.push({ name: f.name + ' › ' + x.name.replace(/^.*\//, ''), text: x.text }); }
      else named.push({ name: f.name, text: await f.text() });
    }
    return named;
  }

  ACT.fiOpen = async a => {
    if (S.readonly) { toast('You have read-only access to this project'); return; }
    const files = await V.pickFile('.xml,.zip', true); if (!files.length) return;
    loading(true, 'Reading the state flow files…');
    try {
      const named = await readFiles(files); const r = P.parseFlowFiles(named, { DOMParser: root.DOMParser });
      pending = { r, module: a && a.getAttribute && a.getAttribute('data-module') || S.ui.flowModule || '', names: named.map(n => n.name) };
      showPreview();
    } catch (e) { toast('These files could not be read: ' + e.message, 6000, true); } finally { loading(false); }
  };

  function showPreview() {
    const { r } = pending;
    if (r.errors.length && !r.flows.length) { drawer('Import state flow', `<div class="notice err"><div><b>Nothing could be imported.</b></div></div>${r.errors.map(e => `<div class="small" style="margin-top:6px">${e.file ? '<b>' + esc(e.file) + '</b>: ' : ''}${esc(e.msg)}</div>`).join('')}<p class="small muted" style="margin-top:12px">Upload the STATE_FLOW and STATE_TRANSITION files (and TICKET_STATUS for the state names), or a Facilio org package ZIP.</p>`, `<button class="btn" data-act="closeDrawer">Close</button>`); return; }
    const mods = F.allModules().slice().sort((p, q) => p.label.localeCompare(q.label)); // any module of the project: system modules keep their names across orgs, custom ones are mapped by hand
    const xmlMods = r.modules; const target = pending.module && xmlMods.includes(pending.module) ? pending.module : (xmlMods.length === 1 ? xmlMods[0] : (xmlMods.find(m => m === pending.module) || xmlMods[0] || ''));
    pending.xmlModule = target; pending.target = pending.target || (F.moduleView(target) ? target : pending.module) || target;
    const flows = r.flows.filter(f => f.module === pending.xmlModule);
    pending.sel = pending.sel || {}; flows.forEach(f => { if (pending.sel[f.id] === undefined) pending.sel[f.id] = f.transitions.length > 0; });
    const tgtKnown = !!F.moduleView(pending.target);
    const relevantWarn = r.warnings.filter(w => !w.file && /^Stateflow "/.test(w.msg) ? flows.some(f => w.msg.indexOf('(' + f.module + ')') >= 0) : true);
    drawer('Import state flow from XML', `<div class="small muted" style="margin-bottom:10px">${esc(pending.names.join(', '))} — ${r.counts.flows} stateflow(s), ${r.counts.transitions} transition(s) and ${r.counts.statuses} state(s) found for ${xmlMods.length} module(s).</div>
      ${xmlMods.length > 1 ? `<label class="f">Module in the XML</label>${sel('', xmlMods.slice().sort((a, b) => modLabel(a).localeCompare(modLabel(b))).map(m => ({ v: m, l: modLabel(m) + ' (' + m + ')' })), pending.xmlModule, 'id="fi_xml" data-change="fiXml"')}` : `<div class="small"><b>Module in the XML:</b> ${esc(modLabel(pending.xmlModule))} <span class="mono xs">${esc(pending.xmlModule)}</span></div>`}
      <label class="f" style="margin-top:10px">Build it for this module in the project</label>${sel('', mods.map(x => ({ v: x.name, l: x.label + (x.custom ? ' (custom)' : '') })), tgtKnown ? pending.target : '', 'id="fi_tgt" data-change="fiTgt"')}
      ${F.moduleView(pending.xmlModule) && pending.target === pending.xmlModule ? '' : `<div class="notice warn" style="margin:8px 0"><span>${F.moduleView(pending.xmlModule) ? 'The flow will be built for a different module than the one in the XML.' : `The XML's module <b>${esc(pending.xmlModule)}</b> is not in this project (custom module names differ between orgs; system modules keep the same name in every org).`} Check the module below${tgtKnown ? '' : ' — pick the one this flow belongs to'}.</span></div>`}
      <div class="pink-label">Stateflows to import</div>
      ${flows.map(f => `<label class="chk" style="display:flex;gap:8px;margin-bottom:6px"><input type="checkbox" data-change="fiPick" data-id="${esc(f.id)}" ${pending.sel[f.id] ? 'checked' : ''}><span><b>${esc(f.name)}</b> ${f.isDefault ? tag('blue', 'Default') : ''} ${f.enabled ? '' : tag('low', 'Disabled')}<div class="xs muted">${f.transitions.length} transition(s) · starts in ${esc(f.initialState || '—')}${f.criteria && f.criteria.text ? ' · applies when ' + esc(f.criteria.text) : ''}</div></span></label>`).join('') || '<div class="empty small">No stateflow for this module in the files.</div>'}
      ${r.errors.length ? `<div class="notice err" style="margin-top:10px"><div>${r.errors.map(e => (e.file ? '<b>' + esc(e.file) + '</b>: ' : '') + esc(e.msg)).join('<br>')}</div></div>` : ''}
      ${relevantWarn.length ? `<div class="notice warn" style="margin-top:10px"><div><b>Check before importing</b><br>${relevantWarn.slice(0, 8).map(w => esc((w.file ? w.file + ': ' : '') + w.msg)).join('<br>')}</div></div>` : ''}
      <div class="xs muted" style="margin-top:10px">The flow is added as a <b>proposed</b> stateflow built exactly as the XML defines it. The project's own configuration is not changed. Edit it in the State Flow Builder; the BRD follows your edits.</div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="fiApply" ${tgtKnown && flows.some(f => pending.sel[f.id]) ? '' : 'disabled'}>Import</button>`);
  }
  ACT.fiXml = el => { pending.xmlModule = el.value; pending.module = el.value; pending.target = F.moduleView(el.value) ? el.value : ''; pending.sel = null; showPreview(); };
  ACT.fiTgt = el => { pending.target = el.value; showPreview(); };
  ACT.fiPick = el => { pending.sel[el.getAttribute('data-id')] = el.checked; showPreview(); };

  // Build the workshop flow from one parsed flow (pure given the project state; used by the UI and by tests)
  function buildFlow(r, f, target, srcNames) {
    const m = F.baselineFlowModel(f, r.mini); const id = target + '::imported_' + Math.random().toString(36).slice(2, 7);
    const st = r.statuses[f.module] || []; const org = r.statuses['(org-level)'] || []; const info = n => st.concat(org).find(x => x.name === n || x.name.toLowerCase() === String(n).toLowerCase() || x.label.toLowerCase() === String(n).toLowerCase());
    const have = n => { const l = (S.baseline && S.baseline.statuses[target]) || []; return l.find(x => x.name.toLowerCase() === String(n).toLowerCase() || x.label.toLowerCase() === String(n).toLowerCase()); };
    m.states.forEach(s => { const i = info(s.name) || {}; if (i.typeCode) s.typeCode = i.typeCode; if (i.locked !== undefined) s.locked = !!i.locked; if (i.timer !== undefined) s.pauseTimer = i.timer === false; s.origin = have(s.name) ? 'baseline' : 'proposed'; });
    const roleIds = {}; // actor ids from the other org -> actors of this project (same role name), or a proposed role
    const mapActor = a => {
      if (!/^role:/.test(a.actor)) return a; if (roleIds[a.actor]) return Object.assign({}, a, { actor: roleIds[a.actor] });
      const name = a.actor.replace(/^role:/, '').replace(/@.*$/, ''); const hit = F.allActors().find(x => x.roleName === name && x.category === 'internal') || F.allActors().find(x => x.roleName === name);
      if (hit) { roleIds[a.actor] = hit.id; return Object.assign({}, a, { actor: hit.id }); }
      let pr = S.ws.roles.find(x => x.label === name); if (!pr) { pr = { id: 'prole_' + F.slug(name), label: name, category: 'internal', description: 'Role used by the imported state flow "' + f.name + '"; not found in this project\'s configuration. Confirm or map it.' }; S.ws.roles.push(pr); }
      roleIds[a.actor] = pr.id; return Object.assign({}, a, { actor: pr.id });
    };
    m.transitions.forEach(t => { t.id = F.uid('t'); t.baselineId = null; t.origin = 'proposed'; t.actors = (t.actors || []).map(mapActor); t.imported = true; });
    Object.assign(m, { id, module: target, name: f.name, description: f.description || ('Imported from ' + srcNames.join(', ')), origin: 'proposed', workshopCopy: true, enabled: f.enabled !== false, isDefault: false, baseFlowId: null,
      imported: { from: srcNames, xmlModule: f.module, link: f.link, at: new Date().toISOString(), by: S.user && S.user.name, sourceDefault: !!f.isDefault } });
    return m;
  }
  V.flowImportBuild = buildFlow;

  ACT.fiApply = () => {
    if (!pending) return; const { r } = pending; const flows = r.flows.filter(f => f.module === pending.xmlModule && pending.sel[f.id]); if (!flows.length || !F.moduleView(pending.target)) return;
    let last = null; flows.forEach(f => { const m = buildFlow(r, f, pending.target, pending.names); S.ws.flows[m.id] = m; last = m; });
    F.changed('Stateflow imported from XML', flows.map(f => f.name).join(', ') + ' → ' + modLabel(pending.target)); const n = flows.length; pending = null; closeDrawer(); toast(n + ' stateflow(s) imported as proposed. Edit them here; the BRD follows.'); V.go('flow', { flowId: last.id, selected: null });
  };
})(typeof window !== 'undefined' ? window : globalThis);
