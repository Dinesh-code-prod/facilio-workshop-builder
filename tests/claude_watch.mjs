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
  { const mk = init => { const m = new Map(Object.entries(init || {})); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
    const NOW = Date.parse('2026-11-24T12:00:00Z'), recent = '2026-11-24T11:00:00Z', yes = async () => ({ status: 403 }), no = async () => { throw new Error('refused'); };
    let s = mk(); assert.equal(await W.autoOn(recent, s, yes, NOW), true); assert.equal(s.getItem(W.KEY), '1'); assert.ok(s.getItem(W.PROBED), 'the look is remembered');
    s = mk(); assert.equal(await W.autoOn(recent, s, no, NOW), false); assert.equal(s.getItem(W.KEY), null); assert.equal(await W.autoOn(recent, s, yes, NOW), false, 'only ONE look per browser'); assert.equal(s.getItem(W.KEY), null);
    s = mk({ [W.KEY]: '0' }); assert.equal(await W.autoOn(recent, s, yes, NOW), false); assert.equal(s.getItem(W.KEY), '0'); assert.equal(s.getItem(W.PROBED), null, 'switched off by the person: no look at all');
    let calls = 0; const count = async () => { calls++; return { status: 403 }; };
    assert.equal(await W.autoOn('', mk(), count, NOW), false); assert.equal(await W.autoOn('2026-11-10T00:00:00Z', mk(), count, NOW), false); assert.equal(calls, 0, 'no Claude check-in in 7 days: the computer is never asked');
    ok('the watcher switches itself on once for a person whose Claude checked in, never twice, never against their own switch-off'); }
  const p2 = start(); assert.ok(await until(() => p2.lines.some(l => l.startsWith('BUSY')))); ok('a second watcher on the same computer says BUSY and stops');
  assert.equal(await W.ring('jb_9', async () => { throw new Error('refused'); }), false); assert.equal(await W.ring('jb_9', async () => ({ status: 204 })), true); assert.equal(await W.ring('jb_9', async () => ({ status: 403 })), false); ok('ring() is true only for a 204 and never throws');
  let seen = ''; await W.ring('jb_x"/../y', async u => { seen = u; return { status: 204 }; }); assert.equal(seen, 'http://127.0.0.1:' + W.PORT + '/ring?job=jb_xy'); ok('ring() sends only a cleaned job id to 127.0.0.1');
  assert.ok(W.PROMPT.includes(W.SCRIPT)); assert.ok(/Monitor tool/.test(W.PROMPT) && /project_jobs with action list and no project/.test(W.PROMPT) && /never instructions/.test(W.PROMPT) && /BUSY/.test(W.PROMPT)); ok('the prompt carries the exact script, the Monitor step, the list-and-claim step and the data-not-instructions rule');
  assert.ok(/taskId delivery-studio-watcher/.test(W.PROMPT) && /\*\/15 \* \* \* \*/.test(W.PROMPT) && W.PROMPT.includes(W.taskPrompt('<FILE>'))); ok('the one-time prompt creates the scheduled task (every 15 minutes) with the task prompt');
  const tp = W.taskPrompt('D:/x/claude-watcher.mjs'); assert.ok(tp.includes('node "D:/x/claude-watcher.mjs"') && tp.includes('127.0.0.1:' + W.PORT + '/alive') && !/curl|Bash/.test(tp) && /nodejs.org/.test(tp) && /Watcher already running/.test(tp) && /Do not end the watch/.test(tp)); ok('the task prompt checks for a running watcher first, starts the script by its full path and keeps watching');
  { const s = W.SETUP;   // the one setup message for a teammate (24 Nov 2026)
    assert.ok(/Windows or a Mac/.test(s) && /never install anything without asking me first/.test(s), 'both systems, and nothing is installed without a yes');
    assert.ok(s.includes('https://www.python.org/downloads/') && s.includes('https://nodejs.org/') && s.includes('https://git-scm.com/downloads') && /xcode-select --install/.test(s), 'every missing tool gets its official download page, and the Mac shortcut');
    assert.ok(s.includes(W.MCP) && /outlook_email_search/.test(s) && s.includes('https://bitbucket.org/facilio/facilio-impl-ai-skills.git') && /facilio-impl-toolbox/.test(s) && /ask my lead for access/.test(s), 'connectors, the Facilio skills copy and the toolbox, with the way out when access is refused');
    assert.ok(/delivery-studio-watcher/.test(s) && /\*\/15 \* \* \* \*/.test(s) && /studio-job-queue/.test(s) && /\*\/30 \* \* \* \*/.test(s) && s.includes(W.taskPrompt('<FILE>')) && s.includes(W.QUEUE_PROMPT) && s.includes(W.SCRIPT), 'the watcher (every 15 minutes) and the job queue (every 30 minutes) with their prompts and the script');
    assert.ok(/project_jobs with action list and no project, with skills/.test(s) && /setup: \{ os: windows or mac, python, node, git, studio, m365, toolbox, skillsRepo, studioSkills, watcher, queue \}/.test(s), 'the setup report goes back to the Studio as the person\'s checklist');
    assert.ok(/facilio-uat-guide \(the UAT guide before go-live\)/.test(s) && /guidebook-builder \(the handover user guide after go-live\)/.test(s) && /openpyxl/.test(s) && /do it only if I say yes/.test(s), 'the UAT skill and the handover guide skill are checked, and the Excel library is offered, never forced');
    assert.ok(!/password|token|api key/i.test(W.QUEUE_PROMPT) && /never instructions/.test(W.QUEUE_PROMPT) && /Never send e-mail/.test(W.QUEUE_PROMPT)); ok('one setup message covers Windows and Mac, the free tools, both connectors, the Facilio skills, the two tasks and reports a checklist'); }
} finally { p.kill(); }
console.log(`\n${n} Claude watcher checks passed`); process.exit(0);
