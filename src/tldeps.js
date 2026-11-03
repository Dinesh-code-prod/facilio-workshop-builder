/* Plan timeline: dependency lines, like Asana's Timeline. Hover a bar to see a dot at each end; drag a dot onto another bar to link them (the task at the arrow's end waits
   for the task at its start). Lines are drawn over the grid from the real bar positions, so they follow any row height, scale or collapsed group. Click a line to remove it.
   Moving or lengthening a task moves the tasks that wait for it ("Move dependent tasks", on by default). "Critical path" highlights the longest chain of dependent tasks.
   Rules live in src/tldepslogic.js; rows and saving belong to src/timeline.js (V.tlApi). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const L = () => root.FWBTlDeps; const A = () => V.tlApi; const toast = (...a) => V.toast && V.toast(...a);
  const NS = 'http://www.w3.org/2000/svg'; const BAR = '.pl-bar[data-id], .pl-ms[data-id]'; let sel = null;
  const copyRows = () => A().TD().rows.map(r => Object.assign({}, r, r.dep ? { dep: r.dep.slice() } : {}));
  const nameOf = id => ((A().TD().rows.find(r => r.id === id) || {}).title || 'task');

  // a point on a bar, measured from the table's top-left corner
  function pt(el, t, side) { const r = el.getBoundingClientRect(), b = t.getBoundingClientRect(); return { x: (side === 'r' ? r.right : r.left) - b.left, y: r.top - b.top + r.height / 2 }; }
  // an elbow from the end of one task to the start of another; when the next task starts earlier it loops round between the rows
  function elbow(a, b) {
    const g = 10; if (b.x >= a.x + g * 2) return `M${a.x},${a.y} H${a.x + g} V${b.y} H${b.x}`;
    const my = Math.abs(a.y - b.y) < 6 ? a.y + 22 : (a.y + b.y) / 2; return `M${a.x},${a.y} H${a.x + g} V${my} H${b.x - g} V${b.y} H${b.x}`;
  }
  const defs = '<defs>' + [['a', '#5B6B99'], ['c', '#E5197F'], ['s', '#1570EF']].map(([k, c]) => `<marker id="tlArr-${k}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${c}"/></marker>`).join('') + '</defs>';

  function draw() {
    const wrap = document.querySelector('.pl-wrap'), t = document.querySelector('.pl-grid'); if (!wrap || !t) return;
    let svg = wrap.querySelector('svg.pl-dep'); if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'pl-dep'); svg.setAttribute('aria-hidden', 'true'); wrap.appendChild(svg); }
    svg.style.width = t.offsetWidth + 'px'; svg.style.height = t.offsetHeight + 'px';
    const els = {}; t.querySelectorAll(BAR).forEach(e => { els[e.dataset.id] = e; e.classList.remove('crit'); });
    const rows = A().TD().rows; const crit = S.ui.tlCrit ? L().critical(rows) : null; const bad = L().conflicts(rows); let out = defs;
    if (crit) crit.nodes.forEach(id => { if (els[id]) els[id].classList.add('crit'); });
    rows.forEach(s => (s.dep || []).forEach(p => {
      if (!els[p] || !els[s.id]) return; const k = p + '>' + s.id; const d = elbow(pt(els[p], t, 'r'), pt(els[s.id], t, 'l')); const isCrit = crit && crit.links.has(k), isBad = bad.has(k), isSel = sel === k;
      const cls = 'pl-lk-p' + (isCrit ? ' crit' : '') + (isBad ? ' bad' : '') + (isSel ? ' sel' : ''); const mk = isSel ? 's' : isCrit || isBad ? 'c' : 'a';
      out += `<path class="${cls}" d="${d}" marker-end="url(#tlArr-${mk})"/><path class="hit" data-k="${esc(k)}" d="${d}"><title>${esc(nameOf(p))} then ${esc(nameOf(s.id))}${isBad ? ' (starts too early)' : ''}. Click to remove the link.</title></path>`;
    }));
    svg.innerHTML = out;
  }

  function link(pred, succ) {
    const rows = copyRows(); if (L().wouldLoop(rows, pred, succ)) { toast('That link would make a loop: ' + nameOf(pred) + ' already waits for ' + nameOf(succ) + ', directly or through other tasks.', 6000, true); return; }
    const s = rows.find(r => r.id === succ); if ((s.dep || []).includes(pred)) { toast('These two tasks are already linked.', 3500); return; }
    s.dep = (s.dep || []).concat(pred); const moved = S.ui.tlFollow === false ? [] : L().reschedule(rows, pred);
    A().saveRows(rows, 'Linked: ' + nameOf(pred) + ' then ' + nameOf(succ)); V.render(); toast(moved.length ? 'Linked. ' + moved.length + ' task' + (moved.length > 1 ? 's' : '') + ' moved to start after ' + nameOf(pred) + '.' : 'Linked: ' + nameOf(succ) + ' now waits for ' + nameOf(pred) + '.', 4500);
  }
  function unlink(k) { const [p, s] = k.split('>'); const rows = copyRows(); const r = rows.find(x => x.id === s); if (!r) return; r.dep = (r.dep || []).filter(x => x !== p); if (!r.dep.length) delete r.dep; sel = null; A().saveRows(rows, 'Link removed: ' + nameOf(p) + ' then ' + nameOf(s)); V.render(); toast('Link removed. The task keeps its dates.', 3500); }

  function popover(k, x, y) {
    const wrap = document.querySelector('.pl-wrap'); if (!wrap) return; wrap.querySelectorAll('.pl-lkpop').forEach(e => e.remove()); if (!k) return; const [p, s] = k.split('>');
    const d = document.createElement('div'); d.className = 'pl-lkpop'; d.style.left = x + 'px'; d.style.top = y + 'px';
    d.innerHTML = `<span><b>${esc(nameOf(s))}</b> waits for <b>${esc(nameOf(p))}</b></span>${A().canEdit() ? '<button type="button" class="btn sm danger" data-lkdel>Remove link</button>' : ''}`; wrap.appendChild(d);
    const b = d.querySelector('[data-lkdel]'); if (b) b.addEventListener('click', () => unlink(k));
  }

  function startLink(e, t, svg) {
    const el = e.target.closest(BAR); const id = el.dataset.id, side = e.target.dataset.side; e.preventDefault(); e.stopImmediatePropagation();
    const from = pt(el, t, side), temp = document.createElementNS(NS, 'path'); temp.setAttribute('class', 'pl-lk-temp'); svg.appendChild(temp);
    const target = ev => { const x = document.elementsFromPoint(ev.clientX, ev.clientY).map(h => h.closest && h.closest(BAR)).find(Boolean); return x && x.dataset.id !== id ? x : null; };   // a line that crosses the bar must not hide it
    const move = ev => { const b = t.getBoundingClientRect(), to = { x: ev.clientX - b.left, y: ev.clientY - b.top }; temp.setAttribute('d', side === 'r' ? elbow(from, to) : elbow(to, from)); t.querySelectorAll('.lk-target').forEach(x => x.classList.remove('lk-target')); const x = target(ev); if (x) x.classList.add('lk-target'); };
    const done = ev => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', done); document.removeEventListener('keydown', esc1); temp.remove(); t.querySelectorAll('.lk-target').forEach(x => x.classList.remove('lk-target')); const x = ev && ev.type === 'pointerup' ? target(ev) : null; if (x) side === 'r' ? link(id, x.dataset.id) : link(x.dataset.id, id); };
    const esc1 = ev => { if (ev.key === 'Escape') done(null); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', done); document.addEventListener('keydown', esc1); move(e);
  }

  // the extra controls sit in the timeline's own toolbar
  function toolbar() {
    const bar = document.querySelector('.pl-tools'); if (!bar || bar.querySelector('.pl-dep-tools')) return; const edit = A().canEdit();
    const box = document.createElement('div'); box.className = 'pl-dep-tools';
    box.innerHTML = `<label class="chk small"><input type="checkbox" data-change="tlCrit"${S.ui.tlCrit ? ' checked' : ''}> Critical path</label>${edit ? `<label class="chk small" title="When a task moves later, the tasks that wait for it move too"><input type="checkbox" data-change="tlFollow"${S.ui.tlFollow === false ? '' : ' checked'}> Move dependent tasks</label>` : ''}<button type="button" class="btn sm" data-act="tlCompact" aria-pressed="${S.ui.tlCompact !== false}">${S.ui.tlCompact !== false ? 'Show all columns' : 'Timeline only'}</button>${edit ? '<span class="xs muted">Link tasks: hover a bar, then drag the dot at its end onto another bar.</span>' : ''}`;
    bar.appendChild(box);
  }

  const prev = V.planGanttMount;
  V.planGanttMount = function () {
    if (prev) prev.apply(this, arguments); const wrap = document.querySelector('.pl-wrap'), t = document.querySelector('.pl-grid'); if (!wrap || !t || !A()) return;
    wrap.classList.toggle('pl-compact', S.ui.tlCompact !== false); toolbar();
    if (A().canEdit()) t.querySelectorAll(BAR).forEach(e => { if (!e.querySelector('.pl-lk')) e.insertAdjacentHTML('beforeend', '<s class="pl-lk l" data-side="l" title="Drag to another task to link"></s><s class="pl-lk r" data-side="r" title="Drag to another task to link"></s>'); });
    draw(); const svg = wrap.querySelector('svg.pl-dep');
    if (A().canEdit()) t.addEventListener('pointerdown', e => { if (e.button === 0 && e.target.closest('.pl-lk')) startLink(e, t, svg); }, true);
    svg.addEventListener('click', e => { const h = e.target.closest('.hit'); if (!h) return; sel = h.dataset.k; draw(); const b = wrap.getBoundingClientRect(); popover(sel, e.clientX - b.left + wrap.scrollLeft, e.clientY - b.top + 10); });
    svg.style.pointerEvents = 'none'; svg.querySelectorAll('.hit').forEach(h => { h.style.pointerEvents = 'stroke'; });
    wrap.addEventListener('scroll', () => popover(null), { passive: true }); requestAnimationFrame(draw);
  };
  document.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel && A() && A().canEdit() && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); unlink(sel); } if (e.key === 'Escape' && sel) { sel = null; popover(null); draw(); } });

  ACT.tlCrit = el => { S.ui.tlCrit = !!el.checked; V.render(); };
  ACT.tlFollow = el => { S.ui.tlFollow = !!el.checked; };
  ACT.tlCompact = () => { S.ui.tlCompact = S.ui.tlCompact === false; V.render(); };

  // used by the task editor and by dragging in timeline.js
  V.tlDeps = {
    field(r, id) { const others = A().TD().rows.filter(x => !x.isPhase && x.id !== id && x.start); if (!others.length) return ''; const have = new Set(r.dep || []);
      return `<div class="full" style="margin-top:10px"><label class="f">Waits for (finish to start)</label><div class="tdp-list">${others.map(o => `<label class="chk small"><input type="checkbox" class="tdp" value="${esc(o.id)}"${have.has(o.id) ? ' checked' : ''}> ${esc(o.title)}</label>`).join('')}</div></div>`; },
    read() { return [...document.querySelectorAll('.tdp:checked')].map(x => x.value); },
    has() { return !!document.querySelector('.tdp'); },
    // after a task moved: bring the tasks that wait for it along, and say how many moved
    follow(rows, id) { if (S.ui.tlFollow === false) return 0; const m = L().reschedule(rows, id); if (m.length) toast(m.length + ' dependent task' + (m.length > 1 ? 's' : '') + ' moved to follow it.', 4000); return m.length; },
    reschedule: (rows, id) => L().reschedule(rows, id), wouldLoop: (rows, p, s) => L().wouldLoop(rows, p, s)
  };
})(typeof window !== 'undefined' ? window : globalThis);
