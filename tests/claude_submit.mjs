// The Claude buttons send their request through the connector queue and open nothing: a hand-off package is stored, a chat job carries its id, the chat side says so;
// a picture task keeps the old panel. Run on fake page objects (no browser).
import assert from 'node:assert/strict';
import fs from 'node:fs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
const read = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/\}\)\(typeof window[^\n]*\s*$/, '})(window);');
const posts = [], opened = [], toasts = [], drawers = []; let askArgs = null;
const root = { location: { href: '' } };
root.FWB = { S: { project: { id: 'p1', name: 'Al Moallam', customer: 'Acme' }, ui: { view: 'tasks' }, user: { email: 'me@facilio.com' } }, esc: s => String(s) };
root.FWBApi = { post: async (url, body) => { posts.push([url, body]); if (/\/handoff$/.test(url)) return { id: 'a'.repeat(32), expires: new Date(Date.now() + 36e5).toISOString() }; return { ok: true }; }, get: async () => ({ status: 'waiting' }) };
root.FWBViews = { ACT: {}, drawer: (...a) => drawers.push(a), closeDrawer: () => { }, toast: (...a) => toasts.push(a), asstSay: () => { }, askClaude: async (note, o) => { askArgs = { note, o }; return true; }, render: () => { } };
root.window = root; root.open = u => { opened.push(u); return {}; };
const doc = { getElementById: () => null, querySelector: () => null, createElement: () => ({}), body: { appendChild() { } } }, store = { getItem: () => null, setItem: () => { } }, nav = { clipboard: { writeText: async () => { } } };
new Function('window', 'globalThis', 'document', 'localStorage', 'navigator', read('claudelogic.js'))(root, root, doc, store, nav);
new Function('window', 'globalThis', 'document', 'localStorage', 'navigator', read('claudehand.js'))(root, root, doc, store, nav);
const V = root.FWBViews;
await t('a prompt-only button stores a hand-off, queues one chat job with its id and opens no link', async () => {
  const r = await V.claudeOpenSimple('Track the tasks of this project.', { title: 'Track the tasks' }); assert.equal(r.ok, true); assert.match(r.said, /Sent to Claude/);
  assert.equal(posts.length, 1); assert.match(posts[0][0], /\/api\/projects\/p1\/handoff$/); assert.match(posts[0][1].prompt, /Track the tasks of this project/);
  assert.equal(askArgs.note, 'Track the tasks'); assert.equal(askArgs.o.ref, 'a'.repeat(32)); assert.ok(askArgs.o.prompt.includes('a'.repeat(32)), 'the copy prompt carries the hand-off id'); assert.equal(opened.length, 0, 'no Claude window or link was opened'); assert.equal(root.location.href, '', 'no claude:// navigation');
});
await t('a panel task with a prompt and no picture is queued too, with no Open in Claude panel', async () => {
  posts.length = 0; askArgs = null; await V.claudeHandoff({ title: 'Read the kick-off', prompt: 'Read the kick-off.', task: 'kickoff', onReply: () => { } });
  assert.equal(posts.length, 1); assert.equal(askArgs.o.ref, 'a'.repeat(32)); assert.equal(askArgs.o.refresh, true, 'the page updates when the answer arrives'); assert.equal(drawers.length, 0, 'no panel'); assert.equal(opened.length, 0);
});
await t('a picture task keeps the old panel (a picture cannot go through the connector)', async () => {
  posts.length = 0; askArgs = null; await V.claudeHandoff({ title: 'Read the flow picture', prompt: 'Read the picture.', task: 'flow-image', image: { size: 3, type: 'image/png' } });
  assert.equal(askArgs, null, 'nothing queued'); assert.equal(drawers.length, 1, 'the panel opened');
});
console.log('\n' + n + ' Claude submit checks passed');
