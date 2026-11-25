// Re-planning (user, 25 Nov 2026, "like Smartsheet"): every date change of the plan timeline is logged with a reason in plan_changes, which customers may not read;
// the grid edits dates and % through the same save (so Undo and the log cover it); an explicit baseline is set with a reason and kept when versions roll over.
// Checked in a browser on a scratch copy (not here): a cell edit asks why, the reason is stored, Slip shows +5 d, the log lists it.
import assert from 'node:assert/strict'; import fs from 'node:fs';
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const tl = src('src/timeline.js'), api = src('work/server/api.mjs'), shell = src('src/shell.js');
t('the change log is a team-only document (a reason such as "Facilio delay" never reaches the customer)', () => { assert.match((api.match(/TEAM_DOCS = new Set\(\[[^\]]*\]/) || [''])[0], /'plan_changes'/); assert.match(shell, /consultantSections = \[[^\]]*'plan_changes'/); assert.doesNotMatch((shell.match(/S\.user\.kind === 'customer' \? \[[^\]]*\]/) || [''])[0], /plan_changes/); });
t('every save of the rows logs the date changes first, so drag, shift, import, edit and undo are all covered', () => { assert.match(tl, /function saveRows\(rows, label, noUndo\) \{ const d = TD\(\); logDates\(d\.rows, rows, label\);/); assert.match(tl, /function logDates\(prev, rows, label\) \{ if \(cust\(\)\) return;/); });
t('the grid edits go through saveRows (Undo and the log apply) and move dependent tasks', () => { const c = (tl.match(/ACT\.tlCell = [\s\S]*?\n  ACT\.tlUndo/) || [''])[0]; assert.match(c, /saveRows\(rows,/); assert.match(c, /V\.tlDeps\.follow\(rows, id\)/); assert.match(c, /The end cannot be before the start/); });
t('a new baseline needs a reason when it replaces one, and the old ones are kept', () => { assert.match(tl, /if \(d\.baseline && !reason\) \{ toast/); assert.match(tl, /d\.baselines = \(Array\.isArray\(d\.baselines\) \? d\.baselines : \[\]\)\.concat\(\[d\.baseline\]\)\.slice\(-10\)/); });
t('the first saved plan is kept as the baseline when the 30 versions roll over', () => { assert.match(tl, /if \(d\.versions\.length > 30\) \{ if \(!d\.baseline\) d\.baseline = /); });
t('the connector tells Claude about the log', () => { assert.match(api, /\['plan_changes', 'Every date change in the plan timeline/); });
console.log(n + ' re-planning checks passed');
