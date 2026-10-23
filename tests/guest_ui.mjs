// Team-code guest workspace (the screen is hidden now, the API remains): wrong code rejected, workspace + key issued, key signs back in.
const BASE = (process.argv[2] || 'http://127.0.0.1:8899').replace(/\/$/, ''); const CODE = process.argv[3] || 'dev-invite';
const ok = (n, c) => console.log((c ? 'PASS ' : 'FAIL ') + n); let bad = 0;
const post = async (path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-fwb-csrf': '1' }, body: JSON.stringify(body) }); let j = {}; try { j = await r.json(); } catch (e) { } return { s: r.status, j }; };
let r = await post('/api/auth/guest', { name: 'Office Mate', inviteCode: 'wrong-code' }); ok('wrong team code rejected', r.s === 403);
r = await post('/api/auth/guest', { name: 'Office Mate', inviteCode: CODE }); ok('guest workspace created with a key', r.s < 300 && !!r.j.guestKey && r.j.guestKey.length > 30);
const key = r.j.guestKey; r = await post('/api/auth/guest-login', { key }); ok('signed back in with the key', r.s === 200 && r.j.user && r.j.user.guest === true);
r = await post('/api/auth/guest-login', { key: 'not-a-real-key-' + 'x'.repeat(30) }); ok('wrong key refused', r.s === 401 || r.s === 403);
const login = await fetch(BASE + '/api/auth/guest-login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fwb-csrf': '1' }, body: JSON.stringify({ key }) }); const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
const adm = await fetch(BASE + '/api/admin/overview', { headers: { cookie } }); ok('guest cannot reach the admin API', adm.status === 401 || adm.status === 403);
process.exit(0);
