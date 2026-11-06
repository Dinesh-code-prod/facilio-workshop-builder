# Fluent 2 in Delivery Studio (dictionary, 7 Nov 2026)

Source: https://fluent2.microsoft.design/ (Typography, Color, Layout, Shapes, Elevation, Motion). Code: `src/fluent.css`, the last style layer. Roadmap E19.

## Type (Segoe UI first, then the system font)
| Role | Weight | Size / line | Used for |
|---|---|---|---|
| Caption 1 | Regular / Semibold | 12 / 16 | notes, tags, table headers, small buttons |
| Body 1 | Regular / Semibold | 14 / 20 | everything by default, buttons, labels |
| Subtitle 2 | Semibold | 16 / 22 | card titles (h3) |
| Subtitle 1 | Semibold | 20 / 26 | section titles (h2) |
| Title 3 / 2 / 1 | Semibold | 24/32, 28/36, 32/40 | page titles use Title 2 (h1) |

Sentence case; no all caps; no negative tracking. Text contrast at least 4.5:1 (3:1 for large text).

## Colour
- Neutrals: text `#242424` (fg1), `#424242`, `#616161`, `#707070`; surfaces `#fff`, `#fafafa` (page), `#f5f5f5`, `#f0f0f0`, `#ebebeb`; strokes `#d1d1d1`, `#e0e0e0`, `#f0f0f0`.
- Brand accents (Facilio): blue `#1570EF` (hover `#115cc0`, pressed `#0e4a9a`, tint `#eaf2ff`), navy `#1D1A5E`, pink `#E5197F`, sky `#8DB8FF`.
- Semantic, only for real status: danger `#b10e1c`, success `#107c10`, warning `#bc4b09`.
- Interaction: rest lightest, hover darker, pressed darkest; focus does not change colour, it adds a 2 px stroke (navy).

## Space, shape, depth, motion
- Spacing in 4 px steps (2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48). Touch targets 44 px on mobile.
- Radius: 2 small badges, 4 controls (buttons, fields, tags), 8 cards and tiles, 12 popovers and sheets, circle only for people.
- Shadows (key + ambient): 4 cards, 8 raised or hover, 16 callouts, 28 side panels, 64 dialogs. Tokens `--fl-sh4` to `--fl-sh64`.
- Strokes: 1 px thin, 2 px thick (focus).
- Motion: 100 ms (small), 200 ms (panels), ease-out `cubic-bezier(.33,0,.1,1)`, ease `cubic-bezier(.33,0,.67,1)`; a quick fade for page changes; nothing at all when the person asks for reduced motion.

## Components (how they look here)
Button 32 px (small 24 px), radius 4, Body 1 semibold; primary = Facilio blue; secondary = white with a 1 px stroke; subtle/ghost = no stroke; link = blue text. Field 32 px, 1 px stroke with a darker bottom edge, the bottom edge turns brand blue on focus. Card white, 1 px stroke, radius 8, shadow 4. Table header Caption 1 semibold on `#fafafa`, 1 px row lines, grey hover. Page header flat white with a 1 px stroke under it.

## Not covered yet
Intro, login scene, Discover more and the tour player keep their own art until the animations pass. Old rules still sit underneath `fluent.css`; `node tests/ui/css-legacy-audit.mjs` lists what is left (gradients, big radii, uppercase, violet).
