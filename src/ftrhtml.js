/* FTR checklist (Final Testing Review) as one self-contained HTML file a consultant works through (pure code, also run by tests/ftr_html.mjs). E2 workspace 6.
   Two kinds of check are kept apart everywhere, in the list, the page, the counts, the CSV and the JSON:
     configuration  = inspect the setup (XML or Configuration Hub). It does NOT prove the application behaves correctly.
     functional     = run it in the application (runtime behaviour).
   Nothing is invented: an item exists only because the data names something (a module, form, field, role, workflow, status, notification, integration, report, portal, dependency).
   The fixed part is the list of check TYPES and the wording of each check. The page reuses the shared customer HTML frame of src/kickoffhtml.js (policy that blocks every outside request, escape helper).
   The consultant sets Pass / Fail / Blocked / N/A per item, writes a comment, sees the counts per section, progress is kept in this browser, and the results download as JSON (schema fds-ftr-result,
   checked by src/ftrresult.js) and as CSV. Everything the page shows is built here and HTML-escaped; the script only reads ids it finds in the page. */
(function (root) {
  'use strict';
  const K = () => root.FWBKickoffDeck || (typeof require === 'function' ? require('./kickoffhtml.js') : null);
  const esc = s => K().esc(s).replace(/`/g, '&#96;');
  const arr = x => (Array.isArray(x) ? x : []);
  const SCHEMA = 'fds-ftr-result', VERSION = 1, RESULTS = ['Pass', 'Fail', 'Blocked', 'N/A'];
  const SECTIONS = { configuration: 'Configuration checks', functional: 'Functional tests' };
  // the fixed standard list of check types: label and a short code used in the item id
  const TYPES = { portal: ['Portals', 'PRT'], role: ['Roles', 'ROL'], permission: ['Permissions', 'PRM'], access: ['Module access', 'ACC'], form: ['Forms and fields', 'FRM'], workflow: ['Workflows', 'WFL'], transition: ['State transitions', 'TRN'], process: ['Process checks', 'PRC'], approval: ['Approvals', 'APR'], notification: ['Notifications', 'NTF'], integration: ['Integrations', 'INT'], dependency: ['Cross-module dependencies', 'DEP'], report: ['Reports', 'RPT'], validation: ['Configuration validations', 'VAL'] };

  const str = (x, n) => String(x == null || typeof x === 'object' ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n || 300);
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36).slice(0, 4); };
  // readable, safe id part; a name that had to be cut gets a short fingerprint so two long names never collide
  const slug = (s, n) => { const t = String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return t.length > (n || 24) ? t.slice(0, (n || 24) - 5).replace(/-+$/, '') + '-' + hash(String(s)) : t; };
  const names = a => arr(a).map(x => str(x && typeof x === 'object' ? (x.name != null ? x.name : x.label) : x, 200)).filter(Boolean);
  // a list entry (a name, or an object with a name) reduced to the few known fields; unknown keys are never copied
  function entries(a) {
    const seen = new Set(), out = [];
    arr(a).forEach(v => { const o = v && typeof v === 'object' ? v : {}, name = str(v && typeof v === 'object' ? (o.name != null ? o.name : o.label) : v, 200); if (!name || seen.has(name.toLowerCase())) return; seen.add(name.toLowerCase());
      out.push({ name, type: str(o.type, 60), required: o.required === true, trigger: str(o.trigger, 200), recipient: Array.isArray(o.recipients) ? names(o.recipients).join(', ') : str(o.recipient || o.recipients, 200), permissions: names(o.permissions), approval: o.approval === true, to: names(o.to) }); });
    return out;
  }
  const fieldText = f => f.name + (f.type || f.required ? ' (' + [f.type, f.required ? 'required' : ''].filter(Boolean).join(', ') + ')' : '');
  const join = a => a.join(', ');

  // input: { project:{id,name,customer}, modules:[{name, forms?, fields?, roles?, workflows?, statuses?, notifications?, integrations?, reports?, approvals?, portals?, dependsOn?}], config?:{ portals?, roles?, integrations?, notifications? } }
  // returns { project, items:[{id, section, type, module, title, what, expected, source, result:'', evidence:'', by:'', at:''}], gaps:[text] }
  function buildFtrChecklist(input) {
    const inp = input && typeof input === 'object' ? input : {}, cfg = inp.config && typeof inp.config === 'object' ? inp.config : {}, pr = inp.project && typeof inp.project === 'object' ? inp.project : {};
    const project = { id: str(pr.id, 80), name: str(pr.name, 200), customer: str(pr.customer, 200) };
    const items = [], gaps = [], used = new Set();
    const add = (section, type, mod, subject, title, what, expected, source) => {
      const base = ['FTR', section === 'configuration' ? 'CFG' : 'FUN', TYPES[type][1], slug(mod) || 'project', subject ? slug(subject) : ''].filter(Boolean).join('-'); let id = base, n = 2; while (used.has(id)) id = base + '-' + n++; used.add(id);
      items.push({ id, section, type, module: mod || '', title, what, expected, source, result: '', evidence: '', by: '', at: '' });
    };
    const CFGW = 'Inspect the organisation configuration (XML or Configuration Hub). This does not prove the application behaves correctly. ';
    const RUNW = 'Run this in the application. ';
    const cfgItem = (type, mod, subject, title, what, expected, source) => add('configuration', type, mod, subject, title, CFGW + what, expected, source);
    const funItem = (type, mod, subject, title, what, expected, source) => add('functional', type, mod, subject, title, RUNW + what, expected, source);

    const mods = []; const seenMod = new Set();
    arr(inp.modules).forEach(m => { const o = m && typeof m === 'object' ? m : { name: m }, name = str(o.name != null ? o.name : o.label, 200); if (!name || seenMod.has(name.toLowerCase())) return; seenMod.add(name.toLowerCase());
      mods.push({ name, forms: entries(o.forms), fields: entries(o.fields), roles: entries(o.roles), workflows: entries(o.workflows), statuses: entries(o.statuses), notifications: entries(o.notifications), integrations: entries(o.integrations), reports: entries(o.reports), approvals: entries(o.approvals), portals: entries(o.portals), dependsOn: entries(o.dependsOn) }); });

    // ----- project level: only what the BRD modules or the Configuration Hub name -----
    const inMods = key => new Set(mods.flatMap(m => m[key].map(e => e.name.toLowerCase())));
    const hubSrc = 'Configuration Hub';
    const hubOnly = (key, hub) => { const have = inMods(key); return hub.filter(e => !have.has(e.name.toLowerCase())); };
    hubOnly('portals', entries(cfg.portals)).forEach(p => { cfgItem('portal', '', p.name, 'Portal: ' + p.name, 'Check that the portal "' + p.name + '" exists and is enabled for the users it is meant for.', 'The portal "' + p.name + '" is configured as agreed in the BRD.', hubSrc);
      funItem('portal', '', p.name, 'Open portal: ' + p.name, 'Sign in as a user of the portal "' + p.name + '" and open it.', 'The portal opens and shows the modules agreed for it.', hubSrc); });
    const roleSet = new Map(); entries(cfg.roles).forEach(r => roleSet.set(r.name.toLowerCase(), { name: r.name, src: hubSrc })); mods.forEach(m => m.roles.forEach(r => { if (!roleSet.has(r.name.toLowerCase())) roleSet.set(r.name.toLowerCase(), { name: r.name, src: 'BRD module: ' + m.name }); }));
    roleSet.forEach(r => cfgItem('role', '', r.name, 'Role: ' + r.name, 'Check that the role "' + r.name + '" exists.', 'The role "' + r.name + '" exists as agreed in the BRD.', r.src));
    hubOnly('integrations', entries(cfg.integrations)).forEach(i => { cfgItem('integration', '', i.name, 'Integration: ' + i.name, 'Check that the integration "' + i.name + '" is configured (connection, mapping, schedule or trigger).', 'The integration "' + i.name + '" is configured as agreed in the BRD.', hubSrc);
      funItem('integration', '', i.name, 'Run integration: ' + i.name, 'Send or receive one real sample record through the integration "' + i.name + '".', 'The record arrives complete and in the right place on the other side.', hubSrc); });
    hubOnly('notifications', entries(cfg.notifications)).forEach(n => notif(n, '', hubSrc));

    function notif(n, mod, src) {
      const when = n.trigger ? ' when "' + n.trigger + '"' : '', to = n.recipient ? ' to ' + n.recipient : '';
      cfgItem('notification', mod, n.name, 'Notification: ' + n.name, 'Check that the notification "' + n.name + '" exists and is enabled' + (n.trigger ? ' with the trigger "' + n.trigger + '"' : '') + (n.recipient ? ' and the recipients ' + n.recipient : '') + '.', 'The notification is configured as agreed in the BRD.', src);
      funItem('notification', mod, n.name, 'Receive notification: ' + n.name, 'Cause the event' + (n.trigger ? ' "' + n.trigger + '"' : ' for "' + n.name + '"') + ' and look at what is sent' + to + '.', 'The notification' + when + ' is sent to the right people with the right content.', src);
    }

    // ----- per module -----
    mods.forEach(m => {
      const src = 'BRD module: ' + m.name, M = m.name;
      const none = (what, key) => { if (!m[key].length) gaps.push(M + ': no ' + what + ' listed, so no ' + what + ' checks were made.'); };
      ['forms', 'fields', 'roles', 'workflows', 'statuses', 'notifications', 'integrations', 'reports'].forEach(k => none(k, k));
      m.portals.forEach(p => { cfgItem('portal', M, p.name, 'Portal: ' + p.name + ' (' + M + ')', 'Check that "' + M + '" is available in the portal "' + p.name + '".', 'The module is part of the portal as agreed in the BRD.', src);
        funItem('portal', M, p.name, 'Open ' + M + ' in portal: ' + p.name, 'Sign in to the portal "' + p.name + '" and open "' + M + '".', 'The module opens in the portal.', src); });
      m.roles.forEach(r => {
        cfgItem('access', M, r.name, 'Module access: ' + r.name + ' on ' + M, 'Check that the role "' + r.name + '" has access to the module "' + M + '".', 'Access is set as agreed in the BRD.', src);
        funItem('access', M, r.name, 'Module access: ' + r.name + ' on ' + M, 'Sign in as a user with the role "' + r.name + '" and open the module "' + M + '".', 'The module is visible and opens, as agreed in the BRD.', src);
        if (r.permissions.length) {
          cfgItem('permission', M, r.name, 'Permissions: ' + r.name + ' on ' + M, 'Check the permissions of the role "' + r.name + '" on "' + M + '": ' + join(r.permissions) + '.', 'Exactly these permissions are granted: ' + join(r.permissions) + '.', src);
          funItem('permission', M, r.name, 'Permissions: ' + r.name + ' on ' + M, 'As the role "' + r.name + '", try each of these actions on "' + M + '": ' + join(r.permissions) + ', and one action that is not listed.', 'The listed actions work and the action that is not listed is blocked.', src);
        } else gaps.push(M + ': no permissions listed for the role "' + r.name + '", so no permission checks were made for it.');
      });
      m.forms.forEach(f => { cfgItem('form', M, 'form-' + f.name, 'Form: ' + f.name + ' (' + M + ')', 'Check that the form "' + f.name + '" exists on "' + M + '" and is the one used by the roles that need it.', 'The form exists as agreed in the BRD.', src);
        funItem('form', M, 'form-' + f.name, 'Use form: ' + f.name + ' (' + M + ')', 'Open the form "' + f.name + '", fill the required fields and save.', 'The record is saved and shows the entered values.', src); });
      if (m.fields.length) {
        cfgItem('form', M, 'fields', 'Fields of ' + M, 'Check these fields on "' + M + '": ' + join(m.fields.map(fieldText)) + '.', 'Every listed field exists with the type and required setting agreed in the BRD.', src);
        funItem('form', M, 'fields', 'Fields of ' + M, 'Enter a value in each of these fields on "' + M + '" and save: ' + join(m.fields.map(f => f.name)) + '.', 'Each value is accepted, saved and shown again; required fields refuse an empty value.', src);
      }
      m.workflows.forEach(w => { cfgItem('workflow', M, w.name, 'Workflow: ' + w.name + ' (' + M + ')', 'Check that the workflow "' + w.name + '" exists on "' + M + '" and is enabled' + (w.trigger ? ' with the trigger "' + w.trigger + '"' : '') + '.', 'The workflow is configured as agreed in the BRD.', src);
        funItem('workflow', M, w.name, 'Run workflow: ' + w.name + ' (' + M + ')', 'Cause the workflow "' + w.name + '" to run' + (w.trigger ? ' by "' + w.trigger + '"' : '') + ' and look at the result.', 'The workflow runs and does what the BRD describes.', src); });
      const approvals = m.approvals.concat(m.workflows.filter(w => w.approval).filter(w => !m.approvals.some(a => a.name.toLowerCase() === w.name.toLowerCase())));
      approvals.forEach(a => { cfgItem('approval', M, a.name, 'Approval: ' + a.name + ' (' + M + ')', 'Check that the approval "' + a.name + '" exists on "' + M + '" with the approvers named in the BRD.', 'The approval is configured as agreed in the BRD.', src);
        funItem('approval', M, a.name, 'Approval: ' + a.name + ' (' + M + ')', 'Submit a record for the approval "' + a.name + '", then approve one and reject one.', 'The status changes after each decision and the approvers are told.', src); });
      if (m.statuses.length) {
        cfgItem('transition', M, 'statuses', 'Statuses of ' + M, 'Check the statuses of "' + M + '": ' + join(m.statuses.map(s => s.name)) + '.', 'These statuses exist, with no others, as agreed in the BRD.', src);
        funItem('transition', M, 'statuses', 'Every status of ' + M + ' can be reached', 'Move a record to each of these statuses: ' + join(m.statuses.map(s => s.name)) + '.', 'Each status can be reached and is shown correctly.', src);
        m.statuses.forEach(s => s.to.forEach(t => funItem('transition', M, s.name + '-to-' + t, 'Transition: ' + s.name + ' to ' + t + ' (' + M + ')', 'Move a record of "' + M + '" from "' + s.name + '" to "' + t + '".', 'The move is allowed and the record shows "' + t + '".', src)));
      }
      if (m.workflows.length || m.statuses.length) funItem('process', M, 'process', 'Process: ' + M + ' from start to finish', 'Take one record of "' + M + '" through its whole process' + (m.statuses.length ? ' (statuses: ' + join(m.statuses.map(s => s.name)) + ')' : '') + (m.workflows.length ? ' (workflows: ' + join(m.workflows.map(w => w.name)) + ')' : '') + '.', 'The record completes the process and every step behaves as the BRD describes.', src);
      m.notifications.forEach(n => notif(n, M, src));
      m.integrations.forEach(i => { cfgItem('integration', M, i.name, 'Integration: ' + i.name + ' (' + M + ')', 'Check that the integration "' + i.name + '" is configured for "' + M + '" (connection, mapping, schedule or trigger).', 'The integration is configured as agreed in the BRD.', src);
        funItem('integration', M, i.name, 'Run integration: ' + i.name + ' (' + M + ')', 'Send or receive one real sample record of "' + M + '" through the integration "' + i.name + '".', 'The record arrives complete and in the right place on the other side.', src); });
      m.dependsOn.forEach(d => { cfgItem('dependency', M, d.name, M + ' depends on ' + d.name, 'Check the relationship between "' + M + '" and "' + d.name + '" (lookup, relationship or shared field).', 'The relationship exists as agreed in the BRD.', src);
        funItem('dependency', M, d.name, M + ' and ' + d.name + ' work together', 'Create a record in "' + d.name + '", link it from "' + M + '", then change it and look at "' + M + '".', 'The link works and the change shows where the BRD says it should.', src); });
      m.reports.forEach(r => { cfgItem('report', M, r.name, 'Report: ' + r.name + ' (' + M + ')', 'Check that the report "' + r.name + '" exists for "' + M + '" with the columns and filters agreed in the BRD.', 'The report is configured as agreed in the BRD.', src);
        funItem('report', M, r.name, 'Run report: ' + r.name + ' (' + M + ')', 'Run the report "' + r.name + '" and compare a few figures with the records.', 'The report opens and its figures match the records.', src); });
      const counts = [['forms', m.forms], ['fields', m.fields], ['roles', m.roles], ['workflows', m.workflows], ['statuses', m.statuses], ['notifications', m.notifications], ['integrations', m.integrations], ['reports', m.reports]].filter(c => c[1].length).map(c => c[1].length + ' ' + c[0]);
      cfgItem('validation', M, 'validation', 'Configuration of ' + M + ' against the BRD', 'Compare the whole configuration of "' + M + '" with the BRD' + (counts.length ? ', which lists ' + counts.join(', ') : '') + '. Look for anything missing, extra or named differently.', 'The configuration of the module matches the BRD, with every difference explained.', src);
    });
    return { project, items, gaps };
  }

  // ----- the two functions the page embeds (and the tests call as they are) -----
  // state = { by, res:{id:result}, com:{id:text}, at:{id:iso} }. Only ids, results, comments and the name leave the page.
  function makeResult(spec, state, at) {
    var out = { schema: 'fds-ftr-result', version: 1, project: { id: String(spec.project.id), name: String(spec.project.name) }, generatedAt: at, by: String(state.by || '').slice(0, 120), results: [] };
    spec.items.forEach(function (it) { var r = state.res[it.id] || '', c = String(state.com[it.id] || '').slice(0, 2000); if (r || c.trim()) out.results.push({ id: it.id, result: r, comment: c, at: String(state.at[it.id] || '') }); });
    return out;
  }
  // one row per item; the configuration result and the functional result are separate columns, never one
  function makeCsv(spec, state) {
    var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = [['Section', 'ID', 'Type', 'Module', 'Check', 'Configuration result', 'Functional result', 'Comment', 'Checked by', 'Checked at']];
    spec.items.forEach(function (it) { var r = state.res[it.id] || '', cfg = it.section === 'configuration'; rows.push([cfg ? 'Configuration' : 'Functional', it.id, it.type, it.module, it.title, cfg ? r : '', cfg ? '' : r, state.com[it.id] || '', r ? state.by || '' : '', r ? state.at[it.id] || '' : '']); });
    return '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n') + '\r\n';
  }
  function csvName(spec) { return 'ftr-results-' + String(spec.project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

  // The page script, written as a real function so it is syntax-checked with the rest. spec = the data block, doc = document. It never sends anything.
  function client(doc, spec, mkJson, mkCsv, baseName) {
    var KEY = 'fds-ftr:' + spec.project.id + ':' + spec.items.length, OK = { 'Pass': 1, 'Fail': 1, 'Blocked': 1, 'N/A': 1 };
    var st = { by: '', res: {}, com: {}, at: {} };
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') { if (typeof o.by === 'string') st.by = o.by.slice(0, 120);
      spec.items.forEach(function (it) { var r = o.res && o.res[it.id], c = o.com && o.com[it.id], a = o.at && o.at[it.id]; if (typeof r === 'string' && OK[r] === 1) st.res[it.id] = r; if (typeof c === 'string') st.com[it.id] = c.slice(0, 2000); if (typeof a === 'string') st.at[it.id] = a.slice(0, 40); }); } } } catch (e) { }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
    function paint() {
      ['configuration', 'functional'].forEach(function (sec) {
        var n = { 'Pass': 0, 'Fail': 0, 'Blocked': 0, 'N/A': 0 }, tot = 0; spec.items.forEach(function (it) { if (it.section !== sec) return; tot++; var r = st.res[it.id]; if (r) n[r]++; });
        var done = n['Pass'] + n['Fail'] + n['Blocked'] + n['N/A'], el = doc.getElementById('cnt-' + sec);
        if (el) el.textContent = (sec === 'configuration' ? 'Configuration checks' : 'Functional tests') + ': ' + n['Pass'] + ' pass, ' + n['Fail'] + ' fail, ' + n['Blocked'] + ' blocked, ' + n['N/A'] + ' N/A, ' + (tot - done) + ' not run (of ' + tot + ')';
      });
      doc.querySelectorAll('[data-item]').forEach(function (el) { el.setAttribute('data-state', st.res[el.getAttribute('data-item')] || 'none'); });
    }
    doc.querySelectorAll('[data-r]').forEach(function (el) { el.checked = (st.res[el.getAttribute('data-r')] || '') === el.value; });
    doc.querySelectorAll('[data-c]').forEach(function (el) { el.value = st.com[el.getAttribute('data-c')] || ''; });
    var by = doc.getElementById('by'); if (by) by.value = st.by;
    doc.addEventListener('change', function (e) { var el = e.target, k = el.getAttribute && el.getAttribute('data-r'); if (k) { if (el.value) { st.res[k] = el.value; st.at[k] = new Date().toISOString(); } else { delete st.res[k]; delete st.at[k]; } save(); paint(); } });
    doc.addEventListener('input', function (e) { var el = e.target, k = el.getAttribute && el.getAttribute('data-c'); if (k) { st.com[k] = el.value; save(); } else if (el.id === 'by') { st.by = el.value.slice(0, 120); save(); } });
    function download(name, text, mime) { var b = new Blob([text], { type: mime }), a = doc.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
    doc.addEventListener('click', function (e) {
      var id = e.target && e.target.id, note = doc.getElementById('dlnote');
      if (id === 'dl-json') { download(baseName + '.json', JSON.stringify(mkJson(spec, st, new Date().toISOString()), null, 2), 'application/json'); if (note) note.textContent = 'Saved. Send this file back to your Facilio team.'; }
      else if (id === 'dl-csv') { download(baseName + '.csv', mkCsv(spec, st), 'text/csv'); if (note) note.textContent = 'Saved.'; }
    });
    paint();
  }

  const CSS = `.top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #DCE4F3;padding:10px 16px}.top .in{max-width:980px;margin:0 auto;display:grid;gap:4px}.top b{font-size:14px}.cnt{font-size:13px;color:#1D1A5E;font-weight:600}.hero{border-top:6px solid #1570EF}.lead{font-size:18px;color:#4A5784}
nav ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:10px 0 0;padding:0}nav a{display:inline-block;padding:6px 12px;border:1px solid #8DB8FF;border-radius:999px;text-decoration:none;font-size:14px}
.sec{border-top:6px solid #1570EF}.sec.fn{border-top-color:#E5197F}.mod{font-size:16px;color:#1D1A5E;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #DCE4F3}
.it{border:1px solid #DCE4F3;border-left:6px solid #DCE4F3;border-radius:10px;padding:12px 14px;margin:0 0 10px;background:#fff}.it[data-state=Pass]{border-left-color:#1570EF}.it[data-state=Fail]{border-left-color:#E5197F;background:#FFF8FB}.it[data-state=Blocked]{border-left-color:#1D1A5E}.it[data-state="N/A"]{border-left-style:dashed;border-left-color:#8DB8FF}
.it h3{font-size:16px;margin:0 0 2px}.it dl{margin:8px 0 0;display:grid;grid-template-columns:130px 1fr;gap:4px 12px;font-size:14px}.it dt{color:#4A5784;font-weight:600}.it dd{margin:0}.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#4A5784}
.rs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 6px;border:0;padding:0}.rs label.o{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:1px solid #8DB8FF;border-radius:10px;font-weight:600;margin:0;cursor:pointer;background:#fff}.rs input{width:20px;height:20px;margin:0;accent-color:#1570EF}
label.f{display:block;font-weight:600;margin:10px 0 4px;font-size:14px}textarea,input[type=text]{width:100%;padding:10px;border:1px solid #8DB8FF;border-radius:10px;font:inherit;color:inherit;background:#fff}textarea{min-height:56px}.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.warn{background:#FFF8FB;border:1px solid #E5197F;border-radius:10px;padding:10px 12px;font-size:14px}
@media(max-width:600px){.it dl{grid-template-columns:1fr}.it dt{margin-top:4px}}@media print{.top,button,.rs{display:none}body{background:#fff}}`;

  function itemHtml(it) {
    const id = esc(it.id), t = (TYPES[it.type] || [it.type])[0];
    return `<article class="it" data-item="${id}" data-state="none"><h3>${esc(it.title)}</h3><div class="meta">${esc(t)} <span class="id">${id}</span></div>
<dl><dt>What to check</dt><dd>${esc(it.what)}</dd><dt>Expected</dt><dd>${esc(it.expected)}</dd><dt>Source</dt><dd>${esc(it.source)}</dd></dl>
<fieldset class="rs" aria-label="Result for ${esc(it.title)}"><legend class="sr">Result for ${esc(it.title)}</legend>${RESULTS.map(r => `<label class="o"><input type="radio" name="r_${id}" data-r="${id}" value="${esc(r)}"> ${esc(r)}</label>`).join('')}<label class="o"><input type="radio" name="r_${id}" data-r="${id}" value=""> Not run</label></fieldset>
<label class="f" for="c_${id}">Comment</label><textarea id="c_${id}" data-c="${id}" maxlength="2000"></textarea></article>`;
  }
  function sectionHtml(sec, items, intro) {
    const list = items.filter(i => i.section === sec), mods = []; list.forEach(i => { if (!mods.includes(i.module)) mods.push(i.module); });
    return `<section class="sec${sec === 'functional' ? ' fn' : ''}" id="sec-${sec}"><h2>${esc(SECTIONS[sec])}</h2><p class="note">${esc(intro)}</p>${list.length ? mods.map(m => `<h3 class="mod">${esc(m || 'Whole project')}</h3>${list.filter(i => i.module === m).map(itemHtml).join('')}`).join('') : '<p class="note">Nothing to check in this section: the data given names nothing for it.</p>'}</section>`;
  }

  // list = the result of buildFtrChecklist. options: { project:{id,name,customer} (overrides list.project), title }
  function ftrChecklistHtml(list, options) {
    const o = options || {}, l = list || {}, pr = Object.assign({}, l.project || {}, o.project || {}), items = arr(l.items).filter(i => i && i.id && SECTIONS[i.section]);
    const customer = str(pr.customer, 200) || 'Customer', pname = str(pr.name, 200);
    const spec = { schema: SCHEMA, version: VERSION, project: { id: str(pr.id, 80) || slug(pname) || 'project', name: pname }, items: items.map(i => ({ id: i.id, section: i.section, type: i.type, module: i.module || '', title: i.title })) };
    const nav = [['sec-configuration', SECTIONS.configuration], ['sec-functional', SECTIONS.functional], ['save', 'Save your results']];
    const body = `<header class="top"><div class="in"><b>${esc(customer)} and Facilio: FTR checklist</b><span class="cnt" id="cnt-configuration"></span><span class="cnt" id="cnt-functional"></span></div></header>
<main>
<section class="hero" id="welcome"><h1>FTR checklist</h1><p class="lead">${esc(pname)}</p>
<p>Work through the checks and set a result on each: Pass, Fail, Blocked or N/A. Add a comment where it helps. It needs no account and sends nothing anywhere: your progress stays in this browser, and you download your results at the end.</p>
<p class="warn"><b>Two separate lists.</b> Configuration checks look at the setup and do not prove the application works. Functional tests are run in the application. Their results are counted apart and never added together.</p>
<label class="f" for="by">Your name</label><input type="text" id="by" maxlength="120" autocomplete="name">
<nav aria-label="Sections"><ul>${nav.map(n => `<li><a href="#${n[0]}">${esc(n[1])}</a></li>`).join('')}</ul></nav></section>
${sectionHtml('configuration', items, 'Inspect the configuration (XML or Configuration Hub) and compare it with the BRD. A pass here means the setup is as designed, not that it works.')}
${sectionHtml('functional', items, 'Run each test in the application with the role named, and record what you see.')}
${arr(l.gaps).length ? `<section id="gaps"><h2>Not covered</h2><p class="note">The data given for this project had nothing to check for these, so no checks were written. Nothing was guessed.</p><ul class="l">${arr(l.gaps).map(g => `<li>${esc(g)}</li>`).join('')}</ul></section>` : ''}
<section id="save"><h2>Save your results</h2><p>The JSON file holds only the check ids, your results and comments, and your name. Send it back to your Facilio team. The CSV is for reading in Excel.</p>
<div class="row"><button type="button" class="pri" id="dl-json">Download results (JSON)</button><button type="button" id="dl-csv">Download results (CSV)</button></div><p class="note" id="dlnote" aria-live="polite">You can download at any time and again later; your results are kept in this browser.</p></section>
</main>`;
    const js = `(${client.toString()})(document,JSON.parse(document.getElementById('spec').textContent),${makeResult.toString()},${makeCsv.toString()},${JSON.stringify(csvName(spec)).replace(/</g, '\\u003c')});`;
    return K().shell({ title: customer + ' and Facilio: FTR checklist', css: CSS, body, spec, js });
  }
  const api = { buildFtrChecklist, ftrChecklistHtml, makeResult, makeCsv, TYPES, SECTIONS, RESULTS, SCHEMA, VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBFtrHtml = api;
})(typeof window !== 'undefined' ? window : globalThis);
