# Review 354 — source-bound frontage visibility

Date: 2026-09-29. **ACCEPT repair 352 candidate 1 for integration and all five final gates.** The five inspected views resolve 351's unsupported reverse frame while retaining 349's accepted exterior relief. No material source or appearance finding remains within this iteration review. This is not final integrated acceptance.

## Native appearance

Opened all five candidate originals individually at their original 1280x720 resolution. Also opened the rejected 350 reverse plaza 180 original and the accepted 348 near-noon original at the same native resolution. No crops, enhancement or contact sheets were used.

- **Reverse plaza180:** the isolated four uprights and header are absent. The crossing and foreground pavement are exposed cleanly, with no apparent residual frame outline or AO ghost. This resolves the conspicuous artifact in 351's failing view.
- **Plaza240:** the narrow pieces at the extreme left remain beside the visible photographic building edge. They do not read as an isolated frame spanning the crossing. The repair does not hide this exterior angle merely because it appeared in the rejection report.
- **Near noon:** the three open glazed bays, shallow head and four returns retain the accepted 348 architectural reading. The original photograph and lettering remain visible; feet remain grounded and the narrow joins have no conspicuous gap.
- **Noon crossing hero:** the restrained lower-storey relief remains legible beneath TSUTAYA. No new clipping, glare, halo or surrounding change was apparent.
- **Dusk crossing hero:** the surround remains dark and wall-backed, with the accepted sign treatment and scene balance intact. The source photograph's blur remains; this repair does not establish broad realism or surveyed detail.

| Inspected candidate original | SHA-256 |
| --- | --- |
| plaza-az180.png | 235901597a60fb7839ff797d1493ac726c932cbc09d68b60eafb74d8febefcc0 |
| plaza-az240.png | 9c98028cd4d010a743171f990431145558ce7c9c286f662fbe87e369a68d656e |
| hero-satellite-noon-crossing.png | 43e873f99ab21fffaff1f2d58868b2775167565ed71191e00c8feadd368a4ab3 |
| near-satellite-noon-frontage.png | f891faf53c1d8dca7ea2fa64d0844a01daf55369064a18abb13bbbe226aaad7c |
| hero-satellite-dusk-crossing.png | 4e0b4aa44c45f8dfb42358a164dd33c50154409ee36ea1b2599620ba024cfb6a |

The rejected 350 reverse original is `C:/Users/38909/Documents/github/maps/artifacts/frontage350-integration-20260928/native/sweep/satellite/plaza-az180.png`, SHA-256 `c125dc8bcb50ddc4de47c9b60870fc95090d605d842ef4cdec649900ade90cae`. The supporting accepted 348 near original is `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/frontage348-20260928/candidate1/near-satellite-noon-frontage.png`, SHA-256 `be672b1768d1b33b83c65a8c7e138b88416dec22420a672cad79e1cdaaddcf75`. Independently rehashed every original named here.

## Source and pass behavior

Read the actual five-file candidate against base `2146b2b5972b40ea615cce8dcfb4542e191d480c` and the retained 348 helper. The facade hook is byte-identical to 349/350. Geometry, photographic backing, dimensions, grounding, authored metadata and walking-footprint bound retain 348's behavior. The repair adds a visibility predicate and pass ownership, plus focused controls; it does not change source data, lighting, routes, actors or camera controls.

The cause record uses the decoded, digest-bound source triangles rather than a guessed camera angle. Its transformed winding agrees with the admitted outward normal. The glTF photographic material is single-sided. The recorded 350 reverse camera lies about 14.635 m behind that source plane; the source ray misses with FrontSide, hits with DoubleSide, and the old closed jamb still hits. Plaza 240 lies about 3.067 m in front. I read the existing cause extractor and its output, but did not rerun it.

The new helper requires the photographic material to remain FrontSide and checks the transformed source plane, outward normals, GML binding and triangle winding before allocating relief. Beauty, GTAO normal, directional/spot depth and point-light distance materials receive the same source-facing discard. For perspective draws, the predicate is the actual draw camera's signed distance from the exact source plane; a nonpositive distance discards every relief surface. Orthographic draws use the outward normal's view-space Z component, so facing follows ray direction even if the orthographic camera's position crosses the plane. The rule contains no shot names, azimuth ranges, UI state or camera-specific exceptions. At exact tangency it discards; there is no near-plane fade or tolerance band. No through-wall motion or sub-metre near-clip pixel claim is made here.

Read the installed three.js renderer and shader sources to check the camera contract. WebGLProgram declares projectionMatrix, viewMatrix and cameraPosition for these built-in shaders. WebGLRenderer uploads projection/view matrices and any active cameraPosition uniform when the draw camera or program changes, including normal/depth/distance materials. Using projectionMatrix[3][3] avoids depending on the renderer's material-limited isOrthographic upload. WebGLShadowMap uses each mesh's custom depth/distance material and the actual shadow camera. The resulting shadow rule follows the light's source-facing view; it is not an observer-camera shadow toggle. The five views exercise active GTAO and noon directional shadows, but do not independently establish point-light shadow pixels or an orthographic browser control.

The post hook retains agent normal lookup priority and falls back to the frontage WeakMap only for registered relief meshes. Ordinary meshes retain the existing normal override and clipping path. The existing adapter restores original materials and scene override in finally, including errors. AO depth comes from this same normal geometry pass, so hiding only beauty does not leave the old normal/depth silhouette behind.

The tile transaction now captures custom depth and distance materials alongside ordinary materials, using its existing unique resource sets and disposal ledger. The private normal material is owned by the shared beauty material's guarded dispose listener, which removes the five WeakMap entries and disposes that normal once. Transfer, cancellation and rejection controls exercise the actual transaction implementation with five geometries and four materials; every one of these nine resources is asserted to dispose exactly once, including repeated tile disposal after transfer. The focused parser fixture is not a substitute for the final hardware lifecycle lane.

| Actual candidate file | Independently verified SHA-256 |
| --- | --- |
| src/scene/crossing-frontage.ts | 662c7772fa5bd9c52fe5703a76d650223a131a772a70b8ca6deaa4e0cb304b90 |
| src/scene/facade-textures.ts | 487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911 |
| src/render/post.ts | 6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9 |
| src/scene/tile-transaction.ts | c39feae1d563ef29926b652f406eb38cb4100599d02c4c850e638d2b5ede8b75 |
| test/crossing-corner-material.test.ts | d72f0e59bc7d96e7879ca87ff8af49e4d56e163a1a617bba4b24902ab4c388f5 |

The controls inspect emitted shader arithmetic rather than a separate hand-written predicate. They compare it against independently transformed source winding around a full camera ring, cover perspective front/back and orthographic front/back/tangent behavior, run the normal-material swap for authored and ordinary meshes, and refuse changed source sidedness, plane and winding. Existing source-array, UV, exact tile, pavement and walking-envelope checks remain. The recorded red control restores the old 348 helper and fails three newly added checks: both changed-sidedness refusals and emitted facing code. It does not prove that every final control was separately made red.

## Evidence and limits

Packet: `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/frontage352-20260928/`. Independently verified comparison SHA-256 `24178ae4a07cd2e6597364cb1f4e5b62ef95272ac526e28758e43d24371fc542`, candidate manifest SHA-256 `71608877469130a37d53878971c4730e07dab6d17e7f875e17ee6cdb6177f143`, and cause SHA-256 `16bf073af66efd522a2400e6b0b43c8d21440017aaf7861f5b34509d37398cc8`. Rehashed all 12 comparison-bound evidence files and all 150 source/build/harness/runner records in the manifest, with zero mismatches. The five before/after binding sections compare equal. I did not independently recompute the complete served-scene digest.

The manifest names RTX 4090 driver 616.64 through ANGLE D3D11, scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`, ready rendering, idle tiles, zero tile failures, no context loss and zero actors for every frame. Errors and warnings are empty. The three exterior views' full camera/style/lighting/post/population records compare exactly equal to 348. The two 350 reverse references use the same established sweep requests and world target; their published poses are rounded, so they are not an exact camera-equality claim. Read the capture's actual pointer/wheel/pan and dropdown path; it does not set camera state directly. The recorded Cartographic→Satellite dropdown roundtrip preserves the camera and ready rendering. There is no detailed Cartographic appearance verdict.

Read the final focused log showing 34/34 tests across crossing-corner material, rail runtime and normal pass, and the successful candidate build record/log. Build retains the existing large-chunk advisory. Typecheck's empty log alone does not independently prove its exit status; successful typecheck is a worker-reported result pending the final integrated gate. Also read the sealed 352 authored report, SHA-256 `49869dddd5f02d57f869b4d0b1b22501e53a760b75c8a5409087fffa513107b5`, which is consistent with the inspected evidence and names the point-shadow coverage limit. No test, browser, capture, server or gate was launched by this reviewer. Acceptance rests on the inspected source and actual retained artifacts.

The manifest records successful context/browser/browser-server/preview cleanup. Read the owned-run receipt, SHA-256 `e0304adcd3e07ebae51bc2d6f5fbc6c6c31e551bb64997c2025a5b759117a96f`, reporting no retained, unadmitted or scoped survivors and no port listeners. The temporary cleanup record reports its exact owned directory removed without reparse points. These are inspected worker receipts, not a fresh independent process census. This reviewer owns no remaining process or temporary artifact and wrote only this report.

Root still owns integration, all five required gates, the renewed 22 Satellite originals and two basic style-return originals, final independent acceptance and local main commit. Unobserved views, motion, optional walking, population, full-map realism and performance remain outside this iteration verdict.
