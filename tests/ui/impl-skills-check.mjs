// Claude setup (Help group): the Facilio skills tab opens, has its five parts, shows no login or key, the Connect tab says whether the connector has been seen, and Project Settings no longer has a Claude tab.
// Usage: PW_CHANNEL=msedge node tests/ui/impl-skills-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Skills Guide Demo', customer: 'Skills Co' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/claudesetup`); await p.reload(); await p.waitForSelector('.tab[data-v="skills"]', { timeout: 30000 });
await p.click('.tab[data-v="skills"]'); await p.waitForTimeout(600);
const heads = await p.locator('.page-body .card-h h3').allTextContents();
check('the tab shows the five parts of the guide', ['The Facilio Implementation Toolbox', 'Where each tool runs', 'Set up once on your computer', 'Install it in Claude', 'If something does not work'].every(h => heads.includes(h)), heads.join(' | '));
const text = await p.textContent('.page-body');
check('it names the launcher skill and the hub', /\/facilio-impl-toolbox/.test(text) && /impl-ai-hub\.facilio\.run/.test(text));
check('it tells people to ask for the repository login and shows none', /ask the implementation platform team/i.test(text) && !/ATATT|app password\s*[:=]/i.test(text) && !/implementation-aitools@/.test(text));
check('the page is one width (no sideways scroll)', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
if (OUT) await p.screenshot({ path: `${OUT}/impl-skills.png`, fullPage: false });
await p.click('.tab[data-v="how"]'); await p.waitForTimeout(400); check('the How it works tab explains Open in Claude', /unapproved draft/.test(await p.textContent('.page-body')));
await p.click('.tab[data-v="connect"]'); await p.waitForTimeout(900);
const st = (await p.textContent('#hoConnSt').catch(() => '')) || '';
check('the Connect tab says whether the connector has been seen', /Not seen yet|Your Claude used the connector/.test(st), st.trim().slice(0, 80));
await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('.tab[data-v="audit"]', { timeout: 30000 });
check('Project Settings no longer carries a Claude tab', (await p.locator('.tab[data-v="claude"], .tab[data-v="skills"]').count()) === 0);
check('the menu has Claude setup in the Help group', (await p.locator('.sb-item', { hasText: 'Claude setup' }).count()) === 1);
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
