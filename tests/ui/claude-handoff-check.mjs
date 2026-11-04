// Open in Claude from the Process Whiteboard "Describe with AI" box: the panel opens, the three Open buttons and Copy work, a pasted reply comes back as a checked preview.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Handoff', customer: 'H' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1200);
await p.route('**/me/connector', r => r.fulfill({ contentType: 'application/json', body: '{"seen":null}' })); await p.evaluate(() => localStorage.setItem('fwb_claude_conn', '0'));   // the connector is the default for every button: these first checks are about the full-prompt path, so it is turned off here
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Handoff'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(400);
await p.click('[data-act="wbAiText"]'); await p.fill('#wbAiT', 'A client raises a request, the approver approves or rejects it, approved becomes a work order.');
await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; window.FWBViews.claudeNav = u => window.__opened.push('NAV ' + u); });
await p.click('#drawer [data-act="wbAiClaude"]:not([data-add])'); await p.waitForSelector('[data-act="hoGo"]', { timeout: 8000 });
check('the Open in Claude panel shows the three open buttons and the reply box', (await p.locator('[data-act="hoGo"]').count()) === 3 && (await p.locator('#hoR').count()) === 1);
await p.evaluate(() => { localStorage.removeItem('fwb_claude_conn'); window.__opened = []; }); await p.click('[data-act="hoGo"][data-d="web"]'); await p.waitForTimeout(1800); { const od = await p.evaluate(() => window.__opened.map(u => { try { return decodeURIComponent(u); } catch (e) { return u; } })); check('by default (connector not turned off) Open Claude Web sends the short prompt that tells Claude to use the connector and fetch everything itself', od.some(u => /get_handoff/.test(u) && /fetch everything/.test(u) && u.length < 1500), od.map(u => u.length).join(',')); }
await p.evaluate(() => { localStorage.setItem('fwb_claude_conn', '0'); window.__opened = []; });
await p.click('[data-act="hoGo"][data-d="web"]'); await p.waitForTimeout(500); let o = await p.evaluate(() => window.__opened);
check('Open Claude Web opens claude.ai and, as the prompt is too long for a link, copies it and says so', o.includes('https://claude.ai/new') && /DESCRIPTION OF THE PROCESS/.test(await p.evaluate(() => navigator.clipboard.readText())) && /Ctrl\+V/.test(await p.evaluate(() => document.body.innerText)));
await p.click('[data-act="hoGo"][data-d="desktop"]'); await p.waitForTimeout(500); o = await p.evaluate(() => window.__opened);
check('Open Claude Desktop opens a claude:// link', o.includes('NAV claude://claude.ai/new'), o.join(' | '));
await p.click('[data-act="hoGo"][data-d="copy"]'); await p.waitForTimeout(600); const clip = await p.evaluate(() => navigator.clipboard.readText());
check('Copy Prompt and Open Claude puts the whole prompt on the clipboard and opens claude.ai', /DESCRIPTION OF THE PROCESS/.test(clip) && (await p.evaluate(() => window.__opened)).some(u => u === 'https://claude.ai/new'), clip.length + ' chars');
// with the connector ticked, Open Claude sends a short prompt that names the connector tool and the hand-off id
await p.check('[data-change="hoConn"]'); await p.evaluate(() => { window.__opened = []; }); await p.click('[data-act="hoGo"][data-d="web"]'); await p.waitForTimeout(1500); o = await p.evaluate(() => window.__opened);
check('with the connector added, Open Claude Web puts a short connector prompt in the link', o.some(u => u.startsWith('https://claude.ai/new?q=') && /get_handoff/.test(decodeURIComponent(u)) && /[0-9a-f]{32}/.test(decodeURIComponent(u))), o.map(u => decodeURIComponent(u).slice(0, 120)).join(' | '));
await p.uncheck('[data-change="hoConn"]');
const reply = JSON.stringify({ title: 'T', nodes: [{ id: 'n1', label: 'Client raises request', kind: 'start', confidence: 'detected' }, { id: 'n2', label: 'Approved', kind: 'end', confidence: 'detected' }], edges: [{ from: 'n1', to: 'n2', label: '', confidence: 'detected' }], useFlows: [], notes: '' });
await p.fill('#hoR', 'Here is the flow:\n```json\n' + reply + '\n```'); await p.click('[data-act="hoBack"]'); await p.waitForSelector('[data-wbn]', { timeout: 8000 });
check("Claude's reply (with prose and a code fence around it) comes back as a checked preview", (await p.locator('[data-wbn]').count()) === 2);
check('no page errors', !errs.length, errs.slice(0, 3).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
