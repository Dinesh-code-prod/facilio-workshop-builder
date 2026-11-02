# Security review, 2 November 2026

Checked against the owner's list. "Fixed" means changed in this review; "Already in place" was found and left; "Not applicable" is explained.

| Item | Result |
|---|---|
| API keys and environment variables | Already in place. Keys (DeepSeek, Anthropic, Graph mail, Teams) are platform secrets read only by the server function; none reach the browser or logs. A pattern scan of every tracked file and of the git history found no key, token or private key. |
| Check Git for secrets | Clean. Fixed: `tests/ui/.devdata.bak.json` (local test data with a work e-mail and names) was tracked; it is now untracked and `tests/ui/.devdata*.json` is ignored. It stays in older history; it holds no keys. |
| Authentication | Already in place. Sign-in is the platform's (@facilio.com), customers by project invitation; every request is checked on the server for project membership and role. |
| Admin routes and user access | Already in place. Admin routes check the admin role on the server; the team and customer views are separate and the customer sees no team-only records. |
| Sanitize forms and XSS | Already in place. All user text goes through `esc()` before it is put in HTML; the page's Content-Security-Policy allows scripts from the app only, no inline scripts, no objects, no base tag, forms to the app only. Covered by `tests/ui/csp-*.mjs` and the security tests. |
| Rate limits | Already in place. Per-person limits on AI, uploads, writes, tickets, mail, Teams and creation (`LIMITS` in `work/server/api.mjs`). |
| Secure API endpoints | Already in place. One function; JSON only, `cache-control: no-store`, `x-content-type-options: nosniff`, input checked per route. |
| Security headers | Partly. The platform serves the site, so the app can only set the CSP and referrer policy in the page (done). `frame-ancestors`, HSTS and `Permissions-Policy` must be set by the platform; recommend asking the facilio.work team. |
| Debug mode | Off. No debug flag; the server logs only short failure notices. No source maps in `dist/`. |
| Dependencies and unused packages | `npm audit --omit=dev`: 0 vulnerabilities. All dependencies are build or test tools and are all used. |
| Exposed files | `dist/` holds only the built app, vendored libraries and templates; no `.env`, no maps, no test data. |
| Database | Platform database (`ctx.db`) behind the server function; the browser has no direct access. |
| Password hashing | Not applicable. The app stores no passwords; sign-in belongs to the platform. |
| Security audit | This page, plus `npm test` (security, CSP and privacy checks pass). |

Left for the platform team: response headers `frame-ancestors`, HSTS, `Permissions-Policy`; session lifetime.
