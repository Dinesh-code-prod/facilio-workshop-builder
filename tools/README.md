# tools: scripts you run by hand

Helpers for people working on the project. None of them runs inside the app.

| Script | What it does |
|---|---|
| [build-impl-skills.mjs](build-impl-skills.mjs) | Rebuilds work/server/_skills.mjs (the catalog the connector's get_impl_skills tool serves) from the menu of a local clone of facilio-impl-ai-skills. |
| [build-reference.mjs](build-reference.mjs) | Development-time step: turn a Facilio org package (folder or ZIP contents) into the bundled reference configuration. |
| [changelog.mjs](changelog.mjs) | Writes CHANGELOG.md (the history at the top of the repository) from the app's What's new list in src/whatsnew.js. Run it after adding an entry there. |
| [css-prune.mjs](css-prune.mjs) | Removes old CSS rules for a page that has moved to UI. |
| [make-lottie.mjs](make-lottie.mjs) | Generates the small Lottie (Bodymovin JSON) animations used by the opening and roadmap introductions. |
| [make-motion.mjs](make-motion.mjs) | Six AI "moment" animations, each with its own composition and motion language (not one template). |
| [make-scenes.mjs](make-scenes.mjs) | Original Lottie illustrations (400x300) for the introduction, home page and admin pages. |
| [make-skyline.mjs](make-skyline.mjs) | Skyline: buildings rise out of the ground in a wave, dip and rise again (up and down), windows light in sequence |
| [palette-colors.mjs](palette-colors.mjs) | Recolours violet / lavender / magenta tinted colours in src/*.css to the neutral palette. |

Run one with `node tools/<name>` from the project folder. `npm run build:reference` runs `build-reference.mjs`.
