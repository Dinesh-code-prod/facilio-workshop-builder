// Profile pictures (work/server/_photos.mjs): upload refuses a wrong type, spoofed bytes and an oversize picture; only signed-in people can read a photo;
// removing works; the Teams photo is copied when Microsoft shares it, and a missing permission or a missing photo is explained, never faked.
import assert from 'node:assert/strict'; import { installPhotos, PHOTO_MAX } from '../work/server/_photos.mjs';
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const db = new Map(), blobs = new Map(); let fid = 0, viewer = 'kim@facilio.com', graph = null; const routes = [];
const CTX = { files: { async put(o) { const id = 'f' + (++fid); blobs.set(id, Buffer.from(o.body)); return { file_id: id }; }, async get(id) { if (!blobs.has(id)) throw new Error('nf'); return { bytes: async () => blobs.get(id) }; }, async delete(id) { blobs.delete(id); } },
  fetch: async (cred, url, o) => { assert.equal(cred, 'graph_mail'); assert.equal(o.response, 'base64'); assert.ok(url.startsWith('https://graph.microsoft.com/v1.0/users/')); return graph(url); } };
const me = async () => { if (!viewer) throw new HttpError(401, 'Sign in required'); return { id: viewer, email: viewer }; };
installPhotos({ route: (m, p, fn) => routes.push({ m, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn }), ok: data => ({ status: 200, data }), HttpError, me,
  dbGet: async (c, k) => (db.has(c + '/' + k) ? { value: structuredClone(db.get(c + '/' + k)) } : null), dbPut: async (c, k, v) => { db.set(c + '/' + k, structuredClone(v)); },
  dbList: async c => [...db].filter(([k]) => k.startsWith(c + '/')).map(([, value]) => ({ value })), withLock: (k, f) => f(), audit: async () => { }, limit: async () => { },
  requireAdmin: async () => { if (viewer !== 'admin@facilio.com') throw new HttpError(403, 'Admin access required'); return { id: viewer, email: viewer }; }, ctx: () => CTX });
const call = async (m, path, body) => { for (const r of routes) { const x = r.m === m && r.re.exec(path); if (x) { try { return await r.fn(body, x.groups || {}); } catch (e) { return { status: e.status, data: { error: e.message } }; } } } return { status: 404 }; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGMQLXiPFTEMLQkAIGRdAVjtDBkAAAAASUVORK5CYII=', 'base64');
const JPG = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(60)]);
const tick = () => new Promise(r => setTimeout(r, 5));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

await t('a wrong type, spoofed bytes, bad base64 and an oversize picture are refused', async () => {
  assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/gif', data: PNG.toString('base64') })).status, 415);
  assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/svg+xml', data: Buffer.from('<svg/>').toString('base64') })).status, 415);
  assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/jpeg', data: PNG.toString('base64') })).status, 415);   // PNG bytes claiming to be JPEG
  assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/png', data: '<script>' })).status, 400);
  const big = Buffer.concat([PNG, Buffer.alloc(PHOTO_MAX)]); assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/png', data: big.toString('base64') })).status, 413);
  assert.equal(db.get('cfg/photos'), undefined);
});
await t('a person uploads a PNG; signed-in people read it as an image; signed-out is refused', async () => {
  const r = await call('PUT', '/api/me/photo', { mediaType: 'image/png', data: PNG.toString('base64') }); assert.equal(r.status, 200); assert.ok(r.data.photo);
  viewer = 'ravi@facilio.com'; const g = await call('GET', '/api/people/kim@facilio.com/photo');
  assert.equal(g.status, 200); assert.equal(g.raw.type, 'image/png'); assert.ok(g.raw.body.equals(PNG));
  viewer = null; assert.equal((await call('GET', '/api/people/kim@facilio.com/photo')).status, 401);
  viewer = 'ravi@facilio.com'; assert.equal((await call('GET', '/api/people/nobody@facilio.com/photo')).status, 404);
});
await t('a new upload replaces the old file; removing deletes it', async () => {
  viewer = 'kim@facilio.com'; const old = db.get('cfg/photos')['kim@facilio.com'].f;
  assert.equal((await call('PUT', '/api/me/photo', { mediaType: 'image/jpeg', data: JPG.toString('base64') })).status, 200);
  await tick(); assert.ok(!blobs.has(old)); assert.equal(db.get('cfg/photos')['kim@facilio.com'].t, 'image/jpeg');
  const cur = db.get('cfg/photos')['kim@facilio.com'].f; assert.equal((await call('DELETE', '/api/me/photo')).status, 200);
  await tick(); assert.ok(!blobs.has(cur)); assert.equal(db.get('cfg/photos')['kim@facilio.com'], undefined);
});
await t('Teams photo: copied when shared, explained when the permission or the photo is missing', async () => {
  graph = () => ({ ok: false, status: 403, body: '' }); let r = await call('POST', '/api/me/photo/teams'); assert.equal(r.status, 424); assert.match(r.data.error, /ProfilePhoto\.Read\.All/);
  graph = () => ({ ok: false, status: 404, body: '' }); r = await call('POST', '/api/me/photo/teams'); assert.equal(r.status, 404); assert.match(r.data.error, /no photo in Teams/);
  graph = () => ({ ok: true, status: 200, body: Buffer.from('not a picture').toString('base64') }); assert.equal((await call('POST', '/api/me/photo/teams')).status, 415);
  graph = url => { assert.match(url, /kim%40facilio\.com\/photos\/240x240\/\$value$/); return { ok: true, status: 200, body: JPG.toString('base64') }; };
  r = await call('POST', '/api/me/photo/teams'); assert.equal(r.status, 200); assert.equal(r.data.src, 'teams'); assert.equal(db.get('cfg/photos')['kim@facilio.com'].src, 'teams');
});
await t('admin: Teams photos for everyone without one, in batches; others are refused', async () => {
  for (const e of ['a@facilio.com', 'b@facilio.com', 'kim@facilio.com', 'off@facilio.com']) db.set('usr/' + e, { email: e, disabled: e.startsWith('off') });
  assert.equal((await call('POST', '/api/admin/photos/teams')).status, 403);
  viewer = 'admin@facilio.com'; graph = url => (/\/a%40/.test(url) ? { ok: true, status: 200, body: PNG.toString('base64') } : { ok: false, status: 404, body: '' });
  const r = await call('POST', '/api/admin/photos/teams'); assert.deepEqual(r.data, { added: 1, none: 1, failed: 0, left: 0 });   // kim has one already, off is disabled
  assert.equal(db.get('cfg/photos')['a@facilio.com'].src, 'teams'); const again = await call('POST', '/api/admin/photos/teams'); assert.deepEqual(again.data, { added: 0, none: 0, failed: 0, left: 0 });
});
console.log(n + ' profile photo checks passed');
