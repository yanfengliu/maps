# 1442 — West dusk corridor fixed trial: no adoption

2026-10-17. Owner: corridor1442_lighting. Base main `e8c4952795887b70750a9a7ef36225f5cf18d030`; adopted product `ce107fc619e93c85d98616ea0134abb387668df4`. Root independently opened both prototype originals and agreed to stop. This is a failed local product trial, with no code commit, integration or final acceptance.

The first fixed group fails 1441's visible result. In the lower ordinary street view, the added sources and pavement response remain hidden behind the skimming left street edge. The route does not read as powered. The complementary block image shows five pale pavement ovals without a convincing rhythm of mounted sources and frontage response. The conspicuous pre-existing white uphill reflection remains baseline ownership. No power change, repeated camera rescue, replacement source search, full gate or adoption followed this comparison.

## Selection and finite source population

The ordinary default app ran on RTX 4090/ANGLE D3D11 at 1280×720 with application seed 5970698. The DOM and read-only local walker actor seed were checked and Start walking clicked before the useful captures. The first setup run stopped with zero images because the probe incorrectly read the seed outside `localWalk.actor`; its corrected repeat passed. No product change resolved that observation error.

Exactly two plausible corridors were considered. The northwest shopping-street street view was blocked by the crossing wedge and Tsutaya faces, so it was rejected. The westward Dōgenzaka route had a connected ground view and separated frontage faces in street/block views. Root accepted source fitting provisionally after inspecting those two originals. One deeper diagnostic pose landed behind the south-side buildings. The actual cached road centerline then identified the open lower approach, without changing the chosen corridor or using historical 1424 coordinates.

The lower matched pose is camera `(-54.282595,17.487423,-5.308372)`, target `(-160.000004,15.2,25.000001)`, azimuth 1.850000, polar 1.550000, distance 110.000002 m. The matching block pose has camera `(19.906047,110.455207,-26.577689)`, the same target/azimuth, polar 1.100000 and distance 210.000000 m. Both were reached through real pointer/wheel input using the existing OrbitDriver. Camera state was observed only. Baseline and candidate poses agree within floating-point input settling differences.

Six south-side wall requests were declared before construction. Their complete original photographic UV fields were extracted and inspected. A whole rectangular 0.60×0.18 m back contact was required inside one original source triangle, with GML, source index/position/normal/UV0 and installed parser transform checks. The adjacent receiver is an actual cached pavement point, with triangle vertices and barycentric weights retained. The requested point was 2.8 m outward from each wall, and the finite support search refused distances over 0.25 m. Five admitted requests passed the geometric contact/receiver checks; the sixth was refused from its photographic field before construction.

| Request | Actual wall and result |
| --- | --- |
| west-1 | data518, batch43, face5592, x=-116 m; placed on the solid low band, 2.15 m above its pavement. |
| west-2 | data518, batch4, x=-129 m; placed on the solid lower band, 3.7 m above pavement. |
| west-3 | data518, batch29, x=-147 m; placed on the horizontal spandrel band, 6.3 m above pavement to avoid the lower photographed opening/street field. |
| west-4 | data518, batch52, x≈-168 m; REFUSED: the lower photographic field contains a banner and people, with no admitted solid low mount band. No replacement was requested. |
| west-5 | data518, batch30, x=-187 m; placed on the side pier beside the photographed sign, 3.7 m above pavement. |
| west-6 | data519, batch4, x=-197 m; placed on the solid lower band, 3.7 m above pavement. |

`artifacts/corridor1442/placement-inventory.json` retains all six requested rows, five placed rows and the one refusal, including full GML IDs, wall faces, source UV points, mount/receiver coordinates and refusal reason. `selected-fields.json`, `corridor-source.json`, `field-1.png` through `field-6.png` and the mount UV observations retain the finite source basis. The five placed fronts span 81 m and five distinct GMLs. These fittings are authored presentation, not surveyed lamps or inferred shop occupancy.

## Fixed construction and first comparison

The trial reused the adopted peripheral-mounted-light constructor and true logical tile-owner release. Its only source changes were a finite recipe array and allowing that existing constructor to process matching recipes. The existing east fitting retained its dimensions and power. New fitting housing/lens geometry and materials stayed the adopted 0.60×0.18 m opaque hooded design. No image texture, atlas upgrade, renderer/framework, exposure, sky, bloom or crossing fill changed. Existing source geometry and map ownership remained intact.

Before the first matched comparison, all five new lights were fixed at a 100 cd ceiling, 9 m range, 0.35 rad half-cone, 0.65 penumbra and the existing warm color/lens power. The axis points outward and down toward its actual receiver. The narrow cone was selected to remain outward/downward even at the high spandrel mount; it was not changed after viewing the candidate. The current constructor's owned counts imply 10 beauty meshes, 310 triangles, 26,040 geometry bytes, five local lights and zero new image textures for this group. Actual per-frame added draw count, isolated GPU cost and FPS were not measured.

The baseline and candidate production builds both reached ready state, refined their tiles and rendered without reported page/console errors. Native matched originals were opened individually, not judged from a contact sheet:

| Original under `artifacts/corridor1442/runner/` | SHA-256 |
| --- | --- |
| `source-fit-approach/payload/dusk-01-west-lower-street.png` | `2e8533ee8b512e27f42049d82e269959101100821bf2182d9fd9228c36ac9b7a` |
| `prototype1/payload/dusk-01-west-lower-street.png` | `a09cf3d3848042ad6ece68cbeca86c674d95de54f538b235439a4f4facedfcbb` |
| `source-fit-approach/payload/dusk-02-west-corridor-block.png` | `07b8127ff62741632960b195e54503bc96fdf65241dd33f2d1cf3462430f9424` |
| `prototype1/payload/dusk-02-west-corridor-block.png` | `21bdd537c99e26806e3e3775f053b53713899c7e8638d1b5f264defd2587485a` |

Selection2's five originals, the one failed deeper source-ray view, the two lower source-fit originals and these two candidate originals were inspected at native resolution. Full source fields and annotated UV observations were also inspected. Other recorded source-ray images are observations without a separate appearance verdict. Each capture JSON retains achieved poses, hashes, source/dist/runtime pins before and after, renderer, input events, seed/walker checks, errors and cleanup. The source-freeze file binds the fixed appearance settings and both candidate paths.

The first candidate was already the connected group. Its lower-street failure and block appearance are the stopping evidence. A positive wall-contact count does not compensate for those pixels. This result closes this fixed branch under its declared settings and views; it does not prove that all possible mounted corridor lighting is impossible.

## Checks, preservation and closeout

The exact candidate TypeScript check passed. The reused capture runner built the actual production import path for the baseline and prototype and rendered the two matched views. No source downloads, cache regeneration, source-pin loosening or extra launcher/reporting layer ran. The literal runtime copy contains 156 regular files and 364,187,965 bytes; a fresh per-file hash comparison against primary found zero mismatches. Capture before/after source/runtime pins were unchanged.

The visibility bar failed before local acceptance. New production-path unit/lifetime tests, noon, held-out approach, rear/roof/leakage views, adjacent motion, style switching and the final five primary gates were therefore deliberately not run. General occlusion, noon power behavior, complete lifecycle coverage and performance are not claimed for this trial. Root's native comparison is the direction decision, not an independent integrated code review. None of A1–A14 closes.

Only the two approved candidate paths were staged in the isolated worktree. Git whitespace passed with `core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol`; no owned unstaged delta remained. Raw candidate copies, the original tracked source, the complete staged patch and hash receipt were preserved under `artifacts/corridor1442/unadopted-prototype/` before retirement. The patch passes reverse-apply checking against the candidate. No code commit was made.

`final-resources.json` records all five capture runs: 30 exact owned identities absent, no task marker, preview port4319 clear, and all five verified owned TEMP directories removed. An initial audit matched its own PowerShell command text; its original record is retained and the fresh marker audit excludes only that exact audit PID. Unrelated ancient tail.exe PID4028, historical worktrees/HOLDs and the primary 991 snapshots were untouched. The protected primary facade test remained SHA-256 `48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a`. GPU ownership was released after closeout. Necessary failed-trial evidence remains retained outside the isolated worktree for root's reassessment. After preservation checks, the two owned source paths were restored and the clean checkout was removed normally without force. `retirement.json` confirms checkout, registration and then-owned metadata absent at 16:30:20 UTC; the worktree count fell from 67 to 66 including primary. The old metadata name was independently reused by search1443 at 16:30:43 UTC and was left intact. No unmerged product work remains outside the retained failed-prototype artifact.
