// Film to VideoHub (25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md, step 4): copies a guide film into its own VideoHub folder so the
// user can watch it in VideoHub's live preview and leave notes on the frames. The folder holds copies of public/films/kit.js, the film (film-core.js) and
// its screens, plus a page (index.html, one 1920x1080 canvas) and film.js, the VideoHub wrapper (window.renderOut(t), READY, VH_SCENES). New folders also
// get VideoHub's render script from its new-film template. Run it again after every change: the open preview reloads itself.
//   node tools/film-videohub.mjs <film id> [films folder, default D:/VideoHub/films]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, films = 'D:/VideoHub/films'] = process.argv.slice(2); if (!id) { console.log('usage: node tools/film-videohub.mjs <film id> [films folder]'); process.exit(1); }
const src = path.join(root, 'public/films'), out = path.join(films, id), tpl = 'D:/Videohub-2.0.1/Videohub-2.0.1/templates/new-film';
if (!fs.existsSync(path.join(src, id + '.js'))) throw new Error('no film public/films/' + id + '.js');
fs.mkdirSync(path.join(out, id), { recursive: true });
for (const f of ['render.js', 'package.json', 'make-audio.js', 'README.md']) if (!fs.existsSync(path.join(out, f)) && fs.existsSync(path.join(tpl, f))) fs.copyFileSync(path.join(tpl, f), path.join(out, f));
fs.copyFileSync(path.join(src, 'kit.js'), path.join(out, 'kit.js')); fs.copyFileSync(path.join(src, id + '.js'), path.join(out, 'film-core.js'));
// its own screens, and the folders of the screens it shares with other films ('team-guide/brd.webp', 'contract-intake/docs.jpg')
const code = fs.readFileSync(path.join(src, id + '.js'), 'utf8'), dirs = new Set([id, ...[...code.matchAll(/'([a-z0-9-]+)\/(?:[a-z0-9+_-]+\.(?:jpg|webp))?'/g)].map(m => m[1])]);
for (const d of dirs) { if (!fs.existsSync(path.join(src, d))) continue; fs.mkdirSync(path.join(out, d), { recursive: true }); for (const f of fs.readdirSync(path.join(src, d))) fs.copyFileSync(path.join(src, d, f), path.join(out, d, f)); }
const title = (/title: '([^']+)'/.exec(fs.readFileSync(path.join(src, id + '.js'), 'utf8')) || [, id])[1];
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n<style>\n  html, body { margin: 0; background: #000; overflow: hidden; }\n  canvas { display: block; width: 100vw; height: 56.25vw; max-height: 100vh; max-width: 177.78vh; margin: auto; }\n</style>\n</head>\n<body>\n<canvas id="c" width="1920" height="1080"></canvas>\n<script src="kit.js"></script>\n<script src="film-core.js"></script>\n<script src="film.js"></script>\n</body>\n</html>\n`);
fs.writeFileSync(path.join(out, 'film.js'), `// VideoHub wrapper for the Delivery Studio film '${id}'. kit.js and film-core.js are copies of public/films/kit.js and public/films/${id}.js in the
// Delivery Studio repo (D:/facilio/facilio-workshop-builder): change them there and run node tools/film-videohub.mjs ${id}, so the Studio and VideoHub show
// the same frames. The film draws on 1280x720; this scales it to 1920x1080.
(function () {
  'use strict';
  const F = window.FWBFilms[${JSON.stringify(id)}], cv = document.getElementById('c'), g = cv.getContext('2d');
  window.VH_SCENES = F.SCENES;
  window.renderOut = t => { g.setTransform(cv.width / F.W, 0, 0, cv.height / F.H, 0, 0); F.draw(g, t); };
  Promise.all([document.fonts && document.fonts.ready, F.load ? F.load('') : null]).then(() => { window.renderOut(0); window.READY = true; });
})();
`);
console.log(`${out}: kit.js, film-core.js, ${fs.readdirSync(path.join(src, id)).length} screens, index.html, film.js (${title})`);
