# 4. UI and UX design

The rules the screens follow. Colours, depth and wording are the owner's rules; they apply to every new screen.

## Principles
1. **Neat and uncrowded.** Show the main actions; put the rest in a menu. A toolbar should read as a few clear choices (the BRD Draft page has Status, Edit text, Draft with AI, PDF, Word and a More menu).
2. **Plain words.** Say what a thing does and what is wrong, one issue per line, with a link to where to fix it.
3. **One place for one thing.** Pages that overlap become tabs of one page (for example Requirements and Use Cases; Checks and Validations with the MSA scope check).
4. **Hierarchy follows the work.** The menu runs in the order the project runs, with small headings inside a group (Where are we? / Run the project; Run the sessions / Capture and confirm / Check before design).
5. **Say what was not checked.** Banners and notices state what a check covers and what it does not.
6. **A person confirms.** AI and imports show a preview first; nothing is final until confirmed.

## Colour
| Use | Colour |
|---|---|
| Navy (text, headers, dark surfaces) | `#1D1A5E` |
| Facilio blue (primary actions, active tab, links) | `#1570EF` |
| Pink (highlights, labels, blocking notices) | `#E5197F` |
| Sky (soft accents, borders on hover) | `#8DB8FF` |
| Soft surfaces and lines | `#F4F7FD`, `#E3E9F5` |

Not allowed: violet or purple, neon or glow, heavy gradients. (`reference/design-reference.md` records an older external artifact that used violet; it is history, not a rule.)

## Depth
Slight clay and glass: a light top edge, a faint bottom shade and a soft black shadow. KPI tiles on the home page are flat white. Admin pages are flat and matte. Styles are layered in `build.mjs`; overrides use `body ...:not(#_):not(#__)` with `!important` and the last layer is `depthlayer.css`.

## Layout
- **Sidebar** groups, then pages; the active page is a dark pill. Counts show what needs a person (statements to review, blocking checks).
- **Page header**, then tabs, then content. A hub page puts its own tabs above the page's inner tabs.
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
The opening animation (tree growth) and small transitions use the Facilio Motion Kit (`docs/motionkit/animations.json`). Motion must be reduced or off when the browser asks for it, and must never block the page: the animation clamps sizes so a tiny window cannot stop it.

Discover more has two different Apple-style scroll effects, both in `src/animation/discover/`. The sign-in page (`login-scroll.*`): every solution area is a pinned scene that zooms in, its words light up with the scroll, then it shrinks away. Inside a project (`project-scroll.*`): every chapter is a dark pinned stage whose cards slide sideways while the card in focus grows. Both are switched off for reduced motion and on phones, tablets and short windows.

## Tab groups and the Team Guide
- **5. Training & Guides** is four separate tabs under one bar (`V.trainTop` in `src/pageguide.js`): Guides & Video Studio (briefs for videos, walkthroughs, step-by-step guides and training outlines), User Guide Builder (the written guide, Word or PDF), Video to Guide (steps from an existing recording), Notes & Links. Each page shows only its own work: no button points at another tab, and the "What the drafts read" panel appears on the User Guide Builder only. Checked by `tests/ui/training-tabs-check.mjs`.
- **Team Guide** (`src/teamhelp.js`) follows the menu's four levels: Part, Stage, Sub-heading, Page. Steps sit under the menu's sub-headings, and "The menu at a glance" is drawn from the live menu, so every page of the menu appears there. It also has "Set up your Claude": the Facilio Delivery Studio connector, the skills, and that no plugin is needed (the old Claude Desktop extension was removed on 2 Nov 2026).

## Customer view
A separate, calmer menu for the customer (introduction, prepare, product tour, guides, portal). Only tabs the team has switched on show. Team-only records never appear there.

## Where the design lives in code
`src/theme.css`, `src/design-system.css`, `src/clay-*.css`, `src/depthlayer.css`, one CSS file per page area, and `src/shell.js` for the menu. Further notes: [reference/design-reference.md](reference/design-reference.md), [reference/motion-and-design.md](reference/motion-and-design.md). Screenshots: `docs/screenshots/`.
