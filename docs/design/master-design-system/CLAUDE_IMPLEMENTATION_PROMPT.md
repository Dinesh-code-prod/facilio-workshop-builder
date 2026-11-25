# CLAUDE MASTER IMPLEMENTATION PROMPT — READ THE DESIGN ZIP AND REDESIGN ALL POVs

You have been provided with `Facilio_Delivery_Studio_Master_Design_System_All_POVs.zip` and screenshots of the actual Facilio Delivery Studio application.

## Mandatory first step
Extract and read every file in the ZIP before touching code:
- `MASTER_DESIGN.md`
- `DESIGN_TOKENS.json`
- `COMPONENT_PATTERNS.md`
- `CLAUDE_IMPLEMENTATION_PROMPT.md`

The `MASTER_DESIGN.md` is the primary source of truth for the target visual language. `DESIGN_TOKENS.json` defines the starting tokens. `COMPONENT_PATTERNS.md` defines shared component behavior. This prompt defines the audit and implementation process.

## Scope — all three POVs
This is one master design system for:
1. Staff POV
2. Admin POV
3. Customer POV

Apply the same typography, colors, spacing, component styles, page-header pattern, tabs, buttons, cards, tables, navigation behavior and interaction language across all three.

The content, navigation entries, data and actions may differ only according to actual permissions, visibility and workflow responsibility. Do not create three separate visual themes. Do not expose internal Staff/Admin functionality to customers.

## What to investigate
Inspect the actual live application/source before coding:
- All routes and pages.
- Every main sidebar item and nested tab.
- Global top bar and project selector.
- Existing sidebar compact/expanded preferences.
- Tabs and layout settings.
- All page headers and action placements.
- All forms, tables, cards, modals, dropdowns and builders.
- Staff, Admin and Customer POV behavior.
- Existing font files, CSS variables, design tokens and component library.
- Data bindings, APIs, integrations, permissions and workflow rules.

Build an inventory of every page and nested tab. Do not assume the current screenshot represents the whole application.

## Required visual corrections
The supplied screenshots show these problems:
- Too many competing blue and blue-purple elements.
- Small typography, especially in tabs, buttons, tables, metadata and workflow steps.
- Too many pill-shaped controls with no clear distinction between tabs, buttons, badges and progress.
- An oversized saturated gradient page banner.
- Dense content and weak grouping.
- Crowded global header.
- Sidebar labels and module identity need refinement.

Follow the master design file:
- White/light theme throughout.
- Mostly neutral surfaces.
- Restrained violet brand accent.
- Blue reserved mainly for primary actions, focus and links.
- Semantic green/amber/red for real statuses.
- Increase readable typography; fix layout rather than shrinking text.
- Distinguish tabs, buttons, badges, stepper and cards by their purpose.
- Replace oversized gradient banners with compact structured page headers.
- Improve component placement and section hierarchy.
- Avoid decorative clutter.

## Mandatory page-header pattern
Every workspace page in all three POVs must use the shared page-header structure:
- Left: breadcrumb/stage, title, concise description, optional status.
- Right: contextual primary action, secondary actions, supported AI action if applicable, overflow for lower-priority actions.

Only expose actions that exist and that the current user is allowed to perform. Consolidate duplicate actions without removing functionality.

## Contract Intake reference page
Use the supplied Contract Intake screenshot as the first reference implementation:
- Replace the large gradient banner with a compact white/light page header.
- Place Analyse contracts as the primary contextual action on the top-right if supported.
- Keep preview and other real actions secondary.
- Improve document table typography, row height and status readability.
- Replace pill-like workflow strip with a clear stepper.
- Organize contract findings into readable sections and expandable content.
- Keep document evidence and source references grounded in actual data.
- Avoid duplicate Analyse actions.

After Contract Intake is approved and validated, use its shared patterns across the rest of the application. Do not copy its page-specific content layout to unrelated modules.

## Component placement
Design each page according to the user's actual task. Do not force all pages into generic cards or dashboards.
- Data Onboarding: spreadsheet-first.
- Stateflow: canvas-first with toolbox and properties panel.
- Tasks: usable Kanban/list/calendar views where implemented.
- UAT: test execution and evidence-first.
- Training: schedules and learning materials.
- Handover: readiness and deliverables.
- Reports: charts and filters.
- Sessions: workshop and transcript workflow.

## Implementation sequence
1. Read all ZIP files.
2. Inspect repository architecture, existing components, fonts and tokens.
3. Inventory all pages and nested tabs in Staff/Admin/Customer POV.
4. Record current functionality and permissions.
5. Map the existing UI to the master design and list gaps.
6. Reconcile design tokens with existing Facilio brand assets.
7. Implement shared tokens and components.
8. Refine global header and sidebar.
9. Implement tabs, buttons, badges, stepper and shared page header.
10. Redesign Contract Intake as the first reference page.
11. Apply the master system to every remaining page and nested tab.
12. Test all three POVs and all existing functionality.

## Strict preservation rules
- Do not delete, rename, merge or hide existing tabs or modules.
- Do not break routes or permissions.
- Do not replace real data with sample data.
- Do not replace functional components with static mockups.
- Do not break integrations, APIs, data bindings or business rules.
- Do not add dependencies before checking what is already installed.
- Do not use a global CSS override that damages page-specific layouts.
- Do not claim a page is complete if it has not been inspected and tested.

## Required final report
Provide:
1. Page inventory across all three POVs.
2. Shared components changed or created.
3. Pages redesigned.
4. Pages not yet redesigned.
5. Functional tests performed.
6. Issues or regressions found.
7. Items that could not be verified.
8. Confirmation that Staff, Admin and Customer use the same master visual system while retaining correct permission differences.

The result must be a real, working, application-wide redesign—not a mockup, not a landing-page refresh, and not a color-only change.
