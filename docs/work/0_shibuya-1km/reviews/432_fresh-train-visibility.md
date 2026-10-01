# 432 — fresh train visibility review

Owner: fresh432, independent read-only critic. Date: 2026-09-30. Workspace: the reused crossing-frontage checkout. Assigned product context: documentation checkpoint `e060d30` plus the uncommitted train/material/error increment. This lane owns only this authored review; it does not run browsers, servers, GPU work, gates, Git, camera search or source changes.

## Fixed reproduction and disqualifiers, written before route comparison

The fixed question is whether an ordinary Satellite dusk passage, reached through real controls with the live fixed clock and admitted rail/building geometry intact, shows recognizable connected train carriages moving along the rails. The current reproduction is `artifacts/verify429/train-inspection.json` and its four individually inspected 1280×720 originals. A better view may be explored, but these baseline bytes and the visible-train requirement stay fixed. Full unobstructed bodies in every sample are not an added requirement; a coherent train must be visually identifiable in the observed passage.

False passes include clock or car counts substituting for pixels; moving pale strips with no readable carriage sequence; shrinking, lifting or relocating the train off admitted support; hiding buildings, station roofs or trusses; using setters or agents-disabled special startup; relaxing the recognition question after a failed view; and claiming motion continuity, disappearance quality or whole-city quality from four sparse samples. A new pose supported only by geometry is a hypothesis until native rendered originals are independently inspected.

## Initial pixel verdict

HOLD. All four originals were opened individually at native 1280×720. Pale/yellow narrow train fragments change position on the visible railway, but the foreground building row hides most of the bodies and the train connection. The sequence is insufficient for a user to recognize connected passenger carriages running on the rails. This is a visual bound on these four images, not a claim that the train can never be seen elsewhere.

| Original under `artifacts/verify429/` | Inspected SHA-256 |
| --- | --- |
| `01-corridor-0.png` | `f0ddf36850ff2a270d2b7647cc7a3e76bbe59285c684751b413346c3a3b4254e` |
| `02-corridor-1.png` | `673033096e7ec4838d4d79a4e605b04513041de6877a3c6fe62a56926162bcd8` |
| `03-corridor-2.png` | `0801a5f2bf20505e9df486c368988d03d446e11c56760df5e84bb980b29307a5` |
| `04-corridor-3.png` | `c2910b436f26e65faee71ff723f10a80e5a381735876e25c5a9d8fb963239956` |
| `train-inspection.json` | `fb010d1333459f26a49945d90e856974e599300c7c691fb598dc8cad8b26d433` |

The record lasts 93.269 wall seconds from its start/end timestamps; the owned capture reports 93.000 seconds. Its natural wait was 44.894 seconds. Four requested two-second samples span 7.0798 wall seconds from first-before to last-after, and 7.0831 simulation seconds. The selected track is `146060273`, moving north by 84.9972 source metres. Every sampled boundary reports 64 checked wheels, 32 source-supported, 32 outside the cutout and zero unsupported. The second consist is outside the AOI; its 32 contacts are not claimed as supported. These observations establish movement and the support accounting within their bounds, not appearance or continuous passage.

The fixed camera eye is `(-41.9342171,194.2532278,-337.8296911)`, target `(85.8935631,15.2,-337.8296911)`, distance 219.9999995 m, azimuth −π/2 and polar 0.620000252. The four first-before simulation times are 69.7304667, 72.0137667, 74.2969667 and 76.5635667 seconds. The selected before/after car poses already recorded for these samples are the prospective offline probe's sole train-position inputs.

## Fundamental diagnosis

The train source defines full-size opaque silver bodies, windows, stripes, roof equipment and wheel batches. Body, undercarriage, stripe and window instances share the same production pose. The current northern physical-clearance evidence found zero sampled envelope intersections and source-supported contacts on both chosen tracks. Nothing inspected justifies moving, lifting or shrinking the model, changing the rail recipe, or removing source buildings.

The existing car-clearance probe cannot qualify camera sightlines. In `artifacts/rail411/source-clearance.mjs`, `add` discards triangles outside X40..200, Z−530..175 or Y18..31 before it checks car boxes. Camera429 lies west of that X window and far above its Y window. Intervening west buildings and tall roofs can therefore hide the train while being absent from the collision population. Its 79,287 decoded triangles, 152,884/117,710 candidate tests and zero hits answer physical placement at 0.5 m station samples. They do not answer what the camera can see.

The pixels strongly support foreground occlusion as this observation's immediate failure. They do not independently prove every silver body surface rendered correctly. Recovering the observed obstruction with actual rendered-geometry semantics is the next discriminator. Repeating a northward pan at the same west bearing and elevation would leave the same mechanism untested.

## One bounded next step: offline sightlines before another capture

Commission one small read-only CPU probe after the current gate lease closes. Reuse the existing `source-clearance.mjs` B3DM/GLB/Draco decoding and train-path logic; do not create a general camera planner, new framework or angle grid. Preparation and independent source admission precede its single execution. This review creates no probe script and executes no probe.

Hold target `(85.8935631,15.2,-337.8296911)` and distance 220 m fixed. Compare only the baseline and these two predeclared hypotheses:

| Pose | Azimuth / polar | Prospective eye in world metres | Mechanism and risk |
| --- | --- | --- | --- |
| Current west positive control | −π/2 / actual 0.620000252 | actual `(-41.9342171,194.2532278,-337.8296911)` | Must recover the observed foreground blockage. A failure to recover it invalidates the instrument. |
| Opposite east | +π/2 / 0.62 | `(213.7212985,194.2532605,-337.8296911)` | Removes the current west row from the foreground while retaining useful side relief; eastern buildings or roofs may become blockers. |
| Steeper west | −π/2 / 0.28 | `(25.0953205,226.6321964,-337.8296911)` | Shortens the horizontal path across the current foreground; stronger overhead foreshortening may leave too little carriage identity. |

Use the exact four recorded before/after body poses, all four cars, and at most twelve fixed feature targets per car: actual near-side silver/window surface points, roof points and longitudinal ends from the production model. This caps the three-pose comparison at 1,152 sightlines. Preserve each result and its first intervening triangle identity; do not replace the visibility matrix with a car count or invented percentage acceptance threshold. Project the feature locations through the production 55-degree vertical FOV and 1280×720 aspect so the report also shows native screen extent and carriage gaps. A clear ray is geometry evidence, not a recognizable pixel.

Select building leaves from their bounds intersecting the union of those eye-to-feature segments. Decode all such final leaves through the existing decoder, including tall buildings and all geometry between the eyes and trains. There is no Y18..31 car-space filter, fixed rail-width X filter, or pruning based only on distance from the tracks. Triangle bounds may reject a segment only when they prove separation. Include every admitted static rail layer that can intersect the segments, not only truss/shaft. Other opaque scene families must be included or excluded by a documented geometric separation; an unmodelled possible blocker remains unknown.

Match actual rendering: regular source meshes use GLTFLoader's node matrix decomposition/composition and rooted parser transforms; admitted replacement triangles use their Float32 world positions. Apply the exact manifest source-face exclusions and additions from `replaceRailBuildings`, including return fragments, rather than retaining both versions or removing an entire unverified GML batch. The source records a raw/parser placement difference of up to 11.375 mm on ten replacement objects, so raw source matrices are not interchangeable with parser matrices. Preserve source material sidedness: installed GLTFLoader maps `doubleSided: true` to DoubleSide and otherwise retains its default FrontSide, and the facade patch does not change that setting. New rail and return MeshStandardMaterials retain their actual defaults. Account for alpha/mask semantics; a ray through a material that cannot be classified without texture coverage is unknown, not automatically clear or opaque. Respect each mesh's AOI clipping and section-plane exception. Boundary caps may be excluded only after proving each tested segment stays strictly inside every cutout halfspace. Do not infer volumetric closure or revive the old winding investigation; this is finite segment/triangle obstruction.

The baseline must recover material body-side occlusion at the recorded train positions and identify intervening foreground surfaces consistent with the originals. Include a direct admitted opaque-face blocking control and a clear segment control. If baseline correspondence, transform/material membership, control behavior, or completeness fails, stop the probe with that exact gap. Do not spend a GPU lease on its candidates. One owned CPU child with an external 120-second bound and preservation/finally cleanup is sufficient as a proposed cap; its actual cost is unmeasured.

If the baseline is recovered, choose at most one candidate whose ray/extent matrix exposes a coherent sequence of car bodies or carriage features over separated recorded positions. Prefer the opposite view when both provide that evidence, because it keeps the current side relief; use the steeper view only when its projected feature separation can still support recognition. If both remain roof slits, show too little train at native scale, or depend on an unresolved blocker, return no candidate and the named obstruction. Do not extend the angle list or relax the visible-train question.

The output is one prospective real-controls view or a finite refusal. Root may then admit one native passage at that view, using a fresh production writer/build proof for the current source and the existing live-clock/support/ownership checks. Independent native inspection decides whether the user can recognize moving connected carriages. It need not require every full car unobstructed at every sample, and it cannot close dwell/reversal, whole-service, continuous-motion or whole-city performance acceptance.

## Source binding and current context

The following bytes were read and hashed in this lane. The later probe must inventory every additional source, dependency and geometry file it consults and verify preservation; this table is not that future inventory.

| Reviewed input | SHA-256 |
| --- | --- |
| `src/scene/rail-trains.ts` | `e31739062a103007212f46b89d9dabea547db6b75e3a0aad5623993e0a86e128` |
| `src/scene/train-path.ts` | `571a1ebe270898b0f3f4207412eadb828a8919119d6147dbef100d54d101744f` |
| `src/scene/train-schedule.ts` | `30fa4511393de0be39efba723976a42b689e22de20f414ee32bb631570d70b6e` |
| `src/scene/rail-trial.ts` | `3539a3afeefd2429a7f6a0fc4b44b524f981618317702de1d852c1cc6494f457` |
| `src/scene/buildings.ts` | `e729852c716cb19a1ccc5d50c5437fe8378a3e9501f4de65f39b350f30e395b9` |
| `src/scene/aoi-cutout.ts` | `ebabb62d59d8d1999cdfd19ae2ee1dda40103f33b7f0dce4e4549bb96599e23a` |
| `src/scene/tile-materials.ts` | `cbf4c513e787d28a61833793b80a60032185acd9f1c8fa6814a7821763b25ea1` |
| `node_modules/three/examples/jsm/loaders/GLTFLoader.js` | `67ac5551fdafa6e349bd80c8f8e5e39c136d6b2fb1ad647db9abb21dc86f9e4a` |
| `tools/tiles/b3dm.ts` | `b7a28c482134fd0b1ee5e6f5d7fe57262b7a06ea9ab933044659e7dd6f1f6c08` |
| `tools/tiles/draco.ts` | `9f7cadfcb147970ed223310a5184bc02167751bea3d517ffe48dca42e3ecbc25` |
| `artifacts/rail411/source-clearance.mjs` | `dec6f1911e569a10f46bf6fa2bc4719939e44ba0766aea7445a523ad75a359f9` |
| `artifacts/rail411/source-clearance.json` | `e4f2fc39b196ab3dbe425088bbb8c4057bf51b202ac921e1d433823b53b572d0` |
| `data/scene/buildings/tileset.json` | `71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483` |
| `data/rail/manifest.json` | `e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707` |
| `data/rail/source-centrelines.json` | `65c45a82c9fda38583c758486641ac731672f59ea9d7230d94ebbed954fa9815` |
| `data/rail/authored-recipe.json` | `47b6b48552024a5d8c143ba8e81bf4cd3d81b32501c73e46b54e544992cc8f8e` |
| `data/rail/rails.mesh` | `59d34f06112d3aec178ad72bba9adae9b0b1cda1f6ddca1be0a3928897fc0457` |
| Current `src/render/camera.ts` | `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc` |

Root reports camera431 applied during this review: only the initial bearing and existing expectation change to the independently approved northwest view. The current camera source was read after that change; its FOV remains 55 degrees. This opening composition change is separate from the train geometry and the frozen429 pixel verdict. Root reports unchanged component model/source/data bindings before camera adoption. The old production writer proof is stale for any new current-source capture and must be replaced.

This lane launched no browser, GUI, localhost server, GPU work, long-lived child or probe runtime. It wrote only this review and created no temporary artifacts. No gate, new appearance capture, main integration, full-city visual acceptance or performance claim follows from this review. The immediate recommendation is the one finite offline sightline discriminator above, then at most one actual-controls view selected from its supported result.
