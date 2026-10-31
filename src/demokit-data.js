/* Catalogue of the CMMS Demo Kit screens (real Facilio product screens on sample data) and the story ideas ("journeys") listed beside it.
   Read from the kit's own index on 31 Oct 2026. Text is shortened; each screen is opened from the kit itself (needs Facilio sign-in), nothing is copied.
   Entry: [label, module, app, what it shows, path under base]. Used by the Guides & Video Studio to name the exact screens a brief should use. */
(function (root) {
  'use strict';
  const S = [
    ['Work order — list', 'Work order', 'Maintenance', 'All work orders: ID, subject, status, priority, category, view switcher and filters.', '_screens/app.cmms.maintenance-workorder-all.html'],
    ['Work order — summary', 'Work order', 'Maintenance', 'A record with state buttons, details, comments, attachments, responsibility, location and time.', '_screens/app.cmms.maintenance-workorder-all-1101-overview.html'],
    ['Work order — tasks', 'Work order', 'Maintenance', 'The Tasks tab: open, closed and all tasks by section.', '_screens/app.cmms.maintenance-workorder-all-1101-overview-tasks.html'],
    ['Work order — history', 'Work order', 'Maintenance', 'The History tab: status changes and comments.', '_screens/app.cmms.maintenance-workorder-all-1101-overview-history.html'],
    ['Work order — form', 'Work order', 'Maintenance', 'Create a work order: subject, site, category, type, priority, asset, team, due date, tasks.', '_screens/app.cmms.maintenance-workorder-new.html'],
    ['Asset — list', 'Asset', 'Maintenance', 'All assets: category, type, location, status, manufacturer, serial, warranty.', '_screens/app.cmms.asset-assets-all.html'],
    ['Asset — summary', 'Asset', 'Maintenance', 'An asset record: status, details, location hierarchy, operating hours, comments.', '_screens/app.cmms.asset-assets-all-1201-overview.html'],
    ['Asset — maintenance', 'Asset', 'Maintenance', 'The Maintenance tab: unplanned and planned work orders, insights, recently closed.', '_screens/app.cmms.asset-assets-all-1201-overview-maintenance.html'],
    ['Asset — form', 'Asset', 'Maintenance', 'Create an asset: name, site, category, location, type, manufacturer, model, serial, dates, price.', '_screens/app.cmms.asset-assets-new.html'],
    ['PPM — list', 'Planned maintenance', 'Maintenance', 'All planned maintenance: name, publish status, scope, asset category, sites, team, priority.', '_screens/app.cmms.maintenance-ppm-all.html'],
    ['PPM — summary', 'Planned maintenance', 'Maintenance', 'A published PPM with its details and the work order details it generates.', '_screens/app.cmms.maintenance-ppm-5101-overview.html'],
    ['PPM — unpublished', 'Planned maintenance', 'Maintenance', 'A draft PPM with the banner and the Publish button that generates work orders.', '_screens/app.cmms.maintenance-ppm-5107-overview.html'],
    ['PPM — planner tab', 'Planned maintenance', 'Maintenance', 'Trigger summary and the assets planner, each asset with its job plan and technician.', '_screens/app.cmms.maintenance-ppm-5101-planner.html'],
    ['PPM — planner tab (quarterly)', 'Planned maintenance', 'Maintenance', 'The planner of a quarterly PPM with its assets and job plan.', '_screens/app.cmms.maintenance-ppm-5102-planner.html'],
    ['PPM planner — calendar', 'Planned maintenance', 'Maintenance', 'Year view: every PPM and asset with its generated work orders by month, coloured by team.', '_screens/app.cmms.maintenance-ppm-planner.html'],
    ['PPM planner — HVAC team calendar', 'Planned maintenance', 'Maintenance', 'The calendar filtered to one team.', '_screens/app.cmms.maintenance-ppm-planner-hvac.html'],
    ['PPM planner — calendars', 'Planned maintenance', 'Maintenance', 'The calendar manager: folders and calendars.', '_screens/app.cmms.maintenance-ppm-planner-list.html'],
    ['Job plan — list', 'Job plan', 'Maintenance', 'All job plans: scope, asset category, status, version, where used.', '_screens/app.cmms.maintenance-jobplan-all.html'],
    ['Job plan — summary', 'Job plan', 'Maintenance', 'A published job plan with its task list by section, criticality and frequency.', '_screens/app.cmms.maintenance-jobplan-5301-overview.html'],
    ['Job plan — crafts', 'Job plan', 'Maintenance', 'The crafts and skills on a job plan: quantity, duration and rate.', '_screens/app.cmms.maintenance-jobplan-5301-crafts.html'],
    ['Quote — list', 'Quote', 'Maintenance', 'Quotes: number, status, customer type, client or vendor, work order, total.', '_screens/app.cmms.procurement-quote-all.html'],
    ['Quote — summary', 'Quote', 'Maintenance', 'A quote with its document preview, state buttons and download or print.', '_screens/app.cmms.procurement-quote-all-3601-overview.html'],
    ['Quote — form', 'Quote', 'Maintenance', 'Create a quote: quote info, billing, line items, notes, signature.', '_screens/app.cmms.procurement-quote-new.html'],
    ['Quote — print preview', 'Quote', 'Maintenance', 'The full-page document the print button opens.', '_screens/app.cmms.pdftemplate-preview-quote-3601-9101.html'],
    ['Invoice — list', 'Invoice', 'Maintenance', 'Invoices: number, status, client or vendor, quote, dates, total, balance due.', '_screens/app.cmms.procurement-invoice-all.html'],
    ['Invoice — summary', 'Invoice', 'Maintenance', 'An invoice with its document preview and Acknowledge Payment.', '_screens/app.cmms.procurement-invoice-all-3702-overview.html'],
    ['Invoice — form', 'Invoice', 'Maintenance', 'Create an invoice with line items.', '_screens/app.cmms.procurement-invoice-new.html'],
    ['Dispatcher console — Gantt', 'Dispatcher', 'FSM', 'The dispatch board: field agents, shifts, appointment bars by status, the unassigned queue.', '_screens/app.cmms.dispatch-dispatcher.html'],
    ['Dispatcher console — map', 'Dispatcher', 'FSM', 'The same board as a map with agent and appointment pins.', '_screens/app.cmms.dispatch-dispatcher-dispatcher-51-map.html'],
    ['Service order — list', 'Service order', 'FSM', 'Field service orders.', '_screens/app.cmms.work-serviceorder.html'],
    ['Service appointment — list', 'Service appointment', 'FSM', 'Field service appointments.', '_screens/app.cmms.work-appointments.html'],
    ['FSM quote — summary', 'Quote', 'FSM', 'A vendor quote with its document preview.', '_screens/app.cmms.financials-quote-all-3602-overview.html'],
    ['FSM invoice — list', 'Invoice', 'FSM', 'Field service invoices.', '_screens/app.cmms.financials-invoice-all.html'],
    ['Report folder list', 'Analytics & reports', 'Maintenance', 'Reports in collapsible folders, with paging.', 'pages/report-folder-list.html'],
    ['Data Explorer (report types)', 'Analytics & reports', 'Maintenance', 'The "Start analyzing data" choices: module insights, pivots and building trends.', 'pages/report-types-modal.html'],
    ['Report summary — pivot', 'Analytics & reports', 'Maintenance', 'A saved pivot report with its report rail and table.', 'pages/report-summary-pivot.html'],
    ['Setup home', 'Setup', 'Setup', 'The Setup landing grid: General, Users and Access, Resources, Customization, Automation.', 'pages/setup-home.html'],
    ['Connected Apps list', 'Setup', 'Setup', 'Card grid of connected apps with type chips and search.', 'pages/setup-connectedapps-list.html'],
    ['Connected App — detail', 'Setup', 'Setup', 'One connected app: configuration, developer console, widgets, variables, connectors.', 'pages/setup-connectedapp-detail.html'],
    ['Connected App — widgets', 'Setup', 'Setup', 'The widgets a connected app registers.', 'pages/setup-connectedapp-widgets.html'],
    ['WorkQ — Get started', 'Sign-in', 'WorkQ', 'The mobile app onboarding screen.', 'apps/mobile/frame.html#login'],
    ['WorkQ — Home', 'Home', 'WorkQ', 'Mobile home: quick actions, today\'s progress, overdue and due-today counts.', 'apps/mobile/frame.html#home'],
    ['WorkQ — Menu', 'Home', 'WorkQ', 'The module menu on mobile.', 'apps/mobile/frame.html#menu'],
    ['WorkQ — Work order list', 'Work order', 'WorkQ', 'Work order cards with search, QR, sort and filter chips.', 'apps/mobile/frame.html#wo-list'],
    ['WorkQ — Work order summary', 'Work order', 'WorkQ', 'A mobile work order: status, tasks, plans, actuals, photos, state buttons.', 'apps/mobile/frame.html#wo-summary'],
    ['WorkQ — Create work order', 'Work order', 'WorkQ', 'The create form on mobile with QR asset pick.', 'apps/mobile/frame.html#wo-form']
  ];
  // real events told start to finish, step by step: good starting points for a walkthrough brief
  const J = [
    ['Tenant WhatsApp leak to fixed pipe', 'Tenant in a residential tower', ['WhatsApp chat with the intake agent', 'Chat agent creates a work order', 'Raise a work order', 'Dispatch from the board', 'Technician works the appointment', 'Requester gets a CSAT survey']],
    ['Email HVAC failure to restored cooling', 'Office building tenant', ['Email answered by the AI', 'Chat agent creates a work order', 'Work order lifecycle', 'Technician executes a work order on mobile', 'Invoice and payment']],
    ['Phone call emergency to closed permit', 'Security guard on night shift', ['Tenant call raises a ticket', 'Chat agent creates a work order', 'Work order lifecycle', 'Dispatch from the board', 'Technician works the appointment']],
    ['PPM schedule to multi-asset route done', 'Maintenance planner', ['Plan PPM work on the PPM calendar', 'Create and publish a planned maintenance', 'PM generates work orders', 'Staff a job plan with crafts', 'Work order lifecycle', 'Technician executes a work order on mobile', 'Review an asset\'s maintenance']],
    ['Ops Vision insight to board decision', 'FM director', ['Chat with Ask Atom', 'Create an Ops Vision insight', 'Approve the data plan', 'Read and download a report', 'Create a dashboard and add widgets']],
    ['Vendor quote to approved payment', 'Contractor technician', ['WhatsApp chat with the intake agent', 'Chat agent creates a work order', 'Quote from a work order', 'Quote lifecycle', 'Invoice and payment']]
  ];
  root.FWBDemoKit = { base: 'https://comet.facilio.work/library/cmms-demo-kit/', screens: S, journeys: J };
})(typeof window !== 'undefined' ? window : globalThis);
