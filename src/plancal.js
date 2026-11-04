/* Project calendar (Project Plan > Calendar): the plan, workshop sessions, UAT and go-live dates, actions and sign-offs that fall due, drawn on a
   Day / Week / Month / Year calendar. Every date comes from the saved plan and records; nothing is invented.
   Colour has one job: it says which PHASE of delivery an item belongs to (the plan's 12 standard steps grouped into four phases, matched by wording as on the
   Plan Timeline): Discover and define, Build and validate, Launch, Hand over. A plan phase strip above the grid shows the four phases with their dates and
   what is in each. Items that match no step take a neutral colour. Actions due and the team's own reminders are drawn differently (outlined), so they are
   never mistaken for plan work. The team can add reminders, events and deadlines (item kind "cal", team only), which can also show in the notification bell
   on their day. Customers see the plan, published workshop sessions and their own actions, but not the team's reminders. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const { drawer, closeDrawer, toast, confirmDialog } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly;
  const D = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : '');
  const add = (d, n) => V.addDays(d, n); const dif = (a, b) => V.daysBetween(a, b); const dow = d => (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7;   // Monday first
  const monday = d => add(d, -dow(d)); const addMonths = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // four phases (the same grouping the portfolio health uses): an accent for the edge and a soft tint for the fill, both from the Facilio palette
  const PHASES = [['Discover and define', 0, 4, '#1570EF', '#EAF2FF', '#5FA0F7'], ['Build and validate', 4, 7, '#1D1A5E', '#E8EBF6', '#1570EF'], ['Launch', 7, 10, '#E5197F', '#FDEAF3', '#FF6FAE'], ['Hand over', 10, 12, '#8DB8FF', '#F0F6FF', '#C3D9FF']];   // the four Facilio colours: blue, navy, pink and sky; each with a pale tint and a second stop for the few gradients (edge, progress)
  const OTHER = { a: '#5B6B99', t: '#EEF2F8', g: '#8C9AC2' };
  const phaseOf = i => PHASES.findIndex(p => i >= p[1] && i < p[2]);
  const SO_STEP = { brd: 2, uat: 8, golive: 11 };
  const st = () => { const c = S.ui.cal = S.ui.cal || { mode: 'month', date: V.today(), hide: [], q: '' }; return c; };
  let cache = {}; const asked = {}; let steps = [];

  function events() {
    const out = []; const c = st(); const td = F.doc('plan_struct') || {}; const meet = new Set(); steps = V.planSteps ? V.planSteps() : [];
    const mk = e => { const p = e.step >= 0 ? phaseOf(e.step) : -1; const col = p >= 0 ? { a: PHASES[p][3], t: PHASES[p][4], g: PHASES[p][5] } : OTHER; e.g = col.g; e.ph = p; e.a = col.a; e.t = col.t; e.key = e.kind === 'ghost' ? 'action' : e.kind === 'mine' ? 'mine' : p >= 0 ? 'p' + p : 'other'; out.push(e); };
    (td.rows || []).filter(r => !r.isPhase && D(r.start)).forEach((r, i) => { const end = D(r.end) && r.end >= r.start ? r.end : r.start; const step = V.planStepOf ? V.planStepOf(r) : -1; if (step === 1) meet.add(r.start); mk({ id: 'p' + i, src: 'plan', step, grp: String(r.phase || '').trim(), title: r.title || 'Task', start: r.start, end, done: r.status === 'Done', late: r.status !== 'Done' && end < V.today(), r }); });
    const sess = cust() ? ((F.doc('schedule_published') || {}).sessions || []) : ((F.doc('planner') || {}).sessions || []);
    sess.forEach((s, i) => { if (D(s.date) && s.status !== 'cancelled' && !meet.has(s.date)) mk({ id: 's' + i, src: 'session', step: 1, title: 'Workshop: ' + (s.title || 'Session ' + (s.no || '')), start: s.date, end: s.date, done: s.status === 'completed', time: s.time || '' }); });
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status !== 'Done' && D(a.due) && (!cust() || a.side === 'customer')) mk({ id: 'a' + a.id, src: 'action', kind: 'ghost', step: -1, title: a.text || 'Action', start: a.due, end: a.due, late: a.due < V.today(), who: a.owner }); });
    if (!cust() && I().ready(['signoff'])) I().list('signoff').forEach(x => { if (x.status !== 'signed' && D(x.due)) mk({ id: 'g' + x.id, src: 'signoff', step: SO_STEP[x.id] != null ? SO_STEP[x.id] : -1, mark: '◆ ', title: ({ brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' })[x.id] || 'Sign-off', start: x.due, end: x.due, late: x.due < V.today() }); });
    if (!cust() && I().ready(['cal'])) I().list('cal').forEach(x => { if (D(x.date)) mk({ id: 'c' + x.id, src: 'cal', kind: 'mine', step: -1, title: x.title || 'Reminder', start: x.date, end: D(x.end) && x.end >= x.date ? x.end : x.date, time: x.time || '', done: !!x.done, item: x }); });
    const q = (c.q || '').trim().toLowerCase(); const list = out.filter(e => !c.hide.includes(e.key) && (!q || e.title.toLowerCase().includes(q)));
    cache = {}; list.forEach(e => { cache[e.id] = e; }); return list.sort((a, b) => a.start.localeCompare(b.start) || (b.end > b.start) - (a.end > a.start) || (a.time || '99').localeCompare(b.time || '99') || a.title.localeCompare(b.title));
  }
  const on = (evs, d) => evs.filter(e => e.start <= d && e.end >= d);
  const sty = e => `--a:${e.a};--t:${e.t};--g:${e.g || e.a};`;
  const label = e => (e.mark || '') + (e.time ? e.time + ' ' : '') + e.title;
  const phaseName = e => (e.ph >= 0 ? PHASES[e.ph][0] : e.grp || (e.kind === 'ghost' ? 'Action due' : e.kind === 'mine' ? 'Your reminder' : 'Plan'));
  const stepName = e => (e.step >= 0 && steps[e.step] ? 'Step ' + (e.step + 1) + ' · ' + steps[e.step].title : phaseName(e));
  const cls = e => `cal-ev${e.kind ? ' k-' + e.kind : ''}${e.done ? ' done' : ''}${e.late ? ' late' : ''}`;

  function monthGrid(evs, anchor) {
    const first = anchor.slice(0, 8) + '01'; const ws0 = monday(first); const last = add(addMonths(first, 1), -1); const weeks = Math.ceil((dif(ws0, last) + 1) / 7); const today = V.today(); const MAXL = 3; let h = '';
    for (let w = 0; w < weeks; w++) {
      const ws = add(ws0, 7 * w); const we = add(ws, 6); const segs = evs.filter(e => e.start <= we && e.end >= ws).map(e => { const a = e.start > ws ? e.start : ws, b = e.end < we ? e.end : we; return { e, col: dif(ws, a) + 1, span: dif(a, b) + 1, l: e.start < ws, r: e.end > we }; }).sort((x, y) => x.col - y.col || y.span - x.span);
      const lanes = []; segs.forEach(s => { let k = 0; while (lanes[k] !== undefined && lanes[k] >= s.col) k++; lanes[k] = s.col + s.span - 1; s.lane = k; }); const hid = Array(8).fill(0); segs.filter(s => s.lane >= MAXL).forEach(s => { for (let c = s.col; c < s.col + s.span; c++) hid[c]++; });
      const cells = Array.from({ length: 7 }, (_, i) => add(ws, i));
      h += `<div class="cal-wk"><div class="cal-bg">${cells.map(d => `<div class="cal-c${d.slice(0, 7) !== first.slice(0, 7) ? ' out' : ''}${d === today ? ' today' : ''}${d === anchor ? ' sel' : ''}${dow(d) > 4 ? ' we' : ''}"></div>`).join('')}</div>
        <div class="cal-fg" style="grid-template-rows:32px repeat(${MAXL + 1},26px)">${cells.map((d, i) => `<div class="cal-n" style="grid-column:${i + 1};grid-row:1"><button type="button" class="${d === today ? 'today' : ''}" data-act="calDay" data-d="${d}" aria-label="${V.fmtDate(d)}">${d.slice(8) === '01' ? MONTHS[+d.slice(5, 7) - 1].slice(0, 3) + ' ' : ''}${+d.slice(8)}</button>${canEdit() ? `<button type="button" class="cal-add" data-act="calAdd" data-d="${d}" aria-label="Add a reminder on ${V.fmtDate(d)}">+</button>` : ''}</div>`).join('')}
        ${segs.filter(s => s.lane < MAXL).map(s => `<button type="button" class="${cls(s.e)}${s.l ? ' cl' : ''}${s.r ? ' cr' : ''}" style="grid-column:${s.col}/span ${s.span};grid-row:${s.lane + 2};${sty(s.e)}" data-act="calOpen" data-id="${esc(s.e.id)}" title="${esc(s.e.title + ' · ' + stepName(s.e))}">${s.e.done ? '✓ ' : s.e.late ? '! ' : ''}${esc(label(s.e))}</button>`).join('')}
        ${hid.map((n, c) => (n ? `<button type="button" class="cal-more" style="grid-column:${c};grid-row:${MAXL + 2}" data-act="calDay" data-d="${cells[c - 1]}">+${n} more</button>` : '')).join('')}</div></div>`;
    }
    return `<div class="cal-head">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>${h}`;
  }
  const chip = e => `<button type="button" class="${cls(e).replace('cal-ev', 'cal-chip')}" style="${sty(e)}" data-act="calOpen" data-id="${esc(e.id)}" title="${esc(stepName(e))}">${e.done ? '✓ ' : e.late ? '! ' : ''}${esc(label(e))}</button>`;
  function weekGrid(evs, anchor) { const ws = monday(anchor); const today = V.today();
    return `<div class="cal-weekv">${Array.from({ length: 7 }, (_, i) => { const d = add(ws, i); const l = on(evs, d); return `<div class="cal-col${d === today ? ' today' : ''}${dow(d) > 4 ? ' we' : ''}"><button type="button" class="cal-ch" data-act="calDay" data-d="${d}"><span>${DAYS[i]}</span><b>${+d.slice(8)}</b></button><div class="cal-cb">${l.map(chip).join('') || '<span class="cal-none">Nothing</span>'}${canEdit() ? `<button type="button" class="cal-addrow" data-act="calAdd" data-d="${d}">+ Add</button>` : ''}</div></div>`; }).join('')}</div>`; }
  function dayList(evs, d) { const l = on(evs, d); const today = V.today();
    return `<div class="cal-dayv"><h3>${V.fmtDate(d)}${d === today ? ' <span class="cal-pill">Today</span>' : ''}</h3>${l.length ? l.map(e => { const r = e.r || {}; const pct = r.status === 'Done' ? 100 : Math.max(0, Math.min(100, Number(r.pct) || 0));
      return `<button type="button" class="cal-row${e.done ? ' done' : ''}" style="${sty(e)}" data-act="calOpen" data-id="${esc(e.id)}"><i class="cal-bar-c"></i><span class="cal-rb"><b>${e.done ? '✓ ' : e.late ? '<em class="cal-late">Behind schedule</em> ' : ''}${esc(label(e))}</b><small>${esc(stepName(e))}${e.end > e.start ? ' · ' + V.fmtDate(e.start) + ' to ' + V.fmtDate(e.end) : ''}${r.owner ? ' · ' + esc(r.owner) : ''}${e.who ? ' · ' + esc(e.who) : ''}${r.status ? ' · ' + esc(r.status) : ''}</small>${e.src === 'plan' ? `<span class="cal-prog" role="img" aria-label="${pct}% complete"><i style="width:${pct}%"></i></span>` : ''}</span></button>`; }).join('') : '<p class="muted">Nothing is planned for this day.</p>'}${canEdit() ? `<button class="btn" data-act="calAdd" data-d="${d}">Add a reminder or event</button>` : ''}</div>`; }
  const dots = (evs, d) => [...new Set(on(evs, d).map(e => e.a))].slice(0, 3).map(c => `<i style="background:${c}"></i>`).join('');
  function mini(evs, month, sel) { const first = month.slice(0, 8) + '01'; const ws0 = monday(first); const weeks = Math.ceil((dif(ws0, add(addMonths(first, 1), -1)) + 1) / 7); const today = V.today();
    return `<div class="cal-mini"><button type="button" class="cal-mt" data-act="calMonth" data-d="${first}">${MONTHS[+first.slice(5, 7) - 1]}</button><div class="cal-mh">${DAYS.map(d => `<span>${d[0]}</span>`).join('')}</div>${Array.from({ length: weeks * 7 }, (_, i) => { const d = add(ws0, i); const o = d.slice(0, 7) !== first.slice(0, 7); return `<button type="button" class="${o ? 'o ' : ''}${d === today ? 't ' : ''}${d === sel ? 's' : ''}" data-act="calDay" data-d="${d}" aria-label="${V.fmtDate(d)}"${o ? ' tabindex="-1"' : ''}><span>${+d.slice(8)}</span><em>${o ? '' : dots(evs, d)}</em></button>`; }).join('')}</div>`; }
  const titleOf = c => { const d = c.date; return c.mode === 'year' ? d.slice(0, 4) : c.mode === 'month' ? MONTHS[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : c.mode === 'week' ? V.fmtDate(monday(d)) + ' to ' + V.fmtDate(add(monday(d), 6)) : V.fmtDate(d); };

  // the plan in four phases: each card is one phase with its dates and how many plan items it holds; click to jump there. No overlapping bars, no twelve colours.
  function phaseStrip() { const cur = V.phaseNow ? V.phaseNow().cur : -1; const curP = cur >= 0 ? phaseOf(cur) : -1; const td = F.doc('plan_struct') || {}; const rows = (td.rows || []).filter(r => !r.isPhase && D(r.start));
    const cards = PHASES.map((p, k) => { const ss = steps.filter(x => x.i >= p[1] && x.i < p[2] && x.start); const a = ss.reduce((m, x) => (!m || x.start < m ? x.start : m), ''); const z = ss.reduce((m, x) => { const e = x.end || x.start; return !m || e > m ? e : m; }, ''); const n = rows.filter(r => { const s = V.planStepOf ? V.planStepOf(r) : -1; return s >= p[1] && s < p[2]; }).length;
      return `<button type="button" class="cal-ph${k === curP ? ' cur' : ''}${a ? '' : ' none'}" style="--a:${p[3]};--t:${p[4]};--g:${p[5]}" ${a ? `data-act="calJump" data-d="${a}"` : 'disabled'} title="${esc(p[0])}${a ? ': ' + esc(V.fmtDate(a)) + (z > a ? ' to ' + esc(V.fmtDate(z)) : '') : ': no dated plan items'}"><span class="cal-pn">${esc(p[0])}</span><span class="cal-pd">${a ? esc(V.fmtDate(a)) + (z > a ? ' – ' + esc(V.fmtDate(z)) : '') : 'No dates yet'}</span><span class="cal-pc">${n} plan item${n === 1 ? '' : 's'}${k === curP ? ' · now' : ''}</span></button>`; });
    return `<div class="cal-phs" role="group" aria-label="Plan phases">${cards.join('')}</div>`; }
  function picker(c) { const y = c.pickYear || +c.date.slice(0, 4); const cm = +c.date.slice(5, 7), cy = +c.date.slice(0, 4);
    return `<div class="cal-pop" role="dialog" aria-label="Go to a month or year"><div class="cal-py"><button type="button" data-act="calPickYear" data-s="-1" aria-label="Previous year">‹</button><b>${y}</b><button type="button" data-act="calPickYear" data-s="1" aria-label="Next year">›</button></div>
      <div class="cal-pm">${MONTHS.map((m, i) => `<button type="button" class="${y === cy && i + 1 === cm ? 'on' : ''}" data-act="calPickMonth" data-y="${y}" data-m="${i + 1}">${m.slice(0, 3)}</button>`).join('')}</div>
      <label class="cal-pd2">Go to a date<input type="date" value="${esc(c.date)}" data-change="calGoto"></label></div><button type="button" class="cal-scrim" data-act="calPick" aria-label="Close"></button>`; }

  V.planCalendar = { html() {
    const c = st(); const need = ['action', 'signoff'].concat(cust() ? [] : ['cal']); if (!I().ready(need) && !asked[need.join()]) { asked[need.join()] = 1; I().load(need).then(() => V.render()); }
    const evs = events();
    const rows = PHASES.map((p, k) => ({ key: 'p' + k, name: p[0], sw: `<i style="background:${p[3]}"></i>` })).concat([{ key: 'other', name: 'Other plan items', sw: `<i style="background:${OTHER.a}"></i>` }, { key: 'action', name: 'Actions due', sw: '<i class="g"></i>' }].concat(cust() ? [] : [{ key: 'mine', name: 'My reminders and events', sw: '<i class="m"></i>' }]));
    const hid = c.hide.filter(k => rows.some(r => r.key === k)).length;
    const fpop = c.filt ? `<div class="cal-pop cal-fp" role="dialog" aria-label="Choose what the calendar shows"><div class="cal-fh"><b>Show on the calendar</b><button type="button" class="cal-link" data-act="calAll">Show all</button></div>${rows.map(r => `<label class="cal-fi${c.hide.includes(r.key) ? ' off' : ''}"><input type="checkbox" data-change="calType" data-t="${r.key}"${c.hide.includes(r.key) ? '' : ' checked'}>${r.sw}<span>${esc(r.name)}</span></label>`).join('')}</div><button type="button" class="cal-scrim" data-act="calFilter" aria-label="Close"></button>` : '';
    const filt = `<div class="cal-tw cal-ft"><button type="button" class="cal-fb${hid ? ' on' : ''}" data-act="calFilter" aria-haspopup="dialog" aria-expanded="${!!c.filt}">Filter${hid ? ' · ' + hid + ' hidden' : ''}<span aria-hidden="true">▾</span></button>${fpop}</div>`;
    const bar = `<div class="cal-hd"><div class="cal-bar"><div class="cal-nav"><button type="button" data-act="calStep" data-s="-1" aria-label="Previous" title="Previous (left arrow)">‹</button><button type="button" data-act="calStep" data-s="1" aria-label="Next" title="Next (right arrow)">›</button></div>
      <div class="cal-tw"><button type="button" class="cal-title" data-act="calPick" aria-haspopup="dialog" aria-expanded="${!!c.pick}" title="Pick a month or year">${esc(titleOf(c))}<span aria-hidden="true">▾</span></button>${c.pick ? picker(c) : ''}</div>
      <button type="button" class="cal-today" data-act="calToday" title="Today (T)">Today</button><span class="cal-gap"></span>
      <div class="cal-seg" role="tablist">${['day', 'week', 'month', 'year'].map(m => `<button type="button" role="tab" aria-selected="${c.mode === m}" class="${c.mode === m ? 'on' : ''}" data-act="calMode" data-m="${m}" title="${m[0].toUpperCase() + m.slice(1)} (${m[0].toUpperCase()})">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      ${filt}<input class="cal-q" type="search" placeholder="Search" aria-label="Search the calendar" value="${esc(c.q)}" data-change="calSearch">${canEdit() ? '<button class="cal-new" data-act="calAdd" title="New reminder (N)">+ Reminder</button>' : ''}</div></div>`;
    const body = c.mode === 'month' ? monthGrid(evs, c.date) : c.mode === 'week' ? weekGrid(evs, c.date) : c.mode === 'day' ? dayList(evs, c.date) : `<div class="cal-year">${Array.from({ length: 12 }, (_, m) => mini(evs, c.date.slice(0, 4) + '-' + String(m + 1).padStart(2, '0') + '-01', c.date)).join('')}</div>`;
    const none = !evs.length && !(F.doc('plan_struct') || {}).rows ? '<div class="cal-note">There is no dated plan yet, so only your own reminders will show. Import the plan in the Workbook tab, then it appears here.</div>' : '';
    const anim = c.anim; c.anim = false;
    return `<div class="cal"><div class="cal-main">${bar}<div class="cal-in-wrap">${phaseStrip()}${none}<div class="cal-body${anim ? ' cal-in' : ''}">${body}</div></div></div></div>`;
  } };

  const go = () => { st().anim = true; V.render(); };
  ACT.calStep = a => { const c = st(), n = Number(a.getAttribute('data-s')); c.date = c.mode === 'day' ? add(c.date, n) : c.mode === 'week' ? add(c.date, 7 * n) : c.mode === 'month' ? addMonths(c.date, n) : addMonths(c.date, 12 * n); go(); };
  ACT.calToday = () => { st().date = V.today(); go(); };
  ACT.calMode = a => { st().mode = a.getAttribute('data-m'); go(); };
  ACT.calDay = a => { const c = st(); c.date = a.getAttribute('data-d'); if (!a.closest || !a.closest('.cal-side')) c.mode = 'day'; go(); };
  ACT.calJump = a => { const c = st(); c.date = a.getAttribute('data-d'); if (c.mode === 'day' || c.mode === 'year') c.mode = 'month'; go(); };
  ACT.calMonth = a => { const c = st(); c.date = a.getAttribute('data-d'); c.mode = 'month'; go(); };
  ACT.calType = el => { const c = st(), t = el.getAttribute('data-t'); c.hide = el.checked ? c.hide.filter(x => x !== t) : c.hide.concat(t); V.render(); };
  ACT.calPick = () => { const c = st(); c.pick = !c.pick; c.filt = false; c.pickYear = +c.date.slice(0, 4); V.render(); };
  ACT.calPickYear = a => { const c = st(); c.pickYear = (c.pickYear || +c.date.slice(0, 4)) + Number(a.getAttribute('data-s')); V.render(); };
  ACT.calPickMonth = a => { const c = st(); c.date = a.getAttribute('data-y') + '-' + String(a.getAttribute('data-m')).padStart(2, '0') + '-01'; if (c.mode !== 'year') c.mode = 'month'; c.pick = false; go(); };
  ACT.calGoto = el => { const d = D(el.value); if (!d) return; const c = st(); c.date = d; c.pick = false; go(); };
  ACT.calFilter = () => { const c = st(); c.filt = !c.filt; c.pick = false; V.render(); };
  ACT.calAll = () => { st().hide = []; V.render(); };
  ACT.calSearch = el => { st().q = el.value; V.render(); };
  ACT.calOpen = a => { const e = cache[a.getAttribute('data-id')]; if (!e) return; if (e.src === 'cal') return form(e.item);
    const r = e.r || {}; const rows = [['When', V.fmtDate(e.start) + (e.end > e.start ? ' to ' + V.fmtDate(e.end) : '') + (e.time ? ' · ' + e.time : '')], r.owner ? ['Owner', r.owner] : null, r.status ? ['Status', r.status + (Number(r.pct) ? ' · ' + r.pct + '%' : '')] : null, e.who ? ['Owner', e.who] : null, e.late ? ['Note', 'Past its date and not done'] : null].filter(Boolean);
    const go2 = e.src === 'plan' ? 'plan' : e.src === 'action' || e.src === 'signoff' ? 'governance' : 'planner';
    drawer(e.title, `<div class="cal-dh" style="${sty(e)}"><i></i><span>${esc(stepName(e))}</span></div><dl class="cal-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="xs muted">This comes from the project ${e.src === 'plan' ? 'plan' : e.src === 'session' ? 'workshop schedule' : e.src === 'action' ? 'actions' : 'sign-offs'}. Change it there and the calendar follows.</p>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button><button class="btn primary" data-act="calGo" data-v="${go2}">Open ${e.src === 'plan' ? 'the plan' : e.src === 'action' || e.src === 'signoff' ? 'Governance' : 'the schedule'}</button>`); };
  ACT.calGo = a => { closeDrawer(); const v = a.getAttribute('data-v'); if (v === 'plan') S.ui.planTab = 'tl'; V.go(v); };
  const KIND = { reminder: 'Reminder', event: 'Event', deadline: 'Deadline' };
  function form(x) { if (!canEdit()) return; x = x || {}; const id = x.id || '';
    drawer(id ? 'Edit' : 'Add to the calendar', `<label class="f" for="cl_t">Title</label><input id="cl_t" maxlength="160" value="${esc(x.title || '')}" placeholder="What needs to happen">
      <div class="grid g2"><div><label class="f" for="cl_k">Type</label><select id="cl_k">${Object.keys(KIND).map(k => `<option value="${k}"${(x.kind || 'reminder') === k ? ' selected' : ''}>${KIND[k]}</option>`).join('')}</select></div><div><label class="f" for="cl_tm">Time (optional)</label><input id="cl_tm" type="time" value="${esc(x.time || '')}"></div></div>
      <div class="grid g2"><div><label class="f" for="cl_d">Date</label><input id="cl_d" type="date" value="${esc(x.date || V.today())}"></div><div><label class="f" for="cl_e">Until (optional)</label><input id="cl_e" type="date" value="${esc(x.end || '')}"></div></div>
      <label class="f" for="cl_n">Note</label><textarea id="cl_n" rows="3" maxlength="1000">${esc(x.note || '')}</textarea>
      <label class="chk" style="display:flex;gap:8px;margin-top:10px"><input type="checkbox" id="cl_r"${x.remind === false ? '' : ' checked'}> Show it in my notifications on the day</label>${id ? `<label class="chk" style="display:flex;gap:8px;margin-top:6px"><input type="checkbox" id="cl_x"${x.done ? ' checked' : ''}> Done</label>` : ''}
      <p class="xs muted" style="margin-top:10px">Reminders are for the project team only. Customers do not see them.</p>`,
      `${id ? `<button class="btn danger" data-act="calDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="calSave" data-id="${esc(id)}">Save</button>`); }
  ACT.calAdd = a => { const d = a && a.getAttribute && a.getAttribute('data-d'); form({ date: d || st().date }); };
  ACT.calSave = a => V.busy(a, async () => { const v = k => String((document.getElementById(k) || {}).value || '').trim(); const id = a.getAttribute('data-id'); if (!v('cl_t')) { toast('Give it a title', 4000, true); return; } if (!D(v('cl_d'))) { toast('Choose a date', 4000, true); return; } if (D(v('cl_e')) && v('cl_e') < v('cl_d')) { toast('The end date is before the start date', 5000, true); return; }
    const old = id ? I().get('cal', id) : null; await I().put('cal', id || I().uid('cal'), Object.assign({}, old || {}, { title: v('cl_t'), kind: v('cl_k'), date: v('cl_d'), end: D(v('cl_e')), time: v('cl_tm'), note: v('cl_n'), remind: document.getElementById('cl_r').checked, done: id ? document.getElementById('cl_x').checked : false })); closeDrawer(); toast('Saved'); V.render(); });
  ACT.calDel = a => V.busy(a, async () => { const id = a.getAttribute('data-id'); if (!(await confirmDialog('Delete', 'Delete this reminder?', 'Delete', true))) return; await I().del('cal', id); closeDrawer(); V.render(); });
  // keyboard: arrows, T, N and D / W / M / Y, only when the calendar is showing and nothing is being typed
  document.addEventListener('keydown', e => { if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !document.querySelector('.cal')) return; const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return; const c = st(); const k = e.key.toLowerCase();
    if (e.key === 'Escape' && (c.pick || c.filt)) { c.pick = false; c.filt = false; V.render(); return; } const fire = (act, attrs) => ACT[act]({ getAttribute: n => (attrs || {})[n] || null, closest: () => null });
    if (e.key === 'ArrowLeft') { e.preventDefault(); fire('calStep', { 'data-s': '-1' }); } else if (e.key === 'ArrowRight') { e.preventDefault(); fire('calStep', { 'data-s': '1' }); } else if (k === 't') fire('calToday'); else if (k === 'n' && canEdit()) { e.preventDefault(); fire('calAdd'); } else if (k.length === 1 && 'dwmy'.includes(k)) fire('calMode', { 'data-m': { d: 'day', w: 'week', m: 'month', y: 'year' }[k] }); });
  // for the notification bell: the team's reminders that are due today or earlier and not done
  V.calDue = () => { if (cust()) return []; if (!I().ready(['cal'])) { if (!asked.due) { asked.due = 1; I().load(['cal']); } return []; } return I().list('cal').filter(x => x.remind !== false && !x.done && D(x.date) && x.date <= V.today() && (D(x.end) || x.date) >= add(V.today(), -7)); };
})(typeof window !== 'undefined' ? window : globalThis);
