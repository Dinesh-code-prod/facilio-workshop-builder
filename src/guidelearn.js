/* Customer User Guide — module learning sections. For each in-scope module that maps to a standard business module
   (FWBLearn library), the guide shows illustrative screens, an overview, worked walkthroughs, the standard process,
   video clips, a standard-field review, the requirement questions and a preparation checklist. Answers save per item to
   /api/projects/:id/guide-responses as people click or type, so the implementation team sees them straight away. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT; const L = root.FWBLearn;
  const { toast } = V;

  // ---------- which learning module belongs to a guide module ----------
  // override: undefined = automatic, 'none' = no learning content, key = a library module
  function learnFor(name, override) {
    if (override === 'none') return null;
    if (override && L.BY[override]) return L.BY[override];
    return L.forModule(name);
  }
  V.learnFor = learnFor;

  // ---------- responses store ----------
  let R = { project: null, map: {}, loaded: false, loading: false, error: null, polled: 0 };
  const timers = {}; const pending = {};
  function rState() {
    const pid = S.project && S.project.id;
    if (R.project !== pid) { R = { project: pid, map: {}, loaded: false, loading: false, error: null, polled: 0 }; }
    if (pid && !R.loaded && !R.loading && !R.error) rLoad(true);
    return R;
  }
  function rLoad(rerender) {
    R.loading = true; const pid = R.project;
    return API.get(`/api/projects/${pid}/guide-responses`).then(r => {
      if (R.project !== pid) return;
      const map = {}; (r.responses || []).forEach(x => { map[x.key] = x; });
      Object.keys(pending).forEach(k => { if (R.map[k]) map[k] = R.map[k]; else delete map[k]; }); // keep unsent local edits
      R.map = map; R.loaded = true; R.loading = false; R.polled = Date.now();
      if (rerender) V.render(); else syncAll();
    }).catch(e => { R.loading = false; R.error = e.message; if (rerender) V.render(); });
  }
  V.learnResponses = () => rState();
  const rv = key => (R.map[key] || {}).value;
  const canWrite = () => S.user.kind === 'customer' || !S.readonly;
  function rSet(key, value, delay) {
    if (!canWrite()) { toast('You have read-only access to this project'); return; }
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
    if (empty) delete R.map[key]; else R.map[key] = { key, value, authorName: S.user.name, authorKind: S.user.kind, updatedAt: new Date().toISOString() };
    pending[key] = true; setSaving('saving');
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      API.put(`/api/projects/${R.project}/guide-responses`, { key, value: empty ? null : value }).then(r => {
        delete pending[key]; if (R.map[key] && r.updatedAt) R.map[key].updatedAt = r.updatedAt; setSaving(Object.keys(pending).length ? 'saving' : 'saved');
      }).catch(e => { delete pending[key]; setSaving('error'); toast(e.message || 'Could not save your answer', 5000, true); });
    }, delay || 0);
  }
  function setSaving(st) { document.querySelectorAll('[data-glsave]').forEach(el => { el.className = 'gl-save ' + st; el.textContent = st === 'saving' ? 'Saving…' : st === 'error' ? 'Not saved — check your connection' : 'All answers saved'; }); }

  // ---------- helpers ----------
  const qs = lm => lm.form.flatMap(s => s.questions);
  const flds = lm => Object.values(lm.fieldGroups).flat();
  const filled = v => Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== '');
  function ago(ts) { if (!ts) return ''; const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return V.fmtDate(ts); }
  const byline = key => { const x = R.map[key]; if (!x) return ''; return `${x.authorName === S.user.name && x.authorKind === S.user.kind ? 'You' : x.authorName}${x.authorKind === 'customer' ? '' : ' (implementation team)'}, ${ago(x.updatedAt)}`; };
  function progress(lm) {
    const k = lm.key; const q = qs(lm); const f = flds(lm);
    return { a: q.filter(x => filled(rv(`${k}:a:${x.id}`))).length, qn: q.length, f: f.filter(x => (rv(`${k}:f:${x[0]}`) || {}).decision).length, fn: f.length, b: lm.bring.filter((_, i) => rv(`${k}:b:${i}`)).length, bn: lm.bring.length };
  }
  V.learnProgress = progress;
  const ui = () => { S.ui.gl = S.ui.gl || {}; return S.ui.gl; };
  const st = (lm, prop, dflt) => { const u = ui(); u[lm.key] = u[lm.key] || {}; return u[lm.key][prop] === undefined ? dflt : u[lm.key][prop]; };
  const setSt = (lm, prop, v) => { const u = ui(); u[lm.key] = u[lm.key] || {}; u[lm.key][prop] = v; };
  function swap(id, html) { const el = document.getElementById(id); if (el) el.outerHTML = html; }
  const vurl = v => L.VBASE + v.p;
  const STD = '<span class="tag system gl-std" title="How Facilio works out of the box. Your project may differ; see Your setup.">Standard Facilio</span>';
  const head = (id, title, lead, own) => `<div class="gl-h"><div class="pink-label">${esc(title)}${own ? '' : STD}</div>${lead ? `<p class="gl-lead">${esc(lead)}</p>` : ''}</div>`;
  const bar = (n, d) => `<span class="gl-bar"><i style="width:${d ? Math.round(n / d * 100) : 0}%"></i></span>`;

  // ---------- page parts ----------
  const JUMP = [['gl-screens', 'Screens'], ['gl-overview', 'Overview'], ['gl-walk', 'Walkthroughs'], ['gl-process', 'Process'], ['gl-videos', 'Videos'], ['gl-setup', 'Your setup'], ['gl-fields', 'Fields'], ['gl-questions', 'Questions'], ['gl-prepare', 'Prepare'], ['gl-feedback', 'Ask us']];
  function intro(lm) { return `<p class="gl-tagline">${esc(lm.tagline)}</p>`; }
  function strip(lm) {
    const p = progress(lm); const ro = !canWrite();
    return `<div class="gl-strip" id="gl-strip-${lm.key}">
      <div class="gl-meter"><span>Questions answered</span>${bar(p.a, p.qn)}<b>${p.a} of ${p.qn}</b></div>
      <div class="gl-meter"><span>Fields reviewed</span>${bar(p.f, p.fn)}<b>${p.f} of ${p.fn}</b></div>
      <div class="gl-meter"><span>Ready to bring</span>${bar(p.b, p.bn)}<b>${p.b} of ${p.bn}</b></div>
      <span class="gl-save ${ro ? 'ro' : 'saved'}" ${ro ? '' : 'data-glsave'}>${ro ? 'Read-only' : R.error ? 'Answers could not be loaded' : 'Answers save as you go'}</span></div>`;
  }
  V.learnSections = () => JUMP.map(([id, t]) => `<button data-act="glJump" data-t="${id}">${t}</button>`).join('');
  function jumpbar() { return `<nav class="gl-jump" aria-label="Sections">${JUMP.map(([id, t]) => `<button data-act="glJump" data-t="${id}">${t}</button>`).join('')}</nav>`; }

  function screens(lm) {
    const i = st(lm, 'slide', 0); const s = lm.screens[i];
    return `<section class="gl-sec" id="gl-screens">${head('', 'What your team will see', 'Illustrative views of the standard setup. Your build carries your own sites, categories and terminology.')}
      <div class="gl-car">
        <div class="gl-car-stage" aria-hidden="true">${screenHTML(s, lm)}</div>
        <div class="gl-car-foot"><div class="gl-car-cap" aria-live="polite"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>
          <div class="gl-car-ctl"><button class="gl-round" data-act="glSlide" data-k="${lm.key}" data-i="${i - 1}" aria-label="Previous screen">${V.ico('left')}</button>
            <span class="gl-dots">${lm.screens.map((x, j) => `<button class="${j === i ? 'on' : ''}" data-act="glSlide" data-k="${lm.key}" data-i="${j}" aria-label="Show ${esc(x.title)}" ${j === i ? 'aria-current="true"' : ''}></button>`).join('')}</span>
            <button class="gl-round" data-act="glSlide" data-k="${lm.key}" data-i="${i + 1}" aria-label="Next screen">${V.ico('right')}</button></div></div>
      </div></section>`;
  }
  const SCREEN = {
    list: s => `<div class="screen__body"><div class="s-nav"><span class="on"></span><span></span><span></span><span></span></div><div class="s-main">
      <div class="s-head"><div><div class="s-title">${s.list.title}</div><div class="s-sub">${s.list.sub}</div></div><span class="s-cta">+ ${s.list.cta}</span></div>
      <div class="s-toolbar">${s.list.filters.map(f => `<span class="s-chip">${f}</span>`).join('')}</div>
      <table class="s-table"><thead><tr>${s.list.cols.map((c, i) => `<th class="${i > 2 ? 's-hide-sm' : ''}">${c}</th>`).join('')}</tr></thead>
      <tbody>${s.list.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'link' : ''} ${i > 2 ? 's-hide-sm' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`,
    detail: s => `<div class="screen__body"><div class="s-nav"><span class="on"></span><span></span><span></span><span></span></div><div class="s-main">
      <div class="s-head"><div><div class="s-sub">${s.detail.id}</div><div class="s-title">${s.detail.title}</div></div><span>${s.detail.badge}</span></div>
      <div class="s-tabs">${s.detail.tabs.map((t, i) => `<span class="${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>
      <div class="s-pad"><div class="s-grid" style="grid-template-columns:1.2fr 1fr">
        <div class="s-card"><h4>Summary</h4><div class="s-kv">${s.detail.kv.map(([k, v]) => `<div><small>${k}</small><span>${v}</span></div>`).join('')}</div></div>
        <div class="s-card"><h4>${s.detail.sideTitle}</h4>${s.detail.side}</div></div></div></div></div>`,
    mobile: s => `<div class="s-phone-wrap"><div class="s-phone"><div class="s-phone__bar">${s.mobile.bar}</div><div class="s-phone__body">
      ${s.mobile.items.map(([t, x]) => `<div class="s-phone__item"><b>${t}</b>${x}</div>`).join('')}<div class="s-phone__btn">${s.mobile.btn}</div></div></div>
      <div class="s-phone-note"><b>${s.mobile.noteTitle}</b>${s.mobile.note}</div></div>`,
    insight: s => `<div class="screen__body"><div class="s-nav"><span></span><span></span><span class="on"></span><span></span></div><div class="s-main">
      <div class="s-head"><div class="s-title">${s.insight.title}</div><span class="s-chip">${s.insight.range}</span></div>
      <div class="s-pad">${s.insight.body}</div></div></div>`
  };
  function screenHTML(s, lm) { return `<div class="gl-screen"><div class="screen__chrome"><i></i><i></i><i></i><span class="screen__url">app.facilio.com/maintenance/${lm.key}</span></div>${(SCREEN[s.kind] || (() => ''))(s)}</div>`; }

  function overview(lm) {
    return `<section class="gl-sec" id="gl-overview"><div class="pink-label">What the module is about${STD}</div>
      <div class="gl-ov"><div class="gl-prose">${lm.about.map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="gl-who"><h4>Who uses it day to day</h4>${lm.who.map(([, t, s]) => `<div><b>${esc(t)}</b><span>${esc(s)}</span></div>`).join('')}</div></div>
      <h4 class="gl-subh">What it solves</h4>
      <div class="gl-solves">${lm.solves.map(([pain, fix, kpi]) => `<div class="gl-solve"><p class="pain">${esc(pain)}</p><p class="fix">${esc(fix)}</p><span class="tag green">${V.ico('check')}${esc(kpi)}</span></div>`).join('')}</div></section>`;
  }

  let flowTimer = null;
  function stopFlow() { clearInterval(flowTimer); flowTimer = null; }
  function walk(lm) {
    const fi = st(lm, 'flow', 0); const f = lm.flows[fi]; const on = st(lm, 'flowStep', -1);
    return `<section class="gl-sec" id="gl-walk">${head('', 'Walkthroughs', 'Everyday scenarios, step by step: who acts, where it happens and what the record shows.')}
      <div class="tabs inline" role="tablist">${lm.flows.map((x, i) => `<button class="tab${i === fi ? ' active' : ''}" role="tab" aria-selected="${i === fi}" data-act="glFlow" data-k="${lm.key}" data-i="${i}">${esc(x.title)}</button>`).join('')}</div>
      <div class="gl-walk"><div class="gl-walk-intro"><p>${esc(f.scenario)}</p>
          <div class="row"><button class="btn sm primary" data-act="glPlay" data-k="${lm.key}">${on >= 0 && flowTimer ? 'Playing…' : 'Play walkthrough'}</button><button class="btn sm ghost" data-act="glShowAll" data-k="${lm.key}">Show all steps</button></div>
          <div class="gl-outcome"><b>Outcome</b>${esc(f.outcome)}</div></div>
        <ol class="gl-tl">${f.steps.map((s, i) => `<li class="${on < 0 ? '' : i === on ? 'is-on' : i > on ? 'is-dim' : ''}"><span class="av ${/automation|facilio/i.test(s.actor) ? 'sys' : ''}">${esc((s.actor || '?').replace(/[^A-Za-z]/g, '').slice(0, 1) || '?')}</span>
          <div><div class="who">${esc(s.actor)}<span>${esc(s.channel)}</span></div><p>${esc(s.text)}</p></div>${s.status ? `<span class="gl-state">${esc(s.status)}</span>` : '<span></span>'}</li>`).join('')}</ol></div></section>`;
  }

  function proc(lm) {
    const i = st(lm, 'stage', 0); const s = lm.process.steps[i];
    return `<section class="gl-sec" id="gl-process">${head('', lm.process.title, 'The standard flow most customers start from. Pick a stage to see what happens, who is involved and what we will decide together.')}
      <div class="gl-proc"><ol class="gl-stages" role="tablist">${lm.process.steps.map((x, j) => `<li><button role="tab" aria-selected="${j === i}" class="${j === i ? 'on' : ''}" data-act="glStage" data-k="${lm.key}" data-i="${j}"><span class="n">${j + 1}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button></li>`).join('')}</ol>
        <div class="gl-stage" role="tabpanel"><div class="row"><h3 style="flex:1">${esc(s.t)}</h3><span class="tag">${esc(s.who)}</span></div><p>${esc(s.p)}</p>
          <div class="gl-states" aria-label="Record status at this stage">${lm.process.statuses.map((x, j) => `<span class="${j === s.statusOn ? 'on' : ''}">${esc(x)}</span>`).join('')}</div>
          <div class="grid g2"><div class="gl-box"><h4>What happens</h4><ul>${s.happens.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="gl-box dec"><h4>We will decide together</h4><ul>${s.decide.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div></div></section>`;
  }

  function thumb(v) { return `<span class="gl-thumb"><span class="t-tag">${esc(v.tag)}</span><span class="t-play">${playIcon}</span><span class="t-title">${esc(v.t)}</span>${v.d ? `<span class="t-dur">${v.d}</span>` : ''}</span>`; }
  const playIcon = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  function watchBtn(id) { const w = !!(ui().watched || {})[id]; return `<button class="gl-watch${w ? ' on' : ''}" data-act="glWatch" data-v="${id}" aria-pressed="${w}">${w ? V.ico('check') + 'Watched' : 'Mark watched'}</button>`; }
  function videos(lm) {
    const ids = lm.videos.filter(id => L.VIDEOS[id]); const [fid, ...rest] = ids; const f = L.VIDEOS[fid];
    return `<section class="gl-sec" id="gl-videos">${head('', 'Watch before the session', 'Short clips from the Facilio video library, picked for this module. They open on videos.facilio.com in a new tab.')}
      ${f ? `<div class="gl-vfeat"><a href="${esc(vurl(f))}" target="_blank" rel="noopener" aria-label="Watch ${esc(f.t)}">${thumb(f)}</a>
        <div><span class="tag blue">Start here</span><h3>${esc(f.t)}</h3><p>${esc(f.s)}</p><div class="row"><a class="btn primary" href="${esc(vurl(f))}" target="_blank" rel="noopener">Watch clip</a>${watchBtn(fid)}</div></div></div>` : ''}
      <div class="gl-vgrid">${rest.slice(0, 6).map(id => { const v = L.VIDEOS[id]; return `<div class="gl-vcard"><a href="${esc(vurl(v))}" target="_blank" rel="noopener" aria-label="Watch ${esc(v.t)}">${thumb(v)}</a><div class="b"><p>${esc(v.s)}</p><div class="row"><a class="btn sm link" href="${esc(vurl(v))}" target="_blank" rel="noopener">Watch</a><span class="spacer"></span>${watchBtn(id)}</div></div></div>`; }).join('')}</div></section>`;
  }
  function platformClips() {
    return `<div class="gl-chips">${L.PLATFORM.map(id => { const v = L.VIDEOS[id]; return `<a class="gl-chip" href="${esc(vurl(v))}" target="_blank" rel="noopener">${playIcon}${esc(v.t)}${v.d ? `<span>${v.d}</span>` : ''}</a>`; }).join('')}<a class="gl-chip" href="${L.VBASE}" target="_blank" rel="noopener">Full video library</a></div>`;
  }

  const REQ = { yes: ['Required', 'mand'], no: ['Optional', 'low'], auto: ['System', 'system'] };
  // Facilio's review of a field the customer asked for: Proposed / Accepted / Custom (CR) / Not needed
  const FR = ['Proposed', 'Accepted', 'Custom (CR)', 'Not needed']; const FRC = { Proposed: 'tbc', Accepted: 'green', 'Custom (CR)': 'violet', 'Not needed': 'low' };
  const frId = key => 'fr_' + F.slug(key).slice(0, 70);
  const frGet = key => { if (V.items) V.items.load(['fieldreq']); return V.items && V.items.ready(['fieldreq']) ? V.items.get('fieldreq', frId(key)) : null; };
  const fieldReviewTag = key => { const r = frGet(key); return r ? `<span style="display:block;margin-top:2px">${V.tag(FRC[r.status] || 'tbc', 'Review: ' + r.status)}${r.crNo ? ' <span class="xs muted">' + esc(r.crNo) + '</span>' : ''}</span>` : `<span style="display:block;margin-top:2px">${V.tag('tbc', 'Review: Proposed')}</span>`; };
  V.learnFieldReview = (x) => { const r = frGet(x.key); const ro = V.isCustomer() || S.readonly; return `<div class="xs">${ro ? V.tag(FRC[(r || {}).status] || 'tbc', (r || {}).status || 'Proposed') : `<select data-change="glFr" data-key="${esc(x.key)}" style="width:130px">${FR.map(o => `<option ${((r || {}).status || 'Proposed') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`}${r && r.crId ? ' <span class="xs muted">CR created</span>' : ''}</div>`; };
  ACT.glFr = el => V.busy(null, async () => { const key = el.getAttribute('data-key'); const x = R.map[key]; if (!x) return; const old = frGet(key) || {}; const d = { key, status: el.value, label: x.value.label, type: x.value.type };
    if (d.status === 'Custom (CR)' && !old.crId) { const id = V.items.uid('cr'); const lmKey = key.split(':')[0]; const mod = (F.allModules().find(m => { const l = root.FWBLearn.forModule(m.name); return l && l.key === lmKey; }) || {}).name || ''; const cr = await V.items.put('cr', id, { title: 'Custom field: ' + x.value.label, mod, description: x.value.type + (x.value.note ? ' — ' + x.value.note : ''), why: 'Requested by the customer in the user guide', status: 'Draft', side: 'facilio', published: false }, { silent: true }); d.crId = id; d.crNo = 'CR-' + String(cr.n || '').padStart(3, '0'); toast('Change request drafted for this field'); }
    else { d.crId = old.crId; d.crNo = old.crNo; }
    await V.items.put('fieldreq', frId(key), d); });
  function fields(lm) {
    const groups = Object.keys(lm.fieldGroups); const g = groups.includes(st(lm, 'fg')) ? st(lm, 'fg') : groups[0]; const ro = !canWrite();
    const decided = rows => rows.filter(r => (rv(`${lm.key}:f:${r[0]}`) || {}).decision).length;
    const extras = Object.values(R.map).filter(x => x.key.startsWith(lm.key + ':x:')).sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
    return `<section class="gl-sec" id="gl-fields">${head('', 'Review the standard fields', 'For each field, tell us whether you will use it as is, call it something else, or not need it. Add anything you track today that is missing.')}
      <div class="row" style="margin-bottom:10px"><div class="seg">${groups.map(x => `<button class="${x === g ? 'on' : ''}" data-act="glFg" data-k="${lm.key}" data-g="${esc(x)}">${esc(x)} <span class="muted">${decided(lm.fieldGroups[x])}/${lm.fieldGroups[x].length}</span></button>`).join('')}</div></div>
      <div class="tbl-wrap"><table class="tbl gl-ftbl"><thead><tr><th style="width:19%">Field</th><th style="width:11%">Type</th><th>What it captures</th><th style="width:9%">Standard</th><th style="width:30%">Your decision</th></tr></thead><tbody>
        ${lm.fieldGroups[g].map(([k, n, t, d, r]) => { const key = `${lm.key}:f:${k}`; const cur = rv(key) || {}; return `<tr><td><b>${esc(n)}</b></td><td class="small">${esc(t)}</td><td class="small">${esc(d)}</td><td>${V.tag((REQ[r] || REQ.no)[1], (REQ[r] || REQ.no)[0])}</td>
          <td><div class="seg gl-dec">${[['use', 'Use'], ['rename', 'Rename'], ['skip', 'Not needed']].map(([v, l]) => `<button class="${cur.decision === v ? 'on' : ''}" aria-pressed="${cur.decision === v}" data-act="glField" data-key="${esc(key)}" data-d="${v}" ${ro || (v === 'skip' && r === 'auto') ? 'disabled' : ''} ${v === 'skip' && r === 'auto' ? 'title="System fields are always kept"' : ''}>${l}</button>`).join('')}</div>
            ${cur.decision === 'rename' ? `<input type="text" class="gl-ren" data-glren="${esc(key)}" value="${esc(cur.rename || '')}" placeholder="Your name for ${esc(n)}" aria-label="Your name for ${esc(n)}" ${ro ? 'disabled' : ''}>` : ''}
            ${cur.decision ? `<input type="text" class="gl-ren" data-glnote="${esc(`${lm.key}:n:${k}`)}" value="${esc(rv(`${lm.key}:n:${k}`) || '')}" placeholder="Note for your project team (optional)" aria-label="Note on ${esc(n)}" ${ro ? 'disabled' : ''}>` : ''}
            <div class="xs muted" data-glby="${esc(key)}">${cur.decision ? esc(byline(key)) : ''}</div></td></tr>`; }).join('')}</tbody></table></div>
      <div class="card gl-extra"><div class="card-b"><h4>Missing a field?</h4><p class="small muted" style="margin:4px 0 10px">Tell us what you track today that is not in the list. We will add it as a custom field.</p>
        <div class="gl-extra-form"><input type="text" id="glx-label-${lm.key}" placeholder="Field name, e.g. Cost centre" aria-label="Field name" ${ro ? 'disabled' : ''}>
          <select id="glx-type-${lm.key}" aria-label="Field type" ${ro ? 'disabled' : ''}>${['Text', 'Number', 'Date', 'Picklist', 'Lookup', 'Currency', 'File', 'Yes / No'].map(t => `<option>${t}</option>`).join('')}</select>
          <input type="text" id="glx-note-${lm.key}" placeholder="Why you need it, example values" aria-label="Notes" ${ro ? 'disabled' : ''}>
          <button class="btn" data-act="glExtraAdd" data-k="${lm.key}" ${ro ? 'disabled' : ''}>Add field</button></div>
        ${extras.length ? `<div class="gl-extra-list">${extras.map(x => `<div><span><b>${esc(x.value.label)}</b> ${V.tag('custom', esc(x.value.type))}<span class="small muted"> ${esc(x.value.note || '')}</span><span class="xs muted" style="display:block">${esc(byline(x.key))}</span>${fieldReviewTag(x.key)}</span>${ro ? '' : `<button class="btn sm ghost" data-act="glExtraDel" data-key="${esc(x.key)}" aria-label="Remove ${esc(x.value.label)}">${V.ico('x')}</button>`}</div>`).join('')}</div>` : ''}</div></div></section>`;
  }

  // impact of an answer, from the words in the question (rules, not AI)
  const IMPACT = [[/state ?flow|status|approval|escalat|reopen|close|complet/i, 'Stateflow'], [/\bsla\b|response time|priority|pause/i, 'SLA'], [/notif|email|sms|whatsapp|alert/i, 'Notifications'], [/role|permission|access|who can|approver/i, 'Roles & access'], [/import|migrat|master data|existing data|asset list|sites/i, 'Data import'], [/field|form|id format|prefix|mandatory/i, 'Forms & fields'], [/report|dashboard|kpi/i, 'Reports'], [/uat|test|training/i, 'UAT & training'], [/go.?live|cut.?over/i, 'Go-live'], [/integrat|erp|bms|api|sso/i, 'Integration']];
  const impactOf = q => { const t = q.q + ' ' + (q.hint || ''); const m = IMPACT.find(x => x[0].test(t)); return m ? m[1] : ''; };
  const parked = (lm, q) => !!rv(`${lm.key}:p:${q.id}`);
  const qFilter = () => S.ui.glQf || 'all';
  ACT.glQf = a => { S.ui.glQf = a.getAttribute('data-v'); V.render(); };
  ACT.glPark = a => { const key = a.getAttribute('data-key'); rSet(key, rv(key) ? null : true); setTimeout(() => V.render(), 50); };
  function question(lm, q, n) {
    const key = `${lm.key}:a:${q.id}`; const v = rv(key); const ro = !canWrite(); const dis = ro ? 'disabled' : ''; const id = 'glq-' + lm.key + '-' + q.id;
    let input = '';
    if (q.type === 'text' || q.type === 'number') input = `<input type="${q.type === 'number' ? 'number' : 'text'}" id="${id}" data-glq="${esc(key)}" value="${esc(v || '')}" placeholder="${esc(q.placeholder || '')}" ${q.type === 'number' ? 'style="max-width:220px" inputmode="numeric"' : ''} ${dis}>`;
    else if (q.type === 'long') input = `<textarea id="${id}" rows="3" data-glq="${esc(key)}" placeholder="${esc(q.placeholder || '')}" ${dis}>${esc(v || '')}</textarea>`;
    else {
      const many = q.type === 'multi'; const opts = q.type === 'yesno' ? ['Yes', 'No', 'Not sure'] : q.options;
      input = `<div class="gl-opts${q.type === 'scale' ? ' scale' : ''}" role="${many ? 'group' : 'radiogroup'}" aria-labelledby="${id}-l">${opts.map((o, i) => { const on = many ? Array.isArray(v) && v.includes(o) : v === o; return `<button class="gl-opt${on ? ' on' : ''}${many ? ' sq' : ''}" ${many ? `aria-pressed="${on}"` : `role="radio" aria-checked="${on}"`} data-act="glOpt" data-key="${esc(key)}" data-many="${many ? 1 : ''}" data-v="${esc(o)}" ${dis}>${q.type === 'scale' ? `<b>${i + 1}</b>` : '<span class="tick"></span>'}${esc(o)}</button>`; }).join('')}</div>`;
    }
    return `<div class="gl-q${filled(v) ? ' done' : ''}" data-glwrap="${esc(key)}"><span class="n">${n}</span><div><label class="gl-ql" id="${id}-l" for="${id}">${esc(q.q)}</label>${q.hint ? `<div class="xs muted" style="margin:-2px 0 6px">${esc(q.hint)}</div>` : ''}${input}<div class="xs muted gl-qmeta" data-glby="${esc(key)}">${filled(v) ? esc('Answered by ' + byline(key)) : ''}</div><div class="row" style="gap:8px;margin-top:4px">${impactOf(q) ? V.tag('blue', 'Affects: ' + impactOf(q)) : ''}${filled(v) ? '' : `<button class="btn sm ${parked(lm, q) ? 'primary' : 'ghost'}" data-act="glPark" data-key="${esc(`${lm.key}:p:${q.id}`)}" ${dis}>${parked(lm, q) ? 'Parked for the workshop' : 'Discuss in the workshop'}</button>`}</div></div></div>`;
  }
  function questions(lm) {
    let n = 0;
    return `<section class="gl-sec" id="gl-questions">${head('', 'Tell us how you work today', 'Answer what you can. Each answer saves on its own and your implementation team sees it straight away. Rough answers are fine; we refine them together in the session.', true)}
      <div class="row" style="margin-bottom:10px"><div class="seg">${[['all', 'All'], ['todo', 'To answer'], ['ws', 'For the workshop'], ['done', 'Answered']].map(([v, l]) => `<button class="${qFilter() === v ? 'on' : ''}" data-act="glQf" data-v="${v}">${l}</button>`).join('')}</div></div>
      ${lm.form.map(sec => { const d = sec.questions.filter(q => filled(rv(`${lm.key}:a:${q.id}`))).length; const f = qFilter(); const show = q => f === 'all' || (f === 'done' && filled(rv(`${lm.key}:a:${q.id}`))) || (f === 'ws' && parked(lm, q) && !filled(rv(`${lm.key}:a:${q.id}`))) || (f === 'todo' && !filled(rv(`${lm.key}:a:${q.id}`)) && !parked(lm, q)); const body = sec.questions.map(q => { n++; return show(q) ? question(lm, q, n) : ''; }).join(''); if (!body.trim()) return ''; return `<div class="card gl-fsec"><div class="card-h"><h3>${esc(sec.section)}</h3><span class="small muted" data-glsec="${lm.key}:${esc(sec.section)}">${d} of ${sec.questions.length}</span></div><div class="card-b">${body}</div></div>`; }).join('')}</section>`;
  }

  function agenda(lm) {
    const t2 = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; const rows = [['0:00', 'Introductions and goals', 'Who owns what, and what success looks like at go-live.'], ['0:15', 'Review your answers', 'We walk through the questions and field decisions together.']];
    let t = 45; lm.process.steps.forEach(s => { rows.push([t2(t), s.t + ': ' + s.s, s.decide.join('; ')]); t += 18; });
    rows.push([t2(t), 'Data, integrations and next steps', 'What we need from you, by when, and the configuration plan.']); return rows;
  }
  function prepare(lm) {
    const ro = !canWrite(); const p = progress(lm);
    return `<section class="gl-sec" id="gl-prepare">${head('', 'Prepare for the session', 'Tick items off as your team gathers them. The agenda follows the decisions in the process above.', true)}
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Bring to the session</h3><span class="small muted" data-glbring="${lm.key}">${p.b} of ${p.bn} ready</span></div><div class="card-b">
        ${lm.bring.map(([t, s], i) => { const key = `${lm.key}:b:${i}`; return `<label class="gl-check"><input type="checkbox" data-change="glBring" data-key="${key}" ${rv(key) ? 'checked' : ''} ${ro ? 'disabled' : ''}><span><b>${esc(t)}</b><small>${esc(s)}</small><small class="by" data-glby="${key}">${rv(key) ? esc('Ticked by ' + byline(key)) : ''}</small></span></label>`; }).join('')}
        <h4 class="gl-subh">Who should attend</h4><div class="row">${lm.people.map(([, t]) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div></div>
        <div class="card"><div class="card-h"><h3>Session agenda</h3></div><div class="card-b"><ol class="gl-agenda">${agenda(lm).map(([t, b, s]) => `<li><span class="t">${t}</span><div><b>${esc(b)}</b><small>${esc(s)}</small></div></li>`).join('')}</ol></div></div></div></section>`;
  }

  // ---------- public renderers used by guide.js ----------
  V.learn = {
    top(lm) { rState(); return intro(lm) + strip(lm); },
    before(lm) { return screens(lm) + overview(lm) + walk(lm) + proc(lm) + videos(lm); },
    after(lm) { return fields(lm) + questions(lm) + prepare(lm); },
    // introduction sheet: how the guide works, module readiness, platform clips
    introBlocks(mods) {
      rState();
      const list = mods.filter((x, i) => x.lm && mods.findIndex(y => y.lm && y.lm.key === x.lm.key) === i);
      return `<div class="pink-label">How this guide works</div>
        <ol class="gl-how"><li><b>Read</b><span>Each tab is one module. See the screens, a worked walkthrough and the standard process.</span></li><li><b>Watch</b><span>Two to four minute clips from the Facilio video library, picked per module.</span></li><li><b>Review</b><span>Tell us which standard fields you will use, rename or not need.</span></li><li><b>Answer</b><span>Answer the questions we would otherwise ask in the room. Answers save as you go.</span></li></ol>
        ${list.length ? `<div class="pink-label">Your modules</div><div class="gl-mods">${list.map(x => { const p = progress(x.lm); const tot = p.qn + p.fn + p.bn; const done = p.a + p.f + p.b; return `<button class="gl-mod" data-act="guideMod" data-m="${esc(x.name)}"><span class="t"><b>${esc(x.label)}</b><small>${esc(x.lm.tagline)}</small></span><span class="gl-bar"><i style="width:${tot ? Math.round(done / tot * 100) : 0}%"></i></span><span class="xs muted">${p.a} of ${p.qn} questions answered, ${x.lm.videos.length} clips</span></button>`; }).join('')}</div>` : ''}
        <div class="pink-label">Platform basics</div><p class="small muted" style="margin:0 0 8px">Clips that apply to every module: reporting, dashboards, views, users and notifications.</p>${platformClips()}`;
    },
    mount() {
      rState();
      if (R.loaded && Date.now() - R.polled > 45000) rLoad(false);
      const body = document.getElementById('wbBody'); const nav = document.querySelector('.wb-nav .wb-sub'); if (!nav || !root.IntersectionObserver) return;
      const btns = [...nav.querySelectorAll('button')];
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) btns.forEach(b => b.classList.toggle('on', b.getAttribute('data-t') === en.target.id)); }), { root: body, rootMargin: '-20% 0px -70% 0px' });
      JUMP.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    }
  };

  // ---------- keep counts, bylines and controls in step without re-rendering the page ----------
  function current() { const el = document.querySelector('.gl-strip'); return el ? L.BY[el.id.replace('gl-strip-', '')] : null; }
  function syncAll() {
    const lm = current(); if (!lm) return;
    swap('gl-strip-' + lm.key, strip(lm));
    document.querySelectorAll('[data-glby]').forEach(el => { const k = el.getAttribute('data-glby'); const v = rv(k); el.textContent = !filled(v) && !(v && v.decision) ? '' : (k.includes(':a:') ? 'Answered by ' : k.includes(':b:') ? 'Ticked by ' : '') + byline(k); });
    document.querySelectorAll('[data-glwrap]').forEach(el => el.classList.toggle('done', filled(rv(el.getAttribute('data-glwrap')))));
    document.querySelectorAll('[data-glq]').forEach(el => { if (document.activeElement !== el) el.value = rv(el.getAttribute('data-glq')) || ''; });
    document.querySelectorAll('[data-act="glOpt"]').forEach(b => { const v = rv(b.getAttribute('data-key')); const on = b.getAttribute('data-many') ? Array.isArray(v) && v.includes(b.getAttribute('data-v')) : v === b.getAttribute('data-v'); b.classList.toggle('on', on); b.setAttribute(b.getAttribute('data-many') ? 'aria-pressed' : 'aria-checked', on); });
    document.querySelectorAll('input[data-change="glBring"]').forEach(c => { c.checked = !!rv(c.getAttribute('data-key')); });
    lm.form.forEach(sec => { const el = document.querySelector(`[data-glsec="${lm.key}:${CSS.escape(sec.section)}"]`); if (el) el.textContent = `${sec.questions.filter(q => filled(rv(`${lm.key}:a:${q.id}`))).length} of ${sec.questions.length}`; });
    const p = progress(lm); const b = document.querySelector(`[data-glbring="${lm.key}"]`); if (b) b.textContent = `${p.b} of ${p.bn} ready`;
  }
  function refreshFields(lm) { const body = document.getElementById('wbBody'); const y = body ? body.scrollTop : 0; swap('gl-fields', fields(lm)); syncAll(); if (body) body.scrollTop = y; }

  // ---------- actions ----------
  const lmOf = a => L.BY[a.getAttribute('data-k')] || L.BY[(a.getAttribute('data-key') || '').split(':')[0]];
  ACT.glJump = a => { const el = document.getElementById(a.getAttribute('data-t')); if (el) el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  ACT.glSlide = a => { const lm = lmOf(a); const n = lm.screens.length; setSt(lm, 'slide', ((+a.getAttribute('data-i')) % n + n) % n); swap('gl-screens', screens(lm)); };
  ACT.glFlow = a => { const lm = lmOf(a); stopFlow(); setSt(lm, 'flow', +a.getAttribute('data-i')); setSt(lm, 'flowStep', -1); swap('gl-walk', walk(lm)); };
  ACT.glShowAll = a => { const lm = lmOf(a); stopFlow(); setSt(lm, 'flowStep', -1); swap('gl-walk', walk(lm)); };
  ACT.glPlay = a => {
    const lm = lmOf(a); stopFlow(); const n = lm.flows[st(lm, 'flow', 0)].steps.length; setSt(lm, 'flowStep', 0);
    flowTimer = setInterval(() => { if (!document.getElementById('gl-walk')) { stopFlow(); return; } const s = st(lm, 'flowStep', 0) + 1; if (s >= n) { stopFlow(); setSt(lm, 'flowStep', -1); } else setSt(lm, 'flowStep', s); swap('gl-walk', walk(lm)); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 2600 : 1700);
    swap('gl-walk', walk(lm));
  };
  ACT.glStage = a => { const lm = lmOf(a); setSt(lm, 'stage', +a.getAttribute('data-i')); swap('gl-process', proc(lm)); };
  ACT.glFg = a => { const lm = lmOf(a); setSt(lm, 'fg', a.getAttribute('data-g')); refreshFields(lm); };
  ACT.glField = a => {
    const key = a.getAttribute('data-key'); const lm = lmOf(a); const cur = rv(key) || {}; const d = cur.decision === a.getAttribute('data-d') ? '' : a.getAttribute('data-d');
    rSet(key, d ? { decision: d, rename: d === 'rename' ? (cur.rename || '') : '' } : null); refreshFields(lm);
    if (d === 'rename') { const inp = document.querySelector(`[data-glren="${CSS.escape(key)}"]`); if (inp) inp.focus(); }
  };
  ACT.glOpt = a => {
    const key = a.getAttribute('data-key'); const v = a.getAttribute('data-v'); const cur = rv(key); let nv;
    if (a.getAttribute('data-many')) { nv = Array.isArray(cur) ? cur.slice() : []; const i = nv.indexOf(v); if (i >= 0) nv.splice(i, 1); else nv.push(v); } else nv = cur === v ? '' : v;
    rSet(key, nv); syncAll();
  };
  ACT.glBring = el => { rSet(el.getAttribute('data-key'), el.checked ? true : null); syncAll(); };
  ACT.glWatch = a => { const id = a.getAttribute('data-v'); const u = ui(); u.watched = u.watched || {}; u.watched[id] = !u.watched[id]; try { localStorage.setItem('fwb-watched', JSON.stringify(u.watched)); } catch (e) { /* storage unavailable */ } document.querySelectorAll(`[data-act="glWatch"][data-v="${id}"]`).forEach(b => { b.outerHTML = watchBtn(id); }); };
  try { ui().watched = JSON.parse(localStorage.getItem('fwb-watched') || '{}') || {}; } catch (e) { /* storage unavailable */ }
  ACT.glExtraAdd = a => {
    const lm = lmOf(a); const k = lm.key; const lab = document.getElementById('glx-label-' + k); if (!lab.value.trim()) { lab.focus(); toast('Enter a field name first'); return; }
    rSet(`${k}:x:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, { label: lab.value.trim().slice(0, 120), type: document.getElementById('glx-type-' + k).value, note: document.getElementById('glx-note-' + k).value.trim().slice(0, 500) });
    refreshFields(lm); toast('Field request added');
  };
  ACT.glExtraDel = a => { const lm = lmOf(a); rSet(a.getAttribute('data-key'), null); refreshFields(lm); };
  document.addEventListener('input', e => {
    const el = e.target; if (!el.getAttribute) return;
    const q = el.getAttribute('data-glq'); if (q) { rSet(q, el.value, 700); const w = el.closest('[data-glwrap]'); if (w) w.classList.toggle('done', filled(el.value)); return; }
    const r = el.getAttribute('data-glren'); if (r) rSet(r, { decision: 'rename', rename: el.value }, 700);
    const nt = el.getAttribute('data-glnote'); if (nt) rSet(nt, el.value || null, 700);
  });
  document.addEventListener('focusout', e => { const el = e.target; if (el.getAttribute && (el.getAttribute('data-glq') || el.getAttribute('data-glren') || el.getAttribute('data-glnote'))) setTimeout(syncAll, 0); });

  // ---------- consultant view: everything customers have answered ----------
  const fmt = v => Array.isArray(v) ? v.join('; ') : v && typeof v === 'object' ? (v.decision === 'rename' ? 'Rename to: ' + (v.rename || '(not given)') : v.decision === 'skip' ? 'Not needed' : v.decision === 'use' ? 'Use as is' : JSON.stringify(v)) : String(v ?? '');
  V.learnResponsesView = function (mods) {
    const st0 = rState();
    if (!st0.loaded) return st0.error ? `<div class="notice err">${esc(st0.error)}</div>` : '<div class="empty">Loading answers…</div>';
    const list = mods.filter((x, i) => x.lm && mods.findIndex(y => y.lm && y.lm.key === x.lm.key) === i); if (!list.length) return '<div class="empty">None of the modules in the guide have learning content yet. Map them in Modules &amp; order.</div>';
    const sel = list.find(x => x.lm.key === S.ui.glResp) || list[0]; const lm = sel.lm; const k = lm.key;
    const fRows = flds(lm).map(f => ({ f, x: R.map[`${k}:f:${f[0]}`] })).filter(r => r.x);
    const extras = Object.values(R.map).filter(x => x.key.startsWith(k + ':x:'));
    return `<div class="row" style="margin-bottom:12px"><div class="seg">${list.map(x => { const p = progress(x.lm); return `<button class="${x === sel ? 'on' : ''}" data-act="glResp" data-v="${x.lm.key}">${esc(x.lm.short)} <span class="muted">${p.a}/${p.qn}</span></button>`; }).join('')}</div><span class="spacer"></span><button class="btn sm" data-act="glRespRefresh">Refresh</button><button class="btn sm" data-act="glCsv">${V.ico('dl')}Download CSV</button></div>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Questions</h3><span class="small muted">${progress(lm).a} of ${progress(lm).qn} answered</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:18%">Section</th><th style="width:34%">Question</th><th>Answer</th><th style="width:18%">By</th></tr></thead><tbody>
        ${lm.form.flatMap(s => s.questions.map(q => { const key = `${k}:a:${q.id}`; const x = R.map[key]; return `<tr><td class="small muted">${esc(s.section)}</td><td class="small">${esc(q.q)}</td><td class="small">${x ? esc(fmt(x.value)) : '<span class="muted">Not answered</span>'}</td><td class="xs muted">${x ? esc(byline(key)) : ''}</td></tr>`; })).join('')}</tbody></table></div></div>
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Field decisions</h3><span class="small muted">${fRows.length} of ${flds(lm).length} reviewed</span></div><div class="tbl-wrap"><table class="tbl"><tbody>${fRows.map(r => `<tr><td class="small"><b>${esc(r.f[1])}</b></td><td class="small">${esc(fmt(r.x.value))}</td><td class="xs muted">${esc(byline(r.x.key))}</td></tr>`).join('') || '<tr><td class="empty">No decisions yet.</td></tr>'}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>Custom field requests and checklist</h3></div><div class="card-b small">${extras.map(x => `<div style="margin-bottom:6px"><b>${esc(x.value.label)}</b> ${V.tag('custom', esc(x.value.type))} ${esc(x.value.note || '')}<div class="xs muted">${esc(byline(x.key))}</div>${V.learnFieldReview(x)}</div>`).join('') || '<div class="muted">No custom field requests.</div>'}
          <h4 class="gl-subh">Bring to the session</h4>${lm.bring.map(([t], i) => `<div>${rv(`${k}:b:${i}`) ? V.tag('green', 'Ready') : V.tag('low', 'Open')} ${esc(t)}</div>`).join('')}</div></div></div>`;
  };
  // answers as a flat list, for the BRD working views. Customer inputs only: nothing here is a confirmed requirement.
  V.learnAnswers = () => { const st = rState(); const list = []; if (!st.loaded) return { loaded: false, list };
    L.MODS.forEach(lm => lm.form.forEach(sec => sec.questions.forEach(x => { const r = R.map[`${lm.key}:a:${x.id}`]; if (r) list.push({ mod: lm.name, modKey: lm.key, section: sec.section, q: x.q, answer: fmt(r.value), by: r.authorName, kind: r.authorKind, at: r.updatedAt, key: r.key }); })));
    return { loaded: true, list }; };
  ACT.glResp = a => { S.ui.glResp = a.getAttribute('data-v'); V.render(); };
  ACT.glRespRefresh = () => rLoad(true);
  ACT.glCsv = async () => {
    if (!rState().loaded) await rLoad(false); // started before the answers were fetched: wait for them, so the file is not just a header row
    const q = s => '"' + String(root.FWB.csvText(s ?? '')).replace(/"/g, '""') + '"'; const rows = [['Module', 'Type', 'Section / group', 'Item', 'Response', 'By', 'Kind', 'Updated']];
    L.MODS.forEach(lm => {
      lm.form.forEach(s => s.questions.forEach(x => { const r = R.map[`${lm.key}:a:${x.id}`]; if (r) rows.push([lm.name, 'Question', s.section, x.q, fmt(r.value), r.authorName, r.authorKind, r.updatedAt]); }));
      Object.entries(lm.fieldGroups).forEach(([g, fs]) => fs.forEach(f => { const r = R.map[`${lm.key}:f:${f[0]}`]; if (r) rows.push([lm.name, 'Field', g, f[1], fmt(r.value), r.authorName, r.authorKind, r.updatedAt]); }));
      Object.values(R.map).filter(r => r.key.startsWith(lm.key + ':x:')).forEach(r => rows.push([lm.name, 'Custom field request', r.value.type, r.value.label, r.value.note, r.authorName, r.authorKind, r.updatedAt]));
      lm.bring.forEach(([t], i) => { const r = R.map[`${lm.key}:b:${i}`]; if (r) rows.push([lm.name, 'Checklist', 'Bring to the session', t, 'Ready', r.authorName, r.authorKind, r.updatedAt]); });
    });
    V.download(`${F.slug((S.project || {}).name || 'project')}-guide-answers.csv`, new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
