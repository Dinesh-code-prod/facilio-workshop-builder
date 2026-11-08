// The customer's data workbook (src/onbhtml.js grids, Save workbook) and the studio's import check (src/onbreturn.js validateWorkbookHtml):
// the page carries one grid per sheet and table, and a saved page (data inside the wbdata block) is accepted only for the right project, with known sheets, bounded cells and no hostile keys.
import assert from 'node:assert/strict'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url); const H = req('../src/onbhtml.js'), R = req('../src/onbreturn.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const project = { id: 'p_123', name: 'CAFM roll-out', customer: 'Acme' };
const opts = { plan: { sheets: [
  { sheet: 'Site', crit: 'Critical', cols: [{ ent: 'Site', h: 'Site Name', req: true }, { ent: 'Site', h: 'City', opts: ['Dubai', 'Abu Dhabi'] }] },
  { sheet: 'Asset', crit: 'High', cols: [{ ent: 'Asset', h: 'Asset Name', req: true }, { ent: 'Asset', h: 'Site' }, { ent: 'Meter', h: 'Meter Name' }, { ent: 'Meter', h: 'Unit' }] }
], files: [] }, upload: { ext: ['xlsx'], maxMB: 60 } };
const ids = H.idsFor(opts), html = H.buildOnboardingHtml(project, opts);
const rules = { grids: ids.grids, answerIds: ids.answers, checklistIds: ids.checklist };
const saved = data => html.replace('<script type="application/json" id="wbdata"></script>', '<script type="application/json" id="wbdata">' + JSON.stringify(data).replace(/[<>&]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '</script>');
const wb = (rows, over) => Object.assign({ schema: 'fds-onboarding-workbook', version: 1, project: { id: 'p_123', name: 'CAFM roll-out' }, savedAt: '2026-11-07T10:00:00.000Z', rows, answers: { q_contact: 'Priya, priya@acme.com' }, checklist: { read_guide: true } }, over || {});

t('one grid per sheet and per table of a sheet', () => { assert.deepEqual(ids.grids.map(g => [g.key, g.ent, g.cols.length]), [['site_1', 'Site', 2], ['asset_1', 'Asset', 2], ['asset_2', 'Meter', 2]]); });
t('a column with a fixed list carries its choices to the page (dropdown); a free column carries none', () => { assert.deepEqual(ids.grids[0].opts, [null, ['Dubai', 'Abu Dhabi']]); assert.deepEqual(ids.grids[1].opts, [null, null]); assert.ok(html.includes('"opts":[null,["Dubai","Abu Dhabi"]]')); });
t('the page has a body for every grid, the save buttons and the empty data holder', () => { ids.grids.forEach(g => assert.ok(html.includes('id="gb_' + g.key + '"'))); assert.ok(html.includes('data-wbsave')); assert.ok(html.includes('id="wbdata"')); });
t('the page script still parses', () => { const m = /<script>([\s\S]*)<\/script>/.exec(html); assert.doesNotThrow(() => new vm.Script(m[1])); });
t('a saved workbook is accepted and cleaned to the known columns', () => {
  const r = R.validateWorkbookHtml(saved(wb({ site_1: [['HQ', 'Dubai', 'extra'], ['', ''], ['Plant', 'Abu Dhabi']], asset_2: [['Meter 1', 'kWh']] })), project, rules);
  assert.equal(r.ok, true, r.errors.join(' ')); assert.deepEqual(r.clean.rows.site_1, [['HQ', 'Dubai'], ['Plant', 'Abu Dhabi']]); assert.equal(r.clean.rowCount, 3); assert.equal(r.clean.answers.q_contact, 'Priya, priya@acme.com'); assert.equal(r.clean.checklist.read_guide, true); });
t('markup in a cell stays text and a closing script tag cannot end the block', () => { const r = R.validateWorkbookHtml(saved(wb({ site_1: [['</script><img src=x onerror=1>', 'x']] })), project, rules); assert.equal(r.ok, true); assert.equal(r.clean.rows.site_1[0][0], '</script><img src=x onerror=1>'); });
t('a workbook for another project is refused', () => { const r = R.validateWorkbookHtml(saved(wb({}, { project: { id: 'p_999', name: 'Other' } })), project, rules); assert.equal(r.ok, false); assert.match(r.errors[0], /different project/); });
t('hostile keys, a wrong schema and a missing block are refused without throwing', () => {
  assert.equal(R.validateWorkbookHtml(saved(JSON.parse('{"schema":"fds-onboarding-workbook","version":1,"project":{"id":"p_123"},"rows":{"__proto__":[["x"]]}}')), project, rules).ok, false);
  assert.equal(R.validateWorkbookHtml(saved(wb({}, { schema: 'something-else' })), project, rules).ok, false);
  assert.equal(R.validateWorkbookHtml(html, project, rules).ok, false); assert.equal(R.validateWorkbookHtml('', project, rules).ok, false); assert.equal(R.validateWorkbookHtml(null, project, rules).ok, false); });
t('data for a sheet the plan no longer has is ignored with a warning; long cells are cut; control characters go', () => {
  const r = R.validateWorkbookHtml(saved(wb({ gone_1: [['x']], site_1: [['A'.repeat(900) + '\u0001', 'ok']] })), project, rules);
  assert.equal(r.ok, true); assert.ok(r.warnings.some(w => /gone_1/.test(w))); assert.equal(r.clean.rows.site_1[0][0].length, 500); assert.ok(!/\u0001/.test(r.clean.rows.site_1[0][0])); });
t('too many rows are refused', () => { const rows = Array.from({ length: 5001 }, () => ['a', 'b']); assert.equal(R.validateWorkbookHtml(saved(wb({ site_1: rows })), project, rules).ok, false); });
console.log(n + ' workbook checks passed');
