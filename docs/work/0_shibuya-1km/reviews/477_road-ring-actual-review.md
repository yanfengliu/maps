# 477 — Road ring actual-result review

2026-10-01. ACCEPT the stage-one preservation controls, outside-AOI exclusions and retained refusal. HOLD full-source parsing; the run correctly failed that bound.

Reviewed actual bytes, SHA-256:

| Evidence | SHA-256 |
| --- | --- |
| proof-result.json, 1,296,807 bytes | 641bcd03528b9625801395b6cafe4cfb40cbfd74d723d51c9ee1d67b136dfa97 |
| command-result.json | 8be2a5b261ca6b596be20c2c208d9da8e89a5cc041031825b9e4694f88f8f2ff |
| process-receipt.json | 088b51580e6e6d585e165b2b1de3ded85303523eabf65a4edabbaae7b3798e51 |
| closure.json | b3df0e689ad0c2a244e9458283e79152fb9ab57b20b8d438f6c50a6f654eeff1 |
| prepared-pins.json | 185ac90179e132bb0cf2ba9e6085f0d9babdaa95db8d8e41bb46b16ccad09830 |
| accepted source review 475 | e5040d2367c09da12000a30f43354fc87387e7d098700aab265236af5e93907e |

All 15 controls passed. Both original outside polygons retain full-precision coordinates, empty clips and separating-edge evidence. The dropped-interior mutant imported successfully and failed the intended projected-interior ERR_ASSERTION. All 30 input pins match before, after and current bytes. The single dispatch records Node exit 2/tool exit 1, without waiver. Receipts record PID 17744 exited, handle disposed, owned TEMP removed and matching process identity absent; this review performed no live process check.

Sources 85/86/95 parsed all 1006/836/772 parents. Source 96 retained 399 observations and refused poly_58dd2991-1557-42c6-a5af-bc3db1d10da7 under tran_d302605e-55f0-4f73-a74f-529efb8f92ba/tran_0551ab7a-f86c-4959-bdc6-79f7851d9a84, function 1020/LOD2; 235 parents remain unobserved. Its 49-point closed exterior and 37-point closed interior are geographically inside the AOI. All 48 projected exterior points equal the clip. The 3272.898921798602 m² value excludes no hole and proves no solid area. Height zero remains plan evidence.

Next prove this exact pinned polygon’s topology and hole-excluding solid with existing triangulation/clipping: preserve original XYZ, verify net area and empty hole coverage, and make dropping its interior fail. Displayed-layer support needs separate evidence. No filling, skipping or global hole mask is admitted. Denominator, lanes, appearance and pending native approval remain unaccepted. No runtime was run here.
