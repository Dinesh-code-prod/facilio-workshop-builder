/* Isometric delivery journey: a layered platform assembles, twelve lifecycle modules appear around it, thin connectors draw between them and each
   milestone is interactive. One component serves three audiences:
     home      generic lifecycle (no project selected, so no progress is shown); a stage opens the latest project at that page
     team      progress from the project's own records (V.roadmapStages) plus a "Blocked" flag from the plan when a task is blocked
     customer  progress ONLY from what was published to the customer (plan_struct); stages are clickable only when the customer's menu has that page
   Nothing is invented: a stage with no data is shown as "Upcoming". Pure SVG + CSS (no library); motion is gated on first render and honours reduced-motion. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // name, short label, one-line description, colour, team page, customer page, plan-task keywords (customer progress)
  const L = [
    ['Project Kick-off & Discovery', 'Kick-off & Discovery', 'Align on scope, goals, contract and the plan.', '#1570EF', 'kickoff', 'kickoff', /kick/i],
    ['Workshops', 'Workshops', 'Walk through your processes together, session by session.', '#1570EF', 'planner', 'schedule', /workshop|data template/i],
    ['Requirements', 'Requirements', 'Capture what you need and confirm it.', '#1570EF', 'transcripts', null, /requirement/i],
    ['BRD & Sign-off', 'BRD & Sign-off', 'Agree the business requirements document.', '#1570EF', 'brd', null, /brd/i],
    ['Configuration & Implementation', 'Configuration', 'Facilio is configured to the agreed requirements.', '#0F57BD', 'delivery', null, /implement|configur|build|timeline/i],
    ['UAT & Defect Management', 'UAT & Defects', 'You test it; findings are logged and fixed.', '#0F57BD', 'delivery', null, /uat|demo|feedback/i],
    ['FTR & KPI Validation', 'FTR & KPIs', 'Confirm functionality and KPIs work as agreed.', '#0F57BD', 'ftr', null, /ftr|kpi/i],
    ['Customer Training & User Guides', 'Training & Guides', 'Your team learns the system with guides made for it.', '#0F57BD', 'guidebuilder', 'guide', /train|guide/i],
    ['Go-Live Readiness', 'Go-Live Readiness', 'Final checks and data clean-up before launch.', '#24216F', 'delivery', null, /go-?live|clean/i],
    ['Hypercare', 'Hypercare', 'Close support right after launch.', '#24216F', 'hypercare', null, /hypercare/i],
    ['Support Transition & Handover', 'Support Handover', 'Move to steady-state support.', '#24216F', 'handover', null, /handover|support/i],
    ['Project Closure', 'Project Closure', 'Review outcomes and formally close the project.', '#24216F', 'handover', null, /clos/i]
  ];
  const STATE = { done: ['Complete', '#027A48'], progress: ['In progress', '#1570EF'], blocked: ['Blocked', '#D92D20'], none: ['Upcoming', '#98A2B3'] };
  const KINDS = ['scope', 'build', 'uat', 'usecase', 'checklist', 'hc', 'ho', 'close', 'ugd', 'rep', 'signoff'];

  const planRows = i => ((F.doc('plan_struct') || {}).rows || []).filter(r => L[i][6].test(String(r.title || '') + ' ' + String(r.phase || '')));
  function fromPlan(i) {
    const rows = planRows(i); if (!rows.length) return null;
    const done = rows.filter(r => r.status === 'Done').length;
    if (rows.some(r => r.status === 'Blocked')) return { state: 'blocked', detail: rows.filter(r => r.status === 'Blocked').length + ' plan task(s) blocked' };
    if (done === rows.length) return { state: 'done', detail: done + ' of ' + rows.length + ' plan tasks done' };
    if (done || rows.some(r => r.status === 'In progress')) return { state: 'progress', detail: done + ' of ' + rows.length + ' plan tasks done' };
    return { state: 'none', detail: rows.length + ' plan task(s) scheduled' };
  }
  function allowedIds() { const s = new Set(); try { (V.navBase ? V.navBase() : []).forEach(g => g.items.forEach(i => s.add(i[0]))); } catch (e) { } if (s.has('msaflow')) s.add('planner'); return s; }

  // resolve the twelve stages for a mode
  function stagesFor(mode) {
    const ok = (mode === 'home' || mode === 'intro') ? new Set() : allowedIds(); let team = null;
    if (mode === 'team' && V.items) { V.items.load(KINDS); if (V.items.ready(['scope', 'build', 'uat', 'checklist']) && V.roadmapStages) team = V.roadmapStages(); }
    return L.map((s, i) => {
      let st = null;
      if (mode === 'team') { st = team && team[i] ? { state: team[i].state, detail: team[i].detail } : null; const p = fromPlan(i); if (p && p.state === 'blocked') st = p; }
      else if (mode === 'customer') st = fromPlan(i);
      const view = mode === 'customer' ? s[5] : s[4];
      return { i, name: s[0], label: s[1], desc: s[2], color: s[3], view, allowed: mode === 'home' ? !!view : !!(view && ok.has(view)), status: mode === 'home' ? null : (st || { state: 'none', detail: mode === 'team' && !team ? 'Loading progress…' : 'Not started' }) };
    });
  }

  // ---------- geometry (isometric: 2:1 rhombus) ----------
  const rh = (cx, cy, w, h) => `M${cx - w} ${cy}L${cx} ${cy - h}L${cx + w} ${cy}L${cx} ${cy + h}Z`;
  const CX = 500, CY = 318, RX = 392, RY = 212;
  const pos = i => { const a = (-150 + i * 30) * Math.PI / 180; return [Math.round(CX + RX * Math.cos(a)), Math.round(CY + RY * Math.sin(a))]; };
  function platform() {
    const layer = (cy, w, h, t, cls, d, top, l, r) => `<g class="iso-l ${cls}" style="--d:${d}s"><path d="M${CX - w} ${cy}L${CX} ${cy + h}L${CX} ${cy + h + t}L${CX - w} ${cy + t}Z" fill="${l}"/><path d="M${CX + w} ${cy}L${CX} ${cy + h}L${CX} ${cy + h + t}L${CX + w} ${cy + t}Z" fill="${r}"/><path d="${rh(CX, cy, w, h)}" fill="${top}" stroke="#fff" stroke-width="1.5"/></g>`;
    let grid = ''; const w = 235, h = 117, cy = 352; const P = (u, v) => [CX + (u - v) * w, cy + (u + v - 1) * h];
    for (let k = 1; k < 8; k++) { const a = P(k / 8, 0), b = P(k / 8, 1), c = P(0, k / 8), d = P(1, k / 8); grid += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${d[0]} ${d[1]}`; }
    return `<g class="iso-plat">${layer(352, 235, 117, 16, 'l1', 0, '#EAF2FF', '#C9DCFB', '#A9C6F7')}<path class="iso-grid" d="${grid}" fill="none" stroke="#1570EF" stroke-opacity=".22" stroke-width="1" style="--d:.9s"/>
      ${layer(322, 178, 89, 14, 'l2', .25, '#F6FAFF', '#D5E4FC', '#B4CDF8')}${layer(294, 124, 62, 14, 'l3', .5, '#FFFFFF', '#DCE9FD', '#BBD2F9')}
      <g class="iso-logo" style="--d:.95s"><path d="${rh(CX, 294, 70, 35)}" fill="none" stroke="#1570EF" stroke-opacity=".35" stroke-dasharray="3 4"/><text x="${CX}" y="299" text-anchor="middle" font-size="17" font-weight="800" fill="#1d1a5e" letter-spacing="-.3">facilio</text><text x="${CX}" y="316" text-anchor="middle" font-size="9" font-weight="700" fill="#667085" letter-spacing="1.6">DELIVERY STUDIO</text></g></g>`;
  }
  function cube(s, d) {
    const [x, y] = pos(s.i), w = 30, h = 15, ht = 16; const st = s.status ? s.status.state : null;
    const ico = (V.PP_ICO || [])[s.i] || '';
    const ring = st === 'progress' ? `<circle class="iso-pulse" cx="${x}" cy="${y - ht - h - 19}" r="14" fill="none" stroke="${STATE.progress[1]}" stroke-width="2"/>` : '';
    const mark = st === 'done' ? `<g transform="translate(${x + 8},${y - ht - h - 31})"><circle r="7" fill="${STATE.done[1]}" stroke="#fff" stroke-width="1.5"/><path d="M-3 0l2 2 4-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>` : st === 'blocked' ? `<g transform="translate(${x + 8},${y - ht - h - 31})"><circle r="7" fill="${STATE.blocked[1]}" stroke="#fff" stroke-width="1.5"/><path d="M0 -3v3.5M0 3v.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g>` : '';
    const lines = s.label.length > 15 && s.label.indexOf(' ') > 0 ? (() => { const parts = s.label.split(' '); const mid = Math.ceil(parts.length / 2); return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]; })() : [s.label];
    const label = `<text class="iso-t" x="${x}" y="${y + h + 17}" text-anchor="middle">${lines.map((t, k) => `<tspan x="${x}" dy="${k ? 13 : 0}">${esc(t)}</tspan>`).join('')}</text><text class="iso-n" x="${x}" y="${y + h + 17 + lines.length * 13 + 1}" text-anchor="middle">STEP ${s.i + 1}</text>`;
    const attrs = `class="iso-m${s.allowed ? '' : ' off'}" style="--c:${s.color};--d:${d}s" data-i="${s.i}" ${s.allowed ? `tabindex="0" role="link"` : `role="img"`} aria-label="Step ${s.i + 1}: ${esc(s.name)}${s.status ? '. ' + STATE[s.status.state][0] + '. ' + esc(s.status.detail) : ''}${s.allowed ? '' : ''}"`;
    return `<g ${attrs}${s.allowed ? ` data-view="${s.view}"` : ''}><rect class="iso-hit" x="${x - 46}" y="${y - ht - h - 36}" width="92" height="${ht + h + 36 + h + 52}" fill="transparent"/><g class="iso-lift"><ellipse cx="${x}" cy="${y + h}" rx="${w + 8}" ry="${h * .7}" class="iso-sh"/>
      <path d="M${x - w} ${y - ht}L${x} ${y - ht + h}L${x} ${y + h}L${x - w} ${y}Z" class="fl"/><path d="M${x + w} ${y - ht}L${x} ${y - ht + h}L${x} ${y + h}L${x + w} ${y}Z" class="fr"/><path d="${rh(x, y - ht, w, h)}" class="ft"/>
      <g class="iso-badge"><circle cx="${x}" cy="${y - ht - h - 19}" r="13" fill="#fff" stroke="${s.color}" stroke-width="1.6"/><g transform="translate(${x - 8},${y - ht - h - 27}) scale(.67)" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</g></g>${ring}${mark}</g>${label}</g>`;
  }
  function scene(stages, mode) {
    const P = stages.map(s => pos(s.i));
    let spokes = '', arcs = '';
    P.forEach(([x, y], i) => { const tx = x + (CX - x) * .42, ty = y + (CY + 40 - y) * .42; spokes += `<path class="iso-sp" d="M${x} ${y + 8}L${tx} ${ty + 8}" style="--d:${1.2 + i * .1}s"/>`; });
    for (let i = 0; i < P.length - 1; i++) arcs += `<path class="iso-arc" pathLength="1" d="M${P[i][0]} ${P[i][1] + 2}A${RX} ${RY} 0 0 1 ${P[i + 1][0]} ${P[i + 1][1] + 2}" style="--d:${1.3 + i * .28}s;--c:${stages[i].color}"/>`;
    const floats = [[120, 90, 'dia'], [880, 70, 'ring'], [60, 330, 'plus'], [940, 360, 'dia'], [220, 560, 'ring'], [790, 570, 'plus']].map(([x, y, k], i) => `<g class="iso-fl f${i % 3}" style="--d:${i * .6}s" transform="translate(${x},${y})">${k === 'dia' ? '<path d="M0 -9L9 0L0 9L-9 0Z" fill="#1570EF" fill-opacity=".12" stroke="#1570EF" stroke-opacity=".4"/>' : k === 'ring' ? '<circle r="8" fill="none" stroke="#1570EF" stroke-opacity=".4" stroke-width="1.5"/>' : '<path d="M-7 0H7M0 -7V7" stroke="#667085" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>'}</g>`).join('');
    return `<svg class="iso-svg" viewBox="0 0 1000 620" role="group" aria-label="Delivery journey: twelve connected stages around the Delivery Studio platform"><defs><linearGradient id="isoG" x1="0" x2="1"><stop offset="0" stop-color="#1570EF"/><stop offset="1" stop-color="#ed168b"/></linearGradient></defs>
      ${floats}${platform()}${spokes}<g class="iso-arcs">${arcs}</g>${stages.map((s, i) => cube(s, 1.1 + i * .16)).join('')}</svg>`;
  }
  function tiles(stages, mode) {
    return `<ol class="iso-list">${stages.map(s => { const st = s.status ? STATE[s.status.state] : null; const act = mode === 'home' ? 'ppStage' : 'nav';
      const inner = `<span class="pp-step">STEP ${s.i + 1}</span><span class="pp-node"><svg viewBox="0 0 24 24" aria-hidden="true">${(V.PP_ICO || [])[s.i] || ''}</svg></span><span class="pp-stage-label">${esc(s.name)}</span><span class="iso-ld">${esc(s.desc)}</span>${st ? `<span class="iso-chip" style="--s:${st[1]}">${st[0]}</span>` : ''}`;
      return `<li class="pp-stage" style="--c:${s.color};--n:${s.color};--d:${s.i * 60}ms">${s.allowed ? `<button type="button" class="pp-tile" data-act="${act}" data-view="${s.view}">${inner}</button>` : `<div class="pp-tile off">${inner}</div>`}</li>`; }).join('')}</ol>`;
  }
  const played = {};
  // html for a mount point. opts: { mode: 'home'|'team'|'customer', key }
  V.isoJourney = function (opts) {
    const mode = (opts && opts.mode) || 'home'; const key = mode + '|' + ((S.project && S.project.id) || ''); const go = !played[key] && !reduce();
    if (go) setTimeout(() => { played[key] = 1; }, 6500);
    const stages = stagesFor(mode); const known = mode === 'home' ? null : stages.filter(s => s.status.detail !== 'Loading progress…');
    const done = known ? known.filter(s => s.status.state === 'done').length : 0;
    const sum = !known ? '' : `<div class="iso-sum"><b>${done} of 12</b> stages complete<span class="xs muted"> · ${mode === 'customer' ? 'from the plan shared with you' : 'from this project’s records'}</span></div>`;
    return `<div class="iso${go ? ' go' : ''}" data-mode="${mode}">${sum}<div class="iso-stage">${scene(stages, mode)}</div>
      <div class="iso-detail" aria-live="polite"><b>Delivery lifecycle</b><span>Hover or focus a stage to see what happens there${mode === 'home' ? '; select one to open it in your latest project' : ''}.</span></div>${tiles(stages, mode)}</div>`;
  };
  V._isoStages = stagesFor;
  V._isoPlatform = () => `<svg class="eco-plat iso-svg" viewBox="250 215 500 280" aria-hidden="true">${platform()}</svg>`;
  V._isoLifecycle = () => L.map(s => ({ name: s[0], label: s[1], color: s[3] }));
  // login page: the same scene, decorative, always animated once per page view
  V.isoLogin = aud => V.ecoStage ? `<div class="av-iso">${V.ecoStage({ audience: aud || 'public', compact: true, dark: true })}</div>` : `<div class="av-iso iso iso-dark go" data-mode="intro" aria-hidden="true"><div class="iso-stage">${scene(stagesFor('home').map(s => Object.assign(s, { allowed: false })), 'intro')}</div></div>`;

  // hover / focus feedback: fills the description panel; click opens the stage when allowed
  function detail(el) {
    const wrap = el.closest('.iso'); if (!wrap) return; const i = +el.getAttribute('data-i'); const mode = wrap.getAttribute('data-mode'); const s = stagesFor(mode)[i]; const d = wrap.querySelector('.iso-detail'); if (!d || !s) return;
    const st = s.status ? STATE[s.status.state] : null;
    d.innerHTML = `<b style="color:${s.color}">Step ${s.i + 1} · ${esc(s.name)}</b><span>${esc(s.desc)}${st ? ` <em class="iso-chip" style="--s:${st[1]}">${st[0]}</em> <span class="muted">${esc(s.status.detail)}</span>` : ''}${s.allowed ? ' <u>Select to open.</u>' : (mode === 'customer' ? '' : '')}</span>`;
    wrap.querySelectorAll('.iso-m.hot').forEach(n => n.classList.remove('hot')); el.classList.add('hot');
  }
  doc.addEventListener('mouseover', e => { const m = e.target.closest && e.target.closest('.iso-m'); if (m) detail(m); });
  doc.addEventListener('focusin', e => { const m = e.target.closest && e.target.closest('.iso-m'); if (m) detail(m); });
  doc.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('iso-m') && e.target.getAttribute('data-view')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  // SVG groups are not buttons, so route their click through the normal action dispatcher
  doc.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('.iso-m'); if (!m || m.classList.contains('off')) return; const wrap = m.closest('.iso'); const view = m.getAttribute('data-view'); if (!view || !wrap) return;
    e.stopPropagation(); const fake = doc.createElement('button'); fake.setAttribute('data-view', view); (wrap.getAttribute('data-mode') === 'home' ? ACT.ppStage : ACT.nav)(fake, e);
  }, true);

  // ---------- animated introduction: platform assembles -> modules connect -> roadmap unfolds -> into the application ----------
  V.isoIntro = function () {
    return new Promise(resolve => {
      if (doc.querySelector('.iso-intro')) return resolve(); // never stack a second introduction
      const cust = !!(S.user && S.user.kind === 'customer'); const o = doc.createElement('div'); o.className = 'iso-intro'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Delivery journey introduction');
      const caps = cust ? ['This is your project workspace.', 'Twelve stages from kick-off to closure, with Facilio and AI assistance along the way.', 'Follow every step of the journey with us.'] : ['Delivery Studio is the platform.', 'Twelve stages from kick-off to closure, with Facilio and AI assistance along the way.', 'One journey, every project, one place.'];
      o.innerHTML = `<div class="iso-top"><img src="brand/logo-navy.png" alt="Facilio" height="20"><button type="button" class="btn ghost" data-r="skip">Skip</button></div><div class="iso-intro-body">${V.ecoStage ? `<ol class="eco-life" aria-label="Delivery lifecycle">${L.map((l, k) => `<li style="--d:${(k * .07).toFixed(2)}s"><i>${k + 1}</i><span>${esc(l[1])}</span></li>`).join('')}</ol>${V.ecoStage({ audience: cust ? 'customer' : 'team' })}` : `<div class="iso go" data-mode="intro"><div class="iso-stage">${scene(stagesFor('home').map(s => Object.assign(s, { allowed: false })), 'intro')}</div></div>`}<h2 class="iso-cap" aria-live="polite"></h2><button type="button" class="btn primary lg" data-r="go">${cust ? 'Continue to your project' : 'Enter Delivery Studio'}</button></div>`;
      doc.body.appendChild(o); const cap = o.querySelector('.iso-cap'); let i = 0, timer = null, closed = false;
      const say = k => { cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = caps[k]; cap.classList.add('in'); };
      const close = () => { if (closed) return; closed = true; clearTimeout(timer); o.classList.add('out'); setTimeout(() => { o.remove(); resolve(); }, reduce() ? 0 : 450); };
      say(0); if (!reduce()) timer = setTimeout(function nx() { if (i < caps.length - 1) { say(++i); timer = setTimeout(nx, i === 1 ? 3600 : 3200); } }, 2400); else { i = 2; say(2); }
      o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) close(); }); const goBtn = o.querySelector('[data-r=go]'); if (goBtn) goBtn.focus();
      doc.addEventListener('keydown', function esc2(e) { if (closed) { doc.removeEventListener('keydown', esc2); return; } if (e.key === 'Escape') close(); });
    });
  };
  // the existing introduction ends by entering the application; the isometric story plays right after it and then hands over to the page
  const base = V.roadmap;
  if (base) V.roadmap = async function (opts) { await base(opts); try { await V.isoIntro(); } catch (e) { } };
})(typeof window !== 'undefined' ? window : globalThis);
