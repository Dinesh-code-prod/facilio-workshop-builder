// Fluent 2 migration audit (roadmap E19): counts the old decoration still left in each style file, so the clean-up can go file by file and be checked.
// Counts: gradients, border-radius of 14px or more (Fluent: 4 controls, 8 cards, 12 popovers), pill radius, text/box shadows that are not a Fluent shadow, uppercase tracking, violet-looking hex colours.
// Usage: node tests/ui/css-legacy-audit.mjs   (prints a table; exit 0 always, it is a report)
import fs from 'node:fs';
const dir = new URL('../../src/', import.meta.url); const files = fs.readdirSync(dir).filter(f => f.endsWith('.css') && f !== 'fluent.css');
const inBuild = fs.readFileSync(new URL('../../build.mjs', import.meta.url), 'utf8');
const hexRe = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const violet = h => { let x = h.slice(1); if (x.length === 3) x = x.split('').map(c => c + c).join(''); const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16); return b > r + 25 && r > g + 25 && b > 120; };
const rows = files.filter(f => inBuild.includes("src/" + f)).map(f => { const s = fs.readFileSync(new URL(f, dir), 'utf8');
  const rad = (s.match(/border-radius:\s*([^;}]+)/g) || []).filter(m => (m.match(/\d+(\.\d+)?px/g) || []).some(v => parseFloat(v) >= 14) || /999|50%/.test(m)).length;
  return { file: f, kb: Math.round(s.length / 1024), gradients: (s.match(/-gradient\(/g) || []).length, bigRadius: rad, shadows: (s.match(/box-shadow:/g) || []).length, upper: (s.match(/text-transform:\s*uppercase/g) || []).length, violet: (s.match(hexRe) || []).filter(violet).length }; })
  .sort((a, b) => (b.gradients + b.bigRadius + b.violet) - (a.gradients + a.bigRadius + a.violet));
console.log('file'.padEnd(22) + 'KB'.padStart(5) + 'grad'.padStart(7) + 'bigRad'.padStart(8) + 'shadow'.padStart(8) + 'UPPER'.padStart(7) + 'violet'.padStart(8));
rows.forEach(r => console.log(r.file.padEnd(22) + String(r.kb).padStart(5) + String(r.gradients).padStart(7) + String(r.bigRadius).padStart(8) + String(r.shadows).padStart(8) + String(r.upper).padStart(7) + String(r.violet).padStart(8)));
const t = k => rows.reduce((s, r) => s + r[k], 0); console.log('TOTAL'.padEnd(22) + String(t('kb')).padStart(5) + String(t('gradients')).padStart(7) + String(t('bigRadius')).padStart(8) + String(t('shadows')).padStart(8) + String(t('upper')).padStart(7) + String(t('violet')).padStart(8));
