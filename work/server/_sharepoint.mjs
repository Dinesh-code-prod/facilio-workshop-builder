/* SharePoint project folders (user, 16 Nov 2026): every project file (uploads, exports, what Claude saves) is copied to one shared SharePoint library,
   one folder per project with subfolders by document type, shared with the project's members (owners and editors edit, viewers read).
   Layout (user, 23 Nov 2026): Facilio Onboarding / <project name> / 01_Project Governance … 08_Archive, all made when the project is made, plus PROJECT_INDEX.md
   (project id, Facilio Org ID, document links, tasks, missed steps, decisions, recent updates), rewritten after each copy. Delivery Studio is the master; SharePoint is the shared copy.
   One file per document: an export that is saved again overwrites the same name, so SharePoint keeps versions instead of copies.
   Needs (owner action, see docs/integrations/SHAREPOINT-2026-11-16.md): an OAuth2 credential "graph_files" (Entra app, Graph Sites.Selected with full control
   on one site) granted to this app, and a plain secret "sharepoint_site" (https://<tenant>.sharepoint.com/sites/<site>). Without them nothing is copied.
   The page drives the copy one 10 MB piece per request (the platform gives a function 25 seconds); the upload link stays on the server.
   Routes: GET /api/sharepoint/status, GET /api/projects/:id/sharepoint, POST /api/projects/:id/sharepoint/access, POST /api/projects/:id/files/:fid/sharepoint;
   Documents & Files (25 Nov 2026): GET /api/projects/:id/spfiles[?refresh=1], POST .../spfiles/uploads, POST .../spfiles/uploads/:uid/finish, DELETE .../spfiles/uploads/:uid, GET .../spfiles/:iid/download, PATCH and DELETE .../spfiles/:iid. */

// ---------- pure ----------
/** the one root folder of every project (user, 23 Nov 2026): Facilio Onboarding / <project name> / the eight standard folders, all made when the project is made */
export const ROOT = 'Facilio Onboarding';
export const SUBFOLDERS = [
  ['01_Project Governance', ['msa', 'kickoff', 'signoff_evidence']],
  ['02_Requirements & Design', ['transcript', 'brd_export', 'brd_signed', 'solution_doc', 'solution_input', 'config_package', 'config_evidence', 'flow_image', 'mockup_html']],
  ['03_Project Tracking & Reporting', ['plan', 'schedule', 'plan_source', 'report_attachment', 'ticket_attachment', 'task_attachment', 'dashboard', 'showcase_image', 'kpi_workbook']],
  ['04_Testing & UAT', ['uat_source', 'uat_evidence', 'ftr_workbook']],
  ['05_Data Onboarding', ['onboarding_workbook', 'onboarding_files']],
  ['06_Training & Enablement', ['guide_source', 'guide_media']],
  ['07_Handover', ['handover_source']],
  ['08_Archive', []]   // filled by people (old versions, closed material); Delivery Studio never writes here
];
export const FOLDERS = SUBFOLDERS.map(([n]) => n);
const [GOV, REQ, TRACK, UAT, ONB, TRAIN, HAND] = FOLDERS;
// an export saved from a page (category "export") goes by the page it came from
const VIEW_FOLDER = [[/guide|train|video/i, TRAIN], [/uat|ftr|test/i, UAT], [/onboard/i, ONB], [/handover|close/i, HAND], [/kickoff|msa|contract|govern|raid|cr\b|signoff/i, GOV],
  [/brd|soldoc|solution|config|flow|mockup|module|form|role|notif|session|workshop|transcript|requirement/i, REQ], [/plan|schedule|timeline|task|ticket|support|mail|dash|report|kpi|sla|overview|golive/i, TRACK]];
export const SKIP = new Set(['logo_facilio', 'logo_customer', 'brd_template', 'screenshot']);   // settings files, not project documents
/** documents kept as one file with versions: a new save of the same name replaces the last one, in the app and in SharePoint */
export const VERSIONED = new Set(['export', 'brd_export', 'solution_doc']);
export function subfolderOf(category, meta) {
  if (category === 'export') { const v = String((meta && meta.view) || ''); return (VIEW_FOLDER.find(([re]) => re.test(v)) || [, TRACK])[1]; }
  return (SUBFOLDERS.find(([, cats]) => cats.includes(category)) || [GOV])[0];   // a file type with no folder of its own sits with the project's governance papers
}
/** SharePoint refuses " * : < > ? / \ | # % and a name ending in a dot or space */
export const safeName = s => String(s || '').replace(/["*:<>?/\\|#%]/g, '-').replace(/[\u0000-\u001f]/g, '').replace(/[.\s]+$/, '').trim().slice(0, 120) || 'file';
/** the project's own name; a second project with the same name gets the end of its id added (see projectFolder) */
export const folderName = p => safeName(String(p.name || 'Project').slice(0, 100));
const cell = v => String(v == null || v === '' ? '—' : v).replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 200);
/** PROJECT_INDEX.md: where everything of the project is, so Claude and people find a document without opening every folder. x comes from indexData() in api.mjs. */
export function indexMarkdown(x) {
  const p = x.project || {}, f = x.folder || {}, t = x.tasks || {};
  const rows = (h, list) => list.length ? ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|'].concat(list.map(r => '| ' + r.map(cell).join(' | ') + ' |')) : ['None recorded.'];
  return ['# Project index: ' + cell(p.name), '', '_Kept by Facilio Delivery Studio, updated ' + cell(x.at) + '. Do not edit by hand: the next update replaces it, and SharePoint keeps the earlier versions._', '', '## Project']
    .concat(rows(['Field', 'Value'], [['Project', p.name], ['Delivery Studio project ID', p.id], ['Customer', p.customer], ['Facilio Organization ID', p.orgId || 'Not set yet'], ['Region', p.region], ['Delivery status', p.status], ['Start', p.start], ['End', p.end], ['Open in Delivery Studio', p.link], ['Repository folder', f.url]]),
      ['', '## Folders'], FOLDERS.map(n => '- [' + n + '](' + (f.url ? f.url + '/' + encodeURIComponent(n) : '') + ')'),
      ['', '## Documents (latest version of each)'], rows(['Document', 'Folder', 'Saved', 'Link'], (x.documents || []).map(d => [d.name, d.folder, String(d.at || '').slice(0, 10), d.url])),
      ['', '## Tasks', 'Open ' + (t.open || 0) + ' · overdue ' + (t.overdue || 0) + ' · finished ' + (t.done || 0) + '.', '', '### Missed steps (past due, not finished)'], rows(['Item', 'Owner', 'Due'], (x.missed || []).map(m => [m.label + ': ' + m.title, m.ownerText, m.due])),
      ['', '## Decisions'], rows(['Decision', 'Status', 'Date'], (x.decisions || []).map(d => [d.title, d.status, d.date])),
      ['', '## Recent updates'], rows(['When', 'What'], (x.activity || []).map(a => [String(a.at || '').slice(0, 16).replace('T', ' '), a.what])), ['']).join('\n');
}
/** the key that makes two saves "the same document": category, page and name, without case */
export const docKeyOf = (category, name, meta) => VERSIONED.has(category) ? [category, (meta && meta.view) || '', String(name || '').toLowerCase()].join('|') : '';
export const SEG = 10 * 1024 * 1024;   // 32 × 320 KiB: Microsoft takes upload pieces in multiples of 320 KiB, and a piece must fit the 25-second request
export const accessRole = m => (m.role === 'viewer' ? 'read' : 'write');

// ---------- Documents & Files (25 Nov 2026): files of any size go from the browser straight into the project's SharePoint folder; Delivery Studio keeps the reference, not the bytes ----------
export const MAX_DOC = 10 * 1024 ** 3;   // shortcut: a fixed 10 GB cap per file (Microsoft allows far more); raise it when the site quota and the team need bigger files
export const BLOCKED = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|jar|dll|sh|app|lnk)$/i;   // programs are never stored in a project folder
export const UPLOAD_FOLDERS = FOLDERS.slice(0, 7);   // 08_Archive is filled by people moving files there, never by an upload
const KINDS = [[/\.(mp4|mov|m4v|webm|avi|mkv|wmv)$/i, 'Video'], [/\.(mp3|m4a|wav|aac|ogg|wma)$/i, 'Audio'], [/\.(zip|7z|rar|gz|tar|tgz)$/i, 'Archive'], [/\.(docx?|rtf|odt)$/i, 'Word'], [/\.pdf$/i, 'PDF'], [/\.(xlsx|xlsm|xls|csv)$/i, 'Excel'], [/\.pptx?$/i, 'PowerPoint'], [/\.(png|jpe?g|gif|svg|webp|bmp)$/i, 'Image'], [/\.(txt|md|vtt|srt)$/i, 'Text']];
export const kindOf = n => (KINDS.find(([re]) => re.test(String(n || ''))) || [, 'Other'])[1];
const who = b => (b && b.user && (b.user.email || b.user.displayName)) || '';
/** the reference Delivery Studio keeps for one SharePoint file (item: a Graph driveItem) */
export function docRecord(it, folder, path, prev) {
  prev = prev || {}; const name = String(it.name || '');
  return { id: it.id, name, ext: (name.includes('.') ? name.split('.').pop() : '').toLowerCase(), kind: kindOf(name), mime: (it.file && it.file.mimeType) || '', size: Number(it.size) || 0, url: it.webUrl || '',
    folder, path: path || folder, parentId: (it.parentReference && it.parentReference.id) || '', uploadedBy: prev.uploadedBy || who(it.createdBy), createdAt: it.createdDateTime || '', modifiedAt: it.lastModifiedDateTime || '',
    modifiedBy: who(it.lastModifiedBy), eTag: it.eTag || '', status: 'ready', missing: '', source: prev.source || 'sharepoint' };
}
/** what a project should hold by the end, by folder and file name; used for "missing documents" */
export const REQUIRED = [['Contract (MSA or SOW)', FOLDERS[0], /msa|sow|contract|agreement|service order/i], ['Kick-off deck', FOLDERS[0], /kick.?off/i], ['BRD', FOLDERS[1], /\bbrd\b|business requirement/i], ['UAT or FTR', FOLDERS[3], /uat|ftr/i], ['Handover document', FOLDERS[6], /handover|closure/i]];
const newest = (a, b) => String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || ''));
const brief = d => ({ id: d.id, name: d.name, folder: d.path || d.folder, kind: d.kind, size: d.size, modifiedAt: d.modifiedAt, uploadedBy: d.uploadedBy, url: d.url });
/** the inventory Claude asks for: counts per folder, required documents not found, the latest BRD and FTR, likely duplicates and the recordings */
export function inventory(docs) {
  const live = (docs || []).filter(d => d && d.status === 'ready' && !d.missing).sort(newest), byFolder = {};
  for (const f of FOLDERS) byFolder[f] = live.filter(d => d.folder === f).length;
  const latest = re => { const d = live.find(x => re.test(x.name)); return d ? brief(d) : null; };
  const groups = new Map(); for (const d of live) { const k = d.name.toLowerCase().replace(/\s*\(\d+\)(?=\.[^.]+$)/, ''); groups.set(k, (groups.get(k) || []).concat([d])); }
  for (const d of live) if (d.size > 0) { const k = 'size:' + d.size + '.' + d.ext; groups.set(k, (groups.get(k) || []).concat([d])); }
  const seen = new Set(), duplicates = [];
  for (const [k, g] of groups) { const ids = g.map(d => d.id).sort().join(','); if (g.length > 1 && !seen.has(ids)) { seen.add(ids); duplicates.push({ why: k.startsWith('size:') ? 'same size and type' : 'same name', files: g.map(brief) }); } }
  return { total: live.length, byFolder, missingRequired: REQUIRED.filter(([, f, re]) => !live.some(d => d.folder === f && re.test(d.name))).map(([document, folder]) => ({ document, folder })),
    latestBrd: latest(/\bbrd\b|business requirement/i), latestFtr: latest(/\bftr\b/i), duplicates: duplicates.slice(0, 20), recordings: live.filter(d => d.kind === 'Video' || d.kind === 'Audio').slice(0, 50).map(brief),
    missingFiles: (docs || []).filter(d => d && d.missing).slice(0, 20).map(d => Object.assign(brief(d), { missing: d.missing })) };
}

export function installSharePoint(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, dbList, dbDel, withLock, audit, CTX, CHUNK, indexData, limit, rid } = d;
  const CRED = 'graph_files', G = 'https://graph.microsoft.com/v1.0';
  const ctx = () => CTX();
  const siteUrl = async () => { try { return String(await ctx().secrets.get('sharepoint_site') || '').trim().replace(/\/+$/, ''); } catch (e) { return ''; } };
  const team = async (s, pid, need) => { const a = await projectAccess(s, pid, need); if (a.role === 'customer') throw new HttpError(403, 'SharePoint copies are for the delivery team'); return a; };

  async function graph(method, path, body, soft) {   // soft: a 404 comes back as { status: 404 } instead of an error (a file deleted or moved in SharePoint)
    if (!ctx().fetch) throw new HttpError(503, 'This platform build cannot call Microsoft');
    const text = typeof body === 'string';   // a text file's content (PROJECT_INDEX.md), sent as it is
    let r; try { r = await ctx().fetch(CRED, path.startsWith('https://') ? path : G + path, { method, headers: body ? { 'content-type': text ? 'text/markdown; charset=utf-8' : 'application/json' } : {}, body: body ? (text ? body : JSON.stringify(body)) : undefined }); }
    catch (e) { throw new HttpError(424, 'The Microsoft credential "' + CRED + '" is missing or not granted to this app. See the SharePoint set-up note.'); }
    if (r.ok || r.status === 409) { let j = null; try { j = r.status === 204 ? null : await r.json(); } catch (e) { } return { status: r.status, j }; }
    if (soft && r.status === 404) return { status: 404, j: null };
    let why = ''; try { why = String(((await r.json()).error || {}).message || '').slice(0, 200); } catch (e) { }
    if (r.status === 401 || r.status === 403) throw new HttpError(424, 'Microsoft refused access (' + r.status + '). The app needs Sites.Selected with full control on the Delivery Studio site. ' + why);
    if (r.status === 429) throw new HttpError(429, 'Microsoft is busy. Try again in a minute.', { retryAfter: 60 });
    throw new HttpError(502, 'SharePoint answered ' + r.status + (why ? ': ' + why : ''));
  }
  // the library: the site's default document library, found once and kept
  async function drive() {
    const site = await siteUrl(); if (!site) throw new HttpError(409, 'SharePoint is not set up yet');
    const c = ((await dbGet('cfg', 'sharepoint')) || {}).value; if (c && c.site === site && c.driveId && c.rootId) return c;
    const u = new URL(site); const s1 = await graph('GET', '/sites/' + u.hostname + ':' + (u.pathname || '/'));
    const dr = await graph('GET', '/sites/' + encodeURIComponent(s1.j.id) + '/drive');
    const root = await child(dr.j.id, 'root', ROOT);   // "Facilio Onboarding", made once, or the one that is already there
    const v = { site, siteId: s1.j.id, driveId: dr.j.id, webUrl: dr.j.webUrl || site, rootId: root.id, rootUrl: root.webUrl || '' }; await dbPut('cfg', 'sharepoint', v); return v;
  }
  async function child(driveId, parentId, name) {   // a folder by name under a parent, created when missing
    const c = await graph('POST', '/drives/' + driveId + '/items/' + parentId + '/children', { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' });
    if (c.status !== 409) return c.j;
    return (await graph('GET', '/drives/' + driveId + '/items/' + parentId + ':/' + encodeURIComponent(name))).j;
  }
  const recOf = async pid => ((await dbGet('spp', pid)) || {}).value || null;
  // the project folder under Facilio Onboarding with all eight standard folders. A folder of that name that no project owns yet (made by hand) is adopted, so nothing is duplicated;
  // one another project already owns gets a second folder with the end of this project's id.
  async function projectFolder(p) {
    return withLock('spp.' + p.id, async () => {
      let rec = await recOf(p.id); const dv = await drive(); if (rec && rec.driveId === dv.driveId && rec.root === dv.rootId && rec.folderId) return rec;
      let f = await child(dv.driveId, dv.rootId, folderName(p));
      if ((await dbList('spp')).some(r => r.key !== p.id && r.value && r.value.folderId === f.id)) f = await child(dv.driveId, dv.rootId, safeName(folderName(p) + ' (' + String(p.id).slice(-6) + ')'));
      rec = { driveId: dv.driveId, root: dv.rootId, folderId: f.id, url: f.webUrl, name: f.name, subs: {}, granted: {} };
      for (const n of FOLDERS) { const s = await child(rec.driveId, rec.folderId, n); rec.subs[n] = s.id; }
      await dbPut('spp', p.id, rec); await syncAccess(p, rec).catch(() => { }); await writeIndex(p, rec).catch(e => console.log('project index failed: ' + e.message)); return rec;
    });
  }
  // PROJECT_INDEX.md in the project folder: rewritten (a new SharePoint version) when the folder is made, after each copy and on Update access
  async function writeIndex(p, rec) {
    if (!indexData) return; const files = (await dbList('fl.' + p.id)).map(r => r.value).filter(f => f && f.sp && f.sp.url && !f.deletedAt && !f.supersededBy).sort((a, b) => String(b.sp.at).localeCompare(String(a.sp.at)));
    const docs = files.map(f => ({ name: f.name, folder: f.sp.folder, at: f.sp.at, url: f.sp.url })), have = new Set(docs.map(x => x.url));
    for (const x of (await docsOf(p.id)).filter(x => x.status === 'ready' && !x.missing && !have.has(x.url)).sort(newest)) docs.push({ name: x.name, folder: x.path || x.folder, at: x.modifiedAt, url: x.url });   // files on the Documents page (uploaded there or added in SharePoint)
    const md = indexMarkdown(Object.assign({}, await indexData(p.id), { folder: { url: rec.url }, documents: docs.slice(0, 200), at: new Date().toISOString() }));
    const r = await graph('PUT', '/drives/' + rec.driveId + '/items/' + rec.folderId + ':/PROJECT_INDEX.md:/content', md);
    rec.index = { url: (r.j && r.j.webUrl) || '', at: new Date().toISOString() }; await dbPut('spp', p.id, rec); return md;
  }
  async function sub(p, rec, name) {
    if (rec.subs[name]) return rec.subs[name];
    const f = await child(rec.driveId, rec.folderId, name); rec.subs[name] = f.id; await dbPut('spp', p.id, rec); return f.id;
  }
  // access: the project folder is shared with the members, never with anyone else; only the permissions this app gave are ever removed
  async function syncAccess(p, rec) {
    rec = rec || await recOf(p.id); if (!rec || !rec.folderId) return { granted: 0, removed: 0, errors: [] };
    const want = {}; for (const m of p.members || []) if (m.email) want[m.email.toLowerCase()] = accessRole(m);
    const g = rec.granted || {}; const errors = []; let granted = 0, removed = 0;
    for (const [email, x] of Object.entries(g)) if (want[email] !== x.role) {
      try { await graph('DELETE', '/drives/' + rec.driveId + '/items/' + rec.folderId + '/permissions/' + encodeURIComponent(x.id)); delete g[email]; removed++; } catch (e) { errors.push(email + ': ' + e.message); } }
    for (const [email, role] of Object.entries(want)) if (!g[email]) {
      try { const r = await graph('POST', '/drives/' + rec.driveId + '/items/' + rec.folderId + '/invite', { recipients: [{ email }], roles: [role], requireSignIn: true, sendInvitation: false });
        const perm = ((r.j && r.j.value) || [])[0]; if (perm && perm.id) { g[email] = { id: perm.id, role }; granted++; } } catch (e) { errors.push(email + ': ' + e.message); } }
    rec.granted = g; rec.accessAt = new Date().toISOString(); rec.accessErrors = errors.slice(0, 10); await dbPut('spp', p.id, rec); return { granted, removed, errors };
  }
  // bytes [a, b) of a stored project file, read from its parts in storage
  async function readRange(f, a, b) {
    const out = [];
    for (let i = Math.floor(a / CHUNK); i * CHUNK < b; i++) {
      const s = Math.max(a, i * CHUNK) - i * CHUNK, e = Math.min(b, (i + 1) * CHUNK) - i * CHUNK;
      const { url } = await ctx().files.url(f.urls[i], { private: true, expires: 300 });
      const r = await fetch(url, { headers: { range: 'bytes=' + s + '-' + (e - 1) } }); if (!(r.ok || r.status === 206)) throw new HttpError(502, 'Could not read the file from storage (' + r.status + ')');
      let buf = Buffer.from(await r.arrayBuffer()); if (r.status === 200 && buf.length > e - s) buf = buf.subarray(s, e);   // a store that ignores Range sends the whole part
      out.push(buf);
    }
    return Buffer.concat(out);
  }

  route('GET', '/api/sharepoint/status', async () => { await me(); return ok({ configured: !!(await siteUrl()) && !!ctx().fetch }); });
  route('GET', '/api/projects/:id/sharepoint', async (b, P) => {
    const s = await me(); await team(s, P.id, 'read'); const configured = !!(await siteUrl()) && !!ctx().fetch; const rec = await recOf(P.id);
    const files = configured ? (await dbList('fl.' + P.id)).map(r => r.value).filter(f => f && f.status === 'ready' && !f.deletedAt && !f.supersededBy && !SKIP.has(f.category) && !(f.sp && f.sp.url)) : [];
    files.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    return ok({ configured, folder: rec ? { url: rec.url, name: rec.name, root: ROOT, folders: FOLDERS, index: (rec.index && rec.index.url) || '', people: Object.keys(rec.granted || {}).length, accessAt: rec.accessAt || null, accessErrors: rec.accessErrors || [] } : null, pending: files.slice(0, 50).map(f => ({ id: f.id, name: f.name, size: f.size, category: f.category })), pendingTotal: files.length });
  });
  route('POST', '/api/projects/:id/sharepoint/access', async (b, P) => {
    const s = await me(); const { project } = await team(s, P.id, 'edit'); const rec = await projectFolder(project); const r = await syncAccess(project, rec); await writeIndex(project, rec).catch(() => { }); await audit(P.id, s.id, 'sharepoint-access', r.granted + ' added, ' + r.removed + ' removed'); return ok(r);
  });
  // copy one file: no part = start (folder, upload link kept on the file record); part n = send piece n; the last piece returns the SharePoint link
  route('POST', '/api/projects/:id/files/:fid/sharepoint', async (b, P) => withLock('spf.' + P.id + '.' + P.fid, async () => {
    const s = await me(); const { project } = await team(s, P.id, 'edit'); const r = await dbGet('fl.' + P.id, P.fid);
    if (!r || r.value.deletedAt || r.value.status !== 'ready') throw new HttpError(404, 'File not found'); const f = r.value;
    if (SKIP.has(f.category) || f.supersededBy) return ok({ skipped: true });
    if (b == null || b.part == null) {
      if (f.spJob && f.spJob.by !== s.email && Date.now() - Date.parse(f.spJob.at) < 10 * 60e3) return ok({ busy: true });   // someone else is copying it right now
      const rec = await projectFolder(project); const parent = await sub(project, rec, subfolderOf(f.category, f.meta));
      const name = safeName(f.name); const versioned = VERSIONED.has(f.category);
      const u = await graph('POST', '/drives/' + rec.driveId + '/items/' + parent + ':/' + encodeURIComponent(name) + ':/createUploadSession', { item: { '@microsoft.graph.conflictBehavior': versioned ? 'replace' : 'rename' } });
      const link = String((u.j || {}).uploadUrl || ''); if (!/^https:\/\/[^/]+\.(sharepoint\.com|sharepoint\.us|sharepoint-df\.com)\//i.test(link)) throw new HttpError(502, 'SharePoint did not give an upload link');
      f.spJob = { url: link, parts: Math.ceil(f.size / SEG), by: s.email, at: new Date().toISOString(), folder: subfolderOf(f.category, f.meta) }; await dbPut('fl.' + P.id, P.fid, f);
      return ok({ parts: f.spJob.parts });
    }
    const n = Number(b.part); const job = f.spJob; if (!job) throw new HttpError(409, 'Start the copy first');
    if (!Number.isInteger(n) || n < 0 || n >= job.parts) throw new HttpError(400, 'Invalid part');
    const a = n * SEG, e = Math.min(f.size, a + SEG); const body = await readRange(f, a, e);
    let res; try { res = await fetch(job.url, { method: 'PUT', headers: { 'content-length': String(body.length), 'content-range': 'bytes ' + a + '-' + (e - 1) + '/' + f.size }, body }); }
    catch (err) { throw new HttpError(502, 'Could not reach SharePoint. Try again.'); }
    if (res.status === 404 || res.status === 410) { delete f.spJob; await dbPut('fl.' + P.id, P.fid, f); throw new HttpError(409, 'The SharePoint upload expired. It starts again on the next try.'); }
    if (!res.ok) throw new HttpError(502, 'SharePoint refused the piece (' + res.status + ')');
    if (n < job.parts - 1) return ok({ done: false });
    const item = await res.json().catch(() => ({})); f.sp = { url: item.webUrl || '', itemId: item.id || '', folder: job.folder, at: new Date().toISOString(), by: s.email }; delete f.spJob;
    await dbPut('fl.' + P.id, P.fid, f); await audit(P.id, s.id, 'sharepoint-copy', f.category + ': ' + f.name);
    try { await writeIndex(project, await recOf(P.id)); } catch (e) { /* the copy stands; the index catches up on the next one */ }
    return ok({ done: true, url: f.sp.url, folder: f.sp.folder });
  }));
  // ---------- Documents & Files: references in collection spd.<project>, keyed by the Microsoft item id (a rename or move in SharePoint keeps the record) ----------
  const DOC = pid => 'spd.' + pid, SEL = '$select=id,name,size,file,folder,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,parentReference,eTag';
  const okLink = u => /^https:\/\/[^/]+\.(sharepoint\.com|sharepoint\.us|sharepoint-df\.com)\//i.test(u);
  const docsOf = async pid => (await dbList(DOC(pid))).map(r => r.value).filter(Boolean);
  const item = (rec, iid, q) => '/drives/' + rec.driveId + '/items/' + encodeURIComponent(iid) + (q ? '?' + q : '');
  const docOf = async (pid, iid) => { const r = await dbGet(DOC(pid), String(iid || '')); if (!r || !r.value || r.value.status !== 'ready') throw new HttpError(404, 'File not found'); return r.value; };
  const needSetUp = async () => { if (!(await configured())) throw new HttpError(409, 'SharePoint is not set up yet. An admin connects it once (see the SharePoint set-up note).'); };
  // Refresh: lists the eight folders (and folders inside them, three levels deep) and brings the records in step with SharePoint: renamed, moved, added by hand or deleted.
  // Bounded so it fits one 25-second call; a partial pass marks nothing as missing. Graph delta works only on a library's root, so the folders are listed instead.
  async function refresh(pid, rec) {
    const t0 = Date.now(), seen = new Set(), old = new Map((await docsOf(pid)).filter(x => x.status === 'ready').map(x => [x.id, x])); let complete = true, n = 0;
    const queue = FOLDERS.filter(f => rec.subs[f]).map(f => ({ id: rec.subs[f], folder: f, path: f, depth: 0 }));
    while (queue.length) {
      if (Date.now() - t0 > 15000 || n > 3000) { complete = false; break; }
      const q = queue.shift(); let next = item(rec, q.id) + '/children?' + SEL + '&$top=200';
      while (next) {
        const r = await graph('GET', next, undefined, true); if (r.status === 404) break;
        for (const it of (r.j && r.j.value) || []) { n++;
          if (it.folder) { if (q.depth < 3) queue.push({ id: it.id, folder: q.folder, path: q.path + '/' + it.name, depth: q.depth + 1 }); continue; }
          seen.add(it.id); const prev = old.get(it.id), x = docRecord(it, q.folder, q.path, prev); if (!prev || JSON.stringify(prev) !== JSON.stringify(x)) await dbPut(DOC(pid), it.id, x); }
        next = (r.j && r.j['@odata.nextLink']) || '';
      }
    }
    if (complete) { let checks = 0;
      for (const x of old.values()) if (!seen.has(x.id) && !x.missing) {   // gone from the project folder: deleted, or moved somewhere else in SharePoint
        const r = checks++ < 20 ? await graph('GET', item(rec, x.id, '$select=id,webUrl'), undefined, true) : { status: 404 };
        x.missing = r.status === 404 ? 'Deleted in SharePoint' : 'Moved out of the project folder'; if (r.j && r.j.webUrl) x.url = r.j.webUrl; await dbPut(DOC(pid), x.id, x); } }
    rec.docsAt = new Date().toISOString(); await dbPut('spp', pid, rec); return { complete, files: seen.size };
  }
  route('GET', '/api/projects/:id/spfiles', async (b, P, Q) => {
    const s = await me(); const a = await team(s, P.id, 'read'); const canEdit = a.role !== 'viewer';
    if (!(await configured())) return ok({ configured: false, folders: FOLDERS, uploadFolders: UPLOAD_FOLDERS, files: [], uploads: [], canEdit });
    let rec = await recOf(P.id); if (!rec || !rec.folderId) { if (!canEdit) return ok({ configured: true, folder: null, folders: FOLDERS, uploadFolders: UPLOAD_FOLDERS, files: [], uploads: [], canEdit, note: 'The project folder is made when an editor opens this page.' }); rec = await projectFolder(a.project); }
    let note = ''; if (Q.get('refresh') === '1' || !rec.docsAt) { try { const r = await withLock('spdocs.' + P.id, () => refresh(P.id, rec)); if (!r.complete) note = 'Only part of the folder was read this time. Press Refresh again for the rest.'; } catch (e) { note = 'Could not read SharePoint: ' + e.message; } }
    const all = await docsOf(P.id), stale = Date.now() - 2 * 864e5;
    for (const x of all.filter(x => x.status === 'uploading' && Date.parse(x.at) < stale)) await dbDel(DOC(P.id), x.id);   // an upload nobody finished in two days
    return ok({ configured: true, folder: { url: rec.url, name: rec.name, root: ROOT }, folders: FOLDERS, uploadFolders: UPLOAD_FOLDERS, maxBytes: MAX_DOC, piece: SEG, refreshedAt: rec.docsAt || null, note, canEdit,
      files: all.filter(x => x.status === 'ready').sort(newest), uploads: all.filter(x => x.status === 'uploading' && Date.parse(x.at) >= stale && x.by === s.email) });
  });
  // upload, step 1: the checks, then a Microsoft upload session in the chosen folder. Its link goes to this browser only: it is never stored or logged.
  route('POST', '/api/projects/:id/spfiles/uploads', async (b, P) => { const s = await me(); const { project } = await team(s, P.id, 'edit'); return ok(await beginUpload(s, project, b), 201); });
  async function beginUpload(s, project, b) {
    await needSetUp(); if (limit) await limit('upload', s.id); const P = { id: project.id };
    const name = safeName(b && b.name), size = Number(b && b.size), folder = String((b && b.folder) || '');
    if (!UPLOAD_FOLDERS.includes(folder)) throw new HttpError(400, 'Choose one of the project folders 01 to 07');
    if (BLOCKED.test(name)) throw new HttpError(415, 'Programs and scripts cannot be stored in a project folder');
    if (!(size > 0)) throw new HttpError(400, 'The file is empty'); if (size > MAX_DOC) throw new HttpError(413, 'The file is larger than ' + Math.round(MAX_DOC / 1024 ** 3) + ' GB, the most a project file can be');
    const rec = await projectFolder(project), parent = await sub(project, rec, folder);
    const u = await graph('POST', item(rec, parent) + ':/' + encodeURIComponent(name) + ':/createUploadSession', { item: { '@microsoft.graph.conflictBehavior': 'rename' } });   // the same name again becomes "name 1.ext", never an overwrite
    const link = String((u.j || {}).uploadUrl || ''); if (!okLink(link)) throw new HttpError(502, 'SharePoint did not give an upload link');
    const id = rid('up'); await dbPut(DOC(P.id), id, { id, status: 'uploading', name, size, folder, by: s.email, at: new Date().toISOString() });
    return { uploadId: id, uploadUrl: link, expires: (u.j || {}).expirationDateTime || '', piece: SEG, name, folder };
  }
  // upload, step 2: the browser sent the last piece and got the item id; the file is read back from Microsoft and kept only when its size and folder match
  route('POST', '/api/projects/:id/spfiles/uploads/:uid/finish', async (b, P) => { const s = await me(); await team(s, P.id, 'edit'); return ok(await finishUpload(s, P, b)); });
  async function finishUpload(s, P, b) {
    const r = await dbGet(DOC(P.id), P.uid), up = r && r.value;
    if (!up || up.status !== 'uploading') throw new HttpError(404, 'Upload not found'); if (up.by !== s.email) throw new HttpError(403, 'Only the person who started the upload can finish it');
    const iid = String((b && b.itemId) || ''); if (!/^[A-Za-z0-9!._-]{5,200}$/.test(iid)) throw new HttpError(400, 'itemId missing');
    const rec = await recOf(P.id); const g = await graph('GET', item(rec, iid, SEL), undefined, true);
    if (g.status === 404 || !g.j || !g.j.file) throw new HttpError(409, 'SharePoint does not have the finished file yet. Try again in a moment.');
    if (Number(g.j.size) !== up.size || (g.j.parentReference || {}).id !== rec.subs[up.folder]) throw new HttpError(409, 'The file in SharePoint does not match what was sent (size or folder), so it was not added.');
    const x = docRecord(g.j, up.folder, up.folder, { uploadedBy: s.email, source: 'upload' }); await dbPut(DOC(P.id), x.id, x); await dbDel(DOC(P.id), P.uid);
    await audit(P.id, s.id, 'doc-uploaded', up.folder + ': ' + x.name + ' (' + x.size + ' bytes)'); try { await writeIndex(await projectOf(P.id), rec); } catch (e) { /* the index catches up on the next change */ }
    return { file: x };
  }
  route('DELETE', '/api/projects/:id/spfiles/uploads/:uid', async (b, P) => {   // a cancelled or failed upload (the browser cancels the Microsoft session itself)
    const s = await me(); await team(s, P.id, 'edit'); const r = await dbGet(DOC(P.id), P.uid); if (r && r.value && r.value.status === 'uploading' && r.value.by === s.email) await dbDel(DOC(P.id), P.uid); return ok({ ok: true });
  });
  // download: a short-lived link Microsoft signs for this one file, handed out only after the project check
  route('GET', '/api/projects/:id/spfiles/:iid/download', async (b, P) => {
    const s = await me(); await team(s, P.id, 'read'); await needSetUp(); const x = await docOf(P.id, P.iid), rec = await recOf(P.id);
    const g = await graph('GET', item(rec, x.id, '$select=id,@microsoft.graph.downloadUrl'), undefined, true);
    if (g.status === 404) { x.missing = 'Deleted in SharePoint'; await dbPut(DOC(P.id), x.id, x); throw new HttpError(404, 'This file is no longer in SharePoint'); }
    const url = String((g.j || {})['@microsoft.graph.downloadUrl'] || ''); if (!okLink(url)) throw new HttpError(502, 'SharePoint did not give a download link'); return ok({ url, name: x.name });
  });
  // rename or move inside the project folder; a name already taken is refused, never overwritten
  route('PATCH', '/api/projects/:id/spfiles/:iid', async (b, P) => {
    const s = await me(); const { project } = await team(s, P.id, 'edit'); await needSetUp(); const x = await docOf(P.id, P.iid), rec = await recOf(P.id), patch = {};
    if (b && b.name != null) { const n = safeName(b.name); if (BLOCKED.test(n)) throw new HttpError(415, 'Programs and scripts cannot be stored in a project folder'); if (n !== x.name) patch.name = n; }
    if (b && b.folder != null) { if (!FOLDERS.includes(b.folder)) throw new HttpError(400, 'Choose one of the eight project folders'); if (b.folder !== x.folder || x.path !== x.folder) patch.parentReference = { id: await sub(project, rec, b.folder) }; }
    if (!Object.keys(patch).length) return ok({ file: x });
    const g = await graph('PATCH', item(rec, x.id, '@microsoft.graph.conflictBehavior=fail'), patch, true);
    if (g.status === 409) throw new HttpError(409, 'A file with that name is already in that folder'); if (g.status === 404) { x.missing = 'Deleted in SharePoint'; await dbPut(DOC(P.id), x.id, x); throw new HttpError(404, 'This file is no longer in SharePoint'); }
    const folder = patch.parentReference ? b.folder : x.folder, y = docRecord(g.j || {}, folder, patch.parentReference ? folder : x.path, x); await dbPut(DOC(P.id), x.id, y);
    await audit(P.id, s.id, patch.parentReference ? 'doc-moved' : 'doc-renamed', x.path + '/' + x.name + ' → ' + y.path + '/' + y.name); return ok({ file: y });
  });
  // delete: SharePoint keeps it in the site's recycle bin, where an owner of the site can restore it
  route('DELETE', '/api/projects/:id/spfiles/:iid', async (b, P) => {
    const s = await me(); await team(s, P.id, 'edit'); await needSetUp(); const x = await docOf(P.id, P.iid), rec = await recOf(P.id);
    await graph('DELETE', item(rec, x.id), undefined, true); await dbDel(DOC(P.id), x.id); await audit(P.id, s.id, 'doc-deleted', x.path + '/' + x.name); return ok({ ok: true });
  });

  const projectOf = async pid => ((await dbGet('projects', pid)) || {}).value;
  const configured = async () => !!(await siteUrl()) && !!ctx().fetch;
  return { syncAccess: async pid => { const p = await projectOf(pid); if (p && await siteUrl()) return syncAccess(p); },
    folderOf: async pid => { const r = await recOf(pid); return r ? { url: r.url, name: r.name, root: ROOT, index: (r.index && r.index.url) || '' } : null; },
    /** a new project: its folder, the eight standard folders and the index, when SharePoint is set up (false when it is not) */
    ensure: async pid => { const p = await projectOf(pid); if (!p || !(await configured())) return false; await projectFolder(p); return true; },
    /** Claude saving an approved deliverable into a project folder (project_jobs file_put_begin with folder): the same checks and upload session as the Documents page */
    beginUpload, finishUpload: (s, pid, uid, itemId) => finishUpload(s, { id: pid, uid }, { itemId }), UPLOAD_FOLDERS,
    /** for the connector (get_document section "documents"): the files on the Documents page, filtered, plus the inventory. Refreshes when asked or when never read. */
    docs: async (pid, o) => { o = o || {}; const on = await configured(), rec = await recOf(pid); if (!on || !rec) return { configured: on, folder: null, files: [], inventory: inventory([]), note: on ? 'The project folder is not made yet: open Documents & Files once.' : 'SharePoint is not set up yet.' };
      let note = ''; if (o.refresh || !rec.docsAt) { try { const r = await withLock('spdocs.' + pid, () => refresh(pid, rec)); if (!r.complete) note = 'Only part of the folder was read; ask again for the rest.'; } catch (e) { note = 'Could not read SharePoint: ' + e.message; } }
      const all = (await docsOf(pid)).filter(x => x.status === 'ready'), q = String(o.q || '').toLowerCase().trim(), k = String(o.kind || '').toLowerCase();
      const hit = all.filter(x => (!q || (x.name + ' ' + x.path).toLowerCase().includes(q)) && (!k || x.kind.toLowerCase() === k) && (!o.folder || x.folder === o.folder || String(x.folder).startsWith(String(o.folder)))).sort(newest);
      return { configured: true, folder: { url: rec.url, name: rec.name, folders: FOLDERS.map(n => ({ name: n, url: rec.url + '/' + encodeURIComponent(n) })) }, refreshedAt: rec.docsAt || null, note, total: hit.length,
        files: hit.slice(0, 100).map(x => Object.assign(brief(x), { missing: x.missing || undefined })), inventory: inventory(all) }; },
    /** for the connector: the folder, the standard folders and every copied document with its SharePoint link, plus the index text */
    indexOf: async pid => { const p = await projectOf(pid); const rec = await recOf(pid); const on = await configured(); if (!p) return null;
      const files = (await dbList('fl.' + pid)).map(r => r.value).filter(f => f && f.status === 'ready' && !f.deletedAt && !f.supersededBy && !SKIP.has(f.category));
      const x = indexData ? await indexData(pid) : {};
      return { configured: on, root: ROOT, folder: rec ? { url: rec.url, name: rec.name, index: (rec.index && rec.index.url) || '', folders: FOLDERS.map(n => ({ name: n, url: rec.url + '/' + encodeURIComponent(n) })) } : null,
        documents: files.slice(0, 200).map(f => ({ id: f.id, name: f.name, category: f.category, folder: (f.sp && f.sp.folder) || subfolderOf(f.category, f.meta), savedAt: f.createdAt, sharepoint: (f.sp && f.sp.url) || '', copied: !!(f.sp && f.sp.url) })),
        index: indexMarkdown(Object.assign({}, x, { folder: { url: rec ? rec.url : '' }, documents: files.filter(f => f.sp && f.sp.url).map(f => ({ name: f.name, folder: f.sp.folder, at: f.sp.at, url: f.sp.url })), at: new Date().toISOString() })) }; } };
}
