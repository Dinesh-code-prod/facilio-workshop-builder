/* Client mockup: ONE self-contained HTML file built from the confirmed design (no Meteor, no sign-in, nothing outside the file), arranged the way a Facilio organisation looks:
   a left menu (Portfolio, Assets, Operations), a list for each module, record pages with the status ribbon and the state-flow buttons that really move the record, new-record forms,
   flows across modules that create a record in the other module, and connected apps. All data is fictional sample data. It is meant to be e-mailed or shared with the customer.
   The page logic is the function `runtime`, written once: it is also stringified into the file, so it must not use anything outside itself. With no document it returns its pure helpers (tested in tests/mockup_client.mjs). */
(function (root) {
  'use strict';
  const V = root.FWBViews || (root.FWBViews = {});
  function runtime(DATA, doc) {
    var GROUPS = [['Portfolio', /(portfolio|site|building|floor|space|location|zone|campus)/i], ['Assets', /(asset|equipment|inventory|spare|part)/i]];
    function group(label) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(String(label || ''))) return GROUPS[i][0]; return 'Operations'; }
    function sample(f, i) {
      var t = String(f.type || '').toLowerCase(); if (f.options && f.options.length) return String(f.options[i % f.options.length]);
      if (/num|dec|int|money|curr/.test(t)) return String(100 * (i + 1)); if (/date/.test(t)) return '2026-12-0' + (i + 1); if (/bool|check/.test(t)) return i % 2 ? 'No' : 'Yes'; return f.label + ' sample ' + (i + 1);
    }
    function fieldList(m) {
      var out = [], seen = {}; (m.fields || []).forEach(function (f) { if (!seen[f.label]) { seen[f.label] = 1; out.push(f); } });
      (m.forms || []).forEach(function (fm) { (fm.sections || []).forEach(function (s) { (s.fields || []).forEach(function (n) { if (n && !seen[n]) { seen[n] = 1; out.push({ label: n, type: 'text', options: [] }); } }); }); }); return out;
    }
    function ordered(mods) { var order = { Portfolio: 0, Assets: 1, Operations: 2 }; return (mods || []).slice().sort(function (a, b) { var ga = order[group(a.label)], gb = order[group(b.label)]; return ga - gb || String(a.label).localeCompare(String(b.label)); }); }
    function seed(m) {
      var fl = m.flows && m.flows[0], fs = fieldList(m), out = [];
      for (var i = 0; i < 3; i++) { var v = {}; fs.forEach(function (f) { v[f.label] = sample(f, i); }); out.push({ id: m.name + '-' + (1001 + i), title: m.label + ' #' + (1001 + i), status: fl && fl.states && fl.states.length ? fl.states[i === 1 && fl.states.length > 1 ? 1 : 0] : '', values: v, log: [] }); }
      return out;
    }
    function nextMoves(flow, state) { return flow ? (flow.transitions || []).filter(function (t) { return t.from === state; }) : []; }
    function isApproval(t) { return /approv/i.test(String(t && t.name || '')); }
    if (!doc) return { group: group, sample: sample, fieldList: fieldList, ordered: ordered, seed: seed, nextMoves: nextMoves, isApproval: isApproval };

    var recs = {}, st = { mod: '', view: 'list', id: '', tab: 'details', app: -1 }, mods = ordered(DATA.modules); mods.forEach(function (m) { recs[m.name] = seed(m); }); if (mods.length) st.mod = mods[0].name;
    var app = doc.getElementById('app'), note = '';
    function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function modOf(name) { return mods.filter(function (m) { return m.name === name || m.label === name; })[0]; }
    function render() {
      var m = modOf(st.mod), fl = m && m.flows && m.flows[0], groups = {}; mods.forEach(function (x) { (groups[group(x.label)] = groups[group(x.label)] || []).push(x); });
      var nav = ['Portfolio', 'Assets', 'Operations'].filter(function (g) { return groups[g]; }).map(function (g) { return '<div class="gh">' + g + '</div>' + groups[g].map(function (x) { return '<button class="ni' + (x.name === st.mod ? ' on' : '') + '" data-a="mod" data-m="' + e(x.name) + '">' + e(x.label) + '</button>'; }).join(''); }).join('');
      var body = !m ? '<p class="muted">No module is in scope yet.</p>' : st.view === 'list' ? list(m) : st.view === 'new' ? form(m) : record(m, fl);
      app.innerHTML = '<header><b>' + e(DATA.customer || DATA.project || 'Facilio') + '</b><span>Interactive mockup with sample data</span></header><div class="wrap"><nav>' + nav + '</nav><main>' + body + '</main></div>' + (note ? '<div class="toast">' + e(note) + '</div>' : '') + (st.app >= 0 ? appModal(m) : '');
    }
    function chip(s) { return s ? '<span class="chip s' + (String(s).length % 5) + '">' + e(s) + '</span>' : ''; }
    function list(m) {
      var fs = fieldList(m).slice(0, 3), rows = recs[m.name] || [];
      return '<div class="bar"><h1>' + e(m.label) + '</h1><button class="btn p" data-a="new">+ New</button></div>' + (m.requirements && m.requirements.length ? '<p class="muted">' + m.requirements.length + ' agreed requirement' + (m.requirements.length === 1 ? '' : 's') + ' for this module.</p>' : '')
        + '<table><thead><tr><th>Name</th>' + (m.flows && m.flows.length ? '<th>Status</th>' : '') + fs.map(function (f) { return '<th>' + e(f.label) + '</th>'; }).join('') + '</tr></thead><tbody>'
        + rows.map(function (r) { return '<tr data-a="open" data-id="' + e(r.id) + '"><td><b>' + e(r.title) + '</b></td>' + (m.flows && m.flows.length ? '<td>' + chip(r.status) + '</td>' : '') + fs.map(function (f) { return '<td>' + e(r.values[f.label] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    }
    function form(m) {
      var secs = (m.forms && m.forms[0] && m.forms[0].sections) || [{ name: 'Details', fields: fieldList(m).map(function (f) { return f.label; }) }], k = 0;
      return '<div class="bar"><h1>New ' + e(m.label) + '</h1></div><div class="card"><label>Name<input id="f_title" value="' + e(m.label + ' #' + (1001 + (recs[m.name] || []).length)) + '"></label>' + secs.map(function (s) {
        return '<h3>' + e(s.name) + '</h3><div class="grid">' + (s.fields || []).map(function (n) { var f = fieldList(m).filter(function (x) { return x.label === n; })[0] || { label: n, options: [], type: 'text' }; var id = 'f_' + (k++);
          return '<label>' + e(n) + (f.required ? ' *' : '') + (f.options && f.options.length ? '<select id="' + id + '" data-n="' + e(n) + '">' + f.options.map(function (o) { return '<option>' + e(o) + '</option>'; }).join('') + '</select>' : '<input id="' + id + '" data-n="' + e(n) + '">') + '</label>'; }).join('') + '</div>'; }).join('')
        + '<div class="row"><button class="btn p" data-a="save">Save</button><button class="btn" data-a="back">Cancel</button></div></div>';
    }
    function record(m, fl) {
      var r = (recs[m.name] || []).filter(function (x) { return x.id === st.id; })[0]; if (!r) return list(m);
      var ribbon = fl ? '<div class="ribbon">' + fl.states.map(function (s, i) { var cur = s === r.status, done = fl.states.indexOf(r.status) > i; return '<span class="rs' + (cur ? ' cur' : done ? ' done' : '') + '">' + e(s) + '</span>'; }).join('') + '</div>' : '';
      var moves = nextMoves(fl, r.status).map(function (t, i) { return '<button class="btn' + (isApproval(t) ? ' p' : '') + '" data-a="move" data-i="' + i + '">' + e(t.name) + '</button>'; }).join('');
      var links = (DATA.crosslinks || []).filter(function (c) { return c.from === m.label; }), apps = (DATA.apps || []).map(function (a, i) { return [a, i]; }).filter(function (p) { return String(p[0].module).toLowerCase() === m.label.toLowerCase() || String(p[0].module).toLowerCase() === m.name.toLowerCase(); });
      var tabs = [['details', 'Details']].concat(links.length ? [['process', 'Process']] : [], apps.length ? [['apps', 'Apps']] : [], [['history', 'History']]);
      var pane = st.tab === 'process' ? links.map(function (c, i) { return '<div class="card"><b>' + e(c.name) + '</b><p class="muted">' + e(m.label) + ' → ' + e(c.to) + (c.condition ? ' · when ' + e(c.condition) : '') + '</p><button class="btn p" data-a="link" data-i="' + i + '">' + e(c.name) + '</button></div>'; }).join('')
        : st.tab === 'apps' ? apps.map(function (p) { return '<div class="card"><b>' + e(p[0].name) + '</b><p class="muted">' + e(p[0].purpose || '') + '</p><button class="btn p" data-a="app" data-i="' + p[1] + '">Open ' + e(p[0].triggerLabel || p[0].trigger || 'app') + '</button></div>'; }).join('')
        : st.tab === 'history' ? '<div class="card">' + (r.log.length ? r.log.map(function (l) { return '<p>' + e(l) + '</p>'; }).join('') : '<p class="muted">No changes yet. Use the buttons above to move this record.</p>') + '</div>'
        : '<div class="card"><div class="grid">' + Object.keys(r.values).map(function (k) { return '<div><span class="muted">' + e(k) + '</span><br>' + e(r.values[k]) + '</div>'; }).join('') + '</div>' + (m.requirements && m.requirements.length ? '<h3>Agreed requirements</h3>' + m.requirements.map(function (q) { return '<p><b>' + e(q.id) + '</b> ' + e(q.title) + '</p>'; }).join('') : '') + '</div>';
      return '<div class="bar"><div><button class="lnk" data-a="back">‹ ' + e(m.label) + '</button><h1>' + e(r.title) + ' ' + chip(r.status) + '</h1></div><div class="row">' + moves + '</div></div>' + ribbon + '<div class="tabs">' + tabs.map(function (t) { return '<button class="tb' + (t[0] === st.tab ? ' on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + pane;
    }
    function appModal(m) { var a = (DATA.apps || [])[st.app]; if (!a) return ''; return '<div class="scrim"><div class="modal"><h2>' + e(a.name) + '</h2><p>' + e(a.purpose || '') + '</p>' + (a.shows ? '<p><b>It shows:</b> ' + e(a.shows) + '</p>' : '') + '<p class="muted">A connected app opens from the ' + e((a.triggerLabel ? a.triggerLabel + ' ' : '') + (a.trigger || 'button')) + ' of ' + e(a.module || (m && m.label) || '') + '.</p><button class="btn p" data-a="closeapp">Close</button></div></div>'; }
    doc.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('[data-a]'); if (!t) return; var a = t.getAttribute('data-a'), m = modOf(st.mod), r = m && (recs[m.name] || []).filter(function (x) { return x.id === st.id; })[0];
      function later(ms) { doc.defaultView.setTimeout(function () { note = ''; render(); }, ms); }
      if (a === 'mod') { st.mod = t.getAttribute('data-m'); st.view = 'list'; st.id = ''; } else if (a === 'open') { st.id = t.getAttribute('data-id'); st.view = 'record'; st.tab = 'details'; } else if (a === 'back') { st.view = 'list'; st.id = ''; }
      else if (a === 'new') { st.view = 'new'; } else if (a === 'tab') { st.tab = t.getAttribute('data-t'); } else if (a === 'closeapp') { st.app = -1; } else if (a === 'app') { st.app = Number(t.getAttribute('data-i')); }
      else if (a === 'save' && m) { var vals = {}; doc.querySelectorAll('[data-n]').forEach(function (x) { vals[x.getAttribute('data-n')] = x.value || ''; }); var fl = m.flows && m.flows[0], n = (recs[m.name] || []).length; recs[m.name].push({ id: m.name + '-' + (1001 + n), title: (doc.getElementById('f_title') || {}).value || (m.label + ' #' + (1001 + n)), status: fl && fl.states.length ? fl.states[0] : '', values: vals, log: ['Created'] }); st.view = 'list'; note = 'Saved'; later(2000); }
      else if (a === 'move' && r) { var mv = nextMoves(m.flows && m.flows[0], r.status)[Number(t.getAttribute('data-i'))]; if (mv && (!isApproval(mv) || doc.defaultView.confirm(mv.name + ' this record?'))) { r.log.push(r.status + ' → ' + mv.to + ' (' + mv.name + ', Sample User)'); r.status = mv.to; note = r.title + ' is now ' + mv.to; later(2600); } }
      else if (a === 'link' && r) { var c = (DATA.crosslinks || []).filter(function (x) { return x.from === m.label; })[Number(t.getAttribute('data-i'))], tm = c && modOf(c.to); if (tm) { var tf = tm.flows && tm.flows[0], k = (recs[tm.name] || []).length; recs[tm.name].push({ id: tm.name + '-' + (1001 + k), title: tm.label + ' #' + (1001 + k) + ' (from ' + r.title + ')', status: tf && tf.states.length ? tf.states[0] : '', values: {}, log: ['Created by "' + c.name + '" from ' + r.title] }); r.log.push(c.name + ': created in ' + tm.label); note = c.name + ': a record was created in ' + tm.label; later(3200); } else { note = c ? c.to + ' is not part of this mockup' : ''; later(2600); } }
      render();
    });
    render();
  }
  const CSS = 'body{margin:0;background:#F7FAFF;color:#1D1A5E;font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif}header{display:flex;gap:14px;align-items:baseline;padding:10px 18px;background:#1D1A5E;color:#fff}header span{color:#8DB8FF;font-size:12.5px}.wrap{display:flex;min-height:calc(100vh - 44px)}nav{width:210px;flex:none;background:#fff;border-right:1px solid #DCE4F3;padding:10px 8px}.gh{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:#7A86AB;margin:12px 8px 4px}.ni{display:block;width:100%;text-align:left;border:0;background:transparent;color:#1D1A5E;padding:8px 10px;border-radius:8px;font:inherit;cursor:pointer}.ni:hover{background:#EAF2FF}.ni.on{background:#1570EF;color:#fff}main{flex:1;padding:18px 22px;min-width:0}.bar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}h1{font-size:22px;margin:4px 0}h3{margin:14px 0 6px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #DCE4F3;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #EEF2FA}th{font-size:12px;color:#4A5784;background:#F1F5FB}tbody tr{cursor:pointer}tbody tr:hover{background:#F7FAFF}.btn{border:1px solid #CBD6EE;background:#fff;color:#1D1A5E;border-radius:8px;padding:7px 14px;font:inherit;cursor:pointer}.btn.p{background:#1570EF;border-color:#1570EF;color:#fff}.row{display:flex;gap:8px;flex-wrap:wrap}.chip{display:inline-block;padding:2px 10px;border-radius:999px;background:#EAF2FF;border:1px solid #CFE0FF;font-size:12.5px;vertical-align:middle}.s1{background:#E8F7EE;border-color:#BFE6CD}.s2{background:#FFF4E0;border-color:#F3D9A4}.s3{background:#EEF2FA;border-color:#D5DDEE}.s4{background:#FFF0F7;border-color:#F3B5D4}.ribbon{display:flex;gap:4px;margin:6px 0 14px;flex-wrap:wrap}.rs{padding:6px 14px;background:#EEF2FA;border-radius:6px;color:#4A5784;font-size:13px}.rs.done{background:#CFE0FF;color:#1D1A5E}.rs.cur{background:#1570EF;color:#fff;font-weight:600}.tabs{display:flex;gap:4px;border-bottom:1px solid #DCE4F3;margin-bottom:12px}.tb{border:0;background:transparent;padding:8px 14px;font:inherit;color:#4A5784;cursor:pointer;border-bottom:2px solid transparent}.tb.on{color:#1570EF;border-bottom-color:#1570EF}.card{background:#fff;border:1px solid #DCE4F3;border-radius:12px;padding:14px 18px;margin-bottom:12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 18px}label{display:block;font-size:12.5px;color:#4A5784}input,select{display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:8px 10px;border:1px solid #CBD6EE;border-radius:8px;font:inherit}.muted{color:#7A86AB}.lnk{border:0;background:transparent;color:#1570EF;cursor:pointer;font:inherit;padding:0}.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1D1A5E;color:#fff;padding:10px 18px;border-radius:10px}.scrim{position:fixed;inset:0;background:rgba(29,26,94,.4);display:grid;place-items:center}.modal{background:#fff;border-radius:14px;padding:22px 26px;max-width:460px}@media(max-width:700px){nav{width:130px}}';
  const safe = d => JSON.stringify(d).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028) + '|' + String.fromCharCode(0x2029), 'g'), ' ');
  /** the whole client mockup as one HTML string; d is the same plain data as the Mockup brief (modules with flows, fields, forms, requirements; crosslinks; apps) */
  function toClientHtml(d) {
    const data = { customer: d.customer || '', project: d.project || '', modules: (d.modules || []).filter(m => m && m.label), crosslinks: d.crosslinks || [], apps: d.apps || [] };
    const t = String((data.customer ? data.customer + ' · ' : '') + (data.project || 'Facilio project')).replace(/[<>&"]/g, ' ');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mockup: ' + t + '</title><style>' + CSS + '</style></head><body><div id="app"></div><script>(' + runtime.toString() + ')(' + safe(data) + ', document);</script></body></html>';
  }
  const ACT = V.ACT || (V.ACT = {});
  ACT.mkClient = () => { const g = V.mockupLogic && (V.mockupLogic.gatherClient || V.mockupLogic.gather); if (!g) return; const d = g(); if (!d.modules.length) { V.toast('No module is in scope yet, so there is nothing to show.', 5000, true); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toClientHtml(d)], { type: 'text/html' })); a.download = ((d.customer || d.project || 'project') + ' - client mockup.html').replace(/[\\/:*?"<>|]/g, ' '); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); V.toast('The client mockup is saved. Open it in any browser or e-mail it.', 6000); };
  V.mockupClient = { toClientHtml, runtime };
})(typeof window !== 'undefined' ? window : globalThis);
