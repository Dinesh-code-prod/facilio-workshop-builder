# Delivery Studio UI migration plan (Facilio reference-led, 27 Nov 2026)

**Design system:** `docs/design/delivery-studio-design-system.md`
**Reference:** `docs/reports/facilio-reference-ui-audit.md`
**Inventory:** `docs/reports/delivery-studio-ui-inventory.md`
**Branch:** `feat/facilio-reference-ds`, not merged into main and not pushed until the user signs off.
**Supersedes:** the page-by-page part of `docs/plans/MASTER-DESIGN-SYSTEM-PLAN-2026-11-24.md`.

## Approach

**No second design system.** `src/masterds.css` stays the single last layer. Its `--ds-*` tokens are re-based on Facilio's values, so every page that already uses the shared parts changes at once. Legacy layers are migrated by **removing what they decide**, never by adding a competing file.

**Before and after:**
- `node tests/ui/ds-pilot-shots.mjs <url> <outDir>` takes the same pilot screens each time.
- `tests/ui/out/ds-before` and `ds-after*` hold the sets for this pass. They are local only (`tests/ui/out` is git-ignored).

## Stages

| Stage | What | Status |
|---|---|---|
| A | Reference research: live Facilio demo, read-only | Done |
| B | Repository audit, baseline (`master-ds-check` at 1366: 160 screens, 0 problems) | Done |
| C | Reference audit and design-system spec | Done |
| D1 | Tokens re-based on Facilio; Roboto through `--th-font` | Done |
| D2 | Buttons 8 px 14/500; page title 20/500; tabs 14 with the open one blue; badges 4 px; tables 14/500 header, 40 px rows; fields 40 px with a blue focus ring; flat cards | Done |
| D3 | Colours everywhere: 6,220 hard-coded colours in 117 `src` files moved onto Facilio ramps (animations, dashboards, charts, widgets). The script is idempotent (a second run changes 0) | Done |
| D4 | Shell: the icon rail for everyone (staff, customer, Admin), the violet open tile, Facilio module tabs, flat KPI tiles, 4 px chips | Done |
| E | Pilot screens: Contract intake, Project dashboard, Tasks, Governance, Project Settings (form), State flow builder, BRD, customer home, Admin | Shots taken; **user sign-off pending** |
| F | Page-by-page structure, in the order below | Tasks done (Facilio list page). Everything else: shared look only; the structure is next |
| G | Legacy clean-up | **First pass done (27 Nov):** `tools/dead-css.mjs` removed **802 rules (89 KB)** whose classes exist nowhere in the app, server, data or run-time-built names (two independent checks must both agree). Three unused assets were removed after `tools/unused-assets.mjs` and a manual check. All tests, the layout check and the keyboard/zoom check pass afterwards. Next: rules shadowed by `masterds.css`, page by page in stage F |
| H | Full regression | Run for D1–D4 (see the test register) |
| I | Final report | `docs/reports/delivery-studio-ui-remediation-report.md` |

## Stage F order (page structure to the Facilio templates)

Each page moves to one template from the design-system doc §4: **List**, **Record**, **Form**, **Dashboard** or **Review table**. The work is markup in that page's own JS; the look comes only from `masterds.css`. Per page: migrate, run `master-ds-check` and the page's own tests, then take shots.

1. **List pages:** Tasks (sheet toolbar → one Facilio list toolbar: view selector, search, filter, count, then New task), Change Requests, Governance logs, Tickets / Support Desk, Documents & Files, Transcripts.
2. **Record pages:** Task detail, Change Request detail, BRD section, Requirement. Back, ID, title plus status pill; the next state as the one primary button; tabs; a two-thirds / one-third layout.
3. **Forms:** Project Settings, New project, the module and form builders (Forms & templates). Section navigation on the left, a sticky footer.
4. **Dashboards:** Project dashboard, Admin dashboard, the Dashboard Gallery, Status report. Facilio widget cards; charts in the widget series.
5. **Review tables:** UAT, FTR, Checks & validations, KPIs & SLA (the 24 Nov rule already).
6. **Stateflow:** the state flow builder canvas; the record header shows state transitions as buttons.
7. **Customer view:** the same templates. Re-check that no staff-only action shows (`master-ds-check` already fails on Admin or Settings in the customer view).

## Stage G: legacy clean-up (only after F, consumer by consumer)

**Layers:** `styles.css` (410 KB), `ui.css` (739 KB), `projfx.css`, `theme.css`, `design-system.css`, `polish.css` and the page layers.

For each legacy rule group:
1. Find its consumers.
2. Check that `masterds.css` fully decides the look.
3. Delete the group.
4. Rebuild and run `master-ds-check`, `button-colour-audit`, `clutter-audit` and `npm test`.

Already decided as dead after D4: the Expanded menu switch (`V.navLayoutSeg`, `V.navPosCard` in `src/shell.js`). They are kept for one release in case of rollback.

## Rollback

| To undo | Do this |
|---|---|
| Fonts | Remove the `--th-font` line in the `masterds.css` token block |
| Rail for everyone | Restore the previous `V.navPref` in `src/shell.js` (from main), and the two lines that rendered the layout switch (account menu in `shell.js`, Tabs & Layouts in `templates.js`) |
| Colours | `git revert` the colour-map commit; `docs/reports/facilio-palette-map-2026-11-27.txt` lists every change |
