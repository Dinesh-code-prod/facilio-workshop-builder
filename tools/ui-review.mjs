// Screenshots every Project and Admin page of the local preview (tools/devserver.mjs) for visual review.
//   node tools/ui-review.mjs <out-folder> [--width 1440] [--only overview,brd]
// Writes <out>/<width>/<NN>-<page>.png and <out>/<width>/report.json (console errors per page).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright comes from the machine, not this project's dependencies
import fs from 'node:fs';
const out = process.argv[2] || 'docs/ui-review/run'; const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('--width', 1440), H = W < 700 ? 844 : 900, only = (arg('--only', '') || '').split(',').filter(Boolean), BASE = arg('--base', 'http://localhost:8787');
const dir = `${out}/${W}`; fs.mkdirSync(dir, { recursive: true });
const PROJECT = ['overview', 'dashreport', 'proadmap', 'aiwork', 'msaflow', 'contracts', 'kickoff', 'plan', 'timeline', 'onboarding', 'governance', 'changes', 'transcripts', 'usecases', 'checks', 'brd', 'modules', 'flow', 'roles', 'pkgan', 'cfginputs', 'dashboards', 'trace', 'delivery', 'ftr', 'kpi', 'reports', 'guide', 'guidebuilder', 'vidguide', 'hypercare', 'handover', 'portal', 'custintro', 'templates', 'workspace', 'settings'];
const ADMIN = ['dashboard', 'dashboard:delivery', 'dashboard:customers', 'dashboard:usage', 'dashboard:quality', 'projects', 'users', 'access', 'ai', 'activity'];
const b = await chromium.launch(); const report = {}; let n = 0;
const page = await b.newPage({ viewport: { width: W, height: H } });
let errs = []; page.on('pageerror', e => errs.push(String(e.message))); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|favicon|net::/.test(m.text())) errs.push(m.text()); });
const shot = async name => { n++; const f = `${dir}/${String(n).padStart(2, '0')}-${name.replace(/[:/]/g, '-')}.png`;
  // grow the window to the page's own scroll height (inner panes included) so the capture matches what a person scrolls through
  const hh = await page.evaluate(() => { const m = document.querySelector('.main, .adm-main'); const top = m ? m.getBoundingClientRect().top : 0; return Math.max(document.documentElement.scrollHeight, m ? top + m.scrollHeight : 0); });
  await page.setViewportSize({ width: W, height: Math.min(Math.max(hh, H), 4200) }); await page.waitForTimeout(250);
  await page.screenshot({ path: f }); await page.setViewportSize({ width: W, height: H }); report[name] = errs; errs = []; };
const want = k => !only.length || only.includes(k);
const pid = (await (await fetch(BASE + '/api/fn/api/projects')).json()).projects.find(p => p.name === 'Al Moallam').id;
// projects home (the platform signs you in; the welcome screen opens the workspace)
await page.goto(BASE + '/?nointro'); await page.waitForTimeout(1200);
if (await page.$('[data-act=runEnter]')) { if (want('signed-in')) await shot('signed-in'); await page.click('[data-act=runEnter]'); await page.waitForTimeout(1200); }
if (await page.$('.rm, .roadmap, [data-act=rmSkip]')) { const s = await page.$('[data-act=rmSkip], [data-act=rmClose]'); if (s) await s.click(); await page.waitForTimeout(600); }
if (want('projects')) await shot('projects');
for (const v of PROJECT) { if (!want(v)) continue; await page.goto(`${BASE}/?nointro#/p/${pid}/${v}`); await page.reload(); await page.waitForTimeout(1500); await page.evaluate(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }); await shot('p-' + v); }
if (ADMIN.some(want)) {
  await page.goto(BASE + '/?nointro#/projects'); await page.reload(); await page.waitForTimeout(1200); if (await page.$('[data-act=runEnter]')) { await page.click('[data-act=runEnter]'); await page.waitForTimeout(1000); }
  await page.evaluate(() => { const o = document.querySelector('[data-act=openAdmin]'); if (o) o.click(); }); await page.waitForTimeout(1500);
  for (const a of ADMIN) { if (!want(a)) continue; const [sec, tab] = a.split(':'); const s = await page.$(`[data-act=admSec][data-s=${sec}]`); if (s) { await s.click(); await page.waitForTimeout(900); } if (tab) { const t = await page.$(`[data-act=admTab][data-t=${tab}]`); if (t) { await t.click(); await page.waitForTimeout(700); } } await shot('a-' + a.replace(':', '-')); }
}
fs.writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 1));
console.log(`${n} pages captured in ${dir}; pages with console errors:`, Object.entries(report).filter(([, e]) => e.length).map(([k, e]) => k + ' (' + e.length + ')').join(', ') || 'none');
await b.close();
