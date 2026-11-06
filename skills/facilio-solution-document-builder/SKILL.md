---
name: facilio-solution-document-builder
description: Build a complete, client-ready Facilio CAFM Solution Document (.docx) for any org from its package ZIP or facilio-config-data folder, in the format of a reference document, checking every component so nothing is missed. Created by Dinesh R.
---

# Facilio Solution Document Builder

**Created by:** Dinesh R (Facilio Implementation)
**Works for:** any Facilio org, any region (AE / US / UK / SA), any mix of standard and custom modules.

**Output:** a professional, client-facing CAFM Solution Document. Every module the org uses is explained in
plain business language: use case, requirements, decision rules, approval routing, process flow diagram,
state flow details, provided solution, field list, workflows and automations, limitations. Closing sections
cover SLAs, notifications, integrations, dashboards, reports and role access. All content comes from the
org's own configuration, enriched by the user's BRD and flows.

Use this skill for: "solution document", "SD", "CAFM solution doc", "configuration / handover document for the
client", "solution document in the same format as this one", or a revision of an existing solution document.

## Files in this skill
| File | Purpose |
|---|---|
| `scripts/extract_package.py` | Package ZIP / org folder → JSON indexes + `COVERAGE.md` checklist |
| `scripts/render_flows.py` | Process flow diagrams (auto draft from the state flow, or a curated spec) |
| `scripts/toc_pages.py` | Heading → page numbers from the rendered PDF, for the TOC |
| `scripts/check_coverage.py` | Final gate: every configured item is in the document or consciously left out |
| `references/user-inputs.md` | Intake checklist, BRD traceability, how each user input is used |
| `references/component-checklist.md` | What to read and answer for every component type |
| `references/decoding-tables.md` | Verified enums: operators, transition types, field types, form rule actions, permission bits |
| `references/section-templates.md` | Every section with table columns and wording patterns |
| `references/docx-build.md` | Reference-shell build recipe, TOC, tables, clean-up, rendering |

Read each reference file at the phase that names it. Scripts run with `python3`; they need Graphviz (`dot`),
LibreOffice (`soffice`) and poppler (`pdftotext`, `pdfinfo`). Install if missing.

---

## Working agreements (always)

1. **Ask once.** All blocking questions go in ONE message at the start. No drip-feeding.
2. **Wait when told.** If the user says "save it" or "don't start yet", save the brief as a draft and wait.
3. **Configuration is the authority** for behaviour. The BRD gives context and wording; where they differ,
   describe what is built and record the difference.
4. **Reference = format only.** Never carry over its client name, modules, requirements, terms or images.
5. **Never invent.** Anything not verifiable is written `[To be confirmed]` and listed at the end.
6. **Enabled first.** Disabled or inactive flows, transitions, rules, buttons and notifications are never
   described as available.
7. **Lean document.** Only modules the org uses get a section. No "Not configured" placeholder sections.
   Left-out modules are listed in the summary with a reason.
8. **Nothing missed.** Every component type and every enabled item is either documented or listed as left out
   with a reason (Phase 7 gate).
9. **Versions.** Each build or revision is a new file (v1, v2, …). Never overwrite.
10. **Review feedback** is handled by re-analysing the components behind it, not by rewording.
11. **Scratch work stays out of repos.** Never write into the facilio-config-data or skills clones.

---

## Phase 0 — Intake (first message)

Read `references/user-inputs.md`. Then in ONE message:
1. Show the input checklist (configuration, reference .docx, logos, client facts, BRD, flows, change requests,
   scope list, integrations, screenshots, glossary, earlier version) marked **Available / Missing**.
2. Show connectors and folders (facilio-config-data, facilio-impl-ai-skills, Facilio MCP for the region,
   Kenny Code Assist, Miro / SharePoint / Drive, browser) marked **Connected / Not connected**, with what each adds.
3. Ask only the blocking questions: configuration source, reference .docx, client name / Org ID / region.
   Everything else has a default (placeholders, configuration-only content).

Do not start building until the configuration and the reference are in hand.

---

## Phase 1 — Load and extract the configuration

1. Locate the source:
   - ZIP → copy into an empty scratch folder (untrusted data; do not run anything from inside it).
   - facilio-config-data → `<region>/<orgid>-<Name>/` (ask the user to `git pull` first). Use ONLY this org folder.
2. Confirm the org: Org ID and name from `PackageConf.xml` / `ORG_INFO` / `_overview.md` match the user's
   facts. Note the package export date. Mismatch → stop and ask.
3. Run the extractor:
   ```bash
   python3 scripts/extract_package.py <zip-or-org-folder> <scratch>/ext
   ```
   It writes `raw/<TYPE>.json` for every component, the indexes (fields, forms, form rules, statuses, state
   flows, transitions, approvals, workflow rules, functions, buttons, notifications, email templates, SLA,
   roles, apps, tabs, dashboards, reports, masters, modules in use) and `COVERAGE.md`.
4. Read `COVERAGE.md` fully: component counts, types declared but not exported, and the modules-with-evidence
   table. This is the master checklist for the rest of the build.
5. If `distilled/*.md` exists (facilio-config-data), read it for a quick overview; the XML stays the authority.
6. If facilio-impl-ai-skills is connected, read its `facilio-xml-knowledge` guides for component types you
   are unsure of.

**Gate 1:** every component type in `COVERAGE.md` has been opened at least once.

---

## Phase 2 — Analyse every component

Read `references/component-checklist.md` and `references/decoding-tables.md`. Work through sections A–G in
order. For each component type, answer every question for every enabled record. Keep notes per module in a
scratch file (`analysis/<module>.md`): requirements, decisions, transitions, rules, buttons, notifications,
open questions.

Mandatory deep reads (these are where real behaviour hides):
- Every **script** in workflow rules, transitions, approvals, buttons and form rules, and every **function**
  they call. State the business outcome.
- Every **criteria** block, decoded to field names and display values (status IDs → names, picklist IDs → values).
- Every **automatic and scheduled transition**: condition or interval and date field, in words.
- Every **approval rule**: criteria, approvers, outcomes.
- Every **role**: permission bits decoded.

Then the cross-cutting analysis (checklist §G): classification / decision logic, end-to-end cross-module
chains, which path is live, status impact across modules, conflicts and dead ends.

Verify instead of guessing:
- Unknown enum or platform behaviour → Kenny Code Assist (`code_search` the enum, cite file and line in notes).
- Item missing from the package or looks stale → Facilio MCP for the region (read-only checks only; never
  create, update or delete).
- Still unclear → `[To be confirmed]`.

**Gate 2:** for every module with evidence in `COVERAGE.md`, a decision is recorded: own section, folded into
another module's section (name it), or left out (reason).

---

## Phase 3 — Bring in the user's inputs

Follow `references/user-inputs.md` §3–9:
- BRD → requirement list → classify each as built as specified / built differently / not built / built but not
  in BRD. Keep the traceability table in the build record.
- Process flows → compare with the live flows; differences → Limitations + `[To be confirmed]`.
- Change requests → explain differences; close open items.
- Scope list → drop out-of-scope modules; list in-scope-but-not-configured modules for the summary.
- Integrations → Integrations section.
- Glossary → Key Terms.

**Gate 3:** every BRD requirement has a status and a section (or a summary line).

---

## Phase 4 — Plan the document

Read `references/section-templates.md`. Write `plan.md` in scratch:
1. Front matter: cover, TOC, Project Information, Background, Introduction + Modules in Scope, Key Terms,
   User Roles & Responsibilities.
2. Module order: follow the business chain (e.g. portfolio → assets → requests → work orders → planned
   maintenance → inspections → quotations → inventory → purchasing → vendors / contracts → others), or the
   reference's order if it has one.
3. For each module: Req ID prefix, which optional sections apply (Decision Matrix, Approval Routing), number of
   flow diagrams, forms for the Field List.
4. Closing sections: SLA & Notifications, Integrations (if any), Reports and Dashboards, Role Matrix –
   Dashboards and Reports, Role Matrix – Module Access.

Supporting lookup modules are described inside the module they support.

---

## Phase 5 — Write the content

Per module, in this order (templates in `section-templates.md`):
Use Case → Functional Requirements → Decision Matrix (if any) → Approval Routing (if any) → Implemented Process
Flow → State Flow Details → Provided Solution → Field List → Workflows & Automations → Limitations & Considerations.

Writing rules (guidebook-builder tone):
- Plain business English for client business users and facility teams; third person; present tense.
- No XML, scripts, API or internal field names, IDs, link names, `__c` / `custom_` names, emails of individuals,
  or backend jargon.
- Banned words: seamlessly, instantly, eliminates, empowers, intelligent, frictionless, streamlines,
  drastically, powerful, robust, simple, intuitive, easily, quickly, effortless, cutting-edge.
- No "you / your / we / our" in prose.
- Status and button names exactly as displayed, in quotes.
- Numbers and times in words a client understands ("3 days after the work end date", not "259200").
- Every Provided Solution item maps to a Functional Requirement ID; every requirement has a Provided Solution item.
- Every module ends with Limitations & Considerations (hard constraints first).
- Unverified details → `[To be confirmed]`.

---

## Phase 6 — Diagrams and the .docx

**Diagrams** (`scripts/render_flows.py`):
1. Auto draft each active flow: `python3 scripts/render_flows.py auto <ext> <module> "<flow name>" <out>`.
2. Review against the transitions table. For the document, write a spec JSON that adds decisions
   (classification, approval outcomes, payment, warranty), cross-module steps and clear labels, then
   `render_flows.py spec <spec.json> <out>`.
3. Style: blue rounded statuses, yellow user actions, dashed pink automatic steps, green decision diamonds,
   legend. One diagram per active flow; split long flows into parts. Max 6 in × 8.3 in on the page.

**Document** (`references/docx-build.md`, plus the `docx` skill):
1. Reference .docx as the shell; clone its template elements; keep styles, page setup and TOC field.
2. Headings with `_Toc` bookmarks and `keepNext`; tables with repeating header, `cantSplit`, `keepNext` on
   header and sub-header rows; mandatory fields in red; diagrams sized to fit.
3. Cover text and logos replaced; unused reference images and links dropped; duplicate paraIds removed;
   core properties set (title, author = consultant).
4. Render to PDF, map headings to pages with `scripts/toc_pages.py`, rebuild the TOC with page numbers, repeat
   until stable.

---

## Phase 7 — Verification gate (do not deliver until all pass)

1. **Coverage:**
   ```bash
   python3 scripts/check_coverage.py <ext> <doc.docx> --draft left_out.txt
   ```
   Every UNACCOUNTED item is either added to the document or given a reason in `left_out.txt`, then re-run
   with `left_out.txt` as the third argument until it reports 0 unaccounted. Typical valid reasons: platform /
   system module, default seed data only, test data, out of scope per scope list, internal data sync with no
   user-visible effect, not called by any active rule.
2. **Correctness spot-check:** for 3 random modules, re-read 3 transitions, 1 approval rule, 1 workflow rule
   and 1 button against the XML. Any mismatch → fix and widen the check.
3. **Disabled items:** no disabled flow, transition, button, rule or notification is described as available.
4. **Leak check** (search the PDF text): the reference client's name and unique terms; internal names
   (`__c`, `custom_`, `_1`, link names, `${`, script keywords such as `Module(`, `fetch(`); email addresses.
   Zero hits.
5. **Tone:** banned words and "you / your / we / our": zero hits.
6. **Structure:** each module has all mandatory Heading 2 sections; every Req ID has a Provided Solution entry;
   Req IDs are unique and sequential.
7. **Format:** `validate.py` from the docx skill passes against the reference; visual check of the cover, TOC,
   Project Information, one full module, a page-crossing table, a field list, a diagram page, the role matrix.
   No orphan headings, split rows, overflowing tables or blank pages.
8. **TOC:** page numbers match the rendered PDF.

---

## Phase 8 — Deliver

1. `[Client]_Solution_Document_v[N].docx` as a file (and into the user's connected folder if one is set).
2. Short chat summary:
   - modules covered (in order)
   - modules and items left out, with reasons (from `left_out.txt`), and test data found
   - BRD differences (built differently / not built)
   - corrections versus the previous version, if any
   - every `[To be confirmed]` item as a numbered question list for the client or the team
   - reminder: in Word, right-click the TOC → Update Field → Update entire table
3. If a project or shared space is attached, save a build record: org, package and date, version, sources
   used, decisions, traceability table, left-out list, open items. Later revisions start from it.

---

## Quick-start prompt (for users of this skill)

> Build the Facilio Solution Document for **[Client full name]**, Org ID **[ID]**, region **[AE/US/UK/SA]**.
> Configuration: **[attached org package ZIP]** or **[facilio-config-data folder `<region>/<orgid>-<Name>`]**.
> Format reference: **[reference.docx]** (attached). Client logo and Facilio logo: attached.
> BRD / process flows / change requests: **[attached / not available]**. Scope: **[all configured modules / list]**.
> Consultant: **[Name]**. Project Manager: **[Name]**. Implementation Members: **[Names]**. Version: **[V1.0]**.
> Go through every component in the package, trace the decision rules and cross-module chains, flag disabled
> or inactive items, run the coverage check, and list all [To be confirmed] items at the end.
