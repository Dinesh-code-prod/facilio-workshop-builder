# UI coverage register (generated 2026-11-27 11:50 UTC by tests/ui/ui-coverage.mjs)

Every surface the crawl reached in the staff, customer (preview) and Admin views, measured against the Facilio design system. **Facilio** = no findings; **Partly** = only a few off-palette colours or small text; **Legacy** = non-Roboto text, pill controls or many off-palette colours. "Functional test" here means the surface opened, showed no page error and closed again; forms were never saved. Not reached by a crawl: states that need particular data (e.g. a record in a given state), and any action that would change data. Those are listed in the migration plan.

## Totals

| Group | Identified | Inspected | On the system | Opened OK | Passed | Failed | Blocked | Legacy remaining |
|---|---|---|---|---|---|---|---|---|
| **All** | 439 | 427 | 399 | 427 | 399 | 0 | 12 | 28 |
| POV: Staff · Icons | 179 | 173 | 165 | 173 | 165 | 0 | 6 | 8 |
| POV: Staff · Text | 179 | 173 | 164 | 173 | 164 | 0 | 6 | 9 |
| POV: Customer · Icons | 34 | 34 | 29 | 34 | 29 | 0 | 0 | 5 |
| POV: Customer · Text | 34 | 34 | 29 | 34 | 29 | 0 | 0 | 5 |
| POV: Admin | 13 | 13 | 12 | 13 | 12 | 0 | 0 | 1 |
| Chat panel (Assistant)s | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| Account menus | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| Search overlays | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| Notifications panels | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| Pages | 133 | 133 | 124 | 133 | 124 | 0 | 0 | 9 |
| Tabs | 182 | 170 | 158 | 170 | 158 | 0 | 12 | 12 |
| Drawers | 97 | 97 | 91 | 97 | 91 | 0 | 0 | 6 |
| Dialogs | 19 | 19 | 18 | 19 | 18 | 0 | 0 | 1 |

## Register

| POV | Module | Route/Page | Tab/Subtab | UI Element | How It Opens | Existing UI | New UI Status | Functional Test | Result |
|---|---|---|---|---|---|---|---|---|---|
| Staff · Icons | Shell | — | — | Chat panel (Assistant) | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Shell | — | — | Account menu | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Shell | — | — | Search overlay | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Shell | — | — | Notifications panel | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/projdash | — | Drawer: Claude helper | button "How it works" (helperInfo) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Home | #/lifecycle | — | Page: Project cycle | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Staff · Icons | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 5 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
| Staff · Icons | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Process & checks | #/whiteboard | — | Drawer: New board | button "New board" (wbNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Process & checks | #/rschecks | — | Page: Checks & validations | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Process & checks | #/rschecks | Readiness & validation | Tab: Readiness & validation | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Process & checks | #/rschecks | — | Drawer: Add a check myself | button "Add a check myself" (rsAddCheck) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Module design | #/flow | — | Page: State flow builder | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/flow | States | Tab: States | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/flow | All modules | Tab: All modules | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/modules | — | Page: Forms & templates | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/modules | System485 | Tab: System485 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/modules | Settings and connected apps3 | Tab: Settings and connected apps3 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/modules | In scope | Tab: In scope | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/modules | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/roles | Roles36 | Tab: Roles36 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/roles | Permission checks | Tab: Permission checks | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/roles | — | Drawer: New Role | button "New Role" (newRole) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Solution design & BRD | #/slakpi | KPI matrix 0 | Tab: KPI matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Page: BRD Draft | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: New BRD | button "+ New BRD" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: BRD settings | button "BRD settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: Sample BRD format | button "Sample BRD format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/brd | — | Dialog: Make this the agreed BRD | button "Make this the agreed BRD" (brdAgree) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/governance | Weekly digest | Tab: Weekly digest | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "Change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Training guides | #/guides | Guides | Tab: Guides | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Training guides | #/guides | Videos | Tab: Videos | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Training guides | #/guides | List | Tab: List | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/tasks | — | Page: Tasks | menu | 14 pill (span.pt-st.s-0 "To Do"); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Staff · Icons | Tasks & mail | #/tasks | My private tasks | Tab: My private tasks | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/supportdesk | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/supportdesk | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/supportdesk | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/supportdesk | Facilio Run directory ↗ | Tab: Facilio Run directory ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/transfers | Holding | Tab: Holding | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/golivehc | Hypercare | Tab: Hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Tasks & mail | #/golivehc | — | Drawer: New taskBigger view | button "Log issue as a task" (hcLog) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Tasks & mail | #/golivehc | — | Dialog: Start from what is open | button "Start from what is open" (hcFromOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Tasks & mail | #/golivehc | — | Drawer: Edit issue | button "Edit" (hcEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Project handover | #/handover | Acceptance and closure 0/2 | Tab: Acceptance and closure 0/2 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project handover | #/handover | Packs and reports | Tab: Packs and reports | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Page: Solution document | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: New solution document | button "+ New solution document" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Solution document settings | button "Solution document settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Sample solution document format | button "Sample solution document format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Project handover | #/soldoc | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/statusrep | Monthly report | Tab: Monthly report | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/statusrep | On record 15 | Tab: On record 15 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Reports | #/trace | — | Page: Traceability & quality | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/trace | Gaps to fix 9 | Tab: Gaps to fix 9 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/trace | Lessons learned 2 | Tab: Lessons learned 2 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Reports | #/trace | — | Drawer: Add lesson | button "Add lesson" (trLessonEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Notes & Links | #/resources | Links & resources 1 | Tab: Links & resources 1 | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Notes & Links | #/resources | Team | Tab: Team | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Notes & Links | #/resources | Only me 0 | Tab: Only me 0 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Icons | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Notes & Links | #/resources | — | Drawer: Edit link | button "Edit Riverside tower list (demo)" (resEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Show Facilio | #/dashboards | — | Drawer: New category | button "Category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Show Facilio | #/explore | — | Page: Discover more | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Show Facilio | #/explore | — | Drawer: VisitorsBigger view | button "Learn more" (xpOpen) | 18 pill (span. "Last Visited Spa") | Legacy | opened and closed | Legacy remains |
| Staff · Icons | Help | #/teamhelp | — | Page: Team Guide | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Help | #/teamhelp | — | Dialog: Home | button "Start the guided walk" (tgCoach) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Help | #/teamhelp | — | Drawer: Install the skills in your ClaudeBigger view | button "Install the skills" (skillsHelp) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Help | #/whatsnew | — | Page: What's new | menu | 26 pill (span.wn-a "Team") | Legacy | opened | Legacy remains |
| Staff · Icons | Help | #/feedback | — | Page: Feedback | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Help | #/privacy | — | Page: Privacy & data | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Help | #/privacy | — | Dialog: Request deletion | button "Request deletion of my data" (dsrRequest) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | — | Page: Claude setup | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | Answers waiting | Tab: Answers waiting | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/claudesetup | Claude use | Tab: Claude use | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/webframe | Support Desk | Tab: Support Desk | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/webframe | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/webframe | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Claude & tools | #/webframe | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/settings | — | Page: Project Settings | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/settings | History | Tab: History | tab click | 160 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Staff · Icons | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Settings | #/workspace | — | Page: Tabs & Layouts | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/workspace | Text | Tab: Text | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Dashboard" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Chat panel (Assistant) | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Account menu | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Search overlay | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Notifications panel | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Home | #/lifecycle | — | Page: Project cycle | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/lifecycle | — | Drawer: Claude helper | button "How it works" (helperInfo) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Staff · Text | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 5 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
| Staff · Text | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Process & checks | #/whiteboard | — | Drawer: New board | button "New board" (wbNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Process & checks | #/rschecks | — | Page: Checks & validations | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Process & checks | #/rschecks | Readiness & validation | Tab: Readiness & validation | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Process & checks | #/rschecks | — | Drawer: Add a check myself | button "Add a check myself" (rsAddCheck) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Module design | #/flow | — | Page: State flow builder | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/flow | States | Tab: States | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/flow | All modules | Tab: All modules | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | — | Page: Forms & templates | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | System485 | Tab: System485 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | Settings and connected apps2 | Tab: Settings and connected apps2 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | In scope | Tab: In scope | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | Roles36 | Tab: Roles36 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | Permission checks | Tab: Permission checks | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | — | Drawer: New Role | button "New Role" (newRole) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | KPI matrix 0 | Tab: KPI matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Page: BRD Draft | menu | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: New BRD | button "+ New BRD" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: BRD settings | button "BRD settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: Sample BRD format | button "Sample BRD format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/brd | — | Dialog: Make this the agreed BRD | button "Make this the agreed BRD" (brdAgree) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Weekly digest | Tab: Weekly digest | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "Change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | Guides | Tab: Guides | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | Videos | Tab: Videos | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | List | Tab: List | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/tasks | — | Page: Tasks | menu | 14 pill (span.pt-st.s-0 "To Do"); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Staff · Text | Tasks & mail | #/tasks | My private tasks | Tab: My private tasks | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | Facilio Run directory ↗ | Tab: Facilio Run directory ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/transfers | Holding | Tab: Holding | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/golivehc | Hypercare | Tab: Hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/golivehc | — | Drawer: New taskBigger view | button "Log issue as a task" (hcLog) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Tasks & mail | #/golivehc | — | Dialog: Start from what is open | button "Start from what is open" (hcFromOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Tasks & mail | #/golivehc | — | Drawer: Edit issue | button "Edit" (hcEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/handover | Acceptance and closure 0/2 | Tab: Acceptance and closure 0/2 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/handover | Packs and reports | Tab: Packs and reports | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/soldoc | — | Page: Solution document | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: New solution document | button "+ New solution document" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Solution document settings | button "Solution document settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Sample solution document format | button "Sample solution document format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Project handover | #/soldoc | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/statusrep | Monthly report | Tab: Monthly report | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/statusrep | On record 16 | Tab: On record 16 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Reports | #/trace | — | Page: Traceability & quality | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | Gaps to fix 9 | Tab: Gaps to fix 9 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | Lessons learned 2 | Tab: Lessons learned 2 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | — | Drawer: Add lesson | button "Add lesson" (trLessonEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Notes & Links | #/resources | Links & resources 1 | Tab: Links & resources 1 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Notes & Links | #/resources | Team | Tab: Team | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Notes & Links | #/resources | Only me 0 | Tab: Only me 0 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/resources | — | Drawer: Edit link | button "Edit Riverside tower list (demo)" (resEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/dashboards | — | Drawer: New category | button "Category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Show Facilio | #/explore | — | Page: Discover more | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/explore | — | Drawer: VisitorsBigger view | button "Learn more" (xpOpen) | 18 pill (span. "Last Visited Spa") | Legacy | opened and closed | Legacy remains |
| Staff · Text | Help | #/teamhelp | — | Page: Team Guide | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Help | #/teamhelp | — | Dialog: Stage 1: Project introduction | button "Start the guided walk" (tgCoach) | 1 under 12px (✓ 11.5px) | Partly | opened and closed | Legacy remains |
| Staff · Text | Help | #/teamhelp | — | Drawer: Install the skills in your ClaudeBigger view | button "Install the skills" (skillsHelp) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Help | #/whatsnew | — | Page: What's new | menu | 26 pill (span.wn-a "Team") | Legacy | opened | Legacy remains |
| Staff · Text | Help | #/feedback | — | Page: Feedback | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Help | #/privacy | — | Page: Privacy & data | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Help | #/privacy | — | Dialog: Request deletion | button "Request deletion of my data" (dsrRequest) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Claude & tools | #/claudesetup | — | Page: Claude setup | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | Answers waiting | Tab: Answers waiting | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | Claude use | Tab: Claude use | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | Support Desk | Tab: Support Desk | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/settings | — | Page: Project Settings | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/settings | History | Tab: History | tab click | 168 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Staff · Text | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Settings | #/workspace | — | Page: Tabs & Layouts | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/workspace | Icons | Tab: Icons | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Project cycle" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Your project | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/cust_home | — | Page: Welcome | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/kickoff | — | Page: Introduction deck | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/contract | — | Page: Contract | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/scope | — | Page: Scope | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Your project | #/timeline | — | Page: Plan Timeline | menu | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Icons | Your project | #/timeline | Day | Tab: Day | tab click | 2 pill (label.chk.small "Show baseline"); 125 under 12px (22 11.5px) | Legacy | opened | Legacy remains |
| Customer · Icons | Your project | #/timeline | Month | Tab: Month | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Icons | Your project | #/timeline | Quarter | Tab: Quarter | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Icons | Your project | #/timeline | Fit | Tab: Fit | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Icons | Prepare for sessions | #/schedule | — | Page: Workshop Schedule | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Prepare for sessions | #/prepare | — | Page: Learn & Prepare | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Prepare for sessions | #/prepare | Get ready | Tab: Get ready | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Prepare for sessions | #/prepare | Words you will hear | Tab: Words you will hear | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Prepare for sessions | #/onboarding | — | Page: Data Onboarding | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Learn Facilio | #/learnlib | — | Page: Module guides | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Learn Facilio | #/guide | — | Page: Customer User Guide | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Learn Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | — | Page: Sign-offs & Decisions | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/changes | — | Drawer: Request a changeBigger view | button "Request a change" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Review and sign off | #/delivery | — | Page: Build, UAT & Go-Live | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Review and sign off | #/uatrun | — | Page: UAT Testing | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/cust_home | — | Page: Welcome | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/kickoff | — | Page: Introduction deck | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/contract | — | Page: Contract | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/scope | — | Page: Scope | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Your project | #/timeline | — | Page: Plan Timeline | menu | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Text | Your project | #/timeline | Day | Tab: Day | tab click | 2 pill (label.chk.small "Show baseline"); 125 under 12px (22 11.5px) | Legacy | opened | Legacy remains |
| Customer · Text | Your project | #/timeline | Month | Tab: Month | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Text | Your project | #/timeline | Quarter | Tab: Quarter | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Text | Your project | #/timeline | Fit | Tab: Fit | tab click | 2 pill (label.chk.small "Show baseline") | Legacy | opened | Legacy remains |
| Customer · Text | Prepare for sessions | #/schedule | — | Page: Workshop Schedule | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Prepare for sessions | #/prepare | — | Page: Learn & Prepare | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Prepare for sessions | #/prepare | Get ready | Tab: Get ready | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Prepare for sessions | #/prepare | Words you will hear | Tab: Words you will hear | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Prepare for sessions | #/onboarding | — | Page: Data Onboarding | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Learn Facilio | #/learnlib | — | Page: Module guides | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Learn Facilio | #/guide | — | Page: Customer User Guide | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Learn Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | — | Page: Sign-offs & Decisions | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/changes | — | Drawer: Request a changeBigger view | button "Request a change" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Review and sign off | #/delivery | — | Page: Build, UAT & Go-Live | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Review and sign off | #/uatrun | — | Page: UAT Testing | menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | — | Page: Dashboard | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | Dashboard | Dialog: All timeTodayYesterdayThis weekThis monthLast 7 da | button "All time" (rgOpen) | on the system | Facilio | opened and closed | Pass |
| Admin | Admin | #/admin | — | Page: Assistant | Admin menu | 12 pill (span.aa-sev.critical "critical") | Legacy | opened | Legacy remains |
| Admin | Admin | #/admin | — | Page: Projects | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | Projects | Drawer: Project insightsBigger view | button "RFDemo: Riverside Towers (walkthrough)Ri" (admDetail) | on the system | Facilio | opened and closed | Pass |
| Admin | Admin | #/admin | — | Page: Users | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | — | Page: Access | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | Access | Drawer: Hand over ownership | button "Hand over ownership" (admOwnerHand) | on the system | Facilio | opened and closed | Pass |
| Admin | Admin | #/admin | — | Page: AI provider | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | — | Page: Integrations | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | — | Page: Discover more | Admin menu | on the system | Facilio | opened | Pass |
| Admin | Admin | #/admin | Discover more | Drawer: New entryBigger view | button "New entry" (dmEdit) | on the system | Facilio | opened and closed | Pass |
| Admin | Admin | #/admin | — | Page: Activity | Admin menu | on the system | Facilio | opened | Pass |
