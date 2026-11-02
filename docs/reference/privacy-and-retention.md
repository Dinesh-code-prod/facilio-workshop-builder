# Privacy, retention and requests

The in-app page is Help > **Privacy & data** (`src/privacy.js`). This note records what it says and how it is enforced, so a reviewer can check it against the code.

## Position
- Users are Facilio staff (`@facilio.com` sign-in). The customer view is not switched on, so no customer personal data is collected by the app itself.
- The app sets **no cookies**. The facilio.work platform keeps people signed in with its own session. The app stores four preferences in the browser (`fwb_pj_view`, `fwb_tkview`, `fwb_intro_classic`, `fwb_claude_conn`). They are functional, not tracking, so there is no cookie banner.
- No analytics, advertising or third-party tracking scripts. Scripts load only from the app's own origin (content security policy).
- A countdown or urgency timer does not exist anywhere in the app (checked by search). Progress messages state real behaviour ("this can take up to half a minute").
- Every image has alt text (checked by `tests/ui/privacy-a11y-check.mjs`); clickable cards and rows are reachable with Tab and activate with Enter or Space (`enhanceActions` in `src/shell.js`); a Skip to content link and a visible focus ring come from `src/a11y.js` and `src/a11y.css`.

## Retention (proposed limits, to be confirmed by the platform owner)
| Data | Kept | Enforced by |
|---|---|---|
| Project content, records, files, tickets | While active; archived projects 24 months, then deleted for good | Platform owner, by hand (Admin, Delete for good, archived projects only) |
| Activity trail | With the project | Removed with the project |
| Open in Claude hand-off packages | 1 hour | Code: expiry check on read, delete on close |
| Unfiled support mailbox mail | Until routed or dismissed; reviewed monthly | Platform owner, by hand |
| AI use | Counts per person and month only; prompts and answers are not logged | Code |
| Data requests | 12 months after done | Platform owner, by hand |

The platform has no scheduler, so automatic deletion of old data is not possible today. If a scheduler becomes available, add a daily purge for the rows above.

## Requests
| Request | How | Code |
|---|---|---|
| See my data | Download my data (JSON: account record, projects and role, layout) | `GET /api/me/data` |
| Delete my data | Request deletion (one open request at a time); the platform owner removes the person from projects, deletes the account record and marks it done | `POST /api/me/data-request`, `GET /api/me/data-requests`, `GET /api/admin/data-requests`, `POST /api/admin/data-requests/:id/done` |

Project content is not part of a personal download; it belongs to the project (a project owner can export it from Project Settings).

## Terms of use
Short internal terms in the same page: Facilio work only; do not share access; record only what the project needs; AI drafts must be reviewed; customer data only for that customer's project and not in personal accounts; changes are recorded with the person's name; contact the platform owner.
