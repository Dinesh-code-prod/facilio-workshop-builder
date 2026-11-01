# Handoff

Last updated: 1 Nov 2026, personal account, local session. Everything below is pushed to `main` (and `feat/simpler-studio`) unless it says otherwise.

## Done recently
- Login page: night city skyline, tree intro first on every fresh load, Open workspace goes straight to the home page.
- Projects home: white KPI tiles, white glass project cards, tile/list switch, sort, show more, search on the left. Portfolio health and My work panels removed.
- Admin dashboard: tabs (Overview, Delivery, Risk, People, Customers, Reports) built from widgets; flat matte admin styling; the top bar stays visible.
- Depth (light top edge, soft black shadow) on flat boxes for team, admin and customer pages (`src/depthlayer.css`).
- Facilio screens: side panel of grouped screens with a large 1920 px preview (102 screens, WebP, `public/demokit/shots`).
- Server: AI limits fail fast with Retry-After; the page waits and retries by itself (`src/api.js`); `tests/load_ai.mjs` (100 projects, 100 people).
- Road animation ("See how Delivery Studio helps"): 16 s shorter, wheel blur, tyres grounded.
- Project Overview: Deliverables, Upcoming sessions, People and Recent activity are now bento tiles (`src/overviewbento.css`); heading and Up next unchanged.
- Water-reveal logo and text drawn at full pixel density (`src/liquid.js`).
- Discover more is a scroll-driven marketing page: pinned stage of real 1920 px Facilio screens that wipe in on scroll, one numbered chapter per solution area (even chapters: arrow rail; odd chapters: tiles pan sideways while scrolling down), closing call to action (`src/explore.js`, `src/explore2.css`). Violet theme variables remapped to Facilio blue (`src/theme.css`). Depth added to small boxes missed earlier (`src/depthlayer.css`, end of file).
- Discover more rebuilt in facilio.com art style (black dot-grid stages, isometric slabs, serif headlines) with CSS scroll-driven motion (no scroll JS): `src/explore.js`, `src/explore2.css`; every module has its own isometric illustration drawn in code (`src/dxart.js`); the sign-in pages have a Discover more with Facilio button opening the same story full screen (`src/discoverlogin.js`, #/discover). Serif is a system fallback; Libre Caslon Condensed would need a font file.
- Tree intro (`src/treeintro.js`): much bigger trunk with bark grain and wide root flare, heavier limbs, about 3x more leaves with a sharper two-tone leaf sprite (no violet), crown glow; new scenery: drifting clouds, shooting star, a facilities skyline whose windows light up as stages pass, low mist, fireflies, grass and wildflowers at the base, falling petals. Draw cost about 12-19 ms in the test browser; the existing quality tiers still adapt.
- Deployed to facilio.work at commit 7b88b74 (deploy 92). Review status is pending, so only the owner and Ashwin can open it. See `docs/DEPLOYS.md`.

## Next steps, in order
1. The user checks the live app after deploy 90 (sign-in skyline, admin tabs, Facilio screens, Status Reports button, one AI action).
2. Otto (the facilio.work Teams bot): build project-aware tools in `work/server/api.mjs` and `work/work.json`: my projects, who is on a project's team, my tasks, overdue, project status (counts), a "current project" setting, and add/update task with `confirm: true`. Scope every tool to projects the person is a member of, even for admins (today `editableProjects` lets admins see all).
3. Then direct-message alerts to a project's team with `ctx.teams.send({ to: [...] })` (no `channel`), and switch the existing ticket alert to DM only. Then project-pinned group chats through a `server/teams.js` override; first test in Teams how Otto behaves in a DM and in a group (Teams is signed in in the Claude browser pane; send only read-only messages the user approved).
4. Earlier open items: security audit (needs a ~150 MB Playwright browser download the user has not approved), a warning for unsaved edits when the session expires, click-through checks (Inbox .eml buttons, whiteboard JPG export, Connection & Data and Rules & Guardrails pages, Add-from-Claude buttons), and cleaning local test leftovers.

## Good to know
- Not copied from the Comet CMMS demo kit: 260 live pages (the kit is about 500 MB).
- AI limit: the platform allows about 20 requests a minute and a daily cost cap per signed-in person; an organisation Claude key is shared by everyone (see `docs/AI_ARCHITECTURE.md`).
- Deploys need a Claude session with the `facilio work` connector signed in with the Facilio account (any Claude account type works). Run `/deploy`.
