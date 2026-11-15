# From contract to BRD: one simple path (plan, 15 Nov 2026)

The user's ask: today it is confusing how the MSA, the requirement sessions, the checks, the solution, the flows, fields, forms, roles and notifications connect to the BRD, and people are asked too many questions and checks. Make it one clear path in which Claude does the reading and drafting. People give only the inputs that matter: the contract, the sessions, decisions on real exceptions, and the sign-off.

## What happens today (traced in the code)

| Step | What a person does today | Problem |
|---|---|---|
| Contract intake (`msaintake`, `kickoff.js`, `msadocs.js`) | Uploads the MSA, presses Analyse, ticks 5 kick-off reviews, approves | Fine, but the modules the contract names stay **off** until someone presses "Apply the contract" on the Solution page; "weak" modules wait there unseen |
| Questions (`rsquestions`, `_qbank.mjs`) | Keeps or drops each suggested question (up to 8 per module, 10 per system, 14 × 3 groups, cap 300), then sets each one's status and types an answer | The "100 questions" pain; nothing in it is required for the BRD |
| Workshop room (`workshop.js`) | Sets the same status and answer again per question | The same input twice; live "likely answered" still needs a click |
| Transcripts (`rstrans`, plus the old `transcripts` view) | Two pipelines: findings (confirm or dismiss) and the old statements (accept, merge, clarify, reject) | Two queues for the same thing; old contradictions block the BRD |
| Checks & validations (`rschecks`) | Confirms or dismisses **every** finding in 13 kinds (up to 1000) | The second big pain; it blocks nothing, but confirming is how requirements get made |
| Process whiteboard | Draws freely; only a combined flow ticked "In the BRD" reaches it | Unclear what it is for |
| Solution (`solution`, `solmap`) | Writes the text per area and accepts proposals | Roles, notifications, KPIs and SLA exist as solution text **and** as editors, so the BRD prints both |
| Design proposals (`design.js`) | Applies or dismisses each flow, field, form, app or requirement | One more queue, on four pages |
| BRD (`brd`, `brdreview.js`) | Ticks 6 review parts, then approves | The ticks don't look at the open counts the page already computes |

Requirements reach the BRD three ways (confirmed findings, `draft_brd` proposals, Workshop room captures), and the contract is reviewed three times (kick-off ticks, `check_msa` findings, the BRD "contract" tick).

## The target: one spine, five checkpoints

Contract → Scope → Sessions → Solution (per module) → BRD. Each layer is drafted automatically from the one before. A person acts only at a checkpoint, and only on what needs a human.

1. **Contract in → scope confirmed** (one screen)
   - Upload the MSA. Claude reads it and fills in:
     - the modules: delivered ones are switched on automatically; mentioned-only ones appear as one tick list;
     - connected apps;
     - the SLA and KPI matrix;
     - the kick-off pack.
   - The person answers one question: "Is this the scope?" They tick the mentioned-only modules they want and confirm.
   - The 5 kick-off ticks become a summary of what was read, not five separate reviews.
2. **Sessions → evidence** (no question admin)
   - Questions are generated only where the contract leaves a gap: at most 3 to 5 per module, "must" only by default, and kept automatically. There is no Keep or drop step.
   - A question is marked answered automatically when a transcript (or the live room) answers it. A person only corrects a wrong match.
   - Each transcript runs one pipeline (findings), and the chain runs by itself: findings, then flows, then forms, then the BRD draft. The old statements view is retired (read-only for old projects).
3. **Checks become exceptions, not a queue**
   - Rules and Claude sort the findings:
     - **Agreed:** matches the contract, or nobody contradicted it. It becomes a requirement automatically, marked "from the session", with its source quote.
     - **Needs a decision:** contradicts the contract, is out of scope, has a missing approver or owner, or the customer and the team disagree.
   - Only "needs a decision" items reach a person. Each shows as a red count on that module's tile on the Solution map, with the two or three possible answers as buttons.
   - The whiteboard adds automatic checks: a state that can't be reached, a transition with nobody to press it, an approval with no approver, a key step with no notification.
   - The Checks & validations page stays, but as a read-only report of these exceptions with their history. The tab is kept.
4. **Solution per module = the source of truth**
   - Each module has six compartments (Solution, Fields, Forms, State flows, Roles and access, Notifications; built 15 Nov). Claude fills them from the contract, the sessions and the whiteboard. A compartment's text is written from its structured editor, so there is one place to change roles, notifications, KPIs and SLA.
   - A person accepts **one card per module** ("Work Orders: 4 proposals, review and approve"), not each proposal on four pages.
   - Claude writes only what the MSA asks for and what Facilio has (rule added to the jobs, 15 Nov). Anything else becomes a change request.
5. **BRD → sign-off**
   - The BRD is assembled automatically.
   - The 6 review ticks are set from the facts: no Draft requirement left, no open proposal, no open contract exception. A person ticks only what the facts can't prove, such as "the introduction reads well".
   - The owner signs off. The org package exports from the BRD (button added 15 Nov).

**What a person still gives:**
- the contract;
- the scope confirmation (one screen);
- the sessions (recording or transcript);
- answers to real exceptions only;
- one approval per module;
- the sign-off.

## Build order (each one shippable on its own)

1. **Scope on arrival:** switch on the delivered modules when the contract is read (the map strip already shows them, 15 Nov), plus the one-screen scope confirmation. Mostly `solution.js` `applyContractModules` with the `auto` flag, and `kickoff.js`.
2. **Exceptions-only findings:**
   - sort findings into Agreed and Needs a decision (a rule pass in `_rsapi.mjs`, Claude in `extract_findings`);
   - auto-confirm the Agreed ones as requirements with their source;
   - per-module exception counts on the Solution map;
   - turn `rschecks` into the report.
3. **Questions slimmed:**
   - lower the caps to 3–5 per module, with "must" only by default;
   - no Keep step;
   - set "answered" automatically from the transcript and live matches;
   - merge the Workshop room status into the same record.
4. **Whiteboard checks:** the four automatic flow checks, shown on the module's State flows tile.
5. **One source per compartment:** the Solution text for roles, notifications, KPIs and SLA is generated from the editors; the BRD prints one version.
6. **BRD ticks from facts:** set from the open counts that `brdreview.js` already computes; a person keeps the final sign-off.
7. **Retire the old transcripts pipeline** for new projects (read-only for old ones; contradictions no longer block).

## How we know it worked

For a project like Al Moallam, count the person's actions from contract to BRD sign-off, before and after. The target is under 30 decisions, instead of several hundred keep, drop and confirm clicks.

## Decisions for the owner

- May findings that match the contract become requirements automatically (still visible and undoable), or should a person confirm each?
- Retire the old Transcripts statements view for new projects?
- Default question count per module: 3 or 5?
