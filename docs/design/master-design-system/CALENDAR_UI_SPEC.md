# CALENDAR UI SPECIFICATION — FACILIO DELIVERY STUDIO
Version 1.0 | Applies to Staff, Admin and Customer POV where calendar access is permitted

## 1. Purpose
Create a professional, interactive calendar experience for project schedules, workshops, training sessions, UAT events, task due dates, milestones and handover activities. It must use the master Delivery Studio design system: white/light surfaces, readable typography, restrained accent colors and clear contextual actions.

## 2. Recommended library
**FullCalendar React** is the recommended starting point for a conventional calendar:
- Docs: https://fullcalendar.io/docs/react
- React guide: https://fullcalendar.io/docs/react
- Standard plugins: https://fullcalendar.io/docs/plugin-index
- License: https://fullcalendar.io/license

Use the open-source Standard features first. Do not assume premium resource timelines or scheduler views are free. Verify license requirements before adopting any premium plugin.

If the existing app already uses another calendar library, inspect it before adding a dependency. Avoid installing a second calendar stack without a clear reason.

## 3. Suggested package setup
For a React application, after confirming the project uses React and checking the package manager:

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

Example imports:

```tsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
```

Do not copy this setup blindly if the application uses a different framework, build system, package manager or an existing calendar dependency. Adapt to the actual repository.

## 4. Calendar page layout

### Top toolbar
Left:
- Page title: `Project Calendar`
- One-line description such as `Schedules, milestones and delivery activities`
- Optional project selector if the current page supports multiple projects

Right:
- `Today`
- Previous / next navigation
- Date-range title
- View selector: Month / Week / Day / List
- Filter button
- Primary action: `Add event` or the existing equivalent

Do not crowd the toolbar. On smaller widths, move lower-priority controls into a More menu.

### Optional summary strip
Use a compact neutral strip, not large metric cards:
- Upcoming events
- Overdue items
- Milestones
- Sessions this week

Only display metrics backed by actual data and permissions.

### Main calendar surface
- White calendar canvas.
- Light neutral grid lines.
- Clear current-day highlight using a very soft tint.
- Today marker should be visible but not loud.
- Event text must remain readable.
- Use a consistent event height and spacing.
- Keep calendar content scrollable within the page where needed.
- Avoid strong full-cell background colors.

### Right-side details panel
Optional, collapsible panel when an event is selected:
- Event name and type.
- Date and time, including timezone where relevant.
- Project and module.
- Owner/attendees.
- Status and priority.
- Description and linked records.
- Actions permitted to the current POV.

Do not force a side panel if it makes the calendar too narrow. A drawer/modal can be used on smaller screens.

## 5. Event color semantics
Use soft tinted event chips with a stronger narrow accent or icon. Do not use full saturated event blocks for every category.

Suggested semantic categories:
- Workshop / session: soft violet.
- Training: soft teal.
- UAT: soft green.
- Task deadline: soft amber.
- Milestone: soft blue.
- Blocked / overdue: soft red.

Colors are starting suggestions only. Reconcile with existing Facilio tokens and actual business meanings. Always include a text label or icon; do not rely on color alone.

## 6. Required calendar interactions
Implement only when supported by current data/API and user permissions:
- Month, week, day and list views.
- Previous / next and Today navigation.
- Event selection and detail view.
- Create/edit/delete with confirmation and permission checks.
- Drag/drop rescheduling only if the backend supports it.
- Resize event duration only if supported.
- Filters by project, module, owner, event type and status where data exists.
- Search if the app has event search.
- Deep-link from an event to its source task/session/training/UAT record.
- Loading, empty, error and permission-denied states.
- Timezone-safe date handling.
- Keyboard access and screen-reader labels.

Never update the UI optimistically without reconciling the backend result. If a save fails, restore the prior event position and show a clear error.

## 7. Data contract guidance
Inspect existing entities and APIs. Do not invent new backend fields. Map real data to FullCalendar events:
- `id`
- `title`
- `start`
- `end`
- `allDay`
- `url` only if supported and safe
- `extendedProps` for actual project/module/owner/status metadata

Keep event IDs stable. Use server-side pagination/range loading if the data volume requires it. Do not load the entire project history into the browser by default.

## 8. Staff, Admin and Customer POV
Use the same calendar visual system across all POVs.
- Staff sees assigned/authorized activities and can perform permitted actions.
- Admin sees authorized project-wide activities and administrative controls.
- Customer sees only customer-visible activities and permitted actions.
- Do not leak internal notes, staff-only tasks, private attendees or internal statuses into Customer POV.
- The calendar should adapt through permissions and data filters, not separate visual themes.

## 9. Responsive behavior
- Desktop: full calendar with optional right-side detail panel.
- Tablet: calendar full width; details open in drawer.
- Mobile: default to list/agenda view where month grid becomes too compressed.
- Toolbar wraps cleanly; controls must not overlap.
- Preserve touch-friendly event selection and navigation.

## 10. Acceptance checklist
- Calendar uses the master design tokens.
- Events are readable and semantically colored.
- Month/week/day/list views work as configured.
- Event actions respect permissions.
- Timezones and date boundaries are correct.
- Customer POV exposes only customer-visible information.
- Loading, empty and error states are implemented.
- Existing project schedule/task/session data remains the source of truth.
