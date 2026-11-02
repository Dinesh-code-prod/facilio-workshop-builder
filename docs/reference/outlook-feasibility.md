# Outlook integration: feasibility and prerequisites

## Verdict
A native inbox and message preview inside Delivery Studio is **not feasible in the current deployment**. Open Outlook and Compose in Outlook are implemented instead. No mock inbox exists.

## Why
Microsoft Graph reads a mailbox only with a token for that person (delegated `Mail.Read`) or an application permission over mailboxes. In this deployment on facilio.work:
- Only the signed-in person's verified email reaches the app (Entra SSO happens in the platform). The app receives no Microsoft access or refresh token.
- `ctx.fetch` calls third-party APIs with the **app owner's** granted credential. Pointing it at Graph would read the owner's mailbox for every viewer. That would expose one person's mail to others, so it is not used.
- The app's own sign-in cannot be extended: authentication is owned by the platform, and callbacks must not be changed without approval.

## What is possible, and what each needs
| Option | Needs | Status |
|---|---|---|
| Open Outlook on the web, compose a draft with To/Cc/Subject/Body | Nothing. The person signs in to Outlook themselves | Built |
| Per-user inbox via delegated Graph (`Mail.Read`, read-only) | Entra app registration; tenant admin consent for `Mail.Read` (or user consent if the tenant allows); a way to obtain each person's Graph token (platform support, or a separate OAuth flow with a redirect URI on a host the team controls); a server-side token store with encryption; Exchange Online licences (already true for M365 staff) | Not available |
| Application permission (`Mail.Read` across mailboxes) | Admin consent plus an Exchange application access policy limiting it to named mailboxes (a shared customer mailbox is the safe form) | Not available. Needs security approval; not requested |
| Customer mailbox shared in a single mailbox | Same as above, scoped to that one mailbox | Possible later |

## Prerequisites to enable an inbox later
1. Decide delegated (each person's own mail) or a single shared mailbox.
2. Register an Entra app (single tenant). Redirect URI on the host the platform approves. Scopes: `User.Read`, `Mail.Read` only. No `Send`, `ReadWrite` or `offline_access` unless refresh is justified.
3. Tenant admin grants consent. For application permission, also create an Exchange application access policy for the mailbox.
4. The platform (or an approved service) must hand the app a per-user token, or the secret store must accept writes. Tokens stay on the server and are never sent to the browser.
5. Build: list `GET /me/mailFolders/inbox/messages?$select=...&$top=25`, paging via `@odata.nextLink`, body sanitised (HTML stripped to a safe subset, remote images blocked, links `rel=noopener`), `webLink` for Open in Outlook, disconnect that deletes the stored token. Handle 401 (expired), 403 (consent), 429 and 5xx with clear messages.
6. Do not store mailbox content. Cache nothing beyond the open request.

## Compose in Outlook: behaviour
- Link: `https://outlook.office.com/mail/deeplink/compose?to=&cc=&subject=&body=`, all values URL-encoded. Several recipients are joined with `;`. Invalid addresses are skipped and reported.
- Links stay under about 1,900 characters. A longer body is cut at a safe point with a note, and the **full body is copied to the clipboard** for pasting.
- Missing recipient: Outlook opens with an empty To and the toast says so. Pop-up blocked: the full email text is copied and the person is told to paste it.
- Desktop Outlook is not targeted; the existing `mailto:` button and `.eml` download remain for that.
- Nothing is sent and the app never says an email was sent. The toast says the draft must be reviewed and sent in Outlook.
