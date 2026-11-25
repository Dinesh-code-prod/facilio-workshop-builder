# CLAUDE ADD-ON IMPLEMENTATION PROMPT — CALENDAR + LIVE REACT FLOW EXPERIENCE

Read the entire master design-system ZIP first. This add-on extends the existing master design; it does not replace it.

## Deliverables
Implement/refine two interactive experiences in Facilio Delivery Studio:
1. A professional project Calendar UI.
2. A polished, interactive React Flow-based Stateflow/visual workflow canvas with meaningful animation.

Both must follow the same white/light master design system across Staff, Admin and Customer POV. POV differences must come from existing permissions and data visibility, not separate themes.

## Step 1 — Inspect before installing
- Inspect the actual app framework, package manager, routing, styling system and existing dependencies.
- Search for any existing calendar, scheduler, graph, canvas or flow builder implementation.
- Inspect current data models and APIs for project events, tasks, workshops, training, UAT, milestones and workflow states.
- Check licensing before using advanced library features.
- Do not install duplicate libraries.
- Do not replace existing functionality until you have documented the migration benefit and risk.

## Step 2 — Calendar
Use FullCalendar React as the preferred option if compatible with the actual stack and license requirements. Use open-source Standard features unless a premium license is explicitly available.

Read `CALENDAR_UI_SPEC.md`.

Build:
- Month, week, day and list views where supported.
- Clear toolbar with Today, previous/next, date title, filters and Add Event.
- White calendar surface and soft semantic event colors.
- Optional selected-event details panel/drawer.
- Project/module/owner/status filters where supported.
- Deep links to real source records.
- Permission-aware create/edit/delete and drag/drop.
- Correct timezone behavior.
- Loading, empty, error and responsive states.

Use real application data and APIs. Do not ship placeholder events. Do not expose staff-only information in Customer POV.

## Step 3 — React Flow
Use `@xyflow/react` if the project uses React and the library is compatible. Read `REACT_FLOW_ANIMATION_SPEC.md`.

Build:
- Large central canvas.
- Collapsible left node toolbox.
- Contextual right properties panel.
- Compact toolbar for undo/redo, validate, simulate, save and publish where supported.
- Readable state nodes and transition labels.
- Straight/orthogonal connectors where appropriate to Facilio's existing Stateflow conventions.
- Subtle selected-node and valid-connection feedback.
- Animated edges only for active execution/simulation paths.
- Validation issues that link to the relevant nodes/edges.
- Accurate saving/publishing states.
- Responsive drawer behavior and reduced-motion support.

Preserve existing Stateflow semantics, cross-module links, custom actions, transition behavior and permissions. Do not turn the builder into a generic flowchart.

## Step 4 — Live interaction, not a static mockup
The calendar and builder must be connected to actual app state and APIs. Every visible control must work. If an operation is not supported by the backend, do not pretend it works; report the limitation and keep the control unavailable or clearly marked.

## Step 5 — Validate all POVs
Test Staff, Admin and Customer POV independently:
- Same visual language and component patterns.
- Correct visibility and permissions.
- Correct source data.
- No internal data leakage.
- No broken existing routes or workflows.

## Step 6 — Final report
Report:
- Existing libraries reused.
- New dependencies and licenses checked.
- Calendar views and actions implemented.
- React Flow interactions and animations implemented.
- APIs/data sources connected.
- POV-specific permission checks.
- Tests performed.
- Limitations and items not verified.

Do not deliver only a design mockup. Implement a working experience using the real application architecture.
