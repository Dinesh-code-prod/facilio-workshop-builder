/* Shell: authentication, project list & creation, workspace navigation, shared UI utilities, event delegation. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const API = root.FWBApi;
  const V = root.FWBViews = root.FWBViews || {};
  const ACT = V.ACT = V.ACT || {};

  // ---------- icons ----------
  const ICON = {
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    clip: '<path d="M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', play: '<path d="M8 5v14l11-7z"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>', deck: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>', plan: '<path d="M4 5h16M4 10h10M4 15h13M4 20h7"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>', dash: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
    modules: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', flow: '<rect x="2" y="9" width="7" height="5" rx="1"/><rect x="15" y="3" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M9 11.5h3v-6h3M12 11.5v7h3"/>',
    roles: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c2.8-.4 4.8 1.2 5.5 4.4"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    check: '<path d="M4 12.5 9.5 18 20 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>', plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upl: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', arr: '<path d="M9 6l6 6-6 6"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8v6M8 11h6"/>', zoomout: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6"/>'
  };
  const ico = (n, cls) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls || ''}" aria-hidden="true">${ICON[n] || ''}</svg>`;

  // ---------- UI utilities ----------
  function toast(msg, ms, err) { if (V.ui && V.ui.toast) return V.ui.toast(msg, ms, err); const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg; const prev = [...document.querySelectorAll('.toast')]; if (prev.length) { const last = prev[prev.length - 1].getBoundingClientRect(); t.style.bottom = Math.round(window.innerHeight - last.top + 8) + 'px'; } document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2800); }   // several toasts stack instead of covering each other
  /* Facilio loader: branded veil that fades in, stays at least 500 ms so it never flashes, then fades out. Used when opening the workspace, a project, or switching between Projects and Admin. */
  let loadAt = 0, loadTimer = 0;
  function loading(on, msg) {
    let el = document.getElementById('loading');
    if (!on) { if (!el) return; const wait = Math.max(0, 500 - (Date.now() - loadAt)); clearTimeout(loadTimer); loadTimer = setTimeout(() => { const e = document.getElementById('loading'); if (!e) return; e.classList.add('out'); setTimeout(() => { const x = document.getElementById('loading'); if (x && x.classList.contains('out')) x.remove(); }, 380); }, wait); return; }
    clearTimeout(loadTimer); if (!el) { el = document.createElement('div'); el.id = 'loading'; el.className = 'loading fxl'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); loadAt = Date.now(); } el.classList.remove('out');
    el.innerHTML = `<div class="fxl-in"><img src="brand/logo-white.png" alt="Facilio" height="34"><div class="fxl-bar" aria-hidden="true"><span></span></div><div id="loadingMsg" class="fxl-msg">${esc(msg || 'Working…')}</div></div>`;
  }
  function loadingMsg(m) { const e = document.getElementById('loadingMsg'); if (e) e.textContent = m; }
  const tag = (cls, text) => `<span class="tag ${esc(cls)}">${esc(text)}</span>`;
  const statusTag = st => tag(st, { existing: 'Existing', proposed: 'Proposed', modified: 'Modified', removed: 'Proposed removal' }[st] || st);
  function sel(name, opts, val, attrs) { return `<select ${attrs || ''} ${name ? `data-bind="${esc(name)}"` : ''}>${opts.map(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`; }
  function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
  function setPath(o, p, v) { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach(k => { if (c[k] == null || typeof c[k] !== 'object') c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
  // data-bind paths: "workshop path" (default) or "@section:path" for other project documents
  function bindTarget(p) { if (p[0] === '@') { const i = p.indexOf(':'); const sec = p.slice(1, i); return { obj: sec === 'workshop' ? S.ws : F.doc(sec), path: p.slice(i + 1), section: sec }; } return { obj: S.ws, path: p, section: 'workshop' }; }
  function inp(path, ph, type, attrs) { const t = bindTarget(path); const v = getPath(t.obj, t.path); return `<input type="${type || 'text'}" data-bind="${esc(path)}" value="${esc(v == null ? '' : v)}" placeholder="${esc(ph || '')}" ${S.readonly ? 'disabled' : ''} ${attrs || ''}>`; }
  function ta(path, ph, rows) { const t = bindTarget(path); const v = getPath(t.obj, t.path); return `<textarea data-bind="${esc(path)}" rows="${rows || 3}" placeholder="${esc(ph || '')}" ${S.readonly ? 'disabled' : ''}>${esc(v || '')}</textarea>`; }
  function sw(path, on, attrs) { return `<label class="switch"><input type="checkbox" ${path ? `data-bind="${esc(path)}"` : ''} ${on ? 'checked' : ''} ${S.readonly ? 'disabled' : ''} ${attrs || ''}><span></span></label>`; }
  function drawer(title, body, foot, opts) { closeDrawer(); const d = document.createElement('div'); d.className = 'scrim mk'; d.id = 'drawer'; d.innerHTML = `<div class="drawer${opts && opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="drawer-h"><h2>${esc(title)}</h2><button class="btn ghost icon" data-act="closeDrawer" aria-label="Close" title="Close">${ico('x')}</button></div><div class="drawer-b">${body}</div>${foot === false ? '' : `<div class="drawer-f">${foot || '<button class="btn" data-act="closeDrawer">Close</button>'}</div>`}</div>`; d.addEventListener('mousedown', e => { if (e.target === d) closeDrawer(); }); document.body.appendChild(d); if (V.motion) V.motion.open(d); const f = d.querySelector('.drawer-b input:not([type=checkbox]),.drawer-b select,.drawer-b textarea'); if (f) f.focus(); return d; }
  function closeDrawer() { const d = document.getElementById('drawer'); if (d) { if (V.motion) V.motion.close(d); else d.remove(); } }
  function confirmDialog(title, msg, okLabel, danger) {
    return new Promise(res => { const d = document.createElement('div'); d.className = 'scrim center mk'; d.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true"><div class="dialog-h">${esc(title)}</div><div class="dialog-b">${esc(msg)}</div><div class="dialog-f"><button class="btn" data-r="0">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(okLabel || 'Confirm')}</button></div></div>`;
      d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b || e.target === d) { if (V.motion) V.motion.close(d); else d.remove(); res(!!(b && b.getAttribute('data-r') === '1')); } }); document.body.appendChild(d); if (V.motion) V.motion.open(d); d.querySelector('[data-r="1"]').focus(); });
  }
  // files are never handed over empty; the object URL stays alive long enough for large files to finish saving
  function download(name, data, mime) { const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }); if (!blob.size) throw new Error('The file came out empty, so it was not downloaded. Please report this.'); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000); }
  // images for Word and Excel files: those formats take PNG or JPEG only, so the real type is read from the bytes and
  // anything else (WebP, GIF, SVG, BMP) is redrawn as PNG. Returns { u8, type: 'png' | 'jpg', ext: 'png' | 'jpeg', mime, w, h }.
  async function docImage(blob) {
    let u8 = new Uint8Array(await blob.arrayBuffer()); let type = u8[0] === 0x89 && u8[1] === 0x50 ? 'png' : u8[0] === 0xFF && u8[1] === 0xD8 ? 'jpg' : '';
    let bm = null; try { bm = await createImageBitmap(blob); } catch (e) { }
    if (!type) { if (!bm) throw new Error('Unsupported image'); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); const png = await new Promise(r => c.toBlob(r, 'image/png')); u8 = new Uint8Array(await png.arrayBuffer()); type = 'png'; }
    const w = bm ? bm.width : 800, h = bm ? bm.height : 450; if (bm && bm.close) bm.close();
    return { u8, type, ext: type === 'png' ? 'png' : 'jpeg', mime: type === 'png' ? 'image/png' : 'image/jpeg', w, h };
  }
  // Word: text pasted from Office or PDFs can carry control characters (vertical tab, bell, form feed) that are not allowed in
  // XML, and Word then refuses the whole file. Every exported TextRun and the document properties pass through xmlSafe.
  const xmlSafe = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, ' ');
  async function loadDocx() {
    if (!root.docx) await loadScript('vendor/docx.iife.js'); const X = root.docx; if (!X || !X.Packer) throw new Error('The Word library did not load. Reload the page and try again.');
    if (!X.__safe) { const T = X.TextRun, D = X.Document; const clean = o => typeof o === 'string' ? xmlSafe(o) : o && typeof o.text === 'string' ? Object.assign({}, o, { text: xmlSafe(o.text) }) : o;
      X.TextRun = class extends T { constructor(o) { super(clean(o)); } };
      X.Document = class extends D { constructor(o) { const p = Object.assign({}, o); ['title', 'subject', 'creator', 'description', 'keywords', 'lastModifiedBy'].forEach(k => { if (typeof p[k] === 'string') p[k] = xmlSafe(p[k]); }); super(p); } }; X.__safe = true; }
    return X;
  }
  // PDF (pdfmake): the bundled Roboto has no Arabic letters, so Arabic text came out blank. Arabic runs are drawn with Noto Sans
  // Arabic (shaped by the PDF engine) and the words of each run are put in visual right-to-left order.
  const ARC = '؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿'; const AR1 = new RegExp('[' + ARC + ']'), ARR = new RegExp('([' + ARC + ']+(?:[\\s،؛؟]+[' + ARC + ']+)*)');
  const arRuns = s => String(s).split(ARR).filter(x => x !== '').flatMap(x => AR1.test(x) ? x.split(/\s+/).reverse().flatMap((w, i) => (i ? [{ text: ' ' }] : []).concat([{ text: w, font: 'NotoArabic' }])) : [{ text: x }]); // spaces kept as separate runs: a space inside a right-to-left run would be drawn on the wrong side
  function pdfArabic(n) {
    if (typeof n === 'string') return AR1.test(n) ? { text: arRuns(n) } : n; if (Array.isArray(n)) return n.map(pdfArabic); if (!n || typeof n !== 'object') return n;
    const o = Object.assign({}, n); if (typeof o.text === 'string' && AR1.test(o.text)) o.text = arRuns(o.text); else if (Array.isArray(o.text)) o.text = o.text.flatMap(t => typeof t === 'string' ? (AR1.test(t) ? arRuns(t) : [t]) : [pdfArabic(t)]);
    ['stack', 'columns', 'ul', 'ol'].forEach(k => { if (Array.isArray(o[k])) o[k] = pdfArabic(o[k]); }); if (o.table && Array.isArray(o.table.body)) o.table = Object.assign({}, o.table, { body: o.table.body.map(r => Array.isArray(r) ? r.map(pdfArabic) : r) }); return o;
  }
  let pdfReady = null;
  async function loadPdfMake() {
    await loadScript('vendor/pdfmake.min.js'); await loadScript('vendor/vfs_fonts.js'); const pm = root.pdfMake; if (!pm || !pm.createPdf) throw new Error('The PDF library did not load. Reload the page and try again.');
    if (!pdfReady) pdfReady = (async () => { try { const r = await fetch('vendor/fonts/NotoSansArabic-Regular.ttf'); if (!r.ok) throw new Error(r.status); const u = new Uint8Array(await r.arrayBuffer()); let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      const A = 'NotoSansArabic-Regular.ttf'; const vfs = Object.assign({}, root.vfs || pm.vfs || {}, { [A]: btoa(b) }); if (pm.addVirtualFileSystem) pm.addVirtualFileSystem(vfs); pm.vfs = vfs; // vfs_fonts.js declares the Roboto files as the global `vfs`
      const fonts = Object.assign({ Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' } }, pm.fonts || {}, { NotoArabic: { normal: A, bold: A, italics: A, bolditalics: A } }); if (pm.setFonts) pm.setFonts(fonts); pm.fonts = fonts;
      const create = pm.createPdf; const fix = f => typeof f === 'function' ? (...a) => pdfArabic(f(...a)) : pdfArabic(f);
      pm.createPdf = (dd, ...rest) => create.call(pm, Object.assign({}, dd, { content: pdfArabic(dd.content), header: dd.header && fix(dd.header), footer: dd.footer && fix(dd.footer) }), ...rest); } catch (e) { console.warn('Arabic PDF font not loaded', e); pdfReady = null; } })();
    await pdfReady; return pm;
  }
  function sheetName(wb, name) { const base = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet'; const taken = new Set(wb.worksheets.map(w => w.name.toLowerCase())); let n = base, i = 2; while (taken.has(n.toLowerCase())) { const sfx = ' (' + i++ + ')'; n = base.slice(0, 31 - sfx.length) + sfx; } return n; }
  function pickFile(accept, multiple) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.multiple = !!multiple; i.onchange = () => res(Array.from(i.files)); i.click(); }); }
  // one shared promise per library: a second caller waits for the same load, and a failed load can be retried
  const scriptLoads = {};
  // Reads the XML (or other matching) files out of an uploaded ZIP with limits, so a crafted archive cannot exhaust the tab: at most
  // maxEntries files, at most maxBytes once unpacked (checked from the ZIP's own size records before unpacking, then while reading),
  // and entries with absolute or parent (..) paths are skipped.
  async function zipTexts(file, accept, o) {
    o = o || {}; const maxEntries = o.maxEntries || 6000, maxBytes = o.maxBytes || 150 * 1024 * 1024; await loadScript('vendor/jszip.min.js');
    let zip; try { zip = await root.JSZip.loadAsync(file); } catch (e) { throw new Error('This file could not be opened as a ZIP. It may be damaged or password protected.'); }
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir); if (names.length > maxEntries) throw new Error('The ZIP holds ' + names.length + ' files, more than the ' + maxEntries + ' this screen reads.');
    const pick = names.filter(n => !/(^|[\/\\])\.\.([\/\\]|$)|^[\/\\]/.test(n) && accept(n)); const declared = pick.reduce((a, n) => a + ((zip.files[n]._data && zip.files[n]._data.uncompressedSize) || 0), 0);
    if (declared > maxBytes) throw new Error('The files in this ZIP are larger than this screen reads once unpacked (' + Math.round(maxBytes / 1048576) + ' MB).');
    const out = []; let total = 0; for (const n of pick) { const t = await zip.files[n].async('string'); total += t.length; if (total > maxBytes) throw new Error('The files in this ZIP are larger than this screen reads once unpacked (' + Math.round(maxBytes / 1048576) + ' MB).'); out.push({ name: n, text: t }); }
    return out;
  }
  function loadScript(src) {
    if (!scriptLoads[src]) scriptLoads[src] = new Promise((res, rej) => { const old = document.querySelector(`script[data-src="${src}"]`); if (old) old.remove(); const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = () => res(); s.onerror = () => { delete scriptLoads[src]; s.remove(); rej(new Error('Could not load ' + src.replace(/^vendor\//, '') + '. Check your connection and try again.')); }; document.head.appendChild(s); });
    return scriptLoads[src];
  }
  const fmtDate = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function requireEdit() { if (S.readonly) { toast('You have read-only access to this project'); return false; } return true; }
  Object.assign(V, { docImage, xmlSafe, loadDocx, loadPdfMake, pdfArabic, sheetName, ico, toast, loading, loadingMsg, tag, statusTag, sel, inp, ta, sw, drawer, closeDrawer, confirmDialog, download, pickFile, loadScript, zipTexts, getPath, setPath, fmtDate, fmtSize, requireEdit, bindTarget });
  V.confirmInline = () => true; // legacy callers: destructive actions now use confirmDialog where it matters

  // ---------- routing ----------
  // The standard project menu, grouped as the delivery workflow runs: each group holds the pages used together at that stage
  // (for example the BRD draft, forms, state flows, the process whiteboard, configuration inputs and roles sit together in "Solution Design & Configuration", under sub-headings).
  // `sec` is the small section heading drawn above the first group of each part; `fi` is the group's Facilio icon.
  // Tabs & Layouts (src/templates.js) can rename, re-icon, reorder, add and delete groups per project on top of this.
  // The team menu in project order: the project home, what runs the whole project, then the stages from kick-off to hypercare and closure,
  // then support, what the customer sees, settings and the rarely needed pages. Sub-headings (subs: page id to heading) group the design pages.
  const NAV = [
    { g: 'Project', sec: 'Projects & delivery', icon: 'dash', fi: 'g_project', items: [['projdash', 'Dashboard'], ['tasks', 'Tasks'], ['transfers', 'Transfers'], ['governance', 'Governance & RAID'], ['changes', 'Change Requests'], ['aiwork', 'Deliverables & AI'], ['reports', 'Reports & quality'], ['resources', 'Notes & Links']],   // one group: where we are, then what runs the project
      subs: { projdash: 'Where are we?', overview: 'Where are we?', tasks: 'Run the project', transfers: 'Run the project', governance: 'Run the project', changes: 'Run the project', aiwork: 'Run the project', reports: 'Run the project', resources: 'Run the project' } },
    { g: '1. Project introduction', sec: 'Discover and define', icon: 'flag', fi: 'kickoff', items: [['msaintake', 'Contract intake'], ['kickoff', 'Project introduction'], ['plan', 'Project Plan']] },
    { g: '2. Requirement sessions', sec: 'Discover and define', icon: 'mic', fi: 'transcripts', items: [['rsplan', 'Workshop plan'], ['rstrans', 'Transcripts'], ['whiteboard', 'Process whiteboard'], ['rschecks', 'Checks & validations']],   // in the order the work runs; Data Onboarding (the sheet shown in the first session), Transcripts and Use Cases are tabs inside the first entry (src/workshubs.js)
      subs: { rsplan: 'Plan the sessions', rstrans: 'Run the sessions', whiteboard: 'Capture the flows', rschecks: 'Check what was said' } },
    { g: '3. Mockup & BRD', sec: 'Design and build', icon: 'modules', fi: 'g_config', items: [['solution', 'Solution'], ['modules', 'System Modules & Form Builder'], ['flow', 'State Flow Builder'], ['mockup', 'Mockup (Meteor)'], ['roles', 'Roles & Access Permissions'], ['notifications', 'Notifications'], ['cfginputs', 'Configuration & org package'], ['slakpi', 'KPIs & SLA matrix'], ['brd', 'BRD Draft']],   // in working order: build, set up, then write the BRD from all of it (the BRD is always last)
      subs: { solution: 'Build the solution', modules: 'Build the solution', flow: 'Build the solution', mockup: 'Build the solution', whiteboard: 'Build the solution', roles: 'Set up access, alerts and data', notifications: 'Set up access, alerts and data', cfginputs: 'Record all configuration', slakpi: 'Record all configuration', brd: 'Write the BRD' } },
    { g: '4. UAT & FTR', sec: 'Design and build', icon: 'check', fi: 'delivery', items: [['delivery', 'Build, UAT & Go-Live'], ['ftr', 'FTR Report (Excel)'], ['kpi', 'KPI Workbooks'], ['golive', 'Go-live readiness']] },
    { g: '5. Training guides', sec: 'Launch and support', icon: 'book', fi: 'guide', items: [['guides', 'Training guides'], ['guidebuilder', 'User Guide Builder'], ['vidguide', 'Video to Guide']] },
    { g: '7. Hypercare', sec: 'Launch and support', icon: 'shield', fi: 'g_delivery', items: [['hypercare', 'Hypercare']] },   // stage 6 (Go-live) has no page of its own yet; its checklist is inside Build, UAT & Go-Live
    { g: '8. Project handover', sec: 'Launch and support', icon: 'book', fi: 'g_delivery', items: [['handover', 'Handover & Closure']] },
    { g: 'Show Facilio', sec: 'Share with the customer', icon: 'spark', items: [['demokit', 'Facilio Screens'], ['seefacilio', 'Product Tour'], ['dashboards', 'Dashboard Gallery'], ['explore', 'Discover more']] },   // every page that shows the customer what Facilio can do
    { g: 'Customer View', sec: 'Share with the customer', icon: 'spark', items: [['custintro', 'Customer Introduction'], ['prepare', 'Learn & Prepare'], ['learnlib', 'Module guides'], ['integguide', 'Connecting Your Systems'], ['guide', 'Customer User Guide'], ['portal', 'Customer Portal']] },
    { g: 'Help', sec: 'Integrations & admin', icon: 'book', items: [['claudesetup', 'Claude setup'], ['teamhelp', 'Team Guide'], ['webframe', 'Facilio tools'], ['whatsnew', "What's new"], ['privacy', 'Privacy & data']] },
    { g: 'Settings', sec: 'Integrations & admin', icon: 'gear', fi: 'g_admin', items: [['settings', 'Project Settings'], ['templates', 'Templates'], ['workspace', 'Tabs & Layouts']] }
  ];
  // group names used before 28 Oct 2026, so layouts saved against them land in the matching group of the menu above
  // the names on main before the regrouping, and the interim names from the unmerged #20, both point at the menu above
  V.NAV_ALIAS = { 'More tools': 'Settings', 'Reports & quality': 'Project', 'Configuration & org package': '3. Solution Design & Configuration', '1. Kick-off & Discovery': '1. Kick-off & Planning', '2. Workshops': '2. Workshops & Requirements', '3. Requirements': '2. Workshops & Requirements', '4. BRD & Approvals': '3. Solution Design & Configuration', 'Process & State Flows': '3. Solution Design & Configuration', '5. Configuration & Implementation': '3. Solution Design & Configuration', '6. UAT & Defects · 9. Go-Live': '4. UAT & Go-Live', '7. FTR & KPI Documentation': '4. UAT & Go-Live', '10. Hypercare': '5. Hypercare & Handover', '11. Support Handover & 12. Closure': '5. Hypercare & Handover', 'Documentation & Resources': 'Guides & Video Studio', 'Guides & Documentation': 'Guides & Video Studio', 'Support & Tickets': 'Support & AI', 'AI & Automation': 'Support & AI', 'Administration': 'Settings',
    '3. Requirements to BRD': '3. Solution Design & Configuration', '4. Configuration & Build': '3. Solution Design & Configuration', '5. UAT & Go-Live': '4. UAT & Go-Live', '6. Hypercare & Handover': '5. Hypercare & Handover' };
  { const REN = { '5. Hypercare & Handover': '6. Hypercare, Handover & Closure', 'Guides & Video Studio': '5. Training & Guides', 'Support & AI': 'Support & Tickets' }; Object.keys(V.NAV_ALIAS).forEach(k => { V.NAV_ALIAS[k] = REN[V.NAV_ALIAS[k]] || V.NAV_ALIAS[k]; }); Object.assign(V.NAV_ALIAS, REN, { 'AI & Automation': 'Project', 'Project control': 'Project', 'Guides & Documentation': '5. Training & Guides', 'Administration': 'Settings' }); }
  // 5 Nov 2026: the stages were renamed to the 8-stage plan (roadmap E16); group names saved in per-project layouts and the older aliases still land in the right group
  { const R2 = { '1. Kick-off & Planning': '1. Project introduction', '1. Kick-off': '1. Project introduction', '2. Workshops & Requirements': '2. Requirement sessions', '3. Solution Design & Configuration': '3. Mockup & BRD', '4. UAT & Go-Live': '4. UAT & FTR', '5. Training & Guides': '5. Training guides', '6. Hypercare, Handover & Closure': '7. Hypercare', 'Support & Tickets': 'Support' }; Object.keys(V.NAV_ALIAS).forEach(k => { V.NAV_ALIAS[k] = R2[V.NAV_ALIAS[k]] || V.NAV_ALIAS[k]; }); Object.assign(V.NAV_ALIAS, R2); }
  // customer menu: [view, label, portal tab that must be on]
  const CUSTOMER_NAV = [{ g: 'Start here', icon: 'home', items: [['projdash', 'Dashboard', 'projdash'], ['cust_home', 'Welcome', 'cust_home'], ['kickoff', 'Kick-off', 'kickoff'], ['contract', 'Contract', 'contract'], ['scope', 'Scope', 'scope'], ['timeline', 'Plan Timeline', 'plan']] },
    { g: 'Prepare for the sessions', icon: 'flag', items: [['schedule', 'Workshop Schedule', 'schedule'], ['prepare', 'Learn & Prepare', 'prepare'], ['seefacilio', 'Product Tour', 'seefacilio'], ['learnlib', 'Module guides', 'learnlib'], ['integguide', 'Connecting Your Systems', 'integguide'], ['guide', 'Customer User Guide', 'guide'], ['dashboards', 'Dashboard Gallery', 'dashboards'], ['onboarding', 'Data Onboarding', 'onboarding']] },
    { g: 'Decisions and delivery', icon: 'check', items: [['governance', 'Sign-offs & Decisions', 'governance'], ['changes', 'Change Requests', 'changes'], ['delivery', 'Build, UAT & Go-Live', 'delivery'], ['uatrun', 'UAT Testing', 'delivery']] },
    { g: 'And more', icon: 'spark', items: [['whatsnew', "What's new", 'whatsnew'], ['explore', 'Discover more', 'explore']] }];
  // only menu entries whose view exists, and for customers only the tabs the implementation team has switched on
  // Office open mode (temporary): set by the server (OFFICE_OPEN_MODE=1). Hides sign-in, accounts, project access and the Roles view; nothing is removed.
  V.office = () => !!health.openMode;
  const AGENT_ONLY = ['agentdata', 'agentrules', 'agenttest', 'agentguide'];
  const AGENT_HIDE = ['modules', 'flow', 'whiteboard', 'cfginputs', 'onboarding', 'ftr', 'kpi', 'learnlib', 'seefacilio', 'explore', 'vstudio', 'guidebuilder', 'vidguide', 'pkgan', 'trace', 'orgpkg', 'templates'];
  V.isAgentProject = () => !!(S.project && S.project.type === 'agents');
  // REVAMP: the team menu shows only the tabs that have been built or rebuilt in the Part E revamp; every other tab stays hidden (its code, routes and data are untouched)
  // until it is rebuilt. To show a tab, add its view id to EXPOSED. Adding `alltabs=1` to the address (before the #) shows every tab again for this browser tab (for developers).
  const EXPOSED = new Set(['projdash', 'msaintake', 'kickoff', 'plan', 'rsplan', 'rstrans', 'whiteboard', 'rschecks', 'solution', 'modules', 'flow', 'mockup', 'brd', 'delivery', 'ftr', 'golive', 'guides', 'hypercare', 'handover', 'slakpi', 'workspace', 'templates', 'webframe', 'privacy', 'tasks', 'transfers', 'governance', 'changes', 'roles', 'notifications', 'cfginputs', 'kpi', 'custintro', 'prepare', 'learnlib', 'integguide', 'guide', 'portal', 'guidebuilder', 'vidguide', 'claudesetup', 'teamhelp', 'settings']);
  const showAllTabs = () => { try { if (/[?&]alltabs=1\b/.test(location.search)) sessionStorage.setItem('fwb_alltabs', '1'); else if (/[?&]alltabs=0\b/.test(location.search)) sessionStorage.removeItem('fwb_alltabs'); return sessionStorage.getItem('fwb_alltabs') === '1'; } catch (e) { return /[?&]alltabs=1\b/.test(location.search); } };
  const HIDE_UNBUILT_TABS = true;   // 6 Nov 2026: the earlier show-all was a demo for the developer; only the built tabs show again (Stage 1: Kick-off and Project Plan, plus Transfers where the extraction is approved and Contract for a manual upload)
  const tabOn = id => !HIDE_UNBUILT_TABS || EXPOSED.has(id) || showAllTabs();
  V.NAV_EXPOSED = EXPOSED;
  function navBase() { const cust = S.user.kind === 'customer'; const ag = V.isAgentProject(); const ctl = V.controls ? V.controls() : { tabs: {} }; return (cust ? CUSTOMER_NAV : NAV).map(g => Object.assign({}, g, { items: g.items.filter(([id, , tab]) => V[id] && (cust || tabOn(id)) && !(ag && AGENT_HIDE.includes(id)) && !(!ag && AGENT_ONLY.includes(id)) && !(V.office() && id === 'roles') && (!cust || ctl.tabs[tab] !== false)).map(it => (g.subs && g.subs[it[0]] ? [it[0], it[1], it[2], g.subs[it[0]]] : it)) })).filter(g => g.items.length); }
  function navFor() { const base = navBase(); return S.user.kind !== 'customer' && V.wsApply ? V.wsApply(base) : base; }
  V.navBase = navBase;
  V.navFor = navFor;
  const ALIAS = { module: 'modules', search: 'overview' };
  function go(view, extra) {
    if (V.beforeLeave && V.beforeLeave() === false) return;
    V.beforeLeave = null;
    if (S.user && S.user.kind !== 'customer' && V.mfRoute && ['contract', 'scope', 'planner', 'msaflow'].includes(view)) { if (extra && extra.plTab) S.ui.plTab = extra.plTab; view = V.mfRoute(view, extra); } // one Contract section; old links and #/p/<id>/planner land in it
    if (S.user && S.user.kind !== 'customer' && V.hubRoute) view = V.hubRoute(view);   // Delivery lifecycle, Roadmap, Plan vs actual and Reports are tabs of Project Overview
    Object.assign(S.ui, { view }, extra || {}); if (view !== 'flow') S.ui.selected = null;
    const sub = view === 'module' && S.ui.module ? '/' + encodeURIComponent(S.ui.module) : '';
    try { history.replaceState(null, '', S.project ? `#/p/${S.project.id}/${view}${sub}` : '#/projects'); } catch (e) { }
    render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0;
  }
  V.go = go; V.openDrawer = (...a) => drawer(...a);
  V.setMode = m => { mode = m; render(); };

  // ---------- render ----------
  let mode = 'boot'; // boot | auth | projects | workspace
  // which colour a page carries: the sidebar group it sits in (0 project, 1 discover, 2 design and build, 3 launch and support, 4 share with the customer, 5 integrations and admin); a customer login always uses the project blue
  const SEC_OF_GROUP = [0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5];
  function secOf(key) { if (S.user && S.user.kind === 'customer') return 0; const i = NAV.findIndex(g => g.items.some(it => it[0] === key)); return i < 0 ? 0 : (SEC_OF_GROUP[i] || 0); }
  function render() {
    if (!S.user) { const up = document.getElementById('userPop'); if (up) up.remove(); }   // signed out: no account menu on the sign-in screen
    const app = document.getElementById('app'); if (!app) return;
    if (mode === 'auth') { const keep = {}; document.querySelectorAll('.auth-box input[type=text],.auth-box input[type=email]').forEach(i => { if (i.id && i.value) keep[i.id] = i.value; }); app.innerHTML = authHtml(); Object.entries(keep).forEach(([k, v]) => { const i = document.getElementById(k); if (i && !i.value) i.value = v; }); mountAuth(); return; }
    if (mode !== 'projects') S.ui.homeGuide = false;
    if (mode === 'projects') { app.innerHTML = navbarHtml(false) + (S.ui.homeGuide && V.homeGuideHtml ? V.homeGuideHtml() : projectsHtml()); if (V.motion) V.motion.route('projects'); return; }
    if (mode === 'tickets') { app.innerHTML = navbarHtml(false) + (V.ticketsGlobalHtml ? V.ticketsGlobalHtml() : ''); return; }
    if (mode === 'admin') { app.innerHTML = navbarHtml(false) + (V.adminHtml ? V.adminHtml() : ''); if (V.adminPost) V.adminPost(); return; }
    if (mode !== 'workspace') return;
    if ((S.ui.view === 'onboarding' || (S.ui.view === 'transcripts' && S.ui.reqTab === 'onboarding')) && S.ui.onbTab === 'excel' && document.getElementById('onbFrame')) return; // keep the embedded tool alive: re-rendering would reload it
    if (V.wfKeep && V.wfKeep()) { const sb = document.querySelector('.sidebar'); if (sb) sb.innerHTML = sidebarHtml(); return; } // a Facilio tools frame is open on the same site: re-rendering would reload it
    const main = document.querySelector('.main'); const scroll = main ? main.scrollTop : 0;
    const active = document.activeElement; const activeBind = active && active.getAttribute && active.getAttribute('data-bind'); const caret = active && active.selectionStart;
    const key = ALIAS[S.ui.view] && !V[S.ui.view] ? ALIAS[S.ui.view] : S.ui.view; const view = V[key] || (/^cx_/.test(key) && V.customPage) || V.overview;
    let body; if (V.ui && V.ui.blocked(key)) body = `<div class="page-body">${V.ui.denied('this page')}</div>`; else try { body = view.html(); } catch (e) { console.error(e); body = `<div class="page-body">${V.ui ? V.ui.error('This page could not be displayed', 'Something went wrong while drawing this page. Your work is safe. Try again, or go back to the overview. (' + String((e && e.message) || e).slice(0, 140) + ')') : '<div class="notice err">This view could not be displayed.</div>'}</div>`; }
    const sbOld = document.querySelector('.sidebar'); const sbTop = sbOld ? sbOld.scrollTop : (S.ui.navScroll || 0); // the whole shell is rebuilt on every render: carry the sidebar's scroll position across so a click never moves it
    if (body.indexOf('ob-focus-page') >= 0 || body.indexOf('wb-focus-page') >= 0) { app.innerHTML = body; if (view.mount) try { view.mount(); } catch (e) { console.error(e); } return; }   // the Excel sheet opened in its own tab: the sheet and nothing else
    app.innerHTML = navbarHtml(true) + `<div class="shell"><nav class="sidebar" id="projNav" aria-label="Workspace">${sidebarHtml()}</nav><main class="main" id="main" data-sec="${secOf(key)}">${crumbHtml()}<div class="page">${V.phaseStrip ? V.phaseStrip() : ''}${body}</div></main></div>`;
    const m = document.querySelector('.main'); if (m) m.scrollTop = scroll; const sbNew = document.querySelector('.sidebar'); if (sbNew) sbNew.scrollTop = sbTop;
    if (view.mount) try { view.mount(); } catch (e) { console.error(e); }
    if (V.motion) V.motion.route(key + '|' + (S.project ? S.project.id : ''));
    if (activeBind) { const el = document.querySelector(`[data-bind="${CSS.escape(activeBind)}"]`); if (el && el.tagName !== 'SELECT') { el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch (e) { } } }
    F.paintSave();
  }
  V.render = render; F.on(render);

  function initials(n) { return String(n || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(); }
  // workspace switch: the one place to move between Projects and the Admin console. It is navigation, so it is drawn as
  // a two-part switch in the top bar (current part marked with aria-current), never as a page action button.
  // People without admin access only see a link back to all projects while inside a project.
  function wsSwitchHtml(inProject) {
    const u = S.user || {}; if (u.kind !== 'consultant') return '';
    const admin = !!(u.adminRole || V.office()); const inAdmin = mode === 'admin';
    if (!admin) return inProject ? '<span class="divider"></span><a class="nav-back" href="#/projects" data-act="toProjects">All projects</a>' : '';
    const cur = ' aria-current="page"';
    return `<span class="divider"></span><nav class="ws-switch" aria-label="Switch workspace"><a href="#/projects" data-act="toProjects"${inAdmin ? '' : cur}>Projects</a><a href="#/admin" data-act="openAdmin"${inAdmin ? cur : ''}>Admin</a></nav>`;
  }
  function navbarHtml(inProject) {
    const u = S.user || {};
    return `<header class="navbar"><div class="left">${inProject ? '<button class="btn ghost icon nav-menu" data-act="navMenu" aria-label="Open the project menu" aria-controls="projNav" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' : ''}<img class="nav-logo" src="brand/logo-navy.png" alt="Facilio" height="22"><span class="divider"></span><span class="title">Delivery Studio</span>${wsSwitchHtml(inProject)}</div>
      <div class="center">${inProject && S.project ? esc(S.project.name) + ' <span class="muted" style="font-weight:400">· ' + esc(S.project.customer) + '</span>' : ''}</div>
      <div class="right">${S.custPreview ? `<span class="tag blue">Customer preview · read-only</span><button class="btn sm primary" data-act="custPreviewExit">Exit preview</button>` : (inProject && V.canPreviewCustomer && V.canPreviewCustomer() ? `<button class="btn sm" data-act="custPreview" title="See this project as the customer sees it">Preview as customer</button>` : '')}${inProject && !S.readonly && u.kind === 'consultant' ? '<span id="saveState" class="save-state"></span>' : ''}${S.readonly && u.kind === 'consultant' ? tag('tbc', 'Read-only') : ''}${inProject && V.gsButton ? V.gsButton() : ''}${V.bellHtml ? V.bellHtml() : ''}${V.office() && !inProject ? `<button class="btn sm nav-out" data-act="logout">Sign out</button>` : ''}${V.office() ? '' : `${u.guest ? tag('tbc', 'Guest') : ''}<button class="avatar" data-act="userMenu" aria-label="Account">${esc(initials(u.name))}</button>`}</div></header>`;
  }
  const FI = root.FWBIcons || { has: () => false, svg: () => '' };
  // a menu icon key: 'f:<name>' is a Facilio web-tab icon (src/ficons.js), 'l:<name>' a line icon from ICON above; a bare name is tried as both
  V.navIcon = k => { k = String(k || ''); const m = /^([fl]):(.+)$/.exec(k); const t = m ? m[1] : '', n = m ? m[2] : k; if (t !== 'l' && FI.has(n)) return FI.svg(n); if (t !== 'f' && ICON[n]) return ico(n); return ico('flag'); };
  V.NAV_ICONS = ['f:g_project', 'f:g_dash', 'f:g_delivery', 'f:g_config', 'f:g_req', 'f:g_admin', 'f:kickoff', 'f:contract', 'f:scope', 'f:plan', 'f:timeline', 'f:planner', 'f:transcripts', 'f:usecases', 'f:checks', 'f:brd', 'f:modules', 'f:flow', 'f:roles', 'f:onboarding', 'f:dashboards', 'f:governance', 'f:changes', 'f:delivery', 'f:guide', 'f:portal', 'f:settings', 'f:schedule', 'l:home', 'l:flag', 'l:mic', 'l:doc', 'l:book', 'l:check', 'l:shield', 'l:mail', 'l:spark', 'l:gear', 'l:cal', 'l:deck', 'l:link', 'l:bell', 'l:roles', 'l:lock', 'l:eye', 'l:clip'].filter(k => FI.has(k.slice(2)) || ICON[k.slice(2)]);
  const groupIcon = g => V.navIcon(g.ik || (g.fi ? 'f:' + g.fi : 'l:' + (g.icon || 'flag')));
  function crumbHtml() {
    const v = S.ui.view; let grp = '', item = ''; for (const g of navFor()) for (const [id, l] of g.items) if (id === v || (id === 'modules' && v === 'module')) { grp = g.g; item = l; }
    if (!item) return ''; const gname = grp.replace(/^\d+\.\s*/, '');
    return `<nav class="crumb" aria-label="You are here"><span class="crumb-p">${esc((S.project && S.project.name) || 'Project')}</span><i aria-hidden="true">/</i><span>${esc(gname)}</span><i aria-hidden="true">/</i><b aria-current="page">${esc(item)}</b></nav>`;
  }
  function sidebarHtml() {
    const nav = navFor(); const counts = V.navCounts ? V.navCounts() : {};
    const q = (S.ui.navq || '').toLowerCase();
    return `<div class="search">${ico('search')}<input type="search" placeholder="Search" aria-label="Search menu" id="navq" value="${esc(S.ui.navq || '')}"></div>` +
      (() => { const seen = new Set(); return nav.map(g => { const items = g.items.filter(([, l]) => !q || l.toLowerCase().includes(q)); if (!items.length) return ''; const sec = g.sec && !seen.has(g.sec) ? g.sec : ''; if (g.sec) seen.add(g.sec); const hasAct = g.items.some(([id]) => S.ui.view === id || (id === 'modules' && S.ui.view === 'module')); const open = hasAct || !!q || !(S.ui.navShut || {})[g.g]; return (sec && !q ? `<div class="sb-sec" role="presentation"><span>${esc(sec)}</span></div>` : '') + `<div class="sb-group${open ? ' open' : ''}${hasAct ? ' has-active' : ''}"><button class="sb-title" data-act="navGroup" data-g="${esc(g.g)}" aria-expanded="${open}">${groupIcon(g)}<span>${esc(g.g)}</span></button>${open ? items.map(([id, l, , sub], ix) => { const prev = ix ? items[ix - 1][3] : ''; const sh = sub && sub !== prev && !q ? `<div class="sb-sub" role="presentation">${esc(sub)}</div>` : ''; const c = counts[id]; const act = S.ui.view === id || (id === 'modules' && S.ui.view === 'module'); return sh + `<button class="sb-item${act ? ' active' : ''}${sub ? ' sb-subbed' : ''}${FI.has(id) ? '' : ' noic'}" data-act="nav" data-view="${id}"${act ? ' aria-current="page"' : ''}>${FI.has(id) ? FI.svg(id) : ''}<span>${esc(l)}</span>${c ? `<span class="sb-badge ${esc(c.cls || '')}"${c.why ? ' title="' + esc(c.why) + '"' : ''}>${esc(c.n)}</span>` : ''}</button>`; }).join('') : ''}</div>`; }).join(''); })() +
      `<div class="sb-foot"><button class="sb-out" data-act="logout" title="Sign out and return to the sign-in page"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg><span>Sign out</span></button></div>`;
  }
  ACT.navGroup = a => { const g = a.getAttribute('data-g'); const shut = Object.assign({}, S.ui.navShut || {}); shut[g] = !shut[g]; S.ui.navShut = shut; render(); }; // a group holding the active page stays open

  // ---------- events ----------
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) { const pop = document.getElementById('userPop'); if (pop && !e.target.closest('#userPop')) pop.remove(); return; }
    const fn = ACT[a.getAttribute('data-act')]; if (!fn) return;
    if (a.closest('#userPop')) { const up = document.getElementById('userPop'); if (up) up.remove(); }   // choosing anything in the account menu closes it (Sign out, switching role, all projects...)
    if (a.tagName === 'A' || a.tagName === 'BUTTON') e.preventDefault();
    // one click at a time per action and record: a second click while the first is still running is ignored (stops duplicate saves, imports, generates)
    const key = a.getAttribute('data-act') + '|' + (a.getAttribute('data-id') || a.getAttribute('data-k') || a.getAttribute('data-v') || ''); if (inflight.has(key)) { e.preventDefault(); return; }
    try {
      const r = fn(a, e);
      if (r && r.then) { inflight.add(key); a.setAttribute('aria-busy', 'true'); const free = () => { inflight.delete(key); a.removeAttribute('aria-busy'); }; const t = setTimeout(free, 60000); r.then(() => { clearTimeout(t); free(); }, err => { clearTimeout(t); free(); console.error(err); loading(false); toast(err.message || 'Something went wrong', 5000, true); }); }
    } catch (err) { console.error(err); toast(err.message, 5000, true); }
  });
  const inflight = new Set();
  // ---------- drop a file on any import button or area (7 Nov 2026) ----------
  // Every action that asks for a file (V.pickFile) can also take a file dropped on its button, or anywhere in the card or window that holds exactly one such button.
  // The dropped file is handed to the same action, so the same checks and the same saving apply. A file that does not match the accepted types is refused with a message.
  const DROP_ACTS = new Set('brdAskFile brdImportFile brdLogoUp brdSampleUp ciFileAdd ciImport ctUpload dashPick dmFile drLogoUp fiOpen ftrLoadRes ftrImport kpiImport guPick importConfig koReplaceMsa npMsa npZip onbCheck onbFileUp onbPkg opkValidateZip planUpload repAtt rsAddDoc rsAddFile sesImport soPickEv tkAttach tkNewFile trPick mkHtmlUp shPkg ugImgAdd solAddFile solDrop ugLogo uploadDeck uploadMsa utcAttach vgPick vgTr wbImgPick wsLoadFile xfImg'.split(' '));
  V.DROP_ACTS = DROP_ACTS;
  const dropBtn = t => { const el = t && t.closest && t.closest('[data-act]'); if (el && DROP_ACTS.has(el.getAttribute('data-act'))) return el; const box = t && t.closest && t.closest('.card, .drawer, .modal, .dlg'); if (!box) return null; const b = Array.from(box.querySelectorAll('[data-act]')).filter(x => DROP_ACTS.has(x.getAttribute('data-act')) && !x.disabled); return b.length === 1 ? b[0] : null; };
  const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  const okType = (f, accept) => { const a = String(accept || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); if (!a.length) return true; const n = f.name.toLowerCase(), t = (f.type || '').toLowerCase(); return a.some(x => x[0] === '.' ? n.endsWith(x) : x.endsWith('/*') ? t.startsWith(x.slice(0, -1)) : t === x); };
  let dropEl = null; const dropOff = () => { if (dropEl) dropEl.classList.remove('drop-ready'); dropEl = null; document.body.classList.remove('dragging-files'); };
  document.addEventListener('dragenter', e => { if (hasFiles(e)) document.body.classList.add('dragging-files'); });
  document.addEventListener('dragover', e => { if (!hasFiles(e)) return; if (e.target.closest && e.target.closest('#np_msadrop, #guDrop, [data-drop-zone]')) return; e.preventDefault(); const b = dropBtn(e.target); if (b !== dropEl) { if (dropEl) dropEl.classList.remove('drop-ready'); dropEl = b; if (b) b.classList.add('drop-ready'); } if (e.dataTransfer) e.dataTransfer.dropEffect = b ? 'copy' : 'none'; });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) dropOff(); });
  document.addEventListener('drop', async e => {
    if (!hasFiles(e)) return; if (e.target.closest && e.target.closest('#np_msadrop, #guDrop, [data-drop-zone]')) { dropOff(); return; } e.preventDefault(); const b = dropBtn(e.target); dropOff(); if (!b) return;
    const files = Array.from(e.dataTransfer.files || []); if (!files.length) return; const fn = ACT[b.getAttribute('data-act')]; if (!fn) return;
    const orig = V.pickFile; let asked = false; V.pickFile = async (accept, multiple) => { asked = true; const ok = files.filter(f => okType(f, accept)); if (!ok.length) { toast('That file type is not accepted here. Accepted: ' + (accept || 'any') + '.', 6000, true); return []; } return multiple ? ok : ok.slice(0, 1); };
    try { const r = fn(b, e); if (r && r.then) await r; } catch (err) { console.error(err); toast(err.message, 5000, true); } finally { V.pickFile = orig; }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'navq') { S.ui.navq = el.value; const nav = document.querySelector('.sidebar'); if (nav) { nav.innerHTML = sidebarHtml(); const n = document.getElementById('navq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } return; }
    const b = el.getAttribute('data-bind'); if (!b || el.type === 'checkbox' || el.tagName === 'SELECT') return;
    const t = bindTarget(b); setPath(t.obj, t.path, el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value); F.changed(null, null, { render: false, section: t.section });
  });
  document.addEventListener('change', e => {
    const el = e.target; const b = el.getAttribute('data-bind');
    if (b) { const t = bindTarget(b); const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; setPath(t.obj, t.path, v); F.changed(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'Edited' : null, b.replace(/^@\w+:/, '').replace(/\./g, ' › '), { render: el.type === 'checkbox' || el.tagName === 'SELECT', section: t.section }); return; }
    const u = el.getAttribute('data-ui'); if (u) { setPath(S.ui, u, el.type === 'checkbox' ? el.checked : el.value); render(); return; }
    const c = el.getAttribute('data-change'); if (c && ACT[c]) { try { const r = ACT[c](el, e); if (r && r.catch) r.catch(err => { loading(false); toast(err.message, 5000, true); }); } catch (err) { toast(err.message, 5000, true); } }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); const p = document.getElementById('userPop'); if (p) p.remove(); if (document.body.classList.contains('nav-open')) navMenu(false); return; }
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { const t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-act') && !NATIVE.test(t.tagName)) { e.preventDefault(); t.click(); } }
  });
  // every clickable element that is not a native control can be reached with Tab and announced as a button
  // (table rows and cells keep their table role and are only made focusable)
  const NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|OPTION|SUMMARY)$/;
  function enhanceActions(rootEl) {
    (rootEl || document).querySelectorAll('[data-act]').forEach(el => {
      if (NATIVE.test(el.tagName) && !(el.tagName === 'A' && !el.hasAttribute('href'))) return;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role') && !/^(TR|TD|TH)$/.test(el.tagName)) el.setAttribute('role', 'button');
    });
  }
  let enhanceQueued = false;
  new MutationObserver(() => { if (enhanceQueued) return; enhanceQueued = true; requestAnimationFrame(() => { enhanceQueued = false; enhanceActions(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  V.enhanceActions = enhanceActions;
  root.addEventListener('beforeunload', e => { if (F.hasUnsaved()) { F.flush(); e.preventDefault(); e.returnValue = ''; } });

  ACT.nav = a => { navMenu(false); go(a.getAttribute('data-view')); };
  function navMenu(open) { const on = open === undefined ? !document.body.classList.contains('nav-open') : !!open; document.body.classList.toggle('nav-open', on); const b = document.querySelector('.nav-menu'); if (b) { b.setAttribute('aria-expanded', String(on)); b.setAttribute('aria-label', on ? 'Close the project menu' : 'Open the project menu'); } if (on) { const f = document.querySelector('.sidebar .sb-item.active, .sidebar .sb-item'); if (f) f.focus(); } }
  ACT.navMenu = () => navMenu();
  document.addEventListener('click', e => { if (document.body.classList.contains('nav-open') && !e.target.closest('.sidebar, .nav-menu')) navMenu(false); });
  ACT.closeDrawer = () => closeDrawer();
  ACT.navTo = a => { const n = JSON.parse(a.getAttribute('data-nav')); go(n.view, { module: n.module || S.ui.module, moduleTab: n.tab || S.ui.moduleTab, flowId: n.flowId || S.ui.flowId, selected: n.sel || null, processId: n.processId || S.ui.processId, reqId: n.reqId || S.ui.reqId, guideModule: n.guideModule || S.ui.guideModule }); if (n.sel) { S.ui.selected = n.sel; render(); } };
  ACT.openModule = a => go('module', { module: a.getAttribute('data-module'), moduleTab: a.getAttribute('data-tab') || 'templates' });
  ACT.userMenu = () => { const old = document.getElementById('userPop'); if (old) { old.remove(); return; } const d = document.createElement('div'); d.id = 'userPop'; d.className = 'popover'; const u = S.user;
    const role = u.adminRole && !V.office() ? (u.adminRole === 'super' ? 'Platform owner' : u.adminRole === 'admin' ? 'Admin' : 'Sub admin') : '';
    d.setAttribute('role', 'menu');
    d.innerHTML = `<div class="um-head"><b>${esc(u.name)}</b><span>${esc(u.kind === 'customer' ? 'Customer stakeholder' : u.guest ? 'Guest workspace' : u.email)}</span>${role ? `<em>${esc(role)}</em>` : ''}</div>${u.guest ? '<button class="um-i" role="menuitem" data-act="upgradeGuest">Save as a full account</button>' : ''}${u.kind === 'consultant' ? '<button class="um-i" role="menuitem" data-act="toProjects">All projects</button>' : ''}${u.kind === 'consultant' && (u.adminRole || V.office()) ? '<button class="um-i" role="menuitem" data-act="openAdmin">Admin console</button>' : ''}<button class="um-i" role="menuitem" data-act="replayRoadmap">Product introduction</button><div class="um-sep"></div><button class="um-i um-out" role="menuitem" data-act="logout">Sign out</button>`; document.body.appendChild(d); const f = d.querySelector('.um-i'); if (f) f.focus(); };
  ACT.toProjects = async () => { loading(true, 'Back to your projects…'); try { if (V.ticketsLeave) V.ticketsLeave(); if (F.hasUnsaved()) await F.flush(); S.project = null; S.baseline = null; mode = 'projects'; await loadProjects(); history.replaceState(null, '', '#/projects'); render(); } finally { loading(false); } if (S.user.kind === 'consultant' && !refCache) setTimeout(() => { if (!refCache) API.reference().then(r => { refCache = refCache || r; }).catch(() => { }); }, 700); };
  ACT.officeContinue = () => { location.reload(); };
  ACT.logout = async () => { if (S.user && S.user.guest && !V.office() && !(await confirmDialog('Sign out of guest workspace', 'You will need your guest key to come back. If you have lost it, save the workspace as a full account first (menu under your initials).', 'Sign out', true))) return; if (F.hasUnsaved()) await F.flush(); try { await API.post('/api/auth/logout'); } catch (e) { } try { Object.keys(localStorage).filter(k => /^facilio-onboarding-workspace/.test(k) && !localStorage.getItem('facilio-onboarding-dirty:' + k.split(':')[1])).forEach(k => localStorage.removeItem(k));  /* cached customer data leaves with the person; unsynced edits stay */ } catch (e) { } if (root.FWBRun) { S.project = null; mode = 'auth'; authMsg = 'You have left the workspace. Close this tab, or open it again whenever you like.'; history.replaceState(null, '', '#/'); render(); return; } teamAuth = !!(health.runMode && S.user && S.user.kind !== 'customer'); S.user = null; S.project = null; mode = 'auth'; history.replaceState(null, '', '#/'); render(); };

  // ---------- auth screens ----------
  let authTab = 'signup'; let authMsg = ''; let health = { signupEnabled: false };
  let authAnimated = false;
  // the same highlighted button on the team and the customer sign-in: it plays the road-to-go-live journey (src/welcome.js)
  const LEARN = '<a class="av-learn" href="#/welcome" data-act="openWelcome" role="button"><span class="av-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg></span><span>See how Delivery Studio helps</span><span class="av-dur">2 min</span></a>' + '<a class="av-learn av-disc" href="#/discover" data-act="openDiscover" role="button"><span class="av-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M4 12h16"/></svg></span><span>Discover more with Facilio</span><span class="av-dur">Scroll tour</span></a>';
  function authHtmlBase() {
    const custM = location.hash.match(/#\/c\/([A-Za-z0-9_-]+)(?:~([A-Za-z0-9_-]+))?/) || []; const custId = custM[1] || ''; const custCode = custM[2] || '';
    if (custId && authTab !== 'customer') authTab = 'customer';
    const tabs = [['signup', 'Create account'], ['login', 'Sign in'], ['customer', 'Guest / Customer']].filter(t => t[0] !== 'signup' || health.signupEnabled);
    const f = { login: `<div class="fld"><label class="f">Work email</label><input type="email" id="a_email" autocomplete="username" required></div><div class="fld"><label class="f">Password</label><input type="password" id="a_pw" autocomplete="current-password" required></div><button class="btn primary lg" style="width:100%" data-act="doLogin">Sign in</button>`,
      signup: `<div class="fld"><label class="f">Full name</label><input type="text" id="a_name" autocomplete="name" placeholder="e.g. Priya Nair"></div><div class="fld"><label class="f">Work email</label><input type="email" id="a_email" autocomplete="username" placeholder="name@facilio.com"><div class="xs muted" style="margin-top:4px">Use your Facilio office email.</div></div><div class="fld"><label class="f">Choose a password (min. 10 characters)</label><input type="password" id="a_pw" autocomplete="new-password"></div>${health.signupNeedsCode === false ? '' : `<div class="fld"><label class="f">Team code</label><input type="password" id="a_inv" autocomplete="off"><div class="xs muted" style="margin-top:4px">Same code for the whole team. Ask your team lead.</div></div>`}<button class="btn primary lg" style="width:100%" data-act="doSignup">Create account</button>`,
      guest: `<div class="fld"><label class="f">Your name</label><input type="text" id="g_name" autocomplete="name" placeholder="Your name"></div><div class="fld"><label class="f">Team code</label><input type="password" id="g_code" autocomplete="off"><div class="xs muted" style="margin-top:4px">Ask your team lead for the code. No email or password needed — you get your own private workspace.</div></div><button class="btn primary lg" style="width:100%" data-act="doGuest">Continue as guest</button>
        <details class="auth-key"${authMsg && /key/i.test(authMsg) ? ' open' : ''}><summary>Coming back? Use your guest key</summary><div class="fld"><input type="password" id="g_key" autocomplete="off" placeholder="Paste the key you saved" aria-label="Your guest key"></div><button class="btn" data-act="doGuestKey">Open my workspace</button></details>`,
      customer: `<div class="fld"><label class="f" for="c_email">Email</label><input type="email" id="c_email" autocomplete="username" placeholder="you@company.com"></div><div class="fld"><label class="f" for="c_pw">Password</label><input type="password" id="c_pw" autocomplete="current-password" placeholder="Your password"></div><div class="cs-row"><a href="#" data-act="custForgot">Forgot password?</a></div><button class="btn primary lg" style="width:100%" data-act="doCustomerLogin">Sign in</button>` };
    return `<div class="auth${authAnimated ? '' : ' auth-in'}"><div class="auth-art av2"><div class="av-glow" aria-hidden="true"></div><div class="auth-brand"><img src="brand/logo-white.png" alt="Facilio" width="120" height="33"></div><div class="av-copy">${custId ? '<div class="lsx-eb">Facilio project delivery</div><h1>A quicker way to <em>go live with Facilio</em></h1>' + LEARN : '<div class="lsx-eb">AI-assisted Delivery Studio</div><h1>Every project, <em>organised in one studio</em></h1>' + LEARN + ''}</div>${V.isoLogin ? V.isoLogin(custId ? 'customer' : 'public') : ''}<div class="auth-note">Customer data is stored privately per project and is only available to project members.</div></div>
      <div class="auth-form"><div class="auth-box"><div class="auth-sky" aria-hidden="true"><div data-lottie="scene-skyline"></div></div><div class="auth-hello">${authTab === 'signup' || authTab === 'customer' || authTab === 'guest' ? 'Welcome!' : 'Welcome back!'}</div><h2>${authTab === 'signup' ? 'Create your consultant account' : authTab === 'customer' ? 'Guest / customer access' : 'Sign in'}</h2><div class="sub">${({ signup: 'New here? Set up your account in a minute.', login: 'Sign in with your work email.', guest: 'A private workspace, no email or password.', customer: 'Enter the access code your Facilio team gave you.' })[authTab]}</div>
      <div class="seg" style="margin-bottom:18px;width:100%">${tabs.map(([k, l]) => `<button class="${authTab === k ? 'on' : ''}" style="flex:1" data-act="authTab" data-v="${k}">${esc(l)}</button>`).join('')}</div>
      ${authMsg ? `<div class="notice err" style="margin-bottom:14px" role="alert">${esc(authMsg)}</div>` : ''}<div class="auth-fields">${f[authTab]}</div>${(authAnimated = true) && ''}${V.office() && authTab !== 'customer' ? '<div class="auth-or"><span>or</span></div><button class="btn lg" data-act="officeContinue">Continue without signing in</button>' : ''}${authTab !== 'customer' ? '<div class="xs" style="margin-top:16px;text-align:center"><a href="#" data-act="adminSetup">Administrator sign-in</a></div>' : ''}</div></div></div>`;
  }
  // night skyline for the welcome / signed-out card (inline SVG, no scripts): moon, stars and a lit city in the Facilio colours
  const NIGHT_SKY = (() => {
    const st = [[18, 14, 1.2], [52, 34, 1], [96, 10, 1.4], [150, 30, 1], [214, 12, 1.2], [262, 40, 1], [300, 16, 1.4], [338, 36, 1], [66, 62, 1], [236, 70, 1]].map(([x, y, r], i) => `<circle class="ns-star s${i % 3}" cx="${x}" cy="${y}" r="${r}"/>`).join('');
    const bl = [[10, 92, 26, 34, '#1570EF'], [40, 74, 24, 52, '#1D1A5E'], [68, 100, 28, 26, '#E5197F'], [100, 58, 28, 68, '#1570EF'], [132, 84, 26, 42, '#2A2A80'], [162, 96, 24, 30, '#2EC9C4'], [190, 70, 26, 56, '#E5197F'], [220, 90, 24, 36, '#1570EF']];
    const b = bl.map(([x, y, w, h, c]) => { let win = ''; for (let yy = y + 6; yy < y + h - 4; yy += 9) for (let xx = x + 5; xx < x + w - 4; xx += 8) if (((xx * 7 + yy * 3) % 5) < 3) win += `<rect x="${xx}" y="${yy}" width="3.4" height="4.4" rx=".8" fill="#FFD66B" opacity=".85"/>`; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" opacity=".92"/>${win}`; }).join('');
    return `<svg viewBox="0 0 250 130" width="100%" height="130" role="presentation" focusable="false"><defs><radialGradient id="nsm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8DB8FF" stop-opacity=".5"/><stop offset="1" stop-color="#8DB8FF" stop-opacity="0"/></radialGradient></defs>${st}<circle cx="205" cy="34" r="30" fill="url(#nsm)"/><circle cx="205" cy="34" r="13" fill="#E9EEFF"/><circle cx="201" cy="30" r="2.6" fill="#C5CFEA"/><circle cx="209" cy="39" r="1.8" fill="#C5CFEA"/>${b}<rect x="0" y="126" width="250" height="1.5" fill="#3A4A9A" opacity=".7"/></svg>`;
  })();
  const CF_HTML = `<div class="fld"><label class="f" for="c_email">Email</label><input type="email" id="c_email" autocomplete="username" placeholder="you@company.com"></div><div class="fld"><label class="f" for="c_pw">Password</label><input type="password" id="c_pw" autocomplete="current-password" placeholder="Your password"></div><div class="cs-row"><a href="#" data-act="custForgot">Forgot password?</a></div><button class="btn primary lg" style="width:100%" data-act="doCustomerLogin">Sign in</button>`;
  // customer invite links (#/c/...): night sign-in with email, password and "Forgot password?", same style as the team welcome.
  // The skyline is livelier than the team one: buildings rise in, windows twinkle, a beacon blinks, a light runs the lane over the rooftops.
  const CUST_SKY = () => {
    const rm = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const st = [[18, 14, 1.2], [52, 34, 1], [96, 10, 1.4], [150, 30, 1], [214, 12, 1.2], [262, 40, 1], [300, 16, 1.4], [338, 36, 1], [66, 62, 1], [236, 70, 1]].map(([x, y, r], i) => `<circle class="ns-star s${i % 3}" cx="${x}" cy="${y}" r="${r}"/>`).join('');
    const bl = [[10, 92, 26, 34, '#1570EF'], [40, 74, 24, 52, '#1D1A5E'], [68, 100, 28, 26, '#E5197F'], [100, 58, 28, 68, '#1570EF'], [132, 84, 26, 42, '#2A2A80'], [162, 96, 24, 30, '#2EC9C4'], [190, 70, 26, 56, '#E5197F'], [220, 90, 24, 36, '#1570EF']];
    const b = bl.map(([x, y, w, h, c], i) => { let win = '', n = 0; for (let yy = y + 6; yy < y + h - 4; yy += 9) for (let xx = x + 5; xx < x + w - 4; xx += 8) if (((xx * 7 + yy * 3) % 5) < 3) { n++; win += `<rect${n % 3 === 0 ? ` class="cs-w" style="--d:${((xx + yy) % 7) * .45}s"` : ''} x="${xx}" y="${yy}" width="3.4" height="4.4" rx=".8" fill="#FFD66B" opacity=".85"/>`; } return `<g class="cs-b" style="--i:${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" opacity=".92"/>${win}</g>`; }).join('');
    const lane = 'M4 116 C 34 108, 58 120, 86 104 S 140 92, 170 96 S 222 84, 246 86';
    return `<svg viewBox="0 0 250 130" width="100%" height="130" role="presentation" focusable="false"><defs><radialGradient id="csm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8DB8FF" stop-opacity=".5"/><stop offset="1" stop-color="#8DB8FF" stop-opacity="0"/></radialGradient><linearGradient id="csl" x1="0" x2="1"><stop offset="0" stop-color="#8DB8FF"/><stop offset="1" stop-color="#E5197F"/></linearGradient></defs>${st}<line class="cs-shoot" x1="30" y1="14" x2="46" y2="20" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle class="cs-glow" cx="205" cy="34" r="30" fill="url(#csm)"/><circle cx="205" cy="34" r="13" fill="#E9EEFF"/><circle cx="201" cy="30" r="2.6" fill="#C5CFEA"/><circle cx="209" cy="39" r="1.8" fill="#C5CFEA"/>${b}<line x1="114" y1="58" x2="114" y2="47" stroke="#8DB8FF" stroke-width="1.2"/><circle class="cs-ring" cx="114" cy="45" r="3" fill="none" stroke="#E5197F" stroke-width="1"/><circle class="cs-bc" cx="114" cy="45" r="2.6" fill="#E5197F"/><path class="cs-lane" d="${lane}" fill="none" stroke="url(#csl)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="3 4"/>${rm ? '' : `<circle r="5" fill="#E5197F" opacity=".35"><animateMotion dur="6s" repeatCount="indefinite" path="${lane}"/></circle><circle r="2.2" fill="#fff"><animateMotion dur="6s" repeatCount="indefinite" path="${lane}"/></circle>`}<rect x="0" y="126" width="250" height="1.5" fill="#3A4A9A" opacity=".7"/><rect class="cs-car" x="-8" y="123.6" width="6" height="1.8" rx=".9" fill="#FFD66B"/><rect class="cs-car c2" x="-8" y="123.6" width="6" height="1.8" rx=".9" fill="#FF7AB8"/></svg>`;
  };
  function custAuthHtml() {
    return `<div class="auth-form night cust"><div class="auth-box"><div class="auth-sky night-sky cust-sky" aria-hidden="true">${CUST_SKY()}</div><div class="auth-hello">Welcome!</div><h2>Delivery Studio</h2><div class="sub">Sign in to follow your Facilio project, review sign-offs and find your guides.</div>${authMsg ? `<div class="cs-msg" role="alert">${esc(authMsg)}</div>` : ''}<div class="auth-fields">${CF_HTML}${root.FWBRun && S.user ? '<div class="cs-team">Facilio team member? <a href="#/" data-act="custTeam">Open workspace</a></div>' : ''}</div><ul class="auth-feats" aria-label="What you can do"><li><b>Milestones</b><span>Follow every step to go-live</span></li><li><b>Sign-offs</b><span>Review and approve in one place</span></li><li><b>Testing</b><span>UAT scripts and progress</span></li><li><b>Training</b><span>Guides and sessions</span></li></ul></div></div></div>`;
  }
  // Facilio Run build: sign-in is the Facilio Microsoft login the platform already did, so this screen is a welcome with one button
  let teamAuth = false;   // true after a Facilio team member signs out or the session ends
  ACT.reSignIn = () => { location.reload(); };
  function signedOutHtml() {
    return `<div class="auth-form night"><div class="auth-box"><div class="auth-sky night-sky" aria-hidden="true">${NIGHT_SKY}</div><div class="auth-hello">Signed out</div><h2>Delivery Studio</h2><div class="sub">${esc(authMsg || 'You have signed out. Sign in again with your Facilio account.')}</div><button class="btn primary lg" style="width:100%" data-act="reSignIn">Sign in with your Facilio account</button></div></div>`;
  }
  function authHtml() {
    if (teamAuth && !S.user && !/#\/c\/[A-Za-z0-9_-]+/.test(location.hash)) { const hb = authHtmlBase(); return hb.slice(0, hb.indexOf('<div class="auth-form">')) + signedOutHtml(); }
    const h = authHtmlBase(); if (/#\/c\/[A-Za-z0-9_-]+/.test(location.hash)) { const j = h.indexOf('<div class="auth-form">'); return h.slice(0, j) + custAuthHtml(); }
    if (!root.FWBRun || !S.user) return h; const i = h.indexOf('<div class="auth-form">'); const first = String(S.user.name || '').split(' ')[0] || 'there'; const initials = (String(S.user.name || S.user.email || '?').split(/[\s.@]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
    return h.slice(0, i) + `<div class="auth-form night"><div class="auth-box"><div class="auth-sky night-sky" aria-hidden="true">${NIGHT_SKY}</div><div class="auth-hello">${authMsg ? 'See you soon' : 'Welcome'}, ${esc(first)}</div><h2>Delivery Studio</h2>${authMsg ? `<div class="sub">${esc(authMsg)}</div>` : `<div class="aw-acct" title="Signed in with your Facilio account"><span class="aw-av" aria-hidden="true">${esc(initials)}</span><span class="aw-who"><b>${esc(S.user.name || first)}</b><small>${esc(S.user.email)}</small></span><span class="aw-ok">${ico('check')}Signed in</span></div>`}<div class="auth-fields"><button class="btn primary aw-go" type="button" data-act="runEnter"><span>Open workspace</span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button><div class="aw-hint">Your projects open where you left off</div></div><ul class="auth-feats aw-feats" aria-label="What is inside"><li><i>${ico('mic')}</i><span><b>Workshops</b>Plan sessions, capture notes</span></li><li><i>${ico('doc')}</i><span><b>Requirements</b>Confirm and sign off the BRD</span></li><li><i>${ico('flow')}</i><span><b>Build &amp; UAT</b>Forms, flows, defects</span></li><li><i>${ico('flag')}</i><span><b>Go-live</b>Hypercare and handover</span></li></ul></div></div></div>`;
  }
  function mountAuth() { document.querySelectorAll('.auth-box input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { const g = e.target.closest('.auth-key'); const b = g ? g.querySelector('.btn') : document.querySelector('.auth-box .btn.primary'); if (b) b.click(); } })); const f = document.querySelector('.auth-box input:not([value]):not([type=hidden])') || document.querySelector('.auth-box input'); if (f) f.focus(); }
  const val = id => (document.getElementById(id) || {}).value || '';
  ACT.runEnter = async () => { try { const au = document.querySelector('.auth'); if (au && !matchMedia('(prefers-reduced-motion: reduce)').matches) { au.classList.add('auth-leave'); await new Promise(r => setTimeout(r, 480)); } loading(true, 'Opening your workspace…'); authMsg = ''; await gate(afterLogin); } catch (e) { toast(e.message, 5000, true); } finally { loading(false); } };
  ACT.authTab = a => { authTab = a.getAttribute('data-v'); authMsg = ''; render(); };
  // sign-in goes straight to the home page: the tree intro already played first (the roadmap introduction is still in the account menu, Product introduction)
  async function gate(next) { return next(); }
  ACT.doLogin = async () => { try { loading(true, 'Signing in…'); const r = await API.post('/api/auth/login', { email: val('a_email'), password: val('a_pw') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doSignup = async () => { try { loading(true, 'Creating account…'); const r = await API.post('/api/auth/signup', { name: val('a_name'), email: val('a_email'), password: val('a_pw'), inviteCode: val('a_inv') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doGuest = async () => { try { loading(true, 'Creating your workspace…'); const r = await API.post('/api/auth/guest', { name: val('g_name'), inviteCode: val('g_code') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); showGuestKey(r.guestKey); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doGuestKey = async () => { try { loading(true, 'Opening your workspace…'); const r = await API.post('/api/auth/guest-login', { key: val('g_key') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  function showGuestKey(key) { drawer('Save your guest key', `<div class="notice warn" style="margin-bottom:14px"><div><b>Copy this key and keep it somewhere safe.</b> It is the only way back into your guest workspace on another browser or after you sign out. It is shown only once.</div></div><div class="row"><input type="text" readonly value="${esc(key)}" id="gk_val" class="mono"><button class="btn" data-act="copyGuestKey">${ico('copy')}Copy</button></div><p class="small muted" style="margin-top:12px">You can turn this guest workspace into a normal account (email + password) at any time from the menu under your initials.</p>`, '<button class="btn primary" data-act="closeDrawer">I have saved it</button>'); }
  ACT.copyGuestKey = async () => { const i = document.getElementById('gk_val'); try { await navigator.clipboard.writeText(i.value); toast('Guest key copied'); } catch (e) { i.select(); toast('Select the key and copy it'); } };
  ACT.upgradeGuest = () => { const p = document.getElementById('userPop'); if (p) p.remove(); drawer('Save as a full account', `<p class="small muted" style="margin-top:0">Add an email and password so you can sign in normally. Your projects stay as they are.</p><div class="fld"><label class="f">Work email</label><input type="email" id="up_email" autocomplete="username"></div><div class="fld" style="margin-top:10px"><label class="f">Password (min. 10 characters)</label><input type="password" id="up_pw" autocomplete="new-password"></div>`, '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="doUpgrade">Save account</button>'); };
  ACT.doUpgrade = async () => { const r = await API.post('/api/auth/upgrade', { email: val('up_email').trim(), password: val('up_pw') }); S.user = Object.assign(S.user, r.user); closeDrawer(); toast('Account saved — sign in with your email from now on'); render(); };
  // Customer email + password sign-in is designed but not switched on: the server has no customer accounts yet (see work/server/api.mjs).
  ACT.doCustomerLogin = () => { const em = val('c_email').trim(), pw = val('c_pw'); authMsg = !em || !pw ? 'Enter your email and password.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? 'Enter a valid email address.' : 'Customer sign-in is not switched on yet. Your Facilio project team will share access with you soon.'; render(); };
  ACT.custForgot = () => { authMsg = 'Password reset will be available when customer sign-in is switched on. For now, please contact your Facilio project team.'; render(); };
  ACT.custTeam = () => { history.replaceState(null, '', '#/'); authMsg = ''; render(); };
  ACT.doCustomer = async () => { try { loading(true, 'Opening project…'); let pid = val('c_pid').trim(), code = val('c_code').trim(); const lm = code.match(/\/c\/([A-Za-z0-9_-]+)(?:~([A-Za-z0-9_-]+))?/); if (lm) { pid = lm[1]; code = lm[2] || ''; if (!code) throw new Error('This link has no code in it. Ask your Facilio team for the full invite link, or add the access code.'); } const r = await API.post('/api/auth/customer', { projectId: pid || undefined, accessCode: code, name: val('c_name') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(() => openProject(r.user.projectId)); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };

  // ---------- projects ----------
  let projects = [];
  async function loadProjects() { projects = (await API.get('/api/projects')).projects; }
  const projInitials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const PTONE = ['#1570EF', '#E5197F', '#0E9F9F', '#E08A00', '#2F9E5B', '#2F5BD8'];
  const toneOf = (list, id) => PTONE[list.map(x => x.id).sort().indexOf(id) % PTONE.length]; // by place in the sorted list: every project differs and keeps its colour
  const PP_ICO = [
    '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .7 3 2.6 3 6"/>',
    '<path d="M5 4h14v16H5z"/><path d="M9 9l2 2 4-4M9 15h6"/>',
    '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6M9 7h3"/>',
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 8h6"/>',
    '<path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9z"/><circle cx="12" cy="10" r="1.5"/><path d="M9 18l-2 3 3-1M15 18l2 3-3-1"/>',
    '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'];
  V.PP_ICO = PP_ICO;
  const PP_STAGE = [
  ['<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', 'Sign &amp; scope'],
  ['<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .7 3 2.6 3 6"/>', 'Discover needs'],
  ['<path d="M5 4h14v16H5z"/><path d="M9 9l2 2 4-4M9 15h6"/>', 'Capture &amp; confirm'],
  ['<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6M9 7h3"/>', 'Write &amp; approve'],
  ['<path d="M4 12l5 5L20 6"/>', 'Test &amp; sign off'],
  ['<path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9z"/><circle cx="12" cy="10" r="1.5"/><path d="M9 18l-2 3 3-1M15 18l2 3-3-1"/>', 'Launch &amp; support']
];
function pjViewOf() { if (S.ui.pjView) return S.ui.pjView; let v = 'grid'; try { v = localStorage.getItem('fwb_pj_view') || 'grid'; } catch (e) { } return v === 'list' ? 'list' : 'grid'; }
function projectsHtml() {
    const q = (S.ui.projQ || '').toLowerCase(); const view = pjViewOf(), sort = S.ui.pjSort || 'recent';
    const cmp = { recent: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')), name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')), customer: (a, b) => String(a.customer || '').localeCompare(String(b.customer || '')) || String(a.name || '').localeCompare(String(b.name || '')), start: (a, b) => String(a.startDate || '9').localeCompare(String(b.startDate || '9')) }[sort] || (() => 0);
    const all = projects.filter(p => !q || (p.name + ' ' + p.customer + ' ' + (p.description || '')).toLowerCase().includes(q)).sort(cmp);
    const limit = S.ui.pjLimit || (view === 'list' ? 40 : 24), list = all.slice(0, limit), more = all.length - list.length;
    const hr = new Date().getHours(); const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; const nm = S.user && S.user.name && !S.user.guest && S.user.email && !/guest\.local$/.test(S.user.email) ? ', ' + String(S.user.name).split(' ')[0] : '';
    const last = projects.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    const wk = Date.now() - 7 * 864e5; const recent = projects.filter(p => p.updatedAt && new Date(p.updatedAt).getTime() > wk).length; const custs = new Set(projects.map(p => p.customer).filter(Boolean)).size;
    const newBtn = `<button class="btn primary" type="button" data-act="newProject">New project</button>`;
    const hero = `<section class="hm-hero night"><div class="hm-copy"><p class="hm-hi">${hello}${esc(nm)}</p><h1>Customer projects</h1><p class="hm-sub">Plan, organise and deliver customer implementations with the help of AI.</p>
        <div class="hm-actions"><button class="hm-btn primary" type="button" data-act="newProject"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New project</button><button class="hm-btn ghost" type="button" data-act="replayRoadmap"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Watch the introduction</button><button class="hm-btn ghost" type="button" data-act="teamGuide"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h6a3 3 0 013 3v11a2 2 0 00-2-2H4zM20 5h-6a3 3 0 00-3 3"/><path d="M20 5v12h-7"/></svg>Team guide</button></div></div>
        <div class="hm-art" aria-hidden="true">${NIGHT_SKY}</div></section>`;
    const stat2 = (n, l) => `<article class="cs-stat pp-stat"><div class="cs-stat-l pp-label">${l}</div><div class="cs-stat-v pp-value">${n}</div></article>`;
    const stats = `<section class="cs-stats hm-stats" aria-label="Project statistics">${stat2(projects.length, 'Projects')}${stat2(custs, 'Customers')}${stat2(recent, 'Updated this week')}${stat2(last ? esc(fmtDate(last.updatedAt)) : '—', 'Last activity')}</section>`;
    const bar = projects.length ? `<div class="hm-bar"><h2 class="cs-sub">Your projects <span class="hm-count">${all.length}${all.length !== projects.length ? ' of ' + projects.length : ''}</span></h2><label class="hm-search"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" id="projQ" placeholder="Search projects or customers" value="${esc(S.ui.projQ || '')}" aria-label="Search projects"></label><div class="hm-tools"><label class="pj-sort"><span class="sr-only">Sort by</span><select data-change="pjSort" aria-label="Sort projects">${[['recent', 'Recently updated'], ['name', 'Name'], ['customer', 'Customer'], ['start', 'Start date']].map(([v, l]) => `<option value="${v}"${sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label><div class="pj-view" role="group" aria-label="View"><button type="button" class="${view === 'grid' ? 'on' : ''}" data-act="pjView" data-v="grid" aria-pressed="${view === 'grid'}" title="Tiles"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg></button><button type="button" class="${view === 'list' ? 'on' : ''}" data-act="pjView" data-v="list" aria-pressed="${view === 'list'}" title="List"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div></div>` : '';
    return `<div class="projects-page pp hm cs-page">${hero}${stats}${bar}
      ${list.length ? (view === 'list' ? `<div class="pj-list" aria-label="Projects"><div class="pj-h" aria-hidden="true"><span>Project</span><span>Customer</span><span>Your role</span><span>Starts</span><span>Updated</span><span></span></div>${list.map(p => `<div class="pj-r" role="button" data-act="openProject" data-id="${esc(p.id)}" tabindex="0"><span class="pj-n"><span class="proj-av sm" style="--tone:${toneOf(all, p.id)}">${esc(projInitials(p.customer || p.name))}</span><b>${esc(p.name)}</b></span><span class="pj-c">${esc(p.customer || '')}</span><span>${tag(p.role === 'owner' ? 'blue' : p.role === 'viewer' ? 'low' : 'green', humanize(p.role))}</span><span class="pj-d">${p.startDate ? esc(fmtDate(p.startDate)) : '—'}</span><span class="pj-d">${esc(fmtDate(p.updatedAt))}</span><span>${p.role !== 'viewer' ? `<button class="btn sm" data-act="editProjectCard" data-id="${esc(p.id)}">${ico('edit')}Edit</button>` : ''}</span></div>`).join('')}</div>` : `<div class="grid g3 proj-grid">${list.map((p, k) => `<div class="card proj-card" style="--tone:${toneOf(all, p.id)};--d:${Math.min(k, 8) * 60}ms" data-act="openProject" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="row" style="align-items:flex-start;gap:12px"><div class="proj-av">${esc(projInitials(p.customer || p.name))}</div><div style="flex:1;min-width:0"><h3>${esc(p.name)}</h3><div class="cust">${esc(p.customer)}</div></div>${tag(p.role === 'owner' ? 'blue' : p.role === 'viewer' ? 'low' : 'green', humanize(p.role))}</div><div class="small muted proj-desc">${esc((p.description || '').slice(0, 140)) || 'No description yet.'}</div><div class="row proj-foot"><span class="xs muted" style="flex:1">Updated ${esc(fmtDate(p.updatedAt))}${p.startDate ? ' · starts ' + esc(fmtDate(p.startDate)) : ''}</span>${p.role !== 'viewer' ? `<button class="btn sm" data-act="editProjectCard" data-id="${esc(p.id)}">${ico('edit')}Edit details</button>` : ''}</div></div>`).join('')}</div>`) + (more > 0 ? `<div class="pj-more"><button type="button" class="btn" data-act="pjMore">Show ${Math.min(more, view === 'list' ? 40 : 24)} more<span class="muted"> · ${more} not shown</span></button></div>` : '')
        : projects.length ? `<div class="card empty"><h3>No project matches</h3><p>Try a different name or customer.</p></div>`
        : `<section class="cs-empty pp-empty"><h2>No projects yet</h2><p>Create a project for a customer implementation to start preparing workshops, or upload the customer's org package to set it up automatically.</p>${newBtn}</section>`}</div>`;
  }
  document.addEventListener('input', e => { if (e.target && e.target.id === 'projQ') { S.ui.projQ = e.target.value; const pos = e.target.selectionStart; if (mode === 'projects') { render(); const i = document.getElementById('projQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { } } } } });
  ACT.ppStage = async a => { const view = a.getAttribute('data-view'); const last = projects.slice().sort((x, y) => String(y.updatedAt || '').localeCompare(String(x.updatedAt || '')))[0]; if (!last) { toast('Create a project first to open this stage.'); return; } await openProject(last.id); go(view); };
  ACT.pjView = a => { S.ui.pjView = a.getAttribute('data-v') === 'list' ? 'list' : 'grid'; S.ui.pjLimit = 0; try { localStorage.setItem('fwb_pj_view', S.ui.pjView); } catch (e) { } render(); };
  ACT.pjSort = el => { S.ui.pjSort = el.value; S.ui.pjLimit = 0; render(); };
  ACT.pjMore = () => { S.ui.pjLimit = (S.ui.pjLimit || (pjViewOf() === 'list' ? 40 : 24)) + (pjViewOf() === 'list' ? 40 : 24); render(); };
  ACT.openProject = a => openProject(a.getAttribute('data-id'));
  ACT.editProjectCard = async (a, e) => { if (e) e.stopPropagation(); await openProject(a.getAttribute('data-id')); S.ui.setTab = 'project'; go('settings'); };
  ACT.newProject = () => { npZipFile = null; npMsaFile = null;
    const me = S.user || {}; const person = (k, who) => `<div class="row" style="margin-bottom:6px" data-person="${k}"><input type="text" placeholder="Name" style="flex:1" data-p="name" value="${esc(who ? who.name || '' : '')}"><input type="text" placeholder="${k === 'team' ? 'Role (e.g. Implementation Consultant)' : 'Role / department'}" style="flex:1" data-p="role"><input type="email" placeholder="Email" style="flex:1" data-p="email" value="${esc(who ? who.email || '' : '')}"></div>`;
    drawer('New project', `<div class="fgrid"><div class="full"><label class="f">Project name <span class="req">*</span></label><input type="text" id="np_name" placeholder="e.g. Facilio CAFM Implementation"></div>
      <div class="full"><label class="f">Customer / organisation <span class="req">*</span></label><input type="text" id="np_cust"></div>
      <div class="full"><label class="f">What are you delivering?</label><select id="np_type"><option value="cmms">Facilio CMMS implementation</option><option value="agents">Facilio AI agents on a connected CMMS (agent project)</option></select><div class="xs muted" style="margin-top:4px">An agent project hides the CMMS build pages (modules, state flows, data onboarding) and shows agent setup, connection, rules and testing instead.</div></div>
      <div class="full"><label class="f">Description</label><textarea id="np_desc" rows="3"></textarea></div></div>
      <div class="pink-label">Contract (MSA)</div><div id="np_msadrop" class="np-drop" role="button" tabindex="0" data-act="npMsa"><b>Drop your MSA here</b> <span class="small muted">or click to choose it (.pdf, .docx or .txt)</span><div id="np_msaname" class="small" style="margin-top:4px"></div></div><div class="xs muted" style="margin-top:4px">Optional. Claude reads it in the background and drafts the project plan, the requirement session plan and the kick-off deck. You only review and approve.</div>
      <div class="pink-label">Implementation team</div><div id="np_team">${person('team', { name: me.name, email: me.email })}${person('team')}</div><button class="btn sm" data-act="npAddPerson" data-k="team">${ico('plus')}Member</button>
      <div class="pink-label">Customer stakeholders</div><div id="np_stake">${person('stake')}${person('stake')}</div><button class="btn sm" data-act="npAddPerson" data-k="stake">${ico('plus')}Stakeholder</button>
      <div class="pink-label">Customer access</div><label class="f">Customer access code (optional, min. 8 characters)</label><input type="password" id="np_code" autocomplete="new-password"><div class="xs muted" style="margin-top:4px">Lets customer stakeholders open the user guide, schedule, kick-off deck and dashboards and send questions. It can be set or changed later in Project Settings.</div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="createProject">Create project</button>`);
    if (V.office()) { const c = document.getElementById('np_code'); if (c) [c.previousElementSibling, c.previousElementSibling && c.previousElementSibling.previousElementSibling, c.nextElementSibling, c].forEach(e => e && (e.style.display = 'none')); }
  };
  ACT.npAddPerson = a => { const k = a.getAttribute('data-k'); const host = document.getElementById(k === 'team' ? 'np_team' : 'np_stake'); const div = document.createElement('div'); div.innerHTML = host.firstElementChild.outerHTML; div.firstElementChild.querySelectorAll('input').forEach(i => i.value = ''); host.appendChild(div.firstElementChild); };
  let npZipFile = null, npMsaFile = null;
  const npSetMsa = f => { if (!f) return; if (!/\.(pdf|docx|txt)$/i.test(f.name)) { toast('The MSA must be a PDF, Word (.docx) or text file.', 5000, true); return; } if (f.size > 40 * 1024 * 1024) { toast('The MSA is larger than 40 MB.', 5000, true); return; } npMsaFile = f; const n = document.getElementById('np_msaname'); if (n) n.textContent = f.name + ' (' + Math.round(f.size / 1024).toLocaleString() + ' KB). It is uploaded when you create the project.'; };
  ACT.npMsa = async () => { const f = (await V.pickFile('.pdf,.docx,.txt'))[0]; npSetMsa(f); };
  document.addEventListener('dragover', e => { if (e.target && e.target.closest && e.target.closest('#np_msadrop')) e.preventDefault(); });
  document.addEventListener('drop', e => { const z = e.target && e.target.closest && e.target.closest('#np_msadrop'); if (!z) return; e.preventDefault(); npSetMsa(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  ACT.npZip = async () => { const f = (await V.pickFile('.zip'))[0]; if (!f) return; npZipFile = f; const n = document.getElementById('np_zipname'); if (n) n.textContent = f.name + ' (' + Math.round(f.size / 1024).toLocaleString() + ' KB)'; };
  ACT.createProject = async () => {
    const people = sel => Array.from(document.querySelectorAll(sel + ' [data-person]')).map(r => ({ name: r.querySelector('[data-p=name]').value.trim(), role: r.querySelector('[data-p=role]').value.trim(), email: r.querySelector('[data-p=email]').value.trim() })).filter(p => p.name);
    const body = { type: val('np_type') || 'cmms', name: val('np_name'), customer: val('np_cust'), description: val('np_desc'), team: people('#np_team'), stakeholders: people('#np_stake'), accessCode: val('np_code') || undefined };
    const bring = !!(document.getElementById('np_bring') || {}).checked;
    try { loading(true, 'Creating project…'); const r = await API.post('/api/projects', body); closeDrawer(); const zip = npZipFile; npZipFile = null; await openProject(r.project.id, true); API.post('/api/projects/' + r.project.id + '/jobs', { kind: 'setup_workspace' }).catch(() => { /* the folder and chat can also be set up later; not needed to use the project */ }); if (zip && V.loadOrgPackage) { const done = await V.loadOrgPackage(zip); if (!done) toast('The project was created, but the package was not loaded. You can load it again in Project Settings → Configuration source.', 9000, true); } const msa = npMsaFile; npMsaFile = null; if (msa && V.msaIngest) { try { await V.msaIngest(msa); } catch (e2) { toast('The project was created, but the MSA could not be uploaded: ' + (e2.message || 'try again on Contract intake'), 9000, true); } go('msaintake'); } else if (bring) go('transition'); }
    catch (e) { toast(e.message, 5000, true); } finally { loading(false); }
  };

  // ---------- open project ----------
  let refCache = null;
  async function openProject(id, isNew) {
    loading(true, 'Opening project…');
    try {
      const refP = (S.user.kind === 'consultant' && !refCache) ? API.reference().catch(() => null) : null; // start the reference download now, in parallel with the project data
      const consultantSections = ['workshop', 'people', 'planner', 'reviews', 'transcripts', 'dashboards', 'brddoc', 'plan', 'config', 'guide_published', 'schedule_published', 'portal_controls', 'portal_published', 'onboarding_published', 'plan_struct', 'ftr_wb', 'kpi_wb', 'workspace', 'config_digest'].concat(V.extraSections || []);
      const wanted = S.user.kind === 'customer' ? ['guide_published', 'schedule_published', 'dashboards', 'portal_controls', 'portal_published', 'onboarding_published', 'plan_struct', 'contract_prep'] : consultantSections.concat(['contract_prep']);
      // one request for project + members + documents + records (was ~18); falls back to the separate requests if it fails
      let bundle = null; try { bundle = await API.get('/api/projects/' + id + '/open?sections=' + wanted.join(',') + '&kinds=all'); } catch (e) { if (e.status === 404 || e.status === 403 || e.status === 401) throw e; }
      const r = bundle || await API.get('/api/projects/' + id); S.project = r.project; S.members = r.members || []; S.readonly = S.project.role === 'viewer' || S.project.role === 'customer';
      if (V.items) V.items.reset();
      await F.loadProjectDocs(id, wanted, bundle && bundle.docs);
      if (V.keepRestore) V.keepRestore(id);   // put back what was typed before a sign-out (src/session.js)
      if (bundle && V.items && V.items.prime) V.items.prime(bundle.items, bundle.kinds);
      if (S.user.kind === 'consultant') {
        const p = S.ws.project; if (!p.client) p.client = S.project.customer; if (!p.consultant) p.consultant = S.user.name;
        const cfg = F.doc('config');
        loadingMsg('Loading configuration…');
        if (cfg.source === 'imported' && cfg.importedFileId) { try { const d = await API.downloadFile(id, cfg.importedFileId); F.setBaseline(await API.gunzipJson(d.blob), Object.assign({ kind: 'imported', label: (cfg.importedMeta || {}).sourceName }, cfg.importedMeta)); } catch (e) { toast('Imported configuration could not be loaded — using the reference configuration. ' + e.message, 6000, true); refCache = refCache || (refP && await refP) || await API.reference(); F.setBaseline(refCache.baseline, refCache.meta); } }
        else { refCache = refCache || (refP && await refP) || await API.reference(); F.setBaseline(refCache.baseline, refCache.meta); }
        if (isNew) { F.changed('Project created', S.project.name, { render: false }); }
      }
      mode = 'workspace';
      const h = (location.hash.match(/#\/p\/[^/]+\/([a-z0-9_]+)(?:\/(.+))?/) || []);
      const custViews = navFor().flatMap(g => g.items.map(i => i[0]));
      const startView = S.user.kind === 'customer' ? (h[1] && custViews.includes(h[1]) ? h[1] : (custViews[0] || 'cust_home')) : (h[1] && V[h[1]] ? h[1] : (tabOn('overview') ? 'overview' : 'projdash'));
      go(startView, h[2] ? { module: decodeURIComponent(h[2]) } : {});
    } finally { loading(false); }
  }
  V.openProject = openProject;
  // links pasted or clicked while the app is already open (for example a Teams notice opened in the same tab) only change the hash:
  // follow them to the project and page they name. replaceState (used by go) does not fire this event, so there is no loop.
  window.addEventListener('hashchange', () => {
    if (mode !== 'workspace' && mode !== 'projects') return;
    const m = location.hash.match(/^#\/p\/([A-Za-z0-9_-]+)(?:\/([a-z0-9_]+)(?:\/(.+))?)?/); if (!m) return;
    if (!S.project || S.project.id !== m[1] || mode !== 'workspace') { if (S.user.kind !== 'customer' && projects.find(p => p.id === m[1])) openProject(m[1]).catch(e => toast(e.message, 5000, true)); return; }
    const view = m[2] && V[m[2]] ? m[2] : null; if (!view || (view === S.ui.view && !m[3])) return;
    go(view, m[3] ? { module: decodeURIComponent(m[3]) } : {});
  });
  async function afterLogin() { await loadProjects(); mode = 'projects'; const m = location.hash.match(/#\/p\/([A-Za-z0-9_-]+)/); if (m && projects.find(p => p.id === m[1])) return openProject(m[1]); history.replaceState(null, '', '#/projects'); render(); }
  V.refreshProjectMeta = async () => { const r = await API.get('/api/projects/' + S.project.id); S.project = r.project; S.members = r.members || []; render(); };

  root.FWBShell = {
    sessionExpired(msg) { if (mode === 'auth') return; if (V.office()) { location.reload(); return; } const cust = S.user && S.user.kind === 'customer'; teamAuth = !!(health.runMode && !cust && S.user); S.user = null; mode = 'auth'; authMsg = msg || (cust ? 'For your security your session has ended. Please sign in again to carry on.' : 'Your session has ended. Please sign in again.'); render(); },
    async conflict(section) {
      const ok = await confirmDialog('Changes conflict', `Someone else saved "${section}" while you were editing. Reload the latest version? Your unsaved changes in this section will be lost; other sections are kept.`, 'Reload latest');
      if (ok) await F.reloadSection(section);
    }
  };

  async function boot() {
    const app = document.getElementById('app'); app.innerHTML = '<div class="boot"><img src="brand/logo-navy.png" alt="Facilio" height="30"><div class="boot-bar"><span></span></div></div>';
    try { const me = await API.get('/api/auth/me', { noAuthRedirect: true }); health.signupEnabled = !!me.signupEnabled; health.signupNeedsCode = me.signupNeedsCode !== false; health.openMode = !!me.openMode; health.runMode = !!me.runMode; if (!health.signupEnabled && authTab === 'signup') authTab = 'login'; S.user = me.user; }
    catch (e) { app.innerHTML = `<div style="padding:60px;text-align:center"><h2>Service unavailable</h2><p class="muted">${esc(e.message)}. The Delivery Studio server could not be reached. Please try again in a moment.</p></div>`; return; }
    if (!S.user) { teamAuth = !!(health.runMode && !/#\/c\/[A-Za-z0-9_-]+/.test(location.hash)); mode = 'auth'; render(); return; }
    if (root.FWBRun && !/#\/p\//.test(location.hash)) { mode = 'auth'; render(); return; }
    if ((health.openMode || S.user.kind === 'customer') && V.roadmap && V.roadmapDue && V.roadmapDue({ once: true })) { try { await V.roadmap(); } catch (e) { } }
    try { if (S.user.kind === 'customer') await openProject(S.user.projectId); else await afterLogin(); } catch (e) { toast(e.message, 5000, true); mode = S.user.kind === 'customer' ? 'auth' : 'projects'; render(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
