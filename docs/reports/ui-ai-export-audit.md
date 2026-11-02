# UI, AI and export audit (27 Oct 2026)

Branch `tickets-and-guide-update`, on top of the previous session's work. Everything below was checked in a real browser (Chromium, Playwright) against a local copy of the app running the real server function on a mock of the facilio.work platform. Nothing touched production data, and no paid AI calls were made (the model is mocked).

How to repeat: `npm run build`, `npm run preview` (port 4173), then `npm run test:ui`, `npm run test:exports`, `npm run test:smoke`, plus `npm test` for the server.

## 1. Pending work from the previous session

| Item | Status |
|---|---|
| Notes & Links, in-app Claude key, Teams ticket tools (Otto), regrouped navigation | Already built on this branch. Re-tested: all 34 server checks pass; Notes save, validate, persist and close correctly in the browser (smoke test) |
| Mobile and keyboard check of the new screens (was "desktop pass only") | **Done.** Notes & Links, Tickets and the admin AI provider / Integrations screens are in the four-width audit; two phone overflows on the AI provider screen were fixed |
| Admin AI panel stuck on "Loading…" after saving, removing or testing a key | **Fixed** (found in this audit) |
| Teams in a real tenant, Claude with a real key, mailbox with a real account | **Unverified.** Needs your credentials (Teams trial, `anthropic_api_key` or `ai_master_key`, mailbox secret) |
| AI ticket classification (beyond keyword rules) | **Not started.** Listed as not done last session; it is a new feature, not a defect, so it was left for your decision |

## 2. What was audited

- Project workspace: 39 menu pages, every tab on each (up to 8), and the first create/edit dialog on each page.
- Projects home, account menu, Admin console (7 sections and their tabs), welcome page, customer invitation sign-in, customer preview.
- Four widths: 1440, 1280, 768 and 390 px. 340 screen × width combinations, plus 12 for the public pages.
- Checks per screen (tests/ui/checks.js): sideways page scrolling, clipped and squeezed text, overlapping controls and labels, buttons whose label wraps, buttons off the size scale, side-by-side buttons with different heights or centres, fields narrower than their grid cell, headings forced to capitals, clickable elements that look like text, and clickable elements that are not reachable by keyboard.

### Result

| Check | Before | After |
|---|---:|---:|
| action-looks-like-text | 4 | 4 |
| button-off-scale | 62 | 0 |
| button-wraps | 10 | 0 |
| click-no-keyboard | 1241 | 0 |
| click-nonsemantic | 1241 | 0 |
| group-height-mismatch | 6 | 0 |
| heading-uppercase | 20 | 0 |
| input-narrow | 4 | 0 |
| page-hscroll | 5 | 0 |
| text-crushed | 6 | 0 |
| **Total** | **2599** | **4** |

Screens checked: 340 before, 340 after (screen × viewport).

The 4 left in the full run were clickable rows in two admin dashboard charts; they were fixed afterwards and a re-run of the admin console and home at all four widths shows 0. Public pages: 75 findings before, 0 after.

### Route by route


| Screen | Viewports | Before | After | Remaining |
|---|---|---:|---:|---|
| auth | desktop, laptop, tablet, mobile | 0 | 0 |  |
| projects | desktop, laptop, tablet, mobile | 1 | 0 |  |
| projects#account-menu | desktop, laptop, tablet, mobile | 1 | 0 |  |
| admin/Dashboard | desktop, laptop, tablet, mobile | 0 | 0 |  |
| admin/Dashboard~Delivery | desktop | 1 | 1 | action-looks-like-text 1 |
| admin/Dashboard~Customers | desktop | 3 | 3 | action-looks-like-text 3 |
| admin/Dashboard~Team & usage | desktop | 0 | 0 |  |
| admin/Dashboard~Quality & records | desktop | 0 | 0 |  |
| admin/Projects | desktop, laptop, tablet, mobile | 4 | 0 |  |
| admin/Users | desktop, laptop, tablet, mobile | 0 | 0 |  |
| admin/Access | desktop, laptop, tablet, mobile | 4 | 0 |  |
| admin/AI provider | desktop, laptop, tablet, mobile | 9 | 0 |  |
| admin/Integrations | desktop, laptop, tablet, mobile | 0 | 0 |  |
| admin/Activity | desktop, laptop, tablet, mobile | 0 | 0 |  |
| admin#account-menu | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/dashreport | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/dashreport~Workshops & Timeline | desktop, laptop | 0 | 0 |  |
| p/dashreport~Requirements & Use Cases | desktop, laptop | 0 | 0 |  |
| p/dashreport~Questions & Decisions | desktop, laptop | 0 | 0 |  |
| p/dashreport~Configuration & Readiness | desktop, laptop | 0 | 0 |  |
| p/dashreport~BRD & Sign-Off | desktop, laptop | 0 | 0 |  |
| p/dashreport~Analytics & Pivots | desktop, laptop | 0 | 0 |  |
| p/dashreport~Existing Reports | desktop, laptop | 0 | 0 |  |
| p/overview | desktop, laptop, tablet, mobile | 144 | 0 |  |
| p/proadmap | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/msaflow | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/msaflow~2
Review contract | desktop, laptop | 0 | 0 |  |
| p/msaflow~3
Review scope | desktop, laptop | 0 | 0 |  |
| p/msaflow~4
Plan sessions | desktop, laptop | 0 | 0 |  |
| p/msaflow~5
Review schedule | desktop, laptop | 0 | 0 |  |
| p/msaflow~6
Finalise & export | desktop, laptop | 0 | 0 |  |
| p/contracts | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/contracts#dialog:Add contract item | desktop, mobile | 10 | 0 |  |
| p/kickoff | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/kickoff#dialog:Add | desktop, mobile | 6 | 0 |  |
| p/plan | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/timeline | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/onboarding | desktop, laptop, tablet, mobile | 1 | 0 |  |
| p/onboarding~Excel Data Onboarding | desktop, laptop | 0 | 0 |  |
| p/governance | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/governance~RAID log | desktop, laptop | 0 | 0 |  |
| p/governance~Decisions | desktop, laptop | 0 | 0 |  |
| p/governance~Actions | desktop, laptop | 0 | 0 |  |
| p/governance~Meeting minutes | desktop, laptop | 0 | 0 |  |
| p/governance~Module owners | desktop, laptop | 0 | 0 |  |
| p/governance~Weekly digest | desktop, laptop | 0 | 0 |  |
| p/changes | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/transcripts | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/transcripts~Review queue | desktop, laptop | 0 | 0 |  |
| p/transcripts~Requirements register | desktop, laptop | 16 | 0 |  |
| p/transcripts~Open questions | desktop, laptop | 0 | 0 |  |
| p/transcripts~History | desktop, laptop | 0 | 0 |  |
| p/transcripts~Session → BRD | desktop, laptop | 0 | 0 |  |
| p/usecases | desktop, laptop, tablet, mobile | 24 | 0 |  |
| p/usecases~Discrepancies | desktop, laptop | 0 | 0 |  |
| p/usecases~Traceability | desktop, laptop | 0 | 0 |  |
| p/checks | desktop, laptop, tablet, mobile | 64 | 0 |  |
| p/checks~Validation135 | desktop, laptop | 0 | 0 |  |
| p/checks~Module status | desktop, laptop | 0 | 0 |  |
| p/checks~Scope coverage | desktop, laptop | 0 | 0 |  |
| p/checks~Source checks | desktop, laptop | 0 | 0 |  |
| p/checks~Confirmation records | desktop, laptop | 0 | 0 |  |
| p/checks~Change summary | desktop, laptop | 0 | 0 |  |
| p/checks~Activity log | desktop, laptop | 0 | 0 |  |
| p/brd | desktop, laptop, tablet, mobile | 1 | 0 |  |
| p/modules | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/modules~Custom13 | desktop, laptop | 1 | 0 |  |
| p/modules#dialog:Add module | desktop | 4 | 0 |  |
| p/flow | desktop, laptop, tablet, mobile | 16 | 0 |  |
| p/flow~States | desktop, laptop | 0 | 0 |  |
| p/flow~All modules | desktop, laptop | 100 | 0 |  |
| p/roles | desktop, laptop, tablet, mobile | 141 | 0 |  |
| p/roles~Actors by category | desktop, laptop | 68 | 0 |  |
| p/roles~Transition responsibility | desktop, laptop | 0 | 0 |  |
| p/roles~Portal workflows | desktop, laptop | 0 | 0 |  |
| p/roles~Access matrix | desktop, laptop | 1856 | 0 |  |
| p/roles~Permission checks3 | desktop, laptop | 0 | 0 |  |
| p/roles#dialog:New Role | desktop, mobile | 45 | 0 |  |
| p/cfginputs | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/cfginputs~Module relationships | desktop, laptop | 0 | 0 |  |
| p/cfginputs~Connected apps and tabs | desktop, laptop | 0 | 0 |  |
| p/cfginputs~Checks (50) | desktop, laptop | 0 | 0 |  |
| p/dashboards | desktop, laptop, tablet, mobile | 8 | 0 |  |
| p/trace | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/trace~Quality checks (3) | desktop, laptop | 0 | 0 |  |
| p/trace~Lessons learned | desktop, laptop | 0 | 0 |  |
| p/trace~Knowledge library | desktop, laptop | 0 | 0 |  |
| p/delivery | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/ftr | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/kpi | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/kpi~Summary | desktop, laptop | 0 | 0 |  |
| p/reports | desktop, laptop, tablet, mobile | 2 | 0 |  |
| p/reports#dialog:New | desktop, mobile | 12 | 0 |  |
| p/hypercare | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/hypercare#dialog:Edit | desktop, mobile | 8 | 0 |  |
| p/handover | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/guidebuilder | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/guidebuilder#dialog:New guide | desktop, mobile | 6 | 0 |  |
| p/pkgan | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/vidguide | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/guide | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/guide~Questions & feedback | desktop, laptop | 0 | 0 |  |
| p/guide~Customer answers | desktop, laptop | 0 | 0 |  |
| p/guide~Modules & order | desktop, laptop | 0 | 0 |  |
| p/resources | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/resources~Links & resources (0) | desktop, laptop | 0 | 0 |  |
| p/resources#dialog:Add note | desktop, mobile | 6 | 0 |  |
| p/tickets | desktop, laptop, tablet, mobile | 4 | 0 |  |
| p/aiwork | desktop, laptop, tablet, mobile | 16 | 0 |  |
| p/portal | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/custintro | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/templates | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/templates#dialog:New template | desktop, mobile | 6 | 0 |  |
| p/workspace | desktop, laptop, tablet, mobile | 1 | 0 |  |
| p/workspace#dialog:Add page | desktop, mobile | 7 | 0 |  |
| p/settings | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/settings~Members & customer access | desktop, laptop | 0 | 0 |  |
| p/settings~Configuration source | desktop, laptop | 0 | 0 |  |
| p/settings~JSON exports | desktop, laptop | 0 | 0 |  |
| p/settings~Audit trail | desktop, laptop | 0 | 0 |  |
| project#account-menu | desktop, laptop, tablet, mobile | 0 | 0 |  |
| p/cfginputs#dialog:Add module | mobile | 3 | 0 |  |

## 3. Root causes fixed (shared first)

1. **Two older style layers fought the design system.** `styles.css` still forced drawer footers into full-width 56–60 px slabs, uppercase drawer and dialog titles, 40 px "small" buttons inside drawers and 46 px fields in drawers. Removed at the source; the design system now owns these.
2. **Inputs without a `type` attribute (and url, tel, datetime) were never styled.** They came out narrow and short next to normal fields (Contracts, Reference/Title). Now one field style and one 38 px height everywhere, filling their grid cell; form grids stack below 860 px.
3. **Buttons had `line-height: 1`** so any label that wrapped collided with itself. Now 1.2, labels never wrap, groups wrap instead.
4. **Clickable rows, cards, tiles and list items** (1,241 per run) had click handlers but no keyboard access. A small shared pass in the shell makes them focusable and announced as buttons (table rows keep their table role), Enter and Space activate them, and they get a focus ring and hover tint.
5. **Top bar was a three-column grid** whose right side overflowed onto the project name and title at 768–1100 px. Now a flex row: the name gives way with an ellipsis.
6. **No navigation on tablets and phones**: the project menu was simply hidden below 860 px. Added a menu button that opens it as a side panel (closes on choice, outside click or Escape).
7. **Grid children could not shrink**, which pushed Data Onboarding and the BRD editor sideways on phones; header rows with long selects did the same on Workspace & Layout.

## 4. Button and control system

Defined once in `src/design-system.css` (tokens `--ds-btn-*`, `--ds-field`):

| Variant | Height | Used for |
|---|---|---|
| `.btn.lg` | 40 | Prominent page actions (New project, sign-in) |
| `.btn` | 36 | Page header actions, form and dialog footers |
| `.btn.sm` | 32 | Card headers, toolbars, table rows, inline actions |
| `.btn.icon` (+ `.sm`) | 36 / 32 square | Close, previous/next page, menu |
| `.btn.ghost`, `.btn.link` | same scale, no fill | Low-emphasis and navigation-like actions |

Emphasis: one solid blue primary per group, outlined secondary, red-outlined danger. Dialog and drawer footers: standard buttons on the right, primary last, a destructive action on the far left; full width on phones. Fixed groups: Tickets header (32/32/36), Modules toolbar (32/32/36), FTR/KPI empty state, dashboard filter "Clear all".

## 5. Portal switching, account and sign out

- **Projects | Admin** switch in the top bar for admins, on the projects home, inside a project and in the Admin console, with the current one marked. It replaces "Switch to Admin" (which was also shown while already in Admin), "Switch to Projects" in the admin sidebar, and the "All projects" text link for admins. People without admin access keep an "All projects" link inside a project.
- **Sign out** is called Sign out everywhere (was "Log out" in the account menu). It is the last account-menu item, in red text, and a quiet row at the foot of both the project and admin sidebars.
- Tested: switching both ways, current marker, sign out returns to the sign-in page.

## 6. AI features

One server task runner (`POST /api/projects/:id/ai/run`, 17 tasks). DeepSeek goes through the platform model (`ctx.llm`), Claude through Anthropic's API with the app's key. Everything else that looks "smart" (transcript requirement suggestions, guide intelligence, checks, the Teams ticket suggestion) is rule-based.

| Feature | Where | Task | Provider choice | Output |
|---|---|---|---|---|
| Generate / regenerate deliverable | Deliverables & AI | brd, uat, ftr, config, guide, training, golive, hypercare, handover, closure | Picker in the Generate drawer, else organisation default | New draft for review |
| Missing requirements, workshop intelligence, package analysis | Deliverables & AI | gaps, workshop, pkg | As above | Draft |
| Draft BRD sections | BRD Draft | brd | As above | Draft (BRD text untouched) |
| UAT plan, go-live review | Build, UAT & Go-Live | uat, golive | As above | Draft |
| Hypercare report, handover pack, closure | Hypercare, Handover | hypercare, handover, closure | As above | Draft |
| Configuration Inputs and Traceability shortcuts | those pages | gaps, guide, uat, training, handover | As above | Draft |
| Template to AI | Templates | template's kind | As above | Draft |
| Status report draft | Status Reports drawer | wsr, monthly | Organisation default | Report text (now asks before replacing) and a draft |
| FTR scenario suggestions | FTR Report | ftrrows | Organisation default | Rows you tick, marked AI-suggested |
| Video to guide steps | Video to Guide | vidguide | Organisation default | Draft |
| Admin AI provider | Admin › AI provider | — | Key save/replace/remove, test, default, fallback | Settings |

Defects found and fixed:
1. When Claude was the stored default but its key had gone from the secrets portal, the screen said DeepSeek while the server still tried Claude and failed. The server now uses DeepSeek in that case, matching the screen.
2. A Claude-to-DeepSeek fallback sent DeepSeek the large Claude-sized prompt, and skipped the shorter retry. It now gets the DeepSeek-sized prompt and the retry.
3. "Draft from project records" replaced report text you had written without asking. It now asks.
4. Admin AI panel stuck on "Loading…" after key save, remove or test.
5. A template made for one deliverable could shape another; the server now refuses a mismatch.
6. Key source details in `/api/ai/status` are now returned to admins only.
7. Copy that claimed AI where the feature is rule-based ("AI drafts the minutes", "AI suggests requirements") reworded; a toast pointing to a button that does not exist corrected; drafts started from a template now show a proper title.

Tested (server, mocked providers): default follows the key, fallback prompt is smaller than the Claude prompt, explicit Claude without a key is refused, DeepSeek outage stores nothing, key details hidden from non-admins. **Not tested against real DeepSeek or a real Claude key.** Known limits kept as designed: status reports, FTR suggestions and video-to-guide always use the organisation default (no per-run picker); each FTR suggestion run also appears in the review queue.

## 7. Exports

26 export actions were driven from the real buttons and every file was opened and its content checked (ExcelJS for Excel, mammoth for Word, pdf.js for PDF; CSV, JSON, HTML, PNG and .eml parsed).

| Export | Where | Format | Before | After |
|---|---|---|---|---|
| BRD | BRD Draft | .docx, PDF | pass | pass |
| Dashboard report | Dashboard Report | .xlsx, PDF, CSV, PNG | pass | pass |
| Data onboarding workbook | Data Onboarding | .xlsx | pass | pass |
| Workshop plan | Contract › Finalise | .xlsx | pass | pass |
| FTR and KPI workbooks | FTR Report, KPI Workbooks | .xlsx | pass | pass |
| **AI draft** | Deliverables & AI | Word | **fail: HTML saved as .doc, not a Word file; unsaved edits missing** | real .docx with edits |
| **Status report** | Status Reports | Word | **fail: HTML saved as .doc** | real .docx |
| Status report e-mail | Status Reports | .eml | pass | pass |
| **User guide (empty)** | User Guide Builder | Word, PDF | **cover page only, reported as "ready"** | refused with a message |
| User guide | User Guide Builder | .docx, PDF | pass | pass |
| Customer introduction | Customer Introduction | HTML | pass | pass |
| JSON A–C | Project Settings | JSON | pass | pass |
| Traceability, package findings | Traceability, Configuration Analysis | CSV | **package CSV had no UTF-8 marker** | both with marker |
| State flow | State Flow Builder | PNG | pass | pass |
| Overview print | Project Overview, Admin | browser print to PDF | pass | pass |

**Why Word files looked blank:** the two "Export Word" buttons saved an HTML page with a `.doc` name. Word desktop opens that in web view, but Word Online, Teams/SharePoint/OneDrive previews and mobile Word show it blank or refuse it. Both now build a real `.docx` with headings, lists, tables and citations.

Other export fixes: images in Word/Excel are typed from their bytes and WebP/GIF/SVG are converted to PNG (wrongly typed logos broke files or triggered Excel "repair"); worksheet names are made valid and unique (a KPI group called "Summary" crashed the KPI export); the onboarding workbook waits for its templates (customers could click too early) and skips empty dropdown lists; the hidden Session ID column is really emptied in the customer's workshop plan; an unedited project plan downloads the original file (re-saving dropped charts and macros); a library that fails to load can be retried and two exports no longer race the same library; empty files are never handed over; the download link lives long enough for large files.

## 8. Tests run

| Suite | Result |
|---|---|
| `npm test` (server function, mock platform) | 34 passed (24 server incl. 1 new AI provider test, 10 guide) |
| `npm run build` | OK (minified bundle used for the smoke test and deploy) |
| Browser audit, 340 screen × width | 2,599 findings before, 0 after (see table) |
| Public pages, 12 screen × width | 75 before, 0 after |
| Export content checks | 20/26 before (2 rows were new helpers, not applicable), 26/26 after |
| Functional smoke (switch, keyboard, form validate/save/persist, Cancel/Close, phone menu, sign out) | 19/19 on the production bundle |

There is no lint or type-check configured in the repository.

## 9. Screenshots

Before and after, taken from the running app: `docs/screenshots/ui-audit/` (drawer form, tickets header, tablet top bar, phone onboarding, admin shell, modules toolbar, phone report drawer, account menu).

## 10. Remaining and unverified

- Real Microsoft Teams, mailbox and Claude key: need your credentials.
- Customer sign-in on facilio.work is not possible on the platform, so customer pages were checked through the customer preview and the invitation page only.
- Hover, focus and pressed states were checked in CSS and by keyboard in the smoke test, not by a visual diff of every state.
- GPU smoothness of the intro animations was not part of this audit.
- The heuristic checks find geometry and semantics problems; colour taste and copy were reviewed only on the screenshots looked at by eye (about 30).
