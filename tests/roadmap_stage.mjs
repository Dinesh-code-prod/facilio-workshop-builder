// The eight-stage roadmap in admin, portfolio and customer screens: each of the 12 plan steps belongs to one stage of the menu; the server and the browser copy of the mapping agree.
// NOT checked: the screens in a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STEPS, ROADMAP, STAGE_OF_STEP } from '../work/server/_portfolio.mjs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('every plan step maps to a stage of the menu, in order, and the stages are the ones in the menu', () => {
  assert.equal(STAGE_OF_STEP.length, STEPS.length); STAGE_OF_STEP.forEach(s => assert.ok(ROADMAP[s], 'stage ' + s));
  for (let i = 1; i < STAGE_OF_STEP.length; i++) assert.ok(STAGE_OF_STEP[i] >= STAGE_OF_STEP[i - 1], 'never goes back at step ' + (i + 1));
  const nav = read('src/shell.js'); for (const [k, name] of Object.entries(ROADMAP)) assert.ok(nav.includes("g: '" + k + '. ' + name + "'"), 'the menu has stage ' + k + ' ' + name);
});
t('the browser copy in src/timeline.js is the same mapping', () => {
  const js = read('src/timeline.js'); const arr = JSON.parse((js.match(/const STAGE_OF_STEP = (\[[^\]]*\])/) || [])[1] || 'null'); assert.deepEqual(arr, STAGE_OF_STEP);
  const names = Object.fromEntries([...js.match(/const ROADMAP = \{([^}]*)\}/)[1].matchAll(/(\d): '([^']+)'/g)].map(m => [m[1], m[2]])); assert.deepEqual(names, Object.fromEntries(Object.entries(ROADMAP).map(([k, v]) => [k, v])));
});
t('the screens show the stage, not Step n of 12 on its own', () => {
  assert.ok(!/Step \$\{x\.i \+ 1\} of 12 · \$\{esc\(x\.title\)\}<\/b>/.test(read('src/timeline.js')), 'project strip'); assert.ok(read('src/command.js').includes("'Stage ' + x.roadmapStage"), 'admin command view');
  assert.ok(read('src/dashboards.js').includes('V.roadmapName(V.stageOfStep(cur.i))'), 'customer hero'); assert.ok(!/the twelve stages of delivery/.test(read('src/dashboards.js')), 'portfolio card');
  const adm = read('src/admin.js'); assert.ok(adm.includes("'1 Project introduction'") && !adm.includes("'Workshops', 'Requirements', 'BRD'"), 'admin pipeline');
  const nav = read('src/shell.js'); assert.ok(nav.includes("['kickoff', 'Introduction deck', 'kickoff']") && !nav.includes("'Kick-off', 'kickoff'"), 'customer menu');
});
console.log(n + ' roadmap stage checks passed');
