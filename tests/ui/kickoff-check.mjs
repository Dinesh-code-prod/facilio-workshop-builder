// Kick-off Deck: no slide rendering; upload a .pptx, read it with AI (the preview server's test double), review, save; the team cards and the
// kick-off summary fill in, and text from the model is shown as text. Usage: node tests/ui/kickoff-check.mjs [base] [deck.pptx]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173', DECK = process.argv[3] || '/tmp/claude-0/fx/kickoff.pptx';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Kick-off check', customer: 'Acme Facilities' }) })).json()).project.id);
await p.goto(BASE + `/#/p/${pid}/kickoff`); await p.reload(); await p.waitForSelector('[data-act="uploadDeck"]');
check('team cards point to Project Settings and the AI reading when empty', /Read the deck with AI/.test(await p.textContent('main')));
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="uploadDeck"] >> nth=0')]); await fc.setFiles(DECK);
await p.waitForSelector('.ki-file', { timeout: 20000 }); check('the deck is kept as a file card, not rendered', !(await p.$('.slide-host, .thumb')) && /kickoff\.pptx/.test(await p.textContent('.ki-file')));
await p.click('[data-act="kiRead"]'); await p.waitForSelector('.ki-pp', { timeout: 30000 });
const rv = await p.$$eval('.ki-pp b', e => e.map(x => x.textContent)); check('AI review lists the people from the governance table', ['Dinesh R', 'Ashwin K', 'Priya Nair', 'Omar Haddad'].every(n => rv.includes(n)), rv.join(', '));
await p.screenshot({ path: 'tests/ui/out/kickoff-review.png' });
await p.click('[data-act="kiSave"]'); await p.waitForTimeout(1500);
const txt = await p.textContent('main'); check('Facilio and customer team cards are filled', /Dinesh R/.test(txt) && /Priya Nair/.test(txt));
check('governance shows the weekly rhythm', /Steering meetings are\s*weekly/i.test(txt));
check('kick-off summary saved (objectives, scope, key dates, next steps)', /Go live with connected CAFM/.test(txt) && /Work orders/.test(txt) && /Share onboarding templates/.test(txt));
check('model text is shown as text, not markup', (await p.$$eval('.ki-sum b', e => e.filter(x => x.textContent === 'markup').length)) === 0 && /markup/.test(txt));
await p.reload(); await p.waitForSelector('.ki-file'); await p.waitForTimeout(1200); check('saved after reload', /Priya Nair/.test(await p.textContent('main')) && /Go live with connected CAFM/.test(await p.textContent('main')));
await p.screenshot({ path: 'tests/ui/out/kickoff-page.png', fullPage: true });
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
