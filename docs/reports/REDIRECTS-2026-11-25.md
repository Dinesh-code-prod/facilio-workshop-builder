# Redirects in Delivery Studio: what is there and what to keep (25 Nov 2026)

## Result (same day, branch fix/fewer-redirects)

Approved by the user ("Yes, remove them"). After the change the same crawl finds **325** controls (was 444): **119 removed**. Kept on purpose, although listed below as remove, because the rules meant to keep them and the crawl misread them:
- the ten "Open ... →" card links whose address is an old id that already lands on the right menu page (kickoff, plan, rsplan, rsquestions, golive, hypercare): rule K3, one Open link per card;
- Contract intake's own step chips 3 and 4 (Review the kick-off, Questions and solutions): the page's step bar, like K1;
- Project cycle's one main button, Continue in <the current stage's first page>: rule K3.
Also removed, though the crawl could not see them: a Dashboard card as a whole being clickable (only its Open button is), the Timeline link on the phase strip.
Not covered: buttons whose jump happens inside their own code rather than as a link, the customer view, Admin.
Re-run: node tools/redirect-map.mjs <baseUrl> <projectId> out.json, then node tools/redirect-report.mjs out.json report.md.

Every control on the team pages that leads to ANOTHER page, found by opening every menu page and each of its tabs in a browser (tools/redirect-map.mjs, project "Demo: Riverside Towers"). Tab bars, the side menu and Back buttons are not counted: they are navigation and stay.

**444 controls** (1016 counting each tab they show on): **312 keep, 132 remove**.

## The rules

| Rule | | Controls |
|---|---|---|
| K1 keep | The stage bar: the pages of the stage you are in | 195 |
| K2 keep | Team Guide: a guide may link to the page it explains | 81 |
| K3 keep | One "Open ... →" per card, to that card's own page | 18 |
| R1 remove | A link to a page that is not in the menu (lands somewhere unexpected) | 43 |
| R2 remove | A number, chart row, checklist line or list item that is itself a link (the card already has its one Open link) | 51 |
| R3 remove | Any other jump to a page of another stage from inside a page | 38 |
| K4 keep | A link to a page of the same stage | 18 |

A removed control does not lose the page it pointed to: the page stays in the menu, and a card keeps one "Open ... →" link to its own page.

## By page

| Page | Keep | Remove |
|---|---|---|
| Dashboard | 20 | 77 |
| Team Guide | 85 | 0 |
| Project cycle | 2 | 47 |
| Checks & validations | 10 | 0 |
| Go-live & hypercare | 5 | 5 |
| Data onboarding | 9 | 0 |
| Workshop room (live call) | 9 | 0 |
| Transcripts | 9 | 0 |
| Process whiteboard | 9 | 0 |
| State flow builder | 9 | 0 |
| Forms & templates | 9 | 0 |
| Roles & access | 9 | 0 |
| Notifications | 9 | 0 |
| KPIs & SLA | 6 | 1 |
| Solution | 6 | 0 |
| Mockup (Meteor) | 6 | 0 |
| BRD Draft | 6 | 0 |
| Governance & RAID | 6 | 0 |
| Change Requests | 6 | 0 |
| Facilio tools | 6 | 0 |
| Tasks | 5 | 0 |
| Customer mail | 5 | 0 |
| Support Desk | 5 | 0 |
| Transfers | 5 | 0 |
| Contract intake | 2 | 2 |
| What's new | 4 | 0 |
| Feedback | 4 | 0 |
| Privacy & data | 4 | 0 |
| Kick-off, plan and schedule | 3 | 0 |
| FTR Report | 3 | 0 |
| Build & test tracker | 3 | 0 |
| KPI Workbooks | 3 | 0 |
| Product Tour | 3 | 0 |
| Dashboard Gallery | 3 | 0 |
| Discover more | 3 | 0 |
| Project Settings | 3 | 0 |
| Templates | 3 | 0 |
| Tabs & Layouts | 3 | 0 |
| Handover & Closure | 2 | 0 |
| Solution document | 2 | 0 |
| Status report (WSR) & monthly report | 2 | 0 |
| Traceability & quality | 2 | 0 |
| Claude setup | 2 | 0 |
| Guides & Videos | 1 | 0 |
| Notes & Links | 1 | 0 |

## Every control

### Dashboard

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Overview, Kick-off, Requirements, B | Dashboard | Dashboard |
| K1 keep | top, Overview, Kick-off, Requirements, B | Project cycle | Project cycle |
| K3 keep | top, Overview · Pain points and pending | 2 test cases failed or are blockedOpen UAT → | Build & test tracker |
| K3 keep | top, Overview · Pain points and pending | 1 action of ours is past its dateOpen actions → | Governance & RAID |
| K3 keep | top, Overview · Pain points and pending | 1 BRD check blocks sign-offOpen the BRD → | BRD Draft |
| K3 keep | top, Overview · Pain points and pending | 3 requirements are still draftsOpen the BRD → | BRD Draft |
| K3 keep | top, Overview · Pain points and pending | 1 sign-off is waiting for the customerOpen sign-offs → | Governance & RAID |
| K3 keep | top, Overview · Work by status | Open tasks → | Tasks |
| K3 keep | top, Overview, Kick-off, Go-live and hyp · Who owes what | Open actions → | Governance & RAID |
| K3 keep | top, Overview, Build and UAT · Test pass rate | Open UAT → | Build & test tracker |
| K3 keep | top, Overview · Health by area | Project cycle → | Project cycle |
| K3 keep | top, Overview, BRD and sign-off · Sign-off journey | Open sign-offs → | Governance & RAID |
| K3 keep | top, Overview · Open RAID items | Open RAID log → | Governance & RAID |
| K3 keep | Kick-off · People on the project | Project settings → | Project Settings |
| K3 keep | Requirements, BRD and sign-off · Requirement status | Open the BRD → | BRD Draft |
| K3 keep | Requirements · Traceability coverage | Open checks → | Checks & validations |
| K3 keep | BRD and sign-off · Change request ageing | Change requests → | Change Requests |
| K3 keep | Build and UAT · Module review | Open modules → | Forms & templates |
| K3 keep | Handover · Handover completeness | Open handover → | Handover & Closure |
| K3 keep | Handover · What is ready | Open guides → | Guides & Videos |
| R1 remove | top, Overview, Kick-off, Requirements, B | Timeline | timeline (not in the menu) |
| R3 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | Plan | Kick-off, plan and schedule |
| R3 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | Task board | Tasks |
| R2 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | 30%Plan done | Kick-off, plan and schedule |
| R2 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | 3Overdue | Tasks |
| R2 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | 3Open risks | Governance & RAID |
| R3 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | Confirm approval coverOpen | Tasks |
| R3 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | Collect the asset listOpen | Tasks |
| R3 remove | top, Overview, Kick-off, Requirements, B · Demo: Riverside Towers (walkthrough) | ActionOpen | Governance & RAID |
| R2 remove | top, Overview · Project health lifecycle | Overall statusNeeds attention0 red · 2 amber · 2 green | Project cycle |
| R1 remove | top, Overview · Project health lifecycle | Schedule performance1.07on or ahead of plan | plan (not in the menu) |
| R2 remove | top, Overview · Project health lifecycle | Open tasks112 overdue · created per week | Tasks |
| R2 remove | top, Overview · Project health lifecycle | Open risks and issues30 high impact · created per week | Governance & RAID |
| R2 remove | top, Overview · Project health lifecycle | Test pass rate38%3 of 8 passed | Build & test tracker |
| R1 remove | top, Overview · Pain points and pending | 4 customer questions have no answerOpen questions → | rsquestions (not in the menu) |
| R1 remove | top, Overview · Pain points and pending | 2 hypercare issues are openOpen hypercare → | hypercare (not in the menu) |
| R1 remove | top, Overview · Plan vs actual | Open the plan → | plan (not in the menu) |
| R1 remove | top, Overview · Next 14 days | Workshop 4: preventive maintenance26 Nov 2026 | timeline (not in the menu) |
| R1 remove | top, Overview · Next 14 days | Workshop: Preventive maintenance schedules26 Nov 2026 | planner (not in the menu) |
| R2 remove | top, Overview · Next 14 days | Untitled28 Nov 2026 | Governance & RAID |
| R2 remove | top, Overview · Next 14 days | Untitled02 Dec 2026 | Governance & RAID |
| R1 remove | top, Overview · Next 14 days | Workshop: Roles and permissions03 Dec 2026 | planner (not in the menu) |
| R2 remove | Kick-off | Team members0on the implementation team | Project Settings |
| R2 remove | Kick-off | Customer stakeholders0named by the customer | Project Settings |
| R1 remove | Kick-off | Plan steps dated16dated plan rows | plan (not in the menu) |
| R1 remove | Kick-off | Kick-off readiness3 of 6checks green | kickoff (not in the menu) |
| R1 remove | Kick-off · Kick-off readiness | Open kick-off → | kickoff (not in the menu) |
| R2 remove | Kick-off · Kick-off readiness | ✕Implementation team named0 on the team.Red | Project Settings |
| R2 remove | Kick-off · Kick-off readiness | ✕Customer stakeholders named0 named by the customer.Red | Project Settings |
| R1 remove | Kick-off · Kick-off readiness | ✓Project plan has dates16 dated plan rows.Green | plan (not in the menu) |
| R1 remove | Kick-off · Kick-off readiness | ✓Go-live date set22 Jan 2027Green | plan (not in the menu) |
| R1 remove | Kick-off · Kick-off readiness | ✓Requirement sessions planned5 sessions in the planner.Green | plan (not in the menu) |
| R2 remove | Kick-off · Kick-off readiness | !No action past its date1 open actions are late.Amber | Governance & RAID |
| R1 remove | Kick-off · Plan, first steps | Open plan → | plan (not in the menu) |
| R2 remove | Requirements | Requirements63 confirmed | BRD Draft |
| R1 remove | Requirements | Sessions held0 of 5planned sessions completed | rsplan (not in the menu) |
| R2 remove | Requirements | Transcripts2added to the project | Transcripts |
| R1 remove | Requirements | Open questions4waiting for an answer | rsquestions (not in the menu) |
| R1 remove | Requirements · Sessions held against planned | Workshop plan → | rsplan (not in the menu) |
| R1 remove | Requirements · Questions waiting | Open questions → | rsquestions (not in the menu) |
| R2 remove | BRD and sign-off | Blocking checks1to fix before sign-off | BRD Draft |
| R2 remove | BRD and sign-off | Warnings6worth a look | BRD Draft |
| R2 remove | BRD and sign-off, Handover | Sign-offs done0 of 3BRD, UAT, go-live | Governance & RAID |
| R2 remove | BRD and sign-off | Use cases2written for the BRD | BRD Draft |
| R2 remove | Build and UAT | Modules in scope00 reviewed | Forms & templates |
| R2 remove | Build and UAT | Test cases83 passed, 6 run | Build & test tracker |
| R2 remove | Build and UAT | Failed cases2need a fix and a re-test | Build & test tracker |
| R2 remove | Build and UAT | Open defects00 critical · 0 major | Build & test tracker |
| R2 remove | Build and UAT · UAT exit criteria | !Every test case executed6 of 8 executed.Amber | Build & test tracker |
| R2 remove | Build and UAT · UAT exit criteria | ✕Pass rate of executed cases at least 90%50% passed (3 of 6) | Build & test tracker |
| R2 remove | Build and UAT · UAT exit criteria | ✓No open critical defects0 open.Green | Build & test tracker |
| R2 remove | Build and UAT · UAT exit criteria | ✓No open major defects0 open.Green | Build & test tracker |
| R2 remove | Build and UAT · UAT exit criteria | –Modules in scope reviewed0 of 0 reviewed.No data | Forms & templates |
| R3 remove | Build and UAT · UAT exit criteria | –UAT sign-off signedNot requested yet.No data | Governance & RAID |
| R1 remove | Go-live and hypercare | Go-live58 days22 Jan 2027 | golive (not in the menu) |
| R1 remove | Go-live and hypercare | Go-live sign-offNot duecustomer approval | golive (not in the menu) |
| R1 remove | Go-live and hypercare | Hypercare issues open23 logged in total | hypercare (not in the menu) |
| R1 remove | Go-live and hypercare | Mean time to resolve0 days1 resolved issues | hypercare (not in the menu) |
| R1 remove | Go-live and hypercare · Go-live countdown | Go-live readiness → | golive (not in the menu) |
| R2 remove | Go-live and hypercare · Go-live readiness | !Test cases executed6 of 8 executed.Amber | Build & test tracker |
| R2 remove | Go-live and hypercare · Go-live readiness | ✕No failed or blocked test cases2 failed or blocked.Red | Build & test tracker |
| R2 remove | Go-live and hypercare · Go-live readiness | ✓No open critical or major defects0 critical, 0 major open.G | Build & test tracker |
| R2 remove | Go-live and hypercare · Go-live readiness | !BRD signedNot signed yet.Amber | BRD Draft |
| R2 remove | Go-live and hypercare · Go-live readiness | ✕UAT signedNot signed yet.Red | Governance & RAID |
| R2 remove | Go-live and hypercare · Go-live readiness | ✓Training guides made2 user guides.Green | Guides & Videos |
| R3 remove | Go-live and hypercare · Go-live readiness | –Go-live sign-offNot requested yet.No data | Governance & RAID |
| R1 remove | Go-live and hypercare · Hypercare burn-down | Open hypercare → | hypercare (not in the menu) |
| R2 remove | Handover | User guides2for the customer team | Guides & Videos |
| R2 remove | Handover | Videos0walkthroughs | Guides & Videos |
| R2 remove | Handover | Handover complete33%2 of 6 checks green | Handover & Closure |
| R2 remove | Handover · Handover checklist | ✓User guides made2 guides.Green | Guides & Videos |
| R2 remove | Handover · Handover checklist | !Walkthrough videos0 videos.Amber | Guides & Videos |
| R2 remove | Handover · Handover checklist | ✕Three sign-offs signed0 of 3.Red | Governance & RAID |
| R2 remove | Handover · Handover checklist | !Handover checklist done2 of 5 ticked.Amber | Handover & Closure |
| R2 remove | Handover · Handover checklist | !Hypercare exit recordedNot recorded yet.Amber | Handover & Closure |
| R2 remove | Handover · Handover checklist | ✓Lessons learned recorded2 lessons.Green | Handover & Closure |
| R3 remove | Reports | Open Status reports | Status report (WSR) & monthly report |

### Team Guide

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Team Guide | Team Guide |
| K1 keep | top | What's new | What's new |
| K1 keep | top | Feedback | Feedback |
| K1 keep | top | Privacy & data | Privacy & data |
| K2 keep | top · New here? Your roadmap, step by step 0 o | Open | Claude setup |
| K2 keep | top · New here? Your roadmap, step by step 0 o | Open | Feedback |
| K2 keep | top · Your first hour | Open Dashboard | Dashboard |
| K2 keep | top · Your first hour | Claude setup: Start here | Claude setup |
| K2 keep | top · Your first hour | Open Tasks | Tasks |
| K2 keep | top · Set up your Claude: connector, skills an | Open Claude setup | Claude setup |
| K2 keep | top · Project introduction | Open | Contract intake |
| K2 keep | top · Requirement sessions | Open | Transcripts |
| K2 keep | top · Requirement sessions | Open | Process whiteboard |
| K2 keep | top · Requirement sessions | Open | Checks & validations |
| K2 keep | top · Solution design & BRD | Open | Forms & templates |
| K2 keep | top · Solution design & BRD | Open | State flow builder |
| K2 keep | top · Solution design & BRD | Open | Mockup (Meteor) |
| K2 keep | top · Solution design & BRD | Open | Roles & access |
| K2 keep | top · Solution design & BRD | Open | Notifications |
| K2 keep | top · Solution design & BRD | Open | KPIs & SLA |
| K2 keep | top · Solution design & BRD | Open | BRD Draft |
| K2 keep | top · UAT & FTR | Open | Build & test tracker |
| K2 keep | top · UAT & FTR | Open | FTR Report |
| K2 keep | top · UAT & FTR | Open | KPI Workbooks |
| K2 keep | top · Training guides | Open | Guides & Videos |
| K2 keep | top · Project handover | Open | Handover & Closure |
| K2 keep | top · Project handover | Open | Solution document |
| K2 keep | top · Run the project, every week | Where are we?DashboardHow the project stands today, in numbe | Dashboard |
| K2 keep | top · Run the project, every week | Run the projectTasksOne register for everything to do, as a  | Tasks |
| K2 keep | top · Run the project, every week | Run the projectTransfersWhat your Claude read from or sent t | Transfers |
| K2 keep | top · Run the project, every week | Run the projectGovernance & RAIDSign-offs, risks, decisions, | Governance & RAID |
| K2 keep | top · Run the project, every week | Run the projectChange RequestsAnything outside the signed sc | Change Requests |
| K2 keep | top · Run the project, every week | Run the projectStatus report (WSR) & monthly reportThe weekl | Status report (WSR) & monthly report |
| K2 keep | top · Run the project, every week | Run the projectNotes & LinksKeep notes and links with the pr | Notes & Links |
| K2 keep | top · Working with the customer | Customer View menuSwitch on only the pages the customer need | custintro (not in the menu) |
| K2 keep | top · Working with the customer | Learn & Prepare and Module guidesBoth are written from the c | prepare (not in the menu) |
| K2 keep | top · Working with the customer | Show FacilioFacilio Screens, Product Tour, Dashboard Gallery | Discover more |
| K2 keep | top · The menu at a glance | Dashboard | Dashboard |
| K2 keep | top · The menu at a glance | Project cycle | Project cycle |
| K2 keep | top · The menu at a glance | Status report (WSR) & monthly report | Status report (WSR) & monthly report |
| K2 keep | top · The menu at a glance | Traceability & quality | Traceability & quality |
| K2 keep | top · The menu at a glance | Notes & Links | Notes & Links |
| K2 keep | top · The menu at a glance | Contract intake | Contract intake |
| K2 keep | top · The menu at a glance | Kick-off, plan and schedule | Kick-off, plan and schedule |
| K2 keep | top · The menu at a glance | Data onboarding | Data onboarding |
| K2 keep | top · The menu at a glance | Workshop room (live call) | Workshop room (live call) |
| K2 keep | top · The menu at a glance | Transcripts | Transcripts |
| K2 keep | top · The menu at a glance | Process whiteboard | Process whiteboard |
| K2 keep | top · The menu at a glance | Checks & validations | Checks & validations |
| K2 keep | top · The menu at a glance | State flow builder | State flow builder |
| K2 keep | top · The menu at a glance | Forms & templates | Forms & templates |
| K2 keep | top · The menu at a glance | Roles & access | Roles & access |
| K2 keep | top · The menu at a glance | Notifications | Notifications |
| K2 keep | top · The menu at a glance | Solution | Solution |
| K2 keep | top · The menu at a glance | Mockup (Meteor) | Mockup (Meteor) |
| K2 keep | top · The menu at a glance | KPIs & SLA | KPIs & SLA |
| K2 keep | top · The menu at a glance | BRD Draft | BRD Draft |
| K2 keep | top · The menu at a glance | Governance & RAID | Governance & RAID |
| K2 keep | top · The menu at a glance | Change Requests | Change Requests |
| K2 keep | top · The menu at a glance | FTR Report | FTR Report |
| K2 keep | top · The menu at a glance | Build & test tracker | Build & test tracker |
| K2 keep | top · The menu at a glance | KPI Workbooks | KPI Workbooks |
| K2 keep | top · The menu at a glance | Guides & Videos | Guides & Videos |
| K2 keep | top · The menu at a glance | Tasks | Tasks |
| K2 keep | top · The menu at a glance | Customer mail | Customer mail |
| K2 keep | top · The menu at a glance | Support Desk | Support Desk |
| K2 keep | top · The menu at a glance | Transfers | Transfers |
| K2 keep | top · The menu at a glance | Go-live & hypercare | Go-live & hypercare |
| K2 keep | top · The menu at a glance | Handover & Closure | Handover & Closure |
| K2 keep | top · The menu at a glance | Solution document | Solution document |
| K2 keep | top · The menu at a glance | Customer Introduction | custintro (not in the menu) |
| K2 keep | top · The menu at a glance | Learn & Prepare | prepare (not in the menu) |
| K2 keep | top · The menu at a glance | Module guides | learnlib (not in the menu) |
| K2 keep | top · The menu at a glance | Product Tour | Product Tour |
| K2 keep | top · The menu at a glance | Dashboard Gallery | Dashboard Gallery |
| K2 keep | top · The menu at a glance | Discover more | Discover more |
| K2 keep | top · The menu at a glance | Facilio Screens | demokit (not in the menu) |
| K2 keep | top · The menu at a glance | Connecting Your Systems | integguide (not in the menu) |
| K2 keep | top · The menu at a glance | Customer User Guide | guide (not in the menu) |
| K2 keep | top · The menu at a glance | Customer Portal | portal (not in the menu) |
| K2 keep | top · The menu at a glance | Claude setup | Claude setup |
| K2 keep | top · The menu at a glance | Facilio tools | Facilio tools |
| K2 keep | top · The menu at a glance | Project Settings | Project Settings |
| K2 keep | top · The menu at a glance | Templates | Templates |
| K2 keep | top · The menu at a glance | Tabs & Layouts | Tabs & Layouts |

### Project cycle

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Stages, Roadmap, Plan vs actual, Re | Dashboard | Dashboard |
| K1 keep | top, Stages, Roadmap, Plan vs actual, Re | Project cycle | Project cycle |
| R3 remove | top, Stages · Project handover | Continue in Handover & Closure | Handover & Closure |
| R3 remove | top, Stages · Waiting on the customer 1 | BRD Sign-Off | Governance & RAID |
| R3 remove | top, Stages · Our pending actions 3 | Untitled | Governance & RAID |
| R1 remove | top, Stages · Upcoming milestones next 30 days | Testing & UAT | timeline (not in the menu) |
| R3 remove | top, Stages · lc-more | Contract intake | Contract intake |
| R3 remove | top, Stages · lc-more | Kick-off, plan and schedule | Kick-off, plan and schedule |
| R3 remove | top, Stages · lc-more | Governance & RAID | Governance & RAID |
| R3 remove | top, Stages · lc-more | Change Requests | Change Requests |
| R1 remove | top, Stages · lc-more | Workshop 4: preventive maintenance | timeline (not in the menu) |
| R3 remove | top, Stages · lc-more | Transcripts | Transcripts |
| R3 remove | top, Stages · lc-more | Process whiteboard | Process whiteboard |
| R3 remove | top, Stages · lc-more | Checks & validations | Checks & validations |
| R3 remove | top, Stages · lc-more | Data onboarding | Data onboarding |
| R3 remove | top, Stages · lc-more | Forms & templates | Forms & templates |
| R3 remove | top, Stages · lc-more | State flow builder | State flow builder |
| R3 remove | top, Stages · lc-more | Mockup (Meteor) | Mockup (Meteor) |
| R3 remove | top, Stages · lc-more | Roles & access | Roles & access |
| R3 remove | top, Stages · lc-more | Notifications | Notifications |
| R3 remove | top, Stages · lc-more | KPIs & SLA | KPIs & SLA |
| R3 remove | top, Stages · lc-more | BRD Draft | BRD Draft |
| R3 remove | top, Stages · lc-more | Traceability & quality | Traceability & quality |
| R3 remove | top, Stages · lc-more | Dashboard Gallery | Dashboard Gallery |
| R1 remove | top, Stages · lc-more | UAT scripts prepared | timeline (not in the menu) |
| R1 remove | top, Stages · lc-more | UAT with the customer | timeline (not in the menu) |
| R3 remove | top, Stages · lc-more | Build & test tracker | Build & test tracker |
| R3 remove | top, Stages · lc-more | FTR Report | FTR Report |
| R3 remove | top, Stages · lc-more | KPI Workbooks | KPI Workbooks |
| R1 remove | top, Stages · lc-more | Training for customer admins | timeline (not in the menu) |
| R3 remove | top, Stages · lc-more | Guides & Videos | Guides & Videos |
| R3 remove | top, Stages · lc-more | Notes & Links | Notes & Links |
| R1 remove | top, Stages · lc-more | Hypercare & Closure | timeline (not in the menu) |
| R1 remove | top, Stages · lc-more | Hypercare | timeline (not in the menu) |
| R1 remove | top, Stages · lc-more | Go-Live & Handover | timeline (not in the menu) |
| R1 remove | top, Stages · lc-more | Closure report and lessons learned | timeline (not in the menu) |
| R3 remove | top, Stages · lc-more | Handover & Closure | Handover & Closure |
| R1 remove | Roadmap · Discover and defineStages 1 to 4 | Stage 1, Discovery: Not started. No scope recorded. Open | msaflow (not in the menu) |
| R1 remove | Roadmap · Discover and defineStages 1 to 4 | Stage 2, Workshops: Not started. 0 of 5 sessions completed.  | planner (not in the menu) |
| R1 remove | Roadmap · Discover and defineStages 1 to 4 | Stage 3, Requirements: In progress. 3 of 6 confirmed. Open | transcripts (not in the menu) |
| R2 remove | Roadmap · Discover and defineStages 1 to 4 | Stage 4, BRD: In progress. Draft in progress. Open | BRD Draft |
| R2 remove | Roadmap · Build and validateStages 5 to 7 | Stage 5, Configuration: Not started. No modules in scope. Op | Build & test tracker |
| R2 remove | Roadmap · Build and validateStages 5 to 7 | Stage 6, UAT: Not started. No UAT sessions. Open | Build & test tracker |
| R2 remove | Roadmap · Build and validateStages 5 to 7 | Stage 7, FTR: Not started. No workbook saved. Open | FTR Report |
| R1 remove | Roadmap · LaunchStages 8 to 10 | Stage 8, Training & guides: In progress. 0 of 2 guides appro | guidebuilder (not in the menu) |
| R2 remove | Roadmap · LaunchStages 8 to 10 | Stage 9, Go-live: In progress. 1 of 5 checklist items done.  | Build & test tracker |
| R1 remove | Roadmap · LaunchStages 8 to 10 | Stage 10, Hypercare: Not started. Not started. Open | hypercare (not in the menu) |
| R2 remove | Roadmap · Hand overStages 11 to 12 | Stage 11, Support handover: In progress. 2 of 5 items done.  | Handover & Closure |
| R2 remove | Roadmap · Hand overStages 11 to 12 | Stage 12, Project closure: Not started. Not closed. Open | Handover & Closure |

### Checks & validations

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Findings to confirm, Readiness & va | Data onboarding | Data onboarding |
| K1 keep | top, Findings to confirm, Readiness & va | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, Findings to confirm, Readiness & va | Transcripts | Transcripts |
| K1 keep | top, Findings to confirm, Readiness & va | Process whiteboard | Process whiteboard |
| K1 keep | top, Findings to confirm, Readiness & va | Checks & validations | Checks & validations |
| K1 keep | top, Findings to confirm, Readiness & va | State flow builder | State flow builder |
| K1 keep | top, Findings to confirm, Readiness & va | Forms & templates | Forms & templates |
| K1 keep | top, Findings to confirm, Readiness & va | Roles & access | Roles & access |
| K1 keep | top, Findings to confirm, Readiness & va | Notifications | Notifications |
| K4 keep | top, Findings to confirm · card | Go to Transcripts | Transcripts |

### Go-live & hypercare

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Go-live, Hypercare | Tasks | Tasks |
| K1 keep | top, Go-live, Hypercare | Customer mail | Customer mail |
| K1 keep | top, Go-live, Hypercare | Support Desk | Support Desk |
| K1 keep | top, Go-live, Hypercare | Transfers | Transfers |
| K1 keep | top, Go-live, Hypercare | Go-live & hypercare | Go-live & hypercare |
| R3 remove | top, Go-live · Readiness | Open | Build & test tracker |
| R3 remove | top, Go-live · Readiness | Open | BRD Draft |
| R3 remove | top, Go-live · Readiness | Open | FTR Report |
| R1 remove | top, Go-live · Readiness | Open | uatguide (not in the menu) |
| R1 remove | top, Go-live · Readiness | Open | guidebuilder (not in the menu) |

### Data onboarding

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Data Onboarding, Excel Data Onboard | Data onboarding | Data onboarding |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Transcripts | Transcripts |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Process whiteboard | Process whiteboard |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Checks & validations | Checks & validations |
| K1 keep | top, Data Onboarding, Excel Data Onboard | State flow builder | State flow builder |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Forms & templates | Forms & templates |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Roles & access | Roles & access |
| K1 keep | top, Data Onboarding, Excel Data Onboard | Notifications | Notifications |

### Workshop room (live call)

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Data onboarding | Data onboarding |
| K1 keep | top | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top | Transcripts | Transcripts |
| K1 keep | top | Process whiteboard | Process whiteboard |
| K1 keep | top | Checks & validations | Checks & validations |
| K1 keep | top | State flow builder | State flow builder |
| K1 keep | top | Forms & templates | Forms & templates |
| K1 keep | top | Roles & access | Roles & access |
| K1 keep | top | Notifications | Notifications |

### Transcripts

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Transcripts, Requirements register, | Data onboarding | Data onboarding |
| K1 keep | top, Transcripts, Requirements register, | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, Transcripts, Requirements register, | Transcripts | Transcripts |
| K1 keep | top, Transcripts, Requirements register, | Process whiteboard | Process whiteboard |
| K1 keep | top, Transcripts, Requirements register, | Checks & validations | Checks & validations |
| K1 keep | top, Transcripts, Requirements register, | State flow builder | State flow builder |
| K1 keep | top, Transcripts, Requirements register, | Forms & templates | Forms & templates |
| K1 keep | top, Transcripts, Requirements register, | Roles & access | Roles & access |
| K1 keep | top, Transcripts, Requirements register, | Notifications | Notifications |

### Process whiteboard

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Data onboarding | Data onboarding |
| K1 keep | top | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top | Transcripts | Transcripts |
| K1 keep | top | Process whiteboard | Process whiteboard |
| K1 keep | top | Checks & validations | Checks & validations |
| K1 keep | top | State flow builder | State flow builder |
| K1 keep | top | Forms & templates | Forms & templates |
| K1 keep | top | Roles & access | Roles & access |
| K1 keep | top | Notifications | Notifications |

### State flow builder

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Stateflows, States, All modules | Data onboarding | Data onboarding |
| K1 keep | top, Stateflows, States, All modules | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, Stateflows, States, All modules | Transcripts | Transcripts |
| K1 keep | top, Stateflows, States, All modules | Process whiteboard | Process whiteboard |
| K1 keep | top, Stateflows, States, All modules | Checks & validations | Checks & validations |
| K1 keep | top, Stateflows, States, All modules | State flow builder | State flow builder |
| K1 keep | top, Stateflows, States, All modules | Forms & templates | Forms & templates |
| K1 keep | top, Stateflows, States, All modules | Roles & access | Roles & access |
| K1 keep | top, Stateflows, States, All modules | Notifications | Notifications |

### Forms & templates

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, System485, Custom2, Settings and co | Data onboarding | Data onboarding |
| K1 keep | top, System485, Custom2, Settings and co | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, System485, Custom2, Settings and co | Transcripts | Transcripts |
| K1 keep | top, System485, Custom2, Settings and co | Process whiteboard | Process whiteboard |
| K1 keep | top, System485, Custom2, Settings and co | Checks & validations | Checks & validations |
| K1 keep | top, System485, Custom2, Settings and co | State flow builder | State flow builder |
| K1 keep | top, System485, Custom2, Settings and co | Forms & templates | Forms & templates |
| K1 keep | top, System485, Custom2, Settings and co | Roles & access | Roles & access |
| K1 keep | top, System485, Custom2, Settings and co | Notifications | Notifications |

### Roles & access

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Who can do what, Roles36, Permissio | Data onboarding | Data onboarding |
| K1 keep | top, Who can do what, Roles36, Permissio | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top, Who can do what, Roles36, Permissio | Transcripts | Transcripts |
| K1 keep | top, Who can do what, Roles36, Permissio | Process whiteboard | Process whiteboard |
| K1 keep | top, Who can do what, Roles36, Permissio | Checks & validations | Checks & validations |
| K1 keep | top, Who can do what, Roles36, Permissio | State flow builder | State flow builder |
| K1 keep | top, Who can do what, Roles36, Permissio | Forms & templates | Forms & templates |
| K1 keep | top, Who can do what, Roles36, Permissio | Roles & access | Roles & access |
| K1 keep | top, Who can do what, Roles36, Permissio | Notifications | Notifications |

### Notifications

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Data onboarding | Data onboarding |
| K1 keep | top | Workshop room (live call) | Workshop room (live call) |
| K1 keep | top | Transcripts | Transcripts |
| K1 keep | top | Process whiteboard | Process whiteboard |
| K1 keep | top | Checks & validations | Checks & validations |
| K1 keep | top | State flow builder | State flow builder |
| K1 keep | top | Forms & templates | Forms & templates |
| K1 keep | top | Roles & access | Roles & access |
| K1 keep | top | Notifications | Notifications |

### KPIs & SLA

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, SLA matrix 0, KPI matrix 0 | Solution | Solution |
| K1 keep | top, SLA matrix 0, KPI matrix 0 | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top, SLA matrix 0, KPI matrix 0 | KPIs & SLA | KPIs & SLA |
| K4 keep | top, SLA matrix 0, KPI matrix 0 | BRD draft | BRD Draft |
| K1 keep | top, SLA matrix 0, KPI matrix 0 | Governance & RAID | Governance & RAID |
| K4 keep | top, SLA matrix 0, KPI matrix 0 | Change requests | Change Requests |
| R3 remove | KPI matrix 0 · Import or paste | KPI workbooksThe customer’s KPI Excel files | KPI Workbooks |

### Solution

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Solution | Solution |
| K1 keep | top | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top | KPIs & SLA | KPIs & SLA |
| K4 keep | top | BRD draft | BRD Draft |
| K1 keep | top | Governance & RAID | Governance & RAID |
| K4 keep | top | Change requests | Change Requests |

### Mockup (Meteor)

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Solution | Solution |
| K1 keep | top | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top | KPIs & SLA | KPIs & SLA |
| K4 keep | top | BRD draft | BRD Draft |
| K1 keep | top | Governance & RAID | Governance & RAID |
| K4 keep | top | Change requests | Change Requests |

### BRD Draft

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Solution | Solution |
| K1 keep | top | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top | KPIs & SLA | KPIs & SLA |
| K4 keep | top | BRD draft | BRD Draft |
| K1 keep | top | Governance & RAID | Governance & RAID |
| K4 keep | top | Change requests | Change Requests |

### Governance & RAID

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, PMO overview, Sign-offs, RAID log,  | Solution | Solution |
| K1 keep | top, PMO overview, Sign-offs, RAID log,  | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top, PMO overview, Sign-offs, RAID log,  | KPIs & SLA | KPIs & SLA |
| K4 keep | top, PMO overview, Sign-offs, RAID log,  | BRD draft | BRD Draft |
| K1 keep | top, PMO overview, Sign-offs, RAID log,  | Governance & RAID | Governance & RAID |
| K4 keep | top, PMO overview, Sign-offs, RAID log,  | Change requests | Change Requests |

### Change Requests

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Solution | Solution |
| K1 keep | top | Mockup (Meteor) | Mockup (Meteor) |
| K1 keep | top | KPIs & SLA | KPIs & SLA |
| K4 keep | top | BRD draft | BRD Draft |
| K1 keep | top | Governance & RAID | Governance & RAID |
| K4 keep | top | Change requests | Change Requests |

### Facilio tools

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Support Desk, Meteor, Comet, facili | Claude setup | Claude setup |
| K1 keep | top, Support Desk, Meteor, Comet, facili | Facilio tools | Facilio tools |
| K4 keep | top, facilio.com ↗, Facilio Run director | This site does not open inside Delivery Studio. Click here t | Facilio tools |
| K4 keep | Support Desk | Support Desk | Facilio tools |
| K4 keep | Meteor | Meteor | Facilio tools |
| K4 keep | Comet | Comet | Facilio tools |

### Tasks

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Tasks 14, My private tasks | Tasks | Tasks |
| K1 keep | top, Tasks 14, My private tasks | Customer mail | Customer mail |
| K1 keep | top, Tasks 14, My private tasks | Support Desk | Support Desk |
| K1 keep | top, Tasks 14, My private tasks | Transfers | Transfers |
| K1 keep | top, Tasks 14, My private tasks | Go-live & hypercare | Go-live & hypercare |

### Customer mail

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Tasks | Tasks |
| K1 keep | top | Customer mail | Customer mail |
| K1 keep | top | Support Desk | Support Desk |
| K1 keep | top | Transfers | Transfers |
| K1 keep | top | Go-live & hypercare | Go-live & hypercare |

### Support Desk

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Tasks | Tasks |
| K1 keep | top | Customer mail | Customer mail |
| K1 keep | top | Support Desk | Support Desk |
| K1 keep | top | Transfers | Transfers |
| K1 keep | top | Go-live & hypercare | Go-live & hypercare |

### Transfers

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, This project, Holding | Tasks | Tasks |
| K1 keep | top, This project, Holding | Customer mail | Customer mail |
| K1 keep | top, This project, Holding | Support Desk | Support Desk |
| K1 keep | top, This project, Holding | Transfers | Transfers |
| K1 keep | top, This project, Holding | Go-live & hypercare | Go-live & hypercare |

### Contract intake

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Contract intake, Know Your Contract | Contract intake | Contract intake |
| K1 keep | top, Contract intake, Know Your Contract | Kick-off, plan and schedule | Kick-off, plan and schedule |
| R1 remove | top, Contract intake · Contract documents | Review the kick-off | kickoff (not in the menu) |
| R1 remove | top, Contract intake · Contract documents | Questions and solutions | rsquestions (not in the menu) |

### What's new

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Team Guide | Team Guide |
| K1 keep | top | What's new | What's new |
| K1 keep | top | Feedback | Feedback |
| K1 keep | top | Privacy & data | Privacy & data |

### Feedback

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Team Guide | Team Guide |
| K1 keep | top | What's new | What's new |
| K1 keep | top | Feedback | Feedback |
| K1 keep | top | Privacy & data | Privacy & data |

### Privacy & data

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Team Guide | Team Guide |
| K1 keep | top | What's new | What's new |
| K1 keep | top | Feedback | Feedback |
| K1 keep | top | Privacy & data | Privacy & data |

### Kick-off, plan and schedule

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Kick-off and agreed scope, Project  | Contract intake | Contract intake |
| K1 keep | top, Kick-off and agreed scope, Project  | Kick-off, plan and schedule | Kick-off, plan and schedule |
| K4 keep | top, Kick-off and agreed scope · card | Go to Contract intake | Contract intake |

### FTR Report

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Report (HTML), Excel | FTR Report | FTR Report |
| K1 keep | top, Report (HTML), Excel | Build & test tracker | Build & test tracker |
| K1 keep | top, Report (HTML), Excel | KPI Workbooks | KPI Workbooks |

### Build & test tracker

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | FTR Report | FTR Report |
| K1 keep | top | Build & test tracker | Build & test tracker |
| K1 keep | top | KPI Workbooks | KPI Workbooks |

### KPI Workbooks

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | FTR Report | FTR Report |
| K1 keep | top | Build & test tracker | Build & test tracker |
| K1 keep | top | KPI Workbooks | KPI Workbooks |

### Product Tour

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Product Tour | Product Tour |
| K1 keep | top | Dashboard Gallery | Dashboard Gallery |
| K1 keep | top | Discover more | Discover more |

### Dashboard Gallery

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Product Tour | Product Tour |
| K1 keep | top | Dashboard Gallery | Dashboard Gallery |
| K1 keep | top | Discover more | Discover more |

### Discover more

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Visitors and security, Tenant and e | Product Tour | Product Tour |
| K1 keep | top, Visitors and security, Tenant and e | Dashboard Gallery | Dashboard Gallery |
| K1 keep | top, Visitors and security, Tenant and e | Discover more | Discover more |

### Project Settings

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Project details, People & access, H | Project Settings | Project Settings |
| K1 keep | top, Project details, People & access, H | Templates | Templates |
| K1 keep | top, Project details, People & access, H | Tabs & Layouts | Tabs & Layouts |

### Templates

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Project Settings | Project Settings |
| K1 keep | top | Templates | Templates |
| K1 keep | top | Tabs & Layouts | Tabs & Layouts |

### Tabs & Layouts

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Project Settings | Project Settings |
| K1 keep | top | Templates | Templates |
| K1 keep | top | Tabs & Layouts | Tabs & Layouts |

### Handover & Closure

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Checklist 2/5, Acceptance and closu | Handover & Closure | Handover & Closure |
| K1 keep | top, Checklist 2/5, Acceptance and closu | Solution document | Solution document |

### Solution document

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Handover & Closure | Handover & Closure |
| K1 keep | top | Solution document | Solution document |

### Status report (WSR) & monthly report

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Make, From Claude, On record 4 | Status report (WSR) & monthly report | Status report (WSR) & monthly report |
| K1 keep | top, Make, From Claude, On record 4 | Traceability & quality | Traceability & quality |

### Traceability & quality

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Coverage, Gaps to fix (8), Lessons  | Status report (WSR) & monthly report | Status report (WSR) & monthly report |
| K1 keep | top, Coverage, Gaps to fix (8), Lessons  | Traceability & quality | Traceability & quality |

### Claude setup

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top, Start here, 1. Connect Claude, 2. W | Claude setup | Claude setup |
| K1 keep | top, Start here, 1. Connect Claude, 2. W | Facilio tools | Facilio tools |

### Guides & Videos

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Guides & Videos | Guides & Videos |

### Notes & Links

| Verdict | Where (tab · card) | Label | Goes to |
|---|---|---|---|
| K1 keep | top | Notes & Links | Notes & Links |
