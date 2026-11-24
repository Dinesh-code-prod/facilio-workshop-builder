# 4. UI and UX design

The rules the screens follow. Colours, depth and wording are the owner's rules; they apply to every new screen.

## Principles
1. **Neat and uncrowded.** Show the main actions; put the rest in a menu. A toolbar should read as a few clear choices (the BRD Draft page has Status, Edit text, Draft with AI, PDF, Word and a More menu).
2. **Plain words.** Say what a thing does and what is wrong, one issue per line, with a link to where to fix it.
3. **One place for one thing.** Pages that overlap become tabs of one page (for example Requirements and Use Cases; Checks and Validations with the MSA scope check).
4. **Hierarchy follows the work.** The menu runs in the order the project runs, with small headings inside a group (Where are we? / Run the project; Run the sessions / Capture and confirm / Check before design).
5. **Say what was not checked.** Banners and notices state what a check covers and what it does not.
6. **A person confirms.** AI and imports show a preview first; nothing is final until confirmed.

## The look: the master design system (24 Nov 2026)
Source: [design/master-design-system/](design/master-design-system/) (MASTER_DESIGN.md, DESIGN_TOKENS.json, COMPONENT_PATTERNS.md, and the Calendar and Stateflow add-on specs). Code: `src/masterds.css`, the last style layer in `build.mjs`. Its rules write `:not(#DS)`, which the build turns into a long id chain so the layer wins over every older one. Plan and what was done: [plans/MASTER-DESIGN-SYSTEM-PLAN-2026-11-24.md](plans/MASTER-DESIGN-SYSTEM-PLAN-2026-11-24.md).

One look for the staff, customer and Admin views; only menus, actions and data differ, by permission. Light theme only.

## Colour: calm, colour only where it means something (user, 24 Nov 2026: no rainbow)
| Use | Colour |
|---|---|
| Main action, links, focus | Facilio blue `#1570EF` |
| "You are here" (open tab, open menu entry, chosen segment), the stage line above titles | logo violet-blue `#201C5B` on soft violet `#F1EEFF` |
| AI and Stateflow accent (sparingly) | violet `#6D4AFF` |
| Text | `#202534` ink, `#667085` secondary, `#98A2B3` muted |
| Surfaces and lines | white, `#F8FAFC` canvas, `#F5F6FA` quiet sections; `#E5E7EB` and `#D7DCE5` hairlines |
| Status, always with text or an icon | green `#16A34A`, amber `#D97706`, red `#DC2626` |

Menu icons are one neutral grey on a grey tile, for every module; no colour per module. One gradient only: the projects home banner (logo violet-blue into Facilio blue). No other gradients, no neon, no glow.

## Controls (each kind looks different; no tab is ever removed or renamed)
| Kind | Element | Look |
|---|---|---|
| Side menu, Compact | `nav.sidebar .rl-b` | grey icon tile, label never cut; open entry on soft violet with a violet-blue marker |
| Side menu, Expanded | `nav.sidebar .sb-item` | plain rows; open page on soft violet with a marker |
| Stage pages | `nav.mt-bar` cards, `.mt-t` | white card, grey icon tile; open page soft violet with a 2 px underline |
| Page tabs | `.tabs` | a text row on a hairline; the open tab has a violet-blue underline |
| Mini-tabs, view switches | `.seg`, `.kb-seg` | segmented control on a grey track; the chosen one white with violet-blue text |
| Buttons | `.btn` | 10 px corners: primary solid blue, secondary white with a hairline, ghost text, danger red text |
| Badges | `.tag`, `.badge`, `.pill` | 6 px rounded rectangles in the status colour |
| Stepper | `.md-steps` | done green tick, current violet-blue ring and bold label, pending neutral |
| Cards, panels | `.card`, the Assistant, the Updates panel | white, hairline, 12–14 px corners, a soft shadow only when floating |

## Type scale
Page title 32 px / 700 · section 18–20 px · card title 16 px / 600 · body 15 px · tabs and buttons 14–15 px / 600 · table header 12.5 px / 600 · nothing important under 12 px. Plus Jakarta Sans for titles and controls, Inter for reading text. Sentence case; no tiny uppercase labels.

## Layout
- **Page header**: compact and white. Left: stage line, title, one line of description. Right: the page's own actions (one primary). No banner. Contract intake is the model: Upload the MSA, then Analyse contracts, sits top right and is not repeated in the page.
- **Drawers** (right side) for settings and forms; **dialogs** for confirmations (delete, replace, export with blocking issues).
- **Banners**: red or pink for blocking, blue-grey for information. Long lists collapse; each issue has a "Fix this" link.
- **Document editor** (BRD Draft): paper pages, a formatting bar (bold, italic, underline, undo, redo, add paragraph, heading, bullets, table), blocks with a "⋯" menu. Enter starts a new paragraph.

## Components
Buttons (primary blue, default, ghost, danger), tabs, chips, tags, cards with a header, tables with sticky headers, menus (`details.mnu`), toasts, loading overlays. Reuse these; do not add a new style for one page.

## Empty, loading and error states
Every list says what to do when empty ("Upload a transcript to start"); loading shows a short message; errors say what happened and what to try, never a stack trace or "something went wrong" alone.

## Accessibility
Real buttons and inputs, labelled fields, `role="tablist"` on tab bars with `aria-selected`, visible focus, keyboard reachable menus, reduced-motion respected for the opening animation and transitions.

## Motion
While people wait (24 Nov 2026, `src/masterds.css` "Motion while people wait"): a block that only says "Loading…" becomes a grey skeleton with a soft shimmer (marked by `skel` in `src/projfx.js`; the words stay for screen readers); the project search shows a moving blue line while it runs and its results rise in one after another; the Assistant lists what a running Claude job has reported (ticks for earlier reports, a pulsing dot on the newest), from the real progress lines only. All of it stands still under reduced motion. Check: `node tests/ui/motion-check.mjs`.

The opening animation (tree growth) and small transitions use the Facilio Motion Kit (`docs/design/motionkit/animations.json`). Motion must be reduced or off when the browser asks for it, and must never block the page: the animation clamps sizes so a tiny window cannot stop it.

Discover more has two different clean scroll effects, both in `src/animation/discover/`. The sign-in page (`login-scroll.*`): every solution area is a pinned scene that zooms in, its words light up with the scroll, then it shrinks away. Inside a project (`project-scroll.*`): every chapter is a dark pinned stage whose cards slide sideways while the card in focus grows. Both are switched off for reduced motion and on phones, tablets and short windows.

## Tab groups and the Team Guide
- **5. Training & Guides** is four separate tabs under one bar (`V.trainTop` in `src/pageguide.js`): Guides & Video Studio (briefs for videos, walkthroughs, step-by-step guides and training outlines), User Guide Builder (the written guide, Word or PDF), Video to Guide (steps from an existing recording), Notes & Links. Each page shows only its own work: no button points at another tab, and the "What the drafts read" panel appears on the User Guide Builder only. Checked by `tests/ui/training-tabs-check.mjs`.
- **Team Guide** (`src/teamhelp.js`) follows the menu's four levels: Part, Stage, Sub-heading, Page. Steps sit under the menu's sub-headings, and "The menu at a glance" is drawn from the live menu, so every page of the menu appears there. It also has "Set up your Claude": the Facilio Delivery Studio connector, the skills, and that no plugin is needed (the old Claude Desktop extension was removed on 2 Nov 2026).

## Customer view
A separate, calmer menu for the customer (introduction, prepare, product tour, guides, portal). Only tabs the team has switched on show. Team-only records never appear there.

## Where the design lives in code
`src/masterds.css` (the last layer, the master design system), with `src/projfx.css` and `src/ui.css` below it, one CSS file per page area, and `src/shell.js` for the menu. Motion notes: [design/motion-and-design.md](design/motion-and-design.md).
