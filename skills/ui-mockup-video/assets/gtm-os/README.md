# Portable GTM video workspace

This directory carries the reusable production tools. The original `Movies/gtm-os` archive is a reference library, not a dependency and not bundled here.

## Start a deliverable

```sh
python3 tools/init-project.py /absolute/path/to/my-launch
cd /absolute/path/to/my-launch/05_Code
npm ci
npm run typecheck
npm run studio
```

The initializer creates the editor folder structure, copies the starter into `05_Code`, and puts editable brief, timeline, media, and provenance templates in `06_Editor_Notes`. It refuses to overwrite an existing destination. Render commands write to `05_Code/out`; copy accepted exports into `01_Final_Video` after verification.

## Starter compositions

| ID | Length | Example |
| --- | --- | --- |
| `Launch` | 720 frames / 24 s | Problem, UI proof, architecture, CTA |
| `UiMockup` | 360 frames / 12 s | Request → draft → approval → saved result |
| `DiagramLoop` | 240 frames / 8 s | Complete diagram with aligned buses and path-following traffic |
| `SlackThread` | 930 frames / 31 s | Channel → thread → review → approval → saved Page → replies |
| `OpenMuseLaunch` | 1080 frames / 36 s | Protocol → inbox → research → goal → artifact → devices |
| `OpenDotsLaunch` | 960 frames / 32 s | Conversation → approval → Page → routing → developer sketch |

Edit `src/theme.ts` for visual tokens, `src/UiMockup.tsx` for UI content and event timing, `src/Diagram.tsx` for topology, and `src/Root.tsx` for story/timeline. For product launch scenes, edit `src/product-stories.ts` (content/schedule) and `src/ProductLaunch.tsx` (shared layouts). For Slack, edit `src/slack-story.ts` (events/content/targets) and `src/SlackThread.tsx` (desktop/thread/scroll) and `src/SlackUi.tsx` (native UI primitives). `compositions.json` supplies the IDs, dimensions, fps, durations and review frames used by Studio and the export wrapper. Keep story lengths and registry duration synchronized. `remotion.config.ts` sets CLI/Studio defaults.

All compositions share a 1920×1080 design canvas. `render:4k` rerenders at scale 2; it is not a transcode of the 1080p export. Fonts are bundled through a pinned Fontsource dependency. Rendering needs no app account or API key.

```sh
cd remotion-starter
npm ci
npm run typecheck
npm run render:launch   # out/launch-1080p.mp4
npm run render:ui       # out/ui-mockup-1080p.mp4
npm run render:loop     # out/diagram-loop-1080p.mp4
npm run render:slack    # out/slack-thread-1080p.mp4
npm run render:slack:4k # out/slack-thread-4k.mp4
npm run render:slack:prores # out/slack-thread-4k-prores.mov
npm run render:openmuse # out/openmuse-launch-1080p.mp4
npm run render:opendots # out/opendots-launch-1080p.mp4
npm run review -- SlackThread OpenMuseLaunch OpenDotsLaunch
npm run render:4k       # out/launch-4k.mp4
npm run render:prores   # out/launch-4k-prores.mov
npm run poster         # out/poster.png
```

Each render writes a temporary file, checks its dimensions/frame rate/duration, fully decodes it with FFmpeg, and then promotes it. Existing final names are protected; move/archive the previous file or choose another output name with `node render.mjs Launch out/new-name.mp4 2`.

Review stills go into a unique ignored `review/` directory. Inspect them rather than treating the successful command as a visual check. Slack uses `clean: true` by default: it fills the frame and has no disclosure overlay. Its synthetic representation is documented in the handoff notes. Set `clean: false` in Studio input props for a branded wrapper. For a CLI wrapper cut, pass `--props='{"clean":false}'` to `npx remotion render src/index.ts SlackThread out/slack-branded.mp4`; verify that direct CLI output with `tools/media-report.py --decode`.

The product templates carry visible illustration captions. Their CTA lines are editable placeholders. The fictional app and data are explicitly labeled. The example includes no third-party logos, real recordings, soundtrack, or unverified product claims. It illustrates the workflow; the skill adapts it to the user's actual product. Remotion has its [own license](https://www.remotion.dev/license).

## Record actual UI

Install Playwright's browser once from `remotion-starter` (or the copied `05_Code`): `npx playwright install chromium`.

The capture helper takes an explicit URL and action plan. Review the plan first: clicking a control may submit data to the app. A preflight opens the page and captures a screenshot without executing the actions.

```sh
node tools/capture.mjs --url http://localhost:3000 \
  --plan templates/capture-plan.json --out /tmp/demo-preflight \
  --zoom 1.5 --preflight
```

Inspect `preflight.png`; replace selectors in your copy of the plan with actual app controls. Then run with a new output directory and omit `--preflight`. Optional `--width 3840 --height 2160` sets capture pixels, but you must also size the UI for readability at that viewport. `--runtime /path/to/project/05_Code` resolves Playwright from a copied project instead of the bundled starter.

The helper's zoom is **CSS layout zoom applied before capture**, not native browser zoom and not a crop of the output. It can affect portals and fixed-position UI, so inspect it before recording. It uses a fresh browser context and does not load your normal profile. It records no audio. A browser-based recording is variable in execution timing; the composition, by contrast, is frame-deterministic.

## Verify media

```sh
python3 tools/media-report.py --decode /path/to/final.mp4 > /path/to/media-report.json
```

The report includes raster dimensions, codecs, container FPS, frame count where available, duration, and full-decode status. Acquisition cadence cannot always be inferred from a container; record it separately. A low-frame-rate source in a 30 fps container is still a low-frame-rate source.

See the skill references for audio, visual review, real footage versus mockups, and editor delivery. Official runtime references: [Remotion rendering](https://www.remotion.dev/docs/render), [CLI flags](https://www.remotion.dev/docs/cli/render), and [Playwright video recording](https://playwright.dev/docs/videos).
