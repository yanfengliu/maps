# Input restoration327 — 2026-09-28

Status: **seven exact pavement-producer inputs restored and verified in an isolated real worktree data tree**. Ready for the root to schedule the full raw-source pavement replay after its current gate. No producer, test, build, browser, server, GPU or full-scene generation ran. This report supersedes the earlier prerequisite note's missing-input status; it does not supersede324's remaining validation requirements.

Workspace: `C:/Users/38909/.codex/worktrees/crossing-frontage/maps`. All destination files and every ancestor were inspected for reparse points; none are links or junctions. The dependency-only node_modules junction was not changed or used for writes. The owned data tree contains exactly eight files: the seven inputs below and the pinned archive retained for future replay/restoration.

## Search, source and restoration

The bounded filename search covered `C:/Users/38909/.codex/worktrees` and primary `maps/artifacts`, using only the five exact GML basenames and pinned ZIP basename. It found four hash-matching tran files under primary `artifacts/network/review9-frozen/source/data/plateau/udx/tran/` and other retained candidate caches. It found no named bridge GML or archive in those searched roots. There was no whole-machine or unrelated private-file search. Six safe inputs were initially copied: four Review9 tran files and the primary scene's terrain/roads meshes; their hashes were checked before and after copy.

The missing bridge source required the authorized archive. Windows curl downloaded the exact URL from `tools/data/manifest.ts` to an owned `.part` path under this worktree's `data/raw/`; HTTP200,649,322,807 bytes,23.910484seconds, exit0. The full file's length and SHA-256 were checked before it was renamed to the retained archive or extracted: `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`. Source and HTTP details are in `archive.json`, `download.log` and `download-headers.txt`.

The repository's existing extraction mechanism, `C:/Program Files/Git/usr/bin/unzip.exe`, ran with `-q -o`, the verified archive, only the four named `udx/tran/` members and `udx/brid/53393596_brid_6697_op.gml`, and destination this worktree's real `data/plateau/`. Exit0; `extraction.log` is empty. This also confirmed the four already copied tran files from the exact archive. No other archive member, fresh source substitute, dependency or extraction framework was introduced.

## Final exact input inventory

Paths are relative to `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/data/`. `input-inventory.json` records full absolute paths, expected/actual hashes, lengths, copy/extraction method and the non-reparse ancestor check.

| File | Bytes | Verified SHA-256 |
| --- | ---: | --- |
| scene/terrain.mesh | 4,415,496 | c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773 |
| scene/roads.mesh | 6,509,676 | 0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc |
| plateau/udx/tran/53393585_tran_6697_op.gml | 10,143,334 | 8457ce05ff6aab157e36bb614582478ae8d0b0db320e0a95e6552d6ac7108921 |
| plateau/udx/tran/53393586_tran_6697_op.gml | 14,463,793 | 18b8b0c1afb307546073c6b0910bba171a5aea82e9cac06215e1a6be7bd3746b |
| plateau/udx/tran/53393595_tran_6697_op.gml | 13,335,102 | a74cc75aa06a9a57dd2d9ecae644267779eb6ac1e2ca43dc53f04eb6b2fa86ee |
| plateau/udx/tran/53393596_tran_6697_op.gml | 21,792,533 | ad04f9b05a29140988178b84987e9ff7aae0fac36279fc79640db9e45a6cc317 |
| plateau/udx/brid/53393596_brid_6697_op.gml | 3,197,016 | ab031fb56e944c4975ec7588ab291416add55c191638c98b4b4e5e720af9d23d |

Retained archive: `data/raw/13113_shibuya-ku_pref_2025_citygml_1_op.zip`,649,322,807 bytes, exact SHA above. It remains intentionally available for future scoped restoration. The existing cached pavement is not a replay input and was not copied into this worktree.

## Authorized exact review promotions

Only the two requested primary documentation files were added; source and destination bytes were checked equal, and no plan was edited:

- `docs/work/0_shibuya-1km/reviews/324_frontage-winding-repair.md` from frozen324 REPORT,5,112 bytes, SHA-256 `84c7c38cacc33097ab61e9d1e108fb9c96f96021498388c4125cd18f8311f3ab`.
- `docs/work/0_shibuya-1km/reviews/324a_frontage-winding-review.md` from independent324 addendum,5,344 bytes, SHA-256 `d887faa021bd2d4988d89b4f917d2be195fa7fab1427a05c8efed083e5967ce8`.

`promoted-reviews.json` records their full source/destination paths. No primary data or product file was written. The six original copy sources still match their starting hashes. All earlier318/323/324 evidence was read-only.

## Cleanup and handoff

Curl and unzip exited. The verified `.part` file became the retained ZIP; no partial archive or transient chunks remain. The task-owned TEMP/TMP directory was empty and removed by exact absolute path. The final elevated process inventory found no task-owned curl/unzip/node/browser process. `cleanup.json` records these checks.

The root may now schedule `npm run data:pavements` from crossing-frontage against these inputs, using its owned run environment, then require actual output mesh SHA `841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6` and inspect its emitted source/recipe records. That replay, paint census/rebinding, successor walking bindings, native comparison and full gates were deliberately not run here. This task leaves the isolated inputs, pinned archive and restoration evidence for that active work.
