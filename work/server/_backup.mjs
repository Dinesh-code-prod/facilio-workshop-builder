/* Project backup to the person's own computer (user, 25 Nov 2026: a local folder for now, OneDrive later; so nobody is stuck when the Studio is down): the Studio builds one ZIP per project with what lives only inside it, readable without the Studio
   (README.html, an Excel-ready CSV per record type, an HTML page per document section, the project files up to a size cap) plus the full data as JSON for a restore.
   The ZIP is kept privately in the app's storage and handed out as a one-hour link to a team member: Download backup in Project Settings, or the person's Claude (project_jobs
   action backup) saves it daily in D:\Delivery Studio backups (Windows) or ~/Delivery Studio backups (Mac), keeping 7 days. Nothing is written to Microsoft by the Studio (facilio.work keeps
   Microsoft credentials read-only). Routes: POST and GET /api/projects/:id/backup. Private notes are never included. */
import { deflateRawSync } from 'node:zlib';

// ---------- pure ----------
const CRC = new Int32Array(256).map((_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n; });
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
/** a ZIP of [{ name, data: Buffer | string }] (deflated, UTF-8 names), readable by Windows, macOS and Excel */
export function zip(files, when) {
  const t = when || new Date(), time = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1), date = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate();
  const out = [], dir = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8'), z = deflateRawSync(raw), crc = crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(z.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(z.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(off, 42);
    out.push(h, name, z); dir.push(c, name); off += 30 + name.length + z.length;
  }
  const cd = Buffer.concat(dir), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat(out.concat([cd, e]));
}
/** Windows, macOS and SharePoint all accept this file or folder name */
export const fileName = s => String(s || '').replace(/["*:<>?/\\|#%]/g, '-').replace(/[\u0000-\u001f]/g, '').replace(/[.\s]+$/, '').trim().slice(0, 100) || 'file';
const csvCell = v => { let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); if (s.length > 5000) s = s.slice(0, 5000) + '…';
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // a cell Excel would run as a formula is kept as text
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
/** rows ([{ id, createdAt, updatedAt, data }]) as a CSV Excel opens in UTF-8: id, created, updated, then each field (nested values as JSON) */
export function toCsv(items) {
  const cols = []; for (const it of items) for (const k of Object.keys(it.data || {})) if (!cols.includes(k) && cols.length < 40) cols.push(k);
  return '﻿' + [['id', 'createdAt', 'updatedAt'].concat(cols).map(csvCell).join(',')].concat(items.map(it => [it.id, it.createdAt, it.updatedAt].concat(cols.map(c => (it.data || {})[c])).map(csvCell).join(','))).join('\r\n') + '\r\n';
}
const hx = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** any saved JSON as readable HTML: lists of records as tables, objects as labelled fields, text with its line breaks */
export function toHtml(v, depth) {
  depth = depth || 0;
  if (v == null || v === '') return '<span class="m">—</span>';
  if (typeof v !== 'object') return hx(v).replace(/\n/g, '<br>');
  if (depth > 6) return '<code>' + hx(JSON.stringify(v).slice(0, 2000)) + '</code>';
  if (Array.isArray(v)) {
    if (!v.length) return '<span class="m">none</span>';
    if (v.every(x => x && typeof x === 'object' && !Array.isArray(x))) { const cols = [...new Set(v.flatMap(x => Object.keys(x)))].slice(0, 12); return '<table><tr>' + cols.map(c => '<th>' + hx(c) + '</th>').join('') + '</tr>' + v.slice(0, 3000).map(r => '<tr>' + cols.map(c => '<td>' + toHtml(r[c], depth + 1) + '</td>').join('') + '</tr>').join('') + '</table>'; }
    return '<ul>' + v.slice(0, 3000).map(x => '<li>' + toHtml(x, depth + 1) + '</li>').join('') + '</ul>';
  }
  return '<dl>' + Object.entries(v).slice(0, 300).map(([k, x]) => '<dt>' + hx(k) + '</dt><dd>' + toHtml(x, depth + 1) + '</dd>').join('') + '</dl>';
}
export const htmlPage = (title, body) => '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + hx(title) + '</title><style>body{font:14px/1.5 system-ui,sans-serif;margin:32px;color:#222;max-width:1200px}table{border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:4px 8px;vertical-align:top;text-align:left}th{background:#f4f4f7}dt{font-weight:600;margin-top:8px}dd{margin:0 0 0 16px}.m{color:#888}</style></head><body><h1>' + hx(title) + '</h1>' + body + '</body></html>';
export const FILE_CAP = 40 * 1024 * 1024;   // shortcut: project files go in only up to 40 MB per backup (it must fit one 25-second call); bigger ones are listed in Files/files.csv, not copied
const NOT_YOURS = '\u0000backup';   // the viewer the backup reads as: private notes are only their writer's, so they never go in
const SKIP = new Set(['logo_facilio', 'logo_customer', 'brd_template']);   // settings files, not project documents

export function installBackup(d) {
  const { route, ok, HttpError, me, projectAccess, dbGet, dbPut, dbList, audit, CTX, docRead, itemsOf, KINDS, KIND_LABEL, limit } = d;
  const ctx = () => CTX();
  const team = async (s, pid) => { const a = await projectAccess(s, pid, 'read'); if (a.role === 'customer') throw new HttpError(403, 'Backups are for the delivery team'); return a; };
  async function bytesOf(f) {   // a stored project file, put back together from its parts
    const out = []; for (const id of f.urls || []) { const { url } = await ctx().files.url(id, { private: true, expires: 300 }); const r = await fetch(url); if (!r.ok) throw new Error('storage ' + r.status); out.push(Buffer.from(await r.arrayBuffer())); } return Buffer.concat(out);
  }
  /** builds the project's backup ZIP, keeps it privately (the previous one is removed) and returns a one-hour link with what is inside */
  async function build(s, p) {
    const day = new Date().toISOString().slice(0, 10), files = [], list = [];
    const add = (name, data, what, where) => { files.push({ name, data }); list.push({ name, what, where: where || '' }); };
    for (const r of await dbList('doc.' + p.id)) { const x = await docRead(p.id, r.key); if (!x || x.data == null) continue;
      add('data/section-' + fileName(r.key) + '.json', JSON.stringify(x.data, null, 1), '', 'data'); add('Sections/' + fileName(r.key) + '.html', htmlPage((p.name || '') + ': ' + r.key, toHtml(x.data)), 'document section', 'Sections'); }
    let records = 0;
    for (const k of KINDS) { const rows = await itemsOf(p.id, k, NOT_YOURS); if (!rows.length) continue; records += rows.length;
      add('data/items-' + k + '.json', JSON.stringify(rows, null, 1), '', 'data'); add('Records/' + fileName(KIND_LABEL[k] || k) + '.csv', toCsv(rows), rows.length + ' record' + (rows.length === 1 ? '' : 's'), 'Records'); }
    const stored = (await dbList('fl.' + p.id)).map(r => r.value).filter(f => f && f.status === 'ready' && !f.deletedAt && !f.supersededBy && !SKIP.has(f.category)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    let used = 0; const left = new Set();
    for (const f of stored) {
      if (used + (f.size || 0) > FILE_CAP) { left.add(f); continue; }
      try { const b = await bytesOf(f); used += b.length; add('Files/' + fileName(f.category) + '/' + String(f.id).slice(-6) + ' ' + fileName(f.name), b, Math.round(b.length / 1024) + ' KB', 'Files'); } catch (e) { left.add(f); }
    }
    add('Files/files.csv', toCsv(stored.map(f => ({ id: f.id, createdAt: f.createdAt, updatedAt: f.createdAt, data: { name: f.name, category: f.category, size: f.size, inThisBackup: !left.has(f), sharepoint: (f.sp && f.sp.url) || '' } }))), 'every project file, and whether it is in this backup', 'Files');
    const proj = { id: p.id, name: p.name, customer: p.customer || '', orgId: p.orgId || '', region: p.region || '', status: p.status || '', start: p.start || '', end: p.end || '', members: (p.members || []).map(m => ({ name: m.name, email: m.email, role: m.role })), backupDate: day };
    add('data/project.json', JSON.stringify(proj, null, 1), '', 'data');
    const by = w => list.filter(x => x.where === w).map(x => '<li>' + hx(x.name.split('/').pop()) + (x.what ? ' <span class="m">' + hx(x.what) + '</span>' : '') + '</li>').join('') || '<li class="m">none</li>';
    files.unshift({ name: 'README.html', data: htmlPage('Delivery Studio backup: ' + (p.name || ''), '<p>Made by Facilio Delivery Studio on ' + hx(day) + ' (UTC) for ' + hx(s.email) + '. It holds what lives inside the Studio, so the project can be read when the Studio cannot be opened. Records open in Excel; sections and this page open in a browser.</p>'
      + toHtml({ Project: proj.name, 'Delivery Studio project ID': proj.id, Customer: proj.customer, 'Facilio Organization ID': proj.orgId })
      + '<h2>Records (Excel)</h2><ul>' + by('Records') + '</ul><h2>Document sections</h2><ul>' + by('Sections') + '</ul><h2>Project files</h2><ul>' + by('Files') + '</ul>' + (left.size ? '<p>' + left.size + ' file(s) were too big for this backup; Files/files.csv lists them.</p>' : '')
      + '<h2>Full data for a restore</h2><p class="m">The data folder holds every record and section as JSON. Private notes are not included.</p>') });
    const zbuf = zip(files), name = fileName((p.name || 'Project') + ' backup ' + day) + '.zip';
    let fid; if (zbuf.length <= 3.5e6) fid = (await ctx().files.put({ filename: 'backup-' + p.id + '.zip', body: zbuf, content_type: 'application/zip', private: true })).file_id;
    else { const u = await ctx().files.uploadUrl('backup-' + p.id + '.zip', { private: true }); const r = await fetch(u.url, { method: 'PUT', body: zbuf }); if (!r.ok) throw new HttpError(502, 'Could not store the backup (' + r.status + ')'); fid = u.file_id; }
    const prev = ((await dbGet('bk', p.id)) || {}).value; if (prev && prev.fileId && prev.fileId !== fid) { try { await ctx().files.delete(prev.fileId, { private: true }); } catch (e) { } }
    await dbPut('bk', p.id, { fileId: fid, at: new Date().toISOString(), by: s.email, size: zbuf.length });
    const { url } = await ctx().files.url(fid, { private: true, download: name, expires: 3600 });
    await audit(p.id, s.id, 'backup-made', zbuf.length + ' bytes, ' + records + ' records, ' + files.length + ' files');
    return { project: p.name, folder: fileName(p.name || p.id), fileName: name, url, expires: '1 hour', size: zbuf.length, contents: { records, sections: list.filter(x => x.where === 'Sections').length, files: list.filter(x => x.where === 'Files').length - 1, filesNotIncluded: left.size } };
  }
  route('POST', '/api/projects/:id/backup', async (b, P) => { const s = await me(); const { project } = await team(s, P.id); if (limit) await limit('backup', s.id); return ok(await build(s, project)); });
  route('GET', '/api/projects/:id/backup', async (b, P) => { const s = await me(); await team(s, P.id); const r = ((await dbGet('bk', P.id)) || {}).value; return ok({ last: r ? { at: r.at, by: r.by, size: r.size } : null }); });
  return { build: async (s, pid) => { const { project } = await team(s, pid); if (limit) await limit('backup', s.id); return build(s, project); } };
}
