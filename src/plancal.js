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
  const PHASES = [['Discover and define', 0, 4, '#1570EF', '#EEF4FF', '#5FA0F7'], ['Build and validate', 4, 7, '#0E9384', '#E6F7F4', '#5CC7B8'], ['Launch', 7, 10, '#E8710A', '#FFF4E8', '#F7A35C'], ['Hand over', 10, 12, '#12A35B', '#EAF7EF', '#6BCB94']];   // the four Facilio colours: blue, navy, pink and sky; each with a pale tint and a second stop for the few gradients (edge, progress)
  const OTHER = { a: '#5B6B99', t: '#EEF2F8', g: '#8C9AC2' };
  // light, energetic redesign (user, 23 Nov 2026): colour says what KIND of item it is; the phase strip above still shows the phases
  const CATS = [['meeting', 'Meetings and workshops', '#E8710A', '#FFF4E8'], ['milestone', 'Milestones and sign-offs', '#B7791F', '#FFF6DB'], ['uat', 'UAT', '#0E9384', '#E6F7F4'], ['training', 'Training', '#12A35B', '#EAF7EF'],
    ['activity', 'Plan activities', '#1570EF', '#EEF4FF'], ['deadline', 'Deadlines (tasks and actions)', '#D92D20', '#FEF0EF'], ['mine', 'My reminders and events', '#64748B', '#F1F3F6']];
  const catOf = e => (e.src === 'cal' ? 'mine' : e.src === 'action' || e.src === 'task' ? 'deadline' : e.src === 'session' || e.step === 1 ? 'meeting' : e.src === 'signoff' || [2, 8, 11].includes(e.step) || /go-?live|sign-?off|milestone/i.test(e.title) ? 'milestone' : e.step >= 5 && e.step <= 8 ? 'uat' : e.step === 9 ? 'training' : 'activity');
  const phaseOf = i => PHASES.findIndex(p => i >= p[1] && i < p[2]);
  const SO_STEP = { brd: 2, uat: 8, golive: 11 };
  const st = () => { const c = S.ui.cal = S.ui.cal || { mode: 'month', date: V.today(), hide: [], q: '' }; return c; };
  let cache = {}; const asked = {}; let steps = [];

  function events() {
    const out = []; const c = st(); const td = F.doc('plan_struct') || {}; const meet = new Set(); steps = V.planSteps ? V.planSteps() : [];
    const mk = e => { e.ph = e.step >= 0 ? phaseOf(e.step) : -1; const k = CATS.find(x => x[0] === catOf(e)); e.a = k[2]; e.t = k[3]; e.g = k[2]; e.key = k[0]; out.push(e); };
    (td.rows || []).filter(r => !r.isPhase && D(r.start)).forEach((r, i) => { const end = D(r.end) && r.end >= r.start ? r.end : r.start; const step = V.planStepOf ? V.planStepOf(r) : -1; if (step === 1) meet.add(r.start); mk({ id: 'p' + i, src: 'plan', step, grp: String(r.phase || '').trim(), title: r.title || 'Task', start: r.start, end, done: r.status === 'Done', late: r.status !== 'Done' && end < V.today(), r }); });
    const sess = cust() ? ((F.doc('schedule_published') || {}).sessions || []) : ((F.doc('planner') || {}).sessions || []);
    sess.forEach((s, i) => { if (D(s.date) && s.status !== 'cancelled' && !meet.has(s.date)) mk({ id: 's' + i, src: 'session', step: 1, title: 'Workshop: ' + (s.title || 'Session ' + (s.no || '')), start: s.date, end: s.date, done: s.status === 'completed', time: s.time || '' }); });
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status !== 'Done' && D(a.due) && (!cust() || a.side === 'customer')) mk({ id: 'a' + a.id, src: 'action', kind: 'ghost', step: -1, title: a.text || 'Action', start: a.due, end: a.due, late: a.due < V.today(), who: a.owner, side: a.side }); });
    if (!cust() && I().ready(['signoff'])) I().list('signoff').forEach(x => { if (x.status !== 'signed' && D(x.due)) mk({ id: 'g' + x.id, src: 'signoff', step: SO_STEP[x.id] != null ? SO_STEP[x.id] : -1, mark: '◆ ', title: ({ brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' })[x.id] || 'Sign-off', start: x.due, end: x.due, late: x.due < V.today() }); });
    if (!cust() && I().ready(['task'])) I().list('task').forEach(t => { const d = D(t.due) || D(t.eta); if (d && !['Done', 'Cancelled'].includes(t.status)) mk({ id: 't' + t.id, src: 'task', kind: 'ghost', step: -1, title: t.title || 'Task', start: d, end: d, late: d < V.today(), who: t.owner, tid: t.id }); });
    if (!cust() && I().ready(['cal'])) I().list('cal').forEach(x => { if (D(x.date)) mk({ id: 'c' + x.id, src: 'cal', kind: 'mine', step: -1, title: x.title || 'Reminder', start: x.date, end: D(x.end) && x.end >= x.date ? x.end : x.date, time: x.time || '', done: !!x.done, item: x }); });
    const q = (c.q || '').trim().toLowerCase(); const list = out.filter(e => !c.hide.includes(e.key) && (!c.own || [c.own, 'b'].includes(ownOf(e))) && (!q || e.title.toLowerCase().includes(q)));
    cache = {}; list.forEach(e => { cache[e.id] = e; }); return list.sort((a, b) => a.start.localeCompare(b.start) || (b.end > b.start) - (a.end > a.start) || (a.time || '99').localeCompare(b.time || '99') || a.title.localeCompare(b.title));
  }
  function ownOf(e) { if (e.src === 'plan') { const o = String((e.r || {}).owner || ''); return /^both$/i.test(o) ? 'b' : /^customer$|\(customer/i.test(o) ? 'c' : 'f'; } if (e.src === 'action') return e.side === 'customer' ? 'c' : 'f'; if (e.src === 'signoff') return 'c'; if (e.src === 'session') return 'b'; return 'f'; }
  const dragOk = e => canEdit() && (e.src === 'plan' || e.src === 'cal');
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
      h += `<div class="cal-wk" data-ws="${ws}"><div class="cal-bg">${cells.map(d => `<div class="cal-c${d.slice(0, 7) !== first.slice(0, 7) ? ' out' : ''}${d === today ? ' today' : ''}${d === anchor ? ' sel' : ''}${dow(d) > 4 ? ' we' : ''}"></div>`).join('')}</div>
        <div class="cal-fg" style="grid-template-rows:32px repeat(${MAXL + 1},26px)">${cells.map((d, i) => `<div class="cal-n" style="grid-column:${i + 1};grid-row:1"><button type="button" class="${d === today ? 'today' : ''}" data-act="calDay" data-d="${d}" aria-label="${V.fmtDate(d)}">${d.slice(8) === '01' ? MONTHS[+d.slice(5, 7) - 1].slice(0, 3) + ' ' : ''}${+d.slice(8)}</button>${canEdit() ? `<button type="button" class="cal-add" data-act="calAdd" data-d="${d}" aria-label="Add a reminder on ${V.fmtDate(d)}">+</button>` : ''}</div>`).join('')}
        ${segs.filter(s => s.lane < MAXL).map(s => `<button type="button" class="${cls(s.e)}${s.l ? ' cl' : ''}${s.r ? ' cr' : ''}" style="grid-column:${s.col}/span ${s.span};grid-row:${s.lane + 2};${sty(s.e)}" data-act="calOpen" data-id="${esc(s.e.id)}" aria-label="${esc(s.e.title + ' · ' + stepName(s.e))}"${dragOk(s.e) ? ' draggable="true"' : ''}>${s.e.done ? '✓ ' : s.e.late ? '! ' : ''}${esc(label(s.e))}</button>`).join('')}
        ${hid.map((n, c) => (n ? `<button type="button" class="cal-more" style="grid-column:${c};grid-row:${MAXL + 2}" data-act="calDay" data-d="${cells[c - 1]}">+${n} more</button>` : '')).join('')}</div></div>`;
    }
    return `<div class="cal-head">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>${h}`;
  }
  const chip = e => `<button type="button" class="${cls(e).replace('cal-ev', 'cal-chip')}" style="${sty(e)}" data-act="calOpen" data-id="${esc(e.id)}" aria-label="${esc(e.title + ' · ' + stepName(e))}">${e.done ? '✓ ' : e.late ? '! ' : ''}${esc(label(e))}</button>`;
  function weekGrid(evs, anchor) { const ws = monday(anchor); const today = V.today();
    return `<div class="cal-weekv">${Array.from({ length: 7 }, (_, i) => { const d = add(ws, i); const l = on(evs, d); return `<div class="cal-col${d === today ? ' today' : ''}${dow(d) > 4 ? ' we' : ''}"><button type="button" class="cal-ch" data-act="calDay" data-d="${d}"><span>${DAYS[i]}</span><b>${+d.slice(8)}</b></button><div class="cal-cb">${l.map(chip).join('') || '<span class="cal-none">Nothing</span>'}${canEdit() ? `<button type="button" class="cal-addrow" data-act="calAdd" data-d="${d}">+ Add</button>` : ''}</div></div>`; }).join('')}</div>`; }
  const rowOf = e => { const r = e.r || {}; const pct = r.status === 'Done' ? 100 : Math.max(0, Math.min(100, Number(r.pct) || 0));
      return `<button type="button" class="cal-row${e.done ? ' done' : ''}" style="${sty(e)}" data-act="calOpen" data-id="${esc(e.id)}"><i class="cal-bar-c"></i><span class="cal-rb"><b>${e.done ? '✓ ' : e.late ? '<em class="cal-late">Behind schedule</em> ' : ''}${esc(label(e))}</b><small>${esc(stepName(e))}${e.end > e.start ? ' · ' + V.fmtDate(e.start) + ' to ' + V.fmtDate(e.end) : ''}${r.owner ? ' · ' + esc(r.owner) : ''}${e.who ? ' · ' + esc(e.who) : ''}${r.status ? ' · ' + esc(r.status) : ''}</small>${e.src === 'plan' ? `<span class="cal-prog" role="img" aria-label="${pct}% complete"><i style="width:${pct}%"></i></span>` : ''}</span></button>`; };
  // agenda: the next six weeks as one dated list, each item on its first day (and anything already running on the first day)
  function agenda(evs, from) { const today = V.today(); let h = '';
    for (let i = 0; i < 42; i++) { const d = add(from, i); const l = evs.filter(e => e.start === d || (i === 0 && e.start < d && e.end >= d)); if (!l.length) continue;
      h += `<section class="cal-ag-d${d === today ? ' today' : ''}"><h4><b>${DAYS[dow(d)]} ${+d.slice(8)}</b><span>${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}</span>${d === today ? '<span class="cal-pill">Today</span>' : ''}</h4>${l.map(rowOf).join('')}</section>`; }
    return `<div class="cal-agenda">${h || '<p class="muted">Nothing is planned in the six weeks from ' + esc(V.fmtDate(from)) + '.</p>'}</div>`; }
  function dayList(evs, d) { const l = on(evs, d); const today = V.today();
    return `<div class="cal-dayv"><h3>${V.fmtDate(d)}${d === today ? ' <span class="cal-pill">Today</span>' : ''}</h3>${l.length ? l.map(rowOf).join('') : '<p class="muted">Nothing is planned for this day.</p>'}${canEdit() ? `<button class="btn" data-act="calAdd" data-d="${d}">Add a reminder or event</button>` : ''}</div>`; }
  const dots = (evs, d) => [...new Set(on(evs, d).map(e => e.a))].slice(0, 3).map(c => `<i style="background:${c}"></i>`).join('');
  function mini(evs, month, sel) { const first = month.slice(0, 8) + '01'; const ws0 = monday(first); const weeks = Math.ceil((dif(ws0, add(addMonths(first, 1), -1)) + 1) / 7); const today = V.today();
    return `<div class="cal-mini"><button type="button" class="cal-mt" data-act="calMonth" data-d="${first}">${MONTHS[+first.slice(5, 7) - 1]}</button><div class="cal-mh">${DAYS.map(d => `<span>${d[0]}</span>`).join('')}</div>${Array.from({ length: weeks * 7 }, (_, i) => { const d = add(ws0, i); const o = d.slice(0, 7) !== first.slice(0, 7); return `<button type="button" class="${o ? 'o ' : ''}${d === today ? 't ' : ''}${d === sel ? 's' : ''}" data-act="calDay" data-d="${d}" aria-label="${V.fmtDate(d)}"${o ? ' tabindex="-1"' : ''}><span>${+d.slice(8)}</span><em>${o ? '' : dots(evs, d)}</em></button>`; }).join('')}</div>`; }
  const titleOf = c => { const d = c.date; return c.mode === 'agenda' ? 'From ' + V.fmtDate(d) : c.mode === 'year' ? d.slice(0, 4) : c.mode === 'month' ? MONTHS[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : c.mode === 'week' ? V.fmtDate(monday(d)) + ' to ' + V.fmtDate(add(monday(d), 6)) : V.fmtDate(d); };

  // the plan in four phases: each card is one phase with its dates and how many plan items it holds; click to jump there. No overlapping bars, no twelve colours.
  function phaseStrip() { const cur = V.phaseNow ? V.phaseNow().cur : -1; const curP = cur >= 0 ? phaseOf(cur) : -1; const td = F.doc('plan_struct') || {}; const rows = (td.rows || []).filter(r => !r.isPhase && D(r.start));
    const cards = PHASES.map((p, k) => { const ss = steps.filter(x => x.i >= p[1] && x.i < p[2] && x.start); const a = ss.reduce((m, x) => (!m || x.start < m ? x.start : m), ''); const z = ss.reduce((m, x) => { const e = x.end || x.start; return !m || e > m ? e : m; }, ''); const n = rows.filter(r => { const s = V.planStepOf ? V.planStepOf(r) : -1; return s >= p[1] && s < p[2]; }).length;
      return `<button type="button" class="cal-ph${k === curP ? ' cur' : ''}${a ? '' : ' none'}" style="--a:${p[3]};--t:${p[4]};--g:${p[5]}" ${a ? `data-act="calJump" data-d="${a}"` : 'disabled'} title="${esc(p[0])}${a ? ': ' + esc(V.fmtDate(a)) + (z > a ? ' to ' + esc(V.fmtDate(z)) : '') : ': no dated plan items'}"><span class="cal-pn">${esc(p[0])}</span><span class="cal-pd">${a ? esc(V.fmtDate(a)) + (z > a ? ' – ' + esc(V.fmtDate(z)) : '') : 'No dates yet'}</span><span class="cal-pc">${n} plan item${n === 1 ? '' : 's'}${k === curP ? ' · now' : ''}</span></button>`; });
    return `<div class="cal-phs" role="group" aria-label="Plan phases">${cards.join('')}</div>`; }
  function picker(c) { const y = c.pickYear || +c.date.slice(0, 4); const cm = +c.date.slice(5, 7), cy = +c.date.slice(0, 4);
    return `<div class="cal-pop" role="dialog" aria-label="Go to a month or year"><div class="cal-py"><button type="button" data-act="calPickYear" data-s="-1" aria-label="Previous year">‹</button><b>${y}</b><button type="button" data-act="calPickYear" data-s="1" aria-label="Next year">›</button></div>
      <div class="cal-pm">${MONTHS.map((m, i) => `<button type="button" class="${y === cy && i + 1 === cm ? 'on' : ''}" data-act="calPickMonth" data-y="${y}" data-m="${i + 1}">${m.slice(0, 3)}</button>`).join('')}</div>
      <label class="cal-pd2">Go to a date<input type="date" value="${esc(c.date)}" data-change="calGoto"></label></div><button type="button" class="cal-scrim" data-act="calPick" aria-label="Close"></button>`; }

  const chipRow = (rows, c) => { const cn = String((S.project && S.project.customer) || '').trim().split(/\s+/).slice(0, 2).join(' ') || 'Customer';
    return `<div class="cal-chips" role="group" aria-label="Show on the calendar">${rows.map(r => `<button type="button" class="cal-fchip${c.hide.includes(r.key) ? ' off' : ''}" data-act="calChip" data-t="${r.key}" aria-pressed="${!c.hide.includes(r.key)}">${r.sw}${esc(r.name)}</button>`).join('')}<span class="cal-chips-sep" aria-hidden="true"></span>${[['', 'Everyone'], ['f', 'Facilio'], ['c', cn]].map(([v, l]) => `<button type="button" class="cal-fchip own${(c.own || '') === v ? ' on' : ''}" data-act="calOwn" data-v="${v}" aria-pressed="${(c.own || '') === v}">${esc(l)}</button>`).join('')}</div>`; };
  V.planCalendar = { html() {
    const c = st(); const need = ['action', 'signoff'].concat(cust() ? [] : ['cal', 'task']); if (!I().ready(need) && !asked[need.join()]) { asked[need.join()] = 1; I().load(need).then(() => V.render()); }
    const evs = events();
    const rows = CATS.filter(k => !cust() || k[0] !== 'mine').map(k => ({ key: k[0], name: k[1], sw: `<i style="background:${k[2]}"></i>` }));
    const hid = c.hide.filter(k => rows.some(r => r.key === k)).length;
    const fpop = c.filt ? `<div class="cal-pop cal-fp" role="dialog" aria-label="Choose what the calendar shows"><div class="cal-fh"><b>Show on the calendar</b><button type="button" class="cal-link" data-act="calAll">Show all</button></div>${rows.map(r => `<label class="cal-fi${c.hide.includes(r.key) ? ' off' : ''}"><input type="checkbox" data-change="calType" data-t="${r.key}"${c.hide.includes(r.key) ? '' : ' checked'}>${r.sw}<span>${esc(r.name)}</span></label>`).join('')}</div><button type="button" class="cal-scrim" data-act="calFilter" aria-label="Close"></button>` : '';
    const filt = `<div class="cal-tw cal-ft"><button type="button" class="cal-fb${hid ? ' on' : ''}" data-act="calFilter" aria-haspopup="dialog" aria-expanded="${!!c.filt}">Filter${hid ? ' · ' + hid + ' hidden' : ''}<span aria-hidden="true">▾</span></button>${fpop}</div>`;
    const ai = canEdit() ? `<div class="cal-tw cal-ft"><button type="button" class="cal-fb" data-act="calAi" aria-haspopup="dialog" aria-expanded="${!!c.ai}">AI<span aria-hidden="true">▾</span></button>${c.ai ? `<div class="cal-pop cal-fp" role="dialog" aria-label="AI for this calendar"><div class="cal-fh"><b>Brief for ${esc(titleOf(c))}</b></div><p class="xs muted" style="margin:0 0 8px">What is due, what is behind, what the customer owes and suggested reminders, from the plan, actions and sign-offs. It is a draft: nothing is added to the calendar.</p><button type="button" class="cal-fi cal-aib" data-act="calAiRun"><span>Draft with DeepSeek</span></button><button type="button" class="cal-fi cal-aib" data-act="calAiClaude"><span>Open in Claude</span></button></div><button type="button" class="cal-scrim" data-act="calAi" aria-label="Close"></button>` : ''}</div>` : '';
    const bar = `<div class="cal-hd"><div class="cal-bar"><div class="cal-nav"><button type="button" data-act="calStep" data-s="-1" aria-label="Previous" title="Previous (left arrow)">‹</button><button type="button" data-act="calStep" data-s="1" aria-label="Next" title="Next (right arrow)">›</button></div>
      <div class="cal-tw"><button type="button" class="cal-title" data-act="calPick" aria-haspopup="dialog" aria-expanded="${!!c.pick}" title="Pick a month or year">${esc(titleOf(c))}<span aria-hidden="true">▾</span></button>${c.pick ? picker(c) : ''}</div>
      <button type="button" class="cal-today" data-act="calToday" title="Today (T)">Today</button><span class="cal-gap"></span>
      <div class="cal-seg" role="tablist">${['day', 'week', 'month', 'year', 'agenda'].map(m => `<button type="button" role="tab" aria-selected="${c.mode === m}" class="${c.mode === m ? 'on' : ''}" data-act="calMode" data-m="${m}" title="${m[0].toUpperCase() + m.slice(1)} (${m[0].toUpperCase()})">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      ${filt}${ai}<input class="cal-q" type="search" placeholder="Search" aria-label="Search the calendar" value="${esc(c.q)}" data-change="calSearch">${canEdit() ? '<button class="cal-new" data-act="calAdd" title="New reminder (N)">+ Reminder</button>' : ''}</div></div>`;
    // Month, Week and Day are drawn by FullCalendar (vendor/fullcalendar.min.js, MIT standard bundle) from the same events; the older grids stay as the fallback if it cannot load
    const fcv = FCV[c.mode]; if (fcv && !fcFail) setTimeout(() => mountFc(evs, c), 0);
    const body = fcv && !fcFail ? `<div class="cal-fc" id="calFc" aria-label="Calendar"></div>` : c.mode === 'agenda' ? agenda(evs, c.date) : c.mode === 'month' ? monthGrid(evs, c.date) : c.mode === 'week' ? weekGrid(evs, c.date) : c.mode === 'day' ? dayList(evs, c.date) : `<div class="cal-year">${Array.from({ length: 12 }, (_, m) => mini(evs, c.date.slice(0, 4) + '-' + String(m + 1).padStart(2, '0') + '-01', c.date)).join('')}</div>`;
    const none = !evs.length && !(F.doc('plan_struct') || {}).rows ? '<div class="cal-note">There is no dated plan yet, so only your own reminders will show. Import the plan in the Workbook tab, then it appears here.</div>' : '';
    const anim = c.anim; c.anim = false;
    return `<div class="cal"><div class="cal-main">${bar}<div class="cal-in-wrap">${phaseStrip()}${chipRow(rows, c)}${none}<div class="cal-body${anim ? ' cal-in' : ''}">${body}</div></div></div></div>`;
  } };

  const go = () => { st().anim = true; V.render(); };
  // FullCalendar: our toolbar drives it (mode and date live in S.ui.cal), it only draws; a click opens the same drawer (data-act="calOpen"), a drag calls the same moveBy with Undo
  const FCV = { month: 'dayGridMonth', week: 'timeGridWeek', day: 'timeGridDay' }; let fcFail = false;
  async function mountFc(evs, c) {
    const el = document.getElementById('calFc'); if (!el || el.dataset.on) return; el.dataset.on = '1';
    try { await V.loadScript('vendor/fullcalendar.min.js'); } catch (x) { fcFail = true; V.render(); return; }
    if (!document.body.contains(el) || !root.FullCalendar) return;
    const fc = new root.FullCalendar.Calendar(el, {
      initialView: FCV[c.mode], initialDate: c.date, headerToolbar: false, firstDay: 1, height: 'auto', dayMaxEvents: 3, nowIndicator: true, slotMinTime: '07:00:00', slotMaxTime: '20:00:00', scrollTime: '08:00:00', allDayText: 'All day',
      editable: canEdit(), eventDurationEditable: false, fixedWeekCount: false,
      events: evs.map(e => ({ id: e.id, title: (e.mark || '') + e.title, start: e.time ? e.start + 'T' + e.time : e.start, end: e.time ? undefined : add(e.end, 1), allDay: !e.time, editable: dragOk(e), classNames: ['cal-fcev', 'c-' + e.key].concat(e.done ? ['done'] : [], e.late ? ['late'] : []) })),
      eventDidMount: info => { const e = cache[info.event.id]; if (!e) return; const a = info.el; a.style.setProperty('--a', e.a); a.style.setProperty('--t', e.t); a.setAttribute('data-act', 'calOpen'); a.setAttribute('data-id', e.id); a.setAttribute('role', 'button'); a.setAttribute('tabindex', '0'); a.setAttribute('aria-label', e.title + ' · ' + stepName(e)); },
      eventDrop: info => { const e = cache[info.event.id]; const to = info.event.startStr.slice(0, 10); info.revert(); if (e && to !== e.start) moveBy(e, dif(e.start, to)); },
      dateClick: info => { if (canEdit()) form({ date: info.dateStr.slice(0, 10), time: info.allDay ? '' : info.dateStr.slice(11, 16) }); },
      navLinks: true, navLinkDayClick: d => { const x = st(); x.date = d.toISOString().slice(0, 10); x.mode = 'day'; go(); }
    });
    fc.render();
  }
  ACT.calStep = a => { const c = st(), n = Number(a.getAttribute('data-s')); c.date = c.mode === 'day' ? add(c.date, n) : c.mode === 'week' ? add(c.date, 7 * n) : c.mode === 'month' ? addMonths(c.date, n) : c.mode === 'agenda' ? add(c.date, 42 * n) : addMonths(c.date, 12 * n); go(); };
  ACT.calToday = () => { st().date = V.today(); go(); };
  ACT.calMode = a => { st().mode = a.getAttribute('data-m'); go(); };
  ACT.calDay = a => { const c = st(); c.date = a.getAttribute('data-d'); if (!a.closest || !a.closest('.cal-side')) c.mode = 'day'; go(); };
  ACT.calJump = a => { const c = st(); c.date = a.getAttribute('data-d'); if (c.mode === 'day' || c.mode === 'year') c.mode = 'month'; go(); };
  ACT.calMonth = a => { const c = st(); c.date = a.getAttribute('data-d'); c.mode = 'month'; go(); };
  ACT.calType = el => { const c = st(), t = el.getAttribute('data-t'); c.hide = el.checked ? c.hide.filter(x => x !== t) : c.hide.concat(t); V.render(); };
  ACT.calPick = () => { const c = st(); c.pick = !c.pick; c.filt = false; c.ai = false; c.pickYear = +c.date.slice(0, 4); V.render(); };
  ACT.calPickYear = a => { const c = st(); c.pickYear = (c.pickYear || +c.date.slice(0, 4)) + Number(a.getAttribute('data-s')); V.render(); };
  ACT.calPickMonth = a => { const c = st(); c.date = a.getAttribute('data-y') + '-' + String(a.getAttribute('data-m')).padStart(2, '0') + '-01'; if (c.mode !== 'year') c.mode = 'month'; c.pick = false; go(); };
  ACT.calGoto = el => { const d = D(el.value); if (!d) return; const c = st(); c.date = d; c.pick = false; go(); };
  ACT.calFilter = () => { const c = st(); c.filt = !c.filt; c.pick = false; c.ai = false; V.render(); };
  ACT.calAll = () => { st().hide = []; V.render(); };
  ACT.calChip = a => { const c = st(), t = a.getAttribute('data-t'); c.hide = c.hide.includes(t) ? c.hide.filter(x => x !== t) : c.hide.concat(t); V.render(); };
  ACT.calOwn = a => { st().own = a.getAttribute('data-v') || ''; V.render(); };
  ACT.calAi = () => { const c = st(); c.ai = !c.ai; c.filt = false; c.pick = false; V.render(); };
  // the period on screen, in words the AI task can use
  const periodText = () => { const c = st(); const d = c.date; const a = c.mode === 'day' ? d : c.mode === 'week' ? monday(d) : c.mode === 'month' ? d.slice(0, 8) + '01' : d.slice(0, 4) + '-01-01'; const z = c.mode === 'day' ? d : c.mode === 'week' ? add(monday(d), 6) : c.mode === 'month' ? add(addMonths(d.slice(0, 8) + '01', 1), -1) : d.slice(0, 4) + '-12-31'; return `Period ${a} to ${z} (the ${c.mode} shown on the project calendar). Today is ${V.today()}.`; };
  ACT.calAiRun = a => V.busy(a, async () => { st().ai = false; V.render(); try { const x = await V.aiDoc({ task: 'calendar', instruction: periodText() }, 'Calendar briefing'); await I().load(['ai'], true); toast('Briefing ready for review'); if (V.ACT.aiOpen) V.ACT.aiOpen({ getAttribute: () => x.item.id }); } catch (e) { toast(e.message || 'The AI could not complete this', 6000, true); } });
  ACT.calAiClaude = a => V.busy(a, async () => { st().ai = false; V.render(); const task = 'calendar'; const body = { task, instruction: periodText() };
    await V.claudeHandoff({ title: 'Calendar briefing with Claude', task, url: `/api/projects/${S.project.id}/ai/pack`, body, replyUrl: `/api/projects/${S.project.id}/ai/import`, replyBody: reply => ({ task, content: reply }), expect: { format: 'text', note: 'A short Markdown briefing with the headings the prompt asks for' },
      extra: 'The prompt holds the plan, actions and sign-offs of this project for the period. It runs in your own Claude account. The reply becomes an unapproved draft that a person reviews.', onReply: async r => { await I().load(['ai'], true); toast('Briefing imported for review'); if (V.ACT.aiOpen) V.ACT.aiOpen({ getAttribute: () => r.item.id }); } }); });
  ACT.calSearch = el => { st().q = el.value; V.render(); };
  ACT.calOpen = a => { const e = cache[a.getAttribute('data-id')]; if (!e) return; if (e.src === 'cal') return form(e.item); if (e.src === 'task') { S.ui.tkOpenOnce = e.tid; return V.go('tasks'); }
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
    if (e.key === 'Escape' && (c.pick || c.filt || c.ai)) { c.pick = false; c.filt = false; c.ai = false; V.render(); return; } const fire = (act, attrs) => ACT[act]({ getAttribute: n => (attrs || {})[n] || null, closest: () => null });
    if (e.key === 'ArrowLeft') { e.preventDefault(); fire('calStep', { 'data-s': '-1' }); } else if (e.key === 'ArrowRight') { e.preventDefault(); fire('calStep', { 'data-s': '1' }); } else if (k === 't') fire('calToday'); else if (k === 'n' && canEdit()) { e.preventDefault(); fire('calAdd'); } else if (k.length === 1 && 'dwmy'.includes(k)) fire('calMode', { 'data-m': { d: 'day', w: 'week', m: 'month', y: 'year' }[k] }); });
  // hover preview: when, phase or step, owner and status of the item under the pointer or keyboard focus
  let hc = null; const card = () => hc && document.body.contains(hc) ? hc : (hc = Object.assign(document.createElement('div'), { className: 'pl-hc cal-hc', hidden: true }), hc.setAttribute('role', 'tooltip'), document.body.appendChild(hc), hc);
  const showPrev = el => { const e = cache[el.getAttribute('data-id')]; if (!e) return; const r = e.r || {}; const k = card();
    k.innerHTML = `<b>${esc(label(e))}</b><span class="pl-hc-s">${esc(stepName(e))}</span><dl><dt>When</dt><dd>${esc(V.fmtDate(e.start) + (e.end > e.start ? ' – ' + V.fmtDate(e.end) : ''))}</dd>${r.owner || e.who ? `<dt>Owner</dt><dd>${esc(r.owner || e.who)}</dd>` : ''}${r.status ? `<dt>Status</dt><dd>${esc(r.status)}${Number(r.pct) ? ' · ' + esc(String(r.pct)) + '%' : ''}</dd>` : ''}${e.late ? '<dt>Note</dt><dd class="bad">Past its date and not done</dd>' : ''}</dl>${dragOk(e) && el.classList.contains('cal-ev') ? '<small class="cal-hc-tip">Drag to another day to move it</small>' : ''}`;
    k.hidden = false; const b = el.getBoundingClientRect(), w = k.offsetWidth, h = k.offsetHeight; k.style.left = Math.min(innerWidth - w - 12, Math.max(12, b.left)) + 'px'; k.style.top = (b.bottom + 8 + h > innerHeight ? Math.max(8, b.top - h - 8) : b.bottom + 8) + 'px'; };
  const hidePrev = () => { if (hc) hc.hidden = true; }; const PREV = '.cal [data-act="calOpen"]';
  document.addEventListener('mouseover', ev => { const el = ev.target.closest && ev.target.closest(PREV); if (el) showPrev(el); });
  document.addEventListener('mouseout', ev => { if (ev.target.closest && ev.target.closest(PREV)) hidePrev(); });
  document.addEventListener('focusin', ev => { const el = ev.target.closest && ev.target.closest(PREV); if (el) showPrev(el); else hidePrev(); });
  // drag a plan item or a reminder to another day in the month view; dependent tasks follow; Undo puts the dates back
  const dayAt = (wk, x) => { const b = wk.getBoundingClientRect(); return add(wk.getAttribute('data-ws'), Math.max(0, Math.min(6, Math.floor((x - b.left) / (b.width / 7))))); };
  let drag = null;
  document.addEventListener('dragstart', ev => { const el = ev.target.closest && ev.target.closest('.cal .cal-ev[draggable="true"]'); if (!el) return; const wk = el.closest('.cal-wk'); const e = cache[el.getAttribute('data-id')]; if (!wk || !e) return; hidePrev();
    drag = { e, from: dayAt(wk, ev.clientX) }; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', e.title); } catch (x) { } el.classList.add('dragging'); });
  const mark = d => { document.querySelectorAll('.cal .cal-c.drop').forEach(x => x.classList.remove('drop')); if (!d) return; const wk = document.querySelector('.cal .cal-wk[data-ws="' + d.ws + '"]'); const cell = wk && wk.querySelectorAll('.cal-bg > .cal-c')[d.i]; if (cell) cell.classList.add('drop'); };
  document.addEventListener('dragover', ev => { if (!drag) return; const wk = ev.target.closest && ev.target.closest('.cal .cal-wk'); if (!wk) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; const d = dayAt(wk, ev.clientX); mark({ ws: wk.getAttribute('data-ws'), i: dif(wk.getAttribute('data-ws'), d) }); });
  document.addEventListener('dragend', () => { drag = null; mark(null); document.querySelectorAll('.cal .dragging').forEach(x => x.classList.remove('dragging')); });
  document.addEventListener('drop', ev => { if (!drag) return; const wk = ev.target.closest && ev.target.closest('.cal .cal-wk'); if (!wk) return; ev.preventDefault(); const dd = dif(drag.from, dayAt(wk, ev.clientX)); const e = drag.e; drag = null; mark(null); if (dd) moveBy(e, dd); });
  async function moveBy(e, dd) {
    if (e.src === 'plan' && V.tlApi && e.r) { const before = V.tlApi.TD().rows.map(r => Object.assign({}, r)); const rows = before.map(r => Object.assign({}, r)); const r = rows.find(x => x.id === e.r.id); if (!r) return; const e0 = D(r.end) || r.start;
      r.start = add(r.start, dd); r.end = add(e0, dd); if (V.tlDeps) V.tlDeps.follow(rows, r.id); V.tlApi.saveRows(rows, 'Moved on the calendar: ' + r.title); V.render();
      undoBar('Moved ' + r.title + ' to ' + V.fmtDate(r.start), () => { V.tlApi.saveRows(before, 'Undo calendar move: ' + r.title); V.render(); }); return; }
    if (e.src === 'cal' && e.item) { const old = Object.assign({}, e.item); const nx = Object.assign({}, old, { date: add(old.date, dd), end: D(old.end) ? add(old.end, dd) : old.end });
      try { await I().put('cal', old.id, nx); } catch (x) { toast(x.message || 'Could not move it', 5000, true); return; } V.render();
      undoBar('Moved ' + (old.title || 'the reminder') + ' to ' + V.fmtDate(nx.date), async () => { await I().put('cal', old.id, old); V.render(); }); }
  }
  function undoBar(msg, undo) { document.querySelectorAll('.cal-undo').forEach(x => x.remove()); const b = document.createElement('div'); b.className = 'cal-undo'; b.setAttribute('role', 'status');
    b.innerHTML = '<span></span><button type="button">Undo</button>'; b.firstChild.textContent = msg; document.body.appendChild(b); const t = setTimeout(() => b.remove(), 9000);
    b.querySelector('button').addEventListener('click', () => { clearTimeout(t); b.remove(); undo(); }); }
  // for the notification bell: the team's reminders that are due today or earlier and not done
  V.calDue = () => { if (cust()) return []; if (!I().ready(['cal'])) { if (!asked.due) { asked.due = 1; I().load(['cal']); } return []; } return I().list('cal').filter(x => x.remind !== false && !x.done && D(x.date) && x.date <= V.today() && (D(x.end) || x.date) >= add(V.today(), -7)); };
})(typeof window !== 'undefined' ? window : globalThis);
