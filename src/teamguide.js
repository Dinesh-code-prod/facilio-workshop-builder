/* Team guide: a roadmap-style walkthrough of what a teammate can do at each delivery stage, with a button that opens the right page.
   Opened from the home page ("Team guide"). Uses the same drawer as other forms. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const STEPS = [
    ['Kick-off & Discovery', '#1570EF', 'kickoff', 'Start here', ['Set up the contract, integrations and the kick-off deck (a new project can start from a signed contract: Claude reads it, you approve it in Transfers, then press Start project)', 'Build the project plan and timeline with the customer'], 'Kick-off Deck'],
    ['Workshops', '#1570EF', 'planner', 'Run the sessions', ['Plan sessions and send the schedule', 'Paste or upload notes and transcripts; requirements are pulled out for you to confirm'], 'Workshop Planner'],
    ['Requirements', '#2F6FE0', 'transcripts', 'Capture & confirm', ['Turn transcripts into requirements', 'Mark each requirement confirmed with the customer'], 'Transcripts & Requirement Confirmation'],
    ['BRD & Sign-off', '#2F6FE0', 'brd', 'Agree the document', ['Generate the BRD from confirmed requirements', 'Track versions and approvals'], 'BRD Draft'],
    ['Configuration', '#0F57BD', 'modules', 'Build it', ['Design modules and forms in the Form Builder', 'Draw state flows; define roles and access'], 'System Modules & Form Builder'],
    ['UAT & Defects', '#0F57BD', 'delivery', 'Test it', ['Log UAT findings and defects', 'Track fixes through to retest'], 'Build, UAT & Go-Live'],
    ['FTR & KPIs', '#1D1A5E', 'ftr', 'Validate', ['Import the FTR workbook and map the columns', 'Prepare KPI workbooks'], 'FTR Report (Excel)'],
    ['Training & Guides', '#1D1A5E', 'guidebuilder', 'Teach it', ['Build user guides from your configuration', 'Turn a screen recording into a step-by-step guide'], 'User Guide Builder'],
    ['Go-Live Readiness', '#24216F', 'delivery', 'Launch', ['Run the go-live checklist and data clean-up', 'Confirm sign-offs before launch'], 'Build, UAT & Go-Live'],
    ['Hypercare', '#E5197F', 'hypercare', 'Stay close', ['Log issues raised after launch and their fixes', 'Share status with the customer'], 'Hypercare'],
    ['Handover', '#E5197F', 'handover', 'Hand over', ['Move to steady-state support with a clear handover pack', 'Record who owns what'], 'Handover & Closure'],
    ['Closure', '#17B3AE', 'handover', 'Close', ['Review outcomes and lessons learned', 'Formally close the project'], 'Handover & Closure']
  ];
  const TIPS = [['Guides with Claude', 'On Training guides, say what you need (user guide, UAT guide, training guide, video script) and send it. Claude writes a draft for you to approve. To change one later, pick Change one and say what to change.'], ['Customer mail', 'On Tasks, open Mail inbox: press Find mail with Claude (or add .eml files). Accept a mail to make its task; the task closes itself when the Studio holds the fact, then Claude drafts the reply for you to approve and send from Outlook.'], ['AI assistant', 'Open Deliverables & AI in any project to draft notes, requirements and guides.'], ['Timeline and PDF', 'Use the date-range button on dashboards to filter by period, then Export PDF.'], ['Templates', 'Save a finished project as a template and start the next one from it.'], ['Roadmap view', 'Project Roadmap in the sidebar shows where each stage stands.']];
  function body() {
    return `<p class="tg-lead">Twelve stages, start to finish. Pick a stage to see what you can do there, then open it in your latest project.</p>
      <ol class="tg-road">${STEPS.map((s, i) => `<li class="tg-step" style="--c:${s[1]}"><span class="tg-node" aria-hidden="true">${i + 1}</span><div class="tg-card"><div class="tg-top"><h3>${esc(s[0])}</h3><span class="tg-tag">${esc(s[3])}</span></div><ul>${s[4].map(x => `<li>${esc(x)}</li>`).join('')}</ul><button type="button" class="btn sm tg-go" data-act="tgGo" data-view="${s[2]}">Open ${esc(s[5])}</button></div></li>`).join('')}</ol>
      <h3 class="tg-h">Good to know</h3><div class="tg-tips">${TIPS.map(t => `<div class="tg-tip"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div>`).join('')}</div>`;
  }
  V.teamGuide = () => { if (V.openDrawer) V.openDrawer('Team guide', body(), '<button class="btn primary" data-act="closeDrawer">Close</button>', { wide: true }); };
  ACT.teamGuide = () => V.teamGuide();
  ACT.tgGo = a => { const v = a.getAttribute('data-view'); if (ACT.closeDrawer) ACT.closeDrawer(); if (ACT.ppStage) ACT.ppStage({ getAttribute: () => v }); };
})(typeof window !== 'undefined' ? window : globalThis);
