# Review 006: integration

## Target

Reviewed on 2026-10-20: the final photo-grounded Stanford architecture increment, integrated with the held-input milestone `89cb74e7af58bb8716f0a451a80392c0fc3451fc`. This is a bounded architectural model review, not a survey of all 648 footprints or certification of the embedded browser. The independent reviewer used `C:/Users/38909/Documents/github/maps/artifacts/held-input-review/worktree`. Its checkout remains based on `cd5ade1565ebb9a9904d894620bdd2c443392edf`; the owner copied the frozen candidate into it. Only the nine files below constitute this architecture target. The prior input/dependency review remains [005_held-input.md](C:/Users/38909/Documents/github/maps/docs/work/0_bay-area-stanford/reviews/005_held-input.md).

| File | Reviewed SHA-256 |
| --- | --- |
| `src/compose-building-parts.ts` | `59f6fd289dc2dccdf8193b32dc6c30165cfd992a21db99cad266d7e6bf46026a` |
| `src/building-architecture.ts` | `b955d54f570e27f972d16c553a7900ebc1b5b0f472b889dac01f4c1133fa5795` |
| `src/building-geometry.ts` | `a48189e8f9f9079d20cbc538640538630f6895e31f7d421637c5960c325215c6` |
| `src/building-details.ts` | `2fc37989b987b38a18cc0ef282c0f27fc47fb8b11ff0fcc33ccd6dff1e60756b` |
| `src/memorial-church.ts` | `cb4259865fd5936359515dbdee115a3614792b4a9e1618722c75bb4e56d01c0c` |
| `src/main.ts` | `f3af8030e989c518045b12ebf710dde9a5bd6bc05dd073c714b1e2d2d2b354bf` |
| `test/building-details.test.mjs` | `89e13633c23523408f9fd5ab934995120935d34b07484d62fc2132d95dddb53e` |
| `README.md` | `33953904f0b91d9362747c68e4475548162a2a2cbecc5cef9e05c34637a05d6a` |
| `docs/work/0_bay-area-stanford/architecture-references.md` | `a312846c33f7107ab3c44f1e01dac24573688f27d2c9b74c8308b6d29f598196` |

The exact candidate files, including new modules, are preserved under the review worktree's ignored `tmp/review-runs/006/target/`, with `target-hashes.json` and the tracked patch relative to the input milestone. The owner must bind these bytes to a recoverable commit before deleting that evidence. The last change narrowed the reference document's containment claim; no executable bytes changed after the visual and integrated smoke runs.

## Reviewers and coverage

Independent Codex reviewer: `held_architecture_review`. I read the complete changed modules and tests, adjacent loading/rendering/lifecycle code, the task contract, local rules and lessons, reference documentation, browser verification scripts and outputs. I inspected all fifteen final map captures and five actual reference photographs at native resolution. I independently ran a bounded Node geometry oracle using triangle clipping, without a browser or server. I made no product source changes and did not repeat the owner's expensive gates.

The independent Claude lane is unavailable. As recorded in review 005, installed Claude 2.1.281 initialized with the canonical model and effort but exited 1 with `API Error: Connection refused — a firewall or proxy may be blocking it (ECONNREFUSED)`. Final `modelUsage` was empty and no source was read. This is an abstention, not approval. No further attempt or unpinned fallback was made. The raw lane evidence remains under `tmp/review-runs/005/` while the owner retains the worktree.

## Reports

### Independent Codex source and evidence review

No material finding remains for the bounded model increment. Public source bytes and original properties remain intact. The architecture metadata distinguishes mapped floor levels, estimates, the Quad reference profile and Roble's official description. Explicit zero levels stay zero. Open structures and special landmark parts do not acquire a fabricated verified floor count. The original height remains the source envelope, while derived wall and roof heights control the model at [src/building-geometry.ts:41](C:/Users/38909/Documents/github/maps/src/building-geometry.ts:41). Roof-shape tags take priority over profile defaults. Building cards disclose those distinctions at [src/building-architecture.ts:49](C:/Users/38909/Documents/github/maps/src/building-architecture.ts:49).

The render-only Quad subtraction at [src/compose-building-parts.ts:9](C:/Users/38909/Documents/github/maps/src/compose-building-parts.ts:9) is deliberately specific to the pinned source boundaries. It reuses source coordinates, detects unsupported crossings and rejects branching, open or disconnected results. It is not a general polygon clipping library. The independent oracle triangulated the original and derived polygons and used a separate convex clipping implementation to measure their intersections. Original Quad area is 31,268.78209572017 m²; measured Quad/church overlap is 1,893.7732157412609 m²; retained area is 29,375.008879978894 m². The area residual is approximately 1.46e-11 m². Remaining church overlap is zero, and every original courtyard has zero overlap within 1.4e-12 m² numerical error. All derived vertices come from the source. The seven-to-six enclosed-hole change opens one original courtyard to the exterior without filling it. The overlap was measured independently, not assumed to equal the full church area.

The original Quad five-level tag and 18 m height hint remain preserved. The low 6.2 m eave / 9.5 m roof profile agrees with the low arcade seen in the current Stanford church and tower photographs, and is disclosed as a modeled reference profile. Memorial Church has separate nave, aisle, transept, chancel, Round Room and crossing masses. The actual front photograph supports the three portals and central upper window with flanking triplets. The native front, rear, side, overhead and oblique captures show the church rather than the former occluding Quad facade. The dedicated mesh uses solid architectural surfaces instead of generic repeated facade windows. Current-form evidence is in [Stanford ORSL's photograph and plan](https://orsl.stanford.edu/memorial-church) and [Stanford's reconstruction history](https://quake06.stanford.edu/4-repair-monuments).

Bing's three tall western bays continue across its two actual source edges rather than restarting on each edge. Roble has three rows with a distinct official-description provenance. Hoover retains its mapped stepped parts and sparse shaft treatment; its disclosure does not confuse the official 14th-floor observation deck with a verified total count. The inspected references and limits are recorded in [architecture-references.md](C:/Users/38909/Documents/github/maps/docs/work/0_bay-area-stanford/architecture-references.md). Roble's more elaborate entrance and roof, Bing's ornament, and Huang's rotunda remain approximations or omissions, as disclosed. The ordinary campus profiles do not establish individual window counts or surveyed dimensions.

One small precision issue was found in the verification wording. The tests establish church roof vertex containment. A triangle joining contained vertices across a concave boundary can still overhang. The independent oracle measured about 0.1607 m² of projected roof-triangle overhang in total, less than 0.01% of the church footprint. No material visual intrusion appeared in the inspected native captures. The owner corrected the document to state vertex containment and explicitly disclose this modeled approximation. Exact whole-triangle containment is not claimed.

Outside-diff reads included the campus fetch/validation/error path at [src/main.ts:267](C:/Users/38909/Documents/github/maps/src/main.ts:267), source and native extrusion attachment at [src/main.ts:289](C:/Users/38909/Documents/github/maps/src/main.ts:289), worker buffer transfer/error handling at [src/building-worker.ts:3](C:/Users/38909/Documents/github/maps/src/building-worker.ts:3), GPU/worker/context lifecycle at [src/building-details.ts:180](C:/Users/38909/Documents/github/maps/src/building-details.ts:180), and pinned provenance assertions at [test/campus-data.test.mjs:138](C:/Users/38909/Documents/github/maps/test/campus-data.test.mjs:138). The altered geometry still fits the existing worker and two-draw renderer. Selection reads original identity and source-height information; actual map clicks select the church. The final `main.ts` architecture changes preserve the reviewed held-input implementation.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F0 | The overlapping parent Quad could occlude the dedicated church, and its five-level facade contradicted the inspected low arcades. | Resolved in the supplied candidate before this final review. Source-edge subtraction and the disclosed low model profile address the visual defect without altering public source data. | Independent intersection/area oracle, preserved courtyard checks and native front/side/plan captures. |
| F1 | The reference document's broad roof-containment statement exceeded its vertex-only test; tiny concave-edge triangle overhang exists. | Resolved by accurate wording and explicit disclosure. The measured approximation is nonmaterial for this stylized model. | Final reference document hash above; no geometry or test change. |

## Verification

I verified the unchanged public hashes: `stanford-buildings.geojson` = `a27c564f8c7472bfddafd28e3328cffdf12acadb2f9854da1f1e429fd1d41d2f`; `stanford-campus.geojson` = `e8890575c26f83f0b6eec7beb710520b74fb400d7e8509b0814d64ead67ed9dc`; `stanford-provenance.json` = `3f13cf64c82523b2f8916fd24bea7289e3f7284dba012669106086e78ab2d572`. The oracle also confirms preparation leaves the input objects unchanged. Its script SHA-256 is `f96a7a0662e012101e09fe3eceb54e6c0c9646084044aa4064621e1dacf9cfe5`, and its result SHA-256 is `5081b1b6af01913f86e4b7148a96421835bf18cf9fe3163449824b35d1048adc`; both are under `tmp/review-runs/006/`.

The source tests cover distinct mapped/estimated/official floor handling, explicit zero levels, independently inspected emitted facade rows, continuous Bing bays, church front openings, source preservation, topology/area/courtyards, finite vertical bounds and geometry budgets. The final mesh has 99,007 triangles and 15,445,092 bytes. The integration owner reports the required final typecheck, all 39 tests, build and audit passing with zero audit vulnerabilities. The pre-existing build warning for a chunk larger than 500 kB remains. I did not rerun those gates; this review supplies independent source, image and geometry evidence.

I read the architecture browser script and `artifacts/stanford-landmarks/verification/visual.json`. Real search, zoom buttons, rotation keys/drags and tilt controls produced fifteen views, two successful church clicks, held-input/wheel motion and WebGL context recovery. Context recovery returned to 99,007 triangles and two draws without application errors. The recorded motion cadence is MapLibre render-event telemetry on the named desktop viewport/GPU, not physical display-refresh measurement. The initial standalone Quad reference request did not produce a usable photograph; the visible arcades in the successfully inspected official church and tower photographs provide that reference. The unsuccessful Huang direct-image navigation is documented; the page-rendered aerial was inspected and no dedicated Huang reconstruction is claimed.

I also read the final primary `artifacts/held-wasd/verification/primary-final/smoke.js` and `smoke.json`: all 23 assertions pass. One real non-repeat W keydown produces late movement and release stops it. Equal wheel input yields a zoom change of `0.5733017913063296` both normally and during held-W. Middle-drag tilt, gentle right-drag rotation, Stanford/Main Quad navigation, church search/disclosure, actual canvas selection and return to the regional overview pass without application/browser errors. Before/after source manifests match and bind the final executable bytes. These checks supplement the prior 41 input assertions and nine focused wheel checks recorded in review 005.

The fifteen map images and five references below were each inspected at native resolution. I independently recomputed every digest and matched the worker manifest. Files remain under ignored `artifacts/stanford-landmarks/verification/output/playwright/` while retained evidence is needed.

| Inspected image | SHA-256 |
| --- | --- |
| `01-campus.png` | `cca0e559e0be588a9d0e673dae444062404b3661d6420f50c3d42ddaad0aefad` |
| `02-main-quad.png` | `9db6b36501cca120622153b78f96b00a777d5d457f87f2fb094bd677964665cd` |
| `03-church-disclosure.png` | `9a504c23799a9a085a2a1cf54a4a3c5e9c89cec718cf71e92ca48615d470f83e` |
| `04-church-rear.png` | `b714a0e9bfc53720440276eadc31d979b5cfb4f0b5dd71d6dbc24b9d7b7ee487` |
| `05-church-front.png` | `2e60412aa612e0884a85700f95858fd55d176e74125dd30045aadac8eb3e948b` |
| `06-church-east.png` | `f26699dcfdf2333789f331e657a7f91954d88d778f48400bf65b97569d85d841` |
| `07-church-west.png` | `2dfbe98d73c46810d363f8f97d3e2aaf848f19a62700f0921dde16e44e3d8b12` |
| `08-church-plan.png` | `0e6bbc4f4a45b0d144ca778090bc19130605019adf9457f0e76fa1106a257117` |
| `09-church-oblique.png` | `1dab69b2edfa8376b0544e7a6136a263d6c15ff0f092acad89661bb17cbf1852` |
| `10-hoover.png` | `7529092d3c0e966ecf0d33dfa28477ff951bc584d5fedaef12225c2e02158648` |
| `11-overview-return.png` | `6843c34c37d4e77aa23467aa5faf9a0c5466ec6ebf127305a44b0f22e7a5aa80` |
| `12-church-mobile.png` | `95e76c15dea005175f9c4a0db787d0740e78606a04139893e1a0d8170ca82515` |
| `13-bing-west.png` | `76b35935a4cf7e96dcbd4cbf8a7d2f89993044846c5e9ea7e6a1afa71b6c55b3` |
| `14-roble.png` | `94de54353602c9ea8e8ef5b22be1901f7b0a895e97b05d8181cbf66d07455dca` |
| `15-context-recovered.png` | `2406f6ac3fe2d2e138546739465b172e090fe42cfe74df7ff7c0298eb4cfcf18` |
| `reference-bing-wing.png` | `d127cffa0314110b360b5495bdac8d4956f2036e019054cf1121e9c6c15ad54e` |
| `reference-church.png` | `9a21740b8a7f6258fd0670e62d9f43a46e4b2c7637bc4f80db6747cf95d0351e` |
| `reference-hoover.png` | `5e0fea766b1023b74013a87b63e94c47c23bc571a81fea9cd41759aa919a7073` |
| `reference-huang.png` | `21c5f8529d0d5bb46eac61abb89cf4e24eebfa3c80b1a2249bb28b5a56ed8b6c` |
| `reference-roble.png` | `75fa1a4cb27438fdfe6092289fcf2f3b36e6fcb6ef72408d4248d8b56d6cf2a2` |

## Outcome

GO for this exact bounded architecture increment with no open material source or visual finding. The independent Claude review remains unavailable. The native headless results do not diagnose or resolve the user's embedded-browser hang. Individual nonlandmark windows, exact campus-wide floor counts, surveyed dimensions, display-refresh performance and untested hardware remain outside the demonstrated bounds. The model is deliberately stylized and its original source heights remain estimates where tagged that way.

This reviewer launched no browsers or servers. The integration owner's final permitted process census at `artifacts/browser-hang/final-resource-census.json` records no task-owned browser/GUI leftovers and no children of reviewer PID 44732; the separately retained localhost servers remain owner-managed. Source/report integration, final commit, required remote checks and worktree/evidence cleanup remain with the integration owner. This review is not itself a merge or remote-gate result.
