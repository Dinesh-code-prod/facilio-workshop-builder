// Every action that asks for a file (V.pickFile) must be on the drop list in src/shell.js, so a dropped file works on every import button.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const shell = fs.readFileSync('src/shell.js', 'utf8'); const list = new Set((/new Set\('([^']*)'\.split/.exec(shell) || [, ''])[1].split(' ').filter(Boolean));
assert.ok(list.size > 30, 'drop list found');
const all = fs.readdirSync('src').filter(x => x.endsWith('.js')).map(f => fs.readFileSync('src/' + f, 'utf8'));
const found = new Set();
for (const s of all) {
  const acts = []; const re = /ACT\.([A-Za-z0-9_]+)\s*=/g; let m; while ((m = re.exec(s))) acts.push([m.index, m[1]]);
  let i = -1; while ((i = s.indexOf('V.pickFile(', i + 1)) >= 0) { let a = null; for (const x of acts) if (x[0] < i) a = x; if (a && i - a[0] < 2500) found.add(a[1]); }
}
const notActions = new Set(['ugBlkMove']); // a helper that asks for a picture sits just after it
const missing = [...found].filter(n => !list.has(n) && !notActions.has(n));
assert.deepEqual(missing, [], 'add these to DROP_ACTS in src/shell.js: ' + missing.join(', '));
const dynamic = new Set(['ftrImport', 'kpiImport']); // defined as ACT[cfg.view + 'Import']
const text = all.join('\n');
for (const n of list) assert.ok(dynamic.has(n) || text.includes('ACT.' + n + ' ='), 'no such action: ' + n);
console.log('drop list: ' + list.size + ' import actions accept a dropped file');
