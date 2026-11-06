# Stage 4 plan: UAT guide, FTR and Comet (7 Nov 2026)

Direction from the user: the fourth tab covers the UAT guide and the FTR, and Comet is used for UAT. Same rules as stage 3: manual first, Claude helps only when asked, no long process. Nothing here is built.

## What already exists (read from the code, 7 Nov 2026)
- **UAT test cases** (`src/uat.js`, `src/uatlogic.js`): module-wise workspace for the modules in scope. Test cases (item kind `utc`) with status, execution, issues raised into the task register, retesting, sign-off, and import from an Excel or CSV tracker.
- **UAT guide** (`src/uatguide.js`): customer-shareable HTML, module by module, built only from the saved test cases. A module with no test case is shown as a gap; nothing is invented. Its header says "there is no Comet step".
- **FTR** (`src/ftr.js`, `src/ftrhtml.js`, `src/ftrresult.js`): an Excel FTR and KPI workbook editor, an FTR checklist as one HTML file the consultant works through, and a results file that is checked and summed. Configuration checks and functional tests are kept apart on purpose (inspecting the setup does not prove the application works).
- **Delivery** (`src/delivery.js`): build and test progress per module, UAT sessions and readiness, go-live checklist. **Agent testing** for agent projects.

## What is missing
1. Nothing connects stage 3 to stage 4. Test cases are typed or imported; they are not started from the solution (requirements, flows, forms, notifications, permissions) that the BRD now records.
2. No link between a BRD requirement, its test case and its FTR check, so nobody can see whether every agreed requirement was tested.
3. Comet is not used. The original brief wanted Comet to help with the UAT guide; the code later decided "no Comet step" because no way to feed it was verified.
4. No status view for the stage (like Solution status in stage 3): per module, how many test cases exist, run, passed, failed, open issues, FTR checks done.

## The chain (one line)
Solution per module (stage 3) > test cases > UAT guide (HTML, shareable) > execution and issues > FTR checklist > sign-off. Comet adds a short walkthrough or video for the main scenarios.

## Build order (each step small; nothing starts until the user agrees)
1. **Test cases from the solution (no Claude):** a button "Start test cases from the solution" per module in scope. It creates DRAFT test cases from what is recorded: one per confirmed requirement, one per transition of a changed state flow (steps and expected result taken from the flow and the requirement text), one per connected app, one per flow across modules. Each draft carries its requirement id so the link in point 2 exists. Drafts are edited by hand; nothing is marked run.
2. **Coverage view:** per module, which requirements have a test case and which do not. Read only. Same page style as Solution status.
3. **FTR from the same data:** the FTR checklist rows start from the same requirements and configuration, keeping configuration checks and functional tests apart as they are now.
4. **Comet cards:** the same pattern as the Mockup tab. One card per key scenario (not per test case): a prompt to copy, Open Comet, paste the link of the walkthrough or video Comet made, shown inside the card (Studio already allows framing comet.facilio.work). The UAT guide lists the walkthrough link beside its scenario.
5. **Stage 4 status board:** test cases, run, passed, failed, open issues, FTR checks, walkthroughs, per module. Read only.
6. **Optional, only on request:** a prompt the team can open in Claude to write better steps for a test case from the requirement text.

## What stays as it is
UAT guide HTML, the Excel tracker import, the issue register links, the FTR results check, agent testing, delivery readiness.

## Decisions for the user
- Comet for UAT: the earlier "no Comet step" note is replaced by the optional cards in step 4 (a link per scenario, never required). Is that what you want?
- Test cases from the solution (step 1) are created without Claude. Right, or should Claude write the steps?
- Which scenarios get a walkthrough: only the main ones the team picks, not every test case?

## Added 7 Nov 2026 (user): exports, freedom, recordings
- **Freedom rule for every guide tool:** nothing may stop or lecture the person. No "BRD not signed off", no "no test cases yet so no guide", no "nothing to export". A guide, a UAT guide or an FTR file is always made; what is missing is listed inside it as a gap, at most a quiet note. DONE 7 Nov for the UAT guide download, the FTR checklist and the guide builder export. The go-live readiness card on Delivery is a separate read of what is open and stays.
- **Exports that exist:** UAT guide: HTML download (its page has Print, which saves a PDF) and, from the User Guide Builder, Word and PDF. FTR: Excel workbook and the HTML checklist. Not built: a one-click PDF button on the test-cases page.
- **Comet for video:** same card pattern as the Mockup tab (step 4 above): one card per key scenario, copy the prompt, Open Comet, paste the link of the video, shown inside the card.
- **A recorded process turned into a document (not built):** Studio already has Video to Guide (the video stays on the computer, screenshots are captured, a transcript .vtt or .srt is added, steps are drafted). It makes user-guide steps only, it has no speech recognition, and it drafts through the old server AI path. Plan: (1) draft through Claude with the existing hand-off (the person attaches the screenshots in Claude), (2) the same steps can become draft UAT test cases or FTR rows with one button each, (3) a silent recording works from screenshots alone. No dependency on Comet.

- DONE 7 Nov: step 1. UAT page button "Start from the solution": draft test cases (status Not Started, nothing marked run) from confirmed requirements, changed or new transitions of state flows, applied connected apps and flows across modules. Each draft keeps its requirement id and a source key, a second press adds nothing twice, and a test case the person already wrote with the same title is left alone. No Claude. Next: step 2, the coverage view.
- DONE 7 Nov: step 2. A read-only card "Coverage of the confirmed requirements" under the UAT test cases: per module, how many confirmed requirements have a test case, and which do not. A requirement is covered when a test case names its ID (by hand, or made by Start from the solution). Next: step 3, the FTR from the same data.
