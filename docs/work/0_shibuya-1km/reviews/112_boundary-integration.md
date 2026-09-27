# Independent final S1 native visual review

Date: 2026-09-27. Reviewer: independent Astra visual lane, read-only. Integration owner: root coordinator. Workspace: `C:/Users/38909/Documents/github/maps`, base `24d0247` plus the integrated square-cutout handoff.

## Verdict and bound

**Accept the final S1 square-cutout appearance within the inspected views. No blocking visual or supplemental-harness finding.** I inspected all 109 final images individually through `view_image(detail="original")`: 44 certified primary frames, 56 supplemental boundary frames, and 9 runtime frames. Every PNG matched its manifest SHA-256 before and after viewing and in the final reconciliation. The final checks verified exact expected label rosters, unique coverage and PNG dimensions: 108 images at 1280×720 and the resize image at its native 640×480. No contact sheet substituted for an inspection.

All 56 final supplemental PNGs differ from the earlier `edges-02` bytes. **Zero previous inspections were reused.** Review108 and its original authored artifact remain preliminary, post-run-only evidence; this report does not relabel that older evidence.

This is appearance acceptance plus review of the bounded runtime records and capture instrument. Code correctness, the remaining product acceptance criteria and final Git integration remain with their owners. Still frames do not establish continuous motion quality or absence of transient artifacts between captures. The separate three lifecycle records establish their recorded checks, not every lifecycle possibility.

## Exact final evidence

| Evidence | Identity |
| --- | --- |
| Primary run | `fb79a4bbb841a08f`, started `2026-09-27T08:42:02.250Z` |
| Primary certificate | `artifacts/visual/complete.json`, SHA-256 `b34f1090fefab2357baff72565cb9b2dc955b13f86102386503ab53214b55322` |
| Supplemental envelope | `artifacts/square-cutout/edges-bound-01/bound-complete.json`, SHA-256 `0b519449b2d9d3e78237a3d9a72a0d852971cf917c581793916ea8288ea13a82` |
| Boundary manifest | `artifacts/square-cutout/edges-bound-01/frames.json`, SHA-256 `9e4b3b08ca1b7af80ec75f4a8bb07a7b58c62de68a5c1847e04c80192e6c89d5` |
| Runtime manifest | `artifacts/square-cutout/runtime-bound-01/runtime.json`, SHA-256 `d8f8070fb03ce9a8e3fc0b31419dc1fa2be6834dad6f4d5dcf515e43756e22a1` |
| Handoff source manifest | Worker `artifacts/square-cutout/final-handoff/source-manifest.json`, SHA-256 `139991a25b7e944dec34917cc61f9a2aa23fbc6dc587f69e81e4a97c88884bf8` |
| Handoff five-file harness manifest | Worker `artifacts/square-cutout/final-handoff/harness-manifest.json`, SHA-256 `dd8e25c40a6a8c4c710814d0b449be00ec45200268dbab6490e78b91ad242a03` |
| Primary and supplemental JavaScript | `dist/assets/index-CYD6XH0h.js`, SHA-256 `febb6c659ae24938c6d44579a1ea510df3370ce0d6344743c9fda2131c47fcf2` |
| GPU | NVIDIA GeForce RTX 4090, driver `616.64`, hardware ANGLE D3D11 reported by every frame and both primary lanes |

The primary set is the fresh `artifacts/visual/sweep/{satellite,cartographic}` set and eight `artifacts/visual/hero` frames. The legacy top-level manifest and old top-level PNGs were excluded. All 44 inspected primary hashes match the issued S1 certificate; no P1 certificate was used.

## Appearance findings

The 24 whole-footprint views cover six azimuths in both styles at noon and dusk. The square ground footprint fits with all four corner regions and surrounding margin in every such frame. Visible ground edges are straight and share one footprint. Tall retained buildings can overlap the far silhouette and occlude the exact far ground corner; the close corner views resolve those joins. I found no exterior apron, detached building chip, floating cap, detached shadow or obvious boundary hole.

All 32 close views cover four corners and four side midpoints in both styles at both hours. Terrain side walls meet continuously, and the building section faces are opaque, plain and attached to the retained buildings. The section appearance remains restrained. In `noon-cartographic-corner-se`, the tall plain section at approximately x832–900/y132–280 is filled; the two terrain sides meet near x640/y414. The corresponding Satellite and dusk views show the same closure under different shading.

A small visible residual is retained explicitly: some section feet extend below the adjacent terrain top into the side-wall band. For example, `noon-cartographic-midpoint-north` has a gray attached foot at approximately x647–687/y321–337. The south midpoint views show several smaller attached feet around x1040–1184/y317–325. These remain joined to their sections, without a background gap or detached floating sliver. They do not block this cutout acceptance.

A thin bright line follows some lit top edges. In the inspected frames it remains attached to the geometry; it does not form detached AO or shadow residue. Satellite shaded walls can be nearly black, especially at dusk, while lit walls read olive or brown. That heavy matte appearance limits tonal detail but does not reproduce the previous all-black compositor failure.

The 44 primary frames cover plaza, block and aerial distances plus crossing/approach heroes at noon and dusk. Crossing paint, tactile paving, trees, signs, procedural windows and photographic facade behavior remain coherent in the affected surroundings. Both styles survive the hero comparisons without a section plane intruding into the crossing or an unexplained blank area.

Existing source limitations remain: photographic facades and roof imagery are blurred at close range; some source masses are coarse or flat; the southeast interior street/terrain strip is uneven. The large near tower heavily occludes the central-right block view at azimuth 060 in both styles. These are recorded as review limits or source appearance, not newly attributed to the cutout. Standard 950 m primary aerials crop the near footprint, so full-footprint acceptance rests on the supplemental 1700 m views.

## Runtime evidence

All nine runtime images were independently inspected. The initial full city disappears after the real pan away, leaving the expected background with no residual city geometry or detached shadow, and returns coherently. The records report visible leaves 44 → 0 → 44 and estimated GPU bytes 470,993,287 → 0 → 470,993,287. Loaded count remains 67 and unloaded count remains 0; retained CPU cache stays 644,485,660 bytes. This supports visibility/GPU resource release and return without tile reload, not CPU cache eviction or a measured whole-process GPU allocation.

The actual style dropdown roundtrip produces coherent Cartographic and Satellite images. Native 640×480 resize and return to 1280×720 render correctly; the smaller viewport has some far geometry behind the UI panel. Reloaded dusk renders a coherent city and records completed teardown. Startup was 20,707 ms and reload 18,297 ms in this run.

The intentional missing `data533.b3dm` request produces a readable error naming the exact resource, HTTP 404 and the scene-build remedy. The city is withheld rather than shown as a falsely complete partial load. The four recorded errors all belong to the intentional missing-leaf phase; no ordinary-phase error is recorded.

The primary certificate's three lifecycle records were read and independently checked for completed teardown, empty console/page errors, the same hardware renderer and the same three certified build files. Their actual record hashes are preserved in `evidence-checks.json`. The final normalized-fixture unit log records 86 files and all 754 tests passing; I did not launch another gate.

## Instrument and provenance review

I read the final five-file supplemental harness, the shared binder and the inherited smoke configuration before judging their output. The five integrated harness files match their handoff hashes. The shared binder at `C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/street-detail/capture-prep/bindings.mjs` matches SHA-256 `0d4ce903a04422b58de2676e1820b0f5f11988c3728b374ae960aedcb4a3ac77`. The harness uses pointer, wheel and dropdown controls with read-only harness state; it does not set camera state directly. Exact label coverage was independently checked here because the supplemental wrapper's count checks alone would not establish the roster.

The supplemental pre-inventory began at `08:47:34.948Z`, and the post-inventory finished at `08:54:07.820Z`. Their recorded source, build, harness, served-data and GPU objects are equal. I independently rehashed all recorded current disk files: 147 source files, 4 build files, 28 harness files and 117 served files. All match. The 117 served files total 301,782,754 bytes, including the network data; their digest is `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`, equal to the primary certificate. All three certified primary bundle hashes equal the supplemental build records.

This proves matching disk snapshots at two instants plus GPU identity probes. It does **not** prove immutable intermediate disk reads, uninterrupted GPU ownership, whole-process allocations or every state between snapshots. No missing capture-time evidence was reconstructed for Review108.

Final handoff reconciliation is 13 exact files plus one explicit fixture-only exception: `test/fixtures/cutout-sections.json` changed from 24,282 bytes / SHA-256 `329c23b57bac172cd80ed4c439839eb9610a23e2ebb0980d781666e8cef1df9e` to 23,104 bytes / `9fc9ee4ae173001a4c69582e6bb384966449582a34e1159ede2aa6fbce91e733`. I independently verified that only the 1,178 CR bytes before LF were removed and that parsed JSON is identical. The receipt is `artifacts/cutout-integration-20260927/newline-repair/receipt.json`, SHA-256 `d6b2163bdf095f35384061eaae5df84434835f7e49d8aaab11fbd402cff4608d`. Product source and visual build bytes remain equal to the reviewed capture. The related fixture README byte/hash update is documentation of that exception.

The owned runner recorded exit 0 and cleanup. Verification's final inventories report no owned or omitted live survivors. Its supplemental inventory labels a port4319 field; I separately checked the actual supplemental port4336 at `08:59:58.6102959Z` and found no listener. This reviewer launched no browser, GPU context or server and owns no live resource.

## Retained review artifacts

Authored output root: `C:/Users/38909/Documents/github/maps/artifacts/cutout-final-review-20260927/`. The report is eligible for promotion by the integration owner; operational evidence stays ignored.

- `inspection-ledger.json`: all 109 paths, original manifest entries, before/after hashes and timestamps, final manifest reconciliation, native dimensions and individual observations. SHA-256 `6f87a5b500f3d54fbc1f771648c7df0afafb537ac51dd0794dae977d3158e25b`.
- `evidence-checks.json`: independent final byte, roster, dimension, lifecycle and fixture-exception reconciliation. SHA-256 `bad83898ac7ae80334f786e06fe2fdfedc3a2e808679a19672067b0bfc47554b`.
- `verify-evidence.mjs`: read-only source/evidence checker, writing only its review receipt. SHA-256 `59da68e7895707406b84b85a6b69fce54d8f4cfa1bc061c33b49bc59cd166a70`.

No code, source data or capture harness was edited by this reviewer.
