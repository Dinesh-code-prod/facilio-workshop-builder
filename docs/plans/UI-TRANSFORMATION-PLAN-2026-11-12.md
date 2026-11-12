# UI transformation plan (12 Nov 2026)

Carries out `UI-TRANSFORMATION-DIRECTIVE-2026-11-12.md`. One stage at a time, each verified in the browser before the next.

## Stage A findings

### Skills read and how they apply
| Skill | What we take from it |
|---|---|
| tastemaker | Classify each screen (app shell, data view, editor, settings, states); lock one style and reuse it; app-shell motion only (tab/panel switches, list entrance, skeletons), no scroll theatre; anti-slop gates (one accent, no gradients without reason, no em dash in copy). |
| emil-design-eng | Motion only where it has a purpose; under 300 ms, strong ease-out, never ease-in, no `transition: all`, press scale .97, hover gated to fine pointers, nothing at all on things used 100+ times a day (tab switches stay instant). |
| ui-taste (operate, distill, craft, anti-slop) | Product UI disappears into the task; group with spacing before borders/cards; one primary action; progressive disclosure for the infrequent; one accent, one grey family, one radius scale; verify by rendering, not by build. |
| ui-ux-pro-max | Priority order: accessibility, touch targets, layout/responsive, type (14-16 px body, 1.5 line height), navigation hierarchy (`nav-hierarchy`), forms with visible labels. |

Not available: image generation for a concept target (ui-taste "image first") and the paid Uizze MCP. We work from the incumbent screens and the Apple rules instead, and say so.

### The design documents disagree (main cause of drift)
| Document | Says | Status |
|---|---|---|
| `CLAUDE.md` Look and feel (9 Nov) | Apple look, `src/ui.css` | **Current rule** |
| `docs/04-ui-ux-design.md` | coss ui, Geist, near-black primary button, "active page is a dark pill" | Stale, contradicts CLAUDE.md |
| `docs/design/design-reference.md` (27 Oct) | violet, Plus Jakarta, mono uppercase headers | History only |
| `docs/design/UI-COSS-*` | coss | History only |

The code shows the same layering: 42 CSS files load in order and `src/ui.css` (2,593 lines) overrides them with `!important` and `:not(#_)` chains. Inside `ui.css` the page header alone is restyled at lines 56, 60, 276, 430, 834 and 864, and the workspace tabs at 2251 and 2364 (the later one turns the active tab into a black pill). Each pass appended a layer instead of replacing the last, so the newest rule wins by accident.

Fix: `docs/04-ui-ux-design.md` is rewritten to the Apple system (done in this pass), and new rules replace the old ones in place where possible.

## Stage B: what the audit shows (State Flow Builder at 1440 px, typical of every project page)
Before the first table row the user scrolls past **four full-width bands**: the gradient page header with a 3-line paragraph, the "Set up your Claude helper" banner (which repeats the top-bar chip), the "Current phase" strip, then the page's own proposals box. The workspace tabs (Solution / System Modules & Form Builder / State Flow Builder / Mockup) are a **black filled pill**, the loudest thing on the screen, louder than the stage rail. The mini-tabs (Stateflows / States / All modules) are a grey segmented control, close in weight to the workspace tabs. Section headings ("Proposals for the design") are 14 px bold, the same as body labels.

### Navigation levels: one identity each (nothing removed or renamed)
| Level | Element | Now | Target |
|---|---|---|---|
| 0 App | `nav.ws-switch` (Projects / Admin) | segmented | keep |
| 1 Stage | `#projNav .rl-b` left rail | navy tile | tinted blue tile, blue icon, clear label |
| 2 Workspace | `nav.mt-bar .mt-t` | black pill | **underline tabs**: plain 14 px text, active is dark 600 with a 2 px blue bar, hairline under the bar |
| 3 Mini | `.tabs .tab` | segmented | compact segmented control (30 px), smaller than level 2 |
| Actions | page buttons | mixed | one blue primary per screen, grey capsules for the rest |

### Shared chrome: progressive disclosure
- Page header: keep the dark blue gradient (owner rule) but compact: less padding, 26 px title, description at reading width.
- Claude helper banner: one slim line (white, hairline), same text and buttons.
- Current phase strip: slim line tucked under the header.

### Type scale (apply everywhere)
Page title 26/32 600 · section heading 17/24 600 · subsection 15/20 600 · body 14/20 · label 13/18 500 · meta and helper 12/16 grey · table header 12/16 500 grey, normal case.

### Page-by-page (Stage D order)
1. Solution hub: Solution, System Modules & Form Builder, State Flow Builder (Stateflows / States / All modules), Mockup (Meteor).
2. Project overview (Home): health lifecycle, next actions, calendar; the 8-tab inner bar becomes level 3.
3. Sessions / Requirements: discussion and decisions first.
4. BRD and sign-off: focused document editor.
5. UAT and FTR: test execution first.
6. Training, Tasks, Handover, Reports, Notes, Showcase, Help, Claude.
7. AI Assistant drawer and chat surfaces.
8. Admin, projects home, sign-in (sign-in art and night city stay).
Each page: understand, evaluate, design, implement, screenshot at 1440 / 1024 / 768 / 390, refine.

## Stage D status (12 Nov 2026, first pass, checked in the browser at 1440 px and by script at 375 px)
| Page | Done |
|---|---|
| All project pages | Header description 2 lines with More; one solid primary in a header; grey header text readable on navy; helper notice button tinted; "What is this page for?" folded; card-header filters size to their options; filter switches a size below mini-tabs; side lists and the rail page list use the blue tint; chosen filter chips tinted |
| Solution | One command row (Ask Claude about all areas in it), contract notice one line, no card around the work area, reason/status/Save on one line, drop and Ask Claude as quiet columns; module list's Everything/Core/Connected switch was squashed to 6 px, fixed; no sideways scroll on phones |
| Modules, State Flow | Proposals panel one line when nothing is open |
| Mockup | Counts as a summary strip; actions in Prototype and Customer mockup groups; exports in More |
| Home | Pain points and stage map right under the figures |
| Sessions: Questions | Compact status switch, two-line answer, quiet text actions |
| BRD | Six approval checks in a three-column grid |
| Training | Light placeholders for videos still to make; tinted card actions |
| Assistant drawer | Light header (was the one black bar), neutral body, centred empty state |

Open: the projects home and sign-in still carry the older art (kept on purpose); Admin has two date ranges (Admin area and Overview widgets) that look alike; Team Guide step buttons are solid blue inside a long guide; Settings has a Save per section. Not checked: keyboard-only walk, every dialog and menu, the customer view, the live site.

## Stage C: pilot
Shared chrome and navigation levels, because they appear on every project page: workspace tabs, page header, helper banner, phase strip, section headings. Verified on State Flow Builder, Solution and Home. The user approves the direction before Stage D.
