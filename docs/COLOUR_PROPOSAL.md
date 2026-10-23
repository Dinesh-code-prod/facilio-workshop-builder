# Colour update #19 — proposal only (awaiting approval)

**Status: APPROVED and applied (colours only).** Form Builder, State Flow Builder and `--sf-*` tokens keep Facilio colours.

## Sources inspected
- `TL_Studio_UI_Reference.md` — **not found** in the repository, the uploads or the workspace. The only TL document supplied is `TL_Implementation_Studio_Handoff.md`, which contains no colour table.
- `Silal_Implementation_Studio.html` (his app) — the `:root` tokens on lines 8–13 and the accent classes `.a-*` / `.o-*` (lines 171, 172, 262). These are the values below.
- Current theme: the `:root` tokens in `src/styles.css` (lines 4–15).

If `TL_Studio_UI_Reference.md` exists with different values, send it and this table will be re-checked against it before anything is coded.

## Proposed changes (token → token; usage counts are `var(--token)` references in `src/styles.css` + `src/*.js`)

| Role | Current (Facilio) | Proposed (TL Studio) | Where it is used | Uses |
|---|---|---|---|---|
| Primary / links / active tab / primary buttons / KPI numbers / bar fill | `--fc-primary` **#0a7aff** | **#623CF6** (violet) | primary buttons, links, active sidebar item and tabs, focus rings, progress fills, Dashboard Report KPI numbers and PNG/PDF headers | 76 |
| Primary hover | `--fc-link-hover` #005beb | #4B23E0 (violet-2) | link and primary-button hover | 1 |
| Primary tint (selected rows, chips) | rgba(10,122,255,.9) / light blue fills | #EFEBFF (violet-soft) | selected state, info pills | few |
| Body text | `--fc-text` #324056 | #2B2645 | all body text | 15 |
| Headings | `--fc-text-strong` #303133 | #120B2E (ink) | h1–h4, table headers | 26 |
| Muted text | `--fc-muted` #8ca1ad | #9A97AE (faint) | placeholders, hints | 22 |
| Caption text | `--fc-caption` #6b7e91 | #6B6785 (muted) | captions, stat labels | 45 |
| Borders | `--fc-border` #ebeff3, `--fc-border-2` #e6ecf3 | #E7E5F0 (line) | cards, tables, dividers | 97 |
| Strong borders | `--fc-border-3` #d0d9e2 | #D9D6E6 (line-2) | inputs, buttons | 23 |
| Table header / panel fill | `--fc-head-bg` #f7f9fc | #F6F5FB (soft) | table heads, cards headers | 12 |
| Hover fill | `--fc-hover` #f5f7fa | #EDEBF6 (soft-2) | row and menu hover | 13 |
| Page background | `--fc-page` #f4f6f8 | #FBFAFE (bg) | app background | 2 |
| Success / done | `--fc-success` #46ca87 | #12A35B on #E7F7EE | green pills, Completed, progress | 8 |
| Danger / blocking | `--fc-danger` #eb696a | #D92D20 on #FEECEB | red pills, errors | 12 |
| Warning / needs review | `--fc-warning` #f7a23b, `--fc-yellow` #b7791f | **#F26B1D** (orange) on #FFF1E8; amber #B54708 on #FFF6E5 for text | warning notices, "Needs review" pills | 8 |
| Brand accent (logo tile, section labels) | `--fc-pink` #ff3184 | #C11574 (pink) | logo mark, `pink-label` section headings | 4 |
| Avatar | `--fc-avatar` #473a9e | #4B23E0 | user avatar | 1 |

## Not changed (kept as Facilio's own colours)
- State Flow Builder: `--sf-line` #3995e2, `--sf-active` #ff6660, `--sf-user` #6071db, `--sf-cond` #45bec4, `--sf-time` #4eb871, `--sf-initial` #60a9a6.
- Form Builder preview (the Facilio form look).
- Dashboard Report chart palette keeps its semantic colours (success / warning / danger).

## Affected UI components if approved
Navbar and sidebar (active item, group icons), buttons (primary / secondary / danger), tabs, tables, cards and stat tiles, status pills and tags, notices, drawers and dialogs, progress bars, Dashboard Report (KPIs, bars, pivots, exports), BRD editor chrome (not the BRD document colours, which follow the BRD profile).

## Constraints that would be kept
Colours only — no layout, spacing, size, font, icon, radius or tab-order change. Before/after screenshots of Overview, Project Plan, Module Builder, State Flow Builder, Form Builder preview, Dashboard Report and BRD would be taken with the same viewport.

## Decision needed
Reply **"approve colours"** (or edit the table) and the change will be made in one commit touching the `:root` tokens plus the 3 hard-coded `#0a7aff` uses (`src/styles.css`, `src/plan.js`, `src/dashreport.js`).
