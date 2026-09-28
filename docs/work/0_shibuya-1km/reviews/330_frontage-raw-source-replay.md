# Raw-source pavement replay330 — 2026-09-28

Status: **PASS — the actual raw-source producer reproduced accepted324 byte-for-byte**. The root explicitly released325's expensive-gate resource before dispatch. The prepared command ran exactly once with no retry: `npm run data:pavements`, in `C:/Users/38909/.codex/worktrees/crossing-frontage/maps`, from14:10:13.1612825Z to14:10:30.4816716Z,17.3184264seconds, exit0. `execution.json` and `replay.log` retain the actual run and output.

## Actual producer and inputs

`tools/scene/build-pavements.ts` called the existing complete `buildPavementPresentation` recipe. The run read the four pinned tran GMLs, pinned bridge GML and pinned terrain/roads support meshes restored by327; it regenerated source selection, adaptive presentation, hero/lower composition and authored frontage. The three output paths were absent before dispatch. This was not a helper invocation on cached pavement and did not run `data:setup` or the full-scene builder.

Immediately before dispatch, all seven input hashes and real-directory ancestry were checked against327, and the live recipe/helper source files matched324's pins (`f0a3c534...` and `c3e62b86...`). All seven file lengths and hashes were checked again after completion and are unchanged. `inputs-before.json` and `inputs-after.json` record the full paths and digests. All inputs and output directories are in the isolated worktree; no primary data was written.

## Three emitted files inspected and retained

The actual outputs remain in this worktree's `data/scene/`; they were not replaced by copies of the cached candidate. `output-inspection.json` records their full metadata and inspected provenance.

| Output | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| pavements.mesh | 13,071,300 | 841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6 | Direct complete-buffer comparison equals frozen324. |
| pavement-source.json | 34,410,496 | ab6a66b4da3fda3b0f3e60853f468fd203fd76bc92c56fdaa1d9a5a0dbdd58ea | Equals the reviewed prior source-selection digest. |
| pavement-recipe.json | 5,703,511 | bd77413a040d940aab75ec3ecc4415ef2e29f4a3b344cc0f5e4e0c2440e0c088 | Direct complete-buffer comparison equals frozen324; no changed recipe keys. |

The mesh magic, header and exact encoded-array length agree:312,305vertices and464,616triangles. The source file remains `source-selection-before-support`, with66,538pieces,527ledger rows,29,287duplicate polygons and0projected degenerates. Its four source-file hashes match the raw GML files actually read. The recipe's source-selection hash equals the emitted source bytes; its terrain, roads and bridge hashes match the actual inputs. Its output hash/count/length agree with the emitted mesh. The freshly composed pre-frontage pavement hash remains `3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62`.

The recipe preserves authored presentation authority explicitly: `authored-tsutaya-frontage-v1`, not PLATEAU/survey geometry,14top faces,4end faces,126outside fragments and53affected faces. Its provenance remains byte-identical to324. The bounded geometric review therefore refers to the very bytes that the actual producer now emits; no new geometry or source authority is inferred.

## Resources and cleanup

Execution used the prepared owned TEMP/TMP and npm-cache paths, with `NODE_DISABLE_COMPILE_CACHE=1`. The only npm warning was an informational update notice; no installation ran. After the successful result was inspected, the exact owned temporary directories were checked to stay under `artifacts/frontage330/`, checked for reparse points, then removed. TEMP was empty; npm-cache held only two files totaling1,391bytes. `cleanup.json` records their removal and an empty final producer/browser process inventory. No renderer, browser, server, GPU, test runner or other gate ran.

The seven pinned inputs, source archive and three actual emitted outputs are deliberately retained for the root's next integration checks. All318/324 evidence remains frozen. This330 task wrote only its owned evidence/output paths plus the two exact primary review promotions already recorded during preparation:327 restoration and328 corner contract; no product/source code, paint pin or primary data change occurred.

## Remaining acceptance

This closes the scoped raw-source pavement reproducibility check. Paint census/support checks and deliberate bindings, successor walking integration, the root's combined324-plus-materials native A/B against accepted walking main/current pavement, and final relevant gates/review remain separate. This successful producer replay does not establish visible improvement or authorize a separate geometry-only pixel milestone. No failed check or unresolved source-replay finding remains in330.
