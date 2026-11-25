// Assistant chat commands (src/chatcmds.js): clear commands become an app action or a Claude job; anything unclear returns null and goes to Project AI or Claude as before.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../src/chatcmds.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const pages = [['ftr', 'FTR Report'], ['uatguide', 'UAT guide'], ['tasks', 'Tasks'], ['brd', 'BRD'], ['guides', 'Training']];
const m = s => C.match(s, { pages, today: new Date('2026-11-15T10:00:00Z') });
t('open a page by its menu name', () => { assert.deepEqual(m('open the BRD'), { type: 'nav', view: 'brd', label: 'BRD' }); assert.equal(m('go to tasks').view, 'tasks'); assert.equal(m('show me the FTR report').view, 'ftr'); assert.equal(m('open the UAT guide page').view, 'uatguide'); assert.equal(m('open the moon'), null); });
t('add a task keeps the words', () => { assert.deepEqual(m('add task: call the customer about the SLA.'), { type: 'task', title: 'call the customer about the SLA' }); assert.equal(m('new task follow up on the BRD').title, 'follow up on the BRD'); });
t('the FTR: write it, or check the organisation', () => { assert.equal(m('write the FTR report').job.section, 'write'); assert.equal(m('can you refresh the ftr').job.kind, 'make_ftr'); assert.equal(m('check the org configuration for the FTR').job.section, 'check'); assert.equal(m('what is in the FTR?'), null); });
t('guides, for everything or one module', () => { const g = m('make the UAT guide'); assert.equal(g.job.kind, 'make_guide'); assert.equal(g.job.section, 'uat'); const u = m('write a user guide for Work Orders'); assert.equal(u.job.section, 'user'); assert.match(u.job.note, /^Only for the module "Work Orders"/); assert.equal(m('create a video script').job.section, 'video'); });
t('the weekly report ends today', () => { const w = m('make the weekly status report'); assert.equal(w.job.kind, 'make_wsr'); assert.equal(w.job.section, '2026-11-15'); });
t('approve finds the draft, never approves by itself', () => { assert.deepEqual(m('approve the FTR report'), { type: 'draft', task: 'ftr', label: 'FTR report' }); assert.equal(m('approve the UAT guide').task, 'uat'); });
t('Meteor and Comet: open docked, or ask through Claude', () => { assert.deepEqual(m('open meteor'), { type: 'dock', site: 'meteor', label: 'Meteor' }); const q = m('ask comet for the latest walkthrough video'); assert.equal(q.job.kind, 'chat'); assert.match(q.job.note, /Comet connector tools, READ only/); assert.equal(q.label, 'Ask Comet through your Claude'); });
t('questions and unclear messages are left to the router', () => { for (const q of ['how many test cases failed?', 'why is the BRD late', 'summarise the last session', '', 'x'.repeat(400)]) assert.equal(m(q), null); });
const { askTasks } = await import('../work/server/_asktopic.mjs'); const A = ['wsr', 'ftr', 'uat', 'brd', 'config', 'workshop', 'gaps'];
t('quick answers read the area the question names first, then the page', () => { assert.deepEqual(askTasks('how many FTR cases failed?', 'wsr', A), ['ftr', 'wsr']); assert.deepEqual(askTasks('who owns the overdue tasks', 'brd', A), ['wsr', 'brd']); assert.deepEqual(askTasks('hello', 'ftr', A), ['ftr']); assert.deepEqual(askTasks('x', 'unknown', A), ['gaps']); });
const mods = [{ name: 'purchaseorder', label: 'Purchase Order' }, { name: 'purchaserequest', label: 'Purchase Request' }, { name: 'quote', label: 'Quote' }, { name: 'order', label: 'Order' }, { name: 'workorder', label: 'Work Order' }];
const ms = s => C.match(s, { pages, modules: mods, today: new Date('2026-11-15T10:00:00Z') });
t('scope: the modules named, out or in, and flows only when asked', () => {
  assert.deepEqual(ms('Purchase Order, Purchase Request and Quote are not required for this project. Remove their flows and mark them out of scope'), { type: 'scope', modules: ['purchaserequest', 'purchaseorder', 'quote'], inScope: false, flows: 'off' });
  assert.deepEqual(ms('mark quotes out of scope'), { type: 'scope', modules: ['quote'], inScope: false, flows: 'keep' }, 'plural, flows untouched');
  assert.deepEqual(ms('bring Work Order back into scope'), { type: 'scope', modules: ['workorder'], inScope: true, flows: 'keep' }, 'Work Order is not also Order');
  assert.equal(ms('remove the purchase requests flow').flows, 'off'); assert.equal(ms('what is in scope for quote?'), null, 'a question is not a change');
  assert.equal(ms('mark invoices out of scope'), null, 'no known module: not a scope command'); assert.equal(m('mark quotes out of scope'), null, 'no module list: not a scope command');
});
t('the project check and how often it runs', () => {
  assert.deepEqual(m('check this project'), { type: 'check' }); assert.deepEqual(m('What needs attention?'), { type: 'check' }); assert.deepEqual(m('run a health check'), { type: 'check' });
  assert.deepEqual(m('check this project every day'), { type: 'checkfreq', freq: 'daily' }); assert.deepEqual(m('check the project when I open it'), { type: 'checkfreq', freq: 'open' }); assert.deepEqual(m('stop checking the project'), { type: 'checkfreq', freq: 'off' });
});
console.log(n + ' chat command checks passed');
