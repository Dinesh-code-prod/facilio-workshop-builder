# Master design system: plan (24 Nov 2026)

Source: `Facilio_Delivery_Studio_Master_Design_System_All_POVs.zip` (5 files, Markdown and JSON only: MASTER_DESIGN.md, DESIGN_TOKENS.json, COMPONENT_PATTERNS.md, an implementation prompt, a README; no scripts). Branch `feat/master-design-system`, off `origin/main` at 8806b14 (deploy 516). Older look plans (light energetic, reference theme, UI directive) were removed on 24 Nov 2026; they are in the git history.

## 1. What the design system asks for

- **One look for all three views** (staff, customer, Admin). Only navigation entries, actions and data differ, by permission.
- **Mostly neutral and light:** white pages, `#F8FAFC` canvas, `#F5F6FA` quiet sections, `#E5E7EB` and `#D7DCE5` borders, and text in `#202534`, `#667085` and `#98A2B3`.
- **Colour use:** blue only for the main action, links and focus. Violet is a quiet brand and AI accent. Green, amber and red only for real statuses, always with text or an icon.
- **Type:** page title 30-34 px at weight 700, section 18-20 px, card title 15-17 px, body 14-16 px, tabs and buttons 14-15 px at weight 600, table header 12-13 px at 600, nothing important under 12 px. The app's own fonts stay.
- **Geometry:** a 4 px spacing scale. Corners are 6 px on badges, 8 px on controls, 8-10 px on buttons, 10-12 px on cards and 12-16 px on panels. Shadows are a 1 px subtle one on cards and a soft one only on floating layers.
- **Different controls look different:** tabs are a text row with an underline (no outlined pills); mini-tabs are a segmented switch; buttons are primary, secondary, tertiary, destructive or icon-only, with no all-pill styling; badges are small rounded rectangles; the stepper shows done, current, pending and blocked.
- **Page header:** compact and white. On the left: stage, title, one line, optional status. On the right: one main action, two or three secondary ones, then More. No large gradient banner.
- **Sidebar:** each module gets its own soft tint and a coloured icon (Home blue, Intro violet, Sessions cyan, Solution amber, UAT green, Training pink, Tasks orange, Handover teal, Reports indigo, Notes slate, Showcase sky, Claude purple, Help and Settings slate). The open entry gets a quiet background and a marker. Labels are never cut off. Help, Claude and Settings sit apart. The Expanded and Compact modes share one route list.
- **Contract intake is the reference page:** a compact header with Analyse contracts as the main action, top right; a readable document table; a real stepper; findings in readable sections.

## 2. Where it overrides your earlier rules (please confirm)

The zip is newer than the rules in CLAUDE.md "Look and feel" from 23-24 Nov, and it reverses some of them on workspace pages:

| Rule today (CLAUDE.md) | Design system | Proposal |
|---|---|---|
| Title bands, project Home top and Home KPI tiles: deep violet-blue to blue gradients with white text | No large gradient banner; compact white header | White compact header; the title in ink; the KPI tiles become white stat tiles with a coloured icon |
| Selected tabs, chips and segments filled in violet-blue #201C5B | Tabs: underline; mini-tabs: segmented | Page tabs get a #201C5B underline; segmented switches and chips get a soft violet tint (#F1EEFF) with #201C5B text |
| Buttons are pills | 8-10 px radius, not all-pill | Buttons get a 10 px radius (main action solid Facilio blue, secondary white with a hairline, tertiary as plain text) |
| Stage page groups: blue, green and purple cards | Soft tints, neutral surfaces | Keep the cards and icons, make them white with a tinted icon tile, and mark the open page with a #201C5B underline |
| Rail: solid colour tile with a white icon (projfx.js TILE) | Soft tint with a coloured icon | Use the design system's module colours as the tint and the icon colour |
| Sign-in page and projects banner on violet-blue #201C5B | No dark page backgrounds (covers workspace pages) | **The sign-in page stays as it is** (it isn't a workspace page). The projects banner becomes a compact light header |

**Brand colours stay:** Facilio blue `#1570EF` stays the action colour (the design system's `#2563EB` is close; it says to keep brand values). Deep violet means the logo colour `#201C5B` (the design system's `#29236F` is close). Violet `#6D4AFF` is only for AI and Stateflow items, as today. The fonts stay too: Plus Jakarta Sans for titles and controls, Inter for reading text.

## 3. How it maps onto the code

The app already has the structure the design system describes. The work is a restyle of shared classes, not new components:

| Design system part | Existing code |
|---|---|
| Page header | `.page-header > .t (h1, p) + actions` (used by every view), `.ca-hero .ca-top` (project Home), `.hm-hero` (projects home), Admin headers |
| Main tabs / page tabs | `nav.mt-bar` and `.mt-in` stage groups (`src/shell.js`, PAGE_ICO), the `.tabs` family (27 uses) |
| Mini-tabs | `.seg` (27 uses), `.nav-lay` |
| Buttons | the "Buttons, one set" block in `src/ui.css` (`.btn`, `.btn.primary`, `.btn.ghost`, `.btn.danger`) |
| Badges | `.chip`, `.pill`, status tags |
| Stepper | `.stepper` (Admin), the Intro contract stepper, the lifecycle track |
| Sidebar | compact: `nav.sidebar .rl` with `.rl-b` and the `--tile` colours from `src/projfx.js`; expanded: the "Expanded sidebar" block; Admin: `.adm-nav` (and `body.adm-compact`); the layout setting: `V.navPref` |
| Top bar | `header.navbar` ("Top bar, rebuilt" block) |
| Cards, tables, fields | `.card`, `table`, inputs ("Components, one set" block) |

**How it is built:** one new style layer, `src/masterds.css`, loaded last (after `wbsurface.css`) in `build.mjs`.
- It holds the design system tokens as CSS variables, then one block per part above.
- The older layers use selectors weighted with up to about 68 ids. So the new layer writes `:not(#DS)` once per rule, and `build.mjs` expands `#DS` into a heavier id chain. The source stays readable, and the whole change comes out by removing one line from the build.
- Small JS changes only where CSS can't do it: the rail colours in `projfx.js` TILE, and Analyse contracts moved into the Contract intake header. No change to routes, permissions, data or APIs.

## 4. Per view

- **Staff, inside a project:**
  - Top bar: the same controls, fewer outlines, grouped.
  - Rail: soft module tints.
  - Every page: the compact header, underlined page tabs and the shared buttons, badges, tables and cards.
  - Contract intake: rebuilt first as the reference page.
  - Canvas pages (Process whiteboard, Stateflow) and the Data onboarding tool keep their own layout. They pick up only the shared buttons and header.
- **Customer (Preview as customer):** the same components, and the same nav filtered by the existing customer rules. Nothing staff-only becomes visible.
- **Admin:** the same header, buttons, tabs and tables. The `.adm-nav` menu (Expanded) and the 76 px icon rail (Compact) take the same soft-tint active state and marker as the project sidebar.
- **Projects home:** a compact light header instead of the violet banner. The project cards get the shared card look.

## 5. Checks

- Edge (Playwright) at 1920, 1366 and 1100 px wide, in the staff, customer and Admin views, in both sidebar layouts:
  - every sidebar entry and page tab opens its page with the right active state;
  - there are no page errors;
  - no top bar, header or tab row overlaps.
- `tests/ui/button-colour-audit.mjs`, `npm test`, `node tests/claude_launch.mjs` and `node tests/connector_skills.mjs`.
- CLAUDE.md "Look and feel" gets a new top entry that names this layer as the current rule.

## 6. Not in scope

- The sign-in page and intro animation.
- The page layouts inside the canvases.
- The colours inside BRD and Excel previews.
- Print styles.
- Deploying.
- Every page gets the shared components through the layer. Only Contract intake gets a page-specific rebuild in this pass; any other page-by-page rework is listed in the PR as not done.

## 7. Decided after the plan was approved (24 Nov 2026)

- **The projects home banner keeps its blue gradient** (user: "have the blue gradient here alone"). It runs from the logo violet-blue into Facilio blue, with white text and the city art. It is the only gradient in the app.
- **Calm colours, no rainbow** (user: "do people like this funkiness and rainbow colours"). These were chosen with ui-ux-pro-max (B2B SaaS: minimal style, slate neutrals, one blue), ui-taste ("one accent, locked; one grey family") and a web check (SaaS UIs are about 80-90% neutrals, accents used rarely, status colours always with text).
  - One cool slate grey family carries the app.
  - Facilio blue is the only accent: the main action, "you are here" (soft blue `#EFF5FF`, deep blue `#1849A9` text, a blue marker), progress and focus.
  - Green, amber and red only for real status.
  - Every side-menu, stage-card and Team Guide icon is the same grey. This replaces the design system's per-module colours and the logo violet-blue as a selection colour.
  - Violet is left only on the Stateflow Test flow button.
- **Also styled:** the chat box (the Assistant), the Updates panel and the notification pop-ups, the Team Guide, and the Admin header and Portfolio tabs.
- **Calendar and Stateflow add-on** (`Facilio_Calendar_ReactFlow_UI_Addon.zip`, Markdown only). The app is plain JavaScript, not React, and already uses the standard FullCalendar build and its own SVG Stateflow builder (the user's no-React rule). So no library was added.
  - The calendar takes the shared look: today in soft blue, readable headers, soft event tints with a coloured edge.
  - The builder gets a light dotted canvas.
  - No edge was animated: the builder has none to calm down.
  - Not done: a selected-event side panel, filters, and an animated execution path during Test flow.
- **Docs cleaned up:**
  - Removed: the coss library, the reference theme, the UI directive, plan and roadmap, the light-energetic plan, the page passes and the 6 MB of reference-theme screenshots. They are in git history.
  - Added: the zip documents under `docs/design/master-design-system/`.
  - Updated: CLAUDE.md "Look and feel" now holds the current rules only.

## 8. Status

Done:
- The shared layer for the staff, customer and Admin views.
- Contract intake: its actions are in the header, it has the stepper, and the main action is not repeated.
- The side menus in both layouts, the top bar, the chat box, notifications, Team Guide and Admin.
- The check `tests/ui/master-ds-check.mjs`.

Not page-by-page reworked (they get only the shared components): Data onboarding, Workshop room, Tasks, UAT, Training, Handover, Reports, Notes and Showcase. Each would need its own pass for the page-specific layout the design system describes.
