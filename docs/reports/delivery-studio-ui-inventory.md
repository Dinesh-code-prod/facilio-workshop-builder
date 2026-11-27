# Delivery Studio UI inventory (27 Nov 2026)

What exists, and how far each part has moved to the Facilio design system (`docs/design/delivery-studio-design-system.md`).

## Routes

- **Project views:** the menu comes from `FWBViews.navFor()`. Every entry is walked by `tests/ui/master-ds-check.mjs`. Grouped by stage:

| Stage | Views |
|---|---|
| Home | projdash (Dashboard), lifecycle (Project cycle) |
| Project introduction | msaintake (Contract intake), intro (Kick-off, plan and schedule) |
| Requirement sessions | onboarding, workshop, rstrans (Transcripts) |
| Process & checks | whiteboard, rschecks |
| Module design | flow (State flow builder), modules (Forms & templates), roles, notifications |
| Solution design & BRD | solmap, mockup, slakpi |
| BRD & sign-off | brd, governance, changes |
| UAT & FTR | ftr, delivery, kpi |
| Training guides | guides |
| Tasks & mail | tasks, mailtab, supportdesk, transfers, golivehc |
| Handover | handover, soldoc, statusrep, trace |
| Notes & links | resources, docs |
| Show Facilio | seefacilio, dashboards, explore |
| Help | teamhelp, whatsnew, feedback, privacy |
| Claude & tools | claudesetup, webframe |
| Settings | settings, templates, workspace |

- **Views:**
  - **Staff:** all of the above (45 views; 60 rail and tab screens at 1366).
  - **Customer:** "Preview as customer" shows a subset (20 screens). Admin and Settings must stay hidden.
  - **Admin:** 9 entries, from Dashboard to Activity.
- **Outside a project:** the sign-in page (`.auth`), the projects home (`.projects-page`), Discover more, and the intro animations (`src/animation/`).

## Style layers (`build.mjs` order; later wins)

`styles.css` → `design-system.css` → `theme.css` → `font-unify.css` → … 40 page layers … → `ui.css` → `projfx.css` → `wbsurface.css` → **`masterds.css`**, the single source of truth. `build.mjs` turns its `:not(#DS)` into a 100-id chain.

| Layer | Size | Status |
|---|---|---|
| `masterds.css` | ~90 KB | **Current system.** Facilio tokens and components |
| `ui.css` | 739 KB | Legacy (coss library); colours mapped to Facilio; rules to delete in stage G |
| `styles.css` | 410 KB | Legacy base; colours mapped |
| `theme.css`, `design-system.css`, `projfx.css`, `polish.css` | 100 / 69 / 99 / 19 KB | Legacy; colours mapped |
| Page layers (`kickoff.css`, `workshop.css`, `uat.css`, …) | small | Layout plus colours (mapped); look rules to move or delete |

## Shared components (masterds rules or helpers)

| Component | Where | Facilio status |
|---|---|---|
| Top bar | `header.navbar` | Tokens. Not yet the Facilio layout (module tabs in the bar) |
| Icon rail | `nav.sidebar .rl-b`, `.adm-nav` (compact) | **Facilio:** 56 px, violet open tile |
| Module tabs | `nav.mt-bar .mt-t` | **Facilio:** grey open square |
| Page header | `.page-header` | **Facilio:** 20/500 title, actions on the right |
| Page tabs | `.tabs > .tab` | **Facilio:** 14 px, open tab blue with underline |
| Segmented | `.seg`, `.kb-seg` | **Facilio** |
| Buttons | `.btn` `.primary` `.ghost` `.danger` `.icon` `.sm` | **Facilio:** 8 px, 14/500 |
| Fields | `input`, `select`, `textarea` | **Facilio:** `#DBDBDB`, focus ring |
| Tables | `table`, `.rv-table` | **Facilio:** 14/500 header, 40 px rows |
| Badges, chips | `.tag` `.badge` `.pill` `.chip` `.pt-sh` | **Facilio:** 4 px |
| KPI tiles | `.kpi`, `.ca-tile` | **Facilio** (flat) |
| Cards | `.card` | **Facilio** (flat, hairline) |
| Status | `V.rvSt` (dot and word), `.rv-strip` | **Facilio** |
| Toast, drawer, dialog | `V.toast`, `V.drawer`, `V.dialog` | Tokens; geometry not re-checked |
| Stepper | `.md-steps` | Tokens |

## Legacy patterns still on pages (stage F)

**Tasks:**
- Nine buttons in three groups above the sheet.
- A second tab row (Tasks / My private tasks).
- Two rows of sheet chips.
- Settings buttons ("Daily brief: on") among the filters.

**Other pages:**
- **Governance:** the health lifecycle stepper with dense dates under every step.
- **Assistant panel:** pill-shaped green "Check on open / Check never" buttons (`.ki-*`).
- **Projects home:** project cards with a soft shadow (`homeclay.css`).
- **Many pages:** the "Your Claude helper has not checked in yet" note repeats on every page. It is a candidate for one notice in the bell.
