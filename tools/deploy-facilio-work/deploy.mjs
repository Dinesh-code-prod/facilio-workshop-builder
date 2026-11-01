// Deploys release/facilio-delivery-studio-dist.zip to the app on facilio.work, WITHOUT a Claude account.
// It talks to the facilio.work connector (https://mcp.facilio.work/mcp) the same way Claude does. You sign in once with your Facilio (Microsoft) account in the browser
// window that opens; nothing about the sign-in is stored in this project.
//
// NOTE (1 Nov 2026): facilio.work's sign-in (Cognito) only accepts approved return addresses. Run from a plain computer this stops with "redirect_mismatch" unless the platform team
// adds http://localhost:12256/oauth/callback for this client. Claude's own connector (claude.ai) is the supported route until then.
//   node deploy.mjs --check        sign in, show who you are, the tools and the app's current state. Changes nothing.
//   node deploy.mjs                the same, then (after you type DEPLOY) uploads the zip and deploys it in replace mode.
//   options: --app=<app name>   (default facilio-delivery-studio)   --zip=<path to the zip>   --yes (skip the DEPLOY question)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline/promises'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const APP = arg('app', 'facilio-delivery-studio'); const ZIP = path.resolve(arg('zip', path.join(here, '..', '..', 'release', 'facilio-delivery-studio-dist.zip')));
const CHECK = process.argv.includes('--check'), YES = process.argv.includes('--yes');
const say = s => console.log(s);

const client = new Client({ name: 'delivery-studio-deploy', version: '1.0.0' });
say('Connecting to facilio.work. A browser window opens for the Microsoft sign-in the first time. Sign in with your Facilio account (dinesh.r@facilio.com).');
await client.connect(new StdioClientTransport({ command: 'npx', args: ['-y', 'mcp-remote', 'https://mcp.facilio.work/mcp'], stderr: 'inherit' }));
const tools = (await client.listTools()).tools; const T = n => tools.find(t => t.name === n);
const text = r => (r.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n');
const parse = t => { try { return JSON.parse(t); } catch (e) { return t; } };
const call = async (name, args) => { const r = await client.callTool({ name, arguments: args || {} }); const t = text(r); if (r.isError) throw new Error(name + ' failed: ' + t.slice(0, 600)); return parse(t); };
// map our values onto whatever the tool's input fields are called; stop clearly if a required field is not one we know
const ALIASES = { app: ['app', 'name', 'app_name', 'site', 'app_id', 'id'], mode: ['mode'] };
const argsFor = (tool, values) => {
  const sch = (T(tool) || {}).inputSchema || {}, props = Object.keys(sch.properties || {}), out = {};
  for (const [k, v] of Object.entries(values)) { const hit = (ALIASES[k] || [k]).find(a => props.includes(a)); if (hit) out[hit] = v; }
  const missing = (sch.required || []).filter(r => !(r in out)); if (missing.length) throw new Error(`The tool ${tool} needs ${missing.join(', ')}, which this script does not know. Its inputs are: ` + JSON.stringify(sch.properties));
  return out;
};

say('\nTools offered by facilio.work: ' + tools.map(t => t.name).join(', '));
for (const n of ['get_upload_url', 'deploy_app_zip']) say(`  ${n}: ` + (T(n) ? JSON.stringify((T(n).inputSchema || {}).properties || {}) : 'NOT FOUND'));
if (!T('deploy_app_zip') || !T('get_upload_url')) { say('\nThe deploy tools are not there for this account. Stopping.'); process.exit(2); }
if (T('whoami')) say('\nSigned in as: ' + JSON.stringify(await call('whoami')));
const app = await call('get_app', argsFor('get_app', { app: APP })); say('\nThe app right now: ' + (typeof app === 'string' ? app : JSON.stringify(app, null, 1)).slice(0, 1500));
if (CHECK) { say('\n--check: nothing was changed.'); await client.close(); process.exit(0); }

if (!fs.existsSync(ZIP)) throw new Error('The zip was not found: ' + ZIP);
const bytes = fs.readFileSync(ZIP); say(`\nReady to deploy ${path.basename(ZIP)} (${(bytes.length / 1048576).toFixed(1)} MB) to "${APP}" in replace mode. The app is approved, so this goes live for everyone straight away.`);
if (!YES) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); const a = (await rl.question('Type DEPLOY to continue, anything else to stop: ')).trim(); rl.close(); if (a !== 'DEPLOY') { say('Stopped. Nothing was changed.'); await client.close(); process.exit(0); } }

const up = await call('get_upload_url', argsFor('get_upload_url', { app: APP, filename: path.basename(ZIP) })); say('Upload address received.');
const flat = typeof up === 'object' && up ? up : {}; const url = flat.url || flat.upload_url || flat.uploadUrl || Object.values(flat).find(v => typeof v === 'string' && /^https:\/\//.test(v));
if (!url) throw new Error('No upload address in the answer: ' + JSON.stringify(up).slice(0, 400));
const put = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/zip' }, body: bytes }); if (!put.ok) throw new Error('The upload was refused: ' + put.status + ' ' + (await put.text()).slice(0, 300)); say('Zip uploaded.');
// hand the upload's identifier (whatever the first call named it) to the deploy tool
const sch = (T('deploy_app_zip').inputSchema || {}); const props = Object.keys(sch.properties || {}); const dep = argsFor('deploy_app_zip', { app: APP, mode: 'replace' });
for (const p of props) if (!(p in dep) && p in flat) dep[p] = flat[p];
for (const p of (sch.required || [])) if (!(p in dep)) { const id = flat.file_id || flat.upload_id || flat.key || flat.id; if (id) dep[p] = id; }
const done = await call('deploy_app_zip', dep); say('\nDeploy result: ' + (typeof done === 'string' ? done : JSON.stringify(done, null, 1)).slice(0, 2500));
say('\nOpen https://' + APP + '.facilio.work and press Ctrl+F5 to see it.'); await client.close();
