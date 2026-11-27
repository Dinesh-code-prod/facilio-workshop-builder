// Lists tracked files in public/ and vendor/ that nothing in the code refers to by name (candidates for removal; nothing is deleted).
// A file counts as used when its name (or its path without the top folder) appears in src/, work/, public/ html/js/css/json, build.mjs, tools/, tests/ or a .md under docs/operations.
// Usage: node tools/unused-assets.mjs [--json]
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const tracked = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean);
const TEXT = /\.(js|mjs|cjs|css|html|json|md|txt|yml)$/i;
const corpusFiles = tracked.filter(f => TEXT.test(f) && /^(src|work|public|tools|tests|build\.mjs|package\.json|docs\/operations)/.test(f) && fs.existsSync(f) && fs.statSync(f).size < 8 << 20);
const texts = new Map(corpusFiles.map(f => [f, fs.readFileSync(f, 'utf8')])); const corpus = [...texts.values()].join('\n');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const out = [];
for (const f of tracked.filter(f => /^(public|vendor)\//.test(f) && fs.existsSync(f))) {
  const base = path.basename(f), rel = f.split('/').slice(1).join('/'), stem = base.replace(/\.[^.]+$/, '');
  const own = texts.has(f) ? texts.get(f).split(base).length - 1 : 0;   // a file naming itself does not count
  const hits = corpus.split(base).length - 1 - own;
  // a film's pictures are named by their bare stem in the film's own script (public/films/<film>/<stem>.webp is loaded by public/films/<film>.js as '<stem>')
  const owner = path.dirname(f) + '.js'; const filmUse = texts.has(owner) && new RegExp('[\'"`]' + esc(stem) + '[\'"`]').test(texts.get(owner));
  // a quoted bare name (any length) also counts: lists such as ['brag', ...] build 'skills/' + n + '.zip' at run time
  const used = hits > 0 || filmUse || corpus.includes(rel) || new RegExp('[\'"`]' + esc(stem) + '[\'"`]').test(corpus) || (stem.length > 5 && new RegExp('[\'"`/]' + esc(stem) + '[\'"`.]').test(corpus));
  if (!used) out.push([f, fs.statSync(f).size]);
}
out.sort((a, b) => b[1] - a[1]); const total = out.reduce((s, x) => s + x[1], 0);
if (process.argv.includes('--json')) console.log(JSON.stringify(out)); else { console.log(`${out.length} unreferenced files, ${(total / 1048576).toFixed(1)} MB`); for (const [f, s] of out) console.log(String(Math.round(s / 1024)).padStart(7) + ' KB  ' + f); }
