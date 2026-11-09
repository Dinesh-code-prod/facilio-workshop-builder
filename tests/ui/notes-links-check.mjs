// Notes & Links (9 Nov 2026) in a real browser: private notes, clickable addresses in notes, pasted links typed and named for you, link cards that open the destination, filter chips with counts.
// Usage: node tests/ui/notes-links-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
await p.goto(BASE + `/?nointro#/p/${pid}/resources`); await p.reload(); await p.waitForSelector('.rs', { timeout: 20000 }); await p.addStyleTag({ content: '*{animation:none !important;transition:none !important}' }); await p.waitForTimeout(500);
const base = await p.evaluate(() => ({ tabs: document.querySelectorAll('.rs > .seg button').length, cards: document.querySelectorAll('.rs-note').length, chips: document.querySelectorAll('.rs-chips .rs-chip').length, scope: [...document.querySelectorAll('.rs-bar .seg button')].map(x => x.textContent.trim()) }));
check('two tabs, note cards, category chips and a Team / Only me switch', base.tabs === 2 && base.cards >= 1 && base.chips >= 6 && base.scope.length === 3 && /Only me/.test(base.scope[2]), JSON.stringify(base));
// a private note with a web address in it
await p.click('[data-act="noteAdd"]'); await p.waitForSelector('#ntT'); await p.fill('#ntT', 'My own reminder'); await p.fill('#ntB', 'Chase the vendor about https://example.com/quote?id=7&x=1. Then call back.');
check('the note form offers a Private switch', await p.isVisible('#ntP'));
await p.check('#ntP'); await p.click('[data-act="noteSave"]'); await p.waitForSelector('.rs-note.priv', { timeout: 10000 }); await p.waitForTimeout(300);
const priv = await p.evaluate(() => { const c = document.querySelector('.rs-note.priv'), a = c && c.querySelector('a.rs-a'); return { lock: !!(c && c.querySelector('.rs-lock')), href: a && a.getAttribute('href'), target: a && a.target, rel: a && a.rel, text: a && a.textContent, after: a && c.querySelector('.rs-prev').textContent.includes('Then call back') }; });
check('the private note shows a lock and a dashed card', priv.lock);
check('the address in the note is a link that opens in a new tab (the full stop is not part of it)', priv.href === 'https://example.com/quote?id=7&x=1' && priv.target === '_blank' && /noopener/.test(priv.rel || '') && priv.after, JSON.stringify(priv));
await p.click('.rs-bar .seg button:nth-child(3)'); await p.waitForTimeout(200);
check('"Only me" lists the private note', (await p.locator('.rs-note').count()) === 1 && (await p.locator('.rs-note.priv').count()) === 1);
await p.click('.rs-bar .seg button:nth-child(2)'); await p.waitForTimeout(200);
check('"Team" hides it', (await p.locator('.rs-note.priv').count()) === 0 && (await p.locator('.rs-note').count()) >= 1);
await p.click('.rs-bar .seg button:nth-child(1)'); await p.waitForTimeout(200);
await p.click('.rs-note.priv .rs-tl'); await p.waitForSelector('.rs-read'); const read = await p.evaluate(() => ({ lock: !!document.querySelector('.rs-rd .rs-lock'), link: document.querySelector('.rs-read a.rs-a') && document.querySelector('.rs-read a.rs-a').href }));
check('reading the note shows the clickable link and the private badge', read.lock && /example\.com\/quote/.test(read.link || ''), JSON.stringify(read));
await p.click('#drawer [data-act="closeDrawer"]');
// links: paste an address -> the form opens with the type and a name filled in
await p.click('[data-act="resTab"][data-v="links"]'); await p.waitForSelector('#resQuick'); await p.fill('#resQuick', 'https://miro.com/app/board/uXjVKickoff-flow/'); await p.press('#resQuick', 'Enter'); await p.waitForSelector('#rsU');
const f = await p.evaluate(() => ({ url: document.getElementById('rsU').value, name: document.getElementById('rsN').value, type: document.getElementById('rsT').value }));
check('a pasted Miro address is typed "Miro board" and named', f.type === 'Miro board' && /uXjVKickoff flow/.test(f.name) && /miro\.com/.test(f.url), JSON.stringify(f));
await p.click('[data-act="resSave"]'); await p.waitForSelector('.rs-link', { timeout: 10000 }); await p.waitForTimeout(300);
const lk = await p.evaluate(() => { const c = [...document.querySelectorAll('.rs-link')].find(x => /miro/i.test(x.textContent)), a = c && c.querySelector('.rs-ln'), o = c && c.querySelector('.rs-la a.btn'); return { href: a && a.getAttribute('href'), same: o && o.getAttribute('href') === (a && a.getAttribute('href')), target: a && a.target, host: c && c.querySelector('.rs-lh').textContent, tile: c && c.querySelector('.rs-ico').textContent, chips: [...document.querySelectorAll('.rs-chips .rs-chip')].map(x => x.textContent), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
check('the link card opens the destination in a new tab, from the name and from Open', lk.href === 'https://miro.com/app/board/uXjVKickoff-flow/' && lk.same && lk.target === '_blank', JSON.stringify(lk).slice(0, 160));
check('the card shows the host and type, and the type chip counts it', /miro\.com/.test(lk.host) && lk.tile === 'Miro' && lk.chips.some(c => /Miro board1/.test(c)), lk.host + ' | ' + lk.chips.join(','));
await p.click('.rs-chips .rs-chip:has-text("Miro board")'); await p.waitForTimeout(200); const filtered = await p.locator('.rs-link').count(); check('the type chip filters the cards', filtered === 1, String(filtered));
check('no sideways scrolling', !lk.overflow);
// clean up what this run added
await p.evaluate(async id => { for (const [k, q] of [['res', 'Miro'], ['pnote', 'My own reminder']]) { const l = await (await fetch(`/api/fn/api/projects/${id}/items?kinds=${k}`)).json().catch(() => null); (l && l.items || []).filter(i => JSON.stringify(i.data).includes(q)).forEach(i => fetch(`/api/fn/api/projects/${id}/items/${k}/${i.id}`, { method: 'DELETE' })); } }, pid).catch(() => { });
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
