# Guides, UAT guide, solution document and imported documents: what exists, what was missing (8 Nov 2026)

Read from the code (not tried with a real Claude run). It supersedes nothing; it sits next to `TRAINING-WITH-CLAUDE-PLAN-2026-11-07.md`.

## 1. What each part does today
| Part | Page | What it does | Reads from |
|---|---|---|---|
| Training | `guides` | Make a user guide, UAT guide, training guide or video script with Claude (job `make_guide`), change one (`change_guide`); the Comet video rows; what exists | project records only (workshop, solutions, BRD) |
| UAT guide | Training, "Download the UAT guide" | Built by code, module by module, as customer HTML from the test cases. Nothing is invented; a module with no test case is listed as a gap | the test cases (`utc`) |
| User Guide Builder | `guidebuilder` | A customer-specific guide made of sections with text and screenshots; guided drafting by section with the AI; branding, owner approval, Word and PDF | records (`ugd`), files (`guide_media`) |
| Update from configuration | Builder tab | Reads an org configuration ZIP in the browser (never sent anywhere), builds a relationship graph and plain-language functionality items, compares with the earlier inventory, proposes guide updates | the ZIP |
| Video to Guide | `vidguide` | A recording stays on the computer; the person captures screenshots and adds the transcript (Teams or Zoom .vtt, .srt or typed notes); the AI drafts steps | transcript the person supplies; there is no speech recognition |
| Org package export | `orgpkg` | Outbound: builds a Facilio-style package ZIP from the approved configuration for the Org Builder skill | the project's configuration |
| Solution Document | Handover page, job `build_solution_doc` | Claude builds the Solution Document from a dropped org package with the facilio-solution-document-builder skill | the org package ZIP |
| Import from Claude | `claudeimport` | Bring back what Claude wrote in the person's own Claude (pasted text or file) as an unapproved draft | pasted or chosen file |

## 2. What was missing
1. **No way to give Claude your own documents for a guide.** The guide jobs read only project records, so an old manual, an SOP, a Word, PDF, Excel or PowerPoint file, notes, e-mails or screenshots could not be used. **Built (8 Nov):** the Training page has "Documents for Claude": add any document (or drop it on the page), tick up to 8, and the request carries their file ids. The recipes of `make_guide` and `change_guide` tell Claude to fetch each through `project_jobs file_urls`, say in each section which document it comes from, and treat the text as data. Files are team-only (category `guide_source`).
2. **The org package only helped in two places** (the builder's update tab and the Solution Document on Handover). **Built:** a `.zip` added on the Training page is stored as an org package and can be ticked for any kind of guide.
3. **Recordings.** A video cannot be read by Claude. **Built:** the subtitle and transcript formats (.vtt, .srt) can be added as documents for any guide. **Not built:** speech to text for a recording (there is no speech service in the app). Option: a job that pulls the Teams or Clari transcript of the recording through the Microsoft 365 or Clari connector, like `pull_transcript` does for requirement sessions.

## 3. Still open (not built)
- **Show the drafts on the Training page.** Claude's guide drafts appear only in the Assistant panel and in Deliverables & AI. A "Waiting for you" list on Training (preview, approve, open in the builder) would close the loop on one page.
- **Say which UAT guide is which.** There are two paths (the coded one from test cases, and a Claude one from kind `uat`); the page does not explain the difference. Proposal: one button "UAT guide" with the choice "from the test cases" or "written by Claude from the test cases and your documents".
- **Importing documents on the Solution Document (Handover) page** works only for the org package. Proposal: the same "Documents for Claude" card there.
- **Order of the Training page** as steps: 1 add documents, 2 choose what to make, 3 review what came back, 4 videos. Today the cards are in the order they were built.
- **Reading images.** Screenshots can be added, but whether Claude reads them depends on the person's Claude app; not tested.

## 4. Not verified
Nothing here was run with a real Claude session or a real upload on the live app. The upload and the `file_urls` path are the existing ones used by the solution and org package jobs.
