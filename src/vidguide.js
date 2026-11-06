/* Video to Guide: turn a recorded walkthrough into draft user-guide steps.
   The video stays on this computer (it is never uploaded). The person captures screenshots, adds the transcript (Teams / Zoom .vtt or .srt, or typed notes),
   reviews every screenshot, and only the kept ones are saved. The AI then drafts steps from the transcript and the screenshot captions (existing AI path, task vidguide).
   There is no automatic speech recognition in this app, so the transcript must be supplied. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const VG = { file: null, url: '', dur: 0, frames: [], transcript: '', title: '', reviewed: false, n: 0 };
  const mm = t => { if (t == null) return '--:--'; const m = Math.floor(t / 60), s = Math.floor(t % 60); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
  const MAXF = 60, MAXCH = 18000;
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  function parseTranscript(txt) {
    const lines = String(txt || '').replace(/\r/g, '').split('\n'); const segs = []; let i = 0; const ts = s => { const m = s.match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d+))?/); return m ? (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) : null; };
    while (i < lines.length) { const ln = lines[i]; if (/-->/.test(ln)) { const t = ts(ln.split('-->')[0]); const body = []; i++; while (i < lines.length && lines[i].trim() !== '') { body.push(lines[i]); i++; } const text = body.join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (text) segs.push({ t, text }); } else i++; }
    if (!segs.length) { String(txt || '').split('\n').forEach(l => { const m = l.match(/^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.*)/); const text = (m ? m[2] : l).trim(); if (text) segs.push({ t: m ? ts(m[1]) : null, text }); }); }
    return segs.map(s => ({ t: s.t, text: s.text.replace(EMAIL, '[email]') }));
  }
  const sync = () => { const t = document.getElementById('vg_t'); if (t) VG.transcript = t.value; const n = document.getElementById('vg_n'); if (n) VG.title = n.value; document.querySelectorAll('[data-vgcap]').forEach(i => { const f = VG.frames.find(x => x.id === i.getAttribute('data-vgcap')); if (f) f.caption = i.value; }); const r = document.getElementById('vg_r'); if (r) VG.reviewed = r.checked; };
  const video = () => document.querySelector('#vgHost video');

  /** Claude route, no server AI: copy a prompt, attach the screenshots in your own Claude, paste its steps back and make a draft UAT test case from them */
  const U = () => root.FWBUat; const mods = () => F.allModules().filter(m => m.inScope);
  function claudeCard(can) {
    if (!can) return ''; const ms = mods(); const keepN = VG.frames.filter(f => f.keep).length; const nl = String.fromCharCode(10);
    return '<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>Use this recording with your own Claude</h3></div><div style="padding:0 14px 14px"><p class="small" style="margin-top:0">Optional. Works with or without speech. 1) Copy the prompt. 2) Paste it into Claude and attach the screenshots' + (keepN ? ' (' + keepN + ' kept above)' : '') + '. 3) Paste the numbered steps Claude writes below to start a draft UAT test case. Nothing is saved until you press the button.</p>'
      + '<div class="row" style="gap:8px;margin-bottom:8px"><button class="btn" data-act="vgPrompt">Copy the prompt for Claude</button></div>'
      + '<label class="f">Steps from Claude</label><textarea id="vg_steps" rows="6" placeholder="1. Open ...' + nl + '2. ...' + nl + 'Expected: ...">' + esc(VG.steps || '') + '</textarea>'
      + '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><select id="vg_mod" aria-label="Module">' + (ms.length ? ms.map(m => '<option value="' + esc(m.name) + '"' + (VG.mod === m.name ? ' selected' : '') + '>' + esc(m.label) + '</option>').join('') : '<option value="">No module in scope</option>') + '</select><button class="btn primary" data-act="vgCase"' + (ms.length ? '' : ' disabled') + '>Add as a draft UAT test case</button></div></div></div>';
  }
  ACT.vgPrompt = async () => { sync(); const segs = parseTranscript(VG.transcript); const caps = VG.frames.filter(f => f.keep).map(f => f.caption); const p = U().videoPrompt(VG.title, segs.map(s => (s.t != null ? mm(s.t) + ' ' : '') + s.text), caps); let ok = false; try { await navigator.clipboard.writeText(p); ok = true; } catch (e) { /* blocked */ } toast(ok ? 'Copied. Paste it into Claude and attach the screenshots.' : 'Your browser blocked copying, so nothing was copied.', 6000, !ok); };
  ACT.vgCase = a => V.busy(a, async () => {
    sync(); const ta = document.getElementById('vg_steps'); const sel = document.getElementById('vg_mod'); VG.steps = ta ? ta.value : VG.steps; VG.mod = sel ? sel.value : VG.mod; const m = mods().find(x => x.name === VG.mod);
    const title = (VG.title || '').trim(); if (!title) { toast('Give the walkthrough a title above first', 5000, true); return; } const rec = U().fromSteps({ text: VG.steps, mod: VG.mod, label: m && m.label, title }, I().list('utc'));
    if (!rec) { toast('Nothing added: paste numbered steps, or a test case with this title already exists in the module.', 6000, true); return; }
    await I().put('utc', I().uid('tc'), rec); VG.steps = ''; toast('Draft test case ' + rec.tcid + ' added in UAT. Open it to check the steps.', 6000); V.render(); });
  V.vidguide = {
    html() {
      I().load(['vid', 'ai', 'ugd']); if (!I().ready(['vid'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const can = canEdit(); const segs = parseTranscript(VG.transcript); const timed = segs.filter(s => s.t != null).length; const kept = VG.frames.filter(f => f.keep).length;
      const prev = I().list('vid').sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
      const step = (n, h, b) => `<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>${n}. ${h}</h3></div><div style="padding:0 14px 14px">${b}</div></div>`;
      return `<div class="page-header"><div class="t"><h1>Video to Guide</h1><p>Turn a recorded walkthrough into draft guide steps. The video never leaves this computer: you capture screenshots, supply the transcript, review every screenshot, and only the ones you keep are saved. The AI drafts the steps from the transcript and your captions; you review the draft before it goes into a guide. To use a walkthrough in a guide, choose it in the guide's set-up in <a href="#" data-act="nav" data-view="guidebuilder">User Guide Builder</a> or use <b>From a walkthrough</b> there.</p></div></div>
      <div class="page-body">${can ? '' : '<div class="notice"><span>You have read-only access.</span></div>'}
      ${step(1, 'Choose the recording', `<div class="row" style="gap:8px"><button class="btn" data-act="vgPick" ${can ? '' : 'disabled'}>${ico('upl')}${VG.file ? 'Choose another video' : 'Choose a video'}</button>${VG.file ? `<span class="small">${esc(VG.file.name)} · ${mm(VG.dur)}</span>` : '<span class="small muted">MP4 or WebM that this browser can play.</span>'}</div>${VG.file ? '<div id="vgHost" style="margin-top:10px"></div>' : ''}`)}
      ${VG.file ? step(2, 'Capture screenshots', `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="vgCap">Capture this frame</button><span class="small">or every</span><select id="vg_ev" style="width:auto"><option>5</option><option selected>10</option><option>15</option><option>30</option></select><span class="small">seconds</span><button class="btn" data-act="vgAuto">Capture automatically</button><span class="small muted">${VG.frames.length} of ${MAXF} captured</span></div>`) : ''}
      ${step(VG.file ? 3 : 2, 'Add the transcript', `<div class="row" style="gap:8px;margin-bottom:6px"><button class="btn sm" data-act="vgTr">Import .vtt / .srt / .txt</button><span class="small muted">${segs.length ? segs.length + ' lines' + (timed ? ', ' + timed + ' with times' : ', no times found (screenshots cannot be lined up)') : 'Paste the transcript below.'}</span></div><textarea id="vg_t" rows="8" placeholder="Paste the Teams / Zoom transcript, or type what is said and shown. Lines such as [00:12] Click New work order are fine." style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(VG.transcript)}</textarea><div class="xs muted">There is no automatic speech recognition here: export the transcript from Teams or Zoom. Email addresses are replaced with [email]. About 12 minutes of speech fit in one draft: split longer recordings.</div>`)}
      ${VG.frames.length ? step(VG.file ? 4 : 3, 'Review the screenshots', `<p class="small">Tick the ones to keep, add a short caption, and check each for personal or confidential data. Unticked frames are discarded and never uploaded.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">${VG.frames.map((f, i) => `<div class="card" style="padding:8px"><img src="${esc(f.url)}" alt="Frame at ${mm(f.t)}" style="width:100%;border-radius:8px;border:1px solid #dbe6f7"><div class="row" style="gap:6px;margin:6px 0"><label class="small"><input type="checkbox" data-change="vgKeep" data-id="${esc(f.id)}" ${f.keep ? 'checked' : ''}> Keep</label><span class="small muted">F${i + 1} · ${mm(f.t)}</span>${VG.file ? `<button class="btn sm" data-act="vgSeek" data-id="${esc(f.id)}">Go to</button>` : ''}<button class="btn sm danger" data-act="vgDrop" data-id="${esc(f.id)}">Delete</button></div><input type="text" data-vgcap="${esc(f.id)}" value="${esc(f.caption)}" placeholder="Caption, e.g. The New button on the Work Orders list" maxlength="200"></div>`).join('')}</div>`) : ''}
      ${step(VG.frames.length ? (VG.file ? 5 : 4) : (VG.file ? 4 : 3), 'Save and draft the steps', `<label class="f">Walkthrough title</label><input type="text" id="vg_n" maxlength="120" value="${esc(VG.title)}" placeholder="e.g. Raise a work order from the portal"><label class="f" style="margin-top:8px"><input type="checkbox" id="vg_r" ${VG.reviewed ? 'checked' : ''}> I have checked the kept screenshots for personal or confidential information</label><div class="row" style="gap:8px;margin-top:8px"><button class="btn primary" data-act="vgSave" data-ai="1" ${can ? '' : 'disabled'}>✦ Save and draft steps with AI</button><button class="btn" data-act="vgSave" data-ai="0" ${can ? '' : 'disabled'}>Save only</button><span class="small muted">${kept} screenshot(s) kept, ${segs.length} transcript line(s)</span></div>`)}
      ${claudeCard(can)}
      <div class="card"><div class="card-h"><h3>Saved walkthroughs (${prev.length})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Walkthrough</th><th>Screenshots</th><th>Drafts</th><th>Saved</th><th></th></tr></thead><tbody>${prev.map(v => { const dr = I().list('ai').filter(a => a.task === 'vidguide' && a.vid === v.id); return `<tr><td><b>${esc(v.title)}</b><div class="xs muted">${(v.transcript || []).length} transcript lines</div></td><td>${(v.frames || []).length}</td><td>${dr.length}${dr.length ? ' · ' + dr.map(d => `<a href="#" data-act="aiOpen" data-id="${esc(d.id)}">${esc(d.status || 'draft')}</a>`).join(', ') : ''}</td><td class="small">${esc(V.fmtDate(v._created))}</td><td style="text-align:right;white-space:nowrap">${can ? `<button class="btn sm" data-act="vgAgain" data-id="${esc(v.id)}">Draft again</button><button class="btn sm danger" data-act="vgDel" data-id="${esc(v.id)}">Delete</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted" style="padding:14px">None yet.</td></tr>'}</tbody></table></div></div></div>`;
    },
    mount() { if (!VG.file) return; V.hostLive('vg', VG.url, async L => { const v = document.createElement('video'); v.src = VG.url; v.controls = true; v.preload = 'metadata'; v.style.cssText = 'width:100%;max-height:340px;background:#000;border-radius:10px'; L.el.appendChild(v); v.addEventListener('error', () => toast('This browser cannot play that video. Try MP4 (H.264) or WebM.', 7000, true)); }); }
  };
  ACT.vgPick = async () => {
    sync(); const f = (await V.pickFile('video/*,.mp4,.webm,.mov'))[0]; if (!f) return; if (f.size > 1.5e9) { toast('That video is ' + (f.size / 1e9).toFixed(1) + ' GB. Use a recording under 1.5 GB (trim it or lower the quality). The video stays in your browser; only the screenshots you keep are saved.', 8000, true); return; } if (VG.url) URL.revokeObjectURL(VG.url);
    VG.file = f; VG.url = URL.createObjectURL(f); VG.dur = 0; const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = VG.url;
    probe.onloadedmetadata = () => { VG.dur = probe.duration || 0; V.render(); }; probe.onerror = () => toast('This browser cannot read that video. Try MP4 (H.264) or WebM.', 7000, true); if (!VG.title) VG.title = f.name.replace(/\.[^.]+$/, ''); V.render();
  };
  async function grab(v, t) {
    await new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = Math.min(t, Math.max(0, (v.duration || t) - 0.05)); });
    const w = v.videoWidth, h = v.videoHeight; if (!w || !h) throw new Error('The video has no picture yet'); const k = Math.min(1, 1280 / w); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); return { id: 'f' + (++VG.n), t, blob, url: URL.createObjectURL(blob), caption: '', keep: true };
  }
  ACT.vgCap = async () => { sync(); const v = video(); if (!v) return; if (VG.frames.length >= MAXF) { toast('Up to ' + MAXF + ' screenshots per walkthrough', 5000, true); return; } try { v.pause(); const f = await grab(v, v.currentTime); VG.frames.push(f); VG.frames.sort((a, b) => a.t - b.t); V.render(); } catch (e) { toast(e.message || 'Could not capture', 5000, true); } };
  ACT.vgAuto = a => V.busy(a, async () => {
    sync(); const v = video(); if (!v || !VG.dur) return; const step = Number((document.getElementById('vg_ev') || {}).value) || 10; const times = []; for (let t = 0; t < VG.dur && times.length < MAXF - VG.frames.length; t += step) times.push(t);
    if (!times.length) { toast('The limit of ' + MAXF + ' screenshots is reached', 5000, true); return; } v.pause(); const keep = v.currentTime;
    try { V.loading(true, 'Capturing 0 / ' + times.length); for (let i = 0; i < times.length; i++) { VG.frames.push(await grab(v, times[i])); V.loadingMsg('Capturing ' + (i + 1) + ' / ' + times.length); } } catch (e) { toast(e.message || 'Could not capture', 5000, true); } finally { V.loading(false); }
    v.currentTime = keep; VG.frames.sort((x, y) => x.t - y.t); V.render();
  });
  ACT.vgSeek = a => { sync(); const f = VG.frames.find(x => x.id === a.getAttribute('data-id')); const v = video(); if (f && v) v.currentTime = f.t; };
  ACT.vgKeep = el => { sync(); const f = VG.frames.find(x => x.id === el.getAttribute('data-id')); if (f) f.keep = el.checked; V.render(); };
  ACT.vgDrop = a => { sync(); const i = VG.frames.findIndex(x => x.id === a.getAttribute('data-id')); if (i >= 0) { URL.revokeObjectURL(VG.frames[i].url); VG.frames.splice(i, 1); } V.render(); };
  ACT.vgTr = async () => { sync(); const f = (await V.pickFile('.vtt,.srt,.txt'))[0]; if (!f) return; VG.transcript = await f.text(); V.render(); };
  ACT.vgSave = a => V.busy(a, async () => {
    sync(); const wantAi = a.getAttribute('data-ai') === '1'; const title = (VG.title || '').trim(); if (!title) { toast('Give the walkthrough a title'); return; }
    const segs = parseTranscript(VG.transcript); const kept = VG.frames.filter(f => f.keep); if (!segs.length && !kept.length) { toast('Add the transcript or keep at least one screenshot first', 5000, true); return; }
    if (kept.length && !VG.reviewed) { toast('Confirm that you have checked the screenshots first', 6000, true); return; }
    let size = 0; const tr = segs.filter(s => (size += s.text.length + 8) <= MAXCH); if (tr.length < segs.length && !(await confirmDialog('Long transcript', 'Only the first ' + tr.length + ' of ' + segs.length + ' lines (about 12 minutes) are kept for one draft. Continue?', 'Continue', false))) return;
    const id = I().uid('vd'); const frames = [];
    try {
      for (let i = 0; i < kept.length; i++) { V.loading(true, 'Saving screenshot ' + (i + 1) + ' of ' + kept.length + '…'); const file = new File([kept[i].blob], 'walkthrough-' + id + '-' + (i + 1) + '.jpg', { type: 'image/jpeg' }); const rec = await API.uploadFile(S.project.id, file, 'guide_media', { walkthrough: id, t: Math.round(kept[i].t) }); frames.push({ t: Math.round(kept[i].t), caption: (kept[i].caption || '').trim(), fileId: rec.id }); }
      await I().put('vid', id, { title, durationSec: Math.round(VG.dur || 0), transcript: tr, frames });
    } catch (e) { V.loading(false); toast(e.message || 'Could not save', 6000, true); return; } finally { V.loading(false); }
    toast('Walkthrough saved'); if (wantAi) await draft(id);
  });
  async function draft(id) { try { const r = await V.aiDoc({ task: 'vidguide', vid: id }, 'Walkthrough steps'); await I().load(['ai'], true); V.loading(false); toast('Draft ready for review'); if (V.ACT.aiOpen) V.ACT.aiOpen({ getAttribute: () => r.item.id }); } catch (e) { V.loading(false); toast(e.message || 'The AI could not complete this', 7000, true); } }
  ACT.vgAgain = a => V.busy(a, async () => { await draft(a.getAttribute('data-id')); });
  ACT.vgDel = async a => { if (!(await confirmDialog('Delete walkthrough', 'Remove this walkthrough and its transcript? Saved screenshots stay in the project files.', 'Delete', true))) return; await I().del('vid', a.getAttribute('data-id')); };
  V.vidParse = parseTranscript;
})(typeof window !== 'undefined' ? window : globalThis);
