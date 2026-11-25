// Redirect report (user, 25 Nov 2026): reads the JSON of tools/redirect-map.mjs and writes a Markdown report that sorts every control leading to
// another page into KEEP or REMOVE by the rules below, with a table per page. Usage: node tools/redirect-report.mjs <redirects.json> <out.md>
import fs from 'node:fs';
const [IN, OUT] = process.argv.slice(2); const { menu, rows } = JSON.parse(fs.readFileSync(IN, 'utf8'));
const inMenu = new Set(menu.map(m => m.view)); const lab = Object.fromEntries(menu.map(m => [m.view, m.label])); const grp = Object.fromEntries(menu.map(m => [m.view, m.group]));
// a stage is the leading number of its menu group ("2. Requirement sessions", "2. Process & checks" and "2. Module design" are one stage, one page bar)
const stage = v => { const g = grp[v] || ''; const m = /^(\d)\./.exec(g); return m ? m[1] : g; };
const uniq = new Map(); for (const r of rows) { const k = r.view + '|' + r.label + '|' + r.to; if (!uniq.has(k)) uniq.set(k, Object.assign({ tabs: new Set() }, r)); uniq.get(k).tabs.add(r.tab || 'top'); }
const U = [...uniq.values()];
// the rules, in order; the first that matches decides
const RULES = [
  ['K1', 'keep', 'The stage bar: the pages of the stage you are in', r => !r.where && lab[r.to] === r.label && stage(r.to) === stage(r.view)],
  ['K2', 'keep', 'Team Guide: a guide may link to the page it explains', r => r.view === 'teamhelp'],
  ['K3', 'keep', 'One "Open ... →" per card, to that card\'s own page', r => /→\s*$/.test(r.label) && inMenu.has(r.to)],
  ['R1', 'remove', 'A link to a page that is not in the menu (lands somewhere unexpected)', r => !inMenu.has(r.to)],
  ['R2', 'remove', 'A number, chart row, checklist line or list item that is itself a link (the card already has its one Open link)', r => /\d/.test(r.label) || /^[✓✕!]/.test(r.label)],
  ['R3', 'remove', 'Any other jump to a page of another stage from inside a page', r => stage(r.to) !== stage(r.view)],
  ['K4', 'keep', 'A link to a page of the same stage', () => true]];
U.forEach(r => { const m = RULES.find(x => x[3](r)); r.rule = m[0]; r.verdict = m[1]; });
const count = (f) => U.filter(f).length;
let md = '# Redirects in Delivery Studio: what is there and what to keep (25 Nov 2026)\n\n';
md += 'Every control on the team pages that leads to ANOTHER page, found by opening every menu page and each of its tabs in a browser (tools/redirect-map.mjs, project "Demo: Riverside Towers"). Tab bars, the side menu and Back buttons are not counted: they are navigation and stay.\n\n';
md += '**' + U.length + ' controls** (' + rows.length + ' counting each tab they show on): **' + count(r => r.verdict === 'keep') + ' keep, ' + count(r => r.verdict === 'remove') + ' remove**.\n\n## The rules\n\n| Rule | | Controls |\n|---|---|---|\n' + RULES.map(x => '| ' + x[0] + ' ' + x[1] + ' | ' + x[2] + ' | ' + count(r => r.rule === x[0]) + ' |').join('\n') + '\n\n';
md += 'A removed control does not lose the page it pointed to: the page stays in the menu, and a card keeps one "Open ... →" link to its own page.\n\n## By page\n\n| Page | Keep | Remove |\n|---|---|---|\n';
const pages = [...new Set(U.map(r => r.view))].sort((a, b) => count(r => r.view === b) - count(r => r.view === a));
md += pages.map(v => '| ' + (lab[v] || v) + ' | ' + count(r => r.view === v && r.verdict === 'keep') + ' | ' + count(r => r.view === v && r.verdict === 'remove') + ' |').join('\n') + '\n\n## Every control\n';
for (const v of pages) { md += '\n### ' + (lab[v] || v) + '\n\n| Verdict | Where (tab · card) | Label | Goes to |\n|---|---|---|---|\n';
  md += U.filter(r => r.view === v).sort((a, b) => a.verdict.localeCompare(b.verdict)).map(r => '| ' + r.rule + ' ' + r.verdict + ' | ' + [...r.tabs].join(', ').replace(/\|/g, '/').slice(0, 40) + (r.where ? ' · ' + r.where.replace(/\|/g, '/').slice(0, 40) : '') + ' | ' + r.label.replace(/\|/g, '/').slice(0, 60) + ' | ' + (lab[r.to] || r.to + ' (not in the menu)') + ' |').join('\n') + '\n'; }
fs.writeFileSync(OUT, md); console.log(U.length + ' controls: ' + count(r => r.verdict === 'keep') + ' keep, ' + count(r => r.verdict === 'remove') + ' remove'); RULES.forEach(x => console.log(x[0], x[1], count(r => r.rule === x[0]), x[2]));
