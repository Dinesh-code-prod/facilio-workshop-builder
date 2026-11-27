// Dead CSS finder (27 Nov 2026): a rule in the older style layers can only ever apply if every class its selector needs exists in the app's code.
// For each rule, each selector of its list is dead when one of its required classes (not inside :not/:is/:where/:has) never appears in src/**/*.js|html,
// public/**/*.js|html or work/src; a rule is dead when ALL its selectors are dead. A class counts as present when its full name appears anywhere, or when it is
// built at run time from a prefix ending in "-" (e.g. 'ty-' + n makes ty-2). Vendor prefixes (FullCalendar fc-, pdf.js, lottie) are always kept.
// Usage: node tools/dead-css.mjs [--write]   (without --write it only reports; masterds.css is never touched)
import fs from 'node:fs'; import path from 'node:path';
const FILES = fs.readFileSync('build.mjs', 'utf8').match(/r\('(src\/[^']+\.css)'\)/g).map(m => m.slice(3, -2)).filter(f => !/masterds\.css$/.test(f));
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const corpus = [...walk('src').filter(f => /\.(js|html)$/.test(f)), ...walk('public').filter(f => /\.(js|html)$/.test(f)), ...walk('work/src'), ...walk('work/server').filter(f => /.(m?js)$/.test(f)), ...walk('data').filter(f => /.(js|json)$/.test(f))].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const KEEP = /^(fc-|pdf|textLayer|annotationLayer|lottie|cm-|hljs|leaflet|ql-|swal|tippy|flatpickr|is-|has-|on$|active$|open$|hidden$|show$|sel$|done$|dark$|light$)/;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// every prefix the code builds class names from: the token right before ${...} in a template, or before a closing quote and + (e.g. sd-s${i}, 'ty-' + n, ` s-${x}`)
const BUILT = new Set([...corpus.matchAll(/([A-Za-z_][\w-]*)\$\{/g), ...corpus.matchAll(/([A-Za-z_][\w-]*)['"`]\s*\+/g)].map(m => m[1]).filter(p => p.length >= 2));
const seen = new Map(); const present = c => { if (seen.has(c)) return seen.get(c); let ok = KEEP.test(c) || corpus.includes(c);
  if (!ok) for (let k = 2; k < c.length && !ok; k++) ok = BUILT.has(c.slice(0, k));   // built at run time from this prefix: keep
  if (!ok) { const m = /^(.*-)[^-]+$/.exec(c); if (m && m[1].length >= 3) ok = new RegExp(esc(m[1]) + '[\'"`]?\\s*\\+|' + esc(m[1]) + '\\$\\{').test(corpus); }   // second, looser check: either one keeps it
  seen.set(c, ok); return ok; };
// classes a selector needs: those outside :not/:is/:where/:has (inside them a class may be absent and the rule still match)
const required = sel => { let out = '', depth = 0; for (let i = 0; i < sel.length; i++) { const ch = sel[i]; if (ch === '(') { depth++; continue; } if (ch === ')') { depth = Math.max(0, depth - 1); continue; } if (!depth) out += ch; } return [...out.replace(/:(not|is|where|has)/g, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]); };
const deadSel = sel => required(sel).some(c => !present(c));
const parse = (src, st) => { let res = '', pos = 0; while (pos < src.length) { const open = src.indexOf('{', pos); if (open < 0) { res += src.slice(pos); break; } const head = src.slice(pos, open);
    let d = 1, j = open + 1; while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; } const body = src.slice(open + 1, j - 1);
    const h = head.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (/^@(media|supports|layer)\b/.test(h)) res += head + '{' + parse(body, st) + '}';
    else if (h.startsWith('@') || !h.includes('.')) res += head + '{' + body + '}';
    else { const sels = h.split(/,(?![^(]*\))/).map(x => x.trim()).filter(Boolean); if (sels.length && sels.every(deadSel)) { st.n++; st.b += j - pos; const lead = head.match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)*/); res += lead ? lead[0] : ''; } else res += head + '{' + body + '}'; }
    pos = j; } return res; };
let total = 0, bytes = 0; const write = process.argv.includes('--write');
for (const f of FILES) { const css = fs.readFileSync(f, 'utf8'); const st = { n: 0, b: 0 }; const out = parse(css, st); total += st.n; bytes += st.b;
  if (st.n) console.log(`${f}: ${st.n} dead rules, ${(st.b / 1024).toFixed(1)} KB of ${(css.length / 1024).toFixed(0)} KB`); if (write && st.n) fs.writeFileSync(f, out); }
console.log(`total ${total} dead rules, ${(bytes / 1024).toFixed(1)} KB${write ? ' removed' : ' (report only; --write removes them)'}`);
