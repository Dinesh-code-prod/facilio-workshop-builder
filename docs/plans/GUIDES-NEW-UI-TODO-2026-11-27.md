# Guides in the new UI: to-do list (27 Nov 2026)

The UI moved to the Facilio reference-led design system on branch `feat/facilio-reference-ds`. See `docs/design/delivery-studio-design-system.md` and `docs/plans/delivery-studio-ui-migration-plan.md`.

Every guide that shows or describes a screen now shows the **old** look, and in places the old layout. This list is the work to bring the guides in line. Tick an item when it is done and checked; write the commit next to it.

**Do this after the user has signed off the new look,** so screens are recorded only once.

## What changed on screen (what the guides must now show)

**Shell**
- **Menu format.** Icons (default) or Text, chosen in Tabs & Layouts and in the account menu. The words "Expanded" and "Compact" are gone.
- **Icons format:** a 60 px Facilio icon rail, with the open module on a violet square. The pages of the open section are module tabs **in the top bar**.
- **Text format:** a grey side menu, with the open page in the selection blue.
- **Top bar, right end:** the project chip (like Facilio's site switcher), then icon-only Search, Guide me and Preview as customer, then the bell and the avatar.

**Look**
- Roboto everywhere, Facilio blue `#0024D6`, colours on the Facilio palette.
- Page titles 16/500 in a grey header panel.
- Buttons with 8 px corners; no pill shapes.

**Pages and panels**
- **Forms** (every side form) open as a full Facilio form page: a header bar, the form on one white card, and a footer bar with the actions.
- **Settings pages** use the Facilio Setup layout: section navigation on the left, the content on the right.
- **Tasks:**
  - New task, then a **More** menu holding Import Excel, From transcript, Stage tasks, Track with Claude, Import from Claude and the exports.
  - The sheets are a **view selector** ("All Tasks ▾") in the toolbar.
  - Daily brief, Daily task run, Send my list now and Sheet settings sit in the **⚙ menu**.
- **Chat panel (Assistant):** a Facilio dialog with 32 px icon buttons. The floating button is a dark 44 px square.

## 1. Guide films (screen recordings drawn as code, `public/films/`, `V.FILMS` in `src/filmplayer.js`)

Each film needs:
- new screens captured with `tools/film-capture.mjs`, on a copy of the local data;
- new mouse positions in `tools/film-shots/<film>.pos.json`;
- every caption beside the mouse re-read;
- a check that the length still matches the voice and captions.

Keep the site under the 50 MB cap (`node build.mjs` warns above 48 MB).

- [ ] **The Team Guide film** (`team-guide`, 5:58): every tab of the menu, in order.
  - Record it in the **Icons** format, the default.
  - The stage pages are now clicked in the top bar, not in the page.
  - Re-shoot every scene.
- [ ] **The per-tab clips** (`tg-<page id>`, one for each menu page, about 45), plus the fixed clips `tg-welcome`, `tg-firstday`, `tg-create`, `tg-assistant`, `tg-customer` and `tg-otto`.
- [ ] **Set up Claude** (`claude-setup`, 2:22): the four steps on the Claude setup page. Re-shoot the screens, including the shots that are not in use now, `steps` and `start`.
- [ ] **Contract intake, step by step** (`contract-intake`, 1:20).
- [ ] **Plan timeline: re-planning** (`plan-replan`, 1:26).
- [ ] **Film posters:** check the "deep Facilio gradient" poster colours against the new palette (they were mapped automatically).
- [ ] **Otto in Teams:** keep its Teams chat layout and demo data only. Check only the Studio screens shown around it.

## 2. Written guides in the app

- [ ] **Team Guide written text** (`src/teamhelp.js`):
  - [x] Replace "Expanded or Compact" (around line 186) with "Icons or Text" (done 27 Nov 2026).
  - Describe module tabs in the top bar, forms as full pages, the Setup-style settings, and the new Tasks menus.
- [ ] **Claude setup page** (`src/claudesetup.js`): check every "click X" instruction against the new screens.
- [ ] **Guide me, the guided walk** (`src/coach.js`):
  - It points at `.mt-bar .mt-t`, which now sits in the top bar (Icons) or the side menu (Text).
  - Walk it in **both formats** and fix any step that points at the wrong place or nowhere.
- [ ] **Product Tour** (`seefacilio`, `src/tourplayer.js`): replay it and fix any step that uses old screenshots or positions.
- [ ] **What's new** (`src/whatsnew.js`): add one entry for the new look (Icons/Text menu, forms as pages, Setup-style settings, Tasks menus).
- [ ] **Connector skills text** (`work/server/_skills.mjs`) and the **Claude hand-off prompts** (`src/claudelogic.js`, `src/claudehand.js`): remove any mention of the old layout.

## 3. Customer-facing guides

- [ ] **Guides & Videos / Training guides** (`src/guideslist.js`): check the page itself in both formats. Guide documents and their exports keep their document palette.
- [ ] **The User Guide Builder and the UAT guide** (`src/guidebuilder.js`, `src/uatguide.js`): the screenshots *inside* customer guides are of the customer's Facilio, not of the Studio. Only re-take a screenshot if it shows the Studio.
- [ ] **The customer User Guide** (`src/guide.js`): check it in the customer preview, in both formats.
- [ ] **Module guides (Learn Facilio)** (`src/guidelearn.js`): check the full-width layout, the colours and the cards.

## 4. Checks after the guides are redone

- [ ] `npm test`
- [ ] `node tests/ui/master-ds-check.mjs` (both formats, three widths, three views)
- [ ] `node tests/ui/ui-coverage.mjs` (the register in `docs/reports/ui-coverage-register-2026-11-27.md`)
- [ ] `node tests/ui/claude-handoff-check.mjs`, `node tests/claude_launch.mjs`, `node tests/connector_skills.mjs`
- [ ] Play each film once from start to end on the page. Check that the mouse lands on the control it names.
- [ ] Re-run `node build.mjs` and confirm the size is under 48 MB.
