# Facilio Delivery Studio: implementation roadmap (24 Oct 2026)

Principle: extend what exists, preserve all data, no duplicate modules and no second AI workflow. AI generation, review, gap finding and approval already run through one path (`/api/projects/:id/ai/run`, items of kind `ai`, template-aware). New inputs plug into that path as extra sources.

## Phase status
| # | Phase | Status |
|---|---|---|
| 1 | AI assistant, Deliverables, Hypercare, Handover & Closure, Status Reports | Done, deployed |
| 2 | FTR workbook (Excel), KPI workbooks | Done, deployed |
| 3 | Facilio theme, sidebar, roadmap intro | Done, deployed |
| 4 | Templates (versioned, org + project, publish / retire) and configurable workspace | Done, deployed 24 Oct |
| 5 | Org-package (ZIP) inventory and analysis | Done, deployed 24 Oct (Package Analysis page, AI digest) |
| **5b** | **Customer-specific configuration inputs (below)** | **Done. Configuration Inputs page deployed 24 Oct; relationship diagram and training / support-handover reuse beyond AI drafts added 31 Oct (not deployed yet, see docs/reports/implementation-status.md section 59)** |
| 6 | User Guide Builder, video-to-guide | Next |
| 7 | Traceability, quality checks, version comparison, knowledge library, lessons learned, retention | After 6 |
| 8 | Customer-facing read-only pages | After 7 |

Sequence change: 5b is inserted after phase 5 because the org-package parser already extracts modules, relationships, apps and tabs. Importing those first removes most manual typing. 5b must come before phase 6 and 7 because guides, UAT, FTR and traceability reuse its data.

## Phase 5b: Customer-specific configuration inputs
### What the team can provide
1. **Custom modules**: name, purpose, fields, tabs, actions, statuses, workflow, roles, usage instructions.
2. **Module relationships**: record creation, parent-child, references (lookups), workflow triggers, dependencies, expected outcome.
3. **Connected apps and tabs**: app name, tab names, purpose, navigation, functionality, permissions, related modules, integration behaviour.

Each accepts structured manual entry, free-text notes, file uploads (screenshots, PDFs, Excel) and import from the org package or a CSV / Excel.

### Reuse versus add
| Need | Reuse (already built) | Add |
|---|---|---|
| Custom module identity, fields, form, status flow | `System Modules & Form Builder`, `customModules`, `State Flow Builder`, `Roles & Access`, org-package parser | Extra descriptive block on each custom module: purpose, usage instructions, tabs, actions, free-text notes, attachments |
| Relationships | Parser already reads `relationships` and field lookups; Form Builder lookups | A **relationship register** (item kind `cfgrel`): from, to, type (creates / parent-child / reference / triggers / depends on), trigger and condition, expected outcome, source (manual / package / confirmed), status |
| Connected apps and tabs | Parser already reads apps, web tabs and connected apps; Contracts & Integrations register for external systems | An **apps and tabs register** (item kind `capp`): app, tabs (name, purpose, navigation, functionality), permissions by role, related modules, integration behaviour |
| Free text and files | `report_attachment` style upload categories, item kinds, `V.pickFile`, `API.uploadFile` | New upload category `config_evidence` (png, jpg, pdf, xlsx, csv, docx, 20 MB) |
| Import | Org-package ZIP load, CSV parser from FTR | Import preview that proposes relationship and app rows from the package; nothing is saved until the person ticks rows |
| AI | Existing `ai/run`, `AI_SYSTEM` rules, review queue, approve flow | Only extra sources: `cmodx`, `cfgrel`, `capp` added to the document and kind lists of the existing tasks (brd, gaps, uat, ftr, ftrrows, guide, config, handover). **No new AI task and no new screen.** One extra check in the existing "Missing requirements check": module without owner role, relationship pointing to an unknown module, app tab with no role, flow with no exit state |
| Templates | Template manager | Kinds already cover guide, UAT, FTR, handover. Templates can name config sections to include |

### Priorities
| Priority | Item | Why |
|---|---|---|
| P1 | Relationship register and apps/tabs register with manual entry and package import | Biggest gap; the parser data is already there |
| P1 | Custom-module descriptive block (purpose, usage, tabs, actions, notes) | Needed for any customer-specific guide |
| P1 | Feed all three into the existing AI sources | Core of the requirement |
| P2 | File uploads and CSV / Excel import | Convenience once the registers exist |
| P2 | Reuse in UAT, FTR, training and handover outputs | Delivers the value across deliverables |
| P3 | Relationship diagram (read-only, reuses the diagram helper) | Helpful for workshops and guides. Done 31 Oct: Configuration Inputs › Module relationships |

### Dependencies
- Phase 5 (org-package inventory) for the import preview.
- Phase 4 workspace and templates (done) so the new pages can be shown, hidden, reordered and templated.
- Server: two new item kinds (`cfgrel`, `capp`) added to the `KINDS` whitelist, one file category, one change to `aiContext`. No schema migration; existing records are untouched.

### Reuse across deliverables
| Deliverable | How the inputs are used |
|---|---|
| Customer user guide | A section per custom module (purpose, steps, tabs, actions), relationship notes such as "creating X also creates Y", app and tab navigation |
| UAT plan and cases | Scenarios from each relationship (trigger, expected outcome) and each tab action; roles from the permissions |
| FTR report | `ftrrows` suggestions per module and per relationship; connected-app tabs become module sheets |
| Training material | Role-based path: which tabs a role sees and what each does |
| Support handover | Register of custom modules, relationships, apps and tabs, integration behaviour and known limits |
| Traceability (phase 7) | Requirement to module to relationship to test row |

### Acceptance criteria
1. A team member can add, edit and delete a relationship and an app-with-tabs entry, with free text and at least one attachment each.
2. Importing an org package proposes relationships, apps and tabs in a preview; only ticked rows are saved; re-importing never duplicates or overwrites manual edits.
3. Custom modules created before this phase open unchanged; the new descriptive block is optional.
4. Running any existing AI task includes the new records as cited sources `[S#]`; the output marks each statement Confirmed / Assumption / Missing, and nothing about a module or tab not in the records is invented.
5. The existing gap check lists at least: unknown module in a relationship, app tab with no permission, custom module with no purpose or no owner role.
6. UAT, FTR, guide, training and handover drafts for a test project each show content that traces back to the new inputs.
7. Edits to these inputs are audited and follow the project's read-only and customer-visibility rules (internal by default; customers see them only when released through portal controls).
8. All existing tests pass, new tests cover the two item kinds, the import preview and the AI source list; no existing record is changed by the migration.

### Risks
Package parsing can miss custom relationships (flagged as unconfirmed, never presented as fact); duplicate entry between manual and imported rows (matched on from, to and type); prompt size (inputs are clipped and prioritised per task, as today).

## Later phases (unchanged)
Phase 5 org-package analysis, phase 6 guide builder and video-to-guide, phase 7 traceability, quality checks, version comparison, knowledge library, lessons learned, retention, phase 8 customer-facing read-only pages.
