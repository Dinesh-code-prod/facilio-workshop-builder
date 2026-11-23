# A new contract after kick-off or go-live: its own change track (plan, 23 Nov 2026)

Status: agreed with the user on 23 Nov 2026 (ask on Analyse with change track first; the project owner approves the delta; the change has its own track and the main stages stay closed). Built and deployed in 508; not yet checked with a real new contract.

## The problem
A project is live (or its kick-off is approved). The customer signs something new: a change request with its own MSA or order form, an integration MSA, an amendment, a renewal. Someone says to the chat assistant "pull my new MSA, it is in the drive".

What happens today:
- Contract intake keeps several contract documents (`msa_text.docs`, roles msa / amendment / order / sow / other). After the kick-off is approved, Analyse only adds one free-text line to the kick-off change list (`kickoff_cr`) and asks Claude to edit the kick-off deck (`apply_change`). The approved kick-off is protected, which is right.
- There is a Change requests page (record `cr`, Governance) with price, effort, customer approval and an impact list, but a CR links to nothing: no contract document, no scope, no sessions, no plan rows, no BRD, no UAT.
- Sessions, plan rows, BRDs and UAT cases have no way to say "this belongs to CR-3". Contracts & Integrations keeps its own list of contracts, separate from Contract intake.
- In chat, "pull my new MSA" does not start any contract job.

So a post-go-live change gets no requirement sessions, no plan phase and no BRD or UAT of its own, and nobody can see what changed against the original contract.

## What we build: a change track per change request
The existing Change requests record (`cr`) becomes the anchor. A CR can be "tracked": it then owns its contract documents, its delta scope, its sessions, its plan phase, a BRD addendum, its UAT cases and its own sign-offs. The original kick-off, plan and BRD stay as approved.

### 1. Getting the new contract in
- **From chat:** "pull my new MSA / CR / amendment" (any wording the chat command matcher recognises) starts the job `pull_cr` when the kick-off is approved, or `pull_msa` before that.
- **From Contract intake:** after kick-off approval, Analyse asks once: "Start a change track for this document" (default) or "Only update the contract facts".
- **From the OneDrive folder:** a project created with the folder picker remembers its folder (`project.onedrive = { name, ref }`). `pull_cr` looks there first, in every subfolder, for contract documents that are not among the ones already read (compared by name, size and the documents listed in earlier extractions), decides from the content what is a contract, and asks the person when unsure.
- The new document is stored as a contract document with a new role `cr` (plus the existing `amendment`), its effective date and the CR it belongs to.

### 2. The delta, approved once
- Claude reads the new document(s) and the approved original extraction and saves a **delta** as a pull transfer of kind `cr_delta` on the project: items added, changed and removed, each with its document, page and quote; new modules; dates; fees; conflicts with the original.
- The project owner approves the delta on the CR page (the same review the MSA uses: nothing applies until a person approves). A rejected or edited delta goes back to Claude as a new version.

### 3. What approval sets up (all tagged with the CR number)
- **Scope:** the delta items go into the Requirement Session Planner scope, tagged `cr: 'CR-3'`.
- **Sessions:** requirement sessions drafted only for the delta modules (same code as the kick-off session plan), tagged with the CR, after the CR start date. Existing sessions are never touched.
- **Plan:** a new phase block at the end of the project plan, "CR-3: <title>", with requirement sessions, BRD addendum, build, UAT and go-live rows. The current-phase strip ignores CR rows, so the original stages are not counted again.
- **BRD addendum:** a new BRD in the BRD list of type `addendum`, limited to the delta modules and pointing to the CR. It is issued and signed like any BRD.
- **UAT:** new and changed test cases carry the CR tag, so UAT for the change can be run and signed on its own.
- **Contracts & Integrations:** integrations named in the delta arrive there as facts to confirm (the existing mechanism), linked to the new contract instead of a second, unsynced copy.

### 4. Seeing where a change stands
The CR page shows a small track for each tracked CR: Contract read, Delta approved, Sessions held, BRD addendum signed, Built, UAT signed, Live. Each step is worked out from the linked items, like the main stages. The main lifecycle does not reopen.

Commercial approval stays as it is: price, effort and the customer's Approve or Decline on the CR record.

### 5. Claude side (no new connector tools; the connector is at its 40-tool limit)
- New job `pull_cr` (recipe in `work/server/_jobs.mjs`); `project_jobs` action `request` also allows `pull_cr`, so Claude can start it from chat.
- `transfer_write` kind `cr_delta` for the delta; `get_records` kind `cr` returns the track and its links.
- Skills text, connector help ("New contract after go-live"), the Team Guide and the Open in Claude button on the CR page are updated together.

## Build order
1. Data: `cr` role and effective date on contract documents; `track`, `docs`, `deltaTransfer` on the CR record; `cr` tag on planner scope and sessions, plan rows, BRDs and UAT cases; `project.onedrive` saved by the folder picker.
2. Jobs: `pull_cr` recipe; chat command; `project_jobs` request; Contract intake's question after approval.
3. Delta review and apply on the CR page (approve, then scope, sessions, plan phase, BRD addendum).
4. Track view on the CR page; UAT and BRD filters by CR; current-phase strip skips CR rows.
5. Claude side, Team Guide, tests (`tests/cr_track.mjs`), the Claude checks, `npm test`, browser check, deploy when asked.

## Decisions for the user
1. Should every new contract after kick-off approval become a change track, or should Analyse ask "Change track" or "Only update the facts" (proposed: ask, change track pre-selected)?
2. Who approves the delta: the project owner only (proposed), or also the customer through the existing CR approval?
3. A change after go-live: keep the main lifecycle closed and show the change on its own track (proposed), or reopen stages?

## Not in this plan
- Writing anything back to OneDrive (the Microsoft 365 connector is read-only).
- Re-pricing or invoices (the CR record's price fields stay as they are).
- Merging the three older "change" lists (kick-off change list, CR records, contract type `cr`): the kick-off change list stays for edits to the kick-off deck.
