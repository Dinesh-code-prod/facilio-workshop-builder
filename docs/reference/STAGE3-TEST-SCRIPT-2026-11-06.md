# Stage 3 test script (6 Nov 2026)

Nothing in stage 3 has been run with a real Claude yet. This script does it once, on a throwaway project, and tells you what to look for. Use a new test project (not a customer one).

## Before you start
1. Hard refresh the live app (Ctrl+Shift+R). Create a test project and upload an MSA (stage 1). Approve the kick-off after the review checklist.
2. In the Claude app: Scheduled, "Delivery Studio job queue". Click Run now once and choose Always allow for the Delivery Studio tools. Leave the task switched on while you test, then pause it.
3. Stage 2 needs transcripts for Claude to read. Add at least one (Requirement sessions, Transcripts: paste or upload) that talks about a state flow change, a custom field, and a special screen (for example "when we click Assign we want to see all technicians together").

## Test 1: flows (Requirement sessions, Process whiteboard)
1. Open Process whiteboard. Above the board you see "Proposals for the design".
2. Press **Save the standard flows**. Expect: a message "Saved the standard flow of N modules in scope". Open State Flow Builder: each module in scope has its flow.
3. Press **Ask Claude to capture the flows**. The assistant panel on the right opens by itself and shows progress. Wait for "Done".
4. Look at the proposals. Each must show a quote and the session it came from. Check one against the transcript: is anything invented? (If yes, note it.)
5. Press **Apply** on one flow. Expect: it appears in State Flow Builder. Press **Dismiss** on another. Expect: it disappears from the list.
6. Press **New tab** on the whiteboard: it opens big, and the proposals panel is not in that tab.

## Test 2: fields and forms (System modules and Form Builder)
1. Press **Ask Claude for fields and forms**. Wait for Done.
2. Apply a field: expect it on the module. Apply a form that uses that field: expect it in the module's forms.
3. Apply a form that uses a field the module does not have: expect a message saying to apply the fields first (not a crash).
4. Apply the same field again, or a field the module already has: expect a refusal message.

## Test 3: connected apps
1. Press **Ask Claude for connected apps**. Expect a proposal like a multi-technician view on the Assign button, with module, trigger, purpose, what it shows, users.
2. Apply it. Expect a Draft requirement titled "Connected app: ..." in the BRD requirements.
3. Press **Copy the Vibe prompt**: Vibe opens, paste the prompt, check it asks for ONE finished app for the customer.

## Test 4: BRD draft and checklist
1. On the BRD tab press **Ask Claude to draft the BRD**. Expect requirement proposals and one BRD introduction proposal.
2. Apply the introduction: only empty parts are filled; text you already wrote is not changed.
3. Apply a requirement: it arrives as a Draft. It is NOT in the BRD until you confirm it (confirm it where requirements are listed).
4. Above the BRD you see "Before this BRD is approved". Try to set the BRD to Approved first: expect it to be refused ("tick each part").
5. Tick all six parts (each shows your name). As the project owner set the BRD to Approved: expect it works. As an editor who is not the owner: expect it is refused.

## Test 5: mockup
1. Open Mockup (Meteor). With nothing applied it says so. After tests 1 to 4 it lists modules, flows, fields, forms, flows across modules, connected apps.
2. **Copy the brief**, **Open Meteor**, choose From a PRD, paste. Does Meteor understand it? Note anything it gets wrong.
3. **Export HTML**: open the file, then Print, Save as PDF. Check it looks clean.

## Multi-user check
Ask a teammate (with edit access) to type a message in the assistant panel while you watch: their name shows on the message, Claude answers them by name, and a job a teammate asked for is taken by whichever Claude is running.

## What to write down
Anything Claude invented, a proposal that could not be applied, a message that was unclear, a screen that looked crowded, and any step where you had to click something you did not expect. Send it back and each item becomes a fix.

## Not covered here
The fourth tab (UAT guide, FTR, Comet), a finished Vibe app linked to a Facilio button, and how a real customer sees any of this (customers see none of it).
