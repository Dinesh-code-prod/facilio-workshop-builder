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
  const tile = (i, s, x, y) => { const [lab, col] = ST[s.state]; return `<g class="pr-t" transform="translate(${x},${y})" data-act="nav" data-view="${s.view}" tabindex="0" role="link" aria-label="${esc(s.name)}: ${lab}. ${esc(s.detail)}"><rect x="-4" y="-6" width="96" height="66" fill="transparent"/><g class="pr-in"><path d="M0 22 L44 0 L88 22 L44 44 Z" fill="${col}" opacity=".16"/><path d="M0 22 L44 0 L88 22 L44 44 Z" fill="none" stroke="${col}" stroke-width="1.6"/><path d="M0 22 L0 32 L44 54 L44 44 Z" fill="${col}" opacity=".5"/><path d="M88 22 L88 32 L44 54 L44 44 Z" fill="${col}" opacity=".32"/><text x="44" y="27" text-anchor="middle" font-size="13" font-weight="700" fill="${col}">${i + 1}</text></g></g>`; };
  const PHASES = [['Discover and define', 0, 4], ['Build and validate', 4, 7], ['Launch', 7, 10], ['Hand over', 10, 12]];
  const MARK = { none: '○', progress: '◐', done: '✓' };
  V.roadmapReady = () => { I().load(KINDS); return I().ready(['scope', 'build', 'uat', 'checklist']); };
  // one-line summary reused by the Project Overview: counts, current stage, and a segmented bar
  V.roadmapStrip = () => {
    if (!V.roadmapReady()) return '';
    const L = stages(); const done = L.filter(s => s.state === 'done').length; const cur = L.findIndex(s => s.state !== 'done');
    return `<div class="card rm-strip"><div class="rm-strip-h"><div><h3>Delivery progress</h3><p class="small muted">${done} of ${L.length} stages complete${cur >= 0 ? ' · Current stage: <b>' + esc(L[cur].name) + '</b>' : ' · All stages complete'}</p></div><button class="btn sm" data-act="nav" data-view="proadmap">Open roadmap</button></div><div class="rm-seg" role="img" aria-label="${done} of ${L.length} stages complete">${L.map((x, i) => `<i class="${x.state}${i === cur ? ' cur' : ''}" title="${i + 1}. ${esc(x.name)}: ${ST[x.state][0]}"></i>`).join('')}</div></div>`;
  };
  V.proadmap = {
    html() {
      if (!V.roadmapReady()) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const L = stages(); const n = k => L.filter(s => s.state === k).length; const done = n('done'), prog = n('progress'), none = n('none'); const cur = L.findIndex(s => s.state !== 'done');
      const card = (s, i) => `<li><button type="button" class="rm-c ${s.state}${i === cur ? ' cur' : ''}" data-act="nav" data-view="${s.view}" aria-label="Stage ${i + 1}, ${esc(s.name)}: ${ST[s.state][0]}. ${esc(s.detail)}. Open"><span class="rm-n">${i + 1}</span><span class="rm-b"><b>${esc(s.name)}</b><span class="rm-s">${MARK[s.state]} ${ST[s.state][0]}${i === cur ? ' · Current' : ''}</span><span class="rm-d">${esc(s.detail)}</span></span><span class="rm-go" aria-hidden="true">›</span></button></li>`;
      return `<div class="page-header"><div class="t"><h1>Project Roadmap</h1><p>The twelve delivery stages in order. Status comes only from what is recorded in the project. Select a stage to open its work.</p></div></div>
      <div class="page-body"><div class="card rm-sum"><div class="rm-counts"><div><b>${done}</b><span>Complete</span></div><div><b>${prog}</b><span>In progress</span></div><div><b>${none}</b><span>Not started</span></div></div><div class="rm-seg" role="img" aria-label="${done} of ${L.length} stages complete">${L.map((x, i) => `<i class="${x.state}${i === cur ? ' cur' : ''}" title="${i + 1}. ${esc(x.name)}: ${ST[x.state][0]}"></i>`).join('')}</div></div>
      ${PHASES.map(([t, a, b]) => `<section class="rm-ph"><h2>${esc(t)}<span class="muted">Stages ${a + 1}${b - a > 1 ? ' to ' + b : ''}</span></h2><ol class="rm-grid">${L.slice(a, b).map((s, k) => card(s, a + k)).join('')}</ol></section>`).join('')}</div>`;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
