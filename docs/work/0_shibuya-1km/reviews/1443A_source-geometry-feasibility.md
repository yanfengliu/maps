# 1443A — source/geometry feasibility

2026-10-17. Independent read-only branch `search1443_geometry_resume`. Base main/worktree `e8c4952795887b70750a9a7ef36225f5cf18d030`; adopted product `ce107fc619e93c85d98616ea0134abb387668df4`. No peer branch result was consulted. This resumes the surviving clean detached checkout; it does not reset the earlier worker's unmeasured cost. PRIMARY source, index, scene cache and protected test were not changed. All 14 final criteria remain OPEN.

## Decision

**No source/geometry candidate is ready for selection against the fixed benchmark.** The admitted three-front rail-side construction is real and reusable, but extending that selection cannot improve the fixed lower plaza view: all three selected source fronts face the opposite half-space. A new broad frontage treatment needs newly selected, photographically bounded features on front-facing walls in that view. Those features/depth profiles are not supplied by the inspected source geometry or existing recipes. This is a precise selection/source bound, not an impossibility claim about all 67 tiles or the whole mechanism family.

The current constructors remove the need for a new rendering or admission framework. They do not remove the source-segmentation task. Treating white photographic bands as surveyed projecting slabs, or treating every dark pixel as an opening, would invent the missing input. No general boolean, private union1324 proof chain or rejected branch was resumed.

## Fixed evidence inspected

Exactly the three benchmark PNG originals were opened at 1280×720, without crops or camera changes. Their actual SHA-256 values match the benchmark:

| Original | SHA-256 |
| --- | --- |
| `artifacts/visual/sweep/satellite/plaza-az240.png` | `d3618ab5121d1d981482b6b7a048aad7e1b81689e62c558e89de46a65f58042c` |
| `artifacts/visual/sweep/satellite/block-az120.png` | `b8d597fda88c38784e2abbd1e8067a951d6b0652a4b1112a121a36afd727e024` |
| `artifacts/visual/hero/hero-satellite-dusk-approach.png` | `573dce74c278c875823fa5cb9ae867c2c3541b4e8fa36d0187ecc55d353dddff` |

`artifacts/visual/complete.json` is run `4eb529d3e8b3e8d6`, SHA-256 `35d79d43619d6ff12ed50e6769df59670c97b979a3d51589712e2ea7c5817d1e`, RTX4090/616.64. Its scene bound is 156 files/364,187,965 bytes, digest `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`. These are retained baseline facts, not a new gate run. `input-pins.json` binds the principal source/evidence inputs used below.

Observed appearance: lower plaza has large continuous photographic wall sheets around the road; the foreground of block-az120 already shows the hotel's physical window grid. The distant approach exposes many additional photographic fronts, with existing small sign emission. A source-geometry milestone must visibly change a coherent architectural treatment across representative fronts; more instances of the existing narrow apertures do not answer that problem.

## Actual production and source checks

`src/scene/facade-textures.ts:181–188` verifies recognized tile bytes before use; `:217–225` validates original source coordinates/UVs before texture rebuild; `:284–289` adds the finite frontage/window groups before tile-cache accounting. `src/render/post.ts:197` selects their GTAO materials. `upper-windows.ts` and `rail-facades.ts` already supply finite world-frame masks, complete triangle/rectangle coverage, closed jamb/head/sill/back geometry, identical beauty/depth/distance/normal aperture decisions, style uniforms and logical tile lifetime. Their existence establishes a construction path, not new source semantics or a measured improvement.

A new read-only decode through the worktree's actual `tools/tiles/b3dm.ts` and shipped Draco `decodePrimitive` compared every selected original index, batch, position and UV against the production rail recipes. Position and UV errors are exactly zero. The two cached tile digests match their production pins. No synthetic geometry/image inputs, product edits, downloads or scene regeneration were used for this decode. `source-bound.json` retains the result.

| Front | Actual tile / batch / GML | Existing source faces | Existing windows |
| --- | --- | --- | --- |
| Hotel | data503 /4 / `bldg_329c17a8-52bc-4d99-9f6b-c1af3974327a` | 4206–4211 | 80 |
| Office strips | data473 /15 / `bldg_77de016a-7fe8-4a3a-8237-e306681dd91e` | 2667–2670 | 8 |
| Office balcony windows | data473 /24 / `bldg_dc89f474-122c-4804-a794-b6b8d9f7190a` | 887/888 | 8 |

Actual data503 is 1,323,076 bytes, SHA `e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d`; data473 is 2,382,844 bytes, SHA `3a8eab6914499c9d030c3a01c76b62c230d88f48e15e72b8a67706d15559094f`. The selected reference fronts lie around world X148–149m, Z−66.6 to−116.9m, with outward normals nearly +X. The checked local plane limits are 1.206/0.313/0.026mm; these bound coarse source sheets, not real architectural depth.

The original retained source crops `hotel-native.png` (230×213), `office15-front-native.png` (85×310) and `office24-front-native.png` (45×270) were individually opened at original resolution and freshly hashed. They show piers/bands/cheeks photographically; they contain no depth measurements. Their corresponding retained raw GML extracts freshly match `source-gml-raw.json`: 105,977/62,772/37,492 bytes, hashes in `input-pins.json`. Exact XML element counts are respectively 42/22/8 `bldg:WallSurface`, and zero `bldg:Window`, `bldg:Door`, `bldg:opening` or lod3 elements in each selected extract. This is an extract-level finding; no whole-dataset absence is claimed.

`view-feasibility.json` reconstructs the two recorded sweep poses from the manifest's rounded orbit values and unchanged crossing target in `src/render/camera.ts:65`. For plaza-az240 the eye is approximately (−38.87,18.38,−22.44)m. Signed eye distances from the three outward planes are −189.90/−192.11/−192.00m. For block-az120 they are +35.21/+33.28/+33.32m. Thus the admitted front selection supports the complementary block view but is on the wrong face side for the fixed lower plaza view. This is a large-margin source-front half-space inference, not a new ray-visibility/occlusion measurement. Camera tuning or drawing these features through their buildings would violate the benchmark/source-facing intent.

`cutout-sections.ts:159` intersects unchanged triangles only with the four fixed AOI cut planes. Its bounded section closure cannot be presented as a solved arbitrary multi-frontage opening/occupied-shell boolean capability. The finite aperture constructors remain the simpler appropriate reuse path once actual new source features exist.

## Hypotheses considered and their disposition

1. **Broader rib/slab relief on the three admitted rail fronts.** A source-preserving textured overlay with closed returns is mechanically plausible without a general boolean. It lacks admitted feature/profile boundaries, has no measured visible benefit, and the source fronts fail the lower-view half-space check. Do not release it as the next prototype under this benchmark. This does not prove that carefully sourced relief can never work elsewhere.
2. **More physical windows, or deeper existing window boxes.** The current production path makes this easy, but it repeats the already adopted 96-window band and does not solve lower-view coverage. It is excluded by the count/isolated-aperture disqualifier.
3. **Prismatic depth around the three source-bound emission panels.** `facade-emission-regions.ts` identifies IKEA/data488 and two data518 GML panels with UV/plane checks. Those selections support sign fittings, not full frontage structure. A sign-box pass would substitute more fittings for the requested architectural improvement; broadening from those panels to surrounding walls would need new source admission.

No hypothesis was rendered or scored. No counterfactual appearance or performance claim is made.

## Exact remaining source boundary

A geometry prototype becomes bounded only after at least three useful front-facing representative fronts in the fixed lower/approach and complementary block views have complete source-bound photographic feature polygons, preserved signs/openings/margins, a coherent authored depth profile disclosed as approximate, and finite interfaces whose closure is demonstrable through the existing production tile owner. Existing narrow window rectangles cannot serve as an independent oracle for broad wall segmentation. The inspected sources supply coarse wall planes and photographs, not those missing feature/depth annotations. If obtaining them requires automated source segmentation, new surveying or general boolean surgery, that is still the substantive unsolved capability; it must not be renamed routine integration.

No product/source action is proposed from this branch. Retain this negative selection result so a later attempt does not simply extend the wrong-facing rail band. A future independently selected source set could reopen the geometry family; no global blocker is established.

## Resource and state closeout

The resumed pass began at17:29:57UTC and completed this report around17:35UTC, within the requested ten-minute bound. The actual selected-source decode took489.012ms wall and203,000µs CPU (156,000 user/47,000 system). Prior worker/model/total CPU and prior active-compute time are UNKNOWN; the wall interruption was not charged as active compute.

No browser, GUI, server, GPU lane, unit/full gates or subagent was launched. The worktree was clean at e8c4952. Fresh nonfollowing retirement census found2,395 entries/49 directories, zero reparse points and zero enumeration errors. Normal Git removal deleted the checkout; sandboxed Git initially failed deleting its exact registration. A scoped approved normal Git retry removed only that registration, without force or broad prune. `retirement-completion.json` confirms checkout and `.git/worktrees/worktree8` are absent. Scoped WMI at17:34:48UTC found zero search1443/source-geometry process markers; `final-resources.json` preserves the result. The first sandboxed WMI query returned Access denied; the approved read-only retry succeeded.

Only this branch's ignored report/evidence files remain in `artifacts/search1443/source-geometry/`. The protected PRIMARY test remains SHA `48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a`. No other retained checkout, active task, main source/cache/index or root-owned plan/report was changed. No code commit or acceptance closure is claimed.
