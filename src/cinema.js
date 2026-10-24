/* Cinematic introduction used for the opening page and for the roadmap shown after sign-in.
   One engine, several short scenes: brand reveal (the logo's two squares drop into place), the twelve delivery stages as blocks that stack
   up, the connected platform with its modules, a coverflow of Facilio illustrations, and the call to action. Lottie animations (authored in
   tools/make-lottie.mjs, played by the vendored lottie-web light player) add the burst, the stage ticks, the AI spark and the button pulse.
   Nothing here reads project data. Copy is generic and never shows made-up numbers. Reduced motion: only the last scene, static. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const V = root.FWBViews; const F = root.FWB; const esc = F.esc;
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Lottie (loaded on demand; the page works without it) ----------
  let lp = null;
  const lottie = () => lp || (lp = new Promise(res => { if (root.lottie) return res(root.lottie); const s = doc.createElement('script'); s.src = 'vendor/lottie_light.min.js'; s.onload = () => res(root.lottie || null); s.onerror = () => res(null); doc.head.appendChild(s); }));
  const play = (el, name, o) => lottie().then(L => { if (!L || !el || !el.isConnected) return null; try { return L.loadAnimation(Object.assign({ container: el, renderer: 'svg', loop: false, autoplay: true, path: 'brand/lottie/' + name + '.json', rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } }, o || {})); } catch (e) { return null; } });

  // ---------- copy ----------
  const STAGES = () => (V._isoLifecycle ? V._isoLifecycle().map(l => l.label) : ['Kick-off', 'Workshops', 'Requirements', 'BRD', 'Configuration', 'UAT', 'FTR', 'Training', 'Go-live', 'Hypercare', 'Handover', 'Closure']);
  // original Lottie illustrations (tools/make-scenes.mjs), three per audience
  const ART = {
    team: [['scene-workshop', 'Workshops that stay on track'], ['scene-brd', 'BRDs drafted with AI assistance'], ['scene-dash', 'Delivery dashboards']],
    customer: [['scene-workshop', 'Workshops where your voice counts'], ['scene-dash', 'Progress you can follow'], ['scene-guide', 'Guides for your team']]
  };
  const DESC = ['Goals, team and plan agreed', 'Process walked through together', 'Needs captured and prioritised', 'Scope written down and signed', 'The solution is set up', 'Tested with your scenarios', 'Results checked against KPIs', 'Guides and learning for users', 'Ready to switch over', 'Close support after launch', 'Day-to-day support in place', 'Outcomes reviewed and closed'];
  const FLOW = { public: ['brand', 'journey', 'platform', 'cta'], team: ['brand', 'people', 'platform', 'cta'], customer: ['brand', 'journey', 'people', 'cta'] };
  const MS = { brand: 3300, journey: 7600, platform: 4800, people: 8000, cta: 0 };
  const HEAD = {
    journey: { public: 'Twelve stages. One connected journey.', team: 'Twelve stages. One connected journey.', customer: 'Twelve stages. One shared journey.' },
    platform: { public: 'One platform, every module connected.', team: 'One platform, every module connected.', customer: 'One platform, every module connected.' },
    people: { team: 'Built for the people who deliver.', customer: 'Built around your project.', public: 'Built for every project.' },
    cta: { public: 'Facilio Delivery Studio', team: 'Your workspace is ready.', customer: 'Your project is ready.' }
  };
  const SUB = {
    brand: { public: 'Where every customer implementation comes together.', team: 'Every customer project, in one workspace.', customer: 'A shared workspace for your implementation.' },
    cta: { public: 'Plan, document and deliver Facilio implementations, from kick-off to handover.', team: 'Pick up where you left off, or start a new customer project.', customer: 'Follow each milestone, review requirements and find your guides.' }
  };
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';

  V.cinema = function (opts) {
    opts = opts || {}; const aud = opts.aud || 'public'; const flow = FLOW[aud] || FLOW.public; const still = reduce();
    return new Promise(resolve => {
      let n = 0, closed = false, timer = null, raf = 0, car = null, anims = [];
      const o = doc.createElement('div'); o.className = 'cn' + (still ? ' still' : ''); o.setAttribute('data-aud', aud); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Facilio Delivery Studio introduction');
      const name = first(opts.name);
      const sceneHtml = {
        brand: () => `<div class="cn-sc cn-brand" data-k="brand"><div class="cn-logo"><div class="cn-burst" data-lt="burst"></div><div class="cn-mark"><img class="cn-wm" src="brand/logo-white.png" alt="Facilio" width="640" height="176"><i class="cn-sq p"></i><i class="cn-sq t"></i></div></div>
          <p class="cn-tag">${name ? `<b>Welcome, ${esc(name)}</b>` : ''}<span>${esc(SUB.brand[aud])}</span></p></div>`,
        journey: () => `<div class="cn-sc cn-journey" data-k="journey"><h2 class="cn-h">${esc(HEAD.journey[aud])}</h2><ol class="cn-blocks" aria-label="Delivery lifecycle">${STAGES().map((l, k) => `<li style="--k:${k};--c:var(--cn-c${k % 4})"><span class="cn-chip"></span><i>${k + 1}</i><b>${esc(l)}</b><em>${esc(DESC[k] || '')}</em><u data-lt="check"></u><s></s></li>`).join('')}</ol></div>`,
        platform: () => `<div class="cn-sc cn-platform" data-k="platform"><h2 class="cn-h">${esc(HEAD.platform[aud])}</h2><div class="cn-eco" data-eco></div><p class="cn-ai"><span class="cn-spark" data-lt="orbit"></span><span>Facilio AI assists with drafts. People review and decide.</span></p></div>`,
        people: () => { const L = ART[aud === 'customer' ? 'customer' : 'team']; return `<div class="cn-sc cn-people" data-k="people"><h2 class="cn-h">${esc(HEAD.people[aud])}</h2><div class="cn-cards">${L.map(([f, t], i) => `<figure style="--i:${i}"><div class="cn-art" data-lt="${f}"></div><figcaption>${esc(t)}</figcaption></figure>`).join('')}</div></div>`; },
        cta: () => `<div class="cn-sc cn-cta" data-k="cta"><div class="cn-mark sm"><img class="cn-wm" src="brand/logo-white.png" alt="" width="640" height="176"><i class="cn-sq p"></i><i class="cn-sq t"></i></div><h1 class="cn-h big">${esc(HEAD.cta[aud])}</h1><p class="cn-sub">${esc(SUB.cta[aud])}</p>
          <div class="cn-go-wrap"><div class="cn-pulse" data-lt="pulse" aria-hidden="true"></div><button type="button" class="cn-go" data-r="go">${esc(opts.cta || 'Get started')}</button></div>${opts.off ? `<label class="cn-off"><input type="checkbox" id="cnOff"> Do not show this introduction again</label>` : ''}</div>`
      };
      const list = still ? ['cta'] : flow;
      o.innerHTML = `<canvas class="cn-bg" aria-hidden="true"></canvas><div class="cn-glow" aria-hidden="true"></div>
        <div class="cn-top"><img src="brand/logo-white.png" alt="Facilio" height="22"><span class="cn-div"></span><span class="cn-crumb">Delivery Studio</span><div class="cn-prog" aria-hidden="true">${list.map(() => '<i><b></b></i>').join('')}</div><button type="button" class="cn-skip" data-r="skip">Skip</button></div>
        <div class="cn-stage">${list.map(k => sceneHtml[k]()).join('')}</div>`;
      doc.body.appendChild(o); doc.body.classList.add('cn-on');
      const scenes = [...o.querySelectorAll('.cn-sc')], bars = [...o.querySelectorAll('.cn-prog i')];

      // ---------- drifting blocks (the logo's squares) on a canvas ----------
      const cv = o.querySelector('.cn-bg'); let ctx = null, blocks = [], W = 0, H = 0, speed = 1, last = 0;
      function size() { const d = Math.min(2, root.devicePixelRatio || 1); W = o.clientWidth; H = o.clientHeight; cv.width = W * d; cv.height = H * d; if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0); }
      if (!still && cv.getContext) {
        ctx = cv.getContext('2d'); size(); const cols = ['229,25,127', '46,201,196', '21,112,239', '141,184,255']; const cnt = W < 700 ? 22 : 44;
        for (let i = 0; i < cnt; i++) blocks.push({ x: Math.random() * W, y: Math.random() * H, s: 5 + Math.random() * 17, v: 6 + Math.random() * 18, r: Math.random() * 6, w: (Math.random() - .5) * .5, c: cols[i % 4], a: .1 + Math.random() * .22, z: .4 + Math.random() * .9 });
        const tick = t => { if (closed) return; const dt = Math.min(.05, (t - last) / 1000 || .016); last = t; ctx.clearRect(0, 0, W, H); for (const b of blocks) { b.y -= b.v * b.z * speed * dt; b.r += b.w * dt; if (b.y < -30) { b.y = H + 30; b.x = Math.random() * W; } ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = `rgba(${b.c},${b.a})`; const s = b.s * b.z; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); } raf = root.requestAnimationFrame(tick); };
        raf = root.requestAnimationFrame(tick);
      }
      const onResize = () => { if (ctx) size(); onFit(); }; root.addEventListener('resize', onResize);

      // ---------- scene control ----------
      // scale the platform scene down (never up) so the heading, stage and note always fit the screen height
      function fit(s) { const host = s.querySelector('[data-eco]'); if (!host) return; host.style.transform = ''; host.style.marginBottom = ''; const avail = o.clientHeight - 64 - (s.querySelector('.cn-h').offsetHeight + 36) - (s.querySelector('.cn-ai').offsetHeight + 28) - 24; const h = host.offsetHeight; if (h > avail && avail > 120) { const k = avail / h; host.style.transformOrigin = 'top center'; host.style.transform = 'scale(' + k.toFixed(3) + ')'; host.style.marginBottom = (-(h - avail)).toFixed(0) + 'px'; } }
      const onFit = () => { const s = scenes.find(x => x.getAttribute('data-k') === 'platform'); if (s && s.classList.contains('on')) fit(s); };
      function activate(i) {
        n = i; speed = scenes[i].getAttribute('data-k') === 'journey' ? 3 : 1;
        scenes.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); }); o.setAttribute('data-sc', scenes[i].getAttribute('data-k'));
        bars.forEach((b, k) => { b.className = k < i ? 'full' : k === i ? 'run' : ''; if (k === i) b.style.setProperty('--ms', (MS[list[i]] || 0) + 'ms'); });
        anims.forEach(a => { try { a.destroy(); } catch (e) { } }); anims = [];
        const s = scenes[i], k = list[i];
        if (!still) {
          s.querySelectorAll('[data-lt]:not(.cn-blocks u)').forEach(el => { const nm = el.getAttribute('data-lt'); play(el, nm, { loop: nm === 'orbit' || nm === 'pulse' || nm.indexOf('scene-') === 0 }).then(a => a && anims.push(a)); });
          if (k === 'journey') s.querySelectorAll('.cn-blocks li').forEach((li, j) => { setTimeout(() => { if (closed || n !== i) return; const pv = s.querySelector('.cn-blocks li.act'); if (pv) pv.classList.remove('act'); li.classList.add('lit', 'act'); const u = li.querySelector('u'); play(u, 'check').then(a => a && anims.push(a)); }, 900 + j * 540); });
          if (k === 'platform') { const host = s.querySelector('[data-eco]'); if (host && V.ecoStage) { host.innerHTML = V.ecoStage({ audience: aud, dark: true }); fit(s); } }
        }
        if (k === 'cta') { const g = s.querySelector('.cn-go'); setTimeout(() => { try { g.focus({ preventScroll: true }); } catch (e) { } }, 500); }
      }
      function next() { if (closed || n >= list.length - 1) return; activate(n + 1); if (n < list.length - 1) timer = setTimeout(next, MS[list[n]]); }
      function finish(how) {
        if (closed) return; closed = true; clearTimeout(timer); if (car) clearInterval(car); root.cancelAnimationFrame(raf); anims.forEach(a => { try { a.destroy(); } catch (e) { } });
        const off = o.querySelector('#cnOff'); const flag = !!(off && off.checked);
        o.classList.add('out'); doc.body.classList.remove('cn-on'); root.removeEventListener('keydown', key); root.removeEventListener('resize', onResize);
        setTimeout(() => o.remove(), still ? 0 : 600); resolve({ how, off: flag });
      }
      const key = e => { if (e.key === 'Escape') finish('skip'); else if (e.key === 'Enter' && o.getAttribute('data-sc') === 'cta' && doc.activeElement && doc.activeElement.tagName !== 'INPUT') finish('go'); };
      o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) finish(b.getAttribute('data-r')); });
      root.addEventListener('keydown', key);
      activate(0); if (list.length > 1) timer = setTimeout(next, MS[list[0]]);
      const sk = o.querySelector('.cn-skip'); if (sk) sk.focus({ preventScroll: true });
    });
  };

  // ---------- page-level Lottie: any element with data-lottie="name" plays that animation in a loop (home page, admin pages, empty states) ----------
  const live = new Map();
  function mount(el) {
    if (live.has(el) || reduce()) return; const nm = el.getAttribute('data-lottie'); live.set(el, null);
    play(el, nm, { loop: true }).then(a => { if (a) live.set(el, a); });
  }
  function sweep() { live.forEach((a, el) => { if (!el.isConnected) { try { a && a.destroy(); } catch (e) { } live.delete(el); } }); doc.querySelectorAll('[data-lottie]').forEach(mount); }
  let pend = 0; const mo = new MutationObserver(() => { if (pend) return; pend = root.setTimeout(() => { pend = 0; sweep(); }, 60); });
  const startMo = () => { mo.observe(doc.body, { childList: true, subtree: true }); sweep(); };
  if (doc.body) startMo(); else doc.addEventListener('DOMContentLoaded', startMo);
  V.lottiePlay = play;
})(typeof window !== 'undefined' ? window : globalThis);
