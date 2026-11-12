/* Sign-in page, left side (team view): "How Delivery Studio works", seven short scenes in ONE product window, sequenced by one GSAP timeline (vendor/gsap.min.js, free standard licence).
   One idea per scene, real product screens shown mid-task (HTML, not abstract shapes), one calm ease, a labelled progress rail that can be clicked.
   Scenes: 1 one project holds the files, 2 AI drafts and shows sources, 3 people review and approve, 4 the customer signs off in the portal, 5 build and UAT stay linked to requirements,
   6 mail becomes tasks and Otto reminds in Teams, 7 go-live, hypercare, handover. All names and sample data are illustrative; no vendor names.
   Plays once per page view and holds the last picture; Replay restarts it; hidden tab pauses it; reduced motion shows the last picture and the rail jumps between scenes without motion.
   Without GSAP (the file did not load) the last picture is shown still. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const doc = root.document, old = V.isoLogin;
  const RM = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // [start second, rail label, caption title, caption text, window crumb]
  const CH = [
    [0, 'Files', 'One project holds everything', 'The contract, requirement session transcripts, customer mail and plans go into one project.', 'Project files'],
    [10, 'AI drafts', 'AI drafts, and shows its sources', 'It prepares the kick-off deck and plan, questions, BRD, solution, test cases and guides. Each draft points to where it came from.', 'AI drafts'],
    [20, 'Review', 'People review and decide', 'Your team edits each draft and approves it. Nothing is final until a person approves.', 'Requirements'],
    [30, 'Sign-off', 'The customer signs off online', 'The customer approves the BRD, UAT and go-live in their own portal.', 'Customer portal'],
    [40, 'Build', 'Build and test stay linked', 'Configuration and test cases stay tied to the requirement they prove. A failed test is fixed on the same record.', 'Configuration and UAT'],
    [50, 'Tasks', 'Tasks and mail keep everyone on track', 'Customer mail becomes tasks. Otto reminds people in Teams what is due.', 'Tasks and mail'],
    [60, 'Go-live', 'Go live, then hand over', 'Go-live, hypercare and the handover pack close the project with nothing lost.', 'Go-live and handover']
  ];
  const END = 71;
  const I = {
    f: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 1.5h6.5L13 5v9.5H3zM9 1.5V5h4" fill="none" stroke="#1570EF" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    ar: '<svg viewBox="0 0 20 24" width="16" height="19" aria-hidden="true"><path d="M2 1l15 11-7 1.5-3 8z" fill="#171717" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  };
  const pill = (c, t, x) => `<span class="lz-p ${c}${x ? ' ' + x : ''}">${esc(t)}</span>`;
  const av = (t, x) => `<i class="lz-av${x ? ' ' + x : ''}">${t}</i>`;
  const sc = (n, b) => `<div class="lz-sc lzs${n}">${b}</div>`;

  function scenes() {
    const files = [['Contract', 'Signed agreement and scope'], ['Requirement sessions', 'Meeting transcripts'], ['Customer mail', 'Messages about the project'], ['Plans', 'Dates and phases']];
    const s1 = files.map(([a, b]) => `<div class="lz-r s1r">${I.f}<div><b>${a}</b><small>${b}</small></div>${pill('lz-ok', 'Added', 's1a')}</div>`).join('')
      + '<div class="lz-foot s1n">Everything the team needs is now in one project.</div>';
    const drafts = ['Kick-off deck and plan', 'Requirement questions', 'BRD', 'Solution', 'Test cases', 'Guides'];
    const s2 = '<div class="lz-g2"><div class="lz-col">' + drafts.map(d => `<div class="lz-chip s2c"><span>${d}</span><u class="s2b"></u>${pill('lz-ai', 'AI draft', 's2t')}</div>`).join('') + '</div>'
      + `<div class="lz-card s2d"><div class="lz-top"><b>R-03 Requirement</b>${pill('lz-ai', 'AI draft')}</div><p>Supervisors are alerted when an SLA is breached.</p>`
      + `<div class="lz-why">Where this came from</div><div class="lz-src s2s">${I.f}<span>Requirement session 2, transcript</span></div><div class="lz-src s2s">${I.f}<span>Contract, SLA clause</span></div></div></div>`
      + '<div class="lz-foot s2n">Every draft shows its sources, so people can check it.</div>';
    const s3 = `<div class="lz-card lz-wide s3c"><div class="lz-top"><b>R-03 Requirement</b><span class="lz-sw">${pill('lz-wa', 'To review', 's3w')}${pill('lz-ok', 'Approved', 's3a')}</span></div>`
      + '<p class="lz-sw2"><span class="s3o">Supervisors are alerted when an SLA is breached.</span><span class="s3n">Supervisors are alerted <mark>by email and Teams</mark> when an SLA is breached.</span></p>'
      + `<div class="lz-bar"><span class="lz-who s3who">${av('MS')}<small>Approved by Meera S.</small></span><button type="button" tabindex="-1" class="lz-btn s3b">Approve</button></div></div>`
      + `<div class="lz-cur s3cur">${I.ar}</div><div class="lz-foot s3n2">Nothing is final until a person approves.</div>`;
    const prow = (k, a, b) => `<div class="lz-r s4r"><div><b>${a}</b><small>${b}</small></div><span class="lz-sw">${pill('lz-wa', 'Waiting', 's4w' + k)}${pill('lz-ok', 'Approved', 's4a' + k)}</span><button type="button" tabindex="-1" class="lz-btn s4b${k}">Approve</button></div>`;
    const s4 = '<div class="lz-portal"><div class="lz-ph">Customer portal<small>Riverside Facilities</small></div>' + prow(1, 'Business requirements document', 'Version 1') + prow(2, 'User acceptance testing', 'All test cases') + prow(3, 'Go-live', 'Ready to switch on') + '</div>'
      + '<div class="lz-foot s4n">Each approval keeps the name and the date.</div>';
    const trow = (k, a, b, c, t) => `<div class="lz-tr s5r s5r${k}"><div class="lz-n"><small>Requirement</small><b>${a}</b></div><i class="lz-ln s5l"></i><div class="lz-n"><small>Configuration</small><b>${b}</b></div><i class="lz-ln s5l"></i><div class="lz-n"><small>Test case</small><b>${c}</b>${t}</div></div>`;
    const s5 = trow(1, 'Weekly readings', 'Readings module', 'Reading shows', pill('lz-ok', 'Pass', 's5p1'))
      + trow(2, 'SLA alerts', 'SLA rule', 'Alert is sent', pill('lz-bad', 'Fail', 's5f') + pill('lz-ok', 'Pass', 's5p2'))
      + trow(3, 'Documents', 'Work order links', 'Document opens', pill('lz-ok', 'Pass', 's5p3'))
      + '<div class="lz-fix s5x">Fixed on the same record</div><div class="lz-foot s5n">Every requirement has a test that proves it.</div>';
    const s6 = '<div class="lz-g2"><div class="lz-card s6m"><div class="lz-top"><b>Customer mail</b>' + pill('lz-ai', 'New') + '</div><p><b>Re: alert wording</b><br><span>Please send the alert by email too.</span></p><button type="button" tabindex="-1" class="lz-btn s6b">Make a task</button></div>'
      + '<div class="lz-card s6t"><div class="lz-top"><b>Tasks</b></div><div class="lz-tk"><span>Update SLA rule</span><small>Due today</small></div><div class="lz-tk s6n"><span>Answer: alert wording</span><small>Due Friday</small></div><div class="lz-tk"><span>Share test results</span><small>Due next week</small></div></div></div>'
      + `<div class="lz-teams s6x"><i class="lz-av lz-o">O</i><div><b>Otto in Teams</b><span>Reminder: 1 task is due today.</span></div></div>`;
    const steps = ['Go-live', 'Hypercare', 'Handover'];
    const s7 = '<div class="lz-track">' + steps.map((a, i) => `<div class="lz-st s7s"><i class="s7d"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.5 6.3l2.4 2.4 4.6-5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i><b>${a}</b>${i === 0 ? pill('lz-ok', 'Live', 's7l') : ''}</div>`).join('') + '</div>'
      + '<div class="lz-pack s7p"><b>Handover pack</b><div class="lz-tiles">' + ['Guides', 'BRD', 'Configuration', 'Test results'].map(t => `<div class="lz-tl s7t">${I.f}<span>${t}</span></div>`).join('') + '</div></div>'
      + '<div class="lz-foot s7n">The customer team has everything it needs to run on its own.</div>';
    return [s1, s2, s3, s4, s5, s6, s7].map((b, i) => sc(i + 1, b)).join('');
  }

  function html() {
    const aria = 'How Delivery Studio works: one project holds the files, AI drafts and shows its sources, people review and approve, the customer signs off online, build and test stay linked to the requirements, tasks and mail keep the team on track, then go-live, hypercare and handover.';
    return `<div class="lsx lsn" data-aud="team"><div class="lsx-top"><div class="lsx-cap" aria-live="polite"><b>${esc(CH[0][2])}</b><span>${esc(CH[0][3])}</span></div></div>`
      + `<div class="lsn-fit"><div class="lsn-win" role="img" aria-label="${esc(aria)}"><div class="lsn-bar"><b>Riverside Towers rollout</b><i>/</i><span class="lsn-crumb">${esc(CH[0][4])}</span><em>${av('MS')}${av('DR')}${av('PN')}</em></div><div class="lsn-body" aria-hidden="true">${scenes()}</div></div></div>`
      + `<ol class="lsn-rail">${CH.map((c, i) => `<li><button type="button" data-i="${i}" aria-label="${esc(c[1])}"><u><i></i></u><span>${esc(c[1])}</span></button></li>`).join('')}</ol>`
      + '<div class="lsx-row"><button type="button" class="lsx-rp">Replay</button><small>Illustrative: sample names and data</small></div></div>';
  }

  let gs = null;
  const lib = () => gs || (gs = new Promise(res => { if (root.gsap) return res(root.gsap); const s = doc.createElement('script'); s.src = 'vendor/gsap.min.js'; s.onload = () => res(root.gsap || null); s.onerror = () => res(null); doc.head.appendChild(s); }));
  let TL = null;
  function build(el, gsap) {
    const q = (s, r) => [...(r || el).querySelectorAll(s)], sel = s => el.querySelector(s);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: .5 } });
    const show = (t, sc, x, y) => tl.fromTo(sc, { opacity: 0, x: x || 0, y: y === undefined ? 10 : y }, { opacity: 1, x: 0, y: 0 }, t);
    const pop = (t, sel_, from) => tl.fromTo(sel_, Object.assign({ opacity: 0, scale: .85 }, from), { opacity: 1, scale: 1, duration: .35, ease: 'back.out(1.8)' }, t);
    const flip = (t, a, b) => { tl.to(a, { opacity: 0, duration: .2 }, t); pop(t + .05, b); };
    // scene containers: in, hold, out (the last one stays)
    q('.lz-sc').forEach((s, i) => { tl.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, CH[i][0]); if (i < CH.length - 1) tl.to(s, { autoAlpha: 0, duration: .35, ease: 'power2.in' }, CH[i + 1][0] - .35); });
    // 1 files land in one project
    let t = CH[0][0];
    q('.s1r').forEach((r, i) => { show(t + .7 + i * .9, r, -24, 0); pop(t + 1.3 + i * .9, q('.s1a')[i]); });
    show(t + 5, sel('.s1n'), 0, 8);
    // 2 AI drafts with sources
    t = CH[1][0];
    q('.s2c').forEach((c, i) => { show(t + .4 + i * .4, c, 0, 8); tl.fromTo(q('.s2b')[i], { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power1.inOut' }, t + .7 + i * .4); tl.fromTo(q('.s2t')[i], { opacity: 0 }, { opacity: 1, duration: .25 }, t + 1.35 + i * .4); });
    show(t + 3, sel('.s2d'), 18, 0); show(t + 3.9, q('.s2s')[0], 0, 6); show(t + 4.6, q('.s2s')[1], 0, 6);
    tl.to(q('.s2s'), { backgroundColor: 'rgba(21,112,239,.12)', duration: .3, stagger: .25, yoyo: true, repeat: 1 }, t + 6);
    show(t + 6.5, sel('.s2n'), 0, 8);
    // 3 a person edits and approves
    t = CH[2][0];
    tl.set(q('.s3a, .s3who, .s3n'), { opacity: 0 }, t); tl.set(q('.s3o'), { opacity: 1 }, t);
    show(t + .5, sel('.s3c'), 0, 12);
    tl.fromTo(sel('.s3cur'), { opacity: 0, x: 330, y: 250 }, { opacity: 1, x: 300, y: 128, duration: 1.2, ease: 'power2.inOut' }, t + 1.6)
      .to(q('.s3o'), { opacity: 0, duration: .25 }, t + 3.2).to(q('.s3n'), { opacity: 1, duration: .35 }, t + 3.3)
      .to(sel('.s3cur'), { x: 392, y: 205, duration: 1, ease: 'power2.inOut' }, t + 4.6)
      .to(sel('.s3b'), { scale: .94, duration: .1, yoyo: true, repeat: 1 }, t + 5.8);
    flip(t + 6, q('.s3w'), q('.s3a')); tl.to(q('.s3who'), { opacity: 1, duration: .4 }, t + 6.3).to(sel('.s3cur'), { opacity: 0, duration: .3 }, t + 6.6);
    show(t + 7.4, sel('.s3n2'), 0, 8);
    // 4 customer signs off
    t = CH[3][0];
    tl.set(q('.s4a1, .s4a2, .s4a3'), { opacity: 0 }, t);
    show(t + .5, sel('.lz-portal'), 0, 12);
    [1, 2, 3].forEach(k => { const u = t + 2 + (k - 1) * 2; tl.to(sel('.s4b' + k), { scale: .93, duration: .1, yoyo: true, repeat: 1 }, u); flip(u + .25, sel('.s4w' + k), sel('.s4a' + k)); tl.to(sel('.s4b' + k), { opacity: 0, duration: .2 }, u + .3); });
    show(t + 8, sel('.s4n'), 0, 8);
    // 5 requirement, configuration, test: one fails and is fixed
    t = CH[4][0];
    tl.set(q('.s5p1, .s5p2, .s5p3, .s5f, .s5x'), { opacity: 0 }, t);
    q('.s5r').forEach((r, i) => show(t + .4 + i * .35, r, 0, 10));
    tl.fromTo(q('.s5l'), { scaleX: 0 }, { scaleX: 1, duration: .45, stagger: .12, transformOrigin: '0 50%' }, t + 1.6);
    pop(t + 3, sel('.s5p1')); pop(t + 3.4, sel('.s5f')); tl.to(sel('.s5f'), { x: 3, yoyo: true, repeat: 3, duration: .06 }, t + 3.8);
    show(t + 4.4, sel('.s5x'), 0, 4); flip(t + 5.4, sel('.s5f'), sel('.s5p2')); pop(t + 6, sel('.s5p3'));
    show(t + 7, sel('.s5n'), 0, 8);
    // 6 mail becomes a task, Otto reminds in Teams
    t = CH[5][0];
    show(t + .5, sel('.s6m'), 0, 10); show(t + .8, sel('.s6t'), 0, 10);
    tl.fromTo(sel('.s6n'), { opacity: 0, x: -14 }, { opacity: 1, x: 0 }, t + 3.2).to(sel('.s6b'), { scale: .94, duration: .1, yoyo: true, repeat: 1 }, t + 2.8)
      .to(sel('.s6n'), { backgroundColor: 'rgba(21,112,239,.12)', duration: .4, yoyo: true, repeat: 1 }, t + 3.6);
    show(t + 5.8, sel('.s6x'), 0, 14);
    // 7 go-live, hypercare, handover
    t = CH[6][0];
    tl.set(sel('.s7l'), { opacity: 0 }, t);
    q('.s7s').forEach((s, i) => { show(t + .5 + i * .3, s, 0, 8); tl.fromTo(q('.s7d')[i], { backgroundColor: '#d4d9e1' }, { backgroundColor: '#16824a', duration: .3 }, t + 1.6 + i * 1.5); });
    pop(t + 1.8, sel('.s7l'));
    show(t + 5.2, sel('.s7p'), 0, 12); q('.s7t').forEach((x, i) => show(t + 5.8 + i * .25, x, 0, 8));
    show(t + 8, sel('.s7n'), 0, 8);
    tl.set({}, {}, END);   // the timeline lasts END seconds: the last picture is held
    return tl;
  }

  function init() {
    const el = doc.querySelector('.lsn:not([data-on])'); if (!el) return; el.setAttribute('data-on', '1');
    const cap = el.querySelector('.lsx-cap'), crumb = el.querySelector('.lsn-crumb'), steps = [...el.querySelectorAll('.lsn-rail button')], fit = el.querySelector('.lsn-fit'), win = el.querySelector('.lsn-win');
    const setCap = i => { if (cap.querySelector('b').textContent === CH[i][2]) return; cap.classList.remove('swap'); void cap.offsetWidth; cap.querySelector('b').textContent = CH[i][2]; cap.querySelector('span').textContent = CH[i][3]; cap.classList.add('swap'); crumb.textContent = CH[i][4]; };
    let cur = -1;
    const mark = (i, t) => { if (i !== cur) { cur = i; setCap(i); } steps.forEach((b, k) => { const a = CH[k][0], z = k + 1 < CH.length ? CH[k + 1][0] : END - 1; b.style.setProperty('--p', Math.min(1, Math.max(0, (t - a) / (z - a))).toFixed(3)); b.classList.toggle('on', k === i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }); };
    const sync = () => { const t = TL.time(); let i = 0; CH.forEach((c, k) => { if (t >= c[0]) i = k; }); mark(i, t); };
    // the product window is drawn 480 px wide and scaled to the column, so it keeps its proportions on a phone
    const resize = () => { const s = Math.min(1, fit.clientWidth / 480); win.style.transform = `scale(${s})`; fit.style.height = Math.round(win.offsetHeight * s) + 'px'; };
    resize(); root.addEventListener('resize', resize); if (root.ResizeObserver) new root.ResizeObserver(resize).observe(fit);
    const still = () => { el.querySelectorAll('.lz-sc').forEach(g => { g.style.opacity = g.classList.contains("lzs7") ? '1' : '0'; g.style.visibility = g.classList.contains('s7') ? 'visible' : 'hidden'; }); mark(CH.length - 1, END); steps.forEach(b => b.style.setProperty('--p', 1)); };
    lib().then(gsap => {
      if (!gsap || !el.isConnected) { if (el.isConnected) still(); return; }
      TL = build(el, gsap); TL.eventCallback('onUpdate', sync);
      el.querySelector('.lsx-rp').addEventListener('click', () => { cur = -1; RM.matches ? (TL.pause().time(END), sync()) : TL.restart(); });
      steps.forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; cur = -1; if (RM.matches) { TL.pause().time(i + 1 < CH.length ? CH[i + 1][0] - .4 : END); sync(); } else TL.play(CH[i][0] + .01); }));
      doc.addEventListener('visibilitychange', () => { if (!el.isConnected || RM.matches) return; if (doc.hidden) { TL.paused(true); } else if (TL.progress() < 1 && !el.dataset.hold) TL.play(); });
      if (RM.matches) { TL.pause().time(END); sync(); return; }
      TL.play(0);
    });
  }
  V.loginFlow = { timeline: () => TL, chapters: CH, end: END };   // read by tests/ui/login-flow-check.mjs
  V.isoLogin = a => { if (a === 'customer' && old) return old(a); root.setTimeout(init, 0); return html(); };
})(typeof window !== 'undefined' ? window : globalThis);
