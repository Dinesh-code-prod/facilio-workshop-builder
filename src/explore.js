/* Discover more with Facilio: a brand page, seen by the customer and the team, showing the Facilio modules in the organisation package that are not
   part of this project's contract, grouped into solution areas. The aim is for the customer to see how much more Facilio can do for them and to ask.
   Everything shown comes from the package (module name, its own description, field and form counts, state flow steps) and from the Product Tour
   pictures; no price or promise is made. "I'm interested" saves an interest request (kind "interest", newsId "pkg:<module>") and opens a Facilio
   action in Governance, the same way the Explore Facilio entries do. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const { drawer, closeDrawer, toast } = V;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const E = () => root.FWBExplore || { AREAS: [] };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
  const modInfo = name => { const b = S.baseline && S.baseline.modules && S.baseline.modules[name]; if (!b) return null; let mv = null; try { mv = F.allModules().find(m => m.name === name); } catch (e) { } return { name, label: b.label || name, desc: String(b.description || '').trim(), fields: b.fields || [], nForms: Array.isArray(b.forms) ? b.forms.length : Number(b.forms) || 0, inScope: !!(mv && mv.inScope) }; };
  // the areas with only the modules that are in the package, have a description and are not in this project's scope
  function areas() {
    const q = String(S.ui.xpQ || '').toLowerCase().trim();
    return E().AREAS.map(a => Object.assign({}, a, { items: a.mods.map(modInfo).filter(m => m && !m.inScope && m.desc && (!q || (m.label + ' ' + m.desc + ' ' + a.title).toLowerCase().includes(q))) })).filter(a => a.items.length);
  }
  // pinned stage: one real 1920 px Facilio screen per product, wiped in as the page scrolls
  const SH = { ready: false, list: [] };
  const stageLoad = () => { if (SH.loading) return; SH.loading = true; fetch('demokit/shots/items.json').then(r => r.json()).then(j => { const seen = {}; SH.list = (Array.isArray(j) ? j : j.items || []).filter(x => x.kind === 'screen' && x.group && x.group !== 'Login' && !seen[x.group] && (seen[x.group] = 1)).slice(0, 6); }).catch(() => { }).then(() => { SH.ready = true; V.render(); }); };
  const stage = () => { if (!SH.list.length) return ''; const nm = g => g.replace(/\s*·.*$/, '');
    return `<section class="mk-stage" style="--n:${SH.list.length}"><div class="mk-sticky"><div class="mk-st-l"><div class="xp-hero-k"><span class="xp-dot"></span>The Facilio platform</div>${SH.list.map((x, i) => `<div class="mk-slide-t${i ? '' : ' on'}"><h2>${esc(nm(x.group))}</h2><p>${esc(String(x.desc || '').slice(0, 170))}</p></div>`).join('')}<div class="mk-dots">${SH.list.map((x, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('')}</div></div><div class="mk-frame"><div class="mk-bar"><i></i><i></i><i></i></div><div class="mk-shots">${SH.list.map((x, i) => `<img class="mk-shot" src="demokit/shots/${esc(x.id)}.webp" alt="${esc(x.label)}" ${i ? 'loading="lazy"' : ''}>`).join('')}</div></div></div></section>`; };
  const key = n => 'pkg:' + n; const me = () => (S.user && S.user.email) || '';
  const asked = n => I().list('interest').some(x => x.newsId === key(n) && x.by === me());
  const askedCount = n => I().list('interest').filter(x => x.newsId === key(n)).length;
  const card = m => `<div class="xp-card xp-reveal"><div class="xp-card-t">${esc(m.label)}</div><p class="xp-card-d">${esc(m.desc)}</p>
    <div class="xp-card-f"><span>${m.fields.length} fields</span>${m.nForms ? `<span>${m.nForms} form${m.nForms === 1 ? '' : 's'}</span>` : ''}${!cust() && askedCount(m.name) ? `<span class="xp-hot">${askedCount(m.name)} interested</span>` : ''}</div>
    <div class="xp-card-a"><button class="btn sm" data-act="xpOpen" data-m="${esc(m.name)}">Learn more</button>${asked(m.name) ? '<span class="xp-sent">Request sent</span>' : `<button class="btn sm primary" data-act="xpAsk" data-m="${esc(m.name)}">I'm interested</button>`}</div></div>`;
  V.explore = {
    html() {
      if (!SH.ready) stageLoad();
      if (!I().ready(['news', 'interest'])) { I().load(['news', 'interest', 'action']).then(() => V.render()); return '<div class="page-header"><div class="t"><h1>Discover more with Facilio</h1></div></div><div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>'; }
      const ACC = ['#1570EF', '#E5197F', '#0057d9', '#1D1A5E']; const all = areas(); const n = all.reduce((t, a) => t + a.items.length, 0); const who = (S.project && S.project.customer) || 'your team';
      const picked = I().list('news').filter(x => x.status === 'published');
      const labels = all.flatMap(x => x.items.map(m => m.label)); const nFields = all.reduce((t, x) => t + x.items.reduce((u, m) => u + m.fields.length, 0), 0); const pickN = (k) => labels.filter((_, i) => i % Math.max(1, Math.floor(labels.length / 8)) === 0).slice(0, 8)[k];
      const hero = `<div class="xp-hero"><div class="xp-aurora a1"></div><div class="xp-aurora a2"></div><div class="xp-gridbg"></div><div class="xp-float" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map(k => pickN(k) ? `<span class="xp-fl f${k}">${esc(pickN(k))}</span>` : '').join('')}</div><div class="xp-hero-in"><div class="xp-hero-k"><span class="xp-dot"></span>Beyond your project</div><h2>More ways Facilio can <span class="xp-glow">help ${esc(who)}</span></h2><p>Your project covers the modules in your contract. Facilio has much more to make daily work easier. Take a look, open anything that interests you and tell us. We will come back with how it could work for you.</p><div class="xp-stats"><div><b class="xp-count" data-to="${all.length}">${all.length}</b><span>solution areas</span></div><div><b class="xp-count" data-to="${n}">${n}</b><span>modules to explore</span></div><div><b class="xp-count" data-to="${nFields}">${nFields}</b><span>ready-made fields</span></div></div><button class="btn primary xp-cta" data-act="xpGo">Start exploring</button></div></div><div class="xp-marq" aria-hidden="true"><div class="xp-marq-in">${labels.concat(labels).map(l => `<span>${esc(l)}</span>`).join('')}</div></div>`;
      const nav = `<div class="mk-nav" role="tablist"><div class="mk-pills">${all.map((a, i) => `<button class="mk-pill" role="tab" data-act="mkGo" data-v="${esc(a.id)}" style="--c:${ACC[i % 4]}"><i></i>${esc(a.title)}</button>`).join('')}</div><div class="xp-search"><input type="search" value="${esc(S.ui.xpQ || '')}" placeholder="Search modules, for example visitors or utility bills" aria-label="Search modules" data-change="xpSearch"></div></div>`;
      const pickedHtml = picked.length && !S.ui.xpQ ? `<div class="sec-k" style="margin-top:22px"><p>Picked for you</p><h2>Chosen by your Facilio team</h2></div><div class="xp-grid">${picked.slice(0, 6).map(p => `<div class="xp-card xp-pick xp-reveal"><div class="xp-card-t">${esc(p.title)}</div><p class="xp-card-d">${esc(String(p.summary || p.problem || '').slice(0, 140))}</p><div class="xp-card-a"><button class="btn sm" data-act="xfOpen" data-id="${esc(p.id)}">Learn more</button></div></div>`).join('')}</div>` : '';
      const tile = m => `<article class="mk-tile"><div class="mk-art"><span>${V.ico ? V.ico(m.icon) : ''}</span><em>${esc(m.label.slice(0, 1))}</em></div><h4>${esc(m.label)}</h4><p>${esc(m.desc)}</p><div class="xp-card-f"><span>${m.fields.length} fields</span>${m.nForms ? `<span>${m.nForms} form${m.nForms === 1 ? '' : 's'}</span>` : ''}${!cust() && askedCount(m.name) ? `<span class="xp-hot">${askedCount(m.name)} interested</span>` : ''}</div><div class="xp-card-a"><button class="btn sm" data-act="xpOpen" data-m="${esc(m.name)}">Learn more</button>${asked(m.name) ? '<span class="xp-sent">Request sent</span>' : `<button class="btn sm primary" data-act="xpAsk" data-m="${esc(m.name)}">I'm interested</button>`}</div></article>`;
      const body = all.length ? all.map((a, i) => `<section class="mk-ch" id="mk-${esc(a.id)}" data-id="${esc(a.id)}" style="--c:${ACC[i % 4]}"><div class="mk-chh mk-rv"><span class="mk-no">${String(i + 1).padStart(2, '0')}</span><div class="mk-cht"><span class="mk-chi">${V.ico ? V.ico(a.icon) : ''}</span><h3>${esc(a.title)}</h3><p>${esc(a.blurb)}</p></div><div class="mk-ctl"><span class="xs muted">${a.items.length} module${a.items.length === 1 ? '' : 's'}</span>${i % 2 ? '' : '<button type="button" class="mk-ar" data-act="mkRail" data-d="-1" aria-label="Previous">&lsaquo;</button><button type="button" class="mk-ar" data-act="mkRail" data-d="1" aria-label="Next">&rsaquo;</button>'}</div></div>${i % 2 ? '<div class="mk-hp"><div class="mk-hps"><div class="mk-rail mk-track">' : '<div class="mk-rail">'}${a.items.map(m => tile(Object.assign({ icon: a.icon }, m))).join('')}${i % 2 ? '</div></div></div>' : '</div>'}</section>`).join('')
        : '<div class="card empty"><h3>Nothing matches</h3><p>Try another word, or clear the search.</p></div>';
      const cta = `<section class="mk-cta mk-rv"><h2>Something caught your eye?</h2><p>Open any module and tap I'm interested. Your Facilio team will come back with how it could work for ${esc(who)}.</p><button class="btn primary" data-act="xpGo">Back to the modules</button></section>`;
      return `<div class="page-header"><div class="t"><h1>Discover more with Facilio</h1><p>${cust() ? 'Modules and solutions beyond your contract, to explore at your own pace.' : 'The customer sees this page: the Facilio modules in the loaded package that are not in this project\'s scope. Their requests land in Governance as follow-up actions.'}</p></div></div><div class="page-body mk">${hero}${stage()}${pickedHtml}${nav}${body}${cta}</div>`;
    }
  };
  V.explore.mount = () => { const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return;
    document.querySelectorAll('.xp-count').forEach(c => { const to = Number(c.getAttribute('data-to')) || 0; const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1100); c.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) root.requestAnimationFrame(step); }; c.textContent = '0'; root.requestAnimationFrame(step); });
    document.querySelectorAll('.xp-reveal').forEach((e, i) => e.style.setProperty('--d', (i % 8) * 70 + 'ms'));
    const sc = document.querySelector('.page-body') && document.querySelector('.page-body').closest('main, .main, .content') || null;
    const rm = root.matchMedia('(max-width:700px)').matches; const clamp = v => Math.max(0, Math.min(1, v));
    const st = document.querySelector('.mk-stage'), hps = [...document.querySelectorAll('.mk-hp')];
    if (st) { const n = Number(st.style.getPropertyValue('--n')), imgs = [...st.querySelectorAll('.mk-shot')], txt = [...st.querySelectorAll('.mk-slide-t')], dots = [...st.querySelectorAll('.mk-dots i')];
      st.__upd = () => { const r = st.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight)), pos = p * (n - 1); const on = Math.round(pos);
        imgs.forEach((im, i) => { const k = i ? clamp(pos - (i - 1) - .1) / .8 : 1; const e = k * k * (3 - 2 * k); im.style.clipPath = i ? 'inset(' + ((1 - e) * 100) + '% 0 0 0)' : 'none'; im.style.transform = 'scale(' + (1 + (1 - e) * .06 + (i < pos ? clamp(pos - i) * .03 : 0)) + ')'; im.style.zIndex = i; });
        txt.forEach((t, i) => t.classList.toggle('on', i === on)); dots.forEach((d, i) => d.classList.toggle('on', i === on)); }; }
    hps.forEach(h => { const tr = h.querySelector('.mk-track'); h.__upd = () => { if (rm) { h.style.height = ''; tr.style.transform = ''; return; } const dist = Math.max(0, tr.scrollWidth - tr.parentElement.clientWidth); h.style.height = (dist + innerHeight * .9) + 'px'; const r = h.getBoundingClientRect(); tr.style.transform = 'translate3d(' + (-clamp(-r.top / Math.max(1, r.height - innerHeight)) * dist) + 'px,0,0)'; }; });
    const hero = document.querySelector('.xp-hero'), fl = document.querySelector('.xp-float');
    if (hero && fl) hero.addEventListener('pointermove', ev => { const r = hero.getBoundingClientRect(); fl.style.transform = 'translate3d(' + ((ev.clientX - r.left) / r.width - .5) * -26 + 'px,' + ((ev.clientY - r.top) / r.height - .5) * -18 + 'px,0)'; });
    let tick = 0; const upd = () => { tick = 0; if (!document.body.contains(hero || st || document.body)) return; if (st && st.__upd) st.__upd(); hps.forEach(h => h.__upd()); };
    const onS = () => { if (!tick) tick = root.requestAnimationFrame(upd); }; root.addEventListener('scroll', onS, { passive: true }); root.addEventListener('resize', onS); (V.explore.__off || (() => { }))(); V.explore.__off = () => { root.removeEventListener('scroll', onS); root.removeEventListener('resize', onS); }; upd(); setTimeout(upd, 400);
    const rv = document.querySelectorAll('.mk-rv, .mk-tile'); document.querySelectorAll('.mk-rail').forEach(r => [...r.children].forEach((t, i) => t.style.setProperty('--i', i)));
    if (!root.IntersectionObserver) { rv.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 }); rv.forEach(e => io.observe(e));
    const pills = [...document.querySelectorAll('.mk-pill')]; const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) pills.forEach(p => p.classList.toggle('on', p.getAttribute('data-v') === e.target.getAttribute('data-id'))); }), { rootMargin: '-35% 0px -55% 0px' }); document.querySelectorAll('.mk-ch').forEach(c => spy.observe(c));
    document.querySelectorAll('.mk-tile').forEach(t => { t.addEventListener('pointermove', ev => { const r = t.getBoundingClientRect(); t.style.setProperty('--rx', ((ev.clientY - r.top) / r.height - .5) * -5 + 'deg'); t.style.setProperty('--ry', ((ev.clientX - r.left) / r.width - .5) * 6 + 'deg'); }); t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }); }); };
  ACT.mkGo = a => { const el = document.getElementById('mk-' + a.getAttribute('data-v')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  ACT.mkRail = a => { const r = a.closest('.mk-ch').querySelector('.mk-rail'); r.scrollBy({ left: Number(a.getAttribute('data-d')) * Math.max(280, r.clientWidth * .8), behavior: 'smooth' }); };
  ACT.xpGo = () => { const el = document.querySelector('.mk-nav'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  ACT.xpArea = a => { S.ui.xpArea = a.getAttribute('data-v'); V.render(); };
  ACT.xpSearch = el => { S.ui.xpQ = el.value; V.render(); const i = document.querySelector('.xp-search input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
  ACT.xpOpen = a => {
    const m = modInfo(a.getAttribute('data-m')); if (!m) return; const area = E().AREAS.find(x => x.mods.includes(m.name)) || {};
    const labels = m.fields.map(f => f.label).filter((x, i, arr) => x && arr.indexOf(x) === i); const shown = labels.slice(0, 18);
    const shots = ((root.FWBDemoKit || {}).screens || []).filter(x => x[5] && norm(x[1]) === norm(m.label)).slice(0, 3);
    const flow = (() => { try { const f = (S.baseline.flows || []).filter(x => x.module === m.name); const pick = f.find(x => x.isDefault) || f[0]; const mdl = pick && F.baselineFlowModel(pick); return mdl && mdl.states && mdl.states.length ? mdl.states.map(s => s.label || s.name).slice(0, 8) : []; } catch (e) { return []; } })();
    const mods = (() => { try { return F.allModules(); } catch (e) { return []; } })(); const mv = mods.find(x => x.name === m.name) || {};
    const related = [...new Set([].concat(mv.dependsOn || [], mv.usedBy || []))].map(n => mods.find(x => x.name === n)).filter(x => x && x.inScope).map(x => x.label || x.name).slice(0, 6);
    const chips = l => l.map(x => '<span>' + esc(x) + '</span>').join('');
    drawer(m.label,
      '<div class="xpd-hero"><div class="xpd-ic">' + (V.ico ? V.ico(area.icon || 'spark') : '') + '</div><div><div class="xpd-k">' + esc(area.title || 'Facilio module') + '</div><div class="xpd-t">' + esc(m.label) + '</div></div></div>'
      + '<p class="xpd-lead">' + esc(m.desc) + '</p>'
      + '<div class="xpd-facts"><div><b>' + m.fields.length + '</b><span>fields to capture information</span></div><div><b>' + m.nForms + '</b><span>ready-made form' + (m.nForms === 1 ? '' : 's') + '</span></div>' + (flow.length ? '<div><b>' + flow.length + '</b><span>steps in its workflow</span></div>' : '') + '</div>'
      + (related.length ? '<div class="xpd-sec"><h4>Works with what you already have</h4><div class="xpd-chips">' + chips(related) + '</div></div>' : '')
      + (flow.length ? '<div class="xpd-sec"><h4>How a record moves</h4><div class="xpd-flow">' + flow.map((x, i) => '<span class="xpd-st"><i>' + (i + 1) + '</i>' + esc(x) + '</span>').join('<span class="xpd-ar">&rarr;</span>') + '</div></div>' : '')
      + (shown.length ? '<div class="xpd-sec"><h4>Information it keeps</h4><div class="xpd-chips">' + chips(shown) + (labels.length > shown.length ? '<span class="xpd-more">+' + (labels.length - shown.length) + ' more</span>' : '') + '</div></div>' : '')
      + (shots.length ? '<div class="xpd-sec"><h4>What it looks like</h4><div class="xpd-shots">' + shots.map(x => '<figure><img src="demokit/' + esc(x[5]) + '" alt="' + esc(x[0]) + '" loading="lazy"><figcaption>' + esc(x[0]) + '</figcaption></figure>').join('') + '</div></div>' : '')
      + '<p class="xpd-note">This is Facilio\'s standard module. How it would be set up for you, and what it would take, is something your Facilio team will go through with you.</p>',
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>' + (asked(m.name) ? '<span class="xp-sent">Request sent</span>' : '<button class="btn primary" data-act="xpAsk" data-m="' + esc(m.name) + '">I am interested</button>'), { wide: true });
  };
  ACT.xpAsk = a => { const m = modInfo(a.getAttribute('data-m')); if (!m) return;
    drawer('Ask about ' + m.label, `<p class="small muted" style="margin-top:0">Your Facilio team will get in touch. Add anything that would help them prepare (optional).</p><label class="f" for="xp_note">Note</label><textarea id="xp_note" rows="4" maxlength="1000" placeholder="For example: which site or team would use it"></textarea>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="xpAskGo" data-m="${esc(m.name)}">Send request</button>`); };
  ACT.xpAskGo = a => V.busy(a, async () => {
    const m = modInfo(a.getAttribute('data-m')); if (!m) return; const note = ((document.getElementById('xp_note') || {}).value || '').trim().slice(0, 1000); const who = cust() ? ((S.user && S.user.name) || (S.project && S.project.customer) || 'The customer') : 'The team';
    try { await I().put('interest', I().uid('in'), { newsId: key(m.name), title: m.label, module: m.name, note, status: 'new' });
      const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
      await I().put('action', I().uid('a'), { text: `Follow up: ${who} asked about "${m.label}"${note ? ' (' + note.slice(0, 120) + ')' : ''}`, side: 'facilio', status: 'Open', mod: 'project', owner: '', due });
      closeDrawer(); toast('Request sent. Your Facilio team will get in touch.'); V.render(); }
    catch (e) { toast(e.message || 'The request could not be sent', 6000, true); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
