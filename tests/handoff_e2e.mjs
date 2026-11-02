// End to end, for real: the Delivery Studio server function (through the local preview server, which stands in for the platform's signed storage), the hand-off route,
// the packaged Claude Desktop extension spoken to over stdio exactly as Claude Desktop does, and the result coming back. Claude itself is the only part replaced:
// the test plays Claude by calling the extension's tools in order and sending a diagram back.
import assert from 'node:assert/strict'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path'; import os from 'node:os';
const PORT = 4189, BASE = 'http://localhost:' + PORT, API = BASE + '/api/fn/api'; let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const dev = spawn(process.execPath, ['tests/ui/devserver.mjs', String(PORT)], { env: Object.assign({}, process.env, { NO_PERSIST: '1' }), stdio: 'ignore' });
let mcp; let buf = ''; const waiting = new Map(); let seq = 0;
const rpc = (method, params) => new Promise(res => { const id = ++seq; waiting.set(id, res); mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const tool = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result; const txt = r => r.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
const call = async (method, p, body) => { const r = await fetch(API + p.replace(/^\/api/, ''), { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, data: j }; };
try {
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE + '/'); if (r.ok) break; } catch (e) { } await new Promise(r => setTimeout(r, 250)); }
  // the extension, taken out of the packaged .mcpb the way Claude Desktop would unpack it, so what ships is what is tested
  const z = fs.readFileSync('public/claude/facilio-delivery-studio.mcpb'); const eocd = z.length - 22; const count = z.readUInt16LE(eocd + 10); let off = z.readUInt32LE(eocd + 16); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fds-mcpb-'));
  for (let i = 0; i < count; i++) { const nl = z.readUInt16LE(off + 28), name = z.toString('utf8', off + 46, off + 46 + nl), lo = z.readUInt32LE(off + 42), csz = z.readUInt32LE(off + 20); const lnl = z.readUInt16LE(lo + 26), lel = z.readUInt16LE(lo + 28); const data = zlib.inflateRawSync(z.subarray(lo + 30 + lnl + lel, lo + 30 + lnl + lel + csz)); fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), data); off += 46 + nl; }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); const args = manifest.server.mcp_config.args.map(a => a.replace('${__dirname}', dir));
  mcp = spawn(manifest.server.mcp_config.command === 'node' ? process.execPath : manifest.server.mcp_config.command, args, { env: Object.assign({}, process.env, { FACILIO_MCP_ALLOW_LOCAL: '1' }), stdio: ['pipe', 'pipe', 'ignore'] });
  mcp.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (line.trim()) { const m = JSON.parse(line); const w = waiting.get(m.id); if (w) { waiting.delete(m.id); w(m); } } } });
  let P, H; const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]).toString('base64');
  await t('a hand-off is made on the server and returns a signed reference', async () => {
    let r = await call('POST', '/api/projects', { name: 'E2E hand-off', customer: 'Acme' }); assert.equal(r.status, 201, JSON.stringify(r.data)); P = r.data.project.id;
    r = await call('POST', `/api/projects/${P}/handoff`, { title: 'Flow from an image', task: 'flow-image', module: 'Process Whiteboard', prompt: 'Read this flowchart and return JSON.', context: 'Whiteboard: Test', expect: { format: 'json', note: 'nodes and edges', schema: { nodes: [], edges: [] } }, files: [{ name: 'flow.png', mime: 'image/png', data: png }] });
    assert.equal(r.status, 200, JSON.stringify(r.data)); H = r.data; assert.ok(H.reference.startsWith(BASE + '/__files/')); assert.equal(H.files, 1);
  });
  await t('Claude Desktop starts the extension and finds its seven tools', async () => {
    let r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } }); assert.equal(r.result.serverInfo.name, 'facilio-delivery-studio'); mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    r = await rpc('tools/list'); assert.equal(r.result.tools.length, 7);
  });
  await t('Claude reads the task from the reference in the prompt, sees the actual picture, and learns the answer format', async () => {
    const prompt = `Delivery Studio hand-off: Flow from an image\n\nReference: ${H.reference}`; let r = await tool('get_current_task', { reference: prompt }); assert.equal(r.isError, undefined, txt(r)); assert.match(txt(r), /E2E hand-off for Acme/); assert.match(txt(r), /Process Whiteboard/);
    r = await tool('get_task_instructions', {}); assert.match(txt(r), /Read this flowchart/); r = await tool('get_attached_images', {}); const img = r.content.find(c => c.type === 'image'); assert.ok(img && img.data === png && img.mimeType === 'image/png', 'the same picture that was uploaded');
    r = await tool('get_expected_output_format', {}); assert.match(txt(r), /JSON/);
  });
  await t('nothing has arrived yet; then Claude sends the diagram and Delivery Studio receives exactly that', async () => {
    let r = await call('GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.data.status, 'waiting');
    const answer = { title: 'T', nodes: [{ id: 'n1', label: 'Request', kind: 'start', confidence: 'detected' }, { id: 'n2', label: 'Approve?', kind: 'decision', confidence: 'detected' }], edges: [{ from: 'n1', to: 'n2', label: '', confidence: 'detected' }] };
    const sent = await tool('submit_task_result', { result: answer }); assert.equal(sent.isError, undefined, txt(sent)); assert.match(txt(sent), /Sent to Delivery Studio/);
    r = await call('GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.data.status, 'done'); assert.deepEqual(JSON.parse(r.data.result), answer);
  });
  await t('the same answer then goes through the page\'s normal checks: a bad connection is dropped, nothing is trusted as sent', async () => {
    const answer = JSON.parse((await call('GET', `/api/projects/${P}/handoff/${H.id}`)).data.result); answer.edges.push({ from: 'n2', to: 'zz', label: 'nowhere' });
    const r = await call('POST', `/api/projects/${P}/ai/flow-image`, { reply: JSON.stringify(answer) }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.graph.nodes.length, 2); assert.equal(r.data.graph.edges.length, 1, 'the connection to nowhere is dropped');
  });
  await t('closing the hand-off ends it: the reference no longer works for the extension and the page no longer finds it', async () => {
    let r = await call('DELETE', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.status, 200); r = await call('GET', `/api/projects/${P}/handoff/${H.id}`); assert.equal(r.status, 404);
    const fresh = spawn(process.execPath, args, { env: Object.assign({}, process.env, { FACILIO_MCP_ALLOW_LOCAL: '1' }), stdio: ['pipe', 'pipe', 'ignore'] }); let out = ''; fresh.stdout.on('data', d => { out += d; });
    fresh.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_current_task', arguments: { reference: H.reference } } }) + '\n'); await new Promise(res => setTimeout(res, 800)); fresh.kill();
    assert.match(out, /expired or was closed|could not be read/, 'a closed hand-off is not readable: ' + out.slice(0, 200));
  });
} finally { if (mcp) mcp.kill(); dev.kill(); }
console.log(`\n${n} hand-off end-to-end checks passed`);
