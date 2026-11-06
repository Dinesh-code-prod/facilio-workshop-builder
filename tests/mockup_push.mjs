// Claude brings a finished Meteor page into the Studio (work/server/_dsapi.mjs, tool mockup_save_page, action save_mockup of session_questions):
// only the Meteor file host is fetched, only a team member may save, only an HTML page is kept, and the pushed page is recorded in the mockup_pages document.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { installDs } from '../work/server/_dsapi.mjs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const docs = {}; const stored = []; const CONNECTOR = {}; let role = 'edit';
installDs({ HttpError, CONNECTOR, projectAccess: async () => ({ role }), pickProject: async () => ({ id: 'p1', name: 'Al Moallam' }), audit: async () => { },
  viaApp: async (m, path, q, body) => { const sec = path.split('/').pop(); if (m === 'GET') return { data: docs[sec] || {}, version: 1 }; docs[sec] = body.data; return {}; }, storeServerFile: async (pid, uid, o) => { stored.push(o); return { id: 'f_1', name: o.name, size: Buffer.byteLength(o.text) }; } });
const tool = CONNECTOR.mockup_save_page; const s = { id: 'u1', name: 'Dinesh', email: 'd@x.com' }; const OK = 'https://facilio-work-sites.s3.us-west-2.amazonaws.com/private/x/index.html?sig=1';
const web = (text, ok = true) => { globalThis.fetch = async () => ({ ok, status: ok ? 200 : 403, text: async () => text }); };
const rejects = async (p, status) => { try { await p; } catch (e) { assert.equal(e.status, status, e.message); return; } assert.fail('should have been refused ' + status); };
await t('the tool exists and the connector declares the action and its three fields without adding a tool', () => {
  assert.equal(typeof tool, 'function'); const j = JSON.parse(fs.readFileSync(new URL('../work/work.json', import.meta.url), 'utf8')); const sq = j.mcp.tools.find(x => x.name === 'session_questions').input_schema.properties;
  assert.ok(sq.action.enum.includes('save_mockup')); assert.ok(sq.pageKey && sq.pageUrl && sq.pageName); assert.ok(j.mcp.tools.length <= 40, 'the connector keeps its cap of 40 tools'); assert.match(fs.readFileSync(new URL('../work/server/api.mjs', import.meta.url), 'utf8'), /save_mockup: 'mockup_save_page'/);
});
await t('a bad card key, a link outside the Meteor file host, or a customer is refused', async () => {
  web('<!doctype html><html></html>'); await rejects(tool(s, { pageKey: 'nonsense', pageUrl: OK }), 400); await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: 'https://evil.example.com/index.html' }), 400);
  await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: 'http://facilio-work-sites.s3.us-west-2.amazonaws.com/x' }), 400); await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: 'not a link' }), 400);
  role = 'customer'; await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: OK }), 403); role = 'edit'; assert.equal(stored.length, 0);
});
await t('a link that does not open, or a file that is not an HTML page, is refused and nothing is stored', async () => {
  web('x', false); await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: OK }), 502); web('{"a":1}'); await rejects(tool(s, { pageKey: 'portfolio:all', pageUrl: OK }), 415); assert.equal(stored.length, 0);
});
await t('a good page is stored as mockup_html and recorded under its card key; a second push replaces the entry', async () => {
  web('<!doctype html><html><body>portfolio</body></html>'); const r = await tool(s, { pageKey: 'portfolio:all', pageUrl: OK, pageName: 'Portfolio page' });
  assert.equal(r.key, 'portfolio:all'); assert.equal(stored.length, 1); assert.equal(stored[0].category, 'mockup_html'); assert.equal(stored[0].name, 'Portfolio page.html'); assert.equal(stored[0].mime, 'text/html');
  assert.deepEqual(docs.mockup_pages.items['portfolio:all'].file, { id: 'f_1', name: 'Portfolio page.html', size: stored[0].text.length }); assert.match(docs.mockup_pages.items['portfolio:all'].by, /Claude/);
  await tool(s, { pageKey: 'flow:workorder:f1', pageUrl: OK }); assert.deepEqual(Object.keys(docs.mockup_pages.items), ['portfolio:all', 'flow:workorder:f1'], 'a second card is added beside the first');
});
console.log(n + ' mockup push checks passed');
