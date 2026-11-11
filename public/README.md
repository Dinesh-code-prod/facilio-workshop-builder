# public: files the website serves as they are

Nothing here is built or changed by `build.mjs`; it is copied into `dist/` and the browser fetches it by its name.

| Folder or file | What is inside |
|---|---|
| `brand/` | Logos and brand pictures used on the sign-in page and in exported documents. |
| `fonts/` | The font files the app and its PDF and Word exports use. |
| `templates/` | Document templates the app fills in or offers for download. |
| `onboarding/`, `onboarding-tool/` | The data onboarding sheet tool that opens inside the Data onboarding page. |
| `demokit/` | The Facilio demo screens shown in the Customer View. |
| `skills/` | Claude skill files people download from the Claude setup page. |
| `robots.txt` | Tells search engines not to index the app. |

**Keep it small:** the whole site must stay under 50 MB, and most of that weight is in this folder and in `vendor/`. Check with `du -sm dist` after a build.
