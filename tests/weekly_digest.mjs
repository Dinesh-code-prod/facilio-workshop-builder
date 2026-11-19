// Weekly update draft (Governance, team and customer view): the stage line and sign-off names come from the records, never "undefined".
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const STAGE = [1, 1, 2, 3, 3, 4, 4, 4, 4, 5, 7, 8], NAMES = { 1: 'Project introduction', 2: 'Requirement sessions', 3: 'Solution design & BRD', 4: 'UAT & FTR', 5: 'Training guides', 7: 'Hypercare', 8: 'Project handover' };
globalThis.FWB = { S: {}, esc: x => x }; globalThis.FWBViews = { ACT: {}, stageOfStep: i => STAGE[i] || 0, roadmapName: n => NAMES[n] || '' };
const G = createRequire(import.meta.url)('../src/governance.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const info = Array.from({ length: 12 }, (_, i) => ({ i, title: 'Step title ' + (i + 1) }));
t('the stage line names the stage, the plan step and its title', () => {
  const l = G.stageLine({ cur: 4, info, note: '' });
  assert.equal(l, 'Current stage: Stage 3 · Solution design & BRD (plan step 5 of 12: Step title 5)\n'); assert.ok(!/undefined/.test(l));
});
t('a note is added; nothing started or no plan gives no line at all', () => {
  assert.ok(G.stageLine({ cur: 0, info, note: 'set by hand' }).endsWith('(set by hand)\n'));
  assert.equal(G.stageLine({ cur: -1, info, note: '' }), ''); assert.equal(G.stageLine(null), ''); assert.equal(G.stageLine({ cur: 3 }), '');
});
t('a stored sign-off (id only) gets its name; unknown ones read "Sign-off"', () => {
  assert.equal(G.soName({ id: 'brd', status: 'requested' }), 'BRD Sign-Off'); assert.equal(G.soName({ id: 'golive' }), 'Go-Live Acceptance');
  assert.equal(G.soName({ id: 'x', label: 'Custom' }), 'Custom'); assert.equal(G.soName({ id: 'zzz' }), 'Sign-off'); assert.equal(G.soName(null), 'Sign-off');
});
console.log(n + ' weekly digest checks passed');
