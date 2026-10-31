/* Org Package Export page (3. Solution Design & Configuration › Validation & Traceability).
   Gathers the project's configuration (new custom modules and fields, new state flows, states and transitions) with the requirements behind it,
   shows what is ready, what is a draft, what cannot be exported yet and why, then builds a Facilio-style package ZIP (src/orgpkg.js), re-opens it,
   checks it structurally and only then offers the download. The traceability report is a separate download: nothing extra goes inside the package.
   Nothing here touches a live Facilio organisation. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const O = () => root.FWBOrgPkg;
  const { tag, toast, ico } = V;
  const can = () => !V.isCustomer() && !S.readonly;
  const U = () => (S.ui.opk = S.ui.opk || { drafts: false, closed: [], off: [], last: null });

  // ---------- the project's configuration, in the exporter's terms ----------
  function collect() {
    const B = S.baseline; const meta = (B && B.meta) || {}; const reqs = S.ws.requirements || [];
    const srcFor = (pred) => ({ reqs: reqs.filter(pred).map(r => ({ id: r.id, status: r.status || 'Draft' })) });
    const modules = {}; Object.values((B && B.modules) || {}).forEach(m => { modules[m.name] = { uid: (m.ref && m.ref.uid) || '', label: m.label, fields: (m.fields || []).map(f => f.name), statuses: ((B.statuses || {})[m.name] || []).map(s => ({ name: s.name, label: s.label, typeCode: s.typeCode, uid: (s.ref && s.ref.uid) || '' })), flows: (B.flows || []).filter(f => f.module === m.name).map(f => ({ name: f.name, link: f.link })) }; });
    const newModules = (S.ws.customModules || []).filter(m => !modules[m.name]).map(m => ({ name: m.name, label: m.label, description: m.description || '', stateflow: Object.values(S.ws.flows || {}).some(f => f.module === m.name), src: srcFor(r => (r.modules || []).includes(m.name)) }));
    const newFields = []; const changes = [];
    Object.entries(S.ws.fieldOps || {}).forEach(([mod, o]) => {
      (o.add || []).forEach(f => newFields.push({ module: mod, name: f.name, label: f.label, type: f.type, required: !!f.required, mainField: !!f.mainField, options: (f.options || []).map(x => (typeof x === 'string' ? x : x.value)).filter(Boolean), lookup: f.lookup || '', src: srcFor(r => (r.fields || []).includes(mod + '.' + f.name)) }));
      Object.entries(o.modify || {}).forEach(([fn, ch]) => changes.push({ area: 'Field change', item: (F.moduleView(mod) || {}).label + ' › ' + F.fieldLabel(mod, fn), detail: 'Change ' + Object.keys(ch).filter(k => k !== 'description').join(', ') + ' on an existing field. Only new records are in the package; make this change by hand.' }));
      (o.remove || []).forEach(fn => changes.push({ area: 'Field removal', item: (F.moduleView(mod) || {}).label + ' › ' + F.fieldLabel(mod, fn), detail: 'Proposed removal from use. Not in the package; do it by hand after checking where the field is used.' }));
    });
    Object.values(S.ws.formOps || {}).forEach(fo => changes.push({ area: 'Form layout', item: (F.moduleView(fo.module) || {}).label + ' › ' + (fo.label || fo.name), detail: 'Form layouts are not exported yet (FORM, FORM_SECTION and FORM_FIELDS need the form identifiers of the target organisation). Arrange the form by hand from the System Modules & Form Builder.' }));
    (S.ws.roles || []).forEach(r => changes.push({ area: 'Role', item: r.label, detail: 'Proposed role. Roles and permissions are not exported; create the role and its permissions by hand from Roles & Access Permissions.' }));
    const flows = [];
    Object.values(S.ws.flows || {}).forEach(fl => {
      const isNew = fl.origin === 'proposed'; const extras = t => [].concat(t.actors && t.actors.length ? ['who can use it: ' + t.actors.map(a => F.actorLabel(a.actor)).join(', ')] : [], t.approval && t.approval.required ? ['approval required'] : [], (t.actions && t.actions.length) ? ['actions: ' + (Array.isArray(t.actions) ? t.actions.join('; ') : t.actions)] : [], (t.notifications || []).length ? ['notifications to: ' + t.notifications.join(', ')] : [], (t.fieldUpdates || []).length ? ['field updates: ' + t.fieldUpdates.join('; ')] : []);
      const trs = (fl.transitions || []).filter(t => !t.removed && (isNew || t.origin === 'proposed'));
      if (!isNew) { const d = F.flowDiff(fl.id); (d && d.changes || []).filter(c => c.kind !== 'added').forEach(c => changes.push({ area: 'State flow change', item: fl.name + ' › ' + c.what + ' ' + c.name, detail: (c.kind === 'removed' ? 'Remove' : 'Change' + (c.detail ? ' (' + c.detail + ')' : '')) + ': not in the package; do it by hand.' })); }
      if (!isNew && !trs.length && !(fl.states || []).some(s => s.origin === 'proposed')) return;
      flows.push({ key: fl.id, module: fl.module, name: fl.name, link: (B && (B.flows || []).find(x => x.id === fl.id) || {}).link || '', description: fl.description || '', criteria: fl.criteria || '', initial: fl.initial, isNew,
        states: (fl.states || []).map(s => ({ id: s.id, name: s.origin === 'baseline' ? s.name : '', label: s.label })),
        transitions: trs.map(t => ({ id: t.id, name: t.name, from: t.from, to: t.to, type: t.type, condition: t.condition || '', commentRequired: !!t.commentRequired, buttonType: t.buttonType, portals: t.portals || [], enabled: t.enabled, extras: extras(t), src: srcFor(r => (r.transitions || []).includes(t.id)) })),
        src: srcFor(r => (r.transitions || []).some(id => (fl.transitions || []).some(t => t.id === id))) });
    });
    const so = V.signoffStatus ? V.signoffStatus('brd') : { status: 'notdue' };
    const notifications = (S.ws.notifications || []).map(n => ({ id: n.id, name: n.name, module: n.module, trigger: n.trigger, state: n.state || '', channels: n.channels || {}, recipients: n.recipients || [], toField: n.toField || '', subject: n.subject || '', message: n.message || '', status: n.status === 'off' ? 'off' : 'on', note: n.note || '', src: srcFor(r => (n.reqs || []).includes(r.id)) }));
    const crs = (I().ready(['cr']) ? I().list('cr') : []).slice().sort((a, b) => (a.n || 0) - (b.n || 0)).map(c => ({ n: c.n, title: c.title || c.change || c.text || c.summary || '', status: c.status || 'Requested' }));
    const byStatus = {}; reqs.forEach(r => { const k = r.status || 'Draft'; byStatus[k] = (byStatus[k] || 0) + 1; });
    return { orgId: meta.orgId || '', packageName: meta.packageName || '', reference: !(F.doc('config') && F.doc('config').source === 'imported'), brdSigned: so.status === 'signed', signoff: { status: so.status, signer: so.signer || '', signedAt: so.signedAt || '' }, reqSummary: { total: reqs.length, byStatus }, crs, notifications, modules, newModules, newFields, flows, changes };
  }
  function run(model) { const u = U(); return O().build(model, { includeDrafts: u.drafts, closedStates: new Set(u.closed), selected: null, now: Date.now() }); }

  const ST = { ready: ['green', 'Ready'], draft: ['tbc', 'Draft: BRD not signed off'], clarify: ['tbc', 'Awaiting clarification'], blocked: ['red', 'Blocked: requirement rejected'], unsupported: ['low', 'Not exportable yet'], error: ['red', 'Error'] };
  V.orgpkg = {
    html() {
      I().load(['signoff', 'cr']); if (!S.baseline) return '<div class="page-body"><div class="empty">Configuration not loaded.</div></div>';
      const model = collect(); const res = run(model); const u = U(); const items = res.items.filter(i => !u.off.includes(i.key));
      const inc = res.items.filter(i => i.included && !u.off.includes(i.key)); const count = T => res.items.filter(i => i.type === T).length;
      const head = `<div class="page-header"><div class="t"><h1>Org Package Export</h1><p>Turn this project's approved configuration into a package in the Facilio organisation format, for the Org Builder skill (or a person) to implement in the organisation and validate there. Delivery Studio never changes a live organisation. Only new records are packaged; changes to existing configuration, roles and form layouts are listed as manual steps.</p></div><div class="row">${can() ? `<button class="btn" data-act="opkReport">${ico('dl')}Report</button><button class="btn primary" data-act="opkZip"${inc.length ? '' : ' disabled'}>${ico('dl')}Download package</button>` : ''}</div></div>`;
      const facts = `<div class="grid g4" style="margin-bottom:14px"><div class="card stat"><div class="v">${inc.length}</div><div class="l">In the package</div></div><div class="card stat"><div class="v">${res.items.filter(i => i.readiness === 'draft' || i.readiness === 'clarify').length}</div><div class="l">Drafts / to clarify</div></div><div class="card stat${res.items.some(i => i.readiness === 'error' || i.readiness === 'blocked') ? ' bad' : ''}"><div class="v">${res.items.filter(i => i.readiness === 'error' || i.readiness === 'blocked').length}</div><div class="l">Errors / blocked</div></div><div class="card stat"><div class="v">${res.manual.length}</div><div class="l">Manual steps</div></div></div>`;
      const org = `<div class="notice${model.reference ? ' warn' : ''}" style="margin-bottom:10px"><span>Organisation <b>${esc(model.orgId || 'unknown')}</b> · package <span class="mono">${esc(model.packageName || 'unknown')}</span>. ${model.reference ? 'This project uses the bundled Facilio reference configuration, not the customer\'s own package: module identifiers point to that org. Import the customer\'s package in Configuration Inputs before exporting for their org.' : 'Module identifiers come from this organisation package.'}</span></div>
        <div class="notice${model.brdSigned ? ' ok' : ' warn'}" style="margin-bottom:14px"><span>${model.brdSigned ? 'The BRD is signed off: components behind it are ready.' : '<b>The BRD is not signed off</b>, so every component is a draft. Drafts are left out unless you include them; the package is then named DRAFT_.'} ${can() ? `<label class="chk" style="margin-left:8px"><input type="checkbox" data-change="opkDrafts"${u.drafts ? ' checked' : ''}> Include drafts</label>` : ''}</span></div>`;
      const row = i => { const st = ST[i.readiness] || ['low', i.readiness]; const why = [].concat(i.errors || [], i.unsupported ? [i.unsupported] : []); const reqs = ((i.src || {}).reqs || []).map(r => esc(r.id) + ' <span class="xs muted">' + esc(r.status) + '</span>').join(', ');
        const pick = i.rec && (i.readiness === 'ready' || (u.drafts && (i.readiness === 'draft' || i.readiness === 'clarify')));
        const closed = i.needsChoice ? `<label class="chk xs opk-cl" title="Closed states end the record's life cycle (typeCode 2 in the package)"><input type="checkbox" data-change="opkClosed" data-k="${esc(i.needsChoice.flow + '|' + i.needsChoice.state)}"${i.needsChoice.closed ? ' checked' : ''}${can() ? '' : ' disabled'}> closed state</label>` : '';
        return `<tr><td>${pick && can() ? `<input type="checkbox" data-change="opkPick" data-k="${esc(i.key)}" aria-label="Include ${esc(i.name)}"${u.off.includes(i.key) ? '' : ' checked'}>` : ''}</td><td class="small"><b>${esc(i.name)}</b>${i.auto ? '<div class="xs muted">added because another component needs it</div>' : ''}${closed}</td><td class="small mono">${esc(i.type)}</td><td class="small">${esc(V.modLabel(i.module))}</td><td>${tag(st[0], st[1])}</td><td class="small">${reqs || '<span class="muted">none recorded</span>'}</td><td class="xs">${why.map(esc).join('<br>')}</td></tr>`; };
      const table = `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Components (${res.items.length})</h3><span class="xs muted">${['MODULE', 'FIELD', 'TICKET_STATUS', 'STATE_FLOW', 'STATE_TRANSITION', 'NOTIFICATION'].map(T => T + ' ' + count(T)).join(' · ')}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Component</th><th>Type</th><th>Module</th><th>Status</th><th>Source requirements</th><th>Issues</th></tr></thead><tbody>${res.items.map(row).join('') || '<tr><td colspan="7" class="muted" style="padding:16px">Nothing new to package yet. New custom modules, fields and state flows made in System Modules & Form Builder and State Flow Builder appear here.</td></tr>'}</tbody></table></div></div>`;
      const manual = `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Manual implementation steps (${res.manual.length})</h3></div>${res.manual.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Area</th><th>Item</th><th>What to do</th></tr></thead><tbody>${res.manual.map(m => `<tr><td class="small">${esc(m.area || '')}</td><td class="small"><b>${esc(m.item || '')}</b></td><td class="small">${esc(m.detail)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card-b small muted">None.</div>'}</div>`;
      const warn = `<div class="card"><div class="card-h"><h3>Warnings and what still needs confirming</h3></div><div class="card-b"><ul class="small" style="margin:0;padding-left:18px">${res.warnings.concat(res.missing).map(w => `<li><b>${esc(w.item)}</b>: ${esc(w.detail)}</li>`).join('')}<li><b>Import</b>: the package passes a structural check here (every file parses, references resolve, identifiers are unique). It has not been imported into a Facilio organisation; the Org Builder skill's own input requirements were not available to Delivery Studio.</li></ul>${u.last ? `<p class="small" style="margin-top:10px">Last package: <span class="mono">${esc(u.last.name)}</span> · ${esc(u.last.summary)}</p>` : ''}</div></div>`;
      return head + `<div class="page-body">${facts}${org}${table}${manual}${warn}</div>`;
    },
    mount() { I().load(['signoff']); }
  };
  ACT.opkDrafts = el => { U().drafts = el.checked; V.render(); };
  ACT.opkClosed = el => { const u = U(); const k = el.getAttribute('data-k'); u.closed = el.checked ? u.closed.concat(k) : u.closed.filter(x => x !== k); V.render(); };
  ACT.opkPick = el => { const u = U(); const k = el.getAttribute('data-k'); u.off = el.checked ? u.off.filter(x => x !== k) : u.off.concat(k); V.render(); };
  function current() { const model = collect(); const u = U(); const all = O().build(model, { includeDrafts: u.drafts, closedStates: new Set(u.closed), now: Date.now() }); const sel = new Set(all.items.filter(i => i.included && !u.off.includes(i.key)).map(i => i.key)); return { model, res: O().build(model, { includeDrafts: u.drafts, closedStates: new Set(u.closed), selected: sel, now: Date.now() }) }; }
  ACT.opkZip = a => V.busy(a, async () => {
    const { model, res } = current(); if (!res.items.some(i => i.included)) { toast('Nothing is selected for the package', 5000, true); return; }
    const pre = O().verify(res.files, model, root.DOMParser); if (!pre.ok) { toast('The package failed its structural check, so it was not downloaded: ' + pre.errors.slice(0, 2).join('; '), 9000, true); return; }
    await V.loadScript('vendor/jszip.min.js'); const z = new root.JSZip(); Object.entries(res.files).forEach(([k, v]) => z.file(k, v)); z.folder('metafiles');
    const blob = await z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    // open the ZIP that will be downloaded and check it again: every listed file present and parsing, nothing extra
    const back = await root.JSZip.loadAsync(blob); const names = Object.keys(back.files).filter(k => !back.files[k].dir); const again = {}; for (const k of names) again[k] = await back.file(k).async('string');
    const post = O().verify(again, model, root.DOMParser); const extra = names.filter(k => !res.files[k]);
    if (!post.ok || extra.length || names.length !== Object.keys(res.files).length) { toast('The ZIP did not match what was built, so it was not downloaded.', 8000, true); return; }
    V.download(res.name + '.zip', blob, 'application/zip');
    U().last = { name: res.name + '.zip', summary: Object.entries(res.counts).map(([k, v]) => v + ' ' + k).join(', ') + ' · structural check passed (' + post.checked + ' records)' + (res.draft ? ' · DRAFT' : '') };
    toast('Package downloaded. It passed the structural check; it has not been imported into an organisation.', 6000); V.render();
  });
  ACT.opkReport = () => { const { model, res } = current(); const chk = O().verify(res.files, model, root.DOMParser); V.download(res.name + '-report.md', O().report(res, model, chk), 'text/markdown'); };
})(typeof window !== 'undefined' ? window : globalThis);
