/* "How to use this section" guides for Transcripts & Requirement Confirmation and Checks & Validations, and the short
   hints shown on each tab. Every statement describes what the application actually does; the live line in each step reads
   the project's own data. Progress (steps opened) is kept per browser and project. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { drawer, closeDrawer, ico } = V;
  const nav = o => `data-act="hwGo" data-nav="${esc(JSON.stringify(o))}"`;
  const tr = () => { const d = F.doc('transcripts'); return { items: (d.items || []).filter(i => !i.superseded), cands: d.candidates || [], hist: d.history || [] }; };
  const reqs = () => S.ws.requirements || [];
  const nReq = s => reqs().filter(r => (r.status || 'Draft') === s).length;
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

  // ---------- Transcripts & Requirement Confirmation ----------
  const TRANSCRIPTS = [
    { t: 'Upload workshop transcripts', tab: 'upload', go: ['Open Transcripts', { view: 'transcripts', trTab: 'upload' }],
      say: 'Each transcript belongs to one requirement session. Linking it to the session and the modules discussed is what lets the review queue suggest the right module.',
      do: ['Press Upload transcript. Supported files: .vtt, .srt, .txt, .docx and .json.', 'Pick the Requirement session (from the Session Planner). Modules discussed: choose them, or leave it empty to compare against all in-scope modules.', 'The analysis runs in your browser with rules. Nothing is sent to an external AI service.', 'The Status column goes Uploaded → Analysed. Candidates exist only once it shows Analysed. If it does not, press Analyse.'],
      fix: ['Wrong session or modules: press the pencil on the row, correct them, then Analyse again.', 'Incomplete or wrong file: use Replace transcript. The previous version is kept, pending statements from it are closed, and decisions already made are kept.', 'A file that cannot be read: save it as .txt or .docx and upload that.'],
      live: () => { const x = tr(); return `${plural(x.items.length, 'transcript', 'transcripts')} uploaded, ${x.items.filter(i => i.status === 'analysed' || i.status === 'reviewed').length} analysed.`; } },
    { t: 'Review the Review queue', tab: 'review', go: ['Open Review queue', { view: 'transcripts', trTab: 'review' }],
      say: 'Every card is one statement from a transcript, with the speaker, line, the suggested category, statement type, modules and why the analysis chose them.',
      do: ['Read what the customer actually said, and open Show surrounding conversation when it is unclear.', 'Decide what it is: a real requirement, a question, a tentative suggestion, or background about the current process.', 'Check the suggested category: New requirement, Change to existing configuration, Contradiction, Possible customization, Already covered by configuration, Cross-module dependency, Open question, Missing information, Not yet confirmed, or Current process (context).', 'Filters: To review / Accepted / Merged / Rejected, then transcript, module, statement type (Request, Explanation, Tentative, Confirmed in session) and category.', 'Decide: Accept opens a requirement pre-filled from the statement. Clarify records a question. Merge adds its text to an existing requirement or to another statement. Reject asks for a reason from a list, which is saved in History.'],
      fix: ['Do not accept or reject just to empty the queue. A rejection is saved in History with your name and the reason.', '"Confirmed in session" only means someone said it was agreed. It does not mean the customer has confirmed the requirement.'],
      live: () => { const x = tr(); const p = x.cands.filter(c => c.status === 'pending').length, c = x.cands.filter(c => c.status === 'clarify').length; return `${plural(p, 'statement', 'statements')} to review, ${c} needing clarification, ${x.cands.filter(c => c.category === 'contradiction' && (c.status === 'pending' || c.status === 'clarify')).length} open contradiction(s).`; } },
    { t: 'Review the Requirements register', tab: 'register', go: ['Open Requirements register', { view: 'transcripts', trTab: 'register' }],
      say: 'The register holds every requirement with its source, modules, classification and status. Accepting a statement creates a Draft requirement here; it is not yet confirmed.',
      do: ['Check the statement, modules, classification (existing, change, new, custom) and the Source link back to the transcript line.', 'Look for duplicates: search the register, and merge the wording into one requirement. Edit unclear wording and add acceptance criteria.', 'Link a requirement to the configuration it changes through its modules, fields, actors and transitions in the requirement form.', 'Statuses: Draft (waiting for the customer), Confirmed (reaches the BRD), Deferred, Rejected.'],
      fix: ['Accepted is not Confirmed. A requirement becomes Confirmed only when you set the status and record who confirmed it and when.'],
      live: () => `${nReq('Confirmed')} Confirmed · ${nReq('Draft')} Draft · ${nReq('Deferred')} Deferred · ${nReq('Rejected')} Rejected.` },
    { t: 'Resolve Open questions', tab: 'questions', go: ['Open Open questions', { view: 'transcripts', trTab: 'questions' }],
      say: 'Open questions hold decisions nobody has made yet. They stay visible in Checks & Validations until they are closed.',
      do: ['Add a question with the area or module, and who owns it: Customer or Facilio internal. Clarify on a statement also creates one linked to its session.', 'Set the status: Open, Answered or Closed, and type the answer or decision in the Answer box when you receive it.', 'Then update the requirement that the answer affects, so the register and the BRD show the decision. The question does not change the requirement by itself.', 'Customer questions sent from the Customer User Guide are managed under Customer User Guide › Questions & feedback.'],
      fix: ['Do not type an answer you were not given. Leave the question open until the customer or the owner has answered.'],
      live: () => { const q = S.ws.questions || []; return `${q.filter(x => x.status === 'open').length} open, ${q.filter(x => x.status === 'answered').length} answered but not closed, ${q.filter(x => x.status === 'closed').length} closed.`; } },
    { t: 'Use History for traceability', tab: 'history', go: ['Open History', { view: 'transcripts', trTab: 'history' }],
      say: 'History lists the review decisions taken on transcripts and statements, with who and when.',
      do: ['It records: transcript analysed, transcript details updated, candidate accepted, edited, merged or rejected, and clarification requested.', 'Use it to see why a statement was rejected, or which requirement an accepted statement became.', 'Changes made later to a requirement itself (wording, status, confirmation) are in Checks & Validations › Activity log, not here.'],
      fix: ['Uploads and replacements of a transcript file are not listed as separate events.'],
      live: () => `${plural(tr().hist.length, 'review event', 'review events')} recorded.` },
    { t: 'Confirm requirements for BRD use', tab: 'register', go: ['Open Requirements register', { view: 'transcripts', trTab: 'register' }],
      say: 'Only requirements with the status Confirmed are written into the BRD as requirements. The others are listed as open items.',
      do: ['Candidate waiting for review → still in the Review queue (a warning in Validation).', 'Accepted or merged → a Draft requirement (or text added to one). Draft requirements are listed in Validation as awaiting customer confirmation.', 'Needs clarification → an Open question until answered.', 'Rejected → kept in History, never in the BRD.', 'Confirmed → open the requirement, set Status to Confirmed and fill Confirmed by (the customer stakeholder) and the date. The form will not save Confirmed without a name.'],
      fix: ['Confirm only when the customer has actually agreed (a meeting decision, an email, a sign-off). Put the evidence in the notes.'],
      live: () => `${nReq('Confirmed')} requirement(s) will appear in the BRD; ${nReq('Draft')} are still drafts.` },
    { t: 'How this connects to Checks & Validations', tab: null, go: ['Open Checks & Validations', { view: 'checks', chkTab: 'summary' }],
      say: 'The two sections are one workflow towards the BRD.',
      flow: true }
  ];

  // ---------- Checks & Validations ----------
  const sev = () => { const v = V.validation ? V.validation() : []; return { b: v.filter(x => x.sev === 'blocking').length, w: v.filter(x => x.sev === 'warning').length, i: v.filter(x => x.sev === 'info').length }; };
  const CHECKS = [
    { t: 'Start with Readiness', tab: 'summary', go: ['Open Readiness', { view: 'checks', chkTab: 'summary' }],
      say: 'Readiness shows, from the saved project data, whether the BRD can be shared and what to do next. Every tile opens the place where you fix it.',
      do: ['Blocking issues: the BRD cannot be signed off until these are fixed (for example an unresolved contradiction or a missing source configuration).', 'Warnings: work that should be reviewed, such as unreviewed modules or draft requirements. The BRD can still be shared as a draft with these listed.', 'Informational: things worth knowing, such as an unpublished user guide or a missing logo. They never block.', 'Tiles: Modules reviewed, Sessions completed, Requirements confirmed, Transcript items to review, In-scope modules without a session, Unanswered customer questions, BRD status.', 'A tile that is not at its target means work is open. Open the tile and check the modules, not the count.'],
      fix: ['A low count of problems is not proof of completeness: if no sessions or transcripts exist, the BRD has little evidence behind it.'],
      live: () => { const s = sev(); return `${s.b} blocking · ${s.w} warnings · ${s.i} informational.`; } },
    { t: 'Review Validation findings', tab: 'validation', go: ['Open Validation', { view: 'checks', chkTab: 'validation' }],
      say: 'Each row groups identical findings. It shows the severity, the area, what was detected and the records affected.',
      do: ['Open the record from the row. The link goes to the module, requirement, flow, role or transcript item.', 'Example: "Business objective missing" means the module has no stated reason for the change. Capture it from the workshop or ask the customer; do not invent one.', 'Example: "Actor role not confirmed" means a state transition uses a role nobody has verified against the Roles view. Check it with the customer, then confirm it.', 'After the fix the finding disappears on its own, because findings are recalculated from the data each time.'],
      fix: ['Do not fill a field with an assumption only to clear a warning. If it is unknown, leave it and keep the open question.'],
      live: () => { const s = sev(); return `${s.b} blocking, ${s.w} warning, ${s.i} informational finding(s).`; } },
    { t: 'Review Module status', tab: 'modules', go: ['Open Module status', { view: 'checks', chkTab: 'modules' }],
      say: 'Each in-scope module has a review status that you set. It is the team\'s record that the module was actually reviewed.',
      do: ['Statuses: Not started, Scheduled, In progress, Reviewed — no changes, Reviewed — changes proposed, Pending customer confirmation, Pending internal review, Completed.', 'Reviewed — no changes counts as reviewed. A module with its standard configuration unchanged is complete once the team has recorded that decision.', 'Scheduled and In progress are suggested from the sessions in the Session Planner until someone sets a status.'],
      fix: ['Set Reviewed — no changes only after the module was discussed or checked, not as a shortcut.'],
      live: () => { const m = F.allModules().filter(x => x.inScope); const st = m.map(x => V.moduleStatus(x.name)); const done = st.filter(s => ['completed', 'reviewed_no_change', 'reviewed_changes'].includes(s)).length; return `${done} of ${m.length} in-scope modules reviewed.`; } },
    { t: 'Review Scope coverage', tab: 'coverage', go: ['Open Scope coverage', { view: 'checks', chkTab: 'coverage' }],
      say: 'Scope coverage compares the MSA scope, the modules marked in scope, the sessions planned and the requirements.',
      do: ['In-scope modules without a session: plan a session or record why none is needed.', 'MSA items not matched to a module, or matched but not in scope: confirm them in the Session Planner › MSA & scope.', 'Requirements without a module: open the requirement and set its module.', 'An item you excluded on purpose is not a gap. Mark it Excluded in the planner so the reason is kept.'],
      fix: ['The goal is that everything in the agreed scope was considered. It is not to add every Facilio module to the BRD.'],
      live: () => `${plural((V.uncoveredModules ? V.uncoveredModules() : []).length, 'in-scope module', 'in-scope modules')} without a session; ${reqs().filter(r => !(r.modules || []).length).length} requirement(s) without a module.` },
    { t: 'Review Confirmation records', tab: 'records', go: ['Open Confirmation records', { view: 'checks', chkTab: 'records' }],
      say: 'Confirmation records list each review decision saved on a module, flow, form or roles: date, reviewer, status, decision, notes and what is outstanding.',
      do: ['Look for modules whose status says Pending customer confirmation or Pending internal review, and for outstanding items.', 'Requirements awaiting customer confirmation are in the Requirements register (status Draft) and in Validation.', 'Open questions that are unanswered are in Transcripts › Open questions.'],
      fix: ['Never mark something customer-confirmed without a real confirmation (a meeting decision, an email or a sign-off). Record who confirmed and when.'],
      live: () => { let n = 0; Object.values(F.doc('reviews').modules || {}).forEach(R => Object.values(R).forEach(r => { if (r && r.status) n++; })); return `${plural(n, 'confirmation record', 'confirmation records')} saved.`; } },
    { t: 'Review the Change summary', tab: 'changes', go: ['Open Change summary', { view: 'checks', chkTab: 'changes' }],
      say: 'The change summary lists what the workshop proposes against the standard configuration: additions, modifications, proposed removals and scope or priority decisions.',
      do: ['Check each line against its module and the requirement that asked for it.', 'Everything here is a proposal in the BRD. Nothing is applied to the customer\'s Facilio organisation.', 'Role and permission changes are reviewed in Roles & Access Permissions; state-flow changes in the State Flow Builder.'],
      fix: ['Do not describe a proposal as implemented in the BRD review.'],
      live: () => { const c = F.changeSummary(); return `${c.additions.length} additions, ${c.modifications.length} modifications, ${c.removals.length} proposed removals, ${c.decisions.length} scope or priority decisions.`; } },
    { t: 'Review the Activity log', tab: 'log', go: ['Open Activity log', { view: 'checks', chkTab: 'log' }],
      say: 'The activity log lists what the app recorded when someone changed the project: the time, the person, the action and a detail.',
      do: ['Use it to see who changed a requirement, a status or a plan, and when.', 'Only recorded changes appear. Anything not recorded cannot be reconstructed from here.'],
      fix: [], live: () => `${plural((S.ws.log || []).length, 'event', 'events')} recorded.` },
    { t: 'How this connects to Transcripts', tab: null, go: ['Open Transcripts', { view: 'transcripts', trTab: 'review' }], say: 'The two sections are one workflow towards the BRD.', flow: true }
  ];
  const FLOW = ['Upload and analyse the workshop transcripts (Transcripts › Transcripts).', 'Review each statement and classify it (Review queue).', 'Accept, merge, clarify or reject based on what was actually said.', 'Update the Requirements register and answer Open questions.', 'Confirm the requirements that are ready for the BRD, with who confirmed.', 'Open Checks & Validations.', 'Read Readiness and the Validation findings.', 'Check Module status and Scope coverage.', 'Check Confirmation records and the Change summary.', 'Fix the blocking issues; keep warnings and open questions visible.', 'Generate or update the BRD draft (BRD Draft).', 'Read the draft and check that every statement matches the confirmed source.'];
  const GUIDES = { transcripts: { title: 'Transcripts & Requirement Confirmation', steps: TRANSCRIPTS, other: 'checks' }, checks: { title: 'Checks & Validations', steps: CHECKS, other: 'transcripts' } };

  // ---------- progress (per browser and project) ----------
  const pk = id => 'fwb_howto_' + (S.project && S.project.id) + '_' + id;
  const seen = id => { try { return new Set(JSON.parse(localStorage.getItem(pk(id)) || '[]')); } catch (e) { return new Set(); } };
  const mark = (id, i) => { const s = seen(id); s.add(i); try { localStorage.setItem(pk(id), JSON.stringify([...s])); } catch (e) { } };

  function body(id, i) {
    const g = GUIDES[id]; const st = g.steps[i]; const sn = seen(id); const live = st.live ? st.live() : '';
    const dots = g.steps.map((x, k) => `<button class="hw-dot ${k === i ? 'on' : sn.has(k) ? 'done' : ''}" data-act="hwStep" data-id="${id}" data-i="${k}" title="${esc(x.t)}" aria-label="Step ${k + 1}: ${esc(x.t)}"></button>`).join('');
    return `<div class="hw"><div class="hw-top"><span>Step ${i + 1} of ${g.steps.length}</span><span class="muted">${sn.size} of ${g.steps.length} opened</span></div><div class="hw-dots">${dots}</div><h3>${esc(st.t)}</h3><p>${esc(st.say)}</p>
      ${st.flow ? `<ol class="hw-flow">${FLOW.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="small muted">The BRD can be generated as a draft while some items are still open. The draft lists unresolved questions and assumptions as open items. They are not presented as confirmed facts.</p>` : `<ol class="hw-do">${st.do.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${st.fix && st.fix.length ? `<div class="hw-watch"><b>Watch out</b>${st.fix.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : ''}`}
      ${live ? `<div class="hw-live"><b>Right now</b> ${esc(live)}</div>` : ''}
      <div class="hw-nav"><button class="btn" data-act="hwStep" data-id="${id}" data-i="${Math.max(0, i - 1)}" ${i === 0 ? 'disabled' : ''}>Back</button><button class="btn" ${nav(st.go[1])}>${esc(st.go[0])}</button><span class="spacer"></span>${i < g.steps.length - 1 ? `<button class="btn primary" data-act="hwStep" data-id="${id}" data-i="${i + 1}">Next</button>` : `<button class="btn primary" data-act="closeDrawer">Done</button>`}</div></div>`;
  }
  function show(id, i) { const g = GUIDES[id]; i = Math.max(0, Math.min(g.steps.length - 1, i)); mark(id, i); S.ui['hw_' + id] = i; drawer('How to use this section: ' + g.title, body(id, i), `<button class="btn" data-act="closeDrawer">Close</button>`, { wide: true }); }
  ACT.hwOpen = a => { const id = a.getAttribute('data-id'); const i = a.getAttribute('data-i'); show(id, i != null ? Number(i) : (S.ui['hw_' + id] || 0)); };
  ACT.hwStep = a => show(a.getAttribute('data-id'), Number(a.getAttribute('data-i')));
  ACT.hwGo = a => { closeDrawer(); const el = document.createElement('div'); el.setAttribute('data-nav', a.getAttribute('data-nav')); ACT.goNav(el); };
  V.howtoButton = id => `<button class="btn" data-act="hwOpen" data-id="${id}" aria-haspopup="dialog">${ico('book')}How to use this section</button>`;

  // ---------- one-line hint under the tabs ----------
  const HINT = {
    transcripts: { upload: ['Upload each workshop transcript and link it to its session. Press Analyse when its status still says Uploaded.', 0], review: ['Decide for every statement: Accept, Clarify, Merge or Reject. Accepting creates a Draft requirement, not a confirmed one.', 1], register: ['Draft requirements wait for the customer. Only Confirmed requirements are written into the BRD.', 2], questions: ['Unresolved decisions. They stay in Checks & Validations until closed. Update the requirement when an answer arrives.', 3], history: ['Review decisions on transcripts and statements. Requirement edits are in Checks › Activity log.', 4] },
    checks: { summary: ['Counts come from the saved project data. Open a tile to fix what is behind it.', 0], validation: ['Blocking = must fix before sign-off. Warning = review, the BRD can still be shared as a draft. Info = good to know.', 1], modules: ['Set what the team actually reviewed. Reviewed — no changes counts as reviewed once you record it.', 2], coverage: ['Compares MSA scope, modules in scope, sessions and requirements. A deliberate exclusion is not a gap.', 3], records: ['Saved review decisions per module, flow, form and roles. Never mark customer-confirmed without a real confirmation.', 4], changes: ['Proposed changes to the standard configuration. Nothing here has been applied to the customer\'s organisation.', 5], log: ['Recorded changes: when, who and what. Unrecorded events cannot be reconstructed.', 6] }
  };
  V.tabHint = (sec, tab) => { const h = (HINT[sec] || {})[tab]; if (!h) return ''; return `<div class="tab-hint"><span>${esc(h[0])}</span><a href="#" data-act="hwOpen" data-id="${sec}" data-i="${h[1]}">Step ${h[1] + 1} of the guide</a></div>`; };
  V.howto = { GUIDES, FLOW };
})(typeof window !== 'undefined' ? window : globalThis);
