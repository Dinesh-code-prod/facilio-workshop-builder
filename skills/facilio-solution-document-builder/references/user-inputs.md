# User Inputs — What to Ask For and How to Use Each One

## 1. Intake message (send once, at the start)

Show this checklist with each item marked **Available / Missing**, then ask only the blocking questions,
all in one message.

| # | Input | Need | Used for |
|---|---|---|---|
| 1 | Org configuration: package ZIP, or facilio-config-data folder `<region>/<orgid>-<Name>` | Required | All content |
| 2 | Reference Solution Document (.docx) | Required | Format only |
| 3 | Client logo (PNG/JPG) | Required | Cover |
| 4 | Facilio logo (if not in the reference) | Required | Cover |
| 5 | Client full name, Org ID, region | Required | Cover, Project Information, confirming the org |
| 6 | Facilio Consultant, Project Manager, Implementation Members, configuration version | Required | Project Information |
| 7 | BRD / requirement sheet | Recommended | Requirement wording, background, traceability |
| 8 | Process flow diagrams (Miro, Visio, PDF, images) | Recommended | Intended process, decision points |
| 9 | Change requests, sign-off notes, meeting minutes | Optional | Explains differences from the BRD |
| 10 | Scope list (modules in / out of scope, phase) | Optional | Prevents documenting out-of-scope modules |
| 11 | Integration details (ERP / HR / IoT systems, direction, frequency) | Optional | Integrations section |
| 12 | Screenshots of key screens | Optional | Visual aids |
| 13 | Glossary / client terminology | Optional | Key Terms, wording |
| 14 | Earlier version of this Solution Document + review comments | When revising | Version changes, corrections |
| 15 | Output file name and save location; replace or new version | Required | Delivery |

Connectors and folders to check (say which are connected and which would help):

| Connector / folder | Need | Used for |
|---|---|---|
| facilio-config-data (local clone, pulled) | Required if no ZIP | Configuration |
| facilio-impl-ai-skills (local clone) | Recommended | XML knowledge guides, tone rules |
| Facilio MCP for the org's region, signed in to the right org | Recommended | Live check of key items, items missing from the package |
| Facilio Kenny Code Assist | Recommended | Verify enum values, platform behaviour, script functions |
| Miro / SharePoint / Google Drive / Confluence | Optional | Reading the BRD and flows where they live |
| Built-in browser / Claude in Chrome | Optional | Screenshots from the live org |

Blocking only when missing: item 1, 2, 5. Everything else has a default: placeholders for names
(`[To be confirmed]`), configuration-only content when no BRD, Facilio-default format when no reference
(tell the user).

## 2. Confirm the org
- Read `PackageConf.xml` / `ORG_INFO` and `_overview.md`: org ID, name, package date.
- If the folder name, the ZIP name and the user's Org ID disagree, stop and ask.
- Note the package export date on the Project Information page or in the build record; the document
  describes the configuration as of that date.

## 3. Reference document (format only)
- Extract: page size and margins, cover layout, heading styles (font, size, colour, numbering), body style,
  table styles (header fill, borders, widths), bullet style, image style, TOC style, header/footer, section order.
- Never copy its client name, modules, requirement text, images or terms. After the build, search the output
  for the reference client's name and unique terms: zero hits.
- If the reference has a section type this org needs but the reference lacks (e.g. Decision Matrix), build it
  with the same table style.

## 4. BRD and requirement traceability
When a BRD or requirement sheet is available:
1. List every requirement (ID if present, module, text).
2. For each, find the configuration that delivers it and classify:
   - **Built as specified** → write the requirement in Functional Requirements; explain in Provided Solution.
   - **Built differently** → describe what is built; add a Limitations line "The BRD describes X; the system
     does Y." Add to `[To be confirmed]` unless a change request explains it.
   - **Not built / disabled** → do not describe it as a feature; add a Limitations line and a
     `[To be confirmed]` question.
   - **Built but not in the BRD** → document it (configuration is the authority) and note it in the summary.
3. Keep a traceability table in the build record: `BRD ref | Requirement | Status | Section | Note`.
   Include it in the document only if the reference format has one or the user asks.
4. Use the BRD's business wording for background, use cases and requirement descriptions; use the
   configuration for every behaviour statement.

## 5. Process flow diagrams from the user
- Compare each diagram with the live state flow. Differences → same handling as "built differently".
- Keep the client's step names where they match the system; use the system's status and button names
  where they differ.
- Do not paste the client's diagram as the "Implemented Process Flow"; that diagram is generated from the
  configuration. The client's diagram can be referenced in the background if useful.

## 6. Change requests and minutes
- Use them to explain BRD-vs-built differences and to close `[To be confirmed]` items.
- Cite them in the build record, not in the document body (unless the reference format has a change log).

## 7. Scope list
- Modules marked out of scope → leave out even if configured; list them in the summary with "out of scope
  per scope list".
- Modules in scope but not configured → do not create a placeholder section; list in the summary as
  "in scope but not configured" and ask.

## 8. Screenshots
- Use only screenshots of this org. Remove personal data (names, emails, phone numbers) or ask before using.
- Caption each one; size within page limits.

## 9. Earlier version + review comments (revisions)
- Re-analyse the components behind each comment; do not only change the wording.
- Produce v[N+1] as a new file. List corrections versus the previous version in the summary.
