# Road coverage recovery 464

Owner: roads_coverage464; root owns integration and acceptance. Base: `02d06e982b6e516d0f05cd4b653a128c01a052cc`. Requirement: clear supported markings on every drivable road throughout the square. This is source investigation, not implementation or denominator acceptance.

The existing instruments are `artifacts/city-surfaces412/probe3.mjs` and `pruning-run.mjs`. I inspected their retained outputs and actual inputs without rerunning their meshing/imports. A standalone built-in Node file parser completed in 818 ms, launched no children, and rechecked all nine census3 input hashes before and after. No browser, server, GPU, source writer or image review was needed for these decisions.

Exact observations, source and instrument pins are retained in ignored `artifacts/roads464/source-evidence.json`, SHA-256 `f1df683615a9876aa8a0567f85c037c403e283e6252691dd5bd9e7d792db474f`. Archive dictionary member pins are `dictionary-pins.json`, SHA-256 `3d6cd5ef43f48f7bc66cefcca6ec99292a14765c89454f4d6829c6ddad5b3338`. The parser source is `inspect-source.mjs`, SHA-256 `1fa33505a6a4095f88e468f807cabc27983f8a51ef7181f28f12a57252a7ec43`.

## Findings

Across the four authoritative files, all 3,248 Roads and 4,172 semantic areas have published IDs; 3,248 polygons lack IDs. The typed helper incorrectly requires a polygon ID, although its returned polygon type discards that ID. Its first refusal, `tran_7f40f11c-eeb0-4b05-9adc-71fa0da88842`, is a named prefectural road outside the AOI, west of 139.689°. Failure precedes geometric exclusion. This is absent redundant polygon identity, not absent road identity.

The retained 758-object inventory contains 488 carriageways, 248 intersections and 22 unknowns. Its 32 untreated objects comprise seven carriageways, three intersections and all 22 unknowns. Literal source evidence confirms:

- Five carriageways (`1d811852`, `808fb564`, `3250b899`, `2e5f6637`, `c17b519b`; full IDs in evidence) are named 首都高速3号渋谷線, Road function 5, with TrafficArea function 1000. The dictionary identifies urban expressway. They are drivable omissions. Four have elevated LOD3 plus separate flat LOD2 areas; `c17b519b` has only flat LOD2.
- The other carriageways are `229167ff`, whose 21 retained intervals all fail slope checks, and `17ccc578`, whose recorded AOI intersection is only 0.06086024845717475 m² at the north boundary. Neither fact authorizes exclusion.
- `d9646650`, `12cb0423` and `de921008` have function-1020 intersection areas. Their zero-candidate status is an omission, not a non-drivable exception.
- All 22 unknowns have only Road function 9020, LOD1, zero source height and no semantic areas. The dictionary says “unknown.” Their eligibility remains unresolved; retain every ID.

Painted candidates total 29,078 mesh intervals plus 98,350 semantic intervals, summing 113,453 m. Float32-normalized start/end XYZ keys repeat 10,648 times; these are repeated candidate keys, not proof of duplicate final footprints. `sourceInside` ignores height, while per-area selection mixes LOD2 and LOD3. This can erase separate layers and duplicate representations; individual zero-candidate loss mechanisms remain unproved.

## Smallest next contract

Preserve required road/area IDs; accept unnamed polygons with disclosed file-digest/road/area/LOD/ordinal identity. Reject actual missing source identity, malformed rings and unhandled holes. Establish the complete clipped inventory before paint; retain painted, refused and unresolved outcomes without threshold waivers.

Construct each physical supported boundary once, with source-layer and published-LOD reconciliation; split T-junctions, remove interior seams, and coalesce contiguous supported spans. Do not concatenate mesh and semantic edge soups. Preserve published paint. Apply whole-footprint support/pavement checks to every emitted triangle and disclose remaining refusals. Keep the admitted 3 MB mesh/256 KB inventory limits.

No inspected TrafficArea supplies lane-function 1010. Edge strips must retain edge intent; they cannot close the lane requirement. Authored lane intent needs its own admitted contract and native readability evidence. All ten drivable omissions, unknown eligibility, nine-stratum/held-out inspection and final gates remain open.
