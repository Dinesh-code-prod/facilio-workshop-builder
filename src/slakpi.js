/* KPIs & SLA matrix (stage 3, Mockup & BRD): where the team records what has to be tracked and how Facilio delivers it.
   SLA matrix: per module and priority, the response and resolution times, the business hours and up to three escalation levels (S.ws.slaMatrix).
   KPIs: the KPI definitions of the KPI workbooks (records of kind kpi), with the module they belong to and the solution (how Facilio delivers it: dashboard, report, field, formula).
   Both go into the BRD (SLA matrix and KPIs sections), the draft UAT test cases, the FTR checklist and the Solution Document. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !F.S) return; const { S, esc } = F; const ACT = V.ACT; const I = () => V.items; const { drawer, closeDrawer, toast, confirmDialog } = V;
  const can = () => !V.isCustomer() && !S.readonly;
  const sla = () => (Array.isArray(S.ws.slaMatrix) ? S.ws.slaMatrix : []);
  const mods = () => F.allModules().filter(m => m.inScope).sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const modLabel = n => (!n || n === '*' ? 'General (all modules)' : ((F.moduleView(n) || {}).label || n));
  const escTxt = r => (r.esc || []).filter(e => e && (e.after || e.to)).map((e, i) => 'L' + (i + 1) + ' after ' + (e.after || '?') + ' to ' + (e.to || '?')).join('; ');
  const th = a => '<thead><tr>' + a.map(x => '<th>' + x + '</th>').join('') + '</tr></thead>';
  function slaCard() {
    const rows = sla().slice().sort((a, b) => String(modLabel(a.module)).localeCompare(modLabel(b.module)) || String(a.priority).localeCompare(String(b.priority)));
    return '<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>SLA matrix</h3><span class="small muted">' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + '</span>' + (can() ? '<button class="btn sm primary" data-act="slaEdit">+ Add SLA row</button>' : '') + '</div><div class="card-b">'
      + (rows.length ? '<div class="tbl-wrap"><table class="tbl">' + th(['Module', 'Priority', 'Response within', 'Resolution within', 'Business hours', 'Escalation', '']) + '<tbody>' + rows.map(r => '<tr><td><b>' + esc(modLabel(r.module)) + '</b></td><td>' + esc(r.priority) + '</td><td>' + esc(r.response) + '</td><td>' + esc(r.resolution) + '</td><td>' + esc(r.hours || '') + '</td><td class="small">' + esc(escTxt(r)) + '</td><td>' + (can() ? '<button class="btn sm" data-act="slaEdit" data-id="' + esc(r.id) + '">Edit</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="small muted" style="margin:0">No SLA row yet. Add one per module and priority. Each row goes into the BRD, the draft UAT test cases, the FTR checklist and the Solution Document.</p>') + '</div></div>';
  }
  function kpiCard() {
    const l = I().list('kpi').sort((a, b) => String(a.group || '').localeCompare(b.group || '') || String(a.name || '').localeCompare(b.name || ''));
    return '<div class="card"><div class="card-h"><h3>KPIs and how Facilio delivers them</h3><span class="small muted">' + l.length + ' KPI' + (l.length === 1 ? '' : 's') + '</span>' + (can() ? '<button class="btn sm primary" data-act="kpiEdit">+ Add KPI</button>' : '') + '<button class="btn sm" data-act="nav" data-view="kpi">Open KPI workbooks</button></div><div class="card-b">'
      + (l.length ? '<div class="tbl-wrap"><table class="tbl">' + th(['KPI', 'Module', 'Source data', 'Frequency', 'Target', 'How Facilio delivers it', '']) + '<tbody>' + l.map(k => '<tr><td><b>' + esc(k.name) + '</b><div class="xs muted">' + esc(k.group || '') + '</div></td><td>' + esc(modLabel(k.module)) + '</td><td class="small">' + esc(k.source || '') + '</td><td>' + esc(k.freq || '') + '</td><td>' + esc(k.target === undefined || k.target === null ? '' : k.target + (k.unit ? ' ' + k.unit : '')) + '</td><td class="small">' + (k.solution ? esc(k.solution) : '<span class="muted">Not written yet</span>') + '</td><td>' + (can() ? '<button class="btn sm" data-act="kpiEdit" data-id="' + esc(k.id) + '">Edit</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="small muted" style="margin:0">No KPI yet. Add the KPIs the customer wants to track and write, for each, how Facilio delivers it (a dashboard, a report, a field or a formula). They go into the BRD, the draft UAT test cases, the FTR checklist and the Solution Document.</p>') + '</div></div>';
  }
  V.slakpi = { html() {
    if (V.isCustomer()) return ''; I().load(['kpi']); const head = '<div class="page-header"><div class="t"><h1>KPIs &amp; SLA matrix</h1><p>What has to be tracked, and how Facilio delivers it. Written once here, it flows into the BRD, the UAT test cases, the FTR checklist and the Solution Document.</p></div></div>';
    if (!I().ready(['kpi'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    return head + '<div class="page-body">' + slaCard() + kpiCard() + '</div>';
  }, mount() { I().load(['kpi']); } };
  ACT.slaEdit = a => {
    if (!can()) return; const id = a.getAttribute('data-id'); const r = id ? sla().find(x => x.id === id) : { module: '', priority: '', response: '', resolution: '', hours: '', esc: [], notes: '' }; if (!r) return; const e = i => (r.esc || [])[i] || {};
    const lvl = i => '<div><label class="f">Level ' + (i + 1) + ': after</label><input type="text" id="sl_ea' + i + '" maxlength="40" value="' + esc(e(i).after || '') + '" placeholder="e.g. 30 min"></div><div><label class="f">Level ' + (i + 1) + ': goes to</label><input type="text" id="sl_er' + i + '" maxlength="80" value="' + esc(e(i).to || '') + '" placeholder="e.g. Supervisor"></div>';
    drawer(id ? 'Edit SLA row' : 'Add SLA row', '<div class="fgrid"><div><label class="f">Module</label><select id="sl_m"><option value="">General (all modules)</option>' + mods().map(m => '<option value="' + esc(m.name) + '"' + (r.module === m.name ? ' selected' : '') + '>' + esc(m.label) + '</option>').join('') + '</select></div><div><label class="f">Priority</label><input type="text" id="sl_p" maxlength="40" value="' + esc(r.priority) + '" placeholder="e.g. Critical"></div>'
      + '<div><label class="f">Response within</label><input type="text" id="sl_r" maxlength="60" value="' + esc(r.response) + '" placeholder="e.g. 30 minutes"></div><div><label class="f">Resolution within</label><input type="text" id="sl_s" maxlength="60" value="' + esc(r.resolution) + '" placeholder="e.g. 4 hours"></div><div class="full"><label class="f">Business hours</label><input type="text" id="sl_h" maxlength="120" value="' + esc(r.hours || '') + '" placeholder="e.g. 24x7, or Sun to Thu 8:00 to 17:00"></div></div>'
      + '<h4 style="margin:12px 0 4px">Escalation (optional)</h4><div class="fgrid">' + lvl(0) + lvl(1) + lvl(2) + '</div><label class="f">Notes</label><textarea id="sl_n" rows="2" maxlength="400">' + esc(r.notes || '') + '</textarea>',
      (id ? '<button class="btn danger" data-act="slaDel" data-id="' + esc(id) + '">Delete</button>' : '') + '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="slaSave" data-id="' + esc(id || '') + '">Save</button>', { wide: true });
  };
  ACT.slaSave = a => { if (!can()) return; const g = i => (document.getElementById(i) || {}).value || ''; if (!g('sl_p').trim() || !g('sl_r').trim() || !g('sl_s').trim()) { toast('Fill the priority, the response time and the resolution time.', 5000, true); return; }
    const id = a.getAttribute('data-id') || ('sla_' + Date.now().toString(36)); const row = { id, module: g('sl_m'), priority: g('sl_p').trim(), response: g('sl_r').trim(), resolution: g('sl_s').trim(), hours: g('sl_h').trim(), esc: [0, 1, 2].map(i => ({ after: g('sl_ea' + i).trim(), to: g('sl_er' + i).trim() })).filter(x => x.after || x.to), notes: g('sl_n').trim() };
    const list = sla().filter(x => x.id !== id).concat(row); S.ws.slaMatrix = list; F.changed('SLA row saved', modLabel(row.module) + ' ' + row.priority); closeDrawer(); V.render(); };
  ACT.slaDel = async a => { if (!can()) return; if (!(await confirmDialog('Delete SLA row', 'Remove this row from the matrix?', 'Delete', true))) return; S.ws.slaMatrix = sla().filter(x => x.id !== a.getAttribute('data-id')); F.changed('SLA row removed', ''); closeDrawer(); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
