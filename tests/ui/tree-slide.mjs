// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/tree-slide.mjs
// Steps the tree intro frame by frame (60 fps clock) through the slide to the left and measures how each label moves relative to its own node:
// offsets must change smoothly (no jumps), labels must not blink on and off, and nodes themselves must move smoothly. Usage: node tests/ui/tree-slide.mjs [base] [width]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173', WID = +(process.argv[3] || 1440);
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: WID, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?intro=1' + (process.argv[4] === 'full' ? '#full' : '')); await p.waitForFunction(() => window.__ti && window.__ti.scrub, null, { timeout: 15000 });
const r = await p.evaluate(async () => {
  const ti = window.__ti, frames = [], R = ti.REVEAL, FULL = location.hash === '#full', c0 = FULL ? 0 : ti.unwarp(R - .5), c1 = ti.unwarp(R + 4);
  for (let c = c0; c <= c1; c += 1 / 60) { ti.scrub(c, -1); const nodes = {}; for (const n of ti.nodeBoxes()) nodes[n.node] = [n.x + 13, n.y + 13];
    const labs = {}; document.querySelectorAll('.cn.ti .lbl').forEach((el, i) => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || ''); labs[i] = { cls: el.className + '|' + (el.getAnimations ? el.getAnimations().length : 0), st: el.classList.contains('act') ? 'act' : 'done', show: el.classList.contains('show'), x: m ? +m[1] : null, y: m ? +m[2] : null }; });
    frames.push({ T: ti.T, nodes, labs }); await new Promise(r => setTimeout(r, 0)); }
  let restyled = 0; const where = []; let worstOffJerk = 0, worstNodeJerk = 0, blinks = 0, jumps = 0, maxOffStep = 0;
  for (let f = 2; f < frames.length; f++) { const A = frames[f - 2], B = frames[f - 1], C = frames[f];
    for (const i of Object.keys(C.labs)) { const a = A.labs[i], bb = B.labs[i], c = C.labs[i]; if (bb.show !== c.show && a.show === c.show) blinks++;
      if (!(a.show && bb.show && c.show) || !C.nodes[i] || !B.nodes[i] || !A.nodes[i]) continue;
      const off = (F, L) => [F.labs[L].x - F.nodes[L][0], F.labs[L].y - F.nodes[L][1]]; const oa = off(A, i), ob = off(B, i), oc = off(C, i);
      const step = Math.hypot(oc[0] - ob[0], oc[1] - ob[1]), jerk = Math.hypot(oc[0] - 2 * ob[0] + oa[0], oc[1] - 2 * ob[1] + oa[1]); maxOffStep = Math.max(maxOffStep, step); if (jerk > 8) { jumps++; if (where.length < 12) where.push({ T: +C.T.toFixed(2), label: +i, step: +step.toFixed(1) }); }
      worstOffJerk = Math.max(worstOffJerk, Math.hypot(oc[0] - 2 * ob[0] + oa[0], oc[1] - 2 * ob[1] + oa[1])); }
    for (const i of Object.keys(C.nodes)) if (A.nodes[i] && B.nodes[i]) worstNodeJerk = Math.max(worstNodeJerk, Math.hypot(C.nodes[i][0] - 2 * B.nodes[i][0] + A.nodes[i][0], C.nodes[i][1] - 2 * B.nodes[i][1] + A.nodes[i][1])); }
  return { frames: frames.length, suddenLabelJumps: jumps, where, largestOffsetStepPx: +maxOffStep.toFixed(2), worstOffsetJerkPx: +worstOffJerk.toFixed(3), worstNodeJerkPx: +worstNodeJerk.toFixed(3), blinks };
});
console.log(JSON.stringify(Object.assign({ width: WID }, r)), errs.length ? 'ERRORS ' + errs.slice(0, 2).join(' | ') : ''); await b.close();
