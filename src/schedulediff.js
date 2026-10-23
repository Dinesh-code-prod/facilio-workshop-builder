/* Regenerate the workshop schedule and compare it with the approved one (Requirement Session Planner › Schedule changes).
   The approved schedule is the one published to the customer (schedule_published). A proposal is built from the CURRENT planner sessions
   (so manual edits are carried forward), plus the effect of scope changes: modules that left scope are taken off their sessions, and
   in-scope modules with no session get new sessions in dependency order. A proposal never changes the approved schedule or the planner
   until the user selects the changes and confirms them. Conflicts (a change that touches something edited by hand since approval, or a
   completed session) are flagged and not selected by default. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { tag, toast, confirmDialog } = V;
  const TIERS = [[/^(site|building|floor|space|basespace|subspace|portfolio)$/i, 0, 'Portfolio'], [/^(people|employee|users?|roles?|tenant|tenantunit|client|clientcontact|vendors?|vendorcontact)/i, 1, 'People & parties'], [/^(asset|meter|energymeter|reading)/i, 2, 'Assets'], [/^(item|tool|storeroom|inventory|itemtypes?|tooltypes?|purchase|receivable|transfer)/i, 3, 'Inventory & purchasing']];
  const tierOf = m => { const t = TIERS.find(([re]) => re.test(m)); return t ? t[1] : 4; }; const tierName = i => (TIERS.find(t => t[1] === i) || [0, 0, i === 4 ? 'Operations' : 'Other'])[2];
  const ml = n => (V.plannerHelpers ? V.plannerHelpers.modLabel : (x => x))(n);
  const live = ss => ss.filter(s => s.status !== 'cancelled');
  const sortSes = ss => ss.slice().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.no || 0) - (b.no || 0));
  // dependency: a session depends on the first session that covers each lower tier of modules (the portfolio before assets before work …)
  function depsOf(all) {
    const ss = sortSes(live(all)); const out = {};
    ss.forEach(s => { const mt = Math.min(...(s.modules || []).map(tierOf), 9); const d = new Set(); for (let t = 0; t < mt; t++) { const first = ss.find(x => x.id !== s.id && (x.modules || []).some(m => tierOf(m) === t)); if (first) d.add(first.no); } out[s.id] = [...d].sort((a, b) => a - b); });
    return out;
  }
  const bizNext = (d, taken) => { let x = new Date((d || V.today()) + 'T00:00:00Z'); do { x.setUTCDate(x.getUTCDate() + 1); } while (x.getUTCDay() === 0 || x.getUTCDay() === 6 || taken.has(x.toISOString().slice(0, 10))); return x.toISOString().slice(0, 10); };
  const shape = s => ({ id: s.id, no: s.no, title: s.title || '', date: s.date || '', start: s.start || '', modules: (s.modules || []).slice().sort(), status: s.status || 'planned' });

  function baseline() {
    const pub = F.doc('schedule_published'); const d = V.plannerDoc();
    const byLabel = Object.fromEntries(F.allModules().map(m => [m.label, m.name])); const toName = x => F.moduleView(x) && !byLabel[x] ? x : (byLabel[x] || x); // the published copy stores module labels
    if (pub && pub.sessions && pub.sessions.length) return { label: `Schedule published to the customer on ${V.fmtDate(pub.publishedAt)}`, published: true, sessions: pub.sessions.map(s => Object.assign({ status: 'planned' }, s, { modules: (s.modules || []).map(toName) })) };
    return { label: 'No schedule has been published yet — the comparison is against the planner as it is now', published: false, sessions: F.clone(d.sessions) };
  }
  function propose() {
    const d = V.plannerDoc(); const base = baseline(); const baseById = Object.fromEntries(base.sessions.map(s => [s.id, shape(s)]));
    const inScope = new Set(F.allModules().filter(m => m.inScope).map(m => m.name)); const cur = F.clone(d.sessions); const notes = {}; const note = (id, t, conflict) => { (notes[id] = notes[id] || { msgs: [], conflict: '' }).msgs.push(t); if (conflict) notes[id].conflict = conflict; };
    const manual = s => { const b = baseById[s.id]; if (!b || !base.published) return []; const c = shape(s); return ['title', 'date', 'start', 'status'].filter(k => b[k] !== c[k]).concat(b.modules.join() !== c.modules.join() ? ['modules'] : []); };
    const dropped = new Set();
    cur.forEach(s => { if (s.status === 'cancelled') return; const gone = (s.modules || []).filter(m => !inScope.has(m)); if (!gone.length) return;
      if (s.status === 'completed') { note(s.id, `${gone.map(ml).join(', ')} left scope but this session is already completed, so it is left as it is`, 'Completed session'); return; }
      const mn = manual(s); const conflict = mn.includes('modules') ? 'Modules on this session were edited by hand after the schedule was approved' : '';
      s.modules = s.modules.filter(m => inScope.has(m)); note(s.id, `${gone.map(ml).join(', ')} left scope`, conflict); if (!s.modules.length) { dropped.add(s.id); s.status = 'cancelled'; note(s.id, 'no modules left, so the session is removed', conflict); } });
    const covered = new Set(live(cur).flatMap(s => s.modules || [])); const un = F.allModules().filter(m => m.inScope && !covered.has(m.name)).map(m => m.name).sort((a, b) => tierOf(a) - tierOf(b) || a.localeCompare(b));
    const taken = new Set(live(cur).map(s => s.date).filter(Boolean)); let last = sortSes(live(cur)).filter(s => s.date).pop(); let lastDate = last ? last.date : ''; let no = Math.max(0, ...cur.map(s => s.no || 0)); const tpl = last || cur[0] || {}; const added = [];
    [0, 1, 2, 3, 4].forEach(t => { const mods = un.filter(m => tierOf(m) === t); for (let i = 0; i < mods.length; i += 6) { const grp = mods.slice(i, i + 6); lastDate = lastDate ? bizNext(lastDate, taken) : ''; if (lastDate) taken.add(lastDate); no++;
      const ns = { id: 'new_' + t + '_' + i, no, title: `${tierName(t)}: ${grp.map(ml).join(', ')}`.slice(0, 120), date: lastDate, start: tpl.start || '11:00', end: '', minutes: tpl.minutes || (d.settings && d.settings.defaultMinutes) || 120, modules: grp, topics: '', participants: tpl.participants || '', prep: '', status: 'planned', notes: '', mode: tpl.mode || (d.settings && d.settings.mode) || '' }; cur.push(ns); added.push(ns.id); note(ns.id, 'in scope but not covered by any session'); } });
    const deps0 = depsOf(base.sessions), deps1 = depsOf(cur); const nameOf = id => { const s = cur.find(x => x.id === id) || base.sessions.find(x => x.id === id); return s ? s.no : '?'; };
    const rows = []; const ids = [...new Set(base.sessions.map(s => s.id).concat(cur.map(s => s.id)))];
    ids.forEach(id => { const b = baseById[id] ? Object.assign(baseById[id], { deps: deps0[id] || [] }) : null; const c0 = cur.find(s => s.id === id); const c = c0 && c0.status !== 'cancelled' ? Object.assign(shape(c0), { deps: deps1[id] || [] }) : null; const nt = notes[id];
      let kind, changes = [];
      if (!b && c) kind = 'added'; else if (b && b.status !== 'cancelled' && !c) kind = 'removed';
      else if (b && c) { const diff = []; ['title', 'date', 'start', 'status'].forEach(k => { if (b[k] !== c[k]) diff.push(`${k}: ${b[k] || '—'} → ${c[k] || '—'}`); }); const plus = c.modules.filter(m => !b.modules.includes(m)), minus = b.modules.filter(m => !c.modules.includes(m)); if (plus.length || minus.length) diff.push('modules ' + [...plus.map(m => '+' + ml(m)), ...minus.map(m => '−' + ml(m))].join(' ')); if (b.deps.join() !== c.deps.join()) diff.push(`depends on ${b.deps.map(n => 'S' + n).join(', ') || 'nothing'} → ${c.deps.map(n => 'S' + n).join(', ') || 'nothing'}`); kind = diff.length ? 'modified' : 'unchanged'; changes = diff; }
      else return;
      const order = c && c.date ? c.deps.filter(n => { const dsrc = cur.find(x => x.no === n); return dsrc && dsrc.date && dsrc.date > c.date; }) : [];
      const manualKept = c0 && base.published && baseById[id] ? manual(c0) : [];
      const conflict = (nt && nt.conflict) || (kind === 'removed' && dropped.has(id) ? '' : '');
      rows.push({ id, kind, before: b, after: c, changes, why: nt ? nt.msgs.join('; ') : '', conflict: nt ? nt.conflict : '', manual: manualKept, order, sel: kind !== 'unchanged' && !(nt && nt.conflict) && (kind === 'added' || !!nt) }); });
    rows.sort((a, b) => ((a.after || a.before).no || 0) - ((b.after || b.before).no || 0));
    return { at: new Date().toISOString(), baseLabel: base.label, published: base.published, rows, sessions: cur };
  }

  const KC = { added: 'green', removed: 'red', modified: 'tbc', unchanged: 'low' }; const KL = { added: 'Added', removed: 'Removed', modified: 'Modified', unchanged: 'Unchanged' };
  V.schedChanges = { html() {
    const pr = S.ui.schedProp; const ro = S.readonly; const base = baseline();
    const head = `<div class="notice" style="margin-bottom:12px"><div><b>Approved schedule:</b> ${esc(base.label)}.<br>A new schedule is built from the current sessions (your manual edits are kept), takes modules that left scope off their sessions, and adds sessions for in-scope modules that have none, in dependency order. Nothing changes until you choose the changes and confirm. The schedule already published to the customer is never overwritten; publish again afterwards to release the update.</div></div><div class="row" style="margin-bottom:12px">${ro ? '' : `<button class="btn primary" data-act="spGenerate" id="spGenerate">Generate proposal</button>`}${pr ? '<button class="btn" data-act="spDiscard" id="spDiscard">Discard proposal</button>' : ''}</div>`;
    if (!pr) return head + '<div class="card empty"><h3>No proposal yet</h3><p>Generate a proposal to see what would be added, removed or changed compared with the approved schedule.</p></div>';
    const n = k => pr.rows.filter(r => r.kind === k).length; const sel = pr.rows.filter(r => r.sel).length; const sn = no => 'S' + no;
    return head + `<div class="row" style="margin-bottom:10px;gap:8px">${['added', 'removed', 'modified', 'unchanged'].map(k => `<span data-count="${k}">${tag(KC[k], KL[k] + ' ' + n(k))}</span>`).join('')}${pr.rows.some(r => r.conflict) ? `<span>${tag('red', pr.rows.filter(r => r.conflict).length + ' conflict(s)')}</span>` : ''}</div>
      <div class="tbl-wrap"><table class="tbl" id="spTable"><thead><tr><th style="width:36px"></th><th>Session</th><th>Change</th><th>Dates</th><th>Modules</th><th>Dependencies</th><th>Notes</th></tr></thead><tbody>${pr.rows.map((r, i) => { const a = r.after, b = r.before, x = a || b; const mods = a ? a.modules.map(ml).join(', ') : b.modules.map(ml).join(', ');
        return `<tr data-row="${r.kind}" class="${r.conflict ? 'conf' : ''}"><td>${r.kind === 'unchanged' || ro ? '' : `<input type="checkbox" data-act="spToggle" data-i="${i}" ${r.sel ? 'checked' : ''} aria-label="Apply this change">`}</td>
        <td class="small"><b>${sn(x.no)}</b> ${esc(x.title)}</td><td>${tag(KC[r.kind], KL[r.kind])}${r.changes.length ? `<div class="xs">${r.changes.map(c => `<div>${esc(c)}</div>`).join('')}</div>` : ''}</td>
        <td class="xs">${b && a && b.date !== a.date ? `${esc(b.date || '—')} → <b>${esc(a.date || '—')}</b>` : esc((a || b).date || 'no date')}</td><td class="xs">${esc(mods)}</td><td class="xs">${a ? a.deps.map(sn).join(', ') || '—' : (b.deps || []).map(sn).join(', ') || '—'}${r.order.length ? `<div style="color:var(--fc-danger)">${r.order.map(sn).join(', ')} is scheduled after this session</div>` : ''}</td>
        <td class="xs">${esc(r.why)}${r.manual.length ? `<div>${tag('blue', 'Manual edit kept')} ${esc(r.manual.join(', '))}</div>` : ''}${r.conflict ? `<div style="color:var(--fc-danger)"><b>Conflict:</b> ${esc(r.conflict)}</div>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="row" style="margin-top:12px"><span class="xs muted">${sel} change(s) selected. Conflicts are not selected until you tick them.</span><span class="spacer"></span>${ro ? '' : `<button class="btn primary" data-act="spApply" id="spApply" ${sel ? '' : 'disabled'}>Review and apply selected</button>`}</div>`;
  } };
  ACT.spGenerate = () => { S.ui.schedProp = propose(); V.render(); };
  ACT.spDiscard = () => { S.ui.schedProp = null; V.render(); };
  ACT.spToggle = a => { const r = S.ui.schedProp.rows[+a.getAttribute('data-i')]; r.sel = a.checked; V.render(); };
  ACT.spApply = async () => {
    const pr = S.ui.schedProp; const d = V.plannerDoc(); const pick = pr.rows.filter(r => r.sel && r.kind !== 'unchanged'); if (!pick.length) return; const c = k => pick.filter(r => r.kind === k).length; const cf = pick.filter(r => r.conflict).length;
    if (!(await confirmDialog('Apply schedule changes', `Apply ${pick.length} change(s) to the planner: ${c('added')} added, ${c('modified')} modified, ${c('removed')} removed${cf ? `, including ${cf} flagged as conflict(s)` : ''}? The schedule published to the customer does not change until you publish again. Removed sessions are cancelled, not deleted.`, 'Apply'))) return;
    pick.forEach(r => { if (r.kind === 'added') { const ns = pr.sessions.find(s => s.id === r.id); if (ns && !d.sessions.some(s => s.id === ns.id)) d.sessions.push(F.clone(ns)); }
      else if (r.kind === 'removed') { const s = d.sessions.find(x => x.id === r.id); if (s) s.status = 'cancelled'; }
      else if (r.kind === 'modified') { const s = d.sessions.find(x => x.id === r.id), n = pr.sessions.find(x => x.id === r.id); if (s && n) { s.modules = n.modules.slice(); } } });
    d.scheduleChanges = (d.scheduleChanges || []).concat({ at: new Date().toISOString(), by: S.user.name, added: c('added'), modified: c('modified'), removed: c('removed'), conflicts: cf, base: pr.baseLabel }).slice(-30);
    S.ui.schedProp = null; F.changed('Schedule changes applied', `${pick.length} change(s)`, { section: 'planner' }); toast(`${pick.length} change(s) applied. Publish the schedule to release them to the customer.`, 5000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
