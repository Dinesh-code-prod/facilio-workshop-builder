// Turns two audit runs (before, after) into a route-by-route markdown table and rule totals.
// Usage: node tests/ui/report.mjs <before/report.json> <after/report.json>
import fs from 'node:fs';
const [bf, af] = process.argv.slice(2); const B = JSON.parse(fs.readFileSync(bf)), A = JSON.parse(fs.readFileSync(af));
const tally = rep => { const m = new Map(); for (const s of rep) { const k = s.screen; const e = m.get(k) || { vps: new Set(), n: 0, rules: {} }; e.vps.add(s.vp); e.n += s.issues.length; for (const i of s.issues) e.rules[i.rule] = (e.rules[i.rule] || 0) + 1; m.set(k, e); } return m; };
const tb = tally(B), ta = tally(A); const keys = [...new Set([...tb.keys(), ...ta.keys()])];
const rules = rep => { const r = {}; for (const s of rep) for (const i of s.issues) r[i.rule] = (r[i.rule] || 0) + 1; return r; };
const rb = rules(B), ra = rules(A); const allR = [...new Set([...Object.keys(rb), ...Object.keys(ra)])].sort();
let out = `| Check | Before | After |\n|---|---:|---:|\n` + allR.map(r => `| ${r} | ${rb[r] || 0} | ${ra[r] || 0} |`).join('\n') + `\n| **Total** | **${B.reduce((a, s) => a + s.issues.length, 0)}** | **${A.reduce((a, s) => a + s.issues.length, 0)}** |\n\nScreens checked: ${B.length} before, ${A.length} after (screen × viewport).\n\n`;
out += `| Screen | Viewports | Before | After | Remaining |\n|---|---|---:|---:|---|\n`;
for (const k of keys) { const b = tb.get(k), a = ta.get(k); out += `| ${k.replace(/\|/g, '/')} | ${[...((a || b).vps)].join(', ')} | ${b ? b.n : '–'} | ${a ? a.n : 'not reached'} | ${a && a.n ? Object.entries(a.rules).map(([r, n]) => r + ' ' + n).join(', ') : ''} |\n`; }
process.stdout.write(out);
