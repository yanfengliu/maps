# Independent startup review

Reviewer: independent read-only startup reviewer. Date: 2026-10-20. Base: `7c6097e18efd712d741f66772588ee5acc3a3741`. Reviewed the integrated working files under `artifacts/dev-startup/worktree`, including the new Vite configuration and regression test. The recoverable code revision is `a012c041690472ffcf3de7b44595ac82af831504`; after its creation, I verified no code delta from that revision and rechecked all five changed-file hashes below. Only this authored report was written by the reviewer.

**GO. No material finding in the reviewed changes.** Acceptance applies to the code bytes below. Final primary-checkout cold-start verification, cleanup and integration remain the owner's gates; this review does not claim a universal startup time or controlled remote-service benchmark.

## Source review

- `vite.config.mjs:9` restricts dependency discovery to the current app's `index.html`. The pinned Vite implementation otherwise falls back to `**/*.html`, so the change directly removes archived HTML from the scan without suppressing dependencies imported by the app. `test/dev-startup.test.mjs:8` exercises that actual optimizer: its control must reject the unavailable archived dependency, then the configured case must optimize the real MapLibre dependency successfully.
- `vite.config.mjs:10` anchors watcher exclusions to this configuration's directory, normalizes Windows separators, and excludes only its retained `artifacts/` and root `data/` trees. Vite appends these exclusions to its existing watcher ignores. `public/data/` stays outside them, and a checkout whose own ancestors include `artifacts/` is not excluded by a broad ancestor glob. The second test checks configuration shape; actual watcher behavior remains the owner's runtime check.
- `src/main.ts:398` sets persistent padding and fits the overview before `setStyle`. Inspected pinned MapLibre construction, camera and transform code: a styleless map still creates its canvas and sizes/constrains the Mercator camera; `getLayer` tolerates an absent style. The existing absolute-padding fit remains compatible with the configured maximum bounds. The removed load-time fit no longer overrides a destination chosen while the regional source is pending.
- Read outside the changed hunks: `panelPadding`, `overview`, `goTo`, mobile compact-state handling, search/building selection, campus fetch/layer attachment, readiness/error accounting, `reloadRegionalMap`, style reload events and cleanup. Retry still recreates the regional style with `diff: false`; loaded campus data is attached again by `style.load`. The first-load handler now adds layers/pins without resetting the camera.
- Read `src/style.ts`, `src/places.ts`, the complete interface stylesheet, app entry, package scripts, local rules, plan, lessons and previous review conclusions. Regional map/glyph URLs are unchanged, the native interface font removes the Google Fonts CSS dependency, and the preconnect matches the map service origin. No data or dependency changes are introduced.

## Inspected verification evidence

The owner supplied `artifacts/dev-startup/fixed.json` and its executed assertions in `fixed-cli.log`. I read these and the comparison `baseline.json`, and inspected all four `fixed-*.png` captures at their native 1440×960 or 390×844 sizes.

- The first observed fixed camera is already the overview: desktop center `[-122.18, 37.64130299719848]`, zoom `9.010226514308767`; mobile has the same center and zoom `7.759404181314263`. These match the accepted framing. Initial tile-zoom assertions pass at desktop z9/mobile z7, and the captures show recognizable coastline, compact mobile controls and readable interface text.
- Recorded first readiness is approximately 845 ms desktop and 317 ms mobile. The baseline comparison first fetches its temporary z9 view; on mobile it then requests z7. Remote request duration differs between runs, so these observations support removal of unnecessary startup work without establishing a repeatable speedup percentage.
- Actual Stanford controls show 648 loaded footprints and 475/131 rendered buildings in the desktop/mobile views. Both overview-return camera assertions pass. With regional TileJSON held, an early Stanford click has the same settled camera before and after first load. Hoover Tower search opens its details and selects `way/1346548889`. Aborting TileJSON produces an alert; restoring it and clicking Retry passes the readiness wait and clears errors.
- The request arrays were retained by reference and also contain later navigation requests. The initial tile-zoom assertion executes before those controls, so the whole stored array must not be described as startup-only traffic.

The owner reports passing build, typecheck, all 15 tests and audit with zero vulnerabilities. I did not rerun those gates or start a browser/server. The reported wrapper exit-code mistake is outside product code: the recorded browser result is the normal seven-case success array, and the executed failure path would instead return an object with `failed`. No independent physical-device, Safari, repeated network-performance or exhaustive gesture verification is claimed.

## Reviewed code identity

SHA-256 values are for exact working-file bytes before integration. The first five files are the complete executable/test change; the remaining files identify relevant unchanged context.

| File | SHA-256 |
| --- | --- |
| `index.html` | `2d9444ff7a0b5eed35bd8ba7b4a96d3444105ba7f2a9feb74e86cd337a3d2594` |
| `src/main.ts` | `3d9b2166d00fe169ad5f2d6aab53592de16fa05571193ae55dba87a4478d41eb` |
| `src/styles.css` | `0413f4dc9e887e2ec0db9c3945918e59e33ea0e45d47fad6da9f2466f6328ab6` |
| `vite.config.mjs` | `330874a6d1b03eadc289ec98b6a80b75b20d25389ff37fb7778fe916f4d3ceac` |
| `test/dev-startup.test.mjs` | `c4ef35377ddcbfce90bde07a361ff990a135fb7c364229ff769302f28513fdd9` |
| `src/style.ts` | `c428bc104f6395f7ad037e3f0ac2380bc6c310343613257fc774f88cf637a436` |
| `src/places.ts` | `3a1da4f7fffd294e4a7e6f5d17f2cd40049ef654b0a866f91574ddd957f091ba` |
| `package.json` | `d16cc3c929cb89bcdc61e25d66d4053bf687fd7a18cedaff9f848864fd37def0` |
| `package-lock.json` | `85c4247a20af2d50d29a35c12f125dfbd8918c646bd968cce10282dfbd9257b0` |

## Inspected evidence identity

Paths are relative to ignored `artifacts/dev-startup/`; screenshots are under `output/playwright/`.

| Evidence | SHA-256 |
| --- | --- |
| `fixed.json` | `693c34c4cca9f74065abe89f752c3ad61b37fe442e257ab63bd260ab861f7cb4` |
| `baseline.json` | `8cd0709f6a4c5bd76e0ddb6478a85385590589273db0e5778e7801aff5c15eeb` |
| `fixed-desktop-cold.png` | `1de36ff54b5ad91ffb7517bfa5a56d92f8b776e29c719ca2f3bef2db57448192` |
| `fixed-desktop-cold-stanford.png` | `44cf1eea52aa2a6d2a713d7f0e86e2e9f5b762286d18314ba476735792e74e07` |
| `fixed-mobile.png` | `d084eeee18949e8167345018f6aae0e030687efabdef27943327feb6357b2a37` |
| `fixed-mobile-stanford.png` | `fe191cfd69beb9ebc03f312f1de26654863e0ab8a607b500502387a116948954` |
