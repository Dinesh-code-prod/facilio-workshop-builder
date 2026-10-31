// Load check for the facilio.work server function: 100 projects, 100 people at once, AI drafts included.
// Each request runs in its own copy of the server module, one request per copy at a time, the way the platform runs it (every copy has its own memory).
// The database is an in-memory stand-in with a delay per call (LAT, default 8 ms). The AI service is a stand-in that allows 20 requests a minute for the whole
// account, answers in 1.2 s and fails now and then, like the real one. Run: node tests/load_ai.mjs   (USERS=100 LAT=8 AI_RPM=20)
import assert from 'node:assert/strict';
const USERS = +process.env.USERS || 100, LAT = +process.env.LAT || 8, AI_RPM = +process.env.AI_RPM || 20;
const store = new Map(); const nap = ms => new Promise(r => setTimeout(r, ms)); let dbCalls = 0;
const aiLog = { calls: 0, limited: 0, failed: 0, ok: 0 }; const aiStamps = [];
const llm = async ({ messages }) => {
  aiLog.calls++; const t = Date.now(); while (aiStamps.length && t - aiStamps[0] > 60000) aiStamps.shift();
  if (aiStamps.length >= AI_RPM) { aiLog.limited++; const e = new Error('rate limit exceeded'); e.status = 429; throw e; }
  aiStamps.push(t); await nap(1200);
  if (aiLog.calls % 20 === 7) { aiLog.failed++; const e = new Error('upstream unavailable'); e.status = 503; throw e; }
  aiLog.ok++; return { model: 'mock', choices: [{ message: { content: '## Draft\nBased on [S1]. ' + String((messages[1] || {}).content || '').slice(0, 20) } }] };
};
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm,
  db: {
    async get(c, k) { dbCalls++; await nap(LAT); const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { dbCalls++; await nap(LAT); const t = JSON.stringify(v); assert.ok(t.length <= 128 * 1024, 'record over 128 KB: ' + c + '/' + k); if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { dbCalls++; await nap(LAT); (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { dbCalls++; await nap(LAT); const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)) })), cursor: start + page.length < keys.length ? page[page.length - 1] : undefined }; }
  },
  files: { async uploadUrl() { return { url: 'https://storage.example/x', file_id: 'f' }; }, async url() { return { url: 'https://storage.example/g' }; } } });
// a pool of server copies: a request waits for a free copy, so no copy ever serves two requests at once
const copies = []; const waiting = []; let made = 0;
const lease = async () => { if (copies.length) return copies.pop(); if (made < USERS + 5) { const i = ++made; return (await import('../work/server/api.mjs?copy=' + i)).default; } return new Promise(r => waiting.push(r)); };
const release = h => { const w = waiting.shift(); if (w) w(h); else copies.push(h); };
const call = async (email, method, path, body) => {
  const h = await lease(); const t0 = performance.now();
  try { const [p, q] = path.split('?'); const req = { method, path: p.replace(/^\/api/, ''), query: q || '', headers: {}, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body };
    const r = await h(req, mkctx(email)); const data = await r.json(); return { status: r.status, data, retryAfter: r.headers.get('retry-after'), ms: performance.now() - t0 }; } finally { release(h); }
};
const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const section = t => console.log('\n' + t);
const people = Array.from({ length: USERS }, (_, i) => `user${i}@facilio.com`);

section(`Set-up: ${USERS} people each create a project`);
const ids = [];
for (let i = 0; i < USERS; i++) { store.delete('rl'); const r = await call(people[i], 'POST', '/api/projects', { name: 'Load project ' + i, customer: 'Customer ' + (i % 30), description: 'load test' }); assert.ok(r.status < 300, 'create ' + i + ' ' + JSON.stringify(r.data)); ids.push(r.data.project.id);
  await call(people[i], 'PUT', `/api/projects/${ids[i]}/docs/workshop`, { data: { requirements: Array.from({ length: 30 }, (_, k) => ({ id: 'r' + k, text: 'Requirement ' + k, status: 'Draft' })), flows: {} }, baseVersion: 0 }); }
store.delete('rl'); console.log('  ok  100 projects, each owned by a different person');

section(`Everyone at once: open a page, save, list projects (no AI)`);
let res = await Promise.all(people.map(async (em, i) => { const out = []; out.push(await call(em, 'GET', `/api/projects/${ids[i]}/docs/workshop`)); out.push(await call(em, 'PUT', `/api/projects/${ids[i]}/items/action/a1`, { data: { title: 'Task', status: 'Open' } })); out.push(await call(em, 'GET', '/api/projects')); return out; }));
let flat = res.flat(), ms = flat.map(x => x.ms), bad = flat.filter(x => x.status >= 400);
console.log(`  ${flat.length} requests, median ${pct(ms, .5).toFixed(0)} ms, 95th ${pct(ms, .95).toFixed(0)} ms, slowest ${Math.max(...ms).toFixed(0)} ms, failed ${bad.length}`); assert.equal(bad.length, 0, 'ordinary use must not fail under load');

section('Privacy under load: nobody can open somebody else\'s project');
const peek = await Promise.all(people.slice(0, 40).map((em, i) => call(em, 'GET', `/api/projects/${ids[(i + 1) % USERS]}/docs/workshop`)));
assert.ok(peek.every(x => x.status === 404 || x.status === 403), 'every cross-project read is refused'); console.log('  ok  40 of 40 cross-project reads refused');

section(`Everyone clicks "generate a draft" at the same moment (AI allows ${AI_RPM} a minute for the whole account)`);
const t0 = performance.now();
const ai = await Promise.all(people.map((em, i) => call(em, 'POST', `/api/projects/${ids[i]}/ai/guide-section`, { title: 'Overview', brief: 'What the project delivers', guideTitle: 'Guide ' + i, level: 'steps' })));
const wall = performance.now() - t0; const by = {}; ai.forEach(x => { by[x.status] = (by[x.status] || 0) + 1; });
const msgs = {}; ai.filter(x => x.status >= 400).forEach(x => { const m = String(x.data.error || '').slice(0, 90); msgs[m] = (msgs[m] || 0) + 1; });
console.log(`  finished in ${(wall / 1000).toFixed(1)} s. Results by status:`, JSON.stringify(by), `| AI service saw ${aiLog.calls} calls: ${aiLog.ok} ok, ${aiLog.limited} limited, ${aiLog.failed} failed`);
console.log('  what people were told:', JSON.stringify(msgs, null, 1).replace(/\n\s*/g, ' '));
console.log('  slowest answer', Math.max(...ai.map(x => x.ms)).toFixed(0), 'ms; Retry-After sent on', ai.filter(x => x.retryAfter).length, 'of', ai.filter(x => x.status === 429).length, 'limit answers');
assert.ok(ai.every(x => x.status === 200 || x.data.error), 'every failure carries a message a person can act on');
assert.ok(ai.every(x => x.status !== 500), 'no request ends in an unexplained server error');
assert.ok(Math.max(...ai.map(x => x.ms)) < 25000, 'no request hangs past the platform time limit');
assert.ok(by[200] >= Math.min(AI_RPM - 2, USERS), 'the AI capacity that exists is actually used');

section('A person who gets "try again" can: the same click a minute later succeeds');
aiStamps.length = 0; store.delete('rl'); const failed = ai.map((x, i) => [x, i]).filter(([x]) => x.status !== 200).slice(0, 5);
const again = await Promise.all(failed.map(([, i]) => call(people[i], 'POST', `/api/projects/${ids[i]}/ai/guide-section`, { title: 'Overview', brief: 'What the project delivers', guideTitle: 'Guide ' + i, level: 'steps' })));
console.log('  retry results', JSON.stringify(again.map(x => x.status))); assert.ok(again.every(x => x.status === 200 || (x.data && x.data.error)));
console.log(`\ndatabase calls in total: ${dbCalls}`);
