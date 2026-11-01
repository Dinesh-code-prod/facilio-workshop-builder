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
  // Facilio's own art: black stages with a fine dot grid, isometric slabs, small pills and a condensed serif headline.
  // Motion is CSS scroll-driven (compositor only), so nothing runs in JavaScript while you scroll.
  const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.round(c * (1 - k)); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
  const slab = (c, o) => { o = o || {}; const A = [60, 6], B = [114, 34], C = [60, 62], D = [6, 34], lp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; const pt = p => p[0] + ',' + p[1];
    let grid = ''; for (let k = 1; k < (o.cells || 3); k++) { const t = k / (o.cells || 3); grid += `<line x1="${lp(A, B, t)[0]}" y1="${lp(A, B, t)[1]}" x2="${lp(D, C, t)[0]}" y2="${lp(D, C, t)[1]}"/><line x1="${lp(A, D, t)[0]}" y1="${lp(A, D, t)[1]}" x2="${lp(B, C, t)[0]}" y2="${lp(B, C, t)[1]}"/>`; }
    return `<svg class="dx-slab" viewBox="0 0 120 92" aria-hidden="true"><polygon points="${pt(D)} ${pt(C)} 60,80 6,52" fill="${mix(c, .55)}"/><polygon points="${pt(B)} ${pt(C)} 60,80 114,52" fill="${mix(c, .32)}"/><polygon points="${pt(A)} ${pt(B)} ${pt(C)} ${pt(D)}" fill="${c}"/><g stroke="#fff" stroke-opacity=".38" stroke-width="1">${grid}</g><polygon points="${pt(A)} ${pt(B)} ${pt(C)} ${pt(D)}" fill="none" stroke="#fff" stroke-opacity=".5"/></svg>`; };
  // pinned stage: one real 1920 px Facilio screen per product, cross-faded by the scroll position
  const SH = { ready: false, list: [] };
  const stageLoad = cb => { SH.cbs = SH.cbs || []; if (SH.ready) { if (cb) cb(); return; } if (cb) SH.cbs.push(cb); else if (!SH.def) { SH.def = 1; SH.cbs.push(() => V.render()); } if (SH.loading) return; SH.loading = true; fetch('demokit/shots/items.json').then(r => r.json()).then(j => { const seen = {}; SH.list = (Array.isArray(j) ? j : j.items || []).filter(x => x.kind === 'screen' && x.group && x.group !== 'Login' && !seen[x.group] && (seen[x.group] = 1)).slice(0, 6); }).catch(() => { }).then(() => { SH.ready = true; SH.cbs.splice(0).forEach(f => f()); }); };
  const stage = () => { if (SH.list.length < 2) return ''; const nm = g => g.replace(/\s*·.*$/, '');
    return `<section class="dx-stage" style="--n:${SH.list.length}"><div class="dx-sticky"><div class="dx-st-l"><span class="dx-pill">The Facilio platform</span>${SH.list.map((x, i) => `<div class="dx-sl dx-sl-t${i === 0 ? ' f' : i === SH.list.length - 1 ? ' z' : ''}" style="--i:${i}"><h2>${esc(nm(x.group))}</h2><p>${esc(String(x.desc || '').slice(0, 170))}</p></div>`).join('')}<div class="dx-dots">${SH.list.map((x, i) => `<i class="dx-sl dx-sl-d${i === 0 ? ' f' : i === SH.list.length - 1 ? ' z' : ''}" style="--i:${i}"></i>`).join('')}</div></div><div class="dx-frame"><div class="dx-bar"><i></i><i></i><i></i></div><div class="dx-shots">${SH.list.map((x, i) => `<img class="dx-sl dx-sl-i${i === 0 ? ' f' : i === SH.list.length - 1 ? ' z' : ''}" style="--i:${i}" src="demokit/shots/${esc(x.id)}.webp" alt="${esc(x.label)}" decoding="async"${i ? ' loading="lazy"' : ''}>`).join('')}</div></div></div></section>`; };
  const key = n => 'pkg:' + n; const me = () => (S.user && S.user.email) || '';
  const asked = n => I().list('interest').some(x => x.newsId === key(n) && x.by === me());
  const askedCount = n => I().list('interest').filter(x => x.newsId === key(n)).length;
  const card = m => `<div class="xp-card xp-reveal"><div class="xp-card-t">${esc(m.label)}</div><p class="xp-card-d">${esc(m.desc)}</p>
    <div class="xp-card-f"><span>${m.fields.length} fields</span>${m.nForms ? `<span>${m.nForms} form${m.nForms === 1 ? '' : 's'}</span>` : ''}${!cust() && askedCount(m.name) ? `<span class="xp-hot">${askedCount(m.name)} interested</span>` : ''}</div>
    <div class="xp-card-a"><button class="btn sm" data-act="xpOpen" data-m="${esc(m.name)}">Learn more</button>${asked(m.name) ? '<span class="xp-sent">Request sent</span>' : `<button class="btn sm primary" data-act="xpAsk" data-m="${esc(m.name)}">I'm interested</button>`}</div></div>`;
  const ACC = ['#1570EF', '#E5197F', '#0057d9', '#1D1A5E'];
  const tile = (m, c) => `<article class="dx-tile dx-rv"><div class="dx-art"><div class="dx-slabs">${V.dxArt(m.name, m.label, c)}</div></div><div class="dx-tb"><h4>${esc(m.label)}</h4><p>${esc(m.desc)}</p><div class="xp-card-f"><span>${m.fields.length} fields</span>${m.nForms ? `<span>${m.nForms} form${m.nForms === 1 ? '' : 's'}</span>` : ''}${!cust() && askedCount(m.name) ? `<span class="xp-hot">${askedCount(m.name)} interested</span>` : ''}</div><div class="xp-card-a"><button class="btn sm" data-act="xpOpen" data-m="${esc(m.name)}">Learn more</button>${asked(m.name) ? '<span class="xp-sent">Request sent</span>' : `<button class="btn sm primary" data-act="xpAsk" data-m="${esc(m.name)}">I'm interested</button>`}</div></div></article>`;
  const arrowBtn = (act, label, extra) => `<button type="button" class="dx-btn" data-act="${act}"${extra || ''}>${label}<span class="dx-ar" aria-hidden="true">&rarr;</span></button>`;
  V.explore = {
    html() {
      if (!SH.ready) stageLoad();
      if (!I().ready(['news', 'interest'])) { I().load(['news', 'interest', 'action']).then(() => V.render()); return '<div class="page-header"><div class="t"><h1>Discover more with Facilio</h1></div></div><div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>'; }
      const all = areas(); const n = all.reduce((t, a) => t + a.items.length, 0); const who = (S.project && S.project.customer) || 'your team';
      const picked = I().list('news').filter(x => x.status === 'published'); const more = S.ui.xpMore || (S.ui.xpMore = {});
      const hero = `<section class="dx-hero"><div class="dx-hero-l"><span class="dx-pill"><i></i>Beyond your project</span><h2>More ways Facilio can help <em>${esc(who)}</em></h2><p>Your project covers the modules in your contract. Facilio has much more to make daily work easier. Take a look, open anything that interests you and tell us. We will come back with how it could work for you.</p>${arrowBtn('xpGo', 'Start exploring')}<div class="dx-stats"><div><b class="xp-count" data-to="${all.length}">${all.length}</b><span>solution areas</span></div><div><b class="xp-count" data-to="${n}">${n}</b><span>modules to explore</span></div></div></div><div class="dx-hero-r" aria-hidden="true"><div class="dx-stack"><div class="dx-lay l3">${slab('#8DB8FF', { cells: 3 })}</div><div class="dx-lay l2">${slab('#1570EF', { cells: 3 })}</div><div class="dx-lay l1">${slab('#E5197F', { cells: 3 })}</div></div></div></section>`;
      const nav = `<div class="dx-nav" role="tablist"><div class="dx-pills">${all.map((a, i) => `<button class="dx-npill" role="tab" data-act="mkGo" data-v="${esc(a.id)}"><i style="background:${ACC[i % 4]}"></i>${esc(a.title)}</button>`).join('')}</div><div class="xp-search"><input type="search" value="${esc(S.ui.xpQ || '')}" placeholder="Search modules, for example visitors or utility bills" aria-label="Search modules" data-change="xpSearch"></div></div>`;
      const pickedHtml = picked.length && !S.ui.xpQ ? `<div class="dx-sec"><span class="dx-pill dark">Picked for you</span><h3>Chosen by your Facilio team</h3></div><div class="dx-grid">${picked.slice(0, 6).map(p => `<article class="dx-tile dx-rv"><div class="dx-art">${`<div class="dx-slabs">${V.dxArt(p.id || p.title, p.title, '#E5197F', 'cards')}</div>`}</div><div class="dx-tb"><h4>${esc(p.title)}</h4><p>${esc(String(p.summary || p.problem || '').slice(0, 140))}</p><div class="xp-card-a"><button class="btn sm" data-act="xfOpen" data-id="${esc(p.id)}">Learn more</button></div></div></article>`).join('')}</div>` : '';
      const body = all.length ? all.map((a, i) => { const c = ACC[i % 4]; const open = !!more[a.id] || !!S.ui.xpQ; const shown = open ? a.items : a.items.slice(0, 6);
        return `<section class="dx-ch" id="mk-${esc(a.id)}" data-id="${esc(a.id)}"><div class="dx-chh dx-rv"><span class="dx-no">${String(i + 1).padStart(2, '0')}</span><div class="dx-cht"><span class="dx-pill dark">${a.items.length} module${a.items.length === 1 ? '' : 's'}</span><h3>${esc(a.title)}</h3><p>${esc(a.blurb)}</p></div></div><div class="dx-grid">${shown.map(m => tile(m, c)).join('')}</div>${a.items.length > 6 && !open ? `<div class="dx-more">${arrowBtn('mkMore', 'Show all ' + a.items.length + ' modules', ' data-v="' + esc(a.id) + '"')}</div>` : ''}</section>`; }).join('')
        : '<div class="card empty"><h3>Nothing matches</h3><p>Try another word, or clear the search.</p></div>';
      const cta = `<section class="dx-cta dx-rv"><div class="dx-cta-art" aria-hidden="true">${slab('#1570EF', { cells: 3 })}</div><div><h2>Something caught your eye?</h2><p>Open any module and tap I'm interested. Your Facilio team will come back with how it could work for ${esc(who)}.</p>${arrowBtn('xpGo', 'Back to the modules')}</div></section>`;
      return `<div class="page-header"><div class="t"><h1>Discover more with Facilio</h1><p>${cust() ? 'Modules and solutions beyond your contract, to explore at your own pace.' : 'The customer sees this page: the Facilio modules in the loaded package that are not in this project\'s scope. Their requests land in Governance as follow-up actions.'}</p></div></div><div class="page-body dx">${hero}${stage()}${pickedHtml}${nav}${body}${cta}</div>`;
    }
  };
  V.explore.mount = () => { const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return;
    document.querySelectorAll('.xp-count').forEach(c => { const to = Number(c.getAttribute('data-to')) || 0; const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1100); c.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) root.requestAnimationFrame(step); }; c.textContent = '0'; root.requestAnimationFrame(step); });
    // highlight the area you are in (one IntersectionObserver, nothing per scroll event)
    if (!root.IntersectionObserver) return; const pills = [...document.querySelectorAll('.dx-npill')];
    const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) pills.forEach(p => p.classList.toggle('on', p.getAttribute('data-v') === e.target.getAttribute('data-id'))); }), { rootMargin: '-35% 0px -55% 0px' }); document.querySelectorAll('.dx-ch').forEach(c => spy.observe(c)); };
  ACT.mkGo = a => { const el = document.getElementById('mk-' + a.getAttribute('data-v')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  ACT.mkMore = a => { (S.ui.xpMore || (S.ui.xpMore = {}))[a.getAttribute('data-v')] = true; V.render(); };
  V.dxKit = { slab, stage, stageLoad, arrowBtn, ACC };
  ACT.xpGo = () => { const el = document.querySelector('.dx-nav'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
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
