# 518 — North facade framing correction

2026-10-01. Source-only proposal at frontage `79d0a03375943121c9f67529b61cb79dabc87ee2`; accepted product remains `39ba67b`. Root owns admission. Existing uncommitted candidates, old recipe and captures are preserved. Only this note was authored; no browser, server, GPU, gate, product or shared-data writes ran.

Opened both frozen 516 baseline north noon originals at native 1280×720. Close projection X466–814/Y238–467 is hidden behind the foreground parapet/roof starting around Y215. Block projection X568–712/Y309–409 leaves only an upper strip around Y295–321. Successful controls therefore do not qualify this facade's appearance.

The admitted surface remains data518/node 0/primitive 1/faces 1101–1104, GML `bldg_46f3cd1c-4dc8-4e7e-b30f-db8c8c31f776`, atlas ROI X1469–1565/Y3067–3166. Its centroid is `(0.917193477362,40.049214022625,-99.916409014543)`, outward normal `(0.201228780702,-0.000025388014,-0.979544270144)`, width 16.190 m and height 12.338 m. Corner extents are X−7.012365–8.846782, Y33.879622–46.218807, Z−101.545436–−98.287334. Roof, lower covered wall and side faces remain excluded.

A provisional correspondence between the central parapet top at close `(640,218)` and block `(640,321)`, using actual 516 poses and the frozen 55° perspective, places that edge 19.265 m outward from the centroid at Y50.797 m. Varying each picked ordinate ±3 px gives 16.450–21.698 m/Y50.195–51.304 m. This is a silhouette estimate, not decoded roof geometry or surveyed identity. Other parapets/equipment remain possible occluders.

Both candidates aim through the ROI centroid; the extrapolated OrbitControls target keeps Y15.2. Horizontal plane standoffs are 24 m and 55 m. Raising and approaching should clear the estimated roof edge: even the lower ROI ray clears the sampled edge estimates by approximately 10 m close and 2 m block. The arithmetic reproduces 451's old four-corner projection within 2e−13 px; that verifies projection, not visibility.

| Candidate | Camera XYZ | Target XYZ | Radius m / azimuth / polar radians | Predicted ROI pixels / central frame width |
| --- | --- | --- | --- | --- |
| Close | `(5.746684215762,72,-123.425471505585)` | `(-2.838865890434,15.2,-81.632610746644)` | `71.039389644353 / 2.938980452786330 / 0.644240046320056` | X480–800/Y287–417;2.33px |
| Block | `(11.984776419528,95,-153.791343889847)` | `(-4.087661910080,15.2,-75.553704034807)` | `112.904789818440 / 2.938980452786330 / 0.785845763829774` | X564–716/Y319–397;1.20px |

Minimal native discriminator: after root admits this north-only visibility correction to 510, capture baseline Satellite/noon close and block through 516's unchanged settled raw-pan, rotation and wheel path. Inspect originals for the actual admitted upper curtain wall, both horizontal ROI edges, readable divisions and clear surrounding margins; a rectangle containing roof pixels fails. Require 451's close frame threshold ≥1.5 px. Only observed visibility supports the matched four north noon/dusk arm replacements, preserving TSUTAYA, seed, sparse samples, tolerances, source/treatment and all prior evidence. Neither candidate has run; native unocclusion, material improvement, temporal, main and whole-map acceptance remain pending.

SHA-256 provenance, freshly rehashed:

| Input | SHA-256 |
| --- | --- |
| `artifacts/facade451/visible-pilot.json` | `df9d6cceb279a1317a26f83e613061ad203ebd76dba0faec22a8ab8db0d32802` |
| `artifacts/facade451/poses.mjs` | `f72455ec068f812a86e65d130eb4e1b68544dc822354544ff10eea8331261092` |
| `artifacts/facade516/recipe.json` | `bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad` |
| `artifacts/facade516/native.mjs` | `cbaa183e0ed6d30aef6a0c1365e988ddd51f2c47890a229f9fbd84063b87eb14` |
| `artifacts/facade516/native-inspection.json` | `1a3ac2dd5231145d1fd7b155ebd6bb1dd0ecd361691217795dd8511c9005cd3c` |
| Baseline north noon close PNG | `2f525d0f6613afd54d364ee338032280b50bb34f902b448be5be36a41e38f0de` |
| Baseline north noon block PNG | `987fde23b8ccc5c84e97aa16cf6bd51a89819593f991606b0c8a5c17b955a634` |

451 retains the unchanged tile SHA `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b` and 4096 atlas SHA `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`; their bytes were not re-decoded by 518.
