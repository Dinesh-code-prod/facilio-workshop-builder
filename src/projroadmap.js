/* Project roadmap: the twelve delivery stages with status taken ONLY from recorded project data (never from animation).
   Reuses existing records; each tile opens the screen where that stage is worked on. Isometric-style tiles are original SVG. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const KINDS = ['scope', 'build', 'uat', 'usecase', 'checklist', 'hc', 'ho', 'close', 'ugd', 'rep', 'signoff'];
  const ST = { none: ['Not started', '#98A2B3'], progress: ['In progress', '#1570EF'], done: ['Complete', '#027A48'] };
  function stages() {
    const ses = (F.doc('planner').sessions || []).filter(s => s.status !== 'cancelled'); const sesDone = ses.filter(s => s.status === 'completed').length;
    const reqs = (S.ws.requirements || []).filter(r => r.status !== 'Rejected'); const conf = reqs.filter(r => r.status === 'Confirmed').length;
    const brd = F.doc('brddoc') || {}; const mods = F.allModules().filter(m => m.inScope);
    const built = mods.filter(m => ((I().get('build', F.slug(m.name)) || {}).status) === 'Completed').length; const started = mods.filter(m => ((I().get('build', F.slug(m.name)) || {}).status || 'Not started') !== 'Not started').length;
    const uats = I().list('uat'); const ftr = F.doc('ftr_wb') || {}; const gl = I().list('checklist').filter(c => c.group === 'golive'); const glDone = gl.filter(c => c.done).length;
    const guides = I().list('ugd'); const gApproved = guides.filter(g => g.status === 'approved').length;
    const hc = I().get('close', 'hypercare') || {}; const hos = I().list('ho'); const hoDone = hos.filter(h => h.done).length; const closed = I().get('close', 'closure') || I().get('close', 'main') || null;
    const mk = (state, detail) => ({ state, detail });
    return [
      ['Discovery', 'msaflow', I().get('scope', 'main') ? mk('progress', 'Scope recorded') : mk('none', 'No scope recorded')],
      ['Workshops', 'planner', ses.length ? mk(sesDone === ses.length ? 'done' : sesDone ? 'progress' : 'none', sesDone + ' of ' + ses.length + ' sessions completed') : mk('none', 'No sessions planned')],
      ['Requirements', 'transcripts', reqs.length ? mk(conf === reqs.length ? 'done' : 'progress', conf + ' of ' + reqs.length + ' confirmed') : mk('none', 'No requirements yet')],
      ['BRD', 'brd', brd.reviewedAt ? mk('done', 'Reviewed ' + V.fmtDate(brd.reviewedAt)) : (brd.exports && brd.exports.length) || Object.keys(brd.edits || {}).length ? mk('progress', 'Draft in progress') : mk('none', 'Not started')],
      ['Configuration', 'delivery', mods.length ? mk(built === mods.length ? 'done' : started ? 'progress' : 'none', built + ' of ' + mods.length + ' modules completed') : mk('none', 'No modules in scope')],
      ['UAT', 'delivery', uats.length ? mk('progress', uats.length + ' session(s) recorded') : mk('none', 'No UAT sessions')],
      ['FTR', 'ftr', (ftr.versions || []).length ? mk('progress', 'Workbook v' + ftr.versions.length + ' saved') : mk('none', 'No workbook saved')],
      ['Training & guides', 'guidebuilder', guides.length ? mk(gApproved === guides.length ? 'done' : 'progress', gApproved + ' of ' + guides.length + ' guides approved') : mk('none', 'No guides yet')],
      ['Go-live', 'delivery', gl.length ? mk(glDone === gl.length ? 'done' : glDone ? 'progress' : 'none', glDone + ' of ' + gl.length + ' checklist items done') : mk('none', 'No checklist')],
      ['Hypercare', 'hypercare', hc.exitAt ? mk('done', 'Exit recorded') : hc.start ? mk('progress', 'Started ' + V.fmtDate(hc.start)) : mk('none', 'Not started')],
      ['Support handover', 'handover', hos.length ? mk(hoDone === hos.length ? 'done' : 'progress', hoDone + ' of ' + hos.length + ' items done') : mk('none', 'No handover items')],
      ['Project closure', 'handover', closed && (closed.signedAt || closed.closedAt || closed.status === 'closed') ? mk('done', 'Closed') : mk('none', 'Not closed')]
    ].map(([name, view, s]) => Object.assign({ name, view }, s));
  }
  V.roadmapStages = stages;
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('pr-t')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  const tile = (i, s, x, y) => { const [lab, col] = ST[s.state]; return `<g class="pr-t" transform="translate(${x},${y})" data-act="nav" data-view="${s.view}" tabindex="0" role="link" aria-label="${esc(s.name)}: ${lab}. ${esc(s.detail)}"><path d="M0 22 L44 0 L88 22 L44 44 Z" fill="${col}" opacity=".16"/><path d="M0 22 L44 0 L88 22 L44 44 Z" fill="none" stroke="${col}" stroke-width="1.6"/><path d="M0 22 L0 32 L44 54 L44 44 Z" fill="${col}" opacity=".5"/><path d="M88 22 L88 32 L44 54 L44 44 Z" fill="${col}" opacity=".32"/><text x="44" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="${col}">${i + 1}</text></g>`; };
  V.proadmap = {
    html() {
      I().load(KINDS); if (!I().ready(['scope', 'build', 'uat', 'checklist'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const L = stages(); const done = L.filter(s => s.state === 'done').length; const cols = 4; const W = 4 * 150 + 40, rowH = 120;
      const pos = L.map((s, i) => { const r = Math.floor(i / cols), c = i % cols; const cc = r % 2 ? cols - 1 - c : c; return [20 + cc * 150, 20 + r * rowH + (cc % 2) * 14]; });
      const path = pos.map(([x, y], i) => (i ? 'L' : 'M') + (x + 44) + ' ' + (y + 22)).join(' ');
      const svg = `<svg class="pr-svg" viewBox="0 0 ${W} ${3 * rowH + 30}" role="img" aria-label="Delivery roadmap"><path d="${path}" fill="none" stroke="#D0D5DD" stroke-width="2" stroke-dasharray="4 5"/>${L.map((s, i) => tile(i, s, pos[i][0], pos[i][1]) + `<text x="${pos[i][0] + 44}" y="${pos[i][1] + 72}" text-anchor="middle" font-size="12" font-weight="600" fill="#101828">${esc(s.name)}</text>`).join('')}</svg>`;
      return `<div class="page-header"><div class="t"><h1>Project Roadmap</h1><p>The twelve delivery stages and where this project stands. Status comes only from what is recorded in the project, so a stage stays "Not started" until something is saved for it. Select a stage to open its screen.</p></div></div>
      <div class="page-body"><div class="card" style="padding:14px"><div class="small muted" style="margin-bottom:6px">${done} of ${L.length} stages complete</div>${svg}</div>
      <div class="card" style="margin-top:14px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stage</th><th>Status</th><th>Recorded</th><th></th></tr></thead><tbody>${L.map((s, i) => `<tr><td><b>${i + 1}. ${esc(s.name)}</b></td><td><span style="color:${ST[s.state][1]};font-weight:600">${ST[s.state][0]}</span></td><td class="small">${esc(s.detail)}</td><td><button class="btn sm ghost" data-act="nav" data-view="${s.view}">Open</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
