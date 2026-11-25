// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/photo-check.mjs [baseUrl] [outDir]
// Profile photos (work/server/_photos.mjs, V.face in src/shell.js) at 1366 px against the local preview started with FAKE_GRAPH=1:
// a photo uploaded from the account menu shows on the top bar, on a task card and in the task list (alt = the person's name); "Use my Teams photo"
// replaces it; a picture that fails to load falls back to the initials; Remove brings the initials back.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
// a 300 x 200 PNG made in the page, so the upload exercises the crop and shrink
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const png = Buffer.from(await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#E5197F'; g.fillRect(0, 0, 300, 200); g.fillStyle = '#1570EF'; g.fillRect(100, 50, 100, 100); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d) => (await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: d ? JSON.stringify(d) : undefined })).json();
  const me = (await api('GET', '/auth/me')).user; const pr = (await api('POST', '/projects', { name: 'Photo check', customer: 'Acme' })).project;
  await api('PUT', `/projects/${pr.id}/items/task/t1`, { data: { title: 'Owner has a face', type: 'Other', status: 'To Do', owner: me.email } });
  return pr.id;
});
await p.goto(BASE + `/?nointro#/p/${pid}/tasks`); await p.reload(); await p.waitForSelector('[data-act="tkView"][data-v="board"]', { timeout: 20000 });
await p.click('[data-act="tkView"][data-v="board"]'); await p.waitForSelector('.kb-card');
const face = sel => p.evaluate(sel => { const i = document.querySelector(sel + ' img.av-img'); if (!i) return null; const r = i.getBoundingClientRect(), pa = i.parentElement; return { ok: i.complete && i.naturalWidth > 0, alt: i.alt, src: i.getAttribute('src'), covers: Math.abs(r.width - pa.clientWidth) < 1.5 && Math.abs(r.height - pa.clientHeight) < 1.5 && r.width > 10 }; }, sel);   // fills the circle inside any border ring
const name = await p.evaluate(() => window.FWB.S.user.name);
check('before any upload the top bar and the card show initials only', !(await face('.navbar .avatar')) && !(await face('.kb-card .kb-av')));

await p.click('.navbar .avatar'); await p.waitForSelector('#userPop [data-act="photoPick"]');
check('the account menu offers Upload a photo and Use my Teams photo', !!(await p.$('#userPop [data-act="photoTeams"]')) && /Upload a photo/.test(await p.textContent('#userPop [data-act="photoPick"]')));
const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#userPop [data-act="photoPick"]')]);
await chooser.setFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
await p.waitForSelector('.navbar .avatar img.av-img'); await p.waitForTimeout(800);
const top = await face('.navbar .avatar'), card = await face('.kb-card .kb-av');
check('the uploaded photo shows on the top bar, filling the circle, alt = name', top && top.ok && top.covers && top.alt === name, JSON.stringify(top));
check('the same photo shows on the task card', card && card.ok && card.covers && card.alt === name, JSON.stringify(card));
const stored = await p.evaluate(async src => { const r = await fetch(src); return { ct: r.headers.get('content-type'), n: (await r.arrayBuffer()).byteLength }; }, top.src);
check('the server serves it as a JPEG under 512 KB', stored.ct === 'image/jpeg' && stored.n > 100 && stored.n < 512 * 1024, JSON.stringify(stored));
await p.locator('.kb-card').first().screenshot({ path: OUT + '/photo-card.png' }); await p.locator('.navbar').screenshot({ path: OUT + '/photo-topbar.png' });
await p.click('[data-act="tkView"][data-v="list"]').catch(() => { }); await p.waitForTimeout(600);
const row = await face('td .pt-av'); check('the task list Owner column shows the photo', row && row.ok, JSON.stringify(row));

await p.click('.navbar .avatar'); await p.waitForSelector('#userPop [data-act="photoTeams"]'); await p.waitForTimeout(700); await p.locator('#userPop').screenshot({ path: OUT + '/photo-menu.png' });
await p.click('#userPop [data-act="photoTeams"]'); await p.waitForTimeout(1500);
const teams = await face('.navbar .avatar'); check('Use my Teams photo replaces it (FAKE_GRAPH stand-in)', teams && teams.ok && teams.src !== top.src, JSON.stringify(teams));

await p.evaluate(() => { window.FWB.S.user.photos['nobody@facilio.com'] = 'x1'; const s = document.createElement('span'); s.className = 'kb-av'; s.id = 'broken'; s.textContent = 'NB'; s.insertAdjacentHTML('beforeend', window.FWBViews.face('nobody@facilio.com', 'No Body')); document.body.appendChild(s); });
await p.waitForTimeout(1000); check('a picture that fails to load removes itself and the initials show', !(await p.$('#broken img')) && (await p.textContent('#broken')) === 'NB');

await p.click('.navbar .avatar'); await p.click('#userPop [data-act="photoRemove"]'); await p.waitForTimeout(800);
check('Remove photo brings the initials back', !(await face('.navbar .avatar')) && /\S/.test(await p.textContent('.navbar .avatar')));
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' photo checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
