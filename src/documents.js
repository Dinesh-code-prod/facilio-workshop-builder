/* Documents & Files (25 Nov 2026; server: work/server/_sharepoint.mjs, plan: docs/reports/M365-LARGE-FILE-STORAGE-2026-11-25.md).
   The project's SharePoint folder as a page for the team: the eight folders, every file in them (uploaded here, copied from the Studio or added in SharePoint by hand),
   search and type filter, upload of any size straight to Microsoft with progress, retry, resume and cancel, and per file Open, Download, Copy link, Rename, Move, Delete.
   The bytes go from this browser to Microsoft's upload session in 10 MB pieces, never through a Delivery Studio function; the server only checks, opens the session and
   reads the finished file back. sendToSession is the pure part (tests/sharepoint.mjs). */
(function (root) {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  /** sends a Blob to a Microsoft upload session in order, piece by piece; resumes from what Microsoft says it has after a drop, a 416 or a 5xx.
      o: { piece, from, sync, fetch, signal, onProgress(fraction), onSaved(bytesSent), wait(ms) }. Resolves with the driveItem; an expired session rejects with e.expired. */
  async function sendToSession(blob, url, o) {
    o = o || {}; const f = o.fetch || root.fetch.bind(root), piece = o.piece || 10 * 1024 * 1024, total = blob.size, wait = o.wait || sleep; let at = o.from || 0, tries = 0;
    const expired = () => Object.assign(new Error('The upload link expired. Start the upload again.'), { expired: true });
    const cancelled = () => Object.assign(new Error('Cancelled'), { cancelled: true });
    const where = async () => {   // ask Microsoft what it already has
      const r = await f(url, { method: 'GET', signal: o.signal }); if (r.status === 404) throw expired(); const j = await r.json().catch(() => ({}));
      if (j && j.id && j.file) return { done: j }; const nx = ((j && j.nextExpectedRanges) || [])[0]; return { at: nx ? parseInt(nx, 10) : at };
    };
    if (o.sync || at > 0) { const w = await where(); if (w.done) return w.done; at = w.at; }
    for (;;) {
      if (o.signal && o.signal.aborted) throw cancelled();
      const end = Math.min(total, at + piece); let r = null;
      try { r = await f(url, { method: 'PUT', headers: { 'Content-Range': 'bytes ' + at + '-' + (end - 1) + '/' + total }, body: blob.slice(at, end), signal: o.signal }); }   // no Authorization header: the link itself is the permission
      catch (e) { if (o.signal && o.signal.aborted) throw cancelled(); }
      if (r && (r.status === 200 || r.status === 201)) { if (o.onProgress) o.onProgress(1); return r.json(); }
      if (r && r.status === 202) { at = end; tries = 0; if (o.onProgress) o.onProgress(at / total); if (o.onSaved) o.onSaved(at); continue; }
      if (r && r.status === 404) throw expired();
      if (r && r.status >= 400 && r.status < 500 && ![408, 416, 429].includes(r.status)) throw new Error('Microsoft refused the upload (' + r.status + ').');
      if (++tries > 6) throw new Error('The connection kept dropping. Press Retry to carry on from where it stopped.');
      await wait(Math.min(30000, 1000 * 2 ** (tries - 1)));
      try { const w = await where(); if (w.done) return w.done; at = w.at; } catch (e) { if (e.expired) throw e; }
    }
  }
  const logic = { sendToSession };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }
  const F = root.FWB, V = root.FWBViews; if (!F || !V) return; V.docsLogic = logic;
  const { S, esc } = F; const ACT = V.ACT; const API = () => root.FWBApi; const ico = n => (V.ico ? V.ico(n) : '');
  const st = { pid: null, data: null, loading: false, folder: '', q: '', kind: '', jobs: [], err: '' };
  const base = () => '/api/projects/' + S.project.id;
  const okMs = u => /^https:\/\/[^/]+\.sharepoint\.(com|us)\//i.test(String(u || ''));
  const size = n => (!n ? '0 KB' : n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : V.fmtSize ? V.fmtSize(n || 0) : n + ' B');
  const KEEP = 'fwb.docup.';   // the upload link of an unfinished upload, kept in this browser tab only, so a reload can resume
  const keep = j => { try { sessionStorage.setItem(KEEP + j.uploadId, JSON.stringify({ url: j.url, name: j.name, size: j.size, sent: j.sent })); } catch (e) { } };
  const kept = id => { try { return JSON.parse(sessionStorage.getItem(KEEP + id) || 'null'); } catch (e) { return null; } };
  const forget = id => { try { sessionStorage.removeItem(KEEP + id); } catch (e) { } };
  async function load(refresh) {
    if (!S.project) return; const pid = S.project.id; st.loading = true; if (refresh) V.render();
    try { const d = await API().get(base() + '/spfiles' + (refresh ? '?refresh=1' : '')); if (S.project && S.project.id === pid) { st.data = d; st.err = '';
        for (const u of d.uploads || []) if (!st.jobs.some(j => j.uploadId === u.id)) { const k = kept(u.id) || {}; st.jobs.push({ key: u.id, uploadId: u.id, name: u.name, size: u.size, folder: u.folder, sent: k.sent || 0, url: k.url || '', state: 'paused', error: 'Stopped when the page was closed. Choose the same file to carry on.' }); } } }
    catch (e) { st.err = e.message; } finally { st.loading = false; }
    if (S.ui && S.ui.view === 'docs') V.render();
  }
  // progress without a full re-draw (so typing in the search box is not interrupted)
  function paintJob(j) { const el = document.getElementById('dup_' + j.key); if (el) { el.value = j.size ? Math.round(100 * j.sent / j.size) : 0; const t = document.getElementById('dupt_' + j.key); if (t) t.textContent = size(j.sent) + ' of ' + size(j.size); } }
  async function runJob(j) {
    j.state = 'sending'; j.error = ''; V.render();
    try {
      if (!j.url) { const r = await API().post(base() + '/spfiles/uploads', { name: j.file.name, size: j.file.size, folder: j.folder }); Object.assign(j, { uploadId: r.uploadId, url: r.uploadUrl, piece: r.piece, name: r.name, sent: 0 }); keep(j); }
      j.ctrl = new AbortController(); let last = 0;
      const item = await sendToSession(j.file, j.url, { piece: j.piece || (st.data && st.data.piece), from: j.sent, sync: j.sent > 0, signal: j.ctrl.signal,
        onProgress: x => { j.sent = Math.round(x * j.file.size); if (Date.now() - last > 250) { last = Date.now(); paintJob(j); } }, onSaved: at => { j.sent = at; keep(j); } });
      await API().post(base() + '/spfiles/uploads/' + j.uploadId + '/finish', { itemId: item.id });
      j.state = 'done'; j.sent = j.size; forget(j.uploadId); V.toast('Uploaded to ' + j.folder + ': ' + j.name); await load(false);
    } catch (e) {
      if (e.cancelled) return;
      if (e.expired) { forget(j.uploadId); try { await API().del(base() + '/spfiles/uploads/' + j.uploadId); } catch (x) { } j.url = ''; j.uploadId = ''; j.sent = 0; }
      j.state = 'failed'; j.error = e.message || 'The upload stopped.';
    }
    V.render(); pump();
  }
  function addFiles(files, folder) {
    const max = (st.data && st.data.maxBytes) || 0;
    for (const file of files) {
      if (max && file.size > max) { V.toast(file.name + ' is larger than ' + size(max) + ', the most a project file can be.', 7000, true); continue; }
      if (!file.size) { V.toast(file.name + ' is empty.', 5000, true); continue; }
      st.jobs.push({ key: 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), file, name: file.name, size: file.size, folder, sent: 0, state: 'waiting' });
    }
    pump();
  }
  // two uploads at a time; the rest wait their turn
  function pump() { const busy = st.jobs.filter(j => j.state === 'sending').length; st.jobs.filter(j => j.state === 'waiting').slice(0, Math.max(0, 2 - busy)).forEach(runJob); V.render(); }
  window.addEventListener('beforeunload', e => { if (st.jobs.some(j => j.state === 'sending' || j.state === 'waiting')) { e.preventDefault(); e.returnValue = ''; } });

  const files = () => ((st.data && st.data.files) || []).filter(x => (!st.folder || x.folder === st.folder) && (!st.kind || x.kind === st.kind) && (!st.q || (x.name + ' ' + x.path + ' ' + x.uploadedBy).toLowerCase().includes(st.q.toLowerCase())));
  const find = id => ((st.data && st.data.files) || []).find(x => x.id === id);
  function tray() {
    const list = st.jobs.filter(j => j.state !== 'done' || Date.now() - (j.doneAt || (j.doneAt = Date.now())) < 8000); if (!list.length) return '';
    const row = j => { const pct = j.size ? Math.round(100 * j.sent / j.size) : 0, lab = { sending: 'Uploading', waiting: 'Waiting', failed: 'Stopped', paused: 'Not finished', done: 'Done' }[j.state] || '';
      const acts = j.state === 'failed' && j.file ? '<button type="button" class="btn sm" data-act="docRetry" data-k="' + esc(j.key) + '">Retry</button>' : (j.state === 'paused' || (j.state === 'failed' && !j.file)) ? '<button type="button" class="btn sm" data-act="docResume" data-k="' + esc(j.key) + '">Resume</button>' : '';
      return '<div class="ev-row" style="align-items:center;gap:10px"><span class="ev-t" style="min-width:0;flex:1"><b>' + esc(j.name) + '</b> <span class="xs muted">' + esc(j.folder) + '</span><div class="row" style="gap:8px;align-items:center"><progress id="dup_' + esc(j.key) + '" max="100" value="' + pct + '" aria-label="Upload of ' + esc(j.name) + '" style="flex:1;min-width:120px"></progress><span class="xs muted" id="dupt_' + esc(j.key) + '">' + size(j.sent) + ' of ' + size(j.size) + '</span></div>' + (j.error && j.state !== 'done' ? '<div class="xs" style="color:#B61919">' + esc(j.error) + '</div>' : '') + '</span><span class="tag' + (j.state === 'done' ? ' green' : j.state === 'failed' ? ' red' : '') + '">' + lab + '</span>' + acts + (j.state !== 'done' ? '<button type="button" class="btn sm ghost" data-act="docCancel" data-k="' + esc(j.key) + '">Cancel</button>' : '') + '</div>'; };
    return '<div class="card" role="region" aria-label="Uploads" style="margin-bottom:12px"><div class="card-h"><b>Uploads</b><span class="small muted">Straight to SharePoint, 10 MB at a time</span></div><div class="card-b">' + list.map(row).join('') + '</div></div>';
  }
  function table(list) {
    if (!list.length) return '<div class="card tr-empty"><div class="card-b"><h3>' + (st.q || st.kind ? 'No files match' : 'No files here yet') + '</h3><p class="small muted">' + (st.q || st.kind ? 'Clear the search or the type filter.' : 'Upload a file, or add files to this folder in SharePoint and press Refresh.') + '</p></div></div>';
    const r = x => '<tr><td><button type="button" class="docs-name" data-act="docInfo" data-id="' + esc(x.id) + '">' + esc(x.name) + '</button>' + (x.missing ? ' <span class="tag red">' + esc(x.missing) + '</span>' : '') + (x.path !== x.folder || !st.folder ? '<div class="xs muted">' + esc(x.path) + '</div>' : '') + '</td><td>' + esc(x.kind) + '</td><td class="nw">' + size(x.size) + '</td><td>' + esc(x.uploadedBy || '—') + '</td><td class="nw">' + esc(V.fmtDate ? V.fmtDate(x.modifiedAt) : x.modifiedAt) + '</td><td class="nw">' + (x.missing || !okMs(x.url) ? '' : '<a class="btn sm" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Open</a>') + '<button type="button" class="btn sm ghost" data-act="docInfo" data-id="' + esc(x.id) + '" aria-label="More for ' + esc(x.name) + '">More</button></td></tr>';
    return '<div class="tbl-wrap"><table class="tbl docs-tbl"><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Added by</th><th>Modified</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' + list.map(r).join('') + '</tbody></table></div>';
  }
  V.docs = { html() {
    if (V.isCustomer && V.isCustomer()) return '';
    if (st.pid !== S.project.id) { st.pid = S.project.id; st.data = null; st.err = ''; st.jobs = st.jobs.filter(j => j.state === 'sending' || j.state === 'waiting'); st.folder = ''; }
    if (!st.data && !st.loading && !st.err) load(false);
    const d = st.data, n = d ? d.files.length : 0;
    const head = '<div class="page-header"><div class="t"><h1>Documents &amp; Files</h1><p>' + (d && d.configured ? n + ' file' + (n === 1 ? '' : 's') + ' in the project SharePoint folder.' : 'The project files, kept in SharePoint.') + '</p></div>'
      + (d && d.configured ? '<div class="actions">' + (d.folder && okMs(d.folder.url) ? '<a class="btn" href="' + esc(d.folder.url) + '" target="_blank" rel="noopener noreferrer">Open in SharePoint</a>' : '') + '<button type="button" class="btn" data-act="docClaude">Ask Claude for an inventory</button></div>' : '') + '</div>';
    if (st.err) return head + '<div class="page-body"><div class="card"><div class="card-b"><p class="small">Could not load the files: ' + esc(st.err) + '</p><button type="button" class="btn sm" data-act="docRefresh">Try again</button></div></div></div>';
    if (!d) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    if (!d.configured) return head + '<div class="page-body"><div class="card"><div class="card-b"><h3 style="margin-top:0">SharePoint is not connected yet</h3><p class="small muted">An admin connects the Delivery Studio SharePoint site once. After that every project gets its folder with the eight standard folders, and files of any size can be uploaded here.</p></div></div></div>';
    const cnt = f => d.files.filter(x => x.folder === f).length;
    const nav = '<nav class="card docs-nav" aria-label="Folders">' + [['', 'All files', d.files.length]].concat(d.folders.map(f => [f, f, cnt(f)])).map(([v, l, c]) => '<button type="button" class="docs-f" aria-pressed="' + (st.folder === v) + '" data-act="docFolder" data-v="' + esc(v) + '"><span>' + esc(l) + '</span><span class="n">' + c + '</span></button>').join('') + '</nav>';
    const kinds = Array.from(new Set(d.files.map(x => x.kind))).sort();
    const bar = '<div class="docs-bar">' + (d.canEdit ? '<button type="button" class="btn primary" data-act="docUpload">' + ico('upl') + 'Upload</button>' : '')
      + '<div class="tk-sw">' + ico('search') + '<input type="search" id="docQ" data-docs="q" value="' + esc(st.q) + '" placeholder="Search file names" aria-label="Search file names"></div>'
      + '<select aria-label="Type" data-change="docKind"><option value="">All types</option>' + kinds.map(k => '<option' + (k === st.kind ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select>'
      + '<button type="button" class="btn" data-act="docRefresh"' + (st.loading ? ' disabled' : '') + '>' + (st.loading ? 'Reading SharePoint…' : 'Refresh') + '</button></div>';
    const note = d.note ? '<p class="small" style="color:#D85903">' + esc(d.note) + '</p>' : '';
    const seen = d.refreshedAt ? '<p class="xs muted" style="margin:8px 0 0">Read from SharePoint ' + esc(new Date(d.refreshedAt).toLocaleString()) + '. Changes made in SharePoint show after Refresh.</p>' : '';
    return head + '<div class="page-body"><div class="docs-grid">' + nav + '<div style="min-width:0">' + bar + note + tray() + table(files()) + seen + '</div></div></div>';
  } };

  ACT.docFolder = a => { st.folder = a.getAttribute('data-v') || ''; V.render(); };
  ACT.docKind = el => { st.kind = el.value || ''; V.render(); };
  ACT.docRefresh = () => { st.err = ''; return load(true); };
  ACT.docUpload = async () => {
    const d = st.data; if (!d || !d.canEdit) return; const here = d.uploadFolders.includes(st.folder) ? st.folder : '';
    if (here) { const fs = await V.pickFile('', true); if (fs.length) addFiles(fs, here); return; }
    V.drawer('Upload files', '<label class="f" for="docTo">Folder</label><select id="docTo">' + d.uploadFolders.map(f => '<option>' + esc(f) + '</option>').join('') + '</select><p class="small muted">Any type except programs, up to ' + size(d.maxBytes) + ' each. Big files go straight to SharePoint, and you can keep working while they upload. A file with the same name is kept as a second file, never overwritten.</p>',
      '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="docUploadGo">Choose files</button>');
  };
  ACT.docUploadGo = async () => { const to = (document.getElementById('docTo') || {}).value; V.closeDrawer(); if (!to) return; st.folder = to; const fs = await V.pickFile('', true); if (fs.length) addFiles(fs, to); };
  const jobOf = a => st.jobs.find(j => j.key === a.getAttribute('data-k'));
  ACT.docRetry = a => { const j = jobOf(a); if (j && j.file) { j.state = 'waiting'; pump(); } };
  // after a reload the browser no longer has the file: the person picks the same file again and the upload carries on from what Microsoft already has
  ACT.docResume = async a => { const j = jobOf(a); if (!j) return;
    const f = (await V.pickFile('', false))[0]; if (!f) return;
    if (f.size !== j.size) { V.toast('Choose the same file again (' + j.name + ', ' + size(j.size) + ').', 6000, true); return; }
    j.file = f; if (!j.url) { try { await API().del(base() + '/spfiles/uploads/' + j.uploadId); } catch (e) { } j.uploadId = ''; j.sent = 0; } j.state = 'waiting'; pump(); };
  ACT.docCancel = async a => { const j = jobOf(a); if (!j) return; if (j.ctrl) j.ctrl.abort(); st.jobs = st.jobs.filter(x => x !== j);
    if (j.url) { try { await fetch(j.url, { method: 'DELETE' }); } catch (e) { } } if (j.uploadId) { forget(j.uploadId); try { await API().del(base() + '/spfiles/uploads/' + j.uploadId); } catch (e) { } } V.render(); pump(); };

  // one file: what it is, and what you can do with it
  ACT.docInfo = a => { const x = find(a.getAttribute('data-id')); if (!x) return; const ed = st.data.canEdit && !x.missing;
    const kv = [['Folder', x.path], ['Type', x.kind + (x.ext ? ' (.' + x.ext + ')' : '')], ['Size', size(x.size)], ['Added by', x.uploadedBy || '—'], ['Added', x.createdAt ? new Date(x.createdAt).toLocaleString() : '—'], ['Last changed', (x.modifiedAt ? new Date(x.modifiedAt).toLocaleString() : '—') + (x.modifiedBy ? ' by ' + x.modifiedBy : '')], ['Came from', x.source === 'upload' ? 'Uploaded in Delivery Studio' : 'SharePoint']].concat(x.missing ? [['Status', x.missing]] : []);
    V.drawer(x.name, '<dl class="kv small">' + kv.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>'
      + (x.missing || !okMs(x.url) ? '' : '<div class="row" style="gap:8px;flex-wrap:wrap;margin:12px 0"><a class="btn sm primary" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Open in Microsoft 365</a><button type="button" class="btn sm" data-act="docDownload" data-id="' + esc(x.id) + '">Download</button><button type="button" class="btn sm" data-act="docCopy" data-id="' + esc(x.id) + '">Copy link</button></div>')
      + (ed ? '<label class="f" for="docName">Name</label><div class="row" style="gap:8px"><input id="docName" type="text" maxlength="120" value="' + esc(x.name) + '" style="flex:1"><button type="button" class="btn sm" data-act="docRename" data-id="' + esc(x.id) + '">Rename</button></div>'
        + '<label class="f" for="docMove">Move to</label><div class="row" style="gap:8px"><select id="docMove" style="flex:1">' + st.data.folders.map(f => '<option' + (f === x.folder ? ' selected' : '') + '>' + esc(f) + '</option>').join('') + '</select><button type="button" class="btn sm" data-act="docMoveGo" data-id="' + esc(x.id) + '">Move</button></div>' : ''),
      (ed ? '<button class="btn danger" data-act="docDelete" data-id="' + esc(x.id) + '">Delete</button>' : '') + '<span class="sp"></span><button class="btn" data-act="closeDrawer">Close</button>'); };
  ACT.docDownload = a => V.busy(a, async () => { const r = await API().get(base() + '/spfiles/' + encodeURIComponent(a.getAttribute('data-id')) + '/download'); if (!okMs(r.url)) throw new Error('SharePoint did not give a download link'); const l = document.createElement('a'); l.href = r.url; l.rel = 'noopener'; document.body.appendChild(l); l.click(); l.remove(); });
  ACT.docCopy = async a => { const x = find(a.getAttribute('data-id')); if (!x) return; try { await navigator.clipboard.writeText(x.url); V.toast('Link copied. It opens only for people who already have access to the project folder.', 6000); } catch (e) { V.toast('This browser blocked copying.', 4000, true); } };
  const patch = (a, body, done) => V.busy(a, async () => { await API().patch(base() + '/spfiles/' + encodeURIComponent(a.getAttribute('data-id')), body); V.closeDrawer(); V.toast(done); await load(false); });
  ACT.docRename = a => { const n = ((document.getElementById('docName') || {}).value || '').trim(); if (!n) { V.toast('Give the file a name.', 4000, true); return; } return patch(a, { name: n }, 'Renamed'); };
  ACT.docMoveGo = a => patch(a, { folder: (document.getElementById('docMove') || {}).value }, 'Moved');
  ACT.docDelete = async a => { const x = find(a.getAttribute('data-id')); if (!x || !(await V.confirmDialog('Delete file', 'Delete "' + x.name + '"? It goes to the SharePoint recycle bin, where a site owner can restore it.', 'Delete'))) return;
    await V.busy(a, async () => { await API().del(base() + '/spfiles/' + encodeURIComponent(x.id)); V.closeDrawer(); V.toast('Deleted. It is in the SharePoint recycle bin.'); await load(false); }); };
  ACT.docClaude = () => V.askClaude && V.askClaude('Give me the document inventory of this project: read get_document section "documents" (part refresh) and tell me which required documents are missing, the latest BRD and FTR, likely duplicates or outdated files, and the recordings. Metadata only: do not open videos or archives.', { title: 'Document inventory' });
  // the search box re-draws the page and keeps the cursor where it was
  document.addEventListener('input', e => { const el = e.target; if (el && el.getAttribute && el.getAttribute('data-docs') === 'q') { st.q = el.value; const k = el.selectionStart; V.render(); const n = document.getElementById('docQ'); if (n) { n.focus(); try { n.setSelectionRange(k, k); } catch (x) { } } } });
})(typeof window !== 'undefined' ? window : globalThis);
