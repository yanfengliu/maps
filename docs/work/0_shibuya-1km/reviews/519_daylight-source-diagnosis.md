# 519 — Daylight source diagnosis

2026-10-01. Independent source-only diagnosis on frontage HEAD `79d0a03375943121c9f67529b61cb79dabc87ee2`. Inspected one original 1280×720 image: `artifacts/facade516/diagnostics/baseline/diagnostic-first-ready-noon.png`, SHA-256 `f3f0897e805be44340632e35670a8ac80bbbaba62fed3317c9a4654332ba61f9`. This is the unlanded common observer450 baseline, agents=0, default camera with an explicit noon query. The frozen source's ordinary time default is dusk. It is not accepted product39ba's ordinary no-query evidence.

Observed: pale roofs supply most separation; north/west-facing towers and smaller facades merge into subdued blue-grey shade. The crossing is legible but has weak authority. This agrees with fresh515's direction. One still cannot identify physical albedo, all surface classes or the dominant cause.

Actual before/after metadata agrees: Satellite/noon, sun azimuth 179.98°/elevation 45.88°, key 2.365 with linear RGB (1, 0.9379, 0.8043), hemisphere 0.58, environment 1.5, exposure 0.9, shadows enabled. Active post is TAA→GTAO→bloom→OutputPass: AO blend 0.62/radius 1.4 m; bloom 0.18/threshold 0.55. Frozen `lighting.ts` supplies a shadowed directional key and unshadowed hemisphere. `app.ts` binds a sky-only PMREM, excluding city bounce, and exponential fog. `sky.ts` retains only 0.10 of environment chroma at noon.

Photographic RGB is already processed. `facade-textures.ts` caps the source, creates its sign mask, runs GPU de-light, then marks replacement bytes sRGB. `atlas-delight.ts` decodes to linear, removes authored airlight/illuminant proxies, compresses luminance with exponent 0.6 and re-encodes. Actual atlas statistics raise median linear luminance 0.09084→0.12214 while mean HSV saturation falls 0.2001→0.1789; these are atlas samples, not visible-facade measurements or physical recovery. `tile-materials.ts` further lifts photographic diffuse RGB by 1.20–1.62, conditionally lifts dark neutral roofs, and assigns roughness from a dark-neutral glass proxy. Sampled linear atlas RGB multiplies material base RGB before lighting.

Pinned Three 0.180.0 applies ACES exposure to the assembled post color, followed by sRGB encoding. Increasing exposure also moves roofs, sky, emission and reflections through the same tone curve. Source discrepancy: for Standard materials using `scene.environment` with no explicit `envMap`, r180 uses `scene.environmentIntensity`; the material's 0.85 setting does not damp that 1.5 multiplier.

Causal hypotheses: the northwest camera (azimuth −135°, polar 0.95, radius 420 m) presents many faces turned away from the southern key; shaded diffuse response may be the useful lever. Residual photographic shading and compression may also limit color/depth. The grey backdrop need not indicate a failed blue sky: the 55° FOV's top ray remains 8.07° below horizontal, and the dome blends below-horizon directions toward authored ground/haze. These explain plausible mechanisms; none is an A/B result.

One proposed comparison, unrun: change only noon hemisphere intensity 0.58→0.78 (+34.5%). Freeze key, sky, environment, fog, exposure, post, photographic bytes/UVs, geometry, pane treatment and controls. Pair the default view; preregister a held-out southeast view at azimuth +45°, polar 0.95, radius 420 m and target (0, 15.2, 0), without tuning from its result. Accept only clearer shaded facade/material separation with retained window rhythm, shadow depth and ground hierarchy. Reject roof whitening, flat shade, hue loss or worse markings. Check dusk and real style return for regressions; fixed stills cannot close moving filtering, powered-city or full-AOI acceptance. Pane recipes and texture bytes stay fixed; rendered pixels respond to changed illumination.

No browser, server, GPU session, gates or product changes ran. Only this authored record was written. Root owns comparison admission and integration after north framing qualification.

## SHA provenance

Selectively parsed the actual record; no pan-trace dump. Its SHA-256 is `1a3ac2dd5231145d1fd7b155ebd6bb1dd0ecd361691217795dd8511c9005cd3c`. Recipe SHA-256 `bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad`; fresh515 SHA-256 `e8547ec5adb572d18ae8a09f70ebe2d834ff887870e28026c222d1315cd29387`. All 13 baseline paths below were independently rehashed and matched their exact `native-inspection.json.before` pins. This does not claim browser-response body identity, which 516 records false.

Paths are relative to `artifacts/facade516/arms/baseline/`:

| Path | SHA-256 |
| --- | --- |
| `src/app.ts` | `fb7d3be15e020d3b440f00e46272c831eee7857f4d512983e0cf344a25a5da75` |
| `src/render/camera.ts` | `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc` |
| `src/render/renderer.ts` | `e0219cfb908ce5e9b9dbb7aa84ba1d11900558943cfb05c005a65ff3e68ae7b4` |
| `src/render/post.ts` | `6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9` |
| `src/render/atlas-delight.ts` | `a387dbcdee9baea7e34987f8a480a01bc11e7dfb726430ff2968d37ddc381396` |
| `src/scene/lighting.ts` | `776fcd55b719c7d90273c85d88501aefebcedad039bf39d33d45d32de6116219` |
| `src/scene/time-of-day.ts` | `50a7e6f9ea2fdb9bf59c9f26302bd7c97d3a2021167c3ea537a380211ff88e7a` |
| `src/scene/sky.ts` | `289b2084c4302d222e93cba463ceb34af21c3ee4e7a1cd449d0790b7d58df8c2` |
| `src/scene/facade-textures.ts` | `3f5ea6dd1fcaba24efed2df49fec9ef2dc4b7a038c91b888a13390e3715db0f2` |
| `src/scene/tile-materials.ts` | `cbf4c513e787d28a61833793b80a60032185acd9f1c8fa6814a7821763b25ea1` |
| `src/scene/delight.ts` | `ca0ac4156e6f0e1f4f7b2c619a869c20033de6e5e6b347a2ab79a3a7f4547a77` |
| `src/world/styles.ts` | `a9bd1f8d21c1056f4f1451d0e438e8048e57a4cbebdbabb72167248622376c50` |
| `package-lock.json` | `32c54d3389169a5021bd4105ca1e3f321ca8db7d6e32d758e73421c61b9b9640` |

Read the installed r180 primary implementation at `three/src/renderers/WebGLRenderer.js:2501`, `webgl/WebGLMaterials.js:392`, `ShaderChunk/tonemapping_pars_fragment.glsl.js:46`, `ShaderChunk/map_fragment.glsl.js`, and `examples/jsm/shaders/OutputShader.js:75`. No dependency was changed or model runtime called.
