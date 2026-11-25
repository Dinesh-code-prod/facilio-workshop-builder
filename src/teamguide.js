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
  const TIPS = [['The agreed BRD', 'If the customer agreed a BRD written outside the Studio, import it on the BRD tab and make it the agreed BRD, then press Bring it into the project. Claude lists what is new, changed, not in the BRD, answered and in conflict; you apply each change, and mock-ups, UAT and guides follow it.'], ['Guides with Claude', 'On Training guides, say what you need (user guide, UAT guide, training guide, video script) and send it. Claude writes a draft for you to approve. Tick Meteor mock-ups and Claude writes their screens into the guide. On the Mockup tab, Send to Meteor starts a prototype in the Meteor project of the customer (Link Meteor and Comet projects links it once), and each card shows its Meteor prototype and when Meteor has a newer version. Paste Comet video or guide links on the Videos tab: they open inside the Studio. To change a guide later, pick Change one and say what to change.'], ['Customer mail', 'On Tasks, open Mail inbox: press Find mail with Claude (or add .eml files). Accept a mail to make its task; the task closes itself when the Studio holds the fact, then Claude drafts the reply for you to approve and send from Outlook. In the Mail tab, Reply, Reply all and Forward write a ready draft (thanks, attachments, your questions, task state) and open it in Outlook. Bigger view opens mail or a task full size.'], ['AI assistant', 'Open Deliverables & AI in any project to draft notes, requirements and guides.'], ['Timeline and PDF', 'Use the date-range button on dashboards to filter by period, then Export PDF.'], ['Templates', 'Save a finished project as a template and start the next one from it.'], ['Stages', 'Home > Project cycle > Stages shows where each stage stands, with the roadmap checkpoints inside each stage; a checkpoint opens its page.'], ['Plan timeline', 'Project introduction > Project plan > Timeline & planning is the one plan: drag bars to move them, Undo (or Ctrl+Z) puts a change back, and Export gives an Excel workbook or an HTML page of the Gantt.']];
  function body() {
    return `<p class="tg-lead">Twelve stages, start to finish. Pick a stage to see what you can do there, then open it in your latest project.</p>
      <ol class="tg-road">${STEPS.map((s, i) => `<li class="tg-step" style="--c:${s[1]}"><span class="tg-node" aria-hidden="true">${i + 1}</span><div class="tg-card"><div class="tg-top"><h3>${esc(s[0])}</h3><span class="tg-tag">${esc(s[3])}</span></div><ul>${s[4].map(x => `<li>${esc(x)}</li>`).join('')}</ul><button type="button" class="btn sm tg-go" data-act="tgGo" data-view="${s[2]}">Open ${esc(s[5])}</button></div></li>`).join('')}</ol>
      <h3 class="tg-h">Good to know</h3><div class="tg-tips">${TIPS.map(t => `<div class="tg-tip"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div>`).join('')}</div>`;
  }
  V.teamGuide = () => { if (V.openDrawer) V.openDrawer('Team guide', body(), '<button class="btn primary" data-act="closeDrawer">Close</button>', { wide: true }); };
  ACT.teamGuide = () => V.teamGuide();
  ACT.tgGo = a => { const v = a.getAttribute('data-view'); if (ACT.closeDrawer) ACT.closeDrawer(); if (ACT.ppStage) ACT.ppStage({ getAttribute: () => v }); };
})(typeof window !== 'undefined' ? window : globalThis);
