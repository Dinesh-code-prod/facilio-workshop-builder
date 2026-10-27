/* Liquid reveal, shared by the tree intro (Facilio team, "Get started") and the road-to-go-live journey (customers, "See how Delivery Studio helps").
   Three Facilio-coloured liquids (teal, pink, then blue) rise from the bottom and flood the screen; the Facilio wordmark fills up with liquid like a glass,
   "Delivery Studio" settles under it, then the liquid drains downward, blue first with pink and teal trailing, and uncovers the page underneath (sign-in).
   V.liquidReveal({ host, logo, dpr, onCovered, onEntered }) draws on its own canvas inside `host` (the intro's overlay) and resolves when it has drained.
   onCovered: the screen is fully flooded, so the caller can hide its own scene; onEntered: the drain starts, so the page underneath can play its entrance.
   Canvas 2D only; the timing is identical for both intros so they leave the same way. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews = root.FWBViews || {};
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const lerp = (a, b, t) => a + (b - a) * t;
  V.liquidReveal = function (o) {
    const host = o.host, DPR = o.dpr || Math.min(1.5, root.devicePixelRatio || 1);
    let logoImg = o.logoImg; if (!logoImg) { logoImg = new Image(); logoImg.src = o.logo || 'brand/logo-white.png'; }
    return new Promise(resolve => {
      const c = doc.createElement('canvas'); c.className = 'ti-liq'; c.setAttribute('aria-hidden', 'true'); host.appendChild(c);
      const x = c.getContext('2d'), lg = doc.createElement('canvas'), lx = lg.getContext('2d');
      let cw = 0, ch = 0;
      const fit = () => { cw = host.clientWidth; ch = host.clientHeight; c.width = Math.round(cw * DPR); c.height = Math.round(ch * DPR); };
      fit(); root.addEventListener('resize', fit);
      const LAY = [   // drawn back to front; the teal leads the rise and trails the drain, blue is the main body
        { c0: '#3FD6CF', c1: '#17A8A3', up: 0, dn: .34, amp: 15, k: .0105, sp: 3.0 },
        { c0: '#F0388F', c1: '#B8136A', up: .12, dn: .17, amp: 19, k: .0082, sp: 2.4 },
        { c0: '#2C7DF5', c1: '#1D1A5E', up: .24, dn: 0, amp: 23, k: .0062, sp: 1.9, main: true }
      ];
      const RISE = 1.0, FULL = LAY[2].up + RISE + .02, D0 = 2.55, DRAIN = 1.1, TEND = D0 + LAY[0].dn + DRAIN + .1;
      const bub = Array.from({ length: 26 }, () => ({ x: Math.random(), s: 1.5 + Math.random() * 3.5, v: .25 + Math.random() * .5, p: Math.random() }));
      const t0 = performance.now(); let covered = false, entered = false, done = false;
      const edge = (e, L) => e < D0 ? lerp(ch + 70, -90, easeIO((e - L.up) / RISE)) : lerp(-90, ch + 110, easeIO((e - D0 - L.dn) / DRAIN));
      const surf = (e, L, xx, amp) => amp * Math.sin(xx * L.k + e * L.sp) + amp * .45 * Math.sin(xx * L.k * 2.3 - e * L.sp * 1.4 + 1.3);
      function waveFill(ctx, e, L, y0, amp, w, fill) {
        ctx.beginPath(); ctx.moveTo(-10, ch + 20); ctx.lineTo(-10, y0 + surf(e, L, -10, amp));
        for (let xx = 0; xx <= w + 16; xx += 16) ctx.lineTo(xx, y0 + surf(e, L, xx, amp));
        ctx.lineTo(w + 20, ch + 20); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      }
      function step(now) {
        if (done) return;
        const e = (now - t0) / 1000;
        x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, cw, ch);
        for (const L of LAY) {
          const y0 = edge(e, L); if (y0 > ch + 60) continue;
          const mv = e < D0 ? Math.sin(Math.PI * clamp((e - L.up) / RISE)) : Math.sin(Math.PI * clamp((e - D0 - L.dn) / DRAIN));
          const amp = L.amp * (.35 + .65 * mv), gr = x.createLinearGradient(0, Math.max(-90, y0 - 30), 0, Math.max(-90, y0 - 30) + ch * .9);
          gr.addColorStop(0, L.c0); gr.addColorStop(1, L.c1); waveFill(x, e, L, y0, amp, cw, gr);
          // a bright meniscus along the surface
          x.beginPath(); for (let xx = -10; xx <= cw + 16; xx += 16) { const yy = y0 + surf(e, L, xx, amp); xx < 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); }
          x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2; x.stroke();
          if (L.main) for (const b of bub) {   // bubbles rising inside the main liquid
            const by = ch - ((e * b.v * ch * .55 + b.p * ch) % (ch + 40)), bx = b.x * cw + Math.sin(e * 2 + b.p * 9) * 8;
            if (by < y0 + 10) continue; x.fillStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.arc(bx, by, b.s, 0, TAU); x.fill();
          }
        }
        // the wordmark fills with liquid, like a glass
        const show = sm((e - .55) / .4) * (1 - sm((e - D0 + .15) / .45));
        if (show > 0 && logoImg.naturalWidth) {
          const w = Math.min(cw * .46, 440), h = w * logoImg.naturalHeight / logoImg.naturalWidth, gx = (cw - w) / 2, lift = 14 * sm((e - D0 + .15) / .45), gy = ch / 2 - h / 2 - 26 - lift;
          const pw = Math.round(w * DPR), ph = Math.round(h * DPR) + 2; if (lg.width !== pw || lg.height !== ph) { lg.width = pw; lg.height = ph; }
          lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, pw, ph); lx.globalCompositeOperation = 'source-over';
          const fl = easeIO((e - .85) / 1.15), lv = lerp(ph + 6, -8, fl), A = { k: .045 / DPR, sp: 4.2 };
          lx.beginPath(); lx.moveTo(-4, ph + 4); for (let xx = -4; xx <= pw + 8; xx += 6) lx.lineTo(xx, lv + (6 * DPR * (1 - fl * .6)) * Math.sin(xx * A.k + e * A.sp) + 2.5 * DPR * Math.sin(xx * A.k * 2.7 - e * 5));
          lx.lineTo(pw + 8, ph + 4); lx.closePath(); lx.fillStyle = '#fff'; lx.fill();
          lx.globalCompositeOperation = 'source-in'; lx.drawImage(logoImg, 0, 0, pw, ph - 2); lx.globalCompositeOperation = 'source-over';
          x.globalAlpha = .2 * show; x.drawImage(logoImg, gx, gy, w, h);   // the empty glass
          x.globalAlpha = show; x.drawImage(lg, gx, gy, w, h);
          const ds = sm((e - 1.55) / .5) * show;
          if (ds > 0) { x.globalAlpha = ds * .92; x.fillStyle = '#fff'; x.font = `500 ${Math.round(Math.max(15, w * .07))}px Inter, Roboto, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; try { x.letterSpacing = '0.14em'; } catch (er) { } x.fillText('Delivery Studio', cw / 2, gy + h + 18 + 8 * (1 - ds)); try { x.letterSpacing = '0px'; } catch (er) { } }
          x.globalAlpha = 1;
        }
        if (!covered && e >= FULL) { covered = true; if (o.onCovered) o.onCovered(); }   // fully flooded: the caller drops its scene and readies the page underneath
        if (!entered && e >= D0 - .05) { entered = true; if (o.onEntered) o.onEntered(); }
        if (e >= TEND) { done = true; root.removeEventListener('resize', fit); c.width = 1; c.height = 1; c.remove(); resolve(); return; }
        root.requestAnimationFrame(step);
      }
      root.requestAnimationFrame(step);
    });
  };
  // the page underneath plays its entrance while the liquid drains
  V.replayAuthEntrance = () => { const au = doc.querySelector('.auth'); if (au) { au.classList.remove('auth-in'); void au.offsetWidth; au.classList.add('auth-in'); } };
})(typeof window !== 'undefined' ? window : globalThis);
