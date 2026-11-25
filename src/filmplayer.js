/* Film player (user, 25 Nov 2026: setup videos that stay in KB; plan docs/plans/CLAUDE-SETUP-VIDEO-PLAN-2026-11-25.md). Plays a film written as code
   (public/films/<id>.js registers FWBFilms[id] = { title, W, H, DUR, SCENES, draw(g, t) }; the same code plays in VideoHub's live preview) by drawing it
   on a canvas: no video file, so a 100-second film is about 16 KB. V.filmCard(id, title, sub) is the button that opens it; the player has play/pause,
   a scrub bar, chapters (the film's scenes), keyboard (Space, arrows, Esc) and Download, a single offline HTML file. Nothing plays by itself. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return; const ACT = V.ACT; const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = { id: '', t: 0, playing: false, raf: 0, last: 0 };
  const film = () => (root.FWBFilms || {})[P.id];
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  V.filmCard = (id, title, sub) => `<button type="button" class="fp-card" data-act="filmOpen" data-id="${esc(id)}"><span class="fp-pl" aria-hidden="true"></span><span class="fp-tx"><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
  function paint() { const f = film(), cv = document.getElementById('fpCv'); if (!f || !cv) return; const g = cv.getContext('2d'); g.setTransform(cv.width / f.W, 0, 0, cv.height / f.H, 0, 0); f.draw(g, P.t);
    const r = document.getElementById('fpRange'); if (r && document.activeElement !== r) r.value = P.t.toFixed(1); const tm = document.getElementById('fpTime'); if (tm) tm.textContent = mmss(P.t) + ' / ' + mmss(f.DUR);
    const b = document.getElementById('fpPlay'); if (b) { b.textContent = P.playing ? 'Pause' : P.t >= f.DUR ? 'Play again' : 'Play'; b.setAttribute('aria-pressed', String(P.playing)); }
    document.querySelectorAll('#fpBox [data-act="filmSeek"]').forEach(x => x.classList.toggle('on', P.t >= +x.dataset.t0 && P.t < +x.dataset.t1)); }
  function loop(ts) { const f = film(); if (!f || !document.getElementById('fpBox')) { P.playing = false; return; } if (P.playing) { P.t = Math.min(f.DUR, P.t + (ts - (P.last || ts)) / 1000); if (P.t >= f.DUR) { P.playing = false; if (P.rec && P.rec.state === 'recording') P.rec.stop(); } } P.last = ts; paint(); P.raf = P.playing ? requestAnimationFrame(loop) : 0; }
  const play = on => { const f = film(); if (!f) return; if (on && P.t >= f.DUR) P.t = 0; P.playing = on; P.last = 0; cancelAnimationFrame(P.raf); P.raf = requestAnimationFrame(loop); };
  function close() { if (P.rec && P.rec.state === 'recording') { P.rec.onstop = null; P.rec.stop(); } P.rec = null; P.playing = false; cancelAnimationFrame(P.raf); const b = document.getElementById('fpBox'); if (b) b.remove(); document.removeEventListener('keydown', onKey, true); if (P.back && P.back.focus) P.back.focus(); }
  function onKey(e) { if (!document.getElementById('fpBox')) return; const f = film(); const inField = e.target && e.target.matches && e.target.matches('input');
    if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === ' ' && !(e.target && e.target.matches && e.target.matches('button, input'))) { e.preventDefault(); play(!P.playing); }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && f && !inField) { e.preventDefault(); P.t = Math.max(0, Math.min(f.DUR, P.t + (e.key === 'ArrowRight' ? 5 : -5))); paint(); } }
  ACT.filmOpen = async a => {
    const id = a.getAttribute('data-id'); P.back = a;
    try { if (!(root.FWBFilms || {})[id]) await V.loadScript('films/' + id + '.js'); } catch (e) { V.toast(e.message || 'The film could not be loaded', 6000, true); return; }
    P.id = id; P.t = 0; P.playing = false; const f = film(); if (!f) { V.toast('The film could not be loaded', 6000, true); return; }
    if (f.load) await f.load('films/');   // the real Studio screens the film shows (a few JPEGs)
    const box = document.createElement('div'); box.id = 'fpBox'; box.className = 'fp-scrim'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', f.title);
    box.innerHTML = `<div class="fp-box"><div class="fp-head"><b>${esc(f.title)}</b><span class="fp-sp"></span><button type="button" class="btn sm" data-act="filmDownload" title="One small file (about 20 KB) that plays offline in any browser">Download (HTML)</button><button type="button" class="btn sm" data-act="filmVideo" id="fpVid" title="Records the film on this computer as a video file (about 1 to 2 MB) to send or share">Save as video</button><button type="button" class="btn sm ghost" data-act="filmClose">Close</button></div>
      <canvas id="fpCv" width="${f.W}" height="${f.H}" role="img" aria-label="${esc(f.title)}: ${esc(f.SCENES.map(s => s.name).join(', '))}"></canvas>
      <div class="fp-ctl"><button type="button" class="btn sm primary" id="fpPlay" data-act="filmToggle" aria-pressed="false">Play</button><input type="range" id="fpRange" min="0" max="${f.DUR}" step="0.1" value="0" aria-label="Position in the film"><span id="fpTime" class="fp-time"></span></div>
      <div class="fp-ch" role="group" aria-label="Chapters">${f.SCENES.map(s => `<button type="button" data-act="filmSeek" data-t0="${s.t0}" data-t1="${s.t1}">${esc(s.name)}</button>`).join('')}</div></div>`;
    box.addEventListener('mousedown', e => { if (e.target === box) close(); });
    document.body.appendChild(box); document.addEventListener('keydown', onKey, true);
    const r = document.getElementById('fpRange'); r.addEventListener('input', () => { P.t = +r.value; paint(); });
    paint(); document.getElementById('fpPlay').focus();
  };
  ACT.filmToggle = () => play(!P.playing);
  ACT.filmSeek = a => { P.t = +a.getAttribute('data-t0') + 0.01; paint(); if (!P.playing) play(true); };
  ACT.filmClose = () => close();
  // a real video file, made on this computer when asked (the app itself ships only the 16 KB film code): the film plays once to the end while it records
  ACT.filmVideo = () => { const f = film(), cv = document.getElementById('fpCv'), b = document.getElementById('fpVid'); if (!f || !cv) return; if (P.rec) return;
    const type = root.MediaRecorder && cv.captureStream ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) : null; if (!type) { V.toast('This browser cannot save a video file. Use Download (HTML) instead.', 6000, true); return; }
    const parts = []; const rec = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 160000 }); rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    rec.onstop = () => { P.rec = null; if (b) { b.disabled = false; b.textContent = 'Save as video'; } if (parts.length) V.download(P.id + '-film.webm', new Blob(parts, { type: 'video/webm' })); };
    P.rec = rec; if (b) { b.disabled = true; b.textContent = 'Recording… plays to the end'; } P.t = 0; rec.start(1000); play(true); };
  // one HTML file that plays offline: the film code and a small player, nothing fetched from outside
  ACT.filmDownload = async () => { const f = film(); if (!f) return; let code = '', srcs = {}; try { code = await (await fetch('films/' + P.id + '.js')).text(); for (const k of f.FILES || []) { const bl = await (await fetch('films/' + P.id + '/' + k + '.jpg')).blob(); srcs[k] = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(bl); }); } } catch (e) { V.toast('The film could not be read for the download', 6000, true); return; }
    const player = `const F=FWBFilms[${JSON.stringify(P.id)}],cv=document.getElementById('c'),g=cv.getContext('2d'),r=document.getElementById('r'),b=document.getElementById('b'),tm=document.getElementById('tm');let t=0,on=false,last=0;const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');function paint(){g.setTransform(cv.width/F.W,0,0,cv.height/F.H,0,0);F.draw(g,t);r.value=t;tm.textContent=mm(t)+' / '+mm(F.DUR);b.textContent=on?'Pause':'Play';}function loop(ts){if(on){t=Math.min(F.DUR,t+(ts-(last||ts))/1000);if(t>=F.DUR)on=false;}last=ts;paint();if(on)requestAnimationFrame(loop);}b.onclick=()=>{if(t>=F.DUR)t=0;on=!on;last=0;requestAnimationFrame(loop);};r.oninput=()=>{t=+r.value;paint();};r.max=F.DUR;(F.load?F.load('',${JSON.stringify(srcs)}):Promise.resolve()).then(paint);`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(f.title)}</title><style>body{margin:0;background:#F8FAFC;font:15px Inter,"Segoe UI",system-ui,sans-serif;color:#0F172A}main{max-width:1280px;margin:0 auto;padding:16px}canvas{width:100%;height:auto;border-radius:12px;box-shadow:0 8px 24px rgba(16,24,40,.12);background:#fff}.c{display:flex;gap:12px;align-items:center;margin-top:12px}input{flex:1}button{font:inherit;padding:8px 18px;border-radius:10px;border:0;background:#1570EF;color:#fff;cursor:pointer}</style></head><body><main><h1 style="font-size:20px">${esc(f.title)}</h1><canvas id="c" width="${f.W}" height="${f.H}"></canvas><div class="c"><button id="b">Play</button><input id="r" type="range" min="0" step="0.1" value="0" aria-label="Position"><span id="tm"></span></div></main><script>${code.replace(/<\/script/gi, '<\\/script')}</script><script>${player}</script></body></html>`;
    V.download(P.id + '-film.html', new Blob([html], { type: 'text/html' })); };
})(typeof window !== 'undefined' ? window : globalThis);
