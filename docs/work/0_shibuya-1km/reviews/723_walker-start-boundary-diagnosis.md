# 723 — Walker Start boundary diagnosis

Actual sealed720 retry, root session57981 at975b224d005e4820726557fc1a059f0b40f74f95, remains RED. Build completed in13.97s; native ran2026-10-11T22:11:31.239Z–22:12:29.524Z. One1280×720 pre-start original shows a recognizable standing actor. No walking sequence or post-start original exists.

The exact failure is `assertWalker`'s `assert.equal(o.post.taaSampleLevel,1)` at `native.mjs:99:959`, called immediately after Start at103:959. It is neither an actor-count failure nor a support/gait rejection. The retained before/after input observations are:

| State | Completed frame count | Started / startFrame | Tick / sampled seconds | TAA level / accumulating / samples |
| --- | ---: | --- | --- | --- |
| Before Start | 885 | false / null | 0 / 0 | 0 / true / 32 |
| After Start | 888 | true / 888 | 0 / 0 | 0 / true / 32 |

Actor identity, root pose/travel and contact measures are equal; refusal is null and visible-scene readiness true. The button accepted Start. No completed render after that click is represented by the failure snapshot: its frame count equals `startFrame`.

Actual pinned PRIMARY source explains the boundary. The click handler sets `started`, `startFrame` and button state; it does not render or update TAA. `moving()` becomes true without refusal. The app's next frame callback calls `post.setStill`; `post.render` selects sample level1 and disables accumulation. `RenderLoop.advance` runs fixed callbacks, frame callbacks, then `this.render()`, and only afterward publishes `frameCount += 1`. Thus the private assertion demands next-render state from a synchronous input state. This is an instrument timing error; application freezing or successful walking is not established.

The finite CPU control executes only the exact frozen `assertWalker` against unmodified retained before/after states: before passes; after rejects0 against1. It executes no application replay. An initial source guard rejected the unbound FRONTAGE raw copy; the corrected control reads all four actual PRIMARY paths named by the run, whose byte pins match. That refusal is preserved.

Fifteen exact retry files are preserved separately from the original709 pre-browser failure. All seven native cleanup flags are true; available owner census has no admitted/omitted/descendant/uncertain/marker/4344 remnants, TEMP was removed and native inputs remain unchanged. No repair, third dispatch, product/Git/progress change or runtime was performed by723.

Minimum next action is a reviewed private timing correction: retain the immediate Start observation as input evidence, then require a bounded same-document completed render with `frameCount > startFrame` before the unchanged TAA1/false/0 assertion. Retain actor/contact checks. Future controls must reject stale frames, later wrong TAA and refusal; event guards must still reject nonmovement. A fresh render alone cannot qualify gait/support. Root reassesses before any third attempt; facade715 qualification can proceed independently.

| Exact inspected input/evidence | Bytes | SHA-256 |
| --- | ---: | --- |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/native-inspection.json` | 977991 | `1469b7082af3fc250d28fda93bce58ce24633e3551ec1cf48af75bb666337c12` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/run.log` | 2349 | `8fb601af12394d183b7ea8cb80f7bd3d4265a1a3b743c341bc14ad17b79b4114` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/run-errors.log` | 510 | `15c0eec7803fd4cc7cbd068b17ba2e5c2ff3f83213fba6f81150cb2861336dce` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/process-cleanup.json` | 5246 | `d17763c5b1de58fd6ccc1fe9d44754b0c32bed7ab2629cae6b7c66df1b9ae228` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/process-closure-census.json` | 3544 | `d9237785a03c9f7f2db4e9613f5042157401c63ce785e62ad5cbc53e43d9428d` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/native.mjs` | 38597 | `aaf8c16e405dab79a75309f3a5dd566746900f8cdd72bf66c618674e7d622426` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/originals/baseline/pre-start.png` | 1295864 | `1f78ab3ad92d426fa74b01e2118df28f373e22f9a9babe9f47dd5cc5c72a1e49` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/cpu-control.json` | 2268 | `2fb337cfc858b8659976fe48e4e64c634b6e27b72548eeb55cbbecda5be1129d` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/start-boundary.json` | 4768 | `eafdb06f124be09a7cb2e9bdb2acd61b3f5bf710c50435240a807620d67eae11` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/preservation.json` | 9912 | `df3e04d1ec0b59d60a54bfe0da33c9ef67ed6a63b41ddb59a516e928294f7ae2` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/retained-control-corrected.mjs` | 6489 | `0da388dafd8d062cd767a0adca9ae0abd4cca38a67bb4e1849bbc26172adf49e` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/retained-control.mjs` | 6465 | `f5ec845b81ea58a8e40562401f27dc97a08ff508cc0abc0d939ffe7a173d4001` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/first-control-refusal.json` | 459 | `edeb0b8555e1fde32278009607947723fbfc515d7447ff2c28224438bc86a598` |
| `C:\Users\38909\Documents\github\maps\src\agents\local-walk-prototype.ts` | 7993 | `5ac97393e1fd0d913171e6454138b0b620687c9d479b9fea97c14152e56de7b1` |
| `C:\Users\38909\Documents\github\maps\src\app.ts` | 21715 | `08868340833371b695af0f3c6349b9e6ec9106bbda59f4a27de1ee43293d06cb` |
| `C:\Users\38909\Documents\github\maps\src\render\post.ts` | 15018 | `6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9` |
| `C:\Users\38909\Documents\github\maps\src\render\loop.ts` | 6510 | `8750fd5349bb0862e15825a94634226cc3a702a3549eb4f9d2a446ae3d10820a` |
