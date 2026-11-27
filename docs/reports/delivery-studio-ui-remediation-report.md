# Delivery Studio UI remediation report (27 Nov 2026)

**Branch:** `feat/facilio-reference-ds`, committed locally, **not pushed or deployed**. It waits for the user's sign-off.

## What was inspected

- **The live Facilio product demo:** 12 areas, read-only (`facilio-reference-ui-audit.md`).
- **Meteor's CMMS Demo Kit:** the captured Facilio CSS, the component registry and the page contracts.
- **This repo:**
  - all 47 style layers and the shell;
  - every route in the staff, customer and Admin views (`delivery-studio-ui-inventory.md`).

## What changed

| Area | Change | Files |
|---|---|---|
| Tokens | `--ds-*` re-based on Facilio (ink `#283648`, primary `#0024D6`, hairlines `#EAE9E9` / `#DBDBDB`, status tints, elevation, radii); Roboto via `--th-font` | `src/masterds.css` |
| Components | Buttons 14/500, 8 px; title 20/500; tabs 14 with the open one blue; badges 4 px 12/500; tables 14/500 header, 40 px rows; fields 40 px with a focus ring; flat cards; flat KPI tiles; 4 px chips | `src/masterds.css` |
| Shell | Icon rail for everyone (staff, customer, Admin); violet open tile; Facilio module tabs; layout switch removed | `src/shell.js`, `src/templates.js`, `src/masterds.css` |
| Colours | 6,220 hard-coded colours in 117 files moved onto the Facilio ramps (animations, dashboards, charts, widgets) | `src/**/*.{css,js}`; map in `facilio-palette-map-2026-11-27.txt` |
| Meteor brief | Names the Facilio product palette | `src/mockup.js` |
| Tests | Colour assertions follow the new values; the layout check walks the single rail layout; new pilot screenshot script | `tests/helper_status.mjs`, `tests/transfers_page.mjs`, `tests/mockup_spec.mjs`, `tests/ui/master-ds-check.mjs`, `tests/ui/ds-pilot-shots.mjs` |
| Docs | Reference audit, design system, inventory, migration plan, test register, this report; `CLAUDE.md` look rules | `docs/…`, `CLAUDE.md` |

## Regression

- **Layout check:** 267 screens at three widths in all three views, 0 problems.
- **Tests:** 135 / 135 test commands pass.
- **Pilot screens:** no page errors.

## Left out on purpose

- **Exported documents** (BRD, FTR, UAT guide, onboarding, plan, session and mockup exports) keep the Facilio document palette their tests require.
- **The BRD paper preview** is untouched.
- **Another session's uncommitted files** (`src/kickoff.js`, `src/quickfacts.js`, `src/rangefilter.js` and its test files) were not touched and are not in these commits.

## Outstanding

1. **Stage F, page structure:** each page moved onto the Facilio List / Record / Form / Dashboard templates. Tasks first. Plan in `docs/plans/delivery-studio-ui-migration-plan.md`.
2. **Stage G, legacy clean-up:** delete legacy look rules consumer by consumer.
3. **Defects D-03, D-04 and D-06** (test register).
4. **Edge-case testing:** keyboard, zoom, 768 px, failures, slow network, session expiry, uploads.
5. **Component gallery page:** not built. It needs a route in the app, so it would be a stage F item.
6. **The top bar:** still Delivery Studio's own layout. Facilio puts the module tabs in the top bar; here they are a strip under it.
7. **The live app:** not deployed, so nothing was checked there.
