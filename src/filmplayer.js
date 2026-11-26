/* Film player (user, 25 Nov 2026: guide films that stay in KB, made from the real Studio; plans docs/plans/CLAUDE-SETUP-VIDEO-PLAN-2026-11-25.md and
   TEAM-GUIDE-FILMS-PLAN-2026-11-25.md). Plays a film written as code (public/films/<id>.js on the shared kit public/films/kit.js registers FWBFilms[id] =
   { title, W, H, DUR, SCENES, draw(g, t) }; the same code plays in VideoHub's live preview) by drawing it on a canvas: no video file. V.filmCard(id, title,
   sub, side) puts the film in the page itself (user, 25 Nov 2026: "why do we have to click a button"; "click and instantly the video gets played"): a poster
   in a Facilio gradient, one click loads the film and plays it in place; play/pause, a scrub bar, chapters (the film's scenes), full screen (button or F;
   Esc or Backspace leaves it), keyboard (Space, arrows) while the player has focus, Download (one offline HTML file), Save as video and Close (back to the
   poster). One film plays at a time; a page redraw keeps it playing. V.FILMS lists every film. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return; const ACT = V.ACT; const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = { id: '', t: 0, playing: false, raf: 0, last: 0, host: null };
  const film = () => (root.FWBFilms || {})[P.id];
  const $ = s => P.host && P.host.querySelector(s);
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  // every film there is: [id, title, one line on what it shows, seconds, gradient tone]; the Team Guide and the posters read it. Each tab of the menu also
  // has a clip of the Team Guide film (tg-<page id>, and the Claude setup film's parts cs-*): they live in their film's file (FILE_OF) and say their own title
  V.FILMS = [
    ['team-guide', 'The Team Guide film', 'Create a project, every tab of the menu in order, the Assistant and Otto in Teams', 358, 'blue'],
    ['claude-setup', 'Set up Claude for Delivery Studio', 'The four steps on your computer, once, with the mouse showing where to click', 142, 'violet'],
    ['contract-intake', 'Contract intake, step by step', 'From the signed contract to the kick-off: add, analyse, settle what disagrees', 80, 'teal'],
    ['plan-replan', 'Plan timeline: re-planning', 'Edit dates in the grid, say why, undo, the reason log and export', 86, 'pink']];
  const FILE_OF = id => /^tg-/.test(id) ? 'team-guide' : /^cs-/.test(id) ? 'claude-setup' : id;
  const meta = id => { const m = V.FILMS.find(x => x[0] === id), f = (root.FWBFilms || {})[id]; return m || [id, f ? f.title : id, f ? f.sub || '' : '', f ? f.DUR : 0, /^cs-/.test(id) ? 'violet' : 'blue']; };
  // before it plays a film is a poster: its title on a Facilio gradient and a round play button; nothing is loaded until it is pressed
  const poster = (id, title, sub) => `<button type="button" class="fp-poster" data-act="filmOpen" aria-label="Play the film: ${esc(title || meta(id)[1])}"><span class="fp-pi" aria-hidden="true"></span><span class="fp-tx"><small>Watch${meta(id)[3] ? ' · ' + mmss(meta(id)[3]) : ''}</small><b>${esc(title || meta(id)[1])}</b><span>${esc(sub || meta(id)[2])}</span></span></button>`;
  const isFull = () => !!(P.host && (document.fullscreenElement && P.host.contains(document.fullscreenElement) || P.host.querySelector('.fp-main.fp-max')));
  // the film's place in the page: a poster until it is pressed (a page redraw keeps the open film's position and play state)
  V.filmCard = (id, title, sub, side) => `<div class="fp-inline${side ? ' has-side' : ''}" data-film="${esc(id)}" data-tone="${esc(meta(id)[4])}" role="region" aria-label="${esc(title || meta(id)[1])}"><div class="fp-main"><div class="fp-stage">${poster(id, title, sub)}</div></div>
    <div class="fp-side"><b class="fp-title">${esc(title || meta(id)[1])}</b><small class="fp-sub">${esc(sub || meta(id)[2])}</small><div class="fp-chs"></div><div class="fp-acts">${side || ''}</div></div></div>`;
  // a player back to its poster (another film was opened, or Close)
  function unmount(host) { if (!host) return; host.classList.remove('on', 'playing'); delete host.dataset.on; const c = host.querySelector('.fp-ctl'); if (c) c.remove(); host.querySelector('.fp-chs').innerHTML = '';
    host.querySelectorAll('.fp-acts [data-act="filmDownload"], .fp-acts .fp-vid').forEach(e => e.remove());
    host.querySelector('.fp-stage').innerHTML = poster(host.dataset.film, host.querySelector('.fp-title').textContent, host.querySelector('.fp-sub').textContent); }
  function paint() { const f = film(), cv = $('canvas'); if (!f || !cv) return; const g = cv.getContext('2d'); g.setTransform(cv.width / f.W, 0, 0, cv.height / f.H, 0, 0); f.draw(g, P.t === 0 && !P.playing ? (f.POSTER || 4) : P.t);   // before play: a frame with the title in, not the empty first one
    const r = $('.fp-range'); if (r && document.activeElement !== r) r.value = P.t.toFixed(1); const tm = $('.fp-time'); if (tm) tm.textContent = mmss(P.t) + ' / ' + mmss(f.DUR);
    const b = $('.fp-play'); if (b) { b.textContent = P.playing ? 'Pause' : P.t >= f.DUR ? 'Play again' : P.t > 0 ? 'Play' : 'Play the film'; b.setAttribute('aria-pressed', String(P.playing)); }
    const fs = $('.fp-fs'); if (fs) fs.textContent = isFull() ? 'Exit full screen (Esc)' : 'Full screen';
    P.host.classList.toggle('playing', P.playing);
    P.host.querySelectorAll('[data-act="filmSeek"]').forEach(x => x.classList.toggle('on', P.t >= +x.dataset.t0 && P.t < +x.dataset.t1)); }
  function stopRec() { if (P.rec && P.rec.state === 'recording') { P.rec.onstop = null; P.rec.stop(); } P.rec = null; }
  function loop(ts) { const f = film(); if (!f || !P.host || !P.host.isConnected) { P.playing = false; P.raf = 0; stopRec(); return; }   // left the page: stop
    if (P.playing) { P.t = Math.min(f.DUR, P.t + (ts - (P.last || ts)) / 1000); if (P.t >= f.DUR) { P.playing = false; if (P.rec && P.rec.state === 'recording') P.rec.stop(); } }
    P.last = ts; paint(); P.raf = P.playing ? requestAnimationFrame(loop) : 0; }
  const play = on => { const f = film(); if (!f) return; if (on && P.t >= f.DUR) P.t = 0; P.playing = on; P.last = 0; cancelAnimationFrame(P.raf); P.raf = requestAnimationFrame(loop); };
  // full screen; where the browser refuses it (an embedded view, no permission) the film fills the window instead, left the same way
  // a history entry while it is full, so the browser's Back button leaves full screen instead of the page
  const unHist = back => { if (!P.hist) return; P.hist = 0; if (back) history.back(); };
  function full(on, fromBack) { const m = $('.fp-main'); if (!m) return; const done = () => { if (!P.hist) { history.pushState({ fpFull: 1 }, ''); P.hist = 1; } paint(); const b = $('.fp-play'); if (b) b.focus({ preventScroll: true }); };
    if (!on) { unHist(!fromBack); m.classList.remove('fp-max'); if (document.fullscreenElement) document.exitFullscreen(); paint(); return; }
    const max = () => { m.classList.add('fp-max'); done(); }; if (m.requestFullscreen) m.requestFullscreen().then(done, max); else max(); }
  function onKey(e) { const f = film(); if (!f) return; const k = e.key;
    if (e.target.matches('input[type="range"]') && k !== ' ') return;
    if ((k === 'f' || k === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); full(!isFull()); }
    else if (k === ' ' && !e.target.matches('button')) { e.preventDefault(); play(!P.playing); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); P.t = Math.max(0, Math.min(f.DUR, P.t + (k === 'ArrowRight' ? 5 : -5))); paint(); } }
  async function mount(host) {
    host.dataset.on = '1'; const id = host.getAttribute('data-film');
    try { if (!root.FWBFilmKit) await V.loadScript('films/kit.js'); if (!(root.FWBFilms || {})[id]) await V.loadScript('films/' + FILE_OF(id) + '.js'); } catch (e) { delete host.dataset.on; V.toast('The film could not be loaded', 6000, true); return; }
    const f = root.FWBFilms[id]; if (!f) return; if (f.load) await f.load('films/');   // the real Studio screens the film shows (a few JPEGs)
    if (!host.isConnected) return;
    if (P.id !== id) { P.id = id; P.t = 0; P.playing = false; }
    if (P.host && P.host !== host) { stopRec(); if (P.host.isConnected) unmount(P.host); }   // another film was playing (back to its poster), or the page was redrawn (a recording of the old canvas would freeze, so it ends)
    P.host = host; host.classList.add('on');
    host.querySelector('.fp-stage').innerHTML = `<canvas width="${f.W}" height="${f.H}" data-act="filmToggle" role="img" aria-label="${esc(f.title)}: ${esc(f.SCENES.map(s => s.name).join(', '))}"></canvas><button type="button" class="fp-big" data-act="filmToggle" aria-label="Play the film"><span class="fp-pl" aria-hidden="true"></span></button>`;
    host.querySelector('.fp-main').insertAdjacentHTML('beforeend', `<div class="fp-ctl"><button type="button" class="btn sm primary fp-play" data-act="filmToggle" aria-pressed="false">Play the film</button><input type="range" class="fp-range" min="0" max="${f.DUR}" step="0.1" value="0" aria-label="Position in the film"><span class="fp-time"></span><button type="button" class="btn sm fp-fs" data-act="filmFull" title="F for full screen; Esc or Backspace to leave">Full screen</button><button type="button" class="btn sm ghost" data-act="filmClose" title="Back to the poster">Close</button></div>`);
    host.querySelector('.fp-chs').innerHTML = `<div class="fp-ch" role="group" aria-label="Chapters">${f.SCENES.map(s => `<button type="button" data-act="filmSeek" data-t0="${s.t0}" data-t1="${s.t1}"><span>${mmss(s.t0)}</span>${esc(s.name)}</button>`).join('')}</div>`;
    host.querySelector('.fp-acts').insertAdjacentHTML('afterbegin', `<button type="button" class="btn sm" data-act="filmDownload" title="One small file that plays offline in any browser">Download (HTML)</button><button type="button" class="btn sm fp-vid" data-act="filmVideo" title="Records the film on this computer as a video file (about 1 to 2 MB) to send or share">Save as video</button>`);
    const r = host.querySelector('.fp-range'); r.addEventListener('input', () => { P.t = +r.value; paint(); });
    host.addEventListener('keydown', onKey);
    // draw at the size it is shown, times the screen's pixel ratio, so it stays sharp at any width and in full screen (not while recording)
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { const cv = host.querySelector('canvas'), st = host.querySelector('.fp-stage'); if (!cv || !st || P.rec) return; const w = Math.round(Math.min(st.clientWidth, st.clientHeight * f.W / f.H) * (root.devicePixelRatio || 1)); if (w > 0 && Math.abs(w - cv.width) > 2) { cv.width = w; cv.height = Math.round(w * f.H / f.W); if (P.host === host) paint(); } }).observe(host.querySelector('.fp-stage'));
    paint(); if (P.playing) play(true);
  }
  // a page redraw puts the open film back as a poster: fill that one in again, so it keeps its place and goes on playing (pages are redrawn as plain HTML, so there is no other hook)
  if (typeof MutationObserver !== 'undefined' && root.document) {
    new MutationObserver(() => { if (P.id && !(P.host && P.host.isConnected)) { const h = document.querySelector(`.fp-inline[data-film="${P.id}"]:not([data-on])`); if (h) mount(h); } }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !$('.fp-main.fp-max')) unHist(true); if (P.host) paint(); });
    root.addEventListener('popstate', () => { if (P.hist && P.host) full(false, true); });
    // Esc or Backspace leaves full screen wherever the focus is
    document.addEventListener('keydown', e => { if ((e.key === 'Escape' || e.key === 'Backspace') && isFull()) { e.preventDefault(); e.stopPropagation(); full(false); } }, true);
  }
  // the big round button hides while playing, so the keys (Space, F, arrows) stay with the player through its Play button
  ACT.filmToggle = a => { play(!P.playing); if (a && !a.classList.contains('fp-play')) { const b = $('.fp-play'); if (b) b.focus({ preventScroll: true }); } };
  // a poster pressed: load the film, put the player in its place and play at once
  ACT.filmOpen = async a => { const host = a.closest('.fp-inline'); if (!host || host.dataset.on) return; const id = host.dataset.film; if (P.id !== id || P.host !== host) { if (P.host && P.host !== host && P.host.isConnected) { P.playing = false; unmount(P.host); } P.id = id; P.t = 0; P.playing = false; }
    await mount(host); if (P.host === host) { play(true); const b = $('.fp-play'); if (b) b.focus({ preventScroll: true }); } };
  ACT.filmClose = () => { if (isFull()) full(false); P.playing = false; stopRec(); const h = P.host; P.host = null; P.id = ''; unmount(h); };
  ACT.filmSeek = a => { P.t = +a.getAttribute('data-t0') + 0.01; paint(); if (!P.playing) play(true); };
  ACT.filmFull = () => full(!isFull());
  // a real video file, made on this computer when asked (the app itself ships only the 16 KB film code): the film plays once to the end while it records
  ACT.filmVideo = () => { const f = film(), cv = $('canvas'), b = $('.fp-vid'); if (!f || !cv) return; if (P.rec) return;
    const type = root.MediaRecorder && cv.captureStream ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) : null; if (!type) { V.toast('This browser cannot save a video file. Use Download (HTML) instead.', 6000, true); return; }
    const parts = []; const rec = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 160000 }); rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    rec.onstop = () => { P.rec = null; if (b) { b.disabled = false; b.textContent = 'Save as video'; } if (parts.length) V.download(P.id + '-film.webm', new Blob(parts, { type: 'video/webm' })); };
    P.rec = rec; if (b) { b.disabled = true; b.textContent = 'Recording… plays to the end'; } P.t = 0; rec.start(1000); play(true); };
  // one HTML file that plays offline: the film code and a small player, nothing fetched from outside
  ACT.filmDownload = async () => { const f = film(); if (!f) return; let code = '', srcs = {}; try { code = await (await fetch('films/kit.js')).text() + '\n' + await (await fetch('films/' + FILE_OF(P.id) + '.js')).text(); for (const k of f.FILES || []) { const bl = await (await fetch('films/' + (f.path ? f.path(k) : P.id + '/' + k + '.jpg'))).blob(); srcs[k] = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(bl); }); } } catch (e) { V.toast('The film could not be read for the download', 6000, true); return; }
    const player = `const F=FWBFilms[${JSON.stringify(P.id)}],cv=document.getElementById('c'),g=cv.getContext('2d'),r=document.getElementById('r'),b=document.getElementById('b'),tm=document.getElementById('tm');let t=0,on=false,last=0;const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');function paint(){g.setTransform(cv.width/F.W,0,0,cv.height/F.H,0,0);F.draw(g,t);r.value=t;tm.textContent=mm(t)+' / '+mm(F.DUR);b.textContent=on?'Pause':'Play';}function loop(ts){if(on){t=Math.min(F.DUR,t+(ts-(last||ts))/1000);if(t>=F.DUR)on=false;}last=ts;paint();if(on)requestAnimationFrame(loop);}b.onclick=()=>{if(t>=F.DUR)t=0;on=!on;last=0;requestAnimationFrame(loop);};r.oninput=()=>{t=+r.value;paint();};r.max=F.DUR;(F.load?F.load('',${JSON.stringify(srcs)}):Promise.resolve()).then(paint);`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(f.title)}</title><style>body{margin:0;background:#F8FAFC;font:15px Inter,"Segoe UI",system-ui,sans-serif;color:#0F172A}main{max-width:1280px;margin:0 auto;padding:16px}canvas{width:100%;height:auto;border-radius:12px;box-shadow:0 8px 24px rgba(16,24,40,.12);background:#fff}.c{display:flex;gap:12px;align-items:center;margin-top:12px}input{flex:1}button{font:inherit;padding:8px 18px;border-radius:10px;border:0;background:#1570EF;color:#fff;cursor:pointer}</style></head><body><main><h1 style="font-size:20px">${esc(f.title)}</h1><canvas id="c" width="${f.W}" height="${f.H}"></canvas><div class="c"><button id="b">Play</button><input id="r" type="range" min="0" step="0.1" value="0" aria-label="Position"><span id="tm"></span></div></main><script>${code.replace(/<\/script/gi, '<\\/script')}</script><script>${player}</script></body></html>`;
    V.download(P.id + '-film.html', new Blob([html], { type: 'text/html' })); };
})(typeof window !== 'undefined' ? window : globalThis);
