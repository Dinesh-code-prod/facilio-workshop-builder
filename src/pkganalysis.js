/* Organisation package analysis: reads the configuration already loaded into the project (the bundled reference or an imported package)
   and shows what is configured, how modules relate, which apps and tabs exist, and what looks incomplete or inconsistent.
   A compact digest is saved with the project so the existing AI assistant can use it as a cited source (no separate AI workflow). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const { tag, drawer, toast, ico } = V;
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const arr = x => (Array.isArray(x) ? x : []);
  let CACHE = null;
  function analyse(b) {
    if (CACHE && CACHE.b === b) return CACHE.r;
    const mods = b.modules || {}; const names = new Set(Object.keys(mods)); const custom = Object.values(mods).filter(m => m.custom);
    const webtabs = arr(b.webtabs), apps = arr(b.apps), rels = arr(b.relationships), flows = arr(b.flows), trans = arr(b.transitions), btns = arr(b.buttons), roles = arr(b.roles), ca = arr(b.connectedApps);
    const roleAccessKnown = roles.some(r => arr(r.permissions).some(p => arr(p.modules).length));
    const caSet = new Set(ca.map(c => norm(c.name)));
    const customRows = custom.map(m => {
      const tabs = webtabs.filter(w => arr(w.modules).some(x => (x.name || x) === m.name)).map(w => ({ app: w.app, tab: w.name }));
      const fl = flows.filter(f => f.module === m.name); const tr = trans.filter(t => t.module === m.name).length;
      const rl = rels.filter(r => r.fromModule === m.name || r.toModule === m.name);
      const lookups = arr(m.fields).filter(f => f.lookup && f.origin !== 'System').map(f => ({ field: f.label, to: f.lookup }));
      const bt = btns.filter(x => x.module === m.name);
      const rolesWith = roles.filter(r => arr(r.permissions).some(p => arr(p.modules).some(x => (x.name || x) === m.name) && arr(p.granted).length)).map(r => r.name);
      return { name: m.name, label: m.label || m.name, description: m.description || '', fields: arr(m.fields), tabs, flows: fl, transitions: tr, rels: rl, lookups, buttons: bt, roles: rolesWith, stateflow: !!m.stateflowEnabled };
    });
    const F_ = []; const add = (sev, area, item, detail) => F_.push({ sev, area, item, detail });
    customRows.forEach(c => {
      if (!c.description) add('low', 'Custom module', c.label, 'No description recorded. Add the purpose so guides and UAT can describe it.');
      if (!c.tabs.length) add('medium', 'Custom module', c.label, 'Not shown in any app tab, so users have no way to open it from the menu.');
      if (roleAccessKnown && !c.roles.length) add('low', 'Custom module', c.label, 'No role access could be read from the package for this module (role permissions are only partly decoded). Confirm who should use it.');
      if (!c.flows.length) add('low', 'Custom module', c.label, 'No state flow found. Confirm whether the module needs statuses.');
      c.lookups.forEach(l => { if (l.to && !names.has(l.to)) add('low', 'Relationship', c.label + ' → ' + l.to, 'Field "' + l.field + '" points to a module that is not in the package (probably a system module that was not exported).'); });
    });
    rels.forEach(r => { [r.fromModule, r.toModule].forEach(x => { if (x && !names.has(x)) add('medium', 'Relationship', r.name, 'Refers to module "' + x + '", which is not in the package.'); }); });
    btns.forEach(x => { if (x.connectedApp && !caSet.has(norm(x.connectedApp))) add('medium', 'Connected app', (x.name || 'Button') + ' on ' + x.module, 'Uses connected app "' + x.connectedApp + '", which is not in the package.'); });
    apps.forEach(a => { if (a.enabled && !webtabs.some(w => w.app === a.link)) add('medium', 'App', a.name, 'Enabled but has no tabs.'); });
    flows.forEach(f => { if (f.enabled && !trans.some(t => t.flowId === f.id)) add('low', 'State flow', f.name, 'Enabled flow with no transitions.'); });
    const order = { high: 0, medium: 1, low: 2 }; F_.sort((a, c) => order[a.sev] - order[c.sev]);
    const counts = { modules: Object.keys(mods).length, custom: custom.length, fields: Object.values(mods).reduce((n, m) => n + arr(m.fields).length, 0), relationships: rels.length, apps: apps.length, tabs: webtabs.length, roles: roles.length, flows: flows.length, connectedApps: ca.length, buttons: btns.length };
    const r = { counts, custom: customRows, findings: F_, rels, apps, webtabs, ca, btns, notes: arr(b.gaps) }; CACHE = { b, r }; return r;
  }
  // compact text for the AI (kept under about 11,000 characters)
  function digest(b) {
    const a = analyse(b); const d = { source: (b.meta && (b.meta.sourceName || b.meta.packageName)) || 'configuration', parsedAt: b.meta && b.meta.parsedAt, counts: a.counts };
    const build = (nm, nf, nr, nt, nb) => Object.assign({}, d, {
      checks: a.findings.slice(0, nf).map(f => f.sev + ' | ' + f.area + ' | ' + f.item + ' | ' + f.detail),
      customModules: a.custom.slice(0, nm).map(c => ({ name: c.name, label: c.label, purpose: c.description, fieldCount: c.fields.length, keyFields: c.fields.filter(f => f.origin !== 'System').slice(0, 10).map(f => f.label + ' (' + f.type + (f.lookup ? ' → ' + f.lookup : '') + (f.required ? ', required' : '') + ')'), tabs: c.tabs.slice(0, 4).map(t => t.app + '/' + t.tab), flows: c.flows.map(f => f.name + (f.enabled ? '' : ' (off)')), roles: c.roles.slice(0, 6), buttons: c.buttons.slice(0, 4).map(x => x.name + ' [' + (x.actionType || x.buttonType) + ']') })),
      relationships: a.rels.slice(0, nr).map(r => r.name + ': ' + r.fromModule + ' → ' + r.toModule + (r.forward ? ' (' + r.forward + ' / ' + r.reverse + ')' : '')),
      apps: a.apps.slice(0, 20).map(p => ({ app: p.name, category: p.category, enabled: p.enabled, tabs: a.webtabs.filter(w => w.app === p.link).slice(0, nt).map(w => w.name + (arr(w.modules).length ? ' [' + arr(w.modules).slice(0, 3).map(x => x.name || x).join(', ') + ']' : '')) })),
      connectedApps: a.ca.map(c => c.name), customButtons: a.btns.filter(x => x.connectedApp || x.actionType === 'Connected App').slice(0, nb).map(x => x.name + ' on ' + x.module + ' → ' + (x.connectedApp || x.targetModule))
    });
    let lv = [[15, 40, 20, 12, 12], [12, 30, 15, 8, 8], [10, 24, 12, 6, 6], [8, 18, 10, 4, 4], [6, 12, 8, 3, 3], [4, 8, 5, 2, 2]]; let out;
    for (const l of lv) { out = build(l[0], l[1], l[2], l[3], l[4]); if (JSON.stringify(out).length <= 11000) break; } return out;
  }
  V.pkgDigestSave = async () => { if (!S.baseline) return false; const dg = digest(S.baseline); const doc = F.doc('config_digest'); Object.keys(doc).forEach(k => delete doc[k]); Object.assign(doc, dg, { savedAt: new Date().toISOString() }); F.changed('AI context updated from the configuration', S.baselineMeta && S.baselineMeta.label || '', { section: 'config_digest', render: false }); return true; };

  const SEV = { high: ['red', 'High'], medium: ['tbc', 'Medium'], low: ['', 'Low'] };
  const T = { sev: '', app: '', q: '' };
  const csv = rows => rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  V.pkgan = {
    html() {
      const b = S.baseline; if (!b) return `<div class="page-header"><div class="t"><h1>Package Analysis</h1></div></div><div class="page-body"><div class="notice"><span>No configuration is loaded for this project.</span></div></div>`;
      const a = analyse(b); const c = a.counts; const m = b.meta || {}; const can = !V.isCustomer() && !S.readonly; const stored = (S.docs.config_digest && S.docs.config_digest.data) || {};
      const fs = a.findings.filter(f => !T.sev || f.sev === T.sev);
      const appSel = a.apps.map(x => x.link); const app = T.app || (a.apps.find(x => x.category === 'internal') || a.apps[0] || {}).link; const tabs = a.webtabs.filter(w => w.app === app);
      const card = (n, l) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`;
      return `<div class="page-header"><div class="t"><h1>Package Analysis</h1><p>What is configured in the organisation package, how the pieces connect, and what looks incomplete. Source: <b>${esc(m.sourceName || m.packageName || 'configuration')}</b>${m.parsedAt ? ' · read ' + esc(V.fmtDate(m.parsedAt)) : ''}. The AI assistant uses a compact summary of this page as a cited source.</p></div><div class="row">${can ? `<button class="btn" data-act="pkgDigest">Update AI context</button>${V.aiButton ? V.aiButton('pkg', 'Analyse with AI') : ''}` : ''}<button class="btn" data-act="pkgCsv">${ico('dl')}Export findings (CSV)</button></div></div>
      <div class="page-body"><div class="stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:14px">${card(c.modules, 'Modules')}${card(c.custom, 'Custom modules')}${card(c.fields, 'Fields')}${card(c.relationships, 'Relationships')}${card(c.apps, 'Apps')}${card(c.tabs, 'Tabs')}${card(c.roles, 'Roles')}${card(c.flows, 'State flows')}${card(c.connectedApps, 'Connected apps')}</div>
      <div class="notice"><span>${stored.savedAt ? 'AI context last updated ' + esc(V.fmtDate(stored.savedAt)) + '.' : 'AI context not saved yet. Use "Update AI context" so the assistant can use this configuration.'}</span></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Checks (${fs.length})</h3><select data-change="pkgSev" style="width:auto"><option value="">All</option>${['high', 'medium', 'low'].map(s => `<option value="${s}"${T.sev === s ? ' selected' : ''}>${SEV[s][1]}</option>`).join('')}</select></div><div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Level</th><th>Area</th><th>Item</th><th>Finding</th></tr></thead><tbody>${fs.slice(0, 200).map(f => `<tr><td>${tag(SEV[f.sev][0], SEV[f.sev][1])}</td><td class="small">${esc(f.area)}</td><td><b>${esc(f.item)}</b></td><td class="small">${esc(f.detail)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="padding:14px">Nothing flagged.</td></tr>'}</tbody></table></div><div class="xs muted" style="padding:8px 14px">Checks compare the package with itself. A finding is a question to confirm with the customer, not proof of an error.</div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Custom modules (${a.custom.length})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>Purpose</th><th>Fields</th><th>Tabs</th><th>Flows</th><th>Relationships</th><th></th></tr></thead><tbody>${a.custom.map(x => `<tr><td><b>${esc(x.label)}</b><div class="xs muted">${esc(x.name)}</div></td><td class="small">${esc(x.description || '—')}</td><td>${x.fields.length}</td><td>${x.tabs.length}</td><td>${x.flows.length}</td><td>${x.rels.length + x.lookups.length}</td><td style="text-align:right"><button class="btn sm" data-act="pkgMod" data-n="${esc(x.name)}">Details</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted" style="padding:14px">No custom modules in this package.</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Module relationships (${a.rels.length})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Relationship</th><th>From</th><th>To</th><th>Forward / reverse</th></tr></thead><tbody>${a.rels.map(r => `<tr><td><b>${esc(r.name)}</b><div class="xs muted">${esc(r.description || '')}</div></td><td class="small">${esc(r.fromModule)}</td><td class="small">${esc(r.toModule)}</td><td class="small">${esc(r.forward || '')}${r.reverse ? ' / ' + esc(r.reverse) : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="padding:14px">None found.</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Apps and tabs</h3><select data-change="pkgApp" style="width:auto">${a.apps.map(x => `<option value="${esc(x.link)}"${x.link === app ? ' selected' : ''}>${esc(x.name)} (${esc(x.category)}${x.enabled ? '' : ', off'})</option>`).join('')}</select></div><div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Tab</th><th>Type</th><th>Route</th><th>Modules</th><th>In menu</th></tr></thead><tbody>${tabs.slice(0, 300).map(w => `<tr><td><b>${esc(w.name)}</b></td><td class="small">${esc(w.type || '')}</td><td class="small">${esc(w.route || '')}</td><td class="small">${esc(arr(w.modules).map(x => x.name || x).join(', '))}</td><td>${w.inMenu ? 'Yes' : 'No'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="padding:14px">No tabs in this app.</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Connected apps (${a.ca.length}) and buttons that use them</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Connected app</th><th>Buttons</th></tr></thead><tbody>${a.ca.map(x => `<tr><td><b>${esc(x.name)}</b></td><td class="small">${esc(a.btns.filter(y => norm(y.connectedApp) === norm(x.name)).map(y => (y.name || 'Button') + ' on ' + y.module).join('; ') || '—')}</td></tr>`).join('') || '<tr><td colspan="2" class="muted" style="padding:14px">None found.</td></tr>'}</tbody></table></div></div>${appSel.length ? '' : ''}</div>`;
    }
  };
  ACT.pkgSev = el => { T.sev = el.value; V.render(); }; ACT.pkgApp = el => { T.app = el.value; V.render(); };
  ACT.pkgDigest = a => V.busy(a, async () => { await V.pkgDigestSave(); await F.flush(); toast('AI context updated'); V.render(); });
  ACT.pkgCsv = () => { const r = analyse(S.baseline); V.download('package-findings.csv', '\ufeff' + csv([['Level', 'Area', 'Item', 'Finding']].concat(r.findings.map(f => [f.sev, f.area, f.item, f.detail]))), 'text/csv'); };
  ACT.pkgMod = a => {
    const r = analyse(S.baseline); const x = r.custom.find(c => c.name === a.getAttribute('data-n')); if (!x) return;
    drawer(x.label, `<p class="small">${esc(x.description || 'No description recorded.')}</p>
      <div class="pink-label">Fields (${x.fields.length})</div><div class="tbl-wrap" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Field</th><th>Type</th><th>Links to</th><th>Required</th></tr></thead><tbody>${x.fields.filter(f => f.origin !== 'System').map(f => `<tr><td>${esc(f.label)}</td><td class="small">${esc(f.type)}</td><td class="small">${esc(f.lookup || '')}</td><td>${f.required ? 'Yes' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="pink-label" style="margin-top:12px">Where it appears</div><div class="small">${x.tabs.map(t => esc(t.app + ' › ' + t.tab)).join('<br>') || '<span class="muted">No tab.</span>'}</div>
      <div class="pink-label" style="margin-top:12px">State flows</div><div class="small">${x.flows.map(f => esc(f.name) + (f.enabled ? '' : ' (off)')).join('<br>') || '<span class="muted">None.</span>'}</div>
      <div class="pink-label" style="margin-top:12px">Relationships</div><div class="small">${x.rels.map(q => esc(q.name + ': ' + q.fromModule + ' → ' + q.toModule)).concat(x.lookups.map(l => esc(l.field + ' → ' + l.to))).join('<br>') || '<span class="muted">None.</span>'}</div>
      <div class="pink-label" style="margin-top:12px">Roles with access</div><div class="small">${esc(x.roles.join(', ')) || '<span class="muted">None recorded.</span>'}</div>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>`, { wide: true });
  };
  V.pkgAnalyse = analyse;
})(typeof window !== 'undefined' ? window : globalThis);
