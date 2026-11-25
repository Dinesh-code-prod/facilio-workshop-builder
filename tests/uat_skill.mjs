// The facilio-uat-guide skill (skills/facilio-uat-guide): the UAT guide before go-live, kept apart from the handover user guide.
// Runs the workbook script on the example spec printed in SKILL.md, so the documented example can never go stale. Run: node tests/uat_skill.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const dir = 'skills/facilio-uat-guide'; const md = fs.readFileSync(dir + '/SKILL.md', 'utf8').replace(/\r\n/g, '\n'); let n = 0; const ok = s => { n++; console.log('  ok  ' + s); };
assert.match(md, /^---\nname: facilio-uat-guide\ndescription: .*BEFORE go-live.*NOT for the handover user guide.*guidebook-builder/s); ok('the skill says it is the UAT guide before go-live, not the handover user guide');
for (const f of ['references/uat-guide-template.md', 'references/test-script-standards.md', 'scripts/build_uat_workbook.py']) assert.ok(fs.existsSync(path.join(dir, f)), f);
const tpl = fs.readFileSync(dir + '/references/uat-guide-template.md', 'utf8'); assert.ok(/Entry criteria/.test(tpl) && /Exit criteria/.test(tpl) && /Sign-off/.test(tpl) && /not the permanent user guide/.test(tpl)); ok('the guide template has entry and exit criteria, sign-off, and says it is not the user guide');
const py = ['python', 'python3'].find(c => spawnSync(c, ['--version']).status === 0);
if (!py) { console.log('  --  no Python on this computer: the workbook script was not run'); }
else {
  const spec = JSON.parse(md.match(/```json\n([\s\S]*?)```/)[1]); const tmp = fs.mkdtempSync(path.join(process.env.FWB_TMP || os.tmpdir(), 'uat-')); const sp = path.join(tmp, 'spec.json');
  fs.writeFileSync(sp, JSON.stringify(spec)); const r = spawnSync(py, [dir + '/scripts/build_uat_workbook.py', sp, path.join(tmp, 'out')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /^(XLSX|CSV) /); assert.match(r.stdout, /scenarios 1, steps 2/);
  if (/^CSV /.test(r.stdout)) { const ts = fs.readFileSync(path.join(tmp, 'out', 'UAT-Acme-Facilities-workbook-test-scripts.csv'), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
    assert.equal(ts[0].split(',').length, 14); assert.equal(ts.length, 3); assert.ok(ts[1].startsWith('UAT-WO-01,Work Orders,Helpdesk agent,') && /,,,,,$/.test(ts[1]), 'tester columns are left empty: ' + ts[1]);
    assert.ok(fs.existsSync(path.join(tmp, 'out', 'UAT-Acme-Facilities-workbook-defect-log.csv')) && fs.existsSync(path.join(tmp, 'out', 'UAT-Acme-Facilities-workbook-sign-off.csv'))); }
  ok('the example spec in SKILL.md builds the workbook (' + r.stdout.split(' ')[0] + '): test scripts with empty tester columns, defect log, sign-off');
  const bad = Object.assign({}, spec, { scenarios: [{ id: 'WO1', steps: [{ action: 'x' }] }] }); fs.writeFileSync(sp, JSON.stringify(bad));
  const b = spawnSync(py, [dir + '/scripts/build_uat_workbook.py', sp, path.join(tmp, 'bad')], { encoding: 'utf8' }); assert.equal(b.status, 2); assert.match(b.stdout, /not like UAT-WO-01/); assert.match(b.stdout, /needs an action and an expected result/);
  ok('a wrong spec is refused with the reason (bad id, a step with no expected result)'); fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(n + ' UAT skill checks passed');
