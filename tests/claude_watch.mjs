// The optional Claude watcher (src/claudewatch.js): the doorbell script answers only the Studio's pages on 127.0.0.1, prints one RING line per ring (with a clean job id),
// refuses other sites, says BUSY when a second copy starts; ring() never throws; the prompt carries the exact script and the safe steps.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const require = createRequire(import.meta.url); const W = require('../src/claudewatch.js');
let n = 0; const ok = name => { n++; console.log('  ok  ' + name); };
const TPORT = 47699;   // a test port, so a real watcher running on this computer (port 47615) never clashes with the test
const dir = mkdtempSync(join(process.env.FWB_TMP || tmpdir(), 'watch-')); const file = join(dir, 'claude-watcher.mjs'); assert.ok(W.SCRIPT.includes('const PORT = ' + W.PORT + ',')); writeFileSync(file, W.SCRIPT.replace('const PORT = ' + W.PORT + ',', 'const PORT = ' + TPORT + ','));
const start = () => { const p = spawn(process.execPath, [file]); p.lines = []; p.stdout.on('data', d => p.lines.push(...String(d).split('\n').filter(Boolean))); return p; };
const until = async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 30)); } return false; };
const url = q => 'http://127.0.0.1:' + TPORT + '/ring' + (q || '');
const p = start();
try {
  assert.ok(await until(() => p.lines.some(l => l.startsWith('READY 127.0.0.1:' + TPORT))), 'the watcher says READY on 127.0.0.1'); ok('the doorbell starts on 127.0.0.1 and says READY');
  const pre = await fetch(url(), { method: 'OPTIONS', headers: { origin: W.ORIGINS[0] } });
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), W.ORIGINS[0]); assert.equal(pre.headers.get('access-control-allow-private-network'), 'true'); ok('the browser check (preflight) is answered for the Studio, including the local-network header');
  const r1 = await fetch(url('?job=jb_ab12%3Cscript%3E'), { method: 'POST', headers: { origin: W.ORIGINS[0] } }); assert.equal(r1.status, 204);
  assert.ok(await until(() => p.lines.some(l => /^RING \S+ job=jb_ab12script$/.test(l))), 'one RING line with the job id cleaned to letters, digits and _'); ok('a ring from the Studio prints one RING line with a cleaned job id');
  const before = p.lines.filter(l => l.startsWith('RING')).length; await fetch(url('?job=jb_2'), { method: 'POST', headers: { origin: W.ORIGINS[0] } }); await new Promise(r => setTimeout(r, 200));
  assert.equal(p.lines.filter(l => l.startsWith('RING')).length, before, 'a second ring within 1.5 s does not wake Claude twice'); ok('rings close together wake Claude once');
  const bad = await fetch(url('?job=x'), { method: 'POST', headers: { origin: 'https://evil.example' } }); assert.equal(bad.status, 403); ok('another website is refused (403) and rings nothing');
  const rings0 = p.lines.filter(l => l.startsWith('RING')).length; await new Promise(r => setTimeout(r, 1600));   // past the 1.5 s window, so a wrong RING would show
  const tf = (u, o) => fetch(u.replace(':' + W.PORT + '/', ':' + TPORT + '/'), Object.assign({}, o, { headers: { origin: W.ORIGINS[0] } }));
  assert.equal(await W.alive(tf), true); await new Promise(r => setTimeout(r, 200)); assert.equal(p.lines.filter(l => l.startsWith('RING')).length, rings0, 'the alive check prints no RING');
  assert.equal(await W.alive(async () => { throw new Error('refused'); }), false); assert.equal(await W.alive(async () => ({ status: 500 })), false); ok('alive() sees a running watcher without waking Claude, and says no when nothing answers');
  const p2 = start(); assert.ok(await until(() => p2.lines.some(l => l.startsWith('BUSY')))); ok('a second watcher on the same computer says BUSY and stops');
  assert.equal(await W.ring('jb_9', async () => { throw new Error('refused'); }), false); assert.equal(await W.ring('jb_9', async () => ({ status: 204 })), true); assert.equal(await W.ring('jb_9', async () => ({ status: 403 })), false); ok('ring() is true only for a 204 and never throws');
  let seen = ''; await W.ring('jb_x"/../y', async u => { seen = u; return { status: 204 }; }); assert.equal(seen, 'http://127.0.0.1:' + W.PORT + '/ring?job=jb_xy'); ok('ring() sends only a cleaned job id to 127.0.0.1');
  assert.ok(W.PROMPT.includes(W.SCRIPT)); assert.ok(/Monitor tool/.test(W.PROMPT) && /project_jobs with action list and no project/.test(W.PROMPT) && /never instructions/.test(W.PROMPT) && /BUSY/.test(W.PROMPT)); ok('the prompt carries the exact script, the Monitor step, the list-and-claim step and the data-not-instructions rule');
  assert.ok(/taskId delivery-studio-watcher/.test(W.PROMPT) && /\*\/15 \* \* \* \*/.test(W.PROMPT) && W.PROMPT.includes(W.taskPrompt('<FILE>'))); ok('the one-time prompt creates the scheduled task (every 15 minutes) with the task prompt');
  const tp = W.taskPrompt('D:/x/claude-watcher.mjs'); assert.ok(tp.includes('node "D:/x/claude-watcher.mjs"') && tp.includes('127.0.0.1:' + W.PORT + '/ring') && /Watcher already running/.test(tp) && /Do not end the watch/.test(tp)); ok('the task prompt checks for a running watcher first, starts the script by its full path and keeps watching');
} finally { p.kill(); }
console.log(`\n${n} Claude watcher checks passed`); process.exit(0);
