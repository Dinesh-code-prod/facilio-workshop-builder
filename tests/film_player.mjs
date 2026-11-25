// The setup film plays in the page (user, 25 Nov 2026: "why do we have to click a button"), with full screen that Esc, Backspace or Back leaves.
// Checked in a browser (not here): plays on one click, chapters seek, full screen and the fill-the-window fallback, Back stays on the page.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const fp = src('src/filmplayer.js'), cs = src('src/claudesetup.js');
t('the Start here tab puts the player in the page, with the guide export beside it', () => { assert.match(cs, /V\.filmCard\('claude-setup', [^\n]*data-act="clGuideExport"[^\n]*\) \+ '<\/div>'/); assert.match(fp, /V\.filmCard = \(id, title, sub, side\) => `<div class="fp-inline"/); assert.doesNotMatch(fp, /fp-scrim|aria-modal/); });
t('Esc and Backspace leave full screen from anywhere, and Back leaves it without leaving the page', () => { assert.match(fp, /e\.key === 'Escape' \|\| e\.key === 'Backspace'\) && isFull\(\)/); assert.match(fp, /addEventListener\('popstate', \(\) => \{ if \(P\.hist && P\.host\) full\(false, true\)/); assert.match(fp, /requestFullscreen\(\)\.then\(done, max\)/); });
t('the film code loads and its chapters cover the whole film', () => { const ctx = {}; vm.runInNewContext(src('public/films/claude-setup.js'), ctx); const f = (ctx.FWBFilms || {})['claude-setup']; assert.ok(f, 'FWBFilms.claude-setup'); assert.equal(f.SCENES[0].t0, 0); assert.equal(f.SCENES[f.SCENES.length - 1].t1, f.DUR); });
console.log(n + ' film player checks passed');
