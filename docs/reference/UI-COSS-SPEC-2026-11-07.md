# UI look: coss ui (decision of 7 Nov 2026)

The user dropped Fluent 2 ("basic, looks old") for coss ui (https://coss.com/ui, built on Base UI by the Cal.com team). Light theme only, no dark mode. The code is `src/ui.css` (the last style layer; tokens are `--cs-*`, shared page patterns are the `cs-*` classes). Fluent is gone: do not bring it back.

## Tokens (read from coss ui's own stylesheet)
- Text `#262626`, `#404040`, muted `#686868`; page `#fafafa`, cards `#fff`; borders are black at 8 percent (inputs 12 percent), soft fills black at 4 to 6 percent.
- Primary (main buttons, selected switches): near-black `#262626`, hover `#404040`, pressed `#171717`, text `#fafafa`. Facilio blue `#1570EF` is the accent: links, focus ring (2 px, 60 percent), selection tints (`#eaf2ff`). Navy `#1D1A5E` and pink `#E5197F` stay brand accents only. No violet or purple, no neon.
- Status only for status: danger `#b10e1c`, success `#107c10`, warning `#bc4b09`.
- Sidebar groups carry an accent through `--cs-accent`: project blue, discover teal, design and build deep blue, launch green, customer-facing pink, admin grey.
- Radius: controls 10 (small 8), cards 16, pop-ups 20, tags 6. Shadows are tiny (`--cs-sh4` to `--cs-sh64`).
- Type: Geist (`public/fonts/Geist-Variable.woff2`, SIL OFL), weights 400/500/600, 14/20 body, headings tight (-0.01 to -0.025em). Title page 28, section 20, card 16.
- Motion: 150 ms ease `cubic-bezier(.4,0,.2,1)`, a quiet pulse for loading, nothing at all when the person asks for reduced motion.

## Components
Button 32 px (small 28), weight 500; secondary white with a hairline and a tiny shadow, primary near-black with an inner top highlight, ghost and danger variants. Fields 32 px, hairline, a soft blue ring when focused. Cards white with a hairline and a 16 px corner. Tabs are a segmented control: a soft grey track, the selected tab is raised and white. Tables: quiet header (muted, 12/500), hairline rows. Settings pages: the section name and a short description on the left, the form card on the right, buttons in a footer bar (`stSec` in `src/settings.js`). Page header: white bar with a short accent line above the title. Dark surfaces (sign-in art, the home banner) use translucent hairline buttons and a white main button.

## Keep as designed
The night-city picture on the home banner, the sign-in scene art, the intro and Discover more.
