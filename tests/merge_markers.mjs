// No leftover merge-conflict markers in the code, styles or docs (a stray "=======" once broke the style rule after it and hid a fix). Run: node tests/merge_markers.mjs
import fs from 'node:fs'; import path from 'node:path';
const roots = ['src', 'work', 'tests', 'docs', 'build.mjs', 'package.json']; const bad = [];
const walk = p => { if (!fs.existsSync(p)) return; const st = fs.statSync(p); if (st.isDirectory()) { if (/node_modules|\.git|dist|vendor/.test(p)) return; for (const f of fs.readdirSync(p)) walk(path.join(p, f)); return; }
  if (!/\.(js|mjs|css|html|json|md)$/i.test(p) || st.size > 3e6) return; const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/); lines.forEach((l, i) => { if (/^(<<<<<<< |>>>>>>> |=======$)/.test(l)) bad.push(p + ':' + (i + 1) + ' ' + l.slice(0, 40)); }); };
roots.forEach(walk);
if (bad.length) { console.log(bad.join('\n')); console.log('FAIL: ' + bad.length + ' merge marker(s) left in the files above'); process.exit(1); }
console.log('no merge markers left');
