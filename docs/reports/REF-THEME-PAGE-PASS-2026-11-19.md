# Reference theme, page pass (19 Nov 2026)

Every page of the three views (team project pages from `V.navFor()`, the customer view through Preview as customer, Admin) and the New task drawer, checked at 1920x1080 with `tests/ui/ref-theme-sweep.mjs` on the demo project "Riverside Towers (walkthrough)". Before = `main` at `aecd156`; after = this change. Same data, same pages, same tabs.

## Measured sweep

| Check | Before | After |
|---|---|---|
| Buttons off the size set | 350 | 358 |
| Tabs not 34 px | 2 | 2 |
| Labels off centre | 3 | 7 |
| Controls clipped | 8 | 8 |
| Controls overlapping | 5 | 5 |
| Boxes touching the window edge | 189 | 52 |
| Buttons in another font | 0 | 0 |
| Violet colours | 29 | 0 |
| Text in another font | 362 | 362 |
| Screens checked | 144 | 144 |

The sweep counts geometry and fonts only; most of this pass (one button look, box treatment, chips, Admin headers, the assistant) shows in the screenshots below rather than in these numbers.

What is left, and why it stays:
- Buttons off the size set: almost all are the Discover more carousel (kept as designed); the other 8 are the dashboard hero's arrow button, 46 px on purpose.
- Text in another font: the BRD and Solution document previews are a Word page (Calibri) and Discover more keeps its own designed type; both on purpose.
- Labels off centre: "More" fold-out buttons carry a small caret, and delete buttons a drawn trash icon, which the measure does not count; on screen they are centred.
- Overlaps: the BRD toolbar's More menu and the New task drawer's sticky footer over scrolled fields, both measured through layers; nothing overlaps on screen.
- Boxes at the edge: all in the Discover more carousel, which scrolls sideways by design (before: the page-sections card and toolbars touched the window edge on every page).

## What changed

- **Buttons, one set.** About 150 old button rules removed from the older style layers (styles, design-system, theme, polish, projfx and the earlier ui.css passes). One set at the end of `src/ui.css`: secondary is one 34 px white pill in Inter 13; the main action is Facilio blue (40 px with the mono caps label, or 34 px small); ghost, danger and disabled are one style each. Icons inside buttons always take the label colour (an old rule from the dark-banner days painted them white, so they vanished on white headers).
- **One place for everything on a page.** Back link, the page-sections card, the header (mono caps eyebrow, display title, lede, then the actions row under a hairline) and the page body all sit on the same 28 px side margin; nothing runs into the window edge any more.
- **Boxes inside pages.** Cards, widgets, table frames, stage cards, Team Guide stages and Admin cards have a hairline that warms to Facilio blue at the top-left corner, a faint blue wash in that corner and a soft lift; nested boxes stay flat.
- **Fields, status pills, number tiles, chips.** One field height, radius and blue focus ring; one pill shape for tags and statuses (colours kept by kind); mono caps labels and display numbers on every number tile; every filter chip outlined with the chosen one filled ink; toggle groups without a grey track.
- **Admin** opens with the same header as a project page. Violet avatar and chart colours replaced with brand navy.
- **Chat assistant**: white head with the blue icon tile, display title and mono caps line, a quiet body, the composer as one rounded card, your messages in a blue bubble and Claude's in a white one.
- **Guide me**: Next is the blue main action. **Training**: videos still to be made show a navy-to-blue poster instead of flat grey. **Customer side rail**: labels wrap instead of being cut ("Your projec…").
- Drawer and dialog titles use the display face.

## Before and after

### Team: home and intro

| Before | After |
|---|---|
| ![Dashboard before](ref-theme-2026-11-19/before-team-projdash.jpg) | ![Dashboard after](ref-theme-2026-11-19/after-team-projdash.jpg) |
| ![Project cycle before](ref-theme-2026-11-19/before-team-lifecycle.jpg) | ![Project cycle after](ref-theme-2026-11-19/after-team-lifecycle.jpg) |
| ![Contract intake before](ref-theme-2026-11-19/before-team-msaintake.jpg) | ![Contract intake after](ref-theme-2026-11-19/after-team-msaintake.jpg) |
| ![Kick-off, plan and schedule before](ref-theme-2026-11-19/before-team-intro.jpg) | ![Kick-off, plan and schedule after](ref-theme-2026-11-19/after-team-intro.jpg) |

### Team: sessions and module design

| Before | After |
|---|---|
| ![Data onboarding before](ref-theme-2026-11-19/before-team-onboarding.jpg) | ![Data onboarding after](ref-theme-2026-11-19/after-team-onboarding.jpg) |
| ![Workshop room (live call) before](ref-theme-2026-11-19/before-team-workshop.jpg) | ![Workshop room (live call) after](ref-theme-2026-11-19/after-team-workshop.jpg) |
| ![State flow builder before](ref-theme-2026-11-19/before-team-flow.jpg) | ![State flow builder after](ref-theme-2026-11-19/after-team-flow.jpg) |
| ![Forms & templates before](ref-theme-2026-11-19/before-team-modules.jpg) | ![Forms & templates after](ref-theme-2026-11-19/after-team-modules.jpg) |

### Team: solution, BRD and governance

| Before | After |
|---|---|
| ![Solution before](ref-theme-2026-11-19/before-team-solmap.jpg) | ![Solution after](ref-theme-2026-11-19/after-team-solmap.jpg) |
| ![KPIs & SLA before](ref-theme-2026-11-19/before-team-slakpi.jpg) | ![KPIs & SLA after](ref-theme-2026-11-19/after-team-slakpi.jpg) |
| ![BRD Draft before](ref-theme-2026-11-19/before-team-brd.jpg) | ![BRD Draft after](ref-theme-2026-11-19/after-team-brd.jpg) |
| ![Governance & RAID before](ref-theme-2026-11-19/before-team-governance.jpg) | ![Governance & RAID after](ref-theme-2026-11-19/after-team-governance.jpg) |

### Team: UAT, training, tasks, handover

| Before | After |
|---|---|
| ![Build & test tracker before](ref-theme-2026-11-19/before-team-delivery.jpg) | ![Build & test tracker after](ref-theme-2026-11-19/after-team-delivery.jpg) |
| ![Guides & Videos before](ref-theme-2026-11-19/before-team-guides.jpg) | ![Guides & Videos after](ref-theme-2026-11-19/after-team-guides.jpg) |
| ![Tasks and email before](ref-theme-2026-11-19/before-team-tasks.jpg) | ![Tasks and email after](ref-theme-2026-11-19/after-team-tasks.jpg) |
| ![Handover & Closure before](ref-theme-2026-11-19/before-team-handover.jpg) | ![Handover & Closure after](ref-theme-2026-11-19/after-team-handover.jpg) |

### Team: reports, help and settings

| Before | After |
|---|---|
| ![Status report (WSR) & monthly report before](ref-theme-2026-11-19/before-team-statusrep.jpg) | ![Status report (WSR) & monthly report after](ref-theme-2026-11-19/after-team-statusrep.jpg) |
| ![Team Guide before](ref-theme-2026-11-19/before-team-teamhelp.jpg) | ![Team Guide after](ref-theme-2026-11-19/after-team-teamhelp.jpg) |
| ![What's new before](ref-theme-2026-11-19/before-team-whatsnew.jpg) | ![What's new after](ref-theme-2026-11-19/after-team-whatsnew.jpg) |
| ![Project Settings before](ref-theme-2026-11-19/before-team-settings.jpg) | ![Project Settings after](ref-theme-2026-11-19/after-team-settings.jpg) |

### Customer view

| Before | After |
|---|---|
| ![Welcome before](ref-theme-2026-11-19/before-customer-cust_home.jpg) | ![Welcome after](ref-theme-2026-11-19/after-customer-cust_home.jpg) |
| ![Learn & Prepare before](ref-theme-2026-11-19/before-customer-prepare.jpg) | ![Learn & Prepare after](ref-theme-2026-11-19/after-customer-prepare.jpg) |
| ![Module guides before](ref-theme-2026-11-19/before-customer-learnlib.jpg) | ![Module guides after](ref-theme-2026-11-19/after-customer-learnlib.jpg) |
| ![Sign-offs & Decisions before](ref-theme-2026-11-19/before-customer-governance.jpg) | ![Sign-offs & Decisions after](ref-theme-2026-11-19/after-customer-governance.jpg) |

### Admin

| Before | After |
|---|---|
| ![Dashboard before](ref-theme-2026-11-19/before-admin-1.jpg) | ![Dashboard after](ref-theme-2026-11-19/after-admin-1.jpg) |
| ![Projects148 before](ref-theme-2026-11-19/before-admin-3.jpg) | ![Projects148 after](ref-theme-2026-11-19/after-admin-3.jpg) |
| ![Access before](ref-theme-2026-11-19/before-admin-5.jpg) | ![Access after](ref-theme-2026-11-19/after-admin-5.jpg) |
| ![AI provider before](ref-theme-2026-11-19/before-admin-6.jpg) | ![AI provider after](ref-theme-2026-11-19/after-admin-6.jpg) |

### Drawer

| Before | After |
|---|---|
| ![tasks drawer before](ref-theme-2026-11-19/before-overlay-tasks.jpg) | ![tasks drawer after](ref-theme-2026-11-19/after-overlay-tasks.jpg) |

## Not checked

- Screens below the first 1080 px of each page were measured but only the top was screenshotted.
- Mobile and tablet sizes were not part of this pass.
- The sign-in scene, the intro film, the night-city banner and Discover more were left as designed.
- Nothing was deployed.
