// Removes old CSS rules for a page that has moved to UI.
// Usage: node tools/css-prune.mjs "<regex for selectors>" file.css [file2.css ...] [--dry]
// A rule (also inside @media / @supports) is deleted when EVERY selector in its list matches the regex,
// so shared rules (a selector list that also styles something kept) stay. --dry lists what would go.
import fs from 'node:fs';
const args = process.argv.slice(2); const dry = args.includes('--dry'); const rest = args.filter(a => a !== '--dry');
const re = new RegExp(rest[0]); const files = rest.slice(1);
function chunks(css) {
  const out = []; let i = 0; const n = css.length;
  while (i < n) {
    if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; out.push({ raw: css.slice(i, end) }); i = end; continue; }
    const m = /[{};]/.exec(css.slice(i)); if (!m) { out.push({ raw: css.slice(i) }); break; }
    const j = i + m.index, ch = css[j];
    if (ch !== '{') { out.push({ raw: css.slice(i, j + 1) }); i = j + 1; continue; }
    const sel = css.slice(i, j); let depth = 1, k = j + 1, instr = null;
    while (k < n && depth) { const c = css[k]; if (instr) { if (c === '\\') k++; else if (c === instr) instr = null; } else if (c === '"' || c === "'") instr = c; else if (c === '/' && css[k + 1] === '*') { k = css.indexOf('*/', k + 2) + 1; } else if (c === '{') depth++; else if (c === '}') depth--; k++; }
    out.push({ sel, body: css.slice(j + 1, k - 1) }); i = k;
  }
  return out;
}
let removed = 0;
function prune(css) {
  return chunks(css).map(c => {
    if (c.raw !== undefined) return c.raw;
    const sel = c.sel.trim();
    if (sel.startsWith('@')) { if (/^@(media|supports)/.test(sel)) { const inner = prune(c.body); return inner.trim() ? c.sel + '{' + inner + '}' : ''; } return c.sel + '{' + c.body + '}'; }
    const parts = sel.split(/,(?![^(]*\))/).map(s => s.trim()).filter(Boolean);
    if (parts.length && parts.every(p => re.test(p))) { removed++; if (dry) console.log('  - ' + sel.slice(0, 110)); return ''; }
    return c.sel + '{' + c.body + '}';
  }).join('');
}
for (const f of files) { removed = 0; const before = fs.readFileSync(f, 'utf8'); const after = prune(before).replace(/\n{3,}/g, '\n\n'); console.log(f + ': ' + removed + ' rules ' + (dry ? 'would go' : 'removed') + ', ' + before.length + ' -> ' + after.length + ' bytes'); if (!dry) fs.writeFileSync(f, after); }
