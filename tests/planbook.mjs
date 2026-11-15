// Project plan outline for the workbook (src/planbook.js): phases become headings with tasks, tasks carry working days and dependencies.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../src/planbook.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const rows = [{ id: 'tr_msa_design', title: 'Solution design', start: '2026-12-01', end: '2026-12-10' }, { id: 'tr_msa_brd', title: 'BRD', start: '2026-12-11', end: '2026-12-22' }, { id: 'tr_msa_config', title: 'Configuration', start: '2026-12-23', end: '2027-01-29' }];
const O = P.outline(rows, ['Work Order', 'Assets']);
t('each phase is a heading followed by its tasks', () => { assert.equal(O[0].level, 0); assert.equal(O[0].title, 'Solution design'); assert.deepEqual(O.filter(o => o.key.startsWith('brd.')).map(o => o.title), ['BRD drafted', 'BRD reviewed with the customer', 'BRD signed off']); });
t('configuration is split per module, with portfolio first', () => { assert.deepEqual(O.filter(o => o.key.startsWith('config.')).map(o => o.title), ['Portfolio (sites, buildings, spaces)', 'Configure Work Order', 'Configure Assets', 'Roles and access', 'Notifications and approvals']); });
t('configuration waits for the BRD sign-off; tasks inside a phase follow each other', () => { const c1 = O.find(o => o.key === 'config.1'); assert.deepEqual(c1.deps, ['brd.3']); assert.deepEqual(O.find(o => o.key === 'brd.2').deps, ['brd.1']); });
t('tasks never overlap the one they depend on and fall on working days', () => { O.filter(o => o.level === 1).forEach(o => { assert.ok(o.end >= o.start); const d = new Date(o.start + 'T00:00:00Z').getUTCDay(); assert.ok(d !== 0 && d !== 6, o.key + ' starts on a weekend'); o.deps.forEach(k => { const p = O.find(x => x.key === k); if (p.key.split('.')[0] === o.key.split('.')[0]) assert.ok(o.start > p.end, o.key + ' starts before ' + k + ' ends'); }); }); });
t('working days like Excel WORKDAY', () => { assert.equal(P.workday('2026-11-13', 1), '2026-11-16'); assert.equal(P.netdays('2026-11-16', '2026-11-20'), 5); });
console.log(n + ' plan workbook checks passed');
