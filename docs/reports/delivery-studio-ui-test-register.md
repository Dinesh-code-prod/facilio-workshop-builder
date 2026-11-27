# Delivery Studio UI test register (Facilio reference reset, 27 Nov 2026)

**Build:** branch `feat/facilio-reference-ds`.
**Where:** local dev server, data in `tests/ui/.devdata.json`, project "Demo: Riverside Towers (walkthrough)".
**Evidence:** files under `tests/ui/out/`, local only (git-ignored).

| ID | POV | Route / module | Component | Scenario | Expected | Actual | Evidence | Status | Sev | Defect |
|---|---|---|---|---|---|---|---|---|---|---|
| T-01 | All | every menu entry and stage tab | shell, header, tabs | `master-ds-check` at 1920, 1366, 1100: open state marked, no page error, no overlap, no sideways scroll | 0 problems | 0 problems over 267 screens (staff 60, customer 20, admin 9 per width) | `tests/ui/out/ds-final/master-ds-check.txt` | Pass | — | — |
| T-02 | Customer | customer preview | permissions | Admin and Settings not visible in the customer view (inside T-01) | hidden | hidden | as T-01 | Pass | — | — |
| T-03 | All | — | unit and integration | all 135 `npm test` commands, run one by one | pass | 135 / 135 pass | `runall.mjs` output | Pass | — | — |
| T-04 | Staff | msaintake, projdash, tasks, governance, settings, flow, brd | pilot screens | open each; page errors | none | none | `tests/ui/out/ds-after2/` | Pass | — | — |
| T-05 | Staff | projects home | font, colour | Roboto, Facilio blue | as spec | as spec | browser check | Pass | — | — |
| T-06 | — | sign-in (`.auth`) | font | keeps its own font | Inter | Inter (computed) | browser check | Pass | — | — |
| T-07 | All | shell | rail | rail for everyone; the open module a violet square | one open entry, violet | as expected (T-01 checks one open entry) | `ds-after2/*` | Pass | — | — |
| T-08 | Staff | Tasks | KPI tiles, chips | flat tiles, sentence-case labels, 4 px chips | as spec | as spec | browser check | Pass | — | — |
| T-09 | — | colour map | script | idempotent: a second run changes nothing; hue families kept (self-checks in the script) | 0 changes | 0 changes | `docs/reports/facilio-palette-map-2026-11-27.txt` | Pass | — | — |
| T-10 | — | exported documents | doc palette | exported BRD, FTR, UAT and onboarding files keep the Facilio document palette | unchanged | unchanged (their tests pass) | T-03 | Pass | — | — |
| T-11 | Staff | Project Settings | form | 40 px fields, 12 px labels, blue focus ring | as spec | fields and labels as spec; focus checked by keyboard (T-15): a blue border, as in Facilio | T-15 | Pass | — | D-03 |
| T-12 | All | shell | rail container | rail flush to the edge like Facilio | flush | sits in a rounded outline | `ds-after2/1366-staff-flow.png` | Fail | Low | D-04 |
| T-13 | Staff | Tasks | page structure | Facilio list template (one toolbar) | template | Facilio list page: New task + More, a view selector, one toolbar row, a settings menu; `tests/ui/tasks-check.mjs` passes | tasks-check | Pass | — | D-05 |
| T-14 | Staff | Assistant panel | buttons | no pill buttons | 8 px | 8 px buttons, 4 px chips, Facilio dialog recipe | coverage register | Pass | — | D-06 |
| T-15 | Staff | Tasks and the shell | keyboard | Tab through the top bar, menu, tabs and page in both menu formats; every focused control shows a mark | reached, marked | reached, marked (fields: Facilio blue border) | `tests/ui/keyboard-zoom-check.mjs` | Pass | — | — |
| T-16 | Staff | 10 key pages | zoom | 200 % zoom (683 × 450) in both formats: no sideways scroll, no top-bar overlap | none | none (20 of 20) | `tests/ui/keyboard-zoom-check.mjs` | Pass | — | — |
| T-17 | All | all | coverage | every page, tab, form, dialog and the chat panel, both formats, three views (`tests/ui/ui-coverage.mjs`) | Facilio | see `docs/reports/ui-coverage-register-2026-11-27.md` | register | See register | — | — |
| T-18 | All | all | API failure, slow network, session expiry, uploads | edge cases from the brief | — | not run (needs a fault-injecting server) | — | Not run | — | — |

## Defects

| ID | Root cause group | Description | Status |
|---|---|---|---|
| D-01 | Design-system inconsistency | Older layers hard-coded the old blue `#1570EF` and slate colours. | **Fixed** by the colour map (all `src` colours on Facilio ramps) |
| D-02 | Shared component | The first colour pass was not idempotent: palette colours moved, blue went to violet. | **Fixed**: files restored from main, the script rewritten with self-checks, T-09 |
| D-03 | Accessibility | Focus ring not verified with real keyboard input. | **Fixed/verified**: T-15 |
| D-04 | Shared component (shell) | The rail sits inside a rounded outline from an older layer. | Open |
| D-05 | Page-level | Page structures are not yet on the Facilio templates. | **Tasks done**; the other pages are open (stage F) |
| D-06 | Shared component | Assistant panel `.ki-*` buttons were pills. | **Fixed** (8 px buttons, 4 px chips) |
