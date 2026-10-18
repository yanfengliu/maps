# 1493 — Cartographic native frame review

Date: 2026-10-17 local / 2026-10-18 UTC. Owner: /root/train1493_cartographic_native_review. Integration owner: /root.

## Verdict and scope

PASS for basic Cartographic continuity in the 22 inspected static frames, bound to the final source and gate seal below. No material pixel finding blocks this bounded train and antialiasing milestone. This is independent native-image review, not a CLI review or source review. It does not accept detailed Cartographic polish or any full Shibuya criterion.

I read the applicable AGENTS.md, local rules, lessons, current plan and canonical review runbook. The Satellite priority and deferred Cartographic polish remain in force. I inspected each of the 18 sweep and four hero originals separately at native 1280×720, at most three images per tool response. No contact sheet substituted for an original. I did not inspect the stale root-level visual images.

## Observations

- Plaza az000/060/120/180/240/300: zebra crossings retain separate readable stripes; signal heads remain distinct where visible; paving seams, tactile paths, curbs, façade/window grids and tree silhouettes remain coherent. I found no material blurred/doubled outline, stripe breakup, missing ground patch or visible culling failure in these sampled pixels.
- Block az000/060/120/180/240/300: visible façade grids, roof edges, streets and exposed railway spans remain coherent. Block az060 is substantially occluded by the foreground building, chiefly x600–1180; that region cannot establish the condition of hidden scene geometry. The one permitted retained comparison confirms this occlusion is already present in candidate1, not evidence of a new visibility regression.
- Overhead az000/060/120/180/240/300: the sampled city footprint and exposed rail/road corridors remain present with coherent building silhouettes. Pixel scale and occlusion prevent these aggregate views from accepting every individual building, road mark or AOI surface.
- Hero dusk/noon crossing: foreground paving and tactile lines, the crossing stripes, tree edges and surrounding façade grids remain readable in both lighting states. Hero dusk/noon approach: the exposed curved rail corridor and surrounding buildings remain continuous in the visible regions. Static shots do not establish train motion, temporal history behavior or continuous ghosting absence.

The bounded comparison is `artifacts/train1473/candidate1-public-visual/sweep/cartographic/block-az060.png`, SHA-256 `0c6da1730aa58290637123391db32bd93345e4f2cd7655c31e3c780cd1ca946b`, matching its retained manifest. Its pose and the current pose are azimuth 1.0472 rad, polar 1.28 rad, distance 220 m. No wider baseline comparison or full delta proof is claimed.

## Evidence binding

Current verdict run: `cd4c31e67246bd8f`, started `2026-10-18T00:23:57.717Z`, certified `2026-10-18T00:29:14.395Z`. GPU is NVIDIA GeForce RTX 4090, driver 616.64. The certificate names ANGLE NVIDIA RTX 4090 Direct3D11 for both appearance and lifecycle; its three lifecycle records have no console/page errors and completed teardown.

The actual 22 file hashes matched the fresh Cartographic manifest / hero manifest, and a later independent read matched all 22 against complete.json and the stored inspection hashes. PNG IHDR dimensions are 1280×720 for all 22. An initial auxiliary PowerShell dimension expression shifted bytes without casting and returned truncated values; explicit integer casts corrected the measurement, with no image or manifest mutation. That rejected instrument output is not a product failure.

- `artifacts/visual/run.json`: `1919d889cb98496560d6523d9390a4ad0e80cb36546def69d4d5d3f0dd7d25a4`.
- `artifacts/visual/sweep/cartographic/manifest.json`: `c5d08a9e8f8a789d8936f339e0643fbb37156580bf6db93b98b43475c548ff35`.
- `artifacts/visual/hero/hero.json`: `ba13caf01b77055d5b23fed1196b64d167c384067026c41daffa8c8391c000b4`.
- `artifacts/visual/complete.json`: `5df98f855fb1532382fe58a5944e7dfc5386a293fe11255f2fa1955239804135`.
- Candidate provenance file `artifacts/train1473/candidate4-f1-freeze.json`: `d9c8061d3f73be8e70361ebbaf0b9f62bea7fd8701e563b6e17db86d3a6f53e8`. I verified this file's hash and, after the final seal arrived, all 13 listed current PRIMARY file hashes match it. This is byte binding, not a second source correctness review.

Sweep poses are the six azimuths 0/60/120/180/240/300 degrees at plaza 45 m / polar 1.5 rad, block 220 m / 1.28 rad, and overhead 950 m / 0.62 rad. Hero poses are azimuth approximately pi/4, crossing approximately 45 m / 1.5 rad and approach approximately 220 m / 1.28 rad. Exact recorded poses remain in the pinned manifests.

## Final seal

Finalization: I read `artifacts/train1473/primary-grid-gates/final-seal.json` and independently verified SHA-256 `e9820692c53b408982b12d80fe8e7a5575f14d573aa3495e55216ba410eaa7f7`. Its 22 Cartographic frame hashes exactly match my stored inspection pins. The candidate-freeze and current complete-certificate hashes match its recorded values. All 13 current source-file hashes listed by the candidate freeze match. These checks release the earlier source/gate-binding condition for this native static review.

The seal reports all five public gates PASS in 429.011 seconds: build, types, 136 unit files / 1,187 tests, visual 44 frames / three hardware lifecycles, and audit at the high threshold with two existing moderate advisories. It records 679 unchanged frozen inputs, the same 156-file / 364,187,965-byte scene and 25-file / 224,465-byte harness, and cleanup with 99 recorded identities, zero exact survivors, zero markers, no listener on 4319 and all five temporary directories removed. I read this evidence; I did not rerun those gates or independently rescan the 679-input inventory.

Remote gates are NOT RUN before the root code commit. Main merge/push and final integrated acceptance remain root-owned. All 35 implementation items / 14 criteria remain OPEN beyond this bounded milestone.

## Inspected original digests

| File | Actual SHA-256 |
| --- | --- |
| `artifacts/visual/sweep/cartographic/plaza-az000.png` | `9fe680469661c93dd03570e08bc9cc1bc8e3556884e9a419d9929d006b96f93e` |
| `artifacts/visual/sweep/cartographic/plaza-az060.png` | `5939b2a20290628f6bae771af2c89579d08dbe17c8f29a94854be71bcd2c03dd` |
| `artifacts/visual/sweep/cartographic/plaza-az120.png` | `67b716c5c06413f51d6f71d1b59e7860a04650fe8977bb8c916817d68daedfec` |
| `artifacts/visual/sweep/cartographic/plaza-az180.png` | `76ffd4f1e5d1a417b10a676199a7392dec4cc3990bdf54745f23a1c4d612effd` |
| `artifacts/visual/sweep/cartographic/plaza-az240.png` | `dc41cdd9c96d656e89b9d3166f27e2b3687162eb505635027fd11b3c162baa38` |
| `artifacts/visual/sweep/cartographic/plaza-az300.png` | `da8b924d8599537c89c42b6a1b0b644defd1c8ae029b7aa8b41863eaa08356b3` |
| `artifacts/visual/sweep/cartographic/block-az000.png` | `d1e3cc6ae978a376dbcc9993aefed8b7dd506298ef880784979672bb111c583c` |
| `artifacts/visual/sweep/cartographic/block-az060.png` | `471ff761b05239403b6f89a8e099f529db29dcb2a647c66f8d551ee0f4708730` |
| `artifacts/visual/sweep/cartographic/block-az120.png` | `171f628a53aa462991455d6a51175e85b6be4470bb216f96199f1ed3e8db44a4` |
| `artifacts/visual/sweep/cartographic/block-az180.png` | `1257571a55f18883693f7d348a4770167b862ddf39233ec38b23cd3569243bf2` |
| `artifacts/visual/sweep/cartographic/block-az240.png` | `08b29ea952d1d351d9aa30e8d3c4671aedf1588a1ac2fde7eaa51c1f9ae58306` |
| `artifacts/visual/sweep/cartographic/block-az300.png` | `586e962257feef8533989ac4d0245f1f367d674d0ea1b16330696b55274137af` |
| `artifacts/visual/sweep/cartographic/overhead-az000.png` | `904b8bc850debde14074bdf58252b3a1e7c25ca6aff138216db21a1d639350e0` |
| `artifacts/visual/sweep/cartographic/overhead-az060.png` | `cc4969c8ad09d380bc7bd0ec422a96755c1f74751f07ea91ae1138ff79d78dd8` |
| `artifacts/visual/sweep/cartographic/overhead-az120.png` | `2c257cc062087b1144281afd64b8fdf33431b41d8455ac0087eb8f5e27b5176a` |
| `artifacts/visual/sweep/cartographic/overhead-az180.png` | `5eb67866b91d276bb6fb6d5fd9b4dad778d127e3985e2958ca8491e960c914a0` |
| `artifacts/visual/sweep/cartographic/overhead-az240.png` | `01f7e639f3b3b4b460233b8dd6b8d02884908156632fffa8a758ed9ccbcf26c7` |
| `artifacts/visual/sweep/cartographic/overhead-az300.png` | `591da296ab85e9402f890cb64d2654606a916b4ec8e35fb4c35807e33b52401a` |
| `artifacts/visual/hero/hero-cartographic-dusk-crossing.png` | `c08392d8bd068d5201a0140d4a5118abad3237612114ab21ccf8991f24229861` |
| `artifacts/visual/hero/hero-cartographic-dusk-approach.png` | `511dffaa0b39e0e024ab74f06d41804dc4f0f01355a38e8729488e852f03c7cf` |
| `artifacts/visual/hero/hero-cartographic-noon-crossing.png` | `27c18db73f6a1461c846416c8107de498bc1d97504d581ffa9fd2f1597b59585` |
| `artifacts/visual/hero/hero-cartographic-noon-approach.png` | `6745614a907fc401ff0149e7f4e05c98d9270cfeaa4970a8ead8f143187044e5` |

## Passed, not run, and limits

PASS: 22 native original inspections; 22 actual hashes against fresh per-specification manifests; 22 later actual hashes against complete.json and inspection pins; 22 native dimensions; one retained native comparison and its manifest hash. The certificate was read after inspection; these are current file observations, not reliance on a remembered green run.

DID NOT RUN in this reviewer: browser or server, GPU capture, runtime tests, build/types/unit/audit commands, source review, interactive style switching, randomized camera exploration, motion sequence inspection, performance or population checks, or any Git operation. No browser/GUI process, server or temporary runtime resource was launched. The only intended write is this ignored handoff report.

This review does not establish whole-AOI correctness, every hidden surface, continuous moving-image quality, GPU milliseconds, headroom, realistic population performance, allocation/lifetime behavior, complete train operation, or final acceptance of the 35 items / 14 criteria. It does not replace the separate Satellite/source/style-return review. Final source correspondence, complete five-gate acceptance, merge/push and integration remain root-owned.
