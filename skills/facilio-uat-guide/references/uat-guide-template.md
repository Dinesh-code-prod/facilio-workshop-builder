# UAT guide: chapter order and what goes in each

Write for the customer's testers: plain words, short sentences, their role names, their site names.
Every chapter that has no source says so with `[To confirm]` instead of guessing.

## Cover
- Title: "User Acceptance Testing guide - <project>"
- Customer, version, date, prepared by (the consultant's name, not Claude), status *Draft for review*.

## 1. About this guide
- Two or three sentences: what UAT is for ("you test the system set up for you, with your own
  processes, before it goes live") and what you do with this guide.
- Who it is for: the UAT lead and each tester role.
- What it is not: not training and not the permanent user guide (that comes at handover).

## 2. Scope of testing
- Modules in scope (from the workshop / BRD), each with one line on what will be tested.
- Out of scope for this UAT (integrations not ready, later phases) - only what the sources say.

## 3. Timeline and people
- UAT window (start and end), daily check-in time if agreed, the date results are due.
- Table: role | name | what they test | contact. Leave names blank when not known.
- Who to ask: the Facilio project manager and the customer UAT lead.

## 4. Before you start
- Environment: the UAT/sandbox address, how logins are given, the browser to use, the mobile app if in scope.
- Test data: the sites, buildings, assets, vendors and users prepared for testing.
- Entry criteria: configuration complete, FTR passed, logins issued, test data loaded, testers briefed.

## 5. How to test
1. Open the *Test scripts* sheet; filter on your role.
2. Do each step in order; compare with *Expected result*.
3. Record *Actual result* only when it differs, then *Pass* or *Fail*.
4. On a fail: take a screenshot, add a row in *Defect log* (what you did, what happened, what you
   expected, severity), put the defect id next to the step.
5. Re-test fixed defects when told and update the row.

## 6. Test scenarios
One short section per module: the scenarios in the workbook with id, title, role and a one-line
purpose. The steps live in the workbook, not repeated here.

## 7. Defects
- Severity levels (copy from `test-script-standards.md`) and the expected fix time agreed for each.
- How defects are triaged and when re-tests happen.

## 8. Finishing UAT and sign-off
- Exit criteria: every scenario run, no open Critical or High defect, Medium/Low defects have an
  agreed plan.
- Sign-off: the *Sign-off* sheet, who signs, and that sign-off allows go-live planning to proceed.

## Appendix
- Glossary of Facilio terms used (Work Order, Service Request, Asset, Planned Maintenance, Approval,
  State flow) in one line each, in customer words.
