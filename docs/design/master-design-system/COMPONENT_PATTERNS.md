# Facilio Delivery Studio — Shared Component Patterns
Version 2.0 | These patterns apply across Staff, Admin and Customer POV.

## AppShell
Shared global header, sidebar, project context and main workspace. Visual system is shared; navigation and controls are permission-aware.

## SidebarNavigation
Data-driven items: id, label, icon, route, group, accent token, unread count, children, permission/visibility rule.
Supports expanded and icon-only modes, accessible tooltips, active state, flyouts, scrolling and future entries. Do not duplicate route or permission logic.

## PageHeader
Left: breadcrumb/stage, title, description, optional status/progress.
Right: one primary action, up to 2–3 secondary actions, optional supported AI action, overflow.
Actions are provided by the page based on real capabilities and permissions. Do not invent actions or duplicate them elsewhere.

## MainTabs
Navigation, not buttons. Use underline or soft selected surface, readable labels and adequate click area. Preserve routes and all existing tabs.

## MiniTabs / ViewSwitcher
For switching views or compact modes. Distinguish from main navigation tabs; use a subtle segmented treatment only where semantically appropriate.

## Button
Primary, secondary, tertiary, destructive and icon-only variants. Moderate radius, readable font and clear focus/disabled/loading states.

## StatusBadge
Semantic color plus text/icon. Never use color alone.

## WorkflowStepper
Completed/current/pending/blocked states driven by actual workflow data. Do not infer completion from page visits.

## DocumentTable
Readable headings and rows, document name hierarchy, metadata, status, grouped actions. Preserve sort/filter/selection and responsive behavior.

## InsightPanel
Separate extracted facts, AI interpretation, open questions and human verification. Show source references only when actual source locations exist.

## DataGrid
Preserve keyboard navigation, sorting, filtering, validation, row/column error references and large-data performance. Avoid decorative whitespace that harms data entry.

## EmptyState / LoadingState / ErrorState
Explain the state and provide only real, permitted next actions. Never imply an operation succeeded before it completes.

## Perspective behavior
Use shared components and tokens. Supply role-specific navigation, data and actions through existing permission/state logic. Do not fork the visual system by POV.
