# Agent asset contracts and provenance

[Setup](setup.md) owns preparation and cache restoration. [The Shibuya plan](../work/0_shibuya-1km/plan.md) owns current acceptance: one ordinary held/startable local walker is integrated; generic crowd, vehicle behavior and 3,000/200 target performance remain open. Blender source renders and CPU contract checks do not establish those outcomes.

## Offline recipes and source licences

The human pipeline uses MPFB 2.0.17 at commit `80919fa4682335c41847f761a4d79dcad4124732` and the MakeHuman system asset pack. The retained provider provenance identifies the selected graphics as CC0; MPFB tool code is GPL-3.0-or-later and runs offline in Blender, outside the browser/repository. The source record is [MakeHuman licence](https://static.makehumancommunity.org/about/license.html), [system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) and [pinned MPFB](https://github.com/makehumancommunity/mpfb2/tree/80919fa4682335c41847f761a4d79dcad4124732), investigated in September 2026 rather than re-audited here.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| MPFB archive | 44,851,738 | `038e9f01ae3900ad11f24af887e184c0bfa20a00abe4411f750d09b21efaaadc` |
| MakeHuman system assets | 280,737,770 | `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107` |

`npm run data:agents` invokes `tools/agents/build.ts`: verified archives, isolated Blender user paths and a background/offline Blender 5.2 process. Select the executable with `MAPS_BLENDER_PATH`. `build-human.py` creates three source variants, `bake-human.py` supplies the authored gait over the 53-joint source rig, and generated files stay in ignored `data/scene/agents/`. This is a separate pipeline, omitted from `data:setup`; it is not needed to view an already restored scene.

`npm run data:vehicles` invokes the separate original Blender recipe `tools/agents/build-vehicles.py` for kei, taxi and bus in that stable class order. They are unbranded authored types, not downloaded replicas. The builder stages/verifies the fleet before publishing only its named files. Different source/recipe bytes require their own review rather than inheriting an old manifest's acceptance.

## Human runtime format

`src/world/agent-assets.ts` owns version 2. The runtime registry names commuter-male, office-male and commuter-female manifests. Each has near/medium/far GLBs and position/normal VAT buffers, all animated. Units are metres, +Y up, +Z forward, origin at the feet and yaw about +Y.

- Each selected-scene drawable primitive is declared in `drawParts` with node/primitive identity, counts and bind transform. The verifier/runtime check actual draws; orphan meshes are not contact evidence.
- GLB vertices retain `_VAT_ID` through seam splitting. Textures are raw little-endian RGBA16F; each frame occupies whole `rowsPerFrame` rows with explicit texture dimensions/padding.
- `vatSpace: world-baked` means selected-scene bind transforms are already in VAT positions; validate them without applying them twice.
- Clip metadata owns phase layout, duration and stride. The current baker writes a 32-frame, 1-second, 1.1 m two-step walk and a 16-frame, 2.5-second idle. Generic walk phase uses travelled distance divided by scaled stride; this mapping alone does not prove a natural stop/restart or planted feet.

`src/agents/render/humans.ts` loads hash-bound manifests/models/VAT. Main colour, shadow depth/distance and registered AO normal materials use the deformation and preserve source cutouts. The alpha threshold is 0.45. `src/agents/render/pass-materials.ts` owns actual VAT-mesh registrations and disposal. Generic distance thresholds/budgets live in `POPULATION_LIMITS` in `src/agents/population/config.ts`: 18/60 m with per-variant near/medium instance budgets; excess is demoted, never dropped. The separate local-walker renderer consumes its admitted packet rather than proving the generic path by substitution.

## Vehicle and shared pose format

Vehicle manifests independently remain version 1. `src/world/agent-assets.ts` defines nominal body dimensions separately from full measured bounds, collision envelopes, axle positions, rolling radii and wheel-object identities. Consumers use the actual manifest instead of copying old table values; mirrors/bumpers extend beyond nominal body width/length.

`src/world/agent-poses.ts` defines stable slot arrays for previous/current positions, yaw, support normals, travelled distance and spawn generation, plus current active/speed/scale/variant values. The fixed-step population owns writes. The renderer interpolates within a generation and takes current state directly after respawn. LOD never changes activity.

Vehicle poses additionally carry four support-normal wheel offsets and front steering. The shared limits are ±0.05 model metres for wheel travel and ±35° for bicycle-equivalent front steering. `writeSupportBasis` is shared by collision projection and rendering. Those finite bounds are not evidence of continuous city support, swept-turn clearance or collision safety. [Network contract](network-contract.md) describes displayed-body admission and boundary authority.

## Checks and their limits

| Command or check | Bound |
| --- | --- |
| `npm run data:agents:set` | Complete nonempty manifest-named human files with recorded lengths/hashes, including source blends; no geometry/gait/FPS verdict. |
| `npm run data:agents:verify` / `data:agents:manifests` | Offline delivered asset/manifest admission, drawable geometry and sampled contact checks; no browser crowd acceptance. |
| `npm run data:vehicles:verify` | Actual vehicle model/manifest contract and geometric bounds; no traffic behavior verdict. |
| `test/agent-render-passes.test.ts` | CPU wiring over actual variant/LOD groups; no moving shadow/AO pixels. |
| Local-walk preparation/runtime checks | Exact source/packet/route correspondence and named finite refusals; no full population, continuous foot contact or target FPS. |

The sampled source stance checks retain 5 mm drift and 15 mm contact-height bounds. Inspect actual drawn sole vertices, not only IK targets or a model's unreferenced shoe mesh. A planted foot floating above ground can have zero drift, so height is a separate condition. Source studio renders do not establish street silhouettes, turns, slow motion, stop/restart transitions, or every shader pass.

## Historical findings

September source/renderer reviews caught upper-arm/forearm pose errors, shoe-sock separation, wheel liners below ground, opaque glazing, alpha-sorting holes and undeformed shadow/AO passes. Rejected candidates and their frozen native originals remain historical evidence under ignored `artifacts/agents/`. The original recipe/review narrative, candidate hashes, fixed matrices and counterexamples are recoverable verbatim from `git show d7223c79b3564bae1872f4d23aff4faded7ba540:docs/reference/agent-assets.md`; no candidate or review result is rescored by this shorter reference.

In particular, the 2026-09-11 settled-strip probe found 29.616 mm near-ground travel at a restart despite idealized settled soles. It rejected phase correspondence as a sufficient foot-lock mechanism; it was not a review of the later admitted local walker. Changing body trajectories, hiding feet/actors, weakening bounds or inspecting only ideal bones cannot qualify a gait. Current source/route/contact limits and any future crowd evidence belong to the plan and their exact implementation reviews, not this historical prototype record.
