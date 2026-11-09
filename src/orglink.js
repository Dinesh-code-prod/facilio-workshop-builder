/* Project details > Org package folder: link the project to its folder in facilio-config-data by reading the repository's small repo_index.json (about 4 KB, picked by the person; the page never reads their drive on its own).
   The org id, the imported package's org id and the folder are compared (src/orglogic.js) and a disagreement is shown in words. The connector hands the folder to Claude (project_overview > organisation). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const O = () => root.FWBOrg; const { drawer, closeDrawer, toast } = V;
  // only the customer's own imported package has an org id worth comparing; the bundled reference configuration belongs to another organisation and is never shown
  const pkgId = () => { const B = S.baseline; return F.doc('config').source === 'imported' ? String((B && B.meta && B.meta.orgId) || '') : ''; };
  let cand = [];
  const cmpOf = (o) => { const p = S.ws.project || {}; return O().compare(Object.assign({ orgId: p.orgId, packageOrgId: pkgId(), folder: p.orgFolder }, o)); };
  V.orgLinkHtml = () => {
    if (V.featureHidden && V.featureHidden('orgpkg')) return '';
    const cmp = cmpOf();
    return `<div class="full"><label class="f">Org package folder (in facilio-config-data)</label><div class="row" style="gap:8px;align-items:center"><div style="flex:1">${V.inp('project.orgFolder', 'e.g. us/400000077-CustomerName')}</div>${S.readonly ? '' : '<button type="button" class="btn sm" data-act="orgPick">Find it in my facilio-config-data</button>'}</div>
      <div class="xs" style="margin-top:6px"><div id="orgCmp" class="${cmp.state === 'mismatch' ? 'notice warn' : 'muted'}">${esc(cmp.text)}</div> Claude and the Facilio skills use this folder to find the org package. Choose <b>repo_index.json</b> from the top folder of your facilio-config-data copy (fetch it in GitHub Desktop first).</div></div>`;
  };
  // the agree / disagree line follows what is typed, without redrawing the page
  document.addEventListener('input', e => { const b = e.target.getAttribute && e.target.getAttribute('data-bind'); const el = document.getElementById('orgCmp'); if (!el || (b !== 'project.orgId' && b !== 'project.orgFolder')) return; const c = cmpOf(b === 'project.orgId' ? { orgId: e.target.value } : { folder: e.target.value }); el.textContent = c.text; el.className = c.state === 'mismatch' ? 'notice warn' : 'muted'; });
  function apply(e) { const p = S.ws.project; p.orgFolder = e.folder; if (!String(p.orgId || '').trim()) p.orgId = e.id; F.changed('Edited', 'project › orgFolder', { render: true }); toast('Linked to ' + e.folder, 4000); }
  ACT.orgPick = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = async () => {
      const f = i.files[0]; if (!f) return; if (f.size > 2e6) { toast('That file is too large to be repo_index.json (it is about 4 KB). Pick the one in the top folder of facilio-config-data.', 7000, true); return; }
      let idx; try { idx = JSON.parse(await f.text()); } catch (e) { toast('That is not a readable repo_index.json.', 5000, true); return; }
      if (!O().entries(idx).length) { toast('No org folders in that file. Pick repo_index.json from the top folder of facilio-config-data.', 7000, true); return; }
      const p = S.ws.project; const id = String(p.orgId || '').trim() || pkgId(); const hits = O().findOrgs(idx, { orgId: id, customer: S.project.customer });
      if (!hits.length) { toast(id ? 'Org ' + id + ' is not in facilio-config-data yet. Fetch the repository again, or ask the platform team to add it.' : 'No folder matches this customer. Type the org id in Org ID above, then try again.', 8000, true); return; }
      if (hits.length === 1) { apply(hits[0]); return; }
      cand = hits; drawer('Which org is this project?', `<p class="small muted" style="margin-top:0">Several folders could match ${esc(S.project.customer || 'this customer')}. Pick the right one.</p>${hits.map((h, k) => `<div class="row" style="gap:8px;padding:6px 0;border-bottom:1px solid #eef1f7"><div style="flex:1"><b>${esc(h.name)}</b><div class="xs muted">${esc(h.folder)}</div></div><button type="button" class="btn sm primary" data-act="orgUse" data-i="${k}">Use this</button></div>`).join('')}`, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button>');
    };
    i.click();
  };
  ACT.orgUse = a => { const e = cand[Number(a.getAttribute('data-i'))]; if (!e) return; closeDrawer(); apply(e); };
})(typeof window !== 'undefined' ? window : globalThis);
