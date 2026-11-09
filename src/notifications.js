/* Notifications (team only; Solution Design & Configuration › Configuration & Access): who is told what, and when, for a module. Each rule is kept in the
   project's workshop data (S.ws.notifications) and feeds the Org Package Export as a NOTIFICATION component (email channel), so the notification rules
   agreed in the workshops end up in the package the Org Builder skill reads. Other channels (push, SMS, WhatsApp, in-app) are recorded here and listed
   as manual steps in the export report. Nothing is sent from Delivery Studio. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { drawer, closeDrawer, toast, tag, confirmDialog } = V;
  const can = () => !V.isCustomer() && !S.readonly;
  const list = () => (S.ws.notifications = S.ws.notifications || []);
  const CH = [['email', 'Email', true], ['push', 'Push', false], ['sms', 'SMS', false], ['whatsapp', 'WhatsApp', false], ['inapp', 'In-app', false]];
  const label = m => ((F.moduleView && F.moduleView(m)) || {}).label || m;
  function modules() { let all = []; try { all = F.allModules(); } catch (e) { } const rank = m => (m.custom || m.inScope ? 0 : 1); return all.filter(m => m.custom || m.inScope || (m.flowIds || []).length).sort((a, b) => rank(a) - rank(b) || String(a.label || a.name).localeCompare(String(b.label || b.name))); }
  function fieldsOf(mod) { try { return (F.effFields(mod) || []).map(f => ({ name: f.name, label: f.label || f.name, type: f.type || '', lookup: f.lookup || '' })).filter(f => f.name); } catch (e) { return []; } }
  function statesOf(mod) {
    const out = []; const add = l => { if (l && !out.includes(l)) out.push(l); };
    try { Object.values(S.ws.flows || {}).filter(f => f.module === mod).forEach(f => (f.states || []).forEach(s => add(s.label || s.name))); } catch (e) { }
    try { (S.baseline.flows || []).filter(f => f.module === mod).forEach(f => { const m = F.baselineFlowModel(f); (m && m.states || []).forEach(s => add(s.label || s.name)); }); } catch (e) { }
    return out;
  }
  const when = n => n.trigger === 'state' ? 'A record moves to "' + (n.state || '?') + '"' : 'A record is created';
  const chans = n => CH.filter(([k]) => (n.channels || {})[k]).map(([, l]) => l).join(', ') || 'None';
  function reqName(id) { const r = (S.ws.requirements || []).find(x => x.id === id); return r ? r.id : id; }
  V.notifications = {
    html() {
      const L = list(); const ok = L.filter(n => n.status !== 'off').length;
      const head = `<div class="page-header"><div class="t"><h1>Notifications</h1><p>Set who is told what, and when, for each module.${V.featureHidden && V.featureHidden('orgpkg') ? '' : ' These become notification rules in the organisation package (email is exported; other channels are listed as steps to do by hand).'}</p></div>
        <div class="row">${can() ? '<button class="btn primary" data-act="ntEdit">New notification</button>' : ''}${V.featureHidden && V.featureHidden('orgpkg') ? '' : '<button class="btn" data-act="nav" data-view="orgpkg">Open Org Package Export</button>'}</div></div>`;
      if (!L.length) return head + `<div class="page-body"><div class="card empty"><h3>No notifications yet</h3><p>Add the notifications agreed in the workshops, for example "tell the supervisor when an incident is created". ${V.featureHidden && V.featureHidden('orgpkg') ? '' : 'They are included in the Org Package Export once the BRD is signed off.'}</p>${can() ? '<button class="btn primary" data-act="ntEdit">New notification</button>' : ''}</div></div>`;
      const rows = L.map(n => `<tr><td><b>${esc(n.name)}</b>${n.note ? `<div class="xs muted">${esc(n.note)}</div>` : ''}</td><td>${esc(label(n.module))}</td><td>${esc(when(n))}</td><td>${esc(chans(n))}</td><td class="small">${esc((n.recipients || []).join(', ') || (n.toField ? 'The person in "' + n.toField + '"' : 'The current user'))}</td><td>${n.status === 'off' ? tag('low', 'Off') : tag('green', 'On')}${(n.reqs || []).length ? `<div class="xs muted">${n.reqs.map(r => esc(reqName(r))).join(', ')}</div>` : ''}</td>
        <td>${can() ? `<button class="btn sm" data-act="ntEdit" data-id="${esc(n.id)}">Edit</button> <button class="btn sm danger" data-act="ntDel" data-id="${esc(n.id)}">Delete</button>` : ''}</td></tr>`).join('');
      return head + `<div class="page-body"><div class="grid g4" style="margin-bottom:14px"><div class="card stat"><div class="v">${L.length}</div><div class="l">Notifications</div></div><div class="card stat"><div class="v">${ok}</div><div class="l">On</div></div><div class="card stat"><div class="v">${L.filter(n => (n.channels || {}).email).length}</div><div class="l">By email (exported)</div></div><div class="card stat"><div class="v">${L.filter(n => ['push', 'sms', 'whatsapp', 'inapp'].some(k => (n.channels || {})[k])).length}</div><div class="l">Other channels (manual)</div></div></div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Notification</th><th>Module</th><th>When</th><th>Channels</th><th>Who gets it</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
    }
  };
  function formHtml(n) {
    const mods = modules(); const mod = n.module || (mods[0] && mods[0].name) || ''; const st = statesOf(mod); const fl = fieldsOf(mod); const reqs = S.ws.requirements || [];
    const opt = (v, cur, l) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
    return `<label class="f" for="nt_name">Name *</label><input id="nt_name" type="text" maxlength="120" value="${esc(n.name || '')}" placeholder="e.g. Incident reported">
      <label class="f" for="nt_mod">Module *</label><select id="nt_mod" data-change="ntModule">${mods.map(m => opt(m.name, mod, (m.label || m.name) + (m.custom ? ' (custom)' : ''))).join('')}</select>
      <label class="f" for="nt_trig">When *</label><select id="nt_trig" data-change="ntModule">${opt('created', n.trigger || 'created', 'A record is created')}${opt('state', n.trigger || 'created', 'A record moves to a state')}</select>
      ${(n.trigger || 'created') === 'state' ? `<label class="f" for="nt_state">State *</label>${st.length ? `<select id="nt_state">${st.map(x => opt(x, n.state, x)).join('')}</select>` : `<input id="nt_state" type="text" value="${esc(n.state || '')}" placeholder="State name">`}<div class="xs muted">State rules are exported for new custom modules only.</div>` : ''}
      <label class="f">Channels</label><div class="row" style="gap:14px;flex-wrap:wrap">${CH.map(([k, l, ex]) => `<label class="row" style="gap:6px"><input type="checkbox" id="nt_ch_${k}" ${((n.channels || { email: true })[k]) ? 'checked' : ''}> ${l}${ex ? '' : ' <span class="xs muted">(manual)</span>'}</label>`).join('')}</div>
      <label class="f" for="nt_rec">Who gets it (roles or people, one per line or separated by commas)</label><textarea id="nt_rec" rows="2" placeholder="e.g. Supervisor, Requester">${esc((n.recipients || []).join(', '))}</textarea>
      <details class="adv"${(n.toField || (n.reqs || []).length || n.note || n.status === 'off') ? ' open' : ''} style="margin:10px 0"><summary>More options: send to a field, requirements, status, note</summary>
      <label class="f" for="nt_to">Send to the person in this field (optional)</label><select id="nt_to"><option value="">The current user</option>${fl.filter(f => /lookup/i.test(f.type) || f.lookup).map(f => opt(f.name, n.toField, f.label)).join('')}</select>
      <label class="f" for="nt_sub">Email subject</label><input id="nt_sub" type="text" maxlength="200" value="${esc(n.subject || '')}" placeholder="e.g. New incident reported - \${${esc(mod)}.id}">
      <label class="f" for="nt_msg">Email message</label><textarea id="nt_msg" rows="6" placeholder="Write the message. Use fields as placeholders, for example \${${esc(mod)}.name}.">${esc(n.message || '')}</textarea>
      <div class="row" style="gap:8px"><select id="nt_ins" aria-label="Insert a field"><option value="">Insert a field…</option>${fl.slice(0, 120).map(f => `<option value="\${${esc(mod)}.${esc(f.name)}}">${esc(f.label)}</option>`).join('')}</select><button class="btn sm" type="button" data-act="ntInsert">Insert</button></div>
      <label class="f" for="nt_reqs">Comes from requirement(s)</label><select id="nt_reqs" multiple size="4">${reqs.map(r => `<option value="${esc(r.id)}"${(n.reqs || []).includes(r.id) ? ' selected' : ''}>${esc(r.id)} ${esc(String(r.title || '').slice(0, 70))}</option>`).join('')}</select><div class="xs muted">Hold Ctrl to pick several. The export is Ready only when the requirement is Confirmed and the BRD is signed off.</div>
      <label class="f" for="nt_status">Status</label><select id="nt_status">${opt('on', n.status === 'off' ? 'off' : 'on', 'On')}${opt('off', n.status === 'off' ? 'off' : 'on', 'Off')}</select>
      <label class="f" for="nt_note">Note (optional)</label><input id="nt_note" type="text" maxlength="300" value="${esc(n.note || '')}"></details>`;
  }
  const draft = () => { const v = id => (document.getElementById(id) || {}).value; const ch = {}; CH.forEach(([k]) => { const e = document.getElementById('nt_ch_' + k); ch[k] = !!(e && e.checked); }); const reqs = [...(document.getElementById('nt_reqs') || { selectedOptions: [] }).selectedOptions].map(o => o.value);
    return { id: S.ui.ntId || '', name: (v('nt_name') || '').trim(), module: v('nt_mod') || '', trigger: v('nt_trig') || 'created', state: v('nt_state') || '', channels: ch, recipients: String(v('nt_rec') || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean).slice(0, 20), toField: v('nt_to') || '', subject: (v('nt_sub') || '').trim(), message: v('nt_msg') || '', reqs, status: v('nt_status') === 'off' ? 'off' : 'on', note: (v('nt_note') || '').trim() }; };
  ACT.ntEdit = a => { if (!can()) return; const id = a && a.getAttribute && a.getAttribute('data-id'); S.ui.ntId = id || ''; const n = id ? (list().find(x => x.id === id) || {}) : { channels: { email: true } };
    drawer(id ? 'Edit notification' : 'New notification', formHtml(n), `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ntSave">Save</button>`, { wide: true }); };
  ACT.ntModule = () => { const d = draft(); S.ui.ntDraft = d; drawer(S.ui.ntId ? 'Edit notification' : 'New notification', formHtml(d), `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ntSave">Save</button>`, { wide: true }); };
  ACT.ntInsert = () => { const sel = document.getElementById('nt_ins'); const ta = document.getElementById('nt_msg'); if (!sel || !ta || !sel.value) return; const p = ta.selectionStart == null ? ta.value.length : ta.selectionStart; ta.value = ta.value.slice(0, p) + sel.value + ta.value.slice(p); ta.focus(); };
  ACT.ntSave = () => { if (!can()) return; const d = draft(); const bad = m => { toast(m, 5000, true); return true; };
    if (!d.name) { bad('Please give the notification a name'); return; } if (!d.module) { bad('Choose a module'); return; } if (d.trigger === 'state' && !d.state) { bad('Choose the state'); return; }
    if (!Object.values(d.channels).some(Boolean)) { bad('Choose at least one channel'); return; } if (d.channels.email && (!d.subject || !d.message.trim())) { bad('An email needs a subject and a message'); return; }
    const L = list(); const i = d.id ? L.findIndex(x => x.id === d.id) : -1; if (i >= 0) L[i] = Object.assign({}, L[i], d); else L.push(Object.assign({}, d, { id: 'nt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }));
    F.changed(i >= 0 ? 'Notification updated' : 'Notification added', d.name); closeDrawer(); toast('Notification saved'); };
  ACT.ntDel = a => { if (!can()) return; const id = a.getAttribute('data-id'); const n = list().find(x => x.id === id); if (!n) return; confirmDialog('Delete notification', 'Delete "' + n.name + '"? It will no longer be in the package.', 'Delete', true).then(ok => { if (!ok) return; S.ws.notifications = list().filter(x => x.id !== id); F.changed('Notification deleted', n.name); }); };
})(typeof window !== 'undefined' ? window : globalThis);
