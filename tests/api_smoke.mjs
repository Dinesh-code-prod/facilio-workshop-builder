// API security & behaviour tests against the local dev server.
const B = process.argv[2] || 'http://127.0.0.1:8899';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL', m); } };
function agent() { let cookie = ''; return async (method, path, body, extra) => { const h = Object.assign({ 'x-fwb-csrf': '1' }, extra || {}); if (cookie) h.cookie = cookie; let b = body; if (body && !(body instanceof Uint8Array)) { h['content-type'] = 'application/json'; b = JSON.stringify(body); } const r = await fetch(B + path, { method, headers: h, body: b }); const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; const ct = r.headers.get('content-type') || ''; return { status: r.status, data: ct.includes('json') ? await r.json() : new Uint8Array(await r.arrayBuffer()), headers: r.headers }; }; }
const a = agent(), b = agent(), c = agent(), anon = agent();
ok((await anon('GET', '/api/projects')).status === 401, 'anon blocked');
ok((await anon('POST', '/api/auth/signup', { email: 'x@y.com', name: 'X', password: 'longpassword1', inviteCode: 'wrong' })).status === 403, 'bad invite rejected');
ok((await a('POST', '/api/auth/signup', { email: 'alice@facilio.com', name: 'Alice', password: 'short', inviteCode: 'dev-invite' })).status === 400, 'short pw rejected');
ok((await a('POST', '/api/auth/signup', { email: 'alice@facilio.com', name: 'Alice', password: 'alice-password-1', inviteCode: 'dev-invite' })).status === 201, 'alice signup');
ok((await b('POST', '/api/auth/signup', { email: 'bob@facilio.com', name: 'Bob', password: 'bob-password-12', inviteCode: 'dev-invite' })).status === 201, 'bob signup');
const r0 = await fetch(B + '/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); ok(r0.status === 403, 'csrf header required');
const pA = (await a('POST', '/api/projects', { name: 'Alpha CAFM', customer: 'Alpha LLC', team: [{ name: 'Alice' }], stakeholders: [{ name: 'Cust PM' }], accessCode: 'alpha-code-1' })).data.project;
const pB = (await b('POST', '/api/projects', { name: 'Beta CAFM', customer: 'Beta LLC' })).data.project;
ok(pA && pB, 'projects created');
ok((await a('GET', '/api/projects')).data.projects.length === 1, 'alice sees only her project');
ok((await b('GET', '/api/projects/' + pA.id)).status === 404, 'bob cannot read alpha');
ok((await b('PUT', '/api/projects/' + pA.id + '/docs/workshop', { data: { x: 1 }, baseVersion: 0 })).status === 404, 'bob cannot write alpha');
const w1 = await a('PUT', '/api/projects/' + pA.id + '/docs/workshop', { data: { hello: 'world' }, baseVersion: 0 }); ok(w1.status === 200 && w1.data.version === 1, 'doc create');
ok((await a('PUT', '/api/projects/' + pA.id + '/docs/workshop', { data: { hello: 'again' }, baseVersion: 0 })).status === 409, 'stale create conflicts');
ok((await a('PUT', '/api/projects/' + pA.id + '/docs/workshop', { data: { hello: 'v2' }, baseVersion: 1 })).data.version === 2, 'doc update');
ok((await a('PUT', '/api/projects/' + pA.id + '/docs/workshop', { data: { hello: 'v3' }, baseVersion: 1 })).status === 409, 'stale update conflicts');
ok((await a('GET', '/api/projects/' + pA.id + '/docs/workshop')).data.data.hello === 'v2', 'doc read');
// files: 7 MB chunked
const size = 7 * 1024 * 1024 + 123; const bytes = new Uint8Array(size); for (let i = 0; i < size; i++) bytes[i] = (i * 31) & 255;
ok((await a('POST', '/api/projects/' + pA.id + '/files', { category: 'kickoff', name: 'deck.exe', mime: 'x', size: 10 })).status === 415, 'bad extension rejected');
const up = (await a('POST', '/api/projects/' + pA.id + '/files', { category: 'kickoff', name: 'deck.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size })).data;
for (let n = 0; n < up.chunks; n++) { const r = await a('PUT', `/api/projects/${pA.id}/files/${up.id}/chunks/${n}`, bytes.subarray(n * up.chunkSize, Math.min(size, (n + 1) * up.chunkSize)), { 'content-type': 'application/octet-stream' }); ok(r.status === 200, 'chunk ' + n); }
ok((await a('POST', `/api/projects/${pA.id}/files/${up.id}/complete`)).status === 200, 'complete');
let got = []; for (let n = 0; n < up.chunks; n++) got.push((await a('GET', `/api/projects/${pA.id}/files/${up.id}/chunks/${n}`)).data);
const merged = new Uint8Array(got.reduce((s, x) => s + x.length, 0)); let o = 0; got.forEach(x => { merged.set(x, o); o += x.length; });
ok(merged.length === size && merged.every((v, i) => v === bytes[i]), 'file roundtrip intact');
ok((await b('GET', `/api/projects/${pA.id}/files/${up.id}/chunks/0`)).status === 404, 'bob cannot download alpha file');
// replace keeps versions
const up2 = (await a('POST', '/api/projects/' + pA.id + '/files', { category: 'kickoff', name: 'deck-v2.pptx', mime: 'x', size: 5, replaces: up.id })).data;
await a('PUT', `/api/projects/${pA.id}/files/${up2.id}/chunks/0`, new Uint8Array([1, 2, 3, 4, 5]), { 'content-type': 'application/octet-stream' }); await a('POST', `/api/projects/${pA.id}/files/${up2.id}/complete`);
ok((await a('GET', `/api/projects/${pA.id}/files?category=kickoff`)).data.files.length === 1, 'current version only');
ok((await a('GET', `/api/projects/${pA.id}/files?category=kickoff&versions=1`)).data.files.length === 2, 'previous version kept');
// customer access
ok((await c('POST', '/api/auth/customer', { projectId: pA.id, accessCode: 'wrong-code', name: 'Cust' })).status === 401, 'customer bad code');
ok((await c('POST', '/api/auth/customer', { projectId: pA.id, accessCode: 'alpha-code-1', name: 'Customer PM' })).status === 200, 'customer login');
ok((await c('GET', `/api/projects/${pA.id}/docs/workshop`)).status === 403, 'customer cannot read internal workshop doc');
ok((await c('PUT', `/api/projects/${pA.id}/docs/guide_published`, { data: {}, baseVersion: 0 })).status === 403, 'customer cannot write docs');
ok((await c('GET', `/api/projects/${pA.id}/files?category=kickoff`)).data.files.length === 1, 'customer sees kickoff');
ok((await c('GET', `/api/projects/${pB.id}`)).status === 403, 'customer cannot see other project');
ok((await c('POST', `/api/projects/${pA.id}/feedback`, { module: 'workorder', body: 'Can vendors reject work orders?', kind: 'question' })).status === 201, 'customer feedback');
const fb = (await a('GET', `/api/projects/${pA.id}/feedback`)).data.items; ok(fb.length === 1 && fb[0].authorName === 'Customer PM', 'consultant sees feedback');
ok((await a('PATCH', `/api/projects/${pA.id}/feedback/${fb[0].id}`, { status: 'answered', response: 'Yes, configurable' })).status === 200, 'answer feedback');
ok((await c('GET', '/api/reference')).status === 200, 'reference for signed-in');
ok((await anon('GET', '/api/reference')).status === 401, 'reference needs auth');
// membership
ok((await a('POST', `/api/projects/${pA.id}/members`, { email: 'bob@facilio.com', role: 'viewer' })).status === 201, 'add bob viewer');
ok((await b('GET', `/api/projects/${pA.id}`)).status === 200, 'bob can read after added');
ok((await b('PUT', `/api/projects/${pA.id}/docs/workshop`, { data: {}, baseVersion: -1 })).status === 403, 'viewer cannot write');
// module learning responses
ok((await c('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:a:channels', value: ['Email', 'Phone'] })).status === 200, 'customer saves an answer');
ok((await c('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:f:subject', value: { decision: 'rename', rename: 'Job title' } })).status === 200, 'customer saves a field decision');
ok((await c('PUT', `/api/projects/${pA.id}/guide-responses`, { key: '../x', value: 1 })).status === 400, 'bad response key rejected');
ok((await c('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:a:long', value: 'x'.repeat(30000) })).status === 413, 'oversized answer rejected');
ok((await c('PUT', `/api/projects/${pB.id}/guide-responses`, { key: 'wo:a:channels', value: 'x' })).status === 403, 'customer cannot answer for another project');
{ const r = await a('GET', `/api/projects/${pA.id}/guide-responses`); const x = r.data.responses.find(z => z.key === 'wo:a:channels'); ok(x && x.value.length === 2 && x.authorName === 'Customer PM' && x.authorKind === 'customer', 'consultant sees customer answers'); }
ok((await b('GET', `/api/projects/${pA.id}/guide-responses`)).status === 200, 'viewer member can read answers');
ok((await b('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:a:sites', value: '3' })).status === 403, 'viewer cannot write answers');
ok((await a('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:a:channels', value: [] })).status === 200, 'empty value clears answer');
ok(!(await c('GET', `/api/projects/${pA.id}/guide-responses`)).data.responses.some(z => z.key === 'wo:a:channels'), 'cleared answer is gone');
// shared items & portal controls
{ const I = (who, m, kind, id, data, extra) => who(m, `/api/projects/${pA.id}/items/${kind}/${id}`, data === undefined ? undefined : Object.assign({ data }, extra || {}));
  ok((await I(a, 'PUT', 'action', 'a1', { mod: 'kickoff', text: 'Share site list', side: 'customer', owner: 'Priya', due: '2026-11-10', status: 'Open' })).status === 200, 'consultant creates action');
  ok((await I(a, 'PUT', 'action', 'a2', { mod: 'kickoff', text: 'Send templates', side: 'facilio', status: 'Open' })).status === 200, 'consultant creates facilio action');
  ok((await I(c, 'PUT', 'action', 'a2', { mod: 'kickoff', text: 'Changed by customer', side: 'facilio', status: 'Open' })).status === 403, 'customer cannot rewrite a facilio action');
  const st = await I(c, 'PUT', 'action', 'a2', { mod: 'kickoff', text: 'Send templates', side: 'facilio', status: 'Done' }); ok(st.status === 200 && st.data.item.data.status === 'Done' && st.data.item.data.hist.length === 2, 'customer updates status, history kept');
  const own = await I(c, 'PUT', 'action', 'c1', { mod: 'wo', text: 'Collect SLA sheet', side: 'facilio', status: 'Open' }); ok(own.status === 200 && own.data.item.data.side === 'customer', 'customer action is always on the customer side');
  ok((await I(a, 'PUT', 'note', 'n1', { mod: 'wo', text: 'Internal only' })).status === 200, 'consultant writes internal note');
  ok((await c('GET', `/api/projects/${pA.id}/items?kinds=note,action`)).data.items.every(x => x.kind !== 'note'), 'customer never receives internal notes');
  ok((await I(c, 'PUT', 'note', 'n2', { text: 'x' })).status === 403, 'customer cannot write internal kinds');
  ok((await I(a, 'PUT', 'cr', 'cr1', { n: 1, title: 'Extra report', status: 'Draft', published: false })).status === 200, 'consultant drafts CR');
  ok(!(await c('GET', `/api/projects/${pA.id}/items?kinds=cr`)).data.items.length, 'unpublished CR hidden from customer');
  await I(a, 'PUT', 'cr', 'cr1', { n: 1, title: 'Extra report', status: 'Proposed', published: true, price: 2000 });
  ok((await I(c, 'PUT', 'cr', 'cr1', { status: 'CR Converted' })).status === 403, 'CR approval needs a name');
  const ap = await I(c, 'PUT', 'cr', 'cr1', { status: 'CR Converted', decisionBy: 'Priya Nair' }); ok(ap.status === 200 && ap.data.item.data.price === 2000, 'customer approves a proposed CR without changing the price');
  ok((await I(a, 'PUT', 'signoff', 'brd', { label: 'BRD Sign-Off', status: 'notdue' })).status === 200, 'sign-off record');
  ok((await I(c, 'PUT', 'signoff', 'brd', { status: 'signed', signer: 'Priya', confirm: true })).status === 403, 'cannot sign before it is requested');
  await I(a, 'PUT', 'signoff', 'brd', { label: 'BRD Sign-Off', status: 'requested' });
  ok((await I(c, 'PUT', 'signoff', 'brd', { status: 'signed', signer: 'Priya Nair', title: 'PM', confirm: true })).data.item.data.status === 'signed', 'customer signs a requested sign-off');
  ok((await I(c, 'PUT', 'onb', 'site', { sheet: 'Site', status: 'validated' })).status === 403, 'customer cannot set Facilio-only onboarding status');
  ok((await I(c, 'PUT', 'onb', 'site', { sheet: 'Site', status: 'sent' })).status === 403, 'onboarding hidden by default, so no writes');
  ok((await c('PUT', `/api/projects/${pB.id}/items/action/x`, { data: { text: 'x' } })).status === 403, 'customer cannot write items in another project');
  ok((await b('GET', `/api/projects/${pB.id}/items?kinds=action`)).data.items.length === 0, 'projects do not share items');
  ok((await I(a, 'PUT', 'action', 'a1', { text: 'stale' }, { baseVersion: 0 })).status === 409, 'stale item write conflicts');
  ok((await c('DELETE', `/api/projects/${pA.id}/items/action/c1`)).status === 403, 'customer cannot delete items');
  // portal controls
  ok((await c('POST', `/api/projects/${pA.id}/files`, { category: 'onboarding_workbook', name: 'data.xlsx', mime: 'x', size: 10 })).status === 403, 'onboarding upload off by default');
  ok((await c('GET', `/api/projects/${pA.id}/docs/onboarding_published`)).status === 403, 'onboarding plan hidden while the tab is off');
  const pc = await a('GET', `/api/projects/${pA.id}/docs/portal_controls`);
  await a('PUT', `/api/projects/${pA.id}/docs/portal_controls`, { data: { tabs: { onboarding: true, guide: false }, allow: { answers: false } }, baseVersion: pc.data.version });
  const up = await c('POST', `/api/projects/${pA.id}/files`, { category: 'onboarding_workbook', name: 'data.xlsx', mime: 'x', size: 5 }); ok(up.status === 201, 'customer uploads onboarding workbook once enabled');
  ok((await c('PUT', `/api/projects/${pA.id}/files/${up.data.id}/chunks/0`, new Uint8Array([1, 2, 3, 4, 5]), { 'content-type': 'application/octet-stream' })).status === 200 && (await c('POST', `/api/projects/${pA.id}/files/${up.data.id}/complete`)).status === 200, 'customer completes own upload');
  ok((await c('POST', `/api/projects/${pA.id}/files`, { category: 'kickoff', name: 'x.pdf', mime: 'x', size: 5 })).status === 403, 'customer cannot upload other categories');
  ok((await c('PUT', `/api/projects/${pA.id}/guide-responses`, { key: 'wo:a:sites', value: '4' })).status === 403, 'locked answers refused on the server');
  ok((await c('GET', `/api/projects/${pA.id}/docs/guide_published`)).status === 403, 'hidden tab refused on the server');
  ok((await c('GET', `/api/projects/${pA.id}/docs/portal_controls`)).status === 200, 'customer reads controls');
  ok([200, 404].includes((await c('GET', `/api/projects/${pA.id}/docs/onboarding_published`)).status), 'onboarding plan readable once the tab is on');
  ok((await I(c, 'PUT', 'onb', 'site', { sheet: 'Site', status: 'sent' })).status === 200, 'customer marks sheet sent once onboarding is on');
}
// throttling
for (let i = 0; i < 8; i++) await anon('POST', '/api/auth/login', { email: 'alice@facilio.com', password: 'nope' });
ok((await anon('POST', '/api/auth/login', { email: 'alice@facilio.com', password: 'alice-password-1' })).status === 429, 'login throttled after failures');
ok((await a('POST', '/api/auth/logout')).status === 200 && (await a('GET', '/api/projects')).status === 401, 'logout ends session');
console.log(`api tests: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
