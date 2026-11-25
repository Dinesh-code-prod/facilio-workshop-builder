# FACILIO DELIVERY STUDIO — MASTER DESIGN SYSTEM
Version 2.0 | Master visual and UX specification | Applies to Staff, Admin and Customer POV

> This is the master design source for the entire Facilio Delivery Studio application. It is not a design suggestion for one page. Every POV, module, page, nested tab, modal, builder, table and workflow must use this shared visual language. Differences between POVs are permitted only where navigation, permissions, data visibility or workflow responsibilities genuinely differ.

---

# 1. Product design vision

Delivery Studio should feel like a modern, energetic, polished implementation workspace: clear, confident, easy to navigate, and comfortable for long working sessions.

The current screenshot reveals why the interface can feel visually boring despite having bright colors:
- Many elements use similar blue or blue-purple treatments, so nothing has a clear visual priority.
- The large saturated gradient banner consumes attention without helping users complete the task.
- Small typography makes the interface feel compressed and less confident.
- Tabs, buttons, status chips and workflow steps all look like variations of the same pill.
- Dense content is not sufficiently structured into clear sections.
- The global header and page controls compete for attention.
- The sidebar has little visual identity between modules.
- Large blocks, borders and controls are repeated without enough variation in hierarchy.

**The answer is not to add more colors, gradients or decoration.** The answer is to improve composition, spacing, typography, control differentiation, grouping, and purposeful use of color.

## Non-negotiable principles
1. White/light theme by default across all POVs.
2. No dark theme, dark gradients or dark page backgrounds.
3. Use one coherent design system across Staff, Admin and Customer POV.
4. Preserve each POV's actual permissions, routes, data visibility and available actions.
5. Do not remove, rename, merge, hide or silently relocate existing features.
6. Do not replace real functionality or data with mockups.
7. Do not make every component blue, pill-shaped, gradient-filled or shadow-heavy.
8. Do not shrink typography to fit a crowded layout. Fix the layout.
9. Design for future modules and growing amounts of project information.
10. Prefer reusable components and design tokens over page-specific CSS patches.

# 2. Master visual language

## 2.1 Overall look
- White primary surfaces.
- Very light cool-neutral page background where separation is useful.
- Clear dark text with strong contrast.
- Soft accent surfaces rather than large saturated fills.
- Thin neutral borders.
- Restrained shadows only for floating layers and meaningful elevation.
- Moderate corner radii.
- Strong, readable headings.
- Purposeful color in active navigation, primary actions, statuses and meaningful data.
- Consistent icon style and sizing.

## 2.2 What to avoid
- Full-width purple-to-blue gradients as default page headers.
- Blue borders around every card and control.
- Blue active states on every tab and navigation item.
- A page made entirely of outlined pills.
- Repeated cards nested inside other cards.
- Tiny uppercase labels used as the main hierarchy.
- Oversized empty panels that waste vertical space.
- Heavy drop shadows on ordinary content.
- Randomly colored icons with no semantic purpose.
- Excessive animation, pulsing or blinking.

# 3. Master color system

The interface should be mostly neutral. Accent colors should identify purpose, not decorate every element.

## 3.1 Core tokens

| Token | Value | Usage |
|---|---|---|
| Page | `#FFFFFF` | Main workspace surface |
| Page subtle | `#F8FAFC` | Optional outer canvas |
| Surface | `#FFFFFF` | Cards, panels, menus |
| Surface subtle | `#F5F6FA` | Quiet section backgrounds |
| Surface selected | `#F1EEFF` | Selected soft violet state |
| Border | `#E5E7EB` | Standard separators |
| Border strong | `#D7DCE5` | Emphasis where needed |
| Text primary | `#202534` | Main text |
| Text secondary | `#667085` | Supporting text |
| Text muted | `#98A2B3` | Low-priority metadata |
| Brand violet | `#6D4AFF` | Brand accent, selected navigation sparingly |
| Deep violet | `#29236F` | Rare brand emphasis |
| Primary action blue | `#2563EB` | Main action, links, focus |
| Teal | `#0D9488` | Supporting accent |
| Success | `#16A34A` | Completed / successful |
| Warning | `#D97706` | Needs attention |
| Danger | `#DC2626` | Error / destructive |
| Info | `#2563EB` | Informational state |

## 3.2 Color allocation rules
- At least 70–80% of ordinary workspace surfaces should remain neutral/white.
- Use blue primarily for the single most important action in an action group, links, focus and selected controls when appropriate.
- Use violet as a restrained Facilio/AI accent, not as a second competing primary color.
- Green, amber and red must reflect actual status semantics.
- Teal, cyan, orange, pink and indigo may be used for module identity in the sidebar, but in soft tints.
- Avoid multiple saturated accents in the same small component group.
- Never communicate status by color alone; include text or an icon.
- Do not change established Facilio brand tokens until the existing application palette has been inspected and reconciled.

## 3.3 Sidebar module accent suggestions
Use soft backgrounds and colored icons, not solid saturated blocks.

| Module | Accent | Soft surface |
|---|---|---|
| Home | `#2563EB` | `#EFF6FF` |
| Intro | `#7C3AED` | `#F5F3FF` |
| Sessions | `#0891B2` | `#ECFEFF` |
| Solution | `#D97706` | `#FFFBEB` |
| UAT | `#16A34A` | `#F0FDF4` |
| Training | `#DB2777` | `#FDF2F8` |
| Tasks | `#EA580C` | `#FFF7ED` |
| Handover | `#0D9488` | `#F0FDFA` |
| Reports | `#4F46E5` | `#EEF2FF` |
| Notes | `#64748B` | `#F1F5F9` |
| Showcase | `#0284C7` | `#F0F9FF` |
| Claude | `#9333EA` | `#FAF5FF` |
| Help / Settings | `#64748B` | `#F8FAFC` |

# 4. Typography system

The supplied screenshot shows typography that is too small in several places, particularly table headings, tab labels, metadata, workflow steps and buttons.

**First inspect the real application font stack and loaded font assets.** Reuse the established Facilio heading/body font where appropriate. Do not guess a font from a screenshot or introduce a decorative font.

## Recommended scale
| Element | Target size | Weight |
|---|---:|---:|
| Page title | 30–34 px | 650–700 |
| Section heading | 18–20 px | 600–650 |
| Card/panel title | 15–17 px | 600 |
| Body text | 14–16 px | 400 |
| Tabs | 14–15 px | 550–600 |
| Buttons | 14–15 px | 550–600 |
| Table header | 12–13 px | 600 |
| Table body | 13–14 px | 400 |
| Supporting text | 13–14 px | 400 |
| Metadata | 12–13 px | 400 |
| Compact auxiliary label | 12 px minimum | 500 |

Rules:
- Same family and visual voice across headings, buttons, mini-tabs, navigation and body.
- Do not use ultra-condensed or ornamental fonts.
- Improve line-height in long descriptions.
- Do not use tiny uppercase text as the only label for important content.
- Increase hit areas and typography before increasing decoration.
- Preserve readable contrast in every POV.

# 5. Spacing, sizing and geometry

Use a 4 px spacing base:
`4, 8, 12, 16, 20, 24, 28, 32, 40, 48`

Suggested radii:
- Small badge: 6 px.
- Inputs and compact controls: 8 px.
- Buttons: 8–10 px.
- Cards: 10–12 px.
- Large panels: 12–16 px.

Layout rules:
- Align page sections to a consistent grid.
- Use 20–24 px between major sections.
- Use 12–16 px inside ordinary cards.
- Avoid cramped rows and oversized blank panels.
- Do not nest cards unnecessarily.
- Use full width for spreadsheets, builders and data-heavy work.
- Use constrained reading widths for long text.
- Keep sticky toolbars and floating controls from obscuring content.

# 6. Application shell — shared across all POVs

## 6.1 Global top bar
Retain and refine the actual global controls found in the application:
- Facilio / Delivery Studio identity.
- Projects and Admin navigation.
- Project selector.
- Search and keyboard shortcut.
- Guide me.
- Preview as customer.
- Save status.
- Updates / notifications.
- User profile.

Structure:
- Left: brand and workspace navigation.
- Center: project context and global search.
- Right: help/guide, preview, save state, updates, profile.

Rules:
- Group related items visually.
- Keep global controls compact but readable.
- Do not duplicate page-specific actions here.
- Reduce outlines around every item; use spacing and grouping.
- At narrower widths, move low-priority controls into overflow rather than clipping.
- Preserve all current behavior and access rules.

## 6.2 Sidebar
Retain the vertical navigation pattern. Improve its readability and identity.

Current visible modules include:
Primary:
- Home
- Intro
- Sessions
- Solution
- UAT
- Training
- Tasks
- Handover
- Reports
- Notes
- Showcase

Utility:
- Help
- Claude
- Settings

Audit the actual route configuration for any additional items. Do not remove or rename any.

Requirements:
- Target approximately 76–84 px for icon-plus-label compact rail, adjusting to fit actual text.
- Never truncate a label.
- If icon-only mode is selected, show accessible tooltips.
- Use 20–22 px icons with consistent icon containers.
- Use soft module accent surfaces.
- Selected item gets a clear but restrained background and active marker.
- Separate primary navigation and utility navigation.
- Place notification badges consistently without covering icons.
- Support scrolling for future modules.
- Keep keyboard focus and hover states visible.

## 6.3 Sidebar display preferences
Preserve and improve existing Tabs & Layout / navigation settings:
- Expanded: icon plus complete label, optional nested navigation.
- Compact: icon-only rail, tooltip and contextual flyout.
- Both modes must use the same route, permission and navigation configuration.
- Persist preferences through the existing preference architecture.
- Do not create duplicate settings or change storage semantics without investigating the current implementation.

## 6.4 Nested navigation
Use a white flyout surface, thin border, restrained shadow, clear section labels, readable rows, optional short descriptions, and a soft active state. Keep flyouts inside the viewport and do not cover essential page controls.

# 7. Page tabs and mini-tabs

The screenshot shows tabs rendered as small pills, while buttons and workflow indicators also use pill shapes. This makes their purpose unclear.

Tabs are navigation, not buttons.

Preferred treatment:
- A clean horizontal tab row.
- Active tab shown by a restrained violet/deep-violet underline or soft selected surface.
- Inactive tabs are neutral text, not individual outlined pills.
- 14–15 px labels.
- Comfortable click target and spacing.
- Consistent active, hover, focus and disabled states.
- Horizontal scrolling or a More menu when many tabs exist; never silently hide tabs.
- Preserve all existing routes and tab behavior.

Use a distinct component for:
1. Main module tabs.
2. Secondary page tabs.
3. Mini-tabs / segmented view switches.
Do not force all three to look identical.

# 8. Shared page header and contextual actions

Every workspace page in every POV should use the same page-header design pattern.

Left:
- Breadcrumb or project stage.
- Page title.
- Short description.
- Optional progress/status.

Right:
- One primary action where appropriate.
- Up to two or three secondary actions.
- AI action only if genuinely supported.
- Overflow menu for less frequent actions.

Rules:
- Contextual actions are supplied by the page, not hardcoded into the shared header.
- Show only actions supported by actual implementation and current permissions.
- Do not invent actions based on examples.
- Avoid duplicate actions if moved into the header.
- At narrow widths, wrap or move low-priority actions into overflow.
- Keep the header compact and mostly white; no oversized gradient banner.

Examples to verify against actual capabilities:
- Contract Intake: Analyse contracts, Preview, AI insights.
- Data Onboarding: Import Excel, Export template, Validate, Add custom sheet.
- Workshop: Start session, Share, Transcripts.
- Stateflow: Save, Test, Publish.
- UAT: Create test, Run tests, Export.
- Training: Schedule, Add material, Attendance.
- Tasks: Add task, Filter, Change view.
- Handover: Validate readiness, Generate handover, Export.
- Reports: Date range, Filters, Export.

# 9. Component placement and page composition

Do not use the same card dashboard layout for every module. Choose the arrangement based on the work being done.

## 9.1 Standard workspace composition
1. Breadcrumb / back navigation.
2. Page tabs if relevant.
3. Compact page header with title, description and contextual actions.
4. Optional status/progress summary.
5. Main task area.
6. Supporting details, guide or activity panel.
7. Secondary actions and history placed near the content they affect.

Avoid stacking multiple large header panels before the user reaches the actual work.

## 9.2 Contract Intake — screenshot-informed target
The current screenshot has a large saturated purple-blue banner, tiny tabs, a dense document row, a compressed progress tracker and long analysis text.

Recompose as follows:
- Back navigation and page tabs remain at the top, with tabs using the shared tab treatment.
- Compact page header: stage label, “Contract Intake” title, concise description on the left; Analyse contracts as the primary contextual action on the right; Preview/other supported actions as secondary.
- Remove the oversized gradient banner. Use white/light surface, clear title typography and a small brand accent.
- Document area should have a clear section title and count.
- Document table should use readable headings, row height, filename, page count, added date, status and grouped actions.
- Use readable semantic status badges; do not rely on tiny grey text.
- Workflow should be a real horizontal stepper with completed/current/pending states.
- Analysis state should be a compact notice with clear status and one appropriate action.
- Analysis findings should be grouped into readable sections, with expandable long content and source references where available.
- Do not repeat Analyse actions in multiple places unless there is a clear reason.
- Ensure the actual document and analysis content remains the focus, not decoration.

## 9.3 Data Onboarding
Spreadsheet-first layout. Keep import/export/validation actions in page header. Use visible validation summary, row/column error references, custom sheets, keyboard navigation, large-data performance and clear guides. Do not sacrifice grid usability for decorative whitespace.

## 9.4 Sessions
Clear session list, live workshop workspace, transcript and outcome areas. Make session state and next action obvious.

## 9.5 Solution
Use task-specific layouts for process whiteboard, Stateflow, forms/templates, roles/access and notifications. Stateflow should prioritize the canvas, toolbox and contextual properties panel.

## 9.6 UAT
Prioritize test cases, execution status, defects, evidence, retesting and sign-off.

## 9.7 Training
Prioritize schedule, training material, attendees, completion and follow-up.

## 9.8 Tasks
Support Kanban, list and calendar views where implemented. Make ownership, priority, due date and status readable. Distinguish task cards by information hierarchy, not excessive color.

## 9.9 Handover
Prioritize readiness, required deliverables, pending actions, owners and export.

## 9.10 Reports
Prioritize meaningful charts, filters, date ranges, readable data labels and export.

## 9.11 Notes and Showcase
Notes should be searchable and organized. Showcase should be presentation-ready and not look like an internal admin screen.

# 10. Control styling — distinct visual roles

Do not style every control as a pill.

## Buttons
- Primary: one visually prominent action per group, usually Facilio blue.
- Secondary: white/neutral surface with subtle border.
- Tertiary: text or ghost treatment.
- Destructive: red text/icon with confirmation where appropriate.
- Icon-only: accessible label and tooltip.
Use moderate 8–10 px radius and readable 14–15 px text.

## Status badges
Compact rounded rectangles or chips, semantic color with text/icon. Avoid tiny low-contrast labels.

## Cards and panels
White surfaces, subtle border, moderate radius, minimal shadow. Use tinted headers or accent markers only where they clarify grouping.

## Inputs
Consistent height, readable labels, visible focus ring, helpful validation. Do not rely on placeholder text as the only label.

## Tables
Readable header and body font, comfortable row height, clear alignment, sticky header where useful, grouped row actions, responsive horizontal scroll or column prioritization. Preserve sorting, filtering, selection, keyboard navigation and bulk operations where implemented.

## Progress stepper
Distinct completed/current/pending/blocked states based on real workflow data:
- Completed: green check.
- Current: restrained brand accent and stronger label.
- Pending: neutral.
- Blocked: semantic warning/danger.
Never infer completion from a page visit.

## Empty, loading and error states
Explain what is happening and offer only real permitted next actions. Show import/AI progress honestly. Never report success before the operation succeeds.

# 11. All three POVs — one master system

This design system is mandatory across:
- Staff POV.
- Admin POV.
- Customer POV.

Shared across all three:
- Color tokens.
- Typography.
- Spacing.
- Buttons and tabs.
- Cards and tables.
- Sidebar behavior and visual language.
- Page-header structure.
- Contextual action placement.
- Loading, empty, error and success states.
- Interaction and accessibility patterns.

Allowed to differ by POV:
- Which navigation entries appear.
- Which actions are available.
- Which data is visible.
- Which workflow responsibilities are shown.
- Admin-only configuration and staff-only internal tools.
- Customer-facing labels/content where the existing product requires them.

Do not create three unrelated themes. Do not make Customer POV visually simpler or less polished. Do not expose internal Staff/Admin functionality to customers. The same component must adapt to permissions and data, not fork into three inconsistent designs.

# 12. Motion and feedback

Use purposeful, restrained motion:
- Navigation transitions.
- Expand/collapse.
- Progress changes.
- Import/validation processing.
- AI execution feedback.
- Drag/drop.
- Stateflow node interactions.
- Notification arrival.

Respect reduced-motion settings. Avoid constant animation and blinking for routine notifications.

# 13. Accessibility and responsive behavior

- Visible keyboard focus.
- Accessible labels for icon-only controls.
- Sufficient color contrast.
- Do not rely on color alone.
- Comfortable hit targets.
- Responsive header and action overflow.
- Sidebar scroll behavior for growing module lists.
- Table overflow/column prioritization.
- Respect reduced-motion preference.

# 14. Claude implementation instructions

Before coding:
1. Read this entire file, `DESIGN_TOKENS.json`, `COMPONENT_PATTERNS.md`, and `CLAUDE_IMPLEMENTATION_PROMPT.md`.
2. Inspect the actual repository and determine framework, routes, fonts, design tokens, shared components and state architecture.
3. Audit all pages, nested tabs and controls in Staff, Admin and Customer POV.
4. Record the existing navigation and all existing functionality.
5. Compare actual pages with this design system.
6. Create a page-by-page implementation checklist.
7. Identify reusable components before modifying individual pages.

Implementation order:
1. Reconcile tokens with existing Facilio brand values.
2. Implement shared typography, spacing, color and radius tokens.
3. Refine global header and sidebar.
4. Refine main tabs, mini-tabs, buttons, badges and stepper.
5. Implement shared page header and contextual action slot.
6. Redesign Contract Intake as the reference page.
7. Apply the design system to every other page and nested tab.
8. Verify Staff, Admin and Customer POV independently.

Do not perform a superficial global CSS replacement. Prefer shared tokens and reusable components. Do not add dependencies until checking whether the project already has suitable libraries.

# 15. Acceptance checklist

The work is not complete until:
- All three POVs use the same master visual system.
- Role-specific functionality and visibility remain correct.
- The UI is white/light throughout.
- Blue is no longer used indiscriminately.
- Oversized saturated gradient page banners are removed or replaced with restrained headers.
- Typography is noticeably more readable.
- Tabs, buttons, badges and progress steps have distinct visual treatments.
- Component placement and page hierarchy are improved.
- The sidebar labels are readable and future modules are supported.
- Every workspace page has contextual top-right actions where appropriate.
- Actions correspond to real functionality and permissions.
- Existing routes, integrations, data bindings and business rules still work.
- Loading, empty, error, disabled and success states are covered.
- A page-by-page report lists completed, pending and unverified areas.

**Final standard:** One cohesive, elegant, energetic Facilio Delivery Studio across Staff, Admin and Customer POV. The application should feel thoughtfully composed, not merely recolored.
