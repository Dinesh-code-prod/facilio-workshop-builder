/* SharePoint project folders, page side (user, 16 Nov 2026; server: work/server/_sharepoint.mjs). Once the folder is set up for the app:
   - every project file (uploads, exports, what Claude saved) is copied to the project's SharePoint folder in the background, a few at a time;
   - an export a team member downloads from any page is also kept in the project (category "export", one file per document, so saving again makes a version);
   - after a person's own save the assistant shows "Saved to SharePoint" with an Open button.
   Nothing happens for customers, viewers, or while SharePoint is not set up. Project Settings > Team shows the folder, what is waiting and Update access. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = () => root.FWBApi;
  const st = { cfg: null, pid: null, last: 0, running: false, queue: [], announce: new Set(), info: null };
  const KEEP = /\.(docx|pdf|xlsx|xlsm|xls|csv|pptx|md|html?|zip|png|svg)$/i;   // what counts as an exported document (prompts, JSON and backups stay local)
  const team = () => !!(S.project && S.user && !(V.isCustomer && V.isCustomer()) && !S.readonly && S.project.role !== 'viewer');
  const base = () => '/api/projects/' + S.project.id;
  async function configured() { if (st.cfg === null) { try { st.cfg = !!(await API().get('/api/sharepoint/status')).configured; } catch (e) { st.cfg = false; } } return st.cfg; }
  async function copy(fid) { const s = await API().post(base() + '/files/' + fid + '/sharepoint', {}); if (!s.parts) return null; let r = null; for (let i = 0; i < s.parts; i++) r = await API().post(base() + '/files/' + fid + '/sharepoint', { part: i }); return r; }
  async function info() { try { st.info = await API().get(base() + '/sharepoint'); } catch (e) { st.info = null; } return st.info; }
  async function run() {
    if (st.running || !team() || !(await configured())) return; st.running = true; st.last = Date.now(); const pid = S.project.id;
    try {
      for (let round = 0; round < 20 && S.project && S.project.id === pid; round++) {
        const inf = await info(); if (!inf || !inf.pending.length) break;
        const ids = st.queue.concat(inf.pending.map(p => p.id)).filter((x, i, a) => a.indexOf(x) === i && inf.pending.some(p => p.id === x)); st.queue = []; let any = false;
        for (const id of ids.slice(0, 10)) {
          if (!S.project || S.project.id !== pid) break; const p = inf.pending.find(x => x.id === id); let r;
          try { r = await copy(id); } catch (e) { if (st.announce.delete(id)) V.toast('Could not copy ' + p.name + ' to SharePoint: ' + e.message, 7000, true); if (e.status === 424 || e.status === 503) return; continue; }
          if (r && r.done) { any = true; if (st.announce.delete(id) && V.asstSay) V.asstSay('Saved to SharePoint: ' + p.name + ' (' + r.folder + ').', r.url ? [{ label: 'Open in SharePoint', act: 'spOpen', attrs: { u: r.url }, primary: true }] : []); }
        }
        if (!any) break;
      }
    } finally { st.running = false; await info(); if (S.ui && S.ui.view === 'settings') V.render(); }
  }
  V.spRun = run;
  // every 20 seconds: a newly opened project starts a pass; otherwise a pass every 10 minutes catches files Claude saved meanwhile
  setInterval(() => { if (!S.project) return; if (S.project.id !== st.pid) { st.pid = S.project.id; st.info = null; run(); } else if (Date.now() - st.last > 10 * 60e3) run(); }, 20000);

  // a file the person saved: copy it now and tell them where it went
  const up = API().uploadFile.bind(API());
  API().uploadFile = async function (pid, file, category, meta) { const f = await up.apply(null, arguments); if (f && f.id && team() && st.cfg !== false && !(meta && meta.quiet)) { st.queue.push(f.id); st.announce.add(f.id); setTimeout(run, 0); } return f; };
  // an export downloaded from a page is also kept in the project (user, 25 Nov 2026: always, not only with SharePoint), so it is in the project backup, and reaches SharePoint once that is set up
  const dl = V.download;
  V.download = function (name, data, mime) {
    dl.apply(this, arguments);
    if (!team() || !KEEP.test(String(name || ''))) return;
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }); if (blob.fromProject || !blob.size || blob.size > 100e6) return;   // a file that is already in the project is not saved twice
    const view = String((S.ui && S.ui.view) || ''); const pid = S.project.id;
    API().uploadFile(pid, new File([blob], name, { type: blob.type || mime || 'application/octet-stream' }), 'export', { view }).catch(e => V.toast('The export was downloaded but not saved to the project: ' + e.message, 6000, true));
  };

  ACT.spOpen = a => { const u = a.getAttribute('data-u'); if (/^https:\/\/[^/]+\.sharepoint\.(com|us)\//i.test(u || '')) window.open(u, '_blank', 'noopener'); };
  ACT.spCopyNow = a => V.busy(a, async () => { st.last = 0; await run(); V.toast(st.info && st.info.pendingTotal ? st.info.pendingTotal + ' file(s) are still waiting.' : 'Every file is in SharePoint.'); });
  ACT.spAccess = a => V.busy(a, async () => { const r = await API().post(base() + '/sharepoint/access', {}); await info(); V.toast('Access updated: ' + r.granted + ' added, ' + r.removed + ' removed' + (r.errors.length ? '. Not done: ' + r.errors.join('; ') : '.'), 8000, !!r.errors.length); V.render(); });

  // Project Settings > Team: the SharePoint folder (same layout as the other settings sections)
  V.spCard = () => {
    if (!team()) return '';
    if (st.cfg === null || (st.cfg && !st.info && !st.loading)) { st.loading = true; configured().then(on => on ? info() : null).then(() => { st.loading = false; V.render(); }); }
    const side = '<div class="st-side"><h3>SharePoint folder</h3><p>Every file of this project is copied to its own folder in the Delivery Studio SharePoint library, sorted into subfolders. The project members get access; a document saved again becomes a new version, not a copy.</p></div>';
    let body;
    if (st.cfg === false) body = '<div class="card-b"><p class="small" style="margin:0">Not set up yet. An admin connects the Delivery Studio SharePoint site once (see docs/integrations/SHAREPOINT-2026-11-16.md); after that every project gets its folder by itself.</p></div>';
    else if (!st.info) body = '<div class="card-b"><p class="small muted" style="margin:0">Checking…</p></div>';
    else { const i = st.info, f = i.folder;
      body = '<div class="card-b"><dl class="kv small"><dt>Folder</dt><dd>' + (f ? esc(f.name) : 'Created with the first file') + '</dd><dt>People with access</dt><dd>' + (f ? f.people : 0) + (f && f.accessAt ? ' · updated ' + esc(String(f.accessAt).slice(0, 10)) : '') + '</dd><dt>Waiting to be copied</dt><dd>' + i.pendingTotal + '</dd></dl>'
        + (f && f.accessErrors && f.accessErrors.length ? '<p class="xs" style="color:#B42318">Access not given: ' + esc(f.accessErrors.join('; ')) + '</p>' : '')
        + '<div class="row" style="gap:8px;margin-top:10px">' + (f && f.url ? '<button type="button" class="btn sm primary" data-act="spOpen" data-u="' + esc(f.url) + '">Open folder</button>' : '') + (i.pendingTotal ? '<button type="button" class="btn sm" data-act="spCopyNow">Copy now</button>' : '') + (f ? '<button type="button" class="btn sm" data-act="spAccess">Update access</button>' : '') + '</div></div>'; }
    return '<section class="st-sec">' + side + '<div class="card st-card">' + body + '</div></section>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
