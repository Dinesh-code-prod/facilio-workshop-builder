# Intro performance report (Build 70)

Method: Playwright + Chromium 1 (headless, SOFTWARE rendering - no GPU) against a local build, `?intro=1`, CDP metrics. Firefox/WebKit are not installed in this environment, so they were NOT tested. Real-GPU smoothness is unverified.

| Case | Load | First paint | Anim visible | Anim length | Avg fps | p95 frame | Main-thread busy | CLS | Errors |
|---|---|---|---|---|---|---|---|---|---|
| Desktop 1440x900 | 0.35 s | 0.33 s | 0.54 s | 15.2 s | 22 | 100 ms | 94 % | 0.0016 | none |
| Laptop 1280x720 | 0.31 s | 0.30 s | 0.47 s | 15.3 s | 24 | 100 ms | 97 % | 0.0015 | none |
| Mobile 390x800 | 0.28 s | 0.26 s | 0.41 s | 15.2 s | 47 | 33 ms | 86 % | 0 | none |
| CPU x4 throttle | 1.0 s | 1.0 s | 2.0 s | 19.6 s | 4 | 467 ms | 97 % | 0.0025 | none |
| CPU x6 throttle, mobile | 1.4 s | 1.3 s | 2.9 s | 15.8 s | 6 | 333 ms | 97 % | 0 | none |
| Slow network (~7 s load) | 7.1 s | 6.5 s | 7.2 s | 14.9 s | 32 | 83 ms | 97 % | 0.0018 | none |
| Logo image blocked | 0.27 s | - | 0.47 s | 15.7 s | 24 | 100 ms | 96 % | 0.0016 | only the blocked image; intro still completes |
| Reduced motion | 0.35 s | 0.32 s | 0.46 s | 1.3 s (static) | - | - | 3 % | 0.045 | none |
| Repeat visit (intro already seen) | 0.18 s | - | no intro | - | 57 | 17 ms | - | 0.0014 | none |

Findings
- Cost is per-leaf canvas work (about 1,076 leaves, one transform + draw each). In software rendering that is ~45 ms per frame; a GPU-backed canvas does this far faster, but this was not measured.
- The intro never blocks the app: the login/workspace is already rendered underneath, Skip / Esc work at any time, and the overlay is removed at the end (`usableAfter: true` in every run).
- Heap stays 5-13 MB; no growth after the intro. Hidden tab: drawing pauses (`document.hidden`).
- Idle CPU after the intro (~13-15 %) is the sign-in page itself (also present with the intro disabled), not the overlay.

Optimisations applied
- Quality tiers: if frames take > 20 ms, the canvas steps down 1.5x > 1x > .75x > .55x and draws every 2nd/3rd/4th leaf (larger) until frames fit.
- Time-accurate playback (frame step capped at 200 ms) so slow devices drop frames instead of stretching the intro.
- Leaf-shatter transition uses one extra transparent canvas and one soft radial clear, not per-leaf clipping/blur.
- After the intro, the canvas is shrunk to 1x1 and the overlay removed; sway runs at 30 fps while idle.

Remaining issues
- At 4x CPU throttle in software rendering the intro still runs at ~4 fps. Test on real low-end hardware before enabling for customers; `?intro=classic` restores the old intro, and `?nointro` skips it.
- Reduced-motion path shows CLS 0.045 (sign-in entrance), below the 0.1 "good" threshold.
