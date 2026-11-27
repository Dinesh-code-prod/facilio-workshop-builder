# UI coverage register (generated 2026-11-27 12:28 UTC by tests/ui/ui-coverage.mjs)

Every surface the crawl reached in the staff, customer (preview) and Admin views, measured against the Facilio design system. **Facilio** = no findings; **Partly** = only a few off-palette colours or small text; **Legacy** = non-Roboto text, pill controls or many off-palette colours. "Functional test" here means the surface opened, showed no page error and closed again; forms were never saved. Not reached by a crawl: states that need particular data (e.g. a record in a given state), and any action that would change data. Those are listed in the migration plan.

## Totals

| Group | Identified | Inspected | On the system | Opened OK | Passed | Failed | Blocked | Legacy remaining |
|---|---|---|---|---|---|---|---|---|
| **All** | 573 | 512 | 485 | 550 | 485 | 0 | 61 | 27 |
| POV: Staff · Icons | 171 | 165 | 157 | 165 | 157 | 0 | 6 | 8 |
| POV: Staff · Text | 169 | 158 | 149 | 158 | 149 | 0 | 11 | 9 |
| POV: Customer · Icons | 161 | 156 | 148 | 156 | 148 | 0 | 5 | 8 |
| POV: Customer · Text | 72 | 33 | 31 | 71 | 31 | 0 | 39 | 2 |
| Chat panel (Assistant)s | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 |
| Account menus | 2 | 1 | 1 | 1 | 1 | 0 | 1 | 0 |
| Search overlays | 2 | 1 | 1 | 1 | 1 | 0 | 1 | 0 |
| Notifications panels | 2 | 1 | 1 | 1 | 1 | 0 | 1 | 0 |
| Pages | 184 | 146 | 135 | 184 | 135 | 0 | 38 | 11 |
| Tabs | 216 | 196 | 190 | 196 | 190 | 0 | 20 | 6 |
| Drawers | 138 | 138 | 129 | 138 | 129 | 0 | 0 | 9 |
| Dialogs | 27 | 27 | 26 | 27 | 26 | 0 | 0 | 1 |

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
| Staff · Icons | Project introduction | #/msaintake | Scope check6 | Tab: Scope check6 | tab click | on the system | Facilio | opened | Pass |
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
| Staff · Icons | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 1 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
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
| Staff · Icons | Module design | #/modules | Settings and connected apps11 | Tab: Settings and connected apps11 | tab click | on the system | Facilio | opened | Pass |
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
| Staff · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
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
| Staff · Icons | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "New change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
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
| Staff · Icons | Reports | #/statusrep | On record 2 | Tab: On record 2 | tab click |  | not opened | blocked: tab not found | Blocked |
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
| Staff · Icons | Show Facilio | #/dashboards | — | Drawer: New category | button "New category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
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
| Staff · Icons | Settings | #/settings | — | Page: Project Settings | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/settings | History | Tab: History | tab click | 62 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Staff · Icons | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Icons | Settings | #/workspace | — | Page: Tabs & Layouts | menu | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/workspace | Text | Tab: Text | tab click | on the system | Facilio | opened | Pass |
| Staff · Icons | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Dashboard" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Chat panel (Assistant) | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Shell | — | — | Account menu | top bar / floating button |  | not opened | blocked: panel not found | Blocked |
| Staff · Text | Shell | — | — | Search overlay | top bar / floating button |  | not opened | blocked: panel not found | Blocked |
| Staff · Text | Shell | — | — | Notifications panel | top bar / floating button |  | not opened | blocked: panel not found | Blocked |
| Staff · Text | Home | #/lifecycle | — | Page: Project cycle | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Overview | Tab: Overview | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Home | #/projdash | Stage report | Tab: Stage report | tab click |  | not opened | blocked: tab not found | Blocked |
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
| Staff · Text | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 2 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
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
| Staff · Text | Module design | #/flow | Stateflows | Tab: Stateflows | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/flow | States | Tab: States | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/flow | Modules in use | Tab: Modules in use | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Module design | #/flow | All | Tab: All | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Module design | #/modules | — | Page: Forms & templates | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | System485 | Tab: System485 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | Custom3 | Tab: Custom3 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | In use | Tab: In use | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | In scope | Tab: In scope | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/modules | — | Drawer: New module | button "Add module" (newModule) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | Who can do what | Tab: Who can do what | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | Roles36 | Tab: Roles36 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/roles | — | Drawer: New Role | button "New Role" (newRole) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | SLA matrix 0 | Tab: SLA matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ Add SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
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
| Staff · Text | BRD & sign-off | #/governance | PMO overview | Tab: PMO overview | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "New change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Staff · Text | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | Guides | Tab: Guides | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Training guides | #/guides | Tiles | Tab: Tiles | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/tasks | — | Page: Tasks | menu | 14 pill (span.pt-st.s-0 "To Do"); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Staff · Text | Tasks & mail | #/tasks | My private tasks 0 | Tab: My private tasks 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/transfers | This project | Tab: This project | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Tasks & mail | #/golivehc | Go-live | Tab: Go-live | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/handover | Checklist 2/5 | Tab: Checklist 2/5 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Project handover | #/handover | Acceptance and closure 0/2 | Tab: Acceptance and closure 0/2 | tab click | on the system | Facilio | opened | Pass |
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
| Staff · Text | Reports | #/statusrep | Weekly report (WSR) | Tab: Weekly report (WSR) | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/statusrep | On record | Tab: On record | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Reports | #/trace | — | Page: Traceability & quality | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | Coverage 0 of 7 | Tab: Coverage 0 of 7 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | Gaps to fix 9 | Tab: Gaps to fix 9 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Reports | #/trace | From all projects | Tab: From all projects | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff · Text | Reports | #/trace | — | Drawer: Requirement rq_demo1Bigger view | button "Open" (trGo) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Notes & Links | #/resources | Notes 1 | Tab: Notes 1 | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Show Facilio | #/dashboards | — | Drawer: New category | button "New category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
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
| Staff · Text | Claude & tools | #/claudesetup | Start here | Tab: Start here | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/claudesetup | Answers waiting | Tab: Answers waiting | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/settings | — | Page: Project Settings | menu | 62 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Staff · Text | Settings | #/settings | Project details | Tab: Project details | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Staff · Text | Settings | #/workspace | — | Page: Tabs & Layouts | menu | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/workspace | Icons | Tab: Icons | tab click | on the system | Facilio | opened | Pass |
| Staff · Text | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Project cycle" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Overview | Tab: Overview | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/lifecycle | — | Page: Project cycle | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Customer · Icons | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 3 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
| Customer · Icons | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Process & checks | #/whiteboard | — | Drawer: New board | button "New board" (wbNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Process & checks | #/rschecks | — | Page: Checks & validations | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Process & checks | #/rschecks | Readiness & validation | Tab: Readiness & validation | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Process & checks | #/rschecks | — | Drawer: Add a check myself | button "Add a check myself" (rsAddCheck) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Module design | #/flow | — | Page: State flow builder | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/flow | Stateflows | Tab: Stateflows | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/flow | All modules | Tab: All modules | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/modules | — | Page: Forms & templates | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/modules | System485 | Tab: System485 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/modules | Settings and connected apps10 | Tab: Settings and connected apps10 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/modules | In use | Tab: In use | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/modules | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Solution design & BRD | #/slakpi | KPI matrix 0 | Tab: KPI matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Page: BRD Draft | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: New BRD | button "+ New BRD" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: BRD settings | button "BRD settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: Sample BRD format | button "Sample BRD format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/brd | — | Dialog: Make this the agreed BRD | button "Make this the agreed BRD" (brdAgree) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | PMO overview | Tab: PMO overview | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/governance | Weekly digest | Tab: Weekly digest | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "New change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Training guides | #/guides | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Training guides | #/guides | Videos | Tab: Videos | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Training guides | #/guides | List | Tab: List | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/tasks | — | Page: Tasks | menu | 14 pill (span.pt-st.s-0 "To Do"); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Customer · Icons | Tasks & mail | #/tasks | My private tasks 0 | Tab: My private tasks 0 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Icons | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Icons | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Icons | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/transfers | Holding | Tab: Holding | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/golivehc | Hypercare | Tab: Hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Tasks & mail | #/golivehc | — | Drawer: New taskBigger view | button "Log issue as a task" (hcLog) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Tasks & mail | #/golivehc | — | Dialog: Start from what is open | button "Start from what is open" (hcFromOpen) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Tasks & mail | #/golivehc | — | Drawer: Edit issue | button "Edit" (hcEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Project handover | #/handover | Checklist 2/5 | Tab: Checklist 2/5 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project handover | #/handover | Packs and reports | Tab: Packs and reports | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Page: Solution document | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: New solution document | button "+ New solution document" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Solution document settings | button "Solution document settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Sample solution document format | button "Sample solution document format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Project handover | #/soldoc | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/statusrep | Monthly report | Tab: Monthly report | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/statusrep | On record 4 | Tab: On record 4 | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Icons | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Reports | #/trace | — | Page: Traceability & quality | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/trace | Coverage 0 of 7 | Tab: Coverage 0 of 7 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/trace | Lessons learned 2 | Tab: Lessons learned 2 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Reports | #/trace | — | Drawer: Add lesson | button "Add lesson" (trLessonEdit) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Notes & Links | #/resources | Notes 1 | Tab: Notes 1 | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Show Facilio | #/dashboards | — | Drawer: New category | button "New category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Show Facilio | #/explore | — | Page: Discover more | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Show Facilio | #/explore | — | Drawer: VisitorsBigger view | button "Learn more" (xpOpen) | 18 pill (span. "Last Visited Spa") | Legacy | opened and closed | Legacy remains |
| Customer · Icons | Help | #/teamhelp | — | Page: Team Guide | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Help | #/teamhelp | — | Dialog: Home | button "Start the guided walk" (tgCoach) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Help | #/teamhelp | — | Drawer: Install the skills in your ClaudeBigger view | button "Install the skills" (skillsHelp) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Help | #/whatsnew | — | Page: What's new | menu | 26 pill (span.wn-a "Team") | Legacy | opened | Legacy remains |
| Customer · Icons | Help | #/feedback | — | Page: Feedback | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Help | #/privacy | — | Page: Privacy & data | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Help | #/privacy | — | Dialog: Request deletion | button "Request deletion of my data" (dsrRequest) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | — | Page: Claude setup | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | Start here | Tab: Start here | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/claudesetup | Claude use | Tab: Claude use | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/settings | — | Page: Project Settings | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/settings | Project details | Tab: Project details | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/settings | History | Tab: History | tab click | 62 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Customer · Icons | Settings | #/settings | Customer | Tab: Customer | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Icons | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Customer · Icons | Settings | #/workspace | — | Page: Tabs & Layouts | menu | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/workspace | Text | Tab: Text | tab click | on the system | Facilio | opened | Pass |
| Customer · Icons | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Dashboard" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Home | #/lifecycle | — | Page: Project cycle | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Overview | Tab: Overview | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Home | #/projdash | Stage report | Tab: Stage report | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer · Text | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Customer · Text | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 4 pill (span. "Work Orders") | Legacy | opened | Legacy remains |
| Customer · Text | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Customer · Text | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Customer · Text | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Customer · Text | Process & checks | #/rschecks | — | Page: Checks & validations | menu |  | not opened | opened | Blocked |
| Customer · Text | Module design | #/flow | — | Page: State flow builder | menu |  | not opened | opened | Blocked |
| Customer · Text | Module design | #/modules | — | Page: Forms & templates | menu |  | not opened | opened | Blocked |
| Customer · Text | Module design | #/roles | — | Page: Roles & access | menu |  | not opened | opened | Blocked |
| Customer · Text | Module design | #/notifications | — | Page: Notifications | menu |  | not opened | opened | Blocked |
| Customer · Text | Solution design & BRD | #/solmap | — | Page: Solution | menu |  | not opened | opened | Blocked |
| Customer · Text | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu |  | not opened | opened | Blocked |
| Customer · Text | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu |  | not opened | opened | Blocked |
| Customer · Text | BRD & sign-off | #/brd | — | Page: BRD Draft | menu |  | not opened | opened | Blocked |
| Customer · Text | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu |  | not opened | opened | Blocked |
| Customer · Text | BRD & sign-off | #/changes | — | Page: Change Requests | menu |  | not opened | opened | Blocked |
| Customer · Text | UAT & FTR | #/ftr | — | Page: FTR Report | menu |  | not opened | opened | Blocked |
| Customer · Text | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu |  | not opened | opened | Blocked |
| Customer · Text | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu |  | not opened | opened | Blocked |
| Customer · Text | Training guides | #/guides | — | Page: Guides & Videos | menu |  | not opened | opened | Blocked |
| Customer · Text | Tasks & mail | #/tasks | — | Page: Tasks | menu |  | not opened | opened | Blocked |
| Customer · Text | Tasks & mail | #/mailtab | — | Page: Customer mail | menu |  | not opened | opened | Blocked |
| Customer · Text | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu |  | not opened | opened | Blocked |
| Customer · Text | Tasks & mail | #/transfers | — | Page: Transfers | menu |  | not opened | opened | Blocked |
| Customer · Text | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu |  | not opened | opened | Blocked |
| Customer · Text | Project handover | #/handover | — | Page: Handover & Closure | menu |  | not opened | opened | Blocked |
| Customer · Text | Project handover | #/soldoc | — | Page: Solution document | menu |  | not opened | opened | Blocked |
| Customer · Text | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu |  | not opened | opened | Blocked |
| Customer · Text | Reports | #/trace | — | Page: Traceability & quality | menu |  | not opened | opened | Blocked |
| Customer · Text | Notes & Links | #/resources | — | Page: Notes & Links | menu |  | not opened | opened | Blocked |
| Customer · Text | Notes & Links | #/docs | — | Page: Documents & Files | menu |  | not opened | opened | Blocked |
| Customer · Text | Show Facilio | #/seefacilio | — | Page: Product Tour | menu |  | not opened | opened | Blocked |
| Customer · Text | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu |  | not opened | opened | Blocked |
| Customer · Text | Show Facilio | #/explore | — | Page: Discover more | menu |  | not opened | opened | Blocked |
| Customer · Text | Help | #/teamhelp | — | Page: Team Guide | menu |  | not opened | opened | Blocked |
| Customer · Text | Help | #/whatsnew | — | Page: What's new | menu |  | not opened | opened | Blocked |
| Customer · Text | Help | #/feedback | — | Page: Feedback | menu |  | not opened | opened | Blocked |
| Customer · Text | Help | #/privacy | — | Page: Privacy & data | menu |  | not opened | opened | Blocked |
| Customer · Text | Claude & tools | #/claudesetup | — | Page: Claude setup | menu |  | not opened | opened | Blocked |
| Customer · Text | Claude & tools | #/webframe | — | Page: Facilio tools | menu |  | not opened | opened | Blocked |
| Customer · Text | Settings | #/settings | — | Page: Project Settings | menu |  | not opened | opened | Blocked |
| Customer · Text | Settings | #/templates | — | Page: Templates | menu |  | not opened | opened | Blocked |
| Customer · Text | Settings | #/workspace | — | Page: Tabs & Layouts | menu |  | not opened | opened | Blocked |
