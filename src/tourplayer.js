/* Product Tour player: a guided, full-screen walk through the real Facilio screens, chapter by chapter, with a short explanation for each one.
   Plays on its own (pause any time), or step with the arrows / keyboard. Uses the same screens and wording as the Product Tour page
   (src/demokit-data.js); nothing is invented here and nothing needs Facilio sign-in. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const DK = () => root.FWBDemoKit || { screens: [] };
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const PLAY_MS = 7000;
  let T = null; // { steps, i, auto, timer }
  const chapters = () => (V.sfGroups || []).map(g => ({ g, items: DK().screens.filter(x => x[5] && g.has(x)) })).filter(c => c.items.length);
  const flat = () => { const out = []; chapters().forEach((c, ci, all) => c.items.forEach((x, k) => out.push({ x, ci, n: all.length, g: c.g, first: k === 0, k, of: c.items.length }))); return out; };
  function stop() { if (T && T.timer) clearTimeout(T.timer); }
  function schedule() { stop(); if (T && T.auto) T.timer = setTimeout(() => go(1, true), PLAY_MS); }
  function close() { stop(); T = null; const p = document.getElementById('tourP'); if (p) p.remove(); document.removeEventListener('keydown', onKey); document.body.classList.remove('tp-open'); }
  const onKey = e => { if (!T) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === ' ' && !/BUTTON/.test(e.target.tagName)) { e.preventDefault(); toggle(); } };
  function go(d, fromTimer) { if (!T) return; let i = T.i + d; if (i >= T.steps.length) { if (fromTimer) { T.auto = false; draw(); return; } i = T.steps.length - 1; } if (i < 0) i = 0; T.i = i; draw(); }
  function toggle() { if (!T) return; T.auto = !T.auto; draw(); }
  function draw() {
    const s = T.steps[T.i]; const x = s.x; let p = document.getElementById('tourP');
    if (!p) { p = document.createElement('div'); p.id = 'tourP'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Facilio product tour'); document.body.appendChild(p); document.addEventListener('keydown', onKey); document.body.classList.add('tp-open'); }
    const segs = chapters().map((c, ci) => `<button type="button" class="tp-seg${ci === s.ci ? ' on' : ci < s.ci ? ' done' : ''}" data-act="tpChap" data-ci="${ci}" title="${esc(c.g.title)}"><i${ci === s.ci ? ` style="width:${Math.round((s.k + 1) / s.of * 100)}%"` : ''}></i></button>`).join('');
    p.innerHTML = `<header><span class="tp-chip">Chapter ${s.ci + 1} of ${s.n}</span><b class="tp-ct">${esc(s.g.title)}</b><span class="spacer"></span><button type="button" class="btn sm tp-b" data-act="tpAuto" aria-pressed="${T.auto}">${T.auto ? 'Pause' : 'Play'}</button>${cust() ? '' : '<button type="button" class="btn sm tp-b" data-act="tpVideo" title="Save this chapter as a video file, made in your browser">Save chapter as video</button>'}<button type="button" class="btn sm tp-b" data-act="tpClose" aria-label="Close the tour">Close</button></header>
      <div class="tp-stage"><button type="button" class="tp-nav" data-act="tpPrev" aria-label="Previous screen"${T.i === 0 ? ' disabled' : ''}>&#8249;</button>
        <figure class="tp-frame"><div class="tp-bar"><i></i><i></i><i></i><span>${esc(x[0])}</span></div><img class="tp-img" id="tpImg" alt="${esc(x[0] + ': ' + x[3])}" src="demokit/hd/${esc(x[5])}"></figure>
        <button type="button" class="tp-nav" data-act="tpNext" aria-label="Next screen"${T.i === T.steps.length - 1 ? ' disabled' : ''}>&#8250;</button></div>
      <footer><div class="tp-cap" aria-live="polite">${s.first ? `<small>${esc(s.g.blurb)}</small>` : `<small>${esc(s.g.title)} · ${s.k + 1} of ${s.of}</small>`}<b>${esc(x[0])}</b><p>${esc(x[3])}</p></div><div class="tp-segs" role="group" aria-label="Chapters">${segs}</div>${T.auto ? `<div class="tp-timer"><i style="animation-duration:${PLAY_MS}ms" key="${T.i}"></i></div>` : ''}</footer>`;
    const img = document.getElementById('tpImg'); img.addEventListener('error', () => { if (!img.dataset.f) { img.dataset.f = 1; img.src = 'demokit/' + x[5]; } });
    p.onmouseenter = () => { if (T && T.auto) stop(); }; p.onmouseleave = () => { if (T && T.auto) schedule(); }; schedule();
  }
  function start(ci) { const steps = flat(); if (!steps.length) { V.toast('No tour screens are available yet'); return; } T = { steps, i: Math.max(0, steps.findIndex(s => s.ci === (ci || 0))), auto: true, timer: 0 }; draw(); const b = document.querySelector('#tourP .tp-b'); if (b) b.focus(); }
  ACT.tpStart = a => start(Number(a && a.getAttribute && a.getAttribute('data-ci')) || 0);
  ACT.tpChap = a => { const ci = Number(a.getAttribute('data-ci')); const i = T.steps.findIndex(s => s.ci === ci); if (i >= 0) { T.i = i; draw(); } };
  // ----- save the current chapter as a video file (WebM), made in the browser from the same screens and words: free, no upload, no sign-in -----
  const wrap = (g, text, w) => { const words = String(text).split(/s+/); const lines = []; let l = ''; words.forEach(x => { const t = l ? l + ' ' + x : x; if (g.measureText(t).width > w && l) { lines.push(l); l = x; } else l = t; }); if (l) lines.push(l); return lines.slice(0, 3); };
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  let recording = false;
  ACT.tpVideo = async () => {
    if (!T || recording) return; if (!root.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { V.toast('This browser cannot record video. Use Chrome or Edge.', 5000, true); return; }
    const s0 = T.steps[T.i]; const steps = T.steps.filter(s => s.ci === s0.ci); const HOLD = 4200, FADE = 450; recording = true; T.auto = false; stop(); draw();
    try {
      const imgs = []; for (const s of steps) imgs.push(await loadImg('demokit/hd/' + s.x[5]).catch(() => loadImg('demokit/' + s.x[5])));
      const W = 1280, H = 720; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 4e6 }); const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(r => { rec.onstop = r; }); rec.start();
      const paint = (k, t) => { const s = steps[k], im = imgs[k], x = s.x; g.fillStyle = '#0E0B1F'; g.fillRect(0, 0, W, H); const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0E0B1F'); gr.addColorStop(1, '#1A1446'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const a = Math.min(1, t / FADE); g.globalAlpha = a; const bw = 1060, bh = 470, bx = (W - bw) / 2, by = 64; const sc = Math.min(bw / im.width, bh / im.height); const iw = im.width * sc, ih = im.height * sc; g.fillStyle = '#fff'; g.fillRect(bx + (bw - iw) / 2 - 2, by - 2, iw + 4, ih + 4); g.drawImage(im, bx + (bw - iw) / 2, by, iw, ih);
        g.fillStyle = '#7CF3C6'; g.font = '600 15px Inter, Arial'; g.fillText((s.g.title + ' · ' + (s.k + 1) + ' of ' + s.of).toUpperCase(), 110, 596); g.fillStyle = '#fff'; g.font = '700 30px Inter, Arial'; g.fillText(x[0], 110, 634); g.fillStyle = 'rgba(255,255,255,.82)'; g.font = '400 20px Inter, Arial'; wrap(g, x[3], W - 220).forEach((ln, n) => g.fillText(ln, 110, 666 + n * 26));
        g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, H - 5, W, 5); g.fillStyle = '#7CF3C6'; g.fillRect(0, H - 5, W * ((k + Math.min(1, t / HOLD)) / steps.length), 5); };
      for (let k = 0; k < steps.length; k++) { const t0 = performance.now(); await new Promise(res => { const tick = () => { const t = performance.now() - t0; paint(k, t); if (t < HOLD) setTimeout(tick, 33); else res(); }; tick(); }); }
      rec.stop(); await done; const blob = new Blob(chunks, { type: 'video/webm' }); const name = 'facilio-tour-' + String(s0.g.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.webm'; if (V.download) V.download(name, blob); else { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
      V.toast('Saved ' + name + ' (' + steps.length + ' screens)', 5000);
    } catch (e) { V.toast('The video could not be made: ' + (e.message || 'an image did not load'), 6000, true); } finally { recording = false; }
  };
  ACT.tpPrev = () => go(-1); ACT.tpNext = () => go(1); ACT.tpAuto = () => toggle(); ACT.tpClose = () => close();

  // the Product Tour page opens with a hero and chapter cards, then keeps the grid of every screen below
  const orig = V.seefacilio && V.seefacilio.html;
  if (orig) V.seefacilio.html = function () {
    const html = orig.call(this); const ch = chapters(); if (!ch.length) return html; const total = ch.reduce((n, c) => n + c.items.length, 0); const who = (F.S.project && F.S.project.customer) || 'your team';
    const hero = `<section class="tp-hero"><div><p class="tp-eyebrow">Guided tour</p><h2>See Facilio in about ${Math.max(2, Math.round(total * 7 / 60))} minutes</h2><p>${total} real screens in ${ch.length} short chapters, each with a plain explanation. ${cust() ? `Take it at your own pace before the sessions with ${esc(who)}'s Facilio team.` : 'Play it in a session, or send the customer to this page to watch before the workshop.'}</p><div class="row"><button class="btn primary" data-act="tpStart" data-ci="0">&#9654; Start the tour</button><span class="xs">Arrow keys step through. Esc closes.</span></div></div></section>
      <div class="tp-chaps">${ch.map((c, ci) => `<button type="button" class="tp-chap" data-act="tpStart" data-ci="${ci}"><span class="tp-cover"><img loading="lazy" alt="" src="demokit/${esc(c.items[0][5])}"></span><span class="tp-n">${ci + 1}</span><b>${esc(c.g.title)}</b><small>${esc(c.g.blurb)}</small><em>${c.items.length} screen${c.items.length === 1 ? '' : 's'} · Start here</em></button>`).join('')}</div><div class="sec-k" style="margin-top:26px"><p>Browse</p><h2>Every screen, to open at full size</h2></div>`;
    return html.replace('<div class="page-body">', () => '<div class="page-body">' + hero);
  };
})(typeof window !== 'undefined' ? window : globalThis);
