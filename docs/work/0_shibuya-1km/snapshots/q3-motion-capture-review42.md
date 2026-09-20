# Q3 adjacent-frame capture component — 2026-09-19

Status: implemented in `codex/motion-capture` from `27c71865bef31a7c9dcc622db16e6721be839dc3`; independent review, primary integration and five gates are still owed. The moving-scene flicker criterion is **not established**. No renderer, scene data, agent code, dependency or threshold changed.

## Instrument and contract

The first probe used the shipped `npm run visual:flicker` instrument. Its old judge divided the unexplained-feature fraction by frame gap and compared that rate against a bound multiplied by frame gap. At gaps 15, 22 and 100, the collapsed-detail positive control stopped failing. It also accepted missing rendered frames and multi-frame screenshot shutters. Five new controls went red on the unchanged judge; `artifacts/motion-evidence/old-red.log` preserves them.

The capture now makes twelve native canvas copies inside successive RAF callbacks and encodes PNG only after the burst. The app schedules its own next RAF before rendering; the observer registers after it and re-registers after its copy. Before/after bridge observations share the synchronous copy task. Integer frame counts must agree within each copy and advance by exactly one between copies. The camera and post state must agree within the task, remain finite, and show an active, non-accumulating post chain. Decoded PNG dimensions and texture variation reject blank or resized buffers. No application state or render function is written or called.

The bound stays 0.005 and now applies directly to the unexplained-pixel fraction. `crawl` remains a diagnostic rate only. The denominator counts only pixels with complete 3x3 neighbourhoods in both shifted images; `comparedFeaturePixels` and `excludedFeaturePixels` expose that support. Excluded border centres are not certified. A best shift reaching either the ±24 px radius or the local refinement window is refused. That local window is 23 px at 1280x720 and 4 px at 192x108, not the old comments' 41 and 7.

`FlickerReport` now declares `motionModel: integer-rigid-translation` and `sceneVerdict: not-established`. The manifest separately records `captureValid` and `captureFailures`. `npm run visual:flicker` exits nonzero for invalid capture or a residual above the provisional bound; zero would mean only valid capture and residual within that finite bound, never general scene acceptance. No final certificate is produced. Captures contain the WebGL canvas, without DOM controls or attribution.

## Actual input and observed captures

The first attempt copied adjacent nonblank frames from a non-preserved WebGL buffer, but a released drag came to rest and re-engaged TAA before the burst ended. It also completed the wheel zoom before the first copied frame. The second sustained the pointer through the burst but held the mouse button during wheel events. The installed OrbitControls explicitly returns from its wheel handler when its pointer state is not NONE (`node_modules/three/examples/jsm/controls/OrbitControls.js:1666`). The third used real Playwright `mouse.up`, `mouse.wheel`, `mouse.down` and resumed pointer movement. No DOM event dispatch or camera setter was used.

The third attempt recorded orbit frames 336–347 and ascent frames 604–615, all 24 at 1280x720, nonblank and with exact same-task observation binding. Every pair moved and all 24 post observations were non-accumulating. `preserveDrawingBuffer` was false. Orbit used twelve pointer commands; ten were acknowledged inside the copied interval. Ascent used six pointer and three wheel commands; five pointer and two wheel acknowledgements fell inside the copied interval. Its camera distance increased from 44.99999965195472 to 45.27783763584499 m. The intervals spanned 184.5 and 185.0 ms. Recorded copy calls cost 0–0.2 ms at the browser clock's resolution; PNG encoding after the bursts cost 242.6 and 238.8 ms. These are instrument timings, not isolated GPU performance measurements; deferred graphics work can be paid later. Twelve RGBA snapshots reserve about 44.2 MB before encoding and browser overhead.

All 22 pairs exceeded the unchanged provisional bound: orbit 0.0055830–0.0139712 and ascent 0.0053302–0.0121643. The command exited 1. Their common-neighbourhood denominators were 916,886 or 917,604 of 921,600 pixels, excluding 4,714 or 3,996 border centres. This is unresolved motion-model error, not a demonstrated renderer defect.

The first attempt also recorded a roughly 0.062 m rest-tail camera step. This is an unreviewed adjacent-path observation, preserved in probe1; no runtime correction or claim that it is a defect is made here.

## Calibration and remaining decision

The deterministic calibration uses one unchanged seeded 320x220 field, bilinear sampling to 192x108, eight frames and seven pairs. Exact integer translation scores zero. Legitimate fractional translation scores 0.07219–0.13798, 0.002 rad/frame rotation 0.02582–0.03749, and two depth layers 0.08406–0.18203. All 21 legitimate non-integer pairs exceed 0.005. The existing collapsed-detail positive still fails at gaps 1, 2, 15, 22 and 100. The classifier is finite and non-vacuous, but these negative controls establish that it cannot attribute a moving 3D scene's residual to flicker.

The next independent comparison is between subpixel/local motion registration with held-out legitimate-motion and defect controls, and independently predicted reprojection from read-only scene/depth observations. Neither is implemented here. A threshold increase to fit these frames would not repair the model.

## Verification and evidence

Focused checks passed 37/37 across six files; typecheck and the isolated build passed. All five integration gates and independent review remain owed. Removing the wheel release makes the input contract fail by name: `OrbitControls ignores wheels while dragging: expected true to be false`. The mutation was restored in a finally path. The old judge's five failures and the wheel mutation log are retained under the ignored evidence root.

The headless runner retained exact process handles and executable/creation identities, then checked cleanup. Each of three probes left zero matching live owned identities and zero listeners on port 4324. No shared browser was stopped. Probe1 and probe2 remain rejected evidence. Probe3's final validator replay decoded and hashed all 24 files and passed their final capture validators. Final guard extraction and the explicit unresolved-verdict fields were added after the real probe; those additions were unit-checked and replayed against its immutable captures, not misreported as another browser run.

Raw evidence is `artifacts/motion-capture/artifacts/motion-evidence/` in the primary checkout: `probe1`, `probe2`, `probe3`, `validated-probe3.json`, `focused.log`, `typecheck.log`, `build.log`, `old-red.log`, `wheel-drag-red.log` and per-probe cleanup inventories. Retain it while Q3 remains unresolved and before removing this worktree move the evidence to a durable primary ignored path, preserving hashes.

## Native image inspection

The author opened every probe3 PNG individually at original 1280x720 resolution and verified all 24 SHA-256 values against their manifests. The frames show complete crossing paint, paving grid, facades, signage, foliage and dusk sky. They contain no blank region from capture failure, gross geometric jump or obvious one-frame corruption. Source facade blur and fine line sampling remain visible. This bounded still-image review cannot establish absence of temporal crawl or replace the failed model calibration. The table binds that inspection to each exact file.

- `manifest-ascent.json` SHA-256 `758b9b7895d30682647bdb7231708c38886df87baa6864b8c692a7ef2f3d061e`.
- `manifest-orbit.json` SHA-256 `e30a90d220fe31535d7cae19b3769e450517d2a98121c5bce10e16e7b559f81f`.

| Frame | Render count | SHA-256 | Native inspection |
| --- | ---: | --- | --- |
| `orbit-00.png` | 336 | `bb8be142a8c34e3b70c688b5d31d5b28065ce10560076eb94906b9c30f0ac5f0` | Complete scene; no gross still-image corruption. |
| `orbit-01.png` | 337 | `18a08ff40822884b5e3ebf0fa7fa2347275e9829b106100fa821d0ca055f98d2` | Complete scene; no gross still-image corruption. |
| `orbit-02.png` | 338 | `4f257d223b2be37533eb53b567861dfc8f5544589c3893331e87d9d2dcba6dbb` | Complete scene; no gross still-image corruption. |
| `orbit-03.png` | 339 | `cf38107c2a5a02ff6c118d3d4dd1659c026b037fad2e3129c44ad2efe02e19ed` | Complete scene; no gross still-image corruption. |
| `orbit-04.png` | 340 | `4a4c26a38eb67cb5881d998c5b005d6990705577d63dd9fb3f289f37be0e575f` | Complete scene; no gross still-image corruption. |
| `orbit-05.png` | 341 | `4086dadf11c8608e874837c2409a15a569105d4c39747b010dc44d9a7991a2c1` | Complete scene; no gross still-image corruption. |
| `orbit-06.png` | 342 | `d5df1fdebf66f23099cd95415645a967602bc84ccea5dee23c4826b0222747db` | Complete scene; no gross still-image corruption. |
| `orbit-07.png` | 343 | `f07e2569ec98d77cdff7bcbcdec66a0cbd6f7232d7961a5a756930206ca416aa` | Complete scene; no gross still-image corruption. |
| `orbit-08.png` | 344 | `cc0dd14cb34b6510108292cc9100095ae9c0ad36a3990a791ea134dac9c609f6` | Complete scene; no gross still-image corruption. |
| `orbit-09.png` | 345 | `c635320dfbbfc03a3e4cbe399c747cfc02501c9ba11a25548f82bc5a4080f7ad` | Complete scene; no gross still-image corruption. |
| `orbit-10.png` | 346 | `200eb50adf95a99834d78aac54eacddb2d5c4b11d7421cb7cb4485d3d59d8307` | Complete scene; no gross still-image corruption. |
| `orbit-11.png` | 347 | `c788980e39ba90fa77f888ed4967a0da801d99e4f00a1139bb1c6efd136507ad` | Complete scene; no gross still-image corruption. |
| `ascent-00.png` | 604 | `bb8be142a8c34e3b70c688b5d31d5b28065ce10560076eb94906b9c30f0ac5f0` | Complete scene; no gross still-image corruption. |
| `ascent-01.png` | 605 | `18a08ff40822884b5e3ebf0fa7fa2347275e9829b106100fa821d0ca055f98d2` | Complete scene; no gross still-image corruption. |
| `ascent-02.png` | 606 | `33a60f53af4f0e5f5c0ae9efea834c96fbc75c155847f433e9ff8438ce501ee0` | Complete scene; no gross still-image corruption. |
| `ascent-03.png` | 607 | `1f7680b5b8120e7c6d04065ff076802cf6c5a3d00c749850ea6cfd08e25c1343` | Complete scene; no gross still-image corruption. |
| `ascent-04.png` | 608 | `80b2f6074cbb6512ea6d39208d36af86a509854a5205dadf70ea63d7b291dbbe` | Complete scene; no gross still-image corruption. |
| `ascent-05.png` | 609 | `cfc7aa0b207ce3a9d9fc89c79d2357fdbff1c60b9f2394300912bc934abcd0ed` | Complete scene; no gross still-image corruption. |
| `ascent-06.png` | 610 | `1639e698cd8159388ff79064a5ba0bc9cb7bc158aaa44229b747976e9e96417b` | Complete scene; no gross still-image corruption. |
| `ascent-07.png` | 611 | `e16aa2ee710ba60c328f5e9d9aa2cb2d208204b85ddd30e817da4c90b1f787c3` | Complete scene; no gross still-image corruption. |
| `ascent-08.png` | 612 | `ecf86c0c8442f868f04700a8481afddb219d7901ac9bef6eb3253d7b6f3e1665` | Complete scene; no gross still-image corruption. |
| `ascent-09.png` | 613 | `df4fbf3c51a823e02fc26cc839329184f1ee09f34e7fd749323f50f0c02aa257` | Complete scene; no gross still-image corruption. |
| `ascent-10.png` | 614 | `6e03740e3073c4c316783a8c70c273940ef8c2e23d5614fc6b2b9e577312eb5b` | Complete scene; no gross still-image corruption. |
| `ascent-11.png` | 615 | `afef5498b464f2d64d5d367f446f6e77e8f6a7514bfa6e37cb86f5e5c406efe4` | Complete scene; no gross still-image corruption. |
