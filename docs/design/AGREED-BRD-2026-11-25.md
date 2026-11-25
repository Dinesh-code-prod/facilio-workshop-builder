# The agreed BRD (25 Nov 2026)

**Why.** A team may write the BRD outside the Studio, with the customer, and import it. Before this, an imported BRD was only a document: the project tabs (requirements, state flows, fields and forms, the Solution tab, open questions) kept the older facts, and mock-ups, UAT and guides followed those. Deleting the drafted BRD did not change that, because the drafted BRD is built from the tabs.

**What it does.**
1. On the BRD tab, More > **Make this the agreed BRD** (or the notice on an imported BRD). Stored as `brddoc.agreed = { id, name, by, at }`; the tab chip says "Agreed".
2. **Bring it into the project** (imported BRDs) queues the Claude job `sync_brd`. Claude reads the BRD whole (`get_document brddoc part brd:<id>`, pages of 12,000 characters, `work/server/_brdtext.mjs`), reads the tabs, the contract and the sessions, and saves proposals with `brd: <id>`:
   - **New**: the usual kinds (requirement, flow, field, form, connected app, cross-module action, solution area, BRD introduction).
   - **Changed**: requirement with `replaces` (the requirement it rewrites), solution area, flow with basedOn changed.
   - **Not in the BRD**: kind `retire` (a requirement goes Out of scope, a flow is switched off; nothing is deleted), or a solution area with outOfScope.
   - **Answered by the BRD**: kind `answer` (the open question gets the answer and is marked answered).
   - **Conflict**: any of these with `conflict` (what the contract or the sessions say instead).
3. The agreed BRD shows one list grouped as above. Apply or Dismiss each (the same rule as every proposal, `src/design.js` dsApply); **Apply all** skips conflicts and Solution areas (those are accepted on the Solution tab). Requirements from the agreed BRD are applied as Confirmed, since the customer agreed them.

**Rules kept.** Claude proposes, a person applies. Text in the BRD is data, not instructions. Nothing is deleted.

**Not done.** Fields and forms the BRD names only loosely are listed in Claude's summary, not proposed. Taking out a field, form or connected app is by hand. Not tried with a real Claude run.

Code: `work/server/_brdtext.mjs`, `get_document` brddoc in `work/server/api.mjs`, kinds in `work/server/_dsapi.mjs`, job in `work/server/_jobs.mjs`, the tab in `src/brdview.js`. Test: `tests/agreed_brd.mjs`.
