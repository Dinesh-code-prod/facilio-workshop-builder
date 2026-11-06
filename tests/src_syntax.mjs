// Every browser source file must parse: a stray quote once blanked the whole live app while the other tests still passed.
import { readdirSync, readFileSync } from 'node:fs'; import { execFileSync } from 'node:child_process';
const bad = readdirSync('src').filter(f => f.endsWith('.js')).filter(f => { try { execFileSync(process.execPath, ['--check', 'src/' + f], { stdio: 'pipe' }); return false; } catch (e) { console.error(f + ': ' + String(e.stderr).split('\n').slice(0, 4).join(' ')); return true; } });
if (bad.length) { console.error('syntax errors in: ' + bad.join(', ')); process.exit(1); } console.log('all browser source files parse');
