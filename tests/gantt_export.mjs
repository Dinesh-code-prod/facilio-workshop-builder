// Plan timeline export (src/ganttexport.js): the HTML page is self-contained and escaped, draws only dated rows, marks today, late tasks and milestones; the Excel week grid covers the right weeks.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const G = createRequire(import.meta.url)('../src/ganttexport.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const rows = [
  { id: 'p1', title: 'Discovery <phase>', isPhase: true, start: '2026-11-02', end: '2026-11-20', owner: 'Both' },
  { id: 'a', title: 'Kick-off', ms: true, start: '2026-11-03', end: '2026-11-03', owner: 'Both', status: 'Done' },
  { id: 'b', title: 'Asset list & "templates"', start: '2026-11-04', end: '2026-11-12', owner: 'Customer', status: 'In progress', pct: 40 },
  { id: 'c', title: 'Workshops', start: '2026-11-16', end: '2026-12-04', owner: 'Facilio', status: 'Not started', pct: 0 },
  { id: 'd', title: 'Undated task', start: '', end: '', owner: 'Facilio' }];
const html = G.build(rows, { project: 'Riverside <Towers>', customer: 'Acme & Co', names: { Customer: 'Acme' }, today: '2026-11-24' });
t('a full page that asks for nothing outside (strict policy, no script, no links)', () => { assert.match(html, /^<!doctype html>/); assert.match(html, /default-src 'none'/); assert.doesNotMatch(html, /<script|https?:\/\//); });
t('names are escaped, never markup', () => { assert.match(html, /Riverside &lt;Towers&gt;/); assert.match(html, /Discovery &lt;phase&gt;/); assert.match(html, /&quot;templates&quot;/); assert.doesNotMatch(html, /<phase>|<Towers>/); });
t('every row is listed; only dated rows are drawn; the undated one is counted', () => { assert.match(html, /Undated task/); assert.match(html, /3 of 4 tasks dated/); assert.equal((html.match(/class="br"/g) || []).length, 2); assert.equal((html.match(/class="mk"/g) || []).length, 1); assert.equal((html.match(/class="ph"/g) || []).length, 1); });
t('the customer name replaces "Customer"; progress shows as the darker part', () => { assert.match(html, /<td>Acme<\/td>/); assert.match(html, /width:40%/); });
t('a task whose end has passed and is not done is marked late; a done one is not', () => { assert.match(html, /class=" late"><td class="t"><span class="in"><\/span>Asset list/); assert.doesNotMatch(html, /class=" late"><td class="t"><span class="in"><\/span>Kick-off/); });
t('today is drawn inside the range and named in the legend', () => { assert.match(html, /<s style="left:\d+px"><\/s>/); assert.match(html, /Today \(24 Nov 2026\)/); });
t('the week grid starts on the Monday before the first date and marks covered weeks', () => { const g = G.grid(rows); assert.equal(g.weeks[0], '2026-11-02'); assert.equal(g.weeks.length, 5); assert.deepEqual(g.cells[2], [true, true, false, false, false]); assert.deepEqual(g.cells[4], [false, false, false, false, false]); });
t('no dated rows: no weeks, still a valid page', () => { assert.deepEqual(G.weeks([{ title: 'x' }]), []); assert.match(G.build([{ title: 'x' }]), /0 of 1 tasks dated/); });
t('a phase without dates is drawn over its tasks, but its date cells stay empty (nothing invented)', () => { const h = G.build([{ title: 'Ph', isPhase: true }, { title: 'a', phase: 'Ph', start: '2026-11-02', end: '2026-11-06' }, { title: 'b', phase: 'Ph', start: '2026-11-10', end: '2026-11-12' }], { today: '2026-11-03' }); assert.equal((h.match(/class="ph"/g) || []).length, 1); assert.match(h, /<tr class="phr"><td class="t">Ph<\/td><td><\/td><td class="n"><\/td><td class="n"><\/td>/); });
console.log(n + ' Gantt export checks passed');
