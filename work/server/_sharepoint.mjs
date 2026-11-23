/* SharePoint project folders (user, 16 Nov 2026): every project file (uploads, exports, what Claude saves) is copied to one shared SharePoint library,
   one folder per project with subfolders by document type, shared with the project's members (owners and editors edit, viewers read).
   Layout (user, 23 Nov 2026): Facilio Onboarding / <project name> / 01_Project Governance … 08_Archive, all made when the project is made, plus PROJECT_INDEX.md
   (project id, Facilio Org ID, document links, tasks, missed steps, decisions, recent updates), rewritten after each copy. Delivery Studio is the master; SharePoint is the shared copy.
   One file per document: an export that is saved again overwrites the same name, so SharePoint keeps versions instead of copies.
   Needs (owner action, see docs/integrations/SHAREPOINT-2026-11-16.md): an OAuth2 credential "graph_files" (Entra app, Graph Sites.Selected with full control
   on one site) granted to this app, and a plain secret "sharepoint_site" (https://<tenant>.sharepoint.com/sites/<site>). Without them nothing is copied.
   The page drives the copy one 10 MB piece per request (the platform gives a function 25 seconds); the upload link stays on the server.
   Routes: GET /api/sharepoint/status, GET /api/projects/:id/sharepoint, POST /api/projects/:id/sharepoint/access, POST /api/projects/:id/files/:fid/sharepoint. */

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

export function installSharePoint(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, dbList, withLock, audit, CTX, CHUNK, indexData } = d;
  const CRED = 'graph_files', G = 'https://graph.microsoft.com/v1.0';
  const ctx = () => CTX();
  const siteUrl = async () => { try { return String(await ctx().secrets.get('sharepoint_site') || '').trim().replace(/\/+$/, ''); } catch (e) { return ''; } };
  const team = async (s, pid, need) => { const a = await projectAccess(s, pid, need); if (a.role === 'customer') throw new HttpError(403, 'SharePoint copies are for the delivery team'); return a; };

  async function graph(method, path, body) {
    if (!ctx().fetch) throw new HttpError(503, 'This platform build cannot call Microsoft');
    const text = typeof body === 'string';   // a text file's content (PROJECT_INDEX.md), sent as it is
    let r; try { r = await ctx().fetch(CRED, path.startsWith('https://') ? path : G + path, { method, headers: body ? { 'content-type': text ? 'text/markdown; charset=utf-8' : 'application/json' } : {}, body: body ? (text ? body : JSON.stringify(body)) : undefined }); }
    catch (e) { throw new HttpError(424, 'The Microsoft credential "' + CRED + '" is missing or not granted to this app. See the SharePoint set-up note.'); }
    if (r.ok || r.status === 409) { let j = null; try { j = r.status === 204 ? null : await r.json(); } catch (e) { } return { status: r.status, j }; }
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
    const md = indexMarkdown(Object.assign({}, await indexData(p.id), { folder: { url: rec.url }, documents: files.slice(0, 200).map(f => ({ name: f.name, folder: f.sp.folder, at: f.sp.at, url: f.sp.url })), at: new Date().toISOString() }));
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
  const projectOf = async pid => ((await dbGet('projects', pid)) || {}).value;
  const configured = async () => !!(await siteUrl()) && !!ctx().fetch;
  return { syncAccess: async pid => { const p = await projectOf(pid); if (p && await siteUrl()) return syncAccess(p); },
    folderOf: async pid => { const r = await recOf(pid); return r ? { url: r.url, name: r.name, root: ROOT, index: (r.index && r.index.url) || '' } : null; },
    /** a new project: its folder, the eight standard folders and the index, when SharePoint is set up (false when it is not) */
    ensure: async pid => { const p = await projectOf(pid); if (!p || !(await configured())) return false; await projectFolder(p); return true; },
    /** for the connector: the folder, the standard folders and every copied document with its SharePoint link, plus the index text */
    indexOf: async pid => { const p = await projectOf(pid); const rec = await recOf(pid); const on = await configured(); if (!p) return null;
      const files = (await dbList('fl.' + pid)).map(r => r.value).filter(f => f && f.status === 'ready' && !f.deletedAt && !f.supersededBy && !SKIP.has(f.category));
      const x = indexData ? await indexData(pid) : {};
      return { configured: on, root: ROOT, folder: rec ? { url: rec.url, name: rec.name, index: (rec.index && rec.index.url) || '', folders: FOLDERS.map(n => ({ name: n, url: rec.url + '/' + encodeURIComponent(n) })) } : null,
        documents: files.slice(0, 200).map(f => ({ id: f.id, name: f.name, category: f.category, folder: (f.sp && f.sp.folder) || subfolderOf(f.category, f.meta), savedAt: f.createdAt, sharepoint: (f.sp && f.sp.url) || '', copied: !!(f.sp && f.sp.url) })),
        index: indexMarkdown(Object.assign({}, x, { folder: { url: rec ? rec.url : '' }, documents: files.filter(f => f.sp && f.sp.url).map(f => ({ name: f.name, folder: f.sp.folder, at: f.sp.at, url: f.sp.url })), at: new Date().toISOString() })) }; } };
}
