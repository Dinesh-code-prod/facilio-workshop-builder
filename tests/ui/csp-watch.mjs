// Preload for the browser tests (node --import ./tests/ui/csp-watch.mjs tests/ui/<test>.mjs): every page opened through Playwright
// reports Content-Security-Policy violations ("Refused to ...") to tests/ui/out/csp-violations.txt, so a whole test run doubles as a CSP check.
import { chromium } from 'playwright'; import fs from 'node:fs';
const OUT = process.env.CSP_LOG || 'tests/ui/out/csp-violations.txt'; fs.mkdirSync('tests/ui/out', { recursive: true });
const watch = p => { p.on('console', m => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) fs.appendFileSync(OUT, `[${process.argv[1].split('/').pop()}] ${p.url().slice(0, 80)} :: ${t.slice(0, 400)}\n`); }); return p; };
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => { const b = await launch(...a); const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...x) => { const c = await nc(...x); c.on('page', watch); const cp = c.newPage.bind(c); c.newPage = async () => watch(await cp()); return c; };
  b.newPage = async (...x) => watch(await np(...x)); return b; };
