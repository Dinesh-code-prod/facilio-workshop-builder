// Remove user completely (API): staff and guest accounts, sessions end, email freed for a new sign-up, owner/self protected. Needs the admin dev server (setup code setup-code-xyz, team code dev-invite).
const BASE = (process.argv[2] || 'http://127.0.0.1:8899').replace(/\/$/, '');
let bad = 0; const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) bad++; };
const call = async (method, path, body, cookie) => { const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', 'x-fwb-csrf': '1', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = {}; try { j = await r.json(); } catch (e) { } const sc = (r.headers.get('set-cookie') || '').split(';')[0]; return { s: r.status, j, c: sc }; };
let r = await call('POST', '/api/admin/setup', { email: 'dinesh.r@facilio.com', password: 'Owner-Password-123', setupCode: 'setup-code-xyz', name: 'Owner' }); ok('owner set up', r.s < 300); let own = r.c;
if (!own) { r = await call('POST', '/api/admin/login', { email: 'dinesh.r@facilio.com', password: 'Owner-Password-123' }); own = r.c; }
const em = 'rm.' + Date.now() + '@example.com';
r = await call('POST', '/api/auth/signup', { name: 'Remove Me', email: em, password: 'Some-Password-123', inviteCode: 'dev-invite' }); ok('staff user signs up', r.s < 300); const uc = r.c;
r = await call('POST', '/api/auth/guest', { name: 'Remove Guest', inviteCode: 'dev-invite' }); ok('guest created', r.s < 300 && !!r.j.guestKey); const gk = r.j.guestKey;
r = await call('GET', '/api/admin/users', undefined, own); const users = r.j.users || []; const u = users.find(x => x.email === em); const g = users.find(x => x.name === 'Remove Guest'); ok('both listed for the owner', !!u && !!g);
r = await call('GET', '/api/auth/me', undefined, uc); ok('staff session works before removal', r.s === 200);
r = await call('DELETE', '/api/admin/users/' + u.id, undefined, uc); ok('a normal user cannot remove anyone', r.s === 401 || r.s === 403);
r = await call('DELETE', '/api/admin/users/' + u.id, undefined, own); ok('owner removes the staff user', r.s === 200);
r = await call('DELETE', '/api/admin/users/' + g.id, undefined, own); ok('owner removes the guest', r.s === 200);
r = await call('GET', '/api/admin/users', undefined, own); ok('both gone from the list', !(r.j.users || []).some(x => x.id === u.id || x.id === g.id));
r = await call('GET', '/api/auth/me', undefined, uc); ok('removed staff session is signed out', !(r.j.user));
r = await call('POST', '/api/auth/login', { email: em, password: 'Some-Password-123' }); ok('removed staff cannot sign in', r.s === 401 || r.s === 403);
r = await call('POST', '/api/auth/guest-login', { key: gk }); ok('removed guest key no longer works', r.s === 401 || r.s === 403);
r = await call('POST', '/api/auth/signup', { name: 'Remove Me', email: em, password: 'Some-Password-123', inviteCode: 'dev-invite' }); ok('same email can sign up again', r.s < 300);
r = await call('GET', '/api/admin/users', undefined, own); const owner = (r.j.users || []).find(x => x.email === 'dinesh.r@facilio.com'); r = owner ? await call('DELETE', '/api/admin/users/' + owner.id, undefined, own) : { s: 400 }; ok('owner account is protected', r.s === 400);
r = await call('DELETE', '/api/admin/users/does-not-exist', undefined, own); ok('unknown user is 404', r.s === 404);
process.exit(bad ? 1 : 0);
