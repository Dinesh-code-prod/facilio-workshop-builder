/* Document viewers: Kick-off Deck (original PPTX rendered with @aiden0z/pptx-renderer, or PDF with pdf.js — not restyled)
   and the Dashboard Gallery (PDF references by category). Files are private project files downloaded through the API. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT;
  const { tag, sel, drawer, closeDrawer, toast, ico, confirmDialog, loading } = V;

  // ---------- shared helpers ----------
  let pdfjsP = null;
  V.pdfjs = () => pdfjsP || (pdfjsP = import(new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href).then(m => { m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href; return m; }));
  let pptxP = null; const pptxLib = () => pptxP || (pptxP = import(new URL('vendor/pptx-renderer.es.js', document.baseURI).href));
  const blobCache = new Map(); // fileId -> Promise<Blob> (session memory only)
  V.fileBlob = (fileId, onProgress) => { if (!blobCache.has(fileId)) blobCache.set(fileId, API.downloadFile(S.project.id, fileId, onProgress).then(d => d.blob).catch(e => { blobCache.delete(fileId); throw e; })); return blobCache.get(fileId); };
  V.listFiles = async (category, versions) => (await API.get(`/api/projects/${S.project.id}/files?category=${category}${versions ? '&versions=1' : ''}`)).files;
  const fileState = {}; // category -> { files, loading, error }
  V.filesFor = (category, versions) => { const k = category + (versions ? ':v' : ''); const st = fileState[k]; if (st && st.project === S.project.id && !st.stale) return st; const ns = fileState[k] = { project: S.project.id, files: st && st.project === S.project.id ? st.files : null, loading: !(st && st.files) }; V.listFiles(category, versions).then(f => { ns.files = f; ns.loading = false; V.render(); }).catch(e => { ns.error = e.message; ns.loading = false; V.render(); }); return ns; };
  V.invalidateFiles = category => { Object.keys(fileState).forEach(k => { if (k.split(':')[0] === category) fileState[k].stale = true; }); };

  // A persistent viewer element survives app re-renders (re-rendering a deck on every keystroke elsewhere would be slow).
  const live = {}; // slot -> { key, el, api }
  function hostLive(slot, key, build) {
    const host = document.getElementById(slot + 'Host'); if (!host) return;
    let L = live[slot]; if (!L || L.key !== key) { if (L && L.api && L.api.destroy) try { L.api.destroy(); } catch (e) { } const el = document.createElement('div'); el.className = 'viewer-live'; L = live[slot] = { key, el, api: null }; build(L).catch(e => { el.innerHTML = `<div class="notice err" style="margin:20px">${esc(e.message || 'The file could not be displayed')}. You can still download the original.</div>`; }); }
    host.appendChild(L.el);
  }
  V.hostLive = hostLive;

  // ---------- generic paged viewer (thumbnails, prev/next, zoom, fullscreen) ----------
  function viewerShell(slot, title, extra) {
    return `<div class="viewer${S.ui[slot + 'Thumbs'] === false ? ' nothumbs' : ''}" id="${slot}Viewer"><div class="thumbs" id="${slot}Thumbs" aria-label="Pages"></div><div class="stage"><div class="stage-bar"><button class="btn sm" data-act="vwThumbs" data-slot="${slot}" aria-label="Toggle thumbnails">☰</button><button class="btn sm" data-act="vwNav" data-slot="${slot}" data-d="-1" aria-label="Previous">${ico('left')}</button><span id="${slot}Pos" class="small" style="min-width:70px;text-align:center">–</span><button class="btn sm" data-act="vwNav" data-slot="${slot}" data-d="1" aria-label="Next">${ico('right')}</button><span class="sep" style="width:1px;height:22px;background:#4a515c"></span><button class="btn sm" data-act="vwZoom" data-slot="${slot}" data-d="-10" aria-label="Zoom out">${ico('zoomout')}</button><span id="${slot}Zoom" class="xs" style="min-width:42px;text-align:center">Fit</span><button class="btn sm" data-act="vwZoom" data-slot="${slot}" data-d="10" aria-label="Zoom in">${ico('zoomin')}</button><button class="btn sm" data-act="vwZoom" data-slot="${slot}" data-d="0">Fit</button><span class="spacer"></span><span class="small" style="opacity:.8">${esc(title || '')}</span><span class="spacer"></span>${extra || ''}<button class="btn sm" data-act="vwFull" data-slot="${slot}" aria-label="Full screen">${ico('full')}</button></div><div class="stage-body" id="${slot}Host"></div></div></div>`;
  }
  V.viewerShell = viewerShell;
  function paint(slot) { const L = live[slot]; if (!L || !L.api) return; const p = document.getElementById(slot + 'Pos'); if (p) p.textContent = (L.api.index + 1) + ' / ' + L.api.count; const z = document.getElementById(slot + 'Zoom'); if (z) z.textContent = L.api.zoom ? L.api.zoom + '%' : 'Fit'; const th = document.getElementById(slot + 'Thumbs'); if (th) { if (L.thumbs && th.firstChild !== L.thumbs) { th.innerHTML = ''; th.appendChild(L.thumbs); } if (L.thumbs) L.thumbs.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('on', i === L.api.index)); } }
  ACT.vwNav = a => { const L = live[a.getAttribute('data-slot')]; if (!L || !L.api) return; L.api.go(L.api.index + Number(a.getAttribute('data-d'))); };
  ACT.vwZoom = a => { const L = live[a.getAttribute('data-slot')]; if (!L || !L.api) return; const d = Number(a.getAttribute('data-d')); L.api.setZoom(d === 0 ? 0 : Math.max(30, Math.min(300, (L.api.zoom || 100) + d))); };
  ACT.vwThumbs = a => { const s = a.getAttribute('data-slot'); S.ui[s + 'Thumbs'] = S.ui[s + 'Thumbs'] === false; const v = document.getElementById(s + 'Viewer'); if (v) v.classList.toggle('nothumbs', S.ui[s + 'Thumbs'] === false); };
  ACT.vwFull = a => { const v = document.getElementById(a.getAttribute('data-slot') + 'Viewer'); if (!v) return; if (document.fullscreenElement) document.exitFullscreen(); else if (v.requestFullscreen) v.requestFullscreen().catch(() => v.classList.toggle('fs')); else v.classList.toggle('fs'); };
  document.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return; const slot = ['deck', 'dash'].find(s => document.getElementById(s + 'Viewer')); if (!slot) return; const L = live[slot]; if (!L || !L.api) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') { L.api.go(L.api.index + 1); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { L.api.go(L.api.index - 1); e.preventDefault(); } });

  // PDF renderer
  async function buildPdf(slot, L, blob) {
    const pdfjs = await V.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
    const stage = document.createElement('div'); stage.className = 'slide-host'; L.el.appendChild(stage); let task = null;
    const api = L.api = { index: 0, count: doc.numPages, zoom: 0, destroy() { try { doc.destroy(); } catch (e) { } },
      async go(i) { i = Math.max(0, Math.min(doc.numPages - 1, i)); api.index = i; paint(slot); const page = await doc.getPage(i + 1); const host = document.getElementById(slot + 'Host'); const avail = host ? host.clientWidth - 40 : 900; const vp1 = page.getViewport({ scale: 1 });
        const scale = api.zoom ? api.zoom / 100 * 1.333 : Math.max(0.3, Math.min(4, avail / vp1.width)); const dpr = window.devicePixelRatio || 1; const vp = page.getViewport({ scale });
        const c = document.createElement('canvas'); c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr); c.style.width = Math.floor(vp.width) + 'px'; c.style.height = Math.floor(vp.height) + 'px';
        if (task) try { task.cancel(); } catch (e) { } task = page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }); try { await task.promise; } catch (e) { if (e && e.name === 'RenderingCancelledException') return; throw e; } stage.innerHTML = ''; stage.appendChild(c); },
      setZoom(z) { api.zoom = z; api.go(api.index); } };
    const th = L.thumbs = document.createElement('div'); for (let i = 0; i < doc.numPages; i++) { const t = document.createElement('div'); t.className = 'thumb'; t.innerHTML = `<span class="n">${i + 1}</span>`; t.addEventListener('click', () => api.go(i)); th.appendChild(t); }
    await api.go(0); paint(slot);
    (async () => { for (let i = 0; i < Math.min(doc.numPages, 200); i++) { const page = await doc.getPage(i + 1); const vp = page.getViewport({ scale: 150 / page.getViewport({ scale: 1 }).width }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = '100%'; await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; th.children[i].prepend(c); } })().catch(() => { });
  }
  V.buildPdf = buildPdf;
  // PPTX renderer (original slides; no restyling)
  async function buildPptx(slot, L, blob) {
    const lib = await pptxLib(); const stage = document.createElement('div'); stage.className = 'slide-host'; L.el.appendChild(stage);
    const host = document.getElementById(slot + 'Host'); const width = Math.max(480, (host ? host.clientWidth : 1000) - 40);
    const viewer = await lib.PptxViewer.open(await blob.arrayBuffer(), stage, { zipLimits: lib.RECOMMENDED_ZIP_LIMITS, renderMode: 'slide', width, fitMode: 'contain', lazyMedia: true });
    const api = L.api = { index: 0, count: viewer.slideCount, zoom: 0, destroy() { try { viewer.destroy(); } catch (e) { } },
      async go(i) { i = Math.max(0, Math.min(viewer.slideCount - 1, i)); api.index = i; paint(slot); await viewer.goToSlide(i); },
      async setZoom(z) { api.zoom = z; if (z) { await viewer.setFitMode('none'); await viewer.setZoom(z); } else { await viewer.setFitMode('contain'); } paint(slot); } };
    const th = L.thumbs = document.createElement('div');
    for (let i = 0; i < viewer.slideCount; i++) { const t = document.createElement('div'); t.className = 'thumb'; t.innerHTML = `<div class="tb" style="width:160px;height:${Math.round(160 * viewer.slideHeight / viewer.slideWidth)}px;overflow:hidden"></div><span class="n">${i + 1}</span>`; t.addEventListener('click', () => api.go(i)); th.appendChild(t); }
    paint(slot);
    (async () => { for (let i = 0; i < Math.min(viewer.slideCount, 150); i++) { try { viewer.renderThumbnailToContainer(i, th.children[i].firstChild, { width: 160 }); } catch (e) { } await new Promise(r => setTimeout(r, 15)); } })();
  }

  // ================= KICK-OFF DECK =================
  // The deck is kept as a file (download / replace / versions); it is not rendered. "Read the deck with AI" extracts the slide text and tables
  // in the browser, the server asks the model for the teams, governance, dates, scope, risks and next steps, and the team reviews what to keep.
  // What is kept lands in the project's people list (Facilio team / customer stakeholders) and in the kick-off summary below.
  V.extraSections = (V.extraSections || []).concat(['kickoff_info']);
  const KI = () => { let d = F.doc('kickoff_info'); if (!d || typeof d !== 'object') { S.docs.kickoff_info.data = d = {}; } d.objectives = d.objectives || []; d.scope = d.scope || []; d.keyDates = d.keyDates || []; d.risks = d.risks || []; d.meetings = d.meetings || []; d.insights = d.insights || []; d.nextSteps = d.nextSteps || []; return d; };
  const fsize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  V.kickoff = { html() {
    const st = V.filesFor('kickoff', true); const files = (st.files || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); const cur = files.find(f => !f.supersededBy); const ro = S.readonly; const cust = S.user.kind === 'customer';
    const head = `<div class="page-header"><div class="t"><h1>Kick-off Deck</h1><p>${cust ? 'The project kick-off presentation and what was agreed at kick-off.' : 'Keep the kick-off deck here and let AI read the teams, governance, key dates and next steps out of it. You review everything before it is saved.'}</p></div><div class="row">${cur ? `<button class="btn" data-act="dlFile" data-id="${esc(cur.id)}" data-name="${esc(cur.name)}">${ico('dl')}Download deck</button>` : ''}${ro ? '' : `<button class="btn${cur ? '' : ' primary'}" data-act="uploadDeck" data-replace="${esc(cur ? cur.id : '')}">${ico('upl')}${cur ? 'Replace deck' : 'Upload deck'}</button>`}${cur && !ro && !cust ? `<button class="btn primary" data-act="kiRead" data-id="${esc(cur.id)}">${ico('spark')}Read the deck with AI</button>` : ''}</div></div>`;
    if (st.loading) return head + '<div class="page-body"><div class="empty">Loading…</div></div>';
    if (st.error) return head + `<div class="page-body"><div class="notice err">${esc(st.error)}</div></div>`;
    const k = KI();
    const fileCard = cur ? `<div class="card ki-file"><div class="ki-ic">${/\.pdf$/i.test(cur.name) ? 'PDF' : 'PPT'}</div><div class="ki-fm"><b>${esc(cur.name)}</b><span class="small muted">${fsize(cur.size || 0)} · uploaded ${esc(new Date(cur.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}${k.readAt ? ` · read by AI ${esc(new Date(k.readAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}${k.readBy ? ' (' + esc(k.readBy) + ')' : ''}` : ''}</span></div>${k.readAt && k.readFile !== cur.id && !ro && !cust ? '<span class="tag amber">A newer deck has not been read yet</span>' : ''}</div>`
      : `<div class="card empty"><h3>No kick-off deck yet</h3><p>${ro ? 'The implementation team has not uploaded the kick-off deck yet.' : 'Upload the PowerPoint (.pptx) or PDF kick-off deck. Then let AI read the teams and key facts from it.'}</p>${ro ? '' : `<button class="btn primary" data-act="uploadDeck" data-replace="">${ico('upl')}Upload deck</button>`}</div>`;
    const versions = files.length > 1 && !cust ? `<details class="ki-ver"><summary>Earlier versions (${files.length - 1})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>File</th><th>Uploaded</th><th>Size</th><th></th></tr></thead><tbody>${files.filter(f => f.supersededBy).map(f => `<tr><td>${esc(f.name)}</td><td>${esc(new Date(f.createdAt).toLocaleString())}</td><td>${fsize(f.size || 0)}</td><td><button class="btn sm" data-act="dlFile" data-id="${esc(f.id)}" data-name="${esc(f.name)}">${ico('dl')}Download</button></td></tr>`).join('')}</tbody></table></div></details>` : '';
    const list = (title, items, fmt) => items.length ? `<div class="card"><div class="card-h"><h3>${title}</h3></div><div class="card-b"><ul class="ki-list">${items.map(x => `<li>${fmt ? fmt(x) : esc(x)}</li>`).join('')}</ul></div></div>` : '';
    const summary = (k.objectives.length + k.scope.length + k.keyDates.length + k.risks.length + k.nextSteps.length + k.insights.length) ? `<div class="grid g2 ki-sum">${list('Objectives', k.objectives)}${list('Scope', k.scope)}${list('Key dates', k.keyDates, x => `<b>${esc(x.date ? V.fmtDate(x.date) : 'Date to confirm')}</b> · ${esc(x.label)}`)}${list('Next steps', k.nextSteps, x => `${esc(x.action)}${x.owner ? ` <span class="muted">· ${esc(x.owner)}</span>` : ''}${x.due ? ` <span class="muted">· by ${esc(V.fmtDate(x.due))}</span>` : ''}`)}${list('Risks raised', k.risks)}${list('Notes and insights', k.insights.concat(k.meetings))}</div>` : '';
    return head + `<div class="page-body">${fileCard}${versions}${summary}</div>`;
  }, mount() { } };

  // slide text: every paragraph and every table row (cells joined with " | "), slide by slide; PDF decks through pdf.js
  async function deckText(blob, name) {
    if (/\.pdf$/i.test(name)) { const pdfjs = await V.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; let out = ''; for (let i = 1; i <= Math.min(doc.numPages, 80); i++) { const c = await (await doc.getPage(i)).getTextContent(); out += `\n--- Slide ${i}\n` + c.items.map(x => x.str).join(' '); } return out; }
    const files = await V.zipTexts(blob, n => /^ppt\/slides\/slide\d+\.xml$/.test(n), { maxBytes: 40 * 1024 * 1024 });
    files.sort((a, b) => Number(a.name.match(/(\d+)\.xml$/)[1]) - Number(b.name.match(/(\d+)\.xml$/)[1]));
    const dp = new DOMParser(); let out = '';
    for (const f of files) {
      const x = dp.parseFromString(f.text, 'application/xml'); const q = (el, tag) => [...el.getElementsByTagNameNS('*', tag)]; const lines = [];
      const inTable = el => { for (let p = el.parentNode; p; p = p.parentNode) if (p.localName === 'tbl') return true; return false; };
      q(x, 'tbl').forEach(t => q(t, 'tr').forEach(r => { const cells = q(r, 'tc').map(c => q(c, 't').map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim()); if (cells.some(Boolean)) lines.push(cells.join(' | ')); }));
      q(x, 'p').filter(p => !inTable(p)).forEach(p => { const t = q(p, 't').map(n => n.textContent).join('').replace(/\s+/g, ' ').trim(); if (t) lines.push(t); });
      out += `\n--- Slide ${f.name.match(/(\d+)\.xml$/)[1]}\n` + lines.join('\n');
    }
    return out;
  }
  V.deckText = deckText;
  let KR = null;   // the AI result under review
  ACT.kiRead = async a => {
    const st = V.filesFor('kickoff', true); const cur = (st.files || []).find(f => f.id === a.getAttribute('data-id')); if (!cur) return;
    if (/\.ppt$/i.test(cur.name)) { toast('This is a legacy .ppt file. Save it as .pptx or PDF and replace it, then try again.', 6000, true); return; }
    loading(true, 'Reading the slides…');
    try { const text = await deckText(await V.fileBlob(cur.id), cur.name); V.loadingMsg('Asking AI for the teams and key facts…');
      const r = await API.post(`/api/projects/${S.project.id}/ai/kickoff`, { text, fileName: cur.name }); KR = Object.assign({ fileId: cur.id, provider: r.provider, truncated: r.truncated, notice: r.notice }, r.data); kiReview(); }
    catch (e) { toast(e.message || 'The deck could not be read', 7000, true); } finally { loading(false); }
  };
  function kiReview() {
    const d = KR, ppl = F.doc('people'); const has = (list, x) => (list || []).some(y => (x.email && y.email && y.email.toLowerCase() === x.email) || String(y.name || '').trim().toLowerCase() === x.name.toLowerCase());
    const row = (k, x, i) => `<label class="ki-pp"><input type="checkbox" data-ki="${k}" data-i="${i}"${has(k === 'f' ? ppl.team : ppl.stakeholders, x) ? ' disabled' : ' checked'}><span><b>${esc(x.name)}</b>${x.role ? ' · ' + esc(x.role) : ''}${x.email ? `<small>${esc(x.email)}</small>` : ''}${has(k === 'f' ? ppl.team : ppl.stakeholders, x) ? '<small>Already in the project</small>' : ''}</span></label>`;
    const sec = (t, n) => `<div class="pink-label">${t} <span class="muted">(${n})</span></div>`;
    const lst = a => a.length ? `<ul class="ki-list small">${a.map(x => `<li>${typeof x === 'string' ? esc(x) : esc(x.label || x.action) + (x.date || x.due ? ' · ' + esc(x.date || x.due) : '') + (x.owner ? ' · ' + esc(x.owner) : '')}</li>`).join('')}</ul>` : '<p class="small muted">Nothing found.</p>';
    drawer('What AI read from the deck', `<div class="notice small" style="margin-bottom:12px">Read by ${esc(d.provider)}. Check every line: AI can misread slides. People you tick are added to the project's people list (Project Settings), not given access.${d.truncated ? ' The deck was long, so only the first part was read.' : ''}${d.notice ? ' ' + esc(d.notice) : ''}</div>
      ${sec('Facilio team', d.facilioTeam.length)}${d.facilioTeam.map((x, i) => row('f', x, i)).join('') || '<p class="small muted">Nothing found.</p>'}
      ${sec((S.project.customer || 'Customer') + ' team', d.customerTeam.length)}${d.customerTeam.map((x, i) => row('c', x, i)).join('') || '<p class="small muted">Nothing found.</p>'}
      ${sec('Governance', (d.cadence ? 1 : 0) + d.meetings.length)}${d.cadence ? `<label class="ki-pp"><input type="checkbox" id="kiCad" checked><span>Steering meetings are <b>${esc(d.cadence)}</b></span></label>` : ''}${lst(d.meetings)}
      ${sec('Objectives', d.objectives.length)}${lst(d.objectives)}${sec('Scope', d.scope.length)}${lst(d.scope)}${sec('Key dates', d.keyDates.length)}${lst(d.keyDates)}
      ${sec('Next steps', d.nextSteps.length)}${lst(d.nextSteps)}${sec('Risks', d.risks.length)}${lst(d.risks)}${sec('Other insights', d.insights.length)}${lst(d.insights)}
      <label class="ki-pp" style="margin-top:10px"><input type="checkbox" id="kiSum" checked><span>Save the objectives, scope, dates, next steps, risks and insights as the kick-off summary (replaces the previous summary)</span></label>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="kiSave">Save what is ticked</button>`);
  }
  ACT.kiSave = () => {
    const d = KR; if (!d) return; const ppl = F.doc('people'); ppl.team = ppl.team || []; ppl.stakeholders = ppl.stakeholders || []; let added = 0;
    document.querySelectorAll('[data-ki]:checked').forEach(cb => { const x = (cb.getAttribute('data-ki') === 'f' ? d.facilioTeam : d.customerTeam)[Number(cb.getAttribute('data-i'))]; if (!x) return; (cb.getAttribute('data-ki') === 'f' ? ppl.team : ppl.stakeholders).push({ name: x.name, role: x.role, email: x.email, phone: '', source: 'kick-off deck' }); added++; });
    if (added) F.markDirty('people');
    const cad = document.getElementById('kiCad'); if (cad && cad.checked) { const pc = F.doc('portal_controls'); pc.cadence = d.cadence; F.markDirty('portal_controls'); }
    if (document.getElementById('kiSum').checked) { const k = KI(); Object.assign(k, { objectives: d.objectives, scope: d.scope, keyDates: d.keyDates, nextSteps: d.nextSteps, risks: d.risks, insights: d.insights, meetings: d.meetings, readAt: new Date().toISOString(), readBy: S.user.name, readFile: d.fileId, provider: d.provider }); F.markDirty('kickoff_info'); }
    F.log('Kick-off deck read with AI', added + ' people added'); KR = null; closeDrawer(); toast(added ? added + ' people added to the project' : 'Saved'); V.render();
  };
  ACT.uploadDeck = async a => { const f = (await V.pickFile('.pptx,.ppt,.pdf'))[0]; if (!f) return; loading(true, 'Uploading the deck…');
    try { await API.uploadFile(S.project.id, f, 'kickoff', {}, a.getAttribute('data-replace') || null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%')); V.invalidateFiles('kickoff'); F.log('Kick-off deck uploaded', f.name); F.markDirty('workshop'); toast('Deck uploaded'); V.render(); } finally { loading(false); } };
  ACT.dlFile = async a => { loading(true, 'Downloading…'); try { V.download(a.getAttribute('data-name'), await V.fileBlob(a.getAttribute('data-id'))); } finally { loading(false); } };

  // ================= DASHBOARD GALLERY =================
  const DD = () => { const d = F.doc('dashboards') || {}; d.categories = d.categories || []; d.items = d.items || []; return d; };
  V.dashboards = { html() {
    const d = DD(); const ro = S.readonly; const cat = S.ui.dashCat || 'all'; const open = S.ui.dashOpen && d.items.find(i => i.id === S.ui.dashOpen);
    const head = `<div class="page-header">${open ? `<button class="back-btn" data-act="dashClose" aria-label="Back">${ico('left')}</button>` : ''}<div class="t"><h1>${open ? esc(open.title) : 'Dashboard Gallery'}</h1><p>${open ? esc(((d.categories.find(c => c.id === open.categoryId) || {}).name || 'Uncategorised') + (open.description ? ' — ' + open.description : '')) : 'Reference dashboards and reports to discuss with the customer. Upload PDFs and group them by category.'}</p></div>
      <div class="row">${open ? `<button class="btn" data-act="dlFile" data-id="${esc(open.fileId)}" data-name="${esc(open.fileName || open.title + '.pdf')}">${ico('dl')}Download</button>${ro ? '' : `<button class="btn" data-act="dashEdit" data-id="${esc(open.id)}">${ico('edit')}Details</button><button class="btn" data-act="dashReplace" data-id="${esc(open.id)}">Replace PDF</button><button class="btn danger" data-act="dashRemove" data-id="${esc(open.id)}">Remove</button>`}` : ro ? '' : `<button class="btn" data-act="dashCatNew">${ico('plus')}Category</button><button class="btn primary" data-act="dashUpload">${ico('upl')}Upload PDF</button>`}</div></div>`;
    if (open) return head + `<div class="page-body">${viewerShell('dash', open.fileName || open.title)}</div>`;
    const counts = id => d.items.filter(i => id === 'all' || (id === 'none' ? !d.categories.some(c => c.id === i.categoryId) : i.categoryId === id)).length;
    const list = d.items.filter(i => cat === 'all' || (cat === 'none' ? !d.categories.some(c => c.id === i.categoryId) : i.categoryId === cat));
    return head + `<div class="page-body"><div class="split" style="grid-template-columns:240px minmax(0,1fr)"><div class="card"><div class="card-h"><h3>Categories</h3></div>${[{ id: 'all', name: 'All dashboards' }].concat(d.categories).concat(d.items.some(i => !d.categories.some(c => c.id === i.categoryId)) ? [{ id: 'none', name: 'Uncategorised' }] : []).map(c => `<div class="list-item${cat === c.id ? ' sel' : ''}" data-act="dashCat" data-id="${esc(c.id)}"><div class="row"><span style="flex:1">${esc(c.name)}</span><span class="xs muted">${counts(c.id)}</span>${!ro && c.id !== 'all' && c.id !== 'none' ? `<button class="btn ghost sm" data-act="dashCatEdit" data-id="${esc(c.id)}" aria-label="Edit category">${ico('edit')}</button>` : ''}</div></div>`).join('')}</div>
      <div>${list.length ? `<div class="grid g3">${list.map(i => `<div class="card proj-card" data-act="dashOpen" data-id="${esc(i.id)}" role="button" tabindex="0"><div class="dash-thumb" data-thumb="${esc(i.fileId)}" style="height:150px;background:#f4f6f8;border-radius:3px;display:grid;place-items:center;overflow:hidden"><span class="xs muted">PDF</span></div><h3 style="margin-top:8px">${esc(i.title)}</h3><div class="xs muted">${esc((d.categories.find(c => c.id === i.categoryId) || {}).name || 'Uncategorised')}${i.pages ? ' · ' + i.pages + ' page' + (i.pages > 1 ? 's' : '') : ''}</div>${i.description ? `<div class="small muted">${esc(i.description.slice(0, 120))}</div>` : ''}</div>`).join('')}</div>` : `<div class="card empty"><h3>No dashboards here</h3><p>${ro ? 'Nothing has been shared in this category yet.' : 'Upload PDF exports of dashboards or reports to use as references.'}</p></div>`}</div></div></div>`;
  }, mount() {
    const d = DD(); const open = S.ui.dashOpen && d.items.find(i => i.id === S.ui.dashOpen);
    if (open) { hostLive('dash', open.fileId, async L => { L.el.innerHTML = '<div class="small" style="color:#dfe4ea;padding:20px">Loading…</div>'; const blob = await V.fileBlob(open.fileId); L.el.innerHTML = ''; await buildPdf('dash', L, blob); if (!open.pages && !S.readonly) { open.pages = L.api.count; F.changed(null, null, { section: 'dashboards', render: false }); } }); paint('dash'); return; }
    document.querySelectorAll('[data-thumb]').forEach(async el => { try { const id = el.getAttribute('data-thumb'); const url = await thumbUrl(id); if (url && document.body.contains(el)) el.innerHTML = `<img src="${url}" alt="" style="max-width:100%;max-height:150px;object-fit:contain">`; } catch (e) { } });
  } };
  const thumbs = new Map();
  function thumbUrl(fileId) { if (!thumbs.has(fileId)) thumbs.set(fileId, (async () => { const pdfjs = await V.pdfjs(); const blob = await V.fileBlob(fileId); const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; const page = await doc.getPage(1); const vp = page.getViewport({ scale: 300 / page.getViewport({ scale: 1 }).width }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const u = c.toDataURL('image/png'); doc.destroy(); return u; })()); return thumbs.get(fileId); }
  ACT.dashCat = a => { S.ui.dashCat = a.getAttribute('data-id'); V.render(); };
  ACT.dashOpen = a => { S.ui.dashOpen = a.getAttribute('data-id'); V.render(); };
  ACT.dashClose = () => { S.ui.dashOpen = null; V.render(); };
  ACT.dashCatNew = () => drawer('New category', `<label class="f">Category name</label><input type="text" id="dc_name" placeholder="e.g. Maintenance KPIs">`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dashCatSave">Save</button>`);
  ACT.dashCatEdit = (a, e) => { if (e) e.stopPropagation(); const c = DD().categories.find(x => x.id === a.getAttribute('data-id')); drawer('Edit category', `<label class="f">Category name</label><input type="text" id="dc_name" value="${esc(c.name)}"><div class="xs muted" style="margin-top:8px">Deleting a category keeps its dashboards; they become uncategorised.</div>`, `<button class="btn danger" data-act="dashCatDel" data-id="${esc(c.id)}">Delete</button><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dashCatSave" data-id="${esc(c.id)}">Save</button>`); };
  ACT.dashCatSave = a => { const n = document.getElementById('dc_name').value.trim(); if (!n) { toast('Enter a name'); return; } const d = DD(); const id = a.getAttribute('data-id'); if (id) d.categories.find(c => c.id === id).name = n; else { if (d.categories.some(c => c.name.toLowerCase() === n.toLowerCase())) { toast('That category exists'); return; } d.categories.push({ id: F.uid('dc'), name: n }); } closeDrawer(); F.changed(id ? 'Dashboard category renamed' : 'Dashboard category added', n, { section: 'dashboards' }); };
  ACT.dashCatDel = a => { const d = DD(); const id = a.getAttribute('data-id'); const c = d.categories.find(x => x.id === id); d.categories = d.categories.filter(x => x.id !== id); if (S.ui.dashCat === id) S.ui.dashCat = 'all'; closeDrawer(); F.changed('Dashboard category deleted', c.name, { section: 'dashboards' }); };
  function dashForm(i) { const d = DD(); return `<div class="fgrid"><div class="full"><label class="f">Title</label><input type="text" id="db_title" value="${esc(i.title || '')}"></div><div class="full"><label class="f">Category</label>${sel('', [{ v: '', l: 'Uncategorised' }].concat(d.categories.map(c => ({ v: c.id, l: c.name }))), i.categoryId || (S.ui.dashCat && S.ui.dashCat !== 'all' && S.ui.dashCat !== 'none' ? S.ui.dashCat : ''), 'id="db_cat"')}</div><div class="full"><label class="f">Description</label><textarea id="db_desc" rows="3">${esc(i.description || '')}</textarea></div></div>`; }
  let dashPicked = null;
  ACT.dashUpload = () => { dashPicked = null; drawer('Upload dashboard PDF', `<div class="drop" data-act="dashPick"><div>${ico('upl')}</div><div><b>Choose a PDF</b></div><div id="db_file" class="small" style="margin-top:6px"></div></div><div style="margin-top:14px">${dashForm({})}</div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dashUploadDo">Upload</button>`); };
  ACT.dashPick = async () => { const f = (await V.pickFile('.pdf'))[0]; if (!f) return; dashPicked = f; document.getElementById('db_file').textContent = f.name + ' · ' + V.fmtSize(f.size); const t = document.getElementById('db_title'); if (t && !t.value) t.value = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '); };
  ACT.dashUploadDo = async a => { if (!dashPicked) { toast('Choose a PDF first'); return; } const f = dashPicked; dashPicked = null; const meta = { title: document.getElementById('db_title').value.trim() || f.name, categoryId: document.getElementById('db_cat').value, description: document.getElementById('db_desc').value.trim() }; const repl = a.getAttribute('data-replace'); closeDrawer(); loading(true, 'Uploading…');
    try { const d = DD(); const old = repl && d.items.find(i => i.id === repl); const rec = await API.uploadFile(S.project.id, f, 'dashboard', { title: meta.title }, old ? old.fileId : null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%'));
      if (old) Object.assign(old, meta, { fileId: rec.id, fileName: f.name, pages: 0, updatedAt: new Date().toISOString() }); else d.items.unshift(Object.assign({ id: F.uid('db'), fileId: rec.id, fileName: f.name, uploadedAt: new Date().toISOString(), by: S.user.name, pages: 0 }, meta));
      F.changed(old ? 'Dashboard PDF replaced' : 'Dashboard PDF uploaded', meta.title, { section: 'dashboards' }); } finally { loading(false); } };
  ACT.dashEdit = a => { const i = DD().items.find(x => x.id === a.getAttribute('data-id')); drawer('Dashboard details', dashForm(i), `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dashEditSave" data-id="${esc(i.id)}">Save</button>`); };
  ACT.dashEditSave = a => { const i = DD().items.find(x => x.id === a.getAttribute('data-id')); i.title = document.getElementById('db_title').value.trim() || i.title; i.categoryId = document.getElementById('db_cat').value; i.description = document.getElementById('db_desc').value.trim(); closeDrawer(); F.changed('Dashboard details updated', i.title, { section: 'dashboards' }); };
  ACT.dashReplace = a => { const i = DD().items.find(x => x.id === a.getAttribute('data-id')); dashPicked = null; drawer('Replace PDF', `<div class="drop" data-act="dashPick"><div>${ico('upl')}</div><div><b>Choose the new PDF</b></div><div id="db_file" class="small" style="margin-top:6px"></div></div><div style="margin-top:14px">${dashForm(i)}</div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dashUploadDo" data-replace="${esc(i.id)}">Replace</button>`); };
  ACT.dashRemove = async a => { const d = DD(); const i = d.items.find(x => x.id === a.getAttribute('data-id')); if (!(await confirmDialog('Remove dashboard', `Remove “${i.title}” from the gallery?`, 'Remove', true))) return; try { await API.del(`/api/projects/${S.project.id}/files/${i.fileId}`); } catch (e) { if (e.status !== 404) throw e; } d.items = d.items.filter(x => x !== i); S.ui.dashOpen = null; F.changed('Dashboard removed', i.title, { section: 'dashboards' }); };
})(typeof window !== 'undefined' ? window : globalThis);
