/* Project calendar (Project Plan > Calendar): the plan, workshop sessions, UAT and go-live dates, actions and sign-offs that fall due, drawn on a
   Day / Week / Month / Year calendar. Every date comes from the saved plan and records; nothing is invented. The team can add its own reminders,
   events and deadlines (item kind "cal", team only), which can also show in the notification bell on their day. Customers see the plan, published
   workshop sessions and their own actions, but not the team's reminders. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const { drawer, closeDrawer, toast, confirmDialog } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly;
  const D = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : '');
  const add = (d, n) => V.addDays(d, n); const dif = (a, b) => V.daysBetween(a, b); const dow = d => (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7;   // Monday first
  const monday = d => add(d, -dow(d)); const addMonths = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const TYPES = { uat: ['UAT and testing', '#E5197F', '#fff'], golive: ['Go-live and sign-off', '#1D1A5E', '#fff'], meeting: ['Workshops, demos, training', '#8DB8FF', '#1D1A5E'], milestone: ['Milestones', '#1570EF', '#fff'], task: ['Plan tasks', '#DCE8FF', '#1D1A5E'], action: ['Actions due', '#EEF1F8', '#1D1A5E'], mine: ['My reminders and events', '#FFFFFF', '#1D1A5E'] };
  const classify = (t, r) => (/\buat\b|user acceptance|\bqa\b|test (case|session)/i.test(t) ? 'uat' : /go.?live|sign.?off|cut.?over|acceptance/i.test(t) ? 'golive' : /workshop|demo|training|kick.?off|session|meeting|hand.?over/i.test(t) ? 'meeting' : (r && r.ms) ? 'milestone' : 'task');
  const st = () => { const c = S.ui.cal = S.ui.cal || { mode: 'month', date: V.today(), hide: [], q: '' }; return c; };
  let cache = {}; const asked = {};

  function events() {
    const out = []; const c = st(); const td = F.doc('plan_struct') || {}; const meet = new Set();
    (td.rows || []).filter(r => !r.isPhase && D(r.start)).forEach((r, i) => { const end = D(r.end) && r.end >= r.start ? r.end : r.start; const t = classify(r.title || '', r); if (t === 'meeting') meet.add(r.start); out.push({ id: 'p' + i, src: 'plan', type: t, title: r.title || 'Task', start: r.start, end, done: r.status === 'Done', r }); });
    const sess = cust() ? ((F.doc('schedule_published') || {}).sessions || []) : ((F.doc('planner') || {}).sessions || []);
    sess.forEach((s, i) => { if (D(s.date) && s.status !== 'cancelled' && !meet.has(s.date)) out.push({ id: 's' + i, src: 'session', type: 'meeting', title: 'Workshop: ' + (s.title || 'Session ' + (s.no || '')), start: s.date, end: s.date, done: s.status === 'completed', time: s.time || '' }); });
    if (I().ready(['action'])) I().list('action').forEach(a => { if (a.status !== 'Done' && D(a.due) && (!cust() || a.side === 'customer')) out.push({ id: 'a' + a.id, src: 'action', type: 'action', title: a.text || 'Action', start: a.due, end: a.due, who: a.owner }); });
    if (!cust() && I().ready(['signoff'])) I().list('signoff').forEach(x => { if (x.status !== 'signed' && D(x.due)) out.push({ id: 'g' + x.id, src: 'signoff', type: 'golive', title: ({ brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' })[x.id] || 'Sign-off', start: x.due, end: x.due }); });
    if (!cust() && I().ready(['cal'])) I().list('cal').forEach(x => { if (D(x.date)) out.push({ id: 'c' + x.id, src: 'cal', type: 'mine', title: x.title || 'Reminder', start: x.date, end: D(x.end) && x.end >= x.date ? x.end : x.date, time: x.time || '', done: !!x.done, item: x }); });
    const q = (c.q || '').trim().toLowerCase(); const list = out.filter(e => !c.hide.includes(e.type) && (!q || e.title.toLowerCase().includes(q)));
    cache = {}; list.forEach(e => { cache[e.id] = e; }); return list.sort((a, b) => a.start.localeCompare(b.start) || (b.end > b.start) - (a.end > a.start) || (a.time || '99').localeCompare(b.time || '99') || a.title.localeCompare(b.title));
  }
  const on = (evs, d) => evs.filter(e => e.start <= d && e.end >= d);
  const chipStyle = e => { const t = TYPES[e.type]; return `background:${t[1]};color:${t[2]};${e.type === 'mine' ? 'border:1.5px solid #1D1A5E;' : ''}`; };
  const label = e => (e.time ? e.time + ' ' : '') + e.title;

  function monthGrid(evs, anchor) {
    const first = anchor.slice(0, 8) + '01'; const ws0 = monday(first); const last = add(addMonths(first, 1), -1); const weeks = Math.ceil((dif(ws0, last) + 1) / 7); const today = V.today(); const MAXL = 3; let h = '';
    for (let w = 0; w < weeks; w++) {
      const ws = add(ws0, 7 * w); const we = add(ws, 6); const segs = evs.filter(e => e.start <= we && e.end >= ws).map(e => { const a = e.start > ws ? e.start : ws, b = e.end < we ? e.end : we; return { e, col: dif(ws, a) + 1, span: dif(a, b) + 1, l: e.start < ws, r: e.end > we }; }).sort((x, y) => x.col - y.col || y.span - x.span);
      const lanes = []; segs.forEach(s => { let k = 0; while (lanes[k] !== undefined && lanes[k] >= s.col) k++; lanes[k] = s.col + s.span - 1; s.lane = k; }); const hid = Array(8).fill(0); segs.filter(s => s.lane >= MAXL).forEach(s => { for (let c = s.col; c < s.col + s.span; c++) hid[c]++; });
      const cells = Array.from({ length: 7 }, (_, i) => add(ws, i));
      h += `<div class="cal-wk"><div class="cal-bg">${cells.map(d => `<div class="cal-c${d.slice(0, 7) !== first.slice(0, 7) ? ' out' : ''}${d === today ? ' today' : ''}${d === anchor ? ' sel' : ''}${dow(d) > 4 ? ' we' : ''}"></div>`).join('')}</div>
        <div class="cal-fg" style="grid-template-rows:30px repeat(${MAXL + 1},24px)">${cells.map((d, i) => `<div class="cal-n" style="grid-column:${i + 1};grid-row:1"><button type="button" class="${d === today ? 'today' : ''}" data-act="calDay" data-d="${d}">${d === today || d.slice(8) === '01' ? (d.slice(8) === '01' ? MONTHS[+d.slice(5, 7) - 1].slice(0, 3) + ' ' : '') + (+d.slice(8)) : +d.slice(8)}</button>${canEdit() ? `<button type="button" class="cal-add" data-act="calAdd" data-d="${d}" aria-label="Add a reminder on ${d}">+</button>` : ''}</div>`).join('')}
        ${segs.filter(s => s.lane < MAXL).map(s => `<button type="button" class="cal-ev${s.l ? ' cl' : ''}${s.r ? ' cr' : ''}${s.e.done ? ' done' : ''}" style="grid-column:${s.col}/span ${s.span};grid-row:${s.lane + 2};${chipStyle(s.e)}" data-act="calOpen" data-id="${esc(s.e.id)}" title="${esc(s.e.title)}">${s.e.done ? '✓ ' : ''}${esc(label(s.e))}</button>`).join('')}
        ${hid.map((n, c) => (n ? `<button type="button" class="cal-more" style="grid-column:${c};grid-row:${MAXL + 2}" data-act="calDay" data-d="${cells[c - 1]}">+${n} more</button>` : '')).join('')}</div></div>`;
    }
    return `<div class="cal-head">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>${h}`;
  }
  const chip = e => `<button type="button" class="cal-chip${e.done ? ' done' : ''}" style="${chipStyle(e)}" data-act="calOpen" data-id="${esc(e.id)}">${e.done ? '✓ ' : ''}${esc(label(e))}</button>`;
  function weekGrid(evs, anchor) { const ws = monday(anchor); const today = V.today();
    return `<div class="cal-weekv">${Array.from({ length: 7 }, (_, i) => { const d = add(ws, i); const l = on(evs, d); return `<div class="cal-col${d === today ? ' today' : ''}"><button type="button" class="cal-ch" data-act="calDay" data-d="${d}"><span>${DAYS[i]}</span><b>${+d.slice(8)}</b></button><div class="cal-cb">${l.map(chip).join('') || '<span class="cal-none">Nothing</span>'}${canEdit() ? `<button type="button" class="cal-addrow" data-act="calAdd" data-d="${d}">+ Add</button>` : ''}</div></div>`; }).join('')}</div>`; }
  function dayList(evs, d) { const l = on(evs, d); return `<div class="cal-dayv"><h3>${V.fmtDate(d)}</h3>${l.length ? l.map(e => `<button type="button" class="cal-row" data-act="calOpen" data-id="${esc(e.id)}"><i style="background:${TYPES[e.type][1]};${e.type === 'mine' ? 'border:1.5px solid #1D1A5E' : ''}"></i><span><b>${e.done ? '✓ ' : ''}${esc(label(e))}</b><small>${esc(TYPES[e.type][0])}${e.end > e.start ? ' · ' + V.fmtDate(e.start) + ' to ' + V.fmtDate(e.end) : ''}${e.who ? ' · ' + esc(e.who) : ''}</small></span></button>`).join('') : '<p class="muted">Nothing is planned for this day.</p>'}${canEdit() ? `<button class="btn" data-act="calAdd" data-d="${d}">Add a reminder or event</button>` : ''}</div>`; }
  const dots = (evs, d) => { const t = [...new Set(on(evs, d).map(e => e.type))].slice(0, 3); return t.map(x => `<i style="background:${TYPES[x][1] === '#FFFFFF' ? '#1D1A5E' : TYPES[x][1]}"></i>`).join(''); };
  function mini(evs, month, sel, big) { const first = month.slice(0, 8) + '01'; const ws0 = monday(first); const weeks = Math.ceil((dif(ws0, add(addMonths(first, 1), -1)) + 1) / 7); const today = V.today();
    return `<div class="cal-mini${big ? ' big' : ''}">${big ? `<button type="button" class="cal-mt" data-act="calMonth" data-d="${first}">${MONTHS[+first.slice(5, 7) - 1]}</button>` : ''}<div class="cal-mh">${DAYS.map(d => `<span>${d[0]}</span>`).join('')}</div>${Array.from({ length: weeks * 7 }, (_, i) => { const d = add(ws0, i); const o = d.slice(0, 7) !== first.slice(0, 7); return `<button type="button" class="${o ? 'o ' : ''}${d === today ? 't ' : ''}${d === sel ? 's' : ''}" data-act="calDay" data-d="${d}"${o && big ? ' tabindex="-1"' : ''}><span>${+d.slice(8)}</span><em>${o && big ? '' : dots(evs, d)}</em></button>`; }).join('')}</div>`; }
  const titleOf = (c) => { const d = c.date; return c.mode === 'year' ? d.slice(0, 4) : c.mode === 'month' ? MONTHS[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : c.mode === 'week' ? V.fmtDate(monday(d)) + ' to ' + V.fmtDate(add(monday(d), 6)) : V.fmtDate(d); };

  V.planCalendar = { html() {
    const c = st(); const need = ['action', 'signoff'].concat(cust() ? [] : ['cal']); if (!I().ready(need) && !asked[need.join()]) { asked[need.join()] = 1; I().load(need).then(() => V.render()); }
    const evs = events(); const today = V.today(); const upcoming = []; for (let i = 0; i < 14 && upcoming.length < 8; i++) { const d = add(c.date, i); on(evs, d).filter(e => e.start === d || i === 0).slice(0, 4).forEach(e => upcoming.push([d, e])); }
    const side = `<aside class="cal-side"><div class="cal-sh"><b>${MONTHS[+c.date.slice(5, 7) - 1]}</b> <span>${c.date.slice(0, 4)}</span></div>${mini(evs, c.date, c.date)}
      <div class="cal-up">${upcoming.length ? upcoming.map(([d, e]) => `<button type="button" data-act="calOpen" data-id="${esc(e.id)}"><i style="background:${TYPES[e.type][1] === '#FFFFFF' ? '#fff' : TYPES[e.type][1]}"></i><span><small>${d === today ? 'Today' : V.fmtDate(d)}</small>${esc(label(e))}</span></button>`).join('') : '<p>Nothing coming up from this date.</p>'}</div>
      <div class="cal-leg"><p>Show</p>${Object.keys(TYPES).filter(k => k !== 'mine' || !cust()).map(k => `<label><input type="checkbox" data-change="calType" data-t="${k}"${c.hide.includes(k) ? '' : ' checked'}><i style="background:${TYPES[k][1]};${k === 'mine' ? 'border:1.5px solid #fff' : ''}"></i>${esc(TYPES[k][0])}</label>`).join('')}</div></aside>`;
    const bar = `<div class="cal-bar"><div class="cal-nav"><button type="button" data-act="calStep" data-s="-1" aria-label="Previous">‹</button><button type="button" data-act="calToday">Today</button><button type="button" data-act="calStep" data-s="1" aria-label="Next">›</button></div><h2>${esc(titleOf(c))}</h2>
      <div class="cal-seg" role="tablist">${['day', 'week', 'month', 'year'].map(m => `<button type="button" role="tab" aria-selected="${c.mode === m}" class="${c.mode === m ? 'on' : ''}" data-act="calMode" data-m="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <input class="cal-q" type="search" placeholder="Search" aria-label="Search the calendar" value="${esc(c.q)}" data-change="calSearch">${canEdit() ? '<button class="btn primary sm" data-act="calAdd">+ Reminder</button>' : ''}</div>`;
    const body = c.mode === 'month' ? monthGrid(evs, c.date) : c.mode === 'week' ? weekGrid(evs, c.date) : c.mode === 'day' ? dayList(evs, c.date) : `<div class="cal-year">${Array.from({ length: 12 }, (_, m) => mini(evs, c.date.slice(0, 4) + '-' + String(m + 1).padStart(2, '0') + '-01', c.date, true)).join('')}</div>`;
    const none = !evs.length && !(F.doc('plan_struct') || {}).rows ? '<div class="cal-note">There is no dated plan yet, so only your own reminders will show. Import the plan in the Workbook tab, then it appears here.</div>' : '';
    return `<div class="cal">${side}<div class="cal-main">${bar}${none}<div class="cal-body">${body}</div></div></div>`;
  } };

  ACT.calStep = a => { const c = st(), n = Number(a.getAttribute('data-s')); c.date = c.mode === 'day' ? add(c.date, n) : c.mode === 'week' ? add(c.date, 7 * n) : c.mode === 'month' ? addMonths(c.date, n) : addMonths(c.date, 12 * n); V.render(); };
  ACT.calToday = () => { st().date = V.today(); V.render(); };
  ACT.calMode = a => { st().mode = a.getAttribute('data-m'); V.render(); };
  ACT.calDay = a => { const c = st(); c.date = a.getAttribute('data-d'); if (!a.closest('.cal-side')) c.mode = 'day'; V.render(); };
  ACT.calMonth = a => { const c = st(); c.date = a.getAttribute('data-d'); c.mode = 'month'; V.render(); };
  ACT.calType = el => { const c = st(), t = el.getAttribute('data-t'); c.hide = el.checked ? c.hide.filter(x => x !== t) : c.hide.concat(t); V.render(); };
  ACT.calSearch = el => { st().q = el.value; V.render(); };
  ACT.calOpen = a => { const e = cache[a.getAttribute('data-id')]; if (!e) return; if (e.src === 'cal') return form(e.item);
    const r = e.r || {}; const rows = [['When', V.fmtDate(e.start) + (e.end > e.start ? ' to ' + V.fmtDate(e.end) : '') + (e.time ? ' · ' + e.time : '')], ['Kind', TYPES[e.type][0]], r.owner ? ['Owner', r.owner] : null, r.status ? ['Status', r.status + (Number(r.pct) ? ' · ' + r.pct + '%' : '')] : null, e.who ? ['Owner', e.who] : null].filter(Boolean);
    const go = e.src === 'plan' ? 'plan' : e.src === 'action' || e.src === 'signoff' ? 'governance' : 'planner';
    drawer(e.title, `<dl class="cal-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="xs muted">This comes from the project ${e.src === 'plan' ? 'plan' : e.src === 'session' ? 'workshop schedule' : e.src === 'action' ? 'actions' : 'sign-offs'}. Change it there and the calendar follows.</p>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button><button class="btn primary" data-act="calGo" data-v="${go}">Open ${e.src === 'plan' ? 'the plan' : e.src === 'action' || e.src === 'signoff' ? 'Governance' : 'the schedule'}</button>`); };
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
  // for the notification bell: the team's reminders that are due today or earlier and not done
  V.calDue = () => { if (cust()) return []; if (!I().ready(['cal'])) { if (!asked.due) { asked.due = 1; I().load(['cal']); } return []; } return I().list('cal').filter(x => x.remind !== false && !x.done && D(x.date) && x.date <= V.today() && (D(x.end) || x.date) >= add(V.today(), -7)); };
})(typeof window !== 'undefined' ? window : globalThis);
