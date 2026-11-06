/* Bring your project in (menu: 1. Kick-off & Planning). Drop the documents a project already has; each is classified in the browser (src/transitionlogic.js) from its name and a small peek,
   shown in a review table, and only then stored under the right category with the same chunked upload every other page uses (API.uploadFile).
   Built for big files: the page reads only the tail of a zip-based file and the first few KB of a text file, never a whole file; files are sent ONE AT A TIME, 16 MB parts straight to storage;
   the server keeps a per-project file space and a limit on unfinished uploads (work/server/api.mjs). No AI is used here: a person decides, and each destination page has its own importer. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const T = () => root.FWBTransition; const { toast } = V;
  const MAX_FILES = 200, SPACE = 1000e6; let Q = [], seq = 0, busy = false, used = null, usedFor = '';
  const ext = n => (String(n).split('.').pop() || '').toLowerCase();
  // ---- a small peek at a file: never the whole file ----
  const u32 = (d, o) => d.getUint32(o, true), u16 = (d, o) => d.getUint16(o, true);
  async function inflate(bytes, method) {
    if (method === 0) return new Blob([bytes]).text();
    if (typeof DecompressionStream === 'undefined') return '';
    const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(bytes).catch(() => { }); w.close().catch(() => { }); const r = ds.readable.getReader(); const out = []; let n = 0;
    try { for (; ;) { const x = await r.read(); if (x.done) break; out.push(x.value); n += x.value.length; if (n > 300000) break; } } catch (e) { }
    return new Blob(out).text();
  }
  async function zipPeek(file) {
    const res = { names: [], workbook: '', docx: '' }; const tailN = Math.min(file.size, 1 << 20); const tail = new DataView(await file.slice(file.size - tailN).arrayBuffer()); let e = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { e = i; break; } if (e < 0) return res;
    const count = u16(tail, e + 10), cdSize = u32(tail, e + 12), cdOff = u32(tail, e + 16); if (cdOff === 0xFFFFFFFF || cdSize > 8e6) return res;   // shortcut: zip64 archives are not peeked, the name decides
    const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer()); const dec = new TextDecoder(); let p = 0; const want = {};
    for (let k = 0; k < Math.min(count, 5000) && p + 46 <= cd.byteLength && u32(cd, p) === 0x02014b50; k++) { const nl = u16(cd, p + 28), xl = u16(cd, p + 30), cl = u16(cd, p + 32); const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl)); res.names.push(name); if (name === 'xl/workbook.xml' || name === 'word/document.xml') want[name] = { m: u16(cd, p + 10), c: u32(cd, p + 20), o: u32(cd, p + 42) }; p += 46 + nl + xl + cl; }
    for (const [name, z] of Object.entries(want)) { const lh = new DataView(await file.slice(z.o, z.o + 30).arrayBuffer()); if (u32(lh, 0) !== 0x04034b50) continue; const start = z.o + 30 + u16(lh, 26) + u16(lh, 28); const txt = await inflate(new Uint8Array(await file.slice(start, start + Math.min(z.c, 400000)).arrayBuffer()), z.m); if (name === 'xl/workbook.xml') res.workbook = txt; else res.docx = txt; }
    return res;
  }
  async function peek(file) {
    const e = ext(file.name), out = { text: '', sheets: [], entries: [] };
    try {
      if (/^(txt|vtt|srt|csv|json|eml)$/.test(e)) out.text = await file.slice(0, 6000).text();
      else if (/^(docx|xlsx|xlsm|pptx|zip)$/.test(e)) { const z = await zipPeek(file); out.entries = z.names; out.sheets = [...z.workbook.matchAll(/<sheet [^>]*?name="([^"]+)"/g)].map(m => m[1]); out.text = z.docx.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000); }
    } catch (err) { }
    return out;
  }
  // ---- the queue ----
  async function add(files, zone) {
    files = [...files]; if (!files.length) return; if (Q.length + files.length > MAX_FILES) { toast('Up to ' + MAX_FILES + ' files at a time. Send these first, then add more.', 6000, true); files = files.slice(0, Math.max(0, MAX_FILES - Q.length)); }
    for (const f of files) { const pk = await peek(f); let c = zone ? T().fit(zone, f.name) : null; let note = ''; if (zone && !c) { c = T().classify(f.name, f.size, pk); note = 'A .' + ext(f.name) + ' file cannot go in the "' + T().WHERE[zone][0] + '" box. ' ; c.reason = note + c.reason; } else if (!c) c = T().classify(f.name, f.size, pk); Q.push({ id: 'q' + (++seq), file: f, size: f.size, cls: c, category: c.category, state: c.category === 'email' ? 'inbox' : c.category ? 'ready' : 'skipped', pct: 0, msg: '' }); }
    V.render();
  }
  async function loadUsed() { if (!S.project || usedFor === S.project.id) return; usedFor = S.project.id; try { const r = await API.get(`/api/projects/${S.project.id}/files?versions=1`); used = (r.files || []).reduce((n, f) => n + (Number(f.size) || 0), 0); } catch (e) { used = null; } V.render(); }
  const todo = () => Q.filter(x => x.state === 'ready' && x.category);
  const opts = sel => Object.entries(T().WHERE).filter(([k]) => k !== '').map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(k === 'email' ? 'Inbox (add the e-mail there)' : v[0])}</option>`).join('') + `<option value=""${sel === '' ? ' selected' : ''}>Do not store</option>`;
  const tag = c => c === 'high' ? '<span class="tag green">Sure</span>' : c === 'medium' ? '<span class="tag tbc">Likely</span>' : '<span class="tag">Please check</span>';
  const rowHtml = x => { const w = T().WHERE[x.category] || T().WHERE['']; const st = x.state === 'uploading' ? `<div class="bar" style="height:6px;background:#e3e9f5;border-radius:4px"><i style="display:block;height:6px;width:${Math.round(x.pct * 100)}%;background:#1570EF;border-radius:4px"></i></div><div class="xs muted">Sending ${Math.round(x.pct * 100)}%</div>` : x.state === 'done' ? '<span class="tag green">Stored</span>' : x.state === 'error' ? `<span class="tag red">Not stored</span><div class="xs">${esc(x.msg)}</div>` : x.state === 'inbox' ? '<button class="btn sm" data-act="nav" data-view="inbox">Open Inbox</button>' : x.state === 'skipped' ? '<span class="xs muted">Skipped</span>' : '<span class="xs muted">Waiting</span>';
    return `<tr><td><b>${esc(x.file.name)}</b><div class="xs muted">${esc(T().size(x.size))}</div></td><td>${x.state === 'ready' || x.state === 'skipped' ? `<select data-change="trCat" data-id="${x.id}">${opts(x.category)}</select>` : esc(w[0])}<div class="xs muted" style="margin-top:3px">${tag(x.cls.confidence)} ${esc(x.cls.reason)}</div></td><td style="min-width:150px">${st}</td><td>${busy || x.state === 'uploading' || x.state === 'done' ? '' : `<button class="btn sm" data-act="trDrop" data-id="${x.id}" aria-label="Remove ${esc(x.file.name)}">Remove</button>`}</td></tr>`; };
  function nextSteps() {
    const by = {}; Q.filter(x => x.state === 'done').forEach(x => { const w = T().WHERE[x.category]; (by[w[1]] = by[w[1]] || { label: w[0], n: 0 }).n++; }); const keys = Object.keys(by); if (!keys.length) return '';
    return `<div class="card" style="margin-top:14px"><div class="card-h"><h3>Next: open each area and use its importer</h3></div><div class="card-b"><p class="small muted" style="margin-top:0">The files are stored. Each area reads its own files: open it and press its Analyse or Import button.</p>${keys.map(v => `<div class="row" style="gap:8px;padding:6px 0;align-items:center"><div style="flex:1"><b>${esc(by[v].label)}</b> <span class="xs muted">${by[v].n} file${by[v].n > 1 ? 's' : ''}</span></div><button class="btn sm" data-act="nav" data-view="${esc(v)}">Open</button></div>`).join('')}</div></div>`;
  }
  const ext1 = k => k === 'email' ? '.eml' : '.' + (T().ALLOWED[k] || '').split(' ').join(' .');
  const zoneHtml = (k, name, hint, wide) => `<label class="tr-zone${wide ? ' wide' : ''}" data-zone="${k}"><input type="file" data-change="trPick" data-cat="${k}" multiple hidden><b>${esc(name)}</b><span class="xs muted">${esc(hint)}</span></label>`;
  V.transition = {
    html() {
      if (!S.project) return `<div class="page-header"><div class="t"><h1>Bring your project in</h1><p>Open a project first.</p></div></div>`;
      loadUsed(); const t = todo(), tot = t.reduce((n, x) => n + x.size, 0), left = used == null ? null : SPACE - used;
      const over = left != null && tot > left; const sp = used == null ? '' : `Project file space: ${T().size(used)} of ${T().size(SPACE)} used.`;
      const table = Q.length ? `<div class="card" style="margin-top:14px"><div class="card-h"><h3>${Q.length} file${Q.length > 1 ? 's' : ''}</h3><span class="small muted">${t.length} to send (${T().size(tot)}). Change where a file goes if the guess is wrong.</span></div><div class="card-b" style="overflow:auto"><table class="tbl small"><thead><tr><th>File</th><th>Goes to</th><th>Status</th><th></th></tr></thead><tbody>${Q.map(rowHtml).join('')}</tbody></table>
        ${over ? `<div class="notice warn small" style="margin-top:10px">These files are larger than the space left in this project (${T().size(left)}). Remove some, or ask an admin.</div>` : ''}<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" data-act="trSend"${t.length && !busy && !over ? '' : ' disabled'}>${busy ? 'Sending…' : 'Send ' + t.length + ' file' + (t.length === 1 ? '' : 's')}</button><button class="btn" data-act="trClear"${busy ? ' disabled' : ''}>Clear the list</button><span class="spacer"></span><span class="xs muted">${esc(sp)}</span></div></div></div>` : '';
      return `<div class="page-header"><div class="t"><h1>Bring your project in</h1><p>Moving a project to this team, or starting one that already has documents? Drop them all here. Delivery Studio suggests where each belongs and waits for your OK. Nothing is sent until you press Send.</p></div></div>
        <div class="page-body"><div class="tr-zones">${T().ZONES.map(([k, n]) => zoneHtml(k, n, ext1(k))).join('')}${zoneHtml('', 'Drop anything', 'Anything else, or a mix of files. Delivery Studio guesses where each goes and you check it below. Up to ' + MAX_FILES + ' at a time.', true)}</div>
        <div class="small muted" style="margin:10px 2px">Big files are fine: only the name and a small peek of each file are read here, and files are sent one at a time straight to storage in 16 MB parts. A project keeps up to ${T().size(SPACE)} of files; each file type has its own size limit.</div>${table}${nextSteps()}</div>`;
    },
    mount() {
      const stop = e => { e.preventDefault(); e.stopPropagation(); };
      document.querySelectorAll('.tr-zone').forEach(z => { const k = z.getAttribute('data-zone');
        ['dragenter', 'dragover'].forEach(n => z.addEventListener(n, e => { stop(e); z.classList.add('over'); })); z.addEventListener('dragleave', e => { stop(e); z.classList.remove('over'); });
        z.addEventListener('drop', e => { stop(e); z.classList.remove('over'); if (!S.readonly) add(e.dataTransfer.files, k); }); });
    }
  };
  ACT.trPick = el => { if (S.readonly) return; const f = [...el.files]; el.value = ''; return add(f, el.getAttribute('data-cat')); };
  ACT.trCat = el => { const x = Q.find(q => q.id === el.getAttribute('data-id')); if (!x) return; x.category = el.value; x.state = el.value === 'email' ? 'inbox' : el.value ? 'ready' : 'skipped'; V.render(); };
  ACT.trDrop = a => { Q = Q.filter(q => q.id !== a.getAttribute('data-id')); V.render(); };
  ACT.trClear = () => { if (!busy) { Q = []; V.render(); } };
  ACT.trSend = async () => {
    if (busy || S.readonly) return; busy = true; V.render(); let stop = '';
    for (const x of todo()) {
      if (stop) { x.msg = stop; x.state = 'error'; continue; }
      x.state = 'uploading'; x.pct = 0; V.render();
      try { await API.uploadFile(S.project.id, x.file, x.category, { source: 'bring-in' }, null, p => { x.pct = p; const el = document.querySelector(`[data-change="trCat"][data-id="${x.id}"]`); if (!el) V.render(); }); x.state = 'done'; used = (used || 0) + x.size; if (x.category === 'msa' && V.koAutoPull) V.koAutoPull(x.file.name); }
      catch (e) { x.state = 'error'; x.msg = e.message || 'The upload failed'; if (e.status === 413 || e.status === 429) stop = 'Not sent: ' + x.msg; }   // a full project or too many unfinished uploads: stop instead of failing every file
    }
    busy = false; usedFor = ''; V.render(); const ok = Q.filter(x => x.state === 'done').length; toast(ok + ' file' + (ok === 1 ? '' : 's') + ' stored' + (Q.some(x => x.state === 'error') ? '. Some were not sent: see the list.' : '.'), 5000, Q.some(x => x.state === 'error'));
  };
})(typeof window !== 'undefined' ? window : globalThis);
