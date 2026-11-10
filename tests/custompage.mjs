// Custom pages: what the team types is cleaned and limited before it is saved or drawn.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../src/custompage.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
t('an old text-only page becomes one tab with one text block', () => {
  const p = C.cleanPage({ id: 'p1', label: 'Contacts', body: '# Hello' }); assert.equal(p.tabs.length, 1); assert.equal(p.tabs[0].blocks[0].type, 'text'); assert.equal(p.tabs[0].blocks[0].md, '# Hello');
  assert.equal(C.cleanPage({}).tabs[0].blocks.length, 0);
});
t('limits: tabs, blocks, buttons, columns, rows', () => {
  const many = n => Array.from({ length: n }, (_, i) => i);
  const p = C.cleanPage({ tabs: many(20).map(i => ({ label: 'T' + i, blocks: many(50).map(() => ({ type: 'text', md: 'x' })) })) }); assert.equal(p.tabs.length, C.LIMIT.tabs); assert.equal(p.tabs[0].blocks.length, C.LIMIT.blocks);
  assert.equal(C.parseTable(many(100).map(() => 'a|b|c|d|e|f|g|h|i|j').join('\n')).cols.length, C.LIMIT.cols); assert.equal(C.parseTable(['A|B'].concat(many(100).map(() => '1|2')).join('\n')).rows.length, C.LIMIT.rows);
  assert.equal(C.parseLinks(many(40).map(i => 'L' + i + ' | tasks').join('\n')).length, C.LIMIT.links);
});
t('links: a Studio page id or an https link only, anything else is dropped', () => {
  const l = C.parseLinks('Tasks | tasks\nSite | https://example.com/a\nBad | javascript:alert(1)\nAlso bad | ftp://x.y\nNo target'); assert.deepEqual(l.map(x => x.kind + ':' + x.to), ['page:tasks', 'url:https://example.com/a']);
  const b = C.cleanBlock({ type: 'links', items: [{ label: 'x', kind: 'url', to: 'javascript:alert(1)' }, { label: 'y', kind: 'page', to: 'a b' }] }); assert.equal(b.items.length, 0);
});
t('embed: only https addresses on Facilio hosts are kept', () => {
  assert.ok(C.embedOk('https://comet.facilio.work/v/1')); assert.ok(C.embedOk('https://www.facilio.com/x')); assert.ok(!C.embedOk('http://comet.facilio.work/')); assert.ok(!C.embedOk('https://evilfacilio.com/')); assert.ok(!C.embedOk('https://facilio.com.evil.io/')); assert.ok(!C.embedOk('javascript:alert(1)'));
  assert.equal(C.cleanBlock({ type: 'embed', url: 'https://evil.example/' }).url, '');
});
t('checklist keeps ticks for lines that stay the same; numbers keep only known metrics; unknown block types become text', () => {
  const old = [{ t: 'one', done: true }, { t: 'two', done: false }]; const items = C.parseChecklist('one\nthree', old); assert.deepEqual(items, [{ t: 'one', done: true }, { t: 'three', done: false }]);
  assert.deepEqual(C.cleanBlock({ type: 'numbers', metrics: ['open', 'open', 'bogus', 'risks'] }).metrics, ['open', 'risks']); assert.equal(C.cleanBlock({ type: 'script', md: 'x' }).type, 'text');
});
t('table round trip and long text is cut', () => {
  const x = C.parseTable('Name | Owner\nA | Sam\nB'); assert.deepEqual(x, { cols: ['Name', 'Owner'], rows: [['A', 'Sam'], ['B', '']] }); assert.equal(C.tableText(x), 'Name | Owner\nA | Sam\nB | ');
  assert.equal(C.cleanBlock({ type: 'text', md: 'x'.repeat(30000) }).md.length, 20000); assert.equal(C.cleanBlock({ type: 'ask', prompt: 'p'.repeat(9000) }).prompt.length, 4000);
});
console.log(n + ' custom page checks passed');
