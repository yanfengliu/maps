# 473 — Original road ring preservation

2026-10-01. Prepared after root accepted 470 and independent 472's staged proof. Root owns runtime admission/integration. Writes are this review and ignored `artifacts/roads473/`; original 412/466/470 and source bytes are unchanged. No Node, import, proof, test or gate ran.

`road-source.ts` extends 466's selection/identity logic. It directly retains every parsed closed latitude/longitude/height triple and full-precision projected exterior/interiors. Published polygon IDs and disclosed ordinal diagnostics retain road/area/function/LOD. Existing project projection and unchanged 466 clipping/area primitives remain authoritative. Outcomes retain admitted, outside-AOI, below-area-threshold and refused parents/polygons. A nonempty exterior clip with interiors throws an identity-bearing refusal retaining the rings; exterior area is explicitly labeled, never called hole-excluded area. There is no topology engine, triangulation, paint or source-skipping fallback.

Legacy `readRoadTreatmentSources` invocation throws an actionable consumer-adapter refusal. No `.ring` alias exists. This blocks unchanged pruning-style use without importing its historical writer.

The prepared proof keeps all nine 466 controls; its hole control is now a disclosed analytic in-AOI refusal. Six additions check both actual source polygons, nonfinite/open actual interiors before exclusion, legacy refusal and a dropped-interior mutation. The oracle reads pinned original GML directly, retains original parent/function/LOD wrappers and polygon hash, compares every original/projected coordinate, invokes unchanged 466 clipping on independently projected originals, and checks a separating edge of existing `AOI_CORNERS_WORLD`. It never uses 470 formatted triples as coordinates. The mutant must import successfully before failing the intended projected-interior assertion.

Four exact sources are prepared through baseline 466 and preserved 473. Parent outcomes and any next refusal/unobserved remainder are retained; refusal yields exit 2. Actual full-source parsing remains unrun and may reveal another blocker.

Frozen SHA-256:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `road-source.ts` | 8321 | `519180be81a705c6d464f8d2b7c88cccb5983cb48bddcf8063f2482999e25e76` |
| `road-source-dropped-interior.ts` | 8368 | `fd551312e80eaa5a7840c4c556790ea9e77d52fe7d55688f68e58861685d3adc` |
| `prove-parser.mjs` | 18331 | `f1cd8df25539c21f4e2f530c1e835e4b0d08359702475380fcfe2cbcca8306a9` |
| `run-proof.ps1` | 5603 | `bd9b22f3ebfc38cfaae2e6f6b47305e24d248adb96692043784626ef065e1a29` |

`prepared-pins.json` is 4017 bytes, SHA `185ac90179e132bb0cf2ba9e6085f0d9babdaa95db8d8e41bb46b16ccad09830`. It freezes 21 helper/dependency/history/preparation inputs plus the separately bound nine 464 sources. Twenty inherited inputs rehashed with zero mismatches. Launcher syntax inspection passed; Node compilation remains unrun.

After root's independent review and serial grant: `pwsh -NoLogo -NoProfile -File artifacts/roads473/run-proof.ps1`. Only 466→473 launcher retargets: retained hidden Node, 45 s work/10 s owned-tree cleanup/two 1 s stream waits, owned empty TEMP removal and disposal receipt. No resources were launched. Ring/AOI success cannot qualify denominator, consumer support, lanes or native acceptance.
