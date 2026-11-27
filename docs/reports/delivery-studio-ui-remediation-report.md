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
| Components | Buttons 14/500, 8 px; titles 16/500 in a grey header panel; tabs 14 with the open one blue; badges 4 px 12/500; tables 14/500 header, 40 px rows; fields 40 px with a focus ring; flat cards; flat KPI tiles; 4 px chips | `src/masterds.css` |
| Shell | Menu format Icons (default: the Facilio rail, violet open tile, module tabs in the top bar) or Text (a Facilio-style side menu); compact top bar; Facilio chat panel; forms as Facilio form pages; Setup-style settings | `src/shell.js`, `src/templates.js`, `src/masterds.css` |
| Colours | 6,220 hard-coded colours in 117 files moved onto the Facilio ramps (animations, dashboards, charts, widgets) | `src/**/*.{css,js}`; map in `facilio-palette-map-2026-11-27.txt` |
| Meteor brief | Names the Facilio product palette | `src/mockup.js` |
| Tests | Colour assertions follow the new values; the layout check walks the single rail layout; new pilot screenshot script | `tests/helper_status.mjs`, `tests/transfers_page.mjs`, `tests/mockup_spec.mjs`, `tests/ui/master-ds-check.mjs`, `tests/ui/ds-pilot-shots.mjs` |
| Docs | Reference audit, design system, inventory, migration plan, test register, this report; `CLAUDE.md` look rules | `docs/…`, `CLAUDE.md` |

## Regression (final, 27 Nov 2026)

- **Layout check:** `master-ds-check`, both menu formats, 1920 / 1366 / 1100 px, staff, customer and Admin: 0 problems.
- **Tests:** 135 / 135 test commands pass; `tests/ui/tasks-check.mjs` passes; `tests/ui/keyboard-zoom-check.mjs` passes (keyboard in both formats, 200 % zoom on 10 pages in both formats).
- **Coverage crawl** (`docs/reports/ui-coverage-register-2026-11-27.md`): 439 surfaces in staff (Icons and Text), customer (Icons and Text) and Admin.
  - 427 inspected; **399 fully on the Facilio system**; 0 page errors.
  - 12 tabs not reached by a click.
  - 28 flagged. After the last fix (4 more pill classes), what remains is:
    - document previews that keep the document palette on purpose (requirement schedule, sample BRD, sample solution document);
    - 11.5 px avatar initials and count badges (Facilio's own count badges are 10 px);
    - a few unclassed sample chips in Discover more and the Workshop room.
- **Earlier crawl numbers** (169 customer surfaces) crawled the staff menu while labelled customer. The final crawl uses a fresh sign-in per phase and reaches the real customer menu.
- **Old UI clean-up:** 802 dead CSS rules (89 KB) and 3 unused assets removed, each checked.

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
