# 1420 — Fresh ordinary-app Satellite critique

Date: 2026-10-17. Owner: square1420_critique; root owns milestone selection and integration. Source: main `c42c526aa0c69f3b5c508d7ab4a0edc09937273b`. This is a fresh bounded critique, not final deliverable acceptance. All fourteen criteria remain open.

## Recommendation

Select **readable tactile paving across the existing mapped-path class** next. At the crossing, long smooth yellow ribbons and the surrounding pale tiled field dominate both street views. They should read as installed tactile tiles with restrained relief, seams and finish. Keep their mapped positions and support authority. A restrained adjacent paving treatment belongs only if it is needed for that same material relationship. Do not turn this into a new path-authoring, facade, lighting or general geometry project.

This is the smallest shared intervention with a clear before/after at the ordinary crossing. Flat photographic facades recur much more widely, but need a larger source-preserving treatment. Dusk lighting is the next bounded visual opportunity. The recommendation was made after inspecting the complete fresh set; no implementation was preselected.

## Run and evidence

The ordinary app ran from a fresh production build of the exact detached source. No population, walker, rail, scene, LOD or simulation-disabling override was used. The scene retained its default seed. The public `?time=noon` and `?time=dusk` entry options selected time because this version has no time UI. The actual World style control supplied pointer and keyboard changes. Existing `OrbitDriver`, its tile/settling observations, its real pointer/wheel path and the existing retained-handle owned runner were reused. The task helper supplied a finite camera schedule and copied real right-drag pan recipe; it added no product or gate framework. Harness access was read-only. No camera, control or renderer state was assigned.

Twenty-four fresh 1280×720 originals were each opened separately at original resolution. Twenty are accepted for observations of their visible scene surfaces. Four are rejected for scene-appearance coverage: west-near is blocked by a building wall and east-street is behind/below a steep terrain surface, at both times. These failures remain in evidence and were not replaced by extra captures. The successful block views do not fill those close-range gaps.

Ignored evidence lives at primary `artifacts/square1420-critique/runner/run1/`: `payload/images.json` records each actual full-precision camera pose, frame/epoch, style/time observations and SHA-256; `payload/capture.json` binds source/build/cache before and after; `native-inspection.json` records the 24 per-image verdicts and digests; `process-cleanup.json`, `capture-completion.json` and `final-cleanup.json` record closure. The capture record SHA-256 is `41c4ece50025330b48d92f8757b4d8ba7ce0942d3339b9a13ea3b7db3ca75e3e`.

The fresh literal runtime copy contains 156 files and 364,187,965 bytes under scene/rail/network; each copied file is bound to its actual primary source bytes in `artifacts/square1420-critique/cache.json`. No source was fetched or regenerated, and the admitted rail packet was preserved. The task's copy-manifest digest is `462d454033ca3b180b3e5de8efb4eff2f177f65fa5e4eea1c8b099673638d0da`; it uses its own documented row ordering and is not a replacement for the existing runtime certificate digest. All capture input pins remained unchanged. Primary `test/facade-emission.test.ts` still hashes to `48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a` and was untouched.

The renderer reported `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)`. Headless hardware rendering was required and observed. Node was 24.12.0. Build succeeded with the existing large-chunk advisory. This was not the five-gate chain, a canonical visual certificate, an FPS measurement or a custom HTTP certification. No runtime/unit/audit gate was requested for this read-only critique.

## Flow and observations

| Step | Surface and health | Fresh evidence and limits |
| --- | --- | --- |
| 1 | Default opening: scene and controls work; visual quality remains mixed | Both `01-default` images show a dense recognizable city and rail corridor. Photographic roofs and facade masses provide real geographic character, but fine detail softens into blue/grey blocks. The default view hides much of the pedestrian ground behind buildings. |
| 2 | Opposite crossing street views: strongest visible ground opportunity | Both `02-crossing-nw-street` and `03-crossing-se-street`, noon/dusk, show smooth yellow strips across large pale paving fields. The adopted corner's occupied glazing and dusk fixture add useful depth; the opposite frontage remains flat and dark. Asphalt, paving and curb geometry are distinct, but fine construction cues do not make the tactile paths read as tactile tiles. |
| 3 | Aerial: useful layout observation, insufficient close-surface coverage | Both `04-square-aerial` images show the city silhouette and cutout extent. Dusk adds little distributed visible street-level light at this scale. This is not an every-building, every-road or exact AOI-edge inspection. |
| 4 | West and north blocks: facade weakness repeats | Both `05-west-block` and `07-north-block` show repeated soft photographed windows, stretched/blurred facade fields and large plain wall sections. Streets are often deep dark corridors. `06-west-near` is occluded and supplies no close-facade acceptance. |
| 5 | East and south blocks: surfaces and lighting remain sparse | Both `08-east-block` and `10-south-block` show broad pale pedestrian edges and mostly plain dark road corridors around visible crossings. The surfaces are not source-classified from pixels alone; no claim of wrong material assignment or missing legal marking follows. `09-east-street` is rejected for clearance/occlusion. |
| 6 | Held-out geographic poses: confirms facade/dusk recurrence | Both `11-heldout-northwest` and `12-heldout-southeast` show similar facade softness and unlit street canyons beyond the hero corner. The southeast view also contains a visibly marked road segment: peripheral paint is unevenly visible, not universally absent. |
| 7 | Real keyboard and style controls: basic continuity works | Held W moved the target 30.946 m. Pointer Satellite→Cartographic and keyboard End→Satellite each measured zero camera-position travel; walker ticks advanced 109→152 and 153→192, with physical travel 1.848→2.667 m and 2.686→3.429 m. This checks ordinary control continuity, not Cartographic visual quality or crowd behavior. |

### Ranked defects and surprises

1. **Pedestrian construction reads as flat paint and a broad tile sheet.** This is most conspicuous in the two opposite street views at both times. A narrow source read after observation identifies the yellow surfaces: `src/scene/street-details.ts` takes `network.physical.tactilePaths` with `extent === path`, builds 0.3 m segments at a 0.07 m offset and uses plain `0xcabd75` material. Their semantics are tactile paths. Their exact mapped route is not shown wrong by these images. Smooth ribbons lack visible ribs/tile joints and their oblique intersections look like yellow road-line fragments. Broad pale edges also appear east/south, but peripheral tactile recurrence is not established by the occluded/roof-level views.
2. **Facades are still photographic sheets at near/block distance.** The crossing signs and the adopted glazed base give useful local depth. Around west/north/east/south and both held-out sectors, many windows remain painted tonal rectangles on flat walls, with blurry or stretched image fields and weak material differentiation. Noon and dusk both expose this; simply adding saturation or global brightness would not supply physical depth.
3. **Dusk activity is concentrated near the hero crossing.** The adopted fixture has a visible mounted source and local wash. Elsewhere in the sampled block views, buildings change sky/key tone while most street canyons retain little visible mounted-light rhythm or occupied glazing. This limits the sense of a living Shibuya. Sparse stills cannot prove that no lamps or train are elsewhere, or establish flicker, exposure stability or population density.

The geographic density, recognizability and source rooftop detail are strengths worth preserving. A useful surprise is that the adopted occupied corner survives comparison with the opposite frontage: physical glazing/interior cues help more than another bright billboard would. A second surprise is that noon can read darker than dusk on several photographed faces; this is an appearance observation, not a diagnosed lighting bug. A global exposure correction should not be selected from these stills alone.

The attribution text is visible but low contrast over detailed imagery. That is a visible accessibility risk, not an accessibility compliance finding or the proposed visual milestone. Keyboard style use and W pan worked. Other focus, screen-reader, reduced-motion and contrast states were not audited.

## Three bounded candidate outcomes

| Priority | Visible outcome and before/after acceptance | Suggested scope and risks |
| --- | --- | --- |
| 1 | **Mapped tactile paving reads as installed tactile construction.** Before: smooth yellow ribbons in both crossing street directions. After: directional relief/tile modules and seams are legible at the same 45–50 m views in noon/dusk, with restrained finish and believable ground contact; junctions and segment ends do not reveal gaps, protruding undersides or conflicting relief. At block/aerial distances it remains a quiet route cue, without bright stripe dominance, shimmer or dense aliasing. Existing route/support identities and refusal behavior stay intact. Include at least one independently chosen visible peripheral tactile path during implementation acceptance; these captures do not supply it. | Start with the tactile branch/material/geometry in `src/scene/street-details.ts`; use the existing shared surface treatment only if a restrained paving change is needed. Apply to the eligible mapped class, with complete placed/unplaced accounting. Preserve physical path positions, widths/support and the separate OSM authority. Do not infer warning-dot regions, safety semantics, missing path sections or rerouting from screenshots. Risks: relief at slopes/corners, overlap/junction seams, source warning/path distinctions, Float32 support, style material lifetime, LOD/aliasing and dusk contrast. Avoid a new general mesh/union system. |
| 2 | **A small supported set of peripheral dusk frontages shows occupied, mounted light.** Before: dark canyons at west/east/south block and held-out views. After: a selected west/east/south set has visible fixtures or occupied glazing and local light falloff rooted to real surfaces; matched noon retains source detail; dusk has a readable distributed rhythm without floating lights or uniform window grids. Fixed and held-out street/block views must show the actual mounting/contact and surrounding dark controls. | Bounded source selection and presentation in the existing signage/fixture/frontage homes. This is not a whole-square lamp claim. Risks: support/occupancy selection, baked daylight in photographs, arbitrary fictional patterns, washed-out source signage and many dynamic lights. Preserve source bytes, texture caps and the admitted rail/building inputs. |
| 3 | **A representative facade set has material depth beyond its photograph.** Before: flat/soft window fields in west/north/east/south and held-out frames. After: a small stated set spanning common facade types has visible frame/glazing/recess cues at street and block distance, responds differently to light by material and keeps the source photograph recognizable; aerial silhouettes and roofs remain stable. Judge opaque wall, glass and signage together in noon/dusk. | Existing facade/building presentation path, with source-preserving per-type construction and a small geographic set. Risks: texture resolution limits, baked shadow/delight interaction, source window ambiguity, invented floor grids, material ownership/disposal and performance. This is the largest of the three and should follow a concrete source sample, not a universal shader chosen before inspection. |

Root should adopt candidate 1 as the next implementation contract. Candidates 2 and 3 remain choices, not dispatched work. Road completeness, missing urban-expressway carriageways, traffic/crowd acceptance, de-light, full-map traversal and final visual/performance criteria remain separate open requirements.

## Sampling and cleanup bounds

The fixed camera targets cover the crossing and west/north/east/south blocks. Two held-out camera poses were generated before viewing with seed 142017 using LCG32 (`a=1664525`, `c=1013904223`). They affect only the camera schedule, not scene randomness. The schedule and exact actual poses are in the evidence record. All targets retain the controls' ordinary ground target height, 15.2 m; no elevated target was injected. The occluded poses demonstrate why reached numerical aims are not automatically useful scene coverage.

The first original is timestamped 09:56:11.398Z and the last 09:59:22.894Z on 2026-10-17. Consecutive still timestamps are 3.675–16.202 s apart. Only these stills are inspected. No motion clip, continuous clearance, temporal-AA/flicker, train passage, route-level coverage, crowd contact or target-count FPS conclusion follows. Twenty usable images do not establish whole-map completion.

Capture/build elapsed 217.518 s. No repair rerun occurred. One attempted image open preceded its file arriving and was then opened after arrival; no image was accepted unseen. The sandbox denied an initial read-only CIM request; the existing owned wrapper and final census ran with escalation. No visible browser/desktop window was opened.

Page/context/browser/browser server/preview server/esbuild all closed in the existing finally path. The wrapper checked six recorded process identities and no remaining descendant/omitted edge. A fresh task-specific census at 10:00:50.3999775Z found no recorded identity or task-marked node/browser process and no listener on 4319, 5319 or 4324. The owned empty temporary tree passed a nonfollowing zero-reparse census and was removed. Unrelated processes were untouched. Screenshots, source/cache/build pins, helper evidence and the literal runtime cache are intentionally retained for the unresolved findings and root handoff. The detached worktree remains at `artifacts/square1420-critique/worktree` by assignment; no commit or push has been made.

## Native image and pose registry

Every row below was opened individually at its original 1280×720 dimensions. A = accepted for visible scene observations; O = occluded and excluded. Coordinates below are actual recorded world metres rounded to 0.01 m. Full precision, azimuth, polar angle, distance, epoch and frame bounds remain in `payload/images.json` and `native-inspection.json`. Files are under primary `artifacts/square1420-critique/runner/run1/payload/` with `.png` appended.

| Image | Review | Target X, Y, Z | Camera X, Y, Z | SHA-256 |
| --- | --- | --- | --- | --- |
| noon-01-default | A | 0.00, 15.20, 0.00 | -241.57, 259.51, -241.57 | `b794ab9048a888c1a4419316e03fc0dc461b991ff5c47f0ddae733d6d7ba4ddd` |
| noon-02-crossing-nw-street | A | 0.00, 15.20, 0.00 | -31.94, 18.38, -31.54 | `d4ff2b3b37f97618e71f191d2cd7fd14b23d5ebb1d581a95cee2336e03482184` |
| noon-03-crossing-se-street | A | 0.00, 15.20, 0.00 | 35.78, 18.74, 34.75 | `cf3a63be5949d0002148c0b99f661fb82f4b13f9636d70cf80addb74bea8b6c3` |
| noon-04-square-aerial | A | 0.00, 15.20, 0.00 | -441.90, 923.07, -436.46 | `35206527ab8ccdb975b07bb9574b11c514d64905aafe28d9280fae52ce751038` |
| noon-05-west-block | A | -280.00, 15.20, -60.00 | -421.94, 129.64, -200.20 | `6662cd74066869d16a533b675800994c759c3622fee4aee92812c591e36aeb6a` |
| noon-06-west-near | O | -250.00, 15.20, -20.00 | -330.81, 54.41, -14.27 | `4a9d179573cbee1dfa62d0738da7892fe4120b88abf4c88868b6d2ea2883d616` |
| noon-07-north-block | A | -40.00, 15.20, -320.00 | -166.31, 114.99, -170.04 | `6f6dca8c12b4a825bb142252b426ba8e0396768d241c92ac481d7247cadfd964` |
| noon-08-east-block | A | 320.00, 15.20, -40.00 | 484.98, 114.99, 65.93 | `4b4f493fe182baa90a812dba2eee7d6d9f78dc7f50a2f38d22e6ae5b3667cf85` |
| noon-09-east-street | O | 220.00, 15.20, 20.00 | 274.53, 21.28, 23.87 | `7e8ec3971d231e6ad2ba7d0249c04f0a393b5ec63ef5b2a23c6dfb79097984a1` |
| noon-10-south-block | A | 20.00, 15.20, 320.00 | 105.86, 133.03, 523.08 | `45b274085e4b5553f64c4b4eccd1372c303ddc53914a27c4ab6216d6cefe2f47` |
| noon-11-heldout-northwest | A | -272.49, 15.20, -192.03 | -324.85, 150.25, -431.59 | `5464853072e132ca164f6f4caec8c4148ab2741c9e5d438b1a6c61739a471479` |
| noon-12-heldout-southeast | A | 234.16, 15.20, 319.49 | 301.72, 102.76, 162.80 | `37c34d434f2c757e4b4f8ea731d9feb74289d86e5e5604e3899d5e904600ef87` |
| dusk-01-default | A | 0.00, 15.20, 0.00 | -241.57, 259.51, -241.57 | `bc8ec34dbe1e9e743dda90ad9a72e5709b925e8d8da85e4905a3804e805c298d` |
| dusk-02-crossing-nw-street | A | 0.00, 15.20, 0.00 | -31.94, 18.38, -31.54 | `296925f4ac20ba30bb967a15a6455324efa1441296f2c1c4f8308acd5cf75116` |
| dusk-03-crossing-se-street | A | 0.00, 15.20, 0.00 | 35.78, 18.74, 34.75 | `73bf23ee496fb8776cdd18be37a2319021e85a95700a286d42995da4675dc491` |
| dusk-04-square-aerial | A | 0.00, 15.20, 0.00 | -441.90, 923.07, -436.46 | `d545e3054957c6fe9262ff5ceff620dc0d91f1431499759a820e517a5f0c8261` |
| dusk-05-west-block | A | -280.00, 15.20, -60.00 | -421.94, 129.64, -200.20 | `e276e293f6094eed60138c6a0e4f9e41268b9f834deaba01ca809c1f48145daa` |
| dusk-06-west-near | O | -250.00, 15.20, -20.00 | -330.81, 54.41, -14.27 | `655f4acbe7d60b7441282f4bf3fe66f440bf716d1f542ac4a909ff5894f50f17` |
| dusk-07-north-block | A | -40.00, 15.20, -320.00 | -166.31, 114.99, -170.04 | `427f1d3af49524ac9a8c9870d69f836231314086596024397394f90205248112` |
| dusk-08-east-block | A | 320.00, 15.20, -40.00 | 484.98, 114.99, 65.93 | `c7d533c6095c561355f63d582e14509427cc90e7f6ec2750f766df76d3b320f2` |
| dusk-09-east-street | O | 220.00, 15.20, 20.00 | 274.53, 21.28, 23.87 | `c3d2c4e57a04a48f39f6f4fc1c8817d0b706b649a5f430c6b8b6a2f1473ccfcc` |
| dusk-10-south-block | A | 20.00, 15.20, 320.00 | 105.86, 133.03, 523.08 | `d68cad4eea6359eed86b16b059b4691cde10609bf9d80e744035c41e2367ba09` |
| dusk-11-heldout-northwest | A | -272.49, 15.20, -192.03 | -324.85, 150.25, -431.59 | `5283cb3ac63c91141ee9f9db2435fcd66d54197760a437c75cd261175cb61753` |
| dusk-12-heldout-southeast | A | 234.16, 15.20, 319.49 | 301.72, 102.76, 162.80 | `899f28bd19fd00ceb6fde5253b9572c10dcf05412e7dd9b387f638b076846aff` |

Representative accepted originals follow; their byte identities are bound above.

![Noon crossing, southeast camera](../../../../artifacts/square1420-critique/runner/run1/payload/noon-03-crossing-se-street.png)

![Dusk crossing, northwest camera](../../../../artifacts/square1420-critique/runner/run1/payload/dusk-02-crossing-nw-street.png)

![Dusk east block](../../../../artifacts/square1420-critique/runner/run1/payload/dusk-08-east-block.png)
