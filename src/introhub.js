/* Project introduction hub (team only): one menu entry under Contract intake with three sub-tabs, each showing an existing page unchanged:
   Kick-off and agreed scope (view kickoff, src/kickoff.js) · Project plan (view plan, src/plan.js) · Requirement schedule (view rsplan, the workshop plan, src/requirements.js).
   Old links (#/p/<id>/kickoff, /plan, /rsplan and every button that goes there) land in the right tab through V.hubRoute. Customers keep their own pages.
   The pages are read when the hub draws, so it does not matter in which order the files load. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews;
  const TABS = [['kickoff', 'Kick-off and agreed scope'], ['plan', 'Project plan'], ['rsplan', 'Requirement schedule']];
  const is = k => TABS.some(t => t[0] === k);
  const cur = () => (is(S.ui.introTab) ? S.ui.introTab : 'kickoff');
  const team = () => !!S.user && S.user.kind !== 'customer';
  const prev = V.hubRoute;
  V.hubRoute = view => { const r = prev ? prev(view) : view; if (team() && is(r)) { S.ui.introTab = r; return 'intro'; } return r; };
  // ---- Import a reference (10 Nov 2026): a deck, plan or schedule another team made. Claude reads how it is built and prepares this project's the same way, with the facts from the contract.
  // Stored in the team-only project document kickoff_refs: { items: [{ id, target: kickoff | plan | rsplan, name, notes, text, by, at }] }; Claude reads it with get_document kickoff_refs and works through the job make_from_reference.
  const API = root.FWBApi, ACT = V.ACT, { esc } = F;
  const LABEL = { kickoff: 'kick-off deck', plan: 'project plan', rsplan: 'requirement schedule' };
  const rs = () => S.ui.refs || (S.ui.refs = { pid: '', data: null, version: -1, loading: false });
  const rbase = () => '/api/projects/' + encodeURIComponent(S.project.id);
  const items = () => { const s = rs(); return s.pid === (S.project && S.project.id) && s.data && Array.isArray(s.data.items) ? s.data.items : []; };
  const refCount = t => items().filter(x => x.target === t).length;
  async function loadRefs(force) {
    const s = rs(); if (!S.project || !team()) return; if (s.pid !== S.project.id) Object.assign(s, { pid: S.project.id, data: null, version: -1, loading: false }); if (s.loading || (s.data !== null && !force)) return; s.loading = true;
    try { const r = await API.get(rbase() + '/docs/kickoff_refs'); s.data = (r && r.data) || { items: [] }; s.version = r && r.version != null ? r.version : -1; } catch (e) { s.data = s.data || { items: [] }; } finally { s.loading = false; V.render(); }
  }
  async function saveRefs(list) { const s = rs(); const data = { items: list }; const r = await API.put(rbase() + '/docs/kickoff_refs', { data, baseVersion: s.version }); s.data = data; s.version = r && r.version != null ? r.version : s.version + 1; }
  const xml = x => x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  /** the text of a reference file: slides for PowerPoint, rows for Excel, and the contract reader for Word, PDF and text */
  async function refText(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'pptx') {
      await V.loadScript('vendor/jszip.min.js'); const z = await root.JSZip.loadAsync(file); const num = n => Number((n.match(/(\d+)\.xml$/) || [0, 0])[1]);
      const names = Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b)); const out = [];
      for (let i = 0; i < names.length; i++) { const x = await z.file(names[i]).async('string'); out.push('Slide ' + (i + 1) + ': ' + [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => xml(m[1])).join(' | ')); }
      return out.join('\n');
    }
    if (ext === 'xlsx') {
      const E = (await V.loadExcelJS()) || root.ExcelJS; const wb = new E.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const out = [];
      const cell = v => v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'object' ? String(v.text || (v.richText && v.richText.map(r => r.text).join('')) || (v.result != null ? v.result : '') || '') : String(v);
      wb.eachSheet(ws => { out.push('Sheet: ' + ws.name); let n = 0; ws.eachRow(row => { if (n++ < 400) out.push((Array.isArray(row.values) ? row.values.slice(1) : []).map(cell).join(' | ')); }); });
      return out.join('\n');
    }
    return V.extractDocPages ? (await V.extractDocPages(file)).text : await file.text();
  }
  let picked = null;
  const approved = () => ((F.doc('kickoff_pack') || {}).status === 'approved');
  function refDrawer() {
    const t = cur(), mine = items().filter(x => x.target === t);
    const list = mine.length ? '<div class="stack" style="gap:8px;margin:0 0 16px">' + mine.map(x => '<div class="row" style="justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid var(--cs-st2);border-radius:12px"><div><b>' + esc(x.name) + '</b><div class="xs muted">' + esc(x.by || '') + ' · ' + esc(String(x.at || '').slice(0, 10)) + ' · ' + Math.round(String(x.text || '').length / 1000) + 'k characters' + (x.notes ? ' · ' + esc(x.notes).slice(0, 80) : '') + '</div></div><div class="row" style="gap:6px"><button type="button" class="btn sm" data-act="refRun" data-id="' + esc(x.id) + '">Ask Claude again</button><button type="button" class="btn sm ghost" data-act="refDel" data-id="' + esc(x.id) + '">Remove</button></div></div>').join('') + '</div>' : '';
    V.drawer('Import a reference for the ' + LABEL[t], '<p class="small muted" style="margin-top:0">Choose a ' + LABEL[t] + ' another team made (PowerPoint, Excel, Word, PDF or text). Claude reads how it is built: the order, headings, wording and level of detail. It then prepares yours the same way, taking the facts from this project\'s contract. Nothing from the reference\'s own customer is copied.</p>'
      + list + '<div class="np-drop" id="rf_drop" data-act="refPick" style="padding:18px;text-align:center;cursor:pointer;margin-bottom:12px"><b id="rf_file">Choose the reference file</b><div class="xs muted">.pptx, .xlsx, .docx, .pdf, .txt</div></div>'
      + '<label class="f" for="rf_notes">What should Claude copy? (optional)</label><textarea id="rf_notes" rows="3" placeholder="For example: the same slide order and wording, the same plan phases, one session per module" style="width:100%"></textarea>'
      + '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="btn" data-act="closeDrawer">Cancel</button><button type="button" class="btn primary" data-act="refSave">Import and ask Claude</button></div>');
  }
  async function askClaude(t, name, notes) {
    if (t === 'kickoff' && approved()) { V.toast('Saved. The kick-off is already approved, so nothing was changed: raise a change request or ask Claude from the assistant.', 7000); return; }
    await API.post(rbase() + '/jobs', { kind: 'make_from_reference', note: 'Reference "' + name + '" for the ' + LABEL[t] + '. ' + String(notes || '').slice(0, 400) + ' [target ' + t + ']' }); if (V.studioJobs) await V.studioJobs.load(true, true); if (V.asstRequested) V.asstRequested();
    const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } if (V.studioJobs) V.studioJobs.load(true);
    V.toast('Claude was asked to read the reference and prepare the ' + LABEL[t] + ' the same way from the contract. Follow it in the assistant panel.', 7000);
  }
  ACT.refOpen = () => { picked = null; loadRefs(true).then(refDrawer); refDrawer(); };
  ACT.refPick = async () => { const f = (await V.pickFile('.pptx,.xlsx,.docx,.pdf,.txt,.csv,.md'))[0]; if (!f) return; picked = f; const el = document.getElementById('rf_file'); if (el) el.textContent = f.name + ' · ' + V.fmtSize(f.size); };
  ACT.refSave = async () => {
    if (!picked) { V.toast('Choose a file first'); return; } const f = picked, t = cur(), notes = ((document.getElementById('rf_notes') || {}).value || '').trim();
    V.loading(true, 'Reading the reference…');
    try {
      await loadRefs(true); let text = await refText(f); text = String(text || '').slice(0, 60000); if (text.trim().length < 20) { V.toast('Nothing readable was found in that file. Try a PowerPoint, Excel or Word copy.', 6000, true); return; }
      const list = items().slice(); if (list.length >= 6) { V.toast('Six references is the limit: remove one first.', 5000, true); return; }
      list.unshift({ id: F.uid('rf'), target: t, name: f.name, notes, text, by: (S.user && (S.user.name || S.user.email)) || '', at: new Date().toISOString() });
      await saveRefs(list); picked = null; V.closeDrawer(); await askClaude(t, f.name, notes);
    } catch (e) { V.toast('Could not import: ' + String((e && e.message) || e).slice(0, 140), 6000, true); } finally { V.loading(false); V.render(); }
  };
  ACT.refDel = async a => { const id = a.getAttribute('data-id'); await loadRefs(true); await saveRefs(items().filter(x => x.id !== id)); refDrawer(); V.render(); };
  ACT.refRun = async a => { const x = items().find(r => r.id === a.getAttribute('data-id')); if (x) { V.closeDrawer(); await askClaude(x.target, x.name, x.notes); } };
  V.intro = {
    html() {
      const t = cur(), b = V[t]; if (!b || !b.html) return '';
      const n = refCount(t), canRef = team() && !S.readonly && !(S.project && S.project.role === 'viewer');
      const tabs = `<div class="tabs hub-tabs" role="tablist" aria-label="Project introduction" style="margin-bottom:0">${TABS.map(([k, l]) => `<button class="tab${t === k ? ' active' : ''}" role="tab" aria-selected="${t === k}" data-act="hubTab" data-key="introTab" data-v="${k}">${l}</button>`).join('')}</div>`;
      const bar = `<div class="hub-top" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">${tabs}${canRef ? `<button type="button" class="btn sm" data-act="refOpen" title="Import a deck, plan or schedule another team made, so Claude builds yours the same way from this contract">Import a reference${n ? ' · ' + n : ''}</button>` : ''}</div>`;
      const html = b.html(); const at = ['<div class="tabs"', '<div class="page-body'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];
      return at === undefined ? bar + html : html.slice(0, at) + bar + html.slice(at);
    },
    mount() { loadRefs(); const b = V[cur()]; if (b && b.mount) b.mount(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
