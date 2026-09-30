# Review 349 — physical TSUTAYA frontage

Date: 2026-09-28. **ACCEPT candidate1 for integration and final gates.** The three-view prototype supplies the required local architectural-depth gain with no material finding in the inspected source. This is an iteration acceptance, not final integrated acceptance or surveyed reconstruction.

## Visible result

Inspected all six original 1280x720 images at native resolution before reading the implementation. No crops, enhancement, contact sheets or difference maps were used.

- **Near noon: clear bounded gain.** The lower TSUTAYA photograph now sits behind three open framed bays. A continuous head and four vertical returns give the ground-storey strip a readable structure; the baseline is an uninterrupted photographic plane. The narrow uprights and shallow head are proportionate to the glazing strip. Their feet meet the pavement without an apparent float or penetration.
- **Noon hero: gain survives the established wider view.** The same head and vertical divisions remain distinct beneath the TSUTAYA band, making the building base more legible. The original letters, photographed glazing and authored signs remain readable. The improvement is local and modest; it does not cure the source photograph's blur or establish a city-wide realism gain.
- **Dusk crossing: no material regression.** The new surround darkens naturally with its surroundings while retaining the open photographic backing. I saw no conspicuous clipping, overrun, glow, paint glare or lost lettering. Existing bright-sign treatment and the surrounding scene remain visually consistent with baseline.

## Source and ownership review

Read the actual three-file candidate against base `2146b2b5972b40ea615cce8dcfb4542e191d480c`: new `src/scene/crossing-frontage.ts`, the small `facade-textures.ts` hook and `test/crossing-corner-material.test.ts`. Independently hashed all three; they match the frozen comparison record:

| File | SHA-256 |
| --- | --- |
| src/scene/crossing-frontage.ts | 2444b17cedf2be61623291f9cee9b17895a8a3c34a18ec10969e1bdcb56f4376 |
| src/scene/facade-textures.ts | 487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911 |
| test/crossing-corner-material.test.ts | d56a4c429be61ef68416521702b0b58891d41ac2ed0fb1d1aa831ceafc108f39 |

The hook follows the existing source SHA, GML and original UV0 checks. The helper admits only `data/data518.b3dm`, requires its reviewed digest, and uses the eligible photographic mesh's pinned triangles 494/495. It checks building membership, world plane and outward normal before interpolating original UVs. The original mesh, UVs, photograph and signs remain backing. Geometry and dimensions are explicitly authored assumptions: four 0.22 m jambs and a 0.28 m header, depth 0.34 m beginning 0.01 m in front of the wall. Each added mesh has the verified parent batch ID plus authored metadata with the GML ID and `source: false`; the real building-section pass is now exercised by the complete-plugin test.

The new geometry is attached before cache accounting and follows existing tile ownership. The helper is idempotent. The existing transaction captures the added five geometries and one shared material after success and on rejection/cancellation; the focused cases check single disposal on all three paths. The same neutral surround remains in both styles, with no style-specific reconstruction or new lighting path. Recorded real-control style roundtrips return ready without errors; this is a basic regression check, not Cartographic appearance acceptance.

The helper's two footing planes match the existing pavement authoring constants. The added test pins the accepted pavement and walking-network bytes, checks every jamb foot against the actual pavement within 2 mm, and excludes every walking segment from a conservative whole-surround rectangle expanded by a 0.4 m body envelope. The footprint reaches 0.01–0.35 m from the wall and its top stays below Y19. This establishes a static local clearance bound, not crowd or route-completion qualification.

At root's request, I used the existing read-only `source-face.mjs` extractor to check the head connection. UV interpolation places the four tops at Y18.618470922, 18.618245646, 18.618020370 and 18.617801921. The horizontal header bottom is Y18.618136765. Its maximum gap/overlap is about 0.335 mm before Float32 rounding, with no conspicuous discontinuity in the native near image. No new instrument or gate was added.

## Matched evidence

Packet: `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/frontage348-20260928/`. Independently verified comparison SHA-256 `d87e52ae3e1bfbc547c151e408ad9abe21aacb447d264b89ea8af3f321f36e63` and all six image hashes:

| Original image | Baseline SHA-256 | Candidate1 SHA-256 |
| --- | --- | --- |
| hero-satellite-noon-crossing.png | 4ac1299d2a9cf7350e6dc695bc4464cf93112a420310e96efe79bcbcc584c11a | 676c0c15cb3653017c71f94eaf6cae345177ddba01fbd746e658e027bd91633b |
| near-satellite-noon-frontage.png | 424a435f4fefed53ef6c84b53491b08c1cc3122858c8f4680971e20297ec86db | be672b1768d1b33b83c65a8c7e138b88416dec22420a672cad79e1cdaaddcf75 |
| hero-satellite-dusk-crossing.png | 40357415d40aa728115ff891265c3a8c724332da39d818e5dde83983df186485 | efc2c47697dec3c25c52bef070e7cba9da3da3943d5e030c2b1ed2cfbf2a4001 |

Corresponding manifest cameras, lighting, post settings, population and Satellite style match. Noon frames use 2026-10-15 11:27 JST; dusk uses 17:20 JST. Both arms use RTX 4090 driver 616.64 through ANGLE D3D11. Source/build/scene/harness bindings remain stable within each arm; scene, harness and runner bindings match across arms. Scene digest is `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`. Every image reports ready rendering, idle tiles, zero tile failures and no context loss. Both manifests have empty error/warning arrays and successful browser/context/server cleanup records. Full scene bytes and cleanup process survival were not independently rechecked here.

Read the focused log confirming 26 passing checks and the candidate build log confirming success with the existing large-chunk advisory. Worker reports successful typecheck; its empty log alone is not independent exit-status evidence. I ran no browser, capture, test suite or final gate. The read-only source extractor exited normally; this review owns no remaining process or temporary file. Only this report was written. Root still owns all-five final checks, required final Satellite coverage, integration and cleanup; continuous motion, performance and unobserved views remain outside this verdict.
