# Tabs backup (7 Nov 2026)

What the team menu shows, what is hidden on purpose, and what left the menu. Nothing here was deleted from the code: a hidden tab is a page that still exists and only needs its id added to `EXPOSED` in `src/shell.js` (or `?alltabs=1` on the address shows every tab for one browser tab). The customers' own menu (`CUSTOMER_NAV`) is not filtered and did not change.

## Shown in the team menu (by group)
| Group | Tabs |
|---|---|
| Project | Dashboard (`projdash`), Tasks (`tasks`), Transfers (`transfers`), Governance & RAID (`governance`), Change Requests (`changes`) |
| 1. Project introduction | Contract intake (`msaintake`), Project introduction (`kickoff`), Project Plan (`plan`) |
| 2. Requirement sessions | Workshop plan (`rsplan`), Transcripts (`rstrans`), Process whiteboard (`whiteboard`), Checks & validations (`rschecks`) |
| 3. Mockup & BRD | Solution status (`solution`), System Modules & Form Builder (`modules`), State Flow Builder (`flow`), Mockup (`mockup`), Roles & Access Permissions (`roles`), Notifications (`notifications`), Configuration & org package (`cfginputs`), BRD Draft (`brd`) |
| 4. UAT & FTR | Build, UAT & Go-Live (`delivery`), FTR Report (`ftr`), KPI Workbooks (`kpi`), Go-live readiness (`golive`) |
| 5. Training guides | Training guides (`guides`), User Guide Builder (`guidebuilder`), Video to Guide (`vidguide`) |
| 7. Hypercare | Hypercare (`hypercare`) |
| 8. Project handover | Handover & Closure (`handover`) |
| Support | Support Desk (`supportdesk`) |
| Customer View (what the customer sees, for the team to preview) | Customer Introduction (`custintro`), Learn & Prepare (`prepare`), Module guides (`learnlib`), Facilio AI Agents (`agentguide`), Connecting Your Systems (`integguide`), Customer User Guide (`guide`), Customer Portal (`portal`) |
| Help and Settings | Claude setup (`claudesetup`), Team Guide (`teamhelp`), Project Settings (`settings`) |

## Hidden on purpose (kept in the code, can come back)
| Tab (id) | Why it is hidden | Bring it back when |
|---|---|---|
| Agent Setup, Connection & Data, Rules & Guardrails (`agents`, `agentdata`, `agentrules`), Agent Testing (`agenttest`) | Only for projects that deliver an AI agent | An agent project starts: add the four ids to `EXPOSED` |
| Guides & Video Studio (`vstudio`) | Overlaps the Training guides overview, User Guide Builder and Video to Guide | The video studio is rebuilt in the Fluent 2 pass |
| Bring your project in (`transition`) | One-time move of an older project into the Studio | Someone needs to import a running project |
| Facilio Screens (`demokit`), Product Tour (`seefacilio`), Dashboard Gallery (`dashboards`), Discover more (`explore`) | The "Show Facilio" sales group, not part of delivery | The customer-facing showcase is rebuilt |
| Facilio tools (`webframe`), Privacy & data (`privacy`) | Rarely used help pages | When the Help group is reviewed |
| Templates (`templates`), Tabs & Layouts (`workspace`) | Per-project menu layouts; the menu is now fixed to the 8 stages | If projects need their own menu again |
| The older 12-stage pages (journey, lifecycle views) | Replaced by the 8-stage menu | Only if the 12-stage journey animation is revived (roadmap E19) |

## Left the menu as duplicates (page code still exists)
| Tab (id) | Original menu line in `NAV` (`src/shell.js`) | Duplicate of |
|---|---|---|
| Project Overview (`overview`) | `['overview', 'Project Overview']` in group Project, with `overview: 'Where are we?'` in its `subs` | Dashboard (`projdash`) |
| Contract (`msaflow`) | `['msaflow', 'Contract']` in group 1. Project introduction | Contract intake (`msaintake`) and Project introduction |
| Discover more entries (`showcase`) | `['showcase', 'Discover more entries']` in group Show Facilio | Discover more (`explore`), same label |

To restore one: put its line back in the `items` list of its group in `NAV`, and add the id to `EXPOSED` if it should show.
