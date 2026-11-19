# UI consistency roadmap (user, 19 Nov 2026)

Goal: keep every layout as it is, and make the parts people touch perfect and the same everywhere: buttons (label centred, one type scale), mini tabs and toggles (one system), the text inside boxes (one type scale), plus a few calm gradients so the studio is pleasant to look at. Covers the team project pages, the customer view, Admin, the Team Guide, What's new, the "Guide me" walkthrough and the tour player. Rules live in the "Consistency pass" block at the end of `src/ui.css` (after the Reference theme blocks); no page code changes.

## Audit (19 Nov 2026, 44 team pages, measured in the browser)
- Buttons: labels are vertically centred almost everywhere; horizontal drift on chip-like buttons that use left alignment (`rs-chip`, `dx-btn`, `tr-chip`). Fonts are mixed: Inter 13 / 13.5 / 14 / 11 px in weights 400, 500 and 600, plus the mono caps of the main buttons; heights run from 20 to 55 px.
- Tabs and toggles: page sub-tabs (`mt-t`) are right (34 px); tab strips (`.tab`) and sheet chips (`.pt-sh`) collapse to 16 px tall because they render inline; `dx-npill` and `brd-tab` use their own sizes.
- Text inside boxes: eleven sizes in use (10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16 px).

## The system
| Part | Rule |
|---|---|
| Main buttons (`.btn`) | pill, 40 px, mono caps 12 px / 600, label centred; main action Facilio blue with a soft blue gradient and the arrow badge |
| Small buttons (`.btn.sm`) and chip buttons | pill, 32 px, Inter 13 px / 500, label centred |
| Mini tabs and toggles | one outlined pill: 34 px, Inter 13 px / 500 (600 when selected), ink fill when selected |
| Box titles | Plus Jakarta Sans 16 px / 700 |
| Box text | Inter 14 px / 1.5 |
| Table cells | Inter 13 px; headers mono caps 11 px |
| Small and meta text | Inter 12 px |
| Gradients | page titles navy to blue; KPI tiles a thin blue bar and a faint wash; box headers a faint wash; empty states a soft blue tint. Never rainbow, never violet. |

## Phases
1. Buttons: centring, sizes and fonts (all POVs, drawers and dialogs).
2. Tabs and toggles: one pill system, fix the 16 px collapse.
3. Text inside boxes: titles, body, tables, meta.
4. Gradient accents.
5. Admin, customer view, Team Guide, What's new, Guide me and tour player checked and covered.
6. Re-run the audit, screenshots, `npm test`, push.

## Status (19 Nov 2026, later)
Phases 1 to 6 done in the page-by-page pass: the old button rules were removed from the older layers and one button set and one components set now sit at the end of `src/ui.css`; boxes inside pages have the blue-cornered hairline and soft wash; every page uses the same 28 px side margin and header order. Report with before/after screenshots: `docs/reports/REF-THEME-PAGE-PASS-2026-11-19.md`.
