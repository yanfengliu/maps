# Contact290 integration preflight

2026-09-28. Read-only inspection; the sole write is this report. No source, assets, frozen inputs, builds, gates or capture resources changed. No persistent process launched. Base for the next assignment: clean primary main `5c1a4a772cd57cb4abda14e1c227db530553d05b`. Pedestrian-render remains at `3c5cf283f266576ae1b5324401756a283c1a9c58` with its existing uncommitted candidate. Root must select the isolated integration workspace before implementation.

Root's fresh289 update accepts only the bounded contact snapshots: slight sole-local benefit, no material new artifact. They show the end-of-path turn, speed about 0.010 then zero and fixed travel about 5.0525 m. Stop contact tuning. The next acceptance must show actual translating segments, not another isolated contact comparison.

## Exact source contract

Integrate 23 files: source264's 21-file set (16 production, five tests), replacing its draw with the corrected279 draw and adding the helper/test below. These four tracked files have no intervening changes on main: `src/app.ts`, `src/main.ts`, `src/harness/bridge.ts`, `test/harness-bridge.test.ts`. The remaining 19 paths are additions. No package, dependency, world frame, receiver geometry, startup default or controller semantics change is required.

| Group | Exact paths, relative to repository root |
| --- | --- |
| Entry/lifecycle | `src/app.ts`; `src/main.ts`; `src/harness/bridge.ts` |
| Opt-in actor | `src/agents/local-walk-options.ts`; `src/agents/local-walk-prototype.ts` |
| Existing gait/support | `src/agents/population/local-walk-gait.ts`; `src/agents/population/local-walk-support.ts`; `src/agents/population/local-ordered/controller.d.mts`; `src/agents/population/local-ordered/controller.mjs`; `src/agents/population/local-ordered/solve-leg.mjs` |
| Existing differential renderer | `src/agents/render/local-differential/data.ts`; `src/agents/render/local-differential/entry.ts`; `src/agents/render/local-differential/gpu.ts`; `src/agents/render/local-walk-material.ts`; `src/agents/render/local-walk-rig.ts` |
| Corrected contact renderer | `src/agents/render/local-walk-draw.ts`; `src/agents/render/local-walk-contact.ts` |
| Tests | `test/harness-bridge.test.ts`; `test/local-walk-gait.test.ts`; `test/local-walk-native.test.ts`; `test/app-local-walk-lifecycle.test.ts`; `test/local-walk-assets.test.ts`; `test/local-walk-contact.test.ts` |

Source authority is pedestrian-render `artifacts/native-assets264-20260928/freeze.json`, SHA-256 `0764be7b2334c81d9cfa79c3f28c550f02c69e2c29b088502bc33e24a2f71877`. All 20 unaffected live source files still match. Use `artifacts/contact279-depth-20260928/candidate/` for the three successor snapshots, checked unchanged here:

| Successor | SHA-256 |
| --- | --- |
| local-walk-draw.ts | `87fcc0fe13ae30c940a58de72c842472b1afad2717dba0cd56f6b40401308ed3` |
| local-walk-contact.ts | `9c0c1ee57ac7ef76342244fbc8f080f9cc611e72f26942b61a6bfd6bf689c590` |
| local-walk-contact.test.ts | `0c0daacb2c2bbeb3e1db8b8176e40d6971281fc460aa2db18198f265a26d5eac` |

Keep the accepted query/Start contract: explicit prepared binding, `?local-walk=1`, seed 5970698, zero generic actors, time held at zero until the actual Start button, readiness admission, same source controller and route. Preserve app's `!localWalker?.moving()` stillness predicate, style propagation, owned disposal and observation-only bridge.

## Assets and the actual binding dependency

The five-file packet exists at `C:/Users/38909/.codex/worktrees/pedestrian-render/maps/artifacts/pedestrian-native253-20260928/packet/`: `manifest.json`, `context.json`, `rig-near.json`, `rig-medium.json`, `rig-far.json`; total 9,437,526 bytes. All five match their retained pins. Manifest SHA-256 is `a41f57b8eba8840ffecb5e3faf87a5cec0997ddf0fa320200820f3223405e36e`.

Ten directly required scene/model inputs in primary `C:/Users/38909/Documents/github/maps/data/` were checked present and matching packet pins: `scene/buildings/tileset.json`, `scene/buildings/data/data518.b3dm`, `scene/decorations.json`, `scene/control-hardware.json`, `network/network.json`, `scene/pavements.mesh`, `scene/agents/commuter-female.json`, and its near/medium/far GLBs. All LOD GLBs are loaded up front. The source-provenance VAT `.f16` records are not separately fetched by this actor runtime. Existing scene, rail and Draco serving remains required by the surrounding app.

All 160 non-build runtime descriptors in `artifacts/contact279-depth-20260928/builds/freeze.json` still exist with recorded lengths; this was an availability check, not a repeat qualification or complete rehash. Freeze SHA-256 remains `c7a7ee7cb7d812deeea0f8e8580f65851b7a678516cbfb5ad3bef76ed49cca8f`. Pedestrian-render data/node_modules are read-only-use junctions to primary; do not run data generation or dependency installation through them.

Ordinary main `vite.config.ts` provides no `__MAPS_LOCAL_WALK__` or `/local-walk/` server, so copying the 23 source files alone does not make an ordinary Vite build accept the opt-in URL. The accepted explicit preparation already supplies a finite five-file whitelist, checks packet hashes and defines `{url:'/local-walk/manifest.json',sha256:<above>}`. Its retained entry is primary `artifacts/pedestrian-native253-20260928/private-config.mjs`; it hardcodes pedestrian-render as root. A future task-owned config must bind the new integration root/dist/cache while reading the same frozen packet, leaving existing configs untouched. No portable asset installer is intrinsically needed for this private integrated candidate.

A separate concrete test prerequisite remains: `test/local-walk-assets.test.ts` reads `artifacts/pedestrian-native253-20260928/packet` relative to its working directory. That directory is absent in primary and would need explicit retained-cache placement/access in a new workspace before the full unit gate. Preserve the exact bytes and restoration failure behavior; do not drop or skip the test. Nothing was copied here. Generalizing ordinary Vite startup or building the rejected installer is outside this contract.

## Main compatibility and final checks

Since the actor base, main product changes affect only `src/render/post.ts` and `src/scene/surface-materials.ts`, with their tests; no actor source overlap exists. Preserve current post SHA-256 `926073d14f47cf78e37ca814bf96a56e2e9e606f292b1ef251b2c9421afceb35` and surface-materials SHA-256 `f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6`. The paving commit changes fragment treatment/uniform values/cache key, not geometry or receiver depth. Corrected helper(-2,-5) still precedes the real sidewalk(-2,-4); integrated contact tests compare the actual receiver. Private284 A/B both used old paving, so their appearance verdict does not transfer to the combination.

After a new root implementation assignment: verify the 23-file import and retained asset binding; run the five required Node24 gates once on the final candidate, with owned caches/temporary directories and exclusive GPU/preview admission. Existing physical/rig/VAT/source qualifications remain reusable; do not rerun them. The stock visual gate is unpopulated and cannot accept the new walk by itself.

The additional bounded native check must use real Start and controls, document pre-Start zero-time hold, then show increasing root position/travel on the supported translating segments in both styles. Include an actual medium LOD view (camera distance 18–60 m), a deliberate city-geometry occlusion with clean disappearance/reappearance, a real style-dropdown change preserving actor progress, and visible contact against current paving. Use short 30fps clips and sparse native PNG witnesses with stated sample gaps/digests; do not accept turn-in-place stills as walking. Read the bridge only; never set camera or actor state. Retain refusal status, served-input/build identity and cleanup evidence. Required static appearance coverage remains separate.

Independent exact-revision source/visual review and main integration follow accepted final checks. Public push remains blocked. Automatic review previously rejected 266 default/autostart/controller-default/portable-installer work and owner approval remains unanswered; none is proposed, retried or bypassed here.
