// Writes CHANGELOG.md (the history of the project, at the top of the repository) from the app's own What's new list (src/whatsnew.js, RELEASES).
// One list, two places: the app shows it under Help > What's new, GitHub shows it as CHANGELOG.md. Run: node tools/changelog.mjs
// tests/changelog.mjs fails when the file is out of step, so after adding an entry to RELEASES run this once.
import fs from 'node:fs';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1] : String(d || ''); };
/** the RELEASES array of src/whatsnew.js, read from its text (the file is browser code, so it is not imported) */
export function releases(src) {
  const a = src.indexOf('const RELEASES = ['); const z = src.indexOf('\n  ];', a); if (a < 0 || z < 0) throw new Error('RELEASES not found in src/whatsnew.js');
  return new Function('return ' + src.slice(a + 'const RELEASES = '.length, z + 4).replace(/;\s*$/, ''))();
}
export function render(list) {
  const out = ['# What changed, and when', '', 'The history of Facilio Delivery Studio, newest first. Each entry is one version: what was added or fixed, in plain words.', '',
    'This file is written from the app\'s own **What\'s new** list ([src/whatsnew.js](src/whatsnew.js)) by `node tools/changelog.mjs`, so the two always say the same. To add to the history, add an entry at the top of that list and run the command.', '',
    'Looking for something else? Every deploy to the live site is in [docs/operations/DEPLOYS.md](docs/operations/DEPLOYS.md), what is planned next is in [docs/ROADMAP-REQUIREMENTS.md](docs/ROADMAP-REQUIREMENTS.md), and every single change is in the commit history on GitHub.', '',
    '**Versions:** ' + list.length + ', from ' + day(list[list.length - 1].date) + ' to ' + day(list[0].date) + '. *New* marks something added; *Fix* marks something that was wrong and now works.', ''];
  for (const r of list) {
    out.push('## ' + r.v + ' · ' + day(r.date) + ' · ' + (r.kind === 'FIXES' ? 'Fix' : 'New'), '', '**' + String(r.title || '').trim() + '**' + (r.all ? ' (also shown to customers)' : ''), '');
    for (const n of r.notes || []) out.push('- ' + String(n).replace(/\s+/g, ' ').trim()); out.push('');
  }
  return out.join('\n');
}
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/changelog.mjs')) { fs.writeFileSync('CHANGELOG.md', render(releases(fs.readFileSync('src/whatsnew.js', 'utf8')))); console.log('CHANGELOG.md written'); }
