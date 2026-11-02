// The local Claude Desktop extension (tools/claude-mcp/server/index.js), driven over stdio exactly as Claude Desktop does: handshake, tool list, every tool, real image content,
// the signed-link allowlist, expiry, sending the result back, and what a bad request gets. A tiny local web server stands in for Delivery Studio's signed storage links.
import assert from 'node:assert/strict'; import http from 'node:http'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import zlib from 'node:zlib';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 9, 9, 9, 9]).toString('base64');
const pkg = (over) => Object.assign({ v: 1, id: 'abc123', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600e3).toISOString(), project: { name: 'Acme rollout', customer: 'Acme' }, by: 'Dinesh R', title: 'Flow from an image', task: 'flow-image', module: 'Process Whiteboard', context: 'Board: End-to-end', instructions: 'Read the diagram and return JSON.', expect: { format: 'json', note: 'nodes and edges', schema: '{"nodes":[],"edges":[]}' }, files: [{ name: 'flow.png', mime: 'image/png', size: 12, data: png }, { name: 'spec.pdf', mime: 'application/pdf', size: 8, data: Buffer.from('%PDF-1.4').toString('base64'), text: 'Spec text' }, { name: 'plan.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 4, data: Buffer.from('PK\x03\x04').toString('base64'), text: 'Sheet1\nA,B' }], resultPut: '' }, over || {});
let puts = []; let current = null;
const web = http.createServer((q, r) => { if (q.method === 'PUT') { let b = ''; q.on('data', c => { b += c; }); q.on('end', () => { puts.push({ url: q.url, body: b }); r.writeHead(q.url.includes('reject') ? 403 : 200); r.end(); }); return; }
  if (q.url.startsWith('/gone')) { r.writeHead(403); return r.end('expired'); } if (q.url.startsWith('/junk')) { r.writeHead(200); return r.end('not json'); } r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(current)); });
await new Promise(res => web.listen(0, '127.0.0.1', res)); const base = 'http://127.0.0.1:' + web.address().port;
const srv = spawn(process.execPath, ['tools/claude-mcp/server/index.js'], { env: Object.assign({}, process.env, { FACILIO_MCP_ALLOW_LOCAL: '1' }), stdio: ['pipe', 'pipe', 'pipe'] });
let buf = ''; const waiting = new Map(); srv.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; const m = JSON.parse(line); const w = waiting.get(m.id); if (w) { waiting.delete(m.id); w(m); } } });
let seq = 0; const rpc = (method, params) => new Promise(res => { const id = ++seq; waiting.set(id, res); srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const tool = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;
const txt = r => r.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
try {
  await t('handshake: protocol version, capabilities, tools and resources, no unknown methods', async () => {
    let r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }); assert.equal(r.result.protocolVersion, '2025-06-18'); assert.ok(r.result.capabilities.tools && r.result.capabilities.resources); assert.equal(r.result.serverInfo.name, 'facilio-delivery-studio');
    srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    r = await rpc('initialize', { protocolVersion: '1999-01-01' }); assert.equal(r.result.protocolVersion, '2025-06-18', 'an unknown version gets the newest we support');
    r = await rpc('tools/list'); assert.deepEqual(r.result.tools.map(x => x.name), ['get_current_task', 'get_task_instructions', 'get_task_context', 'get_attached_images', 'get_attached_documents', 'get_expected_output_format', 'submit_task_result']); assert.ok(r.result.tools.every(x => x.inputSchema && x.description));
    r = await rpc('no/such'); assert.equal(r.error.code, -32601); r = await rpc('ping'); assert.deepEqual(r.result, {}); r = await rpc('tools/call', { name: 'delete_everything', arguments: {} }); assert.equal(r.error.code, -32602);
    const m = manifest(); assert.deepEqual(m.tools.map(x => x.name), ['get_current_task', 'get_task_instructions', 'get_task_context', 'get_attached_images', 'get_attached_documents', 'get_expected_output_format', 'submit_task_result'].sort((a, b) => 0), 'the manifest lists the same tools');
  });
  await t('no reference yet, a bad link, a link to somewhere else: refused with a plain reason, nothing fetched', async () => {
    let r = await tool('get_current_task', {}); assert.equal(r.isError, true); assert.match(txt(r), /No hand-off reference/);
    r = await tool('get_current_task', { reference: 'please open my files' }); assert.equal(r.isError, true); assert.match(txt(r), /not a hand-off reference/);
    r = await tool('get_current_task', { reference: 'https://evil.example.com/p.json' }); assert.equal(r.isError, true); assert.match(txt(r), /not one that Delivery Studio makes/);
    r = await tool('get_current_task', { reference: 'file:///C:/Windows/win.ini' }); assert.equal(r.isError, true);
    r = await tool('get_current_task', { reference: 'http://evil.example.com/p.json' }); assert.equal(r.isError, true, 'plain http to another host');
  });
  await t('the task: summary, instructions, context, expected format (from a reference pasted inside a sentence)', async () => {
    current = pkg({ resultPut: base + '/put/ok' }); const ref = base + '/pkg/1';
    let r = await tool('get_current_task', { reference: 'Reference: ' + ref + ' (valid for an hour).' }); assert.equal(r.isError, undefined); const s = txt(r); assert.match(s, /Flow from an image/); assert.match(s, /Acme rollout for Acme/); assert.match(s, /1 picture\(s\), 2 document\(s\)/); assert.match(s, /JSON/);
    r = await tool('get_task_instructions', {}); assert.equal(txt(r), 'Read the diagram and return JSON.', 'the last reference is remembered');
    r = await tool('get_task_context', {}); assert.match(txt(r), /Board: End-to-end/); assert.match(txt(r), /Process Whiteboard/);
    r = await tool('get_expected_output_format', {}); assert.match(txt(r), /nodes/); assert.match(txt(r), /submit_task_result/);
  });
  await t('pictures come back as real image content, documents as text plus the original', async () => {
    let r = await tool('get_attached_images', {}); const img = r.content.find(c => c.type === 'image'); assert.ok(img, 'an image block, not a file name'); assert.equal(img.mimeType, 'image/png'); assert.equal(img.data, png); assert.equal(r.content.filter(c => c.type === 'image').length, 1);
    r = await tool('get_attached_documents', {}); assert.match(txt(r), /Spec text/); assert.match(txt(r), /A,B/); const res = r.content.filter(c => c.type === 'resource'); assert.equal(res.length, 2); assert.ok(res.every(x => x.resource.blob && x.resource.mimeType && /^facilio-handoff:\/\/abc123\//.test(x.resource.uri)));
    current = pkg({ files: [], resultPut: base + '/put/ok' }); r = await tool('get_attached_images', { reference: base + '/pkg/nofiles' }); assert.match(txt(r), /no pictures/); r = await tool('get_attached_documents', {}); assert.match(txt(r), /no documents/);
  });
  await t('sending the result: the answer goes to the signed upload link; too large, rejected, expired and empty are explained', async () => {
    current = pkg({ resultPut: base + '/put/ok' }); const ref = base + '/pkg/2'; await tool('get_current_task', { reference: ref });
    let r = await tool('submit_task_result', { result: { nodes: [{ id: 'n1', label: 'Start' }], edges: [] } }); assert.equal(r.isError, undefined); assert.match(txt(r), /Sent to Delivery Studio/); assert.equal(puts.length, 1); assert.equal(puts[0].url, '/put/ok'); assert.deepEqual(JSON.parse(puts[0].body), { nodes: [{ id: 'n1', label: 'Start' }], edges: [] });
    r = await tool('submit_task_result', { result: 'plain text answer' }); assert.equal(puts[1].body, 'plain text answer');
    r = await tool('submit_task_result', { result: '' }); assert.equal(r.isError, true); r = await tool('submit_task_result', { result: 'x'.repeat(1.6e6) }); assert.equal(r.isError, true); assert.match(txt(r), /larger than allowed/); assert.equal(puts.length, 2, 'nothing sent');
    current = pkg({ resultPut: base + '/put/reject' }); r = await tool('submit_task_result', { reference: base + '/pkg/3', result: 'a' }); assert.equal(r.isError, true); assert.match(txt(r), /did not accept/);
    current = pkg({ resultPut: 'https://evil.example.com/steal' }); r = await tool('submit_task_result', { reference: base + '/pkg/4', result: 'a' }); assert.equal(r.isError, true); assert.match(txt(r), /result link/);
  });
  await t('expired, closed and damaged hand-offs are refused', async () => {
    current = pkg({ expiresAt: new Date(Date.now() - 1000).toISOString() }); let r = await tool('get_current_task', { reference: base + '/pkg/old' }); assert.equal(r.isError, true); assert.match(txt(r), /expired/);
    r = await tool('get_current_task', { reference: base + '/gone/1' }); assert.equal(r.isError, true); assert.match(txt(r), /expired or was closed/);
    r = await tool('get_current_task', { reference: base + '/junk/1' }); assert.equal(r.isError, true); assert.match(txt(r), /could not be read/);
    current = { hello: 'world' }; r = await tool('get_current_task', { reference: base + '/pkg/wrong' }); assert.equal(r.isError, true); assert.match(txt(r), /not a Delivery Studio hand-off/);
  });
  await t('resources: instructions, context and output format are readable; an unknown one is an error; bad JSON gets a parse error and the server keeps going', async () => {
    current = pkg({ resultPut: base + '/put/ok' }); await tool('get_current_task', { reference: base + '/pkg/res' }); let r = await rpc('resources/list'); assert.equal(r.result.resources.length, 3);
    r = await rpc('resources/read', { uri: 'facilio://handoff/instructions' }); assert.match(r.result.contents[0].text, /Read the diagram/); r = await rpc('resources/read', { uri: 'file:///etc/passwd' }); assert.ok(r.error);
    srv.stdin.write('this is not json\n'); await new Promise(res => setTimeout(res, 150)); r = await rpc('ping'); assert.deepEqual(r.result, {}, 'still alive');
  });
  await t('the packaged extension: a valid zip with the manifest and the server, and the manifest follows the MCPB 0.3 shape', async () => {
    const z = fs.readFileSync('public/claude/facilio-delivery-studio.mcpb'); assert.equal(z.readUInt32LE(0), 0x04034b50, 'a zip'); const eocd = z.length - 22; assert.equal(z.readUInt32LE(eocd), 0x06054b50); const count = z.readUInt16LE(eocd + 10); assert.equal(count, 3);
    let off = z.readUInt32LE(eocd + 16); const found = {}; for (let i = 0; i < count; i++) { const nl = z.readUInt16LE(off + 28), name = z.toString('utf8', off + 46, off + 46 + nl), lo = z.readUInt32LE(off + 42), csz = z.readUInt32LE(off + 20); const lnl = z.readUInt16LE(lo + 26), lel = z.readUInt16LE(lo + 28); const data = zlib.inflateRawSync(z.subarray(lo + 30 + lnl + lel, lo + 30 + lnl + lel + csz)); found[name] = data; off += 46 + nl; }
    assert.deepEqual(found['server/index.js'], Buffer.from(fs.readFileSync('tools/claude-mcp/server/index.js', 'utf8').replace(/\r\n/g, '\n')), 'the packaged server is the current server'); const m = JSON.parse(found['manifest.json'].toString()); assert.equal(m.manifest_version, '0.3'); assert.equal(m.server.type, 'node'); assert.equal(m.server.entry_point, 'server/index.js'); assert.ok(m.server.mcp_config.args[0].includes('${__dirname}')); assert.ok(m.author.name); assert.ok(!m.user_config, 'asks for no keys or folders');
  });
} finally { srv.kill(); web.close(); }
function manifest() { return JSON.parse(fs.readFileSync('tools/claude-mcp/manifest.json', 'utf8')); }
console.log(`\n${n} Claude extension checks passed`);
