// Customer logo isolation: two projects, each with its own logo; replacing one leaves the other alone; default, persistence, exports.
import { setup } from './lib.mjs'; import fs from 'fs'; import { execSync } from 'child_process';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done } = await setup(BASE); const OUT = 'tests/out/'; fs.mkdirSync(OUT, { recursive: true });
// two visibly different PNGs (solid colours) built with node
import zlib from 'zlib';
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })(); const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const solid = (r, g, b) => { const w = 60, h = 20; const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };
fs.writeFileSync(OUT + 'logoA.png', solid(220, 30, 30)); fs.writeFileSync(OUT + 'logoB.png', solid(30, 160, 60)); fs.writeFileSync(OUT + 'logoC.png', solid(30, 60, 220));
const pid1 = await page.evaluate(() => window.FWB.S.project.id);
const imgColor = async () => page.evaluate(async () => { const im = document.querySelector('#drLogo img'); if (!im) return null; await im.decode().catch(() => { }); const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 4, 4); return Array.from(x.getImageData(1, 1, 1, 1).data.slice(0, 3)); });
const upload = async f => { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#drLogoUp')]); await fc.setFiles(OUT + f); await page.waitForSelector('#drLogo img', { timeout: 8000 }); await page.waitForTimeout(1200); };
// second project through the UI
await page.click('[data-act=toProjects]'); await page.waitForSelector('.projects-page'); await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'Second Site'); await page.fill('#np_cust', 'Other Customer Ltd'); await page.fill('#np_start', '2026-12-01'); await page.fill('#np_team [data-p=name]', 'Dinesh R'); await page.fill('#np_code', 'second-access-2026'); await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 }); await page.waitForTimeout(600);
const pid2 = await page.evaluate(() => window.FWB.S.project.id); ok(pid1 !== pid2, 'a second project exists');
const open = async pid => { await page.click('[data-act=toProjects]'); await page.waitForSelector('.projects-page'); await page.click(`[data-act=openProject][data-id="${pid}"], .projects-page [data-id="${pid}"]`); await page.waitForSelector('.shell'); await nav(page, 'dashreport'); await page.waitForSelector('#drLogo'); await page.waitForTimeout(800); };
await nav(page, 'dashreport'); await page.waitForSelector('#drLogo'); ok(!(await page.$('#drLogo img')), 'default: a project with no logo shows none (no inherited logo)');
await upload('logoA.png'); const a = await imgColor(); ok(a && a[0] > 180 && a[1] < 80, 'project 2 shows logo A (red)');
await open(pid1); ok(!(await page.$('#drLogo img')), 'project 1 does not show project 2\'s logo'); await upload('logoB.png'); const b = await imgColor(); ok(b && b[1] > 120 && b[0] < 80, 'project 1 shows its own logo B (green)');
await open(pid2); const a2 = await imgColor(); ok(a2 && a2[0] > 180, 'project 2 still shows logo A after project 1 got a logo');
await upload('logoC.png'); const c2 = await imgColor(); ok(c2 && c2[2] > 180 && c2[0] < 80, 'replacing project 2\'s logo shows C (blue)');
await open(pid1); const b2 = await imgColor(); ok(b2 && b2[1] > 120, 'replacing project 2\'s logo did not change project 1');
// persistence across reload
await page.reload(); await page.waitForSelector('.shell, .projects-page'); await open(pid1).catch(async () => { await nav(page, 'dashreport'); }); const b3 = await imgColor(); ok(b3 && b3[1] > 120, 'project 1 logo persists after reload');
await open(pid2); const c3 = await imgColor(); ok(c3 && c3[2] > 180, 'project 2 logo persists after reload');
// BRD cover uses the same per-project logo
await nav(page, 'brd'); await page.waitForTimeout(1000); const brdC = await page.evaluate(async () => { const im = document.querySelector('.cover img[alt="Customer logo"]'); if (!im) return null; await im.decode().catch(() => { }); const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 4, 4); return Array.from(x.getImageData(1, 1, 1, 1).data.slice(0, 3)); }); ok(brdC && brdC[2] > 180, 'BRD cover of project 2 shows project 2\'s logo');
// exports carry the logo of the open project
await nav(page, 'dashreport'); await page.waitForSelector('#drLogo img');
const dl = async (sel, name) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click(sel)]); await d.saveAs(OUT + name); return OUT + name; };
const x = await dl('#drXlsx', 'logo-p2.xlsx'); ok(/xl\/media\/image\d+\.png/.test(execSync(`unzip -l ${x}`).toString()), 'Excel export contains the logo image'); const pdf = await dl('#drPdf', 'logo-p2.pdf'); let imgs = ''; try { imgs = execSync(`pdfimages -list ${pdf}`).toString(); } catch (e) { } ok(/image/.test(imgs), 'PDF export contains the logo image'); const png = await dl('#drPng', 'logo-p2.png'); ok(fs.statSync(png).size > 5000, 'PNG export built with the logo');
// remove from project 2 only
await page.click('#drLogoDel'); await page.waitForSelector('.dialog'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(800); ok(!(await page.$('#drLogo img')), 'removed from project 2'); await open(pid1); const b4 = await imgColor(); ok(b4 && b4[1] > 120, 'project 1 keeps its logo after project 2\'s was removed');
done();
