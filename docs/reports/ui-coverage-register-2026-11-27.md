# UI coverage register (generated 2026-11-27 09:15 UTC by tests/ui/ui-coverage.mjs)

Every surface the crawl reached in the staff, customer (preview) and Admin views, measured against the Facilio design system. **Facilio** = no findings; **Partly** = only a few off-palette colours or small text; **Legacy** = non-Roboto text, pill controls or many off-palette colours. "Functional test" here means the surface opened, showed no page error and closed again; forms were never saved. Not reached by a crawl: states that need particular data (e.g. a record in a given state), and any action that would change data. Those are listed in the migration plan.

## Totals

| Group | Identified | Inspected | On the system | Opened OK | Passed | Failed | Blocked | Legacy remaining |
|---|---|---|---|---|---|---|---|---|
| **All** | 352 | 338 | 287 | 338 | 287 | 0 | 14 | 51 |
| POV: Staff | 179 | 173 | 147 | 173 | 147 | 0 | 6 | 26 |
| POV: Customer | 173 | 165 | 140 | 165 | 140 | 0 | 8 | 25 |
| Chat panel (Assistant)s | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Account menus | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| Search overlays | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| Notifications panels | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| Pages | 92 | 92 | 67 | 92 | 67 | 0 | 0 | 25 |
| Tabs | 150 | 136 | 121 | 136 | 121 | 0 | 14 | 15 |
| Drawers | 89 | 89 | 81 | 89 | 81 | 0 | 0 | 8 |
| Dialogs | 17 | 17 | 15 | 17 | 15 | 0 | 0 | 2 |

## Register

| POV | Module | Route/Page | Tab/Subtab | UI Element | How It Opens | Existing UI | New UI Status | Functional Test | Result |
|---|---|---|---|---|---|---|---|---|---|
| Staff | Shell | — | — | Chat panel (Assistant) | top bar / floating button | 11 pill (Requirement sessions) | Legacy | opened and closed | Legacy remains |
| Staff | Shell | — | — | Account menu | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff | Shell | — | — | Search overlay | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff | Shell | — | — | Notifications panel | top bar / floating button | on the system | Facilio | opened and closed | Pass |
| Staff | Home | #/projdash | — | Page: Dashboard | menu | 1 under 12px (You are here 11.5px) | Partly | opened | Legacy remains |
| Staff | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | Reports | Tab: Reports | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/projdash | — | Drawer: Claude helper | button "How it works" (helperInfo) | on the system | Facilio | opened and closed | Pass |
| Staff | Home | #/lifecycle | — | Page: Project cycle | menu | 7 pill (Upcoming) | Legacy | opened | Legacy remains |
| Staff | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Staff | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Staff | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Staff | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Staff | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Staff | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Staff | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Staff | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | 1 off-palette (#d6e0f3×1) | Partly | opened | Legacy remains |
| Staff | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Staff | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 3 pill (Work Orders) | Legacy | opened | Legacy remains |
| Staff | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Staff | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Staff | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Staff | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Staff | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Staff | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Staff | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Staff | Process & checks | #/whiteboard | — | Drawer: New board | button "New board" (wbNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Process & checks | #/rschecks | — | Page: Checks & validations | menu | on the system | Facilio | opened | Pass |
| Staff | Process & checks | #/rschecks | Readiness & validation | Tab: Readiness & validation | tab click | on the system | Facilio | opened | Pass |
| Staff | Process & checks | #/rschecks | — | Drawer: Add a check myself | button "Add a check myself" (rsAddCheck) | on the system | Facilio | opened and closed | Pass |
| Staff | Module design | #/flow | — | Page: State flow builder | menu | 2 pill () | Legacy | opened | Legacy remains |
| Staff | Module design | #/flow | States | Tab: States | tab click | on the system | Facilio | opened | Pass |
| Staff | Module design | #/flow | All modules | Tab: All modules | tab click | on the system | Facilio | opened | Pass |
| Staff | Module design | #/modules | — | Page: Forms & templates | menu | 3 pill () | Legacy | opened | Legacy remains |
| Staff | Module design | #/modules | System485 | Tab: System485 | tab click | 50 pill () | Legacy | opened | Legacy remains |
| Staff | Module design | #/modules | Settings and connected apps10 | Tab: Settings and connected apps10 | tab click | 10 pill () | Legacy | opened | Legacy remains |
| Staff | Module design | #/modules | In scope | Tab: In scope | tab click | on the system | Facilio | opened | Pass |
| Staff | Module design | #/modules | All | Tab: All | tab click | 10 pill () | Legacy | opened | Legacy remains |
| Staff | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Staff | Module design | #/roles | Roles36 | Tab: Roles36 | tab click | on the system | Facilio | opened | Pass |
| Staff | Module design | #/roles | Permission checks | Tab: Permission checks | tab click | on the system | Facilio | opened | Pass |
| Staff | Module design | #/roles | — | Drawer: New Role | button "New Role" (newRole) | on the system | Facilio | opened and closed | Pass |
| Staff | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Staff | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Staff | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Staff | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Staff | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | 1 off-palette (#d6e0f3×1) | Partly | opened | Legacy remains |
| Staff | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Staff | Solution design & BRD | #/slakpi | KPI matrix 0 | Tab: KPI matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Staff | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Page: BRD Draft | menu | 6 off-palette (#262626×3 #d6e0f3×1 #f7f9fe×1 #fdf3f4×1) | Legacy | opened | Legacy remains |
| Staff | BRD & sign-off | #/brd | — | Drawer: New BRD | button "+ New BRD" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Drawer: BRD settings | button "BRD settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Drawer: Sample BRD format | button "Sample BRD format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff | BRD & sign-off | #/brd | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/brd | — | Dialog: Make this the agreed BRD | button "Make this the agreed BRD" (brdAgree) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu | 1 under 12px (You are here 11.5px) | Partly | opened | Legacy remains |
| Staff | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/governance | Weekly digest | Tab: Weekly digest | tab click | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Staff | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "Change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Staff | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Staff | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Staff | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Staff | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Staff | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Staff | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Staff | Training guides | #/guides | Guides | Tab: Guides | tab click | on the system | Facilio | opened | Pass |
| Staff | Training guides | #/guides | Videos | Tab: Videos | tab click | on the system | Facilio | opened | Pass |
| Staff | Training guides | #/guides | List | Tab: List | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/tasks | — | Page: Tasks | menu | 28 pill (Customer Question); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Staff | Tasks & mail | #/tasks | My private tasks | Tab: My private tasks | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/supportdesk | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/supportdesk | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/supportdesk | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/supportdesk | Facilio Run directory ↗ | Tab: Facilio Run directory ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/transfers | Holding | Tab: Holding | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/golivehc | Hypercare | Tab: Hypercare | tab click | on the system | Facilio | opened | Pass |
| Staff | Tasks & mail | #/golivehc | — | Drawer: New taskBigger view | button "Log issue as a task" (hcLog) | on the system | Facilio | opened and closed | Pass |
| Staff | Tasks & mail | #/golivehc | — | Dialog: Start from what is open | button "Start from what is open" (hcFromOpen) | on the system | Facilio | opened and closed | Pass |
| Staff | Tasks & mail | #/golivehc | — | Drawer: Edit issue | button "Edit" (hcEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Staff | Project handover | #/handover | Acceptance and closure 0/2 | Tab: Acceptance and closure 0/2 | tab click | on the system | Facilio | opened | Pass |
| Staff | Project handover | #/handover | Packs and reports | Tab: Packs and reports | tab click | on the system | Facilio | opened | Pass |
| Staff | Project handover | #/soldoc | — | Page: Solution document | menu | 7 off-palette (#262626×3 #d6e0f3×1 #f7f9fe×1 #fdf3f4×1); 5 pill (No org package) | Legacy | opened | Legacy remains |
| Staff | Project handover | #/soldoc | — | Drawer: New solution document | button "+ New solution document" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Drawer: Solution document settings | button "Solution document settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Drawer: Sample solution document format | button "Sample solution document format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Staff | Project handover | #/soldoc | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Staff | Project handover | #/soldoc | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Staff | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu | on the system | Facilio | opened | Pass |
| Staff | Reports | #/statusrep | Monthly report | Tab: Monthly report | tab click | on the system | Facilio | opened | Pass |
| Staff | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Staff | Reports | #/statusrep | On record 4 | Tab: On record 4 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Reports | #/trace | — | Page: Traceability & quality | menu | 33 pill (Done) | Legacy | opened | Legacy remains |
| Staff | Reports | #/trace | Gaps to fix 9 | Tab: Gaps to fix 9 | tab click | on the system | Facilio | opened | Pass |
| Staff | Reports | #/trace | Lessons learned 2 | Tab: Lessons learned 2 | tab click | on the system | Facilio | opened | Pass |
| Staff | Reports | #/trace | — | Drawer: Add lesson | button "Add lesson" (trLessonEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Staff | Notes & Links | #/resources | Links & resources 1 | Tab: Links & resources 1 | tab click | on the system | Facilio | opened | Pass |
| Staff | Notes & Links | #/resources | Team | Tab: Team | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Notes & Links | #/resources | Only me 0 | Tab: Only me 0 | tab click |  | not opened | blocked: tab not found | Blocked |
| Staff | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Staff | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Staff | Notes & Links | #/resources | — | Drawer: Edit link | button "Edit Riverside tower list (demo)" (resEdit) | on the system | Facilio | opened and closed | Pass |
| Staff | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Staff | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Staff | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Staff | Show Facilio | #/dashboards | — | Drawer: New category | button "Category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Show Facilio | #/explore | — | Page: Discover more | menu | on the system | Facilio | opened | Pass |
| Staff | Show Facilio | #/explore | — | Drawer: VisitorsBigger view | button "Learn more" (xpOpen) | 18 pill (Last Visited Space) | Legacy | opened and closed | Legacy remains |
| Staff | Help | #/teamhelp | — | Page: Team Guide | menu | on the system | Facilio | opened | Pass |
| Staff | Help | #/teamhelp | — | Dialog: Stage 1: Project introduction | button "Start the guided walk" (tgCoach) | 3 non-Roboto (kbd. Inter); 1 under 12px (✓ 11.5px) | Legacy | opened and closed | Legacy remains |
| Staff | Help | #/teamhelp | — | Drawer: Install the skills in your ClaudeBigger view | button "Install the skills" (skillsHelp) | 14 pill (facilio-solution-doc) | Legacy | opened and closed | Legacy remains |
| Staff | Help | #/whatsnew | — | Page: What's new | menu | 53 pill (New) | Legacy | opened | Legacy remains |
| Staff | Help | #/feedback | — | Page: Feedback | menu | on the system | Facilio | opened | Pass |
| Staff | Help | #/privacy | — | Page: Privacy & data | menu | on the system | Facilio | opened | Pass |
| Staff | Help | #/privacy | — | Dialog: Request deletion | button "Request deletion of my data" (dsrRequest) | on the system | Facilio | opened and closed | Pass |
| Staff | Claude & tools | #/claudesetup | — | Page: Claude setup | menu | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | Answers waiting | Tab: Answers waiting | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/claudesetup | Claude use | Tab: Claude use | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/webframe | Support Desk | Tab: Support Desk | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/webframe | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/webframe | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Staff | Claude & tools | #/webframe | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Staff | Settings | #/settings | — | Page: Project Settings | menu | on the system | Facilio | opened | Pass |
| Staff | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Staff | Settings | #/settings | History | Tab: History | tab click | 78 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Staff | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Staff | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Staff | Settings | #/workspace | — | Page: Tabs & Layouts | menu | 2 pill (Not in the menu) | Legacy | opened | Legacy remains |
| Staff | Settings | #/workspace | Icons | Tab: Icons | tab click | 2 pill (Not in the menu) | Legacy | opened | Legacy remains |
| Staff | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Dashboard" (wsRename) | on the system | Facilio | opened and closed | Pass |
| Customer | Home | #/lifecycle | — | Page: Project cycle | menu | 7 pill (Upcoming) | Legacy | opened | Legacy remains |
| Customer | Home | #/lifecycle | Report pack | Tab: Report pack | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/lifecycle | — | Drawer: Project introductionBigger view | button "Owner, decision and history" (lcManage) | on the system | Facilio | opened and closed | Pass |
| Customer | Home | #/projdash | — | Page: Dashboard | menu | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Overview | Tab: Overview | tab click | 1 under 12px (You are here 11.5px) | Partly | opened | Legacy remains |
| Customer | Home | #/projdash | Kick-off | Tab: Kick-off | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Requirements | Tab: Requirements | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | BRD and sign-off | Tab: BRD and sign-off | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Build and UAT | Tab: Build and UAT | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Go-live and hypercare | Tab: Go-live and hypercare | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Handover | Tab: Handover | tab click | on the system | Facilio | opened | Pass |
| Customer | Home | #/projdash | Stage report | Tab: Stage report | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Project introduction | #/msaintake | — | Page: Contract intake | menu | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/msaintake | Know Your Contract | Tab: Know Your Contract | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/msaintake | MSA scope | Tab: MSA scope | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/msaintake | Scope check7 | Tab: Scope check7 | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/msaintake | Scope document | Tab: Scope document | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/msaintake | Terms & integrations | Tab: Terms & integrations | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/intro | — | Page: Kick-off, plan and schedule | menu | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/intro | Project plan | Tab: Project plan | tab click | on the system | Facilio | opened | Pass |
| Customer | Project introduction | #/intro | Requirement schedule | Tab: Requirement schedule | tab click | 4 off-palette (#1d1a5e×5 #dce4f3×5 #f1f5fb×5 #1570ef×5) | Legacy | opened | Legacy remains |
| Customer | Project introduction | #/intro | — | Drawer: Import a reference for the requirement schedule | button "Import a reference" (refOpen) | on the system | Facilio | opened and closed | Pass |
| Customer | Project introduction | #/intro | — | Drawer: New sessionBigger view | button "+ Add a session" (newSession) | on the system | Facilio | opened and closed | Pass |
| Customer | Project introduction | #/intro | — | Drawer: Session 1Bigger view | button "Edit" (editSession) | on the system | Facilio | opened and closed | Pass |
| Customer | Requirement sessions | #/onboarding | — | Page: Data onboarding | menu | 1 off-palette (#d6e0f3×1) | Partly | opened | Legacy remains |
| Customer | Requirement sessions | #/onboarding | — | Dialog: Site | button "Walkthrough" (onbWalk) | on the system | Facilio | opened and closed | Pass |
| Customer | Requirement sessions | #/workshop | — | Page: Workshop room (live call) | menu | 4 pill (Work Orders) | Legacy | opened | Legacy remains |
| Customer | Requirement sessions | #/workshop | — | Drawer: Add a question | button "Add a question" (wsAddQ) | on the system | Facilio | opened and closed | Pass |
| Customer | Requirement sessions | #/rstrans | — | Page: Transcripts | menu | on the system | Facilio | opened | Pass |
| Customer | Requirement sessions | #/rstrans | Requirements register | Tab: Requirements register | tab click | on the system | Facilio | opened | Pass |
| Customer | Requirement sessions | #/rstrans | Use cases | Tab: Use cases | tab click | on the system | Facilio | opened | Pass |
| Customer | Requirement sessions | #/rstrans | Prepare questions | Tab: Prepare questions | tab click | on the system | Facilio | opened | Pass |
| Customer | Requirement sessions | #/rstrans | — | Drawer: Paste a transcriptBigger view | button "Paste a transcript" (rsPaste) | on the system | Facilio | opened and closed | Pass |
| Customer | Process & checks | #/whiteboard | — | Page: Process whiteboard | menu | on the system | Facilio | opened | Pass |
| Customer | Process & checks | #/whiteboard | — | Drawer: New board | button "New board" (wbNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Process & checks | #/rschecks | — | Page: Checks & validations | menu | on the system | Facilio | opened | Pass |
| Customer | Process & checks | #/rschecks | Readiness & validation | Tab: Readiness & validation | tab click | on the system | Facilio | opened | Pass |
| Customer | Process & checks | #/rschecks | — | Drawer: Add a check myself | button "Add a check myself" (rsAddCheck) | on the system | Facilio | opened and closed | Pass |
| Customer | Module design | #/flow | — | Page: State flow builder | menu | on the system | Facilio | opened | Pass |
| Customer | Module design | #/flow | Stateflows | Tab: Stateflows | tab click | 2 pill () | Legacy | opened | Legacy remains |
| Customer | Module design | #/flow | States | Tab: States | tab click | on the system | Facilio | opened | Pass |
| Customer | Module design | #/flow | Modules in use | Tab: Modules in use | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Module design | #/flow | All | Tab: All | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Module design | #/modules | — | Page: Forms & templates | menu | 9 pill () | Legacy | opened | Legacy remains |
| Customer | Module design | #/modules | System485 | Tab: System485 | tab click | 50 pill () | Legacy | opened | Legacy remains |
| Customer | Module design | #/modules | Custom4 | Tab: Custom4 | tab click | 4 pill () | Legacy | opened | Legacy remains |
| Customer | Module design | #/modules | In use | Tab: In use | tab click | 4 pill () | Legacy | opened | Legacy remains |
| Customer | Module design | #/modules | In scope | Tab: In scope | tab click | on the system | Facilio | opened | Pass |
| Customer | Module design | #/modules | — | Drawer: New module | button "Add module" (newModule) | on the system | Facilio | opened and closed | Pass |
| Customer | Module design | #/roles | — | Page: Roles & access | menu | on the system | Facilio | opened | Pass |
| Customer | Module design | #/roles | Who can do what | Tab: Who can do what | tab click | on the system | Facilio | opened | Pass |
| Customer | Module design | #/roles | Roles36 | Tab: Roles36 | tab click | on the system | Facilio | opened | Pass |
| Customer | Module design | #/roles | — | Drawer: New Role | button "New Role" (newRole) | on the system | Facilio | opened and closed | Pass |
| Customer | Module design | #/notifications | — | Page: Notifications | menu | on the system | Facilio | opened | Pass |
| Customer | Module design | #/notifications | — | Drawer: New notificationBigger view | button "New notification" (ntEdit) | on the system | Facilio | opened and closed | Pass |
| Customer | Solution design & BRD | #/solmap | — | Page: Solution | menu | on the system | Facilio | opened | Pass |
| Customer | Solution design & BRD | #/solmap | — | Drawer: Add a module or app | button "+ Add" (smAdd) | on the system | Facilio | opened and closed | Pass |
| Customer | Solution design & BRD | #/solmap | — | Drawer: Add a document | button "Add a documentA solution or requirement " (smDoc) | on the system | Facilio | opened and closed | Pass |
| Customer | Solution design & BRD | #/mockup | — | Page: Mockup (Meteor) | menu | 1 off-palette (#d6e0f3×1) | Partly | opened | Legacy remains |
| Customer | Solution design & BRD | #/slakpi | — | Page: KPIs & SLA | menu | on the system | Facilio | opened | Pass |
| Customer | Solution design & BRD | #/slakpi | SLA matrix 0 | Tab: SLA matrix 0 | tab click | on the system | Facilio | opened | Pass |
| Customer | Solution design & BRD | #/slakpi | — | Drawer: Add SLA rowBigger view | button "+ SLA row" (slaEdit) | on the system | Facilio | opened and closed | Pass |
| Customer | Solution design & BRD | #/slakpi | — | Drawer: Add KPIBigger view | button "+ KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Page: BRD Draft | menu | 6 off-palette (#262626×3 #d6e0f3×1 #f7f9fe×1 #fdf3f4×1) | Legacy | opened | Legacy remains |
| Customer | BRD & sign-off | #/brd | — | Drawer: New BRD | button "+ New BRD" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Drawer: BRD settings | button "BRD settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Drawer: Sample BRD format | button "Sample BRD format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Customer | BRD & sign-off | #/brd | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/brd | — | Dialog: Make this the agreed BRD | button "Make this the agreed BRD" (brdAgree) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/governance | — | Page: Governance & RAID | menu | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | PMO overview | Tab: PMO overview | tab click | 1 under 12px (You are here 11.5px) | Partly | opened | Legacy remains |
| Customer | BRD & sign-off | #/governance | Sign-offs | Tab: Sign-offs | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | RAID log | Tab: RAID log | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | Decisions | Tab: Decisions | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | Actions | Tab: Actions | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | Meeting minutes | Tab: Meeting minutes | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/governance | Module owners | Tab: Module owners | tab click | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/changes | — | Page: Change Requests | menu | on the system | Facilio | opened | Pass |
| Customer | BRD & sign-off | #/changes | — | Drawer: New change requestBigger view | button "Change request" (crEdit) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/changes | — | Drawer: CR-001 · change trackBigger view | button "Change track" (crxOpen) | on the system | Facilio | opened and closed | Pass |
| Customer | BRD & sign-off | #/changes | — | Drawer: CR-001 · impactBigger view | button "Impact" (crImpact) | on the system | Facilio | opened and closed | Pass |
| Customer | UAT & FTR | #/ftr | — | Page: FTR Report | menu | on the system | Facilio | opened | Pass |
| Customer | UAT & FTR | #/ftr | Excel | Tab: Excel | tab click | on the system | Facilio | opened | Pass |
| Customer | UAT & FTR | #/delivery | — | Page: Build & test tracker | menu | on the system | Facilio | opened | Pass |
| Customer | UAT & FTR | #/kpi | — | Page: KPI Workbooks | menu | on the system | Facilio | opened | Pass |
| Customer | UAT & FTR | #/kpi | — | Drawer: Add KPIBigger view | button "Add KPI" (kpiEdit) | on the system | Facilio | opened and closed | Pass |
| Customer | Training guides | #/guides | — | Page: Guides & Videos | menu | on the system | Facilio | opened | Pass |
| Customer | Training guides | #/guides | All | Tab: All | tab click | on the system | Facilio | opened | Pass |
| Customer | Training guides | #/guides | Guides | Tab: Guides | tab click | on the system | Facilio | opened | Pass |
| Customer | Training guides | #/guides | Tiles | Tab: Tiles | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/tasks | — | Page: Tasks | menu | 28 pill (Customer Question); 8 under 12px (DR 11.5px) | Legacy | opened | Legacy remains |
| Customer | Tasks & mail | #/tasks | My private tasks 0 | Tab: My private tasks 0 | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/tasks | Board | Tab: Board | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Tasks & mail | #/tasks | Calendar | Tab: Calendar | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Tasks & mail | #/tasks | Activity | Tab: Activity | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Tasks & mail | #/tasks | — | Drawer: New taskBigger view | button "New task" (tkNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Tasks & mail | #/mailtab | — | Page: Customer mail | menu | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/mailtab | Unread 0 | Tab: Unread 0 | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/mailtab | Tasks made | Tab: Tasks made | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/supportdesk | — | Page: Support Desk | menu | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/supportdesk | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/supportdesk | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/supportdesk | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/supportdesk | Facilio Run directory ↗ | Tab: Facilio Run directory ↗ | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/transfers | — | Page: Transfers | menu | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/transfers | This project | Tab: This project | tab click | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/golivehc | — | Page: Go-live & hypercare | menu | on the system | Facilio | opened | Pass |
| Customer | Tasks & mail | #/golivehc | Go-live | Tab: Go-live | tab click | on the system | Facilio | opened | Pass |
| Customer | Project handover | #/handover | — | Page: Handover & Closure | menu | on the system | Facilio | opened | Pass |
| Customer | Project handover | #/handover | Checklist 2/5 | Tab: Checklist 2/5 | tab click | on the system | Facilio | opened | Pass |
| Customer | Project handover | #/handover | Acceptance and closure 0/2 | Tab: Acceptance and closure 0/2 | tab click | on the system | Facilio | opened | Pass |
| Customer | Project handover | #/soldoc | — | Page: Solution document | menu | 7 off-palette (#262626×3 #d6e0f3×1 #f7f9fe×1 #fdf3f4×1); 5 pill (No org package) | Legacy | opened | Legacy remains |
| Customer | Project handover | #/soldoc | — | Drawer: New solution document | button "+ New solution document" (brdNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Drawer: Solution document settings | button "Solution document settings" (brdSettings) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Dialog: Blocking issues | button "PDF" (brdPdf) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Dialog: Blocking issues | button "Word" (brdDocx) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Drawer: Logos | button "Logos" (brdLogos) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Drawer: Sample solution document format | button "Sample solution document format" (brdSample) | 2 off-palette (#d9d2e9×1 #cccccc×1) | Partly | opened and closed | Legacy remains |
| Customer | Project handover | #/soldoc | — | Drawer: Sections | button "Sections and options" (brdSections) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Drawer: Combined flows | button "Combined flows" (wbCflows) | on the system | Facilio | opened and closed | Pass |
| Customer | Project handover | #/soldoc | — | Drawer: Version & approvalsBigger view | button "Version and approvals" (brdControl) | on the system | Facilio | opened and closed | Pass |
| Customer | Reports | #/statusrep | — | Page: Status report (WSR) & monthly report | menu | on the system | Facilio | opened | Pass |
| Customer | Reports | #/statusrep | Weekly report (WSR) | Tab: Weekly report (WSR) | tab click | on the system | Facilio | opened | Pass |
| Customer | Reports | #/statusrep | From Claude | Tab: From Claude | tab click | on the system | Facilio | opened | Pass |
| Customer | Reports | #/statusrep | On record | Tab: On record | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Reports | #/statusrep | — | Drawer: Weekly status reportBigger view | button "+ New report" (repNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Reports | #/trace | — | Page: Traceability & quality | menu | on the system | Facilio | opened | Pass |
| Customer | Reports | #/trace | Coverage 0 of 7 | Tab: Coverage 0 of 7 | tab click | 33 pill (Done) | Legacy | opened | Legacy remains |
| Customer | Reports | #/trace | Gaps to fix 9 | Tab: Gaps to fix 9 | tab click | on the system | Facilio | opened | Pass |
| Customer | Reports | #/trace | From all projects | Tab: From all projects | tab click |  | not opened | blocked: tab not found | Blocked |
| Customer | Reports | #/trace | — | Drawer: Requirement rq_demo1Bigger view | button "Open" (trGo) | on the system | Facilio | opened and closed | Pass |
| Customer | Notes & Links | #/resources | — | Page: Notes & Links | menu | on the system | Facilio | opened | Pass |
| Customer | Notes & Links | #/resources | Notes 1 | Tab: Notes 1 | tab click | on the system | Facilio | opened | Pass |
| Customer | Notes & Links | #/resources | — | Drawer: Add note | button "Add note" (noteAdd) | on the system | Facilio | opened and closed | Pass |
| Customer | Notes & Links | #/resources | — | Drawer: Add link | button "Add link" (resAdd) | on the system | Facilio | opened and closed | Pass |
| Customer | Notes & Links | #/docs | — | Page: Documents & Files | menu | on the system | Facilio | opened | Pass |
| Customer | Show Facilio | #/seefacilio | — | Page: Product Tour | menu | on the system | Facilio | opened | Pass |
| Customer | Show Facilio | #/dashboards | — | Page: Dashboard Gallery | menu | on the system | Facilio | opened | Pass |
| Customer | Show Facilio | #/dashboards | — | Drawer: New category | button "Category" (dashCatNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Show Facilio | #/explore | — | Page: Discover more | menu | on the system | Facilio | opened | Pass |
| Customer | Show Facilio | #/explore | — | Drawer: VisitorsBigger view | button "Learn more" (xpOpen) | 18 pill (Last Visited Space) | Legacy | opened and closed | Legacy remains |
| Customer | Help | #/teamhelp | — | Page: Team Guide | menu | on the system | Facilio | opened | Pass |
| Customer | Help | #/teamhelp | — | Dialog: Home | button "Start the guided walk" (tgCoach) | 3 non-Roboto (kbd. Inter) | Legacy | opened and closed | Legacy remains |
| Customer | Help | #/teamhelp | — | Drawer: Install the skills in your ClaudeBigger view | button "Install the skills" (skillsHelp) | 14 pill (facilio-solution-doc) | Legacy | opened and closed | Legacy remains |
| Customer | Help | #/whatsnew | — | Page: What's new | menu | 53 pill (New) | Legacy | opened | Legacy remains |
| Customer | Help | #/feedback | — | Page: Feedback | menu | on the system | Facilio | opened | Pass |
| Customer | Help | #/privacy | — | Page: Privacy & data | menu | on the system | Facilio | opened | Pass |
| Customer | Help | #/privacy | — | Dialog: Request deletion | button "Request deletion of my data" (dsrRequest) | on the system | Facilio | opened and closed | Pass |
| Customer | Claude & tools | #/claudesetup | — | Page: Claude setup | menu | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | Start here | Tab: Start here | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | 1. Connect Claude | Tab: 1. Connect Claude | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | 2. Waiting jobs | Tab: 2. Waiting jobs | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | 3. Facilio skills | Tab: 3. Facilio skills | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | 4. How it works | Tab: 4. How it works | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/claudesetup | Answers waiting | Tab: Answers waiting | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/webframe | — | Page: Facilio tools | menu | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/webframe | Support Desk | Tab: Support Desk | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/webframe | Meteor | Tab: Meteor | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/webframe | Comet | Tab: Comet | tab click | on the system | Facilio | opened | Pass |
| Customer | Claude & tools | #/webframe | facilio.com ↗ | Tab: facilio.com ↗ | tab click | on the system | Facilio | opened | Pass |
| Customer | Settings | #/settings | — | Page: Project Settings | menu | 78 under 12px (D 11.5px) | Partly | opened | Legacy remains |
| Customer | Settings | #/settings | Project details | Tab: Project details | tab click | on the system | Facilio | opened | Pass |
| Customer | Settings | #/settings | People & access | Tab: People & access | tab click | on the system | Facilio | opened | Pass |
| Customer | Settings | #/templates | — | Page: Templates | menu | on the system | Facilio | opened | Pass |
| Customer | Settings | #/templates | — | Drawer: New templateBigger view | button "New template" (tplNew) | on the system | Facilio | opened and closed | Pass |
| Customer | Settings | #/workspace | — | Page: Tabs & Layouts | menu | 2 pill (Not in the menu) | Legacy | opened | Legacy remains |
| Customer | Settings | #/workspace | Text | Tab: Text | tab click | 2 pill (Not in the menu) | Legacy | opened | Legacy remains |
| Customer | Settings | #/workspace | — | Drawer: Edit tab | button "Edit Project cycle" (wsRename) | on the system | Facilio | opened and closed | Pass |
