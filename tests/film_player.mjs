// The guide films play in the page (user, 25 Nov 2026: "why do we have to click a button"), with full screen that Esc, Backspace or Back leaves.
// Checked in a browser (not here): plays on one click, chapters seek, full screen and the fill-the-window fallback, Back stays on the page.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const fp = src('src/filmplayer.js'), cs = src('src/claudesetup.js');
t('the Start here tab puts the player in the page, with the guide export beside it', () => { assert.match(cs, /V\.filmCard\('claude-setup', [^\n]*data-act="clGuideExport"[^\n]*\) \+ '<\/div>'/); assert.match(fp, /V\.filmCard = \(id, title, sub, side\) => `<div class="fp-inline/); assert.doesNotMatch(fp, /fp-scrim|aria-modal/); });
t('Esc and Backspace leave full screen from anywhere, and Back leaves it without leaving the page', () => { assert.match(fp, /e\.key === 'Escape' \|\| e\.key === 'Backspace'\) && isFull\(\)/); assert.match(fp, /addEventListener\('popstate', \(\) => \{ if \(P\.hist && P\.host\) full\(false, true\)/); assert.match(fp, /requestFullscreen\(\)\.then\(done, max\)/); });
t('every film in V.FILMS loads on the shared kit, its chapters cover the whole film, its length matches the list and its screens are there', () => {
  const list = [...fp.matchAll(/\['([a-z-]+)', '[^']+', '(?:[^'\\]|\\.)*', (\d+), '([a-z]+)'\]/g)].map(m => [m[1], +m[2]]); assert.ok(list.length >= 4, 'V.FILMS has the films');
  for (const [id, secs] of list) { const ctx = {}; vm.runInNewContext(src('public/films/kit.js') + '\n' + src('public/films/' + id + '.js'), ctx); const f = (ctx.FWBFilms || {})[id]; assert.ok(f, 'FWBFilms.' + id);
    assert.equal(f.SCENES[0].t0, 0, id); assert.equal(f.SCENES[f.SCENES.length - 1].t1, f.DUR, id); assert.equal(f.DUR, secs, id + ' length in V.FILMS'); assert.equal(f.scenes ? f.scenes.length : f.SCENES.length, f.SCENES.length, id + ' one drawing per scene');
    for (const k of f.FILES || []) assert.ok(fs.existsSync(new URL('../public/films/' + id + '/' + k + '.jpg', import.meta.url)), id + '/' + k + '.jpg'); } });
t('a poster loads nothing until it is pressed; a page redraw fills in only the open film again', () => { assert.match(fp, /ACT\.filmOpen = async a =>/); assert.ok(fp.includes('.fp-inline[data-film="${P.id}"]:not([data-on])'), 'a redraw refills only the open film'); assert.ok(!fp.includes(".fp-inline:not([data-on])').forEach(mount)"), 'no film loads before it is pressed'); });
console.log(n + ' film player checks passed');
