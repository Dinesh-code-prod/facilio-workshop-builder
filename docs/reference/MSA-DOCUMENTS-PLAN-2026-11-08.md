# Several contract documents per project: plan (8 Nov 2026)

Problem: a project can have two or three MSAs (a master agreement, amendments, order forms, statements of work), but the Studio held one MSA (`msa_text` = one file's pages, one `planner.msa`). Everything drafted from the contract (kick-off deck, project plan, sessions, scope, questions) came from that one file.

## What changes
- **Data**: the project document `msa_text` may hold `{ docs: [{ id, role, label, name, at, pages, status, verifiedBy, verifiedAt, fileId }], check }`. The old shape `{ name, at, pages }` still reads as a list of one, so no project is migrated. Rules: `work/server/_msadocs.mjs` (one copy, also in the browser), tests `tests/msadocs.mjs`.
- **Contract intake** (`src/msadocs.js`): a "Contract documents" card under the upload card. The first MSA still comes in through the existing upload; every further document is added there with its type (amendment, order form, statement of work, other). Each document is verified by a PERSON after reading it against the draft; the AI never verifies.
- **Check the documents together** (route `POST /api/projects/:id/msadocs/check`, the existing AI layer): a summary of each document, where they disagree (with the exact words, flagged when a quote is not found in the document), what replaces what, gaps and recommendations. The result is kept with the documents and shown as out of date when the set changes.
- **Updates downstream**: adding or removing a document asks Claude to re-read ALL of them (job `pull_msa` with a note that names every document); the recipe now says: treat them as one contract, the later document wins where it names a clause, record the document and page of each item, list disagreements as conflicts, save ONE combined extraction. That extraction redrafts the kick-off deck, the project plan and the sessions through the existing path (`fillExisting`). When the kick-off is already APPROVED nothing is overwritten: a change request is written and Claude applies it (job `apply_change`).
- **Claude reads them**: `get_document msa_text` lists the documents (label, file, role, status, pages); parts are `d<document>p<page>` (`p3` alone is the first document, as before); the last check is in the field `check`. The check_msa recipe and the question generator (`rs_questions`, `docs`) read all documents too.

## Limits, said plainly
- The scope items and contract dates the Contract page takes from the FIRST file in the browser (`planner.msa`, `extractScope`) still come from that file only; the other documents reach the kick-off, plan and questions through Claude's combined extraction.
- Removing the LAST document keeps the old behaviour ("Remove the MSA" clears everything drafted from it); removing one of several does not wipe, it asks for a re-read.
- No real Claude run, no real PDF upload with several files, and no live app were checked.
