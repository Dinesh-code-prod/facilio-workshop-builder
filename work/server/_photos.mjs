/* Profile pictures: each person uploads their own photo, or copies their Teams (Microsoft 365) photo; admins can copy Teams photos for everyone who has none.
   The bytes live in private files; one index record (cfg/photos) maps email -> { f: file id, t: type, v: version, src }. Only signed-in people can read a photo.
   The Teams photo needs Microsoft Graph ProfilePhoto.Read.All (application, admin consent) on the Entra app behind the PHOTO_CRED credential.
   Setup and the Graph permission: docs/integrations/PROFILE-PHOTOS-2026-11-24.md.
   Routes: PUT/DELETE /api/me/photo, POST /api/me/photo/teams, GET /api/people/:email/photo, POST /api/admin/photos/teams. api.mjs calls installPhotos(deps) once. */
export const PHOTO_CRED = 'graph_mail';
export const PHOTO_MAX = 512 * 1024;
export const PHOTO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
/** true when the first bytes match the claimed image type */
export const photoMagic = (mt, b) => (mt === 'image/png' ? b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
  : mt === 'image/jpeg' ? b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF
  : mt === 'image/webp' ? b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 : false);
/** the type of an image from its bytes (Graph does not always say), or '' */
export const sniffType = b => Object.keys(PHOTO_TYPES).find(t => photoMagic(t, b)) || '';

export function installPhotos(d) {
  const { route, ok, HttpError, me, dbGet, dbPut, dbList, withLock, audit, limit, requireAdmin, ctx } = d;
  const now = () => new Date().toISOString();
  const index = async () => ((await dbGet('cfg', 'photos').catch(() => null)) || {}).value || {};
  // store bytes for one person, replacing (and deleting) any earlier photo
  async function store(email, type, bytes, src, by) {
    if (!PHOTO_TYPES[type] || !photoMagic(type, bytes)) throw new HttpError(415, 'Use a PNG, JPEG or WebP picture');
    if (bytes.length > PHOTO_MAX) throw new HttpError(413, 'The picture is larger than 512 KB. Use a smaller one.');
    const put = await ctx().files.put({ filename: 'photo-' + email.replace(/[^a-z0-9]/g, '_') + '.' + PHOTO_TYPES[type], body: Buffer.from(bytes), content_type: type, private: true });
    let old = null; const v = Date.now().toString(36);
    await withLock('photos', async () => { const ix = await index(); old = ix[email]; ix[email] = { f: put.file_id, t: type, v, src, at: now(), by }; await dbPut('cfg', 'photos', ix); });
    if (old && old.f) Promise.resolve().then(() => ctx().files.delete(old.f, { private: true })).catch(() => { });
    return v;
  }
  async function drop(email) {
    let old = null; await withLock('photos', async () => { const ix = await index(); old = ix[email]; if (!old) return; delete ix[email]; await dbPut('cfg', 'photos', ix); });
    if (old && old.f) Promise.resolve().then(() => ctx().files.delete(old.f, { private: true })).catch(() => { }); return !!old;
  }
  // the person's photo from Microsoft 365 (the one Teams shows): { bytes, type } or { none: true }; throws when the credential or permission is missing
  async function teamsPhoto(email) {
    if (!ctx().fetch) throw new HttpError(503, 'Teams photos are not available here');
    let r; try { r = await ctx().fetch(PHOTO_CRED, 'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(email) + '/photos/240x240/$value', { method: 'GET', response: 'base64' }); }
    catch (e) { throw new HttpError(424, 'Teams photos need the Microsoft 365 credential (' + PHOTO_CRED + ') granted to this app. Upload a picture instead.'); }
    if (r.status === 404) return { none: true };
    if (r.status === 401 || r.status === 403) throw new HttpError(424, 'Microsoft refused to share Teams photos (' + r.status + '). The app\'s Microsoft 365 credential needs the ProfilePhoto.Read.All permission with admin consent. Upload a picture instead.');
    if (!r.ok) throw new HttpError(502, 'Microsoft returned ' + r.status + '. Try again later, or upload a picture.');
    const bytes = Buffer.from(String(r.body || ''), 'base64'); const type = sniffType(bytes);
    if (!type) throw new HttpError(415, 'The Teams photo is not a PNG, JPEG or WebP picture. Upload one instead.');
    return { bytes, type };
  }

  route('PUT', '/api/me/photo', async b => {
    const s = await me(); await limit('upload', s.id); const mt = String(b && b.mediaType || ''); const data = String(b && b.data || '');
    if (!PHOTO_TYPES[mt]) throw new HttpError(415, 'Use a PNG, JPEG or WebP picture');
    if (!/^[A-Za-z0-9+/]+=*$/.test(data)) throw new HttpError(400, 'The picture was not sent correctly');
    if (data.length > Math.ceil(PHOTO_MAX / 3) * 4) throw new HttpError(413, 'The picture is larger than 512 KB. Use a smaller one.');
    const v = await store(s.email, mt, Buffer.from(data, 'base64'), 'upload', s.email); await audit('people', s.id, 'photo-upload', s.email); return ok({ ok: true, photo: v, src: 'upload' });
  });
  route('DELETE', '/api/me/photo', async () => { const s = await me(); await drop(s.email); await audit('people', s.id, 'photo-remove', s.email); return ok({ ok: true, photo: null }); });
  route('POST', '/api/me/photo/teams', async () => {
    const s = await me(); await limit('teams', s.id); const p = await teamsPhoto(s.email);
    if (p.none) throw new HttpError(404, 'You have no photo in Teams yet. Upload a picture instead.');
    const v = await store(s.email, p.type, p.bytes, 'teams', s.email); await audit('people', s.id, 'photo-teams', s.email); return ok({ ok: true, photo: v, src: 'teams' });
  });
  // signed-in people only (me() refuses anyone else); the bytes go out as an image, cached by version
  route('GET', '/api/people/:email/photo', async (b, P) => {
    await me(); const e = String(P.email || '').toLowerCase(); const x = (await index())[e]; if (!x) throw new HttpError(404, 'No photo');
    let g; try { g = await ctx().files.get(x.f, { private: true }); } catch (err) { throw new HttpError(404, 'No photo'); }
    return { status: 200, data: null, raw: { type: x.t, body: Buffer.from(await g.bytes()) } };
  });
  // admins: copy the Teams photo of everyone who has no photo yet, a batch at a time (each call stays well inside the 25 s budget)
  route('POST', '/api/admin/photos/teams', async () => {
    const s = await requireAdmin('admin'); await limit('teams', s.id); const ix = await index();
    const tried = await dbGet('cfg', 'photos-none').catch(() => null); const none = (tried && tried.value) || {};
    const todo = (await dbList('usr')).map(r => r.value).filter(u => u && u.email && !u.disabled).map(u => String(u.email).toLowerCase()).filter(em => !ix[em] && !none[em]);
    const batch = todo.slice(0, 25); const out = { added: 0, none: 0, failed: 0, left: todo.length - batch.length };
    for (const em of batch) {
      try { const p = await teamsPhoto(em); if (p.none) { none[em] = now(); out.none++; } else { await store(em, p.type, p.bytes, 'teams', s.email); out.added++; } }
      catch (e) { if (e.status === 424 || e.status === 503) throw e; out.failed++; }
    }
    await dbPut('cfg', 'photos-none', none); await audit('people', s.id, 'photos-teams-all', JSON.stringify(out)); return ok(out);
  });
  return { index };
}
