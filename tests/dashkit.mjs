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
t('pain points list the worst first, count from records, and leave out what is fine', () => {
  V.sdd = Object.assign(V.sdd || {}, { ageOf: x => x.age, pct: (a, b) => (b ? Math.round(a / b * 100) : 0) }); F.S = { ui: {}, ws: { questions: [{ q: 'a' }, { q: 'b', answer: 'x' }] } }; F.doc = () => ({}); V.items = { ready: () => true, list: () => [{ status: 'Blocked' }, { status: 'Done' }] };
  const c = { openBy: s => (s === 'Critical' ? 0 : 0), failed: 2, anyLate: [{ side: 'facilio' }, { side: 'customer' }], custLate: [{}, {}, {}], raidHigh: [], sg: id => ({ status: id === 'brd' ? 'requested' : 'notdue' }), crOpen: [{ age: 20 }, { age: 3 }], R: [{ status: 'Draft' }, { status: 'Confirmed' }], tcs: [{}, {}], run: 1, due: [1, 2, 3], hit: [1], hcOpen: [], st: { n: 5 }, today: '2026-11-09' };
  const p = K.pains(c); assert.equal(p.map(x => x.sev).join(), 'bad,bad,bad,warn,warn,warn,warn,warn,warn'); assert.equal(p[0].text, '2 test cases failed or are blocked');
  assert.ok(p.some(x => x.text === '1 task is blocked') && p.some(x => x.text === '3 customer actions are past their date') && p.some(x => x.text === '1 change request has waited over 14 days') && p.some(x => x.text === '1 customer question has no answer'));
  assert.ok(!p.some(x => /critical|hypercare|dated plan/.test(x.text)), 'nothing is listed for what is fine');
});
t('admin pain points count across projects, name where to fix each, and skip what is fine', () => {
  V.sdd.rstageOf = p => (p.metrics || {}).stage || 0; V.today = () => '2026-11-09'; V.daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const ps = [{ health: 'blocked', metrics: { target: '2026-11-01', overdueTasks: 2, custWaiting: 1, crOpen: 1 } }, { health: 'on_track', metrics: { stage: 2, target: '2027-01-01', overdueTasks: 1 } }];
  const C = { today: '2026-11-09', signals: [{ sev: 'critical' }, { sev: 'high' }, { sev: 'high' }], workload: { unassigned: [{ n: 3 }, { n: 2 }], concentration: [] } };
  const p = K.adminPains(C, ps), has = x => p.some(r => r.text === x);
  assert.equal(p[0].text, '1 critical warning signal'); assert.ok(p.slice(0, 3).every(r => r.sev === 'bad')); assert.ok(has('1 project is blocked') && has('1 project is past its go-live target') && has('3 tasks are overdue') && has('2 high warning signals') && has('5 open tasks have no owner') && has('1 project has no dated plan'));
  assert.ok(!p.some(r => /overdue.*project|concentration|one person/.test(r.text) && /projects? (is|are) overdue/.test(r.text)), 'no overdue projects listed');
  assert.ok(p.find(r => r.text === '1 project is blocked').attrs.includes('data-act="dkAQ"') && p.find(r => r.text === '3 tasks are overdue').attrs.includes('data-v="people"'));
});
console.log(n + ' dashboard kit checks passed');
