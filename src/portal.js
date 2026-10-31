/* Customer Portal controls: which tabs a customer sees, which sensitive blocks are released, what they may change, which
   modules are hidden. The server reads the same portal_controls section, so a switch here is enforced there too. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { tag, toast } = V;
  const TABS = [['cust_home', 'Welcome'], ['prepare', 'Learn & Prepare'], ['seefacilio', 'Product Tour'], ['learnlib', 'Module guides'], ['explore', 'Discover more'], ['whatsnew', "What's new"], ['kickoff', 'Kick-off'], ['contract', 'Know Your Contract'], ['scope', 'Scope'], ['plan', 'Project Plan and Timeline'], ['schedule', 'Workshop Schedule'], ['guide', 'Customer User Guide'], ['dashboards', 'Dashboard Gallery'], ['onboarding', 'Data Onboarding'], ['governance', 'Governance'], ['changes', 'Change Requests'], ['delivery', 'Build, UAT & Go-Live'], ['overview', 'Actions and decisions'], ['showcase', 'Explore Facilio (published entries only)']];
  const SHOW = [['fees', 'Fees and payment milestones (Know Your Contract)'], ['rates', 'Rate card'], ['legal', 'Liability, penalties and law'], ['risks', 'Risks and issues (RAID log)'], ['trainers', 'Trainer names on workshops']];
  const ALLOW = [['answers', 'Answer workshop questions'], ['discuss', 'Post in discussions'], ['actions', 'Add and update their own actions'], ['signoff', 'Sign off documents'], ['raid', 'Add risks and issues'], ['cr', 'Raise change requests'], ['onboarding', 'Upload data onboarding workbooks']];
  const CADENCE = [['', 'Not set'], ['weekly', 'Weekly'], ['fortnightly', 'Fortnightly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly']];
  const row = (grp, k, l, on) => `<label class="pt-row"><span>${esc(l)}</span><label class="switch"><input type="checkbox" ${on ? 'checked' : ''} ${S.readonly ? 'disabled' : ''} data-change="ptSet" data-g="${grp}" data-k="${k}"><span></span></label></label>`;
  V.portal = {
    html() {
      const c = V.controls(); const mods = F.allModules().filter(m => m.inScope).sort((a, b) => a.label.localeCompare(b.label)); const hid = c.hiddenModules || [];
      const nav = (V.navForCustomer ? V.navForCustomer() : []);
      return `<div class="page-header"><div class="t"><h1>Customer Portal</h1><p>Decide what the customer sees. Each switch is enforced by the server, so a hidden item is never sent to the customer's browser.</p></div></div><div class="page-body">
      <div class="grid g2"><div>
        <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Customer menu</h3></div><div class="card-b">${TABS.map(([k, l]) => row('tabs', k, l, c.tabs[k] !== false)).join('')}</div></div>
        <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Sensitive content</h3></div><div class="card-b">${SHOW.map(([k, l]) => row('show', k, l, c.show[k] !== false)).join('')}<div class="xs muted" style="margin-top:8px">Money, rate card and legal sections stay hidden until switched on.</div></div></div>
        <div class="card"><div class="card-h"><h3>What the customer may do</h3></div><div class="card-b">${ALLOW.map(([k, l]) => row('allow', k, l, c.allow[k] !== false)).join('')}</div></div>
      </div><div>
        <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Modules hidden from the customer</h3></div><div class="card-b">${mods.map(m => `<label class="pt-row"><span>${esc(m.label)}</span><label class="switch"><input type="checkbox" ${hid.includes(m.name) ? 'checked' : ''} ${S.readonly ? 'disabled' : ''} data-change="ptHide" data-m="${esc(m.name)}"><span></span></label></label>`).join('') || '<span class="muted small">No modules in scope.</span>'}<div class="xs muted" style="margin-top:8px">On = hidden. Records tied to a hidden module are not sent to the customer.</div></div></div>
        <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Governance cadence</h3></div><div class="card-b"><select data-change="ptCad" ${S.readonly ? 'disabled' : ''}>${CADENCE.map(([v, l]) => `<option value="${v}" ${(c.cadence || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select><div class="xs muted" style="margin-top:6px">Used to show the next steering meeting on the timeline.</div></div></div>
        <div class="card"><div class="card-h"><h3>Preview as the customer</h3></div><div class="card-b small"><div class="muted" style="margin-bottom:8px">The customer menu as it will appear, and the sections released to them:</div>${TABS.filter(([k]) => c.tabs[k] !== false).map(([, l]) => `<span class="chip">${esc(l)}</span>`).join(' ') || '<span class="muted">No tabs are on.</span>'}
          <div style="margin-top:10px">${SHOW.map(([k, l]) => `<div>${c.show[k] !== false ? tag('green', 'Visible') : tag('low', 'Hidden')} ${esc(l)}</div>`).join('')}</div>
          <div class="xs muted" style="margin-top:10px">To see the real thing, open the customer link in a private window and sign in with the access code (Project Settings).</div></div></div>
      </div></div></div>`;
    }, mount() { }
  };
  const save = (what, detail) => { F.markDirty && F.markDirty('portal_controls'); F.changed(what, detail, { section: 'portal_controls' }); V.render(); };
  ACT.ptSet = el => { if (S.readonly) return; const c = F.doc('portal_controls'); const g = el.getAttribute('data-g'), k = el.getAttribute('data-k'); c[g] = Object.assign({}, c[g] || {}); c[g][k] = el.checked; save('Customer portal updated', g + '.' + k + ' ' + (el.checked ? 'on' : 'off')); };
  ACT.ptHide = el => { if (S.readonly) return; const c = F.doc('portal_controls'); const set = new Set(c.hiddenModules || []); el.checked ? set.add(el.getAttribute('data-m')) : set.delete(el.getAttribute('data-m')); c.hiddenModules = [...set]; save('Customer portal updated', 'Hidden modules'); };
  ACT.ptCad = el => { if (S.readonly) return; const c = F.doc('portal_controls'); if (el.value) c.cadence = el.value; else delete c.cadence; save('Customer portal updated', 'Cadence'); };
})(typeof window !== 'undefined' ? window : globalThis);
