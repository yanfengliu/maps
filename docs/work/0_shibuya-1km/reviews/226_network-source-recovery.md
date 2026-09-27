# Recovery226 — two original meshes found; raw OSM remains unavailable

The bounded lookup recovered exact paths for two of the three cached-network inputs. Each was hashed sequentially from its present bytes:

| Input | Exact retained path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Original terrain | [terrain.mesh](C:/Users/38909/Documents/github/maps/artifacts/network/app-motion/candidate/data/scene/terrain.mesh) | 4,413,112 | `fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381` |
| Original roads | [roads.mesh](C:/Users/38909/Documents/github/maps/artifacts/network/app-motion/candidate/data/scene/roads.mesh) | 6,499,344 | `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490` |

Both match the accepted network's recorded provenance exactly. They remain at their retained locations; no copies were installed. They are historical meshes, not a claim that the currently served surfaces are identical.

The original `shibuya-aoi.osm.json`, expected SHA-256 `9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671`, was not found in the assigned scope. This is a scoped unavailable conclusion, not a whole-machine absence claim.

The useful alternative is the explicitly reconstructed [historical response](C:/Users/38909/Documents/github/maps/artifacts/source-lineage/wt/artifacts/lineage-evidence/historical-replay/1-response.bin): 1,211,346 bytes, freshly verified SHA-256 `e5e3f1acc6b951914ab28536fa1b9210ced80ad55d650356989ea9ba4dd7d141`. It does not match the original raw digest. [historical-input.json](C:/Users/38909/Documents/github/maps/artifacts/source-lineage/wt/artifacts/lineage-evidence/historical-input.json) still says `originalRawRecovered: false`, query cutoff `2026-09-07T03:23:56Z`, and actual response database watermark `2026-09-20T01:54:02Z`.

The retained [lineage report](C:/Users/38909/Documents/github/maps/artifacts/source-lineage/wt/artifacts/lineage-evidence/REPORT.md) records complete non-provenance graph equivalence for that historical response with the old generator and original meshes. It explicitly excludes original raw-source recovery and paired source adoption. Recovery226 did not rerun or expand that experiment. The [historical-facts report](C:/Users/38909/Documents/github/maps/artifacts/historical-walking-facts/wt/artifacts/historical-facts-evidence/REPORT.md) likewise preserves the unrecovered-original limitation; derived graph equality does not establish equality of every original tag.

The search covered primary `data` and the named `source-lineage`, `source-lineage-review`, `historical-walking-facts`, `historical-walking-facts-v2`, `historical-facts-integration`, `network` and `cutout-retention-20260927` artifact trees. Filename/metadata selection found 28 mesh, OSM, response or input-sidecar entries; only the two matching mesh candidates and one historical response were content-hashed. Relevant lineage reports and small metadata were read. No archive was extracted, broad content scan or rehash ran, and no network fetch, source/data/Git edit, browser, GPU, gate or simulation replay occurred.

225 can use the recovered mesh bytes for its frozen historical witness. Reproducing the normal generator still requires an explicitly reviewed source choice: the exact original OSM is unavailable here, and the reconstructed response must retain its truthful digest and provenance. Current road/support compatibility remains separate. This lookup is complete; no further salvage search is proposed.
