import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('http://localhost:4173/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects')).json()).projects[0].id);
await p.goto('http://localhost:4173/#/p/' + pid + '/kickoff'); await p.reload(); await p.waitForTimeout(5000);
console.log((await p.textContent('main')).slice(0, 400)); await p.screenshot({ path: '/tmp/claude-0/kdbg.png' }); await b.close();
