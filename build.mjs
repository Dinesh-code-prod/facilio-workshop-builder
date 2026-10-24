// Build: bundle the app scripts into dist/app.<hash>.js and the styles into dist/app.<hash>.css, copy vendored libraries
// and templates. No inline scripts, so the Content-Security-Policy can use script-src 'self'.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const here = path.dirname(new URL(import.meta.url).pathname);
const r = p => fs.readFileSync(path.join(here, p), 'utf8');
const RUN = process.env.FWB_TARGET === 'run'; // Facilio Run build: backend runs in the page (src/runapi.js), output goes to dist-run/
const APP = ['src/intro.js', 'src/parser.js', 'src/core.js'].concat(RUN ? ['src/runapi.js'] : [], ['src/api.js', 'src/textgen.js', 'src/diagrams.js', 'src/ficons.js', 'src/shell.js', 'src/items.js', 'src/module.js', 'src/flowbuilder.js', 'src/flowimport.js', 'src/roles.js', 'src/transcripts.js', 'src/planner.js', 'src/viewers.js', 'src/plan.js', 'src/xlseditor.js', 'src/guidelib.js', 'src/guidelearn.js', 'src/guide.js', 'src/governance.js', 'src/timeline.js', 'src/delivery.js', 'src/contract.js', 'src/usecases.js', 'src/extras.js', 'src/portal.js', 'src/onboarding.js', 'src/howto.js', 'src/checks.js', 'src/overview.js', 'src/settings.js', 'src/brd.js', 'src/brdview.js', 'src/sourcecheck.js', 'src/schedulediff.js', 'src/msaflow.js', 'src/contracts.js', 'src/schedaud.js', 'src/dashreport.js', 'src/admin.js', 'src/roadmap.js', 'src/pwtoggle.js']);
const dist = path.join(here, RUN ? 'dist-run' : 'dist'); fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
let js = APP.map(f => `/* ${f} */\n${r(f)}`).join('\n;\n'); let css = r('src/styles.css');
// minify (smaller download = faster first load); falls back to the readable bundle if esbuild is not installed or FWB_NO_MINIFY=1
const raw = { js: js.length, css: css.length };
if (process.env.FWB_NO_MINIFY !== '1') { try { const { transformSync } = await import('esbuild'); js = transformSync(js, { minify: true, target: 'es2020', legalComments: 'none' }).code; css = transformSync(css, { loader: 'css', minify: true }).code; } catch (e) { console.log('minify skipped:', e.message.split('\n')[0]); } }
const jsName = `app.${hash(js)}.js`, cssName = `app.${hash(css)}.css`;
fs.writeFileSync(path.join(dist, jsName), js); fs.writeFileSync(path.join(dist, cssName), css);
const html = r('src/template.html').replace('<!--__CSS__-->', `<link rel="stylesheet" href="${cssName}">`).replace('<!--__SCRIPTS__-->', `<script src="${jsName}" defer></script>`);
if (/<script(?![^>]*\ssrc=)[^>]*>/i.test(html)) throw new Error('inline script found in template');
fs.writeFileSync(path.join(dist, 'index.html'), html);
const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) { const a = path.join(from, f), b = path.join(to, f); if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b); } };
copyDir(path.join(here, 'vendor'), path.join(dist, 'vendor'));
copyDir(path.join(here, 'public'), dist);
if (RUN) { // static reference configuration + no Netlify headers file
  const rd = await import('./server/reference-data.mjs'); fs.writeFileSync(path.join(dist, 'reference.dat'), Buffer.from(rd.REFERENCE_GZ_B64, 'base64')); fs.writeFileSync(path.join(dist, 'reference-meta.json'), JSON.stringify(rd.REFERENCE_META)); fs.rmSync(path.join(dist, '_headers'), { force: true });
}
console.log('built', jsName, (js.length / 1024).toFixed(0) + ' KB (from ' + (raw.js / 1024).toFixed(0) + '),', cssName, (css.length / 1024).toFixed(0) + ' KB');
