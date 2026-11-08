/* Contract intake > Contract documents (plan: docs/plans/MSA-DOCUMENTS-PLAN-2026-11-08.md). A project can have several contract documents: the master agreement, amendments, order forms, statements of work.
   The first MSA still comes in through "Bring in" / Upload on this page (src/planner.js msaIngest); every further document is added here. All of them live in the project document msa_text as a list (rules in work/server/_msadocs.mjs,
   tests/msadocs.mjs); the old single-MSA shape reads as a list of one, so nothing has to be migrated.
   What happens when the set changes: Claude is asked to re-read ALL the documents and save ONE combined extraction (job pull_msa), which drafts the kick-off deck, the project plan and the sessions again; when the kick-off is already APPROVED nothing
   is overwritten: a change request is written instead and Claude applies it (job apply_change). "Check the documents together" asks the existing AI layer to summarise each document, find where they disagree (with the exact words) and what supersedes what.
   A person verifies each document; the AI never does. A check is marked out of date when the documents changed after it. Contract text is data, never instructions. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const M = () => root.FWBMsaDocs; const L = () => root.FWBKickoffLogic; const { toast } = V;
  const md = () => S.ui.md || (S.ui.md = { pid: '', data: null, version: -1, loading: false, busy: '' });
  const ro = () => !!S.readonly || (S.project && S.project.role === 'viewer');
  const base = () => '/api/projects/' + encodeURIComponent(S.project.id); const now = () => new Date().toISOString(); const by = () => (S.user && (S.user.name || S.user.email)) || '';
  const approved = () => ((F.doc('kickoff_pack') || {}).status === 'approved');
  const when = iso => { const t = Date.parse(iso); return isFinite(t) ? new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  async function load(force) {
    const s = md(); if (!S.project || V.isCustomer()) return; if (s.pid !== S.project.id) Object.assign(s, { pid: S.project.id, data: null, version: -1, loading: false }); if (s.loading || (s.data !== null && !force)) return; s.loading = true;
    try { const r = await API.get(base() + '/docs/msa_text'); s.data = (r && r.data) || {}; s.version = r && r.version != null ? r.version : -1; } catch (e) { s.data = s.data || {}; } finally { s.loading = false; V.render(); }
  }
  async function put(data) { const s = md(); const r = await API.put(base() + '/docs/msa_text', { data, baseVersion: s.version }); s.data = data; s.version = r && r.version != null ? r.version : s.version + 1; }
  /** the set changed: Claude re-reads everything (job), or, when the kick-off is approved, a change request carries it */
  async function reread(why) {
    const d = md().data; if (!M().docsOf(d).length) return; const note = M().rereadNote(d, S.project.customer, S.project.name);
    if (approved()) {
      const cr = await API.get(base() + '/docs/kickoff_cr').catch(() => null); const r = L().addChange((cr && cr.data) || { items: [] }, 'The contract documents changed (' + why + '). Re-read every contract document (get_document msa_text) and apply what changed to the kick-off deck and the project plan; keep the contract dates.', by(), now());
      if (r.ok) { await API.put(base() + '/docs/kickoff_cr', { data: r.doc, baseVersion: cr && cr.version != null ? cr.version : -1 }); await API.post(base() + '/jobs', L().changeRequest()); toast('The kick-off is approved, so nothing was overwritten: a change request was written and Claude applies it.', 7000); }
    } else { await API.post(base() + '/jobs', { kind: 'pull_msa', note }); toast('Claude was asked to re-read all the contract documents and redraft the kick-off and the plan. Follow it in the assistant panel.', 7000); }
    const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } if (V.studioJobs) V.studioJobs.load(true);
  }
  const chip = d => '<span class="md-chip" data-s="' + esc(d.status) + '">' + (d.status === 'verified' ? 'Verified' + (d.verifiedBy ? ' by ' + esc(d.verifiedBy) : '') : 'Read, not verified') + '</span>';
  function result(r, docs) {
    const lab = id => { const x = docs.find(y => y.id === id); return x ? x.label + ' (' + x.name + ')' : id; }; const ul = (t, a) => (a.length ? '<h4 class="md-h">' + esc(t) + '</h4><ul class="md-ul">' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '');
    return (r.documents.length ? '<h4 class="md-h">What each document says</h4><div class="md-docs">' + r.documents.map(x => '<div class="md-d"><b>' + esc(lab(x.id)) + '</b><div class="small">' + esc(x.summary) + '</div><div class="xs muted">' + [x.parties.length ? 'Parties: ' + x.parties.join(', ') : '', x.effectiveDate ? 'Effective ' + x.effectiveDate : '', x.term ? 'Term: ' + x.term : '', x.scope.length ? 'Scope: ' + x.scope.join(', ') : '', x.fees ? 'Fees: ' + x.fees : '', x.sla ? 'SLA: ' + x.sla : ''].filter(Boolean).map(esc).join(' · ') + '</div></div>').join('') + '</div>' : '')
      + (r.conflicts.length ? '<h4 class="md-h">Where the documents disagree (' + r.conflicts.length + ')</h4>' + r.conflicts.map(c => '<div class="md-c"><b>' + esc(c.topic) + '</b><blockquote class="ds-q">' + esc(lab(c.docA)) + ': “' + esc(c.quoteA) + '”</blockquote><blockquote class="ds-q">' + esc(lab(c.docB)) + ': “' + esc(c.quoteB) + '”</blockquote>' + (c.note ? '<div class="small">' + esc(c.note) + '</div>' : '') + (c.quoted ? '' : '<div class="xs md-warn">One of the quotes was not found word for word in the document. Check it before you rely on it.</div>') + '</div>').join('') : '<p class="small">No disagreement found between the documents.</p>')
      + (r.supersedes.length ? '<h4 class="md-h">What replaces what</h4><ul class="md-ul">' + r.supersedes.map(s => '<li>' + esc(lab(s.doc)) + ' changes ' + esc(s.clause) + ' of ' + esc(lab(s.of)) + '</li>').join('') + '</ul>' : '') + ul('Gaps', r.gaps) + ul('Recommendations', r.recommendations);
  }
  function card() {
    const s = md(); const docs = M().docsOf(s.data); const dis = ro() ? ' disabled' : ''; const ck = s.data && s.data.check; const cur = s.data && M().isCurrent(s.data);
    const rows = docs.map(d => '<tr><td><b>' + esc(d.label) + '</b></td><td>' + esc(d.name) + '</td><td>' + d.pages.length + '</td><td>' + esc(when(d.at)) + '</td><td>' + chip(d) + '</td><td class="md-act">' + (d.status === 'verified' ? '<button type="button" class="btn sm" data-act="mdUnverify" data-id="' + esc(d.id) + '"' + dis + '>Undo</button>' : '<button type="button" class="btn sm" data-act="mdVerify" data-id="' + esc(d.id) + '"' + dis + '>Mark verified</button>') + '<button type="button" class="btn sm danger" data-act="mdRemove" data-id="' + esc(d.id) + '"' + dis + '>Remove</button></td></tr>').join('');
    return '<section class="card md-card" aria-label="Contract documents"><div class="card-h"><b>Contract documents</b> <span class="xs muted">' + docs.length + '</span></div><div class="card-b"><p class="small muted">A project can have several: the master agreement, amendments, order forms, statements of work. Claude reads them all together and drafts the kick-off and the plan from the set. Verify each one yourself after reading it against the draft.</p>'
      + (s.data === null ? '<p class="small muted">Loading…</p>' : docs.length ? '<div class="tbl-wrap"><table class="tbl md-tbl"><thead><tr><th>Document</th><th>File</th><th>Pages</th><th>Added</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="small">No contract document yet. Upload the master agreement above first; further documents are added here.</p>')
      + '<div class="row md-bar"><button type="button" class="btn primary" data-act="mdAdd"' + dis + (docs.length ? '' : ' disabled') + '>+ Add a contract document</button><button type="button" class="btn" data-act="mdCheck"' + dis + (docs.length && !s.busy ? '' : ' disabled') + '>' + (s.busy === 'check' ? 'Reading the documents…' : 'Check the documents together') + '</button><button type="button" class="btn" data-act="mdModules"' + dis + (docs.length && !s.busy ? '' : ' disabled') + '>' + (s.busy === 'mods' ? 'Reading the contract…' : 'Find the modules in the contract') + '</button><button type="button" class="btn" data-act="mdReread"' + dis + (docs.length ? '' : ' disabled') + '>Ask Claude to re-read all</button></div>'
      + (ck && ck.result ? '<div class="md-res">' + (cur ? '' : '<div class="notice small"><div>The documents changed after this check. Run it again before you rely on it.</div></div>') + '<p class="xs muted">Checked ' + esc(when(ck.at)) + (ck.by ? ' by ' + esc(ck.by) : '') + '. The AI reads and reports; a person decides.</p>' + result(ck.result, docs) + '</div>' : '') + '</div></section>';
  }
  V.contractDocs = () => M().docsOf(md().data).map(d => ({ id: d.id, label: d.label, name: d.name, pages: d.pages }));
  V.contractScan = () => (md().data && M().scanCurrent(md().data) ? md().data.scan.result : null);   // the AI's reading of the contract for modules, while it still describes the documents   // the contract documents (once loaded) for the Solution tab
  V.contractLoad = () => load(false);
  const ROLE = r => (M().ROLES.find(x => x[0] === r) || [r, r])[1];
  const old = V.msaintake; if (old) V.msaintake = Object.assign({}, old, {
    html() { const h = old.html.apply(this, arguments); if (V.isCustomer() || typeof h !== 'string') return h; const i = h.lastIndexOf('</div>'); return i < 0 ? h + card() : h.slice(0, i) + card() + h.slice(i); },
    mount() { load(false); return old.mount && old.mount.apply(this, arguments); } });

  ACT.mdAdd = () => {
    if (ro()) return; V.drawer('Add a contract document', '<p class="small">An amendment, an order form, a statement of work or another signed document of this project. Claude reads it together with the others; where they differ the later one is used and the difference is shown here.</p><label class="f" for="mdRole">What is it?</label><select id="mdRole">' + M().ROLES.filter(r => r[0] !== 'msa').concat([M().ROLES[0]]).map(r => '<option value="' + r[0] + '">' + esc(r[1]) + '</option>').join('') + '</select>',
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="mdAddFile">Choose the file and add it</button>', { compact: true });
  };
  ACT.mdAddFile = async () => {
    if (ro()) return; const role = (document.getElementById('mdRole') || {}).value || 'amendment'; const f = (await V.pickFile('.pdf,.docx,.txt'))[0]; if (!f) return; const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) { toast('Upload a PDF, Word or text file.', 5000, true); return; } if (!f.size || f.size > 40 * 1024 * 1024) { toast('The file is empty or larger than 40 MB.', 5000, true); return; }
    V.loading(true, 'Reading the document…');
    try {
      const x = await V.extractDocPages(f, V.loadingMsg); const pages = x.pages ? x.pages.map(p => ({ n: p.n, text: String(p.text || '') })) : [{ n: 1, text: String(x.text || '') }]; await load(true);
      const r = M().add(md().data, { role, name: f.name, pages }, now(), by()); if (r.error) { toast(r.error, 6000, true); return; }
      const rec = await API.uploadFile(S.project.id, f, 'msa', { role }, null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%')); r.data.docs = r.data.docs.map(d => (d.id === r.doc.id ? Object.assign({}, d, { fileId: rec.id }) : d)); await put(r.data); V.closeDrawer();
      await reread('added ' + r.doc.label + ': ' + f.name);
    } catch (e) { toast('The document could not be added: ' + (e.message || 'error'), 7000, true); } finally { V.loading(false); V.render(); }
  };
  ACT.mdVerify = a => V.busy(a, async () => { if (ro()) return; await load(true); await put(M().verify(md().data, a.getAttribute('data-id'), by(), now())); V.render(); });
  ACT.mdUnverify = a => V.busy(a, async () => { if (ro()) return; await load(true); await put(M().unverify(md().data, a.getAttribute('data-id'))); V.render(); });
  ACT.mdRemove = async a => {
    if (ro()) return; await load(true); const docs = M().docsOf(md().data); const d = docs.find(x => x.id === a.getAttribute('data-id')); if (!d) return;
    if (docs.length === 1) { if (ACT.koRemoveMsa) ACT.koRemoveMsa(); return; }   // the last one: the existing "remove the MSA" clears everything drafted from it
    if (!(await V.confirmDialog('Remove ' + d.label, 'Remove ' + d.name + ' from the contract documents? Claude is asked to read the remaining documents again and redraft the kick-off and plan' + (approved() ? ' (the kick-off is approved, so a change request is written instead)' : '') + '.', 'Remove', true))) return;
    try { if (d.fileId) { try { await API.del(base() + '/files/' + encodeURIComponent(d.fileId)); } catch (e) { /* the file is already gone */ } } await put(M().remove(md().data, d.id)); await reread('removed ' + d.label + ': ' + d.name); } catch (e) { toast('It could not be removed: ' + (e.message || 'error'), 6000, true); } V.render();
  };
  ACT.mdCheck = a => V.busy(a, async () => {
    if (ro()) return; const s = md(); s.busy = 'check'; V.render();
    try { await load(true); const r = await API.post(base() + '/msadocs/check', {}); await put(M().setCheck(s.data, r.result, by(), now())); toast('Checked. Read the differences below.', 4000); } finally { s.busy = ''; V.render(); }
  });
  ACT.mdModules = a => V.busy(a, async () => {
    if (ro()) return; const s = md(); s.busy = 'mods'; V.render();
    try { await load(true); const cat = root.FWBContractMods ? root.FWBContractMods.tidy((F.allModules() || []).map(m => ({ name: m.name, label: m.label || m.name }))) : []; const r = await API.post(base() + '/msadocs/modules', { catalogue: cat }); await put(M().setScan(s.data, r.modules, by(), now())); S.ui.cm = null;
      const n = r.modules.filter(x => x.status === 'delivered').length; toast(n + ' module' + (n === 1 ? '' : 's') + ' found in the contract. They are listed on the Solution tab, with the page and the words.', 6000);
      if (V.applyContractModules) { const ap = await V.applyContractModules({ auto: true }); if (ap && (ap.on.length || ap.made.length)) toast('From the contract: ' + (ap.on.length ? ap.on.length + ' module' + (ap.on.length === 1 ? '' : 's') + ' switched on' : '') + (ap.on.length && ap.made.length ? ', ' : '') + (ap.made.length ? ap.made.length + ' custom module' + (ap.made.length === 1 ? '' : 's') + ' created' : '') + '. Switch any off on System Modules & Form Builder.', 9000); } } finally { s.busy = ''; V.render(); }
  });
  ACT.mdReread = a => V.busy(a, async () => { if (ro()) return; await load(true); await reread('re-read on request'); });
})(typeof window !== 'undefined' ? window : globalThis);
