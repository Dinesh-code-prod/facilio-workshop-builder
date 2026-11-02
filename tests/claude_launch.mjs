// Open in Claude, shared rules (src/claudelogic.js): what may travel in a link, never a silently cut prompt, the short reference prompt, the common header.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const C = require('../src/claudelogic.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('a short prompt goes in the link, encoded, for both Desktop and the web', () => {
  const p = 'Read the "diagram" & return JSON: café ✓\nnew line'; const d = C.link('desktop', p), w = C.link('web', p);
  assert.ok(d.prefilled && w.prefilled); assert.ok(d.href.startsWith('claude://claude.ai/new?q=')); assert.ok(w.href.startsWith('https://claude.ai/new?q='));
  assert.equal(decodeURIComponent(d.href.split('?q=')[1]), p, 'special characters, Unicode and new lines survive');
});
t('a prompt that is too long is NEVER put in a link (it would be cut without warning): the plain link and a flag, so the caller copies it and says so', () => {
  const big = 'x'.repeat(9000); const d = C.link('desktop', big), w = C.link('web', big);
  assert.equal(d.prefilled, false); assert.equal(d.tooLong, true); assert.equal(d.href, 'claude://claude.ai/new'); assert.equal(w.href, 'https://claude.ai/new');
  const spacey = 'a b '.repeat(2000); assert.equal(C.link('desktop', spacey).prefilled, false, 'the limit counts the ENCODED length (every space becomes three characters)'); assert.equal(spacey.length < 14000, true);
  assert.equal(C.fits('desktop', 'short'), true); assert.equal(C.fits('web', big), false);
});
t('an empty prompt is never prefilled; the web limit is tighter than the Desktop limit', () => {
  assert.equal(C.link('desktop', '  ').prefilled, false); assert.equal(C.link('desktop', '').tooLong, false);
  const mid = 'y'.repeat(7000); assert.equal(C.link('desktop', mid).prefilled, true); assert.equal(C.link('web', mid).prefilled, false); assert.ok(C.LIMIT.web < C.LIMIT.desktop);
});
t('the reference prompt is short, names the tools in order and carries only the reference', () => {
  const ref = 'https://bucket.s3.us-west-2.amazonaws.com/handoff-1.json?X-Amz-Signature=abc'; const p = C.refPrompt('Flow from an image', ref);
  assert.ok(p.includes(ref)); assert.ok(p.indexOf('get_current_task') < p.indexOf('submit_task_result')); assert.ok(C.fits('desktop', p), 'it fits in a Desktop link'); assert.ok(p.length < 700);
  assert.ok(!/project|customer/i.test(p.replace('Facilio Delivery Studio hand-off', '')), 'no project data in the link itself');
});
t('the common header says who, where, what and what happens to the answer, and never loses the task text', () => {
  const w = C.wrap('TASK BODY', { project: 'Acme', customer: 'Acme Ltd', page: 'Process Whiteboard', module: 'Work Order', title: 'Flow from an image' });
  assert.ok(w.includes('Project: Acme (customer: Acme Ltd). Page: Process Whiteboard. Module: Work Order.')); assert.ok(w.includes('Task: Flow from an image.')); assert.ok(w.includes('saved only when the person confirms')); assert.ok(w.endsWith('TASK BODY')); assert.ok(w.includes('Do not invent'));
  const bare = C.wrap('B', {}); assert.ok(bare.includes('not named') && bare.endsWith('B'), 'missing details are said, not invented');
});
t('the flow answer shape lists nodes, edges and confidence', () => { assert.ok(C.FLOW_SHAPE.nodes[0].confidence && C.FLOW_SHAPE.edges[0].from); });
console.log(`\n${n} Claude launch checks passed`);
