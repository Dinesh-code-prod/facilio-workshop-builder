// CHANGELOG.md (the history at the top of the repository) says exactly what the app's What's new list says (src/whatsnew.js). If this fails, run: node tools/changelog.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { releases, render } from '../tools/changelog.mjs';
const list = releases(fs.readFileSync('src/whatsnew.js', 'utf8')); const norm = s => s.replace(/\r\n/g, '\n');
assert.ok(list.length > 30, 'the history has its versions'); for (const r of list) { assert.match(r.v, /^\d+\.\d+\.\d+$/, 'version ' + r.v); assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, 'date of ' + r.v); assert.ok(r.title && r.notes && r.notes.length, 'title and notes of ' + r.v); }
assert.deepEqual(list.map(r => r.date), list.map(r => r.date).slice().sort().reverse(), 'newest first');
assert.equal(norm(fs.readFileSync('CHANGELOG.md', 'utf8')), render(list), 'CHANGELOG.md is out of step with src/whatsnew.js: run node tools/changelog.mjs');
for (const f of ['README.md', 'docs/README.md', 'src/README.md', 'work/README.md', 'tests/README.md', 'tools/README.md', 'public/README.md', 'vendor/README.md', 'data/README.md', 'skills/README.md', '.github/README.md', '.claude/README.md']) assert.ok(fs.existsSync(f), 'every folder has a guide: ' + f);
assert.match(fs.readFileSync('README.md', 'utf8'), /\[CHANGELOG\.md\]\(CHANGELOG\.md\)/, 'the front page links the history');
console.log('  ok  the history file matches the app, is newest first, and every folder has a guide\n1 changelog check passed');
