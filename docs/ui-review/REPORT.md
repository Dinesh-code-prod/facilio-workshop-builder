# Project and Admin UI review (October 2026)

## How this was checked

- The app ran locally with `tools/devserver.mjs`. It runs the real server function (`work/server/api.mjs`) against an in-memory stand-in for facilio.work, signed in as the platform owner, with one seeded project (Al Moallam) and one empty project.
- `tools/ui-review.mjs` opened every page below and saved a screenshot of each, before and after the changes:
  - 1440 px wide: all 49 pages;
  - 390 px wide: 6 representative pages.
- The browser console was recorded on every page: there were no errors before or after.
- `npm test` passes all 14 checks.
- Nothing was checked on the live facilio.work site or with real customer data.

Screenshots:

- `before/1440/` — every page before the change
- `after/1440/` — every page after the change
- `after/390/` — phone width, after

## The changes, by shared component

All of the visual changes are in one file, `src/design-system.css`. It loads last (see `build.mjs`), and every page uses it.

| Area | Before | After |
|---|---|---|
| Top bar | White bar. Admin, Log out and a "Platform owner" badge sat on the right as same-looking buttons. | Navy bar with the white Facilio logo. The right side holds only the page-level controls (Preview as customer, save state, notifications) and the account avatar. Log out, Admin console and the role now sit in the account menu. On phones only the logo, notifications and avatar remain. |
| Project sidebar | Mixed active styles, a gradient background, uppercase section labels, and a filled blue tile behind the active group. | White sidebar with sentence-case section labels and one quiet active state: a navy tint with a navy line. Badges are neutral, and amber when something needs attention. Sign out sits at the bottom. |
| Page header | Mixed: a rounded gradient banner on some pages, plain on others. Buttons came in several sizes, the period picker and Export PDF floated above the content, and a role badge showed as a pill. | Every page has the same navy band: breadcrumb, title, one-line description, then actions on the right. All header buttons are 36 px, with one solid blue primary and the rest outlined. The period picker and Export PDF moved into the header next to the other actions (Project Overview, Admin Dashboard). The role is now written in the description ("Your role: Owner"). |
| Buttons | Several heights and shadows, gradient fills and a shimmer effect. | Two sizes, 36 px and 32 px. One primary (blue), secondary (white, outlined), danger (red outline) and ghost. Actions inside a card are quiet text buttons, so they never compete with the page action. |
| Cards | Coloured top borders, coloured dots before every card title, and gradient backgrounds. | White card, 1 px border, 10 px radius and one soft shadow. Titles are plain headings. |
| Number tiles | A rainbow of coloured top edges. | A neutral tile where the number leads. |
| Tags | About ten colours used freely. | Five meanings: neutral, info (blue), done (green), attention (amber) and problem (red). |
| Tabs | Pills on some pages, underlines on others. | One underline style everywhere, navy for the selected tab. |
| Tables, forms, notices, drawers | Slightly different on each page. | One header style and row hover; 38 px fields with a blue focus ring; notice colours match the tag meanings. |
| Admin console | A separate look: a pink role pill, a hero card with an illustration, and section headings with coloured bars. | The same frame as a project: white sidebar, navy header band and the same tabs, tiles and tables. The illustration is removed, and the roles show as neutral text. "Change my password" is hidden on facilio.work, where everyone signs in with Microsoft. Charts use the status colours: on track green, attention amber, stale grey, live navy. On phones the admin sections become a horizontal bar. |

No routes, actions, data, permissions or business rules were changed. The only code changes outside the stylesheet are:

- **`src/shell.js`:** the top bar's contents, and the account menu now lists Admin console and Log out.
- **`src/overview.js`:** the period filter moved into the header, and the role became text.
- **`src/admin.js`:**
  - the period filter moved into the header;
  - the chart colours changed;
  - "Change my password" is hidden on facilio.work (that action always failed there);
  - the role chip is restyled.

## Every page

Every page below was opened at 1440 px. The ones marked 390 were also checked at phone width. Each one picks up the shared header, buttons, cards, tables, tabs and tags.

### Project

| Page | Checked | Page-specific notes |
|---|---|---|
| Project Overview | 1440, 390 | Period and Export PDF moved into the header; the role is now text |
| Dashboard Report | 1440 | The filter panel is unchanged (it is the page's working area) |
| Project Roadmap | 1440 | |
| Deliverables & AI | 1440 | |
| Contract | 1440 | |
| Contracts & Integrations | 1440 | |
| Kick-off Deck | 1440 | |
| Project Plan | 1440 | |
| Plan Timeline | 1440 | |
| Data Onboarding | 1440 | |
| Governance & RAID | 1440 | |
| Change Requests | 1440 | |
| Transcripts & Requirement Confirmation | 1440 | |
| Use Cases | 1440 | |
| Checks & Validations | 1440 | |
| BRD Draft | 1440 | |
| System Modules & Form Builder | 1440 | |
| State Flow Builder | 1440 | |
| Roles & Access Permissions | 1440 | |
| Package Analysis | 1440 | |
| Configuration Inputs | 1440 | |
| Dashboard Gallery | 1440 | |
| Traceability & Quality | 1440 | |
| Build, UAT & Go-Live | 1440 | |
| FTR Report | 1440 | |
| KPI Workbooks | 1440 | |
| Status Reports | 1440 | |
| Customer User Guide | 1440 | |
| User Guide Builder | 1440 | |
| Video to Guide | 1440 | |
| Hypercare | 1440 | |
| Handover & Closure | 1440 | |
| Customer Portal | 1440 | |
| Customer Introduction | 1440 | |
| Templates | 1440 | |
| Workspace & Layout | 1440 | |
| Project Settings & Exports | 1440, 390 | |

### Admin

| Page | Checked |
|---|---|
| Dashboard: Overview | 1440, 390 |
| Dashboard: Delivery | 1440 |
| Dashboard: Customers | 1440 |
| Dashboard: Team & usage | 1440 |
| Dashboard: Quality & records | 1440 |
| Projects | 1440, 390 |
| Users | 1440, 390 |
| Access | 1440 |
| AI & Outlook | 1440 |
| Activity | 1440 |

## Not covered, and follow-ups

- **Pages seen only empty:** most project pages were opened with little or no data, so a full BRD, a long UAT list or an imported plan has not been looked at in the new style.
- **Pages not opened:**
  - module detail pages (one per module);
  - drawers, such as new project, project insights and member management;
  - confirmation dialogs;
  - the customer's own view of a project.
  These use the same shared components, but they have no screenshots.
- **BRD Draft on phones:** the two-column editor (outline and document) is cramped at 390 px. This was true before the change too.
- **Projects home:** the colours were toned down. The fuller redesign (the sample shared separately: project list, health, team allocation) needs new data from the server first: health, attention items and upcoming sessions.
- **Old CSS layers:** `src/styles.css` still contains about 3,000 lines of older layered rules, which the design system overrides. A later clean-up can delete them page by page.
