# Feedback tab and GitHub (7 Nov 2026)

Help > Feedback lets any team member send feedback or a feature request. It is saved in the app (collection `fb`, key `<day>.<id>`) and, once the credential below exists, also created as a GitHub issue in `Dinesh-code-prod/facilio-workshop-builder` with the labels `feedback` and the type (`feature`, `idea`, `bug`, `other`). The issue text says who sent it, when, the project and the page.

## One-time setup (the app owner)
1. Create a GitHub fine-grained token for that repository with only **Issues: Read and write**.
2. At https://secrets.facilio.work add a credential named `github_feedback` (type bearer), allowed host `api.github.com`, and grant it to `facilio-delivery-studio`.
3. In the Feedback tab press **Send N missing to GitHub** to send what was saved before the credential existed.
Until then feedback is kept in the app and shows "not in GitHub yet". Nothing is lost.

## The daily report
- Ask Claude: "Use the Facilio Delivery Studio connector, get_feedback for today (or from/to dates) and make an Excel sheet with the columns Date, Time, Who, Email, Type, Feedback, Details, Project, Page, GitHub."
- Or in the Feedback tab press **Download for Excel** (a CSV Excel opens).
- From GitHub: `gh issue list --repo Dinesh-code-prod/facilio-workshop-builder --label feedback --search "created:2026-11-07" --json number,title,body,createdAt,url`.
After adding the tool, a Claude that already has the connector must remove and re-add it to see `get_feedback` (it caches the tool list).
