#!/usr/bin/env node
/* Facilio Delivery Studio hand-off for Claude Desktop: a small LOCAL MCP server (stdio, no dependencies, Node 18+, which Claude Desktop supplies for extensions).
   What it does: when Delivery Studio opens Claude, the prompt carries a hand-off REFERENCE: a signed, short-lived link to one package that Delivery Studio stored for this
   click (task, instructions, project name, the expected answer and the files: pictures, PDFs, Word, Excel). These tools open that link, show Claude the real picture and the
   document text, and send Claude's answer back through a signed upload link that is inside the package, so Delivery Studio can check it and show a preview.
   What it does NOT do: it has no tools for your disk, no network access except the reference link, no stored passwords or keys, and it never calls Claude's API.
   Safety: only https links to Amazon S3 or facilio.work are opened (the signed storage links Delivery Studio makes); a package older than its expiry is refused; sizes are capped. */
'use strict';
const readline = require('node:readline');

const VERSION = '1.0.0';
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const ALLOW_LOCAL = process.env.FACILIO_MCP_ALLOW_LOCAL === '1';   // tests only: lets the server read a package from 127.0.0.1
const MAX_PACKAGE = 12e6, MAX_RESULT = 1.5e6, TIMEOUT = 20000;
const cache = new Map(); let last = null;   // packages already opened, and the last reference used (so "the current task" needs no argument)

const log = (...a) => process.stderr.write('[facilio-handoff] ' + a.join(' ') + '\n');
const fail = m => { const e = new Error(m); e.tool = true; return e; };

function refFrom(args) {
  const raw = String((args && args.reference) || '').trim(); if (!raw) { if (last) return last; throw fail('No hand-off reference yet. Copy the reference from Delivery Studio (it is in the prompt it prepared) and give it as "reference".'); }
  const m = raw.match(/https?:\/\/[^\s"'<>)]+/); if (!m) throw fail('That is not a hand-off reference (it should be a link that starts with https://).');
  return m[0].replace(/[.,;]+$/, '');
}
function allowed(u) {
  let x; try { x = new URL(u); } catch (e) { return false; }
  if (ALLOW_LOCAL && x.protocol === 'http:' && (x.hostname === '127.0.0.1' || x.hostname === 'localhost')) return true;
  return x.protocol === 'https:' && (/(^|\.)amazonaws\.com$/i.test(x.hostname) || /(^|\.)facilio\.work$/i.test(x.hostname));
}
async function open(args) {
  const ref = refFrom(args); if (!allowed(ref)) throw fail('This link is not one that Delivery Studio makes, so it was not opened.');
  let p = cache.get(ref);
  if (!p) {
    let r; try { r = await fetch(ref, { signal: AbortSignal.timeout(TIMEOUT) }); } catch (e) { throw fail('Delivery Studio could not be reached. Check the internet connection and try again.'); }
    if (r.status === 403 || r.status === 404) throw fail('This hand-off has expired or was closed. Open Claude again from Delivery Studio to make a new one.');
    if (!r.ok) throw fail('Delivery Studio returned an error (' + r.status + ').');
    const t = await r.text(); if (t.length > MAX_PACKAGE) throw fail('The hand-off is larger than allowed.');
    try { p = JSON.parse(t); } catch (e) { throw fail('The hand-off could not be read.'); }
    if (!p || p.v !== 1 || typeof p.id !== 'string' || typeof p.instructions !== 'string') throw fail('This is not a Delivery Studio hand-off.');
    cache.set(ref, p);
  }
  if (Date.parse(p.expiresAt) < Date.now()) { cache.delete(ref); throw fail('This hand-off has expired. Open Claude again from Delivery Studio to make a new one.'); }
  last = ref; return { ref, p };
}
const text = t => ({ type: 'text', text: String(t) });
const isImage = f => /^image\//.test(f.mime);

const TOOLS = [
  { name: 'get_current_task', description: 'Start here. Opens the Delivery Studio hand-off and says what the task is, which project it belongs to, which files came with it and what answer is expected.', inputSchema: { type: 'object', properties: { reference: { type: 'string', description: 'The hand-off reference link from the prompt. Optional once one has been used.' } } } },
  { name: 'get_task_instructions', description: 'The full, task-specific instructions that Delivery Studio prepared for this task.', inputSchema: { type: 'object', properties: { reference: { type: 'string' } } } },
  { name: 'get_task_context', description: 'The project and module context that belongs to this task (project name, customer, module and the records Delivery Studio selected). Only what this task needs.', inputSchema: { type: 'object', properties: { reference: { type: 'string' } } } },
  { name: 'get_attached_images', description: 'The pictures that came with the task (PNG, JPEG, WebP), as real images you can look at.', inputSchema: { type: 'object', properties: { reference: { type: 'string' } } } },
  { name: 'get_attached_documents', description: 'The documents that came with the task (PDF, Word, Excel, text). Gives the extracted text, and the original file where the format allows.', inputSchema: { type: 'object', properties: { reference: { type: 'string' } } } },
  { name: 'get_expected_output_format', description: 'The exact format the answer must have so Delivery Studio can read it back.', inputSchema: { type: 'object', properties: { reference: { type: 'string' } } } },
  { name: 'submit_task_result', description: 'Send your finished answer to Delivery Studio. The person sees a preview there and confirms before anything is saved. Send exactly the format from get_expected_output_format.', inputSchema: { type: 'object', properties: { result: { description: 'The answer: JSON (object or string) or text, as the expected format says.' }, reference: { type: 'string' } }, required: ['result'] } }
];

async function call(name, args) {
  args = args || {}; const { ref, p } = await open(args);
  if (name === 'get_current_task') {
    const imgs = p.files.filter(isImage).length, docs = p.files.length - imgs;
    return [text(['Task: ' + p.title + ' (' + p.task + ')', 'Project: ' + p.project.name + (p.project.customer ? ' for ' + p.project.customer : ''), p.module ? 'Module: ' + p.module : '', 'Prepared by: ' + (p.by || 'a team member'), 'Valid until: ' + p.expiresAt, 'Files: ' + imgs + ' picture(s), ' + docs + ' document(s)', 'Expected answer: ' + p.expect.format.toUpperCase() + (p.expect.note ? ' (' + p.expect.note + ')' : ''), '', 'Next: call get_task_instructions, then get_attached_images / get_attached_documents if there are files, then get_expected_output_format, do the task, and send the answer with submit_task_result.'].filter(x => x !== '').join('\n'))];
  }
  if (name === 'get_task_instructions') return [text(p.instructions)];
  if (name === 'get_task_context') return [text('Project: ' + p.project.name + (p.project.customer ? '\nCustomer: ' + p.project.customer : '') + (p.module ? '\nModule: ' + p.module : '') + (p.context ? '\n\n' + p.context : '\n\nNo extra records were selected for this task.'))];
  if (name === 'get_attached_images') {
    const imgs = p.files.filter(isImage); if (!imgs.length) return [text('There are no pictures with this task.')];
    return imgs.flatMap((f, i) => [text('Picture ' + (i + 1) + ': ' + f.name + ' (' + f.mime + ', ' + Math.round(f.size / 1024) + ' KB). This is the original image.'), { type: 'image', data: f.data, mimeType: f.mime }]);
  }
  if (name === 'get_attached_documents') {
    const docs = p.files.filter(f => !isImage(f)); if (!docs.length) return [text('There are no documents with this task.')];
    return docs.flatMap(f => { const out = [text('Document: ' + f.name + ' (' + f.mime + ', ' + Math.round(f.size / 1024) + ' KB)\n' + (f.text ? 'Extracted text (tables as rows):\n' + f.text : 'No text could be extracted in Delivery Studio; the original file is attached below if your client can read it.'))];
      if (/pdf|officedocument/.test(f.mime)) out.push({ type: 'resource', resource: { uri: 'facilio-handoff://' + p.id + '/' + encodeURIComponent(f.name), mimeType: f.mime, blob: f.data } }); return out; });
  }
  if (name === 'get_expected_output_format') {
    return [text(['Answer format: ' + p.expect.format.toUpperCase(), p.expect.note || '', p.expect.schema ? 'Shape:\n' + p.expect.schema : '', '', 'Send it with submit_task_result. Do not add commentary around JSON. Never invent anything that is not in the source material; mark unclear parts as uncertain.'].filter(x => x !== '').join('\n'))];
  }
  if (name === 'submit_task_result') {
    let body = args.result; if (body == null || body === '') throw fail('There is no result to send.'); if (typeof body !== 'string') body = JSON.stringify(body);
    if (body.length > MAX_RESULT) throw fail('The result is larger than allowed (about 1.5 MB).');
    if (!allowed(p.resultPut)) throw fail('The result link in this hand-off is not valid.');
    let r; try { r = await fetch(p.resultPut, { method: 'PUT', body, signal: AbortSignal.timeout(TIMEOUT) }); } catch (e) { throw fail('The result could not be sent. Check the internet connection and try again.'); }
    if (!r.ok) throw fail('Delivery Studio did not accept the result (' + r.status + '). The hand-off may have expired; open Claude again from Delivery Studio.');
    return [text('Sent to Delivery Studio (' + body.length + ' characters). Tell the person to look at the Delivery Studio page: it picks the result up by itself and shows a preview they confirm before anything is saved.')];
  }
  throw fail('Unknown tool: ' + name);
}
const RES = [['instructions', 'Task instructions'], ['context', 'Project context'], ['output-format', 'Expected output format']];
async function readResource(uri) {
  const k = String(uri || '').replace('facilio://handoff/', ''); if (!RES.some(r => r[0] === k)) throw new Error('Unknown resource');
  const out = await call(k === 'instructions' ? 'get_task_instructions' : k === 'context' ? 'get_task_context' : 'get_expected_output_format', {}); return { contents: [{ uri, mimeType: 'text/plain', text: out.map(x => x.text || '').join('\n') }] };
}

const send = m => process.stdout.write(JSON.stringify(m) + '\n');
async function handle(msg) {
  const { id, method, params } = msg; const isReq = id !== undefined && id !== null;
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: SUPPORTED.includes(params && params.protocolVersion) ? params.protocolVersion : SUPPORTED[0], capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'facilio-delivery-studio', title: 'Facilio Delivery Studio hand-off', version: VERSION }, instructions: 'Use these tools when a message contains a Delivery Studio hand-off reference. Start with get_current_task.' } });
    if (!isReq) return;   // notifications (initialized, cancelled) need no answer
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      if (!TOOLS.some(t => t.name === (params && params.name))) return send({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown tool' } });
      try { return send({ jsonrpc: '2.0', id, result: { content: await call(params.name, params.arguments) } }); }
      catch (e) { if (e.tool) return send({ jsonrpc: '2.0', id, result: { isError: true, content: [text(e.message)] } }); log('tool error', e && e.message); return send({ jsonrpc: '2.0', id, result: { isError: true, content: [text('Something went wrong in the hand-off tool.')] } }); }
    }
    if (method === 'resources/list') return send({ jsonrpc: '2.0', id, result: { resources: last ? RES.map(([k, n]) => ({ uri: 'facilio://handoff/' + k, name: n, mimeType: 'text/plain' })) : [] } });
    if (method === 'resources/read') { try { return send({ jsonrpc: '2.0', id, result: await readResource(params && params.uri) }); } catch (e) { return send({ jsonrpc: '2.0', id, error: { code: -32002, message: e.message } }); } }
    return send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  } catch (e) { log('error', e && e.message); if (isReq) send({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Internal error' } }); }
}
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => { const t = line.trim(); if (!t) return; let m; try { m = JSON.parse(t); } catch (e) { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); } handle(m); });
rl.on('close', () => process.exit(0));
