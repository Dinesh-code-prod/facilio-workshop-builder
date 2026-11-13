// Transfers page (src/transferslogic.js and src/transfers.js): the pure helpers, and the real page code run against a small stand-in for the browser
// (a fake document, the app's FWB/FWBViews objects and an API that records calls). It is NOT a real browser: how the page looks and the drawer's real animation were checked by hand in the Browser pane.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok  ' + name); };

const T = require('../src/transferslogic.js');
const EVIL = '<script>alert(1)</script> "q" \'s\' `b` <img src=x onerror=alert(2)>';
const base = over => Object.assign({ id: 'x-' + 'a'.repeat(32), dir: 'pull', kind: 'msa', scope: '', source: { system: 'sharepoint', ref: 'sites/a/msa.pdf', label: 'MSA.pdf' }, dest: { system: 'studio', ref: 'msa-extraction', label: '' }, by: 'sam.k@facilio.com',
  createdAt: '2026-11-04T09:00:00.000Z', updatedAt: '2026-11-04T10:00:00.000Z', status: 'Awaiting Review', ver: 2, approvedVer: null, approvedBy: '', approvedAt: '', versions: [{ n: 1, at: '2026-11-04T09:00:00.000Z', by: 'sam.k@facilio.com', sha: 'a'.repeat(64), size: 10, store: 'db' }, { n: 2, at: '2026-11-04T10:00:00.000Z', by: 'sam.k@facilio.com', sha: 'b'.repeat(64), size: 20, store: 'db', validation: { ok: true, checked: 'extraction structure', warnings: ['w'] } }],
  error: null, log: [{ at: '2026-11-04T09:00:00.000Z', by: 'sam.k@facilio.com', from: '', to: 'Not Retrieved', note: 'Created' }], pushes: [], next: ['Approved', 'Draft Generated', 'Requires Attention'], evidenceNote: '' }, over || {});
const hostile = () => base({ kind: 'msa', scope: EVIDENCE(), source: { system: EVIL, ref: EVIL, label: EVIL }, dest: { system: EVIL, ref: EVIL, label: EVIL }, by: EVIL, status: 'Failed', error: { code: 'x', msg: EVIL }, approvedVer: 1, approvedBy: EVIL, projectId: 'p_1"><script>',
  versions: [{ n: 1, at: 'nope', by: EVIL, size: EVIL, validation: { ok: false, checked: EVIL, errors: [EVIL], warnings: [EVIL] } }], log: [{ at: '2026-11-04T09:00:00.000Z', by: EVIL, via: EVIL, from: EVIL, to: EVIL, note: EVIL }],
  pushes: [{ ver: 1, destRef: EVIL, receipt: EVIL, at: '2026-11-04T09:00:00.000Z', by: EVIL, verifiedAt: '2026-11-04T09:01:00.000Z' }], evidenceNote: EVIL, next: ['Approved'] });
function EVIDENCE() { return EVIL; }
const noRaw = (html, what) => { assert.ok(!/<script/i.test(html), what + ': a raw <script> got through'); assert.ok(!/<img/i.test(html), what + ': a raw <img> got through'); assert.ok(!html.includes('"q"') && !html.includes("'s'") && !html.includes('`b`'), what + ': a raw quote or backtick got through'); };

await t('ten statuses have ten different chip classes; anything else is neutral and never builds a class from its text', () => {
  assert.equal(T.STATUSES.length, 10); const cls = T.STATUSES.map(T.statusClass); assert.equal(new Set(cls).size, 10);
  assert.equal(T.statusClass('Failed'), 'xf-chip xf-st-failed'); assert.equal(T.statusClass('Requires Attention'), 'xf-chip xf-st-requires-attention');
  for (const bad of [EVIL, '', null, undefined, 'approved']) assert.equal(T.statusClass(bad), 'xf-chip xf-st-unknown');
  assert.equal(T.statusText({ status: 'Approved', approvedVer: 3 }), 'Approved v3'); assert.equal(T.statusText({ status: 'Pushed', approvedVer: 3 }), 'Pushed');
  assert.ok(T.isBad({ status: 'Failed' }) && T.isBad({ status: 'Requires Attention' }) && !T.isBad({ status: 'Approved' }));
  const css = read('src/transfers.css'); for (const c of ['failed', 'requires-attention', 'approved', 'awaiting-review']) assert.ok(css.includes('.xf-st-' + c), c);
  assert.ok(!/#[0-9a-f]{3,6}/i.test(css.replace(/#(1D1A5E|1570EF|E5197F|8DB8FF|fff|f0f2f7|5b6b86|eef4ff|fff1f7|d7dfee|eef1f7|f6f9ff|616161|424242|242424|525252|262626|171717|e5e5e5|d4d4d4|15803d|1262D8|c8126a|b10e1c|fdf3f4|fbe3e6|fafafa|f5f5f5|f0f0f0|e0e0e0|d1d1d1|bdbdbd|707070|eaf2ff|1d1d1f|6e6e73|d70015|248a3d|b25000|34c759|ff9f0a|ff3b30|8e8e93|e4f7e9|fff1dc|ffe9e7)\b/gi, '')), 'only Facilio colours and neutrals'); assert.ok(!/gradient|glow|blur\(|violet|purple/i.test(css));
});
await t('buttons come only from next[]: nothing in next, nothing to press, whatever the status', () => {
  for (const s of T.STATUSES) assert.deepEqual(T.actionsFor(base({ status: s, next: [] })), [], s);
  assert.deepEqual(T.actionsFor(null), []); assert.deepEqual(T.actionsFor({ status: 'Awaiting Review' }), []); assert.deepEqual(T.actionsFor({ status: 'Awaiting Review', next: 'Approved' }), []);
});
await t('Approve, Request changes, Resolve, Retry and Mark attention each appear only for the next[] that allows them', () => {
  const keys = x => T.actionsFor(base(x)).map(a => a.k);
  assert.deepEqual(keys({ status: 'Awaiting Review', next: ['Approved', 'Draft Generated', 'Requires Attention'] }), ['approve', 'changes', 'attention']);
  assert.deepEqual(keys({ status: 'Awaiting Review', next: ['Requires Attention'] }), ['attention'], 'an editor: no Approve, no Request changes');
  assert.deepEqual(keys({ status: 'Awaiting Review', next: ['Draft Generated'] }), ['changes']);
  assert.deepEqual(keys({ status: 'Draft Generated', next: ['Awaiting Review', 'Requires Attention'] }), ['attention'], 'Awaiting Review is Claude\'s step: no button');
  const r = T.actionsFor(base({ status: 'Requires Attention', next: ['Retrieving', 'Retrieved', 'Awaiting Review'] })); assert.deepEqual(r.map(a => a.k), ['resolve']); assert.deepEqual(r[0].choices, ['Retrieving', 'Retrieved', 'Awaiting Review']); assert.equal(r[0].to, 'Awaiting Review'); assert.equal(r[0].note, true);
  assert.deepEqual(T.actionsFor(base({ status: 'Requires Attention', next: [] })), []);
  const f = T.actionsFor(base({ status: 'Failed', next: ['Pushed'] })); assert.deepEqual(f.map(a => [a.k, a.to]), [['retry', 'Pushed']]); assert.deepEqual(T.actionsFor(base({ status: 'Failed', next: [] })), []);
  assert.deepEqual(keys({ status: 'Approved', next: ['Pushed', 'Draft Generated', 'Requires Attention'] }), ['attention'], 'Pushed is never a button');
  assert.deepEqual(keys({ status: 'Pushed', next: ['Synchronized', 'Failed', 'Requires Attention'] }), ['attention'], 'Synchronized and Failed are never buttons');
  assert.deepEqual(T.actionsFor(base({ next: ['Approved'] })).filter(a => a.note).length, 0, 'Approve needs no note'); assert.deepEqual(T.actionsFor(base({ next: ['Draft Generated'] })).map(a => a.note), [true]);
});
await t('filters by status and kind, counts, kinds, the holding order and the waiting count', () => {
  const L = [base({ id: 'x-1', status: 'Approved', kind: 'msa' }), base({ id: 'x-2', status: 'Failed', kind: 'brd' }), base({ id: 'x-3', status: 'Awaiting Review', kind: 'msa', updatedAt: '2026-11-01T00:00:00.000Z' }), base({ id: 'x-4', status: 'Approved', kind: 'brd' })];
  assert.deepEqual(T.filterRows(L, { status: 'Approved' }).map(x => x.id), ['x-1', 'x-4']); assert.deepEqual(T.filterRows(L, { kind: 'brd' }).map(x => x.id), ['x-2', 'x-4']); assert.deepEqual(T.filterRows(L, { status: 'Approved', kind: 'brd' }).map(x => x.id), ['x-4']);
  assert.equal(T.filterRows(L, {}).length, 4); assert.equal(T.filterRows(L, { status: 'Pushed' }).length, 0); assert.deepEqual(T.filterRows(null, { status: 'x' }), []);
  assert.deepEqual(T.kindsOf(L), ['brd', 'msa']); assert.deepEqual(T.countBy(L), { Approved: 2, Failed: 1, 'Awaiting Review': 1 }); assert.deepEqual(T.waiting(L).map(x => x.id), ['x-3']); assert.equal(T.holdingOrder(L)[0].id, 'x-3');
});
await t('the row has what, from and to, status, version, who, when and the error', () => {
  const r = T.rowOf(base({ status: 'Failed', error: { code: 'push_failed', msg: 'The push failed' }, scope: 'whole file' }));
  assert.deepEqual([r.what, r.from, r.to, r.version, r.who, r.when, r.error], ['MSA / whole file', 'SharePoint (MSA.pdf)', 'Delivery Studio (msa-extraction)', 'v2', 'sam.k', '2026-11-04 10:00 UTC', 'The push failed']);
  assert.equal(T.rowOf(base({ ver: 0 })).version, 'none');
});
await t('nothing from a transfer reaches the table, the drawer, the parts or the project line unescaped (script tags, quotes, backticks, an img with onerror)', () => {
  const h = hostile(); const list = [h, base({ label: EVIL, scope: EVIL, kind: 'x_y' })];
  noRaw(T.tableHtml(list, {}), 'table'); noRaw(T.tableHtml(list, { holding: true }), 'holding table');
  const d = T.drawerHtml({ transfer: h, version: h.versions[0], content: JSON.stringify({ [EVIL]: EVIL, list: [EVIL] }), intact: false, msg: { text: EVIL, bad: true }, note: EVIL, tab: 'holding', space: EVIL, started: { id: 'x', project: { id: 'p_1"><script>', name: EVIL }, note: EVIL, created: false } });
  noRaw(d, 'drawer'); assert.ok(d.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'the text is shown, escaped'); assert.ok(!d.includes('href="#/p/p_1"'), 'an odd project id gets no link');
  noRaw(T.drawerHtml({ transfer: base({ status: 'Requires Attention', next: [EVIL, 'Retrieved'] }) }), 'odd next'); noRaw(T.drawerHtml({ msg: { text: EVIL } }), 'no transfer');
  noRaw(T.partsHtml('<script>x</script>\n'.repeat(900)), 'plain text parts'); noRaw(T.startedHtml({ project: { id: 'p_9', name: EVIL }, note: EVIL }), 'started');
  noRaw(T.pageHtml({ tab: 'project', status: EVIL, kind: EVIL, proj: { list: list }, hold: { list: [] } }), 'page'); noRaw(T.pageHtml({ tab: 'holding', proj: { list: [] }, hold: { list: list, err: null } }), 'page holding'); noRaw(T.pageHtml({ tab: 'project', proj: { err: EVIL } }), 'page error');
});
await t('the drawer shows versions with validation, the log, evidence labelled as reported by Claude, and the written-by-others note', () => {
  const d = T.drawerHtml({ transfer: base({ status: 'Pushed', approvedVer: 2, approvedBy: 'sam.k@facilio.com', approvedAt: '2026-11-04T10:30:00.000Z', pushes: [{ ver: 2, destRef: 'sites/b/x', receipt: 'r-1', at: '2026-11-04T11:00:00.000Z', by: 'kim@facilio.com' }], evidenceNote: 'Reported by Claude. Delivery Studio cannot see the destination itself.', next: [] }), version: { n: 2 }, content: '{"customer":"Acme","scope":[1,2]}', intact: true });
  for (const s of ['passed (extraction structure); warning: w', 'Reported by Claude', 'Written by others', 'Approved: version 2 by sam.k', 'Created', 'Claude cannot approve', 'Nothing is open for you']) assert.ok(d.includes(s), s);
  assert.ok(d.includes('<summary>customer</summary>') && d.includes('<summary>scope</summary>'), 'a JSON content shows in parts by key'); assert.ok(!/data-act="xfDo"/.test(d), 'no buttons with an empty next');
  assert.equal(T.contentParts('x'.repeat(9000)).length, 3); assert.deepEqual(T.contentParts('[1]').map(p => p.title), ['Part 1 of 1']); assert.deepEqual(T.contentParts('').length, 0);
  assert.ok(T.partsHtml('x', false).includes('does not match its recorded checksum'));
});
await t('the holding tab: waiting count, Start project only on an approved msa, empty text, newest waiting first', () => {
  const W = base({ id: 'x-w', status: 'Awaiting Review' }), A = base({ id: 'x-ap', status: 'Approved', approvedVer: 2, next: [] }), B = base({ id: 'x-b', status: 'Approved', approvedVer: 1, kind: 'brd', dir: 'generate', next: [] });
  const h = T.pageHtml({ tab: 'holding', proj: { list: [] }, hold: { list: [A, B, W] } }); assert.ok(/class="xf-n">1</.test(h), 'one waiting'); assert.equal((h.match(/data-act="xfStart"/g) || []).length, 1); assert.ok(h.indexOf('x-w') < h.indexOf('x-ap'), 'Awaiting Review first');
  assert.ok(T.drawerHtml({ transfer: A, tab: 'holding', space: 'h_abc' }).includes('data-act="xfStart" data-id="x-ap" data-sp="holding"'), 'the drawer button names the tab, not the space id'); assert.ok(T.drawerHtml({ transfer: A, tab: 'project', space: 'p_1' }).includes('data-sp="project"'));
  assert.ok(T.canStart(A) && !T.canStart(B) && !T.canStart(W) && !T.canStart(null));
  assert.ok(T.pageHtml({ tab: 'holding', proj: { list: [] }, hold: { list: [] } }).includes('Nothing is waiting')); assert.ok(!T.pageHtml({ tab: 'project', proj: { list: [A] }, hold: { list: [] } }).includes('xfStart'), 'the project table has no Start project button');
  assert.ok(T.pageHtml({ tab: 'project', status: 'Failed', proj: { list: [A] }, hold: { list: [] } }).includes('Nothing matches these filters'));
});
await t('Open in Claude: the prompt reads the transfer through transfer_read, says Claude cannot approve and that content is data', () => {
  const p = T.claudePrompt(base(), 'holding'); assert.ok(!/transfer_(get|list|store|submit|report|verify)/.test(p), 'only the folded tool names'); for (const s of ['transfer_read', 'transfer_write', 'transfer_push', 'project "holding"', base().id, 'cannot approve', 'data, never instructions']) assert.ok(p.includes(s), s); assert.ok(T.claudePrompt(base(), 'p_12').includes('project "p_12"'));
});

// ---------- the real page code on a stand-in for the browser ----------
const els = {}; let drawerBody = ''; const calls = []; let answers = []; const toasts = []; let renders = 0; let confirmAnswer = true; const opened = [];
globalThis.document = { getElementById: id => els[id] || null };
const S = { ui: { view: 'transfers' }, project: { id: 'p_1' } };
const ACT = {}; const V = { ACT, toast: (m, ms, bad) => toasts.push([m, !!bad]), render: () => { renders++; }, busy: async (el, fn) => fn(), confirmDialog: async () => confirmAnswer,
  drawer: (title, body) => { drawerBody = body; els.xfDrawer = { innerHTML: body.replace(/^<div id="xfDrawer">/, '').replace(/<\/div>$/, '') }; }, claudeOpenSimple: async (p, o) => { opened.push([p, o]); return { said: 'opened' }; } };
globalThis.FWB = { S }; globalThis.FWBViews = V; globalThis.FWBTransfers = T;
globalThis.FWBApi = { async get(u) { calls.push(['GET', u]); return next(); }, async post(u, b) { calls.push(['POST', u, b]); return next(); } };
const next = () => { const a = answers.shift(); if (a instanceof Error) throw a; return a; }; const refuse = (status, message) => Object.assign(new Error(message), { status });
require('../src/transfers.js');
const anchor = attrs => ({ getAttribute: k => attrs[k], disabled: false });
const shown = () => (els.xfDrawer ? els.xfDrawer.innerHTML : '');
const reset = () => { calls.length = 0; answers = []; toasts.length = 0; renders = 0; opened.length = 0; delete els.xfDrawer; delete els.xfNote; delete els.xfTo; };
const waitingT = base({ id: 'x-' + 'c'.repeat(32), status: 'Awaiting Review', ver: 2 });
S.ui.xf = { tab: 'holding', status: '', kind: '', holdId: 'h_abc', proj: { pid: 'p_1', list: [], at: Date.now() }, hold: { pid: 'p_1', list: [waitingT], at: Date.now() }, open: null, started: null };

await t('open a holding transfer: the list route of the holding space with ?ver=latest, then the drawer shows next[]', async () => {
  reset(); answers = [{ transfer: waitingT, version: waitingT.versions[1], content: '{"customer":"Acme"}', intact: true }]; await ACT.xfOpen(anchor({ 'data-id': waitingT.id, 'data-sp': 'holding' }));
  assert.deepEqual(calls[0], ['GET', '/api/projects/h_abc/transfers/' + waitingT.id + '?ver=latest']); const d = shown(); assert.ok(/data-k="approve"/.test(d) && /data-k="changes"/.test(d) && /data-k="attention"/.test(d)); assert.ok(d.includes('<summary>customer</summary>'));
});
await t('a refused Approve (403) shows the server\'s own words in the drawer and as a toast, and the transfer is read again', async () => {
  reset(); els.xfNote = { value: '' }; const fresh = base({ id: waitingT.id, status: 'Awaiting Review', next: ['Requires Attention'] }); answers = [refuse(403, 'Only the project owner can do this, and not through Claude: <b>Claude can never approve</b>'), { transfer: fresh }];
  await ACT.xfDo(anchor({ 'data-k': 'approve' })); assert.deepEqual(calls[0], ['POST', '/api/projects/h_abc/transfers/' + waitingT.id + '/transition', { to: 'Approved', note: '', baseVersion: 2, ver: 2 }]);
  const d = shown(); assert.ok(d.includes('Only the project owner can do this'), 'the message is shown'); assert.ok(!d.includes('<b>Claude can never'), 'and escaped'); assert.ok(toasts.some(x => x[1] && /Only the project owner/.test(x[0]))); assert.equal(calls[1][0], 'GET'); assert.ok(!/data-k="approve"/.test(d), 'the buttons follow the fresh next[]');
});
await t('a stale version (409) is shown as the server worded it', async () => {
  reset(); X().open.transfer = waitingT; els.xfNote = { value: '' }; answers = [refuse(409, 'Conflict: this transfer is at version 3, not 2.'), { transfer: Object.assign({}, waitingT, { ver: 3 }) }]; await ACT.xfDo(anchor({ 'data-k': 'approve' })); assert.ok(shown().includes('Conflict: this transfer is at version 3, not 2.'));
});
function X() { return S.ui.xf; }
await t('Request changes, Resolve and Mark attention ask for a note first and send nothing without it; with a note they send it', async () => {
  reset(); X().open.transfer = waitingT; X().open.msg = null; els.xfNote = { value: '  ' }; await ACT.xfDo(anchor({ 'data-k': 'changes' })); assert.equal(calls.length, 0); assert.ok(/needs a short note/.test(shown()));
  els.xfNote = { value: 'Please fix the dates' }; answers = [{ transfer: base({ id: waitingT.id, status: 'Draft Generated', next: [] }) }]; await ACT.xfDo(anchor({ 'data-k': 'changes' }));
  assert.deepEqual(calls[0].slice(0, 3), ['POST', '/api/projects/h_abc/transfers/' + waitingT.id + '/transition', { to: 'Draft Generated', note: 'Please fix the dates', baseVersion: 2, ver: undefined }]); assert.ok(shown().includes('Request changes done'));
  reset(); const ra = base({ id: waitingT.id, status: 'Requires Attention', next: ['Retrieved', 'Awaiting Review'] }); X().open.transfer = ra; els.xfNote = { value: 'checked with the customer' }; els.xfTo = { value: 'Retrieved' }; answers = [{ transfer: base({ id: waitingT.id, status: 'Retrieved' }) }];
  await ACT.xfDo(anchor({ 'data-k': 'resolve' })); assert.equal(calls[0][2].to, 'Retrieved'); assert.equal(calls[0][2].note, 'checked with the customer');
  reset(); X().open.transfer = ra; els.xfNote = { value: 'ok' }; els.xfTo = { value: 'Pushed' }; answers = [{ transfer: ra }]; await ACT.xfDo(anchor({ 'data-k': 'resolve' })); assert.equal(calls.length, 0, 'a two-letter note is refused on the page');
  els.xfNote = { value: 'long enough' }; els.xfTo = { value: 'Synchronized' }; answers = [{ transfer: ra }]; await ACT.xfDo(anchor({ 'data-k': 'resolve' })); assert.equal(calls[0][2].to, 'Awaiting Review', 'a status outside next[] is never sent; the default is used');
});
await t('an action that next[] does not allow is never sent, even if a button for it is clicked', async () => {
  reset(); X().open.transfer = base({ id: waitingT.id, status: 'Pushed', next: [] }); answers = [{ transfer: X().open.transfer }]; await ACT.xfDo(anchor({ 'data-k': 'approve' })); assert.ok(!calls.some(c => c[0] === 'POST')); assert.ok(/not open any more/.test(shown()));
});
await t('Start project from this contract: asks first, calls the start-project route of the holding space and shows the new project link', async () => {
  reset(); const ap = base({ id: 'x-' + 'd'.repeat(32), status: 'Approved', approvedVer: 2, next: [] }); X().hold.list = [ap]; X().open = null; confirmAnswer = false; await ACT.xfStart(anchor({ 'data-id': ap.id, 'data-sp': 'holding' })); assert.equal(calls.length, 0, 'declined: nothing is sent');
  confirmAnswer = true; answers = [{ created: true, complete: true, project: { id: 'p_new', name: 'Acme <rollout>', url: 'https://x/#/p/p_new' }, note: 'The project was created.' }]; await ACT.xfStart(anchor({ 'data-id': ap.id, 'data-sp': 'holding' }));
  assert.deepEqual(calls[0], ['POST', '/api/projects/h_abc/transfers/' + ap.id + '/start-project', {}]); const pg = T.pageHtml({ tab: 'holding', proj: { list: [] }, hold: { list: [ap] }, started: X().started }); assert.ok(pg.includes('href="#/p/p_new"')); assert.ok(pg.includes('The project was created.')); assert.ok(pg.includes('Acme &lt;rollout&gt;')); noRaw(pg, 'started page');
});
await t('"already created" and a refusal are shown as the server answered, and nothing is invented', async () => {
  reset(); const ap = base({ id: 'x-' + 'd'.repeat(32), status: 'Approved', approvedVer: 2, next: [] }); answers = [{ created: false, complete: true, project: { id: 'p_new', name: 'Acme', url: 'u' }, note: 'A project was already created from this transfer; nothing was changed.' }]; await ACT.xfStart(anchor({ 'data-id': ap.id, 'data-sp': 'holding' }));
  const pg = T.pageHtml({ tab: 'holding', proj: { list: [] }, hold: { list: [ap] }, started: X().started }); assert.ok(pg.includes('already created from this contract') && pg.includes('nothing was changed'));
  reset(); X().started = null; X().open = { id: ap.id, space: 'h_abc', tab: 'holding', transfer: ap }; answers = [refuse(409, 'The extraction is Awaiting Review. A person must approve it in Delivery Studio before a project can be created from it.')]; await ACT.xfStart(anchor({ 'data-id': ap.id, 'data-sp': 'holding' }));
  assert.ok(shown().includes('A person must approve it')); assert.equal(X().started, null);
});
await t('Open in Claude uses the engine with the short transfer_read task; tab, filters and refresh work', async () => {
  reset(); X().open = { id: waitingT.id, space: 'h_abc', tab: 'holding', transfer: waitingT }; await ACT.xfClaude(); assert.equal(opened.length, 1); assert.ok(opened[0][0].includes('transfer_read') && opened[0][0].includes('project "holding"')); assert.equal(opened[0][1].module, 'Transfers');
  ACT.xfTab(anchor({ 'data-v': 'project' })); assert.equal(X().tab, 'project'); ACT.xfFilter({ getAttribute: () => 'kind', value: 'msa' }); assert.equal(X().kind, 'msa'); ACT.xfFilter({ getAttribute: () => 'status', value: 'Failed' }); assert.equal(X().status, 'Failed'); assert.ok(renders >= 3);
  answers = [{ transfers: [waitingT] }, { id: 'h_abc' }, { transfers: [] }]; calls.length = 0; await ACT.xfRefresh(anchor({})); assert.ok(calls.some(c => c[1] === '/api/projects/p_1/transfers'));
});
await t('the page is wired in: the Project group of the menu after Tasks, team-only, built, tested last, and the team text says it plainly', () => {
  const shell = read('src/shell.js'); assert.ok(/\['tasks', 'Tasks'\], \['transfers', 'Transfers'\]/.test(shell)); assert.ok(/g: 'Tasks & mail'[^\n]*\['transfers', 'Transfers'\]/.test(shell));
  assert.ok(/'transfers', 'settings'/.test(read('src/uistate.js')), 'hidden from customers like the other team pages'); const b = read('build.mjs'); assert.ok(b.includes("'src/transferslogic.js', 'src/transfers.js'") && b.includes("r('src/transfers.css')"));
  const tests = JSON.parse(read('package.json')).scripts.test.split(' && '); assert.ok(tests.includes('node tests/transfers_page.mjs'));   // later pages append their own tests after it assert.ok(tests.includes('node tests/msa_project_route.mjs'));
  const help = read('src/teamhelp.js') + read('src/claudesetup.js'); for (const s of ['Claude cannot approve', 'Start project from this contract', 'Pushed and Synchronized']) assert.ok(help.includes(s), s);
});
console.log(n + ' transfers page checks passed');
