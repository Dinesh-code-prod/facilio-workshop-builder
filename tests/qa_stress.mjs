// QA stress run for the facilio.work server function: 100 people, 100 projects, everyone adds notes, links and documents, large records, file parts, connector calls and a big hand-off answer.
// Same stand-in platform as tests/load_ai.mjs (db with the 128 KB value limit and a delay per call, files, one server copy per request at a time).
// Run: node tests/qa_stress.mjs   (USERS=100 LAT=8)
import assert from 'node:assert/strict';
const USERS = +process.env.USERS || 100, LAT = +process.env.LAT || 8;
const store = new Map(), fileStore = new Map(); let fileSeq = 0; const nap = ms => new Promise(r => setTimeout(r, ms)); let dbCalls = 0, maxVal = 0; const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mkctx = email => ({ viewer: { email, role: 'viewer' }, app: { name: 'fwb' }, secrets: { async get() { throw new Error('no secret'); } }, llm: async () => ({ model: 'mock', choices: [{ message: { content: '## Draft [S1]' } }] }),
  db: {
    async get(c, k) { dbCalls++; await nap(LAT); const r = (store.get(c) || new Map()).get(k); return r ? { key: k, value: JSON.parse(r), updated_at: '', updated_by: '' } : null; },
    async put(c, k, v) { dbCalls++; await nap(LAT); assert.ok(KEY.test(k), 'bad key ' + k); const t = JSON.stringify(v); maxVal = Math.max(maxVal, t.length); if (t.length > 128 * 1024) { const e = new Error('value too large'); e.status = 413; throw e; } if (!store.has(c)) store.set(c, new Map()); store.get(c).set(k, t); return { key: k }; },
    async delete(c, k) { dbCalls++; await nap(LAT); (store.get(c) || new Map()).delete(k); },
    async list(c, o = {}) { dbCalls++; await nap(LAT); const keys = [...(store.get(c) || new Map()).keys()].sort(); const start = o.cursor ? keys.findIndex(k => k > o.cursor) : 0; if (start < 0) return { items: [] }; const page = keys.slice(start, start + (o.limit || 100)); const next = start + page.length < keys.length ? page[page.length - 1] : null; return { items: page.map(k => ({ key: k, value: JSON.parse(store.get(c).get(k)), updated_at: '', updated_by: '' })), cursor: next }; }
  },
  files: { async uploadUrl(n) { const id = 'f' + (++fileSeq) + n; fileStore.set(id, Buffer.alloc(0)); return { url: 'https://storage.example/put/' + id, file_id: id }; }, async url(id) { return { url: 'https://storage.example/get/' + id }; },
    async put(o) { const id = 'p' + (++fileSeq); fileStore.set(id, Buffer.from(o.body)); return { file_id: id }; }, async get(id) { const b = fileStore.get(id) || Buffer.alloc(0); return { text: async () => b.toString() }; }, async delete(id) { fileStore.delete(id); } } });
const copies = []; const waiting = []; let made = 0;
const lease = async () => { if (copies.length) return copies.pop(); if (made < USERS + 5) { const i = ++made; return (await import('../work/server/api.mjs?copy=' + i)).default; } return new Promise(r => waiting.push(r)); };
const release = h => { const w = waiting.shift(); if (w) w(h); else copies.push(h); };
const call = async (email, method, path, body, headers) => { const h = await lease(); const t0 = performance.now(); try { const [p, q] = path.split('?'); const req = { method, path: p.replace(/^\/api/, ''), query: q || '', headers: headers || {}, text: async () => (body === undefined ? '' : JSON.stringify(body)) }; const r = await h(req, mkctx(email)); const data = await r.json(); return { status: r.status, data, ms: performance.now() - t0 }; } finally { release(h); } };
const tool = (who, name, body) => call(who, 'POST', '/api/', body, { 'x-work-mcp': '1', 'x-work-mcp-tool': name });
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const stat = (label, rs) => { const ms = rs.map(x => x.ms), bad = rs.filter(x => x.status >= 400); console.log(`  ${label}: ${rs.length} requests, median ${pct(ms, .5).toFixed(0)} ms, 95th ${pct(ms, .95).toFixed(0)} ms, failed ${bad.length}${bad.length ? ' (first: ' + bad[0].status + ' ' + JSON.stringify(bad[0].data).slice(0, 100) + ')' : ''}`); return bad; };
const issues = []; const must = (ok, msg) => { if (!ok) { issues.push(msg); console.log('  ISSUE: ' + msg); } else console.log('  ok  ' + msg); };
const people = Array.from({ length: USERS }, (_, i) => `qa${i}@facilio.com`); const sec = t => console.log('\n' + t);

sec('1. Sign-in check and project creation, 100 people');
let rs = await Promise.all(people.map(em => call(em, 'GET', '/api/auth/me').catch(e => ({ status: 500, data: { error: String(e) }, ms: 0 })))); stat('auth/me', rs);
const ids = []; for (let i = 0; i < USERS; i++) { store.delete('rl'); const r = await call(people[i], 'POST', '/api/projects', { name: 'QA project ' + i, customer: 'QA customer ' + (i % 20) }); ids.push(r.data.project && r.data.project.id); } must(ids.every(Boolean), '100 projects created, one per person'); store.delete('rl');

sec('2. Notes, links and records: each person adds 25 notes and 25 links at once');
rs = await Promise.all(people.flatMap((em, i) => Array.from({ length: 25 }, (_, k) => [call(em, 'PUT', `/api/projects/${ids[i]}/items/pnote/n${k}`, { data: { name: 'Note ' + k, title: 'Note ' + k, body: 'x'.repeat(2000), status: 'Open' } }), call(em, 'PUT', `/api/projects/${ids[i]}/items/res/l${k}`, { data: { name: 'Link ' + k, title: 'Link ' + k, url: 'https://example.com/' + k } })]).flat()));
must(stat('notes and links', rs).length === 0, 'every note and link was saved (5,000 saves)');

sec('3. Documents: a section of 3 MB (needs splitting into parts) and the 5 MB limit');
const big = n => ({ requirements: Array.from({ length: n }, (_, k) => ({ id: 'r' + k, text: 'Requirement text '.repeat(40) + k, status: 'Draft' })), flows: {} });
rs = await Promise.all(people.slice(0, 20).map((em, i) => call(em, 'PUT', `/api/projects/${ids[i]}/docs/workshop`, { data: big(4000), baseVersion: 0 }))); must(stat('3 MB document', rs).length === 0, '3 MB documents save and are split under the 128 KB database limit');
const back = await call(people[0], 'GET', `/api/projects/${ids[0]}/docs/workshop`); must(back.status === 200 && back.data.data.requirements.length === 4000, 'a split document reads back whole (4,000 requirements)');
const huge = await call(people[30], 'PUT', `/api/projects/${ids[30]}/docs/workshop`, { data: big(9000), baseVersion: 0 }); must(huge.status === 413, 'a document over 5 MB is refused with a clear message: ' + huge.status + ' ' + String((huge.data || {}).error).slice(0, 60));
const c1 = await call(people[31], 'PUT', `/api/projects/${ids[31]}/docs/workshop`, { data: big(5), baseVersion: 0 }); const c2 = await call(people[31], 'PUT', `/api/projects/${ids[31]}/docs/workshop`, { data: big(6), baseVersion: 0 }); must(c1.status === 200 && c2.status === 409, 'two saves of the same version: the second is reported as a conflict, not overwritten (' + c2.status + ')');

sec('4. Files: a 40 MB upload in parts, and a file type that is not allowed');
const up = await call(people[40], 'POST', `/api/projects/${ids[40]}/files`, { name: 'big.pdf', category: 'kickoff', size: 40e6, mime: 'application/pdf' }); must(up.status < 300, 'a 40 MB file upload starts: ' + up.status + ' ' + JSON.stringify(up.data).slice(0, 80));
const bad = await call(people[41], 'POST', `/api/projects/${ids[41]}/files`, { name: 'virus.exe', category: 'kickoff', size: 1000, mime: 'application/x-msdownload' }); must(bad.status >= 400, 'an .exe is refused: ' + bad.status);
const tooBig = await call(people[42], 'POST', `/api/projects/${ids[42]}/files`, { name: 'huge.pdf', category: 'kickoff', size: 400e6, mime: 'application/pdf' }); must(tooBig.status >= 400, 'a 400 MB file is refused: ' + tooBig.status);

sec('5. Connector: everyone reads their project at once, nobody reads someone else\'s');
rs = await Promise.all(people.flatMap((em, i) => [tool(em, 'project_overview', { project: ids[i] }), tool(em, 'get_records', { project: ids[i], kind: 'pnote', limit: 100 }), tool(em, 'search_project', { project: ids[i], query: 'Requirement' })])); must(stat('connector reads', rs).length === 0, '300 connector calls succeed');
const peek = await Promise.all(people.slice(0, 30).map((em, i) => tool(em, 'get_records', { project: ids[(i + 1) % USERS], kind: 'pnote' }))); must(peek.every(x => x.status === 404), '30 of 30 cross-project connector reads are refused');
const r1 = await tool(people[0], 'get_records', { project: ids[0], kind: 'pnote', limit: 100, detail: 'full' }); must(r1.status === 200 && JSON.stringify(r1.data).length < 400000, 'a full 100-record answer stays small (' + JSON.stringify(r1.data).length + ' bytes)');

sec('6. Hand-off answers: small and large (a BRD section is about 60 KB, a long draft over 200 KB)');
const ho = await call(people[50], 'POST', `/api/projects/${ids[50]}/handoff`, { title: 'T', task: 'brd', prompt: 'Do the task now please', expect: { format: 'text' } }); const hid = ho.data.id;
for (const size of [20000, 90000, 300000, 1500000]) { const r = await tool(people[50], 'project_jobs', { action: 'handoff_submit', id: hid, result: 'a'.repeat(size) }); const g = await call(people[50], 'GET', `/api/projects/${ids[50]}/handoff/${hid}`); must(r.status === 200 && g.data.status === 'done' && g.data.result.length === size, 'a ' + (size / 1000) + ' KB answer arrives intact (submit ' + r.status + ', read ' + g.status + ', got ' + (g.data.result || '').length + ' of ' + size + ')'); }

sec('7. Many people at once across everything: opening a project');
const mix = await Promise.all(people.map((em, i) => call(em, 'GET', `/api/projects/${ids[i]}/open?sections=workshop&kinds=pnote,res`))); stat('open project', mix); must(Math.max(...mix.map(x => x.ms)) < 5000 && mix.every(x => x.status === 200), 'opening a project with 3 MB documents and 50 records stays fast and works for everyone');

console.log(`\nDatabase calls: ${dbCalls}, largest stored value ${(maxVal / 1024).toFixed(0)} KB of 128 KB.`);
console.log(issues.length ? `\n${issues.length} ISSUE(S) FOUND:\n - ` + issues.join('\n - ') : '\nNo issues found.'); process.exit(issues.length ? 1 : 0);
