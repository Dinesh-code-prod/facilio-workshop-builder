# Test script standards

## A good scenario
- One business process a real role does end to end, in the order they do it.
  Example: *Helpdesk agent raises a work order from a service request, the supervisor approves it,
  the technician completes it on mobile, the requester gets the completion notice.*
- Named after the outcome, not the screen: "Raise and complete a reactive work order", not "Work order form".
- Has preconditions (data that must exist), 3 to 12 steps, and an expected result for every step.
- Lists the requirement ids it proves. Every confirmed requirement appears in at least one scenario.
- Covers the unhappy path where the BRD defines one: rejection, missing field, overdue SLA, reassignment.

## A good step
- Action: one thing the tester does, with the exact button or field name the configuration uses.
- Expected result: what they should see, checkable by eye ("status changes to Assigned",
  "an email arrives for the supervisor"), never "works correctly".

## Coverage checklist per module (use what is in scope)
- Create, edit, view, search and filter the main record.
- Each state-flow transition and each approval (approve and reject).
- Notifications and their recipients.
- SLA timers where agreed.
- Each role's permissions: what they can and cannot see or do.
- Mobile app steps for technicians if in scope.
- Reports and dashboards named in the BRD.

## Defect severity
| Severity | Meaning | Example |
|---|---|---|
| Critical | A core process cannot be done at all; no workaround | Work orders cannot be created |
| High | A process works only with a workaround, or wrong data is saved | Approval goes to the wrong person |
| Medium | Wrong or missing behaviour with an easy workaround | A notification is missing a field |
| Low | Cosmetic or wording | Label spelled wrong |

## Workbook columns
*Test scripts*: Scenario id, Module, Role, Scenario, Requirement ids, Preconditions, Step, Action,
Expected result, Actual result, Pass/Fail, Defect id, Tested by, Date.
*Defect log*: Defect id, Scenario id, Step, Summary, Steps to reproduce, Expected, Actual, Severity,
Raised by, Date raised, Status (Open, In fix, Ready to re-test, Closed), Fixed in, Re-tested by, Date closed.
*Sign-off*: Role, Name, Decision (Accepted / Accepted with conditions / Not accepted), Conditions, Signature, Date.
