# Section Templates

Examples use neutral placeholder content. Replace with the org's own configuration. Status and button names
always match the system display names, in quotes.

---

## Front matter

### Cover
"Solution Document" (title), Facilio logo, "for", client full name, client logo. Nothing else.

### Table of Contents
Real Word TOC field (levels 1–2) with cached entries and page numbers.

### PROJECT INFORMATION (new page)
| Item | Detail |
|---|---|
| Project Title | Facilio CAFM Implementation – <Client> |
| Configuration Version | V1.0 |
| Facilio Consultant Name | <Name> |
| Implementation Members | <Names or [To be confirmed]> |
| Project Manager | <Name> |

### PROJECT INTRODUCTION / BACKGROUND
2–4 paragraphs: who the client is (from the BRD or the user), the portfolio type (from spaces, sites, categories),
why the CAFM system is being implemented, and the applications in use (main app, mobile, portals).

### INTRODUCTION
One paragraph on the purpose of the document (describes the configured solution as of <package date>), then
**Modules in Scope**: a bullet list of every module that has its own section, in document order.

### KEY TERMS
| Term | Meaning |
|---|---|
| <Classification value> | What it means for the client and what it changes |
| <Status group / request type / contract type> | ... |
Only org-specific terms and classifications, not generic CAFM terms.

### USER ROLES & RESPONSIBILITIES
| Role | Responsibilities in the system |
|---|---|
| <Role display name> | Raises requests; approves quotations above ...; closes work orders ... |
Ground every responsibility in a transition, approval, button or tab permission.

---

## Per module (Heading 1 = module display name, upper case if the reference does that)

### Use Case (Heading 2)
2–3 paragraphs: what the module is for, who uses it (roles, portals, mobile), how records are created
(manually, from a portal, from another module, by schedule), and where it sits in the end-to-end chain.

### Functional Requirements (Heading 2)
| Req. ID | Feature | Description |
|---|---|---|
| SR001 | Request creation | Requesters raise a request from the occupant portal or the main app ... |
| SR002 | Approval routing | Requests in common areas go to ... |
One prefix per module (2–4 letters, e.g. SR, WO, PM, AM, PO, PR, QT, IR, VEN, INS, WP), numbered from 001.
Every requirement must map to configured behaviour. BRD wording is used when it matches the build.

### Business Classification / Decision Matrix (Heading 2, only where logic exists)
| Condition | Value | Effect | Set by |
|---|---|---|---|
| Location type | Common area | Approval by <role>; charges not applicable | Automatically from the space category |
| Warranty period | Within period | Routed to contractor; no quotation | Rule on create, from handover date |

### Approval Routing Criteria (Heading 2, only where approvals exist)
| Condition | Approver(s) | On Approve | On Reject |
|---|---|---|---|
| Amount above <x> | <Role> (any one) | "Approved" | "Rejected", comment required |

### Implemented Process Flow (Heading 2)
One sentence introducing the diagram, then the diagram (generated from the active flow; see SKILL.md).
Long flows are split into parts with one caption each.

### State Flow Details (Heading 2)
| Action | From Status | To Status | Performed By | Conditions / Inputs |
|---|---|---|---|---|
| "Submit" | "Open" | "Submitted" | Requester | Mandatory: Description, Category |
| (Automatic) | "Work Completed" | "Closed" | System | 3 days after the actual work end date |
| "Approve" | "Pending Approval" | "Approved" | <Role> or the user in the Approver field | Comment required |
One row per enabled transition. Group by flow if the module has more than one active flow
(sub-header row with the flow name and its entry criteria).

### Provided Solution (Heading 2)
For each requirement, a bold label paragraph `SR001: Request creation` (bold run in a body paragraph, not a
heading style) followed by 1–3 paragraphs or bullets explaining HOW the system does it: forms, form rules,
buttons, automatic steps, notifications, related records. This is where form rules, buttons, connected apps
and scripts are explained in business language.

### Field List (Heading 2)
| Field Name | System / Custom | Field Type | Description |
|---|---|---|---|
| **<Form section name>** (merged sub-header row) | | | |
| Subject (red if mandatory) | System | Single Line Text | Short summary of the request |
| Location Type | Custom | Picklist | Values: Unit, Common Area. Drives approval routing |
Fields in form order, grouped by form section. Mandatory field names in red (CC0000). Picklists list their
values (up to ~10; otherwise "values maintained in setup"). Lookups name the related module.

### Workflows & Automations (Heading 2)
| Workflow | Trigger | Condition | What It Does |
|---|---|---|---|
| <Rule display name> | When a record is created | Category is Electrical | Assigns the electrical team and notifies the supervisor |
Include workflow rules, scheduled jobs, SLA escalations that act on this module, and automatic transitions'
side effects when not already explained.

### Limitations & Considerations (Heading 2)
Bullets. Hard constraints first (things the system will not do, dependencies on other modules or external
systems, inactive features, tabs not in the menu), then awareness points (manual steps, data that must be
maintained, timing of automatic steps). Every module has this section.

---

## Closing sections

### SLA & NOTIFICATIONS (Heading 1)
**SLA Policies** (Heading 2)
| Module | Applies To | Priority | Response Target | Resolution Target | Escalation |
|---|---|---|---|---|---|

**Notifications** (Heading 2)
| Module | Notification | Trigger / Condition | Recipients |
|---|---|---|---|
Then "Configured but switched off": a short bullet list of disabled notifications.

### INTEGRATIONS (Heading 1, only if any exist)
| System | Direction | Records | When | Effect in Facilio |
|---|---|---|---|---|

### REPORTS AND DASHBOARDS (Heading 1)
**Dashboards** (Heading 2)
| Dashboard | Tabs | Folder | Shared With | Mobile |
|---|---|---|---|---|
**Reports** (Heading 2)
| Folder | Reports |
|---|---|

### ROLE MATRIX – DASHBOARDS AND REPORTS (Heading 1)
Rows = roles, columns = dashboards / report rights (View, Create, Edit, Share, Save As Report). Ticks or words.

### ROLE MATRIX – MODULE ACCESS (Heading 1)
Rows = modules (menu tabs), columns = roles; cells = access letters (C R U D E I) with a legend under the table.
Split into several tables if there are more than ~7 roles; repeat the module column.

---

## Wording patterns
- Automatic step: "The system moves the work order to "Closed" 3 days after the actual work end date, if the
  requester has not responded."
- Field-based permission: "Only the user selected in the Approver field can approve."
- Disabled item: "An alternative "Create Quote" button exists but is switched off; quotations are created from
  the material request using "Convert to Quote"."
- Dependency: "Purchase orders are created in the client's ERP; the purchase request status in Facilio is
  updated when the ERP confirms the order."
- Unknown: "Escalation recipients for level 2 are [To be confirmed]."
