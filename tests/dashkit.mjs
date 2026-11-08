// The dashboard widget kit (src/dashkit.js): each shape draws from numbers, says so when there is nothing, and escapes what it prints.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
const code = fs.readFileSync(new URL('../src/dashkit.js', import.meta.url), 'utf8'); const V = { ACT: {} }; const F = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };
const root = { FWB: F, FWBViews: V }; vm.runInNewContext(code, { window: root, globalThis: root, Math, String, Object, Array, Set }); const K = V.dk; let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('pie, rings, dots, orbit, spine and rows say so when there is nothing to draw', () => {
  assert.match(K.pie([['a', 0, '#000']], 'Empty pie.'), /Empty pie\./); assert.match(K.rings([{ l: 'x', p: null, c: '#000' }], 'No rings.'), /No rings\./);
  assert.match(K.dots([], [], 'No dots.'), /No dots\./); assert.match(K.orbit('t', 's', [], 'No sats.'), /No sats\./); assert.match(K.spine([], 'No steps.'), /No steps\./); assert.match(K.rows([{ l: 'a', parts: [[0, '#000']] }], null, 'No rows.'), /No rows\./);
});
t('a pie with one part is a full circle, with two it is two slices; rings clamp to 100', () => {
  assert.ok(K.pie([['a', 3, '#111'], ['b', 0, '#222']]).includes('<circle cx="50" cy="50" r="46"')); assert.equal((K.pie([['a', 3, '#111'], ['b', 1, '#222']]).match(/<path /g) || []).length, 2);
  const r = K.rings([{ l: 'x', p: 250, c: '#000' }]); assert.ok(r.includes('250') === false && r.includes('100%'));
});
t('orbit numbers every satellite and the list matches; dots cap at 300; text is escaped', () => {
  const o = K.orbit('Hi', 'sub', [{ l: '<b>A</b>', c: '#111' }, { l: 'B', c: '#222' }, { l: 'C', c: '#333' }]); assert.equal((o.match(/<circle /g) || []).length, 2 + 3); assert.ok(o.includes('&lt;b&gt;A&lt;/b&gt;') && !o.includes('<b>A</b>'));
  const d = K.dots(Array(305).fill('#111'), [['x', 305, '#111']]); assert.equal((d.match(/<i style="background:#111"><\/i>/g) || []).length, 300 + 1); assert.match(d, /first 300 of 305/);
});
t('spine marks the state of each step; rows scale to the longest row', () => {
  const s = K.spine([{ l: 'A', s: 'done' }, { l: 'B', s: 'now' }, { l: 'C', s: 'next' }]); assert.ok(s.includes('class="done"') && s.includes('class="now"') && s.includes('class="next"'));
  const r = K.rows([{ l: 'a', parts: [[2, '#1']] }, { l: 'b', parts: [[4, '#2']] }]); assert.ok(r.includes('width:50.0%') && r.includes('width:100.0%'));
});
t('the admin filter keeps only the projects that match every chosen filter, and the bar says how many are shown', () => {
  V.sdd = { rstageOf: p => (p.metrics || {}).stage || 0, RSTG: [[0, 'All stages'], [1, 'Intro'], [2, 'Reqs']], ORDER: ['blocked', 'on_track'], HL: { blocked: 'Blocked', on_track: 'On track' } }; V.today = () => '2026-11-08'; V.daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  F.S = { ui: {} }; const ps = [{ name: 'A', customer: 'X', health: 'blocked', metrics: { stage: 1, target: '2026-11-20' } }, { name: 'B', customer: 'Y', health: 'on_track', metrics: { stage: 2, target: '2027-03-01' } }, { name: 'C', customer: 'X', health: 'on_track', metrics: {} }];
  assert.equal(K.filterPortfolio(ps).length, 3); F.S.ui.dkA.customer = 'X'; assert.deepEqual(K.filterPortfolio(ps).map(p => p.name), ['A', 'C']);
  F.S.ui.dkA.when = '30'; assert.deepEqual(K.filterPortfolio(ps).map(p => p.name), ['A']); F.S.ui.dkA.when = 'none'; assert.deepEqual(K.filterPortfolio(ps).map(p => p.name), ['C']);
  F.S.ui.dkA = { stage: '2', health: 'all', customer: 'all', type: 'all', when: 'all', q: 'b' }; assert.deepEqual(K.filterPortfolio(ps).map(p => p.name), ['B']);
  assert.ok(K.adminBar(ps, K.filterPortfolio(ps)).includes("Showing <b>1</b> of 3 projects"));
});
console.log(n + ' dashboard kit checks passed');
